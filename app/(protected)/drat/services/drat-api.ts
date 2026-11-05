/**
 * DRAT intake API — EP-578 / EP-579.
 * POST /api/v1/data/drat/upload (company scoped via JWT).
 */

import { Axios } from "@/app/config/axios";

export interface DratUploadAcceptedResponse {
  status: string;
  run_id: string;
  workflow_id?: string | null;
  intake_key: string;
  gcs_path: string;
  content_hash: string;
  filename: string;
  source: string;
}

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc"] as const;

export function isAllowedDratFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function getDratAcceptAttribute(): string {
  return ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

/**
 * Upload a PDF/DOCX to DRAT staging and start a workflow run.
 * Returns 202 payload with run_id for linking to /workflows/runs/[id].
 */
export async function uploadDratDocument(
  file: File,
  onUploadProgress?: (percent: number) => void
): Promise<DratUploadAcceptedResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await Axios.post<DratUploadAcceptedResponse>(
    "/data/drat/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (event) => {
        if (!onUploadProgress || !event.total) return;
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        onUploadProgress(percent);
      },
    }
  );

  return response.data;
}
