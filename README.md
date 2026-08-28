# XSUP Retrospective Auditor

**Release:** v1  
**Runtime:** Chrome DevTools Snippet inside TACopilot  
**Current validated scope:** XDR / XSIAM retrospective candidates where the reviewed Resolution is **Functions as designed**

---

## What this tool does

The XSUP Retrospective Auditor helps Support reviewers decide whether Support-owned retrospective fields are correct and what action should be taken.

It uses:

- existing TACO technical analysis
- original Jira / Engineering comments
- original Salesforce case comments
- Case Chat for the final retrospective decision
- Case Chat for a reusable knowledge artifact when needed

The tool focuses on questions such as:

- Is the current **Resolution** correct?
- Is **RCA** correct when RCA is applicable?
- Is **Fix Type** correct when applicable?
- Is a **Flag / Label** correct when applicable?
- Does Support need to change anything?
- What evidence proves the decision?
- Should this case produce or update a KCS, Admin Guide, Runbook, Known Issue, or other knowledge?

The auditor is intentionally **not another full Salesforce case-quality review**. TACO already performs broad case analysis. This tool uses that analysis to make a clear, evidence-backed Support-owned retrospective decision.

---

# Quick Start

## 1. Open TACopilot

Open the normal TACopilot page while signed in with your usual Support access.

The auditor uses your existing TACopilot authentication. It does not store or embed usernames, passwords, cookies, API tokens, or other credentials.

---

## 2. Open Chrome DevTools

In Chrome:

1. Open **DevTools**
2. Go to **Sources**
3. Open **Snippets**
4. Create or open the XSUP Auditor snippet
5. Paste the latest auditor code
6. Run the snippet while TACopilot is open

The auditor panel appears inside the TACopilot page.

---

## 3. Enter one or more XSUP IDs

Example:

```text
XSUP-72446
XSUP-81234
XSUP-90001
```

You can enter multiple XSUP IDs.

The current runtime supports:

- **2 audit workers**
- **1 separate knowledge-artifact worker**

So multiple XSUPs can be reviewed without creating excessive TACopilot load.

---

## 4. Click Run Audit(s)

For every XSUP, the auditor performs the following workflow:

```text
Resolve XSUP → SFDC
        ↓
Check TACO analysis
        ↓
Collect original Jira/SFDC evidence
        ↓
Check for an existing reusable Audit Case Chat
        ↓
Reuse it OR generate a new audit
        ↓
Review Support-owned fields
        ↓
Check for an existing reusable Knowledge Case Chat
        ↓
Reuse it OR generate a new artifact
        ↓
Generate downloadable reports
```

---

# What happens during the audit

## Resolve SFDC

The tool resolves the XSUP to its linked Salesforce case using TACopilot.

If:

- exactly one SFDC case is found → it continues automatically
- multiple cases are found → the reviewer is asked to choose
- no case is found → the job shows **Mapping Not Found**

The tool does not guess a Salesforce case.

---

## TACO Analysis

The auditor checks whether a TACO investigation already exists.

It can:

### REUSE EXISTING

A completed, usable TACO analysis exists and no newer case evidence requires a refresh.

### WAIT

A TACO analysis is already running.

The auditor waits for that existing analysis instead of creating another one.

### REFRESH

TACO is refreshed when necessary, for example:

- newer Jira/SFDC evidence exists
- existing TACO output is incomplete
- there is no usable final conclusion
- the reviewer deliberately uses **Re-analyze All**

TACO is **not refreshed simply because it is old**.

---

# Analysis & Reuse Status

Near the top of the detail screen you will see:

## TACO Analysis

Example:

```text
REUSED EXISTING
26 Aug 2026 06:44
No newer Jira/SFDC evidence
```

## Retrospective Audit

Example:

```text
REUSED EXISTING
Case Chat #2465
28 Aug 2026 12:20
```

or:

```text
NEWLY GENERATED
Case Chat #2501
28 Aug 2026 15:10
```

## Knowledge Artifact

Example:

```text
REUSED EXISTING
Case Chat #2466
28 Aug 2026 12:21
```

This lets the reviewer immediately understand:

- whether the result already existed
- whether it was generated during the current run
- the Case Chat ID
- the original result date
- why the result was reused or regenerated

