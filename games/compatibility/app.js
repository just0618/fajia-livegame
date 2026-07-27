(() => {
  "use strict";

  const bank = window.FAJIA_COMPATIBILITY_BANK;

  if (!bank) {
    throw new Error("题库未加载，请确认 questions.js 与 app.js 位于同一文件夹。");
  }

  const themeLabels = {
    light: "轻松日常",
    heart: "心动回忆",
    challenge: "默契挑战",
    mixed: "全部混合"
  };

  const state = {
    theme: "mixed",
    totalRounds: 10,
    currentRound: 1,
    score: 0,
    differences: 0,
    skips: 0,
    questions: [],
    countdownRunning: false
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

  function buildQuestionPool(theme) {
    if (theme === "mixed") {
      return [
        ...bank.light.map((question) => ({ ...question, theme: "light" })),
        ...bank.heart.map((question) => ({ ...question, theme: "heart" })),
        ...bank.challenge.map((question) => ({ ...question, theme: "challenge" }))
      ];
    }

    return bank[theme].map((question) => ({ ...question, theme }));
  }

  function prepareQuestions() {
    const pool = shuffle(buildQuestionPool(state.theme));

    if (pool.length < state.totalRounds) {
      throw new Error("题库数量不足以完成所选轮数。");
    }

    state.questions = pool.slice(0, state.totalRounds);
  }

  function updateScore() {
    const judgedRounds = state.score + state.differences;
    elements.scoreText.textContent = `${state.score} / ${judgedRounds}`;
  }

  function updateRoundProgress() {
    const progress = ((state.currentRound - 1) / state.totalRounds) * 100;

    elements.roundText.textContent =
      `第 ${state.currentRound} / ${state.totalRounds} 题`;
    elements.themeText.textContent = themeLabels[state.theme];
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
      elements.countdownValue.textContent = "同时回答！";
      elements.questionInstruction.textContent =
        "根据两个人刚才的回答与表现，记录这一轮是否默契。";
      elements.countdownActions.hidden = true;
      elements.judgeActions.hidden = false;
      state.countdownRunning = false;
    }, 850);
  }

  function advanceRound(result) {
    if (result === "match") {
      state.score += 1;
    } else if (result === "different") {
      state.differences += 1;
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
    state.theme = getSelectedValue("theme") || "mixed";
    state.totalRounds = Number(getSelectedValue("rounds") || 10);
    state.currentRound = 1;
    state.score = 0;
    state.differences = 0;
    state.skips = 0;

    prepareQuestions();

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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    showToast("本题已跳过，不计入默契百分比。");
    advanceRound("skip");
  });

  elements.openHelpButton.addEventListener("click", () => {
    if (typeof elements.helpDialog.showModal === "function") {
      elements.helpDialog.showModal();
    } else {
      showToast("倒计时结束后同时回答，再手动记录答案是否一致。");
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
})();
