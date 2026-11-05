"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useCompaniesStore, Company } from "@/app/store/companiesStore";
import { useUserStore } from "@/app/store/userStore";
import { useDataCountsStore } from "@/app/store/dataCountsStore";
import { setSelectedCompany as setSelectedCompanyInStorage } from "@/utils/api-utils";
import { PageWrapper } from "@/components/page-wrapper";

interface DataRoomHeaderProps {
  dataRoomTitles: { [key: string]: string };
  children?: React.ReactNode;
}

export function DataRoomHeader({ dataRoomTitles, children }: DataRoomHeaderProps) {
  const pathname = usePathname() ?? "";

  // Find the most specific title that matches the beginning of the pathname
  const matchingPath = Object.keys(dataRoomTitles)
    .filter(path => pathname.startsWith(path))
    .sort((a, b) => b.length - a.length)[0];

  const title = dataRoomTitles[matchingPath] || "Data Room";


  const { companies, fetchCompanies, fetchCompany } = useCompaniesStore();
  const { user } = useUserStore();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const { refreshAllCounts, resetCounts } = useDataCountsStore();

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

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedCompanyId") {
        updateSelectedCompany();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom event (some parts of the app use this)
    const handleCustomEvent = () => updateSelectedCompany();
    window.addEventListener("localStorageChange", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleCustomEvent);
    };
  }, [companies, user?.active_company]);

  const handleCompanySelect = async (company: Company) => {
    setSelectedCompanyInStorage(company);
    setSelectedCompany(company);

    // Explicitly refresh global states
    if (company.id) {
      resetCounts(); // Clear old counts immediately
      await fetchCompany();
      await refreshAllCounts(company.id);
    }
  };

  return (
    <PageWrapper
      title={title}
      icon={
        pathname !== "/data-room" ? (
          <Link
            href="/data-room"
            className="w-10 h-10 rounded-full bg-white/60 border border-white/60 shadow-sm flex items-center justify-center hover:bg-blue-600 hover:text-white hover:scale-110 transition-all duration-300 group"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 group-hover:text-white" />
          </Link>
        ) : undefined
      }
      onCompanySelect={handleCompanySelect}
    >
      <div className="bg-[#EFF4FF] h-full w-full">
        {children}
      </div>
    </PageWrapper>
  );
}
