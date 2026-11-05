"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";

const data = [
  { year: "2020", preSeed: -5, seed: 12, seriesA: 8, seriesB: 0 },
  { year: "2021", preSeed: 8, seed: 15, seriesA: 2, seriesB: 13 },
  { year: "2022", preSeed: 0, seed: -5, seriesA: -15, seriesB: 12 },
  { year: "2023", preSeed: -8, seed: -18, seriesA: -10, seriesB: -2 },
  { year: "2024", preSeed: 8, seed: -8, seriesA: -5, seriesB: 2 },
];

export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 640,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      handleResize();
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return windowSize;
};

export default function ValuationsChart() {
  const { width } = useWindowSize();
  const gapSize = width < 640 ? '8px' : '16px';

  return (
    <div className="w-full bg-white p-4 sm:p-6 rounded-lg">
      <div className="flex justify-between items-center overflow-x-auto gap-4 xl:gap-0">
        <DropdownMenu>
          <DropdownMenuTrigger className="font-bold flex items-center gap-2 text-lg md:text-xl shrink-0 ">
            Post-Money Valuations <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="align-start">
          <DropdownMenuItem>Deal Value vs Deal Count</DropdownMenuItem>
            <DropdownMenuItem>Total Investment</DropdownMenuItem>
            <DropdownMenuItem>Post-Money Valuation</DropdownMenuItem>
            <DropdownMenuItem>Pre-Money Valuation</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="text-xs md:text-sm shrink-0 font-light flex items-center gap-2 bg-[#EFF4FF] px-3 py-2 sm:py-1 rounded-2xl">All Rounds <ChevronDown size={16}/></DropdownMenuTrigger>
            <DropdownMenuContent>
            <DropdownMenuItem>Pre-Seed</DropdownMenuItem>
              <DropdownMenuItem>Seed</DropdownMenuItem>
              <DropdownMenuItem>Series A</DropdownMenuItem>
              <DropdownMenuItem>Series B</DropdownMenuItem>
              <DropdownMenuItem>Series C</DropdownMenuItem>
              <DropdownMenuItem>Series D</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className="text-xs md:text-sm shrink-0 font-light flex items-center gap-2 bg-[#EFF4FF] px-3 py-2 sm:py-1 rounded-2xl">All Verticals <ChevronDown size={16}/></DropdownMenuTrigger>
            <DropdownMenuContent>
            <DropdownMenuItem>Consumer</DropdownMenuItem>
              <DropdownMenuItem>Food & Beverage</DropdownMenuItem>
              <DropdownMenuItem>Healthcare</DropdownMenuItem>
              <DropdownMenuItem>Real Estate</DropdownMenuItem>
              <DropdownMenuItem>Technology</DropdownMenuItem>
              <DropdownMenuItem>Web 3</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className="text-xs md:text-sm shrink-0 font-light flex items-center gap-2 bg-[#EFF4FF] px-3 py-2 sm:py-1 rounded-2xl">5 Years <ChevronDown size={16}/></DropdownMenuTrigger>
            <DropdownMenuContent>
            <DropdownMenuItem>1 M</DropdownMenuItem>
              <DropdownMenuItem>3 M</DropdownMenuItem>
              <DropdownMenuItem>6 M</DropdownMenuItem>
              <DropdownMenuItem>1 Y</DropdownMenuItem>
              <DropdownMenuItem>2 Y</DropdownMenuItem>
              <DropdownMenuItem>5 Y</DropdownMenuItem>
              <DropdownMenuItem>10 Y</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="h-[300px] md:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 48, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D9DBDD" vertical={false} />
            <XAxis dataKey="year" axisLine={false} tickLine={false} dy={10} className="text-xs md:text-sm" />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
              dx={-10}
              className="text-xs md:text-sm"
            />
            <Line
              type="monotone"
              dataKey="preSeed"
              stroke="#00BFB3"
              strokeWidth={2}
              dot={false}
              name="Pre-Seed"
            />
            <Line
              type="monotone"
              dataKey="seed"
              stroke="#0EA5E9"
              strokeWidth={2}
              dot={false}
              name="Seed"
            />
            <Line
              type="monotone"
              dataKey="seriesA"
              stroke="#A855F7"
              strokeWidth={2}
              dot={false}
              name="Series A"
            />
            <Line
              type="monotone"
              dataKey="seriesB"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={false}
              name="Series B"
            />
        <Legend 
              verticalAlign="top" 
              height={36}
              iconType="circle"
              wrapperStyle={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: gapSize
              }}
              formatter={(value) => (
                <span className="text-black text-[10px] sm:text-xs md:text-sm font-medium whitespace-nowrap">
                  {value}
                </span>
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
