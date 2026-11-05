"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGuidesStore, Guide, AGENT_TYPE_DESCRIPTIONS } from "@/app/store/aiAgentsStore";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info, Edit3, X } from "lucide-react";
import { useUserStore } from "@/app/store/userStore";
import { useCompaniesStore } from "@/app/store/companiesStore";
import { VerticalMultiSelect } from "@/components/vertical-multi-select";

interface CreateGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGuideDialog({ open, onOpenChange }: CreateGuideDialogProps) {
  const { addGuide, createGuideFromPrompt, updateGuide } = useGuidesStore();
  const { getActiveCompanyLLM } = useCompaniesStore();
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);
  const { user } = useUserStore();
  useEffect(() => {
    setSavedCompanyId(localStorage.getItem("selectedCompanyId") || user?.active_company || null);
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "data-analyst" as Guide["model_type"],
    ai_instructions: "",
    chat_enabled: false,
    use_tools: false,
    memory_enabled: false,
    data_processing: false,
    expected_persona: "",
    selected_verticals: [] as string[],
  });
  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createMode, setCreateMode] = useState<"manual" | "ai">("manual");
  const [generatedGuide, setGeneratedGuide] = useState<Guide | null>(null);
  const [isEditingGenerated, setIsEditingGenerated] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  console.log(editingGuide, "editingGuide");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createMode === "manual") {
      if (!formData.name.trim()) {
        toast.error("Guide name is required");
        return;
      }

      if (!formData.description.trim()) {
        toast.error("Guide description is required");
        return;
      }
    } else {
      if (!formData.ai_instructions.trim()) {
        toast.error("AI instructions are required");
        return;
      }
    }

    setIsLoading(true);

    try {
      // Get the selected LLM provider for the active company
      const selectedLLM = getActiveCompanyLLM();

      if (createMode === "ai") {
        await handleAICreation();
      } else {
        addGuide(
          {
            name: formData.name.trim(),
            description: formData.description.trim(),
            model_type: formData.type,
            model_version: "",
            vertical_keys: formData.selected_verticals.length > 0 ? formData.selected_verticals : undefined,
            metadata_config: {
              chat_enabled: formData.chat_enabled,
              use_tools: formData.use_tools,
              memory_enabled: formData.memory_enabled,
              data_processing: formData.data_processing,
              custom_prompts: {},
              tool_config: {
                max_query_rows: 0,
                enable_sql_querying: false,
              },
              model_settings: {
                temperature: 0,
                max_tokens: 0,
              },
            },
            model_metadata: "",
            status: "inactive",
            actions: [],
          } as any,
          selectedLLM || undefined
        );

        resetForm();
        onOpenChange(false);
      }
    } catch (error) {
      toast.error("Failed to create guide");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAICreation = async () => {
    const Instructions = {
      name: formData.name,
      prompt: formData.ai_instructions,
      expectedPersona: formData.expected_persona,
      company_id: savedCompanyId,
      vertical_keys: formData.selected_verticals.length > 0 ? formData.selected_verticals : undefined,
    };
    // Get the selected LLM provider for the active company
    const selectedLLM = getActiveCompanyLLM();
    const guide = await createGuideFromPrompt(
      JSON.stringify(Instructions),
      selectedLLM || undefined
    );
    console.log(guide);
    setGeneratedGuide(guide);
    setEditingGuide({ ...guide });
    toast.success("Guide generated successfully! Review and edit the configuration below.");
  };

  const handleSaveGeneratedGuide = async () => {
    if (!editingGuide) return;

    setIsLoading(true);
    try {
      await updateGuide(editingGuide.agent?.id!, editingGuide);
      toast.success("Guide configuration updated successfully!");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update guide configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setGeneratedGuide(null);
    setEditingGuide(null);
    setIsEditingGenerated(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "data-analyst" as Guide["model_type"],
      ai_instructions: "",
      chat_enabled: false,
      use_tools: false,
      memory_enabled: false,
      data_processing: false,
      expected_persona: "",
      selected_verticals: [],
    });
    setGeneratedGuide(null);
    setEditingGuide(null);
    setIsEditingGenerated(false);
    setAdvancedOptions(false);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditingGuideChange = (field: string, value: any) => {
    if (!editingGuide) return;
    setEditingGuide((prev) => {
      if (!prev) return prev;

      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        const parentValue = prev[parent as keyof Guide];
        return {
          ...prev,
          [parent]: {
            ...(typeof parentValue === "object" && parentValue !== null ? parentValue : {}),
            [child]: value,
          },
        };
      }

      return { ...prev, [field]: value };
    });
  };

  if (generatedGuide && editingGuide) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Review Generated Guide Configuration
            </DialogTitle>
            <DialogDescription>
              Review and customize the AI-generated guide configuration before finalizing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Guide Name</Label>
                  <Input
                    id="edit-name"
                    value={editingGuide?.agent?.name}
                    onChange={(e) => handleEditingGuideChange("agent.name", e.target.value)}
                    placeholder="Guide name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-agent-persona">Guide Type</Label>
                  <Input
                    id="edit-agent-persona"
                    value={editingGuide.model_type}
                    onChange={(e) => handleEditingGuideChange("model_type", e.target.value)}
                    placeholder="Guide type"
                  />
                </div>

                {/* <div className="space-y-2">
                  <Label htmlFor="edit-type">Guide Type</Label>
                  <Select
                    value={editingGuide.model_type}
                    onValueChange={(value) => handleEditingGuideChange("model_type", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AGENT_TYPE_DESCRIPTIONS).map(([key, { title }]) => (
                        <SelectItem key={key} value={key}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div> */}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingGuide.agent?.description}
                  onChange={(e) => handleEditingGuideChange("description", e.target.value)}
                  placeholder="Guide description"
                  rows={3}
                />
              </div>

              {editingGuide.generated_config?.agent_persona && (
                <div className="space-y-2">
                  <Label htmlFor="edit-persona">Guide Persona</Label>
                  <Input
                    id="edit-persona"
                    value={editingGuide.generated_config?.agent_persona}
                    onChange={(e) => handleEditingGuideChange("agent_persona", e.target.value)}
                    placeholder="Guide persona"
                  />
                </div>
              )}
            </div>

            {/* Metadata Configuration */}
            {editingGuide.metadata_config != null && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Advanced Configuration</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-chat-enabled"
                      checked={editingGuide.metadata_config.chat_enabled}
                      onCheckedChange={(checked) =>
                        handleEditingGuideChange("metadata_config.chat_enabled", checked)
                      }
                    />
                    <Label htmlFor="edit-chat-enabled">Chat Enabled</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-use-tools"
                      checked={editingGuide.metadata_config.use_tools}
                      onCheckedChange={(checked) =>
                        handleEditingGuideChange("metadata_config.use_tools", checked)
                      }
                    />
                    <Label htmlFor="edit-use-tools">Use Tools</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-memory-enabled"
                      checked={editingGuide.metadata_config.memory_enabled}
                      onCheckedChange={(checked) =>
                        handleEditingGuideChange("metadata_config.memory_enabled", checked)
                      }
                    />
                    <Label htmlFor="edit-memory-enabled">Memory Enabled</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit-data-processing"
                      checked={editingGuide.metadata_config.data_processing}
                      onCheckedChange={(checked) =>
                        handleEditingGuideChange("metadata_config.data_processing", checked)
                      }
                    />
                    <Label htmlFor="edit-data-processing">Data Processing</Label>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {editingGuide.actions && editingGuide.actions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configured Actions</h3>
                <div className="space-y-2">
                  {editingGuide.actions.map((action, index) => (
                    <div key={action.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{action.name}</h4>
                          <p className="text-sm text-gray-600">{action.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newActions = editingGuide.actions?.filter((_, i) => i !== index);
                            handleEditingGuideChange("actions", newActions);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Prompts */}
            {editingGuide.metadata_config?.custom_prompts &&
              Object.keys(editingGuide.metadata_config.custom_prompts).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Custom Prompts</h3>
                  <div className="space-y-2">
                    {Object.entries(editingGuide.metadata_config.custom_prompts).map(
                      ([key, value]) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={`prompt-${key}`}>{key}</Label>
                          <Textarea
                            id={`prompt-${key}`}
                            value={value}
                            onChange={(e) =>
                              handleEditingGuideChange("metadata_config.custom_prompts", {
                                ...(editingGuide.metadata_config?.custom_prompts || {}),
                                [key]: e.target.value,
                              })
                            }
                            rows={2}
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveGeneratedGuide}
              disabled={isLoading}
              className="bg-[#3064f6] hover:bg-[#2050d6]"
            >
              {isLoading ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Guide</DialogTitle>
          <DialogDescription>
            Create a new guide to automate data processing and analysis tasks.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={createMode} onValueChange={(value) => setCreateMode(value as "manual" | "ai")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Setup</TabsTrigger>
            <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-6">
            <TabsContent value="manual" className="space-y-4">
              {/* Guide Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Guide Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Sales Data Analyzer"
                  required
                />
              </div>

              {/* Guide Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Describe what this guide will do..."
                  rows={3}
                  required
                />
              </div>

              {/* Guide Type */}
              <div className="space-y-6">
                <Label htmlFor="type">Guide Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange("type", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AGENT_TYPE_DESCRIPTIONS).map(([key, { title }]) => (
                      <SelectItem key={key} value={key}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Type Description */}
                {formData.type &&
                  AGENT_TYPE_DESCRIPTIONS[
                    formData.type as keyof typeof AGENT_TYPE_DESCRIPTIONS
                  ] && (
                    <div
                      className={`p-3 rounded-lg border-l-4 transition-all duration-200 mt-6 ${
                        formData.type === "data-analyst"
                          ? "bg-blue-50 border-blue-300"
                          : formData.type === "data-quality"
                            ? "bg-emerald-50 border-emerald-300"
                            : formData.type === "automation"
                              ? "bg-purple-50 border-purple-300"
                              : formData.type === "insight-generator"
                                ? "bg-orange-50 border-orange-300"
                                : "bg-gray-50 border-gray-300"
                      }`}
                    >
                      <p
                        className={`text-sm leading-relaxed ${
                          formData.type === "data-analyst"
                            ? "text-blue-800"
                            : formData.type === "data-quality"
                              ? "text-emerald-800"
                              : formData.type === "automation"
                                ? "text-purple-800"
                                : formData.type === "insight-generator"
                                  ? "text-orange-800"
                                  : "text-gray-800"
                        }`}
                      >
                        {
                          AGENT_TYPE_DESCRIPTIONS[
                            formData.type as keyof typeof AGENT_TYPE_DESCRIPTIONS
                          ].description
                        }
                      </p>
                    </div>
                  )}
              </div>

              {/* Enterprise Vertical Tags */}
              <div className="space-y-2">
                <Label>Enterprise Verticals</Label>
                <VerticalMultiSelect
                  value={formData.selected_verticals}
                  onChange={(keys) => handleInputChange("selected_verticals", keys as any)}
                  placeholder="Tag guide with business verticals…"
                />
                <p className="text-xs text-slate-400">
                  Verticals help discover related data assets automatically.
                </p>
              </div>

              <div className="flex flex-row items-center justify-end space-x-2 my-8">
                <Label htmlFor="instructions">Advanced Options</Label>
                <Switch
                  id="instructions"
                  checked={advancedOptions}
                  onCheckedChange={() => setAdvancedOptions(!advancedOptions)}
                />
              </div>
              {advancedOptions && (
                <>
                  <div className=" flex flex-row items-center gap-x-2">
                    <Switch
                      id="instructions"
                      checked={formData?.use_tools}
                      onCheckedChange={() => handleInputChange("use_tools", !formData.use_tools)}
                    />
                    <Label htmlFor="instructions">Use Tools</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Use tools to enhance guide capabilities</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className=" flex flex-row items-center gap-x-2">
                    <Switch
                      id="instructions"
                      checked={formData?.memory_enabled}
                      onCheckedChange={() =>
                        handleInputChange("memory_enabled", !formData.memory_enabled)
                      }
                    />
                    <Label htmlFor="instructions">Memory Enabled</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Allows the agent to remember previous conversations for better context and
                          continuity.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className=" flex flex-row items-center gap-x-2">
                    <Switch
                      id="instructions"
                      checked={formData?.data_processing}
                      onCheckedChange={() =>
                        handleInputChange("data_processing", !formData.data_processing)
                      }
                    />
                    <Label htmlFor="instructions">Data Processing</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enable advanced data analysis and processing features for your agent.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className=" flex flex-row items-center gap-x-2">
                    <Switch
                      id="instructions"
                      checked={formData?.chat_enabled}
                      onCheckedChange={() =>
                        handleInputChange("chat_enabled", !formData.chat_enabled)
                      }
                    />
                    <Label htmlFor="instructions">Chat Enabled</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Allow users to interact with the agent via chat interface.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="ai" className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="name">Guide Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Marketing Analytics Guide"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected_persona">Expected Persona</Label>
                <Input
                  id="expected_person"
                  value={formData.expected_persona}
                  onChange={(e) => handleInputChange("expected_persona", e.target.value)}
                  placeholder="e.g., Marketing Analyst "
                  required
                />
              </div>
              <div className="space-y-4">
                <Label htmlFor="instructions" className="mt-8">
                  Describe Your Guide
                </Label>
                <Textarea
                  id="instructions"
                  value={formData.ai_instructions}
                  onChange={(e) => handleInputChange("ai_instructions", e.target.value)}
                  placeholder="e.g., Create a guide that analyzes monthly sales data from our CRM, identifies trends, and generates executive summaries with actionable insights..."
                  rows={6}
                  className="min-h-[120px]"
                />
                <p className="text-sm text-gray-500">
                  Be specific about what data sources, analysis types, and outputs you want. The AI
                  will configure the guide automatically.
                </p>
              </div>

              {/* Enterprise Vertical Tags (AI Tab) */}
              <div className="space-y-2">
                <Label>Enterprise Verticals</Label>
                <VerticalMultiSelect
                  value={formData.selected_verticals}
                  onChange={(keys) => handleInputChange("selected_verticals", keys as any)}
                  placeholder="Tag guide with business verticals…"
                />
                <p className="text-xs text-slate-400">
                  Verticals help discover related data assets automatically.
                </p>
              </div>
            </TabsContent>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              {createMode === "ai" && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const mockGuide = {
                      agent: {
                        id: "mock-" + Date.now(),
                        name: formData.name || "Market Insights Guide",
                        description: "AI-powered analyst specializing in market trends and consumer behavior identification.",
                      },
                      model_type: "insight-generator",
                      status: "inactive",
                      model_version: "1.0.0-demo",
                      agent_persona: "Marketing Executive",
                      specialization: "Predictive Analytics",
                      metadata_config: {
                        chat_enabled: true,
                        use_tools: true,
                        memory_enabled: true,
                        data_processing: true,
                        custom_prompts: {
                          "Executive Summary": "Focus on ROI and high-level growth drivers.",
                        },
                      },
                      actions: [
                        { id: "a1", name: "Market Pulse", description: "Real-time tracking of competitor price changes" },
                        { id: "a2", name: "Trend Forecast", description: "Predictive analysis for the next fiscal quarter" }
                      ],
                    };
                    setGeneratedGuide(mockGuide as any);
                    setEditingGuide({ ...mockGuide } as any);
                    toast.success("Demo Mode: Guide generated instantly!");
                  }}
                  className="text-[10px] text-gray-400 hover:text-blue-600 font-bold uppercase tracking-widest px-2"
                >
                  Demo Mode: skip AI
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#3064f6] hover:bg-[#2050d6]"
              >
                {isLoading
                  ? "Creating..."
                  : createMode === "ai"
                    ? "Generate Guide"
                    : "Create Guide"}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
