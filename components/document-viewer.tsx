"use client";

import dynamic from "next/dynamic";
import {
  forwardRef,
  useImperativeHandle,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
// @ts-ignore
import Papa from "papaparse";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { getPdfOverlayColors } from "@/app/(protected)/abstraction/utils/extraction-highlight-styles";
import type { TextBounds } from "@/app/(protected)/abstraction/utils/pdf-text-search";

// Dynamically import react-pdf (fix SSR issues)
const PDFDocument = dynamic(
  async () => {
    const mod = await import("react-pdf");
    mod.pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${mod.pdfjs.version}/pdf.worker.min.js`;
    return mod.Document;
  },
  { ssr: false }
);

const PDFPage = dynamic(
  async () => {
    const mod = await import("react-pdf");
    return mod.Page;
  },
  { ssr: false }
);

export type DocumentViewerHandle = {
  scrollToAnnotation: (id: string) => void;
  scrollToPage: () => void;
  scrollToTextHighlight: () => void;
  /** True when the requested PDF page (or current page) has finished rendering. */
  isReady: (expectedPage?: number) => boolean;
};

export type Annotation =
  | {
      id: string;
      type: "bbox";
      page?: number;
      pageNumber?: number;
      x: number;
      y: number;
      width: number;
      height: number;
      comment?: string;
      confidence?: number;
      entityColor?: string;
      bbox?: { x: number; y: number; width: number; height: number };
    }
  | {
      id: string;
      type: "cell";
      row: number;
      col: number;
      comment?: string;
      page?: number;
    }
  | {
      id: string;
      type: "cellValue";
      searchValue: string;
      comment?: string;
      page?: number;
    };

type Props = {
  fileUrl: string;
  fileType: "pdf" | "image" | "text" | "csv";
  annotations?: Annotation[];
  originalWidth?: number;
  originalHeight?: number;
  pageNumber?: number;
  onPageReady?: () => void;
  /** Called when a bbox overlay is clicked, so the parent can sync the field panel. */
  onAnnotationClick?: (id: string) => void;
  /** Currently active annotation id — rendered with an emphasized highlight. */
  activeAnnotationId?: string | null;
  /** Source/value text to locate and highlight on the current PDF page. */
  highlightSearchText?: string | null;
};

const ToolTipDiv = ({
  CompDiv,
  text,
  bgColor,
}: {
  CompDiv: ReactNode;
  text: string;
  bgColor?: string;
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{CompDiv}</TooltipTrigger>
      <TooltipContent
        style={{ backgroundColor: bgColor || "transparent" }}
        className=" text-white rounded-xl p-3 shadow-2xl"
      >
        <p className="max-w-[220px] text-[11px] font-medium leading-relaxed">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
};

const DocumentViewer = forwardRef<DocumentViewerHandle, Props>(function DocumentViewer(
  {
    fileUrl,
    fileType,
    annotations = [],
    originalWidth = 1000,
    originalHeight = 1000,
    pageNumber = 1,
    onPageReady,
    onAnnotationClick,
    activeAnnotationId,
    highlightSearchText,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const TEXT_HIGHLIGHT_ID = "__text_highlight__";
  const [textContent, setTextContent] = useState("");
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [originalDimensions, setOriginalDimensions] = useState({ width: 1000, height: 1000 });
  const [resizeCheck, setResizeCheck] = useState(0);
  const [renderedPageHeight, setRenderedPageHeight] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [textLoaded, setTextLoaded] = useState(false);
  const [csvLoaded, setCsvLoaded] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [loadedPageNumber, setLoadedPageNumber] = useState<number | null>(null);
  const [textHighlightBounds, setTextHighlightBounds] = useState<TextBounds | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      scrollToAnnotation(id: string) {
        const el = containerRef.current?.querySelector(`[data-annotation-id="${id}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
      scrollToPage() {
        const pageEl = containerRef.current?.querySelector("[data-pdf-page]");
        pageEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
      scrollToTextHighlight() {
        const el = containerRef.current?.querySelector(
          `[data-annotation-id="${TEXT_HIGHLIGHT_ID}"]`
        );
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        const pageEl = containerRef.current?.querySelector("[data-pdf-page]");
        pageEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
      isReady(expectedPage?: number) {
        if (fileType === "pdf") {
          const targetPage = expectedPage ?? pageNumber;
          return pdfLoaded && loadedPageNumber === targetPage;
        }
        return imgLoaded || textLoaded || csvLoaded || pdfLoaded;
      },
    }),
    [csvLoaded, fileType, imgLoaded, loadedPageNumber, pageNumber, pdfLoaded, textLoaded]
  );

  // Reset when URL or page changes
  useEffect(() => {
    setImgLoaded(false);
    setTextLoaded(false);
    setCsvLoaded(false);
    setPdfLoaded(false);
    setLoadedPageNumber(null);
    setTextHighlightBounds(null);
  }, [fileUrl, pageNumber]);

  useEffect(() => {
    if (fileType !== "pdf" || !pdfLoaded || !fileUrl || !highlightSearchText?.trim()) {
      setTextHighlightBounds(null);
      return;
    }

    let cancelled = false;

    void import("@/app/(protected)/abstraction/utils/pdf-text-search").then(
      ({ findTextBoundsOnPage }) =>
        findTextBoundsOnPage(fileUrl, pageNumber, highlightSearchText).then((bounds) => {
          if (!cancelled) setTextHighlightBounds(bounds);
        })
    );

    return () => {
      cancelled = true;
    };
  }, [fileType, fileUrl, highlightSearchText, pageNumber, pdfLoaded]);

  useEffect(() => {
    if (!textHighlightBounds || !pdfLoaded) return;
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector(
        `[data-annotation-id="${TEXT_HIGHLIGHT_ID}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [textHighlightBounds, pdfLoaded]);

  // Load text
  useEffect(() => {
    if (fileType === "text" && fileUrl && fileUrl !== "undefined") {
      setTextLoaded(false);
      fetch(fileUrl)
        .then((r) => r.text())
        .then((text) => {
          setTextContent(text);
          setTextLoaded(true);
        });
    }
  }, [fileUrl, fileType]);

  // Load CSV
  useEffect(() => {
    if (fileType === "csv" && fileUrl && fileUrl !== "undefined") {
      setCsvLoaded(false);
      fetch(fileUrl)
        .then((r) => r.text())
        .then((text) => {
          const parsed = Papa.parse<string[]>(text);
          setCsvData(parsed.data);
          setCsvLoaded(true);
        });
    }
  }, [fileUrl, fileType]);

  // Track container size (for scaling bbox)
  const resize = () => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
    setResizeCheck((prev) => prev + 1);
  };
  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);

    // Window resize alone misses layout changes (sidebar toggle, modal open,
    // flex reflow). Without this, the image re-renders at the new width but
    // `dimensions.width` stays stale, so the overlay height — derived from it —
    // drifts and bboxes near the bottom end up floating below the image.
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      observer = new ResizeObserver(() => resize());
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", resize);
      observer?.disconnect();
    };
  }, []);

  // Overlay height must always match the *current* rendered image/PDF height.
  // `renderedPageHeight` only captures the load-time height; if the container
  // resizes afterwards the image scales but that state doesn't, and the overlay
  // ends up taller than the image — pushing bottom bboxes into empty space below.
  // Derive from container width × aspect ratio so it tracks every resize.
  const overlayHeight =
    originalDimensions.width > 0 && originalDimensions.height > 0 && dimensions.width > 0
      ? (dimensions.width * originalDimensions.height) / originalDimensions.width
      : renderedPageHeight;

  // const scaleX = dimensions.width / originalWidth;
  // const scaleY = dimensions.height / originalHeight;

  // const scaleX = dimensions.width;
  // const scaleY = dimensions.height;

  const annotationStyle = (comment: string, confidence?: number, entityColor?: string) =>
    getPdfOverlayColors(comment, confidence, entityColor);

  // 🔹 Render overlay boxes
  const renderOverlay = () => {
    if (!pdfLoaded && !imgLoaded) {
      return null;
    }

    const seen = new Set<string>();
    const bboxOverlays = annotations
      .filter((a: any) => {
        if (a?.type !== "bbox") return false;
        const rawPage = a.page ?? a.pageNumber;
        if (rawPage == null) return false;
        if (Number(rawPage) !== pageNumber) return false;
        const key = String(a.id ?? `${a.x},${a.y},${a.width},${a.height}`);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((a: any) => {
        const { x, y, width, height } = a;
        const maxExtent = Math.max(
          Math.abs(x ?? 0),
          Math.abs(y ?? 0),
          Math.abs((x ?? 0) + (width ?? 0)),
          Math.abs((y ?? 0) + (height ?? 0))
        );
        const isNormalized = maxExtent <= 1.5;
        const toPct = (v: number, dim: number) =>
          isNormalized ? `${v * 100}%` : `${(v / (dim || 1)) * 100}%`;

        const meta = annotationStyle(a.comment || "", a.confidence, a.entityColor);
        const isActive = activeAnnotationId != null && String(a.id) === String(activeAnnotationId);

        const style = {
          position: "absolute" as const,
          left: toPct(x, originalDimensions.width),
          top: toPct(y, originalDimensions.height),
          width: toPct(width, originalDimensions.width),
          height: toPct(height, originalDimensions.height),
          padding: "2px 4px",
          background: meta.fill,
          border: `${isActive ? 3 : 2}px solid ${isActive ? "#7c3aed" : meta.border}`,
          borderRadius: 4,
          boxSizing: "border-box" as const,
          transform: "translate(-2px, -2px)",
          cursor: "pointer",
          boxShadow: isActive
            ? "0 0 0 3px rgba(124, 58, 237, 0.35), 0 2px 8px rgba(124, 58, 237, 0.45)"
            : "0 1px 2px rgba(15, 23, 42, 0.08)",
          zIndex: isActive ? 20 : undefined,
          transition: "box-shadow 0.15s ease, border-color 0.15s ease",
        };

        return (
          <div
            key={a.id}
            data-annotation-id={a.id}
            style={style}
            onClick={(event) => {
              event.stopPropagation();
              onAnnotationClick?.(a.id);
            }}
          >
            <ToolTipDiv
              CompDiv={
                <div style={{ position: "absolute", inset: 0 }}>
                  {meta.edited && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        right: 0,
                        transform: "translate(50%, -50%)",
                        background: "#f97316",
                        color: "#fff",
                        borderRadius: "50%",
                        width: 16,
                        height: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        lineHeight: 1,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        zIndex: 5000,
                      }}
                    >
                      ✎
                    </div>
                  )}
                </div>
              }
              text={a.comment || "No comment"}
              bgColor={meta.tooltipBg}
            />{" "}
          </div>
        );
      });

    if (!textHighlightBounds) return bboxOverlays;

    const { x, y, width, height } = textHighlightBounds;
    const toPct = (v: number, dim: number) => `${(v / (dim || 1)) * 100}%`;
    const textHighlightOverlay = (
      <div
        key={TEXT_HIGHLIGHT_ID}
        data-annotation-id={TEXT_HIGHLIGHT_ID}
        style={{
          position: "absolute",
          left: toPct(x, originalDimensions.width),
          top: toPct(y, originalDimensions.height),
          width: toPct(width, originalDimensions.width),
          height: toPct(height, originalDimensions.height),
          background: "rgba(124, 58, 237, 0.22)",
          border: "3px solid #7c3aed",
          borderRadius: 4,
          boxSizing: "border-box",
          boxShadow: "0 0 0 3px rgba(124, 58, 237, 0.35), 0 2px 8px rgba(124, 58, 237, 0.45)",
          zIndex: 25,
          pointerEvents: "none",
        }}
      />
    );

    return [...bboxOverlays, textHighlightOverlay];
  };

  // 🔹 Render CSV with cell annotations
  const renderCSV = () => {
    if (!csvLoaded) {
      return null;
    }

    // "cell" annotations carry the entity's absolute (row, column) position
    // in the raw file — row 1 / column 1 line up exactly with csvData[0][0]
    // since csvData comes from parsing the same raw file with no header
    // offset assumed, same as the backend's extraction prompt.
    const cellAnnotationMap = new Map<
      string,
      Extract<Annotation, { type: "cell" }>
    >();
    annotations.forEach((a) => {
      if (a?.type === "cell") cellAnnotationMap.set(`${a.row}-${a.col}`, a);
    });

    const renderCellBox = (cellText: string, rowNumber: number, colNumber: number) => {
      const ann = cellAnnotationMap.get(`${rowNumber}-${colNumber}`);
      if (!ann) return <>{cellText}</>;

      const meta = annotationStyle(ann.comment || "");
      const isActive = activeAnnotationId != null && String(ann.id) === String(activeAnnotationId);

      return (
        <ToolTipDiv
          CompDiv={
            <div
              data-annotation-id={ann.id}
              onClick={(event) => {
                event.stopPropagation();
                onAnnotationClick?.(ann.id);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: meta.fill,
                border: `${isActive ? 2 : 1}px solid ${isActive ? "#7c3aed" : meta.border}`,
                borderRadius: 4,
                padding: "4px 8px",
                boxShadow: isActive ? "0 0 0 2px rgba(124, 58, 237, 0.35)" : undefined,
                cursor: "pointer",
              }}
            >
              <span>{cellText}</span>
              {meta.edited && (
                <span
                  style={{
                    background: "#f97316",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 16,
                    height: 16,
                    fontSize: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✎
                </span>
              )}
            </div>
          }
          text={ann.comment || "No comment"}
          bgColor={meta.tooltipBg}
        />
      );
    };

    return (
      <div
        style={{
          width: "100%",
          height: "500px",
          overflowY: "auto",
          overflowX: "auto",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
        }}
      >
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: "600px" }}>
          {/* First row as sticky header */}
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              {(csvData[0] || []).map((cell, cIdx) => {
                const hasAnnotation = annotations.find(
                  (a) => a?.type === "cellValue" && a?.searchValue === cell
                );

                return (
                  <th
                    key={cIdx}
                    style={{
                      border: "1px solid #cbd5e1",
                      padding: "10px 12px",
                      background: "#f8fafc",
                      position: "relative",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {hasAnnotation
                      ? (() => {
                          const meta = annotationStyle(hasAnnotation.comment || "");
                          return (
                            <ToolTipDiv
                              CompDiv={
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    background: meta.fill,
                                    border: `1px solid ${meta.border}`,
                                    borderBottom: `3px solid ${meta.border}`,
                                    borderRadius: 4,
                                    padding: "4px 8px",
                                  }}
                                >
                                  <span>{cell}</span>
                                  {meta.edited && (
                                    <span
                                      style={{
                                        background: "#f97316",
                                        color: "#fff",
                                        borderRadius: "50%",
                                        width: 16,
                                        height: 16,
                                        fontSize: 10,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                      }}
                                    >
                                      ✎
                                    </span>
                                  )}
                                </div>
                              }
                              text={hasAnnotation.comment || "No comment"}
                              bgColor={meta.tooltipBg}
                            />
                          );
                        })()
                      : renderCellBox(cell, 1, cIdx + 1)}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {csvData.slice(1).map((row, rIdx) => (
              <tr
                key={rIdx}
                style={{
                  background: rIdx % 2 === 0 ? "#fff" : "#f8fafc", // ← zebra stripe
                }}
              >
                {row.map((cell, cIdx) => {
                  return (
                    <td
                      key={cIdx}
                      style={{
                        border: "1px solid #e2e8f0",
                        padding: "8px 12px",
                        position: "relative",
                        fontSize: 13,
                        color: "#334155",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {/* rIdx+2: row 1 is the header consumed above, so the
                          first body row is absolute file row 2 — matching
                          the backend's absolute row numbering. */}
                      {renderCellBox(cell, rIdx + 2, cIdx + 1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  const memoedFile = useMemo(() => ({ url: fileUrl }), [fileUrl]); // ← only changes when URL actually changes

  if (!fileUrl) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "500px",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#fff",
      }}
    >
      {/* 🔹 File Renderer */}
      {fileType === "pdf" && (
        <div style={{ position: "relative", width: "100%" }} data-pdf-page>
          {!pdfLoaded && (
            <div
              style={{
                padding: "10px",
                width: "100%",
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 10,
              }}
            >
              <Skeleton style={{ height: "500px", width: "100%" }} />
            </div>
          )}
          <PDFDocument
            file={memoedFile}
            loading={<div style={{ width: dimensions.width, height: renderedPageHeight }} />}
            noData={<div />}
            error={<div style={{ color: "red", padding: 8 }}>Failed to load PDF.</div>}
            onLoadError={(error) =>
              console.error("[PDFDocument] onLoadError:", error?.message, error)
            }
          >
            <PDFPage
              pageNumber={pageNumber}
              width={dimensions.width}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onRenderSuccess={(page) => {
                setOriginalDimensions({
                  width: page.originalWidth,
                  height: page.originalHeight,
                });
                setRenderedPageHeight(page.height);
                setPdfLoaded(true);
                setLoadedPageNumber(pageNumber);
                resize();
                onPageReady?.();
              }}
              loading={<div style={{ width: dimensions.width, height: renderedPageHeight }} />}
            />
          </PDFDocument>
        </div>
      )}

      {fileType === "image" && (
        <div style={{ position: "relative", width: "100%" }}>
          {!imgLoaded && (
            <div
              style={{
                width: "100%",
                height: renderedPageHeight || 500,
                background: "#f1f5f9",
                // @ts-ignore
                animate: "pulse",
              }}
            />
          )}
          <img
            src={memoedFile.url}
            onLoad={(e) => {
              setImgLoaded(true);
              // ← grab natural dimensions here too
              setOriginalDimensions({
                width: e.currentTarget.naturalWidth,
                height: e.currentTarget.naturalHeight,
              });
              setRenderedPageHeight(e.currentTarget.offsetHeight);
              onPageReady?.();
            }}
            style={{
              width: "100%",
              display: imgLoaded ? "block" : "none", // ← hide until loaded
            }}
          />
        </div>
      )}

      {fileType === "text" && (
        <>
          {!textLoaded && (
            <div style={{ padding: "10px", width: "100%" }}>
              <Skeleton style={{ height: "20px", marginBottom: "8px", width: "100%" }} />
              <Skeleton style={{ height: "20px", marginBottom: "8px", width: "95%" }} />
              <Skeleton style={{ height: "20px", marginBottom: "8px", width: "98%" }} />
              <Skeleton style={{ height: "20px", marginBottom: "8px", width: "92%" }} />
              <Skeleton style={{ height: "20px", marginBottom: "8px", width: "100%" }} />
            </div>
          )}
          {textLoaded && <pre style={{ padding: "10px" }}>{textContent}</pre>}
        </>
      )}

      {fileType === "csv" && (
        <>
          {!csvLoaded && (
            <div style={{ padding: "10px", width: "100%" }}>
              <Skeleton style={{ height: "40px", marginBottom: "8px", width: "100%" }} />
              <Skeleton style={{ height: "40px", marginBottom: "8px", width: "100%" }} />
              <Skeleton style={{ height: "40px", marginBottom: "8px", width: "100%" }} />
              <Skeleton style={{ height: "40px", marginBottom: "8px", width: "100%" }} />
            </div>
          )}
          {csvLoaded && renderCSV()}
        </>
      )}

      {/* 🔹 Overlay Layer */}
      {/* <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>{renderOverlay()}</div>
      </div> */}
      {fileType !== "csv" && fileType !== "text" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: overlayHeight || "100%", // ← tracks current image/PDF height, not load-time snapshot
            pointerEvents: "none",
          }}
        >
          <div
            style={{ position: "relative", width: "100%", height: "100%", pointerEvents: "auto" }}
          >
            {renderOverlay()}
          </div>
        </div>
      )}
    </div>
  );
});

export default DocumentViewer;
