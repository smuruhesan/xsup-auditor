# Knowledge Quality

This document explains how XSUP Retrospective Auditor decides whether a generated KCS, documentation update, runbook or known-issue draft is actually good enough to keep.

The important principle is:

> **We do not trust a Knowledge artifact only because an AI model says it is good.**

The workflow combines AI review, provenance handling, deterministic JavaScript checks and human review.

---

# The complete Knowledge flow

```text
Retrospective Audit
        ↓
Knowledge Decision
        ↓
Knowledge Enrichment + Draft
        ↓
Independent AI Quality Review
        ↓
Provenance Resolution
        ↓
Deterministic Safety / Structure Checks
        ↓
If repairable issue remains:
ONE automatic repair pass
        ↓
Deterministic checks again
        ↓
READY / DRAFTABLE / NOT READY
        ↓
Human review before publication
```

This is intentionally a layered design.

---

# Why do we need several layers?

A well-written article can still contain:

- an unsupported technical claim
- an inferred product behavior presented as fact
- an incorrect UI path
- a guessed command
- an outdated version reference
- an internal `[inference]` marker
- an unrelated source dump
- a missing verification step
- case-specific details that should have been generalized

So the tool separates:

```text
"Looks good"
from
"Is supportable, reusable and safe"
```

---

# Stage 1 — Knowledge decision

The Retrospective Audit first decides whether reusable Knowledge is needed.

Possible primary actions include:

- CREATE KCS
- UPDATE EXISTING KCS
- UPDATE ADMIN/TECH GUIDE
- CREATE/UPDATE RUNBOOK
- KNOWN ISSUE / RELEASE NOTE
- NO KNOWLEDGE ACTION
- UNDETERMINED

The decision also provides an initial Artifact Readiness estimate.

That is only the **initial** readiness.

Final readiness is decided later by the quality pipeline.

---

# Stage 2 — Knowledge Enrichment

The first Knowledge Case Chat creates a reusable draft.

Its job is not simply to copy the retrospective.

It should turn a case-specific technical finding into useful future-facing Knowledge.

When relevant source material is actually available to the Case Chat/TACO investigation, the draft can use:

- official product documentation
- existing KCS/internal Knowledge
- Confluence/Admin/Tech Guides
- Jira/Engineering evidence
- validated similar cases
- known-issue/release material

## Important source rule

TACO and Case Chat are the **synthesis mechanism**.

They are not automatically the underlying source.

Prefer the real source:

```text
Official documentation
Engineering Jira
Existing KCS
SFDC case evidence
Admin/Tech Guide
Confluence
Known Issue / Release source
```

Do not claim a source was searched/read unless it was actually available to the investigation.

---

# Stage 3 — Independent AI Quality Review

A separate Case Chat acts as the Knowledge editor/reviewer.

It receives:

- the authoritative Retrospective Audit
- the enriched Knowledge draft
- the common quality rubric
- the artifact-specific rubric

It must return a **polished final draft**, not merely comments about the draft.

It produces a machine-readable quality envelope plus the final artifact.

Conceptually:

```text
QUALITY_STATUS
VALIDATED_ARTIFACT_READINESS
QUALITY_SUMMARY
MATERIAL_VALIDATION_ITEMS

--- FINAL ARTIFACT ---
[polished Knowledge draft]
```

The quality envelope is used by the code.

It is not intended to appear as the final Knowledge article itself.

---

# What the AI quality reviewer checks

## 1. Accuracy

Questions:

- Are technical claims actually supported?
- Is inference clearly separated from confirmed fact?
- Are cause, behavior, limitation and resolution stated correctly?
- Are references relevant to the claim?

The goal is not to make the article sound certain.

The goal is to make the article **as certain as the evidence allows**.

---

## 2. Usefulness

Would another TAC engineer be able to use this article?

A useful article should help the reader:

- recognize the symptom
- understand what it means
- narrow the cause
- confirm the diagnosis
- act safely
- verify the result

An article that merely restates the case is not enough.

---

## 3. Completeness

The content should include the sections needed for the artifact's purpose.

Do not invent content just to fill headings.

A missing unsupported section is better than a fabricated one, but a useful artifact should still be materially complete.

---

## 4. Actionability

Troubleshooting should be practical.

Good:

```text
Check X.
If X shows Y, it supports Z.
Then perform A.
Verify by B.
```

Weak:

```text
Investigate further.
Check logs.
Escalate if needed.
```

Escalation should not be the primary "resolution" of a reusable KCS when a useful diagnostic or resolution pattern can be documented.

---

## 5. Generalization

The Knowledge artifact should describe the reusable failure pattern.

Remove unnecessary:

- customer names
- tenant IDs
- hostnames
- one-off timestamps
- engineer names
- exact case narrative

Keep case-specific information only when it is technically necessary and clearly presented as an example.

---

## 6. Technical depth

Technical detail is valuable when supported.

Examples:

- commands
- API routes
- payloads
- configuration
- UI navigation
- process/service names
- error codes
- architecture behavior
- timings
- version/platform applicability
- remediation steps

Do not add technical detail merely to make the article look sophisticated.

---

## 7. Source quality

Prefer:

1. authoritative product documentation
2. original Engineering evidence
3. approved/relevant Knowledge
4. directly relevant validated case evidence

Avoid citation dumping.

Five directly relevant sources are better than fifty unrelated references.

---

## 8. Consistency

The article body, Validation section and readiness must agree.

For example:

```text
Body:
"Exact API schema requires documentation-owner validation."

Readiness:
READY
```

That is inconsistent when the validation is material.

The correct readiness would normally be:

```text
DRAFTABLE
```

---

## 9. Readability

The article should be easy to scan.

Use:

- clear headings
- short paragraphs
- ordered troubleshooting steps
- bullets
- code blocks
- useful examples

Avoid unnecessary repetition.

---

## 10. Discoverability

The reader should be able to find the article using the symptom/error they see.

Good search material can include:

- error text
- status name
- process name
- symptom
- feature name
- reusable failure pattern

Do not put the originating XSUP or SFDC case number into reusable KCS Search Keywords.

---

## 11. Existing-Knowledge awareness

Before creating duplicate Knowledge, consider whether an existing article already covers the issue.

If existing Knowledge is substantially correct but incomplete:

```text
UPDATE EXISTING KCS
```

may be better than:

```text
CREATE KCS
```

The new proposal should explain the gap and improve the existing content.

---

## 12. Audience fit

Different Knowledge types have different readers.

### KCS

Primary goal:

Help TAC recognize, diagnose, resolve and verify a repeatable Support issue.

### Admin / Tech Guide update

Primary goal:

Explain product behavior, configuration, limitations or expectations clearly for administrators/customers.

### Runbook

Primary goal:

Give TAC a repeatable investigation/evidence workflow with decision points.

### Known Issue / Release Note

Primary goal:

Explain affected scope, symptoms, impact, cause/limitation and workaround/fix status when supported.

---

## 13. Verification

A strong troubleshooting article should answer two different questions:

```text
How do I confirm the diagnosis?
```

and:

```text
How do I verify that the resolution worked?
```

Those are not always the same step.

---

## 14. Publication boundary

The tool produces:

**DRAFT / PROPOSAL**

It must not imply:

- already approved
- already published
- documentation owner approved
- Product confirmed something that is still under validation

Human review remains required.

---

# Extra scrutiny for operational details

These details are high risk because a small mistake can make an otherwise-good article misleading:

- exact command syntax
- API path or request schema
- UI path
- product version
- OS/platform support
- configuration value
- registry/file path
- process/service name
- return/error code
- timing/latency
- backend/architecture behavior
- workaround
- remediation
- release/fix status

The rule is:

```text
Supported by underlying evidence?
        │
   ┌────┴────┐
  YES        NO
   │          │
Include      Is it still useful?
normally       │
          ┌────┴────┐
         YES        NO
          │          │
Validation    Remove it
required
```

Do not turn a plausible idea into a confirmed procedure.

---

# Provenance Resolution

TACO or an intermediate draft can contain internal analytical markers such as:

```text
[inference]
[from case data]
[derived analysis]
```

These can be useful during investigation.

They are **not allowed in the final user-facing Knowledge artifact**.

## The unsafe approach

Suppose the draft says:

```text
Policy recalculation completes within 10 minutes [inference].
```

Simply deleting `[inference]` would create:

```text
Policy recalculation completes within 10 minutes.
```

That is worse.

The article now looks like a confirmed product fact.

## The correct approach

For every statement with an internal provenance marker:

### A. Supported by an underlying source

Rewrite it normally and identify/cite the real underlying source.

```text
Engineering Jira confirms ...
```

### B. Useful, but not sufficiently established

Move the uncertainty into a clear Validation item.

Example:

```text
Exact recalculation timing requires TAC/SME validation.
```

If material, readiness becomes:

```text
DRAFTABLE
```

### C. Unnecessary or unsafe

Remove the unsupported claim.

## Mandatory rule

> **Never convert an inference into a confirmed fact just by removing the marker.**

---

# Deterministic JavaScript checks

After the AI quality reviewer returns the artifact, JavaScript checks it independently.

These checks do not ask the AI whether it thinks it passed.

The code examines the actual final text.

---

## Basic completeness

The artifact must contain enough meaningful content to be useful.

An obviously incomplete artifact is blocked.

---

## Internal metadata leakage

The final artifact must not expose internal reuse metadata such as:

```text
[XSUP-AUDITOR-META]
```

---

## Internal placeholder leakage

The final artifact must not contain unresolved tokens such as:

```text
@@SOME_INTERNAL_TOKEN@@
```

---

## Raw provenance leakage

The final artifact must not contain:

```text
[inference]
[from case data]
[derived analysis]
```

If one remains, the quality pipeline treats it as a real defect.

---

## Editorial placeholder leakage

The final article must not still contain unresolved writing placeholders such as:

```text
[TODO]
[TBD]
[insert ...]
[placeholder ...]
```

---

## Markdown code-fence check

Code fences must be balanced.

For example:

```text
```bash
command
```
```

A missing closing fence can corrupt the rest of the HTML rendering.

---

# Artifact-specific required sections

The deterministic gate checks required sections based on artifact type.

## New KCS Draft

Required:

```text
Symptoms / Error
Cause
How to Check
How to Confirm
Resolution / Fix
Source References
```

The expected reading flow is:

```text
SYMPTOM
  ↓
APPLIES TO
  ↓
CAUSE / WHAT IT MEANS
  ↓
HOW TO CHECK
  ↓
HOW TO CONFIRM
  ↓
RESOLUTION / WORKAROUND
  ↓
HOW TO VERIFY
```

Additional useful sections can include:

```text
Additional Troubleshooting
Expected Behavior / Limitations
Example
Related Knowledge / Documentation
Search Keywords
TAC/SME Validation Items
```

---

## KCS Update Proposal

Required:

```text
Existing Knowledge Reference
Gap Identified
Proposed Additions / Changes
Source References
```

---

## Admin / Tech Guide Update

Required:

```text
Target Documentation
Documentation Gap
Proposed Documentation Text
Source References
```

---

## Runbook

Required:

```text
Trigger / When to Use
Objective
Investigation Workflow
Decision Points
Source References
```

---

## Known Issue / Release Note

Required:

```text
Issue
Symptoms
Cause / Limitation
Proposed Release Note / Known Issue Text
Source References
```

---

# Target check

If the article includes a `Generated From` field, it must match the current XSUP.

This prevents accidentally accepting an artifact associated with a different ticket.

---

# Search Keyword checks

For reusable KCS Search Keywords, the code rejects:

- originating XSUP ID
- originating SFDC case ID

Why?

Because future engineers should find the KCS using:

```text
symptom
error
feature
process
status
failure pattern
```

not by already knowing the historical ticket number.

---

# Source References checks

The final artifact needs underlying supporting references.

The gate rejects cases where the Source References section is missing/empty.

It also rejects a Source References section that simply says:

```text
TACO
```

or:

```text
Case Chat
```

Those are analysis mechanisms.

The article should identify the underlying source whenever available.

---

# Readiness consistency

The system has two readiness concepts.

## Initial Readiness

Produced during the Retrospective Audit.

This answers:

> Do we appear to have enough evidence to create useful Knowledge?

## Validated Readiness

Produced after Knowledge Quality Review and deterministic checks.

This is the final Knowledge status.

---

# READY

Use when:

- draft is useful
- materially complete
- important claims are supported
- no material validation item remains
- deterministic gate passes

It still requires normal human review before publication.

---

# DRAFTABLE

Use when:

- draft is useful now
- one or more named material validation items remain

Example:

```text
The architecture explanation is supported,
but exact console path and API schema still need documentation-owner validation.
```

That should normally be:

```text
DRAFTABLE
```

not failed, provided the unsupported details are clearly separated and the rest of the artifact is safe/useful.

---

# NOT READY

Use when:

- evidence is too weak/inconsistent
- artifact is materially incomplete
- a blocking unsafe claim remains
- required structure is missing
- provenance cannot be resolved safely
- underlying sources are missing where required
- deterministic repair cannot make the artifact safe

A NOT READY artifact is blocked from normal final Knowledge download.

---

# Automatic repair pass

Sometimes the AI quality reviewer produces a strong article but leaves a **generic repairable defect**, such as:

- raw internal provenance marker
- unresolved placeholder
- missing required section
- Search Keywords containing case IDs
- Source References formatting/problem
- malformed quality envelope
- formatting consistency issue

The latest workflow gives the artifact **one automatic repair pass**.

```text
AI Quality Review
       ↓
Deterministic check finds repairable defect
       ↓
ONE automatic repair request
       ↓
Deterministic checks again
```

## What the repair pass is allowed to do

It can:

- resolve provenance safely
- remove unsupported/internal markers
- move uncertain material into Validation Items
- fix required structure
- fix formatting/placeholders
- fix Search Keywords
- correct Source References presentation
- make readiness agree with validation items

## What it must not do

It must not:

- invent a new root cause
- broaden the factual basis
- silently convert inference into fact
- invent commands/APIs/UI paths/versions/timings
- ignore the original retrospective evidence

## Only one automatic repair

The workflow deliberately does not loop forever.

If the artifact still fails after the repair pass:

```text
NOT READY
```

The reviewer needs to inspect the source/evidence or regenerate after the underlying problem is addressed.

## Substantive AI FAIL

A genuine substantive `FAIL` from the independent quality reviewer is not treated as a simple formatting defect.

The automatic repair path is intended for repairable quality/safety defects, not to overrule a meaningful reviewer failure.

---

# Why keep the deterministic gate strict?

Because this:

```text
AI writes article
AI says article is good
```

is not enough.

The final design is:

```text
AI generates
   ↓
Independent AI reviews
   ↓
Provenance is resolved
   ↓
Code checks the final text independently
   ↓
Human reviews
```

The deterministic gate is the last automated safety net.

It should not be weakened just because an article is mostly good.

Instead, the repair path fixes recoverable defects while keeping the gate strict.

---

# Human publication review

Even a `READY` artifact is not automatically published.

The reviewer/documentation owner should still check:

- technical correctness
- product/version scope
- wording
- commands/API/UI references where relevant
- confidentiality/generalization
- documentation placement
- publication process

The Auditor helps create a strong draft.

It does not replace the owner who approves the final Knowledge.
