# Technical Guide

This document describes the architecture and maintenance contracts of XSUP Auditor & KCS Generator.

**Release identity:** this is the initial team release. The tested runtime intentionally retains internal engineering identifiers `VERSION = 3` and `BUILD_ID = github-v3` for traceability.

---

# Architecture

```text
Common Browser Engine
├─ XSUP → SFDC resolution
├─ Original Jira/SFDC evidence extraction
├─ Product detection / confirmation
├─ TACO freshness
├─ Audit prompt + Case Chat
├─ Smart reuse
├─ Knowledge decision
├─ Knowledge enrichment
├─ Independent Knowledge quality review
├─ Provenance resolution
├─ One automatic repair pass
├─ Deterministic gate
├─ Dashboard / status
├─ Reports / storage
└─ Save / Restore Session

Product Profiles
├─ XDR/XSIAM
├─ XSOAR
└─ Cortex Cloud
```

Keep one shared Snippet.

Do not fork product implementations unless the architecture is intentionally redesigned.

---

# Runtime model

The self-contained bookmarklet/DevTools Snippet runs in the reviewer's current authenticated TACO browser session.

Supported launch scope is the exact origin `https://taco.paloaltonetworks.com:3009` with pathname `/taco` or any descendant under `/taco/`. TACO Pilot and individual case pages are both valid. Other origins, ports and lookalike path prefixes are rejected.

No embedded service credential is required.

---

# Concurrency contract

Current design:

```text
XSUP/TACO workers       = 2 default; selectable 2 / 3 / 5 / 10
Knowledge workers       = 2
Case Chat generation max = 2 shared across Audit + Knowledge
```

The XSUP/TACO selector controls independent evidence/TACO throughput. Mutating Case Chat generations are separately capped at 2 to reduce transient failures and duplicate submissions.

---

# Evidence classification

TACopilot case comments are classified from DOM metadata.

Conceptually:

```text
Jira ticket event
Jira/Engineering comment
SFDC internal
SFDC TAC public
SFDC customer public
```

Structured fields are also extracted from page tables/definition/data-label structures.

---

# TACO freshness

Original case evidence is collected before the freshness decision.

High-level state machine:

```text
No TACO
  → START

Usable completed TACO
  ├─ newer Jira/SFDC evidence → REFRESH
  └─ otherwise               → REUSE

No usable final + genuinely running
  → WAIT

Failed / incomplete / no usable final
  → REFRESH
```

Old age alone is not a refresh trigger.

---

# Product detection

Structured evidence is weighted more heavily than incidental text.

High confidence continues automatically.

Ambiguous/low confidence pauses that XSUP.

Manual product selection is supported.

Product selection is part of Audit compatibility.

---

# Audit design

Audit prompts are field-centric.

Core provenance rules:

- TACO = derived analysis
- Jira/SFDC = original evidence
- TACO-generated Customer Response is not proof of sent communication
- absence from selected evidence is not proof of non-existence
- insufficient evidence → UNDETERMINED
- no subjective engineer scoring
- only applicable product fields are reviewed

---

# Smart Case Chat reuse

The Auditor checks Case Chat history before generating new work.

Reuse can consider:

- XSUP/SFDC identity
- selected product
- TACO source
- Jira/SFDC source boundary
- Audit/Knowledge type
- reuse metadata/fingerprint
- structural compatibility

A local UI/prompt/code change alone should not automatically force reruns of otherwise-current source results.

Matching active Case Chat should be waited on rather than duplicated.

---

# Manual regeneration contracts

## Regenerate Audit

Must:

- keep current TACO/evidence
- generate fresh Audit
- not force TACO
- not automatically regenerate Knowledge

Existing Knowledge can become outdated.

## Regenerate Knowledge

Must:

- keep TACO
- keep current completed Audit
- regenerate Knowledge pipeline only

## Re-analyze All

Must force:

```text
TACO → Audit → Knowledge
```

Keep these controls separate.

---

# Knowledge workflow

## Stage 1 — Enrichment

Build or reuse a draft based on the Audit and relevant source material available to the investigation.

## Stage 2 — Independent Quality Review

A separate Case Chat receives the Audit + enriched draft + quality rubric.

It produces:

```text
QUALITY_STATUS
VALIDATED_ARTIFACT_READINESS
QUALITY_SUMMARY
MATERIAL_VALIDATION_ITEMS

--- FINAL ARTIFACT ---
...
```

