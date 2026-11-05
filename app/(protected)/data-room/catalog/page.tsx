"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Filter,
  Loader2,
  Database,
  ChevronRight,
  LayoutGrid,
  Trash2,
  AlertTriangle,
  GitGraph,
  Sparkles,
  BrainCircuit,
  CheckCircle,
  Search,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import Link from "next/link";
import SearchInput from "@/components/search-input";
import searchDebounce, { filterData } from "@/utils/search-debounce";
import { useDatasetStore } from "@/app/store/datasetStore";
import { useQuery } from "@tanstack/react-query";
import { FloatingChatWidget } from "@/app/(protected)/coreos/components/floating-chat-widget";
import { Axios } from "@/app/config/axios";
import { useUserStore } from "@/app/store/userStore";
import { useDataCountsStore } from "@/app/store/dataCountsStore";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { useOrchestratorMessages } from "@/app/store/orchestratorStore";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  fetchPlatformConnectorById,
  PlatformConnector,
} from "@/app/(protected)/coreos/services/platform-connector-api";

type CatalogEntry = {
  function: string;
  company: string;
  connector: string;
  connector_id?: string;
  schema_name: string;
  dataset: string;
  description: string;
  guide_name: string;
  quality: string;
  rules: string;
  id: string;
  name: string;
  columns?: string[];
  dataset_id?: string;
  table_id?: string;
  guides?: Array<{
    id: string;
    name: string;
  }>;
};

