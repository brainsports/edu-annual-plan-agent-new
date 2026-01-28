import os
import io
import re
import json
from typing import Any, Dict, List, Tuple, Optional, Callable


# -----------------------------
# 기본 유틸
# -----------------------------
def count_chars_no_space(text: str) -> int:
    """공백/개행/탭 등 모든 whitespace 제거 후 글자수"""
    if text is None:
        return 0
    return len(re.sub(r"\s+", "", str(text)))


def _truncate_to_max_no_space(text: str, max_chars_no_space: int) -> str:
    """공백 제외 max_chars_no_space를 넘지 않게 안전하게 자르기"""
    if not text or max_chars_no_space <= 0:
        return ""

    s = str(text)
    count = 0
    cut_idx = 0
    for i, ch in enumerate(s):
        if not ch.isspace():
            count += 1
        if count > max_chars_no_space:
            cut_idx = i
            break
    else:
        return s  # 이미 max 이하

    return s[:cut_idx].rstrip()


def _normalize_bullets(text: str) -> str:
    """
    불릿 형태를 '• '로 통일:
    - -, *, •, ·, ○, ▪ 등으로 시작하는 줄을 • 로 바꿈
    """
    if not text:
        return ""

    lines = [ln.rstrip() for ln in str(text).splitlines()]
    out = []
    for ln in lines:
        raw = ln.strip()
        if not raw:
            continue
        raw = re.sub(r"^(\-|\*|•|·|○|▪|▶|▷)\s*", "• ", raw)
        out.append(raw)
    return "\n".join(out).strip()


def _ensure_bullet_count(text: str, bullet_count: int,
                         fill_prefix: str) -> str:
    """불릿 줄 수를 bullet_count에 맞춤(모자라면 채움, 많으면 자름)"""
    if bullet_count <= 0:
        return text.strip() if text else ""

    norm = _normalize_bullets(text)
    lines = [ln for ln in norm.splitlines() if ln.strip()]

    bullets: List[str] = []
    for ln in lines:
        if ln.startswith("• "):
            bullets.append(ln)
        else:
            bullets.append("• " + ln)

    if len(bullets) > bullet_count:
        bullets = bullets[:bullet_count]
    while len(bullets) < bullet_count:
        bullets.append(f"• {fill_prefix}")

    return "\n".join(bullets).strip()


def _is_bullet_format(text: str, bullet_count: int) -> bool:
    if bullet_count <= 0:
        return True
    lines = [ln.strip() for ln in str(text or "").splitlines() if ln.strip()]
    if len(lines) != bullet_count:
        return False
    return all(ln.startswith("• ") for ln in lines)


def _safe_progress(progress_callback: Optional[Callable[..., Any]],
                   value: Optional[float] = None,
                   message: Optional[str] = None) -> None:
    """
    progress_callback 형태가 달라도 터지지 않도록 안전 호출.
    지원 형태 예시:
    - progress_callback(0.3, "메시지")
    - progress_callback("메시지")
    - progress_callback(0.3)
    """
    if not progress_callback:
        return

    try:
        if value is not None and message is not None:
            progress_callback(value, message)
            return
    except TypeError:
        pass

    try:
        if message is not None:
            progress_callback(message)
            return
    except TypeError:
        pass

    try:
        if value is not None:
            progress_callback(value)
            return
    except TypeError:
        pass

    # 그래도 안 맞으면 조용히 무시
    return


