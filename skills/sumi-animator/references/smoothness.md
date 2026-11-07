# Smoothness without redrawing everything

Viewers see steps when too few real drawings are stretched over too much time. Passing a check is not the same as being smooth. Add real drawings where things move, and keep everything that already works.

## Where steps come from

- **Big changes per drawing.** Fifteen drawings for a whole lift and turn means each one jumps.
- **Drawing on twos during fast action.** Use 24 a second for anything quick.
- **A hold, then a sudden start.** Begin with a few drawings of slow movement, and settle at the end.
- **Row joins.** A model drifts at the start of a new row of panels.

## How to add drawings

1. **Budget per action, not per shot.** A slow action needs a drawing at least every 1/12 second for its whole length. A 3-second move is 36 drawings: three sheets, not one.
2. **Chain the sheets.** Give each new sheet the last drawing of the one before as a reference, and start it from that pose.
3. **Use one small move per sheet.** Twelve to twenty panels should cover about one second of movement.
4. **Keep what works.** Backgrounds, loops, character sheets and good drawings stay. New sheets replace only the steppy action.
5. **Hold what does not need to move,** with a `hold_reason`, and let breathing, hair, flame or smoke keep the frame alive.
6. **Never fill gaps by warping or blending two drawings.** Only real drawings count.

## Check by eye

Lay out the drawings in order and read them like a flipbook. Compare the step numbers in `motion-check.mjs`: a step at twice its neighbours is a visible pop, even when the check passes.
