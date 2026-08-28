# Troubleshooting

## Mapping Not Found

Check:

- XSUP ID
- XSUP/SFDC linkage
- whether TACopilot search can see the case

Do not manually guess a Salesforce case inside the tool.

## Multiple SFDC Candidates

Select the actual linked case.

Other queue jobs can continue while selection is pending.

## TACO Is Reused

This is normally expected when:

- a complete analysis exists
- no newer original case evidence requires refresh

Check the status reason and analysis/evidence dates.

## TACO Refreshes Unexpectedly

Possible causes:

- newer case evidence
- incomplete prior report
- changed TACO output
- Re-analyze All was used

## Audit Generates a New Case Chat

Read the Audit status reason.

Common causes:

- no matching prior fingerprint
- evidence changed
- TACO changed
- focused evidence changed
- audit methodology changed
- previous answer was incomplete
- Case Chat history was inaccessible

## Knowledge Generates Again

Knowledge reuse is independent from Audit reuse.

It can regenerate when:

- audit changed
- knowledge action changed
- artifact type changed
- readiness changed
- previous artifact was incomplete

## Need to Download Again

Do not use Re-analyze All.

Run the normal audit flow. If inputs are unchanged, the existing server-side result should be reused and rendered/downloaded locally.

## Wrong or Suspicious Result

Do not apply the recommendation.

Check:

- XSUP/SFDC mapping
- original Jira evidence
- original SFDC evidence
- TACO conclusion
- reuse status
- cited evidence

Use Re-analyze All only when a genuinely fresh end-to-end analysis is required.

## Browser Download Fails

Possible causes:

- managed browser policy
- blocked file type
- download restriction
- invalid folder permission

Use only approved alternatives. Do not bypass corporate controls.

## Choose Folder Fails

Check whether:

- Chrome supports File System Access API
- the action was initiated by a direct user click
- the chosen folder is permitted

## Tooltip Does Not Appear

- rerun the current snippet
- confirm only one auditor instance is active
- check browser console for errors

## Case Chat Appears to Duplicate

Check:

- whether the previous result fingerprint actually matches
- whether TACopilot history is accessible
- whether the previous entry is complete
- whether evidence/TACO changed

Capture a sanitized diagnostic for maintainers if the same fingerprint is being regenerated.
