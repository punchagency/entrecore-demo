"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Bell, Loader2, Plus, Save, Trash2, Webhook, AtSign } from "lucide-react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import {
  validateDiscordWebhookUrl,
  validateDiscordUserId,
} from "../services/notification-settings-api";
import {
  useAbstractionNotificationSettings,
  useUpdateAbstractionNotificationSettings,
} from "../hooks/use-abstraction-notification-settings";
import { listOcrConfigurations } from "../services/ocr-api";
import { QueryErrorState } from "@/components/query-error-state";

interface ProtocolOverrideRow {
  id: string;
  configId: string;
  url: string;
}

export function AbstractionNotificationSettingsCard() {
  const { data, isLoading, isError, error, refetch } = useAbstractionNotificationSettings();
  const updateMutation = useUpdateAbstractionNotificationSettings();
  const { data: ocrConfigs } = useQuery({
    queryKey: ["ocr-configurations"],
    queryFn: listOcrConfigurations,
  });

  const [enabled, setEnabled] = useState(true);
  const [defaultDiscordWebhookUrl, setDefaultDiscordWebhookUrl] = useState("");
  const [discordUserId, setDiscordUserId] = useState("");
  const [protocolRows, setProtocolRows] = useState<ProtocolOverrideRow[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data && !dirty) {
      setEnabled(data.enabled ?? true);
      setDefaultDiscordWebhookUrl(data.default_discord_webhook_url ?? "");
      setDiscordUserId(data.discord_user_id ?? "");

      if (data.protocol_discord_webhooks) {
        const rows = data.protocol_discord_webhooks.map((pw) => ({
          id: Math.random().toString(36).slice(2),
          configId: pw.ocr_config_id,
          url: pw.webhook_url,
        }));
        setProtocolRows(rows);
      } else {
        setProtocolRows([]);
      }
    }
  }, [data, dirty]);

  const defaultWebhookError = useMemo(
    () => validateDiscordWebhookUrl(defaultDiscordWebhookUrl),
    [defaultDiscordWebhookUrl]
  );

  const discordUserIdError = useMemo(
    () => validateDiscordUserId(discordUserId),
    [discordUserId]
  );

  const protocolRowErrors = useMemo(() => {
    return protocolRows.map((row) => {
      const urlError = validateDiscordWebhookUrl(row.url);
      const configError = !row.configId ? "Select a protocol" : null;
      return urlError || configError;
    });
  }, [protocolRows]);

  const hasProtocolErrors = protocolRowErrors.some((err) => err !== null);
  const duplicateProtocolsError = useMemo(() => {
    const seen = new Set<string>();
    for (const row of protocolRows) {
      if (row.configId) {
        if (seen.has(row.configId)) return "Duplicate protocols selected";
        seen.add(row.configId);
      }
    }
    return null;
  }, [protocolRows]);

  const hasErrors =
    defaultWebhookError !== null ||
    discordUserIdError !== null ||
    hasProtocolErrors ||
    duplicateProtocolsError !== null;

  const updateProtocolRow = (index: number, updates: Partial<ProtocolOverrideRow>) => {
    setProtocolRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...updates } : row)));
    setDirty(true);
  };

  const removeProtocolRow = (index: number) => {
    setProtocolRows((rows) => rows.filter((_, i) => i !== index));
    setDirty(true);
  };

  const addProtocolRow = () => {
    setProtocolRows((rows) => [
      ...rows,
      { id: Math.random().toString(36).slice(2), configId: "", url: "" },
    ]);
    setDirty(true);
  };

  const handleSave = () => {
    if (hasErrors) return;

    const normalizedUserId = discordUserId.trim() || null;
    const protocols = [];
    for (const row of protocolRows) {
      if (row.configId && row.url.trim()) {
        protocols.push({
          ocr_config_id: row.configId,
          webhook_url: row.url.trim(),
        });
      }
    }

    updateMutation.mutate(
      {
        enabled: enabled,
        default_discord_webhook_url: defaultDiscordWebhookUrl.trim() || null,
        discord_user_id: normalizedUserId,
        protocol_discord_webhooks: protocols.length > 0 ? protocols : null,
      },
      {
        onSuccess: (result) => {
          setDirty(false);
          toast.success(
            result.enabled
              ? "Notification settings saved"
              : "Notifications disabled"
          );
        },
        onError: (err) => {
          showApiErrorToast(err, "Failed to save notification settings");
        },
      }
    );
  };

  return (
    <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-white to-white">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                <Bell className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Notification Settings</h2>
              {!isLoading && enabled ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Enabled
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-500 border-slate-200">
                  Off
                </Badge>
              )}
              {dirty ? (
                <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
                  Unsaved
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              Configure where Discord alerts are sent for document abstractions. You can set a default channel
              and override it for specific protocols.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ) : isError ? (
            <QueryErrorState
              variant="inline"
              error={error}
              title="Couldn't load alert settings"
              onRetry={() => refetch()}
            />
          ) : (
            <>
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications-enabled" className="text-base font-semibold text-slate-800">
                    Enable notifications
                  </Label>
                  <p className="text-sm text-slate-500">Master switch for all abstraction notifications.</p>
                </div>
                <Switch
                  id="notifications-enabled"
                  checked={enabled}
                  onCheckedChange={(val) => {
                    setEnabled(val);
                    setDirty(true);
                  }}
                />
              </div>

              {/* Default Webhook */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Webhook className="h-4 w-4 text-slate-400" />
                    Company default Discord webhook
                    <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </p>
                </div>

                <div className="relative">
                  <Webhook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="url"
                    value={defaultDiscordWebhookUrl}
                    onChange={(e) => {
                      setDefaultDiscordWebhookUrl(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="https://discord.com/api/webhooks/..."
                    className={`pl-10 rounded-xl bg-slate-50/50 border-slate-200 h-11 ${
                      defaultWebhookError ? "border-rose-300 focus-visible:ring-rose-300" : ""
                    }`}
                    aria-label="Default Discord webhook URL"
                  />
                </div>

                {defaultWebhookError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    {defaultWebhookError}
                  </div>
                ) : null}
              </div>

              {/* Per-protocol Webhooks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Webhook className="h-4 w-4 text-slate-400" />
                    Per-protocol overrides
                  </p>
                  <span className="text-xs text-slate-400">
                    {protocolRows.length} override(s)
                  </span>
                </div>

                <div className="space-y-3">
                  {protocolRows.map((row, index) => (
                    <div key={row.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white">
                      <div className="w-full sm:w-1/3">
                        <Select
                          value={row.configId}
                          onValueChange={(val) => updateProtocolRow(index, { configId: val })}
                        >
                          <SelectTrigger className="w-full h-10 rounded-lg">
                            <SelectValue placeholder="Select protocol..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ocrConfigs?.map((config) => (
                              <SelectItem key={config.id} value={config.id ?? ""}>
                                {config.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex-1 w-full relative">
                        <Input
                          type="url"
                          value={row.url}
                          onChange={(e) => updateProtocolRow(index, { url: e.target.value })}
                          placeholder="Webhook URL"
                          className={`rounded-lg h-10 ${
                            protocolRowErrors[index] ? "border-rose-300 focus-visible:ring-rose-300" : ""
                          }`}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProtocolRow(index)}
                        className="h-10 w-10 shrink-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 self-end sm:self-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {duplicateProtocolsError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    {duplicateProtocolsError}
                  </div>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addProtocolRow}
                  className="rounded-xl border-dashed border-slate-300 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50/50 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add protocol override
                </Button>
              </div>

              {/* Discord User ID */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <AtSign className="h-4 w-4 text-slate-400" />
                    Discord User ID to Tag
                    <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </p>
                </div>

                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    value={discordUserId}
                    onChange={(e) => {
                      setDiscordUserId(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="e.g. 123456789012345678"
                    className={`pl-10 rounded-xl bg-slate-50/50 border-slate-200 h-11 ${
                      discordUserIdError ? "border-rose-300 focus-visible:ring-rose-300" : ""
                    }`}
                    aria-label="Discord User ID"
                  />
                </div>

                {discordUserIdError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    {discordUserIdError}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending || hasErrors || !dirty}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save settings
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
