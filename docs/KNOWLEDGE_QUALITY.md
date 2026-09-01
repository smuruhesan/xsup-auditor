# Knowledge Quality

The XSUP Auditor does not generate a Knowledge article with one AI prompt and trust the result.

It uses a **multi-step quality workflow** built on the completed retrospective, TACO Analysis, original Jira/SFDC evidence, and Case Chat. The goal is simple:

> **Generate a useful draft quickly, make uncertainty visible, and keep the final publication decision with the engineer/reviewer.**

The workflow can create:

- KCS Drafts
- KCS Update Proposals
- Admin / Tech Guide Update Proposals
- TAC Runbooks
- Known Issue / Release Note Drafts

It does **not** automatically publish Knowledge or modify documentation.

---

## Visual overview

> Recommended repository path for the image: `docs/images/kcs-quality-overview.png`

![KCS Quality Review Overview](docs/images/kcs-quality-overview.png)


![Uploading kcs-quality-overview.png…]()

---

# How the Knowledge quality workflow works

The easiest way to understand the flow is:

```text
Retrospective + TACO + original evidence
                 │
                 ▼
        1. Generate the draft
                 │
                 ▼
      2. Independent AI review
                 │
                 ▼
       3. Automatic code checks
                 │
                 ▼
       4. Repair once if needed
                 │
                 ▼
 READY / DRAFTABLE / NOT READY
                 │
                 ▼
          5. Human review
```

There are normally **two AI prompts** for a fresh Knowledge artifact.

| Stage | What happens |
|---|---|
| **Prompt 1 — Knowledge Generation** | Creates the reusable KCS / documentation / runbook / known-issue draft |
| **Prompt 2 — Independent Quality Review** | Reviews the draft for technical quality, evidence, usefulness, completeness, and publication readiness |
| **Prompt 3 — Repair** | Runs only when an automatic check finds a repairable issue |

The repair prompt is **optional** and can run only once.

The Retrospective Audit prompt happens earlier and is separate from this Knowledge workflow.

---

# Step 1 — Generate a reusable Knowledge draft

The first prompt is designed for Support Knowledge creation. It is not simply:

> "Summarize this case."

It asks Case Chat to turn the case-specific investigation into something another engineer can reuse.

The generator looks for:

- the technical problem or behavior;
- symptoms another engineer may see;
- the supported cause or expected behavior;
- how to check the condition;
- how to confirm it;
- the resolution, workaround, or next action;
- how to verify the result;
- relevant underlying sources;
- whether existing Knowledge should be updated instead of creating a duplicate.

Customer-specific details are removed unless they are needed as a technical example.

## At a Glance

Every generated artifact starts with a short **At a Glance** section.

It should explain in 2–3 sentences:

1. what the article is about;
2. the important technical finding;
3. what the article helps the engineer do.

Example:

> **At a Glance**  
> This article explains why an endpoint may continue using its previous policy after an Active Directory group or OU change. It describes the expected synchronization behavior and helps engineers confirm the condition and choose the appropriate remediation path.

This makes the article understandable before the reviewer reads the full technical content.

---

# Step 2 — Independent AI quality review

A second, separate prompt reviews the generated draft.

This is important because the same AI response that generated the article is **not allowed to be the only quality decision**.

The quality reviewer checks the draft as a reusable technical Knowledge asset.

## What the AI reviewer checks

| Area | What we are looking for |
|---|---|
| **Technical accuracy** | Product behavior, commands, API details, timing, error interpretation, cause, and resolution must be supported |
| **Evidence quality** | Important claims should point back to appropriate underlying evidence |
| **Usefulness** | Another engineer should understand the problem and know what to do next |
| **Actionability** | The article should provide a usable `check → confirm → resolve → verify` path where appropriate |
| **Generalization** | Customer-specific details should not become universal product statements |
| **Completeness** | Required sections for the selected artifact type must be present |
| **Technical depth** | Useful commands, UI paths, APIs, versions, architecture, and configuration can be included when supported |
| **Readability** | The draft should be structured, concise, and avoid unnecessary duplication |
| **Discoverability** | Titles and search terms should help another engineer find the Knowledge |
| **Existing Knowledge awareness** | Update existing Knowledge where appropriate instead of creating unnecessary duplicates |
| **Scope** | Version, OS, tenant, or product applicability must be clear |
| **Publication safety** | Unsupported or uncertain statements must not be presented as confirmed facts |

