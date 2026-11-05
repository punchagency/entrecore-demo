"use client";

import { useEffect } from "react";
import { useUserStore } from "@/app/store/userStore";
import { COMPANY_ID } from "@/demo/data/tenant";

/**
 * Signs the visitor in as the demo user on first load, so every page can be
 * opened directly from a link. Logging out and back in (any credentials) works too.
 */
export function DemoSession() {
  const user = useUserStore((state) => state.user);
  const fetchUser = useUserStore((state) => state.fetchUser);

  useEffect(() => {
    if (window.location.pathname.startsWith("/auth/")) return;
    if (!localStorage.getItem("selectedCompanyId")) {
      localStorage.setItem("selectedCompanyId", COMPANY_ID);
    }
    if (!user) void fetchUser();
  }, [user, fetchUser]);

  return null;
}
