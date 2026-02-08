import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
import altair as alt
import logging
import os

# ============================================================
# [필수 수정 1] st.set_page_config는 반드시 최상단에 위치해야 합니다.
# ============================================================
st.set_page_config(page_title="AI 사업계획 도우미", page_icon="🤝", layout="wide")

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

# ============================================================
# [필수 수정 2] APP_STYLE: 아이프레임 내 여백 최적화 적용
# ============================================================
APP_STYLE = """
<style>
/* ===== 컬러 시스템 (연두색 테마) ===== */
/* Primary: #7CB342, Background: #F9F9F7, Surface: #FFFFFF, Text: #374151, Border: #D1D5DB */

/* 전체 앱 배경 */
.stApp, [data-testid="stAppViewContainer"] {
    background-color: #F9F9F7 !important;
}

/* Streamlit 기본 UI 숨김 */
#MainMenu {visibility: hidden;}
header {visibility: hidden;}
footer {visibility: hidden;}
[data-testid="stToolbar"] {visibility: hidden;}
[data-testid="stDecoration"] {visibility: hidden;}

/* 사이드바 완전 숨김 */
[data-testid="stSidebar"] {
    display: none !important;
}

/* 박스형 레이아웃 - 메인 컨테이너 (아이프레임 맞춤형 여백 수정) */
.main .block-container {
    max-width: 1000px !important;
    margin: 0rem auto !important;  /* 상단 마진 제거 */
    padding: 1.5rem 2rem !important; /* 패딩 축소 */
    background: #FFFFFF;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

/* 메인 컨테이너 스타일 */
.main-card {
    background: #FFFFFF;
    border-radius: 8px;
    padding: 1.5rem;
    border: 1px solid #E5E7EB;
    margin-bottom: 1rem;
}

/* 연두색 헤더 배너 */
.lavender-banner {
    background: linear-gradient(135deg, #7CB342 0%, #689F38 100%);
    border-radius: 0 0 15px 15px;
    padding: 1.5rem 2rem;
    text-align: center;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 12px rgba(124, 179, 66, 0.25);
}

.lavender-banner h1 {
    color: #FFFFFF;
    font-size: 1.8rem;
    margin: 0;
    font-weight: 600;
}

/* 업로드 박스 스타일 */
.upload-box {
    background: #FFFFFF;
    border-radius: 8px;
    padding: 1.2rem;
    border: 1px solid #D1D5DB;
    margin-bottom: 1rem;
}

.upload-box h4 {
    color: #374151;
    margin-bottom: 0.8rem;
    font-size: 1rem;
    font-weight: 600;
}

/* 팁 박스 스타일 (연두색 톤) */
.tips-box {
    background: linear-gradient(180deg, #F1F8E9 0%, #DCEDC8 100%);
    border-radius: 8px;
    padding: 1.2rem;
    border: 1px solid #C5E1A5;
}

.tips-box h4 {
    color: #33691E;
    margin-bottom: 1rem;
    font-size: 1rem;
    font-weight: 600;
}

.tips-box p {
    color: #558B2F;
    font-size: 0.85rem;
    line-height: 1.5;
    margin-bottom: 0.8rem;
}

.tips-box strong {
    color: #33691E;
}

/* 버튼 스타일 - 연두색 */
.stButton > button {
    border-radius: 30px !important;
    font-weight: 500 !important;
    transition: all 0.2s ease !important;
}

.stButton > button[kind="primary"] {
    background: #7CB342 !important;
    border: none !important;
    color: #FFFFFF !important;
    font-size: 1.1rem !important;
    padding: 0.8rem 2rem !important;
}

.stButton > button[kind="primary"]:hover {
    background: #689F38 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(124, 179, 66, 0.35);
}

/* 보조 버튼 스타일 */
.stButton > button[kind="secondary"] {
    background: #FFFFFF !important;
    border: 2px solid #7CB342 !important;
    color: #7CB342 !important;
}

.stButton > button[kind="secondary"]:hover {
    background: #F1F8E9 !important;
}

/* 파일 업로더 스타일 */
[data-testid="stFileUploader"] {
    background: #FAFAFA;
    border-radius: 8px;
    border: 2px dashed #AED581;
    padding: 0.8rem;
}

/* 성공/정보 메시지 스타일 */
.stSuccess {
    background-color: #F1F8E9 !important;
    border: 1px solid #AED581 !important;
    border-radius: 8px !important;
}

.stInfo, .stWarning {
    border-radius: 8px !important;
}

/* 탭 스타일 - 연두색 언더라인 */
.stTabs [data-baseweb="tab-list"] {
    gap: 4px;
    background: transparent;
    border-bottom: 2px solid #E5E7EB;
    padding: 0;
    border-radius: 0;
}

.stTabs [data-baseweb="tab"] {
    border-radius: 0;
    padding: 12px 24px;
    color: #6B7280;
    background: transparent;
    border-bottom: 3px solid transparent;
    margin-bottom: -2px;
}

.stTabs [aria-selected="true"] {
    background: transparent !important;
    color: #7CB342 !important;
    font-weight: 600;
    border-bottom: 3px solid #7CB342 !important;
}

/* 텍스트 스타일 */
p, span, div {
    color: #374151;
}

h1, h2, h3, h4, h5, h6 {
    color: #1F2937 !important;
}

/* Expander 스타일 */
.streamlit-expanderHeader {
    border-radius: 8px !important;
    background: #F9FAFB !important;
    border: 1px solid #E5E7EB !important;
}

/* 테이블 스타일 (참참 공문서 스타일) */
.stDataFrame, [data-testid="stDataFrame"] {
    border: 1px solid #D1D5DB !important;
    border-radius: 4px !important;
}

/* 테이블 헤더 - 연한 연두색 */
.stDataFrame thead tr th {
    background-color: #F1F8E9 !important;
    color: #374151 !important;
    font-weight: 600 !important;
    border: 1px solid #D1D5DB !important;
}

/* 테이블 셀 테두리 */
.stDataFrame tbody tr td {
    border: 1px solid #D1D5DB !important;
}

/* 텍스트 에어리어 스타일 */
.stTextArea textarea {
    border: 1px solid #D1D5DB !important;
    border-radius: 6px !important;
}

.stTextArea textarea:focus {
    border-color: #7CB342 !important;
    box-shadow: 0 0 0 2px rgba(124, 179, 66, 0.2) !important;
}

/* 숫자 입력 스타일 */
.stNumberInput input {
    border: 1px solid #D1D5DB !important;
    border-radius: 6px !important;
}

.stNumberInput input:focus {
    border-color: #7CB342 !important;
}

/* 라디오 버튼 스타일 */
.stRadio > div {
    gap: 0.5rem;
}

/* 다운로드 버튼 스타일 */
.stDownloadButton > button {
    background: #7CB342 !important;
    color: #FFFFFF !important;
    border-radius: 30px !important;
    border: none !important;
}

.stDownloadButton > button:hover {
    background: #689F38 !important;
}
</style>
"""
st.markdown(APP_STYLE, unsafe_allow_html=True)

