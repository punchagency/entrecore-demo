'use client';
import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database,
  Zap,
  Target,
  Clock,
  Eye,
  Download,
  RefreshCw,
  Settings,
  BarChart3,
  Users,
  Calendar,
  FileText,
  GitBranch
} from 'lucide-react';
import { DataProduct } from './data-product-node';
import { cn } from '@/lib/utils';

interface DataProductSheetProps {
  dataProduct: DataProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeepDive?: (dataProduct: DataProduct) => void;
}

const getIcon = (type: DataProduct['type']) => {
  switch (type) {
    case 'source':
      return Database;
    case 'transform':
      return Zap;
    case 'destination':
      return Target;
    default:
      return Database;
  }
};

const getStatusColor = (status: DataProduct['status']) => {
  switch (status) {
    case 'running':
      return 'bg-blue-100 text-blue-600';
    case 'success':
      return 'bg-green-100 text-green-600';
    case 'error':
      return 'bg-red-100 text-red-600';
    case 'pending':
      return 'bg-yellow-100 text-yellow-600';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getTypeColor = (type: DataProduct['type']) => {
  switch (type) {
    case 'source':
      return 'bg-green-100 text-green-600 border-green-200';
    case 'transform':
      return 'bg-yellow-100 text-yellow-600 border-yellow-200';
    case 'destination':
      return 'bg-purple-100 text-purple-600 border-purple-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function DataProductSheet({ dataProduct, open, onOpenChange, onDeepDive }: DataProductSheetProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const handleDeepDive = () => {
    if (onDeepDive) {
      onDeepDive(dataProduct!);
    }
  };

  const handleNodeClick = (clickedDataProduct: DataProduct) => {
    // Handle node click from pipeline visualization
    console.log('Node clicked:', clickedDataProduct);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[800px] bg-gradient-to-br from-card to-card/80 border-border">
        <SheetHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/20 text-primary">
              <GitBranch className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl font-bold">Data Pipeline Lineage</SheetTitle>
              <SheetDescription className="mt-1">
                View pipeline overview and data products details
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 mx-3 px-3 overflow-y-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Data Products Details</TabsTrigger>
            <TabsTrigger value="overview">Pipeline Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6 overflow-y-auto">
            {/* Pipeline Overview Section */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="text-center p-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-lg bg-green-100 text-green-600">
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">2</div>
                  <div className="text-sm text-muted-foreground">Data Sources</div>
                  <div className="text-xs text-muted-foreground">1.3M total records</div>
                </div>
              </Card>

              <Card className="text-center p-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">2</div>
                  <div className="text-sm text-muted-foreground">Transformations</div>
                  <div className="text-xs text-muted-foreground">1 running, 1 failed</div>
                </div>
              </Card>

              <Card className="text-center p-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                    <Target className="w-6 h-6" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">2</div>
                  <div className="text-sm text-muted-foreground">Destinations</div>
                  <div className="text-xs text-muted-foreground">975K total records</div>
                </div>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-muted-foreground">Sales Analytics updated</span>
                    <span className="text-xs text-muted-foreground ml-auto">30 min ago</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-muted-foreground">Order Enrichment running</span>
                    <span className="text-xs text-muted-foreground ml-auto">2 hours ago</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-muted-foreground">Data Quality Check failed</span>
                    <span className="text-xs text-muted-foreground ml-auto">6 hours ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Processing Time</p>
                    <p className="text-lg font-semibold">2.3 min</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                    <p className="text-lg font-semibold">98.5%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

         
          </TabsContent>

          <TabsContent value="details" className="space-y-6 overflow-y-auto">
            {dataProduct ? (
              <>
                                 {/* Data Products Header */}
                 <div className="flex items-center gap-3 mt-6">
                   <div className={cn("p-3 rounded-lg", getTypeColor(dataProduct.type))}>
                     {React.createElement(getIcon(dataProduct.type), { className: "w-6 h-6" })}
                   </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{dataProduct.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn("text-xs", getTypeColor(dataProduct.type))}>
                        {dataProduct.type}
                      </Badge>
                      <Badge className={cn("text-xs", getStatusColor(dataProduct.status))}>
                        {dataProduct.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {dataProduct.description && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Description
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{dataProduct.description}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Statistics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Records</p>
                        <p className="text-lg font-semibold">
                          {dataProduct.recordCount?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Updated</p>
                        <p className="text-lg font-semibold">{dataProduct.lastRun || 'Never'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Metadata */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Metadata
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Owner</span>
                      <span className="text-sm font-medium">{dataProduct.owner || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <span className="text-sm font-medium capitalize">{dataProduct.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className="text-sm font-medium capitalize">{dataProduct.status}</span>
                    </div>
                  </CardContent>
                </Card>

                <Separator />

                {/* Actions */}
                <div className="space-y-4 ">
                  <h3 className="text-sm font-semibold">Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={handleDeepDive}
                      className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Deep Dive
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                    <Button variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </div>

                {/* Recent Activity */}
                <Card className='mb-12'>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                                             <div className="flex items-center gap-3 text-sm">
                         <div className="w-2 h-2 bg-green-500 rounded-full" />
                         <span className="text-muted-foreground">Data refresh completed</span>
                         <span className="text-xs text-muted-foreground ml-auto">2 hours ago</span>
                       </div>
                       <div className="flex items-center gap-3 text-sm">
                         <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                         <span className="text-muted-foreground">Schema validation started</span>
                         <span className="text-xs text-muted-foreground ml-auto">4 hours ago</span>
                       </div>
                       <div className="flex items-center gap-3 text-sm">
                         <div className="w-2 h-2 bg-green-500 rounded-full" />
                         <span className="text-muted-foreground">Pipeline execution successful</span>
                         <span className="text-xs text-muted-foreground ml-auto">1 day ago</span>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Select a data products to view details</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}