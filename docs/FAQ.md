# FAQ

## What is XSUP Retrospective Auditor?

A Chrome DevTools Snippet that coordinates TACopilot, TACO Analysis, Jira/SFDC evidence and Case Chat to help reviewers complete product-specific XSUP retrospective reviews and generate reusable Knowledge drafts.

---

## Is the Auditor itself the AI?

No.

The JavaScript is the workflow/orchestration layer.

TACO and Case Chat perform AI analysis.

The Auditor controls:

- data collection
- product policy
- source/evidence boundaries
- reuse
- prompts
- status
- validation
- Knowledge quality gates
- downloads

---

## Where is Case Chat?

**TACopilot → Case → TACO Analysis → Case Chat**

The Auditor uses it automatically.

---

## Does it update Jira/SFDC automatically?

No.

It recommends the Support action.

A reviewer performs approved changes through the normal workflow.

---

## Does it automatically post the Review Paste Comment?

No.

It creates copyable text only.

---

## Does it automatically publish KCS/docs?

No.

All Knowledge is a draft/proposal for human review.

---

## What products are supported?

- XDR/XSIAM
- XSOAR
- Cortex Cloud

---

## Why one Snippet instead of three?

The common workflow is the same.

Only the product-specific trigger and applicable fields differ.

A shared engine makes behavior such as TACO freshness, Smart Reuse, Knowledge quality and UI status consistent.

---

## How is product detected?

The Auditor prefers stronger structured metadata from the case/TACO context.

High confidence continues automatically.

Ambiguous/low confidence pauses only that XSUP.

---

## Can I select product manually?

Yes.

Use:

**Ask me for every XSUP**

or:

**Change Product & Re-run Review**

---

## How many XSUPs can run simultaneously?

Two Audit jobs.

Additional jobs queue automatically.

---

## How many Knowledge jobs run simultaneously?

One Knowledge job.

Audit workers can continue independently.

---

## Why can Audit show 100% while the XSUP is still active?

Because Audit and Knowledge are separate stages.

Knowledge may still be:

- checking reuse
- queued
- enriching
- quality reviewing
- repairing
- downloading

Overall XSUP status should reflect the full required workflow.

---

## Why does the Auditor reuse existing Case Chat?

To avoid:

- duplicate AI work
- duplicate Case Chat entries
- unnecessary TACO/Case Chat load
- inconsistent answers for unchanged source data

---

## Does changing the JavaScript automatically regenerate everything?

No.

Source-current Audit/Knowledge can still be reused.

Use an individual Regenerate button when you intentionally want the latest workflow applied.

---

## What causes automatic refresh/regeneration?

Examples:

- newer Jira/SFDC evidence
- stale/incomplete/failed TACO
- product change
- incompatible result type
- no safe reusable result

---

## What does Regenerate Audit do?

Fresh Retrospective Audit using current TACO/evidence.

It does not rerun TACO.

It does not automatically regenerate Knowledge.

---

## What does Regenerate KCS / Regenerate Knowledge do?

Fresh Knowledge only.

It keeps the current TACO and current completed Audit.

It runs the current enrichment + quality + repair pipeline.

---

## What does Re-analyze All do?

Full refresh:

```text
TACO → Audit → Knowledge
```

---

## What is Initial Readiness?

The Retrospective Audit's estimate of whether enough evidence exists to draft Knowledge.

It is not the final quality status.

---

## What is Validated Readiness?

The readiness after the Knowledge Quality Review and deterministic gate.

Possible values:

- READY
- DRAFTABLE
- NOT READY

---

## What is READY?

The draft is useful/materially complete and no material validation item remains.

It still requires human publication review.

---

## What is DRAFTABLE?

The artifact is useful, but named material validation items remain.

Example:

```text
Architecture is supported.
Exact API schema still needs documentation-owner validation.
```

---

## What is NOT READY?

The artifact is too incomplete, unsupported or unsafe to treat as a final usable Knowledge draft.

---

## Why did my Knowledge article get blocked for "raw internal provenance marker is visible"?

Because the final artifact still contained an internal reasoning marker such as:

```text
[inference]
[from case data]
[derived analysis]
```

Those are allowed during analysis, but not in the final user-facing article.

The latest workflow attempts to resolve them safely and can run one automatic repair pass.

---

## Why not just delete `[inference]`?

Because that can turn an uncertain claim into a false-looking confirmed fact.

Example:

```text
Policy applies in 10 minutes [inference]
```

must not become:

```text
Policy applies in 10 minutes
```

unless underlying evidence supports it.

The system should instead:

- prove and source it
- move it to Validation
- or remove it

---

## What is the automatic Knowledge repair pass?

If the AI produces a mostly good artifact but deterministic checks find a generic repairable defect, the tool gives it one evidence-bounded repair attempt.

Examples:

- internal provenance marker
- unresolved placeholder
- missing required section
- incorrect Search Keywords
- Source References issue
- malformed quality envelope

The repaired result must pass deterministic checks again.

---

## Does the repair pass invent new technical facts?

It must not.

The repair prompt is limited to the existing retrospective/draft/evidence basis.

---

## Why only one automatic repair?

To avoid endless AI loops and repeated Case Chat calls.

If one repair does not make the artifact safe, the result should remain NOT READY for human investigation.

---

## Does a substantive AI quality FAIL get automatically repaired?

No.

The repair path is for repairable quality/safety defects, not to overrule a meaningful quality-review failure.

---

## What deterministic checks are done on a KCS?

Examples:

- article is not obviously incomplete
- no internal reuse metadata
- no unresolved `@@...@@` token
- no raw `[inference] / [from case data] / [derived analysis]`
- no TODO/TBD placeholder
- balanced Markdown code fences
- required KCS sections exist
- correct source XSUP
- XSUP/SFDC not in reusable Search Keywords
- Source References identify underlying sources
- Validation Items and readiness agree

---

## What KCS sections are required by the deterministic gate?

For a new KCS Draft:

- Symptoms / Error
- Cause
- How to Check
- How to Confirm
- Resolution / Fix
- Source References

Useful additional sections can include Applies To, How to Verify, Additional Troubleshooting, Expected Behavior / Limitations, Search Keywords and Validation Items.

---

## Why can't Source References just say TACO or Case Chat?

Because TACO/Case Chat is the synthesis mechanism.

The article should identify the underlying source when available, such as an official doc, Engineering Jira, KCS, SFDC evidence or technical guide.

---

## Why are XSUP/SFDC IDs blocked from Search Keywords?

A future engineer should discover the KCS using a symptom, error, process, feature or failure pattern—not by already knowing an old ticket number.

---

## Can AI still be wrong after all these checks?

Yes.

AI quality review + deterministic checks reduce risk but do not eliminate it.

Human review remains required.

---

## What happens after browser refresh?

Run the Snippet again.

Then:

- rerun the XSUP and let Smart Reuse recover current server-side results, or
- Restore Session from saved JSON

---

## What does Stop All do?

Stops local Auditor processing/queues/polling.

A server-side TACO/Case Chat task already accepted may continue.

---

## Where are reports stored?

Browser Downloads by default.

The reviewer can explicitly choose an approved local/desktop-synced folder.

---

## Is the tool formally InfoSec approved?

Do not assume so.

Do not describe the tool as certified/approved/compliant unless formal approval has actually been granted.

---

## What should never be committed to GitHub?

Do not commit real:

- customer details
- case history
- session exports
- generated customer-case reports
- support bundles/logs
- browser tokens/cookies
- credentials/secrets

Use sanitized examples only.

---

## What should I do if the result looks wrong?

Do not apply it.

Check:

1. XSUP/SFDC
2. product
3. TACO state
4. original evidence
5. Analysis & Reuse Status
6. Audit decision
7. Knowledge quality/readiness
8. Validation Items
