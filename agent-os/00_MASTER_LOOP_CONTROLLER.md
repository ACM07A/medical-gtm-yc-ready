# 00 — Master Loop Controller

## Purpose
Controls how the agent fleet uses `/build-os/` to launch and run the MedYatra GTM engine. `/build-os/` defines *what*; this `/agent-os/` layer defines *how to loop until it's truly built and running*.

## Execution shape
Timer outside · goal condition inside · skill innermost.

```
/loop weekly /goal India × Middle-East+Africa lead corridor passes /build-os/14_ACCEPTANCE_TESTS.md,
      using category/partner/content loops + compliance gate, stop after N turns
```

## Main loop
1. Read goal from `01_GOAL_CONTRACT.md`.
2. Read the active market config (`/build-os/06`).
3. Pick the smallest next task from `11_TASK_QUEUE.md`.
4. Compile a context packet (`06_CONTEXT_PACKETS.md`) — never load the whole repo.
5. Execute via the right specialist agent (`07_MODEL_ROUTING.md`).
6. Verify against acceptance tests; run the compliance gate.
7. Human-approve anything gated (claims, sends, commercials, spend).
8. Log evidence (`12_EVIDENCE_LOG.md`); checkpoint.
9. On repeated failure or a stop condition → escalate/stop (`13_STOP_RULES.md`).
10. Stop only when the goal contract is verified true.

## Non-negotiable
Completion is decided by passing acceptance tests + logged evidence, never by opinion. Compliance (`/build-os/10`) is a blocking gate on every publish/send.
