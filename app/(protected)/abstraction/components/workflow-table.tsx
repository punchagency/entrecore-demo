"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  Search,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Workflow, WorkflowStatus, SortField, SortOrder } from "@/types/abstraction";
import { cn } from "@/lib/utils";

export interface WorkflowTableProps {
  workflows: Workflow[];
  onSelectWorkflow?: (workflow: Workflow) => void;
  isLoading?: boolean;
}

export const statusConfig: Record<WorkflowStatus, { bg: string; text: string; icon: React.ReactNode }> =
{
  Active: {
    bg: "bg-emerald-50 hover:bg-emerald-100",
    text: "text-emerald-700",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  "In Development": {
    bg: "bg-blue-50 hover:bg-blue-100",
    text: "text-blue-700",
    icon: <Clock className="w-4 h-4" />,
  },
  Paused: {
    bg: "bg-amber-50 hover:bg-amber-100",
    text: "text-amber-700",
    icon: <Clock className="w-4 h-4" />,
  },
  Failed: {
    bg: "bg-rose-50 hover:bg-rose-100",
    text: "text-rose-700",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  Archived: {
    bg: "bg-slate-50 hover:bg-slate-100",
    text: "text-slate-700",
    icon: <Clock className="w-4 h-4" />,
  },
};

export function WorkflowTable({ workflows, onSelectWorkflow, isLoading }: WorkflowTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | "all">("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const filteredWorkflows = useMemo(() => {
    let filtered = [...workflows];

    if (statusFilter !== "all") {
      filtered = filtered.filter((w) => w.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.name.toLowerCase().includes(term) ||
          w.description.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortField) {
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "lastUpdated":
          aValue = new Date(a.lastUpdated).getTime();
          bValue = new Date(b.lastUpdated).getTime();
          break;
        case "successRate":
          aValue = a.metrics.successRate;
          bValue = b.metrics.successRate;
          break;
      }

      if (typeof aValue === "string") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue as string) : (bValue as string).localeCompare(aValue);
      } else {
        return sortOrder === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [workflows, searchTerm, statusFilter, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search workflows by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 border-slate-200 focus-visible:ring-blue-500"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as WorkflowStatus | "all")}>
          <SelectTrigger className="w-full sm:w-48 h-10 border-slate-200">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="In Development">In Development</SelectItem>
            <SelectItem value="Paused">Paused</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
            <SelectItem value="Archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow className="hover:bg-slate-50">
              <TableHead className="w-[200px] font-semibold text-slate-900">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSort("name")}
                  className="h-auto p-0 hover:bg-transparent text-slate-900 font-semibold text-left flex items-center gap-2"
                >
                  Workflow Name
                  <ArrowUpDown className="w-4 h-4 opacity-50" />
                </Button>
              </TableHead>
              <TableHead className="font-semibold text-slate-900">Description/Purpose</TableHead>
              <TableHead className="w-[120px] font-semibold text-slate-900">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSort("status")}
                  className="h-auto p-0 hover:bg-transparent text-slate-900 font-semibold text-left flex items-center gap-2"
                >
                  Status
                  <ArrowUpDown className="w-4 h-4 opacity-50" />
                </Button>
              </TableHead>
              <TableHead className="w-[180px] font-semibold text-slate-900">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSort("successRate")}
                  className="h-auto p-0 hover:bg-transparent text-slate-900 font-semibold text-left flex items-center gap-2"
                >
                  Metrics
                  <ArrowUpDown className="w-4 h-4 opacity-50" />
                </Button>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  Loading workflows...
                </TableCell>
              </TableRow>
            ) : filteredWorkflows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  No workflows found
                </TableCell>
              </TableRow>
            ) : (
              filteredWorkflows.map((workflow) => {
                const config = statusConfig[workflow.status];
                const isFailed = workflow.status === "Failed";

                return (
                  <TableRow
                    key={workflow.id}
                    className={cn(
                      "border-b border-slate-100 last:border-b-0 transition-colors cursor-pointer group",
                      config.bg,
                      isFailed && "ring-1 ring-inset ring-rose-300"
                    )}
                    onClick={() => onSelectWorkflow?.(workflow)}
                  >
                    <TableCell className="font-semibold text-slate-900">{workflow.name}</TableCell>
                    <TableCell className="text-slate-600 text-sm max-w-xs truncate">
                      {workflow.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-medium",
                            isFailed
                              ? "bg-rose-100 text-rose-700 hover:bg-rose-100"
                              : config.text
                          )}
                        >
                          {workflow.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="text-slate-600">
                          {workflow.metrics.recordsProcessed > 0
                            ? `${workflow.metrics.successRate.toFixed(1)}% Success`
                            : "—"}
                        </span>
                        <span className="text-slate-500">
                          {workflow.metrics.recordsProcessed > 0
                            ? `${workflow.metrics.recordsProcessed} records`
                            : "No pipeline data"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-slate-500">
        Showing {filteredWorkflows.length} of {workflows.length} workflows
      </div>
    </div>
  );
}
