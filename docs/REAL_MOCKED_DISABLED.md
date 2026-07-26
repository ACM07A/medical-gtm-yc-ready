# Real, Mocked and Disabled

This classification applies to the YC sandbox on `agent/yc-demo-readiness`. All displayed patient, organization, document, quotation and workflow data is synthetic.

| Subsystem | Demo classification | Production dependency |
|---|---|---|
| Signed-cookie authentication | Real and operational for demo accounts | Replace demo identity with the selected production identity provider |
| Role and organization scoping | Real and operational | External tenant-isolation review |
| Patient intake and SQLite persistence | Real and operational with synthetic records | Production database, retention and backup policy |
| Case workflow and audit history | Real and operational | Production policy configuration and monitoring |
| Compliance blockers | Real deterministic rules | Legal/compliance policy review |
| Documents | Metadata and synthetic placeholders | Encrypted object storage, malware scanning and KMS |
| Document classification | Deterministic demo output | Model/provider integration and evaluation |
| Administrative summaries | Deterministic AI-assisted demo output | Model credentials, evaluations and human review process |
| Hospital matching | Simulated with fictional hospitals | Contracted hospital directory and approved matching policy |
| Hospital case sharing | Simulated for demo | Hospital integration and explicit human approval |
| Hospital response and quotation | Synthetic persisted records | Contracted hospital workflow |
| Email | Disabled | Provider account, sender domain and approved templates |
| WhatsApp | Disabled | WhatsApp Business account and approved templates |
| Vendor booking | Simulated for demo | Verified vendors, contracts and live adapter |
| Payments | Disabled | Licensed payment provider and commercial approval |
| Visa coordination | Administrative checklist only | Current government rules and human verification |
| Travel booking | Simulated for demo | Accredited booking/vendor integration |
| Clinical decisions | Disabled by design | Always owned by licensed clinicians/hospitals |
| Notifications | Mocked/disabled | Provider accounts, retry queue and monitoring |
| Product analytics | Basic server metrics only | Privacy-approved analytics provider |

Demo mode requires `POST_LIVE=0`. No success message should be interpreted as external delivery, booking, diagnosis, clinical recommendation or partnership confirmation.
