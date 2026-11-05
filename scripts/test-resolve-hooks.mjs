// Lets `node --test` import app code the way the bundler does: `@/…` maps to the project root
// and extensionless relative imports resolve to .ts/.tsx. Loaded by the "test" npm script.
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`);
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    const target = specifier.startsWith("@/") ? new URL(specifier.slice(2), root).href : specifier;
    const isLocal = target.startsWith(".") || target.startsWith("file:");
    try {
      return nextResolve(target, context);
    } catch (error) {
      if (!isLocal || /\.[cm]?[jt]sx?$/.test(target)) throw error;
      for (const extension of EXTENSIONS) {
        try {
          return nextResolve(target + extension, context);
        } catch {
          // try the next extension
        }
      }
      throw error;
    }
  },
});
