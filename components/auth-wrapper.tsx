"use client";
import { useEffect } from "react";
import { useUserStore } from "@/app/store/userStore";
import { ensureAccessToken } from "@/app/config/session";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, fetchUser, isLoading } = useUserStore();

  useEffect(() => {
    // EP-1043: a session is restored from the refresh cookie, not read from storage.
    void ensureAccessToken().then((token) => {
      if (token && !user && !isLoading) {
        fetchUser();
      }
    });
  }, []);

  return <>{children}</>;
}
