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
**문체: 전문적이고 공식적인 행정 문서 스타일의 한국어를 사용하세요.**

필수 JSON 구조:
{
  "part1_general": {
    "need_1_user_desire": "이용아동의 욕구 및 문제점 분석 내용 (약 500자 분량으로 상세히 작성)",
    "need_2_1_regional": "지역적 특성 - 해당 지역의 인구통계, 경제적 특성, 행정구역 특성 등 (약 500자 분량)",
    "need_2_2_environment": "주변환경 - 시설 주변의 교통, 접근성, 주거환경, 편의시설 등 (약 500자 분량)",
    "need_2_3_educational": "교육적 특성 - 지역 내 학교, 교육기관, 학습환경 특성 등 (약 500자 분량)",
    "feedback_table": [
      {"area": "영역", "problem": "문제점", "improvement": "개선방안"}
    ],
    "total_review_text": "전년도 사업평가 총평 (한국어 문자열)",
    "satisfaction_stats": [
      {"category": "카테고리", "very_satisfied": 숫자, "satisfied": 숫자, "normal": 숫자, "dissatisfied": 숫자}
    ],
    "purpose_text": "사업목적 (한국어 문자열)",
    "goals_text": "사업목표 (한국어 문자열)"
  },
  "part2_programs": {
    "보호": {
      "detail_table": [
        {"sub_area": "세부영역", "program_name": "프로그램명", "target": "대상", "count": "인원", "cycle": "주기", "content": "계획내용"}
      ],
      "eval_table": [
        {"program_name": "프로그램명", "eval_tool": "평가도구", "eval_method": "평가방법", "eval_timing": "평가시기"}
      ]
    },
    "교육": {
      "detail_table": [],
      "eval_table": []
    },
    "문화": {
      "detail_table": [],
      "eval_table": []
    },
    "정서지원": {
      "detail_table": [],
      "eval_table": []
    },
    "지역사회연계": {
      "detail_table": [],
      "eval_table": []
    }
  },
  "part3_monthly_1h": [
    {"month": "1월", "activity": "주요 행사 및 활동", "safety": "안전교육", "note": "비고"}
  ],
  "part4_monthly_2h": [
    {"month": "7월", "activity": "주요 행사 및 활동", "safety": "안전교육", "note": "비고"}
  ]
}

