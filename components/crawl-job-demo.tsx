"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrawlJobStore } from "@/app/store/crawlJobStore";
import { LogViewer } from "@/components/log-viewer";
import { toast } from "sonner";

export function CrawlJobDemo() {
  const [demoJobId, setDemoJobId] = useState<string | null>(null);
  const { createJob, updateJobStatus, updateJobProgress } = useCrawlJobStore();

  const startDemoJob = () => {
    // Create a demo job with isolated ID to avoid conflicts
    const demoJobId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const jobId = createJob({
      jobId: demoJobId,
      type: "crawl",
      status: "pending",
      progress: 0,
      message: "Demo job queued and waiting to start",
      companyId: "demo_company_isolated",
      connectorId: "demo_connector_isolated",
      estimatedDuration: 60,
    });

    setDemoJobId(jobId);
    toast.success("Demo job started! Check the logs.");

    // Simulate realistic job progression with more frequent updates
    const timeouts = [
      { delay: 1000, status: "starting" as const, progress: 5, message: "Initializing demo crawl..." },
      { delay: 2500, status: "running" as const, progress: 15, message: "Connecting to data source..." },
      { delay: 4000, status: "running" as const, progress: 25, message: "Authenticating with data provider..." },
      { delay: 5500, status: "running" as const, progress: 35, message: "Scanning available tables..." },
      { delay: 7000, status: "running" as const, progress: 45, message: "Analyzing table schemas..." },
      { delay: 8500, status: "running" as const, progress: 55, message: "Extracting column metadata..." },
      { delay: 10000, status: "running" as const, progress: 65, message: "Processing data types..." },
      { delay: 11500, status: "running" as const, progress: 75, message: "Validating data integrity..." },
      { delay: 13000, status: "running" as const, progress: 85, message: "Building lineage relationships..." },
      { delay: 14500, status: "running" as const, progress: 95, message: "Generating data quality reports..." },
      { delay: 16000, status: "completed" as const, progress: 100, message: "Demo job completed successfully!" },
    ];

    timeouts.forEach(({ delay, status, progress, message }) => {
      setTimeout(() => {
        updateJobStatus(jobId, status, message);
        updateJobProgress(jobId, progress);
      }, delay);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Crawl Job Logging Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            This demo shows the real-time logging functionality for crawl jobs. 
            Click the button below to start a demo job and see logs appear in real-time.
          </p>
          
          <Button onClick={startDemoJob} disabled={!!demoJobId}>
            Start Demo Job
          </Button>

          {demoJobId && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Real-time Job Logs</h3>
              <LogViewer 
                jobId={demoJobId} 
                showControls={true}
                autoScroll={true}
                className="border rounded-lg"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




