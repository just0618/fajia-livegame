(() => {
  "use strict";

  const bank = window.FAJIA_COMPATIBILITY_BANK;
  const STORAGE_KEY = "fajia-livegame.compatibility.completed.v1";
  const STORAGE_VERSION = 1;

  if (!bank) {
    throw new Error("题库未加载，请确认 questions.js 与 app.js 位于同一文件夹。");
  }

  const state = {
    questionMode: "live",
    totalRounds: 10,
    currentRound: 1,
    score: 0,
    differences: 0,
    skips: 0,
    questions: [],
    countdownRunning: false,
    rememberProgress: true,
    persistedCompleted: new Set()
  };

  const elements = {
    setupScreen: document.getElementById("setupScreen"),
    playScreen: document.getElementById("playScreen"),
    resultScreen: document.getElementById("resultScreen"),
    startGameButton: document.getElementById("startGameButton"),
    restartButton: document.getElementById("restartButton"),
    countdownButton: document.getElementById("countdownButton"),
    countdownActions: document.getElementById("countdownActions"),
    judgeActions: document.getElementById("judgeActions"),
    matchButton: document.getElementById("matchButton"),
    differentButton: document.getElementById("differentButton"),
    skipButton: document.getElementById("skipButton"),
    questionCard: document.getElementById("questionCard"),
    questionType: document.getElementById("questionType"),
    questionNumber: document.getElementById("questionNumber"),
    questionText: document.getElementById("questionText"),
    answerOptions: document.getElementById("answerOptions"),
    questionInstruction: document.getElementById("questionInstruction"),
    countdownStage: document.getElementById("countdownStage"),
    countdownValue: document.getElementById("countdownValue"),
    roundText: document.getElementById("roundText"),
    themeText: document.getElementById("themeText"),
    roundProgressBar: document.getElementById("roundProgressBar"),
    scoreText: document.getElementById("scoreText"),
    resultPercent: document.getElementById("resultPercent"),
    resultFraction: document.getElementById("resultFraction"),
    resultBadge: document.getElementById("resultBadge"),
    resultDescription: document.getElementById("resultDescription"),
    resultMatches: document.getElementById("resultMatches"),
    resultDifferences: document.getElementById("resultDifferences"),
    resultSkips: document.getElementById("resultSkips"),
    playAgainButton: document.getElementById("playAgainButton"),
    rememberProgressCheckbox: document.getElementById("rememberProgressCheckbox"),
    progressTotalCount: document.getElementById("progressTotalCount"),
    progressCompletedCount: document.getElementById("progressCompletedCount"),
    progressRemainingCount: document.getElementById("progressRemainingCount"),
    progressNote: document.getElementById("progressNote"),
    clearProgressButton: document.getElementById("clearProgressButton"),
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

  function buildRecommendedQuestions(pool, count) {
    const plan = [
      "warmup", "warmup", "relation", "relation", "highlight",
      "relation", "visible", "relation", "highlight", "visible"
    ];
    const remaining = [...pool];
    const selected = [];

    for (let index = 0; index < count; index += 1) {
      const desiredTier = plan[index % plan.length];
      let candidates = remaining.filter((question) => question.liveTier === desiredTier);

      if (!candidates.length) {
        const fallback = ["relation", "visible", "highlight", "warmup"];
        for (const tier of fallback) {
          candidates = remaining.filter((question) => question.liveTier === tier);
          if (candidates.length) break;
        }
      }

      if (!candidates.length) break;

      const rare = candidates.filter(
        (question) =>
          question.liveAction === "稀有高光" ||
          question.liveAction === "稀有深度"
      );
      const down = candidates.filter(
        (question) => question.liveAction === "降频"
      );
      const regular = candidates.filter(
        (question) =>
          question.liveAction !== "降频" &&
          question.liveAction !== "稀有高光" &&
          question.liveAction !== "稀有深度"
      );

      let source = regular;
      if (rare.length && Math.random() < 0.18) {
        source = rare;
      } else if (down.length && Math.random() < 0.22) {
        source = down;
      } else if (!source.length) {
        source = down.length ? down : rare;
      }

      const picked = source[Math.floor(Math.random() * source.length)];
      selected.push(picked);
      remaining.splice(remaining.findIndex((question) => question.id === picked.id), 1);
    }

    return selected;
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");

    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2400);
  }

  function buildQuestionPool() {
    return Object.entries(bank).flatMap(([category, questions]) =>
      questions.map((question, index) => ({
        ...question,
        category,
        id: `compatibility-${category}-${String(index + 1).padStart(2, "0")}`
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

  function updateProgressPreview() {
    const allQuestions = buildQuestionPool();
    const persisted = loadPersistedCompleted();
    const remember = elements.rememberProgressCheckbox.checked;
    const completed = allQuestions.filter((question) =>
      persisted.has(question.id)
    ).length;
    const remaining = remember ? allQuestions.length - completed : allQuestions.length;

    elements.progressTotalCount.textContent = `${allQuestions.length}题`;
    elements.progressCompletedCount.textContent = remember ? `${completed}题` : "不读取";
    elements.progressRemainingCount.textContent = `${remaining}题`;
    elements.progressNote.textContent = remember
      ? "判断“默契”或“不太默契”后才写入进度；跳过题目下次仍可能抽到。"
      : "本场不读取或写入长期进度，但同一局内不会出现重复题目。";
    elements.clearProgressButton.disabled = completed === 0;
  }

  function prepareQuestions() {
    const allQuestions = buildQuestionPool();
    const available = allQuestions.filter((question) =>
      !state.rememberProgress || !state.persistedCompleted.has(question.id)
    );

    if (available.length === 0) {
      return false;
    }

    state.totalRounds = Math.min(state.totalRounds, available.length);
    state.questions = buildRecommendedQuestions(available, state.totalRounds);
    return state.questions.length > 0;
  }

  function updateScore() {
    const judgedRounds = state.score + state.differences;
    elements.scoreText.textContent = `${state.score} / ${judgedRounds}`;
  }

  function updateRoundProgress() {
    const progress = ((state.currentRound - 1) / state.totalRounds) * 100;

    elements.roundText.textContent =
      `第 ${state.currentRound} / ${state.totalRounds} 题`;
    elements.themeText.textContent = "本轮题目";
    elements.roundProgressBar.style.width = `${progress}%`;
  }

  function renderOptions(options) {
    elements.answerOptions.innerHTML = "";

    if (!options || options.length === 0) {
      elements.answerOptions.hidden = true;
      return;
    }

    options.forEach((option) => {
      const tag = document.createElement("span");
      tag.className = "answer-option";
      tag.textContent = option;
      elements.answerOptions.appendChild(tag);
    });

    elements.answerOptions.hidden = false;
  }

  function renderQuestion() {
    const question = state.questions[state.currentRound - 1];

    if (!question) {
      showResults();
      return;
    }

    elements.questionCard.classList.toggle(
      "is-gold",
      question.type === "choice"
    );
    elements.questionType.textContent = question.label;
    elements.questionNumber.textContent =
      `CARD ${String(state.currentRound).padStart(2, "0")}`;
    elements.questionText.textContent = question.text;
    elements.questionInstruction.textContent =
      "想好答案后，点击下方按钮开始倒计时。";

    renderOptions(question.options);
    updateRoundProgress();
    updateScore();
    resetCountdownStage();

    window.requestAnimationFrame(() => {
      elements.questionText.focus({ preventScroll: true });
    });
  }

  function resetCountdownStage() {
    state.countdownRunning = false;
    elements.countdownValue.textContent = "READY";
    elements.countdownStage.classList.remove("is-running", "is-answer");
    elements.countdownActions.hidden = false;
    elements.judgeActions.hidden = true;
    elements.countdownButton.disabled = false;
  }

  function runCountdown() {
    if (state.countdownRunning) {
      return;
    }

    state.countdownRunning = true;
    elements.countdownButton.disabled = true;
    elements.countdownStage.classList.add("is-running");
    elements.countdownValue.textContent = "3";

    let value = 3;

    const timer = window.setInterval(() => {
      value -= 1;

      if (value > 0) {
        elements.countdownValue.textContent = String(value);
        return;
      }

      window.clearInterval(timer);
      elements.countdownStage.classList.remove("is-running");
      elements.countdownStage.classList.add("is-answer");
      elements.countdownValue.textContent = "请回答";
      elements.questionInstruction.textContent =
        "根据两个人刚才的回答与表现，记录这一轮是否默契。";
      elements.countdownActions.hidden = true;
      elements.judgeActions.hidden = false;
      state.countdownRunning = false;
    }, 850);
  }

  function advanceRound(result) {
    const question = state.questions[state.currentRound - 1];

    if (result === "match") {
      state.score += 1;
      markQuestionCompleted(question);
    } else if (result === "different") {
      state.differences += 1;
      markQuestionCompleted(question);
    } else if (result === "skip") {
      state.skips += 1;
    }

    if (state.currentRound >= state.totalRounds) {
      showResults();
      return;
    }

    state.currentRound += 1;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getResultCopy(percent) {
    if (percent === 100) {
      return {
        badge: "不需要对答案的默契搭档",
        description:
          "每一题都选择一致，这一局已经不是默契测试，而是默契展示了。"
      };
    }

    if (percent >= 80) {
      return {
        badge: "一个眼神就能接上的搭档",
        description:
          "大部分时候都能想到同一个答案，偶尔不同反而让这一局更有意思。"
      };
    }

    if (percent >= 60) {
      return {
        badge: "稳定在线的默契组合",
        description:
          "共同答案已经不少，剩下的差异正好可以成为继续了解彼此的话题。"
      };
    }

    if (percent >= 40) {
      return {
        badge: "不太默契也很有趣的搭档",
        description:
          "这一局出现了不少不同选择，但默契不只是一模一样，也包括理解彼此为什么不同。"
      };
    }

    return {
      badge: "最有反差感的默契搭档",
      description:
        "答案经常走向不同方向，节目效果已经拉满，下一局也许会出现完全不同的结果。"
    };
  }

  function showResults() {
    const judgedRounds = state.score + state.differences;
    const percent =
      judgedRounds === 0 ? 0 : Math.round((state.score / judgedRounds) * 100);
    const copy = getResultCopy(percent);

    elements.playScreen.hidden = true;
    elements.resultScreen.hidden = false;
    elements.roundProgressBar.style.width = "100%";

    elements.resultPercent.textContent = `${percent}%`;
    elements.resultFraction.textContent =
      `${state.score} / ${judgedRounds} 题表现默契`;
    elements.resultBadge.textContent = copy.badge;
    elements.resultDescription.textContent = copy.description;
    elements.resultMatches.textContent = String(state.score);
    elements.resultDifferences.textContent = String(state.differences);
    elements.resultSkips.textContent = String(state.skips);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startGame() {
    state.questionMode = "live";
    state.totalRounds = Number(getSelectedValue("rounds") || 10);
    state.rememberProgress = elements.rememberProgressCheckbox.checked;
    state.persistedCompleted = loadPersistedCompleted();
    state.currentRound = 1;
    state.score = 0;
    state.differences = 0;
    state.skips = 0;

    if (!prepareQuestions()) {
      showToast("默契题库已经全部完成，请先清除进度后再开始。");
      return;
    }

    elements.setupScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.playScreen.hidden = false;

    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToSetup() {
    state.countdownRunning = false;
    elements.playScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.setupScreen.hidden = false;
    updateProgressPreview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearProgress() {
    const persisted = loadPersistedCompleted();
    if (persisted.size === 0) {
      showToast("目前没有已保存的默契题库进度。");
      return;
    }

    const confirmed = window.confirm(
      `确定清除${persisted.size}道已完成题目的记录吗？`
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
    showToast("默契题库进度已清除。");
  }

  elements.startGameButton.addEventListener("click", startGame);
  elements.restartButton.addEventListener("click", returnToSetup);
  elements.playAgainButton.addEventListener("click", returnToSetup);
  elements.countdownButton.addEventListener("click", runCountdown);
  elements.matchButton.addEventListener("click", () => advanceRound("match"));
  elements.differentButton.addEventListener(
    "click",
    () => advanceRound("different")
  );
  elements.skipButton.addEventListener("click", () => {
    showToast("本题已跳过，不计入默契百分比，也不会写入长期进度。");
    advanceRound("skip");
  });

  document.querySelectorAll('input[name="questionMode"]').forEach((input) => {
    input.addEventListener("change", updateProgressPreview);
  });

  document.querySelectorAll('input[name="rounds"]').forEach((input) => {
    input.addEventListener("change", updateProgressPreview);
  });
  elements.rememberProgressCheckbox.addEventListener(
    "change",
    updateProgressPreview
  );
  elements.clearProgressButton.addEventListener("click", clearProgress);

  elements.openHelpButton.addEventListener("click", () => {
    if (typeof elements.helpDialog.showModal === "function") {
      elements.helpDialog.showModal();
    } else {
      showToast("倒计时结束后请回答，再由两个人自行判断是否默契。");
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

  updateProgressPreview();
})();
