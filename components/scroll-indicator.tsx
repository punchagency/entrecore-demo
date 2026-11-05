"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface ScrollIndicatorProps {
  className?: string;
}

export default function ScrollIndicator({ className = "" }: ScrollIndicatorProps) {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Show indicator if there's more content below the current viewport
      const hasMoreContent = documentHeight > windowHeight + scrollTop + 100;
      setShowIndicator(hasMoreContent);
    };

    // Check on mount and resize
    checkScroll();
    window.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <div className="text-xs text-gray-500 font-medium animate-pulse">Scroll for more</div>
        <div className="w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 flex items-center justify-center animate-bounce">
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </div>
      </div>
    </div>
  );
}
