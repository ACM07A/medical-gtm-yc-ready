# 13 — Stop Rules

## Stop immediately if
- A clinical claim, price, outcome, or accreditation cannot be sourced (would require fabrication).
- Patient PII would be sent to a third-party model without consent/minimization.
- Content implies diagnosis, treatment advice, or a cure/outcome guarantee.
- An organ-transplant flow lacks documented donor legality.
- Same failure repeats 3×.
- A partner commercial term, spend, or contract needs deciding.

## Stop and ask a human if
- A medical, legal, or compliance judgment is required.
- Consent for a patient story / data use is unclear.
- An outreach send list contains anything beyond public business contacts.
- Platform ad-policy risk (health) is ambiguous.
- A new market's regulatory surface is undetermined.

## Do NOT stop if
- Ordinary build/config error with a clear fix.
- A content draft needs a cited source that IS available — fetch and cite it.
- A localization needs native QA — route it, don't halt the whole loop.

**Golden rule:** in this domain, when unsure about safety, accuracy, consent, or compliance — stop and escalate. Silence beats a wrong health claim.
