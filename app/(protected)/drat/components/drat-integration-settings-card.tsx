"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus, Trash2, Workflow } from "lucide-react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEntities } from "../hooks/use-entities";
import {
  useClearIntegrationRoutingMap,
  useIntegrationBundles,
  useIntegrationJobs,
  useIntegrationRoutingMap,
  useSetIntegrationRoutingMap,
  type IntegrationRouteEntry,
} from "../hooks/use-integration-settings";
import { QueryErrorState } from "@/components/query-error-state";

const ANY_ENTITY = "__any_entity__";

const DEST_JOB_PREFIX = "job:";
const DEST_BUNDLE_PREFIX = "bundle:";

const emptyEntry = (): IntegrationRouteEntry => ({
  entity_id: null,
  document_type: null,
  integration_job_id: null,
  integration_bundle_id: null,
});

function entryDestination(entry: IntegrationRouteEntry): string {
  if (entry.integration_job_id) return `${DEST_JOB_PREFIX}${entry.integration_job_id}`;
  if (entry.integration_bundle_id) return `${DEST_BUNDLE_PREFIX}${entry.integration_bundle_id}`;
  return "";
}

function setEntryDestination(entry: IntegrationRouteEntry, value: string): IntegrationRouteEntry {
  if (value.startsWith(DEST_JOB_PREFIX)) {
    return {
      ...entry,
      integration_job_id: value.slice(DEST_JOB_PREFIX.length),
      integration_bundle_id: null,
    };
  }
  if (value.startsWith(DEST_BUNDLE_PREFIX)) {
    return {
      ...entry,
      integration_bundle_id: value.slice(DEST_BUNDLE_PREFIX.length),
      integration_job_id: null,
    };
  }
  return { ...entry, integration_job_id: null, integration_bundle_id: null };
}

