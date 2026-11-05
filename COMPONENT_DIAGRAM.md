# Abstraction Landing Page - Component Diagram

## 📊 Component Tree

```
AbstractionLandingPage
│
├─ Sticky Header
│  ├─ Back Link
│  └─ Title "Abstraction Workflows"
│
├─ Hero Banner Section
│  ├─ Decorative Blobs (background)
│  ├─ Left Content
│  │  ├─ Badge "OCR-Driven Protocol"
│  │  ├─ Main Heading
│  │  ├─ Description Text
│  │  └─ 3 Action Buttons
│  │     ├─ Upload Documents (primary)
│  │     ├─ Configure Protocol (outline)
│  │     └─ Refresh (outline)
│  │
│  └─ Right Metrics (desktop only)
│     ├─ Total Records Card
│     ├─ Avg Success Rate Card
│     ├─ Pending Review Card
│     └─ Entities Tracked Card
│
├─ MetricsCards Section (mobile/tablet)
│  ├─ Documents Processed
│  ├─ Extraction Accuracy %
│  ├─ Pending Review Count
│  └─ Entities Tracked
│
└─ Workflows Card Section
   ├─ Section Title
   └─ WorkflowTable
      ├─ Search Input
      ├─ Status Filter Dropdown
      ├─ Table Header
      │  ├─ Workflow Name (sortable)
      │  ├─ Description/Purpose
      │  ├─ Status (sortable)
      │  ├─ Metrics (sortable)
      │  └─ Action Column
      │
      └─ Table Rows (8 workflows)
         ├─ Row 1: Document Abstraction (Active)
         ├─ Row 2: CSV Abstraction (In Development)
         ├─ Row 3: JSON Data Extraction (Active)
         ├─ Row 4: Contract Clause Analysis (Paused)
         ├─ Row 5: Entity Recognition Pipeline (Failed) ⚠️
         ├─ Row 6: Financial Data Extraction (Active)
         ├─ Row 7: Regulatory Compliance (Archived)
         └─ Row 8: Multi-Language Text (In Development)

TabNavigation (separate, for workflow detail pages)
└─ 5 Lifecycle Stage Tabs
   ├─ Workflow (active highlight)
   ├─ Pipeline
   ├─ OCR Review
   ├─ Integrate
   └─ Results
```

---

## 🔗 Component Relationships

```
┌─────────────────────────────────────────────────────────┐
│          AbstractionLandingPage (Main Container)         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Hero Banner with 3 Buttons & Metrics (desktop)    │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ MetricsCards (mobile, hidden lg:)                 │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ WorkflowTable                                      │  │
│  │ ┌──────────────────────────────────────────────┐  │  │
│  │ │ Search Input + Status Filter                │  │  │
│  │ ├──────────────────────────────────────────────┤  │  │
│  │ │ Table                                        │  │  │
│  │ │ ┌────┬──────────┬────────┬──────────┬──────┐  │  │
│  │ │ │ Name│ Desc    │ Status │ Metrics  │ Action  │  │
│  │ │ ├────┼──────────┼────────┼──────────┼──────┤  │  │
│  │ │ │ ... │ ...      │ ...    │ ...      │ ...    │  │  │
│  │ │ └────┴──────────┴────────┴──────────┴──────┘  │  │
│  │ └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Data Flow Diagram

```
┌──────────────┐
│  Page Mounts │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ useEffect Hook                       │
│ - Load workflows via getWorkflows()  │
│ - Load metrics via getWorkflowMetrics()
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Update State                         │
│ - workflows: Workflow[]              │
│ - metrics: MetricsObject             │
│ - isLoading: false                   │
└──────┬───────────────────────────────┘
       │
       ├──────────────────┬──────────────────┐
       ▼                  ▼                  ▼
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  MetricsCards   WorkflowTable   │    │ Hero Metrics │
└─────────────┘    └──────────────┘    └──────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
  Render KPIs        Search/Filter       Display KPIs
                    Sort/Select
```

---

## 🔄 User Interaction Flow

```
┌─ User Lands on /abstraction ─────────────────┐
│                                              │
├─ VIEW METRICS                               │
│  ├─ See hero banner with KPIs               │
│  └─ See metrics cards below                 │
│                                              │
├─ SEARCH WORKFLOWS                           │
│  ├─ Type in search input                    │
│  └─ Table filters in real-time              │
│                                              │
├─ FILTER BY STATUS                           │
│  ├─ Click status dropdown                   │
│  └─ Select status option                    │
│     └─ Table updates immediately            │
│                                              │
├─ SORT WORKFLOWS                             │
│  ├─ Click column header                     │
│  ├─ First click: ascending ↑                │
│  ├─ Second click: descending ↓              │
│  └─ Row arrow shows sort direction          │
│                                              │
├─ SELECT WORKFLOW                            │
│  ├─ Click on any table row                  │
│  └─ Navigate to workflow detail page        │
│                                              │
├─ UPLOAD DOCUMENTS                           │
│  ├─ Click "Upload Documents" button         │
│  └─ Open upload dialog/page                 │
│                                              │
├─ CONFIGURE PROTOCOL                         │
│  ├─ Click "Configure Protocol" button       │
│  └─ Open protocol editor                    │
│                                              │
└─ REFRESH DATA                               │
   ├─ Click "Refresh" button                  │
   └─ Re-fetch all workflows & metrics        │
