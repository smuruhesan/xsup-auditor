# Validation Checklist

Use this checklist after meaningful source changes.

---

# Runtime

- [ ] JavaScript syntax passes
- [ ] bookmark/Snippet runs on exact `https://taco.paloaltonetworks.com:3009` origin under `/taco`
- [ ] UI renders
- [ ] rerun removes previous Auditor UI cleanly

---

# Batch

- [ ] XSUP parsing
- [ ] duplicates removed
- [ ] XSUP/TACO worker selector supports 2 / 3 / 5 / 10; default 2
- [ ] queue auto-starts
- [ ] 2 Knowledge workers maximum
- [ ] shared mutating Case Chat generation cap remains 2 across Audit + Knowledge
- [ ] Knowledge does not block independent XSUP/TACO queue work

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
- [ ] green XSUP Auditor link can be dragged to bookmarks when browser permits
- [ ] Copy bookmark URL fallback works
- [ ] manually created bookmark retains `javascript:` prefix
- [ ] bookmark runs from `/taco/pilot/`
- [ ] bookmark runs from `/taco/case/<SFDC>`
- [ ] bookmark runs from other valid `/taco/...` descendants
- [ ] wrong origin/port, site root and lookalike `/tacofoo` paths are rejected
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
- [ ] direct job starts with `CREATE KCS / KCS_DRAFT` KCS-family intent
- [ ] same-scope existing Salesforce KCS content can reconcile Direct CREATE → UPDATE
- [ ] Direct CREATE → UPDATE counts as a successful required primary artifact
- [ ] title/keyword similarity alone does not trigger UPDATE
- [ ] candidate content unavailable → do not guess target; CREATE + REVIEW
- [ ] Create New KCS Anyway can override Direct UPDATE recommendation and references existing KCS
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
- [ ] direct KCS bypasses Admin Guide/Runbook/Known Issue classification but may reconcile KCS CREATE↔UPDATE

# Audit-led routing and delivery invariants

- [ ] normal retrospective Audit CREATE cannot silently become UPDATE downstream
- [ ] normal retrospective Audit UPDATE cannot silently become CREATE downstream
- [ ] required primary failure is not masked by secondary success
- [ ] normal retrospective Audit HTML delivery is initiated before Knowledge generation starts
- [ ] each completed Knowledge artifact can render and download standalone HTML
- [ ] full renderer→download path is tested, not only dummy Blob content
- [ ] no `.xa-inline-review-callout` or `.xa-inline-review-marker` is nested inside H1-H6
- [ ] `knowledgeValidationNoticeHtml` is defined and renderer completes without ReferenceError
- [ ] installer bookmark payload decodes byte-for-byte to canonical release source

# Current Knowledge quality fallback

- [ ] generation prompt requires material unsupported details to be omitted or explicitly marked for TAC/SME validation
- [ ] independent quality prompt succeeds and returns only `PASS`, `PASS_WITH_VALIDATION`, or `FAIL`
- [ ] quality output can emit structured `REVIEW` / `BLOCKER` items using only allowed review kinds
- [ ] `SOURCE_CURRENTNESS` renders as **REVIEW CURRENTNESS**
- [ ] deterministic checks can add/normalize review items for source, timing, citation, derivative-AI and other material validation concerns
- [ ] one evidence-bounded repair pass is used only for safe/repairable issues
- [ ] transient Case Chat transport recovery does not create a fake quality verdict
- [ ] usable draft is preserved when independent quality validation still cannot complete
- [ ] preserved artifact exposes internal `VALIDATION UNAVAILABLE` and remains review-required
- [ ] `VALIDATION UNAVAILABLE` is not mislabeled as substantive AI `FAIL`
- [ ] inline callouts identify Review type, What, Why, required Outcome/action and source references when available
- [ ] review-item count includes quality/deterministic/article validation items consistently
- [ ] raw `<ref>`, verification-warning or equivalent source/provenance markup is not exposed in final human-facing content
- [ ] NOT READY usable draft remains downloadable/reviewable
- [ ] failed is reserved for no usable artifact
