# XSUP Retrospective Auditor

**Internal APAC Cortex TAC decision-support tool**

XSUP Retrospective Auditor is a single Chrome DevTools Snippet that helps reviewers complete XSUP retrospective reviews consistently across:

- **XDR/XSIAM**
- **XSOAR**
- **Cortex Cloud**

The reviewer provides one or more XSUP IDs. The tool then coordinates TACopilot, TACO Analysis, Jira/SFDC evidence and Case Chat to produce:

- a product-specific retrospective decision
- recommended Support-owned field changes
- a Review Paste Comment
- a downloadable retrospective report
- a KCS / documentation / runbook / known-issue draft when reusable knowledge is appropriate
- a quality-reviewed Knowledge artifact with validation status

The tool does **not** automatically change Jira/SFDC and does **not** automatically publish Knowledge.

---

# How it works

Think of the Auditor as an **orchestrator**.

```text
XSUP
 ↓
Resolve SFDC
 ↓
Collect original Jira / SFDC evidence
 ↓
Detect product
 ↓
Check TACO freshness
 ↓
Reuse / wait / refresh TACO
 ↓
Reuse or generate Retrospective Audit in Case Chat
 ↓
Support-owned field decision
 ↓
Knowledge decision
 ↓
If Knowledge is needed:
Enrich → Independent Quality Review → Provenance Resolution / Repair → Deterministic Gate
 ↓
READY / DRAFTABLE / NOT READY
 ↓
Download / Copy
```

The AI does the reasoning, but JavaScript controls the workflow, evidence boundaries, reuse rules, quality checks, status and downloads.

---

# Where Case Chat is

The Auditor uses:

**TACopilot → Case → TACO Analysis → Case Chat**

Case Chat appears at the bottom of TACO Analysis after an analysis exists.

The user does not need to manually type the Audit or Knowledge prompts.

---

# Quick Start

1. Open TACopilot.
2. Open Chrome DevTools:
   - macOS: `Cmd + Option + I`
   - Windows/Linux: `Ctrl + Shift + I`
3. Go to **Sources → Snippets**.
4. Open the saved XSUP Retrospective Auditor snippet.
5. Run the snippet.
6. Paste one or more XSUP IDs.
7. Click **Run Audit(s)**.

A Live Dashboard appears and tracks each XSUP independently.

---

# One snippet, three product profiles

| Product | Retrospective trigger | Primary fields reviewed |
|---|---|---|
| **XDR/XSIAM** | Resolution = `Functions as designed` | Resolution |
| **XSOAR** | `Session_candidate` OR Fix Type = `None` / `Functions as designed` | Fix Type and/or Flag/Label |
| **Cortex Cloud** | selected Resolution values OR RCA = `User Error` | Resolution and/or RCA |

Only applicable fields are reviewed.

Missing irrelevant fields are treated as **NOT APPLICABLE**, not as missing data.

See [Product Policies](docs/PRODUCT_POLICIES.md).

---

# Product detection

The default mode is **Auto detect**.

The Auditor prefers stronger structured case/TACO information over incidental text.

- **High confidence** → continue automatically.
- **Ambiguous / low confidence** → pause only that XSUP and ask the reviewer.
- Other XSUPs continue running.

You can also choose:

**Ask me for every XSUP**

If the wrong product was selected, use:

**Change Product & Re-run Review**

Changing product refreshes the product-specific Audit/Knowledge decision, but does not automatically force a fresh TACO Analysis if the current TACO is still valid.

---

# Concurrency

The workflow uses two separate queues.

## Audit workers

Maximum:

**2 XSUP audits at the same time**

Additional XSUPs wait in the queue and start automatically.

## Knowledge worker

Maximum:

**1 Knowledge job at a time**

The next Audit jobs can continue while Knowledge is being generated.

This keeps TACopilot/Case Chat load controlled without blocking the Audit queue.

---

# Smart reuse

The Auditor tries to avoid unnecessary AI work.

Before starting a new Audit or Knowledge Case Chat, it checks whether a current compatible result already exists.

Typical behavior:

| Situation | TACO | Audit | Knowledge |
|---|---|---|---|
| Nothing changed | Reuse | Reuse | Reuse |
| New Jira/SFDC evidence | Refresh if newer than TACO | Fresh | Fresh as required |
| Product changed | Reuse if still current | Fresh | Fresh |
| `Regenerate Audit` | Reuse current | Fresh | Not automatically regenerated |
| `Regenerate KCS/Knowledge` | Reuse | Reuse | Fresh |
| `Re-analyze All` | Fresh | Fresh | Fresh |

A local code/UI/prompt improvement alone should not force otherwise-current source results to rerun.

---

# Regeneration controls

## Regenerate Audit

Shown under **Retrospective Audit**.

It:

- keeps current SFDC
- keeps current TACO
- keeps current original evidence
- generates a fresh Audit only

