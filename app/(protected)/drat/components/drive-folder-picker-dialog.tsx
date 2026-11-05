"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Folder,
  FolderOpen,
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
import {
  browseDriveFolders,
  DriveFolderEntry,
  listSharedDrives,
  searchDriveFolders,
  SharedDriveEntry,
} from "../services/drive-map-api";
import { QueryErrorState } from "@/components/query-error-state";

// What failed, kept raw so the error state can show its status and ID, plus how to retry it.
type DriveLoadFailure = { title: string; error: unknown; fallback: string; retry: () => void };

interface BreadcrumbItem {
  id: string;
  name: string;
  /** True only for the real My Drive root crumb — never inferred from display name. */
  isMyDriveRoot?: boolean;
}

export interface DriveFolderSelection {
  folderId: string;
  folderPath: string;
  connectorConfigId: string | null;
}

interface DriveFolderPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (selection: DriveFolderSelection) => void;
  title?: string;
  description?: string;
}

const MY_DRIVE_CRUMB: BreadcrumbItem = {
  id: "root",
  name: "My Drive",
  isMyDriveRoot: true,
};
/** Virtual list of Shared Drives — not a selectable watch target. */
const SHARED_DRIVES_CRUMB: BreadcrumbItem = {
  id: "__shared_drives__",
  name: "Shared drives",
};

const SEARCH_DEBOUNCE_MS = 450;
const MIN_SEARCH_CHARS = 2;

type ListMode = "browse" | "shared_drives" | "search";

