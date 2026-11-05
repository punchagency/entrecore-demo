import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { getApiErrorMessage } from "@/utils/api-error";
import {
  completeDratUploadBatch,
  createDratUploadBatch,
  DRAT_BULK_MAX_FILES,
  getDratBulkFileRejection,
  getDratStorageUploadErrorMessage,
  putDratUploadObject,
  type DratBulkUploadFileRequest,
  type DratBulkUploadItemTicket,
} from "../services/bulk-upload-api";

/** PUTs in flight at once, across the first pass and any retries. */
const DRAT_BULK_UPLOAD_CONCURRENCY = 4;

/** Re-sign a URL this close to expiry rather than start an upload that may be refused. */
const TICKET_EXPIRY_MARGIN_MS = 60_000;

export type DratBulkRowStatus =
  | "rejected" // failed the client pre-check, never sent
  | "ready" // selected, batch not created yet
  | "queued"
  | "uploading"
  | "uploaded"
  | "failed";

export interface DratBulkRow {
  id: string;
  file: File;
  status: DratBulkRowStatus;
  /** Bytes sent to storage so far. */
  loaded: number;
  error: string | null;
  /** Backend batch item id, set once the batch is created. */
  itemId: string | null;
}

export type DratBulkPhase =
  | "selecting"
  | "creating"
  | "uploading"
  | "attention" // uploads settled, but something needs the user (a failed file or a failed complete)
  | "completing"
  | "completed";

interface ActiveBatch {
  id: string;
  idempotencyKey: string;
  /** The exact create payload — replaying it with the same key re-signs the URLs. */
  files: DratBulkUploadFileRequest[];
  tickets: Map<string, DratBulkUploadItemTicket>;
}

export interface DratBulkAddResult {
  added: number;
  duplicates: number;
  overLimit: number;
}

/** Runs at most `limit` tasks at once; the rest wait in FIFO order. */
function createLimiter(limit: number) {
  let active = 0;
  const waiting: Array<() => void> = [];

  const next = () => {
    if (active >= limit) return;
    const start = waiting.shift();
    if (!start) return;
    active += 1;
    start();
  };

  return function run(task: () => Promise<void>): Promise<void> {
    return new Promise<void>((resolve) => {
      waiting.push(() => {
        task()
          .finally(() => {
            active -= 1;
            next();
          })
          .then(resolve, resolve);
      });
      next();
    });
  };
}

const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

const expiresSoon = (ticket: DratBulkUploadItemTicket) =>
  new Date(ticket.expires_at).getTime() - Date.now() < TICKET_EXPIRY_MARGIN_MS;

const isInFlight = (row: DratBulkRow) => row.status === "queued" || row.status === "uploading";

