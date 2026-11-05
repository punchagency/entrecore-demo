import { create } from "zustand";

interface TableFetchedIdState {
  TableId: string[];
  setTableId: (id: string) => void;
  removeTableId: (id: string) => void;
  clearTableId: () => void;
}

export const useTableFetchedIdStore = create<TableFetchedIdState>()((set, get) => ({
  TableId: [],

  setTableId: (id) => set({ TableId: [...get().TableId, id] }),

  removeTableId: (id) => set({ TableId: get().TableId.filter((tId) => tId !== id) }),

  clearTableId: () => set({ TableId: [] }),
}));
