"use client";

import { AxiosError } from "axios";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowRight, XCircle } from "lucide-react";

import { Axios } from "@/app/config/axios";
import { setAccessToken } from "@/app/config/session";
import { Button } from "@/components/ui/button";
import { isInviteJoinRedirect, parseAuthSuccessUrl, safeRedirectPath } from "@/lib/utils";

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F4FF]">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-xl text-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-[#3064F6]/5 rounded-full blur-sm" />
          <div className="relative mx-auto h-16 w-16 border-4 border-[#3064F6] border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Loading...</h2>
      </div>
    </div>
  );
}

function AuthContent() {
  const router = useRouter();
  // The URL (and the token in it) is scrubbed after the first read, so this must
  // run exactly once — React strict mode would otherwise re-run it on a clean URL.
  const startedRef = useRef(false);
  const [authState, setAuthState] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const handleAuth = async () => {
      try {
        // The backend appends a one-time code (EP-1042) to the frontend redirect
        // URI, which may already carry redirectTo=… — parse properly, not by regex.
        const { accessToken, code, error, redirectTo } = parseAuthSuccessUrl(
          window.location.href
        );
        // Nothing in the address is needed after this read.
        window.history.replaceState(null, "", window.location.pathname);

        if (error) {
          setAuthState("error");
          setErrorMessage("Google sign-in is unavailable right now. Please try again.");
          return;
        }

        let userDetails;
        if (code) {
          // One request swaps the code for the token AND the user, so this costs
          // the same single round trip the old /auth/me call did.
          const { data } = await Axios.post("/auth/google/exchange", { code });
          setAccessToken(data.access_token);
          userDetails = data.user;
        } else if (accessToken) {
          // An older backend still sending the token itself (rollout only).
          setAccessToken(accessToken);
          userDetails = (await Axios.get("/auth/me")).data;
        } else {
          setAuthState("error");
          setErrorMessage("No sign-in code received");
          return;
        }

        setAuthState("success");

        // Only ever navigate to a same-origin path (redirectTo is attacker-controllable).
        const target = safeRedirectPath(redirectTo);

        // Invite accept must run before company onboarding — otherwise invitees
        // create their own company and never join the invited workspace.
        if (isInviteJoinRedirect(target)) {
          router.push(target!);
          return;
        }

        // Onboarding now only creates the company; the rest of the profile is
        // filled in from inside the app, so `onboarding_completed` is never set
        // and can't be the gate here.
        if (userDetails.company_id || userDetails.active_company) {
          router.push(target || "/metrics");
        } else {
          router.push("/onboarding");
        }
      } catch (error) {
        setAuthState("error");
        if (error instanceof AxiosError) {
          setErrorMessage(
            error.response?.data?.detail || error.response?.data?.message || "Authentication failed"
          );
        } else {
          setErrorMessage("An unexpected error occurred");
        }
        console.error("Authentication error:", error);
      }
    };

    handleAuth();
  }, [router]);

  const renderContent = () => {
    if (authState === "loading") {
      return (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
            className="relative"
          >
            <div className="absolute inset-0 bg-[#3064F6]/5 rounded-full blur-sm" />
            <div className="relative mx-auto h-16 w-16 border-4 border-[#3064F6] border-t-transparent rounded-full animate-spin" />
          </motion.div>

          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-3xl font-bold text-gray-900"
          >
            Verifying...
          </motion.h2>
        </div>
      );
    }

    if (authState === "error") {
      return (
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
            className="relative"
          >
            <div className="absolute inset-0 bg-red-500/5 rounded-full blur-sm" />
            <XCircle className="relative mx-auto h-16 w-16 text-red-500" />
          </motion.div>

          <div className="space-y-3">
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-3xl font-bold text-gray-900"
            >
              Authentication Failed
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-sm text-gray-600"
            >
              {errorMessage}
            </motion.p>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="pt-4"
          >
            <Button onClick={() => router.push("/auth/login")} className="w-full group">
              <span>Try Again</span>
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="text-center space-y-6">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
          }}
          className="relative"
        >
          <div className="absolute inset-0 bg-[#3064F6]/5 rounded-full blur-sm" />
          <CheckCircle className="relative mx-auto h-16 w-16 text-[#3064F6]" />
        </motion.div>

        <div className="space-y-3">
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-3xl font-bold text-gray-900"
          >
            Welcome Back!
          </motion.h2>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-sm text-gray-600"
          >
            You have successfully logged in with Google
          </motion.p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="pt-4"
        >
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Redirecting to dashboard
            </motion.span>
            <motion.div
              animate={{
                opacity: [0, 1, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
              }}
              className="w-1.5 h-1.5 rounded-full bg-[#3064F6]"
            />
            <motion.div
              animate={{
                opacity: [0, 1, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
                delay: 0.2,
              }}
              className="w-1.5 h-1.5 rounded-full bg-[#3064F6]"
            />
            <motion.div
              animate={{
                opacity: [0, 1, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
                delay: 0.4,
              }}
              className="w-1.5 h-1.5 rounded-full bg-[#3064F6]"
            />
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F4FF]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.6,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="max-w-md w-full p-8 bg-white rounded-lg shadow-xl"
      >
        {renderContent()}

        {authState === "success" && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-8"
          >
            <Button onClick={() => router.push("/dashboard")} className="w-full group">
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthContent />
    </Suspense>
  );
}
