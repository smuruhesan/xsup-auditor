# XSUP Retrospective Auditor — Technical Guide

**Release:** v1  
**Primary source file:** `xsup-auditor.js`  
**Runtime:** self-contained JavaScript executed as a Chrome DevTools Snippet inside TACopilot

This document is intended for:

- developers
- future maintainers
- reviewers debugging the tool
- future AI assistants modifying the code
- engineers converting the snippet into a supported application

It documents the current architecture, assumptions, endpoints, state model, evidence model, prompts, reuse behavior, storage model, safety constraints, and maintenance rules.

---

# 1. Design Goal

The XSUP Retrospective Auditor is not intended to replace TACO.

TACO remains the broad technical investigation layer.

The auditor consumes TACO output plus original case evidence to perform a narrower workflow:

```text
Technical understanding
       +
Original evidence
       ↓
Support-owned field decision
       ↓
Required Support action
       ↓
Reusable knowledge decision
```

The primary design question is:

> Is the current Support-owned retrospective field defensible from the available evidence, and what exactly should Support do?

---

# 2. Current Runtime Model

The implementation is currently one self-contained browser script.

Header behavior:

```text
XSUP Retrospective Auditor v1
Chrome DevTools Snippet
TACopilot-hosted page only
```

The script explicitly checks:

```javascript
location.hostname.includes("taco-dashm.paloaltonetworks.com")
```

If the script is not running on TACopilot, it stops.

This is intentional.

The snippet relies on:

- existing TACopilot authentication
- same-origin TACopilot endpoints
- currently rendered TACopilot HTML
- browser APIs such as `fetch`, `DOMParser`, `Blob`, clipboard, and optional `showDirectoryPicker`

It does not contain credentials.

---

# 3. Runtime Constants

Important constants in v1:

```text
VERSION = 3.5.0

POLL_MS = 5000
ANALYSIS_TIMEOUT_MS = 20 minutes
CHAT_TIMEOUT_MS = 15 minutes
NO_PROGRESS_WARNING_MS = 3 minutes
NO_RESPONSE_WARNING_MS = 60 seconds

AUDIT_REUSE_SCHEMA = support-field-review-v1
KNOWLEDGE_REUSE_SCHEMA = knowledge-artifact-v1

Audit workers = 2
Knowledge workers = 1
```

The audit and knowledge reuse schemas are intentionally independent from the UI version.

This is important.

A visual change such as:

- card layout
- tooltip
- button label
- report styling

should not force a new AI analysis.

A reuse schema should change only when the underlying reasoning methodology or factual input contract changes.

---

# 4. High-Level Architecture

```text
┌───────────────────────────────┐
│ Chrome DevTools Snippet       │
│ running inside TACopilot      │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ XSUP → SFDC resolver          │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ TACO investigation manager    │
│ start / wait / reuse / update │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ Original case evidence        │
│ Jira + SFDC via TACopilot DOM │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ Evidence selector             │
│ bounded Case Chat payload     │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ Audit Case Chat               │
│ reuse / wait / generate       │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ Deterministic parser / checks │
└──────────────┬────────────────┘
               │
               ├───────────────┐
               │               │
               ▼               ▼
┌──────────────────┐  ┌──────────────────────┐
│ Audit HTML       │  │ Knowledge decision   │
│ Review comment   │  └──────────┬───────────┘
└──────────────────┘             │
                                 ▼
                      ┌──────────────────────┐
                      │ Knowledge Case Chat  │
                      │ reuse/wait/generate  │
                      └──────────┬───────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │ Knowledge artifact   │
                      │ HTML / copy / save   │
                      └──────────────────────┘
```

---

# 5. Main TACopilot Endpoints Used

The current code uses same-origin TACopilot endpoints.

## XSUP search / mapping

```text
GET /taco/search?q={XSUP}
```

Used to identify Salesforce case candidates.

---

## Case HTML

```text
GET /taco/case/{caseNumber}
```

Used for:

- original Jira / Salesforce comments
- evidence timestamps
- Jira link
- Salesforce link
- TACopilot case link

This page is parsed with `DOMParser`.

---

## Investigation listing

```text
GET /taco/pilot/investigation/{caseNumber}
```

Used to find existing TACO investigations.

---

## Start TACO

```text
POST /taco/pilot/investigation/{caseNumber}/start
```

No special body is required in the current flow.

---

## Update / refresh existing TACO

