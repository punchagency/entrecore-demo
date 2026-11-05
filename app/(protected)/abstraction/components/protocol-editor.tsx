"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Settings2,
  Plus,
  Tag,
  TreePine,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Search,
  Pencil,
  Trash2,
  Copy,
  CheckCircle2,
  CircleDot,
  Layers,
  FileText,
  Save,
  Play,
  UploadCloud,
  Server,
  RefreshCw,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { showApiErrorToast } from "@/utils/api-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CHARTER_EXTRACTION_ENTITY_TEMPLATES,
  buildCharterExtractionEntities,
} from "../constants/charter-extraction-entities";
import { ENTITY_DATA_TYPE_OPTIONS } from "../constants/entity-data-types";
import {
  AutoCreateProtocolDialog,
  type AutoCreateMode,
} from "./auto-create-protocol-dialog";
import {
  createOcrConfiguration,
  listOcrConfigurations,
  updateOcrConfiguration,
  type OcrConfiguration,
  type UpdateOcrConfigurationRequest,
  type EntityConfigPayloadItem,
} from "../services/ocr-api";
import {
  useAbstractionStore,
  AbstractionProtocol,
  EntityDefinition,
  ClauseDefinition,
  type ProtocolExtractionMode,
} from "@/app/store/abstractionStore";
import { DataSourcePicker } from "./data-source-picker";
import { cn } from "@/lib/utils";
import { QueryErrorState } from "@/components/query-error-state";

/**
 * The document kinds a protocol author can declare. Left unset, the backend
 * falls back to an LLM classifier that reads the first 2000 chars — which is
 * how a long charter gets read as a table and comes back with truncated
 * full-text fields. Setting this is how you stop that happening.
 */
/**
 * Sentinel for "no mode declared" — Radix Select cannot hold an empty string
 * value, and the field is genuinely tri-state (single / multi / split / unset).
 */
const AUTO_EXTRACTION_MODE = "auto";

const EXTRACTION_MODE_OPTIONS: {
  value: ProtocolExtractionMode;
  label: string;
  hint: string;
}[] = [
  {
    value: "single",
    label: "Single document",
    hint: "The whole file is one record. Fields are extracted in separate passes, so long passages come back whole.",
  },
  {
    value: "multi",
    label: "Table of records",
    hint: "The file is a table or list of independent rows. Each row becomes its own record.",
  },
  {
    value: "single_split_multi",
    label: "One file, split per record key",
    hint: "One file holding a block that repeats. Every occurrence of the record-key entity starts a new record.",
  },
];

// Moved to ../constants/entity-data-types so the Auto Create dialog applies the
// same unknown-dataType guard this file's mapConfigToProtocol does. Re-exported
// shape is identical; see that file for why it has to be shared.

// The only data types the backend will slice a passage out of the document
// for. Everything else is a normalised token — a date or a single-select is
// not made more correct by being quoted, it is made impossible — and is listed
// in _VERBATIM_EXCLUDED_TYPES in ocr_service.py, which drops the flag anyway.
// Keeping the sets aligned means the switch is only ever offered where it works.
const VERBATIM_CAPABLE_TYPES = new Set<EntityDefinition["dataType"]>(["text", "long_text"]);

// Mirrors _VERBATIM_KEYWORDS in ocr_service.py. The backend ORs the switch
// together with these, so a description saying "FULL TEXT" keeps the field
// verbatim no matter what the switch says — worth telling the author, or the
// switch reads as broken when they turn it off and nothing changes.
const VERBATIM_DESCRIPTION_KEYWORDS = [
  "DO NOT TRUNCATE",
  "FULL TEXT",
  "VERBATIM",
  "FULL VERBATIM",
];

function hasVerbatimKeyword(description: string | undefined) {
  const upper = (description ?? "").toUpperCase();
  return VERBATIM_DESCRIPTION_KEYWORDS.some((keyword) => upper.includes(keyword));
}

const ENTITY_TYPE_LABELS: Record<EntityDefinition["type"], string> = {
  party_name: "Party Name",
  date: "Date",
  amount: "Amount",
  address: "Address",
  obligation: "Obligation",
  term: "Term",
  percentage: "Percentage",
  reference_number: "Reference #",
  jurisdiction: "Jurisdiction",
  custom: "Custom",
};

const CLAUSE_TYPE_LABELS: Record<ClauseDefinition["type"], string> = {
  termination: "Termination",
  indemnification: "Indemnification",
  confidentiality: "Confidentiality",
  governing_law: "Governing Law",
  force_majeure: "Force Majeure",
  custom: "Custom",
};

