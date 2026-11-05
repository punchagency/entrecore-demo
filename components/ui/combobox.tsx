"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ComboboxOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  size?: "default" | "sm" | "lg";
  /** When true, lets the user commit the search text as a custom value. */
  allowCustomValue?: boolean;
  customValueLabel?: (value: string) => string;
  /** When false, options are not filtered client-side (use with server-side search). */
  filterLocally?: boolean;
  onSearchChange?: (search: string) => void;
  isLoading?: boolean;
  loadingText?: string;
  /** Set false when combobox is rendered inside a modal dialog (fixes search input focus). */
  modal?: boolean;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  size = "default",
  allowCustomValue = false,
  customValueLabel = (value) => `Use "${value}"`,
  filterLocally = true,
  onSearchChange,
  isLoading = false,
  loadingText = "Searching...",
  modal = true,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const heights = {
    default: "h-10",
    sm: "h-9",
    lg: "h-[48px]",
  };

  const trimmedSearch = search.trim();
  const normalizedSearch = trimmedSearch.toLowerCase();
  const filteredOptions = React.useMemo(() => {
    if (!filterLocally || !normalizedSearch) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalizedSearch) ||
        option.value.toLowerCase().includes(normalizedSearch)
    );
  }, [filterLocally, normalizedSearch, options]);

  const hasExactOptionMatch = options.some(
    (option) =>
      option.value.toLowerCase() === normalizedSearch ||
      option.label.toLowerCase() === normalizedSearch
  );
  const showCustomOption =
    allowCustomValue && trimmedSearch.length > 0 && !hasExactOptionMatch;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
      onSearchChange?.("");
    }
  }

  function selectValue(nextValue: string) {
    onValueChange(nextValue);
    setSearch("");
    setOpen(false);
  }

  const selectedLabel =
    value && (options.find((option) => option.value === value)?.label ?? value);

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between px-3 font-normal",
            heights[size],
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {value && options.find((option) => option.value === value)?.icon}
            <span className="truncate">{selectedLabel || placeholder}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[min(100vw-2rem,520px)] p-0 z-[100]"
        align="start"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => searchInputRef.current?.focus());
        }}
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(event) => {
              const next = event.target.value;
              setSearch(next);
              onSearchChange?.(next);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder={searchPlaceholder}
            className={cn(
              "border-0 shadow-none focus-visible:ring-0 px-0",
              size === "lg" ? "h-11" : "h-9"
            )}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
          {showCustomOption && (
            <button
              type="button"
              className={cn(
                "flex w-full items-center rounded-md px-2 py-2 text-left text-sm text-slate-900",
                "hover:bg-accent hover:text-accent-foreground cursor-pointer"
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectValue(trimmedSearch)}
            >
              {customValueLabel(trimmedSearch)}
            </button>
          )}
          {isLoading ? (
            <p className="py-6 text-center text-sm text-slate-500">{loadingText}</p>
          ) : filteredOptions.length === 0 && !showCustomOption ? (
            <p className="py-6 text-center text-sm text-slate-500">{emptyText}</p>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm cursor-pointer",
                    "text-slate-900 hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent/60"
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectValue(option.value)}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {option.icon && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-lg">
                        {option.icon}
                      </span>
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>
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
      </PopoverContent>
    </Popover>
  );
}
