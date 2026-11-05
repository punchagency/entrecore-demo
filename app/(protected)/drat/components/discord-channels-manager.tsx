"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Webhook } from "lucide-react";
import {
  MAX_DISCORD_WEBHOOKS,
  DiscordChannelRowErrors,
} from "../services/review-alert-settings-api";
import {
  DiscordChannelCard,
  DiscordChannelItem,
} from "./discord-channel-card";

interface DiscordChannelsManagerProps {
  channels: DiscordChannelItem[];
  serverRowErrors?: Record<number, DiscordChannelRowErrors>;
  onChannelsChange: (channels: DiscordChannelItem[]) => void;
}

export function DiscordChannelsManager({
  channels,
  serverRowErrors,
  onChannelsChange,
}: DiscordChannelsManagerProps) {
  const isAtLimit = channels.length >= MAX_DISCORD_WEBHOOKS;

  const handleAddChannel = () => {
    if (isAtLimit) return;
    // Omit id when adding (Section 5) — server assigns them
    const newChannel: DiscordChannelItem = {
      clientKey: `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: "",
      url: "",
      events: ["drat_review_task_created"],
      enabled: true,
    };
    onChannelsChange([...channels, newChannel]);
  };

  const handleUpdateChannel = (index: number, updated: DiscordChannelItem) => {
    const next = [...channels];
    next[index] = updated;
    onChannelsChange(next);
  };

  const handleDeleteChannel = (index: number) => {
    const next = channels.filter((_, i) => i !== index);
    onChannelsChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Webhook className="h-4 w-4 text-slate-400" />
              Discord channels
            </h3>
            <Badge
              variant="outline"
              className={`text-xs font-mono ${
                isAtLimit
                  ? "bg-amber-50 text-amber-700 border-amber-300"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              {channels.length}/{MAX_DISCORD_WEBHOOKS}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Route document alerts to specific team channels in your Discord server.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleAddChannel}
          disabled={isAtLimit}
          className="rounded-xl border-dashed border-indigo-200 text-indigo-700 hover:bg-indigo-50/70 hover:border-indigo-300 shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add channel
        </Button>
      </div>

      {/* List or Empty State */}
      {channels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-3">
          <div className="p-3 bg-white rounded-2xl w-fit mx-auto shadow-xs border border-slate-200 text-slate-400">
            <Webhook className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <p className="text-sm font-medium text-slate-700">No Discord channels</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Alerts will still be emailed to the addresses above, and will always appear in the
              notifications panel.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddChannel}
            className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add first channel
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map((channel, index) => (
            <DiscordChannelCard
              key={channel.clientKey}
              channel={channel}
              index={index}
              allChannels={channels}
              serverErrors={serverRowErrors?.[index]}
              onChange={(updated) => handleUpdateChannel(index, updated)}
              onDelete={() => handleDeleteChannel(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
