"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// Define the search tree structure
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

// Define the context type
type SearchContextType = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedPath: string[];
  setSelectedPath: (path: string[]) => void;
  performSearch: (query: string) => void;
  navigateToStep: (index: number) => void;
  formatSearchPhrase: (tabs: string[]) => string;
  parseQueryToPath: (query: string) => string[];
};

// Create the context
const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Create a provider component
export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState<string[]>([]);

  // Format search phrase based on selected path
  const formatSearchPhrase = (tabs: string[]): string => {
    if (tabs.length === 0) return "";

    if (tabs[0] === "Software or Apps" || tabs.includes("Software or Apps")) {
      const lastSelection = tabs[tabs.length - 1];

      if (tabs.includes("Marketing") && !tabs.includes("Social Media")) {
        return `${lastSelection} Software`;
      }
      if (tabs.includes("Social Media")) {
        if (lastSelection === "Management") {
          return "Social Media Management Software";
        }
        if (lastSelection === "Analytics") {
          return "Social Media Analytics Software";
        }
        return `Social Media ${lastSelection} Software`;
      }

      return `${lastSelection} Software`;
    }

    if (tabs[0] === "Services" || tabs.includes("Services")) {
      const lastSelection = tabs[tabs.length - 1];

      if (tabs.includes("Marketing") && tabs.includes("Social Media")) {
        return `Social Media ${lastSelection} Services`;
      }

      return `${lastSelection} Services`;
    }

    return tabs.length > 0 ? tabs[tabs.length - 1] : "";
  };

  const parseQueryToPath = (query: string): string[] => {
    const path = ["Start"];

    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get("category");
    const subcategoryParam = urlParams.get("subcategory");

    if (categoryParam && subcategoryParam) {
      if (categoryParam === "software") {
        path.push("Software or Apps");

        const subcategory = subcategoryParam.replace(/-/g, " ");

        // Handle Marketing and its subcategories
        if (subcategory === "marketing") {
          path.push("Marketing");
        }
        // Handle all Social Media specific paths
        else if (subcategory === "analytics" && query.toLowerCase().includes("social media")) {
          path.push("Marketing");
          path.push("Social Media");
          path.push("Analytics");
        } else if (
          (subcategory === "content" || subcategory === "content creation") &&
          query.toLowerCase().includes("social media")
        ) {
          path.push("Marketing");
          path.push("Social Media");
          path.push("Content Creation");
        } else if (subcategory === "design" && query.toLowerCase().includes("social media")) {
          path.push("Marketing");
          path.push("Social Media");
          path.push("Design");
        } else if (subcategory === "planning" && query.toLowerCase().includes("social media")) {
          path.push("Marketing");
          path.push("Social Media");
          path.push("Planning");
        } else if (subcategory === "management" && query.toLowerCase().includes("social media")) {
          path.push("Marketing");
          path.push("Social Media");
          path.push("Management");
        } else if (subcategory === "scheduling" && query.toLowerCase().includes("social media")) {
          path.push("Marketing");
          path.push("Social Media");
          path.push("Scheduling");
        }
        // Handle regular Marketing subcategories
        else if (subcategory === "analytics") {
          path.push("Marketing");
          path.push("Analytics");
        } else if (subcategory === "advertising") {
          path.push("Marketing");
          path.push("Advertising");
        } else if (subcategory === "content") {
          path.push("Marketing");
          path.push("Content");
        } else if (subcategory === "design") {
          path.push("Marketing");
          path.push("Design");
        } else if (subcategory === "website") {
          path.push("Marketing");
          path.push("Website");
        }
        // Handle explicit Social Media paths
        else if (subcategory === "social-media-management") {
          path.push("Marketing");
          path.push("Social Media");
          path.push("Management");
        } else if (subcategory === "social-media-analytics") {
          path.push("Marketing");
          path.push("Social Media");
          path.push("Analytics");
        } else if (
          subcategory === "social-media-content" ||
          subcategory === "social-media-content-creation"
        ) {
          path.push("Marketing");
          path.push("Social Media");
          path.push("Content Creation");
        } else if (subcategory === "social-media-design") {
          path.push("Marketing");
          path.push("Social Media");
          path.push("Design");
        } else if (subcategory === "social-media-planning") {
          path.push("Marketing");
          path.push("Social Media");
          path.push("Planning");
        } else if (subcategory === "social-media-scheduling") {
          path.push("Marketing");
          path.push("Social Media");
          path.push("Scheduling");
        }
        // Handle other main categories
        else if (subcategory === "operations") {
          path.push("Operations");
        } else if (subcategory === "finance") {
          path.push("Finance");
        } else if (subcategory === "human-resources" || subcategory === "hr") {
          path.push("Human Resources");
        } else if (subcategory === "sales") {
          path.push("Sales");
        } else if (subcategory === "tech") {
          path.push("Tech");
        }
      }
      // Handle Services category
      else if (categoryParam === "services") {
        path.push("Services");

        const subcategory = subcategoryParam.replace(/-/g, " ");

        if (subcategory === "consulting") {
          path.push("Consulting");
        } else if (subcategory === "marketing") {
          path.push("Marketing");
        } else if (subcategory === "legal") {
          path.push("Legal");
        } else if (subcategory === "financial") {
          path.push("Financial");
        } else if (subcategory === "hr") {
          path.push("HR");
        }
      }
    }
    // Handle direct search queries
    else if (query) {
      if (query.includes("Software")) {
        path.push("Software or Apps");

        // Handle Social Media paths in query
        if (query.includes("Social Media")) {
          path.push("Marketing");
          path.push("Social Media");

          if (query.includes("Management")) {
            path.push("Management");
          } else if (query.includes("Analytics")) {
            path.push("Analytics");
          } else if (query.includes("Content Creation")) {
            path.push("Content Creation");
          } else if (query.includes("Design")) {
            path.push("Design");
          } else if (query.includes("Planning")) {
            path.push("Planning");
          } else if (query.includes("Scheduling")) {
            path.push("Scheduling");
          }
        }
        // Handle Marketing paths in query
        else if (query.includes("Marketing")) {
          path.push("Marketing");

          if (query.includes("Advertising")) {
            path.push("Advertising");
          } else if (query.includes("Analytics")) {
            path.push("Analytics");
          } else if (query.includes("Content")) {
            path.push("Content");
          } else if (query.includes("Design")) {
            path.push("Design");
          } else if (query.includes("Website")) {
            path.push("Website");
          }
        }
        // Handle other categories in query
        else if (query.includes("Operations")) {
          path.push("Operations");
        } else if (query.includes("Finance")) {
          path.push("Finance");
        } else if (query.includes("Human Resources")) {
          path.push("Human Resources");
        } else if (query.includes("Sales")) {
          path.push("Sales");
        } else if (query.includes("Tech")) {
          path.push("Tech");
        }
      }
      // Handle Services in query
      else if (query.includes("Services")) {
        path.push("Services");

        if (query.includes("Consulting")) {
          path.push("Consulting");
        } else if (query.includes("Marketing")) {
          path.push("Marketing");
        } else if (query.includes("Legal")) {
          path.push("Legal");
        } else if (query.includes("Financial")) {
          path.push("Financial");
        } else if (query.includes("HR")) {
          path.push("HR");
        }
      }
    }

    return path;
  };

  // Perform a search and navigate to results
  const performSearch = (query: string) => {
    if (!query.trim()) return;

    setSearchQuery(query);

    // Parse the query to a path
    const path = parseQueryToPath(query);
    setSelectedPath(path);

    // Extract category and subcategory
    let category = "";
    let subcategory = "";

    if (path.includes("Software or Apps")) {
      category = "software";
    } else if (path.includes("Services")) {
      category = "services";
    }

    if (path.length > 2) {
      subcategory = path[path.length - 1].toLowerCase().replace(/\s+/g, "-");
    }

    // Navigate to search results
    router.push(
      `/search/results?category=${category}&subcategory=${subcategory}&query=${encodeURIComponent(query)}`
    );
  };

  // Navigate to a specific step in the guided search
  const navigateToStep = (index: number) => {
    if (index === 0) {
      // If clicking "Start", go back to the beginning
      setSelectedPath(["Start"]);
      router.push("/search/guided-search");
      return;
    }

    // For other steps, navigate to guided search with the partial path
    const partialPath = selectedPath.slice(0, index + 1);
    setSelectedPath(partialPath);

    // Navigate to guided search with the partial path
    router.push(
      `/search/guided-search?step=${index}&path=${encodeURIComponent(JSON.stringify(partialPath))}`
    );
  };

  // Sync state with URL when the component mounts or URL changes
  useEffect(() => {
    if (pathname?.includes("/search/results")) {
      const params = new URLSearchParams(window?.location.search);
      const query = params.get("query") || "";
      const category = params.get("category") || "";
      const subcategory = params.get("subcategory") || "";

      setSearchQuery(query);

      // Reconstruct the path from URL parameters
      if (query) {
        const path = parseQueryToPath(query);
        setSelectedPath(path);
      }
    } else if (pathname?.includes("/search/guided-search")) {
      const params = new URLSearchParams(window.location.search);
      const pathParam = params.get("path");

      if (pathParam) {
        try {
          const path = JSON.parse(decodeURIComponent(pathParam));
          if (Array.isArray(path)) {
            setSelectedPath(path);
          }
        } catch (error) {
          console.error("Error parsing path parameter:", error);
        }
      }
    }
  }, [pathname]);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        selectedPath,
        setSelectedPath,
        performSearch,
        navigateToStep,
        formatSearchPhrase,
        parseQueryToPath,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

// Create a hook to use the search context
export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};
