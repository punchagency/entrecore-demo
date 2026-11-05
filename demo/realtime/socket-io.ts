import type { ManagerOptions, Socket, SocketOptions } from "socket.io-client";
import { attachSocketIOClient, dispatchClientEmit } from "./bus";

type Callback = (...args: unknown[]) => void;

/**
 * Stand-in for a socket.io-client Socket, covering what the app uses: on/off,
 * onAny, emit, connect/disconnect, `connected` and `id`. Events come from
 * demo/realtime/bus.ts instead of a server.
 */
class DemoSocket {
  id: string | undefined;
  connected = false;
  private listeners = new Map<string, Set<Callback>>();
  private anyListeners = new Set<Callback>();
  private detach: (() => void) | null = null;
  private static count = 0;

  on(event: string, callback: Callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return this;
  }

  off(event?: string, callback?: Callback) {
    if (!event) this.listeners.clear();
    else if (!callback) this.listeners.delete(event);
    else this.listeners.get(event)?.delete(callback);
    return this;
  }

  onAny(callback: Callback) {
    this.anyListeners.add(callback);
    return this;
  }

  offAny(callback?: Callback) {
    if (callback) this.anyListeners.delete(callback);
    else this.anyListeners.clear();
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    if (this.connected) dispatchClientEmit(event, args[0]);
    return this;
  }

  connect() {
    if (this.connected) return this;
    // Connect on the next tick, like a real socket, so callers' `on("connect")` runs.
    setTimeout(() => {
      DemoSocket.count += 1;
      this.id = `demo-socket-${DemoSocket.count}`;
      this.connected = true;
      this.detach = attachSocketIOClient((event, payload) => this.receive(event, payload));
      this.receive("connect");
    }, 0);
    return this;
  }

  open() {
    return this.connect();
  }

  disconnect() {
    if (!this.connected) return this;
    this.connected = false;
    this.detach?.();
    this.detach = null;
    this.receive("disconnect", "io client disconnect");
    return this;
  }

  close() {
    return this.disconnect();
  }

  private receive(event: string, ...args: unknown[]) {
    if (event !== "connect" && event !== "disconnect") {
      this.anyListeners.forEach((callback) => callback(event, ...args));
    }
    this.listeners.get(event)?.forEach((callback) => callback(...args));
  }
}

/** Drop-in for socket.io-client's `io(url, options)`; the arguments don't matter in the demo. */
export function io(...args: [url?: string, options?: Partial<ManagerOptions & SocketOptions>]): Socket {
  void args;
  return new DemoSocket() as unknown as Socket;
}
