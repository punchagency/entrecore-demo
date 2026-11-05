"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  Webhook,
} from "lucide-react";
import {
  DRAT_ALERT_EVENT_CONFIGS,
  DratAlertEvent,
  DiscordWebhook,
  MAX_WEBHOOK_NAME_LENGTH,
  validateDiscordWebhookUrl,
  DiscordChannelRowErrors,
} from "../services/review-alert-settings-api";

export interface DiscordChannelItem extends DiscordWebhook {
  clientKey: string;
}

interface DiscordChannelCardProps {
  channel: DiscordChannelItem;
  index: number;
  /** Full channel list including self — used for duplicate-URL detection. */
  allChannels: DiscordChannelItem[];
  serverErrors?: DiscordChannelRowErrors;
  onChange: (updated: DiscordChannelItem) => void;
  onDelete: () => void;
}

export function DiscordChannelCard({
  channel,
  index,
  allChannels,
  serverErrors,
  onChange,
  onDelete,
}: DiscordChannelCardProps) {
  // New channels without server ID default to visible; saved ones default to masked
  const [revealUrl, setRevealUrl] = useState<boolean>(!channel.id);

  // Client-side validations
  const nameError = useMemo(() => {
    if (!channel.name.trim()) return "Channel name is required";
    if (channel.name.length > MAX_WEBHOOK_NAME_LENGTH) {
      return `Name must be ${MAX_WEBHOOK_NAME_LENGTH} characters or less`;
    }
    return null;
  }, [channel.name]);

  const urlError = useMemo(() => {
    return validateDiscordWebhookUrl(channel.url);
  }, [channel.url]);

  const eventsError = useMemo(() => {
    if (!channel.events || channel.events.length === 0) {
      return "Select at least one alert event";
    }
    return null;
  }, [channel.events]);

  // Duplicate URL & shared events detection
  const duplicateWarning = useMemo(() => {
    const rawUrl = channel.url.trim().toLowerCase();
    if (!rawUrl) return null;

    for (const other of allChannels) {
      if (other.clientKey === channel.clientKey) continue;
      if (other.url.trim().toLowerCase() === rawUrl) {
        const shared = channel.events.filter((e) => other.events.includes(e));
        if (shared.length > 0) {
          const sharedLabels = shared
            .map((k) => DRAT_ALERT_EVENT_CONFIGS.find((c) => c.key === k)?.label || k)
            .join(", ");
          const otherName = other.name.trim() || `Channel ${allChannels.indexOf(other) + 1}`;
          return `Entrecore sends each alert once per URL, so "${otherName}" and this channel share the same destination for ${sharedLabels} — duplicates will not be delivered twice.`;
        }
      }
    }
    return null;
  }, [channel.url, channel.events, channel.clientKey, allChannels]);

  const effectiveNameError = serverErrors?.name || (channel.name ? nameError : null);
  const effectiveUrlError = serverErrors?.url || (channel.url ? urlError : null);
  const effectiveEventsError = serverErrors?.events || eventsError;

  const handleToggleEvent = (eventKey: DratAlertEvent, checked: boolean) => {
    const currentEvents = new Set(channel.events);
    if (checked) {
      currentEvents.add(eventKey);
    } else {
      currentEvents.delete(eventKey);
    }
    onChange({
      ...channel,
      events: Array.from(currentEvents),
    });
  };

  const isEnabled = channel.enabled ?? true;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 bg-white ${
        !isEnabled
          ? "border-slate-200/70 bg-slate-50/40 opacity-80"
          : "border-slate-200 hover:border-slate-300 shadow-xs"
      }`}
    >
      {/* Channel Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-2 rounded-xl transition-colors ${
              isEnabled
                ? "bg-indigo-50 text-indigo-600"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <Webhook className="h-4 w-4 shrink-0" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">
                Channel {index + 1}
              </span>
              {channel.id ? (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 font-mono text-slate-500 border-slate-200"
                >
                  Saved
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 text-indigo-600 border-indigo-200 bg-indigo-50/50"
                >
                  New
                </Badge>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800 truncate">
              {channel.name.trim() || "Untitled Channel"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Enable / Mute Toggle */}
          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) =>
                onChange({
                  ...channel,
                  enabled: checked,
                })
              }
              aria-label={`Toggle alerts for ${channel.name || `channel ${index + 1}`}`}
              className="data-[state=checked]:bg-emerald-500 scale-90"
            />
            <span
              className={`text-xs font-medium select-none ${
                isEnabled ? "text-emerald-700" : "text-slate-400"
              }`}
            >
              {isEnabled ? "Active" : "Muted"}
            </span>
          </div>

          {/* Delete Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-9 w-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            aria-label={`Remove channel ${channel.name || index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Channel Form Fields */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Row 1: Channel Name */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor={`channel-name-${channel.clientKey}`}
              className="font-medium text-slate-700"
            >
              Channel Name <span className="text-rose-500">*</span>
            </label>
            <span
              className={`text-[11px] ${
                channel.name.length > MAX_WEBHOOK_NAME_LENGTH
                  ? "text-rose-600 font-semibold"
                  : "text-slate-400"
              }`}
            >
              {channel.name.length}/{MAX_WEBHOOK_NAME_LENGTH}
            </span>
          </div>
          <Input
            id={`channel-name-${channel.clientKey}`}
            type="text"
            value={channel.name}
            maxLength={MAX_WEBHOOK_NAME_LENGTH}
            onChange={(e) => onChange({ ...channel, name: e.target.value })}
            placeholder="e.g. Ops — failures or Accounting — filings"
            className={`rounded-xl h-10 text-sm bg-slate-50/50 border-slate-200 ${
              effectiveNameError ? "border-rose-300 focus-visible:ring-rose-200" : ""
            }`}
          />
          {effectiveNameError && (
            <p className="text-xs text-rose-600 flex items-center gap-1.5 mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {effectiveNameError}
            </p>
          )}
        </div>

        {/* Row 2: Webhook URL with Secret Masking & Toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor={`channel-url-${channel.clientKey}`}
              className="font-medium text-slate-700 flex items-center gap-1.5"
            >
              Webhook URL <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">
              discord.com/api/webhooks/...
            </span>
          </div>

          <div className="relative">
            <Input
              id={`channel-url-${channel.clientKey}`}
              type={revealUrl ? "text" : "password"}
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              value={channel.url}
              onChange={(e) => onChange({ ...channel, url: e.target.value })}
              placeholder="https://discord.com/api/webhooks/..."
              className={`rounded-xl h-10 pr-10 text-sm font-mono bg-slate-50/50 border-slate-200 ${
                effectiveUrlError ? "border-rose-300 focus-visible:ring-rose-200" : ""
              }`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setRevealUrl((prev) => !prev)}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg"
              title={revealUrl ? "Hide webhook token" : "Show webhook token"}
              aria-label={revealUrl ? "Hide webhook token" : "Show webhook token"}
            >
              {revealUrl ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>

          {effectiveUrlError && (
            <p className="text-xs text-rose-600 flex items-center gap-1.5 mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {effectiveUrlError}
            </p>
          )}

          {duplicateWarning && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-800 flex items-start gap-2 mt-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{duplicateWarning}</div>
            </div>
          )}
        </div>

        {/* Row 3: Subscribed Events */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">
              Subscribed Alerts <span className="text-rose-500">*</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {channel.events.length} of {DRAT_ALERT_EVENT_CONFIGS.length} selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {DRAT_ALERT_EVENT_CONFIGS.map((eventConfig) => {
              const isChecked = channel.events.includes(eventConfig.key);
              return (
                <label
                  key={eventConfig.key}
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer select-none transition-all ${
                    isChecked
                      ? "border-indigo-300 bg-indigo-50/40 text-slate-900 shadow-2xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleToggleEvent(eventConfig.key, checked === true)
                      }
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    />
                    <span className="text-xs font-semibold">
                      {eventConfig.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal pl-6 line-clamp-2">
                    {eventConfig.description}
                  </p>
                </label>
              );
            })}
          </div>

          {effectiveEventsError && (
            <p className="text-xs text-rose-600 flex items-center gap-1.5 mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {effectiveEventsError}
            </p>
          )}
        </div>

        {serverErrors?.general && (
          <p className="text-xs text-rose-600 flex items-center gap-1.5 mt-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {serverErrors.general}
          </p>
        )}
      </div>
    </div>
  );
}
