import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GitBranch,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Shield,
  Database,
  Calendar,
  Users,
  FileText,
  BarChart3,
  Target,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
  Clock,
  Zap,
  RefreshCw,
  Save,
  Download,
  Share2,
  Copy,
  Plus,
  Settings,
  Link,
  Unlink,
  ArrowUpDown,
  CalendarCheck,
  CalendarX,
  CheckSquare,
  Square,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface CrossColumnRule {
  id: string;
  name: string;
  description: string;
  columns: string[];
  ruleType: 'date_logic' | 'business_logic' | 'reference_integrity';
  enabled: boolean;
  status: 'pass' | 'warning' | 'fail';
  score: number;
  affectedRecords: number;
  totalRecords: number;
  lastRun?: Date;
  sqlQuery: string;
}

interface ConsistencyCheck {
  id: string;
  name: string;
  description: string;
  columns: string[];
  status: 'pass' | 'warning' | 'fail';
  score: number;
  affectedRecords: number;
  totalRecords: number;
  sqlQuery: string;
  errorMessage?: string;
}

interface CrossColumnMetrics {
  overallScore: number;
  dateLogicScore: number;
  businessLogicScore: number;
  referenceIntegrityScore: number;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  lastUpdated: Date;
}

interface CrossColumnConsistencyProps {
  tableName: string;
  availableColumns: string[];
  onMetricsUpdate?: (metrics: CrossColumnMetrics) => void;
}