# -----------------------------
# 작성지침 로드
# -----------------------------
_DEFAULT_GUIDELINES: Dict[str, Any] = {
    "part1": {
        "need_1_user_desire": {
            "max_chars_no_space": 500,
            "min_chars_no_space": 300,
            "bullet_count": 3,
            "format": "bullet",
            "description": "이용아동 욕구 분석"
        },
        "need_2_1_regional": {
            "max_chars_no_space": 400,
            "min_chars_no_space": 200,
            "bullet_count": 3,
            "format": "bullet",
            "description": "지역적 특성"
        },
        "need_2_2_environment": {
            "max_chars_no_space": 400,
            "min_chars_no_space": 200,
            "bullet_count": 3,
            "format": "bullet",
            "description": "주변환경"
        },
        "need_2_3_educational": {
            "max_chars_no_space": 400,
            "min_chars_no_space": 200,
            "bullet_count": 3,
            "format": "bullet",
            "description": "교육적 특성"
        },
        "feedback_table": {
            "max_rows": 5,
            "columns": {
                "area": {
                    "max_chars_no_space": 20
                },
                "problem": {
                    "max_chars_no_space": 300,
                    "bullet_count": 3
                },
                "improvement": {
                    "max_chars_no_space": 400,
                    "bullet_count": 3
                },
            },
            "format": "table",
            "description": "환류계획 테이블",
        },
        "total_review_table": {
            "max_rows": 5,
            "columns": {
                "category": {
                    "max_chars_no_space": 20
                },
                "content": {
                    "max_chars_no_space": 600,
                    "bullet_count": 3
                },
            },
            "format": "table",
            "description": "총평 테이블",
        },
        "purpose_text": {
            "max_chars_no_space": 350,
            "min_chars_no_space": 200,
            "bullet_count": 0,
            "format": "paragraph",
            "description": "사업목적"
        },
        "goals_text": {
            "max_chars_no_space": 800,
            "min_chars_no_space": 400,
            "bullet_count": 5,
            "format": "bullet",
            "description": "사업목표"
        },
    },
    "part2": {
        "detail_table": {
            "max_rows_per_category": 5,
            "columns": {
                "sub_area": {
                    "max_chars_no_space": 20
                },
                "program_name": {
                    "max_chars_no_space": 30
                },
                "expected_effect": {
                    "max_chars_no_space": 100
                },
                "target": {
                    "max_chars_no_space": 20
                },
                "count": {
                    "max_chars_no_space": 15
                },
                "cycle": {
                    "max_chars_no_space": 15
                },
                "content": {
                    "max_chars_no_space": 300,
                    "bullet_count": 3
                },
            },
            "format": "table",
            "description": "세부사업내용 테이블",
        },
        "eval_table": {
            "max_rows_per_category": 5,
            "columns": {
                "sub_area": {
                    "max_chars_no_space": 20
                },
                "program_name": {
                    "max_chars_no_space": 30
                },
                "expected_effect": {
                    "max_chars_no_space": 200,
                    "bullet_count": 2
                },
                "main_plan": {
                    "max_chars_no_space": 100
                },
                "eval_method": {
                    "max_chars_no_space": 50
                },
            },
            "format": "table",
            "description": "평가계획 테이블",
        },
    },
    "part3": {
        "monthly_program": {
            "max_programs_per_month": 8,
            "columns": {
                "big_category": {
                    "max_chars_no_space": 15
                },
                "mid_category": {
                    "max_chars_no_space": 20
                },
                "program_name": {
                    "max_chars_no_space": 30
                },
                "target": {
                    "max_chars_no_space": 20
                },
                "staff": {
                    "max_chars_no_space": 20
                },
                "content": {
                    "max_chars_no_space": 200,
                    "bullet_count": 2
                },
            },
            "format": "table",
            "description": "월별 프로그램 (1~6월)",
        }
    },
    "part4": {
        "monthly_program": {
            "max_programs_per_month": 8,
            "columns": {
                "big_category": {
                    "max_chars_no_space": 15
                },
                "mid_category": {
                    "max_chars_no_space": 20
                },
                "program_name": {
                    "max_chars_no_space": 30
                },
                "target": {
                    "max_chars_no_space": 20
                },
                "staff": {
                    "max_chars_no_space": 20
                },
                "content": {
                    "max_chars_no_space": 200,
                    "bullet_count": 2
                },
            },
            "format": "table",
            "description": "월별 프로그램 (7~12월)",
        },
        "budget_table": {
            "max_rows": 10,
            "columns": {
                "category": {
                    "max_chars_no_space": 30
                },
                "amount": {
                    "max_chars_no_space": 20
                },
                "details": {
                    "max_chars_no_space": 150
                },
            },
            "format": "table",
            "description": "예산계획",
        },
        "feedback_summary": {
            "max_rows": 5,
            "columns": {
                "area": {
                    "max_chars_no_space": 20
                },
                "problem": {
                    "max_chars_no_space": 150
                },
                "plan": {
                    "max_chars_no_space": 200
                },
            },
            "format": "table",
            "description": "환류요약",
        },
    },
}


