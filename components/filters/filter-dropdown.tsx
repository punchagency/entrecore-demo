import { DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { DropdownMenu } from "../ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterDropdownProps {
    label: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
  }
  
  export const FilterDropdown = ({ label, options, value, onChange, className }: FilterDropdownProps) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className={cn("text-sm font-light flex items-center gap-2 bg-[#EFF4FF] px-3 py-1 rounded-2xl", className)}>
          {label} <ChevronDown size={16}/>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {options.map(option => (
            <DropdownMenuItem key={option} onClick={() => onChange(option)}>
              {option}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };            