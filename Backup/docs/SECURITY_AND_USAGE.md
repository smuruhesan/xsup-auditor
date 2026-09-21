# Security & Usage

XSUP Auditor & KCS Generator is an internal, unofficial APAC Cortex TAC workflow tool.

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

---

# Bookmark distribution security model

The distributed bookmark is self-contained and intended to execute only while the reviewer is already on the approved TACopilot page.

It does not require:

- hosting JavaScript on the TACopilot backend;
- loading JavaScript from GitHub at runtime;
- an external CDN;
- a local web server;
- embedded credentials.

The bookmark and DevTools Snippet both rely on the reviewer's existing authenticated TACopilot browser session and same-origin access.

If a managed-browser policy disables bookmarklets, downloads, local files, clipboard access or other browser behavior, do not bypass that policy. Use only an approved supported method.

# Direct KCS data boundary

Direct Generate KCS does not weaken the evidence/security boundary. It still uses TACO plus original case evidence and the same Knowledge source/quality rules. The difference is only that the retrospective Support-owned field-review prompt is skipped.
