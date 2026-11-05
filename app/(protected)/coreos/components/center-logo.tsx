"use client";
import Image from "next/image";
import { useMediaQuery } from "usehooks-ts";
import { motion } from "framer-motion";

import { Company } from "@/app/store/companiesStore";
import { Bot, Sparkles } from "lucide-react";

interface CenterLogoProps {
  selectedCompany?: Company | null;
  showSidePanel: boolean;
}

export const CenterLogo = ({ selectedCompany, showSidePanel }: CenterLogoProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const logoSize = !isDesktop
    ? showSidePanel
      ? { container: "44px", inner: "36px", icon: "20px" }
      : { container: "56px", inner: "44px", icon: "24px" }
    : showSidePanel
      ? { container: "64px", inner: "52px", icon: "28px" }
      : { container: "80px", inner: "64px", icon: "32px" };

  return (
    <div className="relative flex items-center justify-center p-4">
      {/* Hyper-Vibrant Energy Field */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.3, 0.7, 0.3],
          rotate: 360,
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute rounded-full bg-[conic-gradient(from_0deg,#3b82f6,#2dd4bf,#a855f7,#3b82f6)] blur-2xl"
        style={{ width: logoSize.container, height: logoSize.container }}
      />

      {/* Outer Glass Shell */}
      <div
        className="relative flex items-center justify-center rounded-full bg-white/40 backdrop-blur-3xl shadow-[0_20px_50px_rgba(37,99,235,0.2)] border border-white/60 p-1.5"
        style={{ width: logoSize.container, height: logoSize.container }}
      >
        {/* The Deep Intelligence Core */}
        <div
          className="relative w-full h-full rounded-full overflow-hidden shadow-inner flex items-center justify-center"
        >
          {selectedCompany?.profile_image ? (
            <div className="w-full h-full relative group">
              <Image
                src={selectedCompany.profile_image}
                alt={selectedCompany.company_name || "Company"}
                fill
                className="object-cover scale-110"
              />
              <div className="absolute inset-0 bg-blue-600/10 mix-blend-overlay" />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-700 via-indigo-600 to-blue-900 flex items-center justify-center relative group">
              {/* Internal Pulsing Energy */}
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.4, 0.7, 0.4]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.4),transparent_70%)]"
              />

              <div className="relative z-10 flex flex-col items-center justify-center transform transition-all duration-700 group-hover:scale-110">
                <Bot
                  className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]"
                  style={{ width: logoSize.icon, height: logoSize.icon, strokeWidth: 1.5 }}
                />
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-4 h-4 text-white/60" />
                </motion.div>
              </div>

              {/* Surface Reflection Layer */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tl from-transparent via-white/5 to-white/20 pointer-events-none" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
