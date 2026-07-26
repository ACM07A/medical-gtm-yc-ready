import { randomUUID } from "node:crypto";

export const CASE_WORKFLOW = Object.freeze({
  intake_review: {
    label: "Intake review",
    next: ["records_review"],
    roles: ["agent_admin", "platform_admin"],
    nextAction: "Review the synthetic records and missing-information checklist",
  },
  records_review: {
    label: "Records review",
    next: ["ready_to_share"],
    roles: ["agent_admin", "platform_admin"],
    nextAction: "Approve the AI-assisted administrative summary for sharing",
  },
  ready_to_share: {
    label: "Ready to share",
    next: ["shared_with_hospital"],
    roles: ["agent_admin", "platform_admin"],
    nextAction: "Simulate sharing the approved case with the selected hospital",
  },
  shared_with_hospital: {
    label: "Shared with hospital",
    next: ["hospital_reviewing"],
    roles: ["hospital_admin", "platform_admin"],
    nextAction: "Hospital international-patient team opens the case",
  },
  hospital_reviewing: {
    label: "Hospital reviewing",
    next: ["response_received"],
    roles: ["hospital_admin", "platform_admin"],
    nextAction: "Hospital records its synthetic response and quotation metadata",
  },
  response_received: {
    label: "Response received",
    next: ["option_accepted"],
    roles: ["agent_admin", "platform_admin"],
    nextAction: "Agent reviews and accepts the synthetic hospital response",
  },
  option_accepted: {
    label: "Option accepted",
    next: ["travel_preparation"],
    roles: ["agent_admin", "platform_admin"],
    nextAction: "Begin visa and pre-arrival coordination",
  },
  travel_preparation: {
    label: "Travel preparation",
    next: ["arrival_ready"],
    roles: ["agent_admin", "platform_admin"],
    nextAction: "Confirm administrative arrival readiness",
  },
  arrival_ready: {
    label: "Arrival ready",
    next: ["follow_up"],
    roles: ["agent_admin", "platform_admin"],
    nextAction: "Create post-treatment follow-up coordination tasks",
  },
  follow_up: {
    label: "Follow-up coordination",
    next: ["closed"],
    roles: ["agent_admin", "platform_admin"],
    nextAction: "Close the administrative coordination case",
  },
  closed: {
    label: "Closed",
    next: [],
    roles: [],
    nextAction: "No further demo action",
  },
  compliance_blocked: {
    label: "Blocked: consent required",
    next: [],
    roles: [],
    nextAction: "Capture explicit patient consent and required identity documents",
  },
});

export const caseStateLabel = (state) => CASE_WORKFLOW[state]?.label || state || "Unknown";

export function allowedCaseTransitions(state, role) {
  const definition = CASE_WORKFLOW[state];
  if (!definition || !definition.roles.includes(role)) return [];
  return definition.next;
}

function transitionError(code, message, details = {}) {
  return { ok: false, error: { code, message, details } };
}

export function transitionCase(db, session, caseRef, targetState) {
  if (!session?.authenticated) return transitionError("AUTH_REQUIRED", "Log in to change case workflow state.");
  const patientCase = db.prepare(`SELECT * FROM patient_case WHERE id=? OR synthetic_identifier=?`).get(caseRef, caseRef);
  if (!patientCase) return transitionError("NOT_FOUND", "Case not found.");

  const scoped = session.role === "platform_admin"
    || (session.role === "agent_admin" && patientCase.source_agent_org_id === session.organization_id)
    || (session.role === "hospital_admin" && patientCase.assigned_hospital_org_id === session.organization_id);
  if (!scoped) return transitionError("FORBIDDEN", "This role cannot change the selected case.");

  if (patientCase.blockers || patientCase.consent_status !== "captured") {
    return transitionError("COMPLIANCE_BLOCKED", "Case progression is blocked until consent and mandatory administrative requirements are complete.", {
      blockers: patientCase.blockers || "CONSENT_REQUIRED",
      owner: "Agent or care coordinator",
      required_action: patientCase.next_best_action,
    });
  }

  const allowed = allowedCaseTransitions(patientCase.current_stage, session.role);
  if (!allowed.includes(targetState)) {
    return transitionError("INVALID_TRANSITION", `Cannot move from ${caseStateLabel(patientCase.current_stage)} to ${caseStateLabel(targetState)}.`, {
      current_state: patientCase.current_stage,
      allowed,
    });
  }

  const next = CASE_WORKFLOW[targetState];
  if (!next) return transitionError("INVALID_STATE", "Unknown case workflow state.");
  const actor = session.user?.id || null;
  const organization = session.organization_id || null;
  const auditId = `audit_${randomUUID().slice(0, 12)}`;

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`UPDATE patient_case SET current_stage=?,next_best_action=?,updated=datetime('now') WHERE id=?`)
      .run(targetState, next.nextAction, patientCase.id);
    db.prepare(`INSERT INTO audit_event
      (id,actor_user_id,organization_id,action,subject_type,subject_id,outcome,request_id,detail)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      auditId,
      actor,
      organization,
      "case_transition",
      "patient_case",
      patientCase.id,
      "ok",
      "api-case-transition",
      `${caseStateLabel(patientCase.current_stage)} -> ${next.label}`,
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    return transitionError("TRANSITION_FAILED", "The case transition could not be persisted.", { reason: error.message });
  }

  return {
    ok: true,
    case: db.prepare(`SELECT * FROM patient_case WHERE id=?`).get(patientCase.id),
    transition: { from: patientCase.current_stage, to: targetState, audit_id: auditId },
  };
}
