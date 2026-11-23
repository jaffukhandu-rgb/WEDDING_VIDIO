// Preview-only transport: the downloaded source HTML is never modified by the controls.
// The preview iframe has a sandboxed opaque origin; commands use postMessage.
const CHANNEL = "wedding-admin-preview-controls-v1";

// Runs before the invitation's own scripts. Intercepts its timers so Pause does not
// leave a scene/replay timeout advancing while CSS animations are stopped.
const BRIDGE = String.raw`
(() => {
  "use strict";
  const CHANNEL = "wedding-admin-preview-controls-v1";
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);
  const nativeMediaPlay = HTMLMediaElement.prototype.play;

  let paused = false;
  let nextId = -1;
  const timers = new Map();
  const pausedAnimations = new Set();
  const knownMedia = new Set();
  const mediaToResume = new Set();
  let videoPlaybackObserved = false;
  let mutationObserver = null;

  function schedule(task) {
    if (paused || !timers.has(task.id)) return;
    task.startedAt = performance.now();
    task.handle = nativeSetTimeout(() => {
      task.handle = null;
      if (paused) {
        task.remaining = 0;
        return;
      }
      if (!task.repeating) timers.delete(task.id);
      try {
        task.callback.apply(window, task.args);
      } finally {
        if (task.repeating && timers.has(task.id)) {
          task.remaining = task.delay;
          schedule(task);
        }
      }
    }, task.remaining);
  }

  function createTimer(callback, delay, repeating, args) {
    // Legacy string-based timer callbacks are left to the browser; supported
    // invitation templates use function callbacks.
    if (typeof callback !== "function") {
      return repeating
        ? nativeSetInterval(callback, delay, ...args)
        : nativeSetTimeout(callback, delay, ...args);
    }
    const number = Number(delay);
    const normalized = Number.isFinite(number) ? Math.max(0, number) : 0;
    const task = {
      id: nextId--,
      callback,
      args,
      delay: normalized,
      remaining: normalized,
      repeating,
      startedAt: 0,
      handle: null
    };
    timers.set(task.id, task);
    schedule(task);
    return task.id;
  }

  function clearTimer(id) {
    const task = timers.get(id);
    if (task) {
      if (task.handle !== null) nativeClearTimeout(task.handle);
      timers.delete(id);
    } else {
      nativeClearTimeout(id);
      nativeClearInterval(id);
    }
  }

  window.setTimeout = (callback, delay, ...args) =>
    createTimer(callback, delay, false, args);
  window.setInterval = (callback, delay, ...args) =>
    createTimer(callback, delay, true, args);
  window.clearTimeout = clearTimer;
  window.clearInterval = clearTimer;

  // Also catch detached audio created through new Audio(...).
  HTMLMediaElement.prototype.play = function (...args) {
    knownMedia.add(this);
    if (paused) {
      mediaToResume.add(this);
      return Promise.resolve();
    }
    return nativeMediaPlay.apply(this, args);
  };

  function pauseAnimations() {
    for (const animation of document.getAnimations()) {
      if (animation.playState === "running" || animation.playState === "pending") {
        try {
          animation.pause();
          pausedAnimations.add(animation);
        } catch {
          // Unsupported animation types do not prevent other controls.
        }
      }
    }
  }

  function pauseMedia() {
    for (const media of document.querySelectorAll("audio, video")) {
      knownMedia.add(media);
    }
    for (const media of knownMedia) {
      if (!media.paused) {
        mediaToResume.add(media);
        media.pause();
      }
    }
  }

  function pause() {
    if (paused) return;
    paused = true;
    for (const task of timers.values()) {
      if (task.handle !== null) {
        task.remaining = Math.max(0, task.remaining - (performance.now() - task.startedAt));
        nativeClearTimeout(task.handle);
        task.handle = null;
      }
    }
    pauseAnimations();
    pauseMedia();
    // Some templates start their CSS timeline after fonts resolve.
    mutationObserver = new MutationObserver(() => {
      if (paused) {
        pauseAnimations();
        pauseMedia();
      }
    });
    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  function play() {
    if (!paused) return;
    paused = false;
    mutationObserver?.disconnect();
    mutationObserver = null;
    for (const animation of pausedAnimations) {
      if (animation.playState === "paused") {
        try {
          animation.play();
        } catch {
          // Ignore an animation removed while preview was paused.
        }
      }
    }
    pausedAnimations.clear();
    for (const task of timers.values()) schedule(task);
    for (const media of mediaToResume) {
      nativeMediaPlay.call(media).catch(() => {});
    }
    mediaToResume.clear();
  }

  // Runtime smoke signals are informational; arbitrary template scripts remain untrusted.
  const runtimeErrors=[];
  function sendRuntimeReport(){
    const stage=document.querySelector(".stage")||document.querySelector("main");
    const bounds=stage?.getBoundingClientRect();
    const sceneCount=document.querySelectorAll(".scene").length;
    const backgroundVideo=document.querySelector('video[data-wedding-background]');
    const bookPageCount=document.querySelectorAll(".book > .pg").length;
    const monogramNode=document.querySelector('[data-bind-initials="partner1,partner2"]');
    const monogramExpected=monogramNode?.getAttribute('data-expected-initials');
    const monogramActual=monogramNode
      ? [...monogramNode.querySelectorAll('text')].map(node=>node.textContent.trim()).join('')
        || monogramNode.textContent.replace(/\s+/g,'')
      : null;
    window.parent.postMessage({
      channel:CHANNEL,
      kind:"runtime-validation",
      data:{
        sceneCount:sceneCount||bookPageCount,
        stageWidth:bounds?.width||0,
        stageHeight:bounds?.height||0,
        started:!!stage?.classList.contains("go"),
        monogram:monogramExpected==null?null
          : {expected:monogramExpected,actual:monogramActual},
        errors:runtimeErrors.slice(),
        smartTextFit:(() => {
          const root=document.querySelector('[data-video-auto-layout="v1"]');
          if (!root) return null;
          const fit=Number(root.dataset.textFit);
          return Number.isFinite(fit) ? fit : null;
        })(),
        smartTextFitRequired:(() => {
          const root=document.querySelector('[data-video-auto-layout="v1"]');
          if (!root) return null;
          const required=Number(root.dataset.textFitRequired);
          return Number.isFinite(required) ? required : null;
        })(),
        videoBackground:backgroundVideo ? {
          ready:backgroundVideo.readyState>=2&&backgroundVideo.videoWidth>0,
          advancing:videoPlaybackObserved,
          error:backgroundVideo.error?.message||null
        } : null,
        brokenImages:[...document.images].filter(img=>!img.complete||(img.currentSrc&&img.naturalWidth===0)).length,
        overflowingText:[...document.querySelectorAll('h1,h2,h3,p,[data-bind]')].filter(node=>{
          const rect=node.getBoundingClientRect();
          return rect.width>0&&rect.height>0&&(node.scrollWidth>node.clientWidth+3||node.scrollHeight>node.clientHeight+3);
        }).length
      }
    },"*");
  }
  window.addEventListener("error",event=>{
    if(event.target!==window)return;
    runtimeErrors.push(String(event.message||"Script error").slice(0,160));
    if(runtimeErrors.length>5)runtimeErrors.shift();
    sendRuntimeReport();
  });
  window.addEventListener("unhandledrejection",event=>{
    runtimeErrors.push(String(event.reason?.message||event.reason||"Unhandled rejection").slice(0,160));
    if(runtimeErrors.length>5)runtimeErrors.shift();
    sendRuntimeReport();
  });

  // Escape still closes the Admin modal when focus is inside the invitation iframe.
  window.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      window.parent.postMessage({ channel: CHANNEL, command: "close-modal" }, "*");
    }
  });

  window.addEventListener("message", event => {
    if (event.source !== window.parent || event.data?.channel !== CHANNEL) return;
    const command = event.data.command;
    if (command === "validate") { sendRuntimeReport(); return; }
    if (command === "pause") pause();
    else if (command === "play") play();
    else return;
    window.parent.postMessage({ channel: CHANNEL, state: paused ? "paused" : "playing" }, "*");
  });

  window.addEventListener("load", () => {
    const video=document.querySelector('video[data-wedding-background]');
    if (video) {
      let previousTime=video.currentTime;
      video.addEventListener("timeupdate", () => {
        if (video.currentTime > previousTime + .03 && !videoPlaybackObserved) {
          videoPlaybackObserved=true;
          sendRuntimeReport();
        }
        previousTime=video.currentTime;
      });
      video.addEventListener("loadeddata", sendRuntimeReport);
      video.addEventListener("error", sendRuntimeReport);
    }
    window.parent.postMessage({ channel: CHANNEL, state: "ready" }, "*");
    nativeSetTimeout(sendRuntimeReport, 400);
  }, { once: true });
})();
`;

