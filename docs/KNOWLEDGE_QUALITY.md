# Knowledge Quality

This document describes the Knowledge quality workflow in **XSUP Auditor & KCS Generator v3** (`github-v3`).

It applies to both:

- Knowledge generated after **Run XSUP Retrospective**; and
- **Direct Generate KCS**.

The tool does not treat a single AI response as publication-ready Knowledge. It combines generation, an independent quality pass, deterministic checks in JavaScript, visible claim-level review markers, source-governance checks, and final human review.

> **Goal:** produce a useful reusable draft quickly, make uncertainty and source limitations visible, and keep the publication decision with the engineer/reviewer.

The workflow can produce:

- KCS Drafts;
- KCS Update Proposals;
- Admin / Tech Guide Update Proposals;
- TAC Runbooks; and
- Known Issue / Release Note Drafts.

It does **not** automatically publish Knowledge or modify official documentation.

---

# Quality workflow at a glance

A fresh Knowledge artifact normally follows this path:

```text
Retrospective basis OR Direct KCS basis
+ current TACO analysis
+ original Jira/SFDC evidence
+ relevant Knowledge/documentation sources
                │
                ▼
      1. Generate enriched draft
                │
                ▼
      2. Independent quality review
                │
                ▼
      3. Deterministic code checks
                │
        ┌───────┴────────┐
        │                │
     passes        repairable defect
        │                │
        │                ▼
        │       4. One repair pass
        │                │
        └────────┬───────┘
                 ▼
      5. Final readiness +
         REVIEW/BLOCKER rendering
                 │
                 ▼
            Human review
                 │
                 ▼
       Normal publication process
```

| Stage | Purpose |
|---|---|
| **1. Draft generation** | Create a reusable artifact from the available case, product, source, and Knowledge evidence |
| **2. Independent quality review** | Challenge and finalize the draft for accuracy, usefulness, evidence support, source freshness, scope, conflicts, and publication safety |
| **3. Deterministic checks** | Verify structure, source mappings, metadata hygiene, placeholders, route integrity, Markdown integrity, and readiness consistency without trusting the AI to self-certify |
| **4. Repair** | Run one evidence-bounded repair prompt only when the quality result contains a usable artifact but deterministic validation finds repairable defects |
| **5. Human-facing review** | Show the validated readiness plus inline `REVIEW`, `REVIEW CURRENTNESS`, or `BLOCKER` guidance beside the affected claim/source |
| **6. Human review** | Engineer/SME/Knowledge owner resolves required items and uses the normal approved publication process |

---

# How many AI prompts are used?

For a **fresh** Knowledge artifact, the normal substantive workflow uses two Case Chat prompts:

1. enriched draft generation; and
2. independent quality review/finalization.

A third substantive prompt is used only when the final quality response contains a usable artifact but fails a repairable deterministic quality/structure check.

| Situation | Substantive Knowledge prompts |
|---|---:|
| Fresh Knowledge artifact, normal path | **2** |
| Fresh artifact requiring the one repair pass | **3** |
| Current enriched draft reused, quality still required | **1** |
| Compatible final quality-reviewed artifact reused | **0** |

Each Case Chat stage also has **bounded transport/generation recovery** for transient TACopilot/Case Chat failures. The tool first attempts to recover an already accepted prompt from Case Chat history where possible, then may retry the same stage once. These transient retries are reliability handling; they are not additional quality-review layers.

The Retrospective Audit prompt is separate from the Knowledge prompt count above.

In **Direct Generate KCS**, the retrospective Audit is intentionally skipped.

---

# Before generation — how the Knowledge destination is chosen

There are two entry paths with different routing rules.

## Retrospective mode — the Audit owns the Knowledge destination

During **Run XSUP Retrospective**, the validated Audit selects the primary Knowledge action from the evidence available to that investigation.

Supported actions include:

| Knowledge action | Artifact |
|---|---|
| `CREATE KCS` | KCS Draft |
| `UPDATE EXISTING KCS` | KCS Update Proposal |
| `UPDATE ADMIN/TECH GUIDE` | Admin / Tech Guide Update Proposal |
| `CREATE/UPDATE RUNBOOK` | Runbook Draft |
| `KNOWN ISSUE/RELEASE NOTE` | Known Issue / Release Note Draft |
| `NO KNOWLEDGE ACTION` | No artifact |
| `UNDETERMINED` | No automatic artifact |

The Audit is the authoritative routing decision for normal retrospective generation.

A downstream Knowledge stage may discover overlap or a routing concern and mark it for review, but it must **not silently change an Audit-selected `CREATE KCS` into `UPDATE EXISTING KCS`**, or vice versa.

