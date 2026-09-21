# Troubleshooting

Use this order:

1. Live Dashboard
2. Analysis & Reuse Status
3. Execution Pipeline
4. Knowledge Artifact status
5. TACopilot → Case → TACO Analysis → Case Chat

---

# Auditor panel disappeared

Browser refresh removes the injected UI.

Run the Snippet again.

---
# Bookmark does not open from a case page

The current release supports any authenticated page under:

```text
https://taco.paloaltonetworks.com:3009/taco/
```

including `/taco/pilot/` and `/taco/case/<SFDC>`. If it still behaves like Pilot-only, replace the installed bookmark: self-contained bookmarks keep the old embedded source and do not auto-update when the GitHub installer file changes.

Verify the exact host, port and `/taco` path; other origins and lookalike paths are intentionally rejected.

---


# Only two XSUPs are running

The default **Parallel XSUP / TACO processing** value is 2. You can select 2, 3, 5 or 10 for independent evidence/TACO processing.

This does not raise the shared Case Chat generation limit, which remains 2.

---

# Knowledge is queued

Two Knowledge workers are available, but Audit and Knowledge share a maximum of two active mutating Case Chat generations. A Knowledge job can therefore queue while those slots are occupied.

XSUP/TACO workers can continue independent non-generation work.

---

# Audit says 100% but XSUP is not green

Check Knowledge.

Knowledge may still be:

- checking reuse
- queued
- enriching
- quality reviewing
- repairing

Overall green should appear only when required workflow is complete/skipped.

---

# Product confirmation required

Auto detection was not high-confidence.

Select:

- XDR/XSIAM
- XSOAR
- Cortex Cloud

Only that XSUP waits.

---

# Multiple SFDC matches

Choose the actual linked case.

The tool intentionally does not guess.

---

# TACO shows REUSED EXISTING

A usable current TACO exists.

This is normal.

---

# Audit shows REUSED EXISTING

A compatible current Retrospective Case Chat exists.

This avoids duplicate AI work.

---

# Knowledge shows REUSED EXISTING

A compatible current Knowledge artifact exists.

Use **Regenerate KCS / Regenerate Knowledge** if you intentionally want it rebuilt through the latest Knowledge quality pipeline.

---

# Regenerate Audit is disabled

Wait until active/conflicting work is finished and current case/TACO/evidence is ready.

---

# Regenerate Knowledge is disabled

For a normal retrospective it requires:

- completed Audit
- a Knowledge action/artifact type
- no conflicting active work

For **Direct Generate KCS**, a retrospective Audit is not required. Direct KCS regeneration uses current TACO/original evidence and the KCS-family artifact state.

---
# Direct KCS created an Update Proposal

This is valid behavior in **Direct Generate KCS**.

Direct KCS starts with `CREATE KCS / KCS_DRAFT` intent, inspects actual Salesforce KCS content, and can legitimately reconcile to `UPDATE EXISTING KCS / KCS_UPDATE` when a material same-scope match is established. A valid KCS Draft **or** a valid KCS Update Proposal satisfies the required Direct KCS primary.

Normal retrospective mode remains different: the validated Audit owns the Knowledge destination and downstream generation must not silently reroute an Audit-selected CREATE into UPDATE.

If an installed bookmark behaves differently from the current repository documentation, replace/reinstall the bookmark because self-contained bookmarks keep the source bytes that were embedded when they were installed.

---

# Knowledge is DRAFTABLE

This is not necessarily a failure.

It means the artifact is useful but has named material validation items.

Review the inline **REVIEW / REVIEW CURRENTNESS** callouts beside the affected claims/references and resolve the stated required action.

---

# Knowledge is NOT READY

The artifact failed an important quality/safety condition.

Review:

- the header readiness/publication state
- inline **REVIEW / REVIEW CURRENTNESS / BLOCKER** callouts
- Source References and source-state indicators
- the affected claim/reference
- the stated What / Why / required action
- Case Chat result only as diagnostic context, not as the authoritative underlying source

---

# "raw internal provenance marker is visible"

The final article still contains one of:

```text
[inference]
[from case data]
[derived analysis]
```

