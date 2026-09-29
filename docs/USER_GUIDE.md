# User Guide

This guide explains the v1.0 team-release workflow for **XSUP Auditor & KCS Generator**.

For the short overview, see the repository [README](../README.md).

## 1. Start the tool

### Recommended: Bookmark installer

Open:

`dist/XSUP_Auditor_Bookmark_Installer.html`

Install the **XSUP Auditor** bookmark, open an authenticated TACopilot/TACO page, then click the bookmark.

### Alternative: DevTools Snippet

Use:

- `src/xsup-auditor.js`, or
- `dist/XSUP_Auditor_JS.txt`

Run it from Chrome DevTools → Sources → Snippets while TACopilot is open.

## 2. Load work before running it

The v1.0 UI uses a preflight/staging step.

Use:

- **Load XSUPs** — normal retrospective/audit workflow.
- **Load as KCS Only** — direct KCS workflow.

Loading is read-only. It stages rows in the dashboard and does not start TACO, Audit or Knowledge generation.

You can use XSUP IDs, SFDC-only cases where supported by the workflow, or paired XSUP/SFDC input.

## 3. Configure each staged row

For each XSUP, choose:

### Workflow

- **Audit + Knowledge**
- **Audit only**
- **KCS only**

### Run Mode

For **Audit + Knowledge**:

- **Automatic — reuse valid results**
- **Regenerate Audit**
- **Regenerate Knowledge**
- **Regenerate Audit + Knowledge**
- **Regenerate TACO Analysis + Audit + Knowledge**

For **Audit only**:

- **Automatic — reuse valid Audit**
- **Regenerate Audit**
- **Regenerate TACO Analysis + Audit**

For **KCS only**:

- **Automatic — reuse valid KCS**
- **Regenerate KCS**
- **Regenerate TACO Analysis + KCS**

Select the rows you want and click **Run Selected**.

## 4. What Automatic means

Automatic mode checks freshness and compatibility before reuse.

It can reuse:

- a usable current TACO analysis;
- a compatible current Audit;
- a compatible current Knowledge artifact.

If newer Jira/SFDC evidence makes a downstream result stale, that downstream result is regenerated as required.

A local code/UI change alone does not force regeneration.

## 5. What Regenerate means

Explicit regeneration is an instruction to create a **fresh Case Chat result for the selected stage**.

- **Regenerate Audit** — fresh Audit using current valid TACO/evidence.
- **Regenerate Knowledge** — fresh Audit-selected Knowledge using the current valid Audit.
- **Regenerate Audit + Knowledge** — fresh Audit and fresh downstream Knowledge.
- **Regenerate KCS** — fresh direct-KCS output.
- **Regenerate TACO Analysis + ...** — fresh TACO plus the selected downstream work.

Explicit Regenerate options bypass the exact-prompt/history reuse safeguard for the selected stage. They should not silently reuse an old completed Case Chat result.

## 6. Product selection

The tool attempts to identify:

- XDR/XSIAM
- XSOAR
- Cortex Cloud

High-confidence selection continues automatically.

If the product is uncertain, only that row pauses for reviewer selection.

Changing the product invalidates incompatible Audit/Knowledge reuse but does not automatically require a fresh TACO analysis.

## 7. SFDC selection

When one confident XSUP → SFDC mapping exists, it is used automatically.

If multiple mappings are possible, only that row pauses for **Choose SFDC**.

If automatic mapping is unavailable, the current release can also request manual SFDC input without restarting the whole workflow.

## 8. TACO behavior

Possible TACO outcomes include:

- **Reuse** — usable analysis exists.
- **Wait** — a newer investigation is genuinely running.
- **Start** — no usable analysis exists.
- **Regenerate** — selected explicitly by Run Mode.

The downstream Audit/Knowledge flow does not bypass an active selected TACO investigation.

## 9. Worker settings

XSUP/TACO parallelism is selectable:

- 2
- 3
- 5
- 10