---

# Step 3 — Make uncertainty visible in the article

The quality reviewer does not just say:

> "This article needs review."

It marks the **exact statement** that needs attention.

| Marker | Meaning | Reviewer action |
|---|---|---|
| **⚠ SME REVIEW** | Product behavior, UI path, timing, configuration, or operational detail needs validation | Confirm with a product SME or authoritative source |
| **⚙ ENGINEERING REVIEW** | Backend, API, architecture, or implementation detail needs Engineering confirmation | Verify using original Engineering evidence or Engineering review |
| **◇ INFERENCE** | The conclusion is reasonable but not directly established by the available evidence | Find a source, narrow the wording, or remove it |
| **🔎 SOURCE CHECK** | A stronger or more direct source is needed | Locate the authoritative source |
| **🧭 SCOPE CHECK** | Applicability is unclear across versions, platforms, tenants, or products | Confirm the supported scope |
| **ℹ RECOMMENDATION** | Helpful guidance or best practice rather than mandatory product behavior | Keep it clearly framed as guidance |
| **✓ CONFIRMED** | Important statement has direct supporting evidence | Normally no additional technical validation required |
| **✕ UNSUPPORTED** | A material claim does not currently have enough support | Support, rewrite, or remove it before publication |

Example:

```text
Session-triggered synchronization usually completes within 10–15 minutes.
🧭 SCOPE CHECK — confirm whether this timing applies across all supported platforms.
```

This makes the review requirement easy to find.

---

# Step 4 — Automatic code checks

After the AI review, the Auditor performs another set of checks in JavaScript.

These checks do not depend on the AI saying that its own output is correct.

## What the automatic checks validate

### Article structure

The required minimum sections depend on the artifact type.

For a KCS, the minimum structure includes:

```text
At a Glance
Symptoms / Error
Cause
How to Check
How to Confirm
Resolution / Fix
Source References
```

Other artifact types have their own required structure.

### At a Glance quality

The code checks that the summary:

- exists;
- contains 2–3 sentences;
- is not excessively short or long;
- does not contain the originating XSUP/SFDC identifiers;
- does not contain internal workflow commentary.

### Source support

The final article must include **Source References**.

The source section should point to underlying sources such as:

- Engineering Jira evidence;
- official product documentation;
- original Jira/SFDC records;
- existing approved Knowledge;
- relevant validated internal documentation or cases.

TACO and Case Chat are useful for analysis and discovering sources, but they are **not treated as the underlying factual source by themselves**.

### Internal content cleanup

The final user-facing artifact must not expose tool-only content such as:

```text
[XSUP-AUDITOR-META]
[inference]
[from case data]
[derived analysis]
@@internal-token@@
```

Tool-only metadata is removed automatically where possible.

Uncertainty is converted into a visible review item rather than silently being treated as fact.

### Placeholder and formatting checks

The Auditor checks for issues such as:

- unresolved TODO/TBD placeholders;
- machine placeholders;
- malformed Markdown code blocks;
- missing required headings;
- incorrect target/source context.

### Readiness consistency

The final readiness must agree with the article.

For example:

```text
Article says:
"Exact API schema requires Engineering validation"

but readiness says:
READY
```

The code will not allow those two statements to remain inconsistent.

The artifact must be downgraded to **DRAFTABLE** or **NOT READY**, depending on the issue.

---

# Step 5 — Optional one-time repair

