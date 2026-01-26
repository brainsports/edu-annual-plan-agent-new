import os
import json
import re
import io
import streamlit as st
import google.generativeai as genai


def read_pdf(file) -> str:
    """Extract text from PDF file using pdfplumber."""
    try:
        import pdfplumber
        text_content = []
        with pdfplumber.open(file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text)
        return "\n".join(text_content)
    except Exception as e:
        st.error(f"PDF 파일 읽기 오류: {str(e)}")
        return ""


def read_docx(file) -> str:
    """Extract text from DOCX file."""
    try:
        from docx import Document
        doc = Document(file)
        text_content = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_content.append(paragraph.text)
        for table in doc.tables:
            for row in table.rows:
                row_text = [cell.text.strip() for cell in row.cells]
                text_content.append(" | ".join(row_text))
        return "\n".join(text_content)
    except Exception as e:
        st.error(f"DOCX 파일 읽기 오류: {str(e)}")
        return ""


def read_uploaded_file(uploaded_file) -> str:
    """Read content from various file types."""
    file_type = uploaded_file.name.split('.')[-1].lower()
    
    if file_type == 'pdf':
        return read_pdf(uploaded_file)
    elif file_type == 'docx':
        return read_docx(uploaded_file)
    elif file_type in ['txt', 'csv']:
        return uploaded_file.read().decode('utf-8')
    elif file_type == 'hwp':
        st.warning("HWP 파일은 현재 텍스트 추출이 제한됩니다. 가능하면 PDF나 DOCX로 변환해주세요.")
        return ""
    else:
        st.error(f"지원하지 않는 파일 형식입니다: {file_type}")
        return ""


def process_multiple_files(uploaded_files: list) -> str:
    """Process multiple uploaded files and combine their text content."""
    all_text = ""
    
    for uploaded_file in uploaded_files:
        file_text = read_uploaded_file(uploaded_file)
        if file_text:
            all_text += f"\n--- {uploaded_file.name} 시작 ---\n"
            all_text += file_text
            all_text += f"\n--- {uploaded_file.name} 끝 ---\n"
        uploaded_file.seek(0)
    
    return all_text.strip()


def get_api_key():
    """Get Gemini API key from environment variables."""
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        st.error("GEMINI_API_KEY가 설정되지 않았습니다. Replit Secrets에서 GEMINI_API_KEY를 추가해주세요.")
        return None
    return api_key


def parse_json_response(response_text: str) -> dict:
    """Parse JSON from Gemini response, removing markdown code blocks if present."""
    cleaned_text = response_text.strip()
    
    json_pattern = r'```(?:json)?\s*([\s\S]*?)```'
    match = re.search(json_pattern, cleaned_text)
    if match:
        cleaned_text = match.group(1).strip()
    
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError as e:
        st.error(f"JSON 파싱 오류: {str(e)}")
        return None


def get_gemini_analysis(text: str) -> dict:
    """Analyze text using Gemini and return structured JSON data."""
    api_key = get_api_key()
    if not api_key:
        return None
    
    genai.configure(api_key=api_key)
    
    system_instruction = """당신은 연간 사업 평가 문서를 분석하는 전문가입니다.
주어진 문서를 분석하여 반드시 아래의 정확한 JSON 구조로 응답해주세요.
다른 텍스트 없이 오직 JSON만 반환하세요.

**중요: 모든 내용, 요약, 테이블 값은 반드시 한국어(한글)로 작성해야 합니다.**

필수 JSON 구조:
{
  "part1": {
    "total_review": "성과 요약 (한국어 문자열)",
    "future_plan": "내년 계획 (한국어 문자열)",
    "feedback_table": [
      {"area": "영역 (한국어)", "problem": "문제점 (한국어)", "improvement": "개선방안 (한국어)"}
    ],
    "satisfaction_stats": [
      {"category": "카테고리 (한국어)", "very_satisfied": 숫자, "satisfied": 숫자, "normal": 숫자, "dissatisfied": 숫자}
    ]
  },
  "part2_programs": [
    {"sub_area": "세부영역 (한국어)", "program_name": "프로그램명 (한국어)", "expected_effect": "기대효과 (한국어)", "target_children": "대상아동 (한국어)", "planned_count": "계획인원 (한국어)", "cycle": "주기 (한국어)", "planned_content": "계획내용 (한국어)"}
  ],
  "part3_monthly": [
    {"month": "월 (한국어, 예: 1월)", "main_events": "주요 행사 및 활동 (한국어)", "safety_education": "안전교육 (한국어)", "note": "비고 (한국어)"}
  ],
  "part4_monthly": [
    {"month": "월 (한국어, 예: 7월)", "main_events": "주요 행사 및 활동 (한국어)", "safety_education": "안전교육 (한국어)", "note": "비고 (한국어)"}
  ]
}

중요 사항:
- **모든 텍스트 값은 반드시 한국어(한글)로 작성하세요.**
- JSON 키(key)는 영어로 유지하되, 값(value)은 모두 한국어로 작성하세요.
- satisfaction_stats의 숫자 필드는 반드시 정수여야 합니다.
- 문서에 정보가 없는 경우 적절한 한국어 기본값을 사용하세요.
- part3_monthly는 상반기(1월~6월), part4_monthly는 하반기(7월~12월) 계획입니다.
"""

    model = genai.GenerativeModel(
        model_name="gemini-1.5-pro",
        system_instruction=system_instruction
    )
    
    try:
        response = model.generate_content(
            f"다음 문서를 분석하고 지정된 JSON 형식으로 결과를 반환해주세요:\n\n{text}"
        )
        
        if response.text:
            return parse_json_response(response.text)
        else:
            st.error("Gemini로부터 응답을 받지 못했습니다.")
            return None
            
    except Exception as e:
        st.error(f"Gemini API 오류: {str(e)}")
        return None


