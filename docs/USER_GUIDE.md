# User Guide

This guide explains the XSUP Retrospective Auditor workflow in practical terms.

---

# What the tool does

For each XSUP, the Auditor can automatically:

1. resolve the linked SFDC case
2. collect original Jira/SFDC evidence
3. detect the product
4. check whether TACO Analysis is current
5. reuse, wait for or refresh TACO
6. reuse or generate the Retrospective Audit
7. show Support-owned field decisions
8. recommend a Knowledge action
9. reuse or generate the Knowledge artifact
10. quality-review and validate the Knowledge
11. save/download the results

---

# Start the Snippet

1. Open TACopilot.
2. Open Chrome DevTools.
3. Go to **Sources → Snippets**.
4. Run the saved XSUP Retrospective Auditor snippet.

If the browser page is refreshed, the injected Auditor UI disappears.

Run the Snippet again.

---

# Run XSUPs

Paste one or more XSUP IDs.

Click:

**Run Audit(s)**

Duplicate IDs are removed.

Maximum Audit concurrency:

**2**

Maximum Knowledge concurrency:

**1**

Queued work starts automatically.

---

# Select the product

Default:

**Auto detect**

The Auditor uses structured case/TACO evidence to determine:

- XDR/XSIAM
- XSOAR
- Cortex Cloud

If confidence is low or conflicting, only that XSUP pauses for confirmation.

To confirm every XSUP manually, select:

**Ask me for every XSUP**

---

# Select SFDC when required

If one XSUP maps to multiple possible SFDC cases, that XSUP pauses.

Use:

**Choose SFDC**

The tool does not guess.

---

# TACO behavior

The Auditor checks current Jira/SFDC evidence before deciding whether TACO needs to run.

Typical behavior:

## Reuse

A usable completed TACO exists and no newer source evidence requires refresh.

## Wait

No usable final result exists yet, but TACO is genuinely running.

## Start

No investigation exists.

## Refresh

TACO is stale, failed, incomplete or has no usable final result.

Old age alone does not force a refresh.

---

# Retrospective Audit

The Audit is product-specific and field-centric.

For each applicable Support-owned field, it should explain:

- Current Value
- Correct / INCORRECT / UNDETERMINED
- Change Required
- Recommended Value if needed
- Detailed Explanation
- Important Caveat
- Supporting Evidence
- Exact Support Action

The tool does not use the Retrospective as a general TAC performance-scoring exercise.

---

# Analysis & Reuse Status

The selected XSUP has independent status cards for:

- TACO Analysis
- Retrospective Audit
- Knowledge Artifact

This tells you exactly what was reused and what was newly generated.

---

# Regenerate Audit

Use when you want a fresh retrospective but current TACO/evidence is sufficient.

It does not rerun TACO.

It does not automatically regenerate Knowledge.

---

# Regenerate KCS / Regenerate Knowledge

Use when you want only the Knowledge artifact rebuilt.

This runs the current:

```text
Knowledge Enrichment
 ↓
Independent Quality Review
 ↓
Provenance Resolution
 ↓
Automatic Repair if required
 ↓
Deterministic Gate
```

---

# Re-analyze All

Use when you intentionally want:

```text
Fresh TACO
 ↓
Fresh Audit
 ↓
Fresh Knowledge
```

---

# Knowledge Quality statuses

## READY

Useful/materially complete and no material validation item remains.

## DRAFTABLE

Useful, but named human validation items remain.

## NOT READY

Blocked because the artifact is too incomplete, unsupported or unsafe.

---

# What happens during Knowledge generation?

## 1. Enrichment

The draft is generalized for future reuse.

## 2. Independent quality review

A separate AI reviewer checks:

- accuracy
- usefulness
- completeness
- actionability
- technical depth
- sources
- generalization
- consistency
- readability
- discoverability
- verification
- audience fit

## 3. Provenance resolution

Internal analysis markers such as:

```text
[inference]
[from case data]
[derived analysis]
```

must not appear in final Knowledge.

The AI must prove/rewrite, validate, or remove those claims safely.

## 4. Deterministic gate

JavaScript inspects the final text independently.

## 5. Repair pass

If a repairable generic defect remains, one automatic repair pass is allowed.

The result is checked again.

---

# Why DRAFTABLE is not a failure

DRAFTABLE means:

> This is useful Knowledge, but one or more material details still need human confirmation.

For example:

```text
Core product behavior is supported.
Exact console path and API request schema still need documentation-owner validation.
```

That can be a useful DRAFTABLE article.

---

# Downloads

Default:

**Browser Downloads**

Optional:

**Choose Folder**

The selected folder can be an approved local or desktop-synced location.

---

# Save / Restore Session

## Save Session

Downloads current local Auditor state as JSON.

## Restore Session

After rerunning the Snippet:

1. click Restore Session
2. select the saved JSON

Active jobs restore as stopped.

Completed data is preserved.

---

# Stop All

Stops local Auditor processing and queues.

Server-side TACO/Case Chat requests already submitted may continue.

---

# Before making a ticket change

Verify:

1. correct XSUP/SFDC
2. correct product
3. current TACO
4. strongest original evidence
5. field decision
6. important caveats
7. exact Support action

---

# Before publishing Knowledge

Verify:

1. Validated Readiness
2. Quality Summary
3. Validation Items
4. Source References
5. exact commands/APIs/UI paths/version/timings when present
6. generalization/privacy
7. intended documentation destination

Even READY means:

**ready for human review**, not automatically approved/published.
