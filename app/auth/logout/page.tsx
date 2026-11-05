"use client";

import { toast } from "sonner";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { isAxiosError } from "axios";

import { Axios, clearClientSession, setLoggingOut } from "@/app/config/axios";
import { useUserStore } from "@/app/store/userStore";

const Logout = () => {
  const clearUser = useUserStore((state) => state.clearUser);

  useEffect(() => {
    const finishLogout = () => {
      clearUser();
      clearClientSession();
      toast.success("Logged out successfully");
      window.location.href = "/auth/login";
    };

    const handleLogout = async () => {
      setLoggingOut(true);
      try {
        await Axios.post("/auth/logout");
        finishLogout();
      } catch (error) {
        if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          finishLogout();
          return;
        }
        console.error("Logout error:", error);
        finishLogout();
      }
    };

    handleLogout();
  }, [clearUser]);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-[#F0F4FF]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="font-medium">Logging out...</p>
      </div>
    </div>
  );
};

export default Logout;
