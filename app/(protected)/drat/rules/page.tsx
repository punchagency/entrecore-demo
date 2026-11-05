"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Route,
  Upload,
  RefreshCw,
  Search,
  FileText,
  Plus,
  Trash2,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import { DratSectionNav } from "../components/drat-section-nav";
import { RoutingRulesImportHelpDialog } from "../components/routing-rules-import-help-dialog";
import { RoutingRulesSortableTable } from "../components/routing-rules-sortable-table";
import {
  RoutingRuleConditionBuilder,
  describeConditions,
  emptyLeafCondition,
  pruneConditions,
} from "../components/routing-rule-condition-builder";
import {
  useRoutingRules,
  useCreateRoutingRule,
  useUpdateRoutingRule,
  useDeleteRoutingRule,
  useDeleteAllRoutingRules,
  useDuplicateRoutingRule,
  useReorderRoutingRules,
  useImportRoutingRules,
  RoutingRule,
  RoutingRuleCondition,
} from "../hooks/use-routing-rules";
import { PageWrapper } from "@/components/page-wrapper";
import { QueryErrorState } from "@/components/query-error-state";

type RuleFormState = {
  rule_id: string;
  pattern: string;
  target_folder: string;
  description: string;
  match_mode: "all" | "any";
  conditions: RoutingRuleCondition[];
  useConditions: boolean;
};

const emptyForm: RuleFormState = {
  rule_id: "",
  pattern: "",
  target_folder: "",
  description: "",
  match_mode: "all",
  conditions: [emptyLeafCondition()],
  useConditions: false,
};

const IMPORT_EXTENSIONS = [".json", ".hazelrules", ".plist"];

function isAllowedImportFile(filename: string) {
  const lower = filename.toLowerCase();
  return IMPORT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function importFileLabel(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".hazelrules") || lower.endsWith(".plist")) return "Hazel export";
  return "JSON rules";
}

function slugifyRuleId(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `rule-${slug}` : "";
}

