"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Briefcase,
  Fingerprint,
  Mail,
  Shapes,
  ShieldCheck,
  Globe,
  Zap,
  Phone,
  Link2,
  DollarSign,
  Target,
  Search,
  Filter,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/app/store/userStore";
import { useCompanyProfileStore } from "@/app/store/companyProfileStore";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Axios } from "@/app/config/axios";
import { toast } from "sonner";

// --- Types ---
type ActivityItem = {
  id: string;
  timestamp: string;
  category: "Orders" | "Support" | "Activity" | "Marketing";
  title: string;
  source: string;
  status: "Completed" | "Pending" | "Flagged";
  value?: string;
};

type StatItem = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

// --- Demo Data ---
const DEMO_ACTIVITIES: ActivityItem[] = [
  {
    id: "A-5521",
    timestamp: "Today, 10:42 AM",
    category: "Orders",
    title: "Enterprise License Renewal",
    source: "Salesforce CRM",
    status: "Completed",
    value: "$42,500",
  },
  {
    id: "A-5519",
    timestamp: "Yesterday, 3:15 PM",
    category: "Support",
    title: "Priority Support Ticket #1102",
    source: "Zendesk",
    status: "Flagged",
  },
  {
    id: "A-5512",
    timestamp: "Mar 15, 2025",
    category: "Activity",
    title: "Webinar Attendance: Q2 Roadmap",
    source: "Web Traffic",
    status: "Completed",
  },
  {
    id: "A-5498",
    timestamp: "Mar 12, 2025",
    category: "Marketing",
    title: "Campaign Click: Cloud Solutions",
    source: "HubSpot",
    status: "Pending",
  },
  {
    id: "A-5482",
    timestamp: "Mar 10, 2025",
    category: "Orders",
    title: "Compute Credits Purchase",
    source: "Stripe",
    status: "Completed",
    value: "$1,200",
  },
];

const DEMO_STATS: StatItem[] = [
  { label: "LTV Intelligence", value: "$142,500", icon: DollarSign, color: "bg-emerald-500" },
  { label: "Engagement Score", value: "9.2/10", icon: Zap, color: "bg-amber-500" },
  { label: "Data Lineage", value: "18 Sources", icon: Link2, color: "bg-blue-500" },
];

