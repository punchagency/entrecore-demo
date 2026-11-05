"use client";

import Image from "next/image";
import { Star, ExternalLink, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Company } from "@/app/store/companiesStore";
import { ConnectorDropdown } from "./connector-dropdown";
import { cn } from "@/lib/utils";

interface AppListItemProps {
  icon: string;
  name: string;
  url: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onRemove?: (appId: number, appName: string) => void;
  appId?: number;
  selectedCompany?: Company | null;
}

export function AppListItem({
  icon,
  name,
  url,
  isFavorite,
  onToggleFavorite,
  onRemove,
  appId,
  selectedCompany,
}: AppListItemProps) {
  const getValidUrl = (urlString: string): string | null => {
    if (!urlString || urlString.trim() === "") {
      return null;
    }

    let formattedUrl = urlString.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      new URL(formattedUrl);
      return formattedUrl;
    } catch {
      return null;
    }
  };

  const validUrl = getValidUrl(url);
  const hasValidUrl = validUrl !== null;

  const handleUrlClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasValidUrl) {
      window.open(validUrl, "_blank");
    }
  };

  const handleItemClick = () => {
    if (hasValidUrl) {
      window.open(validUrl, "_blank");
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center justify-between p-3 rounded-2xl border transition-all duration-300",
        hasValidUrl
          ? "bg-white/40 border-white/40 hover:bg-white/60 hover:border-blue-200/50 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer"
          : "bg-gray-50/30 border-gray-200/20 cursor-default"
      )}
      onClick={handleItemClick}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="relative w-11 h-11 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
          <Image
            src={icon}
            alt={name}
            width={24}
            height={24}
            className="object-contain"
          />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-bold text-gray-900 truncate tracking-tight">{name}</span>
          <span className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-widest mt-0.5">
            {hasValidUrl ? url.replace(/https?:\/\//, "") : "Internal Tool"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {hasValidUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-white hover:text-blue-600 transition-all shadow-sm"
            onClick={handleUrlClick}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-white transition-all shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.();
          }}
        >
          <Star
            className={cn(
              "h-4 w-4 transition-colors",
              isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
            )}
          />
        </Button>
        <ConnectorDropdown
          appName={name}
          appId={appId}
          onToggleFavorite={onToggleFavorite}
          onRemove={onRemove}
          selectedCompany={selectedCompany}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-white transition-all shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </Button>
        </ConnectorDropdown>
      </div>
    </div>
  );
}
