import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Axios } from "../config/axios";

interface DataCountsState {
  // Section counts
  employees: number;
  documents: number;
  knowledgeGraph: number;
  financials: number;
  catalog: number;
  intellectualProperty: number;
  legal: number;
  previousFunding: number;
  companyDocuments: number;
  others: number;

  employeesLastUpdated: string | null;
  documentsLastUpdated: string | null;
  knowledgeGraphLastUpdated: string | null;
  financialsLastUpdated: string | null;
  catalogLastUpdated: string | null;
  intellectualPropertyLastUpdated: string | null;
  legalLastUpdated: string | null;
  previousFundingLastUpdated: string | null;
  companyDocumentsLastUpdated: string | null;
  othersLastUpdated: string | null;

  // Update methods
  setEmployeeCount: (count: number) => void;
  setDocumentCount: (count: number) => void;
  setKnowledgeGraphCount: (count: number) => void;
  setFinancialCount: (count: number) => void;
  setCatalogCount: (count: number) => void;
  setIntellectualPropertyCount: (count: number) => void;
  setLegalCount: (count: number) => void;
  setPreviousFundingCount: (count: number) => void;
  setCompanyDocumentsCount: (count: number) => void;
  setOthersCount: (count: number) => void;

  updateEmployeesTimestamp: () => void;
  updateDocumentsTimestamp: () => void;
  updateKnowledgeGraphTimestamp: () => void;
  updateFinancialsTimestamp: () => void;
  updateCatalogTimestamp: () => void;
  updateIntellectualPropertyTimestamp: () => void;
  updateLegalTimestamp: () => void;
  updatePreviousFundingTimestamp: () => void;
  updateCompanyDocumentsTimestamp: () => void;
  updateOthersTimestamp: () => void;

  fetchAllCounts: (companyId: string) => Promise<void>;
  fetchAllCountsIfNeeded: (companyId: string) => Promise<void>;
  refreshAllCounts: (companyId: string) => Promise<void>;
  resetCounts: () => void;
  hasValidCounts: () => boolean;
}

