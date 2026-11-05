"use client";
import {
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowUpIcon, ChevronDownIcon } from "@radix-ui/react-icons";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const cashBalanceData = [
  { name: "Mar", value: 1800000 },
  { name: "Apr", value: 1900000 },
  { name: "May", value: 1600000 },
  { name: "Jun", value: 1700000 },
  { name: "Jul", value: 1500000 },
  { name: "Aug", value: 1689362 },
];

const revenueData = [
  { name: "Mar", value: 60000 },
  { name: "Apr", value: 65000 },
  { name: "May", value: 70000 },
  { name: "Jun", value: 75000 },
  { name: "Jul", value: 65000 },
  { name: "Aug", value: 90000 },
];

const runwayData = [
  { name: "Sep '24", value: 1600000 },
  { name: "Nov '24", value: 1500000 },
  { name: "Jan '25", value: 1300000 },
  { name: "Mar '25", value: 1100000 },
  { name: "May '25", value: 800000 },
  { name: "Jul '25", value: 700000 },
  { name: "Sep '25", value: 600000 },
];

const mrrData = [
  { name: "Mar", value: 30000 },
  { name: "Apr", value: 33000 },
  { name: "May", value: 35000 },
  { name: "Jun", value: 37000 },
  { name: "Jul", value: 35000 },
  { name: "Aug", value: 41567 },
];

interface MetricCardProps {
  title: string;
  value: string | number;
  percentageChange: number;
  timeRange?: string;
  className?: string;
}

