"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, CheckCircle2, XCircle, AlertCircle, 
  Search, Filter, ChevronRight, MessageSquare, 
  Database, UserCheck, ShieldAlert
} from "lucide-react";
import {
  useReviewQueue,
  useDecideReviewRow,
  useUpsertReviewRuns,
} from "../hooks/use-data-integrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function ReviewQueuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams?.get("job_id") || undefined;
  
  const [page, setPage] = useState(1);
  const [pendingOnly, setPendingOnly] = useState(true);
  
  const { data, isLoading } = useReviewQueue(jobId, pendingOnly, page, 20);
  const decideMutation = useDecideReviewRow();

  // Runs stopped on an ambiguous upsert key — surfaced here so there is one
  // place to look for anything needing a human, not two.
  const { data: parkedData } = useUpsertReviewRuns(jobId);
  const parkedRuns = parkedData?.items ?? [];

  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = useState("");

  const handleDecide = () => {
    if (!selectedRow || !decision) return;

    decideMutation.mutate(
      { id: selectedRow.id, decision, note },
      {
        onSuccess: () => {
          toast.success(`Row ${decision} successfully`);
          setSelectedRow(null);
          setDecision(null);
          setNote("");
        },
        onError: () => toast.error("Failed to submit decision"),
      }
    );
  };

  const rows = data?.rows || [];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-white"
              onClick={() => router.push("/data-room/integrations")}
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-amber-500" />
              Human Review Queue
            </h1>
          </div>
          <p className="text-slate-500 font-medium mt-2 ml-12">
            Records that failed validation, and writes that matched more than one existing record.
          </p>
        </div>

        <div className="flex items-center gap-3 ml-12 md:ml-0">
          <Button 
            variant={pendingOnly ? "default" : "outline"} 
            className="rounded-xl h-10"
            onClick={() => setPendingOnly(true)}
          >
            Pending
          </Button>
          <Button 
            variant={!pendingOnly ? "default" : "outline"} 
            className="rounded-xl h-10"
            onClick={() => setPendingOnly(false)}
          >
            All History
          </Button>
        </div>
      </div>

      {/* Stats / Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search record data or row IDs..." 
            className="pl-12 h-12 rounded-2xl bg-white border-slate-200 shadow-sm"
          />
        </div>
        <Button variant="outline" className="h-12 rounded-2xl bg-white border-slate-200 shadow-sm flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filters
        </Button>
      </div>

      {/* Write conflicts — a different kind of work item, but the same
          question ("what needs a human?"), so it lives on the same page. Two
          queues in two places is how a queue gets ignored. */}
      {parkedRuns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
              Write conflicts
            </h2>
            <Badge className="border-none bg-amber-100 text-amber-700 hover:bg-amber-100">
              {parkedRuns.length}
            </Badge>
          </div>
          <p className="-mt-1 text-sm text-slate-500">
            These runs found more than one existing record matching the write key, so they stopped
            rather than guess which one to overwrite.
          </p>
          {parkedRuns.map((run) => (
            <Card
              key={run.run_id}
              className="cursor-pointer rounded-3xl border-amber-200 transition-all hover:shadow-md"
              onClick={() =>
                router.push(
                  `/data-room/integrations/${run.job_id}/runs/${run.run_id}/review`
                )
              }
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">
                    {run.job_name ?? "Integration job"}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {run.rows_total - run.rows_decided} row
                    {run.rows_total - run.rows_decided === 1 ? "" : "s"} need a decision
                    {run.destination_table ? ` in ${run.destination_table}` : ""}
                    {run.records_written !== null
                      ? ` · ${run.records_written} already written`
                      : ""}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Queue Table */}
      <div className="space-y-4">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-3xl" />)
        ) : rows.length === 0 ? (
          <Card className="rounded-[2.5rem] border-dashed border-2 border-slate-200 p-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Inbox Zero</h3>
            <p className="text-slate-500 mt-2">No records currently awaiting human review.</p>
          </Card>
        ) : (
          rows.map((row) => (
            <Card 
              key={row.id} 
              className="rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group"
              onClick={() => setSelectedRow(row)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Row ID: {row.id.substring(0, 8)}</Badge>
                        <Badge className={cn(
                          "border-none text-[10px] font-black uppercase tracking-widest px-2 py-0.5",
                          row.review_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          row.review_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-red-100 text-red-700'
                        )}>
                          {row.review_status}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Run ID: {row.run_id.substring(0, 8)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(row.row_data).slice(0, 4).map(([key, val]: [string, any]) => (
                        <div key={key}>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{key}</p>
                          <p className="text-sm font-bold text-slate-900 truncate">{String(val)}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">Validation Failures</p>
                      <div className="flex flex-wrap gap-2">
                        {row.validation_failures.map((fail: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl text-xs font-medium text-red-700">
                            <AlertCircle className="w-3 h-3" />
                            <span>{fail.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-48 flex lg:flex-col justify-end gap-2 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                    {row.review_status === 'pending' ? (
                      <>
                        <Button 
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRow(row);
                            setDecision("approved");
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Approve
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRow(row);
                            setDecision("rejected");
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-2" /> Reject
                        </Button>
                      </>
                    ) : (
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          <UserCheck className="w-3 h-3" />
                          Reviewed By
                        </div>
                        <p className="text-sm font-black text-slate-900">{row.reviewed_by?.substring(0, 12) || "System"}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Decision Dialog */}
      <Dialog open={!!decision} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl p-8 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase flex items-center gap-3">
              {decision === 'approved' ? (
                <div className="p-2 bg-emerald-100 rounded-xl"><CheckCircle2 className="w-6 h-6 text-emerald-600" /></div>
              ) : (
                <div className="p-2 bg-red-100 rounded-xl"><XCircle className="w-6 h-6 text-red-600" /></div>
              )}
              {decision === 'approved' ? 'Approve Record' : 'Reject Record'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Internal Reviewer Note</label>
              <Textarea 
                placeholder="Optional explanation for this decision..."
                className="rounded-2xl bg-slate-50 border-slate-200 focus:ring-blue-500 h-32"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setDecision(null)}>Cancel</Button>
            <Button 
              className={cn(
                "rounded-xl px-8 font-black uppercase tracking-widest shadow-lg",
                decision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'
              )}
              onClick={handleDecide}
              disabled={decideMutation.isPending}
            >
              Confirm {decision}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
