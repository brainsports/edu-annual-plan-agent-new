import io
import os
import requests
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


def ensure_korean_font():
    """Ensures NanumGothic.ttf is available and returns FontProperties."""
    font_filename = "NanumGothic.ttf"
    font_url = "https://github.com/google/fonts/raw/main/ofl/nanumgothic/NanumGothic-Regular.ttf"

    if not os.path.exists(font_filename):
        try:
            print(f"Downloading {font_filename}...")
            response = requests.get(font_url, timeout=10)
            response.raise_for_status()
            with open(font_filename, "wb") as f:
                f.write(response.content)
            print("Font downloaded successfully.")
        except Exception as e:
            print(f"Failed to download font: {e}. Korean text may break.")
            return None

    try:
        prop = fm.FontProperties(fname=font_filename)
        return prop
    except Exception as e:
        print(f"Failed to load font: {e}")
        return None


def generate_satisfaction_chart_image(survey_data, total_respondents):
    """Generate satisfaction survey charts as an image for Word document."""
    kor_font = ensure_korean_font()
    plt.rcParams['axes.unicode_minus'] = False
    
    df = pd.DataFrame(survey_data)
    
    def calc_avg(row):
        total = row['5점'] + row['4점'] + row['3점'] + row['2점'] + row['1점']
        if total == 0:
            return 0
        return (5*row['5점'] + 4*row['4점'] + 3*row['3점'] + 2*row['2점'] + 1*row['1점']) / total
    
    df['평균'] = df.apply(calc_avg, axis=1).round(2)
    
    questions = [q[:18] + '...' if len(q) > 18 else q for q in df['문항'].tolist()]
    
    color_map = {
        '5점': '#4184F3',
        '4점': '#7CB342',
        '3점': '#FF8F00',
        '2점': '#FF5722',
        '1점': '#AC4ABC'
    }
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 7))
    
    y_pos = np.arange(len(questions))
    
    avg_scores = df['평균'].tolist()
    bars = ax1.barh(y_pos, avg_scores, color='#4184F3', height=0.6)
    ax1.set_yticks(y_pos)
    if kor_font:
        ax1.set_yticklabels(questions, fontproperties=kor_font)
        ax1.set_xlabel('점수', fontproperties=kor_font, fontsize=12)
        ax1.set_title('항목별 평균 점수', fontproperties=kor_font, fontsize=14)
    else:
        ax1.set_yticklabels(questions)
        ax1.set_xlabel('점수', fontsize=12)
        ax1.set_title('항목별 평균 점수', fontsize=14)
    ax1.set_xlim(0, 5)
    ax1.invert_yaxis()
    
    for i, (bar, score) in enumerate(zip(bars, avg_scores)):
        ax1.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2, 
                 f'{score:.2f}', va='center', fontsize=10)
    
    left = np.zeros(len(questions))
    for scale in ['5점', '4점', '3점', '2점', '1점']:
        values = df[scale].tolist()
        ax2.barh(y_pos, values, left=left, color=color_map[scale], label=scale, height=0.6)
        left += np.array(values)
    
    ax2.set_yticks(y_pos)
    if kor_font:
        ax2.set_yticklabels(questions, fontproperties=kor_font)
        ax2.set_xlabel('인원(명)', fontproperties=kor_font, fontsize=12)
        ax2.set_title('응답 분포', fontproperties=kor_font, fontsize=14)
        ax2.legend(loc='lower right', fontsize=10, prop=kor_font)
    else:
        ax2.set_yticklabels(questions)
        ax2.set_xlabel('인원(명)', fontsize=12)
        ax2.set_title('응답 분포', fontsize=14)
        ax2.legend(loc='lower right', fontsize=10)
    ax2.invert_yaxis()
    
    plt.tight_layout()
    
    img_buffer = io.BytesIO()
    plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    img_buffer.seek(0)
    
    return img_buffer


def set_standard_margins(document):
    """Set page margins to 1.0 inch (Standard Word default)."""
    for section in document.sections:
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)


def add_left_aligned_heading(document, text, level=1):
    """Add a heading with left alignment (not justified)."""
    heading = document.add_heading(text, level=level)
    heading.alignment = WD_ALIGN_PARAGRAPH.LEFT
    return heading


