"use client";
import * as z from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Label } from "@radix-ui/react-label";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Axios } from "@/app/config/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useUserStore } from "@/app/store/userStore";
import { useDataCountsStore } from "@/app/store/dataCountsStore";
import {
  Building2,
  Globe,
  Tag,
  AlignLeft,
  Database,
  FileText,
  Activity,
  ShieldCheck,
  Briefcase,
  Loader2
} from "lucide-react";

interface KnowledgeGraphFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initialData?: any;
}

const addFormSchema = z.object({
  function: z.string().min(1, "Function is required"),
  company: z.string().min(1, "Company is required"),
  domain: z.string().min(1, "Domain is required"),
  term: z.string().min(1, "Term is required"),
  description: z.string().min(1, "Description is required"),
  data_set: z.string().min(1, "Dataset is required"),
  guide_name: z.string().min(1, "Guide is required"),
  quality: z.string().min(1, "Quality is required"),
  rules: z.string().min(1, "Rules is required"),
});

const editFormSchema = z
  .object({
    function: z.string().optional(),
    company: z.string().optional(),
    domain: z.string().optional(),
    term: z.string().optional(),
    description: z.string().optional(),
    data_set: z.string().optional(),
    guide_name: z.string().optional(),
    quality: z.string().optional(),
    rules: z.string().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be modified",
  });

type FormData = z.infer<typeof addFormSchema | typeof editFormSchema>;

