"use client";

import { useEffect, useState, use } from "react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import { QueryErrorState } from "@/components/query-error-state";
import { ArrowLeft, Activity } from "lucide-react";
import Link from "next/link";

import { PageWrapper } from "@/components/page-wrapper";
import { DriftFilters } from "./components/drift-filters";
import { DriftEventsList } from "./components/drift-events-list";
import { DriftAckDialog } from "./components/drift-ack-dialog";
import { DriftEvent, getDriftEvents, acknowledgeDriftEvent, GetDriftEventsParams } from "./services/drift-api";

export default function DriftPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const connectorId = resolvedParams.id;

  const [events, setEvents] = useState<DriftEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  // Filters
  const [tableFilter, setTableFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [ackFilter, setAckFilter] = useState("all");

  // Dialog State
  const [selectedEvent, setSelectedEvent] = useState<DriftEvent | null>(null);
  const [isAckDialogOpen, setIsAckDialogOpen] = useState(false);

  useEffect(() => {
    // Reset page to 1 when filters change
    setPage(1);
  }, [tableFilter, eventTypeFilter, ackFilter]);

  useEffect(() => {
    fetchEvents();
  }, [connectorId, tableFilter, eventTypeFilter, ackFilter, page]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const apiParams: GetDriftEventsParams = {
        page,
        page_size: pageSize
      };
      
      if (tableFilter) apiParams.table_name = tableFilter;
      if (eventTypeFilter !== "all") apiParams.event_type = eventTypeFilter;
      if (ackFilter !== "all") apiParams.acknowledged = ackFilter;

      const { events: fetchedEvents, total: fetchedTotal } = await getDriftEvents(connectorId, apiParams);
      setEvents(fetchedEvents);
      setTotal(fetchedTotal);
    } catch (error) {
      console.error("Failed to fetch drift events", error);
      setLoadError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledgeClick = (event: DriftEvent) => {
    setSelectedEvent(event);
    setIsAckDialogOpen(true);
  };

  const handleAcknowledgeSubmit = async (eventId: string, note: string) => {
    try {
      await acknowledgeDriftEvent(connectorId, eventId, note);
      toast.success("Event acknowledged successfully");
      
      // Update local state to reflect the change
      setEvents((prev) => 
        prev.map((e) => 
          e.id === eventId 
            ? { ...e, acknowledged: true, note, acknowledged_at: new Date().toISOString() } 
            : e
        )
      );
    } catch (error) {
      console.error("Failed to acknowledge event", error);
      showApiErrorToast(error, "Failed to acknowledge event");
      throw error; // Re-throw to be handled by the dialog component
    }
  };

  return (
    <PageWrapper>
      <div className="p-8 pb-32 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/connectors" className="text-gray-400 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 flex items-center gap-3">
              <Activity className="h-10 w-10 text-blue-500" />
              Drift Monitor
            </h1>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">
              Schema evolution and data quality events for connector
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <DriftFilters
            tableFilter={tableFilter}
            setTableFilter={setTableFilter}
            eventTypeFilter={eventTypeFilter}
            setEventTypeFilter={setEventTypeFilter}
            ackFilter={ackFilter}
            setAckFilter={setAckFilter}
          />
          
          {loadError != null && !isLoading ? (
            <QueryErrorState
              error={loadError}
              title="Couldn't load drift events"
              onRetry={() => void fetchEvents()}
            />
          ) : (
            <DriftEventsList
              events={events}
              isLoading={isLoading}
              onAcknowledge={handleAcknowledgeClick}
              page={page}
              totalPages={Math.ceil(total / pageSize) || 1}
              onPageChange={setPage}
            />
          )}
        </div>

        <DriftAckDialog
          isOpen={isAckDialogOpen}
          onClose={() => setIsAckDialogOpen(false)}
          event={selectedEvent}
          onSubmit={handleAcknowledgeSubmit}
        />
      </div>
    </PageWrapper>
  );
}
