"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WorkflowCanvasBuilder from "../components/WorkflowCanvasBuilder";
import { Skeleton } from "@/components/ui/skeleton";

function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workflowId = searchParams.get("id");
  const isDraftOpen =
    searchParams.get("draft") === "true" ||
    searchParams.get("aiDraft") === "true";

  return (
    <WorkflowCanvasBuilder
      workflowId={workflowId}
      initialOpenAIDraft={isDraftOpen}
      onBackToLanding={() => router.push("/data-room/workflows")}
      onSaved={() => router.push("/data-room/workflows")}
    />
  );
}

export default function DataRoomWorkflowBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-slate-50">
          <div className="space-y-4 text-center">
            <Skeleton className="h-10 w-48 mx-auto rounded-xl" />
            <Skeleton className="h-4 w-72 mx-auto rounded-lg" />
          </div>
        </div>
      }
    >
      <BuilderContent />
    </Suspense>
  );
}
