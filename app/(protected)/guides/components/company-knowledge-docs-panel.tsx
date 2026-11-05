"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Tag, Loader2, RefreshCw, Edit3, FileText, CheckCircle2, AlertCircle, Calendar, Sparkles, Type } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogFooter,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  fetchCompanyKnowledgeDocs,
  deleteCompanyKnowledgeDoc,
  updateCompanyKnowledgeDocTags,
} from "@/utils/api-utils";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type KnowledgeDoc = {
  id?: string;
  knowledge_id?: string;
  title?: string;
  document_name?: string;
  file_name?: string;
  tags?: string[] | string | null;
  created_at?: string;
  [key: string]: any;
};

const getDocId = (doc: KnowledgeDoc) => doc.knowledge_id || doc.id || doc.file_name || "";

const normalizeTags = (tags: KnowledgeDoc["tags"]): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export function CompanyKnowledgeDocsPanel() {
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeDoc | null>(null);

  const {
    data: docs,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<KnowledgeDoc[]>({
    queryKey: ["company-knowledge-docs"],
    queryFn: async () => {
      const data = await fetchCompanyKnowledgeDocs();
      return Array.isArray(data) ? data : data?.items || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: KnowledgeDoc) => {
      const id = getDocId(doc);
      if (!id) throw new Error("Missing knowledge document ID");
      return deleteCompanyKnowledgeDoc(String(id));
    },
    onSuccess: () => {
      toast.success("Knowledge document deleted");
      queryClient.invalidateQueries({ queryKey: ["company-knowledge-docs"] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("Failed to delete knowledge document");
    },
  });

  const updateDocMutation = useMutation({
    mutationFn: async (payload: { doc: KnowledgeDoc; tags: string[]; newName?: string }) => {
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
      setTagEditorOpen(false);
      setSelectedDoc(null);
      setTagInput("");
      setNameInput("");
    },
    onError: () => {
      toast.error("Failed to update document");
    },
  });

  const handleOpenTagEditor = (doc: KnowledgeDoc) => {
    setSelectedDoc(doc);
    const existingTags = normalizeTags(doc.tags);
    setTagInput(existingTags.join(", "));
    setNameInput(doc.title || doc.document_name || doc.file_name || "");
    setTagEditorOpen(true);
  };

  const handleSaveDoc = () => {
    if (!selectedDoc) return;
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const currentName = selectedDoc.title || selectedDoc.document_name || selectedDoc.file_name || "";
    const newName = nameInput.trim() !== currentName.trim() ? nameInput.trim() : undefined;
    updateDocMutation.mutate({ doc: selectedDoc, tags, newName });
  };

  const enrichedDocs = useMemo(
    () => (docs || []).map((doc) => ({ ...doc, _tags: normalizeTags(doc.tags) })),
    [docs]
  );

  return (
    <Card className="border-0 shadow-[0_30px_90px_rgba(0,0,0,0.06)] bg-white/40 backdrop-blur-2xl rounded-[3rem] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-6 p-10 bg-gradient-to-b from-white/20 to-transparent">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-3 text-2xl font-black text-gray-900 italic uppercase">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FileText className="h-5 w-5 text-white" />
            </div>
            Neural Assets
          </CardTitle>
          <CardDescription className="text-sm font-medium text-gray-500 uppercase tracking-widest pl-1">
             Company knowledge resource directory
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-11 px-6 rounded-2xl border-white/60 bg-white/60 backdrop-blur-md gap-2 font-black uppercase text-[10px] tracking-widest text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="p-10 pt-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Indexing knowledge base...</span>
          </div>
        ) : !enrichedDocs.length ? (
          <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/30">
             <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-6 shadow-sm">
                 <Sparkles className="h-8 w-8 text-blue-200" />
             </div>
            <p className="text-lg font-black text-gray-900 mb-2 italic uppercase">Semantic Vault is Empty</p>
            <p className="text-sm font-medium text-gray-400 max-w-xs mx-auto">
              Import company documents to begin building your enterprise neural network.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
                {enrichedDocs.map((doc, idx) => {
                const id = getDocId(doc);
                const tags = (doc as any)._tags as string[];
                const title =
                    doc.title ||
                    doc.document_name ||
                    doc.file_name ||
                    doc.knowledge_id ||
                    doc.id ||
                    "Untitled document";

                return (
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={id}
                        className="group relative flex flex-col p-6 rounded-[2rem] border border-gray-100 bg-white hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full translate-x-16 -translate-y-16 pointer-events-none" />
                        
                        <div className="flex items-start justify-between gap-4 mb-6 relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-10 w-10 rounded-xl hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                                    onClick={() => handleOpenTagEditor(doc)}
                                >
                                    <Edit3 className="h-4.5 w-4.5" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-10 w-10 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600"
                                    onClick={() => setDeleteTarget(doc)}
                                >
                                    <Trash2 className="h-4.5 w-4.5" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 space-y-3 relative z-10">
                            <p className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 italic uppercase tracking-tight">
                                {title}
                            </p>
                            
                            <div className="flex flex-wrap gap-1.5 min-h-[22px]">
                            {tags.length ? (
                                tags.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-[9px] font-black uppercase tracking-widest bg-gray-50/50 border-gray-100 text-gray-500 animate-in fade-in zoom-in"
                                >
                                    {tag}
                                </Badge>
                                ))
                            ) : (
                                <span className="text-[10px] font-bold text-gray-300 italic">
                                    No subject identifier
                                </span>
                            )}
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {formatDate(doc.created_at)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tight">Indexed</span>
                            </div>
                        </div>
                    </motion.div>
                );
                })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>

      <Dialog open={tagEditorOpen} onOpenChange={setTagEditorOpen}>
        <DialogContent className="sm:max-w-md bg-white/80 backdrop-blur-2xl rounded-[3rem] border-white/60 p-10 shadow-2xl">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Edit3 className="h-5 w-5 text-white" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black text-gray-900 italic uppercase">Edit Document</DialogTitle>
                    <DialogDescription className="text-xs font-medium text-gray-500 uppercase tracking-widest">
                        Update document metadata
                    </DialogDescription>
                </div>
            </div>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Document Name</p>
                <Input
                value={nameInput}
                disabled
                placeholder="Enter document name"
                className="h-12 px-5 rounded-2xl bg-gray-100 border-gray-200 cursor-not-allowed opacity-60 font-bold text-sm text-gray-500"
                />
            </div>
            <div className="space-y-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject Tags (Comma Separated)</p>
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
                onClick={() => setTagEditorOpen(false)}
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

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-white/80 backdrop-blur-2xl rounded-[3rem] border-white/60 p-10 shadow-2xl">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                    <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black text-gray-900 italic uppercase">Purge Asset?</DialogTitle>
                    <DialogDescription className="text-xs font-medium text-gray-500 uppercase tracking-widest">
                        This action cannot be reversed
                    </DialogDescription>
                </div>
            </div>
          </DialogHeader>
          <div className="py-4">
               <p className="text-sm font-medium text-gray-600">
                You are about to delete <span className="font-black text-gray-900 italic uppercase">"{deleteTarget?.title || deleteTarget?.document_name || "this asset"}"</span> from the neural knowledge base.
               </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="h-11 rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-500 hover:bg-gray-100"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              className="h-11 px-8 rounded-2xl bg-red-600 text-white font-black uppercase text-[10px] tracking-widest bg-red-600 hover:bg-red-700 transition-all shadow-xl shadow-red-500/20"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
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
    </Card>
  );
}
