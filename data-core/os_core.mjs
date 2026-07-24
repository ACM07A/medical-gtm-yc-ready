import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { DB_PATH, logRun } from "./db.mjs";

export const APP_MODES = new Set(["demo", "development", "production", "test"]);
export const DEMO_PASSWORD = "canopuscare-demo";

export function appMode() {
  const mode = process.env.APP_MODE || "demo";
  return APP_MODES.has(mode) ? mode : "demo";
}

export function passwordHash(password, salt = "canopuscare-demo-salt") {
  return `sha256:${salt}:${createHash("sha256").update(`${salt}:${password}`).digest("hex")}`;
}

export function ensureOsSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organization (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, country TEXT, demo INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active', created TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS app_user (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT, password_hash TEXT NOT NULL,
      demo_password_hint TEXT, active INTEGER DEFAULT 1, created TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS membership (
      user_id TEXT REFERENCES app_user(id), organization_id TEXT REFERENCES organization(id), role TEXT NOT NULL,
      PRIMARY KEY(user_id, organization_id, role)
    );
    CREATE TABLE IF NOT EXISTS patient_case (
      id TEXT PRIMARY KEY, synthetic_name TEXT NOT NULL, synthetic_identifier TEXT, source_market TEXT, preferred_language TEXT,
      treatment_request TEXT, treatment_category TEXT, urgency TEXT, budget_band TEXT, travel_window TEXT,
      consent_status TEXT DEFAULT 'missing', current_stage TEXT, source_agent_org_id TEXT REFERENCES organization(id),
      assigned_hospital_org_id TEXT REFERENCES organization(id), assigned_vendor_org_id TEXT REFERENCES organization(id),
      assigned_coordinator TEXT, next_best_action TEXT, warnings TEXT, blockers TEXT, demo INTEGER DEFAULT 1,
      created TEXT DEFAULT (datetime('now')), updated TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS case_document (
      id TEXT PRIMARY KEY, case_id TEXT REFERENCES patient_case(id), doc_type TEXT, status TEXT, metadata TEXT,
      demo_watermark TEXT DEFAULT 'DEMO', created TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS hospital_match (
      id TEXT PRIMARY KEY, case_id TEXT REFERENCES patient_case(id), hospital_org_id TEXT REFERENCES organization(id),
      hospital_name TEXT, accreditation TEXT, location TEXT, department TEXT, partner_status TEXT,
      price_band TEXT, response_sla TEXT, language_support TEXT, operational_fit TEXT, commercial_disclosure TEXT,
      patient_preference TEXT, clinical_acceptance TEXT, evidence TEXT, confidence TEXT
    );
    CREATE TABLE IF NOT EXISTS hospital_review (
      id TEXT PRIMARY KEY, case_id TEXT REFERENCES patient_case(id), hospital_org_id TEXT REFERENCES organization(id),
      reviewer_role TEXT, status TEXT, note TEXT, clinical_decision_owner TEXT, created TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS estimate (
      id TEXT PRIMARY KEY, case_id TEXT REFERENCES patient_case(id), hospital_org_id TEXT REFERENCES organization(id),
      status TEXT, procedure TEXT, currency TEXT, indicative_total REAL, validity TEXT, caveats TEXT,
      approved_by TEXT, released_at TEXT, demo_watermark TEXT DEFAULT 'DEMO', created TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS estimate_item (
      id TEXT PRIMARY KEY, estimate_id TEXT REFERENCES estimate(id), label TEXT, amount REAL, included INTEGER DEFAULT 1, note TEXT
    );
    CREATE TABLE IF NOT EXISTS vendor (
      id TEXT PRIMARY KEY, organization_id TEXT REFERENCES organization(id), service_categories TEXT, cities TEXT,
      languages TEXT, availability TEXT, indicative_price TEXT, sla TEXT, verification_status TEXT,
      compliance_documents TEXT, rating REAL, contact_channel TEXT, commercial_terms TEXT, active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS service_request (
      id TEXT PRIMARY KEY, case_id TEXT REFERENCES patient_case(id), vendor_id TEXT REFERENCES vendor(id),
      category TEXT, status TEXT, requested_for TEXT, mock_quote TEXT, owner TEXT, due_date TEXT, audit_note TEXT,
      created TEXT DEFAULT (datetime('now')), updated TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ops_task (
      id TEXT PRIMARY KEY, case_id TEXT REFERENCES patient_case(id), organization_id TEXT REFERENCES organization(id),
      owner TEXT, priority TEXT, due_date TEXT, status TEXT, title TEXT, next_action TEXT, audit_history TEXT
    );
    CREATE TABLE IF NOT EXISTS agent_definition (
      id TEXT PRIMARY KEY, name TEXT, purpose TEXT, deterministic INTEGER DEFAULT 1, human_approval_default INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS agent_run (
      id TEXT PRIMARY KEY, agent_id TEXT REFERENCES agent_definition(id), organization_id TEXT REFERENCES organization(id),
      trigger TEXT, input_ref TEXT, output_summary TEXT, evidence_refs TEXT, provider TEXT, duration_ms INTEGER,
      estimated_cost REAL, confidence TEXT, status TEXT, errors TEXT, retry_count INTEGER DEFAULT 0,
      human_approval_required INTEGER DEFAULT 1, human_reviewer TEXT, idempotency_key TEXT, correlation_id TEXT,
      created TEXT DEFAULT (datetime('now')), completed TEXT
    );
    CREATE TABLE IF NOT EXISTS approval (
      id TEXT PRIMARY KEY, type TEXT, subject_ref TEXT, organization_id TEXT REFERENCES organization(id), status TEXT,
      what_will_happen TEXT, recipient TEXT, data_exposed TEXT, evidence_checked TEXT, compliance_checks TEXT,
      blocking_reasons TEXT, reviewer TEXT, before_state TEXT, after_state TEXT,
      created TEXT DEFAULT (datetime('now')), decided_at TEXT
    );
    CREATE TABLE IF NOT EXISTS audit_event (
      id TEXT PRIMARY KEY, actor_user_id TEXT, organization_id TEXT, action TEXT, subject_type TEXT, subject_id TEXT,
      outcome TEXT, request_id TEXT, detail TEXT, created TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS message (
      id TEXT PRIMARY KEY, case_id TEXT REFERENCES patient_case(id), direction TEXT, channel TEXT, status TEXT,
      body TEXT, safety_verdict TEXT, created TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS integration_connection (
      id TEXT PRIMARY KEY, provider TEXT, status TEXT, required_variables TEXT, last_success TEXT, last_error TEXT,
      outbound_armed INTEGER DEFAULT 0, human_approval_required INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS commission (
      id TEXT PRIMARY KEY, case_id TEXT REFERENCES patient_case(id), agent_org_id TEXT REFERENCES organization(id),
      expected_amount REAL, currency TEXT, status TEXT, payout_status TEXT, commercial_disclosure TEXT
    );
    CREATE TABLE IF NOT EXISTS seed_version (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')));
  `);
  for (const column of [
    "quote_currency TEXT",
    "quote_amount REAL",
    "quote_expires_at TEXT",
    "service_date TEXT",
    "service_location TEXT",
    "capacity_note TEXT",
    "cancellation_policy TEXT",
    "cancellation_reason TEXT",
    "cancelled_at TEXT",
  ]) {
    try { db.exec(`ALTER TABLE service_request ADD COLUMN ${column}`); } catch {}
  }
  db.exec(`
    UPDATE service_request
    SET quote_currency='USD',
        quote_amount=CASE vendor_id
          WHEN 'vendor_interpreter' THEN 630
          WHEN 'vendor_transfer' THEN 90
          WHEN 'vendor_stay' THEN 550
        END,
        quote_expires_at=datetime('now','+14 days'),
        service_date=COALESCE(NULLIF(service_date,''), due_date),
        service_location=COALESCE(NULLIF(service_location,''), 'Bangalore'),
        cancellation_policy=COALESCE(NULLIF(cancellation_policy,''), 'Demo terms require confirmation before any live booking')
    WHERE case_id='case_ibrahim_musa'
      AND quote_amount IS NULL
      AND vendor_id IN ('vendor_interpreter','vendor_transfer','vendor_stay')
      AND mock_quote LIKE 'Mock quote:%';
  `);
}

const put = (db, sql, params) => db.prepare(sql).run(...params);
const gid = (prefix) => `${prefix}_${randomUUID().slice(0, 8)}`;

export function seedDemoOs(db) {
  ensureOsSchema(db);
  put(db, `INSERT OR IGNORE INTO market (code,name,region,tier,languages,currency,primary_channels,visa_regime,regulatory_status,regulatory_note) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ["NG", "Nigeria", "africa", "A", JSON.stringify(["en"]), "NGN", JSON.stringify(["whatsapp","agent"]), "India e-medical visa", "unverified", "Demo exception market intentionally gated unless counsel verifies"]);
  put(db, `INSERT OR IGNORE INTO market (code,name,region,tier,languages,currency,primary_channels,visa_regime,regulatory_status,regulatory_note) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ["OM", "Oman", "middle_east", "A", JSON.stringify(["ar","en"]), "OMR", JSON.stringify(["whatsapp"]), "India e-medical visa", "unverified", "Demo seeded"]);
  put(db, `INSERT OR IGNORE INTO category (id,name,status,cost_arb,quality,ease,demand,margin,whitespace,score,rank,flagship) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    ["cardiac", "Cardiac Care", "launch", 5, 5, 3, 5, 4, 4, 4.4, 1, 1]);
  put(db, `INSERT OR IGNORE INTO category (id,name,status,cost_arb,quality,ease,demand,margin,whitespace,score,rank,flagship) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    ["oncology", "Oncology", "launch", 5, 5, 2, 5, 4, 4, 4.3, 2, 0]);
  for (const table of ["commission","integration_connection","message","audit_event","approval","agent_run","agent_definition","ops_task","service_request","vendor","estimate_item","estimate","hospital_review","hospital_match","case_document","patient_case","membership","app_user","organization"]) {
    db.prepare(`DELETE FROM ${table}`).run();
  }

  const orgs = [
    ["org_platform", "CanopusCare Platform", "platform", "IN"],
    ["org_agent_lagos", "Lagos Health Travel Partners", "agent", "NG"],
    ["org_hospital_apollo", "Apollo International Cardiac Centre", "hospital", "IN"],
    ["org_hospital_fortis", "Fortis International Patient Desk", "hospital", "IN"],
    ["org_vendor_blr", "Bangalore Arrival Care Network", "vendor", "IN"],
  ];
  for (const o of orgs) put(db, `INSERT INTO organization (id,name,type,country,demo) VALUES (?,?,?,?,1)`, o);
  put(db, `INSERT OR REPLACE INTO tenant (id,name,mode,token,rev_share,active) VALUES (?,?,?,?,?,1)`, ["medyatra", "CanopusCare (own acquisition)", "own", null, 1.0]);
  put(db, `INSERT OR REPLACE INTO tenant (id,name,mode,token,rev_share,active) VALUES (?,?,?,?,?,1)`, ["trudoc-demo", "Trudoc (demo operator)", "operator", "demo-ingest-trudoc", 0.5]);

  const users = [
    ["user_admin", "admin@canopuscare.demo", "Asha Platform Admin", "platform_admin", "org_platform"],
    ["user_hospital", "hospital@canopuscare.demo", "Ravi Hospital Admin", "hospital_admin", "org_hospital_apollo"],
    ["user_agent", "agent@canopuscare.demo", "Zainab Agent Admin", "agent_admin", "org_agent_lagos"],
    ["user_vendor", "vendor@canopuscare.demo", "Meera Vendor Operator", "vendor_operator", "org_vendor_blr"],
    ["user_viewer", "viewer@canopuscare.demo", "Read Only Reviewer", "read_only", "org_platform"],
  ];
  for (const [id, email, name, role, org] of users) {
    put(db, `INSERT INTO app_user (id,email,name,password_hash,demo_password_hint) VALUES (?,?,?,?,?)`, [id, email, name, passwordHash(DEMO_PASSWORD), "synthetic demo only"]);
    put(db, `INSERT INTO membership (user_id,organization_id,role) VALUES (?,?,?)`, [id, org, role]);
  }

  const cases = [
    ["case_ibrahim_musa", "Ibrahim Musa", "MYT-NG-CABG-001", "Nigeria", "English", "Cardiac bypass evaluation", "cardiac", "Within 30 days", "USD 8,000-15,000", "Late August 2026", "captured", "Arrival scheduled", "org_agent_lagos", "org_hospital_apollo", "org_vendor_blr", "Nadia Care Coordinator", "Confirm arrival pack and post-treatment follow-up task", "Indicative pricing only; clinical suitability is hospital-owned.", ""],
    ["case_amina_okoro", "Amina Okoro", "MYT-NG-ONC-002", "Nigeria", "English", "Oncology second opinion", "oncology", "Soon", "USD 12,000-25,000", "September 2026", "missing", "Blocked - consent required", "org_agent_lagos", null, null, "Nadia Care Coordinator", "Capture explicit consent before communication or routing", "No outbound message may be released. Missing consent blocks next action.", "CONSENT_REQUIRED"],
  ];
  for (const c of cases) put(db, `INSERT INTO patient_case
    (id,synthetic_name,synthetic_identifier,source_market,preferred_language,treatment_request,treatment_category,urgency,budget_band,travel_window,consent_status,current_stage,source_agent_org_id,assigned_hospital_org_id,assigned_vendor_org_id,assigned_coordinator,next_best_action,warnings,blockers)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, c);

  const docs = [
    ["Passport copy","Accepted by hospital"],["Medical summary","Accepted by hospital"],["Laboratory reports","Accepted by hospital"],["Imaging reports","Needs review"],["Prior prescriptions","Uploaded"],["Referral note","Uploaded"],["Hospital request","Accepted by hospital"],["Invitation letter","Requested"],["Estimate","Uploaded"],["Discharge summary","Missing"],["Follow-up plan","Requested"],
  ];
  for (const [type, status] of docs) put(db, `INSERT INTO case_document (id,case_id,doc_type,status,metadata) VALUES (?,?,?,?,?)`, [gid("doc"), "case_ibrahim_musa", type, status, JSON.stringify({ synthetic: true, warning: "placeholder only; do not upload real records in demo" })]);
  put(db, `INSERT INTO case_document (id,case_id,doc_type,status,metadata) VALUES (?,?,?,?,?)`, [gid("doc"), "case_amina_okoro", "Consent form", "Missing", JSON.stringify({ blocked: true })]);

  const matches = [
    ["org_hospital_apollo","Apollo International Cardiac Centre","JCI/NABH","Bangalore","Cardiac sciences","Preferred demo partner","USD 8,900-11,800","24h","English, Arabic desk","Strong operational fit for cardiac international desk and fast estimate turnaround.","Commercial relationship disclosed; illustrative demo rate.","Patient prefers Bangalore and English coordination.","Hospital reviewer marked eligible for synthetic estimate.","Seeded partner profile + synthetic SLA", "High"],
    ["org_hospital_fortis","Fortis International Patient Desk","NABH","Bangalore","Cardiac sciences","Warm-intro target","USD 9,200-12,500","36h","English","Good operational fit; requested additional investigation before estimate.","No exclusivity; illustrative demo comparison only.","Shortlisted by agent.","Additional investigation requested by hospital reviewer.","Seeded partner profile + synthetic task", "Medium"],
    ["org_platform","Sir Ganga Ram International Desk","NABH","Delhi","Cardiac sciences","Research target","USD 8,200-10,900","48h","English","Potential fit but contact path requires verification.","No live outreach to inferred contacts.","Lower indicative cost but travel preference weaker.","No clinical acceptance yet.","Synthetic comparison row", "Medium"],
  ];
  for (const m of matches) put(db, `INSERT INTO hospital_match
    (id,case_id,hospital_org_id,hospital_name,accreditation,location,department,partner_status,price_band,response_sla,language_support,operational_fit,commercial_disclosure,patient_preference,clinical_acceptance,evidence,confidence)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [gid("match"), "case_ibrahim_musa", ...m]);

  put(db, `INSERT INTO hospital_review (id,case_id,hospital_org_id,reviewer_role,status,note,clinical_decision_owner) VALUES (?,?,?,?,?,?,?)`,
    ["review_apollo_ibrahim", "case_ibrahim_musa", "org_hospital_apollo", "hospital_clinical_reviewer", "Eligible for synthetic estimate", "Demo reviewer says estimate may be prepared; not a diagnosis or treatment recommendation.", "Hospital clinician"]);
  put(db, `INSERT INTO hospital_review (id,case_id,hospital_org_id,reviewer_role,status,note,clinical_decision_owner) VALUES (?,?,?,?,?,?,?)`,
    ["review_fortis_ibrahim", "case_ibrahim_musa", "org_hospital_fortis", "hospital_clinical_reviewer", "Additional investigations requested", "Recent echo report requested before estimate.", "Hospital clinician"]);

  put(db, `INSERT INTO estimate (id,case_id,hospital_org_id,status,procedure,currency,indicative_total,validity,caveats,approved_by,released_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
    ["estimate_apollo_ibrahim", "case_ibrahim_musa", "org_hospital_apollo", "Released", "CABG evaluation package", "USD", 10850, "14 days", "Illustrative demo estimate; excludes complications, implants beyond listed line items, and clinical changes.", "hospital@canopuscare.demo"]);
  for (const [label, amount, note] of [["Procedure and surgeon fees", 5200, ""],["Hospital stay - private room", 2200, "5 days indicative"],["Investigations", 900, ""],["Consumables and medications", 1200, "Indicative"],["Companion stay support", 550, "Non-clinical"],["Exclusions", 800, "Shown as contingency placeholder"]]) {
    put(db, `INSERT INTO estimate_item (id,estimate_id,label,amount,note) VALUES (?,?,?,?,?)`, [gid("ei"), "estimate_apollo_ibrahim", label, amount, note]);
  }

  const vendorRows = [
    ["vendor_interpreter","Interpreter","Bangalore","English, Hausa","Available next 7 days","USD 35/hour","4h","Verified demo docs",4.7,"Mock marketplace","15% platform fee"],
    ["vendor_transfer","Airport transfer","Bangalore","English","24/7","USD 45 pickup","2h","Verified demo docs",4.8,"Mock marketplace","Fixed net rate"],
    ["vendor_stay","Accommodation","Bangalore","English","Family rooms available","USD 55/night","24h","Verified demo docs",4.5,"Mock marketplace","Commission disclosed"],
  ];
  for (const v of vendorRows) put(db, `INSERT INTO vendor (id,organization_id,service_categories,cities,languages,availability,indicative_price,sla,verification_status,rating,contact_channel,commercial_terms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [v[0], "org_vendor_blr", ...v.slice(1)]);
  for (const [vendor, cat, amount, serviceDate, location, capacity, cancellation] of [
    ["vendor_interpreter","Interpreter",630,"2026-08-24","Apollo Bangalore","6 hours/day for 3 days","No fee until 24 hours before the first session"],
    ["vendor_transfer","Airport transfer",90,"2026-08-24","Bengaluru airport to hospital","Patient plus one companion","No fee until 12 hours before pickup"],
    ["vendor_stay","Accommodation",550,"2026-08-24","Near Apollo Bangalore","Family room for 10 nights","First night charged for cancellation within 48 hours"],
  ]) {
    const quote = `Mock quote: USD ${amount}`;
    put(db, `INSERT INTO service_request
      (id,case_id,vendor_id,category,status,requested_for,mock_quote,quote_currency,quote_amount,quote_expires_at,
       service_date,service_location,capacity_note,cancellation_policy,owner,due_date,audit_note)
      VALUES (?,?,?,?,?,?,?,?,?,datetime('now','+14 days'),?,?,?,?,?,date('now','+3 days'),?)`,
      [gid("sr"), "case_ibrahim_musa", vendor, cat, "Approved", "Arrival package", quote, "USD", amount,
       serviceDate, location, capacity, cancellation, "Meera Vendor Operator",
       "Human approved demo vendor package; no real booking performed"]);
  }

  const tasks = [
    ["org_hospital_apollo","High","Estimate release QA","Completed","Hospital admin approved release after caveat check"],
    ["org_hospital_fortis","Medium","Echo report request","Waiting for input","Ask agent for missing investigation"],
    ["org_agent_lagos","High","Patient comparison review","Completed","Agent reviewed non-clinical estimate comparison"],
    ["org_vendor_blr","Medium","Arrival package confirmation","Scheduled","Confirm interpreter, transfer and stay"],
    ["org_platform","High","No-consent case block","Blocked","Consent gate refuses outbound message"],
  ];
  for (const [org, pri, title, status, next] of tasks) put(db, `INSERT INTO ops_task (id,case_id,organization_id,owner,priority,due_date,status,title,next_action,audit_history) VALUES (?,?,?,?,?,date('now','+2 days'),?,?,?,?)`, [gid("task"), title.includes("No-consent") ? "case_amina_okoro" : "case_ibrahim_musa", org, "Demo owner", pri, status, title, next, "Seeded synthetic audit trail"]);

  const agents = ["Market Intelligence Agent","Hospital Sourcing Agent","Partner Enrichment Agent","Patient Intake Agent","Consent Gate Agent","Case Qualification Agent","Document Checklist Agent","Hospital Matching Agent","Estimate Normalization Agent","Communication Drafting Agent","Follow-up Agent","Vendor Coordination Agent","Content Agent","Compliance Reviewer Agent","QA Agent","Human Approval Router"];
  for (const name of agents) {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_$/,"");
    put(db, `INSERT INTO agent_definition (id,name,purpose,deterministic,human_approval_default) VALUES (?,?,?,?,?)`, [id, name, `${name} prepares operational work only; humans approve consequential actions.`, 1, 1]);
    const status = name === "Consent Gate Agent" ? "Waiting for human approval" : name === "Compliance Reviewer Agent" ? "Completed" : "Completed";
    put(db, `INSERT INTO agent_run (id,agent_id,organization_id,trigger,input_ref,output_summary,evidence_refs,provider,duration_ms,estimated_cost,confidence,status,human_approval_required,human_reviewer,idempotency_key,correlation_id,completed)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`, [gid("run"), id, "org_platform", "demo_seed", "case_ibrahim_musa", `${name} produced deterministic demo output; no LLM key required.`, "synthetic seed + policy gates", "deterministic-mock", 120 + id.length, 0, name.includes("Clinical") ? "N/A" : "High", status, 1, "Demo reviewer", `demo-${id}`, "corr-ibrahim"]);
  }

  const approvals = [
    ["approval_estimate_release","Approve estimate release","estimate_apollo_ibrahim","Approved","Release Apollo synthetic estimate to the agent portal","agent@canopuscare.demo","Indicative estimate rows and caveats","Consent, hospital reviewer status, demo watermark","PASS: consent captured; PASS: no clinical recommendation","", "hospital@canopuscare.demo", "Prepared", "Released"],
    ["approval_blocked_consent","Approve patient communication","case_amina_okoro","Blocked","Would send WhatsApp follow-up","Synthetic patient contact handle","Treatment request and source market","Consent gate","BLOCKED: CONSENT_REQUIRED","Consent missing", "", "Draft", "Blocked"],
  ];
  for (const a of approvals) put(db, `INSERT INTO approval (id,type,subject_ref,status,what_will_happen,recipient,data_exposed,evidence_checked,compliance_checks,blocking_reasons,reviewer,before_state,after_state,organization_id,decided_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'org_platform',datetime('now'))`, a);

  const integrations = [
    ["llm","mock","NVIDIA_API_KEY or GEMINI_API_KEY",null,null,0,1],
    ["email","disabled","RESEND_API_KEY",null,null,0,1],
    ["whatsapp","disabled","WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN",null,null,0,1],
    ["social","disabled","LINKEDIN_TOKEN, META_TOKEN, X credentials, REDDIT credentials",null,null,0,1],
    ["vendor_mock","mock","none",new Date().toISOString(),null,0,1],
    ["object_storage","disabled","S3_BUCKET or compatible storage env",null,null,0,1],
  ];
  for (const i of integrations) put(db, `INSERT INTO integration_connection (id,provider,status,required_variables,last_success,last_error,outbound_armed,human_approval_required) VALUES (?,?,?,?,?,?,?,?)`, [gid("int"), ...i]);

  put(db, `INSERT INTO commission (id,case_id,agent_org_id,expected_amount,currency,status,payout_status,commercial_disclosure) VALUES (?,?,?,?,?,?,?,?)`,
    ["commission_ibrahim", "case_ibrahim_musa", "org_agent_lagos", 1627.5, "USD", "Forecast", "Not payable until treatment is completed", "Synthetic 15% facilitation share, illustrative only"]);
  for (const [action, subject, outcome, detail] of [
    ["demo_seed", "patient_case", "ok", "Golden path and blocked consent case seeded"],
    ["consent_gate", "case_amina_okoro", "blocked", "CONSENT_REQUIRED before communication"],
    ["estimate_release", "estimate_apollo_ibrahim", "ok", "Human-approved release in dry-run demo mode"],
    ["vendor_assignment", "case_ibrahim_musa", "ok", "Mock vendors assigned; no real booking"],
  ]) put(db, `INSERT INTO audit_event (id,actor_user_id,organization_id,action,subject_type,subject_id,outcome,request_id,detail) VALUES (?,?,?,?,?,?,?,?,?)`, [gid("audit"), "user_admin", "org_platform", action, subject, subject.includes("case_") ? subject : "case_ibrahim_musa", outcome, "seed-request", detail]);

  put(db, `INSERT OR REPLACE INTO seed_version (id) VALUES (?)`, ["medyatra_os_demo_v1"]);
  logRun(db, "MedYatra OS", "Demo OS seeded", "Golden Nigerian cardiac path + blocked consent exception + roles/vendors/agents/audit", "/demo", "ok");
}

export function readinessReport(db) {
  ensureOsSchema(db);
  const mode = appMode();
  const missing = [];
  if (mode === "production") {
    for (const k of ["SESSION_SECRET", "APP_BASE_URL", "CONSOLE_TOKEN", "ALLOWED_ORIGINS", "ENCRYPTION_KEY"]) if (!process.env[k]) missing.push(k);
    if (process.env.POST_LIVE === "1" && !(process.env.RESEND_API_KEY || process.env.WHATSAPP_TOKEN)) missing.push("OUTBOUND_PROVIDER_CREDENTIALS");
  }
  const integrations = db.prepare(`SELECT provider,status,required_variables,outbound_armed,human_approval_required,last_success,last_error FROM integration_connection ORDER BY provider`).all();
  const dbOk = db.prepare(`SELECT count(*) c FROM patient_case`).get().c >= 2;
  const status = missing.length ? "BLOCKED" : mode === "demo" ? "READY" : "DEGRADED";
  return {
    ok: !missing.length && dbOk,
    status,
    app_mode: mode,
    database: dbOk ? "READY" : "DEGRADED",
    missing,
    external_actions: mode === "demo" ? "DISABLED" : (process.env.POST_LIVE === "1" ? "CONFIGURED" : "DISABLED"),
    integrations,
    demo_credentials: mode === "demo" ? { password: DEMO_PASSWORD, users: ["admin@canopuscare.demo","hospital@canopuscare.demo","agent@canopuscare.demo","vendor@canopuscare.demo","viewer@canopuscare.demo"] } : undefined,
  };
}

export function backupDatabase(targetDir = join(dirname(DB_PATH), "..", "outputs", "backups")) {
  mkdirSync(targetDir, { recursive: true });
  const out = join(targetDir, `medyatra-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
  if (existsSync(DB_PATH)) copyFileSync(DB_PATH, out);
  return out;
}
