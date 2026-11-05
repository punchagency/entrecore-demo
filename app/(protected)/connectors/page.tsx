"use client";

import Image from "next/image";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { ChevronDown, Loader2, Plus, Check, AlertCircle, Zap } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Axios } from "@/app/config/axios";
import { useUserStore } from "@/app/store/userStore";
import { useCompaniesStore, Company } from "@/app/store/companiesStore";
import { setSelectedCompany as setSelectedCompanyInStorage } from "@/utils/api-utils";
import { useCrawlJobStore } from "@/app/store/crawlJobStore";

import { App, Service } from "@/app/(protected)/coreos/types";
import { appsMapping } from "@/app/(protected)/coreos/constants";
import {
  saveBigQueryState,
  saveNetSuiteState,
  saveAirtableState,
  saveNotionState,
  saveGoogleDriveState,
} from "@/app/(protected)/coreos/utils";
import { useBigQueryConnector } from "@/app/(protected)/coreos/hooks/useBigQueryConnector";
import { useNetSuiteConnector } from "@/app/(protected)/coreos/hooks/useNetSuiteConnector";
import { useAirtableConnector } from "@/app/(protected)/coreos/hooks/useAirtableConnector";
import { useGoogleDriveConnector } from "@/app/(protected)/coreos/hooks/useGoogleDriveConnector";
import { usePlatformConnectorId } from "@/app/(protected)/coreos/hooks/usePlatformConnectorId";
import { ServiceSelectionModal } from "@/app/(protected)/coreos/components/service-selection-modal";
import { BigQueryConfigDialog } from "@/app/(protected)/coreos/components/bigquery-config-dialog";
import { NetSuiteConfigDialog } from "@/app/(protected)/coreos/components/netsuite-config-dialog";
import { AirtableConfigDialog } from "@/app/(protected)/coreos/components/airtable-config-dialog";
import { NotionConfigDialog } from "@/app/(protected)/coreos/components/notion-config-dialog";
import { GoogleDriveConfigDialog } from "@/app/(protected)/coreos/components/google-drive-config-dialog";
import { PageWrapper } from "@/components/page-wrapper";

import { ConnectorCard } from "./components/connector-card";
import { ConnectorEmptyState } from "./components/connector-empty-state";
import { ConnectorHubOrb } from "./components/connector-hub-orb";
import { ConnectorGridSkeleton } from "./components/connector-grid-skeleton";
import { AvailableConnectorCard } from "./components/available-connector-card";
import { QueryErrorState } from "@/components/query-error-state";
import { showApiErrorToast } from "@/utils/api-error";

const KNOWN_CONNECTOR_ORDER = [9, 27, 2, 28, 29]; // BigQuery, NetSuite, Airtable, Notion, Google Drive

const getConnectorAppId = (connectorType: string): number => {
  const connectorMap: { [key: string]: number } = {
    bigquery: 9,
    netsuite: 27,
    airtable: 2,
    notion: 28,
    google_drive: 29,
  };
  return connectorMap[connectorType.toLowerCase()] || 0;
};

