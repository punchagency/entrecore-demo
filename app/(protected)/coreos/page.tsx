"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { ChevronRight, Menu, Loader2, Building2, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SidePanel } from "./components/side-panel";
import { useCompaniesStore, Company } from "@/app/store/companiesStore";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { setSelectedCompany as setSelectedCompanyInStorage } from "@/utils/api-utils";
import CoreVisualization from "@/app/(protected)/coreos/components/core-visualization";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AIAgentSheet } from "@/components/ai-agent-sheet";
import { FloatingChatWidget } from "./components/floating-chat-widget";
// Banner hidden for now — see the commented block further down to restore it.
// import { ProfileCompletionPrompt } from "@/components/profile-completion-prompt";
import { Axios } from "@/app/config/axios";
import { PageWrapper } from "@/components/page-wrapper";
import { useOrchestratorMessages } from "@/app/store/orchestratorStore";
import { toast } from "sonner";
import { useUserStore } from "@/app/store/userStore";

const tabs = [
  { id: "hr", label: "HR" },
  { id: "tech", label: "Tech" },
  { id: "sales", label: "Sales" },
  { id: "finance", label: "Finance" },
  { id: "marketing", label: "Marketing" },
  { id: "operations", label: "Operations" },
  { id: "home", label: "Home", isActive: true },
];

