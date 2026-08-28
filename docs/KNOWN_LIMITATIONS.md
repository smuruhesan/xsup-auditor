# Known Limitations

This document lists important boundaries that users and managers should understand before relying on the XSUP Retrospective Auditor.

## Product Scope

The currently validated retrospective workflow is primarily XDR/XSIAM.

Other product families require explicit validation of:

- candidate-selection policy
- field applicability
- Jira/SFDC field extraction
- knowledge-action logic
- regression tests

Do not treat unsupported product scopes as production-ready.

## AI Output Is Not Deterministic Truth

TACO and Case Chat can:

- misunderstand evidence
- omit important context
- overgeneralize
- produce unsupported details
- produce different wording for similar inputs

The auditor adds safeguards but does not eliminate model error.

Human review is required.

## TACopilot Dependency

The auditor depends on TACopilot behavior such as:

- endpoint paths
- response shapes
- rendered case HTML
- comment attributes
- Case Chat history format
- user permissions

A TACopilot change can break the auditor even when the auditor source has not changed.

## Browser Dependency

The current implementation runs as a Chrome DevTools Snippet.

Behavior can be affected by:

- managed browser policy
- Chrome changes
- Content Security Policy
- download restrictions
- File System Access API availability
- clipboard permissions

## Cross-User Reuse

Cross-browser or cross-SME reuse depends on the current authenticated user being allowed to read the same TACopilot investigation and Case Chat history.

The auditor does not bypass visibility restrictions.

## Case Size

Very large case histories can exceed practical prompt or service limits.

The auditor therefore sends bounded evidence to Case Chat while separately fingerprinting the broader evidence set.

Evidence selection can still miss a relevant item.

## Timestamp Quality

Freshness decisions depend on timestamps exposed by TACopilot.

If exact timestamps are unavailable, the auditor uses conservative fallback behavior and should explain the uncertainty.

## Knowledge Drafts

Generated KCS/Admin Guide/Runbook/Known-Issue content is not publication-ready by default.

Exact:

- commands
- versions
- UI paths
- API details
- expected values
- remediation steps

must be supported by evidence or explicitly validated.

## No Automatic Ticket Mutation

The tool recommends changes but does not automatically modify Jira/Salesforce in the current workflow.

## No Formal SLA

Unless separately established, the auditor has no guaranteed:

- uptime
- response time
- support SLA
- compatibility SLA
- data-retention SLA

## Security Approval

Security-conscious design does not equal formal InfoSec approval.

Formal approval must be documented separately if required.
