# Knowledge Quality

This document applies to both **retrospective-generated Knowledge** and **Direct Generate KCS** mode.

XSUP Auditor does not generate a Knowledge article with one AI prompt and assume the result is ready to publish.

It uses a layered quality workflow built on TACO Analysis, original Jira/SFDC evidence, Case Chat, available Knowledge/reference material, and either:

- a completed Retrospective Audit; or
- a direct KCS case basis when the reviewer explicitly chooses **Generate KCS**.

The operating principle is:

> **Generate a useful draft quickly, make material uncertainty visible, and keep the final publication decision with the engineer/reviewer.**

The workflow can create:

- KCS Drafts
- KCS Update Proposals
- Admin / Tech Guide Update Proposals
- TAC Runbooks
- Known Issue / Release Note Drafts

It does **not** automatically publish Knowledge or modify official documentation.

---

# How the Knowledge quality workflow works

A fresh Knowledge artifact normally uses **two substantive Knowledge prompts**:

1. draft generation / enrichment;
2. independent quality review.

A single evidence-bounded repair prompt may be added when the identified issue is safe to repair without inventing new facts.

TACopilot / Case Chat transport may retry or recover transient request failures. Those retries are reliability handling and are **not** separate quality stages or independent quality verdicts.

```text
Retrospective basis OR Direct KCS basis
+ current TACO + original evidence + available references
                    │
                    ▼
        1. Generate enriched Knowledge draft
                    │
                    ▼
        2. Independent AI quality review
                    │
                    ▼
        3. Deterministic JavaScript checks
                    │
                    ▼
        4. Repair once, when safe/repairable
                    │
                    ▼
        5. Deterministic checks again
                    │
                    ▼
          READY / DRAFTABLE / NOT READY
                    │
                    ▼
                Human review
                    │
                    ▼
                Publication
```

| Stage | Main purpose |
|---|---|
| **1. Generate** | Create a reusable technical draft from the selected workflow basis and available evidence/reference material |
| **2. AI Review** | Independently challenge the generated artifact for technical accuracy, evidence support, usefulness, completeness, source quality, freshness/applicability, conflicts and uncertainty |
| **3. Code Checks** | Verify structure, source/reference integrity, provenance hygiene, placeholders, review items, currentness concerns and readiness rules |
| **4. Repair** | Run one controlled repair prompt only when the issue can be repaired safely from the evidence already available |
| **5. Readiness** | Classify the artifact as **READY**, **DRAFTABLE**, or **NOT READY** |
| **6. Human Review** | Perform the final technical/editorial review and publish only through the normal approved process |

---

# Before generation — how the artifact type is chosen

There are two entry paths.

## Retrospective mode — the Audit owns the Knowledge destination

During **Run XSUP Retrospective**, the validated Retrospective Audit chooses the Knowledge destination from the supported action set.

| Knowledge action | Purpose | Artifact produced |
|---|---|---|
| `CREATE KCS` | Repeatable Support-resolution or expected-behavior pattern that belongs in KCS | KCS Draft |
| `UPDATE EXISTING KCS` | A specific existing Salesforce KCS materially overlaps but lacks required content | KCS Update Proposal |
| `UPDATE ADMIN/TECH GUIDE` | The evidence establishes a maintained administrator/product-documentation gap | Admin / Tech Guide Update Proposal |
| `CREATE/UPDATE RUNBOOK` | The reusable value is mainly an internal investigation/operational workflow | Runbook Draft |
| `KNOWN ISSUE/RELEASE NOTE` | The reusable value belongs in version/defect/release communication | Known Issue / Release Note Draft |
| `NO KNOWLEDGE ACTION` | No material reusable gap remains | No artifact |
| `UNDETERMINED` | Evidence is insufficient to choose safely | No automatic artifact |

The normal retrospective rule is strict:

> **The validated Audit owns the downstream Knowledge destination.**

If the Audit selected `CREATE KCS`, downstream generation must not silently convert it into `UPDATE EXISTING KCS`. If newly discovered overlap creates a routing concern, the artifact should surface that concern for review rather than silently changing the Audit decision.

## Direct Generate KCS — KCS-family routing

**Generate KCS** intentionally skips the retrospective Support-owned field review and stays within the KCS family.

The direct job begins as:

```text
Primary Knowledge Action = CREATE KCS
Artifact Type = KCS Draft
```

The Knowledge workflow then inspects actual available Salesforce KCS content.

When a material same-scope content match is established, Direct Generate KCS may reconcile to:

```text
Primary Knowledge Action = UPDATE EXISTING KCS
Artifact Type = KCS Update Proposal
```

