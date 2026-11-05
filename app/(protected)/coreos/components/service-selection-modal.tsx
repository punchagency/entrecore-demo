"use client";

import Image from "next/image";
import { toast } from "sonner";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Company } from "@/app/store/companiesStore";
import { BigQueryConfigDialog } from "./bigquery-config-dialog";
import { NetSuiteConfigDialog } from "./netsuite-config-dialog";
import { AirtableConfigDialog } from "./airtable-config-dialog";
import { NotionConfigDialog } from "./notion-config-dialog";
import { GoogleDriveConfigDialog } from "./google-drive-config-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const COMPATIBLE_SERVICE_IDS = [9, 27, 2, 28, 29];

const servicesList = [
  { id: 9, name: "Big Query", logo: "/svgs/brands/bigquery.svg" },
  { id: 27, name: "NetSuite", logo: "/svgs/netsuite.svg" },
  { id: 2, name: "Airtable", logo: "/svgs/brands/airtable.svg" },
  { id: 28, name: "Notion", logo: "/svgs/brands/notion.svg" },
  { id: 29, name: "Google Drive", logo: "/svgs/brands/google-drive.svg" },
  { id: 5, name: "Figma", logo: "/svgs/brands/figma.svg" },
  { id: 13, name: "App 1", logo: "/svgs/e-icon.svg" },
  { id: 14, name: "App 2", logo: "/svgs/e-icon.svg" },
  { id: 15, name: "App 3", logo: "/svgs/e-icon.svg" },
  { id: 26, name: "App 5", logo: "/svgs/e-icon.svg" },
  { id: 16, name: "App 4", logo: "/svgs/e-icon.svg" },
  { id: 4, name: "Gmail", logo: "/svgs/brands/gmail.svg" },
  { id: 31, name: "Google", logo: "/svgs/brands/google.svg" },
  { id: 10, name: "JPMorgan", logo: "/svgs/brands/jpm.svg" },
  { id: 7, name: "QuickBooks", logo: "/svgs/brands/qb.svg" },
  { id: 18, name: "Gmail 2", logo: "/svgs/brands/gmail.svg" },
  { id: 19, name: "Figma 2", logo: "/svgs/brands/figma.svg" },
  { id: 23, name: "JPMorgan 2", logo: "/svgs/brands/jpm.svg" },
  { id: 21, name: "QuickBooks 2", logo: "/svgs/brands/qb.svg" },
  { id: 24, name: "Notion 2", logo: "/svgs/brands/notion.svg" },
  { id: 22, name: "Google 2", logo: "/svgs/brands/google.svg" },
  { id: 17, name: "Airtable 2", logo: "/svgs/brands/airtable.svg" },
  { id: 11, name: "Global Shares", logo: "/svgs/brands/shape.svg" },
  { id: 25, name: "Global Shares 2", logo: "/svgs/brands/shape.svg" },
  { id: 12, name: "Funded House", logo: "/svgs/brands/funded-house.svg" },
  { id: 3, name: "Google Sheets", logo: "/svgs/brands/google-sheet.svg" },
];

interface Service {
  id: number;
  name: string;
  logo: string;
}

interface ServiceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceSelect: (service: Service) => void;
  selectedCompany?: Company | null;
}