---

# Smart reuse

The auditor does **not** blindly reuse the latest Case Chat.

A previous Audit Case Chat is reused only when the important inputs still match.

The audit reuse check includes:

- XSUP
- Salesforce case
- TACO investigation
- TACO synthesized report content
- complete Jira/SFDC evidence content
- focused evidence passed to Case Chat
- audit methodology / reuse schema

The Knowledge artifact is checked separately using:

- current audit fingerprint/content
- knowledge action
- artifact type
- artifact readiness
- knowledge methodology / reuse schema

If the inputs changed, the relevant result is regenerated.

If nothing changed, the previous server-side Case Chat result can be reused and the HTML report can be downloaded again **without repeating the AI analysis**.

---

# Re-analyze All

There is one manual override:

## Re-analyze All

This deliberately performs:

```text
Fresh TACO
    ↓
Fresh Retrospective Audit
    ↓
Fresh Knowledge Artifact
```

Use this only when you intentionally want a completely new analysis.

Do **not** use Re-analyze All just because you want to download the report again.

---

# Review Decisions

The most important section is **Review Decisions**.

The current XDR/XSIAM validation primarily reviews **Resolution**.

For every applicable field, the report should provide:

- current value
- verdict
- whether a change is required
- recommended value if change is required
- detailed explanation
- strongest supporting evidence
- exact Support action

Example:

```text
RESOLUTION
Correct · No change

Engineering explicitly confirmed that the reported behavior is part
of the documented product design. The available original Jira evidence
therefore supports retaining the current Resolution.
```

A simple `Correct`, `YES`, or `NO` without explanation is not considered sufficient.

---

# Supported field applicability

Field applicability depends on the product.

## Current XDR / XSIAM validation

Primary condition:

```text
Resolution = Functions as designed
```

Current behavior:

- Resolution → applicable
- RCA → only when explicitly part of the retrospective scope
- Fix Type → only when explicitly applicable
- Flag / Label → only when explicitly applicable

A field that is irrelevant to that product is **NOT APPLICABLE**, not missing data.

---

# Knowledge Actions

The auditor can recommend one primary knowledge action:

- **CREATE KCS**
- **UPDATE EXISTING KCS**
- **UPDATE ADMIN/TECH GUIDE**
- **CREATE/UPDATE RUNBOOK**
- **KNOWN ISSUE/RELEASE NOTE**
- **NO KNOWLEDGE ACTION**
- **UNDETERMINED**

---

## Artifact Readiness

The tool uses generic artifact readiness:

- **READY**
- **DRAFTABLE**
- **NOT READY**
- **NOT APPLICABLE**

Example:

```text
Knowledge Action: UPDATE ADMIN/TECH GUIDE
Artifact Readiness: READY
Artifact: Admin/Tech Guide Update Proposal
```

`READY` does not mean `KCS READY`.

The readiness always applies to the selected artifact type.

---

# Knowledge Artifact Types

Depending on the audit decision, the auditor can create:

- KCS Draft
- KCS Update Proposal
- Admin / Tech Guide Update Proposal
- TAC Runbook Draft
- Known Issue / Release Note Proposal

Knowledge artifacts are drafts and must be reviewed before publication.

---

# Important evidence rules

The auditor follows several safety rules.

## TACO is derived analysis

TACO can summarize and reason about the case.

However, statements about what Engineering, TAC, or the customer actually said should be supported by original Jira/SFDC evidence.

## TACO Customer Response is not proof of a sent message

A generated response does not prove that TAC actually sent that exact content to the customer.

## Do not guess

When the evidence does not prove something, the auditor should return:

```text
UNDETERMINED
```

rather than inventing an answer.

## Explain strong wording

If a report says behavior was:

- abnormal
- inconsistent
- worse than expected
- customer-specific

it must explain the concrete observation that supports that wording.

---

# Report Downloads

## Default

Reports use the browser's normal Downloads behavior.

## Optional folder

Click **Choose Folder** to select a writable local folder.

Examples:

- normal local folder
- OneDrive folder
- Google Drive for Desktop folder
- approved shared/synced folder

The browser asks for permission.

The auditor never silently selects a folder.

