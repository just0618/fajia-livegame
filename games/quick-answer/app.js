(() => {
  "use strict";

  const bank = Array.isArray(window.FAJIA_QUICK_ANSWER_QUESTIONS)
    ? window.FAJIA_QUICK_ANSWER_QUESTIONS
    : [];
  const players = ["法宣阁", "贺嘉述"];
  const STORAGE_KEY = "fajia-livegame.quick-answer.seen.v1";
  const AUDIO_VERSION = "70-20260813";

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
    voiceMode: "",
    audioUnlocked: false,
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

  const audioPlayer = new Audio();
  audioPlayer.preload = "auto";
  audioPlayer.playsInline = true;

  const preloadPlayer = new Audio();
  preloadPlayer.preload = "auto";
  preloadPlayer.playsInline = true;

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
      2200
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

  function speakFallback(text, onEnd) {
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

  function stopVoice() {
    audioPlayer.onended = null;
    audioPlayer.onerror = null;
    try {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    } catch {}
    window.speechSynthesis?.cancel?.();
    state.voiceMode = "";
  }

  function unlockAudio(question) {
    if (!question || state.audioUnlocked) return;

    const src = audioPath(question);
    if (!src) return;

    try {
      audioPlayer.src = src;
      audioPlayer.muted = true;
      audioPlayer.volume = 0;
      audioPlayer.currentTime = 0;

      const promise = audioPlayer.play();
      if (promise && typeof promise.then === "function") {
        promise
          .then(() => {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            audioPlayer.muted = false;
            audioPlayer.volume = 1;
            state.audioUnlocked = true;
          })
          .catch(() => {
            audioPlayer.muted = false;
            audioPlayer.volume = 1;
          });
      }
    } catch {
      audioPlayer.muted = false;
      audioPlayer.volume = 1;
    }
  }

  function preloadNextAudio() {
    const next = state.queue[state.index + 1];
    if (!next) return;

    const src = audioPath(next);
    if (!src) return;

    try {
      preloadPlayer.src = src;
      preloadPlayer.load();
    } catch {}
  }

  function playQuestionAudio(question, onEnd) {
    stopVoice();

    const src = audioPath(question);
    if (!src) {
      state.voiceMode = "speech";
      speakFallback(question.text, onEnd);
      return;
    }

    let finished = false;
    let fallbackStarted = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      audioPlayer.onended = null;
      audioPlayer.onerror = null;
      onEnd();
    };

    const fallback = () => {
      if (finished || fallbackStarted) return;
      fallbackStarted = true;

      try {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
      } catch {}

      if (!state.fallbackNotified) {
        state.fallbackNotified = true;
        showToast("固定报题音频未能播放，已自动切换系统语音。");
      }

      state.voiceMode = "speech";
      speakFallback(question.text, finish);
    };

    try {
      state.voiceMode = "audio";
      audioPlayer.src = src;
      audioPlayer.muted = false;
      audioPlayer.volume = 1;
      audioPlayer.currentTime = 0;
      audioPlayer.onended = finish;
      audioPlayer.onerror = fallback;

      const promise = audioPlayer.play();
      if (promise && typeof promise.catch === "function") {
        promise.catch(fallback);
      }

      preloadNextAudio();
    } catch {
      fallback();
    }
  }

  function clearTimers() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    if (state.safety) {
      clearTimeout(state.safety);
      state.safety = null;
    }
  }

  function updateProgress() {
    el.round.textContent = `第 ${state.index + 1} / ${state.total} 题`;
    el.answerer.textContent = `本轮回答者：${players[state.answerer]}`;
    el.progress.style.width = `${(state.index / state.total) * 100}%`;
  }

  function startReady() {
    state.phase = "ready";
    el.ready.hidden = false;
    el.question.hidden = true;
    el.clock.hidden = true;
    el.pause.disabled = true;
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
    el.phase.textContent = "LISTEN";
    el.question.hidden = false;
    el.question.textContent = q.text;
    el.clock.hidden = true;
    el.copy.textContent =
      "正在播放报题音频；播完以后才开始回答倒计时。";
    el.pause.disabled = false;
    el.pause.textContent = "暂停";
    el.skip.disabled = true;

    let done = false;
    const finishSpeech = () => {
      if (done || state.phase !== "speaking") return;
      done = true;
      clearTimeout(state.safety);
      state.safety = null;
      beginAnswer();
    };

    playQuestionAudio(q, finishSpeech);

    state.safety = setTimeout(() => {
      if (state.phase === "speaking") {
        stopVoice();
        finishSpeech();
      }
    }, 12000);
  }

  function beginAnswer() {
    state.phase = "answer";
    state.remaining = state.seconds;
    el.phase.textContent = "ANSWER";
    el.clock.hidden = false;
    el.seconds.textContent = state.remaining;
    el.copy.textContent =
      "第一反应直接说出来。时间到后自动进入下一题。";
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
        setTimeout(advance, 220);
      }
    }, 1000);
  }

  function advance() {
    clearTimers();
    stopVoice();
    state.index += 1;

    if (state.index >= state.total) {
      showResults();
      return;
    }

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

  function togglePause() {
    if (state.phase === "speaking") {
      state.pausedFrom = "speaking";
      state.phase = "paused";
      clearTimeout(state.safety);
      state.safety = null;

      if (state.voiceMode === "audio") {
        audioPlayer.pause();
      } else {
        window.speechSynthesis?.pause?.();
      }

      el.pause.textContent = "继续";
      el.copy.textContent = "已暂停。";
      el.skip.disabled = true;
      return;
    }

    if (state.phase === "answer") {
      state.pausedFrom = "answer";
      state.phase = "paused";

      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
      }

      el.pause.textContent = "继续";
      el.copy.textContent = "已暂停。";
      el.skip.disabled = true;
      return;
    }

    if (state.phase === "paused") {
      const from = state.pausedFrom;
      state.phase = from;
      el.pause.textContent = "暂停";

      if (from === "speaking") {
        el.copy.textContent =
          "正在播放报题音频；播完以后才开始回答倒计时。";

        if (state.voiceMode === "audio") {
          const promise = audioPlayer.play();
          if (promise && typeof promise.catch === "function") {
            promise.catch(() => {
              const q = state.queue[state.index];
              state.voiceMode = "speech";
              speakFallback(q.text, () => {
                if (state.phase === "speaking") beginAnswer();
              });
            });
          }
        } else {
          window.speechSynthesis?.resume?.();
        }

        state.safety = setTimeout(() => {
          if (state.phase === "speaking") {
            stopVoice();
            beginAnswer();
          }
        }, 12000);
      } else {
        el.copy.textContent =
          "第一反应直接说出来。时间到后自动进入下一题。";
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

  function start(answerer) {
    state.total = radio("rounds", 10);
    state.seconds = radio("seconds", 3);
    state.answerer =
      answerer === "random"
        ? Math.floor(Math.random() * 2)
        : Number(answerer);
    state.queue = buildQueue(state.total);
    state.index = 0;
    state.skipped = 0;
    state.phase = "idle";

    unlockAudio(state.queue[0]);

    el.setup.hidden = true;
    el.result.hidden = true;
    el.play.hidden = false;
    updateProgress();
    startReady();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function swapAndStart() {
    const next = 1 - state.answerer;
    state.queue = buildQueue(state.total);
    state.answerer = next;
    state.index = 0;
    state.skipped = 0;

    unlockAudio(state.queue[0]);

    el.result.hidden = true;
    el.play.hidden = false;
    updateProgress();
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

  function testVoice() {
    const sample = bank[60] || bank[0];
    playQuestionAudio(sample, () => {});
  }

  document
    .querySelectorAll("[data-answerer]")
    .forEach((button) =>
      button.addEventListener(
        "click",
        () => start(button.dataset.answerer)
      )
    );

  el.voiceTest.addEventListener("click", testVoice);
  el.pause.addEventListener("click", togglePause);
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
        "网页自动播放报题音频，回答时间结束后立即进入下一题。"
      );
    }
  });

  el.closeHelp.addEventListener("click", () => el.help.close());
  el.help.addEventListener("click", (event) => {
    if (event.target === el.help) el.help.close();
  });

  loadSeen();
})();
