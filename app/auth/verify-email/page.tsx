"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Axios } from "@/app/config/axios";
import { ensureAccessToken } from "@/app/config/session";
import { useUserStore } from "@/app/store/userStore";
import { Button } from "@/components/ui/button";
import AuthHeader from "@/components/auth-header";
import AuthFooter from "@/components/auth-footer";

type Status = "verifying" | "success" | "error";

/** EP-1032: the link in the verification email lands here. */
function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const fetchUser = useUserStore((state) => state.fetchUser);
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  // The token is single-use: React's dev double-mount must not send it twice,
  // or the second call fails and overwrites the success.
  const sent = useRef(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    // EP-1043: whether this browser has a session comes from the refresh cookie
    // (the token is no longer stored where this page could read it).
    void ensureAccessToken().then((accessToken) => setSignedIn(Boolean(accessToken)));
  }, []);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    Axios.post(`/auth/verify-email/${encodeURIComponent(token)}`)
      .then(async () => {
        setStatus("success");
        // Clears the "Verify your email" banner if this browser is signed in.
        if (await ensureAccessToken()) {
          try {
            await fetchUser();
          } catch {
            /* the banner updates on the next page load instead */
          }
        }
      })
      .catch(() => setStatus("error"));
  }, [token, fetchUser]);

  return (
    <div className="w-full h-screen flex flex-col bg-[#F0F4FF] px-6 md:px-10">
      <AuthHeader buttonText="Login" onButtonClick={() => router.push("/auth/login")} />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md md:max-w-lg flex flex-col items-center text-center gap-4">
          {status === "verifying" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h1 className="text-primary font-medium text-2xl md:text-3xl">
                Verifying your email…
              </h1>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <h1 className="text-primary font-medium text-2xl md:text-3xl">Email verified</h1>
              <p className="text-soft-black text-base md:text-lg">
                Thanks for confirming your email address.
              </p>
              <Button
                className="mt-2"
                onClick={() => router.push(signedIn ? "/coreos" : "/auth/login")}
              >
                {signedIn ? "Continue to Entrecore" : "Go to login"}
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-red-600" />
              <h1 className="text-primary font-medium text-2xl md:text-3xl">
                This link is invalid or was already used
              </h1>
              <p className="text-soft-black text-base md:text-lg">
                Sign in and use &ldquo;Resend link&rdquo; on the banner to get a new one. Only the
                most recent link works.
              </p>
              <Button
                className="mt-2"
                onClick={() => router.push(signedIn ? "/coreos" : "/auth/login")}
              >
                {signedIn ? "Back to Entrecore" : "Go to login"}
              </Button>
            </>
          )}
        </div>
      </div>
      <AuthFooter />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmail />
    </Suspense>
  );
}
