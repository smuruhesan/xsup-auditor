# XSUP Auditor & KCS Generator

**Internal APAC Cortex TAC decision-support and Knowledge-generation tool**

XSUP Auditor & KCS Generator is a self-contained browser tool that runs inside TACopilot using the reviewer's existing authenticated session.

It has two entry workflows:

1. **Run XSUP Retrospective** — product-specific retrospective review plus Knowledge recommendation/generation when appropriate.
2. **Generate KCS** — direct KCS generation from an XSUP ID or 8-digit SFDC case number without running the retrospective Support-owned field review.

Supported retrospective product profiles:

- **XDR/XSIAM**
- **XSOAR**
- **Cortex Cloud**

The tool coordinates TACopilot, TACO Analysis, original Jira/SFDC evidence and Case Chat. It does **not** automatically modify Jira/SFDC and does **not** automatically publish Knowledge.

---

# Quick Start

## Option 1 — Bookmark installer (recommended)

Use the self-contained installer:

[Download the XSUP Auditor Bookmark Installer](./dist/XSUP_Auditor_Bookmark_Installer.html)

[**⬇ Download XSUP Auditor Bookmark Installer**](https://github.com/smuruhesan/xsup-auditor/releases/latest/download/XSUP_Auditor_Bookmark_Installer.html)

1. Open the HTML file locally in Chrome.
2. Show the bookmarks bar (`Cmd + Shift + B` on macOS; `Ctrl + Shift + B` on Windows/Linux).
3. Drag the blue **XSUP Auditor** button to the bookmarks bar.
4. Open TACopilot.
5. Click the **XSUP Auditor** bookmark.

The Auditor opens inside the current TACopilot page.

### If dragging the bookmark fails

The installer also provides **Copy bookmark URL**.

1. Click **Copy bookmark URL**.
2. Right-click the Chrome bookmarks bar.
3. Choose **Add page**.
4. Name it `XSUP Auditor`.
5. Paste the copied value into the bookmark **URL** field.
6. Save it.
7. Open TACopilot and click the bookmark.

The bookmark is self-contained. It does not require hosting the JavaScript on the TACopilot backend or on an external website.

> Managed-browser policies still apply. Do not bypass corporate browser/security restrictions if bookmark execution is disabled by policy.

## Option 2 — Direct source / Chrome DevTools Snippet

Use either:

- canonical source: `src/xsup-auditor.js`
- copy-friendly distribution: `dist/XSUP_Auditor_JS.txt`

The `.txt` distribution contains the same JavaScript and is useful where managed browsers block direct `.js` downloads.

1. Open TACopilot.
2. Open Chrome DevTools.
3. Go to **Sources → Snippets**.
4. Create/open the XSUP Auditor Snippet.
5. Copy the complete JavaScript into the Snippet.
6. Save and run it while TACopilot is open.

See the [User Guide](docs/USER_GUIDE.md) for detailed setup and usage.

---

# Two workflows

## 1. Run XSUP Retrospective

Input:

```text
XSUP-72446
XSUP-81234
```

Flow:

```text
XSUP
 ↓
Resolve SFDC
 ↓
Collect original Jira / SFDC evidence
 ↓
Detect / confirm product
 ↓
Reuse / wait / refresh TACO when required
 ↓
Retrospective Case Chat
 ↓
Support-owned field decision
 ↓
Knowledge action classification
 ↓
If Knowledge is appropriate:
Draft → Independent Quality Review → Deterministic Checks → Optional One-time Repair
 ↓
READY / DRAFTABLE / NOT READY
 ↓
Human review
```

The retrospective decides which Support-owned fields are applicable and which Knowledge action is most appropriate.

## 2. Generate KCS

Input can be either:

```text
XSUP-72446
```

or:

```text
04005807
```

Flow:

```text
XSUP or SFDC
 ↓
Resolve case context
 ↓
Detect / confirm product
 ↓
Reuse / wait / refresh TACO when required
 ↓
Collect original Jira / SFDC evidence
 ↓
Generate KCS Draft
 ↓
Independent Quality Review
 ↓
Deterministic Checks
 ↓
Optional One-time Repair
 ↓
READY / DRAFTABLE / NOT READY
 ↓
Human review
```

Direct KCS mode intentionally **skips**:

- retrospective eligibility classification
- Resolution review
- RCA review
- Fix Type review
- Flag/Label review
- retrospective Review Paste Comment

It still uses the same evidence boundaries and Knowledge quality controls.

---

# Retrospective product policies

| Product | Retrospective trigger | Fields reviewed when triggered |
|---|---|---|
| **XDR/XSIAM** | Resolution = `Functions as designed` | Resolution |
| **XSOAR** | `Session_candidate` label OR Fix Type = `None` / `Functions as designed` | Fix Type and/or Flag/Label |
| **Cortex Cloud** | selected Resolution values OR RCA = `User Error` | Resolution and/or RCA |

Only applicable fields are reviewed. Missing irrelevant fields are **NOT APPLICABLE**, not missing data.

See [Product Policies](docs/PRODUCT_POLICIES.md).

---

# How the retrospective chooses KCS vs Admin Guide vs Runbook vs Known Issue

This decision is made **inside the Retrospective Audit Case Chat prompt using an explicit Knowledge Decision rubric**. It is not a keyword-only JavaScript classifier.

The prompt asks Case Chat to choose one primary reusable Knowledge action after the product-specific field decision:

| Knowledge action | When the prompt should choose it | Generated artifact |
|---|---|---|
| `CREATE KCS` | Repeatable Support-resolution pattern: symptom/error → check → confirm → fix/workaround → verify | KCS Draft |
| `UPDATE EXISTING KCS` | A relevant KCS already exists but materially lacks the needed resolution content | KCS Update Proposal |
| `UPDATE ADMIN/TECH GUIDE` | Official product behavior, configuration or expectation needs clearer administrator/customer documentation | Admin/Tech Guide Update Proposal |
| `CREATE/UPDATE RUNBOOK` | Reusable value is primarily an internal investigation/evidence workflow rather than a complete customer-facing resolution article | Runbook Draft |
| `KNOWN ISSUE/RELEASE NOTE` | A version-specific defect or limitation belongs in known-issue/release communication | Known Issue / Release Note Draft |
| `NO KNOWLEDGE ACTION` | No material reusable Knowledge gap is identified | No artifact |
| `UNDETERMINED` | Available evidence is insufficient to choose safely | No automatic artifact |

The Audit also returns:

- primary and optional secondary Knowledge action
- initial Artifact Readiness
- Existing Knowledge Coverage (`COMPLETE / PARTIAL / NONE / UNDETERMINED`)
- Knowledge Decision Explanation
- supporting Knowledge Evidence
- Validation Boundary
- whether automatic Knowledge generation should occur

JavaScript then parses the selected action and maps it to the corresponding artifact template and quality rubric.

### Direct Generate KCS is intentionally different

The **Generate KCS** button does not ask the retrospective prompt to classify the artifact type.

It explicitly sets:

```text
Knowledge Action = CREATE KCS
Artifact Type = KCS Draft
```

and sends the case directly into the KCS quality pipeline.

This keeps the user's intent explicit: **Generate KCS means generate a KCS**, not auto-select another Knowledge type.

See [Knowledge Quality](docs/KNOWLEDGE_QUALITY.md).

---

# Evidence model

The Auditor separates:

## Derived analysis

TACO can synthesize the case and technical conclusion.

## Original case evidence

Original Jira/SFDC records are required when the workflow needs to prove what Engineering, TAC or the customer actually recorded or communicated.

Important rules:

- TACO-generated Customer Response is not proof that a customer message was sent.
- Selected evidence excerpts cannot prove absence.
- `RCA Category` is not treated as the actual RCA field.
- Insufficient evidence → **UNDETERMINED** rather than guessing.
- Do not infer AI usage from writing style.
- Avoid subjective labels about engineers.

---

# Knowledge quality pipeline

Both retrospective-generated Knowledge and direct KCS use the same quality engine once Knowledge generation starts.

```text
Knowledge basis
 ↓
1. Generate enriched draft
   + preliminary inline review markers
 ↓
2. Independent AI quality review
   ├─ if request is rejected (for example a 422):
   │    retry once with compact quality context
   ↓
3. Deterministic JavaScript checks
 ↓
4. One evidence-bounded repair pass when appropriate
 ↓
5. Deterministic checks again
 ↓
READY / DRAFTABLE / NOT READY
 ↓
Human review
```

The system checks accuracy, usefulness, completeness, actionability, generalization, technical depth, source quality, consistency, readability, discoverability, audience fit, verification and publication boundaries.

It also makes uncertainty visible with inline review markers such as:

- `⚠ SME REVIEW`
- `⚙ ENGINEERING REVIEW`
- `◇ INFERENCE`
- `🔎 SOURCE CHECK`
- `🧭 SCOPE CHECK`
- `ℹ RECOMMENDATION`
- `✓ CONFIRMED`
- `✕ UNSUPPORTED`

Every artifact requires an **At a Glance** summary near the top.

See [Knowledge Quality](docs/KNOWLEDGE_QUALITY.md).

---

# Knowledge readiness

## READY

A useful, materially complete draft with no material unresolved validation item identified by the automated quality workflow.

## DRAFTABLE

A useful draft exists, but named human validation items remain.

## NOT READY

A usable draft exists, but a material blocker remains. The draft is preserved and shows a visible **REVIEW REQUIRED** section explaining **What to review** and **Why**.

`NOT READY` is not automatically a failed Knowledge job.

`FAILED` is reserved for cases where the workflow cannot produce or preserve a usable artifact.

All Knowledge remains a draft/proposal for human review even when READY.

---

# Smart Reuse

The tool avoids unnecessary repeat AI work.

Reuse is driven by source compatibility, not merely by UI/code changes.

Typical behavior:

| Situation | TACO | Retrospective Audit | Knowledge |
|---|---|---|---|
| Nothing material changed | Reuse | Reuse | Reuse |
| New Jira/SFDC evidence | Refresh if newer than TACO | Fresh as required | Fresh as required |
| Product changed | Reuse if still current | Fresh | Fresh |
| `Regenerate Audit` | Reuse current | Fresh | Mark prior Knowledge outdated; do not auto-regenerate |
| `Regenerate KCS/Knowledge` | Reuse | Reuse | Fresh |
| `Re-analyze All` | Fresh | Fresh | Fresh |

Direct KCS results have a workflow-specific Knowledge fingerprint so they do not accidentally reuse a retrospective-derived artifact with incompatible intent.

---

# Concurrency

- **2** retrospective/direct-case workers maximum
- **1** independent Knowledge worker

Knowledge generation does not block the next retrospective worker from starting.

---

# Storage

Default: **Browser Downloads**.

Optional: **Choose Folder** using Chrome's File System Access API when available and allowed.

Folder permission is browser-controlled and session-only. Storage failure does not change the technical Audit/Knowledge result.

---

# Human responsibility

XSUP Auditor & KCS Generator is a decision-support tool.

A qualified reviewer remains responsible for:

- confirming the correct case/product
- validating important technical claims
- deciding whether Support-owned fields should change
- resolving Knowledge review markers
- performing the normal publication/editorial review
- storing/sharing generated case information only through approved channels

---

# Repository layout

```text
README.md
DISCLAIMER.md
SUPPORT.md
src/
  xsup-auditor.js
dist/
  XSUP_Auditor_Bookmark_Installer.html
  XSUP_Auditor_JS.txt
docs/
  USER_GUIDE.md
  FAQ.md
  PRODUCT_POLICIES.md
  KNOWLEDGE_QUALITY.md
  TECHNICAL_GUIDE.md
  VALIDATION_CHECKLIST.md
  TROUBLESHOOTING.md
  SECURITY_AND_USAGE.md
  kcs-quality-overview.png
```

---

# Documentation

## Users

- [User Guide](docs/USER_GUIDE.md)
- [FAQ](docs/FAQ.md)
- [Product Policies](docs/PRODUCT_POLICIES.md)
- [Knowledge Quality](docs/KNOWLEDGE_QUALITY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Governance / usage

- [Security & Usage](docs/SECURITY_AND_USAGE.md)
- [Disclaimer](DISCLAIMER.md)
- [Support](SUPPORT.md)

## Maintainers

- [Technical Guide](docs/TECHNICAL_GUIDE.md)
- [Validation Checklist](docs/VALIDATION_CHECKLIST.md)
