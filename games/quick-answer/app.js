(() => {
  "use strict";

  const bank = Array.isArray(window.FAJIA_QUICK_ANSWER_QUESTIONS)
    ? window.FAJIA_QUICK_ANSWER_QUESTIONS
    : [];
  const players = ["法宣阁", "贺嘉述"];
  const STORAGE_KEY = "fajia-livegame.quick-answer.seen.v1";
  const AUDIO_VERSION = "71-20260813";

  if (bank.length !== 90) {
    throw new Error("快问快答题库未正确加载。");
  }

  const pools = {
    normal: bank.filter((q) => q.type === "normal"),
    observe: bank.filter((q) => q.type === "observe"),
    relation: bank.filter((q) => q.type === "relation"),
    light: bank.filter((q) => q.type === "light"),
    strong: bank.filter((q) => q.type === "strong"),
  };

  const state = {
    total: 10,
    seconds: 3,
    answerer: 0,
    queue: [],
    index: 0,
    skipped: 0,
    phase: "idle",
    timer: null,
    safety: null,
    remaining: 3,
    pausedFrom: "",
    seen: new Set(),

    audioContext: null,
    audioBuffers: new Map(),
    audioSource: null,
    playbackSerial: 0,
    currentQuestion: null,
    currentAudioEnd: null,
    currentReplay: false,
    userPaused: false,
    interruptionPending: false,
    recovering: false,
    fallbackNotified: false,
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    setup: $("setupScreen"),
    play: $("playScreen"),
    result: $("resultScreen"),
    round: $("roundText"),
    answerer: $("answererText"),
    progress: $("progressBar"),
    phase: $("phaseLabel"),
    ready: $("readyCount"),
    question: $("questionText"),
    clock: $("answerClock"),
    seconds: $("answerSeconds"),
    copy: $("phaseCopy"),
    pause: $("pauseButton"),
    replay: $("replayButton"),
    skip: $("skipButton"),
    finish: $("finishButton"),
    resultAnswerer: $("resultAnswerer"),
    resultTotal: $("resultTotal"),
    resultSkipped: $("resultSkipped"),
    swap: $("swapButton"),
    again: $("againButton"),
    history: $("historyText"),
    clearHistory: $("clearHistoryButton"),
    voiceTest: $("voiceTestButton"),
    help: $("helpDialog"),
    openHelp: $("openHelpButton"),
    closeHelp: $("closeHelpButton"),
    toast: $("toast"),
  };

  let toastTimer;

  function shuffle(items) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function radio(name, fallback) {
    return Number(
      document.querySelector(`input[name="${name}"]:checked`)?.value || fallback
    );
  }

  function showToast(msg) {
    clearTimeout(toastTimer);
    el.toast.textContent = msg;
    el.toast.classList.add("is-visible");
    toastTimer = setTimeout(
      () => el.toast.classList.remove("is-visible"),
      2400
    );
  }

  function loadSeen() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      state.seen = new Set(Array.isArray(raw) ? raw : []);
    } catch {
      state.seen = new Set();
    }
    updateHistory();
  }

  function saveSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.seen]));
    } catch {}
    updateHistory();
  }

  function updateHistory() {
    const count = [...state.seen].filter((id) =>
      bank.some((q) => q.id === id)
    ).length;
    el.history.textContent =
      `本机已出现 ${count} / 90 · 下一轮优先未出现题`;
  }

  function markSeen(q) {
    state.seen.add(q.id);
    saveSeen();
  }

  function pickOne(type, used) {
    const source = pools[type].filter((q) => !used.has(q.id));
    const unseen = source.filter((q) => !state.seen.has(q.id));
    const list = shuffle(unseen.length ? unseen : source);
    return list[0] || null;
  }

  function randomInt(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  function buildTypeLayout(n) {
    const types = new Array(n).fill("");
    let assaults = [];

    if (n === 10) {
      const p1 = randomInt(4, 6) - 1;
      const p2 = randomInt(8, 10) - 1;
      assaults = [p1, p2];
      types[p1] = "light";
      types[p2] = Math.random() < 0.65 ? "strong" : "light";
    } else {
      const p1 = randomInt(4, 6) - 1;
      const p2 = randomInt(8, 11) - 1;
      const p3 = randomInt(13, 15) - 1;
      assaults = [p1, p2, p3];
      types[p1] = "light";
      const strongPos = Math.random() < 0.5 ? p2 : p3;
      types[p2] = strongPos === p2 ? "strong" : "light";
      types[p3] = strongPos === p3 ? "strong" : "light";
    }

    assaults.forEach((p) => {
      if (p + 1 < n && !types[p + 1]) {
        types[p + 1] = "normal";
      }
    });

    assaults.forEach((p) => {
      if (types[p] === "strong" && p - 1 >= 0 && !types[p - 1]) {
        types[p - 1] = Math.random() < 0.5 ? "normal" : "observe";
      }
    });

    const target = n === 10
      ? { normal: 3, observe: 2, relation: 3 }
      : { normal: 4, observe: 4, relation: 4 };

    const current = {
      normal: types.filter((x) => x === "normal").length,
      observe: types.filter((x) => x === "observe").length,
      relation: types.filter((x) => x === "relation").length,
    };

    let filler = [];
    ["normal", "observe", "relation"].forEach((type) => {
      for (let i = current[type]; i < target[type]; i += 1) {
        filler.push(type);
      }
    });

    filler = shuffle(filler);

    for (let i = 0; i < n; i += 1) {
      if (!types[i]) {
        types[i] =
          filler.shift() || ["normal", "observe", "relation"][i % 3];
      }
    }

    return types;
  }

  function buildQueue(n) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const types = buildTypeLayout(n);
      const used = new Set();
      const queue = [];
      let ok = true;

      for (const type of types) {
        const q = pickOne(type, used);
        if (!q) {
          ok = false;
          break;
        }
        used.add(q.id);
        queue.push(q);
      }

      if (ok) return queue;
    }

    return shuffle(bank).slice(0, n);
  }

  function audioPath(question) {
    const match = String(question?.id || "").match(/(\d{3})$/);
    if (!match) return "";
    return `./audio/qa${match[1]}.mp3?v=${AUDIO_VERSION}`;
  }

  function speechRate() {
    return state.seconds === 2 ? 1.25 : state.seconds === 5 ? 1.0 : 1.12;
  }

  function createAudioContext() {
    if (state.audioContext) return state.audioContext;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      state.audioContext = new AudioCtx();
      state.audioContext.onstatechange = handleAudioContextStateChange;
      return state.audioContext;
    } catch {
      return null;
    }
  }

  function ensureAudioContextRunning() {
    const ctx = createAudioContext();
    if (!ctx) return Promise.resolve(null);

    if (ctx.state === "running") return Promise.resolve(ctx);

    try {
      const promise = ctx.resume();
      if (promise && typeof promise.then === "function") {
        return promise.then(() => ctx).catch(() => ctx);
      }
    } catch {}

    return Promise.resolve(ctx);
  }

  function speechFallback(text, onEnd) {
    if (
      !("speechSynthesis" in window) ||
      typeof window.SpeechSynthesisUtterance !== "function"
    ) {
      setTimeout(onEnd, 300);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = speechRate();
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
      window.speechSynthesis.speak(utterance);
    } catch {
      setTimeout(onEnd, 300);
    }
  }

  function stopBufferSource() {
    state.playbackSerial += 1;

    if (state.audioSource) {
      try {
        state.audioSource.onended = null;
        state.audioSource.stop(0);
      } catch {}
      try {
        state.audioSource.disconnect();
      } catch {}
      state.audioSource = null;
    }
  }

  function stopVoice() {
    stopBufferSource();
    window.speechSynthesis?.cancel?.();
    state.currentQuestion = null;
    state.currentAudioEnd = null;
    state.currentReplay = false;
    state.interruptionPending = false;
  }

  async function fetchDecodedAudio(question) {
    const ctx = createAudioContext();
    const src = audioPath(question);

    if (!ctx || !src) return null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller =
        typeof AbortController === "function" ? new AbortController() : null;
      const timeout = controller
        ? setTimeout(() => controller.abort(), 8000)
        : null;

      try {
        const response = await fetch(src, {
          cache: attempt === 0 ? "force-cache" : "reload",
          signal: controller?.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const bytes = await response.arrayBuffer();
        const buffer = await ctx.decodeAudioData(bytes.slice(0));

        if (timeout) clearTimeout(timeout);
        return buffer;
      } catch {
        if (timeout) clearTimeout(timeout);
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 180));
        }
      }
    }

    return null;
  }

  async function preloadRoundAudio() {
    state.audioBuffers = new Map();

    el.play.hidden = false;
    el.result.hidden = true;
    el.phase.textContent = "PREPARE";
    el.ready.hidden = true;
    el.question.hidden = false;
    el.question.textContent = "正在准备本轮音频";
    el.question.classList.add("is-listening");
    el.clock.hidden = true;
    el.pause.disabled = true;
    el.replay.disabled = true;
    el.skip.disabled = true;
    el.copy.textContent = `正在准备 0 / ${state.total}，准备完成后再开始。`;
    document.querySelector(".quick-card")?.classList.add("is-preparing");

    await ensureAudioContextRunning();

    let nextIndex = 0;
    let completed = 0;
    const failed = [];

    async function worker() {
      while (nextIndex < state.queue.length) {
        const index = nextIndex++;
        const question = state.queue[index];
        const buffer = await fetchDecodedAudio(question);

        if (buffer) {
          state.audioBuffers.set(question.id, buffer);
        } else {
          failed.push(question.id);
        }

        completed += 1;
        el.copy.textContent =
          `正在准备 ${completed} / ${state.total}，准备完成后再开始。`;
      }
    }

    const workers = [];
    const concurrency = Math.min(4, state.queue.length);
    for (let i = 0; i < concurrency; i += 1) {
      workers.push(worker());
    }

    await Promise.all(workers);
    document.querySelector(".quick-card")?.classList.remove("is-preparing");

    if (failed.length) {
      showToast(
        `有 ${failed.length} 条固定音频没有缓存成功，遇到时会自动使用系统语音。`
      );
    }

    return failed;
  }

  function playPreparedAudio(question, onEnd, { replay = false } = {}) {
    state.currentQuestion = question;
    state.currentAudioEnd = onEnd;
    state.currentReplay = replay;
    state.userPaused = false;
    state.interruptionPending = false;

    const ctx = state.audioContext;
    const buffer = state.audioBuffers.get(question.id);

    if (ctx && buffer && ctx.state === "running") {
      stopBufferSource();

      const serial = ++state.playbackSerial;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      state.audioSource = source;

      source.onended = () => {
        if (
          serial !== state.playbackSerial ||
          state.userPaused ||
          state.interruptionPending
        ) {
          return;
        }

        state.audioSource = null;
        onEnd();
      };

      try {
        source.start(0);
        return;
      } catch {}
    }

    if (ctx && buffer && ctx.state !== "running") {
      state.interruptionPending = true;
      recoverInterruptedAudio();
      return;
    }

    if (!state.fallbackNotified) {
      state.fallbackNotified = true;
      showToast("个别固定报题音频无法播放时，会自动使用系统语音。");
    }

    speechFallback(question.text, onEnd);
  }

  async function recoverInterruptedAudio() {
    if (
      state.recovering ||
      !state.interruptionPending ||
      state.userPaused ||
      state.phase !== "speaking" ||
      !state.currentQuestion ||
      !state.currentAudioEnd
    ) {
      return;
    }

    state.recovering = true;
    stopBufferSource();

    const ctx = await ensureAudioContextRunning();

    if (
      ctx &&
      ctx.state === "running" &&
      state.phase === "speaking" &&
      !state.userPaused
    ) {
      const question = state.currentQuestion;
      const onEnd = state.currentAudioEnd;
      const replay = state.currentReplay;

      state.interruptionPending = false;
      state.recovering = false;

      el.copy.textContent =
        "刚才的报题可能被系统声音打断，正在从头重新播放本题。";

      setTimeout(() => {
        if (state.phase === "speaking" && !state.userPaused) {
          playPreparedAudio(question, onEnd, { replay });
        }
      }, 120);
      return;
    }

    state.recovering = false;
  }

  function handleAudioContextStateChange() {
    const ctx = state.audioContext;
    if (!ctx) return;

    if (
      state.phase === "speaking" &&
      !state.userPaused &&
      ctx.state !== "running"
    ) {
      state.interruptionPending = true;
      clearSafety();
    }

    if (
      state.phase === "speaking" &&
      !state.userPaused &&
      state.interruptionPending &&
      ctx.state === "running"
    ) {
      recoverInterruptedAudio();
    }
  }

  function clearSafety() {
    if (state.safety) {
      clearTimeout(state.safety);
      state.safety = null;
    }
  }

  function clearTimers() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    clearSafety();
  }

  function updateProgress() {
    el.round.textContent = `第 ${state.index + 1} / ${state.total} 题`;
    el.answerer.textContent = `本轮回答者：${players[state.answerer]}`;
    el.progress.style.width = `${(state.index / state.total) * 100}%`;
  }

  function showListeningPlaceholder() {
    el.question.hidden = false;
    el.question.textContent = "请听题";
    el.question.classList.add("is-listening");
  }

  function showQuestionText(question) {
    el.question.hidden = false;
    el.question.textContent = question.text;
    el.question.classList.remove("is-listening");
  }

  function startReady() {
    state.phase = "ready";
    el.ready.hidden = false;
    el.question.hidden = true;
    el.clock.hidden = true;
    el.pause.disabled = true;
    el.replay.disabled = true;
    el.skip.disabled = true;
    el.phase.textContent = "READY";
    el.copy.textContent =
      `${players[state.answerer]}准备好了吗？3秒后开始连续报题。`;

    let n = 3;
    el.ready.textContent = n;

    state.timer = setInterval(() => {
      n -= 1;

      if (n <= 0) {
        clearInterval(state.timer);
        state.timer = null;
        el.ready.hidden = true;
        playCurrent();
      } else {
        el.ready.textContent = n;
      }
    }, 800);
  }

  function playCurrent() {
    if (state.index >= state.total) {
      showResults();
      return;
    }

    clearTimers();

    const q = state.queue[state.index];
    markSeen(q);
    updateProgress();

    state.phase = "speaking";
    state.currentReplay = false;

    el.phase.textContent = "LISTEN";
    showListeningPlaceholder();
    el.clock.hidden = true;
    el.copy.textContent = "请听题。";
    el.pause.disabled = false;
    el.pause.textContent = "暂停";
    el.replay.disabled = true;
    el.skip.disabled = true;

    let finished = false;

    const finishAudio = () => {
      if (finished || state.phase !== "speaking") return;
      finished = true;
      clearSafety();
      beginAnswer();
    };

    // Buffer is already decoded and in memory: start immediately.
    playPreparedAudio(q, finishAudio);

    const buffer = state.audioBuffers.get(q.id);
    const safeMs = buffer
      ? Math.max(5500, (buffer.duration + 2.0) * 1000)
      : 9000;

    state.safety = setTimeout(() => {
      if (
        state.phase === "speaking" &&
        !state.userPaused &&
        !state.interruptionPending
      ) {
        stopBufferSource();
        finishAudio();
      }
    }, safeMs);
  }

  function beginAnswer() {
    const q = state.queue[state.index];

    state.phase = "answer";
    state.remaining = state.seconds;
    state.currentQuestion = null;
    state.currentAudioEnd = null;
    state.currentReplay = false;

    showQuestionText(q);
    el.phase.textContent = "ANSWER";
    el.clock.hidden = false;
    el.seconds.textContent = state.remaining;
    el.copy.textContent =
      "第一反应直接说出来。倒计时结束后下一题会立刻开口。";
    el.pause.disabled = false;
    el.replay.disabled = false;
    el.skip.disabled = false;

    runAnswerTimer();
  }

  function runAnswerTimer() {
    if (state.timer) clearInterval(state.timer);

    state.timer = setInterval(() => {
      state.remaining -= 1;
      el.seconds.textContent = state.remaining;

      if (state.remaining <= 0) {
        clearInterval(state.timer);
        state.timer = null;
        advance();
      }
    }, 1000);
  }

  function advance() {
    clearTimers();
    stopBufferSource();
    window.speechSynthesis?.cancel?.();

    state.index += 1;

    if (state.index >= state.total) {
      showResults();
      return;
    }

    // No artificial delay: next question starts immediately.
    playCurrent();
  }

  function reportSkip() {
    const q = state.queue[state.index];
    const code = window.FAJIA_CONTENT_CODE
      ? window.FAJIA_CONTENT_CODE(q.id)
      : "";

    if (
      code &&
      window.FAJIA_RUM &&
      typeof window.FAJIA_RUM.reportEvent === "function"
    ) {
      window.FAJIA_RUM.reportEvent(
        "skip_question",
        code,
        "quick_answer",
        "question_spoken"
      );
    }
  }

  function skip() {
    if (state.phase !== "answer") return;
    reportSkip();
    state.skipped += 1;
    advance();
  }

  function replayCurrent() {
    if (state.phase !== "answer") return;

    clearTimers();

    const q = state.queue[state.index];
    state.phase = "speaking";
    state.currentReplay = true;

    el.phase.textContent = "REPLAY";
    showQuestionText(q);
    el.clock.hidden = true;
    el.copy.textContent =
      "正在重新播放本题；播完后重新开始完整回答倒计时。";
    el.pause.disabled = false;
    el.pause.textContent = "暂停";
    el.replay.disabled = true;
    el.skip.disabled = true;

    let finished = false;

    const finishReplay = () => {
      if (finished || state.phase !== "speaking") return;
      finished = true;
      clearSafety();
      beginAnswer();
    };

    playPreparedAudio(q, finishReplay, { replay: true });

    const buffer = state.audioBuffers.get(q.id);
    const safeMs = buffer
      ? Math.max(5500, (buffer.duration + 2.0) * 1000)
      : 9000;

    state.safety = setTimeout(() => {
      if (
        state.phase === "speaking" &&
        !state.userPaused &&
        !state.interruptionPending
      ) {
        stopBufferSource();
        finishReplay();
      }
    }, safeMs);
  }

  async function togglePause() {
    if (state.phase === "speaking") {
      state.pausedFrom = "speaking";
      state.phase = "paused";
      state.userPaused = true;
      clearSafety();

      if (state.audioContext && state.audioContext.state === "running") {
        try {
          await state.audioContext.suspend();
        } catch {}
      } else {
        window.speechSynthesis?.pause?.();
      }

      el.pause.textContent = "继续";
      el.copy.textContent = "已暂停。";
      el.replay.disabled = true;
      el.skip.disabled = true;
      return;
    }

    if (state.phase === "answer") {
      state.pausedFrom = "answer";
      state.phase = "paused";
      state.userPaused = true;

      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
      }

      el.pause.textContent = "继续";
      el.copy.textContent = "已暂停。";
      el.replay.disabled = true;
      el.skip.disabled = true;
      return;
    }

    if (state.phase === "paused") {
      const from = state.pausedFrom;
      state.userPaused = false;
      state.phase = from;
      el.pause.textContent = "暂停";

      if (from === "speaking") {
        if (state.audioContext) {
          try {
            await state.audioContext.resume();
          } catch {}
        } else {
          window.speechSynthesis?.resume?.();
        }

        el.copy.textContent = state.currentReplay
          ? "正在重新播放本题；播完后重新开始完整回答倒计时。"
          : "请听题。";

        const q = state.currentQuestion;
        const buffer = q ? state.audioBuffers.get(q.id) : null;

        if (buffer) {
          state.safety = setTimeout(() => {
            if (
              state.phase === "speaking" &&
              !state.userPaused &&
              !state.interruptionPending
            ) {
              recoverInterruptedAudio();
            }
          }, Math.max(5500, (buffer.duration + 2.0) * 1000));
        }
      } else {
        el.copy.textContent =
          "第一反应直接说出来。倒计时结束后下一题会立刻开口。";
        el.replay.disabled = false;
        el.skip.disabled = false;
        runAnswerTimer();
      }
    }
  }

  function showResults() {
    clearTimers();
    stopVoice();
    state.phase = "done";

    el.play.hidden = true;
    el.result.hidden = false;
    el.resultAnswerer.textContent =
      `本轮回答者：${players[state.answerer]}`;
    el.resultTotal.textContent = String(state.total);
    el.resultSkipped.textContent = String(state.skipped);
    el.swap.textContent = `换${players[1 - state.answerer]}再来一轮`;
  }

  async function prepareAndStart(answerer) {
    state.total = radio("rounds", 10);
    state.seconds = radio("seconds", 3);
    state.answerer =
      answerer === "random"
        ? Math.floor(Math.random() * 2)
        : Number(answerer);
    state.queue = buildQueue(state.total);
    state.index = 0;
    state.skipped = 0;
    state.phase = "preparing";
    state.fallbackNotified = false;

    // Important on iPhone: request AudioContext permission directly
    // from the start-button user gesture, before any async fetch work.
    await ensureAudioContextRunning();

    el.setup.hidden = true;
    el.result.hidden = true;
    el.play.hidden = false;
    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });

    await preloadRoundAudio();

    if (state.phase !== "preparing") return;
    startReady();
  }

  async function swapAndStart() {
    const next = 1 - state.answerer;
    state.queue = buildQueue(state.total);
    state.answerer = next;
    state.index = 0;
    state.skipped = 0;
    state.phase = "preparing";
    state.fallbackNotified = false;

    await ensureAudioContextRunning();

    el.result.hidden = true;
    el.play.hidden = false;
    updateProgress();

    await preloadRoundAudio();

    if (state.phase !== "preparing") return;
    startReady();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toSetup() {
    clearTimers();
    stopVoice();
    state.phase = "idle";

    el.play.hidden = true;
    el.result.hidden = true;
    el.setup.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function testVoice() {
    const sample = bank[60] || bank[0];

    await ensureAudioContextRunning();
    let buffer = state.audioBuffers.get(sample.id);

    if (!buffer) {
      buffer = await fetchDecodedAudio(sample);
      if (buffer) state.audioBuffers.set(sample.id, buffer);
    }

    playPreparedAudio(sample, () => {});
  }

  function maybeRecoverFromSystemInterruption() {
    if (
      document.visibilityState === "visible" &&
      state.phase === "speaking" &&
      state.interruptionPending &&
      !state.userPaused
    ) {
      recoverInterruptedAudio();
    }
  }

  document
    .querySelectorAll("[data-answerer]")
    .forEach((button) =>
      button.addEventListener(
        "click",
        () => prepareAndStart(button.dataset.answerer)
      )
    );

  el.voiceTest.addEventListener("click", testVoice);
  el.pause.addEventListener("click", togglePause);
  el.replay.addEventListener("click", replayCurrent);
  el.skip.addEventListener("click", skip);

  el.finish.addEventListener("click", () => {
    if (window.confirm("结束当前这一轮吗？")) showResults();
  });

  el.swap.addEventListener("click", swapAndStart);
  el.again.addEventListener("click", toSetup);

  el.clearHistory.addEventListener("click", () => {
    if (window.confirm("清除本机快问快答的已出现题目记录吗？")) {
      state.seen = new Set();
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      updateHistory();
      showToast("已清除题目进度。");
    }
  });

  el.openHelp.addEventListener("click", () => {
    if (typeof el.help.showModal === "function") {
      el.help.showModal();
    } else {
      showToast(
        "整轮音频会先准备好；听完题才显示文字，倒计时结束后立即播放下一题。"
      );
    }
  });

  el.closeHelp.addEventListener("click", () => el.help.close());

  el.help.addEventListener("click", (event) => {
    if (event.target === el.help) el.help.close();
  });

  document.addEventListener("visibilitychange", maybeRecoverFromSystemInterruption);
  window.addEventListener("focus", maybeRecoverFromSystemInterruption);
  window.addEventListener("pageshow", maybeRecoverFromSystemInterruption);

  loadSeen();
})();
