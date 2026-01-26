import os
import json
import re
import streamlit as st
import google.generativeai as genai


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

필수 JSON 구조:
{
  "part1": {
    "total_review": "성과 요약 (문자열)",
    "future_plan": "내년 계획 (문자열)",
    "feedback_table": [
      {"area": "영역", "problem": "문제점", "improvement": "개선방안"}
    ],
    "satisfaction_stats": [
      {"category": "카테고리", "very_satisfied": 숫자, "satisfied": 숫자, "normal": 숫자, "dissatisfied": 숫자}
    ]
  },
  "part2_programs": [
    {"area": "영역", "program_name": "프로그램명", "effect": "효과", "target": "대상", "count": "인원", "cycle": "주기", "content": "내용"}
  ],
  "part3_monthly": [
    {"month": "월", "activity": "활동", "safety": "안전", "note": "비고"}
  ],
  "part4_monthly": [
    {"month": "월", "activity": "활동", "safety": "안전", "note": "비고"}
  ]
}

중요:
- satisfaction_stats의 숫자 필드는 반드시 정수여야 합니다.
- 문서에 정보가 없는 경우 적절한 기본값을 사용하세요.
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
            {"area": "교육", "program_name": "디지털 리터러시", "effect": "디지털 역량 강화", "target": "성인", "count": "50명", "cycle": "주 1회", "content": "컴퓨터 기초 및 인터넷 활용"},
            {"area": "복지", "program_name": "건강 증진", "effect": "건강 관리 능력 향상", "target": "노인", "count": "30명", "cycle": "월 2회", "content": "운동 및 건강 교육"},
            {"area": "문화", "program_name": "문화 체험", "effect": "문화 향유 기회 확대", "target": "전 연령", "count": "100명", "cycle": "분기별", "content": "공연 관람 및 체험 활동"}
        ],
        "part3_monthly": [
            {"month": "1월", "activity": "신년 행사", "safety": "방역 수칙 준수", "note": "온라인 병행"},
            {"month": "2월", "activity": "설날 프로그램", "safety": "화재 예방", "note": "전통 문화 체험"},
            {"month": "3월", "activity": "봄맞이 행사", "safety": "야외 안전", "note": "환경 정화"},
            {"month": "4월", "activity": "건강 캠페인", "safety": "응급 처치 교육", "note": "건강 검진 연계"},
            {"month": "5월", "activity": "가정의 달 행사", "safety": "교통 안전", "note": "가족 프로그램"},
            {"month": "6월", "activity": "상반기 평가", "safety": "시설 점검", "note": "성과 분석"}
        ],
        "part4_monthly": [
            {"month": "7월", "activity": "여름 프로그램", "safety": "폭염 대비", "note": "냉방 시설 점검"},
            {"month": "8월", "activity": "여름 캠프", "safety": "수상 안전", "note": "청소년 대상"},
            {"month": "9월", "activity": "추석 행사", "safety": "식품 안전", "note": "전통 음식 체험"},
            {"month": "10월", "activity": "가을 축제", "safety": "행사장 안전", "note": "지역 축제 연계"},
            {"month": "11월", "activity": "연말 준비", "safety": "난방 안전", "note": "결산 준비"},
            {"month": "12월", "activity": "송년 행사", "safety": "화재 예방", "note": "연간 평가"}
        ]
    }
