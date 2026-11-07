---
name: sumi
description: "Make Japanese Sumi animated films and videos frame by frame, in Sumi Dark, Sumi Light or Sumi Vector. Runs a small studio: writer, director, artist, animator, sound and checker. Use for Beyondsumi, Sumi animation, animated stories, or ink, brush and pencil-sketch animation."
---

# Beyondsumi

Version 2.0.0. A small animation studio that works like an old-school hand-drawn team. One assistant plays each role in turn. Each role saves its work as a file, so any assistant can continue from those files, even in a new chat.

## The one rule

**Every movement is drawn.** Motion comes from separate drawings shown one after another. Never warp, morph, rig or bend a picture to fake movement, and never treat a slow zoom on a still image as animation. A character may hold still only when the Director gives a story reason.

## The three styles

All three are Japanese style, and all characters look Japanese anime. This is the drawing style; the story can be set anywhere.

| Style | Look | Stories | Depth | Scene changes |
|---|---|---|---|---|
| **Sumi Dark** | Black and white brush, always with vivid red and one more vibrant colour | Horror, mystery, adventure | Parallax from separate images | Drawn ink, or a hard cut |
| **Sumi Light** | Clear, dark colour pencil sketch | Children's stories, love stories | No parallax; the background is animated with drawn frames | Drawn in sketch, or a cut |
| **Sumi Vector** | Clean lines and flat colour on painted skies, drawn in code with no images | Any story, and anyone without an image tool | No parallax | Clean cut or dissolve |

## Guide the user, always

Treat every user as a complete beginner unless they say otherwise. Anyone new gets the [first-time helper](references/first-run-flow.md). Every film, every time, follows the [film guide](references/film-guide.md): say where you are, what this step does, what it costs and exactly what they can reply.

## The studio, in order

Load only the role you are working as, along with the film guide.

| Step | Role | Skill | Saves | The user approves |
|---|---|---|---|---|
| 1 | Writer | [sumi-writer](../sumi-writer/SKILL.md) | `script.md` | The words |
| 2 | Director | [sumi-director](../sumi-director/SKILL.md) | `shots.json` | The scenes, style and drawing count |
| 3 | Artist | [sumi-artist](../sumi-artist/SKILL.md) | `art/` and `sheets/` | The look and characters |
| 4 | Animator | [sumi-animator](../sumi-animator/SKILL.md) | `frames/` and `out/` | Key poses, then the moving shot |
| 5 | Sound | [sumi-sound](../sumi-sound/SKILL.md) | `sound/` | The mix |
| 6 | Checker | [sumi-checker](../sumi-checker/SKILL.md) | `out/motion-check.json` | The finished film |

**When a film has speech, the voice comes before the drawings.** Sound makes and approves the voice takes straight after the Director, so the drawings and mouths follow the real recording and nothing is paid for twice. Step 5 then adds music and effects.

Work moves forward only after approval, and goes back when a role finds a problem. If the Animator finds a shot cannot work in the planned drawings, it goes back to the Director. It is never quietly faked. Prove the hardest shot first, before making the whole film.

## Two ways to draw

- **Images:** the Artist and Animator use an image tool, with drawings on HD sheets.
- **Vector:** [Sumi Vector](../sumi-vector/SKILL.md) is its own style. The assistant paints every drawing with JavaScript, at no image cost and up to 24 drawings a second. Sumi Dark and Sumi Light need images.

ChatGPT and Codex use the best image model they have. Claude has no image model, so it asks the user for access to a third-party image tool, or animates in code with Sumi Vector. See [image routes](../sumi-artist/references/image-routes.md).

The Director records the choice as `"art_route"` in `shots.json`.

## Where to start

Run commands in the film's folder, not the skill's. The guides write `../sumi/tools/NAME.mjs` to keep them short. Use the full paths listed in the film's `STUDIO.md` instead. For the first command, `sumi-plan.mjs new`, use the `tools` folder beside this file.

- **First use:** follow the [first-time helper](references/first-run-flow.md). Check with `python3 scripts/first_run.py`: if `welcome_needed` is true, this person is new, so show the welcome and six steps in the chat before anything else, even if they asked straight for a film.
- **New film:** `node tools/sumi-plan.mjs new FOLDER --style dark --title "Title"`, adding `--shape vertical` for a vertical film, then start with the Writer and follow the [film guide](references/film-guide.md). If the user already has a finished script they want kept word for word, the Writer only checks it.
- **Continuing a film:** read the project's `STUDIO.md`, then continue from the first step without an approval.
- **A change to a finished film:** go to the role that owns it, and redo only what it affects.
- **Delivery:** follow [delivery](references/delivery-dashboard.md).

## Spending and honesty

- Before any paid image or voice work, show what will be made and how many. Use `node tools/sumi-plan.mjs budget shots.json`. A connected key is not permission to spend.
- If a tool cannot run, stop and tell the user why in plain words. Never build your own drawing or render tool, skip the checks or change the look to get round it.
- Never write a claim you did not check. Do not say a film passed unless the Checker ran, and do not say it looks or sounds good unless a person watched and listened.
- No AI labels, watermarks or technical text in the exported film. Follow the rules of the platform where the user publishes it.
- Keep keys and private recordings out of project files and out of this package. Personal choices live in [external memory](references/memory.md).

## The full process

Follow [how a film gets made](references/production-flow.md), including the choices for each assistant, sound routes, the audience panel and quality assurance.
