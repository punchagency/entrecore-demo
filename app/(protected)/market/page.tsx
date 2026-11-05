"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ValuationsChart from "@/components/valuations-chart";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "@/components/ui/table";
import DealVolumeAnalytics from "@/components/deal-volume-analytics";
import { portfolioCompanies } from "@/mocks/portfolio-data";
import { Company } from "@/types/company";


const mockFundingRoundsData = [
  { organization: "Company 1", amount: 6, round: "Pre-Seed" },
  { organization: "Company 2", amount: 8, round: "Seed" },
  { organization: "Company 3", amount: 10, round: "Series A" },
  { organization: "Company 4", amount: 14, round: "Series B" },
  { organization: "Company 5", amount: 12, round: "Series C" },
  { organization: "Company 6", amount: 18, round: "Series D" },
  { organization: "Company 7", amount: 18, round: "Series D" },
  { organization: "Company 8", amount: 18, round: "Series D" },
  { organization: "Company 9", amount: 18, round: "Series D" },
  { organization: "Company 10", amount: 18, round: "Series D" },
];



const Market = () => {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  return (
    <div className="space-y-8  sm:mx-5">
      <div className="flex items-center justify-between border-b pb-4">
      <h1 className="text-2xl font-bold">Market</h1>
      <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-white hover:bg-gray-50 text-black border border-gray-100 shadow-sm rounded-md px-2 py-1.5 h-10 w-[140px]">
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
                  <ChevronDown size={16} />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 p-2">
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
                      valuation: company.valuation,
                      investment: company.investment,
                      equity: company.equity,
                      category: company.category,
                      round: company.round,
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
      <div>
        <p className="text-xl font-bold">Market Data</p> 
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
          <ValuationsChart />
        <div className="flex flex-col gap-8 xl:w-1/2 p-5  bg-white rounded-md">
          <div className="flex items-center justify-between">
            <h1 className="text-lg md:text-xl font-bold">Recent Funding Rounds</h1>
            <DropdownMenu>
              <DropdownMenuTrigger className="font-light text-sm flex items-center gap-2 px-3 py-1 bg-[#EFF4FF] rounded-full">
                All <ChevronDown size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Latest</DropdownMenuItem>
                <DropdownMenuItem>Oldest</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[12px] font-medium text-[#757575] border-y">Organization</TableHead>
                <TableHead className="text-[12px] font-medium text-[#757575] border-y">Amount</TableHead>
                <TableHead className="text-[12px] font-medium text-[#757575] border-y">Round</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockFundingRoundsData.map((row) => (
                <TableRow key={row.organization}>
                  <TableCell className="font-medium border-y">{row.organization}</TableCell>
                  <TableCell className="font-medium border-y">${row.amount}M</TableCell>
                  <TableCell className="font-medium border-y">{row.round}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
          <DealVolumeAnalytics />
      </div>

  );
};

export default Market;
