import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
import altair as alt
import logging
import os

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# 내부 메뉴 표시 여부 스위치 (운영: 숨김, 개발/디버그: 표시)
def is_internal_enabled():
    """환경변수 SHOW_INTERNAL=1 또는 URL 쿼리 ?debug=1 일 때 True"""
    env_on = os.getenv("SHOW_INTERNAL", "0").strip() == "1"
    try:
        qp = dict(st.query_params)
        debug_on = str(qp.get("debug", "0")) in ["1", "true", "True"]
    except Exception:
        debug_on = False
    return env_on or debug_on


SHOW_INTERNAL = is_internal_enabled()

from utils import (get_gemini_analysis, get_default_data, read_uploaded_file,
                   process_multiple_files, extract_file_summaries,
                   summaries_to_compact_text, get_partitioned_analysis,
                   load_guideline_rules, count_chars_no_space,
                   bucket_programs_by_month, apply_guidelines_to_analysis)
from doc_utils import (generate_part1_report, generate_part2_report,
                       generate_monthly_report,
                       generate_monthly_program_report,
                       generate_part4_full_report, generate_full_report)

matplotlib.rcParams['font.family'] = 'DejaVu Sans'
matplotlib.rcParams['axes.unicode_minus'] = False

try:
    plt.rc('font', family='NanumGothic')
except:
    pass

st.set_page_config(page_title="AI 연간 사업계획 통합 에이전트",
                   page_icon="📊",
                   layout="wide")

# 운영 모드에서 Streamlit 기본 UI 숨김 (우측 상단 메뉴, 헤더, 푸터)
if not SHOW_INTERNAL:
    HIDE_STREAMLIT_UI = """
    <style>
    #MainMenu {visibility: hidden;}
    header {visibility: hidden;}
    footer {visibility: hidden;}
    [data-testid="stToolbar"] {visibility: hidden;}
    [data-testid="stDecoration"] {visibility: hidden;}
    </style>
    """
    st.markdown(HIDE_STREAMLIT_UI, unsafe_allow_html=True)

st.title("AI 연간 사업계획 통합 에이전트")
st.markdown("---")

if 'analysis_data' not in st.session_state:
    st.session_state.analysis_data = None

if 'guideline_rules' not in st.session_state:
    st.session_state.guideline_rules = load_guideline_rules()

if 'month_bucket' not in st.session_state:
    st.session_state.month_bucket = None

MAX_FILES = 30
MAX_TOTAL_SIZE_MB = 3

with st.sidebar:
    st.header("사업계획 수립 도우미")
    uploaded_files = st.file_uploader(
        "평가서 및 실적 보고서 업로드 (연도 무관)",
        type=['pdf', 'docx', 'txt', 'csv'],
        accept_multiple_files=True,
        help=
        f"최대 {MAX_FILES}개 파일, 총 {MAX_TOTAL_SIZE_MB}MB • PDF, DOCX, TXT, CSV 지원"
    )

    if uploaded_files:
        total_size_bytes = sum(uf.size for uf in uploaded_files)
        total_size_mb = total_size_bytes / (1024 * 1024)

        st.info(f"📁 {len(uploaded_files)}개 파일 선택됨 ({total_size_mb:.2f}MB)")

        upload_valid = True
        if len(uploaded_files) > MAX_FILES:
            st.error(f"파일 개수가 {MAX_FILES}개를 초과했습니다. ({len(uploaded_files)}개)")
            upload_valid = False
        if total_size_mb > MAX_TOTAL_SIZE_MB:
            st.error(
                f"총 파일 크기가 {MAX_TOTAL_SIZE_MB}MB를 초과했습니다. ({total_size_mb:.2f}MB)"
            )
            upload_valid = False

        for uf in uploaded_files:
            file_size_kb = uf.size / 1024
            st.caption(f"• {uf.name} ({file_size_kb:.1f}KB)")

        file_summaries = extract_file_summaries(uploaded_files)
        compact_text = summaries_to_compact_text(file_summaries)

        if not file_summaries:
            st.error(
                "파일에서 텍스트를 추출할 수 없습니다. PDF, DOCX, TXT, CSV 형식의 파일을 업로드해주세요.")
            upload_valid = False

        if SHOW_INTERNAL:
            with st.expander("디버그 정보"):
                for i, uf in enumerate(uploaded_files):
                    st.caption(f"[{i+1}] {uf.name}: {uf.size/1024:.1f}KB")
                st.caption(f"요약 텍스트 길이: {len(compact_text)}자")
                st.text_area("파일 요약 (Gemini 입력)",
                             compact_text[:2000],
                             height=150)

            with st.expander("업로드된 내용 미리보기"):
                combined_content = process_multiple_files(uploaded_files)
                st.text_area(
                    "통합된 문서 내용",
                    combined_content[:1000] + "..."
                    if len(combined_content) > 1000 else combined_content,
                    height=150)

        month_bucket = bucket_programs_by_month(file_summaries)

        if SHOW_INTERNAL:
            with st.expander("월별 프로그램 배치 미리보기"):
                st.caption("업로드 파일에서 추출한 프로그램의 월별 배치:")
                for m in range(1, 13):
                    progs = month_bucket.get(m, [])
                    if progs:
                        prog_names = ", ".join([
                            p.get('program_name', '?')[:20] for p in progs[:5]
                        ])
                        st.caption(f"**{m}월**: {prog_names}")
                    else:
                        st.caption(f"**{m}월**: (정기운영 자동 생성)")

        if st.button("AI 분석 시작", type="primary", disabled=not upload_valid):
            progress_placeholder = st.empty()

            def update_progress(msg):
                progress_placeholder.info(msg)

            st.session_state.month_bucket = month_bucket

            with st.spinner(
                    f"참참 AI가 {len(uploaded_files)}개 문서를 파트별로 분석 중입니다..."):
                result = get_partitioned_analysis(
                    compact_text,
                    progress_callback=update_progress,
                    month_bucket=month_bucket,
                    guideline_rules=st.session_state.guideline_rules)

                if result:
                    failed_parts = result.pop("_failed_parts", [])
                    guideline_logs = result.pop("_guideline_logs", [])
                    st.session_state.analysis_data = result
                    st.session_state.guideline_logs = guideline_logs

                    if failed_parts:
                        st.warning(
                            f"일부 파트 생성 실패: {', '.join(failed_parts)}. 해당 파트는 샘플 데이터를 사용하세요."
                        )
                    else:
                        st.success("분석이 완료되었습니다!")
                    st.rerun()

    st.markdown("---")

    if st.button("샘플 데이터 로드"):
        raw_data = get_default_data()
        rules = load_guideline_rules()
        # 샘플 데이터에도 작성지침 적용 (기대효과 100~300자 등)
        adjusted_data, adjustment_logs = apply_guidelines_to_analysis(
            raw_data, rules)
        st.session_state.analysis_data = adjusted_data
        st.session_state.guideline_rules = rules
        # 보정 로그 출력
        for log in adjustment_logs:
            print(log)
        st.success("샘플 데이터와 작성지침이 로드되었습니다!")
        st.rerun()

    if SHOW_INTERNAL:
        with st.expander("작성지침 규칙 (JSON)"):
            if st.session_state.guideline_rules:
                st.json(st.session_state.guideline_rules)
            else:
                st.info("작성지침이 로드되지 않았습니다.")

