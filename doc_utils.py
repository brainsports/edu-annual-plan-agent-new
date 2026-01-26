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
    """Generate Word report for Part 1 (총괄/환류)."""
    document = Document()
    
    document.add_heading('Part 1: 총괄 평가 및 환류', level=1)
    
    document.add_heading('1. 총괄 평가', level=2)
    document.add_paragraph(data_dict.get('total_review', ''))
    
    document.add_heading('2. 향후 계획', level=2)
    document.add_paragraph(data_dict.get('future_plan', ''))
    
    if 'feedback_table' in data_dict and data_dict['feedback_table']:
        df = pd.DataFrame(data_dict['feedback_table'])
        df.columns = ['영역', '문제점', '개선방안']
        df_to_word_table(document, df, '3. 환류 테이블')
    
    if chart_fig:
        insert_chart_to_doc(document, chart_fig, '4. 만족도 통계')
    
    if 'satisfaction_stats' in data_dict and data_dict['satisfaction_stats']:
        df = pd.DataFrame(data_dict['satisfaction_stats'])
        df.columns = ['카테고리', '매우 만족', '만족', '보통', '불만족']
        df_to_word_table(document, df, '만족도 상세 데이터')
    
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def generate_part2_report(programs_list: list) -> io.BytesIO:
    """Generate Word report for Part 2 (세부사업)."""
    document = Document()
    
    document.add_heading('Part 2: 세부 사업 계획', level=1)
    
    if programs_list:
        df = pd.DataFrame(programs_list)
        column_mapping = {
            'area': '영역',
            'program_name': '프로그램명',
            'effect': '효과',
            'target': '대상',
            'count': '인원',
            'cycle': '주기',
            'content': '내용'
        }
        df.columns = [column_mapping.get(col, col) for col in df.columns]
        df_to_word_table(document, df)
    
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
            'activity': '활동',
            'safety': '안전',
            'note': '비고'
        }
        df.columns = [column_mapping.get(col, col) for col in df.columns]
        df_to_word_table(document, df)
    
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def generate_full_report(data_dict: dict, chart_fig=None) -> io.BytesIO:
    """Generate complete Word report with all parts."""
    document = Document()
    
    title = document.add_heading('2025 연간 사업 평가서', level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    part1 = data_dict.get('part1', {})
    
    document.add_heading('Part 1: 총괄 평가 및 환류', level=1)
    
    document.add_heading('1. 총괄 평가', level=2)
    document.add_paragraph(part1.get('total_review', ''))
    
    document.add_heading('2. 향후 계획', level=2)
    document.add_paragraph(part1.get('future_plan', ''))
    
    if 'feedback_table' in part1 and part1['feedback_table']:
        df = pd.DataFrame(part1['feedback_table'])
        df.columns = ['영역', '문제점', '개선방안']
        df_to_word_table(document, df, '3. 환류 테이블')
    
    if chart_fig:
        insert_chart_to_doc(document, chart_fig, '4. 만족도 통계')
    
    if 'satisfaction_stats' in part1 and part1['satisfaction_stats']:
        df = pd.DataFrame(part1['satisfaction_stats'])
        df.columns = ['카테고리', '매우 만족', '만족', '보통', '불만족']
        df_to_word_table(document, df)
    
    document.add_page_break()
    
    document.add_heading('Part 2: 세부 사업 계획', level=1)
    if 'part2_programs' in data_dict and data_dict['part2_programs']:
        df = pd.DataFrame(data_dict['part2_programs'])
        column_mapping = {
            'area': '영역',
            'program_name': '프로그램명',
            'effect': '효과',
            'target': '대상',
            'count': '인원',
            'cycle': '주기',
            'content': '내용'
        }
        df.columns = [column_mapping.get(col, col) for col in df.columns]
        df_to_word_table(document, df)
    
    document.add_page_break()
    
    document.add_heading('Part 3: 상반기 월별 계획', level=1)
    if 'part3_monthly' in data_dict and data_dict['part3_monthly']:
        df = pd.DataFrame(data_dict['part3_monthly'])
        column_mapping = {
            'month': '월',
            'activity': '활동',
            'safety': '안전',
            'note': '비고'
        }
        df.columns = [column_mapping.get(col, col) for col in df.columns]
        df_to_word_table(document, df)
    
    document.add_page_break()
    
    document.add_heading('Part 4: 하반기 월별 계획', level=1)
    if 'part4_monthly' in data_dict and data_dict['part4_monthly']:
        df = pd.DataFrame(data_dict['part4_monthly'])
        column_mapping = {
            'month': '월',
            'activity': '활동',
            'safety': '안전',
            'note': '비고'
        }
        df.columns = [column_mapping.get(col, col) for col in df.columns]
        df_to_word_table(document, df)
    
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer
