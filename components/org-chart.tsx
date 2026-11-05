"use client";
import { Employee } from "@/types/employee";
import { EmployeeCard } from "@/components/employee-card";

interface OrgChartProps {
  data: Employee;
}

export function OrgChart({ data }: OrgChartProps) {
  const renderEmployee = (employee: Employee, level: number = 0) => {
    return (
      <div key={employee.id} className="flex flex-col items-center gap-4">
        <EmployeeCard name={employee.name} title={employee.title} />
        {employee.directReports && employee.directReports.length > 0 && (
          <>
            <div className="w-px h-8 bg-gray-300" /> {/* Vertical line */}
            <div className="flex gap-8">
              {employee.directReports.map((report) => renderEmployee(report, level + 1))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 bg-[#EFF4FF] min-h-screen">
      {renderEmployee(data)}
    </div>
  );
}