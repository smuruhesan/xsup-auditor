# User Guide

This guide explains how to install and use **XSUP Auditor & KCS Generator**.

The tool has two workflows:

- **Run XSUP Retrospective** — full product-specific retrospective review.
- **Generate KCS** — direct KCS generation from an XSUP or SFDC case without the retrospective field-review step.

---

# 1. Install / run the Auditor

## Option 1 — Bookmark installer (recommended)

File:

```text
dist/XSUP_Auditor_Bookmark_Installer.html
```

### First-time installation

1. Open `XSUP_Auditor_Bookmark_Installer.html` locally in Chrome.
2. Show the Chrome bookmarks bar:
   - macOS: `Cmd + Shift + B`
3. Drag the blue **XSUP Auditor** button onto the bookmarks bar.
4. Open TACopilot.
5. Click the **XSUP Auditor** bookmark.

The Auditor opens on the current TACopilot page.

### If drag-and-drop fails

The HTML installer also contains **Copy bookmark URL**.

1. Click **Copy bookmark URL**.
2. Right-click the Chrome bookmarks bar.
3. Choose **Add page**.
4. Name it:

```text
XSUP Auditor
```

5. Paste the copied value into the **URL** field.
6. Save the bookmark.
7. Open TACopilot and click it.

### Important

The bookmark is self-contained. It does not fetch the Auditor from GitHub, TACopilot backend storage or an external JavaScript host.

If managed Chrome blocks bookmarklets by policy, do not attempt to bypass the policy. Use Option 2 if permitted.

---

## Option 2 — Direct source / Chrome DevTools Snippet

Files:

```text
src/xsup-auditor.js
```

or the copy-friendly equivalent:

```text
dist/XSUP_Auditor_JS.txt
```

The `.txt` file contains the same JavaScript and can be easier to obtain in environments that block direct `.js` downloads.

### First-time Snippet setup

1. Open TACopilot.
2. Open Chrome DevTools.
3. Select **Sources**.
4. Open **Snippets**.
5. Create a new Snippet named `XSUP Auditor`.
6. Copy the complete contents of `src/xsup-auditor.js` or `dist/XSUP_Auditor_JS.txt`.
7. Paste into the Snippet.
8. Save it.
9. Run it while TACopilot is open.

### Existing Snippet

1. Open TACopilot.
2. Open DevTools → **Sources → Snippets**.
3. Select **XSUP Auditor**.
4. Run it.

If the TACopilot page is refreshed, the injected UI disappears. Run the bookmark or Snippet again.

---

# 2. Main controls

At the top of the tool you will see an input field and two primary actions.

## Run XSUP Retrospective

Use when the goal is to review product-specific Support-owned retrospective fields.

Input: XSUP IDs.

Example:

```text
XSUP-72446
XSUP-81234
```

## Generate KCS

Use when the goal is to create a KCS directly from a completed/usable technical case without first running the retrospective field-review prompt.

Input can be:

```text
XSUP-72446
```

or:

```text
04005807
```

Multiple XSUP/SFDC inputs can be supplied using spaces, commas or new lines.

## Stop All

Stops local active/queued Auditor processing. Server-side TACO/Case Chat work already submitted may continue.

## Product selection

Choose:

- **Auto detect**
- **Ask me for every XSUP/case**

If product detection is low-confidence/conflicting, only that case pauses while other jobs continue.

## Choose Folder

Optional. Select an approved writable local or desktop-synced destination when the browser supports the File System Access API.

---

# 3. Run XSUP Retrospective

The retrospective workflow is:

```text
XSUP
 ↓
Resolve SFDC
 ↓
Original evidence
 ↓
Product detection/confirmation
 ↓
TACO freshness decision
 ↓
Retrospective Audit
 ↓
Support-owned field decisions
 ↓
Knowledge action classification
 ↓
Knowledge generation if appropriate
```

## What the Audit reviews

Applicable fields depend on product policy.

For each applicable field, the Audit should provide:

- Current Value
- Correct / INCORRECT / UNDETERMINED
- Change Required
- Recommended Value
- Detailed Explanation
- Supporting Evidence
- exact Support Action