## Direct Generate KCS — KCS-family routing only

When the reviewer selects **Generate KCS**, the workflow deliberately stays within the KCS family and skips the retrospective Support-owned field review.

It begins with:

```text
Primary Knowledge Action = CREATE KCS
Artifact Type = KCS Draft
```

The draft-generation stage then inspects actual available Salesforce KCS content.

If a specific existing Salesforce KCS materially covers the same issue and can be extended, Direct Generate KCS may reconcile to:

```text
Primary Knowledge Action = UPDATE EXISTING KCS
Artifact Type = KCS Update Proposal
```

Title or keyword similarity alone is not enough. The comparison is expected to consider the actual content, including the symptom/task, explanation/cause, checks/procedure, resolution/workaround/action, and verification.

If candidate KCS content cannot be inspected safely, the workflow should not guess an update target.

If the reviewer explicitly chooses **Create New KCS Anyway**, the tool preserves the new KCS route and keeps the related existing Salesforce KCS visible as related Knowledge for duplicate/scope review.

---

# Step 1 — generate an enriched reusable draft

The first Knowledge prompt is not a simple case summary.

It asks Case Chat to create a reusable artifact and to enrich it from source material actually available to the current investigation, such as:

- official/maintained product documentation;
- Salesforce Knowledge/KCS;
- internal Confluence or runbook material;
- original Jira/Engineering evidence;
- original Salesforce case evidence;
- validated similar cases; and
- known-issue/release-note material.

## Source discipline

Material technical claims should use stable source IDs such as `[R1]`, `[R2]`, and so on.

The final **Source References** section maps those IDs to the underlying source and, when available, includes:

- source identity/title;
- direct link;
- provenance/source type;
- freshness/current-applicability information;
- what the source supports; and
- a concise source-derived evidence summary.

TACO and Case Chat are analysis/synthesis mechanisms. They are **not treated as authoritative underlying evidence by themselves** for a reusable product claim.

Generated XSUP Auditor/TACopilot/Case Chat content must not become the sole authority for a later Knowledge claim.

## Generalization and safety

The draft is instructed to:

- generalize the reusable technical pattern;
- avoid unnecessary customer-specific names, tenant identifiers, hostnames, and one-off data;
- avoid inventing commands, APIs, UI paths, versions, timings, configuration values, causes, fixes, architecture behavior, or remediation;
- separate public/reusable guidance from deeper TAC-only implementation context; and
- keep the output framed as a **draft/proposal for human review**, not an already approved article.

## Adaptive KCS structure

A new KCS is not forced into one rigid troubleshooting template.

The current v3 quality contract requires the KCS to include at least these functional roles:

- **Introduction / Overview**;
- an issue/symptom/task context section;
- a substantive explanation/action/procedure section; and
- **Source References**.

Depending on the problem, useful sections may include:

- At a Glance;
- Symptoms / Issue;
- Applies To / Environment;
- Background / What This Means;
- Cause / Explanation;
- Prerequisites / Before You Begin;
- Diagnosis / How to Check;
- Resolution / Workaround / Recommended Action;
- Verification / Expected Outcome;
- If the Issue Persists / Additional Troubleshooting;
- Expected Behavior / Limitations / Important Notes;
- Related Knowledge / Documentation;
- Search Keywords; and
- Internal Notes — TAC Only.

The intent is to fit the structure to the actual issue rather than manufacture empty sections.

---

# Step 2 — independent quality review and finalization

A second, separate Case Chat prompt reviews the enriched draft and produces the final candidate artifact.

The quality reviewer is instructed to act as an independent Knowledge editor/reviewer, not merely to approve the first response.

The review covers areas including:

| Area | What is checked |
|---|---|
| **Accuracy** | Product behavior, commands, APIs, timings, scope, causes, resolutions, and other operational claims must be supported |
| **Usefulness** | The intended reader should understand the issue and know what to check or do |
| **Completeness** | The artifact should contain the functional sections required for its artifact type |
| **Actionability** | Checks and procedures should explain what to do, why it matters, how to interpret the result, and the next action where supported |
| **Generalization** | Case-specific observations should not be turned into universal product behavior without evidence |
| **Technical depth** | Exact operational detail is valuable only when supported and appropriately scoped |
| **Source quality** | Prefer authoritative/maintained documentation and directly relevant original Engineering/case evidence |
| **Consistency** | Body text, review items, source mappings, and readiness must agree |
| **Readability** | Clear headings, lists, tables, code blocks, and minimal duplication |
| **Discoverability** | Searchable title/keywords without originating XSUP/SFDC identifiers |
| **Existing-Knowledge awareness** | Avoid unnecessary duplicate KCS content when a specific existing article can be extended |
| **Audience fit** | Match the language/detail to KCS, Admin Guide, Runbook, Known Issue, etc. |
| **Verification** | Explain how to confirm diagnosis and verify the supported outcome when evidence permits |
| **Publication boundary** | Keep the artifact a draft/proposal; do not present it as already approved or published |
| **Source freshness** | Historical/version-specific evidence must not be assumed to describe current behavior automatically |
| **Conflict handling** | Material disagreements between sources must be surfaced rather than silently resolved by the model |
| **Anti-circularity** | Repeated generated/derivative statements are not independent corroboration |

