"use client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function EmailForm() {
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof emailSchema>) {
    try {
      console.log("Email:", values.email);
    } catch (error) {
      console.error("Error updating email:", error);
    }
  }

  return (
    <div className="account-section-card">
      <div className="account-section-header">
        <div className="account-section-icon">
          <Mail className="w-4 h-4" />
        </div>
        <div>
          <h2 className="account-section-title">Email Address</h2>
          <p className="account-section-desc">Manage your primary login email address</p>
        </div>
      </div>

      <div className="account-section-body">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Input
                        placeholder="Enter your primary email address"
                        {...field}
                        className="account-input flex-1"
                        style={{ height: "44px" }}
                      />
                      <button
                        type="submit"
                        className="account-save-btn whitespace-nowrap"
                      >
                        Update Email
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-sm mt-1" />
                </FormItem>
              )}
            />
            <p className="text-xs text-gray-500 mt-2 font-medium">
              For your security, we will send an email to verify any change to your email address.
            </p>
          </form>
        </Form>
      </div>
    </div>
  );
}
