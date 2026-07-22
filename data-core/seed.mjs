// Seed the data core with the REAL data produced so far (markets, categories, pricing,
// fit matrix, partners, POCs, content assets, the worked proposal). Idempotent: clears + reloads.
// Run:  node --experimental-sqlite data-core/seed.mjs
import { open, scoreOf, oppOf, j } from "./db.mjs";

const db = open();
const RETRIEVED = "2026-07-03";
const CITE = "aggregated hospital/aggregator pricing — see /build-os/08_DATA_SOURCES.md";

// wipe. FK enforcement off during the reset so newer child tables (channel_post, comms_template, …) that
// reference these can't block the delete regardless of order; the generated tables are cleared too so nothing
// is left orphaned (gen_comms / repurpose rebuild them). Turned back on immediately after.
db.exec("PRAGMA foreign_keys = OFF");
for (const t of ["channel_post","comms_template","lead","content_asset","proposal","poc","partner_category","partner","category_market","category_price","category","market"]) {
  try { db.exec(`DELETE FROM ${t};`); } catch { /* table may not exist in an older schema */ }
}
db.exec("PRAGMA foreign_keys = ON");

// ---- markets (focus: Middle East, Africa, Europe, SE Asia; no Bangladesh) ----
const markets = [
  ["IQ","Iraq","middle_east","A",["ar","en"],1,"IQD",["whatsapp","youtube","facebook","seo"],"e-medical-visa",["DPDP_IN"],["ar"],["Baghdad","Erbil","Basra"],"lead corridor"],
  ["OM","Oman","middle_east","A",["ar","en"],1,"OMR",["whatsapp","youtube","seo"],"e-medical-visa",["DPDP_IN"],["ar"],["Muscat"],""],
  ["YE","Yemen","middle_east","A",["ar","en"],1,"YER",["whatsapp","facebook"],"e-medical-visa",["DPDP_IN"],["ar"],["Sanaa","Aden"],""],
  ["AE","United Arab Emirates","middle_east","B",["ar","en"],1,"AED",["instagram","whatsapp","seo"],"e-medical-visa",["DPDP_IN"],["ar"],["Dubai","Abu Dhabi"],"value/electives"],
  ["SA","Saudi Arabia","middle_east","B",["ar","en"],1,"SAR",["whatsapp","youtube","seo"],"e-medical-visa",["DPDP_IN"],["ar"],["Riyadh","Jeddah"],""],
  ["NG","Nigeria","africa","B",["en"],0,"NGN",["whatsapp","facebook","youtube","seo"],"e-medical-visa",["DPDP_IN"],["en"],["Lagos","Abuja"],"English content track. Sachin Rai ranking, 2026-07-22: #2 of top 5"],
  ["KE","Kenya","africa","B",["en","sw"],0,"KES",["whatsapp","facebook","seo"],"e-medical-visa",["DPDP_IN"],["en","sw"],["Nairobi"],"Sachin Rai ranking, 2026-07-22: #3 of top 5"],
  ["ET","Ethiopia","africa","B",["am","en"],0,"ETB",["whatsapp","facebook"],"e-medical-visa",["DPDP_IN"],["am"],["Addis Ababa"],"Sachin Rai ranking, 2026-07-22: #1 of top 5"],
  ["SD","Sudan","africa","B",["ar","en"],1,"SDG",["whatsapp","facebook"],"e-medical-visa",["DPDP_IN"],["ar"],["Khartoum"],"Sachin Rai, 2026-07-22: named possible extension beyond the top 5"],
  // Sachin Rai's ranked top-5 target markets (2026-07-22 interview), added at Tier B pending a deliberate
  // decision on whether to re-tier above the existing Middle East Tier A (see PROJECT_CONTEXT.md/BUSINESS_STATUS.md).
  ["TZ","Tanzania","africa","B",["sw","en"],0,"TZS",["whatsapp","facebook","seo"],"e-medical-visa",["DPDP_IN"],["sw","en"],["Dar es Salaam"],"Sachin Rai ranking, 2026-07-22: #4 of top 5"],
  ["ZM","Zambia","africa","B",["en"],0,"ZMK",["whatsapp","facebook"],"e-medical-visa",["DPDP_IN"],["en"],["Lusaka"],"Sachin Rai ranking, 2026-07-22: part of the #5 Zambia/Zimbabwe/Namibia cluster"],
  ["ZW","Zimbabwe","africa","B",["en"],0,"USD",["whatsapp","facebook"],"e-medical-visa",["DPDP_IN"],["en"],["Harare"],"Sachin Rai ranking, 2026-07-22: part of the #5 Zambia/Zimbabwe/Namibia cluster"],
  ["NA","Namibia","africa","B",["en"],0,"NAD",["whatsapp","facebook"],"e-medical-visa",["DPDP_IN"],["en"],["Windhoek"],"Sachin Rai ranking, 2026-07-22: part of the #5 Zambia/Zimbabwe/Namibia cluster"],
  ["CM","Cameroon","africa","C",["fr","en"],0,"XAF",["whatsapp","facebook"],"e-medical-visa",["DPDP_IN"],["fr"],["Yaounde","Douala"],"Sachin Rai, 2026-07-22: possible extension, not core top-5 — Francophone, Telegram-first per the same interview, not yet reflected in the WhatsApp-only comms engine"],
  ["MM","Myanmar","se_asia","C",["my","en"],0,"MMK",["facebook","whatsapp"],"e-medical-visa",["DPDP_IN"],["my"],["Yangon"],"SE Asia diversification"],
  ["GB","United Kingdom","europe","D",["en"],0,"GBP",["seo","youtube","instagram"],"e-medical-visa",["DPDP_IN","UK_GDPR"],["en"],["London"],"high-margin electives"],
  ["IE","Ireland","europe","D",["en"],0,"EUR",["seo","instagram"],"e-medical-visa",["DPDP_IN","GDPR"],["en"],["Dublin"],"high-margin electives"],
];
const mStmt = db.prepare(`INSERT INTO market (code,name,region,tier,languages,rtl,currency,primary_channels,visa_regime,regulatory,interpreter_langs,feeder_hubs,status,notes)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'planned', ?)`);
for (const [c,n,r,t,langs,rtl,cur,ch,visa,reg,intl,hubs,notes] of markets)
  mStmt.run(c,n,r,t,j(langs),rtl,cur,j(ch),visa,j(reg),j(intl),j(hubs),notes);