Title or keyword similarity alone is not enough.

When the workflow recommends updating an existing KCS, the reviewer can still choose **Create New KCS Anyway**. In that case, the separate draft retains the related existing KCS so duplication/scope/conflict can be reviewed before publication.

This CREATE↔UPDATE reconciliation exception applies to **Direct Generate KCS only**.

---

# Step 1 — generate a reusable Knowledge draft

The generation prompt is designed to create a reusable support/documentation asset, not simply summarize one case.

It looks for the technical pattern that another engineer can reuse, including where supported:

- symptom / task / observable behavior;
- applicable environment or scope;
- cause, explanation or expected behavior;
- diagnosis / checks;
- interpretation of results;
- resolution, workaround or recommended action;
- verification;
- relevant existing Knowledge and maintained documentation;
- Internal Notes for useful sourced TAC/Engineering-only implementation context;
- canonical source references.

Customer-specific details should be removed from the reusable body unless needed as a clearly framed example.

## Material high-risk details

Exact operational or implementation details require stronger evidence discipline, especially:

- commands;
- API routes, schemas or payloads;
- UI navigation;
- exact timings, latency or cadence;
- file/log paths;
- versions and supported scope;
- internal architecture or backend behavior;
- configuration values;
- remediation behavior.

If a useful material detail cannot be established, the generator is instructed to omit it or mark it for **TAC/SME validation required** rather than silently presenting it as confirmed fact.

Formal reader-facing `REVIEW` / `BLOCKER` callouts are finalized by the independent quality and deterministic validation stages.

## At a Glance

Generated Knowledge includes an **At a Glance** summary near the top so the reviewer can quickly understand:

1. what the artifact is about;
2. the important supported finding;
3. what the artifact helps the reader do.

---

# Step 2 — independent AI quality review

A second, separate prompt reviews the generated artifact.

The reviewer checks the draft as a reusable Knowledge asset rather than trusting the generation response to certify itself.

## What the quality reviewer checks

| Area | What is checked |
|---|---|
| **Technical accuracy** | Material product behavior, commands, APIs, timing, cause and resolution are evidence-supported |
| **Evidence quality** | Important reusable claims map to appropriate underlying sources |
| **Usefulness** | The intended reader can understand the issue/task and what to do |
| **Actionability** | Checks/procedures include useful interpretation and next action where evidence supports it |
| **Generalization** | Case-specific facts are not silently converted into universal behavior |
| **Completeness** | The artifact contains the sections needed for its type without manufacturing filler |
| **Technical depth** | Useful exact details are retained only when supported |
| **Readability** | Content is structured, concise and not unnecessarily repetitive |
| **Discoverability** | Titles/keywords help another engineer find the Knowledge |
| **Existing Knowledge awareness** | Existing KCS/docs are considered before duplicate content is created |
| **Scope** | Applicability across product/version/platform/tenant is explicit where material |
| **Source freshness** | Historical or version-specific sources are checked for current applicability |
| **Source conflicts** | Material disagreements between sources are made explicit instead of silently resolved |
| **Anti-circularity** | Generated/TACO/Case Chat synthesis is not accepted as sole authority for a material reusable claim |
| **Publication safety** | Material uncertainty is visible before publication |

The quality prompt returns one internal result:

```text
PASS
PASS_WITH_VALIDATION
FAIL
```

It can also emit structured `REVIEW` or `BLOCKER` items tied to the affected claim/reference.

---

# Step 3 — make material uncertainty visible

The final artifact does not rely on vague statements such as “this article needs review.”

The released workflow renders review guidance directly beside the affected claim/reference.

## Reader-facing marker states

| Marker | Meaning |
|---|---|
| **⚠ REVIEW** | A material claim/reference needs validation before authoritative reuse or publication |
| **⚠ REVIEW CURRENTNESS** | A materially used historical, version-specific or case-specific source needs current-applicability confirmation |
| **✕ BLOCKER** | A material publication blocker remains |

Source References can also display source-state indicators such as:

- **✕ BLOCKER SOURCE**
- **⚠ REVIEW CURRENTNESS**
- a current / maintained source state

## Review types

Each formal review item uses a structured review type.

