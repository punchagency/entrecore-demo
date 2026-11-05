"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/app/(protected)/notifications/components/notification-bell";

export function SettingsNav() {
  const pathname = usePathname() ?? "";

  const navItems = [
    {
      label: "Companies",
      href: "/settings",
    },
    {
      label: "Team",
      href: "/settings/team",
    },
    {
      label: "My Profile",
      href: "/settings/my-profile",
    },
    {
      label: "Account Settings",
      href: "/settings/account-settings",
    },
  ];

  return (
    <nav className="w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-xl sticky top-0 z-50 transition-all">
      <div className="px-6 xl:px-8 flex h-16 xl:h-[72px] items-center justify-between">
        <div className="flex overflow-x-auto gap-8 h-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/settings" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center h-full text-[15px] font-semibold transition-colors shrink-0",
                  isActive
                    ? "text-primary"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                )}
              </Link>
            );
          })}
        </div>
        <NotificationBell className="ml-4 shrink-0" />
      </div>
    </nav>
  );
}
