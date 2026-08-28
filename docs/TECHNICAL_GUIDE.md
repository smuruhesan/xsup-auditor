# Technical Guide

This document describes the architecture and maintenance contract of XSUP Retrospective Auditor v1.

It is intended for developers, maintainers and future AI coding assistants.

The implementation is a single self-contained JavaScript Snippet executed inside TACopilot.

---

# 1. Core design

One common engine supports three product profiles:

```text
Common engine
├─ XSUP → SFDC
├─ Product detection/selection
├─ TACO freshness
├─ Original evidence
├─ Case Chat
├─ Smart reuse
├─ Audit parsing
├─ Knowledge workflow
├─ UI/dashboard/status
├─ Report generation
├─ Storage
└─ Save/Restore Session

Product policy
├─ XDR/XSIAM
├─ XSOAR
└─ Cortex Cloud
```

Do not fork the runtime into separate product Snippets.

Product-specific differences belong in the profile/policy layer.

---

# 2. Runtime boundary

The source checks that it is running from TACopilot.

The runtime uses the reviewer's existing authenticated browser session.

Requests use same-origin credentials.

Do not add embedded credentials or authentication bypasses.

---

# 3. Important runtime constants

Current architecture includes:

```text
VERSION = 1
POLL_MS = 5000
ANALYSIS_TIMEOUT_MS = 20 minutes
CHAT_TIMEOUT_MS = 15 minutes
Audit concurrency = 2
Knowledge concurrency = 1
```

Reuse schemas are methodology contracts, not product-release history:

```text
AUDIT_REUSE_SCHEMA = support-field-review-v1
KNOWLEDGE_REUSE_SCHEMA = knowledge-quality-v1
KNOWLEDGE_DRAFT_REUSE_SCHEMA = knowledge-enriched-draft-v1
REUSE_META_PREFIX = [XSUP-AUDITOR-META]
```

Do not bump a reuse schema for a visual-only change.

---

# 4. Main TACopilot API paths

Observed runtime paths include:

```text
GET  /taco/search?q={XSUP}

GET  /taco/pilot/investigation/{case}
POST /taco/pilot/investigation/{case}/start
POST /taco/pilot/investigation/{case}/update

GET  /taco/pilot/investigation/{case}/progress?investigation_id={id}
GET  /taco/pilot/investigation/{case}/report/{investigation_id}

GET  /taco/pilot/investigation/{case}/followup?investigation_id={id}
POST /taco/pilot/investigation/{case}/followup

GET  /taco/pilot/investigation/task/{task_id}

GET  /taco/case/{case}
```

Treat these as observed internal contracts that may change.

Implement defensive parsing.

---

# 5. XSUP → SFDC resolution

`/taco/search?q=XSUP-...` is parsed from HTML.

The tool extracts:

- XSUP
- SFDC case number
- mapping detail
- direct SFDC URL when available

Behavior:

- one candidate → select
- multiple candidates → `needs_selection`
- no candidate → mapping failure

Never fabricate an SFDC case.

Other jobs should continue while one XSUP waits for reviewer selection.

---

# 6. Original evidence extraction

The TACopilot case page is parsed for comment elements:

```javascript
[id^="comment-"]
```

Current classification:

```text
comment-jira-ticket      → JIRA_TICKET_EVENT
data-is-jira=true        → JIRA_COMMENT
data-is-internal=true    → SFDC_INTERNAL
data-is-external=true    → SFDC_CUSTOMER_PUBLIC
all false                → SFDC_TAC_PUBLIC
```

Structured fields are also collected from tables, definition lists and `data-label` elements.

Timestamp extraction is defensive and uses DOM attributes/text exposed by TACopilot.

---

# 7. Do not add direct Jira REST calls

TACopilot's managed browser Content Security Policy blocks cross-origin direct Jira REST calls.

Freshness must be derived from Jira/SFDC activity exposed through TACopilot.

Do not work around the CSP.

---

# 8. Product detection

`detectProduct()` scores structured signals.

Current normalization:

```text
XDR / Cortex XDR / XSIAM / Cortex XSIAM → XDR_XSIAM
XSOAR / Demisto                          → XSOAR
Cortex Cloud / Prisma Cloud / CNAPP /
CSPM / CWP / Cloud Posture             → CORTEX_CLOUD
```

Signal strength is intentionally higher for structured metadata.

Examples include:

- TACO/case `product_type`
- structured product/platform fields
- mapping details
- case header/metadata
- Jira ticket snapshot

High-confidence auto selection proceeds.

Medium/low/ambiguous selection pauses the job.

Manual selection is always supported.

---

# 9. Product profiles

## XDR/XSIAM

Primary field order:

```text
Resolution
```

Eligibility:

```text
Resolution = Functions as designed
```

## XSOAR

Primary field order:

```text
Fix Type
Flag / Label
```

