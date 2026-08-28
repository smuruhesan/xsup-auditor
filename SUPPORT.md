# Support & Ownership

## Purpose

This document explains how the XSUP Retrospective Auditor should be owned, supported, and maintained.

## Tool Status

The auditor is an internal decision-support tool.

Unless an organization formally establishes otherwise, do not assume:

- 24x7 support
- production SLA
- guaranteed availability
- formal software product support
- automatic compatibility with future TACopilot changes

## User Support

If the auditor behaves unexpectedly:

1. Confirm the XSUP ID and linked SFDC case.
2. Review the Analysis & Reuse Status.
3. Confirm whether TACO, Audit, and Knowledge were reused or newly generated.
4. Compare the result against original Jira/SFDC evidence.
5. Capture a sanitized diagnostic when needed.
6. Report the issue through the designated internal tool-maintenance workflow.

Do not include customer-sensitive evidence in public or broadly accessible issue trackers.

## Ownership

The team adopting the auditor should explicitly assign:

- Business owner
- Technical owner
- Backup technical owner
- Security / governance contact
- Documentation owner
- Release approver

These roles should be recorded in the internal team process rather than guessed from repository history.

## Bug Reports

A useful bug report should include:

- auditor release
- browser version
- XSUP/SFDC identifiers only when the reporting channel is approved for that data
- expected behavior
- actual behavior
- visible status/reason
- sanitized console error
- sanitized diagnostic export if required
- whether Re-analyze All was used

Avoid attaching raw customer case history unless the reporting channel is approved for it.

## Enhancement Requests

Enhancements should explain:

- user problem
- proposed behavior
- affected product scope
- whether audit methodology changes
- whether reuse fingerprints/schemas may need to change
- security/data-flow impact
- test plan

## Emergency Disablement

If a critical security or correctness issue is discovered, the owner should be able to:

- tell users to stop running the current snippet
- remove or disable the distributed snippet
- document the issue
- provide a corrected release
- validate the fix before re-enabling broader use
