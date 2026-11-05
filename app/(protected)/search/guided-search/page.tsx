"use client";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearch } from "@/contexts/search-context";
import { useRouter, useSearchParams } from "next/navigation";
import SearchResult from "@/components/search/search-result";
import Link from "next/link";

export default function GuidedSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedPath, setSelectedPath, formatSearchPhrase } = useSearch();
  
  const [currentTabOptions, setCurrentTabOptions] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Define the guided search tree structure
  const searchTree = {
    initial: ["Software or Apps", "Services"],
    "Software or Apps": ["Operations", "Marketing", "Finance", "Human Resources", "Sales", "Tech"],
    Services: ["Consulting", "Marketing", "Legal", "Financial", "HR"],
    Marketing: ["Advertising", "Analytics", "Content", "Design", "Social Media", "Website"],
    "Social Media": [
      "Analytics",
      "Content Creation",
      "Design",
      "Planning",
      "Management",
      "Scheduling",
    ],
  };
  
  // Initialize from URL parameters if available
  useEffect(() => {
    const pathParam = searchParams?.get("path");
    
    if (pathParam) {
      try {
        const path = JSON.parse(decodeURIComponent(pathParam));
        if (Array.isArray(path)) {
          setSelectedPath(path);
        }
      } catch (error) {
        console.error("Error parsing path parameter:", error);
      }
    } else if (selectedPath.length === 0) {
      // Initialize with "Start" if no path is provided
      setSelectedPath(["Start"]);
    }
    
    setIsInitialized(true);
  }, [searchParams, setSelectedPath]);
  
  // Update current tab options based on selected path
  useEffect(() => {
    if (!isInitialized) return;
    
    if (selectedPath.length <= 1) {
      // If at start or no selection, show initial options
      setCurrentTabOptions(searchTree.initial);
      setIsTransitioning(false);
    } else {
      // Keep the transitioning state true (already set in handleTabSelection)
      // Don't show any options during transition
      
      const lastSelection = selectedPath[selectedPath.length - 1];
      
      if (searchTree[lastSelection as keyof typeof searchTree]) {
        // Only set new options after a delay
        setTimeout(() => {
          setCurrentTabOptions(searchTree[lastSelection as keyof typeof searchTree]);
          setIsTransitioning(false);
        }, 100);
      } else {
        // We've reached a leaf node - prepare for redirection
        // Keep currentTabOptions empty to prevent showing previous options
        
        const category = selectedPath.includes("Software or Apps") ? "software" : "services";
        const subcategory = lastSelection.toLowerCase().replace(/\s+/g, "-");
        const searchQuery = formatSearchPhrase(selectedPath);
        
        // Redirect without showing any options
        setTimeout(() => {
          router.push(`/search/results?category=${category}&subcategory=${subcategory}&query=${encodeURIComponent(searchQuery)}`);
        }, 100);
      }
    }
  }, [selectedPath, router, formatSearchPhrase, isInitialized]);
  
  const handleTabSelection = (tab: string) => {
    // Immediately clear current options and show loading state
    setCurrentTabOptions([]);
    setIsTransitioning(true);
    
    // Then update the path
    setTimeout(() => {
      setSelectedPath([...selectedPath, tab]);
    }, 50);
  };
  
  const handleBack = (index: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedPath(selectedPath.slice(0, index + 1));
    }, 50);
  };
  
  return (
    <div className="bg-[#EFF4FF]">
      
      {/* Breadcrumb navigation */}
      <div className="bg-[#EFF4FF] border-b border-gray-200 py-3 px-2 overflow-x-auto">
        <div className="flex items-center text-sm ">
          <Button
            variant="link"
            onClick={() => {
              setIsTransitioning(true);
              setTimeout(() => {
                setSelectedPath(["Start"]);
              }, 50);
            }}
            className={`font-bold hover:text-blue-600 text-black ${
              selectedPath.length > 1 ? "text-[#3064F6]" : ""
            }`}
          >
            Start
          </Button>

          {selectedPath.slice(1).map((tab, index) => (
            <div key={index} className="flex items-center">
              <ChevronRight className="h-4 w-4" />
              <Button
                variant="link"
                onClick={() => handleBack(index + 1)}
                className={`font-bold hover:text-blue-600 text-black ${
                  index < selectedPath.length - 2 ? "text-[#3064F6]" : ""
                }`}
              >
                {tab}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-8 border-b border-[#D9DBDD] p-6">
        {/* Initial heading */}
        {selectedPath.length <= 1 && !isTransitioning && (
          <h1 className="text-xl font-bold w-full">
            What can we help you <span className="text-[#3064F6]">find</span>?
          </h1>
        )}
        
        {/* Intermediate heading */}
        {selectedPath.length > 1 && currentTabOptions.length > 0 && !isTransitioning && (
          <h1 className="text-xl font-bold w-full">
            What type of{" "}
            <span className="text-[#3064F6]">
              {selectedPath
                .slice(1)
                .map((tab) => tab.split(" ")[0])
                .reverse()
                .join(" ")}
            </span>{" "}
            are you looking for?
          </h1>
        )}

        {/* Option buttons */}
        {currentTabOptions.length > 0 && !isTransitioning && (
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-4 w-full ${
              currentTabOptions.length > 4 ? "md:grid-cols-3" : ""
            }`}
          >
            {currentTabOptions.map((tab) => (
              <Button
                variant="outline"
                className="w-full p-8 border-l-4 border-l-[#3064F6] justify-between font-bold text-lg"
                key={tab}
                onClick={() => handleTabSelection(tab)}
              >
                {tab} <ArrowRight strokeWidth={2.5} className="h-5 w-5" />
              </Button>
            ))}
          </div>
        )}
    
        {/* Preview results for intermediate steps */}
        {selectedPath.length > 2 && currentTabOptions.length > 0 && !isTransitioning && (
          <div className="flex justify-start flex-col gap-8">
            <hr />
            {currentTabOptions.map((option, index) => (
              <div key={index} className=" mx-auto">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  {option} {selectedPath.includes("Software or Apps") ? "Software" : "Services"}
                </h2>
                <SearchResult key={index} />
                {index < currentTabOptions.length - 1 && (
                  <hr className="w-full border-t border-[#D9DBDD] mt-12" />
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Loading state */}
        {isTransitioning && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-gray-200 h-12 w-12"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}