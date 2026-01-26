import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
from utils import get_gemini_analysis, get_default_data, read_uploaded_file, process_multiple_files
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
    if 'part3_monthly_1h' not in data:
        data['part3_monthly_1h'] = []
    if 'part4_monthly_2h' not in data:
        data['part4_monthly_2h'] = []
    
    tab1, tab2, tab3, tab4 = st.tabs(["📋 PART 1 (총괄/기획)", "📑 PART 2 (세부사업)", "📅 PART 3 (상반기)", "📅 PART 4 (하반기)"])
    
    with tab1:
        st.header("PART 1: 총괄 및 기획")
        
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
            
            st.caption("💡 팁: 칸이 좁아 보이면 더블클릭하여 전체 내용을 확인/수정하세요.")
            edited_feedback = st.data_editor(
                feedback_df,
                num_rows="dynamic",
                use_container_width=True,
                hide_index=True,
                column_config={
                    "영역": st.column_config.TextColumn("영역", width="small"),
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
            
            st.caption("💡 총평 내용은 더블클릭하면 팝업창에서 편하게 긴 글을 수정할 수 있습니다.")
            edited_review = st.data_editor(
                total_review_df,
                num_rows="fixed",
                use_container_width=True,
                hide_index=True,
                column_config={
                    "영역": st.column_config.TextColumn("영역", width="medium", disabled=True),
                    "내용": st.column_config.TextColumn("내용", width=600),
                },
                key="p1_review_tbl"
            )
            
            data['part1_general']['total_review_table'] = edited_review.rename(
                columns={'영역': 'category', '내용': 'content'}
            ).to_dict('records')
        
        with st.expander("3. 만족도조사", expanded=True):
            satisfaction_stats = part1.get('satisfaction_stats', [])
            
            if satisfaction_stats:
                stats_df = pd.DataFrame(satisfaction_stats)
                if 'category' in stats_df.columns:
                    stats_df = stats_df.rename(columns={
                        'category': '카테고리',
                        'very_satisfied': '매우 만족',
                        'satisfied': '만족',
                        'normal': '보통',
                        'dissatisfied': '불만족'
                    })
                
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
                    st.caption("세부 수치 수정")
                    edited_stats = st.data_editor(
                        stats_df,
                        num_rows="dynamic",
                        use_container_width=True,
                        key="p1_sat_tbl"
                    )
                    
                    data['part1_general']['satisfaction_stats'] = edited_stats.rename(
                        columns={
                            '카테고리': 'category',
                            '매우 만족': 'very_satisfied',
                            '만족': 'satisfied',
                            '보통': 'normal',
                            '불만족': 'dissatisfied'
                        }
                    ).to_dict('records')
            else:
                st.info("만족도 조사 데이터가 없습니다.")
        
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
        
        fig_for_doc, ax_doc = plt.subplots(figsize=(8, 6))
        if satisfaction_stats:
            stats_for_chart = pd.DataFrame(satisfaction_stats)
            totals = stats_for_chart[['very_satisfied', 'satisfied', 'normal', 'dissatisfied']].sum()
            colors = ['#2ecc71', '#3498db', '#f39c12', '#e74c3c']
            labels = ['매우 만족', '만족', '보통', '불만족']
            ax_doc.pie(totals.values, labels=labels, autopct='%1.1f%%', colors=colors, startangle=90)
            ax_doc.set_title('만족도 분포')
        plt.tight_layout()
        
        part1_report = generate_part1_report(data['part1_general'], fig_for_doc)
        plt.close()
        
        st.download_button(
            label="PART 1 다운로드 (Word)",
            data=part1_report,
            file_name="Part1_총괄기획.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    
    with tab2:
        st.header("PART 2: 세부 사업 계획")
        
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
        detail_df = pd.DataFrame(detail_data) if detail_data else pd.DataFrame(columns=['sub_area', 'program_name', 'target', 'count', 'cycle', 'content'])
        
        if not detail_df.empty and 'sub_area' in detail_df.columns:
            detail_df = detail_df.rename(columns={
                'sub_area': '세부영역',
                'program_name': '프로그램명',
                'target': '대상',
                'count': '인원',
                'cycle': '주기',
                'content': '계획내용'
            })
        else:
            detail_df = pd.DataFrame(columns=['세부영역', '프로그램명', '대상', '인원', '주기', '계획내용'])
        
        edited_detail = st.data_editor(
            detail_df,
            num_rows="dynamic",
            use_container_width=True,
            key=f"p2_detail_{selected_category}"
        )
        
        data['part2_programs'][selected_category]['detail_table'] = edited_detail.rename(
            columns={
                '세부영역': 'sub_area',
                '프로그램명': 'program_name',
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
        
        edited_eval = st.data_editor(
            eval_df,
            num_rows="dynamic",
            use_container_width=True,
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
        st.header("PART 3: 상반기 월별 계획 (1월~6월)")
        
        monthly_h1 = data.get('part3_monthly_1h', [])
        h1_df = pd.DataFrame(monthly_h1) if monthly_h1 else pd.DataFrame(columns=['month', 'activity', 'safety', 'note'])
        
        if not h1_df.empty and 'month' in h1_df.columns:
            h1_df = h1_df.rename(columns={
                'month': '월',
                'activity': '주요 행사 및 활동',
                'safety': '안전교육',
                'note': '비고'
            })
        else:
            h1_df = pd.DataFrame(columns=['월', '주요 행사 및 활동', '안전교육', '비고'])
        
        edited_h1 = st.data_editor(
            h1_df,
            num_rows="dynamic",
            use_container_width=True,
            key="h1_editor"
        )
        
        data['part3_monthly_1h'] = edited_h1.rename(
            columns={'월': 'month', '주요 행사 및 활동': 'activity', '안전교육': 'safety', '비고': 'note'}
        ).to_dict('records')
        
        st.markdown("---")
        
        h1_report = generate_monthly_report(data['part3_monthly_1h'], "상반기")
        st.download_button(
            label="PART 3 다운로드 (Word)",
            data=h1_report,
            file_name="Part3_상반기계획.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    
    with tab4:
        st.header("PART 4: 하반기 월별 계획 (7월~12월)")
        
        monthly_h2 = data.get('part4_monthly_2h', [])
        h2_df = pd.DataFrame(monthly_h2) if monthly_h2 else pd.DataFrame(columns=['month', 'activity', 'safety', 'note'])
        
        if not h2_df.empty and 'month' in h2_df.columns:
            h2_df = h2_df.rename(columns={
                'month': '월',
                'activity': '주요 행사 및 활동',
                'safety': '안전교육',
                'note': '비고'
            })
        else:
            h2_df = pd.DataFrame(columns=['월', '주요 행사 및 활동', '안전교육', '비고'])
        
        edited_h2 = st.data_editor(
            h2_df,
            num_rows="dynamic",
            use_container_width=True,
            key="h2_editor"
        )
        
        data['part4_monthly_2h'] = edited_h2.rename(
            columns={'월': 'month', '주요 행사 및 활동': 'activity', '안전교육': 'safety', '비고': 'note'}
        ).to_dict('records')
        
        st.markdown("---")
        
        h2_report = generate_monthly_report(data['part4_monthly_2h'], "하반기")
        st.download_button(
            label="PART 4 다운로드 (Word)",
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
