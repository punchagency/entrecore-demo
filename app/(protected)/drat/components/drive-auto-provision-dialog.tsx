"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Folder,
  FolderPlus,
  HardDrive,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  browseDriveFolders,
  DriveFolderEntry,
  listSharedDrives,
  SharedDriveEntry,
} from "../services/drive-map-api";
import { DriveAutoProvisionConfig, formatProvisionSummary } from "../services/entities-api";
import {
  useClearDriveAutoProvisionConfig,
  useProvisionDriveFolders,
  useSetDriveAutoProvisionConfig,
} from "../hooks/use-entities";
import { QueryErrorState } from "@/components/query-error-state";

// What failed, kept raw so the error state can show its status and ID, plus how to retry it.
type DriveLoadFailure = { title: string; error: unknown; fallback: string; retry: () => void };

interface Crumb {
  id: string;
  name: string;
}

const ROOT_CRUMB: Crumb = { id: "root", name: "My Drive" };
/** Virtual list of Shared Drives — a container, never a parent for client folders. */
const SHARED_DRIVES_CRUMB: Crumb = { id: "__shared_drives__", name: "Shared drives" };

type ListMode = "browse" | "shared_drives";

interface DriveAutoProvisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingConfig?: DriveAutoProvisionConfig | null;
  /** Entities with no Drive folder yet, so the backfill button can say how many. */
  unmappedCount?: number;
}