export function useDratBulkUpload() {
  const [rows, setRows] = useState<DratBulkRow[]>([]);
  const [phase, setPhase] = useState<DratBulkPhase>("selecting");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Upload callbacks outlive renders, so they read and write through refs.
  const rowsRef = useRef<DratBulkRow[]>([]);
  const batchRef = useRef<ActiveBatch | null>(null);
  const createKeyRef = useRef<string | null>(null);
  const resignRef = useRef<Promise<void> | null>(null);
  const completingRef = useRef(false);
  const disposedRef = useRef(false);
  const controllersRef = useRef(new Map<string, AbortController>());
  const limiterRef = useRef(createLimiter(DRAT_BULK_UPLOAD_CONCURRENCY));

  const commitRows = useCallback((next: DratBulkRow[]) => {
    rowsRef.current = next;
    setRows(next);
  }, []);

  const patchRow = useCallback(
    (id: string, patch: Partial<DratBulkRow>) => {
      commitRows(rowsRef.current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    },
    [commitRows]
  );

  const abortAll = useCallback(() => {
    controllersRef.current.forEach((controller) => controller.abort());
    controllersRef.current.clear();
  }, []);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      abortAll();
    };
  }, [abortAll]);

  const addFiles = useCallback(
    (files: File[]): DratBulkAddResult => {
      const result: DratBulkAddResult = { added: 0, duplicates: 0, overLimit: 0 };
      if (phase !== "selecting") return result;

      const existing = rowsRef.current;
      const seen = new Set(existing.map((row) => fileKey(row.file)));
      let readyCount = existing.filter((row) => row.status === "ready").length;
      const added: DratBulkRow[] = [];

      for (const file of files) {
        const key = fileKey(file);
        if (seen.has(key)) {
          result.duplicates += 1;
          continue;
        }
        seen.add(key);

        const rejection = getDratBulkFileRejection(file);
        if (!rejection && readyCount >= DRAT_BULK_MAX_FILES) {
          result.overLimit += 1;
          continue;
        }
        if (!rejection) readyCount += 1;

        added.push({
          id: uuidv4(),
          file,
          status: rejection ? "rejected" : "ready",
          loaded: 0,
          error: rejection,
          itemId: null,
        });
      }

      if (added.length > 0) {
        commitRows([...existing, ...added]);
        // A different file set is a different batch, so it needs a new key.
        createKeyRef.current = null;
        setBatchError(null);
      }
      result.added = added.length;
      return result;
    },
    [commitRows, phase]
  );

  const removeRow = useCallback(
    (id: string) => {
      if (phase !== "selecting") return;
      commitRows(rowsRef.current.filter((row) => row.id !== id));
      createKeyRef.current = null;
    },
    [commitRows, phase]
  );

  const removeRejected = useCallback(() => {
    commitRows(rowsRef.current.filter((row) => row.status !== "rejected"));
  }, [commitRows]);

  /** Single-flight: concurrent callers share one re-sign request. */
  const refreshTickets = useCallback((): Promise<void> => {
    const batch = batchRef.current;
    if (!batch) return Promise.reject(new Error("No active batch."));

    resignRef.current ??= createDratUploadBatch(batch.files, batch.idempotencyKey)
      .then((renewed) => {
        renewed.items.forEach((ticket) => batch.tickets.set(ticket.item_id, ticket));
      })
      .catch((err: unknown) => {
        throw new Error(getApiErrorMessage(err, "Couldn't renew the upload link."));
      })
      .finally(() => {
        resignRef.current = null;
      });
    return resignRef.current;
  }, []);

  const uploadRow = useCallback(
    (rowId: string) =>
      limiterRef.current(async () => {
        const batch = batchRef.current;
        const row = rowsRef.current.find((r) => r.id === rowId);
        if (disposedRef.current || !batch || !row?.itemId) return;

        patchRow(rowId, { status: "uploading", loaded: 0, error: null });
        const controller = new AbortController();
        controllersRef.current.set(rowId, controller);

        try {
          let ticket = batch.tickets.get(row.itemId);
          if (!ticket || expiresSoon(ticket)) {
            await refreshTickets();
            ticket = batch.tickets.get(row.itemId);
          }
          if (!ticket) throw new Error("The server returned no upload link for this file.");

          let lastPercent = 0;
          await putDratUploadObject(ticket, row.file, {
            signal: controller.signal,
            onProgress: (loaded) => {
              // Only re-render when the visible percentage moves.
              const percent = Math.floor((loaded / row.file.size) * 100);
              if (percent === lastPercent) return;
              lastPercent = percent;
              patchRow(rowId, { loaded: Math.min(loaded, row.file.size) });
            },
          });
          patchRow(rowId, { status: "uploaded", loaded: row.file.size });
        } catch (err) {
          patchRow(rowId, {
            status: "failed",
            loaded: 0,
            error: getDratStorageUploadErrorMessage(err),
          });
        } finally {
          controllersRef.current.delete(rowId);
        }
      }),
    [patchRow, refreshTickets]
  );

  /**
   * POST complete. Also the "finish without the failed files" escape hatch.
   * Resolves true when the batch is completed.
   */
  const finish = useCallback(async (): Promise<boolean> => {
    const batch = batchRef.current;
    if (!batch || completingRef.current || rowsRef.current.some(isInFlight)) return false;

    completingRef.current = true;
    setPhase("completing");
    setBatchError(null);
    try {
      await completeDratUploadBatch(batch.id);
      setPhase("completed");
      return true;
    } catch (err) {
      setBatchError(getApiErrorMessage(err, "Couldn't finish the batch."));
      setPhase("attention");
      return false;
    } finally {
      completingRef.current = false;
    }
  }, []);

  /** After any upload pass: complete when every file is in, otherwise wait for the user. */
  const settle = useCallback(
    async (batch: ActiveBatch): Promise<boolean> => {
      if (batchRef.current !== batch) return false; // reset since this pass started
      const batchRows = rowsRef.current.filter((row) => row.itemId);
      if (batchRows.some(isInFlight)) return false; // another pass is still running and will settle
      if (batchRows.some((row) => row.status === "failed")) {
        setPhase("attention");
        return false;
      }
      return finish();
    },
    [finish]
  );

  /** Create the batch and upload every ready file. Resolves true when the batch is completed. */
  const start = useCallback(async (): Promise<boolean> => {
    const batchRows = rowsRef.current.filter((row) => row.status === "ready");
    if (phase !== "selecting" || batchRows.length === 0) return false;

    setPhase("creating");
    setBatchError(null);

    const files = batchRows.map((row) => ({ filename: row.file.name, size_bytes: row.file.size }));
    // Kept across failed attempts so a create that committed but lost its
    // response replays the same batch instead of making a second one.
    const idempotencyKey = (createKeyRef.current ??= uuidv4());

    let created;
    try {
      created = await createDratUploadBatch(files, idempotencyKey);
    } catch (err) {
      setBatchError(getApiErrorMessage(err, "Couldn't create the upload batch."));
      setPhase("selecting");
      return false;
    }

    // Pair tickets with rows by filename (the server trims it). Items come back
    // in request order for a new batch, so first-unused-match is exact there.
    const unpaired = [...created.items];
    const itemIdByRow = new Map<string, string>();
    for (const row of batchRows) {
      const index = unpaired.findIndex((ticket) => ticket.filename === row.file.name.trim());
      if (index === -1) break;
      itemIdByRow.set(row.id, unpaired[index].item_id);
      unpaired.splice(index, 1);
    }
    if (itemIdByRow.size !== batchRows.length || unpaired.length > 0) {
      createKeyRef.current = null;
      setBatchError(
        "The server returned a batch that doesn't match the selected files. Try again."
      );
      setPhase("selecting");
      return false;
    }

    const batch: ActiveBatch = {
      id: created.batch_id,
      idempotencyKey,
      files,
      tickets: new Map(created.items.map((ticket) => [ticket.item_id, ticket])),
    };
    batchRef.current = batch;
    setBatchId(created.batch_id);
    commitRows(
      rowsRef.current.map((row) => {
        const itemId = itemIdByRow.get(row.id);
        return itemId ? { ...row, itemId, status: "queued" } : row;
      })
    );
    setPhase("uploading");

    await Promise.all(batchRows.map((row) => uploadRow(row.id)));
    return settle(batch);
  }, [commitRows, phase, settle, uploadRow]);

  /**
   * Re-upload only the given failed files; uploaded ones are never sent again.
   * Resolves true when this retry was the one that completed the batch.
   */
  const retry = useCallback(
    async (rowIds: string[]): Promise<boolean> => {
      const batch = batchRef.current;
      const ids = rowIds.filter((id) =>
        rowsRef.current.some((row) => row.id === id && row.status === "failed")
      );
      // Once complete has been sent, the server no longer expects these files.
      if (ids.length === 0 || !batch || completingRef.current || phase === "completed") {
        return false;
      }

      commitRows(
        rowsRef.current.map((row) =>
          ids.includes(row.id) ? { ...row, status: "queued", loaded: 0, error: null } : row
        )
      );
      setPhase("uploading");
      setBatchError(null);

      // A failed PUT is often a refused or stale URL, so retries start from fresh ones.
      try {
        await refreshTickets();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Couldn't renew the upload link.";
        commitRows(
          rowsRef.current.map((row) =>
            ids.includes(row.id) ? { ...row, status: "failed", error: message } : row
          )
        );
        return settle(batch);
      }

      await Promise.all(ids.map((id) => uploadRow(id)));
      return settle(batch);
    },
    [commitRows, phase, refreshTickets, settle, uploadRow]
  );

  const retryFailed = useCallback(
    () => retry(rowsRef.current.filter((row) => row.status === "failed").map((row) => row.id)),
    [retry]
  );

  const reset = useCallback(() => {
    abortAll();
    batchRef.current = null;
    createKeyRef.current = null;
    resignRef.current = null;
    commitRows([]);
    setBatchId(null);
    setBatchError(null);
    setPhase("selecting");
  }, [abortAll, commitRows]);

  // Leaving mid-batch abandons it: files already in storage are never staged.
  const hasUnfinishedBatch =
    phase === "creating" ||
    phase === "uploading" ||
    phase === "attention" ||
    phase === "completing";
  useEffect(() => {
    if (!hasUnfinishedBatch) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnfinishedBatch]);

  const summary = useMemo(() => {
    const count = (status: DratBulkRowStatus) => rows.filter((row) => row.status === status).length;
    const batchRows = rows.filter((row) => row.itemId);
    const totalBytes = batchRows.reduce((sum, row) => sum + row.file.size, 0);
    const sentBytes = batchRows.reduce(
      (sum, row) => sum + (row.status === "uploaded" ? row.file.size : row.loaded),
      0
    );
    return {
      ready: count("ready"),
      rejected: count("rejected"),
      uploading: count("uploading") + count("queued"),
      uploaded: count("uploaded"),
      failed: count("failed"),
      batchSize: batchRows.length,
      percent: totalBytes > 0 ? Math.round((sentBytes / totalBytes) * 100) : 0,
    };
  }, [rows]);

  return {
    rows,
    phase,
    batchId,
    batchError,
    summary,
    addFiles,
    removeRow,
    removeRejected,
    start,
    retry,
    retryFailed,
    finish,
    reset,
  };
}
