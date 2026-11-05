"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getUnhandledRequests, onUnhandledChange } from "@/demo/server";
import { screenFor, type ScreenStatus } from "@/demo/roadmap/registry";

const STORAGE_KEY = "demo-roadmap-view";

const STATUS_STYLE: Record<ScreenStatus | "unreviewed", { label: string; className: string }> = {
  live: { label: "Live", className: "bg-emerald-100 text-emerald-800" },
  partial: { label: "Partial", className: "bg-amber-100 text-amber-800" },
  roadmap: { label: "Roadmap", className: "bg-violet-100 text-violet-800" },
  unreviewed: { label: "Not reviewed", className: "bg-slate-100 text-slate-700" },
};

/**
 * Internal view: open any page with `?view=roadmap` to see what the screen
 * stands for (live / partial / roadmap), what the backend has for it, and which
 * of its API calls the demo doesn't answer yet. `?view=demo` hides it again.
 * Customers never see it unless they add the parameter.
 */
export function RoadmapOverlay() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const [enabled, setEnabled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const unhandled = useSyncExternalStore(onUnhandledChange, getUnhandledRequests, getUnhandledRequests);

  useEffect(() => {
    const view = searchParams?.get("view");
    if (view === "roadmap") sessionStorage.setItem(STORAGE_KEY, "1");
    if (view === "demo") sessionStorage.removeItem(STORAGE_KEY);
    setEnabled(sessionStorage.getItem(STORAGE_KEY) === "1");
  }, [searchParams]);

  if (!enabled) return null;

  const screen = screenFor(pathname);
  const status = STATUS_STYLE[screen?.status ?? "unreviewed"];
  const gaps = unhandled.filter((request) => request.page === pathname);

  return (
    <aside
      aria-label="Roadmap view"
      className="fixed bottom-4 right-4 z-[1000] w-[360px] rounded-xl border border-slate-200 bg-white/95 text-sm shadow-xl backdrop-blur"
    >
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={!collapsed}
      >
        <span className="font-semibold text-slate-900">
          Roadmap view{screen ? ` · ${screen.area}` : ""}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
      </button>

      {!collapsed && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          <p className="text-slate-700">
            {screen?.summary ?? "This screen has no roadmap entry yet (demo/roadmap/registry.ts)."}
          </p>

          {screen?.backend?.length ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Backend</p>
              <ul className="space-y-1 font-mono text-xs text-slate-700">
                {screen.backend.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Unanswered API calls on this page ({gaps.length})
            </p>
            {gaps.length ? (
              <ul className="max-h-40 space-y-1 overflow-auto font-mono text-xs text-rose-700">
                {gaps.map((request) => (
                  <li key={`${request.method} ${request.path}`}>
                    {request.method} {request.path}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">None: every call here has demo data.</p>
            )}
          </div>

          <p className="text-xs text-slate-400">Hide with ?view=demo</p>
        </div>
      )}
    </aside>
  );
}
