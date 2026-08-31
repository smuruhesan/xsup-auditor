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
- [ ] NOT READY not treated as final downloadable Knowledge

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
