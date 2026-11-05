import React, { useState, useEffect } from "react";
import { LayoutGrid, LayoutList } from "lucide-react";

import { Button } from "./ui/button";

interface ViewToggleProps {
  onViewChange: (view: "list" | "grid") => void;
  initialView?: "list" | "grid";
}

const DocumentViewToggle: React.FC<ViewToggleProps> = ({ onViewChange, initialView = "list" }) => {
  const [activeView, setActiveView] = useState<"list" | "grid">(initialView);
  const [isLoading, setIsLoading] = useState(typeof window === "undefined");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("documentViewMode");
      if (savedView === "grid" || savedView === "list") {
        setActiveView(savedView);
        onViewChange(savedView);
      }
      setIsLoading(false);
    }
  }, [onViewChange]);

  const handleViewChange = (view: "list" | "grid") => {
    setActiveView(view);
    onViewChange(view);
    localStorage.setItem("documentViewMode", view);
  };

  if (isLoading) {
    return <div className="h-10 w-20 bg-gray-100 animate-pulse rounded-md"></div>;
  }

  return (
    <div className="flex items-center bg-gray-100 rounded-md p-1">
      <Button
        variant="ghost"
        className={`p-2 rounded-md ${
          activeView === "list" ? "bg-white shadow-sm" : "text-gray-500"
        }`}
        onClick={() => handleViewChange("list")}
        aria-label="List view"
      >
        <LayoutList size={20} />
      </Button>
      <Button
        variant="ghost"
        className={`p-2 rounded-md ${
          activeView === "grid" ? "bg-white shadow-sm" : "text-gray-500"
        }`}
        onClick={() => handleViewChange("grid")}
        aria-label="Grid view"
      >
        <LayoutGrid size={20} />
      </Button>
    </div>
  );
};

export default DocumentViewToggle;
