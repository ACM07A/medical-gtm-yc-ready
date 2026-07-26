import { appMode, DEMO_USERNAME } from "../data-core/os_core.mjs";

const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function renderLogin() {
  const username = process.env.DEMO_USERNAME || DEMO_USERNAME;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reviewer login | Canopus Care</title>
<style>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
*{box-sizing:border-box}body{margin:0;background:#F7F8FA;color:#111318;font:14px/1.55 "Inter","Manrope","SF Pro Display","Segoe UI",sans-serif}
.strip{padding:9px 18px;background:#20242C;color:#F4F6FA;text-align:center;font-size:10px;font-weight:600;letter-spacing:.08em}
main{min-height:calc(100vh - 34px);display:grid;place-items:center;padding:24px}.panel{width:min(440px,100%);background:#fff;border:1px solid #E6E9EF;border-radius:20px;padding:36px;box-shadow:0 12px 32px rgba(17,19,24,.10),0 2px 8px rgba(17,19,24,.05)}
.brand{font:600 28px/1.15 "Inter","Segoe UI",sans-serif;margin:0 0 7px}.brand span{color:#2F6BFF}.mode{color:#1F56E5;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
label{display:block;margin-top:18px;font-size:12px;font-weight:600}input{width:100%;margin-top:6px;padding:12px 13px;border:1px solid #E6E9EF;border-radius:12px;background:#fff;font:inherit;outline:none}input:focus{border-color:#2F6BFF;box-shadow:0 0 0 3px #DDE9FF}
button{width:100%;margin-top:22px;padding:12px;border:0;border-radius:12px;background:#1F56E5;color:#fff;font:600 14px/1 inherit;cursor:pointer}button:hover{background:#1846BE}button:focus-visible{outline:3px solid #BCD2FF;outline-offset:2px}
.meta,.error{font-size:12px}.meta{color:#6E7685}.error{color:#D84A4A;min-height:20px;margin-top:12px}
a{color:#1F56E5;font-weight:600}
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
