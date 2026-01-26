import io
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import numpy as np
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import nsdecls
from docx.oxml import parse_xml


def setup_korean_font():
    """Setup Korean font for matplotlib, fallback to English labels if unavailable."""
    korean_fonts = ['NanumGothic', 'Malgun Gothic', 'AppleGothic', 'Noto Sans CJK KR', 'DejaVu Sans']
    available_fonts = [f.name for f in fm.fontManager.ttflist]
    
    for font in korean_fonts:
        if font in available_fonts:
            plt.rcParams['font.family'] = font
            plt.rcParams['axes.unicode_minus'] = False
            return True
    
    plt.rcParams['font.family'] = 'DejaVu Sans'
    plt.rcParams['axes.unicode_minus'] = False
    return False


def generate_satisfaction_chart_image(survey_data, total_respondents):
    """Generate satisfaction survey charts as an image for Word document."""
    has_korean = setup_korean_font()
    
    df = pd.DataFrame(survey_data)
    
    def calc_avg(row):
        total = row['5점'] + row['4점'] + row['3점'] + row['2점'] + row['1점']
        if total == 0:
            return 0
        return (5*row['5점'] + 4*row['4점'] + 3*row['3점'] + 2*row['2점'] + 1*row['1점']) / total
    
    df['평균'] = df.apply(calc_avg, axis=1).round(2)
    
    questions = [q[:15] + '...' if len(q) > 15 else q for q in df['문항'].tolist()]
    
    color_map = {
        '5점': '#4184F3',
        '4점': '#7CB342',
        '3점': '#FF8F00',
        '2점': '#FF5722',
        '1점': '#AC4ABC'
    }
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    
    y_pos = np.arange(len(questions))
    
    avg_scores = df['평균'].tolist()
    bars = ax1.barh(y_pos, avg_scores, color='#4184F3', height=0.6)
    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(questions)
    ax1.set_xlabel('점수')
    ax1.set_title('항목별 평균 점수')
    ax1.set_xlim(0, 5)
    ax1.invert_yaxis()
    
    for i, (bar, score) in enumerate(zip(bars, avg_scores)):
        ax1.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2, 
                 f'{score:.2f}', va='center', fontsize=9)
    
    left = np.zeros(len(questions))
    for scale in ['5점', '4점', '3점', '2점', '1점']:
        values = df[scale].tolist()
        ax2.barh(y_pos, values, left=left, color=color_map[scale], label=scale, height=0.6)
        left += np.array(values)
    
    ax2.set_yticks(y_pos)
    ax2.set_yticklabels(questions)
    ax2.set_xlabel('인원(명)')
    ax2.set_title('응답 분포')
    ax2.legend(loc='lower right', fontsize=8)
    ax2.invert_yaxis()
    
    plt.tight_layout()
    
    img_buffer = io.BytesIO()
    plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    img_buffer.seek(0)
    
    return img_buffer


def set_narrow_margins(document):
    """Set page margins to 0.5 inch (Narrow)."""
    for section in document.sections:
        section.left_margin = Inches(0.5)
        section.right_margin = Inches(0.5)
        section.top_margin = Inches(0.5)
        section.bottom_margin = Inches(0.5)


def justify_table_cells(table):
    """Apply JUSTIFY alignment to all cells in a table."""
    for row in table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY


def add_justified_paragraph(document, text):
    """Add a paragraph with JUSTIFY alignment."""
    para = document.add_paragraph(text)
    para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    return para


def add_table_borders(table):
    """Add borders to all cells in a Word table."""
    tbl = table._tbl
    tblBorders = parse_xml(
        r'<w:tblBorders %s>'
        r'<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        r'<w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        r'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        r'<w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        r'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        r'<w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        r'</w:tblBorders>' % nsdecls('w')
    )
    tbl.tblPr.append(tblBorders)


