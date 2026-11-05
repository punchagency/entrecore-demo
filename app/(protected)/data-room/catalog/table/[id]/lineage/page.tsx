"use client";

import React, { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { GitBranch } from "lucide-react";
import { PipelineVisualization } from "@/components/pipeline-visualization";
import { useColumnDataStore } from "@/app/store/columnDataStore";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function LineagePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    // Ensure id is a string
    const id = params?.id as string;
    const { selectedColumnData, clearSelectedColumnData } = useColumnDataStore();

    const labelParam = searchParams?.get("label");

    useEffect(() => {
        // Clear selected column when entering lineage page to show table lineage by default
        // unless a specific column is requested via label parameter
        if (!labelParam) {
            clearSelectedColumnData();
        }
    }, [clearSelectedColumnData, labelParam]);

    const selectedColumn = selectedColumnData?.column_name;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#f8fafc] h-[calc(100vh-160px)] flex flex-col overflow-hidden"
        >
            <header className="px-6 py-4 bg-white/40 backdrop-blur-xl border-b border-white/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <GitBranch className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 tracking-tight">
                            {selectedColumn ? `Column Lineage` : "Table Lineage"}
                        </h1>
                        {selectedColumn && (
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Lineage for {selectedColumn}
                            </p>
                        )}
                    </div>
                </div>

                {selectedColumn && (
                    <button
                        onClick={() => clearSelectedColumnData()}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
                    >
                        Reset to Table View
                    </button>
                )}
            </header>

            <div className="flex-1 relative bg-white/20">
                <PipelineVisualization
                    tableId={id}
                    columnId={selectedColumn}
                />
            </div>
        </motion.div>
    );
}
