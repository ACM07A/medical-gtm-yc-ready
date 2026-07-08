@echo off
REM MedYatra autonomous factory loop — runs the whole free/local pipeline WITHOUT Claude.
REM Generation uses the Tier-2 failover chain (GLM-5.2 -> llama), reading the key from integrations\.env.
REM Registered as a Windows Scheduled Task so GLM/Llama "carry the loop" when Claude is offline.
cd /d "C:\Projects\Medical Tourism GTM"

REM Fail over fast if the primary model is unreachable (per-model ms budget).
set TIER2_TIMEOUT=8000
REM How many published pages to repurpose into social posts per cycle.
set REPURPOSE_PAGES=1

echo ===== factory cycle %DATE% %TIME% ===== >> outputs\loop.log
"C:\Program Files\nodejs\node.exe" --experimental-sqlite data-core\run_loop.mjs >> outputs\loop.log 2>&1
echo. >> outputs\loop.log