```text
POST /taco/pilot/investigation/{caseNumber}/update
```

Body:

```json
{
  "investigation_id": 1234,
  "engineer_guidance": null
}
```

---

## TACO task status

```text
GET /taco/pilot/investigation/task/{taskId}
```

---

## TACO progress

```text
GET /taco/pilot/investigation/{caseNumber}/progress?investigation_id={id}
```

---

## TACO report

```text
GET /taco/pilot/investigation/{caseNumber}/report/{investigationId}
```

---

## Case Chat history

```text
GET /taco/pilot/investigation/{caseNumber}/followup?investigation_id={investigationId}
```

Important detail:

Stored history rows currently use:

```text
id
question
answer
status
created_at
```

Do not assume the identifier is always `followup_id`.

v1 accepts both:

```text
id
followup_id
```

---

## Create Case Chat follow-up

```text
POST /taco/pilot/investigation/{caseNumber}/followup
```

Body:

```json
{
  "question": "...",
  "investigation_id": 1234
}
```

The response returns a task ID.

---

## Case Chat follow-up status

```text
GET /taco/pilot/investigation/{caseNumber}/followup/status/{followupId}
```

Used when a result is still running or when the history payload does not already provide the final answer.

---

# 6. State Model

The top-level `state` object holds:

## Selected-job mirrors

These allow existing renderers to operate on the selected job:

```text
xsup
caseNumber
investigationId
report
evidence
auditAnswer
xsupComment
references
targetLinks
lastPrompt
```

---

## Batch runtime

```text
jobs: Map
queue: []
selectedXsup
viewMode
concurrency: 2
activeCount
running
stopped
controller
```

Every XSUP is represented as a job object.

---

## Storage state

```text
saveDirectoryHandle
saveDirectoryName
fileSystemAccessSupported
autoSaveCompleted
```

The directory handle is kept in memory only.

It is intentionally not serialized into session JSON.

---

## Knowledge runtime

```text
autoGenerateKnowledge
knowledgeConcurrency: 1
knowledgeQueue
knowledgeActiveCount
```

Knowledge runs independently from the audit worker pool.

This prevents a slow knowledge draft from blocking other XSUP audits.

---

# 7. Job Lifecycle

Each job moves through stages such as:

```text
queued
running
needs_selection
completed
failed
stopped
```

The visible execution pipeline is:

```text
Resolve SFDC
TACO Analysis
Original Evidence
Retrospective Audit
Knowledge Artifact
Artifact Download / Save
```

State colors are intended to mean:

```text
green  = completed
blue   = active/running
grey   = pending
amber  = waiting/input required
red    = failed
```

---

# 8. XSUP → SFDC Resolution

Relevant functions include:

```text
resolveXSUPCandidates
resolveXSUP
extractSalesforceCaseUrlFromHtml
candidateContainer
showSFDCChooser
chooseSFDC
```

The resolver uses TACopilot search rather than calling Jira/Salesforce directly.

This preserves same-origin browser behavior and existing user permissions.

Important rule:

> Never fabricate or guess a Salesforce case.

If the resolver returns multiple plausible candidates, the reviewer is asked to choose.

---

# 9. Original Evidence Collection

Function:

```text
collectCaseEvidence()
```

The tool downloads TACopilot case HTML and extracts elements matching:

```javascript
[id^="comment-"]
```

Comment classification is based on DOM attributes.

Current categories:

```text
JIRA_COMMENT
JIRA_TICKET_EVENT
SFDC_INTERNAL
SFDC_CUSTOMER_PUBLIC
SFDC_TAC_PUBLIC
```

The classification logic uses attributes such as:

```text
data-is-jira
data-is-external
data-is-internal
```

Special handling exists for:

```text
comment-jira-ticket
```

which is treated as a Jira ticket event rather than a normal Jira comment.

---

# 10. Evidence Timestamps

The tool attempts to extract timestamps from case comment elements.

The latest original evidence timestamp is calculated from the normalized records.

This timestamp is important for TACO freshness.

The tool deliberately does **not** call Jira REST directly from the TACopilot browser context.

Current rule:

> Use Jira/SFDC timestamps already exposed through TACopilot.

Direct cross-origin Jira REST calls should not be introduced unless the supported application architecture and browser security model explicitly support them.

---

# 11. TACO Freshness Algorithm

Core function:

```text
determineTacoFreshness()
```

Important logic order:

## First: Is there a usable final TACO report?

If yes, the completed report is evaluated before ambiguous progress state.

This prevents a completed investigation from being incorrectly displayed as “running / waiting”.

## Then compare freshness

If both timestamps are known:

```text
latest original case evidence > TACO analysis time
    → refresh
else
    → reuse
```

A one-minute tolerance is currently used in the comparison.

## If evidence timestamp cannot be established

A complete usable TACO analysis is reused rather than refreshing unnecessarily.

The UI explains the uncertainty.

## If no usable report exists and TACO is genuinely running

Wait for the existing run.

## If TACO failed or is unusable

Refresh.

## Manual override

`Re-analyze All` forces TACO refresh and deliberately invalidates downstream audit/knowledge reuse.

---

# 12. Evidence Selection for Case Chat

The tool does not send the entire case history to Case Chat.

A previous large prompt produced a service-side 422 error.

The current evidence selector is intentionally bounded.

Functions:

```text
keywordsFromAnalysis
scoreRecord
isNoiseRecord
selectEvidence
formatRecords
```

TACO conclusion / RCA / hypotheses are used to derive technical keywords.

Records are scored for relevance.

Noise patterns are filtered, for example:

- automated approval messages
- log bundle processing messages
- operational upload statistics
- generated assistant report notifications

Current approximate Case Chat evidence target:

```text
Jira                 up to 12
SFDC internal         up to 7
TAC public            up to 8
Customer public       up to 5
--------------------------------
Total target          ~32 records
```

Selection attempts to preserve:

- early records
- late records
- technically relevant records

Every selected record is truncated to approximately 1050 characters in the prompt.

Important distinction:

The **full evidence set** is still used for reuse fingerprinting.

The **selected evidence set** is used for the bounded Case Chat prompt.

Both fingerprints matter.

---

# 13. Audit Prompt Philosophy

Function:

```text
buildAuditPrompt()
```

The audit prompt explicitly tells Case Chat:

> TACO already performs broad case analysis. Do NOT create another general SFDC case-quality review.

The audit is centered on Support-owned fields.

Current XDR/XSIAM prompt scope:

```text
Resolution = applicable
RCA = not applicable unless explicitly in scope
Fix Type = not applicable unless explicitly in scope
Flag/Label = not applicable unless explicitly in scope
```

The prompt requires detailed field output.

For an applicable field it asks for:

```text
Current Value
Verdict
Change Required
Recommended Value
Detailed Explanation
Supporting Evidence
Support Action
```

This is intentional.

The UI should never rely on a bare `Correct`, `YES`, or `NO`.

---

# 14. Evidence Provenance Rules in the Prompt

The audit prompt distinguishes:

## TACO

Derived technical analysis.

Examples:

- conclusion
- RCA
- hypotheses
- guidance
- recommended actions
- generated customer response

## Jira / SFDC

Original case evidence.

The prompt tells the model:

- original records are required when claiming what Engineering/TAC/customer said
- TACO Customer Response is not proof that it was sent
- selected excerpts cannot prove absence
- use UNDETERMINED when evidence is insufficient
- do not infer AI usage from writing style
- avoid subjective engineer-quality labels
- explain why behavior is described as abnormal/inconsistent/worse/customer-specific

This provenance boundary is a critical invariant.

Do not weaken it in future prompt revisions.

---

# 15. Technical Labels

The audit supports:

## Technical Conclusion Evidence

```text
SUPPORTED
NOT SUPPORTED
UNDETERMINED
```

Meaning:

Does the available evidence support the technical conclusion?

It is not a score of TAC quality.

---

## Engineering Confirmation

```text
YES
NO
PARTIAL
UNDETERMINED
```

Meaning:

Does original Engineering evidence independently confirm the technical conclusion?

---

# 16. Audit Output Parsing

Functions:

```text
extractField
normalizeAuditConsistency
applyAuditResult
```

`applyAuditResult()` is the shared parser used for the normal audit path.

It extracts fields such as:

```text
Reviewed Fields
Resolution Change Needed
Resolution Verdict
Resolution Detailed Explanation
Resolution Recommended Value

RCA ...
Fix Type ...
Flag / Label ...

Technical Conclusion Evidence
Engineering Confirmation

Primary Knowledge Action
Secondary Knowledge Action
Artifact Readiness
Artifact Type
Knowledge Decision Explanation
```