| Review type | Typical use |
|---|---|
| `UI_NAVIGATION` | Exact UI path/navigation requires validation |
| `CLI_COMMAND` | Command syntax/behavior requires validation |
| `API_CONTRACT` | API endpoint/schema/payload/contract requires validation |
| `TIMING_SLA` | Exact timing, latency, propagation or cadence may be interpreted as a product promise |
| `FILE_LOG_PATH` | Exact file/log path requires validation |
| `SOURCE_CURRENTNESS` | Historical/non-current evidence materially supports a reusable claim |
| `MISSING_SOURCE_OR_LINK` | A required underlying source/link is unavailable |
| `DERIVATIVE_AI_EVIDENCE` | A generated/derived source is being used too strongly |
| `INTERNAL_ARCHITECTURE` | Internal/backend implementation detail requires Engineering/current-source confirmation |
| `DOCUMENTATION_PLACEMENT` | Proposed maintained-documentation destination/placement needs owner review |
| `CITATION_GAP` | A material claim lacks explicit supporting source mapping |
| `OTHER_MATERIAL_VALIDATION` | Another material validation issue does not fit the categories above |

## What a callout tells the reviewer

A rendered review/blocker callout identifies, as applicable:

- **Review type**
- **Claim under review**
- **What to review / resolve**
- **Source(s)** / `[R#]`
- **Why** it matters
- **Required outcome / action**
- conflict detail when sources disagree
- owner when useful

This keeps the validation task close to the affected content rather than hiding it in a generic bottom-of-document warning.

---

# Step 4 — deterministic JavaScript checks

After the AI quality response, XSUP Auditor performs code-based checks that do not depend on the AI declaring its own output correct.

The checks include areas such as:

## Structure and artifact integrity

- expected artifact structure;
- At a Glance handling;
- source/reference sections;
- required target context for update proposals;
- Markdown/code-fence integrity;
- unresolved placeholders;
- internal reuse/provenance metadata leakage;
- renderer safety.

## Source/reference integrity

Material body claims use stable source references such as `[R1]`, `[R2]`, and so on.

The final `Source References` section is expected to map used source IDs to the underlying source identity and, when available, a direct link plus provenance/freshness/support/evidence context.

TACO and Case Chat can discover and synthesize evidence, but they are not treated as the authoritative underlying source by themselves.

## Source freshness and applicability

Historical support cases, older KCS, Confluence/runbook material, Jira/Engineering evidence and web material can still be useful, but they may be version-specific or superseded.

The deterministic layer can create or normalize **SOURCE_CURRENTNESS** reviews when current applicability has not been established for a material reusable claim.

Older evidence is not automatically treated as wrong; the workflow distinguishes source age/currentness uncertainty from an actually established contradiction or deprecation.

## Anti-circularity

A generated XSUP Auditor/TACopilot/Case Chat artifact must not become the sole authority for a later reusable product claim.

Where possible, the workflow traces material claims back to original Jira/SFDC, maintained product documentation, approved Knowledge, internal documentation or other underlying evidence.

## Conflicts

When materially relevant sources disagree, the workflow should surface an explicit review/blocker that states:

- what conflicts;
- which sources are involved;
- why the disagreement matters;
- what must be resolved before authoritative reuse.

## Exact timing

Exact timing/latency/cadence from case or Engineering evidence is not automatically treated as a product SLA.

Unless current maintained authority directly supports the same timing/mechanism/scope, the workflow routes the statement through a `TIMING_SLA` review item or narrows/removes it.

---

# Step 5 — optional one-time repair

When the quality/deterministic checks identify an issue that appears safe to repair, the workflow can perform **one evidence-bounded repair pass**.

Typical repairable issues include:

- structure/formatting problems;
- unresolved internal provenance text;
- source/reference normalization problems;
- missing or inconsistent review items;
- readiness inconsistency;
- malformed code fences;
- unresolved placeholders;
- other quality/structure problems that can be corrected from existing evidence.

The repair prompt is explicitly constrained not to invent new facts.

It must not invent:

- diagnosis;
- product behavior;
- commands;
- APIs;
- UI paths;
- versions;
- exact timing;
- Engineering confirmation;
- unsupported source support.

If a material issue cannot be repaired safely from the available evidence, the usable draft should remain reviewable and the issue should stay visible as a `REVIEW` or `BLOCKER`.

After repair, the deterministic checks run again.

There is only **one automatic repair pass**.

---

# Readiness vs publication review vs execution status

These are different concepts.

## Artifact Readiness

### 🟢 READY

The draft is useful/materially complete and the automated quality workflow has not identified a material unresolved validation item.

**READY does not mean automatically approved or published.**

The normal human editorial/publication review still applies.

### 🟠 DRAFTABLE

A useful draft exists, but one or more named material validation items remain.

Resolve the highlighted review items before authoritative reuse/publication.

### 🔴 NOT READY

A usable draft exists, but a material blocker remains or the quality workflow could not safely establish publication readiness.

