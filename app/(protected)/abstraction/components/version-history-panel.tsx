"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, RotateCcw, Trash2 } from "lucide-react";
import { getVersionHistory, restoreVersion, compareVersions } from "@/app/(protected)/abstraction/services/version-management";
import { WorkflowVersion } from "@/types/abstraction";

interface VersionHistoryPanelProps {
  onClose: () => void;
  onRestore: (flow: any) => void;
  currentVersion?: WorkflowVersion;
}

export function VersionHistoryPanel({
  onClose,
  onRestore,
  currentVersion,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<WorkflowVersion | null>(null);

  useEffect(() => {
    const history = getVersionHistory();
    setVersions(history);
  }, []);

  const handleRestore = (versionId: string) => {
    const restored = restoreVersion(versionId);
    if (restored) {
      onRestore(restored);
      onClose();
    }
  };

  const handleCompare = (v1: string, v2: string) => {
    const comparison = compareVersions(v1, v2);
    console.log("Version comparison:", comparison);
    // TODO: Show comparison UI
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <Card className="w-full h-[600px] rounded-t-2xl border-0 shadow-2xl">
        <CardHeader className="border-b flex items-center justify-between">
          <div>
            <CardTitle>Workflow Version History</CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              {versions.length} versions stored • Auto-save enabled
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </CardHeader>

        <ScrollArea className="h-[500px]">
          <CardContent className="p-4 space-y-2">
            {versions.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                No versions yet. Save changes to create a version.
              </div>
            ) : (
              versions.map((item, index) => {
                const { version, changeCount, timeSinceCreation } = item;
                const isCurrentVersion = currentVersion?.id === version.id;

                return (
                  <div
                    key={version.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isCurrentVersion
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-100 text-slate-700 border-0">
                            v{version.version}
                          </Badge>
                          {isCurrentVersion && (
                            <Badge className="bg-blue-100 text-blue-700 border-0">
                              Current
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">
                            {timeSinceCreation}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-900 mt-2">
                          {version.changeSummary}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          By {version.createdBy} • {changeCount} changes
                        </p>
                      </div>

                      {!isCurrentVersion && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(version.id)}
                            className="gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </Button>
                        </div>
                      )}
                    </div>

                    {index < versions.length - 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() =>
                          handleCompare(version.id, versions[index + 1].version.id)
                        }
                      >
                        Compare with v{versions[index + 1].version.version}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}
