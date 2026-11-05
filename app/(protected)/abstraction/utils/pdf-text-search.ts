export interface TextBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

type PdfJs = typeof import("react-pdf").pdfjs;
type PdfDocumentLoadingTask = ReturnType<PdfJs["getDocument"]>;

let pdfjsPromise: Promise<PdfJs | null> | null = null;
const pdfDocCache = new Map<string, PdfDocumentLoadingTask>();

async function loadPdfJs(): Promise<PdfJs | null> {
  if (typeof window === "undefined") return null;

  if (!pdfjsPromise) {
    pdfjsPromise = import("react-pdf").then((mod) => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${mod.pdfjs.version}/pdf.worker.min.js`;
      return mod.pdfjs;
    });
  }

  return pdfjsPromise;
}

async function getPdfDocument(url: string): Promise<PdfDocumentLoadingTask | null> {
  const pdfjs = await loadPdfJs();
  if (!pdfjs) return null;

  if (!pdfDocCache.has(url)) {
    pdfDocCache.set(url, pdfjs.getDocument(url));
  }

  return pdfDocCache.get(url)!;
}

function isPdfTextItem(item: unknown): item is PdfTextItem {
  return (
    item != null &&
    typeof item === "object" &&
    "str" in item &&
    typeof (item as PdfTextItem).str === "string"
  );
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function buildSearchNeedle(searchText: string): string {
  const normalized = normalizeText(searchText);
  if (normalized.length < 4) return "";
  return normalized.slice(0, 120);
}

async function pageContainsText(
  doc: Awaited<PdfDocumentLoadingTask["promise"]>,
  pageNumber: number,
  needle: string
): Promise<boolean> {
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  const text = content.items
    .map((item: unknown) => (isPdfTextItem(item) ? item.str : ""))
    .join(" ");
  return normalizeText(text).includes(needle);
}

export async function findPageForText(
  pdfUrl: string,
  searchText: string
): Promise<number | undefined> {
  const needle = buildSearchNeedle(searchText);
  if (!needle || !pdfUrl) return undefined;

  try {
    const loadingTask = await getPdfDocument(pdfUrl);
    if (!loadingTask) return undefined;

    const doc = await loadingTask.promise;
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      if (await pageContainsText(doc, pageNumber, needle)) {
        return pageNumber;
      }
    }
  } catch (error) {
    console.warn("[pdf-text-search] findPageForText failed:", error);
  }

  return undefined;
}

function unionTextItemBounds(items: PdfTextItem[], pageHeight: number): TextBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    const x = item.transform[4];
    const y = item.transform[5];
    const itemHeight = item.height || Math.abs(item.transform[3]) || 12;
    const itemWidth = item.width || 0;
    const topY = pageHeight - y;
    const bottomY = pageHeight - (y - itemHeight);

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + itemWidth);
    minY = Math.min(minY, Math.min(topY, bottomY));
    maxY = Math.max(maxY, Math.max(topY, bottomY));
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 8),
    height: Math.max(maxY - minY, 8),
  };
}

export async function findTextBoundsOnPage(
  pdfUrl: string,
  pageNumber: number,
  searchText: string
): Promise<TextBounds | null> {
  const needle = buildSearchNeedle(searchText);
  if (!needle || !pdfUrl) return null;

  try {
    const loadingTask = await getPdfDocument(pdfUrl);
    if (!loadingTask) return null;

    const doc = await loadingTask.promise;
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items.filter(isPdfTextItem) as PdfTextItem[];

    for (let start = 0; start < items.length; start++) {
      let combined = "";
      const matched: PdfTextItem[] = [];

      for (let index = start; index < items.length && combined.length < needle.length + 40; index++) {
        combined += items[index].str;
        matched.push(items[index]);
        if (normalizeText(combined).includes(needle)) {
          return unionTextItemBounds(matched, viewport.height);
        }
      }
    }
  } catch (error) {
    console.warn("[pdf-text-search] findTextBoundsOnPage failed:", error);
  }

  return null;
}
