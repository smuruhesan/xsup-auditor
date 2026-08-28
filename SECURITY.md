# Security Policy

## Reporting a Security Issue

If you discover a potential security issue in the XSUP Retrospective Auditor:

1. Do not publish sensitive details in a public issue.
2. Do not attach customer case data to an unapproved repository or ticket.
3. Follow the organization's approved internal security-reporting process.
4. Notify the designated tool owner/security contact.
5. Include only the minimum information required to reproduce the issue.

## Examples of Security-Relevant Issues

- unexpected external data transmission
- credential/token exposure
- unsafe HTML rendering
- unauthorized case access
- permission bypass
- sensitive data written to an unexpected location
- unsafe URL handling
- persistent storage of data not documented by the tool
- unapproved telemetry
- ability to modify tickets or publish content without explicit user action

## Response

For a credible security issue, the tool owner should:

- assess severity
- suspend affected functionality if necessary
- identify impacted releases
- remediate the issue
- run security-focused regression checks
- communicate safe-use guidance
- document the resolution internally

## No Public Disclosure Assumption

This is an internal repository/workflow unless formally designated otherwise.

Security handling should follow internal policies and disclosure requirements.
