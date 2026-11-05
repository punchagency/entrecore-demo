import type { ExtractionResult } from "@/app/store/abstractionStore";

export interface HighlightStyle {
  bg: string;
  border: string;
  hoverBg: string;
  dot: string;
  label: string;
}

export function getConfidenceHighlightStyle(confidence: number): HighlightStyle {
  if (confidence >= 0.95) {
    return {
      bg: "bg-emerald-100",
      border: "border-emerald-500",
      hoverBg: "hover:bg-emerald-200",
      dot: "bg-emerald-500",
      label: "High",
    };
  }
  if (confidence >= 0.85) {
    return {
      bg: "bg-blue-100",
      border: "border-blue-500",
      hoverBg: "hover:bg-blue-200",
      dot: "bg-blue-500",
      label: "Medium",
    };
  }
  if (confidence >= 0.7) {
    return {
      bg: "bg-amber-100",
      border: "border-amber-500",
      hoverBg: "hover:bg-amber-200",
      dot: "bg-amber-500",
      label: "Low",
    };
  }
  return {
    bg: "bg-orange-100",
    border: "border-orange-500",
    hoverBg: "hover:bg-orange-200",
    dot: "bg-orange-500",
    label: "Very Low",
  };
}

export function getEntityTypeHighlightStyle(entityType?: string, entityColor?: string): HighlightStyle | null {
  if (entityColor) {
    return null;
  }

  switch (entityType?.toLowerCase()) {
    case "date":
      return getConfidenceHighlightStyle(0.96);
    case "party_name":
      return getConfidenceHighlightStyle(0.9);
    case "amount":
    case "percentage":
      return getConfidenceHighlightStyle(0.75);
    case "address":
      return {
        bg: "bg-pink-100",
        border: "border-pink-500",
        hoverBg: "hover:bg-pink-200",
        dot: "bg-pink-500",
        label: "Address",
      };
    case "obligation":
    case "term":
      return {
        bg: "bg-cyan-100",
        border: "border-cyan-500",
        hoverBg: "hover:bg-cyan-200",
        dot: "bg-cyan-500",
        label: "Term",
      };
    case "jurisdiction":
      return {
        bg: "bg-indigo-100",
        border: "border-indigo-500",
        hoverBg: "hover:bg-indigo-200",
        dot: "bg-indigo-500",
        label: "Jurisdiction",
      };
    default:
      return null;
  }
}

export function resolveExtractionHighlightStyle(
  extraction: Pick<ExtractionResult, "confidence" | "status">,
  options?: { entityType?: string; entityColor?: string }
): HighlightStyle {
  if (extraction.status === "reviewed") {
    return getConfidenceHighlightStyle(0.96);
  }
  if (extraction.status === "corrected") {
    return getConfidenceHighlightStyle(0.72);
  }
  if (extraction.status === "rejected") {
    return {
      bg: "bg-rose-100",
      border: "border-rose-500",
      hoverBg: "hover:bg-rose-200",
      dot: "bg-rose-500",
      label: "Rejected",
    };
  }

  const byType = getEntityTypeHighlightStyle(options?.entityType, options?.entityColor);
  if (byType) return byType;

  return getConfidenceHighlightStyle(extraction.confidence ?? 0);
}

export function getPdfOverlayColors(
  comment: string,
  confidence?: number,
  entityColor?: string
): { fill: string; border: string; tooltipBg: string; edited: boolean } {
  if (comment.includes("[REJECTED]")) {
    return {
      fill: "rgba(244, 63, 94, 0.22)",
      border: "rgb(244, 63, 94)",
      tooltipBg: "#e11d48",
      edited: false,
    };
  }
  if (comment.includes("[CORRECTED:")) {
    return {
      fill: "rgba(251, 191, 36, 0.28)",
      border: "rgb(245, 158, 11)",
      tooltipBg: "#d97706",
      edited: true,
    };
  }
  if (comment.includes("[REVIEWED]")) {
    return {
      fill: "rgba(52, 211, 153, 0.28)",
      border: "rgb(16, 185, 129)",
      tooltipBg: "#059669",
      edited: false,
    };
  }

  if (entityColor) {
    return {
      fill: `${entityColor}33`,
      border: entityColor,
      tooltipBg: entityColor,
      edited: false,
    };
  }

  const conf = confidence ?? 0.9;
  if (conf >= 0.95) {
    return {
      fill: "rgba(52, 211, 153, 0.28)",
      border: "rgb(16, 185, 129)",
      tooltipBg: "#059669",
      edited: false,
    };
  }
  if (conf >= 0.85) {
    return {
      fill: "rgba(96, 165, 250, 0.28)",
      border: "rgb(59, 130, 246)",
      tooltipBg: "#2563eb",
      edited: false,
    };
  }
  if (conf >= 0.7) {
    return {
      fill: "rgba(251, 191, 36, 0.3)",
      border: "rgb(245, 158, 11)",
      tooltipBg: "#d97706",
      edited: false,
    };
  }
  return {
    fill: "rgba(251, 146, 60, 0.28)",
    border: "rgb(249, 115, 22)",
    tooltipBg: "#ea580c",
    edited: false,
  };
}
