import io
import pandas as pd
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import nsdecls
from docx.oxml import parse_xml


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


def df_to_word_table(document, df: pd.DataFrame, title: str = None):
    """Convert a Pandas DataFrame to a Word table with borders."""
    if title:
        document.add_heading(title, level=2)
    
    table = document.add_table(rows=1, cols=len(df.columns))
    
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
            for paragraph in row_cells[i].paragraphs:
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    add_table_borders(table)
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


def generate_part1_report(data_dict: dict, chart_fig=None) -> io.BytesIO:
    """Generate Word report for Part 1 (총괄/기획)."""
    document = Document()
    
    document.add_heading('PART 1: 총괄 및 기획', level=1)
    
    document.add_heading('1. 사업의 필요성', level=2)
    
    document.add_heading('1) 이용아동의 욕구 및 문제점', level=3)
    document.add_paragraph(data_dict.get('need_1_user_desire', ''))
    
    document.add_heading('2) 지역 환경적 특성', level=3)
    
    regional_text = f"(1) 지역적 특성\n{data_dict.get('need_2_1_regional', '')}\n\n"
    regional_text += f"(2) 주변환경\n{data_dict.get('need_2_2_environment', '')}\n\n"
    regional_text += f"(3) 교육적 특성\n{data_dict.get('need_2_3_educational', '')}"
    document.add_paragraph(regional_text)
    
    document.add_heading('2. 전년도 사업평가 및 환류계획', level=2)
    
    if 'feedback_table' in data_dict and data_dict['feedback_table']:
        df = pd.DataFrame(data_dict['feedback_table'])
        if 'area' in df.columns:
            df = df.rename(columns={'area': '영역', 'problem': '문제점', 'improvement': '개선방안'})
        df_to_word_table(document, df, '1) 차년도 사업 환류 계획')
    
    document.add_heading('2) 총평', level=3)
    document.add_paragraph(data_dict.get('total_review_text', ''))
    
    if chart_fig:
        insert_chart_to_doc(document, chart_fig, '3. 만족도조사')
    
    if 'satisfaction_stats' in data_dict and data_dict['satisfaction_stats']:
        df = pd.DataFrame(data_dict['satisfaction_stats'])
        if 'category' in df.columns:
            df = df.rename(columns={
                'category': '카테고리',
                'very_satisfied': '매우 만족',
                'satisfied': '만족',
                'normal': '보통',
                'dissatisfied': '불만족'
            })
        df_to_word_table(document, df, '만족도 상세 데이터')
    
    document.add_heading('4. 사업목적', level=2)
    document.add_paragraph(data_dict.get('purpose_text', ''))
    
    document.add_heading('5. 사업목표', level=2)
    document.add_paragraph(data_dict.get('goals_text', ''))
    
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def generate_part2_report(programs_dict: dict) -> io.BytesIO:
    """Generate Word report for Part 2 (세부사업)."""
    document = Document()
    
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


def generate_full_report(data_dict: dict, chart_fig=None) -> io.BytesIO:
    """Generate complete Word report with all parts."""
    document = Document()
    
    title = document.add_heading('2025 연간 사업 계획서', level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    part1 = data_dict.get('part1_general', {})
    
    document.add_heading('PART 1: 총괄 및 기획', level=1)
    
    document.add_heading('1. 사업의 필요성', level=2)
    
    document.add_heading('1) 이용아동의 욕구 및 문제점', level=3)
    document.add_paragraph(part1.get('need_1_user_desire', ''))
    
    document.add_heading('2) 지역 환경적 특성', level=3)
    
    regional_text = f"(1) 지역적 특성\n{part1.get('need_2_1_regional', '')}\n\n"
    regional_text += f"(2) 주변환경\n{part1.get('need_2_2_environment', '')}\n\n"
    regional_text += f"(3) 교육적 특성\n{part1.get('need_2_3_educational', '')}"
    document.add_paragraph(regional_text)
    
    document.add_heading('2. 전년도 사업평가 및 환류계획', level=2)
    
    if 'feedback_table' in part1 and part1['feedback_table']:
        df = pd.DataFrame(part1['feedback_table'])
        if 'area' in df.columns:
            df = df.rename(columns={'area': '영역', 'problem': '문제점', 'improvement': '개선방안'})
        df_to_word_table(document, df, '1) 차년도 사업 환류 계획')
    
    document.add_heading('2) 총평', level=3)
    document.add_paragraph(part1.get('total_review_text', ''))
    
    if 'satisfaction_stats' in part1 and part1['satisfaction_stats']:
        document.add_heading('3. 만족도조사', level=2)
        df = pd.DataFrame(part1['satisfaction_stats'])
        if 'category' in df.columns:
            df = df.rename(columns={
                'category': '카테고리',
                'very_satisfied': '매우 만족',
                'satisfied': '만족',
                'normal': '보통',
                'dissatisfied': '불만족'
            })
        df_to_word_table(document, df)
    
    document.add_heading('4. 사업목적', level=2)
    document.add_paragraph(part1.get('purpose_text', ''))
    
    document.add_heading('5. 사업목표', level=2)
    document.add_paragraph(part1.get('goals_text', ''))
    
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
