# XSUP Retrospective Auditor

**Internal APAC Cortex TAC decision-support tool**

XSUP Retrospective Auditor is a single Chrome DevTools Snippet that helps reviewers perform XSUP retrospective reviews across:

- **XDR/XSIAM**
- **XSOAR**
- **Cortex Cloud**

You paste one or more XSUP IDs. The tool resolves the linked Salesforce case, checks TACO Analysis, reviews the original Jira/SFDC evidence, automatically uses TACopilot Case Chat for the retrospective, recommends any Support-owned field changes, generates reusable knowledge when useful, and downloads the results.

The reviewer remains responsible for the final decision and for any ticket or documentation changes.

---

## What you get

For each XSUP, the tool can produce:

- a **Retrospective Audit report** in HTML
- a **Review Paste Comment**
- a product-specific decision on the applicable Support-owned fields
- a recommended knowledge action
- a generated **KCS / KCS update / Admin or Tech Guide update / Runbook / Known Issue or Release Note draft** when appropriate
- links back to Jira, SFDC and TACopilot

The tool does **not** automatically modify Jira or Salesforce and does **not** automatically publish knowledge.

---

# The workflow in one minute

## First time you review an XSUP

```text
XSUP
 ↓
Resolve linked SFDC case
 ↓
Detect product
 ↓
Check / obtain current TACO Analysis
 ↓
Collect original Jira + SFDC evidence
 ↓
TACopilot Case Chat creates the retrospective
 ↓
Review Decisions
 ↓
Audit HTML downloaded/saved
 ↓
If knowledge is recommended:
Knowledge Enrichment → Quality Review
 ↓
Knowledge draft downloaded/saved
```

You do not manually type the retrospective or knowledge prompts.

The tool uses:

**TACopilot → Case → TACO Analysis → Case Chat**

Case Chat is available at the bottom of the TACO Analysis section after an analysis exists.

---

## When you review the same XSUP again

The auditor tries to avoid repeating work.

It checks the current source state and existing Case Chat history.

If the existing TACO, retrospective and knowledge results are still current and compatible, they are reused and the reports are recreated/downloaded without running the analysis again.

```text
Current Jira/SFDC evidence unchanged
             +
Current TACO still valid
             +
Compatible existing Case Chat result
             ↓
          REUSE
             ↓
     Recreate/download report
```

If the source changed, the affected layer is regenerated.

A code/UI/prompt improvement by itself does not automatically force an otherwise-current Audit or Knowledge result to be regenerated. If you intentionally want the latest Audit or Knowledge workflow applied, use the individual **Regenerate** button.

---

# Quick Start

## 1. Open TACopilot

Open TACopilot normally using your existing Support account.

The snippet is designed to run from the TACopilot site and uses your current authenticated browser session.

---

## 2. Open the Chrome DevTools Snippet

Open Chrome DevTools:

- **Windows/Linux:** `Ctrl + Shift + I`
- **macOS:** `Cmd + Option + I`

Then:

1. Open **Sources**
2. Open **Snippets**
3. Select your saved **XSUP Retrospective Auditor** snippet
4. Run it

If you are installing it for the first time:

1. Create a new Snippet
2. Paste the complete XSUP Auditor JavaScript source
3. Save the Snippet
4. Run it while TACopilot is open

The auditor panel appears over the TACopilot page.

---

## 3. Enter XSUP IDs

You can enter one or many IDs.

Example:

```text
XSUP-72446
XSUP-81234
XSUP-90001
XSUP-90002
```

IDs can be separated by spaces, commas or new lines.

Duplicate IDs are removed.

---

## 4. Click `Run Audit(s)`

The Live Dashboard starts updating.

### Audit concurrency

The auditor runs a maximum of **2 XSUP retrospective reviews at the same time**.

If you enter 10 XSUPs:

```text
XSUP 1 ─┐
        ├─ running
XSUP 2 ─┘

XSUP 3..10 → queued
```

As soon as either active review finishes, the next queued XSUP starts automatically.

You do not need to manually start each pair.

### Knowledge concurrency

Knowledge generation uses a separate queue.

A maximum of **1 knowledge artifact** is generated at a time.

The next XSUP audits can continue while the knowledge worker is creating or reviewing a KCS/document/runbook draft.

This is intentional to keep TACopilot/Case Chat load conservative.

---

# Product selection

The same snippet supports all three product profiles:

| Product profile | Current retrospective trigger |
|---|---|
| **XDR/XSIAM** | Resolution = `Functions as designed` |
| **XSOAR** | `Session_candidate` label OR Fix Type = `None` / `Functions as designed` |
| **Cortex Cloud** | selected Resolution values OR RCA = `User Error` |

See [Product Policies](docs/PRODUCT_POLICIES.md) for the exact rules.

