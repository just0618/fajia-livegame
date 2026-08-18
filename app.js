(() => {
  "use strict";

  const bank = Array.isArray(window.FAJIA_TOLERANCE_QUESTIONS)
    ? window.FAJIA_TOLERANCE_QUESTIONS
    : [];
  const sourceBanks = {
    paperfish: bank.filter((q) => q.source === "paperfish"),
    new18: bank.filter((q) => q.source === "new18"),
    old621: bank.filter((q) => q.source === "old621"),
  };
  const GROUP_COUNT = new Set(bank.map((q) => q.dup)).size;
  const STORAGE_KEY = "fajia-livegame.tolerance.seen-groups.v2";
  const SOUND_CHECK_AUDIO = "./audio/soundcheck.mp3?v=5-20260819";

  const SOURCE_PLAN = {
    5:  { paperfish: 2, new18: 2, old621: 1 },
    10: { paperfish: 4, new18: 4, old621: 2 },
    15: { paperfish: 6, new18: 6, old621: 3 },
  };
  const LEVEL_PLAN = {
    5:  [1, 2, 3, 3, 4],
    10: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4],
    15: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4],
  };

  if (sourceBanks.paperfish.length !== 18 || sourceBanks.new18.length !== 18 || sourceBanks.old621.length !== 20 || GROUP_COUNT !== 47) {
    throw new Error("容忍度挑战题库未正确加载：应为56条原始题、47个去重行为组。");
  }

  const state = {
    total: 10,
    queue: [],
    index: 0,
    skipped: 0,
    seenGroups: new Set(),
    currentAudio: null,
    audioToken: 0,
    observeTimer: null,
    observeValue: 3,
    phase: "idle",
    questionRevealed: false,
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    setup: $("setupScreen"), play: $("playScreen"), result: $("resultScreen"),
    round: $("roundText"), source: $("sourceText"), progress: $("progressBar"), card: $("toleranceCard"),
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

  function selectedConfig() {
    const raw = Number(document.querySelector('input[name="rounds"]:checked')?.value || "10");
    return [5, 10, 15].includes(raw) ? raw : 10;
  }

  function loadSeen() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      state.seenGroups = new Set(Array.isArray(raw) ? raw.filter((g) => bank.some((q) => q.dup === g)) : []);
    } catch {
      state.seenGroups = new Set();
    }
    updateHistory();
  }

  function saveSeen() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.seenGroups])); } catch {}
    updateHistory();
  }

  function updateHistory() {
    el.history.textContent = `本机已出现 ${state.seenGroups.size} / ${GROUP_COUNT} 组行为 · 下一轮优先没出现过的组`;
  }

  function orderedCandidates(items) {
    // 同等级内仍然随机，但优先本机尚未出现过的行为组。
    const unseen = shuffle(items.filter((q) => !state.seenGroups.has(q.dup)));
    const seen = shuffle(items.filter((q) => state.seenGroups.has(q.dup)));
    return [...unseen, ...seen];
  }

  function tryBuildQueue(total, allowEasterEgg) {
    const levels = LEVEL_PLAN[total];
    const remaining = { ...SOURCE_PLAN[total] };
    const allowed = bank.filter((q) => !q.easterEgg || allowEasterEgg);
    const selected = [];
    const usedGroups = new Set();

    function walk(pos) {
      if (pos >= levels.length) {
        return Object.values(remaining).every((n) => n === 0);
      }

      const level = levels[pos];
      let candidates = allowed.filter((q) =>
        q.level === level &&
        remaining[q.source] > 0 &&
        !usedGroups.has(q.dup)
      );
      candidates = orderedCandidates(candidates);

      // 彩蛋只在确实允许时保留极低优先级，避免一到L4就经常撞上结婚证。
      if (allowEasterEgg) {
        candidates.sort((a, b) => Number(Boolean(a.easterEgg)) - Number(Boolean(b.easterEgg)));
      }

      for (const q of candidates) {
        remaining[q.source] -= 1;
        usedGroups.add(q.dup);
        selected.push(q);
        if (walk(pos + 1)) return true;
        selected.pop();
        usedGroups.delete(q.dup);
        remaining[q.source] += 1;
      }
      return false;
    }

    return walk(0) ? selected : null;
  }

  function buildQueue(total) {
    // 10/15题局约5%概率允许“结婚证”彩蛋参与最后的L4候选；5题局不放彩蛋。
    const allowEasterEgg = total >= 10 && Math.random() < 0.05;
    let queue = tryBuildQueue(total, allowEasterEgg) || tryBuildQueue(total, false);
    if (!queue) throw new Error("没有找到满足来源比例与亲密等级的抽题组合。");

    // walk 已经按 L1→L4 的 LEVEL_PLAN 生成；同等级之间再轻微随机，避免每次节奏过于固定。
    const byLevel = new Map();
    queue.forEach((q) => {
      if (!byLevel.has(q.level)) byLevel.set(q.level, []);
      byLevel.get(q.level).push(q);
    });
    queue = [1, 2, 3, 4].flatMap((level) => shuffle(byLevel.get(level) || []));
    return queue;
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

  function playFile(src, onEnd, label = "正在播放题目语音…") {
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
      el.audioState.textContent = "题目语音暂时无法播放";
      showToast("语音没有成功播放，题目已显示，可以直接读题继续。" );
      onEnd?.();
    }, { once: true });

    const promise = audio.play();
    if (promise?.catch) {
      promise.catch(() => {
        if (token !== state.audioToken) return;
        state.currentAudio = null;
        el.audioState.textContent = "点击“重播本题”即可再次尝试";
        showToast("浏览器拦截了自动播放，请点一下重播。" );
        onEnd?.();
      });
    }
  }

  function playNarration(q, onEnd, replay = false) {
    playFile(q.audio, onEnd, replay ? "正在重播本题语音…" : "正在播放题目语音…");
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

  function revealQuestion() {
    const q = currentQuestion();
    if (!q) return;
    state.questionRevealed = true;
    el.question.textContent = q.text;
  }

  function startObservation() {
    revealQuestion();
    state.phase = "observe";
    clearObserve();
    el.card.classList.remove("is-discussing");
    el.card.classList.add("is-observing");
    el.phase.textContent = "不能忍的话，请睁眼";
    el.copy.textContent = "先不要说答案，给彼此和直播间3秒观察时间。";
    el.audioState.textContent = "题目播报完毕";
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
    el.source.textContent = "从轻到重 · 同组行为不会重复";
    el.progress.style.width = `${((state.index + 1) / state.total) * 100}%`;
  }

  function playQuestion({ replay = false } = {}) {
    const q = currentQuestion();
    if (!q) return;
    clearObserve();
    el.card.classList.remove("is-observing", "is-discussing");
    el.next.disabled = true;
    state.phase = "audio";

    if (!replay || !state.questionRevealed) {
      state.questionRevealed = false;
      el.phase.textContent = "双方闭眼";
      el.question.textContent = "请闭眼";
      el.copy.textContent = "先听题。题目会在语音播报结束后才显示。";
    } else {
      el.phase.textContent = "重新听一次";
      el.question.textContent = q.text;
      el.copy.textContent = "本题已经揭晓，可以重新听一次播报。";
    }

    playNarration(q, startObservation, replay);
    report(replay ? "tolerance_replay" : "tolerance_question", q.id, `${state.index + 1}/${state.total}_${q.source}_L${q.level}`);
  }

  function markCurrentSeen() {
    const q = currentQuestion();
    if (!q) return;
    state.seenGroups.add(q.dup);
    saveSeen();
  }

  function goNext() {
    markCurrentSeen();
    if (state.index >= state.total - 1) {
      finishRound();
      return;
    }
    state.index += 1;
    state.questionRevealed = false;
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
    state.total = selectedConfig();
    state.queue = buildQueue(state.total);
    state.index = 0;
    state.skipped = 0;
    state.phase = "audio";
    state.questionRevealed = false;
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
    const counts = state.queue.reduce((acc, q) => { acc[q.source] = (acc[q.source] || 0) + 1; return acc; }, {});
    report("tolerance_start", String(state.total), `v5_P${counts.paperfish||0}_N${counts.new18||0}_O${counts.old621||0}`);
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
    }, "正在试听纸包鱼老师原版开头片段…");
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
    state.seenGroups.clear(); saveSeen(); showToast("已清除本机已出现题记录。" );
  });

  el.openHelp.addEventListener("click", () => {
    if (typeof el.help.showModal === "function") el.help.showModal();
  });
  el.closeHelp.addEventListener("click", () => el.help.close());
  el.help.addEventListener("click", (event) => { if (event.target === el.help) el.help.close(); });

  loadSeen();
})();