---

# Source freshness and current applicability

v3 treats source age and source validity as different questions.

An older case, KCS, Confluence page, runbook, or Engineering finding is **not automatically wrong**. However, when it materially supports a reusable technical claim and current applicability cannot be established, the affected claim/source is marked for currentness review.

The rendered Source References can show source states such as:

- **✓ CURRENT / MAINTAINED SOURCE**;
- **⚠ REVIEW CURRENTNESS**;
- **⚠ CASE EVIDENCE · REVIEW CURRENTNESS FOR REUSE**; or
- **✕ BLOCKER SOURCE**.

This allows useful historical evidence to remain visible without silently turning it into a current product guarantee.

---

# Review markers reviewers actually see in v3

v3 does **not** use the older marker vocabulary such as `SME REVIEW`, `ENGINEERING REVIEW`, `INFERENCE`, `SOURCE CHECK`, `SCOPE CHECK`, or `UNSUPPORTED` as the primary rendered inline labels.

The human-facing inline labels are:

| Visible marker | Meaning |
|---|---|
| **⚠ REVIEW** | A material claim/detail needs validation before authoritative reuse/publication |
| **⚠ REVIEW CURRENTNESS** | A material claim relies on a source whose current applicability must be confirmed |
| **✕ BLOCKER** | A material issue must be resolved, supported, rewritten, or removed before publication |

Each rendered review callout is placed beside the affected claim/reference when possible and explains:

- **What to review**;
- **Claim under review**;
- **Review type**;
- **Source(s)**;
- **Why** the issue matters; and
- **Required action**.

## Structured review types

The quality contract uses the following semantic review categories:

| Review type | Typical use |
|---|---|
| `UI_NAVIGATION` | Exact UI labels/navigation paths |
| `CLI_COMMAND` | Exact command syntax/platform applicability |
| `API_CONTRACT` | API route/version/prerequisite/request-response contract |
| `TIMING_SLA` | Exact timing, cadence, latency, or SLA-like wording |
| `FILE_LOG_PATH` | Exact file name, log name, or filesystem path |
| `SOURCE_CURRENTNESS` | Historical/version-specific evidence requiring current applicability validation |
| `MISSING_SOURCE_OR_LINK` | Missing direct source identity/link needed for efficient review |
| `DERIVATIVE_AI_EVIDENCE` | Generated/AI/TACO synthesis being used where original authority is required |
| `INTERNAL_ARCHITECTURE` | Backend/implementation detail requiring current Engineering/SME validation |
| `DOCUMENTATION_PLACEMENT` | Maintained documentation owner/page/section needs confirmation |
| `CITATION_GAP` | Material claim lacks the exact supporting `[R#]` mapping |
| `OTHER_MATERIAL_VALIDATION` | Other material validation/conflict/scope issue |

The renderer can infer/correct the semantic review type from the claim when needed so that, for example, an exact timing statement is treated as `TIMING_SLA` rather than mislabeled as an API or UI issue.

---

# Step 3 — deterministic JavaScript checks

After the independent quality response, the Auditor runs local deterministic validation.

These checks do not depend on the AI declaring its own result correct.

## Structural checks

Examples include:

- minimum usable artifact size;
- required functional sections for the selected artifact type;
- balanced Markdown code fences;
- no unresolved TODO/TBD/internal placeholders;
- no visible internal reuse metadata;
- no quality-control preamble leaking into the final article;
- no raw internal provenance tokens such as `[inference]` or `[derived analysis]`;
- correct target/context; and
- route integrity.

### KCS-specific structure

For a new KCS, deterministic checks require at least:

- Introduction / Overview;
- issue/symptom/task context;
- a substantive explanation/action/procedure role; and
- Source References.

For other artifact types, v3 applies artifact-specific required sections.

