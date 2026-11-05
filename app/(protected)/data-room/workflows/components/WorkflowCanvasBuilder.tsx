"use client";

import React from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./builder/builder.css";

import WorkflowNode from "./WorkflowNode";
import SkillLibrary from "./SkillLibrary";
import TriggerSelector from "./TriggerSelector";
import NodeConfigPanel from "./NodeConfigPanel";
import NaturalLanguageDraftModal from "./NaturalLanguageDraftModal";
import BuilderHeader from "./builder/BuilderHeader";
import CanvasStatusOverlay from "./builder/CanvasStatusOverlay";
import ClearCanvasDialog from "./builder/ClearCanvasDialog";
import { useWorkflowBuilderState } from "../hooks/use-workflow-builder-state";
import { DataRoomWorkflow } from "../hooks/use-data-room-workflows";

const nodeTypes: any = {
  workflowNode: WorkflowNode,
};

export interface WorkflowCanvasBuilderProps {
  workflowId?: string | null;
  initialOpenAIDraft?: boolean;
  onBackToLanding?: () => void;
  onSaved?: (wf: DataRoomWorkflow) => void;
}

export default function WorkflowCanvasBuilder({
  workflowId,
  initialOpenAIDraft = false,
  onBackToLanding,
  onSaved,
}: WorkflowCanvasBuilderProps) {
  const {
    reactFlowWrapper,
    nodes,
    edges,
    nodesWithHandlers,
    activeTriggerNode,
    selectedNode,
    selectedTriggerId,
    workflowName,
    setWorkflowName,
    currentId,
    varNodesTotal,
    varNodesConfirmed,
    actionNodesCount,
    isTesting,
    isClearDialogOpen,
    setIsClearDialogOpen,
    isAIDraftOpen,
    setIsAIDraftOpen,
    handleCloseAIDraft,
    onNodesChange,
    onEdgesChange,
    onInitFlow,
    onNodeClick,
    onPaneClick,
    onNodeDragStop,
    onConnect,
    isValidConnection,
    onDragOver,
    onDrop,
    onSkillActionSelect,
    handleTriggerSelect,
    handleTriggerClear,
    onDeleteNode,
    onUpdateNodeData,
    setSelectedNodeId,
    onSave,
    onClearAll,
    onRunTest,
    handleAcceptDraftOnCanvas,
  } = useWorkflowBuilderState({
    workflowId,
    initialOpenAIDraft,
    onSaved,
    onBackToLanding,
  });

  return (
    <div className="workflow-page-container">
      {/* ─── Topbar Header ─── */}
      <BuilderHeader
        workflowName={workflowName}
        onWorkflowNameChange={setWorkflowName}
        currentId={currentId}
        varNodesTotal={varNodesTotal}
        varNodesConfirmed={varNodesConfirmed}
        nodesCount={nodes.length}
        isTesting={isTesting}
        onBackToLanding={onBackToLanding}
        onOpenAIDraft={() => setIsAIDraftOpen(true)}
        onOpenClearDialog={() => setIsClearDialogOpen(true)}
        onSave={onSave}
        onRunTest={onRunTest}
      />

      {/* ─── Main Builder Body ─── */}
      <main className="workflow-main">
        {/* Sidebar: Step 1 (Trigger) + Step 2 (Skill Library Actions) */}
        <aside className="workflow-sidebar skill-library-aside">
          <TriggerSelector
            selectedTriggerId={selectedTriggerId}
            onTriggerSelect={handleTriggerSelect}
            onTriggerClear={handleTriggerClear}
          />

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <SkillLibrary onActionSelect={onSkillActionSelect} className="h-full" />
          </div>
        </aside>

        {/* Canvas Area */}
        <div className="canvas-wrapper flex relative overflow-hidden" ref={reactFlowWrapper}>
          <div className="canvas-flow-container">
            <ReactFlow
              nodes={nodesWithHandlers}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              onInit={onInitFlow}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              isValidConnection={isValidConnection}
              connectionMode={ConnectionMode.Loose}
              fitView
              fitViewOptions={{ maxZoom: 0.5, padding: 0.35 }}
              defaultViewport={{ x: 100, y: 100, zoom: 0.5 }}
              minZoom={0.1}
              maxZoom={1.5}
              className="premium-flow"
            >
              <Background color="#cbd5e1" gap={20} />
              <Controls className="custom-controls" />
              <MiniMap
                style={{ height: 120, width: 200 }}
                className="custom-minimap"
                maskColor="rgba(0, 0, 0, 0.1)"
              />

              {/* Status Overlays */}
              <CanvasStatusOverlay
                activeTriggerNode={activeTriggerNode}
                actionNodesCount={actionNodesCount}
                connectedEdgesCount={edges.length}
              />
            </ReactFlow>
          </div>

          {/* Node Configuration Panel Drawer */}
          {selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
              onDeleteNode={onDeleteNode}
              onUpdateNodeData={onUpdateNodeData}
            />
          )}
        </div>
      </main>

      {/* Clear All Confirmation Dialog */}
      <ClearCanvasDialog
        isOpen={isClearDialogOpen}
        onClose={() => setIsClearDialogOpen(false)}
        onConfirmClear={onClearAll}
      />

      {/* Natural Language Workflow Drafting Modal */}
      <NaturalLanguageDraftModal
        isOpen={isAIDraftOpen}
        onClose={handleCloseAIDraft}
        onAcceptDraft={handleAcceptDraftOnCanvas}
      />
    </div>
  );
}
