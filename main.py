import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
import altair as alt
from utils import get_gemini_analysis, get_default_data, read_uploaded_file, process_multiple_files
from doc_utils import (
    generate_part1_report,
    generate_part2_report,
    generate_monthly_report,
    generate_monthly_program_report,
    generate_full_report
)

matplotlib.rcParams['font.family'] = 'DejaVu Sans'
matplotlib.rcParams['axes.unicode_minus'] = False

try:
    plt.rc('font', family='NanumGothic')
except:
    pass

st.set_page_config(
    page_title="AI 연간 사업계획 통합 에이전트",
    page_icon="📊",
    layout="wide"
)

st.title("AI 연간 사업계획 통합 에이전트")
st.markdown("---")

if 'analysis_data' not in st.session_state:
    st.session_state.analysis_data = None

with st.sidebar:
    st.header("사업계획 수립 도우미")
    uploaded_files = st.file_uploader(
        "평가서 및 실적 보고서 업로드 (연도 무관)",
        type=['pdf', 'docx', 'hwp', 'txt', 'csv'],
        accept_multiple_files=True,
        help="파일당 최대 200MB • PDF, DOCX, TXT, CSV 지원"
    )
    
    if uploaded_files:
        st.info(f"📁 {len(uploaded_files)}개 파일 선택됨")
        
        for uf in uploaded_files:
            st.caption(f"• {uf.name}")
        
        combined_content = process_multiple_files(uploaded_files)
        
        if combined_content:
            with st.expander("업로드된 내용 미리보기"):
                st.text_area(
                    "통합된 문서 내용",
                    combined_content[:1000] + "..." if len(combined_content) > 1000 else combined_content,
                    height=150
                )
        
            if st.button("AI 분석 시작", type="primary"):
                with st.spinner(f"Gemini AI가 {len(uploaded_files)}개 문서를 분석 중입니다..."):
                    result = get_gemini_analysis(combined_content)
                    if result:
                        st.session_state.analysis_data = result
                        st.success("분석이 완료되었습니다!")
                        st.rerun()
    
    st.markdown("---")
    
    if st.button("샘플 데이터 로드"):
        st.session_state.analysis_data = get_default_data()
        st.success("샘플 데이터가 로드되었습니다!")
        st.rerun()
    

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
    if 'part4_budget_evaluation' not in data:
        data['part4_budget_evaluation'] = {"budget_table": [], "feedback_summary": []}
    
    tab1, tab2, tab3, tab4 = st.tabs(["PART 1: 총괄/기획", "PART 2: 세부사업", "PART 3: 상반기(1~6월)", "PART 4: 하반기(7~12월)"])
    
    with tab1:
        st.header("PART 1: 총괄 및 기획")
        view_mode_p1 = st.toggle("📄 문서 형태로 미리보기", key="view_mode_p1")
        
        part1 = data.get('part1_general', {})
        
        with st.expander("1. 사업의 필요성", expanded=True):
            st.subheader("1) 이용아동의 욕구 및 문제점")
            need_1 = st.text_area(
                "1) 이용아동의 욕구 및 문제점 (상세 서술)",
                value=part1.get('need_1_user_desire', ''),
                height=300,
                key="p1_need_1"
            )
            data['part1_general']['need_1_user_desire'] = need_1
            
            st.subheader("2) 지역 환경적 특성")
            
            need_2_1 = st.text_area(
                "(1) 지역적 특성 (상세 서술)",
                value=part1.get('need_2_1_regional', ''),
                height=200,
                key="p1_need_2_1"
            )
            data['part1_general']['need_2_1_regional'] = need_2_1
            
            need_2_2 = st.text_area(
                "(2) 주변환경 (상세 서술)",
                value=part1.get('need_2_2_environment', ''),
                height=200,
                key="p1_need_2_2"
            )
            data['part1_general']['need_2_2_environment'] = need_2_2
            
            need_2_3 = st.text_area(
                "(3) 교육적 특성 (상세 서술)",
                value=part1.get('need_2_3_educational', ''),
                height=200,
                key="p1_need_2_3"
            )
            data['part1_general']['need_2_3_educational'] = need_2_3
        
        with st.expander("2. 전년도 사업평가 및 환류계획", expanded=True):
            st.subheader("1) 차년도 사업 환류 계획")
            feedback_data = part1.get('feedback_table', [])
            feedback_df = pd.DataFrame(feedback_data) if feedback_data else pd.DataFrame(columns=['area', 'problem', 'improvement'])
            
            if not feedback_df.empty and 'area' in feedback_df.columns:
                feedback_df = feedback_df.rename(columns={'area': '영역', 'problem': '문제점', 'improvement': '개선방안'})
            else:
                feedback_df = pd.DataFrame(columns=['영역', '문제점', '개선방안'])
            
            target_order = ["보호", "교육", "문화", "정서지원", "지역사회연계"]
            if not feedback_df.empty and '영역' in feedback_df.columns:
                feedback_df['영역'] = pd.Categorical(feedback_df['영역'], categories=target_order, ordered=True)
                feedback_df = feedback_df.sort_values('영역').reset_index(drop=True)
            
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
                        "문제점": st.column_config.TextColumn("문제점", width="large"),
                        "개선방안": st.column_config.TextColumn("개선방안", width="large"),
                    },
                    key="p1_feedback_tbl"
                )
                
                data['part1_general']['feedback_table'] = edited_feedback.rename(
                    columns={'영역': 'area', '문제점': 'problem', '개선방안': 'improvement'}
                ).to_dict('records')
            
            st.subheader("2) 총평")
            total_review_data = part1.get('total_review_table', [])
            total_review_df = pd.DataFrame(total_review_data) if total_review_data else pd.DataFrame(columns=['category', 'content'])
            
            if not total_review_df.empty and 'category' in total_review_df.columns:
                total_review_df = total_review_df.rename(columns={'category': '영역', 'content': '내용'})
            else:
                total_review_df = pd.DataFrame(columns=['영역', '내용'])
            
            target_review_order = ["운영평가", "아동평가", "프로그램평가", "후원활동측면", "환류방안"]
            if not total_review_df.empty and '영역' in total_review_df.columns:
                total_review_df['영역'] = pd.Categorical(total_review_df['영역'], categories=target_review_order, ordered=True)
                total_review_df = total_review_df.sort_values('영역').reset_index(drop=True)
            
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
                        "영역": st.column_config.TextColumn("영역", width=150, disabled=True),
                        "내용": st.column_config.TextColumn("내용", width=700),
                    },
                    key="p1_review_tbl"
                )
                
                data['part1_general']['total_review_table'] = edited_review.rename(
                    columns={'영역': 'category', '내용': 'content'}
                ).to_dict('records')
        
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
                        key="p1_total_resp"
                    )
                    data['part1_general']['satisfaction_survey']['total_respondents'] = total_respondents
                
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
                        "문항": st.column_config.TextColumn("문항", width="large"),
                        "5점": st.column_config.NumberColumn("5점(명)", min_value=0, step=1),
                        "4점": st.column_config.NumberColumn("4점(명)", min_value=0, step=1),
                        "3점": st.column_config.NumberColumn("3점(명)", min_value=0, step=1),
                        "2점": st.column_config.NumberColumn("2점(명)", min_value=0, step=1),
                        "1점": st.column_config.NumberColumn("1점(명)", min_value=0, step=1),
                    },
                    key="p1_survey_tbl"
                )
                
                data['part1_general']['satisfaction_survey']['survey_data'] = edited_survey.to_dict('records')
                
                def calculate_weighted_avg(row):
                    total = row['5점'] + row['4점'] + row['3점'] + row['2점'] + row['1점']
                    if total == 0:
                        return 0
                    return (5*row['5점'] + 4*row['4점'] + 3*row['3점'] + 2*row['2점'] + 1*row['1점']) / total
                
                edited_survey['평균점수'] = edited_survey.apply(calculate_weighted_avg, axis=1)
                overall_avg = edited_survey['평균점수'].mean()
                
                st.metric("전체 평균 만족도", f"{overall_avg:.2f}점 (5점 만점)")
                
                st.markdown("---")
                st.subheader("만족도 분포 차트")
                
                chart_data = []
                for _, row in edited_survey.iterrows():
                    question = row['문항'][:20] + '...' if len(row['문항']) > 20 else row['문항']
                    for scale in ['5점', '4점', '3점', '2점', '1점']:
                        chart_data.append({
                            '문항': question,
                            '척도': scale,
                            '인원수': row[scale]
                        })
                
                chart_df = pd.DataFrame(chart_data)
                
                color_map = ['#4184F3', '#7CB342', '#FF8F00', '#FF5722', '#AC4ABC']
                scale_order = ['5점', '4점', '3점', '2점', '1점']
                
                col_chart1, col_chart2 = st.columns([1, 1])
                
                with col_chart1:
                    st.caption("항목별 평균 점수")
                    avg_data = edited_survey[['문항', '평균점수']].copy()
                    avg_data['문항_short'] = avg_data['문항'].apply(lambda x: x[:20] + '...' if len(x) > 20 else x)
                    
                    avg_bar = alt.Chart(avg_data).mark_bar(color='#4184F3').encode(
                        y=alt.Y('문항_short:N', sort=None, title='문항'),
                        x=alt.X('평균점수:Q', scale=alt.Scale(domain=[0, 5]), title='점수'),
                        tooltip=['문항:N', alt.Tooltip('평균점수:Q', format='.2f')]
                    ).properties(
                        height=400
                    )
                    
                    avg_text = avg_bar.mark_text(
                        align='left',
                        baseline='middle',
                        dx=3,
                        color='black'
                    ).encode(
                        text=alt.Text('평균점수:Q', format='.2f')
                    )
                    
                    st.altair_chart(avg_bar + avg_text, use_container_width=True)
                
                with col_chart2:
                    st.caption("응답 분포 (인원수)")
                    stacked_chart = alt.Chart(chart_df).mark_bar().encode(
                        y=alt.Y('문항:N', sort=None, title='문항'),
                        x=alt.X('인원수:Q', title='인원(명)', stack='zero'),
                        color=alt.Color('척도:N', 
                            scale=alt.Scale(domain=scale_order, range=color_map),
                            legend=alt.Legend(title='척도', orient='right')
                        ),
                        order=alt.Order('척도:N', sort='descending'),
                        tooltip=['문항:N', '척도:N', '인원수:Q']
                    ).properties(
                        height=400
                    )
                    st.altair_chart(stacked_chart, use_container_width=True)
                
                st.markdown("---")
                
                st.subheader("주관식 문항 분석")
                subjective_q = st.text_input(
                    "주관식 문항",
                    value=satisfaction_survey.get('subjective_question', '기타 건의사항 및 개선 의견'),
                    key="p1_subj_q"
                )
                data['part1_general']['satisfaction_survey']['subjective_question'] = subjective_q
                
                subjective_analysis = st.text_area(
                    "주관식 문항 요약 및 분석 (500자 이상)",
                    value=satisfaction_survey.get('subjective_analysis', ''),
                    height=300,
                    key="p1_subj_analysis"
                )
                data['part1_general']['satisfaction_survey']['subjective_analysis'] = subjective_analysis
                
                st.markdown("---")
                
                st.subheader("종합 분석 및 제언")
                overall_suggestion = st.text_area(
                    "종합 분석 및 제언 (500자 이상)",
                    value=satisfaction_survey.get('overall_suggestion', ''),
                    height=300,
                    key="p1_overall_suggestion"
                )
                data['part1_general']['satisfaction_survey']['overall_suggestion'] = overall_suggestion
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
            purpose = st.text_area(
                "사업목적을 작성하세요",
                value=part1.get('purpose_text', ''),
                height=150,
                key="p1_purpose_txt"
            )
            data['part1_general']['purpose_text'] = purpose
        
        with st.expander("5. 사업목표", expanded=True):
            goals = st.text_area(
                "사업목표를 작성하세요",
                value=part1.get('goals_text', ''),
                height=150,
                key="p1_goals_txt"
            )
            data['part1_general']['goals_text'] = goals
        
        st.markdown("---")
        
        part1_report = generate_part1_report(data['part1_general'])
        
        st.download_button(
            label="PART 1 다운로드 (Word)",
            data=part1_report,
            file_name="Part1_총괄기획.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    
    with tab2:
        st.header("PART 2: 세부 사업 계획")
        
        preview_mode_p2 = st.toggle("📄 문서 형태로 미리보기", key="preview_mode_p2")
        
        categories = ["보호", "교육", "문화", "정서지원", "지역사회연계"]
        
        selected_category = st.radio(
            "영역 선택",
            categories,
            horizontal=True,
            key="p2_category_select"
        )
        
        part2 = data.get('part2_programs', {})
        
        if selected_category not in part2:
            part2[selected_category] = {"detail_table": [], "eval_table": []}
            data['part2_programs'] = part2
        
        category_data = part2.get(selected_category, {"detail_table": [], "eval_table": []})
        
        st.subheader(f"📋 {selected_category} - 세부사업내용")
        
        detail_data = category_data.get('detail_table', [])
        detail_df = pd.DataFrame(detail_data) if detail_data else pd.DataFrame(columns=['sub_area', 'program_name', 'expected_effect', 'target', 'count', 'cycle', 'content'])
        
        if not detail_df.empty and 'sub_area' in detail_df.columns:
            detail_df = detail_df.rename(columns={
                'sub_area': '세부영역',
                'program_name': '프로그램명',
                'expected_effect': '기대효과',
                'target': '대상',
                'count': '인원',
                'cycle': '주기',
                'content': '계획내용'
            })
        else:
            detail_df = pd.DataFrame(columns=['세부영역', '프로그램명', '기대효과', '대상', '인원', '주기', '계획내용'])
        
        if preview_mode_p2:
            for idx, row in detail_df.iterrows():
                st.markdown(f"#### 📄 {row.get('세부영역', '')} > {row.get('프로그램명', '')}")
                exp_effect = row.get('기대효과', '기대효과 내용이 없습니다.')
                st.info(f"**🎯 기대효과**: {exp_effect}")
                st.markdown(f"**대상**: {row.get('대상', '')} | **인원**: {row.get('인원', '')} | **주기**: {row.get('주기', '')}")
                st.markdown(row.get('계획내용', ''))
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
                    "프로그램명": st.column_config.TextColumn("프로그램명", width="medium"),
                    "기대효과": st.column_config.TextColumn("기대효과", width="large"),
                    "대상": st.column_config.TextColumn("대상", width="small"),
                    "인원": st.column_config.TextColumn("인원", width="small"),
                    "주기": st.column_config.TextColumn("주기", width="small"),
                    "계획내용": st.column_config.TextColumn("계획내용", width="large"),
                },
                key=f"p2_detail_{selected_category}"
            )
            
            data['part2_programs'][selected_category]['detail_table'] = edited_detail.rename(
                columns={
                    '세부영역': 'sub_area',
                    '프로그램명': 'program_name',
                    '기대효과': 'expected_effect',
                    '대상': 'target',
                    '인원': 'count',
                    '주기': 'cycle',
                    '계획내용': 'content'
                }
            ).to_dict('records')
        
        st.subheader(f"📊 {selected_category} - 평가계획")
        
        eval_data = category_data.get('eval_table', [])
        eval_df = pd.DataFrame(eval_data) if eval_data else pd.DataFrame(columns=['program_name', 'eval_tool', 'eval_method', 'eval_timing'])
        
        if not eval_df.empty and 'program_name' in eval_df.columns:
            eval_df = eval_df.rename(columns={
                'program_name': '프로그램명',
                'eval_tool': '평가도구',
                'eval_method': '평가방법',
                'eval_timing': '평가시기'
            })
        else:
            eval_df = pd.DataFrame(columns=['프로그램명', '평가도구', '평가방법', '평가시기'])
        
        if preview_mode_p2:
            for idx, row in eval_df.iterrows():
                st.markdown(f"**{row.get('프로그램명', '')}**")
                st.markdown(f"- 평가도구: {row.get('평가도구', '')}")
                st.markdown(f"- 평가방법: {row.get('평가방법', '')}")
                st.markdown(f"- 평가시기: {row.get('평가시기', '')}")
                st.markdown("---")
        else:
            edited_eval = st.data_editor(
                eval_df,
                num_rows="dynamic",
                use_container_width=True,
                hide_index=True,
                column_config={
                    "프로그램명": st.column_config.TextColumn("프로그램명", width="medium"),
                    "평가도구": st.column_config.TextColumn("평가도구", width="medium"),
                    "평가방법": st.column_config.TextColumn("평가방법", width="large"),
                    "평가시기": st.column_config.TextColumn("평가시기", width="small"),
                },
                key=f"p2_eval_{selected_category}"
            )
            
            data['part2_programs'][selected_category]['eval_table'] = edited_eval.rename(
                columns={
                    '프로그램명': 'program_name',
                    '평가도구': 'eval_tool',
                    '평가방법': 'eval_method',
                    '평가시기': 'eval_timing'
                }
            ).to_dict('records')
        
        st.markdown("---")
        
        part2_report = generate_part2_report(data['part2_programs'])
        st.download_button(
            label="PART 2 다운로드 (Word)",
            data=part2_report,
            file_name="Part2_세부사업.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    
    with tab3:
        st.title("PART 3: 상반기 월별 사업계획 (1월~6월)")
        
        is_preview_p3 = st.toggle("📄 문서 형태로 미리보기", key="toggle_p3")
        
        monthly_plan = data.get('part3_monthly_plan', {})
        h1_months = ["1월", "2월", "3월", "4월", "5월", "6월"]
        
        for month in h1_months:
            st.markdown(f"## {month} 사업계획서")
            
            month_programs = monthly_plan.get(month, [])
            month_df = pd.DataFrame(month_programs) if month_programs else pd.DataFrame(
                columns=['big_category', 'mid_category', 'program_name', 'target', 'staff', 'content']
            )
            
            if not month_df.empty and 'big_category' in month_df.columns:
                month_df = month_df.rename(columns={
                    'big_category': '대분류',
                    'mid_category': '중분류',
                    'program_name': '프로그램명',
                    'target': '참여자',
                    'staff': '수행인력',
                    'content': '사업내용'
                })
            else:
                month_df = pd.DataFrame(columns=['대분류', '중분류', '프로그램명', '참여자', '수행인력', '사업내용'])
            
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
                        "대분류": st.column_config.SelectboxColumn("대분류", options=["보호", "교육", "문화", "정서지원", "지역사회연계"], width="small"),
                        "중분류": st.column_config.TextColumn("중분류", width="small"),
                        "프로그램명": st.column_config.TextColumn("프로그램명", width="medium"),
                        "참여자": st.column_config.TextColumn("참여자", width="small"),
                        "수행인력": st.column_config.TextColumn("수행인력", width="small"),
                        "사업내용": st.column_config.TextColumn("사업내용", width="large"),
                    },
                    key=f"month_editor_h1_{month}"
                )
                
                data['part3_monthly_plan'][month] = edited_month.rename(
                    columns={
                        '대분류': 'big_category',
                        '중분류': 'mid_category',
                        '프로그램명': 'program_name',
                        '참여자': 'target',
                        '수행인력': 'staff',
                        '사업내용': 'content'
                    }
                ).to_dict('records')
            
            st.markdown("---")
        
        h1_report = generate_monthly_program_report(data['part3_monthly_plan'], h1_months)
        st.download_button(
            label="📥 상반기 사업계획서 다운로드 (Word)",
            data=h1_report,
            file_name="Part3_상반기계획.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    
    with tab4:
        st.title("PART 4: 하반기 월별 사업계획 (7월~12월)")
        
        is_preview_p4 = st.toggle("📄 문서 형태로 미리보기", key="toggle_p4")
        
        monthly_plan = data.get('part3_monthly_plan', {})
        h2_months = ["7월", "8월", "9월", "10월", "11월", "12월"]
        
        for month in h2_months:
            st.markdown(f"## {month} 사업계획서")
            
            month_programs = monthly_plan.get(month, [])
            month_df = pd.DataFrame(month_programs) if month_programs else pd.DataFrame(
                columns=['big_category', 'mid_category', 'program_name', 'target', 'staff', 'content']
            )
            
            if not month_df.empty and 'big_category' in month_df.columns:
                month_df = month_df.rename(columns={
                    'big_category': '대분류',
                    'mid_category': '중분류',
                    'program_name': '프로그램명',
                    'target': '참여자',
                    'staff': '수행인력',
                    'content': '사업내용'
                })
            else:
                month_df = pd.DataFrame(columns=['대분류', '중분류', '프로그램명', '참여자', '수행인력', '사업내용'])
            
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
                        "대분류": st.column_config.SelectboxColumn("대분류", options=["보호", "교육", "문화", "정서지원", "지역사회연계"], width="small"),
                        "중분류": st.column_config.TextColumn("중분류", width="small"),
                        "프로그램명": st.column_config.TextColumn("프로그램명", width="medium"),
                        "참여자": st.column_config.TextColumn("참여자", width="small"),
                        "수행인력": st.column_config.TextColumn("수행인력", width="small"),
                        "사업내용": st.column_config.TextColumn("사업내용", width="large"),
                    },
                    key=f"month_editor_h2_{month}"
                )
                
                data['part3_monthly_plan'][month] = edited_month.rename(
                    columns={
                        '대분류': 'big_category',
                        '중분류': 'mid_category',
                        '프로그램명': 'program_name',
                        '참여자': 'target',
                        '수행인력': 'staff',
                        '사업내용': 'content'
                    }
                ).to_dict('records')
            
            st.markdown("---")
        
        h2_report = generate_monthly_program_report(data['part3_monthly_plan'], h2_months)
        st.download_button(
            label="📥 하반기 사업계획서 다운로드 (Word)",
            data=h2_report,
            file_name="Part4_하반기계획.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

st.markdown("---")
st.markdown(
    "<div style='text-align: center; color: gray;'>"
    "AI 연간 사업계획 통합 에이전트 | 정보광장"
    "</div>",
    unsafe_allow_html=True
)