export function DriveAutoProvisionDialog({
  open,
  onOpenChange,
  existingConfig,
  unmappedCount,
}: DriveAutoProvisionDialogProps) {
  const [enabled, setEnabled] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<Crumb[]>([ROOT_CRUMB]);
  const [folders, setFolders] = useState<DriveFolderEntry[]>([]);
  const [sharedDrives, setSharedDrives] = useState<SharedDriveEntry[]>([]);
  const [listMode, setListMode] = useState<ListMode>("browse");
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [browseError, setBrowseError] = useState<DriveLoadFailure | null>(null);

  const isSharedDrivesList = listMode === "shared_drives";
  const isAtMyDriveRoot =
    listMode === "browse" && crumbs.length === 1 && crumbs[0]?.id === ROOT_CRUMB.id;

  const setConfig = useSetDriveAutoProvisionConfig();
  const clearConfig = useClearDriveAutoProvisionConfig();
  const provisionNow = useProvisionDriveFolders();

  const loadFolders = useCallback(async (folderId: string) => {
    setIsBrowsing(true);
    setBrowseError(null);
    setListMode("browse");
    try {
      const response = await browseDriveFolders({
        folderId: folderId === "root" ? undefined : folderId,
      });
      setFolders(
        [...response.folders].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        )
      );
      setSharedDrives([]);
    } catch (error: unknown) {
      setBrowseError({
        title: "Couldn't list Google Drive folders",
        error,
        fallback: "Could not list Google Drive folders",
        retry: () => void loadFolders(folderId),
      });
      setFolders([]);
    } finally {
      setIsBrowsing(false);
    }
  }, []);

  const loadSharedDrives = useCallback(async () => {
    setIsBrowsing(true);
    setBrowseError(null);
    setListMode("shared_drives");
    setFolders([]);
    try {
      const response = await listSharedDrives();
      setSharedDrives(
        [...response.drives].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        )
      );
    } catch (error: unknown) {
      setBrowseError({
        title: "Couldn't list Shared Drives",
        error,
        fallback: "Could not list Shared Drives. Confirm the connected account can access them.",
        retry: () => void loadSharedDrives(),
      });
      setSharedDrives([]);
    } finally {
      setIsBrowsing(false);
    }
  }, []);

  // Read through a ref so the hydration effect below doesn't depend on the
  // config object's identity.
  const configRef = useRef(existingConfig);
  configRef.current = existingConfig;

  // Hydrate the form only as the dialog opens. Depending on existingConfig here
  // would re-run on every background refetch of the config query and silently
  // revert whatever the user had just changed.
  useEffect(() => {
    if (!open) return;
    const cfg = configRef.current;
    setEnabled(cfg?.enabled ?? false);
    setParentId(cfg?.parent_folder_id ?? null);
    setParentPath(cfg?.parent_folder_path ?? null);
    setCrumbs([ROOT_CRUMB]);
    void loadFolders("root");
  }, [open, loadFolders]);

  // Opening a folder is also how you choose it: the destination is always the
  // folder you are looking at. Selecting used to be a second, separate click on
  // a button below the list, which read as confirmation of something already
  // done — so it got skipped, and client folders silently went to the root.
  const selectCrumbs = (next: Crumb[]) => {
    setCrumbs(next);
    const target = next[next.length - 1] ?? ROOT_CRUMB;
    // Neither My Drive root nor the Shared Drives list is a real folder, so
    // neither can be stored as the parent new client folders are created under.
    if (target.id === ROOT_CRUMB.id || target.id === SHARED_DRIVES_CRUMB.id) {
      setParentId(null);
      setParentPath(null);
    } else {
      setParentId(target.id);
      setParentPath(
        next
          .slice(1)
          .map((c) => c.name)
          .join("/")
      );
    }
  };

  const openFolder = async (folder: DriveFolderEntry) => {
    selectCrumbs([...crumbs, { id: folder.id, name: folder.name }]);
    await loadFolders(folder.id);
  };

  const openSharedDrivesList = async () => {
    selectCrumbs([SHARED_DRIVES_CRUMB]);
    await loadSharedDrives();
  };

  const openMyDriveRoot = async () => {
    selectCrumbs([ROOT_CRUMB]);
    await loadFolders("root");
  };

  const openSharedDrive = async (drive: SharedDriveEntry) => {
    // A Shared Drive's own root is a real folder, so it is a valid parent.
    selectCrumbs([SHARED_DRIVES_CRUMB, { id: drive.id, name: drive.name }]);
    await loadFolders(drive.id);
  };

  const jumpTo = async (index: number) => {
    const next = crumbs.slice(0, index + 1);
    selectCrumbs(next);
    const target = next[next.length - 1];
    if (target.id === SHARED_DRIVES_CRUMB.id) {
      await loadSharedDrives();
      return;
    }
    await loadFolders(target.id);
  };

  const handleSave = async () => {
    try {
      await setConfig.mutateAsync({
        enabled,
        parent_folder_id: parentId,
        parent_folder_path: parentPath,
      });
      toast.success(
        enabled
          ? `Auto-provisioning on — new clients get a folder in ${parentPath ?? "My Drive"}`
          : "Auto-provisioning saved as disabled"
      );
      onOpenChange(false);
    } catch (error: unknown) {
      showApiErrorToast(error, "Failed to save settings");
    }
  };

  const handleClear = async () => {
    try {
      await clearConfig.mutateAsync();
      toast.success("Auto-provisioning settings removed");
      onOpenChange(false);
    } catch (error: unknown) {
      showApiErrorToast(error, "Failed to remove settings");
    }
  };

  const handleBackfill = async () => {
    try {
      const result = await provisionNow.mutateAsync();
      const summary = formatProvisionSummary(result);
      if (result.failed > 0) {
        toast.warning(summary, { description: result.errors.slice(0, 3).join("; ") });
      } else {
        toast.success(summary);
      }
    } catch (error: unknown) {
      showApiErrorToast(error, "Failed to provision Drive folders");
    }
  };

  const isSaved = Boolean(existingConfig);
  const isBusy = setConfig.isPending || clearConfig.isPending || provisionNow.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Automatic client folders
          </DialogTitle>
          <DialogDescription>
            Give every new client a Google Drive folder named after it, without picking one
            by hand. Applies when you add a client, import a list, or sync from Airtable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="auto-provision-enabled">Create folders automatically</Label>
              <p className="text-xs text-slate-500">
                An existing folder with the same name is reused, never duplicated.
              </p>
            </div>
            <Switch
              id="auto-provision-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={isBusy}
            />
          </div>

          <div className="space-y-2">
            <Label>Where new folders go</Label>
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                parentPath
                  ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {parentPath ? (
                <Check className="h-4 w-4 shrink-0 text-indigo-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              )}
              <span className="truncate font-medium">
                {parentPath ?? "My Drive (root) — mixed in with everything else"}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
                {crumbs.map((crumb, index) => (
                  <span key={`${crumb.id}-${index}`} className="flex items-center gap-1">
                    {index > 0 ? <ChevronRight className="h-3 w-3" /> : null}
                    <button
                      type="button"
                      className="hover:text-slate-900 hover:underline"
                      onClick={() => void jumpTo(index)}
                      disabled={isBrowsing}
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </div>

              <div className="max-h-44 overflow-y-auto p-1">
                {isBrowsing ? (
                  <div className="flex items-center gap-2 px-2 py-4 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading folders…
                  </div>
                ) : browseError ? (
                  <QueryErrorState
                variant="inline"
                className="my-2 p-3"
                error={browseError.error}
                title={browseError.title}
                fallbackMessage={browseError.fallback}
                onRetry={browseError.retry}
              />
                ) : isSharedDrivesList ? (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                      onClick={() => void openMyDriveRoot()}
                    >
                      <Folder className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">My Drive</span>
                    </button>
                    {sharedDrives.length === 0 ? (
                      <p className="px-2 py-4 text-sm text-slate-500">
                        No Shared Drives are visible to this Google account.
                      </p>
                    ) : (
                      sharedDrives.map((drive) => (
                        <button
                          key={drive.id}
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                          onClick={() => void openSharedDrive(drive)}
                        >
                          <HardDrive className="h-4 w-4 shrink-0 text-indigo-500" />
                          <span className="truncate">{drive.name}</span>
                        </button>
                      ))
                    )}
                  </>
                ) : folders.length === 0 && !isAtMyDriveRoot ? (
                  <p className="px-2 py-4 text-sm text-slate-500">
                    No subfolders here.
                  </p>
                ) : (
                  <>
                    {isAtMyDriveRoot ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                        onClick={() => void openSharedDrivesList()}
                      >
                        <HardDrive className="h-4 w-4 shrink-0 text-indigo-500" />
                        <span className="truncate">Shared drives</span>
                      </button>
                    ) : null}
                    {folders.length === 0 && isAtMyDriveRoot ? (
                      <p className="px-2 py-4 text-sm text-slate-500">
                        No subfolders in My Drive.
                      </p>
                    ) : null}
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                        onClick={() => void openFolder(folder)}
                      >
                        <Folder className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>

              <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                {parentPath
                  ? `Client folders go in “${parentPath.split("/").pop()}”. Open another folder to change it.`
                  : isSharedDrivesList
                    ? "Open a Shared Drive to put client folders inside it."
                    : "Open a folder to put client folders inside it."}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Opening a folder chooses it. A dedicated folder keeps your client folders
              together; My Drive root mixes them in with everything else. A Shared Drive
              is owned by the organisation, so folders survive someone leaving.
            </p>
          </div>

          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p>
                Folders are matched on the exact client name. A client called “KAGI INC.”
                won’t match a folder named “Kagi Inc”, so a second folder gets created.
              </p>
              <p>
                Clients that already have a Drive folder are never changed, including ones
                you picked by hand.
              </p>
            </div>
          </div>

          {isSaved && existingConfig?.enabled ? (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <Label>Clients added before this was switched on</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full rounded-lg"
                onClick={() => void handleBackfill()}
                disabled={isBusy}
              >
                {provisionNow.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FolderPlus className="mr-2 h-3.5 w-3.5" />
                )}
                {typeof unmappedCount === "number" && unmappedCount > 0
                  ? `Create folders for ${unmappedCount} client${unmappedCount > 1 ? "s" : ""} without one`
                  : "Create folders for clients without one"}
              </Button>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {isSaved ? (
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => void handleClear()}
              disabled={isBusy}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => void handleSave()}
              disabled={isBusy}
            >
              {setConfig.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
