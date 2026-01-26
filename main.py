import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
from utils import get_gemini_analysis, get_default_data, read_uploaded_file
from doc_utils import (
    generate_part1_report,
    generate_part2_report,
    generate_monthly_report,
    generate_full_report
)

matplotlib.rcParams['font.family'] = 'DejaVu Sans'
matplotlib.rcParams['axes.unicode_minus'] = False

try:
    plt.rc('font', family='NanumGothic')
except:
    pass

st.set_page_config(
    page_title="2025 연간 사업 평가서 생성기",
    page_icon="📊",
    layout="wide"
)

st.title("2025 연간 사업 평가서 생성기 (AI Powered)")
st.markdown("---")

if 'analysis_data' not in st.session_state:
    st.session_state.analysis_data = None

with st.sidebar:
    st.header("문서 업로드")
    uploaded_file = st.file_uploader(
        "분석할 문서를 업로드하세요",
        type=['pdf', 'docx', 'hwp', 'txt', 'csv'],
        help="PDF, Word(.docx), HWP, 텍스트(.txt) 또는 CSV(.csv) 파일을 업로드하세요"
    )
    
    if uploaded_file is not None:
        file_content = read_uploaded_file(uploaded_file)
        if file_content:
            st.text_area("업로드된 내용 미리보기", file_content[:500] + "..." if len(file_content) > 500 else file_content, height=150)
        
            if st.button("AI 분석 시작", type="primary"):
                with st.spinner("Gemini AI가 문서를 분석 중입니다..."):
                    result = get_gemini_analysis(file_content)
                    if result:
                        st.session_state.analysis_data = result
                        st.success("분석이 완료되었습니다!")
                        st.rerun()
    
    st.markdown("---")
    
    if st.button("샘플 데이터 로드"):
        st.session_state.analysis_data = get_default_data()
        st.success("샘플 데이터가 로드되었습니다!")
        st.rerun()
    
    if st.session_state.analysis_data:
        st.markdown("---")
        st.subheader("전체 보고서 다운로드")
        
        full_report = generate_full_report(st.session_state.analysis_data)
        st.download_button(
            label="전체 보고서 다운로드 (Word)",
            data=full_report,
            file_name="2025_연간사업평가서_전체.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

if st.session_state.analysis_data is None:
    st.info("👈 왼쪽 사이드바에서 문서를 업로드하거나 '샘플 데이터 로드' 버튼을 클릭하여 시작하세요.")
else:
    data = st.session_state.analysis_data
    
    tab1, tab2, tab3, tab4 = st.tabs(["📋 총괄/환류", "📑 세부사업", "📅 상반기", "📅 하반기"])
    
    with tab1:
        st.header("Part 1: 총괄 평가 및 환류")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("총괄 평가")
            part1 = data.get('part1', {})
            total_review = st.text_area(
                "성과 요약",
                value=part1.get('total_review', ''),
                height=150,
                key="total_review"
            )
            data['part1']['total_review'] = total_review
        
        with col2:
            st.subheader("향후 계획")
            future_plan = st.text_area(
                "내년 계획",
                value=part1.get('future_plan', ''),
                height=150,
                key="future_plan"
            )
            data['part1']['future_plan'] = future_plan
        
        st.subheader("환류 테이블")
        feedback_df = pd.DataFrame(part1.get('feedback_table', []))
        if not feedback_df.empty:
            feedback_df.columns = ['영역', '문제점', '개선방안']
        else:
            feedback_df = pd.DataFrame(columns=['영역', '문제점', '개선방안'])
        
        edited_feedback = st.data_editor(
            feedback_df,
            num_rows="dynamic",
            use_container_width=True,
            key="feedback_editor"
        )
        
        data['part1']['feedback_table'] = edited_feedback.rename(
            columns={'영역': 'area', '문제점': 'problem', '개선방안': 'improvement'}
        ).to_dict('records')
        
        st.subheader("만족도 통계")
        
        satisfaction_stats = part1.get('satisfaction_stats', [])
        if satisfaction_stats:
            stats_df = pd.DataFrame(satisfaction_stats)
            stats_df.columns = ['카테고리', '매우 만족', '만족', '보통', '불만족']
            
            col_chart, col_data = st.columns([1, 1])
            
            with col_chart:
                fig, ax = plt.subplots(figsize=(8, 6))
                
                totals = stats_df[['매우 만족', '만족', '보통', '불만족']].sum()
                colors = ['#2ecc71', '#3498db', '#f39c12', '#e74c3c']
                labels = ['매우 만족', '만족', '보통', '불만족']
                
                wedges, texts, autotexts = ax.pie(
                    totals.values,
                    labels=labels,
                    autopct='%1.1f%%',
                    colors=colors,
                    startangle=90
                )
                
                ax.set_title('만족도 분포')
                plt.tight_layout()
                
                st.pyplot(fig)
                plt.close()
            
            with col_data:
                edited_stats = st.data_editor(
                    stats_df,
                    num_rows="dynamic",
                    use_container_width=True,
                    key="stats_editor"
                )
                
                data['part1']['satisfaction_stats'] = edited_stats.rename(
                    columns={
                        '카테고리': 'category',
                        '매우 만족': 'very_satisfied',
                        '만족': 'satisfied',
                        '보통': 'normal',
                        '불만족': 'dissatisfied'
                    }
                ).to_dict('records')
        
        st.markdown("---")
        
        fig_for_doc, ax_doc = plt.subplots(figsize=(8, 6))
        if satisfaction_stats:
            totals = pd.DataFrame(satisfaction_stats)[['very_satisfied', 'satisfied', 'normal', 'dissatisfied']].sum()
            colors = ['#2ecc71', '#3498db', '#f39c12', '#e74c3c']
            labels = ['매우 만족', '만족', '보통', '불만족']
            ax_doc.pie(totals.values, labels=labels, autopct='%1.1f%%', colors=colors, startangle=90)
            ax_doc.set_title('만족도 분포')
        plt.tight_layout()
        
        part1_report = generate_part1_report(data['part1'], fig_for_doc)
        plt.close()
        
        st.download_button(
            label="Part 1 다운로드 (Word)",
            data=part1_report,
            file_name="Part1_총괄환류.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    
    with tab2:
        st.header("Part 2: 세부 사업 계획")
        
        programs = data.get('part2_programs', [])
        programs_df = pd.DataFrame(programs)
        
        if not programs_df.empty:
            programs_df.columns = ['세부영역', '프로그램명', '기대효과', '대상아동', '계획인원', '주기', '계획내용']
        else:
            programs_df = pd.DataFrame(columns=['세부영역', '프로그램명', '기대효과', '대상아동', '계획인원', '주기', '계획내용'])
        
        edited_programs = st.data_editor(
            programs_df,
            num_rows="dynamic",
            use_container_width=True,
            key="programs_editor"
        )
        
        data['part2_programs'] = edited_programs.rename(
            columns={
                '세부영역': 'sub_area',
                '프로그램명': 'program_name',
                '기대효과': 'expected_effect',
                '대상아동': 'target_children',
                '계획인원': 'planned_count',
                '주기': 'cycle',
                '계획내용': 'planned_content'
            }
        ).to_dict('records')
        
        st.markdown("---")
        
        part2_report = generate_part2_report(data['part2_programs'])
        st.download_button(
            label="Part 2 다운로드 (Word)",
            data=part2_report,
            file_name="Part2_세부사업.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    
    with tab3:
        st.header("Part 3: 상반기 월별 계획 (1월~6월)")
        
        monthly_h1 = data.get('part3_monthly', [])
        h1_df = pd.DataFrame(monthly_h1)
        
        if not h1_df.empty:
            h1_df.columns = ['월', '주요 행사 및 활동', '안전교육', '비고']
        else:
            h1_df = pd.DataFrame(columns=['월', '주요 행사 및 활동', '안전교육', '비고'])
        
        edited_h1 = st.data_editor(
            h1_df,
            num_rows="dynamic",
            use_container_width=True,
            key="h1_editor"
        )
        
        data['part3_monthly'] = edited_h1.rename(
            columns={'월': 'month', '주요 행사 및 활동': 'main_events', '안전교육': 'safety_education', '비고': 'note'}
        ).to_dict('records')
        
        st.markdown("---")
        
        h1_report = generate_monthly_report(data['part3_monthly'], "상반기")
        st.download_button(
            label="Part 3 다운로드 (Word)",
            data=h1_report,
            file_name="Part3_상반기계획.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    
    with tab4:
        st.header("Part 4: 하반기 월별 계획 (7월~12월)")
        
        monthly_h2 = data.get('part4_monthly', [])
        h2_df = pd.DataFrame(monthly_h2)
        
        if not h2_df.empty:
            h2_df.columns = ['월', '주요 행사 및 활동', '안전교육', '비고']
        else:
            h2_df = pd.DataFrame(columns=['월', '주요 행사 및 활동', '안전교육', '비고'])
        
        edited_h2 = st.data_editor(
            h2_df,
            num_rows="dynamic",
            use_container_width=True,
            key="h2_editor"
        )
        
        data['part4_monthly'] = edited_h2.rename(
            columns={'월': 'month', '주요 행사 및 활동': 'main_events', '안전교육': 'safety_education', '비고': 'note'}
        ).to_dict('records')
        
        st.markdown("---")
        
        h2_report = generate_monthly_report(data['part4_monthly'], "하반기")
        st.download_button(
            label="Part 4 다운로드 (Word)",
            data=h2_report,
            file_name="Part4_하반기계획.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

st.markdown("---")
st.markdown(
    "<div style='text-align: center; color: gray;'>"
    "Google Gemini 1.5 Pro 기반 | Streamlit으로 제작"
    "</div>",
    unsafe_allow_html=True
)
