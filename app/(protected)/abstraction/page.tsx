"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AbstractionLandingPage } from "./components/abstraction-landing-page";
import { AbstractionRoutingSection } from "./components/abstraction-routing-section";
import { AbstractionRulesTab } from "./components/abstraction-rules-tab";
import { PageWrapper } from "@/components/page-wrapper";

type AbstractionTab = "workflows" | "routing" | "rules";

const TABS: { id: AbstractionTab; label: string }[] = [
  { id: "workflows", label: "Workflows" },
  { id: "routing", label: "Routing" },
  { id: "rules", label: "Rules" },
];

export default function Page() {
  const [tab, setTab] = useState<AbstractionTab>("workflows");

  return (
    <PageWrapper title="Abstraction">
      <div className="px-4 pt-4">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                tab === id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "workflows" && <AbstractionLandingPage />}
      {tab === "routing" && <AbstractionRoutingSection />}
      {tab === "rules" && <AbstractionRulesTab />}
    </PageWrapper>
  );
}
