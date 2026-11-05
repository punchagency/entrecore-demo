"use client";
import * as z from "zod";
import Image from "next/image";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Label } from "@radix-ui/react-label";
import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import pdfIcon from "@/public/svgs/pdf-icon.svg";
import docIcon from "@/public/svgs/docx-icon.svg";
import excelIcon from "@/public/svgs/xls-icon.svg";
import { Textarea } from "@/components/ui/textarea";
import UploadComponent from "@/components/upload-file";
import { deleteFromS3, uploadToS3 } from "@/utils/s3-utils";
import fileChangeIcon from "@/public/svgs/file-change-icon.svg";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveFileMetadata, updateFileMetadata } from "@/utils/api-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useUserStore } from "@/app/store/userStore";
import { useDataCountsStore } from "@/app/store/dataCountsStore";

interface FileData {
  id?: string;
  name?: string;
  category?: string;
  description?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  external_company_id?: string;
  document_name?: string;
  document_url?: string;
}

interface FileMetadataPayload {
  id?: string;
  data: FileData;
  originalData?: FileData | null;
}

interface FileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initialData?: FileData | null;
}

const addFormSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  file: z.any().refine((file) => file, "File is required"),
});

const editFormSchema = z
  .object({
    fileName: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    file: z.any().optional(),
  })
  .refine(
    (data) => {
      return data.fileName || data.category || data.description || data.file;
    },
    {
      message: "No changes made",
      path: ["fileName"],
    }
  );

type FormData = z.infer<typeof addFormSchema | typeof editFormSchema>;

