# Install Beyondsumi in Gemini CLI

This guide assumes Gemini CLI is already installed. If it is missing, ask the assistant to explain its official installation before you approve a download. Start with [the shared preparation steps](shared.md); do not run commands from inside the ZIP.

1. Open the extracted Beyondsumi folder. You should see `install.py` and a folder named `skills`.
2. Open a terminal in that folder. On macOS, Finder can open a terminal at a folder; on Windows, open the folder in Explorer, type `powershell` in its address bar and press Enter. If you are unsure, show this guide to your local assistant and ask it to do this step.
3. On macOS/Linux, copy this whole line and press Enter:

```sh
python3 install.py --skills-root "$HOME/.gemini/skills"
```

On Windows PowerShell, use:

```powershell
py -3 install.py --skills-root "$env:USERPROFILE\.gemini\skills"
```

4. Look for the ten installed skills and the requirements report. This copies the skills and checks tools; it does not buy API usage or download voice models. If Python is missing or a skill already exists, use [the troubleshooting steps](shared.md#when-something-does-not-work).
5. Open a fresh Gemini CLI session. Run gemini skills list --all and check for sumi, sumi-vector, sumi-voicebox and sumi-elevenlabs. Ask Gemini to use sumi. A Gemini model in a browser is a different route.
6. Paste the first-use request from [the simple usage guide](../beginner-use.md). Expect a welcome, a capability check and choices for art, voice and sound before a film starts.

[Official Gemini CLI skills documentation](https://geminicli.com/docs/cli/skills/). Checked 26 October 2026. See [test scope](shared.md#what-has-been-tested) before treating this as an end-to-end host certificate.
