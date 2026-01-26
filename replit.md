# AI 연간 사업계획 통합 에이전트 (Annual Business Plan Integration Agent)

## Overview

This is a Streamlit web application that uses Google Gemini 1.5 Pro AI to analyze uploaded program evaluation documents and generate structured Word (.docx) reports. The application is designed for Korean-language business planning reports, supporting multiple file uploads (PDF, DOCX, TXT, CSV), AI-powered analysis, and automated report generation.

**App Name**: AI 연간 사업계획 통합 에이전트
**Branding**: 정보광장

The core workflow is:
1. User uploads multiple evaluation documents (PDF, DOCX, TXT, CSV)
2. Gemini AI analyzes the combined content and extracts structured data
3. Application displays granular editing UI with Expanders and Radio buttons
4. User can edit each section independently
5. Application generates formatted Word reports with tables and charts

## User Preferences

Preferred communication style: Simple, everyday language (Korean)

## System Architecture

### Frontend Architecture
- **Framework**: Streamlit for rapid web UI development
- **Layout**: Wide layout with sidebar for file uploads and main area for results
- **UI Components**:
  - **Tab 1 (PART 1)**: Expanders for granular section editing
    - 1. 사업의 필요성 (이용아동 욕구, 지역 환경적 특성)
    - 2. 전년도 사업평가 및 환류계획 (환류 테이블, 총평)
    - 3. 만족도조사 (차트 + 데이터 테이블)
    - 4. 사업목적
    - 5. 사업목표
  - **Tab 2 (PART 2)**: Radio buttons for 5 categories (보호, 교육, 문화, 정서지원, 지역사회연계)
    - Each category has: 세부사업내용 table + 평가계획 table
  - **Tab 3 (PART 3)**: 상반기 월별 계획 (1월~6월)
  - **Tab 4 (PART 4)**: 하반기 월별 계획 (7월~12월)
- **State Management**: Uses `st.session_state` for persisting analysis data between interactions
- **Localization**: Korean language UI with appropriate font handling (NanumGothic, DejaVu Sans fallback)

### Data Schema (JSON)

```json
{
  "part1_general": {
    "need_1_user_desire": "String",
    "need_2_local_env": "String",
    "feedback_table": [{"area": "String", "problem": "String", "improvement": "String"}],
    "total_review_text": "String",
    "satisfaction_stats": [{"category": "String", "very_satisfied": Int, "satisfied": Int, "normal": Int, "dissatisfied": Int}],
    "purpose_text": "String",
    "goals_text": "String"
  },
  "part2_programs": {
    "보호": {"detail_table": [...], "eval_table": [...]},
    "교육": {"detail_table": [...], "eval_table": [...]},
    "문화": {"detail_table": [...], "eval_table": [...]},
    "정서지원": {"detail_table": [...], "eval_table": [...]},
    "지역사회연계": {"detail_table": [...], "eval_table": [...]}
  },
  "part3_monthly_1h": [{"month": "String", "activity": "String", "safety": "String", "note": "String"}],
  "part4_monthly_2h": [{"month": "String", "activity": "String", "safety": "String", "note": "String"}]
}
```

### Backend Architecture
- **Modular Design**: Separated into three main modules:
  - `main.py`: Application entry point and UI logic
  - `utils.py`: AI integration and API utilities (file reading, Gemini API)
  - `doc_utils.py`: Word document generation utilities
- **AI Integration**: Google Gemini API for document analysis with structured JSON output
- **Document Generation**: python-docx library for creating Word documents with formatted tables
- **File Support**: PDF (pdfplumber), DOCX (python-docx), TXT, CSV

### Data Flow Pattern
1. Multiple file upload → combined text extraction
2. Text → Gemini API → structured JSON response
3. JSON parsing with markdown code block removal
4. JSON data → Editable UI with Expanders/Radio buttons/Tables
5. Edited data → Word document with tables and formatting

### Error Handling Strategy
- API key validation with user-friendly error messages
- JSON parsing with try-except blocks and markdown cleanup
- Graceful font fallback for cross-platform compatibility
- Defensive data initialization for missing sections

### Chart Generation
- Matplotlib with Korean font configuration
- Unicode minus sign handling for proper character display
- Satisfaction pie chart integration in reports

## External Dependencies

### Third-Party Services
- **Google Gemini API**: Primary AI service for document analysis
  - Requires `GEMINI_API_KEY` environment variable (set in Replit Secrets)
  - Uses structured JSON output format with specific schema enforcement

### Python Libraries
- `streamlit`: Web application framework
- `google-generativeai`: Gemini API client
- `pandas`: Data manipulation for tables
- `matplotlib`: Chart generation
- `python-docx`: Word document creation
- `pdfplumber`: PDF text extraction
- `openpyxl`: Excel file support (for pandas)

### Deployment Configuration
- Target platform: Cloud Run (via Dockerfile)
- Korean font support: `fonts-nanum` system package
- Port: 5000 for Replit, 8080 for containerized deployment

### Environment Variables Required
- `GEMINI_API_KEY`: Google Gemini API authentication key (required)

## Recent Changes

- **2025-01-26**: Major refactoring to implement granular editing UI
  - New JSON schema with detailed fields for each section
  - Expanders in PART 1 for section-by-section editing
  - Radio buttons in PART 2 for category selection
  - Updated Word generation to match new schema
  - Defensive initialization for missing data sections