if 'guideline_logs' not in st.session_state:
    st.session_state.guideline_logs = []

if st.session_state.analysis_data is None:
    st.info("👈 왼쪽 사이드바에서 문서를 업로드하거나 '샘플 데이터 로드' 버튼을 클릭하여 시작하세요.")
else:
    data = st.session_state.analysis_data

    if 'part1_general' not in data:
        data['part1_general'] = {}
    if 'part2_programs' not in data:
        data['part2_programs'] = {}
    if 'part3_monthly_plan' not in data:
        data['part3_monthly_plan'] = {}
    if 'part4_monthly_plan' not in data:
        data['part4_monthly_plan'] = {}
    if 'part4_budget_evaluation' not in data:
        data['part4_budget_evaluation'] = {
            "budget_table": [],
            "feedback_summary": []
        }

    if SHOW_INTERNAL:
        with st.expander("규칙 검증 결과 (디버그)", expanded=False):
            st.subheader("규칙 로드 상태")
            rules = st.session_state.guideline_rules or {}
            load_status = rules.get('_load_status', 'unknown')
            load_error = rules.get('_load_error', None)

            if load_status == 'success':
                st.success(f"규칙 로드 성공")
                p1_keys = list(rules.get('part1', {}).keys())
                st.caption(f"Part1 규칙 키: {', '.join(p1_keys)}")
                sample_rule = rules.get('part1',
                                        {}).get('need_1_user_desire', {})
                st.caption(
                    f"need_1_user_desire 규칙: min={sample_rule.get('min_chars_no_space')}, max={sample_rule.get('max_chars_no_space')}, bullet={sample_rule.get('bullet_count')}"
                )
            else:
                st.error(f"규칙 로드 실패: {load_status}")
                if load_error:
                    st.error(load_error)

            st.markdown("---")
            st.subheader("작성지침 적용 로그")

            if st.session_state.guideline_logs:
                for log in st.session_state.guideline_logs:
                    st.caption(log)
            else:
                st.caption("(작성지침 적용 로그 없음)")

            st.markdown("---")
            st.subheader("현재 데이터 검증")

            rules = st.session_state.guideline_rules or {}
            p1_rules = rules.get('part1', {})
            part1 = data.get('part1_general', {})

            st.markdown("**Part 1 텍스트 필드:**")
            text_fields = [('need_1_user_desire', '이용아동 욕구'),
                           ('need_2_1_regional', '지역적 특성'),
                           ('need_2_2_environment', '주변환경'),
                           ('need_2_3_educational', '교육적 특성'),
                           ('purpose_text', '사업목적'), ('goals_text', '사업목표')]

            for field_key, field_label in text_fields:
                text = part1.get(field_key, '')
                rule = p1_rules.get(field_key, {})
                max_c = rule.get('max_chars_no_space', 0)
                min_c = rule.get('min_chars_no_space', 0)
                bullet = rule.get('bullet_count', 0)
                fmt = rule.get('format', 'paragraph')

                actual_chars = count_chars_no_space(text)
                actual_bullets = len(
                    [l for l in text.split('\n')
                     if l.strip().startswith('•')]) if text else 0

                status = "✅"
                if max_c > 0 and actual_chars > max_c:
                    status = "❌ (초과)"
                elif min_c > 0 and actual_chars < min_c:
                    status = "⚠️ (미달)"

                bullet_status = ""
                if bullet > 0:
                    if actual_bullets == bullet:
                        bullet_status = f"✅ 불릿:{actual_bullets}/{bullet}"
                    else:
                        bullet_status = f"❌ 불릿:{actual_bullets}/{bullet}"

                st.caption(
                    f"• {field_label}: {actual_chars}자 (범위:{min_c}~{max_c}) {status} {bullet_status}"
                )

            st.markdown("**Part 1 테이블:**")
            for table_name in ['feedback_table', 'total_review_table']:
                table = part1.get(table_name, [])
                rule = p1_rules.get(table_name, {})
                max_rows = rule.get('max_rows', 100)
                actual_rows = len(table) if isinstance(table, list) else 0
                status = "✅" if actual_rows <= max_rows else "❌"
                st.caption(
                    f"• {table_name}: {actual_rows}행 (max:{max_rows}) {status}"
                )

            st.markdown("**Part 2 세부사업 테이블:**")
            part2 = data.get('part2_programs', {})
            p2_rules = rules.get('part2', {})
            detail_rule = p2_rules.get('detail_table', {})
            eval_rule = p2_rules.get('eval_table', {})
            detail_max = detail_rule.get('max_rows_per_category', 5)
            eval_max = eval_rule.get('max_rows_per_category', 5)

            for cat_name, cat_data in part2.items():
                if isinstance(cat_data, dict):
                    dt_cnt = len(cat_data.get('detail_table', []))
                    et_cnt = len(cat_data.get('eval_table', []))
                    dt_status = "✅" if dt_cnt <= detail_max else "❌"
                    et_status = "✅" if et_cnt <= eval_max else "❌"
                    st.caption(
                        f"• {cat_name}: detail={dt_cnt}{dt_status} eval={et_cnt}{et_status}"
                    )

            st.markdown("**Part 3/4 월별 프로그램:**")
            for part_key, part_label in [('part3_monthly_plan', 'Part3'),
                                         ('part4_monthly_plan', 'Part4')]:
                monthly = data.get(part_key, {})
                p_rules = rules.get(part_key.replace('_monthly_plan', ''), {})
                mp_rule = p_rules.get('monthly_program', {})
                max_per_month = mp_rule.get('max_programs_per_month', 8)

                month_summary = []
                for m, progs in monthly.items():
                    cnt = len(progs) if isinstance(progs, list) else 0
                    status = "✅" if cnt <= max_per_month else "❌"
                    month_summary.append(f"{m}:{cnt}{status}")

                if month_summary:
                    st.caption(
                        f"• {part_label}: {', '.join(month_summary[:6])}... (max:{max_per_month})"
                    )

            st.markdown("**Part 4 예산/환류 테이블:**")
            budget_eval = data.get('part4_budget_evaluation', {})
            p4_rules = rules.get('part4', {})
            budget_rule = p4_rules.get('budget_table', {})
            feedback_rule = p4_rules.get('feedback_summary', {})
            budget_max = budget_rule.get('max_rows', 10)
            feedback_max = feedback_rule.get('max_rows', 5)

            bt_cnt = len(budget_eval.get('budget_table', []))
            fs_cnt = len(budget_eval.get('feedback_summary', []))
            bt_status = "✅" if bt_cnt <= budget_max else "❌"
            fs_status = "✅" if fs_cnt <= feedback_max else "❌"
            st.caption(
                f"• budget_table: {bt_cnt}행 (max:{budget_max}) {bt_status}")
            st.caption(
                f"• feedback_summary: {fs_cnt}행 (max:{feedback_max}) {fs_status}"
            )

    tab1, tab2, tab3, tab4 = st.tabs([
        "PART 1: 총괄/기획", "PART 2: 세부사업", "PART 3: 상반기(1~6월)",
        "PART 4: 하반기(7~12월)"
    ])

    with tab1:
        st.header("PART 1: 총괄 및 기획")
        view_mode_p1 = st.toggle("📄 문서 형태로 미리보기", key="view_mode_p1")

        part1 = data.get('part1_general', {})

        p1_rules = st.session_state.guideline_rules.get(
            'part1', {}) if st.session_state.guideline_rules else {}

        def show_char_count(text, field_name, rules_dict):
            rule = rules_dict.get(field_name, {})
            max_chars = rule.get('max_chars_no_space', 0)
            current = count_chars_no_space(text)
            if max_chars > 0:
                color = "red" if current > max_chars else "green"
                st.caption(f":{color}[공백 제외 글자수: {current} / {max_chars}자]")
            else:
                st.caption(f"공백 제외 글자수: {current}자")

        with st.expander("1. 사업의 필요성", expanded=True):
            st.subheader("1) 이용아동의 욕구 및 문제점")
            need_1 = st.text_area("1) 이용아동의 욕구 및 문제점 (상세 서술)",
                                  value=part1.get('need_1_user_desire', ''),
                                  height=300,
                                  key="p1_need_1")
            show_char_count(need_1, 'need_1_user_desire', p1_rules)
            data['part1_general']['need_1_user_desire'] = need_1

            st.subheader("2) 지역 환경적 특성")

            need_2_1 = st.text_area("(1) 지역적 특성 (상세 서술)",
                                    value=part1.get('need_2_1_regional', ''),
                                    height=200,
                                    key="p1_need_2_1")
            show_char_count(need_2_1, 'need_2_1_regional', p1_rules)
            data['part1_general']['need_2_1_regional'] = need_2_1

            need_2_2 = st.text_area("(2) 주변환경 (상세 서술)",
                                    value=part1.get('need_2_2_environment',
                                                    ''),
                                    height=200,
                                    key="p1_need_2_2")
            show_char_count(need_2_2, 'need_2_2_environment', p1_rules)
            data['part1_general']['need_2_2_environment'] = need_2_2

            need_2_3 = st.text_area("(3) 교육적 특성 (상세 서술)",
                                    value=part1.get('need_2_3_educational',
                                                    ''),
                                    height=200,
                                    key="p1_need_2_3")
            show_char_count(need_2_3, 'need_2_3_educational', p1_rules)
            data['part1_general']['need_2_3_educational'] = need_2_3

        with st.expander("2. 전년도 사업평가 및 환류계획", expanded=True):
            st.subheader("1) 차년도 사업 환류 계획")
            feedback_data = part1.get('feedback_table', [])
            feedback_df = pd.DataFrame(
                feedback_data) if feedback_data else pd.DataFrame(
                    columns=['area', 'problem', 'improvement'])

            if not feedback_df.empty and 'area' in feedback_df.columns:
                feedback_df = feedback_df.rename(columns={
                    'area': '영역',
                    'problem': '문제점',
                    'improvement': '개선방안'
                })
            else:
                feedback_df = pd.DataFrame(columns=['영역', '문제점', '개선방안'])

            target_order = ["보호", "교육", "문화", "정서지원", "지역사회연계"]
            if not feedback_df.empty and '영역' in feedback_df.columns:
                feedback_df['영역'] = pd.Categorical(feedback_df['영역'],
                                                   categories=target_order,
                                                   ordered=True)
                feedback_df = feedback_df.sort_values('영역').reset_index(
                    drop=True)

            if view_mode_p1:
                for idx, row in feedback_df.iterrows():
                    st.markdown(f"### {row.get('영역', '')}")
                    st.markdown(f"**문제점:**\n{row.get('문제점', '')}")
                    st.markdown(f"**개선방안:**\n{row.get('개선방안', '')}")
                    st.markdown("---")
            else:
                st.caption("💡 팁: 칸이 좁아 보이면 더블클릭하여 전체 내용을 확인/수정하세요.")
                edited_feedback = st.data_editor(
                    feedback_df,
                    num_rows="dynamic",
                    use_container_width=True,
                    hide_index=True,
                    column_config={
                        "영역": st.column_config.TextColumn("영역", width=100),
                        "문제점": st.column_config.TextColumn("문제점",
                                                           width="large"),
                        "개선방안": st.column_config.TextColumn("개선방안",
                                                            width="large"),
                    },
                    key="p1_feedback_tbl")

                data['part1_general'][
                    'feedback_table'] = edited_feedback.rename(
                        columns={
                            '영역': 'area',
                            '문제점': 'problem',
                            '개선방안': 'improvement'
                        }).to_dict('records')

            st.subheader("2) 총평")
            total_review_data = part1.get('total_review_table', [])
            total_review_df = pd.DataFrame(
                total_review_data) if total_review_data else pd.DataFrame(
                    columns=['category', 'content'])

            if not total_review_df.empty and 'category' in total_review_df.columns:
                total_review_df = total_review_df.rename(columns={
                    'category': '영역',
                    'content': '내용'
                })
            else:
                total_review_df = pd.DataFrame(columns=['영역', '내용'])

            target_review_order = ["운영평가", "아동평가", "프로그램평가", "후원활동측면", "환류방안"]
            if not total_review_df.empty and '영역' in total_review_df.columns:
                total_review_df['영역'] = pd.Categorical(
                    total_review_df['영역'],
                    categories=target_review_order,
                    ordered=True)
                total_review_df = total_review_df.sort_values(
                    '영역').reset_index(drop=True)

            if view_mode_p1:
                for idx, row in total_review_df.iterrows():
                    st.markdown(f"### {row.get('영역', '')}")
                    st.markdown(row.get('내용', ''))
                    st.markdown("---")
            else:
                st.caption("💡 총평 내용은 더블클릭하면 팝업창에서 편하게 긴 글을 수정할 수 있습니다.")
                edited_review = st.data_editor(
                    total_review_df,
                    num_rows="fixed",
                    use_container_width=True,
                    hide_index=True,
                    column_config={
                        "영역":
                        st.column_config.TextColumn("영역",
                                                    width=150,
                                                    disabled=True),
                        "내용":
                        st.column_config.TextColumn("내용", width=700),
                    },
                    key="p1_review_tbl")

                data['part1_general'][
                    'total_review_table'] = edited_review.rename(
                        columns={
                            '영역': 'category',
                            '내용': 'content'
                        }).to_dict('records')

        with st.expander("3. 만족도조사", expanded=True):
            satisfaction_survey = part1.get('satisfaction_survey', {})

            if satisfaction_survey and satisfaction_survey.get('survey_data'):
                st.subheader("응답자 설정")
                col_resp, col_btn = st.columns([2, 1])
                with col_resp:
                    total_respondents = st.number_input(
                        "총 응답 인원 (명)",
                        min_value=1,
                        value=satisfaction_survey.get('total_respondents', 30),
                        key="p1_total_resp")
                    data['part1_general']['satisfaction_survey'][
                        'total_respondents'] = total_respondents

                survey_data = satisfaction_survey.get('survey_data', [])
                survey_df = pd.DataFrame(survey_data)

                st.subheader("문항별 응답 분포")
                st.caption("각 문항의 척도별 응답 인원수 (수정 가능)")

                edited_survey = st.data_editor(
                    survey_df,
                    num_rows="fixed",
                    use_container_width=True,
                    hide_index=True,
                    column_config={
                        "문항":
                        st.column_config.TextColumn("문항", width="large"),
                        "5점":
                        st.column_config.NumberColumn("5점(명)",
                                                      min_value=0,
                                                      step=1),
                        "4점":
                        st.column_config.NumberColumn("4점(명)",
                                                      min_value=0,
                                                      step=1),
                        "3점":
                        st.column_config.NumberColumn("3점(명)",
                                                      min_value=0,
                                                      step=1),
                        "2점":
                        st.column_config.NumberColumn("2점(명)",
                                                      min_value=0,
                                                      step=1),
                        "1점":
                        st.column_config.NumberColumn("1점(명)",
                                                      min_value=0,
                                                      step=1),
                    },
                    key="p1_survey_tbl")

                data['part1_general']['satisfaction_survey'][
                    'survey_data'] = edited_survey.to_dict('records')

                def calculate_weighted_avg(row):
                    total = row['5점'] + row['4점'] + row['3점'] + row[
                        '2점'] + row['1점']
                    if total == 0:
                        return 0
                    return (5 * row['5점'] + 4 * row['4점'] + 3 * row['3점'] +
                            2 * row['2점'] + 1 * row['1점']) / total

                edited_survey['평균점수'] = edited_survey.apply(
                    calculate_weighted_avg, axis=1)
                overall_avg = edited_survey['평균점수'].mean()

                st.metric("전체 평균 만족도", f"{overall_avg:.2f}점 (5점 만점)")

                st.markdown("---")
                st.subheader("만족도 분포 차트")

                chart_data = []
                for _, row in edited_survey.iterrows():
                    question = row['문항'][:20] + '...' if len(
                        row['문항']) > 20 else row['문항']
                    for scale in ['5점', '4점', '3점', '2점', '1점']:
                        chart_data.append({
                            '문항': question,
                            '척도': scale,
                            '인원수': row[scale]
                        })

                chart_df = pd.DataFrame(chart_data)

                color_map = [
                    '#4184F3', '#7CB342', '#FF8F00', '#FF5722', '#AC4ABC'
                ]
                scale_order = ['5점', '4점', '3점', '2점', '1점']

                col_chart1, col_chart2 = st.columns([1, 1])

                with col_chart1:
                    st.caption("항목별 평균 점수")
                    avg_data = edited_survey[['문항', '평균점수']].copy()
                    avg_data['문항_short'] = avg_data['문항'].apply(
                        lambda x: x[:20] + '...' if len(x) > 20 else x)

                    avg_bar = alt.Chart(avg_data).mark_bar(
                        color='#4184F3').encode(
                            y=alt.Y('문항_short:N', sort=None, title='문항'),
                            x=alt.X('평균점수:Q',
                                    scale=alt.Scale(domain=[0, 5]),
                                    title='점수'),
                            tooltip=[
                                '문항:N',
                                alt.Tooltip('평균점수:Q', format='.2f')
                            ]).properties(height=400)

                    avg_text = avg_bar.mark_text(
                        align='left', baseline='middle', dx=3,
                        color='black').encode(
                            text=alt.Text('평균점수:Q', format='.2f'))

                    st.altair_chart(avg_bar + avg_text,
                                    use_container_width=True)

                with col_chart2:
                    st.caption("응답 분포 (인원수)")
                    stacked_chart = alt.Chart(chart_df).mark_bar().encode(
                        y=alt.Y('문항:N', sort=None, title='문항'),
                        x=alt.X('인원수:Q', title='인원(명)', stack='zero'),
                        color=alt.Color('척도:N',
                                        scale=alt.Scale(domain=scale_order,
                                                        range=color_map),
                                        legend=alt.Legend(title='척도',
                                                          orient='right')),
                        order=alt.Order('척도:N', sort='descending'),
                        tooltip=['문항:N', '척도:N',
                                 '인원수:Q']).properties(height=400)
                    st.altair_chart(stacked_chart, use_container_width=True)

                st.markdown("---")

                st.subheader("주관식 문항 분석")
                subjective_q = st.text_input("주관식 문항",
                                             value=satisfaction_survey.get(
                                                 'subjective_question',
                                                 '기타 건의사항 및 개선 의견'),
                                             key="p1_subj_q")
                data['part1_general']['satisfaction_survey'][
                    'subjective_question'] = subjective_q

                subjective_analysis = st.text_area(
                    "주관식 문항 요약 및 분석 (500자 이상)",
                    value=satisfaction_survey.get('subjective_analysis', ''),
                    height=300,
                    key="p1_subj_analysis")
                data['part1_general']['satisfaction_survey'][
                    'subjective_analysis'] = subjective_analysis

                st.markdown("---")

                st.subheader("종합 분석 및 제언")
                overall_suggestion = st.text_area(
                    "종합 분석 및 제언 (500자 이상)",
                    value=satisfaction_survey.get('overall_suggestion', ''),
                    height=300,
                    key="p1_overall_suggestion")
                data['part1_general']['satisfaction_survey'][
                    'overall_suggestion'] = overall_suggestion
            else:
                st.info("만족도 조사 데이터가 없습니다.")
                if 'satisfaction_survey' not in data['part1_general']:
                    data['part1_general']['satisfaction_survey'] = {
                        'total_respondents': 30,
                        'survey_data': [],
                        'subjective_question': '',
                        'subjective_analysis': '',
                        'overall_suggestion': ''
                    }

        with st.expander("4. 사업목적", expanded=True):
            purpose = st.text_area("사업목적을 작성하세요",
                                   value=part1.get('purpose_text', ''),
                                   height=150,
                                   key="p1_purpose_txt")
            show_char_count(purpose, 'purpose_text', p1_rules)
            data['part1_general']['purpose_text'] = purpose

        with st.expander("5. 사업목표", expanded=True):
            goals = st.text_area("사업목표를 작성하세요",
                                 value=part1.get('goals_text', ''),
                                 height=150,
                                 key="p1_goals_txt")
            show_char_count(goals, 'goals_text', p1_rules)
            data['part1_general']['goals_text'] = goals

        st.markdown("---")

        part1_data = data.get('part1_general', {})
        part1_has_data = any([
            part1_data.get('need_1_user_desire'),
            part1_data.get('purpose_text'),
            part1_data.get('goals_text'),
            part1_data.get('feedback_table')
        ])
        if part1_has_data:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M")
            part1_report = generate_part1_report(data['part1_general'])
            st.download_button(
                label="📥 PART 1 다운로드 (Word)",
                data=part1_report,
                file_name=f"part1_{timestamp}.docx",
                mime=
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
        else:
            st.warning("먼저 참참AI 분석 시작을 눌러 내용을 생성해 주세요.")

    with tab2:
        st.header("PART 2: 세부 사업 계획")

        preview_mode_p2 = st.toggle("📄 문서 형태로 미리보기", key="preview_mode_p2")

        categories = ["보호", "교육", "문화", "정서지원", "지역사회연계"]

        selected_category = st.radio("영역 선택",
                                     categories,
                                     horizontal=True,
                                     key="p2_category_select")

        part2 = data.get('part2_programs', {})

        if selected_category not in part2:
            part2[selected_category] = {"detail_table": [], "eval_table": []}
            data['part2_programs'] = part2

        category_data = part2.get(selected_category, {
            "detail_table": [],
            "eval_table": []
        })

        st.subheader(f"📋 {selected_category} - 세부사업내용")

        detail_data = category_data.get('detail_table', [])
        detail_df = pd.DataFrame(detail_data) if detail_data else pd.DataFrame(
            columns=[
                'sub_area', 'program_name', 'expected_effect', 'target',
                'count', 'cycle', 'content'
            ])

        if not detail_df.empty and 'sub_area' in detail_df.columns:
            detail_df = detail_df.rename(
                columns={
                    'sub_area': '세부영역',
                    'program_name': '프로그램명',
                    'expected_effect': '기대효과',
                    'target': '대상',
                    'count': '인원',
                    'cycle': '주기',
                    'content': '계획내용'
                })
        else:
            detail_df = pd.DataFrame(
                columns=['세부영역', '프로그램명', '기대효과', '대상', '인원', '주기', '계획내용'])

        if preview_mode_p2:
            for idx, row in detail_df.iterrows():
                st.markdown(
                    f"#### 📄 {row.get('세부영역', '')} > {row.get('프로그램명', '')}")
                exp_effect = row.get('기대효과', '') or '기대효과 내용이 없습니다.'
                plan_content = row.get('계획내용', '') or '계획내용이 없습니다.'
                st.markdown(f"**🎯 기대효과:** {exp_effect}")
                st.markdown(f"**📝 계획내용:** {plan_content}")
                st.markdown(
                    f"**대상**: {row.get('대상', '')} | **인원**: {row.get('인원', '')} | **주기**: {row.get('주기', '')}"
                )
                st.markdown("---")
        else:
            st.caption("💡 팁: 칸이 좁아 보이면 더블클릭하여 전체 내용을 확인/수정하세요.")
            edited_detail = st.data_editor(
                detail_df,
                num_rows="dynamic",
                use_container_width=True,
                hide_index=True,
                column_config={
                    "세부영역": st.column_config.TextColumn("세부영역", width="small"),
                    "프로그램명": st.column_config.TextColumn("프로그램명",
                                                         width="medium"),
                    "기대효과": st.column_config.TextColumn("기대효과", width="large"),
                    "대상": st.column_config.TextColumn("대상", width="small"),
                    "인원": st.column_config.TextColumn("인원", width="small"),
                    "주기": st.column_config.TextColumn("주기", width="small"),
                    "계획내용": st.column_config.TextColumn("계획내용", width="large"),
                },
                key=f"p2_detail_{selected_category}")

            data['part2_programs'][selected_category][
                'detail_table'] = edited_detail.rename(
                    columns={
                        '세부영역': 'sub_area',
                        '프로그램명': 'program_name',
                        '기대효과': 'expected_effect',
                        '대상': 'target',
                        '인원': 'count',
                        '주기': 'cycle',
                        '계획내용': 'content'
                    }).to_dict('records')

        st.subheader(f"📊 {selected_category} - 평가계획")

        eval_data = category_data.get('eval_table', [])

        # 기존 스키마 호환성: eval_tool/eval_timing → main_plan/eval_method 매핑
        if eval_data:
            for item in eval_data:
                if 'eval_tool' in item and 'main_plan' not in item:
                    item['main_plan'] = item.pop('eval_tool', '')
                if 'eval_timing' in item and 'eval_method' not in item:
                    item['eval_method'] = item.pop('eval_timing', '')
                if 'sub_area' not in item:
                    item['sub_area'] = ''
                if 'expected_effect' not in item:
                    # detail_table에서 program_name으로 기대효과 연동
                    prog_name = item.get('program_name', '')
                    for detail in detail_data:
                        if detail.get('program_name') == prog_name:
                            item['expected_effect'] = detail.get(
                                'expected_effect', '')
                            item['sub_area'] = detail.get('sub_area', '')
                            break
                    if 'expected_effect' not in item:
                        item['expected_effect'] = ''

        eval_df = pd.DataFrame(eval_data) if eval_data else pd.DataFrame(
            columns=[
                'sub_area', 'program_name', 'expected_effect', 'main_plan',
                'eval_method'
            ])

        if not eval_df.empty and 'program_name' in eval_df.columns:
            eval_df = eval_df.rename(
                columns={
                    'sub_area': '세부영역',
                    'program_name': '프로그램명',
                    'expected_effect': '기대효과',
                    'main_plan': '평가계획',
                    'eval_method': '평가방법'
                })
        else:
            eval_df = pd.DataFrame(
                columns=['세부영역', '프로그램명', '기대효과', '평가계획', '평가방법'])

        if preview_mode_p2:
            for idx, row in eval_df.iterrows():
                st.markdown(
                    f"#### 📊 {row.get('세부영역', '')} > {row.get('프로그램명', '')}")
                exp_effect = row.get('기대효과', '') or '기대효과 내용이 없습니다.'
                st.markdown(f"**🎯 기대효과:** {exp_effect}")
                st.markdown(f"**📋 평가계획:** {row.get('평가계획', '')}")
                st.markdown(f"**📏 평가방법:** {row.get('평가방법', '')}")
                st.markdown("---")
        else:
            edited_eval = st.data_editor(
                eval_df,
                num_rows="dynamic",
                use_container_width=True,
                hide_index=True,
                column_config={
                    "세부영역": st.column_config.TextColumn("세부영역", width="small"),
                    "프로그램명": st.column_config.TextColumn("프로그램명",
                                                         width="medium"),
                    "기대효과": st.column_config.TextColumn("기대효과", width="large"),
                    "평가계획": st.column_config.TextColumn("평가계획",
                                                        width="medium"),
                    "평가방법": st.column_config.TextColumn("평가방법",
                                                        width="medium"),
                },
                key=f"p2_eval_{selected_category}")

            data['part2_programs'][selected_category][
                'eval_table'] = edited_eval.rename(
                    columns={
                        '세부영역': 'sub_area',
                        '프로그램명': 'program_name',
                        '기대효과': 'expected_effect',
                        '평가계획': 'main_plan',
                        '평가방법': 'eval_method'
                    }).to_dict('records')

        st.markdown("---")

        part2_has_data = any(
            cat_data.get('detail_table') or cat_data.get('eval_table')
            for cat_data in data.get('part2_programs', {}).values()
            if isinstance(cat_data, dict))
        if part2_has_data:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M")
            part2_report = generate_part2_report(data['part2_programs'])
            st.download_button(
                label="📥 PART 2 다운로드 (Word)",
                data=part2_report,
                file_name=f"part2_{timestamp}.docx",
                mime=
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
        else:
            st.warning("먼저 참참 AI 분석 시작을 눌러 내용을 생성해 주세요.")

    with tab3:
        st.title("PART 3: 상반기 월별 사업계획 (1월~6월)")

        is_preview_p3 = st.toggle("📄 문서 형태로 미리보기", key="toggle_p3")

        monthly_plan = data.get('part3_monthly_plan', {})
        h1_months = ["1월", "2월", "3월", "4월", "5월", "6월"]

        for month in h1_months:
            st.markdown(f"## {month} 사업계획서")

            month_programs = monthly_plan.get(month, [])
            month_df = pd.DataFrame(
                month_programs) if month_programs else pd.DataFrame(columns=[
                    'big_category', 'mid_category', 'program_name', 'target',
                    'staff', 'content'
                ])

            if not month_df.empty and 'big_category' in month_df.columns:
                month_df = month_df.rename(
                    columns={
                        'big_category': '대분류',
                        'mid_category': '중분류',
                        'program_name': '프로그램명',
                        'target': '참여자',
                        'staff': '수행인력',
                        'content': '사업내용'
                    })
            else:
                month_df = pd.DataFrame(
                    columns=['대분류', '중분류', '프로그램명', '참여자', '수행인력', '사업내용'])

            if is_preview_p3:
                if not month_df.empty:
                    st.table(month_df)
                else:
                    st.info("등록된 사업이 없습니다.")
            else:
                st.caption("💡 팁: 칸이 좁아 보이면 더블클릭하여 전체 내용을 확인/수정하세요.")
                edited_month = st.data_editor(
                    month_df,
                    num_rows="dynamic",
                    use_container_width=True,
                    hide_index=True,
                    column_config={
                        "대분류":
                        st.column_config.SelectboxColumn(
                            "대분류",
                            options=["보호", "교육", "문화", "정서지원", "지역사회연계"],
                            width="small"),
                        "중분류":
                        st.column_config.TextColumn("중분류", width="small"),
                        "프로그램명":
                        st.column_config.TextColumn("프로그램명", width="medium"),
                        "참여자":
                        st.column_config.TextColumn("참여자", width="small"),
                        "수행인력":
                        st.column_config.TextColumn("수행인력", width="small"),
                        "사업내용":
                        st.column_config.TextColumn("사업내용", width="large"),
                    },
                    key=f"month_editor_h1_{month}")

                data['part3_monthly_plan'][month] = edited_month.rename(
                    columns={
                        '대분류': 'big_category',
                        '중분류': 'mid_category',
                        '프로그램명': 'program_name',
                        '참여자': 'target',
                        '수행인력': 'staff',
                        '사업내용': 'content'
                    }).to_dict('records')

            st.markdown("---")

        part3_has_data = any(
            data.get('part3_monthly_plan', {}).get(m) for m in h1_months)
        if part3_has_data:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M")
            h1_report = generate_monthly_program_report(
                data['part3_monthly_plan'], h1_months)
            st.download_button(
                label="📥 PART 3 다운로드 (Word)",
                data=h1_report,
                file_name=f"part3_{timestamp}.docx",
                mime=
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
        else:
            st.warning("먼저 참참 AI 분석 시작을 눌러 내용을 생성해 주세요.")

    with tab4:
        st.title("PART 4: 하반기 월별 사업계획 (7월~12월)")

        is_preview_p4 = st.toggle("📄 문서 형태로 미리보기", key="toggle_p4")

        monthly_plan = data.get('part4_monthly_plan', {})
        h2_months = ["7월", "8월", "9월", "10월", "11월", "12월"]

        for month in h2_months:
            st.markdown(f"## {month} 사업계획서")

            month_programs = monthly_plan.get(month, [])
            month_df = pd.DataFrame(
                month_programs) if month_programs else pd.DataFrame(columns=[
                    'big_category', 'mid_category', 'program_name', 'target',
                    'staff', 'content'
                ])

            if not month_df.empty and 'big_category' in month_df.columns:
                month_df = month_df.rename(
                    columns={
                        'big_category': '대분류',
                        'mid_category': '중분류',
                        'program_name': '프로그램명',
                        'target': '참여자',
                        'staff': '수행인력',
                        'content': '사업내용'
                    })
            else:
                month_df = pd.DataFrame(
                    columns=['대분류', '중분류', '프로그램명', '참여자', '수행인력', '사업내용'])

            if is_preview_p4:
                if not month_df.empty:
                    st.table(month_df)
                else:
                    st.info("등록된 사업이 없습니다.")
            else:
                st.caption("💡 팁: 칸이 좁아 보이면 더블클릭하여 전체 내용을 확인/수정하세요.")
                edited_month = st.data_editor(
                    month_df,
                    num_rows="dynamic",
                    use_container_width=True,
                    hide_index=True,
                    column_config={
                        "대분류":
                        st.column_config.SelectboxColumn(
                            "대분류",
                            options=["보호", "교육", "문화", "정서지원", "지역사회연계"],
                            width="small"),
                        "중분류":
                        st.column_config.TextColumn("중분류", width="small"),
                        "프로그램명":
                        st.column_config.TextColumn("프로그램명", width="medium"),
                        "참여자":
                        st.column_config.TextColumn("참여자", width="small"),
                        "수행인력":
                        st.column_config.TextColumn("수행인력", width="small"),
                        "사업내용":
                        st.column_config.TextColumn("사업내용", width="large"),
                    },
                    key=f"month_editor_h2_{month}")

                data['part4_monthly_plan'][month] = edited_month.rename(
                    columns={
                        '대분류': 'big_category',
                        '중분류': 'mid_category',
                        '프로그램명': 'program_name',
                        '참여자': 'target',
                        '수행인력': 'staff',
                        '사업내용': 'content'
                    }).to_dict('records')

            st.markdown("---")

        part4_monthly_data = any(
            data.get('part4_monthly_plan', {}).get(m) for m in h2_months)
        budget_eval = data.get('part4_budget_evaluation', {})
        part4_has_data = part4_monthly_data or budget_eval.get(
            'budget_table') or budget_eval.get('feedback_summary')

        if part4_has_data:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M")
            h2_report = generate_part4_full_report(data['part4_monthly_plan'],
                                                   h2_months, budget_eval)
            st.download_button(
                label="📥 PART 4 다운로드 (Word)",
                data=h2_report,
                file_name=f"part4_{timestamp}.docx",
                mime=
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
        else:
            st.warning("먼저 참참 AI 분석 시작을 눌러 내용을 생성해 주세요.")

st.markdown("---")
st.markdown(
    "<div style='text-align: center; color: gray;'>"
    "AI 연간 사업계획 통합 에이전트 | 정보광장"
    "</div>",
    unsafe_allow_html=True)
