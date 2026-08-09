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
    libraryMode: "live",
    mode: "truth",
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
    endedBecauseExhausted: false,
    livePlan: []
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
    cardSource: document.getElementById("cardSource"),
    remainingText: document.getElementById("remainingText"),
    progressBar: document.getElementById("progressBar"),
    rememberProgressCheckbox: document.getElementById("rememberProgressCheckbox"),
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
    skipReadDialog: document.getElementById("skipReadDialog"),
    skipReadDoneButton: document.getElementById("skipReadDoneButton"),
    skipUnreadButton: document.getElementById("skipUnreadButton"),
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
      libraryMode: "live",
      mode: getSelectedValue("mode") || "truth"
    };
  }

  function buildPoolsForSelection(selection) {
    const onlyLive = selection.libraryMode === "live";
    const truth = cardsForType("truth").filter(
      (card) => !onlyLive || card.liveEnabled !== false
    );
    const dare = cardsForType("dare").filter(
      (card) => !onlyLive || card.liveEnabled !== false
    );

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
    if (!items.length) return null;

    const rare = items.filter(
      (card) => card.liveAction === "稀有高光" || card.liveAction === "稀有深度"
    );
    const down = items.filter((card) => card.liveAction === "降频");
    const regular = items.filter(
      (card) =>
        card.liveAction !== "降频" &&
        card.liveAction !== "稀有高光" &&
        card.liveAction !== "稀有深度"
    );

    if (rare.length && Math.random() < 0.18) {
      return rare[Math.floor(Math.random() * rare.length)];
    }

    if (down.length && Math.random() < 0.22) {
      return down[Math.floor(Math.random() * down.length)];
    }

    const source = regular.length
      ? regular
      : (down.length ? down : rare);

    return source[Math.floor(Math.random() * source.length)];
  }

  const tierLabels = {
    warmup: "热场题",
    relation: "关系题",
    shy: "轻微害羞",
    visible: "可见互动",
    highlight: "高光题"
  };

  function buildLivePlan(total, mode) {
    const plans = {
      random: [
        "warmup", "warmup", "relation", "relation", "shy",
        "relation", "visible", "relation", "shy", "highlight"
      ],
      truth: [
        "warmup", "relation", "relation", "shy", "highlight",
        "warmup", "relation", "shy", "relation", "highlight"
      ],
      dare: [
        "warmup", "visible", "visible", "visible", "warmup",
        "visible", "visible", "visible", "warmup", "visible"
      ]
    };
    const base = plans[mode] || plans.random;
    return Array.from({ length: total }, (_, index) => base[index % base.length]);
  }

  function availableCardsForTier(tier) {
    return allAvailableCards().filter((card) => card.liveTier === tier);
  }

  function pickRecommendedCard() {
    const tier = state.livePlan[state.completedCount] || "relation";
    const exact = availableCardsForTier(tier);
    if (exact.length) return shufflePick(exact);

    const fallbackOrder = ["relation", "shy", "visible", "highlight", "warmup"];
    for (const fallbackTier of fallbackOrder) {
      const cards = availableCardsForTier(fallbackTier);
      if (cards.length) return shufflePick(cards);
    }
    return shufflePick(allAvailableCards());
  }

  function updateProgressPreview() {
    const selection = currentSelection();
    const pools = buildPoolsForSelection(selection);
    const allCards = flattenPools(pools);
    const persisted = loadPersistedSeen();
    const remember = elements.rememberProgressCheckbox.checked;
    const seenInScope = allCards.filter((card) => persisted.has(card.id)).length;
    const remaining = remember ? allCards.length - seenInScope : allCards.length;
    const selectedLimit = Number(getSelectedValue("roundLimit") || 10);
    const actualTarget = Math.min(selectedLimit, remaining);

    elements.scopeTotalCount.textContent = `${allCards.length}张`;
    elements.scopeSeenCount.textContent = remember ? `${seenInScope}张` : "不读取";
    elements.scopeRemainingCount.textContent = `${remaining}张`;
    elements.roundAvailabilityNote.textContent = remaining === 0
      ? "题库已经全部展示，请清除进度后再开始。"
      : `本场可以完成${actualTarget}题。`;
    elements.storageNote.textContent = remember
      ? "同一设备、同一浏览器会继续进度；无痕模式、清除网站数据或更换设备后无法保留。"
      : "本场不会读取或写入历史进度，但同一局内不会重复展示卡片。";
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
    let card;
    let type;

    if (state.libraryMode === "live") {
      card = pickRecommendedCard();
      type = card ? card.type : null;
    } else {
      type = determineType();
      card = type ? shufflePick(availableCards(type)) : null;
    }

    if (!type || !card) {
      state.endedBecauseExhausted = true;
      finishSession();
      return;
    }

    state.currentCard = card;
    state.currentType = type;
    state.cardCount += 1;
    markCardSeen(card);

    elements.questionCard.classList.toggle("is-dare", type === "dare");
    elements.questionCard.classList.remove("is-intimate");
    elements.cardType.textContent = typeLabels[type];
    elements.cardLevel.textContent = "本轮题目";
    elements.cardNumber.textContent =
      `CARD ${String(state.cardCount).padStart(2, "0")}`;
    elements.cardQuestion.textContent = card.text;
    elements.cardTip.textContent =
      "任意题目都可以直接换一张。";
    elements.cardSource.hidden = !card.source;
    elements.cardSource.textContent = card.source
      ? `题目灵感：${card.source}`
      : "";

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

    state.libraryMode = "live";
    state.mode = selection.mode;
    state.rememberProgress = elements.rememberProgressCheckbox.checked;
    state.requestedLimit = getSelectedValue("roundLimit") || "10";
    state.persistedSeen = loadPersistedSeen();
    state.activePools = buildPoolsForSelection(selection);
    state.sessionSeen = new Set();
    state.currentPlayerIndex = starter === "random"
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
      showToast("题库已经全部展示，请先清除进度。");
      return;
    }

    state.targetCount = Math.min(Number(state.requestedLimit), remainingAtStart);
    state.livePlan = buildLivePlan(state.targetCount, state.mode);

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

  function speakSkippedCardCode(card) {
    if (!card) return;
    if (
      !("speechSynthesis" in window) ||
      typeof window.SpeechSynthesisUtterance !== "function"
    ) {
      return;
    }

    try {
      const code = window.FAJIA_CONTENT_CODE ? window.FAJIA_CONTENT_CODE(card.id) : "";
      if (!code) return;
      const spokenNumber = Number(code.slice(1));
      const utterance = new window.SpeechSynthesisUtterance(
        `K${spokenNumber}`
      );
      utterance.lang = "zh-CN";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      // 语音不可用时不影响正常换题。
    }
  }

  function reportSkippedCard(card, readStatus) {
    if (!card) return;
    if (!window.FAJIA_RUM || typeof window.FAJIA_RUM.reportEvent !== "function") {
      return;
    }

    window.FAJIA_RUM.reportEvent(
      "skip_question",
      (window.FAJIA_CONTENT_CODE ? window.FAJIA_CONTENT_CODE(card.id) : ""),
      "truth_or_dare",
      `${card.type || "unknown"}_${readStatus}`
    );
  }

  function finishSkip(readStatus) {
    const card = state.currentCard;
    if (!card) return;

    if (readStatus === "unread") {
      speakSkippedCardCode(card);
    }
    reportSkippedCard(card, readStatus);
    state.skippedCount += 1;

    if (allAvailableCards().length === 0) {
      state.endedBecauseExhausted = true;
      finishSession();
      return;
    }

    drawCard();
  }

  function requestSkip() {
    if (!state.currentCard) return;

    if (
      elements.skipReadDialog &&
      typeof elements.skipReadDialog.showModal === "function"
    ) {
      elements.skipReadDialog.showModal();
      return;
    }

    const hasRead = window.confirm(
      "别忘了给直播间的观众读这道题。\n\n已经读过了吗？\n确定 = 读了；取消 = 没读"
    );
    finishSkip(hasRead ? "read" : "unread");
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
        "题库已经没有未展示卡片，本场提前完成。";
    } else {
      elements.resultSubtitle.textContent =
        `本场计划完成${state.targetCount}题，正式完成${state.completedCount}题。`;
    }

    if (!state.rememberProgress) {
      elements.resultMessage.textContent =
        "本场没有写入历史进度，返回设置后可以重新开始。";
    } else if (stats.remaining === 0) {
      elements.resultMessage.textContent =
        "题库已经全部完成。清除进度后可以重新开始。";
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

  document.querySelectorAll('input[name="libraryMode"]').forEach((input) => {
    input.addEventListener("change", updateProgressPreview);
  });

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

  elements.drawAgainButton.addEventListener("click", requestSkip);
  elements.completeTurnButton.addEventListener("click", completeTurn);

  elements.skipReadDoneButton.addEventListener("click", () => {
    elements.skipReadDialog.close();
    finishSkip("read");
  });

  elements.skipUnreadButton.addEventListener("click", () => {
    elements.skipReadDialog.close();
    finishSkip("unread");
  });

  elements.skipReadDialog.addEventListener("click", (event) => {
    if (event.target === elements.skipReadDialog) {
      elements.skipReadDialog.close();
    }
  });

  elements.restartButton.addEventListener("click", returnToSetup);
  elements.continueSetupButton.addEventListener("click", returnToSetup);

  elements.openHelpButton.addEventListener("click", () => {
    if (typeof elements.helpDialog.showModal === "function") {
      elements.helpDialog.showModal();
    } else {
      showToast(
        "先选择真心话、大冒险或混合（默认真心话），再选择题数和第一位玩家；任意题目都可以直接换一张。"
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
