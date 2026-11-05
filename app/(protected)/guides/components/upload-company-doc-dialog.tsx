"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadCompanyDocToGuides } from "@/utils/api-utils";
import { useQueryClient } from "@tanstack/react-query";

const uploadSchema = z.object({
  file: z.any().refine((file) => file instanceof File, "Please select a document to upload"),
  tags: z.string().optional(),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface UploadCompanyDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadCompanyDocDialog({ open, onOpenChange }: UploadCompanyDocDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      tags: "",
    },
  });

  const onSubmit = async (values: UploadFormValues) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX as standard Axios doesn't provide it easily without custom config
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 200);

      await uploadCompanyDocToGuides(values.file, values.tags);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      queryClient.invalidateQueries({ queryKey: ["guides"] });
      
      toast.success("Document uploaded and ingested successfully!");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldChange: (file: File | null) => void) => {
    const file = e.target.files?.[0] || null;
    fieldChange(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white border-0 shadow-2xl rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        
        <DialogHeader className="pt-6">
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Upload className="h-5 w-5 text-blue-600" />
            </div>
            Upload Company Document
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-base mt-2">
            Upload a document (PDF, DOCX, XLSX) to ingest it into the guides system for analysis.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">Document File</FormLabel>
                  <FormControl>
                    <div className="relative">
                      {!field.value ? (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/50 group cursor-pointer relative">
                          <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => handleFileChange(e, field.onChange)}
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                          />
                          <div className="flex flex-col items-center justify-center text-center space-y-3">
                            <div className="p-3 bg-gray-50 rounded-full group-hover:bg-blue-100 transition-colors">
                              <Upload className="h-6 w-6 text-gray-400 group-hover:text-blue-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Click to upload or drag and drop</p>
                              <p className="text-xs text-gray-500 mt-1">PDF, DOCX, XLSX up to 20MB</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <FileText className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate max-w-[250px]">
                                {field.value.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(field.value.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => field.onChange(null)}
                            className="text-gray-400 hover:text-red-500 rounded-full"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700">Tags (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. financial, legal, 2024"
                      className="rounded-xl border-gray-200 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] text-gray-400">
                    Separate multiple tags with commas for better organization.
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-600">Uploading...</span>
                  <span className="text-blue-600">{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 rounded-xl border-gray-200 text-gray-700 font-medium hover:bg-gray-50 h-11"
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 h-11 disabled:opacity-70"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload & Ingest"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