export function KnowledgeGraphFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
}: KnowledgeGraphFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const updateKnowledgeGraphTimestamp = useDataCountsStore(state => state.updateKnowledgeGraphTimestamp);

  const form = useForm<FormData>({
    resolver: zodResolver(mode === "add" ? addFormSchema : editFormSchema),
    defaultValues: {
      function: initialData?.function,
      company: initialData?.company || "",
      domain: initialData?.domain || "",
      term: initialData?.term || "",
      description: initialData?.description || "",
      data_set: initialData?.data_set || "",
      guide_name: initialData?.guide_name || "",
      quality: initialData?.quality || "",
      rules: initialData?.rules || "",
    },
  });

  useEffect(() => {
    if (initialData && open) {
      form.reset({
        function: initialData.function,
        company: initialData.company,
        domain: initialData.domain,
        term: initialData.term,
        description: initialData.description,
        data_set: initialData.data_set,
        guide_name: initialData.guide_name,
        quality: initialData.quality,
        rules: initialData.rules,
      });
    }
    form.clearErrors();
  }, [initialData, open, form]);
  const { user } = useUserStore();
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      setIsSubmitting(true);
      try {
        const payload = {
          external_company_id: user?.company_id,
          function: data.function,
          company: data.company,
          domain: data.domain,
          term: data.term,
          description: data.description,
          data_set: data.data_set,
          guide_name: data.guide_name,
          quality: data.quality,
          rules: data.rules,
        };

        if (mode === "edit" && initialData?.id) {
          const response = await Axios.put(
            `/data/glossary/${initialData.id}`,
            payload
          );
          updateKnowledgeGraphTimestamp();
          return response.data;
        } else {
          const response = await Axios.post("/data/glossary/", payload);
          updateKnowledgeGraphTimestamp();
          return response.data;
        }
      } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to save Knowledge Graph term");
      }
    },
    onSuccess: () => {
      toast.success(mode === "add" ? "Entry added successfully" : "Entry updated successfully");
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph"] });
      onOpenChange(false);
      form.reset();
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
      setIsSubmitting(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white w-full sm:max-w-5xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-0 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] p-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl px-10 py-8 border-b border-slate-100/60">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                  {mode === "add" ? "Add New Entry" : "Edit Entry"}
                </DialogTitle>
                <p className="text-sm text-slate-400 font-medium mt-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                  Capture structured information for your Knowledge Graph
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
                {/* Left Column */}
                <div className="space-y-8">
                  <FormField
                    control={form.control}
                    name="function"
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5" />
                          Function
                        </Label>
                        <Select onValueChange={field.onChange} value={field.value?.toLowerCase()}>
                          <FormControl>
                            <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-slate-50/30 hover:border-primary/50 hover:bg-slate-100/50 hover:shadow-md focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all shadow-none">
                              <SelectValue placeholder="Select Function" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-1">
                            {["Compliance", "Support", "Analysis", "Development", "Management", "Reporting"].map((item) => (
                              <SelectItem key={item} value={item.toLowerCase()} className="rounded-xl py-3 data-[highlighted]:bg-primary !data-[highlighted]:text-white hover:bg-primary hover:text-white cursor-pointer transition-colors px-4">
                                {item}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px] ml-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5" />
                          Domain
                        </Label>
                        <Select onValueChange={field.onChange} value={field.value?.toLowerCase()}>
                          <FormControl>
                            <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-slate-50/30 hover:border-primary/50 hover:bg-slate-100/50 hover:shadow-md focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all shadow-none">
                              <SelectValue placeholder="Select Domain" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-1">
                            {["Operations", "Sales", "HR", "Technology", "Marketing"].map((item) => (
                              <SelectItem key={item} value={item.toLowerCase()} className="rounded-xl py-3 data-[highlighted]:bg-primary !data-[highlighted]:text-white hover:bg-primary hover:text-white cursor-pointer transition-colors px-4">
                                {item}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px] ml-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="term"
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5" />
                          Term / Label
                        </Label>
                        <FormControl>
                          <Input placeholder="e.g. Customer Identifier" className="h-14 rounded-2xl border-slate-200 bg-slate-50/30 hover:border-primary/50 hover:bg-slate-100/50 hover:shadow-md focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all shadow-none px-5" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px] ml-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 flex items-center gap-2">
                          <AlignLeft className="w-3.5 h-3.5" />
                          Context / Description
                        </Label>
                        <FormControl>
                          <Textarea
                            placeholder="Provide details about this entry..."
                            className="min-h-[160px] rounded-2xl border-slate-200 bg-slate-50/30 hover:border-primary/50 hover:bg-slate-100/50 hover:shadow-md focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all shadow-none resize-none p-5 leading-relaxed"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] ml-1" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5" />
                          Company
                        </Label>
                        <FormControl>
                          <Input placeholder="e.g. Acme Corp" className="h-14 rounded-2xl border-slate-200 bg-slate-50/30 hover:border-primary/50 hover:bg-slate-100/50 hover:shadow-md focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all shadow-none px-5" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px] ml-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_set"
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 flex items-center gap-2">
                          <Database className="w-3.5 h-3.5" />
                          Data Products
                        </Label>
                        <FormControl>
                          <Input
                            placeholder="e.g. v1/product_catalog"
                            className="h-14 rounded-2xl border-slate-200 bg-slate-50/30 hover:border-primary/50 hover:bg-slate-100/50 hover:shadow-md focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all shadow-none px-5"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] ml-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guide_name"
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" />
                          Reference Guide
                        </Label>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-slate-50/30 hover:border-primary/50 hover:bg-slate-100/50 hover:shadow-md focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all shadow-none">
                              <SelectValue placeholder="Select Guide" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-1">
                            {["Past Guide", "No Guide", "Next Guide", "Music Guide", "Political Guide", "Exactly Guide"].map((item) => (
                              <SelectItem key={item} value={item} className="rounded-xl py-3 data-[highlighted]:bg-primary !data-[highlighted]:text-white hover:bg-primary hover:text-white cursor-pointer transition-colors px-4">
                                {item}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px] ml-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quality"
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5" />
                          Data Quality
                        </Label>
                        <Select onValueChange={field.onChange} value={field.value?.toLowerCase()}>
                          <FormControl>
                            <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-slate-50/30 hover:border-primary/50 hover:bg-slate-100/50 hover:shadow-md focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all shadow-none">
                              <SelectValue placeholder="Select Quality" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-1">
                            {["High", "Medium", "Low", "Unknown"].map((item) => (
                              <SelectItem key={item} value={item.toLowerCase()} className="rounded-xl py-3 data-[highlighted]:bg-primary !data-[highlighted]:text-white hover:bg-primary hover:text-white cursor-pointer transition-colors px-5">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-2 h-2 rounded-full ${item === 'High' ? 'bg-emerald-400' :
                                      item === 'Medium' ? 'bg-amber-400' :
                                        item === 'Low' ? 'bg-rose-400' : 'bg-slate-300'
                                    }`} />
                                  {item}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px] ml-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rules"
                    render={({ field }) => (
                      <FormItem className="space-y-2.5">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Governance Rules
                        </Label>
                        <FormControl>
                          <Textarea
                            placeholder="Specify rules for this graph entry..."
                            className="min-h-[160px] rounded-2xl border-slate-200 bg-slate-50/30 hover:border-primary/50 hover:bg-slate-100/50 hover:shadow-md focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all shadow-none resize-none p-5 leading-relaxed"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] ml-1" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-5 pt-10 mt-6 border-t border-slate-50">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="rounded-2xl px-8 h-14 font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-none"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-2xl px-12 h-14 font-bold bg-primary text-white shadow-[0_20px_40px_-10px_rgba(48,100,246,0.3)] transition-all hover:shadow-[0_25px_50px_-12px_rgba(48,100,246,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : mode === "add" ? "Create Graph Entry" : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
