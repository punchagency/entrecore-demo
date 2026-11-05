"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getVerticalConfig } from "@/utils/vertical-constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerticalBadgesProps {
  /** Array of vertical keys to display (e.g. ["finance", "sales"]) */
  verticalKeys: string[];
  /** Maximum badges to show before collapsing */
  max?: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional class names */
  className?: string;
  /** Whether badges should show tooltips */
  showTooltips?: boolean;
  /** Callback when a badge is clicked (e.g. to filter) */
  onBadgeClick?: (key: string) => void;
  /** Show the colored dot before the name */
  showDot?: boolean;
}

export function VerticalBadges({
  verticalKeys,
  max = 3,
  size = "sm",
  className,
  showTooltips = false,
  onBadgeClick,
  showDot = true,
}: VerticalBadgesProps) {
  if (!verticalKeys || verticalKeys.length === 0) return null;

  const visible = verticalKeys.slice(0, max);
  const overflow = verticalKeys.length - max;

  const sizeClasses = {
    sm: "text-[9px] px-2 py-0.5",
    md: "text-[10px] px-2.5 py-0.5",
    lg: "text-xs px-3 py-1",
  };

  const dotSizes = {
    sm: "w-1 h-1",
    md: "w-1.5 h-1.5",
    lg: "w-2 h-2",
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5 items-center", className)}>
      {visible.map((key) => {
        const cfg = getVerticalConfig(key);
        const badge = (
          <Badge
            key={key}
            variant="outline"
            className={cn(
              "rounded-full font-black uppercase tracking-wider border",
              "transition-all duration-200",
              sizeClasses[size],
              cfg.bgClass,
              cfg.textClass,
              cfg.borderClass,
              onBadgeClick && "cursor-pointer hover:scale-105 hover:shadow-sm"
            )}
            onClick={() => onBadgeClick?.(key)}
          >
            {showDot && (
              <span
                className={cn("rounded-full mr-1", cfg.dotClass, dotSizes[size])}
              />
            )}
            {cfg.name}
          </Badge>
        );

        if (showTooltips) {
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>{badge}</TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-slate-900 text-white border-0 rounded-xl px-3 py-2 shadow-xl"
              >
                <p className="text-xs font-bold">{cfg.name}</p>
              </TooltipContent>
            </Tooltip>
          );
        }

        return badge;
      })}

      {overflow > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full font-bold bg-slate-50 text-slate-500 border-slate-200",
                sizeClasses[size]
              )}
            >
              +{overflow}
            </Badge>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-slate-900 text-white border-0 rounded-xl px-3 py-2 shadow-xl"
          >
            <div className="space-y-1">
              {verticalKeys.slice(max).map((key) => {
                const cfg = getVerticalConfig(key);
                return (
                  <p key={key} className="text-xs font-medium flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dotClass)} />
                    {cfg.name}
                  </p>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
