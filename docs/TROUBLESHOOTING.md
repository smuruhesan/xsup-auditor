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

# Only two XSUPs are running

Expected.

Audit concurrency is 2.

Additional XSUPs queue automatically.

---

# Knowledge is queued

Expected when the single Knowledge worker is busy.

Audit workers continue independently.

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

It requires:

- completed Audit
- a Knowledge action/artifact type
- no conflicting active work

---

# Knowledge is DRAFTABLE

This is not necessarily a failure.

It means the artifact is useful but has named material validation items.

Review the Validation section.

---

# Knowledge is NOT READY

The artifact failed an important quality/safety condition.

Review:

- Quality Summary
- Validation Items
- source evidence
- deterministic issue
- Case Chat result

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

The article is not considered final enough for normal Knowledge download.

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
7. Quality Summary / Validation Items

Then choose a targeted Regenerate action only when appropriate.
