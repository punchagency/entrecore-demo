"use client";

import { Table, TableCell, TableBody, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  MarkerType,
  Position,
  Handle,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useColumnDataStore } from "@/app/store/columnDataStore";
import { Network } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Axios } from "@/app/config/axios";


const TableNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 min-w-[180px]">
      <div className="font-medium border-b pb-2 mb-2">{data.title}</div>
      <div className="space-y-2">
        {data.columns.map((column: string, index: number) => (
          <div key={index} className="flex items-center">
            <Handle
              type={data.type === 'source' ? "source" : "target"}
              position={data.type === 'source' ? Position.Right : Position.Left}
              id={`${column}-${index}`}
              className="w-2 h-2 bg-black rounded-full"
            />
            <span className="ml-2">{column}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const nodeTypes = {
  tableNode: TableNode,
};

export default function AssociationsPage() {
  const { selectedColumnData, isLoading, hasColumns } = useColumnDataStore();
  const params = useParams();
  const tableId = (params as { id?: string })?.id;
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const [chatSuggestions, setChatSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSavedCompanyId(window.localStorage.getItem("selectedCompanyId"));
    }
  }, []);

  // Call observe endpoint when Associations page first loads for this table/company


  if (isLoading || (!selectedColumnData && hasColumns !== false)) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mx-auto"></div>
        <div className="bg-white rounded-lg p-4">
          <div className="h-[300px] border rounded-lg bg-gray-100 animate-pulse"></div>
        </div>
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mx-auto"></div>
        <div className="bg-white rounded-lg p-4">
          <div className="animate-pulse space-y-3">
            <div className="bg-gray-50 p-4 rounded">
              <div className="flex space-x-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-6 bg-gray-200 rounded flex-1"></div>
                ))}
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex space-x-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded flex-1"></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (hasColumns === false) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-gray-50 rounded-lg p-8">
            <Network className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-3">No Columns Found</h3>
            <p className="text-gray-600 leading-relaxed">
              This table doesn't have any columns to analyze for associations.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Please select a different table that contains column data.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedColumnData) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-gray-50 rounded-lg p-8">
            <Network className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-3">No Column Selected</h3>
            <p className="text-gray-600 leading-relaxed">
              Select a column from the sidebar to view its associations and relationships with other tables.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Associations help understand data lineage and table dependencies.
            </div>
          </div>
        </div>
      </div>
    );
  }
  const initialNodes: Node[] = [
    {
      id: 'source',
      type: 'tableNode',
      position: { x: 100, y: 100 },
      data: {
        title: 'Source',
        columns: ['Column PK', 'Column FK'],
        type: 'source'
      },
    },
    {
      id: 'target1',
      type: 'tableNode',
      position: { x: 500, y: 50 },
      data: {
        title: 'Source',
        columns: ['Column PK'],
        type: 'target'
      },
    },
    {
      id: 'target2',
      type: 'tableNode',
      position: { x: 500, y: 200 },
      data: {
        title: 'Source',
        columns: ['Column FK'],
        type: 'target'
      },
    },
  ];

  const initialEdges: Edge[] = [
    {
      id: 'e1-2',
      source: 'source',
      target: 'target1',
      sourceHandle: 'Column PK-0',
      targetHandle: 'Column PK-0',
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      style: { strokeWidth: 2 },
    },
    {
      id: 'e1-3',
      source: 'source',
      target: 'target2',
      sourceHandle: 'Column FK-1',
      targetHandle: 'Column FK-0',
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      style: { strokeWidth: 2 },
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-xl text-soft-black text-center">ERD - Tabular</h3>
      <div className="bg-white rounded-lg p-4">
        <div className="h-[300px] border rounded-lg">
          <ReactFlowProvider>
            <ReactFlow
              nodes={initialNodes}
              edges={initialEdges}
              nodeTypes={nodeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      </div>

      <h3 className="font-bold text-xl text-soft-black text-center mt-12">ERD - Tabular</h3>
      <div className="bg-white rounded-lg p-4">
        <Table className="w-full border">
          <TableHeader>
            <TableRow className="bg-gray-50 text-soft-black">
              <TableHead className="border p-2 w-1/4 text-center font-bold">Source</TableHead>
              <TableHead className="border p-2 w-1/4 text-center font-bold">PK</TableHead>
              <TableHead className="border p-2 w-1/4 text-center font-bold">Target</TableHead>
              <TableHead className="border p-2 w-1/4 text-center font-bold">FK</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="border p-2 w-1/4 text-center">Source PK</TableCell>
              <TableCell className="border p-2 w-1/4 text-center">Column PK</TableCell>
              <TableCell className="border p-2 w-1/4 text-center">Target PK</TableCell>
              <TableCell className="border p-2 w-1/4 text-center">Target FK</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border p-2 w-1/4 text-center">Source PK</TableCell>
              <TableCell className="border p-2 w-1/4 text-center">Column PK</TableCell>
              <TableCell className="border p-2 w-1/4 text-center">Target PK</TableCell>
              <TableCell className="border p-2 w-1/4 text-center">Target FK</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="border p-2 w-1/4 text-center">Source PK</TableCell>
              <TableCell className="border p-2 w-1/4 text-center">Column PK</TableCell>
              <TableCell className="border p-2 w-1/4 text-center">Target PK</TableCell>
              <TableCell className="border p-2 w-1/4 text-center">Target FK</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>


    </div>
  );
} 