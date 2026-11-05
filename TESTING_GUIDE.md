# 🧪 TESTING GUIDE - Abstraction Landing Page & Workflow Builder

## 📋 Quick Start Testing

### 1. Start the Development Server

```bash
cd e:\Mazdoori\Entrecore-OI-FE
npm run dev
```

The app should start at `http://localhost:3000`

---

## 🎯 Manual Testing - Abstraction Landing Page

### Step 1: Navigate to Landing Page

1. Go to `http://localhost:3000/abstraction`
2. You should see:
   - ✅ Sticky header with back button and title
   - ✅ Hero banner with gradient background
   - ✅ 4 metrics cards (Documents Processed, Extraction Accuracy, Pending Review, Entities Tracked)
   - ✅ Workflows table with 8 sample workflows

### Step 2: Test Search Functionality

1. Look for the **search input** at the top of the table
2. Type "Document" in the search box
3. Verify: ✅ Table filters to show only "Document Abstraction"
4. Clear search
5. Type "CSV"
6. Verify: ✅ Shows only "CSV Abstraction"

**Expected:** Real-time search across workflow names and descriptions

### Step 3: Test Status Filter

1. Click the **"All Statuses"** dropdown
2. Select **"Active"**
3. Verify: ✅ Shows only Active workflows (Document Abstraction, JSON Data Extraction, etc.)
4. Try **"Failed"**
5. Verify: ✅ Shows only Entity Recognition Pipeline (highlighted in red)
6. Try **"Archived"**
7. Verify: ✅ Shows only Regulatory Compliance Check

**Expected:** Dropdown filters workflows by status

### Step 4: Test Sorting

1. Click on **"Workflow Name"** column header
2. Verify: ✅ Table sorts alphabetically A-Z
3. Click again
4. Verify: ✅ Table sorts Z-A (reverse)
5. Click on **"Status"** header
6. Verify: ✅ Sorts by status
7. Try sorting by **"Metrics"** (Success Rate)
8. Verify: ✅ Sorts by success rate high-to-low

**Expected:** Visual arrow indicator shows sort direction

### Step 5: Test Failed Workflow Highlighting

1. Look for "Entity Recognition Pipeline" (Failed status)
2. Verify: ✅ Red ring border around the row
3. Verify: ✅ Row background is light red
4. Verify: ✅ Status badge is red with error icon

**Expected:** Failed workflows stand out visually

### Step 6: Test Row Click Navigation

1. Click any workflow row (e.g., "Document Abstraction")
2. Verify: ✅ Navigate to `/abstraction/wf-001` (or similar)
3. See workflow detail page with:
   - ✅ Workflow name in header
   - ✅ Status badge
   - ✅ Description
   - ✅ 4 KPI cards (Success Rate, Records, Time, Error)
   - ✅ 5 tabs (Workflow, Pipeline, OCR Review, Integrate, Results)

**Expected:** Navigate to workflow detail page

---

## 🎯 Manual Testing - Workflow Detail Page

### Step 1: View Workflow Information

1. Click "Document Abstraction" from landing page
2. Verify: ✅ Page shows workflow details
3. See header: **"Document Abstraction"** with Active badge
4. See description below title

### Step 2: Check KPI Cards

1. Look at 4 info cards:
   - ✅ Success Rate: 85%
   - ✅ Records Processed: 12
   - ✅ Processing Time: 245ms
   - ✅ Error Rate: 2.5%

**Expected:** All metrics display correctly

### Step 3: Test Tab Navigation

1. Default should show **"Workflow"** tab (active)
2. Click **"Pipeline"** tab
3. Verify: ✅ Content changes (shows document pipeline UI)
4. Click **"OCR Review"** tab
5. Verify: ✅ Content changes
6. Click **"Integrate"** tab
7. Verify: ✅ Content changes
8. Click **"Results"** tab
9. Verify: ✅ Content changes

**Expected:** Smooth tab transitions without losing context

### Step 4: Test Active Tab Highlight

1. Current tab should have:
   - ✅ White background
   - ✅ Bold text
   - ✅ Visual distinction from other tabs
2. Switch tabs and see highlight move

### Step 5: Test Back Navigation

1. Click the **back arrow** in the header
2. Verify: ✅ Return to landing page
3. Verify: ✅ All filters/search maintained

**Expected:** Navigate back to landing page seamlessly

---