def load_guideline_rules(
        path: str = "guidelines_template.json") -> Dict[str, Any]:
    """guidelines_template.json이 있으면 로드, 없으면 기본 템플릿 사용"""
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return _DEFAULT_GUIDELINES


# -----------------------------
# Gemini 모델/JSON 안전 파싱
# -----------------------------
def _get_gemini_model():
    """
    google.generativeai SDK 사용.
    Replit Secrets: GEMINI_API_KEY 필요
    """
    import google.generativeai as genai  # type: ignore

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY가 설정되지 않았습니다. Replit Secrets에 GEMINI_API_KEY를 추가하세요."
        )
    genai.configure(api_key=api_key)

    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
    return genai.GenerativeModel(model_name)


def _extract_json_substring(s: str) -> str:
    """텍스트에서 JSON 객체처럼 보이는 부분만 뽑아오기(코드펜스/잡문 제거)"""
    if not s:
        return ""
    txt = s.strip()
    txt = re.sub(r"^```(json)?", "", txt).strip()
    txt = re.sub(r"```$", "", txt).strip()

    start = txt.find("{")
    end = txt.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return ""
    return txt[start:end + 1]


def safe_gemini_json(prompt: str, max_retries: int = 2) -> Dict[str, Any]:
    """
    Gemini가 JSON 이외를 섞어 내보내도, 최대 max_retries만큼 재시도하며 JSON만 확보.
    SDK 버전에 따라 response_mime_type이 안 될 수 있어서 자동 폴백 포함.
    """
    model = _get_gemini_model()
    last_text = ""

    def _call(with_mime: bool) -> str:
        gen_cfg: Dict[str, Any] = {
            "temperature": 0.2,
            "max_output_tokens": 8192,
        }
        if with_mime:
            gen_cfg["response_mime_type"] = "application/json"

        try:
            resp = model.generate_content(prompt, generation_config=gen_cfg)
        except TypeError:
            # response_mime_type 미지원 폴백
            if with_mime:
                gen_cfg.pop("response_mime_type", None)
                resp = model.generate_content(prompt,
                                              generation_config=gen_cfg)
            else:
                raise
        return (getattr(resp, "text", "") or "").strip()

    for attempt in range(max_retries + 1):
        try:
            last_text = _call(with_mime=True)
        except Exception:
            last_text = _call(with_mime=False)

        candidate = _extract_json_substring(last_text) or last_text
        try:
            return json.loads(candidate)
        except Exception:
            prompt = ("반드시 JSON 객체만 출력한다. 설명/마크다운/코드펜스/텍스트를 절대 포함하지 않는다.\n"
                      "이전 출력은 JSON 파싱에 실패했다. 아래 규칙대로 JSON만 다시 출력한다.\n\n"
                      f"{prompt}\n\n"
                      "오류가 난 이전 출력(참고용):\n"
                      f"{last_text}")

    raise ValueError("Gemini JSON 파싱 실패: 출력이 끝까지 JSON 규칙을 만족하지 못했습니다.")


def _gemini_text(prompt: str,
                 temperature: float = 0.3,
                 max_output_tokens: int = 1024) -> str:
    model = _get_gemini_model()
    resp = model.generate_content(
        prompt,
        generation_config={
            "temperature": temperature,
            "max_output_tokens": max_output_tokens
        },
    )
    return (getattr(resp, "text", "") or "").strip()


# -----------------------------
# 파일 읽기/텍스트 추출
# -----------------------------
def _extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """PDF 텍스트 추출: PyPDF2 우선"""
    try:
        from PyPDF2 import PdfReader  # type: ignore
        reader = PdfReader(io.BytesIO(pdf_bytes))
        parts = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return "\n".join(parts).strip()
    except Exception:
        return ""


