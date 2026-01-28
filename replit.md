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
  - **Tab 3 (PART 3)**: 월별 사업계획 (1월~12월)
    - Period sub-tabs: 상반기 (1월~6월), 하반기 (7월~12월)
    - Month radio selectors for program editing
    - 6-column program table: 대분류, 중분류, 프로그램명, 참여자, 수행인력, 사업내용
    - Intelligent date distribution from program frequency (연중, 여름방학, 분기, etc.)
  - **Tab 4 (PART 4)**: 예산 및 평가
    - 예산계획 expander with budget table (항목, 금액, 세부내용)
    - 평가 및 환류 요약 expander with feedback summary (영역, 문제점, 개선계획)
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
    "보호": {
      "subcategories": ["생활", "안전", "가족기능강화"],
      "detail_table": [{"sub_area": "생활", "program_name": "위생관리", "expected_effect": "기대효과", "target": "대상", "count": "인원", "cycle": "주기", "content": "● **세부내용**: 상세설명"}],
      "eval_table": [{"program_name": "프로그램명", "eval_tool": "평가도구", "eval_method": "평가방법", "eval_timing": "평가시기"}]
    },
    "교육": {"subcategories": ["성장과권리", "학습", "특기적성"], "detail_table": [...], "eval_table": [...]},
    "문화": {"subcategories": ["체험활동"], "detail_table": [...], "eval_table": [...]},
    "정서지원": {"subcategories": ["상담"], "detail_table": [...], "eval_table": [...]},
    "지역사회연계": {"subcategories": ["연계"], "detail_table": [...], "eval_table": [...]}
  },
  "part3_monthly_plan": {
    "1월": [{"big_category": "대분류", "mid_category": "중분류", "program_name": "프로그램명", "target": "참여자", "staff": "수행인력", "content": "● **사업내용**: ..."}],
    "2월": [...],
    ...
    "12월": [...]
  },
  "part4_budget_evaluation": {
    "budget_table": [{"category": "항목", "amount": "금액", "details": "세부내용"}],
    "feedback_summary": [{"area": "영역", "problem": "문제점", "plan": "개선계획"}]
  }
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

- **2026-01-28**: Table Cell & Satisfaction Section min_chars Enforcement
  - guidelines_template.json에 표 컬럼 min_chars_no_space 추가:
    - feedback_table.problem/improvement: min=300, max=500, bullet=3
    - total_review_table.content: min=200, max=600, bullet=3
    - part2.detail_table.content: min=150, max=350, bullet=3
  - 만족도 섹션 규칙 추가 (part1.satisfaction):
    - subjective_summary: min=500, max=800, bullet=5
    - overall_suggestion: min=500, max=800, bullet=5
  - _apply_table_rule 순서 수정: bullet→min pad→max truncate→bullet 재적용
  - apply_guidelines_to_analysis에 satisfaction 처리 추가
  - 디버그 UI 기본 숨김 처리 (expanded=False)

- **2026-01-28**: Comprehensive Guideline Rules Enforcement System (min/max 100% 보장)
  - **PADDING_PHRASES**: 8개의 한국어 보강 문구로 LLM 호출 없이 결정적 패딩
  - **Helper functions for text formatting:**
    - `_is_bullet_format()`: Checks if text uses bullet format
    - `_ensure_bullet_prefix()`: Forces all lines to start with "• "
    - `_ensure_bullet_count()`: Adjusts bullet count to target
    - `_truncate_to_max_no_space()`: Truncates based on max_chars (excluding spaces)
    - `_pad_to_min_chars()`: 100% 보장 - min_chars 미달 시 PADDING_PHRASES로 무조건 채움
    - `_apply_text_rule()`: 순서 보장 (불릿→min패딩→max자르기→불릿재적용), ✓/✗ 상태 표시
    - `_apply_table_rule()`: Applies table rules (max_rows, column min/max/bullet)
  - **`apply_guidelines_to_analysis()` function:**
    - Enforces rules for Part1 text fields (need_1, need_2_*, purpose, goals)
    - Enforces rules for Part1 tables (feedback_table, total_review_table)
    - Enforces rules for Part2 tables (detail_table, eval_table per category)
    - Enforces rules for Part3/Part4 monthly programs (max_programs_per_month, column limits)
    - Enforces rules for Part4 budget_table and feedback_summary
    - Returns (data, logs) tuple for debugging
  - **`get_partitioned_analysis()` updated:**
    - Calls apply_guidelines_to_analysis() as post-processing step
    - Stores guideline_logs in result for UI display
  - **Debug UI - "규칙 검증 결과" expander:**
    - Shows guideline application logs
    - Part1 text field validation (char count, bullet count, status)
    - Part1/Part2 table row counts and validation status
    - Part3/Part4 monthly program counts
    - Part4 budget/feedback table validation
  - Bullet format guaranteed (all lines start with "• ") after all transformations
  - Min/max character counts (excluding spaces) enforced across all parts
  - Table max_rows enforced and logged