## Auto detect

The default mode is **Auto detect**.

The auditor uses structured case/TACO metadata where possible.

- **High-confidence detection** → continues automatically.
- **Lower-confidence / conflicting / missing detection** → pauses only that XSUP and asks the reviewer to choose.
- Other XSUP jobs continue.

The selected product is visible in the Live Dashboard and the XSUP detail.

## Ask me for every XSUP

Change **Product selection** to:

**Ask me for every XSUP**

Every XSUP will pause after SFDC resolution so the reviewer can choose:

- XDR/XSIAM
- XSOAR
- Cortex Cloud

## Wrong product selected?

Use:

**Change Product & Re-run Review**

A product change invalidates the previous Audit/Knowledge decision for that XSUP.

Current TACO/evidence can still be reused when it remains current.

---

# Understanding the status

The left XSUP queue and selected XSUP activity reflect the overall workflow, including Knowledge.

Typical states:

- **✓ Green** — required work is complete
- **⟳ Active** — Audit, Case Chat or Knowledge is running/checking
- **Waiting / queued** — waiting for an Audit worker, Knowledge worker, SFDC choice or Product choice
- **! Attention** — for example, Knowledge became outdated after Audit-only regeneration
- **✕ Failed** — a required step failed
- **Grey / pending** — not started or not required

Important:

> **Audit progress can reach 100% while Knowledge is still checking, queued or generating.**

Use the **Knowledge Artifact** column/card and the overall XSUP status to see whether the whole workflow has finished.

The Live Dashboard includes:

- XSUP
- Product
- SFDC
- Progress
- Current activity
- Last update
- Reviewed fields
- Review verdict
- Change needed
- Knowledge artifact
- Elapsed time

---

# Analysis & Reuse Status

Each selected XSUP shows three independent status cards:

1. **TACO Analysis**
2. **Retrospective Audit**
3. **Knowledge Artifact**

The cards explain whether the result was reused or newly generated and show the Case Chat ID/date when available.

Typical labels include:

- **REUSED EXISTING**
- **NEW / REFRESHED**
- **NEWLY GENERATED**
- **CHECKING**
- **FAILED**

---

# Regenerate only what you want

The auditor has three different refresh controls.

## `Regenerate Audit`

Displayed under **Retrospective Audit**.

Use it when you want a new retrospective using the **current TACO + current Jira/SFDC evidence**.

It does **not** rerun TACO.

It does **not** automatically regenerate Knowledge.

If existing Knowledge belonged to the old Audit, it is marked as needing regeneration rather than silently replacing it.

---

## `Regenerate KCS` / `Regenerate Knowledge`

Displayed under **Knowledge Artifact**.

Use it when you want a new knowledge artifact from the **current completed Audit**.

It does not rerun:

- TACO
- the Retrospective Audit

This is also the control to use when an existing current artifact was reused but you deliberately want it regenerated through the latest Knowledge Enrichment + Quality Review workflow.

---

## `Re-analyze All`

This is the full override:

```text
Fresh TACO
  ↓
Fresh Retrospective Audit
  ↓
Fresh Knowledge
```

Use this only when you deliberately need a completely fresh end-to-end analysis.

Do **not** use `Re-analyze All` simply to download another copy of a report.

---

# How TACO reuse works

The auditor first collects current original Jira/SFDC activity so it can determine whether the existing TACO Analysis is still current.

At a high level:

- no TACO investigation → start one
- current usable completed TACO → reuse it
- an existing TACO is genuinely running → wait for it
- newer Jira/SFDC evidence than TACO → refresh
- failed/incomplete/no usable final report → refresh
- **old age by itself does not force a refresh**

The goal is to avoid unnecessary TACO work while still refreshing when the source has materially changed.

---

# How Audit and Knowledge reuse works

Before submitting another Case Chat request, the tool checks the existing Case Chat history.

A prior result can be reused when it is still compatible with the current:

- XSUP / SFDC
- TACO source state
- Jira/SFDC source boundary
- selected product
- expected Audit or Knowledge artifact structure

Exact fingerprints are used when available.

The tool can also reuse a structurally compatible result that is demonstrably current relative to the current source boundary. This prevents a harmless source-code/prompt/UI change from creating duplicate Case Chat analysis.

A product change cannot reuse another product profile's retrospective.

---

# Knowledge generation

When the Audit recommends reusable knowledge, the Knowledge worker can create:

- **KCS Draft**
- **KCS Update Proposal**
- **Admin / Tech Guide Update Proposal**
- **TAC Runbook Draft**
- **Known Issue / Release Note Draft**

Knowledge generation is not a simple copy of the retrospective.

It uses two stages:

```text
Knowledge Enrichment + Draft
            ↓
Independent Knowledge Quality Review
            ↓
Validated final draft
```

