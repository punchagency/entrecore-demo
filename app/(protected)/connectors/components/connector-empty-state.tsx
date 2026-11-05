"use client";

import { motion } from "framer-motion";
import { PlugZap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConnectorEmptyStateProps {
  onAddConnector: () => void;
}

export function ConnectorEmptyState({ onAddConnector }: ConnectorEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative flex flex-col items-center justify-center text-center py-24 px-6 rounded-[2.5rem] border border-white/60 bg-white/50 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      <div className="absolute top-[-20%] left-[10%] w-[40%] h-[60%] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[10%] w-[40%] h-[60%] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative mx-auto w-24 h-24 mb-8">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[1.75rem] rotate-12 opacity-10 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-bl from-blue-600 to-indigo-600 rounded-[1.75rem] -rotate-6 opacity-10 animate-pulse delay-700" />
        <div className="relative bg-white border border-blue-50 rounded-[1.75rem] w-24 h-24 flex items-center justify-center shadow-2xl shadow-blue-500/10 transition-transform hover:scale-110 duration-500">
          <PlugZap className="h-11 w-11 text-blue-600" strokeWidth={1.5} />
        </div>
      </div>

      <h3 className="relative text-2xl font-black text-gray-900 mb-3 tracking-tight">
        No connectors yet
      </h3>
      <p className="relative text-gray-500 mb-8 max-w-sm text-[15px] leading-relaxed font-medium">
        Connect BigQuery, NetSuite, Airtable, Notion, or Google Drive to start crawling,
        profiling, and syncing your data — no need to open CoreOS.
      </p>

      <Button
        onClick={onAddConnector}
        className="relative bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white h-12 px-7 rounded-2xl text-sm font-bold shadow-[0_16px_32px_rgba(37,99,235,0.25)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.35)] transition-all active:scale-[0.98] flex items-center gap-2 border border-blue-400/20"
      >
        <Plus className="h-4 w-4" />
        Connect your first service
      </Button>
    </motion.div>
  );
}