If the automatic checks find a problem that appears safe to repair, the workflow can run one additional repair prompt.

Typical repairable issues include:

- missing required structure;
- formatting problems;
- unresolved internal provenance text;
- missing review markers;
- readiness inconsistency;
- repairable Source References problems;
- malformed code fences;
- unresolved placeholders.

The repair prompt is told to use only the evidence already supplied.

It must **not**:

- invent a new diagnosis;
- invent product behavior;
- invent a command;
- invent an API;
- invent a UI path;
- invent a version;
- invent a timing value;
- invent an Engineering confirmation.

After the repair prompt, the deterministic checks run again.

There is only **one automatic repair pass**.

---

# What happens when the evidence is genuinely weak?

A substantive quality problem is not "fixed" by asking AI to make the statement sound more confident.

Example:

> The draft claims that a specific API behavior applies to every tenant, but there is no authoritative source supporting that statement.

The correct result is not:

> Ask AI to rewrite it as confirmed.

Instead, the workflow should:

- find stronger evidence;
- mark it for Engineering/SME/source review;
- narrow the statement;
- remove the claim; or
- preserve the draft as **NOT READY**.

This is one of the important safety boundaries of the workflow.

---

# Understanding the final Knowledge status

The main status shown to the engineer is **Artifact Readiness**.

There are four possible values.

## 🟢 READY

**Meaning**

The draft is useful and materially complete, and the automated quality workflow did not find a material unresolved validation item.

Typical conditions:

- required sections exist;
- important claims have appropriate support;
- no material unsupported claim remains;
- no material SME/Engineering/source/scope review remains;
- Source References are present;
- no blocking formatting/provenance issue remains.

**Engineer action**

Perform the final human editorial/publication review.

> READY does not mean automatically approved or published.

---

## 🟠 DRAFTABLE

**Meaning**

The draft is useful and can be reviewed now, but one or more specific material validation items remain.

Examples:

- exact UI path needs SME confirmation;
- API schema needs Engineering confirmation;
- timing needs scope validation;
- a useful inference needs a stronger source.

Example:

```text
⚙ ENGINEERING REVIEW
Confirm the exact API schema for the supported release.
```

**Engineer action**

Resolve the highlighted review items.

The engineer does **not** need to rewrite the entire article.

---

## 🔴 NOT READY

**Meaning**

A usable draft exists, but there is a material blocker and it should not be published as-is.

Examples:

- a key claim is unsupported;
- required source support is missing;
- the article is materially incomplete;
- the artifact references the wrong context;
- the final quality stage could not safely establish publication readiness.

The draft is still preserved.

At the top of the article the reviewer sees:

```text
✕ REVIEW REQUIRED

Draft generated successfully — not ready for publication

What to review:
[exact issue]

Why:
[why the issue matters before publication]
```

**Engineer action**

Fix the specific red review items before publication.

---

## ⚪ NOT APPLICABLE

**Meaning**

No Knowledge artifact is required for this retrospective.

This is different from NOT READY.

```text
NOT APPLICABLE
= there is no Knowledge artifact to create

NOT READY
= a draft exists, but a publication blocker remains
```

---

# READY vs DRAFTABLE vs NOT READY

| Status | Is there a useful draft? | Material review remaining? | Can it be published as-is? |
|---|---:|---:|---:|
| **🟢 READY** | Yes | No material item identified | Final human publication review still required |
| **🟠 DRAFTABLE** | Yes | Yes | No — resolve the highlighted validation items |
| **🔴 NOT READY** | Yes | Yes, including a material blocker | No — resolve the red review items |
| **⚪ NOT APPLICABLE** | No artifact expected | N/A | N/A |

---

# Simple readiness decision

```text
Did we produce a usable Knowledge draft?
              │
        ┌─────┴─────┐
        │           │
       NO          YES
        │           │
     FAILED         ▼
              Is there a material blocker?
                    │
              ┌─────┴─────┐
              │           │
             YES          NO
              │           │
        NOT READY          ▼
                    Does material review remain?
                          │
                    ┌─────┴─────┐
                    │           │
                   YES          NO
                    │           │
               DRAFTABLE       READY
```

