# Troubleshooting

Start with:

1. Live Dashboard
2. selected XSUP detail
3. Analysis & Reuse Status
4. Execution Pipeline
5. TACopilot → Case → TACO Analysis → Case Chat

## Nothing starts after entering IDs

The current v1.0 workflow is staged.

1. Click **Load XSUPs** or **Load as KCS Only**.
2. Configure Workflow and Run Mode.
3. Check the rows to run.
4. Click **Run Selected**.

Loading alone intentionally does not start TACO/Audit/Knowledge generation.

## A row says Choose SFDC

Select the correct linked Salesforce case.

Only that row should wait.

If automatic mapping is unavailable, use the manual SFDC fallback when offered.

## Why are more than two XSUP/TACO rows active?

XSUP/TACO worker parallelism is selectable: 2, 3, 5 or 10.

This does **not** mean more than two Case Chat generations are running. Case Chat generation remains capped at 2.

## Knowledge is queued while other work continues

Expected.

Knowledge uses independent workers and the shared Case Chat generation cap.

## Automatic mode reused an old result

Automatic mode is designed to reuse a compatible result when it remains valid for the current source evidence.

If you deliberately need fresh output, select the appropriate **Regenerate** Run Mode before running.

## I selected Regenerate Audit but it reused an old Audit

That is not expected in this release.

Explicit Regenerate Audit must bypass existing Case Chat reuse for the Audit stage.

Capture:

- XSUP
- selected Workflow
- selected Run Mode
- visible Case Chat ID/date
- expected vs actual behavior

and report it to the maintainer through an approved internal channel.

## I selected Regenerate Knowledge/KCS but it reused an old Knowledge result

That is not expected.

Explicit Regenerate Knowledge/KCS must force a fresh selected-stage Case Chat.

## When should I regenerate TACO?

Use an explicit **Regenerate TACO Analysis + ...** Run Mode only when a fresh source analysis is intended.

Automatic mode can reuse a usable TACO analysis while still preventing stale downstream Audit/Knowledge reuse when newer Jira/SFDC evidence exists.

## Audit completed but Knowledge is still running

Normal for **Audit + Knowledge**.

The Audit stage can finish before downstream Knowledge finishes.

## Knowledge shows REVIEW

The draft is usable, but one or more named items require validation.

Resolve the inline review/currentness/source/scope/runnable-content item before publication.

## Knowledge shows BLOCKER / NOT READY

A usable draft may still exist, but a material issue remains.

Do not publish or treat the draft as authoritative until the blocker is resolved.

BLOCKER is not necessarily the same as generation failure.

## Dashboard status and downloaded artifact wording differ

The v1.0 pilot can still have minor summary-status propagation differences in edge cases.

For publication/reuse decisions, use:

1. the downloaded Knowledge artifact's detailed quality state;
2. inline REVIEW/BLOCKER items;
3. Source References;
4. required SME/Cortex Brain validation.

Do not publish based only on a dashboard color/status.

## CREATE KCS was recommended even though related knowledge exists

Related knowledge is not always the same as an existing Salesforce KCS.

If a specific Salesforce KCS is identified with meaningful overlap, the workflow should compare coverage and apply mergeability logic.

If the article appears mergeable but CREATE was still recommended without a distinct-scope explanation, flag it for reviewer feedback.

## Existing Salesforce KCS link looks wrong

The current release canonicalizes Salesforce Knowledge links.

A valid KCS link should point to:

`.../lightning/r/Knowledge__kav/<article-id>/view`

If a KCS link includes Markdown residue or points to Jira/Confluence/vendor docs instead, report it as a defect.

## Why is normal observable behavior marked BLOCKER?

The safety classifier is intentionally conservative in the v1.0 pilot and may occasionally over-review a statement supported mainly by internal Engineering/case evidence.

The article is preserved so an SME can validate/generalize it. This is preferable to silently treating internal or release-specific behavior as a public guarantee.

## Public article contains deep implementation details

Check whether the detail is also available in **Internal Notes — TAC Only** and whether maintained public authority supports the public wording.

If privileged/backend mechanics remain in the public body without appropriate authority, treat the item as needing review before publication.

## How do I validate a KCS with Cortex Brain?

Open the downloaded KCS HTML and scroll to the very bottom.

Under **SME Validation Tools**, use:

- **Copy for Cortex Brain**, or
- **Download for Cortex Brain**.

The export is marked **MANDATORY VALIDATION — NOT PUBLICATION READY** and contains the clean KCS plus `[R#]`/Source References.

## Why doesn't the Cortex Brain export show XSUP Auditor REVIEW/BLOCKER callouts?

By design.

Cortex Brain receives the clean proposed KCS and sources so it can independently validate the technical content rather than merely echoing the Auditor's judgment.

## Case Chat returns a transient/service error

Check native TACopilot/Case Chat directly.

If native Case Chat works but the tool fails repeatedly, capture the visible request/stage error and report it. Do not assume a generic service-maintenance message proves all native Case Chat functionality is unavailable.

## Stop All was clicked but TACopilot still shows a task running

Possible.

Stop All cancels the Auditor's local queues/polling/requests as far as possible. A server-side request already accepted may continue.

## Browser refresh removed the Auditor panel

Run the bookmark/snippet again.

Then either:

- reload the XSUPs and allow Automatic reuse to recover compatible server-side results, or
- restore a saved session if you used Save Session.

## Result looks technically wrong

Do not apply/publish it.

Verify:

1. correct XSUP/SFDC
2. correct product
3. current TACO
4. original Jira/Engineering evidence
5. original Salesforce evidence
6. existing KCS/docs
7. downloaded artifact review/blocker details
8. Cortex Brain/SME validation when KCS is involved

## Reporting a tool problem

Provide the maintainer, through an approved internal channel, with:

- XSUP
- selected Workflow
- selected Run Mode
- expected behavior
- actual behavior
- visible stage/status
- relevant Case Chat ID/date when safe
- sanitized error/debug information if required

Do not put customer-sensitive diagnostics into an unapproved GitHub issue.
