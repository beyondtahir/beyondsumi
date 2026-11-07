# Two memories, with separate jobs

## User memory

`scripts/sumi_memory.py` maintains a small private JSON file outside the installed skill/plugin. The default directory is `~/Library/Application Support/Sumi` on macOS, `%APPDATA%/Sumi` on Windows, and `$XDG_CONFIG_HOME/sumi` (or `~/.config/sumi`) on Linux. `SUMI_STATE_DIR` or `--state-dir` may select a user-approved workspace instead. Skill and plugin installations share this same directory; updates must not overwrite it.

Read it at invocation. Store explicitly expressed enduring preferences: language, usual aspect ratio, preferred style, narrator provider/voice/model/profile IDs, background sound preference, local-only preference and duration decision rule. Keep actual project choices in project memory unless the user asks to make them defaults. Never infer a persistent language from a folder name or a permanent narrator from one film. Existing ElevenLabs plugin preferences remain authoritative until the user explicitly changes them; read/reuse them rather than silently replacing them.

Examples (replace values with actual user choices):

```sh
python3 scripts/sumi_memory.py show
python3 scripts/sumi_memory.py set narration_provider voicebox --reason 'User chose local narration as their default'
python3 scripts/sumi_memory.py set narration_model kokoro --reason 'User selected this installed model'
python3 scripts/sumi_memory.py forget narration_model
python3 scripts/sumi_memory.py mark first_run --version 2.0.0
```

Memory contains preferences, reasons and timestamps, not API keys, passwords, raw voice samples, provider responses or whole conversations. Keys belong in an existing connector, OS credential store or protected environment, never JSON, README, project source or a ZIP. Tell the user what defaults were saved and how to change them: “remember …”, “show my Sumi preferences”, “forget …”, “show setup again”. Scope defaults to the signed-in/local person; do not share one person's memory with another user or ship it in the reusable package.

No API spending, software downloads, publishing, runtime extensions or future approvals are implied by remembered preferences. A source/approval note records what was actually said; it is not invented evidence or unlimited authority.

## Project memory

Every film has `STUDIO.md` and `shots.json`, made by `sumi-plan.mjs new`. Existing projects keep their own equivalent records. Store brief, complete story/beat ledger, narration text and take path, chosen style/route, scene/camera/edit decisions, target and measured duration, exact approval revision, asset origins, models/settings, generation receipts, proofs, defects, review limits and next action. Link files relative to the project where possible. Preserve prior approved revisions.

On resume, read project memory before producing anything. If it is missing or incomplete, reconstruct only from evidence, label unknowns and ask when a required choice has not been made. Do not mark a plan approved or a film reviewed because an earlier unrelated draft was approved.

## Setup state

Installation and first-run welcome markers are separate. Mark them only after the relevant explanation was shown. Dependency checks are timestamped observations, not permanent readiness; rerun the read-only doctor on a new machine, relevant failure or environment change. Remembering “Voicebox selected” does not mean its models are downloaded or the server is running.

`animation_economy=selective` records an explicit preference for fewer unique assets/poses where style and story survive, with denser critical action. It is not a fixed output-fps choice or permission to cut the story.
