"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  Mail,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  User,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import {
  validateReviewAlertEmailsInput,
  validateDiscordWebhookUrl,
  validateDiscordUserId,
  MAX_DISCORD_WEBHOOKS,
  MAX_WEBHOOK_NAME_LENGTH,
  DRAT_ALERT_EVENT_CONFIGS,
  ReviewAlertSettingsUpdatePayload,
  parseReviewAlertApiError,
  DiscordChannelRowErrors,
} from "../services/review-alert-settings-api";
import {
  useReviewAlertSettings,
  useUpdateReviewAlertSettings,
} from "../hooks/use-review-alert-settings";
import {
  DiscordChannelsManager,
} from "./discord-channels-manager";
import { DiscordChannelItem } from "./discord-channel-card";
import { QueryErrorState } from "@/components/query-error-state";

const MAX_RECIPIENTS = 20;
const EMPTY_ROW = "";

function normalizeRows(rows: string[]): string[] {
  return rows.map((row) => row.trim()).filter(Boolean);
}

export function DratReviewAlertSettingsCard() {
  const { data, isLoading, isError, error, refetch } = useReviewAlertSettings();
  const updateMutation = useUpdateReviewAlertSettings();

  // Email recipients state
  const [emailRows, setEmailRows] = useState<string[]>([EMPTY_ROW]);
  const [emailsDirty, setEmailsDirty] = useState(false);

  // Discord channels state
  const [discordChannels, setDiscordChannels] = useState<DiscordChannelItem[]>([]);
  const [discordChannelsDirty, setDiscordChannelsDirty] = useState(false);

  // Company-wide Discord User ID to mention
  const [discordUserId, setDiscordUserId] = useState("");
  const [userIdDirty, setUserIdDirty] = useState(false);

  // Server error details mapped to rows
  const [serverRowErrors, setServerRowErrors] = useState<
    Record<number, DiscordChannelRowErrors>
  >({});

  // Sync state from server on initial load or reset
  const syncFromServer = () => {
    if (!data) return;
    const savedEmails = data.review_alert_emails;
    setEmailRows(savedEmails.length > 0 ? savedEmails : [EMPTY_ROW]);
    setEmailsDirty(false);

    const savedChannels: DiscordChannelItem[] = (data.discord_webhooks || []).map(
      (channel, idx) => ({
        id: channel.id ?? null,
        clientKey: channel.id || `server-ch-${idx}-${Date.now()}`,
        name: channel.name,
        url: channel.url,
        events: [...channel.events],
        enabled: channel.enabled ?? true,
      })
    );
    setDiscordChannels(savedChannels);
    setDiscordChannelsDirty(false);

    setDiscordUserId(data.review_alert_discord_user_id ?? "");
    setUserIdDirty(false);

    setServerRowErrors({});
  };

  useEffect(() => {
    if (data && !emailsDirty && !discordChannelsDirty && !userIdDirty) {
      syncFromServer();
    }
  }, [data]);

  const isDirty = emailsDirty || discordChannelsDirty || userIdDirty;

  // Email validations
  const normalizedEmails = useMemo(() => normalizeRows(emailRows), [emailRows]);
  const emailErrors = useMemo(
    () => validateReviewAlertEmailsInput(normalizedEmails.join("\n")),
    [normalizedEmails]
  );
  const canAddMoreEmails = emailRows.length < MAX_RECIPIENTS;

  // Discord User ID validation
  const discordUserIdError = useMemo(
    () => validateDiscordUserId(discordUserId),
    [discordUserId]
  );

  // Channel row validations
  const channelErrors = useMemo(() => {
    if (discordChannels.length > MAX_DISCORD_WEBHOOKS) {
      return `At most ${MAX_DISCORD_WEBHOOKS} channels are allowed`;
    }
    for (let i = 0; i < discordChannels.length; i++) {
      const ch = discordChannels[i];
      if (!ch.name.trim()) return `Channel ${i + 1} requires a name`;
      if (ch.name.length > MAX_WEBHOOK_NAME_LENGTH) {
        return `Channel ${i + 1} name cannot exceed ${MAX_WEBHOOK_NAME_LENGTH} characters`;
      }
      if (!ch.url.trim()) return `Channel ${i + 1} requires a webhook URL`;
      const urlErr = validateDiscordWebhookUrl(ch.url);
      if (urlErr) return `Channel ${i + 1} has an invalid webhook URL`;
      if (!ch.events || ch.events.length === 0) {
        return `Channel ${i + 1} must subscribe to at least one alert`;
      }
    }
    return null;
  }, [discordChannels]);

  const hasErrors =
    emailErrors.length > 0 ||
    discordUserIdError !== null ||
    channelErrors !== null;

  // Email list handlers
  const updateEmailRow = (index: number, value: string) => {
    setEmailRows((rows) => rows.map((row, i) => (i === index ? value : row)));
    setEmailsDirty(true);
  };

  const removeEmailRow = (index: number) => {
    setEmailRows((rows) => {
      const next = rows.filter((_, i) => i !== index);
      return next.length > 0 ? next : [EMPTY_ROW];
    });
    setEmailsDirty(true);
  };

  const addEmailRow = () => {
    if (!canAddMoreEmails) return;
    setEmailRows((rows) => [...rows, EMPTY_ROW]);
    setEmailsDirty(true);
  };

  // Discord channels change handler
  const handleChannelsChange = (nextChannels: DiscordChannelItem[]) => {
    setDiscordChannels(nextChannels);
    setDiscordChannelsDirty(true);
    setServerRowErrors({});
  };

  // Save handler with EP-1055 whole-list semantics
  const handleSave = () => {
    if (hasErrors) {
      if (emailErrors.length > 0) toast.error(emailErrors[0]);
      else if (discordUserIdError) toast.error(discordUserIdError);
      else if (channelErrors) toast.error(channelErrors);
      return;
    }

    // EP-1055 whole-list replace semantics: only include discord_webhooks when
    // the user actually touched channels. Omitting it leaves the backend list
    // untouched, protecting against silent concurrent-edit overwrites.
    // Preserve server-assigned id on edit; omit id for new channels.
    const payload: ReviewAlertSettingsUpdatePayload = {
      review_alert_emails: normalizedEmails,
      review_alert_discord_user_id: discordUserId.trim() || null,
      ...(discordChannelsDirty
        ? {
            discord_webhooks: discordChannels.map((c) => ({
              ...(c.id ? { id: c.id } : {}),
              name: c.name.trim(),
              url: c.url.trim(),
              events: c.events,
              enabled: c.enabled ?? true,
            })),
          }
        : {}),
    };

    updateMutation.mutate(payload, {
      onSuccess: (result) => {
        setEmailsDirty(false);
        setDiscordChannelsDirty(false);
        setUserIdDirty(false);
        setServerRowErrors({});

        // Reconcile local state with backend response (picks up server-assigned IDs)
        setEmailRows(
          result.review_alert_emails.length > 0
            ? result.review_alert_emails
            : [EMPTY_ROW]
        );
        const reconciledChannels: DiscordChannelItem[] = (
          result.discord_webhooks || []
        ).map((channel, idx) => ({
          id: channel.id ?? null,
          clientKey: channel.id || `ch-${idx}-${Date.now()}`,
          name: channel.name,
          url: channel.url,
          events: [...channel.events],
          enabled: channel.enabled ?? true,
        }));
        setDiscordChannels(reconciledChannels);
        setDiscordUserId(result.review_alert_discord_user_id ?? "");

        const parts: string[] = [];
        if (result.review_alert_emails.length > 0) {
          parts.push(`${result.review_alert_emails.length} email recipient(s)`);
        }
        const activeWebhooks = (result.discord_webhooks || []).filter(
          (w) => w.enabled ?? true
        ).length;
        if (activeWebhooks > 0) {
          parts.push(`${activeWebhooks} active Discord channel(s)`);
        }

        toast.success(
          parts.length > 0
            ? `Alerts updated: ${parts.join(" · ")}`
            : "Review alert settings saved"
        );
      },
      onError: (err) => {
        const parsed = parseReviewAlertApiError(err, "Failed to save alert settings");
        setServerRowErrors(parsed.rowErrors);
        showApiErrorToast(err, "Failed to save alert settings");
      },
    });
  };

  const handleReset = () => {
    syncFromServer();
  };

  const activeChannelsCount = discordChannels.filter((c) => c.enabled ?? true).length;

  return (
    <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50/80 via-white to-white">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                <Bell className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Review queue alerts</h2>

              {!isLoading && data ? (
                <>
                  {data.notifications_enabled ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {normalizedEmails.length} email{normalizedEmails.length === 1 ? "" : "s"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 border-slate-200">
                      No emails
                    </Badge>
                  )}
                  {activeChannelsCount > 0 ? (
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
                      {activeChannelsCount} Discord channel{activeChannelsCount === 1 ? "" : "s"}
                    </Badge>
                  ) : null}
                </>
              ) : null}

              {isDirty ? (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  Unsaved changes
                </Badge>
              ) : null}
            </div>

            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              Add team members who should get emailed when a document fails and lands in review.
              Manage Discord channels to broadcast filing updates and review alerts to specific rooms.
            </p>

            <Link
              href="/drat/review"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 w-fit"
            >
              <ShieldAlert className="h-4 w-4" />
              Open review queue
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </Link>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-8">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-36 w-full rounded-2xl" />
            </div>
          ) : isError ? (
            <QueryErrorState
              variant="inline"
              error={error}
              title="Couldn't load review alert settings"
              onRetry={() => refetch()}
            />
          ) : (
            <>
              {/* SECTION 1: Email Recipients */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      Email recipients
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Recipients receive an email when a document lands in review.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {normalizedEmails.length}/{MAX_RECIPIENTS}
                  </span>
                </div>

                <div className="space-y-2">
                  {emailRows.map((email, index) => (
                    <div key={`recipient-${index}`} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => updateEmailRow(index, e.target.value)}
                          placeholder="name@company.com"
                          className="pl-10 rounded-xl bg-slate-50/50 border-slate-200 h-10 text-sm"
                          aria-label={`Recipient email ${index + 1}`}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEmailRow(index)}
                        disabled={emailRows.length === 1 && !email.trim()}
                        className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                        aria-label="Remove recipient"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEmailRow}
                  disabled={!canAddMoreEmails}
                  className="rounded-xl border-dashed border-slate-300 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50/50"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add another recipient
                </Button>

                {emailErrors.length > 0 ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    {emailErrors[0]}
                  </div>
                ) : null}
              </div>

              <div className="h-px bg-slate-100" />

              {/* SECTION 2: Discord Channels Manager (EP-1055) */}
              <DiscordChannelsManager
                channels={discordChannels}
                serverRowErrors={serverRowErrors}
                onChannelsChange={handleChannelsChange}
              />

              <div className="h-px bg-slate-100" />

              {/* SECTION 3: Company-wide Discord User Mention */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      Discord User ID to Tag
                      <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Mention a specific team member on all alert webhooks (e.g. on call engineer).
                    </p>
                  </div>
                </div>

                <div className="relative max-w-md">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    value={discordUserId}
                    onChange={(e) => {
                      setDiscordUserId(e.target.value);
                      setUserIdDirty(true);
                    }}
                    placeholder="e.g. 123456789012345678"
                    className={`pl-10 rounded-xl bg-slate-50/50 border-slate-200 h-10 font-mono text-sm ${
                      discordUserIdError ? "border-rose-300 focus-visible:ring-rose-200" : ""
                    }`}
                    aria-label="Discord User ID"
                  />
                </div>

                {discordUserIdError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800 flex items-start gap-2 max-w-md">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    {discordUserIdError}
                  </div>
                ) : null}
              </div>

              {/* SECTION 4: Event Reference Guide (Rewritten for EP-1055) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-slate-700">
                  <Info className="h-4 w-4 text-indigo-500 shrink-0" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    How DRAT notification routing works
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <p className="font-semibold text-slate-900">Needs review</p>
                    <p className="text-slate-500 leading-relaxed">
                      Fires when a document lands in the human review queue due to unmatched entity,
                      low confidence, no rule matched, or missing Drive folder.
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <p className="font-semibold text-slate-900">Filed successfully</p>
                    <p className="text-slate-500 leading-relaxed">
                      Fires when a document is completely processed and safely filed to the target
                      Google Drive folder.
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <p className="font-semibold text-slate-900">Couldn't be processed</p>
                    <p className="text-slate-500 leading-relaxed">
                      Fires when an incoming file cannot enter the pipeline (unsupported type,
                      password protected, corrupted, or unreadable).
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Email recipients receive all failure and review queue alerts. Each Discord channel
                  chooses its own event subscriptions.
                </p>
              </div>

              {/* SECTION 5: Save & Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {channelErrors ? (
                    <span className="text-rose-700 font-medium flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {channelErrors}
                    </span>
                  ) : isDirty ? (
                    <span className="text-amber-700 font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      You have unsaved changes
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      All changes saved
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isDirty && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleReset}
                      disabled={updateMutation.isPending}
                      className="rounded-xl text-slate-600 hover:text-slate-900 text-sm"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Discard changes
                    </Button>
                  )}
                  <Button
                    onClick={handleSave}
                    disabled={updateMutation.isPending || hasErrors || !isDirty}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save alert settings
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

