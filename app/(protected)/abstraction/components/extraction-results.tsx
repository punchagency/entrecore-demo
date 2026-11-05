"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database,
  Search,
  Download,
  FileText,
  ExternalLink,
  Filter,
  ChevronDown,
  ChevronUp,
  Table2,
  LayoutGrid,
  Copy,
  CheckCircle2,
  ArrowUpDown,
  Eye,
  Link2,
  // @ts-ignore
} from "lucide-react";
import { useAbstractionStore, ExtractionResult } from "@/app/store/abstractionStore";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fetchOcrDocument } from "../services/ocr-api";
import { formatExtractionValue, extractionValuesEqual } from "../utils/extraction-map-utils";
import { showApiErrorToast } from "@/utils/api-error";

type ViewMode = "table" | "card";
type SortField = "entity" | "confidence" | "document" | "status";

function getConfidenceColor(confidence: number) {
  if (confidence >= 0.95) return "text-emerald-600";
  if (confidence >= 0.85) return "text-blue-600";
  if (confidence >= 0.7) return "text-amber-600";
  return "text-red-600";
}

function getConfidenceBg(confidence: number) {
  if (confidence >= 0.95) return "bg-emerald-500";
  if (confidence >= 0.85) return "bg-blue-500";
  if (confidence >= 0.7) return "bg-amber-500";
  return "bg-red-500";
}

