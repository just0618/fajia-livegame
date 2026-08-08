(() => {
  "use strict";

  const bank = window.FAJIA_CHARADES_BANK;
  const STORAGE_KEY = "fajia-livegame.dual-imitation.completed.v1";
  const STORAGE_VERSION = 2;

  if (!bank) {
    throw new Error("题库未加载，请确认 questions.js 与 app.js 位于同一文件夹。");
  }

  const state = {
    totalRounds: 5,
    completed: 0,
    skipped: 0,
    queue: [],
    current: null,
    timer: null,
    rememberProgress: true,
    persistedCompleted: new Set()
  };

  const $ = (id) => document.getElementById(id);

  const elements = {
    setupScreen: $("setupScreen"),
    playScreen: $("playScreen"),
    resultScreen: $("resultScreen"),
    startButton: $("startButton"),
    countdownButton: $("countdownButton"),
    completeButton: $("completeButton"),
    skipButton: $("skipButton"),
    playAgainButton: $("playAgainButton"),
    roundText: $("roundText"),
    modePill: $("modePill"),
    questionType: $("questionType"),
    questionText: $("questionText"),
    questionHint: $("questionHint"),
    countdownNumber: $("countdownNumber"),
    countdownLabel: $("countdownLabel"),
    resultCompleted: $("resultCompleted"),
    resultSkipped: $("resultSkipped"),
    progressText: $("progressText"),
    rememberProgressCheckbox: $("rememberProgressCheckbox"),
    clearProgressButton: $("clearProgressButton"),
    helpDialog: $("helpDialog"),
    openHelpButton: $("openHelpButton"),
    closeHelpButton: $("closeHelpButton"),
    toast: $("toast")
  };

  let toastTimer;

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2300);
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function selectedRounds() {
    return Number(
      document.querySelector('input[name="rounds"]:checked')?.value || 5
    );
  }

  function flattenBank() {
    return Object.entries(bank).flatMap(([category, questions]) =>
      questions.map((text, index) => ({
        id: `dual-imitation-${category}-${String(index + 1).padStart(2, "0")}`,
        category,
        text
      }))
    );
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (
        !parsed ||
        parsed.version !== STORAGE_VERSION ||
        !Array.isArray(parsed.completed)
      ) {
        return new Set();
      }
      return new Set(parsed.completed.filter((id) => typeof id === "string"));
    } catch (error) {
      return new Set();
    }
  }

  function saveProgress() {
    if (!state.rememberProgress) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: STORAGE_VERSION,
          completed: [...state.persistedCompleted],
          updatedAt: new Date().toISOString()
        })
      );
    } catch (error) {
      showToast("浏览器无法保存进度，本局仍可继续。");
    }
  }

  function updateProgressText() {
    const total = flattenBank().length;
    const completed = loadProgress().size;
    elements.progressText.textContent =
      `题库共 ${total} 题，已完成 ${completed} 题；换掉的题不会计入。`;
  }

  const LOW_FREQUENCY_IDS = new Set([
    "dual-imitation-live-06",
    "dual-imitation-simple-01",
    "dual-imitation-simple-06",
    "dual-imitation-simple-07"
  ]);

  function pickOne(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function pickForCategory(items) {
    const lowFrequency = items.filter((item) => LOW_FREQUENCY_IDS.has(item.id));
    const regular = items.filter((item) => !LOW_FREQUENCY_IDS.has(item.id));

    if (lowFrequency.length && Math.random() < 0.15) {
      return pickOne(lowFrequency);
    }

    return pickOne(regular.length ? regular : lowFrequency);
  }

  function buildQueue(count) {
    const all = flattenBank();
    const unseen = state.rememberProgress
      ? all.filter((item) => !state.persistedCompleted.has(item.id))
      : all;

    if (unseen.length < count) return [];

    const plans = {
      3: ["simple", "story", "live"],
      5: ["simple", "story", "daily", "live", "story"]
    };

    const plan = plans[count] || plans[5];
    const remaining = [...unseen];
    const selected = [];

    plan.forEach((category) => {
      let candidates = remaining.filter((item) => item.category === category);
      if (!candidates.length) candidates = remaining;
      if (!candidates.length) return;

      const picked = pickForCategory(candidates);
      selected.push(picked);
      const index = remaining.findIndex((item) => item.id === picked.id);
      if (index >= 0) remaining.splice(index, 1);
    });

    return [...selected, ...shuffle(remaining)];
  }

  function resetCountdownUI() {
    clearInterval(state.timer);
    state.timer = null;
    elements.countdownNumber.textContent = "3";
    elements.countdownLabel.textContent = "准备好后开始3秒倒计时。";
    elements.countdownButton.hidden = false;
    elements.countdownButton.disabled = false;
    elements.completeButton.hidden = true;
  }

  function renderQuestion() {
    state.current = state.queue.shift();
    if (!state.current) {
      finishGame();
      return;
    }

    elements.roundText.textContent =
      `ROUND ${String(state.completed + 1).padStart(2, "0")} / ${String(state.totalRounds).padStart(2, "0")}`;
    elements.modePill.textContent = "双向模仿";
    elements.questionType.textContent = "双向模仿 · 同时表演";
    elements.questionText.textContent = state.current.text;
    elements.questionHint.textContent =
      "两个人都演“自己眼里的对方”。默认同时开始，也可以根据题目轮流表演；结束后可以说说哪里最像、哪里不像。";

    resetCountdownUI();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startCountdown() {
    if (state.timer) return;

    let remaining = 3;
    elements.countdownButton.disabled = true;
    elements.countdownNumber.textContent = String(remaining);
    elements.countdownLabel.textContent = "先别商量，准备自己的版本。";

    state.timer = setInterval(() => {
      remaining -= 1;

      if (remaining > 0) {
        elements.countdownNumber.textContent = String(remaining);
        return;
      }

      clearInterval(state.timer);
      state.timer = null;
      elements.countdownNumber.textContent = "GO";
      elements.countdownLabel.textContent =
        "一起演！看看对方眼里的自己是什么样。";
      elements.countdownButton.hidden = true;
      elements.completeButton.hidden = false;
    }, 1000);
  }

  function markCurrentCompleted() {
    if (!state.current) return;
    if (state.rememberProgress) {
      state.persistedCompleted.add(state.current.id);
      saveProgress();
    }
  }

  function completeQuestion() {
    markCurrentCompleted();
    state.completed += 1;

    if (state.completed >= state.totalRounds) {
      finishGame();
      return;
    }

    renderQuestion();
  }

  function skipQuestion() {
    state.skipped += 1;

    if (!state.queue.length) {
      const refill = buildQueue(state.totalRounds - state.completed);
      state.queue.push(...refill);
    }

    renderQuestion();
  }

  function startGame() {
    state.totalRounds = selectedRounds();
    state.completed = 0;
    state.skipped = 0;
    state.rememberProgress = elements.rememberProgressCheckbox.checked;
    state.persistedCompleted = loadProgress();
    state.queue = buildQueue(state.totalRounds);

    if (state.queue.length < state.totalRounds) {
      showToast("未完成题目不够这一局使用，请先清除题库进度。");
      return;
    }

    elements.setupScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.playScreen.hidden = false;
    renderQuestion();
  }

  function finishGame() {
    clearInterval(state.timer);
    state.timer = null;
    elements.playScreen.hidden = true;
    elements.setupScreen.hidden = true;
    elements.resultScreen.hidden = false;
    elements.resultCompleted.textContent = `${state.completed}轮`;
    elements.resultSkipped.textContent = `${state.skipped}张`;
    updateProgressText();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restart() {
    clearInterval(state.timer);
    state.timer = null;
    elements.playScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.setupScreen.hidden = false;
    updateProgressText();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  elements.startButton.addEventListener("click", startGame);
  elements.countdownButton.addEventListener("click", startCountdown);
  elements.completeButton.addEventListener("click", completeQuestion);
  elements.skipButton.addEventListener("click", skipQuestion);
  elements.playAgainButton.addEventListener("click", restart);

  elements.clearProgressButton.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    state.persistedCompleted = new Set();
    updateProgressText();
    showToast("题库进度已清除。");
  });

  elements.openHelpButton.addEventListener("click", () => {
    if (typeof elements.helpDialog.showModal === "function") {
      elements.helpDialog.showModal();
    } else {
      showToast("玩法：抽题 → 准备3秒 → 同时表演 → 对照一下。");
    }
  });

  elements.closeHelpButton.addEventListener("click", () => {
    elements.helpDialog.close();
  });

  elements.helpDialog.addEventListener("click", (event) => {
    if (event.target === elements.helpDialog) {
      elements.helpDialog.close();
    }
  });

  updateProgressText();
})();