const normalizeConnectorName = (value: string | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

// MVP until the catalog API accepts connector_id: rows only carry the connector's
// display name, so match it against the linked connector's name / erp_type.
const rowMatchesConnector = (
  entry: CatalogEntry,
  connectorId: string,
  connector: PlatformConnector | null | undefined
) => {
  if (entry.connector_id) return entry.connector_id === connectorId;
  if (!connector) return false;

  const rowName = normalizeConnectorName(entry.connector);
  if (!rowName) return false;
  return [connector.name, connector.erp_type]
    .map(normalizeConnectorName)
    .some((alias) => alias && (rowName.includes(alias) || alias.includes(rowName)));
};

const HOVER_POPOVER_CLASS =
  "w-40 lg:w-60 bg-[#192131] text-white relative before:content-[''] before:absolute before:-top-2 before:left-[50%] before:translate-x-[-50%] before:w-0 before:h-0 before:border-l-[8px] before:border-l-transparent before:border-r-[8px] before:border-r-transparent before:border-b-[8px] before:border-b-[#192131]";

// Hover-to-open popover for catalog cells. It owns its open state, so hooks stay out of the
// table's column `cell` functions (which are not components and must not call hooks).
function HoverPopover({
  trigger,
  content,
  contentClassName = HOVER_POPOVER_CLASS,
}: {
  trigger: React.ReactNode;
  content?: React.ReactNode;
  contentClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <Popover open={isOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        {content !== undefined && (
          <PopoverContent className={contentClassName}>{content}</PopoverContent>
        )}
      </Popover>
    </div>
  );
}

const Catalog = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const connectorIdParam = searchParams.get("connector_id");

  const filterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() =>
    connectorIdParam ? [{ id: "connector", value: connectorIdParam }] : []
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [openFilters, setOpenFilters] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ field: string; value: string }>>([]);
  const { selectedDatasets, setSelectedDataset, removeSelectedDataset } = useDatasetStore();
  const [rowSelectedSources, setRowSelectedSources] = useState<{ [datasetId: string]: string }>({});

  type SemanticRecommendation = {
    table_id: string;
    table_name: string;
    dataset_name: string;
    dataset_id: string;
    schema_name: string;
    data_source: string;
    row_count: number;
    column_count: number;
    columns: unknown[];
    confidence: number;
    semantic_match: number;
    quality_score: number;
    match_reasons: string[];
    lineage: Record<string, unknown>;
    date_profiled: string;
  };
  
  type SemanticSearchResponse = {
    query: string;
    recommendations: SemanticRecommendation[];
    total_tables_scanned: number;
    total_matches: number;
  };

  const [semanticResults, setSemanticResults] = useState<SemanticSearchResponse | null>(null);
  const [isSemanticSearching, setIsSemanticSearching] = useState(false);

  const { setRequestingPage } = useOrchestratorMessages();

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim() || !savedCompanyId) return;
    setIsSemanticSearching(true);
    setSemanticResults(null);
    try {
      const response = await Axios.post("/data/catalog/search", {
        query: searchQuery,
        company_id: savedCompanyId,
        top_k: 10,
        min_confidence: 0.1,
      });
      setSemanticResults(response.data);
    } catch (error) {
      toast.error("Semantic search failed.");
      console.error(error);
    } finally {
      setIsSemanticSearching(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(openFilters).forEach(([headerId, isOpen]) => {
        if (
          isOpen &&
          filterRefs.current[headerId] &&
          !filterRefs.current[headerId]?.contains(event.target as Node)
        ) {
          setOpenFilters((prev) => ({
            ...prev,
            [headerId]: false,
          }));
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openFilters]);

  const columns: ColumnDef<CatalogEntry>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="border-white/50 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 text-white"
        />
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    // {
    //   id: "metricsSource",
    //   header: () => <div className="text-center">Source Dataset</div>,
    //   cell: ({ row }) => {
    //     const availableSources = [
    //       { name: "Staff", value: "staff" },
    //       { name: "Metrics", value: "metrics" },
    //       { name: "Market", value: "market" },
    //     ];

    //     const existingSelection = selectedDatasets.find(
    //       (dataset) => dataset.id === row.original.id
    //     );
    //     const currentSelection =
    //       existingSelection?.type || rowSelectedSources[row.original.id || ""];
    //     const isSelected = Boolean(existingSelection);

    //     return (
    //       <DropdownMenu>
    //         <DropdownMenuTrigger asChild>
    //           <Button
    //             variant={isSelected ? "ghost" : "ghost"}
    //             size="sm"
    //             className={isSelected ? "bg-[#3064f6] text-white" : ""}
    //           >
    //             {currentSelection
    //               ? availableSources.find((source) => source.value === currentSelection)?.name
    //               : "Select Source"}
    //           </Button>
    //         </DropdownMenuTrigger>
    //         <DropdownMenuContent>
    //           {availableSources.map((source) => (
    //             <DropdownMenuItem
    //               key={source.value}
    //               onClick={() => {
    //                 const alreadySelectedForSource = selectedDatasets.find(
    //                   (dataset) => dataset.type === source.value && dataset.id !== row.original.id
    //                 );

    //                 if (alreadySelectedForSource) {
    //                   toast.error(
    //                     `${source.name} is already selected for ${alreadySelectedForSource.name} table`
    //                   );
    //                   return;
    //                 }

    //                 const existingDataset = selectedDatasets.find(
    //                   (dataset) => dataset.id === row.original.id
    //                 );

    //                 if (existingDataset) {
    //                   if (existingDataset.type === source.value) {
    //                     removeSelectedDataset(row.original.id || "");

    //                     setRowSelectedSources((prev) => {
    //                       const updated = { ...prev };
    //                       delete updated[row.original.id || ""];
    //                       return updated;
    //                     });

    //                     toast.info(`${row.original.name} table removed from ${source.name}`);
    //                   } else {
    //                     removeSelectedDataset(row.original.id || "");

    //                     setRowSelectedSources((prev) => ({
    //                       ...prev,
    //                       [row.original.id || ""]: source.value,
    //                     }));

    //                     setSelectedDataset({
    //                       id: row.original.id || "",
    //                       name: row.original.name,
    //                       type: source.value,
    //                       columns: row.original.columns,
    //                     });

    //                     toast.success(
    //                       `${row.original.dataset} table source changed to ${source.name}`
    //                     );
    //                   }
    //                 } else {
    //                   setRowSelectedSources((prev) => ({
    //                     ...prev,
    //                     [row.original.id || ""]: source.value,
    //                   }));

    //                   setSelectedDataset({
    //                     id: row.original.id || "",
    //                     name: row.original.name,
    //                     type: source.value,
    //                     columns: row.original.columns,
    //                   });

    //                   toast.success(`${row.original.name} is selected for ${source.name}`);
    //                 }
    //               }}
    //             >
    //               {source.name}
    //             </DropdownMenuItem>
    //           ))}
    //         </DropdownMenuContent>
    //       </DropdownMenu>
    //     );
    //   },
    //   size: 100,
    // },
    // {
    //   accessorKey: "function",
    //   header: "Function",

    //   cell: ({ row }) => {
    //     const [isOpen, setIsOpen] = useState(false);

    //     return (
    //       <div onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
    //         <Popover open={isOpen}>
    //           <PopoverTrigger asChild>
    //             <div className="truncate">{row.getValue("function")}</div>
    //           </PopoverTrigger>
    //           <PopoverContent className="w-40 lg:w-60 bg-[#192131] text-white relative before:content-[''] before:absolute before:-top-2 before:left-[50%] before:translate-x-[-50%] before:w-0 before:h-0 before:border-l-[8px] before:border-l-transparent before:border-r-[8px] before:border-r-transparent before:border-b-[8px] before:border-b-[#192131]">
    //             <p>{row.getValue("function")}</p>
    //           </PopoverContent>
    //         </Popover>
    //       </div>
    //     );
    //   },
    //   size: 10,
    // },
    // {
    //   accessorKey: "company",
    //   header: "Company",
    //   cell: ({ row }) => {
    //     const [isOpen, setIsOpen] = useState(false);

    //     return (
    //       <div onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
    //         <Popover open={isOpen}>
    //           <PopoverTrigger asChild>
    //             <div className="truncate">{row.getValue("company")}</div>
    //           </PopoverTrigger>
    //           <PopoverContent className="w-40 lg:w-60 bg-[#192131] text-white relative before:content-[''] before:absolute before:-top-2 before:left-[50%] before:translate-x-[-50%] before:w-0 before:h-0 before:border-l-[8px] before:border-l-transparent before:border-r-[8px] before:border-r-transparent before:border-b-[8px] before:border-b-[#192131]">
    //             <p>{row.getValue("company")}</p>
    //           </PopoverContent>
    //         </Popover>
    //       </div>
    //     );
    //   },
    //   size: 50,
    // },
    {
      accessorKey: "connector",
      header: "Connector / Service",
      filterFn: (row, columnId, filterValue) => {
        const value = String(filterValue ?? "");
        if (connectorIdParam && value === connectorIdParam) {
          return rowMatchesConnector(row.original, connectorIdParam, linkedConnector);
        }
        return String(row.getValue(columnId) ?? "")
          .toLowerCase()
          .includes(value.toLowerCase());
      },
      cell: ({ row }) => (
        <HoverPopover
          trigger={<div className="truncate">{row.getValue("connector")}</div>}
          content={<p>{row.getValue("connector")}</p>}
        />
      ),
      size: 50,
    },
    {
      accessorKey: "schema_name",
      header: "Schema",
      cell: ({ row }) => (
        <HoverPopover
          trigger={<div className="truncate">{row.getValue("schema_name")}</div>}
          content={<p>{row.getValue("schema_name")}</p>}
        />
      ),
      size: 50,
    },
    {
      accessorKey: "name",
      header: "Data Products / Table",
      cell: ({ row }) => (
        <HoverPopover
          trigger={
            <div className="truncate">
              <Link
                href={`/data-room/catalog/table/${row.original.id}`}
                className="text-primary hover:underline cursor-pointer"
              >
                {row.getValue("name")}
              </Link>
            </div>
          }
        />
      ),
    },
    {
      id: "erd",
      header: "Visualization",
      cell: ({ row }) => {
        const hasErd = erdTableIds.has(row.original.id) || erdTableIds.has(row.original.table_id || "");

        if (!hasErd) {
          return (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-400 rounded-full text-[9px] font-black uppercase tracking-wider border border-gray-100/50 opacity-60">
              No Graph data
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Link
              href={`/data-room/catalog/table/${row.original.id}/erd`}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors border border-indigo-100/50 shadow-sm"
              title="View ERD Diagram"
            >
              <GitGraph className="w-3 h-3" />
              Has Graph
            </Link>
            <Link
              href={`/data-room/catalog/table/${row.original.id}/erd`}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors border border-emerald-100/50 shadow-sm"
              title="View Relationship Table"
            >
              <Database className="w-3 h-3" />
              Has Table
            </Link>
          </div>
        );
      },
      size: 150,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <HoverPopover
          trigger={<div className="truncate">{row.getValue("description")}</div>}
          content={<p>{row.getValue("description")}</p>}
        />
      ),
      size: 50,
    },
    {
      accessorKey: "guides",
      header: "Guides",
      filterFn: (row, columnId, filterValue) => {
        const guides = row.getValue(columnId) as Array<{ id: string; name: string }> | undefined;
        if (!filterValue || !guides || guides.length === 0) return false;

        const searchValue = String(filterValue).toLowerCase();
        return guides.some((guide) => guide.name.toLowerCase().includes(searchValue));
      },
      cell: ({ row }) => {
        const guides = row.original.guides || [];

        return (
          <HoverPopover
            contentClassName="w-64 lg:w-80 bg-[#192131] text-white relative before:content-[''] before:absolute before:-top-2 before:left-[50%] before:translate-x-[-50%] before:w-0 before:h-0 before:border-l-[8px] before:border-l-transparent before:border-r-[8px] before:border-r-transparent before:border-b-[#192131]"
            trigger={
              <div className="truncate">
                {guides.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {guides.slice(0, 2).map((guide, index) => (
                      <span
                        key={guide.id}
                        className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                      >
                        {guide.name}
                      </span>
                    ))}
                    {guides.length > 2 && (
                      <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                        +{guides.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">No guides</span>
                )}
              </div>
            }
            content={
              <div className="space-y-2">
                <p className="font-semibold text-sm">Connected Guides:</p>
                {guides.length > 0 ? (
                  <div className="space-y-1">
                    {guides.map((guide) => (
                      <div
                        key={guide.id}
                        className="flex items-center justify-between p-2 bg-white/10 rounded"
                      >
                        <span className="text-sm">{guide.name}</span>
                        <Link
                          href={`/guides/${guide.id}`}
                          className="text-xs text-blue-300 hover:text-blue-200 hover:underline"
                        >
                          View
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-300">No guides connected to this dataset</p>
                )}
              </div>
            }
          />
        );
      },
      size: 50,
    },
    {
      accessorKey: "quality",
      header: "Quality",
      cell: ({ row }) => (
        <HoverPopover
          trigger={<div className="truncate">{row.getValue("quality")}</div>}
          content={<p>{row.getValue("quality")}</p>}
        />
      ),
      size: 50,
    },

    {
      accessorKey: "rules",
      header: "Rules",
      cell: ({ row }) => (
        <HoverPopover
          trigger={<div className="truncate">{row.getValue("rules")}</div>}
          content={<p>{row.getValue("rules")}</p>}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        return (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirm({
                  type: "single",
                  id: row.original.table_id || row.original.id,
                  name: row.original.name,
                });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      size: 40,
    },
  ];
  const { user } = useUserStore();
  const [chatSuggestions, setChatSuggestions] = useState<any[]>([]);
  const [isFreshNavigation, setIsFreshNavigation] = useState<boolean>(true);

  // Get company ID immediately from all available sources
  const getCompanyId = () => {
    if (typeof window !== "undefined") {
      const localStorageId = localStorage.getItem("selectedCompanyId");
      if (localStorageId) return localStorageId;

      // Check user store immediately - might be available on SSR or initial render
      if (user?.active_company) return user.active_company;
    }

    return null;
  };

  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(() => {
    return getCompanyId();
  });

  useEffect(() => {
    const updateCompanyId = () => {
      const currentCompanyId = getCompanyId();
      if (currentCompanyId !== savedCompanyId) {
        setSavedCompanyId(currentCompanyId);
      }
    };

    updateCompanyId();

    window.addEventListener("storage", updateCompanyId);
    window.addEventListener("localStorageChange", updateCompanyId);

    return () => {
      window.removeEventListener("storage", updateCompanyId);
      window.removeEventListener("localStorageChange", updateCompanyId);
    };
  }, [savedCompanyId]);

  const setCatalogCount = useDataCountsStore((state) => state.setCatalogCount);

  const { data: catalogData, isLoading, error } = useQuery({
    queryKey: ["catalog", savedCompanyId],
    queryFn: async () => {
      // Get company ID directly, don't throw error if not available
      let companyId = savedCompanyId;

      // Try to get from localStorage first
      if (!companyId && typeof window !== "undefined") {
        companyId = localStorage.getItem("selectedCompanyId");
      }

      // Try to get from user store
      if (!companyId && user?.active_company) {
        companyId = user.active_company;
      }

      if (!companyId) {
        console.log("No company ID available for catalog fetch");
        return [];
      }

      console.log("Fetching catalog data for company:", companyId);
      const response = await Axios.get("/data/catalog/", {
        params: {
          company_id: companyId,
        },
      });

      console.log("Catalog API response:", response.data);

      if (Array.isArray(response.data)) {
        setCatalogCount(response.data.length);
        return response.data;
      } else if (response.data && "items" in response.data) {
        setCatalogCount(response.data.items.length);
        return response.data.items;
      } else if (response.data && "total" in response.data) {
        setCatalogCount(response.data.total);
        return response.data.items || [];
      }

      return [];
    },
    enabled: true, // Always enabled, let the function handle missing company ID
    retry: 1,
  });

  // Resolve ?connector_id= (from a connector card) to its name / erp_type for row matching.
  const { data: linkedConnector, isLoading: isLinkedConnectorLoading } = useQuery({
    queryKey: ["platform-connector", connectorIdParam],
    queryFn: () => fetchPlatformConnectorById(connectorIdParam as string),
    enabled: !!connectorIdParam,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const isConnectorFilterActive =
    !!connectorIdParam &&
    columnFilters.some((f) => f.id === "connector" && f.value === connectorIdParam);

  // Keep the connector column filter and ?connector_id= in sync. Initial seeding happens
  // in the columnFilters initializer so the first render is already filtered.
  const seededConnectorId = useRef(connectorIdParam);
  useEffect(() => {
    if (seededConnectorId.current !== connectorIdParam) {
      // Param changed while mounted (back/forward, another connector link): re-seed.
      const previous = seededConnectorId.current;
      seededConnectorId.current = connectorIdParam;
      setColumnFilters((prev) => {
        const rest = prev.filter((f) => !(f.id === "connector" && f.value === previous));
        return connectorIdParam
          ? [
              ...rest.filter((f) => f.id !== "connector"),
              { id: "connector", value: connectorIdParam },
            ]
          : rest;
      });
      return;
    }
    // Filter cleared by the user: drop the param so back-nav doesn't restore it.
    if (connectorIdParam && !isConnectorFilterActive) {
      router.replace(pathname, { scroll: false });
    }
  }, [connectorIdParam, isConnectorFilterActive, pathname, router]);

  const clearConnectorFilter = () => {
    setColumnFilters((prev) => prev.filter((f) => f.id !== "connector"));
  };

  // Fetch ERD summary to show dynamic indicators
  const { data: erdSummary } = useQuery({
    queryKey: ["erd-summary", savedCompanyId],
    queryFn: async () => {
      if (!savedCompanyId) return null;
      try {
        const response = await Axios.post(`/data/erd/graph?company_id=${savedCompanyId}`);
        return response.data;
      } catch (err) {
        console.error("Error fetching ERD summary:", err);
        return null;
      }
    },
    enabled: !!savedCompanyId,
  });

  const erdTableIds = useMemo(() => {
    const ids = new Set<string>();
    if (erdSummary?.nodes) {
      erdSummary.nodes.forEach((node: any) => {
        if (node.id) ids.add(node.id);
        if (node.data?.table_id) ids.add(node.data.table_id);
      });
    }
    return ids;
  }, [erdSummary]);

  // Debug logging
  useEffect(() => {
    console.log("State debug:", {
      savedCompanyId,
      userActiveCompany: user?.active_company,
      isLoading,
      catalogDataLength: catalogData?.length,
      error,
    });
  }, [savedCompanyId, user?.active_company, isLoading, catalogData, error]);

  const handleSearch = useMemo(
    () => (query: string) => {
      setSearchQuery(query);
      filterData(query, catalogData, setSearchResults);
    },
    [catalogData, setSearchResults]
  );

  const debouncedSearch = useMemo(
    () => searchDebounce<[string]>(handleSearch, 300),
    [handleSearch]
  );

  const handleClearSearch = () => {
    setColumnFilters([]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const table = useReactTable({
    data: catalogData || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: {
      columnFilters,
      rowSelection,
    },
    manualPagination: false,
    autoResetPageIndex: false,
  });

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const isTableLoading = isLoading || (isConnectorFilterActive && isLinkedConnectorLoading);

  // Fetch chat suggestions when company is loaded
  useEffect(() => {
    const callObserveEndpoint = async () => {
      if (!savedCompanyId) return;

      try {
        const response = await Axios.post("/data/guides/orchestrator/observe", {
          current_page: "catalog",
          just_opened: isFreshNavigation,
          message: "",
          selected_company_id: savedCompanyId,
        });
        setRequestingPage("catalog");
        setIsFreshNavigation(false);
        if (response.data && response.data.suggestions) {
          setChatSuggestions(response.data.suggestions);
        }
      } catch (error) {
        console.error("Error calling observe endpoint:", error);
      }
    };

    callObserveEndpoint();
  }, [savedCompanyId]);

  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "single" | "all" | "selected";
    id?: string;
    ids?: string[];
    name?: string;
    count?: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteConfirm || !savedCompanyId) return;

    setIsDeleting(true);
    try {
      if (deleteConfirm.type === "single" && deleteConfirm.id) {
        await Axios.delete(`/data/metadata/tables/${deleteConfirm.id}`, {
          params: {
            company_id: savedCompanyId,
          },
        });
        toast.success(`Table "${deleteConfirm.name}" deleted successfully`);
      } else if (deleteConfirm.type === "selected" && deleteConfirm.ids) {
        const deletePromises = deleteConfirm.ids.map((id) =>
          Axios.delete(`/data/metadata/tables/${id}`, {
            params: {
              company_id: savedCompanyId,
            },
          })
        );
        await Promise.all(deletePromises);
        toast.success(`${deleteConfirm.ids.length} tables deleted successfully`);
        setRowSelection({});
      } else if (deleteConfirm.type === "all") {
        await Axios.delete(`/data/metadata/catalog/company/${savedCompanyId}`);
        toast.success("Catalog cleanup started in background");
      }

      setDeleteConfirm(null);
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["catalog", savedCompanyId] });

      // Also update counts if needed
      if (deleteConfirm.type === "all") {
        setCatalogCount(0);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="">
      <FloatingChatWidget
        initialSuggestions={chatSuggestions}
        contextPage="catalog"
        selectedCompanyId={savedCompanyId}
        currentParams={null}
      />
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-6 md:p-8 bg-white/40 backdrop-blur-xl border-b border-white/60 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Data Catalog</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Enterprise Asset Inventory
            </p>
          </div>
          {selectedDatasets.length > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 ml-2"
            >
              {selectedDatasets.length} Item{selectedDatasets.length > 1 ? "s" : ""} Selected
            </motion.div>
          )}
          {isConnectorFilterActive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-100 pl-4 pr-1.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ml-2"
            >
              <span>
                {linkedConnector?.name ?? "Connector"}
                {!isLoading && !isLinkedConnectorLoading && (
                  <>
                    {" · "}
                    {filteredRowCount} Table{filteredRowCount === 1 ? "" : "s"}
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={clearConnectorFilter}
                className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-indigo-100 transition-colors"
                aria-label="Clear connector filter"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          {catalogData && catalogData.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirm({ type: "all" })}
              className="whitespace-nowrap bg-red-500/10 hover:bg-red-500/20 text-red-600 hover:text-red-700 border-none shadow-none"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Catalog
            </Button>
          )}
          <AnimatePresence>
            {Object.keys(rowSelection).length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.9, width: 0 }}
                className="overflow-hidden"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const selectedIds = table
                      .getSelectedRowModel()
                      .rows.map((row) => row.original.table_id || row.original.id);
                    setDeleteConfirm({
                      type: "selected",
                      ids: selectedIds,
                      count: selectedIds.length,
                    });
                  }}
                  className="whitespace-nowrap bg-red-500/10 hover:bg-red-500/20 text-red-600 hover:text-red-700 border-none shadow-none mx-2"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({Object.keys(rowSelection).length})
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="relative group flex-1 flex gap-2">
            <div className="relative flex-1 w-full sm:w-72">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative">
                <SearchInput
                  value={searchQuery}
                  onChange={(value) => debouncedSearch(value)}
                  onClear={handleClearSearch}
                />
              </div>

              {searchResults.length > 0 && (
                <div className="absolute z-10 w-48 md:w-60 lg:w-72 mt-1 bg-white border rounded-md shadow-lg h-48 md:h-56 lg:h-64 overflow-auto">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-100 cursor-pointer "
                      onClick={() => {
                        setColumnFilters([
                          {
                            id: result.field,
                            value: result.value,
                          },
                        ]);
                        setSearchQuery(result.value);
                        setSearchResults([]);
                      }}
                    >
                      <span className="font-medium mr-3">
                        {result.field.charAt(0).toUpperCase() +
                          result.field.slice(1).split("_").join(" ")}
                        :
                      </span>{" "}
                      {result.value}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Button
              onClick={handleSemanticSearch}
              disabled={isSemanticSearching || !searchQuery.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all rounded-full px-6"
            >
              {isSemanticSearching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Ask AI
            </Button>
          </div>
        </div>
      </div>

      {semanticResults && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="my-6 px-4 md:px-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <BrainCircuit className="h-6 w-6 text-indigo-500" />
              AI Recommendations for &quot;{semanticResults.query}&quot;
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setSemanticResults(null)} className="text-gray-500 hover:text-gray-900 border border-gray-200">
              <X className="h-4 w-4 mr-2" />
              Clear Selection
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {semanticResults.recommendations.map((rec: SemanticRecommendation, index: number) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={rec.table_id || index}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 bg-gradient-to-bl from-indigo-50 to-white rounded-bl-xl border-l border-b border-indigo-100/50 flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Confidence</span>
                  <div className="flex items-center gap-1 text-indigo-600 font-bold">
                    {(rec.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="pr-16">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
                    <Database className="h-3 w-3" />
                    {rec.data_source} &gt; {rec.schema_name}
                  </div>
                  <Link href={`/data-room/catalog/table/${rec.table_id}`} className="text-lg font-bold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-1 block">
                    {rec.table_name || rec.dataset_name}
                  </Link>
                </div>

                <div className="space-y-2 flex-grow">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Match Reasons</span>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {rec.match_reasons?.map((reason: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-tight text-xs">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-100/80 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <div className="flex gap-4">
                    <span>Rows: {rec.row_count || 0}</span>
                    <span>Cols: {rec.column_count || 0}</span>
                  </div>
                  {rec.quality_score !== undefined && (
                    <div className={`px-2 py-0.5 rounded-full ${rec.quality_score >= 80 ? 'bg-green-100 text-green-700' : rec.quality_score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      Quality: {rec.quality_score}/100
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {(!semanticResults.recommendations || semanticResults.recommendations.length === 0) && (
              <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                <Search className="h-8 w-8 mx-auto text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-700">No intelligent matches found.</p>
                <p className="text-sm text-gray-400 mt-1">Try using different keywords or simpler phrasing.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
      <div className="my-10 px-4 md:px-8">
        <div className="rounded-[2.5rem] overflow-hidden border border-white/60 bg-white/20 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <Table>
            <TableHeader className="bg-gray-900/95">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-none hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] p-5 h-14 border-none first:pl-8 last:pr-8"
                      >
                        <div
                          ref={(el: HTMLDivElement | null) => {
                            filterRefs.current[header.id] = el;
                          }}
                        >
                          {header.id === "actions" || header.id === "metricsSource" ? (
                            <div className="flex items-center justify-between gap-2">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </div>
                          ) : openFilters[header.id] ? (
                            <Input
                              autoFocus
                              placeholder={`Filter ${header.column.columnDef.header}...`}
                              value={
                                header.id === "connector" && isConnectorFilterActive
                                  ? (linkedConnector?.name ?? "")
                                  : ((header.column.getFilterValue() as string) ?? "")
                              }
                              onChange={(e) => header.column.setFilterValue(e.target.value)}
                              className="h-8 w-full bg-white/10 border-white/10 text-white text-xs placeholder:text-white/30 rounded-lg focus-visible:ring-blue-500"
                            />
                          ) : (
                            <div
                              className="flex items-center justify-between gap-2 group/header cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenFilters((prev) => ({
                                  ...prev,
                                  [header.id]: true,
                                }));
                              }}
                            >
                              <span className="group-hover/header:text-white transition-colors">
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </span>
                              <Filter className="h-3 w-3 opacity-0 group-hover/header:opacity-100 transition-opacity text-blue-400" />
                            </div>
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableRow className="border-none">
                  <TableCell colSpan={columns.length} className="h-64 text-center border-none">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative mb-4">
                        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                        <div className="absolute inset-0 bg-blue-400/20 blur-xl rounded-full animate-pulse" />
                      </div>
                      <p className="text-sm font-black text-gray-500 uppercase tracking-widest">
                        Compiling Catalog Resources...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="group/row border-b border-gray-100/50 hover:bg-blue-50/30 data-[state=selected]:bg-blue-50/40 transition-colors last:border-none"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="p-5 text-sm font-medium text-gray-700 first:pl-8 last:pr-8"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !catalogData || catalogData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center font-medium text-xl"
                  >
                    <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
                      <p className="text-xl font-medium text-gray-600">No data available</p>
                      <p className="text-sm text-gray-500">
                        Please add some entries to your catalog
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center font-medium text-xl"
                  >
                    <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
                      <p className="text-xl font-medium text-gray-600">No Results Found</p>
                      <p className="text-sm text-gray-500">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="bg-white text-black border-gray-200 sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {deleteConfirm?.type === "all" ? "Clear Catalog?" : "Delete Table?"}
                </DialogTitle>
                <DialogDescription className="text-gray-500 mt-1">
                  This action is irreversible. Use with caution.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2">
            {deleteConfirm?.type === "all" ? (
              <p className="text-sm text-gray-600">
                Are you sure you want to delete <span className="font-bold text-red-600">ALL</span>{" "}
                catalog entries? This will remove all datasets, schemas, tables, and columns for
                this company.
              </p>
            ) : deleteConfirm?.type === "selected" ? (
              <p className="text-sm text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-bold text-red-600">{deleteConfirm?.count}</span> selected
                tables? This will remove these tables and all associated columns and values.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-bold">{deleteConfirm?.name}</span>? This will remove the table
                and all associated columns and values.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={isDeleting}
              className="border-gray-200 hover:bg-gray-100 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Catalog;
