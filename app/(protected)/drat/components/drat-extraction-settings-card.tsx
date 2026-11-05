"use client";

import { FileSearch } from "lucide-react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useAbstractionEnabled,
  useSetAbstractionEnabled,
} from "../hooks/use-extraction-settings";
import { QueryErrorState } from "@/components/query-error-state";

// ---------------------------------------------------------------------------
// Legacy extraction settings (disabled).
//
// DRAT now routes filed documents through abstraction rules, so the legacy
// path — a default OCR protocol plus per-entity/document-type extraction
// protocol routes — is commented out below. The backend still supports it as
// a fallback for a company that has the handoff enabled but zero active
// abstraction rules, so it is kept here for reference and quick re-enable.
//
// import { useEffect, useState } from "react";
// import { useQuery } from "@tanstack/react-query";
// import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
// import {
//   listOcrConfigurations,
//   type OcrConfiguration,
// } from "@/app/(protected)/abstraction/services/ocr-api";
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { useEntities } from "../hooks/use-entities";
// import {
//   type ExtractionProtocolEntry,
//   useClearOcrConfigId,
//   useExtractionProtocolMap,
//   useOcrConfigId,
//   useSetExtractionProtocolMap,
//   useSetOcrConfigId,
// } from "../hooks/use-extraction-settings";
//
// const ANY_ENTITY = "__any_entity__";
//
// const emptyEntry = (): ExtractionProtocolEntry => ({
//   entity_id: null,
//   document_type: null,
//   ocr_config_id: "",
// });
//
// function OcrConfigSelect({
//   value,
//   configs,
//   onValueChange,
//   disabled,
// }: {
//   value?: string | null;
//   configs: OcrConfiguration[];
//   onValueChange: (value: string) => void;
//   disabled?: boolean;
// }) {
//   return (
//     <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
//       <SelectTrigger className="w-full min-w-48">
//         <SelectValue placeholder="Choose OCR protocol" />
//       </SelectTrigger>
//       <SelectContent>
//         {configs.map((config) =>
//           config.id ? (
//             <SelectItem key={config.id} value={config.id}>
//               {config.name}
//             </SelectItem>
//           ) : null
//         )}
//       </SelectContent>
//     </Select>
//   );
// }
// ---------------------------------------------------------------------------

