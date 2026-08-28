# User Guide

This guide explains how to operate XSUP Retrospective Auditor from start to finish.

For a short introduction, see the repository [README](../README.md).

---

# 1. What the tool does

You provide XSUP IDs.

The tool automatically:

1. resolves XSUP → SFDC
2. determines the product
3. checks TACO Analysis freshness
4. collects original Jira/SFDC evidence
5. reuses or generates a Retrospective Audit through TACopilot Case Chat
6. shows the Support-owned field decision
7. recommends a knowledge action
8. reuses or generates the knowledge draft when required
9. downloads/saves the reports

Case Chat means:

**TACopilot → Case → TACO Analysis → Case Chat**

The tool uses it automatically.

---

# 2. Start the Snippet

## Existing Snippet

1. Open TACopilot.
2. Open Chrome DevTools.
3. Select **Sources**.
4. Open **Snippets**.
5. Select **XSUP Retrospective Auditor**.
6. Run the Snippet.

The panel appears on the TACopilot page.

## First-time Snippet setup

1. Open Chrome DevTools.
2. Go to **Sources → Snippets**.
3. Create a new Snippet.
4. Paste the complete XSUP Auditor JavaScript.
5. Save it.
6. Run it from the TACopilot page.

The source is intentionally a single self-contained browser Snippet. No browser extension is required by this workflow.

---

# 3. Main controls

At the top of the panel:

### XSUP input

Paste one or more XSUP IDs.

### Run Audit(s)

Starts the batch.

### Stop All

Stops the auditor's local active/queued work.

### Auto-download/save completed audit reports

When enabled, completed Audit reports are automatically saved.

### Auto-generate recommended knowledge drafts

When enabled, a recommended KCS/doc/runbook/known-issue draft is automatically queued.

### Product selection

Choose:

- **Auto detect**
- **Ask me for every XSUP**

### Choose Folder

Optional. Select the approved local/synced destination for generated artifacts.

---

# 4. Batch behavior

The tool deliberately separates Audit and Knowledge concurrency.

## Audit queue

Maximum:

**2 simultaneous XSUP audits**

If more XSUPs are entered, the remainder queue automatically.

A new queued XSUP starts whenever one Audit worker becomes free.

## Knowledge queue

Maximum:

**1 simultaneous knowledge job**

Knowledge uses a separate worker.

This allows Audit workers to continue reviewing other XSUPs while one KCS/doc/runbook is being generated.

---

# 5. Product selection

## Auto detect

The tool evaluates structured case/TACO information and suggests:

- XDR/XSIAM
- XSOAR
- Cortex Cloud

Only high-confidence automatic selection continues without asking.

If detection is uncertain, only that XSUP pauses.

The reviewer chooses the product and the job continues.

## Manual product mode

Select:

**Ask me for every XSUP**

Each XSUP pauses for product selection after the linked SFDC case is resolved.

## Change Product & Re-run Review

If the wrong product was chosen/detected, select:

**Change Product & Re-run Review**

The current TACO can still be reused if it is current.

The product-specific Audit/Knowledge decision is regenerated.

---

# 6. SFDC selection

Normally the XSUP resolves to one SFDC case.

If TACopilot returns multiple possible SFDC mappings, the XSUP pauses and shows:

**Choose SFDC**

Select the correct linked case.

Other XSUPs continue.

If no mapping is found, the job shows a mapping failure rather than inventing a case.

---

# 7. TACO Analysis

The auditor determines whether TACO needs work.

Possible behavior:

### Reuse

A usable completed TACO exists and current Jira/SFDC activity does not require refresh.

### Wait

No usable final report exists yet, but an investigation is genuinely running.

The auditor waits rather than starting a duplicate.

### Start

No TACO investigation exists.

### Refresh

The current source indicates TACO is stale, failed or incomplete.

### Manual full refresh

`Re-analyze All` explicitly forces TACO refresh.

---

# 8. Original evidence

The tool reads original case activity from TACopilot.

Evidence categories include:

- Jira/Engineering
- SFDC internal
- TAC public
- customer public
- Jira ticket event / structured case information

The full source set is used for current-state/freshness and reuse logic.

A bounded, relevant evidence subset is sent to Case Chat to keep the request practical.

This means:

> Selected Case Chat evidence is not proof that something absent from the selected packet never happened.

---

# 9. Retrospective Audit

The tool automatically submits the retrospective to Case Chat.

The final result focuses on product-specific Support-owned fields rather than repeating a broad SFDC-quality review.

The report should explain, for every applicable field:

- current value
- Correct / INCORRECT / UNDETERMINED
- whether a change is required
- recommended value when a change is required
- detailed explanation
- important caveat
- strongest original evidence
- exact Support action

---

# 10. Review Decisions

The **Review Decisions** section is the main operational result.

Examples of fields include:

- Resolution
- RCA
- Fix Type
- Flag / Label

Only fields applicable to the selected product policy should be reviewed.

`NOT APPLICABLE` is different from missing data.

---

# 11. Analysis & Reuse Status

