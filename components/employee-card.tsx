"use client";
import { Card } from "@/components/ui/card";

interface EmployeeCardProps {
  name: string;
  title: string;
  className?: string;
}

export function EmployeeCard({ name, title, className }: EmployeeCardProps) {
  return (
    <Card className={`p-4 bg-white shadow-sm w-[200px] ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <h3 className="font-bold text-base text-soft-black">{name}</h3>
        <p className="text-sm text-gray-600">{title}</p>
      </div>
    </Card>
  );
}