def get_default_data() -> dict:
    """Return default data structure for testing without API."""
    return {
        "part1": {
            "total_review": "2024년 연간 사업 성과를 요약합니다. 주요 목표 달성률 85%를 기록하였으며, 참여자 만족도가 전년 대비 10% 상승하였습니다.",
            "future_plan": "2025년에는 프로그램 다양화와 참여자 확대를 목표로 합니다. 디지털 전환을 통한 서비스 접근성 향상에 주력할 예정입니다.",
            "feedback_table": [
                {"area": "교육", "problem": "온라인 접근성 부족", "improvement": "하이브리드 교육 시스템 도입"},
                {"area": "복지", "problem": "수요 대비 공급 부족", "improvement": "예산 확대 및 파트너십 강화"},
                {"area": "문화", "problem": "참여율 저조", "improvement": "홍보 강화 및 프로그램 다양화"}
            ],
            "satisfaction_stats": [
                {"category": "교육 프로그램", "very_satisfied": 45, "satisfied": 30, "normal": 15, "dissatisfied": 10},
                {"category": "복지 서비스", "very_satisfied": 40, "satisfied": 35, "normal": 18, "dissatisfied": 7},
                {"category": "문화 활동", "very_satisfied": 50, "satisfied": 28, "normal": 17, "dissatisfied": 5}
            ]
        },
        "part2_programs": [
            {"sub_area": "교육", "program_name": "디지털 리터러시", "expected_effect": "디지털 역량 강화", "target_children": "초등학생", "planned_count": "50명", "cycle": "주 1회", "planned_content": "컴퓨터 기초 및 인터넷 활용"},
            {"sub_area": "복지", "program_name": "건강 증진", "expected_effect": "건강 관리 능력 향상", "target_children": "유아", "planned_count": "30명", "cycle": "월 2회", "planned_content": "운동 및 건강 교육"},
            {"sub_area": "문화", "program_name": "문화 체험", "expected_effect": "문화 향유 기회 확대", "target_children": "전 연령", "planned_count": "100명", "cycle": "분기별", "planned_content": "공연 관람 및 체험 활동"}
        ],
        "part3_monthly": [
            {"month": "1월", "main_events": "신년 행사", "safety_education": "방역 수칙 준수", "note": "온라인 병행"},
            {"month": "2월", "main_events": "설날 프로그램", "safety_education": "화재 예방", "note": "전통 문화 체험"},
            {"month": "3월", "main_events": "봄맞이 행사", "safety_education": "야외 안전", "note": "환경 정화"},
            {"month": "4월", "main_events": "건강 캠페인", "safety_education": "응급 처치 교육", "note": "건강 검진 연계"},
            {"month": "5월", "main_events": "가정의 달 행사", "safety_education": "교통 안전", "note": "가족 프로그램"},
            {"month": "6월", "main_events": "상반기 평가", "safety_education": "시설 점검", "note": "성과 분석"}
        ],
        "part4_monthly": [
            {"month": "7월", "main_events": "여름 프로그램", "safety_education": "폭염 대비", "note": "냉방 시설 점검"},
            {"month": "8월", "main_events": "여름 캠프", "safety_education": "수상 안전", "note": "청소년 대상"},
            {"month": "9월", "main_events": "추석 행사", "safety_education": "식품 안전", "note": "전통 음식 체험"},
            {"month": "10월", "main_events": "가을 축제", "safety_education": "행사장 안전", "note": "지역 축제 연계"},
            {"month": "11월", "main_events": "연말 준비", "safety_education": "난방 안전", "note": "결산 준비"},
            {"month": "12월", "main_events": "송년 행사", "safety_education": "화재 예방", "note": "연간 평가"}
        ]
    }
