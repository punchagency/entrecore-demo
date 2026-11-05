"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { useParams, usePathname, useSearchParams, useRouter } from "next/navigation";
import { Search, X, Database, ChevronRight, Brain, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useUserStore } from "@/app/store/userStore";
import { Axios } from "@/app/config/axios";
import { useQuery } from "@tanstack/react-query";
import { useColumnDataStore } from "@/app/store/columnDataStore";
import { toast } from "sonner";
import { FloatingChatWidget } from "@/app/(protected)/coreos/components/floating-chat-widget";
import { useOrchestratorMessages, useOrchestratorStore } from "@/app/store/orchestratorStore";
import { EltPipelineChatWidget } from "./elt-pipeline-chat-widget";
import { UnifiedRecordChat } from "@/components/unified-record-chat";
import { KnowledgeGraphChat } from "@/components/knowledge-graph-chat";

export default function TableLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const labelParam = searchParams?.get("label");

  // const { requestingPage } = useOrchestratorMessages();
  // Determine current page context based on pathname
  let currentPage = labelParam ? "knowledge_graph_assistant" : "catalog_record_assistant";
  if (pathname.includes("/erd")) currentPage = "erd";
  else if (pathname.includes("/data-quality")) currentPage = "data_quality";
  else if (pathname.includes("/support-request")) currentPage = "support_request";
  const [searchQuery, setSearchQuery] = useState(labelParam || "");
  const {
    selectedColumnData,
    setSelectedColumnData,
    isLoading: columnStoreLoading,
    setHasColumns,
    setColumnRules,
    setTableColumns,
    setTotalExpectedRecords,
  } = useColumnDataStore();

  // Derived state from store for UI highlighting
  const selectedColumn = selectedColumnData?.column_name || null;
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const { user } = useUserStore();

  // Chat Widget State
  const [showChat, setShowChat] = useState(false);
  const [activeChatType, setActiveChatType] = useState<"catalog" | "coreos" | "elt">("catalog");
  const [chatSuggestions, setChatSuggestions] = useState<any[]>([]);
  const [suggestionsPath, setSuggestionsPath] = useState<string>(pathname);
  const [isActionsPanelOpen, setIsActionsPanelOpen] = useState(true);
  const setRequestingPage = useOrchestratorStore((state) => state.setRequestingPage);
  const [initialBotMessage, setInitialBotMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    const updateCompanyId = () => {
      const companyId =
        window?.localStorage.getItem("selectedCompanyId") || user?.active_company || null;
      if (companyId !== savedCompanyId) {
        setSavedCompanyId(companyId);
      }
    };

    updateCompanyId();

    window.addEventListener("storage", updateCompanyId);
    window.addEventListener("localStorageChange", updateCompanyId);

    return () => {
      window.removeEventListener("storage", updateCompanyId);
      window.removeEventListener("localStorageChange", updateCompanyId);
    };
  }, [user?.active_company, savedCompanyId]);

  useEffect(() => {
    const { clearSelectedColumnData, setLoading, setError } = useColumnDataStore.getState();
    clearSelectedColumnData();
    // setSelectedColumn(null); // No longer needed as it's derived
    setLoading(true);
    setHasColumns(null);
    setError(null);
  }, [id, savedCompanyId]);

  const {
    data: tableData,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["catalog", savedCompanyId, id],
    queryFn: async () => {
      if (!savedCompanyId) {
        throw new Error("No company ID available");
      }

      const response = await Axios.get(`/data/metadata/columns`, {
        params: {
          skip: 0,
          limit: 100,
          table_id: id,
          company_id: savedCompanyId,
        },
      });

      console.log("Fetched column metadata:", response.data);

      let maxCount = 0;
      const { items } = response.data;
      items.forEach((item: Record<string, any>) => {
        const distinctValuesCount = Object.values<number>(item.distinct_value_counts ?? {}).reduce(
          (acc, count) => acc + (Number(count) || 0),
          0
        );

        if (distinctValuesCount > maxCount) {
          maxCount = distinctValuesCount;
        }
      });

      setTotalExpectedRecords(maxCount);

      setColumnRules(response.data.rules ?? []);
      return response.data.items;
    },
    enabled: !!savedCompanyId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (tableData) {
      setTableColumns(tableData);
    }
  }, [tableData, setTableColumns]);

  const { data: tableMetadata } = useQuery({
    queryKey: ["table-metadata", savedCompanyId, id],
    queryFn: async () => {
      if (!savedCompanyId) {
        throw new Error("No company ID available");
      }

      const response = await Axios.get(`/data/metadata/tables/${id}`, {
        params: {
          company_id: savedCompanyId,
        },
      });

      // const recordCount = response.data.total_records || response.data.record_count || 0;

      // setTotalExpectedRecords(recordCount);

      return response.data;
    },
    enabled: !!savedCompanyId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const findColumnByLabel = (columns: any[], label: string) => {
    return columns?.find(
      (column: any) =>
        column?.label?.toLowerCase() === label.toLowerCase() ||
        column?.column_name?.toLowerCase() === label.toLowerCase()
    );
  };

  useEffect(() => {
    const { setLoading, setError, selectedColumnData } = useColumnDataStore.getState();

    if (!isLoading) {
      setLoading(false);
      setError(null);
    }

    if (queryError) {
      setHasColumns(null);
      setError(queryError.message || "Failed to load table data");
      setLoading(false);
    } else if (tableData && tableData.length > 0 && tableData[0]) {
      // Check if we already have a selected column in the store
      const hasExistingSelection = selectedColumnData && selectedColumnData.table_id === id;

      // Only set column if none is currently selected or if label parameter is provided
      // NOTE: We only auto-select if labelParam is explicitly provided.
      // Otherwise, we default to Table Lineage if the user hasn't selected anything?
      // Actually, existing behavior was to auto-select the first column.
      // Let's keep auto-select ONLY if labelParam is present.
      // otherwise, let's NOT auto-select the first column to allow "Table Table View".
      // WAIT: The previous logic FORCED auto selection if !hasExistingSelection.
      // If we want to fix the user issue, we should STOP forcing auto-selection unless needed.
      // However, if we stop auto-selection, other tabs like "Column Summary" might look empty.

      // Decision: Maintain original behavior BUT allow the store to update so we can deselect later.

      if (!hasExistingSelection || labelParam) {
        let columnToSelect: any | null = tableData[0]; // Default to first column

        // If label parameter is provided, try to find the matching column
        if (labelParam && tableData) {
          const matchingColumn = findColumnByLabel(tableData, labelParam);
          if (matchingColumn) {
            columnToSelect = matchingColumn;
          } else {
            // ... handling not found
            toast.warning(`Column with label "${labelParam}" not found in this table`);
            columnToSelect = null;
            setSearchQuery("");
          }
        }

        // AUTO SELECTION LOGIC:
        // If we want to support Table Lineage as default, we should probably NOT select a column by default unless requested.
        // But if we don't select a column, "Column Summary" tab will be empty.
        // Let's stick to using the store. The Lineage Page will manually clear it if user wants.

        if (columnToSelect?.column_name) {
          // Only auto-select if NOT on lineage page, OR if user explicitly asked for a label
          // This ensures Table Lineage is shown by default on the lineage tab
          const isLineagePage = pathname.includes("/lineage");
          if (!isLineagePage || labelParam) {
            handleColumnClick(columnToSelect);
          }
        } else {
          // No column selected
        }
      } else {
        // Already selected in store, nothing to do as selectedColumn is derived
      }
      setHasColumns(true);
      setLoading(false);
    } else if (tableData !== undefined && !isLoading) {
      setHasColumns(false);
      setLoading(false);
    }
  }, [tableData, isLoading, queryError, setHasColumns, labelParam, id, pathname]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const store = useColumnDataStore.getState();
        if (!isLoading && !store.selectedColumnData && !queryError) {
          store.setLoading(false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoading, queryError]);

  // Fetch chat suggestions
  // Fetch chat suggestions on navigation
  useEffect(() => {
    const callObserveEndpoint = async () => {
      const savedCompanyId = localStorage.getItem("selectedCompanyId");
      if (!savedCompanyId) return;

      // Set requesting page before making API call
      setRequestingPage(currentPage);

      try {
        const response = await Axios.post("/data/guides/orchestrator/observe", {
          current_page: currentPage,
          just_opened: true,
          message: "",
          selected_company_id: savedCompanyId,
          current_params: id,
        });

        // Ensure we only update state if the response corresponds to the current path
        // (Though effect cleanup/deps handles most race conditions, this is extra safety)
        if (response.data && response.data.suggestions) {
          setChatSuggestions(response.data.suggestions);
          setSuggestionsPath(pathname);

          // Auto-open chat if we have suggestions
          if (response.data.suggestions.length > 0) {
            setShowChat(true);
          }
        }
      } catch (error) {
        console.error("Error calling observe endpoint:", error);
      }
    };

    callObserveEndpoint();
  }, [setRequestingPage, id, pathname, currentPage]);

  const filteredTableData = tableData?.filter((column: any) => {
    return (
      column?.column_name?.toLowerCase().includes(searchQuery?.toLowerCase()) ||
      column?.label?.toLowerCase().includes(searchQuery?.toLowerCase())
    );
  });

  // Use suggestions only if they match the current path
  const activeSuggestions = suggestionsPath === pathname ? chatSuggestions : [];

  const tabs = [
    { value: "column-summary", label: "Column Summary", href: `/data-room/catalog/table/${id}` },
    {
      value: "data-products",
      label: "Data Products",
      href: `/data-room/catalog/table/${id}/data-products`,
    },
    // {
    //   value: "associations",
    //   label: "Associations",
    //   href: `/data-room/catalog/table/${id}/associations`,
    // },
    { value: "lineage", label: "Lineage", href: `/data-room/catalog/table/${id}/lineage` },
    {
      value: "erd",
      label: "Entity Relationship Diagram",
      href: `/data-room/catalog/table/${id}/erd`,
    },
    {
      value: "data-quality",
      label: "Data Quality",
      href: `/data-room/catalog/table/${id}/data-quality`,
    },
    {
      value: "support-request",
      label: "Support & Request",
      href: `/data-room/catalog/table/${id}/support-request`,
    },
  ];

  const handleColumnClick = async (column: any) => {
    const { setSelectedColumnData, setLoading, setError } = useColumnDataStore.getState();

    if (selectedColumn === column?.column_name) {
      return;
    }

    if (!column?.column_name) {
      console.warn("Invalid column data:", column);
      setError("Invalid column selected");
      toast.error("Invalid column selected");
      return;
    }

    // setSelectedColumn(column.column_name); // Derived
    setLoading(true);

    setRequestingPage(currentPage); // Set requesting page context for orchestrator messages

    try {
      const selectedColumnMeta = tableData?.find(
        (item: any) => item?.column_name === column.column_name
      );

      if (selectedColumnMeta) {
        // Fetch specific values for this column to get the distribution
        const valuesResponse = await Axios.get("/data/metadata/column-values", {
          params: {
            table_id: id,
            column_id: selectedColumnMeta.column_id || selectedColumnMeta.id,
            company_id: savedCompanyId,
          },
        });

        const values = valuesResponse.data;
        const counts: Record<string, number> = {};
        const distinctValues: string[] = [];

        if (Array.isArray(values)) {
          values.forEach((v: any) => {
            const val = v.value || "(Null/Empty)";
            counts[val] = (counts[val] || 0) + 1;
          });
          distinctValues.push(
            ...(Array.from(new Set(values.map((v: any) => v.value || "(Null/Empty)"))) as string[])
          );
        }

        setSelectedColumnData({
          ...selectedColumnMeta,
          distinct_value_counts: counts,
          distinct_values: distinctValues,
        });
      } else {
        setError("Column data not found");
        toast.error("Column data not found");
      }
    } catch (error) {
      console.error("Error fetching column data:", error);
      setError("Failed to load column data");
      toast.error("Failed to load column data");
    } finally {
      setLoading(false);
    }
  };

  const sidebarIsLoading = isLoading || columnStoreLoading || !tableData;
  const hasNoColumns = !sidebarIsLoading && tableData && tableData.length === 0;

  const selectedColumnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedColumn && selectedColumnRef.current) {
      selectedColumnRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }, [selectedColumn]);

  const handleStartELTPipeline = () => {
    const tableName = tableMetadata?.table_name || tableMetadata?.name || "this table";
    const message = `I've noticed that you would like us to start an ELT pipeline for **${tableName}**.\n\nWould you like me to start the pipeline?`;
    setInitialBotMessage(message);
    setActiveChatType("elt");
    if (!showChat) {
      setShowChat(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <div className="sticky top-0 z-40 px-6 py-6 bg-white/40 backdrop-blur-xl border-b border-white/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-[1.25rem] bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Database className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">
              {tableMetadata?.table_name || tableMetadata?.name || "Table Details"}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                ID: {id}
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-500 max-w-xl text-sm font-medium leading-relaxed bg-white/40 p-3 rounded-2xl border border-white/60">
          {tableMetadata?.description ||
            tableMetadata?.table_description ||
            "Detailed overview of the table structure, metrics, and data quality analysis."}
        </p>
      </div>

      <div className="w-full bg-white/20 backdrop-blur-md border-b border-white/60 sticky top-[101px] z-30">
        <div className="w-full overflow-x-auto scrollbar-hide py-2">
          <div className="flex items-center px-6 gap-2">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.value}
                  href={tab.href}
                  className={cn(
                    "px-5 py-2 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 rounded-full whitespace-nowrap",
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                      : "text-gray-500 hover:text-indigo-600 hover:bg-white/60"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex-1 flex min-h-0 w-full overflow-hidden">
        <div className="flex-1 flex flex-col xl:flex-row min-h-0 w-full">
          <div className="w-full xl:w-[280px] flex-shrink-0 p-6 bg-white/20 backdrop-blur-sm border-r border-white/60 overflow-y-auto">
            <div className="relative group mb-8">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Filter Columns..."
                  value={searchQuery}
                  className="w-full h-11 rounded-full pl-11 pr-10 bg-white/60 border-white/80 focus:ring-indigo-500 font-medium text-sm transition-all"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-transparent text-gray-400 hover:text-gray-600"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Columns
              </span>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {filteredTableData?.length}
              </span>
            </div>

            <div className="space-y-1.5 pb-20">
              {sidebarIsLoading ? (
                <div className="space-y-3 px-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="w-full h-10 bg-gray-200/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : hasNoColumns ? (
                <div className="text-center py-12 px-4">
                  <div className="bg-white/40 backdrop-blur-md rounded-[2rem] p-8 border border-white/60">
                    <Database className="h-10 w-10 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-sm font-black text-gray-600 uppercase tracking-widest leading-tight">
                      No Columns
                    </h3>
                  </div>
                </div>
              ) : (
                filteredTableData?.map((column: any) => {
                  const isSelected = selectedColumn === column?.column_name;

                  return (
                    <motion.button
                      key={column.id}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      ref={isSelected ? selectedColumnRef : null}
                      className={cn(
                        "w-full group flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-300",
                        isSelected
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                          : "hover:bg-white/80 text-gray-600 hover:text-indigo-600"
                      )}
                      onClick={() => handleColumnClick(column)}
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full transition-all duration-300",
                          isSelected
                            ? "bg-white scale-100"
                            : "bg-gray-300 opacity-0 group-hover:opacity-100"
                        )}
                      />
                      <span className="text-sm font-bold tracking-tight truncate">
                        {column?.column_name}
                      </span>
                      {isSelected && <div className="ml-auto w-1 h-4 bg-white/30 rounded-full" />}
                    </motion.button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-[#f8fafc]/50 min-h-0 w-full">{children}</div>

          <div className={cn(
            "flex-shrink-0 bg-white/40 backdrop-blur-md border-l border-white/60 flex flex-col overflow-hidden transition-all duration-300",
            isActionsPanelOpen ? "w-full xl:w-[400px] p-8" : "w-[52px] p-3"
          )}>
            <div className="space-y-4 max-w-full flex flex-col h-full">
              {/* Toggle button — always visible */}
              <div className={cn("flex items-center", isActionsPanelOpen ? "justify-between mb-2" : "justify-center mb-2")}>
                {isActionsPanelOpen && (
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Actions
                  </span>
                )}
                <button
                  onClick={() => setIsActionsPanelOpen(!isActionsPanelOpen)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  title={isActionsPanelOpen ? "Collapse Actions" : "Expand Actions"}
                >
                  {isActionsPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                </button>
              </div>
              <div className={cn("mb-6 overflow-hidden transition-all duration-300", isActionsPanelOpen ? "opacity-100" : "opacity-0 pointer-events-none h-0 mb-0")}>
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    variant="outline"
                    className="h-16 justify-between px-6 border-white/60 bg-white/80 hover:bg-white hover:border-indigo-400 rounded-2xl text-gray-700 font-bold shadow-sm transition-all"
                    onClick={handleStartELTPipeline}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Database className="w-4 h-4" />
                      </div>
                      <span className="text-sm">Start ELT Pipeline</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </Button>

                  <Button
                    variant="outline"
                    className={cn(
                      "h-16 justify-between px-6 border-white/60 rounded-2xl font-bold shadow-sm transition-all",
                      showChat && activeChatType === "catalog"
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-white/80 hover:bg-white hover:border-indigo-400 text-gray-700"
                    )}
                    onClick={() => {
                      if (showChat && activeChatType === "catalog") {
                        setShowChat(false);
                      } else {
                        setInitialBotMessage(undefined);
                        setActiveChatType("catalog");
                        setShowChat(true);
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          showChat && activeChatType === "catalog"
                            ? "bg-white/20 text-white"
                            : "bg-indigo-50 text-indigo-600"
                        )}
                      >
                        <div className="text-[10px] font-black">AI</div>
                      </div>
                      <span className="text-sm uppercase tracking-tight">
                        {labelParam ? "Knowledge Graph Assistant" : "Catalog Assistant"}
                      </span>
                    </div>
                    {showChat && activeChatType === "catalog" ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className={cn(
                      "h-16 justify-between px-6 border-white/60 rounded-2xl font-bold shadow-sm transition-all",
                      showChat && activeChatType === "coreos"
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-white/80 hover:bg-white hover:border-indigo-400 text-gray-700"
                    )}
                    onClick={() => {
                      if (showChat && activeChatType === "coreos") {
                        setShowChat(false);
                      } else {
                        setInitialBotMessage(undefined);
                        setActiveChatType("coreos");
                        setShowChat(true);
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          showChat && activeChatType === "coreos"
                            ? "bg-white/20 text-white"
                            : "bg-emerald-50 text-emerald-600"
                        )}
                      >
                        <Brain className="w-4 h-4" />
                      </div>
                      <span className="text-sm uppercase tracking-tight">CoreOS Assistant</span>
                    </div>
                    {showChat && activeChatType === "coreos" ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    )}
                  </Button>
                </div>
              </div>

              {isActionsPanelOpen && showChat && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 min-h-0 bg-white/60 backdrop-blur-lg rounded-[2.5rem] border border-white/80 shadow-2xl shadow-indigo-500/10 overflow-hidden relative"
                >
                  {activeChatType === "elt" && initialBotMessage ? (
                    <EltPipelineChatWidget
                      initialBotMessage={initialBotMessage}
                      tableId={id}
                      tableName={tableMetadata?.table_name || tableMetadata?.name || "this table"}
                      companyId={savedCompanyId || ""}
                      onClose={() => {
                        setShowChat(false);
                        setInitialBotMessage(undefined);
                      }}
                    />
                  ) : activeChatType === "coreos" ? (
                    <FloatingChatWidget
                      variant="embedded"
                      selectedCompanyId={savedCompanyId}
                      contextPage={currentPage}
                      currentParams={id}
                      onToggle={() => setShowChat(false)}
                      isJustOpened={false}
                    />
                  ) : labelParam ? (
                    <KnowledgeGraphChat
                      key={pathname}
                      tableMetadata={tableMetadata}
                      columns={tableData || []}
                      companyId={savedCompanyId || ""}
                      tableId={id}
                      label={labelParam}
                      contextPage={currentPage}
                      onClose={() => setShowChat(false)}
                      initialSuggestions={activeSuggestions}
                    />
                  ) : (
                    <UnifiedRecordChat
                      key={pathname}
                      tableMetadata={tableMetadata}
                      columns={tableData || []}
                      companyId={savedCompanyId || ""}
                      tableId={id}
                      contextPage={currentPage}
                      onClose={() => setShowChat(false)}
                      initialSuggestions={activeSuggestions}
                    />
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
