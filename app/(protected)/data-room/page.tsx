"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Book,
  BookOpenText,
  Briefcase,
  Building2,
  File,
  Globe,
  History,
  Landmark,
  Lightbulb,
  Plus,
  Scale,
  ShoppingBag,
  SquareUserRound,
  Users,
  Wrench,
  ChevronRight,
  Database,
  Search,
  LayoutGrid,
  Shapes,
  Workflow,
  Sparkles,
  Network,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Zap,
  Layers,
  Fingerprint
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useDataCountsStore } from "@/app/store/dataCountsStore";
import { useUserStore } from "@/app/store/userStore";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import { useColumnDataStore } from "@/app/store/columnDataStore";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Axios } from "@/app/config/axios";



const DataRoomPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname() ?? "";
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const { clearSelectedColumnData } = useColumnDataStore();
  const { user } = useUserStore();
  const {
    refreshAllCounts, resetCounts,
    companyDocuments, knowledgeGraph, catalog, companyDocumentsLastUpdated,
    knowledgeGraphLastUpdated, catalogLastUpdated
  } = useDataCountsStore();

  const router = useRouter();

  // Demo: "Active Sources" counts the company's configured connectors (was a hard-coded "18 Handlers").
  const { data: connectorConfigs } = useQuery({
    queryKey: ["connector-configs", savedCompanyId],
    queryFn: async () => (await Axios.get(`/data/connectors/company/${savedCompanyId}/configs`)).data,
    enabled: Boolean(savedCompanyId),
  });
  const handlerCount = Array.isArray(connectorConfigs) ? connectorConfigs.length : 0;

  useEffect(() => {
    if (!pathname.includes("/table")) {
      clearSelectedColumnData();
      localStorage.removeItem("column-data-storage");
    }
  }, [pathname]);

  useEffect(() => {
    const updateCompanyId = () => {
      setSavedCompanyId(localStorage.getItem("selectedCompanyId") || user?.active_company || null);
    };
    updateCompanyId();
    window.addEventListener("storage", updateCompanyId);
    window.addEventListener("localStorageChange", updateCompanyId);
    return () => {
      window.removeEventListener("storage", updateCompanyId);
      window.removeEventListener("localStorageChange", updateCompanyId);
    };
  }, [user]);

  useEffect(() => {
    if (savedCompanyId) {
      setIsLoading(true);
      resetCounts();
      refreshAllCounts(savedCompanyId).finally(() => setIsLoading(false));
    }
  }, [savedCompanyId, refreshAllCounts, resetCounts]);

  const defaultDataRooms = [
    {
      id: 1,
      name: "Neural Assets",
      count: isLoading ? "Indexing..." : `${companyDocuments} items synced`,
      icon: <File className="w-8 h-8" />,
      link: "/data-room/company-documents",
      lastUpdated: companyDocumentsLastUpdated,
      color: "from-blue-600 to-blue-400",
      description: "Enterprise source documents and compliance assets."
    },
    {
      id: 5,
      name: "Knowledge Graph",
      count: isLoading ? "Mapping..." : `${knowledgeGraph} entities`,
      icon: <Book className="w-8 h-8" />,
      link: "/data-room/knowledge-graph",
      lastUpdated: knowledgeGraphLastUpdated,
      color: "from-indigo-600 to-indigo-400",
      description: "Visual semantic engine for cross-domain knowledge mapping."
    },
    {
      id: 6,
      name: "Data Catalog",
      count: isLoading ? "Scanning..." : `${catalog} tables discovered`,
      icon: <BookOpenText className="w-8 h-8" />,
      link: "/data-room/catalog",
      lastUpdated: catalogLastUpdated,
      color: "from-cyan-600 to-cyan-400",
      description: "Universal index of physical and logical data structures."
    },
    {
      id: 7,
      name: "Data Lineage",
      icon: <Workflow className="w-8 h-8" />,
      link: "/data-room/lineage",
      color: "from-emerald-600 to-emerald-400",
      count: "System Visualizer",
      description: "Trace data flow and heritage across the enterprise stack."
    },
    {
      id: 11,
      name: "360 Builder",
      icon: <Shapes className="w-8 h-8" />,
      link: "/data-room/360-builder",
      count: "Identify & Resolve",
      color: "from-purple-600 to-violet-400",
      isSpecial: true,
      description: "Engineer unified golden records and identity rules."
    },
    {
      id: 13,
      name: "360 Consumer",
      icon: <Cpu className="w-8 h-8" />,
      link: "/data-room/360-view",
      count: "Sift Intelligence",
      color: "from-orange-600 to-amber-400",
      isSpecial: true,
      description: "Access and analyze unified customer records."
    },
    {
      id: 12,
      name: "Workflow Engine",
      icon: <Zap className="w-8 h-8" />,
      link: "/data-room/workflows",
      count: "Neural Automations",
      color: "from-rose-600 to-pink-400",
      description: "Design and trigger data-driven enterprise workflows."
    },
    {
      id: 14,
      name: "Data Integration",
      icon: <Network className="w-8 h-8" />,
      link: "/data-room/integrations",
      count: "Pipelines Active",
      color: "from-blue-700 to-indigo-500",
      description: "Orchestrate, map, and schedule data pipelines."
    },

  ];

  const allRooms = defaultDataRooms;

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full overflow-hidden p-6 md:p-12 lg:p-16">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#fafbff]">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-indigo-600/5 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10 max-w-screen-2xl mx-auto space-y-16">
        {/* Superior Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-5"
            >
              <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <LayoutGrid className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight uppercase">Intelligence Hub</h1>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Universal Enterprise Control Center</p>
                </div>
              </div>
            </motion.div>
            <p className="max-w-xl text-base font-medium text-slate-500 leading-relaxed pl-1">
              Orchestrate your enterprise data strategy across <span className="text-blue-600 font-semibold">Neural Assets</span>,
              <span className="text-indigo-600 font-semibold"> Semantic Mapping</span>, and
              <span className="text-purple-600 font-semibold"> 360 Entity Resolution</span>.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/40 backdrop-blur-3xl border border-white/60 p-4 rounded-[2rem] shadow-sm">
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-2xl border-4 border-white bg-blue-50/50 flex items-center justify-center shadow-sm">
                  <Database className="w-4 h-4 text-blue-400" />
                </div>
              ))}
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Sources</p>
              <p className="text-sm font-black text-blue-600 leading-none">{handlerCount} {handlerCount === 1 ? "Handler" : "Handlers"}</p>
            </div>
          </div>
        </header>

        {/* Dynamic Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {allRooms.map((room: any, i) => {
              const isAction = room.isAction;
              const isSpecial = room.isSpecial;

              return (
                <motion.div
                  key={room.id || i}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  onClick={() => router.push(room.link)}
                  className={cn(
                    "group relative p-8 h-80 rounded-[3rem] border transition-all duration-500 cursor-pointer overflow-hidden flex flex-col justify-between",
                    isAction
                      ? "bg-[#0F172A] border-white/10 text-white shadow-2xl shadow-black/50 hover:bg-black"
                      : "bg-white/40 backdrop-blur-3xl border-white/60 shadow-[0_40px_80px_rgba(0,0,0,0.1)] hover:shadow-[0_50px_120px_rgba(37,99,235,0.15)] hover:bg-white/80"
                  )}
                >
                  {/* Card Glow Effect */}
                  <div className={cn(
                    "absolute -top-20 -right-20 w-48 h-48 blur-[80px] rounded-full opacity-10 transition-opacity duration-1000 group-hover:opacity-30",
                    `bg-gradient-to-br ${room.color}`
                  )} />

                  <div className="flex items-start justify-between relative z-10">
                    <div className={cn(
                      "w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl transition-all duration-700 rotate-3 group-hover:rotate-0 group-hover:scale-110",
                      isAction ? "bg-white/10 border border-white/5" : `bg-white border border-slate-100 text-blue-600`
                    )}>
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-inner",
                        `bg-gradient-to-br ${room.color}`
                      )}>
                        {room.icon}
                      </div>
                    </div>

                    {!isAction && room.lastUpdated && (
                      <Tooltip count={room.lastUpdated} />
                    )}
                    {isSpecial && (
                      <div className="px-3 py-1 bg-blue-600 text-[8px] font-black uppercase tracking-widest text-white rounded-lg shadow-lg">Specialist</div>
                    )}
                  </div>

                  <div className="relative z-10 space-y-1">
                    <h3 className={cn(
                      "text-xl font-bold uppercase tracking-tight flex items-center justify-between",
                      isAction ? "text-white" : "text-gray-900 group-hover:text-blue-600 transition-colors"
                    )}>
                      {room.name}
                      <ArrowUpRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                    </h3>
                    <p className="text-[10px] font-medium text-slate-500 line-clamp-2 leading-relaxed h-10">{room.description}</p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/5 relative z-10 flex items-center justify-between">
                    <span className={cn(
                      "text-[9px] font-semibold uppercase tracking-[0.2em]",
                      isAction ? "text-slate-500" : "text-blue-600/60"
                    )}>
                      {room.count}
                    </span>
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-transform group-hover:translate-x-1",
                      isAction ? "text-white/20" : "text-gray-300"
                    )} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
};

const Tooltip = ({ count }: { count: string }) => (
  <div className="flex flex-col items-end">
    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Index State</span>
    <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] font-black text-blue-600 uppercase">
      {formatTimeAgo(count)}
    </div>
  </div>
);

export default DataRoomPage;
