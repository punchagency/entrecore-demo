"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Tag, 
    FileText, 
    ChevronRight, 
    Maximize2, 
    X,
    FolderOpen,
    Sparkles,
    Search,
    BookOpen
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import PreviewDocDialog from "@/components/preview-doc-dialog";
import { cn } from "@/lib/utils";

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

interface KnowledgeGraphVisualizerProps {
    docs: KnowledgeDoc[];
    onEdit?: (doc: KnowledgeDoc) => void;
    onDelete?: (doc: KnowledgeDoc) => void;
}

export function KnowledgeGraphVisualizer({ docs, onEdit, onDelete }: KnowledgeGraphVisualizerProps) {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [hoveredNode, setHoveredNode] = useState<{ type: 'tag' | 'doc', id: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCursorPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    // Process data to group by tags
    const { tagGroups, allTags } = useMemo(() => {
        const groups: Record<string, KnowledgeDoc[]> = {};
        const tagsSet = new Set<string>();

        docs.forEach(doc => {
            const tags = normalizeTags(doc.tags);
            const docTags = tags.length > 0 ? tags : ['Uncategorized'];

            docTags.forEach(tag => {
                if (!groups[tag]) groups[tag] = [];
                groups[tag].push(doc);
                tagsSet.add(tag);
            });
        });

        const sortedTags = Array.from(tagsSet).sort((a, b) => 
            (groups[b]?.length || 0) - (groups[a]?.length || 0)
        );

        return { tagGroups: groups, allTags: sortedTags };
    }, [docs]);

    function normalizeTags(tags: KnowledgeDoc["tags"]): string[] {
        if (!tags) return [];
        if (Array.isArray(tags)) return tags;
        if (typeof tags !== 'string') return [];
        return tags.split(",").map((t) => t.trim()).filter(Boolean);
    }

    const filteredTags = allTags.filter(tag => 
        tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tagGroups[tag].some(doc => (doc.title || doc.document_name || doc.file_name || "").toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getTagPosition = (index: number, total: number) => {
        if (selectedTag) {
            if (allTags[index] === selectedTag) return { x: 0, y: 0, scale: 1.2 };
            const angle = (index / total) * Math.PI * 2;
            const radius = 500;
            return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, scale: 0.4 };
        }

        const angle = (index / total) * Math.PI * 2;
        const radius = Math.min(600 * 0.4, 280);
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            scale: 1
        };
    };

    const getDocPosition = (docIndex: number, totalDocs: number, tagIndex: number, totalTags: number) => {
        const tagPos = getTagPosition(tagIndex, totalTags);
        const angle = (docIndex / totalDocs) * Math.PI * 2;
        const radius = selectedTag ? 320 : 180;
        
        return {
            x: tagPos.x + Math.cos(angle) * radius,
            y: tagPos.y + Math.sin(angle) * radius,
        };
    };

    return (
        <div 
            className="relative w-full h-[700px] bg-[#0A0C14] rounded-[3.5rem] border border-white/10 overflow-hidden flex items-center justify-center group/container shadow-[0_40px_100px_rgba(0,0,0,0.4)]"
            onMouseMove={handleMouseMove}
        >
            {/* dynamic scan grid background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
            </div>
            
            {/* Interactive Spotlight */}
            <div 
                className="absolute inset-0 pointer-events-none transition-opacity duration-1000 group-hover/container:opacity-100 opacity-0"
                style={{
                    background: `radial-gradient(800px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(37,99,235,0.08), transparent 40%)`
                }}
            />

            {/* Glowing Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-indigo-600/10 blur-[120px] rounded-full" />

            {/* Header Controls */}
            <div className="absolute top-10 left-10 z-20 flex flex-col gap-6 w-full max-w-sm">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        Semantic Engine
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] pl-11">Neural Document Mapping</p>
                </div>

                <div className="relative group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-hover/search:text-blue-500" />
                    <input 
                        className="h-12 pl-12 pr-4 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-2xl text-sm w-full text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        placeholder="Discover semantic links..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="flex flex-wrap gap-2">
                   {filteredTags.slice(0, 6).map(tag => (
                       <Badge 
                        key={tag}
                        variant="outline"
                        className={cn(
                            "cursor-pointer px-4 py-1.5 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest border-white/10",
                            selectedTag === tag 
                                ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20 scale-105" 
                                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                        )}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                       >
                           {tag}
                       </Badge>
                   ))}
                </div>
            </div>

            {selectedTag && (
                <div className="absolute top-10 right-10 z-30 flex items-center gap-4">
                     <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-2xl"
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <FolderOpen className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Active Cluster</p>
                            <h4 className="text-white font-black tracking-tight">{selectedTag}</h4>
                        </div>
                    </motion.div>
                    <button 
                        onClick={() => setSelectedTag(null)}
                        className="w-12 h-12 bg-white/5 hover:bg-red-500/20 backdrop-blur-3xl border border-white/10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-all group"
                    >
                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    </button>
                </div>
            )}

            {/* Graph Engine */}
            <div className="relative w-full h-full flex items-center justify-center">
                <AnimatePresence>
                    {filteredTags.length > 0 ? (
                      filteredTags.map((tag, tIdx) => {
                        const pos = getTagPosition(tIdx, filteredTags.length);
                        const isSelected = selectedTag === tag;
                        const isDimmed = selectedTag && !isSelected;
                        
                        if (isDimmed && !isSelected) return null;

                        return (
                            <React.Fragment key={tag}>
                                {/* connections SVG */}
                                <svg className="absolute inset-0 pointer-events-none fill-none" style={{ overflow: 'visible' }}>
                                    {tagGroups[tag].map((doc, dIdx) => {
                                        const dPos = getDocPosition(dIdx, tagGroups[tag].length, tIdx, filteredTags.length);
                                        return (
                                            <motion.path
                                                key={`line-${tag}-${dIdx}`}
                                                d={`M ${pos.x} ${pos.y} L ${dPos.x} ${dPos.y}`}
                                                stroke={isSelected ? "rgba(37,99,235,0.4)" : "rgba(255,255,255,0.1)"}
                                                strokeWidth={isSelected ? 1.5 : 0.5}
                                                strokeDasharray={isSelected ? "4 4" : "none"}
                                                initial={{ pathLength: 0 }}
                                                animate={{ 
                                                    pathLength: 1,
                                                    stroke: isSelected ? "rgba(37,99,235,0.6)" : "rgba(255,255,255,0.1)",
                                                    strokeDashoffset: isSelected ? [0, -20] : 0
                                                }}
                                                transition={{
                                                    pathLength: { duration: 1 },
                                                    strokeDashoffset: { repeat: Infinity, duration: 2, ease: "linear" }
                                                }}
                                            />
                                        );
                                    })}
                                </svg>

                                {/* Tag Node */}
                                <motion.div
                                    layout
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ 
                                        x: pos.x, 
                                        y: pos.y, 
                                        scale: pos.scale,
                                        opacity: isDimmed ? 0.2 : 1 
                                    }}
                                    transition={{ type: "spring", damping: 25, stiffness: 150 }}
                                    className="absolute z-10"
                                >
                                    <div 
                                        className={cn(
                                            "relative cursor-pointer group/node",
                                            isSelected ? "scale-110" : "hover:scale-105"
                                        )}
                                        onClick={() => setSelectedTag(isSelected ? null : tag)}
                                        onMouseEnter={() => setHoveredNode({ type: 'tag', id: tag })}
                                        onMouseLeave={() => setHoveredNode(null)}
                                    >
                                        {/* Outer Glow */}
                                        <div className={cn(
                                            "absolute inset-0 blur-2xl transition-opacity duration-1000",
                                            isSelected ? "bg-blue-600/40 opacity-100" : "bg-blue-400/0 opacity-0 group-hover/node:opacity-30 group-hover/node:bg-blue-400/20"
                                        )} />

                                        <div className={cn(
                                            "relative w-28 h-28 rounded-3xl backdrop-blur-3xl flex flex-col items-center justify-center text-center p-4 transition-all duration-700",
                                            isSelected 
                                                ? "bg-gradient-to-br from-blue-600 to-indigo-700 border border-white/20 shadow-2xl" 
                                                : "bg-white/5 border border-white/10 group-hover/node:border-blue-500/50"
                                        )}>
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-transform duration-500 group-hover/node:rotate-6",
                                                isSelected ? "bg-white/20" : "bg-blue-500/10 text-blue-400"
                                            )}>
                                                <FolderOpen className={cn("w-6 h-6", isSelected ? "text-white" : "text-blue-400")} />
                                            </div>
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-tight leading-tight",
                                                isSelected ? "text-white" : "text-slate-200 group-hover/node:text-blue-400"
                                            )}>
                                                {tag}
                                            </span>
                                            <span className={cn(
                                                "text-[8px] font-bold mt-1",
                                                isSelected ? "text-white/60" : "text-slate-500"
                                            )}>
                                                {tagGroups[tag].length} Slices
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Document Nodes */}
                                {(isSelected || !selectedTag) && tagGroups[tag].map((doc, dIdx) => {
                                    const dPos = getDocPosition(dIdx, tagGroups[tag].length, tIdx, filteredTags.length);
                                    const docId = doc.id || doc.knowledge_id || String(dIdx);
                                    const isHoveredDoc = hoveredNode?.id === docId;

                                    return (
                                        <Dialog key={`${tag}-${docId}`}>
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ 
                                                    x: dPos.x, 
                                                    y: dPos.y, 
                                                    scale: isHoveredDoc ? 1.3 : 1,
                                                    opacity: isDimmed ? 0 : 1
                                                }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                                                className={cn(
                                                    "absolute cursor-pointer transition-all duration-300 group/doc",
                                                    isHoveredDoc ? "z-[60]" : "z-10"
                                                )}
                                                onMouseEnter={() => setHoveredNode({ type: 'doc', id: docId })}
                                                onMouseLeave={() => setHoveredNode(null)}
                                            >
                                                <div className={cn(
                                                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                                                    "bg-white/[0.03] backdrop-blur-3xl border border-white/10 group-hover/doc:bg-blue-600 group-hover/doc:border-blue-400 group-hover/doc:shadow-2xl group-hover/doc:shadow-blue-500/20"
                                                )}>
                                                    <FileText className={cn(
                                                        "w-6 h-6 transition-colors duration-500",
                                                        isHoveredDoc ? "text-white" : "text-slate-500"
                                                    )} />
                                                </div>

                                                <AnimatePresence>
                                                    {(isSelected || isHoveredDoc) && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                                                            animate={{ opacity: 1, x: 25, filter: 'blur(0px)' }}
                                                            exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                                                            className="absolute left-full top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#1A1D2B]/95 backdrop-blur-3xl border border-white/10 p-4 rounded-[2rem] shadow-2xl z-[100] min-w-[200px]"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="flex flex-col gap-3">
                                                                <div className="flex flex-col">
                                                                    <p className="text-xs font-black text-white max-w-[160px] truncate mb-1">
                                                                        {doc.title || doc.document_name || doc.file_name}
                                                                    </p>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Semantic Asset</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                                                    {(onEdit || onDelete) && (
                                                                        <div className="flex gap-1.5">
                                                                            {onEdit && (
                                                                                <Button 
                                                                                    size="sm" 
                                                                                    variant="ghost" 
                                                                                    className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-white p-0"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        onEdit(doc);
                                                                                    }}
                                                                                >
                                                                                    <Sparkles className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            )}
                                                                            {onDelete && (
                                                                                <Button 
                                                                                    size="sm" 
                                                                                    variant="ghost" 
                                                                                    className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 p-0"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        onDelete(doc);
                                                                                    }}
                                                                                >
                                                                                    <X className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <div className="h-4 w-[1px] bg-white/10 mx-1" />
                                                                    <DialogTrigger asChild>
                                                                        <Button size="sm" className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest">
                                                                            Preview
                                                                        </Button>
                                                                    </DialogTrigger>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                            <PreviewDocDialog document={doc.document_url || doc.file_url || ""} />
                                        </Dialog>
                                    );
                                })}
                            </React.Fragment>
                        );
                      })
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center gap-6"
                        >
                            <div className="w-20 h-20 rounded-full bg-blue-500/5 border border-blue-500/20 flex items-center justify-center">
                                <Sparkles className="w-10 h-10 text-blue-500/40" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-black text-white italic uppercase mb-2">Neural Engine Idle</h3>
                                <p className="text-sm text-slate-500 font-medium">No semantic assets detected in the knowledge base.</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Stats strip */}
            <div className="absolute bottom-10 left-10 flex items-center gap-10">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(37,99,235,1)]" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Active</span>
                </div>
                <div className="h-4 w-[1px] bg-white/10" />
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nodes Indexed</span>
                    <span className="text-sm font-black text-white">{docs.length}</span>
                </div>
            </div>

            <div className="absolute bottom-10 right-10">
                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Powered by Entrecore LLM</span>
                </div>
            </div>
        </div>
    );
}
