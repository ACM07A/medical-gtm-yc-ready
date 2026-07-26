import { appMode, DEMO_USERNAME } from "../data-core/os_core.mjs";

const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function renderLogin() {
  const username = process.env.DEMO_USERNAME || DEMO_USERNAME;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reviewer login | Canopus Care</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f3f3ee;color:#171914;font:15px/1.5 Inter,Arial,sans-serif}
.strip{padding:9px 18px;background:#151711;color:#fff;text-align:center;font-size:12px;font-weight:700}
main{min-height:calc(100vh - 36px);display:grid;place-items:center;padding:24px}.panel{width:min(420px,100%);background:#fff;border:1px solid #d9dbd1;padding:30px}
.brand{font:700 28px Georgia,serif;margin:0 0 4px}.mode{color:#e64520;font-size:12px;font-weight:800;text-transform:uppercase}
label{display:block;margin-top:18px;font-weight:700}input{width:100%;margin-top:6px;padding:12px;border:1px solid #aeb2a7;font:inherit}
button{width:100%;margin-top:22px;padding:12px;border:0;background:#1b4d3e;color:#fff;font:700 15px/1 inherit;cursor:pointer}
.meta,.error{font-size:13px}.meta{color:#60655c}.error{color:#b42318;min-height:20px;margin-top:12px}
a{color:#1b4d3e}
</style></head><body>
<div class="strip">DEMO ENVIRONMENT - SYNTHETIC DATA - EXTERNAL ACTIONS DISABLED</div>
<main><section class="panel">
<p class="mode">${esc(appMode())} reviewer access</p><h1 class="brand">Canopus Care</h1>
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
