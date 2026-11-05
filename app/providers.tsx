"use client";

import { Suspense, useEffect } from "react";
import { CircleCheck, CircleX, Info } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { SearchProvider } from "@/contexts/search-context";
import { SocketIOProvider } from "@/contexts/socketio-context";
import { NavigationProgress } from "@/components/navigation-progress";
import { getQueryClient } from "@/utils/query-client";
import { DemoSession } from "@/components/demo/demo-session";
import { RoadmapOverlay } from "@/components/demo/roadmap-overlay";

export default function Providers({
  children,
  toasterClassName,
}: {
  children: React.ReactNode;
  toasterClassName: string;
}) {
  const queryClient = getQueryClient();

  useEffect(() => {
    let previousPointerEvents = document.body.style.pointerEvents;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "style") {
          const body = document.body;
          const currentPointerEvents = body.style.pointerEvents;

          if (currentPointerEvents === "none") {
            console.log("🚨 Body pointer-events set to none by:", new Error().stack);
            console.log("📋 Full body style:", body.style.cssText);
            console.log(
              "🔍 Body attributes:",
              body.getAttributeNames().map((name) => `${name}="${body.getAttribute(name)}"`)
            );
            console.log("⏰ Timestamp:", new Date().toISOString());

            const stack = new Error().stack || "";
            if (!stack.includes("layout.tsx") && !stack.includes("core-visualization.tsx")) {
              console.log("🛡️ Blocking external pointer-events: none");
              body.style.pointerEvents = "auto";
            }
          } else if (previousPointerEvents === "none" && currentPointerEvents !== "none") {
            console.log("✅ Body pointer-events removed, now:", currentPointerEvents);
            console.log("⏰ Timestamp:", new Date().toISOString());
          }

          previousPointerEvents = currentPointerEvents;
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Navigation progress bar — Suspense required for useSearchParams */}
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <DemoSession />
      <Suspense fallback={null}>
        <RoadmapOverlay />
      </Suspense>
      <Toaster
        className={cn(toasterClassName, "font-normal")}
        icons={{
          info: <Info className="text-[#3064F6]" strokeWidth={1.2} />,
          error: <CircleX className="text-red-400" strokeWidth={1.2} />,
          success: <CircleCheck className="text-[#3064F6]" strokeWidth={1.2} />,
        }}
      />
      <SocketIOProvider autoConnect={true} autoConnectWorkflow={true}>
        <SearchProvider>{children}</SearchProvider>
      </SocketIOProvider>
    </QueryClientProvider>
  );
}
