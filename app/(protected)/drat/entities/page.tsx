"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  Upload,
  RefreshCw,
  Search,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  ListPlus,
  FolderOpen,
  Trash2,
  CloudDownload,
  CheckCircle2,
  Settings2,
  HardDrive,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import { Entity, SyncAirtableResponse, formatSyncSummary } from "../services/entities-api";
import { EntityDriveMap } from "../services/drive-map-api";
import {
  buildEntitiesTxtFile,
  formatImportSummary,
  parseBatchEntityNames,
} from "../services/entities-api";
import {
  useCreateEntity,
  useDeleteEntity,
  useEntities,
  useImportEntities,
  useUpdateEntity,
  useSyncFromAirtable,
  useAirtableSyncConfig,
  useDriveAutoProvisionConfig,
} from "../hooks/use-entities";
import { useEntityDriveMaps } from "../hooks/use-entity-drive-map";
import { DratSectionNav } from "../components/drat-section-nav";
import { EntityDriveFolderDialog } from "../components/entity-drive-folder-dialog";
import { EntityEditDialog } from "../components/entity-edit-dialog";
import { AirtableSyncConfigDialog } from "../components/airtable-sync-config-dialog";
import { DriveAutoProvisionDialog } from "../components/drive-auto-provision-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageWrapper } from "@/components/page-wrapper";
import { QueryErrorState } from "@/components/query-error-state";