중요 사항:
- **모든 텍스트 값은 반드시 한국어(한글)로 작성하세요.**
- **문체는 전문적이고 공식적인 행정 문서 스타일을 사용하세요.**
- JSON 키(key)는 영어로 유지하되, 값(value)은 모두 한국어로 작성하세요.
- satisfaction_stats의 숫자 필드는 반드시 정수여야 합니다.
- 문서에 정보가 없는 경우 적절한 한국어 기본값을 사용하세요.
- **need_1_user_desire는 약 500자 분량으로 이용아동의 욕구와 문제점을 상세히 분석하세요.**
- **need_2_1_regional, need_2_2_environment, need_2_3_educational 각각 약 500자 분량으로 상세히 작성하세요.**
- part2_programs는 5개 카테고리(보호, 교육, 문화, 정서지원, 지역사회연계)별로 구분하여 작성하세요.
- part3_monthly_1h는 상반기(1월~6월), part4_monthly_2h는 하반기(7월~12월) 계획입니다.
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
        "part1_general": {
            "need_1_user_desire": "이용아동들은 안정적인 돌봄 환경과 다양한 교육 기회를 원하고 있습니다. 특히 방과후 시간대의 체계적인 프로그램과 정서적 지원에 대한 욕구가 높게 나타났습니다. 학업 지원과 함께 또래 관계 형성, 자기표현 능력 향상에 대한 요구도 확인되었습니다. 최근 실시한 이용아동 대상 욕구조사 결과, 전체 응답자의 78%가 다양한 체험활동 프로그램 확대를 희망하였으며, 65%의 아동이 개별 맞춤형 학습지원 서비스를 필요로 하는 것으로 나타났습니다. 또한 정서적 어려움을 호소하는 아동 비율이 전년 대비 12% 증가하여 전문적인 심리상담 서비스에 대한 수요가 증대되고 있습니다. 코로나19 이후 사회성 발달 지연 문제가 대두되면서 또래관계 형성 프로그램에 대한 요구도 높아지고 있는 실정입니다.",
            "need_2_1_regional": "본 시설이 위치한 지역은 수도권 외곽의 신도시로서 최근 10년간 급격한 인구 증가를 경험하였습니다. 총 인구 약 35만 명 중 0-18세 아동·청소년 인구가 약 7만 명으로 전체의 20%를 차지하고 있습니다. 지역 내 맞벌이 가정 비율이 68%에 달하며, 한부모 가정도 전국 평균 대비 1.5배 높은 수준입니다. 경제활동인구의 대부분이 서울 및 인근 대도시로 출퇴근하는 베드타운 성격이 강하여, 아동 돌봄 공백 문제가 심각한 지역적 특성을 보이고 있습니다. 지역 내 제조업 및 서비스업 종사자 비율이 높으며, 평균 가구소득은 전국 중위소득의 95% 수준입니다.",
            "need_2_2_environment": "시설 반경 1km 이내에 초등학교 3개교, 중학교 2개교가 위치하여 이용 아동의 접근성이 매우 양호합니다. 대중교통 인프라가 잘 구축되어 있어 버스 정류장이 도보 5분 거리에 있으며, 지하철역도 10분 거리에 위치하고 있습니다. 주변에 대형마트, 병원, 공원 등 생활편의시설이 충분히 갖추어져 있어 다양한 체험활동 연계가 용이합니다. 다만, 시설 주변 도로의 교통량이 많아 아동 안전에 대한 각별한 주의가 필요하며, 통학 시간대 교통안전지도 강화가 요구됩니다. 주거 형태는 아파트 단지가 85%를 차지하며, 소규모 주택 밀집 지역도 일부 존재합니다.",
            "need_2_3_educational": "지역 내 교육열이 높아 사교육 참여율이 전국 평균 대비 15% 높은 수준입니다. 그러나 저소득층 가정의 경우 사교육비 부담으로 인한 교육 격차 문제가 발생하고 있습니다. 지역 교육지원청에서 운영하는 방과후학교 프로그램이 다양하게 운영되고 있으나, 수요 대비 공급이 부족한 실정입니다. 인근에 도서관 2개소, 청소년수련관 1개소가 위치하여 교육 연계 자원이 풍부합니다. 최근 지역 내 다문화 가정이 증가하면서 한국어 교육 및 문화 적응 프로그램에 대한 수요도 늘어나고 있습니다. 또한 특수교육 대상 아동을 위한 전문 교육 서비스가 부족하여 통합교육 환경 조성이 필요한 상황입니다.",
            "feedback_table": [
                {"area": "교육", "problem": "온라인 학습 환경 미비", "improvement": "디지털 기기 확충 및 온라인 학습 플랫폼 도입"},
                {"area": "보호", "problem": "저녁 돌봄 시간 부족", "improvement": "운영 시간 연장 검토"},
                {"area": "문화", "problem": "문화체험 프로그램 다양성 부족", "improvement": "지역 문화시설 연계 확대"},
                {"area": "정서지원", "problem": "개별 상담 시간 부족", "improvement": "전문 상담사 배치 확대"},
                {"area": "지역사회연계", "problem": "자원봉사자 참여 저조", "improvement": "자원봉사 홍보 강화"}
            ],
            "total_review_text": "2024년 연간 사업은 전반적으로 목표 달성률 85%를 기록하며 성공적으로 수행되었습니다. 참여 아동 수가 전년 대비 15% 증가하였으며, 만족도 조사 결과 평균 4.2점(5점 만점)을 기록하였습니다. 특히 교육 프로그램과 정서지원 서비스에서 높은 만족도를 보였으나, 문화체험 프로그램의 다양화가 필요한 것으로 파악되었습니다.",
            "satisfaction_stats": [
                {"category": "교육 프로그램", "very_satisfied": 45, "satisfied": 30, "normal": 15, "dissatisfied": 10},
                {"category": "돌봄 서비스", "very_satisfied": 50, "satisfied": 28, "normal": 17, "dissatisfied": 5},
                {"category": "문화 활동", "very_satisfied": 35, "satisfied": 32, "normal": 23, "dissatisfied": 10},
                {"category": "정서지원", "very_satisfied": 48, "satisfied": 30, "normal": 15, "dissatisfied": 7},
                {"category": "급식/간식", "very_satisfied": 55, "satisfied": 25, "normal": 15, "dissatisfied": 5}
            ],
            "purpose_text": "지역 내 돌봄이 필요한 아동에게 안전하고 건강한 방과후 환경을 제공하고, 체계적인 교육 및 정서지원 프로그램을 통해 아동의 전인적 성장을 지원합니다. 가정과 학교, 지역사회를 연계하여 아동 복지 향상에 기여합니다.",
            "goals_text": "1. 아동 돌봄 서비스 이용률 90% 이상 달성\n2. 프로그램 참여 아동 학업성취도 10% 향상\n3. 이용 가정 만족도 4.5점 이상 달성\n4. 지역사회 연계 프로그램 10개 이상 운영\n5. 정서지원 프로그램 참여율 80% 이상"
        },
        "part2_programs": {
            "보호": {
                "detail_table": [
                    {"sub_area": "기본돌봄", "program_name": "방과후 돌봄", "target": "초등학생", "count": "30명", "cycle": "주 5회", "content": "숙제지도, 간식 제공, 안전한 돌봄 환경 제공"},
                    {"sub_area": "급식지원", "program_name": "건강 급식", "target": "전체 아동", "count": "50명", "cycle": "주 5회", "content": "균형 잡힌 영양 급식 제공"}
                ],
                "eval_table": [
                    {"program_name": "방과후 돌봄", "eval_tool": "출석부/만족도 조사", "eval_method": "월별 출석률 및 분기별 설문조사", "eval_timing": "월말/분기말"},
                    {"program_name": "건강 급식", "eval_tool": "급식일지/만족도 조사", "eval_method": "일일 급식 기록 및 분기별 설문", "eval_timing": "매일/분기말"}
                ]
            },
            "교육": {
                "detail_table": [
                    {"sub_area": "학습지원", "program_name": "기초학력 향상", "target": "초등 3-6학년", "count": "20명", "cycle": "주 3회", "content": "국어, 수학 기초학력 보충 지도"},
                    {"sub_area": "특기적성", "program_name": "코딩 교실", "target": "초등 4-6학년", "count": "15명", "cycle": "주 1회", "content": "스크래치, 엔트리를 활용한 코딩 교육"},
                    {"sub_area": "독서교육", "program_name": "독서클럽", "target": "전체 아동", "count": "25명", "cycle": "주 1회", "content": "함께 읽기, 독후감 작성, 토론 활동"}
                ],
                "eval_table": [
                    {"program_name": "기초학력 향상", "eval_tool": "학력평가지", "eval_method": "사전/사후 학력 평가 비교", "eval_timing": "학기초/학기말"},
                    {"program_name": "코딩 교실", "eval_tool": "포트폴리오", "eval_method": "작품 발표회 및 완성도 평가", "eval_timing": "학기말"},
                    {"program_name": "독서클럽", "eval_tool": "독서기록장", "eval_method": "독서량 및 독후활동 참여율", "eval_timing": "월말"}
                ]
            },
            "문화": {
                "detail_table": [
                    {"sub_area": "문화체험", "program_name": "박물관 탐방", "target": "전체 아동", "count": "40명", "cycle": "분기 1회", "content": "지역 박물관 및 미술관 견학"},
                    {"sub_area": "예술활동", "program_name": "미술 교실", "target": "초등학생", "count": "20명", "cycle": "주 1회", "content": "다양한 미술 기법 체험 및 작품 활동"}
                ],
                "eval_table": [
                    {"program_name": "박물관 탐방", "eval_tool": "체험보고서", "eval_method": "참여 소감문 및 만족도 조사", "eval_timing": "체험 후"},
                    {"program_name": "미술 교실", "eval_tool": "작품집", "eval_method": "작품 전시회 및 평가", "eval_timing": "학기말"}
                ]
            },
            "정서지원": {
                "detail_table": [
                    {"sub_area": "개별상담", "program_name": "마음 톡톡", "target": "전체 아동", "count": "50명", "cycle": "수시", "content": "개별 심리상담 및 정서지원"},
                    {"sub_area": "집단활동", "program_name": "사회성 향상", "target": "초등학생", "count": "20명", "cycle": "주 1회", "content": "또래관계 향상 집단 프로그램"}
                ],
                "eval_table": [
                    {"program_name": "마음 톡톡", "eval_tool": "상담일지", "eval_method": "상담 횟수 및 변화 관찰", "eval_timing": "월말"},
                    {"program_name": "사회성 향상", "eval_tool": "사회성 검사", "eval_method": "사전/사후 검사 비교", "eval_timing": "프로그램 전후"}
                ]
            },
            "지역사회연계": {
                "detail_table": [
                    {"sub_area": "자원연계", "program_name": "멘토링", "target": "전체 아동", "count": "30명", "cycle": "월 2회", "content": "대학생 자원봉사자 1:1 멘토링"},
                    {"sub_area": "지역참여", "program_name": "마을축제 참여", "target": "전체 아동", "count": "50명", "cycle": "연 2회", "content": "지역 축제 및 행사 참여"}
                ],
                "eval_table": [
                    {"program_name": "멘토링", "eval_tool": "활동일지", "eval_method": "멘토-멘티 만족도 조사", "eval_timing": "분기말"},
                    {"program_name": "마을축제 참여", "eval_tool": "참여보고서", "eval_method": "참여율 및 만족도 조사", "eval_timing": "행사 후"}
                ]
            }
        },
        "part3_monthly_1h": [
            {"month": "1월", "activity": "신년맞이 행사, 겨울방학 특별 프로그램", "safety": "동계 안전교육(빙판길, 난방기구)", "note": "방학 중 운영시간 조정"},
            {"month": "2월", "activity": "설날 전통문화 체험, 학년말 정리", "safety": "화재 예방 교육", "note": "새학기 준비"},
            {"month": "3월", "activity": "새학기 적응 프로그램, 오리엔테이션", "safety": "교통 안전 교육", "note": "신규 아동 적응 지원"},
            {"month": "4월", "activity": "봄맞이 환경정화, 식목일 행사", "safety": "야외활동 안전교육", "note": "환경 교육 연계"},
            {"month": "5월", "activity": "어린이날 행사, 가정의 달 프로그램", "safety": "놀이 안전 교육", "note": "가족 참여 행사"},
            {"month": "6월", "activity": "상반기 평가, 여름 프로그램 준비", "safety": "폭염 대비 교육", "note": "상반기 성과 점검"}
        ],
        "part4_monthly_2h": [
            {"month": "7월", "activity": "여름방학 특별 프로그램, 물놀이", "safety": "수상 안전 교육", "note": "방학 중 운영시간 조정"},
            {"month": "8월", "activity": "여름 캠프, 자연체험 활동", "safety": "폭염/식중독 예방 교육", "note": "외부 활동 확대"},
            {"month": "9월", "activity": "추석 전통문화 체험, 2학기 시작", "safety": "교통 안전 교육", "note": "명절 프로그램"},
            {"month": "10월", "activity": "가을 소풍, 독서의 달 행사", "safety": "야외활동 안전교육", "note": "문화체험 연계"},
            {"month": "11월", "activity": "지역축제 참여, 연말 준비", "safety": "화재 예방 교육", "note": "지역사회 연계"},
            {"month": "12월", "activity": "송년행사, 연간 성과발표회", "safety": "동계 안전교육", "note": "연간 평가 및 시상"}
        ]
    }