// ---- categories (factors 1-5 from /build-os/03; score computed by model weights) ----
const cats = [
  ["cardiac","Cardiac","CABG · valve · angioplasty",{cost_arb:5,quality:5,ease:3,demand:5,margin:5,whitespace:2}],
  ["ortho","Orthopedics","knee · hip · spine",{cost_arb:5,quality:5,ease:4,demand:5,margin:4,whitespace:2}],
  ["oncology","Oncology","surgical · medical · BMT",{cost_arb:5,quality:4,ease:3,demand:5,margin:5,whitespace:3}],
  ["fertility","Fertility / IVF","IVF · ICSI",{cost_arb:4,quality:4,ease:5,demand:4,margin:3,whitespace:3}],
  ["cosmetic","Cosmetic & bariatric","aesthetic · bariatric",{cost_arb:4,quality:4,ease:5,demand:4,margin:4,whitespace:3}],
  ["dental","Dental","implants · full-mouth",{cost_arb:5,quality:4,ease:5,demand:4,margin:2,whitespace:4}],
];
const scored = cats.map(([id,name,sub,f]) => ({ id,name,sub,f,score:scoreOf(f) }))
  .sort((a,b) => b.score - a.score);
const cStmt = db.prepare(`INSERT INTO category (id,name,subtypes,status,cost_arb,quality,ease,demand,margin,whitespace,score,rank,flagship)
  VALUES (?,?,?, 'launch', ?,?,?,?,?,?,?,?, 0)`);
scored.forEach((c, i) => cStmt.run(c.id,c.name,c.sub,c.f.cost_arb,c.f.quality,c.f.ease,c.f.demand,c.f.margin,c.f.whitespace,c.score,i+1));
// T013 decision: accept model rank, but keep Cardiac as brand/deal-size flagship.
db.prepare(`UPDATE category SET flagship=1 WHERE id='cardiac'`).run();
// NOTE: Ophthalmology was evaluated and DROPPED (2026-07). Eye is a low-ticket, follow-up-heavy,
// locally-deliverable category — arbitrage is real in % but thin in absolute $ after travel, and the
// category leader (Dr Agarwal's) validated the opposite model (250+ clinics, incl. 9 African source
// markets). See 03_TREATMENT_CATEGORY_STRATEGY.md. Wedges are Dental + Cosmetic + Fertility.

