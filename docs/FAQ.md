# FAQ

## What does XSUP Retrospective Auditor do?

It automates the repetitive parts of an XSUP retrospective.

It finds the linked SFDC case, manages TACO Analysis, reads original evidence, uses Case Chat for the retrospective, recommends Support-owned field changes, generates reusable knowledge when useful and downloads the reports.

---

## Where is Case Chat?

In TACopilot:

**Case → TACO Analysis → Case Chat**

It appears at the bottom of TACO Analysis after an analysis exists.

The auditor submits its Audit/Knowledge prompts automatically.

---

## Why does it run in the browser?

The browser Snippet can operate inside the reviewer's existing authenticated TACopilot session.

That avoids distributing a separate password, API key or service-account credential with the tool.

It also allows the workflow to use TACopilot same-origin capabilities.

The browser design is not intended to bypass corporate security controls.

---

## Does it bypass authentication or authorization?

No.

It uses the access of the currently signed-in TACopilot reviewer.

It should not provide access to a case the reviewer cannot normally access.

---

## Is it InfoSec approved?

Do not assume so.

The design intentionally avoids embedded credentials and automatic external data export, but that is not the same as formal InfoSec/security approval.

Do not describe it as certified/approved/compliant unless formal approval has actually been granted.

---

## Does it modify Jira or Salesforce?

No.

It recommends the Support action.

The reviewer performs any approved ticket change through the normal workflow.

---

## Does it automatically post comments?

No.

It creates a **Review Paste Comment** for copying when appropriate.

---

## Does it publish KCS or documentation?

No.

Generated knowledge is a draft/proposal for review.

---

## What products are supported?

- XDR/XSIAM
- XSOAR
- Cortex Cloud

See [Product Policies](PRODUCT_POLICIES.md).

---

## Why are XDR and XSIAM combined?

They use one shared retrospective product profile in the current tool.

This reduces duplicated policy logic while the exact detected product context can still be represented in the case/TACO evidence.

---

## How does product detection work?

The auditor prefers structured case/TACO product information.

High-confidence detection continues automatically.

Uncertain/ambiguous cases pause for reviewer selection.

---

## Can I choose the product manually?

Yes.

Set Product selection to:

**Ask me for every XSUP**

Or use **Change Product & Re-run Review** for a selected XSUP.

---

## How many XSUPs run at once?

Two Audit workers.

Additional XSUPs queue automatically.

---

## How many KCS/Knowledge drafts run at once?

One Knowledge worker.

Audit workers can continue while Knowledge runs.

---

## Why only one Knowledge worker?

It keeps simultaneous TACopilot/Case Chat load conservative while still allowing Audit throughput.

---

## Why does Audit show 100% while Knowledge is still running?

Audit and Knowledge are independent workers.

Audit can finish before Knowledge.

The overall XSUP status and Knowledge Artifact status show whether the full required workflow is still active.

---

## How do I know whether something was reused?

Look at:

**Analysis & Reuse Status**

It shows TACO, Retrospective Audit and Knowledge independently.

Case Chat ID/date are shown when available.

---

## Why reuse old Case Chat instead of generating again?

To avoid:

- duplicate Case Chat entries
- unnecessary TACO/AI work
- unnecessary load
- inconsistent answers for unchanged source evidence

Reuse is allowed only when the prior result is still current/compatible.

---

## Does a code change automatically force a new Audit/KCS?

No.

A local auditor code/prompt/UI improvement by itself should not cause an otherwise-current source result to be regenerated.

Use the individual **Regenerate** control if you want to intentionally apply the latest methodology.

---

## What automatically causes regeneration?

Examples include:

- newer Jira/SFDC source evidence
- TACO source becoming stale/incomplete/failed
- product change
- incompatible Audit/Knowledge type
- no current compatible result

---

## What is Regenerate Audit?

Creates a new Retrospective Audit using current TACO + evidence.

It does not rerun TACO.

It does not automatically regenerate Knowledge.

---

## What is Regenerate KCS / Regenerate Knowledge?

Creates only a fresh Knowledge artifact from the current completed Audit.

It runs the current Knowledge Enrichment + Quality Review workflow.

---

## What is Re-analyze All?

The complete override:

**Fresh TACO → Fresh Audit → Fresh Knowledge**

---

## Should I use Re-analyze All to download again?

No.

Run the XSUP normally.

If current reusable results exist, they can be reused and the reports recreated.

---

## What is UNDETERMINED?

The evidence is insufficient to safely make the requested field decision.

It is a valid safety result.

---

## What is READY?

The generated knowledge draft is useful/materially complete and no material validation item remains.

It still requires human publication review.

---

## What is DRAFTABLE?

The draft is useful but has named material validation items that need human review.

---

## What is NOT READY?

The artifact cannot safely be treated as a final useful draft.

---

## Can the AI be wrong?

Yes.

TACO and Case Chat are analytical systems and can misunderstand, omit or overstate information.

The tool adds provenance rules, deterministic checks and a Knowledge quality review, but human review remains required.

---

## Does the Knowledge AI add extra information?

It can enrich the draft using directly relevant source material actually available to the TACO/Case Chat investigation.

New factual claims must be source-backed.

---

## Does it search the public internet?

The auditor's case workflow is designed around TACopilot/TACO/Case Chat and internal source material available there.

Do not add external telemetry, public AI APIs or external storage integrations without the appropriate review.

---

## Where are reports stored?

Browser Downloads by default.

The reviewer can explicitly choose an approved local/desktop-synced folder.

---

## Does the selected folder persist forever?

No.

The browser folder handle is session-only.

It is not serialized into Save Session JSON.

---

## What happens after browser refresh?

Run the Snippet again.

Then:

- rerun the XSUP and allow Smart Reuse to recover server-side results, or
- Restore Session from a saved JSON file

---

## What does Stop All do?

It stops the auditor's local processing/queues/polling.

A server-side TACO/Case Chat task already submitted may continue.

---

## Does it upload reports to GitHub?

No.

GitHub is for source/documentation.

Do not commit real customer/case reports or evidence.

---

## What information should never go into the GitHub repo?

Do not commit real:

- customer details
- raw SFDC/Jira case history
- logs/support bundles
- generated real-case reports
- session exports containing case data
- browser cookies/tokens
- passwords/API secrets

Use sanitized examples only.

---

## Who owns/supports the tool?

It is an internally owned/maintained APAC Cortex TAC workflow tool.

It is not an officially supported product.

---

## What should I do if the result looks wrong?

Do not apply it.

Check:

1. XSUP/SFDC mapping
2. selected product
3. TACO state
4. original evidence
5. Analysis & Reuse Status
6. Audit decision
7. Knowledge quality/readiness

Then see [Troubleshooting](TROUBLESHOOTING.md).
