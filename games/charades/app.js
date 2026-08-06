(() => {
  "use strict";

  const bank = window.FAJIA_CHARADES_BANK;
  const STORAGE_KEY = "fajia-livegame.charades.completed.v1";
  const STORAGE_VERSION = 1;

  if (!bank) {
    throw new Error("题库未加载，请确认 questions.js 与 app.js 位于同一文件夹。");
  }

  const players = [
    {
      name: "法宣阁",
      image: "../../assets/players/fa.webp",
      className: "pink"
    },
    {
      name: "贺嘉述",
      image: "../../assets/players/he.webp",
      className: "gold"
    }
  ];

  const categoryLabels = {
    simple: "简单动作",
    daily: "日常情境",
    story: "关系情境",
    live: "直播情境",
    fajia: "法嘉专属",
    mixed: "全部混合"
  };

  const FIXED_RULE =
    "可以用语言、表情、手势和动作描述，但不能说出题目本身，也不能说出题目中包含的字。";

  const ROUND_SECONDS = 30;

  const state = {
    category: "mixed",
    totalRounds: 10,
    currentRound: 1,
    actorIndex: 0,
    questions: [],
    currentQuestion: null,
    usedQuestionKeys: new Set(),
    correct: 0,
    skipped: 0,
    timeouts: 0,
    solvedSeconds: [],
    remainingSeconds: ROUND_SECONDS,
    timerId: null,
    timerStartedAt: null,
    rememberProgress: true,
    persistedCompleted: new Set()
  };

  const elements = {
    setupScreen: document.getElementById("setupScreen"),
    playScreen: document.getElementById("playScreen"),
    resultScreen: document.getElementById("resultScreen"),
    restartButton: document.getElementById("restartButton"),
    scoreText: document.getElementById("scoreText"),
    roundText: document.getElementById("roundText"),
    categoryText: document.getElementById("categoryText"),
    roundProgressBar: document.getElementById("roundProgressBar"),

    roleStage: document.getElementById("roleStage"),
    actorImage: document.getElementById("actorImage"),
    actorName: document.getElementById("actorName"),
    guesserImage: document.getElementById("guesserImage"),
    guesserName: document.getElementById("guesserName"),
    ruleReminder: document.getElementById("ruleReminder"),
    revealButton: document.getElementById("revealButton"),

    promptStage: document.getElementById("promptStage"),
    promptCategory: document.getElementById("promptCategory"),
    questionNumber: document.getElementById("questionNumber"),
    promptText: document.getElementById("promptText"),
    changeQuestionButton: document.getElementById("changeQuestionButton"),
    memorizedButton: document.getElementById("memorizedButton"),

    readyStage: document.getElementById("readyStage"),
    startTimerButton: document.getElementById("startTimerButton"),

    timerStage: document.getElementById("timerStage"),
    timerActorName: document.getElementById("timerActorName"),
    timerCategory: document.getElementById("timerCategory"),
    timerDisplay: document.getElementById("timerDisplay"),
    timerRuleReminder: document.getElementById("timerRuleReminder"),
    activeTimerActions: document.getElementById("activeTimerActions"),
    correctButton: document.getElementById("correctButton"),
    skipButton: document.getElementById("skipButton"),
    timeoutActions: document.getElementById("timeoutActions"),
    timeoutNextButton: document.getElementById("timeoutNextButton"),

    resultScore: document.getElementById("resultScore"),
    resultFraction: document.getElementById("resultFraction"),
    resultBadge: document.getElementById("resultBadge"),
    resultDescription: document.getElementById("resultDescription"),
    resultCorrect: document.getElementById("resultCorrect"),
    resultSkipped: document.getElementById("resultSkipped"),
    resultTimeout: document.getElementById("resultTimeout"),
    resultAverage: document.getElementById("resultAverage"),
    playAgainButton: document.getElementById("playAgainButton"),
    rememberProgressCheckbox: document.getElementById("rememberProgressCheckbox"),
    progressTotalCount: document.getElementById("progressTotalCount"),
    progressCompletedCount: document.getElementById("progressCompletedCount"),
    progressRemainingCount: document.getElementById("progressRemainingCount"),
    progressNote: document.getElementById("progressNote"),
    clearScopeProgressButton: document.getElementById("clearScopeProgressButton"),
    clearAllProgressButton: document.getElementById("clearAllProgressButton"),

    helpDialog: document.getElementById("helpDialog"),
    openHelpButton: document.getElementById("openHelpButton"),
    closeHelpButton: document.getElementById("closeHelpButton"),
    toast: document.getElementById("toast")
  };

  let toastTimer;

  function getSelectedValue(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : null;
  }

  function shuffle(items) {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }

    return copy;
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");

    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2400);
  }

  function buildFullPool(category = state.category) {
    const entries =
      category === "mixed"
        ? Object.entries(bank)
        : [[category, bank[category]]];

    return entries.flatMap(([group, questions]) =>
      questions.map((text, index) => ({
        text,
        category: group,
        id: `charades-${group}-${String(index + 1).padStart(2, "0")}`
      }))
    );
  }

  function loadPersistedCompleted() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
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

  function savePersistedCompleted() {
    if (!state.rememberProgress) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: STORAGE_VERSION,
          completed: [...state.persistedCompleted],
          updatedAt: new Date().toISOString()
        })
      );
    } catch (error) {
      showToast("浏览器无法保存进度，本场仍可继续。");
    }
  }

  function markQuestionCompleted(question) {
    if (!state.rememberProgress || !question) return;
    state.persistedCompleted.add(question.id);
    savePersistedCompleted();
  }

  function selectedCategory() {
    return "mixed";
  }

  function updateProgressPreview() {
    const category = selectedCategory();
    const fullPool = buildFullPool(category);
    const persisted = loadPersistedCompleted();
    const remember = elements.rememberProgressCheckbox.checked;
    const completed = fullPool.filter((question) =>
      persisted.has(question.id)
    ).length;
    const remaining = remember ? fullPool.length - completed : fullPool.length;

    elements.progressTotalCount.textContent = `${fullPool.length}题`;
    elements.progressCompletedCount.textContent = remember ? `${completed}题` : "不读取";
    elements.progressRemainingCount.textContent = `${remaining}题`;
    elements.progressNote.textContent = remember
      ? "只有点击“猜对了”的题目会写入进度；换题、跳过和超时题目下次仍可能出现。"
      : "本场不读取或写入长期进度，但同一局会尽量避免立即重复。";
    elements.clearScopeProgressButton.disabled = completed === 0;
    elements.clearAllProgressButton.disabled = persisted.size === 0;
  }

  function buildPool() {
    return buildFullPool().filter((question) =>
      !state.rememberProgress || !state.persistedCompleted.has(question.id)
    );
  }

  function buildRecommendedQueue(pool, count) {
    const plan = [
      "simple", "daily", "simple", "live", "story",
      "fajia", "story", "live", "story", "fajia"
    ];
    const remaining = [...pool];
    const selected = [];

    for (let index = 0; index < count; index += 1) {
      const desired = plan[index % plan.length];
      let candidates = remaining.filter((question) => question.category === desired);
      if (!candidates.length) candidates = remaining;
      if (!candidates.length) break;
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      selected.push(picked);
      remaining.splice(remaining.findIndex((question) => question.id === picked.id), 1);
    }

    return [...selected, ...shuffle(remaining)];
  }

  function prepareQuestions() {
    const pool = buildPool();
    if (pool.length === 0) return false;

    state.totalRounds = Math.min(state.totalRounds, pool.length);
    state.questions = buildRecommendedQueue(pool, state.totalRounds);
    state.usedQuestionKeys.clear();
    return true;
  }

  function takeNextQuestion() {
    if (state.questions.length === 0) {
      // 理论上只会在反复跳过或换题时出现。
      // 重新洗牌保证游戏仍能继续。
      state.questions = shuffle(buildPool());
      showToast("当前未完成题目已轮过一遍，现已重新洗牌。");
    }

    return state.questions.shift();
  }

  function clearTimer() {
    if (state.timerId !== null) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function hideAllStages() {
    elements.roleStage.hidden = true;
    elements.promptStage.hidden = true;
    elements.readyStage.hidden = true;
    elements.timerStage.hidden = true;
  }

  function updateHeader() {
    const judged = state.currentRound - 1;
    elements.scoreText.textContent = `${state.correct} / ${judged}`;
    elements.roundText.textContent =
      `第 ${state.currentRound} / ${state.totalRounds} 题`;
    elements.categoryText.textContent = "本轮题目";
    elements.roundProgressBar.style.width =
      `${((state.currentRound - 1) / state.totalRounds) * 100}%`;
  }

  function renderRoleStage() {
    clearTimer();
    hideAllStages();

    const actor = players[state.actorIndex];
    const guesser = players[(state.actorIndex + 1) % players.length];

    elements.actorImage.src = actor.image;
    elements.actorImage.alt = actor.name;
    elements.actorName.textContent = actor.name;
    elements.guesserImage.src = guesser.image;
    elements.guesserImage.alt = guesser.name;
    elements.guesserName.textContent = guesser.name;
    elements.ruleReminder.textContent = FIXED_RULE;

    elements.roleStage.hidden = false;
    updateHeader();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderPromptStage() {
    hideAllStages();

    if (!state.currentQuestion) {
      state.currentQuestion = takeNextQuestion();
    }

    elements.promptCategory.textContent =
      categoryLabels[state.currentQuestion.category];
    elements.questionNumber.textContent =
      `CARD ${String(state.currentRound).padStart(2, "0")}`;
    elements.promptText.textContent = state.currentQuestion.text;
    elements.promptStage.hidden = false;

    window.requestAnimationFrame(() => {
      elements.promptText.focus({ preventScroll: true });
    });
  }

  function changeQuestion() {
    if (state.currentQuestion) {
      state.questions.push(state.currentQuestion);
    }

    const alternative = takeNextQuestion();
    state.currentQuestion = alternative;
    elements.promptCategory.textContent = categoryLabels[alternative.category];
    elements.promptText.textContent = alternative.text;
    showToast("已更换为一道新题，本轮题号不变。");
  }

  function renderReadyStage() {
    hideAllStages();
    elements.readyStage.hidden = false;
  }

  function updateTimerDisplay() {
    elements.timerDisplay.textContent = String(state.remainingSeconds);
    elements.timerDisplay.classList.toggle(
      "is-warning",
      state.remainingSeconds <= 10 && state.remainingSeconds > 0
    );
  }

  function renderTimerStage() {
    hideAllStages();

    const actor = players[state.actorIndex];

    state.remainingSeconds = ROUND_SECONDS;
    state.timerStartedAt = Date.now();

    elements.timerActorName.textContent = actor.name;
    elements.timerCategory.textContent =
      categoryLabels[state.currentQuestion.category];
    elements.timerRuleReminder.textContent = FIXED_RULE;
    elements.timerDisplay.classList.remove("is-timeout", "is-warning");
    elements.activeTimerActions.hidden = false;
    elements.timeoutActions.hidden = true;
    elements.timerStage.hidden = false;

    updateTimerDisplay();

    state.timerId = window.setInterval(() => {
      state.remainingSeconds -= 1;
      updateTimerDisplay();

      if (state.remainingSeconds <= 0) {
        handleTimeout();
      }
    }, 1000);
  }

  function handleCorrect() {
    if (elements.timerStage.hidden || state.timerId === null) {
      return;
    }

    clearTimer();

    const elapsedSeconds = Math.max(
      1,
      Math.min(
        ROUND_SECONDS,
        Math.round((Date.now() - state.timerStartedAt) / 1000)
      )
    );

    state.correct += 1;
    state.solvedSeconds.push(elapsedSeconds);
    markQuestionCompleted(state.currentQuestion);
    advanceRound();
  }

  function handleSkip() {
    if (elements.timerStage.hidden) {
      return;
    }

    clearTimer();
    state.skipped += 1;

    // 跳过不计入所选题数，也不交换角色。
    // 当前题目排到队尾，当前表演者重新抽取本回合的替代题。
    if (state.currentQuestion) {
      state.questions.push(state.currentQuestion);
    }
    state.currentQuestion = null;

    showToast("本题已跳过，不占用本轮题数。当前表演者将补抽一题。");
    renderRoleStage();
  }

  function handleTimeout() {
    clearTimer();
    state.remainingSeconds = 0;
    state.timeouts += 1;

    elements.timerDisplay.textContent = "时间到";
    elements.timerDisplay.classList.remove("is-warning");
    elements.timerDisplay.classList.add("is-timeout");
    elements.activeTimerActions.hidden = true;
    elements.timeoutActions.hidden = false;
  }

  function advanceRound() {
    state.currentQuestion = null;

    if (state.currentRound >= state.totalRounds) {
      showResults();
      return;
    }

    state.currentRound += 1;
    state.actorIndex = (state.actorIndex + 1) % players.length;
    renderRoleStage();
  }

  function getResultCopy(rate) {
    if (rate === 100) {
      return {
        badge: "动作翻译官组合",
        description:
          "每一题都成功传达，表演和理解已经像使用同一套动作语言。"
      };
    }

    if (rate >= 80) {
      return {
        badge: "一个动作就懂的搭档",
        description:
          "大多数题目都能迅速接住，偶尔的跳过只是在给直播增加悬念。"
      };
    }

    if (rate >= 60) {
      return {
        badge: "越演越有默契的组合",
        description:
          "已经建立起稳定的猜题节奏，下一局很可能会把分数继续推高。"
      };
    }

    if (rate >= 40) {
      return {
        badge: "脑洞正在同频",
        description:
          "有些动作已经成功对上频道，剩下的题目负责贡献节目效果。"
      };
    }

    return {
      badge: "表演派与猜谜派",
      description:
        "答案不一定最先猜到，但每一题都很适合留下新的经典画面。"
    };
  }

  function showResults() {
    clearTimer();

    const rate = Math.round((state.correct / state.totalRounds) * 100);
    const copy = getResultCopy(rate);
    const average =
      state.solvedSeconds.length === 0
        ? null
        : Math.round(
            state.solvedSeconds.reduce((sum, value) => sum + value, 0) /
              state.solvedSeconds.length
          );

    elements.playScreen.hidden = true;
    elements.resultScreen.hidden = false;

    elements.resultScore.textContent = `${rate}%`;
    elements.resultFraction.textContent =
      `${state.correct} / ${state.totalRounds} 题成功猜中`;
    elements.resultBadge.textContent = copy.badge;
    elements.resultDescription.textContent = copy.description;
    elements.resultCorrect.textContent = String(state.correct);
    elements.resultSkipped.textContent = String(state.skipped);
    elements.resultTimeout.textContent = String(state.timeouts);
    elements.resultAverage.textContent =
      average === null ? "—" : `${average}秒`;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startGame(starter) {
    state.category = "mixed";
    state.totalRounds = Number(getSelectedValue("rounds") || 10);
    state.rememberProgress = elements.rememberProgressCheckbox.checked;
    state.persistedCompleted = loadPersistedCompleted();
    state.currentRound = 1;
    state.actorIndex =
      starter === "random" ? Math.floor(Math.random() * players.length) : Number(starter);
    state.correct = 0;
    state.skipped = 0;
    state.timeouts = 0;
    state.solvedSeconds = [];
    state.currentQuestion = null;

    if (!prepareQuestions()) {
      showToast("题库已经全部猜对，请先清除进度。");
      return;
    }

    elements.setupScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.playScreen.hidden = false;

    renderRoleStage();
  }

  function returnToSetup() {
    clearTimer();
    elements.playScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.setupScreen.hidden = false;
    updateProgressPreview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearScopeProgress() {
    const fullPool = buildFullPool(selectedCategory());
    const ids = new Set(fullPool.map((question) => question.id));
    const persisted = loadPersistedCompleted();
    const removed = [...persisted].filter((id) => ids.has(id)).length;

    if (removed === 0) {
      showToast("当前题目范围没有已完成进度。");
      return;
    }

    const confirmed = window.confirm(
      `确定清除当前范围内${removed}道已完成题目的记录吗？`
    );
    if (!confirmed) return;

    ids.forEach((id) => persisted.delete(id));
    state.persistedCompleted = persisted;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: STORAGE_VERSION,
          completed: [...persisted],
          updatedAt: new Date().toISOString()
        })
      );
    } catch (error) {
      showToast("浏览器未能清除进度，请检查网站数据设置。");
      return;
    }

    updateProgressPreview();
    showToast("当前题目范围进度已清除。");
  }

  function clearAllProgress() {
    const persisted = loadPersistedCompleted();
    if (persisted.size === 0) {
      showToast("目前没有已保存的猜题进度。");
      return;
    }

    const confirmed = window.confirm(
      `确定清除全部${persisted.size}道已完成题目的记录吗？`
    );
    if (!confirmed) return;

    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      showToast("浏览器未能清除进度，请检查网站数据设置。");
      return;
    }

    state.persistedCompleted = new Set();
    updateProgressPreview();
    showToast("全部猜题进度已清除。");
  }

  document.querySelectorAll("[data-starter]").forEach((button) => {
    button.addEventListener("click", () => {
      startGame(button.dataset.starter);
    });
  });

  elements.restartButton.addEventListener("click", returnToSetup);
  elements.revealButton.addEventListener("click", renderPromptStage);
  elements.changeQuestionButton.addEventListener("click", changeQuestion);
  elements.memorizedButton.addEventListener("click", renderReadyStage);
  elements.startTimerButton.addEventListener("click", renderTimerStage);
  elements.correctButton.addEventListener("click", handleCorrect);
  elements.skipButton.addEventListener("click", handleSkip);
  elements.timeoutNextButton.addEventListener("click", advanceRound);
  elements.playAgainButton.addEventListener("click", returnToSetup);

  document.querySelectorAll('input[name="category"]').forEach((input) => {
    input.addEventListener("change", updateProgressPreview);
  });
  document.querySelectorAll('input[name="rounds"]').forEach((input) => {
    input.addEventListener("change", updateProgressPreview);
  });
  elements.rememberProgressCheckbox.addEventListener(
    "change",
    updateProgressPreview
  );
  elements.clearScopeProgressButton.addEventListener(
    "click",
    clearScopeProgress
  );
  elements.clearAllProgressButton.addEventListener(
    "click",
    clearAllProgress
  );

  elements.openHelpButton.addEventListener("click", () => {
    if (typeof elements.helpDialog.showModal === "function") {
      elements.helpDialog.showModal();
    } else {
      showToast("表演者查看并记住题目后开始30秒挑战，猜题者不能偷看。");
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

  window.addEventListener("beforeunload", clearTimer);
  updateProgressPreview();
})();
