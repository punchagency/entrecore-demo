import { create } from 'zustand';
import { Node, Edge } from 'reactflow';

export type LineageJobStatus = 'idle' | 'starting' | 'running' | 'completed' | 'failed';

interface TableLineageGraph {
  nodes: Node[];
  edges: Edge[];
  fetchedAt: number;
}

interface LineageState {
  graphs: Record<string, TableLineageGraph | undefined>;
  statusByTableId: Record<string, LineageJobStatus>;
  errorByTableId: Record<string, string | null | undefined>;

  setGraph: (tableId: string, graph: TableLineageGraph | undefined) => void;
  setStatus: (tableId: string, status: LineageJobStatus) => void;
  setError: (tableId: string, error: string | null) => void;
  clear: (tableId: string) => void;
}

export const useLineageStore = create<LineageState>((set) => ({
  graphs: {},
  statusByTableId: {},
  errorByTableId: {},

  setGraph: (tableId, graph) =>
    set((state) => ({
      graphs: { ...state.graphs, [tableId]: graph },
    })),

  setStatus: (tableId, status) =>
    set((state) => ({
      statusByTableId: { ...state.statusByTableId, [tableId]: status },
    })),

  setError: (tableId, error) =>
    set((state) => ({
      errorByTableId: { ...state.errorByTableId, [tableId]: error },
    })),

  clear: (tableId) =>
    set((state) => ({
      graphs: { ...state.graphs, [tableId]: undefined },
      statusByTableId: { ...state.statusByTableId, [tableId]: 'idle' },
      errorByTableId: { ...state.errorByTableId, [tableId]: null },
    })),
}));