## 🎯 Manual Testing - Workflow Builder (Workflow Tab)

### Step 1: Open Workflow Tab

1. Go to detail page for any workflow
2. Click **"Workflow"** tab
3. Verify: ✅ Shows workflow builder interface

### Step 2: Test Available Nodes Panel

1. Look for **"Available Nodes"** on the right
2. Expand it if collapsed
3. Verify: ✅ Shows all 7 node types:
   - ✅ Document Intake
   - ✅ OCR Extraction
   - ✅ Classification
   - ✅ Validation
   - ✅ Integration
   - ✅ Exception Handling
   - ✅ Export

**Expected:** All node types available with descriptions

### Step 3: Test Validation Panel

1. Look for **"Validation"** section
2. If valid: ✅ Green checkmark with "Valid" message
3. If invalid: ✅ Red warning with error messages
4. Verify save is disabled when invalid

**Expected:** Real-time validation feedback

### Step 4: Test Node Addition

1. Click "+ Add Node" or drag from palette
2. Try adding "OCR Extraction" node
3. Verify: ✅ Node appears in canvas
4. Try adding "Classification" node
5. Verify: ✅ Second node appears

**Expected:** Nodes added to canvas successfully

### Step 5: Test Node Dragging

1. Click and drag a node to a new position
2. Verify: ✅ Node moves smoothly
3. Verify: ✅ Position updates in real-time

**Expected:** Drag-and-drop repositioning works

### Step 6: Test Node Hovering

1. Hover over any node
2. Verify: ✅ See node details tooltip:
   - ✅ Node label
   - ✅ Description
   - ✅ Upstream dependencies (if any)
   - ✅ Downstream dependencies (if any)
3. Mouse away and tooltip disappears

**Expected:** Node details display on hover

### Step 7: Test Connection Creation

1. Try connecting two nodes
2. Verify: ✅ Directional arrow appears
3. Verify: ✅ Connection shows flow direction

**Expected:** Connections created successfully

### Step 8: Test Circular Dependency Detection

1. Try creating a circular connection:
   - Node A → Node B → Node C → Node A
2. Verify: ✅ Error message appears
3. Verify: ✅ Save button is disabled
4. Verify: ✅ Red warning icon shows

**Expected:** Circular dependencies prevented

### Step 9: Test Save Functionality

1. Make changes to workflow
2. Click **"Save"** button
3. Verify: ✅ If valid, save succeeds
4. Verify: ✅ If invalid, save is disabled

**Expected:** Save validation works

### Step 10: Test Version Creation

1. Click **"Create Version"** button
2. Verify: ✅ Version history panel opens
3. Verify: ✅ Current version shown
4. Verify: ✅ Change summary displayed

**Expected:** Version created successfully

---

## 🧪 Automated Testing (Component Tests)

### Test WorkflowTable

```typescript
// Test search
const table = screen.getByRole("table");
const searchInput = screen.getByPlaceholderText(/search/i);
fireEvent.change(searchInput, { target: { value: "Document" } });
expect(screen.getByText("Document Abstraction")).toBeInTheDocument();

// Test sort
const nameHeader = screen.getByText("Workflow Name");
fireEvent.click(nameHeader);
// Verify workflows are sorted by name
```

### Test MetricsCards

```typescript
// Test rendering
render(<MetricsCards
  successRate={94.2}
  recordsProcessed={12}
  pendingReview={32}
  entitiesTracked={12}
/>);

expect(screen.getByText('94.2%')).toBeInTheDocument();
expect(screen.getByText('12')).toBeInTheDocument();
```

### Test Validation

```typescript
// Test circular dependency detection
const flow = {
  nodes: [
    { id: "1", type: "document-intake", label: "Start", position: { x: 0, y: 0 }, data: {} },
    { id: "2", type: "ocr-extraction", label: "OCR", position: { x: 200, y: 0 }, data: {} },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-1", source: "2", target: "1" }, // Circular!
  ],
};

const result = validateWorkflow(flow);
expect(result.isValid).toBe(false);
expect(result.errors).toContain("Workflow contains circular dependencies");
```

---

## 🔍 Integration Testing

### Test Landing Page → Detail Page Flow