if 'analysis_data' not in st.session_state:
    st.session_state.analysis_data = None

if 'guideline_rules' not in st.session_state:
    st.session_state.guideline_rules = load_guideline_rules()

if 'month_bucket' not in st.session_state:
    st.session_state.month_bucket = None

if 'is_analyzing' not in st.session_state:
    st.session_state.is_analyzing = False

MAX_FILES = 30
MAX_TOTAL_SIZE_MB = 3

# 친근한 진행 메시지
FRIENDLY_MESSAGES = {
    'reading': "📄 파일을 읽고 있어요...",
    'analyzing': "🔍 사업계획을 정리하고 있어요...",
    'almost_done': "✨ 거의 다 됐어요. 잠시만 기다려 주세요.",
    'complete': "🎉 분석이 끝났어요! 결과를 확인해 보세요.",
    'partial_fail': "일부 내용을 가져오지 못했어요. 샘플 데이터로 보완해 주세요."
}

if 'guideline_logs' not in st.session_state:
    st.session_state.guideline_logs = []

# ============================================================
# 작성 팁 컨텐츠 (오른쪽 칼럼용)
# ============================================================
WRITING_TIPS_HTML = """
<div class="tips-box">
    <h4>💡 작성 팁</h4>
    <p><strong>파트 1: 총괄/기획</strong><br>
    지역적 특성은 통계 데이터 기반으로, 아동 욕구는 구체적 사례를 들어 서술하세요.</p>
    <p><strong>파트 2: 세부사업</strong><br>
    프로그램명은 목적이 드러나게, 기대효과는 측정 가능한 지표로 적어주세요.</p>
    <p><strong>파트 3/4: 월별계획</strong><br>
    현실적인 수행인력 배정과 예산 계획이 중요합니다. 주요 행사 일정을 고려하세요.</p>
</div>
"""


