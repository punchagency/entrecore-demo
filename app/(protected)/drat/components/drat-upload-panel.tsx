"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getDratAcceptAttribute,
  isAllowedDratFile,
  uploadDratDocument,
  type DratUploadAcceptedResponse,
} from "../services/drat-api";
import { getApiError, showApiErrorToast } from "@/utils/api-error";

type UploadPhase = "idle" | "uploading" | "success" | "error";

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export function DratUploadPanel() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<DratUploadAcceptedResponse | null>(null);

  const reset = () => {
    setFile(null);
    setPhase("idle");
    setProgress(0);
    setErrorMessage(null);
    setResult(null);
  };

  const selectFile = useCallback((next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    if (!isAllowedDratFile(next)) {
      toast.error("Unsupported file type", {
        description: "Upload a PDF or Word document (.pdf, .docx, .doc).",
      });
      return;
    }
    setFile(next);
    setPhase("idle");
    setProgress(0);
    setErrorMessage(null);
    setResult(null);
  }, []);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) selectFile(accepted[0]);
    },
    [selectFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: phase === "uploading",
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
    },
    noClick: !!file,
    noKeyboard: !!file,
  });

  const handleUpload = async () => {
    if (!file) {
      toast.error("Select a PDF or Word document first.");
      return;
    }

    setPhase("uploading");
    setProgress(5);
    setErrorMessage(null);
    setResult(null);

    try {
      const data = await uploadDratDocument(file, setProgress);
      setProgress(100);
      setResult(data);
      setPhase("success");
      toast.success("Document staged — DRAT workflow started", {
        description: `${data.filename} · run ${data.run_id.slice(0, 8)}…`,
      });
    } catch (err: unknown) {
      const { message } = getApiError(err, "Upload failed. Please try again.");
      setPhase("error");
      setErrorMessage(message);
      showApiErrorToast(err, "DRAT upload failed");
    }
  };

  const openRun = () => {
    if (!result?.run_id) return;
    router.push(`/workflows/runs/${result.run_id}`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Upload className="h-5 w-5 text-indigo-600" />
          Upload document
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Upload a <code>.pdf</code>, <code>.docx</code>, or <code>.doc</code> file to
          start DRAT intake for your current company.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={[
          "relative border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[160px]",
          isDragActive
            ? "border-indigo-500 bg-indigo-50/50 scale-[0.98]"
            : file
              ? "border-emerald-500 bg-emerald-50/10"
              : "border-slate-200 hover:border-slate-300 bg-slate-50/50",
          phase === "uploading" ? "opacity-70 pointer-events-none" : "",
        ].join(" ")}
      >
        <input {...getInputProps()} accept={getDratAcceptAttribute()} />
        {!file ? (
          <div className="space-y-3 w-full flex flex-col items-center">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Upload className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700">
                Drag & drop to upload
              </p>
              <p className="text-xs text-slate-400">
                or <span className="text-indigo-600">click to browse files</span>
              </p>
            </div>
            <p className="text-[10px] text-slate-400">
              Supports PDF and Word formats
            </p>
          </div>
        ) : (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-3 bg-emerald-100/80 text-emerald-700 rounded-2xl inline-flex">
                <FileText className="h-8 w-8" />
              </div>
              <div className="min-w-0 text-left flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
              </div>
              {phase !== "uploading" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    reset();
                  }}
                  className="text-slate-400 hover:text-red-500 rounded-full shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {(phase === "uploading" || (phase === "success" && progress === 100)) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              {phase === "uploading" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading & starting DRAT workflow…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Upload complete
                </>
              )}
            </span>
            <span className="font-medium tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-100" indicatorClassName="bg-indigo-600" />
        </div>
      )}

      {phase === "error" && errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {phase === "success" && result && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 space-y-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-emerald-900">
                Staged successfully — workflow run created
              </p>
              <p className="text-xs text-emerald-800/80 break-all">
                {result.filename} · intake_key {result.intake_key}
              </p>
              <p className="text-xs text-emerald-800/70 break-all font-mono">
                {result.gcs_path}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={openRun}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open workflow run
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              className="rounded-xl border-slate-200"
            >
              Upload another
            </Button>
          </div>
        </div>
      )}

      {phase !== "success" && (
        <Button
          type="button"
          disabled={!file || phase === "uploading"}
          onClick={handleUpload}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11"
        >
          {phase === "uploading" ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Start DRAT intake
            </>
          )}
        </Button>
      )}
    </div>
  );
}