// ---- pricing anchors ----
const prices = [
  ["cardiac","CABG (bypass)",5000,9000,"US $90k–120k · UK £15k–30k"],
  ["cardiac","Valve replacement",4500,7000,"US $80k–150k"],
  ["cardiac","Angioplasty (1 stent)",3500,5000,"US $28k–60k"],
  ["ortho","Total knee replacement",3500,6500,"US ~$49k · UK £15k–21k"],
  ["ortho","Hip replacement",4200,7000,"US $40k+"],
  ["oncology","BMT (autologous)",14000,22000,"US $150k–400k"],
  ["oncology","BMT (allogeneic matched)",22000,28000,"US $300k–800k"],
  ["fertility","IVF (per cycle)",2500,5000,"US $12k–20k · UK ~£5k"],
  ["cosmetic","Gastric sleeve/bypass",4000,7000,"US $20k–25k"],
  ["dental","Single implant",500,950,"UK £2,000–3,000"],
  ["dental","Full-mouth restoration",4800,9500,"UK £15k–40k"],
];
const pStmt = db.prepare(`INSERT INTO category_price (category_id,procedure,india_low,india_high,comparator,indicative,source_cite,retrieved)
  VALUES (?,?,?,?,?,1,?,?)`);
for (const [cat,proc,lo,hi,cmp] of prices) pStmt.run(cat,proc,lo,hi,cmp,CITE,RETRIEVED);

// ---- category <-> market fit matrix ----
const fit = {
  cardiac:["IQ","OM","YE","NG","KE","ET"], ortho:["OM","KE","NG","MM","GB"],
  oncology:["IQ","ET","SD","KE","MM"], fertility:["OM","AE","SA","NG","GB"],
  cosmetic:["AE","SA","GB","NG","KE"], dental:["GB","IE","AE","KE"],
};
const cmStmt = db.prepare(`INSERT INTO category_market (category_id,market_code,priority) VALUES (?,?,1)`);
for (const [cat, ms] of Object.entries(fit)) for (const m of ms) cmStmt.run(cat, m);

