"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  GitBranch,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatApiErrorMeta, getApiError, showApiErrorToast } from "@/utils/api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AbstractionPipelineStep } from "../services/abstraction-api";
import { createEmptyChain, type PipelineChain } from "../services/pipeline-chain";
import { effectiveStagingTable } from "../services/staging-table";
import {
  useAbstractionDestinations,
  useAbstractionOcrConfigs,
  useAbstractionSteps,
  useCreateAbstractionStep,
  useDeleteAbstractionStep,
  useReorderAbstractionSteps,
  useUpdateAbstractionStep,
} from "../hooks/use-abstraction";

// Re-exported so existing consumers can keep importing these from the editor.
export { createEmptyChain };
export type { PipelineChain };

interface PipelineEditorProps {
  /** Backend pipeline id whose ordered steps this editor manages. */
  pipelineId: string;
  /** Renders the whole editor read-only. */
  disabled?: boolean;
}

export function PipelineEditor({ pipelineId, disabled = false }: PipelineEditorProps) {
  const stepsQuery = useAbstractionSteps(pipelineId);
  const ocrConfigsQuery = useAbstractionOcrConfigs();
  const destinationsQuery = useAbstractionDestinations();

  const createStep = useCreateAbstractionStep();
  const updateStep = useUpdateAbstractionStep();
  const deleteStep = useDeleteAbstractionStep();
  const reorderSteps = useReorderAbstractionSteps();

  const [draft, setDraft] = useState<PipelineChain>(() => createEmptyChain());

  const steps = useMemo(
    () =>
      [...(stepsQuery.data ?? [])].sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
      ),
    [stepsQuery.data]
  );
  const protocols = useMemo(
    () => (ocrConfigsQuery.data ?? []).filter((config) => config.id),
    [ocrConfigsQuery.data]
  );
  const destinations = useMemo(
    () => destinationsQuery.data ?? [],
    [destinationsQuery.data]
  );

  const protocolNameById = useMemo(
    () => new Map(protocols.map((config) => [config.id as string, config.name])),
    [protocols]
  );
  const protocolById = useMemo(
    () => new Map(protocols.map((config) => [config.id as string, config])),
    [protocols]
  );
  const destinationById = useMemo(
    () => new Map(destinations.map((destination) => [destination.id, destination])),
    [destinations]
  );

  /**
   * Why a protocol cannot feed a destination, or null when the pairing is fine.
   *
   * A connector-source destination reads one specific OCR staging table. If
   * that is not the table the step's protocol stages into, the chain extracts
   * with this protocol and then pushes some OTHER protocol's rows — a silent
   * wrong-data push that nothing downstream flags, because every row in it is
   * individually valid. Caught here, at the point of choosing, rather than on
   * the run that discovers it.
   *
   * Only connector destinations carry a source_table. An ocr_document job
   * reads the document's mapped_data directly, so there is no table to agree
   * on and nothing to check.
   */
  const pairingError = (
    ocrConfigId: string | null | undefined,
    destinationId: string | null | undefined
  ): string | null => {
    if (!ocrConfigId || !destinationId) return null;
    const destination = destinationById.get(destinationId);
    const config = protocolById.get(ocrConfigId);
    if (!destination || !config) return null;

    const sourceTable = (destination.source_table ?? "").trim();
    if (!sourceTable) return null;

    const staging = effectiveStagingTable(config);
    if (!staging) return null;
    if (staging.toLowerCase() === sourceTable.toLowerCase()) return null;

    return (
      `"${destination.reference_name}" reads ${sourceTable}, but protocol ` +
      `"${config.name}" stages into ${staging}. Pick a destination that reads ` +
      `${staging}, or point this step at the matching protocol.`
    );
  };

  const isLoading = stepsQuery.isLoading || ocrConfigsQuery.isLoading || destinationsQuery.isLoading;
  const mutating =
    createStep.isPending || updateStep.isPending || deleteStep.isPending || reorderSteps.isPending;

  // The destination picker only offers jobs the abstraction auto-push can
  // actually drive: source_type 'ocr_document' or 'connector', and a connector
  // job must name the staging table it reads. The write mode is NOT a
  // condition — Append, Upsert and rules jobs all qualify.
  // When the list is empty we must say why, or a csv-source job looks like a
  // broken dropdown (Virgil, 2026-10-02). A failed request is a different
  // cause again, so distinguish the two.
  const destinationsError = destinationsQuery.isError;
  const noDestinations = !isLoading && !destinationsError && destinations.length === 0;
  // Rendered inside a Select dropdown, so plain text: buttons there don't receive clicks reliably.
  const destinationsLoadError = destinationsError
    ? getApiError(destinationsQuery.error, "The server didn't say why.")
    : null;
  const destinationsLoadErrorMeta = destinationsLoadError
    ? formatApiErrorMeta(destinationsLoadError)
    : null;
  const destinationEmptyState = destinationsLoadError ? (
    <div className="px-2 py-1.5 text-sm text-red-600 space-y-0.5">
      <p>Couldn&apos;t load destinations: {destinationsLoadError.message}</p>
      {destinationsLoadErrorMeta && (
        <p className="text-xs text-red-500/80 select-all">{destinationsLoadErrorMeta}</p>
      )}
    </div>
  ) : noDestinations ? (
    <div className="px-2 py-1.5 text-sm text-slate-400">
      No abstraction-ready destinations. A destination must point at an
      integration job whose source type is OCR document or connector, and a
      connector job must name the staging table it reads.
    </div>
  ) : null;

  const destinationLabel = (step: AbstractionPipelineStep): string => {
    const destination = destinationById.get(step.destination_id);
    const name = destination?.reference_name ?? step.destination_id;
    const kind = step.destination_type ?? destination?.destination_type;
    return kind ? `${name} · ${kind}` : name;
  };

  const handleAdd = () => {
    if (!draft.ocr_config_id) {
      toast.error("Pick a protocol for the new step.");
      return;
    }
    if (!draft.destination_id) {
      toast.error("Pick a destination for the new step.");
      return;
    }
    // Backstop. The two pickers already refuse a mismatched pairing, but the
    // destination list can refetch between choosing and adding.
    const error = pairingError(draft.ocr_config_id, draft.destination_id);
    if (error) {
      toast.error(error);
      return;
    }
    createStep.mutate(
      {
        pipelineId,
        payload: {
          ocr_config_id: draft.ocr_config_id,
          destination_id: draft.destination_id,
          ...(draft.label.trim() ? { label: draft.label.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          setDraft(createEmptyChain());
          toast.success("Step added");
        },
        onError: (error) => showApiErrorToast(error, "Could not add the step."),
      }
    );
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    const current = next[index];
    const other = next[target];
    if (!current || !other) return;
    next[index] = other;
    next[target] = current;
    reorderSteps.mutate(
      { pipelineId, orderedIds: next.map((step) => step.id) },
      {
        onError: (error) =>
          showApiErrorToast(error, "Could not reorder the steps."),
      }
    );
  };

  const handleDelete = (stepId: string) => {
    deleteStep.mutate(
      { pipelineId, stepId },
      {
        onSuccess: () => toast.success("Step removed"),
        onError: (error) => showApiErrorToast(error, "Could not remove the step."),
      }
    );
  };

  const handleStepChange = (step: AbstractionPipelineStep, payload: { ocr_config_id?: string; destination_id?: string }) => {
    updateStep.mutate(
      { pipelineId, stepId: step.id, payload },
      {
        onError: (error) => showApiErrorToast(error, "Could not update the step."),
      }
    );
  };

  const handleLabelCommit = (step: AbstractionPipelineStep, label: string) => {
    const next = label.trim();
    if ((step.label ?? "") === next) return;
    updateStep.mutate(
      { pipelineId, stepId: step.id, payload: { label: next || null } },
      {
        onError: (error) => showApiErrorToast(error, "Could not update the step."),
      }
    );
  };

  const readOnly = disabled || mutating;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
          <GitBranch className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Pipeline steps</h3>
          <p className="text-sm text-slate-500">
            A pipeline is an ordered list of steps. Each step extracts with a protocol and pushes
            the result to one destination. Steps run top to bottom.
          </p>
        </div>
      </div>

      {steps.length === 0 && !isLoading && (
        <div className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>This pipeline has no steps yet. Add one below.</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading protocols and destinations…
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
                    Step {index + 1}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {protocolNameById.get(step.ocr_config_id) ?? "protocol"} →{" "}
                    {destinationLabel(step)}
                    {step.label ? ` · ${step.label}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={readOnly || index === 0}
                    onClick={() => handleMove(index, -1)}
                    aria-label={`Move step ${index + 1} up`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={readOnly || index === steps.length - 1}
                    onClick={() => handleMove(index, 1)}
                    aria-label={`Move step ${index + 1} down`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-600 hover:text-rose-700"
                    disabled={readOnly}
                    onClick={() => handleDelete(step.id)}
                    aria-label={`Remove step ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Protocol</label>
                  <Select
                    value={step.ocr_config_id}
                    disabled={readOnly}
                    onValueChange={(ocr_config_id) => {
                      // Changing the protocol can invalidate a destination that
                      // was fine a moment ago, so it is checked here too.
                      const error = pairingError(ocr_config_id, step.destination_id);
                      if (error) {
                        toast.error(error);
                        return;
                      }
                      handleStepChange(step, { ocr_config_id });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a protocol" />
                    </SelectTrigger>
                    <SelectContent>
                      {protocols.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-slate-400">
                          No protocols available
                        </div>
                      ) : (
                        protocols.map((config) => (
                          <SelectItem key={config.id} value={config.id as string}>
                            {config.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Destination</label>
                  <Select
                    value={step.destination_id}
                    disabled={readOnly}
                    onValueChange={(destination_id) => {
                      const error = pairingError(step.ocr_config_id, destination_id);
                      if (error) {
                        // Rejected, so the step keeps the destination it had.
                        // There is no "unset" to fall back to — the backend
                        // requires every step to name one.
                        toast.error(error);
                        return;
                      }
                      handleStepChange(step, { destination_id });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.length === 0 ? (
                        destinationEmptyState
                      ) : (
                        destinations.map((destination) => (
                          <SelectItem key={destination.id} value={destination.id}>
                            {destination.reference_name}
                            {destination.source_table ? ` · reads ${destination.source_table}` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Label (optional)</label>
                  <Input
                    defaultValue={step.label ?? ""}
                    key={`${step.id}-${step.label ?? ""}`}
                    disabled={readOnly}
                    placeholder="e.g. charter extraction"
                    onBlur={(event) => handleLabelCommit(step, event.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          {!disabled && (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">New step</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Protocol</label>
                  <Select
                    value={draft.ocr_config_id ?? ""}
                    disabled={mutating}
                    onValueChange={(ocr_config_id) => {
                      const error = pairingError(ocr_config_id, draft.destination_id);
                      if (error) {
                        // The protocol is what the user just asked for, so keep
                        // it and clear the destination it no longer agrees with.
                        toast.error(error);
                        setDraft((prev) => ({
                          ...prev,
                          ocr_config_id,
                          destination_id: null,
                          destination_type: null,
                        }));
                        return;
                      }
                      setDraft((prev) => ({ ...prev, ocr_config_id }));
                    }}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Choose a protocol" />
                    </SelectTrigger>
                    <SelectContent>
                      {protocols.map((config) => (
                        <SelectItem key={config.id} value={config.id as string}>
                          {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Destination</label>
                  <Select
                    value={draft.destination_id ?? ""}
                    disabled={mutating}
                    onValueChange={(destination_id) => {
                      const error = pairingError(draft.ocr_config_id, destination_id);
                      if (error) {
                        toast.error(error);
                        setDraft((prev) => ({
                          ...prev,
                          destination_id: null,
                          destination_type: null,
                        }));
                        return;
                      }
                      const destination = destinationById.get(destination_id);
                      setDraft((prev) => ({
                        ...prev,
                        destination_id,
                        destination_type: destination?.destination_type ?? null,
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Choose a destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.length === 0
                        ? destinationEmptyState
                        : destinations.map((destination) => (
                            <SelectItem key={destination.id} value={destination.id}>
                              {destination.reference_name}
                              {destination.source_table ? ` · reads ${destination.source_table}` : ""}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Label (optional)</label>
                  <Input
                    value={draft.label}
                    disabled={mutating}
                    placeholder="e.g. charter extraction"
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, label: event.target.value }))
                    }
                  />
                </div>
              </div>
              <Button
                variant="outline"
                className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
                disabled={mutating}
                onClick={handleAdd}
              >
                <Plus className="h-4 w-4 mr-2" /> Add step
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
