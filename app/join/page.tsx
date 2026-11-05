"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, LogIn, Users } from "lucide-react";

import {
  acceptCompanyInvite,
  extractTeamApiError,
  previewCompanyInvite,
  type InvitePreview,
} from "@/app/(protected)/settings/team/team-api";
import AuthHeader from "@/components/auth-header";
import { Button } from "@/components/ui/button";
import { Axios } from "@/app/config/axios";
import { ensureAccessToken, setAccessToken } from "@/app/config/session";
import { useUserStore } from "@/app/store/userStore";
import { buildAuthUrl, getProtectedRedirectRoute } from "@/lib/utils";
import { setSelectedCompany } from "@/utils/api-utils";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";
  const { fetchUser } = useUserStore();
  const acceptStartedRef = useRef(false);

  const [status, setStatus] = useState<
    "checking" | "joining" | "success" | "error" | "need-auth"
  >("checking");
  const [message, setMessage] = useState("");
  // "link": the invite itself is unusable (bad/expired/revoked) - retrying can't help.
  // "accept": accepting failed (wrong account, network, ...) - another account or retry can.
  const [errorKind, setErrorKind] = useState<"link" | "accept">("accept");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [preview, setPreview] = useState<InvitePreview | null>(null);

  const handleAccept = useCallback(async () => {
    if (!token || acceptStartedRef.current) return;
    acceptStartedRef.current = true;
    setStatus("joining");
    try {
      const result = await acceptCompanyInvite(token);
      setCompanyName(result.company_name || null);
      setRole(result.role);
      setAlreadyMember(Boolean(result.already_member));

      // Tenancy claims (company, role) are baked into the JWT, and other services
      // trust them. Swap to the token minted after joining before any further call,
      // otherwise the session keeps describing the user's previous company (or none).
      if (result.access_token) {
        setAccessToken(result.access_token);
      }

      // Persist selection for CoreOS switcher (id + data); join previously only set the id
      try {
        const profile = await Axios.get(`/auth/company/profile/${result.company_id}`);
        if (profile.data?.id) {
          setSelectedCompany(profile.data);
        } else {
          localStorage.setItem("selectedCompanyId", result.company_id);
        }
      } catch {
        localStorage.setItem("selectedCompanyId", result.company_id);
      }
      window.dispatchEvent(new Event("companyChanged"));
      await fetchUser();
      // Read the store after the refetch: a value captured before it is stale.
      const freshUser = useUserStore.getState().user;
      setStatus("success");
      toast.success(
        result.already_member ? "You're already part of this team" : "You're in — welcome to the team"
      );
      if (result.previous_company_id) {
        // Joining adds a membership; it never removes the one they came from.
        toast.info("Your previous workspace is still available — switch any time from the company switcher.");
      }
      const destination = getProtectedRedirectRoute("/coreos", freshUser?.is_superadmin_company);
      setTimeout(() => router.push(destination), 1200);
    } catch (error) {
      acceptStartedRef.current = false;
      const detail = extractTeamApiError(error, "Could not accept invite");
      setErrorKind("accept");
      setStatus("error");
      setMessage(detail);
      toast.error(detail);
    }
  }, [token, fetchUser, router]);

  useEffect(() => {
    if (!token) {
      setErrorKind("link");
      setStatus("error");
      setMessage("This invite link is missing a token. Ask your admin to send a new invite.");
      return;
    }

    let cancelled = false;

    // Not signed in: look the invite up so we can say who invited them, lock the
    // signup email to the invited address, and skip "create account" for people
    // who already have one. A dead link is reported now, not after a full signup.
    const showInvitePreview = () =>
      previewCompanyInvite(token)
        .then((data) => {
          if (cancelled) return;
          setPreview(data);
          setCompanyName(data.company_name || null);
          setRole(data.role);
          setStatus("need-auth");
        })
        .catch((error) => {
          if (cancelled) return;
          setErrorKind("link");
          setMessage(extractTeamApiError(error, "This invite link is not valid."));
          setStatus("error");
        });

    // EP-1043: the token isn't stored in the browser any more; a fresh tab asks
    // the refresh cookie whether there is a session.
    void ensureAccessToken().then((accessToken) => {
      if (cancelled) return;
      if (accessToken) {
        void handleAccept();
        return;
      }
      void showInvitePreview();
    });

    return () => {
      cancelled = true;
    };
    // Auto-accept once per token when authenticated; handleAccept is ref-guarded.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run on token only
  }, [token]);

  const joinPath = `/join?token=${token}`;
  const authParams = { redirectTo: joinPath, email: preview?.email };
  const loginHref = buildAuthUrl("/auth/login", authParams);
  const signupHref = buildAuthUrl("/auth/signup", authParams);
  const hasAccount = Boolean(preview?.account_exists);

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#F0F4FF] px-6 md:px-10">
      <AuthHeader
        buttonText="Login"
        onButtonClick={() => router.push(loginHref)}
      />

      <div className="flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-lg">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_24px_80px_-32px_rgba(48,100,246,0.45)]">
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-36 bg-gradient-to-br from-primary via-[#4f7cff] to-sky-400"
            />
            <div
              aria-hidden
              className="absolute -right-10 top-8 h-40 w-40 rounded-full bg-white/15 blur-2xl"
            />

            <div className="relative px-8 pt-10 pb-8">
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-lg shadow-primary/20">
                <Users className="h-7 w-7" />
              </div>

              {status === "checking" && (
                <div className="flex items-center gap-3 text-slate-600 py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Checking your invite…
                </div>
              )}

              {status === "need-auth" && (
                <>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {companyName ? `Join ${companyName}` : "You\u2019re invited"}
                  </h1>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    {companyName ? (
                      <>
                        You&apos;ve been invited to join{" "}
                        <span className="font-semibold text-slate-800">{companyName}</span>
                        {role ? (
                          <>
                            {" "}as <span className="font-semibold text-slate-800">{role}</span>
                          </>
                        ) : null}
                        .{" "}
                      </>
                    ) : null}
                    {hasAccount
                      ? "Sign in to your Entrecore account to accept."
                      : "Create your account to accept."}
                  </p>
                  {preview?.email && (
                    <p className="mt-3 text-sm text-slate-500">
                      Invited email:{" "}
                      <span className="font-medium text-slate-700">{preview.email}</span>
                    </p>
                  )}
                  <div className="mt-8 flex flex-col gap-3">
                    <Button
                      className="h-12 rounded-xl font-semibold shadow-sm shadow-primary/25"
                      onClick={() => router.push(hasAccount ? loginHref : signupHref)}
                    >
                      {hasAccount ? <LogIn className="h-4 w-4" /> : null}
                      {hasAccount ? "Sign in to accept" : "Create an account"}
                    </Button>
                    {!hasAccount && (
                      <Button
                        variant="outline"
                        className="h-12 rounded-xl border-slate-200 font-semibold"
                        onClick={() => router.push(loginHref)}
                      >
                        I already have an account
                      </Button>
                    )}
                  </div>
                </>
              )}

              {status === "joining" && (
                <div className="flex items-center gap-3 text-slate-600 py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Joining company…
                </div>
              )}

              {status === "success" && (
                <>
                  <div className="flex items-center gap-2 text-emerald-600 mb-3">
                    <CheckCircle2 className="h-6 w-6" />
                    <span className="font-semibold">
                      {alreadyMember ? "You\u2019re already on the team" : "You\u2019re on the team"}
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {companyName || "Welcome aboard"}
                  </h1>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    Joined as <span className="font-semibold text-slate-800">{role}</span>.
                    Taking you to the app…
                  </p>
                </>
              )}

              {status === "error" && (
                <>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    Invite unavailable
                  </h1>
                  <p className="mt-3 text-slate-600 leading-relaxed">{message}</p>
                  <div className="mt-8 flex flex-col gap-3">
                    {errorKind === "accept" && (
                      <>
                        <Button
                          className="h-12 rounded-xl font-semibold shadow-sm shadow-primary/25"
                          onClick={() => {
                            setMessage("");
                            acceptStartedRef.current = false;
                            setStatus("joining");
                            void handleAccept();
                          }}
                        >
                          Try again
                        </Button>
                        <Button
                          variant="outline"
                          className="h-12 rounded-xl border-slate-200 font-semibold"
                          onClick={() => router.push(buildAuthUrl("/auth/login", authParams))}
                        >
                          Try another account
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      className="h-12 rounded-xl border-slate-200"
                      asChild
                    >
                      <Link href={errorKind === "link" ? "/auth/login" : "/settings"}>
                        {errorKind === "link" ? "Go to login" : "Back to settings"}
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Having trouble? Ask your admin to resend the invite from{" "}
            <span className="font-medium text-slate-700">Settings → Team</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F0F4FF] flex items-center justify-center text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
          Loading invite…
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
