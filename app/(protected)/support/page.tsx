"use client";

import { useEffect } from "react";
import { LifeBuoy } from "lucide-react";

import { useSupportStore } from "@/app/store/supportStore";
import { useUserStore } from "@/app/store/userStore";
import { Button } from "@/components/ui/button";
import { parseUtcTimestamp } from "@/utils/support-expiry";

export default function SupportConsolePage() {
  const user = useUserStore((state) => state.user);
  const companies = useSupportStore((state) => state.companies);
  const loading = useSupportStore((state) => state.loading);
  const error = useSupportStore((state) => state.error);
  const fetchCompanies = useSupportStore((state) => state.fetchCompanies);
  const join = useSupportStore((state) => state.join);
  const leave = useSupportStore((state) => state.leave);

  useEffect(() => {
    void fetchCompanies();
  }, [fetchCompanies]);

  const inSession = Boolean(user?.support_session);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support</h1>
          <p className="text-sm text-slate-500">Join one company that has turned support access on.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Access denied. {error}
        </div>
      )}

      {companies.length === 0 && !loading && !error && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
          No companies currently have support access enabled.
        </div>
      )}

      <ul className="space-y-3">
        {companies.map((company) => {
          const joined = inSession && user?.active_company === company.company_id;
          const expiresMs = parseUtcTimestamp(company.expires_at);
          const expires = expiresMs == null ? "" : new Date(expiresMs).toLocaleString();
          return (
            <li
              key={company.grant_id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">{company.company_name}</p>
                <p className="text-sm text-slate-500">
                  {company.scope} · until {expires}
                </p>
              </div>
              {joined ? (
                <Button type="button" variant="outline" disabled={loading} onClick={() => void leave()}>
                  Leave
                </Button>
              ) : (
                <Button type="button" disabled={loading} onClick={() => void join(company.company_id)}>
                  {inSession ? "Switch" : "Join"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
