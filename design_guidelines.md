# Design Guidelines: Annual Program AI Generation Assistant

## Design Approach
**System-Based Approach** - Drawing from modern productivity tools (Notion, Linear, Asana) with emphasis on clarity, efficiency, and data-heavy workflows. This administrative tool prioritizes usability and information hierarchy over visual flair.

## Core Design Principles
1. **Workflow Clarity** - Multi-step process must be visually evident and easy to navigate
2. **Data Density Management** - Handle complex forms and tables without overwhelming users
3. **Korean Typography Optimization** - Ensure excellent readability for Hangul text
4. **Progressive Disclosure** - Show information at the right time in the workflow

## Typography

**Font Selection:**
- Primary: Pretendard (via CDN) - Modern Korean font optimized for screens
- Fallback: -apple-system, sans-serif

**Hierarchy:**
- Page Titles: text-3xl md:text-4xl, font-bold
- Section Headers: text-xl md:text-2xl, font-semibold
- Card/Component Titles: text-lg, font-semibold
- Body Text: text-base, font-normal
- Helper Text: text-sm, font-normal
- Labels: text-sm, font-medium

## Layout System

**Spacing Primitives:**
Use Tailwind units: 2, 3, 4, 6, 8, 12, 16 for consistency
- Tight spacing: p-2, gap-2 (compact UI elements)
- Standard spacing: p-4, gap-4 (cards, sections)
- Generous spacing: p-8, gap-8 (page sections)
- Section breaks: mb-12, py-16

**Grid Structure:**
- Main container: max-w-7xl mx-auto px-4 md:px-8
- Two-column layouts: grid grid-cols-1 lg:grid-cols-2 gap-8
- Dashboard cards: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

## Component Library

### Navigation
**Header:**
- Fixed top navigation with site logo/title on left
- Progress indicator showing current step (1/5 workflow stages)
- User account menu on right
- Height: h-16, shadow-sm

**Sidebar (Optional for dashboard view):**
- Left-aligned, w-64
- Navigation items with icons (Heroicons)
- Collapsible on mobile

### Core Workflow Components

**File Upload Zone:**
- Large dropzone area (min-h-64)
- Dashed border with hover state
- Upload icon (Heroicons: arrow-up-tray)
- Primary text: "PDF 파일을 드래그하거나 클릭하여 업로드"
- Secondary text: "30페이지 내외의 프로그램 평가서"
- File preview card after upload with remove option

**Step Indicator:**
- Horizontal stepper showing 5 stages
- Numbered circles (40px diameter) connected by lines
- Active step highlighted, completed steps with checkmark
- Labels below each step

**Classification Cards:**
- Card-based layout displaying auto-classified data
- Header with category badge
- Key-value pairs in grid format
- Edit icon button (top-right corner)
- Spacing: p-6, gap-4

**Form Sections:**
- Grouped by category with clear section headers
- Two-column grid for form fields (desktop)
- Single column on mobile
- Field grouping: mb-6 between sections

### Form Elements

**Input Fields:**
- Standard height: h-12
- Border radius: rounded-lg
- Padding: px-4
- Labels above inputs with required indicator (*)
- Helper text below in smaller font

**Text Areas:**
- Min height: min-h-32 for descriptions
- Auto-resize enabled for long content
- Character count indicator for fields with limits

**Select Dropdowns:**
- Custom styled with Heroicons chevron-down
- Height: h-12
- Options with adequate padding

**Date Pickers:**
- Integrated calendar popup
- Clear "시작날짜" and "종료날짜" labels
- Range selection for program duration

**Action Buttons:**
- Primary: Large, prominent (h-12, px-8)
- Secondary: Outlined style (h-12, px-8)
- Icon buttons: Square (h-10 w-10) with single icon
- Button groups with gap-3

### Data Display

**Tables:**
- Responsive table with horizontal scroll on mobile
- Alternating row backgrounds for readability
- Sticky header on scroll
- Actions column (right-aligned) with edit/delete icons
- Row height: h-16
- Cell padding: px-4 py-3

**Summary Cards:**
- Stats display in grid format
- Large numbers (text-4xl) with labels below
- Icons representing each metric
- Hover lift effect (subtle)

**Preview Panels:**
- Split-screen layout for before/after comparison
- PDF viewer embed (left) with generated content (right)
- Synchronized scrolling option

### Modals/Overlays

**Edit Modal:**
- Centered overlay (max-w-2xl)
- Header with title and close button
- Form content area with scroll
- Footer with Cancel/Save buttons
- Backdrop blur effect

**Confirmation Dialogs:**
- Compact size (max-w-md)
- Icon + message + action buttons
- Clear destructive action styling

## Animations

**Minimal Motion:**
- Page transitions: fade-in only (duration-200)
- Button hover: subtle scale (scale-[1.02])
- Card hover: slight elevation (shadow-lg)
- NO scroll animations, parallax, or decorative motion

## Page Structure

### Landing/Home
- Hero section (60vh) with:
  - Main headline: "AI 기반 연간프로그램 계획서 자동 생성"
  - Subheadline explaining value proposition
  - Primary CTA button: "시작하기"
  - Hero image: Modern illustration of document automation
- Features section (3-column grid):
  - Icon + title + description for each key feature
  - PDF 업로드 자동 분류, 연간/월간 계획서 생성, 간편한 수정
- How It Works (5 steps with visual flow)
- CTA section with secondary action

### Dashboard/Main App
- Top navigation with step progress
- Main content area (max-w-7xl)
- Context-appropriate sidebar or action panel
- Footer with help/support links

### Upload Page
- Centered upload zone
- Instructions panel (left or top)
- Uploaded files list below
- Next button (bottom-right, fixed)

### Classification Review Page
- Category tabs or accordion sections
- Editable classification cards in grid
- Bulk edit options
- Regenerate/Confirm actions

### Form Generation Page
- Split view: Template outline (left) + Generated content (right)
- Section navigation sidebar
- Rich text editors for long-form content
- Save progress indicator

### Export/Download Page
- Preview of final documents
- Format selection (PDF, DOCX)
- Download buttons with icons
- Share options

## Images

**Hero Section:**
- Large hero image (right side or background)
- Image description: Modern, clean illustration showing documents transforming from evaluation reports to organized annual plans, with AI/automation visual metaphors
- Style: Minimalist, professional, using geometric shapes and soft gradients

**Feature Icons:**
- Use Heroicons for all feature/function icons
- Consistent 24x24 size in UI, larger (48x48) in feature showcases

**No additional imagery needed** - focus on data and functionality

## Accessibility

- Maintain WCAG AA contrast standards throughout
- All form inputs with proper labels and ARIA attributes
- Keyboard navigation for entire workflow
- Focus indicators on all interactive elements
- Error messages clearly associated with fields
- Screen reader friendly step indicators

---

**Key Success Metrics:** Users should complete the 5-step workflow with minimal friction, understanding each classification decision, and feeling confident editing generated content. The interface must handle dense Korean text gracefully while maintaining visual hierarchy.