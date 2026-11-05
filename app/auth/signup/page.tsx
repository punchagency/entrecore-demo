"use client";

import * as z from "zod";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { Axios } from "@/app/config/axios";
import AuthHeader from "@/components/auth-header";
import { buildAuthUrl, getAppUrl, isInviteJoinRedirect, safeRedirectPath } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import CustomPhoneInput from "@/components/phone-input";
import { FloatingLabelInput } from "@/components/floating-label-input";
import { GoogleButton, SubmitButton } from "@/components/auth-buttons";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  first_name: z
    .string()
    .min(3, "Must be at least 3 characters")
    .max(20, "Must be less than 20 characters"),
  last_name: z
    .string()
    .min(3, "Must be at least 3 characters")
    .max(20, "Must be less than 20 characters"),
  phone_number: z.string().min(10, "Invalid phone number"),
});

interface ValidationError {
  type: string;
  loc: string[];
  msg: string;
  input: Record<string, unknown>;
  url: string;
}

interface ErrorResponse {
  // FastAPI: a list for 422 validation errors, a plain string for handled errors.
  detail?: ValidationError[] | string;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams?.get("redirectTo"));
  // Invite links carry the invited address. Signing up with a different one
  // would only fail at the very end (the invite is bound to that email).
  const invitedEmail = isInviteJoinRedirect(redirectTo) ? searchParams?.get("email") || "" : "";
  const emailLocked = Boolean(invitedEmail);
  const loginHref = buildAuthUrl("/auth/login", {
    redirectTo,
    email: invitedEmail,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: invitedEmail,
      first_name: "",
      last_name: "",
      phone_number: "",
    },
  });

  const { mutate: submitSignup, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await Axios.post("/auth/signup", data);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem("signup_email", data.email);
      if (redirectTo) {
        localStorage.setItem("post_signup_redirect", redirectTo);
      } else {
        localStorage.removeItem("post_signup_redirect");
      }
      toast.success("Account created successfully!", {
        position: "top-center",
      });
      setTimeout(() => {
        router.push("/auth/create-password");
      }, 1500);
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      const detail = error.response?.data?.detail;

      // 422: one entry per invalid field.
      if (Array.isArray(detail)) {
        detail.forEach((err) => {
          const field = err.loc?.[1] as
            | "email"
            | "first_name"
            | "last_name"
            | "phone_number"
            | undefined;
          if (field && field in form.getValues()) {
            form.setError(field, { type: "manual", message: err.msg });
          }
        });
        toast.error("Please fix the errors in the form", {
          position: "top-center",
        });
        return;
      }

      // Handled errors arrive as a plain string, e.g. "Email already registered".
      if (typeof detail === "string" && /already registered/i.test(detail)) {
        form.setError("email", {
          type: "manual",
          message: "An account with this email already exists.",
        });
        toast.error("This email already has an account.", {
          position: "top-center",
          action: { label: "Log in", onClick: () => router.push(loginHref) },
        });
        // Invitees who already have an account just need to sign in and accept.
        if (redirectTo) {
          setTimeout(() => router.push(loginHref), 1800);
        }
        return;
      }

      toast.error(
        typeof detail === "string" && detail ? detail : "Something went wrong. Please try again.",
        { position: "top-center" }
      );
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    submitSignup(data);
  };

  const handleGoogleSignup = async () => {
    const baseUrl = `${getAppUrl()}/auth/success`;
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

  const isFormValid = form.formState.isValid && !isPending;

  return (
    <div className="w-full h-screen flex flex-col bg-[#F0F4FF] px-6 lg:px-8">
      <AuthHeader buttonText="Login" onButtonClick={() => router.push(loginHref)} />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md md:max-w-lg">
          <div className="flex flex-col gap-2 mb-6">
            <h1 className="text-primary font-medium text-2xl md:text-3xl">Signup</h1>
            <p className="text-soft-black text-base md:text-lg">Create your account</p>
          </div>

          <GoogleButton text="Sign up with Google" onClick={handleGoogleSignup} />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full">
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <div className="relative">
                          <FloatingLabelInput label="First Name" {...field} />
                          {field.value && !form.getFieldState("first_name").error && (
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
                  name="last_name"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <div className="relative">
                          <FloatingLabelInput label="Last Name" {...field} />
                          {field.value && !form.getFieldState("last_name").error && (
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
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <FloatingLabelInput
                          label="Email"
                          {...field}
                          readOnly={emailLocked}
                          className={emailLocked ? "bg-slate-50 text-slate-500" : undefined}
                        />
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
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <CustomPhoneInput value={field.value} onChange={field.onChange} />
                        {field.value &&
                          field.value.length >= 10 &&
                          !form.getFieldState("phone_number").error && (
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

              <SubmitButton
                text={isPending ? "Creating Account..." : "Create Account"}
                disabled={!isFormValid || isPending}
                isLoading={isPending}
              />
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F0F4FF]" />}>
      <SignupForm />
    </Suspense>
  );
}
