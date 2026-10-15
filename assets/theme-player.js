/* Marrowvein theme player. Tries to start the theme with sound on load (Dustin 2026-10-14); when the browser
   blocks autoplay with sound, it starts on the visitor's first click, tap or key press anywhere on the page.
   Mute and volume are remembered (localStorage), so a muted visitor stays muted; pause and the play position
   carry over between the site's pages for this visit (sessionStorage). No external resources. */
(function () {
  "use strict";
  var VOL_KEY = "mv-theme-volume", MUTE_KEY = "mv-theme-muted";
  var POS_KEY = "mv-theme-pos", PAUSE_KEY = "mv-theme-paused";
  var DEFAULT_VOLUME = 0.4;

  function get(store, k) { try { return window[store].getItem(k); } catch (e) { return null; } }
  function set(store, k, v) { try { window[store].setItem(k, v); } catch (e) { /* private mode: fine */ } }

  var base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/theme-player\.js.*$/, "") : "assets/";
  var audio = new Audio();
  audio.preload = "auto";
  audio.loop = true;
  var srcOgg = document.createElement("source");
  srcOgg.src = base + "audio/marrowvein-theme.ogg"; srcOgg.type = 'audio/ogg; codecs="opus"';
  var srcMp3 = document.createElement("source");
  srcMp3.src = base + "audio/marrowvein-theme.mp3"; srcMp3.type = "audio/mpeg";
  audio.appendChild(srcOgg); audio.appendChild(srcMp3);

  var v = parseFloat(get("localStorage", VOL_KEY));
  var volume = isFinite(v) && v >= 0 && v <= 1 ? v : DEFAULT_VOLUME;
  var muted = get("localStorage", MUTE_KEY) === "1";
  var userPaused = get("sessionStorage", PAUSE_KEY) === "1";
  audio.volume = volume;
  audio.muted = muted;
  var pos = parseFloat(get("sessionStorage", POS_KEY));
  if (isFinite(pos) && pos > 0) {
    audio.addEventListener("loadedmetadata", function once() {
      audio.removeEventListener("loadedmetadata", once);
      if (pos < audio.duration) audio.currentTime = pos;
    });
  }

  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="wave" d="M15 9a4.2 4.2 0 0 1 0 6M17.4 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  var box = document.createElement("div");
  box.className = "theme-player";
  box.setAttribute("role", "region");
  box.setAttribute("aria-label", "Theme music");
  box.innerHTML =
    '<button type="button" class="tp-btn tp-play" aria-label="Play theme music"></button>' +
    '<span class="tp-title"><span class="tp-note" aria-hidden="true">&#9835;</span> Marrowvein Theme</span>' +
    '<button type="button" class="tp-btn tp-mute" aria-pressed="false" aria-label="Mute music"></button>' +
    '<input class="tp-vol" type="range" min="0" max="100" step="1" aria-label="Music volume">' +
    '<span class="tp-hint" aria-live="polite"></span>';
  var playBtn = box.querySelector(".tp-play"), muteBtn = box.querySelector(".tp-mute");
  var slider = box.querySelector(".tp-vol"), hint = box.querySelector(".tp-hint");

  function render() {
    var playing = !audio.paused;
    playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    playBtn.setAttribute("aria-label", playing ? "Pause theme music" : "Play theme music");
    var silent = audio.muted || audio.volume === 0;
    muteBtn.innerHTML = silent ? ICON_MUTED : ICON_SOUND;
    muteBtn.setAttribute("aria-pressed", audio.muted ? "true" : "false");
    muteBtn.setAttribute("aria-label", audio.muted ? "Unmute music" : "Mute music");
    slider.value = String(Math.round(audio.volume * 100));
    slider.setAttribute("aria-valuetext", Math.round(audio.volume * 100) + "%" + (audio.muted ? ", muted" : ""));
    slider.style.setProperty("--fill", (audio.muted ? 0 : audio.volume * 100) + "%");
    box.classList.toggle("is-playing", playing);
    box.classList.toggle("is-muted", audio.muted);
  }

  var waitingForGesture = false;
  function stopWaiting() {
    if (!waitingForGesture) return;
    waitingForGesture = false;
    ["pointerdown", "touchstart", "keydown"].forEach(function (t) { document.removeEventListener(t, onFirstGesture, true); });
    box.classList.remove("is-waiting");
    hint.textContent = "";
  }
  function onFirstGesture(e) {
    // Clicks on the player's own controls are handled by those controls (e.g. muting before any sound).
    if (e && e.target && box.contains(e.target)) return;
    if (e && e.type === "keydown" && (e.key === "Tab" || e.key === "Shift")) return;
    stopWaiting();
    if (!userPaused) start();
  }
  function waitForGesture() {
    if (waitingForGesture) return;
    waitingForGesture = true;
    box.classList.add("is-waiting");
    hint.textContent = audio.muted ? "" : "Music starts when you click or tap the page.";
    ["pointerdown", "touchstart", "keydown"].forEach(function (t) { document.addEventListener(t, onFirstGesture, true); });
  }
  function start() {
    var p = audio.play();
    if (p && typeof p.then === "function") p.then(render, function () { waitForGesture(); render(); });
    render();
  }

  playBtn.addEventListener("click", function () {
    stopWaiting();
    if (audio.paused) { userPaused = false; set("sessionStorage", PAUSE_KEY, "0"); start(); }
    else { userPaused = true; set("sessionStorage", PAUSE_KEY, "1"); audio.pause(); }
  });
  muteBtn.addEventListener("click", function () {
    audio.muted = !audio.muted;
    if (!audio.muted && audio.volume === 0) audio.volume = DEFAULT_VOLUME;
    set("localStorage", MUTE_KEY, audio.muted ? "1" : "0");
    set("localStorage", VOL_KEY, String(audio.volume));
    // Unmuting is a clear "I want sound": start the music if it is still waiting for a gesture.
    if (!audio.muted && audio.paused && !userPaused) { stopWaiting(); start(); }
    render();
  });
  slider.addEventListener("input", function () {
    audio.volume = Math.max(0, Math.min(1, slider.value / 100));
    if (audio.muted && audio.volume > 0) { audio.muted = false; set("localStorage", MUTE_KEY, "0"); }
    set("localStorage", VOL_KEY, String(audio.volume));
    render();
  });
  audio.addEventListener("play", render);
  audio.addEventListener("pause", render);
  audio.addEventListener("volumechange", render);

  // Carry the play position to the next page of the site (same visit).
  function savePos() { if (!isNaN(audio.currentTime)) set("sessionStorage", POS_KEY, String(audio.currentTime)); }
  window.addEventListener("pagehide", savePos);
  setInterval(savePos, 2000);

  function mount() {
    document.body.appendChild(box);
    document.body.classList.add("has-theme-player");
    render();
    if (!userPaused) start();
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
