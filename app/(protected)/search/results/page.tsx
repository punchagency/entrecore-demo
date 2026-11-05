"use client";
import SearchResult from "@/components/search/search-result";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearch } from "@/contexts/search-context";

export default function SearchResultsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { searchQuery, selectedPath, navigateToStep } = useSearch();
  
  useEffect(() => {
    // Simulate loading search results
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-[#EFF4FF] min-h-screen">      
      {/* Breadcrumb navigation */}
      <div className="bg-[#EFF4FF] border-b border-gray-200 py-3 px-6 overflow-x-auto">
      <div className="flex items-center text-sm">
        {selectedPath.map((item, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-4 text-gray-400" />}
            <Button
              variant="link"
              className={`font-bold p-0 ${
                index === selectedPath.length - 1 
                  ? "text-soft-black mr-6" 
                  : "text-[#3064F6]"
              }`}
              onClick={() => navigateToStep(index)}
            >
              {item}
            </Button>
          </div>
        ))}
      </div>
    </div>
      
      {/* Main content */}
      <div className="container p-6">
        <h1 className="text-xl font-bold mb-8">{searchQuery}</h1>
        
        {isLoading ? (
          <div className="animate-pulse space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-64 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
              <SearchResult />
        )}
      </div>
      <hr className="my-8"/>
    </div>
  );
}