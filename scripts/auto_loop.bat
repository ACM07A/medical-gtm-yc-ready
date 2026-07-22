@echo off
REM MedYatra AUTO-LOOP — like run_factory.bat, but stays running and retries sooner than the next 6-hour
REM scheduled slot when a step hits a rate limit / timeout (data-core/auto_loop.mjs). Register this as a
REM Windows Scheduled Task with an "At startup" trigger (not "every 6 hours" — this script itself loops
REM forever) so the factory resumes automatically after a reboot with no one needing to open a terminal.
cd /d "C:\Projects\Medical Tourism GTM"

set TIER2_TIMEOUT=8000
set REPURPOSE_PAGES=1

echo ===== auto-loop started %DATE% %TIME% ===== >> outputs\loop.log
"C:\Program Files\nodejs\node.exe" --experimental-sqlite data-core\auto_loop.mjs run_loop.mjs >> outputs\loop.log 2>&1
echo ===== auto-loop exited %DATE% %TIME% (see reason above) ===== >> outputs\loop.log