The selected folder handle is kept in memory only and is not stored in session JSON.

---

# Download and Copy actions

Depending on the result, the tool provides actions such as:

- Download Audit Report
- Copy Audit Report
- Download Knowledge Draft
- Copy Knowledge Draft
- Download All Reports
- Copy All Reports
- Download All Knowledge Drafts
- Copy All Knowledge Drafts

A reused Case Chat result can still be turned into a fresh downloadable HTML file.

---

# Review Paste Comment

The tool generates a **Review Paste Comment**.

The heading is generic because the retrospective may involve Resolution, RCA, Fix Type, or Flag / Label.

Example:

```text
XSUP APAC Retrospective Review — XSUP-72446
```

The comment lists the fields that were actually reviewed.

The auditor does **not** automatically post the comment to Jira.

---

# Save / Restore Session

The auditor can export its session state.

A restored session can preserve completed audit results.

If something was running when the session was saved, it is restored as stopped rather than pretending the old network request is still active.

Folder permissions are not restored from session JSON.

---

# Help and Documentation

The in-product **Help & Methodology** section contains the repository link:

https://github.com/smuruhesan/xsup-auditor

For implementation details, architecture, endpoints, reuse logic, prompts, data structures, and maintenance guidance, read:

**docs/TECHNICAL_GUIDE.md**

For user/management questions and governance guidance, also read:

- **docs/FAQ.md**
- **docs/SECURITY_AND_USAGE.md**
- **DISCLAIMER.md**

---


# Security, Governance & Responsible Use

The auditor runs inside the reviewer's existing authenticated TACopilot browser session.

It is designed to:

- use existing user permissions
- avoid embedded credentials or API secrets
- avoid automatic Jira/Salesforce changes
- avoid automatic publishing of retrospective comments or knowledge
- keep downloads under user/browser control
- reuse server-side analysis only when current inputs still match
- require human review of conclusions and generated knowledge

## Important

The repository should **not** claim that the tool is formally InfoSec-compliant, certified, or approved unless that approval has actually been granted.

A safe description is:

> Internal browser-based decision-support tool using the reviewer's existing TACopilot access. It does not intentionally store credentials or automatically modify tickets. Outputs require human review.

Read before wider use:

- [FAQ](docs/FAQ.md)
- [Security, Data Handling & Usage Guidance](docs/SECURITY_AND_USAGE.md)
- [Disclaimer & Internal Use Notice](DISCLAIMER.md)


## Additional operational documentation

- [FAQ](docs/FAQ.md)
- [Security, Data Handling & Usage](docs/SECURITY_AND_USAGE.md)
- [Privacy & Data Flow](docs/PRIVACY_AND_DATA_FLOW.md)
- [Known Limitations](docs/KNOWN_LIMITATIONS.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Operations & Change Management](docs/OPERATIONS_AND_CHANGE_MANAGEMENT.md)
- [Validation Checklist](docs/VALIDATION_CHECKLIST.md)
- [Support & Ownership](SUPPORT.md)
- [Security Policy](SECURITY.md)
- [Disclaimer & Internal Use Notice](DISCLAIMER.md)

# Current limitations

- Current product validation is primarily XDR/XSIAM.
- Cortex Cloud and XSOAR policies still need product-specific implementation/validation.
- Cross-user reuse depends on the current SME having access to the same TACopilot investigation and Case Chat history.
- The auditor currently runs as a DevTools Snippet rather than an officially packaged application.
- Knowledge drafts require human review before publication.
- Usage telemetry / Watcher integration is not yet implemented.

---

# Security / Data Handling

Do not put the following in the GitHub repository:

- real customer evidence
- raw Salesforce case exports
- raw Jira case comments
- support bundles
- customer names
- tenant information
- credentials
- API keys
- browser cookies
- session tokens
- full real-case audit reports

The auditor is intended to use the reviewer's existing authenticated TACopilot session only.

---

# Release

**v1** — initial GitHub release.

---

# Summary

Use this tool when you need to answer:

> Is the Support-owned retrospective field correct, what should Support change, what evidence proves it, and what reusable knowledge should follow?

The auditor should give a reviewer a clear, evidence-backed answer without forcing them to manually reconstruct the entire case.