For a KCS Update Proposal, the update target must be specifically identified, and the proposal must include a complete merged standalone article draft rather than only a change summary.

## Source-reference checks

The final artifact must contain **Source References** that identify underlying sources.

The code checks canonical `[R#]` mappings and flags missing mappings when the body cites a source ID without a matching Source References entry.

A Source References section containing only `TACO` or `Case Chat` does not satisfy the underlying-source requirement.

## Reusable-content hygiene

The checks also prevent items such as:

- originating XSUP/SFDC identifiers in reusable Search Keywords;
- case/RCA-report voice such as “according to the investigation” in a reusable KCS;
- authoring/process sections that belong outside the reusable KCS; and
- internal tool metadata appearing in the user-facing article.

## Route checks

In retrospective mode, deterministic validation enforces the Audit-selected route.

If downstream generation tries to replace an Audit-selected CREATE KCS with an Existing KCS Update Proposal, the result is rejected as a routing violation rather than silently accepted.

Direct Generate KCS is the intentional exception and may reconcile CREATE to UPDATE after actual KCS content inspection.

---

# Step 4 — one controlled repair pass

If the independent quality response contains a usable artifact but fails a repairable deterministic quality/structure check, v3 may run **one** repair prompt.

The repair is evidence-bounded.

It is instructed to:

- preserve supported technical content and authoritative `[R#]` mappings;
- repair structural/Markdown/provenance defects where possible;
- remove or rewrite unsupported material rather than fabricate evidence; and
- emit an actionable `BLOCKER` when a material claim cannot be safely repaired from the available evidence.

The repair prompt must **not invent** new:

- commands;
- paths;
- APIs;
- UI navigation;
- versions;
- timing values;
- configuration values;
- causes; or
- fixes.

After the repair response, the deterministic checks run again.

There is only **one automated quality repair pass**.

---

# Readiness, publication review, and execution status are different

v3 deliberately keeps three concepts separate.

## 1. Artifact Readiness

The internal/final quality readiness is:

### `READY`

A useful and materially complete draft exists and the quality workflow did not identify a material unresolved validation item.

`READY` does **not** mean automatically approved or published.

### `DRAFTABLE`

A useful draft exists and can be reviewed now, but one or more named material validation items remain.

### `NOT READY`

A usable draft may exist, but the quality gate found a material blocker or could not safely establish a publication-ready artifact.

The draft can still be preserved for human review when there is useful content to retain.

### `NOT APPLICABLE`

No Knowledge artifact is required for that retrospective decision.

## 2. Publication review state

The downloaded Knowledge HTML remains explicitly human-reviewed even when its Artifact Readiness is `READY`.

The document therefore shows a validation notice and uses human-facing publication markers such as:

- `⚠ REVIEW`; or
- `✕ BLOCKER`.

This is intentional. `READY` means the automated workflow did not identify a material unresolved validation item; it does **not** bypass the normal human publication process.

## 3. Execution status

Execution status answers a different question: did the workflow produce/preserve a usable artifact?

For example:

```text
Execution: COMPLETED
Artifact Readiness: DRAFTABLE
Publication Review: REVIEW
```

This means the tool completed successfully and produced a usable draft, but human validation remains.

Another valid result is:

```text
Execution: COMPLETED
Artifact Readiness: NOT READY
Publication Review: BLOCKER
```

This means a usable draft was preserved, but the artifact has a material publication blocker.

`FAILED` is reserved for cases where the requested Knowledge artifact cannot be produced or preserved as a usable result.

---

# Internal quality status

The normal independent quality response uses:

```text
PASS
PASS_WITH_VALIDATION
FAIL
```

Typical interpretation:

| Internal quality result | Typical readiness |
|---|---|
| `PASS` | `READY`, unless deterministic checks make the result more conservative |
| `PASS_WITH_VALIDATION` | `DRAFTABLE` |
| `FAIL` | `NOT READY` when a usable draft can be preserved; otherwise the artifact may fail |

The deterministic gate can always make readiness more conservative than the AI-requested status.

## When independent quality validation is temporarily unavailable

If the independent quality Case Chat is temporarily unavailable but a usable draft already exists, v3 preserves the draft rather than discarding it.

In that fallback path the tool can record:

```text
Knowledge Quality Status: VALIDATION UNAVAILABLE
Artifact Readiness: DRAFTABLE
Publication Review: REVIEW
```

The rendered artifact explicitly tells the reviewer to complete the independent quality validation or perform/document manual SME review before treating the draft as publication-ready.

A transient quality-service failure is therefore **not treated as proof that the article content is technically wrong**.

---

# What happens when evidence is genuinely weak?

