"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, EllipsisVertical, Link, Plus, Receipt, Search } from "lucide-react";

import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Axios } from "@/app/config/axios";
import pdfIcon from "@/public/svgs/pdf-icon.svg";
import excelIcon from "@/public/svgs/xls-icon.svg";
import docIcon from "@/public/svgs/docx-icon.svg";
import DeleteStatementDialog from "@/components/delete-statement-dialog";
import { StatementFormDialog } from "@/components/statement-form-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUserStore } from "@/app/store/userStore";
import { Dialog } from "@/components/ui/dialog";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/search-input";

interface Data {
  external_company_id: string;
  statement_type: string;
  period_start: string;
  period_end: string;
  reporting_currency: string;
  id: number;
  line_items: [];
}

const Financials = () => {
  const [selectedItem, setSelectedItem] = useState<Data | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const { user } = useUserStore();
  const getFinancialStatements = async (): Promise<Data[]> => {

    if (!savedCompanyId) {
      throw new Error("User company ID not available");
    }

    const response = await Axios.get("/data/financial-statements/", {
      params: {
        skip: 0,
        limit: 100,
        company_id: savedCompanyId,
      },
    });
    return response.data;
  };

  const { data } = useQuery({
    queryKey: ["financial-statements", savedCompanyId],
    queryFn: getFinancialStatements,
    enabled: !!savedCompanyId,
  });

  useEffect(() => {
    const updateCompanyId = () => {
      const companyId = localStorage.getItem("selectedCompanyId") || user?.active_company || null;
      if (companyId !== savedCompanyId) {
        setSavedCompanyId(companyId);
      }
    };

    updateCompanyId();

    window.addEventListener("storage", updateCompanyId);
    window.addEventListener("localStorageChange", updateCompanyId);

    return () => {
      window.removeEventListener("storage", updateCompanyId);
      window.removeEventListener("localStorageChange", updateCompanyId);
    };
  }, [user?.active_company, savedCompanyId]);

  const filteredData = data?.filter((item) => {
    if (searchQuery === "") {
      return item;
    }
    return item.statement_type.toLowerCase().startsWith(searchQuery.toLowerCase());
  });

  const getFileIcon = (fileName: string) => {
    const extension = fileName?.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "pdf":
        return pdfIcon;
      case "xls":
        return excelIcon;
      case "xlsx":
        return excelIcon;
      case "doc":
        return docIcon;
      case "docx":
        return docIcon;
      default:
        return docIcon;
    }
  };


  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  return (
    <div className="flex flex-col items-start px-6 w-full">
      <div className="flex flex-col lg:flex-row justify-between items-left w-full py-4 border-b">
        <h1 className="text-base text-left sm:text-lg lg:text-xl font-bold mb-4 lg:mb-0 self-center">Financial Statements</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48 md:w-60 lg:w-72">
            <SearchInput
              value={searchQuery}
              onChange={handleSearch}
              onClear={handleClearSearch}
            />

          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-primary text-white hover:bg-primary/80 hover:text-white py-2.5 sm:py-5 w-full sm:w-auto"
                onClick={() => {
                  setOpen(true);
                  setMode("add");
                }}
              >
                <Plus className="h-3 w-3 md:w-4 lg:w-5 text-white" />
                <span className="ml-2">Add Glossary</span>
              </Button>
            </DialogTrigger>
          </Dialog>

        </div>
      </div>
      <div className="w-full mt-8">
        <Table>
          <TableHeader className="">
            <TableRow className="text-sm font-medium ">
              <TableHead className="text-[#18181880]">Statement Type</TableHead>
              <TableHead className="text-[#18181880]">Period Start</TableHead>
              <TableHead className="text-[#18181880] ">Period End</TableHead>
              <TableHead className="text-[#18181880] ">Reporting Currency </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="text-sm md:text-base lg:text-lg font-medium gap-2 md:gap-3 lg:gap-4 ">
            {filteredData?.map((item: Data) => (
              <TableRow className="bg-white table-row-with-border" key={item.id}>
                <TableCell className="font-medium first:rounded-tl-[0.321vw] py-1 pl-1 first:rounded-bl-[0.321vw] last:rounded-tr-[0.321vw] last:rounded-br-[0.321vw]">
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 rounded-[0.125vw] bg-[#EFF4FF] flex items-center justify-center p-2">
                      <Receipt className="w-5 h-5 text-primary" />
                    </div>
                    <p>{item.statement_type}</p>
                  </div>
                </TableCell>

                <TableCell>
                  {" "}
                  <Popover>
                    <PopoverTrigger>{item.period_start}</PopoverTrigger>{" "}
                    <PopoverContent className="w-[17.396vw] bg-[#192131] text-white relative before:content-[''] before:absolute before:-top-2 before:left-[50%] before:translate-x-[-50%] before:w-0 before:h-0 before:border-l-[8px] before:border-l-transparent before:border-r-[8px] before:border-r-transparent before:border-b-[8px] before:border-b-[#192131]">
                      <p>{item.period_end}</p>
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell className="last:rounded-tr-[0.321vw] last:rounded-br-[0.321vw]">
                  <div className="flex items-center justify-between gap-2">
                    {item?.period_end}
                  </div>
                </TableCell>
                <TableCell className="last:rounded-tr-[0.321vw] last:rounded-br-[0.321vw]">
                  <div className="flex items-center justify-between gap-2">
                    {item?.reporting_currency}
                  </div>
                </TableCell>
                <TableCell className="last:rounded-tr-[0.321vw] last:rounded-br-[0.321vw]">
                  <div className="flex items-center justify-end gap-2">
                    <DropdownMenu>
                      {" "}
                      <DropdownMenuTrigger>
                        <EllipsisVertical size={24} color="black" className="cursor-pointer" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="mr-12 font-bold ">
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            setSelectedItem(item);
                            setOpen(true);
                            setMode("edit");
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        {/* <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                          }}
                        >
                          Download
                        </DropdownMenuItem> */}
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            setSelectedItem(item);
                            setDeleteOpen(true);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>


                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <hr className="w-full border-gray-200 my-[1.25vw]" />
      </div>

      <StatementFormDialog
        open={open}
        onOpenChange={setOpen}
        mode={mode as "add" | "edit"}
        initialData={selectedItem}
      />
      {selectedItem && (
        <DeleteStatementDialog
          deleteOpen={deleteOpen}
          setDeleteOpen={setDeleteOpen}
          selectedItem={{
            id: selectedItem.id,
            statement_type: selectedItem.statement_type,
            period_end: selectedItem.period_end,
          }}
          getFileIcon={getFileIcon}
        />
      )}
    </div>
  );
};

export default Financials;
