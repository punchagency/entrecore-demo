/**
 * What each screen of the demo stands for, shown in the internal roadmap view
 * (`?view=roadmap`). This is how the demo doubles as the backend roadmap:
 *
 *   live     in the product today, backed by the real API
 *   partial  the screen exists, but parts of it are scripted here because the backend doesn't do them yet
 *   roadmap  demo only; the backend for it is not built
 *
 * Longest matching prefix wins. Keep `backend` to what was verified in code.
 */
export type ScreenStatus = "live" | "partial" | "roadmap";

export interface ScreenEntry {
  route: string;
  area: string;
  status: ScreenStatus;
  summary: string;
  /** What the backend has, or must build, for this screen. */
  backend?: string[];
}

export const SCREENS: ScreenEntry[] = [
  {
    route: "/guides",
    area: "Agents",
    status: "live",
    summary: "Agent list, detail, architecture and chat. Answers are scripted per agent in demo/data/agents.ts.",
    backend: [
      "GET/POST/PUT/DELETE /data/guides (routers/agent.py)",
      "GET /data/guides/{id}/architecture (agent/guide_architecture.py)",
      "POST /data/guides/{id}/execute → Socket.IO agent_response",
    ],
  },
];

export function screenFor(pathname: string): ScreenEntry | undefined {
  return SCREENS.filter((entry) => pathname === entry.route || pathname.startsWith(`${entry.route}/`)).sort(
    (a, b) => b.route.length - a.route.length
  )[0];
}
