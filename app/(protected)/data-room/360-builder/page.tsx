"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Binary,
  Briefcase,
  Check,
  ChevronRight,
  Database,
  ExternalLink,
  Fingerprint,
  Link2,
  ListTree,
  Loader2,
  Mail,
  MapPin,
  Merge,
  Plus,
  Search,
  Settings2,
  Shapes,
  ShieldCheck,
  Sparkles,
  Table as TableIcon,
  TrendingUp,
  Trash2,
  User,
  ChevronDown,
  Hash,
  Type,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Axios } from "@/app/config/axios";
import { useUserStore } from "@/app/store/userStore";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { ScrollArea } from "@/components/ui/scroll-area";

import { useQuery } from "@tanstack/react-query";

// --- Types ---
type SourceTable = {
  id: string;
  name: string;
  connector: string;
  columns: string[];
  table_id?: string;
  columnsInfo?: any[];
  description?: string;
  erp_type?: string;
};

type IdentityRule = {
  sourceTableId: string;
  columns: string[];
  targetKey: string;
};

type CanonicalField = {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
};

type AttributeMapping = {
  canonicalFieldId: string;
  sourceTableId: string;
  sourceColumn: string;
};

// --- Normalizers for live API data (best-effort) ---
type CustomerRow = {
  id: string;
  date: string;
  type: string;
  status: string;
  value: string;
  notes: string;
};

const normalizeCustomerRows = (raw: any): CustomerRow[] => {
  if (!raw) return [];

  const tryArrays = [
    (raw as any).ledger,
    (raw as any).records,
    (raw as any).items,
    Array.isArray(raw) ? raw : null,
  ].find((v) => Array.isArray(v)) as any[] | undefined;

  const rows = tryArrays || [];

  return rows.map((rec: any, idx: number) => {
    const id =
      rec.id ||
      rec.record_id ||
      rec.uuid ||
      rec.canonical_id ||
      `REC-${(idx + 1).toString().padStart(4, "0")}`;

    const dateVal = rec.date || rec.txn_date || rec.created_at || rec.timestamp || rec.event_time;
    const date =
      typeof dateVal === "string" ? dateVal : dateVal instanceof Date ? dateVal.toISOString() : "";

    const type = rec.type || rec.record_type || rec.event_type || rec.category || "Record";

    const status = rec.status || rec.state || rec.phase || "";

    const valueRaw = rec.value ?? rec.amount ?? rec.total ?? rec.monetary_value;
    const value =
      typeof valueRaw === "number"
        ? valueRaw.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })
        : typeof valueRaw === "string"
          ? valueRaw
          : "";

    const notes = rec.notes || rec.description || rec.summary || rec.title || "";

    return {
      id: String(id),
      date: String(date || ""),
      type: String(type || ""),
      status: String(status || ""),
      value: String(value || ""),
      notes: String(notes || ""),
    };
  });
};

const INITIAL_CANONICAL_FIELDS: CanonicalField[] = [
  { id: "c1", name: "uuid", type: "string", isPrimaryKey: true },
  { id: "c2", name: "first_name", type: "string", isPrimaryKey: false },
  { id: "c3", name: "last_name", type: "string", isPrimaryKey: false },
  { id: "c4", name: "email", type: "string", isPrimaryKey: false },
  { id: "c5", name: "title", type: "string", isPrimaryKey: false },
];