export function DratExtractionSettingsCard() {
  const abstractionEnabled = useAbstractionEnabled();
  const setAbstractionEnabled = useSetAbstractionEnabled();

  // Legacy state (default OCR protocol + extraction protocol routes) — disabled.
  // const ocrConfigId = useOcrConfigId();
  // const setOcrConfigId = useSetOcrConfigId();
  // const clearOcrConfigId = useClearOcrConfigId();
  // const protocolMap = useExtractionProtocolMap();
  // const setProtocolMap = useSetExtractionProtocolMap();
  // const { data: entityData, isLoading: entitiesLoading } = useEntities({ limit: 1000 });
  // const ocrConfigs = useQuery({
  //   queryKey: ["ocr", "configurations"],
  //   queryFn: listOcrConfigurations,
  // });
  // const [entries, setEntries] = useState<ExtractionProtocolEntry[]>([]);
  // const [mapDirty, setMapDirty] = useState(false);
  //
  // useEffect(() => {
  //   if (protocolMap.data && !mapDirty) setEntries(protocolMap.data.entries);
  // }, [protocolMap.data, mapDirty]);
  //
  // const configs = ocrConfigs.data ?? [];
  // const entities = entityData?.entities ?? [];
  //
  // const updateEntry = (index: number, update: Partial<ExtractionProtocolEntry>) => {
  //   setMapDirty(true);
  //   setEntries((current) =>
  //     current.map((entry, entryIndex) =>
  //       entryIndex === index ? { ...entry, ...update } : entry
  //     )
  //   );
  // };
  //
  // const saveProtocolMap = () => {
  //   const normalized = entries.map((entry) => ({
  //     entity_id: entry.entity_id || null,
  //     document_type: entry.document_type?.trim() || null,
  //     ocr_config_id: entry.ocr_config_id,
  //   }));
  //   const invalid = normalized.some(
  //     (entry) => !entry.ocr_config_id || (!entry.entity_id && !entry.document_type)
  //   );
  //   if (invalid) {
  //     toast.error("Each route needs an OCR protocol and an entity or document type.");
  //     return;
  //   }
  //
  //   setProtocolMap.mutate(normalized, {
  //     onSuccess: (result) => {
  //       setMapDirty(false);
  //       setEntries(result.entries);
  //       toast.success("Extraction protocol map saved");
  //     },
  //     onError: (error) =>
  //       toast.error(extractAxiosErrorMessage(error, "Failed to save extraction protocol map")),
  //   });
  // };

  const isLoading = abstractionEnabled.isLoading;
  const isError = abstractionEnabled.isError;

  const retryLoad = () => {
    void abstractionEnabled.refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 px-1">
        <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
          <FileSearch className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Extraction / Abstraction</h2>
          <p className="text-sm text-slate-500">
            Send filed documents to abstraction. The protocol and destination each document uses are
            decided by your abstraction rules.
          </p>
        </div>
      </div>

      <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white/80 overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-36 w-full rounded-xl" />
            </div>
          ) : isError ? (
            <QueryErrorState
              variant="inline"
              error={abstractionEnabled.error}
              title="Couldn't load extraction settings"
              onRetry={retryLoad}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-6">
                <div>
                  <h3 className="font-semibold text-slate-900">DRAT → Abstraction handoff</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    When disabled, filing completes without abstraction. When enabled, documents are
                    routed to your abstraction rules.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={abstractionEnabled.data?.abstraction_enabled ?? false}
                    disabled={setAbstractionEnabled.isPending}
                    onCheckedChange={(enabled) =>
                      setAbstractionEnabled.mutate(enabled, {
                        onSuccess: () =>
                          toast.success(
                            `Abstraction handoff ${enabled ? "enabled" : "disabled"}`
                          ),
                        onError: (error) =>
                          showApiErrorToast(error, "Failed to update abstraction handoff"),
                      })
                    }
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <span className="text-sm font-semibold text-slate-600">
                    {abstractionEnabled.data?.abstraction_enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              {/*
                Legacy: default OCR protocol + extraction protocol routes.
                Superseded by abstraction rules; commented out, not deleted.

                <div className="border-t border-slate-100 pt-6">
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-semibold text-slate-900">Default OCR protocol</h3>
                      <p className="text-sm text-slate-500">
                        Used when no extraction route matches a filed document.
                      </p>
                      <OcrConfigSelect
                        value={ocrConfigId.data?.ocr_config_id}
                        configs={configs}
                        disabled={setOcrConfigId.isPending || configs.length === 0}
                        onValueChange={(id) =>
                          setOcrConfigId.mutate(id, {
                            onSuccess: () => toast.success("Default OCR protocol saved"),
                            onError: (error) =>
                              toast.error(
                                extractAxiosErrorMessage(error, "Failed to save default OCR protocol")
                              ),
                          })
                        }
                      />
                    </div>
                    {ocrConfigId.data?.configured && (
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        disabled={clearOcrConfigId.isPending}
                        onClick={() =>
                          clearOcrConfigId.mutate(undefined, {
                            onSuccess: () => toast.success("Default OCR protocol cleared"),
                            onError: (error) =>
                              toast.error(
                                extractAxiosErrorMessage(error, "Failed to clear default OCR protocol")
                              ),
                          })
                        }
                      >
                        Clear default
                      </Button>
                    )}
                  </div>
                  {!ocrConfigId.data?.configured && (
                    <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        No default OCR protocol is configured. Documents without a matching route will
                        fail the handoff.
                      </span>
                    </div>
                  )}
                  {configs.length === 0 && !ocrConfigs.isLoading && (
                    <p className="mt-2 text-sm text-amber-700">
                      No OCR protocols are available for this company. Create one in Abstraction first.
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">Extraction protocol routes</h3>
                      <p className="text-sm text-slate-500">
                        Most specific route wins: entity + type, then entity, then type, then default.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
                      onClick={() => {
                        setMapDirty(true);
                        setEntries((current) => [...current, emptyEntry()]);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add route
                    </Button>
                  </div>

                  {entries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                      <p className="font-medium text-slate-700">No extraction routes</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Add a route to use a specific OCR protocol for an entity or document type.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                            <TableHead>Entity</TableHead>
                            <TableHead>Document type</TableHead>
                            <TableHead>OCR protocol</TableHead>
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
                                  placeholder="Any type (e.g. NDA)"
                                />
                              </TableCell>
                              <TableCell className="min-w-52">
                                <OcrConfigSelect
                                  value={entry.ocr_config_id}
                                  configs={configs}
                                  onValueChange={(ocr_config_id) =>
                                    updateEntry(index, { ocr_config_id })
                                  }
                                />
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
                                  aria-label="Remove extraction route"
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
                  <div className="flex justify-end">
                    <Button
                      className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white"
                      disabled={setProtocolMap.isPending || !mapDirty}
                      onClick={saveProtocolMap}
                    >
                      {setProtocolMap.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save routes
                    </Button>
                  </div>
                </div>
              */}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
