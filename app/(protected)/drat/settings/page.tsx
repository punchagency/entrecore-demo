"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Inbox,
  FolderSearch,
  HardDrive,
  Plus,
  Pencil,
  Trash2,
  Radar,
  ScrollText,
  Loader2,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWatchedSources,
  useUpdateWatchedSource,
  useDeleteWatchedSource,
  isInboxSource,
  isFolderSource,
  isGoogleDriveSource,
  WatchedSource,
} from "../hooks/use-watched-sources";
import { WatchedSourceDialog } from "../components/watched-source-dialog";
import { DratReviewAlertSettingsCard } from "../components/drat-review-alert-settings-card";
import { DratExtractionSettingsCard } from "../components/drat-extraction-settings-card";
// Legacy integration auto-push + routing routes are disabled — DRAT now routes
// filed documents through abstraction rules.
// import { DratIntegrationSettingsCard } from "../components/drat-integration-settings-card";
import { DratSectionNav } from "../components/drat-section-nav";
import { PageWrapper } from "@/components/page-wrapper";
import { showApiErrorToast } from "@/utils/api-error";

function getSourceSummary(source: WatchedSource): string {
  if (isInboxSource(source)) {
    const { username, imap_host, imap_port, poll_interval_seconds } = source.config;
    return `${username}@${imap_host}:${imap_port} · polls every ${poll_interval_seconds}s`;
  }
  if (isGoogleDriveSource(source)) {
    const path = source.config.drive_folder_path || source.config.drive_folder_id;
    return `Drive · ${path} · polls every ${source.config.poll_interval_seconds}s`;
  }
  if (isFolderSource(source)) {
    const prefix = source.config.location_type === "gcs" ? "GCS" : "Server";
    return `${prefix} · ${source.config.path}`;
  }
  return "";
}

function sourceTypeLabel(source: WatchedSource): string {
  if (source.source_type === "inbox") return "Inbox";
  if (source.source_type === "google_drive") return "Google Drive";
  return "Folder";
}

function sourceTypeBadgeClass(source: WatchedSource): string {
  if (source.source_type === "inbox") {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }
  if (source.source_type === "google_drive") {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }
  return "bg-teal-50 text-teal-700 border-teal-200";
}

function sourceIconWrapClass(source: WatchedSource): string {
  if (source.source_type === "inbox") return "bg-indigo-50 text-indigo-600";
  if (source.source_type === "google_drive") return "bg-sky-50 text-sky-600";
  return "bg-teal-50 text-teal-600";
}

