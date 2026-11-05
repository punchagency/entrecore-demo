"use client";

import { FileUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DratBulkUploadPanel } from "./components/drat-bulk-upload-panel";
import { DratSectionNav } from "./components/drat-section-nav";
import { DratUploadPanel } from "./components/drat-upload-panel";
import { PageWrapper } from "@/components/page-wrapper";

export default function DratUploadPage() {
  return (
    <PageWrapper title="DRAT Upload">
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="w-full p-6 space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                  <FileUp className="h-6 w-6 text-indigo-300" />
                </div>
                <Badge
                  variant="outline"
                  className="border-indigo-400 text-indigo-300 font-medium tracking-wide bg-indigo-950/30"
                >
                  DRAT Intake
                </Badge>
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                Manual document upload
              </h1>
              <p className="text-indigo-100/80 leading-relaxed max-w-xl">
                Upload up to 30 PDF or Word documents for the current company. Files
                are staged in cloud storage and each one starts its own DRAT workflow run.
              </p>
            </div>
          </div>
        </div>

        <DratSectionNav active="upload" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm lg:col-span-2 h-fit">
            <CardContent className="p-6">
              <DratBulkUploadPanel />
            </CardContent>
          </Card>

          <div className="space-y-8 lg:col-span-1">
            <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm h-fit">
              <CardContent className="p-6">
                <DratUploadPanel />
                <p className="text-xs text-slate-400 mt-4">
                  Single-file upload is the fallback: use it for a <code>.doc</code> file or
                  if bulk upload is unavailable.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm h-fit">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">What happens next</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    After upload, DRAT stages each file and starts a workflow run for your
                    company.
                  </p>
                </div>
                <ol className="space-y-3 text-sm text-slate-600 list-decimal list-inside">
                  <li>Each file is validated and staged in DRAT storage.</li>
                  <li>A workflow run is created with intake metadata (filename, GCS path, intake key).</li>
                  <li>Downstream DRAT nodes classify, route, and file the document.</li>
                </ol>
                <p className="text-xs text-slate-400">
                  Company scope comes from your session — no company ID is sent in the
                  upload request.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </PageWrapper>
  );
}
