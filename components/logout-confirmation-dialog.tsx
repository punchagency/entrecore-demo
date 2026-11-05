"use client";

import * as React from "react";
import { toast } from "sonner";
import { LogOut, AlertTriangle } from "lucide-react";
import { isAxiosError } from "axios";

import { Axios, clearClientSession, setLoggingOut } from "@/app/config/axios";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/app/store/userStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LogoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoutConfirmationDialog({ open, onOpenChange }: LogoutConfirmationDialogProps) {
  const clearUser = useUserStore((state) => state.clearUser);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const finishLogout = () => {
    clearUser();
    clearClientSession();
    toast.success("Logged out successfully");
    onOpenChange(false);
    // Hard navigation stops in-flight protected requests from toasting 401s
    window.location.href = "/auth/login";
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLoggingOut(true);
    try {
      await Axios.post("/auth/logout");
      finishLogout();
    } catch (error) {
      // Backend logout is idempotent; treat already-unauthenticated as success
      if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        finishLogout();
        return;
      }
      console.error("Logout error:", error);
      // Still clear local session so the user is not stuck authenticated in the UI
      finishLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-[#EFF4FF] p-0">
        <DialogHeader className="border-b pb-4 px-6 pt-6">
          <DialogTitle className="text-[22px] font-semibold">Confirm Logout</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#EFF4FF] border-2 border-[#3064F6] flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-[#3064F6]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-[#181818]">
                Are you sure you want to log out?
              </h3>
              <p className="text-sm text-gray-600">
                You will need to sign in again to access your account and data.
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1 h-[40px] cursor-pointer font-medium border-[#3064F6] text-[#3064F6] hover:bg-[#3064F6] hover:text-white"
            disabled={isLoggingOut}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLogout}
            className="flex-1 h-[40px] cursor-pointer font-medium bg-[#3064F6] hover:bg-[#3064F6]/90"
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Logging out...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