## Stage 3 — Provenance Resolution

The quality prompt explicitly handles:

```text
[inference]
[from case data]
[derived analysis]
```

Rules:

1. do not simply delete the marker
2. source/rewrite when underlying evidence supports the claim
3. convert material uncertainty into structured inline REVIEW/BLOCKER items tied to the affected claim/reference
4. remove unsafe/unnecessary unsupported claims
5. never convert inference into fact by deleting a marker

## Stage 4 — Deterministic gate

The JavaScript validates the actual final artifact.

Checks include:

- minimum useful content
- no internal reuse metadata
- no unresolved internal token
- no raw provenance marker
- no editorial placeholder
- balanced code fences
- artifact-specific required headings
- correct target
- no XSUP/SFDC IDs in KCS Search Keywords
- Source References identifies underlying sources
- material validation/readiness consistency

## Stage 5 — Automatic repair

If the first quality result is not a substantive AI FAIL and deterministic checks identify repairable issues, the code can submit one repair request.

Repair prompt receives:

- authoritative Audit
- enriched draft
- previous quality answer
- exact deterministic issues

Repair must not broaden the factual basis.

After repair:

```text
deterministic checks run again
```

No indefinite loop.

---

# Why one repair pass?

The design goal is:

```text
strict gate
+
recover from mechanical/generic quality defects
```

not:

```text
keep asking AI until it eventually says PASS
```

A single repair protects against endless loops and excessive Case Chat usage.

---

# Knowledge readiness

Final:

```text
READY
DRAFTABLE
NOT READY
```

Material validation items must prevent READY.

Blocking deterministic defects force NOT READY.

---

# Artifact-specific required headings

## KCS Draft

- Symptoms / Error
- Cause
- How to Check
- How to Confirm
- Resolution / Fix
- Source References

## KCS Update

- Existing Knowledge Reference
- Gap Identified
- Proposed Additions / Changes
- Source References

## Doc Update

- Target Documentation
- Documentation Gap
- Proposed Documentation Text
- Source References

## Runbook

- Trigger / When to Use
- Objective
- Investigation Workflow
- Decision Points
- Source References

## Known Issue

- Issue
- Symptoms
- Cause / Limitation
- Proposed Release Note / Known Issue Text
- Source References

---

# HTML safety

Do not render raw model HTML.

Use escaped/safe Markdown conversion.

Only allow safe HTTP/HTTPS links.

---

# Storage / delivery contract

Default browser download.

Optional explicit `showDirectoryPicker()` folder.

Storage failure must not change the Audit verdict.

Folder handles remain session-only.

---

# Save / Restore Session

Serializable job state can be exported.

Do not serialize browser folder permission handles.

Running/queued work restores as stopped.

Completed results can be preserved.

---

# Overall status contract

Do not derive overall status only from Audit `job.status`.

Knowledge state must influence final XSUP status.

Examples:

```text
Knowledge checking/generating → active
Knowledge queued              → waiting
Knowledge outdated            → attention
Knowledge failed              → failed
Required Knowledge complete   → complete
```

---

# Security invariants

Do not add:

- embedded credentials
- credential extraction
- direct CSP bypass
- automatic ticket mutation
- automatic Knowledge publication
- unsafe raw model HTML
- silent external telemetry

---

# Maintainer invariants

Preserve:

1. one Snippet/common engine
2. XSUP/TACO workers remain selectable 2/3/5/10; Knowledge workers = 2; shared mutating Case Chat generation cap = 2 unless deliberately redesigned
3. product confirmation on ambiguity
4. source-driven TACO freshness
5. original evidence separate from TACO synthesis
6. RCA Category is not RCA
7. reuse before duplicate Case Chat
8. Regenerate Audit does not force TACO/Knowledge
9. Regenerate Knowledge does not force TACO/Audit
10. Re-analyze All is full refresh
11. overall status includes Knowledge
12. Knowledge quality rules should be generic, not one-case patches
13. provenance markers cannot leak to final artifacts
14. never remove `[inference]` while leaving an unsupported claim as fact
15. one repair pass only
16. substantive AI FAIL is not automatically overridden
17. deterministic gate runs after repair
18. normal retrospective Knowledge route remains owned by the validated Audit; downstream CREATE↔UPDATE mutation is rejected
19. Direct Generate KCS is the explicit KCS-family CREATE↔UPDATE reconciliation exception
20. required primary failure cannot be hidden by successful secondary output
21. Audit auto-delivery is initiated before normal retrospective Knowledge starts
22. installer bookmark payload and canonical standalone source must be byte-identical for a release
23. final Knowledge remains a draft for human review

