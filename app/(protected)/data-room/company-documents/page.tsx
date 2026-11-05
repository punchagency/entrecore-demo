"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import Image from "next/image";
import pdfIcon from "@/public/svgs/pdf-icon.svg";
import excelIcon from "@/public/svgs/xls-icon.svg";
import docIcon from "@/public/svgs/docx-icon.svg";
import { EllipsisVertical, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { FileFormDialog } from "@/components/file-form-dialog";
import DeleteFileDialog from "@/components/delete-file-dialog";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";

import Link from "next/link";
import { downloadFile } from "@/utils/s3-utils";
import DocumentViewToggle from "@/components/document-view-toggle";
// Lazy load the heavy DocumentPreviewCard component
const DocumentPreviewCard = dynamic(() => import("@/components/document-preview-card"), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-8 bg-gray-200 m-2 rounded"></div>
      <div className="h-32 bg-gray-200 m-2 rounded"></div>
      <div className="space-y-2 m-2">
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    </div>
  ),
});

import { Axios } from "@/app/config/axios";
import { useUserStore } from "@/app/store/userStore";

interface Data {
  external_company_id?: string;
  document_name: string;
  document_url: string;
  document_description: string;
  document_category: string;
  document_date?: string;
  document_version?: string;
  document_metadata?: string;
  id?: number;
  created_at?: string;
  updated_at?: string;
}

const CompanyDocuments = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("documentViewMode");
      return savedView === "grid" || savedView === "list" ? savedView : "list";
    }
    return "list";
  });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Data | null>(null);
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const { user } = useUserStore();
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

  const { data } = useQuery({
    queryKey: ["company-documents", savedCompanyId],
    queryFn: async () => {
      const response = await Axios.get(`/data/company-documents/`, {
        params: {
          skip: 0,
          limit: 100,
          company_id: savedCompanyId,
        },
      });
      return response.data;
    },
    enabled: !!savedCompanyId,
  });


  const filteredData = data?.items?.filter((item: Data) => {
    if (searchQuery) {
      return item.document_name.toLowerCase().startsWith(searchQuery.toLowerCase());
    }
    return item;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="flex flex-col items-start px-4 md:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 sm:gap-6 py-4 sm:py-6">
        <div className="flex items-center gap-4 justify-between w-full">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold">Added Documents</h3>
          <DocumentViewToggle onViewChange={setViewMode} />
        </div>

        <div className="relative w-full sm:w-48 md:w-60 lg:w-72">
          <Search
            color="#000000"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none w-4 md:w-5"
          />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            className="w-full rounded-full pl-8 md:pl-10 pr-2 md:pr-3 lg:pr-4"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      {viewMode === "list" ? (
        <Table>
          <TableHeader className="">
            <TableRow className="text-sm  font-medium ">
              <TableHead className=" text-[#18181880]">File Name</TableHead>
              <TableHead className=" text-[#18181880]">Description</TableHead>
              <TableHead className="text-[#18181880] ">Added On</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="text-sm md:text-base lg:text-lg font-medium gap-2 md:gap-3 lg:gap-4 ">
            {filteredData?.map((item: Data) => (
              <TableRow className="bg-white table-row-with-border" key={item.id}>
                <TableCell className="font-medium first:rounded-tl-[0.321vw] py-1 pl-1 first:rounded-bl-[0.321vw] last:rounded-tr-[0.321vw] last:rounded-br-[0.321vw]">
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 rounded-[0.125vw] bg-[#EFF4FF] flex items-center justify-center p-2">
                      <Image
                        src={getFileIcon(item.document_url)}
                        alt="file icon"
                        width={20}
                        height={20}
                      />
                    </div>
                    <Link
                      href={item.document_url}
                      target="_blank"
                      className="truncate hover:text-primary transition-colors"
                      title={item.document_name}
                    >
                      {item.document_name}
                    </Link>
                  </div>
                </TableCell>

                <TableCell>
                  {" "}
                  <Popover>
                    <PopoverTrigger>{item.document_description}</PopoverTrigger>{" "}
                    <PopoverContent className="w-[17.396vw] bg-[#192131] text-white relative before:content-[''] before:absolute before:-top-2 before:left-[50%] before:translate-x-[-50%] before:w-0 before:h-0 before:border-l-[8px] before:border-l-transparent before:border-r-[8px] before:border-r-transparent before:border-b-[8px] before:border-b-[#192131]">
                      <p>{item.document_description}</p>
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell className="last:rounded-tr-[0.321vw] last:rounded-br-[0.321vw]">
                  <div className="flex items-center justify-between gap-2">
                    {formatDate(item?.created_at || "")}
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
                            setEditOpen(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <FileFormDialog
                          open={editOpen}
                          onOpenChange={setEditOpen}
                          mode="edit"
                          initialData={
                            selectedItem
                              ? {
                                id: selectedItem.id?.toString(),
                                name: selectedItem.document_name,
                                category: selectedItem.document_category,
                                description: selectedItem.document_description,
                                fileUrl: selectedItem.document_url,
                                external_company_id: selectedItem.external_company_id,
                              }
                              : undefined
                          }
                        />
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            if (item.document_url) {
                              downloadFile(item.document_url, item.document_name);
                            }
                          }}
                        >
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            setSelectedItem(item);
                            setDeleteOpen(true);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                        <DeleteFileDialog
                          deleteOpen={deleteOpen}
                          setDeleteOpen={setDeleteOpen}
                          selectedItem={selectedItem || null}
                          getFileIcon={getFileIcon}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        // Grid view with document preview cards
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 w-full">
          {filteredData?.map((item: Data) => (
            <DocumentPreviewCard
              key={item.id}
              document={{
                id: item.id || 0,
                document_name: item.document_name,
                document_url: item.document_url,
                created_at: item.created_at || new Date().toISOString(),
              }}
              onEdit={() => {
                setSelectedItem(item);
                setEditOpen(true);
              }}
              onDelete={() => {
                setSelectedItem(item);
                setDeleteOpen(true);
              }}
              onDownload={() => {
                if (item.document_url) {
                  downloadFile(item.document_url, item.document_name);
                }
              }}
            />
          ))}
        </div>
      )}

      <FileFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialData={
          selectedItem
            ? {
              id: selectedItem.id?.toString(),
              name: selectedItem.document_name,
              category: selectedItem.document_category,
              description: selectedItem.document_description,
              fileUrl: selectedItem.document_url,
              external_company_id: selectedItem.external_company_id,
            }
            : undefined
        }
      />

      <DeleteFileDialog
        deleteOpen={deleteOpen}
        setDeleteOpen={setDeleteOpen}
        selectedItem={selectedItem || null}
        getFileIcon={getFileIcon}
      />

      <hr className="w-full border-gray-200 my-[2.25vw]" />
    </div>
  );
};

export default CompanyDocuments;
