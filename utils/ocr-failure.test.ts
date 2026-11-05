import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { documentFailureReason, ocrFailureMessage } from "./ocr-failure";

describe("documentFailureReason", () => {
  it("names the stage the document failed in", () => {
    assert.equal(
      documentFailureReason("error in extracting"),
      "Processing failed while extracting its text. Retry it, or share the document ID with support."
    );
    assert.match(documentFailureReason("error in mapping data")!, /while mapping fields to the protocol/);
    assert.match(documentFailureReason("Error in uploading")!, /while uploading the file/);
  });

  it("handles documents that failed more than once", () => {
    assert.match(documentFailureReason("error in error in processing")!, /while reading the document \(OCR\)/);
  });

  it("falls back when the stage is unknown, and ignores statuses that aren't errors", () => {
    assert.equal(
      documentFailureReason("error in something new"),
      "Processing failed. Retry it, or share the document ID with support."
    );
    assert.equal(documentFailureReason("extracting"), null);
    assert.equal(documentFailureReason(undefined), null);
  });
});

describe("ocrFailureMessage", () => {
  it("drops the exception the backend appends", () => {
    assert.equal(
      ocrFailureMessage(
        "Error processing File lease.pdf . Kindly retry the process or contact our support. 'NoneType' object has no attribute 'get'"
      ),
      "Couldn't process lease.pdf. Retry it, or contact support."
    );
  });

  it("keeps other readable messages and hides internal ones", () => {
    assert.equal(ocrFailureMessage("The file is password protected."), "The file is password protected.");
    assert.equal(
      ocrFailureMessage('Traceback (most recent call last):\n  File "/app/ocr_service.py", line 5790'),
      "OCR processing failed. Retry it, or contact support."
    );
    assert.equal(ocrFailureMessage(undefined), "OCR processing failed. Retry it, or contact support.");
  });
});