def justify_table_cells(table):
    """Apply JUSTIFY alignment to all cells in a table."""
    for row in table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY


def add_markdown_text(paragraph, text):
    """
    Parses text with **bold** markers and adds runs to the paragraph.
    Also handles \n as line breaks within the paragraph.
    Example: "Start **Bold** End" -> Run("Start "), Run("Bold", bold=True), Run(" End")
    """
    if not text:
        return
    lines = text.split('\n')
    for line_idx, line in enumerate(lines):
        parts = line.split('**')
        for i, part in enumerate(parts):
            if part:
                run = paragraph.add_run(part)
                if i % 2 == 1:
                    run.bold = True
        if line_idx < len(lines) - 1:
            paragraph.add_run('\n')


def add_justified_paragraph(document, text):
    """Add a paragraph with JUSTIFY alignment. Splits on double newlines for separate paragraphs."""
    if not text:
        return None
    sections = text.split('\n\n')
    first_para = None
    for section in sections:
        if section.strip():
            para = document.add_paragraph()
            add_markdown_text(para, section.strip())
            para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            if first_para is None:
                first_para = para
    return first_para


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


def set_cell_background(cell, color_hex):
    """Set background color for a table cell."""
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), color_hex)
    tcPr.append(shd)


def df_to_word_table(document, df: pd.DataFrame, title: str = None, table_type: str = None):
    """Convert a Pandas DataFrame to a Word table with borders.
    
    Args:
        document: Word document object
        df: DataFrame to convert
        title: Optional heading title
        table_type: Type of table for column width settings
                   'feedback' -> 20:40:40 ratio (Area:Problem:Improvement)
                   'review' -> 20:80 ratio (Category:Content)
                   'monthly' -> 15:45:30:10 ratio (Month:Activity:Safety:Note)
                   None -> default behavior
    """
    if title:
        add_left_aligned_heading(document, title, level=2)
    
    table = document.add_table(rows=1, cols=len(df.columns))
    table.autofit = False
    
    header_cells = table.rows[0].cells
    for i, column in enumerate(df.columns):
        header_cells[i].text = str(column)
        set_cell_background(header_cells[i], 'D9D9D9')
        for paragraph in header_cells[i].paragraphs:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in paragraph.runs:
                run.bold = True
    
    for _, row in df.iterrows():
        row_cells = table.add_row().cells
        for i, value in enumerate(row):
            cell_text = str(value) if value is not None else ""
            row_cells[i].text = ""
            if row_cells[i].paragraphs:
                p = row_cells[i].paragraphs[0]
                add_markdown_text(p, cell_text)
    
    add_table_borders(table)
    
    if table_type == 'feedback' and len(df.columns) == 3:
        for row in table.rows:
            row.cells[0].width = Inches(1.3)
            row.cells[1].width = Inches(2.6)
            row.cells[2].width = Inches(2.6)
    elif table_type == 'review' and len(df.columns) == 2:
        for row in table.rows:
            row.cells[0].width = Inches(1.3)
            row.cells[1].width = Inches(5.2)
    elif table_type == 'monthly' and len(df.columns) == 4:
        for row in table.rows:
            row.cells[0].width = Inches(0.8)
            row.cells[1].width = Inches(3.0)
            row.cells[2].width = Inches(1.7)
            row.cells[3].width = Inches(1.0)
    elif table_type == 'part2_detail' and len(df.columns) == 7:
        for row in table.rows:
            row.cells[0].width = Inches(0.7)
            row.cells[1].width = Inches(0.8)
            row.cells[2].width = Inches(1.2)
            row.cells[3].width = Inches(0.6)
            row.cells[4].width = Inches(0.5)
            row.cells[5].width = Inches(0.5)
            row.cells[6].width = Inches(2.2)
    elif table_type == 'part2_eval' and len(df.columns) == 4:
        for row in table.rows:
            row.cells[0].width = Inches(1.0)
            row.cells[1].width = Inches(1.5)
            row.cells[2].width = Inches(2.5)
            row.cells[3].width = Inches(1.5)
    elif table_type == 'part2_eval_enhanced' and len(df.columns) == 5:
        for row in table.rows:
            row.cells[0].width = Inches(0.7)
            row.cells[1].width = Inches(1.0)
            row.cells[2].width = Inches(2.0)
            row.cells[3].width = Inches(1.8)
            row.cells[4].width = Inches(1.0)
    
    for row_idx, row in enumerate(table.rows):
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                if row_idx == 0:
                    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                else:
                    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    
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
    set_standard_margins(document)
    
    add_left_aligned_heading(document, 'PART 1: 총괄 및 기획', level=1)
    
    add_left_aligned_heading(document, '1. 사업의 필요성', level=2)
    
    add_left_aligned_heading(document, '1) 이용아동의 욕구 및 문제점', level=3)
    add_justified_paragraph(document, data_dict.get('need_1_user_desire', ''))
    
    add_left_aligned_heading(document, '2) 지역 환경적 특성', level=3)
    
    regional_text = f"(1) 지역적 특성\n{data_dict.get('need_2_1_regional', '')}\n\n"
    regional_text += f"(2) 주변환경\n{data_dict.get('need_2_2_environment', '')}\n\n"
    regional_text += f"(3) 교육적 특성\n{data_dict.get('need_2_3_educational', '')}"
    add_justified_paragraph(document, regional_text)
    
    add_left_aligned_heading(document, '2. 전년도 사업평가 및 환류계획', level=2)
    
    if 'feedback_table' in data_dict and data_dict['feedback_table']:
        df = pd.DataFrame(data_dict['feedback_table'])
        if 'area' in df.columns:
            df = df.rename(columns={'area': '영역', 'problem': '문제점', 'improvement': '개선방안'})
        df_to_word_table(document, df, '1) 차년도 사업 환류 계획', table_type='feedback')
    
    add_left_aligned_heading(document, '2) 총평', level=3)
    if 'total_review_table' in data_dict and data_dict['total_review_table']:
        df = pd.DataFrame(data_dict['total_review_table'])
        if 'category' in df.columns:
            df = df.rename(columns={'category': '영역', 'content': '내용'})
        df_to_word_table(document, df, None, table_type='review')
    
    add_left_aligned_heading(document, '3. 만족도조사', level=2)
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
            document.add_picture(chart_img, width=Inches(6.2))
            document.add_paragraph()
        except Exception as e:
            add_justified_paragraph(document, f"(차트 생성 오류: {str(e)})")
        
        df_to_word_table(document, survey_df, '문항별 만족도 결과')
        
        subjective_q = satisfaction_survey.get('subjective_question', '')
        subjective_analysis = satisfaction_survey.get('subjective_analysis', '')
        overall_suggestion = satisfaction_survey.get('overall_suggestion', '')
        
        if subjective_q:
            add_left_aligned_heading(document, f'주관식 문항: {subjective_q}', level=3)
        if subjective_analysis:
            add_justified_paragraph(document, subjective_analysis)
        
        if overall_suggestion:
            add_left_aligned_heading(document, '종합 분석 및 제언', level=3)
            add_justified_paragraph(document, overall_suggestion)
    
    add_left_aligned_heading(document, '4. 사업목적', level=2)
    add_justified_paragraph(document, data_dict.get('purpose_text', ''))
    
    add_left_aligned_heading(document, '5. 사업목표', level=2)
    add_justified_paragraph(document, data_dict.get('goals_text', ''))
    
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def generate_part2_report(programs_dict: dict) -> io.BytesIO:
    """Generate Word report for Part 2 (세부사업)."""
    document = Document()
    set_standard_margins(document)
    
    add_left_aligned_heading(document, 'PART 2: 세부 사업 계획', level=1)
    
    categories = ["보호", "교육", "문화", "정서지원", "지역사회연계"]
    
    for category in categories:
        if category in programs_dict:
            category_data = programs_dict[category]
            
            add_left_aligned_heading(document, f'{category} 영역', level=2)
            
            if 'detail_table' in category_data and category_data['detail_table']:
                df = pd.DataFrame(category_data['detail_table'])
                column_mapping = {
                    'sub_area': '세부영역',
                    'program_name': '프로그램명',
                    'expected_effect': '기대효과',
                    'target': '대상',
                    'count': '인원',
                    'cycle': '주기',
                    'content': '계획내용'
                }
                df = df.rename(columns=column_mapping)
                expected_cols = ['세부영역', '프로그램명', '기대효과', '대상', '인원', '주기', '계획내용']
                existing_cols = [c for c in expected_cols if c in df.columns]
                df = df[existing_cols]
                df_to_word_table(document, df, '세부사업내용', table_type='part2_detail')
            
            if 'eval_table' in category_data and category_data['eval_table']:
                df = pd.DataFrame(category_data['eval_table'])
                if 'sub_area' in df.columns and 'main_plan' in df.columns:
                    column_mapping = {
                        'sub_area': '세부영역',
                        'program_name': '프로그램명',
                        'expected_effect': '기대효과',
                        'main_plan': '주요계획',
                        'eval_method': '평가방법'
                    }
                    df = df.rename(columns=column_mapping)
                    expected_cols = ['세부영역', '프로그램명', '기대효과', '주요계획', '평가방법']
                    existing_cols = [c for c in expected_cols if c in df.columns]
                    df = df[existing_cols]
                    df_to_word_table(document, df, '평가계획', table_type='part2_eval_enhanced')
                else:
                    column_mapping = {
                        'program_name': '프로그램명',
                        'eval_tool': '평가도구',
                        'eval_method': '평가방법',
                        'eval_timing': '평가시기'
                    }
                    df = df.rename(columns=column_mapping)
                    df_to_word_table(document, df, '평가계획', table_type='part2_eval')
    
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def generate_monthly_report(monthly_list: list, period: str) -> io.BytesIO:
    """Generate Word report for monthly plans."""
    document = Document()
    set_standard_margins(document)
    
    add_left_aligned_heading(document, f'{period} 월별 계획', level=1)
    
    if monthly_list:
        df = pd.DataFrame(monthly_list)
        column_mapping = {
            'month': '월',
            'activity': '주요 행사 및 활동',
            'safety': '안전교육',
            'note': '비고'
        }
        df = df.rename(columns=column_mapping)
        df_to_word_table(document, df, table_type='monthly')
    
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def generate_full_report(data_dict: dict) -> io.BytesIO:
    """Generate complete Word report with all parts."""
    document = Document()
    set_standard_margins(document)
    
    title = document.add_heading('2025 연간 사업 계획서', level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    part1 = data_dict.get('part1_general', {})
    
    add_left_aligned_heading(document, 'PART 1: 총괄 및 기획', level=1)
    
    add_left_aligned_heading(document, '1. 사업의 필요성', level=2)
    
    add_left_aligned_heading(document, '1) 이용아동의 욕구 및 문제점', level=3)
    add_justified_paragraph(document, part1.get('need_1_user_desire', ''))
    
    add_left_aligned_heading(document, '2) 지역 환경적 특성', level=3)
    
    regional_text = f"(1) 지역적 특성\n{part1.get('need_2_1_regional', '')}\n\n"
    regional_text += f"(2) 주변환경\n{part1.get('need_2_2_environment', '')}\n\n"
    regional_text += f"(3) 교육적 특성\n{part1.get('need_2_3_educational', '')}"
    add_justified_paragraph(document, regional_text)
    
    add_left_aligned_heading(document, '2. 전년도 사업평가 및 환류계획', level=2)
    
    if 'feedback_table' in part1 and part1['feedback_table']:
        df = pd.DataFrame(part1['feedback_table'])
        if 'area' in df.columns:
            df = df.rename(columns={'area': '영역', 'problem': '문제점', 'improvement': '개선방안'})
        df_to_word_table(document, df, '1) 차년도 사업 환류 계획', table_type='feedback')
    
    add_left_aligned_heading(document, '2) 총평', level=3)
    if 'total_review_table' in part1 and part1['total_review_table']:
        df = pd.DataFrame(part1['total_review_table'])
        if 'category' in df.columns:
            df = df.rename(columns={'category': '영역', 'content': '내용'})
        df_to_word_table(document, df, None, table_type='review')
    
    add_left_aligned_heading(document, '3. 만족도조사', level=2)
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
            document.add_picture(chart_img, width=Inches(6.2))
            document.add_paragraph()
        except Exception as e:
            add_justified_paragraph(document, f"(차트 생성 오류: {str(e)})")
        
        df_to_word_table(document, survey_df, '문항별 만족도 결과')
        
        subjective_q = satisfaction_survey.get('subjective_question', '')
        subjective_analysis = satisfaction_survey.get('subjective_analysis', '')
        overall_suggestion = satisfaction_survey.get('overall_suggestion', '')
        
        if subjective_q:
            add_left_aligned_heading(document, f'주관식 문항: {subjective_q}', level=3)
        if subjective_analysis:
            add_justified_paragraph(document, subjective_analysis)
        
        if overall_suggestion:
            add_left_aligned_heading(document, '종합 분석 및 제언', level=3)
            add_justified_paragraph(document, overall_suggestion)
    
    add_left_aligned_heading(document, '4. 사업목적', level=2)
    add_justified_paragraph(document, part1.get('purpose_text', ''))
    
    add_left_aligned_heading(document, '5. 사업목표', level=2)
    add_justified_paragraph(document, part1.get('goals_text', ''))
    
    document.add_page_break()
    
    add_left_aligned_heading(document, 'PART 2: 세부 사업 계획', level=1)
    
    part2 = data_dict.get('part2_programs', {})
    categories = ["보호", "교육", "문화", "정서지원", "지역사회연계"]
    
    for category in categories:
        if category in part2:
            category_data = part2[category]
            
            add_left_aligned_heading(document, f'{category} 영역', level=2)
            
            if 'detail_table' in category_data and category_data['detail_table']:
                df = pd.DataFrame(category_data['detail_table'])
                column_mapping = {
                    'sub_area': '세부영역',
                    'program_name': '프로그램명',
                    'expected_effect': '기대효과',
                    'target': '대상',
                    'count': '인원',
                    'cycle': '주기',
                    'content': '계획내용'
                }
                df = df.rename(columns=column_mapping)
                expected_cols = ['세부영역', '프로그램명', '기대효과', '대상', '인원', '주기', '계획내용']
                existing_cols = [c for c in expected_cols if c in df.columns]
                df = df[existing_cols]
                df_to_word_table(document, df, '세부사업내용', table_type='part2_detail')
            
            if 'eval_table' in category_data and category_data['eval_table']:
                df = pd.DataFrame(category_data['eval_table'])
                if 'sub_area' in df.columns and 'main_plan' in df.columns:
                    column_mapping = {
                        'sub_area': '세부영역',
                        'program_name': '프로그램명',
                        'expected_effect': '기대효과',
                        'main_plan': '주요계획',
                        'eval_method': '평가방법'
                    }
                    df = df.rename(columns=column_mapping)
                    expected_cols = ['세부영역', '프로그램명', '기대효과', '주요계획', '평가방법']
                    existing_cols = [c for c in expected_cols if c in df.columns]
                    df = df[existing_cols]
                    df_to_word_table(document, df, '평가계획', table_type='part2_eval_enhanced')
                else:
                    column_mapping = {
                        'program_name': '프로그램명',
                        'eval_tool': '평가도구',
                        'eval_method': '평가방법',
                        'eval_timing': '평가시기'
                    }
                    df = df.rename(columns=column_mapping)
                    df_to_word_table(document, df, '평가계획', table_type='part2_eval')
    
    document.add_page_break()
    
    add_left_aligned_heading(document, 'PART 3: 상반기 월별 계획', level=1)
    if 'part3_monthly_1h' in data_dict and data_dict['part3_monthly_1h']:
        df = pd.DataFrame(data_dict['part3_monthly_1h'])
        column_mapping = {
            'month': '월',
            'activity': '주요 행사 및 활동',
            'safety': '안전교육',
            'note': '비고'
        }
        df = df.rename(columns=column_mapping)
        df_to_word_table(document, df, table_type='monthly')
    
    document.add_page_break()
    
    add_left_aligned_heading(document, 'PART 4: 하반기 월별 계획', level=1)
    if 'part4_monthly_2h' in data_dict and data_dict['part4_monthly_2h']:
        df = pd.DataFrame(data_dict['part4_monthly_2h'])
        column_mapping = {
            'month': '월',
            'activity': '주요 행사 및 활동',
            'safety': '안전교육',
            'note': '비고'
        }
        df = df.rename(columns=column_mapping)
        df_to_word_table(document, df, table_type='monthly')
    
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer
