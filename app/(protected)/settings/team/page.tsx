"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import {
  Check,
  Copy,
  Crown,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { useCompaniesStore } from "@/app/store/companiesStore";
import { useUserStore } from "@/app/store/userStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { SupportAccessCard } from "@/components/support-access-card";

import {
  CompanyMember,
  CompanyRole,
  PendingInvite,
  inviteCompanyMember,
  listCompanyMembers,
  listPendingInvites,
  memberDisplayName,
  removeMember,
  revokeInvite,
  roleLabel,
  transferOwnership,
  updateMemberRole,
} from "./team-api";
import { QueryErrorState } from "@/components/query-error-state";

const ROLE_OPTIONS: { value: CompanyRole; label: string; hint: string }[] = [
  {
    value: "admin",
    label: "Admin",
    hint: "Manage team, connectors, and settings",
  },
  {
    value: "member",
    label: "Member",
    hint: "Create and run workflows",
  },
  {
    value: "viewer",
    label: "Viewer",
    hint: "Read-only access",
  },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function formatExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function TeamSettingsPage() {
  const { user, fetchUser } = useUserStore();
  const companyId = user?.active_company || user?.company_id || "";
  const myRole = (user?.company_role || "").toLowerCase();

  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [callerIsOwner, setCallerIsOwner] = useState(false);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CompanyRole>("member");
  const [inviting, setInviting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<CompanyMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [newOwner, setNewOwner] = useState<CompanyMember | null>(null);
  const [ownerConfirmText, setOwnerConfirmText] = useState("");
  const [transferring, setTransferring] = useState(false);
  const companyName =
    useCompaniesStore((state) => state.companies.find((c) => c.id === companyId)?.company_name) ||
    "";
  // EP-1038: typing the company name guards against handing it over by mis-click.
  const ownerConfirmPhrase = companyName.trim() || "transfer";

  const meAsMember = useMemo(
    () => members.find((m) => m.id === user?.id),
    [members, user?.id]
  );
  const isOwner = callerIsOwner || Boolean(meAsMember?.is_owner);
  const canManage = isOwner || myRole === "admin" || meAsMember?.company_role === "admin";

  const load = useCallback(
    async (soft = false) => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      if (soft) setRefreshing(true);
      else setLoading(true);
      try {
        const [memberResult, inviteList] = await Promise.all([
          listCompanyMembers(companyId),
          listPendingInvites().catch(() => [] as PendingInvite[]),
        ]);
        setMembers(memberResult.members);
        setCallerIsOwner(Boolean(memberResult.caller_is_owner));
        setInvites(inviteList);
        setLoadError(null);
      } catch (error) {
        // A failed soft refresh keeps the list on screen; a failed first load replaces it.
        if (soft) showApiErrorToast(error, "Could not refresh the team");
        else setLoadError(error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId]
  );

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    void load();
  }, [load]);

  const inviteRoleOptions = ROLE_OPTIONS.filter(
    (opt) => opt.value !== "admin" || isOwner
  );

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter an email address");
      return;
    }
    setInviting(true);
    try {
      const result = await inviteCompanyMember(email.trim(), inviteRole);
      toast.success(
        result.email_sent
          ? `Invite sent to ${result.email}`
          : `Invite created for ${result.email} (email not sent — copy the link)`
      );
      setEmail("");
      setInviteRole("member");
      await load(true);
    } catch (error) {
      showApiErrorToast(error, "Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleCopyLink(invite: PendingInvite) {
    const link =
      invite.invite_link ||
      `${typeof window !== "undefined" ? window.location.origin : ""}/join?token=`;
    // Prefer current origin for local testing when server emitted production APP_BASE_URL
    let copyText = link;
    try {
      const url = new URL(link);
      if (typeof window !== "undefined" && url.pathname.startsWith("/join")) {
        copyText = `${window.location.origin}${url.pathname}${url.search}`;
      }
    } catch {
      /* keep original */
    }
    if (!copyText.includes("token=")) {
      toast.error("No invite link available");
      return;
    }
    try {
      await navigator.clipboard.writeText(copyText);
      setCopiedId(invite.id);
      toast.success("Invite link copied");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  async function handleRevoke(inviteId: string) {
    setRevokingId(inviteId);
    try {
      await revokeInvite(inviteId);
      toast.success("Invite revoked");
      await load(true);
    } catch (error) {
      showApiErrorToast(error, "Failed to revoke invite");
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRoleChange(member: CompanyMember, role: CompanyRole) {
    if (!companyId || member.company_role === role) return;
    setUpdatingUserId(member.id);
    try {
      await updateMemberRole(companyId, member.id, role);
      toast.success(`Updated ${memberDisplayName(member)} to ${roleLabel(role)}`);
      await load(true);
      if (member.id === user?.id) await fetchUser();
    } catch (error) {
      showApiErrorToast(error, "Failed to update role");
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleRemoveMember() {
    if (!companyId || !memberToRemove) return;
    setRemoving(true);
    try {
      await removeMember(companyId, memberToRemove.id);
      toast.success(`Removed ${memberDisplayName(memberToRemove)} from the team`);
      setMemberToRemove(null);
      await load(true);
    } catch (error) {
      showApiErrorToast(error, "Failed to remove member");
    } finally {
      setRemoving(false);
    }
  }

  function closeTransferDialog() {
    if (transferring) return;
    setNewOwner(null);
    setOwnerConfirmText("");
  }

  async function handleTransferOwnership() {
    if (!companyId || !newOwner) return;
    setTransferring(true);
    try {
      await transferOwnership(companyId, newOwner.id);
      toast.success(`${memberDisplayName(newOwner)} is now the owner. You remain an admin.`);
      setNewOwner(null);
      setOwnerConfirmText("");
      await load(true);
      await fetchUser();
    } catch (error) {
      showApiErrorToast(error, "Failed to transfer ownership");
    } finally {
      setTransferring(false);
    }
  }

  if (!companyId && !loading) {
    return (
      <div className="min-h-[70vh] px-6 sm:px-8 py-10">
        <div className="max-w-xl mx-auto rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">No active company</h1>
          <p className="mt-2 text-slate-500 text-sm leading-relaxed">
            Create or select a company in Settings before inviting teammates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-br from-[#eef2ff] via-white to-[#f8fafc]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl"
        />
        <div className="relative px-6 sm:px-8 py-8 sm:py-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80 mb-2">
              Company access
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Team
            </h1>
            <p className="mt-2 text-slate-500 max-w-xl text-sm sm:text-base leading-relaxed">
              Invite colleagues by email and assign roles. Admins manage the company;
              members build; viewers stay read-only.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur px-4 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Members
              </p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {loading || loadError != null ? "—" : members.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur px-4 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Pending
              </p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {loading || loadError != null ? "—" : invites.length}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl h-11 w-11 border-slate-200 bg-white/80"
              onClick={() => void load(true)}
              disabled={refreshing}
              aria-label="Refresh team"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-8 py-8 space-y-8 max-w-5xl">
        <SupportAccessCard />
        {canManage && (
          <section className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-primary/[0.06] to-transparent flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/25">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Invite someone
                </h2>
                <p className="text-sm text-slate-500">
                  They&apos;ll get an email with a secure join link (expires in 7 days).
                </p>
              </div>
            </div>
            <form onSubmit={handleInvite} className="p-6 sm:p-8 space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px_auto] gap-3 items-end">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Work email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Role
                  </label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as CompanyRole)}
                  >
                    <SelectTrigger className="w-full h-12 rounded-xl border-slate-200 bg-slate-50/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {inviteRoleOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex flex-col items-start py-0.5">
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-xs text-slate-500">{opt.hint}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={inviting}
                  className="h-12 rounded-xl px-6 font-semibold shadow-sm shadow-primary/20"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Send invite
                    </>
                  )}
                </Button>
              </div>
              {!isOwner && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Only the company owner can invite new admins.
                </p>
              )}
            </form>
          </section>
        )}

        {!canManage && !loading && (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-5 py-4 text-sm text-amber-900">
            You can view the team. Ask an admin or owner if you need to invite someone.
          </div>
        )}

        <section className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Members</h2>
                <p className="text-sm text-slate-500">People with access to this company</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading &&
              [1, 2, 3].map((i) => (
                <div key={i} className="px-6 sm:px-8 py-4 flex items-center gap-4">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
              ))}

            {!loading && loadError != null && (
              <QueryErrorState
                error={loadError}
                title="Couldn't load your team"
                onRetry={() => void load()}
              />
            )}

            {!loading && loadError == null && members.length === 0 && (
              <div className="px-6 sm:px-8 py-12 text-center text-slate-500 text-sm">
                No members found for this company yet.
              </div>
            )}

            {!loading &&
              loadError == null &&
              members.map((member) => {
                const name = memberDisplayName(member);
                const canEditRole =
                  canManage &&
                  !member.is_owner &&
                  member.id !== user?.id &&
                  (isOwner || member.company_role !== "admin");

                return (
                  <div
                    key={member.id}
                    className="px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-sky-500 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                        {initials(name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900 truncate">{name}</p>
                          {member.is_owner && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                              <Crown className="h-3 w-3" />
                              Owner
                            </span>
                          )}
                          {member.id === user?.id && (
                            <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[11px] font-semibold">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 truncate">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:justify-end">
                      {canEditRole ? (
                        <Select
                          value={(member.company_role as CompanyRole) || "member"}
                          onValueChange={(v) =>
                            void handleRoleChange(member, v as CompanyRole)
                          }
                          disabled={updatingUserId === member.id}
                        >
                          <SelectTrigger className="w-[140px] h-10 rounded-xl border-slate-200">
                            {updatingUserId === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.filter(
                              (opt) => opt.value !== "admin" || isOwner
                            ).map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                          {roleLabel(member.is_owner ? "admin" : member.company_role)}
                        </span>
                      )}
                      {/* EP-1038: only the owner can hand the company on. The
                          server also requires a verified member who doesn't
                          own another company, and says so if not. */}
                      {isOwner && !member.is_owner && member.id !== user?.id && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-xl h-10 text-amber-800 hover:text-amber-900 hover:bg-amber-50"
                          disabled={transferring}
                          onClick={() => setNewOwner(member)}
                          aria-label={`Make ${name} the owner`}
                        >
                          <Crown className="h-4 w-4" />
                          Make owner
                        </Button>
                      )}
                      {/* Same rule as editing the role: never the owner or
                          yourself, and only the owner can remove an admin. */}
                      {canEditRole && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-xl h-10 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={removing && memberToRemove?.id === member.id}
                          onClick={() => setMemberToRemove(member)}
                          aria-label={`Remove ${name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {canManage && (
          <section className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Pending invites
                </h2>
                <p className="text-sm text-slate-500">
                  Waiting for acceptance — copy the link if email delivery fails
                </p>
              </div>
            </div>

            {loading && (
              <div className="px-6 sm:px-8 py-4 space-y-3">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            )}

            {!loading && loadError == null && invites.length === 0 && (
              <div className="px-6 sm:px-8 py-10 text-center text-slate-500 text-sm">
                No pending invites. Send one above to get started.
              </div>
            )}

            {!loading && invites.length > 0 && (
              <div className="divide-y divide-slate-100">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="px-6 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{invite.email}</p>
                      <p className="text-sm text-slate-500">
                        {roleLabel(invite.role)} · expires {formatExpiry(invite.expires_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl h-10 border-slate-200"
                        onClick={() => void handleCopyLink(invite)}
                      >
                        {copiedId === invite.id ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        Copy link
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-xl h-10 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={revokingId === invite.id}
                        onClick={() => void handleRevoke(invite.id)}
                      >
                        {revokingId === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <Dialog
        open={newOwner !== null}
        onOpenChange={(open) => {
          if (!open) closeTransferDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer ownership?</DialogTitle>
            <DialogDescription>
              {newOwner
                ? `${memberDisplayName(newOwner)} (${newOwner.email}) will become the owner${
                    companyName ? ` of ${companyName}` : ""
                  }. You'll stay an admin, but only the new owner can manage admins or transfer it again. You'll both get an email.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Type <strong>{ownerConfirmPhrase}</strong> to confirm.
            </p>
            <Input
              value={ownerConfirmText}
              onChange={(e) => setOwnerConfirmText(e.target.value)}
              disabled={transferring}
              aria-label="Confirm company name"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={transferring}
              onClick={closeTransferDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={transferring || ownerConfirmText.trim() !== ownerConfirmPhrase}
              onClick={() => void handleTransferOwnership()}
            >
              {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
              Transfer ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (!open && !removing) setMemberToRemove(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member?</DialogTitle>
            <DialogDescription>
              {memberToRemove
                ? `${memberDisplayName(memberToRemove)} (${memberToRemove.email}) will lose access to this company. Their other workspaces are not affected.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={removing}
              onClick={() => setMemberToRemove(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={removing}
              onClick={() => void handleRemoveMember()}
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
