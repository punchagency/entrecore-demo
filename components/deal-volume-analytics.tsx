"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

const useResponsiveBarSize = () => {
  const [barSize, setBarSize] = useState(40);

  useEffect(() => {
    const updateBarSize = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 640) { // sm breakpoint
        setBarSize(25);
      } else if (typeof window !== 'undefined' && window.innerWidth < 768) { // md breakpoint
        setBarSize(30);
      } else {
        setBarSize(40);
      }
    };

    updateBarSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateBarSize);
      return () => window.removeEventListener('resize', updateBarSize);
    }
  }, []);

  return barSize;
};

const dealData = [
  { month: "Aug '23", angleSeed: 1000, earlyStage: 500, lateStage: 100 },
  { month: "Sep '23", angleSeed: 1200, earlyStage: 400, lateStage: 150 },
  { month: "Oct '23", angleSeed: 1100, earlyStage: 300, lateStage: 100 },
  { month: "Nov '23", angleSeed: 900, earlyStage: 300, lateStage: 100 },
  { month: "Dec '23", angleSeed: 800, earlyStage: 300, lateStage: 100 },
  { month: "Jan '24", angleSeed: 850, earlyStage: 300, lateStage: 150 },
];

const regionData: { name: string; coordinates: [number, number]; value: string }[] = [
  { name: "West", coordinates: [-113, 40], value: "3.2k" },
  { name: "Midwest", coordinates: [-92, 43], value: "1.1k" },
  { name: "Northeast", coordinates: [-74, 43], value: "2.4k" },
  { name: "Southeast", coordinates: [-89, 31], value: "2.2k" },
];
export default function DealVolumeAnalytics() {
  const barSize = useResponsiveBarSize();
  return (
    <div className="w-full bg-white p-6 rounded-lg">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4 gap-4 xl:gap-0 overflow-x-auto">
        <DropdownMenu>
          <DropdownMenuTrigger className="font-bold flex items-center gap-2 text-lg md:text-xl shrink-0 ">
            Deal Volume <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Deal Value vs Deal Count</DropdownMenuItem>
            <DropdownMenuItem>Total Investment</DropdownMenuItem>
            <DropdownMenuItem>Post-Money Valuation</DropdownMenuItem>
            <DropdownMenuItem>Pre-Money Valuation</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="text-xs md:text-sm shrink-0 font-light flex items-center gap-2 bg-[#EFF4FF] px-3 py-2 sm:py-1 rounded-2xl">
              All Rounds <ChevronDown size={16} />
            </DropdownMenuTrigger>
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
            <DropdownMenuTrigger className="text-xs md:text-sm shrink-0 font-light flex items-center gap-2 bg-[#EFF4FF] px-3 py-2 sm:py-1 rounded-2xl">
              All Verticals <ChevronDown size={16} />
            </DropdownMenuTrigger>
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
            <DropdownMenuTrigger className="text-xs md:text-sm shrink-0 font-light flex items-center gap-2 bg-[#EFF4FF] px-3 py-2 sm:py-1 rounded-2xl">
              US <ChevronDown size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>US</DropdownMenuItem>
              <DropdownMenuItem>Midwest</DropdownMenuItem>
              <DropdownMenuItem>Northeast</DropdownMenuItem>
              <DropdownMenuItem>South</DropdownMenuItem>
              <DropdownMenuItem>West</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className="text-xs md:text-sm shrink-0 font-light flex items-center gap-2 bg-[#EFF4FF] px-3 py-2 sm:py-1 rounded-2xl">
              Past 6 Months <ChevronDown size={16} />
            </DropdownMenuTrigger>
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
          {/* Add other dropdowns similar to your valuations chart */}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bar Chart Section */}
        <div className="border-b xl:border-b-0 xl:border-r border-gray-200 pt-3 sm:p-6">
          <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 ml-4">
            8,174 <sub className="text-sm font-medium text-soft-black">Total (Past 6 Months)</sub>
          </div>

          <div className="h-[250px] sm:h-[300px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dealData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D9DBDD" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  tickMargin={8}
                />
                <YAxis axisLine={false} tickLine={false} fontSize={12} tickMargin={8} />
                <Bar
                  dataKey="angleSeed"
                  stackId="a"
                  fill="#00BFB3"
                  name="Angel-Seed"
                  barSize={barSize}
                />
                <Bar
                  dataKey="earlyStage"
                  stackId="a"
                  fill="#A855F7"
                  name="Early Stage"
                  barSize={barSize}
                />
                <Bar
                  dataKey="lateStage"
                  stackId="a"
                  fill="#F59E0B"
                  name="Late Stage"
                  radius={[4, 4, 0, 0]}
                  barSize={barSize}
                />
                 <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              wrapperStyle={{
                marginBottom: '16px',
                paddingTop: '20px',
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: typeof window !== 'undefined' && window.innerWidth < 640 ? '8px' : '16px'
              }}
              formatter={(value) => (
                <span className="text-black text-[10px] sm:text-xs md:text-sm font-medium whitespace-nowrap">
                  {value}
                </span>
              )}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Map Section */}
        <div className="p-4 sm:p-6">
          <div className="h-[250px] sm:h-[300px] md:h-[350px]">
            <ComposableMap
              projection="geoAlbersUsa"
              projectionConfig={{
                scale: 1100,
              }}
              style={{
                width: "100%",
                height: "100%",
              }}
            >
              <Geographies geography={"/us-map.json"}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#EAEAEC"
                      stroke="#FFFFFF"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>
              {regionData.map(({ name, coordinates, value }) => (
                <Marker key={name} coordinates={coordinates}>
                  <circle
                    r={40 * Math.sqrt(parseFloat(value.replace("k", "")))}
                    fill="transparent"
                    stroke="#3064F6"
                    strokeWidth={2}
                  />
                  <text
                    textAnchor="middle"
                    y={4}
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      fill: "#3064F6",
                    }}
                  >
                    {value}
                  </text>
                </Marker>
              ))}
            </ComposableMap>
          </div>
        </div>
      </div>
    </div>
  );
}
