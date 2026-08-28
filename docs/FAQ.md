# FAQ

This FAQ is written for reviewers, managers, Support engineers, technical leads, and security/governance reviewers who want to understand what the XSUP Retrospective Auditor does and how it operates.

---

## What problem does the auditor solve?

The auditor helps Support reviewers decide whether Support-owned retrospective fields are correct and what action should follow.

Typical questions include:

- Is the Resolution correct?
- Is RCA correct when applicable?
- Does Fix Type or a Flag / Label need to change?
- What original evidence proves the decision?
- Should the case create or update reusable knowledge?

It reduces the need for a reviewer to manually reconstruct a long XSUP + Salesforce investigation.

---

## Why does it run in the browser?

The current implementation runs as a Chrome DevTools Snippet inside TACopilot because it needs to use:

- the reviewer's existing TACopilot authenticated session
- TACopilot same-origin APIs
- case evidence already rendered or exposed by TACopilot
- the reviewer's existing access permissions

This avoids embedding separate credentials, API keys, or service-account secrets in the tool.

The browser implementation is a deployment choice for the current internal workflow. It is not intended to bypass normal corporate security controls.

---

## Does the tool bypass authentication or permissions?

No.

The auditor uses the permissions of the currently signed-in TACopilot user.

If the reviewer cannot access a case, investigation, or Case Chat through their normal access, the auditor should not gain additional access.

---

## Does the auditor store usernames, passwords, tokens, or cookies?

It is designed not to.

The source should not contain:

- usernames
- passwords
- API keys
- OAuth secrets
- session cookies
- bearer tokens

The tool relies on the user's existing authenticated browser session.

---

## Is the tool InfoSec compliant?

Do not describe the tool as formally **InfoSec compliant, certified, approved, or security-reviewed** unless the appropriate internal security/governance team has explicitly provided that approval.

The current design follows several security-conscious principles:

- same-origin TACopilot requests
- no embedded credentials
- no intentional browser/CSP bypass
- no automatic external data export
- user-controlled local downloads
- output escaping before HTML rendering
- safe URL handling
- human review of generated conclusions and knowledge drafts

These are design controls, not a substitute for formal corporate security approval.

If formal approval is required for broader rollout, submit the tool through the applicable internal security, privacy, architecture, and software-governance process.

---

## Does it send customer data to the public internet?

The auditor is designed to use TACopilot and its internal analysis/Case Chat workflow.

It should not intentionally send case content to arbitrary external web services.

Do not add external telemetry, SaaS endpoints, analytics services, public AI APIs, or remote storage without explicit review and approval.

---

## Does it call Salesforce or Jira directly?

The current browser design primarily uses information exposed through TACopilot.

It avoids unsupported cross-origin browser calls that would conflict with TACopilot's browser security model.

---

## Does the tool change Jira or Salesforce fields?

No, not as part of the current retrospective workflow.

The auditor recommends what Support should change.

The reviewer remains responsible for performing any approved ticket update through the normal workflow.

---

## Does it automatically post comments?

No.

The auditor generates a **Review Paste Comment** that a reviewer can copy if appropriate.

It does not automatically publish that retrospective comment to Jira.

---

## Can the auditor make a wrong decision?

Yes.

TACO and Case Chat are analytical systems and can make mistakes, misunderstand evidence, or overstate a conclusion.

The auditor includes deterministic checks and evidence rules to reduce this risk, but the output still requires human review.

Treat the auditor as a **decision-support tool**, not an autonomous authority.

---

## Who is responsible for the final decision?

The human reviewer.

The reviewer should confirm that:

- the correct XSUP/SFDC case was selected
- the applicable Support-owned field is correct for the product
- the evidence supports the conclusion
- the recommended ticket change is appropriate
- any generated knowledge artifact is accurate before publication

---

## What does `UNDETERMINED` mean?

It means the available evidence does not safely support a confident YES/NO or Correct/Incorrect conclusion.

`UNDETERMINED` is an expected safety outcome.

It is better than inventing an answer.

---

## Why does the tool reuse old TACO or Case Chat results?

To avoid:

- duplicate analysis
- unnecessary compute/AI usage
- noisy Case Chat history
- different answers for unchanged evidence

Reuse occurs only when the relevant current inputs still match.

---

## Can a reused result be outdated?

The tool is specifically designed to reduce that risk.

Before reuse it checks relevant current inputs such as:

- TACO analysis
- Jira/SFDC evidence signature
- focused evidence
- audit methodology
- knowledge action / artifact type

If those inputs materially change, the relevant result should be regenerated.

---

## What is Re-analyze All?

It is the deliberate manual override.

It forces:

```text
fresh TACO
→ fresh retrospective audit
→ fresh knowledge artifact
```

Do not use it just to download a report again.

---

## Where are reports stored?

By default, reports are downloaded through the browser.

The user can optionally choose a permitted local folder using the browser folder picker.

That folder may be:

- local
- OneDrive-synced
- Google Drive for Desktop
- another approved desktop-synced location

The tool should not silently choose or persist a storage location.

---

## Does the tool upload reports to GitHub?

No.

The GitHub repository is for source code and documentation.

Real customer/case evidence and generated case reports should not be committed to the repository.

---

## What data must never be committed to GitHub?

Do not commit:

- real customer names
- customer email addresses
- tenant IDs/details
- raw Salesforce case history
- raw Jira comments
- support bundles / TSFs
- diagnostic exports
- authentication material
- session cookies/tokens
- real-case audit reports containing internal/customer data

Use sanitized examples only.

---

## Why is a knowledge article only a draft?

Because an LLM-generated draft can include:

- incomplete wording
- wrong generalization
- unsupported technical details
- incorrect applicability
- documentation gaps that need owner validation

Knowledge content must be reviewed before publication.

---

## Can the tool be used for every product?

No.

Field applicability is product-specific.

The current validated workflow is primarily for XDR/XSIAM retrospective candidates.

Other product policies should be enabled only after their field rules and evidence mapping are validated.

---

## What happens if TACopilot changes?

The auditor depends on observed TACopilot:

- endpoint shapes
- page structure
- comment attributes
- Case Chat history structure

If TACopilot changes these interfaces, the auditor may require an update.

---

## Is the DevTools Snippet an officially supported product?

Not unless your organization explicitly designates it as one.

The current repository should describe it as an internal workflow tool.

Formal production support, ownership, security approval, rollout, and change-management status should be documented separately if/when established.

---

## What should a manager know before allowing wider usage?

Managers should understand:

1. The tool is decision support, not autonomous ticket governance.
2. It uses the reviewer's existing access.
3. It can process sensitive support data.
4. Outputs require human validation.
5. Real case data should not be committed to GitHub.
6. Formal security/InfoSec approval should not be assumed.
7. Broader rollout may require security, privacy, software-governance, and ownership review.
8. Product-specific retrospective policies must be validated before expansion.

---

## What should a user do if something looks wrong?

Stop and verify the source data.

Useful checks include:

- confirm the XSUP and SFDC mapping
- inspect the TACO analysis status/date
- inspect the Analysis & Reuse Status
- confirm whether the audit was reused or newly generated
- compare the cited original Jira/SFDC evidence
- use Re-analyze All only if a fully fresh analysis is actually required
- report reproducible issues to the tool owner/maintainer

Do not blindly apply a ticket change because the tool recommended it.
