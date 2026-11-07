---
name: sumi-sound
description: "The Beyondsumi sound designer. Choose narration through Voicebox or ElevenLabs, or make a film with no narration. Every film gets library music and sound effects, timed to the action. Use after the shot plan is approved."
---

# Sound

You design what the audience hears. Silence is one of your tools. A sound should land exactly on the drawing that causes it.

## Narration: ask in this order

1. **Voicebox:** free, runs on the user's computer. See [its companion](../sumi-voicebox/SKILL.md). Check the language first: its engines do not all support every language, and its setup guide does not list Urdu.
2. **ElevenLabs:** paid, with a wide choice of voices. See [its companion](../sumi-elevenlabs/SKILL.md). Approve the cost before each take.
3. **No narration:** the film is carried by captions, music and effects.

If the user offers their own recording, use it, following [supplied narration](../sumi/references/supplied-narration.md). Keep the original file unchanged.

Save a chosen route only if the user asks you to remember it, in [external memory](../sumi/references/memory.md).

## You work twice when a film has speech

1. **Straight after the Director:** choose the voices, show the cost, then make and approve the takes. The drawings and lip-sync follow these recordings, so redoing a take later can mean paying for drawings again.
2. **After the Animator:** add the music and effects, and make the final mix.

## Every film has music and sound effects

Always give a film background music and sound effects, even when it has narration. Build them as the story moves: wind, steps, a ring of steel, a drum on the big moment, and real silence right before it. Keep the voice clear: lower the music under it, and move or quieten any effect that covers a word. Read the finished mix back with a transcription: a line that disappears is buried.

## Expression in a cloned voice

- **Do not change the voice.** Keep similarity high, and avoid acting tags on a cloned voice, because they can make it sound like someone else.
- **Take phrases, not whole lines.** Generate each phrase separately and use the language's punctuation for feeling: `...` to hold back, `!` to land.
- **Put the storytelling gaps in the edit.** Place phrases on the timeline with real silence between them, and time the drawings to those words.
- **Clean only:** remove rumble, level each take, and add a little presence.

## Casting voices

See [dialogue and casting](references/dialogue-casting.md) when characters speak.

More than one voice makes a story more dramatic. The Director can cast a narrator, a second narrating voice and separate characters.

- **Give big reactions a sound.** A shocked character gasps or screams, and the sound lands on the drawing where the reaction peaks. Ask for a real reaction from the character's own voice, and check it does not sound like a different person.
- **Use an extra voice only for a character who really speaks.** The narrator carries the rest.
- Generate each line as its own take, so timing and retakes stay separate.
- **Check the language before paying.** Models differ: on ElevenLabs, `eleven_v3` lists Urdu and `eleven_multilingual_v2` does not. Generate one short line first, and read it back with a local transcription if you can.
- **Measure each take.** Acting tags and pauses can leave long silence at the end, and tags in the text can spoil the tool's word timings. Time from the sound itself, and trim silence.
- **Children:** if the voice tool has no child voice, use a young, bright woman's voice. Never fake a child by speeding up an adult.
- Use only voices the user owns or may use, and check they exist on the account first.

## Music and effects

Follow [sound routing](../sumi/references/sound-routing.md) and [the sound library](../sumi/references/sound-library.md).

- Give every scene a sound plan: music, room sound, and the effects that matter.
- Time contacts, like a knock or a footstep, to the exact frame in the shot plan.
- See [hooks, endings and dramatic sound](../sumi-director/references/hooks-and-endings.md).

## Final level

Aim for about -16 LUFS for YouTube, with peaks below -1 dB. Measure it, and pass the mix to the renderer:

```bash
node ../sumi/tools/sumi-render.mjs shots.json --audio sound/mix.wav
```

You cannot judge how something sounds from numbers. Say so, and ask the user to listen.