def df_to_word_table(document, df: pd.DataFrame, title: str = None, table_type: str = None):
    """Convert a Pandas DataFrame to a Word table with borders.
    
    Args:
        document: Word document object
        df: DataFrame to convert
        title: Optional heading title
        table_type: Type of table for column width settings
                   'feedback' -> 20:40:40 ratio (Area:Problem:Improvement)
                   'review' -> 20:80 ratio (Category:Content)
                   None -> default behavior
    """
    if title:
        document.add_heading(title, level=2)
    
    table = document.add_table(rows=1, cols=len(df.columns))
    table.autofit = False
    
    header_cells = table.rows[0].cells
    for i, column in enumerate(df.columns):
        header_cells[i].text = str(column)
        for paragraph in header_cells[i].paragraphs:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in paragraph.runs:
                run.bold = True
    
    for _, row in df.iterrows():
        row_cells = table.add_row().cells
        for i, value in enumerate(row):
            row_cells[i].text = str(value) if value is not None else ""
    
    add_table_borders(table)
    
    if table_type == 'feedback' and len(df.columns) == 3:
        for row in table.rows:
            row.cells[0].width = Inches(1.5)
            row.cells[1].width = Inches(3.0)
            row.cells[2].width = Inches(3.0)
    elif table_type == 'review' and len(df.columns) == 2:
        for row in table.rows:
            row.cells[0].width = Inches(1.5)
            row.cells[1].width = Inches(6.0)
    
    justify_table_cells(table)
    
    for cell in table.rows[0].cells:
        for paragraph in cell.paragraphs:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    document.add_paragraph()
    
    return table


def insert_chart_to_doc(document, fig, title: str = None):
    """Insert a Matplotlib figure into a Word document."""
    if title:
        document.add_heading(title, level=2)
    
    img_buffer = io.BytesIO()
    fig.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
    img_buffer.seek(0)
    
    document.add_picture(img_buffer, width=Inches(5))
    
    last_paragraph = document.paragraphs[-1]
    last_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    document.add_paragraph()


