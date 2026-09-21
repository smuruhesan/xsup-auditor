/*
XSUP Auditor & KCS Generator v3 — GitHub Release
Supported product profiles
- XDR/XSIAM
- XSOAR
- Cortex Cloud

Runtime model
- One Chrome DevTools Snippet running inside TACopilot.
- Uses the reviewer's existing authenticated TACopilot session only.
- Runs from any authenticated TACO page under https://taco.paloaltonetworks.com:3009/taco/ (for example /taco/pilot/ or /taco/case/<SFDC>).
- Automatically detects the product from structured case/TACO metadata when possible.
- Low-confidence/ambiguous product detection pauses only that XSUP for reviewer selection.
- Product can be manually changed; a product change invalidates Audit/Knowledge reuse but does not force TACO refresh.
- Reviewer-selectable XSUP/TACO workers: 2, 3, 5 or 10 (default 2); two Knowledge workers remain independent.
- A shared generation cap remains fixed at no more than two Case Chat generations at once across both queues, even when XSUP/TACO parallelism is increased.
- Failed Audit or Knowledge stages can be retried independently while retaining a successful current TACO snapshot.
- Automatic TACO freshness: reuse current analysis, wait for a running analysis, or refresh only when current evidence requires it.
- Hard TACO barrier: Audit/Knowledge Case Chat is never started while the selected TACO investigation is active; an older synthesized report cannot bypass a running refresh.
- If Jira/SFDC evidence is newer than the completed TACO report, TACO is refreshed and the final revised report is awaited before downstream generation.
- Audit and knowledge Case Chat results are fingerprinted and reused only when their current inputs still match.
- Retrospective knowledge review distinguishes existing internal knowledge from a Salesforce/distribution gap; all knowledge artifacts share one linked evidence/review envelope, including fallback/reused drafts.
- Knowledge generation is adaptive across products/components/artifact types; Internal Notes preserve useful TAC/Engineering implementation context in readable form while public-facing bodies stay reusable and source-validated.
- Review Paste Comment uses readable paragraph/action spacing and can be copied directly from both the live panel and downloaded retrospective HTML.
- The retrospective Audit is the primary knowledge-routing decision: it inspects available existing KCS/docs/pages/prior evidence and explicitly selects CREATE KCS, UPDATE EXISTING KCS, Admin/Tech Guide, Runbook, Known Issue/Release Note, or no knowledge action. No hidden companion artifact is injected after the Audit.
- Every generated knowledge draft carries a highlighted validation notice, source freshness/applicability guidance, explicit conflict review, anti-circularity safeguards, origin traceability, and detailed sourced TAC/Engineering context in Internal Notes.
- Dedicated Generate KCS produces only a KCS-family artifact, performs CREATE-vs-UPDATE content matching, and lets the reviewer deliberately create a separate new KCS when an existing KCS is available; the new draft keeps the related existing KCS referenced.
- Manual SFDC fallback is available inline when automatic mapping is unavailable, without restarting the workflow.
- Fresh re-analysis/regeneration controls remain actionable after completion; queued knowledge no longer unnecessarily disables them.
- Live Dashboard final state is derived from the whole workflow: audit completion never overrides pending/queued/generating Knowledge work, and Completed is shown only after all required downstream work is terminal.
- Every review/blocker is rendered directly beside the affected claim/reference, with canonical claim highlighting, readable R# source identity, structured review category, specific why/action guidance, and no separate bottom review inventory.
- Exact non-authoritative timing is routed through formal claim-linked review items instead of raw editorial timing notes; Markdown evidence tables render as HTML tables.
- Source-currentness reviews are created only when a historical/non-authoritative source materially supports a reusable technical claim; background-only source age remains visible in Source References without creating noisy body reviews.
- Review routing, source provenance/freshness, audit sanitization and list rendering are hardened so exact details remain reviewable without being presented as automatically authoritative.
- Renderer/finalizer guards strip quality-control preambles, keep ordered procedure numbering continuous across blank/code blocks, keep review highlights out of HTML attributes, and prevent numbered-list residue from leaking into Audit comments.

Artifact storage
- Default: browser Downloads.
- Optional: reviewer-selected writable local/desktop-synced folder via Chrome's folder picker.
- Folder handles stay in memory only and are not serialized.
- In Browser Downloads mode, the validated Audit HTML is auto-downloaded first. Only after that download is initiated are the Audit-selected Knowledge artifacts queued. Each completed Knowledge artifact then auto-downloads immediately as its own standalone HTML using the exact v2.4.32 browser-download primitive.
- A consolidated Download All Knowledge Drafts ZIP remains available as an optional reviewer action. A selected writable folder receives each standalone artifact independently.
- Storage failure never changes the audit result. The per-artifact Download button uses the same direct download path as automatic Knowledge delivery.
- Runtime integrity fix: the Knowledge HTML validation-notice renderer is restored; generated Knowledge can no longer fail during HTML rendering with a missing helper before the browser download call.
- Stabilization rule: retrospective Knowledge routing is locked to the validated Audit decision. Later Knowledge generation may flag a routing conflict for review, but it cannot silently change CREATE KCS into UPDATE EXISTING KCS. Dedicated Generate KCS remains the intentional route-reconciliation exception.
- v3 release fix: Direct Generate KCS now treats its permitted CREATE→UPDATE reconciliation as a successful required primary artifact instead of falsely failing the aggregate Knowledge state. Direct-mode failure text no longer refers to an Audit-selected artifact.
- v3 URL-scope fix: the bookmark can be launched from any authenticated page under the exact TACO origin and `/taco` path tree, including `/taco/pilot/...` and `/taco/case/...`; other origins and lookalike paths remain rejected.
- Required-artifact integrity: a successful secondary artifact cannot hide a failed/missing primary Audit-selected artifact, and a required Audit-selected artifact cannot resolve as "not required" because of an internal routing mismatch.
- Review rendering integrity: claim-review callouts targeting headings render after the heading rather than inside the heading element.
*/
(() => {
  "use strict";

  const VERSION = "3";
  const BUILD_ID = "github-v3";
  const POLL_MS = 5000;
  const TACO_STALL_NOTICE_MS = 15 * 60 * 1000;
  const TACO_INVESTIGATION_RECHECK_MS = 30 * 1000;
  const TACO_MUTATION_GRACE_MS = 30 * 1000;
  const TACO_RECOVERY_RETRY_LIMIT = 1;
  const CHAT_TIMEOUT_MS = 15 * 60 * 1000;
  const NETWORK_FETCH_TIMEOUT_MS = 20000;
  const REUSE_HISTORY_TIMEOUT_MS = 12000;
  const CASECHAT_POLL_TIMEOUT_MS = 10000;
  const EXISTING_CASECHAT_STALE_MS = 12 * 60 * 1000;
  const EXISTING_CASECHAT_GRACE_WAIT_MS = 60 * 1000;
  const NO_PROGRESS_WARNING_MS = 3 * 60 * 1000;
  const NO_RESPONSE_WARNING_MS = 60 * 1000;
  const REPO_URL = "https://github.com/smuruhesan/xsup-auditor";
  const AUDIT_REUSE_SCHEMA = "support-field-review-v11-audit-led-knowledge-routing";
  const KNOWLEDGE_REUSE_SCHEMA = "knowledge-quality-v13-final-inline-evidence-reliability";
  const KNOWLEDGE_DRAFT_REUSE_SCHEMA = "knowledge-enriched-draft-v13-final-inline-evidence-reliability";
  const KNOWLEDGE_FINAL_DELIMITER = "--- FINAL ARTIFACT ---";
  const REUSE_META_PREFIX = "[XSUP-AUDITOR-META]";

  const PRODUCT_PROFILES = Object.freeze({
    XDR_XSIAM: Object.freeze({
      key: "XDR_XSIAM",
      label: "XDR/XSIAM",
      primaryFieldOrder: ["Resolution"],
      eligibility: 'Resolution = "Functions as designed"',
      policy: `
XDR/XSIAM RETROSPECTIVE POLICY
- The ticket is IN SCOPE when the current Resolution is exactly "Functions as designed".
- Resolution is the applicable retrospective field for that trigger.
- RCA, Fix Type and Flag/Label are NOT APPLICABLE unless the supplied original ticket evidence explicitly establishes that an additional field is part of the approved retrospective policy for this ticket.
- If the current Resolution cannot be established from original ticket evidence, Retrospective Eligibility is UNDETERMINED.
- If the current Resolution is established and is not "Functions as designed", Retrospective Eligibility is OUT OF SCOPE. Do not force a field verdict for an out-of-scope trigger.`
    }),
    XSOAR: Object.freeze({
      key: "XSOAR",
      label: "XSOAR",
      primaryFieldOrder: ["Fix Type", "Flag / Label"],
      eligibility: 'Label = "Session_candidate" OR Fix Type = "None" / "Functions as designed"',
      policy: `
XSOAR RETROSPECTIVE POLICY
- The ticket is IN SCOPE when either:
  1. the applicable Label/Flag contains "Session_candidate", OR
  2. the current Fix Type is "None" or "Functions as designed".
- Review Fix Type only when its current value matches the XSOAR retrospective trigger above.
- Review Flag/Label only when Session_candidate is present.
- If both triggers are present, review both fields.
- Resolution and RCA are NOT APPLICABLE unless original ticket evidence explicitly establishes them as part of the approved XSOAR retrospective policy for this ticket.
- If the triggering field values cannot be established from original ticket evidence, Retrospective Eligibility is UNDETERMINED.`
    }),
    CORTEX_CLOUD: Object.freeze({
      key: "CORTEX_CLOUD",
      label: "Cortex Cloud",
      primaryFieldOrder: ["Resolution", "RCA"],
      eligibility: 'Resolution in {Duplicate, Not a Bug, Environment/Config issue, Invalid, Functions as designed, Non Issue} OR RCA = "User Error"',
      policy: `
CORTEX CLOUD RETROSPECTIVE POLICY
- The ticket is IN SCOPE when either:
  1. the current Resolution is one of: Duplicate, Not a Bug, Environment/Config issue, Invalid, Functions as designed, Non Issue; OR
  2. the current RCA is "User Error".
- Review Resolution only when its current value matches one of the Resolution triggers above.
- Review RCA only when its current value is "User Error".
- If both triggers are present, review both fields.
- Fix Type and Flag/Label are NOT APPLICABLE unless original ticket evidence explicitly establishes them as part of the approved Cortex Cloud retrospective policy for this ticket.
- If the triggering field values cannot be established from original ticket evidence, Retrospective Eligibility is UNDETERMINED.`
    })
  });

  const PRODUCT_KEYS = Object.freeze(Object.keys(PRODUCT_PROFILES));


  const TACOPILOT_ORIGIN = "https://taco.paloaltonetworks.com:3009";
  const TACO_PATH_ROOT = "/taco";
  function isSupportedTacoLocation(loc = location) {
    const pathname = String(loc?.pathname || "");
    return loc?.origin === TACOPILOT_ORIGIN &&
      (pathname === TACO_PATH_ROOT || pathname.startsWith(`${TACO_PATH_ROOT}/`));
  }
  if (!isSupportedTacoLocation(location)) {
    alert("XSUP Auditor: open an authenticated TACO page under https://taco.paloaltonetworks.com:3009/taco/ first, then run this tool.");
    return;
  }

  const state = {
    // Selected job mirrors. Kept so existing report/link renderers can
    // work without accessing another job's data.
    xsup: "",
    caseNumber: "",
    investigationId: null,
    report: null,
    evidence: null,
    auditAnswer: "",
    xsupComment: "",
    references: [],
    targetLinks: { jira: "", sfdc: "", tacopilot: "" },
    lastPrompt: "",

    // Batch runtime.
    jobs: new Map(),
    queue: [],
    selectedXsup: "",
    viewMode: "dashboard",
    concurrency: 2,
    productSelectionMode: "auto",
    autoSaveCompleted: true,

    // Artifact storage. Directory handles are intentionally session-only because
    // browser permission objects should not be serialized into audit/session files.
    saveDirectoryHandle: null,
    saveDirectoryName: "",
    fileSystemAccessSupported: typeof window.showDirectoryPicker === "function",
    fileSavePickerSupported: typeof window.showSaveFilePicker === "function",

    // Knowledge-artifact generation runs independently from the audit queue.
    // Two workers may prepare/reuse artifacts in parallel. A shared Case Chat
    // generation cap below prevents Audit + Knowledge from overloading TACopilot.
    autoGenerateKnowledge: true,
    knowledgeConcurrency: 2,
    knowledgeQueue: [],
    knowledgeActiveCount: 0,
    knowledgeBatchAutoDeliveryRunId: 0,
    batchRunId: 0,

    // At most two mutating Case Chat generations may be in flight across Audit
    // and Knowledge. History/reuse checks do not consume a generation slot.
    caseChatGenerationLimit: 2,
    caseChatActiveCount: 0,

    activeCount: 0,
    running: false,
    stopped: false,
    controller: null,

    minimized: false,
    maximized: false,
    startedAt: null,
    elapsedTimer: null,
    lastStatus: "Ready",
    lastStatusKind: "",
    dashboardRenderSignature: "",
    jobListRenderSignature: "",

    // v2.4 trusted-field observer. Values are accepted only from structured Jira
    // issue-field objects observed in TACopilot's own successful browser traffic.
    trustedFieldObservations: new Map(),
    trustedFieldSourceStates: new Map(),
    trustedFieldObserverInstalled: false,
    trustedFieldObserverInstanceId: `${VERSION}:${Date.now()}:${Math.random().toString(36).slice(2)}`
  };

  function makeAbortError() {
    return new DOMException("Audit stopped by user.", "AbortError");
  }

  function assertRunning() {
    if (state.stopped || state.controller?.signal?.aborted) throw makeAbortError();
  }

  const sleep = ms => new Promise((resolve, reject) => {
    if (state.stopped || state.controller?.signal?.aborted) return reject(makeAbortError());
    const timer = setTimeout(resolve, ms);
    state.controller?.signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(makeAbortError());
    }, { once: true });
  });


  function getProductProfile(key) {
    return PRODUCT_PROFILES[key] || null;
  }

  function productLabel(jobOrKey) {
    const key = typeof jobOrKey === "string" ? jobOrKey : jobOrKey?.productKey;
    return getProductProfile(key)?.label || "Product not selected";
  }

  function productSelectionLabel(job) {
    if (!job?.productKey) return "Needs confirmation";
    const source = job.productSelectionSource === "manual" ? "Manual" : "Auto";
    const confidence = job.productConfidence ? ` · ${job.productConfidence}` : "";
    return `${productLabel(job)} · ${source}${confidence}`;
  }

  function normalizeProductKey(value) {
    const v = cleanText(String(value || "")).toUpperCase();
    if (!v) return "";
    if (/XSOAR|DEMISTO/.test(v)) return "XSOAR";
    if (/CORTEX\s+CLOUD|PRISMA\s+CLOUD|CNAPP|CSPM|CWP|CLOUD\s+POSTURE/.test(v)) return "CORTEX_CLOUD";
    if (/XSIAM|CORTEX\s+XDR|\bXDR\b/.test(v)) return "XDR_XSIAM";
    return "";
  }

  function extractStructuredCaseFields(doc) {
    const rows = [];
    const seen = new Set();
    const add = (label, value, source = "page") => {
      label = cleanText(label);
      value = cleanText(value);
      if (!label || !value || label === value || label.length > 120 || value.length > 1000) return;
      const key = `${label}\u001f${value}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ label, value, source });
    };

    doc.querySelectorAll("tr").forEach(tr => {
      const cells = [...tr.children].filter(el => /^(TH|TD)$/i.test(el.tagName));
      if (cells.length >= 2) add(cells[0].innerText, cells.slice(1).map(c => c.innerText).join(" · "), "table");
    });

    doc.querySelectorAll("dt").forEach(dt => {
      const dd = dt.nextElementSibling;
      if (dd?.tagName === "DD") add(dt.innerText, dd.innerText, "definition");
    });

    doc.querySelectorAll("[data-label]").forEach(el => {
      const label = el.getAttribute("data-label") || "";
      if (label) add(label, el.innerText, "data-label");
    });

    return rows.slice(0, 120);
  }

  function caseSummaryText(doc) {
    const body = doc.body?.cloneNode(true);
    if (!body) return "";
    body.querySelectorAll('[id^="comment-"],script,style,noscript').forEach(el => el.remove());
    return cleanText(body.innerText || "").slice(0, 12000);
  }

  function productEvidenceMatches(text) {
    const s = cleanText(String(text || ""));
    const matches = [];
    if (!s) return matches;
    if (/\b(?:Cortex\s+)?XSOAR\b|\bDemisto\b/i.test(s)) matches.push("XSOAR");
    if (/\bCortex\s+Cloud\b|\bPrisma\s+Cloud\b|\bCNAPP\b|\bCSPM\b|\bCWP\b/i.test(s)) matches.push("CORTEX_CLOUD");
    if (/\bXSIAM\b|\bCortex\s+XDR\b|\bCortex\s+XSIAM\b|\bXDR\b/i.test(s)) matches.push("XDR_XSIAM");
    return [...new Set(matches)];
  }

  function detectProduct({ evidence, candidate, latestInvestigation }) {
    const scores = { XDR_XSIAM: 0, XSOAR: 0, CORTEX_CLOUD: 0 };
    const reasons = { XDR_XSIAM: [], XSOAR: [], CORTEX_CLOUD: [] };
    const add = (key, points, reason) => {
      if (!scores.hasOwnProperty(key)) return;
      scores[key] += points;
      if (reason) reasons[key].push(reason);
    };

    const latestText = JSON.stringify(latestInvestigation || {});
    const productType = latestText.match(/product[_\s-]*type["'\s:=]+(CORTEX\s+XSIAM|XSIAM|CORTEX\s+XDR|XDR|XSOAR|CORTEX\s+CLOUD|PRISMA\s+CLOUD)/i);
    if (productType) {
      const key = normalizeProductKey(productType[1]);
      if (key) add(key, 140, `TACO/case metadata product_type=${productType[1]}`);
    }

    for (const field of evidence?.structured_fields || []) {
      const label = String(field.label || "");
      const value = String(field.value || "");
      const productishLabel = /product|technology|platform|service|case\s*type|category|subcategory/i.test(label);
      if (!productishLabel) continue;
      const keys = productEvidenceMatches(value);
      for (const key of keys) add(key, 100, `Structured case field ${label}: ${value.slice(0, 120)}`);
    }

    const candidateText = `${candidate?.details || ""}\n${candidate?.text || ""}`;
    for (const key of productEvidenceMatches(candidateText)) {
      add(key, 65, `TACopilot XSUP/SFDC mapping details mention ${getProductProfile(key)?.label}`);
    }

    const headerText = evidence?.case_summary_text || "";
    for (const key of productEvidenceMatches(headerText)) {
      add(key, 55, `TACopilot case header/metadata mentions ${getProductProfile(key)?.label}`);
    }

    const ticketText = evidence?.jira_ticket_event?.original_text || "";
    for (const key of productEvidenceMatches(ticketText)) {
      add(key, 35, `Jira ticket snapshot mentions ${getProductProfile(key)?.label}`);
    }

    const ranked = Object.entries(scores).sort((a,b) => b[1] - a[1]);
    const [bestKey, bestScore] = ranked[0];
    const secondScore = ranked[1]?.[1] || 0;
    const margin = bestScore - secondScore;

    if (!bestScore) {
      return {
        key: "",
        confidence: "LOW",
        score: 0,
        ambiguous: true,
        reason: "No reliable product taxonomy was found. Reviewer confirmation is required.",
        scores,
        reasons
      };
    }

    let confidence = "LOW";
    if (bestScore >= 100 && margin >= 45) confidence = "HIGH";
    else if (bestScore >= 55 && margin >= 25) confidence = "MEDIUM";

    const ambiguous = margin < 25 || confidence === "LOW";
    return {
      key: bestKey,
      confidence,
      score: bestScore,
      ambiguous,
      reason: reasons[bestKey][0] || `Detected ${getProductProfile(bestKey)?.label}`,
      scores,
      reasons
    };
  }

  function formatProductTaxonomy(evidence) {
    const rows = (evidence?.structured_fields || [])
      .filter(x => /product|technology|platform|service|case\s*type|category|subcategory|resolution|root\s*cause|fix\s*type|label/i.test(x.label || ""))
      .slice(0, 30);
    if (!rows.length) return "No structured taxonomy fields were extracted from the TACopilot case page.";
    return rows.map(x => `- ${x.label}: ${x.value}`).join("\n");
  }

  const TRUSTED_JIRA_FIELD_DEFS = Object.freeze({
    resolution: {name: "Resolution"},
    customfield_27520: {name: "RCA"},
    customfield_18266: {name: "RCA Category"},
    customfield_18953: {name: "Fix Type-TR"},
    customfield_19679: {name: "Fix Type"},
    labels: {name: "Labels"}
  });

  const TRUSTED_FIELD_INTERNAL_STATES = Object.freeze({
    TRUSTED_VALUE_FOUND: "TRUSTED_VALUE_FOUND",
    FIELD_NOT_PRESENT: "FIELD_NOT_PRESENT",
    ACCESS_DENIED: "ACCESS_DENIED",
    SOURCE_NOT_AVAILABLE: "SOURCE_NOT_AVAILABLE",
    MALFORMED_SOURCE: "MALFORMED_SOURCE"
  });

  function trustedTacoDataUrl(sourceUrl = "") {
    try {
      const u = new URL(String(sourceUrl || location.href), location.href);
      if (u.origin !== TACOPILOT_ORIGIN) return false;
      const p = u.pathname;
      const likelyDataRoute =
        p.startsWith("/taco/case/") ||
        p === "/taco/search" ||
        p.startsWith("/taco/pilot/investigation/") ||
        p.startsWith("/taco/api/case/");
      if (!likelyDataRoute) return false;
      // Case Chat and generated/synthesized report bodies are discovery/synthesis,
      // never authoritative saved Jira issue-field provenance.
      if (/\/(?:followup|reports?|chat)(?:\/|$)/i.test(p)) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  function jiraDisplayValue(value) {
    if (value == null) return "";
    if (Array.isArray(value)) return value.map(jiraDisplayValue).filter(Boolean).join(", ");
    if (typeof value === "object") {
      return cleanText(value.name || value.value || value.displayName || value.label || value.key || value.id || "");
    }
    return cleanText(String(value));
  }

  function parseTimestampMs(value) {
    if (value == null || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const ms = Date.parse(String(value));
    return Number.isFinite(ms) ? ms : 0;
  }

  function xsupKeysFromSource(sourceUrl = "", payloadText = "") {
    const keys = new Set();
    const addFrom = value => {
      for (const m of String(value || "").matchAll(/\bXSUP-\d+\b/gi)) keys.add(m[0].toUpperCase());
    };
    addFrom(sourceUrl);
    addFrom(String(payloadText || "").slice(0, 120000));
    return [...keys];
  }

  function recordTrustedFieldSourceState(issueKeys, status, sourceUrl = "", extra = {}) {
    if (!Object.values(TRUSTED_FIELD_INTERNAL_STATES).includes(status)) return;
    for (const key0 of issueKeys || []) {
      const key = String(key0 || "").toUpperCase();
      if (!/^XSUP-\d+$/.test(key)) continue;
      const existing = state.trustedFieldObservations.get(key);
      if (existing?.fields && Object.keys(existing.fields).length && status !== "TRUSTED_VALUE_FOUND") continue;
      state.trustedFieldSourceStates.set(key, {
        issueKey: key,
        status,
        sourceUrl: String(sourceUrl || ""),
        observedAt: Date.now(),
        ...extra
      });
    }
  }

  function recordTrustedJiraIssueObject(obj, sourceUrl = "") {
    if (!trustedTacoDataUrl(sourceUrl) || !obj || typeof obj !== "object") return {accepted:false, issueKey:"", hadFields:false};
    const key = cleanText(obj.key || obj.issueKey || obj.issue_key || obj?.issue?.key || "").toUpperCase();
    const fields = obj.fields || obj?.issue?.fields;
    if (!/^XSUP-\d+$/.test(key) || !fields || typeof fields !== "object" || Array.isArray(fields)) {
      return {accepted:false, issueKey:key, hadFields:Boolean(fields)};
    }

    const issueUpdated = cleanText(obj.updated || obj?.issue?.updated || fields.updated || "");
    const issueUpdatedMs = parseTimestampMs(issueUpdated);
    const found = {};
    for (const [fieldId, def] of Object.entries(TRUSTED_JIRA_FIELD_DEFS)) {
      if (!Object.prototype.hasOwnProperty.call(fields, fieldId)) continue;
      const raw = fields[fieldId];
      found[fieldId] = {
        fieldId,
        fieldName: def.name,
        rawValue: raw,
        displayValue: jiraDisplayValue(raw),
        sourceUrl: String(sourceUrl || ""),
        observedAt: Date.now(),
        issueUpdated,
        issueUpdatedMs,
        sourceType: "structured Jira issue field"
      };
    }

    if (!Object.keys(found).length) {
      recordTrustedFieldSourceState([key], TRUSTED_FIELD_INTERNAL_STATES.FIELD_NOT_PRESENT, sourceUrl, {issueUpdated});
      return {accepted:false, issueKey:key, hadFields:true};
    }

    const previous = state.trustedFieldObservations.get(key) || {issueKey:key, fields:{}};
    const merged = {...previous.fields};
    for (const [fieldId, row] of Object.entries(found)) {
      const older = merged[fieldId];
      const olderUpdatedMs = Number(older?.issueUpdatedMs || 0);
      // A later-observed stale response must not overwrite a field from a newer Jira issue version.
      if (older && olderUpdatedMs && row.issueUpdatedMs && row.issueUpdatedMs < olderUpdatedMs) continue;
      merged[fieldId] = row;
    }
    state.trustedFieldObservations.set(key, {
      issueKey: key,
      fields: merged,
      sourceUrl: String(sourceUrl || previous.sourceUrl || ""),
      observedAt: Date.now(),
      issueUpdated,
      issueUpdatedMs,
      status: TRUSTED_FIELD_INTERNAL_STATES.TRUSTED_VALUE_FOUND
    });
    recordTrustedFieldSourceState([key], TRUSTED_FIELD_INTERNAL_STATES.TRUSTED_VALUE_FOUND, sourceUrl, {issueUpdated});
    return {accepted:true, issueKey:key, hadFields:true};
  }

  function inspectTrustedJiraPayload(sourceUrl, payload) {
    if (!trustedTacoDataUrl(sourceUrl) || payload == null) return;
    let root = payload;
    const rawText = typeof root === "string" ? root : "";
    if (typeof root === "string") {
      const t = root.trim();
      if (!(t.startsWith("{") || t.startsWith("["))) return; // never infer saved fields from rendered HTML/text
      try { root = JSON.parse(t); }
      catch (_) {
        recordTrustedFieldSourceState(xsupKeysFromSource(sourceUrl, t), TRUSTED_FIELD_INTERNAL_STATES.MALFORMED_SOURCE, sourceUrl);
        return;
      }
    }
    if (!root || typeof root !== "object") return;

    const seen = new WeakSet();
    let sawExactIssueFields = false;
    let accepted = false;
    const visit = (value, depth = 0) => {
      if (!value || typeof value !== "object" || depth > 8) return;
      if (seen.has(value)) return;
      seen.add(value);

      const result = recordTrustedJiraIssueObject(value, sourceUrl);
      accepted = accepted || result.accepted;
      sawExactIssueFields = sawExactIssueFields || (Boolean(result.issueKey) && result.hadFields);
      if (Array.isArray(value)) {
        value.slice(0, 300).forEach(v => visit(v, depth + 1));
        return;
      }
      for (const [k, v] of Object.entries(value)) {
        // Current saved fields are never accepted from narrative/generated containers.
        if (/comment|description|body|text|answer|analysis|summary|prompt|chat|message|narrative/i.test(k)) continue;
        visit(v, depth + 1);
      }
    };
    visit(root);

    if (!accepted && !sawExactIssueFields) {
      const keys = xsupKeysFromSource(sourceUrl, rawText || JSON.stringify(root).slice(0, 120000));
      if (keys.length) recordTrustedFieldSourceState(keys, TRUSTED_FIELD_INTERNAL_STATES.SOURCE_NOT_AVAILABLE, sourceUrl);
    }
  }

  function observeTrustedResponseStatus(sourceUrl, status, payloadText = "") {
    if (!trustedTacoDataUrl(sourceUrl)) return;
    if (status === 401 || status === 403) {
      recordTrustedFieldSourceState(
        xsupKeysFromSource(sourceUrl, payloadText),
        TRUSTED_FIELD_INTERNAL_STATES.ACCESS_DENIED,
        sourceUrl,
        {httpStatus: status}
      );
    }
  }

  function installTrustedFieldObserver() {
    if (state.trustedFieldObserverInstalled) return;
    state.trustedFieldObserverInstalled = true;

    const sink = {
      instanceId: state.trustedFieldObserverInstanceId,
      inspect: inspectTrustedJiraPayload,
      status: observeTrustedResponseStatus
    };
    // Global dispatcher solves bookmark relaunch lifecycle: wrappers are installed once,
    // but always send observations to the newest Auditor instance instead of a closed state.
    window.__xaTrustedFieldObserverSinkV24 = sink;

    try {
      if (!window.__xaTrustedFetchDispatcherV24 && typeof window.fetch === "function") {
        const nativeFetch = window.fetch.bind(window);
        window.__xaTrustedFetchDispatcherV24 = {nativeFetch};
        window.fetch = async (...args) => {
          const response = await nativeFetch(...args);
          try {
            const url = response?.url || String(args[0] || "");
            const currentSink = window.__xaTrustedFieldObserverSinkV24;
            if (trustedTacoDataUrl(url) && currentSink) {
              const clone = response.clone();
              clone.text().then(text => {
                currentSink.status?.(url, response.status, text);
                if (response.ok) currentSink.inspect?.(url, text);
              }).catch(() => currentSink.status?.(url, response.status, ""));
            }
          } catch (_) {}
          return response;
        };
      }
    } catch (_) {}

    try {
      if (!window.__xaTrustedXHRDispatcherV24 && window.XMLHttpRequest) {
        const NativeXHR = window.XMLHttpRequest;
        const nativeOpen = NativeXHR.prototype.open;
        window.__xaTrustedXHRDispatcherV24 = {nativeOpen};
        NativeXHR.prototype.open = function(method, url, ...rest) {
          try { this.__xaTrustedV24Url = new URL(String(url || ""), location.href).href; }
          catch (_) { this.__xaTrustedV24Url = String(url || ""); }
          this.addEventListener("load", () => {
            try {
              const currentSink = window.__xaTrustedFieldObserverSinkV24;
              const responseUrl = this.responseURL || this.__xaTrustedV24Url || "";
              if (!currentSink || !trustedTacoDataUrl(responseUrl)) return;
              const body = typeof this.responseText === "string" ? this.responseText : "";
              currentSink.status?.(responseUrl, this.status, body);
              if (this.status >= 200 && this.status < 300) currentSink.inspect?.(responseUrl, body);
            } catch (_) {}
          });
          return nativeOpen.call(this, method, url, ...rest);
        };
      }
    } catch (_) {}

    try {
      if (window.__xaTrustedHtmxHandlerV24) {
        document.body.removeEventListener("htmx:afterRequest", window.__xaTrustedHtmxHandlerV24);
      }
      window.__xaTrustedHtmxHandlerV24 = event => {
        try {
          const currentSink = window.__xaTrustedFieldObserverSinkV24;
          const xhr = event?.detail?.xhr;
          if (!currentSink || !xhr) return;
          const url = xhr.responseURL || event?.detail?.pathInfo?.requestPath || "";
          if (!trustedTacoDataUrl(url)) return;
          const body = xhr.responseText || "";
          currentSink.status?.(url, xhr.status, body);
          if (xhr.status >= 200 && xhr.status < 300) currentSink.inspect?.(url, body);
        } catch (_) {}
      };
      document.body.addEventListener("htmx:afterRequest", window.__xaTrustedHtmxHandlerV24);
    } catch (_) {}
  }

  function trustedFieldSnapshotForJob(job) {
    const key = String(job?.xsup || "").toUpperCase();
    const observed = state.trustedFieldObservations.get(key);
    if (!observed?.fields || !Object.keys(observed.fields).length) {
      const sourceState = state.trustedFieldSourceStates.get(key);
      const status = sourceState?.status || TRUSTED_FIELD_INTERNAL_STATES.SOURCE_NOT_AVAILABLE;
      const plain = status === TRUSTED_FIELD_INTERNAL_STATES.ACCESS_DENIED
        ? "Saved Jira field values could not be verified because the trusted Jira source was access denied."
        : status === TRUSTED_FIELD_INTERNAL_STATES.FIELD_NOT_PRESENT
          ? "A structured Jira issue object was observed, but the watched saved field was not present in that source."
          : status === TRUSTED_FIELD_INTERNAL_STATES.MALFORMED_SOURCE
            ? "A likely structured Jira source was observed but could not be parsed safely."
            : "Saved Jira field values are not available from a trusted structured TACopilot field source.";
      return {status, text: `${plain} Do not infer current saved values from comments, Engineering narrative, TACO, Case Chat, previous Audit/KCS output, SFDC Resolution narrative, or rendered page text.`, sourceState};
    }
    const lines = Object.values(observed.fields).map(f =>
      `${f.fieldName} [${f.fieldId}]: ${f.displayValue || "<empty>"} | Source=structured Jira issue field | URL=${f.sourceUrl || "TACopilot native response"}${f.issueUpdated ? ` | Jira updated=${f.issueUpdated}` : ""}`
    );
    return {status:TRUSTED_FIELD_INTERNAL_STATES.TRUSTED_VALUE_FOUND, text:lines.join("\n"), observed};
  }

  function ticketFieldSnapshot(evidence, job = null) {
    const trusted = trustedFieldSnapshotForJob(job);
    return `Trusted field acquisition status: ${trusted.status}\n${trusted.text}`;
  }

  function primaryReviewVerdict(job) {
    const map = {
      "Resolution": job?.verdict || "",
      "RCA": job?.rcaVerdict || "",
      "Fix Type": job?.fixTypeVerdict || "",
      "Flag / Label": job?.labelVerdict || ""
    };
    const profile = getProductProfile(job?.productKey);
    for (const name of profile?.primaryFieldOrder || ["Resolution", "RCA", "Fix Type", "Flag / Label"]) {
      if (map[name]) return map[name];
    }
    return Object.values(map).find(Boolean) || "";
  }

  function anyIncorrectVerdict(job) {
    return [job?.verdict, job?.rcaVerdict, job?.fixTypeVerdict, job?.labelVerdict]
      .some(v => /^incorrect$/i.test(v || ""));
  }

  function transientGetStatus(status) {
    return [408, 425, 429, 500, 502, 503, 504].includes(Number(status));
  }

  function transientNetworkError(err) {
    const message = cleanText(err?.message || String(err || ""));
    return /failed to fetch|networkerror|load failed|network request failed|connection.*reset|temporarily unavailable|timeout|timed out|HTTP 408|HTTP 425|HTTP 429|HTTP 5\d\d/i.test(message);
  }

  function isTransientCaseChatAnswer(answer) {
    const text = cleanText(String(answer || ""));
    if (!text) return false;
    return /(?:I\s+apologize[^.]{0,120})?unable to generate an answer due to a temporary system error|temporary system error[^.]{0,120}please try again|please try again[^.]{0,120}temporary system error|an error occurred while generating (?:the|an) answer|something went wrong while generating/i.test(text);
  }

  function makeBufferedResponse({ status = 200, statusText = "OK", body = "", contentType = "", url = "" } = {}) {
    const textBody = String(body ?? "");
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText,
      url,
      headers: {
        get(name) {
          return String(name || "").toLowerCase() === "content-type" ? contentType : null;
        }
      },
      async text() { return textBody; },
      async json() { return JSON.parse(textBody); },
      clone() { return makeBufferedResponse({status, statusText, body:textBody, contentType, url}); }
    };
  }

  async function fetchWithTimeout(url, init = {}, timeoutMs = NETWORK_FETCH_TIMEOUT_MS) {
    assertRunning();
    const local = new AbortController();
    const parent = init.signal || state.controller?.signal;
    const onAbort = () => local.abort(parent?.reason || new DOMException("Aborted", "AbortError"));
    if (parent) {
      if (parent.aborted) onAbort();
      else parent.addEventListener("abort", onAbort, {once:true});
    }
    const timer = setTimeout(() => local.abort(new DOMException(`Request timed out after ${timeoutMs} ms`, "TimeoutError")), timeoutMs);
    try {
      return await fetch(url, {...init, signal:local.signal});
    } finally {
      clearTimeout(timer);
      if (parent) parent.removeEventListener?.("abort", onAbort);
    }
  }

  async function requestGetViaHtmx(url, timeoutMs = 20000) {
    if (!window.htmx || typeof window.htmx.ajax !== "function") {
      throw new Error("TACopilot native HTMX transport is unavailable.");
    }

    assertRunning();
    const requested = new URL(url, location.href);
    const absolute = requested.href;
    const target = document.createElement("div");
    target.style.cssText = "display:none!important";
    target.setAttribute("aria-hidden", "true");
    target.dataset.xsupAuditorTransport = "htmx-get";
    document.body.appendChild(target);

    let settled = false;
    let timer = null;
    let resolveRaw;
    let rejectRaw;
    const rawPromise = new Promise((resolve, reject) => { resolveRaw = resolve; rejectRaw = reject; });

    const matchesRequest = evt => {
      const xhr = evt?.detail?.xhr;
      if (!xhr) return false;
      try {
        const candidate = xhr.responseURL || evt?.detail?.pathInfo?.requestPath || absolute;
        const responseUrl = new URL(candidate, location.href);
        return responseUrl.origin === requested.origin &&
          responseUrl.pathname === requested.pathname &&
          responseUrl.search === requested.search;
      } catch (_) {
        return false;
      }
    };

    const cleanup = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("htmx:afterRequest", onAfter, true);
      document.removeEventListener("htmx:responseError", onError, true);
      document.removeEventListener("htmx:sendError", onError, true);
      target.remove();
    };

    const finishFromXhr = evt => {
      if (!matchesRequest(evt)) return;
      const xhr = evt.detail.xhr;
      const response = makeBufferedResponse({
        status: Number(xhr.status || 0),
        statusText: xhr.statusText || "",
        body: xhr.responseText || "",
        contentType: xhr.getResponseHeader?.("content-type") || "",
        url: xhr.responseURL || absolute
      });
      cleanup();
      if (response.ok) resolveRaw(response);
      else rejectRaw(new Error(`GET ${url} -> HTTP ${response.status}: ${(xhr.responseText || "").slice(0, 300)}`));
    };

    const onAfter = evt => finishFromXhr(evt);
    const onError = evt => {
      if (!matchesRequest(evt)) return;
      const xhr = evt.detail?.xhr;
      const msg = xhr
        ? `GET ${url} -> HTTP ${xhr.status || 0}: ${(xhr.responseText || xhr.statusText || "HTMX request failed").slice(0, 300)}`
        : `GET ${url} -> HTMX request failed`;
      cleanup();
      rejectRaw(new Error(msg));
    };

    document.addEventListener("htmx:afterRequest", onAfter, true);
    document.addEventListener("htmx:responseError", onError, true);
    document.addEventListener("htmx:sendError", onError, true);
    timer = setTimeout(() => {
      cleanup();
      rejectRaw(new Error(`GET ${url} -> TACopilot native transport timed out.`));
    }, timeoutMs);

    try {
      // Use TACopilot's page-native GET transport. This is the same transport
      // family used by the native search UI and remains side-effect free.
      void window.htmx.ajax("GET", url, { target, swap: "none" });
    } catch (err) {
      cleanup();
      throw err;
    }

    return rawPromise;
  }

  async function request(url, options = {}) {
    assertRunning();
    const method = String(options.method || "GET").toUpperCase();
    const headers = {
      Accept: "application/json, text/html, */*",
      ...(options.body ? {"Content-Type":"application/json"} : {}),
      ...(options.headers || {})
    };

    // Mutating calls are intentionally submitted once here. Case Chat has its
    // own accepted-prompt history recovery before a single controlled retry.
    if (method !== "GET") {
      // Mutating Case Chat submissions are allowed to finish naturally, matching
      // the proven v2.4.2 transport. A short client-side timeout can orphan an
      // accepted server task and provoke a duplicate retry under load.
      const r = await fetch(url, {credentials:"same-origin", signal:state.controller?.signal, ...options, headers});
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`${method} ${url} -> HTTP ${r.status}: ${txt.slice(0,300)}`);
      }
      return r;
    }

    let lastError = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      assertRunning();
      try {
        const r = await fetchWithTimeout(url, {credentials:"same-origin", ...options, method:"GET", headers}, NETWORK_FETCH_TIMEOUT_MS);
        if (r.ok) return r;
        const txt = await r.text().catch(() => "");
        if (!transientGetStatus(r.status)) throw new Error(`GET ${url} -> HTTP ${r.status}: ${txt.slice(0,300)}`);
        lastError = new Error(`GET ${url} -> HTTP ${r.status}: ${txt.slice(0,300)}`);
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        lastError = err;
        if (!transientNetworkError(err)) throw err;
      }

      // Managed TACopilot can reject ad-hoc fetch() while its own HTMX/XHR
      // transport remains healthy. Try that native path before consuming
      // another bounded retry attempt.
      try {
        return await requestGetViaHtmx(url);
      } catch (nativeErr) {
        if (nativeErr?.name === "AbortError") throw nativeErr;
        lastError = nativeErr;
      }

      if (attempt < 5) await sleep(Math.min(5000, 750 * (2 ** (attempt - 1))));
    }
    throw lastError || new Error(`GET ${url} failed.`);
  }

  // Fast, best-effort GET for optional reuse/history checks. Knowledge generation must
  // never sit behind minutes of history probing before the mutating Case Chat POST.
  async function requestQuickGet(url, timeoutMs = REUSE_HISTORY_TIMEOUT_MS) {
    assertRunning();
    const headers = {Accept:"application/json, text/html, */*"};
    try {
      const r = await fetchWithTimeout(url, {credentials:"same-origin", method:"GET", headers}, timeoutMs);
      if (r.ok) return r;
      const txt = await r.text().catch(() => "");
      throw new Error(`GET ${url} -> HTTP ${r.status}: ${txt.slice(0,300)}`);
    } catch (err) {
      if (err?.name === "AbortError" && state.controller?.signal?.aborted) throw err;
      // One native transport attempt only. This is an optimization path, not a gate.
      return await requestGetViaHtmx(url, Math.min(timeoutMs, 12000));
    }
  }

  function cleanText(s) {
    return (s || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function sanitizeGeneratedText(text) {
    return String(text || "")
      .replace(/<verification-warning\b[^>]*>[\s\S]*?<\/verification-warning>/gi, "")
      .replace(/<q\b[^>]*>[\s\S]*?<\/q>/gi, "")
      .replace(/<ref\b[^>]*>/gi, "")
      .replace(/<\/ref>/gi, "")
      .replace(/<q\b[^>]*>/gi, "")
      .replace(/<\/q>/gi, "")
      .replace(/<verification-warning\b[^>]*>/gi, "")
      .replace(/<\/verification-warning>/gi, "")
      .replace(/\[(?:inference|from case data|derived analysis)\]/gi, "")
      .replace(/\(\s*(?:[,;:]\s*)*\)/g, "")
      .replace(/\s+([,.;:])/g, "$1")
      .replace(/,\s*,+/g, ", ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }


  function hasUnbalancedMarkdownFence(text) {
    // Treat fence syntax as valid only when the triple-backtick marker is a
    // standalone Markdown fence line (optionally followed by a language tag).
    // This catches malformed output such as "Practical next step: ... ```xql"
    // even if the same dangling fragment is duplicated in two structured fields
    // and a global token-count parity check would otherwise appear balanced.
    const lines = String(text || "").split(/\r?\n/);
    let fenceCount = 0;
    for (const line of lines) {
      if (!line.includes("```")) continue;
      const tokens = line.match(/```/g) || [];
      const trimmed = line.trim();
      if (tokens.length !== 1 || !/^```(?:[A-Za-z0-9_+.-]+)?\s*$/.test(trimmed)) return true;
      fenceCount++;
    }
    return fenceCount % 2 !== 0;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(url) {
    try {
      // Markdown/code extraction can leave a trailing backtick on an otherwise
      // valid URL. Remove only wrapper punctuation; never rewrite the URL body.
      const raw = String(url ?? "").trim().replace(/^[<`]+/, "").replace(/[>`]+$/, "");
      const u = new URL(raw, location.href);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.href;
    } catch (_) {
      return null;
    }
  }
  function renderInlineMarkdown(raw, options = {}) {
    let s = String(raw ?? "");
    const links = [];
    const codes = [];
    const sourceRefIds = options.sourceRefIds instanceof Set ? options.sourceRefIds : null;
    const linkSourceRefs = options.linkSourceRefs !== false;

    // Protect inline code first. URLs and [R#] inside code are examples, not navigation.
    s = s.replace(/`([^`\n]+)`/g, (_, code) => {
      const token = `@@XA_CODE_${codes.length}@@`;
      codes.push(`<code>${escapeHtml(code)}</code>`);
      return token;
    });

    const protectLink = (url, label, suffix = "", extraAttrs = "") => {
      const clean = safeUrl(url);
      if (!clean) return null;
      const token = `@@XA_LINK_${links.length}@@`;
      links.push(`<a href="${escapeHtml(clean)}" target="_blank" rel="noopener noreferrer" ${extraAttrs}>${escapeHtml(label)}</a>${escapeHtml(suffix)}`);
      return token;
    };

    // Balanced Markdown-link parser. This supports nested [] in a label without
    // accidentally swallowing a preceding [R1] marker into the next link label.
    const protectMarkdownLinks = input => {
      let result = "";
      let i = 0;
      while (i < input.length) {
        if (input[i] !== "[") { result += input[i++]; continue; }
        let depth = 0, close = -1;
        for (let j = i; j < input.length; j++) {
          if (input[j] === "[") depth++;
          else if (input[j] === "]") {
            depth--;
            if (depth === 0) { close = j; break; }
          }
        }
        if (close < 0 || input[close + 1] !== "(") { result += input[i++]; continue; }
        let pDepth = 1, end = -1;
        for (let k = close + 2; k < input.length; k++) {
          const ch = input[k];
          if (ch === "(") pDepth++;
          else if (ch === ")") {
            pDepth--;
            if (pDepth === 0) { end = k; break; }
          }
        }
        if (end < 0) { result += input[i++]; continue; }
        const label = input.slice(i + 1, close);
        const url = input.slice(close + 2, end).trim();
        if (!/^https?:\/\//i.test(url) || /\s/.test(url)) { result += input[i++]; continue; }
        const token = protectLink(url, label);
        if (!token) { result += input.slice(i, end + 1); i = end + 1; continue; }
        result += token;
        i = end + 1;
      }
      return result;
    };
    s = protectMarkdownLinks(s);

    // Knowledge [R#] markers point only to ONE canonical Source References entry.
    // Compound markers such as [R3, R4] are normalized to individual clickable refs.
    const sourceRefToken = key => {
      if (!linkSourceRefs || !sourceRefIds || !sourceRefIds.has(key)) return `[${key}]`;
      const token = `@@XA_LINK_${links.length}@@`;
      links.push(`<a class="xa-inline-ref" href="#xa-source-${escapeHtml(key)}" title="Source reference ${escapeHtml(key)}">[${escapeHtml(key)}]</a>`);
      return token;
    };
    s = s.replace(/\[((?:R\d+\s*(?:[,;]\s*R\d+)+))\]/gi, (_, group) => {
      const keys = group.match(/R\d+/gi) || [];
      return keys.map(k => sourceRefToken(k.toUpperCase())).join("");
    });
    // Outside a knowledge artifact, or when a source is not mapped, keep the marker
    // as plain text instead of creating a dead/random anchor.
    s = s.replace(/\[R(\d+)\]/g, (_, n) => sourceRefToken(`R${n}`));

    const trimPlainUrl = url => {
      let core = String(url || "");
      let trailing = "";
      while (/[.,;:!?]$/.test(core)) { trailing = core.slice(-1) + trailing; core = core.slice(0,-1); }
      while (core.endsWith(")") && (core.match(/\(/g)||[]).length < (core.match(/\)/g)||[]).length) {
        trailing = ")" + trailing; core = core.slice(0,-1);
      }
      return {core, trailing};
    };

    // Backticks are excluded because inline code was protected above.
    s = s.replace(/https?:\/\/[^\s<>"'`]+/g, url => {
      const {core, trailing} = trimPlainUrl(url);
      return protectLink(core, core, trailing) || url;
    });

    s = s.replace(/\bXSUP-\d+\b/gi, key => {
      const normalized = key.toUpperCase();
      const url = safeUrl(`https://jira-dc.paloaltonetworks.com/browse/${normalized}`);
      return url ? protectLink(url, normalized) : key;
    });

    if (state.caseNumber && state.targetLinks?.sfdc) {
      const caseRe = new RegExp(`\\b${state.caseNumber}\\b`, "g");
      s = s.replace(caseRe, caseNo => {
        const url = safeUrl(state.targetLinks.sfdc);
        return url ? protectLink(url, caseNo) : caseNo;
      });
    }

    s = escapeHtml(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    links.forEach((html, i) => { s = s.split(`@@XA_LINK_${i}@@`).join(html); });
    codes.forEach((html, i) => { s = s.split(`@@XA_CODE_${i}@@`).join(html); });
    return s;
  }

  function safeMarkdownToHtml(markdown, options = {}) {
    const lines = sanitizeGeneratedText(String(markdown || "")).replace(/\r/g, "").split("\n");
    const out = [];
    const stack = [];
    let inCode = false;
    let codeLang = "";
    let codeLines = [];

    const indentWidth = raw => raw.replace(/\t/g, "  ").match(/^\s*/)?.[0]?.length || 0;
    const listToken = line => {
      let m = line.match(/^(\s*)[-*+]\s+(.+)$/);
      if (m) return {type:"ul", indent:indentWidth(m[1]), body:m[2], number:null};
      m = line.match(/^(\s*)(\d+)[.)]\s+(.+)$/);
      if (m) return {type:"ol", indent:indentWidth(m[1]), body:m[3], number:Number(m[2])};
      return null;
    };
    const closeLevel = () => {
      const level = stack.pop();
      if (!level) return;
      if (level.liOpen) out.push("</li>");
      out.push(`</${level.type}>`);
    };
    const closeLists = () => { while (stack.length) closeLevel(); };
    const closeCurrentLi = () => {
      const level = stack[stack.length - 1];
      if (level?.liOpen) { out.push("</li>"); level.liOpen = false; }
    };
    const openList = token => {
      const start = token.type === "ol" && Number.isFinite(token.number) && token.number > 1 ? ` start="${token.number}"` : "";
      out.push(`<${token.type}${start}>`);
      stack.push({type:token.type, indent:token.indent, liOpen:false});
    };
    const closeCode = () => {
      if (!inCode) return;
      const lang = /^[A-Za-z0-9_+-]+$/.test(codeLang) ? ` class="language-${escapeHtml(codeLang)}"` : "";
      out.push(`<pre><code${lang}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      inCode = false;
      codeLang = "";
      codeLines = [];
    };
    const nextMeaningful = from => {
      for (let j=from+1; j<lines.length; j++) if (lines[j].trim()) return lines[j];
      return "";
    };
    const tableCells = raw => {
      let value = String(raw || "").trim();
      if (!value.includes("|")) return [];
      if (value.startsWith("|")) value = value.slice(1);
      if (value.endsWith("|")) value = value.slice(0,-1);
      return value.split(/(?<!\\)\|/).map(x=>x.replace(/\\\|/g,"|").trim());
    };
    const tableSeparator = raw => {
      const cells = tableCells(raw);
      return cells.length > 0 && cells.every(x=>/^:?-{3,}:?$/.test(x));
    };

    for (let i=0; i<lines.length; i++) {
      const line = lines[i];
      const t = line.trim();
      const fence = line.match(/^\s*```([A-Za-z0-9_+-]*)\s*$/);
      if (fence) {
        if (inCode) closeCode();
        else { inCode = true; codeLang = fence[1] || ""; codeLines = []; }
        continue;
      }
      if (inCode) { codeLines.push(line); continue; }

      if (!t) {
        const next = nextMeaningful(i);
        if (stack.length && (listToken(next) || /^\s*```/.test(next))) continue;
        closeLists();
        out.push('<div class="xa-md-spacer"></div>');
        continue;
      }

      const headerCells = tableCells(line);
      if (headerCells.length && i + 1 < lines.length && tableSeparator(lines[i+1])) {
        closeLists();
        const rows=[];
        i += 1; // separator
        while (i + 1 < lines.length) {
          const candidate = lines[i+1];
          if (!candidate.trim() || !candidate.includes("|") || tableSeparator(candidate)) break;
          const cells = tableCells(candidate);
          if (!cells.length) break;
          rows.push(cells);
          i += 1;
        }
        const head = `<thead><tr>${headerCells.map(x=>`<th>${renderInlineMarkdown(x, options)}</th>`).join("")}</tr></thead>`;
        const body = rows.length ? `<tbody>${rows.map(row=>`<tr>${headerCells.map((_,idx)=>`<td>${renderInlineMarkdown(row[idx] || "", options)}</td>`).join("")}</tr>`).join("")}</tbody>` : "";
        out.push(`<div class="xa-table-wrap"><table class="xa-md-table">${head}${body}</table></div>`);
        continue;
      }

      const token = listToken(line);
      if (token) {
        while (stack.length && token.indent < stack[stack.length-1].indent) closeLevel();
        let top = stack[stack.length-1];
        if (!top) {
          openList(token);
          top = stack[stack.length-1];
        } else if (token.indent > top.indent) {
          if (!top.liOpen) { out.push("<li>"); top.liOpen = true; }
          openList(token);
          top = stack[stack.length-1];
        } else if (token.type !== top.type) {
          closeLevel();
          while (stack.length && token.indent < stack[stack.length-1].indent) closeLevel();
          top = stack[stack.length-1];
          if (top && token.indent > top.indent) openList(token);
          else openList(token);
          top = stack[stack.length-1];
        } else {
          closeCurrentLi();
        }
        out.push(`<li>${renderInlineMarkdown(token.body, options)}`);
        stack[stack.length-1].liOpen = true;
        continue;
      }

      let m;
      closeLists();
      if ((m = line.match(/^(#{1,4})\s+(.+)$/))) {
        const level = Math.min(4, m[1].length);
        out.push(`<h${level}>${renderInlineMarkdown(m[2], options)}</h${level}>`);
        continue;
      }
      if ((m = line.match(/^\s*>\s?(.+)$/))) {
        out.push(`<blockquote>${renderInlineMarkdown(m[1], options)}</blockquote>`);
        continue;
      }
      out.push(`<p>${renderInlineMarkdown(line, options)}</p>`);
    }

    closeCode();
    closeLists();
    return out.join("");
  }
  function formatElapsed(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
  }

  function updateElapsed() {
    const el = document.getElementById("xsup-auditor-elapsed");
    if (el) {
      if (!state.startedAt) el.textContent = "";
      else el.textContent = ` · ${formatElapsed(Date.now() - state.startedAt)}`;
    }
    refreshLiveTimeLabels();
  }

  function startElapsedTimer() {
    state.startedAt = Date.now();
    clearInterval(state.elapsedTimer);
    updateElapsed();
    state.elapsedTimer = setInterval(updateElapsed, 1000);
  }

  function stopElapsedTimer() {
    updateElapsed();
    clearInterval(state.elapsedTimer);
    state.elapsedTimer = null;
  }

  function updateMiniBubble() {
    const bubble = document.getElementById("xsup-auditor-bubble");
    if (!bubble) return;

    const jobs = [...state.jobs.values()];
    const running = jobs.filter(j => j.status === "running").length;
    const queued = jobs.filter(j => j.status === "queued").length;
    const done = jobs.filter(jobWorkflowComplete).length;
    const failed = jobs.filter(j => j.status === "failed").length;
    const choose = jobs.filter(j => j.status === "needs_selection" || j.status === "needs_sfdc").length;
    const knowledgeGenerating = jobs.filter(j => j.knowledgeStatus === "generating").length;
    const knowledgeQueued = jobs.filter(j => j.knowledgeStatus === "queued").length;

    if (jobs.length > 1) {
      const hasPendingWork = Boolean(running || queued || knowledgeGenerating || knowledgeQueued);
      const prefix = failed ? "⚠" : hasPendingWork ? "⟳" : done ? "✓" : "•";
      const parts = [];
      if (running) parts.push(`${running} running`);
      if (queued) parts.push(`${queued} queued`);
      if (choose) parts.push(`${choose} choose SFDC`);
      if (knowledgeGenerating) parts.push(`${knowledgeGenerating} knowledge`);
      if (knowledgeQueued) parts.push(`${knowledgeQueued} knowledge queued`);
      if (state.caseChatActiveCount) parts.push(`${state.caseChatActiveCount}/${state.caseChatGenerationLimit} Case Chat generations active`);
      if (done) parts.push(`${done} done`);
      if (failed) parts.push(`${failed} failed`);
      const elapsed = state.startedAt ? ` · ${formatElapsed(Date.now() - state.startedAt)}` : "";
      bubble.textContent = `${prefix} XSUP Batch · ${parts.join(" · ") || "Ready"}${elapsed}`;
      bubble.dataset.kind = failed ? "error" : hasPendingWork ? "running" : done ? "ok" : "";
      return;
    }

    const prefix =
      state.lastStatusKind === "ok" ? "✓" :
      state.lastStatusKind === "error" ? "⚠" :
      state.running ? "⟳" : "•";

    const ticket = state.xsup || "XSUP Audit";
    const elapsed = state.startedAt ? ` · ${formatElapsed(Date.now() - state.startedAt)}` : "";
    bubble.textContent = `${prefix} ${ticket} · ${state.lastStatus}${elapsed}`;
    bubble.dataset.kind = state.lastStatusKind || (state.running ? "running" : "");
  }

  function setStatus(text, kind = "") {
    state.lastStatus = text;
    state.lastStatusKind = kind;

    const el = document.getElementById("xsup-auditor-status");
    if (el) {
      el.textContent = text;
      el.dataset.kind = kind;
    }
    updateMiniBubble();
  }

  function setStep(name, value) {
    const el = document.querySelector(`[data-step="${name}"]`);
    if (el) el.textContent = value;
  }

  function showReport(text) {
    const out = document.getElementById("xsup-auditor-output");
    if (!out) return;

    const hasText = Boolean(String(text || "").trim());
    out.classList.toggle("xa-report-empty", !hasText);

    out.innerHTML = hasText
      ? safeMarkdownToHtml(text)
      : '<div class="xa-report-placeholder">Final audit report will appear here...</div>';
  }

  function showToast(message, kind = "ok") {
    const toast = document.getElementById("xsup-auditor-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.kind = kind;
    toast.classList.add("xa-toast-show");
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove("xa-toast-show"), 5500);
  }

  function minimizePanel() {
    const panel = document.getElementById("xsup-auditor-panel");
    const bubble = document.getElementById("xsup-auditor-bubble");
    if (!panel || !bubble) return;
    panel.style.display = "none";
    bubble.style.display = "flex";
    state.minimized = true;
    updateMiniBubble();
  }

  function restorePanel() {
    const panel = document.getElementById("xsup-auditor-panel");
    const bubble = document.getElementById("xsup-auditor-bubble");
    if (!panel || !bubble) return;
    panel.style.display = "block";
    bubble.style.display = "none";
    state.minimized = false;
  }

  function toggleMaximize() {
    const panel = document.getElementById("xsup-auditor-panel");
    const btn = document.getElementById("xsup-auditor-maximize");
    if (!panel || !btn) return;
    state.maximized = !state.maximized;
    panel.classList.toggle("xa-maximized", state.maximized);
    btn.textContent = state.maximized ? "❐" : "⛶";
    btn.title = state.maximized ? "Restore" : "Maximize";
  }

  function extractSalesforceCaseUrlFromHtml(html) {
    const s = String(html || "");

    const absolute = s.match(/https:\/\/[^\s"'<>]*(?:lightning\.force\.com|salesforce\.com)\/lightning\/r\/Case\/(500[a-zA-Z0-9]{12,15})\/view/i);
    if (absolute) return absolute[0].replace(/&amp;/g, "&");

    const relative = s.match(/\/lightning\/r\/Case\/(500[a-zA-Z0-9]{12,15})\/view/i);
    if (relative) {
      return `https://paloaltonetworks.lightning.force.com${relative[0]}`;
    }

    // Salesforce Case record IDs start with 500. If TACopilot embeds the
    // record ID without a direct anchor, construct the standard Lightning URL.
    const recordId = s.match(/\b(500[a-zA-Z0-9]{12}(?:[a-zA-Z0-9]{3})?)\b/);
    if (recordId) {
      return `https://paloaltonetworks.lightning.force.com/lightning/r/Case/${recordId[1]}/view`;
    }

    return "";
  }

  function candidateContainer(button, xsup, caseNumber) {
    let node = button;
    for (let i = 0; i < 6 && node; i++, node = node.parentElement) {
      const txt = cleanText(node.innerText || node.textContent || "");
      if (
        txt.toUpperCase().includes(String(xsup || "").toUpperCase()) &&
        (!caseNumber || txt.includes(caseNumber)) &&
        txt.length >= cleanText(button.innerText || button.textContent || "").length &&
        txt.length < 5000
      ) {
        return node;
      }
    }
    return button.parentElement || button;
  }

  function extractCaseNumbersFromSearchContext(raw) {
    const text = String(raw || "");
    const found = [];
    const add = value => {
      const caseNo = String(value || "").trim();
      if (!/^0\d{7}$/.test(caseNo)) return;
      if (!found.includes(caseNo)) found.push(caseNo);
    };

    for (const m of text.matchAll(/navigateToCase\(['"](0\d{7})['"]\)/gi)) add(m[1]);
    for (const m of text.matchAll(/\/taco\/case\/(0\d{7})(?:\b|[/?#])/gi)) add(m[1]);
    for (const m of text.matchAll(/\b(?:SFDC|Case(?:\s+Number)?|Salesforce\s+Case)\s*[:#-]?\s*(0\d{7})\b/gi)) add(m[1]);
    return found;
  }

  function buildXSUPSearchCandidate(clean, caseNumber, contextText = "", contextHtml = "") {
    const detailText = cleanText(contextText || "");
    const sfdcUrl = extractSalesforceCaseUrlFromHtml(contextHtml || "");
    const lines = detailText.split(/\n+/).map(x => x.trim()).filter(Boolean);
    return {
      case_number: caseNumber,
      xsup: clean,
      text: detailText,
      details: lines.slice(0, 12).join(" · "),
      sfdc_url: sfdcUrl
    };
  }

  async function getTacoSearchHtml(xsup) {
    const clean = String(xsup || "").trim().toUpperCase();
    const url = `/taco/search?q=${encodeURIComponent(clean)}`;
    let htmxError = null;

    // IMPORTANT: the TACopilot search UI itself uses htmx.ajax(). Prefer that
    // native transport for XSUP -> SFDC resolution. This restores the proven
    // v2.3.1 SFDC resolver hotfix and avoids managed-Chrome fetch/CSRF wrappers.
    if (window.htmx && typeof window.htmx.ajax === "function") {
      const target = document.createElement("div");
      target.style.cssText = "display:none!important";
      target.setAttribute("aria-hidden", "true");
      target.dataset.xsupAuditorTransport = "taco-search";
      document.body.appendChild(target);
      try {
        assertRunning();
        await window.htmx.ajax("GET", url, { target, swap: "innerHTML" });
        assertRunning();
        const html = target.innerHTML || "";
        if (html.trim()) return html;
        htmxError = new Error(`TACopilot native search returned an empty response for ${clean}.`);
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        htmxError = err;
      } finally {
        target.remove();
      }
    }

    // Compatibility fallback for TACopilot builds where direct same-origin GET
    // is available. request() itself can still recover through native HTMX.
    try {
      const r = await request(url);
      return await r.text();
    } catch (fetchErr) {
      const nativeMsg = cleanText(htmxError?.message || "");
      const fetchMsg = cleanText(fetchErr?.message || String(fetchErr || ""));
      const detail = [nativeMsg && `native search: ${nativeMsg}`, fetchMsg && `fetch fallback: ${fetchMsg}`]
        .filter(Boolean).join(" · ");
      const err = new Error(`Unable to query TACopilot search for ${clean}${detail ? ` · ${detail}` : ""}`);
      err.code = "XSUP_SFDC_LOOKUP_UNAVAILABLE";
      err.cause = fetchErr;
      throw err;
    }
  }

  async function resolveXSUPCandidates(xsup) {
    const clean = xsup.trim().toUpperCase();
    const html = await getTacoSearchHtml(clean);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const matches = [];
    const addCandidate = (caseNumber, text, rawHtml) => {
      if (!/^0\d{7}$/.test(String(caseNumber || ""))) return;
      const context = `${cleanText(text || "")} ${cleanText(String(rawHtml || "").replace(/<[^>]+>/g, " "))}`.toUpperCase();
      if (!context.includes(clean)) return;
      matches.push(buildXSUPSearchCandidate(clean, String(caseNumber), text, rawHtml));
    };

    // 1) Legacy TACopilot button layout. Do NOT query [@click]; @ is not a
    // valid CSS attribute selector token and was the v2.4 all-jobs failure.
    for (const button of [...doc.querySelectorAll("button")]) {
      const click = button.getAttribute("@click") || button.getAttribute("x-on:click") || button.getAttribute("onclick") || "";
      const contextNode = candidateContainer(button, clean, "");
      const contextText = cleanText(contextNode?.innerText || contextNode?.textContent || button.innerText || button.textContent || "");
      if (!contextText.toUpperCase().includes(clean)) continue;
      const nums = extractCaseNumbersFromSearchContext(`${click}\n${contextText}\n${contextNode?.outerHTML || button.outerHTML || ""}`);
      for (const num of nums) addCandidate(num, contextText, contextNode?.outerHTML || button.outerHTML || "");
    }

    // 2) Modern link/card/table layouts. Find exact XSUP contexts and walk up
    // only a few levels so unrelated SFDC numbers on the page are not paired.
    const all = [...doc.querySelectorAll("a,button,tr,li,article,section,div")];
    for (const node of all) {
      const own = cleanText(node.innerText || node.textContent || "");
      if (!own.toUpperCase().includes(clean)) continue;
      let cur = node;
      for (let depth = 0; depth < 5 && cur; depth++, cur = cur.parentElement) {
        const text = cleanText(cur.innerText || cur.textContent || "");
        const raw = cur.outerHTML || "";
        if (!text.toUpperCase().includes(clean)) continue;
        if (text.length > 9000) continue;
        const nums = extractCaseNumbersFromSearchContext(`${text}\n${raw}`);
        for (const num of nums) addCandidate(num, text, raw);
        if (nums.length) break;
      }
    }

    // 3) Raw HTML window catches escaped Alpine/template markup that DOMParser
    // cannot expose as normal attributes.
    const upper = html.toUpperCase();
    let from = 0;
    while (true) {
      const idx = upper.indexOf(clean, from);
      if (idx < 0) break;
      const start = Math.max(0, idx - 3500);
      const end = Math.min(html.length, idx + clean.length + 3500);
      const windowHtml = html.slice(start, end);
      const nums = extractCaseNumbersFromSearchContext(windowHtml);
      for (const num of nums) addCandidate(num, cleanText(windowHtml.replace(/<[^>]+>/g, " ")), windowHtml);
      from = idx + clean.length;
    }

    const deduped = [];
    const seen = new Set();
    for (const candidate of matches) {
      if (seen.has(candidate.case_number)) continue;
      seen.add(candidate.case_number);
      deduped.push(candidate);
    }

    if (!deduped.length) {
      throw new Error(`No linked SFDC case could be parsed automatically for ${clean}. Enter the SFDC case number to continue.`);
    }
    return deduped;
  }

  async function resolveXSUP(xsup) {
    const matches = await resolveXSUPCandidates(xsup);
    return matches[0];
  }

  async function resolveXSUPFromSFDC(caseNumber) {
    const sfdc = String(caseNumber || "").trim();
    if (!/^0\d{7}$/.test(sfdc)) throw new Error("Invalid SFDC case number.");
    const r = await request(`/taco/case/${encodeURIComponent(sfdc)}`);
    const html = await r.text();
    const keys = new Set();
    // Prefer explicit Jira browse links because a bare XSUP token can occur in generated Case Chat/history.
    for (const m of String(html || "").matchAll(/jira-dc\.paloaltonetworks\.com\/browse\/(XSUP-\d+)/gi)) keys.add(m[1].toUpperCase());
    for (const m of String(html || "").matchAll(/href=["'][^"']*\/browse\/(XSUP-\d+)[^"']*["']/gi)) keys.add(m[1].toUpperCase());
    if (keys.size === 1) return [...keys][0];
    if (!keys.size) throw new Error(`No structured linked XSUP could be discovered inside TACopilot for SFDC ${sfdc}. Paste XSUP / ${sfdc} to continue.`);
    throw new Error(`Multiple XSUP links were found for SFDC ${sfdc}. Paste the intended XSUP / ${sfdc} pair to avoid guessing.`);
  }

  async function getInvestigations(caseNumber) {
    const r = await request(`/taco/pilot/investigation/${caseNumber}`);
    const j = await r.json();
    return j?.data?.investigations || [];
  }

  function latestInvestigation(investigations) {
    return [...investigations].sort((a, b) => {
      const da = new Date(a.completed_at || a.updated_at || a.created_at || 0);
      const db = new Date(b.completed_at || b.updated_at || b.created_at || 0);
      return db - da;
    })[0] || null;
  }

  async function startAnalysis(caseNumber) {
    const r = await request(`/taco/pilot/investigation/${caseNumber}/start`, {
      method: "POST"
    });
    return r.json();
  }

  async function updateAnalysis(caseNumber, investigationId) {
    const r = await request(`/taco/pilot/investigation/${caseNumber}/update`, {
      method: "POST",
      body: JSON.stringify({
        investigation_id: investigationId,
        engineer_guidance: null
      })
    });
    return r.json();
  }

  function investigationIdFromMutationResponse(payload) {
    const seen = new Set();
    const walk = value => {
      if (!value || typeof value !== "object" || seen.has(value)) return null;
      seen.add(value);
      for (const key of ["investigation_id", "investigationId"]) {
        const candidate = value[key];
        if (candidate != null && String(candidate).trim()) return String(candidate).trim();
      }
      for (const [key, child] of Object.entries(value)) {
        if (/investigation/i.test(key) && child && typeof child === "object") {
          const nested = walk(child);
          if (nested) return nested;
          if (child.id != null && String(child.id).trim()) return String(child.id).trim();
        }
      }
      for (const child of Object.values(value)) {
        const nested = walk(child);
        if (nested) return nested;
      }
      return null;
    };
    return walk(payload);
  }

  async function waitForInvestigationId(caseNumber, onProgress = null) {
    const startedAt = Date.now();
    let lastNoticeAt = 0;
    while (true) {
      assertRunning();
      try {
        const invs = await getInvestigations(caseNumber);
        const latest = latestInvestigation(invs);
        if (latest?.id || latest?.investigation_id) {
          return latest.id || latest.investigation_id;
        }
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        if (Date.now() - lastNoticeAt > 15000) {
          onProgress?.("TACO start accepted; investigation ID is not visible yet · retrying...");
          lastNoticeAt = Date.now();
        }
      }
      const elapsedMin = Math.max(1, Math.floor((Date.now() - startedAt) / 60000));
      if (elapsedMin >= 2 && Date.now() - lastNoticeAt > 15000) {
        onProgress?.(`TACO start accepted · waiting for investigation ID (${elapsedMin}m elapsed)`);
        lastNoticeAt = Date.now();
      }
      await sleep(3000);
    }
  }

  async function getProgress(caseNumber, investigationId) {
    const r = await request(
      `/taco/pilot/investigation/${caseNumber}/progress?investigation_id=${encodeURIComponent(investigationId)}`
    );
    const j = await r.json();
    return j?.data || {};
  }

  function getReportCount(progress) {
    const candidates = [
      progress?.report_count,
      progress?.reports_count,
      progress?.reportCount,
      progress?.completed_reports
    ];
    for (const v of candidates) {
      if (Number.isFinite(Number(v))) return Number(v);
    }
    if (Array.isArray(progress?.reports)) return progress.reports.length;
    if (Array.isArray(progress?.report_versions)) return progress.report_versions.length;
    return null;
  }

  async function getReport(caseNumber, investigationId) {
    const r = await request(
      `/taco/pilot/investigation/${caseNumber}/report/${encodeURIComponent(investigationId)}`
    );
    const j = await r.json();
    return j?.data || {};
  }

  function reportReady(report) {
    // Hypotheses alone are NOT enough. During an update, TACopilot can expose
    // hypotheses before the final synthesized report/conclusion is ready.
    const conclusion =
      report?.verified_conclusion ||
      report?.final_report ||
      report?.report_html ||
      report?.result?.rca ||
      report?.result?.rca_html ||
      report?.result?.guidance ||
      report?.result?.guidance_html;

    return Boolean(
      typeof conclusion === "string"
        ? conclusion.trim().length >= 20
        : conclusion
    );
  }

  function reportMarker(report) {
    if (!reportReady(report)) return "";
    return JSON.stringify({
      updated_at: report?.updated_at || report?.completed_at || report?.created_at || null,
      verified_conclusion: report?.verified_conclusion || null,
      final_report: (report?.final_report || "").slice(0, 500),
      rca: (report?.result?.rca || "").slice(0, 500),
      hypothesis_count: Array.isArray(report?.hypotheses) ? report.hypotheses.length : 0,
      citation_count: Array.isArray(report?.result?.citations) ? report.result.citations.length : 0,
      timeline_count: Array.isArray(report?.timeline) ? report.timeline.length : 0
    });
  }

  async function waitForAnalysis(caseNumber, investigationId, options = {}, onProgress = null) {
    const {
      requireFresh = false,
      requireReportRevision = false,
      baselineReportCount = null,
      baselineReportMarker = "",
      triggerStartedAt = null,
      baselineInvestigationId = investigationId
    } = options;

    const progressUpdate = (value, meta = {}) => {
      if (onProgress) onProgress(value, meta);
      else setStep("taco", value);
    };

    const waitStartedAt = Date.now();
    let currentInvestigationId = investigationId;
    let sawActiveState = false;
    let lastMeaningfulSignature = "";
    let lastMeaningfulChangeAt = Date.now();
    let lastInvestigationCheckAt = 0;
    let latestInvestigationTimestamp = null;
    let lastNetworkNoticeAt = 0;
    let lastStallNoticeAt = 0;
    let terminalFailureConfirmations = 0;

    while (true) {
      assertRunning();

      // A refresh may be represented by TACopilot as a replacement investigation.
      // Re-check periodically and follow a genuinely newer investigation instead
      // of polling an obsolete ID until an arbitrary wall-clock timeout expires.
      if (Date.now() - lastInvestigationCheckAt >= TACO_INVESTIGATION_RECHECK_MS) {
        lastInvestigationCheckAt = Date.now();
        try {
          const invs = await getInvestigations(caseNumber);
          const latest = latestInvestigation(invs);
          const latestId = latest?.id || latest?.investigation_id;
          const latestTs = timestampFromObject(latest);
          if (Number.isFinite(Number(latestTs))) latestInvestigationTimestamp = Number(latestTs);
          const isTriggeredRevision = !triggerStartedAt || !latestTs || latestTs >= Number(triggerStartedAt) - 120000;
          if (latestId && String(latestId) !== String(currentInvestigationId) && isTriggeredRevision) {
            currentInvestigationId = latestId;
            sawActiveState = false;
            progressUpdate(`Following newer TACO Analysis #${currentInvestigationId}...`, {
              phase: "taco",
              backendStatus: "switching",
              heartbeat: true,
              activity: `TACO · following investigation #${currentInvestigationId}`
            });
          }
        } catch (err) {
          if (err?.name === "AbortError") throw err;
        }
      }

      let d;
      try {
        d = await getProgress(caseNumber, currentInvestigationId);
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        if (Date.now() - lastNetworkNoticeAt > 15000) {
          progressUpdate("TACO progress temporarily unavailable · retrying without failing the job...", {
            phase: "taco",
            backendStatus: "retrying",
            heartbeat: true,
            activity: "TACO progress temporarily unavailable · retrying"
          });
          lastNetworkNoticeAt = Date.now();
        }
        await sleep(POLL_MS);
        continue;
      }

      const status = String(d.status || "").toLowerCase();
      const rawProgress = d.overall_progress;
      const numericProgress = Number(rawProgress);
      const progress = Number.isFinite(numericProgress)
        ? Math.max(0, Math.min(100, numericProgress))
        : null;
      const node = d.current_node?.name || d.current_node?.label || d.current_node || "";
      const currentReportCount = getReportCount(d);
      const signature = JSON.stringify({
        id:String(currentInvestigationId || ""),
        status,
        progress,
        node:String(node || ""),
        reports:currentReportCount
      });
      if (signature !== lastMeaningfulSignature) {
        lastMeaningfulSignature = signature;
        lastMeaningfulChangeAt = Date.now();
      }

      const elapsedMin = Math.max(0, Math.floor((Date.now() - waitStartedAt) / 60000));

      if (status !== "completed") {
        progressUpdate(
          `Running ${progress == null ? "?" : progress}% ${node ? "— " + node : ""}${elapsedMin >= 5 ? ` · ${elapsedMin}m elapsed` : ""}`,
          {
            phase: "taco",
            tacoProgress: progress,
            tacoNode: String(node || ""),
            backendStatus: status,
            heartbeat: true,
            activity: `TACO${progress == null ? "" : ` ${progress}%`}${node ? ` · ${node}` : ""}${elapsedMin >= 5 ? ` · ${elapsedMin}m` : ""}`
          }
        );
      }

      if (status === "failed" || status === "error" || status === "cancelled" || status === "canceled") {
        // Immediately after START/UPDATE TACopilot can keep returning the previous
        // terminal progress record while the mutation is still being materialized.
        // Never convert that stale record into a new XSUP failure during the short
        // mutation-settling window; keep the TACO barrier closed and re-check.
        const mutationAge = triggerStartedAt == null ? null : Date.now() - Number(triggerStartedAt);
        if (mutationAge != null && Number.isFinite(mutationAge) && mutationAge >= 0 && mutationAge < TACO_MUTATION_GRACE_MS) {
          terminalFailureConfirmations = 0;
          progressUpdate(`TACO refresh/start is settling; ignoring stale ${status} state for now · ${Math.ceil((TACO_MUTATION_GRACE_MS - mutationAge)/1000)}s grace remaining...`, {
            phase: "taco",
            backendStatus: "mutation_grace",
            heartbeat: true,
            activity: "TACO mutation accepted · waiting for fresh backend state"
          });
          await sleep(POLL_MS);
          continue;
        }

        // TACopilot's investigation-list and progress endpoints can briefly disagree
        // around state transitions. Do not fail an XSUP from a single stale terminal
        // progress response while the investigation list still says the same/newer
        // investigation is active. Require a confirmed terminal state.
        let latestSnapshot = null;
        try {
          const invs = await getInvestigations(caseNumber);
          latestSnapshot = latestInvestigation(invs);
        } catch (_) {}
        const latestId = latestSnapshot?.id || latestSnapshot?.investigation_id || null;
        const latestState = String(latestSnapshot?.status || "").toLowerCase();
        const latestActive = isActiveTacoStatus(latestState);
        if (latestId && String(latestId) !== String(currentInvestigationId) && latestActive) {
          currentInvestigationId = latestId;
          sawActiveState = false;
          terminalFailureConfirmations = 0;
          progressUpdate(`TACO progress endpoint returned ${status}, but a newer active investigation #${currentInvestigationId} exists · following it...`, {
            phase: "taco",
            backendStatus: "reconciling",
            heartbeat: true,
            activity: `TACO · reconciling to active investigation #${currentInvestigationId}`
          });
          await sleep(POLL_MS);
          continue;
        }
        if (latestId && String(latestId) === String(currentInvestigationId) && latestActive) {
          terminalFailureConfirmations = 0;
          progressUpdate(`TACO state endpoints disagree (${status} vs ${latestState}) · keeping the barrier closed and rechecking...`, {
            phase: "taco",
            backendStatus: "reconciling",
            heartbeat: true,
            activity: "TACO state reconciliation · waiting for a consistent terminal state"
          });
          await sleep(POLL_MS);
          continue;
        }
        terminalFailureConfirmations += 1;
        if (terminalFailureConfirmations < 2) {
          progressUpdate(`TACO reported ${status} · confirming terminal state before failing the XSUP...`, {
            phase: "taco",
            backendStatus: status,
            heartbeat: true,
            activity: `TACO · confirming ${status} state`
          });
          await sleep(POLL_MS);
          continue;
        }
        throw new Error(`TACO Analysis failed after terminal-state confirmation: ${d.error_message || status}`);
      }

      terminalFailureConfirmations = 0;
      if (status && status !== "completed") sawActiveState = true;

      if (status === "completed") {
        if (!requireFresh) return {...d, _investigationId: currentInvestigationId};

        const countAdvanced =
          baselineReportCount !== null &&
          currentReportCount !== null &&
          currentReportCount > baselineReportCount;

        let currentMarker = "";
        let ready = false;
        let reportTimestamp = null;
        try {
          const currentReport = await getReport(caseNumber, currentInvestigationId);
          ready = reportReady(currentReport);
          currentMarker = reportMarker(currentReport);
          reportTimestamp = timestampFromObject(currentReport, d, latestInvestigationTimestamp ? {updated_at:latestInvestigationTimestamp} : null);
        } catch (_) {}

        const markerChanged =
          Boolean(baselineReportMarker) &&
          Boolean(currentMarker) &&
          currentMarker !== baselineReportMarker;
        const investigationChanged =
          String(currentInvestigationId || "") !== String(baselineInvestigationId || "");
        const timestampFresh =
          triggerStartedAt != null &&
          Number.isFinite(Number(triggerStartedAt)) &&
          Number.isFinite(Number(reportTimestamp)) &&
          Number(reportTimestamp) >= Number(triggerStartedAt) - 60000;

        const revisionConfirmed = baselineReportMarker
          ? (markerChanged || countAdvanced || investigationChanged || timestampFresh)
          : (sawActiveState || countAdvanced || investigationChanged || timestampFresh);

        if (ready && requireReportRevision && revisionConfirmed) {
          return {...d, _investigationId: currentInvestigationId};
        }

        if (ready && !requireReportRevision && (sawActiveState || countAdvanced || markerChanged || investigationChanged || timestampFresh)) {
          return {...d, _investigationId: currentInvestigationId};
        }

        progressUpdate(requireReportRevision
          ? "TACO completed; waiting for the revised synthesized report..."
          : "TACO completed; verifying refreshed report revision...", {
          phase: "taco",
          tacoProgress: 100,
          backendStatus: "completed",
          heartbeat: true,
          activity: "TACO 100% · verifying refreshed report revision"
        });
      }

      // Long TACO runs are expected. A lack of movement is surfaced as a notice,
      // never converted into a client-side failure. The backend terminal state,
      // Stop All, or an explicit user action determines when this wait ends.
      if (Date.now() - lastMeaningfulChangeAt >= TACO_STALL_NOTICE_MS && Date.now() - lastStallNoticeAt >= TACO_STALL_NOTICE_MS) {
        progressUpdate(`TACO is still running with no visible progress change for ${Math.floor((Date.now() - lastMeaningfulChangeAt)/60000)}m · continuing to wait...`, {
          phase: "taco",
          tacoProgress: progress,
          tacoNode: String(node || ""),
          backendStatus: status || "waiting",
          heartbeat: true,
          activity: "TACO long-running · continuing to wait"
        });
        lastStallNoticeAt = Date.now();
      }

      await sleep(POLL_MS);
    }
  }

  async function waitForReportReady(caseNumber, investigationId, onProgress = null) {
    const startedAt = Date.now();
    let lastNoticeAt = 0;
    const progressUpdate = (value, meta = {}) => {
      if (onProgress) onProgress(value, meta);
      else setStep("taco", value);
    };
    while (true) {
      assertRunning();
      try {
        const report = await getReport(caseNumber, investigationId);
        if (reportReady(report)) return report;
      } catch (err) {
        if (err?.name === "AbortError") throw err;
      }
      const elapsedMin = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
      if (Date.now() - lastNoticeAt > 15000) {
        progressUpdate(`TACO completed; waiting for synthesized report content${elapsedMin >= 2 ? ` · ${elapsedMin}m elapsed` : ""}...`, {
          phase: "taco",
          tacoProgress: 100,
          backendStatus: "completed",
          heartbeat: true,
          activity: "TACO 100% · waiting for synthesized report content"
        });
        lastNoticeAt = Date.now();
      }
      await sleep(3000);
    }
  }

  function classifyComment(el) {
    if (el.id === "comment-jira-ticket") return "JIRA_TICKET_EVENT";
    if (el.dataset.isJira === "true") return "JIRA_COMMENT";
    if (el.dataset.isInternal === "true") return "SFDC_INTERNAL";
    if (el.dataset.isExternal === "true") return "SFDC_CUSTOMER_PUBLIC";
    return "SFDC_TAC_PUBLIC";
  }

  function parseTimestampCandidate(value) {
    if (value == null) return null;

    if (typeof value === "number" && Number.isFinite(value)) {
      if (value > 1e12) return value;
      if (value > 1e9) return value * 1000;
    }

    const s = String(value).trim();
    if (!s) return null;

    if (/^\d{10,13}$/.test(s)) {
      const n = Number(s);
      if (Number.isFinite(n)) return s.length >= 13 ? n : n * 1000;
    }

    if (!/\b20\d{2}\b/.test(s)) return null;

    const direct = Date.parse(s);
    if (Number.isFinite(direct)) return direct;

    const isoish = s.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (isoish) {
      const [, y, mo, d, h, mi, sec = "0"] = isoish;
      const n = new Date(
        Number(y), Number(mo) - 1, Number(d),
        Number(h), Number(mi), Number(sec)
      ).getTime();
      return Number.isFinite(n) ? n : null;
    }

    return null;
  }

  function elementTimestamp(el) {
    if (!el) return null;

    const candidates = [];
    const push = v => { if (v != null && String(v).trim()) candidates.push(v); };

    for (const attr of ["data-timestamp", "data-time", "data-datetime", "datetime"]) {
      push(el.getAttribute?.(attr));
    }

    const time = el.querySelector?.("time[datetime]");
    if (time) push(time.getAttribute("datetime"));

    for (const node of el.querySelectorAll?.("[data-timestamp],[data-time],[data-datetime],[datetime]") || []) {
      for (const attr of ["data-timestamp", "data-time", "data-datetime", "datetime"]) {
        push(node.getAttribute(attr));
      }
    }

    // Some TACopilot comment cards expose timestamp text/title rather than <time>.
    for (const node of el.querySelectorAll?.("[title]") || []) {
      const title = node.getAttribute("title");
      if (title && /\b20\d{2}\b/.test(title)) push(title);
    }

    for (const c of candidates) {
      const ts = parseTimestampCandidate(c);
      if (ts) return ts;
    }

    // Last-resort bounded parsing from the comment header/text.
    const txt = cleanText(el.innerText || "");
    const patterns = [
      /\b20\d{2}-\d{2}-\d{2}[T ][0-2]?\d:[0-5]\d(?::[0-5]\d)?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/,
      /\b20\d{2}\/\d{1,2}\/\d{1,2}[ T][0-2]?\d:[0-5]\d(?::[0-5]\d)?/
    ];
    for (const p of patterns) {
      const m = txt.match(p);
      if (m) {
        const ts = parseTimestampCandidate(m[0]);
        if (ts) return ts;
      }
    }

    return null;
  }

  function latestEvidenceTimestamp(evidence) {
    const times = (evidence?.records || [])
      .map(r => Number(r.timestamp_ms))
      .filter(Number.isFinite);
    return times.length ? Math.max(...times) : null;
  }

  function timestampFromObject(...objects) {
    const keys = [
      "completed_at", "completedAt", "finished_at", "finishedAt",
      "updated_at", "updatedAt", "generated_at", "generatedAt",
      "report_generated_at", "reportGeneratedAt",
      "created_at", "createdAt"
    ];
    const times = [];

    for (const obj of objects) {
      if (!obj || typeof obj !== "object") continue;
      for (const key of keys) {
        const ts = parseTimestampCandidate(obj[key]);
        if (ts) times.push(ts);
      }
    }
    return times.length ? Math.max(...times) : null;
  }

  function formatTimestamp(ts) {
    if (ts == null || String(ts).trim() === "") return "Unknown";
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return "Unknown";
    try {
      return new Date(n).toLocaleString();
    } catch (_) {
      return "Unknown";
    }
  }

  function isActiveTacoStatus(status) {
    const s = String(status || "").toLowerCase();
    return Boolean(s && !["completed", "failed", "error", "cancelled", "canceled"].includes(s));
  }

  function determineTacoFreshness({ latest, progress, report, evidenceTimestamp, forceRefresh = false }) {
    const progressStatus = String(progress?.status || "").toLowerCase();
    const latestStatus = String(latest?.status || "").toLowerCase();
    const status = progressStatus || latestStatus;
    const progressValue = Number(progress?.overall_progress);
    const progressLooksActive = Number.isFinite(progressValue) && progressValue >= 0 && progressValue < 100 && status !== "completed";
    const activeStatus = [progressStatus, latestStatus].find(isActiveTacoStatus) || "";
    // Prefer the report's own generation/completion timestamp for freshness.
    // Progress/list timestamps can move independently of the synthesized report.
    const tacoTimestamp = timestampFromObject(report) || timestampFromObject(progress, latest);
    const valid = reportReady(report);

    if (forceRefresh) {
      return {
        action: "refresh",
        reason: "Manual re-analysis requested by SME.",
        tacoTimestamp,
        evidenceTimestamp,
        status,
        valid
      };
    }

    // Hard barrier with stale-active reconciliation. A genuinely current active
    // investigation blocks Audit/Knowledge. However, if the investigation's own
    // activity timestamp predates newer Jira/SFDC evidence, it cannot satisfy the
    // freshness contract and must be refreshed instead of being waited on forever.
    if (activeStatus || progressLooksActive) {
      const activeInvestigationTimestamp = timestampFromObject(progress, latest);
      if (
        Number.isFinite(Number(evidenceTimestamp)) &&
        Number.isFinite(Number(activeInvestigationTimestamp)) &&
        Number(evidenceTimestamp) > Number(activeInvestigationTimestamp)
      ) {
        return {
          action: "refresh",
          reason: `The active TACO investigation predates newer Jira/SFDC evidence (${formatTimestamp(evidenceTimestamp)} > ${formatTimestamp(activeInvestigationTimestamp)}); refreshing it before Audit/Knowledge.`,
          tacoTimestamp,
          evidenceTimestamp,
          status,
          valid,
          activeInvestigationTimestamp
        };
      }
      return {
        action: "wait",
        reason: `TACO investigation is still active${activeStatus ? ` (${activeStatus})` : progressLooksActive ? ` (${progressValue}%)` : ""}; waiting for completion before Audit/Knowledge.`,
        tacoTimestamp,
        evidenceTimestamp,
        status,
        valid,
        activeInvestigationTimestamp
      };
    }

    if (valid) {
      if (Number.isFinite(evidenceTimestamp) && Number.isFinite(tacoTimestamp)) {
        if (evidenceTimestamp > tacoTimestamp) {
          return {
            action: "refresh",
            reason: `Newer Jira/SFDC evidence exists after the TACO analysis (${formatTimestamp(evidenceTimestamp)} > ${formatTimestamp(tacoTimestamp)}).`,
            tacoTimestamp,
            evidenceTimestamp,
            status,
            valid
          };
        }
        return {
          action: "reuse",
          reason: `Completed TACO analysis is current: no Jira/SFDC evidence is newer than ${formatTimestamp(tacoTimestamp)}.`,
          tacoTimestamp,
          evidenceTimestamp,
          status,
          valid
        };
      }

      if (!Number.isFinite(evidenceTimestamp)) {
        return {
          action: "reuse",
          reason: "A complete TACO analysis exists and no newer case-evidence timestamp could be established. Reusing it avoids an unnecessary analysis.",
          tacoTimestamp,
          evidenceTimestamp,
          status,
          valid
        };
      }

      return {
        action: "reuse",
        reason: "A complete TACO analysis exists. Its generated timestamp was not exposed reliably, so it is reused rather than triggering an unnecessary analysis. SME can force re-analysis if needed.",
        tacoTimestamp,
        evidenceTimestamp,
        status,
        valid
      };
    }

    if (status === "failed" || status === "error") {
      return {
        action: "refresh",
        reason: `Latest TACO analysis status is ${status}; refreshing automatically.`,
        tacoTimestamp,
        evidenceTimestamp,
        status,
        valid
      };
    }

    return {
      action: "refresh",
      reason: "Existing TACO investigation has no usable final synthesized report; refreshing automatically.",
      tacoTimestamp,
      evidenceTimestamp,
      status,
      valid
    };
  }

  async function collectCaseEvidence(caseNumber, xsup = "") {
    const r = await request(`/taco/case/${caseNumber}`, {
      headers: { Accept: "text/html" }
    });
    const html = await r.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const structuredFields = extractStructuredCaseFields(doc);
    const summaryText = caseSummaryText(doc);

    const els = [...doc.querySelectorAll('[id^="comment-"]')];
    if (!els.length) throw new Error("No case comment elements found in TACopilot case page.");

    const hrefs = [...doc.querySelectorAll("a[href]")]
      .map(a => a.href || a.getAttribute("href") || "")
      .filter(Boolean);

    const jiraHref =
      hrefs.find(h => /jira-dc\.paloaltonetworks\.com\/browse\/XSUP-\d+/i.test(h) && h.toUpperCase().includes(xsup || "XSUP-")) ||
      (xsup ? `https://jira-dc.paloaltonetworks.com/browse/${xsup}` : "");

    const sfdcHref =
      hrefs.find(h => /lightning\.force\.com\/lightning\/r\/Case\/500[a-zA-Z0-9]{12,15}\/view/i.test(h)) ||
      extractSalesforceCaseUrlFromHtml(html) ||
      "";

    const tacopilotHref = `${location.origin}/taco/case/${caseNumber}`;

    const records = els.map((el, index) => {
      const timestamp_ms = elementTimestamp(el);
      return {
        sequence: index,
        dom_id: el.id || null,
        type: classifyComment(el),
        timestamp_ms,
        timestamp_iso: Number.isFinite(timestamp_ms) ? new Date(timestamp_ms).toISOString() : null,
        original_text: cleanText(el.innerText)
      };
    });

    const counts = {};
    for (const r of records) counts[r.type] = (counts[r.type] || 0) + 1;

    // Freshness uses the original Jira/SFDC activity timestamps already exposed
    // by TACopilot. We intentionally do not call Jira REST directly from this
    // DevTools snippet because the managed TACopilot CSP blocks cross-origin calls.
    const latestCaseEvidence = latestEvidenceTimestamp({ records });

    return {
      case_number: caseNumber,
      counts,
      records,
      jira_comments: records.filter(x => x.type === "JIRA_COMMENT"),
      sfdc_internal: records.filter(x => x.type === "SFDC_INTERNAL"),
      sfdc_tac_public: records.filter(x => x.type === "SFDC_TAC_PUBLIC"),
      sfdc_customer_public: records.filter(x => x.type === "SFDC_CUSTOMER_PUBLIC"),
      jira_ticket_event: records.find(x => x.type === "JIRA_TICKET_EVENT") || null,
      latest_evidence_timestamp_ms: latestCaseEvidence,
      latest_evidence_timestamp_iso: Number.isFinite(latestCaseEvidence)
        ? new Date(latestCaseEvidence).toISOString()
        : null,
      structured_fields: structuredFields,
      case_summary_text: summaryText,
      links: {
        jira: jiraHref,
        sfdc: sfdcHref,
        tacopilot: tacopilotHref
      }
    };
  }

  function keywordsFromAnalysis(report) {
    const base = [
      report?.verified_conclusion || "",
      report?.result?.rca || "",
      ...(report?.hypotheses || []).map(h => h?.statement || h?.conclusion || "")
    ].join(" ").toLowerCase();

    const stop = new Set([
      "about","after","again","against","being","because","between","could","from","have",
      "into","more","most","other","should","their","there","these","they","this","those",
      "through","under","using","when","where","which","while","with","would","cortex",
      "customer","issue","analysis","investigation","engineering","support"
    ]);

    const words = base.match(/[a-z0-9_.-]{5,}/g) || [];
    const freq = {};
    for (const w of words) {
      if (stop.has(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
    return Object.entries(freq)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 30)
      .map(([w]) => w);
  }

  function scoreRecord(record, keywords) {
    const t = record.original_text.toLowerCase();
    let score = 0;
    for (const k of keywords) if (t.includes(k)) score += 3;
    if (/root cause|functions as designed|by design|expected behavior|workaround|fix|resolved|resolution/i.test(t)) score += 4;
    if (/engineering|jira|xsup|developer|sme/i.test(t)) score += 2;
    return score;
  }

  function isNoiseRecord(record) {
    const t = record.original_text || "";
    return (
      /Auto Approval Impersonation|is approved for the user|is revoked for the user/i.test(t) ||
      /Processing log bundle completed successfully by Vision/i.test(t) ||
      /Agent operational status - EDR upload statistics/i.test(t) ||
      /TSE Assistant Report is now available/i.test(t)
    );
  }

  function selectEvidence(evidence, report) {
    const keywords = keywordsFromAnalysis(report);

    const select = (arr, max, keepStart = 2, keepEnd = 4) => {
      const clean = arr.filter(x => !isNoiseRecord(x));
      if (!clean.length) return [];

      const indexed = clean.map((r, i) => ({
        ...r,
        _i: i,
        _score: scoreRecord(r, keywords)
      }));

      const chosen = new Map();
      const keyFor = x => x.dom_id || `${x.type}-${x._i}`;

      indexed.slice(0, keepStart).forEach(x => chosen.set(keyFor(x), x));
      indexed.slice(-keepEnd).forEach(x => chosen.set(keyFor(x), x));

      indexed
        .slice()
        .sort((a,b) => b._score - a._score)
        .slice(0, max)
        .forEach(x => chosen.set(keyFor(x), x));

      return [...chosen.values()]
        .sort((a,b) => a.sequence - b.sequence)
        .slice(0, max)
        .map(({_i,_score,...x}) => x);
    };

    // Keep the Case Chat payload deliberately compact.
    // Total target: ~32 records.
    return {
      jira: select(evidence.jira_comments, 12, 2, 4),
      internal: select(evidence.sfdc_internal, 7, 1, 3),
      tac_public: select(evidence.sfdc_tac_public, 8, 2, 4),
      customer_public: select(evidence.sfdc_customer_public, 5, 1, 3)
    };
  }

  function formatRecords(title, records) {
    return [
      `===== ${title} =====`,
      ...records.map((r, i) =>
        `\n[${i+1}] ${r.type} | ${r.dom_id}\n${r.original_text.slice(0, 1050)}`
      )
    ].join("\n");
  }

  function buildAuditPrompt({job, report, selected, evidence}) {
    const xsup = actualXsup(job);
    const caseNumber = job.caseNumber;
    const targetTicket = xsup || `SFDC ${caseNumber} (linked XSUP not discovered)`;
    const verifyTarget = xsup || `the linked Jira XSUP for SFDC ${caseNumber}`;
    const profile = getProductProfile(job.productKey);
    if (!profile) throw new Error("Product must be selected before Retrospective Case Chat starts.");

    const conclusion =
      report?.verified_conclusion ||
      report?.result?.rca ||
      report?.final_report ||
      report?.result?.guidance ||
      "NOT AVAILABLE";
    const citations = report?.result?.citations || report?.citations || [];

    return `
XSUP RETROSPECTIVE AUDIT — SUPPORT-OWNED FIELD REVIEW

TARGET
Ticket: ${targetTicket}
SFDC Case: ${caseNumber}
Selected Product: ${profile.label}
Product Selection: ${job.productSelectionSource === "manual" ? "Reviewer selected" : "Automatically detected"}${job.productConfidence ? ` (${job.productConfidence} confidence)` : ""}

PURPOSE
TACO already performs broad technical case analysis. Do NOT create another general SFDC case-quality review.
Use TACO plus ORIGINAL Jira/SFDC evidence to make the product-specific Support-owned retrospective decision.

PRODUCT POLICY
${profile.policy}

RETROSPECTIVE ELIGIBILITY RULE
${profile.eligibility}

IMPORTANT PRODUCT RULE
- Use the selected product (${profile.label}) for this review. Do not silently change product family based on incidental references to another product inside comments or documentation.
- CURRENT SAVED Jira field values may ONLY come from the TRUSTED CURRENT SAVED JIRA FIELD SNAPSHOT above when it contains structured Jira issue fields for the exact XSUP.
- NEVER populate a current saved value from Jira comments, Engineering narrative, TACO, Case Chat, previous Audit/KCS text, SFDC Resolution narrative, or rendered page text.
- "RCA Category" is NOT the same field as RCA and must never be used as a fallback/current RCA value.
- If a current saved field is not available from the trusted snapshot, write "Not verified" for Current Value. This does NOT prevent an independent technical assessment of the correct/expected value.
- When verification is required and an XSUP is known, say exactly "Verify saved Jira <Field> on ${xsup || "the linked XSUP"}". If this is SFDC-only and no XSUP was discovered, say "Verify saved Jira <Field> on ${verifyTarget}". Never claim the SFDC narrative is the saved Jira field.
- OUT OF SCOPE means the supplied current field values are established and do not match this product's retrospective trigger. Do not manufacture a field review to make the ticket fit the policy.

CURRENT TICKET FIELD SNAPSHOT
${ticketFieldSnapshot(evidence, job)}

STRUCTURED SFDC/TACOPILOT TAXONOMY
${formatProductTaxonomy(evidence)}

SOURCE CONTROL
1. TACO is DERIVED TECHNICAL ANALYSIS and can synthesize/search the case.
2. Original Jira/Engineering and SFDC records are ORIGINAL CASE EVIDENCE.
3. A field verdict must be supported by original evidence when claiming what Engineering/TAC/customer confirmed.
4. TACO-generated Customer Response is not proof a message was actually sent.
5. Selected excerpts cannot prove that something never happened.
6. If evidence is insufficient, use UNDETERMINED. Do not guess.
7. Distinguish confirmed facts from TACO inference.
8. If you use wording such as "abnormal", "inconsistent", "worse than expected", "customer-specific", or similar, immediately explain the concrete evidence that justifies it.
9. Do not score TAC effort, responsiveness, delay, handoffs, or case ownership unless a fact directly changes a Support-owned field decision or knowledge action.
10. Do not infer AI usage.
11. Avoid subjective labels such as lazy, careless, poor engineer, weak escalation, etc.

EXPLANATION STANDARD — SME / ENGINEER FRIENDLY
The human-facing review is a lessons-learned decision aid, not a field-acquisition report.
The first duty is to describe the ACTUAL REPORTED ISSUE precisely. Do not replace the customer-visible symptom with the later root cause. State what changed, what the customer expected Cortex to show/do, and what Cortex actually showed/did not show. Example pattern: "The endpoint/user was moved from OU A to OU B, but Cortex continued to show/use the old OU association and therefore kept the old policy." Only after that, explain the findings/root cause.
For every applicable audited field:
- Correct / Expected Value: the technically supported value.
- Why: 1–2 concise CASE-SPECIFIC technical sentences explaining why that value fits.
- If trusted structured Jira data proves the currently saved value is different, explain the mismatch clearly and why the recommended value is better.
- If the current saved value is unavailable, DO NOT discuss "Not verified", "verify saved value", field acquisition, or lookup status in the human-facing recommendation. The tool will keep that internally.
- TAC Learning: what TAC/SME should recognize earlier next time.
- TAC Action Item: one concrete preventive triage/checklist/documentation action that reduces repeat investigation, avoidable escalation, or misclassification in future tickets. This is NOT a Jira-field verification instruction.
- Immediate Operational Guidance: preserve case-supported practical steps that directly affect the customer's outcome (for example logoff/logon to reprioritize synchronization). Do not bury these only in detailed evidence.
- If logoff/logon or another interactive-session action can reprioritize synchronization, explicitly state that it does NOT guarantee a specific completion time or sub-hour policy transition unless a current authoritative source explicitly provides that guarantee.
CRITICAL: Do NOT put retrospective policy mechanics, eligibility rules, schema names, lookup contract names, field-fetch failures, UNAVAILABLE status, prompt behavior, or internal implementation details in human-facing Why/Learning/Action.
If the recommended value is something other than the normal retrospective trigger (for example a confirmed defect is Fixed rather than Functions as designed), explain the technical evidence for that alternate value with enough detail for an SME to accept the decision quickly.
Detailed technical evidence may remain in the internal structured response for deterministic parsing.

TECHNICAL EVIDENCE LABELS
Technical Conclusion Evidence: SUPPORTED / NOT SUPPORTED / UNDETERMINED
Engineering Confirmation: YES / NO / PARTIAL / UNDETERMINED

TECHNICAL CONCLUSION EVIDENCE means whether the technical conclusion itself is supported. It is not a TAC performance score and does not by itself decide whether a Support-owned field is correct.
ENGINEERING CONFIRMATION requires original Engineering/Jira evidence; TACO synthesis alone is not Engineering confirmation.

TACO VERIFIED CONCLUSION
${conclusion}

If the TACO verified conclusion/reference material above is unexpectedly unavailable, do not complete the field classification. Return UNDETERMINED and state that current TACO Analysis is required.

TACO REFERENCE COUNTS
Hypotheses: ${report?.hypotheses?.length || 0}
Citations: ${citations.length}
Recommended Actions: ${(report?.result?.recommended_actions || []).length}

COMPLETE ORIGINAL-EVIDENCE COUNTS
Jira comments: ${evidence.jira_comments.length}
SFDC TAC-public: ${evidence.sfdc_tac_public.length}
SFDC customer-public: ${evidence.sfdc_customer_public.length}
SFDC internal: ${evidence.sfdc_internal.length}

${formatRecords("ORIGINAL JIRA / ENGINEERING EVIDENCE", selected.jira)}

${formatRecords("ORIGINAL SFDC INTERNAL EVIDENCE", selected.internal)}

${formatRecords("ORIGINAL TAC → CUSTOMER PUBLIC EVIDENCE", selected.tac_public)}

${formatRecords("ORIGINAL CUSTOMER → TAC PUBLIC EVIDENCE", selected.customer_public)}

XSUP RETROSPECTIVE REVIEW
Review the case from the TAC engineer's position at the time the XSUP was created. This is NOT a future troubleshooting runbook. Explain what TAC had already established, why escalation was or was not justified, what Engineering uniquely added, and whether existing knowledge/cases could reasonably have shortened or avoided the escalation.
- TAC Work Before XSUP: summarize only troubleshooting/evidence actually performed or established before/during escalation from original Jira/SFDC evidence. Do not turn this into a generic checklist.
- XSUP Escalation Assessment: APPROPRIATE / PARTIAL / AVOIDABLE, followed by a concise evidence-backed reason.
- Could XSUP Have Been Avoided: YES / PARTIAL / NO. YES/PARTIAL requires a specific prior answer/check that was available; NO requires explaining what Engineering-only evidence/confirmation was still necessary.
- Engineering Contribution: what Engineering/backend access proved or changed that TAC could not establish alone.
- Existing Prior Match: DIRECT / PARTIAL / NONE / UNDETERMINED. Inspect the CONTENT of any candidate prior KCS/case/guide available to the investigation; title similarity alone is not enough.
- Best Prior Reference: exact title + ID + DIRECT LINK when identified. If a URL is available, include it so the reviewer can open the source without searching.
- What Was Already Known: the specific reusable answer already present in that source.
- Prior Knowledge Found / Used Before XSUP: YES / NO / UNCLEAR. This is about what the case record proves TAC actually found or used before escalation, not what a retrospective search finds later.
- Prior Knowledge Use Evidence: concise evidence for YES/NO, or why the record is insufficient and therefore UNCLEAR.
- Knowledge Availability: EXISTS INTERNALLY / EXISTS IN SALESFORCE KCS / PARTIAL / ABSENT / UNDETERMINED. A good Confluence/internal guide means knowledge is not absent merely because no Salesforce KCS exists.
- Knowledge Channel Gap: identify whether the real gap is discoverability/distribution (for example, clear internal Confluence guidance exists but no equivalent Salesforce KCS/customer-facing article is established). If so, say so explicitly.
- Could Prior Knowledge Have Narrowed Earlier: YES / PARTIAL / NO, with a concise reason.
- Earlier Narrowing Possible: YES / PARTIAL / NO. If YES/PARTIAL, state the precise missed/late recognition and why it mattered. If NO, explain which decisive evidence was unavailable until Engineering became involved.
- Retrospective Improvement: one concise process/knowledge improvement that follows from the review.
Do not score people, responsiveness, ownership, or effort. Do not output future collection lists unless a missing item directly explains why the escalation could not be resolved earlier.

KNOWLEDGE DECISION — AUDIT-LED DESTINATION SELECTION
- The retrospective Audit is the PRIMARY decision-maker for downstream knowledge. Before selecting an action, inspect the actual content available to this investigation across Salesforce KCS, maintained Admin/Tech/product documentation, Confluence/internal guides, runbooks, Known Issue/Release Note material, prior cases and Jira/Engineering evidence. Do not defer the basic destination decision to the later KCS-generation flow.
- Choose the BEST destination for the reusable gap. Do not force a KCS-family artifact when a different maintained destination is the justified action, and do not inject a hidden companion artifact after the Audit. The later Knowledge stage may validate/reconcile the selected artifact, but it must not invent an additional artifact type that the Audit did not recommend.
- UPDATE EXISTING KCS: use ONLY after inspecting the actual CONTENT of a specific existing Salesforce KCS identified by exact title + ID/link. Compare symptom/task, cause/meaning, checks/procedure, resolution/workaround/action and verification. Title/ID similarity alone is insufficient. State what the KCS already covers and the material content that is missing. If candidate content is unavailable, do NOT guess an update target.
- CREATE KCS: use when a reusable TAC/customer support article is warranted and no substantially matching Salesforce KCS is established from inspected content. If the validated answer already exists in Confluence, a runbook, Engineering notes or another non-Salesforce source, describe this as a Salesforce/discoverability/distribution gap rather than claiming the technical knowledge is absent.
- UPDATE ADMIN/TECH GUIDE: this may be PRIMARY when the real gap belongs in maintained administrator/product documentation. It is NOT implied by "Functions as designed", architecture, configuration, reusable guidance, or the existence of a workaround. Recommend it only when all are substantially true:
  1. the guidance is broadly reusable beyond the support symptom/case;
  2. it is administrator-facing behavior, prerequisite, configuration expectation, architecture/design limit, migration behavior, permission dependency, deployment guidance or other proactive product-use guidance;
  3. current maintained documentation is shown to omit, materially under-explain, or misstate it;
  4. a plausible maintained guide/page/section is identified or the documentation owner/location can be determined;
  5. documenting it there would prevent misconfiguration/misunderstanding rather than merely duplicate troubleshooting content.
- If those Admin/Tech Guide conditions are not established, set Admin/Tech Guide Needed = NO and do NOT choose UPDATE ADMIN/TECH GUIDE as Primary or Secondary Knowledge Action.
- CREATE/UPDATE RUNBOOK: choose when TAC/internal responders need an ordered internal workflow, collection sequence, decision tree, internal commands, escalation criteria, or Engineering boundary that belongs in an internal operational runbook. It may be PRIMARY when that is the actual gap.
- KNOWN ISSUE/RELEASE NOTE: choose for a version-specific defect/limitation, affected/fixed-version statement, upgrade advisory or release-communication need. It may be PRIMARY when that is the actual gap.
- NO KNOWLEDGE ACTION: use when inspected existing material already covers the reusable learning sufficiently or there is no material reusable gap.
- UNDETERMINED: use when the available evidence is insufficient to choose safely.
- Secondary Knowledge Action is optional and must be NONE unless a SECOND destination has its own distinct evidence-backed gap. Never add a secondary merely to make the portfolio look complete.
- Direct Generate KCS is the intentional exception: that user-invoked workflow is KCS-family-only and performs its own CREATE-vs-UPDATE content reconciliation.

ARTIFACT READINESS
- READY: enough evidence to create a useful draft now.
- DRAFTABLE: a useful draft can be created, but named validation items remain.
- NOT READY: insufficient evidence for a useful artifact.
- NOT APPLICABLE: no knowledge artifact is recommended.

Return EXACTLY this structure:

**Target Ticket:** ${targetTicket}

**Product Family:** ${profile.label}

**Retrospective Eligibility:** [IN SCOPE / OUT OF SCOPE / UNDETERMINED]

## Case Summary

**Reported Issue:** [2-3 sentences. Describe the customer-visible symptom and expected-vs-actual behavior. Keep one-off hostnames, policy names and customer identifiers out unless they are technically necessary to understand the field decision. Do not start with the root cause.]

**Technical Conclusion:** [2-4 complete sentences in ONE paragraph. State the evidence-backed finding/root cause and expected product behavior, separate from the reported symptom. Include the practical behavior that matters to TAC/customer when it is established by the case (for example, whether logoff/logon, restart, upgrade, configuration change, exclusion, license change, task reorder, or another supported action changes the outcome). Do not end with a colon and do not defer the actual cause into a numbered/bulleted list.]

**Immediate Operational Guidance:** [1 concise evidence-backed action/workaround/verification that TAC or the customer can perform now. This is the case-specific practical next step, NOT the TAC process-improvement action item. If none is supported, write "None identified".]

**Technical Conclusion Evidence:** [SUPPORTED / NOT SUPPORTED / UNDETERMINED]

**Technical Conclusion Evidence Explanation:** [detailed reason]

**Engineering Confirmation:** [YES / NO / PARTIAL / UNDETERMINED]

**Engineering Confirmation Evidence:** [original evidence and what it proves]

**Important Technical Caveat:** [important caveat or "None identified"]

## TAC Learning & Prevention

**TAC Learning:** [1-2 concise case-specific lessons TAC/SME should recognize earlier next time; no policy/lookup mechanics]

**TAC Action Item:** [one concrete preventive workflow/checklist/documentation action for future similar tickets; do not tell TAC to verify an unavailable saved Jira field]

## XSUP Retrospective Review

**TAC Work Before XSUP:** [what TAC actually checked/established from the case record before or during escalation; concise factual summary, not a future checklist]

**XSUP Escalation Assessment:** [APPROPRIATE / PARTIAL / AVOIDABLE — concise evidence-backed explanation]

**Could XSUP Have Been Avoided:** [YES / PARTIAL / NO — explain why]

**Engineering Contribution:** [what Engineering/backend visibility uniquely confirmed, disproved, changed, or enabled]

**Existing Prior Match:** [DIRECT / PARTIAL / NONE / UNDETERMINED]

**Best Prior Reference:** [exact prior KCS/case/guide title + ID + direct link when available, or "None identified"]

**What Was Already Known:** [specific content from that prior source that matched this case, or "None established"]

**Prior Knowledge Found / Used Before XSUP:** [YES / NO / UNCLEAR]

**Prior Knowledge Use Evidence:** [what in the case record proves the status; do not infer YES from a retrospective match]

**Knowledge Availability:** [EXISTS INTERNALLY / EXISTS IN SALESFORCE KCS / PARTIAL / ABSENT / UNDETERMINED]

**Knowledge Channel Gap:** [for example: "Validated guidance exists in internal Confluence, but equivalent Salesforce KCS/customer-facing coverage was not established; the action is packaging/distribution, not creation of knowledge from zero." Or "None identified".]

**Could Prior Knowledge Have Narrowed Earlier:** [YES / PARTIAL / NO — concise reason based on content and availability, not title similarity]

**Earlier Narrowing Possible:** [YES / PARTIAL / NO]

**Earlier Narrowing:** [If YES/PARTIAL: what specific recognition/check/reference was late or missed and how it affected the escalation. If NO: what decisive evidence only Engineering could provide.]

**Retrospective Improvement:** [one concise, evidence-backed improvement for future similar cases]

**Management Signal:** [choose ONE case-specific signal: KNOWLEDGE QUALITY / MAINTENANCE / KNOWLEDGE DISCOVERABILITY / DISTRIBUTION / TAC WORKFLOW / ENABLEMENT / DOCUMENTATION / EXPECTATION GAP / ENGINEERING DEPENDENCY / PRODUCT GAP / MIXED / UNDETERMINED]

**Management Learning:** [2-4 concise sentences about what THIS XSUP teaches management: why it escalated, what organizational gap or dependency it exposed, and what is worth retaining. Do not infer an organization-wide trend from one XSUP.]

**Management Use / Action:** [1-3 concrete management uses/actions for THIS XSUP learning, such as close/update/distribute the knowledge gap, route maintained documentation, standardize a TAC workflow, preserve an Engineering boundary, or track whether the same issue repeats. Do not claim a trend or KPI from this single case.]

## Support-Owned Field Decisions

**Reviewed Fields:** [list ONLY fields that are applicable under the selected product policy, or "None — Out of Scope", or "UNDETERMINED"]

**Resolution Change Needed:** [NO / YES / VERIFY SAVED VALUE / VERIFY + CHANGE / NOT APPLICABLE]

**RCA Change Needed:** [NO / YES / VERIFY SAVED VALUE / VERIFY + CHANGE / NOT APPLICABLE]

**Fix Type Change Needed:** [NO / YES / VERIFY SAVED VALUE / VERIFY + CHANGE / NOT APPLICABLE]

**Label / Flag Change Needed:** [NO / YES / VERIFY SAVED VALUE / VERIFY + CHANGE / NOT APPLICABLE]

### Resolution Review
[Include ONLY if Resolution is applicable under the selected product policy. Otherwise omit this subsection.]

**Resolution Current Value:** [exact trusted structured Jira Resolution value, or "Not verified"]

**Resolution Technical Assessment:** [concise assessment of what the value should be]

**Resolution Verdict:** [CORRECT / INCORRECT / TECHNICALLY CORRECT / TECHNICALLY INCORRECT / CURRENT VALUE NEEDED]

**Resolution Change Required:** [NO / YES / VERIFY SAVED VALUE / VERIFY + CHANGE]

**Resolution Recommended Value:** [exact correct/expected value]

**Resolution Why:** [1-2 concise case-specific technical sentences only; omit policy/lookup mechanics]

**Resolution Detailed Explanation:** [detailed technical explanation for SME/Engineering review]

**Resolution Supporting Evidence:** [2-5 strongest original evidence points]

**Resolution Support Action:** [one concise action; if verification is needed say "Verify saved Jira Resolution on ${xsup}"]

### RCA Review
[Include ONLY if RCA is applicable under the selected product policy. Otherwise omit this subsection.]

**RCA Current Value:** [exact trusted structured Jira RCA value, or "Not verified"]

**RCA Technical Assessment:** [concise assessment of what the value should be]

**RCA Verdict:** [CORRECT / INCORRECT / TECHNICALLY CORRECT / TECHNICALLY INCORRECT / CURRENT VALUE NEEDED]

**RCA Change Required:** [NO / YES / VERIFY SAVED VALUE / VERIFY + CHANGE]

**RCA Recommended Value:** [exact correct/expected value]

**RCA Why:** [1-2 concise case-specific technical sentences only; omit policy/lookup mechanics]

**RCA Detailed Explanation:** [detailed technical explanation for SME/Engineering review]

**RCA Supporting Evidence:** [strongest original evidence]

**RCA Support Action:** [one concise action; if verification is needed say "Verify saved Jira RCA on ${xsup}"]

### Fix Type Review
[Include ONLY if Fix Type is applicable under the selected product policy. Otherwise omit this subsection.]

**Fix Type Current Value:** [exact trusted structured Jira Fix Type value, or "Not verified"]

**Fix Type Technical Assessment:** [concise assessment of what the value should be]

**Fix Type Verdict:** [CORRECT / INCORRECT / TECHNICALLY CORRECT / TECHNICALLY INCORRECT / CURRENT VALUE NEEDED]

**Fix Type Change Required:** [NO / YES / VERIFY SAVED VALUE / VERIFY + CHANGE]

**Fix Type Recommended Value:** [exact correct/expected value]

**Fix Type Why:** [1-2 concise case-specific technical sentences only; omit policy/lookup mechanics]

**Fix Type Detailed Explanation:** [detailed technical explanation for SME/Engineering review]

**Fix Type Supporting Evidence:** [strongest original evidence]

**Fix Type Support Action:** [one concise action; if verification is needed say "Verify saved Jira Fix Type on ${xsup}"]

### Flag / Label Review
[Include ONLY if Flag/Label is applicable under the selected product policy. Otherwise omit this subsection.]

**Flag / Label Current Value:** [exact trusted structured Jira Labels value, or "Not verified"]

**Flag / Label Technical Assessment:** [concise assessment of what the value should be]

**Flag / Label Verdict:** [CORRECT / INCORRECT / TECHNICALLY CORRECT / TECHNICALLY INCORRECT / CURRENT VALUE NEEDED]

**Flag / Label Change Required:** [NO / YES / VERIFY SAVED VALUE / VERIFY + CHANGE]

**Flag / Label Recommended Value:** [exact correct/expected value]

**Flag / Label Why:** [1-2 concise case-specific technical sentences only; omit policy/lookup mechanics]

**Flag / Label Detailed Explanation:** [detailed technical explanation for SME/Engineering review]

**Flag / Label Supporting Evidence:** [strongest original evidence]

**Flag / Label Support Action:** [one concise action; if verification is needed say "Verify saved Jira Labels on ${xsup}"]

## Supporting Context for the Field Decision

**Material Context:** [Only facts that materially help explain the field verdict/eligibility/knowledge action. If none, "No additional context required."]

**Why It Matters:** [how this context affects—or does not affect—the field decision]

## Knowledge Action

**Primary Knowledge Action:** [CREATE KCS / UPDATE EXISTING KCS / UPDATE ADMIN/TECH GUIDE / CREATE/UPDATE RUNBOOK / KNOWN ISSUE/RELEASE NOTE / NO KNOWLEDGE ACTION / UNDETERMINED]

**Secondary Knowledge Action:** [same values or NONE]

**Artifact Readiness:** [READY / DRAFTABLE / NOT READY / NOT APPLICABLE]

**Artifact Type:** [KCS Draft / KCS Update Proposal / Admin/Tech Guide Update Proposal / Runbook Draft / Known Issue / Release Note Draft / None / Undetermined]

**Existing Knowledge Coverage:** [COMPLETE / PARTIAL / NONE / UNDETERMINED]

**Knowledge Availability / Channel:** [EXISTS INTERNALLY / EXISTS IN SALESFORCE KCS / PARTIAL / ABSENT / UNDETERMINED — distinguish a content gap from a Salesforce/distribution gap]

**Knowledge Channel Gap:** [concise explanation. If internal Confluence/runbook guidance already contains the answer but no equivalent Salesforce KCS is established, say that CREATE KCS packages existing validated knowledge for TAC reuse/externalization rather than inventing new knowledge.]

**Existing KCS Candidate:** [exact title + ID/link when a candidate was inspected, otherwise "None identified"]

**Existing KCS Content Match:** [DIRECT / PARTIAL / NONE / UNDETERMINED / NOT APPLICABLE]

**Existing KCS Covered Content:** [what the candidate actually already explains, based on its content; otherwise "Not applicable"]

**Existing KCS Missing Content:** [what material learning would need to be added; otherwise "Not applicable"]

**Primary Knowledge Reason:** [why this artifact format is the best primary destination for the learning]

**Secondary Knowledge Reason:** [why the secondary artifact adds value, or "NONE"]

**Admin/Tech Guide Needed:** [YES / NO — YES only when the separate maintained-documentation gap test above is satisfied]

**Admin/Tech Guide Need Reason:** [specific reason the maintained Admin/Tech Guide needs a change, or "NONE"]

**Admin/Tech Guide Gap Evidence:** [what current maintained documentation omits/under-explains/misstates and the relevant guide/page/section/link when established, or "NOT ESTABLISHED"]

**Target Audience:** [TAC / Administrators / Customers / Engineering / mixed audience]

**Knowledge Gap:** [what existing material does not clearly explain or operationalize]

**Target Knowledge Location:** [existing KCS/guide/runbook/known-issue family or recommended placement when known]

**Knowledge Decision Explanation:** [detailed reason comparing why this belongs in KCS vs Admin/Tech Guide vs Runbook vs Known Issue/Release Note]

**Knowledge Evidence:** [specific evidence]

**Validation Boundary:** [only concrete facts/paths/API schemas/timings/scope that still require validation, or "No additional validation items identified for draft generation"]

**Auto-Generate Knowledge Artifact:** [YES when at least one supported Primary/Secondary Knowledge Action is recommended and Artifact Readiness is READY or DRAFTABLE; otherwise NO.]

## Reviewer Summary

**Support Action Summary:** [exactly what Support should change/retain, or state OUT OF SCOPE/UNDETERMINED]

**Knowledge Action Summary:** [concise knowledge recommendation framed as a draft/update proposal for human review; do not state that anything should be "published" as an already-approved action]

Do not add general TAC performance scoring, delay-driver scoring, escalation-avoidability scoring, or customer-communication scoring.
Do not add sections outside this template.
`.trim();
  }

  function normalizeDecision(s) {
    return cleanText(String(s || "")).toUpperCase();
  }


  function adminTechGuideNeedIsStrong(job) {
    const explicit = normalizeDecision(job?.adminTechGuideNeeded || "");
    if (explicit === "YES") return true;
    if (explicit === "NO") return false;

    // Legacy/reused Audit answers do not have the v2.4.19 explicit gate. Be
    // conservative: a generic "update the guide" recommendation is not enough.
    const gap = cleanText(job?.adminTechGuideGapEvidence || job?.knowledgeGap || "");
    const target = cleanText(job?.targetKnowledgeLocation || "");
    const reason = cleanText(job?.adminTechGuideNeedReason || job?.secondaryKnowledgeReason || job?.primaryKnowledgeReason || "");
    const decision = cleanText(job?.knowledgeDecisionExplanation || "");
    const combined = `${gap} ${target} ${reason} ${decision}`;
    const docGap = /(?:maintained|official|admin|administrator|product|technical)\s+(?:documentation|docs?|guide)|(?:documentation|guide)\s+(?:gap|lacks?|missing|omits?|does not|doesn't|under[- ]?explain|misstate|unclear|needs? to explain|should explain|should document)/i.test(combined);
    const explicitGap = /(?:lacks?|missing|omits?|does not|doesn't|under[- ]?explain|misstate|not documented|documentation gap|guide gap)/i.test(gap);
    const targetEstablished = /(?:admin|administrator|technical|migration|configuration|role permissions?|log forwarding|documentation|guide|docs-cortex|docs\.)/i.test(target);
    const proactive = /(?:prerequisite|configuration|deployment|migration|permission|architecture|design|limitation|expected behavior|before|onboarding|administrator|admin-facing|product behavior)/i.test(combined);
    return Boolean(docGap && explicitGap && targetEstablished && proactive);
  }

  function extractKnowledgeCandidateIds(value) {
    const text = String(value || "");
    const ids = [];
    for (const m of text.matchAll(/\b(?:ka[A-Za-z0-9]{8,}|KCS[-_ ]?\d+|KB[-_ ]?\d+)\b/gi)) {
      const id = cleanText(m[0]);
      if (id && !ids.some(x=>x.toLowerCase()===id.toLowerCase())) ids.push(id);
    }
    return ids.slice(0,6);
  }

  function reconcileRetrospectiveAvoidability(job) {
    if (!job) return job;
    const current = cleanText(job.xsupAvoidable || "").toUpperCase();
    if (/^(YES|NO|PARTIAL)$/.test(current)) return job;
    const assessment = cleanText(job.xsupEscalationAssessment || "").toUpperCase();
    // Reconcile only when the structured avoidability field is absent/unclear
    // and the model's own escalation assessment states the conclusion
    // explicitly. Do not infer avoidability merely from an earlier-narrowing
    // opportunity or from a prior-match status.
    if (/^AVOIDABLE\b/.test(assessment)) job.xsupAvoidable = "YES";
    else if (/^(?:UNAVOIDABLE|NOT AVOIDABLE)\b/.test(assessment) ||
      (/^APPROPRIATE\b/.test(assessment) && /(?:ENGINEERING|BACKEND).*(?:REQUIRED|NEEDED)|(?:REQUIRED|NEEDED).*(?:ENGINEERING|BACKEND)/.test(assessment))) {
      job.xsupAvoidable = "NO";
    }
    return job;
  }

  function reconcileRetrospectiveKnowledgeState(job) {
    if (!job) return job;
    const action = normalizeDecision(job.knowledgeAction || "");
    const evidence = cleanText([
      job.existingKcsCandidate, job.existingKcsCoveredContent, job.existingKcsMissingContent,
      job.priorReference, job.priorKnown, job.managementLearning, job.knowledgeDecisionExplanation,
      job.primaryKnowledgeReason, job.secondaryKnowledgeReason
    ].filter(Boolean).join(" "));
    const negative = /(?:no|none|without)\s+(?:existing|matching|relevant|substantially matching)\s+(?:salesforce\s+)?(?:kcs|knowledge|kb)|no\s+(?:kcs|knowledge)\s+(?:was\s+)?found/i.test(evidence);
    const ids = extractKnowledgeCandidateIds(evidence);
    const positive = !negative && (ids.length || /(?:existing|current|prior|general)\s+(?:salesforce\s+)?(?:kcs|knowledge|kb)|(?:kcs|knowledge)\s+(?:article|content)\s+(?:exists|covers?|documents?|explains?)/i.test(evidence));
    const updateAction = action === "UPDATE EXISTING KCS";
    if ((updateAction || positive) && !/^(DIRECT|PARTIAL)$/i.test(cleanText(job.existingKcsContentMatch || ""))) job.existingKcsContentMatch = "PARTIAL";
    if (updateAction || positive) {
      const current = cleanText(job.priorMatchStatus || "").toUpperCase();
      if (!/^(DIRECT|PARTIAL)$/i.test(current)) job.priorMatchStatus = /DIRECT/i.test(cleanText(job.existingKcsContentMatch || "")) ? "DIRECT" : "PARTIAL";
      if (!cleanText(job.existingKcsCandidate || "") && ids.length) job.existingKcsCandidate = `Existing knowledge candidate${ids.length>1?"s":""}: ${ids.join(", ")}`;
      if (!cleanText(job.priorReference || "")) job.priorReference = cleanText(job.existingKcsCandidate || (ids.length ? `Existing knowledge candidate${ids.length>1?"s":""}: ${ids.join(", ")}` : ""));
      if (!cleanText(job.priorKnown || "") && positive) job.priorKnown = cleanHumanLearning(job.managementLearning || job.knowledgeDecisionExplanation || job.primaryKnowledgeReason || "", 3);
    }
    return job;
  }

  function completedKnowledgeAction(result) {
    const type=cleanText(result?.type||"").toUpperCase();
    const action=normalizeDecision(result?.action||"");
    if(type==="KCS_UPDATE" || action==="UPDATE EXISTING KCS") return "UPDATE EXISTING KCS";
    if(type==="KCS_DRAFT" || action==="CREATE KCS") return "CREATE KCS";
    if(type==="RUNBOOK") return "CREATE/UPDATE RUNBOOK";
    if(type==="DOC_UPDATE") return "UPDATE ADMIN/TECH GUIDE";
    if(type==="KNOWN_ISSUE") return "KNOWN ISSUE/RELEASE NOTE";
    return action;
  }

  function reconcileFinalKnowledgePortfolio(job, successes = []) {
    if(!job) return job;
    const originalPrimary=normalizeDecision(job.knowledgeAction||"");
    const originalSecondary=normalizeDecision(job.secondaryKnowledgeAction||"");
    const actual=[];
    for(const result of successes||[]){const a=completedKnowledgeAction(result);if(a && !actual.includes(a)) actual.push(a);}
    if(!actual.length) return job;
    const finalKcs=actual.includes("UPDATE EXISTING KCS") ? "UPDATE EXISTING KCS" : actual.includes("CREATE KCS") ? "CREATE KCS" : "";
    const nonKcs=actual.filter(a=>!["CREATE KCS","UPDATE EXISTING KCS"].includes(a));
    const originalPrimaryResolved=originalPrimary==="CREATE KCS" && finalKcs ? finalKcs : originalPrimary==="UPDATE EXISTING KCS" && finalKcs ? finalKcs : originalPrimary;
    let primary=actual.includes(originalPrimaryResolved) ? originalPrimaryResolved : "";
    if(!primary && nonKcs.includes(originalPrimary)) primary=originalPrimary;
    if(!primary) primary=finalKcs || (actual.includes(originalSecondary)?originalSecondary:"") || actual[0];
    let secondary="NONE";
    if(primary && !["CREATE KCS","UPDATE EXISTING KCS"].includes(primary) && finalKcs) secondary=finalKcs;
    else {
      const preferredNonKcs=nonKcs.find(a=>a===originalSecondary) || nonKcs.find(a=>a!==primary);
      if(preferredNonKcs) secondary=preferredNonKcs;
      else if(finalKcs && finalKcs!==primary) secondary=finalKcs;
    }
    job.knowledgeAction=primary;
    job.secondaryKnowledgeAction=secondary;
    return job;
  }

  function enforceKnowledgePortfolioPolicy(job) {
    if (!job || job.directKnowledgeOnly) return;
    let primary = cleanText(job.knowledgeAction || "");
    let secondary = cleanText(job.secondaryKnowledgeAction || "");
    const p = normalizeDecision(primary);
    const s2 = normalizeDecision(secondary);
    const terminal = /^(NO KNOWLEDGE ACTION|NOT APPLICABLE|N\/A|UNDETERMINED)$/;
    if (terminal.test(p)) return;

    const adminAllowed = adminTechGuideNeedIsStrong(job);
    if (p === "UPDATE ADMIN/TECH GUIDE" && !adminAllowed) {
      // Audit-led routing must not silently transform an unsupported Admin/Tech
      // recommendation into a KCS. Promote an independently justified secondary
      // action when one exists; otherwise stop automatic generation for review.
      if (secondary && !terminal.test(s2) && s2 !== "UPDATE ADMIN/TECH GUIDE") {
        primary = secondary;
        secondary = "NONE";
      } else {
        primary = "UNDETERMINED";
        secondary = "NONE";
        job.artifactReadiness = "NOT READY";
        job.knowledgeDecisionExplanation = cleanText(job.knowledgeDecisionExplanation || "") || "Admin/Tech Guide update was recommended without enough maintained-documentation gap evidence to identify an actionable target.";
      }
    }
    if (normalizeDecision(secondary) === "UPDATE ADMIN/TECH GUIDE" && !adminAllowed) secondary = "NONE";

    job.knowledgeAction = primary;
    job.secondaryKnowledgeAction = secondary || "NONE";
    job.adminTechGuideSuppressed = !adminAllowed && (p === "UPDATE ADMIN/TECH GUIDE" || s2 === "UPDATE ADMIN/TECH GUIDE");
  }

  function normalizeArtifactReadiness(action, raw) {
    const a = normalizeDecision(action);
    let r = normalizeDecision(raw);

    // Normalize alternate saved/session Case Chat readiness labels.
    if (r === "KCS READY") r = "READY";
    if (r === "KCS DRAFTABLE") r = "DRAFTABLE";
    if (r === "NOT KCS READY") r = "NOT READY";

    if (a === "NO KNOWLEDGE ACTION") return "NOT APPLICABLE";
    if (["READY", "DRAFTABLE", "NOT READY", "NOT APPLICABLE"].includes(r)) return r;
    return a && a !== "UNDETERMINED" ? "DRAFTABLE" : "NOT APPLICABLE";
  }

  function knowledgeArtifactTypeFromAction(action, readiness = "READY") {
    const a = normalizeDecision(action);
    const r = normalizeDecision(readiness);
    if (!["READY", "DRAFTABLE"].includes(r)) return "";
    if (a === "CREATE KCS") return "KCS_DRAFT";
    if (a === "UPDATE EXISTING KCS") return "KCS_UPDATE";
    if (a === "UPDATE ADMIN/TECH GUIDE") return "DOC_UPDATE";
    if (a === "CREATE/UPDATE RUNBOOK") return "RUNBOOK";
    if (a === "KNOWN ISSUE/RELEASE NOTE") return "KNOWN_ISSUE";
    return "";
  }

  function knowledgeArtifactType(job) {
    return knowledgeArtifactTypeFromAction(job?.knowledgeAction, job?.artifactReadiness);
  }

  function knowledgeArtifactRequests(job) {
    const readiness = normalizeDecision(job?.artifactReadiness);
    if (!["READY", "DRAFTABLE"].includes(readiness)) return [];

    if (job?.directKnowledgeOnly) {
      return [{role:"primary", action:"CREATE KCS", type:"KCS_DRAFT", readiness}];
    }

    const requests = [];
    const add = (role, action) => {
      const cleanAction = cleanText(action || "");
      if (!cleanAction || /^(NONE|NO KNOWLEDGE ACTION|NOT APPLICABLE|N\/A|UNDETERMINED)$/i.test(cleanAction)) return;
      const type = knowledgeArtifactTypeFromAction(cleanAction, readiness);
      if (!type) return;
      if (requests.some(x => x.type === type && normalizeDecision(x.action) === normalizeDecision(cleanAction))) return;
      requests.push({role, action:cleanAction, type, readiness});
    };

    add("primary", job?.knowledgeAction);
    add("secondary", job?.secondaryKnowledgeAction);

    // Execute exactly the artifact destinations selected by the validated Audit,
    // in Primary -> Secondary order. Do not inject a hidden companion KCS here.
    // Direct Generate KCS remains intentionally KCS-family-only above.
    return requests;
  }

  // Audit-led retrospective routing is authoritative. The old numeric reference/claim
  // overlap heuristic was removed because it could silently convert CREATE KCS to UPDATE.
  // Direct Generate KCS still reconciles CREATE-vs-UPDATE only when the generated
  // content explicitly returns an Existing KCS Update Proposal after content inspection.

  function effectiveKcsArtifactType(answer, currentType = "KCS_DRAFT") {
    if (!(currentType === "KCS_DRAFT" || currentType === "KCS_UPDATE")) return currentType;
    const text = String(answer || "");
    const update = /(?:^|\n)#\s*(?:Existing\s+)?KCS Update Proposal\b|(?:^|\n)##\s+Existing Knowledge Reference\b|EFFECTIVE_KNOWLEDGE_ACTION:\s*UPDATE EXISTING KCS/i.test(text);
    return update ? "KCS_UPDATE" : currentType;
  }

  function applyEffectiveKcsArtifactType(job, answer, updateProgress = null) {
    if (!job) return;
    const next = effectiveKcsArtifactType(answer, job.knowledgeArtifactType || "KCS_DRAFT");
    if (next === "KCS_UPDATE" && job.knowledgeArtifactType !== "KCS_UPDATE") {
      if (!job.directKnowledgeOnly) {
        job.knowledgeRoutingConflict = "Generated Knowledge suggested UPDATE EXISTING KCS while the validated Audit selected CREATE KCS. Audit route retained; review the overlap and rerun Audit if the routing decision itself must change.";
        updateProgress?.("existing KCS overlap suggested · Audit CREATE route retained for review");
        return;
      }
      job.existingKcsRecommendedAction = "UPDATE EXISTING KCS";
      if (job.forceCreateNewKcs) {
        job.existingKcsReviewerOverride = true;
        updateProgress?.("existing KCS update recommendation detected · keeping reviewer-selected separate new KCS");
        return;
      }
      job.knowledgeArtifactType = "KCS_UPDATE";
      job.knowledgeAction = "UPDATE EXISTING KCS";
      job.existingKcsReviewerOverride = false;
      updateProgress?.("existing KCS content match found · direct KCS update proposal");
    }
  }

  function validateAuditLedKnowledgeRoute(job, request, answer) {
    if (!job || job.directKnowledgeOnly) return {valid:true};
    const requestedType = request?.type || job.knowledgeArtifactType || knowledgeArtifactType(job);
    if (requestedType === "KCS_DRAFT" && effectiveKcsArtifactType(answer, "KCS_DRAFT") === "KCS_UPDATE") {
      return {valid:false, reason:"Audit-selected CREATE KCS route was replaced by an Existing KCS Update Proposal during Knowledge generation. Retain the Audit route and flag overlap for review instead of silently rerouting downstream."};
    }
    return {valid:true};
  }

  function applyRouteValidationToParsed(parsed, job, request) {
    if (!parsed?.valid) return parsed;
    const route = validateAuditLedKnowledgeRoute(job, request, parsed.artifact || "");
    if (route.valid) return parsed;
    return {...parsed, valid:false, reason:route.reason, issues:[...(parsed.issues || []), route.reason]};
  }

  function relatedExistingKcsRefs(artifact) {
    const refs = parseKnowledgeSourceReferences(String(artifact || ""));
    return [...refs.entries()]
      .filter(([,ref]) => /Salesforce Knowledge|\bKCS\b/i.test(knowledgeSourceProvenance(ref)))
      .map(([key,ref]) => ({key, identity:cleanText(ref?.identity || key)}))
      .filter(x => x.identity)
      .slice(0,3);
  }

  function ensureReviewerChosenNewKcsReference(job, artifact, type) {
    if (!job?.forceCreateNewKcs || type !== "KCS_DRAFT") return String(artifact || "");
    let text = String(artifact || "");
    if (/^##\s+Related Existing Knowledge\s*$/im.test(text)) return text;

    const refs = relatedExistingKcsRefs(text);
    const fallback = cleanText(job.existingKcsCandidate || "");
    const rows = refs.length
      ? refs.map(x => `- ${x.identity} [${x.key}]`)
      : fallback ? [`- ${fallback}`] : [];
    if (!rows.length) return text;

    const section = `## Related Existing Knowledge\n${rows.join("\n")}\n\nA related Salesforce KCS was identified during duplicate/overlap review. Updating the existing article remains the default recommendation when the scopes materially overlap; this draft is being kept as a separate new KCS by reviewer choice. Before publication, confirm that the separate article has a distinct scope and does not conflict with or unnecessarily duplicate the existing KCS.`;

    const sourceIndex = text.search(/\n##\s+Source References\s*(?:\n|$)/i);
    if (sourceIndex >= 0) {
      text = `${text.slice(0, sourceIndex).trimEnd()}\n\n${section}\n${text.slice(sourceIndex)}`;
    } else {
      text = `${text.trim()}\n\n${section}`;
    }
    return text.replace(/\n{3,}/g,"\n\n").trim();
  }

  function existingKnowledgeDecisionDetails(job, artifact, type) {
    if (!(type === "KCS_DRAFT" || type === "KCS_UPDATE")) return null;
    const refs = relatedExistingKcsRefs(artifact);
    const existing = refs.map(x=>x.identity).filter(Boolean);
    if (!existing.length && cleanText(job?.existingKcsCandidate || "")) existing.push(cleanText(job.existingKcsCandidate));

    if (job?.forceCreateNewKcs || job?.existingKcsReviewerOverride) {
      return {
        recommendation: "UPDATE EXISTING KCS",
        decision: "CREATE NEW KCS ANYWAY",
        reason: cleanText(job?.existingKcsRecommendationSummary || "") || "A substantially overlapping existing Salesforce KCS was identified, but the reviewer chose a separate new article.",
        existing
      };
    }
    if (type === "KCS_UPDATE") {
      return {
        recommendation: "UPDATE EXISTING KCS",
        decision: "UPDATE EXISTING KCS",
        reason: cleanText(job?.existingKcsRecommendationSummary || "") || "Existing Salesforce KCS content materially overlaps this issue and can be extended.",
        existing
      };
    }
    return {
      recommendation: "CREATE NEW KCS",
      decision: "CREATE NEW KCS",
      reason: existing.length
        ? "Existing KCS candidates were identified, but substantial content overlap requiring an update was not established from the available evidence."
        : "No substantially matching Salesforce KCS was established from the available evidence.",
      existing
    };
  }

  function existingKnowledgeDecisionHtml(job, artifact, type) {
    const detail = existingKnowledgeDecisionDetails(job, artifact, type);
    if (!detail) return "";
    const existing = detail.existing?.length
      ? `<div><b>Existing / related KCS:</b> ${detail.existing.map(escapeHtml).join(" · ")}</div>`
      : `<div><b>Existing / related KCS:</b> None established from available evidence</div>`;
    return `<div class="xa-at-glance-box" style="border-left-color:#7c3aed;background:#f5f3ff;border-color:#ddd6fe"><div class="xa-at-glance-title" style="color:#6d28d9">Existing Knowledge Decision</div><div class="xa-at-glance-text"><div><b>Recommendation:</b> ${escapeHtml(detail.recommendation)}</div><div><b>Reviewer choice / output:</b> ${escapeHtml(detail.decision)}</div>${existing}<div><b>Reason:</b> ${escapeHtml(detail.reason)}</div></div></div>`;
  }

  function knowledgeArtifactLabel(type) {
    return ({
      KCS_DRAFT: "KCS Draft",
      KCS_UPDATE: "KCS Update Proposal",
      DOC_UPDATE: "Admin/Tech Guide Update Proposal",
      RUNBOOK: "Runbook Draft",
      KNOWN_ISSUE: "Known Issue / Release Note Draft"
    })[type] || "Knowledge Draft";
  }

  function knowledgeRoleLabel(role) {
    if (role === "secondary") return "Secondary";
    if (role === "companion") return "Companion";
    return "Primary";
  }

  function knowledgeQualityRubric(type) {
    const common = `
GENERIC QUALITY RUBRIC — APPLY TO EVERY PRODUCT AND ISSUE
Evaluate the artifact as a reusable knowledge asset, not as a rewrite of one case.

1. Accuracy
- Keep factual/operational claims only when supported by an underlying source available in this Case Chat/TACO context.
- Distinguish confirmed fact from inference/assumption.
- Never convert a case-specific observation into universal product behavior without supporting evidence.

2. Usefulness
- The next intended reader should be able to understand the symptom/behavior and know what to check or do.
- Add useful context when it materially improves diagnosis, resolution, prevention, or understanding.

3. Completeness
- Include the sections appropriate to the artifact type.
- Do not manufacture content merely to fill a heading. Omit or explicitly mark validation when evidence is insufficient.

4. Actionability
- Prefer specific, ordered checks/steps when supported.
- Explain what a result means and what the next action is.

5. Generalization
- Remove customer names, tenant-specific identifiers, hostnames, one-off timestamps, and case-only detail unless required as a clearly labeled example.
- Keep XSUP/SFDC IDs in provenance/source sections, not in reusable search keywords or the article title.

6. Technical depth
- Useful commands, API routes, UI paths, versions, configuration values, log names, timing, architecture and remediation are welcome ONLY when supported by an underlying source.
- If a material operational detail cannot be verified, omit it or mark it TAC/SME validation required.

7. Source quality and relevance
- Prefer authoritative/approved product documentation and directly relevant Engineering/Jira evidence.
- Existing KCS/internal documentation and validated prior cases may supplement.
- Do not dump every TACO citation. Include only sources that materially support the final artifact.
- TACO/Case Chat is the discovery/synthesis mechanism, not the underlying source.

8. Consistency
- The body, validation section and readiness must agree.
- READY means no material validation item remains.
- DRAFTABLE means the draft is useful but one or more material validation items remain.
- NOT READY means the available evidence cannot support a safe/useful draft.

9. Readability
- Use concise headings, lists/tables/code blocks where they improve comprehension.
- Ensure code examples render as fenced Markdown code blocks.
- Avoid duplicated, contradictory or unnecessarily verbose sections.

10. Discoverability
- Use a searchable symptom/error-first title where appropriate.
- Include useful error strings, status values, product concepts and terminology in keywords.
- Do not use the originating XSUP/SFDC ID as a search keyword.

11. Existing-knowledge awareness
- If a relevant existing KCS/doc already covers the issue, prefer an update proposal over duplicate content.
- State what existing knowledge covers and what material gap remains.

12. Audience fit
- Match the language and detail to the artifact type and intended reader.

13. Verification
- Explain how to confirm the diagnosis and how to verify the resolution/expected outcome when evidence supports it.

14. Publication boundary
- This is a draft/proposal. Do not say content is approved or already published.
- Use language such as "draft for review", "recommended update", or "publication after validation" where needed.

15. Source freshness and current applicability
- Historical support cases, older KCS articles, Confluence/runbook pages, Jira/XSUP findings and web material can be version-specific, superseded or obsolete. Do not assume that an older source still describes current behavior.
- For every material claim that relies on historical, version-specific, existing-KCS, prior-case, Jira/Engineering, Confluence/runbook or externally researched evidence, actively check whether a current maintained source confirms the SAME mechanism/scope for the current supported release. If currentness cannot be established, keep useful evidence but create a SEPARATE inline REVIEW CURRENTNESS item for each affected source/claim. Do not group multiple unrelated sources into one generic review item.
- Older does NOT automatically mean wrong. Mark it as currentness-unconfirmed unless superseded/deprecated/contradicted is actually established. Distinguish source age from technical validity.
- Current maintained product documentation should be preferred when it directly addresses the same claim. Historical evidence can remain as supporting context when useful.

16. Conflicts and anti-circularity
- Detect disagreements between sources instead of silently choosing one. A conflict may involve timing, version/platform scope, commands, API behavior, UI paths, cause, workaround, limitation, expected behavior, architectural detail or operational interpretation.
- When sources conflict, create an explicit REVIEW or BLOCKER item and populate Conflict=<concise description>. State what disagrees, why it matters, the sources involved and the required outcome. Do not hide a conflict inside a generic validation item.
- Resolve conflicts against current maintained documentation or current SME/Engineering confirmation. If the conflict cannot be resolved, remove/generalize the disputed public claim while preserving useful sourced Engineering context in Internal Notes when appropriate.
- Repetition is not independent corroboration when multiple cases/KCS/Confluence pages/generated artifacts may derive from the same original source. Trace claims back to the underlying evidence.
- A generated XSUP Auditor/TACopilot/Case Chat artifact is never authoritative evidence by itself and must not be the sole source for a later reusable product claim.
`;

    const artifact = ({
      KCS_DRAFT: `
KCS-SPECIFIC QUALITY — GENERIC / ADAPTIVE ACROSS PRODUCTS
- Build a valid reusable support article for the actual problem type. Do NOT force the same headings for every product/component.
- Use a searchable problem/task-oriented title and a short Introduction / Overview that tells the reader when to use the article and what outcome it provides.
- Choose only the sections that fit the evidence and article type. Common useful roles include: Symptoms / Issue, Applies To / Environment, Background / What It Means, Cause / Explanation, Prerequisites, Diagnosis / How to Check, Resolution / Workaround / Recommended Action, Verification, If the Issue Persists, Expected Behavior / Limitations, When to Escalate, Example / Scenario, Related Knowledge / Documentation, Search Keywords.
- A troubleshooting KCS should normally let a TAC engineer follow: recognize the issue -> understand scope -> diagnose -> interpret results -> act -> verify. A configuration/how-to KCS may use task/prerequisite/procedure/verification instead. A functions-as-designed KCS may emphasize expected behavior and alternatives. A known limitation may emphasize impact/workaround/verification. Omit headings that do not help.
- For each diagnostic/procedure step, explain WHY the step is useful, WHAT the expected result means, and WHAT the next action is when evidence supports that decision guidance. Avoid command dumps with no interpretation.
- Write as a reusable support article, NOT as an RCA/case report. Do not say "According to the root cause analysis", "Engineering found", "this case showed", or similar case-investigation language in the reusable body. State supported behavior directly.
- The KCS must be independently usable even when an Admin/Tech Guide, Runbook, Known Issue or Release Note is also recommended. Include enough supported detail to diagnose and resolve/handle the issue without requiring the reader to open the companion proposal first.
- Cross-reference relevant maintained Admin/Tech Guides and product documentation for authoritative architecture/configuration details, but do not omit a critical TAC step merely because the same concept belongs in a slower owner-controlled documentation update.
- Internal Notes are NOT a second References section. Preserve the useful TAC/Engineering context needed for future investigation, including sourced internal implementation detail (for example internal parameters, chunk/worker/job/queue behavior), escalation nuance, diagnostic interpretation, and observed-but-not-guaranteed behavior. Keep it readable and referenced, and keep public-facing guidance separate.
- Do not include authoring/process statements such as why the KCS was created, that it packages knowledge into Salesforce, or instructions to remove a drafting note. Such knowledge-channel/process information belongs in the retrospective/action plan, not the KCS article.
- Do not make escalation the primary resolution.
`,
      KCS_UPDATE: `
KCS UPDATE QUALITY
- Identify the exact existing article by title plus ID/link. If no specific existing KCS can be identified, this is NOT a valid KCS update proposal.
- Clearly separate existing coverage from the new gap.
- State exactly which existing section(s) should be added, replaced, or clarified and provide ready-to-review replacement/addition text.
- Do not rewrite unrelated sections. However, after identifying the precise changes, include a complete merged standalone version of the updated KCS so the reviewer can see exactly how the article should read after the change.
- Improve discoverability when the existing title/keywords would make the issue hard to find.
`,
      DOC_UPDATE: `
ADMIN/TECH GUIDE QUALITY
- Optimize for administrator/customer architectural and operational clarity.
- Use a documentation-update proposal format: target documentation -> documentation gap -> recommended placement -> proposed wording -> concise operational notes/limitations -> validation focus.
- Explain expected behavior, configuration implications and limitations without turning the proposal into a case RCA.
- Operational commands/UI/API paths, field names, version scope and exact timing must be sourced; otherwise omit or mark them for explicit documentation-owner validation.
- Proposed text should be suitable for a documentation owner to review without customer-specific or internal-backend clutter.
`,
      RUNBOOK: `
RUNBOOK QUALITY
- Optimize for repeatable TAC execution.
- Use ordered steps, prerequisites, evidence interpretation and decision points.
- Each step should say what to inspect/do and how the result changes the next step.
- Avoid unsupported commands or internal-only assumptions.
`,
      KNOWN_ISSUE: `
KNOWN ISSUE / RELEASE NOTE QUALITY
- Clearly state affected scope, observable symptoms, impact, cause/limitation, workaround/fix and verification when known.
- Version/release/fix-status statements must be explicitly sourced.
- Do not imply a defect/fix release when the evidence only establishes expected behavior or an unverified hypothesis.
`
    })[type] || "";

    return `${common}\n${artifact}`.trim();
  }

  function buildKnowledgePrompt(job) {
    const type = knowledgeArtifactType(job);
    const label = knowledgeArtifactLabel(type);

    const common = `
KNOWLEDGE ENRICHMENT + DRAFT GENERATION

Target XSUP: ${job.xsup}
SFDC: ${job.caseNumber}
Product: ${productLabel(job)}
Requested Artifact: ${label}
This Artifact Action: ${job.knowledgeAction || "UNDETERMINED"}
Knowledge Portfolio Primary: ${job.knowledgePortfolioPrimaryAction || job.knowledgeAction || "UNDETERMINED"}
Knowledge Portfolio Secondary: ${job.knowledgePortfolioSecondaryAction || "NONE"}
Initial Artifact Readiness: ${job.artifactReadiness || "NOT APPLICABLE"}

PURPOSE
Create a high-quality reusable DRAFT for later human review.
Do not merely restate the retrospective.

STARTING CASE BASIS
${job.auditAnswer}
${sharedKnowledgeEvidencePromptContext(job)}
KNOWLEDGE ENRICHMENT
Before drafting, inspect the knowledge/reference material actually available to this Case Chat/TACO investigation and use it to improve the artifact when useful.

Useful source types can include:
- authoritative/approved product documentation
- relevant KCS/internal knowledge
- relevant Confluence/admin/technical guides
- directly relevant Jira/Engineering evidence
- validated similar Salesforce cases
- known-issue/release-note material

IMPORTANT SOURCE RULES
- Assign stable source IDs R1, R2, R3... and place [R#] immediately after each material technical claim.
- Source References must map every used R# to a clear source identity and a DIRECT clickable link whenever that source URL is available to Case Chat. The reviewer should not have to search manually for a referenced Jira, SFDC case, Confluence page, KCS, Admin/Tech Guide, API guide, or product-documentation page.
- If you name a specific source anywhere in the artifact, include its direct URL in its canonical R# Source References entry when available. If the source is relevant but no direct URL is available in the evidence, state "Direct link not available in current evidence" instead of fabricating one.
- In the Source References section, create exactly ONE entry per source ID using this single-line format when the information is available: - [R1] <source identity/title + direct link> | Provenance: <Official product documentation (web) / Internal Jira-Engineering / Internal Confluence-Runbook / Salesforce Support Case / Salesforce Knowledge-KCS / External web research / other accurate label> | Freshness: <current/maintained, historical, version/date if known, superseded if explicitly established, or currentness not established> | Supports: <1-3 concise claims this source supports> | Evidence: <one concise source excerpt or faithful source-derived summary>. Do not bold the R# token. Do not reuse one R# for different sources.
- If information comes from an internet/web search, KEEP the useful detail but label its provenance explicitly. Official Palo Alto Networks documentation should be labeled "Official product documentation (web)"; other internet sources should be labeled "External web research" and must retain the direct URL.
- AI/TACO/Case Chat synthesis is NOT an authoritative source. If AI-assisted reasoning adds a useful explanation, hypothesis, comparison or wording that is not directly grounded in an underlying source, keep it only in Internal Notes and label it "AI-assisted synthesis — validation required". Never silently present AI synthesis as a confirmed product fact.
- For Jira/SFDC/case sources, the Evidence field should surface the specific relevant evidence so a reviewer does not have to read the entire case merely to understand why the source is cited. Do not expose unrelated customer-sensitive details.
- Every R# used in the article body must have exactly one matching Source References entry. Multiple claims may reuse that same R# when they rely on the same source.
- TACO/Case Chat may discover or synthesize evidence but must NOT satisfy an authoritative citation requirement by itself. Map material claims to original Jira/Engineering, original SFDC, official docs, approved knowledge/internal docs, or validated prior cases.
- Do not create a source entry named only "Investigation Report", "Root Cause Analysis", "Case Data", "TACO", or "Case Chat" unless it is a distinct stored original source with its own direct provenance/link. Prefer the underlying Jira/SFDC/documentation sources instead.
- Do not claim that a source was searched/read unless it is actually available to this Case Chat/TACO context.
- Every factual addition that is not already established in the retrospective must be traceable to an underlying source.
- Cite the underlying document/case/Jira/reference, not "TACO" or "Case Chat" as the source.
- Search absence is not proof that no documentation exists.
- Prefer directly relevant, authoritative sources. Do not add loosely related references just to make the article look comprehensive.
- If existing knowledge substantially covers the issue, compare scope carefully. In dedicated Generate KCS, prefer an update proposal when actual content overlap supports it. In Audit-led generation, preserve the Audit-selected destination and flag any newly discovered routing conflict for reviewer/Audit reconsideration instead of silently changing artifact type.
- If a source is historical, old, version-specific, or its current maintenance status is unknown, do not discard it automatically. State the freshness/applicability concern clearly and create a material REVIEW item when that source supports an important reusable claim.
- Check whether older KCS, Confluence/runbook, Jira/XSUP and Salesforce-case information has been superseded or invalidated by current product documentation or newer Engineering guidance.
- Do not treat the same statement repeated across cases, KCS, Confluence, generated artifacts or AI summaries as independent confirmation until the underlying sources are traced.
- Generated XSUP Auditor/TACopilot/Case Chat drafts may be used only as discovery/index material. Never cite a generated derivative as the sole authority; follow it back to the original Jira/SFDC/documentation/KCS/Engineering source.
- If sources materially conflict, preserve the conflict as an inline REVIEW/BLOCKER at the affected claim/reference rather than silently selecting one answer. Resolve against current maintained documentation or current SME/Engineering confirmation. If unresolved, generalize/remove the disputed claim.

GENERALIZATION + SAFETY
- Generalize the reusable technical pattern across customers.
- Do not expose customer-specific names, tenant IDs, hostnames or confidential one-off data unless absolutely necessary as a labeled example.
- Never invent product versions, supported platforms, event IDs, commands, registry/config paths, exclusion paths, UI navigation, API routes/payloads, process paths, workarounds, expected values, service names, return codes, exact timings, architecture behavior or remediation.
- If a useful material detail cannot be established, omit it or mark it "TAC/SME validation required".
- Do not turn an inference or plausible troubleshooting idea into a confirmed fact/fix.
- Do not include internal reuse metadata such as ${REUSE_META_PREFIX}.
- Do not include unresolved placeholders.
- This is a draft/proposal. Do not say it is approved or already published.

COMPLETE CONTEXT + INTERNAL NOTES
- Preserve useful TAC/Engineering-only context without polluting a customer-facing/public article. Apply this rule to KCS drafts/updates, Admin/Tech Guide proposals, Runbooks, Known Issue/Release Note drafts and future artifact types.
- Internal Notes answer one question only: "What important additional information does TAC/SME/Engineering need to know that should not appear in the reusable public-facing body?"
- Internal Notes are NOT a source catalog and not a duplicate inline-review inventory. Full provenance/link bookkeeping belongs in Source References; publication-validation tasks belong directly beside the affected claim/reference as inline review callouts.
- Internal Notes MAY be detailed and substantial when Engineering evidence is valuable. Preserve sourced implementation details such as internal parameter/config names, chunk/batch sizes, worker allocation, calculation-job behavior/cadence, queue/processing stages, backend component names, internal database/API observations, diagnostic interpretation, tuning attempts and what they changed or did not change, escalation boundaries, and other Engineering-only findings that would help future TAC/SME investigation.
- Keep exact internal names/values when they are actually present in the underlying Engineering/internal evidence. Do not generalize away useful Engineering detail merely because it is not suitable for customers; move it to Internal Notes instead.
- Explain Engineering details in normal user-friendly language: what Engineering examined/established, what the detail means operationally, and how TAC should use it. Add [R#] naturally to the relevant sentence/paragraph. Do not repeat source metadata that already exists in Source References.
- Customer-specific identifiers/secrets should still be generalized unless they are necessary for traceability and appropriate for TAC Internal Notes.
- A sourced internal detail can be preserved in Internal Notes even if current-release applicability still needs validation; when material, also create a Review item asking whether it is still valid/superseded. Clearly distinguish an observed/internal implementation detail from a supported public guarantee.
- Do NOT preserve unsupported AI/legacy speculation merely because it appeared in an older draft. Unsupported AI ideas should normally be omitted; if unusually useful as a hypothesis, label them as a hypothesis requiring validation and keep them out of public guidance.
- Write Internal Notes in readable topic-based prose/bullets. Do NOT use repetitive field labels such as "What TAC should know", "Why it matters", "Reference", or "Use / Caution".
- If web research contributes a useful TAC-only detail, label the source in Source References as Official product documentation (web) or External web research and retain the direct link.
- The local finalizer always adds Origin / Traceability with the originating XSUP/SFDC (when available), Auditor version and generation date. Do not duplicate the full source inventory around it.

${knowledgeQualityRubric(type)}
`;

    if (type === "KCS_DRAFT") {
      const reviewerKcsChoice = job.forceCreateNewKcs
        ? `
REVIEWER CHOICE — CREATE A SEPARATE NEW KCS
- A substantially overlapping existing Salesforce KCS was already identified and UPDATE EXISTING KCS remains the default recommendation.
- The reviewer explicitly chose to create a separate NEW KCS anyway. Honor that choice: return a NEW KCS, not an Existing KCS Update Proposal.
- Keep the existing KCS visible in a "Related Existing Knowledge" section and cite the canonical Salesforce KCS source with [R#].
- Explain the distinct scope/focus of the new article in reusable terms. Do not invent a distinction merely to justify duplication.
- Before publication, require review that the new article does not conflict with or unnecessarily duplicate the existing KCS.
- Related candidate from the prior decision when available: ${cleanText(job.existingKcsCandidate || "See Salesforce KCS references in the available evidence.")}
`
        : job.directKnowledgeOnly
          ? `
DIRECT GENERATE KCS — EXISTING-KCS DECISION
- This user-invoked flow intentionally bypasses retrospective Audit routing. Inspect actual existing Salesforce KCS content and choose CREATE vs UPDATE from content overlap.
- If actual existing Salesforce KCS content substantially overlaps this issue and can be extended, return the Existing KCS Update Proposal structure below.
- Do not choose UPDATE from title/keyword similarity alone; compare symptom/task, cause/meaning, checks/procedure, resolution/workaround/action and verification.
`
          : `
AUDIT-LED ROUTING LOCK
- The validated retrospective Audit already selected CREATE KCS and that Audit has already been delivered to the reviewer. Preserve that artifact route.
- Do NOT convert this downstream artifact into an Existing KCS Update Proposal.
- If additional Salesforce KCS content discovered during drafting appears substantially overlapping, keep the requested NEW KCS draft, reference the related KCS when useful, and describe the potential duplicate/scope conflict for quality review. Change the route only by rerunning/reviewing the Audit.
- Existing KCS candidate from the Audit when available: ${cleanText(job.existingKcsCandidate || "None established by the Audit")}
`;

      return `${common}
${reviewerKcsChoice}

STANDALONE KCS REQUIREMENT
- Generate a KCS-family deliverable even when the portfolio also recommends an Admin/Tech Guide, Runbook, Known Issue or Release Note. Those owner-controlled artifacts can take longer to review; the KCS must be independently usable by TAC in the meantime.
- Do NOT assume the reader has the companion Admin Guide/Runbook proposal. Include the reusable symptom, explanation/cause, checks, supported workaround/fix, verification, limitations and decision guidance needed to use the KCS on its own.
- Inspect and cite the relevant existing Admin/Tech Guide pages, approved product documentation, Salesforce KCS articles, Confluence/internal technical guides, validated prior cases and API/CLI documentation actually available to this Case Chat. Material claims should cite the underlying maintained source, not the generated companion proposal.
- When several relevant maintained guides are available, include each one that materially supports or constrains the KCS, with direct links in Source References. Do not add unrelated references merely to increase citation count.
- If a clear internal Confluence/runbook source already contains the technical answer, explicitly identify it as existing source knowledge. CREATE KCS remains valid when the real gap is Salesforce discoverability/distribution or potential customer externalization. Do not mislabel that situation as "no knowledge exists".
- A Confluence page or internal runbook is NOT automatically an existing Salesforce KCS. Only switch to UPDATE EXISTING KCS after inspecting the actual content of a specific Salesforce KCS candidate.
- Do NOT add a "Knowledge Reuse Basis", "Internal Drafting Note", channel/distribution explanation, or other authoring-process section to the KCS article. Existing knowledge sources belong in References; useful TAC-only context belongs in Internal Notes; the retrospective/action plan explains why CREATE/UPDATE KCS was recommended.
- Do not claim broad platform/version applicability when the sourced workaround is platform-specific. Scope the article to supported evidence or mark cross-platform applicability for validation.
- Do not include exact API routes, XQL fields, CLI commands, UI paths or timing promises unless the supporting source and direct link are present; otherwise generalize or mark the exact detail for validation.

${job.directKnowledgeOnly ? `Before creating a NEW KCS, inspect the actual content of any existing Salesforce KCS candidates available to this Case Chat. Compare symptom/task, cause/meaning, checks/procedure, resolution/workaround/action and verification. Unless the explicit reviewer override above is active, if one existing KCS materially covers the same issue and can be extended, return an Existing KCS Update Proposal and identify the exact article by title + ID/link. If candidate content is unavailable, do not guess an update target: create the new KCS draft and add an inline REVIEW stating that existing-KCS coverage could not be content-validated. When the reviewer override is active, create the separate new KCS and preserve the overlapping existing KCS as Related Existing Knowledge with an [R#] reference.

If content-based reuse is justified in this DIRECT Generate KCS flow, return exactly this update structure instead of a new article:` : `For this AUDIT-LED CREATE KCS flow, the update structure below is reference-only and MUST NOT be selected downstream. If late evidence suggests an existing-KCS update may be better, keep the NEW KCS structure and flag the routing conflict for reviewer/Audit reconsideration. Do not silently rewrite the delivered Audit decision.`}
# Existing KCS Update Proposal
## At a Glance
## Existing Knowledge Reference
[exact title + ID/link]
## Current Coverage
[what the existing article already says, based on its content]
## Gap Identified
[what this case adds]
## Sections to Update
[ADD / REPLACE / CLARIFY + exact section/placement]
## Proposed Additions / Changes
[ready-to-review change summary]
## Proposed Updated KCS — Standalone Article Draft
[REQUIRED: complete merged KCS article as it should read after the update, with claim-level R# references]
## Troubleshooting / Verification Improvements
[only if useful]
## Source References
[claim-level R# mappings with Supports/Evidence]
## TAC/SME Validation Items
[items or None identified]

Otherwise return a NEW KCS using the adaptive structure below. Choose headings that fit the actual issue. Do not create empty or artificial sections.

# [Searchable problem / symptom / task title]

## At a Glance
[2–3 concise sentences: what this article helps with, the key supported explanation/outcome, and the recommended path]

## Introduction / Overview
[normal KCS article introduction: when to use this article, what problem/task it addresses, and what the reader will be able to determine or do. Do not include authoring/process metadata.]

## Related Existing Knowledge
[include this section when an existing/related Salesforce KCS was found. Name/cite the exact existing KCS with [R#]. If a separate new KCS is being created by reviewer choice despite substantial overlap, make the relationship and distinct scope clear and require publication review for duplication/conflict.]

## Symptoms / Issue
[use for troubleshooting/behavior articles: observable symptoms, errors, status, impact. For pure how-to/configuration articles, use an appropriate heading such as Task / Goal instead.]

## Applies To / Environment
[product/component/platform/version/configuration only when established. Omit unsupported scope.]

## Background / What This Means
[optional concise context that helps the reader understand the behavior. Omit if Cause / Explanation already covers it.]

## Cause / Explanation
[evidence-backed cause, expected behavior, configuration reason, limitation, or "Cause not established" when appropriate. Use a heading such as Expected Behavior when that is clearer.]

## Prerequisites / Before You Begin
[optional; permissions, access, supported scope, backup/maintenance prerequisites only when needed and sourced.]

## Diagnosis / How to Check
[ordered checks that are actually useful. For each material check, explain: what to do, why the check matters, how to interpret the result, and the next step/branch when supported. For a how-to article, use Procedure / Steps instead.]

## Resolution / Workaround / Recommended Action
[choose the heading that matches the evidence. Give actionable, supported steps/alternatives and decision guidance. Do not imply a guaranteed result/timing unless sourced.]

## Verification / Expected Outcome
[how the reader confirms success or confirms the expected behavior; explain what a good result looks like.]

## If the Issue Persists / Additional Troubleshooting
[optional; only repeatable, evidence-backed next steps. If escalation is appropriate, state when and what evidence to collect.]

## Expected Behavior / Limitations / Important Notes
[optional design boundaries, known limitations, side effects, unsupported scenarios, timing caveats, or safety notes.]

## Related Knowledge / Documentation
[optional short reader-facing list of directly useful maintained KCS/docs. Full evidence bookkeeping still belongs in Source References.]

## Example / Scenario
[optional generalized example only when it materially clarifies the workflow]

## Search Keywords
[search terms/error strings/component names/alternate terminology; do not include XSUP/SFDC IDs]

## Internal Notes — TAC Only
[OPTIONAL additional TAC/SME guidance only. The local finalizer adds Origin / Traceability automatically. Include only context that materially changes Support interpretation, troubleshooting, decision-making or escalation, with [R#] inline when available. Do not use What TAC should know / Why it matters / Reference / Use-Caution labels and do not preserve legacy/unvalidated debris merely for completeness.]

## Source References
[canonical evidence catalog. For every source include identity/title, direct link when available, source type/provenance, what it supports in this artifact, and a concise source-derived evidence summary when preserved. If evidence text was not preserved, say so rather than inventing it.]

## TAC/SME Validation Items
[only material unresolved publication/use issues. For each item state WHAT must be verified, WHY it matters, REQUIRED OUTCOME, OWNER when useful, and supporting R# references when available; or "None identified"]
`.trim();
    }

    if (type === "KCS_UPDATE") {
      return `${common}

Return the draft in this structure:

# Existing KCS Update Proposal

## At a Glance
[2–3 concise sentences: problem/situation, key finding, and what the reader should do or gain]

**Draft Status:** DRAFT — REVIEW REQUIRED
**Generated From:** ${job.xsup}

## Existing Knowledge Reference
[REQUIRED: exact existing KCS title + ID/link. If no specific KCS is actually identified, do not pretend this is an update proposal.]

## Current Coverage
[what that exact KCS already covers]

## Gap Identified
[material missing/unclear content]

## Sections to Update
[exact existing section names or placement; state ADD / REPLACE / CLARIFY]

## Proposed Additions / Changes
[ready-to-review replacement/addition text mapped to the sections above]

## Proposed Updated KCS — Standalone Article Draft
[REQUIRED: complete merged KCS article as it should read after the update using the same adaptive KCS principles as a new article: clear Introduction/Overview, only relevant topic headings, decision-oriented checks/procedure, action/resolution, verification/outcome, optional limitations/escalation/related knowledge, concise TAC-only Internal Notes when needed, and claim-level R# references. Do not return only delta notes.]

## Troubleshooting / Verification Improvements
[useful improvements if applicable]

## Search / Discoverability Improvements
[title/keywords/tags if useful]

## Internal Notes — TAC Only
[optional concise TAC/SME-only guidance that materially changes Support interpretation/troubleshooting/escalation. Write normal prose with inline [R#] when available; do not duplicate the source catalog or preserve unvalidated legacy details merely for completeness. Omit if none.]

## Source References
[direct supporting source IDs/titles/links]

## TAC/SME Validation Items
[material items requiring validation, or "None identified"]
`.trim();
    }

    if (type === "DOC_UPDATE") {
      return `${common}

Return the draft in this structure:

# Admin / Tech Guide Update Proposal

## At a Glance
[2–3 concise sentences: problem/situation, key finding, and what the reader should do or gain]

**Draft Status:** DRAFT — DOCUMENTATION OWNER REVIEW REQUIRED
**Generated From:** ${job.xsup}

## Target Documentation
[existing page/guide if actually identified; otherwise recommended documentation area]

## Intended Audience
[administrator/customer/TAC/other relevant audience]

## Documentation Gap
[what expected behavior/configuration/architecture/limitation is missing or unclear]

## Recommended Section / Placement
[where it belongs]

## Proposed Documentation Text
[concise ready-to-review content]

## Operational / Implementation Notes
[only evidence-backed details that materially help; omit if not useful]

## Expected Behavior / Limitations
[important boundaries/expectations when relevant]

## Example / Note
[generalized example only if useful]

## Internal Notes — TAC Only
[optional concise TAC/SME-only guidance that materially changes Support interpretation/troubleshooting/escalation. Write normal prose with inline [R#] when available; do not duplicate the source catalog or preserve unvalidated legacy details merely for completeness. Omit if none.]

## Source References
[direct supporting source IDs/titles/links]

## Validation Items
[material product/version/command/API/UI/timing/placement details requiring validation. For each item state WHAT must be verified and WHY it matters; or "None identified"]
`.trim();
    }

    if (type === "RUNBOOK") {
      return `${common}

Return the draft in this structure:

# TAC Runbook Draft

## At a Glance
[2–3 concise sentences: problem/situation, key finding, and what the reader should do or gain]

**Draft Status:** DRAFT — TAC/SME REVIEW REQUIRED
**Generated From:** ${job.xsup}

## Trigger / When to Use
[symptom/error/situation]

## Objective
[what this workflow helps TAC determine/do]

## Prerequisites
[only established prerequisites]

## Investigation Workflow
[numbered repeatable steps]

## Evidence Interpretation
[what findings mean]

## Decision Points
[if/then branches supported by evidence]

## Expected Outcome
[what TAC should learn/achieve]

## Verification
[how to confirm the result]

## Example
[generalized example if useful]

## Internal Notes — TAC Only
[optional concise TAC/SME-only guidance that materially changes Support interpretation/troubleshooting/escalation. Write normal prose with inline [R#] when available; do not duplicate the source catalog or preserve unvalidated legacy details merely for completeness. Omit if none.]

## Source References
[direct supporting source IDs/titles/links]

## Validation Items
[material details requiring validation, or "None identified"]
`.trim();
    }

    return `${common}

Return the draft in this structure:

# Known Issue / Release Note Draft

## At a Glance
[2–3 concise sentences: problem/situation, key finding, and what the reader should do or gain]

**Draft Status:** DRAFT — PRODUCT/DOCUMENTATION REVIEW REQUIRED
**Generated From:** ${job.xsup}

## Issue
[concise issue]

## Affected Scope
[versions/platforms only when established]

## Symptoms
[observable symptoms/errors]

## Impact
[practical impact when established]

## Cause / Limitation
[evidence-backed cause/limitation]

## Workaround / Resolution
[only when established]

## Verification
[how to confirm]

## Status / Release Information
[only explicitly sourced status/version/fix information; omit if unavailable]

## Proposed Release Note / Known Issue Text
[ready-to-review concise wording]

## Internal Notes — TAC Only
[optional concise TAC/SME-only guidance that materially changes Support interpretation/troubleshooting/escalation. Write normal prose with inline [R#] when available; do not duplicate the source catalog or preserve unvalidated legacy details merely for completeness. Omit if none.]

## Source References
[direct supporting source IDs/titles/links]

## Validation Items
[material details requiring validation, or "None identified"]
`.trim();
  }

  function buildKnowledgeDraftReuseMeta(job) {
    const base = buildKnowledgeReuseMeta(job);
    const fingerprint = stableHashText(JSON.stringify({
      schema: KNOWLEDGE_DRAFT_REUSE_SCHEMA,
      finalFingerprint: base.fingerprint,
      product: base.product,
      audit: base.audit,
      action: base.action,
      artifact: base.artifact,
      readiness: base.readiness,
      workflow: job.directKnowledgeOnly ? "DIRECT_KCS" : "RETROSPECTIVE_KNOWLEDGE",
      reviewerChoice: base.reviewerChoice || "DEFAULT"
    }));

    return {
      ...base,
      type: "knowledge_draft",
      schema: KNOWLEDGE_DRAFT_REUSE_SCHEMA,
      fingerprint
    };
  }

  function buildKnowledgeQualityPrompt(job, draftAnswer) {
    const type = job.knowledgeArtifactType || knowledgeArtifactType(job);
    const label = knowledgeArtifactLabel(type);

    return `
KNOWLEDGE QUALITY REVIEW + FINALIZATION

Target XSUP: ${job.xsup}
SFDC: ${job.caseNumber}
Product: ${productLabel(job)}
Artifact Type: ${label}
Initial Retrospective Readiness: ${job.artifactReadiness || "DRAFTABLE"}

RETROSPECTIVE — AUTHORITATIVE CASE BASIS
${job.auditAnswer}

ENRICHED DRAFT TO REVIEW
${draftAnswer}
${sharedKnowledgeEvidencePromptContext(job)}
TASK
Act as an independent knowledge editor/reviewer.
Produce a polished reusable final DRAFT, not a critique.

You may use additional source material that is actually available to this Case Chat/TACO investigation when it materially improves accuracy or usefulness, but every newly added factual/operational claim must be tied to an underlying source.

${knowledgeQualityRubric(type)}

MANDATORY REVIEW ACTIONS
- Remove or rewrite unsupported/inferred claims.
- Remove unnecessary customer/case-specific details from reusable content.
- Keep only directly relevant references.
- Resolve contradictions between body text, validation items and readiness.
- Perform an explicit freshness/current-applicability pass on historical support cases, older KCS, Confluence/runbook, Jira/XSUP and web sources used for material claims. If currentness cannot be established, create a SEPARATE REVIEW CURRENTNESS item for each affected source/claim with its R# reference; do not group unrelated stale/currentness questions into one generic item. Older does not automatically mean wrong: distinguish currentness-unconfirmed from actually superseded/deprecated/contradicted.
- Do NOT place raw editorial warnings such as \`_Timing note: ..._\`, \`Reviewer note\`, or similar authoring prose inside the reusable article body. Exact observed timing may remain only as clearly observational wording and must be paired with a structured SPECIAL_REVIEW_ITEMS Kind=TIMING_SLA item unless current maintained authority directly establishes that same timing/scope.
- SPECIAL_REVIEW_ITEMS must use a semantic Kind and the exact complete reader-visible Target claim. Kind, Target, What, Why and Outcome must all refer to the same issue.
- Detect source conflicts. For every material conflict, add Conflict=<concise description of the disagreement> to the REVIEW/BLOCKER line, identify the R# sources, and require the reviewer to resolve it against current maintained documentation or current SME/Engineering confirmation.
- Do not count repeated derivative statements as independent corroboration. Trace generated/AI/Case Chat summaries back to original sources. A generated artifact cannot be the sole authority for a reusable product claim.
- Remove internal metadata/placeholders.
- Do not flag a heading, list introduction, or structural label as uncited when the immediately following substantive child bullets/paragraphs carry the needed authoritative [R#] citations.
- A special REVIEW/BLOCKER item must be actionable: exact Target when possible, What to review/resolve, Why it matters, Owner when useful, and authoritative R# references when available.
- Never create a special item from generic phrases such as "None identified", "No validation items", "Final SME review", or "Ready for publication review".
- Ensure fenced code blocks render correctly.
- Ensure any command/API/UI/version/timing/config/remediation detail is source-backed or explicitly marked for TAC/SME validation.
- A logoff/logon or interactive-session action may be described as reprioritizing synchronization only when supported by the evidence; it must never be labeled an immediate workaround or presented as guaranteeing a specific/sub-hour completion time unless current authoritative documentation explicitly guarantees that timing.
- For KCS/Admin Guide/KCS Update artifacts, every material product-behavior, timing, command/API, diagnostic, workaround and remediation claim must have an adjacent [R#] citation to the exact supporting source. A Source References list without claim-level body citations is not sufficient.
- For KCS artifacts, verify the article reads naturally for the actual problem type rather than mechanically following one fixed template. Require a clear Introduction/Overview, useful reader flow, and decision-oriented explanation of checks/steps where applicable.
- Keep Internal Notes focused on TAC-only operational context. Move source inventory/provenance/evidence bookkeeping to Source References instead of repeating it in Internal Notes.
- For every special Review/Blocker item, state the REQUIRED OUTCOME so the reviewer knows what a successful resolution of the item looks like.
- In Source References, preserve or add the concise Supports/Evidence explanation when the source content is available so reviewers can see why each source is cited without reading an entire case.
- Ensure every specifically named Jira, SFDC case, Confluence page, KCS, Admin/Tech Guide, API guide or product-documentation source has a direct clickable URL in its canonical R# entry when that URL is available to Case Chat. Do not make reviewers search for a cited source.
- If internal Confluence/runbook guidance already contains the answer but no equivalent Salesforce KCS is established, preserve that source and explain the Salesforce discoverability/distribution gap; do not describe the knowledge as absent.
${job.directKnowledgeOnly ? '- DIRECT Generate KCS may reconcile CREATE vs UPDATE after inspecting actual Salesforce KCS content. Title/keyword similarity alone is insufficient.' : '- AUDIT-LED ROUTING LOCK: preserve the Audit-selected artifact type. If late Knowledge evidence suggests a different CREATE-vs-UPDATE route, keep the requested artifact type and emit an OTHER_MATERIAL_VALIDATION REVIEW item describing the potential duplicate/scope conflict and the need to reconsider the Audit route; do not silently reroute here.'}
- If an existing Salesforce KCS already covers the material issue, inspect its actual content. For Audit-led CREATE KCS, use that comparison to keep the new article distinct and flag any route conflict; for Direct Generate KCS, an actual same-scope match may become an update proposal. Title similarity alone is not enough.
${job.forceCreateNewKcs ? '- Reviewer override is active: preserve a separate NEW KCS even though update is the default recommendation. Do not convert it back into an update proposal. Keep the related existing Salesforce KCS explicitly referenced with [R#] and verify that the new article has a distinct, non-conflicting scope.' : ''}
- Do not use the originating XSUP/SFDC ID as a reusable search keyword.
- Do not say "publish" as an already-approved action. This remains a draft for human review.

READINESS RULES
READY:
- useful and materially complete draft
- no material unsupported claim
- no material validation item remains

DRAFTABLE:
- useful draft can be reviewed now
- one or more named material validation items remain

NOT READY:
- evidence is too weak/inconsistent to provide a safe/useful artifact

OUTPUT EXACTLY:

QUALITY_STATUS: [PASS / PASS_WITH_VALIDATION / FAIL]
VALIDATED_ARTIFACT_READINESS: [READY / DRAFTABLE / NOT READY]
QUALITY_SUMMARY: [one concise sentence]
MATERIAL_VALIDATION_ITEMS: [None / concise list]
SPECIAL_REVIEW_ITEMS:
[zero or more lines exactly as: REVIEW|Kind=[UI_NAVIGATION / CLI_COMMAND / API_CONTRACT / TIMING_SLA / FILE_LOG_PATH / SOURCE_CURRENTNESS / MISSING_SOURCE_OR_LINK / DERIVATIVE_AI_EVIDENCE / INTERNAL_ARCHITECTURE / DOCUMENTATION_PLACEMENT / CITATION_GAP / OTHER_MATERIAL_VALIDATION]|Target=the exact complete reader-visible claim from the FINAL artifact or NONE only for source-only/link-only reviews|Owner=...|What=...|Conflict=optional concise disagreement when sources conflict|Why=...|Outcome=...|Refs=[R1,R2]
or: BLOCKER|Kind=[same allowed values]|Target=exact complete reader-visible claim from the FINAL artifact or NONE only for source-only/link-only reviews|Owner=...|What=...|Conflict=optional concise disagreement when sources conflict|Why=...|Outcome=...|Refs=[R1]
The Target, Kind, What, Why and Outcome MUST describe the same technical assertion. Use the structured Kind as the primary routing contract; do not label a CLI command as UI navigation/API contract, an API contract as UI/CLI, or an exact timing/SLA claim as API/UI.
For exact timing/latency/cadence values that are not directly established by current maintained authority, emit a Kind=TIMING_SLA review. Do not inject ad-hoc italicized timing warnings into the article body.
If there are no special items, write NONE on the next line.]

${KNOWLEDGE_FINAL_DELIMITER}
[the complete polished ${label}; no quality commentary before/after the artifact]
`.trim();
  }

  function buildKnowledgeRepairPrompt(job, artifact, issues = []) {
    const type = job.knowledgeArtifactType || knowledgeArtifactType(job);
    const label = knowledgeArtifactLabel(type);
    return `
KNOWLEDGE QUALITY REPAIR — ONE EVIDENCE-BOUNDED PASS

Target: ${jobDisplayKey(job)}
Artifact type: ${label}

REPAIR ONLY THESE QUALITY/STRUCTURE PROBLEMS
${(issues || []).map((x,i)=>`${i+1}. ${x}`).join("\n") || "The independent quality review did not satisfy the deterministic artifact contract."}

CURRENT ARTIFACT
${stripInternalKnowledgeMetadata(artifact)}

RULES
- Preserve supported technical content and existing authoritative [R#] source mappings.
- Do not invent new commands, paths, APIs, UI navigation, versions, timing values, configuration values, causes, or fixes.
- Remove or rewrite unsupported material rather than fabricating evidence.
- Fix sanitizer/Markdown/required-section/provenance defects where possible.
- If a material claim cannot be repaired from available evidence, keep the usable draft and emit an actionable BLOCKER item.
- This is the only automated repair pass.

OUTPUT EXACTLY:
QUALITY_STATUS: [PASS / PASS_WITH_VALIDATION / FAIL]
VALIDATED_ARTIFACT_READINESS: [READY / DRAFTABLE / NOT READY]
QUALITY_SUMMARY: [one concise sentence]
MATERIAL_VALIDATION_ITEMS: [None / concise list]
SPECIAL_REVIEW_ITEMS:
[zero or more REVIEW|Kind=[UI_NAVIGATION / CLI_COMMAND / API_CONTRACT / TIMING_SLA / FILE_LOG_PATH / SOURCE_CURRENTNESS / MISSING_SOURCE_OR_LINK / DERIVATIVE_AI_EVIDENCE / INTERNAL_ARCHITECTURE / DOCUMENTATION_PLACEMENT / CITATION_GAP / OTHER_MATERIAL_VALIDATION]|Target=...|Owner=...|What=...|Conflict=...|Why=...|Outcome=...|Refs=[R#] or BLOCKER lines using the same contract, or NONE. Target must be the exact complete reader-visible claim; Kind/What/Why/Outcome must describe that same claim. Do not inject raw timing-note prose into the repaired artifact.]

${KNOWLEDGE_FINAL_DELIMITER}
[complete repaired ${label}]
`.trim();
  }

  function stripInternalKnowledgeMetadata(text) {
    return sanitizeGeneratedText(String(text || "")
      .split(/\r?\n/)
      .filter(line => !line.includes(REUSE_META_PREFIX))
      .join("\n"))
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }


  function stripKnowledgeControlPreamble(text) {
    let value = String(text || "").trim();
    const delimiterIndex = value.indexOf(KNOWLEDGE_FINAL_DELIMITER);
    if (delimiterIndex >= 0) value = value.slice(delimiterIndex + KNOWLEDGE_FINAL_DELIMITER.length).trim();

    const lines = value.split(/\r?\n/);
    const out = [];
    let inPreamble = true;
    for (const line of lines) {
      const t = line.trim();
      if (inPreamble) {
        if (/^(?:QUALITY_STATUS|VALIDATED_ARTIFACT_READINESS|QUALITY_SUMMARY|MATERIAL_VALIDATION_ITEMS|SPECIAL_REVIEW_ITEMS)\s*:/i.test(t) || /^NONE$/i.test(t) || /^---\s*FINAL ARTIFACT\s*---$/i.test(t)) continue;
        if (!t) continue;
        inPreamble = false;
      }
      out.push(line);
    }
    return out.join("\n").replace(/\n{3,}/g,"\n\n").trim();
  }

  function extractKnowledgeSectionRaw(text, headingNames) {
    const a = String(text || "");
    for (const name of headingNames) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?:^|\\n)##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "i");
      const m = a.match(re);
      if (m) return String(m[1] || "").trim();
    }
    return "";
  }

  function extractKnowledgeSection(text, headingNames) {
    return cleanText(extractKnowledgeSectionRaw(text, headingNames));
  }

  function hasMaterialValidationItems(artifact) {
    const section = extractKnowledgeSection(
      artifact,
      ["TAC/SME Validation Items", "Validation Items"]
    );
    if (!section) return false;
    const normalized = cleanText(section).toLowerCase();
    if (!normalized) return false;
    if (/^(none|none identified|not applicable|n\/a|no additional validation items(?: identified)?)[.!]?$/i.test(normalized)) {
      return false;
    }
    return true;
  }

  function knowledgeSourceCanonicalKey(ref) {
    const urls = (ref?.urls || []).map(x => safeUrl(x?.url || "")).filter(Boolean);
    if (urls.length) return `url:${urls[0].replace(/\/$/, "").toLowerCase()}`;
    return `id:${normalizeFieldValueForCompare(ref?.identity || "")}`;
  }

  function completedSiblingKnowledgeArtifacts(job) {
    return (Array.isArray(job?.knowledgeArtifacts) ? job.knowledgeArtifacts : [])
      .filter(x => x?.status === "completed" && cleanText(x?.answer || "") && x?.type !== job?.knowledgeArtifactType);
  }

  function mergeKnowledgeSourceCatalog(job, artifact) {
    const map = parseKnowledgeSourceReferences(artifact);
    const claimIndex = new Map();
    const canonicalToKey = new Map();
    const addClaims = (key, claims) => {
      if (!claimIndex.has(key)) claimIndex.set(key, []);
      const list = claimIndex.get(key);
      for (const claim of claims || []) {
        const c = cleanText(claim || "");
        if (c && !list.some(x => normalizeFieldValueForCompare(x) === normalizeFieldValueForCompare(c)) && list.length < 8) list.push(c);
      }
    };
    const register = (key, ref) => {
      const canon = knowledgeSourceCanonicalKey(ref);
      if (canon && !canonicalToKey.has(canon)) canonicalToKey.set(canon, key);
      addClaims(key, [ref?.supports, ref?.evidence]);
    };
    for (const [key, ref] of map) {
      const identity = String(ref.identity || "");
      const isCurrentTicket = (job?.xsup && identity.toUpperCase().includes(String(job.xsup).toUpperCase())) || (job?.caseNumber && identity.includes(String(job.caseNumber)));
      if (isCurrentTicket) {
        const candidates = [
          {label:`Open Jira ${job?.xsup || ""}`.trim(), url:job?.targetLinks?.jira || (job?.xsup ? `https://jira-dc.paloaltonetworks.com/browse/${job.xsup}` : "")},
          {label:`Open SFDC ${job?.caseNumber || ""}`.trim(), url:job?.targetLinks?.sfdc || (job?.references || []).find(r=>String(r?.title||"").includes(String(job?.caseNumber||"")) && /salesforce|force\.com/i.test(String(r?.url||"")))?.url || ""}
        ];
        for (const c of candidates) {
          if (!cleanText(c.url || "")) continue;
          const url = safeUrl(c.url);
          if (url && !ref.urls.some(x=>x.url===url)) ref.urls.push({label:c.label,url});
        }
      }
      register(key, ref);
    }
    const bodyClaims = knowledgeReferenceClaimMap(artifact);
    for (const [key, claims] of bodyClaims) addClaims(key, claims);

    let next = 1;
    const nextKey = () => { while (map.has(`R${next}`)) next++; return `R${next++}`; };
    for (const sibling of completedSiblingKnowledgeArtifacts(job)) {
      const siblingMap = parseKnowledgeSourceReferences(sibling.answer || "");
      const siblingClaims = knowledgeReferenceClaimMap(sibling.answer || "");
      for (const [sKey, sRef] of siblingMap) {
        const canon = knowledgeSourceCanonicalKey(sRef);
        let targetKey = canonicalToKey.get(canon);
        if (!targetKey) {
          // URL equivalence is strongest. Fall back to a close normalized identity only
          // when both identities are substantial; never merge generic "Documentation" labels.
          const sid = normalizeFieldValueForCompare(sRef.identity || "");
          const sTickets = new Set((String(sRef.identity || "").match(/\b(?:XSUP-\d+|\d{8})\b/gi) || []).map(x=>x.toUpperCase()));
          for (const [k, ref] of map) {
            const tid = normalizeFieldValueForCompare(ref.identity || "");
            const tTickets = new Set((String(ref.identity || "").match(/\b(?:XSUP-\d+|\d{8})\b/gi) || []).map(x=>x.toUpperCase()));
            const sameTicket = [...sTickets].some(x=>tTickets.has(x));
            if (sameTicket || (sid.length >= 16 && tid.length >= 16 && (sid === tid || sid.includes(tid) || tid.includes(sid)))) { targetKey = k; break; }
          }
        }
        if (!targetKey) {
          targetKey = nextKey();
          map.set(targetKey, {key:targetKey, identity:sRef.identity, urls:[...(sRef.urls || [])], provenance:sRef.provenance || "", freshness:sRef.freshness || "", supports:sRef.supports || "", evidence:sRef.evidence || ""});
          register(targetKey, map.get(targetKey));
        } else {
          const target = map.get(targetKey);
          for (const u of sRef.urls || []) if (!target.urls.some(x => x.url === u.url)) target.urls.push(u);
          if (!target.provenance && sRef.provenance) target.provenance = sRef.provenance;
          if (!target.freshness && sRef.freshness) target.freshness = sRef.freshness;
          if (!target.supports && sRef.supports) target.supports = sRef.supports;
          if (!target.evidence && sRef.evidence) target.evidence = sRef.evidence;
          if ((!target.identity || target.identity === targetKey) && sRef.identity) target.identity = sRef.identity;
        }
        addClaims(targetKey, siblingClaims.get(sKey) || []);
        addClaims(targetKey, [sRef.supports, sRef.evidence]);
      }
    }
    return {map, claimIndex};
  }

  function sharedKnowledgeEvidencePromptContext(job) {
    const siblings = completedSiblingKnowledgeArtifacts(job);
    if (!siblings.length) return "";
    const lines = [];
    const seen = new Set();
    for (const sibling of siblings) {
      const sourceMap = parseKnowledgeSourceReferences(sibling.answer || "");
      for (const [, ref] of sourceMap) {
        const canon = knowledgeSourceCanonicalKey(ref);
        if (!canon || seen.has(canon)) continue;
        seen.add(canon);
        const links = (ref.urls || []).map(x => x.url).filter(Boolean).join(" ; ");
        lines.push(`- ${ref.identity}${links ? ` | ${links}` : ""}${ref.freshness ? ` | Freshness: ${ref.freshness}` : ""}${ref.supports ? ` | Supports: ${ref.supports}` : ""}${ref.evidence ? ` | Evidence: ${ref.evidence}` : ""}`);
      }
    }
    if (!lines.length) return "";
    return `\nSHARED EVIDENCE INDEX FROM ALREADY COMPLETED COMPANION KNOWLEDGE ARTIFACTS\nUse this only as a discovery/index layer. Cite the underlying linked source, never the generated companion artifact itself. Reuse the same underlying evidence set where it supports this artifact, and keep claim-level citations precise.\n${lines.slice(0,24).join("\\n")}\n`;
  }

  function knowledgeSignificantTokens(value) {
    const stop = new Set(["about","after","again","against","also","and","are","because","been","before","being","between","both","but","can","could","does","from","have","into","its","more","must","not","only","other","should","such","than","that","the","their","then","there","these","they","this","through","using","when","where","which","while","will","with","within","without","your"]);
    const normalized = String(value || "").toLowerCase()
      .replace(/\bsign[\s-]*out\b|\blog[\s-]*out\b/g, " logoff ")
      .replace(/\bsign[\s-]*in\b|\blog[\s-]*in\b/g, " logon ");
    return new Set(normalized.replace(/[^a-z0-9_./-]+/g," ").split(/\s+/).filter(t => t && (t.length >= 4 || /^(cie|dss|xql|api|ou|cli|ssl|tls|dns|sso|iam|jwt|idp|url|uri|tcp|udp|sql|xml|json|yaml|yml|http|https)$/.test(t)) && !stop.has(t)));
  }

  function sourceMatchScore(claim, ref, claims = []) {
    const a = knowledgeSignificantTokens(claim);
    if (!a.size) return 0;
    const sourceText = [ref?.identity, ref?.supports, ref?.evidence, ...(claims || [])].filter(Boolean).join(" ");
    const b = knowledgeSignificantTokens(sourceText);
    if (!b.size) return 0;
    const lower = String(claim || "").toLowerCase()
      .replace(/\bsign[\s-]*out\b|\blog[\s-]*out\b/g, "logoff")
      .replace(/\bsign[\s-]*in\b|\blog[\s-]*in\b/g, "logon");
    const src = sourceText.toLowerCase()
      .replace(/\bsign[\s-]*out\b|\blog[\s-]*out\b/g, "logoff")
      .replace(/\bsign[\s-]*in\b|\blog[\s-]*in\b/g, "logon");
    const identity = String(ref?.identity || "").toLowerCase();
    const isDocumentation = /documentation|admin guide|tech guide|product guide/.test(identity);
    if (isDocumentation && /endpoint tags?/i.test(claim) && !/endpoint tags?/.test(identity)) return 0;
    if (isDocumentation && /pan_dss_raw|dataset/i.test(claim) && !/dataset|cloud identity engine|directory/.test(identity)) return 0;
    if (isDocumentation && /cloud identity engine|\bcie\b/i.test(claim) && !/cloud identity engine|cie|dataset/.test(identity)) return 0;
    if (isDocumentation && /policy (?:management|target|scope)|policy assignment/i.test(claim) && !/policy|endpoint tags?/.test(identity)) return 0;

    // Exact quantitative/version promises may only inherit a citation when the
    // candidate source index contains the same number/version token.
    const numeric = [...new Set((lower.match(/\b\d+(?:\.\d+)?\b/g) || []))];
    if (numeric.length && !numeric.every(n => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`).test(src))) return 0;
    if (/\b(?:7\.x|8\.x|9\.x)\b/i.test(claim) && !/\b(?:7\.x|8\.x|9\.x)\b/i.test(sourceText)) return 0;

    // Commands/routes/paths require their distinctive operation token, not merely
    // a broad product/topic match.
    const exactMarkers = [];
    // Generic exact technical tokens: commands, fields, paths, routes, error/status
    // identifiers and configuration keys should only inherit a citation when the
    // same distinctive token is present in the candidate source/evidence index.
    for (const mm of String(claim || "").matchAll(/`([^`]{3,100})`/g)) {
      const marker = cleanText(mm[1]).toLowerCase();
      if (marker && !/[<>]/.test(marker) && /[._\\/:-]|\b(?:get|post|put|patch|delete)\b/i.test(marker) && marker.length <= 100) exactMarkers.push(marker);
    }
    for (const mm of String(claim || "").matchAll(/\b(?:GET|POST|PUT|PATCH|DELETE)\s+(\/[A-Za-z0-9_./{}:-]+)/g)) exactMarkers.push(mm[1].toLowerCase());
    for (const mm of String(claim || "").matchAll(/\b([A-Z][A-Z0-9_-]{4,})\b/g)) {
      const marker = mm[1].toLowerCase();
      if (!/^(CORTEX|ERROR|REVIEW|BLOCKER|TAC|SME)$/.test(mm[1])) exactMarkers.push(marker);
    }
    if (/endpoint tags?/i.test(claim)) exactMarkers.push("endpoint tags");
    if (/pan_dss_raw/i.test(claim)) exactMarkers.push("pan_dss_raw");
    if (/logoff/i.test(claim)) exactMarkers.push("logoff");
    if (/logon/i.test(claim)) exactMarkers.push("logon");
    if (/public api|\bapi\b/i.test(claim)) exactMarkers.push("api");
    if (/cytool\s+policy\s+check/i.test(claim)) exactMarkers.push("cytool policy check");
    if (/cytool\s+endpoint_tags/i.test(claim)) exactMarkers.push("cytool endpoint_tags");
    if (/\/tags\/agents\/(?:assign|remove)/i.test(claim)) exactMarkers.push("/tags/agents/");
    if (/CloudIdAgentDebug\.log/i.test(claim)) exactMarkers.push("cloudidagentdebug.log");
    if (/CloudIdAgentConfig\.xml/i.test(claim)) exactMarkers.push("cloudidagentconfig.xml");
    if (/C:\\Program Files/i.test(claim)) exactMarkers.push("c:\\program files");
    const uniqueExactMarkers = [...new Set(exactMarkers.filter(Boolean))];
    if (uniqueExactMarkers.length && !uniqueExactMarkers.every(m=>src.includes(m))) return 0;

    let overlap = 0;
    for (const token of a) if (b.has(token)) overlap++;
    let score = overlap / Math.max(4, Math.min(a.size, 12));
    // A distinctive exact technical marker (dataset name, API route, command,
    // file/path, endpoint-tag concept) is strong evidence when it also exists in
    // the already-linked sibling claim index. The exact-marker guard above still
    // prevents broad topical sources from acquiring unrelated citations.
    if (uniqueExactMarkers.length) score += 0.45;
    for (const marker of ["pan_dss_raw","endpoint tags","logoff","logon","cloud identity engine","directory sync","cytool endpoint_tags","active directory","24 hour","24-hour"]) {
      if (lower.includes(marker) && src.includes(marker)) score += 0.20;
    }
    if (lower.includes("cytool") && src.includes("cytool")) score += 0.28;
    if (lower.includes("xql") && (src.includes("xql") || src.includes("pan_dss_raw"))) score += 0.20;
    return score;
  }

  function injectConservativeKnowledgeCitations(artifact, sourceMap, claimIndex) {
    const material = /\b(?:Cortex|XDR|XSIAM|XSOAR|Cloud|Prisma|endpoint|agent|server|service|process|integration|connector|policy|rule|profile|configuration|setting|field|query|dataset|database|API|CLI|command|script|path|file|log|error|failure|failed|status|timeout|authentication|authorization|permission|certificate|network|proxy|DNS|TLS|SSL|SAML|SSO|license|upgrade|install|deploy|version|release|sync|synchron|latency|minutes?|hours?|workaround|resolution|expected behavior|limitation|cause|alert|incident|playbook|tenant|cluster|node|container|kubernetes)\b|`[^`]{3,}`|\b[A-Z][A-Z0-9_-]{4,}\b/i;
    let inFence = false;
    let section = "";
    return String(artifact || "").split(/\r?\n/).map(line => {
      const t = line.trim();
      const heading = t.match(/^#{1,6}\s+(.+)$/);
      if (heading) { section = cleanText(heading[1]); return line; }
      if (/^```/.test(t)) { inFence = !inFence; return line; }
      if (inFence || !t || /^(At a Glance|Applies To|Search Keywords|Source References|TAC\/SME Validation Items|Validation Items|Knowledge Reuse Basis|Internal Notes)/i.test(section) || /^\s*\|/.test(line) || /\[((?:R\d+[\s,;]*)+)\]/i.test(line) || !material.test(t)) return line;
      const candidates = [];
      for (const [key, ref] of sourceMap) {
        const score = sourceMatchScore(t, ref, claimIndex.get(key) || []);
        if (score >= 0.52) candidates.push({key,score});
      }
      candidates.sort((a,b)=>b.score-a.score);
      if (!candidates.length) return line;
      const picked = candidates.filter((x,i)=>i===0 || (i<2 && x.score >= 0.62 && x.score >= candidates[0].score - 0.06)).map(x=>x.key);
      return `${line.replace(/\s+$/,"")} [${picked.join(", ")}]`;
    }).join("\n");
  }

  function inferredKnowledgeSourceProvenance(ref) {
    const identity = String(ref?.identity || "");
    const urls = (ref?.urls || []).map(x => String(typeof x === "string" ? x : (x?.url || ""))).join(" ");
    const idLower = identity.toLowerCase();
    const urlLower = urls.toLowerCase();
    const all = `${idLower} ${urlLower}`;
    if (/case chat|tacopilot|\btaco\b|xsup auditor|ai[- ]assisted|ai synthesis|generated (?:draft|artifact|summary)/.test(all)) return "AI-assisted synthesis — not authoritative";

    // Identity is decisive when a reference contains cross-links to several systems.
    // Example: a Jira source may also carry an SFDC convenience link; that must not
    // convert the Jira evidence into a Salesforce Support Case.
    if (/^(?:jira\s+(?:ticket|issue|escalation)|xsup-\d+)\b/i.test(identity) || /\bXSUP-\d+\b/i.test(identity) && /jira/i.test(identity)) return "Internal Jira / Engineering evidence";
    if (/^(?:sfdc|salesforce|support)\s+case\b/i.test(identity)) return "Internal Salesforce Support Case";
    if (/^(?:kb\s+ka\w+|kcs\b|salesforce knowledge|knowledge (?:article|base))/i.test(identity)) return "Salesforce Knowledge / KCS";
    if (/^(?:confluence|runbook|internal guide)/i.test(identity)) return "Internal Confluence / Runbook";

    // URL identity remains a strong provenance signal when the title is generic.
    if (/jira-dc\.paloaltonetworks\.com/.test(urlLower)) return "Internal Jira / Engineering evidence";
    if (/lightning\.force\.com.*knowledge__kav/.test(urlLower)) return "Salesforce Knowledge / KCS";
    if (/lightning\.force\.com.*\/case\//.test(urlLower)) return "Internal Salesforce Support Case";
    if (/confluence-dc\.paloaltonetworks\.com/.test(urlLower)) return "Internal Confluence / Runbook";
    if (/docs-cortex\.paloaltonetworks\.com|docs\.paloaltonetworks\.com/.test(urlLower)) return "Official product documentation (web)";
    if (/paloaltonetworks\.com/.test(urlLower)) return "Official Palo Alto Networks web source";
    if (/https?:\/\//.test(urlLower)) return "External web research";

    if (/salesforce knowledge|knowledge base|\bkcs\b|\bkb\s+ka\w+/.test(idLower)) return "Salesforce Knowledge / KCS";
    if (/support case|sfdc case|salesforce case/.test(idLower)) return "Internal Salesforce Support Case";
    if (/jira escalation|\bjira\b|\bxsup-\d+\b|engineering/.test(idLower)) return "Internal Jira / Engineering evidence";
    if (/internal confluence|internal guide|runbook/.test(idLower)) return "Internal Confluence / Runbook";
    if (/documentation:/.test(idLower)) return "Official product documentation (web)";
    return "";
  }

  function knowledgeSourceProvenance(ref) {
    const explicit = cleanText(ref?.provenance || "");
    const inferred = inferredKnowledgeSourceProvenance(ref);
    if (/AI-assisted synthesis|Case Chat|TACopilot|\bTACO\b|generated derivative/i.test(inferred)) return inferred;
    if (inferred) {
      if (!explicit) return inferred;
      const explicitLower = explicit.toLowerCase();
      const inferredLower = inferred.toLowerCase();
      const compatible = (
        (explicitLower.includes("jira") && inferredLower.includes("jira")) ||
        (explicitLower.includes("confluence") && inferredLower.includes("confluence")) ||
        (/(knowledge|kcs)/.test(explicitLower) && /(knowledge|kcs)/.test(inferredLower)) ||
        (/(salesforce|sfdc).*case/.test(explicitLower) && /salesforce support case/.test(inferredLower)) ||
        (/(official|documentation|docs)/.test(explicitLower) && /official/.test(inferredLower)) ||
        (explicitLower.includes("external") && inferredLower.includes("external"))
      );
      return compatible ? explicit : inferred;
    }
    return explicit || "Source provenance not classified — reviewer verify";
  }

  function knowledgeSourceIsOriginatingCase(ref, job = null) {
    const identity = String(ref?.identity || "");
    const provenance = knowledgeSourceProvenance(ref);
    if (!/Jira|Salesforce Support Case/i.test(provenance)) return false;
    return Boolean(
      (job?.xsup && identity.toUpperCase().includes(String(job.xsup).toUpperCase())) ||
      (job?.caseNumber && identity.includes(String(job.caseNumber)))
    );
  }

  function knowledgeSourceFreshness(ref, job = null) {
    const explicit = cleanText(ref?.freshness || "");
    const provenance = knowledgeSourceProvenance(ref);
    const identity = String(ref?.identity || "");
    const origin = knowledgeSourceIsOriginatingCase(ref, job);
    const detected = cleanText(identity.match(/\b(?:20\d{2}[-\/]\d{1,2}[-\/]\d{1,2}|20\d{2})\b/)?.[0] || "");
    const dated = detected ? ` Source identity includes ${detected}.` : "";

    if (/AI-assisted/i.test(provenance)) return "AI-assisted synthesis is not authoritative. Trace the statement to an original maintained/internal source or keep it out of customer-facing guidance.";
    if (origin) return `Originating investigation evidence. It establishes what was observed or concluded in this case, but case-specific evidence is not automatically a current reusable product guarantee. Confirm current-release applicability before generalizing a material claim.${dated}`;
    if (/Official product documentation|Official Palo Alto Networks web source/i.test(provenance)) return `Maintained/official source. Confirm that the linked page applies to the product release and feature scope covered by this draft.${dated}`;
    if (/Salesforce Knowledge/i.test(provenance)) {
      const note = explicit ? ` Source metadata says: ${explicit}.` : "";
      return `Existing Salesforce Knowledge.${note} Verify that the article still applies to the same product/version and has not been superseded or deprecated before authoritative reuse.${dated}`;
    }
    if (/Internal Salesforce Support Case/i.test(provenance)) return `Historical/support-case evidence. Use it as supporting context and confirm reusable behavior against current maintained documentation or current SME/Engineering guidance before publication.${explicit ? ` Source metadata says: ${explicit}.` : ""}${dated}`;
    if (/Internal Confluence|Runbook/i.test(provenance)) return `Internal guidance whose maintenance/applicability must be confirmed for the current release before a material public claim relies on it.${explicit ? ` Source metadata says: ${explicit}.` : ""}${dated}`;
    if (/Jira|Engineering/i.test(provenance)) return `Engineering/Jira evidence. Confirm current-release applicability and whether newer Engineering guidance supersedes it before generalizing it into reusable product behavior.${explicit ? ` Source metadata says: ${explicit}.` : ""}${dated}`;
    if (/External web research/i.test(provenance)) return `External web research. Validate the claim against current official/maintained product sources before publication.${explicit ? ` Source metadata says: ${explicit}.` : ""}${dated}`;
    if (explicit) return `Source metadata says: ${explicit}. Verify this status/applicability using the linked source before relying on it for a material claim.${dated}`;
    return `Currentness not established automatically. Confirm applicability to the product/component/version covered by this draft before relying on this source for a material claim.${dated}`;
  }

  function knowledgeSourceNeedsFreshnessReview(ref, job = null) {
    const provenance = knowledgeSourceProvenance(ref);
    const identity = String(ref?.identity || "");
    const explicit = cleanText(ref?.freshness || "").toLowerCase();
    if (/AI-assisted synthesis|Case Chat|TACopilot|\bTACO\b/i.test(`${provenance} ${identity}`)) return true;
    if (knowledgeSourceIsOriginatingCase(ref, job)) return true;
    if (/superseded|deprecated|historical|legacy|old|currentness not established|unknown/.test(explicit)) return true;
    if (/Official product documentation|Official Palo Alto Networks web source/i.test(provenance)) return false;
    // Current/maintained metadata can establish a KCS as a current candidate, but
    // it does not make case/Jira/Confluence/external evidence current authority.
    if (/Salesforce Knowledge/i.test(provenance) && /current|maintained|current release|active/.test(explicit)) return false;
    if (/External web research|Internal Salesforce Support Case|Internal Confluence|Runbook|Jira|Engineering|Source provenance not classified/i.test(provenance)) return true;
    const year = Number(identity.match(/\b(20\d{2})\b/)?.[1] || 0);
    const currentYear = new Date().getFullYear();
    if (year && year <= currentYear - 2) return true;
    return !/current|maintained|current release|active/.test(explicit);
  }

  function knowledgeSourceReviewState(ref, job = null) {
    const provenance = knowledgeSourceProvenance(ref);
    if (/AI-assisted synthesis|Case Chat|TACopilot|\bTACO\b/i.test(`${provenance} ${ref?.identity || ""}`)) return "BLOCKER";
    if (knowledgeSourceIsOriginatingCase(ref, job)) return "CASE_EVIDENCE";
    if (knowledgeSourceNeedsFreshnessReview(ref, job)) return "REVIEW_CURRENTNESS";
    return "CURRENT";
  }
  function serializeKnowledgeSourceReferences(refMap) {
    const keys = [...refMap.keys()].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));
    return keys.map(key => {
      const ref = refMap.get(key);
      const identity = cleanText(ref.identity || key).replace(/[—–-]+\s*$/, "").trim();
      const urls = (ref.urls || []).filter(u=>safeUrl(u?.url || ""));
      let sourceIdentity = identity;
      if (urls.length === 1) {
        const u = urls[0];
        const label = cleanText(u.label || "Open source");
        if (normalizeFieldValueForCompare(label) === normalizeFieldValueForCompare(identity)) sourceIdentity = `[${identity}](${u.url})`;
        else sourceIdentity = `${identity} — [${label}](${u.url})`;
      } else if (urls.length > 1) {
        const links = urls.map((u,i)=>`[${cleanText(u.label || (i ? `Open source ${i+1}` : "Open source"))}](${u.url})`).join(" ");
        sourceIdentity = `${identity} — ${links}`;
      }
      const provenance = knowledgeSourceProvenance(ref);
      const freshness = cleanText(ref.freshness || "");
      return `- [${key}] ${sourceIdentity} | Provenance: ${cleanText(provenance)}${freshness ? ` | Freshness: ${freshness}` : ""}${ref.supports ? ` | Supports: ${cleanText(ref.supports)}` : ""}${ref.evidence ? ` | Evidence: ${cleanText(ref.evidence)}` : ""}`;
    }).join("\n");
  }

  function replaceKnowledgeSourceReferenceSection(artifact, refMap) {
    const sourceText = `## Source References\n${serializeKnowledgeSourceReferences(refMap)}`;
    const sectionRe = /(?:^|\n)##\s+Source References\s*\n[\s\S]*?(?=\n##\s+|$)/i;
    if (sectionRe.test(artifact)) return String(artifact).replace(sectionRe, `\n${sourceText}\n`).replace(/\n{3,}/g,"\n\n").trim();
    const validationIdx = String(artifact).search(/\n##\s+(?:TAC\/SME Validation Items|Validation Items)\s*\n/i);
    if (validationIdx >= 0) return `${artifact.slice(0,validationIdx).trim()}\n\n${sourceText}\n\n${artifact.slice(validationIdx).trim()}`;
    return `${String(artifact || "").trim()}\n\n${sourceText}`.trim();
  }

  function normalizeKcsAuthoringMetaSections(artifact, type) {
    if (!(type === "KCS_DRAFT" || type === "KCS_UPDATE")) return artifact;
    let text = String(artifact || "");
    // Drafting/channel-process commentary belongs in the retrospective/action plan,
    // not in the KCS article TAC will read and reuse.
    text = removeKnowledgeSection(text, [
      "Knowledge Reuse Basis — Internal Drafting Note",
      "Knowledge Reuse Basis",
      "Internal Drafting Note",
      "Knowledge Channel / Reuse Note"
    ]);
    if (type === "KCS_DRAFT") {
      // The artifact wrapper already carries draft/SFDC/XSUP metadata. Keep the
      // KCS body itself publication-shaped so it can be reviewed/copied without
      // leaking authoring-process fields into the article.
      text = text
        .replace(/^\s*\*\*(?:Draft Status|Generated From|Knowledge Type):\*\*[^\n]*(?:\n|$)/gim, "")
        .replace(/^\s*(?:Draft Status|Generated From|Knowledge Type):[^\n]*(?:\n|$)/gim, "");
    }
    return text.replace(/\n{3,}/g,"\n\n").trim();
  }

  function ensureKcsIntroduction(artifact, type) {
    if (!(type === "KCS_DRAFT" || type === "KCS_UPDATE")) return artifact;
    let text = String(artifact || "");
    if (/(?:^|\n)##\s+(?:Introduction|Overview|Introduction \/ Overview)\s*(?:\n|$)/i.test(text)) return text;
    const atGlance = cleanAtGlanceSection(extractKnowledgeSectionRaw(text, ["At a Glance"]));
    if (!atGlance) return text;
    const intro = `## Introduction / Overview\n${atGlance}`;
    const re = /((?:^|\n)##\s+At a Glance\s*\n[\s\S]*?)(?=\n##\s+|\n\*\*Draft Status:|$)/i;
    if (re.test(text)) return text.replace(re, m => `${m.trimEnd()}\n\n${intro}\n`).replace(/\n{3,}/g,"\n\n").trim();
    const idx = text.search(/\n##\s+/);
    if (idx >= 0) return `${text.slice(0,idx).trim()}\n\n${intro}\n\n${text.slice(idx).trim()}`;
    return `${text.trim()}\n\n${intro}`;
  }

  function inferInternalNoteRefs(detail, refMap) {
    const query = cleanText(detail || "");
    if (!query || !refMap?.size) return [];
    const scored = [];
    for (const [key, ref] of refMap) {
      const provenance = knowledgeSourceProvenance(ref);
      if (!/Internal|Salesforce Knowledge|Salesforce Support/i.test(provenance)) continue;
      const score = sourceMatchScore(query, ref, []);
      if (score >= 0.48) scored.push({key, score});
    }
    scored.sort((a,b)=>b.score-a.score);
    return scored.slice(0,2).map(x=>x.key);
  }

  function extractLegacyInternalContextDetails(artifact, refMap = new Map()) {
    const text = String(artifact || "");
    const details = [];
    const add = (category, detail, why = "", refs = []) => {
      detail = cleanText(detail || "");
      refs = [...new Set((refs || []).map(x=>String(x).toUpperCase()))];
      if (!detail || !refs.length || detail.length < 25) return;
      if (details.some(x=>normalizeFieldValueForCompare(x.detail)===normalizeFieldValueForCompare(detail))) return;
      details.push({category, detail, why:cleanText(why || ""), refs});
    };

    // Preserve real Engineering/internal implementation substance even when it is
    // intentionally removed/generalized from the public-facing body. This is
    // generic across products/components: parameter names, workers/chunks/queues,
    // backend jobs/stages, internal diagnostics and Engineering-only boundaries.
    const blocks = String(text).split(/\n{2,}|(?=^#{2,5}\s)/m)
      .map(x=>cleanText(x.replace(/^#{1,6}\s+[^\n]+$/gm, " " ).replace(/^[-*+]\s*/gm, " "))).filter(Boolean);
    const engSignal = /(?:Engineering|backend|internal implementation|architecture|architectural|config\.|customfield_|agent_chunk|chunk size|worker allocation|workers?\b|calculation jobs?|batch jobs?|queue|processing stage|scheduler|database inspection|backend database|internal API|service pipeline|throughput|shard|thread|job count|internal diagnostic)/i;
    const decisionSignal = /(?:cannot|does not|doesn't|will not|won't|limit|constraint|scheduled|batch|push|event-driven|throughput|affect|change|controls?|determines?|observed|confirmed|investigat|tuning|allocation|size|count|cadence|queue|stage|parameter|config)/i;
    const unsupportedOnly = /(?:AI-assisted synthesis|authoritative source not established|legacy draft detail)/i;

    for (const block of blocks) {
      if (!engSignal.test(block) || !decisionSignal.test(block) || unsupportedOnly.test(block)) continue;
      const refs = refsNearTarget(text, block);
      const mapped = refs.length ? refs : inferInternalNoteRefs(block, refMap);
      if (!mapped.length) continue;
      let category = "Engineering implementation details";
      if (/(?:database inspection|internal API|diagnostic|query|log|debug|trace)/i.test(block)) category = "Engineering diagnostics / observations";
      else if (/(?:cannot|does not|limit|constraint|boundary|event-driven|push)/i.test(block)) category = "Engineering architecture / limits";
      add(category, block,
        "Preserved for TAC/SME because this sourced Engineering detail can explain internal behavior, investigation choices or escalation boundaries even when it is not appropriate for customer-facing guidance.", mapped);
      if (details.length >= 10) break;
    }
    return details;
  }

  function extractStructuredInternalNoteItems(artifact) {
    const raw = extractKnowledgeSectionRaw(artifact, [
      "Internal Notes — TAC Only",
      "Internal Notes — Full Context (Internal Only)",
      "Internal Notes"
    ]);
    if (!raw) return [];
    const items = [];
    let category = "Additional TAC guidance";
    const add = (detail, refs = [], categoryName = category, why = "") => {
      detail = cleanText(detail || "").replace(/\s*\|\s*\*\*(?:Why it matters|Reference|Use \/ Caution|Use\/Caution|Caution|Externalization):\*\*[\s\S]*$/i, "").trim();
      refs = [...new Set((refs || []).map(x=>String(x).toUpperCase()))];
      if (!detail || detail.length < 25) return;
      // Review-task and unvalidated/legacy debris should not be promoted into TAC notes.
      if (/(?:TAC\/SME validation required|validation required|authoritative source not established|legacy draft|unverified|verify the exact|verification of|cross-platform verification|request parameter schema)/i.test(detail)) return;
      if (/^This draft and its organization were AI-assisted/i.test(detail)) return;
      const key = normalizeFieldValueForCompare(detail);
      if (items.some(x=>normalizeFieldValueForCompare(x.detail)===key)) return;
      items.push({category:cleanText(categoryName || "Additional TAC guidance"), detail, why:cleanText(why || ""), refs});
    };
    for (const rawLine of String(raw).split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const h = line.match(/^#{3,5}\s+(.+)$/);
      if (h) {
        const next = cleanText(h[1]);
        if (/Existing internal knowledge and evidence|Web \/ official documentation context|AI-assisted drafting note/i.test(next)) category = "__SKIP__";
        else if (/Engineering|implementation/i.test(next)) category = "Engineering context";
        else if (/Escalation/i.test(next)) category = "Escalation guidance";
        else if (/timing|expectation|observed/i.test(next)) category = "Timing and expectations";
        else category = next || "Additional TAC guidance";
        continue;
      }
      if (category === "__SKIP__") continue;
      const body = line.replace(/^[-*+]\s+/, "");
      if (/^(?:This section contains|These notes preserve|For Salesforce KCS|Do not copy)/i.test(cleanText(body))) continue;
      const labeled = cleanText(body.match(/\*\*(?:Detail|What TAC should know):\*\*\s*([^|]+)/i)?.[1] || "");
      const why = cleanText(body.match(/\*\*Why(?: it matters)?:\*\*\s*([^|]+)/i)?.[1] || "");
      const free = labeled || cleanText(body.replace(/\*\*/g, ""));
      const refs = [...new Set((body.match(/R\d+/gi) || []).map(x=>x.toUpperCase()))];
      add(free, refs, category, why);
    }
    return items;
  }

  function internalNoteNearDuplicate(a, b) {
    const na = normalizeFieldValueForCompare(a || "");
    const nb = normalizeFieldValueForCompare(b || "");
    if (!na || !nb) return false;
    if (na === nb || (na.length > 80 && nb.includes(na)) || (nb.length > 80 && na.includes(nb))) return true;
    const tokens = value => new Set(String(value || "").toLowerCase().match(/[a-z0-9_./-]{5,}/g) || []);
    const aa = tokens(a), bb = tokens(b);
    if (aa.size < 5 || bb.size < 5) return false;
    let overlap = 0;
    for (const token of aa) if (bb.has(token)) overlap++;
    return overlap / Math.max(1, Math.min(aa.size, bb.size)) >= 0.78;
  }

  function internalNoteDuplicatesPublicBody(detail, artifact) {
    const body = removeKnowledgeSection(artifact, ["Source References", "Review Details", "TAC/SME Validation Items", "Validation Items", "Internal Notes — TAC Only", "Internal Notes — Full Context (Internal Only)", "Internal Notes"]);
    const chunks = String(body || "").split(/\n+|(?<=[.!?])\s+/).map(x => x.replace(/\[(?:R\d+[\s,;]*)+\]/gi, "").trim()).filter(x => x.length >= 35);
    return chunks.some(chunk => internalNoteNearDuplicate(detail, chunk));
  }

  function addInternalKnowledgeNotes(job, artifact, originalArtifact, refMap, type) {
    let text = String(artifact || "");
    const existingItems = extractStructuredInternalNoteItems(text);
    const preserved = extractLegacyInternalContextDetails(originalArtifact, refMap);
    const all = [...existingItems];
    for (const d of preserved) {
      if (!all.some(x=>internalNoteNearDuplicate(x.detail, d.detail))) all.push(d);
    }

    // The retrospective Audit often contains the most concise statement of what
    // Engineering uniquely added. Preserve it in TAC Internal Notes even when the
    // generated public article did not independently reproduce that implementation detail.
    const engineeringContribution = cleanText(job?.engineeringContribution || job?.engineeringConfirmationEvidence || "");
    if (engineeringContribution && !/^none(?: identified)?$/i.test(engineeringContribution)) {
      let refs = inferInternalNoteRefs(engineeringContribution, refMap);
      if (!refs.length && refMap?.has("R1")) refs = ["R1"];
      const detail = engineeringContribution.replace(/^#{1,6}\s+/gm, "").trim();
      if (refs.length && !all.some(x=>internalNoteNearDuplicate(x.detail, detail))) {
        all.unshift({category:"Engineering contribution / investigation", detail, why:"This records what Engineering uniquely established or tested in the originating escalation and can help TAC recognize the same boundary in future cases.", refs});
      }
    }

    text = removeKnowledgeSection(text, [
      "Internal Notes — TAC Only",
      "Internal Notes — Full Context (Internal Only)",
      "Internal Notes"
    ]);

    // Keep Internal Notes curated, but do not artificially suppress useful sourced
    // Engineering substance. Exact internal implementation details belong here when
    // they help TAC/SME understand architecture, diagnostics, tuning or escalation.
    const curated = all.filter(item => {
      const detail = `${item.detail || ""} ${item.why || ""}`;
      if (/(?:AI-assisted synthesis|authoritative source not established)/i.test(detail) && !(item.refs || []).length) return false;
      if (!(item.refs || []).length && !/(?:Engineering|internal|escalat)/i.test(detail)) return false;
      if (internalNoteDuplicatesPublicBody(item.detail, text)) return false;
      return true;
    }).slice(0,12);
    // Traceability date is the local date the final artifact is rendered, not the
    // completion date of a reused historical Case Chat.
    const dateObj = new Date();
    const originDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,"0")}-${String(dateObj.getDate()).padStart(2,"0")}`;
    const originLines = [
      `### Origin / Traceability`,
      `- Generated from: ${job?.xsup ? job.xsup : "Direct knowledge analysis"}`,
      `- Related Salesforce Case: ${job?.caseNumber || "Not available"}`,
      `- Generated by: XSUP Auditor v${String(VERSION).split("-")[0]}`,
      `- Generated on: ${originDate}`,
      `- Traceability identifies the originating investigation; it does not make the draft or originating case authoritative for current product behavior.`
    ].join("\n");

    const normalizeCategory = value => {
      const v = cleanText(value || "");
      if (/contribution|investigation/i.test(v)) return "Engineering contribution / investigation";
      if (/diagnostic|observation|database|query|log|debug/i.test(v)) return "Engineering diagnostics / observations";
      if (/architecture|limit|constraint|boundary/i.test(v)) return "Engineering architecture / limits";
      if (/Engineering|implementation|backend|worker|chunk|queue|job|config/i.test(v)) return "Engineering implementation details";
      if (/Escalation/i.test(v)) return "Escalation guidance";
      if (/timing|expectation|observed/i.test(v)) return "Timing and expectations";
      return "Additional TAC guidance";
    };
    const byCat = new Map();
    for (const item of curated) {
      if (!(item.refs || []).length) item.refs = inferInternalNoteRefs(item.detail, refMap);
      const cat = normalizeCategory(item.category);
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(item);
    }
    const groups = [originLines];
    for (const [cat, arr] of byCat) {
      const lines = arr.map(item => {
        let detail = cleanText(item.detail || "");
        const missingRefs = (item.refs || []).filter(r => !new RegExp(`\\[${r}\\]`, "i").test(detail));
        const refs = missingRefs.length ? ` ${missingRefs.map(r=>`[${r}]`).join(" ")}` : "";
        let why = cleanText(item.why || "");
        if (why && !normalizeFieldValueForCompare(detail).includes(normalizeFieldValueForCompare(why))) {
          why = why.replace(/^This\s+(?:context|detail)\s+/i, "This ");
          detail = `${detail} ${why}`;
        }
        return `- ${detail}${refs}`;
      });
      groups.push(`### ${cat}\n${lines.join("\n")}`);
    }
    const heading = `## Internal Notes — TAC Only\n${groups.join("\n\n")}`;
    const srcIdx = text.search(/\n##\s+Source References\s*\n/i);
    if (srcIdx >= 0) return `${text.slice(0,srcIdx).trim()}\n\n${heading}\n\n${text.slice(srcIdx).trim()}`;
    const valIdx = text.search(/\n##\s+(?:TAC\/SME Validation Items|Validation Items)\s*\n/i);
    if (valIdx >= 0) return `${text.slice(0,valIdx).trim()}\n\n${heading}\n\n${text.slice(valIdx).trim()}`;
    return `${text.trim()}\n\n${heading}`;
  }

  function normalizePublicKnowledgeInternalResidue(artifact, type) {
    if (!(["KCS_DRAFT","KCS_UPDATE","DOC_UPDATE","KNOWN_ISSUE"].includes(type))) return artifact;
    let text = String(artifact || "");
    // Engineering implementation parameters are preserved from originalArtifact into
    // Internal Notes later. Public-facing reusable bodies should describe the supported
    // behavior/limit rather than expose backend knobs as customer guidance.
    text = text.replace(/Backend tuning \(such as adjusting `?agent_chunk`? sizes or calculation job counts\) optimizes batch processing throughput but does not provide immediate push notifications for AD-side changes\.?/gi,
      "Backend processing/tuning can affect throughput, but it does not change the supported synchronization model into an immediate push mechanism.");
    text = text.replace(/Tuning backend calculation jobs \(such as adjusting DSS chunk sizes or worker allocations\) optimizes processing throughput across large inventories but cannot convert scheduled batch polling into an immediate push mechanism\.?/gi,
      "Backend processing/tuning can affect throughput, but it does not convert the supported scheduled model into an immediate push mechanism.");
    // Keep exact internal job cadence out of proposed public docs unless a maintained
    // public source explicitly supports it; the original wording remains available to
    // Internal Notes and source/review logic.
    text = text.replace(/Directory synchronization from DSS\/CIE to Cortex XDR operates via batch calculation jobs running every 10 minutes to process subsets of agents, taking up to 24 hours depending on total agent count/gi,
      "Directory synchronization from DSS/CIE to Cortex XDR is processed in scheduled batches; exact backend job cadence is an internal implementation detail and should not be treated as a customer-visible SLA");
    return text.replace(/\n{3,}/g,"\n\n").trim();
  }

  function normalizeDocumentationInternalResidue(artifact, type) {
    if (type !== "DOC_UPDATE") return artifact;
    let text = String(artifact || "");
    text = text.split(/\r?\n/).filter(line=>!/Local Endpoint Resource Contention:|third-party antivirus.*CPU contention|security software.*CPU contention/i.test(line)).join("\n");
    text = text.replace(/Tuning backend calculation jobs \(such as adjusting DSS chunk sizes or worker allocations\) optimizes processing throughput across large inventories but cannot convert scheduled batch polling into an immediate push mechanism/gi,
      "Backend processing/tuning can affect throughput, but it does not convert the scheduled directory synchronization model into an immediate push mechanism");
    return text.replace(/\n{3,}/g,"\n\n").trim();
  }

  function normalizeKcsScopeAndCaseResidue(artifact, type) {
    if (!(type === "KCS_DRAFT" || type === "KCS_UPDATE")) return artifact;
    let text = String(artifact || "");
    const legacyUncited = parseKnowledgeSourceReferences(text).size > 0 && knowledgeUsedReferenceIds(text).size === 0;
    const windowsSpecific = /Windows Sign out|C:\\Program Files|cytool\b/i.test(text);
    if (windowsSpecific) {
      text = text.replace(/[-*]\s*Cortex XDR \/ XSIAM \(Agent versions?\s+7\.x,\s*8\.x\)/i,
        "- Cortex XDR / XSIAM with Windows endpoints using Active Directory-based policy assignment");
    }

    // Legacy reused KCS drafts may contain useful substance but predate the shared
    // evidence envelope. Remove originating-case residue and over-specific claims
    // rather than presenting them as generalized product guidance merely because a
    // later quality-review request was unavailable.
    if (legacyUncited) {
      text = text.replace(
        /Cortex XDR synchronizes Active Directory user, computer, and OU mappings via the Cloud Identity Engine \(CIE\) \/ Directory Sync Service \(DSS\) on a scheduled 24-hour batch cycle into backend datasets \(such as `pan_dss_raw`\) to avoid overloading directory service APIs and backend database pipelines\.?/i,
        "Cortex XDR synchronizes Active Directory identity and OU/group association data through the Cloud Identity Engine (CIE) / Directory Sync Service (DSS) on a scheduled cycle. For AD-side changes, directory association and resulting policy reassignment can take up to 24 hours by design."
      );
      text = text.replace(
        /Modifications executed purely on an Active Directory Domain Controller \(such as moving computer objects between OUs\) do not generate local host events or push interrupts to the Cortex XDR Agent\. Because Cortex XDR ingests directory data on a scheduled daily batch cycle, the endpoint continues enforcing its cached policy until the backend recalculation cycle completes or a local session transition prompts prioritized synchronization\.?/i,
        "An AD-side OU or group change does not trigger an immediate directory-association or policy reassignment on the endpoint. The endpoint can continue enforcing the previously calculated policy until CIE/DSS synchronization and policy recalculation occur; an interactive session transition can reprioritize synchronization."
      );
      text = text.replace(
        /Because moving a computer object between OUs is an administrative modification performed entirely on the Domain Controller, no local machine event occurs on the endpoint to initiate an immediate out-of-band notification or check-in\. Consequently, the endpoint continues enforcing its cached prevention policy until the routine 24-hour recalculation cycle completes or an interactive user session logoff\/logon triggers prioritized synchronization\.?/i,
        "An AD-side OU move does not itself push an immediate directory-association or policy update to the endpoint. An interactive user logoff/logon can reprioritize CIE/DSS synchronization so the updated association can be picked up sooner than the normal scheduled cycle."
      );

      const sourceMap = parseKnowledgeSourceReferences(text);
      const hasAuthoritativeApiSource = [...sourceMap.values()].some(ref => /api (?:guide|documentation)|developer/i.test(`${ref.identity || ""} ${(ref.urls || []).map(x=>x.url).join(" ")}`));
      if (!hasAuthoritativeApiSource) {
        text = text.replace(
          /\*\s*\*\*Via Public API:\*\*[^\n]*/i,
          "* **Via Public API:** Endpoint Tags can also be automated through the supported public API for the applicable release. Add the maintained API documentation link, supported version/base path, prerequisites, and payload schema before publishing an exact route or request example."
        );
      }

      text = text.split(/\r?\n/).filter(line => {
        if (/Local CPU Contention|third-party antivirus.*thread contention|CPU starvation.*cyserver/i.test(line)) return false;
        if (/Recursive Group Membership.*\b10\b.*nesting levels/i.test(line)) return false;
        return true;
      }).join("\n");

      // Source References are the canonical linked source index. Keeping a second
      // hand-written Related Knowledge list in a legacy draft creates duplication
      // and can preserve stale/unlinked titles that are not actually in the source set.
      text = removeKnowledgeSection(text, ["Related Knowledge / Documentation"]);
    }

    text = text.replace(/(?:^|\n)\s*(?:\d+\.\s*)?On the endpoint, verify that the active prevention policy matches the expected policy by running:\s*\n\s*```batch\s*\n\s*cytool policy check\s*\n\s*```/gi,
      "\n3. On the endpoint, verify that the active prevention policy matches the expected policy using the currently supported policy-verification method. TAC/SME validation required for any exact CLI command.\n");
    text = text.replace(/\n##\s+Additional Troubleshooting\s*\n\s*(?=##\s+)/gi, "\n");
    return text.replace(/\n{3,}/g,"\n\n").trim();
  }

  function applySharedKnowledgeEvidenceEnvelope(job, artifact, type) {
    // Normalize legacy KCS residue before evidence mapping so case-specific or
    // unsupported exact claims cannot acquire a citation merely through proximity.
    const originalArtifact = stripKnowledgeControlPreamble(String(artifact || ""));
    let text = normalizeKcsScopeAndCaseResidue(originalArtifact, type);
    text = normalizePublicKnowledgeInternalResidue(text, type);
    text = normalizeDocumentationInternalResidue(text, type);
    const merged = mergeKnowledgeSourceCatalog(job, text);
    text = normalizeKcsAuthoringMetaSections(text, type);
    text = ensureKcsIntroduction(text, type);
    if (merged.map.size) {
      text = injectConservativeKnowledgeCitations(text, merged.map, merged.claimIndex);
      const finalClaims = knowledgeReferenceClaimMap(text);
      const usedNow = knowledgeUsedReferenceIds(text);
      for (const [key, ref] of merged.map) {
        const claims = finalClaims.get(key) || [];
        const indexed = merged.claimIndex.get(key) || [];
        // Never label companion-artifact wording as a claim made by this artifact.
        // If the current body cites this R#, only current-body claim extraction may
        // populate Supports. Companion wording remains related evidence for unused refs.
        if (usedNow.has(key)) ref.supports = claims.slice(0,3).join(" · ");
        else ref.supports = cleanText(ref.supports || "") || indexed.slice(0,3).join(" · ");
      }
      text = replaceKnowledgeSourceReferenceSection(text, merged.map);
    }
    text = addInternalKnowledgeNotes(job, text, originalArtifact, merged.map, type);
    text = ensureReviewerChosenNewKcsReference(job, text, type);
    return text;
  }

  function parseKnowledgeSourceReferences(artifact) {
    const section = extractKnowledgeSectionRaw(artifact, ["Source References"]);
    const map = new Map();
    const legacyLines = [];

    const addReference = (key, rest) => {
      let value = String(rest || "").trim().replace(/^[-–—:|\s]+/, "").trim();
      if (!value) value = "Source reference";
      const provenanceMatch = value.match(/\|\s*Provenance:\s*([^|]+)(?=\||$)/i);
      const freshnessMatch = value.match(/\|\s*Freshness:\s*([^|]+)(?=\||$)/i);
      const supportsMatch = value.match(/\|\s*Supports:\s*([^|]+)(?=\||$)/i);
      const evidenceMatch = value.match(/\|\s*Evidence:\s*(.+)$/i);
      const provenance = cleanText(provenanceMatch?.[1] || "");
      const freshness = cleanText(freshnessMatch?.[1] || "");
      const supports = cleanText(supportsMatch?.[1] || "");
      const evidence = cleanText(evidenceMatch?.[1] || "");
      value = value.replace(/\|\s*Provenance:\s*[^|]+(?=\||$)/i, " ").replace(/\|\s*Freshness:\s*[^|]+(?=\||$)/i, " ").replace(/\|\s*Supports:\s*[^|]+(?=\||$)/i, " ").replace(/\|\s*Evidence:\s*.+$/i, " ").trim();
      const urls = [];
      const seen = new Set();
      for (const mm of value.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
        const u = mm[2].replace(/[`*_]+$/g, "");
        if (!seen.has(u)) { seen.add(u); urls.push({label:cleanText(mm[1]), url:u}); }
      }
      const nonMarkdownRest = value.replace(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g, " ");
      for (const u0 of nonMarkdownRest.match(/https?:\/\/[^\s<>"'`()]+/g) || []) {
        const u = u0.replace(/[.,;:!?]+$/g, "");
        if (!seen.has(u)) { seen.add(u); urls.push({label:"Open source", url:u}); }
      }
      let identity = value
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
        .replace(/<https?:\/\/[^>]+>/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\*\*/g, "")
        .replace(/^[-–—:|\s]+/, "")
        .trim();
      identity = cleanText(identity)
        .replace(/(?:\s+[—–-]\s*)?(?:Open source(?: \d+)?|Open Jira(?:\s+XSUP-\d+)?|Open SFDC(?:\s+\d+)?)\s*$/i, "")
        .replace(/^\[|\]$/g, "").trim() || key;
      if (!map.has(key)) map.set(key, {key, identity, urls, provenance, freshness, supports, evidence});
      else {
        const prior = map.get(key);
        if (!prior.provenance && provenance) prior.provenance = provenance;
        if (!prior.freshness && freshness) prior.freshness = freshness;
        if (!prior.supports && supports) prior.supports = supports;
        if (!prior.evidence && evidence) prior.evidence = evidence;
        for (const u of urls) if (!prior.urls.some(x=>x.url===u.url)) prior.urls.push(u);
        if ((!prior.identity || prior.identity===key) && identity) prior.identity=identity;
      }
    };

    for (const rawLine of String(section || "").split(/\r?\n/)) {
      let line = rawLine.trim();
      if (!line) continue;
      const listLine = /^[-*+]\s+/.test(line);
      line = line.replace(/^[-*+]\s+/, "").trim();
      const m = line.match(/^(?:\*\*\s*)?\[?R(\d+)\]?(?:\s*\*\*)?\s*(?:[-–—:.)|]\s*)?(.*)$/i);
      if (m) {
        addReference(`R${m[1]}`, m[2] || "");
      } else if (listLine && line && !/^(none|none identified|not available|unknown)$/i.test(cleanText(line))) {
        legacyLines.push(line);
      }
    }

    // Older working KCS/Admin Guide drafts used bullet source lists without R#.
    // Canonicalize those locally instead of failing or spending another Case Chat.
    let next = 1;
    for (const line of legacyLines) {
      while (map.has(`R${next}`)) next++;
      addReference(`R${next++}`, line);
    }
    return map;
  }

  function knowledgeUsedReferenceIds(artifact) {
    const body = removeKnowledgeSection(artifact, ["Source References", "Internal Notes — TAC Only", "Internal Notes — Full Context (Internal Only)", "Internal Notes", "TAC/SME Validation Items", "Validation Items"]);
    const out = new Set();
    for (const group of String(body || "").matchAll(/\[((?:R\d+[\s,;]*)+)\]/gi)) {
      for (const key of group[1].match(/R\d+/gi) || []) out.add(key.toUpperCase());
    }
    return out;
  }

  function knowledgeReferenceClaimMap(artifact) {
    const body = removeKnowledgeSection(artifact, ["Source References", "Related Knowledge / Documentation", "Internal Notes — TAC Only", "Internal Notes — Full Context (Internal Only)", "Internal Notes", "TAC/SME Validation Items", "Validation Items"]);
    const map = new Map();
    const sentences = String(body || "")
      .replace(/```[\s\S]*?```/g, " ")
      // Generated knowledge often places the citation just after punctuation
      // ("claim. [R1]"). Keep that marker attached to the claim before splitting.
      .replace(/([.!?])\s+(\[(?:R\d+[\s,;]*)+\])/gi, " $2$1")
      .split(/(?<=[.!?])\s+|\n+/)
      .map(x => x.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      const refs = [...sentence.matchAll(/\[((?:R\d+[\s,;]*)+)\]/gi)]
        .flatMap(m => m[1].match(/R\d+/gi) || [])
        .map(x => x.toUpperCase());
      if (!refs.length) continue;
      let claim = sentence
        .replace(/\[((?:R\d+[\s,;]*)+)\]/gi, "")
        .replace(/^[-*+\d.)\s]+/, "")
        .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1")
        .replace(/[*_`#]+/g, " ");
      claim = cleanText(claim).replace(/\s+([.!?,;:])/g, "$1");
      if (claim.length < 18) continue;
      if (/^(?:Guide|Chapter \/ Section|Target Documentation|Intended Audience):?/i.test(claim)) continue;
      if (/^(?:Current administrative|Furthermore, administrative guides|Documentation Gap)/i.test(claim)) continue;
      if (/\breferencing\b/i.test(claim) && refs.length >= 2) continue;
      if (/[:：]$/.test(claim)) continue;
      if (claim.length > 300) claim = `${claim.slice(0,297).replace(/\s+\S*$/, "")}…`;
      for (const key of refs) {
        if (!map.has(key)) map.set(key, []);
        const list = map.get(key);
        if (!list.some(x => normalizeFieldValueForCompare(x) === normalizeFieldValueForCompare(claim)) && list.length < 3) list.push(claim);
      }
    }
    return map;
  }

  function knowledgeInternalNoteReferenceIds(artifact) {
    const raw = extractKnowledgeSectionRaw(artifact, ["Internal Notes — TAC Only", "Internal Notes — Full Context (Internal Only)", "Internal Notes"]);
    return new Set((String(raw || "").match(/R\d+/gi) || []).map(x=>x.toUpperCase()));
  }

  function renderKnowledgeSourceReferences(refMap, artifact = "", job = null) {
    if (!refMap?.size) return '<section class="xa-canonical-sources"><h2>Source References</h2><p>No mapped source references were returned. SME validation is required before publication.</p></section>';
    const claimMap = knowledgeReferenceClaimMap(artifact);
    const usedRefs = knowledgeUsedReferenceIds(artifact);
    const keys = [...refMap.keys()].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));
    const items = keys.map(key=>{
      const ref=refMap.get(key);
      const links=(ref.urls||[]).map((u,i)=>{const clean=safeUrl(u.url);return clean?`<a class="xa-source-open" href="${escapeHtml(clean)}" target="_blank" rel="noopener noreferrer">${escapeHtml(u.label || (i?`Open source ${i+1}`:"Open source"))}</a>`:"";}).filter(Boolean).join(" ");
      const currentClaims = claimMap.get(key) || [];
      let supports = "";
      if (usedRefs.has(key) && currentClaims.length) supports = `<div class="xa-source-support"><b>Supports in this article:</b> ${currentClaims.map(x=>escapeHtml(x)).join(" · ")}</div>`;
      else if (!usedRefs.has(key) && cleanText(ref.supports || "")) supports = `<div class="xa-source-support"><b>Related evidence context:</b> ${escapeHtml(cleanText(ref.supports))}</div>`;
      else if (usedRefs.has(key)) supports = `<div class="xa-source-support"><b>Supports in this article:</b> This source is cited in the article; review the cited passage for the exact supported detail.</div>`;
      const sourceType = knowledgeSourceProvenance(ref);
      const provenance = `<div class="xa-source-provenance"><b>Source type:</b> ${escapeHtml(sourceType)}</div>`;
      const freshnessText = knowledgeSourceFreshness(ref, job);
      const state = knowledgeSourceReviewState(ref, job);
      const stateChip = state === "BLOCKER"
        ? '<span class="xa-source-state blocker">✕ BLOCKER SOURCE</span>'
        : state === "CASE_EVIDENCE"
          ? '<span class="xa-source-state review">⚠ CASE EVIDENCE · REVIEW CURRENTNESS FOR REUSE</span>'
          : state === "REVIEW_CURRENTNESS"
            ? '<span class="xa-source-state review">⚠ REVIEW CURRENTNESS</span>'
            : '<span class="xa-source-state current">✓ CURRENT / MAINTAINED SOURCE</span>';
      const freshness = `<div class="xa-source-freshness ${state === "CURRENT" ? "current" : state === "BLOCKER" ? "blocker" : "review"}"><b>Freshness / applicability:</b> ${escapeHtml(freshnessText)}</div>`;
      const evidence = cleanText(ref.evidence || "") ? `<div class="xa-source-evidence"><b>Evidence from source:</b> ${escapeHtml(ref.evidence)}</div>` : "";
      const linkBlock = links ? `<div class="xa-source-links">${links}</div>` : `<div class="xa-source-links"><span class="xa-ref-missing">Direct link not available in current evidence</span></div>`;
      return `<li id="xa-source-${escapeHtml(key)}" class="xa-source-ref-entry ${state === "BLOCKER" ? "xa-review-source blocker" : (state === "REVIEW_CURRENTNESS" || state === "CASE_EVIDENCE") ? "xa-review-source review" : ""}"><strong>[${escapeHtml(key)}]</strong> ${stateChip} <span>${renderInlineMarkdown(ref.identity,{linkSourceRefs:false})}</span>${provenance}${freshness}${supports}${evidence}${linkBlock}</li>`;
    }).join("");
    return `<section class="xa-canonical-sources"><h2>Source References</h2><p class="small">Each reference shows provenance and currentness. Older sources are not automatically wrong; when current applicability is not established, the affected claim is marked for review rather than silently discarded. AI/generated synthesis is never authoritative product evidence.</p><ol class="xa-source-list">${items}</ol></section>`;
  }
  function cleanAtGlanceSection(value) {
    return String(value || "").split(/\r?\n/).filter(line=>{
      const t=line.trim();
      if (!t || /^---+$/.test(t)) return false;
      return !/^\*\*(Draft Status|Generated From|Knowledge Type):\*\*/i.test(t);
    }).join("\n").trim();
  }

  function deterministicKnowledgeQualityChecks(artifact, job, requestedReadiness = "") {
    const text = stripInternalKnowledgeMetadata(artifact);
    const issues = [];
    const type = job.knowledgeArtifactType || knowledgeArtifactType(job);

    if (text.length < 180) issues.push("artifact is incomplete");
    if (job?.forceCreateNewKcs && type === "KCS_DRAFT" && effectiveKcsArtifactType(text, "KCS_DRAFT") === "KCS_UPDATE") {
      issues.push("reviewer requested a separate new KCS but the final artifact is an existing-KCS update proposal");
    }
    if (job?.forceCreateNewKcs && type === "KCS_DRAFT") {
      const related = relatedExistingKcsRefs(text);
      if (!related.length) {
        issues.push("reviewer-selected separate new KCS does not include the related existing Salesforce KCS as a canonical Source References entry");
      }
    }
    if (text.includes(REUSE_META_PREFIX)) issues.push("internal reuse metadata is visible");
    if (/\b(?:QUALITY_STATUS|VALIDATED_ARTIFACT_READINESS|QUALITY_SUMMARY|MATERIAL_VALIDATION_ITEMS|SPECIAL_REVIEW_ITEMS)\s*:/i.test(text) || /---\s*FINAL ARTIFACT\s*---/i.test(text)) issues.push("quality-control preamble is visible in the final artifact");
    if (/@@[A-Z][A-Z0-9_:-]*@@/i.test(text)) issues.push("unresolved internal placeholder/token is visible");
    if (/\[(?:inference|from case data|derived analysis)\]/i.test(text)) issues.push("raw internal provenance marker is visible");
    if (/\[(?:insert|todo|tbd|placeholder)[^\]]*\]/i.test(text)) issues.push("unresolved editorial placeholder is visible");

    const fences = (text.match(/```/g) || []).length;
    if (fences % 2 !== 0) issues.push("Markdown code fence is not balanced");

    const requiredHeadingSets = {
      KCS_UPDATE: ["Existing Knowledge Reference", "Current Coverage", "Gap Identified", "Sections to Update", "Proposed Additions / Changes", "Proposed Updated KCS — Standalone Article Draft", "Source References"],
      DOC_UPDATE: ["Target Documentation", "Documentation Gap", "Proposed Documentation Text", "Source References"],
      RUNBOOK: ["Trigger / When to Use", "Objective", "Investigation Workflow", "Decision Points", "Source References"],
      KNOWN_ISSUE: ["Issue", "Symptoms", "Cause / Limitation", "Proposed Release Note / Known Issue Text", "Source References"]
    };
    if (type === "KCS_DRAFT") {
      const hasHeading = re => re.test(text);
      if (!hasHeading(/(?:^|\n)##\s+(?:Introduction|Overview|Introduction \/ Overview)\s*(?:\n|$)/i)) issues.push("missing required KCS role: Introduction / Overview");
      if (!hasHeading(/(?:^|\n)##\s+(?:Symptoms?(?: \/ (?:Issue|Error))?|Issue|Problem|Question|Task \/ Goal|Task|Scenario|Use Case|Purpose)\s*(?:\n|$)/i)) issues.push("missing required KCS role: issue/symptom/task context");
      if (!hasHeading(/(?:^|\n)##\s+(?:Resolution(?: \/ Fix)?|Resolution \/ Workaround \/ Recommended Action|Workaround|Recommended Action|Procedure(?: \/ Steps)?|Steps|Expected Behavior|Cause \/ Explanation|Cause|Explanation|Background \/ What This Means|What This Means)\s*(?:\n|$)/i)) issues.push("missing required KCS role: substantive explanation/action/procedure");
      if (!hasHeading(/(?:^|\n)##\s+Source References\s*(?:\n|$)/i)) issues.push("missing required section: Source References");
    } else {
      for (const heading of requiredHeadingSets[type] || []) {
        const re = new RegExp(`(?:^|\\n)##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:\\n|$)`, "i");
        if (!re.test(text)) issues.push(`missing required section: ${heading}`);
      }
    }

    const generatedFrom = extractField(text, "Generated From");
    if (generatedFrom && !generatedFrom.toUpperCase().includes(String(job.xsup).toUpperCase())) {
      issues.push(`artifact targets ${generatedFrom}, not ${job.xsup}`);
    }

    const keywordSection = extractKnowledgeSection(text, ["Search Keywords"]);
    if (keywordSection && /\bXSUP-\d+\b/i.test(keywordSection)) {
      issues.push("originating/support ticket ID is present in reusable Search Keywords");
    }
    if (keywordSection && job.caseNumber && new RegExp(`\\b${String(job.caseNumber).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(keywordSection)) {
      issues.push("Salesforce case ID is present in reusable Search Keywords");
    }

    const sourceSection = extractKnowledgeSection(text, ["Source References"]);
    if (!sourceSection || /^(none|not available|unknown)$/i.test(cleanText(sourceSection))) {
      issues.push("Source References section does not identify supporting underlying sources");
    } else if (/^(?:[-*]\s*)?(?:TACO|Case Chat)(?:\s+analysis)?[.!]?$/i.test(cleanText(sourceSection))) {
      issues.push("Source References cites the synthesis mechanism instead of an underlying source");
    }
    const mappedRefs = parseKnowledgeSourceReferences(text);
    const usedRefs = knowledgeUsedReferenceIds(text);
    const missingRefs = [...usedRefs].filter(key=>!mappedRefs.has(key));
    if (missingRefs.length) issues.push(`Source References missing canonical mappings for ${missingRefs.join(", ")}`);
    if (usedRefs.size && !mappedRefs.size) issues.push("Source References could not be parsed into canonical R# mappings");

    if ((type === "KCS_DRAFT" || type === "KCS_UPDATE") && /according to the (?:root cause analysis|rca|investigation)/i.test(text)) {
      issues.push("reusable KCS uses case/RCA-report voice instead of neutral article wording");
    }
    if ((type === "KCS_DRAFT" || type === "KCS_UPDATE") && /(?:^|\n)##\s+(?:Knowledge Reuse Basis|Internal Drafting Note|Knowledge Channel \/ Reuse Note)/i.test(text)) {
      issues.push("KCS contains authoring/process metadata instead of reader-facing article content");
    }
    if (type === "KCS_UPDATE") {
      const existingRef = extractKnowledgeSection(text, ["Existing Knowledge Reference"]);
      if (!existingRef || /^(none|not identified|unknown|n\/a)/i.test(cleanText(existingRef))) {
        issues.push("existing KCS update target is not specifically identified");
      }
      const sectionPlan = extractKnowledgeSection(text, ["Sections to Update"]);
      if (sectionPlan && !/\b(?:ADD|REPLACE|CLARIFY)\b/i.test(sectionPlan)) {
        issues.push("Sections to Update does not identify ADD / REPLACE / CLARIFY actions");
      }
      const mergedMarker = text.search(/(?:^|\n)##\s+Proposed Updated KCS\s*[—-]\s*Standalone Article Draft\s*(?:\n|$)/i);
      if (mergedMarker >= 0) {
        const mergedTail = text.slice(mergedMarker).replace(/^[\s\S]*?\n/, "");
        const nextOuter = mergedTail.search(/(?:^|\n)##\s+(?:Troubleshooting \/ Verification Improvements|Source References|TAC\/SME Validation Items)\s*(?:\n|$)/i);
        const merged = (nextOuter >= 0 ? mergedTail.slice(0, nextOuter) : mergedTail).trim();
        const sectionCount = (merged.match(/(?:^|\n)##\s+[^\n]+/g) || []).length;
        if (merged.length < 350 || !/(?:^|\n)#\s+[^#\n]+/m.test(merged) || sectionCount < 2) {
          issues.push("updated KCS does not include a complete standalone merged article draft");
        }
      }
    }

    const materialValidation = hasMaterialValidationItems(text);
    let readiness = normalizeDecision(requestedReadiness);
    if (!["READY", "DRAFTABLE", "NOT READY"].includes(readiness)) readiness = "DRAFTABLE";
    if (materialValidation && readiness === "READY") readiness = "DRAFTABLE";
    if (issues.length && readiness === "READY") readiness = "DRAFTABLE";

    const blocking = issues.some(issue =>
      /incomplete|internal reuse metadata|quality-control preamble|unresolved internal placeholder|raw internal provenance|unresolved editorial placeholder|code fence|missing required (?:section|KCS role)|authoring\/process metadata|artifact targets|Source References|existing KCS update target|updated KCS does not include|Sections to Update does not/i.test(issue)
    );

    if (blocking) readiness = "NOT READY";

    return {
      valid: !blocking,
      issues,
      readiness,
      materialValidation
    };
  }

  function parseSpecialReviewItems(header) {
    const items = [];
    for (const line of String(header || "").split(/\r?\n/)) {
      const m = line.trim().match(/^(REVIEW|BLOCKER)\|(.+)$/i);
      if (!m) continue;
      const status = m[1].toUpperCase();
      const parts = {};
      for (const token of m[2].split("|")) {
        const eq = token.indexOf("=");
        if (eq < 1) continue;
        parts[token.slice(0,eq).trim()] = token.slice(eq+1).trim();
      }
      const what = cleanText(parts.What || "");
      const why = cleanText(parts.Why || "");
      if (!what || !why || /^(none|none identified|no validation items|final sme review|ready for publication review)$/i.test(what)) continue;
      const refs = (parts.Refs || "").match(/R\d+/gi) || [];
      const outcome = cleanText(parts.Outcome || "");
      const conflict = cleanText(parts.Conflict || "");
      const reviewKind = cleanText(parts.Kind || parts.Type || "").toUpperCase();
      items.push({status, target:cleanText(parts.Target || "NONE"), owner:cleanText(parts.Owner || ""), what, conflict, why, outcome, reviewKind, refs:[...new Set(refs.map(x=>x.toUpperCase()))]});
    }
    return items;
  }

  function parseKnowledgeQualityResponse(rawAnswer, job) {
    const raw = String(rawAnswer || "").trim();
    const delimiterIndex = raw.indexOf(KNOWLEDGE_FINAL_DELIMITER);
    if (delimiterIndex < 0) return {valid:false, reason:`quality reviewer did not return ${KNOWLEDGE_FINAL_DELIMITER}`};
    const header = raw.slice(0, delimiterIndex).trim();
    const artifact = stripInternalKnowledgeMetadata(raw.slice(delimiterIndex + KNOWLEDGE_FINAL_DELIMITER.length));
    const getHeader = name => cleanText(header.match(new RegExp(`^${name}:\\s*(.+)$`, "im"))?.[1] || "");
    const status = normalizeDecision(getHeader("QUALITY_STATUS"));
    const requestedReadiness = normalizeDecision(getHeader("VALIDATED_ARTIFACT_READINESS"));
    const summary = getHeader("QUALITY_SUMMARY");
    const validationItems = getHeader("MATERIAL_VALIDATION_ITEMS");
    const specialReviewItems = parseSpecialReviewItems(header);
    if (!["PASS","PASS_WITH_VALIDATION","FAIL"].includes(status)) return {valid:false, reason:"quality reviewer returned invalid QUALITY_STATUS"};
    const checks = deterministicKnowledgeQualityChecks(artifact, job, requestedReadiness);
    let readiness = checks.readiness;
    if (status === "FAIL") readiness = "NOT READY";
    if ((status === "PASS_WITH_VALIDATION" || specialReviewItems.some(x=>x.status==="REVIEW")) && readiness === "READY") readiness = "DRAFTABLE";
    if (specialReviewItems.some(x=>x.status==="BLOCKER")) readiness = "NOT READY";
    const finalStatus = readiness === "DRAFTABLE" && status === "PASS" ? "PASS_WITH_VALIDATION" : status;
    const publicationReview = specialReviewItems.some(x=>x.status==="BLOCKER") ? "BLOCKER" : specialReviewItems.length ? "REVIEW" : "";
    if (finalStatus === "FAIL" || !checks.valid) {
      return {valid:false, reason:[summary||"quality gate did not approve the artifact",...checks.issues].filter(Boolean).join(" · "), status:finalStatus, readiness:"NOT READY", summary, validationItems, artifact, issues:checks.issues, specialReviewItems, publicationReview};
    }
    // Preserve a usable draft even when a review/blocker remains. Human publication status communicates the issue.
    return {valid:true, status:finalStatus, readiness, summary, validationItems, artifact, issues:checks.issues, specialReviewItems, publicationReview};
  }

  // ===========================================================================
  // SMART CASE CHAT REUSE
  // ===========================================================================
  // UI changes do not force a new AI run. Reuse schemas change
  // only when the audit/knowledge method itself materially changes.
  function stableHashText(value) {
    const s = String(value ?? "");
    let h1 = 0xdeadbeef ^ s.length;
    let h2 = 0x41c6ce57 ^ s.length;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
         Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
         Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, "0") +
           (h1 >>> 0).toString(16).padStart(8, "0");
  }

  function evidenceReuseSignature(evidence) {
    return stableHashText(
      (evidence?.records || []).map(r => [
        r.type || "",
        r.dom_id || "",
        r.timestamp_iso || r.timestamp_ms || "",
        r.original_text || ""
      ].join("\u001f")).join("\u001e")
    );
  }

  function caseContextReuseSignature(evidence) {
    return stableHashText(JSON.stringify({
      structured_fields: evidence?.structured_fields || [],
      case_summary_text: evidence?.case_summary_text || "",
      jira_ticket_event: evidence?.jira_ticket_event?.original_text || ""
    }));
  }

  function selectedEvidenceReuseSignature(selected) {
    const rows = [
      ...(selected?.jira || []),
      ...(selected?.internal || []),
      ...(selected?.tac_public || []),
      ...(selected?.customer_public || [])
    ];
    return stableHashText(rows.map(r => [
      r.type || "",
      r.dom_id || "",
      r.timestamp_iso || r.timestamp_ms || "",
      r.original_text || ""
    ].join("\u001f")).join("\u001e"));
  }

  function tacoReuseSignature(report) {
    if (!reportReady(report)) return "";
    return stableHashText(JSON.stringify({
      marker: reportMarker(report),
      verified_conclusion: report?.verified_conclusion || "",
      final_report: report?.final_report || "",
      rca: report?.result?.rca || "",
      guidance: report?.result?.guidance || "",
      hypotheses: report?.hypotheses || [],
      citations: (report?.result?.citations || report?.citations || []).map(c => ({
        url: c?.url || c?.link || "",
        title: c?.title || "",
        quote: c?.quote || c?.q || c?.text || ""
      })),
      recommended_actions: report?.result?.recommended_actions || []
    }));
  }

  function tokenValue(value) {
    return String(value ?? "")
      .replace(/\s+/g, "_")
      .replace(/[^A-Za-z0-9_.:-]/g, "")
      .slice(0, 160) || "none";
  }

  function buildReuseMarker(meta) {
    return `${REUSE_META_PREFIX} ${Object.entries(meta || {})
      .filter(([,v]) => v !== undefined && v !== null && v !== "")
      .map(([k,v]) => `${k}=${tokenValue(v)}`)
      .join(" ")}`;
  }

  function appendReuseMarker(prompt, meta) {
    return `${String(prompt || "").trim()}\n\n${buildReuseMarker(meta)}`;
  }

  function parseReuseMarker(question) {
    const q = String(question || "");
    const idx = q.lastIndexOf(REUSE_META_PREFIX);
    if (idx < 0) return null;
    const line = q.slice(idx).split(/\r?\n/, 1)[0];
    const out = {};
    for (const m of line.matchAll(/([A-Za-z][A-Za-z0-9_]*)=([^\s]+)/g)) {
      out[m[1]] = m[2];
    }
    return Object.keys(out).length ? out : null;
  }

  function buildAuditReuseMeta(job, selected) {
    const evidence = evidenceReuseSignature(job.evidence);
    const context = caseContextReuseSignature(job.evidence);
    const focused = selectedEvidenceReuseSignature(selected);
    const taco = tacoReuseSignature(job.report);
    const evidenceTs = Number(job.latestCaseEvidenceAt) || 0;
    const tacoTs = Number(job.tacoAnalysisAt) || 0;
    const records = job.evidence?.records?.length || 0;
    const profile = getProductProfile(job.productKey);
    const product = job.productKey || "UNSELECTED";
    const policy = stableHashText(profile?.policy || "");

    const fingerprint = stableHashText(JSON.stringify({
      schema: AUDIT_REUSE_SCHEMA,
      xsup: job.xsup,
      caseNumber: job.caseNumber,
      investigationId: job.investigationId,
      product,
      policy,
      evidence,
      context,
      focused,
      taco,
      evidenceTs,
      tacoTs
    }));

    return {
      type: "audit",
      schema: AUDIT_REUSE_SCHEMA,
      fingerprint,
      product,
      policy,
      evidence,
      context,
      focused,
      taco,
      evidenceTs,
      tacoTs,
      records
    };
  }

  function buildKnowledgeReuseMeta(job) {
    const auditHash = stableHashText(job.auditAnswer || "");
    const action = normalizeDecision(job.knowledgeAction);
    const artifact = job.knowledgeArtifactType || knowledgeArtifactType(job);
    const readiness = normalizeDecision(job.artifactReadiness);

    const fingerprint = stableHashText(JSON.stringify({
      schema: KNOWLEDGE_REUSE_SCHEMA,
      xsup: job.xsup,
      caseNumber: job.caseNumber,
      investigationId: job.investigationId,
      product: job.productKey || "UNSELECTED",
      auditFingerprint: job.auditFingerprint || "",
      auditHash,
      action,
      artifact,
      readiness,
      workflow: job.directKnowledgeOnly ? "DIRECT_KCS" : "RETROSPECTIVE_KNOWLEDGE",
      reviewerChoice: job?.forceCreateNewKcs ? "CREATE_NEW_ANYWAY" : "DEFAULT"
    }));

    return {
      type: "knowledge",
      schema: KNOWLEDGE_REUSE_SCHEMA,
      fingerprint,
      product: job.productKey || "UNSELECTED",
      audit: job.auditFingerprint || auditHash,
      action,
      artifact,
      readiness,
      workflow: job.directKnowledgeOnly ? "DIRECT_KCS" : "RETROSPECTIVE_KNOWLEDGE",
      reviewerChoice: job?.forceCreateNewKcs ? "CREATE_NEW_ANYWAY" : "DEFAULT"
    };
  }

  async function getFollowupHistory(caseNumber, investigationId, options = {}) {
    const url = `/taco/pilot/investigation/${caseNumber}/followup?investigation_id=${encodeURIComponent(investigationId)}`;
    const r = options.quick ? await requestQuickGet(url) : await request(url);
    const j = await r.json();
    if (j?.success === false || j?.error) {
      throw new Error(j?.error || "Case Chat history unavailable.");
    }
    return j?.data || j;
  }

  function collectFollowupHistoryItems(payload) {
    const found = [];
    const seen = new Set();

    function walk(v) {
      if (!v || typeof v !== "object" || seen.has(v)) return;
      seen.add(v);

      const looksLikeFollowup =
        typeof v.question === "string" ||
        typeof v.answer === "string" ||
        typeof v.status === "string";

      const rawId =
        v.followup_id ??
        (looksLikeFollowup ? v.id : null);

      if (
        rawId != null &&
        /^\d+$/.test(String(rawId)) &&
        looksLikeFollowup
      ) {
        found.push({
          id: Number(rawId),
          id_source: v.followup_id != null ? "followup_id" : "id",
          question: typeof v.question === "string" ? v.question : "",
          answer: typeof v.answer === "string" ? v.answer : "",
          status: String(v.status || "").toLowerCase(),
          created_at: v.created_at || v.createdAt || "",
          updated_at: v.updated_at || v.updatedAt || "",
          completed_at: v.completed_at || v.completedAt || ""
        });
      }

      for (const val of Object.values(v)) walk(val);
    }

    walk(payload);

    const uniq = new Map();
    for (const item of found) {
      const previous = uniq.get(item.id);
      if (!previous || JSON.stringify(item).length > JSON.stringify(previous).length) {
        uniq.set(item.id, item);
      }
    }
    return [...uniq.values()];
  }

  function followupTimestamp(item, statusData = null) {
    return timestampFromObject(
      statusData || {},
      {
        completed_at: item?.completed_at,
        updated_at: item?.updated_at,
        created_at: item?.created_at
      }
    );
  }

  function sortFollowupsNewest(items) {
    return [...items].sort((a,b) => {
      const bt = followupTimestamp(b) || 0;
      const at = followupTimestamp(a) || 0;
      return bt !== at ? bt - at : Number(b.id || 0) - Number(a.id || 0);
    });
  }

  function classifyCaseChatFollowup(item) {
    const q = String(item?.question || "").trim();
    const meta = parseReuseMarker(q);
    const metaType = String(meta?.type || "").toLowerCase();
    if (metaType === "audit") return "audit";
    if (metaType === "knowledge_draft") return "knowledge_draft";
    if (metaType === "knowledge") return "knowledge";

    // Classify from the OUTER prompt header first. Knowledge prompts embed the
    // retrospective text, so scanning the full question for audit labels can
    // incorrectly turn a KCS/Admin Guide follow-up into an Audit.
    const head = q.slice(0, 2200);
    if (/^KNOWLEDGE\s+(?:ENRICHMENT\s*\+\s*DRAFT\s+GENERATION|ARTIFACT\s+GENERATION)/i.test(head)) {
      return "knowledge_draft";
    }
    if (/^KNOWLEDGE\s+(?:QUALITY\s+REVIEW\s*\+\s*FINALIZATION|FINAL\s+ARTIFACT\s+REPAIR)/i.test(head)) {
      return "knowledge";
    }
    if (/^XSUP\s+RETROSPECTIVE\s+AUDIT/i.test(head)) return "audit";
    if (/^CURRENT\s+SAVED\s+JIRA\s+FIELD\s+LOOKUP/i.test(head)) return "field_lookup";
    return "other";
  }

  function knowledgeArtifactTypeFromFollowup(item) {
    const q = String(item?.question || "");
    const meta = parseReuseMarker(q);
    const fromMeta = String(meta?.artifact || "").toUpperCase();
    if (["KCS_DRAFT", "KCS_UPDATE", "DOC_UPDATE", "RUNBOOK", "KNOWN_ISSUE"].includes(fromMeta)) return fromMeta;

    const requested = cleanText(
      extractField(q, "Requested Artifact") ||
      extractField(q, "Artifact Type") ||
      ""
    );
    const action = cleanText(extractField(q, "Primary Knowledge Action") || "");
    const normalizedRequested = normalizeDecision(requested);
    if (/KCS UPDATE/.test(normalizedRequested)) return "KCS_UPDATE";
    if (/KCS/.test(normalizedRequested)) return "KCS_DRAFT";
    if (/ADMIN\s*\/?\s*TECH GUIDE|DOC(?:UMENTATION)? UPDATE/.test(normalizedRequested)) return "DOC_UPDATE";
    if (/RUNBOOK/.test(normalizedRequested)) return "RUNBOOK";
    if (/KNOWN ISSUE|RELEASE NOTE/.test(normalizedRequested)) return "KNOWN_ISSUE";
    return knowledgeArtifactTypeFromAction(action, "READY");
  }

  function findReusableFollowupCandidate(history, {type, fingerprint, legacyQuestion = ""}) {
    const items = sortFollowupsNewest(collectFollowupHistoryItems(history));

    const fingerprintMatch = items.find(item => {
      const meta = parseReuseMarker(item.question);
      return meta?.type === type && meta?.fingerprint === fingerprint;
    });
    if (fingerprintMatch) return {...fingerprintMatch, reuse_match: "fingerprint"};

    // Exact-prompt fallback can safely reuse an unmarked request only when the full prompt is identical.
    if (legacyQuestion) {
      const legacy = items.find(item =>
        String(item.question || "").trim() === String(legacyQuestion).trim()
      );
      if (legacy) return {...legacy, reuse_match: "legacy-exact"};
    }

    return null;
  }

  function latestLikelyAuditorFollowup(history, type, xsup) {
    const items = sortFollowupsNewest(collectFollowupHistoryItems(history));
    const ticket = String(xsup || "").toUpperCase();

    return items.find(item => {
      const q = String(item.question || "");
      if (ticket && !q.toUpperCase().includes(ticket)) return false;
      const outer = classifyCaseChatFollowup(item);
      if (type === "audit") return outer === "audit";
      if (type === "knowledge_draft") return outer === "knowledge_draft";
      return outer === "knowledge" || outer === "knowledge_draft";
    }) || null;
  }

  function latestAuditorFollowup(history, type) {
    return sortFollowupsNewest(collectFollowupHistoryItems(history))
      .find(item => {
        const metaType = String(parseReuseMarker(item.question)?.type || "");
        if (metaType === type) return true;
        const outer = classifyCaseChatFollowup(item);
        if (type === "audit") return outer === "audit";
        if (type === "knowledge_draft") return outer === "knowledge_draft";
        return outer === "knowledge" || outer === "knowledge_draft";
      }) || null;
  }


  function currentSourceBoundary(job, type) {
    // Cross-version compatible reuse is based on ORIGINAL Jira/SFDC evidence.
    // A later TACO re-render or a newer Auditor prompt/schema is not, by itself,
    // a reason to spend another Case Chat call when no source evidence changed.
    return Number(job.latestCaseEvidenceAt) || 0;
  }

  function candidateProductMatches(item, job) {
    const meta = parseReuseMarker(item?.question || "");
    if (meta?.product && meta.product !== "UNSELECTED" && meta.product !== job.productKey) {
      return false;
    }

    const answerProduct = normalizeProductKey(extractField(item?.answer || "", "Product Family"));
    if (answerProduct && answerProduct !== job.productKey) return false;

    const questionProduct = normalizeProductKey(
      extractField(item?.question || "", "Product") ||
      extractField(item?.question || "", "Product Family")
    );
    if (questionProduct && questionProduct !== job.productKey) return false;

    return true;
  }

  function candidateKnowledgeInputsMatch(item, job) {
    const q = String(item?.question || "");
    const currentAction = normalizeDecision(job.knowledgeAction);
    const questionAction = normalizeDecision(extractField(q, "Primary Knowledge Action"));
    if (questionAction && currentAction && questionAction !== currentAction) return false;

    const currentArtifact = job.knowledgeArtifactType || knowledgeArtifactType(job);
    const observedArtifact = knowledgeArtifactTypeFromFollowup(item);
    if (observedArtifact && currentArtifact && observedArtifact !== currentArtifact) return false;

    const marker = parseReuseMarker(q);
    const currentChoice = job?.forceCreateNewKcs ? "CREATE_NEW_ANYWAY" : "DEFAULT";
    const priorChoice = marker?.reviewerChoice || "DEFAULT";
    if (priorChoice !== currentChoice) return false;

    return true;
  }

  function validateAuditKnowledgeDecisionFields(answer) {
    const a = String(answer || "");
    const primary = normalizeDecision(extractField(a, "Primary Knowledge Action"));
    const secondary = normalizeDecision(extractField(a, "Secondary Knowledge Action") || "NONE");
    const readiness = normalizeDecision(extractField(a, "Artifact Readiness"));
    const supported = new Set([
      "CREATE KCS", "UPDATE EXISTING KCS", "UPDATE ADMIN/TECH GUIDE",
      "CREATE/UPDATE RUNBOOK", "KNOWN ISSUE/RELEASE NOTE",
      "NO KNOWLEDGE ACTION", "UNDETERMINED", "NOT APPLICABLE", "NONE"
    ]);
    if (!supported.has(primary)) return {valid:false, reason:`unsupported Primary Knowledge Action: ${primary || "missing"}`};
    if (!supported.has(secondary)) return {valid:false, reason:`unsupported Secondary Knowledge Action: ${secondary || "missing"}`};

    const terminal = new Set(["NO KNOWLEDGE ACTION", "UNDETERMINED", "NOT APPLICABLE", "NONE"]);
    if (terminal.has(primary) && !terminal.has(secondary)) {
      return {valid:false, reason:"terminal Primary Knowledge Action cannot have a generating Secondary Knowledge Action"};
    }
    if (primary === secondary && !terminal.has(primary)) {
      return {valid:false, reason:"Primary and Secondary Knowledge Action duplicate the same artifact destination"};
    }

    const actions = [primary, secondary].filter(x => !terminal.has(x));
    if (actions.length && !["READY", "DRAFTABLE", "NOT READY"].includes(readiness)) {
      return {valid:false, reason:"knowledge action is present but Artifact Readiness is missing/invalid"};
    }
    if (!actions.length && primary === "NO KNOWLEDGE ACTION" && readiness !== "NOT APPLICABLE") {
      return {valid:false, reason:"NO KNOWLEDGE ACTION requires Artifact Readiness = NOT APPLICABLE"};
    }

    if (actions.includes("CREATE KCS")) {
      const kcsMatch = normalizeDecision(extractField(a, "Existing KCS Content Match"));
      if (kcsMatch === "DIRECT") {
        return {valid:false, reason:"CREATE KCS conflicts with Existing KCS Content Match = DIRECT; inspect the matching Salesforce KCS and route to UPDATE EXISTING KCS or correct the content-match finding"};
      }
    }

    if (actions.includes("UPDATE EXISTING KCS")) {
      const candidate = cleanText(extractFieldBlock(a, "Existing KCS Candidate"));
      const match = normalizeDecision(extractField(a, "Existing KCS Content Match"));
      const covered = cleanText(extractFieldBlock(a, "Existing KCS Covered Content"));
      const missing = cleanText(extractFieldBlock(a, "Existing KCS Missing Content"));
      const hasIdentity = /\bka[A-Za-z0-9]{8,}\b/i.test(candidate) || /https?:\/\/[^\s]*(?:Knowledge__kav|KCSArticleDetail|knowledgebase)/i.test(candidate);
      if (!candidate || /^(?:none|none identified|not applicable|undetermined)$/i.test(candidate) || !hasIdentity) {
        return {valid:false, reason:"UPDATE EXISTING KCS requires an inspected specific Salesforce KCS candidate with article ID/link"};
      }
      if (!["DIRECT", "PARTIAL"].includes(match)) {
        return {valid:false, reason:"UPDATE EXISTING KCS requires Existing KCS Content Match = DIRECT or PARTIAL"};
      }
      if (!covered || /^(?:not applicable|none|undetermined)$/i.test(covered)) {
        return {valid:false, reason:"UPDATE EXISTING KCS requires the content already covered by the inspected article"};
      }
      if (!missing || /^(?:not applicable|none|undetermined)$/i.test(missing)) {
        return {valid:false, reason:"UPDATE EXISTING KCS requires the material missing content to be identified"};
      }
    }

    if (actions.includes("UPDATE ADMIN/TECH GUIDE")) {
      const needed = normalizeDecision(extractField(a, "Admin/Tech Guide Needed"));
      const gap = cleanText(extractFieldBlock(a, "Admin/Tech Guide Gap Evidence"));
      const target = cleanText(extractFieldBlock(a, "Target Knowledge Location"));
      if (needed !== "YES") {
        return {valid:false, reason:"UPDATE ADMIN/TECH GUIDE requires Admin/Tech Guide Needed = YES"};
      }
      if (!gap || /^(?:not established|none|not applicable|undetermined)$/i.test(gap)) {
        return {valid:false, reason:"UPDATE ADMIN/TECH GUIDE requires concrete maintained-documentation gap evidence"};
      }
      if (!target || /^(?:unknown|undetermined|none|not applicable)$/i.test(target)) {
        return {valid:false, reason:"UPDATE ADMIN/TECH GUIDE requires an actionable maintained guide/page/section target"};
      }
    }

    return {valid:true};
  }

  function validateSourceCurrentAuditAnswer(answer, job) {
    const a = String(answer || "").trim();
    if (isTransientCaseChatAnswer(a)) return {valid:false, transient:true, reason:"temporary system-error answer"};
    if (hasUnbalancedMarkdownFence(a)) return {valid:false, reason:"answer contains an unclosed Markdown code fence"};
    if (a.length < 500) return {valid:false, reason:"answer is too short to be a substantive retrospective"};

    const target = extractField(a, "Target Ticket");
    if (target && !target.toUpperCase().includes(String(job.xsup || "").toUpperCase())) {
      return {valid:false, reason:`answer targets ${target}, not ${job.xsup}`};
    }
    const reportedProduct = normalizeProductKey(extractField(a, "Product Family"));
    if (reportedProduct && job.productKey && reportedProduct !== job.productKey) {
      return {valid:false, reason:"product does not match the selected product"};
    }

    const issue = extractFieldBlock(a, "Reported Issue") || extractFieldBlock(a, "Issue");
    const conclusion = extractFieldBlock(a, "Technical Conclusion") || extractFieldBlock(a, "What happened / finding");
    const hasDecision = [
      "Resolution Recommended Value", "RCA Recommended Value", "Fix Type Recommended Value",
      "Flag / Label Recommended Value", "Label / Flag Recommended Value", "Support Action Summary"
    ].some(label => Boolean(extractField(a, label)));
    if (!issue || !conclusion || !hasDecision) {
      return {valid:false, reason:"answer does not contain enough issue, finding and field-decision content for the current renderer"};
    }
    const knowledgeValidation = validateAuditKnowledgeDecisionFields(a);
    if (!knowledgeValidation.valid) return knowledgeValidation;
    return {valid:true};
  }

  function findCurrentCompatibleCompletedFollowup(history, { job, type }) {
    const boundary = currentSourceBoundary(job, type);
    const items = sortFollowupsNewest(collectFollowupHistoryItems(history));
    const skipped = [];

    for (const item of items) {
      if (String(item.status || "").toLowerCase() !== "completed" || !item.answer) continue;
      const completedAt = followupTimestamp(item) || 0;
      if (boundary && (!completedAt || completedAt < boundary)) continue;

      const q = String(item.question || "");
      if (!q.toUpperCase().includes(String(job.xsup || "").toUpperCase())) continue;
      if (!candidateProductMatches(item, job)) continue;

      const outer = classifyCaseChatFollowup(item);
      if (type === "audit") {
        if (outer !== "audit") continue;
        const auditMarker = parseReuseMarker(q);
        if (!auditMarker || auditMarker.schema !== AUDIT_REUSE_SCHEMA) continue;
        const validation = validateSourceCurrentAuditAnswer(item.answer, job);
        if (validation.valid) return {...item, source_current_skipped: skipped};
        if (validation.transient) skipped.push({id:item.id, reason:"temporary system error"});
        continue;
      }

      if (type === "knowledge_draft") {
        if (outer !== "knowledge_draft") continue;
      } else if (outer !== "knowledge" && outer !== "knowledge_draft") {
        continue;
      }
      if (!candidateKnowledgeInputsMatch(item, job)) continue;

      // A quality-finalized artifact is preferred. For cost-safe cross-version
      // reuse, an older complete artifact/draft of the exact requested type is
      // also acceptable when no source evidence changed; quality is not re-run
      // unless the reviewer explicitly regenerates it.
      const quality = parseKnowledgeQualityResponse(item.answer, job);
      if (quality.valid) return {...item, source_current_skipped: skipped};
      const legacy = validateReusableKnowledgeAnswer(item.answer, job, "knowledge_draft");
      if (legacy.valid) {
        const artifact = stripInternalKnowledgeMetadata(item.answer || "");
        const refs = parseKnowledgeSourceReferences(artifact);
        const used = knowledgeUsedReferenceIds(artifact);
        if (type === "knowledge" && (knowledgeArtifactType(job) === "KCS_DRAFT" || knowledgeArtifactType(job) === "DOC_UPDATE" || knowledgeArtifactType(job) === "KCS_UPDATE") && refs.size && !used.size) {
          skipped.push({id:item.id, reason:"source list exists but claim-level R# citations are missing"});
          continue;
        }
        return {...item, source_current_skipped: skipped};
      }
      if (legacy.transient) skipped.push({id:item.id, reason:"temporary system error"});
    }
    return null;
  }

  function reuseInvalidationReason(previous, current, type) {
    if (!previous) return `No prior ${type} result with reusable metadata was found.`;

    const old = parseReuseMarker(previous.question);
    if (!old) {
      return "A previous Case Chat exists, but reusable fingerprint metadata is unavailable and its exact prompt does not match.";
    }

    if (old.schema !== current.schema) {
      return `${type === "audit" ? "Audit" : "Knowledge"} method/schema changed (${old.schema || "unknown"} → ${current.schema}).`;
    }

    if (type === "audit") {
      if (old.product !== current.product) return `Selected product changed (${old.product || "unknown"} → ${current.product || "unknown"}).`;
      if (old.policy !== current.policy) return "Product retrospective policy changed.";
      if (old.context !== current.context) return "Structured case/taxonomy context changed.";
      if (old.evidence !== current.evidence) {
        const previousDate = formatTimestamp(Number(old.evidenceTs));
        const currentDate = formatTimestamp(Number(current.evidenceTs));
        return `Original Jira/SFDC evidence changed${currentDate !== "Unknown" ? ` · latest now ${currentDate}` : ""}${previousDate !== "Unknown" ? ` · previous ${previousDate}` : ""}.`;
      }
      if (old.taco !== current.taco) return "Current TACO synthesized report changed.";
      if (old.focused !== current.focused) return "Focused evidence selected for the audit changed.";
      return "Audit inputs changed; a fresh Case Chat result is required.";
    }

    if (old.product !== current.product) return `Selected product changed (${old.product || "unknown"} → ${current.product || "unknown"}).`;
    if (old.audit !== current.audit) return "Underlying retrospective audit changed.";
    if (old.action !== current.action) return `Knowledge action changed (${old.action || "unknown"} → ${current.action}).`;
    if (old.artifact !== current.artifact) return `Artifact type changed (${old.artifact || "unknown"} → ${current.artifact}).`;
    if (old.readiness !== current.readiness) return "Artifact readiness changed.";
    return "Knowledge inputs changed; a fresh Case Chat result is required.";
  }

  async function getFollowupStatusOnce(caseNumber, followupId) {
    const r = await request(
      `/taco/pilot/investigation/${caseNumber}/followup/status/${encodeURIComponent(followupId)}`
    );
    const j = await r.json();
    const d = j?.data || {};
    return {
      status: String(d.status || j?.status || "").toLowerCase(),
      answer: d.answer || j?.answer || "",
      error: d.error_message || j?.error_message || j?.error || "",
      raw: d
    };
  }

  function validateReusableAuditAnswer(answer, job) {
    const a = String(answer || "").trim();
    if (isTransientCaseChatAnswer(a)) return {valid:false, transient:true, reason:"TACopilot returned a temporary system-error answer"};
    if (hasUnbalancedMarkdownFence(a)) return {valid:false, reason:"answer contains an unclosed Markdown code fence"};
    if (a.length < 200) return {valid:false, reason:"answer is incomplete"};

    const target = extractField(a, "Target Ticket");
    if (target && !target.toUpperCase().includes(String(job.xsup).toUpperCase())) {
      return {valid:false, reason:`answer targets ${target}, not ${job.xsup}`};
    }

    const reportedProduct = normalizeProductKey(extractField(a, "Product Family"));
    if (reportedProduct && reportedProduct !== job.productKey) {
      return {valid:false, reason:`answer product ${extractField(a, "Product Family")} does not match selected ${productLabel(job)}`};
    }

    const required = [
      "Reviewed Fields",
      "Retrospective Eligibility",
      "Existing Prior Match",
      "Best Prior Reference",
      "Primary Knowledge Action",
      "Secondary Knowledge Action",
      "Artifact Readiness",
      "Knowledge Availability / Channel",
      "Existing KCS Candidate",
      "Existing KCS Content Match",
      "Admin/Tech Guide Needed",
      "Knowledge Decision Explanation"
    ];
    const missing = required.filter(label => !extractField(a, label));
    if (missing.length) return {valid:false, reason:`missing required fields: ${missing.join(", ")}`};

    const eligibility = normalizeDecision(extractField(a, "Retrospective Eligibility"));
    if (eligibility === "IN SCOPE") {
      const profile = getProductProfile(job.productKey);
      const fieldLabels = {
        "Resolution": "Resolution Verdict",
        "RCA": "RCA Verdict",
        "Fix Type": "Fix Type Verdict",
        "Flag / Label": "Flag / Label Verdict"
      };
      const hasExpectedVerdict = (profile?.primaryFieldOrder || [])
        .some(name => extractField(a, fieldLabels[name]) || (name === "Flag / Label" && extractField(a, "Label / Flag Verdict")));
      if (!hasExpectedVerdict) return {valid:false, reason:"in-scope answer is missing an applicable product-specific field verdict"};
    }
    const knowledgeValidation = validateAuditKnowledgeDecisionFields(a);
    if (!knowledgeValidation.valid) return knowledgeValidation;
    return {valid:true};
  }

  function validateReusableKnowledgeAnswer(answer, job, reuseType = "knowledge") {
    const raw = String(answer || "").trim();
    if (isTransientCaseChatAnswer(raw)) return {valid:false, transient:true, reason:"TACopilot returned a temporary system-error answer"};
    const a = stripInternalKnowledgeMetadata(raw);
    if (a.length < 160) return {valid:false, reason:"artifact is incomplete after internal metadata cleanup"};

    if (reuseType === "knowledge") {
      const parsed = parseKnowledgeQualityResponse(raw, job);
      if (!parsed.valid) {
        return {valid:false, reason:`final quality-reviewed artifact is not reusable: ${parsed.reason}`};
      }
      const artifact = stripInternalKnowledgeMetadata(parsed.artifact || raw);
      const refs = parseKnowledgeSourceReferences(artifact);
      const used = knowledgeUsedReferenceIds(artifact);
      if ((knowledgeArtifactType(job) === "KCS_DRAFT" || knowledgeArtifactType(job) === "DOC_UPDATE" || knowledgeArtifactType(job) === "KCS_UPDATE") && refs.size && !used.size) {
        return {valid:false, reason:"artifact has a source list but no claim-level R# citations"};
      }
      return {valid:true, parsed};
    }

    const type = job.knowledgeArtifactType || knowledgeArtifactType(job);
    const expected = {
      KCS_DRAFT: /(?:^|\n)#\s+.+/i,
      KCS_UPDATE: /Existing KCS Update Proposal/i,
      DOC_UPDATE: /Admin\s*\/?\s*Tech Guide Update Proposal/i,
      RUNBOOK: /TAC Runbook Draft/i,
      KNOWN_ISSUE: /Known Issue|Release Note/i
    }[type];

    if (expected && !expected.test(a)) {
      return {valid:false, reason:`result does not match ${knowledgeArtifactLabel(type)} structure`};
    }

    const generatedFrom = extractField(a, "Generated From");
    if (generatedFrom && !generatedFrom.toUpperCase().includes(job.xsup.toUpperCase())) {
      return {valid:false, reason:`artifact targets ${generatedFrom}, not ${job.xsup}`};
    }

    if (job?.forceCreateNewKcs && type === "KCS_DRAFT" && effectiveKcsArtifactType(a, "KCS_DRAFT") === "KCS_UPDATE") {
      return {valid:false, reason:"reviewer requested a separate new KCS but the draft returned an existing-KCS update proposal"};
    }

    // Internal reuse metadata is deliberately stripped before structural
    // validation. Case Chat can echo our hidden reuse marker even when the
    // artifact itself is valid; that bookkeeping line must never make a KCS fail.
    if (a.includes(REUSE_META_PREFIX)) {
      return {valid:false, reason:"internal reuse metadata remains after cleanup"};
    }

    return {valid:true};
  }

  async function tryReuseCaseChat({
    job,
    type,
    currentMeta,
    legacyQuestion,
    force = false,
    onProgress = null
  }) {
    if (force) {
      return {
        reused: false,
        reason: `Manual ${type === "audit" ? "audit rerun" : "knowledge regeneration"} requested.`
      };
    }

    let history;
    try {
      history = await getFollowupHistory(job.caseNumber, job.investigationId, {quick:true});
    } catch (err) {
      return {
        reused: false,
        reason: `Case Chat history could not be read (${err?.message || err}); generating a fresh result safely.`
      };
    }

    const historyItems = collectFollowupHistoryItems(history);
    const candidate = findReusableFollowupCandidate(history, {
      type,
      fingerprint: currentMeta.fingerprint,
      legacyQuestion
    });

    if (!candidate) {
      // Prefer a source-current structurally compatible result even when the
      // Auditor presentation/prompt schema changed. Rendering changes alone must
      // not force an expensive new Case Chat generation.
      const compatible = findCurrentCompatibleCompletedFollowup(history, {
        job,
        type
      });

      if (compatible) {
        const skipped = Array.isArray(compatible.source_current_skipped) ? compatible.source_current_skipped : [];
        const skippedText = skipped.length
          ? ` Skipped newer unusable result${skipped.length === 1 ? "" : "s"}: ${skipped.map(x => `#${x.id} (${x.reason})`).join(", ")}.`
          : "";
        return {
          reused: true,
          answer: compatible.answer,
          followupId: compatible.id,
          completedAt: followupTimestamp(compatible) || Date.now(),
          historyCount: historyItems.length,
          reuse_match: "source-current-compatible",
          reason: `Reused latest source-current usable ${type} Case Chat #${compatible.id}; no newer original Jira/SFDC evidence requires regeneration.${skippedText}`
        };
      }

      const markedPrevious = latestAuditorFollowup(history, type);
      const likelyPrevious =
        markedPrevious ||
        latestLikelyAuditorFollowup(history, type, job.xsup);

      return {
        reused: false,
        reason: likelyPrevious
          ? `Previous ${type} Case Chat #${likelyPrevious.id} is not current/compatible with the latest original Jira/SFDC source boundary or selected product/artifact.`
          : `No current compatible ${type} result was found after checking ${historyItems.length} Case Chat history entries.`,
        previousFollowupId: likelyPrevious?.id || null,
        previousCompletedAt: likelyPrevious
          ? followupTimestamp(likelyPrevious)
          : null
      };
    }

    const historyStatus = String(candidate.status || "").toLowerCase();
    let answer = candidate.answer || "";
    let completedAt = followupTimestamp(candidate);

    // TACopilot follow-up history returns the complete answer for completed
    // entries. Reuse it directly instead of making a redundant status request.
    if (historyStatus === "completed" && answer) {
      const validation = type === "audit"
        ? validateReusableAuditAnswer(answer, job)
        : validateReusableKnowledgeAnswer(answer, job, type);

      if (!validation.valid) {
        const compatible = findCurrentCompatibleCompletedFollowup(history, {job, type});
        if (compatible) {
          const skipped = Array.isArray(compatible.source_current_skipped) ? compatible.source_current_skipped : [];
          const skippedText = skipped.length
            ? ` Skipped newer unusable result${skipped.length === 1 ? "" : "s"}: ${skipped.map(x => `#${x.id} (${x.reason})`).join(", ")}.`
            : "";
          return {
            reused: true,
            answer: compatible.answer,
            followupId: compatible.id,
            completedAt: followupTimestamp(compatible) || Date.now(),
            historyCount: historyItems.length,
            reuse_match: "source-current-compatible",
            reason: `Matching Case Chat #${candidate.id} was unusable (${validation.reason}); reused latest source-current usable ${type} Case Chat #${compatible.id}.${skippedText}`
          };
        }
        return {
          reused: false,
          reason: `Matching Case Chat #${candidate.id} was rejected because ${validation.reason}.`,
          previousFollowupId: candidate.id,
          previousCompletedAt: completedAt
        };
      }

      return {
        reused: true,
        answer,
        followupId: candidate.id,
        completedAt: completedAt || Date.now(),
        historyCount: historyItems.length,
        reuse_match: candidate.reuse_match,
        reason: candidate.reuse_match === "legacy-exact"
          ? `Reused exact-match prior ${type} Case Chat #${candidate.id} after checking ${historyItems.length} history entries.`
          : `Reused existing ${type} Case Chat #${candidate.id}; exact fingerprint matched current TACO, Jira/SFDC evidence and ${type === "audit" ? "audit method" : "knowledge inputs"}.`
      };
    }

    if (["failed", "error"].includes(historyStatus)) {
      return {
        reused: false,
        reason: `Matching Case Chat #${candidate.id} previously failed; generating a fresh result.`,
        previousFollowupId: candidate.id,
        previousCompletedAt: completedAt
      };
    }

    if (["pending", "running", "queued", "processing"].includes(historyStatus)) {
      const activityAt = followupTimestamp(candidate) || 0;
      const ageMs = activityAt ? Math.max(0, Date.now() - activityAt) : EXISTING_CASECHAT_STALE_MS;
      if (!activityAt || ageMs >= EXISTING_CASECHAT_STALE_MS) {
        return {
          reused: false,
          reason: `Matching ${type} Case Chat #${candidate.id} is stale (${formatElapsed(ageMs || EXISTING_CASECHAT_STALE_MS)} without a completed result); starting a fresh request instead of blocking a knowledge worker.`,
          previousFollowupId: candidate.id,
          previousCompletedAt: completedAt
        };
      }

      const graceMs = Math.min(EXISTING_CASECHAT_GRACE_WAIT_MS, Math.max(15000, EXISTING_CASECHAT_STALE_MS - ageMs));
      onProgress?.(`Matching ${type} Case Chat #${candidate.id} is still recent · waiting briefly before deciding whether to regenerate`);
      try {
        answer = await waitForFollowup(job.caseNumber, candidate.id, value => onProgress?.(value), graceMs);
        completedAt = Date.now();
      } catch (waitErr) {
        if (/Timed out waiting for Case Chat follow-up completion/i.test(String(waitErr?.message || waitErr || ""))) {
          return {
            reused: false,
            reason: `Matching ${type} Case Chat #${candidate.id} did not complete inside the bounded reuse grace window; starting a fresh request.`,
            previousFollowupId: candidate.id,
            previousCompletedAt: completedAt
          };
        }
        throw waitErr;
      }
    } else {
      // Non-standard status or answer not yet visible in history.
      let statusData;
      try {
        statusData = await getFollowupStatusOnce(
          job.caseNumber,
          candidate.id
        );
      } catch (err) {
        return {
          reused: false,
          reason: `Matching Case Chat #${candidate.id} could not be read (${err?.message || err}); generating a fresh result.`,
          previousFollowupId: candidate.id,
          previousCompletedAt: completedAt
        };
      }

      const status = String(statusData.status || "").toLowerCase();
      answer = statusData.answer || answer;

      if (["pending", "running", "queued", "processing"].includes(status)) {
        const activityAt = followupTimestamp(candidate, statusData.raw) || followupTimestamp(candidate) || 0;
        const ageMs = activityAt ? Math.max(0, Date.now() - activityAt) : EXISTING_CASECHAT_STALE_MS;
        if (!activityAt || ageMs >= EXISTING_CASECHAT_STALE_MS) {
          return {
            reused: false,
            reason: `Matching ${type} Case Chat #${candidate.id} is stale (${formatElapsed(ageMs || EXISTING_CASECHAT_STALE_MS)} without a completed result); starting a fresh request instead of blocking a knowledge worker.`,
            previousFollowupId: candidate.id,
            previousCompletedAt: completedAt
          };
        }
        const graceMs = Math.min(EXISTING_CASECHAT_GRACE_WAIT_MS, Math.max(15000, EXISTING_CASECHAT_STALE_MS - ageMs));
        onProgress?.(`Matching ${type} Case Chat #${candidate.id} is still recent · waiting briefly before deciding whether to regenerate`);
        try {
          answer = await waitForFollowup(job.caseNumber, candidate.id, value => onProgress?.(value), graceMs);
          completedAt = Date.now();
        } catch (waitErr) {
          if (/Timed out waiting for Case Chat follow-up completion/i.test(String(waitErr?.message || waitErr || ""))) {
            return {
              reused: false,
              reason: `Matching ${type} Case Chat #${candidate.id} did not complete inside the bounded reuse grace window; starting a fresh request.`,
              previousFollowupId: candidate.id,
              previousCompletedAt: completedAt
            };
          }
          throw waitErr;
        }
      } else if (["failed", "error"].includes(status)) {
        return {
          reused: false,
          reason: `Matching Case Chat #${candidate.id} failed; generating a fresh result.`,
          previousFollowupId: candidate.id,
          previousCompletedAt: completedAt
        };
      } else {
        completedAt =
          followupTimestamp(candidate, statusData.raw) ||
          completedAt ||
          Date.now();
      }
    }

    const validation = type === "audit"
      ? validateReusableAuditAnswer(answer, job)
      : validateReusableKnowledgeAnswer(answer, job, type);

    if (!validation.valid) {
      const compatible = findCurrentCompatibleCompletedFollowup(history, {job, type});
      if (compatible) {
        const skipped = Array.isArray(compatible.source_current_skipped) ? compatible.source_current_skipped : [];
        const skippedText = skipped.length
          ? ` Skipped newer unusable result${skipped.length === 1 ? "" : "s"}: ${skipped.map(x => `#${x.id} (${x.reason})`).join(", ")}.`
          : "";
        return {
          reused: true,
          answer: compatible.answer,
          followupId: compatible.id,
          completedAt: followupTimestamp(compatible) || Date.now(),
          historyCount: historyItems.length,
          reuse_match: "source-current-compatible",
          reason: `Matching Case Chat #${candidate.id} was unusable (${validation.reason}); reused latest source-current usable ${type} Case Chat #${compatible.id}.${skippedText}`
        };
      }
      return {
        reused: false,
        reason: `Matching Case Chat #${candidate.id} was rejected because ${validation.reason}.`,
        previousFollowupId: candidate.id,
        previousCompletedAt: completedAt
      };
    }

    return {
      reused: true,
      answer,
      followupId: candidate.id,
      completedAt,
      historyCount: historyItems.length,
      reason: candidate.reuse_match === "legacy-exact"
        ? `Reused exact-match prior ${type} Case Chat #${candidate.id} after checking ${historyItems.length} history entries.`
        : `Reused existing ${type} Case Chat #${candidate.id}; exact fingerprint matched current TACO, Jira/SFDC evidence and ${type === "audit" ? "audit method" : "knowledge inputs"}.`
    };
  }

  async function postFollowup(caseNumber, investigationId, question) {
    const r = await request(`/taco/pilot/investigation/${caseNumber}/followup`, {
      method: "POST",
      body: JSON.stringify({ question, investigation_id: investigationId })
    });
    const j = await r.json();
    if (j?.success === false || j?.error) {
      throw new Error(`Case Chat submission rejected: ${j?.error || "unknown service error"}`);
    }
    return j;
  }

  function isRetryableCaseChatSubmissionError(err) {
    const message = cleanText(err?.message || String(err || ""));
    return /Failed to fetch|NetworkError|Load failed|network request failed|connection.*reset|temporarily unavailable|timeout|CSRF|HTTP 403|HTTP 408|HTTP 425|HTTP 429|HTTP 5\d\d|service unavailable/i.test(message);
  }

  function isRetryableCaseChatGenerationError(err) {
    const message = cleanText(err?.message || String(err || ""));
    return /Failed to fetch|NetworkError|Load failed|network request failed|connection.*reset|temporarily unavailable|timeout|CSRF|HTTP 403|HTTP 408|HTTP 425|HTTP 429|HTTP 5\d\d|task failed|task rejected|service error|service unavailable|temporary system error/i.test(message);
  }

  async function submitFollowupResilient(caseNumber, investigationId, question, onProgress = null, label = "Case Chat") {
    try {
      return await postFollowup(caseNumber, investigationId, question);
    } catch (err) {
      if (err?.name === "AbortError" || !isRetryableCaseChatSubmissionError(err)) throw err;

      onProgress?.(`${label} submission connection interrupted · checking whether TACopilot accepted it...`);
      try {
        await sleep(1000);
        const history = await getFollowupHistory(caseNumber, investigationId);
        const recoveredId = findFollowupInHistory(history, question);
        if (recoveredId) {
          onProgress?.(`Recovered accepted ${label} #${recoveredId} from history.`);
          return { followup_id: recoveredId, recovered_from_history: true };
        }
      } catch (_) {}

      onProgress?.(`${label} request was not confirmed as accepted · retrying submission once...`);
      await sleep(1500);
      try {
        return await postFollowup(caseNumber, investigationId, question);
      } catch (retryErr) {
        if (retryErr?.name === "AbortError") throw retryErr;
        retryErr.xaSubmissionNotAccepted = true;
        retryErr.xaCaseChatLabel = label;
        throw retryErr;
      }
    }
  }

  async function acquireCaseChatGenerationSlot(onProgress = null, label = "Case Chat") {
    let announced = false;
    while (state.caseChatActiveCount >= state.caseChatGenerationLimit) {
      assertRunning();
      if (!announced) {
        onProgress?.(`${label} waiting for a shared TACopilot generation slot (${state.caseChatActiveCount}/${state.caseChatGenerationLimit} active)`);
        announced = true;
      }
      await sleep(500);
    }
    assertRunning();
    state.caseChatActiveCount++;
    updateBatchStatus();
  }

  function releaseCaseChatGenerationSlot() {
    state.caseChatActiveCount = Math.max(0, state.caseChatActiveCount - 1);
    updateBatchStatus();
  }

  async function runFollowupPromptUnlocked(
    caseNumber,
    investigationId,
    question,
    onProgress = null,
    { label = "Case Chat", retryOnce = false } = {}
  ) {
    let lastError = null;

    for (let attempt = 1; attempt <= (retryOnce ? 2 : 1); attempt++) {
      try {
        if (attempt > 1) onProgress?.(`${label} automatic retry attempt 1/1 · submitting a fresh task...`);
        const submit = await submitFollowupResilient(
          caseNumber,
          investigationId,
          question,
          onProgress,
          label
        );
        const directId = extractFollowupId(submit);
        const taskId = submit?.task_id;
        if (!directId && !taskId) {
          throw new Error(`${label} did not return task_id or followup_id.`);
        }
        if (!directId && taskId) onProgress?.(`${label} task ${taskId} accepted · waiting for Case Chat creation...`);

        const followupId = directId || await waitForFollowupId(
          caseNumber,
          investigationId,
          taskId,
          question,
          onProgress
        );
        onProgress?.(`${label} #${followupId}`);
        const answer = await waitForFollowup(caseNumber, followupId, onProgress);
        if (!cleanText(answer)) throw new Error(`${label} returned an empty answer.`);
        if (isTransientCaseChatAnswer(answer)) {
          const transient = new Error(`${label} returned a temporary system error response.`);
          transient.name = "TransientCaseChatError";
          transient.followupId = followupId;
          throw transient;
        }
        return { answer, followupId, submit, attempt };
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        lastError = err;
        if (attempt >= (retryOnce ? 2 : 1) || !isRetryableCaseChatGenerationError(err)) {
          if (err?.xaSubmissionNotAccepted) {
            const finalErr = new Error(`${label} submission failed; no Case Chat was confirmed as created. ${cleanText(err?.message || "")}`.trim());
            finalErr.name = "CaseChatSubmissionNotAcceptedError";
            finalErr.xaSubmissionNotAccepted = true;
            throw finalErr;
          }
          if (err?.xaTaskRejectedBeforeFollowup) {
            const finalErr = new Error(`${label} task was rejected before a Case Chat was created${err?.xaTaskId ? ` (task ${err.xaTaskId})` : ""}. ${cleanText(err?.message || "")}`.trim());
            finalErr.name = "CaseChatTaskRejectedBeforeFollowupError";
            finalErr.xaTaskRejectedBeforeFollowup = true;
            finalErr.xaTaskId = err?.xaTaskId || null;
            throw finalErr;
          }
          throw err;
        }

        // Before retrying, recover an exact accepted prompt from history when it
        // produced a usable answer. Temporary-error answers are deliberately not
        // treated as successful recovery.
        try {
          const history = await getFollowupHistory(caseNumber, investigationId);
          const recoveredId = findFollowupInHistory(history, question);
          if (recoveredId) {
            onProgress?.(`${label} response interrupted · checking Case Chat #${recoveredId}...`);
            const recoveredAnswer = await waitForFollowup(caseNumber, recoveredId, onProgress);
            if (cleanText(recoveredAnswer) && !isTransientCaseChatAnswer(recoveredAnswer)) {
              return { answer: recoveredAnswer, followupId: recoveredId, recovered_from_history: true, attempt };
            }
          }
        } catch (_) {}

        if (err?.xaSubmissionNotAccepted) {
          onProgress?.(`${label} submission was not accepted · no Case Chat was confirmed as created · automatic retry 1/1...`);
        } else if (err?.xaTaskRejectedBeforeFollowup) {
          onProgress?.(`${label} task was rejected before Case Chat creation${err?.xaTaskId ? ` · task ${err.xaTaskId}` : ""} · automatic retry 1/1...`);
        } else if (err?.followupId) {
          onProgress?.(`${label} #${err.followupId} returned a temporary error · automatic retry 1/1...`);
        } else {
          onProgress?.(`${label} generation temporarily failed after submission · automatic retry 1/1...`);
        }
        await sleep(err?.xaTaskRejectedBeforeFollowup ? 5000 : 1800);
      }
    }

    throw lastError || new Error(`${label} failed.`);
  }

  async function runFollowupPrompt(
    caseNumber,
    investigationId,
    question,
    onProgress = null,
    options = {}
  ) {
    const label = options.label || "Case Chat";
    await acquireCaseChatGenerationSlot(onProgress, label);
    try {
      return await runFollowupPromptUnlocked(caseNumber, investigationId, question, onProgress, options);
    } finally {
      releaseCaseChatGenerationSlot();
    }
  }

  // Compatibility wrapper for the newer call sites. Uses the proven resilient
  // v2.3.1 transport and retries one transient generation failure only.
  async function runCaseChatPrompt(caseNumber, investigationId, question, onProgress = null, label = "Case Chat") {
    return await runFollowupPrompt(caseNumber, investigationId, question, onProgress, {label, retryOnce:true});
  }

  function extractFollowupId(payload) {
    const seen = new Set();

    function walk(v) {
      if (v == null) return null;

      if (typeof v === "object") {
        if (seen.has(v)) return null;
        seen.add(v);

        if (v.followup_id != null && /^\d+$/.test(String(v.followup_id))) {
          return Number(v.followup_id);
        }

        for (const [k, val] of Object.entries(v)) {
          if (
            (k === "result" || k === "id") &&
            (typeof val === "number" || (typeof val === "string" && /^\d+$/.test(val)))
          ) {
            // Only use generic result/id if it is nested under a completed task payload.
            if (String(v.status || "").toLowerCase() === "completed") {
              return Number(val);
            }
          }

          const found = walk(val);
          if (found) return found;
        }
      }

      if (typeof v === "string") {
        const m1 = v.match(/followup[_-]?id\D{0,20}(\d+)/i);
        if (m1) return Number(m1[1]);

        const m2 = v.match(/\/followup\/status\/(\d+)/i);
        if (m2) return Number(m2[1]);
      }

      return null;
    }

    return walk(payload);
  }

  function findFollowupInHistory(payload, question) {
    const matches = [];
    const seen = new Set();

    function walk(v) {
      if (!v || typeof v !== "object" || seen.has(v)) return;
      seen.add(v);

      const id = v.followup_id;
      const q = typeof v.question === "string" ? v.question : null;

      if (id != null && /^\d+$/.test(String(id))) {
        matches.push({
          id: Number(id),
          question: q,
          created_at: v.created_at || "",
          status: v.status || ""
        });
      }

      for (const val of Object.values(v)) walk(val);
    }

    walk(payload);

    const exact = matches
      .filter(x => x.question === question)
      .sort((a,b) => String(b.created_at).localeCompare(String(a.created_at)));

    if (exact.length) return exact[0].id;
    return null;
  }

  async function waitForFollowupId(caseNumber, investigationId, taskId, question, onProgress = null) {
    const deadline = Date.now() + CHAT_TIMEOUT_MS;
    let attempt = 0;

    const progressUpdate = (value, meta = {}) => {
      if (onProgress) onProgress(value, meta);
      else setStep("audit", value);
    };

    while (Date.now() < deadline) {
      attempt++;

      let j;
      try {
        const r = await requestQuickGet(`/taco/pilot/investigation/task/${encodeURIComponent(taskId)}`, CASECHAT_POLL_TIMEOUT_MS);
        j = await r.json();
      } catch (pollErr) {
        progressUpdate(`Case Chat task status temporarily unavailable · poll ${attempt}`, {
          phase: "casechat", heartbeat: true, heartbeatOnly: true, activity: "Case Chat · retrying bounded status poll"
        });
        await sleep(3000);
        continue;
      }

      if (j?.success === false || j?.error) {
        const taskErr = new Error(`Case Chat task rejected before a follow-up was created: ${j?.error || "unknown service error"}`);
        taskErr.name = "CaseChatTaskRejectedBeforeFollowupError";
        taskErr.xaTaskRejectedBeforeFollowup = true;
        taskErr.xaTaskId = taskId;
        throw taskErr;
      }

      const id = extractFollowupId(j);
      if (id) return id;

      const d = j?.data || j;
      const status = String(d?.status || j?.status || "").toLowerCase();

      if (status === "failed" || status === "error") {
        const taskErr = new Error(
          d?.error_message ||
          j?.error_message ||
          "Case Chat task failed before a follow-up was created."
        );
        taskErr.name = "CaseChatTaskRejectedBeforeFollowupError";
        taskErr.xaTaskRejectedBeforeFollowup = true;
        taskErr.xaTaskId = taskId;
        throw taskErr;
      }

      // Fallback: TACopilot exposes follow-up history for the investigation.
      // Match our exact submitted question and recover its followup_id.
      if (attempt % 3 === 0) {
        try {
          const hr = await requestQuickGet(
            `/taco/pilot/investigation/${caseNumber}/followup?investigation_id=${encodeURIComponent(investigationId)}`,
            CASECHAT_POLL_TIMEOUT_MS
          );
          const history = await hr.json();
          const historyId = findFollowupInHistory(history, question);
          if (historyId) return historyId;
        } catch (_) {}
      }

      progressUpdate(`Waiting for Case Chat result · poll ${attempt}`, {
        phase: "casechat",
        heartbeat: true,
        heartbeatOnly: true,
        activity: "Case Chat · waiting for follow-up task"
      });
      await sleep(3000);
    }

    throw new Error("Timed out waiting for Case Chat follow-up ID.");
  }

  async function waitForFollowup(caseNumber, followupId, onProgress = null, timeoutMs = CHAT_TIMEOUT_MS) {
    const deadline = Date.now() + Math.max(15000, Number(timeoutMs) || CHAT_TIMEOUT_MS);

    const progressUpdate = (value, meta = {}) => {
      if (onProgress) onProgress(value, meta);
      else setStep("audit", value);
    };
    while (Date.now() < deadline) {
      let j;
      try {
        const r = await requestQuickGet(`/taco/pilot/investigation/${caseNumber}/followup/status/${encodeURIComponent(followupId)}`, CASECHAT_POLL_TIMEOUT_MS);
        j = await r.json();
      } catch (pollErr) {
        progressUpdate("Case Chat status temporarily unavailable · retrying", {
          phase: "casechat", heartbeat: true, heartbeatOnly: true, activity: "Case Chat · retrying bounded status poll"
        });
        await sleep(3000);
        continue;
      }
      const d = j?.data || {};
      const status = String(d.status || "").toLowerCase();

      progressUpdate(`Case Chat: ${status || "waiting"}`, {
        phase: "casechat",
        heartbeat: true,
        heartbeatOnly: status === "" || status === "pending" || status === "running",
        activity: `Case Chat · ${status || "waiting"}`
      });

      if (status === "completed") return d.answer || "";
      if (status === "failed" || status === "error") {
        throw new Error(d.error_message || "Case Chat audit failed.");
      }
      await sleep(3000);
    }
    throw new Error("Timed out waiting for Case Chat follow-up completion.");
  }


  function extractField(text, label) {
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\*\\*${esc}:\\*\\*\\s*([^\\n]+)`, "i");
    const m = String(text || "").match(re);
    return m ? cleanText(m[1]) : "";
  }

  function extractFieldBlock(text, label) {
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `\\*\\*${esc}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\s*\\*\\*[^\\n]+?:\\*\\*|\\n\\s*#{1,6}\\s|$)`,
      "i"
    );
    const m = String(text || "").match(re);
    return m ? cleanText(m[1]) : "";
  }

  // ===========================================================================
  // AUDIT RESULT NORMALIZATION / PARSING
  // ===========================================================================
  // Important governance rules are enforced in code as well as in the prompt.
  // Example: if every prior source date is Unknown, the audit cannot claim that
  // the answer was available BEFORE escalation.
  function normalizeAuditConsistency(answer) {
    let out = String(answer || "");
    if (!out) return out;

    const sourceDates = [...out.matchAll(/\*\*Source Date:\*\*\s*([^\n\r]+)/gi)]
      .map(m => cleanText(m[1]))
      .filter(Boolean);

    const allSourceDatesUnknown =
      sourceDates.length > 0 &&
      sourceDates.every(v => /^(unknown|not available|undetermined)$/i.test(v));

    if (allSourceDatesUnknown) {
      out = out.replace(
        /(\*\*Prior Match Timing vs Escalation:\*\*)\s*BEFORE\b/gi,
        "$1 UNKNOWN"
      );
      out = out.replace(
        /(\*\*Available Before XSUP Escalation:\*\*)\s*YES\b/gi,
        "$1 UNDETERMINED"
      );
    }

    return out;
  }

  function replaceAuditFieldLine(text, label, value) {
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const line = `**${label}:** ${value}`;
    const re = new RegExp(`\\*\\*${esc}:\\*\\*\\s*[^\\n\\r]*`, "i");
    return re.test(String(text || "")) ? String(text || "").replace(re, line) : String(text || "");
  }

  function enforceTrustedSavedFieldBoundary(job) {
    const observed = trustedFieldSnapshotForJob(job)?.observed?.fields || {};
    const specs = [
      {name:"Resolution", fieldId:"resolution", current:"resolutionCurrentValue", change:"resolutionChangeNeeded", verdict:"verdict", recommended:"resolutionRecommendedValue", action:"resolutionSupportAction"},
      {name:"RCA", fieldId:"customfield_27520", current:"rcaCurrentValue", change:"rcaChangeNeeded", verdict:"rcaVerdict", recommended:"rcaRecommendedValue", action:"rcaSupportAction"},
      {name:"Fix Type", fieldIds:["customfield_19679","customfield_18953"], current:"fixTypeCurrentValue", change:"fixTypeChangeNeeded", verdict:"fixTypeVerdict", recommended:"fixTypeRecommendedValue", action:"fixTypeSupportAction"},
      {name:"Flag / Label", fieldId:"labels", current:"labelCurrentValue", change:"labelChangeNeeded", verdict:"labelVerdict", recommended:"labelRecommendedValue", action:"labelSupportAction"}
    ];

    for (const spec of specs) {
      const applicability = String(job[spec.change] || "");
      if (!applicability || /^(not applicable|n\/a)$/i.test(applicability)) continue;
      const fieldIds = spec.fieldIds || [spec.fieldId];
      const trusted = fieldIds.map(id => observed[id]).find(Boolean);
      if (trusted) {
        const display = cleanText(trusted.displayValue || "") || "Blank / empty";
        job[spec.current] = display;
        job.auditAnswer = replaceAuditFieldLine(job.auditAnswer, `${spec.name} Current Value`, display);
        const rec = cleanText(job[spec.recommended] || "");
        // Exact deterministic comparison is safe for scalar Support-owned fields; labels remain model-assessed because they are a set.
        if (!fieldIds.includes("labels") && rec && !/^no change$/i.test(rec)) {
          if (normalizeDecision(display) === normalizeDecision(rec)) {
            job[spec.change] = "NO";
            job[spec.verdict] = "CORRECT";
            job[spec.action] = `No Jira ${spec.name} change is required.`;
          } else {
            job[spec.change] = "YES";
            job[spec.verdict] = "INCORRECT";
            job[spec.action] = `Update the saved Jira ${spec.name} on ${jiraVerifyTarget(job)} to ${rec}.`;
          }
        }
        const topChangeLabel = spec.name === "Flag / Label" ? "Label / Flag Change Needed" : `${spec.name} Change Needed`;
        job.auditAnswer = replaceAuditFieldLine(job.auditAnswer, topChangeLabel, job[spec.change]);
        job.auditAnswer = replaceAuditFieldLine(job.auditAnswer, `${spec.name} Change Required`, job[spec.change]);
        job.auditAnswer = replaceAuditFieldLine(job.auditAnswer, `${spec.name} Verdict`, job[spec.verdict]);
        job.auditAnswer = replaceAuditFieldLine(job.auditAnswer, `${spec.name} Support Action`, job[spec.action]);
      } else {
        // No structured trusted field means the current value is unknown regardless of what narrative/LLM text says.
        job[spec.current] = "Not verified";
        job[spec.change] = "VERIFY SAVED VALUE";
        const priorVerdict = String(job[spec.verdict] || "");
        if (/incorrect/i.test(priorVerdict)) job[spec.verdict] = "TECHNICALLY INCORRECT";
        else if (/correct/i.test(priorVerdict)) job[spec.verdict] = "TECHNICALLY CORRECT";
        else job[spec.verdict] = "CURRENT VALUE NEEDED";
        const rec = cleanText(job[spec.recommended] || "");
        job[spec.action] = `Verify saved Jira ${spec.name} on ${jiraVerifyTarget(job)}${rec && !/^no change$/i.test(rec) ? `; if it already matches ${rec}, no change is required.` : "."}`;
        const topChangeLabel = spec.name === "Flag / Label" ? "Label / Flag Change Needed" : `${spec.name} Change Needed`;
        job.auditAnswer = replaceAuditFieldLine(job.auditAnswer, `${spec.name} Current Value`, "Not verified");
        job.auditAnswer = replaceAuditFieldLine(job.auditAnswer, topChangeLabel, job[spec.change]);
        job.auditAnswer = replaceAuditFieldLine(job.auditAnswer, `${spec.name} Change Required`, job[spec.change]);
        job.auditAnswer = replaceAuditFieldLine(job.auditAnswer, `${spec.name} Verdict`, job[spec.verdict]);
        job.auditAnswer = replaceAuditFieldLine(job.auditAnswer, `${spec.name} Support Action`, job[spec.action]);
      }
    }
    return job;
  }

  // Both the normal Case Chat path and "Re-run Audit" use this single
  // parser so field extraction cannot drift between the two workflows.
  function applyAuditResult(job, rawAnswer) {
    job.auditAnswer = sanitizeGeneratedText(normalizeAuditConsistency(rawAnswer));

    job.reviewedFields = extractField(job.auditAnswer, "Reviewed Fields");
    job.retrospectiveEligibility = extractField(job.auditAnswer, "Retrospective Eligibility");
    job.auditReportedProduct = extractField(job.auditAnswer, "Product Family");

    job.resolutionChangeNeeded = extractField(job.auditAnswer, "Resolution Change Needed");
    job.rcaChangeNeeded = extractField(job.auditAnswer, "RCA Change Needed");
    job.fixTypeChangeNeeded = extractField(job.auditAnswer, "Fix Type Change Needed");
    job.labelChangeNeeded = extractField(job.auditAnswer, "Label / Flag Change Needed");

    job.verdict = extractField(job.auditAnswer, "Resolution Verdict");
    job.resolutionExplanation = extractField(job.auditAnswer, "Resolution Detailed Explanation");
    job.resolutionRecommendedValue = extractField(job.auditAnswer, "Resolution Recommended Value");
    job.resolutionCurrentValue = extractField(job.auditAnswer, "Resolution Current Value");
    job.resolutionTechnicalAssessment = extractField(job.auditAnswer, "Resolution Technical Assessment");
    job.resolutionWhy = extractField(job.auditAnswer, "Resolution Why");
    job.resolutionSupportAction = extractField(job.auditAnswer, "Resolution Support Action");

    job.rcaVerdict = extractField(job.auditAnswer, "RCA Verdict");
    job.rcaExplanation = extractField(job.auditAnswer, "RCA Detailed Explanation");
    job.rcaRecommendedValue = extractField(job.auditAnswer, "RCA Recommended Value");
    job.rcaCurrentValue = extractField(job.auditAnswer, "RCA Current Value");
    job.rcaTechnicalAssessment = extractField(job.auditAnswer, "RCA Technical Assessment");
    job.rcaWhy = extractField(job.auditAnswer, "RCA Why");
    job.rcaSupportAction = extractField(job.auditAnswer, "RCA Support Action");

    job.fixTypeVerdict = extractField(job.auditAnswer, "Fix Type Verdict");
    job.fixTypeExplanation = extractField(job.auditAnswer, "Fix Type Detailed Explanation");
    job.fixTypeRecommendedValue = extractField(job.auditAnswer, "Fix Type Recommended Value");
    job.fixTypeCurrentValue = extractField(job.auditAnswer, "Fix Type Current Value");
    job.fixTypeTechnicalAssessment = extractField(job.auditAnswer, "Fix Type Technical Assessment");
    job.fixTypeWhy = extractField(job.auditAnswer, "Fix Type Why");
    job.fixTypeSupportAction = extractField(job.auditAnswer, "Fix Type Support Action");

    job.labelVerdict =
      extractField(job.auditAnswer, "Flag / Label Verdict") ||
      extractField(job.auditAnswer, "Label / Flag Verdict");
    job.labelExplanation =
      extractField(job.auditAnswer, "Flag / Label Detailed Explanation") ||
      extractField(job.auditAnswer, "Label / Flag Detailed Explanation");
    job.labelRecommendedValue =
      extractField(job.auditAnswer, "Flag / Label Recommended Value") ||
      extractField(job.auditAnswer, "Label / Flag Recommended Value");
    job.labelCurrentValue = extractField(job.auditAnswer, "Flag / Label Current Value") || extractField(job.auditAnswer, "Label / Flag Current Value");
    job.labelTechnicalAssessment = extractField(job.auditAnswer, "Flag / Label Technical Assessment") || extractField(job.auditAnswer, "Label / Flag Technical Assessment");
    job.labelWhy = extractField(job.auditAnswer, "Flag / Label Why") || extractField(job.auditAnswer, "Label / Flag Why");
    job.labelSupportAction = extractField(job.auditAnswer, "Flag / Label Support Action") || extractField(job.auditAnswer, "Label / Flag Support Action");

    job.reportedIssue = extractFieldBlock(job.auditAnswer, "Reported Issue");
    job.technicalConclusion = extractFieldBlock(job.auditAnswer, "Technical Conclusion");
    job.immediateOperationalGuidance = extractFieldBlock(job.auditAnswer, "Immediate Operational Guidance");
    job.technicalEvidence = extractField(job.auditAnswer, "Technical Conclusion Evidence");
    job.technicalEvidenceExplanation = extractFieldBlock(job.auditAnswer, "Technical Conclusion Evidence Explanation");
    job.engineeringConfirmation = extractField(job.auditAnswer, "Engineering Confirmation");
    job.engineeringConfirmationEvidence = extractFieldBlock(job.auditAnswer, "Engineering Confirmation Evidence");
    job.importantTechnicalCaveat = extractFieldBlock(job.auditAnswer, "Important Technical Caveat");
    job.tacLearning = extractFieldBlock(job.auditAnswer, "TAC Learning");
    job.tacActionItem = extractFieldBlock(job.auditAnswer, "TAC Action Item");
    // Current retrospective-review fields. Legacy labels remain as fallbacks so
    // older, richer Case Chats can be reused without paying for a regeneration.
    job.tacWorkBeforeXsup = extractFieldBlock(job.auditAnswer, "TAC Work Before XSUP") || extractFieldBlock(job.auditAnswer, "What TAC Could Reasonably Do Before Engineering");
    job.xsupEscalationAssessment = extractFieldBlock(job.auditAnswer, "XSUP Escalation Assessment") || extractFieldBlock(job.auditAnswer, "Escalation Assessment");
    job.xsupAvoidable = extractField(job.auditAnswer, "Could XSUP Have Been Avoided") || extractField(job.auditAnswer, "Could Engineering Escalation Have Been Avoided Entirely?");
    job.engineeringContribution = extractFieldBlock(job.auditAnswer, "Engineering Contribution") || extractFieldBlock(job.auditAnswer, "What Required Engineering Expertise");
    job.priorMatchStatus = extractField(job.auditAnswer, "Existing Prior Match") || extractField(job.auditAnswer, "Direct Prior Match Found");
    job.priorReference = extractFieldBlock(job.auditAnswer, "Best Prior Reference") || extractFieldBlock(job.auditAnswer, "Best Prior Match");
    job.priorKnown = extractFieldBlock(job.auditAnswer, "What Was Already Known");
    job.priorKnowledgeUseStatus = extractField(job.auditAnswer, "Prior Knowledge Found / Used Before XSUP");
    job.priorKnowledgeUseEvidence = extractFieldBlock(job.auditAnswer, "Prior Knowledge Use Evidence");
    job.knowledgeAvailability = extractField(job.auditAnswer, "Knowledge Availability") || extractField(job.auditAnswer, "Knowledge Availability / Channel");
    job.knowledgeChannelGap = extractFieldBlock(job.auditAnswer, "Knowledge Channel Gap");
    job.priorCouldHelp = extractField(job.auditAnswer, "Could Prior Knowledge Have Narrowed Earlier") || extractField(job.auditAnswer, "Could TAC Have Used This to Recognize the Problem Earlier?");
    job.retrospectiveImprovement = extractFieldBlock(job.auditAnswer, "Retrospective Improvement") || extractFieldBlock(job.auditAnswer, "Primary Improvement Opportunity");
    job.managementSignal = extractField(job.auditAnswer, "Management Signal");
    job.managementLearning = extractFieldBlock(job.auditAnswer, "Management Learning");
    job.managementUseAction = extractFieldBlock(job.auditAnswer, "Management Use / Action");

    // Legacy/current workflow fields are still parsed for compatibility and
    // internal decision logic, but they are no longer dumped as a future-work
    // checklist in the human retrospective report.
    job.tacChecksFirst = extractFieldBlock(job.auditAnswer, "TAC Checks First");
    job.informationRequired = extractFieldBlock(job.auditAnswer, "Information Required");
    job.tacSelfServiceFeasibility = extractField(job.auditAnswer, "TAC Self-Service Feasibility") || extractField(job.auditAnswer, "TAC Self-Service");
    job.tacSelfServiceExplanation = extractFieldBlock(job.auditAnswer, "TAC Self-Service Explanation");
    job.engineeringNeeded = extractField(job.auditAnswer, "Engineering Needed");
    job.engineeringBoundary = extractFieldBlock(job.auditAnswer, "Engineering Boundary");
    job.escalationPackage = extractFieldBlock(job.auditAnswer, "Escalation Package");
    job.earlierNarrowingPossible = extractField(job.auditAnswer, "Earlier Narrowing Possible") || extractField(job.auditAnswer, "Earlier Narrowing Possible?");
    job.earlierNarrowing = extractFieldBlock(job.auditAnswer, "Earlier Narrowing") || extractFieldBlock(job.auditAnswer, "Earlier Narrowing Opportunity");

    job.knowledgeAction = extractField(job.auditAnswer, "Primary Knowledge Action");
    job.secondaryKnowledgeAction = extractField(job.auditAnswer, "Secondary Knowledge Action");
    job.artifactReadiness = normalizeArtifactReadiness(
      job.knowledgeAction,
      extractField(job.auditAnswer, "Artifact Readiness") ||
      extractField(job.auditAnswer, "KCS Readiness")
    );
    job.artifactTypeFromAudit = extractField(job.auditAnswer, "Artifact Type");
    job.existingKnowledgeCoverage = extractField(job.auditAnswer, "Existing Knowledge Coverage");
    job.knowledgeAvailability = job.knowledgeAvailability || extractField(job.auditAnswer, "Knowledge Availability / Channel");
    job.knowledgeChannelGap = job.knowledgeChannelGap || extractFieldBlock(job.auditAnswer, "Knowledge Channel Gap");
    job.existingKcsCandidate = extractFieldBlock(job.auditAnswer, "Existing KCS Candidate");
    job.existingKcsContentMatch = extractField(job.auditAnswer, "Existing KCS Content Match");
    job.existingKcsCoveredContent = extractFieldBlock(job.auditAnswer, "Existing KCS Covered Content");
    job.existingKcsMissingContent = extractFieldBlock(job.auditAnswer, "Existing KCS Missing Content");
    job.primaryKnowledgeReason = extractFieldBlock(job.auditAnswer, "Primary Knowledge Reason");
    job.secondaryKnowledgeReason = extractFieldBlock(job.auditAnswer, "Secondary Knowledge Reason");
    job.adminTechGuideNeeded = extractField(job.auditAnswer, "Admin/Tech Guide Needed");
    job.adminTechGuideNeedReason = extractFieldBlock(job.auditAnswer, "Admin/Tech Guide Need Reason");
    job.adminTechGuideGapEvidence = extractFieldBlock(job.auditAnswer, "Admin/Tech Guide Gap Evidence");
    job.knowledgeTargetAudience = extractField(job.auditAnswer, "Target Audience");
    job.knowledgeGap = extractFieldBlock(job.auditAnswer, "Knowledge Gap");
    job.targetKnowledgeLocation = extractFieldBlock(job.auditAnswer, "Target Knowledge Location");
    job.knowledgeDecisionExplanation = extractFieldBlock(job.auditAnswer, "Knowledge Decision Explanation");
    job.autoGenerateKnowledgeDecision = extractField(job.auditAnswer, "Auto-Generate Knowledge Artifact");
    reconcileRetrospectiveAvoidability(job);
    reconcileRetrospectiveKnowledgeState(job);
    enforceKnowledgePortfolioPolicy(job);
    job.artifactReadiness = normalizeArtifactReadiness(job.knowledgeAction, job.artifactReadiness);
    job.knowledgeArtifactType = knowledgeArtifactType(job);

    enforceTrustedSavedFieldBoundary(job);

    job.xsupComment = buildReviewPasteComment(job.auditAnswer, {
      xsup: job.xsup,
      product: productLabel(job),
      job
    });

    job.references = extractReferences(job.auditAnswer, job.report, job.evidence, job.selectedEvidence);

    return job;
  }

  function applyLegacyRetrospectiveDonor(job, answer) {
    const a = String(answer || "");
    const setIfEmpty = (prop, value) => { if (!cleanText(job[prop] || "") && cleanText(value || "")) job[prop] = value; };
    setIfEmpty("tacWorkBeforeXsup", extractFieldBlock(a, "What TAC Could Reasonably Do Before Engineering"));
    setIfEmpty("xsupEscalationAssessment", extractFieldBlock(a, "Escalation Assessment"));
    setIfEmpty("xsupAvoidable", extractField(a, "Could Engineering Escalation Have Been Avoided Entirely?"));
    setIfEmpty("engineeringContribution", extractFieldBlock(a, "What Required Engineering Expertise"));
    setIfEmpty("priorMatchStatus", extractField(a, "Direct Prior Match Found"));
    setIfEmpty("priorReference", extractFieldBlock(a, "Best Prior Match"));
    setIfEmpty("priorKnown", extractFieldBlock(a, "What Was Already Known"));
    setIfEmpty("priorCouldHelp", extractField(a, "Could TAC Have Used This to Recognize the Problem Earlier?"));
    setIfEmpty("earlierNarrowing", extractFieldBlock(a, "Earlier Narrowing Opportunity"));
    setIfEmpty("retrospectiveImprovement", extractFieldBlock(a, "Primary Improvement Opportunity"));
    reconcileRetrospectiveAvoidability(job);
  }

  async function enrichRetrospectiveFromPriorAudits(job) {
    const enough = [job.tacWorkBeforeXsup, job.xsupEscalationAssessment, job.engineeringContribution, job.priorReference, job.priorKnown]
      .filter(v => cleanText(v || "")).length >= 3;
    if (enough || !job?.caseNumber || !job?.investigationId) return;
    try {
      const history = await getFollowupHistory(job.caseNumber, job.investigationId, {quick:true});
      const items = sortFollowupsNewest(collectFollowupHistoryItems(history));
      const xsup = String(job.xsup || "").toUpperCase();
      let best = null;
      let bestScore = 0;
      for (const item of items) {
        if (String(item.status || "").toLowerCase() !== "completed" || !item.answer || isTransientCaseChatAnswer(item.answer)) continue;
        const q = String(item.question || "");
        const a = String(item.answer || "");
        if (xsup && !`${q}\n${a}`.toUpperCase().includes(xsup)) continue;
        const score = [
          "What TAC Could Reasonably Do Before Engineering",
          "What Required Engineering Expertise",
          "Escalation Assessment",
          "Direct Prior Match Found",
          "Best Prior Match",
          "What Was Already Known",
          "Could Engineering Escalation Have Been Avoided Entirely?",
          "Primary Improvement Opportunity"
        ].reduce((n, label) => n + (a.includes(label) ? 1 : 0), 0);
        if (score > bestScore) { best = item; bestScore = score; }
      }
      if (best && bestScore >= 3) {
        applyLegacyRetrospectiveDonor(job, best.answer);
        job.retrospectiveDonorFollowupId = best.id || null;
      }
    } catch (err) {
      console.debug("XSUP Auditor: prior retrospective enrichment unavailable", err);
    }
  }

  function polishReviewCommentText(value) {
    const safeLogon = "A complete logoff/logon can reprioritize synchronization, but it does not guarantee a specific completion time or a sub-hour policy transition. Where deterministic faster policy switching is required, use Endpoint Tags.";
    let text = cleanText(value || "")
      .replace(/\[([^\n]+?)\]\((https?:\/\/[^)\s]+)\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/Sub[- ]hour policy transitions?\s+(?:require|requires|need|needs|depend(?:s)? on)[^.!?]*(?:log\s*off|logoff)[^.!?]*[.!?]?/gi, safeLogon)
      .replace(/(?:interactive user\s+)?log\s*off\s*\/\s*log\s*on\s+(?:guarantees?|ensures?|provides?)\s+sub[- ]hour[^.!?]*[.!?]?/gi, safeLogon)
      .replace(/interactive user logoff\/logon or Endpoint Tagging/gi, "logoff/logon reprioritization or Endpoint Tags, depending on the required timing")
      .replace(/API-driven tagging/gi, "currently supported tag-management mechanisms")
      .replace(/;\s*\d{1,2}\.\s*/g, ". ")
      .replace(/\s+\d{1,2}\.\s*$/g, "")
      // Repair an orphan relative clause introduced when a list boundary was
      // normalized (for example ". which do not produce...").
      .replace(/\.\s+(which|that)\b/gi, ", $1")
      .replace(/\s{2,}/g, " ")
      .trim();
    const seen = new Set();
    const sentences = text.split(/(?<=[.!?])\s+/).map(cleanText).filter(Boolean).filter(sentence => {
      const key = normalizeFieldValueForCompare(sentence);
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    });
    return sentences.join(" ");
  }
  function buildReviewPasteComment(auditText, options = {}) {
    const job = options.job || null;
    const xsup = options.xsup || job?.xsup || extractField(auditText, "Target Ticket") || "XSUP";
    const fields = job ? [
      {name:"Resolution", change:job.resolutionChangeNeeded, current:job.resolutionCurrentValue, correct:job.resolutionRecommendedValue, why:job.resolutionWhy},
      {name:"RCA", change:job.rcaChangeNeeded, current:job.rcaCurrentValue, correct:job.rcaRecommendedValue, why:job.rcaWhy},
      {name:"Fix Type", change:job.fixTypeChangeNeeded, current:job.fixTypeCurrentValue, correct:job.fixTypeRecommendedValue, why:job.fixTypeWhy},
      {name:"Flag / Label", change:job.labelChangeNeeded, current:job.labelCurrentValue, correct:job.labelRecommendedValue, why:job.labelWhy}
    ] : [
      {name:"Resolution", change:extractField(auditText,"Resolution Change Needed"), current:extractField(auditText,"Resolution Current Value"), correct:extractField(auditText,"Resolution Recommended Value"), why:extractFieldBlock(auditText,"Resolution Why")},
      {name:"RCA", change:extractField(auditText,"RCA Change Needed"), current:extractField(auditText,"RCA Current Value"), correct:extractField(auditText,"RCA Recommended Value"), why:extractFieldBlock(auditText,"RCA Why")},
      {name:"Fix Type", change:extractField(auditText,"Fix Type Change Needed"), current:extractField(auditText,"Fix Type Current Value"), correct:extractField(auditText,"Fix Type Recommended Value"), why:extractFieldBlock(auditText,"Fix Type Why")},
      {name:"Flag / Label", change:extractField(auditText,"Label / Flag Change Needed"), current:extractField(auditText,"Flag / Label Current Value")||extractField(auditText,"Label / Flag Current Value"), correct:extractField(auditText,"Flag / Label Recommended Value")||extractField(auditText,"Label / Flag Recommended Value"), why:extractFieldBlock(auditText,"Flag / Label Why")||extractFieldBlock(auditText,"Label / Flag Why")}
    ];

    const applicable = fields.filter(f => f.change && !/^(not applicable|n\/a)$/i.test(f.change) && cleanText(f.correct || ""));
    const correctValue = applicable.length === 1
      ? cleanText(applicable[0].correct)
      : applicable.length > 1
        ? applicable.map(f => `${f.name} — ${cleanText(f.correct)}`).join("; ")
        : "UNDETERMINED";

    const issue = polishReviewCommentText(smeReviewIssueSummary(job?.reportedIssue || extractFieldBlock(auditText, "Reported Issue"), 2));
    const primaryField = applicable[0]?.name || "field";
    const primaryWhy = applicable.map(f => humanFacingWhy(f.why)).find(Boolean) || "";
    const finding = completeHumanFinding(job || {technicalConclusion:extractFieldBlock(auditText,"Technical Conclusion"), technicalEvidenceExplanation:extractFieldBlock(auditText,"Technical Conclusion Evidence Explanation")}, 4);
    const commentParagraphs = [];
    if (issue) commentParagraphs.push(limitHumanText(issue, 900));
    const explanation = polishReviewCommentText(primaryWhy || "");
    if (explanation && normalizeFieldValueForCompare(explanation) !== normalizeFieldValueForCompare(issue)) commentParagraphs.push(limitHumanText(explanation, 900));
    const completeFinding = polishReviewCommentText(finding);
    const already = commentParagraphs.join(" ");
    if (completeFinding && normalizeFieldValueForCompare(completeFinding) !== normalizeFieldValueForCompare(issue)) {
      if (!internalNoteNearDuplicate(completeFinding, already)) {
        commentParagraphs.push(limitHumanText(completeFinding, 1200));
      } else {
        // Preserve materially distinct branches from a multi-cause finding even
        // when the opening sentence overlaps the field explanation already added.
        const existingNorm = normalizeFieldValueForCompare(already);
        const novel = completeFinding.split(/(?<=[.!?])\s+/).map(cleanText).filter(Boolean).filter(sentence => {
          const normalized = normalizeFieldValueForCompare(sentence);
          return normalized && !existingNorm.includes(normalized) && !internalNoteNearDuplicate(sentence, already);
        });
        if (novel.length) commentParagraphs.push(limitHumanText(novel.join(" "), 1200));
      }
    }
    const practical = polishReviewCommentText(immediateOperationalGuidance(job || {}));
    const currentComment = normalizeFieldValueForCompare(commentParagraphs.join(" "));
    if (practical && !currentComment.includes(normalizeFieldValueForCompare(practical))) commentParagraphs.push(limitHumanText(practical, 700));
    if (correctValue && !/^UNDETERMINED$/i.test(correctValue)) commentParagraphs.push(`Therefore, ${correctValue} is the appropriate ${primaryField}.`);

    const corrections = applicable
      .filter(f => isKnownSavedValue(f.current) && !sameFieldValue(f.current, f.correct))
      .map(f => `Saved ${f.name} is ${cleanText(f.current)}; change it to ${cleanText(f.correct)}.`);
    if (corrections.length) commentParagraphs.push(corrections.join(" "));

    const profile = job ? getProductProfile(job.productKey) : null;
    const reviewedFieldNames = applicable.length
      ? [...new Set(applicable.map(f => f.name))]
      : (profile?.primaryFieldOrder?.length ? [...profile.primaryFieldOrder] : ["TAC-Owned Field"]);
    const reviewedFieldLabel = reviewedFieldNames.join(" & ");
    const productName = job ? productLabel(job) : cleanText(options.product || "Product");
    const reviewHeading = `***XSUP APAC TAC ${reviewedFieldLabel} Review — ${xsup}${productName ? ` | ${productName}` : ""}***`;

    const lines = [
      reviewHeading,
      "",
      `***Correct Value:*** ${correctValue}`,
      "",
      "***Comment:***",
      commentParagraphs.filter(Boolean).join("\n\n") || "No concise technical comment was returned.",
      "",
      "***Action Plan:***"
    ];

    const plan = knowledgeActionPlanBlocks(job, auditText);
    const tacAction = cleanHumanLearning(job?.tacActionItem || extractFieldBlock(auditText, "TAC Action Item"), 2);
    if (plan.summary) {
      lines.push(plan.summary);
      for (const block of plan.blocks) {
        lines.push("", `${block.label} action:`, "", limitHumanText(block.instruction, 1000));
        if (block.reason) lines.push("", "Why:", "", limitHumanText(block.reason, 1200));
      }
    } else if (tacAction) {
      lines.push("TAC action:", "", limitHumanText(tacAction, 1200));
    } else {
      lines.push("No additional TAC or knowledge action identified.");
    }

    return lines.join("\n").replace(/\n{4,}/g,"\n\n\n").trim();
  }

  function extractReferences(...sources) {
    const refs = [];
    const seen = new Set();
    const visited = new Set();

    function inferredReferenceType(url, title = "", type = "") {
      const explicit = cleanText(type || "");
      if (explicit && !/^(?:reference|Referenced source|Case Chat reference)$/i.test(explicit)) return explicit;
      const q = `${url || ""} ${title || ""}`.toLowerCase();
      if (/docs\.|documentation|\/docs?\/|techdocs|knowledgebase|knowledge\//.test(q)) return "Official documentation";
      if (/jira|browse\/xsup-|browse\//.test(q)) return "Jira / Engineering";
      if (/salesforce|lightning\/r\/case|sfdc/.test(q)) return "Salesforce Support Case";
      if (/confluence|runbook|internal wiki/.test(q)) return "Internal documentation";
      return "Referenced source";
    }

    function add(url, title = "", type = "") {
      if (!url || typeof url !== "string") return;
      const rawUrl = url.replace(/&amp;/g, "&").trim().replace(/^[<`]+/, "").replace(/[>`.,;:!?]+$/, "");
      if (!/^https?:\/\//i.test(rawUrl)) return;
      const cleanUrl = safeUrl(rawUrl) || rawUrl;
      const dedupeKey = cleanUrl.replace(/#$/, "");
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      refs.push({
        url: cleanUrl,
        title: cleanText(title) || cleanUrl,
        type: inferredReferenceType(cleanUrl, title, type)
      });
    }

    function parseRefTags(s) {
      if (typeof s !== "string") return;
      const tagRe = /<ref\b([^>]*)>/gi;
      let m;
      while ((m = tagRe.exec(s))) {
        const attrs = m[1] || "";
        const url = attrs.match(/\burl="([^"]+)"/i)?.[1] || "";
        const title = attrs.match(/\btitle="([^"]+)"/i)?.[1] || "";
        const type = attrs.match(/\btype="([^"]+)"/i)?.[1] || "";
        add(url, title, type);
      }
    }

    function walk(v) {
      if (v == null) return;

      if (typeof v === "string") {
        parseRefTags(v);
        parsePlainUrls(v);
        return;
      }

      if (typeof v !== "object") return;
      if (visited.has(v)) return;
      visited.add(v);

      if (typeof v.url === "string") {
        add(
          v.url,
          v.title || v.name || v.display_name || v.source_title || "",
          v.type || v.source_type || v.category || ""
        );
      }

      for (const val of Object.values(v)) walk(val);
    }

    function parsePlainUrls(s) {
      if (typeof s !== "string") return;

      const markdownRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
      let mm;
      while ((mm = markdownRe.exec(s))) {
        add(mm[2], mm[1], "Referenced source");
      }

      const urls = s.match(/https?:\/\/[^\s<>"')\]]+/g) || [];
      for (const url of urls) {
        add(url.replace(/[.,;:!?]+$/, ""), "", "reference");
      }
    }

    for (const source of sources) {
      walk(source);
      if (typeof source === "string") parsePlainUrls(source);
    }

    const priority = r => {
      const t = `${r.type} ${r.title} ${r.url}`.toLowerCase();
      if (/docs|documentation|admin|guide|knowledge|kcs|confluence/.test(t)) return 0;
      if (/case|salesforce|jira/.test(t)) return 2;
      return 1;
    };

    return refs
      .sort((a,b) => priority(a) - priority(b))
      .slice(0, 20);
  }

  function renderTargetLinks() {
    const box = document.getElementById("xsup-auditor-target-links");
    if (!box) return;

    const items = [];

    const jira =
      safeUrl(state.targetLinks?.jira) ||
      (state.xsup ? safeUrl(`https://jira-dc.paloaltonetworks.com/browse/${state.xsup}`) : null);

    const sfdc = safeUrl(state.targetLinks?.sfdc);
    const taco = safeUrl(state.targetLinks?.tacopilot);

    if (jira) {
      items.push(`<a class="xa-target-link" href="${escapeHtml(jira)}" target="_blank" rel="noopener noreferrer">↗ Open Jira ${escapeHtml(state.xsup || "")}</a>`);
    }

    if (sfdc) {
      items.push(`<a class="xa-target-link" href="${escapeHtml(sfdc)}" target="_blank" rel="noopener noreferrer">↗ Open SFDC ${escapeHtml(state.caseNumber || "")}</a>`);
    }

    if (taco) {
      items.push(`<a class="xa-target-link" href="${escapeHtml(taco)}" target="_blank" rel="noopener noreferrer">↗ Open TACopilot ${escapeHtml(state.caseNumber || "")}</a>`);
    }

    if (state.caseNumber && !sfdc) {
      items.push(`<span class="xa-target-note">SFDC direct link not found in TACopilot data</span>`);
    }

    box.innerHTML = items.join("");
    box.style.display = items.length ? "flex" : "none";
  }

  function renderReferences(refs) {
    const box = document.getElementById("xsup-auditor-references-list");
    if (!box) return;

    if (!refs?.length) {
      box.innerHTML = `<div class="xa-ref-empty">No direct supporting reference URLs were captured in the final audit/artifact.</div>`;
      return;
    }

    box.innerHTML = refs.map((r, i) => {
      const safeTitle = (r.title || r.url)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      const safeType = (r.type || "reference")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const safeUrl = r.url.replace(/"/g, "&quot;");
      return `<div class="xa-ref"><span>${i+1}.</span><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeTitle}</a><em>${safeType}</em></div>`;
    }).join("");
  }

  async function copyWithFeedback(button, text) {
    if (!text) return;
    await navigator.clipboard.writeText(text);

    if (!button) return;
    const oldText = button.textContent;
    button.textContent = "✓ Copied";
    button.classList.add("xa-copied");

    setTimeout(() => {
      button.textContent = oldText;
      button.classList.remove("xa-copied");
    }, 1400);
  }

  function getSelectedJob() {
    return state.selectedXsup ? state.jobs.get(state.selectedXsup) || null : null;
  }

  function syncSelectedState(job) {
    if (!job) {
      state.xsup = "";
      state.caseNumber = "";
      state.investigationId = null;
      state.report = null;
      state.evidence = null;
      state.auditAnswer = "";
      state.xsupComment = "";
      state.references = [];
      state.targetLinks = { jira: "", sfdc: "", tacopilot: "" };
      state.lastPrompt = "";
      return;
    }

    state.xsup = job.xsup || "";
    state.caseNumber = job.caseNumber || "";
    state.investigationId = job.investigationId || null;
    state.report = job.report || null;
    state.evidence = job.evidence || null;
    state.auditAnswer = job.auditAnswer || "";
    state.xsupComment = job.xsupComment || "";
    state.references = job.references || [];
    state.targetLinks = job.targetLinks || { jira: "", sfdc: "", tacopilot: "" };
    state.lastPrompt = job.lastPrompt || "";
  }


  function knowledgeWorkExpected(job) {
    if (!job) return false;
    if (job.directKnowledgeOnly) return true;
    if (job.manualAuditOnly) return false;
    if (!state.autoGenerateKnowledge || !job.auditAnswer) return false;
    const requests = job.knowledgeArtifactRequests?.length
      ? job.knowledgeArtifactRequests
      : knowledgeArtifactRequests(job);
    return requests.length > 0;
  }

  function knowledgeUiState(job) {
    if (!job) return "none";

    const reuseState = String(job.knowledgeReuseStatus || "").toLowerCase();
    const knowledgeState = String(job.knowledgeStatus || "").toLowerCase();

    // Terminal knowledge state always wins over stale reuse/checking metadata.
    // This prevents a completed artifact from being displayed as active again.
    if (knowledgeState === "completed") return "complete";
    if (["not_required", "not_generated"].includes(knowledgeState)) return "done";
    if (knowledgeState === "failed") return "failed";
    if (knowledgeState === "stopped") return "stopped";
    if (knowledgeState === "outdated") return "outdated";
    if (knowledgeState === "queued") return "waiting";
    if (
      knowledgeState === "generating" ||
      ["checking", "waiting_existing"].includes(reuseState)
    ) return "active";

    // Once Audit is complete, a required downstream Knowledge artifact keeps the
    // overall workflow pending even during the tiny handoff window before queueing.
    if (job.status === "completed" && knowledgeWorkExpected(job)) return "waiting";

    return "none";
  }

  function jobWorkflowComplete(job) {
    if (!job || job.status !== "completed") return false;
    const knowledgeState = knowledgeUiState(job);
    if (knowledgeState === "complete") return true;
    if (knowledgeState === "done") return !auditRequiresKnowledgeArtifact(job);
    if (knowledgeState === "none") return !knowledgeWorkExpected(job) && !auditRequiresKnowledgeArtifact(job);
    return false;
  }

  function dashboardVisualState(job) {
    const ui = overallUiState(job);
    if (ui === "active") return "running";
    if (ui === "waiting") return "queued";
    if (ui === "action") return job?.status === "needs_product" ? "needs_product" : "needs_selection";
    if (ui === "attention") return "needs_product";
    if (ui === "complete") return "completed";
    return ui || "pending";
  }

  function jobElapsedText(job) {
    if (!job?.startedAt) return "—";
    const terminal = jobWorkflowComplete(job) || ["failed", "stopped"].includes(job.status) || ["failed", "stopped"].includes(knowledgeUiState(job));
    const endAt = terminal
      ? (job.knowledgeEndedAt || job.endedAt || Date.now())
      : Date.now();
    return formatElapsed(Math.max(0, endAt - job.startedAt));
  }

  function overallUiState(job) {
    if (!job) return "pending";

    if (job.status === "failed") return "failed";
    if (job.status === "stopped") return "stopped";
    if (job.status === "needs_selection" || job.status === "needs_sfdc" || job.status === "needs_product") return "action";
    if (job.status === "queued") return "waiting";
    if (job.status === "running") return "active";

    const knowledgeState = knowledgeUiState(job);
    if (knowledgeState === "failed") return "failed";
    if (knowledgeState === "stopped") return "stopped";
    if (knowledgeState === "outdated") return "attention";
    if (knowledgeState === "waiting") return "waiting";
    if (knowledgeState === "active") return "active";

    if (jobWorkflowComplete(job)) return "complete";
    if (job.status === "completed" && knowledgeWorkExpected(job)) return "waiting";
    return "pending";
  }

  function overallUiActivity(job) {
    const stateName = overallUiState(job);
    const knowledgeState = knowledgeUiState(job);

    if (knowledgeState === "active") {
      const label = knowledgeArtifactLabel(job.knowledgeArtifactType || knowledgeArtifactType(job));
      return job.knowledgeProgress
        ? `Knowledge · ${job.knowledgeProgress}`
        : `Knowledge · checking/generating ${label}`;
    }

    if (knowledgeState === "waiting") {
      const label = knowledgeArtifactLabel(job.knowledgeArtifactType || knowledgeArtifactType(job));
      return String(job.knowledgeStatus || "").toLowerCase() === "queued"
        ? `Knowledge queued · ${label}`
        : `Knowledge pending · ${label}`;
    }

    if (knowledgeState === "failed") return `Knowledge failed${job.knowledgeError ? ` · ${job.knowledgeError}` : ""}`;
    if (knowledgeState === "outdated") return "Knowledge needs regeneration after the audit was regenerated";

    if (job.status === "completed") {
      const v = primaryReviewVerdict(job);
      return `Complete${v ? ` · ${v}` : job.retrospectiveEligibility ? ` · ${job.retrospectiveEligibility}` : ""}`;
    }

    return "";
  }

  function jobIcon(job) {
    const ui = overallUiState(job);
    if (ui === "active") return "⟳";
    if (ui === "waiting") return "!";
    if (ui === "failed") return "✕";
    if (ui === "stopped") return "■";
    if (ui === "action") return "◈";
    if (ui === "attention") return "⚠";
    if (ui === "complete") {
      if (anyIncorrectVerdict(job)) return "⚠";
      if (/^undetermined$/i.test(primaryReviewVerdict(job) || "")) return "?";
      return "✓";
    }
    return "○";
  }

  function jobResultText(job) {
    const knowledgeState = knowledgeUiState(job);

    if (knowledgeState === "active") return "Knowledge in progress";
    if (knowledgeState === "waiting") return String(job.knowledgeStatus || "").toLowerCase() === "queued" ? "Knowledge queued" : "Knowledge pending";
    if (knowledgeState === "failed") return "Knowledge failed";
    if (knowledgeState === "outdated") return "Knowledge needs regeneration";

    if (job.status === "completed") {
      return primaryReviewVerdict(job) || job.retrospectiveEligibility || "Complete";
    }
    if (job.status === "failed") return "Failed";
    if (job.status === "stopped") return "Stopped";
    if (job.status === "needs_sfdc") return "Enter SFDC";
    if (job.status === "needs_selection") return `Choose SFDC (${job.sfdcCandidates?.length || 0})`;
    if (job.status === "needs_product") return "Choose Product";
    if (job.status === "running") return job.stageLabel || "Running";
    return "Queued";
  }

  function clampProgress(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }

  function queuePosition(job) {
    if (!job || job.status !== "queued") return null;
    const queued = state.queue.filter(x => state.jobs.get(x)?.status === "queued");
    const idx = queued.indexOf(job.xsup);
    return idx >= 0 ? idx + 1 : null;
  }

  function computeOverallProgress(job, key, value, meta = {}) {
    if (job.status === "completed" || /✓\s*Completed/i.test(value || "")) return 100;
    if (job.status === "failed" || job.status === "stopped") return clampProgress(job.overallProgress || 0);

    if (key === "resolve") {
      return /^✓/.test(String(value || "")) ? 5 : 2;
    }

    if (key === "taco") {
      const tp = Number(meta.tacoProgress);
      if (Number.isFinite(tp)) return Math.round(5 + (clampProgress(tp) * 0.55));
      if (/completed|report content|refreshed report/i.test(String(value || ""))) return 60;
      return Math.max(clampProgress(job.overallProgress || 0), 7);
    }

    if (key === "evidence") {
      return /^✓/.test(String(value || "")) ? 72 : 64;
    }

    if (key === "audit") {
      const s = String(value || "");
      if (/✓\s*Completed/i.test(s)) return 100;
      if (/follow-up #/i.test(s)) return 86;
      if (/Case Chat:/i.test(s)) return 92;
      if (/Waiting for Case Chat result/i.test(s)) return 82;
      if (/Submitting|Retrying/i.test(s)) return 76;
      return Math.max(clampProgress(job.overallProgress || 0), 76);
    }

    return clampProgress(job.overallProgress || 0);
  }

  function activityForJob(job) {
    if (!job) return "—";

    const overallActivity = overallUiActivity(job);
    if (
      knowledgeUiState(job) !== "none" &&
      ["active", "waiting", "failed", "outdated"].includes(knowledgeUiState(job))
    ) return overallActivity;

    if (job.status === "queued") {
      const pos = queuePosition(job);
      return pos ? `Queued · #${pos} next` : "Queued";
    }
    if (job.status === "needs_sfdc") return "Enter SFDC to continue";
    if (job.status === "needs_selection") return `Choose SFDC · ${job.sfdcCandidates?.length || 0} matches`;
    if (job.status === "needs_product") return `Choose Product${job.productSuggestedKey ? ` · suggested ${productLabel(job.productSuggestedKey)}` : ""}`;
    if (job.status === "failed") return job.error ? `Failed · ${job.error}` : "Failed";
    if (job.status === "stopped") return "Stopped";
    if (job.status === "completed") return overallActivity || "Complete";
    return job.currentActivity || job.stageLabel || "Running";
  }

  function heartbeatInfo(job) {
    if (!job) return { text: "—", kind: "" };

    // The Last update column must follow the single authoritative overall workflow
    // state. Never show Completed while any required downstream work is queued,
    // pending, or active. This also makes the value monotonic across Audit -> KCS.
    const ui = overallUiState(job);
    const knowledgeState = knowledgeUiState(job);

    if (ui === "failed") return { text: knowledgeState === "failed" ? "Knowledge failed" : "Failed", kind: "bad" };
    if (ui === "stopped") return { text: "Stopped", kind: "warn" };
    if (ui === "action") return { text: "Action required", kind: "warn" };
    if (ui === "attention") return { text: "Knowledge regeneration available", kind: "warn" };

    if (ui === "waiting") {
      if (knowledgeState === "waiting") {
        return {
          text: String(job.knowledgeStatus || "").toLowerCase() === "queued"
            ? "Waiting for knowledge worker"
            : "Waiting for knowledge decision/queue",
          kind: "warn"
        };
      }
      return { text: "Waiting in queue", kind: "" };
    }

    if (ui === "active") {
      const now = Date.now();
      if (knowledgeState === "active") {
        const heartbeatAt = job.knowledgeLastHeartbeatAt || job.knowledgeStartedAt || job.lastHeartbeatAt || now;
        const age = Math.max(0, now - heartbeatAt);
        if (age >= NO_RESPONSE_WARNING_MS) return { text: `⚠ No knowledge response for ${formatElapsed(age)}`, kind: "bad" };
        return { text: `Knowledge response ${formatElapsed(age)} ago`, kind: "live" };
      }
      const heartbeatAt = job.lastHeartbeatAt || job.startedAt || now;
      const age = Math.max(0, now - heartbeatAt);
      if (age >= NO_RESPONSE_WARNING_MS) return { text: `⚠ No response for ${formatElapsed(age)}`, kind: "bad" };
      return { text: `Response ${formatElapsed(age)} ago`, kind: "live" };
    }

    if (ui === "complete") return { text: "Completed", kind: "ok" };
    return { text: "Pending", kind: "" };
  }

  function progressLabel(job) {
    if (!job) return "—";

    const knowledgeState = knowledgeUiState(job);
    if (job.status === "completed" && knowledgeState === "active") return "Audit 100% · Knowledge running";
    if (job.status === "completed" && knowledgeState === "waiting") return String(job.knowledgeStatus || "").toLowerCase() === "queued"
      ? "Audit 100% · Knowledge queued"
      : "Audit 100% · Knowledge pending";
    if (job.status === "completed" && knowledgeState === "failed") return "Audit 100% · Knowledge failed";
    if (job.status === "completed" && knowledgeState === "outdated") return "Audit 100% · Knowledge needs regeneration";

    if (job.status === "completed") return "100%";
    if (job.status === "failed") return `Failed at ~${Math.round(clampProgress(job.overallProgress || 0))}%`;
    if (job.status === "stopped") return `Stopped at ~${Math.round(clampProgress(job.overallProgress || 0))}%`;
    if (job.status === "needs_sfdc") return "5% · enter SFDC";
    if (job.status === "needs_selection") return "5% · choose SFDC";
    if (job.status === "needs_product") return "8% · choose product";
    if (job.status === "queued") {
      const pos = queuePosition(job);
      return pos ? `Queued #${pos}` : "Queued";
    }
    return `~${Math.round(clampProgress(job.overallProgress || 0))}%`;
  }

  function progressBarHtml(job, compact = false) {
    const p = job.status === "completed" ? 100 : clampProgress(job.overallProgress || 0);
    const taco = Number.isFinite(Number(job.tacoProgress)) && /TACO/i.test(job.stageLabel || "")
      ? `TACO ${Math.round(clampProgress(job.tacoProgress))}%${job.tacoNode ? ` · ${job.tacoNode}` : ""}`
      : "";

    return `
      <div class="xa-progress-wrap ${compact ? "compact" : ""}" data-progress-job="${escapeHtml(job.xsup || "")}">
        <div class="xa-progress-top"><strong data-progress-label="${escapeHtml(job.xsup || "")}">${escapeHtml(progressLabel(job))}</strong><span data-progress-taco="${escapeHtml(job.xsup || "")}" class="${taco ? "xa-progress-sub" : ""}">${escapeHtml(taco)}</span></div>
        <div class="xa-progress-track"><span data-progress-bar="${escapeHtml(job.xsup || "")}" style="width:${p}%"></span></div>
      </div>
    `;
  }

  function dashboardHasChange(job) {
    return [job?.resolutionChangeNeeded, job?.rcaChangeNeeded, job?.fixTypeChangeNeeded, job?.labelChangeNeeded]
      .some(v => /^yes$/i.test(v || ""));
  }

  function dashboardChangeText(job) {
    const eligibility = normalizeDecision(job?.retrospectiveEligibility);
    const applicable = [job?.resolutionChangeNeeded, job?.rcaChangeNeeded, job?.fixTypeChangeNeeded, job?.labelChangeNeeded]
      .filter(v => v && !/^(not applicable|n\/a)$/i.test(v));
    if (dashboardHasChange(job)) return "YES";
    if (eligibility === "OUT OF SCOPE") return "N/A";
    if (applicable.some(v => /^no$/i.test(v))) return "NO";
    if (job?.auditAnswer) return "UNDETERMINED";
    return "—";
  }

  function dashboardCounts(jobs = [...state.jobs.values()]) {
    return {
      running: jobs.filter(j => overallUiState(j) === "active").length,
      queued: jobs.filter(j => overallUiState(j) === "waiting").length,
      chooseSfdc: jobs.filter(j => j.status === "needs_selection" || j.status === "needs_sfdc").length,
      chooseProduct: jobs.filter(j => j.status === "needs_product").length,
      complete: jobs.filter(jobWorkflowComplete).length,
      failed: jobs.filter(j => overallUiState(j) === "failed").length,
      incorrect: jobs.filter(anyIncorrectVerdict).length,
      changes: jobs.filter(dashboardHasChange).length,
      knowledgeGenerating: jobs.filter(j => j.knowledgeStatus === "generating").length,
      knowledgeQueued: jobs.filter(j => j.knowledgeStatus === "queued").length,
      knowledgeDone: jobs.filter(j => j.knowledgeStatus === "completed").length
    };
  }

  function refreshDashboardStats() {
    const counts = dashboardCounts();
    const values = {
      "Running": counts.running,
      "Queued": counts.queued,
      "Choose SFDC": counts.chooseSfdc,
      "Choose Product": counts.chooseProduct,
      "Complete": counts.complete,
      "Incorrect": counts.incorrect,
      "Ticket Changes": counts.changes,
      "Knowledge": counts.knowledgeGenerating || counts.knowledgeQueued
        ? `${counts.knowledgeGenerating} / ${counts.knowledgeQueued}`
        : counts.knowledgeDone,
      "Failed": counts.failed
    };
    const classes = {
      "Running": counts.running ? "run" : "",
      "Queued": counts.queued ? "warn" : "",
      "Choose SFDC": counts.chooseSfdc ? "warn" : "",
      "Choose Product": counts.chooseProduct ? "warn" : "",
      "Complete": counts.complete ? "ok" : "",
      "Incorrect": counts.incorrect ? "warn" : "",
      "Ticket Changes": counts.changes ? "warn" : "",
      "Knowledge": counts.knowledgeGenerating ? "run" : counts.knowledgeQueued ? "warn" : counts.knowledgeDone ? "ok" : "",
      "Failed": counts.failed ? "bad" : ""
    };
    for (const [label, value] of Object.entries(values)) {
      document.querySelectorAll(`[data-dashboard-stat="${label}"]`).forEach(box => {
        const strong = box.querySelector("strong");
        if (strong) strong.textContent = String(value);
        box.className = `xa-stat ${classes[label] || ""}`.trim();
      });
    }
  }

  function refreshLiveTimeLabels() {
    refreshDashboardStats();
    for (const job of state.jobs.values()) {
      document.querySelectorAll(`[data-job-elapsed="${job.xsup}"]`).forEach(el => {
        el.textContent = jobElapsedText(job);
      });

      const hb = heartbeatInfo(job);
      document.querySelectorAll(`[data-job-heartbeat="${job.xsup}"]`).forEach(el => {
        el.textContent = hb.text;
        el.dataset.kind = hb.kind;
      });

      // Routine backend heartbeats/progress polls update existing DOM nodes in place.
      // Full dashboard/table replacement is reserved for structural state changes so
      // the Live Dashboard does not flash while long TACO/Case Chat work is running.
      document.querySelectorAll(`[data-job-activity="${job.xsup}"]`).forEach(el => {
        el.textContent = activityForJob(job);
      });
      document.querySelectorAll(`[data-job-result="${job.xsup}"]`).forEach(el => {
        const visual = dashboardVisualState(job);
        el.textContent = `${jobIcon(job)} ${jobResultText(job)}`;
        el.className = `xa-status-pill xa-pill-${visual}`;
      });
      document.querySelectorAll(`[data-job-row="${job.xsup}"]`).forEach(el => {
        el.className = `xa-dashboard-row xa-row-${dashboardVisualState(job)}`;
      });
      document.querySelectorAll(`[data-job-sidebar-status="${job.xsup}"]`).forEach(el => {
        const ui = overallUiState(job);
        el.textContent = ui === "active" || ui === "waiting" ? activityForJob(job) : jobResultText(job);
      });
      document.querySelectorAll(`[data-job-knowledge-text="${job.xsup}"]`).forEach(el => {
        el.textContent = `${knowledgeStatusIcon(job)} ${knowledgeStatusText(job)}`;
      });
      document.querySelectorAll(`[data-job-reviewed="${job.xsup}"]`).forEach(el => {
        el.textContent = job.reviewedFields || "—";
      });
      document.querySelectorAll(`[data-job-review-verdict="${job.xsup}"]`).forEach(el => {
        el.textContent = primaryReviewVerdict(job) || job.retrospectiveEligibility || "—";
      });
      document.querySelectorAll(`[data-job-change-needed="${job.xsup}"]`).forEach(el => {
        el.textContent = dashboardChangeText(job);
      });
      document.querySelectorAll(`[data-job-knowledge-meta="${job.xsup}"]`).forEach(el => {
        const readiness = job.validatedArtifactReadiness || job.artifactReadiness || "";
        el.textContent = job.knowledgeAction ? `${job.knowledgeAction}${readiness ? ` · ${readiness}` : ""}` : "";
      });
      document.querySelectorAll(`[data-job-product-action="${job.xsup}"]`).forEach(el => {
        if (job.status === "needs_product") {
          el.textContent = "Choose Product";
          el.disabled = false;
          return;
        }
        if (!job.productKey) return;
        const locked = (job.productLocked && job.status === "running") || job.knowledgeStatus === "generating";
        el.textContent = `${productLabel(job)}${job.productSelectionSource === "manual" ? " · Manual" : ""}${locked ? " · Locked" : ""}`;
        el.disabled = locked;
      });
      document.querySelectorAll(`[data-progress-label="${job.xsup}"]`).forEach(el => {
        el.textContent = progressLabel(job);
      });
      const progressWidth = job.status === "completed" ? 100 : clampProgress(job.overallProgress || 0);
      document.querySelectorAll(`[data-progress-bar="${job.xsup}"]`).forEach(el => {
        el.style.width = `${progressWidth}%`;
      });
      const tacoText = Number.isFinite(Number(job.tacoProgress)) && /TACO/i.test(job.stageLabel || "")
        ? `TACO ${Math.round(clampProgress(job.tacoProgress))}%${job.tacoNode ? ` · ${job.tacoNode}` : ""}`
        : "";
      document.querySelectorAll(`[data-progress-taco="${job.xsup}"]`).forEach(el => {
        el.textContent = tacoText;
        el.className = tacoText ? "xa-progress-sub" : "";
      });
    }

    const selected = getSelectedJob();
    if (selected) {
      const hb = heartbeatInfo(selected);
      const hbEl = document.getElementById("xsup-auditor-selected-heartbeat");
      if (hbEl) {
        hbEl.textContent = hb.text;
        hbEl.dataset.kind = hb.kind;
      }
      const elapsedEl = document.getElementById("xsup-auditor-selected-elapsed");
      if (elapsedEl) {
        elapsedEl.textContent = jobElapsedText(selected);
      }
    }
  }

  function showDashboard() {
    state.viewMode = "dashboard";
    state.selectedXsup = "";
    renderJobList();
    renderDashboard();
    renderSelectedJob();
  }

  // ===========================================================================
  // UI RENDERING
  // ===========================================================================

  function dashboardRenderSignature(jobs) {
    // Only DOM-shape changes belong in the render signature. Routine progress,
    // verdict, review, heartbeat, and knowledge changes are refreshed in place.
    // This prevents the full dashboard table from being destroyed/recreated while
    // work is active, which caused visible flashing and stale Completed cells.
    return JSON.stringify((jobs || []).map(job => ({
      xsup: job.xsup || "",
      sfdcMode: job.status === "needs_sfdc" ? "enter" : job.status === "needs_selection" ? "choose" : job.caseNumber ? "linked" : "none",
      caseNumber: job.caseNumber || "",
      sfdcUrl: job.targetLinks?.sfdc || "",
      productMode: job.status === "needs_product"
        ? "choose"
        : job.productKey ? "linked" : "none",
      productKey: job.productKey || "",
      productSelectionSource: job.productSelectionSource || ""
    })));
  }

  function renderDashboard() {
    const dash = document.getElementById("xsup-auditor-dashboard");
    if (!dash) return;

    const jobs = [...state.jobs.values()];
    const renderSignature = dashboardRenderSignature(jobs);
    if (state.dashboardRenderSignature === renderSignature && dash.childElementCount) {
      refreshLiveTimeLabels();
      return;
    }
    state.dashboardRenderSignature = renderSignature;
    const counts = dashboardCounts(jobs);

    const stat = (label, value, cls = "") => `
      <div class="xa-stat ${cls}" data-dashboard-stat="${escapeHtml(label)}"><strong>${value}</strong><span>${label}</span></div>
    `;

    const rows = jobs.map(job => {
      const caseText = job.caseNumber
        ? escapeHtml(job.caseNumber)
        : job.sfdcCandidates?.length > 1
          ? `${job.sfdcCandidates.length} matches`
          : "—";

      const sfdcUrl = safeUrl(job.targetLinks?.sfdc);
      const sfdcAction = job.status === "needs_sfdc"
        ? `<button class="xa-table-link xa-enter-sfdc" data-xsup="${escapeHtml(job.xsup)}">Enter SFDC</button>`
        : job.status === "needs_selection"
          ? `<button class="xa-table-link xa-choose-sfdc" data-xsup="${escapeHtml(job.xsup)}">Choose SFDC</button>`
        : job.caseNumber && sfdcUrl
          ? `<a class="xa-table-link" href="${escapeHtml(sfdcUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(job.caseNumber)}</a>`
          : caseText;

      const productChangeLocked =
        (job.productLocked && job.status === "running") ||
        job.knowledgeStatus === "generating";
      const productAction = job.status === "needs_product"
        ? `<button class="xa-table-link xa-change-product" data-xsup="${escapeHtml(job.xsup)}" data-job-product-action="${escapeHtml(job.xsup)}">Choose Product</button>`
        : job.productKey
          ? `<button class="xa-table-link xa-change-product" data-xsup="${escapeHtml(job.xsup)}" data-job-product-action="${escapeHtml(job.xsup)}" ${productChangeLocked ? "disabled" : ""}>${escapeHtml(productLabel(job))}${job.productSelectionSource === "manual" ? " · Manual" : ""}${productChangeLocked ? " · Locked" : ""}</button>`
          : "—";

      const heartbeat = heartbeatInfo(job);
      const reviewed = job.reviewedFields || "—";
      const changeText = dashboardChangeText(job);
      const reviewVerdict = primaryReviewVerdict(job) || job.retrospectiveEligibility || "—";
      const visualState = dashboardVisualState(job);

      return `
        <tr data-job-row="${escapeHtml(job.xsup)}" class="xa-dashboard-row xa-row-${escapeHtml(visualState)}">
          <td><button class="xa-table-link xa-open-job" data-xsup="${escapeHtml(job.xsup)}">${escapeHtml(job.xsup)}</button></td>
          <td>${productAction}</td>
          <td>${sfdcAction}</td>
          <td>${progressBarHtml(job)}</td>
          <td>
            <div class="xa-activity" data-job-activity="${escapeHtml(job.xsup)}">${escapeHtml(activityForJob(job))}</div>
            <span class="xa-status-pill xa-pill-${escapeHtml(visualState)}" data-job-result="${escapeHtml(job.xsup)}">${jobIcon(job)} ${escapeHtml(jobResultText(job))}</span>
          </td>
          <td><span class="xa-heartbeat" data-job-heartbeat="${escapeHtml(job.xsup)}" data-kind="${heartbeat.kind}">${escapeHtml(heartbeat.text)}</span></td>
          <td><span data-job-reviewed="${escapeHtml(job.xsup)}">${escapeHtml(reviewed)}</span></td>
          <td><span data-job-review-verdict="${escapeHtml(job.xsup)}">${escapeHtml(reviewVerdict)}</span></td>
          <td><span data-job-change-needed="${escapeHtml(job.xsup)}">${escapeHtml(changeText)}</span></td>
          <td>
            <div class="xa-knowledge-cell">
              <strong data-job-knowledge-text="${escapeHtml(job.xsup)}">${knowledgeStatusIcon(job)} ${escapeHtml(knowledgeStatusText(job))}</strong>
              <small data-job-knowledge-meta="${escapeHtml(job.xsup)}">${job.knowledgeAction ? `${escapeHtml(job.knowledgeAction)}${(job.validatedArtifactReadiness || job.artifactReadiness) ? ` · ${escapeHtml(job.validatedArtifactReadiness || job.artifactReadiness)}` : ""}` : ""}</small>
            </div>
          </td>
          <td><span data-job-elapsed="${escapeHtml(job.xsup)}">${escapeHtml(jobElapsedText(job))}</span></td>
          <td><button class="xa-table-link xa-open-job" data-xsup="${escapeHtml(job.xsup)}">View audit</button></td>
        </tr>
      `;
    }).join("");

    dash.innerHTML = `
      <div class="xa-dashboard-head">
        <div>
          <h2>Live Audit Dashboard</h2>
          <p>Mixed-product XSUP review. High-confidence product detection continues automatically; lower-confidence or conflicting cases pause only that XSUP for confirmation. Two audits + two independent knowledge workers with a shared maximum of two active Case Chat generations.</p>
        </div>
        <span>${jobs.length} XSUP${jobs.length === 1 ? "" : "s"}</span>
      </div>
      <div class="xa-stats">
        ${stat("Running", counts.running, "run")}
        ${stat("Queued", counts.queued)}
        ${stat("Choose SFDC", counts.chooseSfdc, counts.chooseSfdc ? "warn" : "")}
        ${stat("Choose Product", counts.chooseProduct, counts.chooseProduct ? "warn" : "")}
        ${stat("Complete", counts.complete, "ok")}
        ${stat("Incorrect", counts.incorrect, counts.incorrect ? "warn" : "")}
        ${stat("Ticket Changes", counts.changes, counts.changes ? "warn" : "")}
        ${stat("Knowledge", counts.knowledgeGenerating || counts.knowledgeQueued ? `${counts.knowledgeGenerating} / ${counts.knowledgeQueued}` : counts.knowledgeDone, counts.knowledgeGenerating ? "run" : counts.knowledgeDone ? "ok" : "")}
        ${stat("Failed", counts.failed, counts.failed ? "bad" : "")}
      </div>
      <div class="xa-dashboard-table-wrap">
        <table class="xa-dashboard-table">
          <thead><tr><th>XSUP</th><th>Product</th><th>SFDC</th><th>Progress</th><th>Current activity</th><th>Last update</th><th>Reviewed fields</th><th>Review verdict</th><th>Change needed</th><th>Knowledge artifact</th><th>Elapsed</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="12" class="xa-empty-cell">Run audits to populate the dashboard.</td></tr>'}</tbody>
        </table>
      </div>
    `;

    dash.querySelectorAll(".xa-open-job").forEach(btn => {
      btn.onclick = () => selectJob(btn.dataset.xsup);
    });
    dash.querySelectorAll(".xa-choose-sfdc").forEach(btn => {
      btn.onclick = () => {
        const job = state.jobs.get(btn.dataset.xsup);
        if (job) showSFDCChooser(job);
      };
    });
    dash.querySelectorAll(".xa-enter-sfdc").forEach(btn => {
      btn.onclick = () => { const job = state.jobs.get(btn.dataset.xsup); if (job) promptManualSFDC(job); };
    });
    dash.querySelectorAll(".xa-change-product").forEach(btn => {
      btn.onclick = () => {
        const job = state.jobs.get(btn.dataset.xsup);
        if (job) showProductChooser(job);
      };
    });

    // Normalize all dynamic cells from the authoritative workflow state after a
    // rare structural rebuild. Routine progress thereafter stays in place.
    refreshLiveTimeLabels();
  }

  function renderSFDCDetails(job) {
    const box = document.getElementById("xsup-auditor-sfdc-details");
    if (!box) return;

    const cases = job?.sfdcCandidates || [];
    if (!cases.length) {
      if (job?.status === "needs_sfdc") {
        const actionLabel = job.directKnowledgeOnly ? "Generate KCS" : "Continue";
        box.innerHTML = `
          <div class="xa-manual-sfdc-inline">
            <div class="xa-manual-sfdc-inline-head">
              <strong>Salesforce case required</strong>
              <span>Automatic TACopilot mapping was unavailable. Enter the 8-digit SFDC case here and continue without restarting.</span>
            </div>
            <div class="xa-manual-sfdc-inline-row">
              <input id="xa-inline-sfdc-input" class="xa-manual-sfdc-input" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="04005807" value="${escapeHtml(job.caseNumber || "")}">
              <button id="xa-inline-sfdc-submit">${escapeHtml(actionLabel)}</button>
              <button id="xa-inline-sfdc-dialog" type="button">Open dialog</button>
            </div>
            <div id="xa-inline-sfdc-error" class="xa-manual-sfdc-error" aria-live="polite"></div>
          </div>`;
        const input = box.querySelector("#xa-inline-sfdc-input");
        const error = box.querySelector("#xa-inline-sfdc-error");
        const submit = () => {
          const entered = String(input?.value || "").trim();
          if (!/^0\d{7}$/.test(entered)) {
            if (error) error.textContent = "Enter an 8-digit SFDC case number beginning with 0.";
            input?.focus();
            return;
          }
          if (!applyManualSFDC(job, entered) && error) error.textContent = "Could not apply this SFDC case number.";
        };
        box.querySelector("#xa-inline-sfdc-submit")?.addEventListener("click", submit);
        box.querySelector("#xa-inline-sfdc-dialog")?.addEventListener("click", () => promptManualSFDC(job));
        input?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); submit(); } });
      } else {
        box.innerHTML = `<div class="xa-ref-empty">SFDC mapping details will appear after XSUP resolution.</div>`;
      }
      return;
    }

    box.innerHTML = cases.map(c => {
      const selected = c.case_number === job.caseNumber;
      const url = safeUrl(c.sfdc_url);
      return `
        <div class="xa-sfdc-card ${selected ? "selected" : ""}">
          <div class="xa-sfdc-title">
            <strong>SFDC ${escapeHtml(c.case_number)}</strong>
            ${selected ? '<span class="xa-selected-badge">Selected for audit</span>' : ''}
          </div>
          <div class="xa-sfdc-detail-text">${escapeHtml(c.details || c.text || "No additional details returned by TACopilot search.")}</div>
          <div class="xa-sfdc-actions">
            ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">↗ Open actual SFDC case</a>` : '<span>Direct SFDC URL unavailable</span>'}
            ${!selected && (job.status === "needs_selection" || job.status === "needs_sfdc") ? `<button class="xa-select-case" data-case="${escapeHtml(c.case_number)}">Use this SFDC for audit</button>` : ''}
          </div>
        </div>
      `;
    }).join("");

    box.querySelectorAll(".xa-select-case").forEach(btn => {
      btn.onclick = () => chooseSFDC(job.xsup, btn.dataset.case);
    });
  }

  function closeSFDCChooser() {
    document.getElementById("xsup-auditor-sfdc-modal")?.remove();
  }

  function showNextSFDCChooser() {
    if (document.getElementById("xsup-auditor-sfdc-modal")) return;
    const next = [...state.jobs.values()].find(j => j.status === "needs_selection" || j.status === "needs_sfdc");
    if (next) showSFDCChooser(next);
  }

  function showSFDCChooser(job) {
    closeSFDCChooser();
    if (!job?.sfdcCandidates?.length) { if (job?.status === "needs_sfdc") promptManualSFDC(job); return; }

    const modal = document.createElement("div");
    modal.id = "xsup-auditor-sfdc-modal";
    modal.className = "xa-modal-backdrop";
    modal.innerHTML = `
      <div class="xa-modal">
        <div class="xa-modal-head">
          <div><strong>Choose SFDC case for ${escapeHtml(job.xsup)}</strong><span>${job.sfdcCandidates.length} linked SFDC cases were found. Only the selected case will be analyzed.</span></div>
          <button class="xa-icon" id="xa-close-sfdc-modal">×</button>
        </div>
        <div class="xa-modal-body">
          ${job.sfdcCandidates.map(c => {
            const url = safeUrl(c.sfdc_url);
            return `
              <div class="xa-sfdc-card">
                <div class="xa-sfdc-title"><strong>SFDC ${escapeHtml(c.case_number)}</strong></div>
                <div class="xa-sfdc-detail-text">${escapeHtml(c.details || c.text || "No additional details returned.")}</div>
                <div class="xa-sfdc-actions">
                  ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">↗ Open actual SFDC case</a>` : '<span>Direct SFDC URL unavailable</span>'}
                  <button class="xa-modal-select" data-case="${escapeHtml(c.case_number)}">Analyze this SFDC</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#xa-close-sfdc-modal").onclick = closeSFDCChooser;
    modal.querySelectorAll(".xa-modal-select").forEach(btn => {
      btn.onclick = () => chooseSFDC(job.xsup, btn.dataset.case);
    });
  }

  function applyManualSFDC(job, entered) {
    if (!job) return false;
    const caseNumber = String(entered || "").trim();
    if (!/^0\d{7}$/.test(caseNumber)) return false;
    const candidate = {case_number:caseNumber, xsup:job.xsup, text:"Entered by reviewer", details:"Manual SFDC fallback after automatic TACopilot mapping was unavailable", sfdc_url:""};
    job.caseNumber = caseNumber;
    job.selectedCandidate = candidate;
    job.sfdcCandidates = [candidate];
    job.targetLinks = {
      jira:/^XSUP-\d+$/i.test(String(job.xsup || "")) ? `https://jira-dc.paloaltonetworks.com/browse/${job.xsup}` : "",
      sfdc:"",
      tacopilot:`${location.origin}/taco/case/${caseNumber}`
    };
    job.status = "queued";
    job.stageLabel = "SFDC entered";
    job.steps.resolve = `✓ ${caseNumber} entered`;
    job.overallProgress = Math.max(5, Number(job.overallProgress || 0));
    job.currentActivity = `${caseNumber} entered · waiting for worker`;
    job.lastHeartbeatAt = Date.now();
    job.lastProgressChangeAt = Date.now();
    job.error = "";
    if (!state.queue.includes(job.xsup)) state.queue.push(job.xsup);
    closeSFDCChooser();
    renderJobList(); renderDashboard(); if (state.selectedXsup === job.xsup) renderSelectedJob();
    ensureBatchRuntime(); updateBatchStatus(); pumpQueue();
    return true;
  }

  function promptManualSFDC(job) {
    if (!job) return;
    closeSFDCChooser();
    const modal = document.createElement("div");
    modal.id = "xsup-auditor-sfdc-modal";
    modal.className = "xa-modal-backdrop";
    const actionLabel = job.directKnowledgeOnly ? "Generate KCS" : "Continue";
    modal.innerHTML = `
      <div class="xa-modal xa-manual-sfdc-modal">
        <div class="xa-modal-head">
          <div><strong>Enter Salesforce case for ${escapeHtml(job.xsup || "this item")}</strong><span>Automatic SFDC mapping was unavailable. Enter the 8-digit case number here; you do not need to restart the workflow.</span></div>
          <button class="xa-icon" id="xa-close-sfdc-modal">×</button>
        </div>
        <div class="xa-modal-body">
          <label class="xa-manual-sfdc-label" for="xa-manual-sfdc-input">Salesforce Case Number</label>
          <input id="xa-manual-sfdc-input" class="xa-manual-sfdc-input" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="04005807" value="${escapeHtml(job.caseNumber || "")}">
          <div id="xa-manual-sfdc-error" class="xa-manual-sfdc-error" aria-live="polite"></div>
          <div class="xa-manual-sfdc-note">The case is needed when automatic mapping is unavailable because TACO Analysis and Case Chat evidence are case-scoped. The supplied SFDC will be used directly, and a linked XSUP will still be discovered when available.</div>
          <div class="xa-manual-sfdc-actions"><button id="xa-manual-sfdc-cancel">Cancel</button><button id="xa-manual-sfdc-submit">${escapeHtml(actionLabel)}</button></div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const input = modal.querySelector("#xa-manual-sfdc-input");
    const error = modal.querySelector("#xa-manual-sfdc-error");
    const close = () => modal.remove();
    const submit = () => {
      const entered = String(input?.value || "").trim();
      if (!/^0\d{7}$/.test(entered)) {
        if (error) error.textContent = "Enter an 8-digit SFDC case number beginning with 0.";
        input?.focus();
        return;
      }
      if (!applyManualSFDC(job, entered) && error) error.textContent = "Could not apply this SFDC case number.";
    };
    modal.querySelector("#xa-close-sfdc-modal").onclick = close;
    modal.querySelector("#xa-manual-sfdc-cancel").onclick = close;
    modal.querySelector("#xa-manual-sfdc-submit").onclick = submit;
    input?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); submit(); } });
    setTimeout(() => input?.focus(), 0);
  }
  function chooseSFDC(xsup, caseNumber) {
    const job = state.jobs.get(xsup);
    if (!job) return;
    const candidate = (job.sfdcCandidates || []).find(c => c.case_number === caseNumber);
    if (!candidate) return;

    job.caseNumber = candidate.case_number;
    job.selectedCandidate = candidate;
    job.targetLinks = {
      jira: `https://jira-dc.paloaltonetworks.com/browse/${job.xsup}`,
      sfdc: candidate.sfdc_url || "",
      tacopilot: `${location.origin}/taco/case/${candidate.case_number}`
    };
    job.status = "queued";
    job.stageLabel = "SFDC selected";
    job.steps.resolve = `✓ ${candidate.case_number} selected`;
    job.overallProgress = Math.max(5, Number(job.overallProgress || 0));
    job.currentActivity = "SFDC selected · waiting for worker";
    job.lastHeartbeatAt = Date.now();
    job.lastProgressChangeAt = Date.now();
    job.error = "";

    if (!state.queue.includes(job.xsup)) state.queue.push(job.xsup);
    closeSFDCChooser();
    renderJobList();
    renderDashboard();

    if (state.viewMode === "detail" && state.selectedXsup === xsup) {
      renderSelectedJob();
    }

    ensureBatchRuntime();
    job.batchRunId = state.batchRunId;
    updateBatchStatus();
    pumpQueue();
    setTimeout(showNextSFDCChooser, 100);
  }


  function closeProductChooser() {
    document.getElementById("xsup-auditor-product-modal")?.remove();
  }

  function showNextProductChooser() {
    if (document.getElementById("xsup-auditor-product-modal")) return;
    const next = [...state.jobs.values()].find(j => j.status === "needs_product");
    if (next) showProductChooser(next);
  }

  function resetDerivedOutputsForProductChange(job) {
    job.auditAnswer = "";
    job.xsupComment = "";
    job.references = [];
    job.verdict = "";
    job.rcaVerdict = "";
    job.fixTypeVerdict = "";
    job.labelVerdict = "";
    job.reviewedFields = "";
    job.retrospectiveEligibility = "";
    job.auditReportedProduct = "";
    job.resolutionChangeNeeded = "";
    job.rcaChangeNeeded = "";
    job.fixTypeChangeNeeded = "";
    job.labelChangeNeeded = "";
    job.resolutionExplanation = "";
    job.resolutionRecommendedValue = "";
    job.rcaExplanation = "";
    job.rcaRecommendedValue = "";
    job.fixTypeExplanation = "";
    job.fixTypeRecommendedValue = "";
    job.labelExplanation = "";
    job.labelRecommendedValue = "";
    job.knowledgeAction = "";
    job.secondaryKnowledgeAction = "";
    job.artifactReadiness = "";
    job.artifactTypeFromAudit = "";
    job.knowledgeDecisionExplanation = "";
    job.autoGenerateKnowledgeDecision = "";
    job.autoSaved = false;
    job.auditFingerprint = "";
    job.lastPrompt = "";
    job.auditReuseStatus = "not_checked";
    job.auditReuseReason = "Product changed; retrospective must be re-evaluated with the selected product policy.";
    job.auditFollowupId = null;
    job.auditCompletedAt = null;
    job.knowledgeFingerprint = "";
    job.knowledgeStatus = "not_evaluated";
    job.knowledgeProgress = "";
    job.knowledgeArtifacts = [];
    job.knowledgeArtifactRequests = knowledgeArtifactRequests(job);
    job.knowledgeAnswer = "";
    job.knowledgeRawAnswer = "";
    job.knowledgeDraftAnswer = "";
    job.knowledgeDraftFollowupId = null;
    job.knowledgeDraftCompletedAt = null;
    job.knowledgeDraftReuseStatus = "not_checked";
    job.knowledgeQualityStatus = "";
    job.knowledgeQualitySummary = "";
    job.knowledgeQualityValidationItems = "";
    job.validatedArtifactReadiness = "";
    job.knowledgeError = "";
    job.knowledgeAutoSaved = false;
    job.knowledgeAutoDeliveryAttempted = false;
    job.knowledgeReuseStatus = "not_checked";
    job.knowledgeReuseReason = "Product changed; knowledge decision must follow the new retrospective.";
    job.knowledgeFollowupId = null;
    job.knowledgeCompletedAt = null;
  }

  function applyProductSelection(job, key, source = "manual") {
    const profile = getProductProfile(key);
    if (!job || !profile) return false;
    const changed = Boolean(job.productKey && job.productKey !== key);

    if ((job.productLocked && job.status === "running") || job.knowledgeStatus === "generating") {
      setStatus("Wait for the selected XSUP's active Retrospective/Knowledge Case Chat to finish before changing product.", "error");
      return false;
    }

    job.productKey = key;
    job.productSelectionSource = source;
    if (source === "manual") {
      job.productConfidence = "REVIEWER";
      job.productDetectionReason = `Reviewer selected ${profile.label}.`;
    }

    if (changed && (job.productLocked || job.auditAnswer || job.status === "completed")) {
      resetDerivedOutputsForProductChange(job);
      job.forceAuditRefresh = true;
      job.forceKnowledgeRefresh = true;
      job.forceTacoRefresh = false;
      job.productLocked = false;
      job.status = "queued";
      job.stageLabel = "Product changed · review queued";
      job.error = "";
      job.endedAt = null;
      job.overallProgress = Math.max(5, Number(job.overallProgress || 0));
      job.currentActivity = `Queued · ${profile.label} product review`;
      if (!state.queue.includes(job.xsup)) state.queue.push(job.xsup);
      ensureBatchRuntime();
      pumpQueue();
    } else if (job.status === "needs_product") {
      job.status = "queued";
      job.stageLabel = `${profile.label} selected`;
      job.currentActivity = `Queued · ${profile.label}`;
      job.steps.resolve = `✓ ${job.caseNumber} · ${profile.label}`;
      job.lastHeartbeatAt = Date.now();
      job.lastProgressChangeAt = Date.now();
      if (!state.queue.includes(job.xsup)) state.queue.push(job.xsup);
      ensureBatchRuntime();
      pumpQueue();
    }

    renderJobList();
    renderDashboard();
    if (job.xsup === state.selectedXsup) renderSelectedJob();
    updateBatchStatus();
    return true;
  }

  function showProductChooser(job) {
    closeProductChooser();
    if (!job) return;

    const suggested = getProductProfile(job.productSuggestedKey || job.productKey);
    const modal = document.createElement("div");
    modal.id = "xsup-auditor-product-modal";
    modal.className = "xa-modal-backdrop";
    modal.innerHTML = `
      <div class="xa-modal">
        <div class="xa-modal-head">
          <div>
            <strong>Choose product for ${escapeHtml(job.xsup)}</strong>
            <span>${suggested ? `Suggested: ${escapeHtml(suggested.label)}${job.productConfidence ? ` · ${escapeHtml(job.productConfidence)} confidence` : ""}` : "Automatic detection needs reviewer confirmation."}</span>
          </div>
          <button class="xa-icon" id="xa-close-product-modal">×</button>
        </div>
        <div class="xa-modal-body">
          ${job.productDetectionReason ? `<div class="xa-product-reason">${escapeHtml(job.productDetectionReason)}</div>` : ""}
          <div class="xa-product-options">
            ${PRODUCT_KEYS.map(key => {
              const p = getProductProfile(key);
              const isSuggested = key === (job.productSuggestedKey || job.productKey);
              return `
                <button class="xa-product-option ${isSuggested ? "suggested" : ""}" data-product="${escapeHtml(key)}">
                  <strong>${escapeHtml(p.label)}</strong>
                  <span>${escapeHtml(p.eligibility)}</span>
                  ${isSuggested ? `<em>Suggested</em>` : ""}
                </button>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("#xa-close-product-modal").onclick = closeProductChooser;
    modal.querySelectorAll(".xa-product-option").forEach(btn => {
      btn.onclick = () => {
        const selected = btn.dataset.product;
        if (applyProductSelection(job, selected, "manual")) {
          closeProductChooser();
          setTimeout(showNextProductChooser, 80);
        }
      };
    });
  }

  function renderProductControl(job) {
    const box = document.getElementById("xsup-auditor-product-control");
    if (!box || !job) return;
    const profile = getProductProfile(job.productKey);
    const source = job.productSelectionSource === "manual" ? "Reviewer selected" : job.productKey ? "Auto detected" : "Not selected";
    const confidence = job.productConfidence ? ` · ${job.productConfidence}` : "";
    const activeLocked = (job.productLocked && job.status === "running") || job.knowledgeStatus === "generating";
    const actionLabel = job.productLocked || job.auditAnswer || job.status === "completed"
      ? "Change Product & Re-run Review"
      : "Change Product";

    box.innerHTML = `
      ${job.status === "needs_sfdc" ? `
        <div class="xa-product-card needs">
          <div>
            <span>Salesforce case</span>
            <strong>SFDC required to continue</strong>
            <small>Automatic TACopilot mapping was unavailable. Enter the 8-digit SFDC case manually without restarting this XSUP.</small>
          </div>
          <button id="xa-enter-sfdc-top">Enter SFDC Case</button>
        </div>` : ""}
      <div class="xa-product-card ${job.status === "needs_product" ? "needs" : ""}">
        <div>
          <span>Product</span>
          <strong>${escapeHtml(profile?.label || (job.status === "needs_sfdc" ? "Pending SFDC" : "Confirmation required"))}</strong>
          <small>${escapeHtml(source + confidence)}${job.productDetectionReason ? ` · ${escapeHtml(job.productDetectionReason)}` : ""}</small>
        </div>
        <button id="xa-change-product" ${activeLocked ? "disabled" : ""}>${escapeHtml(job.status === "needs_product" ? "Choose Product" : actionLabel)}</button>
      </div>
    `;
    box.querySelector("#xa-enter-sfdc-top")?.addEventListener("click", () => promptManualSFDC(job));
    box.querySelector("#xa-change-product")?.addEventListener("click", () => showProductChooser(job));
  }

  function renderJobList() {
    const list = document.getElementById("xsup-auditor-job-list");
    if (!list) return;

    const jobs = [...state.jobs.values()];
    const listSignature = JSON.stringify(jobs.map(job => ({
      xsup: job.xsup || "",
      selected: job.xsup === state.selectedXsup,
      ui: overallUiState(job),
      result: jobResultText(job),
      productKey: job.productKey || "",
      productSelectionSource: job.productSelectionSource || "",
      reviewedFields: job.reviewedFields || "",
      knowledgeStatus: job.knowledgeStatus || ""
    })));
    if (state.jobListRenderSignature === listSignature && list.childElementCount) {
      renderDashboard();
      return;
    }
    state.jobListRenderSignature = listSignature;
    if (!jobs.length) {
      list.innerHTML = `<div class="xa-job-empty">Paste one or more XSUP IDs above and click Run Audit(s).</div>`;
      state.dashboardRenderSignature = "";
      renderDashboard();
      return;
    }

    list.innerHTML = jobs.map(job => {
      const selected = job.xsup === state.selectedXsup ? " xa-job-selected" : "";
      const uiState = overallUiState(job);
      const statusClass = ` xa-job-${uiState === "active" ? "running" : uiState === "waiting" ? "queued" : uiState === "attention" ? "needs_product" : uiState}`;
      const reviewed = job.reviewedFields ? `<small>Reviewed: ${escapeHtml(job.reviewedFields)}</small>` : "";
      const product = job.productKey ? `<small>Product: ${escapeHtml(productLabel(job))}${job.productSelectionSource === "manual" ? " · Manual" : ""}</small>` : job.status === "needs_product" ? `<small>Product: confirmation required</small>` : "";
      const leftStatus = overallUiState(job) === "waiting"
        ? activityForJob(job)
        : overallUiState(job) === "active"
          ? activityForJob(job)
          : jobResultText(job);
      return `
        <button class="xa-job${selected}${statusClass}" data-xsup="${escapeHtml(job.xsup)}">
          <span class="xa-job-icon">${jobIcon(job)}</span>
          <span class="xa-job-main">
            <strong>${escapeHtml(job.xsup)}</strong>
            <em data-job-sidebar-status="${escapeHtml(job.xsup)}">${escapeHtml(leftStatus)}</em>
            ${overallUiState(job) === "active" ? progressBarHtml(job, true) : ""}
            ${product}
            ${reviewed}
          </span>
        </button>
      `;
    }).join("");

    list.querySelectorAll(".xa-job").forEach(btn => {
      btn.onclick = () => selectJob(btn.dataset.xsup);
    });

    renderDashboard();
  }

  function updateBatchStatus() {
    const jobs = [...state.jobs.values()];
    const running = jobs.filter(j => j.status === "running").length;
    const queued = jobs.filter(j => j.status === "queued").length;
    const completed = jobs.filter(jobWorkflowComplete).length;
    const failed = jobs.filter(j => j.status === "failed").length;
    const stopped = jobs.filter(j => j.status === "stopped").length;
    const needsSelection = jobs.filter(j => j.status === "needs_selection" || j.status === "needs_sfdc").length;
    const needsProduct = jobs.filter(j => j.status === "needs_product").length;
    const knowledgeGenerating = jobs.filter(j => j.knowledgeStatus === "generating").length;
    const knowledgeQueued = jobs.filter(j => j.knowledgeStatus === "queued").length;
    const knowledgeFailed = jobs.filter(j => j.knowledgeStatus === "failed").length;

    let text = "Ready";
    let kind = "";

    if (running || queued || knowledgeGenerating || knowledgeQueued) {
      const parts = [];
      if (running) parts.push(`${running} audit running`);
      if (queued) parts.push(`${queued} audit queued`);
      if (knowledgeGenerating) parts.push(`${knowledgeGenerating} knowledge generating`);
      if (knowledgeQueued) parts.push(`${knowledgeQueued} knowledge queued`);
      if (needsSelection) parts.push(`${needsSelection} choose SFDC`);
      if (needsProduct) parts.push(`${needsProduct} choose product`);
      if (failed) parts.push(`${failed} audit failed`);
      if (knowledgeFailed) parts.push(`${knowledgeFailed} knowledge failed`);
      text = `${parts.join(" · ")} · audit workers ${state.concurrency} · knowledge workers ${state.knowledgeConcurrency}`;
    } else if (needsSelection || needsProduct) {
      const waits = [];
      if (needsSelection) waits.push(`${needsSelection} waiting for SFDC selection`);
      if (needsProduct) waits.push(`${needsProduct} waiting for product confirmation`);
      text = waits.join(" · ");
      kind = "";
    } else if (jobs.length) {
      const parts = [`${completed} complete`];
      if (failed) parts.push(`${failed} failed`);
      if (stopped) parts.push(`${stopped} stopped`);
      text = `Batch finished · ${parts.join(" · ")}`;
      kind = failed ? "error" : completed ? "ok" : "";
    }

    setStatus(text, kind);
    updateMiniBubble();

    const stopBtn = document.getElementById("xsup-auditor-stop");
    if (stopBtn) stopBtn.disabled = !(running || queued || needsSelection || needsProduct || knowledgeGenerating || knowledgeQueued);
  }

  function setJobStep(job, key, value, stageLabel = "", meta = {}) {
    const now = Date.now();
    const previousActivity = job.currentActivity || "";
    const previousOverall = Number(job.overallProgress || 0);
    const previousTaco = Number(job.tacoProgress);
    const previousNode = job.tacoNode || "";

    job.steps[key] = value;
    if (stageLabel) job.stageLabel = stageLabel;

    if (Number.isFinite(Number(meta.tacoProgress))) {
      job.tacoProgress = clampProgress(meta.tacoProgress);
    }
    if (meta.tacoNode !== undefined) job.tacoNode = String(meta.tacoNode || "");

    const nextOverall = computeOverallProgress(job, key, value, meta);
    job.overallProgress = Math.max(previousOverall, nextOverall);
    job.currentActivity = meta.activity || value || stageLabel || job.currentActivity || "Running";
    job.lastHeartbeatAt = now;

    const meaningfulChange =
      !meta.heartbeatOnly && (
        job.currentActivity !== previousActivity ||
        job.overallProgress !== previousOverall ||
        (Number.isFinite(Number(job.tacoProgress)) && Number(job.tacoProgress) !== previousTaco) ||
        job.tacoNode !== previousNode
      );

    if (!job.lastProgressChangeAt || meaningfulChange) {
      job.lastProgressChangeAt = now;
    }

    renderJobList();

    if (job.xsup === state.selectedXsup) {
      const el = document.querySelector(`[data-step="${key}"]`);
      if (el) el.textContent = value;
      renderSelectedProgress(job);
      renderExecutionPipeline(job);
    }

    updateBatchStatus();
    renderDashboard();
  }

  // ===========================================================================
  // EXECUTION PIPELINE
  // ===========================================================================
  // Audit and knowledge generation are independent workers. The pipeline shows
  // them together so 100% audit completion never looks like "nothing is happening"
  // while a KCS/doc/runbook is still being generated.
  function workflowStageState(job, stage) {
    if (stage === "resolve") {
      if (job.status === "needs_selection" || job.status === "needs_sfdc" || job.status === "needs_product") return "waiting";
      if (job.status === "failed" && !job.caseNumber) return "failed";
      if (job.caseNumber) return "complete";
      return job.status === "running" ? "active" : "pending";
    }

    if (stage === "taco") {
      if (job.status === "failed" && job.caseNumber && !job.report) return "failed";
      if (job.report) return "complete";
      if (job.status === "running" && job.caseNumber) return "active";
      return "pending";
    }

    if (stage === "evidence") {
      if (job.status === "failed" && job.report && !job.evidence) return "failed";
      if (job.evidence) return "complete";
      if (job.status === "running" && job.report) return "active";
      return "pending";
    }

    if (stage === "audit") {
      if (job.directKnowledgeOnly) return "skipped";
      if (job.status === "failed" && !job.auditAnswer) return "failed";
      if (job.auditAnswer) return "complete";
      if (job.status === "running" && job.evidence) return "active";
      return "pending";
    }

    if (stage === "knowledge") {
      const kState = knowledgeUiState(job);
      if (kState === "complete") return "complete";
      if (kState === "failed") return "failed";
      if (kState === "active") return "active";
      if (kState === "waiting" || kState === "outdated") return "waiting";
      if (kState === "done") return "skipped";
      return "pending";
    }

    if (stage === "artifact") {
      const knowledgeRequired = Boolean(job.knowledgeArtifactType || knowledgeArtifactType(job));
      const knowledgeFinished =
        !knowledgeRequired ||
        ["completed", "not_required", "not_generated"].includes(job.knowledgeStatus);

      if (!job.auditAnswer || !knowledgeFinished) return "pending";

      if (
        job.autoSaved &&
        (!knowledgeRequired || job.knowledgeStatus !== "completed" || job.knowledgeAutoSaved)
      ) return "complete";

      return "pending";
    }

    return "pending";
  }

  function workflowStageIcon(stateName) {
    return ({
      complete: "✓",
      active: "⟳",
      pending: "○",
      waiting: "!",
      failed: "✕",
      skipped: "—"
    })[stateName] || "○";
  }

  function knowledgeStageDetail(job) {
    const label = knowledgeArtifactLabel(job.knowledgeArtifactType || knowledgeArtifactType(job));

    if (job.knowledgeStatus === "completed") {
      const artifacts = Array.isArray(job.knowledgeArtifacts) ? job.knowledgeArtifacts : [];
      if (artifacts.length > 1) {
        const summary = artifacts.map(x => `${x.status === "completed" ? "✓" : "✕"} ${x.label || knowledgeArtifactLabel(x.type)}${x.followupId ? ` #${x.followupId}` : ""}${x.reuseStatus === "reused" ? " reused" : x.status === "completed" ? " generated" : ""}`).join(" · ");
        return summary;
      }
      const source =
        job.knowledgeReuseStatus === "reused" ? "Reused" :
        job.knowledgeReuseStatus === "regenerated" ? "Regenerated" :
        "Generated";
      const id = job.knowledgeFollowupId ? ` · Case Chat #${job.knowledgeFollowupId}` : "";
      const date = job.knowledgeCompletedAt ? ` · ${formatTimestamp(job.knowledgeCompletedAt)}` : "";
      const quality = job.validatedArtifactReadiness ? ` · ${job.validatedArtifactReadiness}` : "";
      return `${source} ${label}${quality}${id}${date}`;
    }

    if (job.knowledgeStatus === "generating") {
      const elapsed = job.knowledgeStartedAt ? formatElapsed(Date.now() - job.knowledgeStartedAt) : "";
      const heartbeat = job.knowledgeLastHeartbeatAt
        ? `${Math.max(0, Math.floor((Date.now() - job.knowledgeLastHeartbeatAt) / 1000))}s ago`
        : "waiting";
      return `${job.knowledgeProgress || `Generating ${label}`}${elapsed ? ` · ${elapsed}` : ""} · last response ${heartbeat}`;
    }

    if (job.knowledgeStatus === "queued") return `${label} queued · knowledge worker`;
    if (job.knowledgeStatus === "failed") return job.knowledgeError || `${label} generation failed`;
    if (job.knowledgeStatus === "not_required") return "No knowledge artifact required";
    if (job.knowledgeStatus === "outdated") return `${label} needs regeneration · audit was regenerated independently`;
    if (job.knowledgeStatus === "not_generated") return `${label} · generation disabled`;
    return job.auditAnswer ? "Waiting for knowledge decision/history check" : "Not started";
  }

  function artifactStageDetail(job) {
    const destination = state.saveDirectoryHandle
      ? `Selected folder: ${state.saveDirectoryName}`
      : "Browser Downloads";

    if (!job.auditAnswer) return `Pending · ${destination}`;

    const knowledgeRequired = Boolean(job.knowledgeArtifactType || knowledgeArtifactType(job));
    if (knowledgeRequired && ["waiting", "active"].includes(knowledgeUiState(job))) {
      return `Waiting for knowledge artifact · ${destination}`;
    }

    if (knowledgeRequired && job.knowledgeStatus === "completed") {
      if (job.knowledgeDeliveryState === "saved_to_folder") return `Knowledge standalone files saved · ${destination}`;
      if (job.knowledgeDeliveryState === "download_requested") return `Knowledge standalone auto-download requested · ${destination}`;
      if (job.knowledgeDeliveryState === "delivery_partial") return `Knowledge generated · one or more standalone deliveries need attention`;
      return `Knowledge generated · standalone Download buttons available`;
    }

    if (!knowledgeRequired && job.autoSaved) {
      return state.saveDirectoryHandle ? `Audit saved · ${destination}` : `Audit download requested · ${destination}`;
    }

    if (knowledgeRequired && job.autoSaved && !job.knowledgeAutoSaved) {
      return `Audit delivered · Knowledge ready for download`;
    }

    if (job.autoSaved && job.knowledgeAutoSaved) {
      return state.saveDirectoryHandle ? `Audit + Knowledge saved · ${destination}` : `Audit + Knowledge download requested · ${destination}`;
    }

    return `Ready · ${destination}`;
  }

  // ===========================================================================
  // CUSTOM TOOLTIPS
  // ===========================================================================
  // Native "title" tooltips proved unreliable in the managed TACopilot UI.
  // Render one floating tooltip under <body> instead, so it is not clipped by
  // scrollable panels and works for dynamically re-rendered decision cards.
  function hideAuditorTooltip() {
    document.getElementById("xsup-auditor-tooltip")?.remove();
  }

  function showAuditorTooltip(target) {
    const message = target?.dataset?.tooltip;
    if (!message) return;

    hideAuditorTooltip();

    const tip = document.createElement("div");
    tip.id = "xsup-auditor-tooltip";
    tip.className = "xa-floating-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.textContent = message;
    document.body.appendChild(tip);

    const targetRect = target.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const gap = 8;
    const edge = 10;

    let left = targetRect.left + (targetRect.width / 2) - (tipRect.width / 2);
    left = Math.max(edge, Math.min(left, window.innerWidth - tipRect.width - edge));

    let top = targetRect.bottom + gap;
    if (top + tipRect.height > window.innerHeight - edge) {
      top = Math.max(edge, targetRect.top - tipRect.height - gap);
      tip.dataset.placement = "top";
    } else {
      tip.dataset.placement = "bottom";
    }

    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
  }

  function installAuditorTooltipHandlers(panel) {
    if (!panel || panel.dataset.tooltipHandlersInstalled === "1") return;
    panel.dataset.tooltipHandlersInstalled = "1";

    panel.addEventListener("mouseover", event => {
      const target = event.target.closest?.("[data-tooltip]");
      if (!target || !panel.contains(target)) return;
      showAuditorTooltip(target);
    });

    panel.addEventListener("mouseout", event => {
      const target = event.target.closest?.("[data-tooltip]");
      if (!target || !panel.contains(target)) return;
      const next = event.relatedTarget;
      if (next && target.contains(next)) return;
      hideAuditorTooltip();
    });

    panel.addEventListener("focusin", event => {
      const target = event.target.closest?.("[data-tooltip]");
      if (target && panel.contains(target)) showAuditorTooltip(target);
    });

    panel.addEventListener("focusout", event => {
      if (event.target.closest?.("[data-tooltip]")) hideAuditorTooltip();
    });

    panel.addEventListener("keydown", event => {
      if (event.key === "Escape") hideAuditorTooltip();
    });

    panel.addEventListener("scroll", hideAuditorTooltip, true);
    window.addEventListener("resize", hideAuditorTooltip, { passive: true });
  }

  function renderExecutionPipeline(job) {
    const box = document.getElementById("xsup-auditor-execution-pipeline");
    if (!box || !job) return;

    const tacoDate = formatTimestamp(job.tacoAnalysisAt);
    const evidenceDate = formatTimestamp(job.latestCaseEvidenceAt);
    const tacoDetail = job.investigationId
      ? `${job.tacoDecision || "TACO"} #${job.investigationId} · Analysis: ${tacoDate} · Latest evidence: ${evidenceDate}${job.tacoDecisionReason ? ` · ${job.tacoDecisionReason}` : ""}`
      : (job.steps.taco || "Not started");

    const stages = [
      ["resolve", "Resolve SFDC case", job.steps.resolve || (job.caseNumber || "Not started"), ""],
      ["taco", "TACO Analysis", tacoDetail, "Freshness is automatic. Completed TACO is reused when no newer Jira/SFDC evidence exists."],
      ["evidence", "Original evidence", job.steps.evidence || "Not started", "Original Jira/SFDC evidence used to prove Support-owned field decisions."],
      ["audit", "Retrospective audit",
        job.auditReuseStatus === "reused"
          ? `REUSED EXISTING · Case Chat #${job.auditFollowupId || "?"} · originally completed ${formatTimestamp(job.auditCompletedAt)}`
          : ["generated","regenerated"].includes(job.auditReuseStatus)
            ? `NEWLY GENERATED · Case Chat #${job.auditFollowupId || "?"} · completed ${formatTimestamp(job.auditCompletedAt)}`
            : job.steps.audit || "Not started",
        "Shows whether the audit was reused from existing Case Chat history or generated newly."],
      ["knowledge", "Knowledge artifact", knowledgeStageDetail(job), "Shows whether the knowledge artifact was reused or newly generated."],
      ["artifact", "Artifact download/save", artifactStageDetail(job), "Default is browser download. A selected folder becomes the destination for the current session."]
    ];

    box.innerHTML = stages.map(([key, label, detail, tip]) => {
      const stateName = workflowStageState(job, key);
      return `
        <div class="xa-pipeline-row xa-pipeline-${stateName}">
          <span class="xa-pipeline-icon">${workflowStageIcon(stateName)}</span>
          <span class="xa-pipeline-label">${escapeHtml(label)}${tip ? `<span class="xa-help-dot" data-tooltip="${escapeHtml(tip)}" tabindex="0" role="button" aria-label="Help: ${escapeHtml(label)}">?</span>` : ""}</span>
          <strong>${escapeHtml(detail || "Not started")}</strong>
        </div>
      `;
    }).join("");
  }

  function reuseStatusClass(status) {
    const s = String(status || "").toLowerCase();
    if (["reused", "generated", "regenerated"].includes(s)) return "ok";
    if (["checking", "waiting_existing"].includes(s)) return "run";
    if (["failed", "outdated"].includes(s)) return "bad";
    return "";
  }

  function reuseStatusText(status) {
    return ({
      not_checked: "Not checked",
      checking: "Checking history",
      reused: "Reused",
      waiting_existing: "Waiting existing",
      generated: "Generated",
      regenerated: "Regenerated",
      failed: "Failed",
      not_required: "Not required"
    })[status] || status || "Pending";
  }

  function tacoSummaryStatus(job) {
    const d = String(job?.tacoDecision || "").toUpperCase();
    if (d.includes("FAILED")) return "Failed";
    if (d.includes("REUSE")) return "Reused";
    if (d.includes("REFRESH")) return d.includes("FORCED") ? "Refreshed manually" : "Refreshed";
    if (d.includes("START")) return "Generated";
    if (job?.report) return "Ready";
    return "Pending";
  }

  function renderReuseSummary(job) {
    const box = document.getElementById("xsup-auditor-reuse-summary");
    if (!box || !job) return;

    const statusBadge = (status, kind) => {
      const s = String(status || "").toLowerCase();
      if (kind === "taco") {
        const d = String(job.tacoDecision || "").toUpperCase();
        if (d.includes("FAILED")) return `<b class="xa-source-badge failed">FAILED</b>`;
        if (d.includes("REUSE")) return `<b class="xa-source-badge reused">REUSED EXISTING</b>`;
        if (d.includes("REFRESH") || d.includes("START")) return `<b class="xa-source-badge new">NEW / REFRESHED</b>`;
        return `<b class="xa-source-badge pending">PENDING</b>`;
      }
      if (s === "reused") return `<b class="xa-source-badge reused">REUSED EXISTING</b>`;
      if (s === "generated" || s === "regenerated") return `<b class="xa-source-badge new">NEWLY GENERATED</b>`;
      if (s === "checking") return `<b class="xa-source-badge checking">CHECKING</b>`;
      if (s === "failed") return `<b class="xa-source-badge failed">FAILED</b>`;
      return `<b class="xa-source-badge pending">PENDING</b>`;
    };

    const card = ({
      label, status, kind, date, followupId, reason,
      priorId = null, priorDate = null, priorReason = "",
      actionId = "", actionLabel = "", actionDisabled = false, actionTooltip = ""
    }) => `
      <div class="xa-reuse-item ${reuseStatusClass(status)}">
        <div class="xa-reuse-item-head">
          <span>${escapeHtml(label)}</span>
          ${statusBadge(status, kind)}
        </div>
        <strong>
          ${followupId ? `Case Chat #${escapeHtml(followupId)} · ` : ""}
          ${escapeHtml(date ? formatTimestamp(date) : "Date unavailable")}
        </strong>
        ${reason ? `<em>${escapeHtml(reason)}</em>` : ""}
        ${priorId && String(priorId) !== String(followupId || "") ? `
          <small class="xa-prior-result">
            Previous result found: Case Chat #${escapeHtml(priorId)}
            ${priorDate ? ` · ${escapeHtml(formatTimestamp(priorDate))}` : ""}
            ${priorReason ? ` · ${escapeHtml(priorReason)}` : ""}
          </small>` : ""}
        ${actionId && actionLabel ? `
          <div class="xa-reuse-item-actions">
            <button id="${escapeHtml(actionId)}" ${actionDisabled ? "disabled" : ""}${actionTooltip ? ` data-tooltip="${escapeHtml(actionTooltip)}"` : ""}>${escapeHtml(actionLabel)}</button>
          </div>` : ""}
      </div>
    `;

    const activeBusy = job.status === "running" || ["queued","generating"].includes(job.knowledgeStatus);
    const currentTacoReady = Boolean(job.caseNumber && job.investigationId && job.report && job.evidence && reportReady(job.report));
    const auditActionDisabled = activeBusy || !currentTacoReady;
    const auditActionLabel = job.directKnowledgeOnly ? "Run Audit" : job.auditAnswer ? "Regenerate Audit" : "Retry Audit";
    const knowledgeRequests = knowledgeArtifactRequests(job);
    const canRegenerateKnowledge = Boolean(job.auditAnswer && knowledgeRequests.length);
    const canDirectKcsFromTaco = Boolean(currentTacoReady && !job.auditAnswer);
    const knowledgeActionDisabled = activeBusy || (!canRegenerateKnowledge && !canDirectKcsFromTaco);
    const knowledgeActionLabel = canDirectKcsFromTaco
      ? "Generate KCS from TACO"
      : knowledgeRequests.length > 1
        ? "Regenerate Knowledge"
        : String(knowledgeRequests[0]?.type || job.knowledgeArtifactType || knowledgeArtifactType(job) || "").startsWith("KCS")
          ? (job.knowledgeStatus === "failed" ? "Retry KCS" : "Regenerate KCS")
          : (job.knowledgeStatus === "failed" ? "Retry Knowledge" : "Regenerate Knowledge");

    box.innerHTML = `
      <div class="xa-reuse-head">
        <div>
          <strong>Analysis &amp; Reuse Status</strong>
          <span>Shows exactly which existing Case Chat was reused, or whether a new result had to be generated.</span>
        </div>
        <div class="xa-reuse-actions">
          <button id="xa-reanalyse-all" ${activeBusy ? "disabled" : ""} data-tooltip="Force a fresh TACO analysis, then create a new retrospective audit and new knowledge artifact. If SFDC is still missing, the SFDC entry control opens first.">Re-analyze All</button>
        </div>
      </div>
      <div class="xa-reuse-grid">
        ${card({
          label: "TACO Analysis",
          status: job.tacoDecision,
          kind: "taco",
          date: job.tacoAnalysisAt,
          reason: job.tacoDecisionReason
        })}
        ${card({
          label: "Retrospective Audit",
          status: job.auditReuseStatus,
          kind: "audit",
          date: job.auditCompletedAt,
          followupId: job.auditFollowupId,
          reason: job.auditReuseReason,
          priorId: job.priorAuditFollowupId,
          priorDate: job.priorAuditCompletedAt,
          priorReason: job.priorAuditReason,
          actionId: "xa-regenerate-audit",
          actionLabel: auditActionLabel,
          actionDisabled: auditActionDisabled,
          actionTooltip: "Retry or regenerate only the Retrospective Audit using the retained current TACO analysis and Jira/SFDC evidence. TACO is not re-run."
        })}
        ${card({
          label: "Knowledge Artifact",
          status: job.knowledgeStatus === "completed" && ["checking","waiting_existing","not_checked"].includes(String(job.knowledgeReuseStatus || "").toLowerCase()) ? "generated" : job.knowledgeReuseStatus,
          kind: "knowledge",
          date: job.knowledgeCompletedAt,
          followupId: job.knowledgeFollowupId,
          reason: job.knowledgeReuseReason,
          priorId: job.priorKnowledgeFollowupId,
          priorDate: job.priorKnowledgeCompletedAt,
          priorReason: job.priorKnowledgeReason,
          actionId: "xa-regenerate-knowledge",
          actionLabel: knowledgeActionLabel,
          actionDisabled: knowledgeActionDisabled,
          actionTooltip: canDirectKcsFromTaco
            ? "Generate only the KCS-family artifact from the retained successful TACO analysis and current Jira/SFDC evidence. The failed Audit is not re-run."
            : "Retry or regenerate the knowledge artifact from the current completed audit. TACO and the audit are not re-run."
        })}
      </div>
    `;

    document.getElementById("xa-reanalyse-all")?.addEventListener("click", () => forceReanalyzeTaco(job.xsup));
    document.getElementById("xa-regenerate-audit")?.addEventListener("click", () => forceRerunAudit(job.xsup));
    document.getElementById("xa-regenerate-knowledge")?.addEventListener("click", () => {
      if (!job.auditAnswer && currentTacoReady) forceGenerateKcsFromCurrentTaco(job.xsup);
      else forceRegenerateKnowledge(job.xsup);
    });
  }

  function forceRerunAudit(xsup) {
    const job = state.jobs.get(xsup);
    if (!job) return;
    if (job.status === "running" || job.knowledgeStatus === "generating") {
      setStatus("Wait for active work to finish before forcing an audit rerun.", "error");
      return;
    }
    if (!job.caseNumber) {
      setStatus("Enter the SFDC case before regenerating this audit.", "error");
      promptManualSFDC(job);
      return;
    }
    if (!job.investigationId || !job.report || !job.evidence) {
      setStatus("Current TACO snapshot is not available for an audit-only rerun. Starting a full fresh re-analysis instead.", "ok");
      forceReanalyzeTaco(job.xsup);
      return;
    }
    if (job.knowledgeStatus === "queued") {
      state.knowledgeQueue = state.knowledgeQueue.filter(x => x !== job.xsup);
      job.knowledgeStatus = job.knowledgeAnswer ? "outdated" : "not_evaluated";
    }

    job.forceAuditRefresh = true;
    job.forceKnowledgeRefresh = false;
    job.directKnowledgeOnly = false;
    job.manualAuditOnly = true;
    job.status = "queued";
    job.stageLabel = "Regenerating audit only";
    job.error = "";
    job.endedAt = null;
    job.auditReuseStatus = "checking";
    job.auditReuseReason = "Manual audit rerun requested.";
    job.auditCompletedAt = null;
    job.auditAnswer = "";
    job.xsupComment = "";
    job.references = [];
    job.reviewedFields = "";
    job.retrospectiveEligibility = "";
    job.auditReportedProduct = "";
    job.verdict = "";
    job.rcaVerdict = "";
    job.fixTypeVerdict = "";
    job.labelVerdict = "";
    job.resolutionChangeNeeded = "";
    job.rcaChangeNeeded = "";
    job.fixTypeChangeNeeded = "";
    job.labelChangeNeeded = "";
    job.resolutionExplanation = "";
    job.resolutionRecommendedValue = "";
    job.rcaExplanation = "";
    job.rcaRecommendedValue = "";
    job.fixTypeExplanation = "";
    job.fixTypeRecommendedValue = "";
    job.labelExplanation = "";
    job.labelRecommendedValue = "";
    job.technicalEvidence = "";
    job.engineeringConfirmation = "";
    job.importantTechnicalCaveat = "";
    job.knowledgeAction = "";
    job.secondaryKnowledgeAction = "";
    job.artifactReadiness = "";
    job.artifactTypeFromAudit = "";
    job.knowledgeDecisionExplanation = "";
    job.autoGenerateKnowledgeDecision = "";
    job.autoSaved = false;

    if (job.knowledgeAnswer || job.knowledgeFollowupId) {
      job.knowledgeStatus = "outdated";
      job.knowledgeReuseStatus = "outdated";
      job.knowledgeReuseReason = "Audit is being regenerated independently. Existing knowledge is retained for reference but is not treated as current until Regenerate Knowledge is selected.";
      job.knowledgeAutoSaved = false;
    } else {
      job.knowledgeStatus = "not_evaluated";
      job.knowledgeReuseStatus = "not_checked";
      job.knowledgeReuseReason = "Audit is being regenerated independently; knowledge will not be generated automatically.";
    }

    if (!state.queue.includes(job.xsup)) state.queue.push(job.xsup);
    ensureBatchRuntime();
    renderJobList();
    renderSelectedJob();
    updateBatchStatus();
    pumpQueue();
  }

  function prepareDirectKcsFromCurrentTaco(job) {
    const conclusion = job.report?.verified_conclusion || job.report?.result?.rca || job.report?.final_report || job.report?.result?.guidance || "Technical conclusion available in current TACO report.";
    job.directKnowledgeOnly = true;
    job.auditAnswer = sanitizeGeneratedText(`# Direct KCS Evidence Basis\n\n**Target Ticket:** ${jobDisplayKey(job)}\n\n**Product Family:** ${productLabel(job)}\n\n**Primary Knowledge Action:** CREATE KCS\n\n**Artifact Readiness:** DRAFTABLE\n\n## At a Glance\nCreate a reusable KCS from the retained current TACO investigation and original Jira/SFDC evidence. This direct workflow intentionally skips retrospective Support-owned field review.\n\n## Technical Basis\n${conclusion}\n\n## Source Boundary\nUse original Jira/Engineering evidence, original SFDC evidence, official documentation, approved knowledge/internal documentation, and validated prior cases. TACO/Case Chat is synthesis only and must not be cited as the sole authority for a material claim.`);
    job.auditFingerprint = stableHashText(`DIRECT_KCS|${KNOWLEDGE_REUSE_SCHEMA}|${job.xsup}|${job.caseNumber}|${job.productKey}|${tacoReuseSignature(job.report)}|${evidenceReuseSignature(job.evidence)}`);
    job.auditReuseStatus = "not_required";
    job.auditReuseReason = "Direct KCS recovery uses the retained successful TACO snapshot; retrospective Audit remains skipped for this knowledge-only recovery path.";
    job.auditCompletedAt = Date.now();
    job.knowledgeAction = "CREATE KCS";
    job.secondaryKnowledgeAction = "NONE";
    job.artifactReadiness = "DRAFTABLE";
    job.knowledgeArtifactType = "KCS_DRAFT";
    job.autoGenerateKnowledgeDecision = "YES";
    job.reviewedFields = "Not reviewed — Direct KCS recovery";
    job.retrospectiveEligibility = "NOT APPLICABLE";
    job.steps.audit = "Skipped — Direct KCS recovery";
    job.references = extractReferences(job.report, job.evidence, job.selectedEvidence);
  }

  function forceGenerateKcsFromCurrentTaco(xsup) {
    const job = state.jobs.get(xsup);
    if (!job) return;
    if (job.status === "running" || ["queued","generating"].includes(job.knowledgeStatus)) {
      setStatus("Wait for active work to finish before generating KCS.", "error");
      return;
    }
    if (!job.caseNumber || !job.investigationId || !job.report || !job.evidence || !reportReady(job.report)) {
      setStatus("A completed current TACO snapshot is required for KCS-only recovery.", "error");
      return;
    }
    prepareDirectKcsFromCurrentTaco(job);
    job.forceKnowledgeRefresh = true;
    job.knowledgeStatus = "not_evaluated";
    job.knowledgeReuseStatus = "checking";
    job.knowledgeReuseReason = "Manual KCS-only recovery requested from retained current TACO evidence.";
    job.knowledgeAnswer = "";
    job.knowledgeRawAnswer = "";
    job.knowledgeDraftAnswer = "";
    job.knowledgeDraftFollowupId = null;
    job.knowledgeDraftCompletedAt = null;
    job.knowledgeDraftReuseStatus = "not_checked";
    job.knowledgeQualityStatus = "";
    job.knowledgeQualitySummary = "";
    job.knowledgeQualityValidationItems = "";
    job.validatedArtifactReadiness = "";
    job.knowledgeError = "";
    job.knowledgeAutoSaved = false;
    job.knowledgeCompletedAt = null;
    queueKnowledgeArtifact(job, {force:true});
    renderSelectedJob();
    setStatus(`${job.xsup}: KCS-only recovery queued from retained TACO; Audit is not being re-run.`, "ok");
  }

  function forceRegenerateKnowledge(xsup) {
    const job = state.jobs.get(xsup);
    if (!job) return;
    if (job.status === "running" || job.knowledgeStatus === "generating") {
      setStatus("Wait for active work to finish before regenerating knowledge.", "error");
      return;
    }
    if (!job.auditAnswer || !knowledgeArtifactRequests(job).length) {
      setStatus("No completed audit/knowledge decision is available for regeneration.", "error");
      return;
    }
    if (job.knowledgeStatus === "queued") {
      state.knowledgeQueue = state.knowledgeQueue.filter(x => x !== job.xsup);
    }

    job.forceKnowledgeRefresh = true;
    job.knowledgeStatus = "not_evaluated";
    job.knowledgeReuseStatus = "checking";
    job.knowledgeReuseReason = "Manual knowledge regeneration requested.";
    job.knowledgeAnswer = "";
    job.knowledgeRawAnswer = "";
    job.knowledgeDraftAnswer = "";
    job.knowledgeDraftFollowupId = null;
    job.knowledgeDraftCompletedAt = null;
    job.knowledgeDraftReuseStatus = "not_checked";
    job.knowledgeQualityStatus = "";
    job.knowledgeQualitySummary = "";
    job.knowledgeQualityValidationItems = "";
    job.validatedArtifactReadiness = "";
    job.knowledgeError = "";
    job.knowledgeAutoSaved = false;
    job.knowledgeCompletedAt = null;
    queueKnowledgeArtifact(job);
    renderSelectedJob();
  }

  function renderSelectedProgress(job) {
    const box = document.getElementById("xsup-auditor-selected-progress");
    if (!box || !job) return;
    const heartbeat = heartbeatInfo(job);
    box.innerHTML = `
      <div class="xa-selected-progress-main">
        <div>
          <span>Audit progress</span>
          <strong>${escapeHtml(progressLabel(job))}</strong>
        </div>
        ${progressBarHtml(job)}
      </div>
      <div class="xa-selected-progress-meta">
        <span><b>Activity:</b> ${escapeHtml(activityForJob(job))}</span>
        <span><b>Last update:</b> <em id="xsup-auditor-selected-heartbeat" data-kind="${heartbeat.kind}">${escapeHtml(heartbeat.text)}</em></span>
        <span><b>Elapsed:</b> <em id="xsup-auditor-selected-elapsed">${escapeHtml(jobElapsedText(job))}</em></span>
      </div>
    `;
  }



  function forceReanalyzeTaco(xsup) {
    const job = state.jobs.get(xsup);
    if (!job) return;

    if (job.status === "running" || job.knowledgeStatus === "generating") {
      setStatus("Wait for the selected XSUP's active work to finish before forcing TACO re-analysis.", "error");
      return;
    }
    if (!job.caseNumber && job.status === "needs_sfdc") {
      setStatus("Enter the SFDC case to start a fresh re-analysis.", "error");
      promptManualSFDC(job);
      return;
    }
    if (job.knowledgeStatus === "queued") {
      state.knowledgeQueue = state.knowledgeQueue.filter(x => x !== job.xsup);
    }

    job.forceTacoRefresh = true;
    job.tacoRecoveryRetries = 0;
    job.forceAuditRefresh = true;
    job.productLocked = false;
    job.forceKnowledgeRefresh = true;
    job.status = "queued";
    job.stageLabel = "Forced TACO refresh";
    job.error = "";
    job.endedAt = null;
    job.overallProgress = 5;
    job.tacoProgress = null;
    job.tacoNode = "";
    job.currentActivity = "Queued · forced TACO re-analysis";
    job.lastHeartbeatAt = Date.now();
    job.lastProgressChangeAt = Date.now();

    // New analysis invalidates the previous derived outputs.
    job.report = null;
    job.auditAnswer = "";
    job.xsupComment = "";
    job.references = [];
    job.reviewedFields = "";
    job.retrospectiveEligibility = "";
    job.auditReportedProduct = "";
    job.verdict = "";
    job.rcaVerdict = "";
    job.fixTypeVerdict = "";
    job.labelVerdict = "";
    job.resolutionChangeNeeded = "";
    job.rcaChangeNeeded = "";
    job.fixTypeChangeNeeded = "";
    job.labelChangeNeeded = "";
    job.resolutionExplanation = "";
    job.resolutionRecommendedValue = "";
    job.rcaExplanation = "";
    job.rcaRecommendedValue = "";
    job.fixTypeExplanation = "";
    job.fixTypeRecommendedValue = "";
    job.labelExplanation = "";
    job.labelRecommendedValue = "";
    job.technicalEvidence = "";
    job.engineeringConfirmation = "";
    job.importantTechnicalCaveat = "";
    job.knowledgeAction = "";
    job.secondaryKnowledgeAction = "";
    job.artifactReadiness = "";
    job.artifactTypeFromAudit = "";
    job.knowledgeDecisionExplanation = "";
    job.autoGenerateKnowledgeDecision = "";
    job.autoSaved = false;
    job.auditReuseStatus = "not_checked";
    job.auditReuseReason = "TACO re-analysis requested; previous audit is invalidated.";
    job.auditFollowupId = null;
    job.auditCompletedAt = null;

    job.knowledgeStatus = "not_evaluated";
    job.knowledgeProgress = "";
    job.knowledgeAnswer = "";
    job.knowledgeRawAnswer = "";
    job.knowledgeDraftAnswer = "";
    job.knowledgeDraftFollowupId = null;
    job.knowledgeDraftCompletedAt = null;
    job.knowledgeDraftReuseStatus = "not_checked";
    job.knowledgeQualityStatus = "";
    job.knowledgeQualitySummary = "";
    job.knowledgeQualityValidationItems = "";
    job.validatedArtifactReadiness = "";
    job.knowledgeError = "";
    job.knowledgeAutoSaved = false;
    job.knowledgeAutoDeliveryAttempted = false;
    job.knowledgeReuseStatus = "not_checked";
    job.knowledgeReuseReason = "TACO re-analysis requested; previous knowledge artifact is invalidated.";
    job.knowledgeFollowupId = null;
    job.knowledgeCompletedAt = null;

    if (!state.queue.includes(job.xsup)) state.queue.push(job.xsup);

    ensureBatchRuntime();
    renderJobList();
    renderDashboard();
    renderSelectedJob();
    updateBatchStatus();
    pumpQueue();
  }

  function fieldAction(changeNeeded, currentValue) {
    const c = String(changeNeeded || "").toUpperCase();
    if (/VERIFY \+ CHANGE/.test(c)) return "VERIFY + CHANGE";
    if (/VERIFY/.test(c) || /NOT VERIFIED|FIELD VALUE NOT AVAILABLE|CURRENT VALUE NEEDED/i.test(currentValue || "")) return "VERIFY SAVED VALUE";
    if (/^YES$/.test(c)) return "CHANGE REQUIRED";
    if (/^NO$/.test(c)) return "NO CHANGE";
    return "VERIFY SAVED VALUE";
  }

  function actionTone(action) {
    if (action === "NO CHANGE") return "good";
    if (action === "CHANGE REQUIRED" || action === "VERIFY + CHANGE") return "bad";
    return "warn";
  }

  function humanFacingWhy(value) {
    const text = cleanText(value || "");
    if (!text) return "";
    const internal = /retrospective policy|eligibility|\bin scope\b|trusted contract|lookup status|field snapshot|unavailable|source_not_available|field_not_present|access_denied|malformed_source|schema|prompt|field-fetch|current ticket field snapshot|tacopilot implementation|case chat/i;
    const parts = text.split(/(?<=[.!?])\s+|\n+/).map(cleanText).filter(Boolean);
    return parts.filter(x => !internal.test(x)).slice(0,2).join(" ");
  }

  function isKnownSavedValue(value) {
    const v = cleanText(value || "");
    if (!v) return false;
    return !/^(not verified|field value not available|unknown|unavailable|not available|current value needed|—)$/i.test(v);
  }

  function normalizeFieldValueForCompare(value) {
    return cleanText(value || "").toLowerCase().replace(/[\s_-]+/g, " ").trim();
  }

  function sameFieldValue(a, b) {
    const x = normalizeFieldValueForCompare(a), y = normalizeFieldValueForCompare(b);
    return Boolean(x && y && x === y);
  }

  function cleanHumanLearning(value, maxSentences = 2) {
    const text = cleanText(value || "")
      // Remove only genuine short list markers at a boundary. Never treat a year
      // such as "2026." as a numbered-list token inside prose.
      .replace(/(^|[;\n])\s*\d{1,2}[.)]\s+(?=(?:\*\*)?[A-Z])/g, "$1 ")
      .replace(/\*\*([^*]+)\*\*/g, "$1");
    if (!text) return "";
    const internal = /retrospective policy|eligibility|\bin scope\b|trusted contract|lookup status|field snapshot|unavailable|source_not_available|field_not_present|access_denied|malformed_source|schema|prompt|field-fetch|current ticket field snapshot|tacopilot implementation|case chat|not verified|verify saved jira|verify saved value/i;
    return text.split(/(?<=[.!?])\s+|\n+/).map(cleanText).filter(Boolean).filter(x=>!internal.test(x)).slice(0,maxSentences).join(" ");
  }
  function humanFacingDetail(value, maxSentences = 5) {
    return cleanHumanLearning(value, maxSentences);
  }

  function smeReviewIssueSummary(value, maxSentences = 2) {
    let text = cleanHumanLearning(value || "", Math.max(2, maxSentences + 1));
    if (!text) return "";

    // The paste comment is an SME field-decision summary, not a reproduction of
    // the customer case. Remove one-off endpoint/policy identifiers while
    // preserving the technical symptom and expected-vs-actual behavior.
    text = text
      .replace(/^The customer moved test endpoints\b/i, "Endpoints were moved")
      .replace(/^The customer moved endpoints\b/i, "Endpoints were moved")
      .replace(/\s*\(including\s+[^)]*\)/gi, "")
      .replace(/(Organizational Units?|OUs?)\s*\([^)]*\)/gi, "$1")
      .replace(/(prevention policy|policy)\s*\(`[^`]+`\)/gi, "$1")
      .replace(/\s*\(such as\s+`[^`]+`(?:\s*(?:,|or|and)\s*`[^`]+`)*\)/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    const sentences = text.split(/(?<=[.!?])\s+/).map(cleanText).filter(Boolean).slice(0, maxSentences);
    if (sentences.length === 2 && /^(however|instead|but)\b/i.test(sentences[1])) {
      return `${sentences[0].replace(/[.!?]+$/, "")}; ${sentences[1].replace(/^(however|instead|but)[,\s]*/i, "however ")}`;
    }
    return sentences.join(" ");
  }

  function knowledgeActionReasonLabel(action) {
    const a = normalizeDecision(action);
    if (a === "UPDATE ADMIN/TECH GUIDE") return "Admin/Tech Guide";
    if (a === "CREATE KCS") return "KCS";
    if (a === "UPDATE EXISTING KCS") return "Existing KCS";
    if (a === "CREATE/UPDATE RUNBOOK") return "Runbook";
    if (a === "KNOWN ISSUE/RELEASE NOTE") return "Known Issue / Release Note";
    return cleanText(action || "Knowledge");
  }

  function knowledgeActionInstruction(action, job = null) {
    const a = normalizeDecision(action);
    if (a === "UPDATE ADMIN/TECH GUIDE") return "Update the relevant Admin/Tech Guide section with the validated product behavior, design limits, operational guidance, and maintained-source cross-references.";
    if (a === "CREATE KCS") return "Create a standalone Salesforce KCS for immediate TAC reuse. The article should explain the reusable issue or task, supported cause/meaning where relevant, how to check or perform the procedure, supported resolution/workaround/recommended action, verification, limitations, and directly useful supporting documentation.";
    if (a === "UPDATE EXISTING KCS") return "Inspect the matching KCS content, update the identified gaps instead of creating a duplicate, and provide the complete merged standalone KCS article for review.";
    if (a === "CREATE/UPDATE RUNBOOK") return "Create or update the TAC runbook with the repeatable investigation workflow, decision points, Engineering boundary, escalation criteria, and verification.";
    if (a === "KNOWN ISSUE/RELEASE NOTE") return "Create or update the Known Issue / Release Note with the verified affected scope, behavior, workaround, fixed-version or disposition details, and supporting references.";
    return `Complete the recommended ${cleanText(action || "knowledge")} artifact as a reviewable action item.`;
  }

  function reviewKnowledgeActions(job, auditText = "") {
    const primary = cleanText(job?.knowledgeAction || extractField(auditText, "Primary Knowledge Action"));
    const secondary = cleanText(job?.secondaryKnowledgeAction || extractField(auditText, "Secondary Knowledge Action"));
    const actions = [primary, secondary]
      .filter(x => x && !/^(none|no knowledge action|n\/a|not applicable|undetermined)$/i.test(x));
    const out = [];
    const seen = new Set();
    for (const action of actions) {
      const key = normalizeDecision(action);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(action);
    }
    return out;
  }

  function knowledgeActionPlanBlocks(job, auditText = "") {
    const actions = reviewKnowledgeActions(job, auditText);
    if (!actions.length) return {summary:"", blocks:[]};
    const primary = cleanText(job?.knowledgeAction || extractField(auditText, "Primary Knowledge Action"));
    const secondary = cleanText(job?.secondaryKnowledgeAction || extractField(auditText, "Secondary Knowledge Action"));
    const primaryReason = cleanHumanLearning(job?.primaryKnowledgeReason || extractFieldBlock(auditText, "Primary Knowledge Reason"), 2);
    const secondaryReason = cleanHumanLearning(job?.secondaryKnowledgeReason || extractFieldBlock(auditText, "Secondary Knowledge Reason"), 2);
    const blocks = actions.map(action => {
      const label = knowledgeActionReasonLabel(action);
      let reason = normalizeDecision(action) === normalizeDecision(primary) ? primaryReason
        : normalizeDecision(action) === normalizeDecision(secondary) ? secondaryReason
        : normalizeDecision(action) === "CREATE KCS" ? "A standalone KCS gives TAC an immediately usable support article while owner-controlled documentation, runbook, known-issue or release-note changes are reviewed and implemented."
        : "";
      if (normalizeDecision(action) === "UPDATE ADMIN/TECH GUIDE" && job?.adminTechGuideNeedReason) reason = cleanHumanLearning(job.adminTechGuideNeedReason, 2) || reason;
      if (normalizeDecision(action) === "CREATE KCS" && /confluence|internal guide|internal knowledge|runbook/i.test(`${job?.priorReference || ""} ${job?.priorKnown || ""} ${job?.knowledgeChannelGap || ""}`)) {
        const channelReason = "Relevant technical guidance already exists internally; the KCS makes the validated guidance directly searchable and reusable in Salesforce Knowledge and suitable for later externalization review.";
        reason = reason ? `${reason} ${channelReason}` : channelReason;
      }
      reason = cleanText(reason || "")
        .replace(/diagnostic XQL queries?\s*\(`?[^)`]+`?\)/gi, "diagnostic checks")
        .replace(/API-driven tagging/gi, "currently supported tag-management mechanisms")
        .replace(/Sub-hour policy transitions require interactive user logoff\/logon or Endpoint Tagging\.?/gi, "A complete logoff/logon can reprioritize synchronization, but it does not guarantee a specific completion time or a sub-hour policy transition. Where deterministic faster policy switching is required, use Endpoint Tags.");
      return {action, label, instruction:knowledgeActionInstruction(action, job), reason};
    });
    return {summary:`TAC to ${actions.join(" + ")}.`, blocks};
  }

  function knowledgeActionPlanText(job, auditText = "") {
    const plan = knowledgeActionPlanBlocks(job, auditText);
    if (!plan.summary) return "";
    const parts = [plan.summary];
    for (const block of plan.blocks) {
      parts.push(`${block.label} action: ${block.instruction}${block.reason ? ` Why: ${block.reason}` : ""}`);
    }
    return limitHumanText(parts.join(" "), 1800);
  }

  function limitHumanText(value, maxChars = 1000) {
    const text = cleanText(value || "");
    if (text.length <= maxChars) return text;
    // Never emit a half technical sentence. Keep complete sentences that fit;
    // if the first sentence itself is long, keep it intact rather than replacing
    // missing meaning with an ellipsis.
    const sentences = text.split(/(?<=[.!?])\s+/).map(cleanText).filter(Boolean);
    if (!sentences.length) return text;
    let out = "";
    for (const sentence of sentences) {
      const candidate = out ? `${out} ${sentence}` : sentence;
      if (candidate.length > maxChars && out) break;
      if (candidate.length > maxChars && !out) return sentence;
      out = candidate;
    }
    return out || text;
  }
  function immediateOperationalGuidance(job) {
    const explicit = cleanHumanLearning(job?.immediateOperationalGuidance || "", 2);
    if (explicit && !/^(none|none identified|not applicable)$/i.test(explicit)) return explicit;

    const candidates = [
      job?.resolutionWhy,
      job?.rcaWhy,
      job?.fixTypeWhy,
      job?.labelWhy,
      job?.importantTechnicalCaveat,
      job?.tacChecksFirst,
      job?.earlierNarrowing
    ].map(v => cleanHumanLearning(v || "", 4)).filter(Boolean);

    const actionPattern = /\b(log\s*off|logout|log\s*on|login|restart|reboot|upgrade|update|enable|disable|configure|reconfigure|exclude|allowlist|switch|use endpoint tags|endpoint tags|reorder|move .* final|install|remove|assign|reauthoriz|authorize|verify .* license|change .* license|manual fetch|debug-mode|procmon|codeintegrity|wait up to|prioriti[sz]e|resync)\b/i;
    for (const candidate of candidates) {
      const sentence = candidate.split(/(?<=[.!?])\s+|\n+/).map(cleanText).find(x => actionPattern.test(x));
      if (sentence) return sentence;
    }
    return "";
  }

  function completeHumanFinding(job, maxSentences = 3) {
    const primary = cleanHumanLearning(job?.technicalConclusion || "", maxSentences);
    const looksIncomplete = !primary || /:\s*$/.test(primary) || primary.split(/\s+/).length < 7;
    const fallback = cleanHumanLearning(job?.technicalEvidenceExplanation || "", maxSentences);
    let finding = looksIncomplete ? (fallback || primary) : primary;
    const guidance = immediateOperationalGuidance(job);
    if (guidance && !normalizeFieldValueForCompare(finding).includes(normalizeFieldValueForCompare(guidance))) {
      finding = cleanText(`${finding}${finding ? " " : ""}Practical next step: ${guidance}`);
    }
    return limitHumanText(polishReviewCommentText(finding), 1350);
  }

  function smeAtGlanceFindingSummary(job) {
    const fieldWhy = humanDecisionFields(job).map(f => humanFacingWhy(f.why)).find(Boolean) || "";
    let raw = cleanHumanLearning(fieldWhy || job?.technicalConclusion || job?.technicalEvidenceExplanation || "", 3);
    if (!raw || /:\s*$/.test(raw) || cleanText(raw).length < 55) raw = completeHumanFinding(job, 3) || raw;
    let finding = polishReviewCommentText(smeReviewIssueSummary(raw, 3))
      .replace(/\b(?:QUERY_BIND_FAILED|kvoop\.exe|cyserver\.exe)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    const guidance = polishReviewCommentText(immediateOperationalGuidance(job));
    if (guidance && !normalizeFieldValueForCompare(finding).includes(normalizeFieldValueForCompare(guidance))) {
      const safeGuidance = polishReviewCommentText(smeReviewIssueSummary(guidance, 2));
      if (safeGuidance) finding = cleanText(`${finding}${finding ? " " : ""}${safeGuidance}`);
    }
    if (/[:;]\s*$/.test(finding)) {
      const fallback = polishReviewCommentText(completeHumanFinding(job, 4));
      if (fallback && !/[:;]\s*$/.test(fallback)) finding = fallback;
    }
    return limitHumanText(finding, 850);
  }
  function cleanHumanListItems(value, maxItems = 5) {
    const internal = /retrospective policy|eligibility|\bin scope\b|trusted contract|lookup status|field snapshot|unavailable|source_not_available|field_not_present|access_denied|malformed_source|schema|prompt|field-fetch|current ticket field snapshot|tacopilot implementation|case chat|not verified|verify saved jira|verify saved value/i;
    const text = cleanText(value || "")
      .replace(/(^|[;\n])\s*\d+[.)]\s*/g, "$1")
      .replace(/\s*;\s*/g, "\n");
    return text.split(/\n+/).map(cleanText).filter(Boolean).filter(x => !internal.test(x)).slice(0, maxItems);
  }

  function analysisListBlock(label, value, maxItems = 5) {
    const items = cleanHumanListItems(value, maxItems);
    if (!items.length) return "";
    return `<div class="xa-analysis-block"><strong>${escapeHtml(label)}</strong><ul>${items.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul></div>`;
  }

  function conciseKnowledgeSummary(value) {
    const text = cleanText(value || "");
    if (!text) return "";
    const first = text.split(/(?<=[.!?])\s+/).map(cleanText).filter(Boolean)[0] || text;
    return first.length > 240 ? `${first.slice(0, 237).replace(/\s+\S*$/, "")}…` : first;
  }

  function humanDecisionFields(job) {
    return [
      {name:"Resolution", change:job.resolutionChangeNeeded, current:job.resolutionCurrentValue, correct:job.resolutionRecommendedValue, why:job.resolutionWhy, detail:job.resolutionExplanation},
      {name:"RCA", change:job.rcaChangeNeeded, current:job.rcaCurrentValue, correct:job.rcaRecommendedValue, why:job.rcaWhy, detail:job.rcaExplanation},
      {name:"Fix Type", change:job.fixTypeChangeNeeded, current:job.fixTypeCurrentValue, correct:job.fixTypeRecommendedValue, why:job.fixTypeWhy, detail:job.fixTypeExplanation},
      {name:"Flag / Label", change:job.labelChangeNeeded, current:job.labelCurrentValue, correct:job.labelRecommendedValue, why:job.labelWhy, detail:job.labelExplanation}
    ].filter(f => f.change && !/^(not applicable|n\/a)$/i.test(f.change) && cleanText(f.correct || ""));
  }

  function humanFieldCardHtml(job, f) {
    const known = isKnownSavedValue(f.current);
    const mismatch = known && !sameFieldValue(f.current, f.correct);
    const tone = mismatch ? "bad" : "good";
    const why = humanFacingWhy(f.why) || humanFacingDetail(f.detail, mismatch ? 4 : 2);
    const correction = mismatch ? `<div class="xa-sme-correction"><b>Correction needed:</b> Saved ${escapeHtml(f.name)} is <strong>${escapeHtml(f.current)}</strong>; use <strong>${escapeHtml(f.correct)}</strong>.</div>` : "";
    const detail = mismatch ? humanFacingDetail(f.detail, 5) : "";
    return `<div class="xa-sme-field-card xa-sme-${tone}">
      <div class="xa-sme-field-head"><strong>${escapeHtml(f.name)}</strong>${mismatch ? '<span class="pill bad">CHANGE NEEDED</span>' : ''}</div>
      <div class="xa-correct-value"><span>Correct value</span><strong>${escapeHtml(f.correct)}</strong></div>
      ${why ? `<div class="xa-sme-why"><b>Why:</b> ${escapeHtml(why)}</div>` : ""}
      ${correction}
      ${mismatch && detail && detail !== why ? `<div class="xa-sme-detail"><b>Technical rationale:</b> ${escapeHtml(detail)}</div>` : ""}
    </div>`;
  }

  function normalizeSingleCaseManagementLearning(value) {
    return cleanText(value||"")
      .replace(/\b(?:a )?recurring,?\s+highly repeatable support-resolution pattern\b/gi,"a reusable support-resolution pattern")
      .replace(/\b(?:recurring|repeated|frequent|common|highly repeatable)\s+support-resolution pattern\b/gi,"reusable support-resolution pattern")
      .replace(/\brecurring,?\s+highly repeatable pattern\b/gi,"reusable pattern")
      .replace(/\b(?:recurring|repeated|frequent|common)\s+pattern across (?:cases|tickets|escalations)\b/gi,"reusable pattern shown by this case")
      .replace(/\bthis case proves an? (?:organizational|systemic) trend\b/gi,"this case shows a case-specific pattern")
      .replace(/\b(?:organization-wide|systemic) (?:support )?(?:trend|pattern)\b/gi,"case-specific support pattern")
      .replace(/\borganization-wide\b/gi,"case-specific");
  }

  function tacLearningCardHtml(job) {
    const learning = cleanHumanLearning(job.tacLearning || "");
    const action = cleanHumanLearning(job.tacActionItem || "");
    if (!learning && !action) return "";
    return `<div class="xa-sme-field-card xa-sme-info"><div class="xa-sme-field-head"><strong>TAC Learning &amp; Prevention</strong></div>${learning?`<div class="xa-sme-why"><b>Learning:</b> ${escapeHtml(learning)}</div>`:""}${action?`<div class="xa-sme-action"><b>Action item:</b> ${escapeHtml(action)}</div>`:""}</div>`;
  }

  function auditEvidenceDetailsHtml(job) {
    const issue = cleanHumanLearning(job.reportedIssue || "", 3);
    const conclusion = humanFacingDetail(job.technicalConclusion || job.technicalEvidenceExplanation || "", 5);
    const engineering = humanFacingDetail(job.engineeringConfirmationEvidence || "", 4);
    const caveat = humanFacingDetail(job.importantTechnicalCaveat || "", 3);
    const rows = [];
    if (issue) rows.push(`<p><strong>Reported issue:</strong> ${escapeHtml(issue)}</p>`);
    if (conclusion) rows.push(`<p><strong>Technical conclusion:</strong> ${escapeHtml(conclusion)}</p>`);
    if (job.engineeringConfirmation) rows.push(`<p><strong>Engineering confirmation:</strong> ${escapeHtml(job.engineeringConfirmation)}${engineering?` — ${escapeHtml(engineering)}`:""}</p>`);
    if (caveat && !/none identified/i.test(caveat)) rows.push(`<p><strong>Important caveat:</strong> ${escapeHtml(caveat)}</p>`);
    return rows.join("") || '<p>No additional technical evidence summary was returned.</p>';
  }

  function auditAtGlanceHtml(job) {
    const issue = polishReviewCommentText(smeReviewIssueSummary(job.reportedIssue || "", 2));
    const finding = smeAtGlanceFindingSummary(job);
    const fieldBits = humanDecisionFields(job).map(f => `<div class="xa-sme-field-card xa-sme-good"><div class="xa-sme-field-head"><strong>Correct ${escapeHtml(f.name)}</strong></div><div class="xa-correct-value"><strong>${escapeHtml(f.correct)}</strong></div>${humanFacingWhy(f.why)?`<div class="xa-sme-why"><b>Why:</b> ${escapeHtml(polishReviewCommentText(humanFacingWhy(f.why)))}</div>`:""}</div>`).join("");
    const action = knowledgeActionPlanText(job) || cleanHumanLearning(job.tacActionItem || "", 2);
    const primary = cleanText(job.knowledgeAction || "");
    const secondary = cleanText(job.secondaryKnowledgeAction || "");
    const actions = reviewKnowledgeActions(job);
    const knowledge = primary && !/NO KNOWLEDGE ACTION|NOT APPLICABLE/i.test(primary)
      ? `<div class="xa-sme-field-card xa-sme-info"><div class="xa-sme-field-head"><strong>Knowledge recommendation</strong></div><div class="xa-sme-why"><b>Primary:</b> ${escapeHtml(primary)}${secondary && !/^(NONE|NOT APPLICABLE)$/i.test(secondary)?`<br><b>Secondary:</b> ${escapeHtml(secondary)}`:""}</div></div>` : "";
    return `<section><h2>Case at a Glance</h2>${issue?`<div class="xa-sme-field-card xa-sme-info"><div class="xa-sme-field-head"><strong>Reported issue</strong></div><div class="xa-sme-why">${escapeHtml(issue)}</div></div>`:""}${finding?`<div class="xa-sme-field-card xa-sme-gray"><div class="xa-sme-field-head"><strong>What happened / finding</strong></div><div class="xa-sme-why">${escapeHtml(finding)}</div></div>`:""}${fieldBits}${action?`<div class="xa-sme-field-card xa-sme-info"><div class="xa-sme-field-head"><strong>TAC / knowledge action plan</strong></div><div class="xa-sme-action">${escapeHtml(action)}</div></div>`:""}${knowledge}</section>`;
  }

  function renderRetrospectiveLinkedText(value, refs = []) {
    const raw = cleanText(value || "");
    if (!raw) return "";
    const placeholders = [];
    const protect = (url, label) => {
      const clean = safeUrl(url);
      const token = `@@XAURL${placeholders.length}@@`;
      placeholders.push(clean ? `<a href="${escapeHtml(clean)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label || clean)}</a>` : escapeHtml(label || url));
      return token;
    };
    let text = raw.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m,label,url) => protect(url, label));
    text = text.replace(/https?:\/\/[^\s<>()]+/g, url => {
      const trailing = url.match(/[.,;:!?]+$/)?.[0] || "";
      const core = trailing ? url.slice(0, -trailing.length) : url;
      return `${protect(core, core)}${trailing}`;
    });
    text = escapeHtml(text);
    text = text.replace(/\b(XSUP-\d+)\b/g, (_m,id) => `<a href="https://jira-dc.paloaltonetworks.com/browse/${id}" target="_blank" rel="noopener noreferrer">${id}</a>`);
    text = text.replace(/Confluence page\s+(\d+)/gi, (_m,id) => `Confluence page <a href="https://confluence-dc.paloaltonetworks.com/pages/viewpage.action?pageId=${id}" target="_blank" rel="noopener noreferrer">${id}</a>`);
    text = text.replace(/\bCase\s+(\d{7,10})\b/g, (m,id) => {
      const hit = (refs || []).find(r => String(r?.title || "").includes(id) || String(r?.url || "").includes(id));
      const url = hit?.url ? safeUrl(hit.url) : null;
      return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${m}</a>` : m;
    });
    text = text.replace(/@@XAURL(\d+)@@/g, (_m,i) => placeholders[Number(i)] || "");
    return text;
  }
  function caseManagementSignal(job) {
    const explicit=cleanText(job?.managementSignal||"").toUpperCase();
    if(explicit && !/^(NONE|NOT APPLICABLE)$/.test(explicit)) return explicit;
    const actions=reviewKnowledgeActions(job);
    const availability=cleanText(job?.knowledgeAvailability||"").toUpperCase();
    const avoid=cleanText(job?.xsupAvoidable||"").toUpperCase();
    if(actions.includes("UPDATE EXISTING KCS") || actions.includes("UPDATE ADMIN/TECH GUIDE")) return "KNOWLEDGE QUALITY / MAINTENANCE";
    if(actions.includes("CREATE KCS") && /EXISTS INTERNALLY|PARTIAL/.test(availability)) return "KNOWLEDGE DISCOVERABILITY / DISTRIBUTION";
    if(actions.includes("CREATE/UPDATE RUNBOOK") || /^(YES|PARTIAL)$/.test(avoid)) return "TAC WORKFLOW / ENABLEMENT";
    if(actions.includes("KNOWN ISSUE/RELEASE NOTE")) return "PRODUCT GAP";
    if(avoid === "NO" && cleanHumanLearning(job?.engineeringContribution||job?.engineeringBoundary||"",2)) return "ENGINEERING DEPENDENCY";
    return "CASE-SPECIFIC LEARNING";
  }

  function caseManagementLearning(job) {
    const explicit=normalizeSingleCaseManagementLearning(polishReviewCommentText(cleanHumanLearning(job?.managementLearning||"",4)));
    if(explicit) return explicit;
    const candidates=[job?.retrospectiveImprovement,job?.tacLearning,job?.knowledgeDecisionExplanation,job?.knowledgeChannelGap].map(v=>polishReviewCommentText(cleanHumanLearning(v||"",3))).filter(Boolean);
    return candidates[0] || "The available evidence supports a case-specific learning, but it does not establish an organization-wide trend from this single XSUP.";
  }

  function caseManagementAction(job) {
    const explicit=polishReviewCommentText(cleanHumanLearning(job?.managementUseAction||"",3));
    if(explicit) return explicit;
    const actions=reviewKnowledgeActions(job);
    if(actions.includes("UPDATE EXISTING KCS")) return "Close the identified gap in the existing KCS, validate the updated claims against current sources, and use future similar escalations to see whether the corrected knowledge is being found and applied.";
    if(actions.includes("CREATE KCS")) return "Package the validated case learning into searchable Salesforce Knowledge so TAC can discover and reuse it before a similar escalation.";
    if(actions.includes("UPDATE ADMIN/TECH GUIDE")) return "Route the validated gap to the maintained documentation owner and ensure the current guide clearly states the supported behavior, limits and operational expectation.";
    if(actions.includes("CREATE/UPDATE RUNBOOK")) return "Turn the repeatable investigation path and Engineering boundary into a maintained TAC workflow so future cases arrive at the escalation point with the right checks and evidence.";
    if(actions.includes("KNOWN ISSUE/RELEASE NOTE")) return "Capture the validated scope, impact and disposition in the maintained known-issue/release-note channel and keep TAC guidance aligned with it.";
    return "Retain this case-specific learning with the XSUP review and use it when the same issue recurs; one case alone should not be presented as a broader organizational trend.";
  }

  function tacAnalysisDetailsHtml(job) {
    const rows = [];
    const normalizeYN = value => {
      const v = cleanText(value || "").toUpperCase();
      if (/^(YES|NO|PARTIAL)$/.test(v)) return v;
      return "";
    };

    reconcileRetrospectiveAvoidability(job);
    const avoidable = normalizeYN(job.xsupAvoidable);
    let assessment = polishReviewCommentText(cleanHumanLearning(job.xsupEscalationAssessment || "", 3));
    if (!assessment) assessment = avoidable === "NO"
      ? "APPROPRIATE — Engineering was required for decisive evidence or backend confirmation that TAC could not obtain directly."
      : avoidable === "YES"
        ? "AVOIDABLE — available case evidence indicates the decisive answer was already obtainable without Engineering escalation."
        : "UNCLEAR — the available case evidence does not establish enough detail to reliably judge why Engineering escalation was required.";
    rows.push(`<div class="xa-analysis-block"><strong>Why was the XSUP / Engineering escalation needed?</strong><p>${escapeHtml(assessment)}</p></div>`);

    const avoidabilityStatus = /^(YES|NO)$/i.test(avoidable) ? avoidable.toUpperCase() : "UNCLEAR";
    const avoidabilityWhy = avoidabilityStatus === "YES"
      ? "Available case evidence indicates the decisive answer was obtainable without Engineering escalation."
      : avoidabilityStatus === "NO"
        ? "Available case evidence indicates Engineering/backend confirmation was still required for a decisive answer."
        : "The available evidence does not establish enough detail to determine whether the XSUP could have been avoided.";
    rows.push(`<div class="xa-analysis-block"><strong>Could XSUP have been avoided?</strong><p><b>${escapeHtml(avoidabilityStatus)}</b> — ${escapeHtml(avoidabilityWhy)}</p></div>`);

    let tacWork = polishReviewCommentText(cleanHumanLearning(job.tacWorkBeforeXsup || "", 4));
    const prescriptive = /^(?:verify|check|validate|test|review|collect|query|inspect)\b/i.test(tacWork) || /(?:^|[.;]\s*)(?:verify|check|validate|test|review|collect|query|inspect)\b/i.test(tacWork);
    if (!tacWork || prescriptive) tacWork = "UNCLEAR — the available case evidence does not reliably establish which relevant checks TAC completed before the Engineering escalation.";
    rows.push(`<div class="xa-analysis-block"><strong>What TAC had already established</strong><p>${escapeHtml(tacWork)}</p></div>`);

    let eng = polishReviewCommentText(cleanHumanLearning(job.engineeringContribution || job.engineeringBoundary || "", 6));
    if (!eng) eng = "UNCLEAR — the available retrospective evidence does not separately describe what Engineering uniquely added.";
    rows.push(`<div class="xa-analysis-block"><strong>What Engineering added</strong><p>${escapeHtml(eng)}</p></div>`);

    reconcileRetrospectiveKnowledgeState(job);
    const priorStatus = cleanText(job.priorMatchStatus || "").toUpperCase() || "UNDETERMINED";
    const priorRef = cleanHumanLearning(job.priorReference || job.existingKcsCandidate || "", 2);
    const priorKnown = cleanHumanLearning(job.priorKnown || job.existingKcsCoveredContent || "", 3);
    const priorHelp = normalizeYN(job.priorCouldHelp);
    const availability = cleanText(job.knowledgeAvailability || "").toUpperCase();
    let channelGap = cleanHumanLearning(job.knowledgeChannelGap || "", 3);
    if (!channelGap && /confluence|internal guide|internal knowledge|runbook/i.test(`${priorRef} ${priorKnown}`) && reviewKnowledgeActions(job).includes("CREATE KCS")) {
      channelGap = "Relevant technical guidance exists internally. Equivalent Salesforce KCS/customer-facing coverage was not established in the retrospective evidence; the KCS action is therefore a packaging/distribution action, not a claim that the technical knowledge did not exist.";
    }
    const bits = [`Match: ${escapeHtml(priorStatus)}.`];
    if (availability) bits.push(`Availability: ${escapeHtml(availability)}.`);
    if (priorKnown && !/none established|not applicable/i.test(priorKnown)) bits.push(`Already known: ${renderRetrospectiveLinkedText(priorKnown, job.references || [])}`);
    if (priorHelp) bits.push(`Could it have helped earlier? ${escapeHtml(priorHelp)}.`);
    if (!priorRef && !priorKnown && priorStatus === "UNDETERMINED") bits.push("Available evidence did not establish a reliable prior-ticket or knowledge match.");
    const refHtml = priorRef && !/none identified/i.test(priorRef) ? `<div><b>Best reference:</b> ${renderRetrospectiveLinkedText(priorRef, job.references || [])}</div>` : "";
    const gapHtml = channelGap ? `<div><b>Knowledge channel gap:</b> ${renderRetrospectiveLinkedText(channelGap, job.references || [])}</div>` : "";
    rows.push(`<div class="xa-analysis-block"><strong>Existing knowledge / prior-ticket check</strong><p>${bits.join(" ")}</p>${refHtml}${gapHtml}</div>`);

    const priorUseRaw = cleanText(job.priorKnowledgeUseStatus || "").toUpperCase();
    const priorUse = /^(YES|NO|UNCLEAR)$/.test(priorUseRaw) ? priorUseRaw : "UNCLEAR";
    const priorUseEvidence = cleanHumanLearning(job.priorKnowledgeUseEvidence || "", 3) || (priorUse === "UNCLEAR"
      ? "The available case record does not prove whether TAC found or used the relevant prior material before the XSUP was created."
      : "The case record establishes this status.");
    rows.push(`<div class="xa-analysis-block"><strong>Was relevant prior knowledge found / used before XSUP?</strong><p><b>${escapeHtml(priorUse)}</b> — ${renderRetrospectiveLinkedText(priorUseEvidence, job.references || [])}</p></div>`);

    const earlier = polishReviewCommentText(cleanHumanLearning(job.earlierNarrowing || "", 4));
    let earlierStatus = normalizeYN(job.earlierNarrowingPossible);
    if (!earlierStatus) earlierStatus = earlier ? "YES" : "NO";
    const earlierWhy = earlier || (earlierStatus === "NO"
      ? "The current evidence does not identify a reliable earlier answer; the decisive information was not available until Engineering/backend review."
      : "A specific earlier recognition point was not returned.");
    const stillNeeded = earlierStatus === "YES" && avoidable === "NO"
      ? " Earlier narrowing would not necessarily have eliminated the XSUP because Engineering-only confirmation was still required for the remaining question."
      : "";
    rows.push(`<div class="xa-analysis-block"><strong>Could this have been narrowed earlier?</strong><p><b>${escapeHtml(earlierStatus)}</b> — ${escapeHtml(earlierWhy + stillNeeded)}</p></div>`);

    const managementSignal = caseManagementSignal(job);
    const managementLearning = caseManagementLearning(job);
    const managementAction = caseManagementAction(job);
    rows.push(`<div class="xa-analysis-block xa-management-learning"><strong>Management learning from this XSUP</strong><p><b>Signal:</b> ${escapeHtml(managementSignal)}</p><p><b>What this case teaches:</b> ${escapeHtml(managementLearning)}</p><p><b>How to use the learning:</b> ${escapeHtml(managementAction)}</p><p class="small">Case-specific management signal from this one XSUP; it is not an aggregate trend or performance score.</p></div>`);

    let improvement = polishReviewCommentText(cleanHumanLearning(job.retrospectiveImprovement || job.tacActionItem || "", 3));
    if (!improvement) improvement = "No additional retrospective improvement was established from the available evidence.";
    rows.push(`<div class="xa-analysis-block"><strong>Retrospective takeaway</strong><p>${escapeHtml(improvement)}</p></div>`);
    return rows.join("");
  }

  function renderDecisionSummary(job) {
    const box = document.getElementById("xsup-auditor-decision-summary");
    if (!box || !job) return;
    const fields = humanDecisionFields(job);
    const cards = fields.map(f => humanFieldCardHtml(job, f)).join("");
    const learning = tacLearningCardHtml(job);
    const knowledgeAction = job.knowledgeAction || "Pending";
    const knowledgeSummary = conciseKnowledgeSummary(job.knowledgeDecisionExplanation || "");
    const knowledgeTone = /NO KNOWLEDGE ACTION|NOT APPLICABLE/i.test(knowledgeAction) ? "gray" : "info";
    const knowledge = `<div class="xa-decision-group"><div class="xa-decision-group-title">Knowledge Reuse</div><div class="xa-sme-field-card xa-sme-${knowledgeTone}"><div class="xa-sme-field-head"><strong>${escapeHtml(knowledgeAction)}</strong></div>${knowledgeSummary?`<div class="xa-sme-why">${escapeHtml(knowledgeSummary)}</div>`:""}</div></div>`;
    const issue = cleanHumanLearning(job.reportedIssue || "", 4);
    const finding = completeHumanFinding(job, 3);
    const top = `${issue?`<div class="xa-sme-field-card xa-sme-info"><div class="xa-sme-field-head"><strong>Reported issue</strong></div><div class="xa-sme-why">${escapeHtml(issue)}</div></div>`:""}${finding?`<div class="xa-sme-field-card xa-sme-gray"><div class="xa-sme-field-head"><strong>What happened / finding</strong></div><div class="xa-sme-why">${escapeHtml(finding)}</div></div>`:""}`;
    box.innerHTML = `<div class="xa-decision-group"><div class="xa-decision-group-title">SME / Engineer Retrospective Learning</div>${top}${cards || '<div class="xa-decision-empty">No field recommendation is needed from the available technical evidence.</div>'}${learning}</div>${knowledge}`;
  }

  function knowledgeResultContext(job, result) {
    return {
      ...job,
      knowledgeAction: result?.action || job.knowledgeAction,
      secondaryKnowledgeAction: "NONE",
      knowledgeRole: result?.role || job.knowledgeRole || "primary",
      knowledgeArtifactType: result?.type || job.knowledgeArtifactType,
      knowledgeAnswer: result?.answer || "",
      knowledgeRawAnswer: result?.rawAnswer || "",
      knowledgeFollowupId: result?.followupId || null,
      knowledgeCompletedAt: result?.completedAt || job.knowledgeCompletedAt,
      knowledgeReuseStatus: result?.reuseStatus || "",
      knowledgeReuseReason: result?.reuseReason || "",
      knowledgeQualityStatus: result?.qualityStatus || "",
      knowledgeQualitySummary: result?.qualitySummary || "",
      knowledgeQualityValidationItems: result?.validationItems || "",
      validatedArtifactReadiness: result?.readiness || job.validatedArtifactReadiness,
      specialReviewItems: result?.specialReviewItems || [],
      publicationReviewStatus: result?.publicationReviewStatus || "",
      references: result?.references || job.references || []
    };
  }

  function renderKnowledgeArtifact(job) {
    const box = document.getElementById("xsup-auditor-knowledge-artifact");
    if (!box || !job) return;

    const requests = job.knowledgeArtifactRequests?.length ? job.knowledgeArtifactRequests : knowledgeArtifactRequests(job);
    const artifacts = Array.isArray(job.knowledgeArtifacts) ? job.knowledgeArtifacts : [];
    const type = job.knowledgeArtifactType || knowledgeArtifactType(job);
    const label = job.artifactTypeFromAudit || (type ? knowledgeArtifactLabel(type) : "No knowledge artifact");
    const primary = artifacts.find(x => x.role === "primary") || artifacts.find(x => x.status === "completed") || null;
    const previewAnswer = primary?.answer || job.knowledgeAnswer || "";
    const canRetry = Boolean(requests.length && job.auditAnswer && ["failed", "stopped", "not_generated", "outdated", "completed"].includes(job.knowledgeStatus));
    const completedKcsUpdate = artifacts.find(x => x.status === "completed" && x.type === "KCS_UPDATE");
    const completedReviewerNewKcs = artifacts.find(x => x.status === "completed" && x.type === "KCS_DRAFT") && Boolean(job.forceCreateNewKcs || job.existingKcsReviewerOverride);
    const canChooseSeparateNewKcs = Boolean(completedKcsUpdate && !["queued","generating"].includes(job.knowledgeStatus));
    const canReturnToRecommendedUpdate = Boolean(completedReviewerNewKcs && !["queued","generating"].includes(job.knowledgeStatus));

    const artifactRows = artifacts.length ? artifacts.map((result, index) => {
      const icon = result.status === "completed" ? "✓" : "✕";
      const status = result.status === "completed"
        ? (result.reuseStatus === "reused" ? "Reused existing" : "Generated")
        : "Failed";
      const deliveryText = result.status !== "completed" ? "" : state.saveDirectoryHandle
        ? (result.delivery === "saved_to_folder" ? ` · saved to ${state.saveDirectoryName || "selected folder"}` : result.delivery === "save_failed" ? " · folder save failed" : " · saving")
        : result.delivery === "saved_by_user"
          ? " · saved by reviewer"
          : result.delivery === "download_requested"
            ? " · standalone auto-download requested"
            : result.delivery === "download_failed"
              ? " · automatic download failed · use Download"
              : " · download available";
      return `<div class="xa-analysis-block">
        <strong>${escapeHtml(knowledgeRoleLabel(result.role))} · ${escapeHtml(result.label || knowledgeArtifactLabel(result.type))}</strong>
        <p>${escapeHtml(icon)} ${escapeHtml(status)}${result.followupId ? ` · Case Chat #${escapeHtml(String(result.followupId))}` : ""}${result.readiness ? ` · ${escapeHtml(result.readiness)}` : ""}${escapeHtml(deliveryText)}</p>
        ${result.reuseReason ? `<p class="small">${escapeHtml(result.reuseReason)}</p>` : ""}
        ${result.error ? `<div class="xa-knowledge-error">${escapeHtml(result.error)}</div>` : ""}
        ${result.status === "completed" && result.answer ? `<div class="xa-actions"><button data-xa-k-download="${index}">Download ${escapeHtml(result.label || knowledgeArtifactLabel(result.type))}</button><button data-xa-k-copy="${index}">Copy</button></div>` : ""}
      </div>`;
    }).join("") : requests.map(req => `<div class="xa-analysis-block"><strong>${escapeHtml(knowledgeRoleLabel(req.role))} · ${escapeHtml(knowledgeArtifactLabel(req.type))}</strong><p>${job.knowledgeStatus === "queued" ? "Queued" : job.knowledgeStatus === "generating" ? "Pending / generating" : "Not generated yet"}</p></div>`).join("");

    box.innerHTML = `
      <div class="xa-knowledge-card">
        <div class="xa-knowledge-title">
          <div>
            <strong>${escapeHtml(job.knowledgeAction || "Knowledge decision pending")}${job.secondaryKnowledgeAction && !/^(NONE|NOT APPLICABLE)$/i.test(job.secondaryKnowledgeAction) ? ` + ${escapeHtml(job.secondaryKnowledgeAction)}` : ""}</strong>
            <span>Initial Readiness: ${escapeHtml(job.artifactReadiness || "—")} · ${requests.length || 0} artifact${requests.length === 1 ? "" : "s"}</span>
          </div>
          <span class="xa-knowledge-status xa-knowledge-${escapeHtml(knowledgeDisplayClass(job))}">${knowledgeStatusIcon(job)} ${escapeHtml(knowledgeStatusText(job))}</span>
        </div>
        ${job.knowledgeDecisionExplanation ? `<div class="xa-knowledge-decision">${escapeHtml(job.knowledgeDecisionExplanation)}</div>` : ""}
        ${artifactRows}
        ${job.knowledgeError ? `<div class="xa-knowledge-error">${escapeHtml(job.knowledgeError)}</div>` : ""}
        ${(completedKcsUpdate || completedReviewerNewKcs) ? `<div class="xa-analysis-block"><strong>Existing Knowledge Decision</strong><p>${completedReviewerNewKcs ? "Update Existing KCS remains the default recommendation because substantial overlap was identified. The current output is a separate NEW KCS created by reviewer choice, and the related existing KCS is retained in the new draft." : "Substantial existing Salesforce KCS overlap was identified. Recommended path: UPDATE EXISTING KCS. You can still deliberately create a separate NEW KCS; the new draft will reference the related existing KCS and require duplication/conflict review before publication."}</p>${job.existingKcsCandidate ? `<p class="small"><b>Existing / related KCS:</b> ${escapeHtml(job.existingKcsCandidate)}</p>` : ""}</div>` : ""}
        ${previewAnswer ? `<div class="xa-knowledge-preview">${safeMarkdownToHtml(stripInternalKnowledgeMetadata(previewAnswer))}</div>` : ""}
        <div class="xa-actions">
          ${canChooseSeparateNewKcs ? `<button id="xsup-auditor-create-new-kcs-anyway">Create New KCS Anyway</button>` : ""}
          ${canReturnToRecommendedUpdate ? `<button id="xsup-auditor-use-recommended-kcs-update">Use Recommended Update Existing KCS</button>` : ""}
          ${canRetry ? `<button id="xsup-auditor-retry-knowledge">Regenerate all recommended Knowledge</button>` : ""}
        </div>
      </div>
    `;

    box.querySelectorAll("[data-xa-k-download]").forEach(button => {
      button.onclick = () => {
        const result = artifacts[Number(button.dataset.xaKDownload)];
        if (!result?.answer) return;
        const ctx = knowledgeResultContext(job, result);
        void downloadBlob(knowledgeFilename(ctx), knowledgeArtifactHtml(ctx), "text/html;charset=utf-8");
      };
    });

    box.querySelectorAll("[data-xa-k-copy]").forEach(button => {
      button.onclick = async () => {
        const result = artifacts[Number(button.dataset.xaKCopy)];
        if (!result?.answer) return;
        const ctx = knowledgeResultContext(job, result);
        const copyType = ctx.knowledgeArtifactType || knowledgeArtifactType(ctx);
        const normalized = normalizeReusableKnowledgeForDisplay(result.answer, copyType);
        const enriched = applySharedKnowledgeEvidenceEnvelope(ctx, normalized, copyType);
        await copyWithFeedback(button, enriched);
        setStatus(`${job.xsup} ${result.label || knowledgeArtifactLabel(result.type)} copied.`, "ok");
      };
    });

    document.getElementById("xsup-auditor-create-new-kcs-anyway")?.addEventListener("click", () => queueReviewerKcsChoice(job, "CREATE_NEW_ANYWAY"));
    document.getElementById("xsup-auditor-use-recommended-kcs-update")?.addEventListener("click", () => queueReviewerKcsChoice(job, "USE_RECOMMENDED_UPDATE"));

    const retry = document.getElementById("xsup-auditor-retry-knowledge");
    if (retry) retry.onclick = () => {
      job.knowledgeStatus = "not_evaluated";
      job.knowledgeError = "";
      job.knowledgeAutoSaved = false;
      job.knowledgeAutoDeliveryAttempted = false;
      job.knowledgeArtifacts = [];
      queueKnowledgeArtifact(job, {force:true});
    };
  }

  function queueReviewerKcsChoice(job, choice) {
    if (!job || ["queued","generating"].includes(job.knowledgeStatus)) return;
    const readiness = normalizeDecision(job.artifactReadiness || job.validatedArtifactReadiness || "DRAFTABLE");
    const effectiveReadiness = ["READY","DRAFTABLE"].includes(readiness) ? readiness : "DRAFTABLE";
    const priorUpdate = (job.knowledgeArtifacts || []).find(x => x.type === "KCS_UPDATE" && x.status === "completed");
    const existingFromProposal = priorUpdate?.answer ? extractKnowledgeSection(priorUpdate.answer, ["Existing Knowledge Reference"]) : "";
    if (!cleanText(job.existingKcsCandidate || "") && cleanText(existingFromProposal)) job.existingKcsCandidate = cleanText(existingFromProposal);

    job.forceKnowledgeRefresh = true;
    job.knowledgeError = "";
    job.knowledgeAutoSaved = false;
    job.knowledgeStatus = "queued";
    job.knowledgeArtifacts = [];
    job.knowledgeArtifactType = "KCS_DRAFT";
    job.knowledgeArtifactRequests = [{role:"primary", action:"CREATE KCS", type:"KCS_DRAFT", readiness:effectiveReadiness}];

    if (choice === "CREATE_NEW_ANYWAY") {
      job.forceCreateNewKcs = true;
      job.existingKcsReviewerOverride = true;
      job.existingKcsRecommendedAction = "UPDATE EXISTING KCS";
      job.knowledgeAction = "CREATE KCS";
      job.existingKcsRecommendationSummary = "Substantial existing Salesforce KCS overlap was identified. Update remains the default recommendation; the reviewer explicitly chose to create a separate new KCS and keep the existing KCS referenced.";
      job.knowledgeDecisionExplanation = job.existingKcsRecommendationSummary;
      job.knowledgeProgress = "reviewer chose separate new KCS · queued";
    } else {
      job.forceCreateNewKcs = false;
      job.existingKcsReviewerOverride = false;
      job.knowledgeAction = "CREATE KCS";
      job.existingKcsRecommendedAction = "UPDATE EXISTING KCS";
      job.existingKcsRecommendationSummary = "Returning to the default content-comparison path. If substantial overlap is confirmed, the result will be an Existing KCS Update Proposal.";
      job.knowledgeDecisionExplanation = job.existingKcsRecommendationSummary;
      job.knowledgeProgress = "recommended existing-KCS comparison · queued";
    }

    ensureBatchRuntime();
    if (!state.knowledgeQueue.includes(job.xsup)) state.knowledgeQueue.push(job.xsup);
    renderJobList();
    renderDashboard();
    if (job.xsup === state.selectedXsup) renderSelectedJob();
    pumpKnowledgeQueue();
  }

  function renderSelectedJob() {
    const job = getSelectedJob();
    syncSelectedState(job);

    const dashboard = document.getElementById("xsup-auditor-dashboard");
    const empty = document.getElementById("xsup-auditor-detail-empty");
    const detail = document.getElementById("xsup-auditor-detail-content");

    if (state.viewMode === "dashboard") {
      if (dashboard) dashboard.style.display = "block";
      if (empty) empty.style.display = "none";
      if (detail) detail.style.display = "none";
      renderDashboard();
      return;
    }

    if (dashboard) dashboard.style.display = "none";

    if (!job) {
      if (empty) empty.style.display = "block";
      if (detail) detail.style.display = "none";
      return;
    }

    if (empty) empty.style.display = "none";
    if (detail) detail.style.display = "block";

    const title = document.getElementById("xsup-auditor-selected-title");
    if (title) {
      const suffix = job.caseNumber ? ` · SFDC ${job.caseNumber}` : "";
      title.textContent = `${job.xsup}${suffix}${job.productKey ? ` · ${productLabel(job)}` : ""}`;
    }

    showReport(sanitizeGeneratedText(job.auditAnswer || (job.error ? `## Audit Error\n\n**${job.error}**` : "")));
    const commentOut = document.getElementById("xsup-auditor-xsup-comment");
    if (commentOut) commentOut.value = job.xsupComment || "";

    renderTargetLinks();
    renderProductControl(job);
    renderSelectedProgress(job);
    renderReuseSummary(job);
    renderExecutionPipeline(job);
    renderDecisionSummary(job);
    renderKnowledgeArtifact(job);
    renderStorageStatus();
    renderSFDCDetails(job);
    renderReferences(job.references || []);

    const retryBtn = document.getElementById("xsup-auditor-retry-chat");
    if (retryBtn) {
      const currentTacoReady = Boolean(job.caseNumber && job.investigationId && job.report && job.evidence && reportReady(job.report));
      retryBtn.disabled = job.status === "running" || job.knowledgeStatus === "generating" || !currentTacoReady;
      retryBtn.textContent = job.auditAnswer ? "Regenerate Audit" : "Retry Audit";
    }

    const debugBtn = document.getElementById("xsup-auditor-debug");
    if (debugBtn) debugBtn.disabled = !(job.evidence && job.report);

    const downloadBtn = document.getElementById("xsup-auditor-download-selected");
    if (downloadBtn) downloadBtn.disabled = !job.auditAnswer;
  }

  function selectJob(xsup) {
    const job = state.jobs.get(xsup);
    if (!job) return;
    state.viewMode = "detail";
    state.selectedXsup = xsup;
    renderJobList();
    renderSelectedJob();
  }

  function actualXsup(jobOrValue) {
    const value = typeof jobOrValue === "string" ? jobOrValue : jobOrValue?.xsup;
    return /^XSUP-\d+$/i.test(String(value || "")) ? String(value).toUpperCase() : "";
  }

  function jobDisplayKey(job) {
    return actualXsup(job) || (job?.caseNumber ? `SFDC ${job.caseNumber}` : String(job?.xsup || "Case"));
  }

  function jiraVerifyTarget(job) {
    return actualXsup(job) || `the linked Jira XSUP for SFDC ${job?.caseNumber || "this case"}`;
  }

  function discoverLinkedXsup(evidence) {
    const text = [
      evidence?.case_summary_text || "",
      evidence?.links?.jira || "",
      ...(evidence?.records || []).slice(0, 100).map(r => r.original_text || "")
    ].join("\n");
    return text.match(/\bXSUP-\d+\b/i)?.[0]?.toUpperCase() || "";
  }

  function adoptLinkedXsup(job, linked) {
    linked = String(linked || "").toUpperCase();
    if (!job || !/^XSUP-\d+$/.test(linked) || actualXsup(job) === linked) return;
    const oldKey = job.xsup;
    job.sourceXsup = job.sourceXsup || "";
    job.linkedXsup = linked;
    job.xsup = linked;
    job.targetLinks = {...(job.targetLinks || {}), jira:`https://jira-dc.paloaltonetworks.com/browse/${linked}`};
    if (state.jobs.get(oldKey) === job) {
      state.jobs.delete(oldKey);
      state.jobs.set(linked, job);
    }
    if (state.selectedXsup === oldKey) state.selectedXsup = linked;
  }

  function createJob(xsup, options = {}) {
    return {
      xsup,
      sourceXsup: options.sourceXsup || actualXsup(xsup),
      sourceSfdc: options.sourceSfdc || "",
      linkedXsup: actualXsup(xsup),
      status: "queued",
      stageLabel: "Queued",
      steps: {
        resolve: "Waiting",
        taco: "Waiting",
        evidence: "Waiting",
        audit: "Waiting"
      },
      caseNumber: "",
      sfdcCandidates: [],
      productKey: "",
      productConfidence: "",
      productSelectionSource: "",
      productDetectionReason: "",
      productDetectionScores: null,
      productSuggestedKey: "",
      productLocked: false,
      retrospectiveEligibility: "",
      auditReportedProduct: "",
      selectedCandidate: null,
      investigationId: null,
      report: null,
      evidence: null,
      selectedEvidence: null,
      auditAnswer: "",
      xsupComment: "",
      references: [],
      targetLinks: {
        jira: /^XSUP-\d+$/i.test(String(xsup || "")) ? `https://jira-dc.paloaltonetworks.com/browse/${xsup}` : "",
        sfdc: "",
        tacopilot: ""
      },
      lastPrompt: "",
      verdict: "",

      // Review-decision fields
      resolutionChangeNeeded: "",
      rcaChangeNeeded: "",
      fixTypeChangeNeeded: "",
      labelChangeNeeded: "",

      // Knowledge decision/artifact fields
      reviewedFields: "",
      resolutionExplanation: "",
      resolutionRecommendedValue: "",
      resolutionCurrentValue: "",
      resolutionTechnicalAssessment: "",
      resolutionWhy: "",
      resolutionSupportAction: "",
      rcaVerdict: "",
      rcaExplanation: "",
      rcaRecommendedValue: "",
      rcaCurrentValue: "",
      rcaTechnicalAssessment: "",
      rcaWhy: "",
      rcaSupportAction: "",
      fixTypeVerdict: "",
      fixTypeExplanation: "",
      fixTypeRecommendedValue: "",
      fixTypeCurrentValue: "",
      fixTypeTechnicalAssessment: "",
      fixTypeWhy: "",
      fixTypeSupportAction: "",
      labelVerdict: "",
      labelExplanation: "",
      labelRecommendedValue: "",
      labelCurrentValue: "",
      labelTechnicalAssessment: "",
      labelWhy: "",
      labelSupportAction: "",
      technicalEvidence: "",
      engineeringConfirmation: "",
      importantTechnicalCaveat: "",
      immediateOperationalGuidance: "",

      knowledgeAction: "",
      secondaryKnowledgeAction: "",
      artifactReadiness: "",
      artifactTypeFromAudit: "",
      knowledgeDecisionExplanation: "",
      autoGenerateKnowledgeDecision: "",
      knowledgeStatus: "not_evaluated",
      knowledgeProgress: "",
      knowledgeLastHeartbeatAt: null,
      knowledgePrompt: "",
      knowledgeAnswer: "",
      knowledgeRawAnswer: "",
      knowledgeDraftAnswer: "",
      knowledgeDraftFollowupId: null,
      knowledgeDraftCompletedAt: null,
      knowledgeDraftReuseStatus: "not_checked",
      knowledgeQualityStatus: "",
      knowledgeQualitySummary: "",
      knowledgeQualityValidationItems: "",
      specialReviewItems: [],
      publicationReviewStatus: "",
      validatedArtifactReadiness: "",
      knowledgeArtifactType: "",
      knowledgeArtifactRequests: [],
      knowledgeArtifacts: [],
      knowledgeError: "",
      knowledgeStartedAt: null,
      knowledgeEndedAt: null,
      knowledgeAutoSaved: false,
      knowledgeAutoDeliveryAttempted: false,

      // Automatic TACO freshness decision
      tacoDecision: "",
      tacoDecisionReason: "",
      tacoAnalysisAt: null,
      latestCaseEvidenceAt: null,
      forceTacoRefresh: false,
      tacoRecoveryRetries: 0,

      // Cross-session Case Chat reuse state
      auditFingerprint: "",
      auditReuseStatus: "not_checked",
      auditReuseReason: "",
      auditFollowupId: null,
      auditCompletedAt: null,
      priorAuditFollowupId: null,
      priorAuditCompletedAt: null,
      priorAuditReason: "",
      forceAuditRefresh: false,

      knowledgeFingerprint: "",
      knowledgeReuseStatus: "not_checked",
      knowledgeReuseReason: "",
      knowledgeFollowupId: null,
      knowledgeCompletedAt: null,
      priorKnowledgeFollowupId: null,
      priorKnowledgeCompletedAt: null,
      priorKnowledgeReason: "",
      forceKnowledgeRefresh: false,
      forceCreateNewKcs: false,
      existingKcsRecommendedAction: "",
      existingKcsReviewerOverride: false,
      existingKcsRecommendationSummary: "",
      manualAuditOnly: false,
      directKnowledgeOnly: false,

      error: "",
      overallProgress: 0,
      tacoProgress: null,
      tacoNode: "",
      currentActivity: "Queued",
      lastHeartbeatAt: null,
      lastProgressChangeAt: null,
      startedAt: null,
      endedAt: null,
      autoSaved: false
    };
  }

  function parseInputJobs(raw) {
    const jobs=[];
    const seen=new Set();
    for(const line0 of String(raw||"").split(/\r?\n/)){
      const line=line0.trim(); if(!line) continue;
      const xsup=line.toUpperCase().match(/\bXSUP-\d+\b/)?.[0]||"";
      const sfdc=line.match(/\b0\d{7}\b/)?.[0]||"";
      if(!xsup && !sfdc) continue;
      const identity=xsup || `SFDC:${sfdc}`;
      if(seen.has(identity)) continue; seen.add(identity);
      jobs.push({xsup,sfdc});
    }
    return jobs;
  }

  async function addJobsFromInput(options = {}) {
    const input=document.getElementById("xsup-auditor-input");
    const specs=parseInputJobs(input?.value||"");
    if(!specs.length){alert("Enter XSUP, SFDC, or a paired XSUP / SFDC job, for example:\nXSUP-12345\n04001234\nXSUP-12345 / 04001234");return [];}
    const added=[];
    for(const spec of specs){
      const key=spec.xsup || `SFDC-${spec.sfdc}`;
      const existing=state.jobs.get(key); if(existing&&["queued","running","needs_selection","needs_sfdc","needs_product"].includes(existing.status)) continue;
      const job=createJob(key,{sourceXsup:spec.xsup,sourceSfdc:spec.sfdc});
      if(spec.sfdc){
        job.caseNumber=spec.sfdc;
        job.selectedCandidate={case_number:spec.sfdc,xsup:spec.xsup||"",text:"SFDC supplied directly by reviewer",details:spec.xsup?"Paired XSUP/SFDC supplied directly":"SFDC-only input; linked XSUP will be discovered from TACopilot evidence if possible",sfdc_url:""};
        job.targetLinks={jira:spec.xsup?`https://jira-dc.paloaltonetworks.com/browse/${spec.xsup}`:"",sfdc:"",tacopilot:`${location.origin}/taco/case/${spec.sfdc}`};
        job.steps.resolve=`Provided SFDC ${spec.sfdc}${spec.xsup?"":" · linked XSUP discovery pending"}`;
      }
      job.directKnowledgeOnly=Boolean(options.directKnowledgeOnly);
      state.jobs.set(key,job);state.queue.push(key);added.push(job);
    }
    if(input) input.value="";
    state.viewMode="dashboard";state.selectedXsup="";renderJobList();renderDashboard();renderSelectedJob();
    return added;
  }

  function ensureBatchRuntime() {
    if (!state.running) {
      state.running = true;
      state.stopped = false;
      state.controller = new AbortController();
      state.batchRunId = Number(state.batchRunId || 0) + 1;
      startElapsedTimer();
    }
  }

  // ---------------------------------------------------------------------------
  // Per-XSUP audit worker
  // resolve -> collect source evidence -> smart TACO freshness -> Case Chat audit
  // -> auto-save report -> enqueue optional knowledge artifact.
  // ---------------------------------------------------------------------------
  async function processJob(job) {
    job.status = "running";
    job.startedAt = Date.now();
    job.lastHeartbeatAt = job.startedAt;
    job.lastProgressChangeAt = job.startedAt;
    job.currentActivity = "Starting audit";
    job.overallProgress = Math.max(1, Number(job.overallProgress || 0));
    job.error = "";
    renderJobList();
    updateBatchStatus();

    try {
      let selected = null;
      if (!job.manualAuditOnly) {
      if (!job.caseNumber) {
        setJobStep(job, "resolve", "Resolving linked SFDC cases...", "Resolve SFDC");
        let candidates = [];
        try { candidates = await resolveXSUPCandidates(job.xsup); }
        catch (resolveErr) {
          job.status = "needs_sfdc";
          job.stageLabel = "Enter SFDC";
          job.steps.resolve = "Automatic SFDC lookup unavailable";
          job.error = resolveErr?.message || String(resolveErr);
          job.currentActivity = "Automatic SFDC mapping unavailable · click Enter SFDC";
          renderJobList(); renderDashboard(); if (state.selectedXsup === job.xsup) renderSelectedJob();
          showToast(`${job.xsup}: automatic SFDC lookup unavailable — enter SFDC to continue`, "error");
          return;
        }
        job.sfdcCandidates = candidates;

        if (!candidates.length) {
          job.status = "needs_sfdc";
          job.stageLabel = "Enter SFDC";
          job.steps.resolve = "No automatic SFDC match found";
          job.overallProgress = Math.max(5, Number(job.overallProgress || 0));
          job.currentActivity = "No automatic SFDC match found · click Enter SFDC";
          job.lastHeartbeatAt = Date.now();
          job.lastProgressChangeAt = Date.now();
          job.error = "";
          renderJobList(); renderDashboard(); if (state.selectedXsup === job.xsup) renderSelectedJob();
          showToast(`${job.xsup}: no automatic SFDC match found — enter SFDC to continue`, "ok");
          return;
        }

        if (candidates.length > 1) {
          job.status = "needs_selection";
          job.stageLabel = "Choose SFDC";
          job.steps.resolve = `Choose 1 of ${candidates.length} SFDC cases`;
          job.overallProgress = Math.max(5, Number(job.overallProgress || 0));
          job.currentActivity = `Choose SFDC · ${candidates.length} matches`;
          job.lastHeartbeatAt = Date.now();
          job.lastProgressChangeAt = Date.now();
          renderJobList();
          renderDashboard();

          if (state.viewMode === "detail" && state.selectedXsup === job.xsup) {
            renderSelectedJob();
          }

          showToast(`${job.xsup}: choose which SFDC case to analyze`, "ok");
          setTimeout(showNextSFDCChooser, 80);
          return;
        }

        const mapping = candidates[0];
        job.caseNumber = mapping.case_number;
        job.selectedCandidate = mapping;
        job.targetLinks = {
          jira: `https://jira-dc.paloaltonetworks.com/browse/${job.xsup}`,
          sfdc: mapping.sfdc_url || "",
          tacopilot: `${location.origin}/taco/case/${job.caseNumber}`
        };
      }

      // Collect original case evidence FIRST so TACO freshness can be determined
      // from actual Jira/SFDC activity rather than age alone.
      setJobStep(job, "resolve", `✓ ${job.caseNumber} · checking case activity`, "TACO freshness");
      job.evidence = await collectCaseEvidence(job.caseNumber, actualXsup(job));
      if (!actualXsup(job)) {
        const linked = discoverLinkedXsup(job.evidence);
        if (linked) adoptLinkedXsup(job, linked);
      }
      job.latestCaseEvidenceAt =
        job.evidence?.latest_evidence_timestamp_ms ??
        latestEvidenceTimestamp(job.evidence);

      job.targetLinks = {
        ...job.targetLinks,
        ...(job.evidence.links || {}),
        sfdc: job.evidence?.links?.sfdc || job.selectedCandidate?.sfdc_url || job.targetLinks?.sfdc || ""
      };
      if (job.xsup === state.selectedXsup) renderSelectedJob();

      const invs = await getInvestigations(job.caseNumber);
      const latest = latestInvestigation(invs);

      if (!job.productKey || job.productSelectionSource !== "manual") {
        const detected = detectProduct({
          evidence: job.evidence,
          candidate: job.selectedCandidate,
          latestInvestigation: latest
        });
        job.productSuggestedKey = detected.key || "";
        job.productDetectionScores = detected.scores;
        job.productDetectionReason = detected.reason;

        if (!job.productKey || job.productSelectionSource !== "manual") {
          job.productKey = detected.key || "";
          job.productConfidence = detected.confidence || "LOW";
          job.productSelectionSource = detected.key ? "auto" : "";
        }

        const requireConfirmation =
          state.productSelectionMode === "manual" ||
          !detected.key ||
          detected.ambiguous ||
          detected.confidence !== "HIGH";

        if (requireConfirmation && job.productSelectionSource !== "manual") {
          job.status = "needs_product";
          job.stageLabel = "Choose Product";
          job.steps.resolve = `✓ ${job.caseNumber} · product confirmation required`;
          job.overallProgress = Math.max(8, Number(job.overallProgress || 0));
          job.currentActivity = detected.key
            ? `Confirm product · suggested ${productLabel(detected.key)}`
            : "Choose product · automatic detection inconclusive";
          job.lastHeartbeatAt = Date.now();
          job.lastProgressChangeAt = Date.now();
          renderJobList();
          renderDashboard();
          if (job.xsup === state.selectedXsup) renderSelectedJob();
          showToast(`${job.xsup}: confirm product before the retrospective starts`, "ok");
          setTimeout(showNextProductChooser, 80);
          return;
        }
      }

      if (!getProductProfile(job.productKey)) {
        throw new Error("Product could not be determined. Select XDR/XSIAM, XSOAR, or Cortex Cloud.");
      }

      if (!latest) {
        job.tacoDecision = "STARTED NEW";
        job.tacoDecisionReason = "No existing TACO investigation was found.";
        setJobStep(job, "taco", "Starting new TACO Analysis...", "TACO Analysis");
        const tacoStartTriggeredAt = Date.now();
        const startResponse = await startAnalysis(job.caseNumber);
        job.investigationId = investigationIdFromMutationResponse(startResponse) || await waitForInvestigationId(
          job.caseNumber,
          value => setJobStep(job, "taco", value, "TACO Analysis", {phase:"taco", heartbeat:true, activity:value})
        );
        const startedProgress = await waitForAnalysis(
          job.caseNumber,
          job.investigationId,
          {triggerStartedAt:tacoStartTriggeredAt, baselineInvestigationId:job.investigationId},
          (value, meta) => setJobStep(job, "taco", value, "TACO Analysis", meta)
        );
        job.investigationId = startedProgress?._investigationId || job.investigationId;
        job.report = await waitForReportReady(
          job.caseNumber,
          job.investigationId,
          (value, meta) => setJobStep(job, "taco", value, "TACO Analysis", meta)
        );
        job.tacoAnalysisAt = timestampFromObject(job.report) || Date.now();
      } else {
        job.investigationId = latest.id || latest.investigation_id;

        let existingProgress = {};
        let existingReport = {};
        try { existingProgress = await getProgress(job.caseNumber, job.investigationId); } catch (_) {}
        try { existingReport = await getReport(job.caseNumber, job.investigationId); } catch (_) {}

        const freshness = determineTacoFreshness({
          latest,
          progress: existingProgress,
          report: existingReport,
          evidenceTimestamp: job.latestCaseEvidenceAt,
          forceRefresh: Boolean(job.forceTacoRefresh)
        });

        job.tacoDecision = freshness.action.toUpperCase();
        job.tacoDecisionReason = job.forceTacoRefresh && Number(job.tacoRecoveryRetries || 0) > 0
          ? `Automatic TACO recovery retry ${job.tacoRecoveryRetries}/${TACO_RECOVERY_RETRY_LIMIT}; forcing a fresh analysis before Audit/Knowledge.`
          : freshness.reason;
        job.tacoAnalysisAt = freshness.tacoTimestamp;

        if (freshness.action === "wait") {
          setJobStep(
            job,
            "taco",
            `Waiting for existing TACO Analysis #${job.investigationId}...`,
            "TACO Analysis"
          );

          const waitingBaselineReportCount = getReportCount(existingProgress);
          const waitingBaselineReportMarker = reportMarker(existingReport);
          const waitedProgress = await waitForAnalysis(
            job.caseNumber,
            job.investigationId,
            {
              requireFresh: Boolean(waitingBaselineReportMarker),
              requireReportRevision: Boolean(waitingBaselineReportMarker),
              baselineReportCount: waitingBaselineReportCount,
              baselineReportMarker: waitingBaselineReportMarker,
              baselineInvestigationId: job.investigationId
            },
            (value, meta) => setJobStep(job, "taco", value, "TACO Analysis", meta)
          );
          job.investigationId = waitedProgress?._investigationId || job.investigationId;

          job.report = await waitForReportReady(
            job.caseNumber,
            job.investigationId,
            (value, meta) => setJobStep(job, "taco", value, "TACO Analysis", meta)
          );
          job.tacoAnalysisAt = timestampFromObject(job.report, waitedProgress, latest) || Date.now();
          job.tacoDecision = "REUSED";
          job.tacoDecisionReason = "Waited for the already-running TACO investigation to complete, then reused its final report. No additional TACO analysis was started.";
        } else if (freshness.action === "reuse") {
          job.report = existingReport;
          setJobStep(
            job,
            "taco",
            `♻ Reused TACO #${job.investigationId}`,
            "TACO reused",
            {
              tacoProgress: 100,
              tacoNode: "",
              activity: "TACO reused · no newer Jira/SFDC evidence"
            }
          );
        } else {
          const baselineReportCount = getReportCount(existingProgress);
          const baselineReportMarker = reportMarker(existingReport);

          setJobStep(
            job,
            "taco",
            `Refreshing TACO Analysis #${job.investigationId}...`,
            "TACO Analysis"
          );

          const refreshTriggeredAt = Date.now();
          const updateResponse = await updateAnalysis(job.caseNumber, job.investigationId);
          const responseInvestigationId = investigationIdFromMutationResponse(updateResponse);
          if (responseInvestigationId) job.investigationId = responseInvestigationId;

          const refreshedProgress = await waitForAnalysis(
            job.caseNumber,
            job.investigationId,
            {
              requireFresh: true,
              requireReportRevision: Boolean(baselineReportMarker),
              baselineReportCount,
              baselineReportMarker,
              triggerStartedAt: refreshTriggeredAt,
              baselineInvestigationId: latest.id || latest.investigation_id || job.investigationId
            },
            (value, meta) => setJobStep(job, "taco", value, "TACO Analysis", meta)
          );
          job.investigationId = refreshedProgress?._investigationId || job.investigationId;

          job.report = await waitForReportReady(
            job.caseNumber,
            job.investigationId,
            (value, meta) => setJobStep(job, "taco", value, "TACO Analysis", meta)
          );
          job.tacoAnalysisAt = timestampFromObject(job.report) || Date.now();
          job.tacoDecision = Number(job.tacoRecoveryRetries || 0) > 0
            ? "RECOVERY REFRESH"
            : job.forceTacoRefresh ? "FORCED REFRESH" : "AUTO REFRESH";
        }
      }

      job.forceTacoRefresh = false;

      if (!reportReady(job.report)) {
        throw new Error("Current TACO Analysis did not contain a final synthesized conclusion.");
      }

      const citationCount =
        job.report?.result?.citations?.length ??
        job.report?.citations?.length ??
        0;
      const hypothesisCount = job.report?.hypotheses?.length ?? 0;

      setJobStep(
        job,
        "taco",
        `${job.tacoDecision.includes("REUSE") || job.tacoDecision === "REUSE" ? "♻" : "✓"} ${job.tacoDecision} #${job.investigationId} · Hyp ${hypothesisCount} · Cit ${citationCount}`,
        "Original evidence",
        {
          tacoProgress: 100,
          activity: `${job.tacoDecision} · ${job.tacoDecisionReason}`
        }
      );

      // Evidence was already collected before the freshness decision.
      setJobStep(job, "evidence", "Preparing full case history...", "Original evidence");
      const c = job.evidence.counts;
      const total =
        (c.JIRA_COMMENT || 0) +
        (c.SFDC_INTERNAL || 0) +
        (c.SFDC_TAC_PUBLIC || 0) +
        (c.SFDC_CUSTOMER_PUBLIC || 0);

      selected = selectEvidence(job.evidence, job.report);
      job.selectedEvidence = selected;

      const selectedCount =
        selected.jira.length +
        selected.internal.length +
        selected.tac_public.length +
        selected.customer_public.length;

      setJobStep(
        job,
        "evidence",
        `✓ ${total} records · ${selectedCount} focused for Case Chat`,
        "Case Chat"
      );
      } else {
        if (!job.caseNumber || !job.investigationId || !job.report || !job.evidence || !reportReady(job.report)) {
          throw new Error("Audit-only retry requires the retained completed TACO snapshot and evidence.");
        }
        if (!getProductProfile(job.productKey)) {
          throw new Error("Audit-only retry requires the previously selected product profile.");
        }
        selected = selectEvidence(job.evidence, job.report);
        job.selectedEvidence = selected;
        setJobStep(job, "resolve", `♻ Retained SFDC ${job.caseNumber}`, "Audit-only recovery");
        setJobStep(job, "taco", `♻ Retained TACO #${job.investigationId} · no freshness/re-analysis request`, "Audit-only recovery", {tacoProgress:100, activity:"Retained TACO snapshot · audit-only retry"});
        setJobStep(job, "evidence", `♻ Retained Jira/SFDC evidence · ${selected.jira.length + selected.internal.length + selected.tac_public.length + selected.customer_public.length} focused records`, "Audit-only recovery");
      }

      job.productLocked = true;
      if (job.xsup === state.selectedXsup) renderProductControl(job);

      if (job.directKnowledgeOnly) {
        prepareDirectKcsFromCurrentTaco(job);
        job.auditReuseReason = "Direct Generate KCS skips retrospective Support-owned field review and secondary artifact selection by design; existing KCS content is compared to recommend CREATE vs UPDATE, while the reviewer retains the option to create a separate new KCS with the existing article referenced.";
        job.reviewedFields = "Not reviewed — Direct KCS";
        job.status = "completed";
        job.stageLabel = "KCS queued";
        job.endedAt = Date.now();
        job.overallProgress = 100;
        job.steps.audit = "Skipped — Direct KCS";
        job.currentActivity = "Direct KCS · retrospective field review skipped";
        queueKnowledgeArtifact(job);
        if (job.xsup === state.selectedXsup) renderSelectedJob();
        showToast(`✓ ${job.xsup} direct KCS queued`, "ok");
        return;
      }

      const basePrompt = buildAuditPrompt({
        job,
        report: job.report,
        selected,
        evidence: job.evidence
      });

      const auditMeta = buildAuditReuseMeta(job, selected);
      job.auditFingerprint = auditMeta.fingerprint;
      const prompt = appendReuseMarker(basePrompt, auditMeta);
      job.lastPrompt = prompt;

      job.auditReuseStatus = "checking";
      job.auditReuseReason = "Checking Case Chat history against current TACO, full Jira/SFDC evidence and audit method.";
      if (job.xsup === state.selectedXsup) renderSelectedJob();
      setJobStep(job, "audit", "Checking for reusable Audit Case Chat...", "Case Chat reuse");

      const reuse = await tryReuseCaseChat({
        job,
        type: "audit",
        currentMeta: auditMeta,
        legacyQuestion: basePrompt,
        force: Boolean(job.forceAuditRefresh),
        onProgress: value => setJobStep(job, "audit", value, "Case Chat reuse")
      });

      let rawAuditAnswer = "";
      if (reuse.reused) {
        rawAuditAnswer = reuse.answer;
        job.auditReuseStatus = "reused";
        job.auditReuseReason = reuse.reason;
        job.auditFollowupId = reuse.followupId;
        job.priorAuditFollowupId = null;
        job.priorAuditCompletedAt = null;
        job.priorAuditReason = "";
        job.auditCompletedAt = reuse.completedAt || Date.now();
        setJobStep(job, "audit", `♻ Reused Audit Case Chat #${job.auditFollowupId}`, "Audit reused", {
          activity: `Audit reused · ${job.auditReuseReason}`
        });
      } else {
        job.priorAuditFollowupId = reuse.previousFollowupId || null;
        job.priorAuditCompletedAt = reuse.previousCompletedAt || null;
        job.priorAuditReason = reuse.previousFollowupId ? "Not reused because current inputs could not be proven identical/current." : "";
        job.auditReuseReason = reuse.reason;
        setJobStep(job, "audit", `Generating fresh Audit Case Chat · ${reuse.reason}`, "Case Chat");

        const generated = await runCaseChatPrompt(
          job.caseNumber,
          job.investigationId,
          prompt,
          (value, meta) => setJobStep(job, "audit", value, "Case Chat", meta),
          "Audit Case Chat"
        );
        job.auditFollowupId = generated.followupId;
        rawAuditAnswer = generated.answer;

        job.auditReuseStatus = job.forceAuditRefresh ? "regenerated" : "generated";
        job.auditReuseReason = job.forceAuditRefresh
          ? "Manual audit rerun requested; a new Case Chat result was generated."
          : reuse.reason;
        job.auditCompletedAt = Date.now();
      }

      job.forceAuditRefresh = false;
      let auditValidation = job.auditReuseStatus === "reused"
        ? validateSourceCurrentAuditAnswer(rawAuditAnswer, job)
        : validateReusableAuditAnswer(rawAuditAnswer, job);
      if (!auditValidation.valid && job.auditReuseStatus !== "reused") {
        setJobStep(job, "audit", `Audit structure invalid (${auditValidation.reason}) · controlled retry 1/1`, "Case Chat retry");
        const retryPrompt = `${prompt}\n\nCONTROLLED RETRY REQUIREMENT: The previous response failed structural validation (${auditValidation.reason}). Regenerate the complete retrospective from scratch. Do not omit required fields. Close every Markdown code fence and include the full content of any code/query block.`;
        const retried = await runCaseChatPrompt(
          job.caseNumber,
          job.investigationId,
          retryPrompt,
          (value, meta) => setJobStep(job, "audit", value, "Case Chat retry", meta),
          "Audit Case Chat retry"
        );
        job.auditFollowupId = retried.followupId;
        rawAuditAnswer = retried.answer;
        job.auditReuseStatus = "regenerated";
        job.auditReuseReason = "Initial fresh Audit response failed structural validation; controlled fresh retry completed.";
        job.auditCompletedAt = Date.now();
        auditValidation = validateReusableAuditAnswer(rawAuditAnswer, job);
      }
      if (!auditValidation.valid) {
        throw new Error(`Retrospective Case Chat returned an invalid structure after controlled validation: ${auditValidation.reason}. TACO analysis and evidence were retained; use Retry Audit.`);
      }
      applyAuditResult(job, rawAuditAnswer);
      // Older Auditor Case Chats often contain stronger retrospective context
      // (what TAC had already done, prior-answer matches, and why Engineering
      // was actually needed). Reuse that read-only history as a supplement
      // instead of paying for another Audit just to improve presentation.
      await enrichRetrospectiveFromPriorAudits(job);

      const completedVerdict = primaryReviewVerdict(job) || job.retrospectiveEligibility || "Complete";
      job.stageLabel = "Audit complete · downloading";
      job.overallProgress = Math.max(98, Number(job.overallProgress || 0));
      setJobStep(job, "audit", "✓ Completed · downloading Audit before Knowledge", completedVerdict, {
        activity: `Audit complete · ${completedVerdict}${state.autoSaveCompleted ? " · downloading report before Knowledge" : " · auto-download disabled"}`
      });

      if (job.xsup === state.selectedXsup) renderSelectedJob();
      renderDashboard();

      // HARD AUDIT-FIRST BARRIER: when auto-save is enabled, initiate/complete the
      // Audit artifact save BEFORE any Knowledge request is queued or any Knowledge
      // Case Chat can start. Folder mode awaits the confirmed write; Browser
      // Downloads awaits the direct downloadBlob/browserDownload initiation.
      if (state.autoSaveCompleted) {
        try {
          await maybeAutoSaveJob(job);
        } catch (saveErr) {
          console.warn(`XSUP Auditor ${job.xsup}: Audit auto-download failed; continuing with the validated Audit verdict.`, saveErr);
          showToast(`⚠ ${job.xsup} audit auto-download failed · use Download Audit`, "error");
        }
      }

      // Only after the Audit save barrier may its validated knowledge verdict drive
      // downstream generation. No hidden companion artifact is added here.
      if (!job.manualAuditOnly) {
        queueKnowledgeArtifact(job, {silent:true, deferPump:true});
      } else if (job.knowledgeAnswer || job.knowledgeFollowupId) {
        job.knowledgeStatus = "outdated";
        job.knowledgeReuseStatus = "outdated";
        job.knowledgeReuseReason = "Audit was regenerated independently. Existing knowledge was not automatically regenerated; use Regenerate Knowledge if a new artifact is required.";
      } else {
        job.knowledgeStatus = "not_evaluated";
        job.knowledgeReuseStatus = "not_checked";
        job.knowledgeReuseReason = "Audit was regenerated independently. Knowledge was not generated automatically.";
      }

      job.status = "completed";
      job.stageLabel = primaryReviewVerdict(job) || job.retrospectiveEligibility || "Complete";
      job.endedAt = Date.now();
      job.overallProgress = 100;

      if (job.xsup === state.selectedXsup) renderSelectedJob();
      renderDashboard();

      if (job.manualAuditOnly) {
        job.manualAuditOnly = false;
      } else {
        pumpKnowledgeQueue();
      }

      const postAuditUi = overallUiState(job);
      showToast(
        postAuditUi === "waiting" || postAuditUi === "active"
          ? `✓ ${job.xsup} audit complete · ${activityForJob(job)}`
          : `✓ ${job.xsup} complete${primaryReviewVerdict(job) ? ` · ${primaryReviewVerdict(job)}` : job.retrospectiveEligibility ? ` · ${job.retrospectiveEligibility}` : ""}`,
        "ok"
      );

      const bubble = document.getElementById("xsup-auditor-bubble");
      if (bubble && state.minimized) {
        bubble.classList.add("xa-pulse");
        setTimeout(() => bubble.classList.remove("xa-pulse"), 2200);
      }

    } catch (err) {
      if (err?.name === "AbortError" || state.stopped) {
        job.status = "stopped";
        job.stageLabel = "Stopped";
        job.currentActivity = "Stopped by user";
        job.lastHeartbeatAt = Date.now();
        job.error = "Stopped by user.";
      } else {
        console.error(`XSUP Auditor ${job.xsup} error:`, err);
        const errorMessage = err?.message || String(err);
        const confirmedTacoFailure = /^TACO Analysis failed after terminal-state confirmation:/i.test(errorMessage);

        // One controlled TACO recovery retry. Requeue the SAME XSUP with a forced
        // refresh while preserving SFDC/product context. Audit/Knowledge stay fully
        // blocked until that retry reaches a usable completed synthesized report.
        if (confirmedTacoFailure && Number(job.tacoRecoveryRetries || 0) < TACO_RECOVERY_RETRY_LIMIT) {
          job.tacoRecoveryRetries = Number(job.tacoRecoveryRetries || 0) + 1;
          job.forceTacoRefresh = true;
          job.status = "queued";
          job.stageLabel = "Retrying TACO";
          job.error = "";
          job.endedAt = null;
          job.tacoDecision = "RECOVERY RETRY";
          job.tacoDecisionReason = `TACO reached a confirmed terminal failure. Automatic recovery retry ${job.tacoRecoveryRetries}/${TACO_RECOVERY_RETRY_LIMIT} is queued; Audit/Knowledge remain blocked.`;
          job.steps.taco = `↻ TACO failed · automatic recovery retry ${job.tacoRecoveryRetries}/${TACO_RECOVERY_RETRY_LIMIT} queued`;
          job.steps.evidence = "Waiting for recovered TACO";
          job.steps.audit = "Waiting for recovered TACO";
          job.currentActivity = `TACO failed · automatic recovery retry ${job.tacoRecoveryRetries}/${TACO_RECOVERY_RETRY_LIMIT}`;
          job.lastHeartbeatAt = Date.now();
          job.lastProgressChangeAt = Date.now();
          if (!state.queue.includes(job.xsup)) state.queue.unshift(job.xsup);
          showToast(`↻ ${job.xsup} TACO failed · automatic recovery retry ${job.tacoRecoveryRetries}/${TACO_RECOVERY_RETRY_LIMIT}`, "warn");
          if (job.xsup === state.selectedXsup) renderSelectedJob();
          return;
        }

        job.status = "failed";
        job.stageLabel = "Failed";
        job.error = errorMessage;
        if (confirmedTacoFailure) {
          job.tacoDecision = "FAILED";
          job.tacoDecisionReason = `${job.error} · automatic TACO recovery retry exhausted (${job.tacoRecoveryRetries || 0}/${TACO_RECOVERY_RETRY_LIMIT}).`;
          job.steps.taco = `✕ ${job.tacoDecisionReason}`;
        }
        if (err?.xaTaskRejectedBeforeFollowup || /task was rejected before a Case Chat was created/i.test(job.error)) {
          job.auditReuseStatus = "failed";
          job.auditReuseReason = "TACopilot rejected the follow-up task before creating a Case Chat. The completed TACO report and collected evidence are retained for Retry Audit.";
          job.auditFollowupId = null;
        } else if (err?.xaSubmissionNotAccepted || /submission failed; no Case Chat was confirmed as created/i.test(job.error)) {
          job.auditReuseStatus = "failed";
          job.auditReuseReason = "The Audit submission was not confirmed as accepted. No Case Chat was created; the completed TACO report and collected evidence are retained for Retry Audit.";
          job.auditFollowupId = null;
        }
        job.currentActivity = `Failed · ${job.error}`;
        job.lastHeartbeatAt = Date.now();
        showToast(`⚠ ${job.xsup} failed · ${job.error.slice(0, 90)}`, "error");
      }

      job.endedAt = Date.now();
      if (job.xsup === state.selectedXsup) renderSelectedJob();

    } finally {
      state.activeCount = Math.max(0, state.activeCount - 1);
      renderJobList();
      updateBatchStatus();
      pumpQueue();
      pumpKnowledgeQueue();
    }
  }

  function auditRequiresKnowledgeArtifact(job) {
    if (!job) return false;
    if (job.directKnowledgeOnly) return true;
    if (job.manualAuditOnly || !state.autoGenerateKnowledge || !job.auditAnswer) return false;
    const actions = [job.knowledgeAction, job.secondaryKnowledgeAction].map(normalizeDecision).filter(Boolean);
    return actions.some(action => !["NONE", "NO KNOWLEDGE ACTION", "NOT APPLICABLE", "N/A", "UNDETERMINED"].includes(action));
  }

  function shouldGenerateKnowledge(job) {
    if (!job) return false;
    if (!job.directKnowledgeOnly && !state.autoGenerateKnowledge) return false;
    if (!job.directKnowledgeOnly && !job.auditAnswer) return false;
    // Primary and secondary knowledge recommendations are independent artifacts.
    // A completed Admin Guide must not silently satisfy a recommended KCS, and vice versa.
    return knowledgeArtifactRequests(job).length > 0;
  }

  function queueKnowledgeArtifact(job, options = {}) {
    if (options.force) job.forceKnowledgeRefresh = true;
    const requests = knowledgeArtifactRequests(job);
    const requiredByAudit = auditRequiresKnowledgeArtifact(job);
    if (requiredByAudit && !requests.length) {
      job.knowledgeStatus = "failed";
      job.knowledgeProgress = "required Audit-selected Knowledge artifact could not be routed";
      job.knowledgeError = `Audit selected ${cleanText(job.knowledgeAction || job.secondaryKnowledgeAction || "a Knowledge action")}, but no executable artifact request could be built from the validated routing fields.`;
      if (!options.silent) {
        renderJobList(); renderDashboard(); if (job.xsup === state.selectedXsup) renderSelectedJob();
        showToast(`⚠ ${job.xsup} required Knowledge routing failed`, "error");
      }
      return;
    }
    if (!shouldGenerateKnowledge(job)) {
      job.knowledgeStatus = requests.length ? "not_generated" : "not_required";
      if (!options.silent) {
        renderJobList();
        renderDashboard();
        if (job.xsup === state.selectedXsup) renderSelectedJob();
      }
      return;
    }

    if (["queued", "generating"].includes(job.knowledgeStatus)) return;
    if (job.knowledgeStatus === "completed" && !options.force) return;

    ensureBatchRuntime();
    job.batchRunId = state.batchRunId;
    job.knowledgeStatus = "queued";
    job.knowledgeArtifactRequests = requests;
    job.knowledgeArtifactType = requests[0]?.type || knowledgeArtifactType(job);
    job.knowledgeError = "";
    job.knowledgeAutoSaved = false;
    job.knowledgeAutoDeliveryAttempted = false;
    job.knowledgeDeliveryState = "";
    if (!state.knowledgeQueue.includes(job.xsup)) state.knowledgeQueue.push(job.xsup);

    if (!options.silent) {
      renderJobList();
      renderDashboard();
      if (job.xsup === state.selectedXsup) renderSelectedJob();
    }
    if (!options.deferPump) pumpKnowledgeQueue();
  }

  function knowledgeReviewSeverity(job) {
    const artifacts = Array.isArray(job?.knowledgeArtifacts) ? job.knowledgeArtifacts : [];
    const statuses = [job?.publicationReviewStatus, ...artifacts.map(x => x?.publicationReviewStatus)].map(x => normalizeDecision(x || ""));
    const items = [
      ...(Array.isArray(job?.specialReviewItems) ? job.specialReviewItems : []),
      ...artifacts.flatMap(x => Array.isArray(x?.specialReviewItems) ? x.specialReviewItems : [])
    ];
    if (statuses.includes("BLOCKER") || items.some(x => normalizeDecision(x?.status) === "BLOCKER")) return "BLOCKER";
    if (statuses.includes("REVIEW") || items.some(x => normalizeDecision(x?.status) === "REVIEW")) return "REVIEW";
    return "";
  }

  function knowledgeReviewItemCount(job) {
    const artifacts = Array.isArray(job?.knowledgeArtifacts) ? job.knowledgeArtifacts : [];
    const items = [
      ...(Array.isArray(job?.specialReviewItems) ? job.specialReviewItems : []),
      ...artifacts.flatMap(x => Array.isArray(x?.specialReviewItems) ? x.specialReviewItems : [])
    ];
    const seen = new Set(); let count = 0;
    for (const item of items) {
      const key = `${normalizeDecision(item?.status)}|${cleanText(item?.target || item?.what || "")}`;
      if (!seen.has(key)) { seen.add(key); count++; }
    }
    return count;
  }

  function knowledgeDisplayClass(job) {
    if (job?.knowledgeStatus === "completed") {
      const severity = knowledgeReviewSeverity(job);
      if (severity === "BLOCKER") return "blocker";
      if (severity === "REVIEW") return "review";
    }
    return job?.knowledgeStatus || "pending";
  }

  function knowledgeStatusText(job) {
    const requests = job?.knowledgeArtifactRequests?.length ? job.knowledgeArtifactRequests : knowledgeArtifactRequests(job);
    const artifacts = Array.isArray(job?.knowledgeArtifacts) ? job.knowledgeArtifacts : [];
    const label = requests.length > 1
      ? `${requests.length} knowledge artifacts`
      : knowledgeArtifactLabel(job.knowledgeArtifactType || knowledgeArtifactType(job));
    const completed = artifacts.filter(x => x.status === "completed").length;
    const failed = artifacts.filter(x => x.status === "failed").length;
    const deliverySuffix = !state.saveDirectoryHandle && job.knowledgeAutoDeliveryAttempted && !job.knowledgeAutoSaved
      ? " · download requested (unconfirmed)"
      : "";
    switch (job.knowledgeStatus) {
      case "queued": return `${label} · queued`;
      case "generating": return `${label} · ${job.knowledgeProgress || "generating"}`;
      case "completed": {
        const severity = knowledgeReviewSeverity(job);
        const reviewCount = knowledgeReviewItemCount(job);
        const base = requests.length > 1
          ? `${completed}/${requests.length} artifacts available${failed ? ` · ${failed} failed` : ""}`
          : `${label} · ${job.validatedArtifactReadiness || job.artifactReadiness || "reviewed"}`;
        const reviewSuffix = severity === "BLOCKER"
          ? ` · BLOCKER — validation required${reviewCount ? ` (${reviewCount})` : ""}`
          : severity === "REVIEW" ? ` · REVIEW required${reviewCount ? ` (${reviewCount})` : ""}` : "";
        return base + reviewSuffix + deliverySuffix;
      }
      case "failed": return `${label} · failed`;
      case "stopped": return `${label} · stopped`;
      case "outdated": return `${label} · regenerate when needed`;
      case "not_generated": return `${label} · generation disabled`;
      case "not_required": return "No knowledge artifact";
      default:
        return job.knowledgeAction ? `${job.knowledgeAction}${job.secondaryKnowledgeAction && !/^(NONE|NOT APPLICABLE)$/i.test(job.secondaryKnowledgeAction) ? ` + ${job.secondaryKnowledgeAction}` : ""}` : "Pending audit decision";
    }
  }

  function knowledgeStatusIcon(job) {
    if (job?.knowledgeStatus === "completed") {
      const severity = knowledgeReviewSeverity(job);
      if (severity === "BLOCKER") return "!";
      if (severity === "REVIEW") return "⚠";
      return "✓";
    }
    return ({queued:"○", generating:"⟳", failed:"✕", stopped:"■", outdated:"!", not_generated:"•", not_required:"—"})[job.knowledgeStatus] || "•";
  }

  function makeKnowledgeArtifactContext(job, request) {
    return {
      ...job,
      knowledgePortfolioPrimaryAction: job.knowledgeAction || "",
      knowledgePortfolioSecondaryAction: job.secondaryKnowledgeAction || "",
      knowledgeAction: request.action,
      secondaryKnowledgeAction: "NONE",
      knowledgeRole: request.role || "primary",
      knowledgeArtifactType: request.type,
      artifactReadiness: request.readiness || job.artifactReadiness,
      knowledgeStatus: "generating",
      knowledgeProgress: "starting",
      knowledgeError: "",
      knowledgeQualityStatus: "",
      knowledgeQualitySummary: "",
      knowledgeQualityValidationItems: "",
      validatedArtifactReadiness: "",
      knowledgeRawAnswer: "",
      knowledgeAnswer: "",
      knowledgeDraftAnswer: "",
      knowledgeDraftFollowupId: null,
      knowledgeDraftCompletedAt: null,
      knowledgeDraftReuseStatus: "not_checked",
      knowledgeFollowupId: null,
      knowledgeCompletedAt: null,
      knowledgeReuseStatus: "checking",
      knowledgeReuseReason: "",
      knowledgeAutoSaved: false,
      specialReviewItems: [],
      publicationReviewStatus: ""
    };
  }

  async function processSingleKnowledgeArtifact(parentJob, request, onProgress) {
    const job = makeKnowledgeArtifactContext(parentJob, request);
    const label = knowledgeArtifactLabel(request.type);
    const update = value => onProgress?.(`${knowledgeRoleLabel(request.role)} ${label} · ${String(value || "working")}`);

    try {
      const meta = buildKnowledgeReuseMeta(job);
      job.knowledgeFingerprint = meta.fingerprint;

      // 1) Reuse the exact requested artifact type first. Cross-version reuse is
      // allowed when no newer original Jira/SFDC evidence exists.
      job.knowledgeReuseStatus = "checking";
      job.knowledgeReuseReason = `Checking existing ${label} Case Chats.`;
      update("checking existing Case Chat history");

      const finalReuse = await tryReuseCaseChat({
        job,
        type: "knowledge",
        currentMeta: meta,
        legacyQuestion: "",
        force: Boolean(parentJob.forceKnowledgeRefresh),
        onProgress: update
      });

      if (finalReuse.reused) {
        const parsed = parseKnowledgeQualityResponse(finalReuse.answer, job);
        job.knowledgeRawAnswer = finalReuse.answer;
        job.knowledgeFollowupId = finalReuse.followupId;
        job.knowledgeCompletedAt = finalReuse.completedAt || Date.now();
        job.knowledgeReuseStatus = "reused";
        job.knowledgeReuseReason = finalReuse.reason;

        if (parsed.valid) {
          job.knowledgeAnswer = parsed.artifact;
          job.validatedArtifactReadiness = parsed.readiness;
          job.knowledgeQualityStatus = parsed.status;
          job.knowledgeQualitySummary = parsed.summary;
          job.knowledgeQualityValidationItems = parsed.validationItems;
          job.specialReviewItems = parsed.specialReviewItems || [];
          job.publicationReviewStatus = parsed.publicationReview || "";
          update(`reused quality-reviewed Case Chat #${job.knowledgeFollowupId}`);
        } else {
          const legacyValidation = validateReusableKnowledgeAnswer(finalReuse.answer, job, "knowledge_draft");
          if (!legacyValidation.valid) {
            throw new Error(`Reusable ${label} Case Chat #${job.knowledgeFollowupId} is incompatible: ${legacyValidation.reason}.`);
          }
          job.knowledgeAnswer = stripInternalKnowledgeMetadata(finalReuse.answer);
          job.validatedArtifactReadiness = job.artifactReadiness || "DRAFTABLE";
          job.knowledgeQualityStatus = "NOT RE-RUN";
          job.knowledgeQualitySummary = "Existing source-current artifact reused without another paid quality-review Case Chat. Use Regenerate Knowledge only when a fresh artifact is intentionally required.";
          job.knowledgeQualityValidationItems = "";
          update(`reused source-current Case Chat #${job.knowledgeFollowupId}`);
        }
        applyEffectiveKcsArtifactType(job, job.knowledgeAnswer, update);
        const reusedRoute = validateAuditLedKnowledgeRoute(job, request, job.knowledgeAnswer);
        if (!reusedRoute.valid) throw new Error(`Reusable ${label} violates the Audit-led routing contract: ${reusedRoute.reason}`);
      } else {
        job.knowledgeReuseReason = finalReuse.reason;

        // 2) Reuse/generate the enriched draft for this exact artifact type.
        // Do not build a new prompt until reuse has actually missed. This keeps
        // reuse paths cost-free and prevents prompt-rendering defects from
        // blocking an otherwise reusable KCS/Admin Guide/Runbook.
        const draftMeta = buildKnowledgeDraftReuseMeta(job);
        update("checking reusable enriched draft");

        const draftReuse = await tryReuseCaseChat({
          job,
          type: "knowledge_draft",
          currentMeta: draftMeta,
          legacyQuestion: "",
          force: Boolean(parentJob.forceKnowledgeRefresh),
          onProgress: update
        });

        if (draftReuse.reused) {
          job.knowledgeDraftAnswer = stripInternalKnowledgeMetadata(draftReuse.answer);
          job.knowledgeDraftFollowupId = draftReuse.followupId;
          job.knowledgeDraftCompletedAt = draftReuse.completedAt || Date.now();
          job.knowledgeDraftReuseStatus = "reused";
          update(`reused enriched draft #${job.knowledgeDraftFollowupId}`);
        } else {
          const basePrompt = buildKnowledgePrompt(job);
          const draftPrompt = appendReuseMarker(basePrompt, draftMeta);
          job.knowledgePrompt = draftPrompt;
          update(`generating enriched ${label}`);
          const draftGenerated = await runCaseChatPrompt(
            job.caseNumber,
            job.investigationId,
            draftPrompt,
            update,
            `${label} draft Case Chat`
          );
          job.knowledgeDraftFollowupId = draftGenerated.followupId;
          const draftRaw = draftGenerated.answer;
          const draftValidation = validateReusableKnowledgeAnswer(draftRaw, job, "knowledge_draft");
          if (!draftValidation.valid) {
            throw new Error(`Generated ${label} draft failed structural validation: ${draftValidation.reason}.`);
          }
          job.knowledgeDraftAnswer = stripInternalKnowledgeMetadata(draftRaw);
          job.knowledgeDraftCompletedAt = Date.now();
          job.knowledgeDraftReuseStatus = parentJob.forceKnowledgeRefresh ? "regenerated" : "generated";
        }

        applyEffectiveKcsArtifactType(job, job.knowledgeDraftAnswer, update);

        // 3) Independent quality review. Only reached when no source-current
        // final artifact of the exact requested type could be reused. If a CREATE
        // request became UPDATE after content inspection, persist the final quality
        // artifact under the effective KCS_UPDATE reuse identity.
        update("independent quality review");
        const qualityMeta = job.knowledgeArtifactType === request.type ? meta : buildKnowledgeReuseMeta(job);
        job.knowledgeFingerprint = qualityMeta.fingerprint;
        const qualityBasePrompt = buildKnowledgeQualityPrompt(job, job.knowledgeDraftAnswer);
        const qualityPrompt = appendReuseMarker(qualityBasePrompt, qualityMeta);
        job.knowledgePrompt = qualityPrompt;

        const qualityGenerated = await runCaseChatPrompt(
          job.caseNumber,
          job.investigationId,
          qualityPrompt,
          update,
          `${label} quality Case Chat`
        );
        job.knowledgeFollowupId = qualityGenerated.followupId;
        const qualityRaw = qualityGenerated.answer;

        let parsed = applyRouteValidationToParsed(parseKnowledgeQualityResponse(qualityRaw, job), job, request);
        let finalQualityRaw = qualityRaw;
        if (!parsed.valid && stripInternalKnowledgeMetadata(parsed.artifact || "").length >= 180) {
          update("quality review found repairable issues · repairing once");
          const repairBasePrompt = buildKnowledgeRepairPrompt(job, parsed.artifact, parsed.issues?.length ? parsed.issues : [parsed.reason]);
          const repairPrompt = appendReuseMarker(repairBasePrompt, qualityMeta);
          try {
            const repairGenerated = await runCaseChatPrompt(
              job.caseNumber,
              job.investigationId,
              repairPrompt,
              update,
              `${label} repair Case Chat`
            );
            const repairRaw = repairGenerated.answer;
            const repaired = applyRouteValidationToParsed(parseKnowledgeQualityResponse(repairRaw, job), job, request);
            finalQualityRaw = repairRaw;
            if (repaired.valid) {
              parsed = repaired;
              job.knowledgeFollowupId = repairGenerated.followupId;
              update(`quality repair completed · Case Chat #${job.knowledgeFollowupId}`);
            } else {
              parsed.repairReason = repaired.reason || "Repair did not clear all deterministic quality issues.";
            }
          } catch (repairErr) {
            parsed.repairReason = cleanText(repairErr?.message || String(repairErr || ""));
          }
        }

        if (!parsed.valid) {
          job.knowledgeQualityStatus = parsed.status || "FAIL";
          job.validatedArtifactReadiness = parsed.readiness || "NOT READY";
          job.knowledgeQualitySummary = parsed.summary || parsed.reason || "";
          job.knowledgeQualityValidationItems = parsed.validationItems || "";
          job.specialReviewItems = parsed.specialReviewItems || [];
          job.publicationReviewStatus = "BLOCKER";
          if (stripInternalKnowledgeMetadata(parsed.artifact || "").length >= 180) {
            job.knowledgeDraftAnswer = parsed.artifact;
          }
          throw new Error(`Knowledge quality gate blocked ${label}: ${parsed.reason}${parsed.repairReason ? ` · Repair: ${parsed.repairReason}` : ""}.`);
        }

        job.knowledgeRawAnswer = finalQualityRaw;
        job.knowledgeAnswer = parsed.artifact;
        applyEffectiveKcsArtifactType(job, job.knowledgeAnswer, update);
        job.validatedArtifactReadiness = parsed.readiness;
        job.knowledgeQualityStatus = parsed.status;
        job.knowledgeQualitySummary = parsed.summary;
        job.knowledgeQualityValidationItems = parsed.validationItems;
        job.specialReviewItems = parsed.specialReviewItems || [];
        job.publicationReviewStatus = parsed.publicationReview || "";
        job.knowledgeReuseStatus = parentJob.forceKnowledgeRefresh ? "regenerated" : "generated";
        job.knowledgeCompletedAt = Date.now();
      }

      job.knowledgeStatus = "completed";
      job.knowledgeEndedAt = Date.now();
      job.references = extractReferences(parentJob.auditAnswer, job.knowledgeAnswer);

      // Restore the proven v2.4.30-v2.4.32 behavior: every completed Knowledge
      // artifact is delivered immediately as its own standalone HTML. Do not wait
      // for batch completion and do not replace the standalone artifact with a ZIP.
      const effectiveLabel = knowledgeArtifactLabel(job.knowledgeArtifactType || request.type);
      const deliveryResult = await downloadBlob(
        knowledgeFilename(job),
        knowledgeArtifactHtml(job),
        "text/html;charset=utf-8"
      );
      const delivery = deliveryResult?.mode === "folder" ? "saved_to_folder" : "download_requested";

      return {
        role: request.role,
        action: job.knowledgeAction || request.action,
        type: job.knowledgeArtifactType || request.type,
        label: effectiveLabel,
        status: "completed",
        answer: job.knowledgeAnswer,
        rawAnswer: job.knowledgeRawAnswer,
        followupId: job.knowledgeFollowupId,
        completedAt: job.knowledgeCompletedAt || job.knowledgeEndedAt,
        reuseStatus: job.knowledgeReuseStatus,
        reuseReason: job.knowledgeReuseReason,
        qualityStatus: job.knowledgeQualityStatus,
        qualitySummary: job.knowledgeQualitySummary,
        validationItems: job.knowledgeQualityValidationItems,
        readiness: job.validatedArtifactReadiness || job.artifactReadiness,
        specialReviewItems: job.specialReviewItems || [],
        publicationReviewStatus: job.publicationReviewStatus || "",
        references: job.references || [],
        delivery
      };
    } catch (err) {
      if (err?.name === "AbortError" || state.stopped) throw err;
      const usableDraft = stripInternalKnowledgeMetadata(job.knowledgeDraftAnswer || job.knowledgeAnswer || "");
      const fallbackRoute = validateAuditLedKnowledgeRoute(job, request, usableDraft);
      if (usableDraft.length >= 180 && fallbackRoute.valid) {
        // Do not lose a useful KCS/Runbook/Guide draft merely because the
        // independent quality pass found a review item or failed transiently.
        // Save the artifact with an explicit REVIEW/BLOCKER state so the user
        // still receives the requested standalone document.
        job.knowledgeAnswer = usableDraft;
        job.knowledgeArtifactType = job.knowledgeArtifactType || request.type;
        job.knowledgeAction = job.knowledgeAction || request.action;
        applyEffectiveKcsArtifactType(job, usableDraft);
        job.knowledgeRole = request.role || job.knowledgeRole || "primary";
        const qualityUnavailable = err?.name === "TransientCaseChatError" || /temporary system error|temporarily unavailable|service unavailable/i.test(cleanText(err?.message || String(err)));
        job.knowledgeQualityStatus = job.knowledgeQualityStatus || (qualityUnavailable ? "VALIDATION UNAVAILABLE" : "FAIL");
        job.knowledgeQualitySummary = job.knowledgeQualitySummary || cleanText(err?.message || String(err));
        job.validatedArtifactReadiness = qualityUnavailable ? "DRAFTABLE" : "NOT READY";
        job.publicationReviewStatus = qualityUnavailable ? "REVIEW" : "BLOCKER";
        job.specialReviewItems = job.specialReviewItems?.length ? job.specialReviewItems : [{status:qualityUnavailable?"REVIEW":"BLOCKER",target:"Quality validation",owner:"SME / Knowledge owner",what:qualityUnavailable?`Re-run or manually perform the independent quality validation for the ${label}`:`Review the ${label} before publication`,why:qualityUnavailable?"The quality-review Case Chat was temporarily unavailable. This is an execution-state warning, not proof that the article content is technically invalid.":(err?.message || String(err)),refs:[]}];
        job.references = extractReferences(parentJob.auditAnswer, usableDraft);
        job.knowledgeCompletedAt = Date.now();
        if (["checking", "waiting_existing", "not_checked"].includes(String(job.knowledgeReuseStatus || "").toLowerCase())) {
          job.knowledgeReuseStatus = parentJob.forceKnowledgeRefresh ? "regenerated" : "generated";
        }
        let delivery = "download_requested";
        try {
          const deliveryResult = await downloadBlob(knowledgeFilename(job), knowledgeArtifactHtml(job), "text/html;charset=utf-8");
          delivery = deliveryResult?.mode === "folder" ? "saved_to_folder" : "download_requested";
        } catch (downloadErr) {
          delivery = "download_failed";
          console.warn(`XSUP Auditor could not auto-deliver fallback ${label}:`, downloadErr);
        }
        return {
          role: request.role,
          action: job.knowledgeAction || request.action,
          type: job.knowledgeArtifactType || request.type,
          label: knowledgeArtifactLabel(job.knowledgeArtifactType || request.type),
          status: "completed",
          answer: usableDraft,
          rawAnswer: job.knowledgeRawAnswer || "",
          followupId: job.knowledgeFollowupId || job.knowledgeDraftFollowupId,
          completedAt: job.knowledgeCompletedAt,
          reuseStatus: ["checking", "waiting_existing", "not_checked"].includes(String(job.knowledgeReuseStatus || "").toLowerCase()) ? (parentJob.forceKnowledgeRefresh ? "regenerated" : "generated") : (job.knowledgeReuseStatus || "generated"),
          reuseReason: job.knowledgeReuseReason || "",
          qualityStatus: job.knowledgeQualityStatus,
          qualitySummary: job.knowledgeQualitySummary,
          validationItems: job.knowledgeQualityValidationItems || "",
          readiness: job.validatedArtifactReadiness,
          specialReviewItems: job.specialReviewItems,
          publicationReviewStatus: job.publicationReviewStatus,
          references: job.references,
          delivery,
          error: err?.message || String(err)
        };
      }
      return {
        role: request.role,
        action: request.action,
        type: request.type,
        label,
        status: "failed",
        answer: "",
        followupId: job.knowledgeFollowupId || job.knowledgeDraftFollowupId || null,
        completedAt: Date.now(),
        reuseStatus: "failed",
        reuseReason: job.knowledgeReuseReason || "",
        qualityStatus: "FAIL",
        readiness: "NOT READY",
        error: err?.message || String(err)
      };
    }
  }

  // Two Knowledge workers operate independently from Audit workers. Normal retrospective jobs
  // must satisfy the validated Audit-selected primary/secondary actions exactly. Direct KCS jobs
  // may satisfy their primary with either a KCS draft or a content-reconciled KCS update proposal.
  async function processKnowledgeJob(job) {
    job.knowledgeStatus = "generating";
    job.knowledgeStartedAt = Date.now();
    job.knowledgeLastHeartbeatAt = Date.now();
    job.knowledgeError = "";
    job.knowledgeArtifacts = [];

    const requests = job.knowledgeArtifactRequests?.length
      ? job.knowledgeArtifactRequests
      : knowledgeArtifactRequests(job);

    const update = value => {
      job.knowledgeProgress = String(value || "working");
      job.knowledgeLastHeartbeatAt = Date.now();
      renderJobList();
      renderDashboard();
      if (job.xsup === state.selectedXsup) {
        renderKnowledgeArtifact(job);
        renderReuseSummary(job);
        renderExecutionPipeline(job);
      }
    };

    try {
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        const isKcsFamilyRequest = request.type === "KCS_DRAFT" || request.type === "KCS_UPDATE";
        update(`artifact ${i + 1}/${requests.length} · ${knowledgeArtifactLabel(request.type)}`);
        let result = await processSingleKnowledgeArtifact(job, request, update);

        // When the validated Audit explicitly selected a KCS-family artifact, treat
        // that selected artifact as required for this knowledge run. One controlled
        // fresh retry is allowed after the normal reuse/resilient Case Chat path exhausted.
        if (isKcsFamilyRequest && result?.status === "failed") {
          update(`required ${knowledgeArtifactLabel(request.type)} unavailable · retrying once with fresh generation`);
          const retryContext = {...job, forceKnowledgeRefresh:true};
          const retried = await processSingleKnowledgeArtifact(retryContext, request, update);
          if (retried?.status === "completed") {
            retried.recoveredAfterRetry = true;
            result = retried;
          } else {
            result = retried || result;
          }
        }

        job.knowledgeArtifacts.push(result);
        renderJobList();
        renderDashboard();
        if (job.xsup === state.selectedXsup) renderSelectedJob();
      }

      const successes = job.knowledgeArtifacts.filter(x => x.status === "completed");
      const failures = job.knowledgeArtifacts.filter(x => x.status === "failed");
      const primary = job.knowledgeArtifacts.find(x => x.role === "primary") || successes[0] || job.knowledgeArtifacts[0];

      // Keep the legacy single-artifact mirrors populated for existing UI/session
      // code while preserving every artifact in knowledgeArtifacts.
      if (primary) {
        job.knowledgeArtifactType = primary.type;
        job.knowledgeAnswer = primary.answer || "";
        job.knowledgeRawAnswer = primary.rawAnswer || "";
        job.knowledgeFollowupId = primary.followupId || null;
        job.knowledgeCompletedAt = primary.completedAt || null;
        job.knowledgeReuseStatus = primary.reuseStatus || "";
        job.knowledgeReuseReason = primary.reuseReason || "";
        job.knowledgeQualityStatus = primary.qualityStatus || "";
        job.knowledgeQualitySummary = primary.qualitySummary || "";
        job.knowledgeQualityValidationItems = primary.validationItems || "";
        job.validatedArtifactReadiness = primary.readiness || "";
        job.specialReviewItems = primary.specialReviewItems || [];
        job.publicationReviewStatus = primary.publicationReviewStatus || "";
      }

      job.forceKnowledgeRefresh = false;
      job.knowledgeEndedAt = Date.now();
      job.references = extractReferences(job.auditAnswer, ...successes.map(x => x.answer));
      const updateResult = successes.find(x=>x.type === "KCS_UPDATE" || normalizeDecision(x.action) === "UPDATE EXISTING KCS");
      if (updateResult) {
        job.existingKcsRecommendedAction = "UPDATE EXISTING KCS";
        job.existingKcsReviewerOverride = false;
        job.existingKcsRecommendationSummary = "Substantial existing Salesforce KCS overlap was established; update is the recommended path to avoid unnecessary duplication.";
        job.existingKcsContentMatch = /DIRECT/i.test(cleanText(job.existingKcsContentMatch||"")) ? "DIRECT" : "PARTIAL";
        const existing = extractKnowledgeSection(updateResult.answer || "", ["Existing Knowledge Reference"]);
        if (cleanText(existing)) job.existingKcsCandidate = cleanText(existing);
      }
      reconcileFinalKnowledgePortfolio(job, successes);
      reconcileRetrospectiveKnowledgeState(job);
      if (updateResult) {
        job.primaryKnowledgeReason = cleanText(job.primaryKnowledgeReason || job.knowledgeDecisionExplanation || "Substantial existing Salesforce KCS overlap was established; update the existing article instead of creating a duplicate.");
      }
      job.xsupComment = buildReviewPasteComment(job.auditAnswer, {xsup:job.xsup, product:productLabel(job), job});
      const primaryRequest = requests.find(x => x.role === "primary") || requests[0] || null;
      const primaryResultSatisfiesRequest = result => {
        if (!primaryRequest) return true;
        if (!result || result.status !== "completed" || result.role !== "primary") return false;

        const exact = result.type === primaryRequest.type &&
          normalizeDecision(result.action) === normalizeDecision(primaryRequest.action);
        if (exact) return true;

        // Direct Generate KCS intentionally starts as CREATE KCS / KCS_DRAFT, then may
        // reconcile to UPDATE EXISTING KCS / KCS_UPDATE after inspecting actual Salesforce
        // Knowledge content. That legitimate KCS-family transition still satisfies the one
        // required Direct KCS primary. Normal retrospective jobs do NOT get this exception.
        if (job.directKnowledgeOnly) {
          const requestedKcsFamily = ["KCS_DRAFT", "KCS_UPDATE"].includes(primaryRequest.type);
          const completedKcsFamily = ["KCS_DRAFT", "KCS_UPDATE"].includes(result.type);
          const completedAction = normalizeDecision(result.action);
          const routeConsistent =
            (result.type === "KCS_DRAFT" && completedAction === "CREATE KCS") ||
            (result.type === "KCS_UPDATE" && completedAction === "UPDATE EXISTING KCS");
          if (requestedKcsFamily && completedKcsFamily && routeConsistent) return true;
        }

        return false;
      };
      const primaryCompleted = !primaryRequest || successes.some(primaryResultSatisfiesRequest);

      if (successes.length && primaryCompleted) {
        job.knowledgeStatus = "completed";
        job.knowledgeProgress = failures.length
          ? `${successes.length}/${requests.length} artifacts available · ${failures.length} optional/secondary failed`
          : `${successes.length}/${requests.length} artifacts available`;
        job.knowledgeError = failures.map(x => `${x.label}: ${x.error || "failed"}`).join(" · ");
        showToast(`✓ ${job.xsup} knowledge · ${successes.length}/${requests.length} artifact${requests.length === 1 ? "" : "s"} available`, failures.length ? "warn" : "ok");
      } else if (successes.length && !primaryCompleted) {
        job.knowledgeStatus = "failed";
        const requiredPrimaryLabel = job.directKnowledgeOnly
          ? "Direct KCS artifact"
          : (primaryRequest ? knowledgeArtifactLabel(primaryRequest.type) : "Knowledge artifact");
        const requiredPrimaryOwner = job.directKnowledgeOnly
          ? "Direct KCS artifact"
          : "Audit-selected primary artifact";
        job.knowledgeProgress = `required ${requiredPrimaryLabel} unavailable · ${successes.length} secondary artifact${successes.length === 1 ? "" : "s"} preserved`;
        job.knowledgeError = `Required ${requiredPrimaryOwner} failed after controlled retry. ${failures.map(x => `${x.label}: ${x.error || "failed"}`).join(" · ")}`.trim();
        showToast(`⚠ ${job.xsup} required ${requiredPrimaryLabel} unavailable · secondary artifact preserved`, "error");
      } else {
        job.knowledgeStatus = "failed";
        job.knowledgeProgress = "all knowledge artifacts failed";
        job.knowledgeError = failures.map(x => `${x.label}: ${x.error || "failed"}`).join(" · ") || "Knowledge generation failed.";
        showToast(`⚠ ${job.xsup} knowledge artifacts failed`, "error");
      }
      // Each completed Knowledge artifact has already been delivered inside
      // processSingleKnowledgeArtifact, matching v2.4.30-v2.4.32. Reconcile only
      // the parent delivery state here; do not issue a second ZIP/background download.
      if (job.knowledgeStatus === "completed" && successes.length) {
        job.knowledgeAutoDeliveryAttempted = true;
        const allFolderSaved = successes.every(x => x.delivery === "saved_to_folder");
        const allBrowserRequested = successes.every(x => x.delivery === "download_requested");
        job.knowledgeAutoSaved = allFolderSaved;
        job.knowledgeDeliveryState = allFolderSaved
          ? "saved_to_folder"
          : allBrowserRequested
            ? "download_requested"
            : "delivery_partial";
      }

      // Normal retrospective flow already saves the Audit before Knowledge is queued.
      // Keep this only as a non-Direct recovery fallback if that earlier save did not complete.
      if (!job.directKnowledgeOnly && state.autoSaveCompleted && job.auditAnswer && !job.autoSaved) void maybeAutoSaveJob(job);
    } catch (err) {
      if (err?.name === "AbortError" || state.stopped) {
        job.knowledgeStatus = "stopped";
        job.knowledgeProgress = "stopped";
        job.knowledgeError = "Stopped by user.";
      } else {
        job.knowledgeStatus = "failed";
        job.knowledgeProgress = "knowledge orchestration failed";
        job.knowledgeError = err?.message || String(err);
        showToast(`⚠ ${job.xsup} knowledge orchestration failed`, "error");
      }
      job.knowledgeEndedAt = Date.now();
    } finally {
      state.knowledgeActiveCount = Math.max(0, state.knowledgeActiveCount - 1);
      renderJobList();
      renderDashboard();
      if (job.xsup === state.selectedXsup) renderSelectedJob();
      pumpQueue();
      pumpKnowledgeQueue();
      maybeFinishRuntime();
    }
  }

  function pumpKnowledgeQueue() {
    if (state.stopped) return;

    // Knowledge is independent from the Audit queue, as in the older stable
    // releases. The shared Case Chat generation semaphore limits actual model
    // generation to two concurrent requests across both pipelines.
    while (
      state.knowledgeActiveCount < state.knowledgeConcurrency &&
      state.knowledgeQueue.length
    ) {
      const xsup = state.knowledgeQueue.shift();
      const job = state.jobs.get(xsup);
      if (!job || job.knowledgeStatus !== "queued") continue;

      state.knowledgeActiveCount++;
      processKnowledgeJob(job);
    }

    maybeFinishRuntime();
  }

  function hasAuditWork() {
    return state.activeCount > 0 ||
      state.queue.some(x => state.jobs.get(x)?.status === "queued") ||
      [...state.jobs.values()].some(j => j.status === "needs_selection" || j.status === "needs_sfdc");
  }

  function hasKnowledgeWork() {
    return state.knowledgeActiveCount > 0 ||
      state.knowledgeQueue.some(x => state.jobs.get(x)?.knowledgeStatus === "queued") ||
      [...state.jobs.values()].some(job => ["waiting", "active"].includes(knowledgeUiState(job)));
  }

  function maybeFinishRuntime() {
    if (state.stopped) {
      if (state.activeCount === 0 && state.knowledgeActiveCount === 0) {
        state.running = false;
        stopElapsedTimer();
        updateBatchStatus();
      }
      return;
    }

    if (!hasAuditWork() && !hasKnowledgeWork() && state.running) {
      state.running = false;
      stopElapsedTimer();

      const jobs = [...state.jobs.values()];
      const completed = jobs.filter(jobWorkflowComplete).length;
      const failed = jobs.filter(j => j.status === "failed").length;
      const knowledgeDone = jobs.filter(j => j.knowledgeStatus === "completed").length;
      const knowledgeFailed = jobs.filter(j => j.knowledgeStatus === "failed").length;

      showToast(
        `✓ Batch complete · ${completed} workflows${knowledgeDone ? ` · ${knowledgeDone} knowledge complete` : ""}${failed || knowledgeFailed ? ` · ${failed + knowledgeFailed} failed` : ""}`,
        failed || knowledgeFailed ? "error" : "ok"
      );
      updateBatchStatus();
      // Standalone Knowledge delivery occurs at each artifact completion. The
      // consolidated Download All Knowledge Drafts button remains optional.
    }
  }

  function pumpQueue() {
    if (state.stopped) {
      if (state.activeCount === 0) {
        state.running = false;
        stopElapsedTimer();
        updateBatchStatus();
      }
      return;
    }

    // Audit and Knowledge workers may both make progress. Actual mutating Case Chat
    // pressure is controlled by the shared generation semaphore, so reuse/history
    // work is never blocked merely because the other pipeline is active.

    while (state.activeCount < state.concurrency && state.queue.length) {
      const xsup = state.queue.shift();
      const job = state.jobs.get(xsup);
      if (!job || job.status !== "queued") continue;

      state.activeCount++;
      processJob(job);
    }

    const stillQueued = state.queue.some(x => state.jobs.get(x)?.status === "queued");
    const awaitingSelection = [...state.jobs.values()].some(j => j.status === "needs_selection" || j.status === "needs_sfdc" || j.status === "needs_product");

    if (state.activeCount === 0 && !stillQueued && !awaitingSelection) {
      const retryBtn = document.getElementById("xsup-auditor-retry-chat");
      if (retryBtn) {
        const selected = getSelectedJob();
        retryBtn.disabled = !(selected?.caseNumber && selected?.investigationId && selected?.report && selected?.evidence && reportReady(selected.report));
      }
      maybeFinishRuntime();
    }
  }

  async function runAudit() {
    if (state.stopped && state.activeCount > 0) {
      setStatus("Finishing Stop All; wait a moment before starting a new batch.", "error");
      return;
    }
    if (state.stopped && state.activeCount === 0) { state.stopped = false; state.controller = new AbortController(); }

    const added = await addJobsFromInput();
    if (!added.length) return;

    ensureBatchRuntime();
    for (const job of added) job.batchRunId = state.batchRunId;
    updateBatchStatus();
    pumpQueue();
  }


  async function runDirectKCS() {
    if (state.stopped && state.activeCount === 0) { state.stopped = false; state.controller = new AbortController(); }
    const added = await addJobsFromInput({directKnowledgeOnly:true});
    if (!added.length) return;
    // Dedicated Generate KCS still reuses source-current Case Chat history first.
    // Explicit Regenerate Knowledge remains the opt-in path for a paid refresh.
    for (const job of added) job.forceKnowledgeRefresh = false;
    ensureBatchRuntime();
    for (const job of added) job.batchRunId = state.batchRunId;
    updateBatchStatus(); pumpQueue();
  }

  function stopAudit() {
    const activeOrQueued =
      [...state.jobs.values()].some(
        j => j.status === "running" || j.status === "queued" || j.status === "needs_selection" || j.status === "needs_sfdc" || j.status === "needs_product" ||
             j.knowledgeStatus === "queued" || j.knowledgeStatus === "generating"
      );

    if (!activeOrQueued) {
      setStatus("Nothing is currently running.");
      return;
    }

    state.stopped = true;
    try { state.controller?.abort(); } catch (_) {}

    for (const job of state.jobs.values()) {
      if (job.status === "queued" || job.status === "needs_selection" || job.status === "needs_sfdc" || job.status === "needs_product") {
        job.status = "stopped";
        job.stageLabel = "Stopped";
        job.error = "Stopped before execution.";
      }
      if (job.knowledgeStatus === "queued" || job.knowledgeStatus === "generating") {
        job.knowledgeStatus = "stopped";
        job.knowledgeProgress = "stopped";
        job.knowledgeError = "Stopped by user.";
      }
    }
    state.queue = [];
    state.knowledgeQueue = [];

    setStatus("Stopping all active audits...", "error");
    showToast("Stopping XSUP audit batch...", "error");
    renderJobList();
    renderSelectedJob();
  }

  async function retryCaseChatOnly() {
    const job = getSelectedJob();
    if (job && !getProductProfile(job.productKey)) { showProductChooser(job); return; }
    if (!job) {
      setStatus("Select an XSUP first.", "error");
      return;
    }
    if (state.running || state.activeCount) {
      setStatus("Wait for the current batch to finish before retrying Case Chat.", "error");
      return;
    }
    if (!job.caseNumber || !job.investigationId || !job.lastPrompt) {
      setStatus("No prepared Case Chat request to retry.", "error");
      return;
    }

    state.running = true;
    state.stopped = false;
    state.controller = new AbortController();
    state.activeCount = 1;
    startElapsedTimer();

    job.status = "running";
    job.stageLabel = "Retry Case Chat";
    job.error = "";
    renderJobList();
    updateBatchStatus();

    try {
      setJobStep(job, "audit", "Retrying Case Chat...", "Retry Case Chat");

      const submit = await postFollowup(
        job.caseNumber,
        job.investigationId,
        job.lastPrompt
      );

      const taskId = submit?.task_id;
      if (!taskId) throw new Error("Case Chat did not return task_id.");

      const directFollowupId = extractFollowupId(submit);
      const followupId = directFollowupId || await waitForFollowupId(
        job.caseNumber,
        job.investigationId,
        taskId,
        job.lastPrompt,
        (value, meta) => setJobStep(job, "audit", value, "Retry Case Chat", meta)
      );

      const rawAuditAnswer = await waitForFollowup(
        job.caseNumber,
        followupId,
        (value, meta) => setJobStep(job, "audit", value, "Retry Case Chat", meta)
      );

      const auditValidation = validateReusableAuditAnswer(rawAuditAnswer, job);
      if (!auditValidation.valid) {
        throw new Error(`Retrospective Case Chat returned an invalid structure: ${auditValidation.reason}.`);
      }
      applyAuditResult(job, rawAuditAnswer);

      job.status = "completed";
      job.stageLabel = primaryReviewVerdict(job) || job.retrospectiveEligibility || "Complete";
      job.endedAt = Date.now();

      setJobStep(job, "audit", "✓ Completed · downloading Audit before Knowledge", primaryReviewVerdict(job) || job.retrospectiveEligibility || "Complete");
      renderSelectedJob();

      // Preserve the same Audit-first barrier used by the normal pipeline. A
      // manual Case Chat retry may change the knowledge routing decision, so do
      // not start any replacement Knowledge work until the regenerated Audit
      // artifact has been delivered/requested first.
      if (state.autoSaveCompleted) {
        try {
          await maybeAutoSaveJob(job);
        } catch (saveErr) {
          console.warn(`XSUP Auditor ${job.xsup}: retried Audit auto-download failed; continuing with the validated Audit verdict.`, saveErr);
          showToast(`⚠ ${job.xsup} retried audit auto-download failed · use Download Audit`, "error");
        }
      }

      // A retry may change the knowledge decision. Requeue only after the Audit
      // delivery barrier and only when no Knowledge artifact is currently active.
      if (job.knowledgeStatus !== "generating") {
        job.knowledgeStatus = "not_evaluated";
        job.knowledgeAnswer = "";
    job.knowledgeRawAnswer = "";
    job.knowledgeDraftAnswer = "";
    job.knowledgeDraftFollowupId = null;
    job.knowledgeDraftCompletedAt = null;
    job.knowledgeDraftReuseStatus = "not_checked";
    job.knowledgeQualityStatus = "";
    job.knowledgeQualitySummary = "";
    job.knowledgeQualityValidationItems = "";
    job.validatedArtifactReadiness = "";
        job.knowledgeAutoSaved = false;
        queueKnowledgeArtifact(job);
      }

      showToast(`✓ ${job.xsup} Case Chat retry complete`, "ok");

    } catch (err) {
      if (err?.name === "AbortError" || state.stopped) {
        job.status = "stopped";
        job.stageLabel = "Stopped";
        job.currentActivity = "Stopped by user";
        job.lastHeartbeatAt = Date.now();
        job.error = "Stopped by user.";
      } else {
        job.status = "failed";
        job.stageLabel = "Failed";
        job.error = err?.message || String(err);
        job.currentActivity = `Failed · ${job.error}`;
        job.lastHeartbeatAt = Date.now();
        showToast(`⚠ Case Chat retry failed`, "error");
      }
      renderSelectedJob();

    } finally {
      state.activeCount = 0;
      state.running = false;
      stopElapsedTimer();
      renderJobList();
      updateBatchStatus();

      const retryBtn = document.getElementById("xsup-auditor-retry-chat");
      if (retryBtn) retryBtn.disabled = !job.lastPrompt;
    }
  }


  function htmlDoc(title, bodyHtml) {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:1100px;margin:32px auto;padding:0 24px;color:#111827;line-height:1.55}
h1,h2,h3,h4{line-height:1.25;margin-top:1.35em}h2{border-bottom:1px solid #e5e7eb;padding-bottom:6px}
a{color:#4f46e5;text-decoration:underline;text-underline-offset:2px}
code{background:#f3f4f6;border-radius:4px;padding:1px 4px}
pre{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:12px;white-space:pre-wrap;word-break:break-word}
.meta{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 18px}.pill{border:1px solid #d1d5db;border-radius:999px;padding:4px 8px;font-size:12px;background:#f9fafb}
.section{margin:22px 0}.comment{white-space:pre-wrap;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:14px}.xa-copy-row{display:flex;justify-content:flex-end;margin:0 0 8px}.xa-copy-review{border:1px solid #c7d2fe;background:#eef2ff;color:#3730a3;border-radius:8px;padding:7px 10px;font:inherit;font-size:12px;font-weight:750;cursor:pointer}.xa-copy-review:hover{background:#e0e7ff}
.refs{padding-left:20px}.refs li{margin:6px 0}.ticket{page-break-before:always}.ticket:first-child{page-break-before:auto}
.toc li{margin:5px 0}
.xa-table-wrap{overflow-x:auto;margin:12px 0}.xa-md-table{width:100%;border-collapse:collapse;font-size:12px}.xa-md-table th,.xa-md-table td{border:1px solid #d1d5db;padding:8px 9px;text-align:left;vertical-align:top}.xa-md-table th{background:#f8fafc;font-weight:800}.xa-review-block-highlight.review{background:#fffbeb;box-shadow:0 0 0 2px #fcd34d inset;border-radius:6px}.xa-review-block-highlight.blocker{background:#fef2f2;box-shadow:0 0 0 2px #fca5a5 inset;border-radius:6px}
.small{font-size:12px;color:#6b7280}
.pill.good{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}.pill.warn{background:#fffbeb;border-color:#fde68a;color:#92400e}.pill.bad{background:#fef2f2;border-color:#fecaca;color:#991b1b}.pill.info{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.xa-sme-field-card{margin:10px 0;padding:13px 14px;border:1px solid #e5e7eb;border-left:6px solid #64748b;border-radius:12px;background:#fff}.xa-sme-good{border-left-color:#16a34a;background:#f0fdf4}.xa-sme-warn{border-left-color:#d97706;background:#fffbeb}.xa-sme-bad{border-left-color:#dc2626;background:#fef2f2}.xa-sme-info{border-left-color:#3b82f6;background:#eff6ff}.xa-sme-gray{border-left-color:#94a3b8;background:#f8fafc}.xa-sme-field-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.xa-sme-field-grid{display:grid;grid-template-columns:1fr;gap:9px;margin-top:10px}.xa-sme-field-grid>div{background:#fff;border:1px solid rgba(148,163,184,.32);border-radius:9px;padding:9px}.xa-sme-field-grid span,.xa-correct-value span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;font-weight:800}.xa-sme-field-grid strong,.xa-correct-value strong{display:block;margin-top:4px;font-size:16px}.xa-correct-value{margin-top:10px;background:#fff;border:1px solid rgba(148,163,184,.32);border-radius:9px;padding:10px}.xa-sme-why,.xa-sme-action,.xa-sme-detail,.xa-sme-correction{margin-top:9px;font-size:12px;line-height:1.5}.xa-sme-correction{padding:8px 10px;border-radius:8px;background:#fff1f2;color:#9f1239}.xa-sme-detail{color:#475569}.xa-at-glance-box{margin:16px 0;padding:14px 16px;border:1px solid #bfdbfe;border-left:6px solid #3b82f6;border-radius:12px;background:#eff6ff}.xa-at-glance-title{font-size:12px;font-weight:850;text-transform:uppercase;letter-spacing:.04em;color:#1d4ed8;margin-bottom:5px}.xa-at-glance-text{font-size:14px;line-height:1.55;color:#1e3a5f}.xa-review-status-box{margin:14px 0 20px;padding:12px 14px;border-radius:11px;border:1px solid #fde68a;border-left:6px solid #d97706;background:#fffbeb}.xa-review-status-box.blocker{border-color:#fecaca;border-left-color:#dc2626;background:#fef2f2}.xa-review-status-title{font-size:12px;font-weight:850;color:#92400e}.xa-review-status-box.blocker .xa-review-status-title{color:#991b1b}.xa-validation-notice{margin:12px 0 18px;padding:13px 15px;border:1px solid #fde68a;border-left:7px solid #d97706;border-radius:11px;background:#fffbeb}.xa-validation-notice.blocker{border-color:#fecaca;border-left-color:#dc2626;background:#fef2f2}.xa-validation-notice-title{font-size:12px;font-weight:900;color:#92400e;letter-spacing:.02em}.xa-validation-notice.blocker .xa-validation-notice-title{color:#991b1b}.xa-validation-notice-text{margin-top:5px;font-size:12px;line-height:1.55;color:#4b5563}.xa-review-status-text{margin-top:4px;font-size:13px;line-height:1.5;color:#4b5563}.xa-review-highlight{border-radius:4px;padding:1px 3px;box-decoration-break:clone;-webkit-box-decoration-break:clone;cursor:help}.xa-review-highlight.review{background:#fef3c7;box-shadow:0 0 0 1px #fcd34d inset}.xa-review-highlight.blocker{background:#fee2e2;box-shadow:0 0 0 1px #fca5a5 inset}.xa-review-ref.review{background:#fef3c7!important;border-color:#f59e0b!important;color:#92400e!important}.xa-review-ref.blocker{background:#fee2e2!important;border-color:#ef4444!important;color:#991b1b!important}.xa-inline-review-marker{display:inline-flex;align-items:center;margin-left:4px;padding:1px 5px;border-radius:999px;font-size:8px;font-weight:900;vertical-align:middle;border:1px solid currentColor}.xa-inline-review-marker.review{background:#fffbeb;color:#92400e}.xa-inline-review-marker.blocker{background:#fef2f2;color:#991b1b}.xa-inline-review-summary{margin:0 0 12px;padding:8px 10px;border:1px solid #fde68a;border-radius:8px;background:#fffbeb;font-size:10px;line-height:1.5}.xa-inline-review-summary strong{margin-right:7px;color:#92400e}.xa-review-source.review{background:#fffbeb}.xa-review-source.blocker{background:#fef2f2}.xa-inline-review-callout{margin:7px 0 12px;padding:8px 10px;border-radius:8px;border-left:4px solid #d97706;background:#fffbeb;font-size:11px;line-height:1.45;color:#78350f}.xa-inline-review-callout.blocker{border-left-color:#dc2626;background:#fef2f2;color:#7f1d1d}.xa-inline-review-callout{display:block}.xa-inline-review-line,.xa-inline-review-refs,.xa-inline-review-source{display:block;margin-top:5px}.xa-review-claim{padding:6px 8px;border-radius:6px;background:rgba(255,255,255,.7)}.xa-review-source-item{display:inline}.xa-review-source-type{color:#64748b;font-size:9px}.xa-source-state{display:inline-flex;margin:0 6px 4px 0;padding:2px 6px;border-radius:999px;font-size:9px;font-weight:900;border:1px solid currentColor}.xa-source-state.current{color:#065f46;background:#ecfdf5}.xa-source-state.review{color:#92400e;background:#fffbeb}.xa-source-state.blocker{color:#991b1b;background:#fef2f2}.xa-source-freshness.current{border-left-color:#16a34a;background:#f0fdf4;color:#065f46}.xa-source-freshness.blocker{border-left-color:#dc2626;background:#fef2f2;color:#7f1d1d}.xa-management-learning{border-left:5px solid #2563eb;background:#eff6ff}.xa-inline-review-badge{display:inline-flex;margin-right:7px;padding:2px 6px;border-radius:999px;background:#fff;border:1px solid currentColor;font-size:9px;font-weight:850}.xa-review-details-bottom{margin-top:28px}.xa-review-guide{margin:8px 0 14px;padding:12px 14px;border:1px solid #bfdbfe;border-left:6px solid #2563eb;border-radius:10px;background:#eff6ff;font-size:12px;line-height:1.55;color:#1e3a5f}.xa-review-guide strong{color:#1e40af}.xa-review-guide-row{margin-top:6px}.xa-review-guide .blocker-key{color:#991b1b;font-weight:850}.xa-review-guide .review-key{color:#92400e;font-weight:850}.xa-review-item-list{display:flex;flex-direction:column;gap:12px}.xa-review-item{padding:13px 14px;border:1px solid #fde68a;border-left:6px solid #d97706;border-radius:10px;background:#fffbeb;font-size:12px}.xa-review-item.blocker{border-color:#fecaca;border-left-color:#dc2626;background:#fef2f2}.xa-review-item-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:9px}.xa-review-item-grid{display:grid;grid-template-columns:1fr;gap:8px}.xa-review-field{padding:9px 10px;background:rgba(255,255,255,.82);border:1px solid rgba(148,163,184,.3);border-radius:8px;line-height:1.5}.xa-review-field-label{display:block;margin-bottom:3px;font-size:10px;text-transform:uppercase;letter-spacing:.04em;font-weight:900;color:#475569}.xa-review-item.blocker .xa-review-field-label{color:#7f1d1d}.xa-review-priority{display:inline-flex;padding:2px 7px;border-radius:999px;border:1px solid currentColor;font-size:9px;font-weight:900;white-space:nowrap}.xa-review-priority.review{color:#92400e;background:#fff}.xa-review-priority.blocker{color:#991b1b;background:#fff}.xa-ref-pill{display:inline-flex;margin:2px 3px 2px 0;padding:2px 6px;border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#334155;text-decoration:none;font-size:9px}.xa-inline-ref{display:inline-flex;align-items:center;padding:0 3px;margin:0 1px;border-radius:4px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-weight:800;text-decoration:none;font-size:.86em}.xa-source-ref-entry{scroll-margin-top:24px}.xa-source-ref-entry:target{background:#eff6ff;box-shadow:0 0 0 2px #93c5fd inset;border-radius:8px}.xa-canonical-sources{margin:28px 0 8px;padding-top:4px}.xa-source-list{padding-left:22px}.xa-source-list li{margin:10px 0;padding:8px 10px}.xa-source-support,.xa-source-evidence,.xa-source-provenance,.xa-source-freshness{margin-top:5px;font-size:11px;line-height:1.45;color:#475569}.xa-source-provenance{font-weight:600;color:#334155}.xa-source-freshness{padding:6px 8px;border-left:3px solid #f59e0b;background:#fffbeb;border-radius:6px;color:#78350f}.xa-source-evidence{padding:6px 8px;border-left:3px solid #cbd5e1;background:#f8fafc;border-radius:6px}.xa-source-links{margin-top:6px;display:flex;flex-wrap:wrap;gap:6px}.xa-source-open{display:inline-flex;padding:3px 7px;border:1px solid #bfdbfe;border-radius:7px;background:#eff6ff;color:#1d4ed8;text-decoration:none;font-size:10px;font-weight:750}.xa-ref-missing{color:#991b1b;border-color:#fecaca;background:#fef2f2}.xa-ref-help{margin:8px 0 14px;padding:8px 10px;border:1px solid #dbeafe;border-radius:8px;background:#f8fbff;color:#475569;font-size:11px}.xa-no-reference{font-size:10px;color:#92400e}.xa-semantic-chip{display:inline-flex;align-items:center;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:800;border:1px solid transparent}.xa-semantic-green{background:#dcfce7;color:#065f46;border-color:#86efac}.xa-semantic-amber{background:#fef3c7;color:#92400e;border-color:#fcd34d}.xa-semantic-red{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
.xa-analysis-block{margin:10px 0 14px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:9px;background:#fff}.xa-analysis-block>strong{display:block;margin-bottom:5px;color:#334155}.xa-analysis-block p{margin:0}.xa-analysis-block ul{margin:6px 0 0;padding-left:20px}.xa-analysis-block li{margin:4px 0}
@media(max-width:760px){.xa-sme-field-head{align-items:flex-start;flex-direction:column}.xa-manual-sfdc-inline-row{grid-template-columns:1fr}.xa-manual-sfdc-inline-row button{width:100%}}
</style>
</head>
<body>
${bodyHtml}
<script>
(function(){
  async function copyText(text){
    if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return;}
    const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.focus();ta.select();document.execCommand("copy");ta.remove();
  }
  document.addEventListener("click",async function(e){
    const btn=e.target.closest("[data-copy-review]"); if(!btn)return;
    const target=document.getElementById(btn.getAttribute("data-copy-review")); if(!target)return;
    const old=btn.textContent;
    try{await copyText(target.innerText||target.textContent||"");btn.textContent="Copied";setTimeout(()=>btn.textContent=old,1400);}catch(err){btn.textContent="Copy failed";setTimeout(()=>btn.textContent=old,1800);}
  });
})();
</script>
</body>
</html>`;
  }

  // ===========================================================================
  // STORAGE / DOWNLOAD / COPY
  // ===========================================================================

  function selectedJobReportHtml(job) {
    const refs = (job.references || []).map((r,i)=>{ const url=safeUrl(r.url); const label=escapeHtml(r.title||r.url||`Reference ${i+1}`); return `<li>${url?`<a href="${escapeHtml(url)}">${label}</a>`:label}${r.type?` <span class="small">(${escapeHtml(r.type)})</span>`:""}</li>`; }).join("");
    const cards = humanDecisionFields(job).map(f=>humanFieldCardHtml(job,f)).join("");
    const learning = tacLearningCardHtml(job);
    const knowledgeSummary = conciseKnowledgeSummary(job.knowledgeDecisionExplanation || "");
    const knowledge = /NO KNOWLEDGE ACTION|NOT APPLICABLE/i.test(job.knowledgeAction||"") ? "" : `<div class="xa-sme-field-card xa-sme-info"><div class="xa-sme-field-head"><strong>Knowledge Reuse</strong><span class="pill info">${escapeHtml(job.knowledgeAction||"—")}</span></div>${knowledgeSummary?`<div class="xa-sme-why">${escapeHtml(knowledgeSummary)}</div>`:""}</div>`;
    return `<article class="ticket" id="${escapeHtml(job.xsup)}"><h1>${escapeHtml(jobDisplayKey(job))} Retrospective Audit</h1><div class="meta"><span class="pill info">Build: ${escapeHtml(VERSION)} / ${escapeHtml(BUILD_ID)}</span><span class="pill info">Product: ${escapeHtml(productLabel(job))}</span>${job.caseNumber?`<span class="pill info">SFDC: ${escapeHtml(job.caseNumber)}</span>`:""}</div>${auditAtGlanceHtml(job)}<div class="section"><h2>Review Paste Comment</h2><div class="xa-copy-row"><button type="button" class="xa-copy-review" data-copy-review="xa-review-comment-${escapeHtml(job.xsup)}">Copy Review Comment</button></div><div class="comment" id="xa-review-comment-${escapeHtml(job.xsup)}">${escapeHtml(job.xsupComment||"Not available")}</div></div><details class="xa-details"><summary>XSUP retrospective review details</summary><div class="section">${tacAnalysisDetailsHtml(job)}</div></details>${refs?`<div class="section"><h2>References</h2><ol class="refs">${refs}</ol></div>`:""}</article>`;
  }

  async function downloadJobReport(job, { auto = false } = {}) {
    if (!job?.auditAnswer) return false;
    if (auto && job.autoSaved) return false;

    const body = selectedJobReportHtml(job);
    await downloadBlob(
      auditFilename(job),
      htmlDoc(`${jobDisplayKey(job)} Retrospective Audit`, body),
      "text/html;charset=utf-8"
    );

    job.autoSaved = true;
    if (job.xsup === state.selectedXsup) renderExecutionPipeline(job);
    renderDashboard();
    return true;
  }

  async function maybeAutoSaveJob(job) {
    if (!state.autoSaveCompleted) return false;
    if (!job?.auditAnswer || job.autoSaved) return false;

    const downloaded = await downloadJobReport(job, { auto: true });
    if (downloaded) {
      showToast(state.saveDirectoryHandle ? `✓ ${job.xsup} audit saved to ${state.saveDirectoryName}` : `↓ ${job.xsup} audit downloaded`, "ok");
    }
    return Boolean(downloaded);
  }

  function removeKnowledgeSection(text, names) {
    let out = String(text || "");
    for (const name of names) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp(`(?:^|\\n)##\\s+${escaped}\\s*\\n[\\s\\S]*?(?=\\n##\\s+|$)`, "i"), "\n");
    }
    return out.replace(/\n{3,}/g,"\n\n").trim();
  }

  function cleanReviewDisplayText(value) {
    return cleanText(value || "")
      .replace(/^\s*\d+[.)]\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/^WHAT:\s*/i, "")
      .replace(/\s+WHY:\s+/i, " — Why: ")
      .trim();
  }

  function reviewSourceIdentityHtml(refs, refMap) {
    const parts=[];
    for (const key of refs || []) {
      const ref=refMap?.get?.(key);
      const identity=cleanText(ref?.identity || "Source reference");
      const provenance=cleanText(ref ? knowledgeSourceProvenance(ref) : "");
      const suffix=provenance && !normalizeFieldValueForCompare(identity).includes(normalizeFieldValueForCompare(provenance)) ? ` · ${provenance}` : "";
      parts.push(`<span class="xa-review-source-item"><a class="xa-ref-pill" href="#xa-source-${escapeHtml(key)}">[${escapeHtml(key)}]</a> ${escapeHtml(identity)}${suffix?`<span class="xa-review-source-type">${escapeHtml(suffix)}</span>`:""}</span>`);
    }
    return parts.join(" ");
  }

  const REVIEW_KIND_VALUES = new Set([
    "UI_NAVIGATION","CLI_COMMAND","API_CONTRACT","TIMING_SLA","FILE_LOG_PATH",
    "SOURCE_CURRENTNESS","MISSING_SOURCE_OR_LINK","DERIVATIVE_AI_EVIDENCE",
    "INTERNAL_ARCHITECTURE","DOCUMENTATION_PLACEMENT","CITATION_GAP","OTHER_MATERIAL_VALIDATION"
  ]);

  function inferReviewKindFromClaim(item) {
    const core = `${item?.target || ""} ${item?.what || ""} ${item?.outcome || ""} ${item?.conflict || ""}`.toLowerCase();
    if (/missing (?:direct )?(?:source )?link|direct link.*(?:missing|unavailable)|add the direct (?:source )?link|source (?:is )?unavailable/.test(core)) return "MISSING_SOURCE_OR_LINK";
    if (/derivative evidence|generated\/synthesized|ai-assisted|case chat|tacopilot|\btaco\b/.test(core)) return "DERIVATIVE_AI_EVIDENCE";
    if (/authoritative \[r#\] citation|citation gap|attach the exact supporting|missing citation/.test(core)) return "CITATION_GAP";
    if (/source freshness|historical (?:source|case|evidence)|superseded|current applicability|still valid|originating case|support-case evidence|source age/.test(core)) return "SOURCE_CURRENTNESS";
    if (/timing|latency|propagation|cadence|completion window|\bsla\b|\b\d+\s*(?:to|-|–)\s*\d+\s*(?:seconds?|minutes?|hours?|days?)|\b(?:within|up to|every|after|in)\s+(?:approximately\s+)?\d+\s*(?:seconds?|minutes?|hours?|days?)/.test(core)) return "TIMING_SLA";
    if (/\bcli\b|command syntax|debug command|powershell|cytool|playground|![a-z0-9_<>{}-]+/.test(core)) return "CLI_COMMAND";
    if (/public api|api\s+(?:route|request|endpoint|version|schema|payload|contract|call|method)|payload|request schema|response schema|\/api\//.test(core)) return "API_CONTRACT";
    if (/file name|filesystem|(?:file|log)\s+path|directory path|cloudidagentdebug|cloudidagentconfig|\\program files|\/var\/|\/opt\//.test(core)) return "FILE_LOG_PATH";
    if (/guide\/page ownership|section where|placement|insertion|cross-link location|documentation placement|target guide|chapter placement|maintained owner/.test(core)) return "DOCUMENTATION_PLACEMENT";
    if (/\bui\b|navigation|menu|console\s+(?:path|navigation|screen)|click\s+(?:the|on)|screen path|page path/.test(core)) return "UI_NAVIGATION";
    if (/internal architecture|backend|worker|chunk|queue|calculation job|processing stage|internal service|implementation detail/.test(core)) return "INTERNAL_ARCHITECTURE";
    return "";
  }

  function normalizeReviewKind(item) {
    const raw = cleanText(item?.reviewKind || "").toUpperCase().replace(/[ -]+/g,"_");
    const aliases = {
      UI:"UI_NAVIGATION", CLI:"CLI_COMMAND", API:"API_CONTRACT", TIMING:"TIMING_SLA", TIMING_CONFLICT:"TIMING_SLA",
      FILE_PATH:"FILE_LOG_PATH", MISSING_LINK:"MISSING_SOURCE_OR_LINK", DERIVATIVE_SOURCE:"DERIVATIVE_AI_EVIDENCE",
      INTERNAL_ARCH:"INTERNAL_ARCHITECTURE", DOC_PLACEMENT:"DOCUMENTATION_PLACEMENT", XQL_SCHEMA:"OTHER_MATERIAL_VALIDATION",
      CONFLICT:"OTHER_MATERIAL_VALIDATION", OTHER:"OTHER_MATERIAL_VALIDATION"
    };
    const explicit = aliases[raw] || raw;
    const inferred = inferReviewKindFromClaim(item);
    if (inferred && inferred !== explicit) return inferred;
    if (REVIEW_KIND_VALUES.has(explicit)) return explicit;
    return inferred || "OTHER_MATERIAL_VALIDATION";
  }

  function knowledgeReviewWhy(item) {
    const kind = normalizeReviewKind(item);
    if (kind === "TIMING_SLA") return "Exact timing can be interpreted as a product SLA or operational promise. Confirm the same mechanism, stage, scope and release before authoritative reuse, and keep observations distinct from guaranteed behavior.";
    if (kind === "CLI_COMMAND") return "Exact command syntax and platform support can change by product/agent release. A wrong command would make the procedure fail even when the underlying diagnosis is correct.";
    if (kind === "API_CONTRACT") return "API routes, versions, prerequisites and request/response schemas are operational contracts. A stale or inferred contract can break automation.";
    if (kind === "UI_NAVIGATION") return "UI labels and navigation paths can change by tenant/release. Confirm the current path so the procedure remains usable.";
    if (kind === "FILE_LOG_PATH") return "Exact file names, log names and filesystem paths can change by platform/version and should be confirmed against maintained guidance.";
    if (kind === "DOCUMENTATION_PLACEMENT") return "Documentation placement must be confirmed with the maintained owner/page so the proposed update is actionable and does not duplicate guidance.";
    if (kind === "INTERNAL_ARCHITECTURE") return "Internal implementation details can change independently of public behavior. Validate them with current SME/Engineering evidence and keep them TAC-only unless maintained public authority supports reuse.";
    if (kind === "MISSING_SOURCE_OR_LINK") return "The cited source cannot be efficiently reviewed without a usable direct link/source identity or an explicit statement that it is unavailable in the current evidence.";
    if (kind === "CITATION_GAP") return "A material reusable claim needs an explicit supporting source mapping so reviewers do not have to infer which evidence supports it.";
    if (kind === "DERIVATIVE_AI_EVIDENCE") return "Generated/AI-assisted synthesis can help discover evidence but cannot become the sole authority for a reusable product claim.";
    if (kind === "SOURCE_CURRENTNESS") return "Historical or case-specific evidence can remain useful context, but current applicability must be confirmed before a material reusable technical claim is treated as authoritative.";
    return cleanReviewDisplayText(item?.why || "This material claim requires validation before authoritative reuse.");
  }

  function applyKnowledgeReviewHighlights(htmlText, items, refMap = null) {
    const root = document.createElement("div");
    root.innerHTML = String(htmlText || "");
    const placed=[];
    const labelBase = item => item.status === "BLOCKER" ? "✕ BLOCKER" : normalizeReviewKind(item) === "SOURCE_CURRENTNESS" ? "⚠ REVIEW CURRENTNESS" : "⚠ REVIEW";
    const sourceRefs = item => [...new Set((item?.refs||[]).map(x=>String(x||"").toUpperCase()).filter(x=>/^R\d+$/.test(x)))];
    const concreteTarget = item => {
      const t=cleanText(item?.target || "");
      return t && !/^NONE$/i.test(t) && !/^R\d+$/i.test(t) && !/^(?:Source References|Existing Knowledge Reference|API example)$/i.test(t) ? t : "";
    };
    const norm = value => cleanText(String(value||"").replace(/\[[Rr]\d+\]/g,"")).toLowerCase().replace(/[“”]/g,'"').replace(/[’]/g,"'").replace(/\s+/g," ").trim();
    const esc = value => escapeHtml(value);
    const calloutHtml = (item,id) => {
      const cls=item.status === "BLOCKER" ? "blocker" : "review";
      const refs=sourceRefs(item);
      const sourceHtml=refs.length?`<span class="xa-inline-review-source"><b>${refs.length>1?"Sources":"Source"}:</b> ${reviewSourceIdentityHtml(refs,refMap)}</span>`:"";
      const claim=concreteTarget(item);
      const claimHtml=claim?`<span class="xa-inline-review-line xa-review-claim"><b>Claim under review:</b> ${esc(claim)}</span>`:"";
      const kind=normalizeReviewKind(item);
      const kindHtml=`<span class="xa-inline-review-line"><b>Review type:</b> ${esc(kind.replace(/_/g," "))}</span>`;
      return `<span class="xa-inline-review-callout ${cls}" data-xa-review-id="${id}"><span class="xa-inline-review-badge">${esc(labelBase(item))} ${id}</span><b>What to review:</b> ${esc(cleanReviewDisplayText(item.what || item.target || "Review this detail."))}${claimHtml}${kindHtml}${sourceHtml}<span class="xa-inline-review-line"><b>Why:</b> ${esc(knowledgeReviewWhy(item))}</span><span class="xa-inline-review-line"><b>Required action:</b> ${esc(knowledgeReviewRequiredOutcome(item))}</span></span>`;
    };
    const markerHtml=(item,id)=>`<span class="xa-inline-review-marker ${item.status === "BLOCKER"?"blocker":"review"}" data-xa-review-id="${id}">${esc(labelBase(item))} ${id}</span>`;
    const blockSelectors="p,li,h1,h2,h3,h4,td,th,blockquote";
    const allBlocks=()=>[...root.querySelectorAll(blockSelectors)].filter(el=>!el.closest('.xa-inline-review-callout'));
    const targetScore=(text,target)=>{
      const a=norm(text), b=norm(target); if(!a||!b) return -1;
      if(a===b) return 1000+b.length;
      if(a.includes(b)) return 800+b.length;
      if(b.includes(a) && a.length>=28) return 650+a.length;
      const bt=new Set((b.match(/[a-z0-9_./:-]{4,}/g)||[])); const at=new Set((a.match(/[a-z0-9_./:-]{4,}/g)||[]));
      if(bt.size<2) return -1; let overlap=0; for(const t of bt) if(at.has(t)) overlap++;
      const ratio=overlap/Math.min(bt.size,12); return ratio>=0.45 ? Math.round(ratio*500)-Math.abs(a.length-b.length)/20 : -1;
    };
    const bestBlockFor = query => {
      let best=null,bestScore=-1;
      if(query){for(const el of allBlocks()){const score=targetScore(el.textContent,query);if(score>bestScore){bestScore=score;best=el;}}}
      return {block:best,score:bestScore};
    };
    const refBlock = refs => {
      for(const ref of refs){const a=root.querySelector(`a.xa-inline-ref[href="#xa-source-${ref}"]`);if(a){const b=a.closest(blockSelectors);if(b)return b;}}
      return null;
    };
    const resolveTarget = (item,refs) => {
      const target=concreteTarget(item);
      if(target){
        const exact=bestBlockFor(target);
        if(exact.block && exact.score>=200) return {block:exact.block,target,score:exact.score};
        const semanticQuery=cleanText(`${target} ${item?.what || ""}`);
        const semantic=bestBlockFor(semanticQuery);
        if(semantic.block && semantic.score>=260){
          const resolved=cleanText(semantic.block.textContent||"").replace(/\[[Rr]\d+\]/g,"").trim().slice(0,420);
          if(resolved) return {block:semantic.block,target:resolved,score:semantic.score};
        }
        // A material claim review with no canonical target must not silently attach to a nearby R# citation.
        return null;
      }
      const sourceOnly = ["MISSING_SOURCE_OR_LINK","CITATION_GAP","DERIVATIVE_AI_EVIDENCE"].includes(normalizeReviewKind(item));
      const block=sourceOnly ? refBlock(refs) : null;
      return block ? {block,target:"",score:0} : null;
    };
    const highlightExactInBlock=(block,target,cls)=>{
      if(!block||!target)return false;
      const targetNorm=norm(target); if(!targetNorm)return false;
      const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT,{acceptNode(node){return node.parentElement?.closest('.xa-inline-review-callout,.xa-inline-review-marker')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}});
      const nodes=[]; let node; while((node=walker.nextNode())) nodes.push(node);
      for(const n of nodes){const raw=n.nodeValue||""; const idx=raw.indexOf(target); if(idx>=0){const before=raw.slice(0,idx), hit=raw.slice(idx,idx+target.length), after=raw.slice(idx+target.length); const span=document.createElement('span'); span.className=`xa-review-highlight ${cls}`; span.textContent=hit; const frag=document.createDocumentFragment(); if(before)frag.appendChild(document.createTextNode(before));frag.appendChild(span);if(after)frag.appendChild(document.createTextNode(after));n.parentNode.replaceChild(frag,n);return true;}}
      return false;
    };
    const markRefs=(refs,cls)=>{for(const ref of refs){for(const a of root.querySelectorAll(`a.xa-inline-ref[href="#xa-source-${ref}"]`)){a.classList.add('xa-review-ref',cls);}}};

    const candidates=[];
    for(const raw of (items||[])){
      const item={...raw,reviewKind:normalizeReviewKind(raw)};
      const refs=sourceRefs(item); markRefs(refs,item.status==='BLOCKER'?'blocker':'review');
      const resolved=resolveTarget(item,refs);
      if(!resolved?.block) continue;
      item.target=resolved.target || item.target;
      candidates.push({item,refs,target:resolved.target,block:resolved.block,score:resolved.score});
    }
    candidates.sort((a,b)=>{
      if(a.block===b.block)return b.score-a.score;
      const pos=a.block.compareDocumentPosition(b.block); return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    let id=0;
    for(const c of candidates){
      id++;
      const cls=c.item.status==='BLOCKER'?'blocker':'review';
      const exact=highlightExactInBlock(c.block,c.target,cls);
      if(c.target && !exact) c.block.classList.add('xa-review-block-highlight',cls);
      const isHeading=/^H[1-6]$/.test(c.block.tagName || "");
      if(isHeading) c.block.insertAdjacentHTML('afterend',calloutHtml(c.item,id));
      else c.block.insertAdjacentHTML('beforeend',markerHtml(c.item,id)+calloutHtml(c.item,id));
      placed.push(id);
    }
    return {html:root.innerHTML,count:placed.length,placedIds:placed};
  }
  function knowledgeReviewRequiredOutcome(item) {
    const explicit = cleanText(item?.outcome || "");
    const kind = normalizeReviewKind(item);
    const core = `${item?.target || ""} ${item?.what || ""} ${item?.conflict || ""}`;
    const q = `${core} ${item?.why || ""}`;
    const hasConflict = /conflict|contradict|disagree|inconsistent|different statements?/i.test(`${item?.conflict || ""} ${item?.what || ""}`);
    let outcome = "";
    if (kind === "MISSING_SOURCE_OR_LINK") {
      outcome = explicit || "Add the direct URL/source identity for the cited source. If the current evidence genuinely does not provide one, state ‘Direct link not available in current evidence’ beside that source instead of asking the reviewer to search for it manually.";
    } else if (kind === "DERIVATIVE_AI_EVIDENCE") {
      outcome = explicit || "Trace the highlighted claim to original authoritative/internal evidence. Replace the derivative source as authority; if no original authority can be established, remove or generalize the claim.";
    } else if (kind === "SOURCE_CURRENTNESS") {
      outcome = explicit || "Validate the highlighted claim against current maintained documentation or current SME/Engineering confirmation for the same product, mechanism, scope and release. Retain the historical source only as background if current applicability is not established.";
    } else if (kind === "CITATION_GAP") {
      outcome = explicit || "Attach the exact supporting R# citation to the highlighted material claim. If no authoritative source supports it, generalize or remove the unsupported exact detail.";
    } else if (kind === "API_CONTRACT") {
      outcome = "Confirm the current API documentation, supported version/base path, prerequisites and request/response schema; correct or remove any exact route or payload that is not current.";
    } else if (kind === "CLI_COMMAND") {
      outcome = "Confirm the exact supported command syntax, platform and applicable product/version from the current command reference. If the command administers a third-party system, also make the TAC support boundary explicit; otherwise generalize or remove it.";
    } else if (kind === "UI_NAVIGATION") {
      outcome = "Confirm the current UI path for the applicable release/tenant and update the navigation steps if they differ.";
    } else if (kind === "DOCUMENTATION_PLACEMENT") {
      outcome = "Identify the maintained documentation owner, page and target section/insertion point so the update is actionable and does not create duplicate guidance.";
    } else if (kind === "FILE_LOG_PATH") {
      outcome = "Confirm the maintained file/log/path reference for the applicable platform/version, or replace the exact path with a generalized diagnostic instruction.";
    } else if (kind === "INTERNAL_ARCHITECTURE") {
      outcome = "Validate the internal architecture/implementation detail with current SME or Engineering evidence. Keep it TAC-only and observational unless current maintained documentation explicitly supports public reuse.";
    } else if (kind === "TIMING_SLA") {
      outcome = "Confirm the supported timing for the same mechanism/stage/scope and distinguish observed timing from a guaranteed SLA. Generalize or remove exact timing that is not currently supported.";
    } else if (/quality validation|temporarily unavailable|independent quality/i.test(q)) {
      outcome = "Complete the independent quality review or document the manual SME review before treating the draft as publication-ready.";
    } else if (item?.status === "BLOCKER") {
      outcome = explicit || "Resolve the issue with authoritative evidence or remove/rewrite the affected content before publication.";
    } else {
      outcome = explicit || "Verify the affected material detail against an authoritative source and update, generalize, or remove it so the final guidance is safe to reuse.";
    }
    if (hasConflict) outcome += " Reconcile only sources that describe the same mechanism, event, stage, scope and outcome; do not treat different stages or mechanisms as a conflict.";
    return outcome;
  }
  function knowledgeReferenceIdentityMap(artifact) {
    const parsed = parseKnowledgeSourceReferences(artifact);
    const out = {};
    for (const [key, ref] of parsed.entries()) out[key] = ref.identity;
    return out;
  }

  function applyKnowledgeReferenceTitles(html, refMap) {
    return String(html || "").replace(/title="Source reference R(\d+)"/g, (_, n) => {
      const key = `R${n}`;
      const identity = refMap?.[key] || "Source reference";
      return `title="${escapeHtml(`${key} · ${identity}`)}"`;
    });
  }

  function normalizeReusableKnowledgeForDisplay(artifact, type) {
    let text = stripRawTimingNotes(stripInternalKnowledgeMetadata(artifact || ""));
    // The rendered/downloaded artifact is a reusable knowledge asset, not a case/RCA report.
    text = text
      .split(/\r?\n/)
      .filter(line => !/^\s*\*\*(Generated From|Knowledge Type):\*\*/i.test(line.trim()))
      .join("\n")
      .replace(/\bAccording to the root cause analysis,?\s*/gi, "")
      .replace(/\bAccording to the RCA,?\s*/gi, "")
      .replace(/\bAccording to the investigation,?\s*/gi, "")
      .replace(/Option\s+1:\s*Trigger Accelerated Synchronization via Interactive User Session\s*\(Immediate Workaround\)/gi, "Option 1: Attempt prioritized synchronization via interactive user session (timing not guaranteed)")
      .replace(/\bImmediate Workaround\b/gi, "Optional reprioritization attempt (timing not guaranteed)")
      .replace(/If an immediate policy update is required/gi, "If a faster policy update is desired")
      .replace(/(?:A complete )?logoff\/logon can reprioritize synchronization\.(?![^\n]{0,140}does not guarantee)/gi, "A complete logoff/logon can reprioritize synchronization, but it does not guarantee a specific completion time or a sub-hour policy transition.")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (type === "KCS_DRAFT" || type === "KCS_UPDATE") {
      text = text.replace(/\bThis case (?:showed|demonstrated|confirmed) that\s+/gi, "");
    }
    return text;
  }
  function refsNearTarget(artifact, target) {
    if (!target) return [];
    const lines = String(artifact || "").split(/\r?\n/);
    const i = lines.findIndex(line => line.includes(target));
    if (i < 0) return [];
    const refsIn = value => [...new Set((String(value || "").match(/R\d+/gi) || []).map(x=>x.toUpperCase()))];
    const same = refsIn(lines[i]);
    if (same.length) return same.slice(0,4);
    // If the target is inside a fenced code block, inherit only from the line
    // that introduces that exact code block; never from an adjacent bullet.
    let fenceStart = -1;
    for (let x=i; x>=0; x--) {
      if (/^\s*```/.test(lines[x])) { fenceStart = x; break; }
      if (/^##\s+/.test(lines[x])) break;
    }
    if (fenceStart >= 0) {
      for (let x=fenceStart-1; x>=Math.max(0,fenceStart-3); x--) {
        if (/^##\s+/.test(lines[x])) break;
        const refs = refsIn(lines[x]);
        if (refs.length) return refs.slice(0,4);
      }
    }
    return [];
  }

  function timingMechanismFromContext(context, timingIndex = 0) {
    const text = String(context || "");
    const concepts = [
      {key:"directory-sync", re:/DSS|Cloud Identity|CIE|directory\s+sync|directory\s+synchroni[sz]|AD\s+(?:group|OU)|group\s+synchroni[sz]|sync interval/gi},
      {key:"endpoint-tags", re:/endpoint\s+tags?|tag assignment|assign(?:ed|ment)?\s+tag/gi},
      {key:"interactive-session", re:/log\s*off|logoff|log\s*on|logon|interactive\s+user|session|reprioriti[sz]/gi},
      {key:"backend", re:/calculation jobs?|batch jobs?|backend|worker|chunk|queue/gi},
      {key:"policy-propagation", re:/policy.*(?:apply|update|propagat)|propagat.*policy/gi}
    ];
    let best = null;
    for (const concept of concepts) {
      concept.re.lastIndex = 0;
      for (const m of text.matchAll(concept.re)) {
        const center = (m.index || 0) + String(m[0] || "").length / 2;
        const d = Math.abs(center - timingIndex);
        if (!best || d < best.distance) best = {key:concept.key, distance:d};
      }
    }
    return best && best.distance <= 220 ? best.key : "general";
  }

  function bestReviewTargetFromPublicBody(publicBody, reviewText) {
    const queryTokens = new Set((String(reviewText || "").toLowerCase().match(/[a-z0-9_./:-]{4,}/g) || []).filter(x=>!/[\[\]()*]/.test(x)));
    if (queryTokens.size < 2) return "";
    const candidates = String(publicBody || "").split(/\r?\n|(?<=[.!?])\s+/).map(x=>cleanText(x)).filter(x=>x.length>=24 && x.length<=420 && !/^#{1,6}\s/.test(x));
    let best = {score:0,text:""};
    for (const candidate of candidates) {
      const tokens = new Set((candidate.toLowerCase().match(/[a-z0-9_./:-]{4,}/g) || []));
      if (!tokens.size) continue;
      let overlap=0;
      for (const token of queryTokens) if (tokens.has(token)) overlap++;
      let score=overlap/Math.max(3,Math.min(queryTokens.size,12));
      const numbers=[...queryTokens].filter(x=>/^\d+(?:\.\d+)?$/.test(x));
      if(numbers.length && numbers.every(n=>tokens.has(n))) score+=0.25;
      if(score>best.score) best={score,text:candidate};
    }
    return best.score>=0.24 ? best.text.slice(0,320) : "";
  }

  function deriveConcreteReviewItems(artifact, type) {
    const text = String(artifact || "");
    const reviewBody = removeKnowledgeSection(text, ["Source References", "TAC/SME Validation Items", "Validation Items", "Knowledge Reuse Basis — Internal Drafting Note", "Knowledge Reuse Basis", "Internal Notes — Full Context (Internal Only)", "Internal Notes — TAC Only", "Internal Notes"]);
    const items = [];
    const seen = new Set();
    const add = (target, what, why, owner = "TAC / SME / Documentation owner", status = "REVIEW", conflict = "", outcome = "", reviewKind = "", refsOverride = []) => {
      target = cleanText(target || "");
      if (!target || seen.has(`${status}|${target}|${what}`)) return;
      seen.add(`${status}|${target}|${what}`);
      const refs = (refsOverride && refsOverride.length) ? refsOverride : refsNearTarget(text, target);
      items.push({status, target, owner, what, conflict:cleanText(conflict || ""), why, outcome:cleanText(outcome || ""), reviewKind:cleanText(reviewKind || ""), refs});
    };
    const first = re => reviewBody.match(re)?.[0] || "";

    const validationSection = extractKnowledgeSection(text, ["TAC/SME Validation Items", "Validation Items"]);
    if (validationSection && !/^(none|none identified|not applicable|n\/a|no additional validation items(?: identified)?)[.!]?$/i.test(cleanText(validationSection))) {
      const bullets = String(validationSection).split(/\r?\n/).map(x=>cleanText(x.replace(/^[-*+]\s*/, ""))).filter(Boolean);
      for (const bullet of bullets.slice(0,6)) {
        const lower = bullet.toLowerCase();
        if (/macos|linux|cross-platform/.test(lower) && /Windows endpoints|Windows Sign out|cytool/i.test(reviewBody) && !/macos|linux/i.test(reviewBody)) continue;
        if (/\/tags\/agents\/(?:assign|remove)|public api request parameter schema/.test(lower) && !/\/tags\/agents\/(?:assign|remove)/i.test(reviewBody)) continue;
        if (/10\s*(?:to|-|–)\s*15|15\s*(?:to|-|–)\s*30/.test(lower) && !/(?:10\s*(?:to|-|–)\s*15|15\s*(?:to|-|–)\s*30)\s*minutes?/i.test(reviewBody)) continue;
        let why = "This material operational detail was explicitly marked for validation in the reused draft and should be confirmed before the artifact is used as authoritative guidance.";
        let owner = "TAC SME / Knowledge owner";
        let reviewKind = "OTHER_MATERIAL_VALIDATION";
        if (/timing|latency|minutes?|hours?|propagation|sync|cadence|sla/.test(lower)) {
          why = "Exact timing can be interpreted as a product SLA. Confirm the supported timing and scope so the article/guide does not promise a narrower behavior than the authoritative evidence supports.";
          owner = "Product SME / Documentation owner"; reviewKind = "TIMING_SLA";
        } else if (/public api|api\s+(?:route|request|endpoint|version|schema|payload|contract|call|method)|payload|request schema|response schema|\/api\//.test(lower)) {
          why = "API routes and request schemas are operational instructions and may vary by release; an incorrect contract would break automation.";
          owner = "API SME / Documentation owner"; reviewKind = "API_CONTRACT";
        } else if (/\bxql\b|dataset|query field|field names?|dataset schema/.test(lower)) {
          why = "The exact query or field name is operational guidance and must match the supported dataset/schema.";
          owner = "TAC SME / Documentation owner"; reviewKind = "OTHER_MATERIAL_VALIDATION";
        } else if (/command|\bcli\b|cytool|powershell|playground/.test(lower)) {
          why = "The exact command or syntax is operational guidance. Confirm that it is supported on the stated platform/product scope and that any third-party administrative boundary is clear before publication.";
          owner = "TAC SME / Documentation owner"; reviewKind = "CLI_COMMAND";
        } else if (/\bui\b|navigation|menu|console(?:\s+(?:path|navigation|screen))?/.test(lower)) {
          why = "UI navigation can change by tenant/release. Confirm the current path so the procedure remains usable rather than sending readers to a stale location.";
          owner = "Documentation owner / TAC SME"; reviewKind = "UI_NAVIGATION";
        } else if (/documentation placement|target guide|chapter placement|technical publications|section placement/.test(lower)) {
          reviewKind = "DOCUMENTATION_PLACEMENT";
        }
        const conflict = /conflict|contradict|disagree|inconsistent/i.test(lower) ? bullet : "";
        if (conflict) reviewKind = "OTHER_MATERIAL_VALIDATION";
        const target = bestReviewTargetFromPublicBody(reviewBody, bullet) || "NONE";
        add(target, bullet, why, owner, "REVIEW", conflict, "", reviewKind);
      }
    }

    if (type === "KCS_DRAFT" || type === "DOC_UPDATE" || type === "KCS_UPDATE" || type === "RUNBOOK") {
      const timingPattern = /(?:typically\s+)?(?:within|up to|every|after|in)\s+(?:approximately\s+)?(?:\d+\s*(?:to|-|–)\s*\d+|\d+|one)\s*(?:seconds?|minutes?|hours?|days?)|\b\d+\s*(?:to|-|–)\s*\d+\s*(?:seconds?|minutes?|hours?|days?)/gi;
      const timingGroups = new Map();
      for (const tm of reviewBody.matchAll(timingPattern)) {
        const target = cleanText(tm[0]);
        const pos = tm.index || 0;
        const endPos = pos + target.length;
        const leftStops = [reviewBody.lastIndexOf(".", pos-1), reviewBody.lastIndexOf("\n", pos-1), reviewBody.lastIndexOf("·", pos-1)];
        const left = Math.max(...leftStops) + 1;
        const rightStops = [reviewBody.indexOf(".", endPos), reviewBody.indexOf("\n", endPos), reviewBody.indexOf("·", endPos)].filter(x=>x>=0);
        const right = rightStops.length ? Math.min(...rightStops) + 1 : reviewBody.length;
        const ctx = reviewBody.slice(Math.max(0,left), right);
        const localTimingIndex = Math.max(0, pos - Math.max(0,left));
        let key = timingMechanismFromContext(ctx, localTimingIndex);
        if (key === "backend") {
          if (/^every\b/i.test(target)) key = "backend-cadence";
          else if (/^up to\b/i.test(target)) key = "backend-completion-window";
          else key = "backend-timing";
        }
        const claim = cleanText(ctx.replace(/\[R\d+\]/gi, "")).slice(0,320) || target;
        const refs = [...new Set((ctx.match(/R\d+/gi)||[]).map(x=>x.toUpperCase()))];
        if (!timingGroups.has(key)) timingGroups.set(key, []);
        if (!timingGroups.get(key).some(x=>normalizeFieldValueForCompare(x.target)===normalizeFieldValueForCompare(target))) timingGroups.get(key).push({target,claim,ctx,refs});
      }
      for (const [key, vals] of timingGroups) {
        const target = vals[0]?.claim || vals[0]?.target || "Timing statement";
        const distinct = vals.map(x=>x.target);
        const baseTimingLabel = key.replace(/-/g," ");
        const timingLabel = /timing|cadence|window|propagation/i.test(baseTimingLabel) ? baseTimingLabel : `${baseTimingLabel} timing`;
        const conflict = "";
        const what = key === "backend-cadence"
          ? "Verify the exact backend processing cadence and whether it is an internal implementation detail or a supported reusable product expectation."
          : key === "backend-completion-window"
            ? "Verify the exact backend/batch completion window and whether it is a supported reusable product expectation rather than an implementation observation."
            : key === "backend-timing"
              ? "Verify the exact backend processing timing and whether it is an internal implementation detail or supported reusable behavior."
          : key === "endpoint-tags"
            ? "Verify the exact Endpoint Tags timing and avoid presenting a historical observation as a guaranteed SLA."
            : "Verify the exact synchronization / policy-propagation timing and use one supported statement consistently.";
        const why = /^backend-/.test(key)
          ? "Internal processing timing can change and should not become a customer-visible promise unless current maintained evidence explicitly supports the exact scope and metric."
          : "Exact timing can be interpreted as a product SLA. Historical cases and different processing stages can contain different observations, so current supported behavior must be confirmed.";
        add(target, what, why, "Product SME / Documentation owner", "REVIEW", conflict, "", "TIMING_SLA", vals[0]?.refs || []);
      }

      const api = first(/(?:POST\s+)?\/tags\/agents\/(?:assign|remove)/i);
      if (api) add(api,
        "Verify the public API endpoint name, supported API version, request schema and prerequisites before retaining this example.",
        "Exact API routes and payload contracts are operational instructions; publishing an outdated or incomplete route can cause failed automation.",
        "Documentation owner / API SME", "REVIEW", "", "", "API_CONTRACT");

      const cli = first(/cytool\s+(?:endpoint_tags|policy\s+check)[^\n`]*/i);
      if (cli) add(cli,
        "Verify the command syntax and supported agent/platform scope before retaining the command.",
        "CLI syntax and feature availability can vary by agent release/platform; the reusable artifact should only include commands confirmed by an authoritative source.",
        "Endpoint SME / Documentation owner", "REVIEW", "", "", "CLI_COMMAND");

      const containerImage = first(/\b[a-z0-9._-]+\/[a-z0-9._-]+:[a-z0-9._-]+\b/i);
      if (containerImage) add(containerImage,
        "Verify the exact container/image name and tag against current maintained product guidance before retaining it as a reusable requirement.",
        "Exact image tags can change independently of the surrounding procedure. A historical or inferred tag should not be presented as the supported default unless current authority confirms it.",
        "Product SME / Documentation owner", "REVIEW", "", "", "OTHER_MATERIAL_VALIDATION");

      const xql = first(/dataset\s*=\s*pan_dss_raw/i);
      if (xql) add(xql,
        "Verify the XQL example and field names used in the query against the supported dataset schema.",
        "A documentation/KCS query must be directly runnable; incorrect field names would make the troubleshooting guidance fail even when the product behavior is correct.",
        "TAC SME / Documentation owner", "REVIEW", "", "", "OTHER_MATERIAL_VALIDATION");

      const cieLog = first(/CloudIdAgentDebug\.log|CloudIdAgentConfig\.xml|C:\\Program Files \(x86\)\\Palo Alto Networks\\Cloud Identity Agent/i);
      if (cieLog && !refsNearTarget(text, cieLog).length) add(cieLog,
        "Verify the exact CIE connector log/file name and path against a maintained source, or generalize this check.",
        "Exact file names and filesystem paths can change by release and should not be published from a single case observation without an authoritative reference.",
        "CIE / Documentation owner", "REVIEW", "", "", "FILE_LOG_PATH");
    }

    const mapped = parseKnowledgeSourceReferences(text);
    const used = knowledgeUsedReferenceIds(text);
    const claimMapForLinks = knowledgeReferenceClaimMap(text);
    for (const [key, ref] of mapped) {
      if (!(ref.urls || []).length && !/Direct link not available in current evidence/i.test(`${ref.identity || ""} ${ref.evidence || ""}`)) {
        const claims = claimMapForLinks.get(key) || [];
        const target = claims[0] || key;
        const identity = cleanText(ref.identity || key);
        const before = items.length;
        add(target,
          `Add the direct source link for ${key} — ${identity} — or explicitly state that the link is unavailable in the current evidence.`,
          "This source is being used in the draft, but the reviewer cannot open it directly from the evidence set. That makes verification unnecessarily ambiguous and can hide a stale or misidentified source.",
          "Knowledge owner / Documentation owner", "REVIEW", "", "", "MISSING_SOURCE_OR_LINK");
        if (items.length > before) items[items.length - 1].refs = [key];
      }
    }
    if (type === "KCS_DRAFT" && /Agent versions?\s+7\.x,\s*8\.x/i.test(reviewBody) && /Windows Sign out|C:\\Program Files/i.test(reviewBody)) {
      add("Applies To",
        "Scope the article to the platform/version evidence actually supported, or add authoritative references for cross-platform applicability.",
        "The current procedure is Windows-specific while the applicability statement is broader; unsupported platform scope can mislead TAC and customers.",
        "Product SME / Knowledge owner");
    }
    if ((type === "KCS_DRAFT" || type === "DOC_UPDATE") && /(?:POST\s+)?\/tags\/agents\/(?:assign|remove)/i.test(reviewBody) && !/api version|request schema|payload/i.test(reviewBody)) {
      add("API example",
        "Either provide the authoritative API documentation link plus supported version/base path/payload schema, or remove the incomplete endpoint example.",
        "A bare API route is not an actionable automation example and can become stale across releases.",
        "API SME / Documentation owner");
    }
    if ((type === "KCS_DRAFT" || type === "DOC_UPDATE" || type === "KCS_UPDATE") && mapped.size && !used.size) {
      add("Source References",
        "Map every material product-behavior, timing, command/API and remediation claim to the specific supporting R# source entry in the body.",
        "A source list without claim-level citations forces the reviewer to guess which evidence supports each statement. This artifact is not citation-ready until the body has exact R# mappings.",
        "TAC SME / Knowledge owner", "BLOCKER");
    }
    if ((type === "KCS_DRAFT" || type === "DOC_UPDATE" || type === "KCS_UPDATE") && mapped.size && used.size) {
      const highRisk = /\b(?:by design|requires?|must|only|automatically|guarantees?|does not|cannot|root cause|timeout|cadence|synchroni[sz]|propagat|API|CLI|PowerShell|HTTP \d{3}|seconds?|minutes?|hours?|days?)\b/i;
      const uncited = reviewBody.split(/(?<=[.!?])\s+|\n+/).map(cleanText).filter(x => x.length >= 45 && x.length <= 260 && highRisk.test(x) && !/\[R\d+(?:\s*,\s*R\d+)*\]/i.test(x) && !/^#{1,4}\s/.test(x));
      for (const sentence of uncited.slice(0,4)) {
        add(sentence.slice(0,320),
          "Add or confirm the authoritative [R#] citation for this material technical claim, or generalize/remove the unsupported exact detail.",
          "The draft already has sources, so reviewers should not have to infer which source supports a high-impact behavior, timing, command, limitation or root-cause statement.",
          "TAC SME / Knowledge owner", "REVIEW", "", "", "CITATION_GAP");
      }
    }

    if (type === "KCS_UPDATE") {
      const existing = extractKnowledgeSection(text, ["Existing Knowledge Reference"]);
      if (!existing || /^(none|not identified|unknown|n\/a)/i.test(cleanText(existing)) || !/(https?:\/\/|\bka\w+\b|\bKCS\b|knowledge)/i.test(existing)) {
        add("Existing Knowledge Reference",
          "Identify the exact existing KCS by title plus ID/link before treating this as an update proposal.",
          "An UPDATE EXISTING KCS action is not actionable unless the owner knows which article to change; otherwise the correct action is CREATE KCS or further validation.",
          "Knowledge owner / TAC SME", "BLOCKER");
      }
    }

    if (type === "DOC_UPDATE") {
      const placement = extractKnowledgeSection(text, ["Recommended Section / Placement"]);
      if (placement && /→|Policy Management|Administration Guide/i.test(placement)) {
        const target = cleanText(placement).slice(0,180);
        add(target,
          "Confirm the current guide/page ownership and the exact section where this wording should be inserted or cross-linked.",
          "A documentation update is useful only when the documentation owner can place it in the correct maintained guide rather than creating a duplicate or orphan section.",
          "Documentation owner");
      }
    }
    return items.sort((a,b)=>(a.status==="BLOCKER"?-1:0)-(b.status==="BLOCKER"?-1:0)).slice(0,10);
  }

  function reviewTargetNeedsClaim(target) {
    const t = cleanText(target || "");
    return !t || /^NONE$/i.test(t) || /^R\d+$/i.test(t) || /^(?:Source References|Existing Knowledge Reference|API example|Applies To)$/i.test(t) || /conflict\s*\/\s*ambiguity$/i.test(t);
  }

  function bestClaimForReviewRefs(refs, query, claimMap) {
    let best = {score:-999, claim:""};
    for (const key of refs || []) {
      for (const claim of claimMap.get(key) || []) {
        let score = materialReviewClaimScore(claim);
        const qTokens = new Set((String(query || "").toLowerCase().match(/[a-z0-9_./:-]{4,}/g) || []));
        const cTokens = new Set((String(claim || "").toLowerCase().match(/[a-z0-9_./:-]{4,}/g) || []));
        let overlap = 0;
        for (const token of qTokens) if (cTokens.has(token)) overlap++;
        score += Math.min(5, overlap);
        if (score > best.score) best = {score, claim};
      }
    }
    return best.score >= 1 ? cleanText(best.claim).slice(0,320) : "";
  }

  function enrichKnowledgeReviewItemRefs(items, artifact, refMap) {
    const claimMap = knowledgeReferenceClaimMap(artifact);
    return (items || []).map(item => {
      let refs = item.refs?.length ? [...item.refs] : [];
      if (!refs.length) refs = item.target && !/^NONE$/i.test(item.target) ? refsNearTarget(artifact, item.target) : [];
      if (!refs.length) {
        const query = `${item.what || ""} ${item.conflict || ""} ${item.why || ""}`;
        const candidates = [];
        for (const [key, ref] of refMap || []) {
          const sourceIdentity = `${ref?.identity || ""} ${ref?.supports || ""} ${ref?.evidence || ""}`;
          if (/public api|api\s+(?:route|request|endpoint|version|schema|payload|contract|call|method)|endpoint.*payload|request schema/i.test(query) && !/api guide|developer|public api/i.test(sourceIdentity)) continue;
          if (/CloudIdAgent|filesystem|file name|log\/file/i.test(query) && !/CloudIdAgent|Cloud Identity.*log|connector.*log/i.test(sourceIdentity)) continue;
          const score = sourceMatchScore(query, ref, claimMap.get(key) || []);
          if (score >= 0.52) candidates.push({key,score});
        }
        candidates.sort((a,b)=>b.score-a.score);
        refs = candidates.slice(0,2).map(x=>x.key);
      }
      refs = [...new Set(refs.map(x=>String(x||"").toUpperCase()).filter(x=>/^R\d+$/.test(x)))];
      let target = cleanText(item.target || "");
      if (reviewTargetNeedsClaim(target) && refs.length && !/MISSING_LINK/i.test(item.reviewKind || "")) {
        const claim = bestClaimForReviewRefs(refs, `${item.what || ""} ${item.why || ""} ${item.conflict || ""}`, claimMap);
        if (claim) target = claim;
      }
      if (/^R\d+$/i.test(target) && refs.length) {
        const claim = bestClaimForReviewRefs(refs, `${item.what || ""} ${item.why || ""}`, claimMap);
        if (claim) target = claim;
      }
      return {...item, target, refs};
    });
  }
  function pruneKnowledgeReviewItems(items, artifact, type) {
    const publicBody = removeKnowledgeSection(String(artifact || ""), ["Source References", "TAC/SME Validation Items", "Validation Items", "Knowledge Reuse Basis — Internal Drafting Note", "Knowledge Reuse Basis", "Internal Notes — Full Context (Internal Only)", "Internal Notes — TAC Only", "Internal Notes"]);
    return (items || []).filter(item => {
      const q = `${item?.target || ""} ${item?.what || ""} ${item?.conflict || ""} ${item?.why || ""}`;
      if (/quality validation|temporarily unavailable|independent quality/i.test(q)) return false;
      const kind = normalizeReviewKind(item);
      const sourceOnly = ["MISSING_SOURCE_OR_LINK","DERIVATIVE_AI_EVIDENCE"].includes(kind);
      if (!sourceOnly && !reviewClaimIsMaterial(item?.target || "")) return false;
      if (/\/tags\/agents\/(?:assign|remove)|public api request parameter schema/i.test(q) && !/\/tags\/agents\/(?:assign|remove)/i.test(publicBody)) return false;
      if (/macos|linux|cross-platform/i.test(q) && /Windows endpoints|Windows Sign out|cytool/i.test(publicBody) && !/macos|linux/i.test(publicBody)) return false;
      if (/10\s*(?:to|-|–)\s*15|15\s*(?:to|-|–)\s*30/i.test(q) && !/(?:10\s*(?:to|-|–)\s*15|15\s*(?:to|-|–)\s*30)\s*minutes?/i.test(publicBody)) return false;
      if (/cytool\s+policy\s+check/i.test(q) && !/cytool\s+policy\s+check/i.test(publicBody)) return false;
      if (/Local CPU Contention|third-party antivirus|CPU starvation|agent_chunk/i.test(q) && !/Local CPU Contention|third-party antivirus|CPU starvation|agent_chunk/i.test(publicBody)) return false;
      return true;
    });
  }

  function compactKnowledgeSourceIdentity(key, ref, maxLen = 132) {
    const identity = cleanText(ref?.identity || key || "Source reference");
    const provenance = cleanText(knowledgeSourceProvenance(ref) || "");
    let label = `${key} — ${identity}`;
    if (provenance && !normalizeFieldValueForCompare(identity).includes(normalizeFieldValueForCompare(provenance))) label += ` (${provenance})`;
    if (label.length > maxLen) label = `${label.slice(0, maxLen - 1).replace(/\s+\S*$/, "")}…`;
    return label;
  }

  function materialReviewClaimScore(claim) {
    const text = cleanText(claim || "");
    if (!text || text.length < 24) return -10;
    let score = 0;
    if (/\b(?:requires?|must|only|automatically|cannot|does not|root cause|timeout|failed|failure|forbidden|error|support(?:ed)?|limit|cadence|synchroni[sz]|propagat|policy|permission|API|CLI|PowerShell|HTTP\s*\d{3}|seconds?|minutes?|hours?|days?|version|schema|endpoint|service|process|worker|queue|batch|result\s*=|toggle|path|command|field|dataset)\b/i.test(text)) score += 5;
    if (/\b(?:Introduction|Overview|Intended Audience|Applies To|Environment|Search Keywords|Target Documentation)\b/i.test(text)) score -= 4;
    if (/\b(?:this article|this guide|administrators and support engineers|following this workflow|provides diagnostic|helps engineers)\b/i.test(text)) score -= 2;
    if (/\b(?:observed|confirmed|verified|established|records?|returns?|fails?|prevents?|suppresses?|retains?|retries?|triggers?|enforces?)\b/i.test(text)) score += 2;
    if (/\d/.test(text)) score += 1;
    return score;
  }

  function bestMaterialReviewClaimForRef(key, ref, claimMap, reviewQuery = "") {
    const claims = [...(claimMap?.get(key) || [])];
    if (!claims.length) return "";
    const qTokens = new Set((String(reviewQuery || "").toLowerCase().match(/[a-z0-9_./:-]{4,}/g) || []));
    let best = {score:-999, claim:""};
    for (const claim of claims) {
      let score = materialReviewClaimScore(claim);
      const tokens = new Set((String(claim || "").toLowerCase().match(/[a-z0-9_./:-]{4,}/g) || []));
      let overlap = 0;
      for (const token of qTokens) if (tokens.has(token)) overlap++;
      score += Math.min(4, overlap);
      if (score > best.score) best = {score, claim};
    }
    return best.score >= 2 ? cleanText(best.claim).slice(0, 320) : "";
  }

  function internalMaterialClaimForRef(internalRaw, key) {
    for (const raw of String(internalRaw || "").split(/\r?\n/)) {
      if (!new RegExp(`\\b${key}\\b`, "i").test(raw)) continue;
      if (!/`[^`]+`|\b(?:API|CLI|command|PowerShell|path|file|log|worker|chunk|queue|job|cadence|seconds?|minutes?|hours?|version|schema|parameter|service|process|endpoint|payload|timeout|behavior|architecture)\b/i.test(raw)) continue;
      const claim = cleanText(raw.replace(/\[((?:R\d+[\s,;]*)+)\]/gi, "").replace(/^[-*+]\s*/, "").replace(/[*_`#]+/g, " "));
      if (claim.length >= 24) return claim.slice(0, 320);
    }
    return "";
  }

  function sourceCurrentnessWhy(ref, job, key) {
    const provenance = knowledgeSourceProvenance(ref);
    const identity = cleanText(ref?.identity || key);
    if (knowledgeSourceIsOriginatingCase(ref, job)) return `${key} is originating case/XSUP evidence (${identity}), so it proves what happened in that investigation but does not by itself establish that the same behavior is supported on the current release.`;
    if (/Salesforce Knowledge/i.test(provenance)) return `${key} is existing Salesforce Knowledge (${identity}). Its content may still be useful, but the current article/release applicability must be confirmed before an exact reusable claim is carried forward.`;
    if (/Jira|Engineering/i.test(provenance)) return `${key} is Jira/Engineering evidence (${identity}). Engineering observations can be implementation- or release-specific, so the exact reusable claim needs current applicability confirmation.`;
    if (/Confluence|Runbook/i.test(provenance)) return `${key} is internal guidance (${identity}). Confirm that the page/runbook is still maintained for the current product/release before using it as authority for this exact claim.`;
    if (/Salesforce Support Case/i.test(provenance)) return `${key} is support-case evidence (${identity}). It is evidence for that case, not automatically a current product guarantee.`;
    if (/External web research/i.test(provenance)) return `${key} is external web research (${identity}), so the exact product behavior must be traced to current official/maintained product authority before publication.`;
    return `${key} does not have enough current-authority evidence to treat this exact material claim as publication-ready without validation.`;
  }

  function reviewClaimIsMaterial(claim) {
    const c=cleanText(claim||"");
    if(!c || /^(?:Intended Audience|Target Audience|Target Documentation|Search Keywords|Applies To|Traceability|Origin|Generated From)\b/i.test(c)) return false;
    const materialSignal=/\b(?:requires?|must|does|fails?|uses?|supports?|returns?|updates?|synchron(?:ize|ise|ization|isation)?|timeout|setting|command|api|path|version|behavior|error|policy|permission|field|dataset|cause|resolution|workaround|limit|maximum|minimum|seconds?|minutes?|hours?|days?|when|if)\b|\b\d+(?:\.\d+)?\b/i.test(c);
    if(!materialSignal && /\b(?:intended|target) audience\b|^(?:this )?(?:document|article|guide) (?:is )?(?:intended|written) for\b/i.test(c)) return false;
    if(!materialSignal && /\b(?:traceability|originating source|source provenance|historical background|for traceability|for reference only|derived from the case)\b/i.test(c)) return false;
    const audienceLike = /^(?:[A-Za-z0-9/&() -]+(?:Administrators?|Engineers?|Support Engineers?|Knowledge owners?))(?:,\s*[A-Za-z0-9/&() -]+(?:Administrators?|Engineers?|Support Engineers?|Knowledge owners?))*(?:(?:,\s*)?and\s+[A-Za-z0-9/&() -]+(?:Administrators?|Engineers?|Support Engineers?|Knowledge owners?))?\.?$/i.test(c);
    if (audienceLike) return false;
    const roleOnly=/\b(?:Administrators?|Security Operations Engineers?|Integration Engineers?|TAC Support Engineers?|Technical Support Engineers?|Knowledge owners?)\b/i.test(c) && !materialSignal;
    return !roleOnly;
  }

  function deriveSourceGovernanceReviewItems(artifact, refMap, job) {
    const bodyUsed = knowledgeUsedReferenceIds(artifact);
    const claimMap = knowledgeReferenceClaimMap(artifact);
    const internalRaw = extractKnowledgeSectionRaw(artifact, ["Internal Notes — TAC Only", "Internal Notes — Full Context (Internal Only)", "Internal Notes"]);
    const internalUsed = new Set((String(internalRaw || "").match(/R\d+/gi) || []).map(x=>x.toUpperCase()));
    const allUsed = new Set([...bodyUsed, ...internalUsed]);
    const items = [];

    for (const key of allUsed) {
      const ref = refMap?.get(key); if (!ref) continue;
      const provenance = knowledgeSourceProvenance(ref);
      const derivative = /AI-assisted synthesis|Case Chat|TACopilot|\bTACO\b/i.test(`${provenance} ${ref.identity || ""}`);
      let bodyClaim = bodyUsed.has(key) ? bestMaterialReviewClaimForRef(key, ref, claimMap, `${ref.supports || ""} ${ref.evidence || ""}`) : "";
      if (!bodyClaim && derivative && bodyUsed.has(key)) bodyClaim = cleanText((claimMap.get(key) || [])[0] || "").slice(0,320);
      const internalClaim = !bodyClaim && internalUsed.has(key) ? internalMaterialClaimForRef(internalRaw, key) : "";
      const claim = bodyClaim || internalClaim;
      if (!reviewClaimIsMaterial(claim)) continue;

      // Background-only citations still show provenance/currentness in Source References,
      // but do not create a numbered body review unless this source materially supports
      // a reusable technical/operational claim that the reviewer can actually inspect.
      if (!claim) continue;

      const sourceLabel = compactKnowledgeSourceIdentity(key, ref);
      if (derivative) {
        items.push({
          status:"BLOCKER", target:claim, owner:"TAC SME / Knowledge owner", reviewKind:"DERIVATIVE_AI_EVIDENCE",
          what:`Trace the highlighted claim away from derivative evidence. ${sourceLabel} is generated/synthesized evidence and cannot be the sole authority for this reusable claim.`,
          why:`The highlighted claim currently depends on ${sourceLabel}. Generated/TACopilot/Case Chat/TACO synthesis can help discovery, but allowing it to become authority in later knowledge creates circular evidence.`,
          outcome:"Locate the original Jira/Engineering, Salesforce case evidence, maintained KCS/internal documentation, current official documentation, or explicit current SME confirmation for this exact claim. If no original authority can be established, remove or generalize the claim.",
          refs:[key]
        });
      } else if (knowledgeSourceNeedsFreshnessReview(ref, job)) {
        items.push({
          status:"REVIEW", target:claim, owner:"TAC SME / Knowledge owner", reviewKind:"SOURCE_CURRENTNESS",
          what:`Confirm the current applicability of ${sourceLabel} for the highlighted claim.`,
          why:sourceCurrentnessWhy(ref, job, key),
          outcome:"Compare the highlighted claim with current maintained documentation or current SME/Engineering confirmation for the same product, mechanism, scope and release. If current applicability is confirmed, retain it; otherwise update/generalize the claim and keep the older source only as historical/background evidence where useful.",
          refs:[key]
        });
      }
    }

    const timingPattern=/(?:typically\s+)?(?:within|up to|every|after|in)\s+(?:approximately\s+)?(?:\d+\s*(?:to|-|–)\s*\d+|\d+|one)\s*(?:seconds?|minutes?|hours?|days?)|\b\d+\s*(?:to|-|–)\s*\d+\s*(?:seconds?|minutes?|hours?|days?)/gi;
    const timingGroups=new Map();
    for(const [key,ref] of refMap||[]) {
      const evidenceText=`${ref?.supports||""} ${ref?.evidence||""}`; if(!evidenceText.trim()) continue;
      for(const tm of evidenceText.matchAll(timingPattern)) {
        const value=cleanText(tm[0]); const pos=tm.index||0; const endPos=pos+value.length;
        const left=Math.max(evidenceText.lastIndexOf(".",pos-1),evidenceText.lastIndexOf("\n",pos-1),evidenceText.lastIndexOf("·",pos-1))+1;
        const stops=[evidenceText.indexOf(".",endPos),evidenceText.indexOf("\n",endPos),evidenceText.indexOf("·",endPos)].filter(x=>x>=0);
        const right=stops.length?Math.min(...stops)+1:evidenceText.length; const ctx=evidenceText.slice(Math.max(0,left),right);
        const localTimingIndex=Math.max(0,pos-Math.max(0,left));
        const conceptKey=timingMechanismFromContext(ctx,localTimingIndex);
        let concept="";
        if(conceptKey==="directory-sync") concept="directory/DSS synchronization";
        else if(conceptKey==="endpoint-tags") concept="Endpoint Tags";
        else if(conceptKey==="interactive-session") concept="interactive-session synchronization";
        else if(conceptKey==="backend") concept=/^every\b/i.test(value)?"backend processing cadence":/^up to\b/i.test(value)?"backend batch completion window":"backend processing timing";
        else if(conceptKey==="policy-propagation") concept="policy propagation";
        if(!concept) continue;
        if(!timingGroups.has(concept)) timingGroups.set(concept,[]);
        const arr=timingGroups.get(concept); if(!arr.some(x=>normalizeFieldValueForCompare(x.value)===normalizeFieldValueForCompare(value)&&x.ref===key)) arr.push({value,ref:key});
      }
    }
    for(const [concept,vals] of timingGroups) {
      const distinct=[...new Set(vals.map(x=>normalizeFieldValueForCompare(x.value)))];
      const refs=[...new Set(vals.map(x=>x.ref))];
      if(distinct.length<2 || refs.length<2) continue;
      const detail=vals.map(x=>`${x.ref}: ${x.value}`).join("; ");
      const conceptLabel=/timing|cadence|window|propagation|synchronization/i.test(concept)?concept:`${concept} timing`;
      const target = refs.map(r=>bestMaterialReviewClaimForRef(r, refMap?.get(r), claimMap, conceptLabel)).find(Boolean) || `${conceptLabel} conflict / ambiguity`;
      items.push({status:"REVIEW",target,owner:"Product SME / Knowledge owner",reviewKind:"TIMING_SLA",what:`Reconcile the different ${conceptLabel} statements before authoritative reuse.`,conflict:`Independent supporting sources contain different statements for ${conceptLabel}: ${detail}.`,why:"Exact timing can be interpreted as a product promise. Only values describing the same mechanism, event, stage, scope and outcome should be treated as a true conflict.",outcome:"Compare the linked sources with current maintained product documentation/current SME or Engineering confirmation. Keep one current supported public statement, or explicitly distinguish different stages/mechanisms.",refs:refs.slice(0,8)});
    }
    return items;
  }
  function reviewItemSemanticKey(item) {
    const kind=normalizeReviewKind(item);
    const refs=[...new Set((item?.refs||[]).map(x=>String(x).toUpperCase()))].sort().join(",");
    const target=cleanText(item?.target||"");
    if(kind==="SOURCE_CURRENTNESS") return `${item.status}|${kind}|${refs}|${target}`;
    if(kind==="OTHER_MATERIAL_VALIDATION" && /conflict|contradict|disagree|inconsistent/i.test(`${item?.conflict||""} ${item?.what||""}`)) return `${item.status}|${kind}|${cleanText(item?.conflict||item?.what||target)}`;
    return `${item.status}|${kind}|${target}|${cleanText(item?.what||"")}`;
  }
  function mergeReviewItems(primary, derived) {
    const out = [];
    const seen = new Set();
    for (const item of [...(primary || []), ...(derived || [])]) {
      if (!item.what || !item.why) continue;
      item.reviewKind = normalizeReviewKind(item);
      const key = reviewItemSemanticKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function stripRawTimingNotes(value) {
    return String(value||"").split(/\r?\n/).map(line => line
      .replace(/\s*(?:[_*]{1,2})?\s*(?:Exact\s+)?(?:Timing|SLA)\s+(?:note|warning|caution)\s*:\s*.*?(?:[_*]{1,2})?\s*$/i, "")
      .replace(/\s*(?:[_*]{1,2})?\s*Reviewer\s+note\s*:\s*(?:this )?exact timing\b.*?(?:[_*]{1,2})?\s*$/i, "")
      .replace(/\s+$/,""))
      .join("\n").replace(/\n{3,}/g,"\n\n").trim();
  }

  function normalizePublicTimingEvidenceStrength(artifact, job = null) {
    const text=stripRawTimingNotes(artifact||"");
    const refMap=parseKnowledgeSourceReferences(text);
    const timing=/(?:typically\s+)?(?:within|up to|every|after|in)\s+(?:approximately\s+)?(?:\d+\s*(?:to|-|–)\s*\d+|\d+|one)\s*(?:seconds?|minutes?|hours?|days?)|\b\d+\s*(?:to|-|–)\s*\d+\s*(?:seconds?|minutes?|hours?|days?)/i;
    let section="", inFence=false;
    return text.split(/\r?\n/).map(line=>{
      const t=line.trim(); const h=t.match(/^#{1,6}\s+(.+)$/); if(h){section=cleanText(h[1]);return line;}
      if(/^```/.test(t)){inFence=!inFence;return line;}
      if(inFence || !t || /Source References|Internal Notes|TAC\/SME Validation Items|Validation Items|Search Keywords/i.test(section) || !timing.test(line)) return line;
      const refs=[...new Set((line.match(/R\d+/gi)||[]).map(x=>x.toUpperCase()))];
      const allCurrent=refs.length>0 && refs.every(key=>{const ref=refMap.get(key);return ref && knowledgeSourceReviewState(ref,job)==="CURRENT";});
      if(allCurrent) return line;
      return line
        .replace(/\btypically\s+occurs?\s+within\b/gi,"was observed in the cited/source context to occur within")
        .replace(/\btypically\s+takes?\b/gi,"was observed in the cited/source context to take")
        .replace(/\btypically\s+within\b/gi,"observed within");
    }).join("\n");
  }

  function knowledgeValidationNoticeHtml(status, job = null) {
    const blocker = status === "BLOCKER";
    const qualityUnavailable=/VALIDATION UNAVAILABLE|NOT RE-RUN/i.test(cleanText(job?.knowledgeQualityStatus||""));
    const qualityLine=qualityUnavailable ? " Independent quality validation was not available/re-run for this artifact; complete a manual SME review or re-run quality validation before treating it as publication-ready." : "";
    return `<div class="xa-validation-notice ${blocker?"blocker":"review"}"><div class="xa-validation-notice-title">${blocker?"✕ VALIDATION REQUIRED — BLOCKER":"⚠ VALIDATION REQUIRED — REVIEW"}</div><div class="xa-validation-notice-text">This is a generated draft based on the internal/product evidence available to TACopilot/XSUP Auditor. Cases, KCS articles, Confluence/runbooks, Jira/XSUP findings, web documentation and AI-assisted synthesis can be historical, version-specific, superseded or inaccurate. Validate every material technical claim against current supported product behavior and maintained sources before publication or authoritative reuse. Inline REVIEW/BLOCKER callouts identify each affected claim or reference and state what to verify, why, and the required action. Exact timing or operational observations from case/Engineering evidence are not product guarantees unless current maintained authority supports them. Internal Notes may preserve deeper sourced Engineering context for TAC, but that internal context is not automatically a current public product guarantee. Do not treat this draft itself as an authoritative source.${escapeHtml(qualityLine)}</div></div>`;
  }

  function knowledgeArtifactHtml(job) {
    const type = job.knowledgeArtifactType || knowledgeArtifactType(job);
    const label = knowledgeArtifactLabel(type);
    const normalizedArtifact = normalizeReusableKnowledgeForDisplay(job.knowledgeAnswer || "No knowledge draft available.", type);
    const envelopedArtifact = applySharedKnowledgeEvidenceEnvelope(job, normalizedArtifact, type);
    const artifact = normalizePublicTimingEvidenceStrength(envelopedArtifact, job);
    const rawAtGlance = extractKnowledgeSectionRaw(artifact, ["At a Glance"]);
    const atGlance = cleanAtGlanceSection(rawAtGlance);
    const refEntries = parseKnowledgeSourceReferences(artifact);
    const sourceRefIds = new Set(refEntries.keys());
    const bodyText = removeKnowledgeSection(artifact, ["At a Glance", "TAC/SME Validation Items", "Validation Items", "Related Knowledge / Documentation", "Source References"])
      .split(/\r?\n/)
      .filter(line => !/^\s*\*\*(Draft Status|Generated From|Knowledge Type):\*\*/i.test(line.trim()))
      .join("\n")
      .replace(/\n{3,}/g,"\n\n")
      .trim();
    const derivedItems = [...deriveConcreteReviewItems(artifact, type), ...deriveSourceGovernanceReviewItems(artifact, refEntries, job)];
    const items = pruneKnowledgeReviewItems(enrichKnowledgeReviewItemRefs(mergeReviewItems(job.specialReviewItems || [], derivedItems), artifact, refEntries), artifact, type);
    const publication = items.some(x=>x.status==="BLOCKER") ? "BLOCKER" : "REVIEW";
    const refIdentity = knowledgeReferenceIdentityMap(artifact);
    let bodyHtml = applyKnowledgeReferenceTitles(safeMarkdownToHtml(bodyText,{sourceRefIds}), refIdentity);
    const atGlanceHtml = applyKnowledgeReferenceTitles(atGlance ? renderInlineMarkdown(atGlance,{sourceRefIds}) : "Concise summary was not returned; review the article body.", refIdentity);
    const highlighted = applyKnowledgeReviewHighlights(bodyHtml, items, refEntries);
    bodyHtml = highlighted.html;
    const canonicalSources = renderKnowledgeSourceReferences(refEntries, artifact, job);
    const validationNotice = knowledgeValidationNoticeHtml(publication, job);
    const knowledgeDecision = existingKnowledgeDecisionHtml(job, artifact, type);
    return htmlDoc(`${jobDisplayKey(job)} ${label}`, `<article><h1>${escapeHtml(jobDisplayKey(job))} — ${escapeHtml(label)} <span class="xa-semantic-chip ${publication==="BLOCKER"?"xa-semantic-red":"xa-semantic-amber"}">${publication==="BLOCKER"?"✕ BLOCKER":"⚠ REVIEW"}</span></h1>
      ${validationNotice}
      ${knowledgeDecision}
      <div class="xa-at-glance-box"><div class="xa-at-glance-title">At a Glance</div><div class="xa-at-glance-text">${atGlanceHtml}</div></div>
      <div class="meta"><span class="pill info">Build: ${escapeHtml(VERSION)} / ${escapeHtml(BUILD_ID)}</span><span class="pill info">SFDC: ${escapeHtml(job.caseNumber || "—")}</span><span class="pill info">Product: ${escapeHtml(productLabel(job))}</span><span class="pill info">${knowledgeRoleLabel(job.knowledgeRole)} knowledge: ${escapeHtml(job.knowledgeAction || "—")}</span>${publication?`<span class="pill ${publication==="BLOCKER"?"bad":"warn"}">${escapeHtml(publication)}</span>`:""}${highlighted.count?`<span class="pill warn">Inline claim reviews: ${highlighted.count}</span>`:""}</div>
      ${sourceRefIds.size?'<div class="xa-ref-help"><strong>[R#]</strong> jumps to one canonical source entry at the bottom. Use the source link there to open Jira, SFDC, documentation, or the referenced case.</div>':""}
      <div class="section xa-knowledge-article-body">${bodyHtml}</div>${canonicalSources}</article>`);
  }

  function knowledgeFilename(job) {
    const type = job.knowledgeArtifactType || knowledgeArtifactType(job);
    const suffix = ({
      KCS_DRAFT: "KCS_Draft",
      KCS_UPDATE: "KCS_Update_Proposal",
      DOC_UPDATE: "Admin_Tech_Guide_Update_Proposal",
      RUNBOOK: "Runbook_Draft",
      KNOWN_ISSUE: "Known_Issue_Release_Note_Draft"
    })[type] || "Knowledge_Draft";
    return `${artifactBase(job, true)}_${suffix}.html`;
  }

  async function downloadKnowledgeArtifact(job, { auto = false } = {}) {
    if (!job?.knowledgeAnswer) return false;
    if (auto && job.knowledgeAutoSaved) return false;

    await downloadBlob(
      knowledgeFilename(job),
      knowledgeArtifactHtml(job),
      "text/html;charset=utf-8"
    );

    job.knowledgeAutoSaved = true;
    if (job.xsup === state.selectedXsup) renderExecutionPipeline(job);
    renderDashboard();
    return true;
  }

  function combinedAuditText() {
    return [...state.jobs.values()]
      .filter(j => j.auditAnswer)
      .map(j => `# ${j.xsup}${j.caseNumber ? ` · SFDC ${j.caseNumber}` : ""}\n\n${j.auditAnswer}`)
      .join("\n\n---\n\n");
  }

  function completedKnowledgeArtifactEntries(batchRunId = null) {
    const out = [];
    for (const job of state.jobs.values()) {
      if (batchRunId != null && Number(job.batchRunId || 0) !== Number(batchRunId)) continue;
      const artifacts = Array.isArray(job.knowledgeArtifacts)
        ? job.knowledgeArtifacts.filter(x => x.status === "completed" && x.answer)
        : [];
      if (artifacts.length) {
        for (const result of artifacts) out.push({job, result, context:knowledgeResultContext(job, result)});
      } else if (job.knowledgeAnswer) {
        out.push({job, result:null, context:job});
      }
    }
    return out;
  }

  function combinedKnowledgeText() {
    return completedKnowledgeArtifactEntries()
      .map(({job, context}) => `# ${job.xsup}${job.caseNumber ? ` · SFDC ${job.caseNumber}` : ""} — ${knowledgeArtifactLabel(context.knowledgeArtifactType)}\n\n${context.knowledgeAnswer}`)
      .join("\n\n---\n\n");
  }

  async function copyAllReports(button) {
    const txt = combinedAuditText();
    if (!txt) {
      setStatus("No completed audit reports to copy.", "error");
      return;
    }
    await copyWithFeedback(button, txt);
    setStatus("All completed audit reports copied.", "ok");
  }

  async function copyAllKnowledgeDrafts(button) {
    const txt = combinedKnowledgeText();
    if (!txt) {
      setStatus("No generated knowledge drafts to copy.", "error");
      return;
    }
    await copyWithFeedback(button, txt);
    setStatus("All generated knowledge drafts copied.", "ok");
  }

  function zipCrc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function zipConcat(parts) {
    const total = parts.reduce((n, part) => n + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) { out.set(part, offset); offset += part.length; }
    return out;
  }

  function zipLe16(value) {
    const out = new Uint8Array(2);
    new DataView(out.buffer).setUint16(0, value >>> 0, true);
    return out;
  }

  function zipLe32(value) {
    const out = new Uint8Array(4);
    new DataView(out.buffer).setUint32(0, value >>> 0, true);
    return out;
  }

  function zipDosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const dosTime = ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((Math.floor(date.getSeconds() / 2)) & 31);
    const dosDate = (((year - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31);
    return {dosTime, dosDate};
  }

  function makeStoredZip(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let localOffset = 0;
    const {dosTime, dosDate} = zipDosDateTime(new Date());

    for (const file of files) {
      const nameBytes = encoder.encode(String(file.name || "artifact.html"));
      const dataBytes = file.content instanceof Uint8Array ? file.content : encoder.encode(String(file.content || ""));
      const crc = zipCrc32(dataBytes);
      const size = dataBytes.length;
      const localHeader = zipConcat([
        zipLe32(0x04034b50), zipLe16(20), zipLe16(0x0800), zipLe16(0),
        zipLe16(dosTime), zipLe16(dosDate), zipLe32(crc), zipLe32(size), zipLe32(size),
        zipLe16(nameBytes.length), zipLe16(0), nameBytes
      ]);
      localParts.push(localHeader, dataBytes);

      const centralHeader = zipConcat([
        zipLe32(0x02014b50), zipLe16(20), zipLe16(20), zipLe16(0x0800), zipLe16(0),
        zipLe16(dosTime), zipLe16(dosDate), zipLe32(crc), zipLe32(size), zipLe32(size),
        zipLe16(nameBytes.length), zipLe16(0), zipLe16(0), zipLe16(0), zipLe16(0),
        zipLe32(0), zipLe32(localOffset), nameBytes
      ]);
      centralParts.push(centralHeader);
      localOffset += localHeader.length + dataBytes.length;
    }

    const central = zipConcat(centralParts);
    const local = zipConcat(localParts);
    const eocd = zipConcat([
      zipLe32(0x06054b50), zipLe16(0), zipLe16(0), zipLe16(files.length), zipLe16(files.length),
      zipLe32(central.length), zipLe32(local.length), zipLe16(0)
    ]);
    return new Blob([local, central, eocd], {type:"application/zip"});
  }

  async function downloadAllKnowledgeArtifacts(options = {}) {
    const entries = completedKnowledgeArtifactEntries(options.batchRunId ?? null);
    if (!entries.length) {
      if (!options.silent) setStatus("No generated knowledge drafts to save.", "error");
      return false;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const zipName = `XSUP_Knowledge_Drafts_${stamp}.zip`;
    const buildZip = () => makeStoredZip(entries.map(({context}) => ({
      name: knowledgeFilename(context),
      content: knowledgeArtifactHtml(context)
    })));
    try {
      if (options.userInitiated) await userSaveArtifact(zipName, buildZip, "application/zip");
      else await downloadBlob(zipName, buildZip(), "application/zip");
    } catch (err) {
      if (err?.name === "AbortError" && options.userInitiated) {
        if (!options.silent) setStatus("Knowledge ZIP save cancelled.", "");
        return false;
      }
      throw err;
    }
    const touchedJobs = new Set();
    for (const {job, result} of entries) {
      const delivery = state.saveDirectoryHandle ? "saved_to_folder" : options.userInitiated ? "saved_by_user" : "download_requested_zip";
      if (result) result.delivery = delivery;
      if (!touchedJobs.has(job)) {
        touchedJobs.add(job);
        job.knowledgeAutoDeliveryAttempted = true;
        job.knowledgeAutoSaved = Boolean(state.saveDirectoryHandle || options.userInitiated);
        job.knowledgeDeliveryState = delivery;
      }
    }
    renderDashboard();
    if (state.selectedXsup && state.jobs.get(state.selectedXsup)) renderSelectedJob();
    if (!options.silent) setStatus(`${entries.length} knowledge draft${entries.length===1?"":"s"} packaged and sent via ${storageDestinationLabel()}.`, "ok");
    return true;
  }

  async function maybeAutoDeliverKnowledgeBatch() {
    if (!state.autoSaveCompleted || state.saveDirectoryHandle) return;
    const runId = Number(state.batchRunId || 0);
    if (!runId || Number(state.knowledgeBatchAutoDeliveryRunId || 0) === runId) return;
    const entries = completedKnowledgeArtifactEntries(runId);
    if (!entries.length) return;
    state.knowledgeBatchAutoDeliveryRunId = runId;
    try {
      await downloadAllKnowledgeArtifacts({batchRunId:runId, silent:true});
      setStatus(`Knowledge artifacts are ready. Use Download All Knowledge Drafts for an explicit consolidated ZIP download.`, "ok");
      showToast(`↓ Knowledge drafts ready · ${entries.length} artifact${entries.length===1?"":"s"}`, "ok");
    } catch (err) {
      state.knowledgeBatchAutoDeliveryRunId = 0;
      console.warn("XSUP Auditor knowledge ZIP auto-delivery failed:", err);
      setStatus(`Knowledge artifacts are generated. If browser delivery was blocked, click Download All Knowledge Drafts.`, "error");
    }
  }

  function artifactTimestamp(job, knowledge = false) {
    const ts = knowledge
      ? (job?.knowledgeEndedAt || job?.endedAt || Date.now())
      : (job?.endedAt || Date.now());
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  function artifactBase(job, knowledge = false) {
    const sfdc = job?.caseNumber || "UNKNOWN";
    const xsup = actualXsup(job);
    const identity = xsup ? `${xsup}_SFDC-${sfdc}` : `SFDC-${sfdc}`;
    return `${identity}_${artifactTimestamp(job, knowledge)}`;
  }

  function auditFilename(job) {
    return `${artifactBase(job, false)}_Retrospective_Audit.html`;
  }

  // ---------------------------------------------------------------------------
  // Artifact storage
  // ---------------------------------------------------------------------------
  // Chrome's File System Access API lets the SME choose a real writable folder.
  // If the selected path is a desktop-synced Google Drive/OneDrive/shared folder,
  // the desktop sync client handles cloud synchronization; no Google API is needed.
  function browserDownload(filename, content, mime = "text/plain;charset=utf-8") {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function savePickerTypes(filename, mime) {
    const lower = String(filename || "").toLowerCase();
    if (lower.endsWith(".zip")) return [{description:"ZIP archive", accept:{"application/zip":[".zip"]}}];
    if (lower.endsWith(".html") || lower.endsWith(".htm")) return [{description:"HTML document", accept:{"text/html":[".html", ".htm"]}}];
    if (lower.endsWith(".json")) return [{description:"JSON file", accept:{"application/json":[".json"]}}];
    return [{description:"File", accept:{[String(mime || "application/octet-stream").split(";")[0] || "application/octet-stream"]:[`.${lower.split(".").pop() || "txt"}`]}}];
  }

  async function userSaveArtifact(filename, contentOrFactory, mime = "text/plain;charset=utf-8") {
    // Explicit artifact buttons must be reliable even when Chrome has blocked
    // background/multiple downloads. Open the native Save As picker BEFORE any
    // expensive Knowledge HTML/ZIP rendering so transient user activation cannot
    // expire while the artifact is being assembled.
    const materialize = () => typeof contentOrFactory === "function" ? contentOrFactory() : contentOrFactory;
    if (state.saveDirectoryHandle) return await saveArtifact(filename, materialize(), mime);

    if (typeof window.showSaveFilePicker === "function") {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: savePickerTypes(filename, mime)
      });
      const content = materialize();
      const writable = await handle.createWritable();
      try {
        const blob = content instanceof Blob ? content : new Blob([content], {type:mime});
        await writable.write(blob);
      } finally {
        await writable.close();
      }
      return {mode:"save_picker", filename};
    }

    // Fallback for browsers without the File System Access save picker. This call
    // remains directly inside the user-click handler, preserving user activation.
    browserDownload(filename, materialize(), mime);
    return {mode:"download", filename};
  }

  async function directoryPermissionState(handle) {
    if (!handle) return "none";
    try {
      if (typeof handle.queryPermission === "function") {
        return await handle.queryPermission({ mode: "readwrite" });
      }
    } catch (_) {}
    return "granted";
  }

  async function writeToSelectedDirectory(filename, content) {
    const handle = state.saveDirectoryHandle;
    if (!handle) throw new Error("No custom save folder is selected.");

    const permission = await directoryPermissionState(handle);
    if (permission === "denied") {
      throw new Error("Write permission for the selected folder is no longer available.");
    }

    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(content instanceof Blob ? content : String(content));
    } finally {
      await writable.close();
    }
  }

  function storageDestinationLabel() {
    return state.saveDirectoryHandle && state.saveDirectoryName
      ? `Selected folder: ${state.saveDirectoryName}`
      : "Browser Downloads";
  }

  async function saveArtifact(filename, content, mime = "text/plain;charset=utf-8") {
    if (state.saveDirectoryHandle) {
      try {
        await writeToSelectedDirectory(filename, content);
        return { mode: "folder", location: state.saveDirectoryName, filename };
      } catch (err) {
        // Saving must never change the audit result. If folder permission/path fails,
        // preserve the artifact by falling back to the browser's normal download path.
        console.warn("XSUP Auditor: folder save failed; using browser download fallback.", err);
        browserDownload(filename, content, mime);
        showToast(`⚠ Folder save failed · downloaded ${filename}`, "error");
        return { mode: "download", fallback: true, filename, error: err?.message || String(err) };
      }
    }

    browserDownload(filename, content, mime);
    return { mode: "download", filename };
  }

  // Report/export functions route through the same storage policy.
  async function downloadBlob(filename, content, mime = "text/plain;charset=utf-8") {
    return await saveArtifact(filename, content, mime);
  }

  async function chooseSaveFolder() {
    if (!state.fileSystemAccessSupported) {
      setStatus("Custom folder selection is unavailable in this browser. Browser Downloads will be used.", "error");
      return;
    }

    try {
      // Browser security requires this call to originate from an SME click.
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      if (!handle) return;

      state.saveDirectoryHandle = handle;
      state.saveDirectoryName = handle.name || "Selected folder";
      renderGlobalStorageStatus();
      renderStorageStatus();
      setStatus(`Save folder selected: ${state.saveDirectoryName}`, "ok");
      showToast(`✓ Artifacts will save to ${state.saveDirectoryName}`, "ok");
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("XSUP Auditor folder picker error:", err);
      setStatus(`Could not select folder: ${err?.message || err}. Browser Downloads remain available.`, "error");
    }
  }

  function renderGlobalStorageStatus() {
    const status = document.getElementById("xsup-auditor-storage-global-status");
    const detail = document.getElementById("xsup-auditor-storage-global-detail");
    if (!status) return;

    if (state.saveDirectoryHandle) {
      status.textContent = `✓ ${storageDestinationLabel()}`;
      status.dataset.kind = "ok";
      if (detail) detail.textContent = "Audit reports, knowledge drafts, batch exports and session files use this folder.";
    } else {
      status.textContent = "Browser Downloads";
      status.dataset.kind = "default";
      if (detail) {
        detail.textContent = state.fileSystemAccessSupported
          ? "Default Browser Downloads automatically requests each standalone artifact. The Audit is requested first; only then are Audit-selected Knowledge artifacts generated and auto-downloaded. Choose a folder when confirmed file writes are required."
          : "Custom folder selection is unavailable. Default Browser Downloads still auto-requests the Audit first and each later Audit-selected Knowledge artifact as a standalone file; individual Download buttons re-request the same standalone artifact.";
      }
    }
  }

  function renderStorageStatus() {
    const box = document.getElementById("xsup-auditor-storage-status");
    if (!box) return;

    box.innerHTML = `
      <div class="xa-storage-card">
        <div class="xa-storage-head">
          <div>
            <strong>${escapeHtml(storageDestinationLabel())}</strong>
            <span>${state.saveDirectoryHandle
              ? "Files are written directly here. Desktop sync software handles any cloud synchronization."
              : "Files use the browser's normal download location/behavior."}</span>
          </div>
          <div class="xa-actions" style="margin-top:0">
            <button id="xsup-auditor-choose-folder-detail" ${state.fileSystemAccessSupported ? "" : "disabled"}>${state.saveDirectoryHandle ? "Change Folder" : "Choose Folder"}</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById("xsup-auditor-choose-folder-detail")?.addEventListener("click", chooseSaveFolder);
  }


  async function downloadSelectedReport() {
    const job = getSelectedJob();
    if (!job?.auditAnswer) {
      setStatus("Select a completed XSUP first.", "error");
      return;
    }

    await downloadJobReport(job);
    setStatus(`${job.xsup} report saved via ${storageDestinationLabel()}.`, "ok");
  }

  async function downloadAllCompletedReports() {
    const completed = [...state.jobs.values()].filter(j => j.auditAnswer);

    if (!completed.length) {
      setStatus("No completed reports to download.", "error");
      return;
    }

    const toc = completed.map(j =>
      `<li><a href="#${escapeHtml(j.xsup)}">${escapeHtml(j.xsup)}</a> — ${escapeHtml(productLabel(j))} — ${escapeHtml(primaryReviewVerdict(j) || j.retrospectiveEligibility || "Complete")}</li>`
    ).join("");

    const body = `
      <h1>XSUP Retrospective Audit Batch</h1>
      <p class="small">Generated ${escapeHtml(new Date().toLocaleString())} · ${completed.length} completed audit${completed.length === 1 ? "" : "s"}</p>
      <h2>Contents</h2>
      <ol class="toc">${toc}</ol>
      ${completed.map(selectedJobReportHtml).join("\n")}
    `;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await downloadBlob(
      `XSUP_Retrospective_Batch_${stamp}.html`,
      htmlDoc("XSUP Retrospective Audit Batch", body),
      "text/html;charset=utf-8"
    );
    setStatus(`${completed.length} completed reports saved via ${storageDestinationLabel()}.`, "ok");
  }

  function exportSessionObject() {
    return {
      schema: "xsup-auditor-session-v1",
      exported_at: new Date().toISOString(),
      version: VERSION,
      concurrency: state.concurrency,
      product_selection_mode: state.productSelectionMode,
      auto_save_completed: state.autoSaveCompleted,
      auto_generate_knowledge: state.autoGenerateKnowledge,
      storage_mode_at_export: state.saveDirectoryHandle ? "selected_folder" : "browser_downloads",
      selected_folder_name_at_export: state.saveDirectoryName || "",
      selected_xsup: state.selectedXsup || "",
      view_mode: state.viewMode || "dashboard",
      jobs: [...state.jobs.values()].map(job => ({
        ...job,
        // Raw DOM/Abort objects are not stored; job fields are plain serializable data.
      }))
    };
  }

  async function saveAuditSession() {
    const jobs = [...state.jobs.values()];
    if (!jobs.length) {
      setStatus("No audit session to save.", "error");
      return;
    }

    const payload = JSON.stringify(exportSessionObject(), null, 2);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await downloadBlob(
      `XSUP_Auditor_Session_${stamp}.json`,
      payload,
      "application/json;charset=utf-8"
    );
    setStatus(`Session saved · ${jobs.length} XSUP${jobs.length === 1 ? "" : "s"}.`, "ok");
  }

  function sanitizeRestoredJob(raw) {
    const xsup = String(raw?.xsup || "").toUpperCase();
    if (!/^XSUP-\d+$/.test(xsup)) return null;

    const restored = {
      ...createJob(xsup),
      ...raw,
      xsup,
      artifactReadiness: raw?.artifactReadiness || normalizeArtifactReadiness(raw?.knowledgeAction, raw?.kcsReadiness || ""),
      status: raw?.status === "running" ? "stopped" : (raw?.status || "stopped"),
      stageLabel: raw?.status === "running" ? "Restored after interruption" : (raw?.stageLabel || ""),
      knowledgeStatus: raw?.knowledgeStatus === "generating" || raw?.knowledgeStatus === "queued"
        ? "stopped"
        : (raw?.knowledgeStatus || "not_evaluated"),
      knowledgeProgress: raw?.knowledgeStatus === "generating" || raw?.knowledgeStatus === "queued"
        ? "restored as stopped"
        : (raw?.knowledgeProgress || ""),
      error: raw?.status === "running"
        ? "This audit was active when the session was saved. It was restored as stopped; completed data was preserved."
        : (raw?.error || ""),
      knowledgeError: raw?.knowledgeStatus === "generating" || raw?.knowledgeStatus === "queued"
        ? "Knowledge generation was active when saved and was restored as stopped."
        : (raw?.knowledgeError || "")
    };

    // Ignore retired uploader-status fields if they are present in an imported session.
    for (const key of Object.keys(restored)) {
      if (/^drive(?:Audit|Knowledge)/.test(key)) delete restored[key];
    }

    return restored;
  }

  function restoreAuditSessionFromObject(payload) {
    if (!payload || payload.schema !== "xsup-auditor-session-v1" || !Array.isArray(payload.jobs)) {
      throw new Error("This is not a valid XSUP Auditor session file.");
    }

    state.jobs.clear();
    state.queue = [];
    state.productSelectionMode = payload.product_selection_mode === "manual" ? "manual" : "auto";
    state.concurrency = [2,3,5,10].includes(Number(payload.concurrency)) ? Number(payload.concurrency) : 2;
    state.activeCount = 0;
    state.running = false;
    state.stopped = false;
    state.controller = null;
    stopElapsedTimer();

    for (const raw of payload.jobs) {
      const job = sanitizeRestoredJob(raw);
      if (!job) continue;
      state.jobs.set(job.xsup, job);
    }

    const restoredAutoSave = payload.auto_save_completed ?? payload.auto_download_completed;
    state.autoSaveCompleted = restoredAutoSave !== false;
    state.autoGenerateKnowledge = payload.auto_generate_knowledge !== false;

    // Directory permission objects cannot be restored from JSON. A restored session
    // therefore returns to Browser Downloads until the SME chooses a folder again.
    state.saveDirectoryHandle = null;
    state.saveDirectoryName = "";
    state.knowledgeQueue = [];
    state.knowledgeActiveCount = 0;

    const autoToggle = document.getElementById("xsup-auditor-auto-download");
    if (autoToggle) autoToggle.checked = state.autoSaveCompleted;

    const knowledgeToggle = document.getElementById("xsup-auditor-auto-knowledge");
    if (knowledgeToggle) knowledgeToggle.checked = state.autoGenerateKnowledge;

    const productMode = document.getElementById("xsup-auditor-product-mode");
    if (productMode) productMode.value = state.productSelectionMode;
    const concurrencyMode = document.getElementById("xsup-auditor-concurrency");
    if (concurrencyMode) concurrencyMode.value = String(state.concurrency);
    updateConcurrencyUi();

    state.selectedXsup =
      payload.selected_xsup && state.jobs.has(payload.selected_xsup)
        ? payload.selected_xsup
        : "";

    state.viewMode = payload.view_mode === "detail" && state.selectedXsup
      ? "detail"
      : "dashboard";

    renderGlobalStorageStatus();
    renderJobList();
    renderDashboard();
    renderSelectedJob();
    updateBatchStatus();

    showToast(`✓ Restored ${state.jobs.size} XSUP audit${state.jobs.size === 1 ? "" : "s"}`, "ok");
  }

  function openRestoreSessionPicker() {
    const input = document.getElementById("xsup-auditor-restore-file");
    if (input) input.click();
  }

  async function handleRestoreSessionFile(file) {
    if (!file) return;
    const txt = await file.text();
    const payload = JSON.parse(txt);
    restoreAuditSessionFromObject(payload);
  }

  async function downloadDebug() {
    const job = getSelectedJob();
    if (!job?.evidence || !job?.report) {
      alert("Select a job with collected evidence first.");
      return;
    }

    const debug = {
      generated_at: new Date().toISOString(),
      version: VERSION,
      xsup: job.xsup,
      case_number: job.caseNumber,
      investigation_id: job.investigationId,
      status: job.status,
      product: {
        key: job.productKey,
        label: productLabel(job),
        confidence: job.productConfidence,
        selection_source: job.productSelectionSource,
        detection_reason: job.productDetectionReason,
        detection_scores: job.productDetectionScores
      },
      retrospective_eligibility: job.retrospectiveEligibility,
      review_verdict: primaryReviewVerdict(job),
      review_decisions: {
        reviewed_fields: job.reviewedFields,
        resolution_verdict: job.verdict,
        resolution_change_needed: job.resolutionChangeNeeded,
        rca_change_needed: job.rcaChangeNeeded,
        fix_type_change_needed: job.fixTypeChangeNeeded,
        label_change_needed: job.labelChangeNeeded,
        resolution_explanation: job.resolutionExplanation,
        rca_verdict: job.rcaVerdict,
        rca_change_needed: job.rcaChangeNeeded,
        fix_type_verdict: job.fixTypeVerdict,
        fix_type_change_needed: job.fixTypeChangeNeeded,
        label_verdict: job.labelVerdict,
        label_change_needed: job.labelChangeNeeded
      },
      taco_freshness: {
        decision: job.tacoDecision,
        reason: job.tacoDecisionReason,
        taco_analysis_at: job.tacoAnalysisAt,
        latest_case_evidence_at: job.latestCaseEvidenceAt
      },
      storage: {
        current_mode: state.saveDirectoryHandle ? "selected_folder" : "browser_downloads",
        selected_folder_name: state.saveDirectoryName || "",
        note: "Directory handles are browser permission objects and are intentionally not serialized."
      },
      knowledge: {
        primary_action: job.knowledgeAction,
        secondary_action: job.secondaryKnowledgeAction,
        artifact_readiness: job.artifactReadiness,
        status: job.knowledgeStatus,
        artifact_type: job.knowledgeArtifactType,
        artifact: job.knowledgeAnswer,
        artifacts: job.knowledgeArtifacts || [],
        error: job.knowledgeError
      },
      evidence: job.evidence,
      taco_report: {
        verified_conclusion: job.report?.verified_conclusion || null,
        hypotheses: job.report?.hypotheses || [],
        result: job.report?.result || null
      },
      final_audit: job.auditAnswer,
      immediate_operational_guidance: job.immediateOperationalGuidance || immediateOperationalGuidance(job),
      review_paste_comment: job.xsupComment,
      references: job.references,
      target_links: job.targetLinks
    };

    await downloadBlob(
      `${job.xsup}_SFDC-${job.caseNumber || "UNKNOWN"}_Audit_Debug.json`,
      JSON.stringify(debug, null, 2),
      "application/json;charset=utf-8"
    );
  }

  async function copyAllReviewComments(button) {
    const completed = [...state.jobs.values()]
      .filter(j => j.xsupComment)
      .map(j => `===== ${j.xsup} =====\n${j.xsupComment}`);

    if (!completed.length) {
      setStatus("No completed review comments to copy.", "error");
      return;
    }

    await copyWithFeedback(button, completed.join("\n\n"));
    setStatus(`${completed.length} review comments copied.`, "ok");
  }

  function showHelpMethodology() {
    document.getElementById("xsup-auditor-help-modal")?.remove();

    const modal = document.createElement("div");
    modal.id = "xsup-auditor-help-modal";
    modal.className = "xa-modal-backdrop";
    modal.innerHTML = `
      <div class="xa-modal xa-help-modal">
        <div class="xa-modal-head">
          <div><strong>Help & Methodology</strong><span>How the mixed-product retrospective workflow works.</span></div>
          <button class="xa-icon" id="xa-close-help">×</button>
        </div>
        <div class="xa-help-body">
          <div class="xa-help-repo">
            <div><strong>Full Documentation &amp; User Guide</strong><span>Usage, FAQ, security guidance and technical documentation.</span><a href="${escapeHtml(REPO_URL)}" target="_blank" rel="noopener noreferrer">${escapeHtml(REPO_URL)}</a></div>
            <a class="xa-help-repo-button" href="${escapeHtml(REPO_URL)}" target="_blank" rel="noopener noreferrer">Open GitHub ↗</a>
          </div>

          <h3>Where Case Chat is</h3>
          <p>The auditor automatically uses <b>TACopilot → Case → TACO Analysis → Case Chat</b>. Case Chat is available at the bottom of TACO Analysis after analysis exists. The user does not need to type the retrospective/knowledge prompts manually.</p>

          <h3>Products</h3>
          <p>One snippet supports <b>XDR/XSIAM, XSOAR and Cortex Cloud</b>. Product is detected from structured case/TACO metadata when reliable. Only high-confidence detection continues automatically; lower-confidence or conflicting detection pauses only that XSUP for reviewer confirmation.</p>
          <p>The selected product is shown in the Live Dashboard and XSUP detail. Before Retrospective Case Chat is submitted, the reviewer can change it. After the review starts/completes, changing product triggers a new retrospective/knowledge review while allowing current TACO/evidence to be reused when still current.</p>

          <h3>Product policies</h3>
          <ul>
            <li><b>XDR/XSIAM</b> — retrospective trigger/review: Resolution = Functions as designed. RCA is not part of the normal trigger.</li>
            <li><b>XSOAR</b> — trigger: Session_candidate label OR Fix Type = None / Functions as designed. Review only the applicable Fix Type and/or Flag/Label.</li>
            <li><b>Cortex Cloud</b> — trigger: Resolution = Duplicate, Not a Bug, Environment/Config issue, Invalid, Functions as designed, or Non Issue; OR RCA = User Error. <b>User Error is the only TAC-owned RCA value defined by the supplied retrospective policy.</b></li>
          </ul>
          <p>Only fields that are applicable under the selected product policy should be reviewed. Missing irrelevant fields are Not Applicable, not missing data. The tool does not invent additional TAC-owned RCA values beyond the approved product policy.</p>

          <h3>Concurrency</h3>
          <p>XSUP/TACO workers are reviewer-selectable at <b>2, 3, 5 or 10</b>, default 2. This parallelizes independent case resolution, evidence collection and TACO work. Knowledge remains at two workers, and a shared cap remains fixed at <b>two active Case Chat generations</b> across both pipelines so higher TACO parallelism does not multiply model-generation pressure.</p>

          <h3>Knowledge quality workflow</h3>
          <p>When knowledge is recommended, a knowledge worker first creates an enriched draft using directly relevant source material actually available to the Case Chat/TACO investigation. A separate quality-review Case Chat then rewrites/finalizes the artifact using a common quality rubric plus an artifact-specific rubric for KCS, documentation updates, runbooks or known issues/release notes.</p>
          <p>The final gate checks usefulness, completeness, actionability, generalization, evidence support, source relevance, consistency, readability, discoverability, audience fit and verification. Material validation items downgrade the final artifact to <b>DRAFTABLE</b>; unsafe/incomplete artifacts are marked <b>NOT READY</b> and are not downloaded as final knowledge.</p>

          <h3>Smart reuse</h3>
          <p>Before creating another Case Chat, the auditor reads follow-up history newest-first. Temporary-system-error answers are skipped. Across Auditor prompt/schema versions, the newest substantive result can be reused when it targets the same XSUP/product/artifact and no newer original Jira/SFDC evidence exists.</p>
          <p>The retrospective Audit inspects available existing KCS/docs/pages/prior evidence and explicitly selects the best Primary knowledge destination plus an optional distinct Secondary destination. No hidden companion KCS is added after the Audit. Dedicated Generate KCS remains KCS-family-only, compares actual existing Salesforce KCS content when available, and still allows <b>Create New KCS Anyway</b> when UPDATE is recommended.</p>
          <p><b>Retry Audit</b> reuses the retained current TACO/evidence when the Audit failed. <b>Generate KCS from TACO</b> can recover a KCS independently when TACO succeeded but Audit did not. <b>Retry KCS/Knowledge</b> retries only that downstream artifact. <b>Re-analyze All</b> deliberately refreshes TACO and regenerates everything.</p>

          <h3>Evidence and responsibility</h3>
          <p>TACO is derived technical analysis. Original Jira/SFDC records are required to prove what Engineering, TAC or the customer actually recorded/communicated. If evidence is insufficient, the safe result is <b>UNDETERMINED</b>.</p>
          <p>This is an internal decision-support tool. Review generated conclusions/knowledge before ticket changes, sharing or publication.</p>

          <h3>Storage</h3>
          <p>Default is browser download. A reviewer can explicitly choose a writable local or desktop-synced folder for the current page/session.</p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("#xa-close-help").onclick = () => modal.remove();
  }

  function updateConcurrencyUi() {
    const summary = document.getElementById("xsup-auditor-worker-summary");
    if (summary) summary.textContent = `${state.concurrency} XSUP/TACO workers · ${state.knowledgeConcurrency} knowledge workers · Case Chat max ${state.caseChatGenerationLimit}`;
    const side = document.getElementById("xsup-auditor-sidebar-workers");
    if (side) side.textContent = `${state.concurrency} workers`;
    const select = document.getElementById("xsup-auditor-concurrency");
    if (select && select.value !== String(state.concurrency)) select.value = String(state.concurrency);
  }

  function createUI() {
    document.getElementById("xsup-auditor-panel")?.remove();
    document.getElementById("xsup-auditor-bubble")?.remove();
    document.getElementById("xsup-auditor-toast")?.remove();
    document.getElementById("xsup-auditor-tooltip")?.remove();
    document.getElementById("xsup-auditor-style")?.remove();

    const style = document.createElement("style");
    style.id = "xsup-auditor-style";
    style.textContent = `
      #xsup-auditor-panel{position:fixed;right:20px;top:60px;z-index:2147483647;width:min(980px,calc(100vw - 40px));max-height:calc(100vh - 80px);overflow:auto;background:#fff;color:#111827;border:1px solid #c7d2fe;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.22);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:16px}
      #xsup-auditor-panel *{box-sizing:border-box}
      .xa-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.xa-title{font-size:18px;font-weight:750}.xa-sub{margin-top:3px;font-size:11px;color:#6b7280}.xa-head-actions{display:flex;align-items:center;gap:2px}.xa-icon{border:0;background:transparent;color:#6b7280;cursor:pointer}.xa-head-actions .xa-icon{width:34px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:7px;font-size:18px;transition:background .12s ease,transform .12s ease}.xa-head-actions .xa-icon:hover{background:#f3f4f6}.xa-head-actions .xa-icon:active{transform:scale(.94)}
      .xa-input-row{display:grid;grid-template-columns:1fr auto auto auto;gap:8px;margin-top:14px;align-items:stretch}#xsup-auditor-input{min-height:64px;max-height:130px;resize:vertical;border:1px solid #d1d5db;border-radius:9px;padding:9px 11px;font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}#xsup-auditor-run,#xsup-auditor-direct-kcs{border:0;border-radius:8px;padding:10px 14px;background:#4f46e5;color:#fff;font-weight:700;cursor:pointer}#xsup-auditor-direct-kcs{background:#0f766e!important}#xsup-auditor-stop{border:0;border-radius:8px;padding:10px 12px;background:#dc2626;color:#fff;font-weight:700;cursor:pointer}#xsup-auditor-run:disabled,#xsup-auditor-direct-kcs:disabled,#xsup-auditor-stop:disabled{opacity:.55;cursor:not-allowed}
      .xa-input-help{margin-top:5px;font-size:10px;color:#6b7280}.xa-toggle-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.xa-auto-download{display:flex;align-items:flex-start;gap:8px;margin-top:0;padding:8px 10px;border:1px solid #e5e7eb;border-radius:9px;background:#fafafa;cursor:pointer}.xa-auto-download input{margin-top:2px}.xa-auto-download span{display:flex;flex-direction:column;gap:2px}.xa-auto-download strong{font-size:11px}.xa-auto-download small{font-size:9px;color:#6b7280;line-height:1.35}.xa-status{margin-top:10px;padding:9px 10px;background:#f3f4f6;border-radius:8px;font-size:12px}.xa-status[data-kind="ok"]{background:#ecfdf5;color:#065f46}.xa-status[data-kind="error"]{background:#fef2f2;color:#991b1b}
      .xa-workspace{display:grid;grid-template-columns:220px minmax(0,1fr);gap:12px;margin-top:12px}.xa-sidebar{border:1px solid #e5e7eb;border-radius:11px;background:#fafafa;overflow:hidden;align-self:start;position:sticky;top:0}.xa-side-head{display:flex;align-items:center;justify-content:space-between;padding:9px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.xa-side-head span:last-child{font-weight:600;color:#6b7280;text-transform:none;letter-spacing:0}.xa-job-list{max-height:62vh;overflow:auto;padding:6px}.xa-job-empty{padding:12px 8px;color:#6b7280;font-size:11px;line-height:1.5}.xa-job{width:100%;display:flex;gap:8px;align-items:flex-start;border:1px solid transparent;background:transparent;border-radius:9px;padding:8px;text-align:left;cursor:pointer;margin-bottom:4px}.xa-job:hover{background:#f3f4f6}.xa-job-selected{background:#eef2ff!important;border-color:#c7d2fe}.xa-job-icon{width:18px;text-align:center;font-weight:800;line-height:18px}.xa-job-main{min-width:0;display:flex;flex-direction:column;gap:1px;flex:1}.xa-job-main strong{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.xa-job-main em{font-size:10px;font-style:normal;color:#4b5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.xa-job-main small{font-size:9px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.xa-job-completed .xa-job-icon{color:#047857}.xa-job-failed .xa-job-icon{color:#b91c1c}.xa-job-running .xa-job-icon{color:#4f46e5}.xa-job-stopped .xa-job-icon{color:#6b7280}
      .xa-detail{min-width:0}.xa-detail-empty{border:1px dashed #d1d5db;border-radius:11px;padding:38px 20px;text-align:center;color:#6b7280;font-size:12px}.xa-selected-title{font-size:14px;font-weight:800;margin:1px 0 4px}
      .xa-execution-pipeline{display:flex;flex-direction:column;gap:5px;margin:7px 0 11px}.xa-pipeline-row{display:grid;grid-template-columns:22px 150px minmax(0,1fr);align-items:start;gap:7px;padding:8px 9px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb}.xa-pipeline-icon{font-size:13px;font-weight:900;text-align:center}.xa-pipeline-label{font-size:10px;font-weight:800;color:#374151}.xa-pipeline-row strong{font-size:10px;line-height:1.4;font-weight:650;word-break:break-word}.xa-pipeline-complete{background:#ecfdf5;border-color:#a7f3d0}.xa-pipeline-complete .xa-pipeline-icon,.xa-pipeline-complete strong{color:#047857}.xa-pipeline-active{background:#eef2ff;border-color:#c7d2fe}.xa-pipeline-active .xa-pipeline-icon,.xa-pipeline-active strong{color:#4338ca}.xa-pipeline-pending{background:#f9fafb;border-color:#e5e7eb}.xa-pipeline-pending .xa-pipeline-icon,.xa-pipeline-pending strong{color:#9ca3af}.xa-pipeline-waiting{background:#fffbeb;border-color:#fde68a}.xa-pipeline-waiting .xa-pipeline-icon,.xa-pipeline-waiting strong{color:#92400e}.xa-pipeline-failed{background:#fef2f2;border-color:#fecaca}.xa-pipeline-failed .xa-pipeline-icon,.xa-pipeline-failed strong{color:#b91c1c}.xa-pipeline-skipped{background:#f9fafb;border-color:#e5e7eb}.xa-pipeline-skipped .xa-pipeline-icon,.xa-pipeline-skipped strong{color:#6b7280}.xa-section-title-top{margin-top:10px!important}
      .xa-target-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.xa-target-link{display:inline-flex;align-items:center;padding:6px 9px;border:1px solid #c7d2fe;border-radius:999px;background:#eef2ff;color:#3730a3;text-decoration:none;font-size:11px;font-weight:700}.xa-target-link:hover{background:#e0e7ff;text-decoration:underline}.xa-target-note{display:inline-flex;align-items:center;padding:6px 9px;border:1px dashed #d1d5db;border-radius:999px;color:#6b7280;font-size:10px}
      .xa-dashboard-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}.xa-dashboard-head h2{margin:0;font-size:17px}.xa-dashboard-head p{margin:3px 0 0;color:#6b7280;font-size:11px}.xa-dashboard-head>span{font-size:11px;color:#6b7280}.xa-stats{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:8px;margin-bottom:12px}.xa-stat{border:1px solid #e5e7eb;border-radius:10px;padding:10px;background:#fafafa}.xa-stat strong{display:block;font-size:20px}.xa-stat span{font-size:10px;color:#6b7280}.xa-stat.ok{background:#ecfdf5;border-color:#a7f3d0}.xa-stat.warn{background:#fffbeb;border-color:#fde68a}.xa-stat.bad{background:#fef2f2;border-color:#fecaca}.xa-stat.run{background:#eef2ff;border-color:#c7d2fe}.xa-dashboard-table-wrap{border:1px solid #e5e7eb;border-radius:10px;overflow:auto}.xa-dashboard-table{width:100%;border-collapse:collapse;font-size:10px;min-width:1450px}.xa-dashboard-table th{position:sticky;top:0;background:#f9fafb;text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;color:#4b5563}.xa-dashboard-table td{padding:8px;border-bottom:1px solid #f3f4f6;vertical-align:top}.xa-dashboard-table tr:last-child td{border-bottom:0}.xa-dashboard-row.xa-row-running{background:linear-gradient(90deg,rgba(238,242,255,.45),transparent 35%)}.xa-dashboard-row.xa-row-queued{background:linear-gradient(90deg,rgba(255,251,235,.5),transparent 35%)}.xa-table-link{border:0;background:none;padding:0;color:#4f46e5;text-decoration:underline;text-underline-offset:2px;font:inherit;font-weight:700;cursor:pointer;text-align:left}.xa-status-pill{display:inline-flex;padding:3px 6px;border-radius:999px;background:#f3f4f6;white-space:nowrap;margin-top:4px}.xa-pill-running{background:#eef2ff;color:#3730a3}.xa-pill-queued{background:#fffbeb;color:#92400e}.xa-pill-completed{background:#ecfdf5;color:#065f46}.xa-pill-failed{background:#fef2f2;color:#991b1b}.xa-pill-needs_selection,.xa-pill-needs_product{background:#fffbeb;color:#92400e}.xa-empty-cell{text-align:center;color:#6b7280;padding:25px!important}.xa-activity{max-width:260px;line-height:1.35;word-break:break-word}.xa-progress-wrap{min-width:150px}.xa-progress-wrap.compact{min-width:0;margin-top:4px}.xa-progress-top{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:10px;margin-bottom:4px}.xa-progress-top strong{font-size:10px;white-space:nowrap}.xa-progress-sub{font-size:8px;color:#6366f1;max-width:145px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.xa-progress-track{height:7px;border-radius:999px;background:#e5e7eb;overflow:hidden}.xa-progress-track span{display:block;height:100%;border-radius:999px;background:#6366f1;transition:width .3s ease}.xa-progress-wrap.compact .xa-progress-top{display:none}.xa-progress-wrap.compact .xa-progress-track{height:4px}.xa-job-completed .xa-progress-track span{background:#10b981}.xa-heartbeat{font-size:9px;white-space:normal;line-height:1.3;color:#4b5563}.xa-heartbeat[data-kind="live"]{color:#047857}.xa-heartbeat[data-kind="warn"]{color:#92400e;font-weight:700}.xa-heartbeat[data-kind="bad"]{color:#b91c1c;font-weight:700}.xa-heartbeat[data-kind="ok"]{color:#047857}.xa-selected-progress{margin-top:10px;border:1px solid #c7d2fe;border-radius:10px;padding:10px;background:#f8faff}.xa-selected-progress-main{display:grid;grid-template-columns:180px minmax(0,1fr);gap:12px;align-items:center}.xa-selected-progress-main>div:first-child span{display:block;font-size:9px;color:#6b7280}.xa-selected-progress-main>div:first-child strong{display:block;font-size:18px;margin-top:1px}.xa-selected-progress-meta{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:9px;color:#4b5563}.xa-selected-progress-meta em{font-style:normal}.xa-selected-progress-meta em[data-kind="warn"]{color:#92400e;font-weight:700}.xa-selected-progress-meta em[data-kind="bad"]{color:#b91c1c;font-weight:700}.xa-selected-progress-meta em[data-kind="live"]{color:#047857}
      .xa-dashboard-btn{width:calc(100% - 12px);margin:6px;border:1px solid #c7d2fe;background:#eef2ff;color:#3730a3;border-radius:9px;padding:8px;text-align:left;font-size:11px;font-weight:800;cursor:pointer}.xa-dashboard-btn:hover{background:#e0e7ff}
      .xa-storage-global{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:9px;padding:9px 10px;border:1px solid #bbf7d0;border-radius:9px;background:#f0fdf4}.xa-storage-global>div:first-child strong{display:block;font-size:10px;color:#166534}.xa-storage-global>div:first-child span{display:block;font-size:8px;color:#4b5563;margin-top:2px}.xa-storage-global-status[data-kind="ok"]{color:#047857!important;font-weight:700}.xa-storage-global-status[data-kind="default"]{color:#4b5563!important;font-weight:700}.xa-storage-global button:disabled{opacity:.45;cursor:not-allowed}.xa-storage-card{border:1px solid #bbf7d0;border-radius:10px;padding:10px;margin-top:8px;background:#f7fff9}.xa-storage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.xa-storage-head strong{display:block;font-size:12px}.xa-storage-head span{display:block;font-size:9px;color:#6b7280;margin-top:2px}.xa-decision-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:8px}.xa-decision-item{border:1px solid #e5e7eb;border-radius:8px;padding:7px 8px;background:#fafafa}.xa-decision-item span{display:block;font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:.03em}.xa-decision-item strong{display:block;margin-top:2px;font-size:10px;word-break:break-word}.xa-knowledge-card{border:1px solid #dbeafe;border-radius:10px;padding:10px;margin-top:8px;background:#f8fbff}.xa-knowledge-title{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.xa-knowledge-title>div strong{display:block;font-size:12px}.xa-knowledge-title>div span{display:block;font-size:9px;color:#6b7280;margin-top:2px}.xa-knowledge-status{font-size:9px;border-radius:999px;padding:4px 7px;background:#f3f4f6;white-space:nowrap}.xa-knowledge-completed{background:#ecfdf5;color:#065f46}.xa-knowledge-review{background:#fffbeb;color:#92400e}.xa-knowledge-blocker{background:#fef2f2;color:#991b1b}.xa-knowledge-generating{background:#eef2ff;color:#3730a3}.xa-knowledge-failed{background:#fef2f2;color:#991b1b}.xa-knowledge-queued{background:#fffbeb;color:#92400e}.xa-knowledge-error{margin-top:7px;padding:7px;border-radius:7px;background:#fef2f2;color:#991b1b;font-size:10px}.xa-knowledge-preview{margin-top:9px;max-height:260px;overflow:auto;border-top:1px solid #e5e7eb;padding-top:7px;font-size:11px}.xa-knowledge-cell{display:flex;flex-direction:column;gap:2px;min-width:145px}.xa-knowledge-cell strong{font-size:9px}.xa-knowledge-cell small{font-size:8px;color:#6b7280;line-height:1.3}.xa-help-dot{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;margin-left:5px;border:1px solid #cbd5e1;border-radius:999px;color:#64748b;background:#fff;font-size:9px;font-weight:800;vertical-align:middle;cursor:help}.xa-help-dot:hover,.xa-help-dot:focus{border-color:#818cf8;color:#4338ca;background:#eef2ff;outline:none;box-shadow:0 0 0 2px rgba(99,102,241,.12)}.xa-floating-tooltip{position:fixed;z-index:2147483647;max-width:340px;padding:8px 10px;border-radius:8px;background:#111827;color:#fff;font-size:10px;line-height:1.45;font-weight:500;box-shadow:0 10px 30px rgba(15,23,42,.25);pointer-events:none;white-space:normal;word-break:normal}.xa-floating-tooltip:after{content:"";position:absolute;left:50%;transform:translateX(-50%);border:6px solid transparent}.xa-floating-tooltip[data-placement="bottom"]:after{top:-12px;border-bottom-color:#111827}.xa-floating-tooltip[data-placement="top"]:after{bottom:-12px;border-top-color:#111827}.xa-help-repo{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;margin:2px 0 14px;border:1px solid #c7d2fe;border-radius:10px;background:#eef2ff}.xa-help-repo>div{min-width:0}.xa-help-repo strong{display:block;font-size:12px;color:#312e81}.xa-help-repo span{display:block;margin-top:2px;color:#64748b;font-size:10px}.xa-help-repo a:not(.xa-help-repo-button){display:block;margin-top:5px;color:#4338ca;font-size:10px;overflow-wrap:anywhere}.xa-help-repo-button{display:inline-flex;align-items:center;flex:0 0 auto;border:1px solid #a5b4fc;background:#fff;color:#3730a3;border-radius:8px;padding:7px 10px;text-decoration:none!important;font-size:10px;font-weight:800;white-space:nowrap}.xa-decision-group{margin-top:9px}.xa-decision-group-title{font-size:10px;font-weight:850;color:#374151;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em}.xa-sme-field-card{margin:7px 0;padding:10px 11px;border:1px solid #e5e7eb;border-left:4px solid #64748b;border-radius:9px;background:#fff}.xa-sme-good{border-left-color:#16a34a;background:#f0fdf4}.xa-sme-bad{border-left-color:#dc2626;background:#fef2f2}.xa-sme-info{border-left-color:#3b82f6;background:#eff6ff}.xa-sme-gray{border-left-color:#94a3b8;background:#f8fafc}.xa-sme-field-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.xa-sme-field-head strong{font-size:11px}.xa-correct-value{margin-top:7px;padding:7px 8px;border:1px solid rgba(148,163,184,.3);border-radius:7px;background:#fff}.xa-correct-value span{display:block;font-size:7.5px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;font-weight:850}.xa-correct-value strong{display:block;margin-top:2px;font-size:12px}.xa-sme-why,.xa-sme-action,.xa-sme-detail,.xa-sme-correction{margin-top:6px;font-size:9.5px;line-height:1.4}.xa-sme-correction{padding:6px 7px;border-radius:7px;background:#fff1f2;color:#9f1239}.xa-sme-detail{color:#475569}.xa-sme-field-card .pill{display:inline-flex;border-radius:999px;padding:2px 6px;font-size:7.5px;font-weight:850;border:1px solid #d1d5db}.xa-sme-field-card .pill.bad{background:#fee2e2;border-color:#fecaca;color:#991b1b}.xa-sme-field-card .pill.info{background:#dbeafe;border-color:#bfdbfe;color:#1d4ed8}.xa-decision-item small{display:block;margin-top:4px;color:#6b7280;font-size:8.5px;line-height:1.35;font-weight:500}.xa-decision-empty{padding:9px;border:1px dashed #d1d5db;border-radius:8px;color:#6b7280;font-size:10px}.xa-pipeline-row{grid-template-columns:22px 150px minmax(0,1fr)}.xa-pipeline-action{border:1px solid #c7d2fe;background:#fff;color:#3730a3;border-radius:7px;padding:5px 8px;font-size:9px;font-weight:750;cursor:pointer;white-space:nowrap}.xa-pipeline-action:disabled{opacity:.45;cursor:not-allowed}.xa-knowledge-decision{margin-top:7px;padding:7px 8px;border-radius:7px;background:#f8fafc;color:#475569;font-size:9.5px;line-height:1.4}.xa-reuse-summary{margin:10px 0 8px;border:1px solid #dbe4f0;border-radius:10px;background:#fbfdff;overflow:hidden}.xa-reuse-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 10px;border-bottom:1px solid #e5e7eb}.xa-reuse-head>div:first-child strong{display:block;font-size:10.5px;color:#1f2937}.xa-reuse-head>div:first-child span{display:block;font-size:8.5px;color:#6b7280;margin-top:2px}.xa-reuse-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.xa-reuse-actions button{padding:5px 8px;border:1px solid #a5b4fc;background:#eef2ff;border-radius:7px;font-size:8.5px;font-weight:800;color:#3730a3;cursor:pointer}.xa-reuse-actions button:hover{border-color:#818cf8;color:#4338ca}.xa-reuse-actions button:disabled{opacity:.42;cursor:not-allowed}.xa-reuse-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.xa-reuse-item{padding:8px 10px;min-width:0;border-right:1px solid #eef2f7}.xa-reuse-item:last-child{border-right:0}.xa-reuse-item>span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;font-weight:800}.xa-reuse-item>strong{display:block;font-size:10px;margin-top:2px;color:#334155}.xa-reuse-item>small{display:block;font-size:8.5px;color:#64748b;margin-top:1px}.xa-reuse-item>em{display:block;font-style:normal;font-size:8.2px;line-height:1.35;color:#64748b;margin-top:3px;max-height:35px;overflow:hidden}.xa-reuse-item.ok>strong{color:#047857}.xa-reuse-item.run>strong{color:#4338ca}.xa-reuse-item.bad>strong{color:#b91c1c}.xa-reuse-item-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.xa-reuse-item-actions{margin-top:7px;padding-top:6px;border-top:1px solid #eef2f7}.xa-reuse-item-actions button{width:100%;border:1px solid #a5b4fc;background:#eef2ff;color:#3730a3;border-radius:7px;padding:6px 8px;font-size:8.5px;font-weight:800;cursor:pointer}.xa-reuse-item-actions button:hover{background:#eef2ff;border-color:#818cf8}.xa-reuse-item-actions button:disabled{opacity:.42;cursor:not-allowed;background:#f8fafc}.xa-job-running .xa-job-icon,.xa-pipeline-active .xa-pipeline-icon{display:inline-block;animation:xa-spin 1s linear infinite}@keyframes xa-spin{to{transform:rotate(360deg)}}.xa-source-badge{display:inline-flex;align-items:center;border-radius:999px;padding:2px 6px;font-size:7.5px;font-weight:850;letter-spacing:.03em;white-space:nowrap}.xa-source-badge.reused{background:#dcfce7;color:#166534}.xa-source-badge.new{background:#dbeafe;color:#1d4ed8}.xa-source-badge.checking{background:#ede9fe;color:#6d28d9}.xa-source-badge.failed{background:#fee2e2;color:#b91c1c}.xa-source-badge.pending{background:#f3f4f6;color:#6b7280}.xa-prior-result{display:block!important;margin-top:5px!important;padding-top:5px;border-top:1px dashed #dbe4f0;color:#7c3aed!important;font-size:8px!important;line-height:1.35}.xa-decision-list{display:flex;flex-direction:column;gap:6px}.xa-decision-row{width:100%;box-sizing:border-box;border:1px solid #e5e7eb;border-radius:8px;background:#fff;padding:9px 11px}.xa-decision-row.ticket{border-left:3px solid #818cf8}.xa-decision-row.knowledge{border-left:3px solid #a7f3d0}.xa-decision-row-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.xa-decision-row-head>span{font-size:8.5px;color:#64748b;font-weight:800;text-transform:uppercase;letter-spacing:.03em}.xa-decision-row-head>strong{font-size:10.5px;color:#111827;text-align:right}.xa-decision-row-explanation{margin-top:6px;padding-top:6px;border-top:1px solid #f1f5f9;color:#526071;font-size:9.5px;line-height:1.45;max-width:none}@media(max-width:900px){.xa-reuse-head{align-items:flex-start;flex-direction:column}.xa-reuse-grid{grid-template-columns:1fr}.xa-reuse-item{border-right:0;border-bottom:1px solid #eef2f7}.xa-reuse-item:last-child{border-bottom:0}}.xa-product-mode{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:9px;background:#fafafa}.xa-product-mode>div strong{display:block;font-size:11px}.xa-product-mode>div small{display:block;margin-top:2px;color:#6b7280;font-size:9px}.xa-product-mode select{border:1px solid #cbd5e1;border-radius:7px;padding:6px 8px;background:#fff;font-size:10px;color:#334155}.xa-product-card{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;padding:9px 10px;border:1px solid #dbeafe;border-radius:9px;background:#f8fbff}.xa-product-card.needs{border-color:#fde68a;background:#fffbeb}.xa-product-card>div{min-width:0}.xa-product-card span{display:block;font-size:8px;color:#64748b;text-transform:uppercase;font-weight:800;letter-spacing:.04em}.xa-product-card strong{display:block;font-size:12px;margin-top:1px}.xa-product-card small{display:block;font-size:8.5px;color:#64748b;margin-top:2px;line-height:1.3}.xa-product-card button{flex:0 0 auto;border:1px solid #a5b4fc;background:#fff;color:#3730a3;border-radius:7px;padding:6px 8px;font-size:9px;font-weight:800;cursor:pointer}.xa-product-card button:disabled{opacity:.45;cursor:not-allowed}.xa-product-locked{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;background:#f3f4f6;color:#64748b;font-size:8.5px;font-weight:750;white-space:nowrap;cursor:help}.xa-product-reason{padding:8px 9px;margin-bottom:8px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;color:#475569;font-size:10px;line-height:1.4}.xa-product-options{display:grid;grid-template-columns:1fr;gap:8px}.xa-product-option{position:relative;text-align:left;border:1px solid #e5e7eb;background:#fff;border-radius:9px;padding:10px 11px;cursor:pointer}.xa-product-option:hover{border-color:#818cf8;background:#f8faff}.xa-product-option.suggested{border-color:#a5b4fc;background:#eef2ff}.xa-product-option strong{display:block;font-size:12px}.xa-product-option span{display:block;margin-top:3px;color:#64748b;font-size:9px;line-height:1.35}.xa-product-option em{position:absolute;right:8px;top:8px;font-style:normal;font-size:8px;font-weight:800;color:#4338ca;background:#fff;border:1px solid #c7d2fe;border-radius:999px;padding:2px 6px}.xa-help-modal{width:min(860px,96vw)}.xa-help-body{padding:8px 4px 2px;font-size:11px;line-height:1.55}.xa-help-body h3{margin:14px 0 5px;font-size:13px}.xa-help-body p{margin:5px 0}.xa-help-body ul{margin:5px 0 5px 20px;padding:0}.xa-help-body li{margin:4px 0}
      .xa-sfdc-card{border:1px solid #e5e7eb;border-radius:9px;padding:9px;margin-top:7px;background:#fafafa}.xa-sfdc-card.selected{border-color:#818cf8;background:#eef2ff}.xa-sfdc-title{display:flex;justify-content:space-between;gap:8px;align-items:center}.xa-selected-badge{font-size:9px;border-radius:999px;padding:3px 6px;background:#dcfce7;color:#166534}.xa-sfdc-detail-text{margin-top:5px;font-size:10px;line-height:1.45;color:#4b5563;word-break:break-word}.xa-sfdc-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:7px}.xa-sfdc-actions a{color:#4f46e5;text-decoration:underline;font-size:10px}.xa-sfdc-actions span{font-size:10px;color:#6b7280}.xa-sfdc-actions button{border:1px solid #c7d2fe;background:#fff;color:#3730a3;border-radius:7px;padding:5px 8px;font-size:10px;font-weight:700;cursor:pointer}.xa-manual-sfdc-inline{margin-top:7px;padding:11px 12px;border:1px solid #f59e0b;border-left:5px solid #d97706;border-radius:9px;background:#fffbeb}.xa-manual-sfdc-inline-head strong{display:block;font-size:11px;color:#92400e}.xa-manual-sfdc-inline-head span{display:block;margin-top:2px;font-size:9.5px;line-height:1.4;color:#6b4f12}.xa-manual-sfdc-inline-row{display:grid;grid-template-columns:minmax(180px,260px) auto auto;gap:7px;align-items:center;margin-top:9px}.xa-manual-sfdc-inline-row button{border:1px solid #c7d2fe;background:#fff;color:#3730a3;border-radius:8px;padding:9px 10px;font-size:10px;font-weight:800;cursor:pointer}.xa-manual-sfdc-inline-row #xa-inline-sfdc-submit{background:#4f46e5;color:#fff;border-color:#4f46e5}.xa-manual-sfdc-label{display:block;margin:12px 0 5px;font-size:11px;font-weight:800;color:#374151}.xa-manual-sfdc-input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:10px 11px;font:14px ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.xa-manual-sfdc-error{min-height:18px;margin-top:5px;color:#b91c1c;font-size:11px}.xa-manual-sfdc-note{margin-top:6px;padding:8px 10px;border-radius:8px;background:#f8fafc;color:#475569;font-size:11px;line-height:1.45}.xa-manual-sfdc-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.xa-manual-sfdc-actions button{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:7px 10px;font-weight:750;cursor:pointer}.xa-manual-sfdc-actions #xa-manual-sfdc-submit{background:#4f46e5;color:#fff;border-color:#4f46e5}
      .xa-modal-backdrop{position:fixed;inset:0;z-index:2147483647;background:rgba(17,24,39,.45);display:flex;align-items:center;justify-content:center;padding:20px}.xa-modal{width:min(760px,96vw);max-height:82vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.3);padding:14px}.xa-modal-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid #e5e7eb;padding-bottom:10px}.xa-modal-head strong{display:block;font-size:15px}.xa-modal-head span{display:block;margin-top:3px;font-size:11px;color:#6b7280}.xa-modal-body{padding-top:4px}.xa-modal-select{margin-left:auto!important;background:#4f46e5!important;color:#fff!important;border-color:#4f46e5!important}
      .xa-section-title{margin-top:14px;font-size:11px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:.04em}
      #xsup-auditor-output{width:100%;min-height:310px;max-height:50vh;overflow:auto;margin-top:8px;border:1px solid #d1d5db;border-radius:10px;padding:15px;background:#fff;font:13px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:normal;transition:min-height .15s ease}#xsup-auditor-output.xa-report-empty{min-height:110px;display:flex;align-items:center;justify-content:center;text-align:center}
      #xsup-auditor-output h1,#xsup-auditor-output h2,#xsup-auditor-output h3,#xsup-auditor-output h4{margin:16px 0 8px;color:#111827;line-height:1.25}#xsup-auditor-output h1{font-size:20px}#xsup-auditor-output h2{font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:5px}#xsup-auditor-output h3{font-size:15px}#xsup-auditor-output h4{font-size:14px}#xsup-auditor-output p{margin:7px 0}#xsup-auditor-output strong{font-weight:750;color:#111827}#xsup-auditor-output em{color:#4b5563}#xsup-auditor-output ul,#xsup-auditor-output ol{margin:7px 0 7px 22px;padding:0}#xsup-auditor-output li{margin:4px 0}#xsup-auditor-output code{background:#f3f4f6;border-radius:4px;padding:1px 4px;font:12px ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}#xsup-auditor-output blockquote{border-left:3px solid #c7d2fe;margin:8px 0;padding:5px 10px;background:#f8fafc;color:#4b5563}#xsup-auditor-output a{color:#4f46e5;text-decoration:underline;text-underline-offset:2px;word-break:break-word}.xa-md-spacer{height:4px}.xa-report-placeholder{color:#9ca3af}
      #xsup-auditor-xsup-comment{width:100%;height:140px;margin-top:8px;border:1px solid #d1d5db;border-radius:10px;padding:11px;resize:vertical;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;white-space:pre-wrap}
      .xa-actions{display:flex;gap:8px;margin-top:9px;flex-wrap:wrap}.xa-actions button{border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:8px;padding:7px 10px;cursor:pointer;transition:transform .12s ease,background .12s ease,border-color .12s ease;font-size:11px}.xa-actions button:disabled{opacity:.5;cursor:not-allowed}.xa-actions button:active:not(:disabled){transform:scale(.96)}.xa-actions button.xa-copied{background:#ecfdf5;border-color:#10b981;color:#065f46}
      .xa-ref-box{margin-top:8px;border:1px solid #e5e7eb;border-radius:10px;max-height:200px;overflow:auto;background:#fafafa}.xa-ref{display:grid;grid-template-columns:20px 1fr auto;gap:6px;align-items:start;padding:8px 10px;border-bottom:1px solid #eee;font-size:11px}.xa-ref:last-child{border-bottom:0}.xa-ref a{color:#4f46e5;text-decoration:none;word-break:break-word}.xa-ref a:hover{text-decoration:underline}.xa-ref em{font-style:normal;color:#6b7280;font-size:10px}.xa-ref-empty{padding:10px;color:#6b7280;font-size:11px}
      #xsup-auditor-panel.xa-maximized{top:12px!important;right:12px!important;bottom:12px!important;left:12px!important;width:auto!important;max-height:none!important;height:auto!important;border-radius:12px}#xsup-auditor-panel.xa-maximized .xa-job-list{max-height:calc(100vh - 230px)}#xsup-auditor-panel.xa-maximized #xsup-auditor-output{min-height:43vh}
      #xsup-auditor-bubble{position:fixed;right:20px;bottom:20px;z-index:2147483647;display:none;align-items:center;max-width:500px;min-width:240px;padding:11px 14px;background:#fff;color:#111827;border:1px solid #c7d2fe;border-radius:999px;box-shadow:0 12px 32px rgba(0,0,0,.2);font:12px/1.3 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-weight:700;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:transform .15s ease,box-shadow .15s ease}#xsup-auditor-bubble:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(0,0,0,.24)}#xsup-auditor-bubble[data-kind="ok"]{border-color:#10b981;background:#ecfdf5;color:#065f46}#xsup-auditor-bubble[data-kind="error"]{border-color:#ef4444;background:#fef2f2;color:#991b1b}#xsup-auditor-bubble[data-kind="running"]{border-color:#818cf8;background:#eef2ff;color:#3730a3}
      #xsup-auditor-toast{position:fixed;right:22px;bottom:82px;z-index:2147483647;max-width:440px;padding:11px 14px;border-radius:10px;background:#111827;color:#fff;box-shadow:0 14px 34px rgba(0,0,0,.24);font:12px/1.4 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity .18s ease,transform .18s ease}#xsup-auditor-toast.xa-toast-show{opacity:1;transform:translateY(0)}#xsup-auditor-toast[data-kind="error"]{background:#991b1b}#xsup-auditor-toast[data-kind="ok"]{background:#065f46}
      @keyframes xaPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}#xsup-auditor-bubble.xa-pulse{animation:xaPulse .7s ease 3}
      @media(max-width:900px){.xa-stats{grid-template-columns:repeat(3,1fr)}.xa-decision-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.xa-workspace{grid-template-columns:1fr}.xa-sidebar{position:static}.xa-job-list{max-height:180px}.xa-input-row{grid-template-columns:1fr 1fr}.xa-input-row textarea{grid-column:1/-1}.xa-stats{grid-template-columns:repeat(2,1fr)}.xa-toggle-row{grid-template-columns:1fr}.xa-decision-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    const panel = document.createElement("div");
    panel.id = "xsup-auditor-panel";
    panel.innerHTML = `
      <div class="xa-head">
        <div>
          <div class="xa-title">XSUP Retrospective Auditor</div>
          <div class="xa-sub">v${VERSION} · build ${BUILD_ID} · XDR/XSIAM · XSOAR · Cortex Cloud · <span id="xsup-auditor-worker-summary">${state.concurrency} XSUP/TACO workers · ${state.knowledgeConcurrency} knowledge workers · Case Chat max ${state.caseChatGenerationLimit}</span><span id="xsup-auditor-elapsed"></span></div>
        </div>
        <div class="xa-head-actions">
          <button id="xsup-auditor-minimize" class="xa-icon" title="Minimize">—</button>
          <button id="xsup-auditor-maximize" class="xa-icon" title="Maximize">⛶</button>
          <button id="xsup-auditor-close" class="xa-icon" title="Close">×</button>
        </div>
      </div>

      <div class="xa-input-row">
        <textarea id="xsup-auditor-input" placeholder="Paste jobs, one per line&#10;XSUP-12345&#10;04001234&#10;XSUP-12345 / 04001234"></textarea>
        <button id="xsup-auditor-run">Run Audit(s)</button>
        <button id="xsup-auditor-direct-kcs" title="Generate only the KCS-family artifact. Existing Salesforce KCS content is checked to recommend CREATE vs UPDATE. If UPDATE is recommended, the reviewer may still choose a separate new KCS; the existing KCS remains referenced. Admin Guide, Runbook and other secondary artifacts are skipped.">Generate KCS</button>
        <button id="xsup-auditor-stop" disabled>Stop All</button>
      </div>
      <div class="xa-input-help">Use XSUP IDs, SFDC-only cases, or paired XSUP / SFDC input. Supplied SFDC is used directly; linked XSUP is discovered when possible. Generate KCS creates only KCS-family output and checks existing Salesforce KCS content before recommending CREATE vs UPDATE. When an update is recommended, the reviewer can still choose Create New KCS Anyway; the new draft keeps the related existing KCS referenced. If automatic SFDC mapping fails, use Enter SFDC in the item instead of restarting. XSUP/TACO parallelism is selectable below; Case Chat generation remains capped at 2.</div>
      <div class="xa-toggle-row">
        <label class="xa-auto-download">
          <input id="xsup-auditor-auto-download" type="checkbox" checked>
          <span><strong>Auto-save/request completed artifacts</strong><small>Default Browser Downloads = automatic standalone downloads with no folder selection. Audit downloads first, then only the Audit-selected Knowledge artifacts. Selected folder = confirmed automatic writes.</small></span>
        </label>
        <label class="xa-auto-download">
          <input id="xsup-auditor-auto-knowledge" type="checkbox" checked>
          <span><strong>Auto-generate recommended knowledge drafts</strong><small>Uses the protected Case Chat queue. With Browser Downloads, generation completion and disk-save confirmation are shown separately.</small></span>
        </label>
      </div>
      <div class="xa-product-mode">
        <div><strong>Product selection</strong><small>Auto detects XDR/XSIAM, XSOAR or Cortex Cloud. Only high-confidence detection continues automatically; other cases pause only that XSUP for confirmation.</small></div>
        <select id="xsup-auditor-product-mode">
          <option value="auto" selected>Auto detect</option>
          <option value="manual">Ask me for every XSUP</option>
        </select>
      </div>
      <div class="xa-product-mode">
        <div><strong>Parallel XSUP / TACO processing</strong><small>Default 2. Increasing this lets more independent cases resolve evidence/TACO in parallel. Case Chat generation stays capped at 2 to reduce transient failures.</small></div>
        <select id="xsup-auditor-concurrency">
          <option value="2" selected>2 · Default</option>
          <option value="3">3</option>
          <option value="5">5</option>
          <option value="10">10 · High</option>
        </select>
      </div>
      <div class="xa-storage-global">
        <div>
          <strong>Report Storage</strong>
          <span id="xsup-auditor-storage-global-status" class="xa-storage-global-status">Browser Downloads</span>
          <span id="xsup-auditor-storage-global-detail">Choose a folder to write directly to a local or desktop-synced Drive/OneDrive/shared folder.</span>
        </div>
        <div class="xa-actions" style="margin-top:0">
          <button id="xsup-auditor-choose-folder" ${state.fileSystemAccessSupported ? "" : "disabled"} title="Choose a writable computer folder. Desktop-synced Google Drive/OneDrive folders are supported like normal folders.">Choose Folder</button>
        </div>
      </div>
      <div id="xsup-auditor-status" class="xa-status">Ready</div>

      <div class="xa-workspace">
        <aside class="xa-sidebar">
          <div class="xa-side-head"><span>XSUP Queue</span><span id="xsup-auditor-sidebar-workers">${state.concurrency} workers</span></div>
          <button id="xsup-auditor-dashboard-btn" class="xa-dashboard-btn">▦ Live Dashboard</button>
          <div style="padding:2px 8px 4px;color:#6b7280;font-size:9px;line-height:1.35">Click any XSUP to view its progress, report, comment and references.</div>
          <div id="xsup-auditor-job-list" class="xa-job-list">
            <div class="xa-job-empty">Paste one or more XSUP IDs above and click Run Audit(s).</div>
          </div>
          <div class="xa-actions" style="padding:0 8px 8px;margin-top:2px">
            <button id="xsup-auditor-copy-all-comments" title="Copies the review paste comments for every completed ticket in this batch.">Copy All Review Comments</button>
            <button id="xsup-auditor-download-all" title="Downloads all completed XSUP reports into one HTML file, or writes it to the selected folder.">Download All Reports</button>
            <button id="xsup-auditor-copy-all-reports" title="Copies all completed audit reports.">Copy All Reports</button>
            <button id="xsup-auditor-download-all-knowledge" title="Packages all generated KCS/doc/runbook drafts as standalone HTML files inside one ZIP download.">Download All Knowledge Drafts</button>
            <button id="xsup-auditor-copy-all-knowledge" title="Copies all generated knowledge drafts.">Copy All Knowledge Drafts</button>
            <button id="xsup-auditor-help" title="How to use and interpret the auditor.">Help & Methodology</button>
            <button id="xsup-auditor-save-session" title="Downloads the current audit workspace as JSON so it can be restored after refresh/reopen without rerunning completed audits.">Save Session</button>
            <button id="xsup-auditor-restore-session" title="Restore a previously saved XSUP Auditor session JSON file.">Restore Session</button>
            <input id="xsup-auditor-restore-file" type="file" accept=".json,application/json" style="display:none">
          </div>
        </aside>

        <main class="xa-detail">
          <div id="xsup-auditor-dashboard"></div>

          <div id="xsup-auditor-detail-empty" class="xa-detail-empty" style="display:none">
            Select an XSUP from the queue to view its progress and audit.
          </div>

          <div id="xsup-auditor-detail-content" style="display:none">
            <div id="xsup-auditor-selected-title" class="xa-selected-title"></div>
            <div id="xsup-auditor-target-links" class="xa-target-links" style="display:none"></div>
            <div id="xsup-auditor-product-control"></div>
            <div id="xsup-auditor-selected-progress" class="xa-selected-progress"></div>
            <div id="xsup-auditor-reuse-summary" class="xa-reuse-summary"></div>

            <div class="xa-section-title xa-section-title-top">Execution Pipeline</div>
            <div id="xsup-auditor-execution-pipeline" class="xa-execution-pipeline"></div>

            <div class="xa-section-title">Review Decisions</div>
            <div id="xsup-auditor-decision-summary"></div>

            <div class="xa-section-title">Knowledge Artifact</div>
            <div id="xsup-auditor-knowledge-artifact"></div>

            <div class="xa-section-title">Report Storage</div>
            <div id="xsup-auditor-storage-status"></div>

            <div class="xa-section-title">Linked SFDC Case Details</div>
            <div id="xsup-auditor-sfdc-details"><div class="xa-ref-empty">SFDC mapping details will appear after XSUP resolution.</div></div>

            <div class="xa-section-title">Audit Report</div>
            <div id="xsup-auditor-output" class="xa-report-empty"><div class="xa-report-placeholder">Final audit report will appear here...</div></div>
            <div class="xa-actions">
              <button id="xsup-auditor-copy">Copy Audit Report</button>
              <button id="xsup-auditor-download-selected" disabled title="Downloads the selected XSUP audit, or writes it to the selected folder.">Download Audit Report</button>
            </div>

            <div class="xa-section-title">Review Paste Comment</div>
            <textarea id="xsup-auditor-xsup-comment" placeholder="Review paste comment will appear here..."></textarea>
            <div class="xa-actions">
              <button id="xsup-auditor-copy-comment">Copy Review Comment</button>
            </div>

            <div class="xa-section-title">References from TACO</div>
            <div id="xsup-auditor-references-list" class="xa-ref-box">
              <div class="xa-ref-empty">References will appear after the audit completes.</div>
            </div>

            <div class="xa-actions">
              <button id="xsup-auditor-retry-chat" disabled title="Retry or regenerate only the Audit using the retained current TACO analysis and evidence. TACO is not re-run.">Retry Audit</button>
              <button id="xsup-auditor-debug" disabled title="Exports the selected XSUP's evidence, TACO analysis, final audit and references as JSON.">Export Selected Debug</button>
            </div>
          </div>
        </main>
      </div>
    `;
    document.body.appendChild(panel);
    updateConcurrencyUi();
    installAuditorTooltipHandlers(panel);

    const bubble = document.createElement("div");
    bubble.id = "xsup-auditor-bubble";
    bubble.title = "Restore XSUP Auditor";
    bubble.onclick = restorePanel;
    document.body.appendChild(bubble);

    const toast = document.createElement("div");
    toast.id = "xsup-auditor-toast";
    document.body.appendChild(toast);

    updateMiniBubble();
    renderGlobalStorageStatus();
    renderJobList();
    showDashboard();

    document.getElementById("xsup-auditor-dashboard-btn").onclick = showDashboard;
    document.getElementById("xsup-auditor-auto-download").onchange = (e) => {
      state.autoSaveCompleted = Boolean(e.target.checked);
      setStatus(
        state.autoSaveCompleted
          ? "Automatic artifact delivery enabled. Default Browser Downloads auto-requests the Audit first and then each Audit-selected Knowledge artifact as a standalone file; selected-folder writes are confirmed."
          : "Automatic artifact saving disabled.",
        state.autoSaveCompleted ? "ok" : ""
      );
    };

    document.getElementById("xsup-auditor-auto-knowledge").onchange = (e) => {
      state.autoGenerateKnowledge = Boolean(e.target.checked);
      setStatus(
        state.autoGenerateKnowledge
          ? "Automatic knowledge-draft generation enabled."
          : "Automatic knowledge-draft generation disabled.",
        state.autoGenerateKnowledge ? "ok" : ""
      );
    };

    document.getElementById("xsup-auditor-product-mode").onchange = (e) => {
      state.productSelectionMode = e.target.value === "manual" ? "manual" : "auto";
      setStatus(
        state.productSelectionMode === "manual"
          ? "Product selection set to manual. Each XSUP will pause for product confirmation after SFDC resolution."
          : "Automatic product detection enabled. Only ambiguous/low-confidence cases will pause for confirmation.",
        "ok"
      );
    };

    document.getElementById("xsup-auditor-concurrency").onchange = (e) => {
      const requested = Number(e.target.value);
      state.concurrency = [2,3,5,10].includes(requested) ? requested : 2;
      updateConcurrencyUi();
      setStatus(`Parallel XSUP/TACO workers set to ${state.concurrency}. Case Chat generation remains capped at ${state.caseChatGenerationLimit}.`, "ok");
      pumpQueue();
    };

    document.getElementById("xsup-auditor-choose-folder").onclick = chooseSaveFolder;

    document.getElementById("xsup-auditor-run").onclick = runAudit;
    document.getElementById("xsup-auditor-direct-kcs").onclick = runDirectKCS;
    document.getElementById("xsup-auditor-stop").onclick = stopAudit;
    document.getElementById("xsup-auditor-minimize").onclick = minimizePanel;
    document.getElementById("xsup-auditor-maximize").onclick = toggleMaximize;
    document.getElementById("xsup-auditor-retry-chat").onclick = () => { const job = getSelectedJob(); if (job) forceRerunAudit(job.xsup); };

    document.getElementById("xsup-auditor-close").onclick = () => {
      if (state.running || state.activeCount) stopAudit();
      clearInterval(state.elapsedTimer);
      closeSFDCChooser();
      closeProductChooser();
      document.getElementById("xsup-auditor-help-modal")?.remove();
      document.getElementById("xsup-auditor-bubble")?.remove();
      document.getElementById("xsup-auditor-toast")?.remove();
      hideAuditorTooltip();
      if (window.__xaTrustedFieldObserverSinkV24?.instanceId === state.trustedFieldObserverInstanceId) {
        window.__xaTrustedFieldObserverSinkV24 = null;
      }
      if (window.__xaTrustedHtmxHandlerV24) {
        document.body.removeEventListener("htmx:afterRequest", window.__xaTrustedHtmxHandlerV24);
        window.__xaTrustedHtmxHandlerV24 = null;
      }
      panel.remove();
    };

    document.getElementById("xsup-auditor-copy").onclick = async (e) => {
      const job = getSelectedJob();
      const txt = job?.auditAnswer || "";
      if (!txt) return;
      await copyWithFeedback(e.currentTarget, txt);
      setStatus(`${job.xsup} report copied.`, "ok");
    };

    document.getElementById("xsup-auditor-copy-comment").onclick = async (e) => {
      const job = getSelectedJob();
      const txt = document.getElementById("xsup-auditor-xsup-comment").value || job?.xsupComment || "";
      if (!txt) return;
      await copyWithFeedback(e.currentTarget, txt);
      setStatus(`${job.xsup} review comment copied.`, "ok");
    };

    document.getElementById("xsup-auditor-copy-all-comments").onclick = async (e) => {
      await copyAllReviewComments(e.currentTarget);
    };

    document.getElementById("xsup-auditor-download-selected").onclick = () => void downloadSelectedReport();
    document.getElementById("xsup-auditor-download-all").onclick = () => void downloadAllCompletedReports();
    document.getElementById("xsup-auditor-copy-all-reports").onclick = (e) => void copyAllReports(e.currentTarget);
    document.getElementById("xsup-auditor-download-all-knowledge").onclick = () => void downloadAllKnowledgeArtifacts({userInitiated:true});
    document.getElementById("xsup-auditor-copy-all-knowledge").onclick = (e) => void copyAllKnowledgeDrafts(e.currentTarget);
    document.getElementById("xsup-auditor-help").onclick = showHelpMethodology;
    document.getElementById("xsup-auditor-save-session").onclick = () => void saveAuditSession();
    document.getElementById("xsup-auditor-restore-session").onclick = openRestoreSessionPicker;
    document.getElementById("xsup-auditor-restore-file").onchange = async (e) => {
      try {
        await handleRestoreSessionFile(e.target.files?.[0]);
      } catch (err) {
        console.error("XSUP Auditor restore error:", err);
        setStatus(`Restore failed: ${err.message}`, "error");
        showToast("⚠ Could not restore audit session", "error");
      } finally {
        e.target.value = "";
      }
    };

    document.getElementById("xsup-auditor-debug").onclick = () => void downloadDebug();

    document.getElementById("xsup-auditor-input").addEventListener("keydown", e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runAudit();
    });
  }

  installTrustedFieldObserver();
  createUI();
})();
