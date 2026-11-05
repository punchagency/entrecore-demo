"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
    Settings,
    Trash2,
    Copy,
    MoreHorizontal,
    Zap,
    Database,
    Filter,
    Clock,
    Play,
    Timer,
    Globe,
    Mail,
    MessageSquare,
    Radio,
    Upload,
    FileEdit,
    MousePointer2,
    ClipboardList,
    CheckCircle2,
    AlertTriangle,
    TableProperties,
    Sparkles,
    Check,
    Sliders,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { hasVariableX } from "./node-variable-meta";

export type WorkflowNodeData = {
    label: string;
    originalLabel?: string;
    description?: string;
    icon?: React.ReactNode;
    iconName?: string;
    color?: string;
    status?: "idle" | "running" | "success" | "error";
    config?: Record<string, any>;
    isTrigger?: boolean;
    triggerId?: string;
    hasVariable?: boolean;
    variableName?: string;
    variableValue?: string;
    variableConfirmed?: boolean;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onConnectToTrigger?: (id: string) => void;
    onConfigure?: (id: string) => void;
};

const WorkflowNode = ({ id, data, selected }: NodeProps) => {
    const {
        label,
        originalLabel,
        description,
        icon,
        iconName,
        color = "blue",
        status = "idle",
        isTrigger = false,
        hasVariable,
        variableValue,
        variableConfirmed,
        onDelete,
        onDuplicate,
        onConnectToTrigger,
        onConfigure,
    } = data as WorkflowNodeData;

    const isVarNode = Boolean(hasVariable || hasVariableX(originalLabel || label));

    const getIcon = () => {
        if (icon) return icon;
        if (iconName) {
            switch (iconName) {
                case "Zap": return <Zap size={13} />;
                case "Clock": return <Clock size={13} />;
                case "Globe": return <Globe size={13} />;
                case "Database": return <Database size={13} />;
                case "Mail": return <Mail size={13} />;
                case "MessageSquare": return <MessageSquare size={13} />;
                case "Radio": return <Radio size={13} />;
                case "Upload": return <Upload size={13} />;
                case "FileEdit": return <FileEdit size={13} />;
                case "MousePointer2": return <MousePointer2 size={13} />;
                case "ClipboardList": return <ClipboardList size={13} />;
                case "CheckCircle2": return <CheckCircle2 size={13} />;
                case "AlertTriangle": return <AlertTriangle size={13} />;
                case "Timer": return <Timer size={13} />;
                case "TableProperties": return <TableProperties size={13} />;
                default: break;
            }
        }
        if (isTrigger) return <Zap size={13} />;
        const l = (originalLabel || label).toLowerCase();
        if (l.includes("email") || l.includes("mail")) return <Mail size={13} />;
        if (l.includes("slack") || l.includes("teams") || l.includes("message")) return <MessageSquare size={13} />;
        if (l.includes("table") || l.includes("database") || l.includes("record") || l.includes("sql") || l.includes("query")) return <Database size={13} />;
        if (l.includes("pipeline") || l.includes("etl")) return <Play size={13} />;
        if (l.includes("filter")) return <Filter size={13} />;
        if (l.includes("schedule") || l.includes("cron")) return <Clock size={13} />;
        if (l.includes("ai") || l.includes("model") || l.includes("llm")) return <Sparkles size={13} />;
        return <Settings size={13} />;
    };

    const getStatusColor = () => {
        switch (status) {
            case "running": return "#3b82f6";
            case "success": return "#22c55e";
            case "error": return "#ef4444";
            default: return "#94a3b8";
        }
    };

    return (
        <div
            onClick={() => onConfigure?.(id)}
            className={`workflow-node-wrapper ${selected ? "selected" : ""} ${color} status-${status} ${isTrigger ? "node-is-trigger" : ""}`}
        >
            {/* Triggers don't accept incoming connections, only outgoing */}
            {!isTrigger && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="node-handle handle-left"
                />
            )}

            <div className="node-content">
                <div className="node-header">
                    <div className="node-icon-bg">
                        {getIcon()}
                    </div>
                    <div className="node-title-area">
                        {isTrigger && (
                            <span className="trigger-badge">⚡ TRIGGER</span>
                        )}
                        <span className="node-label" title={label}>{label}</span>
                        <div className="status-indicator">
                            <div className="status-dot" style={{ backgroundColor: getStatusColor() }} />
                            <span className="node-status">{status}</span>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <div className="node-actions-trigger">
                                <MoreHorizontal size={13} />
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50">
                            {!isTrigger && onConnectToTrigger && (
                                <>
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onConnectToTrigger(id);
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium"
                                    >
                                        <Zap size={13} className="text-emerald-600" />
                                        Connect to Trigger
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="h-px bg-slate-100 my-1" />
                                </>
                            )}
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onConfigure?.(id);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50 rounded-lg text-xs text-slate-700 font-medium"
                            >
                                <Sliders size={13} />
                                Configure Node
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicate?.(id);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50 rounded-lg text-xs text-slate-700"
                            >
                                <Copy size={13} />
                                Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="h-px bg-slate-100 my-1" />
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete?.(id);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-red-50 text-red-600 rounded-lg text-xs font-medium"
                            >
                                <Trash2 size={13} />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* ── Variable Binding Pill (for nodes with 'x') ── */}
                {isVarNode && (
                    <div className="variable-row">
                        {variableConfirmed && variableValue ? (
                            <div
                                className="variable-pill confirmed"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onConfigure?.(id);
                                }}
                                title={`Variable (x) confirmed as: ${variableValue}. Click to reconfigure.`}
                            >
                                <Check size={10} className="text-emerald-600 shrink-0" />
                                <span className="variable-text truncate">
                                    <span className="var-symbol">x:</span> {variableValue}
                                </span>
                            </div>
                        ) : (
                            <div
                                className="variable-pill unconfirmed"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onConfigure?.(id);
                                }}
                                title="Variable (x) is unconfirmed. Click to configure and bind."
                            >
                                <Sparkles size={10} className="text-amber-500 shrink-0" />
                                <span className="variable-text">x: unconfirmed</span>
                                <span className="var-action">Set →</span>
                            </div>
                        )}
                    </div>
                )}

                {description && (
                    <div className="node-body">
                        <p className="node-description">{description}</p>
                    </div>
                )}

                <div className="node-footer">
                    <div className="footer-tag">
                        {isTrigger ? (
                            <>
                                <Zap size={9} className="mr-1 text-emerald-600" />
                                Trigger Event
                            </>
                        ) : isVarNode ? (
                            <>
                                <Sparkles size={9} className="mr-1 text-indigo-500" />
                                Variable Action
                            </>
                        ) : (
                            <>
                                <Settings size={9} className="mr-1 text-slate-400" />
                                Action Node
                            </>
                        )}
                    </div>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="node-handle handle-right"
            />

            <style jsx>{`
                .workflow-node-wrapper {
                    width: 230px;
                    background: white;
                    border-radius: 11px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.04);
                    position: relative;
                    transition: all 0.15s ease-in-out;
                    cursor: pointer;
                }

                .workflow-node-wrapper:hover {
                    border-color: #cbd5e1;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.05);
                }

                .node-is-trigger {
                    border-color: #10b981;
                    box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1);
                }

                .workflow-node-wrapper.selected {
                    border-color: #4f46e5;
                    box-shadow: 0 0 0 2.5px rgba(99, 102, 241, 0.25);
                }

                .status-running {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
                    70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                }

                .node-content {
                    padding: 9px 11px;
                }

                .node-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 3px;
                }

                .node-icon-bg {
                    width: 25px;
                    height: 25px;
                    border-radius: 7px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    flex-shrink: 0;
                }

                .blue .node-icon-bg { background: linear-gradient(135deg, #3b82f6, #2563eb); }
                .green .node-icon-bg { background: linear-gradient(135deg, #22c55e, #16a34a); }
                .emerald .node-icon-bg { background: linear-gradient(135deg, #10b981, #059669); }
                .amber .node-icon-bg { background: linear-gradient(135deg, #f59e0b, #d97706); }
                .orange .node-icon-bg { background: linear-gradient(135deg, #f97316, #ea580c); }
                .red .node-icon-bg { background: linear-gradient(135deg, #ef4444, #dc2626); }
                .rose .node-icon-bg { background: linear-gradient(135deg, #f43f5e, #e11d48); }
                .pink .node-icon-bg { background: linear-gradient(135deg, #ec4899, #db2777); }
                .purple .node-icon-bg { background: linear-gradient(135deg, #a855f7, #9333ea); }
                .violet .node-icon-bg { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
                .indigo .node-icon-bg { background: linear-gradient(135deg, #6366f1, #4f46e5); }
                .teal .node-icon-bg { background: linear-gradient(135deg, #14b8a6, #0d9488); }
                .cyan .node-icon-bg { background: linear-gradient(135deg, #06b6d4, #0891b2); }
                .slate .node-icon-bg { background: linear-gradient(135deg, #64748b, #475569); }
                .fuchsia .node-icon-bg { background: linear-gradient(135deg, #d946ef, #c026d3); }

                .node-title-area {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                }

                .trigger-badge {
                    font-size: 0.5rem;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    padding: 0.5px 4px;
                    border-radius: 4px;
                    background: #ecfdf5;
                    color: #059669;
                    border: 1px solid #a7f3d0;
                    margin-bottom: 1px;
                    display: inline-block;
                    width: fit-content;
                    line-height: 1.1;
                }

                .node-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #0f172a;
                    line-height: 1.25;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    margin-top: 1px;
                }

                .status-dot {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                }

                .node-status {
                    font-size: 0.5625rem;
                    font-weight: 600;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }

                .node-actions-trigger {
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 3px;
                    border-radius: 5px;
                    transition: background 0.15s;
                }

                .node-actions-trigger:hover {
                    background: #f1f5f9;
                    color: #334155;
                }

                /* Variable Pill */
                .variable-row {
                    margin-top: 5px;
                    margin-bottom: 4px;
                }

                .variable-pill {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 3px 6px;
                    border-radius: 6px;
                    font-size: 0.65rem;
                    line-height: 1.2;
                    transition: all 0.15s ease;
                }

                .variable-pill.confirmed {
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    color: #166534;
                }

                .variable-pill.confirmed:hover {
                    background: #dcfce7;
                    border-color: #86efac;
                }

                .variable-pill.unconfirmed {
                    background: #fffbeb;
                    border: 1px dashed #fde68a;
                    color: #b45309;
                }

                .variable-pill.unconfirmed:hover {
                    background: #fef3c7;
                    border-color: #fcd34d;
                }

                .variable-text {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-family: monospace;
                    font-size: 0.625rem;
                    flex: 1;
                }

                .var-symbol {
                    font-weight: 700;
                    color: #059669;
                }

                .var-action {
                    font-size: 0.5625rem;
                    font-weight: 700;
                    text-decoration: underline;
                    color: #d97706;
                    flex-shrink: 0;
                }

                .node-body {
                    padding: 4px 0 2px 0;
                    border-top: 1px solid #f8fafc;
                }

                .node-description {
                    font-size: 0.6875rem;
                    color: #64748b;
                    margin: 0;
                    line-height: 1.35;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .node-footer {
                    margin-top: 4px;
                    padding-top: 4px;
                    border-top: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: flex-end;
                }

                .footer-tag {
                    font-size: 0.5625rem;
                    font-weight: 600;
                    background: #f8fafc;
                    color: #64748b;
                    padding: 1.5px 5px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                }

                :global(.node-handle) {
                    width: 7px !important;
                    height: 7px !important;
                    background: white !important;
                    border: 1.5px solid #94a3b8 !important;
                    transition: all 0.15s !important;
                }

                :global(.node-handle:hover) {
                    width: 10px !important;
                    height: 10px !important;
                    background: #4f46e5 !important;
                    border-color: #4f46e5 !important;
                }

                :global(.handle-left) { left: -4px !important; }
                :global(.handle-right) { right: -4px !important; }
            `}</style>
        </div>
    );
};

export default memo(WorkflowNode);
