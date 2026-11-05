"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Filter,
  Plus,
  Trash,
  BookOpen,
  Search,
  X,
  Check,
  Layers,
  Sparkles,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { KnowledgeGraphFormDialog } from "@/components/knowledge-graph-dialog";
import DeleteKnowledgeGraphDialog from "@/components/delete-knowledge-graph-dialog";
import searchDebounce, { filterData } from "@/utils/search-debounce";
import SearchInput from "@/components/search-input";
import { useDataCountsStore } from "@/app/store/dataCountsStore";
import { useUserStore } from "@/app/store/userStore";
import { cn } from "@/lib/utils";
import { Axios } from "@/app/config/axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchCompanyKnowledgeDocs,
  deleteCompanyKnowledgeDoc,
  updateCompanyKnowledgeDocTags,
} from "@/utils/api-utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, AlertCircle } from "lucide-react";

import dynamic from "next/dynamic";

const KnowledgeGraphVisualizer = dynamic(
  () =>
    import("@/components/knowledge-graph-visualizer").then((m) => ({
      default: m.KnowledgeGraphVisualizer,
    })),
  { ssr: false }
);

const CompanyKnowledgeDocsPanel = dynamic(
  () =>
    import("@/app/(protected)/guides/components/company-knowledge-docs-panel").then((m) => ({
      default: m.CompanyKnowledgeDocsPanel,
    })),
  { ssr: false }
);

// Define the data type for glossary entries
type GlossaryEntry = {
  function: string;
  company: string;
  domain: string;
  term: string;
  description: string;
  data_set: string;
  guide_name: string;
  quality: string;
  rules: string;
  id: number;
  table_id: string;
};

