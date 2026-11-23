import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const performancesVersion = createHash("sha256")
  .update(readFileSync(new URL("../public/data/performances.json", import.meta.url)))
  .digest("hex")
  .slice(0, 12);
