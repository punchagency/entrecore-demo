"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, FileText, Database, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSuggestMappings, useCreateIntegrationJob } from "../hooks/use-data-integrations";
import { toast } from "sonner";

export default function CreateIntegrationPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  
  // AI Form
  const [aiJobName, setAiJobName] = useState("");
  const [aiSourceTable, setAiSourceTable] = useState("");
  const [aiDestTable, setAiDestTable] = useState("");
  
  // Manual Form
  const [manualJobName, setManualJobName] = useState("");
  const [manualSourceTable, setManualSourceTable] = useState("");
  const [manualDestTable, setManualDestTable] = useState("");

  const suggestMutation = useSuggestMappings();
  const createMutation = useCreateIntegrationJob();

  const handleAISuggest = (e: React.FormEvent) => {
    e.preventDefault();
    suggestMutation.mutate(
      {
        job_name: aiJobName,
        source_table_name: aiSourceTable,
        destination_table: aiDestTable,
      },
      {
        onSuccess: (data) => {
          toast.success("Mappings generated successfully!");
          router.push(`/data-room/integrations/${data.job_id}`);
        },
        onError: () => {
          toast.error("Failed to generate mappings");
        }
      }
    );
  };

  const handleManualCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        name: manualJobName,
        destination_table: manualDestTable,
        source_table: manualSourceTable,
        source_type: "connector",
        integration_type: "csv_generic",
      },
      {
        onSuccess: (data) => {
          toast.success("Draft job created");
          router.push(`/data-room/integrations/${data.id}`);
        },
        onError: () => {
          toast.error("Failed to create draft job");
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full hover:bg-white"
          onClick={() => router.push("/data-room/integrations")}
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Button>
        <h1 className="text-2xl font-black text-slate-900 uppercase">Create Integration</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          className={`cursor-pointer rounded-3xl border-2 transition-all ${mode === 'ai' ? 'border-violet-500 shadow-xl shadow-violet-200 bg-violet-50/30' : 'border-transparent bg-white hover:border-slate-200'}`}
          onClick={() => setMode('ai')}
        >
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-300">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">AI Suggested Mapping</h3>
              <p className="text-sm text-slate-500 mt-2">Let the neural agent inspect the catalog and generate mappings automatically.</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer rounded-3xl border-2 transition-all ${mode === 'manual' ? 'border-blue-500 shadow-xl shadow-blue-200 bg-blue-50/30' : 'border-transparent bg-white hover:border-slate-200'}`}
          onClick={() => setMode('manual')}
        >
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-300">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Manual Configuration</h3>
              <p className="text-sm text-slate-500 mt-2">Start from scratch and manually map tables and fields.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        {mode === 'ai' ? (
          <form onSubmit={handleAISuggest} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ai-name" className="text-sm font-bold uppercase tracking-wider text-slate-500">Job Name</Label>
              <Input 
                id="ai-name"
                value={aiJobName}
                onChange={(e) => setAiJobName(e.target.value)}
                placeholder="e.g. Sync Employees from Workday"
                className="h-12 rounded-xl bg-slate-50 border-slate-200"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="ai-src" className="text-sm font-bold uppercase tracking-wider text-slate-500">Source Table</Label>
                <Input 
                  id="ai-src"
                  value={aiSourceTable}
                  onChange={(e) => setAiSourceTable(e.target.value)}
                  placeholder="e.g. stg_employees"
                  className="h-12 rounded-xl bg-slate-50 border-slate-200"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-dst" className="text-sm font-bold uppercase tracking-wider text-slate-500">Destination Table</Label>
                <Input 
                  id="ai-dst"
                  value={aiDestTable}
                  onChange={(e) => setAiDestTable(e.target.value)}
                  placeholder="e.g. int_employees_clean"
                  className="h-12 rounded-xl bg-slate-50 border-slate-200"
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-200"
              disabled={suggestMutation.isPending}
            >
              {suggestMutation.isPending ? "Generating..." : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generate Mappings</>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleManualCreate} className="space-y-6">
             <div className="space-y-2">
              <Label htmlFor="man-name" className="text-sm font-bold uppercase tracking-wider text-slate-500">Job Name</Label>
              <Input 
                id="man-name"
                value={manualJobName}
                onChange={(e) => setManualJobName(e.target.value)}
                placeholder="e.g. Legacy Data Import"
                className="h-12 rounded-xl bg-slate-50 border-slate-200"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="man-src" className="text-sm font-bold uppercase tracking-wider text-slate-500">Source Table (Optional)</Label>
                <Input 
                  id="man-src"
                  value={manualSourceTable}
                  onChange={(e) => setManualSourceTable(e.target.value)}
                  placeholder="e.g. stg_legacy_users"
                  className="h-12 rounded-xl bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="man-dst" className="text-sm font-bold uppercase tracking-wider text-slate-500">Destination Table</Label>
                <Input 
                  id="man-dst"
                  value={manualDestTable}
                  onChange={(e) => setManualDestTable(e.target.value)}
                  placeholder="e.g. int_users"
                  className="h-12 rounded-xl bg-slate-50 border-slate-200"
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Draft Job"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
