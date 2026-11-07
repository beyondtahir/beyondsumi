(() => {
  "use strict";
  const data = window.SUMI_DELIVERY,
    $ = (id) => document.getElementById(id);
  if (!data || !Array.isArray(data.films) || !data.films.length) {
    $("title").textContent = "Your film room is ready.";
    $("subtitle").textContent =
      "Ask your agent to create a Sumi Dark, Light or Vector film. Your finished videos will appear here.";
    $("edition").textContent = "NO FILM YET";
    document.querySelector(".screening").hidden = true;
    document.querySelector(".editions").hidden = true;
    return;
  }
  const safe = (p) => (typeof p === "string" && /^media\/[a-zA-Z0-9_.-]+$/.test(p) ? p : null);
  const time = (n) => {
    const seconds = Math.round(n);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  const size = (n) => `${(n / 1048576).toFixed(1)} MB`;
  const quality = (f) =>
    Math.min(f.width, f.height) >= 1080
      ? "Full HD"
      : Math.min(f.width, f.height) >= 720
        ? "HD"
        : `${f.width} × ${f.height}`;
  function download(a, f, label) {
    a.href = safe(f.file) || "#";
    a.download = f.download_name;
    a.textContent = label;
    a.setAttribute("aria-label", `Download ${f.style} MP4`);
    if (location.protocol !== "file:") a.href += "?download=1";
  }
  document.title = `${data.title} · Beyondsumi`;
  $("title").textContent = data.title;
  $("subtitle").textContent = data.subtitle || "";
  $("collection-copy").textContent =
    "Watch an available edition, or ask your agent to create another.";
  $("collection-title").textContent = "Your story. Three possibilities.";
  $("edition").textContent =
    String(data.films.length).padStart(2, "0") +
    " " +
    (data.films.length > 1 ? "EDITIONS" : "EDITION");
  const buttons = [];
  let selected = -1;
  function choose(i) {
    if (i === selected) return;
    selected = i;
    const f = data.films[i],
      v = $("player");
    v.pause();
    v.src = safe(f.file) || "";
    v.poster = safe(f.poster) || "";
    v.load();
    $("playback-error").hidden = true;
    $("selected-style").textContent = f.style;
    $("selection-name").textContent = f.style;
    $("selection-description").textContent = f.description || "";
    $("dimensions").textContent = `${f.width} × ${f.height}`;
    $("duration").textContent = time(f.duration);
    $("format").textContent = `MP4 · ${Number(f.fps.toFixed(2))} fps`;
    $("size").textContent = size(f.bytes);
    const a = $("download");
    a.href = safe(f.file) || "#";
    if (location.protocol !== "file:") a.href += "?download=1";
    a.download = f.download_name;
    a.setAttribute("aria-label", `Download ${f.style} MP4`);
    a.firstElementChild.textContent = `Download ${quality(f)} MP4`;
    $("download-note").textContent =
      `${quality(f)} · ${f.audio ? "Sound included" : "Silent film"} · Save the original export`;
    $("status").textContent = f.status === "ready" ? "Reviewed export" : "Comparison draft";
    $("review-note").textContent = f.review_note;
    buttons.forEach((b, j) => {
      b.setAttribute("aria-pressed", String(i === j));
      b.closest(".card").classList.toggle("selected", i === j);
    });
  }
  data.films.forEach((f, i) => {
    const card = document.createElement("article");
    card.className = "card";
    const b = document.createElement("button");
    b.className = "choose";
    b.type = "button";
    b.setAttribute("aria-label", `Watch ${f.style}`);
    b.setAttribute("aria-pressed", "false");
    const thumb = document.createElement("div");
    thumb.className = "thumb";
    const img = document.createElement("img");
    img.src = safe(f.poster) || "";
    img.alt = `${data.title} — ${f.style} frame`;
    img.loading = "lazy";
    thumb.append(img);
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = quality(f);
    const play = document.createElement("span");
    play.className = "play-icon";
    play.textContent = "▶";
    play.setAttribute("aria-hidden", "true");
    thumb.append(chip, play);
    const copy = document.createElement("div");
    copy.className = "card-copy";
    const h = document.createElement("h3");
    h.textContent = f.style;
    const p = document.createElement("p");
    p.textContent = f.description || "";
    copy.append(h, p);
    b.append(thumb, copy);
    b.addEventListener("click", () => choose(i));
    buttons.push(b);
    const foot = document.createElement("div");
    foot.className = "card-footer";
    const spec = document.createElement("span");
    spec.textContent = `${time(f.duration)} / ${size(f.bytes)}`;
    const a = document.createElement("a");
    a.className = "card-download";
    download(a, f, "Download MP4 ↓");
    foot.append(spec, a);
    card.append(b, foot);
    $("cards").append(card);
  });
  const catalogue = (
    data.catalogue ||
    ["Sumi Dark", "Sumi Light", "Sumi Vector"].map((name) => ({
      name,
      description: "Available to create in this edition.",
    }))
  ).map((item) => (Array.isArray(item) ? item : [item.name, item.description]));
  const dialog = document.createElement("dialog");
  dialog.className = "request-dialog";
  const heading = document.createElement("h2"),
    intro = document.createElement("p"),
    field = document.createElement("textarea"),
    actions = document.createElement("div"),
    copy = document.createElement("button"),
    save = document.createElement("a"),
    close = document.createElement("button"),
    notice = document.createElement("p");
  heading.id = "request-heading";
  dialog.setAttribute("aria-labelledby", heading.id);
  intro.textContent =
    "Send this request to the agent you use with Beyondsumi. Only this edition will be created after you send it.";
  field.readOnly = true;
  field.setAttribute("aria-label", "Recreation request");
  actions.className = "request-actions";
  copy.type = "button";
  copy.textContent = "Copy request";
  save.textContent = "Save request";
  close.type = "button";
  close.textContent = "Close";
  notice.setAttribute("role", "status");
  actions.append(copy, save, close);
  dialog.append(heading, intro, field, actions, notice);
  document.body.append(dialog);
  let requestUrl = null;
  function requestEdition(style) {
    heading.textContent = `Create ${style}`;
    const source = data.films[selected];
    field.value = `Use the Beyondsumi / sumi skill to recreate “${data.title}” in ${style} only. Preserve this project's approved story, spoken wording, narration, duration (${source.duration.toFixed(3)} seconds), aspect ratio and required actions. Follow ${style}'s own art and motion guide. Reuse checked project assets when appropriate, and perform fresh character, physics, sound and export review. Do not create the other editions. Deliver the actual Full HD MP4 and update the Beyondsumi dashboard.\n\nProject context: ${typeof data.recreation_context === "string" ? data.recreation_context : data.recreation_context ? JSON.stringify(data.recreation_context, null, 2) : "Use the editable source project that supplied this dashboard. Ask me to locate it if unavailable."}\nExisting edition: ${source.style}\nExisting export SHA-256: ${source.sha256}\n\nThis is a user request when sent to the agent. If any source or approval is missing, inspect the project and ask only for what is missing. Do not invent access to this dashboard or its files.`;
    notice.textContent = "No generation has started.";
    if (requestUrl) URL.revokeObjectURL(requestUrl);
    requestUrl = URL.createObjectURL(new Blob([field.value], { type: "text/plain;charset=utf-8" }));
    save.href = requestUrl;
    save.download = `beyondsumi-${style.toLowerCase().replaceAll(" ", "-")}-request.txt`;
    dialog.showModal();
  }
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(field.value);
      notice.textContent = "Copied. Paste it into your agent to begin.";
    } catch (e) {
      field.focus();
      field.select();
      notice.textContent = "Select and copy the request, then paste it into your agent.";
    }
  });
  close.addEventListener("click", () => dialog.close());
  for (const [style, description] of catalogue) {
    if (data.films.some((f) => f.style === style)) continue;
    const card = document.createElement("article");
    card.className = "card unmade";
    const art = document.createElement("div");
    art.className = "edition-art " + style.toLowerCase().replaceAll(" ", "-");
    art.setAttribute("aria-hidden", "true");
    const mark = document.createElement("img");
    mark.src = "logo.png";
    mark.alt = "";
    art.append(mark);
    const body = document.createElement("div");
    body.className = "card-copy";
    const h = document.createElement("h3");
    h.textContent = style;
    const p = document.createElement("p");
    p.textContent = description;
    body.append(h, p);
    const foot = document.createElement("div");
    foot.className = "card-footer";
    const label = document.createElement("span");
    label.textContent = "Available to create";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "make-edition";
    b.textContent = "Make this edition ↗";
    b.addEventListener("click", () => requestEdition(style));
    foot.append(label, b);
    card.append(art, body, foot);
    $("cards").append(card);
  }
  $("player").addEventListener("error", () => {
    $("playback-error").hidden = false;
  });
  choose(0);
})();
