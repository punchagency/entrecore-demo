import type { Router } from "../router";
import { registerAuth } from "./auth";
import { registerCatalog } from "./catalog";
import { registerDataRoom } from "./data-room";
import { registerDrat } from "./drat";
import { registerGuides } from "./guides";
import { registerOrchestrator } from "./orchestrator";
import { registerPlatform } from "./platform";
import { registerWorkspace } from "./workspace";

/** Every hand-written endpoint. One file per product area. */
export function registerHandlers(router: Router) {
  registerAuth(router);
  registerPlatform(router);
  registerCatalog(router);
  registerGuides(router);
  registerOrchestrator(router);
  registerDataRoom(router);
  registerDrat(router);
  registerWorkspace(router);
}
