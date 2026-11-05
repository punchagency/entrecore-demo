import { create } from "zustand";
import { Axios } from "../config/axios";
import { toast } from "sonner";
import { getApiError, showApiErrorToast } from "@/utils/api-error";
import { useUserStore } from "./userStore";

export interface LLMConfiguration {
  llm_provider: string;
  llm_endpoint?: string;
  llm_model?: string;
  llm_api_version?: string;
  llm_api_key?: string;
}

export interface Company {
  company_bio?: string;
  company_name?: string;
  year_founded?: number;
  month_founded?: number | string;
  company_overview?: string;
  state_registered?: string;
  business_entity_type?: string;
  id?: string;
  is_active?: boolean;
  is_default?: boolean;
  profile_image?: string;
  cover_image?: string;
  info?: any;
  llm_provider?: string;
  llm_configurations?: LLMConfiguration[];
}

interface CompaniesStore {
  companies: Company[];
  company: Company | null;
  isLoading: boolean;
  error: string | null;
  /** The raw failure behind `error`, so screens can show its status and correlation ID. */
  fetchError: unknown;
  fetchCompanies: (silent?: boolean) => Promise<void>;
  fetchCompany: () => Promise<void>;
  setDefaultCompany: (companyId: string) => Promise<void>;
  setActiveCompany: (companyId: string) => Promise<void>;
  updateLLMProvider: (companyId: string, llmProvider: string) => Promise<void>;
  getActiveCompanyLLM: () => string | null;
  getLLMConfig: (companyId: string) => Promise<any>;
  updateLLMConfig: (
    companyId: string,
    config: {
      llm_provider?: string;
      llm_model?: string;
      llm_endpoint?: string;
      llm_api_version?: string;
    }
  ) => Promise<void>;
  updateLLMApiKey: (companyId: string, apiKeyData: any) => Promise<void>;
}

