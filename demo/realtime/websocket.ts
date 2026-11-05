import { attachWorkflowClient } from "./bus";

/**
 * Stand-in for the browser WebSocket used by the workflow-run channel. Opens on
 * the next tick and receives messages from demo/realtime/bus.ts `pushWorkflow`.
 * Only the onopen/onmessage/onerror/onclose style the app uses is supported.
 */
export class DemoWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = DemoWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  private detach: (() => void) | null = null;

  constructor(readonly url: string) {
    setTimeout(() => {
      if (this.readyState !== DemoWebSocket.CONNECTING) return;
      this.readyState = DemoWebSocket.OPEN;
      this.detach = attachWorkflowClient((data) => this.onmessage?.(new MessageEvent("message", { data })));
      this.onopen?.(new Event("open"));
    }, 0);
  }

  /** The workflow channel is server → client only, so anything sent is ignored. */
  send(): void {}

  close(code = 1000, reason = ""): void {
    if (this.readyState === DemoWebSocket.CLOSED) return;
    this.readyState = DemoWebSocket.CLOSED;
    this.detach?.();
    this.detach = null;
    this.onclose?.(new CloseEvent("close", { code, reason, wasClean: true }));
  }
}