export function ProtocolEditor() {
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const {
    protocols,
    activeProtocolId,
    selectedDocumentId,
    addProtocol,
    updateProtocol,
    setProtocols,
    setActiveProtocol,
    editedProtocolIds,
    clearProtocolEdits,
  } = useAbstractionStore();
  const protocol = protocols.find((p) => p.id === activeProtocolId);
  const hasUnsavedEdits = protocol ? editedProtocolIds.includes(protocol.id) : false;
  // single_split_multi has nothing to split on without one of these, and the
  // backend silently degrades to single — so say so before the run, not after.
  const hasRecordKeyEntity = protocol ? protocol.entities.some((e) => e.isRecordKey) : false;
  const [entitySearch, setEntitySearch] = useState("");
  const [clauseSearch, setClauseSearch] = useState("");
  const [expandedClauses, setExpandedClauses] = useState<string[]>([]);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [deployedConfigs, setDeployedConfigs] = useState<OcrConfiguration[]>([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  // The raw failure, so the banner can show its status and correlation ID.
  const [configsError, setConfigsError] = useState<unknown>(null);
  const [showCharterReplaceDialog, setShowCharterReplaceDialog] = useState(false);
  const [showAutoCreateDialog, setShowAutoCreateDialog] = useState(false);
  const [newOptionText, setNewOptionText] = useState("");

  // Helper to map backend config to store protocol
  const mapConfigToProtocol = (cfg: OcrConfiguration): AbstractionProtocol => {
    return {
      id: cfg.id || cfg.name,
      name: cfg.name,
      description: cfg.description,
      entities: (cfg.entities_config || []).map((e, idx) => ({
        id: `e-${cfg.id || cfg.name}-${idx}`,
        name: e.name,
        description: e.description,
        type: "custom",
        dataType: ENTITY_DATA_TYPE_OPTIONS.some((o) => o.value === e.dataType)
          ? (e.dataType as EntityDefinition["dataType"])
          : "text",
        options: e.optionList ?? [],
        dataSource: e.dataSource ?? undefined,
        defaultValue: e.defaultValue ?? "",
        isRecordKey: e.isRecordKey ?? false,
        // Read back so a saved flag survives a reload. Gated on the data type
        // for the same reason the switch is: a flag left on a field whose type
        // was later changed to `date` elsewhere would show a control the
        // backend ignores.
        isVerbatim: VERBATIM_CAPABLE_TYPES.has(e.dataType as EntityDefinition["dataType"])
          ? (e.isVerbatim ?? false)
          : false,
        required: false,
        color: `#${Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")}`,
      })),
      clauses: Object.entries(cfg.clauses_config || {}).map(([name, desc], idx) => ({
        id: `c-${cfg.id || cfg.name}-${idx}`,
        name,
        description: desc,
        type: "custom",
        keywords: [],
        color: `#${Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")}`,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documentCount: 0,
      extractionMode: EXTRACTION_MODE_OPTIONS.some((o) => o.value === cfg.extraction_mode)
        ? (cfg.extraction_mode as ProtocolExtractionMode)
        : undefined,
    };
  };

  function createUniqueConfigName(baseName: string) {
    const normalizedBase = baseName.trim();
    const takenNames = new Set(deployedConfigs.map((cfg) => cfg.name.trim().toLowerCase()));

    if (!takenNames.has(normalizedBase.toLowerCase())) return normalizedBase;

    let suffix = 2;
    let candidate = `${normalizedBase} (${suffix})`;
    while (takenNames.has(candidate.toLowerCase())) {
      suffix += 1;
      candidate = `${normalizedBase} (${suffix})`;
    }

    return candidate;
  }

  function isDuplicateConfigNameError(error: any) {
    const detail = error?.response?.data?.detail;
    return (
      typeof detail === "string" &&
      detail.includes("Duplicate entry") &&
      detail.includes("uq_company_config_name")
    );
  }

  function buildOcrConfigurationPayload(
    p: AbstractionProtocol,
    name: string,
    description: string
  ): UpdateOcrConfigurationRequest {
    const entitiesConfig: EntityConfigPayloadItem[] = p.entities.map((e) => ({
      name: e.name,
      description: e.description,
      dataType: e.dataType,
      optionList: e.options ?? [],
      defaultValue: e.defaultValue ?? "",
      dataSource: e.dataSource,
      isRecordKey: e.isRecordKey ?? false,
      isVerbatim: e.isVerbatim ?? false,
    }));
    const clausesConfig: Record<string, string> = {};
    p.clauses.forEach((c) => {
      clausesConfig[c.name] = c.description;
    });
    return {
      name,
      description,
      entities_config: entitiesConfig,
      clauses_config: clausesConfig,
      // Always sent, including as null: the backend treats an absent mode as
      // "clear it", which is how a protocol gets reverted to classifier
      // behaviour once a mode has been set.
      extraction_mode: p.extractionMode ?? null,
    };
  }

  function findMatchingDeployedConfig(
    p: AbstractionProtocol,
    configs: OcrConfiguration[]
  ): OcrConfiguration | undefined {
    return configs.find((cfg) => cfg.id === p.id || cfg.name === p.name);
  }

  function createProtocolDraft() {
    const now = new Date().toISOString();
    const existingNames = new Set(protocols.map((item) => item.name.toLowerCase()));
    const baseName = "New Protocol";

    let nextName = baseName;
    if (existingNames.has(baseName.toLowerCase())) {
      let suffix = 2;
      while (existingNames.has(`${baseName} ${suffix}`.toLowerCase())) suffix += 1;
      nextName = `${baseName} ${suffix}`;
    }

    const draftProtocol: AbstractionProtocol = {
      id: `draft-${Date.now()}`,
      name: nextName,
      description: "Define entities and clauses, then deploy this configuration.",
      entities: [],
      clauses: [],
      createdAt: now,
      updatedAt: now,
      documentCount: 0,
    };

    addProtocol(draftProtocol);
    setActiveProtocol(draftProtocol.id);
    toast.success("New protocol draft created.");
  }

  const fetchConfigs = async () => {
    setConfigsLoading(true);
    setConfigsError(null);
    try {
      const configs = await listOcrConfigurations();
      setDeployedConfigs(configs);

      if (configs.length > 0) {
        const mappedProtocols = configs.map(mapConfigToProtocol);
        setProtocols(mappedProtocols);
        // Keep current selection only if it still exists; do not auto-select a config.
        if (activeProtocolId && !mappedProtocols.some((p) => p.id === activeProtocolId)) {
          setActiveProtocol(null);
        }
      } else {
        setProtocols([]);
        setActiveProtocol(null);
      }
    } catch (err: any) {
      setConfigsError(err);
    } finally {
      setConfigsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!protocol) {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <Server className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              No protocol configuration selected
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Pick one from deployed configurations below to load entities and clauses.
            </p>
            <Button
              className="mt-4 bg-violet-600 hover:bg-violet-500 text-white"
              onClick={createProtocolDraft}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Protocol
            </Button>
          </CardContent>
        </Card>

        {/* Deployed Configurations Panel */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Server className="h-4 w-4 text-indigo-500" />
                Deployed Configurations
                {deployedConfigs.length > 0 && (
                  <Badge className="ml-1 bg-indigo-100 text-indigo-700 border-0 rounded-full text-[10px] px-2">
                    {deployedConfigs.length}
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchConfigs}
                disabled={configsLoading}
                className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100"
                title="Refresh"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-slate-400 ${configsLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {configsLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            )}
            {configsError != null && !configsLoading && (
              <QueryErrorState
                variant="inline"
                className="p-3"
                error={configsError}
                title="Couldn't load protocol configurations"
                onRetry={fetchConfigs}
              />
            )}
            {!configsLoading && !configsError && deployedConfigs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Server className="h-8 w-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400 font-medium">No configurations deployed yet</p>
              </div>
            )}
            {!configsLoading && !configsError && deployedConfigs.length > 0 && (
              <div className="space-y-2">
                {deployedConfigs.map((cfg, i) => (
                  <div
                    key={cfg.id ?? cfg.name ?? i}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                  >
                    <div className="p-1.5 bg-indigo-100 rounded-lg">
                      <Server className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setActiveProtocol(cfg.id || cfg.name)}
                    >
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {cfg.name ?? "Unnamed"}
                      </p>
                      {cfg.description && (
                        <p className="text-xs text-slate-500 truncate">{cfg.description}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50 rounded-full shrink-0"
                    >
                      <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                      Live
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const persistProtocolMeta = async () => {
    if (!protocol) return;
    const nextName = editName.trim() || protocol.name;
    const nextDescription = editDescription.trim() || protocol.description;
    const matched = findMatchingDeployedConfig(protocol, deployedConfigs);

    if (!matched?.id) {
      updateProtocol(protocol.id, {
        name: nextName,
        description: nextDescription,
        updatedAt: new Date().toISOString(),
      });
      setIsEditingMeta(false);
      toast.success("Saved locally. Deploy the protocol to persist it on the server.");
      return;
    }

    setIsSavingMeta(true);
    try {
      const payload = buildOcrConfigurationPayload(protocol, nextName, nextDescription);
      await updateOcrConfiguration(matched.id, payload);
      updateProtocol(protocol.id, {
        name: nextName,
        description: nextDescription,
        updatedAt: new Date().toISOString(),
      });
      await fetchConfigs();
      setIsEditingMeta(false);
      toast.success("Protocol name and description saved.");
    } catch (error: unknown) {
      console.error(error);
      showApiErrorToast(error, "Failed to save protocol.");
    } finally {
      setIsSavingMeta(false);
    }
  };

  const deployProtocol = async () => {
    if (!protocol) return;
    setIsDeploying(true);
    try {
      const payload = buildOcrConfigurationPayload(protocol, protocol.name, protocol.description);

      const matchedConfig = findMatchingDeployedConfig(protocol, deployedConfigs);

      if (matchedConfig?.id) {
        await updateOcrConfiguration(matchedConfig.id, payload);
        toast.success("Protocol configuration updated.");
      } else {
        await createOcrConfiguration(payload);
        toast.success("Protocol successfully deployed to OCR engine!");
      }

      clearProtocolEdits(protocol.id);
      await fetchConfigs(); // Refresh the list from server
    } catch (error: any) {
      if (isDuplicateConfigNameError(error)) {
        try {
          const uniqueName = createUniqueConfigName(protocol.name);
          await createOcrConfiguration(
            buildOcrConfigurationPayload(protocol, uniqueName, protocol.description)
          );

          updateProtocol(protocol.id, {
            name: uniqueName,
            updatedAt: new Date().toISOString(),
          });

          clearProtocolEdits(protocol.id);
          toast.success(`Name already existed. Deployed as "${uniqueName}".`);
          await fetchConfigs();
          return;
        } catch (retryError: any) {
          console.error(retryError);
        }
      }

      console.error(error);
      showApiErrorToast(error, "Failed to deploy protocol configuration.");
    } finally {
      setIsDeploying(false);
    }
  };

  const filteredEntities = protocol.entities.filter(
    (e) =>
      e.name.toLowerCase().includes(entitySearch.toLowerCase()) ||
      e.type.toLowerCase().includes(entitySearch.toLowerCase())
  );

  const filteredClauses = protocol.clauses.filter(
    (c) =>
      c.name.toLowerCase().includes(clauseSearch.toLowerCase()) ||
      c.type.toLowerCase().includes(clauseSearch.toLowerCase())
  );

  const toggleClause = (id: string) => {
    setExpandedClauses((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const addEntity = () => {
    const defaultDocumentId = selectedDocumentId || "document_id";
    const entityNames = new Set(protocol.entities.map((entity) => entity.name.toLowerCase()));
    const putName = `put_${defaultDocumentId}`;

    let nextEntityName = "New Entity";
    if (!entityNames.has("post")) {
      nextEntityName = "post";
    } else if (!entityNames.has(putName.toLowerCase())) {
      nextEntityName = putName;
    } else {
      let suffix = 2;
      while (entityNames.has(`new entity ${suffix}`)) suffix += 1;
      nextEntityName = `New Entity ${suffix}`;
    }

    const newEntity: EntityDefinition = {
      id: `e-${Date.now()}`,
      name: nextEntityName,
      type: "custom",
      description: "Description of this entity",
      dataType: "text",
      defaultValue: "N/A",
      required: false,
      color: `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`,
    };
    updateProtocol(protocol.id, {
      entities: [...protocol.entities, newEntity],
      updatedAt: new Date().toISOString(),
    });
    setEditingEntityId(newEntity.id);
  };

  const addClause = () => {
    const newClause: ClauseDefinition = {
      id: `c-${Date.now()}`,
      name: "New Clause",
      type: "custom",
      description: "Description of this clause type",
      keywords: [],
      color: `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`,
    };
    updateProtocol(protocol.id, {
      clauses: [...protocol.clauses, newClause],
      updatedAt: new Date().toISOString(),
    });
    setEditingClauseId(newClause.id);
  };

  const removeEntity = (id: string) => {
    const removed = protocol.entities.find((e) => e.id === id);
    updateProtocol(protocol.id, {
      entities: protocol.entities.filter((e) => e.id !== id),
      updatedAt: new Date().toISOString(),
    });
    toast.success(
      removed ? `Removed "${removed.name}". Click Deploy Configuration to save.` : "Entity removed."
    );
  };

  const addMissingCharterFields = () => {
    const existing = new Set(protocol.entities.map((e) => e.name.toLowerCase()));
    const toAdd = buildCharterExtractionEntities().filter(
      (e) => !existing.has(e.name.toLowerCase())
    );
    if (toAdd.length === 0) {
      toast.info("All charter extraction fields are already in this protocol.");
      return;
    }
    updateProtocol(protocol.id, {
      entities: [...protocol.entities, ...toAdd],
      updatedAt: new Date().toISOString(),
    });
    toast.success(`Added ${toAdd.length} field(s). Deploy when ready.`);
  };

  /**
   * Commit the entities Auto Create proposed. Same two modes, and the same
   * merge-by-lowercased-name rule, as the charter field-set buttons above —
   * the dialog owns the picking, this owns the store write, and nothing here
   * touches the server. updateProtocol marks the protocol edited, which raises
   * the existing "unsaved changes → Deploy now" banner.
   */
  /**
   * Returns how many entities were ACTUALLY applied, which in merge mode is not
   * the number offered — names already on the protocol are dropped. The dialog
   * reports that count, so it cannot claim "Added 12 fields" after adding none.
   * Same contract addMissingCharterFields follows with its own toAdd.length.
   */
  const applyAutoCreatedEntities = (
    entities: EntityDefinition[],
    mode: AutoCreateMode
  ): number => {
    if (mode === "replace") {
      updateProtocol(protocol.id, {
        entities,
        updatedAt: new Date().toISOString(),
      });
      return entities.length;
    }
    const existing = new Set(protocol.entities.map((e) => e.name.toLowerCase()));
    const toAdd = entities.filter((e) => !existing.has(e.name.toLowerCase()));
    if (toAdd.length === 0) {
      // Nothing to do — leave the protocol (and its updatedAt) untouched rather
      // than marking it edited and raising the unsaved-changes banner for a
      // no-op.
      return 0;
    }
    updateProtocol(protocol.id, {
      entities: [...protocol.entities, ...toAdd],
      updatedAt: new Date().toISOString(),
    });
    return toAdd.length;
  };

  const applyCharterFieldSet = () => {
    updateProtocol(protocol.id, {
      entities: buildCharterExtractionEntities(),
      updatedAt: new Date().toISOString(),
    });
    setShowCharterReplaceDialog(false);
    toast.success(
      "Protocol entities set to charter extraction fields. Deploy Configuration to save on the server."
    );
  };

  const removeClause = (id: string) => {
    updateProtocol(protocol.id, {
      clauses: protocol.clauses.filter((c) => c.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const updateEntity = (id: string, updates: Partial<EntityDefinition>) => {
    updateProtocol(protocol.id, {
      entities: protocol.entities.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      updatedAt: new Date().toISOString(),
    });
  };

  const addEntityOption = (id: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const entity = protocol.entities.find((e) => e.id === id);
    if (!entity) return;
    updateEntity(id, { options: [...(entity.options ?? []), trimmed] });
    setNewOptionText("");
  };

  const removeEntityOption = (id: string, index: number) => {
    const entity = protocol.entities.find((e) => e.id === id);
    if (!entity) return;
    updateEntity(id, { options: (entity.options ?? []).filter((_, i) => i !== index) });
  };

  const updateClause = (id: string, updates: Partial<ClauseDefinition>) => {
    updateProtocol(protocol.id, {
      clauses: protocol.clauses.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Protocol Header */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden bg-gradient-to-r from-indigo-50 to-violet-50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Settings2 className="h-5 w-5 text-violet-600" />
                </div>
                <div className="flex-1">
                  {isEditingMeta ? (
                    <div className="space-y-1.5">
                      <Input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void persistProtocolMeta();
                          }
                          if (e.key === "Escape") setIsEditingMeta(false);
                        }}
                        className="h-8 text-sm font-bold rounded-lg border-violet-300 focus-visible:ring-violet-400"
                        placeholder="Protocol name"
                      />
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void persistProtocolMeta();
                          }
                          if (e.key === "Escape") setIsEditingMeta(false);
                        }}
                        className="h-7 text-xs rounded-lg border-violet-200"
                        placeholder="Description"
                      />
                      <div className="flex gap-2 pt-0.5">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-violet-600 hover:bg-violet-500 rounded-lg"
                          disabled={isSavingMeta}
                          onClick={() => {
                            void persistProtocolMeta();
                          }}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          {isSavingMeta ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs rounded-lg text-slate-500"
                          disabled={isSavingMeta}
                          onClick={() => setIsEditingMeta(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-slate-800">{protocol.name}</h3>
                        <p className="text-sm text-slate-500">{protocol.description}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 h-8 gap-1.5 border-violet-200 bg-white/80 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
                        aria-label="Edit protocol name and description"
                        onClick={() => {
                          setEditName(protocol.name);
                          setEditDescription(protocol.description);
                          setIsEditingMeta(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Badge
                  variant="outline"
                  className="text-xs bg-white border-violet-200 text-violet-700"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {protocol.entities.length} Entities
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs bg-white border-indigo-200 text-indigo-700"
                >
                  <TreePine className="h-3 w-3 mr-1" />
                  {protocol.clauses.length} Clause Types
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs bg-white border-slate-200 text-slate-600"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {protocol.documentCount} Documents Used
                </Badge>
              </div>
              <div className="pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Extraction mode</span>
                  <Select
                    value={protocol.extractionMode ?? AUTO_EXTRACTION_MODE}
                    onValueChange={(value) =>
                      updateProtocol(protocol.id, {
                        extractionMode:
                          value === AUTO_EXTRACTION_MODE
                            ? undefined
                            : (value as ProtocolExtractionMode),
                        updatedAt: new Date().toISOString(),
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-[260px] bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO_EXTRACTION_MODE}>
                        Detect automatically
                      </SelectItem>
                      {EXTRACTION_MODE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="pt-1.5 text-xs text-slate-500">
                  {protocol.extractionMode
                    ? EXTRACTION_MODE_OPTIONS.find((o) => o.value === protocol.extractionMode)?.hint
                    : "The system reads the start of each document and guesses. Declaring the mode is more reliable — a long single document guessed as a table comes back with truncated passages."}
                </p>
                {protocol.extractionMode === "single_split_multi" && !hasRecordKeyEntity && (
                  <p className="pt-1 text-xs font-medium text-amber-600">
                    No entity is marked as the record key, so there is nothing to split on —
                    documents will extract as a single record until you mark one.
                  </p>
                )}
                {protocol.extractionMode &&
                  protocol.extractionMode !== "single_split_multi" &&
                  hasRecordKeyEntity && (
                    <p className="pt-1 text-xs text-slate-500">
                      A record key is marked on this protocol, but this mode takes precedence over
                      it.
                    </p>
                  )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Also here, not only on the no-protocol-selected screen at the
                  top of this component. Once a protocol is active that screen
                  never renders again, so this was the only way to start a
                  second protocol — and since the store has no persistence,
                  "reload the page" was the de facto create button. */}
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                onClick={createProtocolDraft}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Protocol
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-violet-200 text-violet-600 hover:bg-violet-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Protocol
              </Button>
              <Button
                size="sm"
                className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200"
                onClick={deployProtocol}
                disabled={isDeploying}
              >
                <UploadCloud className="h-4 w-4 mr-2" />
                {isDeploying ? "Deploying..." : "Deploy Configuration"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasUnsavedEdits && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            You have unsaved protocol changes. Deploy to push entity and name updates to the OCR
            server.
          </p>
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-500 text-white shrink-0"
            onClick={deployProtocol}
            disabled={isDeploying}
          >
            <UploadCloud className="h-4 w-4 mr-2" />
            {isDeploying ? "Deploying…" : "Deploy now"}
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Entity Mapping Canvas ───────────────────────── */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Tag className="h-4 w-4 text-violet-500" />
                Entity Mapping Canvas
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {/* First in the row deliberately: this is the "start here"
                    action, and a freshly created draft has no entities and no
                    empty state below, so the header is the only affordance. */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-sky-200 text-sky-700 hover:bg-sky-50"
                  onClick={() => setShowAutoCreateDialog(true)}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Auto Create Protocol
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-violet-200 text-violet-700"
                  onClick={addMissingCharterFields}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add charter fields
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-amber-200 text-amber-800 hover:bg-amber-50"
                  onClick={() => setShowCharterReplaceDialog(true)}
                >
                  <ListChecks className="h-3.5 w-3.5 mr-1" />
                  Use charter field set
                </Button>
                <Button
                  onClick={addEntity}
                  size="sm"
                  className="h-8 text-xs bg-violet-600 hover:bg-violet-500 rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Entity
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Standard fields: {CHARTER_EXTRACTION_ENTITY_TEMPLATES.map((t) => t.name).join(", ")}
            </p>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search entities..."
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
                className="pl-9 h-9 text-sm rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide">
            {filteredEntities.map((entity) => (
              <div
                key={entity.id}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl border transition-all",
                  editingEntityId === entity.id
                    ? "border-violet-300 bg-violet-50/50 shadow-sm"
                    : "border-slate-100 hover:border-violet-200 hover:bg-slate-50"
                )}
              >
                <GripVertical className="h-4 w-4 text-slate-300 shrink-0 cursor-grab" />

                {/* Color Dot */}
                <div
                  className="w-4 h-4 rounded-full shrink-0 shadow-sm ring-2 ring-white"
                  style={{ backgroundColor: entity.color }}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {editingEntityId === entity.id ? (
                    <div className="space-y-2">
                      <Input
                        value={entity.name}
                        onChange={(e) => updateEntity(entity.id, { name: e.target.value })}
                        className="h-8 text-sm font-semibold rounded-lg"
                      />
                      <Input
                        value={entity.description}
                        onChange={(e) => updateEntity(entity.id, { description: e.target.value })}
                        className="h-8 text-xs rounded-lg"
                      />
                      <Select
                        value={entity.dataType}
                        onValueChange={(v) => {
                          const dataType = v as EntityDefinition["dataType"];
                          const isSelectType =
                            dataType === "single_select" || dataType === "multi_select";
                          updateEntity(entity.id, {
                            dataType,
                            options: isSelectType ? (entity.options ?? []) : [],
                            dataSource: isSelectType ? entity.dataSource : undefined,
                            // Cleared rather than merely hidden: a flag the
                            // control no longer shows would still be saved,
                            // and the user would have no way to see or unset
                            // it. The backend drops it for these types too.
                            isVerbatim: VERBATIM_CAPABLE_TYPES.has(dataType)
                              ? (entity.isVerbatim ?? false)
                              : false,
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-lg">
                          <SelectValue placeholder="Data type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTITY_DATA_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {(entity.dataType === "single_select" ||
                        entity.dataType === "multi_select") && (
                        <div className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                          {(entity.options ?? []).map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="flex-1 truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
                                {option}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 shrink-0"
                                aria-label={`Remove option ${option}`}
                                onClick={() => removeEntityOption(entity.id, index)}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          ))}
                          <div className="flex items-center gap-2">
                            <Input
                              value={newOptionText}
                              onChange={(e) => setNewOptionText(e.target.value)}
                              placeholder="Add option..."
                              className="h-8 text-xs rounded-lg flex-1"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addEntityOption(entity.id, newOptionText);
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 rounded-lg shrink-0"
                              aria-label="Add option"
                              onClick={() => addEntityOption(entity.id, newOptionText)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {(entity.dataType === "single_select" ||
                        entity.dataType === "multi_select") && (
                        <DataSourcePicker
                          value={entity.dataSource}
                          onChange={(next) => updateEntity(entity.id, { dataSource: next })}
                        />
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Default Value
                        </label>
                        <Input
                          value={entity.defaultValue ?? ""}
                          onChange={(e) =>
                            updateEntity(entity.id, { defaultValue: e.target.value })
                          }
                          // placeholder="N/A"
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>

                      <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                        <div className="min-w-0">
                          <label
                            htmlFor={`record-key-${entity.id}`}
                            className="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                          >
                            Split records on this field
                          </label>
                          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                            Every occurrence of this field in a document starts a new record —
                            one document in, many rows out. Leave off for one record per document.
                          </p>
                        </div>
                        <Switch
                          id={`record-key-${entity.id}`}
                          checked={entity.isRecordKey ?? false}
                          onCheckedChange={(checked) =>
                            updateEntity(entity.id, { isRecordKey: checked })
                          }
                          className="mt-0.5 shrink-0 data-[state=checked]:bg-violet-600"
                        />
                      </div>

                      {VERBATIM_CAPABLE_TYPES.has(entity.dataType) && (
                        <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                          <div className="min-w-0">
                            <label
                              htmlFor={`verbatim-${entity.id}`}
                              className="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                            >
                              Copy verbatim from the document
                            </label>
                            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                              The value is cut from the source text word for word instead of
                              being written by the model — no paraphrase, no truncation.
                            </p>
                            {hasVerbatimKeyword(entity.description) && (
                              <p className="mt-1 text-[11px] leading-snug text-amber-600">
                                This field&apos;s description already asks for the full text, so
                                it stays verbatim even with this off.
                              </p>
                            )}
                            {/* What this switch buys is a dedicated model call per
                                field, so a long passage isn't sharing one reply's
                                budget with nine other answers. That only happens on
                                the per-record extraction path — a protocol whose
                                documents come back as many records at once has no
                                per-field batching to isolate into. Saying so here
                                beats letting the switch read as a guarantee. */}
                            {protocol.extractionMode === "multi" && (
                              <p className="mt-1 text-[11px] leading-snug text-amber-600">
                                This protocol extracts a table of records in one pass, where
                                this setting has no effect yet.
                              </p>
                            )}
                            {protocol.extractionMode === "single_split_multi" && (
                              <p className="mt-1 text-[11px] leading-snug text-amber-600">
                                This protocol splits one document into many records, where
                                this setting applies only if record fan-out is enabled on the
                                backend.
                              </p>
                            )}
                          </div>
                          <Switch
                            id={`verbatim-${entity.id}`}
                            checked={entity.isVerbatim ?? false}
                            onCheckedChange={(checked) =>
                              updateEntity(entity.id, { isVerbatim: checked })
                            }
                            className="mt-0.5 shrink-0 data-[state=checked]:bg-violet-600"
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingEntityId(null)}
                          className="h-7 text-xs rounded-lg"
                        >
                          Done
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingEntityId(null);
                            void deployProtocol();
                          }}
                          disabled={isDeploying}
                          className="h-7 text-xs bg-violet-600 hover:bg-violet-500 rounded-lg"
                        >
                          <UploadCloud className="h-3 w-3 mr-1" />
                          Save & deploy
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{entity.name}</span>
                        {entity.required && (
                          <Badge className="text-[9px] px-1.5 py-0 bg-red-50 text-red-600 border border-red-200 rounded-full">
                            Required
                          </Badge>
                        )}
                        {entity.isRecordKey && (
                          <Badge
                            title="Documents are split into one record per occurrence of this field"
                            className="text-[9px] px-1.5 py-0 bg-violet-50 text-violet-700 border border-violet-200 rounded-full"
                          >
                            Record key
                          </Badge>
                        )}
                        {entity.isVerbatim && (
                          <Badge
                            title="This field's value is cut from the document word for word"
                            className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full"
                          >
                            Verbatim
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{entity.description}</p>
                    </>
                  )}
                </div>

                {/* Type Badge */}
                <Badge
                  variant="outline"
                  className="text-[10px] px-2 py-0.5 rounded-full border-slate-200 text-slate-600 shrink-0"
                >
                  {ENTITY_TYPE_LABELS[entity.type]}
                </Badge>

                {/* Actions — always visible (hover-only hid controls on trackpads) */}
                {editingEntityId !== entity.id && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg hover:bg-violet-50"
                      aria-label={`Edit ${entity.name}`}
                      onClick={() => setEditingEntityId(entity.id)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-slate-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg hover:bg-red-50"
                      aria-label={`Remove ${entity.name}`}
                      onClick={() => removeEntity(entity.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Clause Hierarchy Tree ───────────────────────── */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <TreePine className="h-4 w-4 text-indigo-500" />
                Clause Hierarchy Tree
              </CardTitle>
              <Button
                onClick={addClause}
                size="sm"
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 rounded-lg"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Clause
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search clauses..."
                value={clauseSearch}
                onChange={(e) => setClauseSearch(e.target.value)}
                className="pl-9 h-9 text-sm rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide">
            {filteredClauses.map((clause) => {
              const isExpanded = expandedClauses.includes(clause.id);
              return (
                <div key={clause.id} className="space-y-1">
                  <div
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                      isExpanded
                        ? "border-indigo-200 bg-indigo-50/30 shadow-sm"
                        : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50"
                    )}
                    onClick={() => toggleClause(clause.id)}
                  >
                    {/* Expand Toggle */}
                    <div className="shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-indigo-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </div>

                    {/* Color Dot */}
                    <div
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm ring-2 ring-white"
                      style={{ backgroundColor: clause.color }}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-slate-800">{clause.name}</span>
                      <p className="text-xs text-slate-500 truncate">{clause.description}</p>
                    </div>

                    {/* Type Badge */}
                    <Badge
                      variant="outline"
                      className="text-[10px] px-2 py-0.5 rounded-full border-slate-200 text-slate-600 shrink-0"
                    >
                      {CLAUSE_TYPE_LABELS[clause.type]}
                    </Badge>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg hover:bg-indigo-50"
                        onClick={() =>
                          setEditingClauseId(editingClauseId === clause.id ? null : clause.id)
                        }
                      >
                        <Pencil className="h-3 w-3 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg hover:bg-red-50"
                        onClick={() => removeClause(clause.id)}
                      >
                        <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="ml-8 pl-4 border-l-2 border-indigo-200 space-y-2 animate-in slide-in-from-top-2 duration-200">
                      {editingClauseId === clause.id ? (
                        <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2">
                          <Input
                            value={clause.name}
                            onChange={(e) => updateClause(clause.id, { name: e.target.value })}
                            placeholder="Clause name"
                            className="h-8 text-sm font-semibold rounded-lg"
                          />
                          <Input
                            value={clause.description}
                            onChange={(e) =>
                              updateClause(clause.id, { description: e.target.value })
                            }
                            placeholder="Description"
                            className="h-8 text-xs rounded-lg"
                          />
                          <Input
                            value={clause.keywords.join(", ")}
                            onChange={(e) =>
                              updateClause(clause.id, {
                                keywords: e.target.value.split(",").map((k) => k.trim()),
                              })
                            }
                            placeholder="Keywords (comma-separated)"
                            className="h-8 text-xs rounded-lg"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              setEditingClauseId(null);
                              deployProtocol();
                            }}
                            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save Online
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* Keywords */}
                          <div className="flex items-center gap-2 flex-wrap p-2">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                              Keywords:
                            </span>
                            {clause.keywords.map((keyword) => (
                              <Badge
                                key={keyword}
                                variant="outline"
                                className="text-[10px] px-2 py-0.5 rounded-full bg-white border-slate-200"
                              >
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                          {/* Detection Indicator */}
                          <div className="flex items-center gap-2 p-2">
                            <CircleDot className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-xs text-slate-600">
                              Rule-based + SLM classification active
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Deployed Configurations Panel */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-500" />
              Deployed Configurations
              {deployedConfigs.length > 0 && (
                <Badge className="ml-1 bg-indigo-100 text-indigo-700 border-0 rounded-full text-[10px] px-2">
                  {deployedConfigs.length}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchConfigs}
              disabled={configsLoading}
              className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100"
              title="Refresh"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-slate-400 ${configsLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {configsLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}
          {configsError != null && !configsLoading && (
            <QueryErrorState
              variant="inline"
              className="p-3"
              error={configsError}
              title="Couldn't load protocol configurations"
              onRetry={fetchConfigs}
            />
          )}
          {!configsLoading && !configsError && deployedConfigs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Server className="h-8 w-8 text-slate-200 mb-2" />
              <p className="text-sm text-slate-400 font-medium">No configurations deployed yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Click "Deploy Configuration" above to push your first config
              </p>
            </div>
          )}
          {!configsLoading && !configsError && deployedConfigs.length > 0 && (
            <div className="space-y-2">
              {deployedConfigs.map((cfg: any, i: number) => (
                <div
                  key={cfg.id ?? cfg.name ?? i}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                >
                  <div className="p-1.5 bg-indigo-100 rounded-lg">
                    <Server className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setActiveProtocol(cfg.id || cfg.name)}
                  >
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {cfg.name ?? "Unnamed"}
                    </p>
                    {cfg.description && (
                      <p className="text-xs text-slate-500 truncate">{cfg.description}</p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50 rounded-full shrink-0"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                    Live
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AutoCreateProtocolDialog
        open={showAutoCreateDialog}
        onOpenChange={setShowAutoCreateDialog}
        existingEntityCount={protocol.entities.length}
        onApply={applyAutoCreatedEntities}
      />

      <Dialog open={showCharterReplaceDialog} onOpenChange={setShowCharterReplaceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replace entities with charter field set?</DialogTitle>
            <DialogDescription>
              This removes all current entities and sets exactly these six fields:{" "}
              {CHARTER_EXTRACTION_ENTITY_TEMPLATES.map((t) => t.name).join(", ")}. You can still
              delete individual fields afterward. Click Deploy Configuration when finished.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCharterReplaceDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-violet-600 hover:bg-violet-500" onClick={applyCharterFieldSet}>
              Replace entities
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Protocol Reuse Info */}
      <Card className="border-0 shadow-sm ring-1 ring-violet-200/50 overflow-hidden bg-gradient-to-r from-violet-50/50 to-indigo-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <Layers className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-700">Protocol Reusability</p>
              <p className="text-xs text-slate-500">
                This protocol can be applied across multiple documents of similar type. All entity
                and clause definitions, including their patterns and keywords, will be reused
                automatically.
              </p>
            </div>
            <Badge className="bg-violet-100 text-violet-700 border-0 rounded-full text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Reusable
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
