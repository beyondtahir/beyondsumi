# How a film gets made, start to finish

Follow these steps in any assistant. Skip nothing, and ask the user before anything is paid for.

## 1. Choose by assistant

First find out what this assistant can really do: read and write files, run Node and FFmpeg, make images. A model's name does not prove any of it.

| The assistant can | Offer |
|---|---|
| **Make images, like ChatGPT or Codex** | Use the best image model the app has, and test one image first. All three styles, if `browser-check.mjs` passes. With no WebGL, Sumi Dark and Sumi Light only. If the browser is blocked, as in ChatGPT Work, make the plan and images there and finish the film in Codex or Claude Code |
| **Run code but not make images, like Claude Code** | Ask for access to a third-party image tool for Sumi Dark or Light: a connector, the user's own key through `sheet-image.mjs`, or images they make elsewhere and upload. Without access, animate in code with Sumi Vector for free |
| **Neither, like a chat with no tools** | Prompt-only: write the story, plan and exact prompts, and the user runs the tools |

Everything is saved in plain files, so a film can move between assistants at any step. Images from any tool are recorded with `sheet-image.mjs --record`, and the [money rules](../../sumi-artist/references/image-savings.md) apply to every model.

## 2. The studio, in order

1. **[Writer](../../sumi-writer/SKILL.md):** a clear story with a clear answer, in the story's own language and script.
2. **[Director](../../sumi-director/SKILL.md):** sees every scene first, with `scene_logic` and `must_see` in `shots.json`, and varied, cinematic shots. See [scene logic](../../sumi-director/references/scene-logic.md).
   **If the film has speech,** [Sound](../../sumi-sound/SKILL.md) makes and approves the voice takes now, because drawings and lip-sync follow the final recording.
3. **[Artist](../../sumi-artist/SKILL.md):** characters and backgrounds. Does each picture make sense in real life?
4. **[Animator](../../sumi-animator/SKILL.md):** sheets cut into real drawings, with [enough of them](../../sumi-animator/references/smoothness.md) where things move.
5. **[Sound](../../sumi-sound/SKILL.md):** music, effects and the final mix, around any voice takes already made. See below.
6. **[Checker](../../sumi-checker/SKILL.md):** the tools, every drawing, and logic and physics.
7. **[Audience panel](../../sumi-checker/references/audience-panel.md):** five viewers judge it cold. Fix what they find, and run them again.
8. **[Quality assurance](../../sumi-checker/references/quality-assurance.md):** a separate reviewer checks the final render, including every instruction the user gave.
9. **The user** watches it with sound and approves it. Only then is it ready.

Whenever the user corrects something, add it to this skill as a rule, and as an automatic check where possible.

## 3. Sound

Every film has background music and sound effects. For voice, use **Voicebox** first, with **ElevenLabs** as the alternative, or the user's own recording, or no narration. Follow [sound routing](sound-routing.md).

## 4. Sumi Dark

Always use vivid brush red, plus one more vibrant colour, in the drawings themselves. See [the Dark guide](../../sumi-artist/references/styles/dark.md).

## 5. Tools

| Tool | Does |
|---|---|
| `vector-capture.mjs` (in `sumi-vector`) | Captures Sumi Vector drawings |
| `sound-effect.mjs`, `sound-mix.mjs` | Make effects, and mix voice, music and effects |
| `sumi-plan.mjs` | Checks the plan and estimates cost |
| `sheet-image.mjs` | Makes images, records real spend and never pays twice. `--record` tracks images from any tool |
| `sheet-cut.mjs` | Cuts sheets into drawings |
| `sumi-render.mjs` | Renders the film |
| `motion-check.mjs`, `drawing-check.mjs` | Find jumps, frozen frames, cut-offs and leftover boxes |
| `review-frames.mjs` | Full-size frames and a checklist |
| `audience-pack.mjs` | Prepares the audience panel |
