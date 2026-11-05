"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export function DynamicSidebarTrigger() {
  const { state, isMobile } = useSidebar();

  // Hide this trigger on mobile
  if (isMobile) {
    return null;
  }

  return (
    <SidebarTrigger
      className={`transform -translate-x-7 z-10 absolute top-5 ${state === "expanded" ? "left-65" : "left-16"
        } hidden md:block`}
    />
  );
}
