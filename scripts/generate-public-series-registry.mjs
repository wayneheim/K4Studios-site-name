import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sanitizePublicSeriesRegistry } from "../src/data/seriesRegistryPublic.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = path.join(__dirname, "..", "src", "data", "seriesRegistry.json");
const OUTPUT_PATH = path.join(__dirname, "..", "public", "data", "seriesRegistry.json");

const registry = JSON.parse(fs.readFileSync(SOURCE_PATH, "utf8"));
const publicRegistry = sanitizePublicSeriesRegistry(registry);

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(publicRegistry, null, 2), "utf8");

console.log(`[gen:series-registry] Wrote public registry to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
