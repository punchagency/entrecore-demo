"use client";

import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SupportScope, useSupportStore } from "@/app/store/supportStore";
import { remainingLabel } from "@/utils/support-expiry";

const DURATIONS = [
  { value: "1", label: "1 hour" },
  { value: "4", label: "4 hours" },
  { value: "8", label: "8 hours" },
  { value: "24", label: "24 hours" },
  { value: "48", label: "48 hours" },
];

export function SupportAccessCard() {
  const status = useSupportStore((state) => state.status);
  const loading = useSupportStore((state) => state.loading);
  const fetchStatus = useSupportStore((state) => state.fetchStatus);
  const enable = useSupportStore((state) => state.enable);
  const revoke = useSupportStore((state) => state.revoke);

  const [scope, setScope] = useState<SupportScope>("read");
  const [hours, setHours] = useState("4");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!status?.can_manage) return null;

  const scopeLabel = status.scope === "read" ? "Read" : status.scope === "member" ? "Member" : "Admin";

  return (
    <section className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-transparent flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Support access</h2>
          <p className="text-sm text-slate-500">
            Let Entrecore staff into this company for a limited time. You can turn it off whenever you want.
          </p>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-5">
        {status.active ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                Active · <span className="uppercase tracking-wide text-xs">{scopeLabel}</span>
              </p>
              <p className="text-sm text-slate-600">
                {remainingLabel(status.expires_at, now)}
                {status.granted_by_email ? ` · granted by ${status.granted_by_email}` : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => setConfirmOpen(true)}
              disabled={loading}
            >
              Revoke
            </Button>
          </div>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void enable(scope, Number(hours), scope === "admin" ? reason : undefined);
            }}
          >
            <div className="space-y-2">
              <Label>Scope</Label>
              <RadioGroup value={scope} onValueChange={(value) => setScope(value as SupportScope)} className="gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <RadioGroupItem value="read" id="support-scope-read" />
                  Read
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <RadioGroupItem value="member" id="support-scope-member" />
                  Member
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <RadioGroupItem value="admin" id="support-scope-admin" />
                  Admin
                </label>
              </RadioGroup>
            </div>

            {scope === "admin" && (
              <div className="space-y-2">
                <Label htmlFor="support-reason">Reason</Label>
                <Textarea
                  id="support-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Why does support need admin access?"
                  required
                />
              </div>
            )}

            <div className="space-y-2 max-w-xs">
              <Label>Duration</Label>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger>
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading || (scope === "admin" && !reason.trim())}>
              Enable support access
            </Button>
          </form>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-[400px] p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <DialogTitle className="text-xl font-semibold">Revoke support access?</DialogTitle>
            <p className="text-sm text-slate-500">
              New staff requests stop immediately. A session already in progress can finish within 15 minutes.
            </p>
            <div className="flex items-center gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={loading}
                onClick={() => {
                  void revoke().then(() => setConfirmOpen(false));
                }}
              >
                Revoke
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
