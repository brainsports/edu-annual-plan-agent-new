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
    "need_1_user_desire": "이용아동의 욕구 및 문제점 분석 내용 (700~800자로 상세히 작성, 공백 제외 500자 이상 필수)",
    "need_2_1_regional": "지역적 특성 - 해당 지역의 인구통계, 경제적 특성, 행정구역 특성 등 (700~800자로 상세히 작성)",
    "need_2_2_environment": "주변환경 - 시설 주변의 교통, 접근성, 주거환경, 편의시설 등 (700~800자로 상세히 작성)",
    "need_2_3_educational": "교육적 특성 - 지역 내 학교, 교육기관, 학습환경 특성 등 (700~800자로 상세히 작성)",
    "feedback_table": [
      {"area": "보호", "problem": "• 문제점1 (약 80자 상세 서술)\\n• 문제점2 (약 80자 상세 서술)\\n• 문제점3 (약 80자 상세 서술)", "improvement": "• 개선방안1 (문제점1에 대응)\\n• 개선방안2 (문제점2에 대응)\\n• 개선방안3 (문제점3에 대응)"},
      {"area": "교육", "problem": "...", "improvement": "..."},
      {"area": "문화", "problem": "...", "improvement": "..."},
      {"area": "정서지원", "problem": "...", "improvement": "..."},
      {"area": "지역사회연계", "problem": "...", "improvement": "..."}
    ],
    "total_review_table": [
      {"category": "운영평가", "content": "운영 전반에 대한 상세 평가 (약 1000자 분량으로 상세히 작성)"},
      {"category": "아동평가", "content": "아동 관련 성과 및 평가 (약 1000자 분량으로 상세히 작성)"},
      {"category": "프로그램평가", "content": "프로그램 운영 평가 (약 1000자 분량으로 상세히 작성)"},
      {"category": "후원활동측면", "content": "후원 및 연계 활동 평가 (약 1000자 분량으로 상세히 작성)"},
      {"category": "환류방안", "content": "차년도 환류 방안 (약 1000자 분량으로 상세히 작성)"}
    ],
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
- **need_1_user_desire는 700~800자 분량(공백 제외 500자 이상)으로 이용아동의 욕구와 문제점을 상세히 분석하세요. 간략히 요약하지 말고 구체적인 예시와 근거를 들어 충분히 서술하세요.**
- **need_2_1_regional, need_2_2_environment, need_2_3_educational 각각 700~800자 분량으로 상세히 작성하세요. 간략히 요약하지 말고 구체적인 예시와 근거를 들어 충분히 서술하세요.**
- **feedback_table은 반드시 5개 영역(보호, 교육, 문화, 정서지원, 지역사회연계) 순서로 작성하세요.**
  - 각 영역당 문제점과 개선방안을 각각 3개씩 bullet point(•)로 구분하여 작성하세요.
  - 각 bullet point는 약 80자 분량으로 상세히 서술하세요.
  - 문제점의 1번 항목과 개선방안의 1번 항목이 서로 대응되어야 합니다 (1:1 매핑).
