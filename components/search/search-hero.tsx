"use client";
import Image from "next/image";
import { useState } from "react";
import { Search } from "lucide-react";

import { Input } from "../ui/input";
import { useSearch } from "@/contexts/search-context";

const SearchHero = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { performSearch } = useSearch();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };
  
  return (
    <div className="relative w-full">
      {/* Background SVGs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <Image 
          src="/svgs/darkblue-diagonal.svg" 
          alt=""
          width={475}
          height={107}
          className="absolute -top-1 -left-1 w-[200px] sm:w-[300px] md:w-[400px] lg:w-[475px] h-auto object-contain opacity-90"
          priority
        />
        <Image 
          src="/svgs/lightblue-diagonal.svg" 
          alt=""
          width={475}
          height={87}
          className="absolute -bottom-1 -right-1 w-[200px] sm:w-[300px] md:w-[400px] lg:w-[475px] h-auto object-contain opacity-90"
          priority
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-12 md:py-16 lg:py-20">
        <h1 className="text-center text-xl md:text-2xl  font-bold mb-8 md:mb-10 px-4 py-2 rounded-lg ">
          Find <span className="text-[#3064F6] relative z-20">software</span> and <span className="text-[#35B2FF] relative z-20">services</span> that help<br className="hidden md:block" />
          you build your business.
        </h1>
        
        <div className="w-full max-w-xl relative">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-[#EFF4FF] rounded-full p-2 md:p-3">
                <Search className="w-4 h-4 md:w-5 md:h-5 text-[#3064F6]" />
              </div>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What can we help you find today?"
                className="w-full pl-12 md:pl-16 pr-4 py-6 md:py-7 text-base md:text-lg  
                          rounded-full border border-gray-200 shadow-lg bg-white/95
                          focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SearchHero;