export function ServiceSelectionModal({
  isOpen,
  onClose,
  onServiceSelect,
  selectedCompany,
}: ServiceSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showBigQueryConfig, setShowBigQueryConfig] = useState(false);
  const [showNetSuiteConfig, setShowNetSuiteConfig] = useState(false);
  const [showAirtableConfig, setShowAirtableConfig] = useState(false);
  const [showNotionConfig, setShowNotionConfig] = useState(false);
  const [showGoogleDriveConfig, setShowGoogleDriveConfig] = useState(false);

  const filteredServices = searchQuery
    ? servicesList.filter((service) =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : servicesList;

  const handleServiceSelect = (service: Service) => {
    if (service.id === 9) {
      setShowBigQueryConfig(true);
    } else if (service.id === 2) {
      setShowAirtableConfig(true);
    } else if (service.id === 27) {
      setShowNetSuiteConfig(true);
    } else if (service.id === 28) {
      setShowNotionConfig(true);
    } else if (service.id === 29) {
      setShowGoogleDriveConfig(true);
    } else {
      toast.error(`${service.name} connector not available`);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen && !showBigQueryConfig && !showNetSuiteConfig && !showAirtableConfig && !showNotionConfig && !showGoogleDriveConfig}
        onOpenChange={(open) => {
          if (!open) {
            setTimeout(() => {
              onClose();
            }, 0);
          }
        }}
      >
        <DialogContent
          className="sm:max-w-[750px] p-10 bg-white/90 backdrop-blur-3xl rounded-[2.5rem] border-white/60 shadow-[0_30px_100px_rgba(37,99,235,0.12)] border overflow-hidden [&>button]:hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            onClose();
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            onClose();
          }}
        >
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
            <Image src="/svgs/core-os.svg" alt="" width={300} height={100} />
          </div>

          <DialogHeader className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight text-gray-900">
                  Integrate <span className="text-blue-600">Enterprise</span> Assets
                </DialogTitle>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Scale your core operations across the network</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full bg-gray-50/50 hover:bg-white border border-gray-100/50 hover:border-gray-200 text-gray-400 hover:text-gray-900 transition-all shadow-sm -mt-2 -mr-2"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <div
            className="relative mb-10 group"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-10 group-focus-within:opacity-20 transition duration-500" />
            <div className="relative flex items-center bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm px-4">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100/50">
                <Search className="h-4 w-4 text-blue-600" />
              </div>
              <Input
                type="search"
                placeholder="Search for connectors, databases, and enterprise apps..."
                className="w-full h-14 bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-bold text-gray-800 placeholder:text-gray-400 placeholder:font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar pb-10">
            {filteredServices.map((service) => (
              <button
                key={service.id}
                className={cn(
                  "group relative flex flex-col items-center justify-center p-5 rounded-[1.8rem] transition-all duration-500 border",
                  COMPATIBLE_SERVICE_IDS.includes(service.id)
                    ? "bg-white/40 border-white/60 hover:bg-white hover:border-blue-200 hover:shadow-[0_15px_40px_rgba(37,99,235,0.08)]"
                    : "opacity-40 grayscale hover:grayscale-0 hover:opacity-100 hover:bg-red-50/30 hover:border-red-100"
                )}
                onClick={() => handleServiceSelect(service)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.8rem]" />

                <div className="relative w-12 h-12 mb-3 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 group-hover:scale-110 transition-transform duration-500 p-2">
                  <Image
                    src={service.logo}
                    alt={`${service.name} logo`}
                    width={40}
                    height={40}
                    className="object-contain w-full h-full"
                  />
                </div>
                <span className="text-[9px] font-black text-gray-400 group-hover:text-blue-600 uppercase tracking-widest text-center transition-colors">
                  {service.name}
                </span>

                {COMPATIBLE_SERVICE_IDS.includes(service.id) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-white/90 backdrop-blur-xl border-white/60 text-gray-900 font-bold uppercase tracking-widest text-[8px] px-2 py-1 rounded-lg shadow-xl">
                      Compatible
                    </TooltipContent>
                  </Tooltip>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <BigQueryConfigDialog
        isOpen={showBigQueryConfig}
        onClose={() => {
          setShowBigQueryConfig(false);
          onClose();
        }}
        onBack={() => setShowBigQueryConfig(false)}
        onServiceSelect={onServiceSelect}
        selectedCompany={selectedCompany}
      />

      <NetSuiteConfigDialog
        isOpen={showNetSuiteConfig}
        onClose={() => {
          setShowNetSuiteConfig(false);
          onClose();
        }}
        onBack={() => setShowNetSuiteConfig(false)}
        onServiceSelect={onServiceSelect}
        selectedCompany={selectedCompany}
      />

      <AirtableConfigDialog
        isOpen={showAirtableConfig}
        onClose={() => {
          setShowAirtableConfig(false);
          onClose();
        }}
        onBack={() => setShowAirtableConfig(false)}
        onServiceSelect={onServiceSelect}
        selectedCompany={selectedCompany}
      />

      <NotionConfigDialog
        isOpen={showNotionConfig}
        onClose={() => {
          setShowNotionConfig(false);
          onClose();
        }}
        onBack={() => setShowNotionConfig(false)}
        onServiceSelect={onServiceSelect}
        selectedCompany={selectedCompany}
      />

      <GoogleDriveConfigDialog
        isOpen={showGoogleDriveConfig}
        onClose={() => {
          setShowGoogleDriveConfig(false);
          onClose();
        }}
        onBack={() => setShowGoogleDriveConfig(false)}
        onServiceSelect={onServiceSelect}
        selectedCompany={selectedCompany}
      />
    </>
  );
}
