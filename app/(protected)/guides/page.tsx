"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Bot,
  Database,
  Activity,
  Settings,
  Play,
  Trash2,
  Edit,
  Zap,
  TrendingUp,
  BarChart3,
  ChevronDown,
  Info,
  MessageSquare,
  BotOff,
  Upload,
  Network,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGuidesStore, Guide } from "@/app/store/aiAgentsStore";
import { useCompanyDatasets } from "@/hooks/use-datasets";
import { CreateGuideDialog } from "./components/create-agent-dialog";
import { EditGuideDialog } from "./components/edit-agent-dialog";
import { AssignDatasetDialog } from "./components/assign-dataset-dialog";
import { ManageActionsDialog } from "./components/manage-actions-dialog";
import { DeleteGuideDialog } from "./components/delete-agent-dialog";
import { GuideChatDialog } from "./components/guide-chat-dialog";
import { CreateCustomActionDialog } from "./components/create-custom-action-dialog";
import { toast } from "sonner";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { UpdateDatasetDialog } from "./components/update-dataset-dialog";
import { LLMSelector } from "./components/llm-selector";
import { LLMConfigurationDialog } from "./components/llm-configuration-dialog";
import { UploadCompanyDocDialog } from "./components/upload-company-doc-dialog";
import { CompanyKnowledgeDocsPanel } from "./components/company-knowledge-docs-panel";
import { VerticalBadges } from "@/components/vertical-badges";
import { useGuideVerticals } from "@/hooks/useVerticals";
import { PageWrapper } from "@/components/page-wrapper";

// Small helper to fetch & display verticals for a single guide card
function GuideVerticalBadges({ guideId }: { guideId?: string }) {
  const { data: verticals = [] } = useGuideVerticals(guideId);
  const keys = verticals.map((v: any) => v.vertical_key);
  if (keys.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-slate-100">
      <VerticalBadges verticalKeys={keys} max={3} size="sm" showTooltips />
    </div>
  );
}

