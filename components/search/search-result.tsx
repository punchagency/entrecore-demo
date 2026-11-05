import { useState } from "react";
import SearchResultApp from "./search-result-app";
import SearchResultType from "./search-result-type";
import { ChevronLeft, ChevronRight } from "lucide-react";

const apps = [
  {
    name: "Forecastr",
    domain: "forecastr.co",
    logo: "/svgs/forecastr-app-icon.svg",
  },
  {
    name: "LivePlan",
    domain: "liveplan.com",
    logo: "/svgs/liveplan-app-icon.svg",
  },
  {
    name: "NetSuite",
    domain: "netsuite.com",
    logo: "/svgs/netsuite-app-icon.svg",
  },
  // Duplicate apps for demonstration
  {
    name: "Forecastr",
    domain: "forecastr.co",
    logo: "/svgs/forecastr-app-icon.svg",
  },
  {
    name: "LivePlan",
    domain: "liveplan.com",
    logo: "/svgs/liveplan-app-icon.svg",
  },
  {
    name: "NetSuite",
    domain: "netsuite.com",
    logo: "/svgs/netsuite-app-icon.svg",
  },
];

const SearchResult = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerSlide = 3;
  const totalSlides = Math.ceil(apps.length / itemsPerSlide);

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < totalSlides - 1 ? prevIndex + 1 : prevIndex));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="w-full max-w-6xl sm:mx-auto xl:mx-0">
    <div className="flex flex-col xl:flex-row gap-6 lg:gap-16">
      {/* Company Profile */}
      <div className="w-full xl:w-72 flex flex-col justify-between gap-6">
        <SearchResultType />
        <div className="flex justify-between items-center gap-4">
          <button 
            className="bg-white rounded-full p-2 shadow-md disabled:opacity-50 hover:bg-gray-50 cursor-pointer"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          
          {/* Dots indicator */}
          <div className="flex gap-2">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentIndex ? "bg-blue-600" : "bg-gray-300"
                }`}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
          
          <button 
            className="bg-white rounded-full p-2 shadow-md disabled:opacity-50 hover:bg-gray-50 cursor-pointer"
            onClick={handleNext}
            disabled={currentIndex === totalSlides - 1}
          >
            <ChevronRight className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Carousel */}
   {/* Carousel */}
   <div className="flex-1 overflow-hidden">
          <div 
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {Array.from({ length: totalSlides }).map((_, slideIndex) => (
              <div key={slideIndex} className="w-full flex-none">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {apps
                    .slice(slideIndex * itemsPerSlide, (slideIndex + 1) * itemsPerSlide)
                    .map((app, appIndex) => (
                      <SearchResultApp 
                        key={`${slideIndex}-${appIndex}`} 
                        app={app} 
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
    </div>
  </div>
  );
};

export default SearchResult;
