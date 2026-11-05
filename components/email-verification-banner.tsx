"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MailWarning, X } from "lucide-react";

import { Axios } from "@/app/config/axios";
import { useUserStore } from "@/app/store/userStore";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "email_verification_banner_dismissed";

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * EP-1032: reminds an unverified user to confirm their email. Nothing is
 * restricted for unverified users; this is only a prompt. Dismissing hides it
 * for the rest of the browser session.
 */
export function EmailVerificationBanner() {
  const user = useUserStore((state) => state.user);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [sending, setSending] = useState(false);

  // Only when the API explicitly says unverified (not while the user is loading).
  if (!user || user.email_verified !== false || dismissed) return null;

  async function handleResend() {
    setSending(true);
    try {
      const { data } = await Axios.post<{ email_sent: boolean }>("/auth/verify-email-resend");
      if (data.email_sent) {
        toast.success(`Verification link sent to ${user?.email}`);
      } else {
        toast.error("We couldn't send the email right now. Please try again later.");
      }
    } catch {
      toast.error("We couldn't send the email right now. Please try again later.");
    } finally {
      setSending(false);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* the banner just comes back on the next page load */
    }
  }

  return (
    <div className="mx-4 mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 sm:flex-row sm:items-center">
      <MailWarning className="h-5 w-5 shrink-0" />
      <p className="flex-1 text-sm">
        Please verify your email address. We sent a link to <strong>{user.email}</strong>.
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg border-amber-300 bg-white"
          disabled={sending}
          onClick={() => void handleResend()}
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          Resend link
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-amber-900 hover:bg-amber-100"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
