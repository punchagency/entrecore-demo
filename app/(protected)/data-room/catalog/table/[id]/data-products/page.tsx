"use client";

import { useParams } from "next/navigation";
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useColumnDataStore } from "@/app/store/columnDataStore";
import { useUserStore } from "@/app/store/userStore";
import { Axios } from "@/app/config/axios";

export default function TableDetailsPage() {
  const params = useParams();
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const [showAllDataset, setShowAllDataset] = useState<boolean>(false);
  const { selectedColumnData, tableColumns } = useColumnDataStore();
  const { user } = useUserStore();
  const selectedColumnRef = useRef<HTMLTableCellElement>(null);
  const [chatSuggestions, setChatSuggestions] = useState<any[]>([]);

  useEffect(() => {
    setSavedCompanyId(localStorage.getItem("selectedCompanyId") || user?.active_company || null);
  }, []);

  // Call observe endpoint when data sets page first loads for this table/company

  const isColumnsLoading = false; // Now shared from layout via store

  const { data: tableValues, isLoading: isValuesLoading } = useQuery({
    queryKey: ["table-column-values", params?.id, tableColumns],
    queryFn: async () => {
      if (!tableColumns || tableColumns.length === 0) return [];
      const columnIds = tableColumns.map((col: any) => col.column_id || col.id);
      const response = await Axios.post(`/data/metadata/column-values/bulk`, {
        company_id: savedCompanyId,
        column_ids: columnIds,
      });
      return response.data;
    },
    enabled: !!params?.id && !!savedCompanyId && !!tableColumns,
  });

  const isLoading = isColumnsLoading || isValuesLoading;

  useEffect(() => {
    if (selectedColumnData?.column_name && selectedColumnRef.current) {
      selectedColumnRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedColumnData?.column_name]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-12">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-40 bg-gray-200 rounded animate-pulse"></div>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <div className="animate-pulse">
              <div className="bg-gray-50 p-4">
                <div className="flex space-x-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-6 bg-gray-200 rounded w-24"></div>
                  ))}
                </div>
              </div>
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex space-x-4">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-4 bg-gray-200 rounded w-24"></div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tableColumns || !Array.isArray(tableColumns) || tableColumns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-gray-50 rounded-lg p-8">
            <div className="h-16 w-16 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0a2 2 0 01-2 2H10a2 2 0 01-2-2v0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">No Data Products Available</h3>
            <p className="text-gray-600 leading-relaxed">
              This table doesn't have any data available to display.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              The table might be empty or data hasn't been crawled yet.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const columns = tableColumns.map((col: any) => col.column_name);

  // Reconstruct rows from column values
  const allRows: Record<string, any>[] = [];
  if (tableValues && Array.isArray(tableValues)) {
    const rowMap = new Map<string, Record<string, any>>();

    tableValues.forEach((colResponse: any) => {
      const colName = colResponse.column_name;
      if (colResponse.column_data && Array.isArray(colResponse.column_data)) {
        colResponse.column_data.forEach((data: any) => {
          const rowId = data.row_id || `row-${data.id}`;
          if (!rowMap.has(rowId)) {
            rowMap.set(rowId, {});
          }
          rowMap.get(rowId)![colName] = data.value;
        });
      }
    });

    allRows.push(...Array.from(rowMap.values()));
  }

  const sampleRows = allRows.slice(0, 10);
  const completeRows = allRows;

  return (
    <div className="space-y-4 ">
      <div className="flex justify-between items-center mb-12">
        <h2 className="text-xl font-bold">Sample Data Products</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAllDataset(!showAllDataset)}
          className="text-sm px-6 py-3"
        >
          {showAllDataset ? "Show sample data products" : "Show complete data products"}
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                {columns.map((column: string) => (
                  <TableHead
                    key={column}
                    ref={column === selectedColumnData?.column_name ? selectedColumnRef : null}
                    className={`px-4 py-3 text-left font-medium whitespace-nowrap border ${column === selectedColumnData?.column_name ? "bg-primary text-white" : ""}`}
                  >
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!showAllDataset
                ? sampleRows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {columns.map((column: string) => (
                        <TableCell
                          key={`${rowIndex}-${column}`}
                          className={`px-4 py-3 whitespace-nowrap border ${column === selectedColumnData?.column_name ? "bg-primary/10" : ""}`}
                        >
                          {row[column]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : completeRows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {columns.map((column: string) => (
                        <TableCell
                          key={`${rowIndex}-${column}`}
                          className={`px-4 py-3 whitespace-nowrap border ${column === selectedColumnData?.column_name ? "bg-primary/10" : ""}`}
                        >
                          {row[column]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="text-sm text-center text-gray-500">
        {showAllDataset ? "Complete data products" : "Sample data products with Unique Values"}
      </div>
    </div>
  );
}
