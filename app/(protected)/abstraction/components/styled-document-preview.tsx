"use client";

import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractionResult } from "@/app/store/abstractionStore";
import { resolveExtractionHighlightStyle } from "../utils/extraction-highlight-styles";
import { formatExtractionValue } from "../utils/extraction-map-utils";

interface EntityMeta {
  name: string;
  color?: string;
  type?: string;
}

interface StyledDocumentPreviewProps {
  extractions: ExtractionResult[];
  entityMap: Map<string, EntityMeta>;
  activeExtractionId?: string | null;
  onHighlightClick?: (extractionId: string) => void;
}

interface HighlightProps {
  extractionId: string;
  entityKeys: string[];
  fallback: string;
  extractions: ExtractionResult[];
  entityMap: Map<string, EntityMeta>;
  activeExtractionId?: string | null;
  onHighlightClick?: (extractionId: string) => void;
}

function findExtraction(
  extractions: ExtractionResult[],
  entityKeys: string[]
): ExtractionResult | undefined {
  const normalizedKeys = entityKeys.map((k) => k.toLowerCase());
  return extractions.find((ext) => {
    const id = ext.entityId?.toLowerCase() ?? "";
    return normalizedKeys.some((key) => id === key || id.includes(key));
  });
}

function ExtractionHighlight({
  extractionId,
  entityKeys,
  fallback,
  extractions,
  entityMap,
  activeExtractionId,
  onHighlightClick,
}: HighlightProps) {
  const extraction =
    extractions.find((ext) => ext.id === extractionId) ?? findExtraction(extractions, entityKeys);
  const entity = extraction ? entityMap.get(extraction.entityId) : undefined;
  const displayValue = formatExtractionValue(extraction?.correctedValue || extraction?.value) || fallback;
  const style = resolveExtractionHighlightStyle(
    extraction ?? { confidence: 0.9, status: "auto" },
    { entityType: entity?.type, entityColor: entity?.color }
  );
  const confidencePct = extraction
    ? `${Math.round((extraction.confidence ?? 0) * 100)}%`
    : null;
  const isCorrected = extraction?.status === "corrected";
  const isActive = extraction?.id === activeExtractionId;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => extraction && onHighlightClick?.(extraction.id)}
        className={cn(
          "border-b-2 px-1 rounded cursor-pointer transition-colors",
          style.bg,
          style.border,
          style.hoverBg,
          isActive && "ring-2 ring-violet-300 ring-offset-1"
        )}
        title={
          extraction
            ? `${entity?.name || extraction.entityId} — ${confidencePct ?? "—"} confidence`
            : fallback
        }
      >
        {displayValue}
      </button>
      {isCorrected && (
        <span className="absolute -top-3 -right-2 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
          <Pencil className="h-2 w-2 text-white" />
        </span>
      )}
    </span>
  );
}

export function StyledDocumentPreview({
  extractions,
  entityMap,
  activeExtractionId,
  onHighlightClick,
}: StyledDocumentPreviewProps) {
  return (
    <div className="space-y-4 font-serif text-sm leading-relaxed text-slate-700">
      <h2 className="text-lg font-bold text-center text-slate-900 mb-6">MASTER LEASE AGREEMENT</h2>

      <p className="text-justify">
        This Master Lease Agreement (the &quot;Agreement&quot;) is entered into as of{" "}
        <ExtractionHighlight
          extractionId="lease-effective-date"
          entityKeys={["effective_date", "start_date", "date"]}
          fallback="January 1, 2026"
          extractions={extractions}
          entityMap={entityMap}
          activeExtractionId={activeExtractionId}
          onHighlightClick={onHighlightClick}
        />{" "}
        by and between{" "}
        <ExtractionHighlight
          extractionId="lease-lessor"
          entityKeys={["lessor", "party_name", "landlord"]}
          fallback="Acme Holdings LLC"
          extractions={extractions}
          entityMap={entityMap}
          activeExtractionId={activeExtractionId}
          onHighlightClick={onHighlightClick}
        />{" "}
        (hereinafter &quot;Lessor&quot;) and{" "}
        <ExtractionHighlight
          extractionId="lease-lessee"
          entityKeys={["lessee", "tenant", "party_name"]}
          fallback="Downtown Properties Inc."
          extractions={extractions}
          entityMap={entityMap}
          activeExtractionId={activeExtractionId}
          onHighlightClick={onHighlightClick}
        />{" "}
        (hereinafter &quot;Lessee&quot;), collectively referred to as the &quot;Parties.&quot;
      </p>

      <p className="text-justify">
        <strong>WHEREAS</strong>, Lessor is the owner of certain real property located at{" "}
        <ExtractionHighlight
          extractionId="lease-address"
          entityKeys={["property_address", "address", "location"]}
          fallback="123 Main Street, Suite 400, New York, NY 10001"
          extractions={extractions}
          entityMap={entityMap}
          activeExtractionId={activeExtractionId}
          onHighlightClick={onHighlightClick}
        />
        , and Lessee desires to lease said property for commercial office use.
      </p>

      <p className="text-justify">
        The total value of this lease agreement shall be{" "}
        <ExtractionHighlight
          extractionId="lease-value"
          entityKeys={["contract_value", "amount", "lease_value", "total_value"]}
          fallback="$2,450,000"
          extractions={extractions}
          entityMap={entityMap}
          activeExtractionId={activeExtractionId}
          onHighlightClick={onHighlightClick}
        />{" "}
        payable over the term of{" "}
        <ExtractionHighlight
          extractionId="lease-expiration"
          entityKeys={["expiration_date", "end_date", "term_end"]}
          fallback="December 31, 2030"
          extractions={extractions}
          entityMap={entityMap}
          activeExtractionId={activeExtractionId}
          onHighlightClick={onHighlightClick}
        />
        , with a security deposit of{" "}
        <ExtractionHighlight
          extractionId="lease-deposit"
          entityKeys={["security_deposit", "deposit", "amount"]}
          fallback="$120,000"
          extractions={extractions}
          entityMap={entityMap}
          activeExtractionId={activeExtractionId}
          onHighlightClick={onHighlightClick}
        />
        .
      </p>

      <div className="mt-6 pt-4 border-t border-slate-200">
        <p className="text-justify">
          <strong>Section 14. Termination.</strong> Either party may terminate this Agreement by
          providing{" "}
          <ExtractionHighlight
            extractionId="lease-notice"
            entityKeys={["notice_period", "termination_notice", "obligation"]}
            fallback="90 days written notice"
            extractions={extractions}
            entityMap={entityMap}
            activeExtractionId={activeExtractionId}
            onHighlightClick={onHighlightClick}
          />{" "}
          to the other party. This Agreement shall be governed by the laws of the{" "}
          <ExtractionHighlight
            extractionId="lease-jurisdiction"
            entityKeys={["governing_law", "jurisdiction", "state"]}
            fallback="State of New York"
            extractions={extractions}
            entityMap={entityMap}
            activeExtractionId={activeExtractionId}
            onHighlightClick={onHighlightClick}
          />
          .
        </p>
      </div>
    </div>
  );
}

export function isLeaseStyledPreviewDocument(name?: string): boolean {
  if (!name) return false;
  const normalized = name.toLowerCase();
  return normalized.includes("lease") || normalized.includes("master lease");
}
