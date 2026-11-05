import Link from "next/link";
import Image from "next/image";
import "react-circular-progressbar/dist/styles.css";
import { AppWindow, CirclePlus, SquareArrowOutUpRight } from "lucide-react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";

interface App {
  logo?: string;
  name?: string;
  domain?: string;
}

const SearchResultApp = ({ app }: { app: App }) => {
  const gradientId = "blueGradient";
  const shadowId = "circleShadow";

  return (
    <div className="flex flex-col gap-4 bg-white rounded-lg p-4 shadow-sm h-full w-full">
    {/* Header Section */}
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-12 h-12 border border-gray-200 rounded-sm p-2 flex items-center justify-center">
        {app?.logo && (
          <Image 
            src={app?.logo} 
            alt={app?.name || ""} 
            width={32} 
            height={32} 
            className="w-full h-full object-contain"
          />
        )}
      </div>
      <div className="flex flex-col">
        <h3 className="text-lg font-bold text-gray-900">{app?.name}</h3>
        <p className="text-sm text-gray-500">{app?.domain}</p>
      </div>
    </div>

    {/* Score Section */}
    <div className="w-28 mx-auto">
      <svg style={{ height: 0, width: 0, position: "absolute" }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#35B2FF" />
            <stop offset="100%" stopColor="#0F5EC2" />
          </linearGradient>
        </defs>
      </svg>

      <CircularProgressbar
        value={90}
        text={`${90}%`}
        className="drop-shadow-sm"
        styles={buildStyles({
          pathColor: `url(#${gradientId})`,
          textColor: "#1F2937",
          trailColor: "#E5E7EB",
          textSize: "20px",
          pathTransitionDuration: 0.5,
          strokeLinecap: "round",
        })}
      />
      <p className="text-xs font-medium text-gray-600 text-center mt-3">
        RELEVANCY SCORE
      </p>
    </div>

    {/* Action Buttons */}
    <div className="flex flex-col gap-2">
      <Link
        href={`https://${app?.domain}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between w-full px-4 py-2.5 bg-[#EFF4FF] hover:bg-[#E0E9FF] rounded-lg transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900">Go to Site</span>
        <AppWindow className="w-4 h-4 text-gray-900" strokeWidth={2} />
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="#"
          className="flex items-center justify-between px-4 py-2.5 bg-[#EFF4FF] hover:bg-[#E0E9FF] rounded-lg transition-colors"
        >
          <span className="text-sm font-semibold text-gray-900">Add</span>
          <CirclePlus className="w-4 h-4 text-gray-900" strokeWidth={2} />
        </Link>

        <Link
          href="#"
          className="flex items-center justify-between px-4 py-2.5 bg-[#EFF4FF] hover:bg-[#E0E9FF] rounded-lg transition-colors"
        >
          <span className="text-sm font-semibold text-gray-900">Sign Up</span>
          <SquareArrowOutUpRight className="w-4 h-4 text-gray-900" strokeWidth={2} />
        </Link>
      </div>
    </div>
  </div>
  );
};

export default SearchResultApp;
