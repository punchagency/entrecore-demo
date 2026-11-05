/**
 * Classifies workflow run WebSocket messages (EP-1004):
 *
 *   { type: "workflow_node_update", event: "run_failed", run_id, node_key: "__workflow__",
 *     status: "cancelled", message, error }
 *
 * `event` (run_complete / run_failed / node_update) says whether the run is done. Older messages
 * may lack it, so it is derived from the run-level (`__workflow__`) status. Only "completed" or
 * "success" mean success: cancelled and rejected runs are finished, not successful.
 */
import { looksLikeInternalText } from "./api-error";

export type WorkflowRunEvent = "run_complete" | "run_failed" | "node_update";

export interface WorkflowSocketMessage {
  type?: unknown;
  event?: unknown;
  node_key?: unknown;
  status?: unknown;
  message?: unknown;
  error?: unknown;
}

const RUN_EVENTS: readonly WorkflowRunEvent[] = ["run_complete", "run_failed", "node_update"];
const FINISHED_UNSUCCESSFULLY = ["failed", "error", "cancelled", "canceled", "rejected"];
const FINISHED_SUCCESSFULLY = ["completed", "success"];

export function workflowRunEvent(msg: WorkflowSocketMessage | null | undefined): WorkflowRunEvent {
  if (RUN_EVENTS.includes(msg?.event as WorkflowRunEvent)) return msg!.event as WorkflowRunEvent;
  if (msg?.node_key !== "__workflow__") return "node_update";
  const status = String(msg.status ?? "").toLowerCase();
  if (FINISHED_UNSUCCESSFULLY.includes(status)) return "run_failed";
  if (FINISHED_SUCCESSFULLY.includes(status)) return "run_complete";
  return "node_update";
}

/** True for messages from the workflow run stream (as opposed to other events on the socket). */
export function isWorkflowRunMessage(msg: WorkflowSocketMessage | null | undefined): boolean {
  return msg?.type === "workflow_node_update" || typeof msg?.node_key === "string";
}

export interface RunFailureNotice {
  /** Cancelled runs are usually the user's own doing, so they get a neutral notice. */
  tone: "error" | "neutral";
  text: string;
}

/** What to tell the user when a run finished without succeeding. Never shows raw exception text. */
export function workflowRunFailureNotice(msg: WorkflowSocketMessage): RunFailureNotice {
  const status = String(msg.status ?? "").toLowerCase();
  const serverText = [msg.message, msg.error].find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0 && !looksLikeInternalText(value)
  );
  if (status === "cancelled" || status === "canceled") {
    return { tone: "neutral", text: serverText ?? "The workflow run was cancelled." };
  }
  if (status === "rejected") {
    return { tone: "error", text: serverText ?? "The workflow run was rejected." };
  }
  return { tone: "error", text: serverText ?? "Workflow execution failed" };
}
