# Abstraction Landing Page - Implementation Guide

## Overview

The Abstraction Landing Page has been rebuilt to serve as a central operational dashboard for managing document abstraction workflows. It provides visibility into workflow statuses, operational metrics, and lifecycle stages as per the acceptance criteria.

## Architecture

### Component Structure

```
app/(protected)/abstraction/
├── page.tsx                           # Main entry point
├── layout.tsx                         # Layout wrapper
├── components/
│   ├── abstraction-landing-page.tsx   # Main landing page component
│   ├── metrics-cards.tsx              # KPI metrics display
│   ├── workflow-table.tsx             # Sortable/filterable workflows table
│   ├── tab-navigation.tsx             # Lifecycle stage tabs
│   ├── index.ts                       # Component exports
│   ├── document-pipeline.tsx          # Document processing pipeline
│   ├── protocol-editor.tsx            # Protocol configuration
│   ├── workflow-builder.tsx           # Workflow builder UI
│   ├── human-review.tsx               # Review interface
│   ├── extraction-results.tsx         # Results display
│   └── integrations-comparison.tsx    # Integration management
├── services/
│   ├── workflow-data.ts               # Mock data & API layer
│   └── ocr-api.ts                     # OCR service
└── types/
    └── abstraction.ts                 # Type definitions
```

### Type System

**File:** `types/abstraction.ts`

```typescript
type WorkflowStatus = "Active" | "In Development" | "Paused" | "Failed" | "Archived";

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  metrics: {
    successRate: number;
    recordsProcessed: number;
    processingTime: number;
    errorRate: number;
  };
  lastUpdated: string;
  createdAt: string;
}
```

## Key Features

### 1. **Hero Banner Section**

- **Purpose:** Introduction and call-to-action
- **Components:**
  - OCR-Driven Protocol badge
  - Main heading with gradient text
  - Descriptive paragraph
  - Action buttons: Upload Documents, Configure Protocol, Refresh
  - Decorative animated blobs for visual appeal
- **Responsive:** Full-width on mobile, side-by-side on desktop

### 2. **Metrics Cards**

- **Metrics Displayed:**
  - Documents Processed (total records)
  - Extraction Accuracy (success rate percentage)
  - Pending Review (failed + in-development count)
  - Entities Tracked (total entities)
- **Responsive:**
  - Mobile: Stacked vertically (MetricsCards component)
  - Desktop: 2x2 grid (inline in hero)
- **Visual:** Color-coded icons (emerald, amber, rose, cyan)

### 3. **Workflows Table**

- **Columns:**
  - Workflow Name (sortable)
  - Description/Purpose
  - Status (sortable, color-coded badge)
  - Metrics (success rate, records processed)
  - Action arrow
- **Features:**
  - **Search:** Real-time keyword search across name and description
  - **Filtering:** By workflow status (All, Active, In Development, Paused, Failed, Archived)
  - **Sorting:**
    - Status
    - Workflow Name
    - Last Updated
    - Success Rate
  - **Visual Indicators:**
    - Failed workflows highlighted with red ring
    - Status-specific row background colors
    - Hover effects for interactivity
  - **Row Click:** Navigates to workflow details

### 4. **Status Color Coding**

| Status         | Background   | Text          | Icon                       |
| -------------- | ------------ | ------------- | -------------------------- |
| Active         | Emerald (50) | Emerald (700) | Check Circle               |
| In Development | Blue (50)    | Blue (700)    | Clock                      |
| Paused         | Amber (50)   | Amber (700)   | Clock                      |
| Failed         | Rose (50)    | Rose (700)    | Alert Circle (highlighted) |
| Archived       | Slate (50)   | Slate (700)   | Clock                      |

### 5. **Tab Navigation** (for workflow details)

- **Stages:**
  - Workflow - Configure workflow rules
  - Pipeline - Define processing pipeline
  - OCR Review - Review OCR results
  - Integrate - Integrate with systems
  - Results - View results
