"use client";
import * as z from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Label } from "@radix-ui/react-label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { Axios } from "@/app/config/axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { CalendarIcon } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { useUserStore } from "@/app/store/userStore";

interface StatementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initialData?: FinancialStatement | null;
}

interface LineItem {
  account_name: string;
  account_code: string;
  amount: number;
  description: string;
}

interface FinancialStatement {
  id?: number;
  external_company_id: string;
  statement_type: string;
  period_start: string;
  period_end: string;
  reporting_currency: string;
  line_items: LineItem[];
}

const addFormSchema = z.object({
  external_company_id: z.string().min(1, "Company ID is required"),
  statement_type: z.string().min(1, "Statement type is required"),
  period_start: z.string().min(1, "Start date is required"),
  period_end: z.string().min(1, "End date is required"),
  reporting_currency: z.string().min(1, "Currency is required"),
  line_items: z.array(
    z.object({
      account_name: z.string().min(1, "Account name is required"),
      account_code: z.string().min(1, "Account number is required"),
      amount: z.number().min(1, "Amount is required"),
      description: z.string().min(1, "Description is required"),
    })
  ),
});

const editFormSchema = z
  .object({
    external_company_id: z.string().optional(),
    statement_type: z.string().optional(),
    period_start: z.string().optional(),
    period_end: z.string().optional(),
    reporting_currency: z.string().optional(),
    line_items: z
      .array(
        z.object({
          account_name: z.string().optional(),
          account_code: z.string().optional(),
          amount: z.number().optional(),
          description: z.string().optional(),
        })
      )
      .optional(),
  })
  .refine(
    (data) => {
      return (
        data.external_company_id ||
        data.statement_type ||
        data.period_start ||
        data.period_end ||
        data.reporting_currency ||
        data.line_items
      );
    },
    {
      message: "No changes made",
      path: ["external_company_id"],
    }
  );

type FormData = z.infer<typeof addFormSchema | typeof editFormSchema>;