export default function DratEntitiesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [enabledFilter, setEnabledFilter] = useState<"all" | "active" | "disabled">("active");
  const limit = 15;

  const enabledParam =
    enabledFilter === "all" ? undefined : enabledFilter === "active";

  const { data, isLoading, isError, error, refetch, isFetching } = useEntities({
    search: search.trim() || undefined,
    page,
    limit,
    enabled: enabledParam,
  });

  const importMutation = useImportEntities();
  const createMutation = useCreateEntity();
  const updateMutation = useUpdateEntity();
  const deleteMutation = useDeleteEntity();
  const syncMutation = useSyncFromAirtable();

  const [lastSyncResult, setLastSyncResult] = useState<SyncAirtableResponse | null>(null);
  const [syncConfigOpen, setSyncConfigOpen] = useState(false);
  const [autoProvisionOpen, setAutoProvisionOpen] = useState(false);
  const { data: syncConfigData, isLoading: isSyncConfigLoading } = useAirtableSyncConfig();
  const syncConfig = syncConfigData?.config ?? null;

  const [togglingEntityId, setTogglingEntityId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null);
  const [editTarget, setEditTarget] = useState<Entity | null>(null);

  const [entityName, setEntityName] = useState("");
  const [entityAliases, setEntityAliases] = useState("");
  const [batchText, setBatchText] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogEntity, setFolderDialogEntity] = useState<Entity | null>(null);

  const { data: autoProvisionData } = useDriveAutoProvisionConfig();
  const autoProvisionConfig = autoProvisionData?.config ?? null;

  const { data: driveMapData } = useEntityDriveMaps();
  const driveMapByEntityId = useMemo(() => {
    const map = new Map<string, EntityDriveMap>();
    for (const item of driveMapData?.items ?? []) {
      map.set(item.entity_id, item);
    }
    return map;
  }, [driveMapData?.items]);

  // Company-wide, not page-wide: the entities table is paginated but drive maps
  // are fetched in full, so totals are the only honest comparison here.
  const unmappedEntityCount = Math.max(
    0,
    (data?.total ?? 0) - (driveMapData?.total ?? 0)
  );

  const openFolderDialog = (entity: Entity) => {
    setFolderDialogEntity(entity);
    setFolderDialogOpen(true);
  };

  // File drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validTypes = [".txt", ".csv", "text/plain", "text/csv"];
      const fileExt = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

      if (validTypes.includes(file.type) || validTypes.includes(fileExt)) {
        setSelectedFile(file);
      } else {
        toast.error("Please upload only .txt or .csv files");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    importMutation.mutate(selectedFile, {
      onSuccess: (res) => {
        toast.success(`Import complete: ${formatImportSummary(res)}`);
        setSelectedFile(null);
        refetch();
      },
      onError: (err: any) => {
        showApiErrorToast(err, "Failed to import entities");
      },
    });
  };

  const handleAddEntity = () => {
    const name = entityName.trim();
    if (!name) {
      toast.error("Enter an entity name");
      return;
    }

    const aliases = entityAliases
      .split(",")
      .map((alias) => alias.trim())
      .filter(Boolean);

    createMutation.mutate(
      {
        name,
        aliases: aliases.length > 0 ? aliases : undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Added "${name}"`);
          setEntityName("");
          setEntityAliases("");
          refetch();
        },
        onError: (err: any) => {
          showApiErrorToast(err, "Failed to add entity");
        },
      }
    );
  };

  const handleBatchImport = () => {
    const names = parseBatchEntityNames(batchText);
    if (names.length === 0) {
      toast.error("Enter at least one entity name");
      return;
    }

    importMutation.mutate(buildEntitiesTxtFile(names), {
      onSuccess: (res) => {
        toast.success(`Batch import: ${formatImportSummary(res)}`);
        setBatchText("");
        refetch();
      },
      onError: (err: any) => {
        showApiErrorToast(err, "Failed to import entities");
      },
    });
  };

  const toggleEntityEnabled = (entity: Entity, enabled: boolean) => {
    setTogglingEntityId(entity.id);
    updateMutation.mutate(
      { id: entity.id, payload: { enabled } },
      {
        onSuccess: () => {
          toast.success(`${entity.name} ${enabled ? "enabled" : "disabled"} for matching`);
          setTogglingEntityId(null);
        },
        onError: (err: any) => {
          showApiErrorToast(err, `Failed to update ${entity.name}`);
          setTogglingEntityId(null);
        },
      }
    );
  };

  const handleDeleteEntity = () => {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Deleted "${name}"`);
        setDeleteTarget(null);
        refetch();
      },
      onError: (err: any) => {
        showApiErrorToast(err, `Failed to delete ${name}`);
      },
    });
  };

  const parsedBatchCount = parseBatchEntityNames(batchText).length;

  const handleSyncFromAirtable = () => {
    // Without a base/table the backend can only 400. Send the user to the settings
    // they're missing instead of making them read an error to find that out.
    if (!syncConfig) {
      setSyncConfigOpen(true);
      toast.info("Choose an Airtable base and table before syncing.");
      return;
    }
    syncMutation.mutate(undefined, {
      onSuccess: (res) => {
        setLastSyncResult(res);
        const summary = formatSyncSummary(res);
        // Folder creation runs in the background, so say so — otherwise a sync that
        // added clients looks like it ignored the auto-folder setting.
        const folderNote =
          autoProvisionConfig?.enabled && res.created > 0
            ? " Drive folders are being created in the background."
            : "";
        if (res.errors.length > 0) {
          toast.warning(`Sync complete with ${res.errors.length} error(s): ${summary}`);
        } else {
          toast.success(`Airtable sync complete — ${summary}.${folderNote}`);
        }
        refetch();
      },
      onError: (error: unknown) => {
        showApiErrorToast(error, "Airtable sync failed");
      },
    });
  };


  const entityList = data?.entities || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / limit) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <PageWrapper title="Entities">
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="w-full p-6 space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                  <Database className="h-6 w-6 text-indigo-300" />
                </div>
                <Badge
                  variant="outline"
                  className="border-indigo-400 text-indigo-300 font-medium tracking-wide bg-indigo-950/30"
                >
                  DRAT Admin
                </Badge>
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                Entity Management
              </h1>
              <p className="text-indigo-100/80 leading-relaxed max-w-xl">
                Add entities manually, paste a batch list, or upload a file. Search and manage your routing targets here.
              </p>
            </div>

            {/* Sync from Airtable */}
            <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setSyncConfigOpen(true)}
                  className="text-indigo-100 hover:text-white hover:bg-white/10 rounded-xl h-11 px-4"
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Airtable settings
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setAutoProvisionOpen(true)}
                  className="text-indigo-100 hover:text-white hover:bg-white/10 rounded-xl h-11 px-4"
                >
                  <HardDrive className="h-4 w-4 mr-2" />
                  {autoProvisionConfig?.enabled ? "Auto folders: on" : "Auto folders"}
                </Button>
                <Button
                  id="sync-airtable-btn"
                  onClick={handleSyncFromAirtable}
                  disabled={syncMutation.isPending || isSyncConfigLoading}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl h-11 px-5 backdrop-blur-md transition-all"
                >
                  {syncMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing…
                    </>
                  ) : (
                    <>
                      <CloudDownload className="h-4 w-4 mr-2" />
                      Sync from Airtable
                    </>
                  )}
                </Button>
              </div>
              {!isSyncConfigLoading && !syncConfig && (
                <button
                  type="button"
                  onClick={() => setSyncConfigOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-amber-200/90 hover:text-amber-100"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Not configured yet — choose a base and table first</span>
                </button>
              )}
              {syncConfig && (
                <p className="text-xs text-indigo-200/70 font-mono">
                  {syncConfig.base_id} · {syncConfig.table_name}
                </p>
              )}
              {lastSyncResult && lastSyncResult.errors.length === 0 && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-200/80">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>{formatSyncSummary(lastSyncResult)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <DratSectionNav active="entities" />

        {/* Action Containers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Card */}
          <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm lg:col-span-1 h-fit">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-indigo-600" />
                  Add Entity
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Type a single entity name and optional aliases (comma-separated).
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="entity-name" className="text-xs font-semibold text-slate-600">
                    Entity name
                  </Label>
                  <Input
                    id="entity-name"
                    placeholder="Acme Corp"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    className="rounded-xl border-slate-200 bg-slate-50/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="entity-aliases" className="text-xs font-semibold text-slate-600">
                    Aliases (optional)
                  </Label>
                  <Input
                    id="entity-aliases"
                    placeholder="Acme Co, Acme Corporation"
                    value={entityAliases}
                    onChange={(e) => setEntityAliases(e.target.value)}
                    className="rounded-xl border-slate-200 bg-slate-50/50"
                  />
                </div>
                <Button
                  onClick={handleAddEntity}
                  disabled={!entityName.trim() || createMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-10"
                >
                  {createMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Entity
                    </>
                  )}
                </Button>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ListPlus className="h-5 w-5 text-indigo-600" />
                    Paste Batch
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    One name per line, or comma-separated. Each entry becomes its own entity.
                  </p>
                </div>
                <Textarea
                  placeholder={"Acme Corp\nGlobex Inc\nInitech"}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  rows={5}
                  className="rounded-xl border-slate-200 bg-slate-50/50 resize-none text-sm"
                />
                <Button
                  onClick={handleBatchImport}
                  disabled={parsedBatchCount === 0 || importMutation.isPending}
                  variant="outline"
                  className="w-full rounded-xl border-slate-200 h-10"
                >
                  {importMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <ListPlus className="h-4 w-4 mr-2" />
                      Import {parsedBatchCount > 0 ? `${parsedBatchCount} ` : ""}Entities
                    </>
                  )}
                </Button>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-indigo-600" />
                  Upload Entity List
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Upload a <code>.txt</code> (one name per line) or <code>.csv</code> with entity names and optional aliases.
                </p>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[160px] ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50/50 scale-[0.98]"
                    : selectedFile
                    ? "border-emerald-500 bg-emerald-50/10"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}
              >
                <input
                  type="file"
                  id="entity-file-upload"
                  accept=".txt,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-100/80 text-emerald-700 rounded-2xl inline-flex">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800 max-w-[220px] truncate mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="entity-file-upload"
                    className="cursor-pointer space-y-3 w-full flex flex-col items-center"
                  >
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-700">
                        Drag & drop to upload
                      </p>
                      <p className="text-xs text-slate-400">
                        or <span className="text-indigo-600 hover:underline">browse files</span>
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Supports TXT and CSV formats
                    </p>
                  </label>
                )}
              </div>

              {/* Submit Upload */}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || importMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11"
              >
                {importMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Entities
                  </>
                )}
              </Button>
              </div>
            </CardContent>
          </Card>

          {/* List & Search Card */}
          <Card className="border-0 ring-1 ring-slate-200/60 rounded-3xl bg-white shadow-sm lg:col-span-2 overflow-hidden">
            <CardContent className="p-0">
              {/* Toolbar */}
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:max-w-lg">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search entities..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="pl-10 rounded-xl border-slate-200 focus-visible:ring-indigo-500 bg-slate-50/50"
                    />
                  </div>
                  <Select
                    value={enabledFilter}
                    onValueChange={(value: "all" | "active" | "disabled") => {
                      setEnabledFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[150px] rounded-xl bg-slate-50/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active only</SelectItem>
                      <SelectItem value="disabled">Disabled only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-slate-500 font-semibold shrink-0">
                  {isLoading ? "Loading..." : `${totalItems} total entities found`}
                </div>
              </div>

              {/* Sync error panel */}
              {lastSyncResult && lastSyncResult.errors.length > 0 && (
                <div className="mx-5 mb-0 mt-0 border border-amber-200 bg-amber-50/60 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {lastSyncResult.errors.length} sync error{lastSyncResult.errors.length > 1 ? "s" : ""} from last Airtable sync
                  </div>
                  <ul className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {lastSyncResult.errors.map((err, idx) => (
                      <li key={idx} className="text-xs text-amber-800 flex gap-2">
                        <span className="font-medium shrink-0">{err.name ?? "Unknown"}:</span>
                        <span className="text-amber-700">{err.error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Table */}
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : isError ? (
                <QueryErrorState
                  error={error}
                  title="Couldn't load entities"
                  onRetry={() => refetch()}
                  isRetrying={isFetching}
                />
              ) : entityList.length === 0 ? (
                <div className="py-20 text-center">
                  <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No entities found</h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto">
                    {search
                      ? `No entity matches the search term "${search}". Try checking the spelling or resetting the filter.`
                      : "The database is empty. Add entities above, paste a batch list, or upload a file to get started."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="pl-6 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Entity Name
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Status
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Aliases
                        </TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Drive Folder
                        </TableHead>
                        <TableHead className="pr-6 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entityList.map((entity) => {
                        const driveMap = driveMapByEntityId.get(entity.id);
                        const isActive = entity.enabled !== false;
                        const isToggling = togglingEntityId === entity.id;
                        return (
                        <TableRow
                          key={entity.id}
                          className={isActive ? "hover:bg-slate-50/50" : "bg-slate-50/40 opacity-80 hover:bg-slate-50/60"}
                        >
                          <TableCell className="pl-6 py-4 font-semibold text-slate-800">
                            {entity.name}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={isActive}
                                disabled={isToggling || updateMutation.isPending}
                                onCheckedChange={(checked) => toggleEntityEnabled(entity, checked)}
                                className="data-[state=checked]:bg-emerald-500"
                              />
                              <span
                                className={`text-xs font-semibold ${
                                  isActive ? "text-emerald-600" : "text-slate-400"
                                }`}
                              >
                                {isActive ? "Active" : "Disabled"}
                              </span>
                            </div>
                            {!isActive ? (
                              <p className="text-[10px] text-slate-400 mt-1 max-w-[140px] leading-snug">
                                Excluded from classify matching
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="max-w-[240px]">
                            {entity.aliases && entity.aliases.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {entity.aliases.map((alias, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="bg-indigo-50/50 text-indigo-700 border-indigo-100 text-[10px] px-1.5 py-0.5 rounded-md"
                                  >
                                    {alias}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">none</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[220px]">
                            {driveMap?.drive_root_path ? (
                              <span className="text-xs text-slate-700 truncate block" title={driveMap.drive_root_path}>
                                {driveMap.drive_root_path}
                              </span>
                            ) : driveMap?.drive_root_folder_id ? (
                              <span className="text-xs text-slate-500 font-mono truncate block">
                                {driveMap.drive_root_folder_id}
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200 bg-amber-50">
                                Not set
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg h-8 text-xs text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={() => setEditTarget(entity)}
                              >
                                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg h-8 text-xs"
                                onClick={() => openFolderDialog(entity)}
                              >
                                <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                                {driveMap ? "Change folder" : "Set folder"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeleteTarget(entity)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )})}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500 font-medium">
                    Showing page {page} of {totalPages}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={page === 1}
                      onClick={() => handlePageChange(page - 1)}
                      className="h-8 w-8 rounded-lg"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      // Display pages logically if count is huge
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        Math.abs(pageNum - page) <= 1
                      ) {
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className={`h-8 w-8 rounded-lg text-xs ${
                              page === pageNum
                                ? "bg-indigo-600 text-white font-bold"
                                : "text-slate-600"
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                      if (
                        (pageNum === 2 && page > 3) ||
                        (pageNum === totalPages - 1 && page < totalPages - 2)
                      ) {
                        return (
                          <span key={pageNum} className="px-1.5 text-xs text-slate-400">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={page === totalPages}
                      onClick={() => handlePageChange(page + 1)}
                      className="h-8 w-8 rounded-lg"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <EntityDriveFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        entity={folderDialogEntity}
        existingMap={folderDialogEntity ? driveMapByEntityId.get(folderDialogEntity.id) : null}
      />

      <AirtableSyncConfigDialog
        open={syncConfigOpen}
        onOpenChange={setSyncConfigOpen}
        existingConfig={syncConfig}
      />

      <DriveAutoProvisionDialog
        open={autoProvisionOpen}
        onOpenChange={setAutoProvisionOpen}
        existingConfig={autoProvisionConfig}
        unmappedCount={unmappedEntityCount}
      />

      <EntityEditDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        entity={editTarget}
        onSaved={() => refetch()}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete entity</DialogTitle>
            <DialogDescription>
              Remove <span className="font-medium text-slate-900">{deleteTarget?.name}</span> from
              Entity Management? This cannot be undone. Linked Drive folder mappings for this entity
              will also be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEntity}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PageWrapper>
  );
}