- **total_review_table은 반드시 5개 영역(운영평가, 아동평가, 프로그램평가, 후원활동측면, 환류방안) 순서로 작성하세요.**
  - 각 영역당 약 1000자 분량으로 매우 상세하게 서술하세요. 요약하지 말고 구체적인 내용과 수치를 포함하여 작성하세요.
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
                {"area": "보호", "problem": "• 저녁 돌봄 시간이 18시까지로 제한되어 맞벌이 가정의 퇴근 시간과 맞지 않아 돌봄 공백이 발생하고 있음\n• 돌봄 공간의 안전시설(CCTV, 안전문 등)이 노후화되어 정기적인 점검과 교체가 필요한 상황임\n• 아동 1인당 돌봄 인력 비율이 높아 개별 아동에 대한 세심한 관찰과 지도가 어려운 실정임", "improvement": "• 저녁 돌봄 시간을 20시까지 연장하고 야간 돌봄 인력을 추가 배치하여 맞벌이 가정 지원을 강화함\n• 2025년 상반기 중 노후 안전시설 전면 교체 및 월 1회 정기 안전점검 체계를 구축하여 시설 안전성을 확보함\n• 돌봄 인력 2명을 추가 채용하고 소그룹 돌봄 체계를 도입하여 아동별 맞춤 돌봄을 실현함"},
                {"area": "교육", "problem": "• 온라인 학습을 위한 디지털 기기(태블릿, 노트북)가 부족하여 아동들의 디지털 리터러시 교육에 제한이 있음\n• 학습 지도 프로그램이 주로 국어, 수학에 집중되어 있어 영어, 과학 등 다양한 교과 지원이 부족한 상황임\n• 학습 부진 아동을 위한 개별 맞춤형 지도 체계가 미흡하여 학습 격차 해소에 어려움이 있음", "improvement": "• 태블릿 20대를 추가 구입하고 스마트 학습 플랫폼을 도입하여 디지털 기반 학습 환경을 구축함\n• 영어 및 과학 분야 학습 지도사를 채용하고 교과별 특성화 프로그램을 개발하여 교육 영역을 다양화함\n• 학습 진단 도구를 도입하고 개별 학습 계획(ILP)을 수립하여 아동별 맞춤형 학습 지원 체계를 구축함"},
                {"area": "문화", "problem": "• 문화체험 프로그램이 연간 4회 수준으로 다른 시설 대비 부족하고 프로그램 종류도 제한적인 상황임\n• 예술(음악, 미술) 관련 전문 강사가 부재하여 양질의 예술 교육 프로그램 운영이 어려운 실정임\n• 지역 문화시설(박물관, 미술관, 도서관)과의 연계가 미흡하여 다양한 문화 경험 기회가 제한됨", "improvement": "• 월 1회 이상 문화체험 프로그램을 운영하고 연극, 영화, 전시 관람 등 다양한 장르로 확대함\n• 지역 예술 단체 및 전문 강사와 협약을 체결하여 주 2회 이상 정기 예술 교육을 실시함\n• 인근 박물관, 미술관, 도서관과 MOU를 체결하고 분기별 문화 연계 프로그램을 정례화함"},
                {"area": "정서지원", "problem": "• 개별 상담 시간이 아동 1인당 월 1회 30분으로 부족하여 깊이 있는 정서 지원에 한계가 있음\n• 위기 아동(학대, 방임, 가정 문제) 조기 발견 및 개입 체계가 미흡하여 적시 지원이 이루어지지 못함\n• 또래 관계 갈등이나 학교폭력 피해 아동을 위한 전문 프로그램이 부재한 상황임", "improvement": "• 전문 상담사를 1명 추가 배치하고 개별 상담 시간을 월 2회 50분으로 확대하여 상담 접근성을 강화함\n• 위기 아동 스크리닝 도구를 도입하고 아동보호전문기관과 핫라인을 구축하여 조기 개입 체계를 마련함\n• 또래 관계 향상 집단 프로그램을 개발하고 학교폭력 피해 아동을 위한 회복 프로그램을 도입함"},
                {"area": "지역사회연계", "problem": "• 자원봉사자 참여가 연간 50명 수준으로 저조하고 자원봉사 활동의 지속성이 낮아 안정적 운영이 어려움\n• 지역 내 기업, 단체와의 후원 및 협력 관계가 부족하여 프로그램 운영 재원 확보에 제한이 있음\n• 지역 유관기관(학교, 주민센터, 복지관)과의 정보 공유 및 협력 체계가 구축되지 않아 통합 지원에 한계가 있음", "improvement": "• 자원봉사 모집 홍보를 강화하고 정기 봉사단을 조직하여 연간 100명 이상의 봉사자 참여를 유도함\n• 지역 기업 CSR 담당자 네트워크를 구축하고 후원 협약을 체결하여 안정적인 후원 기반을 마련함\n• 지역 유관기관 실무자 협의체를 구성하고 분기별 사례회의를 개최하여 통합 지원 체계를 구축함"}
            ],
            "total_review_table": [
                {"category": "운영평가", "content": "2024년 연간 사업 운영은 전반적으로 목표 달성률 85%를 기록하며 성공적으로 수행되었습니다. 시설 이용률은 평균 92%를 유지하였으며, 월별 운영 현황을 분석한 결과 상반기 대비 하반기 이용률이 8% 증가하는 긍정적인 추세를 보였습니다. 인력 운영 측면에서는 돌봄 교사 4명, 학습지도사 2명, 상담사 1명 등 총 7명의 인력이 안정적으로 근무하였으며, 직원 이직률은 0%로 인력 안정성이 확보되었습니다. 예산 집행률은 98.5%로 계획된 예산을 효율적으로 사용하였으며, 특히 프로그램 운영비와 인건비 집행이 계획대로 이루어졌습니다. 시설 안전관리 측면에서는 월 1회 정기 안전점검을 실시하여 안전사고 발생 건수 0건을 기록하였습니다. 다만, 저녁 돌봄 시간 연장에 대한 요구가 높아 차년도 운영 시간 조정이 필요한 것으로 파악되었습니다. 행정 업무의 효율화를 위해 전자문서 시스템을 도입하여 업무 처리 시간이 30% 단축되는 성과를 거두었습니다."},
                {"category": "아동평가", "content": "2024년 이용 아동 수는 총 58명으로 전년 대비 15% 증가하였으며, 정원 대비 이용률 96.7%를 기록하였습니다. 아동 출석률은 평균 94.2%로 매우 높은 수준을 유지하였습니다. 아동 발달 평가 결과, 사회성 발달 영역에서 전년 대비 12% 향상된 결과를 보였으며, 특히 또래 관계 형성 및 협동심 영역에서 두드러진 성장이 관찰되었습니다. 학습 능력 측면에서는 이용 아동의 학업성취도가 평균 8% 향상되었으며, 특히 수학과 국어 영역에서 큰 폭의 성장을 보였습니다. 정서 발달 측면에서는 분기별 정서 평가 결과 전체 아동의 87%가 안정적인 정서 상태를 유지하고 있는 것으로 나타났습니다. 위기 아동 8명에 대해서는 개별 사례관리를 통해 5명이 안정화되는 성과를 거두었습니다. 아동 만족도 조사 결과 평균 4.3점(5점 만점)을 기록하였으며, 특히 급식과 간식에 대한 만족도가 4.6점으로 가장 높게 나타났습니다. 향후 개별 아동의 특성을 고려한 맞춤형 지원 강화가 필요합니다."},
                {"category": "프로그램평가", "content": "2024년 총 15개 프로그램을 운영하였으며, 프로그램별 참여율은 평균 89%를 기록하였습니다. 교육 프로그램(학습지도, 독서지도, 디지털교육)은 총 48회 운영되었으며, 참여 아동의 학습 능력 향상에 크게 기여하였습니다. 특히 디지털 리터러시 교육은 신규 도입된 프로그램으로 아동과 보호자 모두에게 높은 호응을 얻었습니다. 문화 프로그램(체험활동, 예술교육)은 연간 12회 운영되었으나, 다양성 측면에서 개선이 필요한 것으로 평가되었습니다. 정서지원 프로그램(개별상담, 집단상담, 또래활동)은 총 156회 운영되었으며, 참여 아동의 정서 안정에 긍정적인 효과를 보였습니다. 보호 프로그램(급식, 돌봄)은 연중 안정적으로 운영되어 이용 가정의 양육 부담 경감에 기여하였습니다. 프로그램 만족도 조사 결과, 교육 프로그램 4.4점, 정서지원 4.3점, 보호 4.5점, 문화 3.9점으로 나타나 문화 프로그램 강화가 필요한 것으로 분석되었습니다. 차년도에는 문화체험 프로그램을 월 1회 이상으로 확대 운영할 계획입니다."},
                {"category": "후원활동측면", "content": "2024년 후원금 모금액은 총 2,500만 원으로 전년 대비 20% 증가하였습니다. 정기후원자 수는 45명으로 10명이 신규 등록되었으며, 후원자 유지율은 92%를 기록하였습니다. 기업 후원은 지역 내 5개 기업과 협약을 체결하여 연간 1,000만 원 상당의 현금 및 현물 후원을 확보하였습니다. 후원금은 프로그램 운영비(40%), 아동 지원비(35%), 시설 운영비(25%)로 투명하게 집행되었으며, 분기별 후원금 사용 보고서를 후원자에게 발송하였습니다. 자원봉사자 참여는 연간 62명으로 목표(50명) 대비 124% 달성하였습니다. 봉사 분야는 학습지도(40%), 급식보조(30%), 프로그램 보조(30%)로 다양하게 참여하였습니다. 지역사회 연계 활동으로는 인근 초등학교 3개교와 협력하여 방과후 연계 프로그램을 운영하였으며, 주민센터, 도서관 등 5개 유관기관과 네트워크를 구축하였습니다. 차년도에는 기업 후원 확대 및 정기후원자 60명 확보를 목표로 후원 개발 활동을 강화할 계획입니다."},
                {"category": "환류방안", "content": "2024년 사업 평가 결과를 바탕으로 다음과 같은 환류 방안을 수립하였습니다. 첫째, 운영 시간 연장 요구에 대응하여 저녁 돌봄 시간을 18시에서 20시로 연장하고, 이를 위한 야간 돌봄 인력 1명을 추가 배치합니다. 둘째, 문화체험 프로그램 다양성 부족 문제 해결을 위해 월 1회 이상 외부 문화체험 활동을 실시하고, 지역 문화시설과 연계 협약을 체결합니다. 셋째, 개별 아동 맞춤형 지원 강화를 위해 학습 진단 도구를 도입하고 개별 학습 계획(ILP)을 수립하여 체계적인 학습 지원을 제공합니다. 넷째, 위기 아동 조기 발견 체계 구축을 위해 분기별 스크리닝을 실시하고 아동보호전문기관과 협력 체계를 강화합니다. 다섯째, 디지털 교육 환경 개선을 위해 태블릿 20대를 추가 확보하고 스마트 학습 플랫폼을 도입합니다. 여섯째, 후원 개발 활동 강화를 위해 기업 CSR 담당자 네트워크를 구축하고 정기후원자 60명 확보를 목표로 홍보 활동을 강화합니다. 이러한 환류 방안은 2025년 연간 사업계획에 반영하여 체계적으로 추진할 예정입니다."}
            ],
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
