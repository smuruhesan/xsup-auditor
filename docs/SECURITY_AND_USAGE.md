# Security & Usage

XSUP Retrospective Auditor is an internal, unofficial APAC Cortex TAC workflow tool.

It can process customer/internal Support information.

Use it with the same care as the underlying TACopilot/Jira/SFDC case.

---

# Access model

The Snippet runs inside the reviewer's authenticated TACopilot browser session.

It is designed to:

- use the reviewer's existing TACopilot permissions
- use same-origin TACopilot requests
- avoid embedding usernames/passwords/API secrets
- avoid extracting browser credentials for use elsewhere
- avoid bypassing browser/CSP/corporate controls

It does not intentionally elevate access.

---

# Data processed

Depending on the XSUP, the tool may process:

- XSUP identifiers
- SFDC case identifiers
- Jira/Engineering evidence
- SFDC internal/public/customer comments
- structured case/taxonomy fields
- TACO Analysis
- Case Chat questions/results
- generated retrospective/knowledge content

This information can be sensitive.

---

# What the tool does not automatically do

It does not automatically:

- update Jira
- update Salesforce
- post the Review Paste Comment
- publish KCS/docs/runbooks
- upload reports to GitHub
- send case content to arbitrary external services

---

# Local storage

Reports use browser downloads unless the user explicitly chooses a writable folder.

The user is responsible for choosing an approved storage location.

Desktop-sync behavior is controlled by the selected folder's sync client and company policy.

---

# Saved sessions

Session JSON can contain case/audit information.

Treat session files as sensitive internal artifacts.

Do not commit them to GitHub.

Folder permission handles are not included in session JSON.

---

# GitHub

The repository should contain:

- source
- generic documentation
- sanitized examples/fixtures where approved

It should not contain real customer/case evidence.

Never commit:

- passwords
- API keys
- session cookies
- bearer tokens
- raw browser-auth material
- real customer reports
- raw support bundles/logs unless explicitly approved and sanitized

---

# Generated AI content

Audit and Knowledge output can be wrong.

The user remains responsible for validating important conclusions before:

- changing ticket metadata
- sharing a report
- publishing knowledge
- using generated operational guidance

---

# InfoSec / compliance statement

Do not claim that the repository/tool is formally:

- InfoSec approved
- security certified
- privacy certified
- production certified
- compliant with a specific security standard

unless that approval has actually been granted through the appropriate company process.

A safe description is:

> Internal browser-based decision-support tool using the reviewer's existing TACopilot access. It does not intentionally store credentials or automatically modify tickets. Outputs require human review.

---

# Corporate controls

Do not use the auditor to bypass:

- authentication
- authorization
- Content Security Policy
- DLP
- managed browser policy
- download restrictions
- endpoint controls
- approved software-distribution rules

If a control blocks a function, use the normal approved process rather than working around it.

---

# User responsibility

Users are responsible for:

- using the correct case/product
- reviewing AI-generated output
- handling downloaded data appropriately
- sharing only with authorized recipients
- following applicable company security/privacy/data-handling requirements