// Avoid putting controls in the user's source or including them in downloaded HTML.
function makePreviewHtml(html) {
  const match = /<head\b[^>]*>/i;
  if (!match.test(html)) {
    throw new Error("A full HTML document with a head element is required.");
  }
  return html.replace(match, opening => opening + "<script>" + BRIDGE + "</script>");
}

export function createPreviewController({
  preview,
  playButton,
  pauseButton,
  restartButton,
  playbackStatus,
  musicPlayer,
  musicUpload,
  musicStatus,
  onRuntimeReport = () => {}
}) {
  let iframe = null;
  let previewHtml = "";
  let state = "empty";

  function showState(nextState) {
    state = nextState;
    const ready = nextState === "playing" || nextState === "paused";
    playButton.disabled = !ready;
    pauseButton.disabled = nextState !== "playing";
    restartButton.disabled = !ready;
    const messages = {
      empty: "Preview controls become available after preparing a template.",
      loading: "Loading preview…",
      playing: "Playing invitation preview",
      paused: "Preview paused"
    };
    playbackStatus.textContent = messages[nextState] ?? "Preview unavailable";
  }

  function startMusic() {
    if (!musicUpload.files?.[0]) return;
    musicPlayer.play().catch(() => {
      musicStatus.textContent = "Music is ready. Click Play to allow audio playback.";
    });
  }

  function reset() {
    iframe = null;
    previewHtml = "";
    musicPlayer.pause();
    showState("empty");
  }

  function mount(html) {
    previewHtml = makePreviewHtml(html);
    const frame = document.createElement("iframe");
    frame.title = "Animated invitation preview";
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("referrerpolicy", "no-referrer");
    iframe = frame;
    showState("loading");
    frame.srcdoc = previewHtml;
    preview.replaceChildren(frame);
  }

  window.addEventListener("message", event => {
    if (!iframe || event.source !== iframe.contentWindow) return;
    if (event.data?.channel !== CHANNEL) return;
    if (event.data.kind === "runtime-validation") {
      onRuntimeReport(event.data.data);
      return;
    }
    if (event.data.state === "ready" && state === "loading") {
      showState("playing");
      startMusic();
    } else if (event.data.state === "playing" || event.data.state === "paused") {
      showState(event.data.state);
    }
  });

  function send(command) {
    if (!iframe?.contentWindow || (state !== "playing" && state !== "paused")) return;
    iframe.contentWindow.postMessage({ channel: CHANNEL, command }, "*");
  }

  playButton.addEventListener("click", () => {
    send("play");
    startMusic();
  });

  pauseButton.addEventListener("click", () => {
    send("pause");
    musicPlayer.pause();
  });

  restartButton.addEventListener("click", () => {
    if (!previewHtml || (state !== "playing" && state !== "paused")) return;
    onRuntimeReport(null);
    musicPlayer.pause();
    try { musicPlayer.currentTime = 0; } catch { /* Audio may not be ready. */ }
    // A fresh isolated iframe resets animations, JS timers and the scene to 0s.
    const html = previewHtml;
    const frame = document.createElement("iframe");
    frame.title = "Animated invitation preview";
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("referrerpolicy", "no-referrer");
    iframe = frame;
    showState("loading");
    frame.srcdoc = html;
    preview.replaceChildren(frame);
  });

  showState("empty");
  return { mount, reset, requestValidation: () => send("validate") };
}
