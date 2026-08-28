# Validation Checklist

Use this before wider rollout or after a meaningful source change.

---

# Runtime

- [ ] JavaScript syntax passes
- [ ] Snippet runs only from intended TACopilot site
- [ ] Panel renders without uncaught auditor errors
- [ ] Minimize / maximize / close work
- [ ] Rerunning the Snippet removes prior auditor UI cleanly

---

# Input / batch

- [ ] Valid XSUP IDs accepted
- [ ] duplicates removed
- [ ] maximum two Audit jobs run concurrently
- [ ] third+ XSUP queues
- [ ] next XSUP starts automatically
- [ ] maximum one Knowledge job runs concurrently
- [ ] Knowledge queue does not block Audit queue

---

# SFDC mapping

- [ ] one mapping resolves automatically
- [ ] multiple mappings pause only that XSUP
- [ ] Choose SFDC works
- [ ] no mapping reports failure
- [ ] no SFDC URL/case is fabricated

---

# Product

- [ ] XDR/XSIAM detection
- [ ] XSOAR detection
- [ ] Cortex Cloud detection
- [ ] high-confidence Auto detect continues
- [ ] ambiguous detection pauses only that XSUP
- [ ] Ask me for every XSUP works
- [ ] Product shown in Dashboard
- [ ] Product shown in detail
- [ ] Change Product & Re-run Review works
- [ ] Product change does not unnecessarily rerun TACO
- [ ] Product change invalidates incompatible Audit/Knowledge reuse

---

# Product policy

## XDR/XSIAM

- [ ] Resolution = Functions as designed is in scope
- [ ] unrelated fields remain Not Applicable unless policy explicitly establishes them

## XSOAR

- [ ] Session_candidate trigger
- [ ] Fix Type None trigger
- [ ] Fix Type Functions as designed trigger
- [ ] only triggered fields reviewed

## Cortex Cloud

- [ ] approved Resolution trigger values
- [ ] RCA User Error trigger
- [ ] RCA Category is not used as RCA fallback
- [ ] only triggered fields reviewed

---

# TACO freshness

- [ ] no TACO → start
- [ ] usable current TACO → reuse
- [ ] active/no final report → wait
- [ ] newer Jira/SFDC evidence → refresh
- [ ] failed/incomplete TACO → refresh
- [ ] age alone does not refresh
- [ ] completed usable report takes precedence over ambiguous progress state
- [ ] Re-analyze All forces full refresh

---

# Evidence

- [ ] Jira comments classified correctly
- [ ] SFDC internal classified correctly
- [ ] TAC public classified correctly
- [ ] customer public classified correctly
- [ ] Jira ticket event classified correctly
- [ ] structured taxonomy extracted
- [ ] latest evidence timestamp calculated
- [ ] full evidence retained for source/reuse state
- [ ] focused evidence bounded for Case Chat
- [ ] focused evidence does not imply absence

---

# Audit

- [ ] applicable product fields only
- [ ] Current Value captured
- [ ] Correct / INCORRECT / UNDETERMINED
- [ ] Change Required
- [ ] Recommended Value when needed
- [ ] detailed explanation
- [ ] supporting original evidence
- [ ] exact Support action
- [ ] TACO Customer Response not treated as proof of sent message
- [ ] no engineer-performance scoring by default

---

# Audit reuse

- [ ] exact matching completed Case Chat reused
- [ ] source-current compatible fallback reused
- [ ] matching active Case Chat waited on
- [ ] failed prior result not reused
- [ ] product mismatch not reused
- [ ] stale source boundary not reused
- [ ] code/UI/prompt change alone does not force unnecessary regeneration

---

# Manual controls

- [ ] Regenerate Audit visible under Retrospective Audit card
- [ ] Regenerate Audit disabled while unsafe/busy
- [ ] Regenerate Audit does not rerun TACO
- [ ] Regenerate Audit does not auto-regenerate Knowledge
- [ ] existing Knowledge becomes outdated when appropriate
- [ ] Regenerate KCS/Knowledge visible under Knowledge card
- [ ] Regenerate Knowledge does not rerun TACO
- [ ] Regenerate Knowledge does not rerun Audit
- [ ] Re-analyze All is separate/full refresh

---

# Overall status

- [ ] Audit running → active
- [ ] Audit queued → waiting
- [ ] Product/SFDC selection → action required
- [ ] Knowledge checking → active
- [ ] Knowledge queued → waiting
- [ ] Knowledge generating → active
- [ ] Knowledge outdated → attention
- [ ] Knowledge failed → failure
- [ ] green/complete only when required workflow is complete/skipped

---

# Knowledge enrichment

- [ ] correct artifact type selected
- [ ] enrichment uses only actually available source material
- [ ] new factual additions cite underlying source
- [ ] no loose reference dumping
- [ ] unnecessary customer-specific data generalized
- [ ] existing knowledge considered before duplicate creation

---

# Knowledge quality

- [ ] independent quality Case Chat runs for regeneration/new generation
- [ ] artifact-specific rubric used
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
- [ ] audience fit
- [ ] verification
- [ ] publication language remains draft/review-oriented

---

# Deterministic Knowledge gate

- [ ] no internal reuse metadata in final artifact
- [ ] no unresolved internal placeholder/token
- [ ] no raw inference marker
- [ ] no unresolved editorial placeholder
- [ ] balanced code fences
- [ ] required artifact sections
- [ ] correct XSUP target
- [ ] XSUP not in Search Keywords
- [ ] SFDC ID not in Search Keywords
- [ ] Source References identify underlying sources
- [ ] material validation prevents READY
- [ ] NOT READY artifact not treated as final downloadable Knowledge

---

# Knowledge reuse

- [ ] current quality-reviewed artifact reused
- [ ] source-current compatible prior artifact can be reused
- [ ] old current artifact does not silently regenerate because local methodology changed
- [ ] Regenerate Knowledge deliberately applies latest quality workflow
- [ ] product/artifact mismatch invalidates reuse

---

# HTML / links

- [ ] model content escaped before HTML
- [ ] HTTP/HTTPS validation
- [ ] generated links safe
- [ ] Markdown headings/lists render
- [ ] fenced code blocks render correctly
- [ ] no unresolved link tokens

---

# Reports

- [ ] Audit HTML
- [ ] Review Paste Comment
- [ ] Knowledge HTML
- [ ] individual download
- [ ] combined Audit download
- [ ] combined Knowledge download
- [ ] copy-all actions

---

# Storage

- [ ] Browser Downloads works
- [ ] Choose Folder requires user action
- [ ] selected folder writes work
- [ ] storage failure does not fail Audit
- [ ] folder handle not serialized

---

# Session

- [ ] Save Session downloads JSON
- [ ] Restore Session validates schema
- [ ] completed data restored
- [ ] active Audit restored as stopped
- [ ] active/queued Knowledge restored as stopped
- [ ] folder permission not restored silently

---

# Stop All

- [ ] queued Audit stopped
- [ ] queued Knowledge stopped
- [ ] local controller aborted
- [ ] UI reflects stopped state
- [ ] documentation does not promise server-side cancellation

---

# Documentation

- [ ] README matches actual UI labels
- [ ] User Guide matches actual workflow
- [ ] Product Policies match source policy objects
- [ ] Knowledge Quality matches current generation/gate
- [ ] FAQ/security language does not claim formal approval
- [ ] Technical Guide reflects reuse schemas/endpoints/current invariants