The parser also generates the Review Paste Comment and references.

Future developers should keep one central parser.

Do not create separate parsing logic for:

- normal audit
- retry
- restored session
- batch path

because duplicated parsers drift quickly.

---

# 17. Deterministic Audit Consistency

Function:

```text
normalizeAuditConsistency()
```

This layer exists because prompt instructions alone are not always sufficient.

An earlier issue allowed:

```text
source date = Unknown
```

while simultaneously returning:

```text
Available Before Escalation = YES
```

The tool now favors deterministic correction when structured output contradicts known evidence.

Future principle:

> Wherever a critical consistency rule can be enforced deterministically, enforce it after the LLM result rather than depending only on prompt wording.

---

# 18. Review Paste Comment

Function:

```text
buildReviewPasteComment()
```

The comment heading is generic:

```text
XSUP APAC Retrospective Review — XSUP-xxxxx
```

It includes the actual reviewed fields.

It should not be hardcoded to only “Resolution Review”.

The tool does not post this comment automatically.

---

# 19. Smart Case Chat Reuse

Smart Case Chat reuse is a core part of the design.

Goal:

Avoid duplicate Audit and Knowledge Case Chat requests across:

- repeated runs
- browser refreshes
- different reviewers
- different browsers

when the server-side result is still valid.

---

# 20. Audit Reuse Fingerprint

Functions:

```text
stableHashText
evidenceReuseSignature
selectedEvidenceReuseSignature
tacoReuseSignature
buildAuditReuseMeta
```

The audit fingerprint incorporates:

```text
audit reuse schema
XSUP
SFDC case
TACO investigation ID
full evidence signature
focused evidence signature
TACO synthesized report signature
latest evidence timestamp
TACO timestamp
```

This is deliberately more conservative than checking only a timestamp.

Why?

Because comment content may change even when a simple freshness heuristic is insufficient.

---

# 21. Knowledge Reuse Fingerprint

Function:

```text
buildKnowledgeReuseMeta()
```

Knowledge is versioned independently from the audit.

Inputs include:

```text
knowledge reuse schema
XSUP
SFDC
investigation
audit fingerprint/content
knowledge action
artifact type
artifact readiness
```

This allows:

```text
Audit       → REUSED
Knowledge   → NEW
```

when only the knowledge-generation method or artifact decision changed.

---

# 22. Reuse Marker

The request contains metadata in the form:

```text
[XSUP-AUDITOR-META]
type=audit
schema=support-field-review-v1
fingerprint=...
...
```

or:

```text
type=knowledge
schema=knowledge-artifact-v1
...
```

Functions:

```text
buildReuseMarker
appendReuseMarker
parseReuseMarker
```

The marker allows a later browser/reviewer to identify whether an existing Case Chat corresponds to the exact current inputs.

---

# 23. Case Chat History Parsing

Functions:

```text
getFollowupHistory
collectFollowupHistoryItems
findReusableFollowupCandidate
latestLikelyAuditorFollowup
latestAuditorFollowup
```

TACopilot Case Chat history is expected to expose stored rows with fields such as:

```text
id
question
answer
status
created_at
```

Some task or status responses can expose the identifier as:

```text
followup_id
```

The collector therefore accepts both identifier shapes:

```javascript
v.followup_id ?? v.id
```

with a guard that the object must resemble a follow-up record.

This compatibility should be preserved because history and task/status response shapes are not guaranteed to be identical.

---

# 24. Completed Case Chat Direct Reuse

Function:

```text
tryReuseCaseChat()
```

Completed-history behavior:

If history already provides:

```text
status = completed
answer = full answer
```

the tool validates and reuses that history answer directly.

It does not make a redundant follow-up status request.

If the history result is:

```text
pending / running / queued / processing
```

the tool waits for the existing result.

This avoids creating a duplicate message when another reviewer already started the same exact audit.

---

# 25. Reuse Validation

A matching fingerprint is necessary but not sufficient.

Stored answers are validated.

Functions:

```text
validateReusableAuditAnswer
validateReusableKnowledgeAnswer
```

Audit validation checks examples such as:

```text
Target Ticket
Reviewed Fields
Resolution Change Needed
Resolution Verdict
Primary Knowledge Action
Artifact Readiness
```

Knowledge validation checks:

- minimum useful content
- expected artifact structure
- target XSUP when identifiable

If the stored answer fails structural validation:

```text
do not reuse
→ generate a new result
```

---

# 26. Safe Reuse Failure Mode

If history cannot be read:

```text
generate a fresh result
```

If fingerprint does not match:

```text
generate a fresh result
```

If TACO changed:

```text
generate a fresh audit
```

If original evidence changed:

```text
generate a fresh audit
```

If audit changed:

```text
generate fresh knowledge
```

This conservative fallback is intentional.

The tool should waste some AI usage rather than silently return a stale retrospective decision.

---

# 27. Re-analyze All

Visible manual action:

```text
Re-analyze All
```

Implementation starts from `forceReanalyzeTaco()`.

It sets:

```text
forceTacoRefresh = true
forceAuditRefresh = true
forceKnowledgeRefresh = true
```

Then the full chain is rerun.

Do not use this to solve a report-download problem.

Downloaded HTML is presentation.

Case Chat answer is reusable content.

---

# 28. Analysis & Reuse Status UI

The top status area reports:

```text
TACO Analysis
Retrospective Audit
Knowledge Artifact
```

Each can display source state such as:

```text
REUSED EXISTING
NEWLY GENERATED
NEW / REFRESHED
CHECKING
FAILED
```

The UI should show:

- source state
- Case Chat ID when relevant
- original completion date
- reuse/regeneration reason
- previous historical result when useful

This exists so reviewers can distinguish:

> “I am looking at an old answer”

from:

> “The tool deliberately verified and reused the current answer.”

---

# 29. Knowledge Decision

Possible primary values:

```text
CREATE KCS
UPDATE EXISTING KCS
UPDATE ADMIN/TECH GUIDE
CREATE/UPDATE RUNBOOK
KNOWN ISSUE/RELEASE NOTE
NO KNOWLEDGE ACTION
UNDETERMINED
```

Possible readiness:

```text
READY
DRAFTABLE
NOT READY
NOT APPLICABLE
```

Do not reintroduce generic UI language like:

```text
KCS READY
```

for non-KCS artifacts.

Readiness belongs to the selected artifact.

---

# 30. Knowledge Artifact Mapping

Function:

```text
knowledgeArtifactType()
```

Mapping:

```text
CREATE KCS
    → KCS_DRAFT

UPDATE EXISTING KCS
    → KCS_UPDATE

UPDATE ADMIN/TECH GUIDE
    → DOC_UPDATE

CREATE/UPDATE RUNBOOK
    → RUNBOOK

KNOWN ISSUE/RELEASE NOTE
    → KNOWN_ISSUE
```

Artifact generation requires readiness:

```text
READY
or
DRAFTABLE
```

---

# 31. Knowledge Prompt Safety

Function:

```text
buildKnowledgePrompt()
```

The retrospective audit is treated as the factual boundary.

The prompt must prevent unsupported additions such as:

- exact product versions
- exact PowerShell commands
- registry paths
- event IDs
- exclusion paths
- service names
- UI navigation
- API paths
- expected values
- remediation procedure

unless those details are explicitly supported.

If a potentially useful detail is not established:

```text
omit it
or
mark it TAC/SME/documentation validation required
```

This rule applies to Admin/Tech Guide drafts too, not only KCS.

---

# 32. Knowledge Worker

Functions:

```text
shouldGenerateKnowledge
queueKnowledgeArtifact
processKnowledgeJob
pumpKnowledgeQueue
```

Knowledge uses a separate worker pool:

```text
knowledgeConcurrency = 1
```

The audit queue can continue while knowledge is being created.

This is deliberate load control.

---

# 33. HTML Rendering and Safety

Functions include:

```text
escapeHtml
safeUrl
renderInlineMarkdown
safeMarkdownToHtml
htmlDoc
selectedJobReportHtml
knowledgeArtifactHtml
```

Important safety rule:

Do not do this:

```javascript
output.innerHTML = caseChatResponse
```

Raw AI output must not be injected directly into HTML.

The current renderer:

- escapes HTML
- allows limited Markdown formatting
- only links safe http/https URLs
- opens links with `noopener noreferrer`

Maintain this safety boundary.

---

# 34. Custom Tooltips

Functions:

```text
hideAuditorTooltip
showAuditorTooltip
installAuditorTooltipHandlers
```

Native browser `title` tooltips proved unreliable inside the managed UI.

Current help icons use:

```text
data-tooltip
```

with a floating body-level tooltip.

The tooltip supports:

- mouse hover
- keyboard focus
- Escape to close
- dynamic content rendered after initial page load

---

# 35. Storage Architecture

Default:

```text
browser download
```

Optional:

```text
showDirectoryPicker()
```

Functions:

```text
browserDownload
directoryPermissionState
writeToSelectedDirectory
saveArtifact
chooseSaveFolder
```

Behavior:

```text
folder selected
    → auto-save there

no folder
    → browser download
```

If direct folder writing fails:

```text
fallback to browser download
```

The tool does not:

- silently select a path
- embed Google Drive OAuth
- embed OneDrive auth
- persist a directory handle in JSON

Drive for Desktop / OneDrive work because they appear as normal local folders.

---

# 36. Download vs Save Semantics

Important UI principle:

## Explicit Download

Always means normal browser download.

## Copy

Always means clipboard.

## Automatic save

Uses:

```text
selected folder if available
otherwise browser download
```

Keep these behaviors separate.

The design mixed these concepts and caused confusing failures.

---

# 37. Report Filenames

The naming strategy includes:

- XSUP
- SFDC case
- timestamp
- artifact purpose

Example style:

```text
XSUP-72446_SFDC-04005807_20260828-1220_Retrospective_Audit.html
```

Knowledge uses the corresponding artifact type.

Do not create a separate directory per XSUP unless the workflow is explicitly changed.

---

# 38. Session Save / Restore

Functions:

```text
exportSessionObject
saveAuditSession
sanitizeRestoredJob
restoreAuditSessionFromObject
openRestoreSessionPicker
handleRestoreSessionFile
```

Schema:

```text
xsup-auditor-session-v1
```

If an audit was running when saved, restore it as:

```text
stopped
```

Do not restore previous network state as if the request were still active.

Knowledge `queued` / `generating` is also restored as stopped.

Directory handles are never restored.

---

# 39. Debug Export

Function:

```text
downloadDebug()
```

The debug file can contain:

- XSUP
- SFDC
- investigation ID
- review decisions
- TACO freshness
- storage mode
- knowledge decision/result
- normalized evidence
- selected TACO report sections
- final audit
- review paste comment
- references
- target links

Debug files can contain sensitive case data.

Do not commit them to GitHub.

---

# 40. Current UI Sections

Main interface areas include:

- XSUP input
- queue
- live dashboard
- selected-job detail
- analysis & reuse status
- execution pipeline
- review decisions
- knowledge artifact
- report storage
- Review Paste Comment
- references
- Help & Methodology

The Review Decisions layout was intentionally changed to full-width rows because long explanations are easier to read than compact cards.

---

# 41. Dashboard Philosophy

The dashboard should emphasize Support-owned outcomes.

Useful columns/statistics include:

- XSUP
- SFDC
- progress
- current activity
- last update
- reviewed fields
- Resolution verdict
- change needed
- knowledge artifact
- elapsed
- failed

Avoid turning the dashboard into a generic “TAC quality” scoreboard.

---

# 42. Product Policy — Current and Planned

## XDR / XSIAM current

Current validated retrospective trigger:

```text
Resolution = Functions as designed
```

## Cortex Cloud planned

Known candidate policy can include:

```text
Resolution:
Duplicate
Not a Bug
Environment/Config issue
Invalid
Functions as designed
Non Issue

or
RCA = User Error
```

## XSOAR planned

Known candidate policy can include:

```text
Label = Session_candidate
or
Fix Type = None / Functions as designed
```

Do not enable these as production behavior until field extraction and applicability have been validated.

---

# 43. Known Technical Constraints

## CSP

TACopilot's managed browser CSP blocks arbitrary cross-origin fetches.

Prefer same-origin TACopilot endpoints.

## Case Chat prompt size

Very large Case Chat payloads can fail.

Keep evidence bounded.

## DOM dependence

Case evidence extraction currently relies on TACopilot HTML structure.

Changes to:

```text
comment-* IDs
data-is-* attributes
timestamp presentation
```

may require parser updates.

## Private endpoint contract

The tool uses observed TACopilot endpoint shapes.

Those shapes can change.

Defensive parsing is important.

## Cross-user Case Chat reuse

The design supports server-side reuse.

Actual reuse across SMEs depends on TACopilot permissions allowing the current reviewer to read the same investigation/follow-up history.

---

# 44. Functions by Responsibility

The source is currently a single file with roughly 180+ functions.