const KnowledgeGraph = () => {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ field: string; value: string }>>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [initialData, setInitialData] = useState<GlossaryEntry | null>(null);
  const [view, setView] = useState<"list" | "visual">("visual");

  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docEditOpen, setDocEditOpen] = useState(false);
  const [docDeleteOpen, setDocDeleteOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [nameInput, setNameInput] = useState("");

  const getDocId = (doc: any) => doc.knowledge_id || doc.id || doc.file_name || "";

  const normalizeTags = (tags: any): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags !== "string") return [];
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  };

  const { user } = useUserStore();
  const { knowledgeGraphLastUpdated, updateKnowledgeGraphTimestamp } = useDataCountsStore();
  const queryClient = useQueryClient();

  const formattedLastUpdated = useMemo(() => {
    if (!knowledgeGraphLastUpdated) return null;
    return new Date(knowledgeGraphLastUpdated).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [knowledgeGraphLastUpdated]);

  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  useEffect(() => {
    setSavedCompanyId(localStorage.getItem("selectedCompanyId"));
  }, []);

  // Fetch knowledge docs for the visualizer
  const { data: knowledgeDocs = [] } = useQuery({
    queryKey: ["company-knowledge-docs"],
    queryFn: async () => {
      const data = await fetchCompanyKnowledgeDocs();
      return Array.isArray(data) ? data : data?.items || [];
    },
  });

  // Deprecated glossary query

  const handleClearSearch = () => {
    setColumnFilters([]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      filterData(q, knowledgeDocs, (results) => {
        setSearchResults(results);
      });
    },
    [knowledgeDocs]
  );

  const debouncedSearch = useMemo(
    () => searchDebounce((q: string) => handleSearch(q), 300),
    [handleSearch]
  );

  const docDeleteMutation = useMutation({
    mutationFn: async (doc: any) => {
      const id = getDocId(doc);
      if (!id) throw new Error("Missing knowledge document ID");
      return deleteCompanyKnowledgeDoc(String(id));
    },
    onSuccess: () => {
      toast.success("Knowledge document deleted");
      queryClient.invalidateQueries({ queryKey: ["company-knowledge-docs"] });
      setDocDeleteOpen(false);
      setSelectedDoc(null);
    },
    onError: () => {
      toast.error("Failed to delete knowledge document");
    },
  });

  const updateDocMutation = useMutation({
    mutationFn: async (payload: { doc: any; tags: string[]; newName?: string }) => {
      const id = getDocId(payload.doc);
      if (!id) throw new Error("Missing knowledge document ID");
      return updateCompanyKnowledgeDocTags(String(id), {
        new_tags: payload.tags,
        append: false,
        remove_tags: [],
        new_name: payload.newName || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Document updated");
      queryClient.invalidateQueries({ queryKey: ["company-knowledge-docs"] });
      setDocEditOpen(false);
      setSelectedDoc(null);
      setTagInput("");
      setNameInput("");
      updateKnowledgeGraphTimestamp();
    },
    onError: () => {
      toast.error("Failed to update document");
    },
  });

  const handleOpenDocEdit = (doc: any) => {
    setSelectedDoc(doc);
    const existingTags = normalizeTags(doc.tags);
    setTagInput(existingTags.join(", "));
    setNameInput(doc.title || doc.document_name || doc.file_name || "");
    setDocEditOpen(true);
  };

  const handleOpenDocDelete = (doc: any) => {
    setSelectedDoc(doc);
    setDocDeleteOpen(true);
  };

  const handleSaveDoc = () => {
    if (!selectedDoc) return;
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const currentName =
      selectedDoc.title || selectedDoc.document_name || selectedDoc.file_name || "";
    const newName = nameInput.trim() !== currentName.trim() ? nameInput.trim() : undefined;
    updateDocMutation.mutate({ doc: selectedDoc, tags, newName });
  };

  const TableCellPopover = ({ value, label }: { value: string; label: string }) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
      <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <Popover open={isHovered}>
          <PopoverTrigger asChild>
            <div className="truncate max-w-[180px] cursor-default font-medium text-slate-600">
              {value}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-[320px] bg-slate-900 text-white border-0 shadow-2xl rounded-2xl p-4 animate-in fade-in zoom-in duration-200 z-[100]">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400/80">
                {label}
              </p>
              <p className="text-sm leading-relaxed font-medium">{value}</p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  const columns: ColumnDef<GlossaryEntry>[] = [
    {
      accessorKey: "function",
      header: "Function",
      cell: ({ row }) => <TableCellPopover value={row.getValue("function")} label="Function" />,
      size: 150,
    },
    {
      accessorKey: "company",
      header: "Company",
      cell: ({ row }) => <TableCellPopover value={row.getValue("company")} label="Company" />,
      size: 150,
    },
    {
      accessorKey: "domain",
      header: "Domain",
      cell: ({ row }) => <TableCellPopover value={row.getValue("domain")} label="Domain" />,
      size: 150,
    },
    {
      accessorKey: "term",
      header: "Term",
      cell: ({ row }) => (
        <div className="font-bold text-slate-900 truncate max-w-[140px]">
          {row.getValue("term")}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: "data_set",
      header: "Data Products",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 group-hover:animate-pulse" />
          <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
            {row.getValue("data_set")}
          </span>
        </div>
      ),
      size: 180,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <TableCellPopover value={row.getValue("description")} label="Description" />
      ),
      size: 200,
    },
    {
      accessorKey: "guide_name",
      header: "Guide",
      cell: ({ row }) => (
        <TableCellPopover value={row.getValue("guide_name")} label="Reference Guide" />
      ),
      size: 150,
    },
    {
      accessorKey: "quality",
      header: "Quality",
      cell: ({ row }) => {
        const quality = row.getValue("quality") as string;
        const color = quality?.toLowerCase().includes("high")
          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
          : quality?.toLowerCase().includes("low")
            ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
            : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
        return (
          <div className="flex items-center gap-2.5">
            <span className={cn("w-2 h-2 rounded-full", color)} />
            <span className="capitalize text-slate-700 font-bold">{quality}</span>
          </div>
        );
      },
      size: 130,
    },
    {
      accessorKey: "rules",
      header: "Rules",
      cell: ({ row }) => (
        <TableCellPopover value={row.getValue("rules")} label="Governance Rules" />
      ),
      size: 150,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setInitialData(row.original);
              setMode("edit");
              setOpen(true);
            }}
            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
          >
            <Edit className="h-4.5 w-4.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setInitialData(row.original);
              setDeleteOpen(true);
            }}
            className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash className="h-4.5 w-4.5" />
          </Button>
        </div>
      ),
      size: 100,
    },
  ];

  const table = useReactTable({
    data: knowledgeDocs || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: { columnFilters },
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Premium Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60"
      >
        <div className="max-w-[1600px] mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors rotate-3",
                view === "visual"
                  ? "bg-slate-900 shadow-slate-900/20"
                  : "bg-primary shadow-primary/20"
              )}
            >
              {view === "visual" ? (
                <Layers className="text-white w-6 h-6 -rotate-3" />
              ) : (
                <BookOpen className="text-white w-6 h-6 -rotate-3" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {view === "visual" ? "Knowledge Graph" : "Knowledge Hub"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider border border-slate-200/50">
                  Enterprise Catalog
                </span>
                {view === "list" && (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50/80 text-primary text-[10px] font-bold uppercase tracking-wider border border-blue-100/50">
                    <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                    Verified Assets
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1.5">
                <span className="text-sm font-semibold text-slate-500">
                  {view === "visual"
                    ? "Semantic Connections & Subjects"
                    : "Company Knowledge Documents"}
                </span>

                {formattedLastUpdated && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-slate-500 font-medium tracking-tight">
                      Indexed {formattedLastUpdated}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl mr-2 border border-slate-200/50">
              <button
                onClick={() => setView("visual")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300",
                  view === "visual"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
              >
                <Layers className="w-4 h-4" />
                Visual
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300",
                  view === "list"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
              >
                <BookOpen className="w-4 h-4" />
                List
              </button>
            </div>

            <div className="relative group">
              <SearchInput
                onSearch={debouncedSearch}
                className="w-[320px] shadow-sm group-hover:shadow-md transition-all duration-300 bg-white"
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 mt-3 p-4 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Search Results
                      </p>
                      <button
                        onClick={handleClearSearch}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {searchResults && searchResults.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {searchResults.slice(0, 5).map((result, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group/item"
                            onClick={() => {
                              const col = result.field.toLowerCase();
                              table.getColumn(col)?.setFilterValue(result.value);
                              handleClearSearch();
                            }}
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center group-hover/item:bg-primary/10">
                              <Check className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                {result.field.split("_").join(" ")}
                              </span>
                              <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">
                                {result.value}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-400 font-medium">
                          No results for "{searchQuery}"
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              onClick={() => {
                setMode("add");
                setInitialData(null);
                setOpen(true);
              }}
              className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-900/10 flex items-center gap-2 group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-500" />
              <span className="font-bold text-sm tracking-tight">Add Entry</span>
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-10">
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full"
        >
          <AnimatePresence mode="wait">
            {view === "visual" ? (
              <motion.div
                key="visual"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <KnowledgeGraphVisualizer
                  docs={knowledgeDocs}
                  onEdit={handleOpenDocEdit}
                  onDelete={handleOpenDocDelete}
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <CompanyKnowledgeDocsPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>

      <KnowledgeGraphFormDialog
        open={open}
        onOpenChange={setOpen}
        mode={mode}
        initialData={initialData}
      />

      <DeleteKnowledgeGraphDialog
        deleteOpen={deleteOpen}
        setDeleteOpen={setDeleteOpen}
        selectedItem={initialData}
      />

      {/* Document Edit Dialog */}
      <Dialog open={docEditOpen} onOpenChange={setDocEditOpen}>
        <DialogContent className="sm:max-w-md bg-white/80 backdrop-blur-2xl rounded-[3rem] border-white/60 p-10 shadow-2xl">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Edit className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-gray-900 italic uppercase">
                  Edit Document
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-gray-500 uppercase tracking-widest">
                  Update document metadata
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Document Name
              </p>
              <Input
                value={nameInput}
                disabled
                placeholder="Enter document name"
                className="h-12 px-5 rounded-2xl bg-gray-100 border-gray-200 cursor-not-allowed opacity-60 font-bold text-sm text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Subject Tags (Comma Separated)
              </p>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. financial, q1-2025, policies"
                className="h-12 px-5 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white focus:border-blue-500 transition-all font-bold text-sm"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                className="h-11 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-500 hover:bg-gray-100"
                onClick={() => setDocEditOpen(false)}
                disabled={updateDocMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="h-11 px-8 rounded-2xl bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                onClick={handleSaveDoc}
                disabled={updateDocMutation.isPending}
              >
                {updateDocMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Delete Dialog */}
      <Dialog
        open={docDeleteOpen}
        onOpenChange={(open) => {
          if (!open) setDocDeleteOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md bg-white/80 backdrop-blur-2xl rounded-[3rem] border-white/60 p-10 shadow-2xl">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-gray-900 italic uppercase">
                  Purge Asset?
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-gray-500 uppercase tracking-widest">
                  This action cannot be reversed
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium text-gray-600">
              You are about to delete{" "}
              <span className="font-black text-gray-900 italic uppercase">
                "{selectedDoc?.title || selectedDoc?.document_name || "this asset"}"
              </span>{" "}
              from the neural knowledge base.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="h-11 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-500 hover:bg-gray-100"
              onClick={() => setDocDeleteOpen(false)}
              disabled={docDeleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedDoc && docDeleteMutation.mutate(selectedDoc)}
              className="h-11 px-8 rounded-2xl bg-red-600 text-white font-black uppercase text-[10px] tracking-widest bg-red-600 hover:bg-red-700 transition-all shadow-xl shadow-red-500/20"
              disabled={docDeleteMutation.isPending}
            >
              {docDeleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Purging
                </>
              ) : (
                "Confirm Purge"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeGraph;
