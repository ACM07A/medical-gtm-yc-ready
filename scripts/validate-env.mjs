import { existsSync } from "node:fs";
import { loadEnv } from "../lib/env.mjs";

loadEnv();

const allowedModes = new Set(["demo", "development", "test", "production"]);
const mode = process.env.APP_MODE || "demo";
const components = [];
const gaps = [];

function component(name, status, detail) {
  components.push({ name, status, detail });
}

if (!allowedModes.has(mode)) gaps.push(`APP_MODE must be one of ${[...allowedModes].join(", ")}`);

const realDataEnabled = process.env.ALLOW_REAL_PATIENT_DATA === "1" || process.env.ALLOW_REAL_UPLOADS === "1";
if (mode === "demo" && realDataEnabled) gaps.push("Real patient data and uploads must remain disabled in demo mode");
if (mode === "demo" && process.env.POST_LIVE === "1") gaps.push("POST_LIVE must be 0 in demo mode");

if (mode === "production") {
  const required = ["SESSION_SECRET", "APP_BASE_URL", "ALLOWED_ORIGINS", "ENCRYPTION_KEY", "CONSOLE_TOKEN", "AUTH_PROVIDER"];
  for (const key of required) if (!process.env[key]) gaps.push(`${key} is required in production`);
  if (!process.env.DATABASE_PATH && !process.env.DATABASE_URL) gaps.push("DATABASE_PATH or DATABASE_URL is required in production");
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) gaps.push("SESSION_SECRET must be at least 32 characters");
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 32) gaps.push("ENCRYPTION_KEY must be at least 32 characters");
  if (process.env.APP_BASE_URL && !process.env.APP_BASE_URL.startsWith("https://")) gaps.push("APP_BASE_URL must use HTTPS in production");
  if (process.env.POST_LIVE === "1" && !(process.env.RESEND_API_KEY || process.env.WHATSAPP_TOKEN))
    gaps.push("At least one outbound provider credential is required when POST_LIVE=1");
}

component("application", gaps.length ? "BLOCKED" : "READY", `${mode} mode`);
component("database", process.env.DATABASE_PATH || process.env.DATABASE_URL ? "READY" : mode === "production" ? "BLOCKED" : "READY",
  process.env.DATABASE_PATH || process.env.DATABASE_URL || "local default");
component("patient_data", mode === "demo" ? "DISABLED" : realDataEnabled ? "READY" : "DISABLED",
  mode === "demo" ? "Synthetic data only" : "Controlled by ALLOW_REAL_PATIENT_DATA and ALLOW_REAL_UPLOADS");
component("outbound", process.env.POST_LIVE === "1" ? "READY" : "DISABLED", "Requires POST_LIVE=1 and per-item approval");
component("ai_generation", process.env.GEMINI_API_KEY || process.env.NVIDIA_API_KEY || process.env.ANTHROPIC_API_KEY ? "READY" : "MOCKED",
  "Deterministic output is used when no provider is configured");

const databasePath = process.env.DATABASE_PATH;
if (databasePath) component("database_file", existsSync(databasePath) ? "READY" : "DEGRADED", existsSync(databasePath) ? "Existing database" : "Will initialize on first boot");

const status = gaps.length ? "BLOCKED" : components.some((item) => ["MOCKED", "DISABLED", "DEGRADED"].includes(item.status)) ? "DEGRADED" : "READY";
const report = { status, mode, gaps, components };
console.log(JSON.stringify(report, null, 2));
if (status === "BLOCKED") process.exitCode = 1;

export { report };