Major groups:

## Common / safety

```text
request
cleanText
escapeHtml
safeUrl
safeMarkdownToHtml
showToast
```

## XSUP / SFDC

```text
resolveXSUPCandidates
resolveXSUP
extractSalesforceCaseUrlFromHtml
```

## TACO

```text
getInvestigations
latestInvestigation
startAnalysis
updateAnalysis
getProgress
getReport
reportReady
waitForAnalysis
determineTacoFreshness
```

## Evidence

```text
classifyComment
collectCaseEvidence
latestEvidenceTimestamp
keywordsFromAnalysis
selectEvidence
formatRecords
```

## Audit

```text
buildAuditPrompt
postFollowup
waitForFollowup
normalizeAuditConsistency
applyAuditResult
buildReviewPasteComment
```

## Reuse

```text
stableHashText
evidenceReuseSignature
selectedEvidenceReuseSignature
tacoReuseSignature
buildAuditReuseMeta
buildKnowledgeReuseMeta
getFollowupHistory
collectFollowupHistoryItems
findReusableFollowupCandidate
tryReuseCaseChat
```

## Knowledge

```text
normalizeArtifactReadiness
knowledgeArtifactType
knowledgeArtifactLabel
buildKnowledgePrompt
queueKnowledgeArtifact
processKnowledgeJob
```

## UI

```text
renderDashboard
renderJobList
renderExecutionPipeline
renderReuseSummary
renderDecisionSummary
renderKnowledgeArtifact
renderSelectedJob
```

## Storage

```text
browserDownload
writeToSelectedDirectory
saveArtifact
downloadJobReport
downloadKnowledgeArtifact
saveAuditSession
restoreAuditSessionFromObject
```

---

# 45. Development Invariants

Future developers and AI maintainers should preserve these rules.

## Invariant 1 — Original evidence vs derived analysis

Never merge the two concepts.

## Invariant 2 — Unknown means unknown

Do not convert missing dates or missing evidence into confident YES/NO statements.

## Invariant 3 — Field applicability is product-specific

Do not require RCA/Fix Type/Flag for every XSUP.

## Invariant 4 — Reuse is input-based

Do not reuse simply because a previous result exists.

## Invariant 5 — UI versions do not invalidate analysis

Use reuse schemas for reasoning changes.

## Invariant 6 — Download does not require AI rerun

Stored Case Chat content can be rendered again locally.

## Invariant 7 — Knowledge must be source-locked

No plausible-but-unsupported commands/configuration.

## Invariant 8 — Safe failure is preferable

When history/evidence cannot be verified, generate a fresh result or return UNDETERMINED.

## Invariant 9 — No credential storage

Use current authenticated TACopilot context.

## Invariant 10 — No security bypass

Never design around corporate browser/CSP controls by bypassing them.

---

# 46. When to Increment Reuse Schemas

## Increment `AUDIT_REUSE_SCHEMA` when:

- audit prompt changes materially
- new field decision logic can produce different verdicts
- evidence provenance rules change
- product applicability changes
- deterministic audit normalization changes materially

Do not increment it for:

- colors
- layout
- tooltips
- wording of buttons
- download filenames

## Increment `KNOWLEDGE_REUSE_SCHEMA` when:

- knowledge factual boundary changes
- artifact structure changes materially
- KCS/Admin Guide/Runbook methodology changes
- validation expectations change materially

---

# 47. Recommended Refactoring Direction

The current self-contained snippet is acceptable for deployment simplicity.

However, long-term maintainability would improve if logically separated into modules such as:

```text
01-config
02-state
03-common-utils
04-xsup-resolution
05-tacopilot-api
06-evidence
07-taco-freshness
08-audit-prompt
09-audit-parser
10-audit-validation
11-reuse
12-knowledge
13-storage
14-job-queues
15-progress
16-ui
17-help
18-debug
19-tests
```

If modularized, preserve the ability to publish a single bundled snippet for users.

---

# 48. Testing Checklist

Minimum before releasing a new version:

## Syntax

```text
node --check
```

## Static checks

- duplicate top-level function names
- obsolete strings
- stale old-version fields
- blocked direct Jira REST calls
- unsafe raw innerHTML
- missing handler IDs
- invalid knowledge mappings

## Targeted behavioral tests

