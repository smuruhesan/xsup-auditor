# Security, Data Handling & Usage Guidance

## Purpose

This document explains the security model, data-handling expectations, safe-use boundaries, and governance considerations for the XSUP Retrospective Auditor.

It is written for:

- Support users
- managers
- technical leads
- developers
- security / privacy reviewers
- future tool owners

---

# 1. Security Position

The auditor is an internal decision-support tool that runs in the user's authenticated TACopilot browser session.

Its design aims to minimize additional security exposure by:

- using existing TACopilot authentication
- avoiding embedded credentials
- using same-origin TACopilot requests
- avoiding intentional Content Security Policy bypasses
- keeping downloads under explicit user/browser control
- avoiding automatic publishing or ticket mutation
- escaping generated content before rendering HTML
- limiting links to safe HTTP/HTTPS URLs
- treating generated output as review-required

These controls describe the design.

They do **not** constitute a formal InfoSec certification or corporate approval.

---

# 2. Formal Approval / Compliance Language

Unless explicitly approved by the appropriate internal authority, do not claim that the auditor is:

- InfoSec certified
- InfoSec approved
- SOC 2 compliant
- ISO 27001 compliant
- privacy certified
- production certified
- officially supported
- approved for unrestricted customer-data processing

A more accurate statement is:

> The auditor is designed to operate within the user's existing TACopilot authenticated session and to avoid introducing separate credentials or unsupported external data flows. Formal security/governance approval, if required, must be obtained through the organization's normal review process.

---

# 3. Why the Browser Model Is Used

The browser-based model allows the tool to operate within the same security boundary already used by the reviewer for TACopilot.

Benefits include:

- no separate username/password storage
- no service account embedded in code
- no API token distribution
- existing user permissions continue to apply
- same-origin TACopilot APIs can be used
- the user remains visibly in control of execution

The browser implementation must not be used as a way to evade corporate controls.

---

# 4. Authentication and Authorization

The auditor relies on the currently authenticated TACopilot session.

It should not:

- create new authentication mechanisms
- extract session cookies for reuse elsewhere
- export bearer tokens
- store credentials in source code
- elevate user permissions
- impersonate another reviewer

Authorization remains governed by the user's existing TACopilot access.

---

# 5. Data Processed

Depending on the case, the auditor may process:

- XSUP identifiers
- Salesforce case identifiers
- Jira / Engineering comments
- Salesforce internal notes
- TAC-to-customer public comments
- customer-to-TAC public comments
- TACO analysis
- Case Chat results
- technical references exposed by TACopilot
- reviewer-generated retrospective output

This can include confidential, customer-specific, or internal support information.

Treat it accordingly.

---

# 6. Data That Should Not Be Added to Source Control

The GitHub repository should contain:

- source code
- generic documentation
- sanitized test data
- sanitized screenshots when approved
- non-sensitive QA fixtures

It should not contain real:

- customer names
- customer email addresses
- customer account details
- tenant IDs
- internal case history
- Jira comment exports
- Salesforce exports
- logs / TSFs / support bundles
- browser session exports
- tokens
- cookies
- passwords
- generated audit reports containing customer/internal data

---

# 7. External Data Flows

The current design should not intentionally send case evidence to arbitrary public/external services.

Any future integration with:

- telemetry platforms
- analytics vendors
- external AI APIs
- cloud storage APIs
- ticketing SaaS
- public webhooks

must be reviewed separately.

Do not assume an integration is acceptable merely because it is technically possible.

---

# 8. Storage

Default report storage uses normal browser download behavior.

Optional folder storage requires an explicit user action through the browser folder picker.

The tool should not:

- silently select a folder
- persist folder access without browser permission
- upload reports externally without user/organizational approval

If a user selects a desktop-synced folder, the synchronization behavior is controlled by that desktop client and the organization's configuration.

---

# 9. Output Safety

Generated Audit and Knowledge results can be incorrect.

Therefore:

- ticket changes require reviewer validation
- knowledge drafts require SME/documentation-owner review
- `UNDETERMINED` should be used when evidence is insufficient
- unsupported commands/configuration must not be invented
- generated customer-facing content must not be treated as automatically approved

---

# 10. HTML Rendering Safety

Generated Case Chat content must not be inserted directly into the DOM as raw HTML.

The renderer should:

- escape HTML
- support only controlled Markdown transformations
- validate URLs
- restrict links to HTTP/HTTPS
- use safe external-link behavior

Future changes must preserve this boundary.

---

# 11. Browser and Corporate Controls

The auditor must not:

- disable browser security
- disable CSP
- bypass endpoint controls
- install unauthorized extensions
- work around DLP
- work around download restrictions
- scrape data from systems the user cannot normally access

If a corporate control blocks a function, treat that as a constraint to be resolved through an approved design—not something to bypass.

---

# 12. Human-in-the-Loop Requirement

A human reviewer is required for:

- field verdict acceptance
- recommended ticket changes
- knowledge publication
- interpretation of conflicting evidence
- product applicability
- unusual or high-risk cases

The auditor should not be positioned as an autonomous decision-maker.

---

# 13. Appropriate Use

Appropriate uses include:

- retrospective Support field review
- evidence synthesis
- identifying reusable knowledge gaps
- regenerating reports from validated reusable analysis
- reviewer assistance for supported product policies

---

# 14. Use With Caution

Extra caution is required when:

- evidence is incomplete
- the product policy is not yet validated
- multiple SFDC candidates exist
- TACO analysis is ambiguous
- customer impact is high
- the proposed ticket change is unusual
- a knowledge draft includes exact commands/configuration
- source dates are unknown
- a prior Case Chat cannot be confidently matched
- the reviewer is outside the intended team/workflow

In these situations, manual verification should take priority.

---

# 15. Prohibited / Out-of-Scope Uses

Unless explicitly designed and approved later, do not use the auditor to:

- automatically modify customer cases
- automatically publish KCS/docs
- automatically send customer communications
- make HR/performance judgments about individual engineers
- infer employee intent or AI usage
- process cases outside validated product policies as if fully supported
- export case evidence to unapproved external systems

---

# 16. Security Review Checklist for Broader Rollout

Before broader organizational rollout, consider formal review of:

- source ownership
- change control
- secure development process
- access model
- data classification
- privacy
- retention
- logging / telemetry
- storage locations
- external integrations
- AI usage policy
- software distribution method
- vulnerability handling
- incident response ownership
- product-specific governance

---

# 17. Security Issue Handling

If a security-relevant behavior is found:

1. stop using the affected function if necessary
2. preserve the minimum diagnostic information required
3. do not commit sensitive reproduction data to GitHub
4. notify the designated tool owner / security contact
5. document the issue and remediation
6. validate the fix before wider use

---

# 18. User Responsibility

The user is responsible for:

- using the correct case
- respecting data handling requirements
- reviewing AI-generated conclusions
- confirming field applicability
- not publishing unreviewed knowledge
- not sharing internal/customer reports outside approved channels
- following organizational security and privacy policies

---

# 19. Management Responsibility

Managers / owners should define:

- who may use the auditor
- who owns the code
- who approves changes
- which product policies are supported
- whether formal InfoSec/privacy review is required
- where generated reports may be stored
- how incidents or defects are reported
- how the tool is distributed and updated

---

# 20. Safe Summary Statement

For internal communications, a safe description is:

> XSUP Retrospective Auditor is an internal browser-based decision-support tool that uses the reviewer's existing TACopilot access to synthesize TACO analysis and original case evidence. It does not intentionally store credentials or automatically modify tickets. Outputs require human review. Formal InfoSec/security approval should not be assumed unless separately granted.
