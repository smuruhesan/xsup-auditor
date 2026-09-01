/*
XSUP Retrospective Auditor v1
Supported product profiles
- XDR/XSIAM
- XSOAR
- Cortex Cloud

Runtime model
- One Chrome DevTools Snippet running inside TACopilot.
- Uses the reviewer's existing authenticated TACopilot session only.
- Automatically detects the product from structured case/TACO metadata when possible.
- Low-confidence/ambiguous product detection pauses only that XSUP for reviewer selection.
- Product can be manually changed; a product change invalidates Audit/Knowledge reuse but does not force TACO refresh.
- Two XSUP audit workers + one independent knowledge-artifact worker.
- Automatic TACO freshness: reuse current analysis, wait for a running analysis, or refresh only when current evidence requires it.
- Audit and knowledge Case Chat results are fingerprinted and reused only when their current inputs still match.
- Fresh knowledge uses enrichment -> independent quality review -> deterministic safety gate, with one evidence-bounded repair pass for generic output/provenance defects.
- Human-facing Knowledge review annotations render as compact color-coded inline chips; dashboards/cards use the same semantic color language.

Artifact storage
- Default: browser Downloads.
- Optional: reviewer-selected writable local/desktop-synced folder via Chrome's folder picker.
- Folder handles stay in memory only and are not serialized.
- Storage failure never changes the audit result; browser download is the fallback.
*/
(() => {
  "use strict";

  const VERSION = "1";
  const POLL_MS = 5000;
  const ANALYSIS_TIMEOUT_MS = 20 * 60 * 1000;
  const CHAT_TIMEOUT_MS = 15 * 60 * 1000;
  const NO_PROGRESS_WARNING_MS = 3 * 60 * 1000;
  const NO_RESPONSE_WARNING_MS = 60 * 1000;
  const REPO_URL = "https://github.com/smuruhesan/xsup-auditor";
  const AUDIT_REUSE_SCHEMA = "support-field-review-v1";
  const KNOWLEDGE_REUSE_SCHEMA = "knowledge-quality-v1";
  const KNOWLEDGE_DRAFT_REUSE_SCHEMA = "knowledge-enriched-draft-v1";
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

  // Human-facing review annotations used inside generated Knowledge artifacts.
  // These are intentionally distinct from raw TACO provenance markers such as
  // [inference]. The latter must be resolved before final Knowledge is accepted.
  const REVIEW_MARKER_GUIDE = Object.freeze({
    SME_REVIEW: Object.freeze({
      label: "SME REVIEW",
      icon: "⚠",
      tone: "amber",
      meaning: "A product behavior, timing, UI path, configuration, or operational detail needs subject-matter validation.",
      action: "Confirm with an appropriate SME or authoritative source. If it cannot be confirmed, rewrite, move to Validation Items, or remove the claim."
    }),
    ENGINEERING_REVIEW: Object.freeze({
      label: "ENGINEERING REVIEW",
      icon: "⚙",
      tone: "amber",
      meaning: "A backend, architecture, API, or implementation detail needs Engineering confirmation.",
      action: "Confirm against original Engineering evidence or obtain Engineering review before treating the detail as fact."
    }),
    INFERENCE: Object.freeze({
      label: "INFERENCE",
      icon: "◇",
      tone: "purple",
      meaning: "The statement is derived from available evidence but is not directly established.",
      action: "Support it with an underlying source, move it to Validation Items, or remove it. An unresolved material inference cannot be READY."
    }),
    SOURCE_CHECK: Object.freeze({
      label: "SOURCE CHECK",
      icon: "🔎",
      tone: "purple",
      meaning: "The claim needs a stronger or more direct underlying source.",
      action: "Locate/confirm the authoritative source, or rewrite/remove the claim if the source cannot be established."
    }),
    SCOPE_CHECK: Object.freeze({
      label: "SCOPE CHECK",
      icon: "🧭",
      tone: "amber",
      meaning: "Version, operating-system, platform, tenant, or applicability scope still needs confirmation.",
      action: "Confirm the supported scope and narrow the wording if the claim does not apply universally."
    }),
    RECOMMENDATION: Object.freeze({
      label: "RECOMMENDATION",
      icon: "ℹ",
      tone: "blue",
      meaning: "Helpful guidance or a best-practice recommendation rather than mandatory product behavior.",
      action: "Confirm it is appropriate for the intended audience and keep it clearly framed as guidance."
    }),
    CONFIRMED: Object.freeze({
      label: "CONFIRMED",
      icon: "✓",
      tone: "green",
      meaning: "An important statement is directly supported by an appropriate underlying source or original Engineering evidence.",
      action: "No additional validation is required unless the source or applicability scope changes."
    }),
    UNSUPPORTED: Object.freeze({
      label: "UNSUPPORTED",
      icon: "✕",
      tone: "red",
      meaning: "A material claim does not currently have sufficient support.",
      action: "Do not publish the claim. Support, rewrite, or remove it before the artifact can pass the final gate."
    })
  });


  if (!location.hostname.includes("taco-dashm.paloaltonetworks.com")) {
    alert("Run XSUP Auditor from the TACopilot site.");
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

    // Knowledge-artifact generation runs independently from the audit queue.
    // One worker keeps TACopilot load bounded while audits can continue.
    autoGenerateKnowledge: true,
    knowledgeConcurrency: 1,
    knowledgeQueue: [],
    knowledgeActiveCount: 0,

    activeCount: 0,
    running: false,
    stopped: false,
    controller: null,

    minimized: false,
    maximized: false,
    startedAt: null,
    elapsedTimer: null,
    lastStatus: "Ready",
    lastStatusKind: ""
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

  function ticketFieldSnapshot(evidence) {
    const parts = [];
    if (evidence?.jira_ticket_event?.original_text) {
      parts.push(evidence.jira_ticket_event.original_text.slice(0, 7000));
    }
    const relevant = (evidence?.structured_fields || [])
      .filter(x => {
        const label = x.label || "";
        if (/\bRCA\s*Category\b|Root\s*Cause.*Category/i.test(label)) return false;
        return /resolution|root\s*cause|\brca\b|fix\s*type|label|flag|product/i.test(label);
      })
      .slice(0, 40)
      .map(x => `${x.label}: ${x.value}`);
    if (relevant.length) parts.push(relevant.join("\n"));
    return cleanText(parts.join("\n\n")) || "No deterministic ticket-field snapshot was extracted. Use only original evidence below; if a required current field value cannot be established, return UNDETERMINED.";
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

  async function request(url, options = {}) {
    assertRunning();
    const r = await fetch(url, {
      credentials: "same-origin",
      signal: state.controller?.signal,
      ...options,
      headers: {
        Accept: "application/json, text/html, */*",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error(`${options.method || "GET"} ${url} -> HTTP ${r.status}: ${txt.slice(0, 300)}`);
    }
    return r;
  }

  function cleanText(s) {
    return (s || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
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
      const u = new URL(String(url), location.href);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.href;
    } catch (_) {
      return null;
    }
  }

  function renderInlineMarkdown(raw) {
    let s = String(raw ?? "");
    const links = [];

    const protectLink = (url, label, suffix = "") => {
      const clean = safeUrl(url);
      if (!clean) return null;
      const token = `@@XA_LINK_${links.length}@@`;
      links.push(
        `<a href="${escapeHtml(clean)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>${escapeHtml(suffix)}`
      );
      return token;
    };

    // Protect explicit Markdown links before processing plain URLs/identifiers.
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
      return protectLink(url, label) || `${label} (${url})`;
    });

    // Protect/linkify complete URLs before XSUP/SFDC identifier replacement.
    // This prevents an ID inside a URL from being replaced with a token inside
    // the URL itself (which previously could leak @@XA_LINK_n@@ placeholders).
    s = s.replace(/https?:\/\/[^\s<>"']+/g, url => {
      const trimmed = url.replace(/[.,;:!?]+$/, "");
      const trailing = url.slice(trimmed.length);
      return protectLink(trimmed, trimmed, trailing) || url;
    });

    // Make XSUP IDs clickable only after URLs have been protected.
    s = s.replace(/\bXSUP-\d+\b/gi, key => {
      const normalized = key.toUpperCase();
      const url = safeUrl(`https://jira-dc.paloaltonetworks.com/browse/${normalized}`);
      return url ? protectLink(url, normalized) : key;
    });

    // Make the resolved Salesforce case number clickable when a direct URL
    // was discovered from TACopilot.
    if (state.caseNumber && state.targetLinks?.sfdc) {
      const caseRe = new RegExp(`\\b${state.caseNumber}\\b`, "g");
      s = s.replace(caseRe, caseNo => {
        const url = safeUrl(state.targetLinks.sfdc);
        return url ? protectLink(url, caseNo) : caseNo;
      });
    }

    s = escapeHtml(s);

    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");

    links.forEach((html, i) => {
      s = s.split(`@@XA_LINK_${i}@@`).join(html);
    });

    return s;
  }

  function safeMarkdownToHtml(markdown) {
    const lines = String(markdown || "").replace(/\r/g, "").split("\n");
    const out = [];
    let inUl = false;
    let inOl = false;
    let inCode = false;
    let codeLang = "";
    let codeLines = [];

    const closeLists = () => {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (inOl) { out.push("</ol>"); inOl = false; }
    };

    const closeCode = () => {
      if (!inCode) return;
      const lang = /^[A-Za-z0-9_+-]+$/.test(codeLang) ? ` class="language-${escapeHtml(codeLang)}"` : "";
      out.push(`<pre><code${lang}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      inCode = false;
      codeLang = "";
      codeLines = [];
    };

    for (const line of lines) {
      const t = line.trim();

      const fence = line.match(/^\s*```([A-Za-z0-9_+-]*)\s*$/);
      if (fence) {
        closeLists();
        if (inCode) {
          closeCode();
        } else {
          inCode = true;
          codeLang = fence[1] || "";
          codeLines = [];
        }
        continue;
      }

      if (inCode) {
        codeLines.push(line);
        continue;
      }

      if (!t) {
        closeLists();
        out.push('<div class="xa-md-spacer"></div>');
        continue;
      }

      let m;
      if ((m = line.match(/^(#{1,4})\s+(.+)$/))) {
        closeLists();
        const level = Math.min(4, m[1].length);
        out.push(`<h${level}>${renderInlineMarkdown(m[2])}</h${level}>`);
        continue;
      }

      if ((m = line.match(/^\s*[-*]\s+(.+)$/))) {
        if (inOl) { out.push("</ol>"); inOl = false; }
        if (!inUl) { out.push("<ul>"); inUl = true; }
        out.push(`<li>${renderInlineMarkdown(m[1])}</li>`);
        continue;
      }

      if ((m = line.match(/^\s*\d+[.)]\s+(.+)$/))) {
        if (inUl) { out.push("</ul>"); inUl = false; }
        if (!inOl) { out.push("<ol>"); inOl = true; }
        out.push(`<li>${renderInlineMarkdown(m[1])}</li>`);
        continue;
      }

      if ((m = line.match(/^\s*>\s?(.+)$/))) {
        closeLists();
        out.push(`<blockquote>${renderInlineMarkdown(m[1])}</blockquote>`);
        continue;
      }

      closeLists();
      out.push(`<p>${renderInlineMarkdown(line)}</p>`);
    }

    closeLists();
    closeCode();
    return out.join("");
  }


  function reviewMarkerPattern() {
    return /\[\[(SME_REVIEW|ENGINEERING_REVIEW|INFERENCE|SOURCE_CHECK|SCOPE_CHECK|RECOMMENDATION|CONFIRMED|UNSUPPORTED)(?:\|([^\]\r\n]{1,700}))?\]\]/gi;
  }

  function parseKnowledgeReviewMarkers(text) {
    const markers = [];
    String(text || "").replace(reviewMarkerPattern(), (_, type, reason) => {
      const key = String(type || "").toUpperCase();
      if (!REVIEW_MARKER_GUIDE[key]) return _;
      markers.push({
        type: key,
        reason: cleanText(reason || "")
      });
      return _;
    });
    return markers;
  }

  function isMaterialReviewMarker(type) {
    return ["SME_REVIEW", "ENGINEERING_REVIEW", "INFERENCE", "SOURCE_CHECK", "SCOPE_CHECK", "UNSUPPORTED"]
      .includes(String(type || "").toUpperCase());
  }

  function reviewMarkerStats(text) {
    const markers = parseKnowledgeReviewMarkers(text);
    const unique = arr => {
      const seen = new Set();
      return arr.filter(m => {
        const key = `${m.type}\u001f${cleanText(m.reason || "").toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const material = unique(markers.filter(m => isMaterialReviewMarker(m.type)));
    const blockers = unique(markers.filter(m => m.type === "UNSUPPORTED"));
    return { markers, material, blockers };
  }

  function reviewMarkerTooltip(marker) {
    const def = REVIEW_MARKER_GUIDE[marker?.type] || REVIEW_MARKER_GUIDE.SME_REVIEW;
    const note = cleanText(marker?.reason || "");
    return `${def.meaning} Action: ${def.action}${note ? ` Review note: ${note}` : ""}`;
  }

  function reviewMarkerChipHtml(marker) {
    const def = REVIEW_MARKER_GUIDE[marker?.type];
    if (!def) return "";
    const tip = reviewMarkerTooltip(marker);
    return `<span class="xa-review-chip xa-review-${escapeHtml(def.tone)}" data-review-type="${escapeHtml(marker.type)}" data-tooltip="${escapeHtml(tip)}" title="${escapeHtml(tip)}">${escapeHtml(def.icon)} ${escapeHtml(def.label)}</span>`;
  }

  function reviewMarkerGuideHtml() {
    const rows = Object.entries(REVIEW_MARKER_GUIDE).map(([type, def]) => `
      <tr>
        <td>${reviewMarkerChipHtml({ type, reason: "" })}</td>
        <td>${escapeHtml(def.meaning)}</td>
        <td>${escapeHtml(def.action)}</td>
      </tr>
    `).join("");

    return `
      <details class="xa-review-guide">
        <summary>Review Marker Guide</summary>
        <div class="xa-review-guide-body">
          <p>Colored markers appear beside the exact statement that needs attention. Resolve material amber, purple, or red items before publication. Green is confirmed; blue is informational/recommendation.</p>
          <div class="xa-review-guide-table-wrap">
            <table class="xa-review-guide-table">
              <thead><tr><th>Marker</th><th>What it means</th><th>Reviewer action</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </details>
    `;
  }

  function semanticTone(value, context = "general") {
    const v = normalizeDecision(value);
    if (!v || v === "—") return "gray";

    if (context === "verdict") {
      if (v === "CORRECT") return "green";
      if (v === "INCORRECT") return "red";
      if (v === "UNDETERMINED") return "amber";
      return "gray";
    }

    if (context === "change") {
      if (v === "YES") return "red";
      if (v === "NO") return "green";
      if (["N/A", "NOT APPLICABLE"].includes(v)) return "gray";
      if (v === "UNDETERMINED") return "amber";
      return "gray";
    }

    if (context === "readiness") {
      if (v === "READY") return "green";
      if (v === "DRAFTABLE") return "amber";
      if (v === "NOT READY") return "red";
      if (v === "NOT APPLICABLE") return "gray";
      return "gray";
    }

    if (context === "evidence") {
      if (["SUPPORTED", "YES"].includes(v)) return "green";
      if (["PARTIAL", "UNDETERMINED", "NO"].includes(v)) return "amber";
      if (v === "NOT SUPPORTED") return "red";
      return "gray";
    }

    if (context === "eligibility") {
      if (v === "IN SCOPE") return "blue";
      if (v === "OUT OF SCOPE") return "gray";
      if (v === "UNDETERMINED") return "amber";
      return "gray";
    }

    if (context === "operational") {
      if (/FAILED|NOT READY/.test(v)) return "red";
      if (/WAIT|QUEUED|ACTION|ATTENTION/.test(v)) return "amber";
      if (/RUN|CHECK|GENERAT|REUSE|REFRESH|NEW/.test(v)) return "blue";
      if (/COMPLETE|READY/.test(v)) return "green";
      return "gray";
    }

    if (context === "info") return "blue";
    return "gray";
  }

  function semanticTooltip(value, context = "general") {
    const v = normalizeDecision(value);
    if (context === "readiness") {
      if (v === "READY") return "Useful, materially complete draft with no material validation item remaining. Human review is still required before publication.";
      if (v === "DRAFTABLE") return "Useful draft, but one or more material validation/review items remain. Resolve them before publication.";
      if (v === "NOT READY") return "A material evidence, quality, provenance, or structure problem remains. The draft is kept visible for review, but must not be published as-is.";
    }
    if (context === "verdict") {
      if (v === "CORRECT") return "The current Support-owned field value is supported; no field change is recommended.";
      if (v === "INCORRECT") return "The current Support-owned field value is not supported; a change is recommended.";
      if (v === "UNDETERMINED") return "Evidence is insufficient to make the field decision safely.";
    }
    if (context === "change") {
      if (v === "YES") return "A Support-owned ticket field change is recommended.";
      if (v === "NO") return "No Support-owned ticket field change is recommended.";
      if (["N/A", "NOT APPLICABLE"].includes(v)) return "This field/change is not applicable to the selected retrospective policy.";
      if (v === "UNDETERMINED") return "The evidence is insufficient to decide whether a change is required.";
    }
    if (context === "evidence") {
      if (v === "SUPPORTED") return "The technical conclusion is supported by the available evidence.";
      if (v === "NOT SUPPORTED") return "The available evidence does not support the technical conclusion.";
      if (v === "PARTIAL") return "Only part of the conclusion is independently confirmed.";
      if (v === "UNDETERMINED") return "The available evidence is insufficient to decide safely.";
      if (v === "YES") return "Original Engineering/Jira evidence independently confirms the conclusion.";
      if (v === "NO") return "Independent Engineering confirmation was not established from the supplied original evidence.";
    }
    if (context === "eligibility") {
      if (v === "IN SCOPE") return "The current ticket values match this product's retrospective trigger.";
      if (v === "OUT OF SCOPE") return "The current ticket values are established and do not match this product's retrospective trigger.";
      if (v === "UNDETERMINED") return "The trigger field value could not be established safely.";
    }
    return "";
  }


  function semanticChipHtml(value, context = "general", tooltip = "") {
    const shown = String(value || "—").trim() || "—";
    const tone = semanticTone(shown, context);
    const tip = tooltip || semanticTooltip(shown, context);
    const icon = tone === "green" ? "✓" : tone === "red" ? "✕" : tone === "amber" ? "⚠" : tone === "purple" ? "◇" : tone === "blue" ? "ℹ" : "•";
    return `<span class="xa-semantic-chip xa-semantic-${tone}"${tip ? ` data-tooltip="${escapeHtml(tip)}" title="${escapeHtml(tip)}"` : ""}>${escapeHtml(icon)} ${escapeHtml(shown)}</span>`;
  }

  function changeDecisionChipHtml(value) {
    const v = normalizeDecision(value);
    const shown =
      v === "YES" ? "CHANGE REQUIRED" :
      v === "NO" ? "NO CHANGE" :
      ["N/A", "NOT APPLICABLE"].includes(v) ? "NOT APPLICABLE" :
      v === "UNDETERMINED" ? "REVIEW REQUIRED" :
      v || "—";
    const tone = semanticTone(v, "change");
    const tip = semanticTooltip(v, "change");
    const icon = tone === "green" ? "✓" : tone === "red" ? "✕" : tone === "amber" ? "⚠" : "•";
    return `<span class="xa-semantic-chip xa-semantic-${tone}"${tip ? ` data-tooltip="${escapeHtml(tip)}" title="${escapeHtml(tip)}"` : ""}>${escapeHtml(icon)} ${escapeHtml(shown)}</span>`;
  }

  function jobChangeNeededText(job) {
    const hasChange = [job?.resolutionChangeNeeded, job?.rcaChangeNeeded, job?.fixTypeChangeNeeded, job?.labelChangeNeeded]
      .some(v => /^yes$/i.test(v || ""));
    if (hasChange) return "YES";

    const eligibility = normalizeDecision(job?.retrospectiveEligibility);
    if (eligibility === "OUT OF SCOPE") return "N/A";

    const applicable = [job?.resolutionChangeNeeded, job?.rcaChangeNeeded, job?.fixTypeChangeNeeded, job?.labelChangeNeeded]
      .filter(v => v && !/^(not applicable|n\/a)$/i.test(v));
    if (applicable.some(v => /^no$/i.test(v))) return "NO";
    if (job?.auditAnswer) return "UNDETERMINED";
    return "—";
  }

  function knowledgeReviewCount(job) {
    const stats = reviewMarkerStats(job?.knowledgeAnswer || "");
    if (stats.material.length) return stats.material.length;
    const validation = cleanText(job?.knowledgeQualityValidationItems || "");
    if (!validation || /^(none|none identified|n\/a|not applicable)$/i.test(validation)) return 0;
    const pieces = validation.split(/(?:\r?\n|\s*;\s*|\s+·\s+|\s+-\s+)/).map(cleanText).filter(Boolean);
    return Math.max(1, pieces.length);
  }

  function readinessChipHtml(jobOrValue) {
    const value = typeof jobOrValue === "object"
      ? (jobOrValue?.validatedArtifactReadiness || jobOrValue?.artifactReadiness || "—")
      : jobOrValue;
    return semanticChipHtml(value, "readiness");
  }

  function knowledgeMarkdownToHtml(markdown) {
    let text = stripInternalKnowledgeMetadata(markdown || "");
    const markers = [];
    text = text.replace(reviewMarkerPattern(), (_, type, reason) => {
      const marker = { type: String(type || "").toUpperCase(), reason: cleanText(reason || "") };
      const token = `@@XA_REVIEW_CHIP_${markers.length}@@`;
      markers.push({ token, marker });
      return token;
    });

    let html = safeMarkdownToHtml(text);
    for (const item of markers) {
      html = html.split(item.token).join(reviewMarkerChipHtml(item.marker));
    }
    return html;
  }

  function knowledgeTextForCopy(text) {
    return stripInternalKnowledgeMetadata(text || "").replace(reviewMarkerPattern(), (_, type, reason) => {
      const marker = { type: String(type || "").toUpperCase(), reason: cleanText(reason || "") };
      const def = REVIEW_MARKER_GUIDE[marker.type];
      if (!def) return "";
      return ` ${def.icon} ${def.label}${marker.reason ? ` — ${marker.reason}` : ""}`;
    });
  }

  function knowledgeReviewFooterHtml(job) {
    if (!job) return "";
    const stats = reviewMarkerStats(job.knowledgeAnswer || "");
    const material = stats.material;
    const validation = cleanText(job.knowledgeQualityValidationItems || "");
    const hasValidation = Boolean(validation && !/^(none|none identified|n\/a|not applicable)$/i.test(validation));
    const count = knowledgeReviewCount(job);

    const markerRows = material.map((m, i) => `
      <li>
        ${reviewMarkerChipHtml(m)}
        <span>${escapeHtml(m.reason || REVIEW_MARKER_GUIDE[m.type]?.meaning || "Review required")}</span>
      </li>
    `).join("");

    const reviewDetails = (markerRows || hasValidation) ? `
      <details class="xa-review-details">
        <summary>Review &amp; Validation Items${count ? ` (${count})` : ""}</summary>
        <div class="xa-review-details-body">
          ${markerRows ? `<ol class="xa-review-item-list">${markerRows}</ol>` : ""}
          ${hasValidation ? `<div class="xa-review-validation-summary"><strong>Quality-review validation summary</strong><p>${escapeHtml(validation)}</p></div>` : ""}
        </div>
      </details>
    ` : "";

    const qualityDetails = (job.knowledgeQualitySummary || job.knowledgeQualityStatus || hasValidation) ? `
      <details class="xa-quality-details">
        <summary>Quality details</summary>
        <div class="xa-quality-details-body">
          ${job.knowledgeQualityStatus ? `<p><strong>Internal quality result:</strong> ${escapeHtml(job.knowledgeQualityStatus)}</p>` : ""}
          ${job.knowledgeQualitySummary ? `<p><strong>Summary:</strong> ${escapeHtml(job.knowledgeQualitySummary)}</p>` : ""}
          ${hasValidation ? `<p><strong>Validation:</strong> ${escapeHtml(validation)}</p>` : ""}
          <p>The primary human-facing Knowledge status is ${readinessChipHtml(job)}.</p>
        </div>
      </details>
    ` : "";

    return `<div class="xa-review-footer">${reviewDetails}${qualityDetails}${reviewMarkerGuideHtml()}</div>`;
  }


  function auditStatusGuideHtml() {
    const rows = [
      { marker: semanticChipHtml("IN SCOPE", "eligibility"), meaning: "The ticket matches the selected product retrospective criteria.", action: "Continue the retrospective review." },
      { marker: semanticChipHtml("Correct", "verdict"), meaning: "The current Support-owned field value is supported.", action: "Retain the current value." },
      { marker: semanticChipHtml("INCORRECT", "verdict"), meaning: "The current Support-owned field value is not supported.", action: "Review the recommended field change." },
      { marker: changeDecisionChipHtml("NO"), meaning: "No Support-owned field update is recommended.", action: "No ticket-field action is required." },
      { marker: changeDecisionChipHtml("YES"), meaning: "A Support-owned field update is recommended.", action: "Apply the recommended change through the normal approved workflow." },
      { marker: semanticChipHtml("READY", "readiness"), meaning: "The draft is materially complete with no material validation item remaining.", action: "Human publication review is still required." },
      { marker: semanticChipHtml("DRAFTABLE", "readiness"), meaning: "The draft is useful, but one or more material reviews/validations remain.", action: "Resolve the highlighted review items before publication." },
      { marker: semanticChipHtml("NOT READY", "readiness"), meaning: "The draft contains a material blocker or unresolved quality/evidence problem.", action: "The draft remains visible for review, but should not be published as-is." },
      ...Object.entries(REVIEW_MARKER_GUIDE).map(([type, def]) => ({
        marker: reviewMarkerChipHtml({ type, reason: "" }),
        meaning: def.meaning,
        action: def.action
      }))
    ];

    return `
      <details class="xa-review-guide">
        <summary>Status &amp; Review Marker Guide</summary>
        <div class="xa-review-guide-body">
          <p>Use the colored bubble itself as the visual cue. Color is always paired with an icon and text so meaning does not depend on color alone.</p>
          <div class="xa-review-guide-table-wrap">
            <table class="xa-review-guide-table">
              <thead><tr><th>Status / marker</th><th>What it means</th><th>Reviewer action</th></tr></thead>
              <tbody>${rows.map(r => `<tr><td>${r.marker}</td><td>${escapeHtml(r.meaning)}</td><td>${escapeHtml(r.action)}</td></tr>`).join("")}</tbody>
            </table>
          </div>
        </div>
      </details>
    `;
  }

  function auditMarkdownToHtml(markdown) {
    let html = safeMarkdownToHtml(markdown || "");
    const rules = [
      { labels: ["Retrospective Eligibility"], values: "IN SCOPE|OUT OF SCOPE|UNDETERMINED", context: "eligibility" },
      { labels: ["Technical Conclusion Evidence"], values: "SUPPORTED|NOT SUPPORTED|UNDETERMINED", context: "evidence" },
      { labels: ["Engineering Confirmation"], values: "YES|NO|PARTIAL|UNDETERMINED", context: "evidence" },
      { labels: ["Resolution Verdict", "RCA Verdict", "Fix Type Verdict", "Flag / Label Verdict"], values: "Correct|INCORRECT|UNDETERMINED", context: "verdict" },
      { labels: ["Change Required", "Resolution Change Needed", "RCA Change Needed", "Fix Type Change Needed", "Label Change Needed"], values: "YES|NO|UNDETERMINED|NOT APPLICABLE|N/A", context: "change" },
      { labels: ["Artifact Readiness", "Validated Artifact Readiness", "Validated Readiness"], values: "READY|DRAFTABLE|NOT READY|NOT APPLICABLE", context: "readiness" }
    ];

    for (const rule of rules) {
      for (const label of rule.labels) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(<strong>${escaped}:<\\/strong>\\s*)(${rule.values})(?=\\s|<|$)`, "gi");
        html = html.replace(re, (_, prefix, value) => `${prefix}${rule.context === "change" ? changeDecisionChipHtml(value) : semanticChipHtml(value, rule.context)}`);
      }
    }
    return html;
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
    const done = jobs.filter(j => j.status === "completed").length;
    const failed = jobs.filter(j => j.status === "failed").length;
    const choose = jobs.filter(j => j.status === "needs_selection").length;
    const knowledgeGenerating = jobs.filter(j => j.knowledgeStatus === "generating").length;
    const knowledgeQueued = jobs.filter(j => j.knowledgeStatus === "queued").length;

    if (jobs.length > 1) {
      const prefix = failed ? "⚠" : running || queued ? "⟳" : done ? "✓" : "•";
      const parts = [];
      if (running) parts.push(`${running} running`);
      if (queued) parts.push(`${queued} queued`);
      if (choose) parts.push(`${choose} choose SFDC`);
      if (knowledgeGenerating) parts.push(`${knowledgeGenerating} knowledge`);
      if (knowledgeQueued) parts.push(`${knowledgeQueued} knowledge queued`);
      if (done) parts.push(`${done} done`);
      if (failed) parts.push(`${failed} failed`);
      const elapsed = state.startedAt ? ` · ${formatElapsed(Date.now() - state.startedAt)}` : "";
      bubble.textContent = `${prefix} XSUP Batch · ${parts.join(" · ") || "Ready"}${elapsed}`;
      bubble.dataset.kind = failed ? "error" : (running || queued) ? "running" : done ? "ok" : "";
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
      ? auditMarkdownToHtml(text)
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
      const txt = cleanText(node.innerText || "");
      if (
        txt.includes(xsup) &&
        txt.includes(caseNumber) &&
        txt.length >= cleanText(button.innerText || "").length &&
        txt.length < 5000
      ) {
        return node;
      }
    }
    return button.parentElement || button;
  }

  async function resolveXSUPCandidates(xsup) {
    const clean = xsup.trim().toUpperCase();
    const r = await request(`/taco/search?q=${encodeURIComponent(clean)}`);
    const html = await r.text();

    const doc = new DOMParser().parseFromString(html, "text/html");
    const buttons = [...doc.querySelectorAll("button")];

    const matches = buttons.map(button => {
      const click = button.getAttribute("@click") || "";
      const caseMatch = click.match(/navigateToCase\(['"](\d+)['"]\)/);
      const buttonText = cleanText(button.innerText);
      const jiraMatch = buttonText.match(/\bXSUP-\d+\b/i);
      if (!caseMatch || !jiraMatch) return null;
      if (jiraMatch[0].toUpperCase() !== clean) return null;

      const caseNumber = caseMatch[1];
      const container = candidateContainer(button, clean, caseNumber);
      const detailText = cleanText(container?.innerText || button.innerText || "");
      const containerHtml = container?.outerHTML || button.outerHTML || "";
      const sfdcUrl = extractSalesforceCaseUrlFromHtml(containerHtml);

      const lines = detailText
        .split(/\n+/)
        .map(x => x.trim())
        .filter(Boolean);

      return {
        case_number: caseNumber,
        xsup: clean,
        text: detailText,
        details: lines.slice(0, 12).join(" · "),
        sfdc_url: sfdcUrl
      };
    }).filter(Boolean);

    const deduped = [];
    const seen = new Set();
    for (const m of matches) {
      if (seen.has(m.case_number)) continue;
      seen.add(m.case_number);
      deduped.push(m);
    }

    if (!deduped.length) throw new Error(`No TACopilot case found for ${clean}.`);
    return deduped;
  }

  async function resolveXSUP(xsup) {
    const matches = await resolveXSUPCandidates(xsup);
    return matches[0];
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

  async function waitForInvestigationId(caseNumber) {
    const deadline = Date.now() + 2 * 60 * 1000;
    while (Date.now() < deadline) {
      const invs = await getInvestigations(caseNumber);
      const latest = latestInvestigation(invs);
      if (latest?.id || latest?.investigation_id) {
        return latest.id || latest.investigation_id;
      }
      await sleep(3000);
    }
    throw new Error("Timed out waiting for TACO investigation ID.");
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
      baselineReportCount = null,
      baselineReportMarker = ""
    } = options;

    const progressUpdate = (value, meta = {}) => {
      if (onProgress) onProgress(value, meta);
      else setStep("taco", value);
    };

    const deadline = Date.now() + ANALYSIS_TIMEOUT_MS;
    let sawActiveState = false;

    while (Date.now() < deadline) {
      const d = await getProgress(caseNumber, investigationId);
      const status = String(d.status || "").toLowerCase();
      const rawProgress = d.overall_progress;
      const numericProgress = Number(rawProgress);
      const progress = Number.isFinite(numericProgress)
        ? Math.max(0, Math.min(100, numericProgress))
        : null;
      const node = d.current_node?.name || d.current_node?.label || d.current_node || "";
      const currentReportCount = getReportCount(d);

      progressUpdate(
        `Running ${progress == null ? "?" : progress}% ${node ? "— " + node : ""}`,
        {
          phase: "taco",
          tacoProgress: progress,
          tacoNode: String(node || ""),
          backendStatus: status,
          heartbeat: true,
          activity: `TACO${progress == null ? "" : ` ${progress}%`}${node ? ` · ${node}` : ""}`
        }
      );

      if (status === "failed" || status === "error") {
        throw new Error(`TACO Analysis failed: ${d.error_message || status}`);
      }

      if (status && status !== "completed") {
        sawActiveState = true;
      }

      if (status === "completed") {
        if (!requireFresh) return d;

        const countAdvanced =
          baselineReportCount !== null &&
          currentReportCount !== null &&
          currentReportCount > baselineReportCount;

        let currentMarker = "";
        let ready = false;
        try {
          const currentReport = await getReport(caseNumber, investigationId);
          ready = reportReady(currentReport);
          currentMarker = reportMarker(currentReport);
        } catch (_) {}

        const markerChanged =
          Boolean(baselineReportMarker) &&
          Boolean(currentMarker) &&
          currentMarker !== baselineReportMarker;

        if (ready && (sawActiveState || countAdvanced || markerChanged)) {
          return d;
        }

        progressUpdate("Waiting for refreshed TACO report...", {
          phase: "taco",
          tacoProgress: 100,
          backendStatus: "completed",
          heartbeat: true,
          activity: "TACO 100% · waiting for refreshed report"
        });
      }

      await sleep(POLL_MS);
    }

    throw new Error("Timed out waiting for refreshed TACO Analysis.");
  }

  async function waitForReportReady(caseNumber, investigationId, onProgress = null) {
    const deadline = Date.now() + 2 * 60 * 1000;
    const progressUpdate = (value, meta = {}) => {
      if (onProgress) onProgress(value, meta);
      else setStep("taco", value);
    };
    while (Date.now() < deadline) {
      const report = await getReport(caseNumber, investigationId);
      if (reportReady(report)) return report;
      progressUpdate("TACO completed; waiting for report content...", {
        phase: "taco",
        tacoProgress: 100,
        backendStatus: "completed",
        heartbeat: true,
        activity: "TACO 100% · waiting for synthesized report content"
      });
      await sleep(3000);
    }
    throw new Error("TACO completed, but report content was still unavailable.");
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
    const n = Number(ts);
    if (!Number.isFinite(n)) return "Unknown";
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
    const status = String(progress?.status || latest?.status || "").toLowerCase();
    const tacoTimestamp = timestampFromObject(report, progress, latest);
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

    // A usable final report takes precedence over a stale/ambiguous progress state.
    if (valid) {
      if (Number.isFinite(evidenceTimestamp) && Number.isFinite(tacoTimestamp)) {
        if (evidenceTimestamp > tacoTimestamp + 60_000) {
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

    if (isActiveTacoStatus(status)) {
      return {
        action: "wait",
        reason: `No usable final TACO report is available yet and investigation status is ${status || "running"}; waiting for that existing analysis instead of starting another.`,
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
    const xsup = job.xsup;
    const caseNumber = job.caseNumber;
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
XSUP: ${xsup}
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
- Determine current ticket field values only from the supplied original ticket/case evidence.
- "RCA Category" is NOT the same field as RCA and must never be used as a fallback/current RCA value. For an RCA trigger, establish the actual RCA field from original ticket evidence; otherwise use UNDETERMINED.
- If a trigger field cannot be established, use UNDETERMINED rather than guessing.
- OUT OF SCOPE means the supplied current field values are established and do not match this product's retrospective trigger. Do not manufacture a field review to make the ticket fit the policy.

CURRENT TICKET FIELD SNAPSHOT
${ticketFieldSnapshot(evidence)}

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

EXPLANATION STANDARD
Every applicable field decision must be understandable to an SME who did not work the case.
For each applicable field:
- state the exact current value established from original evidence,
- state Correct / INCORRECT / UNDETERMINED,
- state whether a change is required,
- give the recommended value if change is required,
- provide a detailed plain-English explanation,
- explain any important caveat and why it does or does not change the field decision,
- identify the strongest original evidence,
- state the exact Support action.

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

KNOWLEDGE DECISION
After the product-specific field decision, choose one primary reusable knowledge action:
- CREATE KCS: repeatable support-resolution pattern: symptom/error -> check -> confirm -> fix/workaround -> verify.
- UPDATE EXISTING KCS: a relevant KCS exists but materially lacks needed resolution content.
- UPDATE ADMIN/TECH GUIDE: official product behavior/configuration/expectation should be clearer for administrators/customers.
- CREATE/UPDATE RUNBOOK: reusable value is internal investigation/evidence workflow rather than complete resolution content.
- KNOWN ISSUE/RELEASE NOTE: version-specific defect/limitation belongs there.
- NO KNOWLEDGE ACTION: no material reusable gap.
- UNDETERMINED: evidence is insufficient to choose safely.

ARTIFACT READINESS
- READY: enough evidence to create a useful draft now.
- DRAFTABLE: a useful draft can be created, but named validation items remain.
- NOT READY: insufficient evidence for a useful artifact.
- NOT APPLICABLE: no knowledge artifact is recommended.

Return EXACTLY this structure:

**Target Ticket:** ${xsup}

**Product Family:** ${profile.label}

**Retrospective Eligibility:** [IN SCOPE / OUT OF SCOPE / UNDETERMINED]

## Case Summary

**Reported Issue:** [concise issue]

**Technical Conclusion:** [evidence-backed technical conclusion]

**Technical Conclusion Evidence:** [SUPPORTED / NOT SUPPORTED / UNDETERMINED]

**Technical Conclusion Evidence Explanation:** [detailed reason]

**Engineering Confirmation:** [YES / NO / PARTIAL / UNDETERMINED]

**Engineering Confirmation Evidence:** [original evidence and what it proves]

**Important Technical Caveat:** [important caveat or "None identified"]

## Support-Owned Field Decisions

**Reviewed Fields:** [list ONLY fields that are applicable under the selected product policy, or "None — Out of Scope", or "UNDETERMINED"]

**Resolution Change Needed:** [YES / NO / NOT APPLICABLE / UNDETERMINED]

**RCA Change Needed:** [YES / NO / NOT APPLICABLE / UNDETERMINED]

**Fix Type Change Needed:** [YES / NO / NOT APPLICABLE / UNDETERMINED]

**Label / Flag Change Needed:** [YES / NO / NOT APPLICABLE / UNDETERMINED]

### Resolution Review
[Include ONLY if Resolution is applicable under the selected product policy. Otherwise omit this subsection.]

**Resolution Current Value:** [exact value from original evidence]

**Resolution Verdict:** [Correct / INCORRECT / UNDETERMINED]

**Resolution Change Required:** [YES / NO / UNDETERMINED]

**Resolution Recommended Value:** [exact recommended value or "No change"]

**Resolution Detailed Explanation:** [detailed explanation]

**Resolution Supporting Evidence:** [2-5 strongest original evidence points]

**Resolution Support Action:** [exact Support action]

### RCA Review
[Include ONLY if RCA is applicable under the selected product policy. Otherwise omit this subsection.]

**RCA Current Value:** [exact current value]

**RCA Verdict:** [Correct / INCORRECT / UNDETERMINED]

**RCA Change Required:** [YES / NO / UNDETERMINED]

**RCA Recommended Value:** [exact recommended value or "No change"]

**RCA Detailed Explanation:** [detailed explanation]

**RCA Supporting Evidence:** [strongest original evidence]

**RCA Support Action:** [exact Support action]

### Fix Type Review
[Include ONLY if Fix Type is applicable under the selected product policy. Otherwise omit this subsection.]

**Fix Type Current Value:** [exact current value]

**Fix Type Verdict:** [Correct / INCORRECT / UNDETERMINED]

**Fix Type Change Required:** [YES / NO / UNDETERMINED]

**Fix Type Recommended Value:** [exact recommended value or "No change"]

**Fix Type Detailed Explanation:** [detailed explanation]

**Fix Type Supporting Evidence:** [strongest original evidence]

**Fix Type Support Action:** [exact Support action]

### Flag / Label Review
[Include ONLY if Flag/Label is applicable under the selected product policy. Otherwise omit this subsection.]

**Flag / Label Current Value:** [exact current value]

**Flag / Label Verdict:** [Correct / INCORRECT / UNDETERMINED]

**Flag / Label Change Required:** [YES / NO / UNDETERMINED]

**Flag / Label Recommended Value:** [exact recommended value or "No change"]

**Flag / Label Detailed Explanation:** [detailed explanation]

**Flag / Label Supporting Evidence:** [strongest original evidence]

**Flag / Label Support Action:** [exact Support action]

## Supporting Context for the Field Decision

**Material Context:** [Only facts that materially help explain the field verdict/eligibility/knowledge action. If none, "No additional context required."]

**Why It Matters:** [how this context affects—or does not affect—the field decision]

## Knowledge Action

**Primary Knowledge Action:** [CREATE KCS / UPDATE EXISTING KCS / UPDATE ADMIN/TECH GUIDE / CREATE/UPDATE RUNBOOK / KNOWN ISSUE/RELEASE NOTE / NO KNOWLEDGE ACTION / UNDETERMINED]

**Secondary Knowledge Action:** [same values or NONE]

**Artifact Readiness:** [READY / DRAFTABLE / NOT READY / NOT APPLICABLE]

**Artifact Type:** [KCS Draft / KCS Update Proposal / Admin/Tech Guide Update Proposal / Runbook Draft / Known Issue / Release Note Draft / None / Undetermined]

**Existing Knowledge Coverage:** [COMPLETE / PARTIAL / NONE / UNDETERMINED]

**Knowledge Decision Explanation:** [detailed reason]

**Knowledge Evidence:** [specific evidence]

**Validation Boundary:** [validation items or "No additional validation items identified for draft generation"]

**Auto-Generate Knowledge Artifact:** [YES / NO]

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

  function knowledgeArtifactType(job) {
    const action = normalizeDecision(job.knowledgeAction);
    const readiness = normalizeDecision(job.artifactReadiness);

    if (!["READY", "DRAFTABLE"].includes(readiness)) return "";

    if (action === "CREATE KCS") return "KCS_DRAFT";
    if (action === "UPDATE EXISTING KCS") return "KCS_UPDATE";
    if (action === "UPDATE ADMIN/TECH GUIDE") return "DOC_UPDATE";
    if (action === "CREATE/UPDATE RUNBOOK") return "RUNBOOK";
    if (action === "KNOWN ISSUE/RELEASE NOTE") return "KNOWN_ISSUE";
    return "";
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
`;

    const artifact = ({
      KCS_DRAFT: `
KCS-SPECIFIC QUALITY
- Searchable, symptom-oriented and resolution-oriented.
- A TAC engineer should quickly understand: symptom -> applicability -> cause -> check -> confirm -> resolve/work around -> verify.
- Include Additional Troubleshooting and Expected Behavior / Limitations when they materially help.
- Do not make escalation the primary resolution.
`,
      KCS_UPDATE: `
KCS UPDATE QUALITY
- Identify the existing article if actually found.
- Clearly separate existing coverage from the new gap.
- Provide ready-to-review additions rather than rewriting unrelated sections.
- Improve discoverability when the existing title/keywords would make the issue hard to find.
`,
      DOC_UPDATE: `
ADMIN/TECH GUIDE QUALITY
- Optimize for administrator/customer architectural and operational clarity.
- Explain expected behavior, configuration implications and limitations.
- Operational commands/UI/API details must be sourced; otherwise omit or mark validation.
- Proposed text should be suitable for a documentation owner to review without case-specific clutter.
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
Primary Knowledge Action: ${job.knowledgeAction || "UNDETERMINED"}
Initial Artifact Readiness: ${job.artifactReadiness || "NOT APPLICABLE"}

PURPOSE
Create a high-quality reusable DRAFT for later human review.
Do not merely restate the retrospective.

STARTING CASE BASIS
${job.auditAnswer}

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
- Do not claim that a source was searched/read unless it is actually available to this Case Chat/TACO context.
- Every factual addition that is not already established in the retrospective must be traceable to an underlying source.
- Cite the underlying document/case/Jira/reference, not "TACO" or "Case Chat" as the source.
- Search absence is not proof that no documentation exists.
- Prefer directly relevant, authoritative sources. Do not add loosely related references just to make the article look comprehensive.
- If existing knowledge already substantially covers the issue, say so and prefer an update proposal rather than duplicate content where the requested artifact type permits it.

GENERALIZATION + SAFETY
- Generalize the reusable technical pattern across customers.
- Do not expose customer-specific names, tenant IDs, hostnames or confidential one-off data unless absolutely necessary as a labeled example.
- Never invent product versions, supported platforms, event IDs, commands, registry/config paths, exclusion paths, UI navigation, API routes/payloads, process paths, workarounds, expected values, service names, return codes, exact timings, architecture behavior or remediation.
- If a useful material detail cannot be established, omit it or mark it "TAC/SME validation required".
- Do not turn an inference or plausible troubleshooting idea into a confirmed fact/fix.
- Do not include internal reuse metadata such as ${REUSE_META_PREFIX}.
- Do not include unresolved placeholders.
- This is a draft/proposal. Do not say it is approved or already published.

${knowledgeQualityRubric(type)}
`;

    if (type === "KCS_DRAFT") {
      return `${common}

Return the draft in this structure:

# [Searchable symptom/error-first title]

**Draft Status:** DRAFT — REVIEW REQUIRED BEFORE PUBLICATION
**Generated From:** ${job.xsup}
**Knowledge Type:** KCS

## Symptoms / Error
[observable symptoms/errors/status]

## Applies To
[product/platform/version only when established]

## What It Means
[concise interpretation]

## Cause
[evidence-backed root cause/failure mechanism]

## How to Check
[numbered checks]

## How to Confirm
[what specifically confirms this cause]

## Resolution / Fix
[actionable evidence-backed fix/workaround/expected-behavior guidance]

## How to Verify the Fix
[post-action verification]

## Additional Troubleshooting
[useful evidence-backed checks/alternatives; omit if none add value]

## Expected Behavior / Limitations
[important design boundaries/limitations; omit if not relevant]

## Example
[generalized example only if useful]

## Related Knowledge / Documentation
[only directly useful related sources]

## Search Keywords
[search terms/error strings/product concepts; do not include XSUP/SFDC IDs]

## Source References
[direct supporting source IDs/titles/links]

## TAC/SME Validation Items
[material items still requiring validation, or "None identified"]
`.trim();
    }

    if (type === "KCS_UPDATE") {
      return `${common}

Return the draft in this structure:

# Existing KCS Update Proposal

**Draft Status:** DRAFT — REVIEW REQUIRED
**Generated From:** ${job.xsup}

## Existing Knowledge Reference
[existing KCS title/ID/link if actually identified]

## Current Coverage
[what it already covers]

## Gap Identified
[material missing/unclear content]

## Proposed Additions / Changes
[ready-to-review text]

## Troubleshooting / Verification Improvements
[useful improvements if applicable]

## Search / Discoverability Improvements
[title/keywords/tags if useful]

## Related Knowledge / Documentation
[only directly useful related sources]

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

## Related Knowledge / Documentation
[only directly useful related sources]

## Source References
[direct supporting source IDs/titles/links]

## Validation Items
[material product/version/command/API/UI/timing details requiring validation, or "None identified"]
`.trim();
    }

    if (type === "RUNBOOK") {
      return `${common}

Return the draft in this structure:

# TAC Runbook Draft

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

## Related Knowledge / Documentation
[only directly useful related sources]

## Source References
[direct supporting source IDs/titles/links]

## Validation Items
[material details requiring validation, or "None identified"]
`.trim();
    }

    return `${common}

Return the draft in this structure:

# Known Issue / Release Note Draft

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

## Related Knowledge / Documentation
[only directly useful related sources]

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
      readiness: base.readiness
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
- Remove internal metadata/placeholders.
- Ensure fenced code blocks render correctly.
- Ensure any command/API/UI/version/timing/config/remediation detail is source-backed or explicitly marked for TAC/SME validation.
- If an existing KCS/doc already covers the material issue, make the final proposal complement/update it rather than duplicate it.
- Do not use the originating XSUP/SFDC ID as a reusable search keyword.
- Do not say "publish" as an already-approved action. This remains a draft for human review.

INLINE REVIEW ANNOTATIONS
Use the following exact compact markers immediately AFTER the specific sentence, command, path, API, timing, architecture statement, or recommendation they apply to. The HTML renderer converts them into small colored review chips with tooltips:
- [[SME_REVIEW|concise reason]] — product behavior, timing, UI/configuration, or operational detail needs SME validation.
- [[ENGINEERING_REVIEW|concise reason]] — backend, architecture, API, or implementation detail needs Engineering confirmation.
- [[INFERENCE|concise reason]] — useful derived conclusion is not directly established by the supplied underlying evidence.
- [[SOURCE_CHECK|concise reason]] — claim needs a stronger/direct underlying source.
- [[SCOPE_CHECK|concise reason]] — version/OS/platform/applicability scope needs confirmation.
- [[RECOMMENDATION|concise reason]] — helpful guidance/best practice rather than mandatory product behavior. This is normally non-blocking.
- [[CONFIRMED|concise source cue]] — use sparingly for an important conclusion directly confirmed by an underlying authoritative/Engineering source.
- [[UNSUPPORTED|concise reason]] — material claim is not sufficiently supported and cannot safely remain as written.

ANNOTATION RULES
1. Do not over-annotate ordinary supported prose. Mark only specific facts that materially help a reviewer understand confidence/action.
2. Every material Validation Item should have an inline SME/Engineering/Inference/Source/Scope marker at the affected statement when a specific statement exists. Repeat the same marker at the start of the corresponding Validation Items bullet so the review need is also color-coded there. If there is no single affected statement, placing the marker in the Validation Items bullet is sufficient.
3. Do not use [[CONFIRMED]] merely because TACO says something. It requires an underlying source or original Engineering evidence.
4. [[SME_REVIEW]], [[ENGINEERING_REVIEW]], [[INFERENCE]], [[SOURCE_CHECK]], and [[SCOPE_CHECK]] are material review items. If any remain, final readiness must be DRAFTABLE unless the artifact has a stronger blocker.
5. [[UNSUPPORTED]] is a blocker. Rewrite/remove/support the claim before PASS; otherwise return FAIL + NOT READY.
6. [[RECOMMENDATION]] is informational and does not by itself prevent READY.
7. These human-facing [[...]] annotations are allowed in the final draft. Raw internal markers [inference], [from case data], [derived analysis], and [XSUP-AUDITOR-META] are NOT allowed.
8. Never solve uncertainty by deleting a raw provenance marker while leaving the unsupported claim as a confirmed fact.
9. For fenced code blocks, place the review marker immediately AFTER the closing Markdown code fence or in the explanatory sentence beside the block; do not place review-marker syntax inside executable code.

PROVENANCE RESOLUTION — MANDATORY
The retrospective or enriched draft may contain internal analytical markers such as:
[inference], [from case data], [derived analysis].
These markers are useful during investigation but are NEVER allowed in the final user-facing artifact.

For EVERY statement carrying one of those markers:
1. Do NOT merely delete the marker while leaving the claim unchanged.
2. If the claim is supported by an underlying source explicitly available in the supplied retrospective/draft, rewrite it as a normal sourced statement and cite/identify that underlying source.
3. If the claim is useful but the supplied material does not establish it strongly enough, rewrite it as a clearly named TAC/SME validation item and set readiness to DRAFTABLE when material.
4. If the claim is unnecessary or cannot be supported safely, remove the claim.
5. Never convert an inference into a confirmed product fact just by removing the marker.

Before producing the final artifact, perform a final self-check:
- no [inference], [from case data], or [derived analysis] marker remains,
- no [XSUP-AUDITOR-META] marker remains,
- no unresolved @@...@@ token or editorial placeholder remains,
- any material uncertainty appears in the artifact's Validation section and in MATERIAL_VALIDATION_ITEMS,
- the final readiness agrees with those validation items.

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

${KNOWLEDGE_FINAL_DELIMITER}
[the complete polished ${label}; no quality commentary before/after the artifact]
`.trim();
  }


  function shouldAttemptKnowledgeQualityRepair(parsed) {
    if (!parsed || parsed.status === "FAIL") return false;

    // One repair pass is useful not only for deterministic artifact defects,
    // but also for a malformed quality envelope. Do not retry substantive FAILs.
    if (
      parsed.valid === false &&
      /quality reviewer did not return|invalid QUALITY_STATUS/i.test(parsed.reason || "")
    ) {
      return true;
    }

    return Array.isArray(parsed.issues) && parsed.issues.length > 0;
  }

  function buildKnowledgeQualityRepairPrompt(job, previousQualityAnswer, parsedFailure) {
    const type = job.knowledgeArtifactType || knowledgeArtifactType(job);
    const label = knowledgeArtifactLabel(type);
    const issues = Array.isArray(parsedFailure?.issues) && parsedFailure.issues.length
      ? parsedFailure.issues.map(x => `- ${x}`).join("\n")
      : "- deterministic quality/safety validation did not approve the artifact";

    return `
KNOWLEDGE FINAL ARTIFACT REPAIR — ONE AUTOMATIC REMEDIATION PASS

Target XSUP: ${job.xsup}
SFDC: ${job.caseNumber}
Product: ${productLabel(job)}
Artifact Type: ${label}

PURPOSE
The independent knowledge review produced a useful candidate, but deterministic post-review checks found one or more generic quality/safety defects.
Repair the artifact once. Do not create a new diagnosis and do not broaden the factual basis.

AUTHORITATIVE RETROSPECTIVE BASIS
${job.auditAnswer}

ENRICHED DRAFT SOURCE MATERIAL
${job.knowledgeDraftAnswer || ""}

PREVIOUS QUALITY-REVIEW RESPONSE
${previousQualityAnswer}

DETERMINISTIC ISSUES TO RESOLVE
${issues}

REPAIR RULES
1. Preserve correct, useful, source-supported content.
2. Do not introduce new product facts, commands, APIs, paths, versions, timing, architecture, workarounds, fixes, or source claims unless they are explicitly supported by the supplied retrospective/previous draft material.
3. Internal provenance markers such as [inference], [from case data], and [derived analysis] must not appear in the final artifact.
4. Do NOT fix a provenance marker by simply deleting the marker:
   - source-backed claim -> rewrite as a normal claim and identify/cite the underlying source,
   - useful but insufficiently established claim -> move/rewrite as a TAC/SME validation item,
   - unnecessary/unsafe claim -> remove it.
5. If resolving a material uncertainty requires human verification, keep the useful draft but set PASS_WITH_VALIDATION + DRAFTABLE and name the validation item.
6. If the artifact cannot be made safe/useful from the supplied basis, return FAIL + NOT READY rather than inventing missing information.
7. Remove internal reuse metadata, unresolved @@...@@ tokens, editorial placeholders, and raw analysis/provenance labels.
8. Repair missing/incorrect required sections, Markdown/code-fence problems, reusable Search Keywords, and Source References using only information already supported by the supplied material.
9. Source References must identify underlying sources. Do not use TACO or Case Chat alone as the source.
10. This remains a draft for human review. Do not state that it has been published or formally approved.
11. Preserve/add the allowed human-facing inline review annotations when they help the reviewer act on a specific claim:
    [[SME_REVIEW|reason]], [[ENGINEERING_REVIEW|reason]], [[INFERENCE|reason]], [[SOURCE_CHECK|reason]], [[SCOPE_CHECK|reason]], [[RECOMMENDATION|reason]], [[CONFIRMED|source cue]].
12. Material human review annotations require DRAFTABLE. [[UNSUPPORTED|reason]] must not survive a PASS result; support/rewrite/remove the claim or return FAIL + NOT READY.
13. Do not confuse allowed [[...]] review annotations with forbidden raw internal provenance markers such as [inference].

${knowledgeQualityRubric(type)}

FINAL SELF-CHECK BEFORE OUTPUT
- required artifact structure is present,
- no internal provenance/reuse marker remains,
- no unresolved placeholder/token remains,
- no unsupported statement was promoted to fact,
- validation items and readiness agree,
- Source References are directly relevant and identify underlying sources.

OUTPUT EXACTLY:

QUALITY_STATUS: [PASS / PASS_WITH_VALIDATION / FAIL]
VALIDATED_ARTIFACT_READINESS: [READY / DRAFTABLE / NOT READY]
QUALITY_SUMMARY: [one concise sentence]
MATERIAL_VALIDATION_ITEMS: [None / concise list]

${KNOWLEDGE_FINAL_DELIMITER}
[the complete repaired ${label}; no repair commentary before/after the artifact]
`.trim();
  }


  function stripInternalKnowledgeMetadata(text) {
    return String(text || "")
      .split(/\r?\n/)
      .filter(line => !line.includes(REUSE_META_PREFIX))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function resolveRawProvenanceForHumanReview(text) {
    return stripInternalKnowledgeMetadata(text)
      .replace(
        /\[inference\]/gi,
        "[[INFERENCE|This statement is derived from available evidence but is not directly established; validate or source it before publication.]]"
      )
      .replace(
        /\[derived analysis\]/gi,
        "[[INFERENCE|This statement comes from derived analysis; validate or source it before publication.]]"
      )
      .replace(
        /\[from case data\]/gi,
        "[[SOURCE_CHECK|This statement is case-derived; confirm the underlying authoritative source before publication.]]"
      );
  }

  function extractKnowledgeSection(text, headingNames) {
    const a = String(text || "");
    for (const name of headingNames) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?:^|\\n)##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "i");
      const m = a.match(re);
      if (m) return cleanText(m[1]);
    }
    return "";
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

  function deterministicKnowledgeQualityChecks(artifact, job, requestedReadiness = "") {
    const text = resolveRawProvenanceForHumanReview(artifact);
    const issues = [];
    const type = job.knowledgeArtifactType || knowledgeArtifactType(job);

    if (text.length < 180) issues.push("artifact is incomplete");
    if (text.includes(REUSE_META_PREFIX)) issues.push("internal reuse metadata is visible");
    if (/@@[A-Z][A-Z0-9_:-]*@@/i.test(text)) issues.push("unresolved internal placeholder/token is visible");
    if (/\[(?:inference|from case data|derived analysis)\]/i.test(text)) issues.push("raw internal provenance marker is visible");
    if (/\[(?:insert|todo|tbd|placeholder)[^\]]*\]/i.test(text)) issues.push("unresolved editorial placeholder is visible");

    const fences = (text.match(/```/g) || []).length;
    if (fences % 2 !== 0) issues.push("Markdown code fence is not balanced");

    const requiredHeadingSets = {
      KCS_DRAFT: ["Symptoms / Error", "Cause", "How to Check", "How to Confirm", "Resolution / Fix", "Source References"],
      KCS_UPDATE: ["Existing Knowledge Reference", "Gap Identified", "Proposed Additions / Changes", "Source References"],
      DOC_UPDATE: ["Target Documentation", "Documentation Gap", "Proposed Documentation Text", "Source References"],
      RUNBOOK: ["Trigger / When to Use", "Objective", "Investigation Workflow", "Decision Points", "Source References"],
      KNOWN_ISSUE: ["Issue", "Symptoms", "Cause / Limitation", "Proposed Release Note / Known Issue Text", "Source References"]
    };
    for (const heading of requiredHeadingSets[type] || []) {
      const re = new RegExp(`(?:^|\\n)##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:\\n|$)`, "i");
      if (!re.test(text)) issues.push(`missing required section: ${heading}`);
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

    const reviewMarkers = reviewMarkerStats(text);
    const sectionValidation = hasMaterialValidationItems(text);
    const materialValidation = sectionValidation || reviewMarkers.material.length > 0;
    if (reviewMarkers.blockers.length) issues.push("unsupported review marker remains");
    if (sectionValidation && !reviewMarkers.material.length) {
      issues.push("material validation items are not linked to an inline review marker");
    }

    let readiness = normalizeDecision(requestedReadiness);
    if (!["READY", "DRAFTABLE", "NOT READY"].includes(readiness)) readiness = "DRAFTABLE";
    if (materialValidation && readiness === "READY") readiness = "DRAFTABLE";
    if (issues.length && readiness === "READY") readiness = "DRAFTABLE";

    const blocking = issues.some(issue =>
      /incomplete|internal reuse metadata|unresolved internal placeholder|raw internal provenance|unresolved editorial placeholder|code fence|missing required section|artifact targets|Source References|unsupported review marker/i.test(issue)
    );

    if (blocking) readiness = "NOT READY";

    return {
      valid: !blocking,
      issues,
      readiness,
      materialValidation,
      reviewMarkers: reviewMarkers.markers
    };
  }


  function parseKnowledgeQualityResponse(rawAnswer, job) {
    const raw = String(rawAnswer || "").trim();
    const delimiterIndex = raw.indexOf(KNOWLEDGE_FINAL_DELIMITER);
    if (delimiterIndex < 0) {
      return {
        valid: false,
        qualityApproved: false,
        reason: `quality reviewer did not return ${KNOWLEDGE_FINAL_DELIMITER}`,
        artifact: ""
      };
    }

    const header = raw.slice(0, delimiterIndex).trim();
    const artifact = resolveRawProvenanceForHumanReview(
      raw.slice(delimiterIndex + KNOWLEDGE_FINAL_DELIMITER.length)
    );

    const getHeader = name => {
      const re = new RegExp(`^${name}:\\s*(.+)$`, "im");
      return cleanText(header.match(re)?.[1] || "");
    };

    const status = normalizeDecision(getHeader("QUALITY_STATUS"));
    const requestedReadiness = normalizeDecision(getHeader("VALIDATED_ARTIFACT_READINESS"));
    const summary = getHeader("QUALITY_SUMMARY");
    const validationItems = getHeader("MATERIAL_VALIDATION_ITEMS");

    if (artifact.length < 160) {
      return {
        valid: false,
        qualityApproved: false,
        reason: "quality reviewer did not return a usable final artifact",
        status: ["PASS", "PASS_WITH_VALIDATION", "FAIL"].includes(status) ? status : "FAIL",
        readiness: "NOT READY",
        summary,
        validationItems,
        artifact
      };
    }

    if (!["PASS", "PASS_WITH_VALIDATION", "FAIL"].includes(status)) {
      return {
        valid: false,
        qualityApproved: false,
        reason: "quality reviewer returned invalid QUALITY_STATUS",
        status: "FAIL",
        readiness: "NOT READY",
        summary,
        validationItems,
        artifact
      };
    }

    const checks = deterministicKnowledgeQualityChecks(
      artifact,
      job,
      requestedReadiness
    );

    let readiness = checks.readiness;
    if (status === "FAIL") readiness = "NOT READY";
    if (status === "PASS_WITH_VALIDATION" && readiness === "READY") readiness = "DRAFTABLE";
    if (validationItems && !/^(none|none identified|n\/a|not applicable)$/i.test(validationItems) && readiness === "READY") {
      readiness = "DRAFTABLE";
    }

    const finalStatus = readiness === "DRAFTABLE" && status === "PASS"
      ? "PASS_WITH_VALIDATION"
      : status;

    const qualityApproved =
      finalStatus !== "FAIL" &&
      readiness !== "NOT READY" &&
      checks.valid;

    return {
      valid: true,
      qualityApproved,
      reason: qualityApproved
        ? ""
        : [
            summary || "Knowledge draft requires human review before publication",
            ...checks.issues
          ].filter(Boolean).join(" · "),
      status: finalStatus,
      readiness,
      summary,
      validationItems,
      artifact,
      issues: checks.issues
    };
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
      readiness
    }));

    return {
      type: "knowledge",
      schema: KNOWLEDGE_REUSE_SCHEMA,
      fingerprint,
      product: job.productKey || "UNSELECTED",
      audit: job.auditFingerprint || auditHash,
      action,
      artifact,
      readiness
    };
  }

  async function getFollowupHistory(caseNumber, investigationId) {
    const r = await request(
      `/taco/pilot/investigation/${caseNumber}/followup?investigation_id=${encodeURIComponent(investigationId)}`
    );
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

      if (type === "audit") {
        return /XSUP RETROSPECTIVE AUDIT|SUPPORT-OWNED FIELD REVIEW|Resolution Detailed Explanation/i.test(q);
      }

      return /GLOBAL DRAFT RULES|Admin\s*\/?\s*Tech Guide Update Proposal|KCS Draft|TAC Runbook Draft|Knowledge Action/i.test(q);
    }) || null;
  }

  function latestAuditorFollowup(history, type) {
    return sortFollowupsNewest(collectFollowupHistoryItems(history))
      .find(item => parseReuseMarker(item.question)?.type === type) || null;
  }


  function currentSourceBoundary(job, type) {
    const values = [
      Number(job.latestCaseEvidenceAt) || 0,
      Number(job.tacoAnalysisAt) || 0
    ];
    if (type !== "audit") values.push(Number(job.auditCompletedAt) || 0);
    return Math.max(...values);
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
    const questionArtifact = normalizeDecision(
      extractField(q, "Requested Artifact") ||
      extractField(q, "Artifact Type")
    );

    if (questionArtifact && currentArtifact) {
      const expectedLabel = normalizeDecision(knowledgeArtifactLabel(currentArtifact));
      if (
        questionArtifact !== normalizeDecision(currentArtifact) &&
        questionArtifact !== expectedLabel
      ) return false;
    }

    return true;
  }

  function findCurrentCompatibleCompletedFollowup(history, { job, type }) {
    const boundary = currentSourceBoundary(job, type);
    const items = sortFollowupsNewest(collectFollowupHistoryItems(history));

    return items.find(item => {
      if (String(item.status || "").toLowerCase() !== "completed" || !item.answer) return false;
      const completedAt = followupTimestamp(item) || 0;
      if (!completedAt || completedAt < boundary) return false;

      const q = String(item.question || "");
      if (!q.toUpperCase().includes(String(job.xsup || "").toUpperCase())) return false;
      if (!candidateProductMatches(item, job)) return false;

      if (type === "audit") {
        if (!/XSUP RETROSPECTIVE AUDIT|SUPPORT-OWNED FIELD REVIEW|Resolution Detailed Explanation/i.test(q)) return false;
        return validateReusableAuditAnswer(item.answer, job).valid;
      }

      if (!/KNOWLEDGE|KCS|Admin\s*\/?\s*Tech Guide|Runbook|Known Issue|Release Note/i.test(q)) return false;
      if (!candidateKnowledgeInputsMatch(item, job)) return false;

      // Accept both current quality-review envelopes and older complete artifacts.
      const quality = parseKnowledgeQualityResponse(item.answer, job);
      if (quality.valid) return true;
      return validateReusableKnowledgeAnswer(item.answer, job).valid;
    }) || null;
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
      "Primary Knowledge Action",
      "Artifact Readiness"
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
    return {valid:true};
  }

  function validateReusableKnowledgeAnswer(answer, job, reuseType = "knowledge") {
    const a = String(answer || "").trim();
    if (a.length < 160) return {valid:false, reason:"artifact is incomplete"};

    if (reuseType === "knowledge") {
      const parsed = parseKnowledgeQualityResponse(a, job);
      if (!parsed.valid || !parsed.qualityApproved || normalizeDecision(parsed.readiness) === "NOT READY") {
        return {valid:false, reason:`final quality-reviewed artifact is not reusable: ${parsed.reason || parsed.readiness || "quality review requires attention"}`};
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

    if (a.includes(REUSE_META_PREFIX)) {
      return {valid:false, reason:"draft contains internal reuse metadata"};
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
      history = await getFollowupHistory(job.caseNumber, job.investigationId);
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
      const compatible = findCurrentCompatibleCompletedFollowup(history, {
        job,
        type
      });

      if (compatible) {
        return {
          reused: true,
          answer: compatible.answer,
          followupId: compatible.id,
          completedAt: followupTimestamp(compatible) || Date.now(),
          historyCount: historyItems.length,
          reuse_match: "source-current-compatible",
          reason: `Reused existing ${type} Case Chat #${compatible.id}; it is structurally compatible and was completed after the current TACO/Jira/SFDC source boundary. Auditor prompt/schema changes alone do not force regeneration.`
        };
      }

      const markedPrevious = latestAuditorFollowup(history, type);
      const likelyPrevious =
        markedPrevious ||
        latestLikelyAuditorFollowup(history, type, job.xsup);

      return {
        reused: false,
        reason: likelyPrevious
          ? `Previous ${type} Case Chat #${likelyPrevious.id} is not current/compatible with the latest TACO/Jira/SFDC source boundary or selected product/artifact.`
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
      onProgress?.(
        `Matching ${type} Case Chat #${candidate.id} is already running · waiting instead of creating a duplicate`
      );

      answer = await waitForFollowup(
        job.caseNumber,
        candidate.id,
        value => onProgress?.(value)
      );
      completedAt = Date.now();
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
        onProgress?.(
          `Matching ${type} Case Chat #${candidate.id} is already running · waiting instead of creating a duplicate`
        );
        answer = await waitForFollowup(
          job.caseNumber,
          candidate.id,
          value => onProgress?.(value)
        );
        completedAt = Date.now();
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

      const r = await request(`/taco/pilot/investigation/task/${encodeURIComponent(taskId)}`);
      const j = await r.json();

      if (j?.success === false || j?.error) {
        throw new Error(`Case Chat task rejected: ${j?.error || "unknown service error"}`);
      }

      const id = extractFollowupId(j);
      if (id) return id;

      const d = j?.data || j;
      const status = String(d?.status || j?.status || "").toLowerCase();

      if (status === "failed" || status === "error") {
        throw new Error(
          d?.error_message ||
          j?.error_message ||
          "Case Chat task failed."
        );
      }

      // Fallback: TACopilot exposes follow-up history for the investigation.
      // Match our exact submitted question and recover its followup_id.
      if (attempt % 3 === 0) {
        try {
          const hr = await request(
            `/taco/pilot/investigation/${caseNumber}/followup?investigation_id=${encodeURIComponent(investigationId)}`
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

  async function waitForFollowup(caseNumber, followupId, onProgress = null) {
    const deadline = Date.now() + CHAT_TIMEOUT_MS;

    const progressUpdate = (value, meta = {}) => {
      if (onProgress) onProgress(value, meta);
      else setStep("audit", value);
    };
    while (Date.now() < deadline) {
      const r = await request(`/taco/pilot/investigation/${caseNumber}/followup/status/${encodeURIComponent(followupId)}`);
      const j = await r.json();
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
    throw new Error("Timed out waiting for Case Chat audit.");
  }


  function extractField(text, label) {
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\*\\*${esc}:\\*\\*\\s*([^\\n]+)`, "i");
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

    const validationBoundary = extractField(out, "Validation Boundary");
    const materialValidation =
      Boolean(validationBoundary) &&
      !/^(?:none|none identified|not applicable|n\/a|no additional validation items(?: identified)?(?: for draft generation)?)[.!]?$/i.test(validationBoundary) &&
      /validation|required|verify|verification|SME|Engineering|documentation owner|review|exact\s+(?:UI|API|path|timing|version|schema)/i.test(validationBoundary);

    if (materialValidation) {
      out = out.replace(
        /(\*\*Artifact Readiness:\*\*\s*)READY\b/i,
        "$1DRAFTABLE"
      );
    }

    out = out.replace(
      /(\*\*Knowledge Action Summary:\*\*\s*[^\n\r]*)/gi,
      line => line
        .replace(/\bpublish(?:ing)?\s+a\s+KCS\s+article\b/gi, "prepare a KCS draft")
        .replace(/\bpublish(?:ing)?\s+the\s+KCS\b/gi, "prepare the KCS draft")
    );

    return out;
  }

  // Both the normal Case Chat path and "Re-run Audit" use this single
  // parser so field extraction cannot drift between the two workflows.
  function applyAuditResult(job, rawAnswer) {
    job.auditAnswer = normalizeAuditConsistency(rawAnswer);

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

    job.rcaVerdict = extractField(job.auditAnswer, "RCA Verdict");
    job.rcaExplanation = extractField(job.auditAnswer, "RCA Detailed Explanation");
    job.rcaRecommendedValue = extractField(job.auditAnswer, "RCA Recommended Value");

    job.fixTypeVerdict = extractField(job.auditAnswer, "Fix Type Verdict");
    job.fixTypeExplanation = extractField(job.auditAnswer, "Fix Type Detailed Explanation");
    job.fixTypeRecommendedValue = extractField(job.auditAnswer, "Fix Type Recommended Value");

    job.labelVerdict =
      extractField(job.auditAnswer, "Flag / Label Verdict") ||
      extractField(job.auditAnswer, "Label / Flag Verdict");
    job.labelExplanation =
      extractField(job.auditAnswer, "Flag / Label Detailed Explanation") ||
      extractField(job.auditAnswer, "Label / Flag Detailed Explanation");
    job.labelRecommendedValue =
      extractField(job.auditAnswer, "Flag / Label Recommended Value") ||
      extractField(job.auditAnswer, "Label / Flag Recommended Value");

    job.technicalEvidence = extractField(job.auditAnswer, "Technical Conclusion Evidence");
    job.engineeringConfirmation = extractField(job.auditAnswer, "Engineering Confirmation");
    job.importantTechnicalCaveat = extractField(job.auditAnswer, "Important Technical Caveat");

    job.knowledgeAction = extractField(job.auditAnswer, "Primary Knowledge Action");
    job.secondaryKnowledgeAction = extractField(job.auditAnswer, "Secondary Knowledge Action");
    job.artifactReadiness = normalizeArtifactReadiness(
      job.knowledgeAction,
      extractField(job.auditAnswer, "Artifact Readiness") ||
      extractField(job.auditAnswer, "KCS Readiness")
    );
    job.artifactTypeFromAudit = extractField(job.auditAnswer, "Artifact Type");
    job.knowledgeDecisionExplanation = extractField(job.auditAnswer, "Knowledge Decision Explanation");
    job.autoGenerateKnowledgeDecision = extractField(job.auditAnswer, "Auto-Generate Knowledge Artifact");
    job.knowledgeArtifactType = knowledgeArtifactType(job);

    job.xsupComment = buildReviewPasteComment(job.auditAnswer, {
      xsup: job.xsup,
      product: productLabel(job)
    });

    job.references = extractReferences(job.auditAnswer);

    return job;
  }

  function buildReviewPasteComment(auditText, options = {}) {
    const xsup = options.xsup || extractField(auditText, "Target Ticket") || "XSUP";
    const reviewed = extractField(auditText, "Reviewed Fields") || "UNDETERMINED";

    const fields = [
      {
        name: "Resolution",
        change: extractField(auditText, "Resolution Change Needed"),
        verdict: extractField(auditText, "Resolution Verdict"),
        recommended: extractField(auditText, "Resolution Recommended Value"),
        explanation: extractField(auditText, "Resolution Detailed Explanation")
      },
      {
        name: "RCA",
        change: extractField(auditText, "RCA Change Needed"),
        verdict: extractField(auditText, "RCA Verdict"),
        recommended: extractField(auditText, "RCA Recommended Value"),
        explanation: extractField(auditText, "RCA Detailed Explanation")
      },
      {
        name: "Fix Type",
        change: extractField(auditText, "Fix Type Change Needed"),
        verdict: extractField(auditText, "Fix Type Verdict"),
        recommended: extractField(auditText, "Fix Type Recommended Value"),
        explanation: extractField(auditText, "Fix Type Detailed Explanation")
      },
      {
        name: "Flag / Label",
        change: extractField(auditText, "Label / Flag Change Needed"),
        verdict: extractField(auditText, "Flag / Label Verdict") || extractField(auditText, "Label / Flag Verdict"),
        recommended: extractField(auditText, "Flag / Label Recommended Value") || extractField(auditText, "Label / Flag Recommended Value"),
        explanation: extractField(auditText, "Flag / Label Detailed Explanation") || extractField(auditText, "Label / Flag Detailed Explanation")
      }
    ];

    const applicable = fields.filter(f =>
      f.change &&
      !/^(not applicable|n\/a)$/i.test(f.change)
    );

    const lines = [
      `***XSUP APAC Retrospective Review — ${xsup}***`,
      `***Reviewed Fields:*** ${reviewed}`
    ];

    for (const f of applicable) {
      const changeRequired = /^yes$/i.test(f.change || "");
      const verdict = f.verdict || "UNDETERMINED";
      let summary = verdict;

      if (changeRequired && f.recommended && !/^no change$/i.test(f.recommended)) {
        summary += ` — Change required → ${f.recommended}`;
      } else if (/^no$/i.test(f.change || "")) {
        summary += " — No change required";
      } else {
        summary += " — Additional evidence may be required";
      }

      lines.push(`***${f.name} Review:*** ${summary}`);
    }

    const explanations = applicable.map(f => f.explanation).filter(Boolean);
    if (explanations.length) {
      lines.push(`***Comment:*** ${explanations.join(" ")}`);
    }

    const knowledgeAction = extractField(auditText, "Primary Knowledge Action");
    const knowledgeSummary = extractField(auditText, "Knowledge Action Summary");
    if (
      knowledgeAction &&
      !/^(none|no knowledge action|n\/a|not applicable)$/i.test(knowledgeAction)
    ) {
      lines.push(`***Action Plan:*** ${knowledgeSummary || knowledgeAction}`);
    }

    return lines.join("\n");
  }

  function extractReferences(...sources) {
    const refs = [];
    const seen = new Set();
    const visited = new Set();

    function add(url, title = "", type = "") {
      if (!url || typeof url !== "string") return;
      const cleanUrl = url.replace(/&amp;/g, "&").trim();
      if (!/^https?:\/\//i.test(cleanUrl)) return;
      if (seen.has(cleanUrl)) return;
      seen.add(cleanUrl);
      refs.push({
        url: cleanUrl,
        title: cleanText(title) || cleanUrl,
        type: cleanText(type) || "reference"
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
        add(mm[2], mm[1], "Case Chat reference");
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


  function knowledgeUiState(job) {
    if (!job) return "none";

    const reuseState = String(job.knowledgeReuseStatus || "").toLowerCase();
    const knowledgeState = String(job.knowledgeStatus || "").toLowerCase();

    if (knowledgeState === "failed") return "failed";
    if (knowledgeState === "stopped") return "stopped";
    if (knowledgeState === "outdated") return "outdated";
    if (knowledgeState === "queued") return "waiting";
    if (
      knowledgeState === "generating" ||
      ["checking", "waiting_existing"].includes(reuseState)
    ) return "active";

    if (knowledgeState === "completed") return "complete";
    if (["not_required", "not_generated"].includes(knowledgeState)) return "done";

    return "none";
  }

  function overallUiState(job) {
    if (!job) return "pending";

    if (job.status === "failed") return "failed";
    if (job.status === "stopped") return "stopped";
    if (job.status === "needs_selection" || job.status === "needs_product") return "action";
    if (job.status === "queued") return "waiting";
    if (job.status === "running") return "active";

    const knowledgeState = knowledgeUiState(job);
    if (knowledgeState === "failed") return "failed";
    if (knowledgeState === "stopped") return "stopped";
    if (knowledgeState === "outdated") return "attention";
    if (knowledgeState === "waiting") return "waiting";
    if (knowledgeState === "active") return "active";

    if (job.status === "completed") return "complete";
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
      return `Knowledge queued · ${label}`;
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
    if (knowledgeState === "waiting") return "Knowledge waiting";
    if (knowledgeState === "failed") return "Knowledge failed";
    if (knowledgeState === "outdated") return "Knowledge needs regeneration";

    if (job.status === "completed") {
      return primaryReviewVerdict(job) || job.retrospectiveEligibility || "Complete";
    }
    if (job.status === "failed") return "Failed";
    if (job.status === "stopped") return "Stopped";
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
    if (job.status === "needs_selection") return `Choose SFDC · ${job.sfdcCandidates?.length || 0} matches`;
    if (job.status === "needs_product") return `Choose Product${job.productSuggestedKey ? ` · suggested ${productLabel(job.productSuggestedKey)}` : ""}`;
    if (job.status === "failed") return job.error ? `Failed · ${job.error}` : "Failed";
    if (job.status === "stopped") return "Stopped";
    if (job.status === "completed") return overallActivity || "Complete";
    return job.currentActivity || job.stageLabel || "Running";
  }

  function heartbeatInfo(job) {
    if (!job) return { text: "—", kind: "" };

    const knowledgeState = knowledgeUiState(job);
    if (knowledgeState === "waiting") return { text: "Waiting for knowledge worker", kind: "warn" };
    if (knowledgeState === "failed") return { text: "Knowledge failed", kind: "bad" };
    if (knowledgeState === "outdated") return { text: "Knowledge regeneration available", kind: "warn" };
    if (knowledgeState === "active") {
      const now = Date.now();
      const heartbeatAt = job.knowledgeLastHeartbeatAt || job.knowledgeStartedAt || job.lastHeartbeatAt || now;
      const age = Math.max(0, now - heartbeatAt);
      if (age >= NO_RESPONSE_WARNING_MS) {
        return { text: `⚠ No knowledge response for ${formatElapsed(age)}`, kind: "bad" };
      }
      return { text: `Knowledge response ${formatElapsed(age)} ago`, kind: "live" };
    }

    if (job.status === "queued") return { text: "Waiting in queue", kind: "" };
    if (job.status === "needs_selection" || job.status === "needs_product") return { text: "Action required", kind: "warn" };
    if (job.status === "completed") return { text: "Completed", kind: "ok" };
    if (job.status === "failed") return { text: "Failed", kind: "bad" };
    if (job.status === "stopped") return { text: "Stopped", kind: "" };

    const now = Date.now();
    const heartbeatAt = job.lastHeartbeatAt || job.startedAt || now;
    const changeAt = job.lastProgressChangeAt || heartbeatAt;
    const heartbeatAge = Math.max(0, now - heartbeatAt);
    const changeAge = Math.max(0, now - changeAt);

    if (heartbeatAge >= NO_RESPONSE_WARNING_MS) {
      return { text: `⚠ No backend response for ${formatElapsed(heartbeatAge)}`, kind: "bad" };
    }

    if (changeAge >= NO_PROGRESS_WARNING_MS) {
      return {
        text: `⚠ No progress change for ${formatElapsed(changeAge)} · response ${formatElapsed(heartbeatAge)} ago`,
        kind: "warn"
      };
    }

    return { text: `Response ${formatElapsed(heartbeatAge)} ago`, kind: "live" };
  }

  function progressLabel(job) {
    if (!job) return "—";

    const knowledgeState = knowledgeUiState(job);
    if (job.status === "completed" && knowledgeState === "active") return "Audit 100% · Knowledge running";
    if (job.status === "completed" && knowledgeState === "waiting") return "Audit 100% · Knowledge queued";
    if (job.status === "completed" && knowledgeState === "failed") return "Audit 100% · Knowledge failed";
    if (job.status === "completed" && knowledgeState === "outdated") return "Audit 100% · Knowledge needs regeneration";

    if (job.status === "completed") return "100%";
    if (job.status === "failed") return `Failed at ~${Math.round(clampProgress(job.overallProgress || 0))}%`;
    if (job.status === "stopped") return `Stopped at ~${Math.round(clampProgress(job.overallProgress || 0))}%`;
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
      ? `<span class="xa-progress-sub">TACO ${Math.round(clampProgress(job.tacoProgress))}%${job.tacoNode ? ` · ${escapeHtml(job.tacoNode)}` : ""}</span>`
      : "";

    return `
      <div class="xa-progress-wrap ${compact ? "compact" : ""}">
        <div class="xa-progress-top"><strong>${escapeHtml(progressLabel(job))}</strong>${taco}</div>
        <div class="xa-progress-track"><span style="width:${p}%"></span></div>
      </div>
    `;
  }

  function refreshLiveTimeLabels() {
    for (const job of state.jobs.values()) {
      document.querySelectorAll(`[data-job-elapsed="${job.xsup}"]`).forEach(el => {
        el.textContent = job.startedAt
          ? formatElapsed((job.endedAt || Date.now()) - job.startedAt)
          : "—";
      });

      const hb = heartbeatInfo(job);
      document.querySelectorAll(`[data-job-heartbeat="${job.xsup}"]`).forEach(el => {
        el.textContent = hb.text;
        el.dataset.kind = hb.kind;
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
        elapsedEl.textContent = selected.startedAt
          ? formatElapsed((selected.endedAt || Date.now()) - selected.startedAt)
          : "—";
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

  function renderDashboard() {
    const dash = document.getElementById("xsup-auditor-dashboard");
    if (!dash) return;

    const jobs = [...state.jobs.values()];
    const hasChange = j => jobChangeNeededText(j) === "YES";

    const counts = {
      running: jobs.filter(j => j.status === "running").length,
      queued: jobs.filter(j => j.status === "queued").length,
      chooseSfdc: jobs.filter(j => j.status === "needs_selection").length,
      chooseProduct: jobs.filter(j => j.status === "needs_product").length,
      complete: jobs.filter(j => j.status === "completed").length,
      failed: jobs.filter(j => j.status === "failed").length,
      incorrect: jobs.filter(anyIncorrectVerdict).length,
      changes: jobs.filter(hasChange).length,
      knowledgeGenerating: jobs.filter(j => j.knowledgeStatus === "generating").length,
      knowledgeQueued: jobs.filter(j => j.knowledgeStatus === "queued").length,
      knowledgeDone: jobs.filter(j => j.knowledgeStatus === "completed").length
    };

    const stat = (label, value, cls = "") => `
      <div class="xa-stat ${cls}"><strong>${value}</strong><span>${label}</span></div>
    `;

    const rows = jobs.map(job => {
      const caseText = job.caseNumber
        ? escapeHtml(job.caseNumber)
        : job.sfdcCandidates?.length > 1
          ? `${job.sfdcCandidates.length} matches`
          : "—";

      const sfdcUrl = safeUrl(job.targetLinks?.sfdc);
      const sfdcAction = job.status === "needs_selection"
        ? `<button class="xa-table-link xa-choose-sfdc" data-xsup="${escapeHtml(job.xsup)}">Choose SFDC</button>`
        : job.caseNumber && sfdcUrl
          ? `<a class="xa-table-link" href="${escapeHtml(sfdcUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(job.caseNumber)}</a>`
          : caseText;

      const productChangeLocked =
        (job.productLocked && job.status === "running") ||
        job.knowledgeStatus === "generating";
      const productAction = job.status === "needs_product"
        ? `<button class="xa-table-link xa-change-product" data-xsup="${escapeHtml(job.xsup)}">Choose Product</button>`
        : job.productKey
          ? productChangeLocked
            ? `<span class="xa-product-locked" data-tooltip="Product is locked while the active Retrospective/Knowledge Case Chat is running.">${escapeHtml(productLabel(job))} · Locked</span>`
            : `<button class="xa-table-link xa-change-product" data-xsup="${escapeHtml(job.xsup)}">${escapeHtml(productLabel(job))}${job.productSelectionSource === "manual" ? " · Manual" : ""}</button>`
          : "—";

      const heartbeat = heartbeatInfo(job);
      const reviewed = job.reviewedFields || "—";
      const changeText = jobChangeNeededText(job);
      const reviewVerdict = primaryReviewVerdict(job) || job.retrospectiveEligibility || "—";
      const verdictContext = primaryReviewVerdict(job) ? "verdict" : "eligibility";
      const knowledgeUi = knowledgeUiState(job);
      const knowledgeReadiness = job.validatedArtifactReadiness || job.artifactReadiness || "";
      const knowledgePrimary = knowledgeUi === "complete" && knowledgeReadiness
        ? readinessChipHtml(job)
        : knowledgeUi === "failed"
          ? semanticChipHtml("FAILED", "operational")
          : knowledgeUi === "active"
            ? semanticChipHtml("IN PROGRESS", "operational")
            : knowledgeUi === "waiting"
              ? semanticChipHtml("WAITING", "operational")
              : knowledgeUi === "outdated"
                ? semanticChipHtml("ATTENTION", "operational", "Knowledge needs regeneration after the Audit changed.")
                : job.knowledgeStatus === "not_required"
                  ? semanticChipHtml("N/A", "general", "No Knowledge artifact is required for this retrospective.")
                  : semanticChipHtml("PENDING", "general");

      return `
        <tr class="xa-dashboard-row xa-row-${escapeHtml(job.status)}">
          <td><button class="xa-table-link xa-open-job" data-xsup="${escapeHtml(job.xsup)}">${escapeHtml(job.xsup)}</button></td>
          <td>${productAction}</td>
          <td>${sfdcAction}</td>
          <td>${progressBarHtml(job)}</td>
          <td>
            <div class="xa-activity">${escapeHtml(activityForJob(job))}</div>
            <span class="xa-status-pill xa-pill-${escapeHtml(job.status)}">${jobIcon(job)} ${escapeHtml(jobResultText(job))}</span>
          </td>
          <td><span class="xa-heartbeat" data-job-heartbeat="${escapeHtml(job.xsup)}" data-kind="${heartbeat.kind}">${escapeHtml(heartbeat.text)}</span></td>
          <td>${escapeHtml(reviewed)}</td>
          <td>${semanticChipHtml(reviewVerdict, verdictContext)}</td>
          <td>${changeDecisionChipHtml(changeText)}</td>
          <td>
            <div class="xa-knowledge-cell">
              <strong>${knowledgePrimary}</strong>
              ${job.knowledgeAction ? `<small>${escapeHtml(job.knowledgeAction)}${knowledgeReviewCount(job) ? ` · ${knowledgeReviewCount(job)} review${knowledgeReviewCount(job) === 1 ? "" : "s"}` : ""}</small>` : ""}
            </div>
          </td>
          <td><span data-job-elapsed="${escapeHtml(job.xsup)}">${job.startedAt ? escapeHtml(formatElapsed((job.endedAt || Date.now()) - job.startedAt)) : "—"}</span></td>
          <td><button class="xa-table-link xa-open-job" data-xsup="${escapeHtml(job.xsup)}">View audit</button></td>
        </tr>
      `;
    }).join("");

    dash.innerHTML = `
      <div class="xa-dashboard-head">
        <div>
          <h2>Live Audit Dashboard</h2>
          <p>Mixed-product XSUP review. High-confidence product detection continues automatically; lower-confidence or conflicting cases pause only that XSUP for confirmation. Two audits + one independent knowledge worker.</p>
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
    dash.querySelectorAll(".xa-change-product").forEach(btn => {
      btn.onclick = () => {
        const job = state.jobs.get(btn.dataset.xsup);
        if (job) showProductChooser(job);
      };
    });
  }

  function renderSFDCDetails(job) {
    const box = document.getElementById("xsup-auditor-sfdc-details");
    if (!box) return;

    const cases = job?.sfdcCandidates || [];
    if (!cases.length) {
      box.innerHTML = `<div class="xa-ref-empty">SFDC mapping details will appear after XSUP resolution.</div>`;
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
            ${!selected && job.status === "needs_selection" ? `<button class="xa-select-case" data-case="${escapeHtml(c.case_number)}">Use this SFDC for audit</button>` : ''}
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
    const next = [...state.jobs.values()].find(j => j.status === "needs_selection");
    if (next) showSFDCChooser(next);
  }

  function showSFDCChooser(job) {
    closeSFDCChooser();
    if (!job?.sfdcCandidates?.length) return;

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
      <div class="xa-product-card ${job.status === "needs_product" ? "needs" : ""}">
        <div>
          <span>Product</span>
          <strong>${escapeHtml(profile?.label || "Confirmation required")}</strong>
          <small>${escapeHtml(source + confidence)}${job.productDetectionReason ? ` · ${escapeHtml(job.productDetectionReason)}` : ""}</small>
        </div>
        <button id="xa-change-product" ${activeLocked ? "disabled" : ""}>${escapeHtml(job.status === "needs_product" ? "Choose Product" : actionLabel)}</button>
      </div>
    `;
    box.querySelector("#xa-change-product")?.addEventListener("click", () => showProductChooser(job));
  }

  function renderJobList() {
    const list = document.getElementById("xsup-auditor-job-list");
    if (!list) return;

    const jobs = [...state.jobs.values()];
    if (!jobs.length) {
      list.innerHTML = `<div class="xa-job-empty">Paste one or more XSUP IDs above and click Run Audit(s).</div>`;
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
            <em>${escapeHtml(leftStatus)}</em>
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
    const completed = jobs.filter(j => j.status === "completed").length;
    const failed = jobs.filter(j => j.status === "failed").length;
    const stopped = jobs.filter(j => j.status === "stopped").length;
    const needsSelection = jobs.filter(j => j.status === "needs_selection").length;
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
      if (completed) parts.push(`${completed} audit complete`);
      if (failed) parts.push(`${failed} audit failed`);
      if (knowledgeFailed) parts.push(`${knowledgeFailed} knowledge failed`);
      text = `${parts.join(" · ")} · audit workers ${state.concurrency} · knowledge worker ${state.knowledgeConcurrency}`;
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
      if (job.status === "needs_selection" || job.status === "needs_product") return "waiting";
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
      if (job.status === "failed" && !job.auditAnswer) return "failed";
      if (job.auditAnswer) return "complete";
      if (job.status === "running" && job.evidence) return "active";
      return "pending";
    }

    if (stage === "knowledge") {
      if (job.knowledgeStatus === "completed") return "complete";
      if (job.knowledgeStatus === "failed") return "failed";
      if (job.knowledgeStatus === "generating" || ["checking", "waiting_existing"].includes(String(job.knowledgeReuseStatus || "").toLowerCase())) return "active";
      if (job.knowledgeStatus === "queued" || job.knowledgeStatus === "outdated") return "waiting";
      if (["not_required", "not_generated"].includes(job.knowledgeStatus)) return "skipped";
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
    if (knowledgeRequired && ["queued", "generating"].includes(job.knowledgeStatus)) {
      return `Waiting for knowledge artifact · ${destination}`;
    }

    if (job.autoSaved || job.knowledgeAutoSaved) {
      return `Downloaded/saved · ${destination}`;
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

    const busy = job.status === "running" || ["generating", "queued"].includes(job.knowledgeStatus);
    const auditActionDisabled = busy || !job.caseNumber || !job.investigationId || !job.report || !job.evidence;
    const knowledgeActionDisabled = busy || !job.auditAnswer || !knowledgeArtifactType(job);
    const knowledgeActionLabel = String(job.knowledgeArtifactType || knowledgeArtifactType(job) || "").startsWith("KCS")
      ? "Regenerate KCS"
      : "Regenerate Knowledge";

    box.innerHTML = `
      <div class="xa-reuse-head">
        <div>
          <strong>Analysis &amp; Reuse Status</strong>
          <span>Shows exactly which existing Case Chat was reused, or whether a new result had to be generated.</span>
        </div>
        <div class="xa-reuse-actions">
          <button id="xa-reanalyse-all" ${busy ? "disabled" : ""} data-tooltip="Force a fresh TACO analysis, then create a new retrospective audit and new knowledge artifact. Use only when you intentionally want to ignore all reusable results.">Re-analyze All</button>
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
          actionLabel: "Regenerate Audit",
          actionDisabled: auditActionDisabled,
          actionTooltip: "Create a new Retrospective Audit using the current TACO analysis and current Jira/SFDC evidence. TACO is not re-run."
        })}
        ${card({
          label: "Knowledge Artifact",
          status: job.knowledgeReuseStatus,
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
          actionTooltip: "Create a new knowledge artifact from the current completed audit using the latest enrichment and quality-review workflow. TACO and the audit are not re-run."
        })}
      </div>
    `;

    document.getElementById("xa-reanalyse-all")?.addEventListener("click", () => forceReanalyzeTaco(job.xsup));
    document.getElementById("xa-regenerate-audit")?.addEventListener("click", () => forceRerunAudit(job.xsup));
    document.getElementById("xa-regenerate-knowledge")?.addEventListener("click", () => forceRegenerateKnowledge(job.xsup));
  }

  function forceRerunAudit(xsup) {
    const job = state.jobs.get(xsup);
    if (!job) return;
    if (job.status === "running" || job.knowledgeStatus === "generating") {
      setStatus("Wait for active work to finish before forcing an audit rerun.", "error");
      return;
    }
    if (!job.caseNumber || !job.investigationId || !job.report || !job.evidence) {
      setStatus("Current TACO/evidence is not ready for an audit-only rerun.", "error");
      return;
    }

    job.forceAuditRefresh = true;
    job.forceKnowledgeRefresh = false;
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

  function forceRegenerateKnowledge(xsup) {
    const job = state.jobs.get(xsup);
    if (!job) return;
    if (job.status === "running" || job.knowledgeStatus === "generating") {
      setStatus("Wait for active work to finish before regenerating knowledge.", "error");
      return;
    }
    if (!job.auditAnswer || !knowledgeArtifactType(job)) {
      setStatus("No completed audit/knowledge decision is available for regeneration.", "error");
      return;
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
        <span><b>Elapsed:</b> <em id="xsup-auditor-selected-elapsed">${job.startedAt ? escapeHtml(formatElapsed((job.endedAt || Date.now()) - job.startedAt)) : "—"}</em></span>
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

    job.forceTacoRefresh = true;
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


  function renderDecisionSummary(job) {
    const box = document.getElementById("xsup-auditor-decision-summary");
    if (!box || !job) return;

    const fieldRows = [];
    const addField = (label, changeNeeded, verdict, recommended) => {
      if (/^(not applicable|n\/a)$/i.test(changeNeeded || "")) return;
      const change = /^yes$/i.test(changeNeeded || "")
        ? "YES"
        : /^no$/i.test(changeNeeded || "")
          ? "NO"
          : "UNDETERMINED";
      const current = extractField(job.auditAnswer || "", `${label} Current Value`);
      const action =
        change === "YES"
          ? `Change required${recommended ? ` — recommended: ${recommended}` : ""}`
          : change === "NO"
            ? `No field change${current ? ` — keep ${current}` : ""}`
            : "Review the supporting evidence before changing the field.";

      fieldRows.push(`
        <tr>
          <td><strong>${escapeHtml(label)}</strong></td>
          <td>${semanticChipHtml(verdict || "UNDETERMINED", "verdict")}</td>
          <td>${changeDecisionChipHtml(change)} <span class="xa-table-explain">${escapeHtml(action)}</span></td>
        </tr>
      `);
    };

    addField("Resolution", job.resolutionChangeNeeded, job.verdict, job.resolutionRecommendedValue);
    addField("RCA", job.rcaChangeNeeded, job.rcaVerdict, job.rcaRecommendedValue);
    addField("Fix Type", job.fixTypeChangeNeeded, job.fixTypeVerdict, job.fixTypeRecommendedValue);
    addField("Flag / Label", job.labelChangeNeeded, job.labelVerdict, job.labelRecommendedValue);

    const knowledgeReadiness = job.validatedArtifactReadiness || job.artifactReadiness || "—";
    const reviewCount = knowledgeReviewCount(job);
    const knowledgeMeaning = job.knowledgeAction
      ? `${job.knowledgeAction}${reviewCount ? ` · ${reviewCount} review item${reviewCount === 1 ? "" : "s"} remain` : ""}`
      : "Knowledge decision pending";

    box.innerHTML = `
      <div class="xa-decision-group">
        <div class="xa-decision-group-title">Ticket Review</div>
        <div class="xa-decision-table-wrap">
          <table class="xa-decision-table">
            <thead><tr><th>Review item</th><th>Result</th><th>Action / meaning</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Retrospective</strong></td>
                <td>${semanticChipHtml(job.retrospectiveEligibility || "—", "eligibility")}</td>
                <td class="xa-table-explain">${escapeHtml(semanticTooltip(job.retrospectiveEligibility || "", "eligibility") || "Review scope is not established yet.")}</td>
              </tr>
              ${fieldRows.join("") || `<tr><td colspan="3" class="xa-decision-empty">No applicable Support-owned field decision is available yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="xa-decision-group">
        <div class="xa-decision-group-title">Knowledge</div>
        <div class="xa-decision-table-wrap">
          <table class="xa-decision-table">
            <thead><tr><th>Review item</th><th>Result</th><th>Action / meaning</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Knowledge</strong></td>
                <td>${semanticChipHtml(knowledgeReadiness, "readiness")}</td>
                <td class="xa-table-explain">${escapeHtml(knowledgeMeaning)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderKnowledgeArtifact(job) {
    const box = document.getElementById("xsup-auditor-knowledge-artifact");
    if (!box || !job) return;

    const type = job.knowledgeArtifactType || knowledgeArtifactType(job);
    const label =
      job.artifactTypeFromAudit ||
      (type ? knowledgeArtifactLabel(type) : "No knowledge artifact");
    const canDownload = Boolean(job.knowledgeAnswer);
    const canRetry = Boolean(type && job.auditAnswer && ["failed", "stopped", "not_generated", "outdated"].includes(job.knowledgeStatus));
    const reviewCount = knowledgeReviewCount(job);
    const completedWithReadiness = job.knowledgeStatus === "completed" && (job.validatedArtifactReadiness || job.artifactReadiness);

    const primaryStatus = completedWithReadiness
      ? readinessChipHtml(job)
      : `<span class="xa-knowledge-status xa-knowledge-${escapeHtml(job.knowledgeStatus)}">${knowledgeStatusIcon(job)} ${escapeHtml(knowledgeStatusText(job))}</span>`;

    box.innerHTML = `
      <div class="xa-knowledge-card">
        <div class="xa-knowledge-title">
          <div>
            <strong>${escapeHtml(job.knowledgeAction || "Knowledge decision pending")}</strong>
            <span>${escapeHtml(label)}${reviewCount ? ` · ${reviewCount} review item${reviewCount === 1 ? "" : "s"}` : ""}</span>
          </div>
          ${primaryStatus}
        </div>
        ${job.knowledgeDecisionExplanation ? `<div class="xa-knowledge-decision">${escapeHtml(job.knowledgeDecisionExplanation)}</div>` : ""}
        ${job.knowledgeError ? `<div class="xa-knowledge-error">${escapeHtml(job.knowledgeError)}</div>` : ""}
        ${job.knowledgeAnswer ? `<div class="xa-knowledge-preview">${knowledgeMarkdownToHtml(job.knowledgeAnswer)}</div>${knowledgeReviewFooterHtml(job)}` : ""}
        <div class="xa-actions">
          ${canDownload ? `<button id="xsup-auditor-download-knowledge">Download ${escapeHtml(label)}</button>` : ""}
          ${canDownload ? `<button id="xsup-auditor-copy-knowledge">Copy Review Draft</button>` : ""}
          ${canRetry ? `<button id="xsup-auditor-retry-knowledge">Generate / Retry ${escapeHtml(label)}</button>` : ""}
        </div>
      </div>
    `;

    const dl = document.getElementById("xsup-auditor-download-knowledge");
    if (dl) dl.onclick = () => void downloadKnowledgeArtifact(job);

    const copy = document.getElementById("xsup-auditor-copy-knowledge");
    if (copy) copy.onclick = async () => {
      await copyWithFeedback(copy, knowledgeTextForCopy(job.knowledgeAnswer || ""));
      setStatus(`${job.xsup} ${label} review draft copied.`, "ok");
    };

    const retry = document.getElementById("xsup-auditor-retry-knowledge");
    if (retry) retry.onclick = () => {
      job.knowledgeStatus = "not_evaluated";
      job.knowledgeError = "";
      job.knowledgeAutoSaved = false;
      queueKnowledgeArtifact(job);
    };
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

    showReport(job.auditAnswer || (job.error ? `## Audit Error\n\n**${job.error}**` : ""));
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
      retryBtn.disabled = state.running || !job.lastPrompt || !job.caseNumber || !job.investigationId;
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

  function createJob(xsup) {
    return {
      xsup,
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
        jira: `https://jira-dc.paloaltonetworks.com/browse/${xsup}`,
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
      rcaVerdict: "",
      rcaExplanation: "",
      rcaRecommendedValue: "",
      fixTypeVerdict: "",
      fixTypeExplanation: "",
      fixTypeRecommendedValue: "",
      labelVerdict: "",
      labelExplanation: "",
      labelRecommendedValue: "",
      technicalEvidence: "",
      engineeringConfirmation: "",
      importantTechnicalCaveat: "",

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
      validatedArtifactReadiness: "",
      knowledgeArtifactType: "",
      knowledgeError: "",
      knowledgeStartedAt: null,
      knowledgeEndedAt: null,
      knowledgeAutoSaved: false,

      // Automatic TACO freshness decision
      tacoDecision: "",
      tacoDecisionReason: "",
      tacoAnalysisAt: null,
      latestCaseEvidenceAt: null,
      forceTacoRefresh: false,

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
      manualAuditOnly: false,

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

  function parseXSUPs(raw) {
    return [...new Set(
      (String(raw || "").toUpperCase().match(/\bXSUP-\d+\b/g) || [])
    )];
  }

  function addJobsFromInput() {
    const input = document.getElementById("xsup-auditor-input");
    const xsups = parseXSUPs(input?.value || "");

    if (!xsups.length) {
      alert("Enter one or more XSUP IDs, for example:\\nXSUP-72446\\nXSUP-81234");
      return [];
    }

    const added = [];
    for (const xsup of xsups) {
      const existing = state.jobs.get(xsup);
      if (existing && ["queued", "running"].includes(existing.status)) continue;

      // A completed/failed/stopped job can be re-run by entering it again.
      const job = createJob(xsup);
      state.jobs.set(xsup, job);
      state.queue.push(xsup);
      added.push(job);
    }

    if (input) input.value = "";

    state.viewMode = "dashboard";
    state.selectedXsup = "";

    renderJobList();
    renderDashboard();
    renderSelectedJob();
    return added;
  }

  function ensureBatchRuntime() {
    if (!state.running) {
      state.running = true;
      state.stopped = false;
      state.controller = new AbortController();
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
      if (!job.caseNumber) {
        setJobStep(job, "resolve", "Resolving linked SFDC cases...", "Resolve SFDC");
        const candidates = await resolveXSUPCandidates(job.xsup);
        job.sfdcCandidates = candidates;

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
      job.evidence = await collectCaseEvidence(job.caseNumber, job.xsup);
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
        await startAnalysis(job.caseNumber);
        job.investigationId = await waitForInvestigationId(job.caseNumber);
        await waitForAnalysis(
          job.caseNumber,
          job.investigationId,
          {},
          (value, meta) => setJobStep(job, "taco", value, "TACO Analysis", meta)
        );
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
        job.tacoDecisionReason = freshness.reason;
        job.tacoAnalysisAt = freshness.tacoTimestamp;

        if (freshness.action === "wait") {
          setJobStep(
            job,
            "taco",
            `Waiting for existing TACO Analysis #${job.investigationId}...`,
            "TACO Analysis"
          );

          await waitForAnalysis(
            job.caseNumber,
            job.investigationId,
            {},
            (value, meta) => setJobStep(job, "taco", value, "TACO Analysis", meta)
          );

          job.report = await waitForReportReady(
            job.caseNumber,
            job.investigationId,
            (value, meta) => setJobStep(job, "taco", value, "TACO Analysis", meta)
          );
          job.tacoAnalysisAt = timestampFromObject(job.report, existingProgress, latest) || Date.now();
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

          await updateAnalysis(job.caseNumber, job.investigationId);

          await waitForAnalysis(
            job.caseNumber,
            job.investigationId,
            {
              requireFresh: true,
              baselineReportCount,
              baselineReportMarker
            },
            (value, meta) => setJobStep(job, "taco", value, "TACO Analysis", meta)
          );

          job.report = await waitForReportReady(
            job.caseNumber,
            job.investigationId,
            (value, meta) => setJobStep(job, "taco", value, "TACO Analysis", meta)
          );
          job.tacoAnalysisAt = timestampFromObject(job.report) || Date.now();
          job.tacoDecision = job.forceTacoRefresh ? "FORCED REFRESH" : "AUTO REFRESH";
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

      const selected = selectEvidence(job.evidence, job.report);
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

      job.productLocked = true;
      if (job.xsup === state.selectedXsup) renderProductControl(job);

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

        const submit = await postFollowup(job.caseNumber, job.investigationId, prompt);
        const taskId = submit?.task_id;
        if (!taskId) throw new Error("Case Chat did not return task_id.");

        const directFollowupId = extractFollowupId(submit);
        const followupId = directFollowupId || await waitForFollowupId(
          job.caseNumber,
          job.investigationId,
          taskId,
          prompt,
          (value, meta) => setJobStep(job, "audit", value, "Case Chat", meta)
        );

        job.auditFollowupId = followupId;
        setJobStep(job, "audit", `Case Chat follow-up #${followupId}...`, "Case Chat");
        rawAuditAnswer = await waitForFollowup(
          job.caseNumber,
          followupId,
          (value, meta) => setJobStep(job, "audit", value, "Case Chat", meta)
        );

        job.auditReuseStatus = job.forceAuditRefresh ? "regenerated" : "generated";
        job.auditReuseReason = job.forceAuditRefresh
          ? "Manual audit rerun requested; a new Case Chat result was generated."
          : reuse.reason;
        job.auditCompletedAt = Date.now();
      }

      job.forceAuditRefresh = false;
      const auditValidation = validateReusableAuditAnswer(rawAuditAnswer, job);
      if (!auditValidation.valid) {
        throw new Error(`Retrospective Case Chat returned an invalid structure: ${auditValidation.reason}.`);
      }
      applyAuditResult(job, rawAuditAnswer);


      job.status = "completed";
      job.stageLabel = primaryReviewVerdict(job) || job.retrospectiveEligibility || "Complete";
      job.endedAt = Date.now();
      job.overallProgress = 100;
      const completedVerdict = primaryReviewVerdict(job) || job.retrospectiveEligibility || "Complete";
      setJobStep(job, "audit", "✓ Completed", completedVerdict, {
        activity: `Complete${completedVerdict && completedVerdict !== "Complete" ? ` · ${completedVerdict}` : ""}`
      });

      if (job.xsup === state.selectedXsup) renderSelectedJob();

      void maybeAutoSaveJob(job);
      if (job.manualAuditOnly) {
        job.manualAuditOnly = false;
        if (job.knowledgeAnswer || job.knowledgeFollowupId) {
          job.knowledgeStatus = "outdated";
          job.knowledgeReuseStatus = "outdated";
          job.knowledgeReuseReason = "Audit was regenerated independently. Existing knowledge was not automatically regenerated; use Regenerate Knowledge if a new artifact is required.";
        } else {
          job.knowledgeStatus = "not_evaluated";
          job.knowledgeReuseStatus = "not_checked";
          job.knowledgeReuseReason = "Audit was regenerated independently. Knowledge was not generated automatically.";
        }
      } else {
        queueKnowledgeArtifact(job);
      }

      showToast(
        `✓ ${job.xsup} complete${primaryReviewVerdict(job) ? ` · ${primaryReviewVerdict(job)}` : job.retrospectiveEligibility ? ` · ${job.retrospectiveEligibility}` : ""}`,
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
        job.status = "failed";
        job.stageLabel = "Failed";
        job.error = err?.message || String(err);
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
    }
  }

  function shouldGenerateKnowledge(job) {
    if (!state.autoGenerateKnowledge) return false;
    if (!job?.auditAnswer) return false;
    const eligibility = normalizeDecision(job.retrospectiveEligibility);
    if (eligibility && eligibility !== "IN SCOPE") return false;

    const decision = normalizeDecision(job.autoGenerateKnowledgeDecision);
    if (decision === "NO") return false;

    return Boolean(knowledgeArtifactType(job));
  }

  function queueKnowledgeArtifact(job) {
    if (!shouldGenerateKnowledge(job)) {
      job.knowledgeStatus = knowledgeArtifactType(job) ? "not_generated" : "not_required";
      renderJobList();
      renderDashboard();
      if (job.xsup === state.selectedXsup) renderSelectedJob();
      return;
    }

    if (["queued", "generating", "completed"].includes(job.knowledgeStatus)) return;

    ensureBatchRuntime();
    job.knowledgeStatus = "queued";
    job.knowledgeArtifactType = knowledgeArtifactType(job);
    job.knowledgeError = "";
    if (!state.knowledgeQueue.includes(job.xsup)) state.knowledgeQueue.push(job.xsup);

    renderJobList();
    renderDashboard();
    if (job.xsup === state.selectedXsup) renderSelectedJob();
    pumpKnowledgeQueue();
  }

  function knowledgeStatusText(job) {
    const label = knowledgeArtifactLabel(job.knowledgeArtifactType || knowledgeArtifactType(job));
    switch (job.knowledgeStatus) {
      case "queued": return `${label} · queued`;
      case "generating": return `${label} · ${job.knowledgeProgress || "generating"}`;
      case "completed": return `${label} · ${job.validatedArtifactReadiness || job.artifactReadiness || "reviewed"} · quality reviewed`;
      case "failed": return `${label} · ${job.validatedArtifactReadiness || "NOT READY"} · failed`;
      case "stopped": return `${label} · stopped`;
      case "outdated": return `${label} · regenerate when needed`;
      case "not_generated": return `${label} · generation disabled`;
      case "not_required": return "No knowledge artifact";
      default:
        return job.knowledgeAction ? `${job.knowledgeAction}${job.artifactReadiness ? ` · ${job.artifactReadiness}` : ""}` : "Pending audit decision";
    }
  }

  function knowledgeStatusIcon(job) {
    return ({
      queued: "○",
      generating: "⟳",
      completed: "✓",
      failed: "✕",
      stopped: "■",
      outdated: "!",
      not_generated: "•",
      not_required: "—"
    })[job.knowledgeStatus] || "•";
  }

  // Knowledge generation runs independently with one worker. It reuses the same
  // TACO investigation and the completed audit rather than starting another analysis.
  async function processKnowledgeJob(job) {
    job.knowledgeStatus = "generating";
    job.knowledgeStartedAt = Date.now();
    job.knowledgeLastHeartbeatAt = Date.now();
    job.knowledgeError = "";
    job.knowledgeQualityStatus = "";
    job.knowledgeQualitySummary = "";
    job.knowledgeQualityValidationItems = "";
    job.validatedArtifactReadiness = "";
    job.knowledgeRawAnswer = "";
    job.knowledgeDraftAnswer = "";
    job.knowledgeDraftFollowupId = null;
    job.knowledgeDraftCompletedAt = null;
    job.knowledgeDraftReuseStatus = "not_checked";

    const basePrompt = buildKnowledgePrompt(job);
    const meta = buildKnowledgeReuseMeta(job);
    job.knowledgeFingerprint = meta.fingerprint;

    renderJobList();
    renderDashboard();
    if (job.xsup === state.selectedXsup) renderSelectedJob();

    const update = value => {
      job.knowledgeProgress = String(value || "generating");
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
      // -----------------------------------------------------------------------
      // 1) Reuse the FINAL quality-reviewed artifact when the complete current
      //    knowledge fingerprint matches. This avoids all draft/quality AI calls.
      // -----------------------------------------------------------------------
      job.knowledgeReuseStatus = "checking";
      job.knowledgeReuseReason = "Checking for a reusable quality-reviewed knowledge artifact.";
      update("Checking final knowledge history...");

      const finalReuse = await tryReuseCaseChat({
        job,
        type: "knowledge",
        currentMeta: meta,
        legacyQuestion: "",
        force: Boolean(job.forceKnowledgeRefresh),
        onProgress: update
      });

      if (finalReuse.reused) {
        const parsed = parseKnowledgeQualityResponse(finalReuse.answer, job);

        job.knowledgeRawAnswer = finalReuse.answer;
        job.knowledgeFollowupId = finalReuse.followupId;
        job.knowledgeCompletedAt = finalReuse.completedAt || Date.now();
        job.knowledgeReuseStatus = "reused";
        job.knowledgeReuseReason = finalReuse.reason;
        job.priorKnowledgeFollowupId = null;
        job.priorKnowledgeCompletedAt = null;
        job.priorKnowledgeReason = "";

        if (parsed.valid) {
          job.knowledgeAnswer = parsed.artifact;
          job.validatedArtifactReadiness = parsed.readiness;
          job.knowledgeQualityStatus = parsed.status;
          job.knowledgeQualitySummary = parsed.summary;
          job.knowledgeQualityValidationItems = parsed.validationItems;
          update(`♻ Reused quality-reviewed Case Chat #${job.knowledgeFollowupId}`);
        } else {
          const legacyValidation = validateReusableKnowledgeAnswer(finalReuse.answer, job);
          if (!legacyValidation.valid) {
            throw new Error(`Reusable knowledge Case Chat #${job.knowledgeFollowupId} is incompatible: ${legacyValidation.reason}.`);
          }

          // Preserve the user's reuse-first behavior. Older/current artifacts are
          // reused when their source boundary is still current. The latest
          // quality framework is applied only when the user explicitly clicks
          // Regenerate Knowledge or when source inputs become stale.
          job.knowledgeAnswer = stripInternalKnowledgeMetadata(finalReuse.answer);
          job.validatedArtifactReadiness = "";
          job.knowledgeQualityStatus = "NOT RE-RUN";
          job.knowledgeQualitySummary = "Existing current artifact reused without re-running the latest quality framework. Use Regenerate Knowledge to create a newly enriched and quality-reviewed artifact.";
          job.knowledgeQualityValidationItems = "";
          update(`♻ Reused current existing Case Chat #${job.knowledgeFollowupId}`);
        }
      } else {
        job.priorKnowledgeFollowupId = finalReuse.previousFollowupId || null;
        job.priorKnowledgeCompletedAt = finalReuse.previousCompletedAt || null;
        job.priorKnowledgeReason = finalReuse.previousFollowupId
          ? "Previous final knowledge was not reused because current inputs/method could not be proven identical."
          : "";
        job.knowledgeReuseReason = finalReuse.reason;

        // ---------------------------------------------------------------------
        // 2) Build/reuse an ENRICHED DRAFT. This stage is allowed to improve the
        //    article with additional underlying sources actually available in
        //    the Case Chat/TACO investigation.
        // ---------------------------------------------------------------------
        const draftMeta = buildKnowledgeDraftReuseMeta(job);
        const draftPrompt = appendReuseMarker(basePrompt, draftMeta);
        job.knowledgePrompt = draftPrompt;

        update("Enriching knowledge and checking for reusable draft...");

        const draftReuse = await tryReuseCaseChat({
          job,
          type: "knowledge_draft",
          currentMeta: draftMeta,
          legacyQuestion: "",
          force: Boolean(job.forceKnowledgeRefresh),
          onProgress: update
        });

        if (draftReuse.reused) {
          job.knowledgeDraftAnswer = stripInternalKnowledgeMetadata(draftReuse.answer);
          job.knowledgeDraftFollowupId = draftReuse.followupId;
          job.knowledgeDraftCompletedAt = draftReuse.completedAt || Date.now();
          job.knowledgeDraftReuseStatus = "reused";
          update(`♻ Reused enriched draft #${job.knowledgeDraftFollowupId}`);
        } else {
          update(`Generating enriched ${knowledgeArtifactLabel(job.knowledgeArtifactType)}...`);

          const submitDraft = await postFollowup(
            job.caseNumber,
            job.investigationId,
            draftPrompt
          );
          const draftTaskId = submitDraft?.task_id;
          if (!draftTaskId) throw new Error("Knowledge enrichment Case Chat did not return task_id.");

          const directDraftId = extractFollowupId(submitDraft);
          const draftFollowupId = directDraftId || await waitForFollowupId(
            job.caseNumber,
            job.investigationId,
            draftTaskId,
            draftPrompt,
            update
          );

          job.knowledgeDraftFollowupId = draftFollowupId;
          update(`Enriched draft Case Chat #${draftFollowupId}`);

          const draftRaw = await waitForFollowup(
            job.caseNumber,
            draftFollowupId,
            update
          );

          const draftValidation = validateReusableKnowledgeAnswer(
            draftRaw,
            job,
            "knowledge_draft"
          );
          if (!draftValidation.valid) {
            throw new Error(`Generated enriched draft failed structural validation: ${draftValidation.reason}.`);
          }

          job.knowledgeDraftAnswer = stripInternalKnowledgeMetadata(draftRaw);
          job.knowledgeDraftCompletedAt = Date.now();
          job.knowledgeDraftReuseStatus = job.forceKnowledgeRefresh ? "regenerated" : "generated";
        }

        // ---------------------------------------------------------------------
        // 3) Independent QUALITY REVIEW. It must rewrite/finalize the draft using
        //    the generic quality rubric + artifact-specific rubric. The final
        //    Case Chat answer contains a small machine-readable quality envelope
        //    and the complete final artifact after KNOWLEDGE_FINAL_DELIMITER.
        // ---------------------------------------------------------------------
        update("Independent knowledge quality review...");

        const qualityBasePrompt = buildKnowledgeQualityPrompt(
          job,
          job.knowledgeDraftAnswer
        );
        const qualityPrompt = appendReuseMarker(qualityBasePrompt, meta);
        job.knowledgePrompt = qualityPrompt;

        const submitQuality = await postFollowup(
          job.caseNumber,
          job.investigationId,
          qualityPrompt
        );
        const qualityTaskId = submitQuality?.task_id;
        if (!qualityTaskId) throw new Error("Knowledge quality review Case Chat did not return task_id.");

        const directQualityId = extractFollowupId(submitQuality);
        const qualityFollowupId = directQualityId || await waitForFollowupId(
          job.caseNumber,
          job.investigationId,
          qualityTaskId,
          qualityPrompt,
          update
        );

        job.knowledgeFollowupId = qualityFollowupId;
        update(`Quality review Case Chat #${qualityFollowupId}`);

        const qualityRaw = await waitForFollowup(
          job.caseNumber,
          qualityFollowupId,
          update
        );

        let finalQualityRaw = qualityRaw;
        let parsed = parseKnowledgeQualityResponse(finalQualityRaw, job);

        // The deterministic gate is intentionally stricter than the AI reviewer.
        // When it finds generic output-hygiene/provenance defects, make ONE
        // evidence-bounded repair attempt instead of immediately failing an
        // otherwise useful artifact. A substantive AI FAIL is never auto-repaired.
        if (shouldAttemptKnowledgeQualityRepair(parsed)) {
          update(`Quality gate found ${parsed.issues.length} repairable issue${parsed.issues.length === 1 ? "" : "s"} · resolving provenance/format safely...`);

          const repairBasePrompt = buildKnowledgeQualityRepairPrompt(
            job,
            finalQualityRaw,
            parsed
          );
          const repairPrompt = appendReuseMarker(repairBasePrompt, meta);

          const submitRepair = await postFollowup(
            job.caseNumber,
            job.investigationId,
            repairPrompt
          );
          const repairTaskId = submitRepair?.task_id;
          if (!repairTaskId) throw new Error("Knowledge quality repair Case Chat did not return task_id.");

          const directRepairId = extractFollowupId(submitRepair);
          const repairFollowupId = directRepairId || await waitForFollowupId(
            job.caseNumber,
            job.investigationId,
            repairTaskId,
            repairPrompt,
            update
          );

          job.knowledgeFollowupId = repairFollowupId;
          update(`Quality repair Case Chat #${repairFollowupId}`);

          finalQualityRaw = await waitForFollowup(
            job.caseNumber,
            repairFollowupId,
            update
          );

          parsed = parseKnowledgeQualityResponse(finalQualityRaw, job);
        }

        if (!parsed.valid) {
          const fallbackArtifact = resolveRawProvenanceForHumanReview(
            parsed.artifact || job.knowledgeDraftAnswer || ""
          );
          if (fallbackArtifact.length < 160) {
            throw new Error(`Knowledge finalization did not return a usable draft: ${parsed.reason || "unknown quality-response error"}.`);
          }

          job.knowledgeRawAnswer = finalQualityRaw;
          job.knowledgeAnswer = fallbackArtifact;
          job.validatedArtifactReadiness = "NOT READY";
          job.knowledgeQualityStatus = parsed.status || "FAIL";
          job.knowledgeQualitySummary =
            parsed.summary ||
            parsed.reason ||
            "Quality finalization could not be fully validated; the draft is preserved for human review.";
          job.knowledgeQualityValidationItems =
            parsed.validationItems ||
            "Quality finalization requires human review before publication.";
        } else {
          job.knowledgeRawAnswer = finalQualityRaw;
          job.knowledgeAnswer = parsed.artifact;
          job.validatedArtifactReadiness = parsed.readiness;
          job.knowledgeQualityStatus = parsed.status;
          job.knowledgeQualitySummary = parsed.summary || parsed.reason || "";
          job.knowledgeQualityValidationItems = parsed.validationItems;
        }

        job.knowledgeReuseStatus = job.forceKnowledgeRefresh ? "regenerated" : "generated";
        job.knowledgeReuseReason = job.forceKnowledgeRefresh
          ? "Manual knowledge regeneration requested; enrichment and independent quality review were regenerated."
          : finalReuse.reason;
        job.knowledgeCompletedAt = Date.now();
      }

      job.forceKnowledgeRefresh = false;
      job.knowledgeStatus = "completed";
      job.knowledgeProgress =
        job.validatedArtifactReadiness === "NOT READY"
          ? "quality-reviewed · NOT READY · human review required"
          : job.validatedArtifactReadiness === "DRAFTABLE"
            ? "quality-reviewed · validation required"
            : "quality-reviewed · ready";
      job.knowledgeLastHeartbeatAt = Date.now();
      job.knowledgeEndedAt = Date.now();

      // User-facing references are limited to sources that the final
      // retrospective/artifact actually cites, instead of dumping all TACO refs.
      job.references = extractReferences(job.auditAnswer, job.knowledgeAnswer);

      await downloadKnowledgeArtifact(job, { auto: true });

      const finalKnowledgeReadiness = normalizeDecision(job.validatedArtifactReadiness || job.artifactReadiness);
      showToast(
        `${finalKnowledgeReadiness === "READY" ? "✓" : "⚠"} ${job.xsup} ${knowledgeArtifactLabel(job.knowledgeArtifactType)} ${job.knowledgeReuseStatus === "reused" ? "reused" : "generated"} · ${finalKnowledgeReadiness || "REVIEW"}`,
        finalKnowledgeReadiness === "READY" ? "ok" : ""
      );
    } catch (err) {
      if (err?.name === "AbortError" || state.stopped) {
        job.knowledgeStatus = "stopped";
        job.knowledgeProgress = "stopped";
        job.knowledgeError = "Stopped by user.";
      } else if (String(job.knowledgeDraftAnswer || "").trim().length >= 160) {
        job.knowledgeStatus = "completed";
        job.knowledgeProgress = "draft preserved · NOT READY · quality finalization needs review";
        job.knowledgeReuseStatus = "generated";
        job.knowledgeAnswer = resolveRawProvenanceForHumanReview(job.knowledgeDraftAnswer);
        job.knowledgeRawAnswer = "";
        job.knowledgeError = `Quality finalization could not complete: ${err?.message || String(err)}. The enriched draft is preserved for human review.`;
        job.knowledgeQualityStatus = "FAIL";
        job.validatedArtifactReadiness = "NOT READY";
        job.knowledgeQualitySummary = job.knowledgeError;
        if (!job.knowledgeQualityValidationItems) {
          job.knowledgeQualityValidationItems = "Quality finalization did not complete; human review is required before publication.";
        }
        job.knowledgeCompletedAt = Date.now();
        job.references = extractReferences(job.auditAnswer, job.knowledgeAnswer);
        await downloadKnowledgeArtifact(job, { auto: true });
        showToast(`⚠ ${job.xsup} knowledge draft preserved · NOT READY`, "");
      } else {
        job.knowledgeStatus = "failed";
        job.knowledgeProgress = "generation failed · no usable draft";
        job.knowledgeReuseStatus = "failed";
        job.knowledgeAnswer = "";
        job.knowledgeRawAnswer = "";
        job.knowledgeError = err?.message || String(err);
        if (!job.knowledgeQualityStatus) job.knowledgeQualityStatus = "FAIL";
        if (!job.validatedArtifactReadiness) job.validatedArtifactReadiness = "NOT READY";
        if (!job.knowledgeQualitySummary) job.knowledgeQualitySummary = job.knowledgeError;
        showToast(`⚠ ${job.xsup} knowledge generation failed before a usable draft was produced`, "error");
      }
      job.knowledgeEndedAt = Date.now();
    } finally {
      state.knowledgeActiveCount = Math.max(0, state.knowledgeActiveCount - 1);
      renderJobList();
      renderDashboard();
      if (job.xsup === state.selectedXsup) renderSelectedJob();
      pumpKnowledgeQueue();
      maybeFinishRuntime();
    }
  }

  function pumpKnowledgeQueue() {
    if (state.stopped) return;

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
      [...state.jobs.values()].some(j => j.status === "needs_selection");
  }

  function hasKnowledgeWork() {
    return state.knowledgeActiveCount > 0 ||
      state.knowledgeQueue.some(x => state.jobs.get(x)?.knowledgeStatus === "queued");
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
      const completed = jobs.filter(j => j.status === "completed").length;
      const failed = jobs.filter(j => j.status === "failed").length;
      const knowledgeDone = jobs.filter(j => j.knowledgeStatus === "completed").length;
      const knowledgeFailed = jobs.filter(j => j.knowledgeStatus === "failed").length;

      showToast(
        `✓ Batch complete · ${completed} audits${knowledgeDone ? ` · ${knowledgeDone} knowledge drafts` : ""}${failed || knowledgeFailed ? ` · ${failed + knowledgeFailed} failed` : ""}`,
        failed || knowledgeFailed ? "error" : "ok"
      );
      updateBatchStatus();
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

    while (state.activeCount < state.concurrency && state.queue.length) {
      const xsup = state.queue.shift();
      const job = state.jobs.get(xsup);
      if (!job || job.status !== "queued") continue;

      state.activeCount++;
      processJob(job);
    }

    const stillQueued = state.queue.some(x => state.jobs.get(x)?.status === "queued");
    const awaitingSelection = [...state.jobs.values()].some(j => j.status === "needs_selection" || j.status === "needs_product");

    if (state.activeCount === 0 && !stillQueued && !awaitingSelection) {
      const retryBtn = document.getElementById("xsup-auditor-retry-chat");
      if (retryBtn) {
        const selected = getSelectedJob();
        retryBtn.disabled = !selected?.lastPrompt;
      }
      maybeFinishRuntime();
    }
  }

  function runAudit() {
    if (state.stopped && state.activeCount > 0) {
      setStatus("Finishing Stop All; wait a moment before starting a new batch.", "error");
      return;
    }

    const added = addJobsFromInput();
    if (!added.length) return;

    ensureBatchRuntime();
    updateBatchStatus();
    pumpQueue();
  }

  function stopAudit() {
    const activeOrQueued =
      [...state.jobs.values()].some(
        j => j.status === "running" || j.status === "queued" || j.status === "needs_selection" || j.status === "needs_product" ||
             j.knowledgeStatus === "queued" || j.knowledgeStatus === "generating"
      );

    if (!activeOrQueued) {
      setStatus("Nothing is currently running.");
      return;
    }

    state.stopped = true;
    try { state.controller?.abort(); } catch (_) {}

    for (const job of state.jobs.values()) {
      if (job.status === "queued" || job.status === "needs_selection" || job.status === "needs_product") {
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

      setJobStep(job, "audit", "✓ Completed", primaryReviewVerdict(job) || job.retrospectiveEligibility || "Complete");
      renderSelectedJob();
      void maybeAutoSaveJob(job);

      // A retry may change the knowledge decision. Requeue only when needed.
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
.section{margin:22px 0}.comment{white-space:pre-wrap;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:14px}
.refs{padding-left:20px}.refs li{margin:6px 0}.ticket{page-break-before:always}.ticket:first-child{page-break-before:auto}
.toc li{margin:5px 0}
.small{font-size:12px;color:#6b7280}
.xa-semantic-chip,.xa-review-chip{display:inline-flex;align-items:center;gap:3px;border-radius:999px;padding:2px 7px;font-size:11px;font-weight:750;line-height:1.35;white-space:nowrap;vertical-align:baseline;border:1px solid transparent;cursor:help}.xa-semantic-green,.xa-review-green{background:#dcfce7;color:#065f46;border-color:#86efac}.xa-semantic-amber,.xa-review-amber{background:#fef3c7;color:#92400e;border-color:#fcd34d}.xa-semantic-purple,.xa-review-purple{background:#ede9fe;color:#6d28d9;border-color:#c4b5fd}.xa-semantic-red,.xa-review-red{background:#fee2e2;color:#991b1b;border-color:#fca5a5}.xa-semantic-blue,.xa-review-blue{background:#dbeafe;color:#1d4ed8;border-color:#93c5fd}.xa-semantic-gray,.xa-review-gray{background:#f8fafc;color:#64748b;border-color:#e2e8f0}.xa-title-line{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.xa-title-line h1{margin-right:2px}.xa-review-count{font-size:11px;color:#92400e;font-weight:700}.xa-review-footer{margin-top:26px;padding-top:4px}.xa-review-footer details{margin:8px 0;border:1px solid #e5e7eb;border-radius:9px;background:#fafafa}.xa-review-footer summary{cursor:pointer;padding:8px 10px;font-size:12px;font-weight:750;color:#334155}.xa-review-details-body,.xa-quality-details-body,.xa-review-guide-body{padding:0 10px 10px;font-size:12px}.xa-review-item-list{padding-left:22px}.xa-review-item-list li{margin:7px 0}.xa-review-item-list .xa-review-chip{margin-right:6px}.xa-review-validation-summary{margin-top:9px;padding:8px 10px;border-left:3px solid #f59e0b;background:#fffbeb;border-radius:5px}.xa-review-validation-summary p{margin:4px 0 0}.xa-review-guide-table-wrap{overflow:auto}.xa-review-guide-table{width:100%;border-collapse:collapse;font-size:12px}.xa-review-guide-table th,.xa-review-guide-table td{text-align:left;vertical-align:top;padding:7px;border-bottom:1px solid #e5e7eb}.xa-review-guide-table th{color:#475569;background:#f8fafc}.xa-review-chip{margin-left:4px}

.xa-key-summary{margin:10px 0 12px;border:1px solid #dbe3ef;border-radius:10px;overflow:hidden;background:#fff}
.xa-key-summary-table,.xa-decision-table,.xa-detail-table{width:100%;border-collapse:collapse}
.xa-key-summary-table th,.xa-key-summary-table td,.xa-decision-table th,.xa-decision-table td,.xa-detail-table th,.xa-detail-table td{text-align:left;vertical-align:top;border-bottom:1px solid #e5e7eb;padding:8px 10px}
.xa-key-summary-table th,.xa-decision-table th{font-size:11px;color:#475569;background:#f8fafc;font-weight:800}
.xa-key-summary-table td{font-size:12px}
.xa-key-summary-table tr:last-child td,.xa-decision-table tr:last-child td,.xa-detail-table tr:last-child td{border-bottom:0}
.xa-table-explain{color:#475569;margin-left:5px}
.xa-meta-details,.xa-reference-details{margin:8px 0;border:1px solid #e5e7eb;border-radius:9px;background:#fafafa}
.xa-meta-details>summary,.xa-reference-details>summary{cursor:pointer;padding:8px 10px;font-size:12px;font-weight:750;color:#334155}
.xa-meta-details-body{padding:0 10px 10px}
.xa-detail-table th{width:145px;color:#475569;font-size:11px}
.xa-detail-table td{font-size:11px}
.xa-detail-links{margin:8px 0}
.xa-decision-table-wrap{overflow:auto;border:1px solid #e5e7eb;border-radius:8px}
.xa-decision-table{font-size:10px;background:#fff}
.xa-decision-table th,.xa-decision-table td{padding:7px 8px}
.xa-review-guide summary{font-weight:800}

</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
  }

  // ===========================================================================
  // STORAGE / DOWNLOAD / COPY
  // ===========================================================================


  function auditDecisionSummaryTableHtml(job) {
    const rows = [];
    rows.push(`
      <tr>
        <td><strong>Retrospective</strong></td>
        <td>${semanticChipHtml(job.retrospectiveEligibility || "—", "eligibility")}</td>
        <td>${escapeHtml(semanticTooltip(job.retrospectiveEligibility || "", "eligibility") || "Scope not established yet.")}</td>
      </tr>
    `);

    const addField = (label, changeNeeded, verdict, recommended) => {
      if (/^(not applicable|n\/a)$/i.test(changeNeeded || "")) return;
      const change = /^yes$/i.test(changeNeeded || "") ? "YES" :
        /^no$/i.test(changeNeeded || "") ? "NO" : "UNDETERMINED";
      const current = extractField(job.auditAnswer || "", `${label} Current Value`);
      const action = change === "YES"
        ? `Change required${recommended ? ` — recommended: ${recommended}` : ""}`
        : change === "NO"
          ? `No change${current ? ` — keep ${current}` : ""}`
          : "Review supporting evidence before changing the field.";

      rows.push(`
        <tr>
          <td><strong>${escapeHtml(label)}</strong></td>
          <td>${semanticChipHtml(verdict || "UNDETERMINED", "verdict")}</td>
          <td>${changeDecisionChipHtml(change)} <span class="xa-table-explain">${escapeHtml(action)}</span></td>
        </tr>
      `);
    };

    addField("Resolution", job.resolutionChangeNeeded, job.verdict, job.resolutionRecommendedValue);
    addField("RCA", job.rcaChangeNeeded, job.rcaVerdict, job.rcaRecommendedValue);
    addField("Fix Type", job.fixTypeChangeNeeded, job.fixTypeVerdict, job.fixTypeRecommendedValue);
    addField("Flag / Label", job.labelChangeNeeded, job.labelVerdict, job.labelRecommendedValue);

    const readiness = job.validatedArtifactReadiness || job.artifactReadiness || "—";
    const reviewCount = knowledgeReviewCount(job);
    rows.push(`
      <tr>
        <td><strong>Knowledge</strong></td>
        <td>${semanticChipHtml(readiness, "readiness")}</td>
        <td>${escapeHtml(job.knowledgeAction || "Knowledge decision pending")}${reviewCount ? ` · <strong>${reviewCount} review item${reviewCount === 1 ? "" : "s"}</strong>` : ""}</td>
      </tr>
    `);

    return `
      <div class="xa-key-summary">
        <table class="xa-key-summary-table">
          <thead><tr><th>Review item</th><th>Result</th><th>Action / meaning</th></tr></thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>
    `;
  }

  function selectedJobReportHtml(job) {
    const reportRefs = (job.references?.length ? job.references : extractReferences(job.auditAnswer || ""))
      .filter(r => r?.url || r?.title);
    const refs = reportRefs.map((r, i) => {
      const url = safeUrl(r.url);
      const label = escapeHtml(r.title || r.url || `Reference ${i+1}`);
      return `<li>${url ? `<a href="${escapeHtml(url)}">${label}</a>` : label}${r.type ? ` <span class="small">(${escapeHtml(r.type)})</span>` : ""}</li>`;
    }).join("");

    const links = [];
    const jira = safeUrl(job.targetLinks?.jira);
    const sfdc = safeUrl(job.targetLinks?.sfdc);
    const taco = safeUrl(job.targetLinks?.tacopilot);
    if (jira) links.push(`<a href="${escapeHtml(jira)}">Jira ${escapeHtml(job.xsup)}</a>`);
    if (sfdc) links.push(`<a href="${escapeHtml(sfdc)}">SFDC ${escapeHtml(job.caseNumber || "")}</a>`);
    if (taco) links.push(`<a href="${escapeHtml(taco)}">TACopilot ${escapeHtml(job.caseNumber || "")}</a>`);

    const analysisDetails = `
      <details class="xa-meta-details">
        <summary>Analysis details</summary>
        <div class="xa-meta-details-body">
          <table class="xa-detail-table">
            <tbody>
              <tr><th>SFDC</th><td>${escapeHtml(job.caseNumber || "—")}</td></tr>
              <tr><th>Product</th><td>${escapeHtml(productLabel(job))}</td></tr>
              <tr><th>Reviewed fields</th><td>${escapeHtml(job.reviewedFields || "—")}</td></tr>
              <tr><th>Knowledge action</th><td>${escapeHtml(job.knowledgeAction || "—")}</td></tr>
              <tr><th>TACO</th><td>${escapeHtml(job.tacoDecision || "—")}</td></tr>
              <tr><th>Audit source</th><td>${escapeHtml(reuseStatusText(job.auditReuseStatus))}${job.auditFollowupId ? ` · Case Chat #${escapeHtml(job.auditFollowupId)}` : ""}</td></tr>
              <tr><th>Audit date</th><td>${escapeHtml(formatTimestamp(job.auditCompletedAt))}</td></tr>
            </tbody>
          </table>
          ${links.length ? `<div class="small xa-detail-links">${links.join(" · ")}</div>` : ""}
          ${job.tacoDecisionReason ? `<div class="small"><b>TACO freshness:</b> ${escapeHtml(job.tacoDecisionReason)} · TACO: ${escapeHtml(formatTimestamp(job.tacoAnalysisAt))} · Latest case evidence: ${escapeHtml(formatTimestamp(job.latestCaseEvidenceAt))}</div>` : ""}
        </div>
      </details>
    `;

    return `
      <article class="ticket" id="${escapeHtml(job.xsup)}">
        <h1>${escapeHtml(job.xsup)} Retrospective Audit</h1>
        ${auditDecisionSummaryTableHtml(job)}
        ${analysisDetails}
        <div class="section">
          ${auditMarkdownToHtml(job.auditAnswer || "No completed audit report available.")}
        </div>
        <div class="section">
          <h2>Review Paste Comment</h2>
          <div class="comment">${escapeHtml(job.xsupComment || "Not available")}</div>
        </div>
        ${refs ? `
          <details class="xa-meta-details xa-reference-details">
            <summary>References (${reportRefs.length})</summary>
            <div class="xa-meta-details-body"><ol class="refs">${refs}</ol></div>
          </details>
        ` : ""}
        ${auditStatusGuideHtml()}
      </article>
    `;
  }

  async function downloadJobReport(job, { auto = false } = {}) {
    if (!job?.auditAnswer) return false;
    if (auto && job.autoSaved) return false;

    const body = selectedJobReportHtml(job);
    await downloadBlob(
      auditFilename(job),
      htmlDoc(`${job.xsup} Retrospective Audit`, body),
      "text/html;charset=utf-8"
    );

    job.autoSaved = true;
    if (job.xsup === state.selectedXsup) renderExecutionPipeline(job);
    renderDashboard();
    return true;
  }

  async function maybeAutoSaveJob(job) {
    if (!state.autoSaveCompleted) return;
    if (!job?.auditAnswer || job.autoSaved) return;

    const downloaded = await downloadJobReport(job, { auto: true });
    if (downloaded) {
      showToast(state.saveDirectoryHandle ? `✓ ${job.xsup} report saved to ${state.saveDirectoryName}` : `↓ ${job.xsup} report downloaded`, "ok");
    }
  }


  function knowledgeArticleHtmlWithStatus(job) {
    const reviewCount = knowledgeReviewCount(job);
    let articleHtml = knowledgeMarkdownToHtml(job.knowledgeAnswer || "No knowledge draft available.");
    const statusBits = `${readinessChipHtml(job)}${reviewCount ? `<span class="xa-review-count">${reviewCount} review item${reviewCount === 1 ? "" : "s"}</span>` : ""}`;

    if (/<h1>[\s\S]*?<\/h1>/i.test(articleHtml)) {
      articleHtml = articleHtml.replace(
        /<h1>([\s\S]*?)<\/h1>/i,
        `<div class="xa-title-line"><h1>$1</h1>${statusBits}</div>`
      );
    } else {
      articleHtml = `<div class="xa-title-line"><h1>${escapeHtml(knowledgeArtifactLabel(job.knowledgeArtifactType || knowledgeArtifactType(job)))}</h1>${statusBits}</div>${articleHtml}`;
    }
    return articleHtml;
  }

  function knowledgeGenerationDetailsHtml(job) {
    return `
      <details class="xa-meta-details">
        <summary>Generation details</summary>
        <div class="xa-meta-details-body">
          <table class="xa-detail-table">
            <tbody>
              <tr><th>XSUP</th><td>${escapeHtml(job.xsup || "—")}</td></tr>
              <tr><th>SFDC</th><td>${escapeHtml(job.caseNumber || "—")}</td></tr>
              <tr><th>Product</th><td>${escapeHtml(productLabel(job))}</td></tr>
              <tr><th>Knowledge action</th><td>${escapeHtml(job.knowledgeAction || "—")}</td></tr>
              <tr><th>Artifact source</th><td>${escapeHtml(reuseStatusText(job.knowledgeReuseStatus))}${job.knowledgeFollowupId ? ` · Case Chat #${escapeHtml(job.knowledgeFollowupId)}` : ""}</td></tr>
              <tr><th>Artifact date</th><td>${escapeHtml(formatTimestamp(job.knowledgeCompletedAt))}</td></tr>
              <tr><th>Quality result</th><td>${escapeHtml(job.knowledgeQualityStatus || "—")}</td></tr>
            </tbody>
          </table>
          <p class="small">Automatically generated review draft. Human TAC/SME/Engineering/documentation review is required before publication.</p>
        </div>
      </details>
    `;
  }

  function knowledgeArtifactHtml(job) {
    const label = knowledgeArtifactLabel(job.knowledgeArtifactType || knowledgeArtifactType(job));
    return htmlDoc(
      `${job.xsup} ${label}`,
      `
      <article>
        <div class="section">${knowledgeArticleHtmlWithStatus(job)}</div>
        ${knowledgeReviewFooterHtml(job)}
        ${knowledgeGenerationDetailsHtml(job)}
      </article>
      `
    );
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

  function combinedKnowledgeText() {
    return [...state.jobs.values()]
      .filter(j => j.knowledgeAnswer)
      .map(j => `# ${j.xsup}${j.caseNumber ? ` · SFDC ${j.caseNumber}` : ""} — ${knowledgeArtifactLabel(j.knowledgeArtifactType)}\n\n${knowledgeTextForCopy(j.knowledgeAnswer)}`)
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

  async function downloadAllKnowledgeArtifacts() {
    const jobs = [...state.jobs.values()].filter(j => j.knowledgeAnswer);
    if (!jobs.length) {
      setStatus("No generated knowledge drafts to save.", "error");
      return;
    }

    const toc = jobs.map(j =>
      `<li><a href="#knowledge-${escapeHtml(j.xsup)}">${escapeHtml(j.xsup)}</a> — ${escapeHtml(knowledgeArtifactLabel(j.knowledgeArtifactType))}</li>`
    ).join("");

    const body = `
      <h1>XSUP Knowledge Draft Batch</h1>
      <p class="small">Generated ${escapeHtml(new Date().toLocaleString())} · ${jobs.length} knowledge artifact${jobs.length === 1 ? "" : "s"}</p>
      <ol>${toc}</ol>
      ${jobs.map(j => `
        <article class="ticket" id="knowledge-${escapeHtml(j.xsup)}">
          <h1>${escapeHtml(j.xsup)} — ${escapeHtml(knowledgeArtifactLabel(j.knowledgeArtifactType))}</h1>
          <div class="meta">
            <span class="pill">${escapeHtml(j.knowledgeAction || "")}</span>
            ${readinessChipHtml(j)}
            ${knowledgeReviewCount(j) ? `<span class="pill">${knowledgeReviewCount(j)} review item${knowledgeReviewCount(j) === 1 ? "" : "s"}</span>` : ""}
          </div>
          <div class="section">${knowledgeMarkdownToHtml(j.knowledgeAnswer)}</div>
          ${knowledgeReviewFooterHtml(j)}
        </article>
      `).join("")}
    `;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await downloadBlob(
      `XSUP_Knowledge_Drafts_${stamp}.html`,
      htmlDoc("XSUP Knowledge Draft Batch", body),
      "text/html;charset=utf-8"
    );
    setStatus(`${jobs.length} knowledge drafts saved via ${storageDestinationLabel()}.`, "ok");
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
    return `${job?.xsup || "XSUP-UNKNOWN"}_SFDC-${sfdc}_${artifactTimestamp(job, knowledge)}`;
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
          ? "Choose a folder to write directly to a local or desktop-synced Drive/OneDrive/shared folder."
          : "Custom folder selection is unavailable; the browser's configured Downloads behavior is used.";
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
        error: job.knowledgeError
      },
      evidence: job.evidence,
      taco_report: {
        verified_conclusion: job.report?.verified_conclusion || null,
        hypotheses: job.report?.hypotheses || [],
        result: job.report?.result || null
      },
      final_audit: job.auditAnswer,
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
            <li><b>XDR/XSIAM</b> — retrospective trigger: Resolution = Functions as designed.</li>
            <li><b>XSOAR</b> — trigger: Session_candidate label OR Fix Type = None / Functions as designed.</li>
            <li><b>Cortex Cloud</b> — trigger: selected Resolution values (Duplicate, Not a Bug, Environment/Config issue, Invalid, Functions as designed, Non Issue) OR RCA = User Error.</li>
          </ul>
          <p>Only fields that are applicable under the selected product policy should be reviewed. Missing irrelevant fields are Not Applicable, not missing data.</p>

          <h3>Concurrency</h3>
          <p>Up to two XSUP retrospective jobs run at the same time. Additional XSUPs queue and automatically start as a slot becomes free. Knowledge generation has one independent worker and continues while audit workers move to the next XSUPs.</p>

          <h3>Knowledge quality workflow</h3>
          <p>When knowledge is recommended, the knowledge worker first creates an enriched draft using directly relevant source material actually available to the Case Chat/TACO investigation. A separate quality-review Case Chat then rewrites/finalizes the artifact using a common quality rubric plus an artifact-specific rubric for KCS, documentation updates, runbooks or known issues/release notes.</p>
          <p>The final gate checks usefulness, completeness, actionability, generalization, evidence support, source relevance, consistency, readability, discoverability, audience fit and verification. Material validation items downgrade the final artifact to <b>DRAFTABLE</b>; unsafe/incomplete artifacts are marked <b>NOT READY</b> and are not downloaded as final knowledge.</p>

          <h3>Smart reuse</h3>
          <p>Before creating another Audit or final Knowledge Case Chat, the auditor checks existing follow-up history. Reuse requires matching current inputs/method. The selected product and product policy are part of the audit fingerprint, so a product change cannot accidentally reuse another product's retrospective.</p>
          <p><b>Re-analyze All</b> deliberately refreshes TACO and regenerates Audit + Knowledge. Do not use it merely to download another copy of a report.</p>

          <h3>Status &amp; review colors</h3>
          <p>Green = supported/correct/ready; amber = human validation/action; purple = inference/uncertainty; red = blocker/change/failure; blue = informational; gray = neutral/not applicable. Knowledge drafts place compact colored review chips directly beside the exact claim and include a collapsed Review Marker Guide at the bottom.</p>

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
      .xa-semantic-chip,.xa-review-chip{display:inline-flex;align-items:center;gap:3px;border-radius:999px;padding:2px 6px;font-size:9.5px;font-weight:800;line-height:1.35;white-space:nowrap;vertical-align:middle;border:1px solid transparent;cursor:help}.xa-semantic-green,.xa-review-green{background:#dcfce7;color:#065f46;border-color:#86efac}.xa-semantic-amber,.xa-review-amber{background:#fef3c7;color:#92400e;border-color:#fcd34d}.xa-semantic-purple,.xa-review-purple{background:#ede9fe;color:#6d28d9;border-color:#c4b5fd}.xa-semantic-red,.xa-review-red{background:#fee2e2;color:#991b1b;border-color:#fca5a5}.xa-semantic-blue,.xa-review-blue{background:#dbeafe;color:#1d4ed8;border-color:#93c5fd}.xa-semantic-gray,.xa-review-gray{background:#f8fafc;color:#64748b;border-color:#e2e8f0}.xa-review-chip{margin-left:4px}.xa-review-footer{margin-top:10px}.xa-review-footer details{margin:6px 0;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa}.xa-review-footer summary{cursor:pointer;padding:6px 8px;font-size:9px;font-weight:800;color:#475569}.xa-review-details-body,.xa-quality-details-body,.xa-review-guide-body{padding:0 8px 8px;font-size:9px;line-height:1.45}.xa-review-item-list{padding-left:18px;margin:4px 0}.xa-review-item-list li{margin:6px 0}.xa-review-validation-summary{margin-top:6px;padding:6px 8px;border-left:3px solid #f59e0b;background:#fffbeb;border-radius:5px}.xa-review-validation-summary p{margin:3px 0 0}.xa-review-guide-table-wrap{overflow:auto}.xa-review-guide-table{width:100%;border-collapse:collapse;font-size:10px}.xa-review-guide-table th,.xa-review-guide-table td{text-align:left;vertical-align:top;padding:5px;border-bottom:1px solid #e5e7eb}.xa-review-guide-table th{color:#475569;background:#f8fafc}.xa-review-count{font-size:8.5px;color:#92400e;font-weight:800}
      .xa-input-row{display:grid;grid-template-columns:1fr auto auto;gap:8px;margin-top:14px;align-items:stretch}#xsup-auditor-input{min-height:64px;max-height:130px;resize:vertical;border:1px solid #d1d5db;border-radius:9px;padding:9px 11px;font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}#xsup-auditor-run{border:0;border-radius:8px;padding:10px 14px;background:#4f46e5;color:#fff;font-weight:700;cursor:pointer}#xsup-auditor-stop{border:0;border-radius:8px;padding:10px 12px;background:#dc2626;color:#fff;font-weight:700;cursor:pointer}#xsup-auditor-run:disabled,#xsup-auditor-stop:disabled{opacity:.55;cursor:not-allowed}
      .xa-input-help{margin-top:5px;font-size:10px;color:#6b7280}.xa-toggle-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.xa-auto-download{display:flex;align-items:flex-start;gap:8px;margin-top:0;padding:8px 10px;border:1px solid #e5e7eb;border-radius:9px;background:#fafafa;cursor:pointer}.xa-auto-download input{margin-top:2px}.xa-auto-download span{display:flex;flex-direction:column;gap:2px}.xa-auto-download strong{font-size:11px}.xa-auto-download small{font-size:9px;color:#6b7280;line-height:1.35}.xa-status{margin-top:10px;padding:9px 10px;background:#f3f4f6;border-radius:8px;font-size:12px}.xa-status[data-kind="ok"]{background:#ecfdf5;color:#065f46}.xa-status[data-kind="error"]{background:#fef2f2;color:#991b1b}
      .xa-workspace{display:grid;grid-template-columns:220px minmax(0,1fr);gap:12px;margin-top:12px}.xa-sidebar{border:1px solid #e5e7eb;border-radius:11px;background:#fafafa;overflow:hidden;align-self:start;position:sticky;top:0}.xa-side-head{display:flex;align-items:center;justify-content:space-between;padding:9px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.xa-side-head span:last-child{font-weight:600;color:#6b7280;text-transform:none;letter-spacing:0}.xa-job-list{max-height:62vh;overflow:auto;padding:6px}.xa-job-empty{padding:12px 8px;color:#6b7280;font-size:11px;line-height:1.5}.xa-job{width:100%;display:flex;gap:8px;align-items:flex-start;border:1px solid transparent;background:transparent;border-radius:9px;padding:8px;text-align:left;cursor:pointer;margin-bottom:4px}.xa-job:hover{background:#f3f4f6}.xa-job-selected{background:#eef2ff!important;border-color:#c7d2fe}.xa-job-icon{width:18px;text-align:center;font-weight:800;line-height:18px}.xa-job-main{min-width:0;display:flex;flex-direction:column;gap:1px;flex:1}.xa-job-main strong{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.xa-job-main em{font-size:10px;font-style:normal;color:#4b5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.xa-job-main small{font-size:9px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.xa-job-completed .xa-job-icon{color:#047857}.xa-job-failed .xa-job-icon{color:#b91c1c}.xa-job-running .xa-job-icon{color:#4f46e5}.xa-job-stopped .xa-job-icon{color:#6b7280}
      .xa-detail{min-width:0}.xa-detail-empty{border:1px dashed #d1d5db;border-radius:11px;padding:38px 20px;text-align:center;color:#6b7280;font-size:12px}.xa-selected-title{font-size:14px;font-weight:800;margin:1px 0 4px}
      .xa-execution-pipeline{display:flex;flex-direction:column;gap:5px;margin:7px 0 11px}.xa-pipeline-row{display:grid;grid-template-columns:22px 150px minmax(0,1fr);align-items:start;gap:7px;padding:8px 9px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb}.xa-pipeline-icon{font-size:13px;font-weight:900;text-align:center}.xa-pipeline-label{font-size:10px;font-weight:800;color:#374151}.xa-pipeline-row strong{font-size:10px;line-height:1.4;font-weight:650;word-break:break-word}.xa-pipeline-complete{background:#ecfdf5;border-color:#a7f3d0}.xa-pipeline-complete .xa-pipeline-icon,.xa-pipeline-complete strong{color:#047857}.xa-pipeline-active{background:#eef2ff;border-color:#c7d2fe}.xa-pipeline-active .xa-pipeline-icon,.xa-pipeline-active strong{color:#4338ca}.xa-pipeline-pending{background:#f9fafb;border-color:#e5e7eb}.xa-pipeline-pending .xa-pipeline-icon,.xa-pipeline-pending strong{color:#9ca3af}.xa-pipeline-waiting{background:#fffbeb;border-color:#fde68a}.xa-pipeline-waiting .xa-pipeline-icon,.xa-pipeline-waiting strong{color:#92400e}.xa-pipeline-failed{background:#fef2f2;border-color:#fecaca}.xa-pipeline-failed .xa-pipeline-icon,.xa-pipeline-failed strong{color:#b91c1c}.xa-pipeline-skipped{background:#f9fafb;border-color:#e5e7eb}.xa-pipeline-skipped .xa-pipeline-icon,.xa-pipeline-skipped strong{color:#6b7280}.xa-section-title-top{margin-top:10px!important}
      .xa-target-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.xa-target-link{display:inline-flex;align-items:center;padding:6px 9px;border:1px solid #c7d2fe;border-radius:999px;background:#eef2ff;color:#3730a3;text-decoration:none;font-size:11px;font-weight:700}.xa-target-link:hover{background:#e0e7ff;text-decoration:underline}.xa-target-note{display:inline-flex;align-items:center;padding:6px 9px;border:1px dashed #d1d5db;border-radius:999px;color:#6b7280;font-size:10px}
      .xa-dashboard-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}.xa-dashboard-head h2{margin:0;font-size:17px}.xa-dashboard-head p{margin:3px 0 0;color:#6b7280;font-size:11px}.xa-dashboard-head>span{font-size:11px;color:#6b7280}.xa-stats{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:8px;margin-bottom:12px}.xa-stat{border:1px solid #e5e7eb;border-radius:10px;padding:10px;background:#fafafa}.xa-stat strong{display:block;font-size:20px}.xa-stat span{font-size:10px;color:#6b7280}.xa-stat.ok{background:#ecfdf5;border-color:#a7f3d0}.xa-stat.warn{background:#fffbeb;border-color:#fde68a}.xa-stat.bad{background:#fef2f2;border-color:#fecaca}.xa-stat.run{background:#eef2ff;border-color:#c7d2fe}.xa-dashboard-table-wrap{border:1px solid #e5e7eb;border-radius:10px;overflow:auto}.xa-dashboard-table{width:100%;border-collapse:collapse;font-size:10px;min-width:1450px}.xa-dashboard-table th{position:sticky;top:0;background:#f9fafb;text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;color:#4b5563}.xa-dashboard-table td{padding:8px;border-bottom:1px solid #f3f4f6;vertical-align:top}.xa-dashboard-table tr:last-child td{border-bottom:0}.xa-dashboard-row.xa-row-running{background:linear-gradient(90deg,rgba(238,242,255,.45),transparent 35%)}.xa-table-link{border:0;background:none;padding:0;color:#4f46e5;text-decoration:underline;text-underline-offset:2px;font:inherit;font-weight:700;cursor:pointer;text-align:left}.xa-status-pill{display:inline-flex;padding:3px 6px;border-radius:999px;background:#f3f4f6;white-space:nowrap;margin-top:4px}.xa-pill-running{background:#eef2ff;color:#3730a3}.xa-pill-completed{background:#ecfdf5;color:#065f46}.xa-pill-failed{background:#fef2f2;color:#991b1b}.xa-pill-needs_selection,.xa-pill-needs_product{background:#fffbeb;color:#92400e}.xa-empty-cell{text-align:center;color:#6b7280;padding:25px!important}.xa-activity{max-width:260px;line-height:1.35;word-break:break-word}.xa-progress-wrap{min-width:150px}.xa-progress-wrap.compact{min-width:0;margin-top:4px}.xa-progress-top{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:10px;margin-bottom:4px}.xa-progress-top strong{font-size:10px;white-space:nowrap}.xa-progress-sub{font-size:8px;color:#6366f1;max-width:145px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.xa-progress-track{height:7px;border-radius:999px;background:#e5e7eb;overflow:hidden}.xa-progress-track span{display:block;height:100%;border-radius:999px;background:#6366f1;transition:width .3s ease}.xa-progress-wrap.compact .xa-progress-top{display:none}.xa-progress-wrap.compact .xa-progress-track{height:4px}.xa-job-completed .xa-progress-track span{background:#10b981}.xa-heartbeat{font-size:9px;white-space:normal;line-height:1.3;color:#4b5563}.xa-heartbeat[data-kind="live"]{color:#047857}.xa-heartbeat[data-kind="warn"]{color:#92400e;font-weight:700}.xa-heartbeat[data-kind="bad"]{color:#b91c1c;font-weight:700}.xa-heartbeat[data-kind="ok"]{color:#047857}.xa-selected-progress{margin-top:10px;border:1px solid #c7d2fe;border-radius:10px;padding:10px;background:#f8faff}.xa-selected-progress-main{display:grid;grid-template-columns:180px minmax(0,1fr);gap:12px;align-items:center}.xa-selected-progress-main>div:first-child span{display:block;font-size:9px;color:#6b7280}.xa-selected-progress-main>div:first-child strong{display:block;font-size:18px;margin-top:1px}.xa-selected-progress-meta{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:9px;color:#4b5563}.xa-selected-progress-meta em{font-style:normal}.xa-selected-progress-meta em[data-kind="warn"]{color:#92400e;font-weight:700}.xa-selected-progress-meta em[data-kind="bad"]{color:#b91c1c;font-weight:700}.xa-selected-progress-meta em[data-kind="live"]{color:#047857}
      .xa-dashboard-btn{width:calc(100% - 12px);margin:6px;border:1px solid #c7d2fe;background:#eef2ff;color:#3730a3;border-radius:9px;padding:8px;text-align:left;font-size:11px;font-weight:800;cursor:pointer}.xa-dashboard-btn:hover{background:#e0e7ff}
      .xa-storage-global{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:9px;padding:9px 10px;border:1px solid #bbf7d0;border-radius:9px;background:#f0fdf4}.xa-storage-global>div:first-child strong{display:block;font-size:10px;color:#166534}.xa-storage-global>div:first-child span{display:block;font-size:8px;color:#4b5563;margin-top:2px}.xa-storage-global-status[data-kind="ok"]{color:#047857!important;font-weight:700}.xa-storage-global-status[data-kind="default"]{color:#4b5563!important;font-weight:700}.xa-storage-global button:disabled{opacity:.45;cursor:not-allowed}.xa-storage-card{border:1px solid #bbf7d0;border-radius:10px;padding:10px;margin-top:8px;background:#f7fff9}.xa-storage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.xa-storage-head strong{display:block;font-size:12px}.xa-storage-head span{display:block;font-size:9px;color:#6b7280;margin-top:2px}.xa-decision-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:8px}.xa-decision-item{border:1px solid #e5e7eb;border-radius:8px;padding:7px 8px;background:#fafafa}.xa-decision-item span{display:block;font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:.03em}.xa-decision-item strong{display:block;margin-top:2px;font-size:10px;word-break:break-word}.xa-knowledge-card{border:1px solid #dbeafe;border-radius:10px;padding:10px;margin-top:8px;background:#f8fbff}.xa-knowledge-title{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.xa-knowledge-title>div strong{display:block;font-size:12px}.xa-knowledge-title>div span{display:block;font-size:9px;color:#6b7280;margin-top:2px}.xa-knowledge-status{font-size:9px;border-radius:999px;padding:4px 7px;background:#f3f4f6;white-space:nowrap}.xa-knowledge-completed{background:#ecfdf5;color:#065f46}.xa-knowledge-generating{background:#eef2ff;color:#3730a3}.xa-knowledge-failed{background:#fef2f2;color:#991b1b}.xa-knowledge-queued{background:#fffbeb;color:#92400e}.xa-knowledge-error{margin-top:7px;padding:7px;border-radius:7px;background:#fef2f2;color:#991b1b;font-size:10px}.xa-knowledge-preview{margin-top:9px;max-height:360px;overflow:auto;border-top:1px solid #e5e7eb;padding-top:7px;font-size:11px}.xa-knowledge-cell{display:flex;flex-direction:column;gap:2px;min-width:145px}.xa-knowledge-cell strong{font-size:9px}.xa-knowledge-cell small{font-size:8px;color:#6b7280;line-height:1.3}.xa-help-dot{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;margin-left:5px;border:1px solid #cbd5e1;border-radius:999px;color:#64748b;background:#fff;font-size:9px;font-weight:800;vertical-align:middle;cursor:help}.xa-help-dot:hover,.xa-help-dot:focus{border-color:#818cf8;color:#4338ca;background:#eef2ff;outline:none;box-shadow:0 0 0 2px rgba(99,102,241,.12)}.xa-floating-tooltip{position:fixed;z-index:2147483647;max-width:340px;padding:8px 10px;border-radius:8px;background:#111827;color:#fff;font-size:10px;line-height:1.45;font-weight:500;box-shadow:0 10px 30px rgba(15,23,42,.25);pointer-events:none;white-space:normal;word-break:normal}.xa-floating-tooltip:after{content:"";position:absolute;left:50%;transform:translateX(-50%);border:6px solid transparent}.xa-floating-tooltip[data-placement="bottom"]:after{top:-12px;border-bottom-color:#111827}.xa-floating-tooltip[data-placement="top"]:after{bottom:-12px;border-top-color:#111827}.xa-help-repo{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;margin:2px 0 14px;border:1px solid #c7d2fe;border-radius:10px;background:#eef2ff}.xa-help-repo>div{min-width:0}.xa-help-repo strong{display:block;font-size:12px;color:#312e81}.xa-help-repo span{display:block;margin-top:2px;color:#64748b;font-size:10px}.xa-help-repo a:not(.xa-help-repo-button){display:block;margin-top:5px;color:#4338ca;font-size:10px;overflow-wrap:anywhere}.xa-help-repo-button{display:inline-flex;align-items:center;flex:0 0 auto;border:1px solid #a5b4fc;background:#fff;color:#3730a3;border-radius:8px;padding:7px 10px;text-decoration:none!important;font-size:10px;font-weight:800;white-space:nowrap}.xa-decision-group{margin-top:9px}.xa-decision-group-title{font-size:10px;font-weight:850;color:#374151;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em}.xa-decision-item small{display:block;margin-top:4px;color:#6b7280;font-size:8.5px;line-height:1.35;font-weight:500}.xa-decision-empty{padding:9px;border:1px dashed #d1d5db;border-radius:8px;color:#6b7280;font-size:10px}.xa-pipeline-row{grid-template-columns:22px 150px minmax(0,1fr)}.xa-pipeline-action{border:1px solid #c7d2fe;background:#fff;color:#3730a3;border-radius:7px;padding:5px 8px;font-size:9px;font-weight:750;cursor:pointer;white-space:nowrap}.xa-pipeline-action:disabled{opacity:.45;cursor:not-allowed}.xa-knowledge-decision{margin-top:7px;padding:7px 8px;border-radius:7px;background:#f8fafc;color:#475569;font-size:9.5px;line-height:1.4}.xa-reuse-summary{margin:10px 0 8px;border:1px solid #dbe4f0;border-radius:10px;background:#fbfdff;overflow:hidden}.xa-reuse-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 10px;border-bottom:1px solid #e5e7eb}.xa-reuse-head>div:first-child strong{display:block;font-size:10.5px;color:#1f2937}.xa-reuse-head>div:first-child span{display:block;font-size:8.5px;color:#6b7280;margin-top:2px}.xa-reuse-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.xa-reuse-actions button{padding:5px 7px;border:1px solid #cbd5e1;background:#fff;border-radius:7px;font-size:8.5px;font-weight:750;color:#334155;cursor:pointer}.xa-reuse-actions button:hover{border-color:#818cf8;color:#4338ca}.xa-reuse-actions button:disabled{opacity:.42;cursor:not-allowed}.xa-reuse-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.xa-reuse-item{padding:8px 10px;min-width:0;border-right:1px solid #eef2f7}.xa-reuse-item:last-child{border-right:0}.xa-reuse-item>span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;font-weight:800}.xa-reuse-item>strong{display:block;font-size:10px;margin-top:2px;color:#334155}.xa-reuse-item>small{display:block;font-size:8.5px;color:#64748b;margin-top:1px}.xa-reuse-item>em{display:block;font-style:normal;font-size:8.2px;line-height:1.35;color:#64748b;margin-top:3px;max-height:35px;overflow:hidden}.xa-reuse-item.ok>strong{color:#047857}.xa-reuse-item.run>strong{color:#4338ca}.xa-reuse-item.bad>strong{color:#b91c1c}.xa-reuse-item-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.xa-reuse-item-actions{margin-top:7px;padding-top:6px;border-top:1px solid #eef2f7}.xa-reuse-item-actions button{width:100%;border:1px solid #c7d2fe;background:#fff;color:#3730a3;border-radius:7px;padding:6px 8px;font-size:9.5px;font-weight:800;cursor:pointer}.xa-reuse-item-actions button:hover{background:#eef2ff;border-color:#818cf8}.xa-reuse-item-actions button:disabled{opacity:.42;cursor:not-allowed;background:#f8fafc}.xa-job-running .xa-job-icon,.xa-pipeline-active .xa-pipeline-icon{display:inline-block;animation:xa-spin 1s linear infinite}@keyframes xa-spin{to{transform:rotate(360deg)}}.xa-source-badge{display:inline-flex;align-items:center;border-radius:999px;padding:2px 6px;font-size:7.5px;font-weight:850;letter-spacing:.03em;white-space:nowrap}.xa-source-badge.reused{background:#dbeafe;color:#1d4ed8}.xa-source-badge.new{background:#dbeafe;color:#1d4ed8}.xa-source-badge.checking{background:#ede9fe;color:#6d28d9}.xa-source-badge.failed{background:#fee2e2;color:#b91c1c}.xa-source-badge.pending{background:#f3f4f6;color:#6b7280}.xa-prior-result{display:block!important;margin-top:5px!important;padding-top:5px;border-top:1px dashed #dbe4f0;color:#7c3aed!important;font-size:8px!important;line-height:1.35}.xa-decision-list{display:flex;flex-direction:column;gap:6px}.xa-decision-row{width:100%;box-sizing:border-box;border:1px solid #e5e7eb;border-radius:8px;background:#fff;padding:9px 11px}.xa-decision-row.ticket{border-left:3px solid #818cf8}.xa-decision-row.knowledge{border-left:3px solid #a7f3d0}.xa-decision-row-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.xa-decision-row-head>span{font-size:8.5px;color:#64748b;font-weight:800;text-transform:uppercase;letter-spacing:.03em}.xa-decision-row-head>strong{font-size:10.5px;color:#111827;text-align:right}.xa-decision-row-explanation{margin-top:6px;padding-top:6px;border-top:1px solid #f1f5f9;color:#526071;font-size:9.5px;line-height:1.45;max-width:none}@media(max-width:900px){.xa-reuse-head{align-items:flex-start;flex-direction:column}.xa-reuse-grid{grid-template-columns:1fr}.xa-reuse-item{border-right:0;border-bottom:1px solid #eef2f7}.xa-reuse-item:last-child{border-bottom:0}}.xa-product-mode{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:9px;background:#fafafa}.xa-product-mode>div strong{display:block;font-size:11px}.xa-product-mode>div small{display:block;margin-top:2px;color:#6b7280;font-size:9px}.xa-product-mode select{border:1px solid #cbd5e1;border-radius:7px;padding:6px 8px;background:#fff;font-size:10px;color:#334155}.xa-product-card{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;padding:9px 10px;border:1px solid #dbeafe;border-radius:9px;background:#f8fbff}.xa-product-card.needs{border-color:#fde68a;background:#fffbeb}.xa-product-card>div{min-width:0}.xa-product-card span{display:block;font-size:8px;color:#64748b;text-transform:uppercase;font-weight:800;letter-spacing:.04em}.xa-product-card strong{display:block;font-size:12px;margin-top:1px}.xa-product-card small{display:block;font-size:8.5px;color:#64748b;margin-top:2px;line-height:1.3}.xa-product-card button{flex:0 0 auto;border:1px solid #a5b4fc;background:#fff;color:#3730a3;border-radius:7px;padding:6px 8px;font-size:9px;font-weight:800;cursor:pointer}.xa-product-card button:disabled{opacity:.45;cursor:not-allowed}.xa-product-locked{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;background:#f3f4f6;color:#64748b;font-size:8.5px;font-weight:750;white-space:nowrap;cursor:help}.xa-product-reason{padding:8px 9px;margin-bottom:8px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;color:#475569;font-size:10px;line-height:1.4}.xa-product-options{display:grid;grid-template-columns:1fr;gap:8px}.xa-product-option{position:relative;text-align:left;border:1px solid #e5e7eb;background:#fff;border-radius:9px;padding:10px 11px;cursor:pointer}.xa-product-option:hover{border-color:#818cf8;background:#f8faff}.xa-product-option.suggested{border-color:#a5b4fc;background:#eef2ff}.xa-product-option strong{display:block;font-size:12px}.xa-product-option span{display:block;margin-top:3px;color:#64748b;font-size:9px;line-height:1.35}.xa-product-option em{position:absolute;right:8px;top:8px;font-style:normal;font-size:8px;font-weight:800;color:#4338ca;background:#fff;border:1px solid #c7d2fe;border-radius:999px;padding:2px 6px}.xa-help-modal{width:min(860px,96vw)}.xa-help-body{padding:8px 4px 2px;font-size:11px;line-height:1.55}.xa-help-body h3{margin:14px 0 5px;font-size:13px}.xa-help-body p{margin:5px 0}.xa-help-body ul{margin:5px 0 5px 20px;padding:0}.xa-help-body li{margin:4px 0}
      .xa-sfdc-card{border:1px solid #e5e7eb;border-radius:9px;padding:9px;margin-top:7px;background:#fafafa}.xa-sfdc-card.selected{border-color:#818cf8;background:#eef2ff}.xa-sfdc-title{display:flex;justify-content:space-between;gap:8px;align-items:center}.xa-selected-badge{font-size:9px;border-radius:999px;padding:3px 6px;background:#dcfce7;color:#166534}.xa-sfdc-detail-text{margin-top:5px;font-size:10px;line-height:1.45;color:#4b5563;word-break:break-word}.xa-sfdc-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:7px}.xa-sfdc-actions a{color:#4f46e5;text-decoration:underline;font-size:10px}.xa-sfdc-actions span{font-size:10px;color:#6b7280}.xa-sfdc-actions button{border:1px solid #c7d2fe;background:#fff;color:#3730a3;border-radius:7px;padding:5px 8px;font-size:10px;font-weight:700;cursor:pointer}
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
          <div class="xa-sub">v${VERSION} · XDR/XSIAM · XSOAR · Cortex Cloud · ${state.concurrency} audit workers · ${state.knowledgeConcurrency} knowledge worker<span id="xsup-auditor-elapsed"></span></div>
        </div>
        <div class="xa-head-actions">
          <button id="xsup-auditor-minimize" class="xa-icon" title="Minimize">—</button>
          <button id="xsup-auditor-maximize" class="xa-icon" title="Maximize">⛶</button>
          <button id="xsup-auditor-close" class="xa-icon" title="Close">×</button>
        </div>
      </div>

      <div class="xa-input-row">
        <textarea id="xsup-auditor-input" placeholder="Paste one or more XSUP IDs&#10;XSUP-72446&#10;XSUP-81234"></textarea>
        <button id="xsup-auditor-run">Run Audit(s)</button>
        <button id="xsup-auditor-stop" disabled>Stop All</button>
      </div>
      <div class="xa-input-help">IDs may be separated by spaces, commas or new lines. Duplicate IDs are removed. Up to 2 XSUP reviews run at once; queued XSUPs start automatically. Knowledge drafts run one at a time.</div>
      <div class="xa-toggle-row">
        <label class="xa-auto-download">
          <input id="xsup-auditor-auto-download" type="checkbox" checked>
          <span><strong>Auto-download/save completed audit reports</strong><small>Default: browser download. If a folder is selected, writes directly to that folder.</small></span>
        </label>
        <label class="xa-auto-download">
          <input id="xsup-auditor-auto-knowledge" type="checkbox" checked>
          <span><strong>Auto-generate recommended knowledge drafts</strong><small>Uses one separate Case Chat worker and auto-downloads KCS/doc/runbook drafts only when recommended.</small></span>
        </label>
      </div>
      <div class="xa-product-mode">
        <div><strong>Product selection</strong><small>Auto detects XDR/XSIAM, XSOAR or Cortex Cloud. Only high-confidence detection continues automatically; other cases pause only that XSUP for confirmation.</small></div>
        <select id="xsup-auditor-product-mode">
          <option value="auto" selected>Auto detect</option>
          <option value="manual">Ask me for every XSUP</option>
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
          <div class="xa-side-head"><span>XSUP Queue</span><span>2 workers</span></div>
          <button id="xsup-auditor-dashboard-btn" class="xa-dashboard-btn">▦ Live Dashboard</button>
          <div style="padding:2px 8px 4px;color:#6b7280;font-size:9px;line-height:1.35">Click any XSUP to view its progress, report, comment and references.</div>
          <div id="xsup-auditor-job-list" class="xa-job-list">
            <div class="xa-job-empty">Paste one or more XSUP IDs above and click Run Audit(s).</div>
          </div>
          <div class="xa-actions" style="padding:0 8px 8px;margin-top:2px">
            <button id="xsup-auditor-copy-all-comments" title="Copies the review paste comments for every completed ticket in this batch.">Copy All Review Comments</button>
            <button id="xsup-auditor-download-all" title="Downloads all completed XSUP reports into one HTML file, or writes it to the selected folder.">Download All Reports</button>
            <button id="xsup-auditor-copy-all-reports" title="Copies all completed audit reports.">Copy All Reports</button>
            <button id="xsup-auditor-download-all-knowledge" title="Downloads all generated KCS/doc/runbook drafts into one HTML file, or writes it to the selected folder.">Download All Knowledge Drafts</button>
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
              <button id="xsup-auditor-retry-chat" disabled title="Force a fresh Audit Case Chat using the current TACO analysis and evidence.">Re-run Audit</button>
              <button id="xsup-auditor-debug" disabled title="Exports the selected XSUP's evidence, TACO analysis, final audit and references as JSON.">Export Selected Debug</button>
            </div>
          </div>
        </main>
      </div>
    `;
    document.body.appendChild(panel);
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
          ? "Automatic audit report saving enabled."
          : "Automatic audit report saving disabled.",
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

    document.getElementById("xsup-auditor-choose-folder").onclick = chooseSaveFolder;

    document.getElementById("xsup-auditor-run").onclick = runAudit;
    document.getElementById("xsup-auditor-stop").onclick = stopAudit;
    document.getElementById("xsup-auditor-minimize").onclick = minimizePanel;
    document.getElementById("xsup-auditor-maximize").onclick = toggleMaximize;
    document.getElementById("xsup-auditor-retry-chat").onclick = retryCaseChatOnly;

    document.getElementById("xsup-auditor-close").onclick = () => {
      if (state.running || state.activeCount) stopAudit();
      clearInterval(state.elapsedTimer);
      closeSFDCChooser();
      closeProductChooser();
      document.getElementById("xsup-auditor-help-modal")?.remove();
      document.getElementById("xsup-auditor-bubble")?.remove();
      document.getElementById("xsup-auditor-toast")?.remove();
      hideAuditorTooltip();
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
    document.getElementById("xsup-auditor-download-all-knowledge").onclick = () => void downloadAllKnowledgeArtifacts();
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

  createUI();
})();