// ---- partners: established chains + UNIT-level rows + LATENT/EMERGING brands (margin play) ----
const APOLLO = "newpatient@apollohospitalinternational.com · +91 80760 36335 (WhatsApp)";
const FORTIS = "info@fortishospitalinternational.com · +91 93183 98592";
const MEDANTA = "internationalservices@medanta.org · +91 95603 98936";
// fields: {id,name,network,city,acc,ch,src,fit,pri,type,parent,presence,cats,notes}
const partners = [
  // -- established chains (fast, known supply; competitive => Low opportunity) --
  {id:"apollo",name:"Apollo Hospitals (chain IPS)",network:"Apollo",city:"Multi-city",acc:"JCI + NABH",ch:APOLLO,src:"apollohospitals.com/international-patient-services",fit:"High",pri:1,type:"chain",presence:"established",cats:["cardiac","ortho","oncology","cosmetic","fertility","dental"]},
  {id:"fortis",name:"Fortis Healthcare (chain IPS)",network:"Fortis",city:"Delhi NCR +",acc:"NABH (JCI units)",ch:FORTIS,src:"fortishealthcare.com/international-patients",fit:"High",pri:1,type:"chain",presence:"established",cats:["cardiac","ortho","oncology","cosmetic"]},
  {id:"medanta",name:"Medanta (chain IPS)",network:"Medanta",city:"Gurugram",acc:"NABH/JCI",ch:MEDANTA,src:"medanta.org/international-patient-help-desk",fit:"High",pri:1,type:"chain",presence:"established",cats:["cardiac","ortho","oncology"]},
  {id:"max",name:"Max Healthcare (chain IPS)",network:"Max",city:"Delhi NCR",acc:"NABH",ch:"IPS Saket · +91-11-26515050",src:"maxhealthcare.in/international",fit:"Med",pri:0,type:"chain",presence:"established",cats:["ortho","cardiac","oncology"]},
  {id:"narayana",name:"Narayana Health",network:"Narayana",city:"Bengaluru +",acc:"JCI Enterprise + NABH",ch:"via network IPS",src:"narayanahealth.org",fit:"High",pri:0,type:"chain",presence:"established",cats:["cardiac","oncology","ortho"]},
  {id:"manipal",name:"Manipal Hospitals",network:"Manipal",city:"Bengaluru +",acc:"NABH",ch:"via network IPS",src:"manipalhospitals.com",fit:"Med",pri:0,type:"chain",presence:"established",cats:["cardiac","ortho","oncology"]},
  {id:"hcg",name:"HCG Oncology",network:"HCG",city:"Bengaluru/Mumbai +",acc:"NABH (specialist)",ch:"via network IPS",src:"hcgoncology.com",fit:"High",pri:1,type:"chain",presence:"established",cats:["oncology"]},
  {id:"kokilaben",name:"Kokilaben Dhirubhai Ambani",network:"Independent",city:"Mumbai",acc:"JCI + NABH",ch:"via IPS",src:"kokilabenhospital.com",fit:"Med",pri:0,type:"standalone",presence:"established",cats:["oncology","cosmetic"]},
  {id:"nova-ivf",name:"Nova IVF Fertility",network:"Nova",city:"Pan-India",acc:"NABH clinics",ch:"via chain IPS",src:"novaivffertility.com",fit:"High",pri:1,type:"chain",presence:"established",cats:["fertility"]},
  {id:"indira-ivf",name:"Indira IVF",network:"Indira",city:"Pan-India",acc:"NABH clinics",ch:"via chain IPS",src:"indiraivf.com",fit:"High",pri:0,type:"chain",presence:"established",cats:["fertility"]},
  {id:"cloudnine",name:"Cloudnine",network:"Cloudnine",city:"Metro",acc:"NABH",ch:"via IPS",src:"cloudninecare.com",fit:"Med",pri:0,type:"chain",presence:"emerging",cats:["fertility"]},
  {id:"premium-dental",name:"Premium implant clinics (verify)",network:"Various",city:"Metro",acc:"verify individually",ch:"resolve per clinic",src:"-",fit:"High",pri:0,type:"standalone",presence:"emerging",cats:["dental"]},

  // -- UNIT / location-level rows (parent -> chain); POC = the desk head AT the hospital --
  {id:"apollo-chennai",name:"Apollo — Greams Road, Chennai (unit)",network:"Apollo",city:"Chennai",acc:"JCI + NABH",ch:"infochennai@apollohospitals.com · +91 4043441066 · /international-patient-services/hospital/chennai/",src:"apollohospitals.com (Chennai IPS page)",fit:"High",pri:1,type:"unit",parent:"apollo",presence:"established",cats:["cardiac","oncology","ortho"],notes:"flagship unit — resolve unit IPS head (name)"},
  {id:"fortis-mumbai",name:"Fortis — Mulund, Mumbai (unit)",network:"Fortis",city:"Mumbai",acc:"NABH",ch:"via Fortis IPS (unit desk)",src:"fortishealthcare.com",fit:"High",pri:0,type:"unit",parent:"fortis",presence:"established",cats:["cardiac","oncology","ortho"],notes:"resolve unit IPS head"},
  {id:"medanta-gurugram",name:"Medanta — The Medicity, Gurugram (unit)",network:"Medanta",city:"Gurugram",acc:"NABH/JCI",ch:"via Medanta IPS (unit desk)",src:"medanta.org",fit:"High",pri:0,type:"unit",parent:"medanta",presence:"established",cats:["cardiac","oncology","ortho"],notes:"resolve unit IPS head"},

  // -- LATENT / EMERGING high-quality brands: the MARGIN PLAY (est — verify accreditation + presence) --
  {id:"artemis",name:"Artemis Hospital, Gurgaon",network:"Artemis",city:"Gurgaon",acc:"JCI + NABH",ch:"resolve IPS",src:"first JCI+NABH in Gurgaon (accreditation lists)",fit:"High",pri:1,type:"standalone",presence:"emerging",cats:["cardiac","ortho","oncology"],notes:"strong quality, growing MVT — good terms"},
  {id:"marengo",name:"Marengo Asia Hospitals",network:"Marengo",city:"Faridabad / Gujarat",acc:"JCI + NABH + NABL",ch:"resolve IPS",src:"accreditation lists",fit:"High",pri:1,type:"emerging",presence:"emerging",cats:["cardiac","ortho","oncology"],notes:"consolidating multi-site brand; MVT emerging"},
  {id:"ganga-ram",name:"Sir Ganga Ram Hospital",network:"SGRH",city:"New Delhi",acc:"NABH (verify JCI)",ch:"resolve IPS",src:"sgrh.com; serves SE Asia (medical-tourism reviews)",fit:"High",pri:1,type:"standalone",presence:"latent",cats:["cardiac","oncology","ortho"],notes:"675-bed, highly respected, low MVT aggression — HIGH opportunity"},
  {id:"hinduja",name:"P. D. Hinduja Hospital",network:"Hinduja",city:"Mumbai",acc:"NABH (verify)",ch:"resolve IPS",src:"est — verify",fit:"High",pri:0,type:"standalone",presence:"latent",cats:["cardiac","oncology","ortho"],notes:"reputed; low MVT aggression — est/verify"},
  {id:"sakra-world",name:"Sakra World Hospital",network:"Sakra",city:"Bengaluru",acc:"NABH (verify)",ch:"resolve IPS",src:"est — verify",fit:"High",pri:0,type:"standalone",presence:"emerging",cats:["cardiac","ortho","oncology"],notes:"Toyota/Secom JV; quality brand — est/verify"},
  {id:"frontier-lifeline",name:"Frontier Lifeline Hospital",network:"Frontier",city:"Chennai",acc:"cardiac specialty (verify)",ch:"resolve IPS",src:"est — verify",fit:"High",pri:0,type:"standalone",presence:"latent",cats:["cardiac"],notes:"cardiac specialty (Dr K M Cherian) — est/verify"},
  {id:"cytecare",name:"Cytecare Cancer Hospital",network:"Cytecare",city:"Bengaluru",acc:"oncology specialty (verify)",ch:"resolve IPS",src:"est — verify",fit:"High",pri:0,type:"standalone",presence:"latent",cats:["oncology"],notes:"dedicated onco brand — est/verify"},
];
const paStmt = db.prepare(`INSERT INTO partner (id,name,network,city,accreditation,ips_channel_public,ips_source,fit,stage,priority,type,parent_id,mvt_presence,opportunity,notes)
  VALUES (?,?,?,?,?,?,?,?, 'Enriched', ?,?,?,?,?,?)`);
