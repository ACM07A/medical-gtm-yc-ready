import { appMode, DEMO_USERNAME } from "../data-core/os_core.mjs";

const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function renderLogin() {
  const username = process.env.DEMO_USERNAME || DEMO_USERNAME;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reviewer login | Canopus Care</title>
<style>
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
*{box-sizing:border-box}body{margin:0;background:#F7FAF9;color:#1E3A44;font:14px/1.55 "Plus Jakarta Sans","Segoe UI",sans-serif}
.strip{padding:9px 18px;background:#070F1A;color:#CBD5E1;text-align:center;font:600 10px/1.4 "JetBrains Mono",monospace;letter-spacing:.08em}
main{min-height:calc(100vh - 34px);display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 25%,#E6F8F5 0,transparent 38%)}
.panel{width:min(440px,100%);background:#fff;border:1px solid #E6ECEA;border-radius:12px;padding:36px;box-shadow:0 18px 44px rgba(30,58,68,.10),0 2px 8px rgba(30,58,68,.05)}
.brand{font:800 28px/1.15 "Plus Jakarta Sans","Segoe UI",sans-serif;margin:0 0 7px}.brand span{color:#0D9488}.mode{color:#0A8C7E;font:700 10px/1.4 "JetBrains Mono",monospace;text-transform:uppercase;letter-spacing:.08em}
label{display:block;margin-top:18px;font-size:12px;font-weight:700}input{width:100%;min-height:46px;margin-top:6px;padding:12px 13px;border:1px solid #D9E3E0;border-radius:8px;background:#fff;font:inherit;outline:none}input:focus{border-color:#0FB8A6;box-shadow:0 0 0 3px rgba(15,184,166,.18)}
button{width:100%;min-height:46px;margin-top:22px;padding:12px;border:0;border-radius:8px;background:#0D9488;color:#fff;font:700 13px/1 "JetBrains Mono",monospace;cursor:pointer}button:hover{background:#0A8C7E}button:focus-visible{outline:3px solid rgba(15,184,166,.32);outline-offset:2px}
.meta,.error{font-size:12px}.meta{color:#64748B}.error{color:#DC2626;min-height:20px;margin-top:12px}
a{color:#0A8C7E;font-weight:700}
</style></head><body>
<div class="strip">DEMO ENVIRONMENT - SYNTHETIC DATA - EXTERNAL ACTIONS DISABLED</div>
<main><section class="panel">
<p class="mode">${esc(appMode())} reviewer access</p><h1 class="brand">Canopus <span>Care</span></h1>
<p class="meta">Use the deployment-provided password. Local default username: ${esc(username)}</p>
<form id="login"><label>Email<input name="email" type="email" autocomplete="username" value="${esc(username)}" required></label>
<label>Password<input name="password" type="password" autocomplete="current-password" required></label>
<button type="submit">Sign in</button><p class="error" id="error" role="alert"></p></form>
<p class="meta"><a href="/demo">Continue in read-only mode</a></p>
</section></main>
<script>
document.getElementById("login").addEventListener("submit",async(event)=>{
  event.preventDefault();const form=new FormData(event.currentTarget);const error=document.getElementById("error");error.textContent="";
  const response=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(Object.fromEntries(form))});
  if(response.ok){location.href="/demo";return}const body=await response.json().catch(()=>({}));error.textContent=body.error?.message||"Sign-in failed";
});
</script></body></html>`;
}
