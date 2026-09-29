# XSUP Auditor & KCS Generator

**v1.0 · Initial Team Release (internal pilot)**

XSUP Auditor & KCS Generator is an internal APAC Cortex TAC decision-support and Knowledge-generation tool. It runs inside TACopilot using the reviewer's existing authenticated session.

The v1.0 team release is intentionally a **pilot**: the core Audit/KCS generation workflow is ready for team use and feedback, while minor UI/status and review-classification refinements may continue in later updates.

The tool does **not** automatically modify Jira/SFDC and does **not** automatically publish Knowledge.

## Supported product profiles

- **XDR/XSIAM**
- **XSOAR**
- **Cortex Cloud**

## Main workflows

The current UI uses a preflight model:

1. **Load XSUPs** or **Load as KCS Only**.
2. Review each staged row.
3. Choose the **Workflow** and **Run Mode** for each XSUP.
4. Select the rows to run.
5. Click **Run Selected**.

### Workflow choices

- **Audit + Knowledge**
- **Audit only**
- **KCS only**

### Run Mode

For Audit + Knowledge:

- **Automatic — reuse valid results**
- **Regenerate Audit**
- **Regenerate Knowledge**
- **Regenerate Audit + Knowledge**
- **Regenerate TACO Analysis + Audit + Knowledge**

For Audit-only and KCS-only, the available choices are narrowed to the applicable stages.

**Regenerate means fresh generation for that selected stage.** Explicit Regenerate options bypass existing Case Chat reuse for the selected stage. Automatic mode keeps the safe reuse behavior.

## Quick Start

### Bookmark installer — recommended

Use:

`dist/XSUP_Auditor_Bookmark_Installer.html`

1. Open the HTML file locally in Chrome.
2. Show the bookmarks bar.
3. Drag the **XSUP Auditor** button to the bookmarks bar, or use **Copy bookmark URL**.
4. Open an authenticated TACopilot/TACO page.
5. Click the bookmark.
6. Load the XSUP/SFDC jobs, select Workflow/Run Mode, then click **Run Selected**.

### Direct source / DevTools Snippet

Use either:

- `src/xsup-auditor.js`
- `dist/XSUP_Auditor_JS.txt`

The `.txt` file contains the same JavaScript and is provided for managed environments where direct `.js` handling is inconvenient.

See [User Guide](docs/USER_GUIDE.md).

## Runtime / concurrency

XSUP/TACO worker parallelism is reviewer-selectable:

- **2** — default
- **3**
- **5**
- **10**

Knowledge generation uses **2 independent Knowledge workers**.

For service safety, **Case Chat generation remains capped at 2 simultaneous generations across the queues**, even when XSUP/TACO worker parallelism is increased.

## Retrospective Audit

The retrospective:

- resolves/validates XSUP and SFDC context;
- detects or asks for the product;
- reuses, waits for, starts or explicitly refreshes TACO as appropriate;
- uses original Jira/SFDC evidence and current TACO context;
- reviews only the Support-owned fields applicable to the selected product policy;
- produces reviewer-facing findings and a Review Paste Comment;
- determines whether a reusable Knowledge action is warranted.

Knowledge actions can include:

- `CREATE KCS`
- `UPDATE EXISTING KCS`
- `UPDATE ADMIN/TECH GUIDE`
- `CREATE/UPDATE RUNBOOK`
- `KNOWN ISSUE/RELEASE NOTE`
- `NO KNOWLEDGE ACTION`
- `UNDETERMINED`

Knowledge worthiness is evaluated separately from the ticket-field decision.

## Existing Knowledge / CREATE vs UPDATE

An existing Salesforce KCS is content-compared before a duplicate article is recommended.

When an existing KCS has meaningful overlap:

- **UPDATE is preferred when the existing article can absorb the missing reusable content.**
- **CREATE requires a distinct-scope justification** showing that merging would materially confuse or over-broaden the existing article.

Related product documentation, Confluence, prior cases, Jira and runbooks are treated as related knowledge, not automatically as an existing Salesforce KCS.

Dedicated **KCS only** mode still allows a reviewer to deliberately create a separate KCS when appropriate, while preserving the relevant existing KCS reference in the new draft.

## Knowledge quality and publication safety

Generated Knowledge goes through:

```text
Generate draft
  ↓
Independent quality review
  ↓
Deterministic checks
  ↓
One evidence-bounded repair when appropriate
  ↓
Final READY / DRAFTABLE / NOT READY state
  ↓
Human review
```