export default function CrossColumnConsistencyChecker({
  tableName,
  availableColumns,
  onMetricsUpdate
}: CrossColumnConsistencyProps) {
  const [rules, setRules] = useState<CrossColumnRule[]>([]);

  const [metrics, setMetrics] = useState<CrossColumnMetrics>({
    overallScore: 85,
    dateLogicScore: 90,
    businessLogicScore: 80,
    referenceIntegrityScore: 85,
    totalRules: 0,
    passedRules: 0,
    failedRules: 0,
    warningRules: 0,
    lastUpdated: new Date()
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<CrossColumnRule | null>(null);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    columns: [] as string[],
    ruleType: 'date_logic' as const,
    enabled: true
  });

  // Initialize with default cross-column rules
  useEffect(() => {
    const defaultRules: CrossColumnRule[] = [
      {
        id: 'date-logic-rule',
        name: 'Date Logic Validation',
        description: 'Ensures end date is after start date',
        columns: ['start_date', 'end_date'],
        ruleType: 'date_logic',
        enabled: true,
        status: 'pass',
        score: 95,
        affectedRecords: 5,
        totalRecords: 1000,
        lastRun: new Date(),
        sqlQuery: `SELECT COUNT(*) as total, SUM(CASE WHEN end_date >= start_date THEN 1 ELSE 0 END) as valid FROM ${tableName}`
      },
      {
        id: 'business-logic-rule',
        name: 'Business Logic Validation',
        description: 'Ensures status is valid for completed projects',
        columns: ['status', 'end_date'],
        ruleType: 'business_logic',
        enabled: true,
        status: 'warning',
        score: 85,
        affectedRecords: 15,
        totalRecords: 1000,
        lastRun: new Date(),
        sqlQuery: `SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('Completed', 'In Progress', 'Planning') THEN 1 ELSE 0 END) as valid FROM ${tableName}`
      },
      {
        id: 'reference-integrity-rule',
        name: 'Reference Integrity Check',
        description: 'Ensures foreign key references exist',
        columns: ['project_manager_id'],
        ruleType: 'reference_integrity',
        enabled: true,
        status: 'pass',
        score: 90,
        affectedRecords: 10,
        totalRecords: 1000,
        lastRun: new Date(),
        sqlQuery: `SELECT COUNT(*) as total, SUM(CASE WHEN project_manager_id IS NOT NULL THEN 1 ELSE 0 END) as valid FROM ${tableName}`
      }
    ];
    setRules(defaultRules);

    // Calculate initial metrics
    calculateMetrics(defaultRules);
  }, [tableName]);

  const calculateMetrics = (rules: CrossColumnRule[]) => {
    const totalRules = rules.length;
    const passedRules = rules.filter(r => r.status === 'pass').length;
    const failedRules = rules.filter(r => r.status === 'fail').length;
    const warningRules = rules.filter(r => r.status === 'warning').length;

    const dateLogicScore = rules.filter(r => r.ruleType === 'date_logic').reduce((acc, r) => acc + r.score, 0) / Math.max(1, rules.filter(r => r.ruleType === 'date_logic').length);
    const businessLogicScore = rules.filter(r => r.ruleType === 'business_logic').reduce((acc, r) => acc + r.score, 0) / Math.max(1, rules.filter(r => r.ruleType === 'business_logic').length);
    const referenceIntegrityScore = rules.filter(r => r.ruleType === 'reference_integrity').reduce((acc, r) => acc + r.score, 0) / Math.max(1, rules.filter(r => r.ruleType === 'reference_integrity').length);

    const overallScore = (dateLogicScore + businessLogicScore + referenceIntegrityScore) / 3;

    const newMetrics: CrossColumnMetrics = {
      overallScore,
      dateLogicScore,
      businessLogicScore,
      referenceIntegrityScore,
      totalRules,
      passedRules,
      failedRules,
      warningRules,
      lastUpdated: new Date()
    };

    setMetrics(newMetrics);
    onMetricsUpdate?.(newMetrics);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'fail': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <CheckCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'fail': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRuleTypeIcon = (ruleType: string) => {
    switch (ruleType) {
      case 'date_logic': return <CalendarCheck className="h-4 w-4" />;
      case 'business_logic': return <CheckSquare className="h-4 w-4" />;
      case 'reference_integrity': return <Link className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getRuleTypeColor = (ruleType: string) => {
    switch (ruleType) {
      case 'date_logic': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'business_logic': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'reference_integrity': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleCreateRule = () => {
    const rule: CrossColumnRule = {
      id: `rule-${Date.now()}`,
      name: newRule.name,
      description: newRule.description,
      columns: newRule.columns,
      ruleType: newRule.ruleType,
      enabled: newRule.enabled,
      status: 'pass',
      score: 0,
      affectedRecords: 0,
      totalRecords: 0,
      sqlQuery: `-- Custom rule for ${newRule.name}`,
      lastRun: new Date()
    };

    setRules([...rules, rule]);
    setNewRule({ name: '', description: '', columns: [], ruleType: 'date_logic', enabled: true });
    setIsRuleDialogOpen(false);
    calculateMetrics([...rules, rule]);
  };

  const handleToggleRule = (ruleId: string) => {
    setRules(rules.map(rule =>
      rule.id === ruleId
        ? { ...rule, enabled: !rule.enabled }
        : rule
    ));
  };

  const handleDeleteRule = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    setRules(rules.filter(rule => rule.id !== ruleId));
    calculateMetrics(rules.filter(rule => rule.id !== ruleId));
  };

  const handleRunRule = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      // Simulate rule execution
      const newStatus: 'pass' | 'warning' | 'fail' = Math.random() > 0.5 ? 'pass' : (Math.random() > 0.5 ? 'warning' : 'fail');
      const newScore = Math.floor(Math.random() * 40) + 60; // 60-100
      const newAffectedRecords = Math.floor(Math.random() * 100);
      const newTotalRecords = 1000;

      setRules(rules.map((rule): CrossColumnRule =>
        rule.id === ruleId
          ? { ...rule, status: newStatus, score: newScore, affectedRecords: newAffectedRecords, totalRecords: newTotalRecords, lastRun: new Date() }
          : rule
      ));
      calculateMetrics(rules.map((rule): CrossColumnRule =>
        rule.id === ruleId
          ? { ...rule, status: newStatus, score: newScore, affectedRecords: newAffectedRecords, totalRecords: newTotalRecords, lastRun: new Date() }
          : rule
      ));
    }
  };

  const handleRunAllRules = () => {
    const updatedRules: CrossColumnRule[] = rules.map(rule => {
      const newStatus: 'pass' | 'warning' | 'fail' = Math.random() > 0.5 ? 'pass' : (Math.random() > 0.5 ? 'warning' : 'fail');
      const newScore = Math.floor(Math.random() * 40) + 60; // 60-100
      const newAffectedRecords = Math.floor(Math.random() * 100);
      const newTotalRecords = 1000;

      return {
        ...rule,
        status: newStatus,
        score: newScore,
        affectedRecords: newAffectedRecords,
        totalRecords: newTotalRecords,
        lastRun: new Date()
      };
    });

    setRules(updatedRules);
    calculateMetrics(updatedRules);
  };

  const getConsistencyChecks = (): ConsistencyCheck[] => {
    return [
      {
        id: 'date-logic-check',
        name: 'Date Logic Validation',
        description: 'Ensures end date is after start date',
        columns: ['start_date', 'end_date'],
        status: 'pass',
        score: 95,
        affectedRecords: 5,
        totalRecords: 1000,
        sqlQuery: `SELECT COUNT(*) as total, SUM(CASE WHEN end_date >= start_date THEN 1 ELSE 0 END) as valid FROM ${tableName}`
      },
      {
        id: 'business-logic-check',
        name: 'Business Logic Validation',
        description: 'Ensures status is valid for completed projects',
        columns: ['status', 'end_date'],
        status: 'warning',
        score: 85,
        affectedRecords: 15,
        totalRecords: 1000,
        sqlQuery: `SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('Completed', 'In Progress', 'Planning') THEN 1 ELSE 0 END) as valid FROM ${tableName}`
      },
      {
        id: 'reference-integrity-check',
        name: 'Reference Integrity Check',
        description: 'Ensures foreign key references exist',
        columns: ['project_manager_id'],
        status: 'pass',
        score: 90,
        affectedRecords: 10,
        totalRecords: 1000,
        sqlQuery: `SELECT COUNT(*) as total, SUM(CASE WHEN project_manager_id IS NOT NULL THEN 1 ELSE 0 END) as valid FROM ${tableName}`
      },
      {
        id: 'cross-column-validation',
        name: 'Cross-Column Validation',
        description: 'Ensures consistency between related columns',
        columns: ['start_date', 'end_date', 'status'],
        status: 'fail',
        score: 75,
        affectedRecords: 25,
        totalRecords: 1000,
        sqlQuery: `SELECT COUNT(*) as total, SUM(CASE WHEN (status = 'Completed' AND end_date IS NOT NULL) OR (status != 'Completed') THEN 1 ELSE 0 END) as valid FROM ${tableName}`
      }
    ];
  };

  const consistencyChecks = getConsistencyChecks();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <GitBranch className="h-6 w-6 text-primary" />
            Cross-Column Consistency
          </h1>
          <p className="text-gray-600">Validate relationships and business logic across multiple columns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2"
          >
            {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </Button>
          <Button
            onClick={() => setIsRuleDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsExportDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overall Consistency Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Overall Consistency Score
            </span>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{metrics.overallScore.toFixed(1)}%</div>
              <div className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Last updated: {metrics.lastUpdated.toLocaleString()}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                {getStatusIcon(metrics.dateLogicScore >= 90 ? 'pass' : metrics.dateLogicScore >= 70 ? 'warning' : 'fail')}
                <div className="text-2xl font-bold text-blue-600">{metrics.dateLogicScore.toFixed(1)}%</div>
              </div>
              <div className="text-sm text-blue-700 font-medium">Date Logic</div>
              <div className="text-xs text-blue-600 mt-1">Temporal consistency</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                {getStatusIcon(metrics.businessLogicScore >= 90 ? 'pass' : metrics.businessLogicScore >= 70 ? 'warning' : 'fail')}
                <div className="text-2xl font-bold text-purple-600">{metrics.businessLogicScore.toFixed(1)}%</div>
              </div>
              <div className="text-sm text-purple-700 font-medium">Business Logic</div>
              <div className="text-xs text-purple-600 mt-1">Rule compliance</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                {getStatusIcon(metrics.referenceIntegrityScore >= 90 ? 'pass' : metrics.referenceIntegrityScore >= 70 ? 'warning' : 'fail')}
                <div className="text-2xl font-bold text-green-600">{metrics.referenceIntegrityScore.toFixed(1)}%</div>
              </div>
              <div className="text-sm text-green-700 font-medium">Reference Integrity</div>
              <div className="text-xs text-green-600 mt-1">Foreign key validation</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-2xl font-bold text-orange-600">{metrics.totalRules}</div>
              </div>
              <div className="text-sm text-orange-700 font-medium">Total Rules</div>
              <div className="text-xs text-orange-600 mt-1">
                {metrics.passedRules} passed, {metrics.failedRules} failed
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Consistency Rules</TabsTrigger>
          <TabsTrigger value="checks">Validation Checks</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          {showAdvanced && <TabsTrigger value="advanced">Advanced</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Rule Status Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">{metrics.passedRules}</div>
                      <div className="text-sm text-green-700">Passed</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="text-2xl font-bold text-yellow-600">{metrics.warningRules}</div>
                      <div className="text-sm text-yellow-700">Warnings</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="text-2xl font-bold text-red-600">{metrics.failedRules}</div>
                      <div className="text-sm text-red-700">Failed</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Success Rate</span>
                      <span className="font-medium">{((metrics.passedRules / Math.max(1, metrics.totalRules)) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={(metrics.passedRules / Math.max(1, metrics.totalRules)) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Rule Execution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">Total Rules:</span>
                    <span className="font-medium">{metrics.totalRules}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">Last Run:</span>
                    <span className="font-medium">{metrics.lastUpdated.toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">Affected Records:</span>
                    <span className="font-medium">~{rules.reduce((acc, r) => acc + r.affectedRecords, 0).toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">Execution Time:</span>
                    <span className="font-medium">~2.3s</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Date Logic', score: metrics.dateLogicScore, target: 90 },
                    { name: 'Business Logic', score: metrics.businessLogicScore, target: 85 },
                    { name: 'Reference Integrity', score: metrics.referenceIntegrityScore, target: 90 }
                  ].map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{metric.name}</span>
                        <span className={metric.score >= metric.target ? 'text-green-600' : 'text-red-600'}>
                          {metric.score.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Progress value={metric.score} className="flex-1 h-2" />
                        <div className="text-xs text-gray-500 w-12">Target: {metric.target}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Consistency Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rules.filter(rule => rule.status === 'fail').map((rule, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <div className="flex-1">
                      <span className="font-medium text-red-700">{rule.name} Failed:</span>
                      <p className="text-sm text-red-600 mt-1">
                        {rule.description}. {rule.affectedRecords} records affected. Consider reviewing business logic and data entry processes.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="text-red-600 border-red-200">
                      Fix Issue
                    </Button>
                  </div>
                ))}
                {rules.filter(rule => rule.status === 'warning').map((rule, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div className="flex-1">
                      <span className="font-medium text-yellow-700">{rule.name} Warning:</span>
                      <p className="text-sm text-yellow-600 mt-1">
                        {rule.description}. Monitor for potential degradation. {rule.affectedRecords} records affected.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="text-yellow-600 border-yellow-200">
                      Monitor
                    </Button>
                  </div>
                ))}
                {rules.every(rule => rule.status === 'pass') && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <span className="font-medium text-green-700">Excellent Consistency:</span>
                      <p className="text-sm text-green-600 mt-1">
                        All cross-column consistency rules are passing. Continue monitoring to maintain high standards.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Consistency Rules</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRunAllRules}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run All Rules
              </Button>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Export Rules
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(rule.status)}
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getRuleTypeIcon(rule.ruleType)}
                          {rule.name}
                        </CardTitle>
                        <CardDescription>{rule.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getRuleTypeColor(rule.ruleType)}>
                        {rule.ruleType.replace('_', ' ')}
                      </Badge>
                      <Badge className={getStatusColor(rule.status)}>
                        {rule.score.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Columns</span>
                        <span className="font-medium">{rule.columns.join(', ')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rule.columns.map((column, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {column}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Status</span>
                        <span className={`font-medium ${rule.status === 'pass' ? 'text-green-600' : rule.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {rule.status.toUpperCase()}
                        </span>
                      </div>
                      <Progress value={rule.score} className="h-2" />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggleRule(rule.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRunRule(rule.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Run
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRule(rule)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-red-600"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {rule.lastRun && (
                    <div className="mt-3 text-xs text-gray-500">
                      Last run: {rule.lastRun.toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="checks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validation Checks</CardTitle>
              <CardDescription>Comprehensive cross-column validation results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {consistencyChecks.map((check, index) => (
                  <Card key={index} className="relative overflow-hidden py-3">
                    <div
                      className={`absolute top-0 left-0 w-1 h-full ${check.score >= 90 ? 'bg-green-500' : check.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                    />
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(check.status)}
                          <h3 className="font-semibold text-sm">{check.name}</h3>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${check.score >= 90
                            ? "border-green-500 text-green-700 bg-green-50"
                            : check.score >= 70
                              ? "border-yellow-500 text-yellow-700 bg-yellow-50"
                              : "border-red-500 text-red-700 bg-red-50"
                            }`}
                        >
                          {check.score.toFixed(1)}%
                        </Badge>
                      </div>

                      <p className="text-xs text-gray-600 mb-3">{check.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <div className="text-sm font-bold text-blue-700">Columns</div>
                          <div className="text-xs text-blue-600">{check.columns.join(', ')}</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2 text-center">
                          <div className="text-sm font-bold text-green-700">Valid Records</div>
                          <div className="text-xs text-green-600">{check.totalRecords - check.affectedRecords}</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2 text-center">
                          <div className="text-sm font-bold text-red-700">Invalid Records</div>
                          <div className="text-xs text-red-600">{check.affectedRecords}</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-2 text-center">
                          <div className="text-sm font-bold text-purple-700">Total Records</div>
                          <div className="text-xs text-purple-600">{check.totalRecords}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Validation Status</span>
                          <span className={`font-medium ${check.status === 'pass' ? 'text-green-600' : check.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {check.status.toUpperCase()}
                          </span>
                        </div>
                        <Progress value={check.score} className="h-2" />
                      </div>

                      <div className="flex justify-end mt-3">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2 bg-gray-100 hover:bg-gray-200"
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              View SQL
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>SQL Query for {check.name}</DialogTitle>
                              <DialogDescription>
                                SQL code used to validate {check.description.toLowerCase()}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <pre className="text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap">
                                {check.sqlQuery}
                              </pre>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring & Alerts</CardTitle>
              <CardDescription>Configure monitoring for cross-column consistency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monitoring Frequency</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="real-time">Real-time</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Alert Threshold</Label>
                    <Input type="number" placeholder="Enter percentage" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Monitored Rules</Label>
                  <div className="space-y-2">
                    {rules.map((rule) => (
                      <div key={rule.id} className="flex items-center space-x-2">
                        <Checkbox id={`monitor-${rule.id}`} />
                        <Label htmlFor={`monitor-${rule.id}`}>{rule.name}</Label>
                        <Badge variant="outline" className="ml-auto">{rule.ruleType.replace('_', ' ')}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Alert Recipients</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Input placeholder="Email address" />
                      <div className="text-xs text-gray-500">Receive email notifications</div>
                    </div>
                    <div className="space-y-2">
                      <Input placeholder="Slack webhook URL" />
                      <div className="text-xs text-gray-500">Send Slack notifications</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline">Reset to Defaults</Button>
                  <Button>Save Configuration</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {showAdvanced && (
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Configuration</CardTitle>
                <CardDescription>
                  Configure advanced cross-column consistency settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Custom Validation Rules</Label>
                    <Textarea
                      placeholder="Enter custom SQL validation rules..."
                      className="min-h-[120px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Performance Optimization</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select optimization level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (Detailed logging)</SelectItem>
                          <SelectItem value="medium">Medium (Balanced)</SelectItem>
                          <SelectItem value="high">High (Minimal logging)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Batch Size</Label>
                      <Input type="number" placeholder="Enter batch size" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Advanced Options</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch id="parallel-execution" />
                        <Label htmlFor="parallel-execution">Enable Parallel Execution</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="auto-fix" />
                        <Label htmlFor="auto-fix">Enable Auto-Fix</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="detailed-logging" />
                        <Label htmlFor="detailed-logging">Detailed Logging</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="performance-monitoring" />
                        <Label htmlFor="performance-monitoring">Performance Monitoring</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline">Reset to Defaults</Button>
                    <Button>Save Configuration</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Rule Creation Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Consistency Rule</DialogTitle>
            <DialogDescription>
              Define a new cross-column consistency rule to validate your data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="Enter rule name"
              />
            </div>
            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select
                value={newRule.ruleType}
                onValueChange={(value: any) => setNewRule({ ...newRule, ruleType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rule type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_logic">Date Logic</SelectItem>
                  <SelectItem value="business_logic">Business Logic</SelectItem>
                  <SelectItem value="reference_integrity">Reference Integrity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Describe the validation rule"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Columns (Comma separated)</Label>
              <Input
                value={newRule.columns.join(', ')}
                onChange={(e) => setNewRule({ ...newRule, columns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="e.g. column1, column2"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="rule-enabled"
                checked={newRule.enabled}
                onCheckedChange={(checked) => setNewRule({ ...newRule, enabled: checked })}
              />
              <Label htmlFor="rule-enabled">Enabled by default</Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRule} disabled={!newRule.name}>
                Create Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Consistency Report</DialogTitle>
            <DialogDescription>
              Choose your preferred format for the consistency validation report
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-6" onClick={() => setIsExportDialogOpen(false)}>
              <FileText className="h-8 w-8 text-blue-500" />
              <span>PDF Report</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-6" onClick={() => setIsExportDialogOpen(false)}>
              <Database className="h-8 w-8 text-green-500" />
              <span>CSV Data</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-6" onClick={() => setIsExportDialogOpen(false)}>
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <span>JSON Summary</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-6" onClick={() => setIsExportDialogOpen(false)}>
              <Share2 className="h-8 w-8 text-orange-500" />
              <span>Share Dashboard</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