Eligibility:

```text
Session_candidate
OR
Fix Type = None / Functions as designed
```

## Cortex Cloud

Primary field order:

```text
Resolution
RCA
```

Eligibility:

```text
Resolution in approved retrospective set
OR
RCA = User Error
```

`RCA Category` must not be used as fallback RCA.

---

# 10. Product override

A manual product selection is recorded in job state.

A product change invalidates Audit/Knowledge reuse because the reviewed fields/policy may change.

It should not automatically force TACO refresh.

Product is locked while the active Retrospective/Knowledge Case Chat request is running.

---

# 11. TACO freshness state machine

Evidence is collected before deciding TACO freshness.

This is deliberate.

High-level logic:

```text
force refresh
  → REFRESH

usable completed TACO
  ├─ newer Jira/SFDC evidence → REFRESH
  └─ otherwise               → REUSE

no usable final report + genuinely active
  → WAIT

failed/error/incomplete/no usable final
  → REFRESH
```

A usable completed final report takes precedence over an ambiguous stale progress state.

Old age alone is not a refresh trigger.

When timestamps are incomplete, prefer conservative reuse of a complete report rather than unnecessary analysis, with manual full refresh available.

---

# 12. TACO report readiness

Hypotheses alone are not sufficient.

`reportReady()` requires a usable final synthesized conclusion/report/RCA/guidance object.

During a refresh, the code waits for evidence that the report actually changed/advanced before accepting a completed progress state.

---

# 13. Evidence selection for Case Chat

The full evidence set is retained for source-boundary/fingerprint purposes.

A bounded subset is selected for the Case Chat prompt.

Selection uses:

- report-derived keywords
- root-cause/resolution terms
- Engineering indicators
- first/last records
- noise filtering

The design target is approximately 32 focused records.

Do not equate "not selected into prompt" with "did not happen."

---

# 14. Audit prompt contract

`buildAuditPrompt()` dynamically includes:

- XSUP
- SFDC
- selected product/profile
- product policy
- current ticket field snapshot
- structured case taxonomy
- TACO verified conclusion
- original evidence
- provenance rules
- field-decision output contract
- knowledge action output contract

The Audit is intentionally field-centric.

Do not reintroduce broad TAC performance scoring, delay scoring, handoff scoring or avoidability scoring as default output.

---

# 15. Audit evidence principles

Preserve these invariants:

- TACO = derived analysis
- Jira/SFDC = original evidence
- TACO Customer Response does not prove customer communication
- selected excerpts cannot prove absence
- insufficient evidence → UNDETERMINED
- do not infer AI usage from writing style
- avoid subjective labels about engineers
- explanations must be detailed enough for an SME unfamiliar with the case
- product-specific applicability controls which fields are reviewed

---

# 16. Audit reuse metadata

`buildAuditReuseMeta()` fingerprints the current Audit inputs.

Exact-match metadata is embedded in the submitted Case Chat question using:

```text
[XSUP-AUDITOR-META]
```

This marker is for internal reuse correlation.

It is not intended for user-facing report content.

---

# 17. Case Chat history schema

The history endpoint can return entries with:

```text
question
answer
answer_html
created_at
status
id
```

Some response shapes can also expose:

```text
followup_id
```

The collector supports both:

```text
followup_id
or
id
```

Do not assume the history row always contains a field literally named `followup_id`.

---

# 18. Smart Case Chat reuse

`tryReuseCaseChat()` follows a reuse-first model.

## Exact current match

When a fingerprint matches, the completed result is validated and reused.

## Current-compatible fallback

When no exact current marker match exists, the auditor can reuse a completed result that is:

- structurally compatible
- valid for the selected product/artifact
- completed after the current TACO/Jira/SFDC source boundary

This is important.

It means:

> Auditor source-code/prompt/schema changes alone do not automatically regenerate otherwise-current Case Chat results.

## Existing running result

If the matching result is pending/running/queued/processing:

- wait for it
- do not create a duplicate

## Failed result

Do not reuse a failed result.

Generate fresh only when necessary.

---

# 19. Manual regeneration semantics

These actions are intentionally separate.

## Regenerate Audit

`forceRerunAudit()`:

- requires current SFDC/TACO/evidence
- sets Audit-only refresh
- does not force TACO
- does not force Knowledge regeneration
- marks existing Knowledge outdated when it belonged to the previous Audit

This invariant is important.

## Regenerate Knowledge

`forceRegenerateKnowledge()`:

- requires completed Audit + artifact type
- forces only Knowledge
- runs current enrichment/quality workflow
- does not force TACO
- does not force Audit

## Re-analyze All

`forceReanalyzeTaco()`:

- force TACO
- force Audit
- force Knowledge

Do not collapse these controls.

---

# 20. Overall job status

Audit completion is not the same as workflow completion.