```typescript
// 1. Start at landing page
cy.visit("/abstraction");

// 2. Search for workflow
cy.get('input[placeholder*="search"]').type("Document");

// 3. Click workflow row
cy.contains("Document Abstraction").click();

// 4. Verify detail page loaded
cy.url().should("include", "/abstraction/wf-001");
cy.contains("Document Abstraction").should("be.visible");
```

### Test Tab Switching

```typescript
// 1. Go to detail page
cy.visit("/abstraction/wf-001");

// 2. Click tabs
cy.contains("Pipeline").click();
cy.contains("OCR Review").click();
cy.contains("Integrate").click();
cy.contains("Results").click();

// 3. Verify content changes
cy.contains("Workflow").click();
// Back at original tab
```

---

## ✅ Checklist - What to Verify

### Landing Page

- [ ] Hero banner displays with gradient
- [ ] 4 metrics cards show correct values
- [ ] Search filters workflows in real-time
- [ ] Status filter works (All, Active, Failed, etc.)
- [ ] Sorting works on Name, Status, Success Rate
- [ ] Failed workflows highlighted in red
- [ ] Row click navigates to detail page
- [ ] Page is responsive (mobile/tablet/desktop)

### Workflow Detail Page

- [ ] Workflow name displays in header
- [ ] Status badge shows correct color
- [ ] 4 KPI cards display values
- [ ] All 5 tabs are visible
- [ ] Active tab is highlighted
- [ ] Tab content changes when clicked
- [ ] Back button returns to landing page
- [ ] Page persists workflow context

### Workflow Builder

- [ ] Validation panel shows status
- [ ] All 7 node types available
- [ ] Nodes can be added
- [ ] Nodes can be dragged
- [ ] Nodes display info on hover
- [ ] Connections can be created
- [ ] Circular dependencies detected
- [ ] Save button works
- [ ] Version history accessible
- [ ] Invalid workflows can't be saved

---

## 🐛 Common Issues & Troubleshooting

### Issue: Search not filtering

**Solution:** Ensure input is in search box, check browser console for errors

### Issue: Sorting not working

**Solution:** Click column header again, check if arrow indicator appears

### Issue: Failed to navigate to detail page

**Solution:** Check URL format, verify ID in mock data

### Issue: Validation not showing

**Solution:** Check network tab, verify validation service loaded

### Issue: Nodes not appearing in builder

**Solution:** React Flow might need initialization, check console

---

## 📊 Performance Testing

### Lighthouse Audit

```bash
npm run build
# Use Chrome DevTools → Lighthouse
# Check: Performance, Accessibility, Best Practices
```

### Bundle Size

```bash
npm run build -- --analyze
# Check: No unexpected large packages
```

---

## 🎯 End-to-End Test Scenario

### Complete User Journey

1. ✅ User visits `/abstraction`
2. ✅ Sees landing page with workflows
3. ✅ Searches for "Document Abstraction"
4. ✅ Clicks on workflow row
5. ✅ Navigates to detail page
6. ✅ Clicks "Workflow" tab
7. ✅ Adds nodes to workflow
8. ✅ Connects nodes
9. ✅ Validation passes
10. ✅ Clicks Save
11. ✅ Version created
12. ✅ Goes back to landing page
13. ✅ Workflow list still there

**Expected:** Complete flow works seamlessly

---

## 📝 Test Results Template

```
Date: [Your Date]
Tester: [Your Name]
Environment: [Local/Dev/Staging]

Landing Page: ✅ PASS / ❌ FAIL
- Search: ✅ PASS / ❌ FAIL
- Filter: ✅ PASS / ❌ FAIL
- Sort: ✅ PASS / ❌ FAIL
- Navigation: ✅ PASS / ❌ FAIL

Detail Page: ✅ PASS / ❌ FAIL
- Info Display: ✅ PASS / ❌ FAIL
- Tabs: ✅ PASS / ❌ FAIL
- Back Button: ✅ PASS / ❌ FAIL

Workflow Builder: ✅ PASS / ❌ FAIL
- Nodes: ✅ PASS / ❌ FAIL
- Connections: ✅ PASS / ❌ FAIL
- Validation: ✅ PASS / ❌ FAIL
- Versioning: ✅ PASS / ❌ FAIL

Overall: ✅ PASS / ❌ FAIL
Notes: [Any issues found]
```

---

## 🚀 Ready to Test!

All features are ready to test. Start with **Step 1** in the Manual Testing section above.

**Questions?** Check browser console (F12) for errors or let me know what you find! 🧪