- **2026-01-28**: Guideline Rules JSON System and Month Distribution
  - Added `guidelines_template.json` with writing rules (max_chars_no_space, bullet_count, max_rows)
  - `st.session_state["guideline_rules"]` initialized and preserved during upload analysis
  - `load_guideline_rules()`: Loads rules from JSON file
  - `count_chars_no_space()`: Counts characters excluding spaces for validation
  - Month extraction: `extract_months_from_text()`, `extract_months_from_cycle()`, `CYCLE_TO_MONTHS` mapping
  - `bucket_programs_by_month()`: Extracts program dates and buckets by month (1-12)
  - Empty months automatically filled with default template ("일상생활지도")
  - UI shows character count (공백 제외 글자수) below text areas with color coding

- **2026-01-28**: Major refactoring to fix JSON parsing failures with truncated responses
  - Upload limits: MAX_FILES=30, MAX_TOTAL_SIZE_MB=3 with button disable when exceeded
  - Debug indicators: "디버그 정보" expander showing file summaries, text lengths, Gemini input preview
  - Rule-based extraction: LABEL_PATTERNS for regex-based label extraction (program_name, date, staff, target, purpose, goal, effect, etc.)
  - `extract_file_summaries()`: Creates compact summary dicts from uploaded files
  - `summaries_to_compact_text()`: Converts summaries to short text for Gemini input
  - Partitioned Gemini generation: `generate_part1()`, `generate_part2()`, `generate_part3()`, `generate_part4()` - each part generated separately
  - `get_partitioned_analysis()`: Orchestrates 4 calls with partial failure handling
  - Improved `safe_gemini_json()`: Added `_is_truncated()` detection, `shorter_on_retry` parameter, logs response length/tail
  - Each part has strict size limits (600 chars per field, 5 rows per table)
  - Progress callback shows current part being generated

- **2026-01-26**: Implemented new Part 3/4 structure with intelligent date distribution
  - Part 3 now uses 12-month structure with program arrays per month
  - New 6-column monthly program table: 대분류, 중분류, 프로그램명, 참여자, 수행인력, 사업내용
  - Intelligent date distribution rules in AI prompt (연중→all months, 여름방학→7-8월, 분기→3/6/9/12월, etc.)
  - Part 4 restructured with budget table (항목, 금액, 세부내용) and feedback summary (영역, 문제점, 개선계획)
  - New doc_utils functions: generate_monthly_program_report(), generate_budget_evaluation_report()
  - New table types with column widths: monthly_program (0.6+0.6+1.0+0.7+0.7+2.9=6.5"), budget (1.2+1.5+3.8=6.5"), feedback_summary (1.3+2.2+3.0=6.5")
  - UI updated with period sub-tabs (상반기/하반기) and month radio selectors
  - Backward compatibility maintained for legacy part3_monthly_1h and part4_monthly_2h structures

- **2026-01-26**: Implemented Part 2 fixed subcategory mapping system
  - Added nested subcategories for each category (보호: 생활/안전/가족기능강화, 교육: 성장과권리/학습/특기적성, etc.)
  - New 7-column detail_table format with `expected_effect` (기대효과) field
  - AI prompt classification logic to map programs into fixed subcategories
  - Updated Word table widths: part2_detail (0.7"/0.8"/1.2"/0.6"/0.5"/0.5"/2.2"), part2_eval (1.0"/1.5"/2.5"/1.5")
  - Gray background headers with center alignment, left-aligned content rows
  - Comprehensive default data with sample programs for all subcategories

- **2026-01-26**: Global formatting standardization across all Parts
  - Standard 1.0" margins, 6.5" usable width
  - Monthly tables (Part 3/4) with proper column widths: Month 0.8", Activity 3.0", Safety 1.7", Note 1.0"
  - `set_cell_background()` function for gray table headers
  - All emojis replaced with ● Black Circle bullets for professional style

- **2026-01-26**: Enhanced document readability with bold formatting
  - Added `add_markdown_text()` function to parse **bold** markdown syntax
  - Updated `add_justified_paragraph()` to create separate paragraphs on \n\n
  - AI prompts updated to generate structured output with **● keyword**: description format
  - Default data updated with bold-formatted examples across all major fields

- **2025-01-26**: Major refactoring to implement granular editing UI
  - New JSON schema with detailed fields for each section
  - Expanders in PART 1 for section-by-section editing
  - Radio buttons in PART 2 for category selection
  - Updated Word generation to match new schema
  - Defensive initialization for missing data sections
