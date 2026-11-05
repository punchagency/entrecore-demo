"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import mammoth from "mammoth";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useReviewPreview } from "../hooks/use-drat-review";
import { QueryErrorState } from "@/components/query-error-state";

interface DratReviewPreviewProps {
  taskId: string;
}

const docxHtmlCache = new Map<string, string>();

function isPdfPreview(
  previewUrl?: string | null,
  mimeType?: string | null,
  filename?: string | null
) {
  if (mimeType === "application/pdf") return true;
  const name = `${filename || ""} ${previewUrl || ""}`.toLowerCase();
  return name.includes(".pdf");
}

function isDocxPreview(
  previewUrl?: string | null,
  mimeType?: string | null,
  filename?: string | null
) {
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return true;
  }
  const name = `${filename || ""} ${previewUrl || ""}`.toLowerCase();
  // Prefer .docx; legacy .doc is not supported by mammoth.
  return name.includes(".docx");
}

function DocxInlinePreview({ previewUrl }: { previewUrl: string }) {
  const [html, setHtml] = useState<string | null>(
    () => docxHtmlCache.get(previewUrl) ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!docxHtmlCache.has(previewUrl));

  useEffect(() => {
    if (docxHtmlCache.has(previewUrl)) {
      setHtml(docxHtmlCache.get(previewUrl) ?? null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(previewUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch document (${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (cancelled) return;
        const styled = `<div class="drat-docx-preview">${result.value || "<p>(Empty document)</p>"}</div>`;
        docxHtmlCache.set(previewUrl, styled);
        setHtml(styled);
      } catch (err) {
        if (cancelled) return;
        console.error("DOCX preview failed:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to render Word document preview."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  if (loading) {
    return (
      <div className="min-h-[520px] h-[min(72vh,860px)] rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Rendering Word document…</p>
      </div>
    );
  }

  if (error || !html) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 flex items-center gap-2 min-h-[200px]">
        <FileText className="h-4 w-4 shrink-0" />
        {error || "Inline preview is not available for this Word file."} Use Open
        full screen to download/view the upload.
      </div>
    );
  }

  return (
    <div className="min-h-[520px] h-[min(72vh,860px)] rounded-xl border border-slate-200 overflow-hidden bg-white">
      <ScrollArea className="h-full">
        <div
          className="p-6 text-sm text-slate-800 leading-relaxed [&_p]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-200 [&_th]:p-2 [&_th]:bg-slate-50"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </ScrollArea>
    </div>
  );
}

export function DratReviewPreview({ taskId }: DratReviewPreviewProps) {
  const { data, isLoading, isError, error, refetch, isFetching } = useReviewPreview(taskId);

  const showPdf = useMemo(
    () =>
      isPdfPreview(
        data?.preview_url,
        data?.mime_type,
        data?.filename || data?.original_filename
      ),
    [data]
  );

  const showDocx = useMemo(
    () =>
      !showPdf &&
      isDocxPreview(
        data?.preview_url,
        data?.mime_type,
        data?.filename || data?.original_filename
      ),
    [data, showPdf]
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="min-h-[520px] h-[min(72vh,860px)] w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <QueryErrorState
        variant="inline"
        error={error}
        title="Couldn't load the document preview"
        onRetry={() => refetch()}
        isRetrying={isFetching}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {data.filename || data.original_filename || "Uploaded document"}
          </p>
          {data.document_type && (
            <p className="text-xs text-slate-500">Classified as: {data.document_type}</p>
          )}
        </div>
        {data.preview_url && (
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <a href={data.preview_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open full screen
            </a>
          </Button>
        )}
      </div>

      {data.preview_url && showPdf ? (
        <div className="min-h-[520px] h-[min(72vh,860px)] rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
          <iframe
            src={data.preview_url}
            title="Document preview"
            className="w-full h-full bg-white"
          />
        </div>
      ) : data.preview_url && showDocx ? (
        <DocxInlinePreview previewUrl={data.preview_url} />
      ) : data.preview_url ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 flex items-center gap-2 min-h-[200px]">
          <FileText className="h-4 w-4 shrink-0" />
          Inline preview is not available for this file type. Use Open full screen to
          view the upload.
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 min-h-[200px]">
          No staged file path on this task — preview unavailable.
        </div>
      )}

      {data.document_text_excerpt && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Extracted text
            </p>
            {data.char_count != null && (
              <p className="text-xs text-slate-400">
                {data.char_count.toLocaleString()} chars
                {data.excerpt_truncated ? " (excerpt)" : ""}
              </p>
            )}
          </div>
          <ScrollArea className="h-28 rounded-xl border border-slate-200 bg-slate-50">
            <pre className="p-3 text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
              {data.document_text_excerpt}
            </pre>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
