# Validation Checklist

Use this checklist before a release update or after a meaningful source/workflow change.

## Runtime / packaging

- [ ] JavaScript syntax passes
- [ ] `src/xsup-auditor.js` is the intended release source
- [ ] `dist/XSUP_Auditor_JS.txt` matches the JavaScript source
- [ ] bookmark installer decoded payload matches the JavaScript source
- [ ] protected internal identifiers remain expected
- [ ] bookmark runs only from the intended authenticated TACO/TACopilot path
- [ ] panel renders without uncaught Auditor errors

## Preflight / staging

- [ ] Load XSUPs stages jobs without starting generation
- [ ] Load as KCS Only stages direct-KCS jobs
- [ ] per-row Workflow selection works
- [ ] per-row Run Mode selection works
- [ ] Run Selected runs only checked staged rows
- [ ] Choose SFDC pauses only the affected row
- [ ] manual SFDC fallback works when automatic mapping is unavailable
- [ ] product confirmation pauses only the affected row

## Worker / concurrency behavior

- [ ] XSUP/TACO worker selector supports 2 / 3 / 5 / 10
- [ ] default XSUP/TACO worker count is 2
- [ ] two Knowledge workers can operate independently
- [ ] shared Case Chat generation cap remains 2
- [ ] higher XSUP/TACO worker selection does not bypass the Case Chat cap
- [ ] Knowledge work does not unnecessarily block XSUP/TACO collection work

## TACO

- [ ] usable current TACO can be reused
- [ ] active selected TACO creates a hard downstream wait barrier
- [ ] missing TACO can start automatically
- [ ] explicit Regenerate TACO starts a fresh analysis
- [ ] Stop All cancels local wait/polling as far as possible
- [ ] server-side work already accepted is not falsely reported as cancelled

## Automatic reuse

- [ ] exact compatible completed Audit can be reused in Automatic mode
- [ ] exact compatible Knowledge can be reused in Automatic mode
- [ ] newer Jira/SFDC evidence prevents stale downstream reuse
- [ ] product mismatch prevents incompatible downstream reuse
- [ ] failed prior result is not reused as successful
- [ ] code/UI change alone does not automatically force regeneration

## Explicit Regenerate semantics

- [ ] Regenerate Audit produces a fresh Audit Case Chat
- [ ] Regenerate Audit does not reuse an exact old prompt/result
- [ ] Regenerate Knowledge produces fresh Knowledge
- [ ] Regenerate Knowledge does not reuse an exact old Knowledge prompt/result
- [ ] Regenerate Audit + Knowledge refreshes both stages
- [ ] Regenerate KCS refreshes direct-KCS output
- [ ] TACO remains reusable unless the Run Mode explicitly requests fresh TACO
- [ ] Audit-only and KCS-only modes expose only applicable Run Modes

## Audit

- [ ] correct product policy applied
- [ ] only applicable Support-owned fields reviewed
- [ ] current saved field values come from trusted structured data only
- [ ] technical assessment is independent of saved current value
- [ ] TACO-generated customer response is not treated as proof of sent communication
- [ ] source/evidence boundaries are preserved
- [ ] Review Paste Comment remains concise and actionable
- [ ] backend-only identifiers are not unnecessarily exposed in human-facing summary text

## Knowledge routing

- [ ] Knowledge Worthiness evaluated before CREATE
- [ ] no Salesforce KCS found does not automatically mean CREATE
- [ ] actual Salesforce KCS candidate identity is preserved
- [ ] canonical Salesforce `Knowledge__kav/.../view` URL used
- [ ] Markdown/link residue cannot corrupt KCS href
- [ ] existing KCS coverage and missing content captured
- [ ] identified KCS + meaningful overlap triggers mergeability gate
- [ ] mergeable overlap prefers UPDATE
- [ ] CREATE with overlap requires explicit DISTINCT-scope justification
- [ ] related docs/cases/Jira are not mislabeled as Salesforce KCS
- [ ] direct KCS can preserve/reference related existing KCS

## Knowledge quality

- [ ] independent quality review runs for fresh generation
- [ ] deterministic checks run after generation/review
- [ ] one bounded repair only
- [ ] derivative/AI-only material authority can block
- [ ] derivative source does not block solely because it exists when stronger original authority independently supports the claim
- [ ] exact commands/query/API/config/version details are validated or reviewed
- [ ] read-only API/JSON output is not incorrectly treated as runnable config
- [ ] equivalent runnable content receives consistent review state
- [ ] internal implementation detail is generalized/routed TAC-only unless maintained public authority supports reuse
- [ ] Source References present
- [ ] claim-level `[R#]` references work
- [ ] no internal reuse metadata leaks into publication body

## Cortex Brain export

- [ ] SME Validation Tools appear at the very bottom of KCS-family HTML
- [ ] controls are small/low-profile
- [ ] Copy for Cortex Brain works offline from saved HTML
- [ ] Download for Cortex Brain works offline from saved HTML
- [ ] Copy and Download use the same payload
- [ ] mandatory validation warning present
- [ ] `NOT PUBLICATION READY` present
- [ ] clean KCS title/body present
- [ ] Internal Notes — TAC Only preserved when present
- [ ] `[R#]` references preserved
- [ ] Source References preserved
- [ ] XSUP Auditor REVIEW/BLOCKER UI excluded
- [ ] final Cortex assessment asks for READY / CHANGES REQUIRED / BLOCK

## HTML / reports

- [ ] Audit HTML renders
- [ ] KCS Draft renders
- [ ] KCS Update Proposal renders
- [ ] Admin/Tech Guide proposal renders
- [ ] links are safe/canonical
- [ ] code fences render correctly
- [ ] ordered procedures remain correctly numbered
- [ ] review callouts do not corrupt headings/HTML attributes
- [ ] individual downloads work
- [ ] Download All / ZIP actions work where applicable

## Pilot-release acceptance

- [ ] no systemic Audit-generation failure
- [ ] no systemic Knowledge-generation failure
- [ ] Regenerate/Reuse behavior matches selected Run Mode
- [ ] questionable technical content is surfaced for REVIEW/BLOCKER instead of silently published
- [ ] generated KCS remains a draft requiring human/SME validation
- [ ] known minor UI/status/review-classification issues are documented rather than treated as publication approval
