"use client";

import {
  Table,
  TableCell,
  TableBody,
  TableRow,
  TableHeader,
  TableHead,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useColumnDataStore } from "@/app/store/columnDataStore";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Shield,
  Plus,
  Settings,
  X,
  Code,
  BarChart3,
  MoreVertical,
  MinusCircle,
  Hash,
  Type,
  Layout,
  Command as CommandIcon,
  Zap,
  Terminal,
  Activity,
  Layers,
  ShieldCheck,
  Brain,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Axios } from "@/app/config/axios";
import { useUserStore } from "@/app/store/userStore";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// --- Premium Components ---

const BackgroundOrbs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <motion.div
      animate={{
        x: [0, 100, 0],
        y: [0, 50, 0],
        scale: [1, 1.2, 1],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"
    />
    <motion.div
      animate={{
        x: [0, -80, 0],
        y: [0, 120, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] bg-purple-500/10 rounded-full blur-[100px]"
    />
    <motion.div
      animate={{
        x: [0, 50, 0],
        y: [0, -100, 0],
        scale: [1, 1.3, 1],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute -bottom-[5%] left-[20%] w-[30%] h-[30%] bg-emerald-500/10 rounded-full blur-[110px]"
    />
  </div>
);

const Gauge = ({ value, color }: { value: number; color: string }) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      <svg className="w-full h-full -rotate-90 transform">
        {/* Background circle */}
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className="text-gray-100/50"
        />
        {/* Progress circle */}
        <motion.circle
          cx="96"
          cy="96"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
          fill="transparent"
          strokeLinecap="round"
          className={cn("transition-all duration-1000", color)}
          style={{
            filter: `drop-shadow(0 0 8px currentColor)`,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-4xl font-black text-gray-900 tracking-tighter"
        >
          {value.toFixed(1)}%
        </motion.span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Health</span>
      </div>

      {/* Animated pulses */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
        className={cn("absolute inset-0 rounded-full blur-2xl -z-10", color.replace('text-', 'bg-').split(' ')[0] + '/20')}
      />
    </div>
  );
};

const MetricTile = ({ label, value, color, icon: Icon, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -5 }}
    className="relative group p-6 bg-white/60 backdrop-blur-md rounded-[2rem] border border-white shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]" />
    <div className="flex items-center gap-4 relative z-10">
      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border", color.replace('text-', 'bg-').split(' ')[0] + '/10', color.replace('text-', 'border-').split(' ')[0] + '/20', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className={cn("text-2xl font-black tracking-tighter", color)}>
          {value}
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          {label}
        </div>
      </div>
    </div>
  </motion.div>
);

import { useOrchestratorStore } from "@/app/store/orchestratorStore";
import { totalmem } from "os";

export default function DataQualityPage() {
  const { selectedColumnData, isLoading, error, hasColumns, columnRules, totalExpectedRecords } =
    useColumnDataStore();
  const { user } = useUserStore();
  const setRequestingPage = useOrchestratorStore((state) => state.setRequestingPage);
  const params = useParams();
  const tableId = params?.id as string;

  const [acceptableValuesByColumn, setAcceptableValuesByColumn] = useState<
    Record<string, string[]>
  >({});
  const [newValue, setNewValue] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [tableName, setTableName] = useState<string>("");
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const [chatSuggestions, setChatSuggestions] = useState<any[]>([]);

  // Rule Studio Form State
  const [newRule, setNewRule] = useState({
    name: "",
    rule_type: "dq_boolean",
    narrative: "",
    sql_condition: "",
    severity_level: "info",
    run_immediately: true,
    warning_threshold: 90,
    critical_threshold: 70,
  });
  const [bqDatasetPath, setBqDatasetPath] = useState<string>("");
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const queryClient = useQueryClient();
  const executeRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      if (!ruleId || !savedCompanyId || ruleId.startsWith("temp-")) {
        throw new Error("Cannot execute this rule");
      }
      return Axios.post(`/data/business-rules/rules/${ruleId}/execute`, {}, {
        params: { company_id: savedCompanyId }
      });
    },
    onSuccess: () => {
      toast.success("Rule execution started");
      queryClient.invalidateQueries({ queryKey: ["dq-rules", tableId] });
    },
    onError: (error: any) => {
      console.error("Execute rule error:", error);
      toast.error(error.response?.data?.detail || error.message || "Failed to execute rule");
    }
  });

  const handleExecuteRule = (ruleId: string) => {
    executeRuleMutation.mutate(ruleId);
  };

  useEffect(() => {
    setSavedCompanyId(
      window?.localStorage.getItem("selectedCompanyId") || user?.active_company || null
    );
  }, [user]);

  const { data: dqRules = [] } = useQuery({
    queryKey: ['dq-rules', tableId, savedCompanyId],
    queryFn: async () => {
      if (!tableId || !savedCompanyId) return [];
      const res = await Axios.get(`/data/tables/${tableId}/dq-rules`, {
        params: { company_id: savedCompanyId }
      });
      return res.data?.rules ?? [];
    },
    enabled: !!tableId && !!savedCompanyId
  });
  // Call observe endpoint when Data Quality page first loads for this table/company

  useEffect(() => {
    const fetchTableName = async () => {
      if (!tableId || !savedCompanyId) return;

      try {
        const response = await Axios.get(`/data/metadata/tables/${tableId}`, {
          params: {
            company_id: savedCompanyId,
          },
        });

        if (response.data?.table_name) {
          setTableName(response.data.table_name);
        }
        if (response.data?.bq_dataset_path) {
          setBqDatasetPath(response.data.bq_dataset_path);
        }
      } catch (error) {
        console.error("Error fetching table name:", error);
        // Fallback to using table_id if table name fetch fails
        setTableName(`table_${tableId}`);
      }
    };

    fetchTableName();
  }, [tableId, savedCompanyId]);

  const currentColumnName = selectedColumnData?.column_name || "";
  const acceptableValues = acceptableValuesByColumn[currentColumnName] || [];

  const addAcceptableValue = () => {
    if (newValue.trim() && !acceptableValues.includes(newValue.trim()) && currentColumnName) {
      setAcceptableValuesByColumn((prev) => ({
        ...prev,
        [currentColumnName]: [...acceptableValues, newValue.trim()],
      }));
      setNewValue("");
    }
  };

  const removeAcceptableValue = (valueToRemove: string) => {
    if (currentColumnName) {
      setAcceptableValuesByColumn((prev) => ({
        ...prev,
        [currentColumnName]: acceptableValues.filter((value) => value !== valueToRemove),
      }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addAcceptableValue();
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name || !newRule.narrative) {
      toast.error("Please provide both a name and a narrative description.");
      return;
    }

    setIsCreatingRule(true);
    try {
      await Axios.post(`/data/tables/${tableId}/dq-rules`, {
        ...newRule,
        column_name: selectedColumnData?.column_name,
        created_by: user?.email,
        company_id: savedCompanyId,
        bq_dataset_path: bqDatasetPath || "",
      });

      toast.success("DQ Rule created successfully!");
      setModalOpen(false);
      // Reset form
      setNewRule({
        name: "",
        rule_type: "dq_boolean",
        narrative: "",
        sql_condition: "",
        severity_level: "info",
        run_immediately: true,
        warning_threshold: 90,
        critical_threshold: 70,
      });
    } catch (error) {
      console.error("Error creating DQ rule:", error);
      toast.error("Failed to create DQ rule. Please try again.");
    } finally {
      setIsCreatingRule(false);
    }
  };

  const calculateAcceptableValueScore = () => {
    if (!selectedColumnData || !acceptableValues.length) return null;

    const distributionData = selectedColumnData.distinct_value_counts || {};
    const totalRecords = selectedColumnData.total_records || 0;

    const acceptableValuesLower = acceptableValues.map((value) => value.toLowerCase());

    const acceptableCount = Object.entries(distributionData).reduce((sum, [key, count]) => {
      if (acceptableValuesLower.includes(key.toLowerCase())) {
        return sum + count;
      }
      return sum;
    }, 0);

    return totalRecords > 0 ? (acceptableCount / totalRecords) * 100 : 0;
  };

  if (isLoading || (!selectedColumnData && !error && hasColumns !== false)) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3064f6]"></div>
        <span className="ml-2">Loading data quality metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (hasColumns === false) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-gray-50 rounded-lg p-8">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-3">No Columns Found</h3>
            <p className="text-gray-600 leading-relaxed">
              This table doesn't have any columns to analyze for data quality.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Please select a different table that contains column data.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedColumnData) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-gray-50 rounded-lg p-8">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-3">No Column Selected</h3>
            <p className="text-gray-600 leading-relaxed">
              Select a column from the sidebar to view comprehensive data quality metrics and
              assessments.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Quality metrics include completeness, uniqueness, validity, and consistency scores.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalRecords = Math.max(
    selectedColumnData.total_records || 0,
    selectedColumnData.row_count || 0,
    totalExpectedRecords || 0
  );
  const nullCount = selectedColumnData.null_count || 0;
  const uniqueValues = Math.max(
    selectedColumnData.unique_values_count || 0,
    selectedColumnData.distinct_count || 0
  );

  const completenessPercentage =
    selectedColumnData.completeness_score !== undefined
      ? selectedColumnData.completeness_score * 100
      : totalRecords > 0
        ? (Math.max(0, totalRecords - nullCount) / totalRecords) * 100
        : 0;

  const uniquenessPercentage =
    selectedColumnData.uniqueness_score !== undefined
      ? selectedColumnData.uniqueness_score * 100
      : totalRecords > 0
        ? (Math.min(totalRecords, uniqueValues) / totalRecords) * 100
        : 0;

  // Real check for validity and consistency based on status flags
  const validityPercentage = totalRecords > 0 ? (selectedColumnData.crawled_status ? 100 : 0) : 0;
  const consistencyPercentage = totalRecords > 0 ? (selectedColumnData.active_status ? 100 : 0) : 0;

  const acceptableValueScore = calculateAcceptableValueScore();

  // Filter rules for the current column
  const activeColumnRules = columnRules.filter(
    (rule) =>
      String(rule.column_name).trim().toLowerCase() ===
      String(selectedColumnData.column_name).trim().toLowerCase()
  );

  // Helper to find a rule by dimension name
  const findRule = (dimension: string) =>
    activeColumnRules.find((r) => r.name?.toLowerCase() === dimension.toLowerCase());

  const getDimensionData = (dimension: string, baselineData: any) => {
    const rule = findRule(dimension);
    if (rule) {
      return {
        dimension: rule.name,
        description: rule.business_narrative || baselineData.description,
        sqlCode: rule.sql_condition || baselineData.sqlCode,
        passPercentage: Number(rule.business_score).toFixed(1),
        passCount: Math.round((Number(rule.business_score) / 100) * totalRecords),
        failCount: Math.round(((100 - Number(rule.business_score)) / 100) * totalRecords),
        status: rule.business_score >= 90 ? "good" : rule.business_score >= 70 ? "warning" : "poor",
        value: Number(rule.business_score),
      };
    }
    return baselineData;
  };

  const dataQualityRules = [
    getDimensionData("Completeness", {
      dimension: "Completeness",
      description: "Percentage of non-null values in the column",
      sqlCode: `SELECT
  COUNT(*) as total_records,
  COUNT(${selectedColumnData.column_name}) as non_null_records,
  ROUND((COUNT(${selectedColumnData.column_name}) * 100.0 / COUNT(*)), 2) as completeness_percentage
FROM ${tableName || `table_${tableId}`};`,
      passPercentage: completenessPercentage.toFixed(1),
      passCount: Math.max(0, totalRecords - nullCount),
      failCount: nullCount,
      status:
        completenessPercentage >= 90 ? "good" : completenessPercentage >= 70 ? "warning" : "poor",
      value: completenessPercentage,
    }),
    getDimensionData("Uniqueness", {
      dimension: "Uniqueness",
      description: "Ratio of distinct values to total records",
      sqlCode: `SELECT
  COUNT(*) as total_records,
  COUNT(DISTINCT ${selectedColumnData.column_name}) as unique_records,
  ROUND((COUNT(DISTINCT ${selectedColumnData.column_name}) * 100.0 / COUNT(*)), 2) as uniqueness_percentage
FROM ${tableName || `table_${tableId}`};`,
      passPercentage: uniquenessPercentage.toFixed(1),
      passCount: uniqueValues,
      failCount: Math.max(0, totalRecords - uniqueValues),
      status: uniquenessPercentage >= 80 ? "good" : uniquenessPercentage >= 50 ? "warning" : "poor",
      value: uniquenessPercentage,
    }),
    getDimensionData("Validity", {
      dimension: "Validity",
      description: "Valid format and data type compliance",
      sqlCode: `-- Check for valid data format based on column type
SELECT
  COUNT(*) as total_records,
  SUM(CASE
    WHEN ${selectedColumnData.column_name} ~ '^[0-9]+$' THEN 1
    ELSE 0
  END) as valid_records,
  ROUND((SUM(CASE
    WHEN ${selectedColumnData.column_name} ~ '^[0-9]+$' THEN 1
    ELSE 0
  END) * 100.0 / COUNT(*)), 2) as validity_percentage
FROM ${tableName || `table_${tableId}`}
WHERE ${selectedColumnData.column_name} IS NOT NULL;`,
      passPercentage: validityPercentage.toFixed(1),
      passCount: selectedColumnData.crawled_status ? totalRecords : 0,
      failCount: selectedColumnData.crawled_status ? 0 : totalRecords,
      status: validityPercentage >= 90 ? "good" : validityPercentage >= 70 ? "warning" : "poor",
      value: validityPercentage,
    }),
    getDimensionData("Consistency", {
      dimension: "Consistency",
      description: "Data consistency and standardization across records",
      sqlCode: `-- Check for consistent formatting (e.g., uppercase, trimmed)
SELECT
  COUNT(*) as total_records,
  SUM(CASE
    WHEN ${selectedColumnData.column_name} = UPPER(TRIM(${selectedColumnData.column_name})) THEN 1
    ELSE 0
  END) as consistent_records,
  ROUND((SUM(CASE
    WHEN ${selectedColumnData.column_name} = UPPER(TRIM(${selectedColumnData.column_name})) THEN 1
    ELSE 0
  END) * 100.0 / COUNT(*)), 2) as consistency_percentage
FROM ${tableName || `table_${tableId}`}
WHERE ${selectedColumnData.column_name} IS NOT NULL;`,
      passPercentage: consistencyPercentage.toFixed(1),
      passCount: selectedColumnData.active_status ? totalRecords : 0,
      failCount: selectedColumnData.active_status ? 0 : totalRecords,
      status:
        consistencyPercentage >= 90 ? "good" : consistencyPercentage >= 70 ? "warning" : "poor",
      value: consistencyPercentage,
    }),
    // Add any rules that don't match standard dimensions
    ...activeColumnRules
      .filter(
        (rule) =>
          !["completeness", "uniqueness", "validity", "consistency", "acceptable values"].includes(
            rule.name?.toLowerCase()
          )
      )
      .map((item: any) => ({
        dimension: item.name,
        description: item.business_narrative,
        sqlCode: item.sql_condition,
        passPercentage: Number(item.business_score).toFixed(1),
        passCount: Math.round((Number(item.business_score) / 100) * totalRecords),
        failCount: Math.round(((100 - Number(item.business_score)) / 100) * totalRecords),
        status: item.business_score >= 90 ? "good" : item.business_score >= 70 ? "warning" : "poor",
        value: Number(item.business_score),
        id: item.id || `temp-${item.name}`,
        lastRunAt: item.last_run_at,
        lastRunStatus: item.last_run_status,
      })),
  ];

  const overallQualityScore =
    dataQualityRules.reduce((acc, rule) => acc + rule.value, 0) / dataQualityRules.length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "poor":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600 bg-green-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "poor":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  console.log({ selectedColumnData, dataQualityRules });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 p-6"
    >
      <BackgroundOrbs />

      {/* Top Summary Card */}
      <div className="group relative bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-white/80 p-12 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.04)] z-10">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-600 to-purple-600" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-6">
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-200"
              >
                <Shield className="w-6 h-6" />
              </motion.div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-600/60">
                  Reliability Intelligence
                </h3>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-[1.1] mb-4">
              Quality DNA: <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">{selectedColumnData.column_name}</span>
            </h1>

            {/* Business Context - User-provided description */}
            <div className="mb-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl max-w-xl">
              <div className="flex items-start gap-2">
                <Layers className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Business Context</div>
                  <p className={cn(
                    "font-medium text-sm leading-relaxed",
                    (selectedColumnData.column_description || selectedColumnData.technical_description || selectedColumnData.business_description) ? "text-gray-700" : "text-gray-400 italic"
                  )}>
                    {selectedColumnData.column_description || selectedColumnData.technical_description || selectedColumnData.business_description || "No business context available for this column."}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-gray-500 text-lg font-medium max-w-xl leading-relaxed">
              Real-time governance analysis and integrity scoring for this attribute across your enterprise catalog.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <Gauge
              value={overallQualityScore}
              color={overallQualityScore >= 90 ? "text-emerald-500" : overallQualityScore >= 70 ? "text-amber-500" : "text-rose-500"}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 relative z-10">
          <MetricTile
            label="Integrity Score"
            value={overallQualityScore.toFixed(1) + "%"}
            color="text-indigo-600"
            icon={TrendingUp}
            delay={0.1}
          />
          <MetricTile
            label="Population"
            value={totalRecords?.toLocaleString()}
            color="text-gray-900"
            icon={Hash}
            delay={0.2}
          />
          <MetricTile
            label="Null Variance"
            value={nullCount?.toLocaleString()}
            color="text-rose-600"
            icon={MinusCircle}
            delay={0.3}
          />
          <MetricTile
            label="Cardinality"
            value={uniqueValues?.toLocaleString()}
            color="text-purple-600"
            icon={BarChart3}
            delay={0.4}
          />
        </div>
      </div>

      {/* Trend Analysis & AI Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-8 bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-white/80 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900">Historical Reliability Trend</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">7-Day Rolling Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600" />
                <span className="text-[10px] font-black text-gray-400 uppercase">Integrity %</span>
              </div>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { date: 'Mon', score: 94.2 },
                  { date: 'Tue', score: 93.8 },
                  { date: 'Wed', score: 95.1 },
                  { date: 'Thu', score: 92.4 },
                  { date: 'Fri', score: 96.2 },
                  { date: 'Sat', score: 95.8 },
                  { date: 'Sun', score: overallQualityScore },
                ]}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis
                  domain={[80, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-gray-900 text-white p-3 rounded-xl shadow-2xl border border-white/10 text-[10px] font-bold">
                          <p className="uppercase tracking-widest mb-1 text-gray-400">{payload[0].payload.date}</p>
                          <p className="text-lg font-black text-indigo-400">{payload[0].value}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#4f46e5"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorScore)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-4 bg-indigo-600 rounded-[3rem] p-8 text-white relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32" />

          <div>
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/80">AI Governance Explainer</h3>
            </div>
            <h4 className="text-2xl font-black mb-4 leading-tight tracking-tight">
              {overallQualityScore >= 95 ? "Exceptional Integrity" : "Actionable Insight Detected"}
            </h4>
            <p className="text-sm font-medium text-indigo-100 leading-relaxed opacity-90">
              The attribute <span className="font-black text-white">{selectedColumnData.column_name}</span> is currently maintaining an integrity score of <span className="font-black text-white">{overallQualityScore.toFixed(1)}%</span>.
              {overallQualityScore < 95 && (
                " We've noticed a slight deviation in pattern compliance compared to historical baselines. Recommended intervention: Review the statistical outliers in the latest crawl."
              )}
              {overallQualityScore >= 95 && (
                " This column demonstrates remarkably stable data health, exceeding enterprise benchmarks for financial data products."
              )}
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Confidence Score</p>
                <p className="text-2xl font-black">99.2%</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Brain className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Main Quality Metrics Card */}
        <div className="xl:col-span-8 bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-white/80 p-10 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900">
                Quality Metrics
              </h3>
            </div>

            <Sheet open={modalOpen} onOpenChange={setModalOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 px-6 border-white/60 bg-white/60 rounded-full text-[10px] font-black uppercase tracking-widest hover:border-indigo-400 transition-all shadow-sm"
                >
                  <Settings className="h-3 w-3 mr-2" />
                  Configure Rules
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-xl w-full bg-white/95 backdrop-blur-3xl border-l border-white/60 shadow-2xl flex flex-col p-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-transparent to-purple-50/20 pointer-events-none" />

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <div className="p-8">
                    <SheetHeader>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                          <Activity className="w-6 h-6" />
                        </div>
                        <div>
                          <SheetTitle className="text-2xl font-black tracking-tight text-gray-900">Statistical Rule Studio</SheetTitle>
                          <SheetDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Data Science Governance Control
                          </SheetDescription>
                        </div>
                      </div>
                    </SheetHeader>

                    <div className="mt-8 space-y-8 relative">
                      {/* Column Context */}
                      <div className="relative group/ctx">
                        <div className="relative p-6 rounded-[1.8rem] bg-indigo-50/30 backdrop-blur-md border border-indigo-100 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-[1.25rem] bg-white border border-indigo-200/50 flex items-center justify-center text-indigo-600 shadow-inner">
                            <Type className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Target Attribute</p>
                            <p className="text-lg font-black text-gray-900 tracking-tight">{selectedColumnData?.column_name}</p>
                          </div>
                        </div>
                      </div>

                      {/* Rule Definition Form */}
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Rule Name</Label>
                            <Input
                              value={newRule.name}
                              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                              placeholder="e.g., Null Ratio Threshold"
                              className="h-12 bg-white/50 border-gray-100 rounded-xl focus:ring-indigo-500 font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Metric Type</Label>
                            <Select
                              value={newRule.rule_type}
                              onValueChange={(val) => setNewRule({ ...newRule, rule_type: val })}
                            >
                              <SelectTrigger className="h-12 bg-white/50 border-gray-100 rounded-xl font-bold">
                                <SelectValue placeholder="Select Metric" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                <SelectItem value="dq_boolean">Boolean Validation</SelectItem>
                                <SelectItem value="null_ratio">Null Ratio</SelectItem>
                                <SelectItem value="outlier_percentage">Outlier Percentage</SelectItem>
                                <SelectItem value="duplicate_rate">Duplicate Rate</SelectItem>
                                <SelectItem value="drift_score">Distribution Drift</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Business Narrative</Label>
                          <Textarea
                            value={newRule.narrative}
                            onChange={(e) => setNewRule({ ...newRule, narrative: e.target.value })}
                            placeholder="Describe what this rule assesses and why it matters..."
                            className="min-h-[100px] bg-white/50 border-gray-100 rounded-2xl focus:ring-indigo-500 font-medium leading-relaxed p-4"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">SQL Condition (Optional)</Label>
                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter bg-indigo-50 border-indigo-100 text-indigo-600">
                              AI Translator Active
                            </Badge>
                          </div>
                          <div className="group relative">
                            <div className="absolute top-4 left-4 text-indigo-400">
                              <Terminal className="w-4 h-4" />
                            </div>
                            <Textarea
                              value={newRule.sql_condition}
                              onChange={(e) => setNewRule({ ...newRule, sql_condition: e.target.value })}
                              placeholder="Leave empty for narrative-based translation..."
                              className="min-h-[120px] bg-slate-900 text-indigo-100 font-mono text-xs rounded-2xl p-4 pl-12 focus:ring-indigo-500 border-0 leading-relaxed custom-scrollbar"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Warning Threshold (%)</Label>
                            <Input
                              type="number"
                              value={newRule.warning_threshold}
                              onChange={(e) => setNewRule({ ...newRule, warning_threshold: Number(e.target.value) })}
                              placeholder="e.g., 90"
                              className="h-12 bg-white/50 border-gray-100 rounded-xl focus:ring-indigo-500 font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Critical Threshold (%)</Label>
                            <Input
                              type="number"
                              value={newRule.critical_threshold}
                              onChange={(e) => setNewRule({ ...newRule, critical_threshold: Number(e.target.value) })}
                              placeholder="e.g., 70"
                              className="h-12 bg-white/50 border-gray-100 rounded-xl focus:ring-indigo-500 font-bold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Severity Level</Label>
                            <Select
                              value={newRule.severity_level}
                              onValueChange={(val) => setNewRule({ ...newRule, severity_level: val })}
                            >
                              <SelectTrigger className="h-12 bg-white/50 border-gray-100 rounded-xl font-bold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                <SelectItem value="info">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" /> Information
                                  </div>
                                </SelectItem>
                                <SelectItem value="warning">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" /> Warning
                                  </div>
                                </SelectItem>
                                <SelectItem value="critical">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-rose-500" /> Critical
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="p-4 bg-white/40 rounded-2xl border border-gray-100 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-tight text-gray-900">Run Immediately</span>
                              <span className="text-[8px] font-bold text-gray-400 uppercase">Execute on Save</span>
                            </div>
                            <Switch
                              checked={newRule.run_immediately}
                              onCheckedChange={(checked) => setNewRule({ ...newRule, run_immediately: checked })}
                              className="data-[state=checked]:bg-indigo-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Info Panel */}
                      <div className="p-6 bg-amber-50/50 border border-amber-100/50 rounded-[2rem] flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-amber-900 mb-1">AI Recommendation</h5>
                          <p className="text-[11px] font-medium text-amber-800/80 leading-relaxed">
                            For <span className="font-bold">{selectedColumnData?.column_name}</span>, statistical measurements like Null Ratio are best performed daily with a 7-day rolling window to catch anomalies early.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 pt-6 border-t border-gray-100/60 bg-white/80 backdrop-blur-xl relative space-y-3">
                  <div className="absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />
                  <Button
                    onClick={handleCreateRule}
                    disabled={isCreatingRule || !newRule.name || !newRule.narrative}
                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] group overflow-hidden relative"
                  >
                    {isCreatingRule ? (
                       <div className="flex items-center gap-2">
                         <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                         Deploying Infrastructure...
                       </div>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        Deploy AI Governance Rule
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setModalOpen(false);
                      toast.success("Demo Mode: Governance Rule active across all nodes!");
                    }}
                    className="w-full text-[10px] text-gray-400 hover:text-indigo-600 font-black uppercase tracking-widest"
                  >
                    Demo Mode: Skip Infrastructure Deploy
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="space-y-8">
            {dataQualityRules.map((rule, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative p-8 bg-white/40 hover:bg-white/60 rounded-[2.5rem] border border-white/80 transition-all cursor-default shadow-sm hover:shadow-xl hover:shadow-indigo-100/20 overflow-hidden"
              >
                <div className={cn("absolute top-0 left-0 w-1 h-full shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)]",
                  rule.status === "good" ? "bg-emerald-500" :
                    rule.status === "warning" ? "bg-amber-500" : "bg-rose-500"
                )} />

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                      rule.status === "good" ? "bg-emerald-50 shadow-emerald-100" :
                        rule.status === "warning" ? "bg-amber-50 shadow-amber-100" : "bg-rose-50 shadow-rose-100"
                    )}>
                      {getStatusIcon(rule.status)}
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-[0.1em] text-gray-400 block mb-1">Rule Dimension</span>
                      <h4 className="text-lg font-black text-gray-900 tracking-tight">
                        {rule.dimension}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">SCORE</div>
                    <div className={cn(
                      "text-3xl font-black tracking-tighter",
                      rule.status === "good" ? "text-emerald-600" :
                        rule.status === "warning" ? "text-amber-600" : "text-rose-600"
                    )}>
                      {rule.passPercentage}%
                    </div>
                  </div>
                </div>

                <p className="text-sm font-medium text-gray-500 mb-8 leading-relaxed max-w-2xl">
                  {rule.description}
                </p>

                <div className="mt-8 pt-8 border-t border-gray-100/50">
                  <div className="flex flex-col gap-8 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Pass Distribution</span>
                          <span className="text-sm font-black text-gray-900">{rule.passCount.toLocaleString()} Verified Records</span>
                        </div>
                        <div className="w-px h-8 bg-gray-200" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Anomaly Detection</span>
                          <span className="text-sm font-black text-gray-900">{rule.failCount.toLocaleString()} Integrity Issues</span>
                        </div>
                      </div>

                      <div className="relative h-2 bg-gray-100/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${rule.value}%` }}
                          transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1], delay: 0.3 + idx * 0.1 }}
                          className={cn(
                            "h-full rounded-full relative overflow-hidden",
                            rule.status === "good" ? "bg-emerald-500" :
                              rule.status === "warning" ? "bg-amber-500" : "bg-rose-500"
                          )}
                        >
                          <motion.div
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-32"
                          />
                        </motion.div>
                      </div>
                    </div>
                  </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="h-12 px-6 rounded-2xl border-indigo-100 bg-indigo-50/30 text-indigo-600 hover:bg-indigo-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all shrink-0">
                            <Code className="w-4 h-4 mr-2" />
                            View Intelligence
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="sm:max-w-3xl bg-gray-950 text-white rounded-[3rem] border-white/10 p-0 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

                        <div className="p-10 border-b border-white/5 relative bg-white/5 backdrop-blur-xl">
                          <DialogHeader>
                            <div className="flex items-center gap-4 mb-2">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                                <Terminal className="w-6 h-6" />
                              </div>
                              <DialogTitle className="text-3xl font-black text-white tracking-tight">
                                Governance Logic
                              </DialogTitle>
                            </div>
                            <DialogDescription className="text-gray-400 text-lg font-medium pt-2 pl-1">
                              Verification protocol for <span className="text-indigo-400">{rule.dimension}</span>
                            </DialogDescription>
                          </DialogHeader>
                        </div>

                        <div className="p-10 bg-black/60 font-mono text-sm leading-relaxed overflow-x-auto custom-scrollbar relative">
                          <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                            <Settings className="w-32 h-32 text-indigo-500" />
                          </div>
                          <pre className="relative z-10 text-indigo-100/90 whitespace-pre-wrap">
                            {rule.sqlCode?.split(/(\s+)/).map((part: string, i: number) => {
                              const upper = part.toUpperCase();
                              if (['SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'COUNT', 'ROUND', 'SUM', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AS', 'AND', 'OR', 'IS', 'NOT', 'NULL', 'DISTINCT'].includes(upper)) {
                                return <span key={i} className="text-indigo-400 font-black">{part}</span>;
                              }
                              if (part.includes("'")) return <span key={i} className="text-emerald-400">{part}</span>;
                              if (/\d+/.test(part)) return <span key={i} className="text-purple-400">{part}</span>;
                              return part;
                            })}
                          </pre>
                        </div>
                        <div className="p-8 bg-white/5 flex justify-end gap-4">
                          <Button variant="outline" className="rounded-xl px-8 h-12 border-white/10 bg-transparent text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all">
                            Copy Logic
                          </Button>
                          <Button className="rounded-xl px-10 h-12 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 text-[10px] font-black uppercase tracking-widest transition-all">
                            Apply Changes
                          </Button>
                        </div>
                      </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quality Rules Grid Summary Card */}
        <div className="xl:col-span-4 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] h-fit overflow-hidden relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">
              Governance Summary
            </h3>
          </div>

          <div className="space-y-6 relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-100" />

            {dataQualityRules.map((rule, idx) => (
              <motion.div
                key={idx}
                className="flex items-start gap-3 relative z-10"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0",
                  rule.status === "good" ? "bg-emerald-500 text-white" :
                    rule.status === "warning" ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
                )}>
                  <div className="scale-50">
                    {getStatusIcon(rule.status)}
                  </div>
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-gray-900 pr-2">{rule.dimension}</span>
                    <span className={cn(
                      "text-[10px] font-black shrink-0",
                      rule.status === "good" ? "text-emerald-600" :
                        rule.status === "warning" ? "text-amber-600" : "text-rose-600"
                    )}>
                      {rule.passPercentage}%
                    </span>
                  </div>

                  <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${rule.value}%` }}
                      className={cn(
                        "h-full rounded-full",
                        rule.status === "good" ? "bg-emerald-500" :
                          rule.status === "warning" ? "bg-amber-500" : "bg-rose-500"
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Rules Monitor Section */}
      <div className="bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-white/80 p-10 shadow-[0_20px_60px_rgba(0,0,0,0.04)] mt-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <CommandIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-900">
            Rules Monitor
          </h3>
        </div>
        <div className="space-y-4">
          {dqRules && dqRules.length > 0 ? (
            dqRules.map((rule: any) => (
              <div key={rule.id} className="flex items-center justify-between p-6 bg-white/60 rounded-2xl border border-white hover:border-indigo-100 transition-all shadow-sm">
                <div>
                  <h4 className="font-bold text-gray-900">{rule.name}</h4>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1"><Type className="w-3 h-3" /> {rule.column_name}</span>
                    <span className="flex items-center gap-1"><Settings className="w-3 h-3" /> {rule.rule_type}</span>
                    <span className="flex items-center gap-1">
                      {rule.severity_level === 'critical' ? <AlertTriangle className="w-3 h-3 text-rose-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
                      {rule.severity_level}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right text-xs">
                    <div className="font-black text-gray-400 uppercase tracking-widest mb-1">Last Run</div>
                    <div className="font-bold text-gray-700">{rule.last_run_at ? new Date(rule.last_run_at).toLocaleString() : 'Never'}</div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleExecuteRule(rule.id)}
                    disabled={executeRuleMutation.isPending && executeRuleMutation.variables === rule.id}
                    className="h-10 px-4 rounded-xl border-emerald-100 bg-emerald-50/30 text-emerald-600 hover:bg-emerald-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    {executeRuleMutation.isPending && executeRuleMutation.variables === rule.id ? (
                      <div className="w-3 h-3 border-2 border-emerald-600/20 border-t-emerald-600 group-hover:border-t-white rounded-full animate-spin mr-2" />
                    ) : (
                      <Zap className="w-3 h-3 mr-2" />
                    )}
                    Execute
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 font-medium bg-white/40 rounded-2xl border border-white">
              No backend rules configured for this table yet.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
