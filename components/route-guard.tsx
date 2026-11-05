"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCompaniesStore, Company } from "@/app/store/companiesStore";
import { useUserStore } from "@/app/store/userStore";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { companies, fetchCompanies} = useCompaniesStore();
  const { user } = useUserStore();
  const [company, setCompany] = useState<Company | null>(null);
  const isLoading = useCompaniesStore((state) => state.isLoading);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    const resolveCompany = () => {
      const companyId = localStorage.getItem("selectedCompanyId") || user?.active_company;
      if (companyId && companies.length > 0) {
        const matched = companies.find((c) => c.id === companyId);
        if (matched) {
          setCompany(matched);
        }
      }
    };

    resolveCompany();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedCompanyId") {
        resolveCompany();
      }
    };

    const handleCustomEvent = () => resolveCompany();

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleCustomEvent);
    };
  }, [companies, user?.active_company]);

  useEffect(() => {
    if (!mounted) return;

    if (user && pathname.startsWith("/support") && user.platform_role !== "superadmin") {
      router.replace("/settings");
    }

    if (isLoading || !company) return;

    const isProduction = process.env.NEXT_PUBLIC_APP_ENV === "production";
    const isSuperadminCompany = user?.is_superadmin_company ?? false;

    // Define hidden routes for external users in production
    const hiddenRoutes = [
      "/coreos",
      "/data-room",
      "/workflows",
      "/market",
      "/investor-access",
      "/guides",
      "/training",
      "/metrics",
      "/search",
      "/portfolio",
      "/diligence",
    ];

    if (isProduction && !isSuperadminCompany) {
      const isHidden = hiddenRoutes.some((route) => pathname.startsWith(route));
      if (isHidden) {
        router.replace("/drat");
      }
    }
  }, [pathname, company, isLoading, mounted, router, user, user?.is_superadmin_company, user?.platform_role]);

  // Optionally, you can return a loading state here if isLoading is true and it's a hidden route
  // to avoid flashing content. However, since the layout handles its own loading, returning children is usually fine.
  // We can return null to completely prevent flash if we are on a restricted route.

  if (mounted) {
    const isProduction =
      process.env.NEXT_PUBLIC_APP_ENV === "production"

    const isSuperadminCompany = user?.is_superadmin_company ?? false;

    const hiddenRoutes = [
      "/coreos",
      "/data-room",
      "/workflows",
      "/market",
      "/investor-access",
      "/guides",
      "/training",
      "/metrics",
      "/search",
      "/portfolio",
      "/diligence",
    ];

    if (isProduction && !isSuperadminCompany) {
      const isHidden = hiddenRoutes.some((route) => pathname.startsWith(route));
      if (isHidden) {
        return null;
      }
    }

    if (user && pathname.startsWith("/support") && user.platform_role !== "superadmin") {
      return null;
    }
  }

  return <>{children}</>;
}
