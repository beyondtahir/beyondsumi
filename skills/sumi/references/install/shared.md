# Before installation

Beyondsumi is a set of instructions, helpers and assets used by an AI assistant. It is not a separate chat model. Install the assistant you want separately; using a model with the same name inside another app does not use that assistant's skill folder.

1. Download the Beyondsumi user ZIP supplied with the repo/release.
2. Extract it. Open the extracted folder that contains `install.py` and `skills`. Do not add any personal voice or key files.
3. Choose the guide for your app: [Codex](codex.md), [Claude Code](claude.md), [Kimi](kimi.md), [Gemini CLI](gemini.md), [OpenClaw](openclaw.md), [Hermes](hermes.md) or [ChatGPT/chat apps](chatgpt.md).
4. If using a terminal, first check `python3 --version` (macOS/Linux) or `py -3 --version` (Windows). If Python is absent, ask for the official installation instructions and approve that separately. Do not paste an API key into chat or terminal commands.
5. Run the one installer command in your assistant's guide, or ask the assistant to do it after reading this folder. A success shows all ten skill names. The read-only report shows found/missing/unknown tools; missing tools get a purpose and a next step, not a silent installation.
6. Open a fresh chat and ask it to use sumi. If it cannot, give the exact path to `sumi/SKILL.md` in its skills folder.

## When something does not work

- **Cannot find install.py:** you are in the wrong folder or still inside the ZIP. Extract it, then open the folder containing that exact file.
- **Python command not found:** install Python from its official source with permission, then retry the command. On Windows check the `py -3` launcher.
- **Existing skill preserved:** the installer stopped safely. Ask the assistant to compare the existing copy. Use the same command with `--replace` only for an intended backed-up upgrade; it is not needed on a new install.
- **Skill not listed:** restart the assistant, check for `skills/sumi/SKILL.md` in the documented destination and check whether another higher-priority copy shadows it. Do not copy the entire suite as one skill.
- **No image tool:** connect an image-capable tool, supply art, or use prompt-only mode. No video-generation API is required.
- **No narration provider:** choose your own recording or music/effects only. Optional voice setup can happen later.
- **Cannot make MP4:** ask for the specific missing Node, browser or FFmpeg and its official setup. Writing a story remains possible; do not describe HTML or a screenshot as a finished MP4.

## What has been tested

The suite's local installer, backup behavior, source metadata and read-only first-use checks have automated tests. Host-specific destinations can be exercised in isolated test folders without modifying a user's real configuration. A filesystem-layout test is not a live assistant, cloud upload, every-OS or completed-film test. Only label a native discovery or end-to-end run passed when that host actually performed it; missing assistants remain pending until tested on that machine. See the release's compatibility report for the recorded scope.
