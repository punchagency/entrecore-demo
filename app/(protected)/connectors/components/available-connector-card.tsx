"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import { App } from "@/app/(protected)/coreos/types";
import { CONNECTOR_BLURBS } from "./connector-catalog";

interface AvailableConnectorCardProps {
  app: App;
  index?: number;
  onConnect: (appId: number) => void;
}

export function AvailableConnectorCard({ app, index = 0, onConnect }: AvailableConnectorCardProps) {
  return (
    <motion.button
      layout
      layoutId={`connector-${app.id}`}
      type="button"
      onClick={() => onConnect(app.id)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group relative text-left rounded-[1.75rem] border border-dashed border-slate-200 bg-white/40 backdrop-blur-sm p-5 hover:border-blue-300 hover:bg-white/70 transition-colors duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="w-14 h-14 rounded-2xl bg-slate-50/80 border border-white/60 flex items-center justify-center overflow-hidden grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
          <Image
            src={app.imagePath}
            alt={`${app.name} logo`}
            width={30}
            height={30}
            className="object-contain"
          />
        </div>

        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-white group-hover:bg-blue-600 transition-all duration-300 group-hover:rotate-90">
          <Plus className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-5">
        <div className="text-[15px] font-black text-slate-500 group-hover:text-slate-900 tracking-tight transition-colors">
          {app.name}
        </div>
        <p className="mt-1 text-[11px] font-medium text-slate-400 leading-relaxed line-clamp-2">
          {CONNECTOR_BLURBS[app.id] || "Connect this service to sync its data"}
        </p>
        <div className="mt-2.5 text-[11px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 uppercase tracking-wider">
          Connect →
        </div>
      </div>
    </motion.button>
  );
}