def read_uploaded_file(uploaded_file) -> Dict[str, Any]:
    """
    Streamlit UploadedFile 1개를 읽어서 텍스트로 변환.
    return: {name, size, type, text}
    """
    name = getattr(uploaded_file, "name", "uploaded")
    file_type = getattr(uploaded_file, "type", "") or ""

    try:
        raw = uploaded_file.getvalue()
    except Exception:
        try:
            raw = uploaded_file.read()
        except Exception:
            raw = b""

    size = len(raw) if raw else 0
    ext = os.path.splitext(name)[1].lower()

    text = ""
    if "pdf" in file_type or ext == ".pdf":
        text = _extract_text_from_pdf_bytes(raw)
    elif ext in [".txt", ".md", ".csv"]:
        try:
            text = raw.decode("utf-8", errors="ignore")
        except Exception:
            text = str(raw)
    elif ext in [".xlsx", ".xls"]:
        try:
            import pandas as pd  # type: ignore
            df = pd.read_excel(io.BytesIO(raw))
            text = df.to_csv(index=False)
        except Exception:
            text = ""
    else:
        try:
            text = raw.decode("utf-8", errors="ignore")
        except Exception:
            text = ""

    return {"name": name, "size": size, "type": file_type, "text": text}


def process_multiple_files(uploaded_files: List[Any]) -> List[Dict[str, Any]]:
    """업로드 파일 여러 개 읽기"""
    results = []
    for f in uploaded_files or []:
        results.append(read_uploaded_file(f))
    return results


# -----------------------------
# 요약/분석(기본)
# -----------------------------
def extract_file_summaries(files_data: List[Any]) -> List[Dict[str, Any]]:
    """
    각 파일을 6줄 내외로 요약
    files_data는 2가지 형태 모두 허용:
      1) dict: {"name":..., "text":...}
      2) Streamlit UploadedFile
    """
    summaries: List[Dict[str, Any]] = []

    for item in files_data or []:
        if isinstance(item, dict):
            name = item.get("name", "file")
            text = (item.get("text") or "").strip()
        else:
            parsed = read_uploaded_file(item)
            name = parsed.get("name", "file")
            text = (parsed.get("text") or "").strip()

        snippet = text[:6000]
        if not snippet:
            summaries.append({"name": name, "summary": ""})
            continue

        prompt = ("아래 문서를 '사업계획서 작성 관점'으로 6줄 이내로 핵심만 요약한다.\n"
                  "- 줄바꿈으로 구분한다.\n"
                  "- 숫자/기간/대상/목적/주요활동/평가 포인트가 있으면 포함한다.\n\n"
                  f"[문서명]\n{name}\n\n[본문]\n{snippet}")
        summary = _gemini_text(prompt, temperature=0.3, max_output_tokens=600)
        summaries.append({"name": name, "summary": summary})

    return summaries


def summaries_to_compact_text(summaries: List[Dict[str, Any]]) -> str:
    """요약들을 한 덩어리 텍스트로 합침(최종 분석 입력용)"""
    blocks = []
    for s in summaries or []:
        nm = s.get("name", "file")
        sm = (s.get("summary") or "").strip()
        if not sm:
            continue
        blocks.append(f"[{nm}]\n{sm}")
    return "\n\n".join(blocks).strip()


def get_gemini_analysis(text: str) -> str:
    """디버그/보조용: 텍스트를 간단 분석 문장으로 반환"""
    snippet = (text or "")[:8000]
    prompt = ("아래 내용을 '연간 사업계획서 작성' 관점으로 핵심만 10줄 이내로 정리한다.\n"
              "줄바꿈으로 구분한다.\n\n"
              f"{snippet}")
    return _gemini_text(prompt, temperature=0.3, max_output_tokens=800)


