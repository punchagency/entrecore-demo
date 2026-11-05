"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Loader2,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Entity } from "../services/entities-api";
import {
  EntityDriveMap,
  browseDriveFolders,
  createDriveFolder,
  DriveFolderEntry,
  listSharedDrives,
  searchDriveFolders,
  SharedDriveEntry,
} from "../services/drive-map-api";
import { useUpsertEntityDriveMap } from "../hooks/use-entity-drive-map";
import { QueryErrorState } from "@/components/query-error-state";

// What failed, kept raw so the error state can show its status and ID, plus how to retry it.
type DriveLoadFailure = { title: string; error: unknown; fallback: string; retry: () => void };

interface BreadcrumbItem {
  id: string;
  name: string;
  /** True only for the real My Drive root crumb — never inferred from display name. */
  isMyDriveRoot?: boolean;
}

interface EntityDriveFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Entity | null;
  existingMap?: EntityDriveMap | null;
}

const ROOT_CRUMB: BreadcrumbItem = { id: "root", name: "My Drive", isMyDriveRoot: true };
/** Virtual list of Shared Drives — a container, never a mappable client root. */
const SHARED_DRIVES_CRUMB: BreadcrumbItem = {
  id: "__shared_drives__",
  name: "Shared drives",
};
const SEARCH_DEBOUNCE_MS = 450;
const MIN_SEARCH_CHARS = 2;

type ListMode = "browse" | "shared_drives";

