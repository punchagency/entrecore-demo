import type { Router } from "../router";
import { registerAuth } from "./auth";
import { registerCatalog } from "./catalog";
import { registerGuides } from "./guides";
import { registerPlatform } from "./platform";

/** Every hand-written endpoint. One file per product area. */
export function registerHandlers(router: Router) {
  registerAuth(router);
  registerPlatform(router);
  registerCatalog(router);
  registerGuides(router);
}