export function FileFormDialog({ open, onOpenChange, mode, initialData }: FileFormDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(mode === "add" ? addFormSchema : editFormSchema),
    defaultValues: {
      fileName: initialData?.name || "",
      category: initialData?.category || "",
      description: initialData?.description || "",
      file: initialData?.fileUrl || null,
    },
  });
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const updateCompanyDocumentsTimestamp = useDataCountsStore(state => state.updateCompanyDocumentsTimestamp);
  const { user } = useUserStore();
  useEffect(() => {
    setSavedCompanyId(localStorage.getItem('selectedCompanyId') || user?.active_company || null);
  }, []);

  const [originalData, setOriginalData] = useState<FileData | null>(null);

  useEffect(() => {
    if (initialData && open) {
      setOriginalData(initialData);

      form.reset({
        fileName: initialData.name || "",
        category: initialData.category || "",
        description: initialData.description || "",
        file: initialData.fileUrl || null,
      });
    }
    form.clearErrors();
  }, [initialData, open, form]);

  const [isUploading, setIsUploading] = useState(false);

  const s3UploadMutation = useMutation({
    mutationFn: (file: File) => uploadToS3(file),
    onError: (error) => {
      console.error("Error uploading to S3:", error);
      toast.error("Failed to upload file to storage");
      setIsUploading(false);
    },
  });

  const metadataMutation = useMutation({
    mutationFn: (payload: FileMetadataPayload) => {
      if (mode === "edit" && initialData?.id) {
        return updateFileMetadata(payload.id || "", payload.data, payload.originalData);
      } else {
        return saveFileMetadata(payload.data);
      }
    },
    onSuccess: () => {
      toast.success(mode === "add" ? "File added successfully" : "File updated successfully");
      queryClient.invalidateQueries({ queryKey: ["company-documents"] });
      onOpenChange(false);
      form.reset();
      updateCompanyDocumentsTimestamp();
      setIsUploading(false);
    },
    onError: (error) => {
      console.error("Error saving metadata:", error);
      toast.error("Failed to save file information");
      setIsUploading(false);
    },
  });

  const queryClient = useQueryClient();

  const [itemdata, setItemData] = useState(initialData);

  useEffect(() => {
    if (initialData && open) {
      setItemData(initialData);
      form.reset({
        fileName: initialData.name || "",
        category: initialData.category || "",
        description: initialData.description || "",
        file: null,
      });
    }
  }, [initialData, open, form]);

  const handleSubmit = async (values: FormData) => {
    setIsUploading(true);

    try {
      let fileUrl = mode === "edit" ? initialData?.fileUrl || "" : "";

      if (values.file && values.file instanceof File) {
        fileUrl = await s3UploadMutation.mutateAsync(values.file);

        if (mode === "edit" && initialData?.fileUrl) {
          await deleteFromS3(initialData.fileUrl);
        }
      }

      const fileData: FileData = {};

      if (values.fileName) fileData.name = values.fileName;
      if (values.category) fileData.category = values.category;
      if (values.description) fileData.description = values.description;

      fileData.external_company_id = savedCompanyId || "";

      if (fileUrl && fileUrl !== initialData?.fileUrl) {
        fileData.fileUrl = fileUrl;
      } else if (mode === "edit") {
        fileData.fileUrl = initialData?.fileUrl;
      }

      if (values.file && values.file instanceof File) {
        fileData.fileType = values.file.type;
        fileData.fileSize = values.file.size;
      }

      if (mode === "edit" && initialData?.id) {
        await metadataMutation.mutateAsync({
          data: fileData,
          id: initialData.id.toString(),
          originalData: originalData,
        });
      } else {
        await metadataMutation.mutateAsync({
          data: fileData,
          id: "new",
        });
      }
    } catch (error) {
      console.error("Error in file submission:", error);
      setIsUploading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("file", file);
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "pdf":
        return pdfIcon;
      case "xls":
        return excelIcon;
      case "xlsx":
        return excelIcon;
      case "doc":
        return docIcon;
      case "docx":
        return docIcon;
      default:
        return docIcon;
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#EFF4FF] max-h-[70vh] overflow-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#EFF4FF] bg-opacity-70 z-10 ">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-primary font-medium">Uploading...</p>
            </div>
          </div>
        )}
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add New File" : "Edit File"}</DialogTitle>
          <hr className="w-full border-gray-200 my-[0.25vw]" />
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fileName"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-sm md:text-base font-bold">File Name</Label>
                  <FormControl>
                    <Input
                      placeholder="File Name"
                      className="bg-white"
                      {...field}
                      defaultValue={initialData?.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-sm md:text-base font-bold">Category</Label>
                  <Select onValueChange={field.onChange} defaultValue={initialData?.category}>
                    <FormControl>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue
                          placeholder="Select Category"
                          defaultValue={initialData?.category}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="company-documents">Company Documents</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="previous-funding">Previous Funding</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="others">Others</SelectItem>
                      <SelectItem value="intellectual-property">Intellectual Property</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <Label className="text-sm md:text-base font-bold">Description</Label>
                  <FormControl>
                    <Textarea
                      placeholder="File Description"
                      defaultValue={initialData?.description}
                      className="h-[6vw] bg-white resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "add" && (
              <FormField
                control={form.control}
                name="file"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-sm md:text-base font-bold">
                      Upload{field.value ? "ed" : ""} File
                    </Label>
                    <FormControl>
                      <UploadComponent onFileSelect={(file) => field.onChange(file)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {mode === "edit" && itemdata && (
              <>
                <div className="flex items-center justify-between gap-2 bg-white p-4 rounded-md text-sm md:text-base xl:text-xl font-medium">
                  <div className="flex items-center gap-2">
                    <div className="rounded-sm bg-[#EFF4FF] flex items-center justify-center p-2">
                      <Image src={getFileIcon(form.watch("file")?.name || itemdata.fileUrl)} alt="pdf" width={20} height={20} />
                    </div>
                    {form.watch("file") ? form.watch("file").name : itemdata.name}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <Image src={fileChangeIcon} alt="file-change" width={20} height={20} />
                  </Button>
                </div>
                <p className="text-xs md:text-sm text-gray mt-2 mb-4 font-medium">
                  Supported file types: .doc, .docx, .pdf, .xls, .xlsx
                </p>
              </>
            )}

            <Button type="submit" className="bg-primary text-white py-6 cursor-pointer w-full">
              {mode === "add" ? "Add" : "Update"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
