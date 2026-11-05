"use client";

import { useVersionCompare } from "../hooks/use-workflows";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitCompare, Plus, Trash2, Edit3, ChevronRight, AlertTriangle, GitBranch, CheckCircle2, Network } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface VersionDiffDialogProps {
  workflowId: string;
  versionAId: string | null;
  versionBId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VersionDiffDialog({ workflowId, versionAId, versionBId, isOpen, onClose }: VersionDiffDialogProps) {
  const { data: diff, isLoading } = useVersionCompare(
    workflowId,
    versionAId || "",
    versionBId || ""
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl rounded-3xl">
        <DialogHeader className="p-8 bg-slate-900 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500 rounded-xl">
              <GitCompare className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-bold">Version Comparison</DialogTitle>
          </div>
          <DialogDescription className="text-indigo-200/80">
            Comparing <span className="text-white font-bold">v{diff?.version_a?.version || '?'}</span> with <span className="text-white font-bold">v{diff?.version_b?.version || '?'}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-slate-50/50">
          <div className="p-8 space-y-8">
            {isLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ) : diff?.identical ? (
              <div className="py-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Identical Versions</h3>
                <p className="text-slate-500">There are no changes between these two version snapshots.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Field Changes */}
                {Object.keys(diff?.field_changes || {}).length > 0 && (
                  <section className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Edit3 className="h-3.5 w-3.5" /> Metadata Changes
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(diff!.field_changes).map(([field, delta]) => (
                        <div key={field} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-2">{field}</p>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded line-through">{String(delta.from)}</span>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                            <span className="text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-bold">{String(delta.to)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Node Diffs */}
                {diff?.node_diffs && diff.node_diffs.length > 0 && (
                  <section className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Network className="h-3.5 w-3.5" /> Node Modifications
                    </h4>
                    <div className="space-y-3">
                      {diff.node_diffs.map((node) => (
                        <div key={node.node_key} className={`bg-white p-4 rounded-2xl border ${
                          node.change === 'added' ? 'border-emerald-200 bg-emerald-50/10' :
                          node.change === 'removed' ? 'border-red-200 bg-red-50/10' :
                          'border-slate-200'
                        } shadow-sm group`}>
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-lg ${
                                node.change === 'added' ? 'bg-emerald-100 text-emerald-600' :
                                node.change === 'removed' ? 'bg-red-100 text-red-600' :
                                'bg-indigo-100 text-indigo-600'
                              }`}>
                                {node.change === 'added' ? <Plus className="h-4 w-4" /> :
                                 node.change === 'removed' ? <Trash2 className="h-4 w-4" /> :
                                 <Edit3 className="h-4 w-4" />}
                              </div>
                              <span className="font-bold text-slate-900 font-mono text-sm">{node.node_key}</span>
                            </div>
                            <Badge className={
                              node.change === 'added' ? 'bg-emerald-500 text-white' :
                              node.change === 'removed' ? 'bg-red-500 text-white' :
                              'bg-amber-500 text-white'
                            }>
                              {node.change.toUpperCase()}
                            </Badge>
                          </div>
                          
                          {node.changed_fields && (
                            <div className="mt-4 pt-3 border-t border-slate-100 grid gap-3">
                              {Object.entries(node.changed_fields).map(([f, d]) => (
                                <div key={f} className="text-xs">
                                  <span className="text-slate-400 lowercase italic mr-2">{f}:</span>
                                  <span className="text-red-600/70 mr-2">{String(d.from)}</span>
                                  <span className="text-slate-300 mr-2">→</span>
                                  <span className="text-emerald-600 font-bold">{String(d.to)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Edge Diffs */}
                {diff?.edge_diffs && diff.edge_diffs.length > 0 && (
                  <section className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <GitBranch className="h-3.5 w-3.5" /> Edge Variations
                    </h4>
                    <div className="space-y-3">
                      {diff.edge_diffs.map((edge, i) => (
                        <div key={i} className={`bg-white p-3 rounded-xl border flex items-center gap-3 ${
                           edge.change === 'added' ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700'
                        }`}>
                           <AlertTriangle className="h-4 w-4 opacity-50" />
                           <span className="text-xs font-bold">{edge.change.toUpperCase()}:</span>
                           <span className="font-mono text-[10px]">{edge.source_node_key}</span>
                           <ChevronRight className="h-3 w-3 opacity-30" />
                           <span className="font-mono text-[10px]">{edge.target_node_key}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
