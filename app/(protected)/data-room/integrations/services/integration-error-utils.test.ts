import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseIntegrationApiError } from "./integration-error-utils";

const fail = (status: number, data: unknown) => ({ isAxiosError: true, response: { status, data } });
const compile = [{ code: "E1", message: "mapping[a->b] invalid" }, { code: "E2", message: "x" }];

describe("parseIntegrationApiError (EP-1004 contract)", () => {
  it("reads message first, with compile errors as top-level extras", () => {
    const parsed = parseIntegrationApiError(
      fail(422, { error: "validation_error", message: "Mapping invalid", correlation_id: "c", compile_errors: compile, detail: "Mapping invalid" })
    );
    assert.deepEqual(parsed, { message: "Mapping invalid", compileErrors: compile });
  });

  it("still reads the legacy shape with extras under detail", () => {
    const parsed = parseIntegrationApiError(fail(422, { detail: { message: "Mapping invalid", compile_errors: compile } }));
    assert.deepEqual(parsed, { message: "Mapping invalid", compileErrors: compile });
  });

  it("puts preflight errors in place of the message, from either location", () => {
    assert.equal(parseIntegrationApiError(fail(409, { message: "Blocked", preflight_errors: ["Job is locked", "No upsert key"] }))?.message, "Job is locked\nNo upsert key");
    assert.equal(parseIntegrationApiError(fail(409, { detail: { message: "Blocked", preflight_errors: ["Job is locked"] } }))?.message, "Job is locked");
  });

  it("reads a detail string or a 422 list", () => {
    assert.equal(parseIntegrationApiError(fail(404, { detail: "Job not found" }))?.message, "Job not found");
    assert.equal(parseIntegrationApiError(fail(422, { detail: [{ msg: "name: Field required" }] }))?.message, "name: Field required");
  });

  it("marks compile errors without a message", () => {
    assert.deepEqual(parseIntegrationApiError(fail(422, { compile_errors: compile })), { message: "Request failed", compileErrors: compile });
  });

  it("returns null when there is nothing usable", () => {
    assert.equal(parseIntegrationApiError(fail(500, {})), null);
    assert.equal(parseIntegrationApiError(fail(502, "<html>502 Bad Gateway</html>")), null);
    assert.equal(parseIntegrationApiError({ isAxiosError: true, code: "ERR_NETWORK" }), null);
    assert.equal(parseIntegrationApiError(null), null);
  });
});
