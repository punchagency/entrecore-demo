import { Axios } from "@/app/config/axios";

export interface DriftEvent {
  id: string;
  connector_id: string;
  event_type: "added" | "removed" | "changed" | string;
  table_name: string;
  column_name?: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  note?: string;
  crawl_audit_id?: string;
}

export interface GetDriftEventsParams {
  table_name?: string;
  event_type?: string;
  acknowledged?: boolean | string;
  page?: number;
  page_size?: number;
}

export const getDriftEvents = async (
  connectorId: string,
  params?: GetDriftEventsParams
): Promise<{ events: DriftEvent[]; total: number }> => {
  const response = await Axios.get<any>(`/data/connectors/${connectorId}/drift`, {
    params,
  });

  const items = Array.isArray(response.data) ? response.data : (response.data.results || response.data.items || []);
  const total = response.data.total ?? response.data.count ?? items.length;

  const events = items.map((item: any) => {
    let description = item.description;
    if (!description) {
      const oldVal = item.old_value ? JSON.stringify(item.old_value) : '';
      const newVal = item.new_value ? JSON.stringify(item.new_value) : '';
      if (oldVal || newVal) {
        description = `${item.event_type.replace(/_/g, ' ')}: ${oldVal} -> ${newVal}`;
      } else {
        description = item.event_type.replace(/_/g, ' ');
      }
    }

    return {
      ...item,
      description,
      timestamp: item.detected_at || item.timestamp,
      note: item.review_note || item.note,
    };
  });

  return { events, total };
};

export const acknowledgeDriftEvent = async (
  connectorId: string,
  eventId: string,
  note: string = ""
): Promise<DriftEvent> => {
  const response = await Axios.patch<DriftEvent>(`/data/connectors/${connectorId}/drift/${eventId}`, {
    acknowledged: true,
    review_note: note,
  });
  return response.data;
};
