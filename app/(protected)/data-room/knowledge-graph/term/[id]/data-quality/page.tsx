import {
  Table,
  TableCell,
  TableBody,
  TableHead,
  TableRow,
  TableHeader,
} from "@/components/ui/table";

const DataProductsPage = () => {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <div className="bg-white rounded-lg p-4 mt-6">
          <Table className="w-full border">
            <TableHeader>
              <TableRow className="bg-gray-50 text-soft-black">
                <TableHead className="border p-2 w-1/3 text-center font-bold">
                  Business Rules
                </TableHead>
                <TableHead className="border p-2 w-1/3 text-center font-bold">Data Quality Rule</TableHead>
                <TableHead className="border p-2 w-1/3 text-center font-bold">
                  Rule Score %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="border p-2 text-center">Product 1</TableCell>
                <TableCell className="border p-2 text-center">Purpose 1</TableCell>
                <TableCell className="border p-2 text-center">Yes</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="border p-2 text-center">Product 2</TableCell>
                <TableCell className="border p-2 text-center">Purpose 2</TableCell>
                <TableCell className="border p-2 text-center">Yes</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="border p-2 text-center">Product 3</TableCell>
                <TableCell className="border p-2 text-center">Purpose 3</TableCell>
                <TableCell className="border p-2 text-center">Yes</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="border p-2 text-center">Product 4</TableCell>
                <TableCell className="border p-2 text-center">Purpose 4</TableCell>
                <TableCell className="border p-2 text-center">Yes</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="w-full mt-12">
        <h1 className="text-xl font-bold text-soft-black text-center">Rule Executions</h1>
        <div className="bg-white rounded-lg p-4 mt-6">
          <Table className="w-full border">
            <TableHeader>
              <TableRow className="bg-gray-50 text-soft-black">
                <TableHead className="border p-2 w-1/4 text-center font-bold">Execution ID</TableHead>
                <TableHead className="border p-2 w-1/4 text-center font-bold">Execution Status</TableHead>
                <TableHead className="border p-2 w-1/4 text-center font-bold">Root Cause</TableHead>
                <TableHead className="border p-2 w-1/4 text-center font-bold">Remediation Schedule</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="border p-2 text-center">Product 1</TableCell>
                <TableCell className="border p-2 text-center">Product 2</TableCell>
                <TableCell className="border p-2 text-center">Product 3</TableCell>
                <TableCell className="border p-2 text-center">Product 4</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="border p-2 text-center">Product 5</TableCell>
                <TableCell className="border p-2 text-center">Product 6</TableCell>
                <TableCell className="border p-2 text-center">Product 7</TableCell>
                <TableCell className="border p-2 text-center">Product 8</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="border p-2 text-center">Product 9</TableCell>
                <TableCell className="border p-2 text-center">Product 10</TableCell>
                <TableCell className="border p-2 text-center">Product 11</TableCell>
                <TableCell className="border p-2 text-center">Product 12</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="border p-2 text-center">Product 13</TableCell>
                <TableCell className="border p-2 text-center">Product 14</TableCell>
                <TableCell className="border p-2 text-center">Product 15</TableCell>
                <TableCell className="border p-2 text-center">Product 16</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default DataProductsPage;
