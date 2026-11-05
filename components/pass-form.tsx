"use client";

import { z } from "zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { FaCircleCheck } from "react-icons/fa6";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

export default function PasswordForm() {
  const PasswordFormSchema = z
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

  const form = useForm<z.infer<typeof PasswordFormSchema>>({
    resolver: zodResolver(PasswordFormSchema),
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

  function onSubmit(values: z.infer<typeof PasswordFormSchema>) {
    console.log(values);
  }

  return (
    <div className="account-section-card">
      <div className="account-section-header">
        <div className="account-section-icon">
          <KeyRound className="w-4 h-4" />
        </div>
        <div>
          <h2 className="account-section-title">Change Password</h2>
          <p className="account-section-desc">Keep your account secure with a strong password</p>
        </div>
      </div>

      <div className="account-section-body">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="relative">
                    <label className="account-field-label">New Password</label>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={passwordVisible.password ? "text" : "password"}
                          placeholder="New password"
                          {...field}
                          className="account-input pr-10"
                          style={{ height: "44px" }}
                          onChange={(e) => {
                            field.onChange(e);
                            checkPasswordValidation(e.target.value);
                          }}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          onClick={() =>
                            setPasswordVisible((prev) => ({
                              ...prev,
                              password: !prev.password,
                            }))
                          }
                        >
                          {passwordVisible.password ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-sm mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="relative">
                    <label className="account-field-label">Confirm Password</label>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={passwordVisible.confirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          {...field}
                          className="account-input pr-10"
                          style={{ height: "44px" }}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          onClick={() =>
                            setPasswordVisible((prev) => ({
                              ...prev,
                              confirmPassword: !prev.confirmPassword,
                            }))
                          }
                        >
                          {passwordVisible.confirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-sm mt-1" />
                  </FormItem>
                )}
              />
            </div>

            <button
              type="submit"
              className="account-save-btn w-full sm:w-auto mt-2"
            >
              Update Password
            </button>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Password Requirements</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <li className="flex items-center gap-2">
                  <FaCircleCheck
                    size={16}
                    className={
                      validations.hasLowerCase
                        ? "text-[#4f46e5]"
                        : "text-gray-200"
                    }
                  />
                  <p className="text-gray-600 text-sm font-medium">At least 1 lower-case</p>
                </li>
                <li className="flex items-center gap-2">
                  <FaCircleCheck
                    size={16}
                    className={
                      validations.hasUpperCase
                        ? "text-[#4f46e5]"
                        : "text-gray-200"
                    }
                  />
                  <p className="text-gray-600 text-sm font-medium">At least 1 upper-case</p>
                </li>
                <li className="flex items-center gap-2">
                  <FaCircleCheck
                    size={16}
                    className={
                      validations.hasNumberOrSpecial
                        ? "text-[#4f46e5]"
                        : "text-gray-200"
                    }
                  />
                  <p className="text-gray-600 text-sm font-medium">
                    At least 1 number or symbol
                  </p>
                </li>
                <li className="flex items-center gap-2">
                  <FaCircleCheck
                    size={16}
                    className={
                      validations.hasMinLength
                        ? "text-[#4f46e5]"
                        : "text-gray-200"
                    }
                  />
                  <p className="text-gray-600 text-sm font-medium">Min 8 characters</p>
                </li>
              </ul>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
