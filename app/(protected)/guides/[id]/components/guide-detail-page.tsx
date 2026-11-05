"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Database, Settings, Loader2, BotOff, ChevronLeft, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGuidesStore, Guide } from "@/app/store/aiAgentsStore";
import { Axios } from "@/app/config/axios";
import { useUserStore } from "@/app/store/userStore";
import { VerticalBadges } from "@/components/vertical-badges";
import { VerticalMultiSelect } from "@/components/vertical-multi-select";
import { SuggestedEntitiesPanel } from "@/components/suggested-entities-panel";
import { useGuideVerticals, useTagGuideVerticals } from "@/hooks/useVerticals";
import { GuideArchitectureView } from "./guide-architecture";

interface Dataset {
  id: string;
  dataset_name: string;
  description?: string;
  type?: string;
  status?: string;
}

interface GuideDetailPageProps {
  guideId: string;
}


const NO_VERTICALS: never[] = [];
export function GuideDetailPage({ guideId }: GuideDetailPageProps) {
  const router = useRouter();
  const params = useParams();
  const id = guideId || (params?.id as string);

  const { currentGuide, isLoadingGuide, guideError, fetchGuideById, clearCurrentGuide } =
    useGuidesStore();
  const { user } = useUserStore();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  // Guarded: this runs during server rendering too, where there is no localStorage.
  const companyId =
    (typeof window !== "undefined" ? localStorage.getItem("selectedCompanyId") : null) ||
    user?.active_company ||
    "";

  // Vertical tagging
  // A stable empty default: a fresh `[]` each render re-ran the effect below in a loop while loading.
  const { data: guideVerticals = NO_VERTICALS, isLoading: isLoadingVerticals } = useGuideVerticals(id);
  const tagVerticalsMutation = useTagGuideVerticals();
  const currentVerticalKeys = guideVerticals.map((v: any) => v.vertical_key);
  const [editingVerticals, setEditingVerticals] = useState(false);
  const [selectedVerticalKeys, setSelectedVerticalKeys] = useState<string[]>([]);

  useEffect(() => {
    setSelectedVerticalKeys(currentVerticalKeys);
  }, [guideVerticals]);

  // Fetch dataset details when guide is loaded
  useEffect(() => {
    const fetchDatasetDetails = async () => {
      if (
        currentGuide?.datasets &&
        Array.isArray(currentGuide.datasets) &&
        currentGuide.datasets.length > 0
      ) {
        setIsLoadingDatasets(true);
        try {
          const datasetPromises = currentGuide.datasets.map(async (datasetId: any) => {
            const id = typeof datasetId === "string" ? datasetId : datasetId.id || datasetId;
            try {
              const response = await Axios.get(
                `/data/metadata/datasets/${id}?company_id=${companyId}`
              );
              return response.data;
            } catch (error) {
              console.error(`Failed to fetch dataset ${id}:`, error);
              return {
                id: id,
                name: `Unknown Dataset (${id.slice(0, 8)}...)`,
                description: "Failed to load dataset details",
              };
            }
          });

          const datasetResults = await Promise.all(datasetPromises);
          setDatasets(datasetResults);
        } catch (error) {
          console.error("Error fetching dataset details:", error);
        } finally {
          setIsLoadingDatasets(false);
        }
      }
    };

    fetchDatasetDetails();
  }, [currentGuide]);

  useEffect(() => {
    if (id) {
      fetchGuideById(id);
    }

    return () => {
      clearCurrentGuide();
      setDatasets([]);
    };
  }, [id, fetchGuideById, clearCurrentGuide]);

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (guideError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center py-16">
            <div className="p-4 bg-gray-100 rounded-full mx-auto w-fit mb-6">
              <BotOff className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Something Went Wrong</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Sorry we're having some technical issues. Try refreshing the page.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => fetchGuideById(id)} size="sm">
                Retry
              </Button>
              <Link href="/data-room/catalog">
                <Button variant="outline" size="sm">
                  Back to Catalog
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingGuide || !currentGuide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading guide details...</p>
        </div>
      </div>
    );
  }

  const guide = currentGuide;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <div className="flex items-center justify-between py-4 md:py-6 px-4 md:px-6 lg:px-8 border-b border-gray-200">
        <h1 className="flex items-center gap-1 md:gap-2 text-sm md:text-base lg:text-lg xl:text-xl font-bold">
          <Link href="/data-room" className="flex items-center gap-2">
            <ChevronLeft color="#000000" className="w-6 h-6 md:w-8 md:h-8" />
            Guides
          </Link>
        </h1>
      </div>
      <div className="mx-auto p-6">
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Bot className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{guide.name}</h1>
                  <p className="text-gray-600 mb-3">{guide.description}</p>
                  {/* Vertical badges */}
                  {currentVerticalKeys.length > 0 && (
                    <div className="mt-3">
                      <VerticalBadges verticalKeys={currentVerticalKeys} max={5} size="md" showTooltips />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simple Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Data Products</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {isLoadingDatasets ? "Loading..." : datasets.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Settings className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Actions</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {guide.actions?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Bot className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {guide.status || "inactive"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Guide Details */}
        <div className="space-y-6">
          {/* Agentic architecture: the steps and tools behind each answer */}
          <GuideArchitectureView guide={guide} guideId={id} />

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Agent Persona</label>
                  <p className="text-gray-900 capitalize">
                    {guide.agent_persona?.replace("-", " ") || "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Specialization</label>
                  <p className="text-gray-900 capitalize">
                    {guide.specialization?.replace("-", " ") || "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Technical Level</label>
                  <p className="text-gray-900 capitalize">
                    {guide.technical_level || "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-gray-900">
                    {guide.created_at ? new Date(guide.created_at).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enterprise Verticals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600" />
                  Enterprise Verticals
                </CardTitle>
                {!editingVerticals ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingVerticals(true)}
                  >
                    Edit Verticals
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingVerticals(false);
                        setSelectedVerticalKeys(currentVerticalKeys);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={tagVerticalsMutation.isPending}
                      onClick={() => {
                        tagVerticalsMutation.mutate(
                          { guideId: id, verticalKeys: selectedVerticalKeys },
                          { onSuccess: () => setEditingVerticals(false) }
                        );
                      }}
                    >
                      {tagVerticalsMutation.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingVerticals ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-500">Loading verticals…</span>
                </div>
              ) : editingVerticals ? (
                <VerticalMultiSelect
                  value={selectedVerticalKeys}
                  onChange={setSelectedVerticalKeys}
                  placeholder="Select enterprise verticals…"
                />
              ) : currentVerticalKeys.length > 0 ? (
                <VerticalBadges
                  verticalKeys={currentVerticalKeys}
                  max={14}
                  size="md"
                  showTooltips
                />
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No enterprise verticals assigned.
                  <button
                    onClick={() => setEditingVerticals(true)}
                    className="text-blue-600 font-semibold ml-1 hover:underline"
                  >
                    Add verticals
                  </button>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Suggested Data Assets */}
          {currentVerticalKeys.length > 0 && (
            <SuggestedEntitiesPanel guideId={id} />
          )}

          {/* Connected Data Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Connected Data Products</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingDatasets ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading data products details...</span>
                </div>
              ) : datasets.length > 0 ? (
                <div className="space-y-2">
                  {datasets.map((dataset) => (
                    <div
                      key={dataset.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Database className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{dataset.dataset_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No data products connected</p>
              )}
            </CardContent>
          </Card>

          {/* Configured Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configured Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {guide.actions && guide.actions.length > 0 ? (
                <div className="space-y-2">
                  {guide.actions.map((action: any) => (
                    <div key={action.id} className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">{action.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No actions configured</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
