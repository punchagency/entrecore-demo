"use client";

import { useEffect } from "react";
import { useUserStore } from "@/app/store/userStore";
import { COMPANY_ID } from "@/demo/data/tenant";

/**
 * Signs the visitor in as the demo user on first load, so every page can be
 * opened directly from a link. Logging out and back in (any credentials) works too.
 */
export function DemoSession() {
  const fetchUser = useUserStore((state) => state.fetchUser);

  // Always reload the user: a browser that visited an older demo build may
  // still hold that build's user in storage.
  useEffect(() => {
    if (window.location.pathname.startsWith("/auth/")) return;
    localStorage.setItem("selectedCompanyId", COMPANY_ID);
    void fetchUser();
  }, [fetchUser]);

  return null;
}