export default function GuidesPage() {
  const {
    fetchGuides,
    error,
    guides,
    startGuideProcessing,
    stopGuideProcessing,
    deleteGuide,
    getGuidesByDataset,
    isLoading,
    unassignDatasetFromGuide,
  } = useGuidesStore();

  useEffect(() => {
    fetchGuides();
    
    // Listen for company changes
    const handleCompanyChange = () => {
      fetchGuides();
    };
    
    window.addEventListener("localStorageChange", handleCompanyChange as EventListener);
    window.addEventListener("storage", handleCompanyChange);
    
    return () => {
      window.removeEventListener("localStorageChange", handleCompanyChange as EventListener);
      window.removeEventListener("storage", handleCompanyChange);
    };
  }, []);

  useEffect(() => {
    if (error && guides && guides.length > 0) {
      toast.error("Failed to refresh guides. Displaying cached data.");
    }
  }, [error, guides]);

  const { data: datasets = [], isLoading: isDatasetsLoading } = useCompanyDatasets();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDatasetDialogOpen, setAssignDatasetDialogOpen] = useState(false);
  const [manageActionsDialogOpen, setManageActionsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [customActionDialogOpen, setCustomActionDialogOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [processingGuide, setProcessingGuide] = useState<string | null>(null);
  const [progressStates, setProgressStates] = useState<Record<string, number>>({});
  const [completedGuides, setCompletedGuides] = useState<Set<string>>(new Set());
  const [updateDatasetDialogOpen, setUpdateDatasetDialogOpen] = useState(false);
  const [llmConfigDialogOpen, setLlmConfigDialogOpen] = useState(false);
  const [uploadDocsDialogOpen, setUploadDocsDialogOpen] = useState(false);

  const activeGuides = guides?.filter((guide) => guide.status === "active") || [];
  const inactiveGuides = guides?.filter((guide) => guide.status === "inactive") || [];
  const guidesWithDatasets = guides?.filter((guide) => guide?.datasets) || [];

  const getStatusColor = (status: Guide["status"]) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 shadow-emerald-100";
      case "inactive":
        return "bg-slate-100 text-slate-700 border-slate-200 shadow-slate-100";
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200 shadow-amber-100";
      case "error":
        return "bg-rose-100 text-rose-800 border-rose-200 shadow-rose-100";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 shadow-slate-100";
    }
  };

  const getTypeIcon = (type: Guide["model_type"]) => {
    switch (type?.toLowerCase()) {
      case "data-analyst":
        return <BarChart3 className="h-5 w-5" />;
      case "data-quality":
        return <Database className="h-5 w-5" />;
      case "automation":
        return <Zap className="h-5 w-5" />;
      case "insight-generator":
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <Bot className="h-5 w-5" />;
    }
  };

  const getTypeGradient = (type: Guide["model_type"]) => {
    switch (type?.toLowerCase()) {
      case "data-analyst":
        return "from-blue-500 to-indigo-600";
      case "data-quality":
        return "from-emerald-500 to-teal-600";
      case "automation":
        return "from-purple-500 to-violet-600";
      case "insight-generator":
        return "from-orange-500 to-red-600";
      default:
        return "from-gray-500 to-slate-600";
    }
  };

  const handleToggleStatus = async (guide: Guide) => {
    // Don't allow clicking if already processing or if there's active progress
    if (processingGuide === guide.id || progressStates[guide.id || ""] > 0) return;

    const guideId = guide.id || "";
    setProcessingGuide(guideId);

    // Set status to active when processing starts
    startGuideProcessing(guideId);

    // Reset progress and completion state for this guide
    if (guideId) {
      setProgressStates((prev) => ({
        ...prev,
        [guideId]: 0,
      }));
      setCompletedGuides((prev) => {
        const newSet = new Set(prev);
        newSet.delete(guideId);
        return newSet;
      });

      // Start progress immediately
      const startProgress = () => {
        const interval = setInterval(
          () => {
            setProgressStates((prev) => {
              const currentProgress = prev[guideId] || 0;

              if (currentProgress >= 100) {
                clearInterval(interval);
                // Mark as completed and clear progress - Set status to inactive when done
                setTimeout(() => {
                  setCompletedGuides((completed) => new Set(completed).add(guideId));
                  setProgressStates((prev) => {
                    const newState = { ...prev };
                    delete newState[guideId];
                    return newState;
                  });
                  stopGuideProcessing(guideId); // Set status to inactive when processing completes
                  toast.success(`🎉 ${guide.name} has completed its tasks!`);
                }, 1000);
                return prev;
              }

              const newProgress = currentProgress + Math.random() * 15 + 5;
              const finalProgress = Math.min(newProgress, 100);

              return {
                ...prev,
                [guideId]: finalProgress,
              };
            });
          },
          800 + Math.random() * 400
        );
      };

      // Start progress immediately
      startProgress();
    }

    try {
      toast.success(`Guide "${guide.name}" started processing assigned tasks`);
    } finally {
      setTimeout(() => setProcessingGuide(null), 1200);
    }
  };

  const handleEditGuide = (guide: Guide) => {
    setSelectedGuide(guide);
    setEditDialogOpen(true);
  };

  const handleAssignDataset = (guide: Guide) => {
    setSelectedGuide(guide);
    setAssignDatasetDialogOpen(true);
  };

  const handleManageActions = (guide: Guide) => {
    setSelectedGuide(guide);
    setManageActionsDialogOpen(true);
  };

  const handleDeleteGuide = (guide: Guide) => {
    setSelectedGuide(guide);
    setDeleteDialogOpen(true);
  };

  const handleChatWithGuide = (guide: Guide) => {
    setSelectedGuide(guide);
    setChatDialogOpen(true);
  };

  const handleCreateCustomAction = (guide: Guide) => {
    setSelectedGuide(guide);
    setCustomActionDialogOpen(true);
  };

  const handleDeleteDataset = (guide: Guide, dataset_id: string | null) => {
    setSelectedGuide(guide);
    unassignDatasetFromGuide(guide.id || "", dataset_id || "");
  };

  const handleEditDataset = (guide: Guide) => {
    setSelectedGuide(guide);
    setUpdateDatasetDialogOpen(true);
  };

  const handleCustomActionCreate = (action: any) => {
    // Here you would integrate with your backend to save the custom action
    // For now, just show a success message
    toast.success(`Custom action "${action.name}" created successfully!`);

    // Optionally refresh the guides or update the selected guide's actions
    // You might want to call an API to associate this action with the guide
    console.log("Custom action created:", action);
  };

  const GuideCard = ({ guide }: { guide: Guide }) => (
    <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:scale-[1.02] overflow-hidden relative h-[400px] md:h-[450px] lg:h-[480px] flex flex-col">
      {(processingGuide === guide.id || progressStates[guide.id || ""] > 0) &&
        !completedGuides.has(guide.id || "") && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center overflow-hidden border border-gray-200">
            <div className="text-center px-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{guide.name} is working</h3>
              <p className="text-sm text-gray-600 mb-4">Guide is processing your tasks</p>

              <div className="w-full max-w-xs mx-auto mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500 font-medium">Progress</span>
                  <span className="text-xs text-blue-600 font-semibold">
                    {Math.round(progressStates[guide.id || ""] || 0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                    style={{ width: `${progressStates[guide.id || ""] || 0}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_ease-in-out_infinite] transform -skew-x-12"></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                <span>Processing</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-[bounce_1.4s_ease-in-out_infinite]"></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-[bounce_1.4s_ease-in-out_0.2s_infinite]"></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-[bounce_1.4s_ease-in-out_0.4s_infinite]"></div>
                </div>
              </div>
            </div>
          </div>
        )}

      <div className={`h-2 bg-gradient-to-r ${getTypeGradient(guide.model_type)}`} />

      <CardHeader className="relative">
        <div className="gap-2 flex justify-end">
          <Badge
            className={`text-xs font-semibold shadow-sm hover:text-white ${getStatusColor(guide.status)}`}
          >
            {guide.status === "active" ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="outline" className="text-xs truncate max-w-[80px]">
            v-{guide.model_version || "1.0.0"}
          </Badge>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`p-3 rounded-xl bg-gradient-to-br ${getTypeGradient(guide.model_type)} text-white shadow-lg`}
            >
              {getTypeIcon(guide.model_type)}
            </div>
            <div className="flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors text-wrap">
                    <Link href={`/guides/${guide.id}`} className="hover:text-blue-700 hover:underline">
                      {guide.name}
                    </Link>
                  </CardTitle>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{guide.name}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardDescription className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-2 sm:line-clamp-3 md:line-clamp-4  cursor-help">
                    {guide.description}
                  </CardDescription>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{guide.description}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          {/* Version Badge */}
        </div>
        <div className="flex items-center justify-start gap-4 my-1 sm:my-3">
          <div className="flex items-start justify-between flex-col gap-1 sm:gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">Guide Persona</span>
            <Badge
              variant="outline"
              className="text-xs font-medium capitalize truncate max-w-[120px] sm:max-w-full bg-blue-100 text-blue-700"
            >
              {guide.agent_persona?.replace("-", " ") || "Unknown Type"}
            </Badge>
          </div>
          <div className="flex items-start justify-between flex-col gap-1 sm:gap-2  flex-wrap">
            <span className="text-sm font-semibold text-gray-700">Specialization</span>
            <Badge
              variant="outline"
              className="text-xs font-medium capitalize truncate max-w-[120px] sm:max-w-full bg-blue-100 text-blue-700 "
            >
              {guide.specialization?.replace("-", " ") || "Unknown Specialization"}
            </Badge>
          </div>
        </div>

        {/* Enterprise Verticals */}
        <GuideVerticalBadges guideId={guide.id} />
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col">
        {/* Dataset Assignment */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Assigned Data Products</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Connect data products for processing</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {guide.datasets && guide.datasets.length > 0 ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <span className="text-xs">{guide.datasets[0].name?.slice(0, 10)}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {guide.datasets.map((dataset, index) => (
                      <DropdownMenuItem className="flex items-center justify-between">
                        <span className="text-sm overflow-hidden text-ellipsis text-nowrap">
                          {dataset?.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => handleDeleteDataset(guide, dataset.id || null)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => handleEditDataset(guide)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Badge variant="outline" className="text-xs">
                No data products
              </Badge>
            )}
          </div>{" "}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Actions</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure guide tasks</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {guide.actions?.length && guide.actions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <span className="text-xs">{guide.actions.length} configured</span>
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {guide.actions.map((action) => (
                    <DropdownMenuItem key={action.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-sm">{action.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Badge variant="outline" className="text-xs">
                No actions
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-gray-100 mt-auto">
          {/* Primary Action - Activate Guide */}
          <Button
            size="sm"
            variant="default"
            onClick={() => handleToggleStatus(guide)}
            disabled={processingGuide === guide.id || progressStates[guide.id || ""] > 0}
            className={`flex-1 shadow-sm font-medium min-w-[120px] ${processingGuide === guide.id || progressStates[guide.id || ""] > 0
              ? "bg-blue-500 hover:bg-blue-500 text-white cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-600 text-white"
              }`}
          >
            <Play className="h-3 w-3 mr-2" />
            Activate
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => handleChatWithGuide(guide)}
            className={`flex-1 shadow-sm font-medium min-w-[120px]  hover:bg-emerald-600 text-white`}
          >
            <MessageSquare className="h-3 w-3" />
            Chat
          </Button>

          {/* Secondary Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="shadow-sm border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-3"
              >
                <Settings className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild className="flex items-center gap-2 text-sm">
                <Link href={`/guides/${guide.id}`}>
                  <Network className="h-3 w-3" />
                  View details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEditGuide(guide)}
                className="flex items-center gap-2 text-sm"
              >
                <Edit className="h-3 w-3" />
                Edit Guide
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAssignDataset(guide)}
                className="flex items-center gap-2 text-sm"
              >
                <Database className="h-3 w-3" />
                Assign Data Products
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleManageActions(guide)}
                className="flex items-center gap-2 text-sm"
              >
                <Settings className="h-3 w-3" />
                Manage Actions
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteGuide(guide)}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 text-red-600" />
                Delete Guide
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  if (error && (!guides || guides.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EFF4FF]">
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl rounded-[3rem] max-w-md w-full overflow-hidden">
          <div className="h-2 bg-red-500" />
          <CardContent className="pt-12 pb-16 text-center px-8">
            <div className="p-6 bg-red-50 rounded-3xl mx-auto w-fit mb-8 shadow-inner">
              <BotOff className="h-16 w-16 text-red-500" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4 italic uppercase tracking-tight">Something Went Wrong</h3>
            <p className="text-gray-500 mb-4 font-medium leading-relaxed">
              We encountered a technical issue while fetching your guides. Please try refreshing the page or check your connection.
            </p>
            {error ? (
              <p className="text-sm text-red-600/90 mb-10 font-mono bg-red-50 rounded-xl px-4 py-3 text-left break-words">
                {error}
              </p>
            ) : null}
            <Button 
              onClick={() => {
                fetchGuides();
              }}
              className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-500/20 transition-all active:scale-95"
            >
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageWrapper title="Guides">
      <TooltipProvider>
        <div className="min-h-screen bg-[#EFF4FF]">
        <div className="container mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
            <div className="relative z-10 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">Guides</h1>
                  <p className="text-blue-100 text-lg">
                    Manage guides for automated data processing and analysis
                  </p>
                </div>
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="bg-white text-indigo-600 hover:bg-gray-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Guide
                  </Button>
                  <Button
                    onClick={() => setUploadDocsDialogOpen(true)}
                    className="bg-white/10 text-white hover:bg-white/20 border border-white/30 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto backdrop-blur-md"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
              </div>
              <div className="pt-4 border-t border-white/20">
                <div className="flex items-center justify-center sm:justify-start">
                  <LLMSelector onConfigureClick={() => setLlmConfigDialogOpen(true)} />
                </div>
              </div>
            </div>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-white/80 hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-700 mb-1">Total Guides</p>
                    <p className="text-3xl font-bold text-blue-900">{guides?.length || 0}</p>
                  </div>
                  <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                    <Bot className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-white/80 hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 mb-1">Active Guides</p>
                    <p className="text-3xl font-bold text-emerald-900">
                      {activeGuides?.length || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-500 rounded-xl shadow-lg">
                    <Activity className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-white/80 hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-700 mb-1">With Data Products</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {guidesWithDatasets?.length || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500 rounded-xl shadow-lg">
                    <Database className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-white/80 hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-700 mb-1">Available Data Products</p>
                    <p className="text-3xl font-bold text-orange-900">{datasets?.length || 0}</p>
                  </div>
                  <div className="p-3 bg-orange-500 rounded-xl shadow-lg">
                    <Database className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Company Knowledge Documents */}
          <CompanyKnowledgeDocsPanel />

          {/* Guides List */}
          <Card className="shadow-none border-0 bg-transparent p-0 ">
            <CardContent className="p-0 sm:p-6 sm:pb-0">
              <Tabs defaultValue="all" className="space-y-12">
                <div className="flex justify-center items-center">
                  <TabsList className="bg-gray-200/70 p-1 rounded-xl shadow-inner">
                    <TabsTrigger
                      value="all"
                      className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      All Guides ({guides?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger
                      value="active"
                      className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      Active ({activeGuides?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger
                      value="inactive"
                      className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      Inactive ({inactiveGuides?.length || 0})
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="all" className="space-y-6">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="flex space-x-1 my-16">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-[bounce_1.4s_ease-in-out_infinite]"></div>
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-[bounce_1.4s_ease-in-out_0.2s_infinite]"></div>
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-[bounce_1.4s_ease-in-out_0.4s_infinite]"></div>
                      </div>
                    </div>
                  ) : (!guides || guides.length === 0) && !isLoading ? (
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-slate-100">
                      <CardContent className="pt-6 text-center py-16">
                        <div className="p-4 bg-gray-200 rounded-2xl mx-auto w-fit mb-6">
                          <Bot className="h-16 w-16 text-gray-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">No guides yet</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Create your first guide to start automating data processing tasks and
                          unlock intelligent insights
                        </p>
                        <Button
                          onClick={() => setCreateDialogOpen(true)}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Guide
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1  lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                      {guides?.map((guide) => (
                        <GuideCard key={guide.id || Math.random()} guide={guide} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="active" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                    {activeGuides?.map((guide) => (
                      <GuideCard key={guide.id || Math.random()} guide={guide} />
                    ))}
                  </div>
                  {(!activeGuides || activeGuides.length === 0) && (
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-100">
                      <CardContent className="pt-6 text-center py-12">
                        <Activity className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                        <p className="text-emerald-700 font-medium">No active guides</p>
                        <p className="text-emerald-600 text-sm mt-1">
                          Activate guides to start processing data
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="inactive" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                    {inactiveGuides?.map((guide) => (
                      <GuideCard key={guide.id || Math.random()} guide={guide} />
                    ))}
                  </div>
                  {(!inactiveGuides || inactiveGuides.length === 0) && (
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-gray-100">
                      <CardContent className="pt-6 text-center py-12">
                        <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-700 font-medium">No inactive guides</p>
                        <p className="text-gray-600 text-sm mt-1">
                          All your guides are currently working
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Dialogs */}
          <CreateGuideDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

          {selectedGuide && (
            <>
              <EditGuideDialog
                guide={selectedGuide}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
              />

              <AssignDatasetDialog
                guide={selectedGuide}
                open={assignDatasetDialogOpen}
                onOpenChange={setAssignDatasetDialogOpen}
              />

              <ManageActionsDialog
                guide={selectedGuide}
                open={manageActionsDialogOpen}
                onOpenChange={setManageActionsDialogOpen}
                onCreateCustomAction={() => handleCreateCustomAction(selectedGuide)}
              />

              <DeleteGuideDialog
                guide={selectedGuide}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
              />

              <GuideChatDialog
                key={selectedGuide.id}
                guide={selectedGuide}
                open={chatDialogOpen}
                onOpenChange={setChatDialogOpen}
              />

              <UpdateDatasetDialog
                guide={selectedGuide}
                open={updateDatasetDialogOpen}
                onOpenChange={setUpdateDatasetDialogOpen}
              />

              <CreateCustomActionDialog
                open={customActionDialogOpen}
                onOpenChange={setCustomActionDialogOpen}
                onActionCreate={handleCustomActionCreate}
                guideId={selectedGuide.id}
              />
            </>
          )}

          <UploadCompanyDocDialog
            open={uploadDocsDialogOpen}
            onOpenChange={setUploadDocsDialogOpen}
          />

          {/* LLM Configuration Dialog */}
          <LLMConfigurationDialog
            open={llmConfigDialogOpen}
            onOpenChange={setLlmConfigDialogOpen}
          />
        </div>
      </div>
      </TooltipProvider>
    </PageWrapper>
  );
}
