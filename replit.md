# 연간프로그램 AI 생성도우미

## Overview

This is an AI-powered annual program generation assistant for Korean after-school care centers (다함께돌봄센터). The application helps administrators create annual and monthly business plans by uploading PDF evaluation documents, which are then processed by AI to automatically extract, classify, and generate structured program plans.

The workflow follows a 7-step process (displayed in vertical sidebar):
1. PDF 업로드 - Upload evaluation documents
2. 자동 분류 - AI extracts and categorizes program information  
3. 연간 Part 1 - Annual plan overview and business goals
4. 연간 Part 2 - Detailed program content and evaluation plans
5. 상반기 (1-6월) - First half monthly schedules
6. 하반기 (7-12월) - Second half monthly schedules
7. 다운로드 - Export finished Word documents

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, using Vite as the build tool

**State Management**: Zustand with persistence middleware for maintaining application state across sessions

**Routing**: Wouter (lightweight React router) for client-side navigation

**UI Component Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS

**Data Fetching**: TanStack Query (React Query) for server state management and API calls

**Design System**: 
- B2B SaaS professional style - clean, work-focused interface
- Brand color: #7CB342 (green) for primary actions and highlights
- Two-column layout: Left sidebar (264px) + Main content area
- Vertical step indicator with 7 steps in sidebar
- Light/dark mode support via CSS variables
- Pretendard font optimized for Korean typography
- PC-only optimized layout (no mobile responsiveness required)
- Component styling follows design guidelines in `design_guidelines.md`

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful API endpoints under `/api` prefix

**File Processing**: 
- Multer for multipart file uploads (50MB limit)
- pdf-parse for extracting text from uploaded PDF documents

**AI Integration**: 
- OpenAI API via Replit AI Integrations
- Used for program classification and content generation
- Supports text, image, and audio modalities through integration modules

**Server-Side Rendering**: Vite middleware in development, static file serving in production

### Data Storage

**Current Implementation**: In-memory storage using Maps for uploaded files and session data

**Database Schema**: Drizzle ORM with PostgreSQL configured (schema in `shared/schema.ts`)
- Zod schemas for validation
- Tables for conversations and messages (chat functionality)
- Type-safe schema definitions with TypeScript inference

**Data Models**:
- `UploadedFile` - Stores PDF metadata and extracted text
- `ProgramInfo` - Individual program details with categories
- `AnnualPlan` / `MonthlyPlan` - Generated plan structures
- Program categories: 보호, 교육, 문화, 정서지원, 지역연계

### Build System

**Development**: TSX for running TypeScript directly, Vite for hot module replacement

**Production Build**: 
- esbuild bundles server code to CommonJS
- Vite builds client assets to `dist/public`
- Server dependencies selectively bundled to reduce cold start times

## External Dependencies

### AI Services
- **OpenAI API** via Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- Models used: GPT for text processing, gpt-audio-mini for voice, gpt-image-1 for images

### Database
- **PostgreSQL** - Connection via `DATABASE_URL` environment variable
- **Drizzle ORM** - Type-safe database operations with migrations in `/migrations`

### Key NPM Packages
- `pdf-parse` - PDF text extraction
- `drizzle-orm` / `drizzle-zod` - Database ORM and validation
- `openai` - AI API client
- `express-session` / `connect-pg-simple` - Session management
- `multer` - File upload handling

### Frontend Libraries
- Full Radix UI primitive set for accessible components
- `embla-carousel-react` - Carousel functionality
- `react-day-picker` - Date selection
- `recharts` - Data visualization
- `vaul` - Drawer component
- `docx` - Word document generation

## Recent Changes (2026-01-18)

### UI/UX Redesign - B2B SaaS Layout
- Changed from horizontal step indicator to vertical sidebar-based navigation
- Two-column layout: Left sidebar (264px sticky) + Main content area
- Sidebar contains:
  - Branding: "참참 4.3" with subtitle "연간프로그램 AI 도우미"
  - Vertical step indicator (7 steps)
  - Theme toggle at bottom
- Main content header shows step title and progress ("단계 X / 7")
- Brand color updated to #7CB342 (green) across light/dark modes
- All pages updated to use new layout pattern (flex h-full, space-y-6)
- CompletePage fixed to use current schema (part1/part2 instead of deprecated sections)

### Monthly Plan Implementation
- Added MonthlyPlanFirstHalfPage (1-6월) and MonthlyPlanSecondHalfPage (7-12월)
- Each month includes:
  - Table 1: 월간 사업 개요 (사업목표, 중점사항, 비고)
  - Table 2: 주요 업무 계획 (주차별 tasks)
- Tab-based month selection with edit/save/cancel/AI generate functionality
- Monthly overview data serialized as JSON in the `objectives` field

### Export Implementation
- Individual Word document exports for:
  - 연간계획서 PART 1 (exportPart1Docx)
  - 연간계획서 PART 2 (exportPart2Docx)
  - 상반기 월간계획 (exportFirstHalfMonthlyDocx)
  - 하반기 월간계획 (exportSecondHalfMonthlyDocx)
- All exports generate proper Word tables using docx library
- Download page shows status indicators for each document

### Data Model Pattern
- Monthly overview (objectives/focus/notes) serialized as JSON in existing objectives field
- Parse/serialize functions: parseOverviewFromObjectives, serializeOverviewToObjectives
- Weekly tasks stored as string arrays, normalized with Array.isArray checks

### Program Table Export (사업내용 및 수행인력)
- ProgramInfo schema extended with executionDate, executionMonth, personnel, serviceContent fields
- Monthly plan exports include 7-column program table as first section:
  - 대분류, 중분류, 프로그램명, 대상, 실행일자, 수행인력, 사업내용
- Programs automatically filtered by executionMonth or parsed from startDate
- Sorted by category hierarchy: 대분류 → 중분류 → 프로그램명 (Korean locale)
- Export functions: exportFirstHalfMonthlyDocx, exportSecondHalfMonthlyDocx now accept programs parameter
- DownloadPage passes extractedPrograms from store to export functions