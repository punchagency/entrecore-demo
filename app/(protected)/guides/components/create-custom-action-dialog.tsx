"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { 
  Database, 
  Upload, 
  Settings, 
  X, 
  ChevronRight,
  Zap,
  Brain,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe } from "@/hooks/use-me";
import { useCompanyDatasets } from "@/hooks/use-datasets";

interface CustomActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionCreate?: (action: CustomAction) => void;
  guideId?: string;
}

interface DataSource {
  id: string;
  name: string;
  type: "connector" | "file" | "dataset";
  source: string; // "bigquery", "excel", "csv", etc.
  config?: any;
  file?: File;
}

interface CustomAction {
  name: string;
  description: string;
  type: "data_comparison" | "data_analysis" | "data_transformation" | "custom";
  dataSources: DataSource[];
  aiInstructions: string;
  outputFormat: "summary" | "detailed" | "visualization" | "all";
  schedule?: "manual" | "daily" | "weekly" | "monthly";
}

const ACTION_TEMPLATES = [
  {
    id: "data_comparison",
    title: "Data Comparison",
    description: "Compare data from different sources and identify discrepancies",
    icon: Database,
    example: "Compare NetSuite transactions with Excel financial records"
  },
  {
    id: "data_analysis",
    title: "Data Analysis",
    description: "Analyze data patterns and generate insights",
    icon: Brain,
    example: "Analyze sales trends from multiple data sources"
  },
  {
    id: "data_transformation",
    title: "Data Transformation",
    description: "Transform and clean data from various sources",
    icon: Zap,
    example: "Standardize customer data across different systems"
  },
  {
    id: "custom",
    title: "Custom Action",
    description: "Create a completely custom action with specific requirements",
    icon: Settings,
    example: "Define your own data processing workflow"
  }
];