- XSUP parsing
- multiple SFDC candidate handling
- TACO reuse
- TACO refresh after newer evidence
- TACO existing-active wait
- audit fingerprint stability
- changed evidence invalidates audit
- changed TACO invalidates audit
- knowledge reuse after identical audit
- changed audit invalidates knowledge
- completed Case Chat history reuse
- active duplicate Case Chat wait
- invalid stored result rejected
- report download
- folder fallback
- session restore

## Browser smoke tests

Where possible validate:

- panel renders
- Help opens
- repo link works
- custom tooltips work
- buttons call expected handlers
- dynamic decision UI renders

---


# 49. Future Work

Planned or useful improvements:

## Product support

- Cortex Cloud retrospective policy
- XSOAR retrospective policy
- automatic product-specific field applicability

## Tracking

- approved Watcher or internal telemetry endpoint
- completed XSUP count
- TACO reused/refreshed
- Audit reused/generated
- Knowledge reused/generated

Telemetry should be:

- non-blocking
- privacy-minimized
- free of customer case content

## Distribution

- official repository
- versioned source
- release process
- update mechanism
- possibly supported extension/app architecture if corporate policy allows

## Knowledge workflow

- publication owner workflow
- stronger deterministic source validation
- link to existing knowledge item
- duplicate KCS detection

---

# 50. Future AI Maintainer Handoff

If an AI assistant is asked to modify this project, it should first establish:

1. Current source version.
2. Current product scope.
3. Current known-good Case Chat/TACO endpoint shapes.
4. Whether the requested change affects UI only or reasoning methodology.
5. Whether the audit reuse schema needs to change.
6. Whether the knowledge reuse schema needs to change.
7. Whether the change affects original-vs-derived evidence provenance.
8. Whether it can create stale or overconfident conclusions.
9. Whether it changes storage or security behavior.
10. Whether it needs browser-level validation.

Before changing code, the AI should read:

```text
README.md
docs/TECHNICAL_GUIDE.md
CHANGELOG.md
current source file
latest QA summary
```

Do not rely only on an old conversation summary when current source is available.

---

# 51. Information That Should Never Be Invented

Future analysis must not guess:

- Salesforce case mapping
- Jira field applicability
- source creation date
- pre-escalation knowledge availability
- customer message delivery
- exact product command
- registry path
- UI path
- event ID
- supported product version
- remediation sequence
- Case Chat reuse match

If not proven:

```text
UNDETERMINED
```

or generate a fresh analysis.

---

# 52. Repository Guidance

Security and governance documentation should remain first-class repository content:

```text
README.md
DISCLAIMER.md
docs/FAQ.md
docs/SECURITY_AND_USAGE.md
docs/TECHNICAL_GUIDE.md
```

The README gives the short trust/safety position. The detailed security and compliance caveats belong in `docs/SECURITY_AND_USAGE.md`. The legal/governance-style caution belongs in `DISCLAIMER.md`.

Do not claim formal InfoSec/security approval inside the source or documentation unless it has actually been granted.



Recommended initial repository structure:

```text
xsup-auditor/
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── NOTICE.md
├── src/
│   └── xsup-auditor.js
├── docs/
│   ├── TECHNICAL_GUIDE.md
│   ├── METHODOLOGY.md
│   ├── SMART_REUSE.md
│   ├── KNOWLEDGE_ARTIFACTS.md
│   ├── TROUBLESHOOTING.md
│   └── DATA_HANDLING.md
└── tests/
```

Keep the repository private while it contains internal implementation details.

Do not commit real customer evidence.

---

# 53. Current Repository Link

The auditor Help UI currently points to:

https://github.com/smuruhesan/xsup-auditor

If the repository owner/path changes, update:

```javascript
REPO_URL
```

in the source and this documentation.

---

# 54. Final Technical Summary

The current system can be summarized as:

```text
Browser-resident orchestrator
+ TACopilot same-origin APIs
+ DOM-based original evidence extraction
+ smart TACO freshness
+ bounded evidence selection
+ evidence-controlled Case Chat audit
+ deterministic output parsing
+ fingerprint-based server-side reuse
+ independent knowledge generation/reuse
+ safe HTML rendering
+ local download/folder storage
```

The most important long-term principle is:

> The auditor must be more conservative than the model it orchestrates.

TACO and Case Chat can reason broadly.

The auditor is responsible for deciding when evidence is sufficient, when a previous result is still current, what Support-owned field is actually applicable, and when the safe answer is simply UNDETERMINED.