const STATUS_LABELS: Record<ExtractionResult["status"], { label: string; style: string }> = {
  auto: { label: "Auto", style: "bg-blue-50 text-blue-700 border-blue-200" },
  reviewed: { label: "Reviewed", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  corrected: { label: "Corrected", style: "bg-amber-50 text-amber-700 border-amber-200" },
  rejected: { label: "Rejected", style: "bg-red-50 text-red-700 border-red-200" },
  review: { label: "Pending", style: "bg-rose-50 text-rose-700 border-rose-200" },
};

interface DocumentNameProps {
  name: string;
  className?: string;
}

function DocumentName({ name, className }: DocumentNameProps) {
  return (
    <span className={cn("block truncate", className)} title={name}>
      {name}
    </span>
  );
}

export function ExtractionResults() {
  const { extractions, documents, protocols, activeProtocolId, transformMappings } =
    useAbstractionStore();
  const protocol = protocols.find((p) => p.id === activeProtocolId);

  const [loadedDocument, setLoadedDocument] = useState<Record<string, any> | null>({});

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortField, setSortField] = useState<SortField>("document");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDocId, setFilterDocId] = useState<string>("all");
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);

  const availableDocs = useMemo(() => {
    return documents.filter((d) => d.id && ["completed", "review"].includes(d.status));
  }, [documents]);

  const selectedDoc = useMemo(
    () => availableDocs.find((d) => d.id === filterDocId),
    [availableDocs, filterDocId]
  );

  const entityMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string; type: string }>();
    protocol?.entities.forEach((e) =>
      map.set(e.id, { name: e.name, color: e.color, type: e.type })
    );
    return map;
  }, [protocol]);

  const docMap = useMemo(() => {
    const map = new Map<string, string>();
    documents.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [documents]);

  // Filter and search
  const filteredExtractions = useMemo(() => {
    let results = extractions;

    if (filterDocId !== "all") {
      results = results.filter((e) => e.documentId === filterDocId);
    }

    if (filterStatus !== "all") {
      results = results.filter((e) => e.status === filterStatus);
    }

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (e) =>
          formatExtractionValue(e.value).toLowerCase().includes(q) ||
          formatExtractionValue(e.correctedValue).toLowerCase().includes(q) ||
          entityMap.get(e.entityId)?.name.toLowerCase().includes(q) ||
          docMap.get(e.documentId)?.toLowerCase().includes(q)
      );
    }

    // Sort
    results = [...results].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "entity":
          cmp = (entityMap.get(a.entityId)?.name || "").localeCompare(
            entityMap.get(b.entityId)?.name || ""
          );
          break;
        case "confidence":
          cmp = a.confidence - b.confidence;
          break;
        case "document":
          cmp = (docMap.get(a.documentId) || "").localeCompare(docMap.get(b.documentId) || "");
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return results;
  }, [extractions, search, filterStatus, filterDocId, sortField, sortAsc, entityMap, docMap]);

  // Group by document
  const groupedByDoc = useMemo(() => {
    const groups = new Map<string, ExtractionResult[]>();
    filteredExtractions.forEach((e) => {
      const arr = groups.get(e.documentId) || [];
      arr.push(e);
      groups.set(e.documentId, arr);
    });
    return groups;
  }, [filteredExtractions]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleCopy = (value: string | string[], id: string) => {
    navigator.clipboard.writeText(formatExtractionValue(value));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportJSON = () => {
    const data = filteredExtractions.map((e) => ({
      document: docMap.get(e.documentId),
      entity: entityMap.get(e.entityId)?.name,
      value: e.correctedValue || e.value,
      confidence: e.confidence,
      page: e.pageNumber,
      status: e.status,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "abstraction-results.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Fetch document details when focus changes
  useEffect(() => {
    if (filterDocId) {
      const loadDocData = async () => {
        setIsLoadingDoc(true);
        try {
          const data = await fetchOcrDocument(filterDocId);
          console.log(`[OCR] Fetched metadata for doc ${filterDocId}:`, data);

          setLoadedDocument(data);
        } catch (error) {
          console.error("[OCR] Error fetching document metadata:", error);
          showApiErrorToast(error, "Couldn't load this document's details", { id: "extraction-document-meta" });
        } finally {
          setIsLoadingDoc(false);
        }
      };
      loadDocData();
    }
  }, [filterDocId]);

  useEffect(() => {
    transformMappings(loadedDocument?.mappings, loadedDocument?.id, loadedDocument?.ui_mappings);
  }, [loadedDocument]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-50 rounded-xl">
            <Database className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Structured Extraction Data</h3>
            <p className="text-xs text-slate-500">
              {filteredExtractions.length} results across {groupedByDoc.size} documents
            </p>
          </div>

          {/* Document Selector */}
          <div className="ml-2 min-w-[280px] flex-1 max-w-[420px]">
            <Select value={filterDocId} onValueChange={setFilterDocId}>
              <SelectTrigger className="h-auto w-full overflow-hidden rounded-xl border-slate-200 bg-white/50 px-3 py-2.5 backdrop-blur-sm transition-all hover:border-cyan-300">
                <div className="min-w-0 w-full pr-2 text-left">
                  {filterDocId === "all" || !selectedDoc ? (
                    <>
                      <p className="text-sm font-bold text-slate-800 truncate">Choose Document</p>
                    </>
                  ) : (
                    <div className="min-w-0 space-y-0.5 leading-tight">
                        <DocumentName
                          name={selectedDoc.name}
                          className="text-sm font-bold text-slate-800"
                        />
                        <span
                          className="block truncate text-xs text-slate-500"
                          title={selectedDoc.protocolName}
                        >
                          {selectedDoc.protocolName}
                        </span>
                    </div>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 max-h-[300px]">
                {availableDocs.map((doc) => {
                  const fieldCount = extractions.filter((e) => e.documentId === doc.id).length;
                  return (
                    <SelectItem key={doc.id} value={doc.id} className="rounded-lg focus:bg-cyan-50">
                      <div className="flex min-w-0 flex-col gap-0.5 py-1">
                        <DocumentName
                          name={doc.name}
                          className="font-semibold text-slate-800 max-w-[220px]"
                        />
                        <span
                          className="truncate text-xs text-slate-500 max-w-[220px]"
                          title={doc.protocolName}
                        >
                          {doc.protocolName}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>{doc.pageCount ?? 0} pages</span>
                          {/* <span>•</span>
                          <span>{fieldCount} fields</span> */}
                          <span>•</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1.5 py-0 rounded-full border-0 lowercase",
                              doc.status === "completed"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-rose-50 text-rose-600"
                            )}
                          >
                            {doc.status}
                          </Badge>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn(
                "h-8 px-3 rounded-md text-xs",
                viewMode === "table" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"
              )}
            >
              <Table2 className="h-3.5 w-3.5 mr-1" />
              Table
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("card")}
              className={cn(
                "h-8 px-3 rounded-md text-xs",
                viewMode === "card" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" />
              Cards
            </Button>
          </div>

          <Button
            onClick={handleExportJSON}
            size="sm"
            variant="outline"
            className="h-9 text-xs rounded-xl border-cyan-200 text-cyan-600 hover:bg-cyan-50"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by value, entity, or document..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-white border-slate-200"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-slate-400" />
          {["all", "reviewed", "corrected", "auto", "rejected"].map((status) => (
            <Button
              key={status}
              variant="ghost"
              size="sm"
              onClick={() => setFilterStatus(status)}
              className={cn(
                "h-8 text-xs rounded-lg capitalize",
                filterStatus === status
                  ? "bg-cyan-50 text-cyan-700 font-semibold"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoadingDoc && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {/* ── Table View ───────────────────────────────────── */}
      {viewMode === "table" && !isLoadingDoc && (
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    { field: "document" as SortField, label: "Document" },
                    { field: "entity" as SortField, label: "Entity" },
                    { field: null, label: "Extracted Value" },
                    { field: null, label: "Page" },
                    { field: "confidence" as SortField, label: "Confidence" },
                    { field: "status" as SortField, label: "Status" },
                    { field: null, label: "Actions" },
                  ].map((col, i) => (
                    <th
                      key={i}
                      className={cn(
                        "px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider",
                        i === 0 && "w-[220px]",
                        col.field && "cursor-pointer hover:text-slate-700 select-none"
                      )}
                      onClick={() => col.field && toggleSort(col.field)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.field &&
                          sortField === col.field &&
                          (sortAsc ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          ))}
                        {col.field && sortField !== col.field && (
                          <ArrowUpDown className="h-3 w-3 text-slate-300" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredExtractions.map((extraction, idx) => {
                  const entity = entityMap.get(extraction.entityId);
                  const docName = docMap.get(extraction.documentId) || "Unknown";
                  const statusStyle = STATUS_LABELS[extraction.status] || STATUS_LABELS.auto;
                  return (
                    <tr
                      key={extraction.id}
                      className={cn(
                        "border-b border-slate-100 hover:bg-slate-50/50 transition-colors",
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                      )}
                    >
                      {/* Document */}
                      <td className="w-[220px] px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                          <DocumentName name={docName} className="text-xs font-medium text-slate-700" />
                        </div>
                      </td>

                      {/* Entity */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm shrink-0"
                            style={{ backgroundColor: entity?.color || "#94A3B8" }}
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            {extraction?.entityId || entity?.name || "Unknown"}
                          </span>
                        </div>
                      </td>

                      {/* Value */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-medium text-slate-800">
                            {formatExtractionValue(extraction.correctedValue || extraction.value)}
                          </span>
                          {extraction.correctedValue &&
                            !extractionValuesEqual(extraction.correctedValue, extraction.value) && (
                              <span className="block text-[10px] text-slate-400 line-through">
                                {formatExtractionValue(extraction.value)}
                              </span>
                            )}
                        </div>
                      </td>

                      {/* Page */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500">p.{extraction.pageNumber}</span>
                      </td>

                      {/* Confidence */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                getConfidenceBg(extraction.confidence)
                              )}
                              style={{ width: `${extraction.confidence * 100}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-xs font-bold",
                              getConfidenceColor(extraction.confidence)
                            )}
                          >
                            {extraction.confidence != null && !isNaN(Number(extraction.confidence))
                              ? `${(extraction.confidence * 100).toFixed(0)}%`
                              : "N/A"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full border",
                            statusStyle.style
                          )}
                        >
                          {statusStyle.label}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-lg hover:bg-cyan-50"
                            onClick={() =>
                              handleCopy(
                                extraction.correctedValue || extraction.value,
                                extraction.id
                              )
                            }
                          >
                            {copiedId === extraction.id ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-lg hover:bg-violet-50"
                          >
                            <Link2 className="h-3.5 w-3.5 text-slate-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Card View ────────────────────────────────────── */}
      {viewMode === "card" && !isLoadingDoc && (
        <div className="space-y-4">
          {Array.from(groupedByDoc.entries()).map(([docId, docExtractions]) => {
            const docName = docMap.get(docId) || "Unknown Document";
            const isExpanded = expandedDoc === docId || expandedDoc === null;

            return (
              <Card
                key={docId}
                className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden"
              >
                <CardHeader
                  className="pb-2 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandedDoc(expandedDoc === docId ? null : docId)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-slate-700">
                      <FileText className="h-4 w-4 text-violet-500" />
                      <DocumentName name={docName} className="flex-1" />
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-600 border-0 rounded-full text-[10px]">
                        {docExtractions.length} fields
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="p-3 pt-0">
                    <div className="grid sm:grid-cols-2 gap-2">
                      {docExtractions.map((extraction) => {
                        const entity = entityMap.get(extraction.entityId);
                        const statusStyle = STATUS_LABELS[extraction.status] || STATUS_LABELS.auto;

                        return (
                          <div
                            key={extraction.id}
                            className="p-3 rounded-xl border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/10 transition-all group"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm"
                                  style={{ backgroundColor: entity?.color || "#94A3B8" }}
                                />
                                <span className="text-xs font-bold text-slate-600">
                                  {entity?.name}
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] px-1.5 py-0 rounded-full border",
                                  statusStyle.style
                                )}
                              >
                                {statusStyle.label}
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold text-slate-800">
                              {formatExtractionValue(extraction.correctedValue || extraction.value)}
                            </p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] text-slate-400">
                                Page {extraction.pageNumber}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <div className="h-1 w-8 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      getConfidenceBg(extraction.confidence)
                                    )}
                                    style={{ width: `${extraction.confidence * 100}%` }}
                                  />
                                </div>
                                <span
                                  className={cn(
                                    "text-[10px] font-bold",
                                    getConfidenceColor(extraction.confidence)
                                  )}
                                >
                                  {(extraction.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Source Linkage Info */}
      <Card className="border-0 shadow-sm ring-1 ring-cyan-200/50 overflow-hidden bg-gradient-to-r from-cyan-50/50 to-teal-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <Link2 className="h-5 w-5 text-cyan-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700">Source Document Linkage</p>
              <p className="text-xs text-slate-500">
                Every extracted field is linked to its source document and page location. Click the
                link icon on any row to view the original context.
              </p>
            </div>
            <Badge className="bg-cyan-100 text-cyan-700 border-0 rounded-full text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />
              Fully Linked
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
