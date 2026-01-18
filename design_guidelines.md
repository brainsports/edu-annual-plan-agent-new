# Design Guidelines: 참참 4.3 연간프로그램 AI 도우미

## Design Approach
**B2B SaaS Administrative Tool** - Clean, professional interface designed for Korean after-school care center administrators. Prioritizes efficiency, clarity, and trust with a calm, work-focused visual style.

## Core Design Principles
1. **Workflow Clarity** - 7-step process clearly visible in left sidebar
2. **Data Density Management** - Handle complex forms and tables without overwhelming users
3. **Korean Typography Optimization** - Pretendard font optimized for Hangul text
4. **Progressive Disclosure** - Show information at the right time in the workflow
5. **B2B Professional Tone** - No flashy animations, gradients, or decorative elements

## Brand Colors

**Primary Brand Color:** #7CB342 (HSL: 88 52% 48%)
- Used for: Active steps, primary buttons, highlights, brand accents
- Light mode primary: HSL 88 52% 48%
- Dark mode primary: HSL 88 52% 50%

**Supporting Colors:**
- Background: Light gray (#F8F9FB / HSL 220 14% 97%)
- Card/Surface: Pure white (#FFFFFF)
- Sidebar: Pure white with subtle border
- Text Primary: Dark gray (#1F2937)
- Text Secondary: Muted gray (#6B7280)
- Accent (highlights): Light green (HSL 88 30% 92%)

## Typography

**Font Selection:**
- Primary: Pretendard (via CDN) - Modern Korean font optimized for screens
- Fallback: -apple-system, sans-serif

**Hierarchy:**
- Page Titles (in header): text-xl, font-semibold
- Section Headers: text-lg, font-semibold
- Card Titles: text-base, font-semibold
- Body Text: text-base, font-normal
- Helper Text: text-sm, font-normal
- Labels: text-sm, font-medium

## Layout System

### Three-Column Structure (PC-Only)
```
┌──────────────────────────────────────────────────────────────────┐
│ [Left Sidebar]  │  [Main Content Area]   │  [Right Panel]       │
│ 260px           │  flex-1, max-w-4xl     │  340px               │
│                 │                         │                      │
│ Logo + Branding │  Header (Step Title)   │  Status/Guidance     │
│                 │  ────────────────────  │  Panel that changes  │
│ Step Indicator  │                         │  per step            │
│ (Vertical)      │  Page Content           │                      │
│                 │  (Cards, Forms, Tables) │  Step 1: UploadQueue │
│                 │                         │  Step 2: Progress    │
│ Theme Toggle    │                         │  Step 3-7: Guidance  │
└──────────────────────────────────────────────────────────────────┘
```

### Left Sidebar (260px fixed width)
- **Position:** Sticky, full height (h-screen)
- **Background:** bg-sidebar (white/very light)
- **Border:** Right border (border-sidebar-border)
- **Content:**
  1. **Branding Header:** Logo icon + "참참 4.3" + subtitle
  2. **Step Indicator:** Vertical list of 7 steps
  3. **Theme Toggle:** Bottom of sidebar

### Main Content Area (flex-1, centered)
- **Header:** Sticky top, shows current step label + progress
- **Content:** Padded area (p-8) for page-specific content
- **Max Width:** Content wrapped in max-w-4xl mx-auto (prevents too wide)
- **Overflow:** Scrollable (overflow-y-auto)

### Right Panel (340px fixed width)
- **Position:** Sticky, full height (h-screen)
- **Background:** bg-muted/30 (slightly shaded)
- **Border:** Left border (border-border)
- **Content:** Step-specific panels:
  - **Step 1 (PDF 업로드):** UploadQueuePanel
    - Summary stats (file count, total size, failed count)
    - File list with scroll area
    - Bulk actions (retry failed, clear all)
  - **Step 2 (자동 분류):** ClassificationProgressPanel
    - Progress bar with percentage
    - Failed files list with retry button
    - Classification summary by category
  - **Steps 3-7:** GuidancePanel
    - Step title and description
    - Writing tips
    - Next action indicator

### Spacing Primitives
Use Tailwind units: 2, 3, 4, 6, 8, 12, 16
- Tight spacing: gap-2, p-2
- Standard spacing: gap-4, p-4
- Generous spacing: gap-6, p-6
- Section padding: p-8

## Component Library

### Vertical Step Indicator
- **7 Steps:** PDF 업로드, 자동 분류, 연간 Part 1, 연간 Part 2, 상반기, 하반기, 다운로드
- **Current Step:**
  - Background: Primary green (#7CB342)
  - Text: White
  - Number badge: White circle with primary text
- **Completed Steps:**
  - Background: Transparent (hover-elevate on hover)
  - Text: Foreground color
  - Check icon in light green badge
  - Clickable
- **Incomplete Steps:**
  - Background: Transparent
  - Text: Muted/gray
  - Number in muted badge
  - Not clickable
- **Connector Lines:** Vertical lines between steps (2px width)

### Cards
- Background: bg-card (white)
- Border: Subtle border (border-card-border)
- Border radius: rounded-lg
- Padding: p-4 to p-6
- No excessive shadows (flat design)

### Buttons
**Primary Button (Actions):**
- Background: Primary green (#7CB342)
- Text: White
- Text: Clear action-oriented Korean ("다음 단계로 이동", "저장", "생성")

**Secondary/Outline Button:**
- Border: Primary color or muted
- Text: Foreground
- Use for: Back navigation, secondary actions

**Disabled State:**
- Reduced opacity
- Cursor not-allowed

### Forms
- Input height: h-12
- Border radius: rounded-lg
- Labels above inputs
- Clear validation messages
- Two-column grid on desktop, single column on mobile

### Tables
- Header: Bold text, light background
- Rows: Alternating backgrounds for readability
- Actions: Right-aligned icons
- Responsive: Horizontal scroll on small screens

## Animations & Interactions
**Minimal Motion Policy:**
- No parallax, scroll animations, or decorative motion
- Subtle hover states only
- Page transitions: Simple fade (duration-200)
- Button hover: Very subtle elevation

## Page Structure

### Upload Page (Step 1)
- Feature cards grid (4 columns)
- Upload dropzone card
- Next step button (bottom right, disabled until file uploaded)

### Classification Page (Step 2)
- Description text
- Classify/Re-classify buttons
- Classification cards grid (3 columns)
- Navigation buttons

### Annual Plan Pages (Steps 3-4)
- Description + action buttons header
- Two-column grid: Input/Edit (left) + Preview (right)
- Sticky preview card
- Navigation buttons

### Monthly Plan Pages (Steps 5-6)
- Tab bar for month selection (6 tabs each)
- Month-specific content with forms
- Program table section
- Navigation buttons

### Download Page (Step 7)
- Description text
- Download items list with status indicators
- Individual download buttons
- Back navigation

## Accessibility
- WCAG AA contrast standards
- Focus indicators on interactive elements
- Proper form labels and ARIA attributes
- Keyboard navigation support
- Screen reader friendly step indicators

## Dark Mode
- Automatically adapts all colors
- Sidebar: Darker background (HSL 220 15% 8%)
- Cards: Slightly elevated from background
- Primary color remains consistent
- Maintain readability and contrast

---

**Key Success Metrics:** 
- Users complete 7-step workflow efficiently
- Professional, trustworthy B2B appearance
- Consistent spacing and color usage
- Clear step progression visibility
