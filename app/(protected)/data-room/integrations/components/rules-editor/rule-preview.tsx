"use client";

import { useState } from "react";
import { AlertTriangle, Play } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDryRunRules } from "../../hooks/use-integration-rules";
import { ruleErrorMessage } from "../../services/rules-api";
import type { DryRunResult, RuleDocument } from "../../services/rules-api";

/**
 * Try the rules against real records before committing to them.
 *
 * A visual rule builder whose behaviour you cannot preview is a liability: the
 * author saves, the run happens, and the first feedback is whatever landed in
 * the destination. This closes that loop.
 *
 * It previews the DRAFT — whatever is currently on screen, saved or not — which
 * is the whole point. It reads the destination (a preview against imaginary
 * candidates would teach you nothing) and writes nothing.
 */

interface Props {
  jobId: string;
  document: RuleDocument;
  incomingFields: string[];
}

const ACTION_STYLES: Record<string, string> = {
  insert: "bg-emerald-50 text-emerald-700 border-emerald-200",
  update: "bg-blue-50 text-blue-700 border-blue-200",
  merge: "bg-indigo-50 text-indigo-700 border-indigo-200",
  human: "bg-amber-50 text-amber-800 border-amber-200",
  // Red, and deliberately louder than `human`: "should not be added" is a
  // different message from "please pick which row".
  flag: "bg-red-50 text-red-700 border-red-300",
  skip: "bg-slate-100 text-slate-600 border-slate-200",
  continue: "bg-slate-50 text-slate-500 border-slate-200",
};

const ACTION_WORDS: Record<string, string> = {
  insert: "Create",
  update: "Update",
  merge: "Fill blanks",
  human: "Ask a person",
  flag: "Flag red",
  skip: "Do nothing",
  continue: "Keep going",
};

export function RulePreview({ jobId, document, incomingFields }: Props) {
  const dryRun = useDryRunRules(jobId);
  const [raw, setRaw] = useState(() => sampleFor(incomingFields));
  const [results, setResults] = useState<DryRunResult[] | null>(null);
  const [scanned, setScanned] = useState<Record<string, number>>({});

  function run() {
    let records: Record<string, unknown>[];
    try {
      const parsed = JSON.parse(raw);
      records = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      toast.error("That is not valid JSON. Paste an array of records.");
      return;
    }
    if (!records.length) {
      toast.error("Add at least one record to try.");
      return;
    }

    dryRun.mutate(
      { records, document },
      {
        onSuccess: (data) => {
          setResults(data.results);
          setScanned(data.scanned);
        },
        onError: (err) => {
          // A failed read is reported, never shown as "matched nothing" — that
          // would suggest the rules are safe to enable when they are not.
          setResults(null);
          toast.error(ruleErrorMessage(err, "The preview could not run."));
        },
      }
    );
  }

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-bold text-slate-900">Try it</h4>
        <span className="text-[11px] text-slate-500">
          Runs the rules on screen against real destination rows. Writes nothing.
        </span>
        <Button
          type="button"
          size="sm"
          className="ml-auto text-xs"
          onClick={run}
          disabled={dryRun.isPending}
        >
          <Play className="mr-1 h-3 w-3" />
          {dryRun.isPending ? "Running…" : "Run preview"}
        </Button>
      </div>

      <Textarea
        className="min-h-[110px] bg-white font-mono text-[11px]"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        spellCheck={false}
      />

      {results && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            {Object.entries(scanned).map(([table, count]) => (
              <span key={table}>
                Read <strong>{count.toLocaleString()}</strong> row
                {count === 1 ? "" : "s"} from <span className="font-mono">{table}</span>
              </span>
            ))}
            {Object.keys(scanned).length === 0 && (
              <span>No table was read — every case appends.</span>
            )}
          </div>

          {results.map((result) => (
            <ResultRow key={result.row_index} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultRow({ result }: { result: DryRunResult }) {
  /**
   * The distinction that matters most on this screen. Both are the `none`
   * bucket, but they are very different situations:
   *
   *   started 0, ended 0 — nothing in the table ever looked like this record
   *   started 1240, ended 0 — you matched real rows and then narrowed them
   *                           away, so creating one probably duplicates a row
   *                           that is sitting right there
   */
  const narrowedAway =
    result.candidate_count === 0 &&
    result.steps.length > 0 &&
    result.steps[0].remaining > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Row {result.row_index + 1}
        </span>
        <Badge
          variant="outline"
          className={`text-[10px] font-bold ${ACTION_STYLES[result.action] ?? ""}`}
        >
          {ACTION_WORDS[result.action] ?? result.action}
        </Badge>
        {result.case_name && (
          <span className="text-[11px] text-slate-500">
            via <strong>{result.case_name}</strong>
          </span>
        )}
        {result.matched_record_id && (
          <span className="font-mono text-[10px] text-slate-400">
            {result.matched_record_id}
          </span>
        )}
      </div>

      {result.steps.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-700">
              {result.started_from.toLocaleString()}
            </span>
            {result.steps.map((step, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-slate-300">→</span>
                <span
                  className={
                    // The condition that ENDED it, highlighted — otherwise a
                    // seven-step funnel gives no clue which one decided.
                    result.decided_at === i ? "font-bold text-slate-800" : "text-slate-500"
                  }
                >
                  {step.label}
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 font-mono font-bold ${
                    step.remaining === 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {step.remaining}
                </span>
                {step.outcome !== "continue" && (
                  <span className="rounded-md border border-slate-300 bg-white px-1 text-[10px] font-bold text-slate-600">
                    {ACTION_WORDS[step.outcome] ?? step.outcome}
                  </span>
                )}
              </span>
            ))}
          </div>
          {result.decided_at == null && (
            <p className="text-[10px] text-slate-400">
              Survived every condition — the final outcomes decided.
            </p>
          )}
        </div>
      )}

      {result.bucket === "always" && (
        <p className="mt-2 text-[11px] text-emerald-700">
          Appended without reading the table.
        </p>
      )}

      {narrowedAway && (
        <p className="mt-2 flex items-start gap-1 text-[11px] font-medium text-amber-700">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {result.started_from.toLocaleString()} row
          {result.started_from === 1 ? "" : "s"} matched at first, then your conditions
          narrowed them to none. Creating a row here may duplicate one that already
          exists.
        </p>
      )}

      {result.reason && (
        <p className="mt-2 text-[11px] text-slate-500">{result.reason}</p>
      )}
    </div>
  );
}

/** A starting sample shaped like the job's own records. */
function sampleFor(incomingFields: string[]): string {
  if (!incomingFields.length) {
    return JSON.stringify([{ Person: "ada@acme.com", Client: "Acme" }], null, 2);
  }
  const record: Record<string, string> = {};
  for (const field of incomingFields.slice(0, 6)) record[field] = "";
  return JSON.stringify([record], null, 2);
}
