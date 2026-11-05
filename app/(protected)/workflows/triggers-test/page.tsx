"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useCreateTrigger,
  useDeleteTrigger,
  useDisableTrigger,
  useEnableTrigger,
  useTriggerHistory,
  useTriggers,
  useTriggerTypes,
  useTestFireTrigger,
  useUpdateTrigger,
} from "../hooks/use-triggers";
import { TriggerType } from "../services/trigger-api";

function parseJsonObject(value: string): Record<string, unknown> | null {
  if (!value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

export default function TriggerTestPage() {
  const [workflowId, setWorkflowId] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("pipeline_completed");
  const [description, setDescription] = useState("Test trigger from frontend harness");
  const [enabled, setEnabled] = useState(true);
  const [configText, setConfigText] = useState('{"pipeline_type":"integration"}');
  const [filterText, setFilterText] = useState("");
  const [inputParamsText, setInputParamsText] = useState('{"channel":"#data-alerts"}');
  const [testContextText, setTestContextText] = useState('{"pipeline_type":"integration","entity":"customer"}');
  const [selectedTriggerId, setSelectedTriggerId] = useState("");
  const [historyLimit, setHistoryLimit] = useState(20);

  const { data: triggerTypes } = useTriggerTypes();
  const { data: triggers, refetch: refetchTriggers, isLoading: isLoadingTriggers } = useTriggers(
    useMemo(
      () => ({
        workflow_id: workflowId || undefined,
      }),
      [workflowId]
    )
  );
  const { data: triggerHistory, refetch: refetchHistory, isLoading: isLoadingHistory } = useTriggerHistory(
    selectedTriggerId,
    { limit: historyLimit }
  );

  const createTriggerMutation = useCreateTrigger();
  const updateTriggerMutation = useUpdateTrigger();
  const enableTriggerMutation = useEnableTrigger();
  const disableTriggerMutation = useDisableTrigger();
  const testFireMutation = useTestFireTrigger();
  const deleteTriggerMutation = useDeleteTrigger();

  const allTypes = triggerTypes?.all_types ?? [];

  function assertJsonFields() {
    const config = parseJsonObject(configText);
    if (configText.trim() && !config) {
      toast.error("Invalid config JSON");
      return null;
    }
    const filterExpr = parseJsonObject(filterText);
    if (filterText.trim() && !filterExpr) {
      toast.error("Invalid filter_expr JSON");
      return null;
    }
    const inputParams = parseJsonObject(inputParamsText);
    if (inputParamsText.trim() && !inputParams) {
      toast.error("Invalid input_params JSON");
      return null;
    }
    return { config, filterExpr, inputParams };
  }

  function handleCreateTrigger() {
    if (!workflowId.trim()) {
      toast.error("workflow_id is required");
      return;
    }
    const parsed = assertJsonFields();
    if (!parsed) return;

    createTriggerMutation.mutate(
      {
        workflow_id: workflowId.trim(),
        trigger_type: triggerType,
        description,
        enabled,
        config: parsed.config ?? undefined,
        filter_expr: parsed.filterExpr,
        input_params: parsed.inputParams,
      },
      {
        onSuccess: (trigger) => {
          toast.success("Trigger created");
          setSelectedTriggerId(trigger.id);
          refetchTriggers();
        },
        onError: () => toast.error("Create failed"),
      }
    );
  }

  function handleUpdateTrigger() {
    if (!selectedTriggerId) {
      toast.error("Select a trigger first");
      return;
    }
    const parsed = assertJsonFields();
    if (!parsed) return;

    updateTriggerMutation.mutate(
      {
        triggerId: selectedTriggerId,
        data: {
          trigger_type: triggerType,
          description,
          enabled,
          config: parsed.config ?? undefined,
          filter_expr: parsed.filterExpr,
          input_params: parsed.inputParams,
        },
      },
      {
        onSuccess: () => {
          toast.success("Trigger updated");
          refetchTriggers();
        },
        onError: () => toast.error("Update failed"),
      }
    );
  }

  function handleEnableDisable(nextEnabled: boolean) {
    if (!selectedTriggerId) {
      toast.error("Select a trigger first");
      return;
    }
    const mutation = nextEnabled ? enableTriggerMutation : disableTriggerMutation;
    mutation.mutate(selectedTriggerId, {
      onSuccess: () => {
        toast.success(nextEnabled ? "Trigger enabled" : "Trigger disabled");
        refetchTriggers();
      },
      onError: () => toast.error(nextEnabled ? "Enable failed" : "Disable failed"),
    });
  }

  function handleTestFire() {
    if (!selectedTriggerId) {
      toast.error("Select a trigger first");
      return;
    }
    const context = parseJsonObject(testContextText);
    if (testContextText.trim() && !context) {
      toast.error("Invalid test context JSON");
      return;
    }

    testFireMutation.mutate(
      {
        triggerId: selectedTriggerId,
        data: { context: context ?? undefined },
      },
      {
        onSuccess: (response) => {
          toast.success(`Dispatched: ${response.celery_task_id.slice(0, 8)}...`);
          refetchHistory();
        },
        onError: () => toast.error("Test fire failed"),
      }
    );
  }

  function handleDelete() {
    if (!selectedTriggerId) {
      toast.error("Select a trigger first");
      return;
    }
    deleteTriggerMutation.mutate(selectedTriggerId, {
      onSuccess: () => {
        toast.success("Trigger deleted");
        setSelectedTriggerId("");
        refetchTriggers();
      },
      onError: () => toast.error("Delete failed"),
    });
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Triggers Test Harness</h1>
        <p className="text-sm text-slate-500">Temporary page for validating trigger endpoints and React Query wiring.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trigger Payload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workflow-id">Workflow ID</Label>
              <Input
                id="workflow-id"
                value={workflowId}
                onChange={(event) => setWorkflowId(event.target.value)}
                placeholder="workflow-uuid"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selected-trigger-id">Selected Trigger ID</Label>
              <Input
                id="selected-trigger-id"
                value={selectedTriggerId}
                onChange={(event) => setSelectedTriggerId(event.target.value)}
                placeholder="trigger-uuid"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trigger-type">Trigger Type</Label>
              <Input
                id="trigger-type"
                value={triggerType}
                onChange={(event) => setTriggerType(event.target.value as TriggerType)}
                placeholder="pipeline_completed"
                list="trigger-types-list"
              />
              <datalist id="trigger-types-list">
                {allTypes.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe trigger behavior"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant={enabled ? "default" : "outline"}
              onClick={() => setEnabled((previous) => !previous)}
            >
              Enabled: {enabled ? "true" : "false"}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="config-json">config JSON</Label>
              <Textarea id="config-json" value={configText} onChange={(event) => setConfigText(event.target.value)} rows={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-json">filter_expr JSON</Label>
              <Textarea id="filter-json" value={filterText} onChange={(event) => setFilterText(event.target.value)} rows={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="input-params-json">input_params JSON</Label>
              <Textarea
                id="input-params-json"
                value={inputParamsText}
                onChange={(event) => setInputParamsText(event.target.value)}
                rows={6}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreateTrigger} disabled={createTriggerMutation.isPending}>
              Create Trigger
            </Button>
            <Button variant="outline" onClick={handleUpdateTrigger} disabled={updateTriggerMutation.isPending}>
              Update Trigger
            </Button>
            <Button variant="outline" onClick={() => handleEnableDisable(true)} disabled={enableTriggerMutation.isPending}>
              Enable
            </Button>
            <Button variant="outline" onClick={() => handleEnableDisable(false)} disabled={disableTriggerMutation.isPending}>
              Disable
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteTriggerMutation.isPending}>
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Fire + History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-context-json">Test Context JSON</Label>
            <Textarea
              id="test-context-json"
              value={testContextText}
              onChange={(event) => setTestContextText(event.target.value)}
              rows={5}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleTestFire} disabled={testFireMutation.isPending}>
              Test Fire
            </Button>
            <Input
              className="w-28"
              type="number"
              min={1}
              max={200}
              value={historyLimit}
              onChange={(event) => setHistoryLimit(Number(event.target.value || "20"))}
            />
            <Button variant="outline" onClick={() => refetchHistory()}>
              Refresh History
            </Button>
            <Badge variant="secondary">{isLoadingHistory ? "Loading..." : `${triggerHistory?.length ?? 0} records`}</Badge>
          </div>

          <pre className="max-h-80 overflow-auto rounded-md border bg-slate-50 p-3 text-xs">
            {JSON.stringify(triggerHistory ?? [], null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trigger List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetchTriggers()}>
              Refresh List
            </Button>
            <Badge variant="secondary">{isLoadingTriggers ? "Loading..." : `${triggers?.length ?? 0} triggers`}</Badge>
          </div>
          <pre className="max-h-96 overflow-auto rounded-md border bg-slate-50 p-3 text-xs">
            {JSON.stringify(triggers ?? [], null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
