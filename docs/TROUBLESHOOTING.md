# Troubleshooting

Start with:

1. Live Dashboard
2. Analysis & Reuse Status
3. Execution Pipeline
4. TACopilot → Case → TACO Analysis → Case Chat

---

# Auditor panel disappeared

A browser refresh removes the injected panel.

Run the Chrome DevTools Snippet again.

---

# Nothing happens after entering an XSUP

Click **Run Audit(s)**.

Confirm the Snippet is running from the TACopilot site.

---

# Only two XSUPs are running

Expected.

There are two Audit workers.

The next queued XSUP starts automatically when a worker becomes free.

---

# Knowledge is waiting even though Audit finished

Expected when another Knowledge job is using the single Knowledge worker.

Audit workers continue independently.

---

# Audit says 100% but XSUP is still active

Check the Knowledge Artifact status.

Audit can be complete while Knowledge is:

- checking history
- queued
- generating
- quality reviewing

---

# Product confirmation required

Automatic product detection was not high confidence.

Choose:

- XDR/XSIAM
- XSOAR
- Cortex Cloud

Only that XSUP waits.

---

# Multiple SFDC matches

Select the actual linked SFDC case.

The tool does not guess.

---

# Mapping not found

TACopilot search did not provide a confident XSUP → SFDC mapping.

Verify the XSUP/linkage.

---

# TACO says REUSED EXISTING

A usable completed TACO exists and current Jira/SFDC evidence does not require refresh.

This is normal.

---

# TACO started/refreshes unexpectedly

Check the reason shown under TACO Analysis.

Typical causes:

- no existing investigation
- no usable final report
- previous TACO failed
- newer Jira/SFDC source evidence
- Re-analyze All

Old age alone should not force refresh.

---

# Audit says REUSED EXISTING

A compatible Case Chat retrospective already exists and is still current for the source/product.

The auditor reuses it to avoid duplicate analysis.

---

# Knowledge says REUSED EXISTING

A compatible Knowledge artifact already exists and is current.

If it predates the latest Knowledge-quality workflow but remains source-current, it may still be reused intentionally.

Use **Regenerate KCS / Regenerate Knowledge** if you want it rebuilt with the current enrichment/quality workflow.

---

# Regenerate Audit button is disabled

It is disabled when it is unsafe to start, for example:

- active Audit/Knowledge work is still running/queued
- current SFDC/TACO/evidence is not ready

Wait for active work to finish.

---

# Regenerate Knowledge button is disabled

It requires:

- a completed current Audit
- a Knowledge action/artifact type
- no conflicting active work

---

# What does Regenerate Audit do?

Fresh Audit only.

It does not rerun TACO.

It does not automatically regenerate Knowledge.

Existing Knowledge tied to the previous Audit can become outdated.

---

# What does Regenerate Knowledge do?

Fresh Knowledge only.

It keeps current TACO and Audit.

---

# What does Re-analyze All do?

Fresh:

```text
TACO → Audit → Knowledge
```

Use only when a full refresh is intended.

---

# Knowledge is DRAFTABLE

The draft is useful but material validation items remain.

Read the validation items and perform the required human review.

---

# Knowledge is NOT READY

The quality gate determined the artifact could not safely be treated as a useful final draft.

Review the underlying Audit/evidence.

Regenerate only after the source/validation problem is understood.

---

# Knowledge failed

Check:

- Case Chat state
- quality summary/error
- whether a previous compatible artifact exists
- whether the generated draft failed deterministic checks

Do not treat a failed artifact as publication-ready.

---

# I only want another report copy

Run the XSUP normally.

If source state is unchanged, Smart Reuse should recover the existing result.

Do not use Re-analyze All merely to redownload.

---

# Browser was refreshed

Run the Snippet again.

Then either:

- rerun the XSUP and allow Smart Reuse to recover current server-side results
- restore a saved session JSON

---

# Restored job shows stopped

Expected if the job was active when the session was saved.

The session cannot truthfully restore an in-memory browser task as still running.

Completed data is preserved.

---

# Choose Folder is unavailable/blocked

Use normal browser downloads.

Do not bypass managed browser or corporate controls.

---

# Stop All was clicked but TACopilot still shows Case Chat running

Possible.

Stop All aborts the local auditor workflow/queues/polling.

A server-side task already submitted may continue.

Check TACopilot directly.

---

# Result looks technically wrong

Do not apply the recommendation.

Verify:

1. correct XSUP/SFDC
2. correct product
3. TACO conclusion
4. original Jira Engineering evidence
5. original SFDC evidence
6. Case Chat source/reuse status
7. applicable product policy

Use a targeted Regenerate control only when it helps answer a real freshness/quality need.

---

# Browser console shows unrelated CSP/source-map errors

Managed/web applications can produce their own console errors.

Do not assume every console error is caused by the auditor.

Correlate the timestamp/URL/error with the auditor request before treating it as an auditor defect.

The auditor itself should not attempt to bypass CSP.

---

# Reporting a tool problem

Provide the internal maintainer with:

- XSUP (only in an approved channel)
- expected behavior
- actual behavior
- visible Analysis & Reuse Status
- visible Execution Pipeline status
- sanitized console error if relevant
- sanitized debug export if required

Do not put customer-sensitive diagnostics into an unapproved GitHub issue.
