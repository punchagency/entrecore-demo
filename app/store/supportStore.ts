import { create } from "zustand";
import { toast } from "sonner";

import { Axios } from "../config/axios";
import { setAccessToken } from "../config/session";
import { useUserStore } from "./userStore";

export type SupportScope = "read" | "member" | "admin";

export interface SupportGrantStatus {
  active: boolean;
  can_manage: boolean;
  scope: SupportScope | null;
  expires_at: string | null;
  granted_by_email: string | null;
  escalation_reason: string | null;
  company_id: string | null;
}

export interface SupportCompany {
  company_id: string;
  company_name: string;
  scope: SupportScope;
  expires_at: string;
  grant_id: string;
}

interface SupportState {
  status: SupportGrantStatus | null;
  companies: SupportCompany[];
  loading: boolean;
  error: string | null;
  fetchStatus: () => Promise<void>;
  enable: (scope: SupportScope, durationHours: number, reason?: string) => Promise<void>;
  revoke: () => Promise<void>;
  fetchCompanies: () => Promise<void>;
  join: (companyId: string) => Promise<void>;
  leave: () => Promise<void>;
}

function errorMessage(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const record = detail as { message?: string; reason?: string };
    if (record.message) return record.message;
    if (record.reason) return record.reason.replace(/_/g, " ");
  }
  return fallback;
}

async function storeAccessToken(data: { access_token?: string } | undefined) {
  if (data?.access_token) {
    setAccessToken(data.access_token);
  }
  await useUserStore.getState().fetchUser();
}

export const useSupportStore = create<SupportState>((set, get) => ({
  status: null,
  companies: [],
  loading: false,
  error: null,

  fetchStatus: async () => {
    try {
      const response = await Axios.get<SupportGrantStatus>("/auth/support/grants/status");
      set({ status: response.data, error: null });
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 400 || status === 403) {
        set({
          status: {
            active: false,
            can_manage: false,
            scope: null,
            expires_at: null,
            granted_by_email: null,
            escalation_reason: null,
            company_id: null,
          },
        });
        return;
      }
      set({ error: errorMessage(error, "Could not load support access") });
    }
  },

  enable: async (scope, durationHours, reason) => {
    set({ loading: true, error: null });
    try {
      const response = await Axios.post<SupportGrantStatus>("/auth/support/grants", {
        scope,
        duration_hours: durationHours,
        escalation_reason: reason || null,
      });
      set({ status: response.data, loading: false });
      toast.success("Support access enabled");
    } catch (error) {
      const message = errorMessage(error, "Could not enable support access");
      set({ loading: false, error: message });
      toast.error(message);
      throw error;
    }
  },

  revoke: async () => {
    set({ loading: true, error: null });
    try {
      await Axios.delete("/auth/support/grants");
      await get().fetchStatus();
      set({ loading: false });
      toast.success("Support access revoked");
    } catch (error) {
      const message = errorMessage(error, "Could not revoke support access");
      set({ loading: false, error: message });
      toast.error(message);
      throw error;
    }
  },

  fetchCompanies: async () => {
    set({ loading: true, error: null });
    try {
      const response = await Axios.get<SupportCompany[]>("/auth/support/companies");
      set({ companies: response.data, loading: false });
    } catch (error) {
      const message = errorMessage(error, "Could not load companies");
      set({ loading: false, error: message, companies: [] });
    }
  },

  join: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const response = await Axios.post("/auth/support/join", { company_id: companyId });
      await storeAccessToken(response.data);
      set({ loading: false });
      toast.success("Joined company for support");
    } catch (error) {
      const message = errorMessage(error, "Could not join this company");
      set({ loading: false, error: message });
      toast.error(message);
      throw error;
    }
  },

  leave: async () => {
    set({ loading: true, error: null });
    try {
      const response = await Axios.post("/auth/support/leave");
      await storeAccessToken(response.data);
      set({ loading: false });
      toast.success("Left support session");
    } catch (error) {
      const message = errorMessage(error, "Could not leave support");
      set({ loading: false, error: message });
      toast.error(message);
      throw error;
    }
  },
}));
