import React from "react";
import { cn } from "@/lib/utils";

interface BaseNodeContentProps {
  children: React.ReactNode;
  className?: string;
}

export const BaseNodeContent = ({ children, className }: BaseNodeContentProps) => {
  return <div className={cn("space-y-2", className)}>{children}</div>;
};
