# Validation Checklist

Use this checklist after meaningful source changes.

---

# Runtime

- [ ] JavaScript syntax passes
- [ ] Snippet runs on intended TACopilot host
- [ ] UI renders
- [ ] rerun removes previous Auditor UI cleanly

---

# Batch

- [ ] XSUP parsing
- [ ] duplicates removed
- [ ] 2 Audit workers maximum
- [ ] queue auto-starts
- [ ] 1 Knowledge worker maximum
- [ ] Knowledge does not block Audit queue

---

# SFDC

- [ ] one mapping auto-resolves
- [ ] multiple mappings pause one XSUP
- [ ] no mapping fails safely
- [ ] no case is fabricated

---

# Product

- [ ] XDR/XSIAM detection
- [ ] XSOAR detection
- [ ] Cortex Cloud detection
- [ ] high-confidence Auto continues
- [ ] ambiguity pauses only one XSUP
- [ ] manual mode works
- [ ] Change Product works
- [ ] product change invalidates incompatible Audit/Knowledge
- [ ] product change does not unnecessarily force TACO

---

# Product policy

## XDR/XSIAM

- [ ] Functions as designed trigger
- [ ] Resolution review

## XSOAR

- [ ] Session_candidate trigger
- [ ] Fix Type None trigger
- [ ] Fix Type Functions as designed trigger
- [ ] only triggered fields reviewed

## Cortex Cloud

- [ ] supported Resolution triggers
- [ ] RCA User Error
- [ ] RCA Category not used as RCA fallback

---

# TACO freshness

- [ ] no TACO → start
- [ ] current usable TACO → reuse
- [ ] running/no final → wait
- [ ] newer case evidence → refresh
- [ ] failed/incomplete → refresh
- [ ] age alone does not refresh
- [ ] Re-analyze All forces fresh TACO

---

# Evidence

- [ ] Jira classification
- [ ] SFDC internal classification
- [ ] TAC public classification
- [ ] customer public classification
- [ ] ticket event extraction
- [ ] structured fields extraction
- [ ] latest evidence timestamp
- [ ] selected evidence does not imply absence

---

# Audit

- [ ] product-specific fields only
- [ ] Current Value
- [ ] Correct / INCORRECT / UNDETERMINED
- [ ] Change Required
- [ ] Recommended Value
- [ ] detailed explanation
- [ ] supporting original evidence
- [ ] exact Support action
- [ ] no broad TAC performance scoring by default

---

# Audit reuse

- [ ] exact completed result reused
- [ ] compatible current result reused
- [ ] matching running result waited on
- [ ] failed result not reused
- [ ] product mismatch not reused
- [ ] source change invalidates as intended

---

# Manual controls

- [ ] Regenerate Audit visible
- [ ] does not rerun TACO
- [ ] does not auto-regenerate Knowledge
- [ ] Knowledge marked outdated when appropriate
- [ ] Regenerate KCS/Knowledge visible
- [ ] Knowledge regeneration does not rerun TACO/Audit
- [ ] Re-analyze All remains separate

---

# Overall status

- [ ] Audit active → active
- [ ] Audit queued → waiting
- [ ] Knowledge checking → active
- [ ] Knowledge queued → waiting
- [ ] Knowledge generating → active
- [ ] Knowledge repair → active
- [ ] Knowledge outdated → attention
- [ ] Knowledge failed → failed
- [ ] green only when required workflow is complete/skipped

---

# Knowledge enrichment

- [ ] correct artifact type
- [ ] case-specific details generalized
- [ ] relevant available sources used
- [ ] no source claimed unless actually available
- [ ] no unnecessary reference dump

---

# Independent quality review

- [ ] accuracy
- [ ] usefulness
- [ ] completeness
- [ ] actionability
- [ ] generalization
- [ ] technical depth
- [ ] source quality
- [ ] consistency
- [ ] readability
- [ ] discoverability
- [ ] existing-Knowledge awareness
- [ ] audience fit
- [ ] verification
- [ ] draft/publication boundary

---

# Provenance resolution

Test finalizer with:

- [ ] `[inference]`
- [ ] `[from case data]`
- [ ] `[derived analysis]`

Confirm:

- [ ] marker never merely deleted while unsupported claim remains
- [ ] supported claim is sourced/reworded
- [ ] useful uncertainty moves to Validation
- [ ] unnecessary unsupported claim removed
- [ ] material validation downgrades readiness

---

# Deterministic Knowledge gate

- [ ] minimum useful content
- [ ] no `[XSUP-AUDITOR-META]`
- [ ] no unresolved `@@...@@`
- [ ] no raw provenance marker
- [ ] no TODO/TBD/editorial placeholder
- [ ] balanced code fences
- [ ] required headings
- [ ] correct Generated From target
- [ ] no XSUP in Search Keywords
- [ ] no SFDC ID in Search Keywords
- [ ] Source References identifies underlying sources
- [ ] material validation prevents READY