Default: **2**.

Knowledge generation uses **2 Knowledge workers**.

Regardless of the worker setting, Case Chat generation is capped at **2 simultaneous generations** across the queues.

## 10. Retrospective Audit

The Audit:

- summarizes the reported issue and evidence-backed finding;
- reviews only product-applicable Support-owned fields;
- preserves original-evidence boundaries;
- identifies TAC/Engineering learning;
- recommends the appropriate maintained Knowledge destination;
- creates the Review Paste Comment.

The Audit does not automatically change Jira/SFDC.

## 11. Knowledge routing

Knowledge is not created merely because no Salesforce KCS exists.

The Audit considers:

- Salesforce KCS
- maintained Admin/Tech documentation
- Confluence/internal guides
- runbooks
- known issue/release material
- prior Salesforce cases
- Jira/Engineering evidence

A real Salesforce KCS candidate is content-compared.

When meaningful overlap exists, UPDATE is preferred when the missing material can be cleanly absorbed. CREATE requires a distinct reusable scope.

## 12. Direct KCS mode

Direct **KCS only** skips the retrospective Support-owned field review.

It still uses:

- TACO/current source evidence;
- existing-KCS comparison;
- independent Knowledge quality review;
- deterministic safety checks;
- one bounded repair where appropriate;
- human validation.

If a relevant existing KCS is found, the workflow can surface the existing article and its coverage. A reviewer may still deliberately create a separate new KCS when the scope is genuinely distinct; the existing KCS should remain referenced.

## 13. Knowledge status

Generated Knowledge can be:

### READY

No material unresolved validation issue was identified by the automated quality workflow.

### DRAFTABLE / REVIEW

The draft is useful, but one or more named review items remain.

### NOT READY / BLOCKER

A usable draft exists, but a material issue must be resolved before publication/reuse.

A BLOCKER does not necessarily mean generation failed. It means the generated content must not be treated as publication-ready.

## 14. Downloaded KCS and Cortex Brain validation

At the very bottom of downloaded KCS-family HTML, SMEs see:

**SME Validation Tools**

with:

- **Copy for Cortex Brain**
- **Download for Cortex Brain**

The exported package includes:

- **MANDATORY VALIDATION — NOT PUBLICATION READY**
- a standardized independent-validation prompt;
- clean proposed KCS content;
- Internal Notes — TAC Only, when present;
- `[R#]` references;
- Source References.

The export intentionally removes XSUP Auditor REVIEW/BLOCKER UI so Cortex Brain can independently assess the technical content.

This validation is required before generated KCS content is published, copied into Salesforce Knowledge, sent to customers, or treated as authoritative.

## 15. Reports and downloads

The workflow can produce:

- Retrospective Audit HTML
- Review Paste Comment
- KCS Draft
- KCS Update Proposal
- Admin/Tech Guide Update Proposal
- Runbook / Known Issue / Release Note artifacts when selected

Browser Downloads are the default.

A reviewer-selected writable folder is optional.

## 16. Stop All

**Stop All** cancels local queued/running Auditor work and polling as far as possible.

A server-side TACO/Case Chat request that was already accepted may continue in TACopilot.

## 17. What to verify before acting

Before using a recommendation:

1. Confirm the correct XSUP/SFDC.
2. Confirm the selected product.
3. Read the Audit field decision and evidence.
4. Check the Knowledge action and existing-knowledge comparison.
5. Resolve all REVIEW/BLOCKER items.
6. Use the Cortex Brain validation export for KCS technical validation.
7. Follow the normal human publication/editorial process.

## 18. Pilot-release note

v1.0 is an internal team pilot.

Minor status wording or conservative review-classification differences may remain. For publication decisions, rely on the downloaded Knowledge artifact's detailed review/blocker content plus SME/Cortex validation—not a dashboard color/status by itself.

See [Troubleshooting](TROUBLESHOOTING.md) for common issues.
