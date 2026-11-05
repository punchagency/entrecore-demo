"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { UpsertReviewPanel } from "../../../../components/upsert-review/upsert-review-panel";

/**
 * Standalone route for picking which record an upsert should update.
 *
 * All the behaviour lives in UpsertReviewPanel, which is also rendered inline
 * in Abstraction → Integrate. Same screen either way, so a conflict resolved
 * from one place looks identical from the other.
 */
export default function UpsertReviewPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const router = useRouter();
  const { id: jobId, runId } = use(params);

  return (
    <div className="mx-auto w-full max-w-6xl p-6 md:p-10">
      <UpsertReviewPanel
        jobId={jobId}
        runId={runId}
        onBack={() => router.push(`/data-room/integrations/${jobId}/runs/${runId}`)}
        onResolved={() => router.push(`/data-room/integrations/${jobId}/runs/${runId}`)}
      />
    </div>
  );
}
