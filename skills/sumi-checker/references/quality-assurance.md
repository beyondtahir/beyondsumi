# The quality assurance agent

One separate reviewer, who did not make the film, runs last: after the audience panel's fixes, and before the user sees the film. Use a fresh subagent if the assistant has one. Otherwise, a different person or a new session.

## What it checks

1. **The tools:** run `sumi-plan.mjs check --stage render`, `motion-check.mjs` and `drawing-check.mjs` itself, and read the results. Do not trust an earlier report. Any loosened setting, like `big_action`, `may_cut`, `travels` or `still_reason`, must be justified by what is really on screen.
2. **Every drawing:** head, both hands, feet, same person, no cut-offs, boxes or paper left behind, nothing pasted on.
3. **Logic and physics:** go through [scene logic](../../sumi-director/references/scene-logic.md) shot by shot.
4. **The user's instructions:** list every correction the user gave for this film, and confirm each one is really done in the render. Name anything still open.
5. **Story:** does it match `script.md`, and is the ending clear? Is every line in the picture and in the mix?
6. **Sound:** music and effects are present, and a transcription of the mix reads back every line.
7. **The panel:** were all viewers' problems fixed or answered?
8. **Lip-sync:** if it is on, does each visible speaker's mouth open with the first sound and close at pauses? Is the narrator never moving a character's mouth?
9. **Cost:** is the spend recorded, and does it match what the user was told?

## Its answer

Write `out/QA.json`, with `film_sha256` copied from `out/audience/film.sha256`: `{ "status": "pass" or "fail", "film_sha256": "", "checked": [...], "problems": [{ "shot": "", "problem": "", "owner": "" }], "could_not_check": [...] }`.

It sends failures back to the role that owns them. It never fixes things itself, and never passes a film to be kind. It says what it could not check, such as watching at speed or hearing. A person still approves the film.