export default function DratSettingsPage() {
  const { data: sources, isLoading } = useWatchedSources();
  const updateMutation = useUpdateWatchedSource();
  const deleteMutation = useDeleteWatchedSource();

  const [formOpen, setFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<WatchedSource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WatchedSource | null>(null);

  const openCreate = () => {
    setEditingSource(null);
    setFormOpen(true);
  };

  const openEdit = (source: WatchedSource) => {
    setEditingSource(source);
    setFormOpen(true);
  };

  const toggleEnabled = (source: WatchedSource, enabled: boolean) => {
    updateMutation.mutate(
      { id: source.id, data: { enabled } },
      {
        onSuccess: () =>
          toast.success(`${source.name} ${enabled ? "enabled" : "disabled"}`),
        onError: (error) =>
          showApiErrorToast(error, `Failed to ${enabled ? "enable" : "disable"} ${source.name}`),
      }
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`${deleteTarget.name} removed`);
        setDeleteTarget(null);
      },
      onError: (error) => showApiErrorToast(error, `Failed to remove ${deleteTarget.name}`),
    });
  };

  const sourceList = Array.isArray(sources) ? sources : [];
  const inboxCount = sourceList.filter((s) => s.source_type === "inbox").length;
  const driveCount = sourceList.filter((s) => s.source_type === "google_drive").length;
  const folderCount = sourceList.filter((s) => s.source_type === "folder").length;

  return (
    <PageWrapper title="Settings">
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="w-full p-6 space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                  <Settings2 className="h-6 w-6 text-indigo-300" />
                </div>
                <Badge
                  variant="outline"
                  className="border-indigo-400 text-indigo-300 font-medium tracking-wide bg-indigo-950/30"
                >
                  DRAT Settings
                </Badge>
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                Configuration
              </h1>
              <p className="text-indigo-100/80 leading-relaxed max-w-2xl">
                Review queue notifications and document intake sources. Configure who gets emailed
                when filing needs a human, and which inboxes, folders, or Drive folders DRAT watches.
                {sourceList.length > 0 &&
                  ` Currently watching ${inboxCount} ${inboxCount === 1 ? "inbox" : "inboxes"}, ${folderCount} ${folderCount === 1 ? "folder" : "folders"}, and ${driveCount} Drive ${driveCount === 1 ? "source" : "sources"}.`}
              </p>
            </div>
            <Button
              onClick={openCreate}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 border-0 rounded-xl px-6 shrink-0"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add watched source
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <DratSectionNav active="settings" />

        <DratReviewAlertSettingsCard />
        <DratExtractionSettingsCard />
        {/* Legacy integration auto-push + routing routes — disabled.
        <DratIntegrationSettingsCard /> */}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Radar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Watched Sources</h2>
                <p className="text-sm text-slate-500">
                  IMAP inboxes, folder paths, and Google Drive folders DRAT polls for new documents.
                </p>
              </div>
            </div>
            <Button
              onClick={openCreate}
              variant="outline"
              className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add source
            </Button>
          </div>

        {/* Sources Table */}
        <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white/80 overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : sourceList.length === 0 ? (
              <div className="py-16 text-center">
                <Radar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">No watched sources</h3>
                <p className="text-slate-500 mb-4 text-sm">
                  Add an inbox, folder, or Google Drive source for DRAT to monitor.
                </p>
                <Button
                  onClick={openCreate}
                  variant="outline"
                  className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Source
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="pl-6 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Source
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Type
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Rules
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </TableHead>
                    <TableHead className="pr-6 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceList.map((source) => {
                    const isTogglingThis =
                      updateMutation.isPending && updateMutation.variables?.id === source.id;
                    return (
                      <TableRow key={source.id} className="hover:bg-slate-50/50">
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-xl shrink-0 ${sourceIconWrapClass(source)}`}
                            >
                              {source.source_type === "inbox" ? (
                                <Inbox className="h-4 w-4" />
                              ) : source.source_type === "google_drive" ? (
                                <HardDrive className="h-4 w-4" />
                              ) : (
                                <FolderSearch className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate">
                                {source.name}
                              </div>
                              <div className="text-xs text-slate-400 font-mono truncate max-w-md flex items-center gap-1.5">
                                {getSourceSummary(source)}
                                {(source.source_type === "folder" ||
                                  source.source_type === "google_drive") &&
                                  source.config.recursive && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1 py-0 border-teal-200 text-teal-600 font-sans"
                                    >
                                      recursive
                                    </Badge>
                                  )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={sourceTypeBadgeClass(source)}
                          >
                            {sourceTypeLabel(source)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <ScrollText className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-sm">{source.rule_count}</span>
                            <span className="text-xs text-slate-400">
                              {source.rule_count === 1 ? "rule" : "rules"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={source.enabled}
                              disabled={isTogglingThis}
                              onCheckedChange={(v) => toggleEnabled(source, v)}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                            <span
                              className={`text-xs font-semibold ${
                                source.enabled ? "text-emerald-600" : "text-slate-400"
                              }`}
                            >
                              {source.enabled ? "Active" : "Disabled"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(source)}
                              className="h-8 w-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(source)}
                              className="h-8 w-8 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <WatchedSourceDialog open={formOpen} onOpenChange={setFormOpen} source={editingSource} />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Remove watched source?</DialogTitle>
            <DialogDescription>
              DRAT will stop monitoring <span className="font-semibold">{deleteTarget?.name}</span>.
              {!!deleteTarget?.rule_count && (
                <>
                  {" "}
                  {deleteTarget.rule_count} routing{" "}
                  {deleteTarget.rule_count === 1 ? "rule" : "rules"} attached to this source will
                  stop matching.
                </>
              )}{" "}
              Already-ingested documents are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PageWrapper>
  );
}
