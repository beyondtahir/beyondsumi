# Spend less on images

The rule stays the same: every movement is a real drawing. These are ways to pay for fewer images, never ways to fake movement.

## What we measured

One test sheet with one prompt, November 2026, using the usage OpenAI's API reports at $30 per million output tokens:

| Model | Sheet | Tokens | Cost | Each drawing |
|---|---|---:|---:|---|
| `gpt-image-2.5-flare` | 1536×1024, high | 1,372 | $0.04 | 384×341, soft |
| `gpt-image-2.6-flare` | 1536×1024, high | 1,353 | $0.04 | 384×341, soft |
| `gpt-image-2.5-sunburst` | 1536×1024, high | 1,372 | $0.04 | 384×341, soft |
| `gpt-image-2.5-flare` | 3840×2160, high | 3,336 | $0.10 | 960×720 in a 4×3 grid |

The same model at 3840×2160 **medium**, with a reference, cost $0.04 against $0.11 at high. Lines are softer and colour varies a little, but it is good for action sheets. Keep high for character sheets and close-ups.

Prices and models change, so test one image in your own account first. Width and height must divide by 16.

## The money rules, for any image model

These apply to every tool and model, in any assistant.

1. **Say the count and the cost before paying,** and tell the user the real spend afterwards. Count everything, including tests and redraws.
2. **Measure, do not assume.** Generate one sheet at the tool's cheaper setting and work out its real price. A published price may be for a different size or quality.
3. **Biggest sheet the tool allows, at its middle quality, for action.** Use its top quality only for character sheets, close-ups and key paintings. If the sheet is small, use fewer panels, so each drawing stays sharp.
4. **Use the model you started with for the whole film.** Changing models mid-film changes the look, and redraws cost more than the saving.
5. **Check logic before ordering.** Most money is lost on redraws: read [scene logic](../../sumi-director/references/scene-logic.md), and look at one sheet per action before ordering the rest.
6. **Never pay twice:** keep a record of each request, and reuse the file. `sheet-image.mjs --record` keeps that ledger for images from any tool.
7. **Set a limit.** `sheet-image.mjs --limit 5` stops before paying once the project has spent $5. With another tool, keep count and stop to ask.
8. **Use free routes when you can.** Images from a tool the user already pays for are good for single pictures like character sheets and backgrounds. Use batch pricing when you can wait.

`node ../sumi/tools/sumi-plan.mjs budget shots.json --price 0.04 --price-high 0.11` gives the estimate. Pass the prices you measured.

## The order of savings

1. **Use the biggest sheet.** 4K cost 2.4 times as much as 1536×1024 for five times the pixels. A sheet you can use beats a cheap one you must redraw.
2. **Keep the character off the background.** Draw the character on plain paper. A background redrawn inside every cell wastes pixels, and it shifts from cell to cell.
3. **Paint one background and reuse it** across every shot in that place. Only draw it frame by frame where the style needs that, and loop it.
4. **Loop what repeats.** Flame, smoke, rain, mist and walking are cycles of 8 to 24 drawings.
5. **Draw on twos.** 12 drawings a second is enough for calm acting. Keep 24 for fast action.
6. **Hold with a reason.** A held pose is a choice the Director makes, and it needs a `hold_reason`.
7. **Reuse approved drawings.** The same folder used in many shots is paid for once, and `sumi-plan.mjs budget` counts it once. A plain flip of a drawing is fine for someone walking the other way.
8. **Share the character sheet.** Attach it as a reference to every sheet, so fewer sheets are rejected.
9. **Pay in steps.** Character sheet, then key poses, then one action sheet, and look at each at full size. Only then order the rest of the shot. Most waste comes from ordering a batch before seeing one.
10. **Never pay twice.** `sheet-image.mjs` keeps a ledger: the same request gives back the saved file for free. If your tool has no ledger, save each prompt beside its image and reuse the file.
11. **Use batch pricing for big orders.** OpenAI's Batch API lists half the price, if you can wait for the results. Do not use it for tests.

## Held drawings are smoother, not cheaper-looking

An image model redraws everything in every panel, so a character who should stand still shimmers. Do what old animators did: **hold one drawing of the body and redraw only what moves.** Give the hold a `hold_reason`, and put a flame, smoke, rain or cloth on their own looping sheets. Those sheets can be reused across the whole film. Save full redraws for real movement, like a turn, a walk or a run.

## Check these at full size

- **Effects on black:** push the blacks down and fade the cell edges, or a faint box shows under `screen` blending.
- **Neighbouring cells:** a figure that touches its panel edge leaves a sliver in the next cell. Ask for a clear margin around the figure, and redraw if it touches. Never paint over or inset a sliver: it cuts hair and feet. `drawing-check.mjs` finds these.

## How to choose a grid

| Grid on 4K | Drawings | Each drawing | Use for |
|---|---|---|---|
| 4×3 | 12 | 960×720 | Close-ups and faces |
| 5×3 | 15 | 768×720 | Most acting |
| 5×4 | 20 | 768×540 | Full figures, loops, effects |

## Tell the user before paying

Run `node ../sumi/tools/sumi-plan.mjs budget shots.json --cells 15`. Multiply the images by the measured price, then give the count and the total. After making them, `node ../sumi/tools/sheet-image.mjs --total` gives the real spend.
