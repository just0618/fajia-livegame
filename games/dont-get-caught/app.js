(() => {
  "use strict";

  const punishmentBank = window.FAJIA_PUNISHMENT_BANK;
  const targetBank = window.FAJIA_TRAP_TARGETS;

  if (!punishmentBank || !targetBank) {
    throw new Error("游戏数据未加载。");
  }

  const players = {
    fa: { name: "法宣阁", short: "小法", other: "he" },
    he: { name: "贺嘉述", short: "小贺", other: "fa" }
  };

  const categoryLabels = {
    light: "轻松即时",
    heart: "心动互动",
    deep: "深度关系",
    after: "直播后履约",
    ultimate: "终极惩罚"
  };

  const LOW_FREQUENCY_TARGET_IDS = new Set([
    "word-01",
    "word-02",
    "word-03",
    "word-08",
    "word-13"
  ]);

  const LOW_FREQUENCY_PUNISHMENT_IDS = new Set([
    "he-specific-13",
    "fa-specific-06",
    "common-after-02",
    "common-deep-01"
  ]);

  const state = {
    duration: 300,
    settings: {
      specific: true,
      other: true
    },
    audienceMode: "ask",
    pendingAudience: null,
    setter: "fa",
    targets: {
      fa: null,
      he: null
    },
    timerRemaining: 300,
    timerId: null,
    timerPaused: false,
    claimedPlayer: null,
    loser: null,
    punishmentRoute: null,
    eventOutcome: null,
    punishments: [],
    usedPunishmentIds: new Set()
  };

  const $ = (id) => document.getElementById(id);

  const elements = {
    setupScreen: $("setupScreen"),
    secretScreen: $("secretScreen"),
    audienceScreen: $("audienceScreen"),
    passScreen: $("passScreen"),
    challengeScreen: $("challengeScreen"),
    claimScreen: $("claimScreen"),
    punishmentChoiceScreen: $("punishmentChoiceScreen"),
    eventScreen: $("eventScreen"),
    punishmentScreen: $("punishmentScreen"),
    finalScreen: $("finalScreen"),

    startSetupButton: $("startSetupButton"),
    secretTitle: $("secretTitle"),
    secretDescription: $("secretDescription"),
    targetInputLabel: $("targetInputLabel"),
    targetInput: $("targetInput"),
    randomTargetButton: $("randomTargetButton"),
    saveTargetButton: $("saveTargetButton"),

    audienceChoicePanel: $("audienceChoicePanel"),
    audienceDisplayPanel: $("audienceDisplayPanel"),
    audienceScreenTitle: $("audienceScreenTitle"),
    audienceScreenDescription: $("audienceScreenDescription"),
    skipAudienceButton: $("skipAudienceButton"),
    normalAudienceButton: $("normalAudienceButton"),
    mirrorAudienceButton: $("mirrorAudienceButton"),
    audienceDisplayOwner: $("audienceDisplayOwner"),
    audienceTargetText: $("audienceTargetText"),
    audienceDisplayModeLabel: $("audienceDisplayModeLabel"),
    finishAudienceButton: $("finishAudienceButton"),

    passTitle: $("passTitle"),
    passDescription: $("passDescription"),
    continuePassButton: $("continuePassButton"),

    restartButton: $("restartButton"),
    challengeTimer: $("challengeTimer"),
    caughtButtons: document.querySelectorAll("[data-caught]"),
    endAsDrawButton: $("endAsDrawButton"),

    claimTitle: $("claimTitle"),
    claimTargetType: $("claimTargetType"),
    claimTargetText: $("claimTargetText"),
    rejectClaimButton: $("rejectClaimButton"),
    confirmClaimButton: $("confirmClaimButton"),

    loserSummary: $("loserSummary"),
    stableRouteButton: $("stableRouteButton"),
    riskRouteButton: $("riskRouteButton"),

    eventCardGrid: $("eventCardGrid"),
    eventResult: $("eventResult"),
    eventResultLabel: $("eventResultLabel"),
    eventResultTitle: $("eventResultTitle"),
    eventResultDescription: $("eventResultDescription"),
    eventContinueButton: $("eventContinueButton"),

    punishmentResultSubtitle: $("punishmentResultSubtitle"),
    punishmentCardList: $("punishmentCardList"),
    finishPunishmentButton: $("finishPunishmentButton"),

    finalTitle: $("finalTitle"),
    finalSummary: $("finalSummary"),
    finalTargetHe: $("finalTargetHe"),
    finalTargetFa: $("finalTargetFa"),
    finalPunishments: $("finalPunishments"),
    playAgainButton: $("playAgainButton"),

    includeSpecificCheckbox: $("includeSpecificCheckbox"),
    includeOtherCheckbox: $("includeOtherCheckbox"),

    mirrorTestButton: $("mirrorTestButton"),
    mirrorTestDialog: $("mirrorTestDialog"),
    closeMirrorTestButton: $("closeMirrorTestButton"),
    mirrorTestSample: $("mirrorTestSample"),
    mirrorNormalButton: $("mirrorNormalButton"),
    mirrorFlipButton: $("mirrorFlipButton"),

    helpDialog: $("helpDialog"),
    openHelpButton: $("openHelpButton"),
    closeHelpButton: $("closeHelpButton"),
    toast: $("toast")
  };

  let toastTimer;

  function allScreens() {
    return [
      elements.setupScreen,
      elements.secretScreen,
      elements.audienceScreen,
      elements.passScreen,
      elements.challengeScreen,
      elements.claimScreen,
      elements.punishmentChoiceScreen,
      elements.eventScreen,
      elements.punishmentScreen,
      elements.finalScreen
    ];
  }

  function showScreen(screen) {
    allScreens().forEach((item) => {
      item.hidden = item !== screen;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2600);
  }

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

  function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function pickTarget(items) {
    const regular = items.filter((item) => !LOW_FREQUENCY_TARGET_IDS.has(item.id));
    const lowFrequency = items.filter((item) => LOW_FREQUENCY_TARGET_IDS.has(item.id));

    if (lowFrequency.length && Math.random() < 0.15) {
      return pick(lowFrequency);
    }
    return pick(regular.length ? regular : lowFrequency);
  }

  function pickPunishment(items) {
    const regular = items.filter(
      (item) => !LOW_FREQUENCY_PUNISHMENT_IDS.has(item.id)
    );
    const lowFrequency = items.filter(
      (item) => LOW_FREQUENCY_PUNISHMENT_IDS.has(item.id)
    );

    if (lowFrequency.length && Math.random() < 0.15) {
      return pick(lowFrequency);
    }
    return pick(regular.length ? regular : lowFrequency);
  }

  function readSettings() {
    return {
      specific: elements.includeSpecificCheckbox.checked,
      other: elements.includeOtherCheckbox.checked
    };
  }

  function hasEnabledCategory(settings) {
    return settings.specific || settings.other;
  }

  function resetRound() {
    clearTimer();
    state.duration = Number(getSelectedValue("duration") || 300);
    state.audienceMode = getSelectedValue("audienceMode") || "ask";
    state.settings = readSettings();
    state.pendingAudience = null;
    state.setter = "fa";
    state.targets = { fa: null, he: null };
    state.timerRemaining = state.duration;
    state.timerPaused = false;
    state.claimedPlayer = null;
    state.loser = null;
    state.punishmentRoute = null;
    state.eventOutcome = null;
    state.punishments = [];
    state.usedPunishmentIds = new Set();
    elements.targetInput.value = "";
    elements.eventResult.hidden = true;
  }

  function beginSecretSetup() {
    resetRound();

    if (!hasEnabledCategory(state.settings)) {
      showToast("请至少开启一种惩罚类型。");
      return;
    }

    renderSecretSetup();
  }

  function targetPersonForSetter(setter) {
    return players[setter].other;
  }

  function renderSecretSetup() {
    const setter = state.setter;
    const targetPerson = targetPersonForSetter(setter);

    elements.secretTitle.textContent =
      `${players[setter].short}设置${players[targetPerson].short}的隐藏目标`;
    elements.secretDescription.textContent =
      `请暂时让${players[targetPerson].short}移开视线。输入完成后，页面会自动遮住目标。`;
    elements.targetInput.value = "";
    updateTargetInputCopy();
    showScreen(elements.secretScreen);
  }

  function updateTargetInputCopy() {
    const type = getSelectedValue("targetType") || "word";
    if (type === "word") {
      elements.targetInputLabel.textContent = "让对方说出：";
      elements.targetInput.placeholder = "例如：让对方说出“真的假的”";
    } else {
      elements.targetInputLabel.textContent = "让对方完成：";
      elements.targetInput.placeholder = "例如：让对方摸一下头发";
    }
  }

  function randomTarget() {
    const type = getSelectedValue("targetType") || "word";
    const pool = type === "word" ? targetBank.words : targetBank.actions;
    elements.targetInput.value = pickTarget(pool).text;
  }

  function preparePassAfterTarget(setter) {
    if (setter === "fa") {
      state.setter = "he";
      elements.passTitle.textContent = "小法的目标已经藏好";
      elements.passDescription.textContent =
        "请把设备交给小贺，确认小法已经移开视线后继续。";
      elements.continuePassButton.textContent = "小贺准备设置目标";
      elements.continuePassButton.dataset.next = "secret";
    } else {
      elements.passTitle.textContent = "两个人的隐藏目标都已锁定";
      elements.passDescription.textContent =
        "请确认两个人都不再查看设置页面，然后一起开始挑战。";
      elements.continuePassButton.textContent = "开始别中招挑战";
      elements.continuePassButton.dataset.next = "challenge";
    }
  }

  function saveTarget() {
    const text = elements.targetInput.value.trim();
    if (!text) {
      showToast("请先输入一个隐藏目标，或使用随机灵感。");
      elements.targetInput.focus();
      return;
    }

    const setter = state.setter;
    const type = getSelectedValue("targetType") || "word";
    const targetPerson = targetPersonForSetter(setter);
    const target = { type, text };

    state.targets[targetPerson] = target;
    state.pendingAudience = {
      setter,
      targetPerson,
      target
    };

    preparePassAfterTarget(setter);
    elements.targetInput.value = "";

    if (state.audienceMode === "ask") {
      renderAudienceChoice();
    } else {
      state.pendingAudience = null;
      showScreen(elements.passScreen);
    }
  }

  function renderAudienceChoice() {
    const pending = state.pendingAudience;
    if (!pending) {
      showScreen(elements.passScreen);
      return;
    }

    elements.audienceChoicePanel.hidden = false;
    elements.audienceDisplayPanel.hidden = true;
    elements.audienceTargetText.classList.remove("is-mirrored");
    elements.audienceScreenTitle.textContent =
      `${players[pending.setter].short}设置完成，是否向观众展示？`;
    elements.audienceScreenDescription.textContent =
      `请确认${players[pending.targetPerson].short}已经闭眼、转身或离开屏幕范围。`;

    showScreen(elements.audienceScreen);
  }

  function showAudienceTarget(mode) {
    const pending = state.pendingAudience;
    if (!pending) {
      showScreen(elements.passScreen);
      return;
    }

    elements.audienceChoicePanel.hidden = true;
    elements.audienceDisplayPanel.hidden = false;
    elements.audienceDisplayOwner.textContent =
      `${players[pending.setter].short}为${players[pending.targetPerson].short}设置的隐藏目标`;
    elements.audienceTargetText.textContent = pending.target.text;
    elements.audienceTargetText.classList.toggle(
      "is-mirrored",
      mode === "mirror"
    );
    elements.audienceDisplayModeLabel.textContent =
      mode === "mirror" ? "镜像文字" : "正常文字";
  }

  function skipAudienceDisplay() {
    state.pendingAudience = null;
    elements.audienceTargetText.textContent = "";
    elements.audienceTargetText.classList.remove("is-mirrored");
    showScreen(elements.passScreen);
  }

  function finishAudienceDisplay() {
    skipAudienceDisplay();
  }

  function continueAfterPass() {
    if (elements.continuePassButton.dataset.next === "secret") {
      renderSecretSetup();
    } else {
      beginChallenge();
    }
  }

  function formatTime(seconds) {
    if (state.duration === 0) return "不限时";
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function renderTimer() {
    elements.challengeTimer.textContent = formatTime(state.timerRemaining);
  }

  function beginChallenge() {
    state.timerRemaining = state.duration;
    renderTimer();
    showScreen(elements.challengeScreen);

    if (state.duration > 0) {
      state.timerId = setInterval(() => {
        if (state.timerPaused) return;

        state.timerRemaining -= 1;
        renderTimer();

        if (state.timerRemaining <= 0) {
          clearTimer();
          finishAsDraw("时间结束，两个人都没有触发隐藏目标，本轮平局。");
        }
      }, 1000);
    }
  }

  function clearTimer() {
    if (state.timerId !== null) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function restartGame() {
    const confirmed = window.confirm("确定重新开始本轮挑战吗？当前隐藏目标将被清除。");
    if (!confirmed) return;
    clearTimer();
    showScreen(elements.setupScreen);
  }

  function openClaim(playerKey) {
    state.claimedPlayer = playerKey;
    state.timerPaused = true;

    const target = state.targets[playerKey];
    elements.claimTitle.textContent =
      `确认${players[playerKey].name}是否真的中招`;
    elements.claimTargetType.textContent =
      target.type === "word" ? "隐藏词语" : "隐藏动作";
    elements.claimTargetText.textContent = target.text;
    showScreen(elements.claimScreen);
  }

  function rejectClaim() {
    state.claimedPlayer = null;
    state.timerPaused = false;
    showScreen(elements.challengeScreen);
  }

  function confirmClaim() {
    clearTimer();
    state.timerPaused = false;
    state.loser = state.claimedPlayer;
    state.claimedPlayer = null;

    elements.loserSummary.textContent =
      `${players[state.loser].name}先触发了隐藏目标，由中招者决定是稳定接受1项惩罚，还是搏一把抽事件卡。`;

    showScreen(elements.punishmentChoiceScreen);
  }

  function finishAsDraw(message) {
    clearTimer();
    state.loser = null;
    state.punishmentRoute = "draw";
    state.punishments = [];
    renderFinal(message);
  }

  function specificPool() {
    if (!state.settings.specific || !state.loser) return [];
    const key = state.loser === "fa" ? "faLoses" : "heLoses";
    return punishmentBank.specific[key];
  }

  function commonPool() {
    if (!state.settings.other) return [];
    return Object.values(punishmentBank.common).flat();
  }

  function combinedPool() {
    return [...specificPool(), ...commonPool()];
  }

  function isHeavy(item) {
    return item.category === "ultimate" || item.requiresAfter;
  }

  function unused(items) {
    return items.filter((item) => !state.usedPunishmentIds.has(item.id));
  }

  function choosePunishment(items, options = {}) {
    const { disallowHeavy = false, excludeIds = [] } = options;
    const excluded = new Set(excludeIds);
    const candidates = unused(items).filter((entry) => {
      if (excluded.has(entry.id)) return false;
      if (disallowHeavy && isHeavy(entry)) return false;
      return true;
    });

    return candidates.length ? pickPunishment(candidates) : null;
  }

  function punishmentSourceLabel(source) {
    if (source === "specific") {
      return state.loser === "fa"
        ? "小贺→小法专属惩罚"
        : "小法→小贺专属惩罚";
    }
    if (source === "common") return "双向通用惩罚";
    return "当前已开启惩罚库";
  }

  function stablePunishment() {
    state.punishmentRoute = "stable";
    const selected = choosePunishment(combinedPool());

    if (!selected) {
      showToast("当前设置下没有可用惩罚，请返回并调整惩罚范围。");
      return;
    }

    state.usedPunishmentIds.add(selected.id);
    state.punishments = [{
      item: selected,
      source: "combined"
    }];
    renderPunishments();
  }

  function startRiskRoute() {
    state.punishmentRoute = "risk";
    state.eventOutcome = null;
    elements.eventResult.hidden = true;
    renderEventCards();
    showScreen(elements.eventScreen);
  }

  function renderEventCards() {
    const deck = shuffle([
      "escape",
      "escape",
      "double",
      "double",
      "double",
      "double"
    ]);

    elements.eventCardGrid.innerHTML = "";
    deck.forEach((outcome, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "event-card";
      button.textContent = "?";
      button.setAttribute("aria-label", `事件卡${index + 1}`);
      button.dataset.outcome = outcome;
      button.addEventListener("click", () => revealEventCard(button));
      elements.eventCardGrid.appendChild(button);
    });
  }

  function revealEventCard(selectedButton) {
    if (state.eventOutcome) return;

    state.eventOutcome = selectedButton.dataset.outcome;
    const cards = [...elements.eventCardGrid.querySelectorAll(".event-card")];
    cards.forEach((card) => {
      card.disabled = true;
      if (card === selectedButton) {
        card.classList.add("is-selected");
        card.textContent = state.eventOutcome === "escape" ? "✓" : "×2";
        card.classList.add(
          state.eventOutcome === "escape" ? "is-escape" : "is-double"
        );
      }
    });

    elements.eventResult.hidden = false;

    if (state.eventOutcome === "escape") {
      elements.eventResultLabel.textContent = "幸运事件";
      elements.eventResultTitle.textContent = "幸运逃脱！";
      elements.eventResultDescription.textContent =
        "这一次真的让你跑掉了，本轮无需接受惩罚。";
      elements.eventContinueButton.textContent = "结束本轮";
    } else {
      elements.eventResultLabel.textContent = "冒险失败";
      elements.eventResultTitle.textContent = "本轮接受双重惩罚";
      elements.eventResultDescription.textContent =
        "将优先抽取1项专属方向惩罚和1项其他惩罚；任何一项觉得不合适都可以继续更换。";
      elements.eventContinueButton.textContent = "抽取两项惩罚";
    }
  }

  function continueAfterEvent() {
    if (state.eventOutcome === "escape") {
      state.punishments = [];
      renderFinal(
        `${players[state.loser].name}选择搏一把并抽中幸运逃脱，本轮0项惩罚。`
      );
    } else {
      drawDoublePunishments();
    }
  }

  function drawDoublePunishments() {
    const specific = specificPool();
    const common = commonPool();

    let first = choosePunishment(specific);
    let firstSource = "specific";

    if (!first) {
      first = choosePunishment(combinedPool());
      firstSource = "combined";
    }

    if (!first) {
      showToast("当前设置下没有足够的可用惩罚。");
      return;
    }

    state.usedPunishmentIds.add(first.id);

    const secondDisallowHeavy = isHeavy(first);
    let second = choosePunishment(common, {
      disallowHeavy: secondDisallowHeavy,
      excludeIds: [first.id]
    });
    let secondSource = "common";

    if (!second) {
      second = choosePunishment(combinedPool(), {
        disallowHeavy: secondDisallowHeavy,
        excludeIds: [first.id]
      });
      secondSource = "combined";
    }

    if (!second) {
      state.usedPunishmentIds.delete(first.id);
      showToast("当前惩罚范围不足以抽出两项不同惩罚，请返回调整设置。");
      return;
    }

    state.usedPunishmentIds.add(second.id);
    state.punishments = [
      { item: first, source: firstSource },
      { item: second, source: secondSource }
    ];

    renderPunishments();
  }

  function poolForSource(source) {
    if (source === "specific") return specificPool();
    if (source === "common") return commonPool();
    return combinedPool();
  }

  function rerollPunishment(index) {
    const record = state.punishments[index];
    const otherRecords = state.punishments.filter(
      (_, itemIndex) => itemIndex !== index
    );
    const otherHasHeavy = otherRecords.some(({ item }) => isHeavy(item));
    const excludedIds = new Set([
      record.item.id,
      ...otherRecords.map(({ item }) => item.id)
    ]);

    const pickReplacement = (items) => {
      const candidates = items.filter((item) => {
        if (excludedIds.has(item.id)) return false;
        if (otherHasHeavy && isHeavy(item)) return false;
        return true;
      });
      return candidates.length ? pickPunishment(candidates) : null;
    };

    let replacement = pickReplacement(poolForSource(record.source));
    if (!replacement) {
      replacement = pickReplacement(combinedPool());
    }

    if (!replacement) {
      showToast("当前范围没有其他合适的惩罚可以更换。");
      return;
    }

    state.punishments[index] = {
      item: replacement,
      source: record.source
    };
    renderPunishments();
  }

  function renderPunishments() {
    elements.punishmentResultSubtitle.textContent =
      state.punishments.length === 2
        ? "冒险失败，本轮需要接受以下两项惩罚。"
        : "选择稳妥路线，本轮接受以下一项惩罚。";

    elements.punishmentCardList.innerHTML = "";

    state.punishments.forEach((record, index) => {
      const article = document.createElement("article");
      article.className = "punishment-result-card";

      const fulfillment = record.item.requiresAfter
        ? " · 需要直播后履约"
        : "";

      article.innerHTML = `
        <span>惩罚 ${index + 1} · ${punishmentSourceLabel(record.source)}</span>
        <strong>${record.item.text}</strong>
        <small>${categoryLabels[record.item.category]}${fulfillment}</small>
      `;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button-secondary";
      button.textContent = "觉得不合适，换一个";
      button.addEventListener("click", () => rerollPunishment(index));
      article.appendChild(button);

      elements.punishmentCardList.appendChild(article);
    });

    showScreen(elements.punishmentScreen);
  }

  function finishPunishment() {
    renderFinal(
      `${players[state.loser].name}本轮中招，最终抽取${state.punishments.length}项惩罚。`
    );
  }

  function renderFinal(message) {
    clearTimer();
    elements.finalSummary.textContent = message;
    elements.finalTargetHe.textContent =
      state.targets.he ? state.targets.he.text : "未设置";
    elements.finalTargetFa.textContent =
      state.targets.fa ? state.targets.fa.text : "未设置";

    if (!state.loser) {
      elements.finalTitle.textContent = "本轮平局";
    } else if (state.eventOutcome === "escape") {
      elements.finalTitle.textContent = "幸运逃脱";
    } else {
      elements.finalTitle.textContent = "本轮挑战完成";
    }

    elements.finalPunishments.innerHTML = "";

    if (state.punishments.length) {
      const heading = document.createElement("strong");
      heading.textContent = "本轮最终惩罚";
      elements.finalPunishments.appendChild(heading);

      state.punishments.forEach(({ item }) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = item.text;
        elements.finalPunishments.appendChild(paragraph);
      });
    } else {
      const paragraph = document.createElement("p");
      paragraph.textContent = state.loser
        ? "本轮没有惩罚。"
        : "平局不进入惩罚环节。";
      elements.finalPunishments.appendChild(paragraph);
    }

    showScreen(elements.finalScreen);
  }

  function playAgain() {
    showScreen(elements.setupScreen);
  }

  function openMirrorTest() {
    elements.mirrorTestSample.classList.remove("is-mirrored");
    if (typeof elements.mirrorTestDialog.showModal === "function") {
      elements.mirrorTestDialog.showModal();
    } else {
      showToast("当前浏览器不支持测试弹窗，可在正式展示时切换正常或镜像文字。");
    }
  }

  function setMirrorTestMode(mode) {
    elements.mirrorTestSample.classList.toggle(
      "is-mirrored",
      mode === "mirror"
    );
  }

  function closeMirrorTest() {
    elements.mirrorTestDialog.close();
  }

  document.querySelectorAll('input[name="targetType"]').forEach((input) => {
    input.addEventListener("change", updateTargetInputCopy);
  });

  elements.startSetupButton.addEventListener("click", beginSecretSetup);
  elements.randomTargetButton.addEventListener("click", randomTarget);
  elements.saveTargetButton.addEventListener("click", saveTarget);
  elements.skipAudienceButton.addEventListener("click", skipAudienceDisplay);
  elements.normalAudienceButton.addEventListener(
    "click",
    () => showAudienceTarget("normal")
  );
  elements.mirrorAudienceButton.addEventListener(
    "click",
    () => showAudienceTarget("mirror")
  );
  elements.finishAudienceButton.addEventListener(
    "click",
    finishAudienceDisplay
  );
  elements.continuePassButton.addEventListener("click", continueAfterPass);
  elements.restartButton.addEventListener("click", restartGame);

  elements.caughtButtons.forEach((button) => {
    button.addEventListener("click", () => openClaim(button.dataset.caught));
  });

  elements.endAsDrawButton.addEventListener("click", () => {
    const confirmed = window.confirm("确定提前结束并判定本轮平局吗？");
    if (confirmed) {
      finishAsDraw("两个人选择提前结束，本轮平局且不进入惩罚环节。");
    }
  });

  elements.rejectClaimButton.addEventListener("click", rejectClaim);
  elements.confirmClaimButton.addEventListener("click", confirmClaim);
  elements.stableRouteButton.addEventListener("click", stablePunishment);
  elements.riskRouteButton.addEventListener("click", startRiskRoute);
  elements.eventContinueButton.addEventListener("click", continueAfterEvent);
  elements.finishPunishmentButton.addEventListener("click", finishPunishment);
  elements.playAgainButton.addEventListener("click", playAgain);

  elements.mirrorTestButton.addEventListener("click", openMirrorTest);
  elements.mirrorNormalButton.addEventListener(
    "click",
    () => setMirrorTestMode("normal")
  );
  elements.mirrorFlipButton.addEventListener(
    "click",
    () => setMirrorTestMode("mirror")
  );
  elements.closeMirrorTestButton.addEventListener(
    "click",
    closeMirrorTest
  );
  elements.mirrorTestDialog.addEventListener("click", (event) => {
    if (event.target === elements.mirrorTestDialog) {
      closeMirrorTest();
    }
  });

  elements.openHelpButton.addEventListener("click", () => {
    if (typeof elements.helpDialog.showModal === "function") {
      elements.helpDialog.showModal();
    } else {
      showToast("互设隐藏目标，谁先中招谁选择惩罚路线。");
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
  updateTargetInputCopy();
})();
