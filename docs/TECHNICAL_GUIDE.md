# Technical Guide

This document describes the architecture and maintenance contracts of XSUP Retrospective Auditor v1.

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

The Snippet runs on TACopilot and uses the reviewer's current authenticated browser session.

No embedded service credential is required.

---

# Concurrency contract

Current design:

```text
Audit workers     = 2
Knowledge workers = 1
```

Knowledge runs independently so Audit throughput can continue.

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
3. move uncertain material into Validation Items when useful
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

# Storage contract

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
2. 2 Audit workers + 1 Knowledge worker unless deliberately redesigned
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
18. final Knowledge remains a draft for human review
