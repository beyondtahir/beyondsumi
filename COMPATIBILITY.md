# What has been tested

Beyondsumi uses the Agent Skills folder format: plain instructions plus JavaScript tools, with Python only for installing, setup, delivery and the voice helpers. A model's name does not prove that an app can run scripts, make images or produce MP4 files, so repeat the first-use check on your computer.

## Version 2 status

| Check | Result |
|---|---|
| Automated tests for the planner, sheet cutter, renderer, checker, Vector engine, sound mixer, captions, setup and delivery | Passed on macOS |
| Cut, render and check on a real AI-drawn 12-frame sheet | Passed on macOS |
| A 20-second Sumi Vector film, The Lantern, drawn at 24 drawings a second | Passed on macOS |
| Installer on a clean folder | Passed on macOS |
| Works on its own: installed from the package into an empty home with no other skills, then the 20-second Sumi Vector example drawn, rendered and checked in full | Passed on macOS |
| Tools needing only standard Node and Python, with no npm or Python packages | Checked by scanning every import |
| Complete films made with version 2 | Three short films on macOS in Claude Code: Sumi Dark and Sumi Light with OpenAI images and ElevenLabs voices, and Sumi Vector with no images |
| Codex, in its default sandbox: found the skill, installed it from the one pasted message, ran the first-time helper and guided step by step | Passed on macOS |
| Codex: one Sumi Dark sample from its own image model, with no key | Passed on macOS |
| Codex's default sandbox stops the browser from starting, so the helper asks for Full access and does not fake a film | Passed on macOS |
| A complete film made inside Codex with Full access | **Not done yet** |
| Plugin install in a clean Codex, with all ten skills | Passed on macOS, from a local copy |
| A new person's first chat in Codex: welcome, six steps, tool check, then one question at a time | Passed on macOS |
| Claude Code plugin files | Passed `claude plugin validate`; install not run |
| ChatGPT Chat: Node, FFmpeg, Python and an image model work. Chromium starts, but blocks opening files and has no WebGL | Checked in one account, November 2026 |
| ChatGPT Work on the web: Node, FFmpeg, Python, image model and GitHub download work. Chromium could not start | Checked in one account, November 2026 |
| Tools when a hosted browser blocks opening files, as ChatGPT's does | Simulated on macOS: all pass except Sumi Vector |
| The package uploaded to ChatGPT, or a complete film made there | **Not done yet** |
| Other assistants | **Not done yet** |
| Voicebox narration inside a version 2 film | **Not done yet** |
| A film longer than a minute | **Not done yet** |
| Sumi Vector with no narration | Passed on macOS: The Lantern |
| Windows and Linux | **Not tested** |
| Bundled music reviewed by ear | **Not done yet** |
| Free sound effects listened to | **Not done yet** |
| Lip-sync timing and render with test mouths | Passed on macOS. Not yet used in a finished film |
| Vertical films | A test render was the right size. Sumi Vector is wide only |

Results are not carried over from version 1, because the tools and renderer are new.

## Assistants

Install guides exist for Codex, Claude Code, Kimi Code CLI, Gemini CLI, OpenClaw, Hermes and chat apps. They are not certificates that a film will render there. An assistant needs file access and the ability to run Node, a browser and FFmpeg to finish a film. Without that, it can write, direct and give prompts, and you run the tools yourself.

Never replace a "not done yet" result with "tested" because a folder copied successfully.
