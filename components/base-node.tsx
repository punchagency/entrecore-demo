import React from "react";
import { NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

interface BaseNodeProps extends NodeProps {
  children: React.ReactNode;
  className?: string;
}

export const BaseNode = ({ children, className, ...props }: BaseNodeProps) => {
  return (
    <div
      className={cn(
        "relative min-w-[200px] p-4 rounded-lg border",
        "bg-gradient-to-br from-card to-card/80 backdrop-blur-sm",
        "shadow-md transition-all duration-300",
        "hover:shadow-lg hover:scale-105",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface BaseNodeContentProps {
  children: React.ReactNode;
  className?: string;
}

export const BaseNodeContent = ({ children, className }: BaseNodeContentProps) => {
  return <div className={cn("space-y-2", className)}>{children}</div>;
};