export default function ThreeSixtyViewPage() {
  const { user } = useUserStore();
  const { companyId } = useCompanyProfileStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"stream" | "attributes" | "ledger">("stream");
  // Demo: start on the company's own (empty) data, not the built-in sample stream.
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [page, setPage] = useState(0);

  // Use catalog data - direct API call (only when not in demo mode)
  const {
    data: catalogData,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["catalog360", isDemoMode, companyId],
    queryFn: async () => {
      try {
        if (!companyId) {
          console.error("No company ID available");
          return [];
          //   throw new Error("Company ID is required");
        }
        console.log("Fetching API data with company_id:", companyId);
        const response = await Axios.get("/data/catalog/", {
          params: { company_id: companyId },
        });
        console.log("API Response received:", response.data);
        return response.data;
      } catch (err) {
        console.error("API Error:", err);
        throw err;
      }
    },
    enabled: !isDemoMode && !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const {
    data: canonicalData,
    isLoading: canonicalLoading,
    error: queryCanonicalError,
    refetch: refetchCanonical,
  } = useQuery({
    queryKey: ["canonical", isDemoMode],
    queryFn: async () => {
      try {
        const response = await Axios.get("/data/view360/list");
        console.log("API Response received:", response.data);
        return (response.data instanceof Array ? response.data : []).filter(
          (item) => !!item.view_360_dataset
        );
      } catch (err) {
        console.error("API Error:", err);
        throw err;
      }
    },
    enabled: !isDemoMode,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const {
    data: goldenData,
    isLoading: goldenLoading,
    error: queryGoldenError,
    refetch: refetchGolden,
  } = useQuery({
    queryKey: ["golden", isDemoMode],
    queryFn: async () => {
      try {
        const response = await Axios.get(
          `/data/view360/golden_records/${activeTab}?page=${page}&limit=10`
        );
        console.log("API Response received:", response.data);
        const responseData = response.data;
        if (responseData.data instanceof Array) {
          try {
            responseData.columns = Object.keys(responseData.data[0]);
          } catch {
            responseData.columns = [];
          }
        }

        return responseData;
      } catch (err) {
        console.error("API Error:", err);
        return [];
        // throw err;
      }
    },
    enabled: !isDemoMode && !!activeTab,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // /golden_records/

  // Refetch when switching from demo to live
  React.useEffect(() => {
    if (!isDemoMode && !isLoading && !catalogData) {
      refetch();
    }
  }, [isDemoMode, catalogData, isLoading, refetch]);

  React.useEffect(() => {
    refetchGolden();
  }, [activeTab, page]);

  // Auto-fallback to demo data after 2 seconds if no real data
  useEffect(() => {
    if (!isDemoMode && isLoading) {
      const timeout = setTimeout(() => {
        // Demo: no fallback to built-in sample data; an empty company stays empty.
        if (!catalogData && !queryError) {
          console.info("360 View: no data yet");
        }
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isDemoMode, isLoading, catalogData, queryError]);

  // Transform API data to match our ActivityItem format
  const transformApiData = (data: any): ActivityItem[] => {
    if (!data) return [];

    // If data has an items property (API response format), use that
    if (data.items && Array.isArray(data.items)) {
      return transformApiData(data.items);
    }

    // If data is already an array of activities, use it directly
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        id: item.id || item.event_id || item.table_name || "Unknown",
        timestamp: item.timestamp || item.created_at || item.time || "N/A",
        category: item.category || item.type || ("Activity" as const),
        title: item.title || item.event || item.name || item.table_name || "Event",
        source: item.source || item.system || "Catalog",
        status: item.status || ("Completed" as const),
        value: item.value || item.amount || undefined,
      }));
    }

    // If data has an activities/events property, use that
    if (data.activities && Array.isArray(data.activities)) {
      return transformApiData(data.activities);
    }

    if (data.events && Array.isArray(data.events)) {
      return transformApiData(data.events);
    }

    return [];
  };

  // Display data based on demo mode
  const displayData = useMemo(() => {
    if (isDemoMode) {
      return DEMO_ACTIVITIES;
    }

    // If there's an error, fall back to demo data
    if (queryError) {
      console.log("API Error, using demo data");
      return DEMO_ACTIVITIES;
    }

    // If we have catalog data, transform and use it (even if empty)
    if (catalogData) {
      const transformed = transformApiData(catalogData);
      console.log("Using API data, transformed items:", transformed.length);
      return transformed;
    }

    // No data and no error, use demo
    console.log("No catalog data available, using demo");
    return DEMO_ACTIVITIES;
  }, [isDemoMode, catalogData, queryError]);

  // Extract stats from API data or use demo stats
  const stats = useMemo(() => {
    if (isDemoMode) {
      return DEMO_STATS;
    }

    // In live mode, only use API stats if available
    if (catalogData?.stats && Array.isArray(catalogData.stats)) {
      return catalogData.stats.map((stat: any) => ({
        label: stat.label || stat.name || "Stat",
        value: stat.value || stat.count || "0",
        icon: stat.icon || DollarSign,
        color: stat.color || "bg-slate-500",
      }));
    }

    // If in live mode but no stats from API, show empty state
    return [];
  }, [isDemoMode, catalogData, queryError]);

  const attributes = [
    { label: "Global Identity ID", value: "UID-882-9910-X", icon: Fingerprint },
    { label: "Lead Segment", value: "Strategic Enterprise", icon: Target },
    { label: "Primary Channel", value: "Direct / Email", icon: Mail },
    { label: "Compliance Tier", value: "GDPR / Level 4", icon: ShieldCheck },
    { label: "Geographic Hub", value: "North America (East)", icon: Globe },
    { label: "Organization", value: "Entrecore Systems Inc.", icon: Briefcase },
  ];

  // Demo: before identity resolution has run there are no unified customer records,
  // so show how they get created instead of a sample profile.
  if (!isDemoMode && !canonicalLoading && Array.isArray(canonicalData) && canonicalData.length === 0) {
    return (
      <div className="min-h-screen w-full bg-slate-50/50 text-slate-900 p-8 md:p-16">
        <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Shapes className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">360 View</h1>
              <p className="text-slate-500 text-lg">Consumer Intelligence Terminal</p>
            </div>
          </div>

          </header>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm px-8 py-20 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-6">
              <Fingerprint className="w-9 h-9 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No unified customer records yet</h2>
            <p className="text-slate-500 max-w-lg mb-8">
              360 View shows one profile per customer, resolved across every connected source. Connect your sources,
              then run the 360 Builder to match and merge customer records into golden records.
            </p>
            <Button asChild className="h-11 px-6 rounded-xl">
              <Link href="/data-room/360-builder">Open the 360 Builder</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50/50 text-slate-900 p-8 md:p-16">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Shapes className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">360 View</h1>
              <p className="text-slate-500 text-lg">Consumer Intelligence Terminal</p>
            </div>
          </div>

          {canonicalData && (
            <div className="flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200">
              {canonicalData.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(0);
                  }}
                  className={cn(
                    "px-10 py-3.5 rounded-xl text-sm font-bold transition-all capitalize",
                    activeTab === tab.id
                      ? "bg-slate-900 text-white shadow-lg"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                  )}
                >
                  {tab.view_360_dataset}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* LEFT PANEL: PROFILE CARD */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="flex flex-col items-center mb-8">
                <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center mb-6 border-4 border-white shadow-inner">
                  {user?.profile_image ? (
                    <img
                      src={user.profile_image}
                      alt="User"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-slate-400" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">
                  {user?.full_name || "Acme Global"}
                </h3>
                <Badge
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-700 text-sm px-4 py-1 hover:bg-emerald-100"
                >
                  Verified Entity
                </Badge>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase font-bold tracking-widest text-slate-400">
                      Email
                    </p>
                    <p className="text-base font-medium text-slate-900 truncate">
                      {user?.email || "contact@acme.corp"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase font-bold tracking-widest text-slate-400">
                      Phone
                    </p>
                    <p className="text-base font-medium text-slate-900">+1 (855) 392-0012</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-500">Confidence Score</span>
                  <span className="text-base font-bold text-emerald-600">99.4%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "99.4%" }} />
                </div>
              </div>
            </div>

            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 py-8 text-lg font-semibold rounded-2xl">
              Generate Full Report
            </Button>
          </div>

          {/* RIGHT PANEL: MAIN DATA AREA */}
          <div className="lg:col-span-3 space-y-8">
            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.length > 0 ? (
                stats.map((stat: StatItem, i: number) => (
                  <div
                    key={i}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center text-white",
                          stat.color
                        )}
                      >
                        <stat.icon className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
                        <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : !isDemoMode ? (
                <div className="col-span-1 md:col-span-3 bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
                  <p className="text-slate-500 text-lg">No stats data available from the API.</p>
                </div>
              ) : null}
            </div> */}
            {activeTab && !isDemoMode && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  {!isDemoMode && (goldenData?.data ?? []).length === 0 && !isLoading ? (
                    <div className="p-12 text-center">
                      <p className="text-slate-500 text-lg">
                        No activities found from the API. This is real data - the API returned an
                        empty result.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                          {(goldenData?.columns instanceof Array ? goldenData?.columns : []).map(
                            (item: string, idx: number) => (
                              <TableHead
                                key={`TH${idx}`}
                                className="py-4 text-sm font-semibold text-slate-500"
                              >
                                {item}
                              </TableHead>
                            )
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10">
                              Loading...
                            </TableCell>
                          </TableRow>
                        ) : (
                          (goldenData?.data instanceof Array ? goldenData?.data : []).map(
                            (dt: any) => (
                              <TableRow
                                key={`TC${dt.golden_id}`}
                                className="border-b border-slate-50 hover:bg-slate-50"
                              >
                                {(goldenData?.columns instanceof Array
                                  ? goldenData?.columns
                                  : []
                                ).map((item: string, idx: number) => {
                                  console.log({ dt, item });
                                  return (
                                    <TableCell
                                      key={`TH${dt.golden_id}${idx}`}
                                      className="py-5 text-base font-semibold text-slate-900"
                                    >
                                      {dt[item]}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            )
                          )
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}
            {activeTab === "stream" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-slate-900">Activity Stream</h3>
                    <Badge
                      variant={isDemoMode ? "secondary" : "default"}
                      className={cn(
                        isDemoMode ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      )}
                    >
                      {isDemoMode ? "Demo Data" : "Live Data"}
                    </Badge>
                    {isLoading && !isDemoMode && (
                      <Badge className="bg-blue-500 text-white animate-pulse">Loading API...</Badge>
                    )}
                    {queryError && !isDemoMode && (
                      <Badge className="bg-red-500 text-white">API Error</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant={isDemoMode ? "default" : "outline"}
                      size="lg"
                      className={cn(
                        "rounded-xl px-6",
                        isDemoMode && "bg-amber-500 hover:bg-amber-600 text-white"
                      )}
                      onClick={() => setIsDemoMode(!isDemoMode)}
                    >
                      {isDemoMode ? "Switch to Live Data" : "Switch to Demo Data"}
                    </Button>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        className="pl-12 w-80 py-6 text-base rounded-xl"
                        placeholder="Search activities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" size="lg" className="rounded-xl px-6">
                      <Filter className="w-5 h-5 mr-2" />
                      Filters
                    </Button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  {!isDemoMode && displayData.length === 0 && !isLoading ? (
                    <div className="p-12 text-center">
                      <p className="text-slate-500 text-lg">
                        No activities found from the API. This is real data - the API returned an
                        empty result.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                          <TableHead className="py-4 text-sm font-semibold text-slate-500">
                            Event ID
                          </TableHead>
                          <TableHead className="py-4 text-sm font-semibold text-slate-500">
                            Time
                          </TableHead>
                          <TableHead className="py-4 text-sm font-semibold text-slate-500">
                            Category
                          </TableHead>
                          <TableHead className="py-4 text-sm font-semibold text-slate-500">
                            Event
                          </TableHead>
                          <TableHead className="py-4 text-sm font-semibold text-slate-500">
                            Source
                          </TableHead>
                          <TableHead className="py-4 text-sm font-semibold text-slate-500 text-right">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10">
                              Loading...
                            </TableCell>
                          </TableRow>
                        ) : (
                          displayData.map((act: any) => (
                            <TableRow
                              key={act.id || act.table_name}
                              className="border-b border-slate-50 hover:bg-slate-50"
                            >
                              <TableCell className="py-5 text-base font-semibold text-slate-900">
                                {act.id || act.table_name}
                              </TableCell>
                              <TableCell className="py-5 text-base text-slate-600">
                                {act.timestamp || "N/A"}
                              </TableCell>
                              <TableCell className="py-5">
                                <Badge variant="secondary" className="text-sm px-3 py-1">
                                  {act.category || "Data"}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-5">
                                <div className="space-y-1">
                                  <p className="text-base font-semibold text-slate-900">
                                    {act.title || act.table_name}
                                  </p>
                                  {act.value && (
                                    <p className="text-sm font-medium text-emerald-600">
                                      {act.value}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-5 text-base text-slate-600">
                                {act.source || "Catalog"}
                              </TableCell>
                              <TableCell className="py-5 text-right">
                                <div
                                  className={cn(
                                    "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold",
                                    act.status === "Completed" || !act.status
                                      ? "bg-green-50 text-green-800"
                                      : act.status === "Flagged"
                                        ? "bg-red-50 text-red-800"
                                        : "bg-yellow-50 text-yellow-800"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "w-2 h-2 rounded-full",
                                      act.status === "Completed" || !act.status
                                        ? "bg-green-500"
                                        : act.status === "Flagged"
                                          ? "bg-red-500"
                                          : "bg-yellow-500"
                                    )}
                                  />
                                  {act.status || "Active"}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}

            {activeTab === "attributes" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {attributes.map((attr, i) => (
                  <div
                    key={i}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <attr.icon className="w-7 h-7 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-500">{attr.label}</p>
                        <p className="text-base font-bold text-slate-900">{attr.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-10">
                  <div>
                    <div className="text-sm font-semibold text-slate-500">Ensemble Model</div>
                    <div className="text-lg font-bold text-slate-900 flex items-center gap-3">
                      V3.2 Neural Resolver
                      <Badge variant="outline" className="text-xs">
                        Active
                      </Badge>
                    </div>
                  </div>
                  <div className="h-12 w-px bg-slate-200" />
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Last Sync</p>
                    <p className="text-lg font-bold text-slate-900">2 minutes ago</p>
                  </div>
                </div>

                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 cursor-pointer rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600"
                      title={`Source ${i}`}
                      onClick={() => setPage(i - 1)}
                    >
                      {i}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
