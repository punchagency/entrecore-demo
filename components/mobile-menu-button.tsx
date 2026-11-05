"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useSidebar } from "./ui/sidebar";
// import { NotificationBell } from "@/app/(protected)/notifications/components/notification-bell";

export function MobileMenuButton() {
  const { toggleSidebar, isMobile } = useSidebar();

  if (!isMobile) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b md:hidden h-14 flex items-center px-4">
      <Link href="/metrics" className="flex items-center">
        <img src="/svgs/logo.svg" alt="Logo" width={100} height={100} />
      </Link>
      <div className="flex-1" />

      {/* <NotificationBell className="mr-2 h-9 w-9 rounded-xl" /> */}
      <Menu className="w-6 h-6" onClick={toggleSidebar} />
      <span className="sr-only">Open menu</span>
    </nav>
  );
}
