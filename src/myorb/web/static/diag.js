// For a while only: what runs on the home screen while it is zoomed on a phone, kept across a
// crash of the page. ?diag=1 turns it on (in this browser only), ?diag=0 off again. After a
// crash the page shows what ran last, to be copied or photographed.
(() => {
  const KEY = "myorb-diag";
  const ON = "myorb-diag-on";
  try {
    const asked = new URLSearchParams(location.search).get("diag");
    if (asked === "1") localStorage.setItem(ON, "1");
    if (asked === "0") {
      localStorage.removeItem(ON);
      localStorage.removeItem(KEY);
    }
    if (!localStorage.getItem(ON)) return;
  } catch {
    return;
  }
  let previous = null;
  try {
    previous = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {}

  const run = {
    version: document.querySelector('meta[name="myorb-version"]')?.content,
    started: new Date().toISOString(),
    seconds: 0,
    ended: false,
    scale: 1,
    maxScale: 1,
    viewport: "",
    nodes: 0,
    frames: 0,
    animations: 0,
    maxLag: 0,
    counts: {},
    ms: {},
  };
  const name = (fn) => (fn?.name || String(fn).slice(0, 80)).replace(/\s+/g, " ");
  const wrap = (kind, fn) => {
    const key = `${kind}: ${name(fn)}`;
    return function (...args) {
      const start = performance.now();
      try {
        return fn.apply(this, args);
      } finally {
        run.counts[key] = (run.counts[key] || 0) + 1;
        run.ms[key] = (run.ms[key] || 0) + performance.now() - start;
      }
    };
  };
  for (const kind of ["ResizeObserver", "MutationObserver", "IntersectionObserver"]) {
    const Original = window[kind];
    if (Original) window[kind] = class extends Original { constructor(fn, options) { super(wrap(kind, fn), options); } };
  }
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (fn) => raf(wrap("frame", fn));
  const watched = new Set(["resize", "scroll", "touchstart", "touchmove", "toggle", "load"]);
  const wrapped = new WeakMap();
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, options) {
    if (!watched.has(type) || typeof fn !== "function") return add.call(this, type, fn, options);
    if (!wrapped.has(fn)) wrapped.set(fn, wrap(type, fn));
    return add.call(this, type, wrapped.get(fn), options);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, options) {
    return remove.call(this, type, wrapped.get(fn) || fn, options);
  };

  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(run));
    } catch {}
  };
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    run.maxLag = Math.max(run.maxLag, Math.round(now - last - 500));
    last = now;
    const view = window.visualViewport;
    run.seconds = Math.round(now / 1000);
    run.scale = view ? Math.round(view.scale * 100) / 100 : 1;
    run.maxScale = Math.max(run.maxScale, run.scale);
    run.viewport = `${innerWidth}x${innerHeight}${view ? ` visual ${Math.round(view.width)}x${Math.round(view.height)}` : ""}`;
    run.nodes = document.getElementsByTagName("*").length;
    run.frames = document.getElementsByTagName("iframe").length;
    run.animations = document.getAnimations?.().length || 0;
    save();
  }, 500);
  add.call(window, "pagehide", () => {
    run.ended = true;
    save();
  });

  if (!previous || previous.ended) return;
  const top = Object.keys(previous.counts)
    .sort((a, b) => previous.counts[b] - previous.counts[a])
    .slice(0, 15)
    .map((key) => `${previous.counts[key]}× ${Math.round(previous.ms[key])} ms  ${key}`);
  const report = [
    `myOrb ${previous.version} · crashed after ${previous.seconds} s · ${previous.started}`,
    `zoom ${previous.scale} (most ${previous.maxScale}) · ${previous.viewport}`,
    `${previous.nodes} elements · ${previous.frames} frames · ${previous.animations} animations · page stuck up to ${previous.maxLag} ms`,
    "",
    ...top,
  ].join("\n");
  add.call(document, "DOMContentLoaded", () => {
    const box = document.createElement("div");
    box.setAttribute("style", "position:fixed;inset:12px;z-index:99999;overflow:auto;padding:14px;background:#111821;color:#e6edf3;border:1px solid #4dd0e1;border-radius:12px;font:11px/1.45 ui-monospace,monospace;white-space:pre-wrap");
    const text = document.createElement("div");
    text.textContent = `What ran before the page crashed:\n\n${report}`;
    const copy = document.createElement("button");
    copy.textContent = "Copy";
    copy.onclick = () => navigator.clipboard?.writeText(report).then(() => { copy.textContent = "Copied"; });
    const close = document.createElement("button");
    close.textContent = "Close";
    close.onclick = () => box.remove();
    for (const button of [copy, close]) button.setAttribute("style", "margin:12px 8px 0 0;padding:8px 14px;font:inherit");
    box.append(text, copy, close);
    document.body.append(box);
  });
})();
