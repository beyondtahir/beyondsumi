# Image routes

Beyondsumi works with any image tool. Check what is really available, because an assistant's name does not prove that it can make images.

| Route | When |
|---|---|
| **The assistant's own image tool** | It has a callable image tool, as ChatGPT and Codex do |
| **An image API or connector the user has** | The user chooses the tool and model. Save the choice in [external memory](../../sumi/references/memory.md), never in this package |
| **Images the user uploads** | There is no image tool, or the user draws or generates elsewhere |
| **[Sumi Vector](../../sumi-vector/SKILL.md)** | The third style, and the way to work with no image tool. The assistant paints every drawing with JavaScript, at no image cost |
| **Prompt-only mode** | The assistant cannot make images. It gives exact prompts and grid sizes, and the user brings back the images |

## Choose by assistant

- **ChatGPT or Codex:** use the best image model this app has, with no extra tool or key. Do not lock in a model name. Check which models this user really has, choose the best one, test one image, then follow the [money rules](image-savings.md). The app may save images in its own folder, so copy each one into the film's `art/` or `sheets/` folder, and record it with `sheet-image.mjs --record`. If the app cannot make images in this session, treat it like Claude below.
- **Claude, or any assistant with no image model:** it cannot draw Sumi Dark or Sumi Light by itself. Ask the user one question: give access to a third-party image tool, or animate in code with [Sumi Vector](../../sumi-vector/SKILL.md)?
  - **Access given:** use their connector, or their image key saved outside the chat. Test one image, show the plans below, and let the user choose before anything is paid for. `sheet-image.mjs` calls OpenAI directly. Record images from any other tool with `sheet-image.mjs --record`.
  - **No access:** make the film in Sumi Vector. Say plainly that it costs nothing for images and has simpler faces. Never pretend to have made images.

## Budget plans for an assistant with no image model

| Plan | How | Rough cost per minute of film |
|---|---|---|
| **Free** | [Sumi Vector](../../sumi-vector/SKILL.md), drawn in code | $0 |
| **Saver** | Characters and backgrounds made by the user in an image tool they already pay for, and action sheets at the biggest size, medium quality | About $1 |
| **Standard (default)** | The user's own image key, biggest size, medium quality | About $1.60 |
| **Best** | The user's own image key, biggest size, high quality | About $4.40 |

These come from three 30-second films, November 2026, at about 20 sheets for 30 seconds and $0.04 or $0.11 a sheet on GPT Image 2.5 at 4K. More movement costs more. Measure one image first, and give the user a real estimate with `sumi-plan.mjs budget`.

An upscaler is not part of any plan yet. It might allow smaller, cheaper sheets, but it invents detail that may flicker from drawing to drawing, so test it on a whole sheet first.

## What makes a tool suitable

Test one image before planning a film around a tool.

- **Sheet size:** a bigger sheet means sharper frames. See [sheets](../../sumi-animator/references/sheets.md).
- **Reference images:** a tool that accepts a reference keeps characters far steadier from sheet to sheet. Without one, expect more redraws.
- **Cost:** check the real price of one image in the user's account before estimating a film. See [spend less on images](image-savings.md).

Keys never go in chat, project files or this package.
