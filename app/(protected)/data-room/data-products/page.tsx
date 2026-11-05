"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Boxes,
    Plus,
    Search,
    Filter,
    ArrowUpRight,
    Database,
    ShieldCheck,
    Zap,
    Clock,
    LayoutGrid,
    List,
    MoreVertical,
    ExternalLink,
    ChevronRight,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "sonner";

// --- Mock Data ---
const MOCK_DATA_PRODUCTS = [
    {
        id: "dp-1",
        name: "Customer 360 Unified",
        description: "Unified view of customer behavior across sales, support, and marketing channels.",
        owner: "Marketing Team",
        status: "Published",
        assets: 12,
        quality: 98,
        freshness: "15m ago",
        tags: ["Customer", "Strategic", "PII"],
    },
    {
        id: "dp-2",
        name: "Financial Reporting H1 2026",
        description: "Consolidated financial metrics for H1 2026 reporting and auditing.",
        owner: "Finance Dept",
        status: "Draft",
        assets: 8,
        quality: 94,
        freshness: "2h ago",
        tags: ["Financial", "Strict", "Audit"],
    },
    {
        id: "dp-3",
        name: "Supply Chain Risk Index",
        description: "Real-time risk assessment model for global logistics and inventory.",
        owner: "Logistics Ops",
        status: "Published",
        assets: 24,
        quality: 91,
        freshness: "5m ago",
        tags: ["Operational", "Risk", "IoT"],
    },
];

export default function DataProductsPage() {
    const [view, setView] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    const filteredProducts = MOCK_DATA_PRODUCTS.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter ? p.status === statusFilter : true;
        return matchesSearch && matchesStatus;
    });

    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter(null);
        toast.success("Filters cleared");
    };

    return (
        <div className="relative min-h-[calc(100vh-80px)] w-full bg-[#FAFBFF] overflow-hidden px-4 py-8 sm:px-6 md:px-8 lg:px-12">
            {/* Dynamic Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-indigo-400/5 blur-[100px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-4"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
                                <Boxes className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-gray-900">Data Products</h1>
                                <p className="text-gray-500 font-medium text-sm mt-0.5 tracking-wide uppercase flex items-center gap-2">
                                    <Sparkles className="w-3 h-3 text-blue-500" /> Enterprise Asset Catalog
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    <div></div>
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
                    <div className="relative flex-1 w-full md:w-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            className="h-14 pl-11 pr-4 rounded-2xl border-white/60 bg-white/60 backdrop-blur-md shadow-sm focus:bg-white transition-all outline-none"
                            placeholder="Search data products, owners, or tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md p-1 rounded-2xl border border-white/60 shadow-sm">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("w-12 h-12 rounded-xl", view === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}
                            onClick={() => setView("grid")}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("w-12 h-12 rounded-xl", view === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600")}
                            onClick={() => setView("list")}
                        >
                            <List className="w-5 h-5" />
                        </Button>
                    </div>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="h-14 px-6 rounded-2xl border-white/60 bg-white/60 backdrop-blur-md gap-2 font-bold text-gray-600 hover:bg-white hover:border-blue-200 group">
                                <Filter className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                Filters
                                {(statusFilter) && (
                                    <Badge className="ml-1 bg-blue-600 text-white border-none w-5 h-5 p-0 flex items-center justify-center rounded-full text-[10px]">1</Badge>
                                )}
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="rounded-l-[3rem] border-none shadow-2xl p-10">
                            <SheetHeader className="mb-8">
                                <SheetTitle className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                    <Filter className="w-6 h-6 text-blue-600" />
                                    Filter Data Products
                                </SheetTitle>
                                <SheetDescription className="font-medium text-gray-500">Refine your data products search results</SheetDescription>
                            </SheetHeader>

                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Publication Status</label>
                                    <div className="flex flex-wrap gap-2">
                                        {["Published", "Draft"].map((status) => (
                                            <Button
                                                key={status}
                                                variant={statusFilter === status ? "default" : "outline"}
                                                onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                                                className={cn(
                                                    "rounded-xl font-bold transition-all",
                                                    statusFilter === status ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white text-gray-500"
                                                )}
                                            >
                                                {status}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ownership</label>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter italic">Dynamic owners loading...</p>
                                    </div>
                                </div>
                            </div>

                            <SheetFooter className="absolute bottom-10 left-10 right-10 flex gap-4">
                                <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={clearFilters}>Reset</Button>
                                <Button
                                    className="flex-1 h-12 rounded-xl bg-gray-900 border-none font-bold text-white"
                                    onClick={() => toast.success("Filters applied")}
                                >
                                    Apply
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Content Grid */}
                <div className={cn(
                    "grid gap-6",
                    view === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
                )}>
                    <AnimatePresence mode="popLayout">
                        {filteredProducts.map((product, idx) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                whileHover={{ y: -5 }}
                                className={cn(
                                    "group relative overflow-hidden transition-all duration-300",
                                    view === "grid"
                                        ? "bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(37,99,235,0.08)]"
                                        : "bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-6 flex items-center justify-between"
                                )}
                            >
                                {/* Status Badge */}
                                <div className="absolute top-6 right-6">
                                    <Badge className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                        product.status === "Published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                    )}>
                                        {product.status}
                                    </Badge>
                                </div>

                                <div className={cn("flex flex-col h-full", view === "list" && "flex-row items-center gap-8 w-full")}>
                                    <div className="mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                                            <Database className="w-7 h-7 text-blue-600" />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">{product.name}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed font-medium">
                                            {product.description}
                                        </p>
                                    </div>

                                    <div className={cn("mt-auto flex flex-col gap-6", view === "list" && "flex-row flex-1 items-center justify-between mt-0")}>
                                        {/* Stats */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Assets</span>
                                                <div className="flex items-center gap-1.5 font-bold text-gray-900">
                                                    <Boxes className="w-3 h-3 text-blue-500" />
                                                    {product.assets}
                                                </div>
                                            </div>
                                            <div className="flex flex-col border-x border-gray-100 px-4">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Quality</span>
                                                <div className="flex items-center gap-1.5 font-bold text-green-600">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    {product.quality}%
                                                </div>
                                            </div>
                                            <div className="flex flex-col pl-4">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Freshness</span>
                                                <div className="flex items-center gap-1.5 font-bold text-blue-600">
                                                    <Clock className="w-3 h-3" />
                                                    {product.freshness}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-6 border-t border-gray-100/50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black text-white">
                                                    {product.owner.split(' ')[0][0]}
                                                </div>
                                                <span className="text-xs font-bold text-gray-600">{product.owner}</span>
                                            </div>
                                            <Link href={`/data-room/data-products/${product.id}`}>
                                                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                                    <ArrowUpRight className="w-5 h-5" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Empty State */}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                                <Database className="w-10 h-10 text-blue-200" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">No Data Products Found</h3>
                            <p className="text-gray-500 max-w-sm mb-8">
                                We couldn't find any data products matching your search. Try adjusting your filters or create a new one.
                            </p>
                            <Button className="h-12 px-8 bg-gray-900 hover:bg-black text-white rounded-xl font-bold uppercase tracking-widest" onClick={clearFilters}>
                                Clear All Filters
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
