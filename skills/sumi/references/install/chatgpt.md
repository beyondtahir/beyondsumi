# ChatGPT and Codex

Beyondsumi works in ChatGPT and Codex through the same skill folders and the same plain files as Claude. What you can make depends on what your app can really do, not on the model's name.

## 1. Ask the app what it can do

Paste this first:

> Can you read this extracted folder, run Node and FFmpeg here, make images, and give me back a real MP4? Run a small test of each and tell me what actually worked.

## 2. Choose your route from the answer

| The app can | Use | Styles |
|---|---|---|
| Run code and make images, like the ChatGPT desktop app with local tools or Codex | Follow [the Codex guide](codex.md) to install, then the [normal film flow](../production-flow.md) | Sumi Dark, Sumi Light and Sumi Vector |
| Run code but not make images | The same install. Make images in ChatGPT yourself, save them in the film folder and record them with `sheet-image.mjs --record`, or use your own image key | All three, or Sumi Vector for no image cost |
| Run code on its own hosted computer, like ChatGPT Chat or Work | [Use ChatGPT Chat or Work](#the-chatgpt-website-and-work) | Writing, planning and images. Finish the film in Codex or Claude Code unless `browser-check.mjs` passes there |
| Only chat, with no way to run code | Ask for the story, shot plan and exact image prompts. Then finish the film on your computer with an assistant that can run code | Planning only. It cannot render the film |

## 3. Choose the image model

ChatGPT and Codex use the best image model they have, so no third-party image tool is needed. Check which image models you have, use the best one, and make one test image before any sheets. Medium quality on large sheets is the sensible default when you pay per image. The [money rules](../../../sumi-artist/references/image-savings.md) apply to every model.

## 4. Start the film

Paste the first-use request from [the simple usage guide](../beginner-use.md). Check that the assistant really reads `skills/sumi/SKILL.md` and reports its tools.

## Good to know

- Do not rely on an "Install" button unless your account actually shows one.
- Every step is saved in plain files, so you can plan in one assistant and finish in another.
- Claude Code has [its own guide](claude.md). For Claude on the web or in Cowork, see the next section.

## The ChatGPT website and Work

We tested one account in November 2026. Accounts differ, so run the check in step 1 first.

| | ChatGPT Chat | ChatGPT Work on the web |
|---|---|---|
| Node, FFmpeg, Python | Yes | Yes |
| Its own image model, saved to a file | Yes | Yes |
| Chromium, which the drawing and render tools need | Starts, but blocks opening files, and has no WebGL | Did not start: its computer blocks a connection Chromium needs |
| Can download from GitHub | Not tested | Yes |

So today, use these for writing, planning and making images, then finish the film in Codex or Claude Code, because every step is saved in plain files. A complete film has not been made in either. If your Work account has local computer access to your Mac, its tasks may be able to use your own Chrome, but we have not tested that.

**To add Beyondsumi to Work,** so it shows when you type `@`:

- **Skill upload:** in Work, open Plugins, then Skills, Create, Upload from your computer. Upload one skill folder at a time, starting with `sumi`. If you do not see this, ask `@skill-creator` to install it.
- **Workspace plugin:** an owner or admin can open Admin, Plugins, Add, Import marketplace, and enter `beyondtahir/beyondsumi`.
- **The desktop app:** it supports local plugins, as in [the Codex guide](codex.md).

**To try it in one chat,** drag the ZIP in and paste:

> Unpack this ZIP. Then read skills/sumi/SKILL.md and start the first-time helper from its folder. Run its tools here on your own computer. I am a complete beginner, so guide me one step at a time, and use your own best image model.

Download your project files after each step, because files in a chat may not last. Voicebox and your saved ElevenLabs key are not available there.

Sources: [Skills in ChatGPT](https://help.openai.com/en/articles/20001066-skills-in-chatgpt), [Build plugins](https://learn.chatgpt.com/docs/build-plugins).

## Claude on the web or in Cowork

Use your account's custom skill upload, one skill folder at a time, starting with `sumi`. Then repeat the check in step 1. If it can't run Node and FFmpeg, it can still write the story, shot plan and image prompts. Finish the film with Claude Code or Codex on your computer, because every step is saved in plain files. Claude has no image model, so give it access to a third-party image tool for Sumi Dark and Sumi Light, or animate in code with Sumi Vector.

Sources: [OpenAI skills](https://learn.chatgpt.com/docs/build-skills), [local versus ChatGPT projects](https://learn.chatgpt.com/docs/projects).
