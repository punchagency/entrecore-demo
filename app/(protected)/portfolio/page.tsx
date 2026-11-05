"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { ArrowUpIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { MoreVertical, Edit, Trash2, ExternalLink, Search } from "lucide-react";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import {
  Table,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableHeader,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function PortfolioPage() {
  interface PortfolioSnapshotCardProps {
    title: string;
    value: string | number;
    changeValue: string | number;
    changeLabel: string;
    className?: string;
  }

  const PortfolioSnapshotCard = ({
    title,
    value,
    changeValue,
    changeLabel,
    className,
  }: PortfolioSnapshotCardProps) => {
    const [timeRange, setTimeRange] = React.useState("all-time");

    const formattedValue =
      typeof value === "string" ? value : new Intl.NumberFormat("en-US").format(value);

    return (
      <Card className={cn("w-full shadow-none", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <h3 className="text-base font-bold">{title}</h3>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="h-8 w-[120px] rounded-full border-0 bg-[#F4F3FF] text-sm font-medium ring-offset-0 focus:ring-0 focus-visible:ring-0">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent className="border-none bg-[#F4F3FF]">
              <SelectItem value="all-time">All Time</SelectItem>
              <SelectItem value="ytd">YTD</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">{formattedValue}</div>
            <div className="flex items-center gap-1">
              <ArrowUpIcon className="h-4 w-4 text-[#3064F6]" />
              <span className="text-[#3064F6] text-sm font-medium">
                {changeValue} {changeLabel}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const PortfolioSnapshot = () => (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Portfolio Snapshot</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <PortfolioSnapshotCard title="Investments" value={467} changeValue={24} changeLabel="YTD" />

        <PortfolioSnapshotCard
          title="Dry Powder"
          value="$13.51M"
          changeValue="$8.3M"
          changeLabel="YTD"
        />

        <PortfolioSnapshotCard
          title="Total Deployed"
          value="$52.34M"
          changeValue="$8.3M"
          changeLabel="YTD"
        />
      </div>
    </div>
  );

  const portfolioCompanies = [
    {
      id: 1,
      name: "15Five",
      logoFile: "15five.svg",
      valuation: "$1.2B",
      investment: "$245K",
      equity: 3.6,
      category: "Software",
      round: "Series C",
    },
    {
      id: 2,
      name: "Anyplace",
      logoFile: "anyplace.svg",
      valuation: "$67.3M",
      investment: "$160K",
      equity: 4.2,
      category: "Software",
      round: "Series B",
    },
    {
      id: 3,
      name: "Blockable",
      logoFile: "blockable.svg",
      valuation: "$98.4M",
      investment: "$136K",
      equity: 2.5,
      category: "Software",
      round: "Series A",
    },
    {
      id: 4,
      name: "Brilliant",
      logoFile: "brilliant.svg",
      valuation: "$6.7M",
      investment: "$245K",
      equity: 3.6,
      category: "Software",
      round: "Series C",
    },
    {
      id: 5,
      name: "Calm",
      logoFile: "calm.svg",
      valuation: "$1.73B",
      investment: "$325K",
      equity: 5.6,
      category: "Software",
      round: "Series C",
    },
    {
      id: 6,
      name: "Slack",
      logoFile: "slack.svg",
      valuation: "$27.8B",
      investment: "$500K",
      equity: 2.1,
      category: "Software",
      round: "Series D",
    },
    {
      id: 7,
      name: "Notion",
      logoFile: "notion.svg",
      valuation: "$10B",
      investment: "$375K",
      equity: 1.8,
      category: "Software",
      round: "Series C",
    },
    {
      id: 8,
      name: "Figma",
      logoFile: "figma.svg",
      valuation: "$20B",
      investment: "$420K",
      equity: 2.3,
      category: "Design",
      round: "Series E",
    },
    {
      id: 9,
      name: "Google",
      logoFile: "google.svg",
      valuation: "$1.5T",
      investment: "$780K",
      equity: 0.01,
      category: "Technology",
      round: "Public",
    },
    {
      id: 10,
      name: "Airtable",
      logoFile: "airtable.svg",
      valuation: "$11.7B",
      investment: "$310K",
      equity: 1.7,
      category: "Software",
      round: "Series F",
    },
    {
      id: 11,
      name: "Funded House",
      logoFile: "funded-house.svg",
      valuation: "$4.3M",
      investment: "$150K",
      equity: 8.2,
      category: "Real Estate",
      round: "Seed",
    },
    {
      id: 12,
      name: "Shape",
      logoFile: "shape.svg",
      valuation: "$17.5M",
      investment: "$200K",
      equity: 5.3,
      category: "Design",
      round: "Series A",
    },
    {
      id: 13,
      name: "QuickBooks",
      logoFile: "qb.svg",
      valuation: "$85B",
      investment: "$290K",
      equity: 0.05,
      category: "Finance",
      round: "Public",
    },
    {
      id: 14,
      name: "JPMorgan",
      logoFile: "jpm.svg",
      valuation: "$435B",
      investment: "$550K",
      equity: 0.01,
      category: "Finance",
      round: "Public",
    },
    {
      id: 15,
      name: "Gmail",
      logoFile: "gmail.svg",
      valuation: "$22B",
      investment: "$275K",
      equity: 0.8,
      category: "Email",
      round: "Series B",
    },
  ];

  const fundICompanies = portfolioCompanies.slice(0, 5);
  const fundIICompanies = portfolioCompanies.slice(5, 10);
  const fundIIICompanies = portfolioCompanies.slice(10, 13);
  const spvCompanies = portfolioCompanies.slice(13, 15);
  const router = useRouter();

  const PortfolioCompaniesTable = ({ companies = portfolioCompanies }) => (
    <div>
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
        <h2 className="text-xl font-semibold">All Portfolio Companies</h2>
        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
          <div className="relative w-full md:w-60">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input className="pl-9 pr-4 w-full rounded-[30px]" placeholder="Search" type="search" />
          </div>
          <div className="flex space-x-2">
            <Select defaultValue="all-rounds">
              <SelectTrigger className="w-full md:w-32 rounded-[30px]">
                <SelectValue placeholder="All Rounds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-rounds">All Rounds</SelectItem>
                <SelectItem value="seed">Seed</SelectItem>
                <SelectItem value="series-a">Series A</SelectItem>
                <SelectItem value="series-b">Series B</SelectItem>
                <SelectItem value="series-c">Series C</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-categories">
              <SelectTrigger className="w-full md:w-32 rounded-[30px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-categories">All Categories</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
                <SelectItem value="services">Services</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <Table className="border-collapse min-w-[800px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-gray-200">
              <TableHead className="text-sm font-medium text-gray-500">Company</TableHead>
              <TableHead className="text-sm font-medium text-gray-500">Valuation</TableHead>
              <TableHead className="text-sm font-medium text-gray-500">Investment</TableHead>
              <TableHead className="text-sm font-medium text-gray-500">Equity</TableHead>
              <TableHead className="text-sm font-medium text-gray-500">Category</TableHead>
              <TableHead className="text-sm font-medium text-gray-500">Round</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow
                key={company.id}
                className={cn(
                  "cursor-pointer h-14 hover:bg-gray-50 rounded-lg",
                  selectedCompany?.id === company.id ? "bg-blue-50 hover:bg-blue-50" : ""
                )}
                onClick={() => router.push(`/portfolio/details`)}
              >
                <TableCell className="py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-md bg-white border border-gray-100 shadow-sm overflow-hidden">
                      <img
                        src={`/svgs/brands/${company.logoFile}`}
                        alt={company.name}
                        className="object-contain"
                        width={35}
                        height={35}
                      />
                    </div>
                    <span className="font-medium">{company.name}</span>
                  </div>
                </TableCell>
                <TableCell className="py-2 font-medium">{company.valuation}</TableCell>
                <TableCell className="py-2 font-medium">{company.investment}</TableCell>
                <TableCell className="py-2 font-medium">{company.equity}%</TableCell>
                <TableCell className="py-2 font-medium">{company.category}</TableCell>
                <TableCell className="py-2">
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 text-xs rounded-full">
                    {company.round}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        <span>View Details</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // Add state for selected company
  const [selectedCompany, setSelectedCompany] = useState<null | {
    id: number;
    name: string;
    logoFile: string;
  }>(null);

  // Show toast when a company is selected
  useEffect(() => {
    if (selectedCompany) {
      toast({
        title: `Launched ${selectedCompany.name}`,
        description: "You are now viewing this company's data.",
        duration: 3000,
      });
    }
  }, [selectedCompany]);

  return (
    <div className="space-y-2 px-2 md:px-4">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-white hover:bg-gray-50 text-black border border-gray-100 shadow-sm rounded-md px-2 py-1.5 h-10 w-full md:w-[140px]">
                <div className="flex items-center justify-between w-full">
                  {selectedCompany ? (
                    <>
                      <div className="w-7 h-7 flex items-center justify-center rounded bg-white border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">
                        <img
                          src={`/svgs/brands/${selectedCompany.logoFile}`}
                          alt={selectedCompany.name}
                          className="object-contain"
                          width={24}
                          height={24}
                        />
                      </div>
                      <span className="text-sm font-medium flex-grow text-left mx-2 truncate">
                        {selectedCompany.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="bg-orange-500 p-1.5 rounded flex-shrink-0">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M8 1L11.3301 6.5H4.66987L8 1Z" fill="white" />
                          <path d="M8 15L4.66987 9.5H11.3301L8 15Z" fill="white" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium flex-grow text-center mx-3">Launch</span>
                    </>
                  )}
                  <ChevronDownIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-2">
              <div className="p-2 text-xs font-medium text-gray-500 border-b border-gray-100 mb-1">
                {selectedCompany ? "Change company" : "Select a company"}
              </div>

              {selectedCompany && (
                <DropdownMenuItem
                  className="py-2.5 px-2 cursor-pointer hover:bg-gray-50 rounded-md focus:bg-gray-50 border-b border-gray-100 mb-1"
                  onClick={() => setSelectedCompany(null)}
                >
                  <div className="flex items-center gap-3 w-full text-blue-600">
                    <div className="w-6 h-6 flex items-center justify-center">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8 12L12 16L16 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 8V16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="font-medium">Reset selection</span>
                  </div>
                </DropdownMenuItem>
              )}

              {portfolioCompanies.slice(0, 8).map((company) => (
                <DropdownMenuItem
                  key={company.id}
                  className={`py-2.5 px-2 cursor-pointer hover:bg-gray-50 rounded-md focus:bg-gray-50 ${
                    selectedCompany?.id === company.id ? "bg-gray-50" : ""
                  }`}
                  onClick={() =>
                    setSelectedCompany({
                      id: company.id,
                      name: company.name,
                      logoFile: company.logoFile,
                    })
                  }
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-9 h-9 flex items-center justify-center rounded-md bg-white border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">
                      <img
                        src={`/svgs/brands/${company.logoFile}`}
                        alt={company.name}
                        className="object-contain"
                        width={32}
                        height={32}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{company.name}</span>
                      {selectedCompany?.id === company.id && (
                        <span className="text-xs text-blue-600">Currently selected</span>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="all-funds" className="w-full">
        <div className="flex flex-col space-y-2 md:items-center md:justify-between md:flex-row md:space-y-0 border-b border-gray-200">
          <div className="overflow-x-auto -mx-2 px-2">
            <TabsList className="bg-transparent h-auto border-0 shadow-none w-max">
              <TabsTrigger
                value="all-funds"
                className="px-3 md:px-4 cursor-pointer py-2 rounded-none border-0 data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium whitespace-nowrap"
              >
                All Funds
              </TabsTrigger>
              <TabsTrigger
                value="fund-i"
                className="px-3 md:px-4 cursor-pointer py-2 rounded-none border-0 data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium whitespace-nowrap"
              >
                Fund I
              </TabsTrigger>
              <TabsTrigger
                value="fund-ii"
                className="px-3 md:px-4 cursor-pointer py-2 rounded-none border-0 data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium whitespace-nowrap"
              >
                Fund II
              </TabsTrigger>
              <TabsTrigger
                value="fund-iii"
                className="px-3 md:px-4 cursor-pointer py-2 rounded-none border-0 data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium whitespace-nowrap"
              >
                Fund III
              </TabsTrigger>
              <TabsTrigger
                value="spvs"
                className="px-3 md:px-4 cursor-pointer py-2 rounded-none border-0 data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium whitespace-nowrap"
              >
                SPVs
              </TabsTrigger>
            </TabsList>
          </div>

          <Button
            variant="outline"
            size={"lg"}
            className="flex items-center gap-2 w-full md:w-auto md:mr-2 cursor-pointer my-1 md:my-0"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 2.5C10.4602 2.5 10.8333 2.8731 10.8333 3.33333L10.8333 10.8333C10.8333 11.2936 10.4602 11.6667 10 11.6667C9.53976 11.6667 9.16667 11.2936 9.16667 10.8333L9.16667 3.33333C9.16667 2.8731 9.53976 2.5 10 2.5ZM5 2.5C5.46024 2.5 5.83333 2.8731 5.83333 3.33333L5.83333 5.83333H6.66667C7.1269 5.83333 7.5 6.20643 7.5 6.66667C7.5 7.1269 7.1269 7.5 6.66667 7.5H3.33333C2.8731 7.5 2.5 7.1269 2.5 6.66667C2.5 6.20643 2.8731 5.83333 3.33333 5.83333H4.16667L4.16667 3.33333C4.16667 2.8731 4.53976 2.5 5 2.5ZM15 2.5C15.4602 2.5 15.8333 2.8731 15.8333 3.33333L15.8333 8.33333H16.6667C17.1269 8.33333 17.5 8.70643 17.5 9.16667C17.5 9.6269 17.1269 10 16.6667 10L13.3333 10C12.8731 10 12.5 9.6269 12.5 9.16667C12.5 8.70643 12.8731 8.33333 13.3333 8.33333H14.1667V3.33333C14.1667 2.8731 14.5398 2.5 15 2.5ZM5 8.33333C5.46024 8.33333 5.83333 8.70643 5.83333 9.16667L5.83333 16.6667C5.83333 17.1269 5.46024 17.5 5 17.5C4.53976 17.5 4.16667 17.1269 4.16667 16.6667L4.16667 9.16667C4.16667 8.70643 4.53976 8.33333 5 8.33333ZM15 10.8333C15.4602 10.8333 15.8333 11.2064 15.8333 11.6667L15.8333 16.6667C15.8333 17.1269 15.4602 17.5 15 17.5C14.5398 17.5 14.1667 17.1269 14.1667 16.6667L14.1667 11.6667C14.1667 11.2064 14.5398 10.8333 15 10.8333ZM7.5 13.3333C7.5 12.8731 7.87309 12.5 8.33333 12.5H11.6667C12.1269 12.5 12.5 12.8731 12.5 13.3333C12.5 13.7936 12.1269 14.1667 11.6667 14.1667H10.8333L10.8333 16.6667C10.8333 17.1269 10.4602 17.5 10 17.5C9.53976 17.5 9.16666 17.1269 9.16666 16.6667L9.16666 14.1667H8.33333C7.87309 14.1667 7.5 13.7936 7.5 13.3333Z"
                fill="#181818"
              />
            </svg>

            <span>Manage Portfolio</span>
          </Button>
        </div>

        <TabsContent value="all-funds" className="p-0 md:p-2 bg-transparent mt-0">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Portfolio Snapshot</h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <PortfolioSnapshotCard
                title="Investments"
                value={467}
                changeValue={24}
                changeLabel="YTD"
              />

              <PortfolioSnapshotCard
                title="Dry Powder"
                value="$13.51M"
                changeValue="$8.3M"
                changeLabel="YTD"
              />

              <PortfolioSnapshotCard
                title="Total Deployed"
                value="$52.34M"
                changeValue="$8.3M"
                changeLabel="YTD"
              />
            </div>
          </div>

          <div>
            <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0 mb-3">
              <h2 className="text-xl font-semibold">All Portfolio Companies</h2>
              <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
                <div className="relative w-full md:w-56">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    className="pl-8 pr-3 w-full rounded-[30px] h-9"
                    placeholder="Search"
                    type="search"
                  />
                </div>
                <div className="flex space-x-2">
                  <Select defaultValue="all-rounds">
                    <SelectTrigger className="w-full md:w-28 rounded-[30px] h-9">
                      <SelectValue placeholder="All Rounds" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-rounds">All Rounds</SelectItem>
                      <SelectItem value="seed">Seed</SelectItem>
                      <SelectItem value="series-a">Series A</SelectItem>
                      <SelectItem value="series-b">Series B</SelectItem>
                      <SelectItem value="series-c">Series C</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all-categories">
                    <SelectTrigger className="w-full md:w-28 rounded-[30px] h-9">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-categories">All Categories</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="hardware">Hardware</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto -mx-2 px-2">
              <Table className="border-collapse min-w-[800px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-gray-200">
                    <TableHead className="text-sm font-medium text-gray-500 pl-1">
                      Company
                    </TableHead>
                    <TableHead className="text-sm font-medium text-gray-500">Valuation</TableHead>
                    <TableHead className="text-sm font-medium text-gray-500">Investment</TableHead>
                    <TableHead className="text-sm font-medium text-gray-500">Equity</TableHead>
                    <TableHead className="text-sm font-medium text-gray-500">Category</TableHead>
                    <TableHead className="text-sm font-medium text-gray-500">Round</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolioCompanies.map((company) => (
                    <TableRow
                      key={company.id}
                      className={cn(
                        "cursor-pointer h-12 hover:bg-gray-50 rounded-lg",
                        selectedCompany?.id === company.id ? "bg-blue-50 hover:bg-blue-50" : ""
                      )}
                      onClick={() => router.push(`/portfolio/details`)}
                    >
                      <TableCell className="py-1 pl-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-gray-100 shadow-sm overflow-hidden">
                            <img
                              src={`/svgs/brands/${company.logoFile}`}
                              alt={company.name}
                              className="object-contain"
                              width={30}
                              height={30}
                            />
                          </div>
                          <span className="font-medium">{company.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-1 font-medium">{company.valuation}</TableCell>
                      <TableCell className="py-1 font-medium">{company.investment}</TableCell>
                      <TableCell className="py-1 font-medium">{company.equity}%</TableCell>
                      <TableCell className="py-1 font-medium">{company.category}</TableCell>
                      <TableCell className="py-1">
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 text-xs rounded-full">
                          {company.round}
                        </span>
                      </TableCell>
                      <TableCell className="py-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              <span>View Details</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fund-i" className="p-0 md:p-2 bg-transparent mt-0">
          <PortfolioSnapshot />
          <PortfolioCompaniesTable companies={fundICompanies} />
        </TabsContent>

        <TabsContent value="fund-ii" className="p-0 md:p-2 bg-transparent mt-0">
          <PortfolioSnapshot />
          <PortfolioCompaniesTable companies={fundIICompanies} />
        </TabsContent>

        <TabsContent value="fund-iii" className="p-0 md:p-2 bg-transparent mt-0">
          <PortfolioSnapshot />
          <PortfolioCompaniesTable companies={fundIIICompanies} />
        </TabsContent>

        <TabsContent value="spvs" className="p-0 md:p-2 bg-transparent mt-0">
          <PortfolioSnapshot />
          <PortfolioCompaniesTable companies={spvCompanies} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
