import { Edge, MarkerType, Node } from "@xyflow/react";

// Shape of GET /data/guides/{id}/architecture. The backend walks agent/graph.py, so the steps and
// toolkits here always match what a run of this guide actually does.

export interface GuideArchitectureStep {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface GuideArchitectureTool {
  id: string;
  name: string;
  description: string;
  data_products: string[];
  always_on: boolean;
}

export interface GuideArchitectureResponse {
  guide_type: "connector" | "dataset";
  model_type?: string | null;
  model_version?: string | null;
  steps: GuideArchitectureStep[];
  tools: GuideArchitectureTool[];
  memory: { enabled: boolean };
}

export type ArchitectureNodeKind = "user" | "guide" | "stage" | "tool" | "memory";

export type ArchitectureNodeData = {
  kind: ArchitectureNodeKind;
  title: string;
  subtitle?: string;
  description: string;
  items?: string[];
  step?: number;
};

export type ArchitectureNode = Node<ArchitectureNodeData, "architecture">;

export interface GuideArchitectureDiagram {
  nodes: ArchitectureNode[];
  edges: Edge[];
  steps: { title: string; description: string }[];
}

interface GuideSummary {
  name: string;
  description?: string;
  agent_persona?: string;
  specialization?: string;
}

// The graph node that builds the toolkit and calls the tools
const TOOL_STEP_ID = "dataset";

function listNames(names: string[], max = 4): string[] {
  if (names.length <= max) return names;
  return [...names.slice(0, max), `+${names.length - max} more`];
}

const STAGE_GAP = 240;
const TOOL_GAP = 220;
const ROW_GAP = 220;

export function buildGuideArchitecture(
  guide: GuideSummary,
  architecture: GuideArchitectureResponse
): GuideArchitectureDiagram {
  const stages = [...architecture.steps].sort((a, b) => a.order - b.order);
  // Data-source toolkits first, then the tools every run gets
  const tools = [...architecture.tools].sort((a, b) => Number(a.always_on) - Number(b.always_on));

  const stageX = (i: number) => (i + 1) * STAGE_GAP;
  const toolStepIndex = Math.max(
    stages.findIndex((s) => s.id === TOOL_STEP_ID),
    Math.floor((stages.length - 1) / 2)
  );
  const toolStepId = stages[toolStepIndex]?.id;
  const toolsStartX = stageX(toolStepIndex) - ((tools.length - 1) * TOOL_GAP) / 2;

  const persona = [guide.agent_persona, guide.specialization]
    .filter((v): v is string => !!v)
    .map((v) => v.replace(/-/g, " "))
    .join(" · ");

  const nodes: ArchitectureNode[] = [
    {
      id: "user",
      type: "architecture",
      position: { x: 0, y: 0 },
      data: { kind: "user", title: "You", description: "Ask a question in the guide chat." },
    },
    {
      id: "guide",
      type: "architecture",
      position: { x: stageX(0), y: -ROW_GAP },
      data: {
        kind: "guide",
        title: guide.name,
        subtitle: architecture.guide_type === "connector" ? "Connector guide" : "Dataset guide",
        description: persona || guide.description || "AI guide",
      },
    },
    ...stages.map<ArchitectureNode>((stage, i) => ({
      id: `step-${stage.id}`,
      type: "architecture",
      position: { x: stageX(i), y: 0 },
      data: { kind: "stage", step: i + 1, title: stage.title, description: stage.description },
    })),
    ...tools.map<ArchitectureNode>((tool, i) => ({
      id: `tool-${tool.id}`,
      type: "architecture",
      position: { x: toolsStartX + i * TOOL_GAP, y: ROW_GAP },
      data: {
        kind: "tool",
        title: tool.name,
        subtitle: tool.always_on ? "Always available" : undefined,
        description: tool.description,
        items: tool.data_products.length > 0 ? listNames(tool.data_products) : undefined,
      },
    })),
  ];

  if (architecture.memory.enabled && stages.length > 0) {
    nodes.push({
      id: "memory",
      type: "architecture",
      position: { x: stageX(stages.length - 1), y: -ROW_GAP },
      data: {
        kind: "memory",
        title: "Conversation memory",
        description: "Keeps the chat history so the guide can pick it up on your next message.",
      },
    });
  }

  const flowEdge = (source: string, target: string): Edge => ({
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle: "right",
    targetHandle: "left",
    type: "smoothstep",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#2563eb" },
    style: { stroke: "#2563eb", strokeWidth: 2 },
  });

  const supportEdge = (
    source: string,
    target: string,
    sourceHandle: string,
    targetHandle: string,
    label?: string
  ): Edge => ({
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: "smoothstep",
    label,
    labelStyle: { fontSize: 11, fill: "#475569" },
    labelBgStyle: { fill: "#f8fafc" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
    style: { stroke: "#94a3b8", strokeWidth: 1.5, strokeDasharray: "5 4" },
  });

  const flowIds = ["user", ...stages.map((s) => `step-${s.id}`)];
  const edges: Edge[] = flowIds.slice(1).map((id, i) => flowEdge(flowIds[i], id));
  if (stages.length > 0) {
    edges.push(supportEdge("guide", `step-${stages[0].id}`, "bottom", "top", "setup"));
  }
  if (toolStepId) {
    edges.push(...tools.map((tool) => supportEdge(`step-${toolStepId}`, `tool-${tool.id}`, "bottom", "top")));
  }
  if (nodes.some((n) => n.id === "memory")) {
    edges.push(supportEdge(`step-${stages[stages.length - 1].id}`, "memory", "top-out", "bottom-in"));
  }

  return {
    nodes,
    edges,
    steps: stages.map(({ title, description }) => ({ title, description })),
  };
}