const pcStmt = db.prepare(`INSERT INTO partner_category (partner_id,category_id) VALUES (?,?)`);
const pocStmt = db.prepare(`INSERT INTO poc (partner_id,title_target,person_name,channel_public,source,resolved) VALUES (?,?,?,?,?,0)`);
for (const p of partners) {
  paStmt.run(p.id,p.name,p.network,p.city,p.acc,p.ch,p.src,p.fit,p.pri,p.type,p.parent??null,p.presence,oppOf(p.fit,p.presence),p.notes??null);
  for (const c of p.cats) pcStmt.run(p.id, c);
  const title = p.type === "unit"
    ? `Head – International Patient Desk — ${p.city} (unit-level)`
    : "Head – International Patient Services";
  pocStmt.run(p.id, title, null, p.ch, p.src); // person_name null until resolved
}

// ---- content assets (the 4 cornerstone pages drafted) ----
const content = [
  ["cardiac","NG","en","Heart Bypass Surgery Cost in India for Patients from Nigeria","outputs/content/heart-bypass-cost-india-nigeria.md",1],
  ["ortho","OM","en","Knee Replacement Cost in India for Patients from Oman","outputs/content/knee-replacement-cost-india-oman.md",1],
  ["fertility","AE","en","IVF Cost in India for Patients from the UAE","outputs/content/ivf-cost-india-uae.md",1],
  ["dental","GB","en","Dental Implants & Full-Mouth in India — UK Cost Guide","outputs/content/dental-implants-india-uk.md",1],
];
const coStmt = db.prepare(`INSERT INTO content_asset (category_id,market_code,language,title,file_ref,status,cta_wired,citations_ok)
  VALUES (?,?,?,?,?, 'draft', 0, ?)`);
for (const [cat,mkt,lang,title,file,cites] of content) coStmt.run(cat,mkt,lang,title,file,cites);

// ---- proposal (the worked example) ----
db.prepare(`INSERT INTO proposal (partner_id,category_id,market_code,fee_pct,status,file_ref,blockers)
  VALUES ('apollo','cardiac','IQ',12,'review','outputs/02_proposal-template.md','named POC; live package sheet; legal on 12%/net-15')`).run();

const n = (t) => db.prepare(`SELECT count(*) c FROM ${t}`).get().c;
console.log("Seeded:", ["market","category","category_price","category_market","partner","partner_category","poc","content_asset","proposal"]
  .map(t => `${t}=${n(t)}`).join("  "));
db.close();