It does not automatically regenerate Knowledge.

If existing Knowledge depended on the previous Audit, it is marked outdated until the reviewer explicitly regenerates it.

## Regenerate KCS / Regenerate Knowledge

Shown under **Knowledge Artifact**.

It:

- keeps current TACO
- keeps current Audit
- reruns only the Knowledge pipeline

Use this when you intentionally want an existing artifact rebuilt through the latest Knowledge Enrichment and Quality workflow.

## Re-analyze All

Full refresh:

```text
Fresh TACO
  ↓
Fresh Audit
  ↓
Fresh Knowledge
```

Do not use it merely to download another report copy.

---

# Understanding the status

The overall XSUP status includes Knowledge state.

- **✓ Green** — required workflow is complete
- **⟳ Active** — Audit, Case Chat or Knowledge is running/checking
- **Waiting** — queued or waiting for selection
- **! Attention** — for example, Knowledge is outdated after Audit-only regeneration
- **✕ Failed** — a required stage failed

Important:

> An Audit can be 100% complete while Knowledge is still checking, queued, generating, reviewing or repairing.

The overall XSUP status should not turn green until required Knowledge work is also complete or intentionally skipped.

---

# Evidence model

The Auditor separates two things:

## Derived analysis

TACO can synthesize the case and identify technical conclusions.

## Original evidence

Original Jira/SFDC records are used when we need to prove what Engineering, TAC or the customer actually recorded or communicated.

Important rules:

- TACO-generated Customer Response is not proof that a customer message was sent.
- Selected evidence excerpts cannot prove that something absent never happened.
- Insufficient evidence → **UNDETERMINED**.
- Do not infer AI usage from writing style.
- Avoid subjective labels about engineers.
- `RCA Category` is not treated as the actual RCA field.

---

# Knowledge quality pipeline

Knowledge is not accepted just because the first AI answer looks good.

```text
Retrospective
   ↓
Knowledge Enrichment
   ↓
Independent AI Quality Review
   ↓
Provenance Resolution
   ↓
One automatic repair pass when appropriate
   ↓
Deterministic Safety / Structure Gate
   ↓
READY / DRAFTABLE / NOT READY
   ↓
Human review
```

For a KCS, the target reading flow is:

```text
Symptom
 ↓
Applies To
 ↓
Cause / What It Means
 ↓
How to Check
 ↓
How to Confirm
 ↓
Resolution / Workaround
 ↓
How to Verify
```

The quality system checks:

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
- existing-knowledge awareness
- publication boundary

It also checks for unsupported commands, APIs, UI paths, versions, timings, configuration values, architecture claims and remediation steps.

See [Knowledge Quality](docs/KNOWLEDGE_QUALITY.md).

---

# Knowledge readiness

## READY

A useful, materially complete draft with no material unsupported claim or material validation item remaining.

## DRAFTABLE

A useful draft, but one or more named validation items remain.

## NOT READY

The artifact is too incomplete, unsupported or unsafe to treat as a final usable draft.

`NOT READY` Knowledge is blocked from normal final download.

All Knowledge output remains a **draft for human review** even when readiness is READY.

---

# Reports and storage

Default:

**Browser Downloads**

Optional:

**Choose Folder**

The reviewer can select an approved local or desktop-synced folder.

Folder permission is browser-controlled and session-only.

Storage failure must not change the Audit result.

---

# Save / Restore Session

Use **Save Session** to preserve the local workspace.

After browser refresh:

1. run the Snippet again
2. click **Restore Session**
3. choose the saved JSON

Jobs that were actively running are restored as stopped rather than pretending the old browser task is still running.

Even without Restore Session, rerunning an XSUP can often recover current server-side TACO and Case Chat results through Smart Reuse.

---

# Stop All

`Stop All` stops local Auditor processing and queued work.

A TACO or Case Chat task already submitted to the server may continue in TACopilot.

Check the case directly when needed.

---

# Human responsibility

The Auditor is a decision-support tool.

Reviewers remain responsible for:

- confirming the correct case/product
- validating important technical conclusions
- deciding whether ticket changes should be made
- reviewing Knowledge before publication
- storing/sharing downloaded case information appropriately

---

# Documentation

## Users

- [User Guide](docs/USER_GUIDE.md)
- [FAQ](docs/FAQ.md)
- [Product Policies](docs/PRODUCT_POLICIES.md)
- [Knowledge Quality](docs/KNOWLEDGE_QUALITY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Governance / usage

- [Security & Usage](docs/SECURITY_AND_USAGE.md)
- [Disclaimer](DISCLAIMER.md)
- [Support](SUPPORT.md)

## Maintainers

- [Technical Guide](docs/TECHNICAL_GUIDE.md)
- [Validation Checklist](docs/VALIDATION_CHECKLIST.md)
