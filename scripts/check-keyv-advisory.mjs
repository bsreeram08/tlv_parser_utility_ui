import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const ADVISORY = "GHSA-3p9h-f68w-m6fx";
const MALICIOUS_VERSION = "6.0.0";
const evidence = [];
const observedVersions = new Set();

if (existsSync("bun.lock")) {
  const source = readFileSync("bun.lock", "utf8");
  for (const match of source.matchAll(/keyv@(\d+\.\d+\.\d+)/g)) {
    observedVersions.add(match[1]);
  }
  if (source.includes(`keyv@${MALICIOUS_VERSION}`)) {
    evidence.push(`bun.lock references keyv ${MALICIOUS_VERSION}`);
  }
}

if (existsSync("package-lock.json")) {
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  for (const [path, manifest] of Object.entries(lock.packages ?? {})) {
    if (!path.endsWith("node_modules/keyv") || !manifest?.version) continue;
    observedVersions.add(manifest.version);
    if (manifest.version === MALICIOUS_VERSION) {
      evidence.push(`${path} is keyv ${MALICIOUS_VERSION} in package-lock.json`);
    }
  }
}

try {
  const require = createRequire(import.meta.url);
  const manifestPath = require.resolve("keyv/package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  observedVersions.add(manifest.version);
  if (manifest.version === MALICIOUS_VERSION) {
    evidence.push(`installed keyv is ${MALICIOUS_VERSION} at ${manifestPath}`);
  }
} catch {
  // keyv is optional; absence is safe for this advisory.
}

if (evidence.length > 0) {
  console.error(`${ADVISORY}: BLOCKED`);
  for (const item of evidence) console.error(`- ${item}`);
  process.exit(1);
}

const observed = [...observedVersions].sort().join(", ") || "not installed";
console.log(
  `${ADVISORY}: not affected (blocked version ${MALICIOUS_VERSION}; observed ${observed})`,
);
