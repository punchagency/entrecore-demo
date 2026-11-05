import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        {
          "border-transparent bg-blue-600 text-white shadow hover:bg-blue-700": variant === "default",
          "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200": variant === "secondary",
          "border-transparent bg-red-600 text-white shadow hover:bg-red-700": variant === "destructive",
          "text-gray-700 border-gray-300": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge } 