# Knowledge Quality

The Knowledge worker is designed to create useful reusable knowledge, not just reformat the retrospective.

The framework is common across XDR/XSIAM, XSOAR and Cortex Cloud.

It applies across issue types.

---

# Knowledge actions

The retrospective can recommend:

- CREATE KCS
- UPDATE EXISTING KCS
- UPDATE ADMIN/TECH GUIDE
- CREATE/UPDATE RUNBOOK
- KNOWN ISSUE / RELEASE NOTE
- NO KNOWLEDGE ACTION
- UNDETERMINED

The primary action determines the generated artifact type.

---

# Two-stage generation

## 1. Knowledge Enrichment + Draft

The AI starts from the retrospective and may improve the article using directly relevant source material actually available to the Case Chat/TACO investigation.

Potential source categories include:

- authoritative product documentation
- relevant KCS/internal knowledge
- relevant Confluence/admin/technical guides
- Jira/Engineering evidence
- validated similar Salesforce cases
- known-issue/release-note material

The objective is to answer:

> What information would help the next TAC engineer or intended reader understand, diagnose, resolve or safely operate around this issue?

## 2. Independent Quality Review

A separate Case Chat acts as an independent knowledge editor.

It receives:

- the authoritative retrospective basis
- the enriched draft
- a common quality rubric
- an artifact-specific rubric

It returns a polished final draft plus a machine-readable quality/readiness envelope.

---

# Common quality categories

Every artifact is evaluated across broad categories rather than issue-specific fixes.

## Accuracy

Claims must be supported or clearly marked for validation.

## Usefulness

The next reader should be able to use the article to understand or act.

## Completeness

The article should contain the sections needed for its purpose.

## Actionability

Troubleshooting or operational content should lead to concrete, understandable next steps.

## Generalization

Remove unnecessary customer-specific details and express the reusable pattern.

## Technical depth

Include useful technical details when they are supported.

Do not add technical detail merely to make the article look sophisticated.

## Source quality

Prefer directly relevant authoritative sources.

Do not dump unrelated references.

## Consistency

Body text, readiness, validation items and recommendations should agree.

## Readability

The article should have clear headings, lists, code blocks and explanation.

## Discoverability

Use useful titles, symptoms, error strings and keywords.

Do not use the originating XSUP/SFDC ID as a reusable search keyword.

## Audience fit

The content should match the intended artifact audience.

## Verification

Where possible, explain how to confirm the issue and how to verify the result.

## Existing-knowledge awareness

When an existing KCS/doc substantially covers the topic, prefer a useful update proposal instead of creating unnecessary duplicate knowledge.

---

# Source-control rules

New factual or operational details should be traceable to an underlying source.

TACO/Case Chat is the synthesis mechanism, not the underlying source.

Prefer references such as:

- official docs
- KCS/knowledge
- Jira/Engineering
- SFDC
- Confluence/admin/technical guide
- release/known-issue source

Do not claim a source was searched/read unless it was actually available to the investigation.

Search absence is not proof that documentation does not exist.

---

# High-risk factual details

The following require special care:

- exact commands
- API routes/payloads
- UI paths
- product versions
- platform/OS applicability
- configuration values
- registry/config paths
- process/service names
- error/return codes
- exact timing/latency
- architecture/backend behavior
- workaround/fix/remediation
- release/fix status

If a useful material detail cannot be established, it should be omitted or identified for TAC/SME validation.

An inference must not be silently converted into a confirmed fact.

---

# Artifact-specific quality

## KCS Draft

Optimized for TAC self-service.

Typical sections include:

- Symptoms / Error
- Applies To
- What It Means
- Cause
- How to Check
- How to Confirm
- Resolution / Fix
- How to Verify
- Additional Troubleshooting
- Expected Behavior / Limitations
- Example
- Related Knowledge / Documentation
- Search Keywords
- Source References
- TAC/SME Validation Items

## KCS Update Proposal

Optimized to improve existing knowledge without creating a duplicate.

## Admin / Tech Guide Update

Optimized for reusable product/admin guidance and appropriate documentation placement.

## TAC Runbook

Optimized for repeatable ordered execution, evidence interpretation and decision points.

## Known Issue / Release Note

Optimized for affected scope, symptom, impact, cause/limitation, workaround/fix and release/status information when supported.

---

# Readiness

## READY

- useful
- materially complete
- no material unsupported claim
- no material validation item remains

## DRAFTABLE

- useful draft
- can be reviewed now
- one or more named material validation items remain

## NOT READY

- evidence is too weak/inconsistent
- artifact is incomplete
- required structure/source support fails
- unsafe unresolved content remains

`NOT READY` is not treated as final downloadable knowledge.

---

# Deterministic safety checks

In addition to the AI quality review, the code performs deterministic checks such as:

- minimum useful content
- internal metadata not exposed
- unresolved internal placeholders not exposed
- raw inference/provenance markers not exposed
- balanced Markdown code fences
- required artifact sections
- correct target XSUP
- XSUP/SFDC not used as KCS search keywords
- Source References identify underlying sources
- material validation items cannot remain `READY`

These checks complement the AI reviewer; they do not replace human review.

---

# Reusing older/current Knowledge

The auditor prefers reuse when the existing artifact is still current for the underlying source boundary.

This means a current artifact can be reused even if the local auditor's quality workflow has subsequently improved.

That behavior avoids silently regenerating every current article because code changed.

If a reviewer wants an existing current artifact deliberately rebuilt through the latest enrichment + quality workflow, use:

**Regenerate KCS / Regenerate Knowledge**

---

# Publication

The auditor produces drafts/proposals.

It does not publish knowledge.

Human TAC/SME/documentation/product-owner review is required before publication.