---

# Current distribution model

The canonical source is:

```text
src/xsup-auditor.js
```

Supported user launch methods are:

1. self-contained bookmark installed from `dist/XSUP_Auditor_Bookmark_Installer.html`;
2. Chrome DevTools Snippet using `src/xsup-auditor.js` or `dist/XSUP_Auditor_JS.txt`.

Both run the same source logic inside the authenticated TACopilot page context. No external JavaScript hosting is required for the bookmark distribution.

# Two orchestration modes

## Retrospective mode

```text
XSUP → SFDC → product → TACO/evidence → Retrospective Audit → Knowledge Decision → optional Knowledge pipeline
```

## Direct KCS mode

```text
XSUP or SFDC → product/context → TACO/evidence → inspect existing Salesforce KCS → KCS Draft OR KCS Update Proposal → Quality pipeline
```

Direct KCS skips the retrospective Case Chat and begins with `knowledgeAction = CREATE KCS`, `knowledgeArtifactType = KCS_DRAFT`. During Knowledge generation it may reconcile to `UPDATE EXISTING KCS / KCS_UPDATE` only after actual same-scope Salesforce KCS content comparison. If candidate content is unavailable it must not guess an update target. A reviewer can still force **Create New KCS Anyway**, with the overlapping KCS retained as Related Existing Knowledge.

The parent completion invariant treats either valid KCS-family result as satisfying the one required Direct KCS primary. This exception applies only to `directKnowledgeOnly`; normal retrospective jobs remain strictly Audit-led.

# Knowledge-action classification contract

Artifact classification exists in the Retrospective Audit prompt, not as a standalone JavaScript keyword classifier.

The prompt selection contract is:

| Action | Prompt meaning |
|---|---|
| CREATE KCS | repeatable symptom → check → confirm → resolution/workaround → verify pattern |
| UPDATE EXISTING KCS | relevant existing KCS materially lacks needed resolution content |
| UPDATE ADMIN/TECH GUIDE | official behavior/configuration/expectation needs administrator/customer documentation clarity |
| CREATE/UPDATE RUNBOOK | reusable value is an internal investigation/evidence workflow rather than a complete resolution article |
| KNOWN ISSUE/RELEASE NOTE | version-specific defect/limitation belongs in issue/release communication |
| NO KNOWLEDGE ACTION | no material reusable gap |
| UNDETERMINED | insufficient evidence to choose safely |

JavaScript parses the returned `Primary Knowledge Action` and maps it deterministically to `KCS_DRAFT`, `KCS_UPDATE`, `DOC_UPDATE`, `RUNBOOK`, or `KNOWN_ISSUE`.

Direct KCS bypasses Admin Guide/Runbook/Known Issue classification and remains KCS-family-only. It starts as `CREATE KCS`, but may reconcile CREATE↔UPDATE after inspecting actual existing Salesforce KCS content.

# Direct-KCS quality safeguards

The direct KCS path uses the same Knowledge quality engine as retrospective-generated Knowledge.

Current safeguards include:

- exact commands, APIs, UI paths, timing values, version/scope statements, architecture details and configuration treated as material claims that require source/review support;
- an independent quality prompt after draft generation;
- structured quality output using `PASS`, `PASS_WITH_VALIDATION`, or `FAIL`;
- formal inline `REVIEW` / `BLOCKER` items with typed categories such as `TIMING_SLA`, `SOURCE_CURRENTNESS`, `API_CONTRACT`, and `CITATION_GAP`;
- deterministic checks for structure, At a Glance, source/reference integrity, internal provenance leakage, placeholders, review-item consistency and readiness;
- one evidence-bounded repair pass for safe, repairable quality/structure issues;
- source freshness/applicability and anti-circularity checks so generated/TACO/Case Chat synthesis is not accepted as sole authority for a material reusable claim;
- `VALIDATION UNAVAILABLE` as the conservative internal fallback when independent quality execution cannot complete but a usable draft is preserved;
- `NOT READY` remains a reviewable/downloadable artifact state; `failed` is reserved for cases where no usable artifact can be preserved.

Transient Case Chat request failures may be retried or recovered by the shared reliability layer. That transport behavior is not documented as a separate Knowledge-quality prompt or quality verdict.