// --- Components ---
const DynamicColumnSelect = ({
  options = [],
  value,
  onSelect,
  placeholder = "Select Column",
  className = "",
  variant = "default",
  multiple = false,
}: {
  options?: any[];
  value?: string | string[];
  onSelect: (val: any) => void;
  placeholder?: string;
  className?: string;
  variant?: "default" | "compact";
  multiple?: boolean;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const values = Array.isArray(value) ? value : value ? [value] : [];

  const filteredOptions = options.filter((opt) =>
    opt.column_name?.toLowerCase().includes(filter.toLowerCase())
  );

  const formatSample = (distinctCounts: any) => {
    if (!distinctCounts) return null;
    const keys = Object.keys(distinctCounts).filter(
      (k) => k !== "(Null/Empty)" && k !== "null" && k !== ""
    );
    return keys[0] || null;
  };

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={(open) => {
        setIsPopoverOpen(open);
        if (!open) setFilter("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between rounded-xl border-gray-100 bg-white font-bold text-sm transition-all focus:border-blue-500 hover:bg-gray-50/50",
            variant === "compact" ? "h-11 px-4 text-xs font-bold" : "h-12 px-4 shadow-sm",
            className
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {values.length > 0 ? (
              <>
                <span className="truncate">
                  {multiple
                    ? values.length === 1
                      ? values[0]
                      : `${values.length} selected`
                    : values[0]}
                </span>
                {!multiple && (
                  <span className="text-[10px] text-gray-400 font-normal opacity-60">
                    {options
                      .find((opt) => opt.column_name?.toLowerCase() === values[0]?.toLowerCase())
                      ?.data_type?.toLowerCase() || "text"}
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-400 font-medium">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0 rounded-2xl shadow-2xl border-white/60 backdrop-blur-xl z-[9999]"
        align="start"
      >
        {/* Search input */}
        <div className="flex items-center border-b border-gray-100 px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            placeholder="Search columns..."
            className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
          />
        </div>
        {/* Options list */}
        <div className="max-h-[320px] overflow-y-auto p-2">
          {filteredOptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No columns found.</p>
          ) : (
            filteredOptions.map((opt) => {
              const sample = formatSample(opt.distinct_value_counts);
              const isSelected = values.some(
                (v: string) => v.toLowerCase() === opt.column_name?.toLowerCase()
              );

              return (
                <div
                  key={opt.column_name}
                  onClick={() => {
                    if (multiple) {
                      const isAlreadySelected = values.some(
                        (v: string) => v.toLowerCase() === opt.column_name?.toLowerCase()
                      );
                      let newValues;
                      if (isAlreadySelected) {
                        newValues = values.filter(
                          (v: string) => v.toLowerCase() !== opt.column_name?.toLowerCase()
                        );
                      } else {
                        newValues = [...values, opt.column_name];
                      }
                      onSelect(newValues);
                    } else {
                      onSelect(opt.column_name);
                      setIsPopoverOpen(false);
                      setFilter("");
                    }
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 cursor-pointer rounded-xl transition-colors mb-1",
                    isSelected ? "bg-blue-600 text-white" : "hover:bg-blue-50 text-gray-900"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-black text-sm tracking-tight",
                          isSelected ? "text-white" : "text-gray-900"
                        )}
                      >
                        {opt.column_name}
                      </span>
                      <div
                        className={cn(
                          "px-1.5 py-0.5 text-[8px] font-black uppercase rounded-md",
                          isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {opt.data_type || "TEXT"}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  {sample && (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-[10px] font-medium",
                        isSelected ? "text-white/60" : "text-gray-400"
                      )}
                    >
                      <Sparkles
                        className={cn(
                          "w-2.5 h-2.5",
                          isSelected ? "text-white/60" : "text-blue-400"
                        )}
                      />
                      <span className="truncate max-w-[200px]">
                        {sample.length > 35 ? sample.substring(0, 35) + "..." : sample}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const AssemblyProgress = ({ isOpen, phase }: { isOpen: boolean; phase: number }) => {
  const phases = [
    { id: 1, label: "Initializing Engine", icon: Settings2 },
    { id: 2, label: "Migrating Source Tables", icon: Database },
    { id: 3, label: "Identity Resolution", icon: Fingerprint },
    { id: 4, label: "Golden Record Generation", icon: Sparkles },
  ];

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md rounded-[3rem] border-none bg-white/90 backdrop-blur-2xl shadow-2xl p-10 overflow-hidden">
        <div className="flex flex-col items-center justify-center space-y-8 py-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Shapes className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
              Assembling 360° Model
            </DialogTitle>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">
              System is processing your data sources
            </p>
          </div>

          <div className="w-full space-y-4 pt-4">
            {phases.map((p) => {
              const isPast = phase > p.id;
              const isCurrent = phase === p.id;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl transition-all duration-500",
                    isCurrent
                      ? "bg-blue-600 text-white shadow-xl shadow-blue-500/20 scale-105"
                      : isPast
                        ? "bg-green-50 text-green-700 opacity-60"
                        : "bg-gray-50 text-gray-400 opacity-40"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                      isCurrent ? "bg-white/20" : isPast ? "bg-green-100" : "bg-white"
                    )}
                  >
                    {isPast ? <Check className="w-5 h-5" /> : <p.icon className="w-5 h-5" />}
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest flex-1">
                    {p.label}
                  </span>
                  {isCurrent && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function ThreeSixtyViewPage() {
  const [demoMode, setDemoMode] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedTables, setSelectedTables] = useState<SourceTable[]>([]);
  const [identityRules, setIdentityRules] = useState<IdentityRule[]>([]);
  const [canonicalFields, setCanonicalFields] =
    useState<CanonicalField[]>(INITIAL_CANONICAL_FIELDS);
  const [mappings, setMappings] = useState<AttributeMapping[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [selectedColumnsByTable, setSelectedColumnsByTable] = useState<Record<string, string[]>>(
    {}
  );
  const [tableDescriptions, setTableDescriptions] = useState<Record<string, string>>({});
  const [isSubmittingView360, setIsSubmittingView360] = useState(false);
  const [view360Response, setView360Response] = useState<any>(null);
  const [isAssembling, setIsAssembling] = useState(false);
  const [assemblyPhase, setAssemblyPhase] = useState(0);
  const [product, setProduct] = useState<string>();

  const { user } = useUserStore();
  const companyId = user?.active_company;

  useEffect(() => {
    if (step === 2 && identityRules.length === 0 && selectedTables.length > 0) {
      const initialRules: IdentityRule[] = selectedTables.map((t) => {
        const primaryKeys = t.columns.filter(
          (c) => c.toLowerCase().includes("id") || c.toLowerCase().includes("uuid")
        );
        return {
          sourceTableId: t.id,
          columns:
            primaryKeys.length > 0 ? primaryKeys : t.columns.length > 0 ? [t.columns[0]] : [],
          targetKey: "uuid",
        };
      });
      setIdentityRules(initialRules);
    }
  }, [step, selectedTables, identityRules.length]);

  const { data: catalogData, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ["catalog", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const response = await Axios.get("/data/catalog/", {
        params: { company_id: companyId, schema_name: "staging" },
      });

      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && typeof response.data === "object" && "items" in response.data) {
        return response.data.items || [];
      }
      return [];
    },
    enabled: !!companyId,
  });

  const { data: enrichedTables, isLoading: isLoadingEnriched } = useQuery({
    queryKey: ["enriched-tables", selectedTables.map((t) => t.id), companyId],
    queryFn: async () => {
      if (selectedTables.length === 0 || !companyId) return [];
      const tables = await Promise.all(
        selectedTables.map(async (table) => {
          try {
            const response = await Axios.get(`/data/metadata/columns`, {
              params: { table_id: table.id, company_id: companyId, limit: 100 },
            });
            const columnsInfo = response.data.items || [];
            return {
              ...table,
              columns:
                columnsInfo.length > 0
                  ? columnsInfo.map((ci: any) => ci.column_name)
                  : table.columns,
              columnsInfo,
            };
          } catch (e) {
            console.error(`Error enrichment for ${table.name}`, e);
            return table;
          }
        })
      );
      return tables;
    },
    enabled: selectedTables.length > 0 && !!companyId,
  });

  const displayTables =
    enrichedTables && enrichedTables.length > 0 ? enrichedTables : selectedTables;

  const availableTables = (catalogData || []).map((t: any) => ({
    id: t.table_id || t.id,
    name: t.name,
    connector: t.connector,
    columns: t.columns || [],
    description: t.description || "",
    erp_type: t.erp_type || "",
  }));

  const [searchQuery, setSearchQuery] = useState("");

  const filteredAvailableTables = availableTables.filter(
    (t: SourceTable) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.connector.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Handlers ---
  const toggleTableSelection = (table: SourceTable) => {
    setSelectedTables((prev) =>
      prev.find((t) => t.id === table.id) ? prev.filter((t) => t.id !== table.id) : [...prev, table]
    );
  };

  const nextStep = async (fromStep: number) => {
    if (fromStep === 2) {
      const success = await handleSubmitToView360();
      if (!success) return;
      setStep(4); // Skip step 3
      return;
    }
    if (step === fromStep) setStep(fromStep + 1);
  };
  const prevStep = () => setStep((s) => s - 1);

  const handleSubmitToView360 = async () => {
    if (!companyId) return;
    setIsSubmittingView360(true);
    const tId = toast.loading("Configuring View 360 Structure...");
    try {
      const payload = {
        // company_id: companyId,
        product: (product ?? "").trim().toLowerCase().replace(/ /g, "_"),
        tables: selectedTables.map((table) => {
          // const columns = selectedColumnsByTable[table.id] || table.columns;
          const columns =
            identityRules.find((item) => item.sourceTableId == table.id)?.columns ?? [];
          return {
            columns: columns.length > 0 ? columns : table.columns,
            table_name: table.name,
            table_description:
              tableDescriptions[table.id] || table.description || table.name || "No description",
            source_connector: table.erp_type,
            table_id: table.id,
          };
        }),
      };
      console.log("Submitting View 360 payload:", JSON.stringify(payload, null, 2), {
        selectedTables,
        selectedColumnsByTable,
        identityRules,
      });
      const response = await Axios.post("/data/view360/add", payload);
      const responseData = response.data;
      setView360Response(responseData);

      // add Canonical records...
      const canonicalRecords = (responseData?.result?.columns ?? []).map(
        (item: string, idx: number) => ({
          id: item,
          name: item,
          type: "string",
          isPrimaryKey: idx === 0,
        })
      );

      setCanonicalFields(canonicalRecords);

      console.log("View 360 API Response:", responseData);
      toast.success("View 360 Structure Synced Successfully!", { id: tId });
      return true;
    } catch (error: any) {
      console.error("Failed to sync 360 mapping", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Unknown error";
      const errorStatus = error.response?.status || "Unknown";
      console.error(`API Error (${errorStatus}):`, errorMessage);
      toast.error(`Failed to sync View 360 mapping: ${errorMessage}`, { id: tId });
      return false;
    } finally {
      setIsSubmittingView360(false);
    }
  };

  const handleAutoResolve = () => {
    setIsResolving(true);
    setTimeout(() => {
      // Mock resolution logic
      const newRules: IdentityRule[] = selectedTables.map((t) => {
        const primaryKeys = t.columns.filter(
          (c) => c.toLowerCase().includes("id") || c.toLowerCase().includes("uuid")
        );
        return {
          sourceTableId: t.id,
          columns:
            primaryKeys.length > 0 ? primaryKeys : t.columns.length > 0 ? [t.columns[0]] : [],
          targetKey: "uuid",
        };
      });
      setIdentityRules(newRules);

      const newMappings: AttributeMapping[] = [];
      selectedTables.forEach((t) => {
        canonicalFields.forEach((cf) => {
          const match = t.columns.find(
            (col) =>
              col.toLowerCase().replace(/_/g, "") === cf.name.toLowerCase().replace(/_/g, "") ||
              col.toLowerCase().includes(cf.name.toLowerCase())
          );
          if (match) {
            newMappings.push({
              canonicalFieldId: cf.id,
              sourceTableId: t.id,
              sourceColumn: match,
            });
          }
        });
      });
      setMappings(newMappings);

      setIsResolving(false);
      toast.success("Identity resolution and attribute mapping proposed!");
    }, 2000);
  };

  const handleAssembleView360 = async () => {
    // Demo mode: bypass backend assembly and go straight to 360 builder
    if (demoMode) {
      setStep(5);
      toast.info("Demo mode: skipping assembly and showing 360 builder.");
      return;
    }

    console.log("View 360 Response for ID extraction:", view360Response);

    let canonicalId = null;

    if (view360Response) {
      if (typeof view360Response === "string") {
        canonicalId = view360Response;
      } else if (typeof view360Response === "object") {
        // Prioritize 'id' as stated by the user
        canonicalId =
          view360Response.id ||
          view360Response.canonical_id ||
          view360Response.result?.id ||
          view360Response.result?.canonical_id ||
          view360Response.data?.id ||
          view360Response.company_id ||
          view360Response.table_id;

        // Handle nested structures or arrays
        if (!canonicalId) {
          if (Array.isArray(view360Response) && view360Response.length > 0) {
            canonicalId = view360Response[0].id || view360Response[0].canonical_id;
          } else if (
            view360Response.items &&
            Array.isArray(view360Response.items) &&
            view360Response.items.length > 0
          ) {
            canonicalId = view360Response.items[0].id || view360Response.items[0].canonical_id;
          }
        }
      }
    }

    // Final fallback to active company ID
    if (!canonicalId && companyId) {
      console.log(
        "No specific canonical ID found in response, falling back to company ID:",
        companyId
      );
      canonicalId = companyId;
    }

    if (!canonicalId) {
      console.warn(
        "Could not find a canonical ID. Response content:",
        JSON.stringify(view360Response)
      );
      toast.error("Missing Canonical ID. Please ensure the structure is synced.");
      return;
    }

    const checkJobStatus = async (id: string) => {
      try {
        const response = await Axios.get(`/data/jobs/canonical/${id}`, {
          params: { company_id: companyId },
        });
        const jobs = response.data || [];
        // Look for migration or most recent job
        const job = jobs[0];
        return job?.status || "pending";
      } catch (error) {
        console.error("Job status check error:", error);
        return "pending";
      }
    };

    setIsAssembling(true);
    setAssemblyPhase(1);

    try {
      console.log(`Calling migrate API for ID: ${canonicalId}`);
      setAssemblyPhase(2); // Migrating Source Tables

      await Axios.post(`/data/view360/migrate/${canonicalId}`);

      // Poll for completion
      const interval = setInterval(async () => {
        const status = await checkJobStatus(canonicalId);
        console.log(`Job status: ${status}`);

        if (status === "completed") {
          clearInterval(interval);
          setAssemblyPhase(3); // Identity Resolution
          setTimeout(() => setAssemblyPhase(4), 1000); // Golden Record Generation

          setTimeout(() => {
            toast.success("Golden Record Ensemble Assembled!");
            setStep(5);
            setIsAssembling(false);
            setAssemblyPhase(0);
          }, 2500);
        } else if (status === "failed") {
          clearInterval(interval);
          toast.error("Assembly failed. Please check source tables and try again.");
          setIsAssembling(false);
          setAssemblyPhase(0);
        }
      }, 3000);
    } catch (error) {
      console.error("Failed to assemble 360 model", error);
      toast.error("Failed to assemble 360 model. Please try again.");
      setIsAssembling(false);
      setAssemblyPhase(0);
    }
  };

  const getMappingFor = (fieldId: string, tableId: string) => {
    return mappings.find((m) => m.canonicalFieldId === fieldId && m.sourceTableId === tableId);
  };

  const handleMappingChange = (fieldId: string, tableId: string, column: string) => {
    setMappings((prev) => {
      const other = prev.filter(
        (m) => !(m.canonicalFieldId === fieldId && m.sourceTableId === tableId)
      );
      if (column === "none") return other;
      return [
        ...other,
        { canonicalFieldId: fieldId, sourceTableId: tableId, sourceColumn: column },
      ];
    });
  };

  // --- Demo helpers ---
  const activateDemo = () => {
    setDemoMode(true);

    // Lightweight mock tables for the final 360 screen
    const demoTables: SourceTable[] = [
      {
        id: "t1",
        name: "ERP_Orders",
        connector: "Postgres",
        columns: ["order_id", "order_date", "amount", "status"],
        erp_type: "postgres",
      },
      {
        id: "t2",
        name: "CRM_Contacts",
        connector: "Salesforce",
        columns: ["contact_id", "email", "lifecycle_stage"],
        erp_type: "salesforce",
      },
    ];

    setSelectedTables(demoTables);

    const demoIdentity: IdentityRule[] = demoTables.map((t) => ({
      sourceTableId: t.id,
      columns: [t.columns[0]],
      targetKey: "uuid",
    }));
    setIdentityRules(demoIdentity);

    const demoMappings: AttributeMapping[] = [
      { canonicalFieldId: "c1", sourceTableId: "t1", sourceColumn: "order_id" },
      { canonicalFieldId: "c2", sourceTableId: "t2", sourceColumn: "first_name" },
      { canonicalFieldId: "c3", sourceTableId: "t2", sourceColumn: "last_name" },
      { canonicalFieldId: "c4", sourceTableId: "t2", sourceColumn: "email" },
    ];
    setMappings(demoMappings);

    setStep(5);
    toast.success("Demo mode activated – jumping to 360 builder.");
  };

  const mockCustomerRows: CustomerRow[] = [
    {
      id: "REC-1001",
      date: "01/03/2025",
      type: "Order",
      status: "Posted",
      value: "$12,430",
      notes: "Quarterly renewal invoice",
    },
    {
      id: "REC-1002",
      date: "15/02/2025",
      type: "Support",
      status: "Active",
      value: "$0",
      notes: "Open priority case: billing anomaly",
    },
    {
      id: "REC-1003",
      date: "03/02/2025",
      type: "Activity",
      status: "Logged",
      value: "$0",
      notes: "Customer attended roadmap webinar",
    },
    {
      id: "REC-1004",
      date: "22/01/2025",
      type: "Order",
      status: "Settled",
      value: "$4,980",
      notes: "Add‑on licenses for APAC team",
    },
  ];

  const mockRecentActivity = [
    { id: "A-001", title: "Viewed pricing page", channel: "Web", time: "5 min ago" },
    { id: "A-002", title: "Opened renewal proposal email", channel: "Email", time: "2 days ago" },
    { id: "A-003", title: "Joined Q1 roadmap webinar", channel: "Webinar", time: "1 week ago" },
  ];

  const mockOpenCases = [
    {
      id: "C-1198",
      subject: "Billing anomaly on March invoice",
      owner: "Sarah Lee",
      priority: "High",
    },
    {
      id: "C-1207",
      subject: "Access issue for new APAC users",
      owner: "Miguel Santos",
      priority: "Medium",
    },
  ];

  const mockLastInteraction = {
    mode: "Video call",
    owner: "Account Team",
    duration: "42 min",
    summary: "Quarterly business review covering expansion plan and support SLAs.",
    date: "18/02/2025",
  };

  const [activityTab, setActivityTab] = useState<
    "Recent Activity" | "Open Cases" | "Last Interaction"
  >("Recent Activity");
  const [selectedLedgerRows, setSelectedLedgerRows] = useState<Set<string>>(new Set());

  return (
    <div className="relative min-h-screen w-full bg-[#FAFBFF] overflow-hidden px-4 py-8 sm:px-6 md:px-8 lg:px-12">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-indigo-400/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)]">
              <Shapes className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase">
                360 Builder
              </h1>
              <p className="text-gray-500 font-bold text-[9px] mt-0.5 tracking-[0.3em] uppercase flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-blue-500" /> Unified Entity Intelligence
              </p>
            </div>
          </div>

          {/* Stepper + Demo toggle */}
          <div className="flex items-center gap-6">
            <div className="flex items-center bg-white/40 backdrop-blur-3xl p-2 rounded-3xl border border-white/60 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
              {[
                { stepValue: 1, label: "Sources" },
                { stepValue: 2, label: "Resolve" },
                { stepValue: 4, label: "Assemble" },
                { stepValue: 5, label: "Golden Model" },
              ].map((s, index, array) => (
                <div key={s.stepValue} className="flex items-center">
                  <motion.div
                    animate={{
                      scale: step === s.stepValue ? 1.1 : 1,
                      backgroundColor:
                        step === s.stepValue
                          ? "#2563eb"
                          : step > s.stepValue
                            ? "#10b981"
                            : "#ffffff",
                    }}
                    className={cn(
                      "w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all duration-500 border border-transparent shadow-sm",
                      step === s.stepValue
                        ? "text-white shadow-blue-500/40"
                        : step > s.stepValue
                          ? "text-white shadow-emerald-500/20"
                          : "text-gray-400 border-gray-100"
                    )}
                  >
                    {step > s.stepValue ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-[10px] font-black">
                        {s.stepValue === 4 ? 3 : s.stepValue === 5 ? 4 : s.stepValue}
                      </span>
                    )}
                  </motion.div>
                  <div className="mx-3 flex flex-col items-start min-w-[60px]">
                    <span
                      className={cn(
                        "text-[8px] font-black uppercase tracking-widest leading-none mb-1",
                        step >= s.stepValue ? "text-blue-600" : "text-gray-300"
                      )}
                    >
                      Step {s.stepValue === 4 ? 3 : s.stepValue === 5 ? 4 : s.stepValue}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-black font-semibold uppercase leading-none",
                        step === s.stepValue ? "text-gray-900" : "text-gray-400"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {index < array.length - 1 && (
                    <div className="relative w-8 h-[2px] mx-2">
                      <div className="absolute inset-0 bg-gray-100" />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: step > s.stepValue ? "100%" : "0%" }}
                        className="absolute inset-0 bg-emerald-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant={demoMode ? "default" : "outline"}
              onClick={activateDemo}
              className={cn(
                "h-10 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.18em] shadow-sm",
                demoMode
                  ? "bg-blue-600 text-white"
                  : "bg-white/70 border-blue-100 text-blue-600 hover:bg-white"
              )}
            >
              {demoMode ? "Demo Mode Active" : "Demo: Skip to 360 Builder"}
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                        <Database className="w-6 h-6 text-blue-600" />
                        Select Data Sources
                      </h3>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          className="pl-11 pr-4 py-6 rounded-2xl border-none bg-gray-50/50 w-64 focus:bg-white transition-all shadow-inner"
                          placeholder="Search tables..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {isLoadingCatalog ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">
                          Accessing Catalog...
                        </p>
                      </div>
                    ) : availableTables.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                          <Database className="w-10 h-10 text-blue-200" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-gray-900">Catalog is Empty</p>
                          <p className="text-sm text-gray-500 max-w-xs mx-auto">
                            Please sync your connectors in the CoreOS to populate the data catalog.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                        {filteredAvailableTables.map((table: SourceTable) => {
                          const isSelected = !!selectedTables.find((t) => t.id === table.id);
                          return (
                            <motion.div
                              key={table.id}
                              whileHover={{ y: -8, scale: 1.02 }}
                              onClick={() => toggleTableSelection(table)}
                              className={cn(
                                "relative overflow-hidden p-8 rounded-[3rem] border transition-all duration-500 cursor-pointer flex flex-col gap-6 group",
                                isSelected
                                  ? "bg-blue-600 border-blue-500 shadow-2xl shadow-blue-500/20 text-white"
                                  : "bg-white/40 backdrop-blur-3xl border-white/60 shadow-[0_30px_60px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_100px_rgba(37,99,235,0.08)]"
                              )}
                            >
                              <div className="flex items-start justify-between relative z-10">
                                <div
                                  className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500",
                                    isSelected
                                      ? "bg-white/20"
                                      : "bg-blue-50 border border-blue-100/50 group-hover:scale-110"
                                  )}
                                >
                                  <Database
                                    className={cn(
                                      "w-7 h-7",
                                      isSelected ? "text-white" : "text-blue-600"
                                    )}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  {isSelected && (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className={cn(
                                            "h-10 w-10 rounded-xl transition-all",
                                            isSelected
                                              ? "text-white hover:bg-white/20"
                                              : "text-gray-400 hover:bg-gray-100"
                                          )}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Settings2 className="w-5 h-5" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-xl bg-white/80 backdrop-blur-3xl rounded-[3rem] border-white/60 p-10 shadow-2xl">
                                        <DialogHeader className="mb-8">
                                          <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                              <Settings2 className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                              <DialogTitle className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter">
                                                Source Configuration
                                              </DialogTitle>
                                              <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600/60 mt-0.5">
                                                {table.name} Settings
                                              </DialogDescription>
                                            </div>
                                          </div>
                                        </DialogHeader>
                                        <div className="space-y-8">
                                          <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                                              Asset Description
                                            </label>
                                            <Input
                                              placeholder="Identify the strategic value of this source..."
                                              className="h-14 px-6 rounded-2xl bg-gray-50/50 border-gray-100 focus:bg-white focus:border-blue-500 transition-all font-medium"
                                              value={tableDescriptions[table.id] || ""}
                                              onChange={(e) =>
                                                setTableDescriptions((prev) => ({
                                                  ...prev,
                                                  [table.id]: e.target.value,
                                                }))
                                              }
                                            />
                                          </div>
                                          <div className="space-y-4">
                                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                                                Included Attributes
                                              </label>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50"
                                                onClick={() => {
                                                  const tableInfo = enrichedTables?.find(
                                                    (et) => et.id === table.id
                                                  );
                                                  const allCols =
                                                    tableInfo?.columns || table.columns;
                                                  setSelectedColumnsByTable((prev) => ({
                                                    ...prev,
                                                    [table.id]: allCols,
                                                  }));
                                                }}
                                              >
                                                Engage All
                                              </Button>
                                            </div>
                                            <ScrollArea className="h-64 rounded-[2rem] bg-gray-50/30 p-4 border border-gray-100/50">
                                              <div className="grid grid-cols-2 gap-2">
                                                {(
                                                  enrichedTables?.find((et) => et.id === table.id)
                                                    ?.columns || table.columns
                                                ).map((col: string) => (
                                                  <div
                                                    key={col}
                                                    onClick={() => {
                                                      setSelectedColumnsByTable((prev) => {
                                                        const current = prev[table.id] || [];
                                                        if (current.includes(col)) {
                                                          return {
                                                            ...prev,
                                                            [table.id]: current.filter(
                                                              (c) => c !== col
                                                            ),
                                                          };
                                                        }
                                                        return {
                                                          ...prev,
                                                          [table.id]: [...current, col],
                                                        };
                                                      });
                                                    }}
                                                    className={cn(
                                                      "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border",
                                                      selectedColumnsByTable[table.id]?.includes(
                                                        col
                                                      )
                                                        ? "bg-white border-blue-200 shadow-sm"
                                                        : "border-transparent hover:bg-white/50"
                                                    )}
                                                  >
                                                    <div
                                                      className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                        selectedColumnsByTable[table.id]?.includes(
                                                          col
                                                        )
                                                          ? "bg-blue-600 border-blue-600"
                                                          : "border-gray-300"
                                                      )}
                                                    >
                                                      {selectedColumnsByTable[table.id]?.includes(
                                                        col
                                                      ) && (
                                                        <Check className="w-2.5 h-2.5 text-white stroke-[4]" />
                                                      )}
                                                    </div>
                                                    <span
                                                      className={cn(
                                                        "text-xs font-bold truncate",
                                                        selectedColumnsByTable[table.id]?.includes(
                                                          col
                                                        )
                                                          ? "text-gray-900"
                                                          : "text-gray-500"
                                                      )}
                                                    >
                                                      {col}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            </ScrollArea>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                  {isSelected && (
                                    <div className="p-2 bg-white/20 rounded-full">
                                      <Check className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="relative z-10">
                                <h3
                                  className={cn(
                                    "text-xl font-black font-semibold uppercase tracking-tight truncate",
                                    isSelected ? "text-white" : "text-gray-900"
                                  )}
                                >
                                  {table.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <p
                                    className={cn(
                                      "text-[9px] font-black uppercase tracking-[0.2em]",
                                      isSelected ? "text-blue-100/80" : "text-blue-600/60"
                                    )}
                                  >
                                    {table.connector} Agent
                                  </p>
                                  {isSelected && (
                                    <span className="text-[8px] bg-white/20 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                      {selectedColumnsByTable[table.id]?.length || 0} cols
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={cn(
                                    "text-xs font-medium mt-4 line-clamp-2 leading-relaxed opacity-60",
                                    isSelected ? "text-white/80" : "text-gray-500"
                                  )}
                                >
                                  {table.description ||
                                    "Synchronized source table for ensemble identity resolution."}
                                </p>
                              </div>

                              <div
                                className={cn(
                                  "mt-auto pt-4 border-t relative z-10 flex items-center justify-between",
                                  isSelected ? "border-white/10" : "border-gray-100"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <ListTree
                                    className={cn(
                                      "w-3.5 h-3.5 opacity-60",
                                      isSelected ? "text-white" : "text-blue-500"
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      "text-[10px] font-black uppercase tracking-widest",
                                      isSelected ? "text-white" : "text-gray-400"
                                    )}
                                  >
                                    {table.columns.length} Columns
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-500/30">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-3">
                      <Binary className="w-6 h-6" />
                      Selection Info
                    </h3>
                    <p className="text-blue-50 font-medium text-sm leading-relaxed mb-6 opacity-80">
                      Select multiple sources from different connectors to start the identity
                      resolution process.
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                        <span className="text-sm font-bold uppercase tracking-wider">Sources</span>
                        <span className="text-2xl font-black">{selectedTables.length}</span>
                      </div>
                    </div>
                  </div>

                  <Input
                    className="pl-11 pr-4 py-6 rounded-2xl border-none bg-gray-50/50 w-64 focus:bg-white transition-all shadow-inner"
                    placeholder="Kindly Type the Product..."
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                  />

                  <Button
                    disabled={selectedTables.length < 2 || !product}
                    onClick={() => nextStep(1)}
                    className="w-full py-8 rounded-[2rem] bg-white border border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-500 font-black uppercase tracking-[0.2em] shadow-lg hover:shadow-blue-500/20 group"
                  >
                    Proceed to Identity
                    <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 flex items-center gap-4">
                      <Fingerprint className="w-8 h-8 text-blue-600" />
                      Identity Resolution
                    </h3>
                    <p className="text-gray-500 font-medium mt-1">
                      Define primary keys to unite entities across sources.
                    </p>
                  </div>
                  <Button
                    onClick={handleAutoResolve}
                    disabled={isResolving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 gap-3 group"
                  >
                    {isResolving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    AI Primary Key Suggestion
                  </Button>
                </div>

                <div className="space-y-4">
                  {displayTables.map((table) => (
                    <div
                      key={table.id}
                      className="p-6 bg-white/60 border border-white/80 rounded-3xl flex items-center justify-between group hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                          <TableIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-gray-900 font-semibold uppercase tracking-tighter">
                            Source Configuration
                          </h3>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600/60 mt-0.5">
                            {table.name} Settings
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <Link2 className="w-5 h-5 text-gray-300" />
                        <div className="w-72">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                            Primary Identity Identifier
                          </label>
                          <DynamicColumnSelect
                            multiple={true}
                            options={(() => {
                              const tableInfo = displayTables.find(
                                (dt) => dt.id === table.id
                              ) as any;
                              const allCols =
                                tableInfo?.columnsInfo ||
                                table.columns.map((c: string) => ({
                                  column_name: c,
                                  data_type: "string",
                                }));
                              const selected = selectedColumnsByTable[table.id];
                              if (selected && selected.length > 0) {
                                return allCols.filter((opt: any) =>
                                  selected.includes(opt.column_name)
                                );
                              }
                              return allCols;
                            })()}
                            value={
                              identityRules.find((r) => r.sourceTableId === table.id)?.columns || []
                            }
                            onSelect={(cols: string[]) => {
                              setIdentityRules((prev) => {
                                const other = prev.filter((r) => r.sourceTableId !== table.id);
                                return [
                                  ...other,
                                  { sourceTableId: table.id, columns: cols, targetKey: "uuid" },
                                ];
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={prevStep}
                    className="px-8 py-6 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-100"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => nextStep(2)}
                    disabled={
                      identityRules.filter((r) => r.columns && r.columns.length > 0).length <
                        selectedTables.length || isSubmittingView360
                    }
                    className="bg-gray-900 hover:bg-black text-white px-10 py-6 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all gap-2"
                  >
                    {isSubmittingView360 && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit & Generate Model
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-x-auto">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 flex items-center gap-4">
                      <Merge className="w-8 h-8 text-blue-600" />
                      Attribute Mapping
                    </h3>
                    <p className="text-gray-500 font-medium">
                      Review the 360° structure generated from your source tables.
                    </p>
                  </div>
                </div>

                {/* API Response Data */}
                {!view360Response ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest">
                      Loading 360 Structure...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Success Banner */}
                    <div className="p-5 bg-green-50 border border-green-100 rounded-2xl">
                      <p className="text-xs font-bold text-green-700 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        360 Structure synced successfully — {selectedTables.length} source table(s)
                        submitted
                      </p>
                    </div>

                    {/* Response Content */}
                    {typeof view360Response === "string" ? (
                      <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <p className="text-sm font-bold text-gray-900">{view360Response}</p>
                      </div>
                    ) : typeof view360Response === "object" && view360Response !== null ? (
                      <div className="space-y-4">
                        {/* If the response is an array, render each item as a card */}
                        {Array.isArray(view360Response)
                          ? view360Response.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm"
                              >
                                <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                                  {JSON.stringify(item, null, 2)}
                                </pre>
                              </div>
                            ))
                          : /* If the response is an object, render its keys as cards */
                            Object.entries(view360Response).map(([key, val]: [string, any]) => (
                              <div
                                key={key}
                                className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"
                              >
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                                <div className="pl-4">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    {key.replace(/_/g, " ")}
                                  </p>
                                  {typeof val === "string" ||
                                  typeof val === "number" ||
                                  typeof val === "boolean" ? (
                                    <p className="text-sm font-bold text-gray-900">{String(val)}</p>
                                  ) : Array.isArray(val) ? (
                                    <div className="space-y-2">
                                      {val.map((v: any, i: number) => (
                                        <div key={i} className="p-3 bg-gray-50 rounded-xl">
                                          {typeof v === "object" ? (
                                            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                                              {JSON.stringify(v, null, 2)}
                                            </pre>
                                          ) : (
                                            <p className="text-sm text-gray-700 font-medium">
                                              {String(v)}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words mt-1">
                                      {JSON.stringify(val, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              </div>
                            ))}
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="mt-12 flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={prevStep}
                    className="px-8 py-6 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:text-gray-900"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => nextStep(3)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-6 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all gap-2"
                  >
                    Rules & Finalize
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                    <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                      <ListTree className="w-6 h-6 text-blue-600" />
                      Canonical Model Generation
                    </h3>

                    {view360Response && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl">
                        <p className="text-xs font-bold text-green-700 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          360 Structure synced — {selectedTables.length} source table(s) submitted
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {canonicalFields.map((field, idx) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group"
                        >
                          {field.isPrimaryKey && (
                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                          )}
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <span className="text-xs font-black text-blue-600">{idx + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-gray-900 tracking-tight">
                                {field.name}
                              </h4>
                              {field.isPrimaryKey && (
                                <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                                  Primary Identity
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                              Type: {field.type}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedTables
                              .filter((t) => getMappingFor(field.id, t.id))
                              .map((t) => (
                                <div
                                  key={t.id}
                                  className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-600/20 flex items-center justify-center"
                                  title={t.name}
                                >
                                  <Database className="w-4 h-4 text-blue-600" />
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/60 border border-white/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                      <Settings2 className="w-6 h-6 text-blue-600" />
                      Conflict Rules
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-2xl border border-gray-100">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-3 block">
                          Resolution Method
                        </label>
                        <select className="w-full bg-gray-50 h-11 px-4 rounded-xl border-none font-bold text-sm outline-none">
                          <option>Latest Entry Wins</option>
                          <option>Highest Integrity Source First</option>
                          <option>Manual Review Required</option>
                          <option>Average / Composite</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-blue-600" />
                          <span className="text-xs font-bold text-blue-700">Auto-Validation</span>
                        </div>
                        <div className="w-10 h-6 bg-blue-600 rounded-full relative">
                          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    disabled={isAssembling || !product}
                    onClick={handleAssembleView360}
                    className="w-full py-10 rounded-[2.5rem] bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-black uppercase tracking-[0.25em] shadow-2xl shadow-blue-500/40 hover:scale-[1.02] transition-all duration-500"
                  >
                    {isAssembling ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Assembling...</span>
                      </div>
                    ) : (
                      "Assemble 360° Model"
                    )}
                  </Button>

                  <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] px-4">
                    By clicking above, the system will start the deduplication and golden record
                    generation process.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Profile Bar */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 shadow-sm flex flex-col items-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-1 mb-6 shadow-xl shadow-blue-500/20">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                        {user?.profile_image ? (
                          <img
                            src={user.profile_image}
                            alt={user.full_name || "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-16 h-16 text-blue-600" />
                        )}
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 text-center">
                      {user?.full_name ||
                        `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
                        "User"}
                    </h3>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-black uppercase tracking-[0.15em] mt-2">
                      Verified Golden Record
                    </span>

                    <div className="w-full mt-8 space-y-4">
                      {user?.email && (
                        <div className="flex items-center gap-3 text-sm font-bold text-gray-600 px-2 min-w-0">
                          <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="truncate" title={user.email}>
                            {user.email}
                          </span>
                        </div>
                      )}
                      {user?.roles && user.roles.length > 0 && (
                        <div className="flex items-center gap-3 text-sm font-bold text-gray-600 px-2 min-w-0">
                          <Briefcase className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="truncate">{user.roles.join(", ")}</span>
                        </div>
                      )}
                      {(user as any)?.location &&
                        ((user as any).location.city || (user as any).location.state) && (
                          <div className="flex items-center gap-3 text-sm font-bold text-gray-600 px-2 min-w-0">
                            <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="truncate">
                              {[(user as any).location.city, (user as any).location.state]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                    </div>

                    <div className="w-full border-t border-gray-100/50 mt-8 pt-6">
                      <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                        <span>Sources Merged</span>
                        <span className="text-blue-600">{selectedTables.length}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                          style={{ width: `${Math.min(100, selectedTables.length * 25)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="w-full py-6 rounded-2xl border-blue-100 bg-white/30 hover:bg-white/60 font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 shadow-sm hover:shadow-md transition-all"
                  >
                    Re-Engineer Model
                  </Button>
                </div>

                {/* Main Data Panels */}
                <div className="lg:col-span-3 space-y-8">
                  {/* Stats Strip */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      {
                        label: "Sources Merged",
                        value: String(selectedTables.length),
                        icon: Merge,
                        accent: "from-sky-500/15 to-sky-500/5",
                        iconBg: "bg-sky-500",
                      },
                      {
                        label: "Fields Mapped",
                        value: String(mappings.length),
                        icon: Activity,
                        accent: "from-emerald-500/15 to-emerald-500/5",
                        iconBg: "bg-emerald-500",
                      },
                      {
                        label: "Entity Linkage",
                        value:
                          identityRules.length === selectedTables.length ? "Strict" : "Partial",
                        icon: Fingerprint,
                        accent: "from-amber-500/15 to-amber-500/5",
                        iconBg: "bg-amber-500",
                      },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className={cn(
                          "relative overflow-hidden bg-white/60 backdrop-blur-md border border-white/80 rounded-[2rem] shadow-sm flex items-center gap-5 px-6 py-5",
                          "before:absolute before:inset-0 before:bg-gradient-to-br",
                          `before:${stat.accent}`,
                          "before:opacity-80 before:pointer-events-none"
                        )}
                      >
                        <div className="relative z-10 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center shadow-md">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg",
                                stat.iconBg
                              )}
                            >
                              <stat.icon className="w-4 h-4" />
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">
                              {stat.label}
                            </p>
                            <p className="text-2xl font-black text-gray-900 tracking-tight mt-1">
                              {stat.value}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* View 360 Data Table (wireframe-style) */}
                  <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-gray-900">View 360 Data</h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        Golden Record Ledger
                      </p>
                    </div>
                    {(() => {
                      const usingDemo = demoMode || !view360Response;
                      const liveRows = usingDemo
                        ? mockCustomerRows
                        : normalizeCustomerRows(view360Response);

                      if (!usingDemo && liveRows.length === 0) {
                        return (
                          <div className="border border-dashed border-gray-200 rounded-2xl bg-white/60 p-10 flex flex-col items-center justify-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                              <TableIcon className="w-5 h-5 text-gray-300" />
                            </div>
                            <p className="text-sm font-black text-gray-600">
                              No ledger records present yet
                            </p>
                            <p className="text-xs text-gray-400">
                              Run a migration job to populate the View 360 ledger.
                            </p>
                          </div>
                        );
                      }

                      const allSelected =
                        liveRows.length > 0 && liveRows.every((r) => selectedLedgerRows.has(r.id));

                      const toggleAll = () => {
                        setSelectedLedgerRows((prev) => {
                          if (allSelected) return new Set();
                          return new Set(liveRows.map((r) => r.id));
                        });
                      };

                      const toggleRow = (id: string) => {
                        setSelectedLedgerRows((prev) => {
                          const next = new Set(prev);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        });
                      };

                      return (
                        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                          <Table>
                            <TableHeader className="bg-gray-50/80">
                              <TableRow>
                                <TableHead className="w-10 text-center">
                                  <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={toggleAll}
                                    className="cursor-pointer"
                                  />
                                </TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                                  Record ID
                                </TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                                  Date
                                </TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                                  Type
                                </TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                                  Status
                                </TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 text-right">
                                  Value
                                </TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                                  Notes
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {liveRows.map((row, idx) => {
                                const isSelected = selectedLedgerRows.has(row.id);
                                return (
                                  <TableRow
                                    key={row.id}
                                    className={cn(
                                      "transition-colors cursor-pointer",
                                      idx % 2 === 1 && "bg-gray-50/40",
                                      isSelected && "bg-blue-50/70"
                                    )}
                                    onClick={() => toggleRow(row.id)}
                                  >
                                    <TableCell className="text-center align-middle">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleRow(row.id)}
                                        className="cursor-pointer"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </TableCell>
                                    <TableCell className="text-sm font-bold text-gray-800">
                                      {row.id}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium text-gray-500">
                                      {row.date}
                                    </TableCell>
                                    <TableCell className="text-xs font-black text-gray-700">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-[10px] uppercase tracking-[0.16em]">
                                        {row.type || "Record"}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-xs font-black text-gray-700">
                                      {row.status ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-[0.16em]">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          {row.status}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 text-[10px] uppercase tracking-[0.16em]">
                                          —
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm font-black text-right text-gray-900">
                                      {row.value}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium text-gray-500 max-w-xs truncate">
                                      {row.notes}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Unified attribute explorer + timeline tabs */}
                  <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden space-y-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                        <Sparkles className="w-6 h-6 text-blue-600" />
                        Unified Attributes
                      </h3>
                      <div className="flex gap-2">
                        {selectedTables.map((t, i) => {
                          const colors = [
                            "bg-blue-600",
                            "bg-indigo-600",
                            "bg-red-500",
                            "bg-green-600",
                            "bg-amber-500",
                          ];
                          return (
                            <div
                              key={t.id}
                              className={cn(
                                "w-8 h-8 rounded-full border border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-white font-black",
                                colors[i % colors.length]
                              )}
                              title={t.name}
                            >
                              {t.name.substring(0, 2).toUpperCase()}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {canonicalFields.map((field) => {
                        const fieldMappings = selectedTables
                          .map((t) => {
                            const m = getMappingFor(field.id, t.id);
                            return m ? { table: t, column: m.sourceColumn } : null;
                          })
                          .filter(Boolean);
                        const sourcesCount = fieldMappings.length;
                        const confidence =
                          sourcesCount === selectedTables.length
                            ? "100%"
                            : sourcesCount > 0
                              ? `${Math.round((sourcesCount / selectedTables.length) * 100)}%`
                              : "—";

                        return (
                          <div
                            key={field.id}
                            className="flex items-center justify-between p-5 bg-white rounded-3xl border border-gray-100/50 hover:shadow-md transition-shadow group"
                          >
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                {field.name}
                              </p>
                              <p className="text-sm font-black text-gray-900">
                                {fieldMappings.length > 0
                                  ? fieldMappings
                                      .map((fm: any) => `${fm.table.name}.${fm.column}`)
                                      .join(", ")
                                  : "No mapping"}
                              </p>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                  Coverage
                                </p>
                                <p className="text-xs font-black text-blue-600">{confidence}</p>
                              </div>
                              <div className="flex -space-x-2">
                                {fieldMappings.map((fm: any, j: number) => (
                                  <div
                                    key={j}
                                    className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center"
                                    title={fm.table.name}
                                  >
                                    <Database className="w-3 h-3 text-blue-600" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Activity / Cases / Interaction tabs */}
                    <div className="pt-6 border-t border-gray-100 mt-4">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="inline-flex items-center gap-2 bg-blue-50/40 border border-blue-100 rounded-full px-3 py-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-700">
                            Live Behavior Stream
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {["Recent Activity", "Open Cases", "Last Interaction"].map((label) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setActivityTab(label as typeof activityTab)}
                              className={cn(
                                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.18em] border transition-all shadow-sm cursor-pointer",
                                activityTab === label
                                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-blue-200/80"
                                  : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-blue-50/40 p-5 max-h-72 overflow-hidden">
                        <div className="absolute left-6 top-4 bottom-4 w-px bg-gradient-to-b from-blue-200 via-gray-100 to-transparent pointer-events-none" />

                        {activityTab === "Recent Activity" && (
                          <ul className="space-y-4">
                            {mockRecentActivity.map((item) => (
                              <li
                                key={item.id}
                                className="relative pl-10 flex items-center justify-between text-xs group"
                              >
                                <div className="absolute left-3 w-3 h-3 rounded-full bg-white border-2 border-blue-500 shadow-sm group-hover:border-indigo-500 transition-colors" />
                                <div>
                                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-2 py-1 mb-1">
                                    <Activity className="w-3 h-3 text-blue-500" />
                                    <span className="text-[9px] font-black text-blue-700 uppercase tracking-[0.18em]">
                                      {item.channel}
                                    </span>
                                  </div>
                                  <p className="font-black text-gray-900 leading-snug">
                                    {item.title}
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600">
                                  {item.time}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {activityTab === "Open Cases" && (
                          <ul className="space-y-4">
                            {mockOpenCases.map((c) => (
                              <li
                                key={c.id}
                                className="relative pl-10 flex items-center justify-between text-xs group"
                              >
                                <div className="absolute left-3 w-3 h-3 rounded-full bg-white border-2 border-rose-500 shadow-sm group-hover:border-rose-600 transition-colors" />
                                <div>
                                  <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-2 py-1 mb-1">
                                    <AlertCircle className="w-3 h-3 text-rose-500" />
                                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-[0.18em]">
                                      {c.id}
                                    </span>
                                  </div>
                                  <p className="font-black text-gray-900 leading-snug">
                                    {c.subject}
                                  </p>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">
                                    Owner: {c.owner}
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.18em] border",
                                    c.priority === "High"
                                      ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white border-transparent shadow-sm"
                                      : "bg-amber-50 text-amber-600 border-amber-100"
                                  )}
                                >
                                  {c.priority}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {activityTab === "Last Interaction" && (
                          <div className="relative pl-10 flex items-start justify-between text-xs">
                            <div className="absolute left-3 w-3 h-3 rounded-full bg-white border-2 border-indigo-500 shadow-sm" />
                            <div className="space-y-1 max-w-md">
                              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-2 py-1">
                                <Shapes className="w-3 h-3 text-indigo-600" />
                                <span className="text-[9px] font-black text-indigo-700 uppercase tracking-[0.18em]">
                                  {mockLastInteraction.mode}
                                </span>
                              </div>
                              <p className="font-black text-gray-900 leading-snug">
                                {mockLastInteraction.summary}
                              </p>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">
                                {mockLastInteraction.owner}
                              </p>
                            </div>
                            <div className="text-right space-y-1">
                              <span className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">
                                {mockLastInteraction.date}
                              </span>
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.18em] shadow-sm">
                                {mockLastInteraction.duration}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Footbar */}
                  <div className="flex gap-4">
                    <Button className="flex-1 py-8 rounded-[2rem] bg-gradient-to-r from-gray-900 to-slate-900 hover:from-black hover:to-gray-900 text-white font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all">
                      <ExternalLink className="w-5 h-5" />
                      Export to CRM
                    </Button>
                    <Button className="flex-1 py-8 rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all">
                      <TrendingUp className="w-5 h-5" />
                      Analyze Lineage
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Assembly Progress Modal */}
      <AssemblyProgress isOpen={isAssembling} phase={assemblyPhase} />
    </div>
  );
}
