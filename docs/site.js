(() => {
  "use strict";
  const data = window.BEYONDSUMI;
  const byId = (id) => document.getElementById(id);
  const local = ["localhost", "127.0.0.1", ""].includes(location.hostname);
  const base = local ? "demo-media/" : data.mediaBase;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");

  /* Hero: scrolling flips through the film's real pictures. */
  const canvas = byId("flip");
  const ctx = canvas.getContext("2d");
  const hero = byId("hero");
  const COUNT = 35;
  const pictures = [];
  let shown = 0;
  function draw(n) {
    const img = pictures[n - 1];
    if (!img || !img.complete || !img.naturalWidth) return;
    shown = n;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    byId("flip-count").textContent = `${pad(n)} / ${COUNT}`;
    byId("flip-bar").style.width = (n / COUNT) * 100 + "%";
  }
  for (let i = 1; i <= COUNT; i++) {
    const img = new Image();
    img.src = `assets/flip/dark/${pad(i)}.jpg`;
    img.onload = () => {
      if (i === 1 && !shown) draw(1);
      if (i === wanted()) draw(i);
    };
    pictures.push(img);
  }
  function wanted() {
    const room = hero.offsetHeight - innerHeight;
    const done = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / (room || 1)));
    return Math.max(1, Math.round(done * (COUNT - 1)) + 1);
  }
  let queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const n = wanted();
      if (n !== shown) draw(n);
      document.querySelector(".hero-copy").style.opacity = Math.max(0, 1 - (n - 1) / 16);
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);

  /* The three films. */
  const list = byId("film-list");
  const loops = [];
  for (const [i, demo] of data.demos.entries()) {
    const panel = document.createElement("article");
    panel.className = `film film-${demo.id}`;
    panel.id = "watch-" + demo.id;
    panel.innerHTML = `
      <button type="button" class="film-play" aria-label="Watch ${demo.name} with sound">
        <video muted loop playsinline preload="none" poster="${demo.poster}" aria-hidden="true"><source src="assets/clips/${demo.id}.mp4" type="video/mp4"></video>
        <span class="play"><i></i>Watch with sound · ${demo.duration}</span>
      </button>
      <div class="film-copy" data-reveal>
        <small>${pad(i + 1)} · ${demo.style}</small>
        <h3>${demo.name}</h3>
        <p>${demo.description}</p>
        <dl>
          <dt>Look</dt><dd>${demo.format}</dd>
          <dt>Best for</dt><dd>${demo.best}</dd>
          <dt>How</dt><dd>${demo.technique}</dd>
          <dt>Sound</dt><dd>${demo.sound}</dd>
        </dl>
        <a href="${base + demo.file}" download="${demo.file}">Download the film</a>
      </div>`;
    panel.querySelector(".film-play").addEventListener("click", () => openPlayer(demo));
    list.append(panel);
    loops.push(panel.querySelector("video"));
  }
  loops.push(byId("last-video"));
  if (!reduced && "IntersectionObserver" in window) {
    const watcher = new IntersectionObserver((seen) => {
      for (const s of seen) s.isIntersecting ? s.target.play().catch(() => {}) : s.target.pause();
    }, { threshold: 0.25 });
    loops.forEach((v) => watcher.observe(v));
  }

  /* Full film with sound. */
  const dialog = byId("player");
  const player = byId("player-video");
  function openPlayer(demo) {
    byId("player-error").hidden = true;
    byId("player-download").href = base + demo.file;
    player.poster = demo.poster;
    player.src = base + demo.file;
    player.setAttribute("aria-label", demo.name);
    audio.pause();
    markTrack(null);
    dialog.showModal();
    player.play().catch(() => {});
  }
  player.addEventListener("error", () => (byId("player-error").hidden = false));
  dialog.addEventListener("close", () => { player.pause(); player.removeAttribute("src"); player.load(); });
  byId("player-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

  /* Drag to fold the boat. */
  const foldPictures = [];
  const fold = byId("fold");
  const paintFold = () => {
    const n = Number(fold.value);
    byId("fold-img").src = `assets/flip/light/${pad(n)}.jpg`;
    byId("fold-count").textContent = `Picture ${n} of 30`;
  };
  fold.addEventListener("input", paintFold);
  new IntersectionObserver((seen, self) => {
    if (!seen[0].isIntersecting) return;
    self.disconnect();
    for (let i = 1; i <= 30; i++) { const img = new Image(); img.src = `assets/flip/light/${pad(i)}.jpg`; foldPictures.push(img); }
  }, { rootMargin: "600px" }).observe(fold);

  /* What the film guide sounds like. */
  const STEPS = [
    ["Words", "Step 1 of 6: writing the words.", "Here is your story in 30 seconds. An old man folds a paper boat every morning for fifty years, and sends it down the river to the girl he lost.", "Nothing is made until you say yes.", ["Yes, I love it", "Make the ending sadder"]],
    ["Scenes", "Step 2 of 6: planning the scenes, like a film director.", "I suggest Sumi Light, because it suits a gentle love story. There are 11 scenes. Scene 1: his old hands fold the boat. Scene 2: he lets it go. Which voice would you like? Voicebox is free, or you can send your own recording.", "It will take about 20 images. Nothing is made until you say yes.", ["Yes, go ahead", "Change scene 2"]],
    ["Drawing", "Step 3 of 6: drawing your characters and places.", "Here is one sample of the old man. Every drawing in the film will follow him, so now is the best time for changes.", "Every drawing in the film follows this sample.", ["He looks perfect", "Make him older"]],
    ["Moving", "Step 4 of 6: making it move, one drawing at a time.", "Here are his main poses, and the hardest shot moving: the hands folding the boat. Tell me if anything feels wrong before I draw the rest.", "Checking this now avoids wasting images later.", ["Looks great", "The fold is too fast"]],
    ["Sound", "Step 5 of 6: adding the music and sound effects.", "Your voice was recorded first, so the drawings could follow it. Now I add the music and effects, and the music gets quieter when someone speaks. Here is the film with sound.", "The music and effects come with Beyondsumi.", ["Sounds right", "The drums are too quiet"]],
    ["Checking", "Step 6 of 6: five test viewers and one inspector are checking the film.", "They liked the story and found one problem: a hand looks too big in scene 7. I can fix that now. Everything else passed. I can't hear the film, so please watch it with sound.", "Watch it with sound, then tell me what to change.", ["Fix it", "That's fine"]],
  ];
  const tabs = byId("step-tabs");
  const chat = byId("chat");
  function showStep(i, focus) {
    const [, where, said, cost, replies] = STEPS[i];
    [...tabs.children].forEach((t, k) => { t.setAttribute("aria-selected", String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    if (focus) tabs.children[i].focus();
    chat.innerHTML = `<div class="bubble"><b>${where}</b><p>${said}</p><p class="price">${cost}</p></div>
      <div class="replies"><small>You can just say</small>${replies.map((r) => `<button type="button">“${r}”</button>`).join("")}</div>`;
    chat.querySelectorAll(".replies button").forEach((b) => b.addEventListener("click", () => {
      showStep((i + 1) % STEPS.length);
    }));
  }
  STEPS.forEach(([name], i) => {
    const t = document.createElement("button");
    t.type = "button";
    t.role = "tab";
    t.innerHTML = `<i>${i + 1}</i>${name}`;
    t.addEventListener("click", () => showStep(i));
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); showStep((i + 1) % STEPS.length, true); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); showStep((i - 1 + STEPS.length) % STEPS.length, true); }
    });
    tabs.append(t);
  });
  showStep(0);

  /* Music samples. */
  const audio = byId("track-audio");
  const trackButtons = [...document.querySelectorAll("[data-track]")];
  function markTrack(on) { trackButtons.forEach((b) => b.classList.toggle("on", b === on)); }
  trackButtons.forEach((b) => b.addEventListener("click", () => {
    if (b.classList.contains("on")) { audio.pause(); markTrack(null); return; }
    audio.src = `assets/music/${b.dataset.track}.mp3`;
    audio.play().catch(() => {});
    markTrack(b);
  }));
  audio.addEventListener("ended", () => markTrack(null));

  /* Install. */
  byId("download").href = data.download;
  byId("version").textContent = "v" + data.version;
  byId("guide-pick").addEventListener("change", (e) => {
    byId("guide-link").href = `https://github.com/beyondtahir/beyondsumi/blob/main/skills/sumi/references/install/${e.target.value}.md`;
  });
  const copier = (button, source) => byId(button).addEventListener("click", async (e) => {
    try {
      await navigator.clipboard.writeText(byId(source).innerText);
      e.target.textContent = "Copied";
    } catch {
      e.target.textContent = "Select and copy";
    }
    setTimeout(() => (e.target.textContent = "Copy"), 2000);
  });
  copier("copy", "paste-text");
  copier("copy-first", "first-text");

  /* Reveal sections as they arrive. */
  const items = document.querySelectorAll("[data-reveal]");
  if (reduced || !("IntersectionObserver" in window)) items.forEach((el) => el.classList.add("in"));
  else {
    const reveal = new IntersectionObserver((seen) => {
      for (const s of seen) if (s.isIntersecting) { s.target.classList.add("in"); reveal.unobserve(s.target); }
    }, { threshold: 0.12 });
    items.forEach((el) => reveal.observe(el));
  }

  const hash = location.hash.replace("#", "");
  if (hash.startsWith("watch-")) byId(hash)?.scrollIntoView();
})();