The draft is preserved so the reviewer can resolve the issue rather than losing useful work.

### ⚪ NOT APPLICABLE

No Knowledge artifact is required for the retrospective decision.

## Publication review state

The rendered artifact can separately show:

```text
REVIEW
BLOCKER
```

This is driven by the final inline review/blocker set.

A `BLOCKER` item makes publication readiness more conservative.

## Execution status

Execution status answers a different question:

> Did the workflow successfully produce/preserve a usable artifact?

Examples:

```text
Execution: COMPLETED
Readiness: DRAFTABLE
Publication review: REVIEW
```

or:

```text
Execution: COMPLETED
Readiness: NOT READY
Publication review: BLOCKER
```

A quality concern by itself should not be confused with a technical workflow failure.

`FAILED` is reserved for technical execution problems where no usable artifact can be generated or preserved.

---

# When independent quality validation is unavailable

Transient Case Chat request failures can be retried/recovered by the shared reliability layer.

If the independent quality stage still cannot complete but a usable enriched draft exists, the workflow preserves the artifact conservatively instead of discarding it.

The internal quality state can show:

```text
VALIDATION UNAVAILABLE
```

The artifact remains review-required and includes a validation notice explaining that independent quality validation did not complete.

This means:

- the quality stage was unavailable;
- the draft was preserved;
- human validation or a successful rerun is still required.

It does **not** mean the AI substantively judged the technical content to be wrong.

---

# Existing Knowledge and duplicate control

The quality workflow considers relevant existing Knowledge.

## Direct Generate KCS

When actual Salesforce KCS content materially overlaps the issue, Direct Generate KCS can produce a KCS Update Proposal instead of a new article.

If the reviewer chooses **Create New KCS Anyway**, the new draft retains the related existing KCS and requires scope/duplication/conflict review.

## Retrospective mode

The validated Audit owns the destination. If downstream generation discovers overlap that conflicts with the Audit-selected route, that is surfaced for review rather than silently changing the route.

---

# Internal Notes

Internal Notes can preserve useful sourced TAC/Engineering-only context that should not be placed into the reusable public-facing body.

Examples can include:

- internal implementation details;
- backend component/queue behavior;
- internal parameter names;
- diagnostic interpretation;
- Engineering investigation context;
- escalation boundaries;
- observed behavior that is not a supported public guarantee.

Internal Notes are not a second source inventory and not a duplicate review list.

Material Internal Notes still require source support and, when current applicability matters, can carry review/currentness requirements.

---

# Smart reuse

The workflow avoids unnecessary repeat AI calls when a compatible current artifact can be reused.

A reusable result must still match the relevant workflow identity and current inputs.

Direct-KCS and retrospective-derived Knowledge are kept distinct so incompatible workflow intent is not silently reused.

When a reviewer deliberately wants the current case rebuilt using the current Knowledge workflow, use **Regenerate KCS / Regenerate Knowledge**.

---

# Quick reviewer checklist

When reviewing a generated Knowledge artifact, start with these questions:

| Question | Where to look |
|---|---|
| **What is this artifact about?** | `At a Glance` |
| **Is it READY, DRAFTABLE, or NOT READY?** | Readiness/status near the top |
| **Is publication review REVIEW or BLOCKER?** | Header/status chip and inline callouts |
| **Which exact claims/references need validation?** | Inline `REVIEW`, `REVIEW CURRENTNESS`, or `BLOCKER` markers |
| **What kind of validation is needed?** | Review type in the callout |
| **Why does it matter and what must be done?** | What / Why / required Outcome/action |
| **What evidence supports the technical content?** | `[R#]` links and `Source References` |

---

# Human review remains mandatory

The workflow produces **drafts and proposals**.

It does not automatically:

- publish a KCS;
- modify official documentation;
- declare a Known Issue;
- change XSUP/Jira/SFDC fields;
- replace TAC, SME, Engineering, documentation-owner or publication judgment.

Even a **READY** artifact requires the normal human review/publication process.

---

# Summary

The Knowledge quality model can be summarized as:

> **Generate the reusable draft, independently review it, automatically validate it, repair safe issues once, place review/blocker guidance directly beside affected claims and references, and keep publication under human control.**

Key design principles:

- **generation and quality review are separate;**
- **material facts should trace to underlying evidence;**
- **source freshness/current applicability matters;**
- **generated/derived evidence cannot certify itself;**
- **source conflicts remain visible until resolved;**
- **review requirements appear beside the affected content;**
- **useful drafts are preserved when safe to do so;**
- **human review remains the final publication gate.**
