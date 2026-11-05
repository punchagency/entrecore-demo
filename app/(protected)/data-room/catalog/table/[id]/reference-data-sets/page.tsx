import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ReferenceDataSetsPage = () => {
    const referenceDataSets = [
        {
            id: 1,
            value: "Reference Data Set 1",
            definition: "Definition of Reference Data Set 1",
            columnsUsed: 10,
        },
        {
            id: 2   ,
            value: "Reference Data Set 2",
            definition: "Definition of Reference Data Set 2",
            columnsUsed: 10,
        },
        {
            id: 3,
            value: "Reference Data Set 3",
            definition: "Definition of Reference Data Set 3",
            columnsUsed: 10,
        },
        {
            id: 4,
            value: "Reference Data Set 4",
            definition: "Definition of Reference Data Set 4",
            columnsUsed: 10,
        },
    ];
    return (
        <div>
            <h1 className="text-xl font-bold text-soft-black text-center">Reference Data Sets</h1>
            <div className="bg-white rounded-lg p-4 mt-12">
        <Table   className="w-full border">
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="border p-2 w-1/3 text-center font-bold">Value</TableHead>
              <TableHead className="border p-2 w-1/3 text-center font-bold">Definition</TableHead>
              <TableHead className="border p-2 w-1/3 text-center font-bold">Columns Used</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referenceDataSets.map((referenceDataSet) => (
              <TableRow key={referenceDataSet.id}>
                <TableCell className="border p-2 text-center">{referenceDataSet.value}</TableCell>
                <TableCell className="border p-2 text-center">{referenceDataSet.definition}</TableCell>
                <TableCell className="border p-2 text-center">{referenceDataSet.columnsUsed}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
        </div>
    )
}

export default ReferenceDataSetsPage;