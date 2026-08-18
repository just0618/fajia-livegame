(() => {
  "use strict";

  const bank = Array.isArray(window.FAJIA_TOLERANCE_QUESTIONS)
    ? window.FAJIA_TOLERANCE_QUESTIONS
    : [];
  const STORAGE_KEY = "fajia-livegame.tolerance.seen.v1";
  const SOUND_CHECK_AUDIO = "./audio/soundcheck.mp3?v=2-20260818";

  if (bank.length !== 18) {
    throw new Error("容忍度挑战原版18题未正确加载。");
  }

  const state = {
    total: 10,
    queue: [],
    index: 0,
    skipped: 0,
    seen: new Set(),
    currentAudio: null,
    audioToken: 0,
    observeTimer: null,
    observeValue: 3,
    phase: "idle",
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    setup: $("setupScreen"), play: $("playScreen"), result: $("resultScreen"),
    round: $("roundText"), progress: $("progressBar"), card: $("toleranceCard"),
    phase: $("phaseLabel"), question: $("questionText"), copy: $("phaseCopy"),
    observe: $("observeCount"), audioState: $("audioState"), replay: $("replayButton"),
    next: $("nextButton"), skip: $("skipButton"), finish: $("finishButton"),
    resultTotal: $("resultTotal"), resultSkipped: $("resultSkipped"), again: $("againButton"),
    start: $("startButton"), voiceTest: $("voiceTestButton"), history: $("historyText"),
    clearHistory: $("clearHistoryButton"), help: $("helpDialog"), openHelp: $("openHelpButton"),
    closeHelp: $("closeHelpButton"), toast: $("toast")
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

  function showToast(message) {
    clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => el.toast.classList.remove("is-visible"), 2400);
  }

  function selectedRounds() {
    return Number(document.querySelector('input[name="rounds"]:checked')?.value || 10);
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.seen])); } catch {}
    updateHistory();
  }

  function updateHistory() {
    const valid = [...state.seen].filter((id) => bank.some((q) => q.id === id)).length;
    el.history.textContent = `本机已出现 ${valid} / 18 · 下一轮优先未出现题`;
  }

  function buildQueue(total) {
    const unseen = shuffle(bank.filter((q) => !state.seen.has(q.id)));
    const seen = shuffle(bank.filter((q) => state.seen.has(q.id)));
    return [...unseen, ...seen].slice(0, total);
  }

  function stopAudio() {
    state.audioToken += 1;
    if (state.currentAudio) {
      try { state.currentAudio.pause(); } catch {}
      state.currentAudio = null;
    }
  }

  function clearObserve() {
    clearInterval(state.observeTimer);
    state.observeTimer = null;
    el.observe.hidden = true;
  }

  function report(name, value = "", detail = "") {
    window.FAJIA_RUM?.reportEvent?.(name, value, "tolerance_challenge", detail);
  }

  function playFile(src, onEnd, label = "正在播放原版语音…") {
    stopAudio();
    const token = state.audioToken;
    const audio = new Audio(src);
    state.currentAudio = audio;
    audio.preload = "auto";
    el.audioState.textContent = label;

    audio.addEventListener("ended", () => {
      if (token !== state.audioToken) return;
      state.currentAudio = null;
      onEnd?.();
    }, { once: true });

    audio.addEventListener("error", () => {
      if (token !== state.audioToken) return;
      state.currentAudio = null;
      el.audioState.textContent = "原版语音暂时无法播放，可直接读屏幕题目";
      showToast("语音没有成功播放，可以直接读题继续。" );
      onEnd?.();
    }, { once: true });

    const promise = audio.play();
    if (promise?.catch) {
      promise.catch(() => {
        if (token !== state.audioToken) return;
        state.currentAudio = null;
        el.audioState.textContent = "点击“重播本题”即可播放原版语音";
        showToast("浏览器拦截了自动播放，请点一下重播。" );
        onEnd?.();
      });
    }
  }

  function softChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.24);
      osc.onended = () => ctx.close();
    } catch {}
  }

  function startObservation() {
    state.phase = "observe";
    clearObserve();
    el.card.classList.remove("is-discussing");
    el.card.classList.add("is-observing");
    el.phase.textContent = "不能忍的话，请睁眼";
    el.copy.textContent = "先不要说答案，给彼此和直播间3秒观察时间。";
    el.audioState.textContent = "原版语音播放完毕";
    el.next.disabled = true;
    el.observe.hidden = false;
    state.observeValue = 3;
    el.observe.querySelector("strong").textContent = "3";

    state.observeTimer = setInterval(() => {
      state.observeValue -= 1;
      if (state.observeValue <= 0) {
        clearObserve();
        state.phase = "discuss";
        el.card.classList.remove("is-observing");
        el.card.classList.add("is-discussing");
        el.phase.textContent = "可以睁眼讨论啦";
        el.copy.textContent = "想聊多久都可以。准备好以后，再进入下一题。";
        el.audioState.textContent = "本题完成";
        el.next.disabled = false;
        softChime();
        return;
      }
      el.observe.querySelector("strong").textContent = String(state.observeValue);
    }, 1000);
  }

  function currentQuestion() { return state.queue[state.index] || null; }

  function renderProgress() {
    el.round.textContent = `第 ${state.index + 1} / ${state.total} 题`;
    el.progress.style.width = `${((state.index + 1) / state.total) * 100}%`;
  }

  function playQuestion({ replay = false } = {}) {
    const q = currentQuestion();
    if (!q) return;
    clearObserve();
    el.card.classList.remove("is-observing", "is-discussing");
    el.phase.textContent = replay ? "重新听一次" : "双方闭眼";
    el.question.textContent = q.text;
    el.copy.textContent = "先保持闭眼。约1.4秒后会播放原版题目语音；如果不能忍，就睁眼。";
    el.next.disabled = true;
    state.phase = "audio";
    playFile(q.audio, startObservation, replay ? "正在重播原版题目语音…" : "准备播放原版题目语音…");
    report(replay ? "tolerance_replay" : "tolerance_question", q.id, `${state.index + 1}/${state.total}`);
  }

  function markCurrentSeen() {
    const q = currentQuestion();
    if (!q) return;
    state.seen.add(q.id);
    saveSeen();
  }

  function goNext() {
    markCurrentSeen();
    if (state.index >= state.total - 1) {
      finishRound();
      return;
    }
    state.index += 1;
    renderProgress();
    playQuestion();
  }

  function skipCurrent() {
    stopAudio();
    clearObserve();
    state.skipped += 1;
    report("tolerance_skip", currentQuestion()?.id || "", `${state.index + 1}/${state.total}`);
    goNext();
  }


  function startRound() {
    state.total = selectedRounds();
    state.queue = buildQueue(state.total);
    state.index = 0;
    state.skipped = 0;
    state.phase = "audio";
    el.setup.hidden = true;
    el.result.hidden = true;
    el.play.hidden = false;
    el.resultTotal.textContent = "0";
    el.resultSkipped.textContent = "0";
    el.next.innerHTML = '下一题 <span aria-hidden="true">→</span>';
    el.replay.disabled = false;
    el.skip.disabled = false;
    renderProgress();
    el.card.classList.remove("is-observing", "is-discussing");
    report("tolerance_start", String(state.total), "paperfish_original_v2");
    playQuestion();
  }

  function finishRound() {
    stopAudio();
    clearObserve();
    const hasQuestionStarted = !["opening", "openingDone", "idle"].includes(state.phase);
    if (hasQuestionStarted && currentQuestion()) markCurrentSeen();
    const completed = hasQuestionStarted ? Math.min(state.index + 1, state.total) : 0;
    el.play.hidden = true;
    el.result.hidden = false;
    el.resultTotal.textContent = String(completed);
    el.resultSkipped.textContent = String(state.skipped);
    report("tolerance_complete", String(completed), `skipped_${state.skipped}`);
  }

  function returnSetup() {
    stopAudio(); clearObserve();
    el.result.hidden = true; el.play.hidden = true; el.setup.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function testVoice() {
    playFile(SOUND_CHECK_AUDIO, () => {
      el.audioState && (el.audioState.textContent = "等待开始");
    }, "正在试听原版开头片段…");
    showToast("正在播放原版开头的一小段，确认能听见即可。" );
  }

  el.start.addEventListener("click", startRound);
  el.replay.addEventListener("click", () => playQuestion({ replay: true }));
  el.next.addEventListener("click", goNext);
  el.skip.addEventListener("click", skipCurrent);
  el.finish.addEventListener("click", finishRound);
  el.again.addEventListener("click", returnSetup);
  el.voiceTest.addEventListener("click", testVoice);
  el.clearHistory.addEventListener("click", () => {
    state.seen.clear(); saveSeen(); showToast("已清除本机已出现题记录。" );
  });

  el.openHelp.addEventListener("click", () => {
    if (typeof el.help.showModal === "function") el.help.showModal();
  });
  el.closeHelp.addEventListener("click", () => el.help.close());
  el.help.addEventListener("click", (event) => { if (event.target === el.help) el.help.close(); });

  loadSeen();
})();