function sortFolders(folders: DriveFolderEntry[]) {
  return [...folders].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

function pathFromBreadcrumbs(crumbs: BreadcrumbItem[]) {
  if (crumbs.length === 0) return ROOT_CRUMB.name;
  if (crumbs.length === 1) return crumbs[0].name;
  // Drop crumb 0 (My Drive or Shared drives) for nested paths.
  return crumbs
    .slice(1)
    .map((item) => item.name)
    .join("/");
}

/** Drive's `name contains` is fuzzy; keep only real substring matches. */
function filterExactSubstring(folders: DriveFolderEntry[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return folders;
  return folders.filter((folder) => folder.name.toLowerCase().includes(needle));
}

export function EntityDriveFolderDialog({
  open,
  onOpenChange,
  entity,
  existingMap,
}: EntityDriveFolderDialogProps) {
  const upsertMutation = useUpsertEntityDriveMap();
  const connectorConfigIdRef = useRef<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([ROOT_CRUMB]);
  const [folders, setFolders] = useState<DriveFolderEntry[]>([]);
  const [sharedDrives, setSharedDrives] = useState<SharedDriveEntry[]>([]);
  const [listMode, setListMode] = useState<ListMode>("browse");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState<DriveLoadFailure | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState<string | null>(null);

  const currentFolder = breadcrumbs[breadcrumbs.length - 1] ?? ROOT_CRUMB;
  const currentPath = pathFromBreadcrumbs(breadcrumbs);
  const isSearchMode = !!activeSearch;
  const isSharedDrivesList = listMode === "shared_drives" && !isSearchMode;
  const isAtMyDriveRoot =
    listMode === "browse" &&
    !isSearchMode &&
    breadcrumbs.length === 1 &&
    !!breadcrumbs[0]?.isMyDriveRoot;
  // "root" is an alias the backend never resolves to a concrete id, and the
  // Shared Drives crumb is a list rather than a folder — neither can be stored
  // as a client root. A Shared Drive's own root is a real folder and is fine.
  const canSelectCurrent =
    !isSearchMode &&
    !isSharedDrivesList &&
    currentFolder.id !== "root" &&
    currentFolder.id !== SHARED_DRIVES_CRUMB.id &&
    !currentFolder.isMyDriveRoot;

  const loadFolders = useCallback(async (folderId?: string) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    setActiveSearch(null);
    setListMode("browse");
    try {
      const normalizedFolderId =
        folderId && folderId !== "root" ? folderId : undefined;
      const result = await browseDriveFolders({
        folderId: normalizedFolderId,
        connectorConfigId: connectorConfigIdRef.current ?? undefined,
      });
      if (requestId !== requestIdRef.current) return;
      connectorConfigIdRef.current = result.connector_config_id;
      setFolders(sortFolders(result.folders));
      setSharedDrives([]);
    } catch (error: unknown) {
      if (requestId !== requestIdRef.current) return;
      setLoadError({
        title: "Couldn't open this Drive folder",
        error,
        fallback: "Failed to browse Google Drive. Connect Google Drive in Core OS first.",
        retry: () => void loadFolders(folderId),
      });
      setFolders([]);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  const loadSharedDrives = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    setActiveSearch(null);
    setListMode("shared_drives");
    setFolders([]);
    try {
      const result = await listSharedDrives({
        connectorConfigId: connectorConfigIdRef.current ?? undefined,
      });
      if (requestId !== requestIdRef.current) return;
      connectorConfigIdRef.current = result.connector_config_id;
      setSharedDrives(
        [...result.drives].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        )
      );
    } catch (error: unknown) {
      if (requestId !== requestIdRef.current) return;
      setLoadError({
        title: "Couldn't list Shared Drives",
        error,
        fallback: "Failed to list Shared Drives. Confirm the connected account can access them.",
        retry: () => void loadSharedDrives(),
      });
      setSharedDrives([]);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  /** Re-show whatever the dialog was listing before a search took over. */
  const restoreListing = useCallback(
    async (crumbs: BreadcrumbItem[]) => {
      const current = crumbs[crumbs.length - 1];
      if (current?.id === SHARED_DRIVES_CRUMB.id) {
        await loadSharedDrives();
        return;
      }
      await loadFolders(current?.id === "root" ? undefined : current?.id);
    },
    [loadFolders, loadSharedDrives]
  );

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < MIN_SEARCH_CHARS) {
      setActiveSearch(null);
      await restoreListing(breadcrumbs);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    setActiveSearch(trimmed);
    try {
      const result = await searchDriveFolders({
        q: trimmed,
        connectorConfigId: connectorConfigIdRef.current ?? undefined,
      });
      if (requestId !== requestIdRef.current) return;
      connectorConfigIdRef.current = result.connector_config_id;
      setFolders(sortFolders(filterExactSubstring(result.folders, trimmed)));
    } catch (error: unknown) {
      if (requestId !== requestIdRef.current) return;
      setLoadError({
        title: "Couldn't search Drive folders",
        error,
        fallback: "Failed to search Google Drive folders.",
        retry: () => void runSearch(q),
      });
      setFolders([]);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [breadcrumbs, restoreListing]);

  useEffect(() => {
    if (!open) return;
    requestIdRef.current += 1;
    connectorConfigIdRef.current = null;
    setBreadcrumbs([ROOT_CRUMB]);
    setFolders([]);
    setSharedDrives([]);
    setListMode("browse");
    setLoadError(null);
    setNewFolderName("");
    setSearchQuery("");
    setActiveSearch(null);
    void loadFolders();
  }, [open, loadFolders]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      requestIdRef.current += 1;
    };
  }, []);

  const onSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      void runSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setActiveSearch(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    void restoreListing(breadcrumbs);
  };

  const openSharedDrivesList = async () => {
    setSearchQuery("");
    setActiveSearch(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setBreadcrumbs([SHARED_DRIVES_CRUMB]);
    await loadSharedDrives();
  };

  const openMyDriveRoot = async () => {
    setSearchQuery("");
    setActiveSearch(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setBreadcrumbs([ROOT_CRUMB]);
    await loadFolders();
  };

  const openSharedDrive = async (drive: SharedDriveEntry) => {
    setSearchQuery("");
    setActiveSearch(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    // Breadcrumb shows the Shared Drive name — never "My Drive".
    setBreadcrumbs([SHARED_DRIVES_CRUMB, { id: drive.id, name: drive.name }]);
    await loadFolders(drive.id);
  };

  const openFolder = async (folder: DriveFolderEntry) => {
    setSearchQuery("");
    setActiveSearch(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setBreadcrumbs((prev) =>
      // A search hit may live in a Shared Drive or be shared-with-me; starting a
      // fresh trail avoids labelling it as sitting under My Drive.
      isSearchMode
        ? [{ id: folder.id, name: folder.name }]
        : [...prev, { id: folder.id, name: folder.name }]
    );
    await loadFolders(folder.id);
  };

  const jumpToBreadcrumb = async (index: number) => {
    setSearchQuery("");
    setActiveSearch(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const next = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(next);
    await restoreListing(next);
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      toast.error("Enter a folder name");
      return;
    }
    if (isSearchMode) {
      toast.error("Clear search and open a parent folder before creating.");
      return;
    }
    if (isSharedDrivesList) {
      toast.error("Open a Shared Drive first, then create the folder inside it.");
      return;
    }

    setIsCreating(true);
    try {
      const parentId = currentFolder.id === "root" ? undefined : currentFolder.id;
      const created = await createDriveFolder({
        name,
        parent_folder_id: parentId,
        connector_config_id: connectorConfigIdRef.current,
      });
      connectorConfigIdRef.current = created.connector_config_id;
      setNewFolderName("");
      toast.success(
        created.created
          ? `Created "${created.name}". Open it below, then click Select to link this entity.`
          : `Folder "${created.name}" already exists. Open it below, then click Select.`
      );
      await loadFolders(parentId);
    } catch (error: unknown) {
      showApiErrorToast(error, "Failed to create folder on Google Drive");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectCurrentFolder = async () => {
    if (!entity) return;
    if (isSearchMode) {
      toast.error("Open a search result folder first, then click Select.");
      return;
    }
    if (isSharedDrivesList || currentFolder.id === SHARED_DRIVES_CRUMB.id) {
      toast.error("Open a Shared Drive, then pick a folder inside it.");
      return;
    }
    if (currentFolder.id === "root") {
      toast.error(
        'Pick a folder inside My Drive or a Shared Drive (not "My Drive" itself). Create one above or open an existing folder first.'
      );
      return;
    }
    try {
      await upsertMutation.mutateAsync({
        entity_id: entity.id,
        drive_root_folder_id: currentFolder.id,
        drive_root_path: currentPath,
      });
      toast.success(
        existingMap
          ? `Updated Drive folder for ${entity.name}`
          : `Linked ${entity.name} to Drive folder`
      );
      onOpenChange(false);
    } catch (error: unknown) {
      showApiErrorToast(error, "Failed to save Drive folder mapping");
    }
  };

  const handleSelectSearchHit = async (folder: DriveFolderEntry) => {
    if (!entity) return;
    try {
      await upsertMutation.mutateAsync({
        entity_id: entity.id,
        drive_root_folder_id: folder.id,
        drive_root_path: folder.name,
      });
      toast.success(
        existingMap
          ? `Updated Drive folder for ${entity.name}`
          : `Linked ${entity.name} to "${folder.name}"`
      );
      onOpenChange(false);
    } catch (error: unknown) {
      showApiErrorToast(error, "Failed to save Drive folder mapping");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Drive folder for {entity?.name ?? "entity"}</DialogTitle>
          <DialogDescription>
            Search, browse, or create a client root folder on Google Drive — in My Drive
            or a Shared Drive. DRAT routing rules file into subfolders beneath it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={`Search folders (min ${MIN_SEARCH_CHARS} characters)…`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-9 rounded-xl border-slate-200 bg-slate-50/50"
              disabled={isCreating}
            />
            {searchQuery ? (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {!isSearchMode ? (
            <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
              {breadcrumbs.map((crumb, index) => (
                <div key={`${crumb.id}-${index}`} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
                  <button
                    type="button"
                    onClick={() => void jumpToBreadcrumb(index)}
                    className="font-medium hover:text-indigo-600 hover:underline"
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Exact name matches for &quot;{activeSearch}&quot; — click a folder to open it, or
              Select to map it directly.
            </p>
          )}

          {!isSearchMode && !isSharedDrivesList ? (
            <div className="flex gap-2">
              <Input
                placeholder="New folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="rounded-xl border-slate-200 bg-slate-50/50"
                disabled={isCreating || isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleCreateFolder();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 rounded-xl"
                disabled={!newFolderName.trim() || isCreating || isLoading}
                onClick={() => void handleCreateFolder()}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <FolderPlus className="h-4 w-4 mr-1.5" />
                    Create
                  </>
                )}
              </Button>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isSearchMode ? "Searching…" : "Loading folders…"}
              </div>
            ) : loadError ? (
              <QueryErrorState
                variant="inline"
                className="m-3 p-3"
                error={loadError.error}
                title={loadError.title}
                fallbackMessage={loadError.fallback}
                onRetry={loadError.retry}
              />
            ) : isSharedDrivesList ? (
              <ul className="divide-y divide-slate-100">
                <li>
                  <button
                    type="button"
                    onClick={() => void openMyDriveRoot()}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white"
                  >
                    <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-800 truncate">
                      My Drive
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto shrink-0" />
                  </button>
                </li>
                {sharedDrives.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-slate-500">
                    No Shared Drives are visible to this Google account.
                  </li>
                ) : (
                  sharedDrives.map((drive) => (
                    <li key={drive.id}>
                      <button
                        type="button"
                        onClick={() => void openSharedDrive(drive)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white"
                      >
                        <HardDrive className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {drive.name}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto shrink-0" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : folders.length === 0 && !isAtMyDriveRoot ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                {isSearchMode
                  ? "No folders matched. Try another name, or clear search to browse."
                  : searchQuery.trim().length > 0 &&
                      searchQuery.trim().length < MIN_SEARCH_CHARS
                    ? `Type at least ${MIN_SEARCH_CHARS} characters to search.`
                    : "No subfolders here. Create one above, or select this folder as the entity root."}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {isAtMyDriveRoot ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => void openSharedDrivesList()}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white"
                    >
                      <HardDrive className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="text-sm font-medium text-slate-800 truncate">
                        Shared drives
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto shrink-0" />
                    </button>
                  </li>
                ) : null}
                {folders.length === 0 && isAtMyDriveRoot ? (
                  <li className="px-4 py-8 text-center text-sm text-slate-500">
                    No subfolders in My Drive.
                  </li>
                ) : null}
                {folders.map((folder) => (
                  <li key={folder.id} className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => void openFolder(folder)}
                      className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-white"
                    >
                      <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {folder.name}
                      </span>
                    </button>
                    {isSearchMode ? (
                      <button
                        type="button"
                        className="shrink-0 px-3 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                        disabled={upsertMutation.isPending}
                        onClick={() => void handleSelectSearchHit(folder)}
                      >
                        Select
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSelectCurrentFolder()}
            disabled={
              !entity ||
              upsertMutation.isPending ||
              !!loadError ||
              isLoading ||
              !canSelectCurrent
            }
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            {upsertMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FolderOpen className="h-4 w-4 mr-2" />
                Select &quot;{currentFolder.name}&quot;
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
