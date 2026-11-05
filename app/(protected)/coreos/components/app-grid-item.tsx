"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useMediaQuery } from "usehooks-ts";
import { MoreHorizontal, Check, Plus, ExternalLink, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { App } from "../types";
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { categories } from "../constants";
import { Company } from "@/app/store/companiesStore";
import { ConnectorDropdown } from "./connector-dropdown";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AppGridItemProps {
  app: App;
  index: number;
  showSidePanel: boolean;
  showNotifications: boolean;
  isAnimationPaused: boolean;
  setIsAnimationPaused: (paused: boolean) => void;
  onToggleFavorite: (id: number) => void;
  onRemoveApp?: (appId: number, appName: string) => void;
  selectedCompany?: Company | null;
  isActive?: boolean;
  isCrawling?: boolean;
  crawlProgress?: number;
}

export const AppGridItem = ({
  app,
  index,
  showSidePanel,
  showNotifications,
  setIsAnimationPaused,
  onToggleFavorite,
  onRemoveApp,
  selectedCompany,
  isActive,
  isCrawling,
  crawlProgress,
}: AppGridItemProps) => {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    if (openMenuId === null) {
      setIsAnimationPaused(false);
    }
  }, [openMenuId, setIsAnimationPaused]);

  useEffect(() => {
    return () => {
      setIsAnimationPaused(false);
    };
  }, [setIsAnimationPaused]);

  const isMobile = !isDesktop;
  const appSize = isMobile ? (showSidePanel ? 48 : 56) : showSidePanel ? 64 : 72;
  const iconSize = isMobile ? (showSidePanel ? 28 : 32) : showSidePanel ? 36 : 42;

  const handleCategoryClick = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleDelete = (id: number) => {
    onToggleFavorite(id);
    setOpenMenuId(null);
    if (onRemoveApp) {
      onRemoveApp(id, app.name);
    }
  };

  const renderDropdownContent = (appId: number) => (
    <DropdownMenuContent
      align="end"
      className="w-[240px] bg-white/90 backdrop-blur-2xl rounded-[1.8rem] border border-white/60 shadow-[0_20px_50px_rgba(37,99,235,0.1)] p-2"
      onCloseAutoFocus={() => {
        setIsAnimationPaused(false);
        setOpenMenuId(null);
      }}
      sideOffset={10}
      side="bottom"
    >
      <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-2 bg-blue-50/50 rounded-2xl text-blue-700 text-sm font-bold mb-2">
          {app.name}
          <ExternalLink
            className="h-4 w-4 text-blue-500 cursor-pointer hover:scale-110 transition-transform"
            onClick={() => {
              window.open("https://www.entrecore.com", "_blank");
            }}
          />
        </DropdownMenuLabel>

        <div className="grid grid-cols-2 gap-1.5 p-1">
          {categories.map((item) => (
            <div
              key={item.name}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200",
                selectedCategories.includes(item.name)
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              )}
              onClick={(e) => {
                e.preventDefault();
                handleCategoryClick(item.name);
              }}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">{item.name}</span>
              {selectedCategories.includes(item.name) ? (
                <Check className="h-3.5 w-3.5 text-white" />
              ) : (
                <Plus className="h-3.5 w-3.5 text-gray-400" />
              )}
            </div>
          ))}
        </div>

        <DropdownMenuSeparator className="bg-blue-100/30 my-2 mx-2" />

        <div
          className="group flex items-center justify-between bg-red-50 hover:bg-red-500 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200"
          onClick={() => handleDelete(appId)}
        >
          <span className="text-red-600 group-hover:text-white text-xs font-bold uppercase tracking-widest">
            Remove App
          </span>
          <Trash2 className="h-4 w-4 text-red-500 group-hover:text-white transition-colors" />
        </div>
      </div>
    </DropdownMenuContent>
  );

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.1 }}
      animate={{
        y: [0, -4, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
        delay: index * 0.2
      }}
      className="relative flex items-center justify-center p-4 group"
    >
      {/* Liquid Glow - Soft refraction color */}
      <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-700" />

      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative rounded-full flex items-center justify-center cursor-pointer transition-all duration-700",
              "bg-gradient-to-br from-white/40 via-white/10 to-transparent backdrop-blur-[20px]",
              "border border-white/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_10px_40px_rgba(0,0,0,0.06)]",
              "hover:border-white/60 hover:shadow-[inset_0_2px_10px_rgba(255,255,255,0.6),0_20px_50px_rgba(37,99,235,0.15)]",
              isActive && "border-blue-400 bg-blue-400/20 shadow-[0_0_25px_rgba(59,130,246,0.5),inset_0_0_15px_rgba(59,130,246,0.3)] ring-2 ring-blue-400/50"
            )}
            style={{
              width: `${appSize}px`,
              height: `${appSize}px`,
            }}
          >
            {/* Glass Polish - Handles internal reflections and clipping */}
            <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              {/* Organic Light Catch - The 'Liquid' Glint */}
              <div className="absolute top-[-20%] left-[-20%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0%,transparent_60%)] opacity-30 group-hover:opacity-50 transition-all duration-1000 group-hover:rotate-12" />
            </div>

            {/* Crawling Indicator */}
            {isCrawling && (
              <div className="absolute inset-[-6px] z-0 pointer-events-none">
                {/* Inner Rotating Energy Ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,#3b82f6_180deg,transparent_360deg)] opacity-40 blur-[1px]"
                />
                {/* Outer Rotating Energy Ring */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-[2px] border-blue-500/20 border-t-blue-500/80 animate-spin"
                />
                {/* Orbiting Particles */}
                {[0, 120, 240].map((angle, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      rotate: angle + 360,
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      rotate: { duration: 3 + i, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="absolute inset-0"
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  </motion.div>
                ))}
                {/* Central Glow */}
                <div className="absolute inset-4 rounded-full bg-blue-500/10 blur-xl animate-pulse" />
              </div>
            )}

            {/* Notification Badge */}
            {showNotifications && app.notifications > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 left-1 min-w-[18px] h-[18px] flex items-center justify-center bg-blue-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-blue-500/40 z-30"
              >
                {app.notifications}
              </motion.div>
            )}

            {/* App Logo */}
            <div className="relative z-10 p-2 md:p-3 pointer-events-none">
              <Image
                src={app.imagePath}
                alt={`${app.name} logo`}
                width={iconSize}
                height={iconSize}
                className="object-contain transition-all duration-700 group-hover:scale-110 drop-shadow-[0_4px_8px_rgba(0,0,0,0.1)]"
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={20}
          className="p-0 border-0 bg-transparent shadow-none"
        >
          {/* Hover Label - Premium Cyber-Glass Tag */}
          <div className="relative bg-white/10 backdrop-blur-3xl px-5 py-3 rounded-[1.8rem] border border-white/20 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.25)] flex items-center gap-5 min-w-max animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isCrawling ? "bg-blue-400 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]" : "bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                )} />
                <span className="text-[9px] font-bold text-slate-400/80 uppercase tracking-[0.25em] leading-none">
                  {isCrawling ? "Synchronizing" : "Terminal Active"}
                </span>
              </div>
              <span className="text-[14px] font-black text-slate-700 tracking-tight leading-none uppercase">
                {app.name}
              </span>
            </div>

            {isCrawling && (
              <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-black text-blue-500 tabular-nums leading-none">
                      {crawlProgress}%
                    </span>
                    <span className="text-[7px] font-black text-blue-400/70 uppercase tracking-tighter">
                      Integrity check
                    </span>
                  </div>
                  <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${crawlProgress}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Subtle Inner Glow */}
            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Action Button (Dropdown) */}
      {(() => {
        const normalizedName = app.name.toLowerCase().replace(/\s+/g, "");
        return normalizedName === "bigquery" ||
          normalizedName === "netsuite" ||
          normalizedName === "airtable" ||
          normalizedName === "notion";
      })() ? (
        <ConnectorDropdown
          appName={app.name}
          appId={app.id}
          onToggleFavorite={() => onToggleFavorite(app.id)}
          onRemove={onRemoveApp}
          align="center"
          onDropdownClose={() => {
            setIsAnimationPaused(false);
            setOpenMenuId(null);
          }}
          selectedCompany={selectedCompany}
        >
          <button
            className="absolute top-1 right-1 w-7 h-7 bg-white/40 backdrop-blur-xl rounded-full shadow-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all hover:bg-blue-600 hover:text-white border border-white/40 z-20 hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              setIsAnimationPaused(true);
              setOpenMenuId(app.id);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </ConnectorDropdown>
      ) : (
        <DropdownMenu
          open={openMenuId === app.id}
          onOpenChange={(open) => {
            setIsAnimationPaused(open);
            setOpenMenuId(open ? app.id : null);
          }}
        >
          <DropdownMenuTrigger asChild>
            <button className="absolute top-1 right-1 w-7 h-7 bg-white/40 backdrop-blur-xl rounded-full shadow-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all hover:bg-blue-600 hover:text-white border border-white/40 z-20 hover:scale-110">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          {renderDropdownContent(app.id)}
        </DropdownMenu>
      )}
    </motion.div>
  );
};
