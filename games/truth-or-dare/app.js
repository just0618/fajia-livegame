(() => {
  "use strict";

  const bank = window.FAJIA_QUESTION_BANK;

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

  const levelLabels = {
    light: "轻松模式",
    heart: "心动模式",
    challenge: "挑战模式"
  };

  const typeLabels = {
    truth: "真心话",
    dare: "大冒险"
  };

  const state = {
    level: "light",
    mode: "random",
    currentPlayerIndex: 0,
    turn: 1,
    cardCount: 0,
    used: {
      truth: new Set(),
      dare: new Set()
    },
    currentType: "truth"
  };

  const elements = {
    setupScreen: document.getElementById("setupScreen"),
    playScreen: document.getElementById("playScreen"),
    startButtons: document.querySelectorAll("[data-starter]"),
    restartButton: document.getElementById("restartButton"),
    drawAgainButton: document.getElementById("drawAgainButton"),
    completeTurnButton: document.getElementById("completeTurnButton"),
    currentPlayer: document.getElementById("currentPlayer"),
    currentPlayerImage: document.getElementById("currentPlayerImage"),
    currentPlayerName: document.getElementById("currentPlayerName"),
    turnNumber: document.getElementById("turnNumber"),
    questionCard: document.getElementById("questionCard"),
    cardType: document.getElementById("cardType"),
    cardLevel: document.getElementById("cardLevel"),
    cardNumber: document.getElementById("cardNumber"),
    cardQuestion: document.getElementById("cardQuestion"),
    remainingText: document.getElementById("remainingText"),
    progressBar: document.getElementById("progressBar"),
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

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");

    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2500);
  }

  function resetUsedCards() {
    state.used.truth.clear();
    state.used.dare.clear();
  }

  function determineType() {
    if (state.mode === "truth" || state.mode === "dare") {
      return state.mode;
    }

    return Math.random() < 0.5 ? "truth" : "dare";
  }

  function getPool(type) {
    return bank[state.level][type];
  }

  function drawIndex(type) {
    const pool = getPool(type);
    const usedSet = state.used[type];

    if (usedSet.size >= pool.length) {
      usedSet.clear();
      showToast(`${typeLabels[type]}题库已经抽完，现已重新洗牌。`);
    }

    const available = pool
      .map((_, index) => index)
      .filter((index) => !usedSet.has(index));

    const selectedIndex = available[Math.floor(Math.random() * available.length)];
    usedSet.add(selectedIndex);
    return selectedIndex;
  }

  function updatePlayer() {
    const player = players[state.currentPlayerIndex];

    elements.currentPlayerImage.src = player.image;
    elements.currentPlayerImage.alt = player.name;
    elements.currentPlayerName.textContent = player.name;
    elements.currentPlayer.classList.toggle("is-gold", player.className === "gold");
    elements.completeTurnButton.classList.toggle(
      "is-gold",
      player.className === "gold"
    );
  }

  function updateProgress(type) {
    const total = getPool(type).length;
    const used = state.used[type].size;
    const remaining = total - used;
    const progress = total === 0 ? 0 : (used / total) * 100;

    elements.remainingText.textContent = `本组还有 ${remaining} 张未出现`;
    elements.progressBar.style.width = `${progress}%`;
  }

  function drawCard() {
    const type = determineType();
    const index = drawIndex(type);
    const question = getPool(type)[index];

    state.currentType = type;
    state.cardCount += 1;

    elements.questionCard.classList.toggle("is-dare", type === "dare");
    elements.cardType.textContent = typeLabels[type];
    elements.cardLevel.textContent = levelLabels[state.level];
    elements.cardNumber.textContent = `CARD ${String(state.cardCount).padStart(2, "0")}`;
    elements.cardQuestion.textContent = question;

    updateProgress(type);

    window.requestAnimationFrame(() => {
      elements.cardQuestion.focus({ preventScroll: true });
    });
  }

  function beginGame(starter) {
    state.level = getSelectedValue("level") || "light";
    state.mode = getSelectedValue("mode") || "random";
    state.currentPlayerIndex =
      starter === "random" ? Math.floor(Math.random() * players.length) : Number(starter);
    state.turn = 1;
    state.cardCount = 0;

    resetUsedCards();
    updatePlayer();
    elements.turnNumber.textContent = String(state.turn);
    elements.setupScreen.hidden = true;
    elements.playScreen.hidden = false;
    drawCard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function completeTurn() {
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % players.length;
    state.turn += 1;

    updatePlayer();
    elements.turnNumber.textContent = String(state.turn);
    drawCard();
  }

  function restartGame() {
    elements.playScreen.hidden = true;
    elements.setupScreen.hidden = false;
    resetUsedCards();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  elements.startButtons.forEach((button) => {
    button.addEventListener("click", () => {
      beginGame(button.dataset.starter);
    });
  });

  elements.drawAgainButton.addEventListener("click", () => {
    drawCard();
  });

  elements.completeTurnButton.addEventListener("click", completeTurn);
  elements.restartButton.addEventListener("click", restartGame);

  elements.openHelpButton.addEventListener("click", () => {
    if (typeof elements.helpDialog.showModal === "function") {
      elements.helpDialog.showModal();
    } else {
      showToast("选择模式后开始游戏；换一张不会切换玩家，完成后自动轮流。");
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
