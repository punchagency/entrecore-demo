import React, { useEffect, useState } from "react";
import { MoreVertical} from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import docIcon from "@/public/svgs/docx-icon.svg";
import Image from "next/image";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import PreviewDocDialog from "./preview-doc-dialog";

const previewCache = new Map();

interface DocumentPreviewCardProps {
  document: {
    id: number;
    document_name: string;
    document_url: string;
    created_at: string;
    uploaded_by?: string;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
}

const DocumentPreviewCard: React.FC<DocumentPreviewCardProps> = ({
  document,
  onEdit,
  onDelete,
  onDownload,
}) => {
  const [documentContent, setDocumentContent] = useState("");

  const fileExtension = document.document_url.split(".").pop()?.toLowerCase();
  const isPdf = fileExtension === "pdf";
  const isWord = fileExtension === "docx";
  const isExcel = fileExtension === "xls" || fileExtension === "xlsx";

  const formatDate = (date: string) => {
    return format(new Date(date), "dd MMM, yyyy");
  };

  useEffect(() => {
    if (previewCache.has(document.id)) {
      const cachedContent = previewCache.get(document.id);
      if (cachedContent) {
        setDocumentContent(cachedContent);
      }
      return;
    }

    if (isWord) {
      const fetchAndProcessWord = async () => {
        try {
          const response = await fetch(document.document_url);

          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }

          const fileBlob = await response.blob();
          const arrayBuffer = await fileBlob.arrayBuffer();

          if (fileExtension === "docx") {
            const result = await mammoth.convertToHtml({ arrayBuffer });

            if (result && result.value) {
              const styledHtml = `
                <div class="word-document" style='text-wrap: balance;'>
                  ${result.value}
                </div>
              `;
              setDocumentContent(styledHtml);
              previewCache.set(document.id, styledHtml);
            } else {
              console.error("Empty result from mammoth conversion");
            }
          }
        } catch (error) {
          console.error("Error processing Word document:", error);
          const errorMessage = `
            <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
              <p style="color: #666;">Unable to preview this document</p>
            </div>
          `;
          setDocumentContent(errorMessage);
        }
      };

      fetchAndProcessWord();
    }

    // Handle Excel documents
    if (isExcel) {
      const fetchAndProcessExcel = async () => {
        try {
          const response = await fetch(document.document_url);
          const arrayBuffer = await response.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

          // Get sheet dimensions
          const range = XLSX.utils.decode_range(firstSheet["!ref"] || "A1");
          // Limit to first 5 rows and columns for preview
          const limitedRange = {
            s: { r: 0, c: 0 },
            e: { r: Math.min(4, range.e.r), c: Math.min(4, range.e.c) },
          };

          firstSheet["!ref"] = XLSX.utils.encode_range(limitedRange);

          const htmlString = XLSX.utils.sheet_to_html(firstSheet, {
            editable: false,
            // table_class: "w-full table-auto"
          });

          setDocumentContent(
            `<div class="excel-preview h-[180px] flex items-center justify-center">
              ${htmlString}
            </div>`
          );
        } catch (error) {
          console.error("Error processing Excel file:", error);
          setDocumentContent(
            `<div class="flex items-center justify-center h-[230px] text-gray-500">
              <Image
                src={excelIcon}
                alt="Excel"
                width={64}
                height={64}
              />
            </div>`
          );
        }
      };

      fetchAndProcessExcel();
    }
  }, [document.id, document.document_url, isWord, isExcel, fileExtension]);

  return (
    <div className="relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className={`flex items-center justify-center p-5 bg-white ${isPdf ? "absolute top-0 left-0 z-40 w-full" : ""}`}>
        <p className=" font-bold">{document.document_name}</p>
      </div>
      <div className="flex flex-col h-full">
        {isPdf ? (
          <div className="relative w-full h-[294px] bg-gray-100 flex items-center justify-center">
            <Image src={docIcon} alt="PDF file" width={64} height={64} />
            <Dialog>
              <DialogTrigger asChild>
                <div className="absolute inset-0 flex items-center justify-center cursor-pointer group">
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-50 transition-all duration-200" />
                  <Button
                    variant="ghost"
                    className="text-white opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                  >
                    Preview
                  </Button>
                </div>
              </DialogTrigger>
              <DialogContent>
                <PreviewDocDialog document={document.document_url} />
              </DialogContent>
            </Dialog>
          </div>
        ) : (isWord || isExcel) && documentContent ? (
          <div className="relative w-full h-[230px] p-4 bg-white group">
            <div
              dangerouslySetInnerHTML={{ __html: documentContent }}
              className="document-preview h-full overflow-hidden"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-50 transition-opacity duration-200 ease-in-out" />
            <div className="absolute inset-0  opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out self-center text-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant={"ghost"} className="text-white text-center text-sm">
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <PreviewDocDialog document={document.document_url} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[230px] p-4 space-y-4">
            <Image src={docIcon} alt="File" width={64} height={64} />
            <p className="text-xs text-gray-500 text-center mt-2">
              Preview not available for .doc (legacy format)
            </p>
            <p
              className="text-xs text-gray-500 text-center mt-2 cursor-pointer font-bold hover:text-primary hover:underline"
              onClick={() => onDownload && onDownload()}
            >
              Download to view
            </p>
          </div>
        )}

        <div className="flex items-center justify-start p-5 w-full z-50 bg-gray-300 p-5 absolute bottom-0">
          <p className="text-xs text-soft-black">{formatDate(document.created_at)}</p>
        </div>

        <div
          className="absolute top-2 right-2 dropdown-trigger z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger className="dropdown-trigger">
              <div className="p-1 rounded-full hover:bg-gray-200 dropdown-trigger">
                <MoreVertical size={20} className="text-gray-700 dropdown-trigger" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEdit) onEdit();
                }}
                className="font-bold"
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDownload) onDownload();
                }}
                className="font-bold"
              >
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDelete) onDelete();
                }}
                className="font-bold"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewCard;
