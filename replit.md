# 2025 연간 사업 평가서 생성기 (Annual Program Evaluator)

## Overview

This is a Streamlit web application that uses Google Gemini 1.5 Pro AI to analyze uploaded program documents and generate structured Word (.docx) reports. The application is designed for Korean-language business evaluation reports, supporting document upload, AI-powered analysis, and automated report generation.

The core workflow is:
1. User uploads a document (TXT or CSV)
2. Gemini AI analyzes the content and extracts structured data
3. Application generates formatted Word reports with tables and charts

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Streamlit for rapid web UI development
- **Layout**: Wide layout with sidebar for file uploads and main area for results
- **State Management**: Uses `st.session_state` for persisting analysis data between interactions
- **Localization**: Korean language UI with appropriate font handling (NanumGothic, DejaVu Sans fallback)

### Backend Architecture
- **Modular Design**: Separated into three main modules:
  - `main.py`: Application entry point and UI logic
  - `utils.py`: AI integration and API utilities
  - `doc_utils.py`: Word document generation utilities
- **AI Integration**: Google Gemini API for document analysis with structured JSON output
- **Document Generation**: python-docx library for creating Word documents with formatted tables

### Data Flow Pattern
1. File upload → raw text extraction
2. Text → Gemini API → structured JSON response
3. JSON parsing with markdown code block removal
4. JSON data → Word document with tables and formatting

### Error Handling Strategy
- API key validation with user-friendly error messages
- JSON parsing with try-except blocks and markdown cleanup
- Graceful font fallback for cross-platform compatibility

### Chart Generation
- Matplotlib with Korean font configuration
- Unicode minus sign handling for proper character display

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
- `openpyxl`: Excel file support (for pandas)

### Deployment Configuration
- Target platform: Cloud Run (via Dockerfile)
- Korean font support: `fonts-nanum` system package
- Port: 8080 for containerized deployment

### Environment Variables Required
- `GEMINI_API_KEY`: Google Gemini API authentication key (required)