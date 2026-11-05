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


export default function TableDetailsPage() {
  const params = useParams();
  const term = params?.id as string;

  return (
    
      <div className="col-span-2">
          <h3 className="font-bold text-lg mb-4">Table Column Description</h3>
        <div className="mb-8 bg-white p-4 rounded-lg">
          <p className="text-gray-600">
            This is a technical description of the table. It is a description of the table that is  
            used to help the user understand the table.
          </p>
        </div>
          <h3 className="font-bold text-lg mb-4">Table Column Technical Metadata</h3>
        <div className=" bg-white p-4 rounded-lg">
          <p className="text-gray-600">
            This is a technical description of the table. It is a description of the table that is
            used to help the user understand the table.
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg mt-12">
        <Table className="w-full border">
  <TableHeader>
    <TableRow className="bg-gray-50 text-soft-black">
      <TableHead className="border p-2 w-1/2 text-center font-bold">Data Classifications</TableHead>
      <TableHead className="border p-2 w-1/2 text-center font-bold">Table Column Profile</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="border p-2 text-center">
        <div className="flex items-center justify-center">
          <span>The column is a description of the table.</span>
        </div>
      </TableCell>
      <TableCell className="border p-2 text-center">
        <div className="flex items-center justify-center">
          <span>The column is a description of the table.</span>
        </div>
      </TableCell>
    </TableRow>
    <TableRow>
      <TableCell className="border p-2 text-center">
        <div className="flex items-center justify-center">
          <span>The column is a description of the table.</span>
        </div>
      </TableCell>
      <TableCell className="border p-2 text-center">
        <div className="flex items-center justify-center">
          <span>The column is a description of the table.</span>
        </div>
      </TableCell>
    </TableRow>
    <TableRow>
      <TableCell className="border p-2 text-center">
        <div className="flex items-center justify-center">
          <span>The column is a description of the table.</span>
        </div>
      </TableCell>
      <TableCell className="border p-2 text-center">
        <div className="flex items-center justify-center">
          <span>The column is a description of the table.</span>
        </div>
      </TableCell>
    </TableRow>
    <TableRow>
      <TableCell className="border p-2 text-center">
        <div className="flex items-center justify-center">
          <span>The column is a description of the table.</span>
        </div>
      </TableCell>
      <TableCell className="border p-2 text-center">
        <div className="flex items-center justify-center">
          <span>The column is a description of the table.</span>
        </div>
      </TableCell>
    </TableRow>
    <TableRow>
      <TableCell className="border p-2 text-center">
        <div className="flex items-center justify-center">
          <span>The column is a description of the table.</span>
        </div>
      </TableCell>
      <TableCell className="border p-2 text-center">
        <div className="flex items-center justify-center">
          <span>The column is a description of the table.</span>
        </div>
      </TableCell>
    </TableRow>
  </TableBody>
  </Table>
      </div>
      </div>
  );
}
