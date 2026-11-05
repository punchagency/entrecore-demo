"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, ChevronDown, ChevronRight, Plus, X, Info } from "lucide-react";
import { useGuidesStore, Guide, AVAILABLE_ACTIONS, GuideAction } from "@/app/store/aiAgentsStore";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ManageActionsDialogProps {
  guide: Guide;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCustomAction?: () => void;
}

export function ManageActionsDialog({ guide, open, onOpenChange, onCreateCustomAction }: ManageActionsDialogProps) {
  const { updateGuideActions } = useGuidesStore();
  
  const [selectedActions, setSelectedActions] = useState<GuideAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [customParameters, setCustomParameters] = useState<Record<string, { key: string; value: string }>>({});
  const [isSimpleMode, setIsSimpleMode] = useState(true); // Default to simple mode
  const [expandedSimpleActions, setExpandedSimpleActions] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'actions' | 'ai'>('actions');

  // Quick Custom Action prompt state
  const [prompt, setPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptResult, setPromptResult] = useState<string | null>(null);

  // Simple mode action categories
  const SIMPLE_ACTIONS = [
    {
      id: 'check-data-quality',
      name: 'Check Data Quality',
      description: 'Make sure your data is clean and accurate',
    
      actions: ['data-quality-check', 'data-validation'],
      benefits: 'Find errors and missing information in your data',
      briefDescription: 'This guide scans through your data to identify inconsistencies, missing values, duplicate entries, and formatting issues. It checks if your data meets quality standards and provides detailed reports on what needs to be fixed. Perfect for ensuring your business decisions are based on reliable information.'
    },
    {
      id: 'find-patterns',
      name: 'Find Patterns & Trends',
      description: 'Discover what your data is telling you',
      actions: ['trend-analysis', 'correlation-analysis'],
      benefits: 'Understand trends and relationships in your business data',
      briefDescription: 'This guide analyzes your data over time to identify meaningful patterns, seasonal trends, and relationships between different metrics. It can show you how sales relate to marketing campaigns, customer behavior patterns, or predict future trends based on historical data.'
    },
    {
      id: 'spot-unusual',
      name: 'Spot Unusual Activity',
      description: 'Get alerts when something looks different',
    
      actions: ['anomaly-detection'],
      benefits: 'Catch problems or opportunities early',
      briefDescription: 'This guide continuously monitors your data for unusual patterns or unexpected changes that might indicate problems or opportunities. It learns what "normal" looks like for your business and alerts you when something significant happens - like a sudden spike in orders or unusual customer behavior.'
    },
    {
      id: 'get-insights',
      name: 'Get Smart Insights',
      description: 'Let AI explain what your data means',
    
      actions: ['automated-insights', 'data-profiling'],
      benefits: 'Get easy-to-understand explanations of your data',
      briefDescription: 'This guide uses AI to automatically discover interesting insights in your data and explains them in plain English. It can identify key drivers of your business performance, suggest areas for improvement, and provide actionable recommendations based on data patterns.'
    },
    {
      id: 'create-reports',
      name: 'Create Reports',
      description: 'Generate beautiful reports automatically',
      actions: ['report-generation'],
      benefits: 'Save time with automated, professional reports',
      briefDescription: 'This guide creates professional reports and dashboards automatically from your data. You can schedule weekly, monthly, or custom reports that include charts, summaries, and key metrics. Perfect for sharing insights with your team or stakeholders without manual work.'
    }
  ];

  useEffect(() => {
    if (guide.actions) {
      setSelectedActions([...guide.actions]);
    } else {
      setSelectedActions([]);
    }
  }, [guide.actions]);

  const handleActionToggle = (action: GuideAction, checked: boolean) => {
    if (checked) {
      // Add action with default parameters if not already present
      if (!selectedActions.some(a => a.id === action.id)) {
        const newAction: GuideAction = {
          ...action,
          parameters: action.parameters || getDefaultParameters(action.id)
        };
        setSelectedActions(prev => [...prev, newAction]);
      }
    } else {
      // Remove action
      setSelectedActions(prev => prev.filter(a => a.id !== action.id));
      // Collapse if expanded
      setExpandedActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(action.id);
        return newSet;
      });
    }
  };

  const getDefaultParameters = (actionId: string): Record<string, any> => {
    switch (actionId) {
      case 'data-quality-check':
        return {
          threshold: 0.95,
          check_nulls: true,
          check_duplicates: true,
          check_schema: true
        };
      case 'trend-analysis':
        return {
          time_period: '30d',
          confidence_level: 0.95,
          include_forecast: false
        };
      case 'anomaly-detection':
        return {
          sensitivity: 'medium',
          method: 'statistical',
          notification_threshold: 'high'
        };
      case 'data-profiling':
        return {
          include_statistics: true,
          include_distributions: true,
          sample_size: 10000
        };
      case 'correlation-analysis':
        return {
          correlation_threshold: 0.7,
          method: 'pearson',
          include_p_values: true
        };
      case 'automated-insights':
        return {
          insight_types: ['trends', 'outliers', 'patterns'],
          min_confidence: 0.8,
          max_insights: 10
        };
      case 'data-validation':
        return {
          rules: ['format', 'range', 'consistency'],
          strict_mode: false,
          auto_fix: false
        };
      case 'report-generation':
        return {
          format: 'pdf',
          include_charts: true,
          schedule: 'weekly',
          recipients: []
        };
      default:
        return {};
    }
  };

  const updateActionParameters = (actionId: string, key: string, value: any) => {
    setSelectedActions(prev => 
      prev.map(action => 
        action.id === actionId 
          ? { 
              ...action, 
              parameters: { 
                ...action.parameters, 
                [key]: value 
              } 
            }
          : action
      )
    );
  };

  const addCustomParameter = (actionId: string) => {
    const customKey = `${actionId}_custom_${Date.now()}`;
    setCustomParameters(prev => ({
      ...prev,
      [customKey]: { key: '', value: '' }
    }));
  };

  const updateCustomParameter = (customKey: string, field: 'key' | 'value', newValue: string) => {
    setCustomParameters(prev => ({
      ...prev,
      [customKey]: {
        ...prev[customKey],
        [field]: newValue
      }
    }));
  };

  const saveCustomParameter = (actionId: string, customKey: string) => {
    const customParam = customParameters[customKey];
    if (customParam.key && customParam.value) {
      // Try to parse as number or boolean, otherwise keep as string
      let parsedValue: any = customParam.value;
      if (customParam.value === 'true') parsedValue = true;
      else if (customParam.value === 'false') parsedValue = false;
      else if (!isNaN(Number(customParam.value)) && customParam.value !== '') parsedValue = Number(customParam.value);

      updateActionParameters(actionId, customParam.key, parsedValue);
      
      // Remove from custom parameters
      setCustomParameters(prev => {
        const newCustomParams = { ...prev };
        delete newCustomParams[customKey];
        return newCustomParams;
      });
    }
  };

  const removeCustomParameter = (customKey: string) => {
    setCustomParameters(prev => {
      const newCustomParams = { ...prev };
      delete newCustomParams[customKey];
      return newCustomParams;
    });
  };

  const removeActionParameter = (actionId: string, paramKey: string) => {
    setSelectedActions(prev => 
      prev.map(action => 
        action.id === actionId 
          ? { 
              ...action, 
              parameters: Object.fromEntries(
                Object.entries(action.parameters || {}).filter(([key]) => key !== paramKey)
              )
            }
          : action
      )
    );
  };

  const handleSaveActions = async () => {
    setIsLoading(true);
    
    try {
      updateGuideActions(guide.id || '', selectedActions);
      toast.success(
        `Actions updated for "${guide.name}". ${selectedActions.length} actions configured.`
      );
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update actions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllActions = () => {
    setSelectedActions([]);
    setExpandedActions(new Set());
  };

  const handleSelectAllActions = () => {
    const allActionsWithDefaults = AVAILABLE_ACTIONS.map(action => ({
      ...action,
      parameters: action.parameters || getDefaultParameters(action.id)
    }));
    setSelectedActions(allActionsWithDefaults);
  };

  const isActionSelected = (actionId: string) => {
    return selectedActions.some(a => a.id === actionId);
  };

  // Simple mode functions
  const isSimpleActionSelected = (simpleActionId: string) => {
    const simpleAction = SIMPLE_ACTIONS.find(sa => sa.id === simpleActionId);
    if (!simpleAction) return false;
    return simpleAction.actions.some(actionId => isActionSelected(actionId));
  };

  const handleSimpleActionToggle = (simpleAction: any, checked: boolean) => {
    if (checked) {
      // Add all actions in this simple category
      simpleAction.actions.forEach((actionId: string) => {
        const action = AVAILABLE_ACTIONS.find(a => a.id === actionId);
        if (action && !isActionSelected(actionId)) {
          handleActionToggle(action, true);
        }
      });
    } else {
      // Remove all actions in this simple category
      simpleAction.actions.forEach((actionId: string) => {
        const action = AVAILABLE_ACTIONS.find(a => a.id === actionId);
        if (action && isActionSelected(actionId)) {
          handleActionToggle(action, false);
        }
      });
    }
  };

  const toggleSimpleActionExpansion = (simpleActionId: string) => {
    setExpandedSimpleActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(simpleActionId)) {
        newSet.delete(simpleActionId);
      } else {
        newSet.add(simpleActionId);
      }
      return newSet;
    });
  };

  const toggleActionExpansion = (actionId: string) => {
    setExpandedActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  };

  const renderParameterInput = (actionId: string, key: string, value: any) => {
    const selectedAction = selectedActions.find(a => a.id === actionId);
    if (!selectedAction) return null;

    const currentValue = selectedAction.parameters?.[key] ?? value;

    // Handle different parameter types
    if (typeof value === 'boolean') {
      return (
        <Select
          value={currentValue.toString()}
          onValueChange={(val) => updateActionParameters(actionId, key, val === 'true')}
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (typeof value === 'number') {
      return (
        <Input
          type="number"
          value={currentValue}
          onChange={(e) => updateActionParameters(actionId, key, parseFloat(e.target.value) || 0)}
          className="h-8"
        />
      );
    }

    if (Array.isArray(value)) {
      return (
        <Input
          value={Array.isArray(currentValue) ? currentValue.join(', ') : ''}
          onChange={(e) => updateActionParameters(actionId, key, e.target.value.split(', ').filter(Boolean))}
          placeholder="Enter comma-separated values"
          className="h-8"
        />
      );
    }

    // Handle special cases based on key name
    if (key === 'sensitivity') {
      return (
        <Select
          value={currentValue}
          onValueChange={(val) => updateActionParameters(actionId, key, val)}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (key === 'method' && actionId === 'anomaly-detection') {
      return (
        <Select
          value={currentValue}
          onValueChange={(val) => updateActionParameters(actionId, key, val)}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="statistical">Statistical</SelectItem>
            <SelectItem value="machine-learning">Machine Learning</SelectItem>
            <SelectItem value="isolation-forest">Isolation Forest</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (key === 'format' && actionId === 'report-generation') {
      return (
        <Select
          value={currentValue}
          onValueChange={(val) => updateActionParameters(actionId, key, val)}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="excel">Excel</SelectItem>
            <SelectItem value="html">HTML</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Default to text input
    return (
      <Input
        value={currentValue?.toString() || ''}
        onChange={(e) => updateActionParameters(actionId, key, e.target.value)}
        className="h-8"
      />
    );
  };

  // Handler for running the quick prompt
  const handleRunPrompt = async () => {
    if (!prompt.trim()) return;
    setPromptLoading(true);
    setPromptResult(null);
    try {
      // TODO: Integrate with agent execution logic (API call or function)
      // Example: await runAgentPrompt(guide, prompt);
      setTimeout(() => {
        setPromptResult("Prompt sent to agent: " + prompt);
        setPromptLoading(false);
      }, 1200);
    } catch (err) {
      setPromptResult("Failed to run prompt. Try again.");
      setPromptLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-[800px] h-[75vh] sm:h-auto sm:max-h-[85vh] p-3 sm:p-6 overflow-y-auto">
        <DialogHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between  gap-4">
            <div className="flex-1">
              <DialogTitle className="text-lg sm:text-xl mt-6 sm:mt-0">
                {tab === 'actions' ? `Configure "${guide.name}" Guide` : `AI Assistant for "${guide.name}"`}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {tab === 'actions'
                  ? (isSimpleMode 
                      ? "Select the tasks you want this guide to perform automatically"
                      : "Select actions and configure their parameters for this guide.")
                  : "Describe what you want the agent to do. This will not be saved—it's a one-time instruction."
                }
              </DialogDescription>
            </div>
            {/* Mode Toggle */}
            <div className="flex gap-2 mr-8 ml-auto sm:ml-0">
                <Switch
                  id="mode-toggle"
                  checked={!isSimpleMode}
                  onCheckedChange={(checked) => setIsSimpleMode(!checked)}
                  className="data-[state=checked]:bg-blue-600"
                />
                <div className={`flex items-center gap-2 transition-colors ${!isSimpleMode ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  <span className="text-sm">Advanced Settings</span>
                </div>
              </div>
          </div>
        </DialogHeader>
        <Tabs value={tab} onValueChange={v => setTab(v as 'actions' | 'ai')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="actions">Configure Actions</TabsTrigger>
            <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          </TabsList>
          <TabsContent value="actions">
            {/* Quick Custom Action Prompt UI */}

            
            <div className="space-y-3 sm:space-y-4 flex-1 overflow-hidden">
              {/* Action Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Settings className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">
                      {isSimpleMode 
                        ? `${SIMPLE_ACTIONS.filter(sa => isSimpleActionSelected(sa.id)).length} of ${SIMPLE_ACTIONS.length} tasks selected`
                        : `${selectedActions.length} of ${AVAILABLE_ACTIONS.length} actions selected`
                      }
                    </span>
                    <p className="text-xs text-gray-600">
                      {isSimpleMode 
                        ? "Choose what tasks you want this guide to perform"
                        : "Choose and configure actions for this guide"
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearAllActions}
                    disabled={selectedActions.length === 0}
                    className="border-gray-300 hover:border-gray-400 text-xs sm:text-sm"
                  >
                    Clear All
                  </Button>
                  {!isSimpleMode && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSelectAllActions}
                      disabled={selectedActions.length === AVAILABLE_ACTIONS.length}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs sm:text-sm"
                    >
                      Select All
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onCreateCustomAction?.();
                      onOpenChange(false);
                    }}
                    className="border-green-300 text-green-700 hover:bg-green-50 text-xs sm:text-sm"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Custom Action
                  </Button>
                </div>
              </div>

              {/* Simple Mode Interface */}
              {isSimpleMode ? (
                <ScrollArea className="h-[calc(100vh-280px)] sm:h-[35vh] w-full pr-2 sm:pr-4">
                  <div className="space-y-3">
                    {SIMPLE_ACTIONS.map((simpleAction) => (
                      <Card 
                        key={simpleAction.id} 
                        className={`transition-all border-2 ${
                          isSimpleActionSelected(simpleAction.id) 
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <CardHeader className="pb-2 px-6 py-4">
                          <div 
                            className="flex items-start space-x-3 cursor-pointer"
                            onClick={() => handleSimpleActionToggle(simpleAction, !isSimpleActionSelected(simpleAction.id))}
                          >
                            {/* Visual selection indicator */}
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                              isSimpleActionSelected(simpleAction.id)
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300'
                            }`}>
                              {isSimpleActionSelected(simpleAction.id) && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  
                                  <CardTitle className="text-sm truncate">{simpleAction.name}</CardTitle>
                                  {isSimpleActionSelected(simpleAction.id) && (
                                    <Badge variant="default" className="text-xs bg-blue-600">
                                      Selected
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSimpleActionExpansion(simpleAction.id);
                                  }}
                                  className="h-6 w-6 p-0 self-end sm:self-auto"
                                >
                                  {expandedSimpleActions.has(simpleAction.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <CardDescription className="text-xs mt-1 line-clamp-2 sm:line-clamp-none">
                                {simpleAction.description}
                              </CardDescription>
                            </div>
                          </div>
                          
                          {/* Accordion Content */}
                          {expandedSimpleActions.has(simpleAction.id) && (
                            <div className="mt-4 pl-8 space-y-3">
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex items-start gap-2">
                                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-blue-900 text-xs font-medium mb-1">What this does:</p>
                                    <p className="text-blue-700 text-xs">{simpleAction.benefits}</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="text-gray-600 text-xs font-medium mb-2">More details:</p>
                                <p className="text-gray-700 text-xs leading-relaxed">
                                  {simpleAction.briefDescription}
                                </p>
                              </div>
                            </div>
                          )}
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                // Technical Mode Interface  
                <ScrollArea className="h-[calc(100vh-280px)] sm:h-[35vh] w-full pr-2 sm:pr-4">
                  <div className="space-y-2 sm:space-y-3">
                  {AVAILABLE_ACTIONS.map((action) => (
                    <Card 
                      key={action.id} 
                      className={`transition-all border-2 ${
                        isActionSelected(action.id) 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <CardHeader className="pb-2 px-2 sm:px-6 py-3 sm:py-4">
                        <div 
                          className="flex items-start space-x-2 sm:space-x-3 cursor-pointer"
                          onClick={() => handleActionToggle(action, !isActionSelected(action.id))}
                        >
                          {/* Visual selection indicator */}
                          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                            isActionSelected(action.id)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {isActionSelected(action.id) && (
                              <svg
                                className="w-2 h-2 sm:w-3 sm:h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <CardTitle className="text-sm truncate">{action.name}</CardTitle>
                                {isActionSelected(action.id) && (
                                  <Badge variant="default" className="text-xs bg-blue-600 w-fit">
                                    Selected
                                  </Badge>
                                )}
                              </div>
                              {isActionSelected(action.id) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleActionExpansion(action.id);
                                  }}
                                  className="h-6 w-6 p-0 self-end sm:self-auto"
                                >
                                  {expandedActions.has(action.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                            <CardDescription className="text-xs mt-1 line-clamp-2 sm:line-clamp-none">
                              {action.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      
                      {isActionSelected(action.id) && expandedActions.has(action.id) && (
                        <CardContent className="pt-0 px-2 sm:px-6 pb-3 sm:pb-6">
                          <div className="space-y-3 sm:space-y-4 p-2 sm:p-3 bg-gray-50 rounded-lg border">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <Label className="text-xs font-semibold text-gray-700">
                                Action Parameters
                              </Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addCustomParameter(action.id)}
                                className="h-6 text-xs w-fit"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Custom
                              </Button>
                            </div>
                            
                            {/* Default Parameters */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {Object.entries(getDefaultParameters(action.id)).map(([key, value]) => (
                                <div key={key} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-gray-600 capitalize truncate">
                                      {key.replace(/_/g, ' ')}
                                      {key === 'threshold' && (
                                        <span className="ml-1 text-blue-600 cursor-help" title="Threshold is the minimum acceptable quality score (0-1). For example, 0.95 means 95% data quality is required.">
                                          ℹ️
                                        </span>
                                      )}
                                    </Label>
                                  </div>
                                  {renderParameterInput(action.id, key, value)}
                                </div>
                              ))}
                            </div>

                            {/* Custom Parameters */}
                            {Object.entries(customParameters)
                              .filter(([customKey]) => customKey.startsWith(action.id))
                              .map(([customKey, customParam]) => (
                                <div key={customKey} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Parameter Name</Label>
                                    <Input
                                      placeholder="e.g., custom_rule"
                                      value={customParam.key}
                                      onChange={(e) => updateCustomParameter(customKey, 'key', e.target.value)}
                                      className="h-8"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Parameter Value</Label>
                                    <div className="flex gap-1">
                                      <Input
                                        placeholder="e.g., true, 100, or text"
                                        value={customParam.value}
                                        onChange={(e) => updateCustomParameter(customKey, 'value', e.target.value)}
                                        className="h-8 flex-1"
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => saveCustomParameter(action.id, customKey)}
                                        disabled={!customParam.key || !customParam.value}
                                        className="h-8 px-2"
                                      >
                                        ✓
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeCustomParameter(customKey)}
                                        className="h-8 px-2 text-red-600 hover:text-red-700"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}

                            {/* Current Action Parameters */}
                            {selectedActions.find(a => a.id === action.id)?.parameters && 
                             Object.keys(selectedActions.find(a => a.id === action.id)?.parameters || {}).length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-700">
                                  Current Parameters
                                </Label>
                                <div className="space-y-1">
                                  {Object.entries(selectedActions.find(a => a.id === action.id)?.parameters || {}).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {key}
                                        </Badge>
                                        <span className="text-gray-600">
                                          {typeof value === 'object' 
                                            ? JSON.stringify(value) 
                                            : value?.toString()
                                          }
                                        </span>
                                      </div>
                                      {!Object.keys(getDefaultParameters(action.id)).includes(key) && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeActionParameter(action.id, key)}
                                          className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              )}

              {/* Selected Actions Preview */}
              {selectedActions.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Selected Actions Summary</Label>
                  <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {selectedActions.map((action) => (
                        <Badge 
                          key={action.id} 
                          variant="default"
                          className="text-xs bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                          {action.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      {selectedActions.length} action{selectedActions.length !== 1 ? 's' : ''} configured
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="ai">
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <Label htmlFor="quick-custom-action" className="font-semibold mb-1 block">AI Assistant</Label>
              <p className="text-xs text-gray-500 mb-2">Describe what you want the agent to do. This will not be saved—it's a one-time instruction.</p>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <Textarea
                  id="quick-custom-action"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="e.g. Summarize the latest sales data for Q2 and highlight any anomalies."
                  className="flex-1 min-h-[80px] max-h-24"
                  disabled={promptLoading}
                />
              </div>
              <Button
                  onClick={handleRunPrompt}
                  disabled={promptLoading || !prompt.trim()}
                  className="self-end sm:self-auto min-w-[100px] w-full mt-8"
                  variant="default"
                >
                  {promptLoading ? "Executing..." : "Execute Action"}
                </Button>
              {promptResult && (
                <div className="mt-2 text-xs text-blue-700">{promptResult}</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        {tab === 'actions' && <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 sm:pt-6 border-t sm:border-t-0 mt-4 sm:mt-0">
        
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveActions}
            disabled={isLoading}
            className="bg-[#3064f6] hover:bg-[#2050d6] w-full sm:w-auto"
          >
            {isLoading ? "Saving..." : "Save Actions"}
          </Button>
        </div>}
      </DialogContent>
    </Dialog>
  );
} 