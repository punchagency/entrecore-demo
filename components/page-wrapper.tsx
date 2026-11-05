"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useCompaniesStore, Company } from "@/app/store/companiesStore";
import { useUserStore } from "@/app/store/userStore";
import { setSelectedCompany as setSelectedCompanyInStorage } from "@/utils/api-utils";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/app/(protected)/notifications/components/notification-bell";

interface PageWrapperProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  headerClassName?: string;
  rightContent?: React.ReactNode;
  onCompanySelect?: (company: Company) => void;
}

export function PageWrapper({ children, title, icon, headerClassName, rightContent, onCompanySelect }: PageWrapperProps) {
  const { companies, fetchCompanies } = useCompaniesStore();
  const { user } = useUserStore();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (companies.length === 0) {
      fetchCompanies();
    }
  }, [fetchCompanies, companies.length]);

  useEffect(() => {
    const updateSelectedCompany = () => {
      const companyId = localStorage.getItem("selectedCompanyId") || user?.active_company;
      if (companyId && companies.length > 0) {
        const company = companies.find((c) => c.id === companyId);
        if (company) {
          setSelectedCompany(company);
        }
      }
    };

    updateSelectedCompany();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedCompanyId") {
        updateSelectedCompany();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    const handleCustomEvent = () => updateSelectedCompany();
    window.addEventListener("localStorageChange", handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleCustomEvent as EventListener);
    };
  }, [companies, user?.active_company]);

  const handleCompanySelect = async (company: Company) => {
    setSelectedCompanyInStorage(company);
    setSelectedCompany(company);
    if (onCompanySelect) {
      onCompanySelect(company);
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full relative">
      {/* Header */}
      <div className={cn("sticky top-0 z-40 w-full flex items-center justify-between py-4 md:py-5 px-4 md:px-8 lg:px-10 bg-white/40 backdrop-blur-xl border-b border-white/60 shadow-sm", headerClassName)}>
        <div className="flex items-center gap-4">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          {title && (
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-gray-900 uppercase">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          {rightContent}
          <NotificationBell />
          {selectedCompany && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="group flex items-center gap-3 px-4 py-6 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.08)] hover:bg-white/90 transition-all duration-500"
                >
                  <div className="relative w-7 h-7 md:w-8 md:h-8 rounded-xl overflow-hidden shadow-sm border border-white/60">
                    {selectedCompany.profile_image ? (
                      <Image
                        src={selectedCompany.profile_image}
                        alt={selectedCompany.company_name || "Company"}
                        fill
                        className="object-contain p-1"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[11px] font-black text-white">
                        {(selectedCompany.company_name || "C").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[9px] font-black text-blue-600/60 uppercase tracking-[0.2em] leading-none">
                      Workspace
                    </span>
                    <span className="text-sm font-bold text-gray-900 tracking-tight">
                      {selectedCompany.company_name || selectedCompany?.info?.company_name}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-white/95 backdrop-blur-2xl rounded-[1.8rem] border-white/60 shadow-[0_25px_60px_rgba(37,99,235,0.1)] p-2"
                sideOffset={10}
              >
                <div className="px-4 py-3 mb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    Select Organization
                  </span>
                </div>
                {companies.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => handleCompanySelect(company)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer focus:bg-blue-600 focus:text-white transition-all group mb-1"
                  >
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-sm border border-white/60 bg-white">
                      {company.profile_image ? (
                        <Image
                          src={company.profile_image}
                          alt={company.company_name || "Company"}
                          fill
                          className="object-contain p-1"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500 group-focus:bg-blue-500 group-focus:text-white transition-colors">
                          {(company.company_name || "C").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-bold tracking-tight">
                      {company.company_name || company?.info?.company_name}
                    </span>
                    {selectedCompany.id === company.id && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 group-focus:bg-white shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      <div className="flex-1 w-full">
        {children}
      </div>
    </div>
  );
}
