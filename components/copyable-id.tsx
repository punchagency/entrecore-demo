"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

interface CopyableIdProps {
  /** What the ID is, e.g. "Correlation ID" or "Run ID". */
  label: string;
  value: string;
  className?: string;
}

/** A labelled ID support can search the logs for, with a copy button. */
export function CopyableId({ label, value, className }: CopyableIdProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(`Couldn't copy the ${label.toLowerCase()}. Select it and copy it manually.`);
    }
  };

  return (
    <span className={cn("inline-flex items-center gap-1 min-w-0", className)}>
      <span className="whitespace-nowrap">{label}</span>
      <code className="font-mono text-slate-700 select-all break-all">{value}</code>
      <button
        type="button"
        onClick={(event) => {
          // IDs often sit inside clickable rows; copying shouldn't open the row.
          event.stopPropagation();
          void copy();
        }}
        className="p-0.5 rounded hover:bg-slate-200/70 text-slate-500 hover:text-slate-700"
        aria-label={`Copy ${label.toLowerCase()}`}
        title={`Copy ${label.toLowerCase()}`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}
