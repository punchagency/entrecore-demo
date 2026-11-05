"use client";

import { AppListItem } from "./app-list-item";
import { Company } from "@/app/store/companiesStore";

const mockApps = [
  {
    id: 1,
    name: "Funded House",
    url: "fundedhouse.com",
    icon: "/svgs/brands/funded-house.svg",
  },
  {
    id: 2,
    name: "Airtable",
    url: "airtable.com",
    icon: "/svgs/brands/airtable.svg",
  },
  {
    id: 3,
    name: "Sales Tracker",
    url: "docs.google.com/spreadsheets",
    icon: "/svgs/brands/google.svg",
  },
  {
    id: 4,
    name: "Figma",
    url: "figma.com",
    icon: "/svgs/brands/figma.svg",
  },
  {
    id: 5,
    name: "Global Shares",
    url: "globalshares.com",
    icon: "/svgs/brands/shape.svg",
  },
  {
    id: 6,
    name: "Gmail",
    url: "gmail.com",
    icon: "/svgs/brands/gmail.svg",
  },
  {
    id: 7,
    name: "Google Workspace",
    url: "workspace.google.com",
    icon: "/svgs/brands/google.svg",
  },
  {
    id: 8,
    name: "J.P. Morgan",
    url: "jpmorgan.com",
    icon: "/svgs/brands/jpm.svg",
  },
  {
    id: 9,
    name: "BigQuery",
    url: "bigquery.cloud.google.com",
    icon: "/svgs/brands/bigquery.svg",
  },
];

interface SidePanelProps {
  favorites: Set<number>;
  toggleFavorite: (id: number) => void;
  dynamicApps: Record<
    number,
    {
      id: number;
      name: string;
      imagePath: string;
      color: string;
      isInner?: boolean;
      notifications: number;
    }
  >;
  onRemoveApp?: (appId: number, appName: string) => void;
  selectedCompany?: Company | null;
}

export function SidePanel({
  favorites,
  toggleFavorite,
  dynamicApps,
  onRemoveApp,
  selectedCompany,
}: SidePanelProps) {
  const links = mockApps.slice(0, 2);

  // Include all mockApps and dynamicApps (but avoid duplicates)
  const allApps = [
    ...mockApps,
    ...Object.values(dynamicApps)
      .filter((app) => !mockApps.some((mockApp) => mockApp.id === app.id))
      .map((app) => ({
        id: app.id,
        name: app.name,
        url: "",
        icon: app.imagePath,
      })),
  ];

  return (
    <div className="h-full overflow-y-auto bg-white/60 backdrop-blur-3xl border-l border-white/60 custom-scrollbar shadow-[-20px_0_40px_rgba(37,99,235,0.05)] relative z-20">
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(37, 99, 235, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(37, 99, 235, 0.25);
        }
      `}</style>

      <div className="p-6 md:p-8 space-y-10">
        {/* Favorites Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
            <h2 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">Favorites</h2>
          </div>
          <div className="space-y-3">
            {allApps
              .filter((app) => favorites.has(app.id))
              .map((app) => (
                <AppListItem
                  key={app.id}
                  icon={app.icon}
                  name={app.name}
                  url={app.url}
                  isFavorite={true}
                  onToggleFavorite={() => toggleFavorite(app.id)}
                  onRemove={onRemoveApp}
                  appId={app.id}
                  selectedCompany={selectedCompany}
                />
              ))}
            {allApps.filter((app) => favorites.has(app.id)).length === 0 && (
              <div className="p-8 border-2 border-dashed border-gray-200/50 rounded-3xl flex flex-col items-center justify-center text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No Favorites Yet</p>
                <p className="text-[10px] text-gray-400 mt-2">Star an app to see it here</p>
              </div>
            )}
          </div>
        </section>

        {/* Links Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">Quick Links</h2>
          </div>
          <div className="space-y-3">
            {links.map((link) => (
              <AppListItem
                key={link.id}
                icon={link.icon}
                name={link.name}
                url={link.url}
                isFavorite={favorites.has(link.id)}
                onToggleFavorite={() => toggleFavorite(link.id)}
                onRemove={onRemoveApp}
                appId={link.id}
                selectedCompany={selectedCompany}
              />
            ))}
          </div>
        </section>

        {/* All Apps Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">All Connectors</h2>
          </div>
          <div className="space-y-3">
            {allApps.map((app) => (
              <AppListItem
                key={app.id}
                icon={app.icon}
                name={app.name}
                url={app.url}
                isFavorite={favorites.has(app.id)}
                onToggleFavorite={() => toggleFavorite(app.id)}
                onRemove={onRemoveApp}
                appId={app.id}
                selectedCompany={selectedCompany}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
