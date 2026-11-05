"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { ChevronDown, Search } from "lucide-react";
import Image from "next/image";
import eIcon from "@/public/svgs/e-icon.svg";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "./ui/input";
import { useSearch } from "@/contexts/search-context";
import { Suspense, useEffect } from "react";
import { useCompaniesStore } from "@/app/store/companiesStore";
import PlaceholderImage from "./ui/placeholder-image";
import { NotificationBell } from "@/app/(protected)/notifications/components/notification-bell";

const functionOptions = [
  { name: "Finance", path: "Software or Apps Finance" },
  { name: "HR", path: "Software or Apps HR" },
  { name: "Marketing", path: "Software or Apps Marketing" },
  { name: "Operations", path: "Software or Apps Operations" },
  { name: "Sales", path: "Software or Apps Sales" },
  { name: "Tech", path: "Software or Apps Tech" },
];

function SearchInput() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { searchQuery, performSearch, setSelectedPath } = useSearch();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      performSearch(e.currentTarget.value);
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <div className="absolute left-4 bg-[#EFF4FF] p-3 rounded-full">
        <Search className="h-5 w-5 text-[#3064F6]" />
      </div>
      <Input
        type="text"
        placeholder="Search for new software, services, and resources..."
        className="w-full md:pl-24 pl-18 py-8 text-lg md:text-xl border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        defaultValue={searchQuery || searchParams?.get("query") || ""}
        onKeyDown={handleSearch}
      />
    </div>
  );
}

const SearchHeader = () => {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { searchQuery, performSearch, setSelectedPath } = useSearch();
  const { companies, isLoading, error, fetchCompanies } = useCompaniesStore();

  useEffect(() => {
    if (companies.length === 0) {
      fetchCompanies();
    }
  }, [fetchCompanies, companies]);

  const handleFunctionSelect = (path: string) => {
    const pathArray = ["Start", "Software or Apps"];
    const function_name = path.split("Software or Apps ")[1];
    pathArray.push(function_name);

    setSelectedPath(pathArray);

    router.push(`/search/guided-search?path=${encodeURIComponent(JSON.stringify(pathArray))}`);
  };

  return (
    <>
      {pathname.includes("/search/results") && (
        <div className="relative flex items-center w-full border-b bg-white border-[#D9DBDD]">
          <Suspense fallback={<div>Loading...</div>}>
            <SearchInput />
          </Suspense>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                className="absolute right-4 bg-[#3064F6] hover:bg-blue-700 text-white"
              >
                Find by Function
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {functionOptions.map((option) => (
                <DropdownMenuItem
                  key={option.name}
                  onClick={() => handleFunctionSelect(option.path)}
                  className="cursor-pointer"
                >
                  {option.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <div className="flex justify-between items-center py-4 px-4 border-b border-[#D9DBDD] bg-[#EFF4FF]">
        <h1 className="text-xl font-bold">
          {pathname === "/search"
            ? "Search"
            : pathname === "/search/guided-search"
              ? "Guided Search"
              : "Search Results"}
        </h1>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center text-sm font-bold bg-white p-0  has-[>svg]:!px-1"
            >
              <div className="flex items-center">
                {companies[0]?.profile_image ? (
                  <Image
                    src={companies[0]?.profile_image}
                    alt="Company Profile"
                    width={30}
                    height={30}
                    className="rounded-full"
                  />
                ) : (
                  <PlaceholderImage
                    name={
                      companies[0]?.company_name || companies[0]?.info?.company_name || "Company"
                    }
                    size="sm"
                    type="profile"
                  />
                )}
                <span className="mx-2">{companies[0]?.company_name}</span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {companies.map((company) => (
              <DropdownMenuItem key={company.id} asChild>
                <Link href={`/settings/company-profile/${company.id}`}>
                  {company?.company_name}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild>
              <Link href="/settings" className="text-primary font-medium">
                Manage Companies
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </>
  );
};

export default SearchHeader;
