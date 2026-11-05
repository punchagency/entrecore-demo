"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { App } from "@/app/(protected)/coreos/types";
import { Company } from "@/app/store/companiesStore";
import { ConnectorDropdown } from "@/app/(protected)/coreos/components/connector-dropdown";
import { usePlatformConnectorId } from "@/app/(protected)/coreos/hooks/usePlatformConnectorId";
import { erpTypeFromAppName } from "@/app/(protected)/coreos/services/platform-connector-api";

interface ConnectorCardProps {
  app: App;
  index?: number;
  selectedCompany?: Company | null;
  onToggleFavorite: (id: number) => void;
  onRemoveApp?: (appId: number, appName: string) => void;
  isCrawling?: boolean;
  crawlProgress?: number;
}

export function ConnectorCard({
  app,
  index = 0,
  selectedCompany,
  onToggleFavorite,
  onRemoveApp,
  isCrawling,
  crawlProgress,
}: ConnectorCardProps) {
  const erpType = erpTypeFromAppName(app.name);
  const { connectorId: resolvedConnectorId } = usePlatformConnectorId(erpType ?? "");
  const isGoogleDrive = erpType === "google_drive";

  return (
    <motion.div
      layout
      layoutId={`connector-${app.id}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="relative group rounded-[1.75rem] border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(37,99,235,0.12)] hover:border-blue-200/60 transition-all duration-500"
    >
      {/* Ambient hover glow */}
      <div className="absolute inset-0 rounded-[1.75rem] bg-blue-500/5 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700 -z-10" />

      <div className="flex items-start justify-between">
        <div className="relative">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_12px_rgba(0,0,0,0.04)] border border-white/60 transition-transform duration-500 group-hover:scale-105 ${
              isCrawling
                ? "bg-gradient-to-br from-blue-50 to-indigo-50"
                : "bg-gradient-to-br from-slate-50 to-white"
            }`}
          >
            <Image
              src={app.imagePath}
              alt={`${app.name} logo`}
              width={30}
              height={30}
              className="object-contain drop-shadow-sm"
            />
          </div>

          {isCrawling && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-4px] rounded-2xl border-2 border-transparent border-t-blue-500 border-r-blue-400/50 pointer-events-none"
            />
          )}
        </div>

        <ConnectorDropdown
          appName={app.name}
          appId={app.id}
          connectorId={resolvedConnectorId || undefined}
          hideEditConfig={isGoogleDrive}
          onToggleFavorite={() => onToggleFavorite(app.id)}
          onRemove={onRemoveApp}
          align="end"
          selectedCompany={selectedCompany}
        >
          <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 bg-white/0 hover:text-blue-600 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-blue-100">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </ConnectorDropdown>
      </div>

      <div className="mt-5">
        <div className="text-[15px] font-black text-slate-900 tracking-tight">{app.name}</div>
        <div className="mt-2 flex items-center gap-1.5">
          <div className="relative flex items-center justify-center w-2.5 h-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${
                isCrawling ? "bg-blue-400 animate-ping" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                isCrawling ? "bg-blue-500" : "bg-emerald-500"
              }`}
            />
          </div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isCrawling ? `Syncing ${crawlProgress ?? 0}%` : "Connected"}
          </span>
        </div>

        {isCrawling && (
          <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${crawlProgress ?? 0}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        )}

        {resolvedConnectorId && (
          <Link
            href={`/data-room/catalog?connector_id=${encodeURIComponent(resolvedConnectorId)}`}
            className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider transition-colors"
          >
            View tables
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}