export function CreateCustomActionDialog({ 
  open, 
  onOpenChange, 
  onActionCreate,
  guideId 
}: CustomActionDialogProps) {
  const { data: user } = useMe();
  const { data: datasets = [] } = useCompanyDatasets();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [actionTemplate, setActionTemplate] = useState<string>("");
  const [formData, setFormData] = useState<CustomAction>({
    name: "",
    description: "",
    type: "data_comparison",
    dataSources: [],
    aiInstructions: "",
    outputFormat: "summary",
    schedule: "manual"
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleTemplateSelect = (templateId: string) => {
    const template = ACTION_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setActionTemplate(templateId);
      setFormData(prev => ({
        ...prev,
        type: templateId as any,
        name: template.title,
        description: template.description
      }));
      setCurrentStep(2);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/json',
        'text/plain'
      ];
      return validTypes.includes(file.type) || file.name.endsWith('.csv');
    });

    if (validFiles.length !== files.length) {
      toast.error("Some files were rejected. Please upload Excel, CSV, JSON, or TXT files only.");
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
    
    // Add files as data sources
    const newDataSources: DataSource[] = validFiles.map(file => ({
      id: `file_${Date.now()}_${Math.random()}`,
      name: file.name,
      type: "file",
      source: file.type.includes('sheet') ? 'excel' : 
              file.type.includes('csv') ? 'csv' : 
              file.type.includes('json') ? 'json' : 'text',
      file
    }));

    setFormData(prev => ({
      ...prev,
      dataSources: [...prev.dataSources, ...newDataSources]
    }));
  };



  const handleDatasetSelect = (datasetId: string) => {
    const dataset = datasets.find(d => d.id === datasetId);
    if (!dataset) return;

    const newDataSource: DataSource = {
      id: `dataset_${datasetId}`,
      name: dataset.dataset_name,
      type: "dataset",
      source: "dataset",
      config: { dataset_id: datasetId }
    };

    setFormData(prev => ({
      ...prev,
      dataSources: [...prev.dataSources, newDataSource]
    }));
  };

  const removeDataSource = (sourceId: string) => {
    setFormData(prev => ({
      ...prev,
      dataSources: prev.dataSources.filter(ds => ds.id !== sourceId)
    }));
    
    // Remove from uploaded files if it's a file
    const dataSource = formData.dataSources.find(ds => ds.id === sourceId);
    if (dataSource?.type === "file") {
      setUploadedFiles(prev => prev.filter(f => f.name !== dataSource.name));
    }
  };

  const generateAIInstructions = () => {
    const template = ACTION_TEMPLATES.find(t => t.id === actionTemplate);
    if (!template) return;

    let instructions = "";
    
    switch (actionTemplate) {
      case "data_comparison":
        instructions = `Compare the data from ${formData.dataSources.length} sources and:
1. Identify any discrepancies or inconsistencies
2. Highlight missing data or duplicates
3. Provide recommendations for data reconciliation
4. Summarize key findings in a clear format

Focus on: accuracy, completeness, and data quality issues.`;
        break;
      case "data_analysis":
        instructions = `Analyze the provided data and:
1. Identify patterns and trends
2. Generate actionable insights
3. Highlight key metrics and KPIs
4. Provide recommendations based on findings

Focus on: business insights, performance metrics, and strategic recommendations.`;
        break;
      case "data_transformation":
        instructions = `Transform and clean the data by:
1. Standardizing formats and fields
2. Removing duplicates and errors
3. Enriching data where possible
4. Preparing data for analysis or integration

Focus on: data quality, standardization, and usability.`;
        break;
      default:
        instructions = "Analyze the provided data and provide insights based on the specific requirements.";
    }

    setFormData(prev => ({
      ...prev,
      aiInstructions: instructions
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description || formData.dataSources.length === 0) {
      toast.error("Please fill in all required fields and add at least one data source.");
      return;
    }

    try {
      // Here you would typically send the action to your backend
      // For now, we'll just call the callback
      onActionCreate?.(formData);
      
      toast.success("Custom action created successfully!");
      onOpenChange(false);
      
      // Reset form
      setCurrentStep(1);
      setFormData({
        name: "",
        description: "",
        type: "data_comparison",
        dataSources: [],
        aiInstructions: "",
        outputFormat: "summary",
        schedule: "manual"
      });
      setUploadedFiles([]);
    } catch (error) {
      toast.error("Failed to create custom action. Please try again.");
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Choose Action Type</h3>
        <p className="text-sm text-gray-600">Select the type of action you want to create</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACTION_TEMPLATES.map((template) => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              actionTemplate === template.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleTemplateSelect(template.id)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <template.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-sm mb-1">{template.title}</CardTitle>
                  <CardDescription className="text-xs">{template.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xs text-gray-500 italic">
                Example: {template.example}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Configure Data Sources</h3>
        <p className="text-sm text-gray-600">Select the data sources you want to work with</p>
      </div>

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Upload Files</CardTitle>
              <CardDescription className="text-xs">
                Upload Excel, CSV, JSON, or text files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv,.json,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload files or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports Excel, CSV, JSON, and text files
                  </p>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="datasets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Datasets</CardTitle>
              <CardDescription className="text-xs">
                Select from your existing datasets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {datasets.map((dataset) => (
                  <Button
                    key={dataset.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleDatasetSelect(dataset.id)}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    {dataset.dataset_name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selected Data Sources */}
      {formData.dataSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selected Data Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {formData.dataSources.map((source) => (
                <div key={source.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {source.type}
                    </Badge>
                    <span className="text-sm">{source.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDataSource(source.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Configure AI Analysis</h3>
        <p className="text-sm text-gray-600">Define how AI should process your data</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="action-name" className="text-sm mb-2">Action Name</Label>
          <Input
            id="action-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter action name"
          />
        </div>

        <div>
          <Label htmlFor="action-description" className="text-sm mb-2">Description</Label>
          <Textarea
            id="action-description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what this action does"
            rows={3}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="ai-instructions" className="text-sm mb-2">AI Instructions</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={generateAIInstructions}
            >
              <Brain className="h-4 w-4 mr-1" />
              Generate
            </Button>
          </div>
          <Textarea
            id="ai-instructions"
            value={formData.aiInstructions}
            onChange={(e) => setFormData(prev => ({ ...prev, aiInstructions: e.target.value }))}
            placeholder="Describe what you want the AI to do with your data"
            rows={6}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="output-format" className="text-sm mb-2">Output Format</Label>
            <Select
              value={formData.outputFormat}
              onValueChange={(value) => setFormData(prev => ({ ...prev, outputFormat: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Summary</SelectItem>
                <SelectItem value="detailed">Detailed Report</SelectItem>
                <SelectItem value="visualization">Visualization</SelectItem>
                <SelectItem value="all">All Formats</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="schedule" className="text-sm mb-2">Schedule</Label>
            <Select
              value={formData.schedule}
              onValueChange={(value) => setFormData(prev => ({ ...prev, schedule: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Review & Create</h3>
        <p className="text-sm text-gray-600">Review your custom action configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Action Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-gray-500">Name</Label>
            <p className="text-sm font-medium">{formData.name}</p>
          </div>
          
          <div>
            <Label className="text-xs text-gray-500">Description</Label>
            <p className="text-sm">{formData.description}</p>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Data Sources ({formData.dataSources.length})</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {formData.dataSources.map((source) => (
                <Badge key={source.id} variant="secondary" className="text-xs">
                  {source.name}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500">AI Instructions</Label>
            <p className="text-sm bg-gray-50 p-2 rounded text-gray-700">
              {formData.aiInstructions}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Output Format</Label>
              <p className="text-sm capitalize">{formData.outputFormat}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Schedule</Label>
              <p className="text-sm capitalize">{formData.schedule}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Action</DialogTitle>
        </DialogHeader>

        {/* Progress Steps - Full Width */}
        <div className="pl-26 py-4 border-b border-gray-100">
          <div className="flex items-center w-full">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1 ">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    step < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">

          {/* Step Content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            
            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={
                  (currentStep === 1 && !actionTemplate) ||
                  (currentStep === 2 && formData.dataSources.length === 0)
                }
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                Create Action
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 