export default function DratRoutingRulesPage() {
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clearOnImport, setClearOnImport] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [formatHelpOpen, setFormatHelpOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [form, setForm] = useState<RuleFormState>(emptyForm);
  const [ruleIdTouched, setRuleIdTouched] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoutingRule | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useRoutingRules({
    search: search.trim() || undefined,
    limit: 200,
  });

  const createMutation = useCreateRoutingRule();
  const updateMutation = useUpdateRoutingRule();
  const deleteMutation = useDeleteRoutingRule();
  const deleteAllMutation = useDeleteAllRoutingRules();
  const duplicateMutation = useDuplicateRoutingRule();
  const reorderMutation = useReorderRoutingRules();
  const importMutation = useImportRoutingRules();

  const rules = useMemo(
    () => [...(data?.rules || [])].sort((a, b) => a.priority - b.priority),
    [data?.rules]
  );

  const openCreate = () => {
    setEditingRule(null);
    setForm(emptyForm);
    setRuleIdTouched(false);
    setEditorOpen(true);
  };

  const openEdit = (rule: RoutingRule) => {
    setEditingRule(rule);
    const hasConditions = Boolean(rule.conditions && rule.conditions.length > 0);
    setForm({
      rule_id: rule.rule_id,
      pattern: rule.pattern || "",
      target_folder: rule.target_folder,
      description: rule.description || "",
      match_mode: rule.match_mode || "any",
      conditions: hasConditions ? rule.conditions! : [emptyLeafCondition()],
      useConditions: hasConditions,
    });
    setRuleIdTouched(true);
    setEditorOpen(true);
  };

  const formatRuleMatchSummary = (rule: RoutingRule) => {
    if (rule.conditions && rule.conditions.length > 0) {
      return describeConditions(rule.conditions, rule.match_mode);
    }
    return rule.pattern;
  };

  const handlePatternChange = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, pattern: value };
      if (!editingRule && !ruleIdTouched) {
        next.rule_id = slugifyRuleId(value);
      }
      return next;
    });
  };

  const handleSave = () => {
    const trimmedConditions = form.useConditions ? pruneConditions(form.conditions) : [];

    if (!form.rule_id.trim() || !form.target_folder.trim()) {
      toast.error("Rule ID and target folder are required");
      return;
    }

    if (!form.useConditions && !form.pattern.trim()) {
      toast.error("Add a pattern or switch to compound conditions");
      return;
    }

    if (form.useConditions && trimmedConditions.length === 0) {
      toast.error("Add at least one condition with a value");
      return;
    }

    const payload = {
      rule_id: form.rule_id.trim(),
      pattern: form.useConditions ? "" : form.pattern.trim(),
      target_folder: form.target_folder.trim(),
      description: form.description.trim() || undefined,
      match_mode: form.match_mode,
      conditions: form.useConditions ? trimmedConditions : undefined,
      source: "ui",
    };

    if (editingRule) {
      updateMutation.mutate(
        { id: editingRule.id, payload },
        {
          onSuccess: () => {
            toast.success("Rule updated");
            setEditorOpen(false);
          },
          onError: (err: any) => {
            showApiErrorToast(err, "Failed to update rule");
          },
        }
      );
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Rule created");
        setEditorOpen(false);
      },
      onError: (err: any) => {
        showApiErrorToast(err, "Failed to create rule");
      },
    });
  };

  const handleDelete = (rule: RoutingRule) => {
    setDeleteTarget(rule);
  };

  const confirmDeleteRule = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Rule deleted");
        setDeleteTarget(null);
      },
      onError: (err: any) => {
        showApiErrorToast(err, "Failed to delete rule");
      },
    });
  };

  const confirmDeleteAll = () => {
    deleteAllMutation.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(
          res.deleted_count === 1
            ? "Deleted 1 routing rule"
            : `Deleted ${res.deleted_count} routing rules`
        );
        setDeleteAllOpen(false);
      },
      onError: (err: any) => {
        showApiErrorToast(err, "Failed to delete all rules");
      },
    });
  };

  const handleDuplicate = (rule: RoutingRule) => {
    duplicateMutation.mutate(rule.id, {
      onSuccess: () => toast.success("Rule duplicated"),
      onError: (err: any) => {
        showApiErrorToast(err, "Failed to duplicate rule");
      },
    });
  };

  const handleReorder = (orderedIds: string[]) => {
    reorderMutation.mutate(orderedIds, {
      onSuccess: () => toast.success("Rule order updated"),
      onError: (err: any) => {
        showApiErrorToast(err, "Failed to reorder rules");
      },
    });
  };

  const handleImportDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && isAllowedImportFile(file.name)) {
      setSelectedFile(file);
    } else {
      toast.error("Upload a .json, .hazelrules, or .plist file");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isAllowedImportFile(file.name)) {
      setSelectedFile(file);
    } else {
      toast.error("Upload a .json, .hazelrules, or .plist file");
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    setImportErrors([]);
    importMutation.mutate(
      { file: selectedFile, clearExisting: clearOnImport },
      {
        onSuccess: (res) => {
          if (res.errors?.length) {
            setImportErrors(res.errors);
          }
          if (res.success) {
            const normCount = Array.isArray(
              (res.validation_report as Record<string, unknown> | undefined)?.path_normalizations
            )
              ? ((res.validation_report as Record<string, unknown>).path_normalizations as unknown[]).length
              : 0;
            toast.success(
              normCount > 0
                ? `Imported ${res.imported_count} rules (${normCount} paths normalized for entity Drive roots)`
                : `Imported ${res.imported_count} rules`
            );
          } else {
            toast.warning(`Imported ${res.imported_count} rules with ${res.errors.length} errors`);
          }
          setSelectedFile(null);
          refetch();
        },
        onError: (err: any) => {
          showApiErrorToast(err, "Failed to import rules");
        },
      }
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <PageWrapper title="Rules">
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="w-full p-6 space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                  <Route className="h-6 w-6 text-indigo-300" />
                </div>
                <Badge
                  variant="outline"
                  className="border-indigo-400 text-indigo-300 font-medium tracking-wide bg-indigo-950/30"
                >
                  DRAT Admin
                </Badge>
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                Routing Rules
              </h1>
              <p className="text-indigo-100/80 leading-relaxed max-w-xl">
                Define filename patterns or stacked conditions (AND/OR). Rules are evaluated in priority order — first match wins.
              </p>
            </div>
            <Button
              onClick={openCreate}
              className="bg-white text-indigo-950 hover:bg-indigo-50 rounded-xl h-11 px-5 shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </div>

        <DratSectionNav active="rules" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {importOpen && (
            <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm lg:col-span-1 h-fit">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="h-5 w-5 text-indigo-600" />
                    Import Rules
                  </h2>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    JSON rules file (recommended) or Hazel <code className="text-xs bg-slate-100 px-1 rounded">.hazelrules</code> migration
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl shrink-0 text-xs h-9"
                  onClick={() => setFormatHelpOpen(true)}
                >
                  <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                  Format guide
                </Button>
              </div>

              <div
                onDragEnter={handleImportDrag}
                onDragOver={handleImportDrag}
                onDragLeave={handleImportDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[160px] ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50/50 scale-[0.98]"
                    : selectedFile
                    ? "border-emerald-500 bg-emerald-50/10"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}
              >
                <input
                  type="file"
                  id="rules-file-upload"
                  accept=".json,.hazelrules,.plist,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-100/80 text-emerald-700 rounded-2xl inline-flex">
                      <FileText className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 max-w-[220px] truncate mx-auto">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-slate-500">{importFileLabel(selectedFile.name)}</p>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="rules-file-upload"
                    className="cursor-pointer space-y-3 w-full flex flex-col items-center"
                  >
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Drag & drop rules file</p>
                    <p className="text-[10px] text-slate-400">.json (recommended), .hazelrules, or .plist</p>
                  </label>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={clearOnImport}
                  onChange={(e) => setClearOnImport(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Replace existing rules before import
              </label>

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || importMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11"
              >
                {importMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Rules
                  </>
                )}
              </Button>

              {importErrors.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                  <p className="text-sm font-semibold text-amber-900">Import issues</p>
                  <ul className="text-xs text-amber-900/90 space-y-1 max-h-32 overflow-y-auto">
                    {importErrors.slice(0, 8).map((err) => (
                      <li key={err} className="leading-relaxed">
                        {err}
                      </li>
                    ))}
                    {importErrors.length > 8 ? (
                      <li className="text-amber-800/80">…and {importErrors.length - 8} more</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
          )}

          <Card className={`border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm ${importOpen ? 'lg:col-span-2' : 'lg:col-span-3'} overflow-hidden`}>
            <CardContent className="p-0">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search rules, patterns, folders..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 rounded-xl border-slate-200 focus-visible:ring-indigo-500 bg-slate-50/50"
                  />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    variant={importOpen ? "secondary" : "outline"}
                    size="sm"
                    className={`rounded-xl ${importOpen ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-transparent" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    onClick={() => setImportOpen(!importOpen)}
                  >
                    <Upload className="h-4 w-4 mr-1.5" />
                    Import Rules
                  </Button>
                  {(data?.total || 0) > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => setDeleteAllOpen(true)}
                      disabled={deleteAllMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete all
                    </Button>
                  ) : null}
                  <div className="text-xs text-slate-500 font-semibold">
                    {isLoading ? "Loading..." : `${data?.total || 0} routing rules`}
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : isError ? (
                <QueryErrorState
                  error={error}
                  title="Couldn't load routing rules"
                  onRetry={() => refetch()}
                  isRetrying={isFetching}
                />
              ) : rules.length === 0 ? (
                <div className="py-20 text-center">
                  <Route className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No routing rules yet</h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto mb-4">
                    Add a rule manually or import a Hazel export or JSON file to configure DRAT filing behavior.
                  </p>
                  <Button onClick={openCreate} className="rounded-xl bg-indigo-600 hover:bg-indigo-500">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Rule
                  </Button>
                </div>
              ) : (
                <RoutingRulesSortableTable
                  rules={rules}
                  reorderPending={reorderMutation.isPending}
                  duplicatePending={duplicateMutation.isPending}
                  deletePending={deleteMutation.isPending}
                  formatRuleMatchSummary={formatRuleMatchSummary}
                  onReorder={handleReorder}
                  onEdit={openEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Routing Rule" : "Add Routing Rule"}</DialogTitle>
            <DialogDescription>
              Use a simple filename pattern or Hazel-style stacked conditions with AND/OR matching.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rule_id">Rule ID</Label>
              <Input
                id="rule_id"
                value={form.rule_id}
                onChange={(e) => {
                  setRuleIdTouched(true);
                  setForm((prev) => ({ ...prev, rule_id: e.target.value }));
                }}
                placeholder="rule-409a-valuation"
                className="rounded-xl"
              />
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-4 bg-slate-50/40">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Matching</p>
                  <p className="text-[11px] text-slate-500">
                    Simple pattern or compound conditions (filename + document text).
                  </p>
                </div>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-semibold ${
                      !form.useConditions ? "bg-indigo-600 text-white" : "text-slate-600"
                    }`}
                    onClick={() => setForm((prev) => ({ ...prev, useConditions: false }))}
                  >
                    Pattern
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs font-semibold ${
                      form.useConditions ? "bg-indigo-600 text-white" : "text-slate-600"
                    }`}
                    onClick={() => setForm((prev) => ({ ...prev, useConditions: true }))}
                  >
                    Conditions
                  </button>
                </div>
              </div>

              {!form.useConditions ? (
                <div className="space-y-2">
                  <Label htmlFor="pattern">Pattern</Label>
                  <Input
                    id="pattern"
                    value={form.pattern}
                    onChange={(e) => handlePatternChange(e.target.value)}
                    placeholder="409a valuation"
                    className="rounded-xl font-mono text-sm bg-white"
                  />
                  <p className="text-[11px] text-slate-500">
                    Substring match by default. Use <code>/regex/</code> or <code>&quot;exact name&quot;</code> for advanced matching.
                  </p>
                </div>
              ) : (
                <RoutingRuleConditionBuilder
                  conditions={form.conditions}
                  matchMode={form.match_mode}
                  onMatchModeChange={(value) =>
                    setForm((prev) => ({ ...prev, match_mode: value }))
                  }
                  onChange={(conditions) => setForm((prev) => ({ ...prev, conditions }))}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_folder">Target Folder</Label>
              <Input
                id="target_folder"
                value={form.target_folder}
                onChange={(e) => setForm((prev) => ({ ...prev, target_folder: e.target.value }))}
                placeholder="Corporate / Valuations"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="409A valuation reports"
                className="rounded-xl min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="rounded-xl bg-indigo-600 hover:bg-indigo-500">
              {isSaving ? "Saving..." : editingRule ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RoutingRulesImportHelpDialog open={formatHelpOpen} onOpenChange={setFormatHelpOpen} />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Delete routing rule?</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              <span className="font-semibold">{deleteTarget?.rule_id}</span>. Documents already
              filed to Drive are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteRule}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Delete all routing rules?</DialogTitle>
            <DialogDescription>
              This permanently removes all{" "}
              <span className="font-semibold">{data?.total || rules.length}</span> routing rules for
              this company. Use this before a clean re-import, or to reset DRAT filing behavior.
              Documents already filed to Drive are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteAllOpen(false)}
              disabled={deleteAllMutation.isPending}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteAll}
              disabled={deleteAllMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {deleteAllMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete All Rules
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PageWrapper>
  );
}
