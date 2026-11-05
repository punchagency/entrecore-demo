import { cn } from "@/lib/utils";

interface PlaceholderImageProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  type?: "profile" | "cover";
}

const PlaceholderImage = ({
  name,
  className,
  size = "md",
  type = "profile",
}: PlaceholderImageProps) => {
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const profileSizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-base",
    lg: "w-16 h-16 text-xl",
  };

  const coverSizes = {
    sm: "w-full min-h-24",
    md: "w-full min-h-32",
    lg: "w-full min-h-40",
  };

  const circleSizes = {
    sm: "w-12 h-12 text-base",
    md: "w-16 h-16 text-xl",
    lg: "w-20 h-20 text-2xl",
  };

  const initials = getInitials(name);

  if (type === "profile") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black tracking-tight select-none flex-shrink-0 shadow-[0_4px_12px_rgba(37,99,235,0.2)]",
          profileSizes[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center bg-gray-400 rounded-sm h-full",
        !className?.includes('h-') && coverSizes[size],
        className
      )}
    >
      <div
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 font-semibold select-none shadow",
          circleSizes[size]
        )}
      >
        {initials}
      </div>
    </div>
  );
};

export default PlaceholderImage; 