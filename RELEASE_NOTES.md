# XSUP Auditor & KCS Generator — v1.0 Initial Team Release

## v1.0 team pilot freeze — 2026-09-29

This release keeps the team-facing v1.0 label and protected internal identifiers (`VERSION = "3"`, `BUILD_ID = "github-v3"`).

### Included fixes

- **Salesforce KCS mergeability gate:** a CREATE decision can no longer bypass mergeability review simply because the model labels an overlapping existing KCS as `NONE` or `UNDETERMINED`. Whenever a specific Salesforce KCS is identified and meaningful inspected coverage is described, CREATE requires `Existing KCS Mergeability = DISTINCT` plus a concrete task/symptom/workflow/audience reason.
- **Public vs TAC-only routing:** public reusable knowledge is deterministically generalized when it contains backend-only service/listener/job/worker/feature-flag/policy identifiers without maintained public authority. Exact sourced implementation context remains available in `Internal Notes — TAC Only`. Human-facing Audit summaries and Review Paste comments also redact backend-only mechanics while preserving the supported observable behavior/action.
- **Runnable/output classification:** CMD/BAT fences are recognized as CLI, plain output is not treated as executable configuration, JSON response bodies are classified from their own schema rather than nearby request prose, and unknown fence parsing can no longer swallow adjacent Markdown prose/headings into a false API/runnable review.
- **Reuse compatibility:** Audit/Knowledge reuse schemas are bumped so older outputs produced before these guards are not silently reused as compatible current results.

### Preserved behavior

The Regenerate/Reuse fix, Case Chat transport, TACO lifecycle/freshness, queue/concurrency behavior, Direct Generate KCS semantics, Salesforce KCS canonical-link handling, derivative-evidence rules, bounded quality repair, Cortex Brain validation export, Stop All, downloads, Review Paste workflow, and team-facing report layout remain intact.

This package is prepared for the v1.0 internal team pilot release.
