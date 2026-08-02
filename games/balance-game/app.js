(() => {
  "use strict";

  const bank = window.FAJIA_BALANCE_QUESTIONS;
  const players = ["法宣阁", "贺嘉述"];

  if (!Array.isArray(bank)) {
    throw new Error("平衡游戏题库未加载。");
  }

  const state = {
    totalRounds: 10,
    completed: 0,
    skipped: 0,
    answerer: 0,
    queue: [],
    current: null
  };

  const elements = {
    setupScreen: document.getElementById("setupScreen"),
    playScreen: document.getElementById("playScreen"),
    resultScreen: document.getElementById("resultScreen"),
    roundText: document.getElementById("roundText"),
    answererText: document.getElementById("answererText"),
    progressBar: document.getElementById("progressBar"),
    cardNumber: document.getElementById("cardNumber"),
    leftOption: document.getElementById("leftOption"),
    rightOption: document.getElementById("rightOption"),
    completeButton: document.getElementById("completeButton"),
    skipButton: document.getElementById("skipButton"),
    restartButton: document.getElementById("restartButton"),
    resultCompleted: document.getElementById("resultCompleted"),
    resultSkipped: document.getElementById("resultSkipped"),
    playAgainButton: document.getElementById("playAgainButton"),
    helpDialog: document.getElementById("helpDialog"),
    openHelpButton: document.getElementById("openHelpButton"),
    closeHelpButton: document.getElementById("closeHelpButton"),
    toast: document.getElementById("toast")
  };

  let toastTimer;

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function selectedRounds() {
    const input = document.querySelector('input[name="rounds"]:checked');
    return Number(input?.value || 10);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2400);
  }

  function updateProgress() {
    elements.roundText.textContent =
      `第 ${state.completed + 1} / ${state.totalRounds} 题`;
    elements.answererText.textContent = `${players[state.answerer]}先回答`;
    elements.progressBar.style.width =
      `${(state.completed / state.totalRounds) * 100}%`;
    elements.cardNumber.textContent =
      `CARD ${String(state.completed + 1).padStart(2, "0")}`;
  }

  function drawQuestion() {
    if (state.queue.length === 0) {
      state.queue = shuffle(bank);
    }
    state.current = state.queue.shift();
    elements.leftOption.textContent = state.current.left;
    elements.rightOption.textContent = state.current.right;
    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showResults() {
    elements.playScreen.hidden = true;
    elements.resultScreen.hidden = false;
    elements.resultCompleted.textContent = String(state.completed);
    elements.resultSkipped.textContent = String(state.skipped);
    elements.progressBar.style.width = "100%";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startGame(starter) {
    state.totalRounds = selectedRounds();
    state.completed = 0;
    state.skipped = 0;
    state.answerer =
      starter === "random" ? Math.floor(Math.random() * 2) : Number(starter);
    state.queue = shuffle(bank);
    state.current = null;

    elements.setupScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.playScreen.hidden = false;
    drawQuestion();
  }

  function completeQuestion() {
    state.completed += 1;
    state.answerer = (state.answerer + 1) % 2;

    if (state.completed >= state.totalRounds) {
      showResults();
      return;
    }

    drawQuestion();
  }

  function skipQuestion() {
    state.skipped += 1;
    if (state.current) {
      state.queue.push(state.current);
    }
    showToast("本题已跳过，不占用本场题数。");
    drawQuestion();
  }

  function returnToSetup() {
    elements.playScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.setupScreen.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll("[data-starter]").forEach((button) => {
    button.addEventListener("click", () => startGame(button.dataset.starter));
  });

  elements.completeButton.addEventListener("click", completeQuestion);
  elements.skipButton.addEventListener("click", skipQuestion);
  elements.restartButton.addEventListener("click", returnToSetup);
  elements.playAgainButton.addEventListener("click", returnToSetup);

  elements.openHelpButton.addEventListener("click", () => {
    if (typeof elements.helpDialog.showModal === "function") {
      elements.helpDialog.showModal();
    } else {
      showToast("每题分别选择一个选项并说出理由，不方便可以直接跳过。");
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