export function StatementFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
}: StatementFormDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalData, setOriginalData] = useState<FinancialStatement | null>(null);
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const { user } = useUserStore();
  useEffect(() => {
    setSavedCompanyId(localStorage.getItem("selectedCompanyId") || user?.active_company || null);
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(mode === "add" ? addFormSchema : editFormSchema),
    defaultValues: {
      external_company_id: mode === "add" ? savedCompanyId || "" : "",
      statement_type: mode === "add" ? "income_statement" : "",
      period_start: "",
      period_end: "",
      reporting_currency: mode === "add" ? "USD" : "",
      line_items:
        mode === "add" ? [{ account_name: "", account_code: "", amount: 0, description: "" }] : [],
    },
  });

  useEffect(() => {
    if (mode === "edit" && initialData && open) {
      setOriginalData(initialData);

      form.reset({
        external_company_id: initialData.external_company_id || "",
        statement_type: initialData.statement_type || "",
        period_start: initialData.period_start || "",
        period_end: initialData.period_end || "",
        reporting_currency: initialData.reporting_currency || "",
        line_items: initialData.line_items || [],
      });
    } else if (mode === "add" && open) {
      form.reset({
        external_company_id: savedCompanyId || "",
        statement_type: "income_statement",
        period_start: "",
        period_end: "",
        reporting_currency: "USD",
        line_items: [{ account_name: "", account_code: "", amount: 0, description: "" }],
      });
    }
    form.clearErrors();
  }, [initialData, open, form, mode]);

  const addFinancialStatement = async (data: FinancialStatement) => {
    const response = await Axios.post("/data/financial-statements/", data);
    console.log(response);
    if (response.statusText === "Created") {
      toast.success("Financial statement added successfully");
      return response.data;
    } else {
      toast.error("Failed to add financial statement");
      throw new Error("Failed to add financial statement");
    }
  };

  const updateFinancialStatement = async (data: FinancialStatement & { id: number }) => {
    const response = await Axios.put(`/data/financial-statements/${data.id}`, data);
    if (response.statusText === "OK") {
      toast.success("Financial statement updated successfully");
      return response.data;
    } else {
      toast.error("Failed to update financial statement");
      throw new Error("Failed to update financial statement");
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: FinancialStatement) => {
      if (mode === "edit" && initialData?.id) {
        return updateFinancialStatement({ ...data, id: initialData.id } as FinancialStatement & {
          id: number;
        });
      } else {
        return addFinancialStatement(data);
      }
    },
    onSuccess: () => {
      toast.success(
        mode === "add"
          ? "Financial statement added successfully"
          : "Financial statement updated successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["financial-statements"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Error:", error);
      toast.error(
        mode === "add"
          ? "Failed to add financial statement"
          : "Failed to update financial statement"
      );
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (values: FormData) => {
    setIsSubmitting(true);

    try {
      const statementData: Partial<FinancialStatement> = {};

      if (mode === "edit") {
        if (values.external_company_id)
          statementData.external_company_id = values.external_company_id;
        if (values.statement_type) statementData.statement_type = values.statement_type;
        if (values.period_start) statementData.period_start = values.period_start;
        if (values.period_end) statementData.period_end = values.period_end;
        if (values.reporting_currency) statementData.reporting_currency = values.reporting_currency;
      } else {
        statementData.external_company_id = values.external_company_id!;
        statementData.statement_type = values.statement_type!;
        statementData.period_start = values.period_start!;
        statementData.period_end = values.period_end!;
        statementData.reporting_currency = values.reporting_currency!;
      }

      const payload = {
        statement: statementData,
        line_items:
          values.line_items?.map((item) => ({
            account_code: item.account_code,
            account_name: item.account_name,
            amount: item.amount,
            description: item.description,
          })) || [],
      };

      if (mode === "edit" && initialData?.id) {
        await mutation.mutateAsync({ ...payload, id: initialData.id } as any);
      } else {
        await mutation.mutateAsync(payload as any);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#EFF4FF] max-h-[85vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isSubmitting && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#EFF4FF] bg-opacity-70 z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-primary font-medium">Processing...</p>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add New Financial Statement" : "Edit Financial Statement"}
          </DialogTitle>
          <hr className="w-full border-gray-200 my-3" />
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="statement_type"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-sm font-bold">Statement Type</Label>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Select Statement Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income_statement">Income Statement</SelectItem>
                      <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
                      <SelectItem value="cash_flow">Cash Flow</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="period_start"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-sm font-bold">Period Start</Label>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          max={new Date().toISOString().split("T")[0]}
                          min="1900-01-01"
                          className="w-34 sm:w-full px-3 py-2 text-sm border border-input bg-white rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        />
                        <CalendarIcon
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-soft-black cursor-pointer"
                          onClick={(e: any) => {
                            const input = e.currentTarget.parentElement?.querySelector(
                              'input[type="date"]'
                            ) as HTMLInputElement;
                            if (input?.showPicker) {
                              input.showPicker();
                            } else {
                              input?.click();
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="absolute -bottom-6 left-0" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="period_end"
                render={({ field }) => (
                  <FormItem className="relative">
                    <Label className="text-sm font-bold">Period End</Label>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          max={new Date().toISOString().split("T")[0]}
                          min="1900-01-01"
                          className="w-34 sm:w-full px-3 py-2 text-sm border border-input bg-white rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        />
                        <CalendarIcon
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-soft-black cursor-pointer"
                          onClick={(e: any) => {
                            const input = e.currentTarget.parentElement?.querySelector(
                              'input[type="date"]'
                            ) as HTMLInputElement;
                            if (input?.showPicker) {
                              input.showPicker();
                            } else {
                              input?.click();
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="absolute -bottom-6 left-0" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reporting_currency"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-sm font-bold">Reporting Currency</Label>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Select Currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="line_items.0.amount"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-sm font-bold">Amount</Label>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Amount"
                      className="bg-white"
                      {...field}
                      disabled={mode === "edit"}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="line_items.0.account_name"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-sm font-bold">Account Name</Label>
                  <FormControl>
                    <Input
                      placeholder="Account Name"
                      className="bg-white"
                      {...field}
                      disabled={mode === "edit"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="line_items.0.account_code"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-sm font-bold">Account Number</Label>
                  <FormControl>
                    <Input
                      placeholder="Account Number"
                      className="bg-white"
                      {...field}
                      disabled={mode === "edit"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="line_items.0.description"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-sm font-bold ">Description</Label>
                  <FormControl>
                    <Textarea
                      placeholder="Description"
                      className="bg-white"
                      disabled={mode === "edit"}
                      {...field}
                      value={(field.value as string) || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="bg-primary text-white py-6 cursor-pointer w-full mt-4"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Processing..."
                : mode === "add"
                  ? "Add Financial Statement"
                  : "Update Financial Statement"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
