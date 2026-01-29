# AI 연간 사업계획 통합 에이전트 (Annual Business Plan Integration Agent)

## Overview

This Streamlit web application leverages Google Gemini 1.5 Pro AI to analyze program evaluation documents and generate structured Word (.docx) reports. It is designed for Korean-language business planning reports, supporting multiple file uploads (PDF, DOCX, TXT, CSV), AI-powered analysis, and automated, editable report generation. The project aims to streamline the creation of annual business plans by extracting and structuring key information, enabling granular user review, and producing professional reports.

The core workflow involves: user uploads, AI analysis, structured data extraction, granular UI-based editing, and final Word document generation with tables and charts.

## User Preferences

Preferred communication style: Simple, everyday language (Korean)

## System Architecture

### Frontend
- **Framework**: Streamlit for a web-based UI with a wide layout and sidebar.
- **UI Components**:
    - **Tab 1 (PART 1)**: Utilizes Expanders for editing sections like "사업의 필요성", "전년도 사업평가 및 환류계획", "만족도조사", "사업목적", and "사업목표".
    - **Tab 2 (PART 2)**: Employs Radio buttons for selecting categories (e.g., 보호, 교육) to display detailed program and evaluation tables.
    - **Tab 3 (PART 3)**: Features period sub-tabs (상반기, 하반기) and month-specific radio selectors for editing a 6-column monthly program table. Includes intelligent date distribution for programs.
    - **Tab 4 (PART 4)**: Contains Expanders for "예산계획" with a budget table and "평가 및 환류 요약" with a feedback summary.
- **State Management**: `st.session_state` is used for persistent data across user interactions.
- **Localization**: Full Korean language support with appropriate font handling (NanumGothic, DejaVu Sans fallback).

### Backend
- **Modular Design**: Structured into `main.py` (UI logic), `utils.py` (AI/API utilities), and `doc_utils.py` (Word generation).
- **AI Integration**: Google Gemini API processes documents and outputs structured JSON. Uses partitioned generation for each report section to handle large inputs and partial failures.
- **Document Generation**: `python-docx` is used for creating formatted Word documents, including tables with specific column widths, background colors, and markdown text parsing for bold formatting and bullet points.
- **File Support**: Handles PDF (via `pdfplumber`), DOCX (`python-docx`), TXT, and CSV files.
- **Data Schema**: A predefined JSON schema guides data extraction and UI rendering, ensuring consistency across report sections.
- **Data Flow**: Uploaded files are combined into text, analyzed by Gemini, parsed into a structured JSON, presented in an editable UI, and finally converted into a Word document.
- **Guideline Rules Enforcement**: A comprehensive system, configured via `guidelines_template.json`, enforces character counts (min/max, excluding spaces), bullet formatting, and row limits for all text fields and tables, using deterministic padding phrases when necessary.
- **Error Handling**: Includes API key validation, robust JSON parsing, graceful font fallbacks, and defensive data initialization.
- **Chart Generation**: `matplotlib` with Korean font configuration for generating satisfaction pie charts.
- **Satisfaction Survey Normalization**: `normalize_satisfaction_survey()` function ensures consistent data structure between sample and uploaded data, with automatic column name normalization (5점(명)→5점, 매우만족→5점, etc.) and validation. Default survey data uses deterministic distribution (45% 5점, 35% 4점, 12% 3점, 5% 2점, remainder 1점) to always sum to total_respondents.

## Recent Changes (2026-01-29)

- **Critical Crash Fix - set_table_width_by_ratio() Compatibility**:
  - Fixed `AttributeError: 'CT_Tbl' object has no attribute 'get_or_add_tblPr'`
  - Now uses safe pattern: `tblPr = tbl.tblPr` then create with `OxmlElement()` if None
  - Added try/except wrapper with error logging for robustness

- **PART 2 Content Rules Enforcement**:
  - 기대효과 (expected_effect): max 100 characters enforced
  - 계획내용 (content): 3-5 bullet items enforced (min_bullet_count/max_bullet_count)
  - Removed "(추가 내용 필요)" placeholder text from bullet padding
  - Updated `_ensure_bullet_count()` to support min/max range

- **PART 2 Word Table Column Widths**:
  - Applied fixed ratios to 세부사업내용 table: 8% / 8% / 30% / 8% / 8% / 8% / 30%
  - Columns: 세부영역, 프로그램명, 기대효과, 대상, 인원, 주기, 계획내용

- **10-Question Enforcement for Satisfaction Survey**: 
  - Added `SURVEY_QUESTION_COUNT = 10` constant in both `utils.py` and `doc_utils.py`
  - `normalize_satisfaction_survey()` now enforces exactly 10 questions (pads with defaults if < 10, truncates if > 10)
  - Default questions stored in `SURVEY_DEFAULT_QUESTIONS` constant

- **Satisfaction Survey Charts in Word Output**:
  - Added `generate_satisfaction_charts()` function creating 2 bar charts:
    1. 항목별 평균 점수 (horizontal bar chart showing average scores per question)
    2. 응답 분포 (인원수) (grouped bar chart showing response distribution)
  - Charts displayed side-by-side in a 2-column table with 50/50 width ratio

- **Fixed Table Column Widths for PART 1**:
  - Added `set_table_width_by_ratio()` utility function with proper autofit disable and fixed layout
  - Applied to all PART 1 tables:
    - 차년도사업환류계획 테이블: 20% / 40% / 40%
    - 총평 테이블: 20% / 80%
    - 만족도조사 테이블: 60% / (40%÷6 per score column)

## Previous Changes (2026-01-28)

- **PART 1 Word Generation**: Complete rewrite of `generate_part1_report()` to include all 5 sections in correct order
- **Satisfaction Survey Normalization**: Added `normalize_satisfaction_survey()` function integrated in two places

## External Dependencies

### Third-Party Services
- **Google Gemini API**: Used for AI-powered document analysis and structured data extraction. Requires `GEMINI_API_KEY` environment variable.

### Python Libraries
- `streamlit`: For building the web application user interface.
- `google-generativeai`: Python client for interacting with the Gemini API.
- `pandas`: Utilized for data manipulation, especially with tables.
- `matplotlib`: For generating data visualizations, specifically charts.
- `python-docx`: Essential for creating and manipulating Word (.docx) documents.
- `pdfplumber`: Used for extracting text content from PDF files.
- `openpyxl`: Provides support for reading and writing Excel files, often used by pandas.