---

# KCS required sections

- [ ] Symptoms / Error
- [ ] Cause
- [ ] How to Check
- [ ] How to Confirm
- [ ] Resolution / Fix
- [ ] Source References

---

# Automatic repair

Inject each repairable issue and confirm:

- [ ] raw provenance
- [ ] placeholder
- [ ] missing required section
- [ ] Search Keywords issue
- [ ] Source References issue
- [ ] malformed quality envelope

Confirm:

- [ ] only one automatic repair pass
- [ ] repair uses existing evidence basis
- [ ] no new diagnosis invented
- [ ] deterministic gate reruns after repair
- [ ] still-failing artifact becomes NOT READY
- [ ] substantive AI FAIL is not automatically overridden

---

# Readiness

- [ ] READY only with no material validation item
- [ ] DRAFTABLE when material validation remains
- [ ] NOT READY for blocking quality/safety failure
- [ ] NOT READY usable draft is preserved/downloadable for review but clearly blocked for publication

---

# Rendering

- [ ] Markdown headings
- [ ] lists
- [ ] code blocks
- [ ] safe links
- [ ] no internal link placeholder leak
- [ ] model HTML escaped

---

# Storage

- [ ] Browser Downloads
- [ ] Choose Folder
- [ ] storage error does not fail Audit
- [ ] folder handle not serialized

---

# Session

- [ ] Save Session
- [ ] Restore Session
- [ ] active work restores stopped
- [ ] completed work preserved

---

# Documentation

- [ ] README matches UI/workflow
- [ ] Knowledge Quality matches actual quality pipeline
- [ ] FAQ covers provenance/repair/readiness
- [ ] Technical Guide preserves current invariants
- [ ] Troubleshooting covers quality-gate failures
- [ ] no real customer/case examples committed

---

# Bookmark distribution

- [ ] installer HTML opens locally
- [ ] blue XSUP Auditor link can be dragged to bookmarks when browser permits
- [ ] Copy bookmark URL fallback works
- [ ] manually created bookmark retains `javascript:` prefix
- [ ] bookmark runs only on intended TACopilot page context
- [ ] bookmark and canonical source contain matching current logic
- [ ] DevTools Snippet fallback still works

# Direct Generate KCS

- [ ] accepts XSUP input
- [ ] accepts 8-digit SFDC input
- [ ] SFDC-only input does not fabricate an XSUP
- [ ] linked XSUP retained when discovered
- [ ] product/context detection works
- [ ] current TACO reused when appropriate
- [ ] stale/incomplete TACO refreshed when required
- [ ] original evidence collected
- [ ] retrospective field review is skipped/not applicable
- [ ] no Review Paste Comment generated for direct KCS basis
- [ ] `CREATE KCS` selected explicitly
- [ ] `KCS_DRAFT` artifact used
- [ ] full Knowledge quality pipeline runs
- [ ] direct-KCS reuse identity does not incorrectly reuse incompatible artifact intent

# Knowledge classification during retrospective

Test cases for each prompt outcome:

- [ ] CREATE KCS — repeatable resolution pattern
- [ ] UPDATE EXISTING KCS — existing KCS has material gap
- [ ] UPDATE ADMIN/TECH GUIDE — product behavior/config/expectation documentation gap
- [ ] CREATE/UPDATE RUNBOOK — internal investigation/evidence workflow is the reusable value
- [ ] KNOWN ISSUE/RELEASE NOTE — version-specific defect/limitation
- [ ] NO KNOWLEDGE ACTION — no material reusable gap
- [ ] UNDETERMINED — insufficient evidence
- [ ] JavaScript maps action to correct artifact type/template
- [ ] direct KCS bypasses category selection and remains KCS

# Current Knowledge quality fallback

- [ ] generation prompt adds preliminary review markers for unsupported high-risk claims
- [ ] normal quality prompt succeeds
- [ ] simulated retryable quality rejection triggers one compact quality retry
- [ ] compact retry is attempted only once
- [ ] usable draft preserved when quality still cannot complete
- [ ] preserved draft status is NOT READY
- [ ] internal status can be QUALITY_REVIEW_ERROR
- [ ] QUALITY_REVIEW_ERROR is not mislabeled as substantive AI FAIL
- [ ] Review Required section shows What to review and Why
- [ ] review-item count includes quality/deterministic/article validation items consistently
- [ ] raw `<ref>`, verification-warning or equivalent source/provenance markup is not exposed in final human-facing content
- [ ] NOT READY usable draft remains downloadable/reviewable
- [ ] failed reserved for no usable artifact