The enrichment stage can use directly relevant underlying material available to the Case Chat/TACO investigation, such as official docs, KCS/internal knowledge, Confluence/technical guides, Engineering/Jira evidence, similar validated cases and release/known-issue material.

The quality stage reviews broad categories including:

- accuracy
- usefulness
- completeness
- actionability
- generalization
- technical depth
- source quality
- consistency
- readability
- discoverability
- audience fit
- verification

It also applies an artifact-specific rubric.

See [Knowledge Quality](docs/KNOWLEDGE_QUALITY.md).

---

# Knowledge readiness

The final knowledge result uses:

### READY

Useful and materially complete draft with no material unsupported claim or validation item remaining.

### DRAFTABLE

Useful draft that can be reviewed now, but one or more named material validation items remain.

### NOT READY

Evidence is too weak/inconsistent, or the artifact fails a safety/structure check.

A `NOT READY` result is not treated as final downloadable knowledge.

All generated knowledge is still a **draft** and requires human review before publication.

---

# Evidence rules

TACO is **derived technical analysis**.

Original Jira/SFDC records are used when the review needs to prove what Engineering, TAC or the customer actually recorded or communicated.

The auditor is designed to:

- distinguish source evidence from analysis
- avoid treating TACO-generated customer text as proof of customer communication
- avoid guessing when evidence is insufficient
- use **UNDETERMINED** when a safe field decision cannot be established
- avoid subjective engineer-performance labels
- avoid inferring AI usage from writing style

For Cortex Cloud, **RCA Category is not treated as the actual RCA field**.

---

# Reports and storage

By default, reports use normal **Browser Downloads**.

You can optionally choose an approved local folder with:

**Choose Folder**

Examples can include:

- local folder
- approved shared folder
- OneDrive desktop-synced folder
- Google Drive for Desktop folder

Folder access is controlled by the browser.

The folder permission/handle is session-only and is **not** stored in the saved session JSON.

Available batch actions include:

- Copy All Review Comments
- Download All Reports
- Copy All Reports
- Download All Knowledge Drafts
- Copy All Knowledge Drafts

---

# Save / Restore Session

Use **Save Session** when you want to preserve the current auditor workspace before browser refresh/reopen.

It downloads a JSON session file containing the current jobs and results.

After refreshing TACopilot:

1. run the XSUP Auditor Snippet again
2. click **Restore Session**
3. choose the saved JSON file

If an Audit or Knowledge job was actively running when the session was saved, it is restored as **stopped** rather than pretending the local task is still running.

Completed data is preserved.

Folder permission is not restored; choose the folder again if required.

Even without a saved session, rerunning an XSUP can recover current server-side TACO/Case Chat results through Smart Reuse.

---

# Stop All

`Stop All` stops the auditor's current batch/polling and removes queued work.

A TACO or Case Chat task that has already been submitted to the server may continue in TACopilot even after the browser-side auditor is stopped.

If this matters, check:

**TACopilot → Case → TACO Analysis / Case Chat**

---

# Security and responsible use

This is an **internal, unofficial APAC Cortex TAC workflow tool**.

It is designed to:

- use the reviewer's existing authenticated TACopilot session
- use existing reviewer permissions
- avoid embedded usernames/passwords/API secrets
- avoid automatically changing Jira/SFDC
- avoid automatically publishing knowledge
- keep local report storage under reviewer/browser control

The tool can process sensitive customer/internal case information.

Users are responsible for:

- validating generated conclusions
- following normal Support processes
- storing reports in approved locations
- sharing information only with authorized recipients
- following applicable company security/privacy/data-handling requirements

Do not describe the tool as formally **InfoSec approved/certified/compliant** unless that approval has actually been granted through the appropriate company process.

See [Security & Usage](docs/SECURITY_AND_USAGE.md) and [Disclaimer](DISCLAIMER.md).

---

# Support

XSUP Retrospective Auditor is owned and maintained internally for the **APAC Cortex TAC XSUP retrospective workflow**.

It is not an officially supported product and does not have a formal product SLA.

For tool problems or questions, contact the internal tool owner/maintainer.

See [SUPPORT.md](SUPPORT.md).

---

# Documentation

For normal users:

- [User Guide](docs/USER_GUIDE.md)
- [FAQ](docs/FAQ.md)
- [Product Policies](docs/PRODUCT_POLICIES.md)
- [Knowledge Quality](docs/KNOWLEDGE_QUALITY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

For security/governance:

- [Security & Usage](docs/SECURITY_AND_USAGE.md)
- [Disclaimer](DISCLAIMER.md)
- [Support](SUPPORT.md)

For maintainers:

- [Technical Guide](docs/TECHNICAL_GUIDE.md)
- [Validation Checklist](docs/VALIDATION_CHECKLIST.md)
