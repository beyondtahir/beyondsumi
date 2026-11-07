# Film guide

Use this for every film, every time, in every assistant. Assume the user has never made a video and does not know any technical words. The [first-time helper](first-run-flow.md) gets them installed. This guide takes them from their idea to a finished film.

If the user says they know what they are doing and want less guidance, keep it shorter. Still show every approval and every cost.

## At every step, say these things

1. **Where we are:** "Step 2 of 6: planning the scenes."
2. **What this step does,** in one simple sentence.
3. **What you made,** in plain words or as a picture. Never send them to a file to read it.
4. **What it costs,** if anything, before you spend it.
5. **Exactly what they can reply,** such as: "Say yes, or tell me what to change, like 'make it scarier'."
6. **What happens next,** in one sentence.

## How to talk to them

- Ask one question at a time. Give your recommendation and the reason, so they can just say yes.
- Use everyday words. Do not say JSON, render, layer, frame sheet, plate, parallax, ducking or LUFS. Say "the plan", "making the video", "drawings" and "the music gets quieter when someone speaks".
- Do the work yourself. Only ask the user to run something if you cannot. Then give one command, say where to paste it, and say what they should see.
- Before anything slow, say roughly how long it will take. Tell them when it is done.
- When something goes wrong, say what happened in plain words and what you are doing about it. Never paste a raw error without explaining it.
- If the user seems lost, explain again in simpler words, with an example from their own story. Never make them feel bad for asking.

## Before step 1

Every time someone starts a film, first say in one line that you will ask a few quick questions. Start from whatever they bring: an idea, a finished story or their recorded narration. Read saved choices, and ask only what is still missing, one question at a time:

1. What is the story about, or can they share it? Should their words stay exactly as written?
2. Who is it for, how should it feel, and is there anything it must keep?
3. How long should it be?
4. A narrator, character dialogue, both or neither? If characters are seen speaking, should their mouths move with the words (lip-sync)? Recommend yes.
5. Which language? Wide or vertical? Sumi Vector is wide only for now.
6. Which style? Recommend one with the reason.
7. Which voice? Voicebox, ElevenLabs, their own recording or none.

Accept "you decide" for any of these, and say what you chose. Only one requested style is made at a time.

## The six steps

| Step | Tell them | Show them | They can reply |
|---|---|---|---|
| 1 Writer | "I am writing the words of your film." | The script, read aloud in plain text, and its length | "Yes", or "make the ending sadder" |
| 2 Director | "I am planning each scene, like a film director." | The chosen style and why, each scene in one line, the estimated length, usual or smoother movement, and the number of images and cost. If the story needs longer than they asked for, offer the full version or a shorter one | "Yes", or "change scene 3" |
| 3 Artist | "I am drawing your characters and places." | One sample, then the characters | "Yes", or "make her older" |
| 4 Animator | "I am making it move, one drawing at a time." | The main poses, then the hardest shot moving | "Yes", or "the turn is too fast" |
| 5 Sound | "I am adding the music and sound effects." | The film with sound | "Sounds right", or "the drums are too quiet" |
| 6 Checker | "Five test viewers and one inspector are checking the film." | What they found in plain words, including anything still not perfect | "Fix it", or "that is fine" |

**When a film has speech,** make the voice straight after step 2, before any drawing. Offer the voices and the cost, make the takes and get them approved. Explain why: "The drawings and mouths follow your voice, so we finish it first." Then fit the shot lengths to the measured takes, run `sumi-plan.mjs check` and `budget` again, and get approval if the image count or cost went up.

## When the film is done

Tell the user:

- Where the video is, and how to open it. They also get their project files and their own [dashboard](delivery-dashboard.md) to watch and download it. A local dashboard link works while its server runs.
- What it cost in total.
- That you cannot hear the film, so they should watch it with sound.
- How to ask for changes: say what and where, such as "at the gate, the drums are too quiet". Reuse what is good, fix only what is affected, and keep their original recording and earlier film.

## When they come back later

Read the project's `STUDIO.md` first. Then say where the film got to and what comes next, such as: "Last time we finished the drawings. Next is the sound. Shall we continue?"
