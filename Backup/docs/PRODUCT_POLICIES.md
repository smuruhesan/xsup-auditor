# Product Policies

One common Auditor engine supports three retrospective profiles.

Only the product-specific trigger and applicable fields change.

---

# XDR/XSIAM

## In scope

```text
Resolution = Functions as designed
```

## Review

Primary field:

**Resolution**

Other fields are normally NOT APPLICABLE unless approved original ticket evidence explicitly establishes them as part of that retrospective policy.

If current Resolution cannot be established:

**UNDETERMINED**

If current Resolution is established and does not match the trigger:

**OUT OF SCOPE**

---

# XSOAR

## In scope

Either:

```text
Label / Flag contains Session_candidate
```

or:

```text
Fix Type = None
```

or:

```text
Fix Type = Functions as designed
```

## Review

Review only the fields that triggered the candidate:

- Fix Type
- Flag / Label

If both triggers are present, review both.

Resolution/RCA are normally NOT APPLICABLE unless explicitly part of the approved retrospective policy.

---

# Cortex Cloud

## In scope

Resolution is one of:

```text
Duplicate
Not a Bug
Environment/Config issue
Invalid
Functions as designed
Non Issue
```

or:

```text
RCA = User Error
```

## Review

- Review Resolution only when its value matches the Resolution trigger.
- Review RCA only when actual RCA is `User Error`.
- If both triggers exist, review both.

## Important

**RCA Category is not the actual RCA field.**

If actual RCA cannot be established from original ticket evidence:

**UNDETERMINED**

Fix Type / Flag are normally NOT APPLICABLE unless explicitly included in policy.

---

# Product detection

The Auditor scores product evidence.

Stronger structured evidence has more weight than incidental text.

High confidence:

```text
continue automatically
```

Ambiguous / low confidence:

```text
pause that XSUP for reviewer confirmation
```

---

# Product override

Product selection is part of Audit/Knowledge compatibility.

Changing product:

- re-evaluates Audit/Knowledge
- can reuse current TACO if still valid
- prevents accidentally reusing another product profile's retrospective

---

# Direct Generate KCS and product policy

The product profiles above govern **retrospective eligibility and Support-owned field review**.

The **Generate KCS** workflow is different:

- it may start from an XSUP or SFDC case;
- it still detects/confirms product context;
- it does not evaluate the retrospective trigger;
- it does not review Resolution/RCA/Fix Type/Flag/Label;
- it sends the case directly to KCS generation and the common Knowledge quality pipeline.

Therefore an XSUP/SFDC case can be useful for direct KCS generation even when it is not being processed as a retrospective candidate.