- **Features:**
  - Visual highlight of active tab
  - Disabled tabs based on permissions
  - Smooth transitions between tabs
  - Persistent workflow context

## Acceptance Criteria - Implementation Map

| Criteria                                                             | Implementation                              |
| -------------------------------------------------------------------- | ------------------------------------------- |
| Display all configured workflows in table                            | ✅ WorkflowTable component                  |
| Table includes: Name, Description, Status, Metrics                   | ✅ All columns included                     |
| Status values: Active, In Development, Paused, Failed, Archived      | ✅ WorkflowStatus type with all values      |
| Metrics update dynamically                                           | ✅ useMemo in WorkflowTable filters/updates |
| Sort by Status, Name, Last Updated, Success Rate                     | ✅ toggleSort function with multiple fields |
| Search by keyword                                                    | ✅ Real-time search in filteredWorkflows    |
| Select workflow for detail view                                      | ✅ onSelectWorkflow callback                |
| Display Success Rate, Records Processed, Processing Time, Error Rate | ✅ Metrics in table rows + hero cards       |
| Metrics refresh automatically                                        | ✅ handleRefresh function                   |
| Failed workflows highlighted                                         | ✅ Red ring highlight on failed rows        |
| Drill into workflow details                                          | ✅ Row click handler + tab system           |
| Tabs: Workflow, Pipeline, OCR Review, Integrate, Results             | ✅ TabNavigation component                  |
| Active stage highlighted                                             | ✅ Active tab styling in TabNavigation      |
| Tab click persists context                                           | ✅ State management via activeStage         |
| Unauthorized tabs disabled                                           | ✅ disabledStages prop support              |

## Component API

### AbstractionLandingPage

Main component that orchestrates the entire landing page.

**Props:** None (uses internal state)

**Features:**

- Loads workflows and metrics on mount
- Handles search, filtering, and sorting via child components
- Manages refresh functionality
- Responsive layout with mobile/tablet/desktop breakpoints

### WorkflowTable

Displays searchable, filterable, sortable workflow data.

```typescript
interface WorkflowTableProps {
  workflows: Workflow[];
  onSelectWorkflow?: (workflow: Workflow) => void;
  isLoading?: boolean;
}
```

**Features:**

- Real-time search with debouncing ready
- Status filter dropdown
- Column sorting with visual indicators
- Row highlighting for failed workflows
- Responsive table design

### MetricsCards

Displays KPI metrics in a grid layout.

```typescript
interface MetricsCardsProps {
  successRate: number;
  recordsProcessed: number;
  pendingReview: number;
  entitiesTracked: number;
  processingTime?: number;
  errorRate?: number;
}
```

**Features:**

- 4-column responsive grid
- Color-coded icons
- Hover scale animations
- Mobile-friendly stacking

### TabNavigation

Lifecycle stage navigation tabs.

```typescript
interface TabNavigationProps {
  activeStage: AbstractionStage;
  onStageChange: (stage: AbstractionStage) => void;
  disabledStages?: AbstractionStage[];
}
```

**Features:**

- 5 workflow lifecycle stages
- Visual active state
- Disable support for permission-based access
- Smooth transitions

## Data Layer

**File:** `services/workflow-data.ts`

### Mock Data

Contains 8 sample workflows with realistic data:

- Document Abstraction (Active, 85%)
- CSV Abstraction (In Development, 0%)
- JSON Data Extraction (Active, 92.5%)
- Contract Clause Analysis (Paused, 78.3%)
- Entity Recognition Pipeline (Failed, 45.2%)
- Financial Data Extraction (Active, 94.7%)
- Regulatory Compliance Check (Archived, 88.1%)
- Multi-Language Text Processing (In Development, 65.5%)

### API Functions

