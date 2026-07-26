import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "canopus_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const DEMO_SESSION_SECRET = "canopuscare-local-demo-session-secret";
const attempts = new Map();

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  return process.env.APP_MODE === "production" ? "" : DEMO_SESSION_SECRET;
}

function signature(value) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => {
    const index = part.indexOf("=");
    return index < 0 ? ["", ""] : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  }).filter(([key]) => key));
}

export function createSessionToken(userId, now = Date.now()) {
  if (!secret()) throw new Error("SESSION_SECRET is required");
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
  })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token, now = Date.now()) {
  if (!token || !secret()) return null;
  const [payload, supplied] = String(token).split(".");
  if (!payload || !supplied) return null;
  const expected = signature(payload);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded.sub || decoded.exp <= Math.floor(now / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function sessionUserId(req) {
  const token = parseCookies(req.headers.cookie || "")[COOKIE_NAME];
  return verifySessionToken(token)?.sub || null;
}

export function sessionCookie(userId) {
  const secure = String(process.env.APP_BASE_URL || "").startsWith("https://");
  return [
    `${COOKIE_NAME}=${createSessionToken(userId)}`,
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export function clearSessionCookie() {
  const secure = String(process.env.APP_BASE_URL || "").startsWith("https://");
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export function loginRateLimit(key, success = false, now = Date.now()) {
  const windowMs = 10 * 60 * 1000;
  const current = attempts.get(key);
  if (success) {
    attempts.delete(key);
    return { allowed: true, remaining: 5 };
  }
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;
  if (entry.count >= 5) return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  entry.count += 1;
  attempts.set(key, entry);
  return { allowed: true, remaining: 5 - entry.count };
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