# -----------------------------
# 작성지침(글자수/불릿/표) 강제 적용
# -----------------------------
def _rewrite_to_fit_rule(current_text: str, rule: Dict[str, Any],
                         field_label: str) -> str:
    fmt = rule.get("format", "paragraph")
    bullet_count = int(rule.get("bullet_count", 0) or 0)
    minc = int(rule.get("min_chars_no_space", 0) or 0)
    maxc = int(rule.get("max_chars_no_space", 10**9) or 10**9)
    desc = rule.get("description", field_label)
    base = (current_text or "").strip()

    if fmt == "bullet" and bullet_count > 0:
        prompt = ("다음 작성지침을 반드시 지킨다.\n"
                  f"- 항목: {field_label} ({desc})\n"
                  f"- 출력 형식: 불릿 {bullet_count}개, 각 줄은 반드시 '• '로 시작\n"
                  f"- 공백 제외 글자수: 최소 {minc}, 최대 {maxc}\n"
                  "- 불필요한 서론/결론/설명 금지\n"
                  "- 불릿 외 텍스트 금지\n\n"
                  "[현재 내용]\n"
                  f"{base}\n\n"
                  "[요청]\n"
                  "지침을 만족하도록 다시 작성하여, 불릿만 출력한다.")
        candidate = _gemini_text(prompt,
                                 temperature=0.25,
                                 max_output_tokens=900)
        candidate = _ensure_bullet_count(candidate, bullet_count,
                                         f"{desc}에 대한 추가 내용이 필요하다.")
        candidate = _truncate_to_max_no_space(candidate, maxc)

        if count_chars_no_space(candidate) < minc:
            lines = candidate.splitlines()
            while count_chars_no_space("\n".join(lines)) < minc:
                for i in range(len(lines)):
                    if count_chars_no_space("\n".join(lines)) >= minc:
                        break
                    if lines[i].startswith("• "):
                        lines[i] = lines[i] + " 또한 지속적인 관찰과 지원이 필요하다."
            candidate = "\n".join(lines)
            candidate = _truncate_to_max_no_space(candidate, maxc)

        candidate = _ensure_bullet_count(candidate, bullet_count,
                                         f"{desc}에 대한 추가 내용이 필요하다.")
        candidate = _truncate_to_max_no_space(candidate, maxc)
        return candidate.strip()

    prompt = ("다음 작성지침을 반드시 지킨다.\n"
              f"- 항목: {field_label} ({desc})\n"
              "- 출력 형식: 한 덩어리 문단(불릿 금지)\n"
              f"- 공백 제외 글자수: 최소 {minc}, 최대 {maxc}\n"
              "- 불필요한 서론/결론/설명 금지\n\n"
              "[현재 내용]\n"
              f"{base}\n\n"
              "[요청]\n"
              "지침을 만족하도록 문단으로 다시 작성한다.")
    candidate = _gemini_text(prompt, temperature=0.25, max_output_tokens=900)
    candidate = re.sub(r"\s+", " ", candidate).strip()
    candidate = _truncate_to_max_no_space(candidate, maxc)
    if count_chars_no_space(candidate) < minc:
        while count_chars_no_space(candidate) < minc:
            candidate += " 또한 관련 자원과 지원체계를 연계하여 안정적으로 운영한다."
        candidate = _truncate_to_max_no_space(candidate, maxc)
    return candidate.strip()


def _apply_text_rule(value: Any, rule: Dict[str, Any],
                     field_label: str) -> str:
    fmt = rule.get("format", "paragraph")
    bullet_count = int(rule.get("bullet_count", 0) or 0)
    minc = int(rule.get("min_chars_no_space", 0) or 0)
    maxc = int(rule.get("max_chars_no_space", 10**9) or 10**9)
    text = (value or "").strip()

    if fmt == "bullet" and bullet_count > 0:
        text = _ensure_bullet_count(text, bullet_count,
                                    rule.get("description", field_label))
        text = _truncate_to_max_no_space(text, maxc)
    else:
        text = re.sub(r"\s+", " ", text).strip()
        text = _truncate_to_max_no_space(text, maxc)

    ok_len = (count_chars_no_space(text)
              >= minc) and (count_chars_no_space(text) <= maxc)
    ok_fmt = True
    if fmt == "bullet" and bullet_count > 0:
        ok_fmt = _is_bullet_format(text, bullet_count)

    if ok_len and ok_fmt:
        return text

    return _rewrite_to_fit_rule(text, rule, field_label)


