/**
 * Captures UI screenshots for the Abstraction Job Aid.
 * Run: node scripts/capture-abstraction-job-aid-screenshots.mjs
 * Requires: dev server at http://localhost:3000
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "docs", "job-aids", "screenshots");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const WORKFLOW_ID = "wf-001";

async function capture(page, name, url, options = {}) {
  const { tab, waitMs = 1500, fullPage = true } = options;
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(waitMs);

  if (tab) {
    const trigger = page.getByRole("tab", { name: tab });
    if (await trigger.count()) {
      await trigger.click();
      await page.waitForTimeout(1000);
    }
  }

  const filePath = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage });
  console.log(`Saved: ${filePath}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const shots = [
    { name: "01-abstraction-landing", url: "/abstraction" },
    { name: "02-workflow-detail-overview", url: `/abstraction/${WORKFLOW_ID}`, tab: "Workflow" },
    { name: "03-protocol-tab", url: `/abstraction/${WORKFLOW_ID}`, tab: "Protocol" },
    { name: "04-pipeline-tab-staging", url: `/abstraction/${WORKFLOW_ID}`, tab: "Pipeline", waitMs: 2000 },
    { name: "05-ocr-review-tab", url: `/abstraction/${WORKFLOW_ID}`, tab: "OCR Review" },
    { name: "06-integrate-tab", url: `/abstraction/${WORKFLOW_ID}`, tab: "Integrate", waitMs: 2500 },
    { name: "07-results-tab", url: `/abstraction/${WORKFLOW_ID}`, tab: "Results" },
  ];

  for (const shot of shots) {
    try {
      await capture(page, shot.name, shot.url, shot);
    } catch (err) {
      console.error(`Failed ${shot.name}:`, err.message);
    }
  }

  await browser.close();
  console.log(`\nDone. Screenshots in: ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
