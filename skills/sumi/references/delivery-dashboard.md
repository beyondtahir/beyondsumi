# Beyondsumi film delivery

Every completed film should end with an actual downloadable MP4 plus the branded Beyondsumi viewing/download dashboard. Default to Full HD: 1920×1080 landscape, 1080×1920 portrait or 1080×1080 square, retaining the approved aspect ratio. Use H.264, yuv 420p, AAC audio (or intentional silence), 24 fps, and fast-start MP4 for new exports. Respect explicit alternate dimensions. Never claim an upscaled low-resolution source gains native HD detail.

Drawn transitions are composited into the final frame; the user's MP4 has the complete film and sound, with no separate matte required. Do not deliver a matte video as the film.

## Package existing exports

Use `scripts/build_delivery.py` and the bundled [dashboard template](../assets/delivery-dashboard/index.html). It copies supplied exports without changing their bytes, extracts a poster using existing ffmpeg when none is supplied, and reads real codec, size, dimensions, duration and fps with ffprobe. Both tools are already part of Sumi's dependency checks; detect availability and ask before any missing third-party installation. No hosted service, paid media or extra package is required.

Create a project-local JSON manifest. Paths are relative to that manifest (absolute paths are also supported):

```json
{
  "title": "Your film title",
  "subtitle": "A short story-specific introduction.",
  "films": [{
    "style": "Sumi Light",
    "description": "Clear, dark colour pencil sketch.",
    "source": "out/film.mp4",
    "status": "draft",
    "review_note": "Comparison draft; describe the actual remaining checks."
  }]
}
```

Include only actually rendered files in `films`. The dashboard always shows the three catalogue choices: available exports have watch/download controls; unmade editions say **Available to create** with **Make this edition**. That button prepares an agent-neutral recreation request for the user to copy or save and send to their current agent. It does not start generation or assume Codex, Claude, OpenClaw, API access, or a chat bridge. Provide optional `recreation_context` with the editable project location/instructions; do not include secrets. Only the edition explicitly requested by the user may be produced. Never generate all three by default. Optional `poster` selects an existing JPG/PNG/WebP. For a reviewed export, set `status: "ready"`, `review_file` to its actual completed review record, `detail_file` to the ticked `CHECKLIST.md` from `review-frames.mjs`, and `reviewed_sha256` to the reviewed MP4's SHA-256. The packager requires these references but **cannot independently certify their truth**; the existing production/physics/visual/audio gates still apply. Never label a rejected or unreviewed comparison ready merely because it decodes.

```sh
python3 scripts/build_delivery.py delivery-manifest.json delivery
python3 delivery/serve.py --port 4260
```

Use a new output folder for a revision. The packager refuses to overwrite. It creates a self-contained folder with copied media, metadata, transparent PNG logo, HTML/CSS/JS and a loopback-only server. It does not render or upload. If packaging fails after making a partial folder, diagnose it and use a fresh revision; do not claim completion.

## Presentation and downloads

The dashboard uses the **Beyondsumi** wordmark and Beyondartist-directed Ink Portal logo. Its identity is the delivery interface, not a compulsory watermark or recolouring of any film. Final MP4s must have no added visible AI-generated/AI-assisted label, assistant/provider watermark or Beyondsumi logo. Keep approved story titles/captions. Inspect source artwork and final-frame samples for unintended lettering or visible marks before delivery; record any unperformed check honestly. Dark, Light and Vector films retain their selected art and palette. Preserve the internal `sumi` command/folder for compatibility; use Beyondsumi as the requested display brand.

Keep the product simple: project title, player, actual file details, clear download and rendered editions. Avoid implementation jargon in the interface. Show specific review limitations briefly when a film is a draft. Do not invent publication or artistic approval. The generated brush symbol is a transparent raster PNG, not a fully editable vector. Exact Beyondsumi lettering is finished in native type. It is a newly developed identity, not an externally verified trademark.

Serve with the included Python server for byte-range seeking and attachment downloads. Bind only to 127.0.0.1. Choose an available port without stopping another user's process. Use the user's chosen browser and leave the dashboard available. A localhost URL works only on that computer while its server runs; it is not hosted by the assistant and cannot be sent as a public viewing link. Cloud upload/hosting still requires a separate user request. The folder and direct MP4 links remain usable after the server stops; restart the included server for the dashboard. Static file viewing is a fallback, with browser-dependent download behavior.

Before delivery, check actual player loading and seek/pause/resume, style selection, fullscreen where available, keyboard focus, a narrow viewport and download behavior. Verify downloaded response bytes match the packaged export and attachment headers have a filename. Do not confuse dashboard interaction checks with re-reviewing the film. Return the dashboard URL and direct MP4 file link(s), and identify draft status/unfinished reviews when applicable.

## Picture visible during playback

Follow [the Checker](../../sumi-checker/SKILL.md). Verify actual imagery at intermediate playback times and near the ending, sound on for a film, alongside HTTP 206seeking and byte-matching downloads. A poster or advancing timer alone does not pass. Use the supplied range-capable server rather than a temporary plain HTTP server. The optional short silent image-preview page is a technical comparison tool, never the full film or a replacement for its soundtrack.