The generated artifact can show:

- **⚠ REVIEW**
- **⚠ REVIEW CURRENTNESS**
- **✕ BLOCKER**

These are intentional safety signals. A generated article remains a draft/proposal even when no blocker is present.

### Cortex Brain validation

Downloaded KCS-family HTML files include a small **SME Validation Tools** section at the very bottom:

- **Copy for Cortex Brain**
- **Download for Cortex Brain**

The exported payload contains:

- a mandatory independent-validation prompt;
- the clean proposed KCS content;
- TAC-only/internal notes when present;
- `[R#]` claim references;
- Source References.

It intentionally excludes the XSUP Auditor review UI/callouts.

The Cortex export is explicitly marked:

**MANDATORY VALIDATION — NOT PUBLICATION READY**

Technical validation is required before generated KCS content is copied into Salesforce Knowledge, sent to customers, or treated as authoritative.

## Evidence model

The Auditor distinguishes:

- **TACO / Case Chat derived analysis**
- **original Jira/Engineering evidence**
- **original Salesforce case evidence**
- **maintained product/KCS/documentation sources**

Generated TACO/Case Chat/Auditor content is not treated as authoritative evidence by itself. Material claims should trace to the underlying source when available.

## Smart Reuse

Automatic mode avoids unnecessary repeated AI work while protecting freshness.

Typical behavior:

| Situation | TACO | Audit | Knowledge |
|---|---|---|---|
| Nothing material changed | Reuse | Reuse | Reuse |
| New Jira/SFDC evidence | Keep usable TACO but prevent stale downstream reuse as applicable | Fresh as required | Fresh as required |
| Product changed | Reuse current TACO when compatible | Fresh | Fresh |
| Regenerate Audit | Reuse current TACO | **Fresh** | Follows selected workflow |
| Regenerate Knowledge | Reuse current TACO | Reuse current valid Audit | **Fresh** |
| Regenerate Audit + Knowledge | Reuse current TACO | **Fresh** | **Fresh** |
| Regenerate TACO + downstream | **Fresh** | **Fresh** | **Fresh when selected** |

Explicit Regenerate selections do not silently reuse an identical old Case Chat result.

## Storage

Default: **Browser Downloads**.

Optional: **Choose Folder** using Chrome's File System Access API when available and allowed.

Folder permission is browser-controlled and kept in memory only. Storage failure does not change the technical Audit/Knowledge result.

## Pilot expectations

This first team release is intended to gather real usage feedback.

Known non-critical refinements may remain around:

- some dashboard/readiness wording;
- conservative REVIEW/BLOCKER classification;
- CREATE-vs-UPDATE edge cases;
- public-vs-TAC-only wording/routing.

For publication decisions, use the **downloaded Knowledge artifact's review/blocker details and the required SME/Cortex validation workflow**, not a dashboard color/status alone.

## Human responsibility

A qualified reviewer remains responsible for:

- confirming the correct XSUP/SFDC and product;
- validating important technical claims;
- deciding whether Support-owned fields should change;
- resolving Knowledge REVIEW/BLOCKER items;
- independently validating KCS technical content before reuse/publication;
- following the normal publication/editorial process;
- storing/sharing generated case information only through approved channels.

## Repository layout

```text
README.md
DISCLAIMER.md
SUPPORT.md
src/
  xsup-auditor.js
dist/
  XSUP_Auditor_Bookmark_Installer.html
  XSUP_Auditor_JS.txt
docs/
  USER_GUIDE.md
  FAQ.md
  PRODUCT_POLICIES.md
  KNOWLEDGE_QUALITY.md
  TECHNICAL_GUIDE.md
  VALIDATION_CHECKLIST.md
  TROUBLESHOOTING.md
  SECURITY_AND_USAGE.md
  kcs-quality-overview.png
```

## Documentation

### Users

- [User Guide](docs/USER_GUIDE.md)
- [FAQ](docs/FAQ.md)
- [Product Policies](docs/PRODUCT_POLICIES.md)
- [Knowledge Quality](docs/KNOWLEDGE_QUALITY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

### Governance / usage

- [Security & Usage](docs/SECURITY_AND_USAGE.md)
- [Disclaimer](DISCLAIMER.md)
- [Support](SUPPORT.md)

### Maintainers

- [Technical Guide](docs/TECHNICAL_GUIDE.md)
- [Validation Checklist](docs/VALIDATION_CHECKLIST.md)