const MetricCard = ({ title, value, percentageChange, timeRange, className }: MetricCardProps) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange || "YTD");
  const formattedValue =
    typeof value === "string" ? value : new Intl.NumberFormat("en-US").format(value);

  return (
    <Card className={cn("w-full shadow-none", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <h3 className="text-base font-bold uppercase">{title}</h3>
        <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
          <SelectTrigger className="h-8 w-[80px] rounded-full border-0 bg-[#F4F3FF] text-sm font-medium ring-offset-0 focus:ring-0 focus-visible:ring-0">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent className="border-none bg-[#F4F3FF]">
            <SelectItem value="YTD">YTD</SelectItem>
            <SelectItem value="6 YTD">6 YTD</SelectItem>
            <SelectItem value="Today">Today</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl md:text-3xl font-bold">{formattedValue}</div>
          <div className="flex items-center gap-1">
            <ArrowUpIcon className="h-3 w-3 md:h-4 md:w-4 text-[#3064F6]" />
            <span className="text-[#3064F6] text-xs md:text-sm font-medium">
              {Math.abs(percentageChange)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ChartCardProps {
  title: string;
  value: string | number;
  percentageChange: number;
  timeRange: string;
  chartData: Array<{ name: string; value: number }>;
  variant: "area" | "bar";
  subtitle?: string;
  color?: string;
  className?: string;
}

const ChartCard = ({
  title,
  value,
  percentageChange,
  timeRange,
  chartData,
  variant,
  subtitle,
  color = "#3064F6",
  className,
}: ChartCardProps) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const formattedValue =
    typeof value === "string" ? value : new Intl.NumberFormat("en-US").format(value);

  // Format for y-axis labels
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <Card className={cn("w-full shadow-none", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
          <SelectTrigger className="h-8 w-[110px] rounded-full border-0 bg-[#F4F3FF] text-sm font-medium ring-offset-0 focus:ring-0 focus-visible:ring-0">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent className="border-none bg-[#F4F3FF]">
            <SelectItem value="6 Months">6 Months</SelectItem>
            <SelectItem value="Today">Today</SelectItem>
            <SelectItem value="YTD">YTD</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline gap-2 mb-4">
          <div className="text-2xl md:text-3xl font-bold">{formattedValue}</div>
          <div className="flex items-center gap-1">
            <ArrowUpIcon className="h-3 w-3 md:h-4 md:w-4 text-[#3064F6]" />
            <span className="text-[#3064F6] text-xs md:text-sm font-medium">
              {Math.abs(percentageChange)}%
            </span>
          </div>
        </div>
        <div className="h-[150px] sm:h-[180px] md:h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {variant === "area" ? (
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id={`colorGradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis
                  tickFormatter={formatYAxis}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `$${new Intl.NumberFormat("en-US").format(value)}`,
                    title,
                  ]}
                  contentStyle={{
                    borderRadius: "4px",
                    border: "none",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  fillOpacity={1}
                  fill={`url(#colorGradient-${title})`}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis
                  tickFormatter={formatYAxis}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `$${new Intl.NumberFormat("en-US").format(value)}`,
                    title,
                  ]}
                  contentStyle={{
                    borderRadius: "4px",
                    border: "none",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                />
                <defs>
                  <linearGradient id={`barGradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={`url(#barGradient-${title})`} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

const PortfolioDetailsPage = () => {
  // State to track active tab for changing title
  const [activeTab, setActiveTab] = useState("financial");

  // Add state for selected company (simulating selection)
  const [selectedCompany] = useState({
    id: 1,
    name: "Entrecore",
    logoFile: "e-icon.svg",
  });

  // Function to handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between mb-4 mt-6">
        <Link href="/portfolio" className="flex items-center hover:text-primary">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2"
          >
            <path
              d="M15.8332 10H4.1665"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9.99984 15.8334L4.1665 10.0001L9.99984 4.16675"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-medium">Portfolio</span>
        </Link>

        <div className="flex gap-2 mt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-white hover:bg-gray-50 text-black border border-gray-100 shadow-sm rounded-md px-2 py-1.5 h-10 w-[120px] sm:w-[140px] mt-2">
                <div className="flex items-center justify-between w-full">
                  {selectedCompany ? (
                    <>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded bg-white border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">
                        <img
                          src={`/svgs/${selectedCompany.logoFile}`}
                          alt={selectedCompany.name}
                          className="object-contain"
                          width={24}
                          height={24}
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-medium flex-grow text-left mx-1 sm:mx-2 truncate">
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
            <DropdownMenuContent className="w-60 sm:w-72 p-2">
              <div className="p-2 text-xs font-medium text-gray-500 border-b border-gray-100 mb-1">
                {selectedCompany ? "Change company" : "Select a company"}
              </div>
              <DropdownMenuItem className="py-2.5 px-2 cursor-pointer hover:bg-gray-50 rounded-md focus:bg-gray-50">
                <div className="flex items-center gap-2 sm:gap-3 w-full">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md bg-white border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">
                    <img
                      src="/svgs/e-icon.svg"
                      alt="Entrecore"
                      className="object-contain"
                      width={32}
                      height={32}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Entrecore</span>
                    <span className="text-xs text-blue-600">Currently selected</span>
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col space-y-4 w-full">
        <div className="rounded-xl overflow-hidden w-full">
          <div className="relative">
            <img
              src="/svgs/entrecore-banner.svg"
              alt="Entrecore Banner"
              className="w-full h-auto"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-end transform translate-y-[-60px] sm:translate-y-[-80px] md:translate-y-[-100px]">
          <div className="bg-[#001650] w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] md:w-[200px] md:h-[200px] rounded-full flex items-center justify-center overflow-hidden border-2 border-white">
            <img
              src="/svgs/e-icon.svg"
              alt="Entrecore Logo"
              className="w-16 h-16 sm:w-24 sm:h-24 md:w-30 md:h-30"
            />
          </div>
          <div className="mt-2 sm:ml-4 md:ml-6 sm:mb-4 text-center sm:text-left transform sm:translate-y-[-10px]">
            <h1 className="text-black text-3xl sm:text-4xl md:text-5xl font-extrabold">
              Entrecore
            </h1>
          </div>
        </div>

        <div className="w-full mt-[-40px] sm:mt-[-60px] md:mt-[-80px]">
          <Tabs defaultValue="financial" className="w-full" onValueChange={handleTabChange}>
            <div className="border-b border-gray-200 overflow-x-auto">
              <TabsList className="bg-transparent h-auto border-0 shadow-none w-full justify-start px-2">
                <TabsTrigger
                  value="financial"
                  className="px-3 sm:px-4 md:px-6 text-[14px] md:text-[16px] cursor-pointer py-2 md:py-3 rounded-none border-0 data-[state=active]:border-b-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
                >
                  Financial
                </TabsTrigger>
                <TabsTrigger
                  value="product"
                  className="px-3 sm:px-4 md:px-6 text-[14px] md:text-[16px] cursor-pointer py-2 md:py-3 rounded-none border-0 data-[state=active]:border-b-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
                >
                  Product
                </TabsTrigger>
                <TabsTrigger
                  value="marketing"
                  className="px-3 sm:px-4 md:px-6 text-[14px] md:text-[16px] cursor-pointer py-2 md:py-3 rounded-none border-0 data-[state=active]:border-b-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
                >
                  Marketing
                </TabsTrigger>
                <TabsTrigger
                  value="sales"
                  className="px-3 sm:px-4 md:px-6 text-[14px] md:text-[16px] cursor-pointer py-2 md:py-3 rounded-none border-0 data-[state=active]:border-b-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
                >
                  Sales
                </TabsTrigger>
                <TabsTrigger
                  value="team"
                  className="px-3 sm:px-4 md:px-6 text-[14px] md:text-[16px] cursor-pointer py-2 md:py-3 rounded-none border-0 data-[state=active]:border-b-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
                >
                  Team
                </TabsTrigger>
                <TabsTrigger
                  value="company"
                  className="px-3 sm:px-4 md:px-6 text-[14px] md:text-[16px] cursor-pointer py-2 md:py-3 rounded-none border-0 data-[state=active]:border-b-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
                >
                  Company
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="pt-8 px-2 sm:px-4">
              <h2 className="text-xl sm:text-2xl font-bold mb-6 md:mb-8">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>

              <TabsContent value="financial" className="mt-0 p-0">
                <div className="grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-2 md:grid-cols-3">
                  <MetricCard title="CAC" value="$28.23" percentageChange={82.6} timeRange="YTD" />
                  <MetricCard title="LTV" value="$46.74" percentageChange={42.1} timeRange="YTD" />
                  <MetricCard
                    title="LTV:CAC"
                    value="1.65"
                    percentageChange={86.7}
                    timeRange="6 YTD"
                    className="sm:col-span-2 md:col-span-1"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:gap-8 mt-6 sm:mt-8 md:grid-cols-2">
                  <ChartCard
                    title="Total Cash Balance"
                    value="$1,689,362"
                    percentageChange={4.6}
                    chartData={cashBalanceData}
                    variant="area"
                    timeRange="6 Months"
                    color="#3b82f6"
                  />
                  <ChartCard
                    title="Revenue"
                    value="$356,250"
                    percentageChange={12.7}
                    chartData={revenueData}
                    variant="bar"
                    timeRange="6 Months"
                    color="#10b981"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:gap-8 mt-6 sm:mt-8 md:grid-cols-2">
                  <ChartCard
                    title="Projected Runway"
                    value="14.6 months"
                    percentageChange={4.6}
                    chartData={runwayData}
                    variant="area"
                    timeRange="Today"
                    color="#f59e0b"
                  />
                  <ChartCard
                    title="MRR"
                    value="$41,567"
                    percentageChange={21.6}
                    chartData={mrrData}
                    variant="bar"
                    timeRange="6 Months"
                    color="#8b5cf6"
                  />
                </div>
              </TabsContent>

              <TabsContent value="product" className="mt-0 p-0">
                <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-center">
                  <p className="text-muted-foreground">
                    Product metrics and data will be displayed here
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="marketing" className="mt-0 p-0">
                <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-center">
                  <p className="text-muted-foreground">
                    Marketing metrics and data will be displayed here
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="sales" className="mt-0 p-0">
                <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-center">
                  <p className="text-muted-foreground">
                    Sales metrics and data will be displayed here
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="team" className="mt-0 p-0">
                <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-center">
                  <p className="text-muted-foreground">Team information will be displayed here</p>
                </div>
              </TabsContent>

              <TabsContent value="company" className="mt-0 p-0">
                <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-center">
                  <p className="text-muted-foreground">
                    Company information will be displayed here
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PortfolioDetailsPage;
