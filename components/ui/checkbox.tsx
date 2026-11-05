import * as React from "react"
import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "checked" | "onCheckedChange"> {
  checked?: boolean | "indeterminate"
  onCheckedChange?: (checked: boolean | "indeterminate") => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null)

    // Sync external ref
    React.useImperativeHandle(ref, () => internalRef.current!)

    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = checked === "indeterminate"
      }
    }, [checked])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked
      onCheckedChange?.(isChecked)
      onChange?.(e)
    }

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={internalRef}
          checked={checked === true}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-blue-600 checked:border-blue-600 indeterminate:bg-blue-600 indeterminate:border-blue-600",
            className
          )}
          onChange={handleChange}
          {...props}
        />
        <Check className="absolute h-3 w-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 left-0.5 top-0.5" />
        <Minus className="absolute h-3 w-3 text-white pointer-events-none opacity-0 peer-indeterminate:opacity-100 left-0.5 top-0.5" />
      </div>
    )
  }
)

Checkbox.displayName = "Checkbox"

export { Checkbox }