# ============================================================
# 파일 업로드 처리 함수 (왼쪽 칼럼용)
# ============================================================
def render_file_upload_section():
    """왼쪽 칼럼에 파일 업로드 UI 렌더링"""
    st.markdown('<div class="upload-box"><h4>📁 파일 업로드</h4></div>',
                unsafe_allow_html=True)

    uploaded_files = st.file_uploader("PDF, DOCX 파일 지원",
                                      type=['pdf', 'docx', 'txt', 'csv'],
                                      accept_multiple_files=True,
                                      label_visibility="collapsed",
                                      key="main_uploader")

    if uploaded_files:
        total_size_bytes = sum(uf.size for uf in uploaded_files)
        total_size_mb = total_size_bytes / (1024 * 1024)

        st.success(f"✓ {len(uploaded_files)}개 파일")

        upload_valid = True
        if len(uploaded_files) > MAX_FILES:
            st.warning(f"최대 {MAX_FILES}개")
            upload_valid = False
        if total_size_mb > MAX_TOTAL_SIZE_MB:
            st.warning(f"최대 {MAX_TOTAL_SIZE_MB}MB")
            upload_valid = False

        for uf in uploaded_files:
            st.caption(f"• {uf.name}")

        file_summaries = extract_file_summaries(uploaded_files)
        compact_text = summaries_to_compact_text(file_summaries)

        if not file_summaries:
            st.warning("읽을 수 없는 파일이에요.")
            upload_valid = False

        if SHOW_INTERNAL:
            with st.expander("디버그"):
                st.caption(f"요약: {len(compact_text)}자")

        month_bucket = bucket_programs_by_month(file_summaries)

        return uploaded_files, upload_valid, compact_text, month_bucket

    return None, False, "", {}


def render_sample_button():
    """샘플 데이터 버튼 렌더링"""
    st.markdown("---")
    st.caption("처음이라면 예시데이터로 체험해 보세요")
    if st.button("📋 예시 데이터", use_container_width=True):
        raw_data = get_default_data()
        rules = load_guideline_rules()
        adjusted_data, adjustment_logs = apply_guidelines_to_analysis(
            raw_data, rules)
        st.session_state.analysis_data = adjusted_data
        st.session_state.guideline_rules = rules
        for log in adjustment_logs:
            logger.info(log)
        st.success("샘플 로드 완료!")
        st.rerun()


# ============================================================
# 메인 3단 레이아웃 (No Sidebar)
# ============================================================

# 첫 화면 (데이터 없을 때)
if st.session_state.analysis_data is None:
    # 3단 레이아웃: 왼쪽(20%) - 중앙(60%) - 오른쪽(20%)
    left_col, center_col, right_col = st.columns([1, 3, 1])

    # 왼쪽 칼럼: 파일 업로드
    with left_col:
        uploaded_files, upload_valid, compact_text, month_bucket = render_file_upload_section(
        )

        if uploaded_files and upload_valid:
            st.markdown("")
            if st.button("✨ 마법처럼 분석 시작",
                         type="primary",
                         use_container_width=True):
                progress_placeholder = st.empty()

                def update_progress(msg):
                    if "PART 1" in msg or "PART 2" in msg:
                        progress_placeholder.info(
                            FRIENDLY_MESSAGES['analyzing'])
                    elif "PART 3" in msg or "PART 4" in msg:
                        progress_placeholder.info(
                            FRIENDLY_MESSAGES['almost_done'])
                    else:
                        progress_placeholder.info(FRIENDLY_MESSAGES['reading'])

                st.session_state.month_bucket = month_bucket
                st.session_state.is_analyzing = True

                with st.spinner(FRIENDLY_MESSAGES['reading']):
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
                        st.session_state.is_analyzing = False

                        if failed_parts:
                            st.warning(FRIENDLY_MESSAGES['partial_fail'])
                        else:
                            st.success(FRIENDLY_MESSAGES['complete'])
                        st.rerun()

        render_sample_button()

        if SHOW_INTERNAL:
            with st.expander("작성지침 (JSON)"):
                if st.session_state.guideline_rules:
                    st.json(st.session_state.guideline_rules)

    # 중앙 칼럼: 메인 콘텐츠
    with center_col:
        # 라벤더 배너 타이틀
        st.markdown("""
        <div class="lavender-banner">
            <h1>AI 연간 사업계획 통합 에이전트 ✨</h1>
        </div>
        """,
                    unsafe_allow_html=True)

        # 안내 카드
        st.markdown("""
        <div class="main-card" style="text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">📄</div>
            <h3 style="color: #374151; margin-bottom: 0.5rem;">사업 보고서 파일을 올려주세요</h3>
            <p style="color: #9CA3AF; margin-bottom: 1rem;">PDF / DOCX 파일 업로드 가능</p>
            <p style="color: #6B7280;">👈 왼쪽에서 파일을 선택하고 '마법처럼 분석 시작' 버튼을 눌러주세요</p>
        </div>
        """,
                    unsafe_allow_html=True)

        # 캐릭터 말풍선
        st.markdown("""
        <div style="display: flex; align-items: flex-start; gap: 1rem; margin-top: 1.5rem; justify-content: center;">
            <div style="font-size: 3rem;">🤖</div>
            <div class="main-card" style="max-width: 400px;">
                <p style="color: #374151; margin: 0;">
                    걱정 마세요. 제가 차근차근 도와드릴게요 🙂
                </p>
            </div>
        </div>
        """,
                    unsafe_allow_html=True)

    # 오른쪽 칼럼: 작성 팁
    with right_col:
        st.markdown(WRITING_TIPS_HTML, unsafe_allow_html=True)
