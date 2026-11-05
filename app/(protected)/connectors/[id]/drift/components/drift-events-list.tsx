import { format } from "date-fns";
import { PlusCircle, MinusCircle, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DriftEvent } from "../services/drift-api";

interface DriftEventsListProps {
  events: DriftEvent[];
  isLoading: boolean;
  onAcknowledge: (event: DriftEvent) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function DriftEventsList({ 
  events, 
  isLoading, 
  onAcknowledge,
  page,
  totalPages,
  onPageChange
}: DriftEventsListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48 bg-white/40 rounded-2xl border border-white/60">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-white/40 rounded-2xl border border-white/60 text-gray-500">
        <AlertCircle className="h-8 w-8 mb-2 text-gray-400" />
        <p>No drift events found</p>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "added":
        return <PlusCircle className="h-4 w-4 text-green-500 mr-2" />;
      case "removed":
        return <MinusCircle className="h-4 w-4 text-red-500 mr-2" />;
      case "changed":
        return <RefreshCw className="h-4 w-4 text-blue-500 mr-2" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500 mr-2" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "added":
        return "default"; // or custom green
      case "removed":
        return "destructive";
      case "changed":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-sm overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="font-bold">Event Type</TableHead>
              <TableHead className="font-bold">Table</TableHead>
              <TableHead className="font-bold">Column</TableHead>
              <TableHead className="font-bold">Details</TableHead>
              <TableHead className="font-bold">Timestamp</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} className="hover:bg-white/50 transition-colors">
                <TableCell>
                  <div className="flex items-center capitalize font-medium">
                    {getEventIcon(event.event_type)}
                    <Badge variant={getBadgeVariant(event.event_type) as any}>
                      {event.event_type}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{event.table_name}</TableCell>
                <TableCell className="font-mono text-sm text-gray-500">
                  {event.column_name || "-"}
                </TableCell>
                <TableCell className="max-w-xs truncate" title={event.description}>
                  {event.description}
                  {event.crawl_audit_id && (
                    <span
                      className="ml-2 inline-flex items-center text-blue-500 text-xs"
                      title={`Crawl audit ${event.crawl_audit_id}`}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Audit
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                  {format(new Date(event.timestamp + (event.timestamp.endsWith('Z') ? '' : 'Z')), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell>
                  {event.acknowledged ? (
                    <div className="flex flex-col">
                      <div className="flex items-center text-green-600 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Ack'd
                      </div>
                      {event.acknowledged_by && (
                        <span className="text-[10px] text-gray-400 mt-1">by {event.acknowledged_by}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-amber-500 text-sm font-medium">Pending</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!event.acknowledged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAcknowledge(event)}
                      className="h-8 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                    >
                      Acknowledge
                    </Button>
                  )}
                  {event.acknowledged && event.note && (
                    <span className="text-xs text-gray-500 italic max-w-[100px] truncate block ml-auto" title={event.note}>
                      Note: {event.note}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-white/60 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Showing page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              className="h-8 w-8 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                Math.abs(pageNum - page) <= 1
              ) {
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className={`h-8 w-8 rounded-lg text-xs ${
                      page === pageNum
                        ? "bg-blue-600 text-white font-bold"
                        : "text-slate-600"
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              }
              if (
                (pageNum === 2 && page > 3) ||
                (pageNum === totalPages - 1 && page < totalPages - 2)
              ) {
                return (
                  <span key={pageNum} className="px-1.5 text-xs text-slate-400">
                    ...
                  </span>
                );
              }
              return null;
            })}
            <Button
              variant="ghost"
              size="icon"
              disabled={page === totalPages}
              onClick={() => onPageChange(page + 1)}
              className="h-8 w-8 rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