These are internal investigation markers, not final Knowledge content.

The latest Knowledge pipeline attempts to resolve them automatically.

If the marker remains after the repair pass, the artifact stays NOT READY.

Do not simply remove the word `[inference]` manually while leaving the claim unchanged unless the claim is independently supported.

---

# "unresolved internal placeholder/token is visible"

The final artifact still contains something like:

```text
@@TOKEN@@
```

This is treated as a blocking rendering/content defect.

---

# "unresolved editorial placeholder is visible"

The final article still contains a writing placeholder such as:

```text
TODO
TBD
[insert ...]
[placeholder ...]
```

The article is not publication-ready. When a usable draft exists, it is preserved and can still be downloaded for review.

---

# Missing required section

The artifact type has deterministic required headings.

For a KCS Draft, required sections include:

- Symptoms / Error
- Cause
- How to Check
- How to Confirm
- Resolution / Fix
- Source References

The automatic repair pass may try to restore a missing section without inventing unsupported facts.

---

# Source References problem

The final article must identify underlying supporting sources.

A Source References section that contains only:

```text
TACO
```

or:

```text
Case Chat
```

is insufficient.

Those are synthesis mechanisms rather than the underlying evidence.

---

# Search Keywords problem

A reusable KCS Search Keywords section must not contain the originating:

- XSUP ID
- SFDC case ID

Use symptoms/errors/features instead.

---

# Automatic repair failed

The workflow allows only one evidence-bounded repair pass.

If the repaired artifact still fails:

```text
NOT READY
```

Review the underlying evidence or regenerate after correcting the real source problem.

---

# Quality reviewer returned FAIL

A substantive quality FAIL is not automatically treated as a formatting problem.

Investigate why the Knowledge reviewer considered the artifact unsafe/inadequate.

---

# I only want another copy of the report

Rerun normally and let Smart Reuse recover current results.

Do not use Re-analyze All just for another download.

---

# Browser was refreshed

Run the Snippet again.

Then either:

- rerun XSUP and use Smart Reuse
- Restore Session

---

# Stop All clicked, but Case Chat still runs

Possible.

Stop All controls the browser-side Auditor.

A server-side task already accepted may continue.

---

# Console shows CSP/source-map errors

Not every browser console error belongs to the Auditor.

Correlate:

- URL
- timestamp
- request
- Auditor activity

Do not bypass corporate CSP.

---

# Result looks technically wrong

Do not apply it.

Verify:

1. XSUP/SFDC mapping
2. product
3. TACO conclusion
4. original Engineering evidence
5. original SFDC evidence
6. Audit decision
7. inline REVIEW / REVIEW CURRENTNESS / BLOCKER callouts and Source References

Then choose a targeted Regenerate action only when appropriate.

---

# Bookmark does not run

1. Confirm the simple bookmarklet test works on the TACopilot page.
2. Confirm the bookmark URL still starts with `javascript:`.
3. Confirm TACopilot is the active page when the bookmark is clicked.
4. If the installer drag operation fails, use **Copy bookmark URL** and create the bookmark manually.
5. If managed-browser policy blocks bookmark execution, use the approved DevTools Snippet method instead. Do not bypass corporate controls.

# Generate KCS does not show a retrospective Audit

Expected behavior.

Direct KCS intentionally skips retrospective eligibility and Support-owned field review. It should show the retrospective stage as skipped/not applicable and proceed to the KCS quality pipeline.

# Independent quality validation is unavailable

Transient Case Chat request failures can be retried/recovered by the shared reliability layer.

If independent quality validation still cannot complete but an enriched draft exists:

- the usable draft is preserved;
- the internal quality state can show **`VALIDATION UNAVAILABLE`**;
- the artifact is kept in a conservative review-required state;
- the validation notice explains that independent quality validation was unavailable;
- this is an execution-state warning, not proof that the article received a substantive AI quality `FAIL`.

Re-run the Knowledge workflow or complete the required validation manually before publication.

# NOT READY draft can still be downloaded

Expected behavior when a usable artifact exists.

NOT READY means **blocked for publication**, not **discard the draft**. The draft remains available so the reviewer can resolve the highlighted issues.
