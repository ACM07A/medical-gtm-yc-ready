import React, { useState } from 'react';
import doctorPatientHeroImg from '../assets/images/doctor_patient_clean_1785144762895.jpg';
const founderHussainImg = '/landing-assets/hussain.jpg';
const founderAjeyaImg = '/landing-assets/ajeya.jpg';
import {
  Sparkles,
  ArrowRight,
  Play,
  CheckCircle2,
  Building2,
  Users,
  ShieldCheck,
  Globe2,
  FileText,
  Layers,
  Bot,
  UserCheck,
  Clock,
  ArrowDown,
  Check,
  X,
  ExternalLink,
  Laptop,
  Cpu,
  Database,
  Workflow,
  Network,
  Lock,
  AlertCircle,
  MessageSquare,
  Send,
  FileSpreadsheet,
  Mail,
  ChevronRight,
  Plane,
  Stethoscope,
  ListOrdered,
  Linkedin,
  MapPin,
  Phone
} from 'lucide-react';

interface YCLandingPageProps {
  onOpenInteractiveDemo: () => void;
  theme?: 'dark' | 'light';
}

export function YCLandingPage({ onOpenInteractiveDemo, theme = 'light' }: YCLandingPageProps) {
  const [activeVideoModal, setActiveVideoModal] = useState(false);
  const [activeDemoStep, setActiveDemoStep] = useState<number>(1);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    role: 'Hospital Representative',
    message: ''
  });
  const isDark = theme === 'dark';

  return (
    <div className={`font-sans selection:bg-[#0FB8A6]/20 selection:text-[#0FB8A6] transition-colors duration-300 ${isDark ? 'bg-[#070F1E] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>

      {/* =========================================================================
          SECTION 1: HERO SECTION
          ========================================================================= */}
      <section className={`relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b transition-colors duration-300 overflow-hidden ${isDark ? 'bg-[#0B172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>

        {/* Subtle Background Radial Accent */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-teal-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto space-y-10 relative z-10">

          {/* Top Hero Row: Left Text + Right Doctor-Patient Image */}
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center text-left">

            {/* Left Column: Word / Content Part */}
            <div className="lg:col-span-7 space-y-6">

              {/* Top Pill Badge */}
              <div className="flex justify-start">
                <a href="#yc-application" className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-slate-100 text-xs font-mono font-medium shadow-xs border border-slate-800 hover:border-teal-600 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-[#0FB8A6] animate-pulse" />
                  <span>CANOPUS CARE</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-[#FF6600] font-semibold flex items-center gap-1">
                    YC Application Deck <ArrowRight className="w-3 h-3" />
                  </span>
                </a>
              </div>

              {/* Main Headline */}
              <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans'] leading-[1.12] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Coordinate international patient cases from enquiry to hospital acceptance.
              </h1>

              {/* Precise Subheadline */}
              <p className={`text-base sm:text-lg font-sans leading-relaxed font-normal ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Canopus Care helps medical-travel coordinators collect records, coordinate hospitals, manage documents, automate administrative workflows and prepare patients for treatment, while clinicians remain responsible for medical decisions.
              </p>

              {/* Three Key Value Pills */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-[#0D9488] border border-teal-200/80 text-xs font-mono font-semibold">
                  <Check className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>AI-assisted workflow</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-[#0D9488] border border-teal-200/80 text-xs font-mono font-semibold">
                  <Check className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Hospital coordination</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-[#0D9488] border border-teal-200/80 text-xs font-mono font-semibold">
                  <Check className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Administrative automation</span>
                </div>
              </div>

              {/* Primary & Secondary Call to Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-start gap-4 pt-2">
                <button
                  onClick={onOpenInteractiveDemo}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-mono text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-teal-700/15 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Laptop className="w-4 h-4" />
                  <span>Open Interactive Demo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setActiveVideoModal(true)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Play className="w-4 h-4 fill-current text-[#FF6600]" />
                  <span>Watch product walkthrough</span>
                </button>
              </div>

            </div>

            {/* Right Column: Doctor-Patient Image with Floating Infographic Markers in Corners */}
            <div className="lg:col-span-5 relative flex flex-col items-stretch justify-center gap-2 p-0 sm:block sm:p-4">

              {/* Main Image Container */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100 bg-white group w-full">
                <img
                  src={doctorPatientHeroImg}
                  alt="Doctor consulting patient"
                  className="w-full h-auto object-cover max-h-[440px] sm:max-h-[480px] transition-transform duration-500 group-hover:scale-[1.01]"
                  referrerPolicy="no-referrer"
                />

                {/* Subtle gradient vignette at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating Infographic Marker 1: Corridor (Top-Left Corner) */}
              <div className="relative sm:absolute sm:-top-4 sm:-left-6 w-full sm:w-auto min-w-0 bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-md sm:shadow-xl border border-slate-200/90 flex items-center gap-2.5 z-20 transition-all sm:hover:scale-105">
                <div className="p-2 rounded-xl bg-teal-50 text-[#0D9488]">
                  <Globe2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-left font-sans">
                  <div className="text-[11px] font-extrabold text-slate-900 leading-tight">
                    Ethiopia → India Corridor
                  </div>
                  <div className="text-[10px] font-mono text-teal-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
                    Case #CC-8492 Active
                  </div>
                </div>
              </div>

              {/* Floating Infographic Marker 2: Medical Visa & Quotes (Top-Right Corner) */}
              <div className="relative sm:absolute sm:-top-4 sm:-right-6 w-full sm:w-auto min-w-0 bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-md sm:shadow-xl border border-slate-200/90 flex items-center gap-2.5 z-20 transition-all sm:hover:scale-105">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-left font-sans">
                  <div className="text-[11px] font-extrabold text-slate-900 leading-tight">
                    Illustrative estimate set
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 font-semibold">
                    Demo data · not a live quote
                  </div>
                </div>
              </div>

              {/* Floating Infographic Marker 3: Structured Records (Bottom-Left Corner) */}
              <div className="relative sm:absolute sm:-bottom-4 sm:-left-6 w-full sm:w-auto min-w-0 bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-md sm:shadow-xl border border-slate-200/90 flex items-center gap-2.5 z-20 transition-all sm:hover:scale-105">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-left font-sans">
                  <div className="text-[11px] font-extrabold text-slate-900 leading-tight">
                    Structured Records
                  </div>
                  <div className="text-[10px] font-mono text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Translated & Consent Signed
                  </div>
                </div>
              </div>

              {/* Floating Infographic Marker 4: Human Approval Gate (Bottom-Right Corner) */}
              <div className="relative sm:absolute sm:-bottom-4 sm:-right-6 w-full sm:w-auto min-w-0 bg-slate-900 text-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-md sm:shadow-2xl border border-slate-800 flex items-center gap-2.5 z-20 transition-all sm:hover:scale-105">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-left font-sans">
                  <div className="text-[11px] font-extrabold text-amber-400 leading-tight">
                    Human Approval Gate
                  </div>
                  <div className="text-[10px] font-mono text-slate-300">
                    Coordinator Dispatch Ready
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Above The Fold: 4 KPI Cards */}
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-left">
            <div className="min-w-0 p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xl sm:text-2xl leading-tight break-words font-black font-mono text-[#0D9488]">Reusable</div>
              <div className="text-xs font-bold text-slate-900">Workflow Blueprints</div>
              <div className="text-[11px] text-slate-500 line-clamp-1">Stage & task state trees</div>
            </div>

            <div className="min-w-0 p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xl sm:text-2xl leading-tight break-words font-black font-mono text-[#0D9488]">Deterministic</div>
              <div className="text-xs font-bold text-slate-900">AI Execution Agents</div>
              <div className="text-[11px] text-slate-500 line-clamp-1">Human-gated extraction</div>
            </div>

            <div className="min-w-0 p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xl sm:text-2xl leading-tight break-words font-black font-mono text-[#0D9488]">2</div>
              <div className="text-xs font-bold text-slate-900">Primary User Roles</div>
              <div className="text-[11px] text-slate-500 line-clamp-1">Coordinators & Hospital Desk</div>
            </div>

            <div className="min-w-0 p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xl sm:text-2xl leading-tight break-words font-black font-mono text-[#0D9488]">End-to-End</div>
              <div className="text-xs font-bold text-slate-900">Patient Timeline</div>
              <div className="text-[11px] text-slate-500 line-clamp-1">Audit log intake to post-op</div>
            </div>
          </div>

          {/* =========================================================================
              EXACT PRODUCT CONSOLE UI MOCKUP WINDOW (As requested)
              ========================================================================= */}
          <div className="pt-8 text-left">
            <div className="rounded-2xl border border-slate-800 shadow-2xl overflow-hidden bg-[#091322] transition-all">

              {/* Console Window Top Header Bar */}
              <div className="bg-[#091322] border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="font-mono text-xs sm:text-sm text-slate-200 font-semibold tracking-tight">
                    Canopus Care • End-to-End Care Facilitation Console
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Human Approval Gate: Active
                  </span>
                  <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded text-[11px]">
                    v1.2 Sandbox
                  </span>
                </div>
              </div>

              {/* Console Body Canvas with subtle grid paper styling */}
              <div className="bg-[#F0F4F8] p-4 sm:p-6 text-slate-900 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:16px_16px]">
                <div className="grid lg:grid-cols-12 gap-5 items-stretch">

                  {/* Column 1: Patient Case Card */}
                  <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
                          CASE ID #CC-8492
                        </span>
                        <span className="px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 font-mono text-xs font-semibold">
                          In Review
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
                        Cardiac Surgery Referral
                      </h3>

                      <div className="space-y-2 text-xs font-sans text-slate-600 pt-1">
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-400">Patient Country:</span>
                          <span className="font-bold text-slate-900">Ethiopia (Addis Ababa)</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-400">Diagnosis:</span>
                          <span className="font-bold text-slate-900">Triple Vessel CAD / CABG</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-400">Records Status:</span>
                          <span className="font-bold text-emerald-700">Structured & Translated</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Consent Verified:</span>
                          <span className="font-bold text-emerald-700">Yes (Digital Signed)</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                      <div className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        STRUCTURED HISTORY SUMMARY
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans line-clamp-3">
                        54yo male with chest pain. Angiogram reveals 85% LAD stenosis. Requires urgent CABG evaluation in accredited center.
                      </p>
                    </div>
                  </div>

                  {/* Column 2: Hospital Responses & Estimates */}
                  <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
                        <Building2 className="w-4 h-4 text-[#0D9488]" />
                        <span>Hospital Responses & Estimates</span>
                      </div>
                      <span className="font-mono text-xs text-slate-400">2 Quotes Received</span>
                    </div>

                    {/* Fictional demonstration estimate */}
                    <div className="border-2 border-emerald-400/90 bg-emerald-50/20 rounded-xl p-4 space-y-2 shadow-2xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-900 text-sm">Meridian Cardiac Institute (demo)</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">Indicative only</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        Includes 7-day inpatient, CABG procedure, ICU stay, and surgeon fee.
                      </p>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          ✓ Medical Visa Letter (MIL) Ready
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">Est. Stay: 12 days</span>
                      </div>
                    </div>

                    {/* Fictional demonstration estimate */}
                    <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-900 text-sm">Northstar Heart Centre (demo)</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">Indicative only</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        Includes full cardiac team evaluation, surgery, and cardiac rehab.
                      </p>
                    </div>
                  </div>

                  {/* Column 3: Human Approval Gate */}
                  <div className="lg:col-span-3 bg-[#0B1528] rounded-2xl p-5 border border-slate-800 text-white shadow-md flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-extrabold tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span>HUMAN APPROVAL REQUIRED</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        Review official estimate comparison & hospital visa letter before dispatching to patient in Ethiopia.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <button
                        onClick={onOpenInteractiveDemo}
                        className="w-full py-3 px-4 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl font-sans text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                      >
                        <span>Approve & Send to Patient</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="text-center font-mono text-[10px] text-slate-400 pt-1">
                        Action logged • Coordinator ID: #COORD-04
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 2: WHO USES CANOPUS CARE? (3 PERSONA COLUMNS)
          ========================================================================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto space-y-10">

          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold text-[#0D9488] uppercase tracking-wider bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/20">
              User Personas
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              Who uses Canopus Care?
            </h2>
            <p className="text-slate-600 text-sm max-w-2xl mx-auto">
              Purpose-built interfaces connecting all stakeholders in cross-border healthcare travel.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">

            {/* Persona 1: Medical Travel Agent / Coordinator */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:border-teal-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0D9488] border border-teal-200/60 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-[#0D9488] uppercase tracking-wider">Primary User</span>
                <h3 className="text-lg font-bold text-slate-900">Medical Travel Coordinator</h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                  <span>Structured patient intake & document collation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                  <span>Multilingual WhatsApp & email intake translation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                  <span>Dispatching consented cases to selected hospital teams</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                  <span>Medical Visa & travel logistics orchestration</span>
                </li>
              </ul>
            </div>

            {/* Persona 2: Hospital International Desk */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:border-indigo-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-wider">Partner Desk</span>
                <h3 className="text-lg font-bold text-slate-900">Hospital International Desk</h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Receiving structured patient referral summaries</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Issuing hospital-reviewed estimates & stay guidance</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Doctor assignment & appointment scheduling</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>Preparing hospital-issued visa support documents</span>
                </li>
              </ul>
            </div>

            {/* Persona 3: Patient & Family */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 hover:border-emerald-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center font-bold">
                <Globe2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-wider">End Beneficiary</span>
                <h3 className="text-lg font-bold text-slate-900">Patient & Family</h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Secure upload portal for medical records & scans</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Transparent timeline tracking across all stages</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Comparing hospital estimates in native language</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Interactive travel, flight, and stay checklists</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 3: PROBLEM vs SOLUTION DIAGRAM
          ========================================================================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-slate-50/70">
        <div className="max-w-6xl mx-auto space-y-12">

          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold text-[#0D9488] uppercase tracking-wider bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/20">
              The Problem We Solve
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              From fragmented chaos to a single unified workflow
            </h2>
            <p className="text-slate-600 text-sm max-w-2xl mx-auto">
              Today, cross-border care travels across disconnected apps, resulting in lost records and week-long delays. Canopus Care standardizes the entire case cycle.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">

            {/* Box A: Today's Fragmented Reality */}
            <div className="min-w-0 p-4 sm:p-6 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-3 mb-4">
                  <span className="text-xs font-mono font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Today's Fragmented Workflow
                  </span>
                  <span className="text-[10px] font-mono text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">High Delay & Error</span>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-rose-50/50 text-[11px] sm:text-xs font-mono text-rose-900 border border-rose-100">
                    <span className="font-bold">Patient Inquiry</span>
                    <ArrowRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <MessageSquare className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>WhatsApp</span>
                    <ArrowRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <Mail className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Email</span>
                    <ArrowRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>PDF Scans</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-rose-50/50 text-[11px] sm:text-xs font-mono text-rose-900 border border-rose-100">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Excel Sheets</span>
                    <ArrowRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <Building2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Hospitals</span>
                    <ArrowRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <Users className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Travel Agent</span>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-rose-50/80 border border-rose-200 space-y-2">
                  <div className="text-xs font-bold text-rose-950">Critical Bottlenecks:</div>
                  <ul className="space-y-1.5 text-xs text-rose-800">
                    <li className="flex items-center gap-2">• Lost medical histories in unindexed WhatsApp threads</li>
                    <li className="flex items-center gap-2">• Manual translation errors delaying treatment quotes</li>
                    <li className="flex items-center gap-2">• No audit trail for Medical Visa & flight confirmation</li>
                  </ul>
                </div>
              </div>

              <div className="text-[11px] font-mono text-rose-700 font-bold text-center bg-rose-100/60 py-2 rounded-lg">
                Turnaround varies by records, hospital review, and case complexity
              </div>
            </div>

            {/* Box B: Canopus Care Single Workflow */}
            <div className="min-w-0 p-4 sm:p-6 rounded-2xl bg-[#0A1626] text-white border border-teal-500/30 shadow-md space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
                  <span className="text-xs font-mono font-bold text-[#0FB8A6] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0FB8A6]" />
                    Canopus Care Workflow
                  </span>
                  <span className="text-[10px] font-mono text-[#0FB8A6] font-bold bg-teal-500/20 px-2 py-0.5 rounded border border-teal-500/30">Single Unified System</span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)] items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] sm:text-xs font-mono text-slate-200">
                    <span className="min-w-0 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#0FB8A6]" />
                      Patient Upload
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-teal-500" />
                    <span className="min-w-0 break-words text-[#0FB8A6] font-bold">Structured Record Engine</span>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)] items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] sm:text-xs font-mono text-slate-200">
                    <span className="min-w-0 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[#0FB8A6]" />
                      AI Extraction
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-teal-500" />
                    <span className="min-w-0 break-words text-white font-bold">Coordinator Human Gating</span>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)] items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] sm:text-xs font-mono text-slate-200">
                    <span className="min-w-0 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#0FB8A6]" />
                      Hospital Desk
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-teal-500" />
                    <span className="min-w-0 break-words text-emerald-400 font-bold">Hospital Estimate & Visa Support</span>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-white">Platform Advantages:</div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2 text-emerald-400">✓ Automatic OCR & multilingual report structuring</li>
                    <li className="flex items-center gap-2 text-emerald-400">✓ Multi-hospital side-by-side estimate generator</li>
                    <li className="flex items-center gap-2 text-emerald-400">✓ Timestamped audit log & status tracking</li>
                  </ul>
                </div>
              </div>

              <div className="text-[11px] font-mono text-[#0FB8A6] font-bold text-center bg-teal-500/10 py-2 rounded-lg border border-teal-500/20">
                Structured handoffs reduce avoidable administrative delay
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 4: PRODUCT SUITE & PORTALS
          ========================================================================= */}
      <section id="products" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto space-y-12">

          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold text-[#0D9488] uppercase tracking-wider bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/20">
              Product Suite
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              Three connected product portals
            </h2>
            <p className="text-slate-600 text-base max-w-2xl mx-auto">
              Every stakeholder sees the exact views and data required for their specific role in the care journey.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">

            {/* Product 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#0FB8A6]" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Patient & Family Portal</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Simple portal for uploading supported records, comparing illustrative estimates, and viewing flight and visa checklists.
                </p>
              </div>
              <button
                onClick={onOpenInteractiveDemo}
                className="text-xs font-mono font-bold text-[#0D9488] flex items-center gap-1 hover:underline pt-2 border-t border-slate-200"
              >
                <span>Launch Patient Portal View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Product 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#0FB8A6]" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Hospital Partner Desk</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Referral portal for international departments to review structured case summaries, coordinate clinical review, and prepare hospital-issued visa support.
                </p>
              </div>
              <button
                onClick={onOpenInteractiveDemo}
                className="text-xs font-mono font-bold text-[#0D9488] flex items-center gap-1 hover:underline pt-2 border-t border-slate-200"
              >
                <span>Launch Hospital Desk View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Product 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#0FB8A6]" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Coordinator Command Center</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Master control room for medical travel facilitators to approve AI extractions, track multi-hospital bids, and monitor patient arrival logistics.
                </p>
              </div>
              <button
                onClick={onOpenInteractiveDemo}
                className="text-xs font-mono font-bold text-[#0D9488] flex items-center gap-1 hover:underline pt-2 border-t border-slate-200"
              >
                <span>Launch Command Center View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 5: HOW IT WORKS (4 CORE STEPS)
          ========================================================================= */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-slate-50/70">
        <div className="max-w-6xl mx-auto space-y-12">

          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold text-[#0D9488] uppercase tracking-wider bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/20">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              Four streamlined workflow stages
            </h2>
            <p className="text-slate-600 text-base max-w-2xl mx-auto">
              Automating administrative burden while giving human coordinators full supervisory control.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs relative">
              <div className="text-xs font-mono font-bold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-md inline-block border border-teal-200/60">
                STAGE 01
              </div>
              <h3 className="text-lg font-bold text-slate-900">1. Intake</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Patient uploads medical reports, lab scans, or WhatsApp messages. AI OCR extracts key parameters into a structured record.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs relative">
              <div className="text-xs font-mono font-bold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-md inline-block border border-teal-200/60">
                STAGE 02
              </div>
              <h3 className="text-lg font-bold text-slate-900">2. AI Review</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Coordinator reviews AI summary, verifies missing reports, and confirms consent before dispatching case to hospitals.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs relative">
              <div className="text-xs font-mono font-bold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-md inline-block border border-teal-200/60">
                STAGE 03
              </div>
              <h3 className="text-lg font-bold text-slate-900">3. Hospital Desk</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hospital International Desks review clinical history, issue formal treatment quotes, and assign lead specialists.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs relative">
              <div className="text-xs font-mono font-bold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-md inline-block border border-teal-200/60">
                STAGE 04
              </div>
              <h3 className="text-lg font-bold text-slate-900">4. Travel Prep</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Coordinators track hospital-issued visa support, arrival pickup, and admission preparation.
              </p>
            </div>

          </div>

          {/* Horizontal Timeline Bar */}
          <div className="p-6 rounded-2xl bg-[#0A1626] text-white border border-slate-800 space-y-4">
            <div className="text-xs font-mono font-bold text-[#0FB8A6] uppercase tracking-wider">
              End-to-End Case Progression Timeline
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 text-center text-[10px] font-mono">
              <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-300">Inquiry</div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-300">Documents</div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[#0FB8A6] font-bold">AI Summary</div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-300">Hospital Match</div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-300">Quote</div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-300">Visa Letter</div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-300">Travel</div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-300">Arrival</div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800 text-emerald-400 font-bold">Follow-up</div>
            </div>
          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 6: AI ASSISTS THE COORDINATOR (ROLE SEPARATION)
          ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto space-y-12">

          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold text-[#0D9488] uppercase tracking-wider bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/20">
              Safety & Responsibility Matrix
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              AI assists the coordinator: humans make decisions
            </h2>
            <p className="text-slate-600 text-base max-w-2xl mx-auto">
              Crucial architectural distinction: AI handles structure, extraction, and administrative automation. Medical decisions remain with qualified hospital clinicians.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">

            {/* Column 1: AI Assistance */}
            <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3">
              <div className="flex items-center gap-2 text-[#0D9488] font-bold text-sm">
                <Bot className="w-4 h-4" />
                <span>AI Agent Role</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-1.5">• Extract text from blurry lab PDFs & scans</li>
                <li className="flex items-start gap-1.5">• Translate French/Arabic into English summaries</li>
                <li className="flex items-start gap-1.5">• Auto-populate missing document checklists</li>
                <li className="flex items-start gap-1.5">• Highlight key diagnostic terms for coordinator</li>
              </ul>
            </div>

            {/* Column 2: Human Coordinator */}
            <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <UserCheck className="w-4 h-4" />
                <span>Human Coordinator</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-1.5">• Verify patient consent and identity</li>
                <li className="flex items-start gap-1.5">• Approve clinical summary before hospital dispatch</li>
                <li className="flex items-start gap-1.5">• Select hospital referral destinations</li>
                <li className="flex items-start gap-1.5">• Approve final quote presentation to patient</li>
              </ul>
            </div>

            {/* Column 3: Hospital Desk */}
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <Building2 className="w-4 h-4" />
                <span>Hospital Desk</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-1.5">• Doctor review of medical history</li>
                <li className="flex items-start gap-1.5">• Determine surgical feasibility & doctor fit</li>
                <li className="flex items-start gap-1.5">• Issue hospital-reviewed estimates & stay guidance</li>
                <li className="flex items-start gap-1.5">• Issue hospital visa-support documentation</li>
              </ul>
            </div>

            {/* Column 4: Patient */}
            <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Users className="w-4 h-4" />
                <span>Patient / Family</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-1.5">• Upload medical records & passports</li>
                <li className="flex items-start gap-1.5">• Select preferred hospital package</li>
                <li className="flex items-start gap-1.5">• Confirm travel dates & flight numbers</li>
                <li className="flex items-start gap-1.5">• Track follow-up tasks and coordinator updates</li>
              </ul>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 7: SIDE-BY-SIDE COMPARISON TABLE ("WHY CANOPUS CARE?")
          ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-slate-50/70">
        <div className="max-w-5xl mx-auto space-y-10">

          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold text-[#0D9488] uppercase tracking-wider bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/20">
              Why Canopus Care?
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              Comparing traditional coordination with Canopus Care
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
            <table className="w-full min-w-[640px] sm:min-w-0 text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-900 text-white font-mono text-xs border-b border-slate-800">
                  <th className="p-4 sm:p-5 font-bold">Workflow Capability</th>
                  <th className="p-4 sm:p-5 font-bold text-rose-400">Today's Manual Workflow</th>
                  <th className="p-4 sm:p-5 font-bold text-[#0FB8A6]">Canopus Care Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-slate-900">Communication Channel</td>
                  <td className="p-4 sm:p-5 text-rose-600 bg-rose-50/30">WhatsApp & Dispersed Emails</td>
                  <td className="p-4 sm:p-5 text-[#0D9488] font-bold bg-teal-50/30">Structured Single Workflow</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-slate-900">Medical Document Storage</td>
                  <td className="p-4 sm:p-5 text-rose-600 bg-rose-50/30">Unindexed PDFs & Phone Scans</td>
                  <td className="p-4 sm:p-5 text-[#0D9488] font-bold bg-teal-50/30">Unified Structured Health Record</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-slate-900">Follow-up Management</td>
                  <td className="p-4 sm:p-5 text-rose-600 bg-rose-50/30">Manual Phone Reminders</td>
                  <td className="p-4 sm:p-5 text-[#0D9488] font-bold bg-teal-50/30">Automated Rules & Task Engine</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-slate-900">Audit Trail & Compliance</td>
                  <td className="p-4 sm:p-5 text-rose-600 bg-rose-50/30">Lost Email Threads & Unread Chats</td>
                  <td className="p-4 sm:p-5 text-[#0D9488] font-bold bg-teal-50/30">Complete Immutable Audit Trail</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-slate-900">Hospital Quote Comparison</td>
                  <td className="p-4 sm:p-5 text-rose-600 bg-rose-50/30">Multiple Confusing Excel Sheets</td>
                  <td className="p-4 sm:p-5 text-[#0D9488] font-bold bg-teal-50/30">Single Standardized Dashboard</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 8: GUIDED 2-MINUTE REVIEWER DEMO JOURNEY
          ========================================================================= */}
      <section id="product-demo" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-[#0A1626] text-white">
        <div className="max-w-6xl mx-auto space-y-12">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-[#0FB8A6] uppercase tracking-wider bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                Reviewer Guided Tour
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-['Plus_Jakarta_Sans']">
                2-Minute Reviewer Demo Walkthrough
              </h2>
              <p className="text-slate-400 text-sm max-w-xl">
                Test the complete case cycle directly in our interactive sandbox without registration.
              </p>
            </div>

            <button
              onClick={onOpenInteractiveDemo}
              className="px-6 py-3.5 rounded-xl bg-[#0FB8A6] hover:bg-[#0A8C7E] text-white font-mono text-xs font-bold flex items-center gap-2 shadow-xl shrink-0 self-start md:self-auto"
            >
              <Laptop className="w-4 h-4" />
              <span>Launch Interactive Sandbox</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 7 Interactive Steps */}
          <div className="grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { num: '1', title: 'Login', desc: 'Select Coordinator / Hospital Desk role' },
              { num: '2', title: 'Open Case', desc: 'Choose a synthetic demonstration case' },
              { num: '3', title: 'Review Docs', desc: 'Inspect AI extracted lab & scan reports' },
              { num: '4', title: 'Case Summary', desc: 'Review the structured case summary' },
              { num: '5', title: 'Prepare Request', desc: 'Queue a consented case for human dispatch' },
              { num: '6', title: 'Review Quote', desc: 'Compare illustrative hospital estimates' },
              { num: '7', title: 'Complete', desc: 'Track a hospital-issued visa support letter' },
            ].map((step, idx) => (
              <button
                key={step.num}
                onClick={() => {
                  setActiveDemoStep(idx + 1);
                  onOpenInteractiveDemo();
                }}
                className={`p-4 rounded-xl text-left border transition-all space-y-2 ${
                  activeDemoStep === idx + 1
                    ? 'bg-slate-800 border-[#0FB8A6] shadow-lg ring-1 ring-[#0FB8A6]'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-mono font-bold text-[#0FB8A6]">STEP 0{step.num}</div>
                <div className="text-sm font-bold text-white">{step.title}</div>
                <div className="text-[11px] text-slate-400 leading-tight">{step.desc}</div>
              </button>
            ))}
          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 9: ARCHITECTURE & DETERMINISTIC ENGINE
          ========================================================================= */}
      <section id="architecture" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto space-y-12">

          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold text-[#0D9488] uppercase tracking-wider bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/20">
              Technical Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              Deterministic rules engine powered by LLMs
            </h2>
            <p className="text-slate-600 text-base max-w-2xl mx-auto">
              Our core workflow is deterministic and state-machine driven. AI agents enhance extraction and drafting, but state transitions are enforced strictly by code rules.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-6">
            <div className="text-xs font-mono text-[#0FB8A6] font-bold uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              <span>System Flow Architecture</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-center text-xs font-mono">
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-slate-200">
                <div className="font-bold text-[#0FB8A6]">1. Ingestion</div>
                <div className="text-[10px] text-slate-400 mt-1">Supported records / chat</div>
              </div>
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-slate-200">
                <div className="font-bold text-[#0FB8A6]">2. Rules Check</div>
                <div className="text-[10px] text-slate-400 mt-1">Validate Schema</div>
              </div>
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-slate-200">
                <div className="font-bold text-[#0FB8A6]">3. AI Extraction</div>
                <div className="text-[10px] text-slate-400 mt-1">Lab / Diagnosis</div>
              </div>
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-slate-200">
                <div className="font-bold text-[#0FB8A6]">4. Human Gate</div>
                <div className="text-[10px] text-slate-400 mt-1">Coordinator Approval</div>
              </div>
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-slate-200">
                <div className="font-bold text-[#0FB8A6]">5. State Dispatch</div>
                <div className="text-[10px] text-slate-400 mt-1">Hospital Referral</div>
              </div>
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-slate-200">
                <div className="font-bold text-[#0FB8A6]">6. Quote State</div>
                <div className="text-[10px] text-slate-400 mt-1">Hospital-reviewed estimate</div>
              </div>
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-emerald-400 font-bold">
                <div className="font-bold text-emerald-400">7. Visa & Flight</div>
                <div className="text-[10px] text-emerald-300/80 mt-1">Audit Complete</div>
              </div>
            </div>
          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 10: WHAT IS REAL vs. SYNTHETIC SANDBOX
          ========================================================================= */}
      <section id="documentation" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-slate-50/70">
        <div className="max-w-6xl mx-auto space-y-12">

          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold text-[#0D9488] uppercase tracking-wider bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/20">
              Reviewer Transparency
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              What is live code vs. demo sandbox?
            </h2>
            <p className="text-slate-600 text-base max-w-2xl mx-auto">
              We believe in full transparency for technical reviewers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">

            {/* Real Code */}
            <div className="p-6 rounded-2xl bg-white border border-emerald-300 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Fully Functional & Implemented</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">✓ React frontend + Node full-stack architecture</li>
                <li className="flex items-center gap-2">✓ Deterministic state machine for care coordination</li>
                <li className="flex items-center gap-2">✓ Human-gated operational agent pipeline</li>
                <li className="flex items-center gap-2">✓ Multi-perspective role switching (Patient, Desk, Coordinator)</li>
                <li className="flex items-center gap-2">✓ Document structuring & OCR extraction interface</li>
              </ul>
            </div>

            {/* Demo Mode */}
            <div className="p-6 rounded-2xl bg-white border border-amber-300 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>Demo Sandbox Limitations</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">• Synthetic patient records only (Zero real PHI)</li>
                <li className="flex items-center gap-2">• Simulated hospital responses for fast review testing</li>
                <li className="flex items-center gap-2">• WhatsApp webhooks routed to internal sandbox bus</li>
                <li className="flex items-center gap-2">• Email dispatch triggers simulated PDF previews</li>
              </ul>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 11: Y COMBINATOR APPLICATION & DECK PORTAL
          ========================================================================= */}
      <section id="yc-application" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto space-y-12">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6600]/20 text-[#FF6600] border border-[#FF6600]/30 font-mono text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Y COMBINATOR APPLICATION PORTAL</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-['Plus_Jakarta_Sans']">
                Y Combinator Pitch & Founder Submission
              </h2>
              <p className="text-slate-400 text-base max-w-2xl">
                Dedicated review materials for YC partners including our live interactive product sandbox, video walkthrough, and founder application responses.
              </p>
            </div>

            <button
              onClick={onOpenInteractiveDemo}
              className="px-6 py-3.5 rounded-xl bg-[#FF6600] hover:bg-[#E55C00] text-white font-mono text-xs font-bold flex items-center gap-2 shadow-lg transition-all shrink-0 self-start md:self-auto"
            >
              <Laptop className="w-4 h-4" />
              <span>Launch Live YC Sandbox Demo</span>
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">

            <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl space-y-4 flex flex-col justify-between hover:border-[#0FB8A6] transition-colors">
              <div className="space-y-3">
                <span className="text-[10px] font-mono px-2.5 py-1 bg-teal-500/10 text-[#0FB8A6] rounded-md font-bold border border-teal-500/20">
                  LIVE DEMO
                </span>
                <h3 className="text-xl font-bold text-white">Interactive Product Sandbox</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Explore the read-only reviewer experience, role-scoped operations views, synthetic cases, and human-gated workflow controls.
                </p>
              </div>
              <button
                onClick={onOpenInteractiveDemo}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-[#0FB8A6] border border-slate-700 hover:border-[#0FB8A6] rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
              >
                <span>Open Full Sandbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl space-y-4 flex flex-col justify-between hover:border-[#FF6600] transition-colors">
              <div className="space-y-3">
                <span className="text-[10px] font-mono px-2.5 py-1 bg-[#FF6600]/10 text-[#FF6600] rounded-md font-bold border border-[#FF6600]/20">
                  VIDEO DEMO
                </span>
                <h3 className="text-xl font-bold text-white">Product Walkthrough</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Concise walkthrough demonstrating patient intake, automated translation, hospital desk responses, and human-gated approval.
                </p>
              </div>
              <button
                onClick={() => setActiveVideoModal(true)}
                className="w-full py-2.5 bg-[#FF6600] hover:bg-[#E55C00] text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Watch Video Pitch</span>
              </button>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-mono px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-md font-bold border border-indigo-500/20">
                  UNIT ECONOMICS
                </span>
                <h3 className="text-xl font-bold text-white">Hospital-paid coordination model</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Canopus Care models a disclosed hospital-paid facilitation share per completed case. Commercial terms remain illustrative until contracted.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-700/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Target Region: Africa/ME → India</span>
                <span className="text-emerald-400 font-bold">Illustrative tier model</span>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 12: WHY NOW? (FINAL NARRATIVE)
          ========================================================================= */}
      <section className={`py-20 px-4 sm:px-6 lg:px-8 border-b text-center transition-colors duration-300 ${isDark ? 'bg-[#0B172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className="max-w-4xl mx-auto space-y-6">
          <span className="text-xs font-mono font-bold text-[#0D9488] uppercase tracking-wider bg-[#0D9488]/10 px-3 py-1 rounded-full border border-[#0D9488]/20">
            Why Now?
          </span>
          <p className={`text-xl sm:text-2xl font-bold leading-relaxed font-['Plus_Jakarta_Sans'] ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Healthcare is increasingly global, but coordination is still fragmented across WhatsApp, email, PDFs, spreadsheets, and manual follow-ups. Canopus Care brings these workflows into a single AI-assisted platform that helps coordinators and hospitals manage international patient journeys while keeping clinical decisions with healthcare professionals.
          </p>
          <div className="pt-4">
            <button
              onClick={onOpenInteractiveDemo}
              className="px-8 py-4 rounded-xl bg-[#0FB8A6] hover:bg-[#0A8C7E] text-white font-mono text-sm font-bold inline-flex items-center gap-2 shadow-xl"
            >
              <Laptop className="w-4 h-4" />
              <span>Launch Interactive Demo Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>


      {/* =========================================================================
          SECTION 13: ABOUT US & LEADERSHIP
          ========================================================================= */}
      <section id="about" className={`py-20 px-4 sm:px-6 lg:px-8 border-b transition-colors duration-300 ${isDark ? 'bg-[#070F1E] border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
        <div className="max-w-6xl mx-auto space-y-12">

          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold text-[#0D9488] uppercase tracking-wider bg-[#0D9488]/10 px-3.5 py-1.5 rounded-full border border-[#0D9488]/20 inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>About Us & Leadership</span>
            </span>
            <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans'] ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Driven by standardizing cross-border care logistics
            </h2>
            <p className={`text-base sm:text-lg font-sans leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Canopus Care was founded to bridge the gap between international patients, medical travel coordinators, and accredited hospital centers, replacing manual emails, spreadsheets, and hidden markups with transparent workflow technology.
            </p>
          </div>

          {/* Founders Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

            {/* Founder 1: Hussain Bombaywala */}
            <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col justify-between transition-all hover:border-[#0FB8A6]/50 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="space-y-6">

                {/* Header with Photo & LinkedIn */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="min-w-0 flex items-center gap-4">
                    <img
                      src={founderHussainImg}
                      alt="Hussain Bombaywala"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-[#0D9488] shadow-md"
                    />
                    <div className="min-w-0">
                      <h3 className={`text-lg sm:text-2xl break-words font-bold font-['Plus_Jakarta_Sans'] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Hussain Bombaywala
                      </h3>
                      <div className="text-sm font-semibold text-[#0D9488]">Co-Founder & CEO / Growth Lead</div>
                      <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>Bangalore, India</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href="https://www.linkedin.com/in/hussain-bombaywala/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start p-2.5 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2] text-[#0A66C2] hover:text-white border border-[#0A66C2]/30 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0"
                    title="Connect on LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                    <span className="hidden sm:inline">LinkedIn</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Focus Badges */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium border border-emerald-500/20">
                    Hospital Partnerships
                  </span>
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono font-medium border border-amber-500/20">
                    Growth & Sourcing
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-mono font-medium border border-purple-500/20">
                    Global Operations
                  </span>
                </div>

                {/* Quote / Bio */}
                <p className={`text-sm leading-relaxed italic ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  "Every delayed medical visa or fragmented medical record isn't just an administrative hold-up, it's a real person waiting for life-changing treatment. We built Canopus Care to fix cross-border healthcare end to end."
                </p>

              </div>

              {/* Direct Action */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-2 text-xs font-mono mt-6">
                <span className="text-slate-400">Hospital Partnerships & Growth</span>
                <a
                  href="https://www.linkedin.com/in/hussain-bombaywala/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0D9488] font-bold hover:underline flex items-center gap-1"
                >
                  View Profile <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Founder 2: Ajeya Sriganesh */}
            <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col justify-between transition-all hover:border-[#0FB8A6]/50 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="space-y-6">

                {/* Header with Photo & LinkedIn */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="min-w-0 flex items-center gap-4">
                    <img
                      src={founderAjeyaImg}
                      alt="Ajeya Sriganesh"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-[#0D9488] shadow-md"
                    />
                    <div className="min-w-0">
                      <h3 className={`text-lg sm:text-2xl break-words font-bold font-['Plus_Jakarta_Sans'] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Ajeya Sriganesh
                      </h3>
                      <div className="text-sm font-semibold text-[#0D9488]">Co-Founder & CTO / Product Lead</div>
                      <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>Bangalore, India</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href="https://www.linkedin.com/in/ajeyasriganesh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start p-2.5 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2] text-[#0A66C2] hover:text-white border border-[#0A66C2]/30 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0"
                    title="Connect on LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                    <span className="hidden sm:inline">LinkedIn</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Focus Badges */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-mono font-medium border border-teal-500/20">
                    Systems Architecture
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono font-medium border border-blue-500/20">
                    AI Agent Workflows
                  </span>
                  <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-medium border border-indigo-500/20">
                    Technical Infrastructure
                  </span>
                </div>

                {/* Quote / Bio */}
                <p className={`text-sm leading-relaxed italic ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  "Cross-border medical logistics should operate with the reliability of cloud infrastructure: strict human safety gates, zero record leakage, and complete transparency for every patient awaiting care."
                </p>

              </div>

              {/* Direct Action */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-2 text-xs font-mono mt-6">
                <span className="text-slate-400">Engineering & Product Lead</span>
                <a
                  href="https://www.linkedin.com/in/ajeyasriganesh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0D9488] font-bold hover:underline flex items-center gap-1"
                >
                  View Profile <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

          </div>

          {/* Core Operating Pillars */}
          <div className={`p-8 rounded-3xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} grid grid-cols-1 md:grid-cols-3 gap-6`}>
            <div className="space-y-2">
              <div className="text-teal-500 font-mono font-bold text-xs uppercase tracking-wider">01. Human Safety First</div>
              <h4 className={`font-bold font-['Plus_Jakarta_Sans'] text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Non-Clinical Automation</h4>
              <p className={`text-xs font-sans leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                AI-assisted workflows organize records, travel tasks, and visa-support coordination, while clinical decisions remain with hospital specialists.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-amber-500 font-mono font-bold text-xs uppercase tracking-wider">02. Disclosed Commercial Terms</div>
              <div className={`font-bold font-['Plus_Jakarta_Sans'] text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Quote and fee transparency</div>
              <p className={`text-xs font-sans leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Structured workflows keep hospital estimates, exclusions, validity, and facilitator disclosures visible without claiming that Canopus Care wins on price.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-blue-500 font-mono font-bold text-xs uppercase tracking-wider">03. High-Trust Infrastructure</div>
              <div className={`font-bold font-['Plus_Jakarta_Sans'] text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Audited Data Security</div>
              <p className={`text-xs font-sans leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                End-to-end audit logging ensures medical records are shared exclusively with verified hospital international desks and accredited coordinators.
              </p>
            </div>
          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 14: CONTACT US
          ========================================================================= */}
      <section id="contact" className={`py-20 px-4 sm:px-6 lg:px-8 border-b transition-colors duration-300 ${isDark ? 'bg-[#0B172A] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className="max-w-6xl mx-auto space-y-12">

          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-mono font-bold text-[#0D9488] uppercase tracking-wider bg-[#0D9488]/10 px-3.5 py-1.5 rounded-full border border-[#0D9488]/20 inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Us</span>
            </span>
            <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans'] ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Let's coordinate care together
            </h2>
            <p className={`text-base font-sans leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Whether you are an accredited hospital desk, a medical travel coordinator, an investor, or a patient with questions, we'd love to hear from you.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

            {/* Left Column: Direct Info & Founders Contact */}
            <div className="lg:col-span-5 space-y-6">

              <div className={`p-6 rounded-2xl border shadow-lg space-y-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`text-lg font-bold font-['Plus_Jakarta_Sans'] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Direct Founder Contact
                </h3>

                <div className="space-y-4 text-sm font-sans">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-teal-500/10 text-[#0D9488]">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-slate-400">Email Us</div>
                      <a href="mailto:info@canopuscare.com" className="font-semibold hover:text-[#0D9488] transition-colors break-all">
                        info@canopuscare.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                      <Linkedin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-slate-400">Founders LinkedIn</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <a
                          href="https://www.linkedin.com/in/hussain-bombaywala/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#0A66C2] font-semibold hover:underline bg-[#0A66C2]/10 px-2.5 py-1 rounded-lg border border-[#0A66C2]/20"
                        >
                          Hussain Bombaywala
                        </a>
                        <a
                          href="https://www.linkedin.com/in/ajeyasriganesh"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#0A66C2] font-semibold hover:underline bg-[#0A66C2]/10 px-2.5 py-1 rounded-lg border border-[#0A66C2]/20"
                        >
                          Ajeya Sriganesh
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                      <Globe2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-slate-400">Key Hubs</div>
                      <div className="font-semibold text-xs sm:text-sm">
                        Bangalore, India
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-slate-400">
                    Response targets are configured per hospital and recorded in the audit trail.
                  </div>
                </div>
              </div>

              {/* Quick Action Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#0A8C7E] text-white shadow-xl space-y-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-teal-100">Interactive Sandbox</div>
                <h4 className="text-lg font-bold font-['Plus_Jakarta_Sans']">Want to see the live platform in action?</h4>
                <p className="text-xs text-teal-50 font-sans leading-relaxed">
                  Review the operational agents, hospital desk view, synthetic cases, and consent-gated journeys directly in your browser.
                </p>
                <button
                  onClick={onOpenInteractiveDemo}
                  className="mt-2 w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Laptop className="w-4 h-4 text-[#0FB8A6]" />
                  <span>Launch Interactive Sandbox</span>
                </button>
              </div>

            </div>

            {/* Right Column: Interactive Contact Form */}
            <div className="lg:col-span-7">
              <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>

                {contactSubmitted ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-[#0D9488] border border-teal-500/30 flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className={`text-2xl font-bold font-['Plus_Jakarta_Sans'] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Email draft opened
                    </h3>
                    <p className={`text-sm max-w-md mx-auto ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Complete and send the draft in your email app. Canopus Care does not claim that a message was delivered until you send it.
                    </p>
                    <button
                      onClick={() => {
                        setContactSubmitted(false);
                        setContactForm({ name: '', email: '', role: 'Hospital Representative', message: '' });
                      }}
                      className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold"
                    >
                      Prepare another email
                    </button>
                  </div>
                ) : (
                  <form
                     onSubmit={(e) => {
                       e.preventDefault();
                       const subject = `Canopus Care inquiry from ${contactForm.name}`;
                       const body = [
                         `Name: ${contactForm.name}`,
                         `Email: ${contactForm.email}`,
                         `Role: ${contactForm.role}`,
                         '',
                         contactForm.message,
                       ].join('\n');
                       window.location.href = `mailto:info@canopuscare.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                       setContactSubmitted(true);
                     }}
                    className="space-y-5"
                  >
                    <div className="space-y-1">
                      <h3 className={`text-xl font-bold font-['Plus_Jakarta_Sans'] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Prepare a direct email
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Submitting opens your email app with a draft addressed to info@canopuscare.com.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={`text-xs font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Your Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Dr. Sarah Jenkins"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#0D9488] transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'}`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className={`text-xs font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="e.g., reviewer@demohospital.example"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#0D9488] transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-xs font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        I am representing a:
                      </label>
                      <select
                        value={contactForm.role}
                        onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#0D9488] transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                      >
                        <option value="Hospital Representative">Accredited Hospital / International Desk</option>
                        <option value="Medical Travel Coordinator">Medical Travel Agency / Independent Coordinator</option>
                        <option value="Investor / YC Partner">Investor / YC Reviewer</option>
                        <option value="Patient / Family">Patient or Family Member</option>
                        <option value="Other">Other / Tech Partnership</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-xs font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Message / Inquiry
                      </label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Tell us about your patient volumes, hospital network, or inquiry..."
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#0D9488] transition-all ${isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'}`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-6 rounded-xl bg-[#0D9488] hover:bg-[#0A7C72] text-white font-mono text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                      <Send className="w-4 h-4" />
                      <span>Open email draft to founders</span>
                    </button>
                  </form>
                )}

              </div>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 15: FOOTER
          ========================================================================= */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-400 text-xs font-mono">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 border-b border-slate-800 pb-12">

          <div className="col-span-2 space-y-3">
            <div className="text-white font-bold text-base font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0FB8A6]" />
              <span>Canopus Care</span>
            </div>
            <p className="text-slate-500 text-xs font-sans max-w-sm">
              Cross-border medical travel facilitation engine. Connecting international patients, travel coordinators, and accredited hospital desks.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-slate-200 font-bold uppercase text-[10px] tracking-wider">Product</div>
            <ul className="space-y-1.5 text-slate-400">
              <li><a href="#products" className="hover:text-[#0FB8A6]">Patient Portal</a></li>
              <li><a href="#products" className="hover:text-[#0FB8A6]">Hospital Desk</a></li>
              <li><a href="#products" className="hover:text-[#0FB8A6]">Coordinator Command</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-slate-200 font-bold uppercase text-[10px] tracking-wider">Company</div>
            <ul className="space-y-1.5 text-slate-400">
              <li><a href="#about" className="hover:text-[#0FB8A6]">About Us</a></li>
              <li><a href="#contact" className="hover:text-[#0FB8A6]">Contact Us</a></li>
              <li><a href="#architecture" className="hover:text-[#0FB8A6]">Architecture</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-slate-200 font-bold uppercase text-[10px] tracking-wider">Reviewer Links</div>
            <ul className="space-y-1.5 text-slate-400">
              <li><a href="#yc-application" className="hover:text-[#FF6600]">YC Application</a></li>
              <li><button onClick={onOpenInteractiveDemo} className="hover:text-[#0FB8A6] text-left">Interactive Sandbox</button></li>
              <li><a href="https://www.linkedin.com/in/hussain-bombaywala/" target="_blank" rel="noopener noreferrer" className="hover:text-[#0FB8A6]">Hussain (LinkedIn)</a></li>
              <li><a href="https://www.linkedin.com/in/ajeyasriganesh" target="_blank" rel="noopener noreferrer" className="hover:text-[#0FB8A6]">Ajeya (LinkedIn)</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>© 2026 Canopus Care Inc. • All patient data in demo mode is synthetic.</div>
          <div className="flex items-center gap-4">
            <span>Synthetic Data Notice</span>
            <span>•</span>
            <span>Privacy</span>
            <span>•</span>
            <span>Terms</span>
          </div>
        </div>
      </footer>


      {/* =========================================================================
          VIDEO MODAL WALKTHROUGH
          ========================================================================= */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 text-white space-y-4 relative shadow-2xl">
            <button
              onClick={() => setActiveVideoModal(false)}
              aria-label="Close video"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-[#FF6600] font-bold uppercase tracking-wider">PRODUCT WALKTHROUGH · 2:42</span>
              <h3 className="text-xl font-bold font-['Plus_Jakarta_Sans']">Canopus Care Engine Demo</h3>
            </div>

            <video
              className="w-full aspect-video bg-slate-950 rounded-xl border border-slate-800"
              controls
              autoPlay
              playsInline
              preload="metadata"
              aria-label="Canopus Care product walkthrough"
            >
              <source src="/landing-assets/canopus-care-walkthrough.mp4" type="video/mp4" />
              Your browser does not support embedded video playback.
            </video>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Continue into the live reviewer sandbox after the walkthrough.
              </p>
              <button
                onClick={() => {
                  setActiveVideoModal(false);
                  onOpenInteractiveDemo();
                }}
                className="shrink-0 px-5 py-2.5 rounded-xl bg-[#0FB8A6] hover:bg-[#0A8C7E] text-white text-xs font-mono font-bold"
              >
                Launch Live Interactive Sandbox
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
