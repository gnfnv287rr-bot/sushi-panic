# SUSHI PANIC development

Read README.md, docs/v12/STATUS.md and docs/v12/P0_GATE.json first.

The Owner requires P0 actual multiplayer sync AND real email restoration acceptance before starting P1. A saved SMTP configuration, local SDK stubs, build success, or a published page is not proof of email recovery. Do not flip the gate without actual evidence. Current P1 development is blocked on this acceptance, not on another technology choice approval.

Preserve production players, valid scores, history and collections. Append migrations; compatibility rollback must retain new archive data. Never infer historical discoveries from a local high score. Never expose tokens, SMTP credentials or administrator keys.

P0 must preserve src/core.js and src/renderer.js hashes. The user explicitly authorized the later P1 casual redesign, but only after the gate passes. Keep old rule versions available for existing sessions when that phase starts.

Use the separate Supabase staging project for automated score fixtures; real user email verification belongs in the official game UI. Do not request secrets in chat. No paid upgrades or production data deletion.

Source work branch: codex/v1-2-p0. The deployed source branch is codex/daily-leaderboard-v1; fast-forward tested commits to it for Actions publication. Dist publishes only public client assets. See docs/v12/TEST_REPORT.md for actual tests and limitations.
