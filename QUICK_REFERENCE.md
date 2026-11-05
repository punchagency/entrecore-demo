# Abstraction Landing Page - Quick Reference

## 🗂️ File Locations

| Component          | Path                                                                  | Lines |
| ------------------ | --------------------------------------------------------------------- | ----- |
| **Landing Page**   | `app/(protected)/abstraction/components/abstraction-landing-page.tsx` | ~206  |
| **Workflow Table** | `app/(protected)/abstraction/components/workflow-table.tsx`           | ~240  |
| **Metrics Cards**  | `app/(protected)/abstraction/components/metrics-cards.tsx`            | ~76   |
| **Tab Navigation** | `app/(protected)/abstraction/components/tab-navigation.tsx`           | ~90   |
| **Types**          | `types/abstraction.ts`                                                | ~34   |
| **Mock Data**      | `app/(protected)/abstraction/services/workflow-data.ts`               | ~140  |
| **Page Entry**     | `app/(protected)/abstraction/page.tsx`                                | ~5    |

**Total Lines of Code:** ~790 lines (well-structured, maintainable)

---

## 🧩 Component Hierarchy

```
AbstractionLandingPage (main)
├── Header (sticky)
│   └── Back button + Title
├── Hero Banner
│   ├── Content section
│   │   ├── Badge
│   │   ├── Heading
│   │   ├── Description
│   │   └── 3 Action buttons
│   └── Metrics Cards (desktop only)
├── MetricsCards (mobile/tablet)
│   └── 4x Metric card
└── Card wrapper
    ├── Heading
    └── WorkflowTable
        ├── Search input
        ├── Status filter
        └── Sortable table
            └── 8 workflow rows
```

---

## 🎯 Usage

### Import the Landing Page

```typescript
import { AbstractionLandingPage } from "@/app/(protected)/abstraction/components";

export default function Page() {
  return <AbstractionLandingPage />;
}
```

### Use Individual Components

```typescript
import { WorkflowTable, MetricsCards, TabNavigation } from "@/app/(protected)/abstraction/components";

// In your component...
<WorkflowTable workflows={workflows} onSelectWorkflow={handleSelect} />
<MetricsCards successRate={85} recordsProcessed={12} ... />
<TabNavigation activeStage="workflow" onStageChange={setStage} />
```

---

## 🔄 Data Flow

```
Page Mounts
    ↓
useEffect loads data
    ├─ getWorkflows() → [8 workflows]
    └─ getWorkflowMetrics() → aggregated metrics
    ↓
State updated (workflows, metrics)
    ↓
Components re-render with data
    ├─ MetricsCards displays KPIs
    ├─ WorkflowTable displays filtered/sorted list
    └─ User can interact (search, filter, sort, click row)
```

---

## 🔧 Props and Events

### WorkflowTable

```typescript
<WorkflowTable
  workflows={workflows}                    // Workflow[] from data
  onSelectWorkflow={(workflow) => {...}}   // Called on row click
  isLoading={isLoading}                    // Shows loading state
/>
```

### MetricsCards

```typescript
<MetricsCards
  successRate={94.2}                       // Percentage (0-100)
  recordsProcessed={12}                    // Integer count
  pendingReview={3}                        // Integer count
  entitiesTracked={12}                     // Integer count
  processingTime={245}                     // Optional: ms
  errorRate={2.5}                          // Optional: percentage
/>
```

### TabNavigation

```typescript
<TabNavigation
  activeStage="workflow"                   // Current active stage
  onStageChange={(stage) => {...}}         // Called on tab click
  disabledStages={["integrate"]}           // Optional: disabled tabs
/>
```

---

## 🎨 Styling Tips

### Override Colors

```typescript
// In WorkflowTable, status config:
Active: { bg: "bg-emerald-50", text: "text-emerald-700" }
Failed: { bg: "bg-rose-50", text: "text-rose-700" }
```

### Responsive Breakpoints

- `sm:` → 640px
- `lg:` → 1024px
- Mobile-first approach with progressive enhancement

### Glass Morphism

- `backdrop-blur-xl` - Strong blur
- `backdrop-blur-md` - Medium blur
- `bg-white/10` - Semi-transparent white
- `border-white/20` - Semi-transparent border

---

## 🚀 Integration Checklist

- [ ] Replace `workflow-data.ts` mock functions with real API
- [ ] Add permission checks to `disabledStages`
- [ ] Wire up `onSelectWorkflow` to navigate to detail page
- [ ] Add WebSocket listener for real-time metric updates
- [ ] Implement error handling and retry logic
- [ ] Add loading skeletons for better UX
- [ ] Set up analytics tracking
- [ ] Configure auto-refresh interval

---

## 🐛 Debugging

### Check Data Loading

```typescript
// In abstraction-landing-page.tsx
console.log("Workflows:", workflows);
console.log("Metrics:", metrics);
```

### Table Issues

- Check `workflows` array is populated
- Verify search term filters correctly
- Ensure sort field matches Workflow property names

### Styling Issues

- Inspect with DevTools (F12)
- Check Tailwind CSS classes are applied
- Verify Shadcn components are imported

---

## 📱 Responsive Behavior

| Screen Size | Layout Changes                                              |
| ----------- | ----------------------------------------------------------- |
| **Mobile**  | Hero full-width, metrics cards stacked, table single column |
| **Tablet**  | Hero side-by-side, 2-col metrics grid, table expandable     |
| **Desktop** | Hero full layout, 4-col metrics grid, wide table            |

---

## ⚡ Performance Notes

- **useMemo:** Filters/sorts only re-compute when dependencies change
- **Lazy Loading:** MetricsCards hidden on desktop, shown on mobile via CSS
- **Event Delegation:** Single click handler on table rows
- **Code Splitting:** TabNavigation content lazy-loaded via Tabs component

---

## 🔐 Security & Permissions

### Permission Checks (Ready to Implement)

```typescript
const canIntegrate = ability.can('manage', 'Integration');
const canConfigureProtocol = ability.can('manage', 'Protocol');

<TabNavigation
  disabledStages={!canIntegrate ? ['integrate'] : []}
/>
```

---

## 📚 Related Files

- Layout: `app/(protected)/abstraction/layout.tsx`
- Existing Components: `components/` (document-pipeline, protocol-editor, etc.)
- Store: `app/store/abstractionStore.ts` (if using Zustand)
- Types: `types/abstraction.ts` (workflow definitions)

---

## 🎓 Learning Resources

- **Tailwind CSS:** Responsive design, glass morphism
- **React Hooks:** useState, useEffect, useMemo
- **Next.js:** App Router, file-based routing
- **Shadcn UI:** Pre-built components (Card, Badge, Button, etc.)
- **TypeScript:** Interface definitions, type safety

---

## 💡 Pro Tips

1. **Search Optimization:** Add debounce for large datasets

   ```typescript
   const [searchTerm, setSearchTerm] = useDebounce("", 300);
   ```

2. **Pagination:** For 1000+ workflows, add pagination

   ```typescript
   const pageSize = 20;
   const pages = Math.ceil(workflows.length / pageSize);
   ```

3. **Export Feature:** Add CSV/JSON export

   ```typescript
   const exportAsCSV = (workflows) => {
     /* generate CSV */
   };
   ```

4. **Bulk Actions:** Multi-select and batch operations
   ```typescript
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   ```

---

## 📞 Support

For issues or questions:

1. Check `ABSTRACTION_IMPLEMENTATION.md` for detailed docs
2. Review component props and type definitions
3. Check TypeScript errors: `npm run type-check`
4. Build locally: `npm run dev` then navigate to `/abstraction`