def generate_part1_report(data_dict: dict) -> io.BytesIO:
    """Generate Word report for Part 1 (총괄/기획)."""
    document = Document()
    set_narrow_margins(document)
    
    document.add_heading('PART 1: 총괄 및 기획', level=1)
    
    document.add_heading('1. 사업의 필요성', level=2)
    
    document.add_heading('1) 이용아동의 욕구 및 문제점', level=3)
    add_justified_paragraph(document, data_dict.get('need_1_user_desire', ''))
    
    document.add_heading('2) 지역 환경적 특성', level=3)
    
    regional_text = f"(1) 지역적 특성\n{data_dict.get('need_2_1_regional', '')}\n\n"
    regional_text += f"(2) 주변환경\n{data_dict.get('need_2_2_environment', '')}\n\n"
    regional_text += f"(3) 교육적 특성\n{data_dict.get('need_2_3_educational', '')}"
    add_justified_paragraph(document, regional_text)
    
    document.add_heading('2. 전년도 사업평가 및 환류계획', level=2)
    
    if 'feedback_table' in data_dict and data_dict['feedback_table']:
        df = pd.DataFrame(data_dict['feedback_table'])
        if 'area' in df.columns:
            df = df.rename(columns={'area': '영역', 'problem': '문제점', 'improvement': '개선방안'})
        df_to_word_table(document, df, '1) 차년도 사업 환류 계획', table_type='feedback')
    
    document.add_heading('2) 총평', level=3)
    if 'total_review_table' in data_dict and data_dict['total_review_table']:
        df = pd.DataFrame(data_dict['total_review_table'])
        if 'category' in df.columns:
            df = df.rename(columns={'category': '영역', 'content': '내용'})
        df_to_word_table(document, df, None, table_type='review')
    
    document.add_heading('3. 만족도조사', level=2)
    satisfaction_survey = data_dict.get('satisfaction_survey', {})
    
    if satisfaction_survey and satisfaction_survey.get('survey_data'):
        total_respondents = satisfaction_survey.get('total_respondents', 30)
        survey_data = satisfaction_survey.get('survey_data', [])
        survey_df = pd.DataFrame(survey_data)
        
        def calc_avg(row):
            total = row['5점'] + row['4점'] + row['3점'] + row['2점'] + row['1점']
            if total == 0:
                return 0
            return (5*row['5점'] + 4*row['4점'] + 3*row['3점'] + 2*row['2점'] + 1*row['1점']) / total
        
        if not survey_df.empty:
            survey_df['평균'] = survey_df.apply(calc_avg, axis=1).round(2)
            overall_avg = survey_df['평균'].mean()
        else:
            overall_avg = 0
        
        add_justified_paragraph(document, f"총 응답 인원: {total_respondents}명")
        add_justified_paragraph(document, f"전체 평균 만족도: {overall_avg:.2f}점 (5점 만점)")
        
        try:
            chart_img = generate_satisfaction_chart_image(survey_data, total_respondents)
            document.add_picture(chart_img, width=Inches(6))
            document.add_paragraph()
        except Exception as e:
            add_justified_paragraph(document, f"(차트 생성 오류: {str(e)})")
        
        df_to_word_table(document, survey_df, '문항별 만족도 결과')
        
        subjective_q = satisfaction_survey.get('subjective_question', '')
        subjective_analysis = satisfaction_survey.get('subjective_analysis', '')
        overall_suggestion = satisfaction_survey.get('overall_suggestion', '')
        
        if subjective_q:
            document.add_heading(f'주관식 문항: {subjective_q}', level=3)
        if subjective_analysis:
            add_justified_paragraph(document, subjective_analysis)
        
        if overall_suggestion:
            document.add_heading('종합 분석 및 제언', level=3)
            add_justified_paragraph(document, overall_suggestion)
    
    document.add_heading('4. 사업목적', level=2)
    add_justified_paragraph(document, data_dict.get('purpose_text', ''))
    
    document.add_heading('5. 사업목표', level=2)
    add_justified_paragraph(document, data_dict.get('goals_text', ''))
    
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def generate_part2_report(programs_dict: dict) -> io.BytesIO:
    """Generate Word report for Part 2 (세부사업)."""
    document = Document()
    set_narrow_margins(document)
    
    document.add_heading('PART 2: 세부 사업 계획', level=1)
    
    categories = ["보호", "교육", "문화", "정서지원", "지역사회연계"]
    
    for category in categories:
        if category in programs_dict:
            category_data = programs_dict[category]
            
            document.add_heading(f'{category} 영역', level=2)
            
            if 'detail_table' in category_data and category_data['detail_table']:
                df = pd.DataFrame(category_data['detail_table'])
                column_mapping = {
                    'sub_area': '세부영역',
                    'program_name': '프로그램명',
                    'target': '대상',
                    'count': '인원',
                    'cycle': '주기',
                    'content': '계획내용'
                }
                df = df.rename(columns=column_mapping)
                df_to_word_table(document, df, '세부사업내용')
            
            if 'eval_table' in category_data and category_data['eval_table']:
                df = pd.DataFrame(category_data['eval_table'])
                column_mapping = {
                    'program_name': '프로그램명',
                    'eval_tool': '평가도구',
                    'eval_method': '평가방법',
                    'eval_timing': '평가시기'
                }
                df = df.rename(columns=column_mapping)
                df_to_word_table(document, df, '평가계획')
    
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def generate_monthly_report(monthly_list: list, period: str) -> io.BytesIO:
    """Generate Word report for monthly plans."""
    document = Document()
    set_narrow_margins(document)
    
    document.add_heading(f'{period} 월별 계획', level=1)
    
    if monthly_list:
        df = pd.DataFrame(monthly_list)
        column_mapping = {
            'month': '월',
            'activity': '주요 행사 및 활동',
            'safety': '안전교육',
            'note': '비고'
        }
        df = df.rename(columns=column_mapping)
        df_to_word_table(document, df)
    
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def generate_full_report(data_dict: dict) -> io.BytesIO:
    """Generate complete Word report with all parts."""
    document = Document()
    set_narrow_margins(document)
    
    title = document.add_heading('2025 연간 사업 계획서', level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    part1 = data_dict.get('part1_general', {})
    
    document.add_heading('PART 1: 총괄 및 기획', level=1)
    
    document.add_heading('1. 사업의 필요성', level=2)
    
    document.add_heading('1) 이용아동의 욕구 및 문제점', level=3)
    add_justified_paragraph(document, part1.get('need_1_user_desire', ''))
    
    document.add_heading('2) 지역 환경적 특성', level=3)
    
    regional_text = f"(1) 지역적 특성\n{part1.get('need_2_1_regional', '')}\n\n"
    regional_text += f"(2) 주변환경\n{part1.get('need_2_2_environment', '')}\n\n"
    regional_text += f"(3) 교육적 특성\n{part1.get('need_2_3_educational', '')}"
    add_justified_paragraph(document, regional_text)
    
    document.add_heading('2. 전년도 사업평가 및 환류계획', level=2)
    
    if 'feedback_table' in part1 and part1['feedback_table']:
        df = pd.DataFrame(part1['feedback_table'])
        if 'area' in df.columns:
            df = df.rename(columns={'area': '영역', 'problem': '문제점', 'improvement': '개선방안'})
        df_to_word_table(document, df, '1) 차년도 사업 환류 계획', table_type='feedback')
    
    document.add_heading('2) 총평', level=3)
    if 'total_review_table' in part1 and part1['total_review_table']:
        df = pd.DataFrame(part1['total_review_table'])
        if 'category' in df.columns:
            df = df.rename(columns={'category': '영역', 'content': '내용'})
        df_to_word_table(document, df, None, table_type='review')
    
    document.add_heading('3. 만족도조사', level=2)
    satisfaction_survey = part1.get('satisfaction_survey', {})
    
    if satisfaction_survey and satisfaction_survey.get('survey_data'):
        total_respondents = satisfaction_survey.get('total_respondents', 30)
        survey_data = satisfaction_survey.get('survey_data', [])
        survey_df = pd.DataFrame(survey_data)
        
        def calc_avg(row):
            total = row['5점'] + row['4점'] + row['3점'] + row['2점'] + row['1점']
            if total == 0:
                return 0
            return (5*row['5점'] + 4*row['4점'] + 3*row['3점'] + 2*row['2점'] + 1*row['1점']) / total
        
        if not survey_df.empty:
            survey_df['평균'] = survey_df.apply(calc_avg, axis=1).round(2)
            overall_avg = survey_df['평균'].mean()
        else:
            overall_avg = 0
        
        add_justified_paragraph(document, f"총 응답 인원: {total_respondents}명")
        add_justified_paragraph(document, f"전체 평균 만족도: {overall_avg:.2f}점 (5점 만점)")
        
        try:
            chart_img = generate_satisfaction_chart_image(survey_data, total_respondents)
            document.add_picture(chart_img, width=Inches(6))
            document.add_paragraph()
        except Exception as e:
            add_justified_paragraph(document, f"(차트 생성 오류: {str(e)})")
        
        df_to_word_table(document, survey_df, '문항별 만족도 결과')
        
        subjective_q = satisfaction_survey.get('subjective_question', '')
        subjective_analysis = satisfaction_survey.get('subjective_analysis', '')
        overall_suggestion = satisfaction_survey.get('overall_suggestion', '')
        
        if subjective_q:
            document.add_heading(f'주관식 문항: {subjective_q}', level=3)
        if subjective_analysis:
            add_justified_paragraph(document, subjective_analysis)
        
        if overall_suggestion:
            document.add_heading('종합 분석 및 제언', level=3)
            add_justified_paragraph(document, overall_suggestion)
    
    document.add_heading('4. 사업목적', level=2)
    add_justified_paragraph(document, part1.get('purpose_text', ''))
    
    document.add_heading('5. 사업목표', level=2)
    add_justified_paragraph(document, part1.get('goals_text', ''))
    
    document.add_page_break()
    
    document.add_heading('PART 2: 세부 사업 계획', level=1)
    
    part2 = data_dict.get('part2_programs', {})
    categories = ["보호", "교육", "문화", "정서지원", "지역사회연계"]
    
    for category in categories:
        if category in part2:
            category_data = part2[category]
            
            document.add_heading(f'{category} 영역', level=2)
            
            if 'detail_table' in category_data and category_data['detail_table']:
                df = pd.DataFrame(category_data['detail_table'])
                column_mapping = {
                    'sub_area': '세부영역',
                    'program_name': '프로그램명',
                    'target': '대상',
                    'count': '인원',
                    'cycle': '주기',
                    'content': '계획내용'
                }
                df = df.rename(columns=column_mapping)
                df_to_word_table(document, df, '세부사업내용')
            
            if 'eval_table' in category_data and category_data['eval_table']:
                df = pd.DataFrame(category_data['eval_table'])
                column_mapping = {
                    'program_name': '프로그램명',
                    'eval_tool': '평가도구',
                    'eval_method': '평가방법',
                    'eval_timing': '평가시기'
                }
                df = df.rename(columns=column_mapping)
                df_to_word_table(document, df, '평가계획')
    
    document.add_page_break()
    
    document.add_heading('PART 3: 상반기 월별 계획', level=1)
    if 'part3_monthly_1h' in data_dict and data_dict['part3_monthly_1h']:
        df = pd.DataFrame(data_dict['part3_monthly_1h'])
        column_mapping = {
            'month': '월',
            'activity': '주요 행사 및 활동',
            'safety': '안전교육',
            'note': '비고'
        }
        df = df.rename(columns=column_mapping)
        df_to_word_table(document, df)
    
    document.add_page_break()
    
    document.add_heading('PART 4: 하반기 월별 계획', level=1)
    if 'part4_monthly_2h' in data_dict and data_dict['part4_monthly_2h']:
        df = pd.DataFrame(data_dict['part4_monthly_2h'])
        column_mapping = {
            'month': '월',
            'activity': '주요 행사 및 활동',
            'safety': '안전교육',
            'note': '비고'
        }
        df = df.rename(columns=column_mapping)
        df_to_word_table(document, df)
    
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer
