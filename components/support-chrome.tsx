"use client";

import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";

import { useCompaniesStore } from "@/app/store/companiesStore";
import { useSupportStore } from "@/app/store/supportStore";
import { useUserStore } from "@/app/store/userStore";
import { Button } from "@/components/ui/button";
import { remainingLabel } from "@/utils/support-expiry";

export function SupportChrome() {
  const user = useUserStore((state) => state.user);
  const companies = useCompaniesStore((state) => state.companies);
  const status = useSupportStore((state) => state.status);
  const fetchStatus = useSupportStore((state) => state.fetchStatus);
  const revoke = useSupportStore((state) => state.revoke);
  const leave = useSupportStore((state) => state.leave);
  const loading = useSupportStore((state) => state.loading);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    void fetchStatus();
    const poll = window.setInterval(() => {
      void fetchStatus();
    }, 60_000);
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [fetchStatus]);

  const companyName =
    companies.find((company) => company.id === user?.active_company)?.company_name || "this company";
  const scope = user?.support_scope || status?.scope;

  return (
    <>
      {status?.active && (
        <div className="mx-4 mt-3 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <LifeBuoy className="mt-0.5 h-4 w-4 text-amber-700" />
            <p className="text-sm text-amber-950">
              Entrecore support access is on
              {scope ? ` (${scope})` : ""} · {remainingLabel(status.expires_at, now)}
            </p>
          </div>
          {status.can_manage && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-amber-300 bg-white text-amber-950"
              disabled={loading}
              onClick={() => void revoke()}
            >
              Revoke
            </Button>
          )}
        </div>
      )}
      {user?.support_session && (
        <div className="mx-4 mt-3 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-blue-950">
            You are in a support session for {companyName}
            {user.support_scope ? ` · ${user.support_scope}` : ""} · {remainingLabel(user.support_expires_at, now)}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-blue-300 bg-white text-blue-950"
            disabled={loading}
            onClick={() => void leave()}
          >
            Leave
          </Button>
        </div>
      )}
    </>
  );
}