```

---

## 🎨 Layout Responsive Grid

```
MOBILE (320px - 639px)
┌────────────────────────────┐
│ Header                     │
├────────────────────────────┤
│ Hero Banner (full width)   │
│ - Content stacked         │
│ - Buttons stacked         │
├────────────────────────────┤
│ MetricsCards (1x4 vertical)│
├────────────────────────────┤
│ WorkflowTable              │
│ - Full width, scrollable  │
└────────────────────────────┘

TABLET (640px - 1023px)
┌──────────────────────────────┐
│ Header                       │
├──────────────────────────────┤
│ Hero Banner                  │
│ - Content left, metrics right│
│ - 2x2 metrics grid          │
├──────────────────────────────┤
│ MetricsCards (2x2 grid)      │
├──────────────────────────────┤
│ WorkflowTable                │
│ - Full width table           │
└──────────────────────────────┘

DESKTOP (1024px+)
┌────────────────────────────────────┐
│ Header                             │
├────────────────────────────────────┤
│ Hero Banner (no separate metrics)  │
│ - Content left (60%)               │
│ - Metrics 2x2 grid right (40%)     │
├────────────────────────────────────┤
│ WorkflowTable (full width)         │
│ - Optimized column widths          │
└────────────────────────────────────┘
```

---

## 🧬 State Management

```
AbstractionLandingPage Component State

┌─────────────────────────────────────────────────┐
│ State Variables                                 │
├─────────────────────────────────────────────────┤
│ workflows: Workflow[]                           │
│ ├─ Loaded from getWorkflows()                  │
│ ├─ Updated by handleRefresh()                  │
│ └─ Filtered/sorted in WorkflowTable useMemo   │
│                                                │
│ isLoading: boolean                             │
│ ├─ true during initial load                   │
│ ├─ true during refresh                        │
│ └─ triggers loading state in table             │
│                                                │
│ metrics: { avgSuccessRate, totalRecords, ...} │
│ ├─ Loaded from getWorkflowMetrics()           │
│ ├─ Passed to MetricsCards                     │
│ └─ Displayed in hero banner                    │
└─────────────────────────────────────────────────┘

WorkflowTable Component State

┌─────────────────────────────────────────────────┐
│ Local State (WorkflowTable)                     │
├─────────────────────────────────────────────────┤
│ searchTerm: string                              │
│ ├─ Updated on input change                    │
│ └─ Filters workflows in useMemo                │
│                                                │
│ statusFilter: WorkflowStatus | "all"           │
│ ├─ Updated on dropdown select                 │
│ └─ Filters workflows in useMemo                │
│                                                │
│ sortField: SortField                           │
│ ├─ Updated on column header click             │
│ └─ Sorts workflows in useMemo                 │
│                                                │
│ sortOrder: "asc" | "desc"                      │
│ ├─ Toggles on same column click               │
│ └─ Affects sort direction                      │
│                                                │
│ filteredWorkflows: Workflow[]                  │
│ └─ Computed via useMemo (optimized)            │
└─────────────────────────────────────────────────┘
```

---

## 🔌 API Contract (Mock → Real)

```
Current (Mock Data)
─────────────────────────────────────
app/abstraction/services/workflow-data.ts
├─ getWorkflows() → Promise<Workflow[]>
├─ getWorkflowById(id) → Promise<Workflow | undefined>
└─ getWorkflowMetrics() → MetricsObject

Future (Real API)
─────────────────────────────────────
Replace with:
├─ GET /api/abstraction/workflows
│  └─ Returns: { data: Workflow[] }
├─ GET /api/abstraction/workflows/:id
│  └─ Returns: { data: Workflow }
└─ GET /api/abstraction/metrics
   └─ Returns: MetricsObject
```

---

## 🎯 Feature Mapping to Components

| Feature           | Component(s)        | Implementation                 |
| ----------------- | ------------------- | ------------------------------ |
| Display workflows | WorkflowTable       | ✅ Table rows from workflows[] |
| Search workflows  | WorkflowTable       | ✅ useMemo filter              |
| Filter by status  | WorkflowTable       | ✅ Select dropdown             |
| Sort workflows    | WorkflowTable       | ✅ Column header clicks        |
| Highlight failed  | WorkflowTable       | ✅ CSS ring-1 ring-rose-300    |
| View metrics      | MetricsCards + Hero | ✅ Card display                |
| Show KPIs         | Hero Banner         | ✅ Desktop metrics preview     |
| Navigation tabs   | TabNavigation       | ✅ 5 stage tabs                |
| Responsive layout | All                 | ✅ Tailwind breakpoints        |
| Type safety       | All                 | ✅ TypeScript interfaces       |
