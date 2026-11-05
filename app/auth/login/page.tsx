"use client";

import * as z from "zod";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { Check, Eye, EyeOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";

import { Axios } from "@/app/config/axios";
import { setAccessToken } from "@/app/config/session";
import { Button } from "@/components/ui/button";
import AuthHeader from "@/components/auth-header";
import {
  getAppUrl,
  getProtectedRedirectRoute,
  isInviteJoinRedirect,
  safeRedirectPath,
} from "@/lib/utils";
import { FloatingLabelInput } from "@/components/floating-label-input";
import { GoogleButton, SubmitButton } from "@/components/auth-buttons";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof formSchema>;

function LoginForm() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const searchParams = useSearchParams();
  // Same-origin path only: redirectTo comes from the query string.
  const redirectTo = safeRedirectPath(searchParams?.get("redirectTo"));
  // Invite links pass the invited address so the user doesn't retype (or mistype) it.
  const prefillEmail = isInviteJoinRedirect(redirectTo) ? searchParams?.get("email") || "" : "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: prefillEmail,
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const formData = new FormData();

      formData.append("username", values.email);
      formData.append("password", values.password);

      return Axios.post("/auth/token", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSuccess: async (response) => {
      const { access_token } = response.data;

      setAccessToken(access_token);

      toast.success("Login successful", {
        position: "top-center",
      });

      const userDetailsRequest = await Axios.get("/auth/me");
      const userDetails = userDetailsRequest.data;

      // Invite accept must run before company onboarding — otherwise invitees
      // create their own company and never join the invited workspace.
      if (isInviteJoinRedirect(redirectTo)) {
        router.push(redirectTo!);
        return;
      }

      const finalRoute = getProtectedRedirectRoute(
        redirectTo || "/coreos",
        userDetails.is_superadmin_company
      );

      // Onboarding now only creates the company; the rest of the profile is filled
      // in from inside the app. `onboarding_completed` is only ever set by
      // /auth/onboarding/complete, which nothing calls any more, so gating on it
      // would send everyone back to onboarding forever. Check both id fields —
      // neither is reliably populated on its own.
      if (userDetails.company_id || userDetails.active_company) {
        router.push(finalRoute);
        return;
      }

      router.push("/onboarding");
    },
    onError: (error) => {
      // EP-1033: too many attempts (per IP, or this account is locked for a
      // while). The API says how long to wait; "check your credentials" would
      // send the user straight into more failed attempts.
      if (isAxiosError(error) && error.response?.status === 429) {
        // From auth_service the detail says how long to wait; nginx's own 429
        // has no JSON body, so fall back to a generic message.
        const detail = error.response.data?.detail;
        toast.error(
          typeof detail === "string"
            ? detail
            : "Too many attempts. Please wait a few minutes and try again.",
          { position: "top-center" }
        );
        return;
      }
      toast.error("Login failed. Please check your credentials.", {
        position: "top-center",
      });
      console.error("Login error:", error);
    },
  });

  function onSubmit(values: FormValues) {
    loginMutation.mutate(values);
  }

  const handleGoogleLogin = async () => {
    const baseUrl = `${getAppUrl()}/auth/success`;

    // Construct the redirect URI with proper parameter encoding
    const params = new URLSearchParams();
    if (redirectTo) {
      params.append("redirectTo", redirectTo);
    }
    const redirectUri = `${baseUrl}${params.toString() ? `?${params.toString()}` : ""}`;

    try {
      const response = await Axios.post(
        `/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`
      );

      const url = response.data.auth_url;
      router.push(url);
    } catch (error: unknown) {
      console.log(error);
      toast.error("Something went wrong. Please try again later");
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-[#F0F4FF] px-6 md:px-10" suppressHydrationWarning>
      <AuthHeader buttonText="Create Account" onButtonClick={() => router.push("/auth/signup")} />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md md:max-w-lg">
          <div className="flex flex-col gap-[0.521vw] mb-6">
            <h1 className="text-primary font-medium text-2xl md:text-3xl">Login</h1>
            <p className="text-soft-black text-base md:text-lg">Welcome back</p>
          </div>

          <GoogleButton text="Login with Google" onClick={handleGoogleLogin} />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <FloatingLabelInput label="Email" {...field} />
                        {field.value && z.string().email().safeParse(field.value).success && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <FloatingLabelInput
                          type={passwordVisible ? "text" : "password"}
                          label="Password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                          onClick={() => setPasswordVisible(!passwordVisible)}
                        >
                          {passwordVisible ? (
                            <EyeOff className="h-4 w-4 text-gray" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SubmitButton
                text={loginMutation.isPending ? "Logging in" : "Login"}
                disabled={!form.formState.isValid || loginMutation.isPending}
                isLoading={loginMutation.isPending}
              />
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
