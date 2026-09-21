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
3. Drag the green **XSUP Auditor** button onto the bookmarks bar.
4. Open any authenticated page under `https://taco.paloaltonetworks.com:3009/taco/`.
5. Click the **XSUP Auditor** bookmark.

Supported launch examples include TACO Pilot and individual case pages such as `https://taco.paloaltonetworks.com:3009/taco/case/03744225`. The bookmark accepts only the exact TACO origin/port and the `/taco` path tree.

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
7. Open any authenticated page under `https://taco.paloaltonetworks.com:3009/taco/` and click it.

### Important

The bookmark is self-contained. It does not fetch the Auditor from GitHub, TACopilot backend storage or an external JavaScript host.

Because the source is embedded in the bookmark, **existing installed bookmarks do not auto-update**. After a new release, delete/replace the old bookmark and drag the current installer button again.

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

When you click **Generate KCS**, the tool treats the request as **KCS-family intent**. It does **not** ask the retrospective prompt to choose Admin Guide vs KCS vs Runbook vs Known Issue.

The direct workflow begins as `CREATE KCS / KCS_DRAFT`, then inspects the actual content of available Salesforce KCS candidates. If one materially covers the same issue and can be extended, Direct Generate KCS may return `UPDATE EXISTING KCS / KCS_UPDATE` instead.

This reconciliation is based on same-scope content comparison, not title/keyword similarity. If candidate content is unavailable, the tool keeps a new KCS draft and surfaces a REVIEW rather than guessing an update target. If UPDATE is recommended, the reviewer can still choose **Create New KCS Anyway**; the new article should reference the overlapping KCS.

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
Inspect available existing Salesforce KCS content
 ↓
Create KCS Draft OR Existing KCS Update Proposal
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
        ↓
2. Independent quality review
        ↓
3. Deterministic JavaScript checks
        ↓
4. One repair pass if safe/appropriate
        ↓
5. Deterministic checks again
        ↓
READY / DRAFTABLE / NOT READY
```

The normal path uses two substantive Knowledge prompts: generation and independent quality review. Transient Case Chat transport failures can be retried/recovered by the reliability layer without creating a separate quality stage. One evidence-bounded repair prompt may be used when the problem can be repaired safely from the evidence already available.

Every generated Knowledge artifact includes **At a Glance** near the top.

## Inline review and blocker markers

The final artifact uses three reader-facing marker states:

- **⚠ REVIEW** — a material claim or reference needs validation before authoritative reuse/publication.
- **⚠ REVIEW CURRENTNESS** — historical, version-specific, case-specific, or otherwise non-current evidence materially supports a reusable claim and its current applicability needs confirmation.
- **✕ BLOCKER** — a material publication blocker remains.

The callout beside the affected claim/reference explains:

- the **Review type**;
- **What** needs review;
- the relevant **Source(s)** / `[R#]` references;
- **Why** the issue matters;
- the required **Outcome / action**.

Review types include `UI_NAVIGATION`, `CLI_COMMAND`, `API_CONTRACT`, `TIMING_SLA`, `FILE_LOG_PATH`, `SOURCE_CURRENTNESS`, `MISSING_SOURCE_OR_LINK`, `DERIVATIVE_AI_EVIDENCE`, `INTERNAL_ARCHITECTURE`, `DOCUMENTATION_PLACEMENT`, `CITATION_GAP`, and `OTHER_MATERIAL_VALIDATION`.

Source References can also show source-state indicators such as **✕ BLOCKER SOURCE**, **⚠ REVIEW CURRENTNESS**, or a current/maintained state.

---

# 9. Knowledge readiness

## READY

Useful/materially complete; the automated quality workflow has not identified a material unresolved validation item.

READY still requires the normal human editorial/publication review.

## DRAFTABLE

A useful draft exists, but one or more named material review items remain.

## NOT READY

A usable draft exists but a material blocker remains, or independent quality validation could not be completed safely.

The draft is preserved with visible validation guidance. NOT READY is not the same as execution failure.

## Failed Knowledge job

`failed` is reserved for technical execution problems where no usable artifact can be generated or preserved.

## Quality validation unavailable

If the independent quality stage is temporarily unavailable but a usable enriched draft exists, the artifact is preserved conservatively for review. The internal quality status can show **`VALIDATION UNAVAILABLE`** and the publication state remains review-required rather than pretending that the independent quality reviewer returned a substantive `FAIL`.

Re-run the quality/generation workflow or perform the required human validation before publication.

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

- **XSUP/TACO workers:** default 2; selectable 2 / 3 / 5 / 10
- **Knowledge workers:** 2
- **Shared Case Chat generation cap:** 2 mutating generations across Audit + Knowledge

The higher XSUP/TACO setting affects independent evidence/TACO processing; it does not increase the Case Chat generation cap.

---

# 14. Reports and downloads

With **Auto-save/request completed artifacts** enabled (default), normal retrospective flow requests the Audit HTML first. Only after that request is initiated does downstream Audit-selected Knowledge generation start. Completed Knowledge artifacts then request standalone HTML downloads. Direct KCS mode has no retrospective Audit download.

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
