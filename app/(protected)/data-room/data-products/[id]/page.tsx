"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Boxes,
    LayoutGrid,
    FileText,
    Table as TableIcon,
    ShieldCheck,
    GitBranch,
    BookOpen,
    Send,
    ChevronLeft,
    Search,
    Plus,
    ArrowRight,
    Database,
    Info,
    ExternalLink,
    Sparkles,
    CheckCircle2,
    Clock,
    AlertCircle,
    MoreHorizontal,
    Zap,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Axios } from "@/app/config/axios";
import { useUserStore } from "@/app/store/userStore";
import { toast } from "sonner";

// --- Types ---
type Asset = {
    id: string;
    name: string;
    connector: string;
    description?: string;
    owner?: string;
    tags?: string[];
    quality_score?: number;
    last_updated?: string;
    columns?: string[];
};

export default function DataProductWorkspace() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { user } = useUserStore();
    const companyId = user?.active_company;

    const [activeTab, setActiveTab] = useState("overview");
    const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [productName, setProductName] = useState(id === "new" ? "" : "Customer 360 Unified");
    const [productDescription, setProductDescription] = useState(id === "new" ? "" : "A unified view of customer interactions across all digital touchpoints. This product aggregates data from Salesforce, Zendesk, and Google Analytics to provide a holistic customer profile for the Marketing department.");
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isEnriching, setIsEnriching] = useState(false);
    const [aiProgress, setAiProgress] = useState(0);

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(r => setTimeout(r, 1500));
        setIsSaving(false);
        toast.success("Draft saved successfully");
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        await new Promise(r => setTimeout(r, 2000));
        setIsPublishing(false);
        toast.success("Data Products published to Entrecore Mesh!");
        router.push("/data-room/data-products");
    };

    const handleAIEnrichment = async () => {
        setIsEnriching(true);
        setAiProgress(0);
        const interval = setInterval(() => {
            setAiProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 10;
            });
        }, 300);

        await new Promise(r => setTimeout(r, 3500));
        setIsEnriching(false);
        toast.success("AI Enrichment complete! Descriptions and PII tags updated.");
    };
    // --- Fetch Catalog ---
    const { data: catalogData, isLoading: isLoadingCatalog } = useQuery({
        queryKey: ["catalog", companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const response = await Axios.get("/data/catalog/", {
                params: { company_id: companyId },
            });
            if (Array.isArray(response.data)) return response.data;
            if (response.data?.items) return response.data.items;
            return [];
        },
        enabled: !!companyId,
    });

    const availableAssets = useMemo(() => {
        return (catalogData || []).map((t: any) => ({
            id: t.table_id || t.id,
            name: t.name,
            connector: t.connector,
            description: t.description || "No description provided.",
            owner: t.owner || "Enterprise Data Admin",
            tags: t.tags || ["Internal", "Verified"],
            quality_score: t.quality_score || 92,
            last_updated: t.last_updated || "2 days ago",
            columns: t.columns || [],
        }));
    }, [catalogData]);

    const filteredAssets = availableAssets.filter((a: Asset) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.connector.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --- Handlers ---
    const toggleAssetSelection = (asset: Asset) => {
        setSelectedAssets((prev) => {
            const isSelected = prev.find((a) => a.id === asset.id);
            if (isSelected) {
                toast.info(`Removed ${asset.name}`);
                return prev.filter((a) => a.id !== asset.id);
            } else {
                toast.success(`Added ${asset.name}`);
                return [...prev, asset];
            }
        });
    };

    return (
        <div className="relative min-h-[calc(100vh-80px)] w-full bg-[#FAFBFF] overflow-hidden">
            {/* Background blobs */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-indigo-400/5 blur-[100px] rounded-full" />
            </div>

            <div className="relative z-10 flex flex-col h-[calc(100vh-80px)]">
                {/* Workspace Toolbar */}
                <div className="flex items-center justify-between px-8 py-4 border-b border-white/60 bg-white/40 backdrop-blur-md">
                    <div className="flex items-center gap-6">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/data-room/data-products")}
                            className="w-10 h-10 rounded-full hover:bg-white hover:shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <div className="h-8 w-px bg-gray-200" />
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Boxes className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black tracking-tight text-gray-900 leading-none">
                                    {id === "new" ? "Create New Data Products" : "Customer 360 Unified"}
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[9px] font-black uppercase tracking-widest px-2 py-0">Draft</Badge>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">v1.2.0 • Last saved 2m ago</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            className="h-10 px-6 rounded-xl border-white/60 bg-white/60 font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "Save Draft"}
                        </Button>
                        <Button
                            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 font-black uppercase tracking-widest text-[10px] gap-2 disabled:opacity-50"
                            onClick={handlePublish}
                            disabled={isPublishing}
                        >
                            {isPublishing ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send className="w-3.5 h-3.5" />
                            )}
                            {isPublishing ? "Publishing..." : "Publish"}
                        </Button>
                    </div>
                </div>

                {/* Workspace Tabs */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <div className="px-8 bg-white/20">
                            <TabsList className="h-14 bg-transparent border-b border-white/40 w-full justify-start gap-8 rounded-none p-0">
                                {[
                                    { id: "overview", label: "Overview", icon: LayoutGrid },
                                    { id: "assets", label: "Assets", icon: Database },
                                    { id: "schema", label: "Schema", icon: FileText },
                                    { id: "quality", label: "Quality", icon: ShieldCheck },
                                    { id: "lineage", label: "Lineage", icon: GitBranch },
                                    { id: "docs", label: "Documentation", icon: BookOpen },
                                    { id: "publish", label: "Publishing", icon: Send },
                                ].map((tab) => (
                                    <TabsTrigger
                                        key={tab.id}
                                        value={tab.id}
                                        className={cn(
                                            "relative h-14 bg-transparent border-none rounded-none px-2 font-black uppercase tracking-[0.15em] text-[10px] transition-all duration-300",
                                            "data-[state=active]:text-blue-600 data-[state=active]:shadow-none data-[state=inactive]:text-gray-400",
                                            "hover:text-blue-500"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <tab.icon className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                                            {tab.label}
                                        </div>
                                        {activeTab === tab.id && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-blue-600"
                                            />
                                        )}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <AnimatePresence mode="wait">
                                <TabsContent value="overview" className="m-0 focus-visible:outline-none">
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                                    >
                                        <div className="lg:col-span-2 space-y-8">
                                            {/* Description Component */}
                                            <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-10 shadow-sm">
                                                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                                    <Info className="w-6 h-6 text-blue-600" />
                                                    General Information
                                                </h3>
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Product Name</label>
                                                        <Input
                                                            value={productName}
                                                            onChange={(e) => setProductName(e.target.value)}
                                                            className="h-14 px-6 rounded-2xl border-white/80 bg-white/60 text-lg font-bold focus:bg-white transition-all shadow-inner"
                                                            placeholder="Enter data products name..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Purpose & Description</label>
                                                        <textarea
                                                            value={productDescription}
                                                            onChange={(e) => setProductDescription(e.target.value)}
                                                            className="w-full min-h-[150px] p-6 rounded-[2rem] border-white/80 bg-white/60 font-medium text-gray-600 focus:bg-white transition-all outline-none leading-relaxed shadow-inner"
                                                            placeholder="Describe what these data products achieve..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* AI Enrichment Preview */}
                                            <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
                                                <Sparkles className="absolute top-[-20px] right-[-20px] w-64 h-64 text-white/5 rotate-12 group-hover:scale-110 transition-transform duration-1000" />
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-4 mb-8">
                                                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                                                            <Sparkles className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-black tracking-tight">AI Metadata Generation</h3>
                                                            <p className="text-blue-100/60 font-medium mt-0.5 tracking-wide uppercase text-[10px]">Autopiloting Productivity</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-blue-50/80 font-medium leading-relaxed mb-8">
                                                        Select assets to allow the AI to automatically group columns, suggest business terms, and classify sensitive data (PII).
                                                    </p>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {[
                                                            { count: "128", label: "Tagged Fields" },
                                                            { count: "12", label: "Classified PII" },
                                                            { count: "8", label: "Glossary Links" },
                                                            { count: "100%", label: "Accuracy" }
                                                        ].map((s, idx) => (
                                                            <div key={idx} className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                                                <div className="text-2xl font-black mb-1">{s.count}</div>
                                                                <div className="text-[9px] font-black uppercase tracking-widest opacity-60">{s.label}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="bg-white/60 border border-white/80 rounded-[2.5rem] p-8 shadow-sm">
                                                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                    Publishing Checklist
                                                </h3>
                                                <div className="space-y-4">
                                                    {[
                                                        { label: "Assets Selected", status: selectedAssets.length > 0 ? "complete" : "incomplete", val: `${selectedAssets.length} Assets` },
                                                        { label: "Schema Defined", status: "partial", val: "85%" },
                                                        { label: "SLAs Configured", status: "incomplete", val: "Missing" },
                                                        { label: "Owner Assigned", status: "complete", val: user?.full_name || "Marketing Admin" },
                                                    ].map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/60">
                                                            <div>
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                                                                <p className="text-xs font-bold text-gray-900">{item.val}</p>
                                                            </div>
                                                            <div className={cn(
                                                                "w-6 h-6 rounded-full flex items-center justify-center",
                                                                item.status === "complete" ? "bg-green-100 text-green-600" :
                                                                    item.status === "partial" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                                                            )}>
                                                                {item.status === "complete" ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <Button
                                                onClick={() => setActiveTab("assets")}
                                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl group transition-all"
                                            >
                                                Start Assembly
                                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                </TabsContent>

                                <TabsContent value="assets" className="m-0 focus-visible:outline-none">
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-[600px]"
                                    >
                                        {/* Catalog Explorer */}
                                        <div className="lg:col-span-8 space-y-6">
                                            <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 shadow-sm flex flex-col h-full">
                                                <div className="flex items-center justify-between mb-8">
                                                    <div>
                                                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                                            <Search className="w-6 h-6 text-blue-600" />
                                                            Catalog Assets
                                                        </h3>
                                                        <p className="text-sm text-gray-500 font-medium mt-1">Browse and select data resources to bundle</p>
                                                    </div>
                                                    <div className="relative">
                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <Input
                                                            placeholder="Search catalog..."
                                                            className="pl-11 pr-4 h-12 rounded-xl border-white/80 bg-white/60 w-64 focus:bg-white transition-all"
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                {isLoadingCatalog ? (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                                                        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                                                        <p className="font-black uppercase tracking-widest text-[10px]">Updating Catalog...</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                                                        {filteredAssets.map((asset: Asset) => {
                                                            const isSelected = selectedAssets.some(a => a.id === asset.id);
                                                            return (
                                                                <motion.div
                                                                    layout
                                                                    key={asset.id}
                                                                    onClick={() => toggleAssetSelection(asset)}
                                                                    className={cn(
                                                                        "p-6 rounded-[2rem] border transition-all duration-300 cursor-pointer group flex flex-col justify-between",
                                                                        isSelected
                                                                            ? "bg-blue-600 border-blue-500 shadow-xl shadow-blue-500/20 text-white"
                                                                            : "bg-white border-white/60 hover:border-blue-200 hover:shadow-lg text-gray-900"
                                                                    )}
                                                                >
                                                                    <div>
                                                                        <div className="flex items-start justify-between mb-4">
                                                                            <div className={cn(
                                                                                "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner",
                                                                                isSelected ? "bg-white/20" : "bg-blue-50 text-blue-600"
                                                                            )}>
                                                                                <TableIcon className="w-6 h-6" />
                                                                            </div>
                                                                            <div className={cn(
                                                                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter",
                                                                                isSelected ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
                                                                            )}>
                                                                                Score: {asset.quality_score}%
                                                                            </div>
                                                                        </div>
                                                                        <h4 className="font-black tracking-tight mb-1 truncate">{asset.name}</h4>
                                                                        <p className={cn("text-[10px] uppercase font-black tracking-widest mb-3", isSelected ? "text-white/60" : "text-blue-600/60")}>
                                                                            {asset.connector}
                                                                        </p>
                                                                        <p className={cn("text-[11px] font-medium line-clamp-2 leading-relaxed h-8 mb-4", isSelected ? "text-white/80" : "text-gray-500")}>
                                                                            {asset.description}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                                                                        <div className="flex -space-x-1.5 overflow-hidden">
                                                                            {asset.tags?.slice(0, 2).map((tag: string, i: number) => (
                                                                                <div key={i} className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest", isSelected ? "bg-white/10 text-white" : "bg-gray-100 text-gray-500")}>
                                                                                    {tag}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <div className={cn(
                                                                            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                                                            isSelected ? "bg-white text-blue-600" : "bg-blue-600 text-white opacity-0 group-hover:opacity-100"
                                                                        )}>
                                                                            {isSelected ? <CheckCircle2 className="w-5 h-5 font-black" /> : <Plus className="w-5 h-5 font-black" />}
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Selected Assets Panel */}
                                        <div className="lg:col-span-4 space-y-6">
                                            <div className="bg-white/60 border border-white/80 rounded-[2.5rem] p-8 shadow-sm flex flex-col h-full">
                                                <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center justify-between">
                                                    <span className="flex items-center gap-3">
                                                        <Boxes className="w-6 h-6 text-indigo-600" />
                                                        Product Assets
                                                    </span>
                                                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none font-black px-3 py-1 text-[10px]">{selectedAssets.length}</Badge>
                                                </h3>

                                                <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                                                    {selectedAssets.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 opacity-50">
                                                            <Plus className="w-12 h-12 mb-4 stroke-[1px]" />
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Add assets from the catalog</p>
                                                        </div>
                                                    ) : (
                                                        selectedAssets.map((asset) => (
                                                            <div key={asset.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                                        <TableIcon className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-sm font-black text-gray-900 leading-none mb-1">{asset.name}</h4>
                                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{asset.columns?.length || 0} Columns</span>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => toggleAssetSelection(asset)}
                                                                    className="w-8 h-8 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50"
                                                                >
                                                                    <AlertCircle className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                <div className="mt-8 pt-8 border-t border-gray-100">
                                                    <Button
                                                        disabled={selectedAssets.length === 0}
                                                        onClick={() => setActiveTab("schema")}
                                                        className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl group transition-all"
                                                    >
                                                        Define Logic
                                                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </TabsContent>

                                {/* Other tabs placeholder */}
                                <TabsContent value="schema" className="m-0 focus-visible:outline-none">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className="space-y-8"
                                    >
                                        {selectedAssets.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-40 bg-white/40 border border-dashed border-gray-200 rounded-[3rem]">
                                                <Database className="w-20 h-20 text-blue-200 mb-6" />
                                                <h3 className="text-2xl font-black text-gray-900 mb-2">No Assets Selected</h3>
                                                <p className="text-gray-500 max-w-sm text-center font-medium">Please add assets in the "Assets" tab to begin modeling your schema.</p>
                                                <Button variant="outline" className="mt-8 rounded-xl border-blue-600 text-blue-600 font-bold" onClick={() => setActiveTab("assets")}>Go to Assets</Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                                            <FileText className="w-7 h-7 text-blue-600" />
                                                            Attribute Modeler
                                                        </h3>
                                                        <p className="text-sm text-gray-500 font-medium mt-1">Enrich columns with descriptions, tags, and AI-generated metadata</p>
                                                    </div>
                                                    <Button
                                                        onClick={handleAIEnrichment}
                                                        disabled={isEnriching}
                                                        className="h-12 px-6 bg-gradient-to-tr from-blue-600 to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/20 font-black uppercase tracking-widest text-[10px] gap-2 group disabled:opacity-50"
                                                    >
                                                        {isEnriching ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                Processing {aiProgress}%
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                                                Run AI Enrichment
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>

                                                <div className="grid grid-cols-1 gap-6">
                                                    {selectedAssets.map((asset) => (
                                                        <div key={asset.id} className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] overflow-hidden shadow-sm">
                                                            <div className="p-6 bg-white/60 border-b border-gray-100 flex items-center justify-between">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                                                        <TableIcon className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-black text-gray-900">{asset.name}</h4>
                                                                        <span className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest">{asset.connector}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0.5 text-[9px] font-black">Verified</Badge>
                                                                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full"><MoreHorizontal className="w-4 h-4" /></Button>
                                                                </div>
                                                            </div>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left">
                                                                    <thead>
                                                                        <tr className="border-b border-gray-100/50">
                                                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/4">Column</th>
                                                                            <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/6">Type</th>
                                                                            <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-1/3">Description</th>
                                                                            <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Metadata</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {(asset.columns || ["id", "email", "created_at", "total_spend"]).map((col, i) => (
                                                                            <tr key={i} className="group border-b border-gray-50/50 hover:bg-blue-50/20 transition-colors">
                                                                                <td className="px-8 py-6">
                                                                                    <div className="flex items-center gap-3">
                                                                                        {col === "id" && <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />}
                                                                                        <span className="font-bold text-gray-900 text-sm">{col}</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-6">
                                                                                    <Badge variant="outline" className="rounded-md border-gray-200 text-gray-500 font-bold text-[9px] uppercase tracking-tighter">
                                                                                        {col.includes("at") ? "TIMESTAMP" : col === "id" ? "UUID" : col.includes("spend") ? "DECIMAL" : "STRING"}
                                                                                    </Badge>
                                                                                </td>
                                                                                <td className="px-4 py-6">
                                                                                    <Input
                                                                                        defaultValue={col === "email" ? "Primary contact email address for the customer." : ""}
                                                                                        placeholder="Add description..."
                                                                                        className="h-10 px-3 rounded-lg border-transparent hover:border-blue-200 bg-transparent hover:bg-white focus:bg-white transition-all text-xs"
                                                                                    />
                                                                                </td>
                                                                                <td className="px-4 py-6">
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        {col === "email" && (
                                                                                            <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-none text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 flex items-center gap-1">
                                                                                                <AlertCircle className="w-2.5 h-2.5" /> PII
                                                                                            </Badge>
                                                                                        )}
                                                                                        <Button variant="ghost" size="icon" className="w-6 h-6 rounded-md border border-dashed border-gray-200 text-gray-400 flex items-center justify-center">
                                                                                            <Plus className="w-3 h-3" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </TabsContent>

                                <TabsContent value="quality" className="m-0 focus-visible:outline-none">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                                    >
                                        <div className="lg:col-span-2 space-y-8">
                                            <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-10 shadow-sm">
                                                <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                                                    <ShieldCheck className="w-6 h-6 text-green-600" />
                                                    Data Quality Contract
                                                </h3>

                                                <div className="space-y-8">
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Expected Freshness</label>
                                                            <select className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-white/60 font-bold text-sm outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer">
                                                                <option>Within 15 Minutes</option>
                                                                <option>Hourly</option>
                                                                <option>Daily (8:00 AM UTC)</option>
                                                                <option>Real-time (Stream)</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Quality Threshold</label>
                                                            <div className="flex items-center gap-4">
                                                                <Input defaultValue="95" className="h-12 px-4 rounded-xl border-gray-100 bg-white/60 font-bold text-center w-24" />
                                                                <span className="font-black text-gray-900">% Integrity</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 pt-4">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Validation Rules</label>
                                                        {[
                                                            { rule: "Column 'email' must match regex pattern", severity: "High" },
                                                            { rule: "Primary Key 'id' must be unique and non-null", severity: "Critical" },
                                                            { rule: "Financial columns should not contain negative values", severity: "Medium" }
                                                        ].map((rule, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-gray-100 shadow-sm group hover:border-blue-200 transition-all">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-blue-600">
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="text-sm font-bold text-gray-900">{rule.rule}</span>
                                                                </div>
                                                                <Badge className={cn(
                                                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                                                    rule.severity === "Critical" ? "bg-red-100 text-red-700" :
                                                                        rule.severity === "High" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                                                )}>{rule.severity}</Badge>
                                                            </div>
                                                        ))}
                                                        <Button
                                                            variant="ghost"
                                                            className="w-full h-14 rounded-2xl border border-dashed border-gray-200 text-gray-400 font-bold hover:bg-blue-50 hover:text-blue-600 transition-all gap-2"
                                                            onClick={async () => {
                                                                const rule = window.prompt("Enter custom validation rule:");
                                                                if (rule) {
                                                                    toast.loading("Adding validation rule...", { duration: 1000 });
                                                                    await new Promise(r => setTimeout(r, 1000));
                                                                    toast.success(`Rule "${rule}" successfully added to contract`);
                                                                }
                                                            }}
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                            Add Custom Validation Rule
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-green-500/20">
                                                <Zap className="w-10 h-10 mb-6 text-white/40" />
                                                <h3 className="text-xl font-black mb-4 tracking-tight">Contract Validation</h3>
                                                <p className="text-green-50/80 font-medium text-sm leading-relaxed mb-8">
                                                    This contract will be enforced at the consumption layer. Downstream users will be alerted if the data products violate any of these clauses.
                                                </p>
                                                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                                        <CheckCircle2 className="w-5 h-5 text-white" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Model is Compatible</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </TabsContent>
                                <TabsContent value="lineage" className="m-0 focus-visible:outline-none">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="h-full min-h-[600px] bg-white/40 backdrop-blur-xl border border-white/60 rounded-[3rem] p-10 relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                                            <GitBranch className="w-[400px] h-[400px] text-blue-600" />
                                        </div>

                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-12">
                                                <div>
                                                    <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                                        <GitBranch className="w-7 h-7 text-indigo-600" />
                                                        Data Products Lineage
                                                    </h3>
                                                    <p className="text-sm text-gray-500 font-medium mt-1">Visualize upstream dependencies and downstream impact</p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <Button
                                                        variant="outline"
                                                        className="h-10 px-4 rounded-xl border-white/60 bg-white/60 text-[10px] font-black uppercase tracking-widest"
                                                        onClick={() => toast.success("View centered")}
                                                    >
                                                        Center View
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="h-10 px-4 rounded-xl border-white/60 bg-white/60 text-[10px] font-black uppercase tracking-widest"
                                                        onClick={() => {
                                                            toast.loading("Exporting lineage graph...", { duration: 1000 });
                                                            setTimeout(() => toast.success("Lineage graph exported as SVG"), 1000);
                                                        }}
                                                    >
                                                        Export Graph
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center gap-12 py-12">
                                                {/* Upstream Sources */}
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center mb-6">Upstream Sources</p>
                                                    {selectedAssets.slice(0, 3).map((asset: Asset) => (
                                                        <motion.div
                                                            key={asset.id}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 w-56 relative"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                                <Database className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-xs font-black text-gray-900 truncate">{asset.name}</span>
                                                            <div className="absolute right-[-24px] top-1/2 -translate-y-1/2 w-6 h-[2px] bg-blue-100" />
                                                        </motion.div>
                                                    ))}
                                                    {selectedAssets.length > 3 && (
                                                        <div className="text-center text-[10px] font-black text-blue-600/40 uppercase">+ {selectedAssets.length - 3} more sources</div>
                                                    )}
                                                </div>

                                                <ArrowRight className="text-blue-200 w-8 h-8" />

                                                {/* Data Products Node */}
                                                <motion.div
                                                    whileHover={{ scale: 1.05 }}
                                                    className="p-8 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-[2.5rem] shadow-2xl shadow-blue-500/20 text-white w-72 text-center relative border-4 border-white/20"
                                                >
                                                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-4">
                                                        <Boxes className="w-8 h-8" />
                                                    </div>
                                                    <h4 className="text-lg font-black tracking-tight mb-1">Customer 360</h4>
                                                    <Badge className="bg-white/20 text-white border-none text-[8px] font-black uppercase">Data Products</Badge>

                                                    <div className="absolute right-[-24px] top-1/2 -translate-y-1/2 w-6 h-[2px] bg-indigo-100" />
                                                    <div className="absolute left-[-24px] top-1/2 -translate-y-1/2 w-6 h-[2px] bg-blue-100" />
                                                </motion.div>

                                                <ArrowRight className="text-indigo-200 w-8 h-8" />

                                                {/* Downstream Consumers */}
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center mb-6">Downstream Consumption</p>
                                                    {[
                                                        { name: "Marketing Dashboard", icon: LayoutGrid, color: "text-amber-600", bg: "bg-amber-50" },
                                                        { name: "Sales Outreach Bot", icon: Zap, color: "text-purple-600", bg: "bg-purple-50" },
                                                        { name: "Executive Report", icon: FileText, color: "text-green-600", bg: "bg-green-50" }
                                                    ].map((dest, i) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 0, x: 20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.1 }}
                                                            className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 w-56 relative"
                                                        >
                                                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", dest.bg, dest.color)}>
                                                                <dest.icon className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-xs font-black text-gray-900 truncate">{dest.name}</span>
                                                            <div className="absolute left-[-24px] top-1/2 -translate-y-1/2 w-6 h-[2px] bg-indigo-100" />
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-12 p-8 bg-blue-50/50 rounded-3xl border border-blue-100/50 flex items-center gap-8">
                                                <div className="flex-1">
                                                    <h4 className="font-black text-gray-900 mb-2">Impact Analysis</h4>
                                                    <p className="text-sm text-gray-500 font-medium">Changing the schema of 'Customer 360' will affect 3 active downstream dashboards and 2 automated workflows.</p>
                                                </div>
                                                <Button className="bg-white text-blue-600 border border-blue-100 font-black uppercase text-[10px] tracking-widest px-6 h-12 rounded-xl">View Details</Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </TabsContent>
                                <TabsContent value="docs" className="m-0 focus-visible:outline-none">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="grid grid-cols-1 lg:grid-cols-4 gap-8"
                                    >
                                        <div className="lg:col-span-3 space-y-8">
                                            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-gray-100 min-h-[800px]">
                                                <div className="max-w-3xl mx-auto space-y-12">
                                                    {/* Doc Header */}
                                                    <div className="border-b border-gray-100 pb-12">
                                                        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Customer 360 Unified</h1>
                                                        <div className="flex flex-wrap gap-3">
                                                            <Badge className="bg-blue-600 text-white border-none px-3 py-1 font-black uppercase tracking-widest text-[10px]">v1.2.0</Badge>
                                                            <Badge variant="outline" className="border-gray-200 text-gray-500 px-3 py-1 font-black uppercase tracking-widest text-[10px]">Last Updated: Mar 2, 2026</Badge>
                                                            <Badge variant="outline" className="border-gray-200 text-gray-500 px-3 py-1 font-black uppercase tracking-widest text-[10px]">Owner: Marketing Team</Badge>
                                                        </div>
                                                    </div>

                                                    {/* Section: Overview */}
                                                    <section className="space-y-4">
                                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Purpose</h2>
                                                        <p className="text-lg text-gray-600 leading-relaxed font-medium">
                                                            This data set provides a singular, authoritative source of truth for customer interactions across the enterprise. It resolves identities from CRM, Support, and Web Analytics tools to build a comprehensive 360-degree profile.
                                                        </p>
                                                    </section>

                                                    {/* Section: Assets */}
                                                    <section className="space-y-6">
                                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Included Assets</h2>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {selectedAssets.slice(0, 4).map((asset: Asset) => (
                                                                <div key={asset.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-blue-600 shadow-sm">
                                                                        <Database className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-black text-gray-900 leading-none mb-1">{asset.name}</p>
                                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{asset.connector}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </section>

                                                    {/* Section: SLAs */}
                                                    <section className="space-y-4">
                                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Service Level Agreements</h2>
                                                        <div className="bg-blue-50/50 rounded-3xl p-8 border border-blue-100/50">
                                                            <div className="grid grid-cols-2 gap-8">
                                                                <div>
                                                                    <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest mb-2">Freshness Baseline</p>
                                                                    <p className="text-lg font-black text-gray-900">Within 15 Minutes</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest mb-2">Availability Score</p>
                                                                    <p className="text-lg font-black text-gray-900">99.9% Uptime</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </section>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="bg-white/60 border border-white/80 rounded-[2.5rem] p-8 shadow-sm">
                                                <h3 className="text-lg font-black text-gray-900 mb-6">Contents</h3>
                                                <nav className="space-y-2">
                                                    {["Objective", "Data Lineage", "Attribute Glossary", "Compliance & Privacy", "How to Access"].map((item, i) => (
                                                        <button key={i} className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-white hover:text-blue-600 transition-all flex items-center justify-between group">
                                                            {item}
                                                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </button>
                                                    ))}
                                                </nav>
                                            </div>

                                            <Button
                                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"
                                                onClick={() => {
                                                    toast.loading("Exporting to Confluence...", { duration: 1500 });
                                                    setTimeout(() => toast.success("Documentation synced to Confluence workspace"), 1500);
                                                }}
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                                Export to Confluence
                                            </Button>
                                        </div>
                                    </motion.div>
                                </TabsContent>

                                <TabsContent value="publish" className="m-0 focus-visible:outline-none">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="max-w-4xl mx-auto space-y-12 py-12"
                                    >
                                        <div className="text-center space-y-4">
                                            <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/40">
                                                <Send className="w-10 h-10 text-white" />
                                            </div>
                                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">Ready to Go Live?</h3>
                                            <p className="text-gray-500 font-medium max-w-md mx-auto">Review your data set assembly and publish it to the Entrecore Mesh catalog.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                                                <h4 className="font-black text-gray-900 flex items-center gap-2">
                                                    <ShieldCheck className="w-5 h-5 text-green-600" />
                                                    Quality & Security
                                                </h4>
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-500 font-medium">PII Classification</span>
                                                        <Badge className="bg-green-100 text-green-700 border-none px-2 py-0 text-[10px] font-black uppercase">Verified</Badge>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-500 font-medium">Contract Validation</span>
                                                        <Badge className="bg-green-100 text-green-700 border-none px-2 py-0 text-[10px] font-black uppercase">Passed</Badge>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-500 font-medium">Access Control</span>
                                                        <span className="font-black text-gray-900">Restricted (LDAP)</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                                                <h4 className="font-black text-gray-900 flex items-center gap-2">
                                                    <Boxes className="w-5 h-5 text-blue-600" />
                                                    Distribution
                                                </h4>
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-500 font-medium">Endpoints</span>
                                                        <span className="font-black text-gray-900">SQL, GraphQL</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-500 font-medium">Notification</span>
                                                        <span className="font-black text-gray-900">Slack, Email</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-500 font-medium">Sync Frequency</span>
                                                        <span className="font-black text-gray-900">Real-time</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-gray-200">
                                            <div className="flex items-center justify-center gap-4">
                                                <Button
                                                    variant="outline"
                                                    className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-[11px] border-gray-200"
                                                    onClick={() => {
                                                        toast.promise(new Promise(r => setTimeout(r, 1000)), {
                                                            loading: 'Generating YAML specification...',
                                                            success: 'dp-spec.yaml downloaded',
                                                            error: 'Failed to generate spec',
                                                        });
                                                    }}
                                                >
                                                    Export Spec (YAML)
                                                </Button>
                                                <Button
                                                    className="h-14 px-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 gap-3 group"
                                                    onClick={handlePublish}
                                                    disabled={isPublishing}
                                                >
                                                    {isPublishing ? "Processing..." : "Go Live & Notify Consumers"}
                                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </TabsContent>
                            </AnimatePresence>
                        </div>
                    </Tabs>
                </div>
            </div>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(37, 99, 235, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(37, 99, 235, 0.2);
        }
      `}</style>
        </div>
    );
}
