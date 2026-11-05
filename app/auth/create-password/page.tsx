"use client";

import * as z from "zod";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaCircleCheck } from "react-icons/fa6";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";

import { Axios } from "@/app/config/axios";
import { setAccessToken } from "@/app/config/session";
import { getApiErrorMessage } from "@/utils/api-error";
import { buildAuthUrl, isInviteJoinRedirect, safeRedirectPath } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AuthHeader from "@/components/auth-header";
import AuthFooter from "@/components/auth-footer";
import { SubmitButton } from "@/components/auth-buttons";
import { FloatingLabelInput } from "@/components/floating-label-input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const formSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
      .regex(
        /[0-9!@#$%^&*(),.?":{}|<>]/,
        "Password must contain at least 1 number or special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

/** The created user (subset). */
interface SetPasswordResponse {
  email: string;
  email_verified: boolean;
}

export default function CreatePasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState({
    password: false,
    confirmPassword: false,
  });
  const [validations, setValidations] = useState({
    hasLowerCase: false,
    hasUpperCase: false,
    hasNumberOrSpecial: false,
    hasMinLength: false,
  });

  useEffect(() => {
    const storedEmail = localStorage.getItem("signup_email");
    if (!storedEmail) {
      router.push("/auth/signup");
    } else {
      setEmail(storedEmail);
    }
  }, [router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const checkPasswordValidation = (password: string) => {
    setValidations({
      hasLowerCase: /[a-z]/.test(password),
      hasUpperCase: /[A-Z]/.test(password),
      hasNumberOrSpecial: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password),
      hasMinLength: password.length >= 8,
    });
  };

  const { mutate: setPassword, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await Axios.post<SetPasswordResponse>("/auth/signup/set-password", {
        email,
        password: data.password,
        confirm_password: data.confirmPassword,
      });
      return response.data;
    },
    onSuccess: async (data, variables) => {
      toast.success("Password set successfully!", {
        position: "top-center",
      });
      if (!data.email_verified) {
        toast.info(`We sent a verification link to ${email}. Please check your inbox.`, {
          position: "top-center",
        });
      }
      const signupEmail = email;
      localStorage.removeItem("signup_email");
      const postRedirect = safeRedirectPath(localStorage.getItem("post_signup_redirect"));
      localStorage.removeItem("post_signup_redirect");

      // Invitees just proved they own this password: sign them straight in and on
      // to the invite instead of making them type it again on the login page.
      if (postRedirect && signupEmail && isInviteJoinRedirect(postRedirect)) {
        try {
          const formData = new FormData();
          formData.append("username", signupEmail);
          formData.append("password", variables.password);
          const login = await Axios.post("/auth/token", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          setAccessToken(login.data.access_token);
          router.push(postRedirect);
          return;
        } catch (error) {
          console.error("Auto-login after signup failed, falling back to login page:", error);
        }
      }

      const loginUrl = buildAuthUrl("/auth/login", {
        redirectTo: postRedirect,
        email: postRedirect && isInviteJoinRedirect(postRedirect) ? signupEmail : null,
      });
      setTimeout(() => {
        router.push(loginUrl);
      }, 1500);
    },
    onError: (error: AxiosError<{ detail?: unknown; message?: string }>) => {
      const message = getApiErrorMessage(error, "Failed to set password. Please try again.");

      // The pending signup expired (or was lost). Retrying this step can never
      // succeed, so send the user back to re-enter their details.
      if (/invalid signup flow/i.test(message)) {
        const postRedirect = safeRedirectPath(localStorage.getItem("post_signup_redirect"));
        const invitedEmail = postRedirect && isInviteJoinRedirect(postRedirect) ? email : null;
        localStorage.removeItem("signup_email");
        toast.error("Your signup session expired. Please enter your details again.", {
          position: "top-center",
        });
        router.push(buildAuthUrl("/auth/signup", { redirectTo: postRedirect, email: invitedEmail }));
        return;
      }

      toast.error(message, { position: "top-center" });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setPassword(values);
  }

  if (!email) {
    return null;
  }

  return (
    <div className="w-full h-screen flex flex-col bg-[#F0F4FF] px-6 md:px-10">
      <AuthHeader buttonText="Login" onButtonClick={() => router.push("/auth/login")} />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md md:max-w-lg">
          <div className="flex flex-col gap-2 mb-6">
            <h1 className="text-primary font-medium text-2xl md:text-3xl">Password</h1>
            <p className="text-soft-black text-base md:text-lg">Create your password</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <FloatingLabelInput
                          label="Password"
                          type={passwordVisible.password ? "text" : "password"}
                          {...field}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            field.onChange(e);
                            checkPasswordValidation(e.target.value);
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                          onClick={() =>
                            setPasswordVisible((prev) => ({ ...prev, password: !prev.password }))
                          }
                        >
                          {passwordVisible.password ? (
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <FloatingLabelInput
                          label="Confirm Password"
                          type={passwordVisible.confirmPassword ? "text" : "password"}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                          onClick={() =>
                            setPasswordVisible((prev) => ({
                              ...prev,
                              confirmPassword: !prev.confirmPassword,
                            }))
                          }
                        >
                          {passwordVisible.confirmPassword ? (
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

              <div className="mt-8">
                <ul className="flex flex-col gap-2.5 w-full">
                  <li className="flex items-center gap-2.5">
                    <FaCircleCheck
                      size={20}
                      className={
                        validations.hasLowerCase
                          ? "text-primary"
                          : "text-white bg-gray rounded-full"
                      }
                    />
                    <p className="text-soft-black text-xs">At least 1 lower-case letter</p>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <FaCircleCheck
                      size={20}
                      className={
                        validations.hasUpperCase
                          ? "text-primary"
                          : "text-white bg-gray rounded-full"
                      }
                    />
                    <p className="text-soft-black text-xs">At least 1 upper-case letter</p>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <FaCircleCheck
                      size={20}
                      className={
                        validations.hasNumberOrSpecial
                          ? "text-primary"
                          : "text-white bg-gray rounded-full"
                      }
                    />
                    <p className="text-soft-black text-xs">
                      At least 1 number or special character letter (e.g @#$)
                    </p>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <FaCircleCheck
                      size={20}
                      className={
                        validations.hasMinLength
                          ? "text-primary"
                          : "text-white bg-gray rounded-full"
                      }
                    />
                    <p className="text-soft-black text-xs">At least 8 total characters</p>
                  </li>
                </ul>
              </div>

              <SubmitButton
                text={isPending ? "Setting Password..." : "Next"}
                disabled={!form.formState.isValid || isPending}
                isLoading={isPending}
              />
            </form>
          </Form>
        </div>
      </div>
      <AuthFooter />
    </div>
  );
}
