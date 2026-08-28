# Validation Checklist

Use this checklist before broader rollout or after a material code change.

## Basic Runtime

- [ ] Script runs only on intended TACopilot host
- [ ] UI renders without console errors
- [ ] XSUP input accepts valid IDs
- [ ] Duplicate IDs are removed
- [ ] Queue behavior works

## Case Resolution

- [ ] Single SFDC mapping resolves automatically
- [ ] Multiple candidates require selection
- [ ] No mapping shows Mapping Not Found
- [ ] No SFDC case is fabricated

## TACO

- [ ] No analysis → start
- [ ] Active analysis → wait
- [ ] Completed/current analysis → reuse
- [ ] Newer case evidence → refresh when appropriate
- [ ] Manual Re-analyze All forces full refresh
- [ ] Old age alone does not force refresh

## Evidence

- [ ] Jira comments classified correctly
- [ ] SFDC internal/public comments classified correctly
- [ ] Latest evidence timestamp resolves
- [ ] Noise filtering does not remove critical evidence
- [ ] Selected evidence stays within practical size bounds

## Audit

- [ ] Existing matching audit can be reused
- [ ] Matching active audit is waited on
- [ ] Changed evidence invalidates reuse
- [ ] Changed TACO invalidates reuse
- [ ] Stored answer passes structural validation
- [ ] Wrong-target/incomplete answer is rejected
- [ ] Field applicability is product-specific
- [ ] UNDETERMINED is preserved when evidence is insufficient

## Knowledge

- [ ] Knowledge action is parsed correctly
- [ ] Artifact readiness is generic
- [ ] Matching artifact can be reused
- [ ] Changed audit/action/type/readiness invalidates reuse
- [ ] Unsupported operational details are not invented
- [ ] Generated content is marked as draft/review-required

## UI

- [ ] Reuse status clearly says REUSED EXISTING or NEWLY GENERATED
- [ ] Original Case Chat ID/date displays when available
- [ ] Review Decisions are readable
- [ ] Re-analyze All is the only top manual full-refresh action
- [ ] Tooltips work with mouse and keyboard
- [ ] Help links work

## Storage

- [ ] Browser download works
- [ ] Choose Folder requires user action
- [ ] Folder failure falls back safely
- [ ] Folder handle is not serialized
- [ ] Copy actions work
- [ ] Reused result can be downloaded without new analysis

## Security

- [ ] No embedded secrets
- [ ] No unapproved external endpoints
- [ ] No raw model output injected as HTML
- [ ] URLs are validated
- [ ] No browser/CSP bypass
- [ ] No automatic ticket mutation
- [ ] No automatic knowledge publication
- [ ] Debug artifacts are treated as sensitive

## Documentation

- [ ] README matches current behavior
- [ ] FAQ matches current behavior
- [ ] Security guidance matches current data flow
- [ ] Known limitations are current
- [ ] Technical Guide reflects endpoint/response assumptions