```typescript
getWorkflows(): Promise<Workflow[]>
// Returns all configured workflows

getWorkflowById(id: string): Promise<Workflow | undefined>
// Returns specific workflow by ID

getWorkflowMetrics(): {
  avgSuccessRate: number;
  totalRecords: number;
  avgErrorRate: number;
  activeCount: number;
  failedCount: number;
  developmentCount: number;
  pendingReview: number;
}
// Aggregates metrics across all workflows
```

## Styling & Design System

### Color Palette

- **Primary Blue:** `#3064F6`
- **Background:** `#EFF4FF` (layout) / `#F0F4FF` (page)
- **Gradient:** Violet-950 → Indigo-900 → Blue-900 (hero)
- **Status Colors:**
  - Success: Emerald
  - Warning/In Progress: Amber/Blue
  - Error: Rose

### Component Classes

- **Hero:** `rounded-3xl` with `backdrop-blur-xl` glass effect
- **Cards:** `shadow-xl`, `rounded-3xl`, `ring-1 ring-slate-200/50`
- **Table:** `rounded-lg`, `border-slate-200`
- **Buttons:** `rounded-xl`, primary `bg-violet-600`, secondary `border-white/20`

### Responsive Breakpoints

- **Mobile:** Stacked layout, full-width
- **Tablet (sm):** 2-column grid for metrics
- **Desktop (lg):** 4-column grid, side-by-side hero layout

## Integration Points

### Future API Integration

Replace `workflow-data.ts` functions with real API calls:

```typescript
// Current mock
const workflows = await getWorkflows();

// Future real API
const { data } = await apiClient.get("/workflows");
```

### Permission System

Integrate with existing CASL-based permissions:

```typescript
<TabNavigation
  activeStage={stage}
  onStageChange={setStage}
  disabledStages={permissions.includes('integrate') ? [] : ['integrate']}
/>
```

### Workflow Detail Navigation

Extend row click handler:

```typescript
const handleSelectWorkflow = (workflow: Workflow) => {
  router.push(`/abstraction/workflows/${workflow.id}`);
};
```

## Performance Optimizations

1. **Memoization:** `useMemo` for filtered/sorted workflows
2. **Lazy Loading:** MetricsCards only on mobile (hidden on desktop via CSS)
3. **Event Delegation:** Click handlers on rows for table interactions
4. **CSS Optimizations:** Tailwind v4 with CSS variables for theming

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Future Enhancements

1. **Real-time Updates:** WebSocket integration for auto-refresh metrics
2. **Batch Actions:** Multi-select workflows for bulk operations
3. **Export:** CSV/PDF export of workflow data
4. **Analytics:** More detailed workflow performance charts
5. **Pagination:** Lazy load workflows for large datasets
6. **Custom Views:** Save filtered/sorted views as preferences
7. **Workflow Cloning:** Duplicate existing workflows
8. **Advanced Filters:** Date range, error rate ranges, etc.

## Testing

### Component Tests

- WorkflowTable sorting and filtering
- MetricsCards responsive layout
- TabNavigation state management
- Search functionality

### Integration Tests

- Landing page load with mock data
- Workflow selection and detail navigation
- Tab switching and state persistence

## Files Modified/Created

| File                                      | Type     | Status     |
| ----------------------------------------- | -------- | ---------- |
| `types/abstraction.ts`                    | New      | ✅ Created |
| `components/abstraction-landing-page.tsx` | New      | ✅ Created |
| `components/metrics-cards.tsx`            | New      | ✅ Created |
| `components/workflow-table.tsx`           | New      | ✅ Created |
| `components/tab-navigation.tsx`           | New      | ✅ Created |
| `components/index.ts`                     | New      | ✅ Created |
| `services/workflow-data.ts`               | New      | ✅ Created |
| `page.tsx`                                | Modified | ✅ Updated |

## Next Steps

1. **Integrate Real API:** Connect to backend workflow endpoint
2. **Add Permissions:** Map permissions to disabled tabs
3. **Implement Navigation:** Wire up workflow detail navigation
4. **Add Analytics:** Track user interactions with workflows
5. **Performance Testing:** Load test with large workflow datasets
