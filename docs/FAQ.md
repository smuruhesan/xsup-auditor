# FAQ

## Is this production automation or an internal pilot?

This is the **v1.0 Initial Team Release**, intended for internal team use and feedback.

The core Audit/KCS workflow is ready for use, but minor UI/status and review-classification refinements may continue.

## Does the tool modify Jira or Salesforce automatically?

No.

It generates decision-support output, Review Paste content and Knowledge drafts/proposals. A human remains responsible for any ticket change or publication action.

## Does it automatically publish KCS?

No.

Generated Knowledge is always a draft/proposal for human review.

## What products are supported?

- XDR/XSIAM
- XSOAR
- Cortex Cloud

See [Product Policies](PRODUCT_POLICIES.md).

## What is the current start/run workflow?

1. **Load XSUPs** or **Load as KCS Only**.
2. Choose each row's **Workflow** and **Run Mode**.
3. Select the rows.
4. Click **Run Selected**.

Loading alone does not start TACO, Audit or Knowledge generation.

## What does Automatic — reuse valid results do?

It reuses TACO/Audit/Knowledge only when the result is compatible and still valid for the current source evidence.

Newer Jira/SFDC evidence prevents stale downstream reuse.

## Does Regenerate really create a new Case Chat?

Yes.

Explicit **Regenerate Audit**, **Regenerate Knowledge**, **Regenerate Audit + Knowledge**, and **Regenerate KCS** bypass existing Case Chat reuse for the selected stage.

Automatic mode is the path that may reuse compatible results.

## What is Regenerate TACO Analysis + ...?

It explicitly creates a fresh TACO analysis and then regenerates the selected downstream Audit/Knowledge/KCS stages.

Use it only when a full source re-analysis is intended.

## How many XSUPs can run at once?

XSUP/TACO worker parallelism is selectable:

- 2
- 3
- 5
- 10

Default: 2.

## How many Knowledge jobs can run at once?

Two Knowledge workers are available.

## Why can I select 10 workers if Case Chat only runs two generations at once?

XSUP/TACO collection work can run with higher parallelism, but the tool keeps a shared **Case Chat generation cap of 2** to avoid excessive concurrent AI-generation load.

## How does the tool choose CREATE KCS vs UPDATE EXISTING KCS?

The retrospective Audit performs a Knowledge-worthiness and destination decision.

When a specific Salesforce KCS already covers meaningful material, the workflow checks whether the new gap can be merged into it.

- Mergeable overlap → UPDATE is preferred.
- CREATE requires a distinct scope/task/symptom/workflow/audience justification.

Product docs, Confluence, prior cases and Jira can be related knowledge without being a Salesforce KCS.

## Can direct KCS mode still create a new KCS if an existing one is found?

Yes, when the reviewer intentionally wants a separate article and the scope is genuinely distinct.

The new draft should preserve/reference the related existing KCS instead of pretending no related knowledge exists.

## What do REVIEW and BLOCKER mean?

**REVIEW** means a generated draft is useful but a named technical/currentness/scope/source item still needs validation.

**BLOCKER** means a material issue must be resolved before the content can be treated as publication-ready.

These are safety signals, not necessarily generation failures.

## What is Cortex Brain validation?

Downloaded KCS-family HTML contains small **SME Validation Tools** at the bottom:

- Copy for Cortex Brain
- Download for Cortex Brain

The exported payload contains the clean KCS, source references and a mandatory independent-validation prompt.

It is marked **NOT PUBLICATION READY**.

## Why does the Cortex export not include the XSUP Auditor REVIEW/BLOCKER UI?

The Cortex Brain export is intentionally independent.

It receives the clean proposed KCS plus evidence references and validation instructions so it can challenge the technical content itself.

## Should I publish an article because the dashboard says READY?

No automated status replaces human validation.

Use the downloaded Knowledge artifact's detailed review/blocker content, source references and required SME/Cortex validation before publication.

## Why might the dashboard and downloaded artifact wording differ?

The v1.0 pilot can still have minor status-label propagation differences in edge cases.

For publication/reuse decisions, the downloaded artifact's detailed quality result and review/blocker items take precedence over a summary dashboard label.

## What is Stop All?

It stops the Auditor's local queues/polling/requests as far as possible.

A server-side TACO/Case Chat task already submitted may continue.

## Should I report issues and edge cases?

Yes. The purpose of the first team release is to collect real usage feedback.

When reporting a tool issue, provide the XSUP only through an approved internal channel and include the expected behavior, actual behavior and visible stage/status. Do not place customer-sensitive diagnostics in an unapproved GitHub issue.
