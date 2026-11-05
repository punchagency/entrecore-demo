"use client";

import React, { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Play, 
  Pause, 
  Square, 
  Download, 
  Trash2, 
  Clock, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  XCircle,
  Bug
} from "lucide-react";
import { CrawlJobLog, useCrawlJobStore } from "@/app/store/crawlJobStore";
import { formatTimeAgo } from "@/utils/formatTimeAgo";

interface LogViewerProps {
  jobId: string;
  className?: string;
  showControls?: boolean;
  autoScroll?: boolean;
  maxLogs?: number;
}

const getLogIcon = (level: CrawlJobLog["level"]) => {
  switch (level) {
    case "error":
      return <XCircle className="h-3 w-3 text-red-500" />;
    case "warning":
      return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    case "info":
      return <Info className="h-3 w-3 text-blue-500" />;
    case "debug":
      return <Bug className="h-3 w-3 text-gray-500" />;
    default:
      return <Info className="h-3 w-3 text-blue-500" />;
  }
};

const getLogLevelBadge = (level: CrawlJobLog["level"]) => {
  const variants = {
    error: "destructive" as const,
    warning: "secondary" as const,
    info: "default" as const,
    debug: "outline" as const,
  };

  return (
    <Badge variant={variants[level]} className="text-xs px-1.5 py-0.5">
      {level.toUpperCase()}
    </Badge>
  );
};

export function LogViewer({ 
  jobId, 
  className = "", 
  showControls = true, 
  autoScroll = true,
  maxLogs = 1000 
}: LogViewerProps) {
  const { 
    jobs, 
    isStreaming, 
    streamingJobId, 
    addLog, 
    clearLogs, 
    startLogStreaming, 
    stopLogStreaming 
  } = useCrawlJobStore();
  
  const job = jobs[jobId];
  const logs = job?.logs || [];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [filterLevel, setFilterLevel] = useState<CrawlJobLog["level"] | "all">("all");

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && !isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isPaused]);

  // Start streaming when component mounts if job is active
  useEffect(() => {
    if (job && (job.status === "pending" || job.status === "starting" || job.status === "running")) {
      if (!isStreaming || streamingJobId !== jobId) {
        startLogStreaming(jobId);
      }
    }

    return () => {
      if (streamingJobId === jobId) {
        stopLogStreaming();
      }
    };
  }, [jobId, job?.status, isStreaming, streamingJobId, startLogStreaming, stopLogStreaming]);

  const filteredLogs = logs.filter(log => 
    filterLevel === "all" || log.level === filterLevel
  );

  const handleToggleStreaming = () => {
    if (isStreaming && streamingJobId === jobId) {
      stopLogStreaming();
      setIsPaused(true);
    } else {
      startLogStreaming(jobId);
      setIsPaused(false);
    }
  };

  const handleClearLogs = () => {
    clearLogs(jobId);
  };

  const handleDownloadLogs = () => {
    const logText = filteredLogs
      .map(log => `[${new Date(log.timestamp).toISOString()}] ${log.level.toUpperCase()}: ${log.message}`)
      .join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crawl-logs-${jobId}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!job) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-gray-500">
          Job not found
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Job Logs</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={
              job.status === "completed" ? "default" :
              job.status === "failed" ? "destructive" :
              job.status === "running" ? "default" :
              "secondary"
            }>
              {job.status}
            </Badge>
            {isStreaming && streamingJobId === jobId && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                Live
              </Badge>
            )}
          </div>
        </div>
        
        {showControls && (
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleStreaming}
                disabled={job.status === "completed" || job.status === "failed"}
              >
                {isStreaming && streamingJobId === jobId ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Resume
                  </>
                )}
              </Button>
              
              <Button size="sm" variant="outline" onClick={handleClearLogs}>
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
              
              <Button size="sm" variant="outline" onClick={handleDownloadLogs}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as CrawlJobLog["level"] | "all")}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="all">All Levels</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="debug">Debug</option>
              </select>
              
              <span className="text-xs text-gray-500">
                {filteredLogs.length} / {logs.length} logs
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96 w-full" ref={scrollRef}>
          <div className="p-4 space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No logs available</p>
                {(job.status === "pending" || job.status === "starting") && (
                  <p className="text-sm mt-1">
                    Waiting for job to start...
                  </p>
                )}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 p-2 rounded-lg border ${
                    log.level === "error" 
                      ? "bg-red-50 border-red-200" 
                      : log.level === "warning"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mt-0.5">
                    {getLogIcon(log.level)}
                    {getLogLevelBadge(log.level)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(new Date(log.timestamp).toISOString())}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-900 break-words">
                      {log.message}
                    </p>
                    
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          Metadata
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Compact log viewer for use in job lists
interface CompactLogViewerProps {
  jobId: string;
  maxLogs?: number;
  className?: string;
}

export function CompactLogViewer({ jobId, maxLogs = 5, className = "" }: CompactLogViewerProps) {
  const { jobs } = useCrawlJobStore();
  const job = jobs[jobId];
  const logs = job?.logs || [];

  if (!job || logs.length === 0) {
    return null;
  }

  const recentLogs = logs.slice(-maxLogs);

  return (
    <div className={`space-y-1 ${className}`}>
      {recentLogs.map((log) => (
        <div
          key={log.id}
          className={`flex items-center gap-2 text-xs p-2 rounded ${
            log.level === "error" 
              ? "bg-red-50 text-red-700" 
              : log.level === "warning"
              ? "bg-yellow-50 text-yellow-700"
              : "bg-gray-50 text-gray-600"
          }`}
        >
          {getLogIcon(log.level)}
          <span className="flex-1 truncate">{log.message}</span>
          <span className="text-gray-400">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}