The workflow must not “repair” weak evidence by rewriting a claim more confidently.

If a material claim cannot be established safely, the expected options are to:

- find stronger evidence;
- mark the claim/source for review;
- narrow/generalize the wording;
- move appropriate internal implementation context to TAC-only notes;
- remove the unsupported claim; or
- preserve the artifact with a `BLOCKER` / `NOT READY` state.

The quality process is designed to make uncertainty explicit, not to hide it.

---

# Source conflicts and anti-circularity

v3 requires material source disagreements to be surfaced rather than silently resolved by the model.

A conflict can involve, for example:

- timing;
- version/platform scope;
- commands;
- API behavior;
- UI paths;
- cause/meaning;
- workaround or limitation;
- expected behavior;
- architecture; or
- operational interpretation.

When relevant, a review item can include a structured conflict description and require resolution against current maintained documentation or current SME/Engineering confirmation.

Repeated statements across cases, KCS articles, Confluence pages, generated drafts, or AI summaries are not automatically independent corroboration. The workflow is instructed to trace claims back to the underlying evidence.

---

# Internal Notes — TAC Only

Knowledge artifacts can preserve useful TAC/Engineering-only context separately from reusable/public-facing guidance.

Internal Notes may include sourced information such as:

- internal parameters/configuration names;
- backend component behavior;
- worker/chunk/queue details;
- internal database/API observations;
- diagnostic interpretation;
- tuning attempts and observed effects;
- escalation boundaries; and
- other Engineering findings useful to future TAC/SME investigation.

This deeper internal context is not automatically a current public product guarantee.

When its current applicability is material but unconfirmed, the corresponding claim/source should still be marked for review.

---

# Smart reuse

The Knowledge workflow avoids unnecessary repeat Case Chat generation.

If a compatible, source-current final quality-reviewed artifact already exists and its reuse fingerprint still matches the current inputs, it can be reused without another Knowledge prompt.

If only a compatible enriched draft is reusable, the tool can reuse that draft and run the independent quality stage.

Reuse identity includes the relevant workflow intent so incompatible artifacts are not silently reused across different modes/routes.

When a reviewer deliberately wants a fresh build, use **Regenerate KCS / Regenerate Knowledge**.

In retrospective mode, regeneration uses the retained current TACO/evidence basis and completed Audit route unless a separate Audit re-run is requested.

In Direct Generate KCS mode, regeneration uses the current Direct-KCS basis without creating a retrospective Support-owned field review.

---

# Reviewer checklist

For most generated Knowledge artifacts, start with these questions:

| Question | Where to look |
|---|---|
| **What is this article about?** | At a Glance and Introduction / Overview |
| **What is the Artifact Readiness?** | Live Dashboard / Knowledge status |
| **Is publication review required?** | Top validation notice and `REVIEW` / `BLOCKER` chip |
| **Which exact claim needs attention?** | Inline highlighted claim and numbered review marker |
| **What type of validation is needed?** | `Review type` in the inline callout |
| **Why does it matter?** | `Why` in the callout |
| **What must I do to clear it?** | `Required action` |
| **Which evidence supports it?** | `[R#]` links and Source References |
| **Is the source current?** | Source-state chip and Freshness / applicability text |

---

# Human review remains mandatory

XSUP Auditor produces **drafts and proposals**.

It does not automatically:

- publish a KCS;
- modify official documentation;
- declare a Known Issue;
- change an XSUP/Jira field; or
- replace TAC, SME, Engineering, Knowledge-owner, or documentation-owner judgment.

Even an artifact whose automated readiness is `READY` still requires the normal human review/publication process.

---

# Management / non-technical summary

The Knowledge quality model can be summarized as:

> **Generate a reusable draft, independently review it, check it deterministically, repair safe defects once, attach review guidance directly to material claims/sources, and keep final publication under human control.**

Key design principles:

- **not one AI answer** — generation and independent quality finalization are separate stages;
- **evidence-driven** — reusable technical claims should trace to underlying sources;
- **source-aware** — historical evidence is retained when useful but current applicability is reviewed explicitly;
- **anti-circular** — generated/derivative content is not allowed to become its own authority;
- **deterministic guardrails** — JavaScript checks structure, routing, metadata, source mappings, placeholders, and consistency;
- **claim-level review** — `REVIEW`, `REVIEW CURRENTNESS`, and `BLOCKER` callouts are placed beside affected claims/references;
- **useful drafts are preserved** — review/blocker states do not automatically discard a usable artifact; and
- **human-controlled** — the tool assists Knowledge creation but does not publish it.
