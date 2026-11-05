"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderSearch, HardDrive, Inbox, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import {
  useCreateWatchedSource,
  useUpdateWatchedSource,
  isInboxSource,
  isFolderSource,
  isGoogleDriveSource,
  WatchedSource,
  WatchedSourceType,
  FolderLocationType,
  InboxSourceConfig,
  FolderSourceConfig,
  GoogleDriveSourceConfig,
} from "../hooks/use-watched-sources";
import { testImapConnection } from "../services/watched-sources-api";
import {
  DriveFolderPickerDialog,
  DriveFolderSelection,
} from "./drive-folder-picker-dialog";

const IMAP_DEFAULT_PORT = 993;
const DEFAULT_POLL_INTERVAL_SECONDS = 300;
const MIN_POLL_INTERVAL_SECONDS = 10;

interface WatchedSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass an existing source to edit it; null opens the dialog in create mode. */
  source: WatchedSource | null;
}

interface SourceFormState {
  name: string;
  sourceType: WatchedSourceType;
  enabled: boolean;
  imapHost: string;
  imapPort: string;
  username: string;
  password: string;
  pollIntervalSeconds: string;
  deleteAfterIngest: boolean;
  locationType: FolderLocationType;
  path: string;
  recursive: boolean;
  driveFolderId: string;
  driveFolderPath: string;
  connectorConfigId: string;
  deleteAfterFiling: boolean;
}

const EMPTY_FORM: SourceFormState = {
  name: "",
  sourceType: "inbox",
  enabled: true,
  imapHost: "",
  imapPort: String(IMAP_DEFAULT_PORT),
  username: "",
  password: "",
  pollIntervalSeconds: String(DEFAULT_POLL_INTERVAL_SECONDS),
  deleteAfterIngest: false,
  locationType: "gcs",
  path: "",
  recursive: false,
  driveFolderId: "",
  driveFolderPath: "",
  connectorConfigId: "",
  deleteAfterFiling: false,
};

function buildFormState(source: WatchedSource | null): SourceFormState {
  if (!source) return EMPTY_FORM;

  const base: SourceFormState = {
    ...EMPTY_FORM,
    name: source.name,
    sourceType: source.source_type,
    enabled: source.enabled,
  };

  if (isInboxSource(source)) {
    return {
      ...base,
      imapHost: source.config.imap_host,
      imapPort: String(source.config.imap_port),
      username: source.config.username,
      password: "",
      pollIntervalSeconds: String(source.config.poll_interval_seconds),
      deleteAfterIngest: !!source.config.delete_after_ingest,
    };
  }

  if (isFolderSource(source)) {
    return {
      ...base,
      locationType: source.config.location_type,
      path: source.config.path,
      recursive: source.config.recursive,
    };
  }

  if (isGoogleDriveSource(source)) {
    return {
      ...base,
      driveFolderId: source.config.drive_folder_id,
      driveFolderPath: source.config.drive_folder_path || "",
      pollIntervalSeconds: String(source.config.poll_interval_seconds),
      recursive: !!source.config.recursive,
      connectorConfigId: source.config.connector_config_id || "",
      deleteAfterFiling: !!source.config.delete_after_filing,
    };
  }

  return base;
}