`knowledgeUiState()` recognizes:

```text
failed
stopped
outdated
queued
checking
waiting_existing
generating
completed
not_required
not_generated
```

`overallUiState()` evaluates Audit and Knowledge so the XSUP can show:

- active while Knowledge is checking/generating
- waiting while Knowledge is queued
- attention when Knowledge is outdated
- failed when required Knowledge fails
- complete only after the required workflow is complete/skipped

Preserve this behavior in all UI refactors.

---

# 21. Live Dashboard

Current columns include:

```text
XSUP
Product
SFDC
Progress
Current activity
Last update
Reviewed fields
Review verdict
Change needed
Knowledge artifact
Elapsed
View audit
```

The Product column is interactive when selection/change is allowed.

The Knowledge column displays Knowledge status/readiness independently from Audit.

---

# 22. Analysis & Reuse Status UI

The selected XSUP renders three status cards:

```text
TACO Analysis
Retrospective Audit
Knowledge Artifact
```

The Retrospective card contains:

```text
Regenerate Audit
```

The Knowledge card contains:

```text
Regenerate KCS
or
Regenerate Knowledge
```

The header contains:

```text
Re-analyze All
```

Do not move the individual Regenerate controls somewhere users cannot discover them.

---

# 23. Knowledge action mapping

The Audit decides the primary action.

The code maps actions to artifact types such as:

```text
CREATE KCS             → KCS_DRAFT
UPDATE EXISTING KCS    → KCS_UPDATE
UPDATE ADMIN/TECH GUIDE→ DOC_UPDATE
CREATE/UPDATE RUNBOOK  → RUNBOOK
KNOWN ISSUE/RELEASE NOTE → KNOWN_ISSUE
```

No Knowledge action means no artifact.

---

# 24. Knowledge Enrichment prompt

`buildKnowledgePrompt()` starts from the authoritative Audit result.

The model is instructed to improve the artifact with directly relevant source material actually available to the TACO/Case Chat investigation.

It must not claim sources it did not have.

It must prefer directly relevant authoritative sources.

It must generalize customer-specific details.

---

# 25. Artifact-specific quality rubric

The common quality rubric covers:

- accuracy
- usefulness
- completeness
- actionability
- generalization
- technical depth
- source quality
- consistency
- safety/confidence
- readability
- discoverability
- existing knowledge awareness
- audience fit
- verification
- publication readiness

Additional artifact-specific rules exist for:

- KCS
- KCS update
- Admin/Tech Guide
- Runbook
- Known Issue/Release Note

Do not implement one-off safety rules for a single case/product when the issue belongs to a general quality category.

---

# 26. Knowledge draft reuse

A separate reuse schema exists for enriched drafts.

This lets the system avoid regenerating an identical intermediate draft when only the downstream finalization is needed.

---

# 27. Independent Knowledge quality review

`buildKnowledgeQualityPrompt()` sends:

- authoritative retrospective
- enriched draft
- common quality rubric
- artifact-specific rubric

The reviewer must output:

```text
QUALITY_STATUS
VALIDATED_ARTIFACT_READINESS
QUALITY_SUMMARY
MATERIAL_VALIDATION_ITEMS

--- FINAL ARTIFACT ---
[complete artifact]
```

The machine-readable header is parsed separately from the user-facing artifact.

---

# 28. Knowledge readiness rules

Final readiness:

```text
READY
DRAFTABLE
NOT READY
```

Material validation items prevent READY.

A failed/not-ready final result is not treated as final downloadable knowledge.

---

# 29. Deterministic Knowledge checks

`deterministicKnowledgeQualityChecks()` provides non-LLM safety checks.

Examples include:

- artifact completeness
- internal metadata leakage
- unresolved internal placeholders
- raw inference markers
- editorial placeholders
- unbalanced code fences
- required headings by artifact type
- target mismatch
- XSUP/SFDC in Search Keywords
- missing/invalid Source References
- material validation/readiness consistency

Keep these checks generic.

---

# 30. Internal metadata stripping

`stripInternalKnowledgeMetadata()` removes reuse metadata before final user-facing Knowledge output.

Do not expose the reuse marker in downloaded Knowledge.

---

# 31. Markdown / HTML safety

Generated model content must not be inserted as raw HTML.

The renderer:

- escapes input
- supports controlled Markdown
- validates URLs
- allows only HTTP/HTTPS links
- opens external links safely

Do not replace this with raw `innerHTML = modelAnswer`.

---

# 32. References

Audit references can be collected from TACO/Case Chat.

Knowledge quality instructions require directly relevant underlying sources.

Future improvements should continue to reduce irrelevant reference dumping rather than increasing reference volume.

---

# 33. Storage

Default destination:

```text
Browser Downloads
```

Optional:

```text
showDirectoryPicker()
```

The folder must be explicitly chosen by the reviewer.

Storage errors must not change the Audit verdict.

---

# 34. Save / Restore Session

Session schema:

```text
xsup-auditor-session-v1
```

The export contains serializable job state.

Folder permission handles are not serialized.

On restore:

- locally running Audit jobs → stopped
- queued/generating Knowledge → stopped
- completed data preserved
- selected folder permission reset to Browser Downloads

---

# 35. Stop All

`Stop All` aborts the browser-side controller and clears queued local work.

It cannot guarantee cancellation of a TACO/Case Chat task already accepted by the server.

Do not document it as a server-side task cancellation API.

---

# 36. Product change

Product change:

- does not force TACO merely because product selection changed
- invalidates/re-evaluates product-specific Audit/Knowledge
- must be disabled/locked during active Case Chat work

Product selection must be part of Audit compatibility.

---

# 37. Report generation

Audit HTML includes:

- target metadata
- product
- eligibility
- reviewed fields
- verdict
- knowledge action/readiness
- TACO/Audit source
- links
- report body
- Review Paste Comment
- references

Knowledge HTML includes:

- target/product/action/readiness/source
- human-review notice
- final Knowledge draft

---

# 38. Review Paste Comment

This is copyable reviewer content.

The tool does not automatically post it.

User-visible language is **Review Paste Comment**, not an instruction to post into XSUP/Jira automatically.

---

# 39. Batch exports

Supported batch actions include:

- all Review Paste Comments
- combined Audit HTML
- copied Audit reports
- combined Knowledge HTML
- copied Knowledge drafts

---

# 40. UI status invariants

Preserve:

- active spinner for running/checking
- waiting state for queues
- failed state for failures
- attention state for outdated Knowledge
- overall green/completed status only when required Knowledge is complete/skipped

Do not derive overall status from `job.status` alone.

---

# 41. Security invariants

Do not add:

- embedded secrets
- credential extraction
- direct blocked Jira REST
- CSP bypass
- automatic ticket mutation
- automatic Knowledge publication
- silent external telemetry
- unsafe raw model HTML

---

# 42. Data-handling invariants

Do not commit real case data into source-control fixtures.

Use sanitized test material.

Session/debug exports can contain sensitive information.

---

# 43. Maintaining product policies

When a product policy changes:

1. update profile eligibility
2. update applicable field order
3. update policy prompt text
4. confirm ticket-field extraction
5. confirm field parser/output handling
6. add regression fixtures
7. verify Product override/reuse invalidation
8. update PRODUCT_POLICIES.md

Do not modify the common engine unless the change is truly cross-product.

---

# 44. Adding another product

Prefer a new profile rather than a new Snippet.

Define:

- key/label
- detection normalization
- detection signals
- eligibility
- primary field order
- applicable field rules
- valid taxonomy
- prompt policy
- parsing/validation tests

Then reuse the common engine.

---

# 45. Future AI-maintainer invariants

Before an AI coding assistant changes the source, preserve these contracts:

1. One Snippet, not separate per-product forks.
2. Two Audit workers + one Knowledge worker unless intentionally redesigned.
3. Product visible in Dashboard/detail.
4. Lower-confidence Product detection pauses the individual XSUP.
5. TACO refresh is source/freshness driven, not age driven.
6. Completed TACO report evaluated before ambiguous running status.
7. Original evidence provenance remains separate from TACO derived analysis.
8. `RCA Category` is not actual RCA.
9. Case Chat history supports `id` and `followup_id`.
10. Existing running matching Case Chat is waited on, not duplicated.
11. Source-current compatible results can be reused even when local code/prompt changed.
12. Regenerate Audit does not rerun TACO.
13. Regenerate Audit does not silently regenerate Knowledge.
14. Regenerate Knowledge does not rerun TACO/Audit.
15. Re-analyze All is the only full refresh.
16. Overall XSUP status follows required Knowledge state.
17. Knowledge quality fixes must be broad quality rules, not case-specific patches.
18. Final Knowledge must strip internal reuse metadata.
19. Model output is escaped before HTML rendering.
20. Storage failure must not fail the Audit.

---

# 46. Regression testing priorities

Every meaningful change should test:

- XDR/XSIAM case
- XSOAR case
- Cortex Cloud case
- high-confidence Product detection
- manual Product selection
- ambiguous Product selection
- multiple SFDC candidate
- TACO reuse
- TACO wait
- TACO refresh
- Audit exact reuse
- Audit source-current compatible reuse
- Audit new generation
- Regenerate Audit
- Knowledge reuse
- Knowledge queue
- Knowledge regeneration
- Knowledge enrichment
- Knowledge quality PASS
- DRAFTABLE
- NOT READY
- overall status while Knowledge runs
- report download
- folder storage
- Save/Restore Session
- safe HTML rendering

See [Validation Checklist](VALIDATION_CHECKLIST.md).
