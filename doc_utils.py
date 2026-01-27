import io
import os
import requests
import pandas as pd
import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import numpy as np
import google.generativeai as genai  # AI 분석을 위한 라이브러리 추가
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml.ns import nsdecls
from docx.oxml import parse_xml

# [핵심 수정] Gemini 1.5 Flash 모델 설정
# 기존의 404 에러를 방지하기 위해 'models/' 경로를 포함한 정식 명칭 사용
API_KEY = os.environ.get("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)
    # 73번 줄 근처: 모델명을 gemini-1.5-flash로 확정 수정했습니다.
    model = genai.GenerativeModel('models/gemini-1.5-flash')
else:
    model = None


def create_approval_box(doc):
    """
    Creates a standard Korean approval box (결재란) at the top right.
    """
    table = doc.add_table(rows=2, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.RIGHT

    for row in table.rows:
        row.cells[0].width = Inches(0.4)
        row.cells[1].width = Inches(0.7)
        row.cells[2].width = Inches(0.7)
        row.cells[3].width = Inches(0.7)

    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = "결재"
    hdr_cells[1].text = "담 당"
    hdr_cells[2].text = "팀 장"
    hdr_cells[3].text = "센터장"

    for cell in hdr_cells:
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        shading_elm = parse_xml(r'<w:shd {} w:fill="E7E6E6"/>'.format(
            nsdecls('w')))
        cell._tc.get_or_add_tcPr().append(shading_elm)

    table.rows[1].height = Inches(0.6)

    cell_top = table.cell(0, 0)
    cell_bottom = table.cell(1, 0)
    cell_top.merge(cell_bottom)
    cell_top.text = "결재"
    cell_top.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    cell_top.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph()


def ensure_korean_font():
    """Ensures NanumGothic.ttf is available."""
    font_filename = "NanumGothic.ttf"
    font_url = "https://github.com/google/fonts/raw/main/ofl/nanumgothic/NanumGothic-Regular.ttf"

    if not os.path.exists(font_filename):
        try:
            response = requests.get(font_url, timeout=10)
            response.raise_for_status()
            with open(font_filename, "wb") as f:
                f.write(response.content)
        except Exception as e:
            return None

    try:
        prop = fm.FontProperties(fname=font_filename)
        return prop
    except Exception as e:
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
        return (5 * row['5점'] + 4 * row['4점'] + 3 * row['3점'] + 2 * row['2점'] +
                1 * row['1점']) / total

    df['평균'] = df.apply(calc_avg, axis=1).round(2)
    questions = [
        q[:18] + '...' if len(q) > 18 else q for q in df['문항'].tolist()
    ]

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
        ax1.set_title('항목별 평균 점수', fontproperties=kor_font, fontsize=14)
    else:
        ax1.set_yticklabels(questions)
    ax1.set_xlim(0, 5)
    ax1.invert_yaxis()

    left = np.zeros(len(questions))
    for scale in ['5점', '4점', '3점', '2점', '1점']:
        values = df[scale].tolist()
        ax2.barh(y_pos,
                 values,
                 left=left,
                 color=color_map[scale],
                 label=scale,
                 height=0.6)
        left += np.array(values)

    ax2.set_yticks(y_pos)
    if kor_font:
        ax2.set_yticklabels(questions, fontproperties=kor_font)
        ax2.set_title('응답 분포', fontproperties=kor_font, fontsize=14)
        ax2.legend(loc='lower right', prop=kor_font)
    else:
        ax2.set_yticklabels(questions)
    ax2.invert_yaxis()

    plt.tight_layout()
    img_buffer = io.BytesIO()
    plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    img_buffer.seek(0)
    return img_buffer


def set_standard_margins(document):
    for section in document.sections:
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)


def add_left_aligned_heading(document, text, level=1):
    heading = document.add_heading(text, level=level)
    heading.alignment = WD_ALIGN_PARAGRAPH.LEFT
    return heading


def add_markdown_text(paragraph, text):
    if not text: return
    lines = text.split('\n')
    for line_idx, line in enumerate(lines):
        parts = line.split('**')
        for i, part in enumerate(parts):
            if part:
                run = paragraph.add_run(part)
                if i % 2 == 1: run.bold = True
        if line_idx < len(lines) - 1: paragraph.add_run('\n')


def add_justified_paragraph(document, text):
    if not text: return None
    sections = text.split('\n\n')
    first_para = None
    for section in sections:
        if section.strip():
            para = document.add_paragraph()
            add_markdown_text(para, section.strip())
            para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            if first_para is None: first_para = para
    return first_para


def add_table_borders(table):
    tbl = table._tbl
    tblBorders = parse_xml(
        r'<w:tblBorders %s>'
        r'<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        r'<w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        r'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        r'<w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        r'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        r'<w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
        r'</w:tblBorders>' % nsdecls('w'))
    tbl.tblPr.append(tblBorders)


def set_cell_background(cell, color_hex):
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), color_hex)
    tcPr.append(shd)


def df_to_word_table(document,
                     df: pd.DataFrame,
                     title: str = None,
                     table_type: str = None):
    if title: add_left_aligned_heading(document, title, level=2)
    table = document.add_table(rows=1, cols=len(df.columns))
    table.autofit = False

    header_cells = table.rows[0].cells
    for i, column in enumerate(df.columns):
        header_cells[i].text = str(column)
        set_cell_background(header_cells[i], 'D9D9D9')
        header_cells[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        header_cells[i].paragraphs[0].runs[0].bold = True

    for _, row in df.iterrows():
        row_cells = table.add_row().cells
        for i, value in enumerate(row):
            add_markdown_text(row_cells[i].paragraphs[0],
                              str(value) if value is not None else "")

    add_table_borders(table)
    document.add_paragraph()
    return table


# --- 리포트 생성 함수들 (기존 로직 유지) ---
def generate_part1_report(data_dict: dict) -> io.BytesIO:
    document = Document()
    set_standard_margins(document)
    add_left_aligned_heading(document, 'PART 1: 총괄 및 기획', level=1)
    add_left_aligned_heading(document, '1. 사업의 필요성', level=2)
    add_justified_paragraph(document, data_dict.get('need_1_user_desire', ''))

    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def generate_part2_report(programs_dict: dict) -> io.BytesIO:
    document = Document()
    set_standard_margins(document)
    add_left_aligned_heading(document, 'PART 2: 세부 사업 계획', level=1)
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer


def generate_budget_evaluation_report(budget_eval_data: dict) -> io.BytesIO:
    document = Document()
    set_standard_margins(document)
    add_left_aligned_heading(document, 'PART 4: 예산 및 평가', level=1)
    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer
