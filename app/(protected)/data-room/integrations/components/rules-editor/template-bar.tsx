"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FilePlus2,
  FolderOpen,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useCreateJobFromTemplate,
  useIntegrationTemplates,
  useSaveTemplate,
} from "../../hooks/use-integration-rules";
import {
  useIntegrationDestinations,
  useIntegrationJobs,
  useUpdateIntegrationJob,
} from "../../hooks/use-data-integrations";
import type { IntegrationJob } from "../../services/data-integration-api";
import { ruleErrorMessage } from "../../services/rules-api";

/**
 * Save this job's whole setup, or start a new job from a saved one.
 *
 * COPY semantics, and the wording says so — "New from template", never "uses".
 * A clone is independent the moment it exists; editing the template afterwards
 * changes nothing already created. That is the opposite of the rule set bar
 * above it, where a job REFERENCES shared rules at a pinned version, and the
 * two sitting near each other is exactly why the words have to differ.
 */

interface Props {
  /**
   * The job to save. Optional, and that matters: creating a job FROM a
   * template is most useful when there is no job yet, so gating the whole bar
   * on one hid the feature at precisely the moment someone wanted it.
   */
  jobId?: string | null;
  /** Where to send someone after a clone is created. */
  onJobCreated?: (jobId: string) => void;
  /**
   * Load an existing job into this screen.
   *
   * Without it there is no way back to a job you already made: the Integrate
   * tab only ever set its job from "Suggest Mappings" or from localStorage, so
   * on another browser — or after clearing site data — a perfectly good job was
   * unreachable and the only route forward was to suggest mappings again.
   */
  onSelectJob?: (jobId: string) => void | Promise<void>;
}

/**
 * What to call a job on screen.
 *
 * `name` is a slug — the Integrate tab defaults it to "ocr_staging_to_target"
 * and most people never change it, so a list keyed on it shows the same string
 * a dozen times over. `description` is free text, already on the model and
 * already updatable, so it doubles as the alias: no column, no migration.
 */
export function jobAlias(job: IntegrationJob): string {
  return job.description?.trim() || job.name;
}

/** "bigquery → Service Providers" — the part that actually distinguishes two jobs. */
function jobRoute(job: IntegrationJob): string {
  const from = job.source_table || job.source_type || "source";
  return `${from} → ${job.destination_table}`;
}

/** Rows per page in the job picker. Enough to scan without scrolling far. */
const JOBS_PER_PAGE = 20;

export function TemplateBar({ jobId, onJobCreated, onSelectJob }: Props) {
  const { data: templates } = useIntegrationTemplates();
  const renameJob = useUpdateIntegrationJob();
  const save = useSaveTemplate();
  const create = useCreateJobFromTemplate();

  const [saveOpen, setSaveOpen] = useState(false);
  const [useOpen, setUseOpen] = useState(false);
  const [openJobOpen, setOpenJobOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chosen, setChosen] = useState<string>("");
  const [newJobName, setNewJobName] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [jobPage, setJobPage] = useState(1);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState("");

  // Debounced so a search is one request per pause, not one per keystroke.
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(jobSearch);
      // A new term makes the old page number meaningless — page 3 of the
      // previous results is usually past the end of the new ones, which shows
      // an empty list and reads as "no matches".
      setJobPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [jobSearch]);

  const { data: jobs, isFetching: jobsFetching } = useIntegrationJobs(
    jobPage,
    JOBS_PER_PAGE,
    searchTerm
  );

  // EP-947: the reference name a steward gave a job when they activated it. That
  // is the name people recognise — a job's own `name` is usually a generated slug
  // like "ocr_staging_to_target", and several jobs share it. Keyed by
  // current_job_id, which the backend re-points on every job edit, so the label
  // follows a job across versions rather than going stale at v2.
  const { data: destinations } = useIntegrationDestinations();
  const activatedNameByJobId = useMemo(() => {
    const byJob = new Map<string, string>();
    for (const destination of destinations ?? []) {
      if (destination.current_job_id) {
        byJob.set(destination.current_job_id, destination.reference_name);
      }
    }
    return byJob;
  }, [destinations]);

  // Server-ordered (newest first) and server-filtered; re-sorting here would
  // only reorder within the page, which is worse than one consistent order.
  const visibleJobs: IntegrationJob[] = useMemo(() => jobs?.jobs ?? [], [jobs]);
  const totalJobs = jobs?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalJobs / JOBS_PER_PAGE));
  const firstOnPage = totalJobs === 0 ? 0 : (jobPage - 1) * JOBS_PER_PAGE + 1;
  const lastOnPage = Math.min(jobPage * JOBS_PER_PAGE, totalJobs);

  /**
   * Load the picked job, and hold the dialog open until it has.
   *
   * Closing on click looked broken: loading a job is a round trip plus a dozen
   * state writes, so the screen behind sat unchanged for a beat with nothing to
   * say it was working. The row shows its own spinner instead, and the dialog
   * closes when there is actually something new behind it.
   */
  async function pickJob(id: string) {
    if (opening) return;
    setOpening(id);
    try {
      await onSelectJob?.(id);
      setOpenJobOpen(false);
    } catch (err) {
      // Deliberately leaves the dialog open — the list is where they retry.
      toast.error(ruleErrorMessage(err, "Could not open that job."));
    } finally {
      setOpening(null);
    }
  }

  function saveAlias(job: IntegrationJob) {
    const next = aliasDraft.trim();
    setRenaming(null);
    if (next === (job.description ?? "").trim()) return;
    renameJob.mutate(
      { id: job.id, data: { description: next } },
      {
        onSuccess: (updated) => {
          toast.success(next ? `Renamed to “${next}”.` : "Alias cleared.");
          // A new version does not inherit created_at, so the renamed job sorts
          // to the very top. Renaming from page 3 would otherwise look like the
          // row had been deleted — it moved to page 1.
          setJobPage(1);
          // Any edit mints a new job version with a NEW id and soft-deletes the
          // old row. Renaming the job that is currently open would otherwise
          // leave this screen pointing at a soft-deleted id, so follow it.
          if (job.id === jobId && updated.id !== job.id) onSelectJob?.(updated.id);
        },
        onError: (err) => toast.error(ruleErrorMessage(err, "Could not rename the job.")),
      }
    );
  }

  function doSave() {
    if (!jobId) {
      toast.error("Create or pick a job first — a template is saved from one.");
      return;
    }
    if (!name.trim()) {
      toast.error("Give the template a name — it is how people find it in the list.");
      return;
    }
    save.mutate(
      { jobId, name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Saved as “${name.trim()}”. New jobs can start from it.`);
          setSaveOpen(false);
          setName("");
          setDescription("");
        },
        // The 400 here is worth showing verbatim: the common one explains that
        // the job's rules must be promoted to a rule set first, and why.
        onError: (err) => toast.error(ruleErrorMessage(err, "Could not save the template.")),
      }
    );
  }

  function doCreate() {
    if (!chosen) {
      toast.error("Pick a template first.");
      return;
    }
    if (!newJobName.trim()) {
      toast.error("Name the new job.");
      return;
    }
    create.mutate(
      { templateId: chosen, name: newJobName.trim() },
      {
        onSuccess: (result) => {
          toast.success(result.message);
          setUseOpen(false);
          setNewJobName("");
          onJobCreated?.(result.job_id);
        },
        onError: (err) => toast.error(ruleErrorMessage(err, "Could not create the job.")),
      }
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <Copy className="h-4 w-4 text-slate-400" />
      <span className="text-xs font-bold text-slate-700">Job templates</span>
      <span className="text-xs text-slate-500">
        the whole setup — source, destination, mappings and schedule — saved under a
        name, to create more jobs like this one.
      </span>

      {/* Deliberately NOT disabled when the list is empty. It was, and the
          result was that someone with no templates yet could see no way to
          reach them at all — the empty state inside the dialog is what explains
          how to get one, so it has to be openable. */}
      {onSelectJob && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto h-8 text-[11px]"
          onClick={() => setOpenJobOpen(true)}
        >
          <FolderOpen className="mr-1 h-3 w-3" />
          Open an existing job
        </Button>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className={onSelectJob ? "h-8 text-[11px]" : "ml-auto h-8 text-[11px]"}
        onClick={() => setUseOpen(true)}
      >
        <FilePlus2 className="mr-1 h-3 w-3" />
        New job from a template
        {templates?.items.length ? (
          <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-600">
            {templates.items.length}
          </span>
        ) : null}
      </Button>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 text-[11px]"
        onClick={() => setSaveOpen(true)}
        disabled={!jobId}
        title={
          jobId
            ? "Saves this job's whole setup under a name you choose"
            : "Create or pick a job first — a template is saved from one"
        }
      >
        <Copy className="mr-1 h-3 w-3" />
        Save this job as a template
      </Button>

      {/* -- save -- */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this setup as a template</DialogTitle>
            <DialogDescription>
              New jobs can start from it. A copy, not a link — editing the template later
              will not change any job already created from it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Payroll to Engagements"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="What it sets up, in a sentence"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-[11px] text-slate-500">
              Approvals, locks and the source file stay behind — a job created from this
              starts as an unapproved draft with its schedule off.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={doSave} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- use -- */}
      <Dialog open={useOpen} onOpenChange={setUseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New job from a template</DialogTitle>
            <DialogDescription>
              Creates a draft you can review before activating.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[280px] space-y-2 overflow-y-auto">
            {!templates?.items.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center text-xs text-slate-500">
                <p className="font-medium text-slate-700">No templates saved yet.</p>
                <p className="mt-1">
                  Set a job up the way you want it, then use{" "}
                  <strong>Save this job as a template</strong> to name it. It will appear
                  here for every job you create afterwards.
                </p>
              </div>
            )}
            {templates?.items.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setChosen(template.id)}
                className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                  chosen === template.id
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-200 hover:border-blue-200"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{template.name}</span>
                  {template.uses_rule_set && (
                    <Badge variant="outline" className="bg-white text-[10px]">
                      matching rules
                    </Badge>
                  )}
                  <span className="ml-auto text-[11px] text-slate-500">
                    used {template.times_used}×
                  </span>
                </div>
                {template.description && (
                  <p className="mt-1 text-[11px] text-slate-500">{template.description}</p>
                )}
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  {template.source_type} → {template.destination_table} ·{" "}
                  {template.mapping_count} mapping
                  {template.mapping_count === 1 ? "" : "s"}
                </p>
              </button>
            ))}
          </div>

          <Input
            placeholder="Name for the new job"
            value={newJobName}
            onChange={(e) => setNewJobName(e.target.value)}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setUseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={doCreate} disabled={create.isPending || !chosen}>
              {create.isPending ? "Creating…" : "Create draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -- open an existing job -- */}
      <Dialog open={openJobOpen} onOpenChange={setOpenJobOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open an existing job</DialogTitle>
            <DialogDescription>
              Every job you have made, newest first. Opening one loads its mappings and
              matching rules here — nothing is re-created, and nothing runs until you say
              so.
            </DialogDescription>
          </DialogHeader>

          <Input
            placeholder="Search by reference name, alias or table"
            value={jobSearch}
            onChange={(e) => setJobSearch(e.target.value)}
          />

          <div className="max-h-[320px] space-y-2 overflow-y-auto">
            {!visibleJobs.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center text-xs text-slate-500">
                {jobsFetching
                  ? "Loading…"
                  : searchTerm.trim()
                    ? "No job matches that — the search covers every job, not just this page."
                    : "No jobs yet — run Suggest Mappings to make the first one."}
              </div>
            )}

            {visibleJobs.map((job) => {
              const isCurrent = job.id === jobId;
              const isRenaming = renaming === job.id;
              return (
                <div
                  key={job.id}
                  className={`rounded-2xl border p-3 transition-colors ${
                    isCurrent ? "border-blue-400 bg-blue-50" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {isRenaming ? (
                      <>
                        <Input
                          autoFocus
                          className="h-7 flex-1 text-xs"
                          placeholder="A name you will recognise"
                          value={aliasDraft}
                          onChange={(e) => setAliasDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveAlias(job);
                            if (e.key === "Escape") setRenaming(null);
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => saveAlias(job)}
                          title="Save this name"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => setRenaming(null)}
                          title="Cancel"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="flex-1 text-left disabled:opacity-60"
                          disabled={Boolean(opening)}
                          onClick={() => pickJob(job.id)}
                        >
                          <span className="text-sm font-bold text-slate-900">
                            {/* The activation reference name when there is one —
                                see activatedNameByJobId. Falls back to the alias
                                for jobs activated before naming existed, or never
                                named at all. */}
                            {activatedNameByJobId.get(job.id) ?? jobAlias(job)}
                          </span>
                          {opening === job.id && (
                            <span className="ml-2 text-[11px] font-normal text-slate-500">
                              opening…
                            </span>
                          )}
                        </button>
                        {isCurrent && (
                          <Badge variant="outline" className="bg-white text-[10px]">
                            open now
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-white text-[10px]">
                          {job.status.replace(/_/g, " ")}
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => {
                            setRenaming(job.id);
                            setAliasDraft(job.description ?? "");
                          }}
                          title="Give this job a name you will recognise"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">
                    {/* When the reference name is showing above, the job's own
                        alias moves down here rather than disappearing — two jobs
                        can share a route, and someone renaming one needs to still
                        see which is which. */}
                    {activatedNameByJobId.has(job.id) && `${jobAlias(job)} · `}
                    {jobRoute(job)} · v{job.version} · {job.column_mappings?.length ?? 0}{" "}
                    mapping{job.column_mappings?.length === 1 ? "" : "s"}
                  </p>
                </div>
              );
            })}
          </div>

          <DialogFooter className="sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => setJobPage((page) => Math.max(1, page - 1))}
                disabled={jobPage <= 1}
                title="Previous page"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-[11px] tabular-nums text-slate-500">
                {totalJobs === 0
                  ? "0 jobs"
                  : `${firstOnPage}–${lastOnPage} of ${totalJobs}`}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => setJobPage((page) => Math.min(pageCount, page + 1))}
                disabled={jobPage >= pageCount}
                title="Next page"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
            <Button variant="outline" onClick={() => setOpenJobOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