function sortFolders(folders: DriveFolderEntry[]) {
  return [...folders].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

/** Drive's `name contains` is fuzzy; keep only real substring matches. */
function filterExactSubstring(folders: DriveFolderEntry[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return folders;
  return folders.filter((folder) => folder.name.toLowerCase().includes(needle));
}

function pathFromBreadcrumbs(crumbs: BreadcrumbItem[]) {
  if (crumbs.length === 0) return MY_DRIVE_CRUMB.name;
  if (crumbs.length === 1) return crumbs[0].name;
  // Drop crumb 0 (My Drive or Shared drives) for nested paths.
  return crumbs
    .slice(1)
    .map((item) => item.name)
    .join("/");
}

export function DriveFolderPickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = "Select Google Drive Folder",
  description = "Choose the folder DRAT should watch for new PDF and DOCX files. Browse My Drive or Shared drives, or search by name (includes shared-with-me).",
}: DriveFolderPickerDialogProps) {
  const connectorConfigIdRef = useRef<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([MY_DRIVE_CRUMB]);
  const [folders, setFolders] = useState<DriveFolderEntry[]>([]);
  const [sharedDrives, setSharedDrives] = useState<SharedDriveEntry[]>([]);
  const [listMode, setListMode] = useState<ListMode>("browse");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<DriveLoadFailure | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState<string | null>(null);

  const currentFolder = breadcrumbs[breadcrumbs.length - 1] ?? MY_DRIVE_CRUMB;
  const currentPath = pathFromBreadcrumbs(breadcrumbs);
  const isSearchMode = listMode === "search" && !!activeSearch;
  const isAtMyDriveRoot =
    listMode === "browse" &&
    !isSearchMode &&
    breadcrumbs.length === 1 &&
    !!breadcrumbs[0].isMyDriveRoot;
  // Never persist "root": browse-folders returns folder_id="root" for My Drive
  // (the alias is truthy, so the backend does not resolve a concrete id). The
  // button stays disabled until the admin drills into a real folder.
  const canSelectCurrent =
    !isLoading &&
    !loadError &&
    !isSearchMode &&
    currentFolder.id !== SHARED_DRIVES_CRUMB.id &&
    currentFolder.id !== "root" &&
    !currentFolder.isMyDriveRoot;

  const loadFolders = useCallback(async (folderId: string, crumbs: BreadcrumbItem[]) => {
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
      setBreadcrumbs(crumbs);
      setFolders(sortFolders(result.folders));
      setSharedDrives([]);
    } catch (error: unknown) {
      if (requestId !== requestIdRef.current) return;
      setLoadError({
        title: "Couldn't open this Drive folder",
        error,
        fallback: "Failed to browse Google Drive. Connect Google Drive in Core OS first.",
        retry: () => void loadFolders(folderId, crumbs),
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

  const openMyDriveRoot = useCallback(async () => {
    const next = [MY_DRIVE_CRUMB];
    setBreadcrumbs(next);
    await loadFolders("root", next);
  }, [loadFolders]);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < MIN_SEARCH_CHARS) {
        setActiveSearch(null);
        const current = breadcrumbs[breadcrumbs.length - 1];
        if (current?.id === SHARED_DRIVES_CRUMB.id) {
          setBreadcrumbs([SHARED_DRIVES_CRUMB]);
          await loadSharedDrives();
          return;
        }
        if (!current || current.isMyDriveRoot || current.id === "root") {
          await openMyDriveRoot();
          return;
        }
        await loadFolders(current.id, breadcrumbs);
        return;
      }

      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setLoadError(null);
      setActiveSearch(trimmed);
      setListMode("search");
      try {
        const result = await searchDriveFolders({
          q: trimmed,
          connectorConfigId: connectorConfigIdRef.current ?? undefined,
        });
        if (requestId !== requestIdRef.current) return;
        connectorConfigIdRef.current = result.connector_config_id;
        setFolders(sortFolders(filterExactSubstring(result.folders, trimmed)));
        setSharedDrives([]);
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
    },
    [breadcrumbs, loadFolders, loadSharedDrives, openMyDriveRoot]
  );

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!open) return;
    requestIdRef.current += 1;
    connectorConfigIdRef.current = null;
    setSearchQuery("");
    setActiveSearch(null);
    setLoadError(null);
    setSharedDrives([]);
    void openMyDriveRoot();
  }, [open, openMyDriveRoot]);

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
    const current = breadcrumbs[breadcrumbs.length - 1];
    if (current?.id === SHARED_DRIVES_CRUMB.id) {
      void loadSharedDrives();
      return;
    }
    if (!current || current.isMyDriveRoot || current.id === "root") {
      void openMyDriveRoot();
      return;
    }
    void loadFolders(current.id, breadcrumbs);
  };

  const openSharedDrivesList = async () => {
    setSearchQuery("");
    setActiveSearch(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setBreadcrumbs([SHARED_DRIVES_CRUMB]);
    await loadSharedDrives();
  };

  const openSharedDrive = async (drive: SharedDriveEntry) => {
    setSearchQuery("");
    setActiveSearch(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    // Breadcrumb shows the Shared Drive name — never "My Drive".
    const next = [SHARED_DRIVES_CRUMB, { id: drive.id, name: drive.name }];
    setBreadcrumbs(next);
    await loadFolders(drive.id, next);
  };

  const openFolder = async (folder: DriveFolderEntry) => {
    setSearchQuery("");
    setActiveSearch(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    // Search hits may be shared-with-me / Shared Drive folders — don't label as My Drive.
    const next = isSearchMode
      ? [{ id: folder.id, name: folder.name }]
      : [...breadcrumbs, { id: folder.id, name: folder.name }];
    setBreadcrumbs(next);
    await loadFolders(folder.id, next);
  };

  const jumpToBreadcrumb = async (index: number) => {
    setSearchQuery("");
    setActiveSearch(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const next = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(next);
    const target = next[next.length - 1];
    if (target.id === SHARED_DRIVES_CRUMB.id) {
      await loadSharedDrives();
      return;
    }
    if (target.isMyDriveRoot || target.id === "root") {
      await openMyDriveRoot();
      return;
    }
    await loadFolders(target.id, next);
  };

  const handleSelect = () => {
    if (!canSelectCurrent) return;
    onSelect({
      folderId: currentFolder.id,
      folderPath: currentPath,
      connectorConfigId: connectorConfigIdRef.current,
    });
    onOpenChange(false);
  };

  const handleSelectSearchHit = (folder: DriveFolderEntry) => {
    onSelect({
      folderId: folder.id,
      folderPath: folder.name,
      connectorConfigId: connectorConfigIdRef.current,
    });
    onOpenChange(false);
  };

  const emptyMessage = () => {
    if (isSearchMode) {
      return "No folders matched. Try another name, or clear search to browse.";
    }
    if (searchQuery.trim().length > 0 && searchQuery.trim().length < MIN_SEARCH_CHARS) {
      return `Type at least ${MIN_SEARCH_CHARS} characters to search.`;
    }
    if (listMode === "shared_drives") {
      return "No Shared Drives are visible to this Google account.";
    }
    return "No subfolders here";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-slate-800">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={`Search folders (min ${MIN_SEARCH_CHARS} characters)…`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-9 rounded-xl border-slate-200 bg-slate-50/50"
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
            <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
              {breadcrumbs.map((crumb, index) => (
                <button
                  key={`${crumb.id}-${index}`}
                  type="button"
                  onClick={() => void jumpToBreadcrumb(index)}
                  className="inline-flex items-center gap-1 hover:text-indigo-600"
                >
                  {index > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
                  <span
                    className={
                      index === breadcrumbs.length - 1 ? "font-semibold text-slate-700" : ""
                    }
                  >
                    {crumb.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Exact name matches for &quot;{activeSearch}&quot; — open a folder to browse, or
              select it directly (My Drive, Shared drives, and shared-with-me).
            </p>
          )}

          <div className="h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
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
            ) : listMode === "shared_drives" ? (
              <ul className="divide-y divide-slate-100">
                <li>
                  <button
                    type="button"
                    onClick={() => void openMyDriveRoot()}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-white"
                  >
                    <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="truncate">My Drive</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto shrink-0" />
                  </button>
                </li>
                {sharedDrives.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-slate-400">
                    {emptyMessage()}
                  </li>
                ) : (
                  sharedDrives.map((drive) => (
                    <li key={drive.id}>
                      <button
                        type="button"
                        onClick={() => void openSharedDrive(drive)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-white"
                      >
                        <HardDrive className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="truncate">{drive.name}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto shrink-0" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : folders.length === 0 && !isAtMyDriveRoot ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                {emptyMessage()}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {isAtMyDriveRoot ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => void openSharedDrivesList()}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-white"
                    >
                      <HardDrive className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="truncate">Shared drives</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto shrink-0" />
                    </button>
                  </li>
                ) : null}
                {folders.map((folder) => (
                  <li key={folder.id} className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => void openFolder(folder)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-white"
                    >
                      <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="truncate">{folder.name}</span>
                      {!isSearchMode ? (
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto shrink-0" />
                      ) : null}
                    </button>
                    {isSearchMode ? (
                      <button
                        type="button"
                        className="shrink-0 px-3 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                        onClick={() => handleSelectSearchHit(folder)}
                      >
                        Select
                      </button>
                    ) : null}
                  </li>
                ))}
                {folders.length === 0 && isAtMyDriveRoot ? (
                  <li className="px-3 py-6 text-center text-sm text-slate-400">
                    No subfolders in My Drive
                  </li>
                ) : null}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <FolderOpen className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="truncate font-mono">{currentPath}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!canSelectCurrent}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
          >
            Use This Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
