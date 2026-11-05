"use client";

import * as z from "zod";
import { toast } from "sonner";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { FaCircleCheck } from "react-icons/fa6";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";

import { Axios } from "@/app/config/axios";
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

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await Axios.post("/auth/reset-password", {
        token,
        new_password: values.password,
      });

      toast.success("Password reset successful! Please login with your new password.");
      router.push("/auth/login");
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Failed to reset password. Please try again.");
    }
  }

  return (
    <div className="w-full h-screen flex flex-col bg-[#F0F4FF] px-6 md:px-10">
      <AuthHeader buttonText="Login" onButtonClick={() => router.push("/auth/login")} />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md md:max-w-lg">
          <div className="flex flex-col gap-[0.521vw] mb-6">
            <h1 className="text-primary font-medium text-2xl md:text-3xl">Reset Password</h1>
            <p className="text-soft-black text-base md:text-lg">Set a new password</p>
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

              <SubmitButton text="Next" />
            </form>
          </Form>
        </div>
      </div>
      <AuthFooter />
    </div>
  );
}

export default function CreatePasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
