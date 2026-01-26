import io
import pandas as pd
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import nsdecls
from docx.oxml import parse_xml


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
    
    if satisfaction_survey and satisfaction_survey.get('questions_list'):
        questions_list = satisfaction_survey.get('questions_list', [])
        survey_df = pd.DataFrame(questions_list)
        if 'question' in survey_df.columns:
            survey_df = survey_df.rename(columns={'question': '문항', 'score': '점수'})
        
        avg_score = survey_df['점수'].mean() if not survey_df.empty else 0
        add_justified_paragraph(document, f"전체 평균 만족도: {avg_score:.2f}점 (5점 만점)")
        
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
    
    if satisfaction_survey and satisfaction_survey.get('questions_list'):
        questions_list = satisfaction_survey.get('questions_list', [])
        survey_df = pd.DataFrame(questions_list)
        if 'question' in survey_df.columns:
            survey_df = survey_df.rename(columns={'question': '문항', 'score': '점수'})
        
        avg_score = survey_df['점수'].mean() if not survey_df.empty else 0
        add_justified_paragraph(document, f"전체 평균 만족도: {avg_score:.2f}점 (5점 만점)")
        
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
