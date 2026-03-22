/**
 * Patched zod module that fixes z.record() Zod 3 -> 4 API change.
 * Imports from the actual zod file path to avoid circular alias resolution.
 */

// Import directly from the real zod file, not "zod" (which is aliased to this file)
// @ts-expect-error - direct file import
import * as originalZodNs from "../node_modules/zod/v4/classic/external.js";

const origRecord = originalZodNs.record;

function record(...args: any[]): any {
  if (args.length === 1) {
    return origRecord(originalZodNs.string(), args[0]);
  }
  return (origRecord as any)(...args);
}

// Re-export everything from the original
// @ts-expect-error - direct file import  
export * from "../node_modules/zod/v4/classic/external.js";

// Override record
export { record };

// Create patched z namespace
const z = new Proxy(originalZodNs, {
  get(target: any, prop: string | symbol) {
    if (prop === "record") return record;
    return target[prop];
  },
});

export { z };
export default z;
