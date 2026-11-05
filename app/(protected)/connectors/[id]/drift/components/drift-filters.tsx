import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DriftFiltersProps {
  tableFilter: string;
  setTableFilter: (value: string) => void;
  eventTypeFilter: string;
  setEventTypeFilter: (value: string) => void;
  ackFilter: string;
  setAckFilter: (value: string) => void;
}

export function DriftFilters({
  tableFilter,
  setTableFilter,
  eventTypeFilter,
  setEventTypeFilter,
  ackFilter,
  setAckFilter,
}: DriftFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1">
        <Input
          placeholder="Filter by table name..."
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="bg-white/50 border-white/60 focus:bg-white"
        />
      </div>
      <div className="w-full sm:w-48">
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="bg-white/50 border-white/60 focus:bg-white">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="added">Added</SelectItem>
            <SelectItem value="removed">Removed</SelectItem>
            <SelectItem value="changed">Changed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-full sm:w-48">
        <Select value={ackFilter} onValueChange={setAckFilter}>
          <SelectTrigger className="bg-white/50 border-white/60 focus:bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="true">Acknowledged</SelectItem>
            <SelectItem value="false">Unacknowledged</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
