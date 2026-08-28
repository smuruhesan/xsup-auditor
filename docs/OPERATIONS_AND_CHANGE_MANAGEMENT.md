# Operations & Change Management

## Purpose

This document defines a safe operational lifecycle for distributing and changing the auditor.

## Distribution

Use an approved internal distribution method.

The current implementation is a Chrome DevTools Snippet.

Users should obtain the snippet from a trusted internal source rather than copying unknown versions from chat messages or unverified locations.

## Change Categories

### UI-only change

Examples:

- colors
- spacing
- labels
- tooltip wording
- layout

Normally should not invalidate Audit/Knowledge reuse.

### Audit-method change

Examples:

- new reviewed field
- changed field-applicability rule
- changed evidence-provenance rule
- changed decision output contract

May require updating the Audit reuse schema.

### Knowledge-method change

Examples:

- changed artifact structure
- changed factual boundary
- new validation rule

May require updating the Knowledge reuse schema.

### Integration change

Examples:

- new TACopilot endpoint
- new data source
- telemetry
- external storage
- Jira/SFDC write action

Requires additional security and regression review.

## Pre-Release Review

Before distributing a change:

1. Run JavaScript syntax validation.
2. Run static QA.
3. Validate core user workflow.
4. Test TACO reuse/refresh.
5. Test Audit reuse/regeneration.
6. Test Knowledge reuse/regeneration.
7. Test downloads.
8. Test Help/tooltips.
9. Review data-flow/security impact.
10. Update documentation when behavior changes.

## Rollback

Keep the last known-good approved source available internally.

If a new release causes:

- incorrect field decisions
- duplicate Case Chat generation
- data exposure
- broken case mapping
- unsafe rendering
- widespread runtime failure

stop distribution and return users to the known-good release while investigating.

## Dependency Changes

When TACopilot or browser behavior changes:

- reproduce the issue
- identify the contract that changed
- update defensive parsing
- add a regression test
- document the new assumption

## Repository Changes

Repository changes should avoid real customer evidence.

Use sanitized fixtures for testing and examples.

## Release Communication

For meaningful behavior changes, tell users:

- what changed
- what they need to do
- whether prior analysis can be reused
- any known limitation
- whether manual re-analysis is required