function clampNumber(raw: string, fallback: number, min: number, max: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export function WatchedSourceDialog({ open, onOpenChange, source }: WatchedSourceDialogProps) {
  const isEdit = !!source;
  const createMutation = useCreateWatchedSource();
  const updateMutation = useUpdateWatchedSource();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<SourceFormState>(EMPTY_FORM);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isTestingImap, setIsTestingImap] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(buildFormState(source));
      setIsTestingImap(false);
    }
  }, [open, source]);

  const setField = <K extends keyof SourceFormState>(key: K, value: SourceFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isInboxForm = form.sourceType === "inbox";
  const isDriveForm = form.sourceType === "google_drive";
  const isBusy = isSaving || isTestingImap;

  const hasRequiredFields = isInboxForm
    ? !!form.name.trim() &&
      !!form.imapHost.trim() &&
      !!form.username.trim() &&
      (isEdit || !!form.password)
    : isDriveForm
      ? !!form.name.trim() && !!form.driveFolderId.trim()
      : !!form.name.trim() && !!form.path.trim();

  const handleDriveSelect = (selection: DriveFolderSelection) => {
    setForm((prev) => ({
      ...prev,
      driveFolderId: selection.folderId,
      driveFolderPath: selection.folderPath,
      connectorConfigId: selection.connectorConfigId || "",
    }));
  };

  const inboxNeedsImapTest = (config: InboxSourceConfig): boolean => {
    if (!isEdit || !source || !isInboxSource(source)) return true;
    if (config.password) return true;
    return (
      config.imap_host !== source.config.imap_host ||
      config.imap_port !== source.config.imap_port ||
      config.username !== source.config.username
    );
  };

  const handleSubmit = async () => {
    if (!hasRequiredFields || isBusy) return;

    let config: InboxSourceConfig | FolderSourceConfig | GoogleDriveSourceConfig;
    if (isInboxForm) {
      config = {
        imap_host: form.imapHost.trim(),
        imap_port: clampNumber(form.imapPort, IMAP_DEFAULT_PORT, 1, 65535),
        username: form.username.trim(),
        poll_interval_seconds: clampNumber(
          form.pollIntervalSeconds,
          DEFAULT_POLL_INTERVAL_SECONDS,
          MIN_POLL_INTERVAL_SECONDS,
          86400
        ),
        delete_after_ingest: form.deleteAfterIngest,
        // On edit, an empty password means "keep the current credentials"
        ...(form.password ? { password: form.password } : {}),
      };

      if (inboxNeedsImapTest(config) && config.password) {
        setIsTestingImap(true);
        try {
          await testImapConnection({
            imap_host: config.imap_host,
            imap_port: config.imap_port,
            username: config.username,
            password: config.password,
            imap_folder: config.imap_folder,
            use_ssl: config.use_ssl,
          });
        } catch (error) {
          showApiErrorToast(error, "IMAP connection test failed");
          setIsTestingImap(false);
          return;
        }
        setIsTestingImap(false);
      }
    } else if (isDriveForm) {
      config = {
        drive_folder_id: form.driveFolderId.trim(),
        drive_folder_path: form.driveFolderPath.trim() || null,
        poll_interval_seconds: clampNumber(
          form.pollIntervalSeconds,
          DEFAULT_POLL_INTERVAL_SECONDS,
          MIN_POLL_INTERVAL_SECONDS,
          86400
        ),
        recursive: form.recursive,
        delete_after_filing: form.deleteAfterFiling,
        ...(form.connectorConfigId
          ? { connector_config_id: form.connectorConfigId }
          : {}),
      };
    } else {
      config = {
        location_type: form.locationType,
        path: form.path.trim(),
        recursive: form.recursive,
      };
    }

    const onError = (error: unknown) => {
      showApiErrorToast(error, isEdit ? "Failed to update source" : "Failed to add source");
    };
    const onSuccess = () => {
      toast.success(isEdit ? "Source updated" : "Source added");
      onOpenChange(false);
    };

    if (isEdit && source) {
      updateMutation.mutate(
        { id: source.id, data: { name: form.name.trim(), enabled: form.enabled, config } },
        { onSuccess, onError }
      );
    } else {
      createMutation.mutate(
        {
          name: form.name.trim(),
          source_type: form.sourceType,
          enabled: form.enabled,
          config,
        },
        { onSuccess, onError }
      );
    }
  };

  const description = isInboxForm
    ? "DRAT polls this IMAP inbox and ingests new attachments."
    : isDriveForm
      ? "DRAT polls this Google Drive folder and ingests new PDF/DOCX files."
      : "DRAT watches this folder and ingests newly added files.";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              {isInboxForm ? (
                <Inbox className="h-5 w-5 text-indigo-600" />
              ) : isDriveForm ? (
                <HardDrive className="h-5 w-5 text-sky-600" />
              ) : (
                <FolderSearch className="h-5 w-5 text-teal-600" />
              )}
              {isEdit ? "Edit Watched Source" : "Add Watched Source"}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {!isEdit && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Source Type</Label>
                <Select
                  value={form.sourceType}
                  onValueChange={(v) => setField("sourceType", v as WatchedSourceType)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbox">Inbox (IMAP)</SelectItem>
                    <SelectItem value="folder">Folder (GCS / Server)</SelectItem>
                    <SelectItem value="google_drive">Google Drive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Display Name</Label>
              <Input
                placeholder={
                  isInboxForm
                    ? "e.g. Deals Inbox"
                    : isDriveForm
                      ? "e.g. Intake Drive Folder"
                      : "e.g. Diligence Uploads"
                }
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className="h-9"
              />
            </div>

            {isInboxForm ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">IMAP Host</Label>
                    <Input
                      placeholder="imap.gmail.com"
                      value={form.imapHost}
                      onChange={(e) => setField("imapHost", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Port</Label>
                    <Input
                      type="number"
                      min={1}
                      max={65535}
                      value={form.imapPort}
                      onChange={(e) => setField("imapPort", e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Username</Label>
                  <Input
                    placeholder="deals@yourfund.com"
                    autoComplete="off"
                    value={form.username}
                    onChange={(e) => setField("username", e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder={isEdit ? "Leave blank to keep current password" : "App password"}
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">
                    Poll Interval (seconds)
                  </Label>
                  <Input
                    type="number"
                    min={MIN_POLL_INTERVAL_SECONDS}
                    value={form.pollIntervalSeconds}
                    onChange={(e) => setField("pollIntervalSeconds", e.target.value)}
                    className="h-9"
                  />
                  <p className="text-[10px] text-slate-400">
                    How often the inbox is checked for new mail. Minimum {MIN_POLL_INTERVAL_SECONDS}s.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">
                      Delete after ingest
                    </Label>
                    <p className="text-[10px] text-slate-400">
                      Deletes mail from the inbox only after DRAT has fully
                      ingested it. Partially processed messages are left in place.
                    </p>
                  </div>
                  <Switch
                    checked={form.deleteAfterIngest}
                    onCheckedChange={(v) => setField("deleteAfterIngest", v)}
                  />
                </div>
              </>
            ) : isDriveForm ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Drive Folder</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={form.driveFolderPath || form.driveFolderId || ""}
                      placeholder="Select a Google Drive folder"
                      className="h-9 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl shrink-0"
                      onClick={() => setPickerOpen(true)}
                    >
                      Browse
                    </Button>
                  </div>
                  {form.driveFolderId && (
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      ID: {form.driveFolderId}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">
                    Poll Interval (seconds)
                  </Label>
                  <Input
                    type="number"
                    min={MIN_POLL_INTERVAL_SECONDS}
                    value={form.pollIntervalSeconds}
                    onChange={(e) => setField("pollIntervalSeconds", e.target.value)}
                    className="h-9"
                  />
                  <p className="text-[10px] text-slate-400">
                    How often Drive is checked for new files. Minimum {MIN_POLL_INTERVAL_SECONDS}s.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Recursive</Label>
                    <p className="text-[10px] text-slate-400">Also watch nested subfolders.</p>
                  </div>
                  <Switch
                    checked={form.recursive}
                    onCheckedChange={(v) => setField("recursive", v)}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">
                      Delete source file after it&apos;s filed
                    </Label>
                    <p className="text-[10px] text-slate-400">
                      Files are trashed from the watched folder only after DRAT
                      successfully files them.
                    </p>
                  </div>
                  <Switch
                    checked={form.deleteAfterFiling}
                    onCheckedChange={(v) => setField("deleteAfterFiling", v)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Location</Label>
                  <Select
                    value={form.locationType}
                    onValueChange={(v) => setField("locationType", v as FolderLocationType)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                      <SelectItem value="server">Server Path</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Path</Label>
                  <Input
                    placeholder={
                      form.locationType === "gcs" ? "gs://bucket-name/prefix" : "/mnt/shared/intake"
                    }
                    value={form.path}
                    onChange={(e) => setField("path", e.target.value)}
                    className="h-9 font-mono text-sm"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Recursive</Label>
                    <p className="text-[10px] text-slate-400">Also watch nested subfolders.</p>
                  </div>
                  <Switch
                    checked={form.recursive}
                    onCheckedChange={(v) => setField("recursive", v)}
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div>
                <Label className="text-xs font-semibold text-slate-600">Enabled</Label>
                <p className="text-[10px] text-slate-400">
                  Disabled sources are kept but not polled.
                </p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(v) => setField("enabled", v)} />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!hasRequiredFields || isBusy}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
            >
              {isBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isTestingImap
                ? "Testing IMAP…"
                : isEdit
                  ? "Save Changes"
                  : "Add Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DriveFolderPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleDriveSelect}
      />
    </>
  );
}
