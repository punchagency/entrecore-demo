"use client";

import { useId } from "react";
import { AlertCircle, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";

const controlBase =
  "w-full rounded-xl border bg-white px-4 text-base text-gray-900 shadow-none transition-colors " +
  "placeholder:text-gray-300 focus-visible:ring-4 focus-visible:ring-primary/10 " +
  "disabled:cursor-not-allowed disabled:bg-gray-50";

const controlState = (hasError?: boolean) =>
  hasError
    ? "border-red-300 focus:border-red-400 focus-visible:border-red-400 focus-visible:ring-red-100"
    : "border-gray-200 focus:border-primary focus-visible:border-primary";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean }) => React.ReactNode;
}

export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId();

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        {optional && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-300">
            Optional
          </span>
        )}
      </div>
      {children({ id, "aria-invalid": Boolean(error) })}
      {error ? (
        <p className="flex items-center gap-1.5 text-sm text-red-500">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-gray-400">{hint}</p>
      )}
    </div>
  );
}

interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  containerClassName?: string;
}

export function TextField({
  label,
  hint,
  error,
  optional,
  value,
  onValueChange,
  containerClassName,
  className,
  ...inputProps
}: TextFieldProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      className={containerClassName}
    >
      {(fieldProps) => (
        <Input
          {...inputProps}
          {...fieldProps}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className={cn(controlBase, controlState(Boolean(error)), "h-12", className)}
        />
      )}
    </Field>
  );
}

interface TextAreaFieldProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  containerClassName?: string;
}

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  value,
  onValueChange,
  containerClassName,
  className,
  ...textareaProps
}: TextAreaFieldProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      className={containerClassName}
    >
      {(fieldProps) => (
        <Textarea
          {...textareaProps}
          {...fieldProps}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className={cn(
            controlBase,
            controlState(Boolean(error)),
            "min-h-[7.5rem] resize-y py-3 leading-relaxed",
            className
          )}
        />
      )}
    </Field>
  );
}

interface SelectFieldProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  formatOption?: (option: string) => string;
  containerClassName?: string;
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  formatOption,
  containerClassName,
}: SelectFieldProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      className={containerClassName}
    >
      {(fieldProps) => (
        <Select value={value || undefined} onValueChange={onValueChange}>
          <SelectTrigger
            id={fieldProps.id}
            aria-invalid={fieldProps["aria-invalid"]}
            className={cn(controlBase, controlState(Boolean(error)), "h-12 justify-between")}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {options.map((option) => (
              <SelectItem key={option} value={option} className="rounded-lg py-2.5 text-base">
                {formatOption ? formatOption(option) : option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}

interface ChoiceGridProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  value: string;
  options: readonly string[];
  onSelect: (value: string) => void;
  columns?: 2 | 3;
  formatOption?: (option: string) => string;
}

/** Tappable chips for short option sets — faster than a dropdown, and every choice is visible. */
export function ChoiceGrid({
  label,
  hint,
  error,
  optional,
  value,
  options,
  onSelect,
  columns = 3,
  formatOption,
}: ChoiceGridProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      {() => (
        <div
          className={cn(
            "grid gap-2",
            columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
          )}
        >
          {options.map((option) => {
            const isSelected = value === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onSelect(option)}
                aria-pressed={isSelected}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 text-primary shadow-[0_0_0_1px_var(--primary)]"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <span className="truncate">{formatOption ? formatOption(option) : option}</span>
                {isSelected && <Check className="size-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </Field>
  );
}
