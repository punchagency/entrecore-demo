"use client";

import { useWorkflows } from "./hooks/use-workflows";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Network, Plus, Play, MoreVertical, Route, Activity, Server, Clock, GitBranch, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { PageWrapper } from "@/components/page-wrapper";

export default function WorkflowsPage() {
  const router = useRouter();
  const { data: workflows, isLoading } = useWorkflows();

  return (
    <PageWrapper title="Workflows">
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="container mx-auto p-6 space-y-8">
        
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                  <Network className="h-6 w-6 text-indigo-300" />
                </div>
                <Badge variant="outline" className="border-indigo-400 text-indigo-300 font-medium tracking-wide bg-indigo-950/30">
                  Data Pipeline Integrations
                </Badge>
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                Workflow Execution Engine
              </h1>
              <p className="text-indigo-100/80 text-lg leading-relaxed max-w-xl font-medium">
                Design and deploy multi-step DAG workflows for extraction, transformation, and automated DQ checking.
              </p>
            </div>
            
            <Button
              onClick={() => router.push("/workflows/builder")}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 border-0 rounded-xl px-8 py-6 h-14 text-lg font-semibold shrink-0"
            >
              <Plus className="h-5 w-5 mr-2" />
              Design New Pipeline
            </Button>
          </div>
        </div>

        {/* Existing Workflows */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Route className="h-6 w-6 text-indigo-600" />
              Active Workflows
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-slate-200 bg-white/50 animate-pulse">
                  <CardHeader className="h-24 bg-slate-100/50 rounded-t-xl" />
                  <CardContent className="h-32" />
                </Card>
              ))
            ) : !Array.isArray(workflows) || workflows.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white/50 border border-dashed border-slate-300 rounded-3xl">
                <Network className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">No pipelines defined</h3>
                <p className="text-slate-500 mb-4">Start by designing a new data workflow.</p>
                <Button onClick={() => router.push("/workflows/builder")} variant="outline" className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <Plus className="h-4 w-4 mr-2" /> Builder Canvas
                </Button>
              </div>
            ) : (
              workflows.map((wf) => (
                <Card 
                  key={wf.id} 
                  className="group hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 border-0 ring-1 ring-slate-200/50 bg-white/80 overflow-hidden rounded-3xl cursor-pointer"
                  onClick={() => router.push(`/workflows/${wf.id}`)}
                >
                  <CardContent className="p-0">
                    <div className="p-6 bg-gradient-to-b from-slate-50/50 to-white">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                          <Network className="h-6 w-6" />
                        </div>
                        <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 font-medium">
                          {wf.nodes.length} Nodes
                        </Badge>
                      </div>
                      
                      <h3 className="text-xl font-bold text-slate-900 mb-2 truncate">
                        {wf.name}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-2 h-10">
                        {wf.description || "No description provided."}
                      </p>
                    </div>

                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/30">
                      <div className="flex items-center gap-1.5">
                        <Server className="h-3.5 w-3.5 text-slate-400" />
                        ID: {wf.id.substring(0, 8)}...
                      </div>
                      <div className="flex items-center text-indigo-600 font-semibold group-hover:translate-x-1 transition-transform">
                        View Details <ArrowRight className="h-4 w-4 ml-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
    </PageWrapper>
  );
}
