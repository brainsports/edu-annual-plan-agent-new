import io
from typing import Dict, List, Any, Optional

from docx import Document
from docx.shared import Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH


# =========================
# 기본 서식 유틸
# =========================
def set_standard_margins(document: Document):
    for section in document.sections:
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)


def add_left_aligned_heading(document: Document, text: str, level: int = 1):
    heading = document.add_heading(text, level=level)
    heading.alignment = WD_ALIGN_PARAGRAPH.LEFT
    return heading


def _count_no_space(text: str) -> int:
    if not text:
        return 0
    return len("".join(str(text).split()))


def _trim_to_max_chars_no_space(text: str, max_chars_no_space: int) -> str:
    """
    공백 제외 글자수 기준으로 max를 넘기면 뒤를 잘라냄.
    (Word 출력이 너무 길어지는 것 방지용)
    """
    if not text or max_chars_no_space <= 0:
        return text or ""
    s = str(text)
    if _count_no_space(s) <= max_chars_no_space:
        return s

    out = []
    cnt = 0
    for ch in s:
        if ch.isspace():
            out.append(ch)
            continue
        if cnt >= max_chars_no_space:
            break
        out.append(ch)
        cnt += 1
    return "".join(out).rstrip()


def _split_bullets(text: str) -> List[str]:
    """
    '-', '•', '·'로 시작하는 줄을 bullet로 인식.
    그 외는 한 줄 문장으로 취급.
    """
    if not text:
        return []
    lines = [ln.strip() for ln in str(text).splitlines() if ln.strip()]
    bullets = []
    for ln in lines:
        if ln.startswith(("-", "•", "·")):
            bullets.append(ln.lstrip("-•·").strip())
        else:
            bullets.append(ln)
    return bullets


def add_bullets(document: Document,
                text: str,
                max_chars_no_space: Optional[int] = None):
    """
    text를 bullet 형태로 Word에 넣음.
    """
    if not text:
        return
    if max_chars_no_space:
        text = _trim_to_max_chars_no_space(text, max_chars_no_space)

    items = _split_bullets(text)
    if not items:
        return

    for item in items:
        p = document.add_paragraph(item)
        p.style = "List Bullet"


def add_paragraph(document: Document,
                  text: str,
                  max_chars_no_space: Optional[int] = None):
    if not text:
        return
    if max_chars_no_space:
        text = _trim_to_max_chars_no_space(text, max_chars_no_space)
    p = document.add_paragraph(str(text))
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY


def add_table(document: Document, headers: List[str], rows: List[List[str]]):
    """
    간단 테이블 생성(헤더 + rows)
    """
    table = document.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"

    # header
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = str(h)

    # rows
    for row in rows:
        r = table.add_row().cells
        for i, val in enumerate(row):
            r[i].text = str(val if val is not None else "")

    document.add_paragraph("")
    return table


# =========================
# main.py에서 import 하는 함수들(필수)
# =========================
def generate_part1_report(data_dict: Dict[str, Any]):
    """
    PART 1: 총괄 및 기획 (Word 다운로드용)
    - main.py에서 ImportError 없이 호출되도록 '함수명'을 반드시 유지.
    """
    doc = Document()
    set_standard_margins(doc)
    add_left_aligned_heading(doc, "PART 1: 총괄 및 기획", 1)

    # (1) 이용아동 욕구 및 문제점: bullet(규칙 max 500)
    doc.add_heading("1) 이용아동의 욕구 및 문제점", level=2)
    add_bullets(doc,
                data_dict.get("need_1_user_desire", ""),
                max_chars_no_space=500)

    # (2) 지역 환경적 특성(3개 섹션): bullet(각 max 400)
    doc.add_heading("2) 지역 환경적 특성", level=2)
    doc.add_paragraph(" (1) 지역적 특성")
    add_bullets(doc,
                data_dict.get("need_2_1_regional", ""),
                max_chars_no_space=400)
    doc.add_paragraph(" (2) 주변환경")
    add_bullets(doc,
                data_dict.get("need_2_2_environment", ""),
                max_chars_no_space=400)
    doc.add_paragraph(" (3) 교육적 특성")
    add_bullets(doc,
                data_dict.get("need_2_3_educational", ""),
                max_chars_no_space=400)

    # (3) 사업목적: paragraph(max 350)
    doc.add_heading("3) 사업 목적", level=2)
    add_paragraph(doc,
                  data_dict.get("purpose_text", ""),
                  max_chars_no_space=350)

    # (4) 사업목표: bullet(max 800)
    doc.add_heading("4) 사업 목표", level=2)
    add_bullets(doc, data_dict.get("goals_text", ""), max_chars_no_space=800)

    # (5) 환류계획/총평 테이블은 data_dict 구조가 프로젝트마다 달라질 수 있어
    #     우선 '있으면 출력' 정도로만 안전하게 처리(없어도 오류 안 나게)
    feedback_rows = data_dict.get("feedback_table_rows") or data_dict.get(
        "feedback_table") or []
    if isinstance(feedback_rows, list) and feedback_rows:
        doc.add_heading("차년도 사업 환류 계획", level=2)
        headers = ["영역", "문제점", "개선방안"]
        rows = []
        for it in feedback_rows[:5]:
            if isinstance(it, dict):
                rows.append([
                    it.get("area", ""),
                    "\n".join(_split_bullets(it.get("problem", ""))),
                    "\n".join(_split_bullets(it.get("improvement", ""))),
                ])
        if rows:
            add_table(doc, headers, rows)

    total_rows = data_dict.get("total_review_table_rows") or data_dict.get(
        "total_review_table") or []
    if isinstance(total_rows, list) and total_rows:
        doc.add_heading("총평", level=2)
        headers = ["구분", "내용"]
        rows = []
        for it in total_rows[:5]:
            if isinstance(it, dict):
                rows.append([
                    it.get("category", ""),
                    "\n".join(_split_bullets(it.get("content", ""))),
                ])
        if rows:
            add_table(doc, headers, rows)

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer


