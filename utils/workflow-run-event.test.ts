import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isWorkflowRunMessage, workflowRunEvent, workflowRunFailureNotice } from "./workflow-run-event";

const run = (status: string, extra: Record<string, unknown> = {}) => ({
  type: "workflow_node_update",
  node_key: "__workflow__",
  status,
  ...extra,
});

describe("workflowRunEvent", () => {
  it("trusts an explicit event", () => {
    assert.equal(workflowRunEvent(run("cancelled", { event: "run_failed" })), "run_failed");
    assert.equal(workflowRunEvent(run("completed", { event: "run_complete" })), "run_complete");
    assert.equal(workflowRunEvent({ event: "node_update", node_key: "extract_1", status: "completed" }), "node_update");
  });

  it("derives the event from the run status when it is missing", () => {
    for (const status of ["failed", "error", "cancelled", "rejected", "FAILED"]) {
      assert.equal(workflowRunEvent(run(status)), "run_failed", status);
    }
    for (const status of ["completed", "success"]) assert.equal(workflowRunEvent(run(status)), "run_complete", status);
  });

  it("never treats cancelled, rejected or in-progress runs as success", () => {
    for (const status of ["cancelled", "rejected", "running", "pending", ""]) {
      assert.notEqual(workflowRunEvent(run(status)), "run_complete", status);
    }
  });

  it("treats node-level messages as node updates, whatever their status", () => {
    assert.equal(workflowRunEvent({ node_key: "load_2", status: "failed" }), "node_update");
    assert.equal(workflowRunEvent({ node_key: "load_2", status: "completed" }), "node_update");
    assert.equal(workflowRunEvent(null), "node_update");
  });
});

describe("workflowRunFailureNotice", () => {
  it("prefers the server's message", () => {
    assert.deepEqual(workflowRunFailureNotice(run("failed", { message: "Source table missing" })), {
      tone: "error",
      text: "Source table missing",
    });
  });

  it("gives cancelled runs a neutral notice and others an error", () => {
    assert.equal(workflowRunFailureNotice(run("cancelled")).tone, "neutral");
    assert.equal(workflowRunFailureNotice(run("cancelled")).text, "The workflow run was cancelled.");
    assert.equal(workflowRunFailureNotice(run("rejected")).text, "The workflow run was rejected.");
    assert.equal(workflowRunFailureNotice(run("failed")).text, "Workflow execution failed");
  });

  it("never shows a traceback or SQL error from the server", () => {
    const leaked = run("failed", {
      message: 'Traceback (most recent call last):\n  File "/app/workflow_engine.py", line 88',
      error: "(psycopg2.errors.UndefinedTable) relation \"x\" does not exist",
    });
    assert.equal(workflowRunFailureNotice(leaked).text, "Workflow execution failed");
    assert.equal(
      workflowRunFailureNotice(run("failed", { message: "", error: "Source table missing" })).text,
      "Source table missing"
    );
  });
});

describe("isWorkflowRunMessage", () => {
  it("recognises run-stream messages only", () => {
    assert.equal(isWorkflowRunMessage(run("completed")), true);
    assert.equal(isWorkflowRunMessage({ node_key: "x" }), true);
    assert.equal(isWorkflowRunMessage({ type: "ocr_complete", status: "completed" }), false);
    assert.equal(isWorkflowRunMessage(null), false);
  });
});