---

# Execution status is different from Knowledge readiness

A common source of confusion is mixing up:

```text
Did the workflow finish?
```

with:

```text
Is the article ready for publication?
```

These are separate.

Examples:

```text
Execution: COMPLETED
Readiness: DRAFTABLE
```

This means:

> The tool successfully generated the draft. Human validation remains.

Another valid result is:

```text
Execution: COMPLETED
Readiness: NOT READY
```

This means:

> The tool successfully produced/preserved a draft, but a material publication blocker remains.

## When does the Knowledge job actually fail?

`FAILED` should be reserved for technical execution problems where there is no usable artifact to preserve.

Examples:

- Case Chat generation fails before returning a usable draft;
- the service returns an empty/unusable response;
- the workflow cannot preserve any usable Knowledge content.

A quality concern by itself should not cause the job to fail.

---

# Internal AI quality status

The independent quality prompt also produces an internal result:

```text
PASS
PASS_WITH_VALIDATION
FAIL
```

These are useful for diagnostics, but they are **not the main status engineers should use**.

The important human-facing status remains:

```text
READY
DRAFTABLE
NOT READY
```

Typical relationship:

| Internal AI result | Typical human-facing readiness |
|---|---|
| `PASS` | READY, unless deterministic checks find an issue |
| `PASS_WITH_VALIDATION` | DRAFTABLE |
| `FAIL` | NOT READY when a usable draft exists |

The deterministic gate can always make the final readiness more conservative.

---

# Human review remains mandatory

The workflow produces **drafts and proposals**.

It does not automatically:

- publish a KCS;
- modify official documentation;
- declare a Known Issue;
- change an XSUP/Jira field;
- replace TAC, SME, Engineering, or documentation-owner judgment.

Even a **READY** artifact requires the normal human publication/review process.

---

# Smart Reuse

The Knowledge workflow also avoids unnecessary repeat AI calls.

If a current compatible final artifact already exists and the underlying source has not changed, the Auditor can reuse it.

If only the enriched draft can be reused, the workflow can reuse that draft and run the quality stage.

This helps reduce:

- duplicate Case Chat entries;
- repeated AI work;
- unnecessary load;
- differences caused only by asking the same question again.

If a reviewer deliberately wants the current case rebuilt using the latest Knowledge workflow, use:

**Regenerate KCS / Regenerate Knowledge**

This regenerates Knowledge using the current TACO and completed Audit without requiring a full TACO re-analysis.

---

# Quick reviewer checklist

When reviewing a generated Knowledge artifact, start with these five questions:

| Question | Where to look |
|---|---|
| **What is this article about?** | `At a Glance` |
| **Is the draft READY, DRAFTABLE, or NOT READY?** | Status beside the article title |
| **Which exact statements need validation?** | Inline colored review markers |
| **Why do they need validation?** | Marker tooltip / Review & Validation Items / red What & Why box |
| **What evidence supports the technical content?** | Source References |

For most reviewers, these five items are enough to understand the state of the article without reading the internal quality mechanics.

---

# Management / non-technical summary

The Knowledge quality workflow can be summarized in one sentence:

> **Generate the reusable draft, independently review it, automatically check it, repair safe formatting/quality issues once, clearly mark anything that still needs human validation, and keep publication under human control.**

The important design principles are:

- **not one AI answer** — generation and quality review are separate;
- **evidence-driven** — important facts should trace to underlying sources;
- **automatic guardrails** — code independently checks the AI output;
- **uncertainty is visible** — review markers appear beside the exact claim;
- **useful drafts are preserved** — DRAFTABLE and NOT READY are review states, not automatic failures;
- **human-reviewed** — the tool assists Knowledge creation but does not publish it.