def generate_part2_report(programs_dict: Dict[str, Any]):
    """
    PART 2: 세부 사업 계획 (Word 다운로드용)
    """
    doc = Document()
    set_standard_margins(doc)
    add_left_aligned_heading(doc, "PART 2: 세부 사업 계획", 1)

    # 구조가 다양할 수 있으므로, 카테고리 단위로 안전 출력
    if isinstance(programs_dict, dict):
        for category, payload in programs_dict.items():
            doc.add_heading(str(category), level=2)

            # payload가 테이블 rows(list[dict]) 형태로 들어오는 경우를 대비
            if isinstance(payload, list) and payload:
                headers = ["세부영역", "프로그램명", "기대효과", "대상", "횟수", "주기", "내용"]
                rows = []
                for it in payload[:5]:
                    if isinstance(it, dict):
                        rows.append([
                            it.get("sub_area", ""),
                            it.get("program_name", ""),
                            it.get("expected_effect", ""),
                            it.get("target", ""),
                            it.get("count", ""),
                            it.get("cycle", ""),
                            "\n".join(_split_bullets(it.get("content", ""))),
                        ])
                if rows:
                    add_table(doc, headers, rows)
            else:
                doc.add_paragraph("세부 내용은 앱에서 입력/생성된 데이터를 기준으로 출력됩니다.")
                doc.add_paragraph("")

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer


def generate_monthly_report(monthly_list: Any, period: str):
    """
    (유지) 단일 기간용 월별 계획 템플릿
    main.py에서 import 하고 있으므로 함수명 유지.
    """
    doc = Document()
    set_standard_margins(doc)
    add_left_aligned_heading(doc, f"{period} 월별 계획", 1)

    doc.add_paragraph("월별 계획은 앱의 월별 배치 결과를 기준으로 표 형태로 출력됩니다.")
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer


def generate_monthly_program_report(monthly_plan_dict: Dict[str, Any],
                                    months_list: List[str],
                                    title: Optional[str] = None):
    """
    ✅ main.py에서 호출하는 월별 사업계획(표) 출력
    """
    doc = Document()
    set_standard_margins(doc)

    if not title:
        if months_list:
            title = f"{months_list[0]}~{months_list[-1]} 월별 사업계획"
        else:
            title = "월별 사업계획"

    add_left_aligned_heading(doc, title, 1)

    headers = ["대분류", "중분류", "프로그램명", "참여자", "수행인력", "사업내용"]

    for month in months_list:
        doc.add_heading(month, level=2)

        rows_data = []
        items = monthly_plan_dict.get(month, []) if isinstance(
            monthly_plan_dict, dict) else []
        items = items or []

        if not items:
            doc.add_paragraph("등록된 사업이 없습니다.")
            doc.add_paragraph("")
            continue

        for it in items[:8]:
            if not isinstance(it, dict):
                continue
            content = "\n".join(
                _split_bullets(
                    _trim_to_max_chars_no_space(it.get("content", ""), 200)))
            rows_data.append([
                it.get("big_category", ""),
                it.get("mid_category", ""),
                it.get("program_name", ""),
                it.get("target", ""),
                it.get("staff", ""),
                content,
            ])

        add_table(doc, headers, rows_data)

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer


def generate_full_report(data_dict: Dict[str, Any]):
    """
    전체 보고서(간단 결합 버전)
    """
    doc = Document()
    set_standard_margins(doc)
    doc.add_heading("연간 사업 계획서", 0).alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph("전체 보고서는 PART별 다운로드를 권장합니다.")
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer
