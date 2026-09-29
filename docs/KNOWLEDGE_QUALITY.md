# Knowledge Quality

This document applies to retrospective-generated Knowledge and direct KCS mode in the v1.0 Initial Team Release.

The goal is:

> Generate a useful draft quickly, make uncertainty visible, independently validate technical claims, and keep publication decisions with the human reviewer.

The workflow can produce:

- KCS Draft
- KCS Update Proposal
- Admin/Tech Guide Update Proposal
- Runbook Draft
- Known Issue / Release Note Draft

It does **not** automatically publish Knowledge.

## Quality workflow

```text
Audit-selected Knowledge basis OR Direct KCS basis
            ↓
1. Generate enriched draft
            ↓
2. Independent Knowledge quality review
            ↓
3. Deterministic checks
            ↓
4. One evidence-bounded repair when appropriate
            ↓
5. Deterministic checks again
            ↓
READY / REVIEW / BLOCKER
            ↓
SME / Cortex Brain validation
            ↓
Human publication/editorial review
```

## Evidence discipline

TACO, Case Chat and XSUP Auditor output are derived analysis and workflow artifacts.

Material technical claims should trace to underlying evidence such as:

- maintained product documentation;
- existing Salesforce KCS;
- original Jira/Engineering evidence;
- original Salesforce case evidence;
- applicable maintained internal guidance.

Historical cases/Jira/Confluence can remain useful context but do not automatically prove current-release behavior.

Derivative/AI evidence is a publication blocker only when it is effectively the sole material authority for a reusable claim. Stronger original/maintained authority should be attached when available.

## Existing Knowledge and duplicate prevention

A new KCS is not justified merely because no exact article title exists.

The workflow evaluates:

1. Knowledge worthiness.
2. Existing Salesforce KCS candidates.
3. What existing material already covers.
4. The remaining reusable gap.
5. Whether the gap can be merged into the existing article.
6. Whether another destination is better.

When an identified Salesforce KCS has meaningful coverage:

- **UPDATE is the default when the missing content can be absorbed cleanly.**
- **CREATE requires an explicit DISTINCT-scope justification** showing that merging would materially confuse or over-broaden the existing article.

Related product docs, Confluence, prior cases, Jira and runbooks are preserved as related knowledge but are not mislabeled as Salesforce KCS.

## Source references

Generated KCS artifacts use claim-level `[R#]` references and a canonical **Source References** section.

Salesforce Knowledge links are normalized before rendering so only a canonical `Knowledge__kav/<article-id>/view` URL is used for the article link.

## Public content vs Internal Notes — TAC Only

The public article body should contain supported reusable customer/TAC guidance.

Privileged or unstable implementation details should be generalized or routed to:

**Internal Notes — TAC Only**

Examples include backend-only:

- service/listener/job/worker identifiers;
- feature flags;
- internal policy identifiers;
- privileged implementation mechanics.

Exact internal details can remain available to SMEs/Cortex Brain for validation without automatically becoming public product guarantees.

## Runnable content

Commands, XQL/SQL, API requests and configuration values receive additional validation.

The classifier distinguishes:

- runnable CLI/PowerShell/CMD/BAT;
- XQL/query content;
- API request routes/payloads;
- configuration/registry values;
- read-only output/API responses/schema examples.

Read-only JSON output should not be treated as executable configuration simply because nearby prose describes an API request.

## Review states

Generated artifacts can surface claim-level:

### ⚠ REVIEW

A material technical claim, command, configuration, source, scope or operational detail requires validation.

### ⚠ REVIEW CURRENTNESS

Historical/non-authoritative evidence materially supports a reusable claim and current applicability must be confirmed.

### ✕ BLOCKER

A material issue prevents the draft from being treated as publication-ready.

Typical blocker causes include:

- unsupported material claim;
- sole reliance on derivative/AI authority;
- unsafe exact runnable content without adequate authority;
- unresolved routing/source/context problem;
- material publication-boundary issue.

A BLOCKER is not the same as a generation failure. The draft is preserved so the reviewer can resolve the issue.

## Bounded repair

The tool can run one controlled repair pass for issues that can be corrected without inventing facts.

Repair must not invent:

- diagnosis;
- product behavior;
- commands;
- APIs;
- fields/datasets;
- UI paths;
- version scope;
- timing guarantees;
- Engineering confirmation.

## Cortex Brain independent validation

Every downloaded KCS-family HTML includes a small **SME Validation Tools** section at the very bottom.

### Copy for Cortex Brain

Copies a paste-ready validation payload.

### Download for Cortex Brain

Downloads the same payload as Markdown.

Both actions use the same validation payload.

The payload includes:

- **MANDATORY VALIDATION — NOT PUBLICATION READY**
- standardized independent-validation instructions;
- clean proposed KCS content;
- Internal Notes — TAC Only when present;
- Engineering/investigation context when included in the KCS;
- claim-level `[R#]` references;
- Source References.

The payload excludes:

- XSUP Auditor REVIEW/BLOCKER UI;
- reviewer-choice cards;
- quality-control callouts;
- report-control metadata.

Cortex Brain is instructed to independently classify material issues and return:

- `CORRECT`
- `INCORRECT`
- `OUTDATED`
- `UNSUPPORTED`
- `INCOMPLETE`
- `REQUIRES SME CONFIRMATION`

and a final:

- `READY`
- `CHANGES REQUIRED`
- `BLOCK`

assessment.

## Publication boundary

Generated KCS content must not be copied into Salesforce Knowledge, sent to customers, or treated as authoritative until the relevant technical validation and normal human publication review are complete.

Even an automated READY state does not mean auto-approved or auto-published.

## Pilot note

The v1.0 team release intentionally favors conservative review behavior.

Minor false-positive REVIEW/BLOCKER classification or dashboard wording differences can be refined from team feedback. The detailed downloaded artifact plus SME/Cortex validation remains the publication-safety boundary.
