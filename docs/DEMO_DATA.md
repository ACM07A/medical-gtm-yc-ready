# Demo Data

Primary golden path:

- Patient: Ibrahim Musa.
- Country: Nigeria.
- Language: English.
- Treatment request: cardiac bypass evaluation.
- Budget: USD 8,000-15,000.
- Source agent: Lagos Health Travel Partners.
- Consent: captured.
- Hospital: Demo Cardiac Centre A (fictional synthetic organization).
- Vendors: interpreter, airport transfer, accommodation.

Exception path:

- Patient: Amina Okoro.
- Issue: consent missing.
- Blocker: `CONSENT_REQUIRED`.
- Visible at `/cases/case_amina_okoro`.

All patient, estimate, vendor, approval and audit records are synthetic.
