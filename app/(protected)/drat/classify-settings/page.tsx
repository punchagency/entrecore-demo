"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { DratSectionNav } from "../components/drat-section-nav";
import {
  useClassifyPrompt,
  useClearClassifyPrompt,
  useClearFilenameTemplates,
  useFilenameTemplates,
  useUpdateClassifyPrompt,
  useUpdateFilenameTemplates,
} from "../hooks/use-classify-settings";
import {
  validateClassifyPrompt,
  validateFilenameTemplates,
} from "../services/classify-settings-validation";
import { PageWrapper } from "@/components/page-wrapper";
import { QueryErrorState } from "@/components/query-error-state";
import { showApiErrorToast } from "@/utils/api-error";

function DefaultBadge({ isDefault }: { isDefault: boolean }) {
  if (isDefault) {
    return (
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
        Platform default
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
      Company override
    </Badge>
  );
}

function ValidationList({ items, variant }: { items: string[]; variant: "error" | "warning" }) {
  if (items.length === 0) return null;
  const styles =
    variant === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-amber-200 bg-amber-50 text-amber-900";
  return (
    <ul className={`rounded-xl border px-4 py-3 text-sm space-y-1.5 ${styles}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DratClassifySettingsPage() {
  const promptQuery = useClassifyPrompt();
  const templatesQuery = useFilenameTemplates();

  const updatePromptMutation = useUpdateClassifyPrompt();
  const clearPromptMutation = useClearClassifyPrompt();
  const updateTemplatesMutation = useUpdateFilenameTemplates();
  const clearTemplatesMutation = useClearFilenameTemplates();

  const [classifyPrompt, setClassifyPrompt] = useState("");
  const [templateDated, setTemplateDated] = useState("");
  const [templateUndated, setTemplateUndated] = useState("");
  const [promptDirty, setPromptDirty] = useState(false);
  const [templatesDirty, setTemplatesDirty] = useState(false);

  useEffect(() => {
    if (promptQuery.data && !promptDirty) {
      setClassifyPrompt(promptQuery.data.classify_prompt);
    }
  }, [promptQuery.data, promptDirty]);

  useEffect(() => {
    if (templatesQuery.data && !templatesDirty) {
      setTemplateDated(templatesQuery.data.filename_template_dated);
      setTemplateUndated(templatesQuery.data.filename_template_undated);
    }
  }, [templatesQuery.data, templatesDirty]);

  const promptValidation = useMemo(() => validateClassifyPrompt(classifyPrompt), [classifyPrompt]);
  const templateErrors = useMemo(
    () => validateFilenameTemplates(templateDated, templateUndated),
    [templateDated, templateUndated]
  );

  const handleSavePrompt = async () => {
    if (promptValidation.errors.length > 0) {
      toast.error(promptValidation.errors[0]);
      return;
    }
    try {
      await updatePromptMutation.mutateAsync({ classify_prompt: classifyPrompt.trim() });
      setPromptDirty(false);
      toast.success("Classify prompt saved for this company");
    } catch (error) {
      showApiErrorToast(error, "Failed to save classify prompt");
    }
  };

  const handleResetPrompt = async () => {
    try {
      await clearPromptMutation.mutateAsync();
      setPromptDirty(false);
      toast.success("Classify prompt reset to platform default");
    } catch (error) {
      showApiErrorToast(error, "Failed to reset classify prompt");
    }
  };

  const handleSaveTemplates = async () => {
    if (templateErrors.length > 0) {
      toast.error(templateErrors[0]);
      return;
    }
    try {
      await updateTemplatesMutation.mutateAsync({
        filename_template_dated: templateDated.trim(),
        filename_template_undated: templateUndated.trim(),
      });
      setTemplatesDirty(false);
      toast.success("Filename templates saved for this company");
    } catch (error) {
      showApiErrorToast(error, "Failed to save filename templates");
    }
  };

  const handleResetTemplates = async () => {
    try {
      await clearTemplatesMutation.mutateAsync();
      setTemplatesDirty(false);
      toast.success("Filename templates reset to platform default");
    } catch (error) {
      showApiErrorToast(error, "Failed to reset filename templates");
    }
  };

  const isLoading = promptQuery.isLoading || templatesQuery.isLoading;
  const isError = promptQuery.isError || templatesQuery.isError;

  return (
    <PageWrapper title="Classify Settings">
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="w-full p-6 space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                <Sparkles className="h-6 w-6 text-indigo-300" />
              </div>
              <Badge
                variant="outline"
                className="border-indigo-400 text-indigo-300 font-medium tracking-wide bg-indigo-950/30"
              >
                DRAT Admin
              </Badge>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              Naming &amp; Classify
            </h1>
            <p className="text-indigo-100/80 leading-relaxed max-w-2xl">
              Per-company protocol for AI rename: classify prompt (metadata extraction) and filename
              templates. Routing rules match the suggested filename this step produces.
            </p>
          </div>
        </div>

        <DratSectionNav active="classify-settings" />

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-3xl" />
            <Skeleton className="h-48 w-full rounded-3xl" />
          </div>
        ) : isError ? (
          <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm">
            <CardContent className="p-0">
              <QueryErrorState
                error={promptQuery.error ?? templatesQuery.error}
                title="Couldn't load classify settings"
                onRetry={() => {
                  promptQuery.refetch();
                  templatesQuery.refetch();
                }}
                isRetrying={promptQuery.isFetching || templatesQuery.isFetching}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm">
              <CardContent className="p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      Classify prompt
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                      Sent to the LLM after entity match. Use{" "}
                      <code className="text-indigo-700">{`{client_list}`}</code> and{" "}
                      <code className="text-indigo-700">{`{{company}}`}</code> for multi-client
                      tenants (optional otherwise). Output JSON must include date, doc name, and
                      optional counterparty / subject matter fields.
                    </p>
                  </div>
                  {promptQuery.data && <DefaultBadge isDefault={promptQuery.data.is_default} />}
                </div>

                <ValidationList items={promptValidation.errors} variant="error" />
                <ValidationList items={promptValidation.warnings} variant="warning" />

                <div className="space-y-2">
                  <Label htmlFor="classify-prompt">Prompt template</Label>
                  <Textarea
                    id="classify-prompt"
                    value={classifyPrompt}
                    onChange={(e) => {
                      setClassifyPrompt(e.target.value);
                      setPromptDirty(true);
                    }}
                    rows={16}
                    className="font-mono text-xs rounded-xl border-slate-200 bg-slate-50/50"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleSavePrompt}
                    disabled={updatePromptMutation.isPending}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500"
                  >
                    {updatePromptMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save prompt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResetPrompt}
                    disabled={clearPromptMutation.isPending || promptQuery.data?.is_default}
                    className="rounded-xl border-slate-200"
                  >
                    {clearPromptMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Reset to default
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm">
              <CardContent className="p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Filename templates</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Placeholders:{" "}
                      <code className="text-indigo-700">{`{date}`}</code>,{" "}
                      <code className="text-indigo-700">{`{entity}`}</code>,{" "}
                      <code className="text-indigo-700">{`{doc_name}`}</code>, optional{" "}
                      <code className="text-indigo-700">{`{detail}`}</code>. Counterparty or subject
                      matter is appended as{" "}
                      <code className="text-indigo-700">({`detail`})</code> when omitted from the
                      template.
                    </p>
                  </div>
                  {templatesQuery.data && <DefaultBadge isDefault={templatesQuery.data.is_default} />}
                </div>

                <ValidationList items={templateErrors} variant="error" />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="template-dated">Dated documents</Label>
                    <Input
                      id="template-dated"
                      value={templateDated}
                      onChange={(e) => {
                        setTemplateDated(e.target.value);
                        setTemplatesDirty(true);
                      }}
                      className="rounded-xl font-mono text-sm"
                      placeholder="{date} - {entity} - {doc_name}"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-undated">Undated / form templates</Label>
                    <Input
                      id="template-undated"
                      value={templateUndated}
                      onChange={(e) => {
                        setTemplateUndated(e.target.value);
                        setTemplatesDirty(true);
                      }}
                      className="rounded-xl font-mono text-sm"
                      placeholder="{entity} - {doc_name}"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleSaveTemplates}
                    disabled={updateTemplatesMutation.isPending}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500"
                  >
                    {updateTemplatesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save templates
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResetTemplates}
                    disabled={clearTemplatesMutation.isPending || templatesQuery.data?.is_default}
                    className="rounded-xl border-slate-200"
                  >
                    {clearTemplatesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Reset to default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
    </PageWrapper>
  );
}
