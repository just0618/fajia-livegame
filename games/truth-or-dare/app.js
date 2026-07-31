(() => {
  "use strict";

  const bank = window.FAJIA_QUESTION_BANK;
  const STORAGE_KEY = "fajia-livegame.truth-or-dare.seen.v1";
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

  const typeLabels = {
    truth: "真心话",
    dare: "大冒险"
  };

  const state = {
    mode: "random",
    rememberProgress: true,
    requestedLimit: "10",
    targetCount: 10,
    activePools: {
      truth: [],
      dare: []
    },
    currentPlayerIndex: 0,
    turn: 1,
    cardCount: 0,
    completedCount: 0,
    skippedCount: 0,
    sessionSeen: new Set(),
    persistedSeen: new Set(),
    currentCard: null,
    currentType: "truth",
    endedBecauseExhausted: false
  };

  const elements = {
    setupScreen: document.getElementById("setupScreen"),
    playScreen: document.getElementById("playScreen"),
    resultScreen: document.getElementById("resultScreen"),
    startButtons: document.querySelectorAll("[data-starter]"),
    restartButton: document.getElementById("restartButton"),
    drawAgainButton: document.getElementById("drawAgainButton"),
    completeTurnButton: document.getElementById("completeTurnButton"),
    currentPlayer: document.getElementById("currentPlayer"),
    currentPlayerImage: document.getElementById("currentPlayerImage"),
    currentPlayerName: document.getElementById("currentPlayerName"),
    turnNumber: document.getElementById("turnNumber"),
    completedCount: document.getElementById("completedCount"),
    targetCount: document.getElementById("targetCount"),
    questionCard: document.getElementById("questionCard"),
    cardType: document.getElementById("cardType"),
    cardLevel: document.getElementById("cardLevel"),
    cardNumber: document.getElementById("cardNumber"),
    cardQuestion: document.getElementById("cardQuestion"),
    cardTip: document.getElementById("cardTip"),
    remainingText: document.getElementById("remainingText"),
    progressBar: document.getElementById("progressBar"),
    rememberProgressCheckbox: document.getElementById("rememberProgressCheckbox"),
    allAvailableLabel: document.getElementById("allAvailableLabel"),
    roundAvailabilityNote: document.getElementById("roundAvailabilityNote"),
    scopeTotalCount: document.getElementById("scopeTotalCount"),
    scopeSeenCount: document.getElementById("scopeSeenCount"),
    scopeRemainingCount: document.getElementById("scopeRemainingCount"),
    storageNote: document.getElementById("storageNote"),
    clearScopeProgressButton: document.getElementById("clearScopeProgressButton"),
    clearAllProgressButton: document.getElementById("clearAllProgressButton"),
    resultSubtitle: document.getElementById("resultSubtitle"),
    resultCompleted: document.getElementById("resultCompleted"),
    resultSkipped: document.getElementById("resultSkipped"),
    resultSeen: document.getElementById("resultSeen"),
    resultRemaining: document.getElementById("resultRemaining"),
    resultMessage: document.getElementById("resultMessage"),
    continueSetupButton: document.getElementById("continueSetupButton"),
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
    }, 2700);
  }

  function cardsForType(type) {
    return Object.entries(bank).flatMap(([level, group]) =>
      group[type].map((card) => ({
        ...card,
        level,
        type
      }))
    );
  }

  function currentSelection() {
    return {
      mode: getSelectedValue("mode") || "random"
    };
  }

  function buildPoolsForSelection(selection) {
    const truth = cardsForType("truth");
    const dare = cardsForType("dare");

    return {
      truth: selection.mode === "dare" ? [] : truth,
      dare: selection.mode === "truth" ? [] : dare
    };
  }

  function flattenPools(pools) {
    return [...pools.truth, ...pools.dare];
  }

  function loadPersistedSeen() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();

      const parsed = JSON.parse(raw);
      if (
        !parsed ||
        parsed.version !== STORAGE_VERSION ||
        !Array.isArray(parsed.seen)
      ) {
        return new Set();
      }

      return new Set(parsed.seen.filter((id) => typeof id === "string"));
    } catch (error) {
      return new Set();
    }
  }

  function savePersistedSeen() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: STORAGE_VERSION,
          seen: [...state.persistedSeen],
          updatedAt: new Date().toISOString()
        })
      );
      return true;
    } catch (error) {
      showToast("浏览器无法保存进度，本场仍可继续游玩。");
      return false;
    }
  }

  function cardIsUnavailable(card) {
    if (state.sessionSeen.has(card.id)) return true;
    return state.rememberProgress && state.persistedSeen.has(card.id);
  }

  function availableCards(type) {
    return state.activePools[type].filter((card) => !cardIsUnavailable(card));
  }

  function allAvailableCards() {
    return [
      ...availableCards("truth"),
      ...availableCards("dare")
    ];
  }

  function shufflePick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function updateProgressPreview() {
    const selection = currentSelection();
    const pools = buildPoolsForSelection(selection);
    const allCards = flattenPools(pools);
    const persisted = loadPersistedSeen();
    const remember = elements.rememberProgressCheckbox.checked;
    const seenInScope = allCards.filter((card) => persisted.has(card.id)).length;
    const remaining = remember ? allCards.length - seenInScope : allCards.length;
    const selectedLimit = getSelectedValue("roundLimit") || "10";
    const requested =
      selectedLimit === "all" ? remaining : Number(selectedLimit);
    const actualTarget = Math.min(requested, remaining);

    elements.scopeTotalCount.textContent = `${allCards.length}张`;
    elements.scopeSeenCount.textContent = remember ? `${seenInScope}张` : "不读取";
    elements.scopeRemainingCount.textContent = `${remaining}张`;
    elements.allAvailableLabel.textContent = `当前剩余 ${remaining} 题`;

    if (!remember) {
      elements.storageNote.textContent =
        "本场不会读取或写入历史进度，但本场内已经展示过的卡片仍不会重复。";
    } else {
      elements.storageNote.textContent =
        "同一设备、同一浏览器会继续进度；无痕模式、清除网站数据或更换设备后无法保留。";
    }

    if (remaining === 0) {
      elements.roundAvailabilityNote.textContent =
        "当前模式题库已经全部完成，请清除进度或切换游玩模式。";
    } else if (selectedLimit === "all") {
      elements.roundAvailabilityNote.textContent =
        `本场将玩完当前剩余的 ${remaining} 题。`;
    } else if (actualTarget < requested) {
      elements.roundAvailabilityNote.textContent =
        `当前只剩 ${remaining} 题，本场将完成全部剩余题目。`;
    } else {
      elements.roundAvailabilityNote.textContent =
        `本场预计完成 ${actualTarget} 题。`;
    }

    elements.clearScopeProgressButton.disabled = seenInScope === 0;
    elements.clearAllProgressButton.disabled = persisted.size === 0;
  }

  function determineType() {
    const truthAvailable = availableCards("truth");
    const dareAvailable = availableCards("dare");

    if (state.mode === "truth") {
      return truthAvailable.length ? "truth" : null;
    }

    if (state.mode === "dare") {
      return dareAvailable.length ? "dare" : null;
    }

    if (!truthAvailable.length && !dareAvailable.length) return null;
    if (!truthAvailable.length) return "dare";
    if (!dareAvailable.length) return "truth";

    return Math.random() < 0.5 ? "truth" : "dare";
  }

  function currentLevelLabel() {
    return "统一题库";
  }

  function markCardSeen(card) {
    state.sessionSeen.add(card.id);

    if (state.rememberProgress) {
      state.persistedSeen.add(card.id);
      savePersistedSeen();
    }
  }

  function drawCard() {
    const type = determineType();

    if (!type) {
      state.endedBecauseExhausted = true;
      finishSession();
      return;
    }

    const card = shufflePick(availableCards(type));
    state.currentCard = card;
    state.currentType = type;
    state.cardCount += 1;
    markCardSeen(card);

    elements.questionCard.classList.toggle("is-dare", type === "dare");
    elements.questionCard.classList.remove("is-intimate");
    elements.cardType.textContent = typeLabels[type];
    elements.cardLevel.textContent = currentLevelLabel();
    elements.cardNumber.textContent =
      `CARD ${String(state.cardCount).padStart(2, "0")}`;
    elements.cardQuestion.textContent = card.text;
    elements.cardTip.textContent =
      "不方便、不愿意或不适合公开时，直接换一张即可；无需解释，也不会有惩罚。";

    updatePlayer();
    updatePlayProgress();

    window.requestAnimationFrame(() => {
      elements.cardQuestion.focus({ preventScroll: true });
    });
  }

  function updatePlayer() {
    const player = players[state.currentPlayerIndex];

    elements.currentPlayerImage.src = player.image;
    elements.currentPlayerImage.alt = player.name;
    elements.currentPlayerName.textContent = player.name;
    elements.currentPlayer.classList.toggle(
      "is-gold",
      player.className === "gold"
    );
    elements.completeTurnButton.classList.toggle(
      "is-gold",
      player.className === "gold"
    );
  }

  function updatePlayProgress() {
    const remaining = allAvailableCards().length;
    const progress =
      state.targetCount === 0
        ? 0
        : (state.completedCount / state.targetCount) * 100;

    elements.completedCount.textContent = String(state.completedCount);
    elements.targetCount.textContent = String(state.targetCount);
    elements.turnNumber.textContent = String(state.turn);
    elements.remainingText.textContent =
      `本场完成 ${state.completedCount}/${state.targetCount} · 当前范围还剩 ${remaining} 张未展示`;
    elements.progressBar.style.width = `${Math.min(100, progress)}%`;
  }

  function beginGame(starter) {
    const selection = currentSelection();

    state.mode = selection.mode;
    state.rememberProgress = elements.rememberProgressCheckbox.checked;
    state.requestedLimit = getSelectedValue("roundLimit") || "10";
    state.persistedSeen = loadPersistedSeen();
    state.activePools = buildPoolsForSelection(selection);
    state.sessionSeen = new Set();
    state.currentPlayerIndex =
      starter === "random"
        ? Math.floor(Math.random() * players.length)
        : Number(starter);
    state.turn = 1;
    state.cardCount = 0;
    state.completedCount = 0;
    state.skippedCount = 0;
    state.currentCard = null;
    state.endedBecauseExhausted = false;

    const remainingAtStart = allAvailableCards().length;

    if (remainingAtStart === 0) {
      showToast("当前选择范围已经全部完成，请先清除进度或更换范围。");
      return;
    }

    const requested =
      state.requestedLimit === "all"
        ? remainingAtStart
        : Number(state.requestedLimit);
    state.targetCount = Math.min(requested, remainingAtStart);

    elements.setupScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.playScreen.hidden = false;

    updatePlayProgress();
    drawCard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function completeTurn() {
    state.completedCount += 1;

    if (state.completedCount >= state.targetCount) {
      finishSession();
      return;
    }

    if (allAvailableCards().length === 0) {
      state.endedBecauseExhausted = true;
      finishSession();
      return;
    }

    state.currentPlayerIndex =
      (state.currentPlayerIndex + 1) % players.length;
    state.turn += 1;
    drawCard();
  }

  function drawAgain() {
    state.skippedCount += 1;

    if (allAvailableCards().length === 0) {
      state.endedBecauseExhausted = true;
      finishSession();
      return;
    }

    drawCard();
  }

  function scopeStats() {
    const allCards = flattenPools(state.activePools);
    const seen = state.rememberProgress
      ? allCards.filter((card) => state.persistedSeen.has(card.id)).length
      : state.sessionSeen.size;
    const remaining = state.rememberProgress
      ? allCards.length - seen
      : allCards.filter((card) => !state.sessionSeen.has(card.id)).length;

    return {
      total: allCards.length,
      seen,
      remaining
    };
  }

  function finishSession() {
    const stats = scopeStats();

    elements.playScreen.hidden = true;
    elements.setupScreen.hidden = true;
    elements.resultScreen.hidden = false;

    elements.resultCompleted.textContent = `${state.completedCount}题`;
    elements.resultSkipped.textContent = `${state.skippedCount}张`;
    elements.resultSeen.textContent = `${stats.seen}张`;
    elements.resultRemaining.textContent = `${stats.remaining}张`;

    if (state.endedBecauseExhausted && state.completedCount < state.targetCount) {
      elements.resultSubtitle.textContent =
        "当前模式题库已经没有未展示卡片，本场提前完成。";
    } else {
      elements.resultSubtitle.textContent =
        `本场计划完成${state.targetCount}题，正式完成${state.completedCount}题。`;
    }

    if (!state.rememberProgress) {
      elements.resultMessage.textContent =
        "本场没有写入历史进度。返回设置后可以重新抽取完整题库。";
    } else if (stats.remaining === 0) {
      elements.resultMessage.textContent =
        "当前模式题库已经全部完成。下次可以切换游玩模式，或清除当前模式进度后重新开始。";
    } else {
      elements.resultMessage.textContent =
        `已保存到当前浏览器，下次将从剩余${stats.remaining}张卡片继续。`;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToSetup() {
    elements.playScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.setupScreen.hidden = false;
    updateProgressPreview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearScopeProgress() {
    const selection = currentSelection();
    const pools = buildPoolsForSelection(selection);
    const ids = new Set(flattenPools(pools).map((card) => card.id));
    const persisted = loadPersistedSeen();
    const removed = [...persisted].filter((id) => ids.has(id)).length;

    if (removed === 0) {
      showToast("当前选择范围没有已保存进度。");
      return;
    }

    const confirmed = window.confirm(
      `确定清除当前模式内的${removed}张已展示记录吗？`
    );
    if (!confirmed) return;

    ids.forEach((id) => persisted.delete(id));
    state.persistedSeen = persisted;
    savePersistedSeen();
    updateProgressPreview();
    showToast("当前选择范围的进度已清除。");
  }

  function clearAllProgress() {
    const persisted = loadPersistedSeen();

    if (persisted.size === 0) {
      showToast("目前没有已保存的题库进度。");
      return;
    }

    const confirmed = window.confirm(
      `确定清除全部${persisted.size}张已展示记录吗？`
    );
    if (!confirmed) return;

    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      showToast("浏览器未能清除进度，请检查网站数据设置。");
      return;
    }

    state.persistedSeen = new Set();
    updateProgressPreview();
    showToast("全部真心话大冒险进度已清除。");
  }

  document.querySelectorAll('input[name="mode"]').forEach((input) => {
    input.addEventListener("change", updateProgressPreview);
  });

  document.querySelectorAll('input[name="roundLimit"]').forEach((input) => {
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

  elements.startButtons.forEach((button) => {
    button.addEventListener("click", () => {
      beginGame(button.dataset.starter);
    });
  });

  elements.drawAgainButton.addEventListener("click", drawAgain);
  elements.completeTurnButton.addEventListener("click", completeTurn);
  elements.restartButton.addEventListener("click", returnToSetup);
  elements.continueSetupButton.addEventListener("click", returnToSetup);

  elements.openHelpButton.addEventListener("click", () => {
    if (typeof elements.helpDialog.showModal === "function") {
      elements.helpDialog.showModal();
    } else {
      showToast(
        "全部119张题已合并；选择游玩模式和本场题数后即可开始，任何题目都可以直接换一张。"
      );
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
