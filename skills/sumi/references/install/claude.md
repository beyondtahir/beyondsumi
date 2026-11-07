# Install Beyondsumi in Claude Code

This guide assumes Claude Code is already installed. If it is missing, ask the assistant to explain its official installation before you approve a download.

## The plugin way

Type these two lines into Claude Code:

```text
/plugin marketplace add beyondtahir/beyondsumi
/plugin install beyondsumi@beyondsumi
```

Start a new session and say "Use Beyondsumi". The first-time helper then welcomes you in the chat.

## The ZIP way

Start with [the shared preparation steps](shared.md); do not run commands from inside the ZIP.

1. Open the extracted Beyondsumi folder. You should see `install.py` and a folder named `skills`.
2. Open a terminal in that folder. On macOS, Finder can open a terminal at a folder; on Windows, open the folder in Explorer, type `powershell` in its address bar and press Enter. If you are unsure, show this guide to your local assistant and ask it to do this step.
3. On macOS/Linux, copy this whole line and press Enter:

```sh
python3 install.py --skills-root "$HOME/.claude/skills"
```

On Windows PowerShell, use:

```powershell
py -3 install.py --skills-root "$env:USERPROFILE\.claude\skills"
```

4. Look for the ten installed skills and the requirements report. This copies the skills and checks tools; it does not buy API usage or download voice models. If Python is missing or a skill already exists, use [the troubleshooting steps](shared.md#when-something-does-not-work).
5. Open a fresh Claude Code session and enter /sumi, or ask it to use the sumi skill. For Claude on the web or in Cowork, see [that section of the chat apps guide](chatgpt.md#claude-on-the-web-or-in-cowork).
6. Paste the first-use request from [the simple usage guide](../beginner-use.md). Expect a welcome, a capability check and choices for art, voice and sound before a film starts.
7. Claude has no image model. For Sumi Dark and Sumi Light it will ask you for access to a third-party image tool. Without one, it animates in code with Sumi Vector, at no image cost. Keep any key out of the chat.

[Official Claude Code skills documentation](https://code.claude.com/docs/en/skills). Checked 26 October 2026. See [test scope](shared.md#what-has-been-tested) before treating this as an end-to-end host certificate.