else:
    # 데이터 있을 때도 3단 레이아웃 유지
    left_col, center_col, right_col = st.columns([1, 3, 1])

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

    # 왼쪽 칼럼: 새 분석 / 초기화
    with left_col:
        st.markdown('<div class="upload-box"><h4>📁 새 분석</h4></div>',
                    unsafe_allow_html=True)
        if st.button("🔄 처음부터 다시", use_container_width=True):
            st.session_state.analysis_data = None
            st.rerun()

        st.markdown("---")
        st.caption("현재 분석 완료된 데이터를 수정하고 워드 파일로 다운로드하세요.")

    # 오른쪽 칼럼: 작성 팁
    with right_col:
        st.markdown(WRITING_TIPS_HTML, unsafe_allow_html=True)

    # 중앙 칼럼: 메인 콘텐츠 (탭, 분석 결과)
    with center_col:
        # 라벤더 배너 타이틀
        st.markdown("""
        <div class="lavender-banner">
            <h1>AI 연간 사업계획 통합 에이전트 ✨</h1>
        </div>
        """,
                    unsafe_allow_html=True)

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
                               ('purpose_text', '사업목적'),
                               ('goals_text', '사업목표')]

                for field_key, field_label in text_fields:
                    text = part1.get(field_key, '')
                    rule = p1_rules.get(field_key, {})
                    max_c = rule.get('max_chars_no_space', 0)
                    min_c = rule.get('min_chars_no_space', 0)
                    bullet = rule.get('bullet_count', 0)
                    fmt = rule.get('format', 'paragraph')

                    actual_chars = count_chars_no_space(text)
                    actual_bullets = len([
                        l for l in text.split('\n')
                        if l.strip().startswith('•')
                    ]) if text else 0

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
                    p_rules = rules.get(part_key.replace('_monthly_plan', ''),
                                        {})
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
                    f"• budget_table: {bt_cnt}행 (max:{budget_max}) {bt_status}"
                )
                st.caption(
                    f"• feedback_summary: {fs_cnt}행 (max:{feedback_max}) {fs_status}"
                )

        # 중앙 칼럼 내 탭 (center_col 안에서 렌더링)
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
                    st.caption(
                        f":{color}[공백 제외 글자수: {current} / {max_chars}자]")
                else:
                    st.caption(f"공백 제외 글자수: {current}자")

            with st.expander("1. 사업의 필요성", expanded=True):
                st.subheader("1) 이용아동의 욕구 및 문제점")
                need_1 = st.text_area("1) 이용아동의 욕구 및 문제점 (상세 서술)",
                                      value=part1.get('need_1_user_desire',
                                                      ''),
                                      height=300,
                                      key="p1_need_1")
                show_char_count(need_1, 'need_1_user_desire', p1_rules)
                data['part1_general']['need_1_user_desire'] = need_1

                st.subheader("2) 지역 환경적 특성")

                need_2_1 = st.text_area("(1) 지역적 특성 (상세 서술)",
                                        value=part1.get(
                                            'need_2_1_regional', ''),
                                        height=200,
                                        key="p1_need_2_1")
                show_char_count(need_2_1, 'need_2_1_regional', p1_rules)
                data['part1_general']['need_2_1_regional'] = need_2_1

                need_2_2 = st.text_area("(2) 주변환경 (상세 서술)",
                                        value=part1.get(
                                            'need_2_2_environment', ''),
                                        height=200,
                                        key="p1_need_2_2")
                show_char_count(need_2_2, 'need_2_2_environment', p1_rules)
                data['part1_general']['need_2_2_environment'] = need_2_2

                need_2_3 = st.text_area("(3) 교육적 특성 (상세 서술)",
                                        value=part1.get(
                                            'need_2_3_educational', ''),
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
                            "영역":
                            st.column_config.TextColumn("영역", width=100),
                            "문제점":
                            st.column_config.TextColumn("문제점", width="large"),
                            "개선방안":
                            st.column_config.TextColumn("개선방안", width="large"),
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

                target_review_order = [
                    "운영평가", "아동평가", "프로그램평가", "후원활동측면", "환류방안"
                ]
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

                if satisfaction_survey and satisfaction_survey.get(
                        'survey_data'):
                    st.subheader("응답자 설정")
                    col_resp, col_btn = st.columns([2, 1])
                    with col_resp:
                        total_respondents = st.number_input(
                            "총 응답 인원 (명)",
                            min_value=1,
                            value=satisfaction_survey.get(
                                'total_respondents', 30),
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
                            align='left',
                            baseline='middle',
                            dx=3,
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
                        st.altair_chart(stacked_chart,
                                        use_container_width=True)

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
                        value=satisfaction_survey.get('subjective_analysis',
                                                      ''),
                        height=300,
                        key="p1_subj_analysis")
                    data['part1_general']['satisfaction_survey'][
                        'subjective_analysis'] = subjective_analysis

                    st.markdown("---")

                    st.subheader("종합 분석 및 제언")
                    overall_suggestion = st.text_area(
                        "종합 분석 및 제언 (500자 이상)",
                        value=satisfaction_survey.get('overall_suggestion',
                                                      ''),
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
                part2[selected_category] = {
                    "detail_table": [],
                    "eval_table": []
                }
                data['part2_programs'] = part2

            category_data = part2.get(selected_category, {
                "detail_table": [],
                "eval_table": []
            })

            st.subheader(f"📋 {selected_category} - 세부사업내용")

            detail_data = category_data.get('detail_table', [])
            detail_df = pd.DataFrame(
                detail_data) if detail_data else pd.DataFrame(columns=[
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
                detail_df = pd.DataFrame(columns=[
                    '세부영역', '프로그램명', '기대효과', '대상', '인원', '주기', '계획내용'
                ])

            if preview_mode_p2:
                for idx, row in detail_df.iterrows():
                    st.markdown(
                        f"#### 📄 {row.get('세부영역', '')} > {row.get('프로그램명', '')}"
                    )
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
                        "세부영역":
                        st.column_config.TextColumn("세부영역", width="small"),
                        "프로그램명":
                        st.column_config.TextColumn("프로그램명", width="medium"),
                        "기대효과":
                        st.column_config.TextColumn("기대효과", width="large"),
                        "대상":
                        st.column_config.TextColumn("대상", width="small"),
                        "인원":
                        st.column_config.TextColumn("인원", width="small"),
                        "주기":
                        st.column_config.TextColumn("주기", width="small"),
                        "계획내용":
                        st.column_config.TextColumn("계획내용", width="large"),
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
                        f"#### 📊 {row.get('세부영역', '')} > {row.get('프로그램명', '')}"
                    )
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
                        "세부영역":
                        st.column_config.TextColumn("세부영역", width="small"),
                        "프로그램명":
                        st.column_config.TextColumn("프로그램명", width="medium"),
                        "기대효과":
                        st.column_config.TextColumn("기대효과", width="large"),
                        "평가계획":
                        st.column_config.TextColumn("평가계획", width="medium"),
                        "평가방법":
                        st.column_config.TextColumn("평가방법", width="medium"),
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
                    month_programs) if month_programs else pd.DataFrame(
                        columns=[
                            'big_category', 'mid_category', 'program_name',
                            'target', 'staff', 'content'
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
                            st.column_config.TextColumn("프로그램명",
                                                        width="medium"),
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
                    month_programs) if month_programs else pd.DataFrame(
                        columns=[
                            'big_category', 'mid_category', 'program_name',
                            'target', 'staff', 'content'
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
                            st.column_config.TextColumn("프로그램명",
                                                        width="medium"),
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
                h2_report = generate_part4_full_report(
                    data['part4_monthly_plan'], h2_months, budget_eval)
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
