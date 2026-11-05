"use client";

import { memo, useMemo } from "react";
import { Background, Controls, Handle, NodeProps, Position, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Bot, Brain, Loader2, MessageSquare, Network, Wrench, Workflow } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Axios } from "@/app/config/axios";
import { Guide } from "@/app/store/aiAgentsStore";
import { cn } from "@/lib/utils";
import {
  ArchitectureNode,
  ArchitectureNodeKind,
  buildGuideArchitecture,
  GuideArchitectureResponse,
} from "../utils/guide-architecture";

const KIND_STYLES: Record<
  ArchitectureNodeKind,
  { container: string; iconWrap: string; icon: typeof Bot }
> = {
  user: { container: "border-slate-300 bg-white", iconWrap: "bg-slate-100 text-slate-700", icon: MessageSquare },
  guide: { container: "border-blue-300 bg-blue-50", iconWrap: "bg-blue-100 text-blue-700", icon: Bot },
  stage: { container: "border-indigo-200 bg-white", iconWrap: "bg-indigo-100 text-indigo-700", icon: Workflow },
  tool: { container: "border-emerald-200 bg-white", iconWrap: "bg-emerald-100 text-emerald-700", icon: Wrench },
  memory: { container: "border-amber-200 bg-amber-50", iconWrap: "bg-amber-100 text-amber-700", icon: Brain },
};

// Handles are only anchor points for the fixed layout; the diagram is read-only
const hiddenHandle = "!h-1 !w-1 !min-h-0 !min-w-0 !border-0 !bg-transparent";

const ArchitectureNodeView = memo(({ data }: NodeProps<ArchitectureNode>) => {
  const style = KIND_STYLES[data.kind];
  const Icon = style.icon;

  return (
    <div className={cn("w-[200px] rounded-lg border p-3 shadow-sm", style.container)}>
      <Handle id="left" type="target" position={Position.Left} className={hiddenHandle} />
      <Handle id="right" type="source" position={Position.Right} className={hiddenHandle} />
      <Handle id="top" type="target" position={Position.Top} className={hiddenHandle} />
      <Handle id="top-out" type="source" position={Position.Top} className={hiddenHandle} />
      <Handle id="bottom" type="source" position={Position.Bottom} className={hiddenHandle} />
      <Handle id="bottom-in" type="target" position={Position.Bottom} className={hiddenHandle} />

      <div className="flex items-start gap-2">
        <div className={cn("shrink-0 rounded-md p-1.5", style.iconWrap)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-gray-900 break-words">
            {data.step ? `${data.step}. ` : ""}
            {data.title}
          </p>
          {data.subtitle && <p className="mt-0.5 text-xs font-medium text-blue-700">{data.subtitle}</p>}
        </div>
      </div>
      <p className="mt-2 text-xs leading-snug text-gray-600">{data.description}</p>
      {data.items && data.items.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-gray-100 pt-2">
          {data.items.map((item) => (
            <li key={item} className="truncate text-xs text-gray-700" title={item}>
              • {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
ArchitectureNodeView.displayName = "ArchitectureNodeView";

const nodeTypes = { architecture: ArchitectureNodeView };

interface GuideArchitectureViewProps {
  guide: Guide;
  guideId: string;
}

export function GuideArchitectureView({ guide, guideId }: GuideArchitectureViewProps) {
  const {
    data: architecture,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["guide-architecture", guideId],
    queryFn: async () =>
      (await Axios.get<GuideArchitectureResponse>(`/data/guides/${guideId}/architecture`)).data,
    enabled: !!guideId,
  });

  const diagram = useMemo(
    () => (architecture ? buildGuideArchitecture(guide, architecture) : null),
    [guide, architecture]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-600" />
          How this guide works
        </CardTitle>
        <CardDescription>
          What happens each time you ask this guide a question: the steps it runs, the tools it can use and what it
          remembers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!diagram && isLoading ? (
          <div className="flex h-[360px] items-center justify-center gap-2 rounded-lg border bg-gray-50 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Loading how this guide works…
          </div>
        ) : !diagram ? (
          <div className="flex h-[200px] flex-col items-center justify-center gap-3 rounded-lg border bg-gray-50 text-sm text-gray-600">
            Couldn&apos;t load how this guide works.
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
        <div className="relative h-[360px] md:h-[520px] w-full overflow-hidden rounded-lg border bg-gray-50">
          <ReactFlow
            nodes={diagram.nodes}
            edges={diagram.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.15}
            maxZoom={1.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            preventScrolling={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} color="#e2e8f0" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {diagram.steps.map((step, i) => (
            <li key={step.title} className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">
                {i + 1}. {step.title}
              </p>
              <p className="mt-1 text-xs text-gray-600">{step.description}</p>
            </li>
          ))}
        </ol>
          </>
        )}
      </CardContent>
    </Card>
  );
}
