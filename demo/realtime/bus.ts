/**
 * The demo's "server push" side. Handlers call these to play scripted events
 * to the fake Socket.IO client (agent replies, OCR results, notifications) and
 * the fake workflow WebSocket (node-by-node run progress).
 */

type Listener = (event: string, payload: unknown) => void;
type ClientEmitHandler = (payload: unknown) => void;

const socketIOClients = new Set<Listener>();
const workflowClients = new Set<(message: string) => void>();
const clientEmitHandlers = new Map<string, ClientEmitHandler>();

export function attachSocketIOClient(listener: Listener): () => void {
  socketIOClients.add(listener);
  return () => socketIOClients.delete(listener);
}

export function attachWorkflowClient(listener: (message: string) => void): () => void {
  workflowClients.add(listener);
  return () => workflowClients.delete(listener);
}

/** Send a Socket.IO event to every connected client, after `delayMs`. */
export function pushSocketIO(event: string, payload: unknown, delayMs = 0): void {
  setTimeout(() => socketIOClients.forEach((listener) => listener(event, structuredClone(payload))), delayMs);
}

/** Send a JSON message on the workflow WebSocket, after `delayMs`. */
export function pushWorkflow(message: unknown, delayMs = 0): void {
  const raw = JSON.stringify(message);
  setTimeout(() => workflowClients.forEach((listener) => listener(raw)), delayMs);
}

/** Answer events the client emits over Socket.IO (e.g. `backlog`). Unknown events are ignored. */
export function onClientEmit(event: string, handler: ClientEmitHandler): void {
  clientEmitHandlers.set(event, handler);
}

export function dispatchClientEmit(event: string, payload: unknown): void {
  clientEmitHandlers.get(event)?.(payload);
}

/**
 * Run scripted steps at fixed offsets from now. Offsets are absolute (ms from
 * the start), so a timeline reads like a script: `[{ at: 0 }, { at: 1500 }, ...]`.
 */
export function playTimeline(steps: Array<{ at: number; run: () => void }>): void {
  for (const step of steps) setTimeout(step.run, step.at);
}
