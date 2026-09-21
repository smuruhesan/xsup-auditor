const fs = require("fs");
const path = require("path");
const sourcePath = process.argv[2] || path.join(__dirname, "..", "src", "xsup-auditor.js");
const src = fs.readFileSync(sourcePath, "utf8");
const startNeedle = "const primaryResultSatisfiesRequest = result => {";
const start = src.indexOf(startNeedle);
if (start < 0) throw new Error("primaryResultSatisfiesRequest helper not found");
let i = src.indexOf("{", start), depth = 0, end = -1;
for (; i < src.length; i++) {
  const ch = src[i];
  if (ch === "{") depth++;
  else if (ch === "}") {
    depth--;
    if (depth === 0) { end = i + 1; break; }
  }
}
if (end < 0) throw new Error("primaryResultSatisfiesRequest helper body not closed");
const helperSource = src.slice(start, end) + ";";

function run(directKnowledgeOnly, primaryRequest, result) {
  const normalizeDecision = s => String(s || "").trim().toUpperCase();
  const job = { directKnowledgeOnly };
  let primaryResultSatisfiesRequest;
  eval(helperSource.replace("const primaryResultSatisfiesRequest", "primaryResultSatisfiesRequest"));
  return primaryResultSatisfiesRequest(result);
}

const cases = [
  ["direct CREATE -> CREATE", true, {role:"primary", action:"CREATE KCS", type:"KCS_DRAFT"}, {role:"primary", action:"CREATE KCS", type:"KCS_DRAFT", status:"completed"}, true],
  ["direct CREATE -> UPDATE", true, {role:"primary", action:"CREATE KCS", type:"KCS_DRAFT"}, {role:"primary", action:"UPDATE EXISTING KCS", type:"KCS_UPDATE", status:"completed"}, true],
  ["normal CREATE -> UPDATE remains rejected", false, {role:"primary", action:"CREATE KCS", type:"KCS_DRAFT"}, {role:"primary", action:"UPDATE EXISTING KCS", type:"KCS_UPDATE", status:"completed"}, false],
  ["normal UPDATE -> UPDATE", false, {role:"primary", action:"UPDATE EXISTING KCS", type:"KCS_UPDATE"}, {role:"primary", action:"UPDATE EXISTING KCS", type:"KCS_UPDATE", status:"completed"}, true],
  ["secondary cannot satisfy primary", true, {role:"primary", action:"CREATE KCS", type:"KCS_DRAFT"}, {role:"secondary", action:"UPDATE EXISTING KCS", type:"KCS_UPDATE", status:"completed"}, false],
  ["inconsistent KCS type/action rejected", true, {role:"primary", action:"CREATE KCS", type:"KCS_DRAFT"}, {role:"primary", action:"CREATE KCS", type:"KCS_UPDATE", status:"completed"}, false],
  ["failed result rejected", true, {role:"primary", action:"CREATE KCS", type:"KCS_DRAFT"}, {role:"primary", action:"UPDATE EXISTING KCS", type:"KCS_UPDATE", status:"failed"}, false]
];

let passed = 0;
for (const [name, direct, request, result, expected] of cases) {
  const actual = run(direct, request, result);
  if (actual !== expected) {
    console.error(`FAIL ${name}: expected ${expected}, got ${actual}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${name}`);
    passed++;
  }
}
console.log(`${passed}/${cases.length} passed`);
