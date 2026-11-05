import { useRef, useState, useEffect } from 'react';
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  className?: string;
}

const SearchInput = ({ 
  value: externalValue = "", 
  onChange, 
  onSearch,
  onClear, 
  className 
}: SearchInputProps) => {
  // Use internal state for immediate updates
  const [internalValue, setInternalValue] = useState(externalValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with external value
  useEffect(() => {
    setInternalValue(externalValue);
  }, [externalValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue); // Update internal state immediately
    if (onChange) onChange(newValue); // Notify parent component if using onChange
    if (onSearch) onSearch(newValue); // Notify parent component if using onSearch
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={cn("relative flex items-center group", className)}>
      <Search
        className="absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors"
      />
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search..."
        value={internalValue}
        className="w-full rounded-xl pl-10 pr-10 border-slate-200 bg-slate-50/50 focus-visible:bg-white transition-all h-10 shadow-sm"
        onChange={handleChange}
      />
      {internalValue && internalValue.length > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-transparent"
          onClick={() => {
            setInternalValue("");
            if (onClear) onClear();
            if (onSearch) onSearch("");
          }}
        >
          <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
        </Button>
      ) : (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:flex items-center gap-1 opacity-40 group-focus-within:opacity-0 transition-opacity">
          <kbd className="h-5 min-w-[20px] items-center justify-center rounded border border-slate-300 bg-slate-100 px-1 font-sans text-[10px] font-bold text-slate-500">
            ⌘
          </kbd>
          <kbd className="h-5 min-w-[20px] items-center justify-center rounded border border-slate-300 bg-slate-100 px-1 font-sans text-[10px] font-bold text-slate-500">
            K
          </kbd>
        </div>
      )}
    </div>
  );
};

export default SearchInput;