The workflow does not perform broad TAC performance scoring by default.

---

# 4. How Knowledge type is chosen during an XSUP retrospective

After the field decision, the Retrospective Audit prompt performs an explicit **Knowledge Decision**.

It chooses one primary action and can also suggest a secondary action.

| Action | Selection rule in the prompt | Artifact |
|---|---|---|
| **CREATE KCS** | A repeatable Support-resolution pattern exists: symptom/error → check → confirm → fix/workaround → verify | KCS Draft |
| **UPDATE EXISTING KCS** | Relevant KCS already exists but materially lacks the required resolution content | KCS Update Proposal |
| **UPDATE ADMIN/TECH GUIDE** | Official behavior/configuration/expectation needs clearer administrator/customer documentation | Admin/Tech Guide Update Proposal |
| **CREATE/UPDATE RUNBOOK** | Reusable value is an internal investigation/evidence procedure rather than a complete resolution article | Runbook Draft |
| **KNOWN ISSUE/RELEASE NOTE** | Version-specific defect/limitation belongs in known-issue or release communication | Known Issue / Release Note Draft |
| **NO KNOWLEDGE ACTION** | No material reusable gap | No artifact |
| **UNDETERMINED** | Evidence is not sufficient to choose safely | No automatic artifact |

The Audit also reports:

- Existing Knowledge Coverage
- Knowledge Decision Explanation
- Knowledge Evidence
- Validation Boundary
- initial Artifact Readiness
- Auto-Generate Knowledge Artifact: YES/NO

The JavaScript does not independently guess the artifact using simple keywords. It parses the Case Chat decision and maps it to the correct artifact template and quality checks.

---

# 5. Generate KCS — direct mode

Direct KCS mode is intentionally simpler.

When you click **Generate KCS**, the tool assumes the requested Knowledge type is a KCS.

It sets:

```text
Primary Knowledge Action: CREATE KCS
Artifact Type: KCS Draft
```

It does **not** ask the retrospective prompt to choose Admin Guide vs KCS vs Runbook vs Known Issue.

## Direct KCS flow

```text
XSUP or SFDC
 ↓
Resolve case context
 ↓
Detect / confirm product
 ↓
Check current TACO
 ↓
Reuse / wait / refresh TACO when required
 ↓
Collect original Jira/SFDC evidence
 ↓
Generate KCS Draft
 ↓
Independent Quality Review
 ↓
Automatic Code Checks
 ↓
Optional One-time Repair
 ↓
READY / DRAFTABLE / NOT READY
```

The retrospective Support-owned field review is shown as intentionally skipped/not applicable.

### SFDC-only input

An XSUP is not required for direct KCS mode.

If the input is an 8-digit SFDC case, the tool starts from that case and can retain a linked XSUP in provenance if one is found in the case context.

---

# 6. Product selection

Supported profiles:

- XDR/XSIAM
- XSOAR
- Cortex Cloud

The selected product helps frame case context and retrospective policy.

For retrospective mode, product selection determines the eligibility trigger and applicable Support-owned fields.

For direct KCS mode, it does **not** create a retrospective eligibility decision; it scopes the KCS generation/quality context.

If the wrong product is selected for a retrospective, use **Change Product & Re-run Review**. Current TACO can still be reused when source-current.

---

# 7. TACO freshness

Typical decisions:

## REUSE

A complete usable TACO analysis exists and no newer Jira/SFDC evidence requires refresh.

## WAIT

No usable final result is available yet, but an analysis is genuinely running.

## START

No TACO investigation exists.

## REFRESH

Used when:

- newer original case evidence exists
- the existing result is incomplete/failed
- there is no usable final conclusion
- the reviewer deliberately uses **Re-analyze All**

Age alone does not force refresh.

---

# 8. Knowledge quality workflow

Once Knowledge generation starts, retrospective mode and direct KCS mode use the same quality engine.

```text
1. Generate enriched draft
   + preliminary inline markers
        ↓
2. Independent quality review
        ↓
   if quality request is rejected:
   one compact quality retry
        ↓
3. Deterministic JavaScript checks
        ↓
4. One repair pass if safe/appropriate
        ↓
5. Deterministic checks again
        ↓
READY / DRAFTABLE / NOT READY
```

Every artifact requires **At a Glance** near the top.

## Inline review markers

- **⚠ SME REVIEW** — product behavior, UI path, timing, configuration or operational detail needs validation
- **⚙ ENGINEERING REVIEW** — backend/API/architecture/implementation claim needs Engineering confirmation
- **◇ INFERENCE** — derived but not directly established
- **🔎 SOURCE CHECK** — needs a stronger/direct source
- **🧭 SCOPE CHECK** — version/platform/tenant/applicability needs confirmation
- **ℹ RECOMMENDATION** — guidance/best practice rather than mandatory behavior
- **✓ CONFIRMED** — important claim directly supported
- **✕ UNSUPPORTED** — material claim lacks sufficient support

The generator is instructed to add preliminary markers even before the independent quality stage so a usable draft remains reviewable if the quality request itself fails.

---

# 9. Knowledge readiness

## READY

Useful/materially complete; no material unresolved validation item identified by the quality workflow.

## DRAFTABLE

Useful draft; one or more named material review items remain.

## NOT READY

A usable draft exists but a material blocker remains.

The draft is preserved and displays:

```text
✕ REVIEW REQUIRED

What to review:
...

Why:
...
```

NOT READY is not the same as execution failure.

## Failed Knowledge job

`failed` is reserved for cases where no usable artifact could be generated/preserved.

## Quality review execution error

If independent quality Case Chat is rejected, the tool retries once using a compact quality prompt. If quality still cannot complete but an enriched draft exists, the draft is preserved as **NOT READY** and the internal state is recorded as a quality-review execution error rather than pretending the AI judged the article itself to be a substantive quality FAIL. The diagnostic internal status is `QUALITY_REVIEW_ERROR`.

---

# 10. Analysis & Reuse Status

Retrospective mode can show:

- TACO Analysis
- Retrospective Audit
- Knowledge Artifact

Direct KCS mode shows:

- TACO Analysis
- Direct KCS / Knowledge
- retrospective field review intentionally skipped

Use the status cards to understand whether each result was reused or newly generated.

---

# 11. Regeneration controls

## Regenerate Audit

Uses current TACO/evidence and generates a fresh retrospective only.

Prior Knowledge is marked outdated when it depended on the old Audit. It is not automatically regenerated.

## Regenerate KCS / Regenerate Knowledge

Runs the Knowledge pipeline again without unnecessarily rerunning TACO or the retrospective.

In direct KCS mode, **Regenerate KCS** uses the current TACO/evidence and creates a fresh direct KCS pipeline result.

## Re-analyze All

Forces fresh TACO and rebuilds downstream required work.

Use only when a genuinely fresh end-to-end analysis is intended.

---

# 12. Smart Reuse

Reuse is source-driven.

A compatible current result may be reused when its source boundary still matches.

A product/source change invalidates incompatible derived results.

Direct KCS includes its workflow mode in Knowledge reuse identity so it does not accidentally reuse a different artifact intent.

---

# 13. Concurrency

- up to **2** case/audit workers
- **1** Knowledge worker

Knowledge generation can continue while the case/audit queue advances.

---

# 14. Reports and downloads

Outputs can include:

- Retrospective Audit HTML
- Review Paste Comment text
- KCS Draft HTML
- KCS Update Proposal
- Admin/Tech Guide Update Proposal
- Runbook Draft
- Known Issue / Release Note Draft

Direct KCS does not create a retrospective report just for the internal case basis.

A usable **NOT READY** Knowledge draft remains visible/downloadable for review; it is clearly marked as blocked for publication.

---

# 15. Human review

The tool does not:

- automatically change Jira/SFDC
- automatically post the Review Paste Comment
- automatically publish Knowledge
- replace TAC/SME/Engineering/documentation-owner judgment

A qualified reviewer remains responsible for final action and publication.