export function DratIntegrationSettingsCard() {
  const routingMap = useIntegrationRoutingMap();
  const setRoutingMap = useSetIntegrationRoutingMap();
  const clearRoutingMap = useClearIntegrationRoutingMap();
  const jobs = useIntegrationJobs();
  const bundles = useIntegrationBundles();
  const { data: entityData, isLoading: entitiesLoading } = useEntities({ limit: 1000 });

  const [entries, setEntries] = useState<IntegrationRouteEntry[]>([]);
  const [mapDirty, setMapDirty] = useState(false);

  useEffect(() => {
    if (routingMap.data && !mapDirty) setEntries(routingMap.data.entries);
  }, [routingMap.data, mapDirty]);

  const eligibleJobs = useMemo(
    () =>
      (jobs.data ?? []).filter(
        (job) => job.is_active && job.source_type === "ocr_document" && job.upsert_field
      ),
    [jobs.data]
  );
  const eligibleBundles = useMemo(
    () => (bundles.data ?? []).filter((bundle) => bundle.is_active),
    [bundles.data]
  );

  const entities = entityData?.entities ?? [];
  const isLoading =
    routingMap.isLoading || jobs.isLoading || bundles.isLoading;
  const isError =
    routingMap.isError || jobs.isError || bundles.isError;

  const retryLoad = () => {
    void routingMap.refetch();
    void jobs.refetch();
    void bundles.refetch();
  };

  const updateEntry = (index: number, update: Partial<IntegrationRouteEntry>) => {
    setMapDirty(true);
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...update } : entry
      )
    );
  };

  const saveRoutingMap = () => {
    const normalized = entries.map((entry) => ({
      entity_id: entry.entity_id || null,
      document_type: entry.document_type?.trim() || null,
      integration_job_id: entry.integration_job_id || null,
      integration_bundle_id: entry.integration_bundle_id || null,
    }));
    const invalid = normalized.some(
      (entry) => !entry.integration_job_id && !entry.integration_bundle_id
    );
    if (invalid) {
      toast.error("Each route needs an integration job or bundle destination.");
      return;
    }

    setRoutingMap.mutate(normalized, {
      onSuccess: (result) => {
        setMapDirty(false);
        setEntries(result.entries);
        toast.success("Integration routing map saved");
      },
      onError: (error) =>
        showApiErrorToast(error, "Failed to save integration routing map"),
    });
  };

  const confirmClear = () => {
    clearRoutingMap.mutate(undefined, {
      onSuccess: () => {
        setMapDirty(false);
        setEntries([]);
        toast.success("Integration routing map cleared");
      },
      onError: (error) =>
        showApiErrorToast(error, "Failed to clear integration routing map"),
    });
  };

  const warnings = routingMap.data?.warnings ?? [];
  const hasNoDestinations =
    !isLoading && eligibleJobs.length === 0 && eligibleBundles.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 px-1">
        <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
          <Workflow className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Integration auto-push</h2>
          <p className="text-sm text-slate-500">
            After a document finishes abstraction/staging, automatically push it into an
            integration job or bundle. No matching route means no automatic push.
          </p>
        </div>
      </div>

      <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white/80 overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-36 w-full rounded-xl" />
            </div>
          ) : isError ? (
            <QueryErrorState
              variant="inline"
              error={routingMap.error ?? jobs.error ?? bundles.error}
              title="Couldn't load integration settings"
              onRetry={retryLoad}
            />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">Integration routing routes</h3>
                  <p className="text-sm text-slate-500">
                    Most specific route wins: entity + document type, then entity, then type, then a
                    route with neither (a catch-all).
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-xl border-teal-200 text-teal-700 hover:bg-teal-50"
                  onClick={() => {
                    setMapDirty(true);
                    setEntries((current) => [...current, emptyEntry()]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add route
                </Button>
              </div>

              {hasNoDestinations && (
                <div className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    No eligible integration jobs or bundles found for this company. Routes need a
                    job with source type &quot;ocr_document&quot; and an upsert field, or an active
                    bundle.
                  </span>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="space-y-1.5 rounded-xl bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
                  {warnings.map((warning, index) => (
                    <div key={index} className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-sky-600" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              {entries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                  <p className="font-medium text-slate-700">No integration routes</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Add a route to automatically push filed documents into an integration job or
                    bundle.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead>Entity</TableHead>
                        <TableHead>Document type</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry, index) => (
                        <TableRow key={`${entry.entity_id}-${entry.document_type}-${index}`}>
                          <TableCell className="min-w-48">
                            <Select
                              value={entry.entity_id || ANY_ENTITY}
                              disabled={entitiesLoading}
                              onValueChange={(value) =>
                                updateEntry(index, {
                                  entity_id: value === ANY_ENTITY ? null : value,
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Any entity" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={ANY_ENTITY}>Any entity</SelectItem>
                                {entities.map((entity) => (
                                  <SelectItem key={entity.id} value={entity.id}>
                                    {entity.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="min-w-44">
                            <Input
                              value={entry.document_type ?? ""}
                              onChange={(event) =>
                                updateEntry(index, { document_type: event.target.value })
                              }
                              placeholder="Any type (e.g. SPA)"
                            />
                          </TableCell>
                          <TableCell className="min-w-60">
                            <Select
                              value={entryDestination(entry)}
                              onValueChange={(value) =>
                                updateEntry(index, setEntryDestination(entry, value))
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose destination" />
                              </SelectTrigger>
                              <SelectContent>
                                {eligibleJobs.length > 0 && (
                                  <>
                                    <div className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                                      Integration jobs
                                    </div>
                                    {eligibleJobs.map((job) => (
                                      <SelectItem
                                        key={`${DEST_JOB_PREFIX}${job.id}`}
                                        value={`${DEST_JOB_PREFIX}${job.id}`}
                                      >
                                        {job.name}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                                {eligibleBundles.length > 0 && (
                                  <>
                                    <div className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                                      Integration bundles
                                    </div>
                                    {eligibleBundles.map((bundle) => (
                                      <SelectItem
                                        key={`${DEST_BUNDLE_PREFIX}${bundle.id}`}
                                        value={`${DEST_BUNDLE_PREFIX}${bundle.id}`}
                                      >
                                        {bundle.name}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                                {eligibleJobs.length === 0 && eligibleBundles.length === 0 && (
                                  <div className="px-2 py-1.5 text-sm text-slate-400">
                                    No destinations available
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setMapDirty(true);
                                setEntries((current) =>
                                  current.filter((_, entryIndex) => entryIndex !== index)
                                );
                              }}
                              aria-label="Remove integration route"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                {entries.length > 0 && (
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={clearRoutingMap.isPending}
                    onClick={confirmClear}
                  >
                    {clearRoutingMap.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Clear all
                  </Button>
                )}
                <Button
                  className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white"
                  disabled={setRoutingMap.isPending || !mapDirty}
                  onClick={saveRoutingMap}
                >
                  {setRoutingMap.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save routes
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}