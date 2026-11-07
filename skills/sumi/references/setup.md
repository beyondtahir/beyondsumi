# Setup

Check first, without changing anything:

```bash
python3 scripts/sumi_setup.py doctor
```

Explain what is available, missing or unknown. Ask before installing anything.

## What is needed

| Tool | Purpose | Cost | How to get it |
|---|---|---|---|
| Python 3.9+ | Runs the installer, setup and voice helpers | Free | [python.org](https://www.python.org/downloads/) |
| Node.js 22+ | Runs the planner, cutter, renderer and Checker, with no packages to install | Free | [nodejs.org](https://nodejs.org/) |
| Chrome, Edge or Chromium | The tools use it to draw and capture frames | Free | Reuse one you have |
| FFmpeg, ffprobe | Video and audio | Free | [ffmpeg.org](https://ffmpeg.org/download.html) |
| An image route | Drawing | Depends on the tool | See [image routes](../../sumi-artist/references/image-routes.md) |
| A voice route (optional) | Narration | Voicebox is free; ElevenLabs is paid | See [narration](narration.md) |

No npm packages are needed. Sumi Vector also needs WebGL in the browser.

## Assistants that cannot run code

Some chat apps can write and plan but cannot run tools on a computer. There, the Writer, Director and Artist still work, and the assistant gives exact prompts and commands. The user runs the cutter and renderer on their own computer, or in an assistant that can run Node and a browser.

Never describe a screenshot or a plan as a finished MP4.

## Sound

The bundled music needs FFmpeg to read it. See [the sound library](sound-library.md).
