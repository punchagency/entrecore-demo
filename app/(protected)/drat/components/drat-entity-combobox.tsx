"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import searchDebounce from "@/utils/search-debounce";

import { Entity, useEntities } from "../hooks/use-entities";
import { QueryErrorState } from "@/components/query-error-state";

interface DratEntityComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  onEntitySelect?: (entity: Entity | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  enabledOnly?: boolean;
}

function formatEntityLabel(entity: Entity): string {
  const aliases = entity.aliases?.filter(Boolean) ?? [];
  const aliasPart =
    aliases.length > 0
      ? ` (${aliases.slice(0, 2).join(", ")}${aliases.length > 2 ? ", …" : ""})`
      : "";
  const disabledPart = entity.enabled === false ? " — disabled" : "";
  return `${entity.name}${aliasPart}${disabledPart}`;
}

/**
 * Inline entity picker for use inside modals. Avoids Radix Popover portals,
 * which fight Dialog focus traps and block typing in the search field.
 */
export function DratEntityCombobox({
  value,
  onValueChange,
  onEntitySelect,
  placeholder = "Select entity",
  searchPlaceholder = "Search entities by name or alias…",
  emptyText = "No entities found.",
  enabledOnly = false,
}: DratEntityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const debouncedSetSearch = useMemo(
    () => searchDebounce((query: string) => setDebouncedSearch(query), 300),
    []
  );

  useEffect(() => {
    debouncedSetSearch(search);
  }, [search, debouncedSetSearch]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
        setDebouncedSearch("");
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open]);

  const { data, isLoading, isError, error, isFetching, refetch } = useEntities({
    search: debouncedSearch.trim() || undefined,
    limit: 100,
    enabled: enabledOnly ? true : undefined,
  });

  const entities = [...(data?.entities ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const selectedEntity = entities.find((entity) => entity.name === value);
  const selectedLabel = selectedEntity
    ? formatEntityLabel(selectedEntity)
    : value || undefined;

  const selectEntity = (entity: Entity) => {
    onValueChange(entity.name);
    onEntitySelect?.(entity);
    setOpen(false);
    setSearch("");
    setDebouncedSearch("");
  };

  return (
    <div ref={containerRef} className="relative space-y-1">
      {isError && (
        <QueryErrorState
          variant="inline"
          className="p-3"
          error={error}
          title="Couldn't load entities"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      )}
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn(
          "w-full justify-between px-3 font-normal h-10",
          !value && "text-muted-foreground"
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[60] mt-1 rounded-md border bg-white shadow-lg">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto p-1">
            {isLoading || isFetching ? (
              <p className="py-6 text-center text-sm text-slate-500">Searching entities…</p>
            ) : entities.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">{emptyText}</p>
            ) : (
              entities.map((entity) => {
                const isSelected = value === entity.name;
                return (
                  <button
                    key={entity.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm cursor-pointer",
                      "text-slate-900 hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent/60",
                      entity.enabled === false && "opacity-70"
                    )}
                    onClick={() => selectEntity(entity)}
                  >
                    <span className="min-w-0 flex-1 truncate">{formatEntityLabel(entity)}</span>
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0 text-slate-700",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