const ConnectorsPage = () => {
  const { setUser } = useUserStore();
  const { companies, isLoading, error, fetchError, fetchCompanies } = useCompaniesStore();
  const { jobs: crawlJobs } = useCrawlJobStore();

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [dynamicApps, setDynamicApps] = useState<Record<number, App>>({});
  const [showServiceSelectionModal, setShowServiceSelectionModal] = useState(false);
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(true);
  const [pendingConnectId, setPendingConnectId] = useState<number | null>(null);
  const [hasFetchedCompanies, setHasFetchedCompanies] = useState(false);

  const lastProcessedJobStatus = useRef<Record<string, string>>({});

  const { connectorId: googleDriveConnectorId } = usePlatformConnectorId(
    "google_drive",
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CONNECTOR_ID
  );
  const { connectorId: bigQueryConnectorId } = usePlatformConnectorId(
    "bigquery",
    process.env.NEXT_PUBLIC_BIG_QUERY_CONNECTOR_ID
  );
  const { connectorId: netSuiteConnectorId } = usePlatformConnectorId(
    "netsuite",
    process.env.NEXT_PUBLIC_NET_SUITE_CONNECTOR_ID
  );
  const { connectorId: airtableConnectorId } = usePlatformConnectorId(
    "airtable",
    process.env.NEXT_PUBLIC_AIRTABLE_CONNECTOR_ID
  );
  const { connectorId: notionConnectorId } = usePlatformConnectorId(
    "notion",
    process.env.NEXT_PUBLIC_NOTION_CONNECTOR_ID
  );

  useEffect(() => {
    fetchCompanies().finally(() => setHasFetchedCompanies(true));
  }, [fetchCompanies]);

  const saveFavoritesToStorage = (favoritesSet: Set<number>, companyId?: string) => {
    try {
      if (companyId) {
        localStorage.setItem(`favorites_${companyId}`, JSON.stringify(Array.from(favoritesSet)));
      }
    } catch (error) {
      console.warn("Failed to save favorites to localStorage:", error);
    }
  };

  const loadFavoritesFromStorage = (companyId: string): Set<number> => {
    try {
      const saved = localStorage.getItem(`favorites_${companyId}`);
      if (saved) return new Set(JSON.parse(saved));
    } catch (error) {
      console.warn("Failed to load favorites from localStorage:", error);
    }
    return new Set();
  };

  const loadConfiguredConnectors = async (companyId: string): Promise<string[]> => {
    try {
      const response = await Axios.get(`/data/connectors/company/${companyId}/configs`);
      const configs: Array<{ is_active?: boolean; erp_type?: string; connector_name?: string }> =
        response.data?.configs || response.data || [];
      const activeConnectors = new Set<string>();
      configs.forEach((config) => {
        const type = config.erp_type || config.connector_name;
        if (config.is_active && type) {
          activeConnectors.add(type.toLowerCase());
        }
      });
      return Array.from(activeConnectors);
    } catch (error) {
      console.error("Failed to fetch configured connectors:", error);
      showApiErrorToast(error, "Couldn't check which connectors are set up", { id: "configured-connectors" });
      return [];
    }
  };

  const processCompanyConnectors = async (company: Company) => {
    if (!company.id) return new Set<number>();
    setIsLoadingConnectors(true);
    try {
      const companyFavorites = loadFavoritesFromStorage(company.id);
      const configuredConnectors = await loadConfiguredConnectors(company.id);
      configuredConnectors.forEach((connectorType) => {
        const appId = getConnectorAppId(connectorType);
        if (appId > 0) companyFavorites.add(appId);
      });
      return companyFavorites;
    } finally {
      setIsLoadingConnectors(false);
    }
  };

  const loadSelectedCompanyFromStorage = async () => {
    const savedCompanyId = localStorage.getItem("selectedCompanyId");
    const savedCompanyData = localStorage.getItem("selectedCompanyData");

    if (savedCompanyId && savedCompanyData && companies.length > 0) {
      const foundCompany = companies.find((c) => c.id === savedCompanyId);
      const company = foundCompany || companies[0];
      if (company?.id) {
        setSelectedCompany(company);
        if (!foundCompany) setSelectedCompanyInStorage(company);
        setFavorites(await processCompanyConnectors(company));
      }
    } else if (companies.length > 0 && companies[0]?.id) {
      setSelectedCompany(companies[0]);
      setSelectedCompanyInStorage(companies[0]);
      setFavorites(await processCompanyConnectors(companies[0]));
    } else if (companies.length === 0) {
      // Nothing to load connectors for — don't leave the page stuck in a loading state
      setIsLoadingConnectors(false);
    }
  };

  useEffect(() => {
    loadSelectedCompanyFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies]);

  useEffect(() => {
    if (selectedCompany?.id && favorites.size > 0) {
      saveFavoritesToStorage(favorites, selectedCompany.id);
    }
  }, [favorites, selectedCompany?.id]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedCompanyId" && companies.length > 0 && e.newValue) {
        const foundCompany = companies.find((c) => c.id === e.newValue);
        if (foundCompany) setSelectedCompany(foundCompany);
      }
    };
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail?.key === "selectedCompanyId" && companies.length > 0 && e.detail?.newValue) {
        const foundCompany = companies.find((c) => c.id === e.detail.newValue);
        if (foundCompany) setSelectedCompany(foundCompany);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleCustomStorageChange as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleCustomStorageChange as EventListener);
    };
  }, [companies]);

  const updateActiveCompany = async (companyId: string) => {
    try {
      const userResponse = await Axios.put("/auth/me", { active_company: companyId });
      setUser(userResponse.data);
    } catch (error) {
      console.error("Failed to update active company in backend:", error);
    }
  };

  const handleCompanySelect = async (company: Company) => {
    if (selectedCompany?.id) saveFavoritesToStorage(favorites, selectedCompany.id);

    setSelectedCompany(company);
    setSelectedCompanyInStorage(company);

    if (company.id) {
      await updateActiveCompany(company.id);
      setFavorites(await processCompanyConnectors(company));
    }
  };

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (selectedCompany?.id) saveFavoritesToStorage(next, selectedCompany.id);
      return next;
    });
  };

  const handleRemoveApp = (appId: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(appId);
      if (selectedCompany?.id) saveFavoritesToStorage(next, selectedCompany.id);
      return next;
    });
    setDynamicApps((prev) => {
      const next = { ...prev };
      delete next[appId];
      return next;
    });
  };

  useBigQueryConnector({ selectedCompany, favorites, toggleFavorite, setDynamicApps });
  useNetSuiteConnector({ selectedCompany, favorites, toggleFavorite, setDynamicApps });
  useAirtableConnector({ selectedCompany, favorites, toggleFavorite, setDynamicApps });
  useGoogleDriveConnector({ selectedCompany, favorites, toggleFavorite });

  const handleServiceSelect = (service: Service) => {
    const appId = KNOWN_CONNECTOR_ORDER.includes(service.id) ? service.id : service.id + 100;

    if (!favorites.has(appId) && selectedCompany?.id) {
      if (service.id === 9) saveBigQueryState(true, selectedCompany.id);
      if (service.id === 27) saveNetSuiteState(true, selectedCompany.id);
      if (service.id === 2) saveAirtableState(true, selectedCompany.id);
      if (service.id === 28) saveNotionState(true, selectedCompany.id);
      if (service.id === 29) saveGoogleDriveState(true, selectedCompany.id);
    }

    toggleFavorite(appId);
    setShowServiceSelectionModal(false);
  };

  // Toast on crawl job completion/failure (no orchestrator/socket dependency)
  useEffect(() => {
    Object.values(crawlJobs).forEach((job) => {
      const prevStatus = lastProcessedJobStatus.current[job.id];
      if (prevStatus === job.status) return;
      lastProcessedJobStatus.current[job.id] = job.status;

      if (job.status === "completed") {
        toast.success(
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{job.message || "Crawl and profile completed successfully"}</span>
          </div>
        );
      } else if (job.status === "failed") {
        toast.error(
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span>{job.error || "An error occurred during the crawl process."}</span>
          </div>
        );
      }
    });
  }, [crawlJobs]);

  const getCrawlStateForApp = (appId: number) => {
    const connectorIds: Record<number, string | undefined> = {
      9: bigQueryConnectorId || undefined,
      27: netSuiteConnectorId || undefined,
      2: airtableConnectorId || undefined,
      28: notionConnectorId || undefined,
      29: googleDriveConnectorId || undefined,
    };
    const targetConnectorId = connectorIds[appId];
    if (!targetConnectorId) return { isCrawling: false, progress: 0 };

    const activeJob = Object.values(crawlJobs).find(
      (j) => j.connectorId === targetConnectorId && ["running", "pending", "starting"].includes(j.status)
    );
    return { isCrawling: !!activeJob, progress: activeJob?.progress || 0 };
  };

  const connectedApps = Array.from(favorites)
    .map((id) => appsMapping[id as keyof typeof appsMapping] || dynamicApps[id])
    .filter(Boolean)
    .sort((a, b) => {
      const aIndex = KNOWN_CONNECTOR_ORDER.indexOf(a.id);
      const bIndex = KNOWN_CONNECTOR_ORDER.indexOf(b.id);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });

  const hubApps = connectedApps.map((app) => ({ app, ...getCrawlStateForApp(app.id) }));

  const availableApps = KNOWN_CONNECTOR_ORDER.filter((id) => !favorites.has(id))
    .map((id) => appsMapping[id as keyof typeof appsMapping])
    .filter(Boolean);

  // Shared wiring for the per-service config dialogs opened from an "Available" card.
  const connectDialogProps = (serviceId: number) => ({
    isOpen: pendingConnectId === serviceId,
    onClose: () => setPendingConnectId(null),
    onBack: () => setPendingConnectId(null),
    onServiceSelect: (service: { id: number; name: string; logo: string; config: unknown }) => {
      handleServiceSelect({ id: service.id, name: service.name, logo: service.logo });
      setPendingConnectId(null);
    },
    selectedCompany,
  });

  if (isLoading || !hasFetchedCompanies) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-20 h-20 bg-[#EEF4FF] rounded-full flex items-center justify-center">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <QueryErrorState
          className="max-w-md"
          error={fetchError}
          title="Couldn't load your companies"
          fallbackMessage={error}
          onRetry={() => fetchCompanies()}
        />
      </div>
    );
  }

  if (!selectedCompany && companies.length === 0) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] p-10 shadow-[0_32px_80px_rgba(0,0,0,0.06)]">
          <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">No workspace yet</h3>
          <p className="text-gray-500 mb-8 leading-relaxed font-medium">
            You haven&apos;t set up a company workspace yet. Create one to start connecting data
            sources.
          </p>
          <Button
            onClick={() => fetchCompanies()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 h-11"
          >
            Refresh Workspace
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedCompany) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <PageWrapper
      title={
        <div className="flex flex-col items-start gap-1">
          <span className="leading-tight normal-case">Connectors</span>
          <span className="text-[10px] font-bold text-blue-600/60 uppercase tracking-[0.15em] leading-none">
            {connectedApps.length} Active Integration{connectedApps.length === 1 ? "" : "s"}
          </span>
        </div>
      }
      icon={
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
          <Zap className="h-[18px] w-[18px] text-white" strokeWidth={2.5} />
        </div>
      }
      rightContent={
        <Button
          onClick={() => setShowServiceSelectionModal(true)}
          className="bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl gap-1.5 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all px-5 h-11 font-bold"
        >
          <Plus className="h-4 w-4" /> Add Connector
        </Button>
      }
      headerClassName="bg-white/40 backdrop-blur-md border-b border-white/20 shadow-sm"
    >
      <div className="w-full min-h-screen bg-[#F8FAFC] relative overflow-hidden">
        {/* Premium Mesh Background, matching CoreOS */}
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
        {isLoadingConnectors ? (
          <ConnectorGridSkeleton />
        ) : connectedApps.length === 0 ? (
          <ConnectorEmptyState onAddConnector={() => setShowServiceSelectionModal(true)} />
        ) : (
          <>
            <ConnectorHubOrb apps={hubApps} />

            <SectionHeading
              title="Connected"
              count={connectedApps.length}
              hint="Sync, view jobs, and manage configuration"
            />
            <LayoutGroup>
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              >
                <AnimatePresence mode="popLayout">
                  {connectedApps.map((app, index) => {
                    const crawlState = getCrawlStateForApp(app.id);
                    return (
                      <ConnectorCard
                        key={app.id}
                        app={app}
                        index={index}
                        selectedCompany={selectedCompany}
                        onToggleFavorite={toggleFavorite}
                        onRemoveApp={handleRemoveApp}
                        isCrawling={crawlState.isCrawling}
                        crawlProgress={crawlState.progress}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>

              {availableApps.length > 0 && (
                <>
                  <SectionHeading
                    title="Available"
                    count={availableApps.length}
                    hint="Connect a new data source"
                  />
                  <motion.div
                    layout
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                  >
                    <AnimatePresence mode="popLayout">
                      {availableApps.map((app, index) => (
                        <AvailableConnectorCard
                          key={app.id}
                          app={app}
                          index={index}
                          onConnect={setPendingConnectId}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </>
              )}
            </LayoutGroup>
          </>
        )}
      </div>

      <ServiceSelectionModal
        isOpen={showServiceSelectionModal}
        onClose={() => setShowServiceSelectionModal(false)}
        onServiceSelect={handleServiceSelect}
        selectedCompany={selectedCompany}
      />

      {/* Direct-to-service config dialogs, opened from an "Available" card */}
      <BigQueryConfigDialog {...connectDialogProps(9)} />
      <NetSuiteConfigDialog {...connectDialogProps(27)} />
      <AirtableConfigDialog {...connectDialogProps(2)} />
      <NotionConfigDialog {...connectDialogProps(28)} />
      <GoogleDriveConfigDialog {...connectDialogProps(29)} />
      </div>
    </PageWrapper>
  );
};

function SectionHeading({
  title,
  count,
  hint,
}: {
  title: string;
  count: number;
  hint: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-baseline gap-3 mt-8 mb-4 first:mt-0"
    >
      <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.18em]">{title}</h2>
      <span className="text-[11px] font-black text-blue-600/70 tabular-nums">{count}</span>
      <span className="text-[11px] font-medium text-gray-400 hidden sm:inline">— {hint}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
    </motion.div>
  );
}

export default ConnectorsPage;