def _apply_table_rule(rows: Any, table_rule: Dict[str, Any],
                      table_label: str) -> List[Dict[str, Any]]:
    if not isinstance(rows, list):
        rows = []

    max_rows = int(
        table_rule.get("max_rows", table_rule.get("max_rows_per_category",
                                                  999)) or 999)
    columns = table_rule.get("columns", {}) or {}

    fixed: List[Dict[str, Any]] = []
    for r in rows[:max_rows]:
        if not isinstance(r, dict):
            continue
        out_row: Dict[str, Any] = {}
        for col_key, col_rule in columns.items():
            cell_str = str(r.get(col_key, "") or "").strip()

            bc = int(col_rule.get("bullet_count", 0) or 0)
            maxc = int(col_rule.get("max_chars_no_space", 10**9) or 10**9)

            if bc > 0:
                cell_str = _ensure_bullet_count(cell_str, bc,
                                                f"{table_label} 항목 보완이 필요하다.")
                cell_str = _truncate_to_max_no_space(cell_str, maxc)
            else:
                cell_str = re.sub(r"\s+", " ", cell_str).strip()
                cell_str = _truncate_to_max_no_space(cell_str, maxc)

            out_row[col_key] = cell_str

        fixed.append(out_row)

    return fixed


def apply_guidelines_to_analysis(analysis: Dict[str, Any],
                                 rules: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(analysis, dict):
        analysis = {}

    # PART1
    p1_rules = rules.get("part1", {}) or {}
    p1 = analysis.get("part1", {}) if isinstance(analysis.get("part1"),
                                                 dict) else {}
    for key, rule in p1_rules.items():
        if rule.get("format") == "table":
            p1[key] = _apply_table_rule(p1.get(key, []), rule,
                                        rule.get("description", key))
        else:
            p1[key] = _apply_text_rule(p1.get(key, ""), rule, key)
    analysis["part1"] = p1

    # PART2
    p2_rules = rules.get("part2", {}) or {}
    p2 = analysis.get("part2", {}) if isinstance(analysis.get("part2"),
                                                 dict) else {}
    for table_key, table_rule in p2_rules.items():
        if table_rule.get("format") != "table":
            continue

        v = p2.get(table_key, [])
        if isinstance(v, dict):
            fixed_cat = {}
            max_rows_per_category = int(
                table_rule.get("max_rows_per_category", 999) or 999)
            for cat, rows in v.items():
                fixed_rows = _apply_table_rule(
                    rows, table_rule,
                    f"{table_rule.get('description', table_key)}-{cat}")
                fixed_cat[str(cat)] = fixed_rows[:max_rows_per_category]
            p2[table_key] = fixed_cat
        else:
            p2[table_key] = _apply_table_rule(
                v, table_rule, table_rule.get("description", table_key))
    analysis["part2"] = p2

    # PART3
    p3_rules = rules.get("part3", {}) or {}
    p3 = analysis.get("part3", {}) if isinstance(analysis.get("part3"),
                                                 dict) else {}
    mp_rule_1 = p3_rules.get("monthly_program", None)
    if mp_rule_1 and mp_rule_1.get("format") == "table":
        mp = p3.get("monthly_program", {}) if isinstance(
            p3.get("monthly_program"), dict) else {}
        fixed_mp = {}
        max_per_month = int(mp_rule_1.get("max_programs_per_month", 8) or 8)
        for month, rows in mp.items():
            fixed_rows = _apply_table_rule(rows, mp_rule_1,
                                           f"part3-{month}")[:max_per_month]
            fixed_mp[str(month)] = fixed_rows
        p3["monthly_program"] = fixed_mp
    analysis["part3"] = p3

    # PART4
    p4_rules = rules.get("part4", {}) or {}
    p4 = analysis.get("part4", {}) if isinstance(analysis.get("part4"),
                                                 dict) else {}

    mp_rule_2 = p4_rules.get("monthly_program", None)
    if mp_rule_2 and mp_rule_2.get("format") == "table":
        mp = p4.get("monthly_program", {}) if isinstance(
            p4.get("monthly_program"), dict) else {}
        fixed_mp = {}
        max_per_month = int(mp_rule_2.get("max_programs_per_month", 8) or 8)
        for month, rows in mp.items():
            fixed_rows = _apply_table_rule(rows, mp_rule_2,
                                           f"part4-{month}")[:max_per_month]
            fixed_mp[str(month)] = fixed_rows
        p4["monthly_program"] = fixed_mp

    for table_key, table_rule in p4_rules.items():
        if table_key == "monthly_program":
            continue
        if table_rule.get("format") == "table":
            p4[table_key] = _apply_table_rule(
                p4.get(table_key, []), table_rule,
                table_rule.get("description", table_key))

    analysis["part4"] = p4
    return analysis


# -----------------------------
# 파트별 분석 JSON 생성 (핵심)
# -----------------------------
def get_partitioned_analysis(
    compact_text: str,
    guideline_rules: Optional[Dict[str, Any]] = None,
    progress_callback: Optional[Callable[..., Any]] = None,
    month_bucket: Optional[Dict[str, List[Dict[str, Any]]]] = None,
    **_ignored_kwargs
) -> Dict[str, Any]:
    """
    파트별 분석 수행.
    - progress_callback: 진행률 콜백 (선택)
    - month_bucket: 외부 dict를 넘기면, 분석 후 월별 버킷을 채워줌
    - **_ignored_kwargs: 미래 인자 호환용
    """
    _safe_progress(progress_callback, 0.02, "작성지침 로드 중")

    rules = guideline_rules or load_guideline_rules()
    snippet = (compact_text or "")[:12000]

    _safe_progress(progress_callback, 0.08, "분석 스켈레톤 준비 중")

    skeleton = {
        "part1": {
            "need_1_user_desire": "",
            "need_2_1_regional": "",
            "need_2_2_environment": "",
            "need_2_3_educational": "",
            "feedback_table": [],
            "total_review_table": [],
            "purpose_text": "",
            "goals_text": "",
        },
        "part2": {
            "detail_table": {},
            "eval_table": {}
        },
        "part3": {
            "monthly_program": {
                "1월": [],
                "2월": [],
                "3월": [],
                "4월": [],
                "5월": [],
                "6월": []
            }
        },
        "part4": {
            "monthly_program": {
                "7월": [],
                "8월": [],
                "9월": [],
                "10월": [],
                "11월": [],
                "12월": []
            },
            "budget_table": [],
            "feedback_summary": [],
        },
    }

    rule_brief = json.dumps(rules, ensure_ascii=False)

    prompt = ("반드시 JSON 객체만 출력한다. 설명/마크다운/코드펜스 금지.\n"
              "아래 '작성지침 규칙'을 참고하여 연간 사업계획서 데이터를 PART1~PART4로 구조화한다.\n"
              "출력은 '출력 스켈레톤'과 동일한 키 구조를 유지한다(키 누락 금지).\n"
              "표는 list[object] 또는 category별 dict 형태를 허용한다.\n\n"
              f"[작성지침 규칙]\n{rule_brief}\n\n"
              f"[출력 스켈레톤]\n{json.dumps(skeleton, ensure_ascii=False)}\n\n"
              f"[입력 요약]\n{snippet}\n")

    _safe_progress(progress_callback, 0.30, "Gemini 분석 JSON 생성 중")
    analysis = safe_gemini_json(prompt, max_retries=2)

    _safe_progress(progress_callback, 0.82, "작성지침 적용(보정) 중")
    analysis = apply_guidelines_to_analysis(analysis, rules)

    if month_bucket is not None and isinstance(month_bucket, dict):
        computed = bucket_programs_by_month(analysis)
        month_bucket.clear()
        month_bucket.update(computed)

    _safe_progress(progress_callback, 1.00, "완료")
    return analysis


def bucket_programs_by_month(
        data: Any) -> Dict[str, List[Dict[str, Any]]]:
    """
    월별 프로그램 버킷 생성.
    - data가 analysis_data (part3/part4 구조)이면 추출
    - data가 list (file_summaries)이면 빈 버킷 반환
    - 이외 형태도 빈 버킷 반환 (에러 방지)
    """
    bucket: Dict[str, List[Dict[str, Any]]] = {}
    
    if not data:
        return bucket
    
    if isinstance(data, list):
        return bucket
    
    if not isinstance(data, dict):
        return bucket
    
    analysis_data = data

    p3 = analysis_data.get("part3", {}) if isinstance(
        analysis_data.get("part3"), dict) else {}
    p4 = analysis_data.get("part4", {}) if isinstance(
        analysis_data.get("part4"), dict) else {}

    mp3 = p3.get("monthly_program", {}) if isinstance(
        p3.get("monthly_program"), dict) else {}
    mp4 = p4.get("monthly_program", {}) if isinstance(
        p4.get("monthly_program"), dict) else {}

    for k, v in mp3.items():
        bucket[str(k)] = v if isinstance(v, list) else []
    for k, v in mp4.items():
        bucket[str(k)] = v if isinstance(v, list) else []

    return bucket


def get_default_data(
) -> Tuple[Dict[str, Any], Dict[str, List[Dict[str, Any]]]]:
    rules = load_guideline_rules()
    sample: Dict[str, Any] = {
        "part1": {},
        "part2": {
            "detail_table": {},
            "eval_table": {}
        },
        "part3": {
            "monthly_program": {
                m: []
                for m in ["1월", "2월", "3월", "4월", "5월", "6월"]
            }
        },
        "part4": {
            "monthly_program": {
                m: []
                for m in ["7월", "8월", "9월", "10월", "11월", "12월"]
            },
            "budget_table": [],
            "feedback_summary": [],
        },
    }

    for k, r in rules.get("part1", {}).items():
        if r.get("format") == "table":
            continue
        bc = int(r.get("bullet_count", 0) or 0)
        desc = r.get("description", k)
        if bc > 0:
            txt = "\n".join(
                [f"• {desc}를 바탕으로 핵심 상황을 정리한다." for _ in range(bc)])
        else:
            txt = f"{desc}를 바탕으로 현재 상황과 필요를 명확히 정리한다."
        sample["part1"][k] = txt

    sample["part1"]["feedback_table"] = [{
        "area":
        "운영",
        "problem":
        "• 참여 편차가 존재한다.\n• 기록이 분산된다.\n• 점검 시간이 부족하다.",
        "improvement":
        "• 운영 절차를 표준화한다.\n• 기록 양식을 통일한다.\n• 점검 일정을 고정한다.",
    }]
    sample["part1"]["total_review_table"] = [{
        "category":
        "총평",
        "content":
        "• 프로그램 흐름이 안정적이다.\n• 참여도가 향상된다.\n• 관리 체계 보완이 필요하다.",
    }]

    sample["part2"]["detail_table"] = {
        "학습지원": [{
            "sub_area": "기초",
            "program_name": "학습코칭",
            "expected_effect": "학습 습관 강화",
            "target": "아동",
            "count": "20회",
            "cycle": "주1회",
            "content": "• 수준별 활동을 진행한다.\n• 피드백을 제공한다.\n• 성취를 기록한다.",
        }]
    }
    sample["part2"]["eval_table"] = {
        "학습지원": [{
            "sub_area": "기초",
            "program_name": "학습코칭",
            "expected_effect": "• 출석률을 확인한다.\n• 만족도를 확인한다.",
            "main_plan": "월말 점검",
            "eval_method": "기록지",
        }]
    }

    for m in ["1월", "2월", "3월", "4월", "5월", "6월"]:
        sample["part3"]["monthly_program"][m] = [{
            "big_category":
            "학습",
            "mid_category":
            "기초",
            "program_name":
            "학습지원",
            "target":
            "아동",
            "staff":
            "생활지도사",
            "content":
            "• 목표를 점검한다.\n• 활동을 운영한다.",
        }]

    for m in ["7월", "8월", "9월", "10월", "11월", "12월"]:
        sample["part4"]["monthly_program"][m] = [{
            "big_category":
            "정서",
            "mid_category":
            "관계",
            "program_name":
            "정서지원",
            "target":
            "아동",
            "staff":
            "강사",
            "content":
            "• 감정 표현을 돕는다.\n• 관계 활동을 진행한다.",
        }]

    sample["part4"]["budget_table"] = [
        {
            "category": "강사비",
            "amount": "1,000,000",
            "details": "프로그램 운영 강사비"
        },
        {
            "category": "교재비",
            "amount": "300,000",
            "details": "활동 교재 및 소모품"
        },
    ]
    sample["part4"]["feedback_summary"] = [{
        "area": "운영",
        "problem": "기록 분산",
        "plan": "기록 양식 통일 및 점검 강화"
    }]

    sample = apply_guidelines_to_analysis(sample, rules)
    month_bucket = bucket_programs_by_month(sample)
    return sample, month_bucket
