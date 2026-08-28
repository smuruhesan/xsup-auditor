# Product Policies

XSUP Retrospective Auditor uses one common engine with three product-specific review profiles.

The common engine handles:

- XSUP → SFDC resolution
- TACO freshness
- original evidence
- Case Chat
- Smart Reuse
- dashboard/progress
- Knowledge generation
- report/storage/session behavior

The product profile determines which retrospective fields are in scope.

---

# XDR/XSIAM

## Trigger

The ticket is in retrospective scope when:

```text
Resolution = Functions as designed
```

## Primary reviewed field

**Resolution**

## Other fields

RCA, Fix Type and Flag/Label are normally `NOT APPLICABLE` for this trigger unless approved original ticket evidence explicitly establishes that another field is part of the retrospective policy for that ticket.

## Safety

If the current Resolution cannot be established from original ticket evidence:

**Retrospective Eligibility = UNDETERMINED**

If the Resolution is established and does not match the trigger:

**OUT OF SCOPE**

---

# XSOAR

## Triggers

The ticket is in scope when either:

```text
Label/Flag contains Session_candidate
```

or:

```text
Fix Type = None
```

or:

```text
Fix Type = Functions as designed
```

## Reviewed fields

Review only the field(s) that triggered the candidate:

- **Fix Type** when its current value matches the Fix Type trigger
- **Flag / Label** when `Session_candidate` is present

If both triggers exist, review both.

## Other fields

Resolution and RCA are normally `NOT APPLICABLE` unless original ticket evidence explicitly establishes them as part of the approved XSOAR retrospective policy for that ticket.

---

# Cortex Cloud

## Triggers

In scope when the current Resolution is one of:

```text
Duplicate
Not a Bug
Environment/Config issue
Invalid
Functions as designed
Non Issue
```

or when:

```text
RCA = User Error
```

## Reviewed fields

- Review **Resolution** only when it matches one of the Resolution triggers.
- Review **RCA** only when actual RCA is `User Error`.
- If both triggers exist, review both.

## Important RCA rule

**RCA Category is not the RCA field.**

The auditor must establish the actual RCA value from original ticket evidence.

If actual RCA cannot be established safely, use `UNDETERMINED`.

## Other fields

Fix Type and Flag/Label are normally `NOT APPLICABLE` unless original ticket evidence explicitly establishes them as part of the approved Cortex Cloud retrospective policy.

---

# Product detection

Auto detection considers structured information from the TACopilot case/TACO context.

Signals can include:

- TACO/case product metadata
- structured product/platform/category fields
- XSUP/SFDC mapping detail
- case header/metadata
- Jira ticket snapshot

The tool does not rely on one keyword alone when stronger structured information exists.

## High confidence

Continue automatically.

## Lower confidence / ambiguous

Pause that XSUP and ask the reviewer.

## Manual mode

`Ask me for every XSUP` requires confirmation for every XSUP.

---

# Product override

The selected product is part of the retrospective decision context.

If the product changes, the previous product-specific Audit/Knowledge result is not treated as current.

The current TACO analysis does not need to be discarded solely because the reviewer changed the retrospective product profile.
