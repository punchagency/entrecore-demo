import React from "react";
import { Handle, Position, HandleProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

interface ButtonHandleProps extends HandleProps {
  children: React.ReactNode;
  showButton?: boolean;
}

export const ButtonHandle = ({
  children,
  showButton = true,
  className,
  ...handleProps
}: ButtonHandleProps) => {
  return (
    <div className="relative">
      <Handle
        className={cn(
          "w-3 h-3 bg-gray-500 border-2 border-background pointer-events-none",
          className
        )}
        {...handleProps}
      />
      {showButton && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          {children}
        </div>
      )}
    </div>
  );
};
