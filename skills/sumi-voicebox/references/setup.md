# Voicebox first setup · checked 26 October2026

Sources: [upstream](https://github.com/jamiepine/voicebox), [installation](https://github.com/jamiepine/voicebox/blob/main/docs/content/docs/overview/installation.mdx), [model management](https://github.com/jamiepine/voicebox/blob/main/docs/content/docs/developer/model-management.mdx), [cloning](https://github.com/jamiepine/voicebox/blob/main/docs/content/docs/overview/voice-cloning.mdx). Recheck releases/requirements before a later installation. This guide is paraphrased, not a vendored app.

Explain: Voicebox makes speech on this computer after downloading one speech model. No ElevenLabs API key is required. It still uses storage, RAM and computing time. The desktop release includes its backend; source builds add development tools. Upstream currently offers macOS AppleSilicon/Intel and Windows binaries; Linux users should check current releases or the official source/Docker instructions. Never describe a downloaded repo as a ready app.

Detect OS/architecture, RAM/free space, app and local backend first. Upstream's generic baseline is8GB RAM/5GB free disk/modern multicoreCPU, with 16GB+/10GB+ recommended. Large models need their weight size plus runtime/cache/audio headroom beyond a generic minimum. CPU inference is supported but slower; supported GPUs may help. Check the actual device/backend, not promised generation speed.

Approximate model download sizes (separate from system RAM/VRAM):

| Choice | Weights | Use |
|---|---:|---|
| Kokoro 82M |350MB|Small preset voices, no cloning|
| LuxTTS |300MB|Light English cloning|
| Qwen 0.6B /1.7B |1.2/3.5GB|Ten-language cloning|
| Qwen CustomVoice 0.6B /1.7B |1.2/3.5GB|Preset voices|
| Qwen VoiceDesign 1.7B |3.5GB|Voice from description|
| Chatterbox Multilingual |3.2GB|23 languages including Hindi|
| Chatterbox Turbo |1.5GB|Expressive English|
| TADA 1B /3B |4/8GB|English /multilingual longform|

These are upstream estimates; model variants, acceleration packages and caches change totals. Qwen's documented language list does not includeHindi/Urdu; Chatterbox listsHindi but notUrdu. Verify the requested language rather than changing it silently. Do not promise every engine speaks every language. The app's MIT license does not replace each selected model/preset's license.

Guide one step at a time:

1. Reuse a detected compatible installation. Otherwise show the exact OS release asset, published asset size when available, source, install location and selected model estimate. Ask before that app/model download. The first Generate action may automatically fetch weights, so resolve this consent before clicking it. No disabling OS security to install.
2. Install the approved desktop release with its normal OS installer, open it and check backend status. On source-only platforms disclose Python/Bun/Rust/system prerequisites before approval; do not run a source bootstrap silently.
3. In Settings→Models confirm the selected model is downloaded/loaded or ask for that download. Most users need one engine; do not download all. Probe normally uses127.0.0.1:17493 and onlyGETs model/OpenAPI metadata.
4. Choose a supported preset or create a personal/consented profile. Suggest10–30 seconds of clean speech without background music/overlap/clipping; use Upload or Record only after the user chooses. Check the selected engine's actual guidance and profile compatibility.
5. Submit a short approved setup sentence once after download consent, listen for language/pronunciation and export WAV. Then narrate the approved story, retaining full source take and real duration. If the API differs, use the app's Generate/Export flow and label automation untested.
6. Save chosen non-secret provider/profile/model IDs if requested. Future films reuse cached models/profile, not repeated downloads. No narration skips all of this and still permits music/SFX.

Do not promise a unique voice guarantees monetization. Original/authentic work and applicable commercial/model/voice rights matter; a licensed preset remains an option. No Voicebox app/model was installed or end-to-end generation certified merely by shipping this guide.