export const useDataCountsStore = create<DataCountsState>()(
  persist(
    (set, get) => ({
      employees: 0,
      documents: 0,
      knowledgeGraph: 0,
      financials: 0,
      catalog: 0,
      intellectualProperty: 0,
      legal: 0,
      previousFunding: 0,
      companyDocuments: 0,
      others: 0,

      employeesLastUpdated: null,
      documentsLastUpdated: null,
      knowledgeGraphLastUpdated: null,
      financialsLastUpdated: null,
      catalogLastUpdated: null,
      intellectualPropertyLastUpdated: null,
      legalLastUpdated: null,
      previousFundingLastUpdated: null,
      companyDocumentsLastUpdated: null,
      othersLastUpdated: null,

      setEmployeeCount: (count: number) => set({ employees: count }),
      setDocumentCount: (count: number) => set({ documents: count }),
      setKnowledgeGraphCount: (count: number) => set({ knowledgeGraph: count }),
      setFinancialCount: (count: number) => set({ financials: count }),
      setCatalogCount: (count: number) => set({ catalog: count }),
      setIntellectualPropertyCount: (count: number) => set({ intellectualProperty: count }),
      setLegalCount: (count: number) => set({ legal: count }),
      setPreviousFundingCount: (count: number) => set({ previousFunding: count }),
      setCompanyDocumentsCount: (count: number) => set({ companyDocuments: count }),
      setOthersCount: (count: number) => set({ others: count }),

      updateEmployeesTimestamp: () => set({ employeesLastUpdated: new Date().toISOString() }),
      updateDocumentsTimestamp: () => set({ documentsLastUpdated: new Date().toISOString() }),
      updateKnowledgeGraphTimestamp: () => set({ knowledgeGraphLastUpdated: new Date().toISOString() }),
      updateFinancialsTimestamp: () => set({ financialsLastUpdated: new Date().toISOString() }),
      updateCatalogTimestamp: () => set({ catalogLastUpdated: new Date().toISOString() }),
      updateIntellectualPropertyTimestamp: () =>
        set({ intellectualPropertyLastUpdated: new Date().toISOString() }),
      updateLegalTimestamp: () => set({ legalLastUpdated: new Date().toISOString() }),
      updatePreviousFundingTimestamp: () =>
        set({ previousFundingLastUpdated: new Date().toISOString() }),
      updateCompanyDocumentsTimestamp: () =>
        set({ companyDocumentsLastUpdated: new Date().toISOString() }),
      updateOthersTimestamp: () => set({ othersLastUpdated: new Date().toISOString() }),

      hasValidCounts: () => {
        const state = get();
        // Check if we have any non-zero counts or last updated timestamps
        return (
          state.employees > 0 ||
          state.knowledgeGraph > 0 ||
          state.companyDocuments > 0 ||
          state.financials > 0 ||
          state.employeesLastUpdated !== null ||
          state.knowledgeGraphLastUpdated !== null ||
          state.companyDocumentsLastUpdated !== null ||
          state.financialsLastUpdated !== null
        );
      },

      resetCounts: () => {
        set({
          employees: 0,
          knowledgeGraph: 0,
          financials: 0,
          catalog: 0,
          companyDocuments: 0,
          intellectualProperty: 0,
          legal: 0,
          previousFunding: 0,
          others: 0,
          employeesLastUpdated: null,
          knowledgeGraphLastUpdated: null,
          companyDocumentsLastUpdated: null,
        });
      },

      fetchAllCounts: async (companyId: string) => {
        if (!companyId) return;

        const endpoints = [
          { key: "employees", url: "/data/employees/", timestamp: "updateEmployeesTimestamp" },
          { key: "knowledgeGraph", url: "/data/glossary/", timestamp: "updateKnowledgeGraphTimestamp" },
          { key: "companyDocuments", url: "/data/company-documents/", timestamp: "updateCompanyDocumentsTimestamp" },
          { key: "financials", url: "/data/financial-statements/", timestamp: "updateFinancialsTimestamp" },
          { key: "catalog", url: "/data/catalog/", timestamp: "updateCatalogTimestamp" },
        ];

        await Promise.allSettled(
          endpoints.map(async (endpoint) => {
            try {
              const response = await Axios.get(endpoint.url, {
                params: { skip: 0, limit: 100, company_id: companyId },
              });

              let count = 0;
              if (response.data) {
                if ("total" in response.data) count = response.data.total;
                else if ("items" in response.data) count = response.data.items.length;
                else if (Array.isArray(response.data)) count = response.data.length;
              }

              const updates: any = { [endpoint.key]: count };
              // Also update the timestamp
              const now = new Date().toISOString();
              updates[`${endpoint.key}LastUpdated`] = now;

              set(updates);
            } catch (error: any) {
              // If the resource is not found (404), treat it as 0 count
              if (error.response?.status === 404) {
                const updates: any = { [endpoint.key]: 0 };
                updates[`${endpoint.key}LastUpdated`] = new Date().toISOString();
                set(updates);
              } else {
                console.error(`Error fetching ${endpoint.key} counts:`, error);
              }
            }
          })
        );
      },

      fetchAllCountsIfNeeded: async (companyId: string) => {
        const currentState = get();

        if (currentState.hasValidCounts()) {
          console.log("Data counts already exist in storage, skipping API fetch");
          return;
        }

        console.log("No data counts found in storage, fetching from API...");
        await currentState.fetchAllCounts(companyId);
      },

      refreshAllCounts: async (companyId: string) => {
        console.log("Force refreshing all data counts from API...");
        const currentState = get();
        await currentState.fetchAllCounts(companyId);
      },
    }),
    {
      name: "data-counts-storage",
    }
  )
);