const CoreOs = () => {
  const router = useRouter();

  const { setUser, user } = useUserStore();
  const [activeTab, setActiveTab] = useState("home");
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const [notificationBadges, setNotificationBadges] = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [isMobileSidePanelOpen, setIsMobileSidePanelOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [dynamicApps, setDynamicApps] = useState<
    Record<
      number,
      {
        id: number;
        name: string;
        imagePath: string;
        color: string;
        isInner?: boolean;
        notifications: number;
      }
    >
  >({});

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [chatSuggestions, setChatSuggestions] = useState<any[]>([]);
  const [isFreshNavigation, setIsFreshNavigation] = useState<boolean>(true);
  const { companies, isLoading, error, fetchCompanies } = useCompaniesStore();
  const { setRequestingPage } = useOrchestratorMessages();

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Check if this is a fresh navigation from login or onboarding
  useEffect(() => {
    if (typeof window !== "undefined") {
      const coreosKey = "firstCoreosAccess";
      const currentTime = Date.now();
      const firstAccessTime = parseInt(localStorage.getItem(coreosKey) || "0");

      // Consider it fresh if this is the first access ever or within the last 30 seconds
      if (firstAccessTime === 0 || currentTime - firstAccessTime <= 30 * 1000) {
        // setIsFreshNavigation(true);
        localStorage.setItem(coreosKey, currentTime.toString());
      }
    }
  }, []);

  // Call observe endpoint when page loads
  useEffect(() => {
    const callObserveEndpoint = async () => {
      if (!selectedCompany) return;

      try {
        const response = await Axios.post("/data/guides/orchestrator/observe", {
          current_page: "coreos",
          just_opened: isFreshNavigation,
          // message: "Gives suggestions for core os",
          message: "",
          selected_company_id: selectedCompany?.id,
        });
        setRequestingPage("coreos");
        localStorage.setItem("currentPage", "coreos");
        setIsFreshNavigation(false);
        if (response.data && response.data.suggestions) {
          setChatSuggestions(response.data.suggestions);
        }
      } catch (error) {
        console.error("Error calling observe endpoint:", error);
      }
    };

    if (selectedCompany) {
      callObserveEndpoint();
    }
  }, [selectedCompany]);

  // Add function to save favorites to localStorage
  const saveFavoritesToStorage = (favoritesSet: Set<number>, companyId?: string) => {
    try {
      if (companyId) {
        const key = `favorites_${companyId}`;
        localStorage.setItem(key, JSON.stringify(Array.from(favoritesSet)));
      }
    } catch (error) {
      console.warn("Failed to save favorites to localStorage:", error);
    }
  };

  // Add function to load favorites from localStorage
  const loadFavoritesFromStorage = (companyId: string): Set<number> => {
    try {
      const key = `favorites_${companyId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const favoritesArray = JSON.parse(saved);
        return new Set(favoritesArray);
      }
    } catch (error) {
      console.warn("Failed to load favorites from localStorage:", error);
    }
    return new Set();
  };

  // Add function to fetch connector configurations from backend
  const fetchConnectorConfigs = async (companyId: string) => {
    try {
      const response = await Axios.get(`/data/connectors/company/${companyId}/configs`);
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch connector configurations:", error);
      return [];
    }
  };

  // Add function to check if connector is configured based on backend configs
  const isConnectorConfigured = (configs: any[], connectorType: string): boolean => {
    return configs.some(
      (config) =>
        config.erp_type?.toLowerCase() === connectorType.toLowerCase() ||
        config.connector_name?.toLowerCase().includes(connectorType.toLowerCase())
    );
  };

  // Function to get unique active connectors from backend configs
  const getActiveConnectors = (configs: any[]): string[] => {
    const activeConnectors = new Set<string>();

    configs.forEach((config) => {
      if (config.is_active && config.connector_name) {
        // Use erp_type for standardization, fallback to connector_name
        const connectorType = config.erp_type?.toLowerCase() || config.connector_name.toLowerCase();
        activeConnectors.add(connectorType);
      }
    });

    return Array.from(activeConnectors);
  };

  // Function to get connector app ID based on type
  const getConnectorAppId = (connectorType: string): number => {
    const connectorMap: { [key: string]: number } = {
      bigquery: 9,
      netsuite: 27,
      airtable: 2,
      notion: 28,
    };
    return connectorMap[connectorType.toLowerCase()] || 0;
  };

  // Legacy functions for backward compatibility (now use backend configs)
  const loadBigQueryState = async (companyId: string): Promise<boolean> => {
    try {
      const configs = await fetchConnectorConfigs(companyId);
      return isConnectorConfigured(configs, "bigquery");
    } catch (error) {
      console.warn("Failed to check BigQuery configuration:", error);
      return false;
    }
  };

  const loadNetSuiteState = async (companyId: string): Promise<boolean> => {
    try {
      const configs = await fetchConnectorConfigs(companyId);
      return isConnectorConfigured(configs, "netsuite");
    } catch (error) {
      console.warn("Failed to check NetSuite configuration:", error);
      return false;
    }
  };

  const loadAirtableState = async (companyId: string): Promise<boolean> => {
    try {
      const configs = await fetchConnectorConfigs(companyId);
      return isConnectorConfigured(configs, "airtable");
    } catch (error) {
      console.warn("Failed to check Airtable configuration:", error);
      return false;
    }
  };

  // New function to load all configured connectors from backend
  const loadConfiguredConnectors = async (companyId: string): Promise<string[]> => {
    try {
      const response = await Axios.get(`/data/connectors/company/${companyId}/configs`);
      const configs = response.data?.configs || [];
      return getActiveConnectors(configs);
    } catch (error) {
      console.error("Failed to fetch configured connectors:", error);
      return [];
    }
  };

  // update User active_company in backend when selectedCompany changes
  const updateActiveCompany = async (companyId: string) => {
    try {
      const userResponse = await Axios.put("/auth/me", { active_company: companyId });
      setUser(userResponse.data);
    } catch (error) {
      console.error("Failed to update active company in backend:", error);
    }
  };

  const loadSelectedCompanyFromStorage = async () => {
    const processCompanyConnectors = async (company: Company) => {
      if (!company.id) return new Set<number>();

      // Load favorites for this company
      const companyFavorites = loadFavoritesFromStorage(company.id);

      // Get all configured connectors from backend
      const configuredConnectors = await loadConfiguredConnectors(company.id);

      // Add configured connectors to favorites
      configuredConnectors.forEach((connectorType) => {
        const appId = getConnectorAppId(connectorType);
        if (appId > 0 && !companyFavorites.has(appId)) {
          companyFavorites.add(appId);
        }
      });

      return companyFavorites;
    };

    if (companies.length === 0) return;

    const { user } = useUserStore.getState();
    // Prefer invite/join selection; do not require selectedCompanyData (join only sets id)
    const preferredId =
      localStorage.getItem("selectedCompanyId") ||
      user?.active_company ||
      user?.company_id ||
      null;

    const foundCompany = preferredId
      ? companies.find((company) => company.id === preferredId)
      : undefined;
    const companyToSelect = foundCompany || companies[0];

    if (companyToSelect?.id) {
      setSelectedCompany(companyToSelect);
      if (!foundCompany || !localStorage.getItem("selectedCompanyData")) {
        setSelectedCompanyInStorage(companyToSelect);
      }
      const companyFavorites = await processCompanyConnectors(companyToSelect);
      setFavorites(companyFavorites);
    }
  };

  useEffect(() => {
    loadSelectedCompanyFromStorage();
  }, [companies]);

  // Save favorites whenever they change
  useEffect(() => {
    if (selectedCompany?.id && favorites.size > 0) {
      saveFavoritesToStorage(favorites, selectedCompany.id);
    }
  }, [favorites, selectedCompany?.id]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedCompanyId" && companies.length > 0) {
        const newCompanyId = e.newValue;
        if (newCompanyId) {
          const foundCompany = companies.find((company) => company.id === newCompanyId);
          if (foundCompany) {
            setIsFreshNavigation(true);
            setSelectedCompany(foundCompany);
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail?.key === "selectedCompanyId" && companies.length > 0) {
        const newCompanyId = e.detail?.newValue;
        if (newCompanyId) {
          const foundCompany = companies.find((company) => company.id === newCompanyId);
          if (foundCompany) {
            setIsFreshNavigation(true);
            setSelectedCompany(foundCompany);
          }
        }
      }
    };

    window.addEventListener("localStorageChange", handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleCustomStorageChange as EventListener);
    };
  }, [companies]);

  const handleCompanySelect = async (company: Company) => {
    // Save current favorites before switching companies
    if (selectedCompany?.id) {
      saveFavoritesToStorage(favorites, selectedCompany.id);
    }

    setIsFreshNavigation(true);
    setSelectedCompany(company);
    setSelectedCompanyInStorage(company);

    // Load favorites for the new company
    if (company.id) {
      const companyFavorites = loadFavoritesFromStorage(company.id);
      await updateActiveCompany(company.id); // Update active company in backend

      // Get all configured connectors from backend
      const configuredConnectors = await loadConfiguredConnectors(company.id);
      // Add configured connectors to favorites
      configuredConnectors.forEach((connectorType) => {
        const appId = getConnectorAppId(connectorType);
        if (appId > 0 && !companyFavorites.has(appId)) {
          companyFavorites.add(appId);
        }
      });

      setFavorites(companyFavorites);
    }
  };

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }

      // Save to localStorage immediately
      if (selectedCompany?.id) {
        saveFavoritesToStorage(newFavorites, selectedCompany.id);
      }

      return newFavorites;
    });
  };

  const handleRemoveApp = (appId: number, appName: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      newFavorites.delete(appId);

      // Save to localStorage immediately
      if (selectedCompany?.id) {
        saveFavoritesToStorage(newFavorites, selectedCompany.id);
      }

      return newFavorites;
    });

    setDynamicApps((prev) => {
      const newApps = { ...prev };
      delete newApps[appId];
      return newApps;
    });

    console.log(`App ${appName} (ID: ${appId}) removed from core visualization`);
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#EEF4FF] rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="h-10 w-10 text-[#2563EB] animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Companies</h3>
          <p className="text-gray-600">Please wait while we load your workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="h-10 w-10 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Error Loading Companies</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
            <Button
              onClick={() => fetchCompanies()}
              className="bg-[#2563EB] hover:bg-blue-700 text-white px-6 py-2.5 text-sm font-medium rounded-lg transition-colors"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedCompany && !isLoading && companies.length === 0) {
    const hasMembership = Boolean(user?.company_id || user?.active_company);

    // Members who already joined a company should not be pushed into create-company onboarding
    if (hasMembership) {
      return (
        <div className="w-full min-h-screen bg-[#F1F5F9] flex items-center justify-center px-4 relative overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 rounded-full blur-[120px]" />
          <div className="max-w-lg w-full">
            <div className="bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] p-10 md:p-14 shadow-[0_32px_80px_rgba(0,0,0,0.06)] text-center relative z-10">
              <div className="relative mx-auto w-28 h-28 mb-10 flex items-center justify-center">
                <Building2 className="h-14 w-14 text-blue-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
                Loading your workspace
              </h3>
              <p className="text-gray-500 mb-10 text-lg leading-relaxed font-medium">
                You&apos;re already on a company team. We couldn&apos;t load the workspace yet —
                try refreshing, or sign out and back in if this persists.
              </p>
              <Button
                onClick={() => fetchCompanies()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-16 rounded-2xl text-lg font-bold shadow-[0_20px_40px_rgba(37,99,235,0.25)] transition-all active:scale-[0.98]"
              >
                Refresh Workspace
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full min-h-screen bg-[#F1F5F9] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 rounded-full blur-[120px]" />

        <div className="max-w-lg w-full">
          <div className="bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] p-10 md:p-14 shadow-[0_32px_80px_rgba(0,0,0,0.06)] text-center relative z-10 transition-all">
            <div className="relative mx-auto w-28 h-28 mb-10">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2rem] rotate-12 opacity-10 animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-bl from-blue-600 to-indigo-600 rounded-[2rem] -rotate-6 opacity-10 animate-pulse delay-700"></div>
              <div className="relative bg-white border border-blue-50 rounded-[2rem] w-28 h-28 flex items-center justify-center shadow-2xl shadow-blue-500/10 transition-transform hover:scale-110 duration-500">
                <Building2 className="h-14 w-14 text-blue-600" strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-3 -right-3 bg-blue-600 rounded-2xl p-3 border-4 border-white shadow-xl shadow-blue-600/20">
                <PlusCircle className="h-6 w-6 text-white" />
              </div>
            </div>

            <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
              Ready to build?
            </h3>
            <p className="text-gray-500 mb-10 text-lg leading-relaxed font-medium">
              You haven&apos;t set up a company workspace yet. Create your first profile to access
              the Entrecore CoreOS.
            </p>

            <Button
              onClick={() => router.push("/onboarding")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-16 rounded-2xl text-lg font-bold shadow-[0_20px_40px_rgba(37,99,235,0.25)] hover:shadow-[0_25px_50px_rgba(37,99,235,0.35)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 border border-blue-400/20"
            >
              Start Onboarding
              <ChevronRight className="h-5 w-5" />
            </Button>

            <div className="mt-8 flex flex-col gap-4">
              <Button
                variant="ghost"
                onClick={() => {
                  const demoCompany = {
                    id: "demo-123",
                    company_name: "Acme Corp (Demo)",
                    profile_image: null,
                    status: "active",
                    info: { company_name: "Acme Corp (Demo)" },
                  };
                  setSelectedCompany(demoCompany as any);
                  toast.success("Demo Mode: Acme Corp workspace loaded");
                }}
                className="text-[10px] text-gray-400 hover:text-blue-600 font-bold uppercase tracking-widest"
              >
                Demo Mode: Pre-load Acme Corp
              </Button>
              <button
                onClick={() => fetchCompanies()}
                className="text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-[0.2em]"
              >
                Refresh Workspace
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedCompany) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#EEF4FF] rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="h-10 w-10 text-[#2563EB] animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Setting Up Workspace</h3>
          <p className="text-gray-600">Preparing your CoreOS environment...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <PageWrapper
        title={
          <Image
            src="/svgs/core-os.svg"
            alt="CoreOS"
            width={100}
            height={28}
            className="md:w-[110px] md:h-[30px] opacity-80"
          />
        }
        rightContent={<AIAgentSheet />}
        headerClassName="bg-white/40 backdrop-blur-md border-b border-white/20 shadow-sm"
      >
        <div className="w-full h-full bg-[#F8FAFC] relative overflow-hidden">
          {/* Premium Mesh Background */}
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none" />

        {/*
          Signup only captures the company; the rest of the profile would be
          collected here. Hidden for now — uncomment this block and the import
          above to bring the banner back.

        <div className="relative z-30 px-4 pt-4 md:px-8">
          <ProfileCompletionPrompt />
        </div>
        */}

        <div className="bg-[#F8FAFC]/30 border-b border-gray-200/30">
          <div className="flex items-center justify-end px-4 md:px-6 py-2 md:py-0">
            {/* Mobile Apps Button remains */}
            <div className="block md:hidden">
              <Sheet open={isMobileSidePanelOpen} onOpenChange={setIsMobileSidePanelOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-1 text-gray-600 text-xs p-2"
                  >
                    <Menu className="w-4 h-4" />
                    <span>Apps</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] sm:w-[400px] p-0">
                  <SidePanel
                    favorites={favorites}
                    toggleFavorite={(id) => {
                      toggleFavorite(id);
                      setIsMobileSidePanelOpen(false);
                    }}
                    dynamicApps={dynamicApps}
                    onRemoveApp={(appId, appName) => {
                      handleRemoveApp(appId, appName);
                      setIsMobileSidePanelOpen(false);
                    }}
                  />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        <Dialog open={showOptionsDialog} onOpenChange={setShowOptionsDialog}>
          <DialogContent className="sm:max-w-[400px] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)]">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Options</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between py-4">
              <span className="text-sm">Notification Badges</span>
              <Switch
                checked={notificationBadges}
                onCheckedChange={setNotificationBadges}
                className="data-[state=checked]:bg-[#2563EB]"
              />
            </div>
            <Button
              className="w-full bg-[#2563EB] hover:bg-blue-700 text-white mt-4"
              onClick={() => setShowOptionsDialog(false)}
            >
              Save
            </Button>
          </DialogContent>
        </Dialog>

        <div className="flex flex-1 h-[calc(100vh-11rem)] md:h-[calc(100vh-12rem)]">
          <div
            className={`transition-all duration-300 overflow-hidden w-full ${
              showSidePanel ? "md:w-1/2" : "w-full"
            }`}
          >
            <div className="h-full p-3 md:p-6">
              <div className="h-full relative">
                <CoreVisualization
                  searchQuery={""}
                  showSidePanel={showSidePanel}
                  showNotifications={notificationBadges}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  dynamicApps={dynamicApps}
                  setDynamicApps={setDynamicApps}
                  onRemoveApp={handleRemoveApp}
                  onToggleSidePanel={() => setShowSidePanel(!showSidePanel)}
                  selectedCompany={selectedCompany}
                  initialSuggestions={chatSuggestions}
                />
              </div>
            </div>
          </div>
          {showSidePanel && (
            <div className="hidden md:block w-1/2">
              <SidePanel
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                dynamicApps={dynamicApps}
                onRemoveApp={handleRemoveApp}
              />
            </div>
          )}
        </div>

        {/* <FloatingChatWidget
          initialSuggestions={chatSuggestions}
          contextPage="coreos"
          selectedCompanyId={selectedCompany.id}
          currentParams={null}
        /> */}
        </div>
      </PageWrapper>
    </>
  );
};

export default CoreOs;
