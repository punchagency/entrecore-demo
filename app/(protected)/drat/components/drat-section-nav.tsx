"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type DratSection =
  | "upload"
  | "settings"
  | "classify-settings"
  | "entities"
  | "rules"
  | "review"
  | "logs";

const TABS: { id: DratSection; label: string; href: string }[] = [
  { id: "upload", label: "Upload", href: "/drat" },
  { id: "settings", label: "Configurations", href: "/drat/settings" },
  { id: "classify-settings", label: "Naming", href: "/drat/classify-settings" },
  { id: "entities", label: "Entity List", href: "/drat/entities" },
  { id: "rules", label: "Routing Rules", href: "/drat/rules" },
  { id: "review", label: "Review Queue", href: "/drat/review" },
  { id: "logs", label: "Filing Log", href: "/drat/logs" },
];

export function DratSectionNav({ active }: { active: DratSection }) {
  return (
    <div className="overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "shrink-0 whitespace-nowrap px-5 py-3 text-sm border-b-2 transition-colors",
              active === tab.id
                ? "font-bold border-indigo-600 text-indigo-600"
                : "font-semibold border-transparent text-slate-500 hover:text-indigo-600"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
