"use client";
import { Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";
interface UploadComponentProps {
  onFileSelect: (file: File | null) => void;
  value?: File | null;
}

const UploadComponent = ({ onFileSelect, value }: UploadComponentProps) => {
  const [file, setFile] = useState<File | null>(value || null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      onFileSelect(selectedFile);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed border-[#757575] bg-white rounded-sm p-8 text-center cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          file && "border-primary"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2 text-soft-black">
          {!file && <Upload size={24} className="" />}
          {file ? (
            <div className="flex items-center gap-2">
              <p className="text-sm md:text-base font-bold">Selected: {file.name}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  onFileSelect(null);
                }}
                className="text-xs text-red-500 hover:text-red-600"
              >
                <X size={26} className="rounded-full p-1 cursor-pointer" />
              </button>
            </div>
          ) : (
            <p className="text-sm md:text-base font-medium">
              <span className="border-b border-[#181818]">Click to Upload</span>
              {" or Drag & Drop"}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs md:text-sm text-gray mt-2 mb-4 font-medium">
        Supported file types: .doc, .docx, .pdf, .xls, .xlsx
      </p>
    </div>
  );
};

export default UploadComponent;
