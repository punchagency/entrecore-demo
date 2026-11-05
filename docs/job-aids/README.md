# Job Aids

## Abstraction → Staging → Integration

| Asset                              | Path                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| Full job aid (copy to Google Docs) | [abstraction-staging-integration-job-aid.md](./abstraction-staging-integration-job-aid.md) |
| UI screenshots (7 PNGs)            | [screenshots/](./screenshots/)                                                             |
| Screenshot capture script          | `scripts/capture-abstraction-job-aid-screenshots.mjs`                                      |

### Import into Google Docs

1. Open [abstraction-staging-integration-job-aid.md](./abstraction-staging-integration-job-aid.md) in VS Code or any editor.
2. Copy one phase at a time into Google Docs (headings paste as plain text — apply **Heading 1/2** styles in Docs).
3. For each step that lists a screenshot file:
   - In Docs: **Insert → Image → Upload from computer**
   - Select the matching PNG from `screenshots/`
4. Add numbered callouts in Docs using **Insert → Drawing** or text boxes over the image (match callout tables in the job aid).

### Screenshot files

- `01-abstraction-landing.png`
- `02-workflow-detail-overview.png`
- `03-protocol-tab.png`
- `04-pipeline-tab-staging.png`
- `05-ocr-review-tab.png`
- `06-integrate-tab.png`
- `07-results-tab.png`

Captured at 1440×900 (2×) from local dev (`/abstraction`, `/abstraction/wf-001`).
