# First-time helper

This helper guides anyone new to Beyondsumi, from installation to their first film, in any assistant. A ZIP or plugin cannot run by itself, so run this in the chat the first time the user asks for Sumi, even if they go straight to asking for a film. Show the welcome and the six steps in the chat first, then continue with what they asked.

Read [memory](memory.md) first with `python3 scripts/first_run.py`. If `welcome_needed` is false, do not repeat this tour. Reuse saved choices, recheck only the tools this film needs, and go to step 8.

## How to help

- Give one action at a time, and say what success looks like.
- When something fails, explain it in plain words and help fix it. See [when something does not work](install/shared.md#when-something-does-not-work).
- Do not start a film, a paid sample or a download just because setup was run.
- Never ask for a key in chat.

## The steps

1. Show `assets/WELCOME.txt` in the user's language. Then mark it: `python3 scripts/sumi_memory.py mark first_run --version 2.0.0`. If the app does not allow saving there, carry on, and use a folder in the project: `python3 scripts/sumi_memory.py --state-dir FOLDER mark first_run --version 2.0.0`.
2. Run `python3 scripts/first_run.py`. It only reads and reports. Then check what image tools this assistant really has, because Python cannot see them. Run `node tools/browser-check.mjs` too, because a browser can be installed and still be blocked. Report what is available, missing or unknown, in plain words. A failed check means unknown, not missing.
3. For anything missing, explain what it is for, whether it is free, its official source, its download size and where it will go. Group related requests, install only with the user's permission, and confirm it works. Reuse what is already installed. Missing tools never stop the user writing a story. If the browser is blocked in Codex, explain that drawing and checking the film need it, and ask the user to give this project Full access. See [setup](setup.md).
4. Settle the image route. See [image routes](../../sumi-artist/references/image-routes.md). In ChatGPT or Codex, use the best image model the app has. In Claude, or anywhere with no image model, ask the user to give access to a third-party image tool for Dark and Light, or to animate in code with [Sumi Vector](../../sumi-vector/SKILL.md), which needs no images. Be honest that Vector has simpler faces.
5. Offer one sample image in the style the user wants, or one image comparing the styles. Say what it costs first if it is paid.
6. Ask about narration in this order: **Voicebox, ElevenLabs, the user's own recording, or no narration**. Every film has library music and sound effects. Load only the chosen guide. Details are in [Sound](../../sumi-sound/SKILL.md).
7. Save only choices the user wants remembered, in [memory](memory.md). Never save keys there.
8. Ask only what is still missing: the story, language, length and screen shape. Then create the project and start with the [Writer](../../sumi-writer/SKILL.md).

For a complete beginner, use [the simple guide](beginner-use.md).
