import { appMode, DEMO_USERNAME } from "../data-core/os_core.mjs";

const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function renderLogin() {
  const username = process.env.DEMO_USERNAME || DEMO_USERNAME;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reviewer login | Canopus Care</title>
<style>
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -10%,#f9faf9,#e3e7e4 70%);color:#111713;font:14px/1.5 Inter,"Segoe UI",Arial,sans-serif}
.strip{padding:9px 18px;background:#10271d;color:#d9eee3;text-align:center;font-size:10px;font-weight:750;letter-spacing:.1em}
main{min-height:calc(100vh - 34px);display:grid;place-items:center;padding:24px}.panel{width:min(440px,100%);background:#fff;border:1px solid rgba(17,23,19,.06);border-radius:20px;padding:36px;box-shadow:0 24px 70px rgba(30,43,35,.13)}
.brand{font:750 28px/1.15 Inter,"Segoe UI",Arial,sans-serif;margin:0 0 7px}.brand span{color:#166a45}.mode{color:#166a45;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}
label{display:block;margin-top:18px;font-size:12px;font-weight:700}input{width:100%;margin-top:6px;padding:12px 13px;border:1px solid #dce1de;border-radius:10px;background:#fafbfa;font:inherit;outline:none}input:focus{border-color:#23865a;box-shadow:0 0 0 3px #e3f4eb}
button{width:100%;margin-top:22px;padding:12px;border:0;border-radius:999px;background:#166a45;color:#fff;font:750 14px/1 inherit;cursor:pointer}button:hover{background:#0f5839}
.meta,.error{font-size:12px}.meta{color:#747b76}.error{color:#b42318;min-height:20px;margin-top:12px}
a{color:#166a45;font-weight:650}
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