The selected XSUP has separate cards for:

### TACO Analysis

Shows reuse/start/refresh information.

### Retrospective Audit

Shows the Case Chat source and allows:

**Regenerate Audit**

### Knowledge Artifact

Shows the Case Chat source/status and allows:

**Regenerate KCS** or **Regenerate Knowledge**

The cards make it possible to see exactly what was reused.

---

# 12. Regenerate Audit

Use this when you want only a new Retrospective Audit.

The tool keeps:

- current SFDC mapping
- current TACO
- current original evidence

and creates a new Audit Case Chat.

It does not automatically regenerate Knowledge.

If an existing Knowledge artifact was tied to the previous Audit, the tool marks it as outdated/needs regeneration rather than silently replacing it.

---

# 13. Regenerate Knowledge

Use this when you want only the Knowledge artifact regenerated.

It keeps:

- current TACO
- current Retrospective Audit

and runs the current Knowledge Enrichment + Quality Review workflow.

The button text is:

- **Regenerate KCS** for KCS artifacts
- **Regenerate Knowledge** for other artifact types

---

# 14. Re-analyze All

Use only for a deliberate complete refresh:

```text
TACO
 ↓
Audit
 ↓
Knowledge
```

This is not a download button.

Do not use it merely because you want another HTML copy.

---

# 15. Smart reuse on repeat runs

When the same XSUP is run again, the tool looks at the current source boundary and Case Chat history.

It prefers current reusable results.

The main principle is:

> **Regenerate because the case/source changed, not merely because the auditor source code changed.**

A compatible result can be reused when it remains valid for:

- this XSUP/SFDC
- current TACO/Jira/SFDC source state
- selected product
- expected Audit/Knowledge type

If you want a current artifact intentionally rebuilt with newer auditor methodology, use the relevant **Regenerate** button.

---

# 16. Knowledge workflow

If Knowledge is recommended and auto-generation is enabled:

## Stage 1 — Enrichment + Draft

The AI creates a reusable article rather than simply copying the retrospective.

When useful and actually available to the investigation, it can incorporate:

- authoritative product documentation
- relevant KCS/internal knowledge
- Confluence/admin/technical guidance
- Jira/Engineering evidence
- validated similar SFDC cases
- known-issue/release-note material

## Stage 2 — Independent Quality Review

A separate Case Chat acts as a knowledge editor.

It checks broad quality categories and rewrites/finalizes the artifact.

The result remains a draft for human review.

See [Knowledge Quality](KNOWLEDGE_QUALITY.md).

---

# 17. Knowledge readiness

### READY

No material validation item remains.

### DRAFTABLE

Useful draft, but named validation items remain.

### NOT READY

The artifact cannot safely be treated as a useful final draft.

`NOT READY` knowledge is not treated as final downloadable knowledge.

---

# 18. Storage

## Browser Downloads

Default.

## Choose Folder

Optional explicit reviewer choice.

The folder can be a normal local folder or an approved desktop-synced location.

Folder permission is controlled by Chrome.

A storage failure should not change the Audit decision.

---

# 19. Save Session

Use **Save Session** before refreshing/closing if you want to preserve the local workspace.

The exported JSON contains the current job state.

It does not serialize the Chrome folder permission object.

---

# 20. Restore Session

1. Run the Snippet again.
2. Click **Restore Session**.
3. Choose the saved session JSON.

Jobs that were actively running when saved are restored as stopped.

Completed data is preserved.

You can then decide what to rerun.

---

# 21. Browser refresh

A browser refresh removes the injected panel.

Run the Snippet again.

Then either:

- rerun the XSUP and allow Smart Reuse to recover current server-side results, or
- restore a saved session

---

# 22. Stop All

`Stop All`:

- aborts local auditor requests/polling as far as possible
- marks queued work stopped
- clears local Audit/Knowledge queues

A server-side task already submitted to TACO/Case Chat may continue.

Check TACopilot directly when required.

---

# 23. Reports

## Audit report

Contains:

- XSUP / SFDC
- Product
- Eligibility
- Reviewed fields
- Review verdict
- TACO/Audit source
- case summary
- technical evidence
- Support-owned field decisions
- knowledge action
- review paste comment
- references

## Knowledge artifact

Contains the structure appropriate to the artifact type.

It is always a draft for review.

---

# 24. What the user should verify

Before acting on a recommendation:

1. Confirm the correct XSUP/SFDC.
2. Confirm the selected product.
3. Read the Support-owned field decision.
4. Check the strongest original evidence.
5. Confirm any proposed ticket change.
6. Review Knowledge before publication.
7. Treat `UNDETERMINED`, `DRAFTABLE`, validation warnings and failed quality checks seriously.

---

# 25. Where to look when something is confusing

Start with:

1. **Live Dashboard**
2. **Analysis & Reuse Status**
3. **Execution Pipeline**
4. **Review Decisions**
5. **Knowledge Artifact**
6. **TACopilot → Case → TACO Analysis → Case Chat**

Then see [Troubleshooting](TROUBLESHOOTING.md).
