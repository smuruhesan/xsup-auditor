# Security & Usage

XSUP Retrospective Auditor is an internal, unofficial APAC Cortex TAC workflow tool.

It can process sensitive customer/internal Support information.

---

# Access model

The Snippet runs inside the reviewer's authenticated TACopilot browser session.

It is designed to:

- use the reviewer's existing permissions
- use same-origin TACopilot requests
- avoid embedded credentials/secrets
- avoid credential extraction
- avoid security-control bypasses

---

# Data handled

Depending on the case, the tool may process:

- XSUP/SFDC identifiers
- Jira Engineering evidence
- SFDC internal/public/customer comments
- structured ticket/case fields
- TACO Analysis
- Case Chat questions/results
- generated Audit/Knowledge content

Treat generated files as internal case artifacts.

---

# The tool does not automatically

- modify Jira
- modify Salesforce
- post Review Paste Comments
- publish Knowledge
- upload reports to GitHub
- send case data to arbitrary external services

---

# Storage

Default:

Browser Downloads.

Optional:

reviewer-selected approved local/synced folder.

The reviewer is responsible for the storage location.

---

# Save Session files

Session JSON can contain case/audit information.

Treat it as sensitive.

Do not commit it to GitHub.

---

# GitHub

Use GitHub for:

- source
- generic docs
- sanitized fixtures/examples when approved

Do not commit real:

- customer case history
- reports
- session exports
- support bundles/logs
- cookies/tokens
- API keys/passwords

---

# AI output

AI can be wrong.

Quality review and deterministic checks reduce risk but do not replace human validation.

---

# Formal approval

Do not claim formal:

- InfoSec approval
- certification
- compliance
- production approval

unless that approval has actually been granted.

---

# Corporate controls

Do not use the Auditor to bypass:

- authentication
- authorization
- CSP
- DLP
- managed-browser restrictions
- approved software/download controls
