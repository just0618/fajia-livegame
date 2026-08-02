(() => {
  "use strict";

  const themes = window.FAJIA_LIFELINE_THEMES;
  const punishmentBank = window.FAJIA_PUNISHMENT_BANK;
  const players = ["法宣阁", "贺嘉述"];
  const labels = ["A", "B", "C", "D"];

  if (!Array.isArray(themes)) {
    throw new Error("命悬一线主题库未加载。");
  }

  const state = {
    theme: null,
    describer: 0,
    orderer: 1,
    numbers: [],
    secretIndex: 0,
    chosenOrder: [],
    punishmentEnabled: true,
    currentPunishment: null
  };

  const elements = {
    setupScreen: document.getElementById("setupScreen"),
    gameScreen: document.getElementById("gameScreen"),
    themeSelect: document.getElementById("themeSelect"),
    punishmentCheckbox: document.getElementById("punishmentCheckbox"),
    startButton: document.getElementById("startButton"),
    describerName: document.getElementById("describerName"),
    ordererName: document.getElementById("ordererName"),
    secretStage: document.getElementById("secretStage"),
    sortStage: document.getElementById("sortStage"),
    resultStage: document.getElementById("resultStage"),
    secretThemeTitle: document.getElementById("secretThemeTitle"),
    secretScale: document.getElementById("secretScale"),
    secretLabel: document.getElementById("secretLabel"),
    secretNumber: document.getElementById("secretNumber"),
    secretInstruction: document.getElementById("secretInstruction"),
    revealNumberButton: document.getElementById("revealNumberButton"),
    nextSecretButton: document.getElementById("nextSecretButton"),
    sortThemeTitle: document.getElementById("sortThemeTitle"),
    sortScale: document.getElementById("sortScale"),
    labelButtons: document.getElementById("labelButtons"),
    chosenOrder: document.getElementById("chosenOrder"),
    undoButton: document.getElementById("undoButton"),
    resetOrderButton: document.getElementById("resetOrderButton"),
    submitOrderButton: document.getElementById("submitOrderButton"),
    resultTitle: document.getElementById("resultTitle"),
    resultCopy: document.getElementById("resultCopy"),
    submittedOrder: document.getElementById("submittedOrder"),
    correctOrder: document.getElementById("correctOrder"),
    numberRevealList: document.getElementById("numberRevealList"),
    punishmentPanel: document.getElementById("punishmentPanel"),
    punishmentText: document.getElementById("punishmentText"),
    rerollPunishmentButton: document.getElementById("rerollPunishmentButton"),
    skipPunishmentButton: document.getElementById("skipPunishmentButton"),
    playAgainButton: document.getElementById("playAgainButton"),
    helpDialog: document.getElementById("helpDialog"),
    openHelpButton: document.getElementById("openHelpButton"),
    closeHelpButton: document.getElementById("closeHelpButton"),
    toast: document.getElementById("toast")
  };

  let toastTimer;

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2400);
  }

  function selectedValue(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value;
  }

  function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function generateNumbers() {
    const values = new Set();
    while (values.size < 4) {
      values.add(Math.floor(Math.random() * 100) + 1);
    }
    return [...values].map((value, index) => ({
      label: labels[index],
      value
    }));
  }

  function chooseTheme() {
    const value = elements.themeSelect.value;
    if (value === "random") return pick(themes);
    return themes.find((theme) => theme.id === value) || themes[0];
  }

  function initThemeSelect() {
    themes.forEach((theme) => {
      const option = document.createElement("option");
      option.value = theme.id;
      option.textContent = theme.title;
      elements.themeSelect.appendChild(option);
    });
  }

  function renderSecretStage() {
    const item = state.numbers[state.secretIndex];
    elements.secretLabel.textContent = item.label;
    elements.secretNumber.textContent = "?";
    elements.secretNumber.classList.remove("is-visible");
    elements.secretInstruction.textContent =
      "点击后显示当前标签的数字；说完对应描述后，再隐藏数字并查看下一个。";
    elements.revealNumberButton.hidden = false;
    elements.nextSecretButton.disabled = true;
    elements.nextSecretButton.textContent =
      state.secretIndex === state.numbers.length - 1
        ? "隐藏并交给排序者"
        : "隐藏并看下一个";
  }

  function revealNumber() {
    const item = state.numbers[state.secretIndex];
    elements.secretNumber.textContent = String(item.value);
    elements.secretNumber.classList.add("is-visible");
    elements.secretInstruction.textContent =
      `请围绕本轮主题，为${item.label}说一个具体例子，用例子的程度表达数字大小，不要直接说出数字。`;
    elements.revealNumberButton.hidden = true;
    elements.nextSecretButton.disabled = false;
  }

  function nextSecret() {
    if (state.secretIndex >= state.numbers.length - 1) {
      elements.secretStage.hidden = true;
      elements.sortStage.hidden = false;
      renderSortStage();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    state.secretIndex += 1;
    renderSecretStage();
  }

  function renderOrder() {
    elements.chosenOrder.innerHTML = "";
    for (let index = 0; index < 4; index += 1) {
      const slot = document.createElement("span");
      slot.textContent = state.chosenOrder[index] || String(index + 1);
      slot.classList.toggle("is-filled", Boolean(state.chosenOrder[index]));
      elements.chosenOrder.appendChild(slot);
    }

    elements.labelButtons.querySelectorAll("button").forEach((button) => {
      button.disabled = state.chosenOrder.includes(button.dataset.label);
    });

    elements.undoButton.disabled = state.chosenOrder.length === 0;
    elements.resetOrderButton.disabled = state.chosenOrder.length === 0;
    elements.submitOrderButton.disabled = state.chosenOrder.length !== 4;
  }

  function renderSortStage() {
    elements.labelButtons.innerHTML = "";
    labels.forEach((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.label = label;
      button.textContent = label;
      button.addEventListener("click", () => {
        state.chosenOrder.push(label);
        renderOrder();
      });
      elements.labelButtons.appendChild(button);
    });
    renderOrder();
  }

  function lightPunishments() {
    const items = punishmentBank?.common?.light;
    if (Array.isArray(items) && items.length) return items;
    return [
      { id: "fallback-1", text: "模仿对方一句常用口头禅。" },
      { id: "fallback-2", text: "说出一件印象很深的双人趣事。" },
      { id: "fallback-3", text: "夸对方一个今天表现得很好的地方。" }
    ];
  }

  function drawPunishment() {
    const pool = lightPunishments();
    const alternatives = pool.filter(
      (item) => item.id !== state.currentPunishment?.id
    );
    state.currentPunishment = pick(alternatives.length ? alternatives : pool);
    elements.punishmentText.textContent = state.currentPunishment.text;
  }

  function submitOrder() {
    const correct = [...state.numbers]
      .sort((a, b) => a.value - b.value)
      .map((item) => item.label);
    const isCorrect = correct.every(
      (label, index) => label === state.chosenOrder[index]
    );

    elements.sortStage.hidden = true;
    elements.resultStage.hidden = false;
    elements.resultTitle.textContent = isCorrect ? "排序完全正确！" : "这一轮排序有误";
    elements.resultCopy.textContent = isCorrect
      ? `${players[state.orderer]}成功根据四个描述还原了数字顺序。`
      : `正确答案已经揭晓。惩罚只是可选互动，不合适可以更换或跳过。`;
    elements.submittedOrder.textContent = state.chosenOrder.join(" → ");
    elements.correctOrder.textContent = correct.join(" → ");

    elements.numberRevealList.innerHTML = "";
    [...state.numbers]
      .sort((a, b) => a.value - b.value)
      .forEach((item) => {
        const row = document.createElement("div");
        row.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
        elements.numberRevealList.appendChild(row);
      });

    elements.punishmentPanel.hidden = isCorrect || !state.punishmentEnabled;
    if (!elements.punishmentPanel.hidden) {
      drawPunishment();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startGame() {
    state.theme = chooseTheme();
    const selected = selectedValue("describer") || "random";
    state.describer =
      selected === "random" ? Math.floor(Math.random() * 2) : Number(selected);
    state.orderer = (state.describer + 1) % 2;
    state.numbers = generateNumbers();
    state.secretIndex = 0;
    state.chosenOrder = [];
    state.punishmentEnabled = elements.punishmentCheckbox.checked;
    state.currentPunishment = null;

    elements.describerName.textContent = players[state.describer];
    elements.ordererName.textContent = players[state.orderer];
    elements.secretThemeTitle.textContent = state.theme.title;
    elements.secretScale.textContent = `${state.theme.low}｜${state.theme.high}`;
    elements.sortThemeTitle.textContent = state.theme.title;
    elements.sortScale.textContent = `${state.theme.low}｜${state.theme.high}`;

    elements.setupScreen.hidden = true;
    elements.gameScreen.hidden = false;
    elements.secretStage.hidden = false;
    elements.sortStage.hidden = true;
    elements.resultStage.hidden = true;
    renderSecretStage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToSetup() {
    elements.gameScreen.hidden = true;
    elements.setupScreen.hidden = false;
    elements.punishmentPanel.hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  elements.startButton.addEventListener("click", startGame);
  elements.revealNumberButton.addEventListener("click", revealNumber);
  elements.nextSecretButton.addEventListener("click", nextSecret);
  elements.undoButton.addEventListener("click", () => {
    state.chosenOrder.pop();
    renderOrder();
  });
  elements.resetOrderButton.addEventListener("click", () => {
    state.chosenOrder = [];
    renderOrder();
  });
  elements.submitOrderButton.addEventListener("click", submitOrder);
  elements.rerollPunishmentButton.addEventListener("click", drawPunishment);
  elements.skipPunishmentButton.addEventListener("click", () => {
    elements.punishmentPanel.hidden = true;
    showToast("本轮已跳过惩罚。");
  });
  elements.playAgainButton.addEventListener("click", returnToSetup);

  elements.openHelpButton.addEventListener("click", () => {
    if (typeof elements.helpDialog.showModal === "function") {
      elements.helpDialog.showModal();
    } else {
      showToast("描述者看数字举例，排序者按1—100从小到大排列。");
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

  initThemeSelect();
})();
