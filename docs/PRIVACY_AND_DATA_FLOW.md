# Privacy & Data Flow

## Purpose

This document summarizes what data the auditor reads, where processing occurs, what it stores, and what it should not transmit.

## Data Sources

The auditor may read information available to the authenticated reviewer through TACopilot, including:

- XSUP identifier
- linked Salesforce case identifier
- Jira/Engineering comments
- Salesforce internal notes
- TAC public responses
- customer public replies
- TACO analysis
- Case Chat history
- references exposed through TACopilot

## Simplified Data Flow

```text
Authenticated reviewer
        ↓
TACopilot page/session
        ↓
XSUP → SFDC resolution
        ↓
TACO + original case evidence
        ↓
Case Chat retrospective analysis
        ↓
Optional knowledge draft
        ↓
Local browser rendering/download
```

## Browser Memory

During execution, the script keeps job state in browser memory.

This can include:

- normalized evidence
- TACO report data
- Case Chat answers
- report metadata
- selected folder handle

Closing/reloading the page clears ordinary in-memory runtime state unless the user exported/restored a session.

## Session Export

A session export can contain sensitive internal case information.

Treat exported session files like other case artifacts.

Do not commit them to GitHub.

## Case Chat Storage

Audit and Knowledge Case Chat answers are server-side TACopilot content and may remain available according to TACopilot's own retention/access model.

The auditor does not define TACopilot's retention period.

## Downloads

Generated reports are stored wherever the user/browser places them.

Users are responsible for choosing an approved storage location.

If a desktop-synced folder is used, synchronization/retention is governed by that service and organizational policy.

## External Transmission

The current design should not intentionally transmit case evidence to arbitrary external services.

Any future external:

- telemetry
- analytics
- cloud storage
- AI API
- webhook
- reporting platform

requires separate review.

## Data Minimization

Future features should prefer:

- aggregate counters
- non-sensitive operational metadata
- no raw case content
- no customer identifiers unless explicitly required and approved

## Retention & Deletion

The auditor itself does not define enterprise retention rules for:

- TACopilot
- Case Chat
- Salesforce
- Jira
- local Downloads
- synced folders

Users and owners must follow the organization's applicable retention and deletion policies.