export const useCompaniesStore = create<CompaniesStore>((set, get) => ({
  companies: [],
  company: null,
  isLoading: false,
  error: null,
  fetchError: null,

  fetchCompanies: async (silent = false) => {
    if (!silent) set({ isLoading: true, error: null, fetchError: null });
    try {
      const response = await Axios.get("/auth/company/companies");
      let companiesList: Company[] = Array.isArray(response.data) ? response.data : [];

      // The selected/active company must always be in the list. If it is missing
      // (e.g. just joined), load its profile and add it; otherwise pages fall back
      // to companies[0] and overwrite selectedCompanyId, silently undoing the switch.
      const user = useUserStore.getState().user;
      const membershipId =
        localStorage.getItem("selectedCompanyId") ||
        user?.active_company ||
        user?.company_id ||
        null;
      if (membershipId && !companiesList.some((c) => String(c.id) === String(membershipId))) {
        try {
          const profile = await Axios.get(`/auth/company/profile/${membershipId}`);
          if (profile.data?.id) {
            companiesList = [...companiesList, profile.data];
          }
        } catch (profileError) {
          console.warn("Could not load membership company profile:", profileError);
        }
      }

      // 1. Check if we already have a default company in our local state
      const currentLocalDefault = get().companies.find((c) => c.is_default);
      const serverDefaults = companiesList.filter((c: any) => c.is_default);

      let decidedDefaultId = "";

      // 2. Decide which ID to use
      if (currentLocalDefault) {
        // If we have a local default, keep it! Even if the server doesn't report it yet.
        // This stops the "jump back" behavior.
        decidedDefaultId = currentLocalDefault.id || "";
      } else if (serverDefaults.length > 0) {
        // Only if we have NO local default, we take the first one from the server.
        decidedDefaultId = serverDefaults[0].id || "";
      }

      // 3. Map everything to ensure ONLY that one (if any) is default
      const sanitizedCompanies = companiesList.map((company: Company) => ({
        ...company,
        is_default: company.id === decidedDefaultId,
      }));

      set({ companies: sanitizedCompanies, isLoading: false });
    } catch (error: any) {
      console.error("Error fetching companies:", error);
      set({
        error: getApiError(error, "Failed to fetch companies").message,
        fetchError: error,
        isLoading: false,
      });
      showApiErrorToast(error, "Failed to load companies");
    }
  },

  fetchCompany: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = useUserStore.getState().user;
      const companyId = localStorage.getItem("selectedCompanyId") || user?.active_company || null;
      if (!companyId) {
        set({ error: "No company ID found", isLoading: false });
        return;
      }

      const response = await Axios.get(`/auth/company/profile/${companyId}`);
      set({ company: response.data, isLoading: false });
    } catch (error: any) {
      console.error("Error fetching company:", error);
      set({
        error: getApiError(error, "Failed to fetch company").message,
        fetchError: error,
        isLoading: false,
      });
      showApiErrorToast(error, "Failed to load company");
    }
  },

  setDefaultCompany: async (companyId: string) => {
    const previousCompanies = get().companies;
    const targetCompany = previousCompanies.find((c) => String(c.id) === String(companyId));

    if (!targetCompany) return;

    const newIsDefaultState = !targetCompany.is_default;

    // 1. Optimistic Update (Immediate Feedback)
    const optimisticCompanies = previousCompanies.map((c) => {
      // Use string comparison to be safe
      if (String(c.id) === String(companyId)) {
        return { ...c, is_default: newIsDefaultState };
      }
      if (newIsDefaultState) {
        return { ...c, is_default: false };
      }
      return c;
    });

    set({ companies: optimisticCompanies });

    try {
      // 2. Send the Primary Update
      await Axios.put(`/auth/onboarding/company?company_id=${companyId}`, {
        is_default: newIsDefaultState,
      });

      toast.success(newIsDefaultState ? "Default company set" : "Default company removed");

      // 3. Aggressive Cleanup of Garbage Defaults on Server
      // The server seems to allow multiple defaults (additive). We must manually unset others.
      if (newIsDefaultState) {
        const rawResponse = await Axios.get("/auth/company/companies");
        const serverDefaults = rawResponse.data.filter((c: Company) => c.is_default);

        // Find any company that is default on server BUT is NOT our target
        const defaultsToKill = serverDefaults.filter(
          (c: Company) => String(c.id) !== String(companyId)
        );

        if (defaultsToKill.length > 0) {
          console.log(`Cleaning up ${defaultsToKill.length} stale defaults...`);
          await Promise.all(
            defaultsToKill.map((c: Company) =>
              Axios.put(`/auth/onboarding/company?company_id=${c.id}`, {
                is_default: false,
              })
            )
          );
        }
      }

      // 4. Final Sync
      // Now that we've cleaned the server, fetch strictly.
      await get().fetchCompanies(true);

      // Update single profile view if needed
      const currentCompany = get().company;
      if (currentCompany && String(currentCompany.id) === String(companyId)) {
        set({ company: { ...currentCompany, is_default: newIsDefaultState } });
      }
    } catch (error: any) {
      console.error("Error setting default company:", error);
      set({ companies: previousCompanies }); // Revert on failure
      showApiErrorToast(error, "Failed to update default company");
    }
  },

  setActiveCompany: async (companyId: string) => {
    try {
      const company = get().company;

      const response = await Axios.put(
        `/auth/onboarding/company?company_id=${companyId}`,
        {
          is_active: !company?.is_active,
        }
      );
      console.log(companyId);

      if (response.status === 200) {
        if (!company?.is_active) {
          try {
            const userStore = useUserStore.getState();
            if (!userStore.user) {
              throw new Error("User not found in store");
            }
            userStore.setUser({
              ...userStore.user,
              company_id: companyId,
            });

            toast.success("Active company updated and user profile updated");
          } catch (userUpdateError: any) {
            console.error("Error updating user profile:", userUpdateError);
            toast.warning("Company set as active, but failed to update user profile");
          }
        } else {
          toast.success("Active company updated");
        }

        await get().fetchCompany();
      } else {
        toast.error("Failed to update active company");
      }
    } catch (error: any) {
      console.error("Error setting active company:", error);
      const errorMessage = error.response?.data?.message || "Failed to update active company";
      toast.error(errorMessage);
    }
  },

  updateLLMProvider: async (companyId: string, llmProvider: string) => {
    try {
      const response = await Axios.put(
        `/auth/onboarding/company?company_id=${companyId}`,
        {
          llm_provider: llmProvider,
        }
      );

      if (response.status === 200) {
        toast.success("LLM provider updated");
        await get().fetchCompany();
      } else {
        toast.error("Failed to update LLM provider");
      }
    } catch (error: any) {
      console.error("Error updating LLM provider:", error);
      const errorMessage = error.response?.data?.message || "Failed to update LLM provider";
      toast.error(errorMessage);
    }
  },

  getActiveCompanyLLM: () => {
    const company = get().company;

    // First check if there are custom LLM configurations
    if (company?.llm_configurations && company.llm_configurations.length > 0) {
      const activeConfig = company.llm_configurations.find(
        (config) => config.llm_provider === company?.llm_provider
      );
      if (activeConfig) {
        return activeConfig.llm_provider;
      }
    }

    // Fall back to the configured provider or default to Azure
    return company?.llm_provider || "azure";
  },

  getLLMConfig: async (companyId: string) => {
    try {
      const response = await Axios.get(`/auth/company/${companyId}/llm-config`);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching LLM config:", error);
      throw error;
    }
  },

  updateLLMConfig: async (companyId: string, config: any) => {
    try {
      // First update the LLM config (provider, model, endpoint, api_version)
      const configPayload = {
        llm_provider: config.llm_provider,
        llm_model: config.llm_model,
        llm_endpoint: config.llm_endpoint,
        llm_api_version: config.llm_api_version,
      };

      const configResponse = await Axios.put(
        `/auth/company/${companyId}/llm-config`,
        configPayload
      );

      if (configResponse.status === 200) {
        // Then update the API key separately
        if (config.llm_api_key) {
          const apiKeyResponse = await Axios.put(`/auth/company/${companyId}/llm-api-key`, {
            llm_api_key: config.llm_api_key,
          });

          if (apiKeyResponse.status === 200) {
            toast.success("LLM configuration and API key updated successfully");
            await get().fetchCompany();
          } else {
            toast.error("LLM config updated but API key failed");
          }
        } else {
          toast.success("LLM configuration updated");
          await get().fetchCompany();
        }
      } else {
        toast.error("Failed to update LLM configuration");
      }
    } catch (error: any) {
      console.error("Error updating LLM config:", error);
      const errorMessage = error.response?.data?.message || "Failed to update LLM configuration";
      toast.error(errorMessage);
      throw error;
    }
  },

  updateLLMApiKey: async (companyId: string, apiKeyData: any) => {
    try {
      const response = await Axios.put(`/auth/company/${companyId}/llm-api-key`, apiKeyData);
      if (response.status === 200) {
        toast.success("API key updated successfully");
        await get().fetchCompany();
      } else {
        toast.error("Failed to update API key");
      }
    } catch (error: any) {
      console.error("Error updating LLM API key:", error);
      const errorMessage = error.response?.data?.message || "Failed to update API key";
      toast.error(errorMessage);
      throw error;
    }
  },
}));
