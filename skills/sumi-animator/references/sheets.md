# Drawing sheets

One image holds many separate drawings. It saves a lot of generation, and it keeps a character steadier than asking for each frame alone, because everything is drawn together.

## Sheet size decides sharpness

Each drawing gets only a share of the image.

| Sheet | Grid | Each drawing |
|---|---|---:|
| 1536×1024 | 4×3 | 384×341 px: soft, good for testing movement only |
| 2048×2048 | 4×3 | 512×682 px |
| 3840×2160 | 4×3 | 960×720 px: good, if the tool allows this size |
| 3840×2160 | 6×4 | 640×540 px |

Check what the chosen tool allows, and read [spend less on images](../../sumi-artist/references/image-savings.md). A character only fills part of the screen, so drawing the character on a separate sheet from the background keeps it sharper.

## Key pose sheet

Use 4 to 6 cells, showing the main poses of one action. It is cheap, and it is where the acting gets fixed.

## In-between sheet prompt

Fill in the style base from the [style guide](../../sumi-artist/references/styles/dark.md), and attach the character sheet and key poses if the tool accepts references.

> A hand-drawn traditional animation sheet: exactly 12 separate sequential animation frames in a grid of 4 columns and 3 rows, read left to right, top to bottom. Every panel is the same size with the same fixed camera, framing, character size and position, like an old-school animator drawing on a registered peg bar. Each panel is a new drawing in [STYLE BASE]. One character only: [CHARACTER, exactly as on the character sheet], on plain paper, with [GROUND LINE] in the same place in all panels. The action, one small continuous movement: [FRAME BY FRAME DESCRIPTION]. Each frame shows only a small change from the one before, starting slowly and stopping slowly, with hair and cloth following a little later. Bare paper gutters between panels. No panel numbers, no text, no borders, no arrows.

## Fit the figure inside the panel

Add this to every prompt: *"The whole figure, head to feet and both hands, fits inside each panel with a wide empty margin on all sides. Nothing touches the panel edge."* Cut a standing character with `--align feet`, which locks the feet in both directions. Then run `drawing-check.mjs`.

## Before cutting, count the panels

Image models do not always draw the grid you asked for: a 5×4 request can come back as 4×5. Look at the sheet, and pass the real `--cols` and `--rows`. A wrong grid can still pass every tool, so look at the cut drawings too.

## After cutting, look for paper

If a sheet has bright gutters and cream paper, the cutter can treat the paper as ink and leave a box: raise `--threshold`. Paper can also stay trapped inside a shape, like the frame on a train's roof: use `--holes`. Always check cut-outs over a mid-grey background, because white on white hides it. `drawing-check.mjs` fails a box.

## Cutting options

- `--align feet` locks a standing figure's feet. `--align centre` lines up hands and close-ups by their middle, which removes jumps at row joins.
- `--max-shift .2` lets the alignment move a drawing further, when the cutter reports drawings it could not line up. Look at the result.
- `--panels` finds real panels on edge-to-edge sheets, like backgrounds, whatever the gutter colour.
- `--gutters` finds the real gap between rows when figures sit on plain paper.
- `--holes 2500` also clears paper trapped between fingers or under hair, in shapes of at least that many pixels. Check that eyes stay white.
- `--threshold` raises how different from paper a colour must be to count as ink. Raise it if a white halo stays around a figure.

Skip a bad drawing with `sequence`. Only a real drawing counts, so never hide one with a blur or blend.

## When feet spill into the next panel

Image models do not always space rows evenly. If `drawing-check.mjs` says feet touch the bottom and a sliver shows at the top of the next panel, cut again with `--gutters`, which finds the real line between rows.

## Effects need margins too

A growing shape, like a hand, smoke or a wave, spills into the next panel unless the prompt keeps it clear of the panel top. Look for flat-cut tips and stray pieces under it. Do the same for loop backgrounds: gutters can land away from the grid, so make sure no line or paper strip reaches the screen.

## Read the sheet before you trust it

Models add things you did not ask for: a person drawn into an ink wipe, or hair that changes colour in one panel. Say "abstract only, no people" for effects, and skip a bad drawing with `sequence`. Do not reuse a loop's whole sheet if rows differ: use one row, back and forth, so a background stays steady.

## Watch the joins between rows

An image model tends to drift at the start of a new row, so a body or prop can shift between the last panel of one row and the first of the next. Compare the shape-change numbers in `motion-check.mjs`: a step at about twice its neighbours is a visible small pop. Fix it with a shorter action on each sheet, a held prop, or a redraw.

## How many drawings

See [smoothness](smoothness.md). Budget per action, and check [logic and physics](../../sumi-director/references/scene-logic.md) before ordering.

## Good sheets

- **One small action per sheet.** Twelve drawings is about one second, so a whole drink is too much for one sheet. Split it into lift, sip and lower.
- **Describe each frame,** not just the start and end.
- **Chain the sheets:** the last frame of one is the first reference for the next.
- **A ground line helps** `--align ground` keep the frames steady.

## Loop sheets

For smoke, rain, fire or a walk, ask for a cycle whose last frame leads back into the first. Set `"loop": true` and `"cycle"` in the shot plan.

## Transition sheets

For Dark ink wipes and Light sketch changes, draw 8 to 12 full-frame cells where the ink or pencil completely covers the picture in the middle cells. Cut them with `--cutout`, so the picture shows through at the start and end. The renderer places the middle on the scene change, so the switch is hidden.

## Backgrounds that animate (Sumi Light)

Draw these on their own sheets, simpler than the character, and without `--cutout`. Fewer details mean less flicker.

## Honest limits

AI drawings drift from frame to frame. Small differences feel hand-made, but a changing face or costume flickers. When a frame drifts too far, redraw it rather than hiding it.
