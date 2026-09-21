const fs = require("fs");
const path = require("path");
const sourcePath = process.argv[2] || path.join(__dirname, "..", "XSUP_Auditor_v3.js");
const src = fs.readFileSync(sourcePath, "utf8");
const originMatch = src.match(/const TACOPILOT_ORIGIN = ("[^"]+");/);
const rootMatch = src.match(/const TACO_PATH_ROOT = ("[^"]+");/);
if (!originMatch || !rootMatch) throw new Error("TACO URL-scope constants not found");
const startNeedle = "function isSupportedTacoLocation";
const start = src.indexOf(startNeedle);
if (start < 0) throw new Error("isSupportedTacoLocation helper not found");
let i = src.indexOf("{", start), depth = 0, end = -1;
for (; i < src.length; i++) {
  const ch = src[i];
  if (ch === "{") depth++;
  else if (ch === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
}
if (end < 0) throw new Error("isSupportedTacoLocation helper body not closed");
const TACOPILOT_ORIGIN = JSON.parse(originMatch[1]);
const TACO_PATH_ROOT = JSON.parse(rootMatch[1]);
let isSupportedTacoLocation;
eval(src.slice(start, end).replace("function isSupportedTacoLocation", "isSupportedTacoLocation = function"));
const cases = [
  ["pilot root", "https://taco.paloaltonetworks.com:3009", "/taco/pilot/", true],
  ["case page", "https://taco.paloaltonetworks.com:3009", "/taco/case/03744225", true],
  ["investigation page", "https://taco.paloaltonetworks.com:3009", "/taco/pilot/investigation/04117443", true],
  ["taco root with slash", "https://taco.paloaltonetworks.com:3009", "/taco/", true],
  ["taco root no slash", "https://taco.paloaltonetworks.com:3009", "/taco", true],
  ["lookalike path rejected", "https://taco.paloaltonetworks.com:3009", "/tacofoo", false],
  ["site root rejected", "https://taco.paloaltonetworks.com:3009", "/", false],
  ["wrong port rejected", "https://taco.paloaltonetworks.com", "/taco/case/03744225", false],
  ["wrong scheme rejected", "http://taco.paloaltonetworks.com:3009", "/taco/case/03744225", false],
  ["wrong host rejected", "https://example.com:3009", "/taco/case/03744225", false]
];
let passed = 0;
for (const [name, origin, pathname, expected] of cases) {
  const actual = isSupportedTacoLocation({origin, pathname});
  if (actual !== expected) { console.error(`FAIL ${name}: expected ${expected}, got ${actual}`); process.exitCode = 1; }
  else { console.log(`PASS ${name}`); passed++; }
}
console.log(`${passed}/${cases.length} passed`);
