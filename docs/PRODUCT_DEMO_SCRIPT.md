# 60-90 Second Product Demo

“International patient coordination is fragmented across documents, hospital inboxes, quotations and travel checklists. Canopus Care gives medical-travel coordinators and hospital international-patient teams one administrative workflow while clinicians retain every medical decision.

This dashboard contains synthetic demonstration data only. I’ll open `CASE-DEMO-001`, a fictional cardiac enquiry from Nigeria. The case workspace shows intake details, document status, an AI-assisted administrative summary, fictional hospital matches and an indicative quotation. Missing records and the next accountable action are visible without presenting a diagnosis.

As the hospital user, I open the shared case and record the synthetic review response. The server validates that this is the next allowed state and writes the actor and timestamp to the audit trail. As the agent, I can then accept the response and move into visa and arrival preparation. Refreshing the page preserves every transition.

`CASE-DEMO-002` demonstrates the safety boundary: consent and a mandatory document are missing, so direct API calls and the UI cannot share or progress it.

Database persistence, permissions, workflow validation and audit history are real. Hospital sharing, AI output, quotations and vendor events are simulated. Email, WhatsApp, payments and clinical decisions are disabled in this demo.”
