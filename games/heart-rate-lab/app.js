(() => {
  "use strict";

  const bank = window.FAJIA_HEART_RATE_LAB_BANK;
  if (!bank) {
    throw new Error("题库未加载，请确认 questions.js 与 app.js 位于同一文件夹。");
  }

  const players = [
    { name: "法宣阁", image: "../../assets/players/fa.webp" },
    { name: "贺嘉述", image: "../../assets/players/he.webp" }
  ];

  const state = {
    gameplay: "action",
    actionScale: "mixed",
    recordMode: "health",
    wearer: 0,
    rounds: 5,
    completed: 0,
    skipped: 0,
    queue: [],
    currentTask: null,
    records: [],
    waitTimer: null,
    experimentTimer: null,
    restTimer: null,
    liveTimer: null,
    activeMinute: null,
    baseline: null
  };

  const $ = (id) => document.getElementById(id);

  const elements = {
    setupScreen: $("setupScreen"),
    playScreen: $("playScreen"),
    dataEntryScreen: $("dataEntryScreen"),
    resultScreen: $("resultScreen"),
    actionScaleSection: $("actionScaleSection"),
    recordModeStep: $("recordModeStep"),
    wearerStep: $("wearerStep"),
    roundStep: $("roundStep"),

    startButton: $("startButton"),
    restartButton: $("restartButton"),
    modePill: $("modePill"),
    roundCounter: $("roundCounter"),
    wearerLabel: $("wearerLabel"),
    progressBar: $("progressBar"),

    readyPanel: $("readyPanel"),
    roundTitleText: $("roundTitleText"),
    readyInstruction: $("readyInstruction"),
    roleBox: $("roleBox"),
    skipButton: $("skipButton"),
    prepareRoundButton: $("prepareRoundButton"),

    waitingPanel: $("waitingPanel"),
    waitCountdown: $("waitCountdown"),
    waitTargetText: $("waitTargetText"),
    cancelWaitButton: $("cancelWaitButton"),

    experimentPanel: $("experimentPanel"),
    experimentMinuteLabel: $("experimentMinuteLabel"),
    experimentTimer: $("experimentTimer"),
    taskTypeLabel: $("taskTypeLabel"),
    taskText: $("taskText"),
    taskRoleInstruction: $("taskRoleInstruction"),
    phaseTitle: $("phaseTitle"),
    phaseDescription: $("phaseDescription"),
    timelineProgress: $("timelineProgress"),
    abortExperimentButton: $("abortExperimentButton"),

    restPanel: $("restPanel"),
    restCountdown: $("restCountdown"),
    viewNextButton: $("viewNextButton"),

    liveBaselinePanel: $("liveBaselinePanel"),
    baselineInput: $("baselineInput"),
    liveSkipButton: $("liveSkipButton"),
    startLiveButton: $("startLiveButton"),

    liveTaskPanel: $("liveTaskPanel"),
    liveTimer: $("liveTimer"),
    liveTaskTypeLabel: $("liveTaskTypeLabel"),
    liveTaskText: $("liveTaskText"),
    liveTaskRoleInstruction: $("liveTaskRoleInstruction"),

    liveResultInputPanel: $("liveResultInputPanel"),
    baselineSummary: $("baselineSummary"),
    livePeakInput: $("livePeakInput"),
    saveLiveResultButton: $("saveLiveResultButton"),

    dataEntryList: $("dataEntryList"),
    calculateHealthButton: $("calculateHealthButton"),

    resultSubtitle: $("resultSubtitle"),
    highestPeakValue: $("highestPeakValue"),
    highestPeakTask: $("highestPeakTask"),
    largestChangeLabel: $("largestChangeLabel"),
    largestChangeValue: $("largestChangeValue"),
    largestChangeTask: $("largestChangeTask"),
    resultFirstMetricHeader: $("resultFirstMetricHeader"),
    resultChangeHeader: $("resultChangeHeader"),
    resultTableBody: $("resultTableBody"),
    playAgainButton: $("playAgainButton"),

    helpDialog: $("helpDialog"),
    openHelpButton: $("openHelpButton"),
    closeHelpButton: $("closeHelpButton"),
    toast: $("toast")
  };

  let toastTimer;

  function getSelectedValue(name) {
    const input = document.querySelector(`input[name="${name}"]:checked`);
    return input ? input.value : null;
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
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2600);
  }

  function clearTimers() {
    [
      "waitTimer",
      "experimentTimer",
      "restTimer",
      "liveTimer"
    ].forEach((key) => {
      if (state[key] !== null) {
        clearInterval(state[key]);
        state[key] = null;
      }
    });
  }

  function formatClock(date) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date);
  }

  function formatDuration(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function updateSetupForGameplay() {
    const gameplay = getSelectedValue("gameplay") || "action";
    const isAction = gameplay === "action";
    elements.actionScaleSection.hidden = !isAction;
    elements.recordModeStep.textContent = isAction ? "STEP 03" : "STEP 02";
    elements.wearerStep.textContent = isAction ? "STEP 04" : "STEP 03";
    elements.roundStep.textContent = isAction ? "STEP 05" : "STEP 04";
  }

  function buildQueue() {
    if (state.gameplay === "question") {
      return shuffle(
        bank.questions.map((text) => ({
          type: "question",
          text,
          duration: 25
        }))
      );
    }

    let source = [];
    if (state.actionScale === "light") {
      source = bank.actionLight;
    } else if (state.actionScale === "high") {
      source = bank.actionHigh;
    } else {
      source = [...bank.actionLight, ...bank.actionHigh];
    }

    return shuffle(
      source.map((item) => ({
        type: "action",
        text: item.text,
        duration: item.duration
      }))
    );
  }

  function takeTask() {
    if (state.queue.length === 0) {
      state.queue = buildQueue();
      showToast("题库已重新洗牌。");
    }
    state.currentTask = state.queue.shift();
  }

  function skipTask() {
    if (state.currentTask) {
      state.queue.push(state.currentTask);
    }
    state.currentTask = null;
    state.skipped += 1;
    showToast("本题已跳过，不占用正式轮数。");
    renderRoundReady();
  }

  function wearerName() {
    return players[state.wearer].name;
  }

  function partnerName() {
    return players[(state.wearer + 1) % 2].name;
  }

  function taskTypeName() {
    return state.gameplay === "action" ? "动作心率实验" : "对视问答实验";
  }

  function roleInstruction() {
    if (state.gameplay === "action") {
      return `${partnerName()}完成动作，${wearerName()}佩戴设备并自然保持戴表手腕稳定。`;
    }

    return `${wearerName()}佩戴设备并提问，${partnerName()}在对视和牵手状态下回答。`;
  }

  function updateTopProgress() {
    elements.modePill.textContent =
      state.recordMode === "health" ? "健康数据回看" : "手表实时观察";
    elements.roundCounter.textContent =
      `第 ${state.completed + 1} / ${state.rounds} 轮`;
    elements.wearerLabel.textContent = `${wearerName()}佩戴设备`;
    elements.progressBar.style.width =
      `${(state.completed / state.rounds) * 100}%`;
  }

  function hidePlayPanels() {
    [
      elements.readyPanel,
      elements.waitingPanel,
      elements.experimentPanel,
      elements.restPanel,
      elements.liveBaselinePanel,
      elements.liveTaskPanel,
      elements.liveResultInputPanel
    ].forEach((panel) => {
      panel.hidden = true;
    });
  }

  function renderRoleBox() {
    const actionLabel =
      state.gameplay === "action" ? "完成动作" : "回答问题";

    elements.roleBox.innerHTML = `
      <div class="role-item role-item-pink">
        <span>佩戴设备</span>
        <strong>${wearerName()}</strong>
      </div>
      <div class="role-item role-item-gold">
        <span>${actionLabel}</span>
        <strong>${partnerName()}</strong>
      </div>
    `;
  }

  function renderRoundReady() {
    clearTimers();
    hidePlayPanels();
    if (!state.currentTask) takeTask();

    updateTopProgress();
    renderRoleBox();

    elements.roundTitleText.textContent = `准备第${state.completed + 1}轮`;

    if (state.recordMode === "health") {
      elements.readyInstruction.textContent =
        "题目会在实验分钟开始时揭晓，避免提前看到题目影响心率。";
      elements.prepareRoundButton.textContent = "等待下一整分钟开始";
      elements.readyPanel.hidden = false;
    } else {
      elements.liveBaselinePanel.hidden = false;
      elements.baselineInput.value = "";
      elements.livePeakInput.value = "";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prepareHealthRound() {
    hidePlayPanels();
    elements.waitingPanel.hidden = false;

    const now = new Date();
    const target = new Date(now);
    target.setSeconds(0, 0);
    target.setMinutes(target.getMinutes() + 1);

    elements.waitTargetText.textContent =
      `预计开始时间：${formatClock(target)}`;

    const updateWait = () => {
      const remaining = target.getTime() - Date.now();
      elements.waitCountdown.textContent = formatDuration(remaining);

      if (remaining <= 0) {
        clearInterval(state.waitTimer);
        state.waitTimer = null;
        beginHealthExperiment(target);
      }
    };

    updateWait();
    state.waitTimer = setInterval(updateWait, 200);
  }

  function cancelHealthWait() {
    clearTimers();
    renderRoundReady();
  }

  function phaseForElapsed(elapsedSeconds) {
    const taskDuration =
      state.gameplay === "question"
        ? 25
        : Math.min(25, Math.max(8, state.currentTask.duration));
    const taskEnd = 5 + taskDuration;

    if (elapsedSeconds < 5) {
      return {
        title: "准备开始",
        description: "确认设备正在记录，并保持戴表手腕自然稳定。"
      };
    }

    if (elapsedSeconds < taskEnd) {
      return {
        title: state.gameplay === "action" ? "完成动作" : "对视回答",
        description:
          state.gameplay === "action"
            ? "按照题目完成动作，双方均可随时停止。"
            : "保持自然对视，尽量在本阶段内完成回答。"
      };
    }

    if (elapsedSeconds < 50) {
      return {
        title: "等待心率反应",
        description: "动作或回答可以结束，继续自然放松，让设备记录这一分钟。"
      };
    }

    return {
      title: "本轮即将结束",
      description: "保持自然状态，等待进入休息分钟。"
    };
  }

  function beginHealthExperiment(startDate) {
    hidePlayPanels();
    elements.experimentPanel.hidden = false;

    state.activeMinute = formatClock(startDate);
    elements.experimentMinuteLabel.textContent =
      `记录分钟 ${state.activeMinute}`;
    elements.taskTypeLabel.textContent = taskTypeName();
    elements.taskText.textContent = state.currentTask.text;
    elements.taskRoleInstruction.textContent = roleInstruction();

    const endTime = startDate.getTime() + 60_000;

    const updateExperiment = () => {
      const remainingMilliseconds = endTime - Date.now();
      const remainingSeconds = Math.max(
        0,
        Math.ceil(remainingMilliseconds / 1000)
      );
      const elapsedSeconds = Math.min(
        60,
        Math.max(0, 60 - remainingSeconds)
      );

      elements.experimentTimer.textContent = String(remainingSeconds);
      elements.timelineProgress.style.width =
        `${(elapsedSeconds / 60) * 100}%`;

      const phase = phaseForElapsed(elapsedSeconds);
      elements.phaseTitle.textContent = phase.title;
      elements.phaseDescription.textContent = phase.description;

      if (remainingMilliseconds <= 0) {
        clearInterval(state.experimentTimer);
        state.experimentTimer = null;
        finishHealthExperiment();
      }
    };

    updateExperiment();
    state.experimentTimer = setInterval(updateExperiment, 200);
  }

  function finishHealthExperiment() {
    state.records.push({
      round: state.completed + 1,
      task: state.currentTask.text,
      minute: state.activeMinute,
      min: null,
      max: null,
      change: null
    });

    state.completed += 1;
    state.currentTask = null;
    state.activeMinute = null;

    if (state.completed >= state.rounds) {
      showHealthDataEntry();
      return;
    }

    beginRest(60);
  }

  function abortHealthExperiment() {
    clearTimers();
    if (state.currentTask) {
      state.queue.push(state.currentTask);
    }
    state.currentTask = null;
    state.activeMinute = null;
    showToast("本轮已中止，不计入正式轮数。");
    renderRoundReady();
  }

  function beginRest(seconds) {
    hidePlayPanels();
    elements.restPanel.hidden = false;

    const endTime = Date.now() + seconds * 1000;

    const updateRest = () => {
      const remaining = endTime - Date.now();
      elements.restCountdown.textContent = formatDuration(remaining);

      if (remaining <= 0) {
        clearInterval(state.restTimer);
        state.restTimer = null;
        renderRoundReady();
      }
    };

    updateRest();
    state.restTimer = setInterval(updateRest, 200);
  }

  function viewNextRoundEarly() {
    clearTimers();
    renderRoundReady();
  }

  function readBpm(input, label) {
    const value = Number(input.value);
    if (!Number.isFinite(value) || value < 30 || value > 240) {
      showToast(`请输入有效的${label}，范围为30—240 BPM。`);
      input.focus();
      return null;
    }
    return Math.round(value);
  }

  function startLiveRound() {
    const baseline = readBpm(elements.baselineInput, "动作前心率");
    if (baseline === null) return;

    state.baseline = baseline;
    hidePlayPanels();
    elements.liveTaskPanel.hidden = false;
    elements.liveTaskTypeLabel.textContent = taskTypeName();
    elements.liveTaskText.textContent = state.currentTask.text;
    elements.liveTaskRoleInstruction.textContent = roleInstruction();

    const endTime = Date.now() + 15_000;

    const updateLive = () => {
      const remaining = endTime - Date.now();
      elements.liveTimer.textContent = String(
        Math.max(0, Math.ceil(remaining / 1000))
      );

      if (remaining <= 0) {
        clearInterval(state.liveTimer);
        state.liveTimer = null;
        showLivePeakInput();
      }
    };

    updateLive();
    state.liveTimer = setInterval(updateLive, 150);
  }

  function showLivePeakInput() {
    hidePlayPanels();
    elements.liveResultInputPanel.hidden = false;
    elements.baselineSummary.textContent =
      `动作前心率：${state.baseline} BPM`;
    elements.livePeakInput.value = "";
    elements.livePeakInput.focus();
  }

  function saveLiveResult() {
    const peak = readBpm(elements.livePeakInput, "最高心率");
    if (peak === null) return;

    state.records.push({
      round: state.completed + 1,
      task: state.currentTask.text,
      baseline: state.baseline,
      max: peak,
      change: peak - state.baseline
    });

    state.completed += 1;
    state.currentTask = null;
    state.baseline = null;

    if (state.completed >= state.rounds) {
      showResults();
      return;
    }

    beginRest(45);
  }

  function showHealthDataEntry() {
    clearTimers();
    elements.playScreen.hidden = true;
    elements.dataEntryScreen.hidden = false;
    renderHealthEntryCards();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderHealthEntryCards() {
    elements.dataEntryList.innerHTML = "";

    state.records.forEach((record, index) => {
      const card = document.createElement("article");
      card.className = "data-entry-card";
      card.innerHTML = `
        <div class="data-entry-copy">
          <span>ROUND ${String(record.round).padStart(2, "0")} · ${record.minute}</span>
          <strong>${record.task}</strong>
          <small>只填写 ${record.minute} 这一实验分钟的数据</small>
        </div>

        <label class="data-number-label">
          最低心率
          <span>
            <input
              type="number"
              min="30"
              max="240"
              inputmode="numeric"
              data-health-min="${index}"
              aria-label="第${record.round}轮最低心率"
            />
            <em>BPM</em>
          </span>
        </label>

        <label class="data-number-label">
          最高心率
          <span>
            <input
              type="number"
              min="30"
              max="240"
              inputmode="numeric"
              data-health-max="${index}"
              aria-label="第${record.round}轮最高心率"
            />
            <em>BPM</em>
          </span>
        </label>
      `;
      elements.dataEntryList.appendChild(card);
    });
  }

  function calculateHealthResults() {
    let validCount = 0;

    state.records.forEach((record, index) => {
      const minInput = document.querySelector(
        `[data-health-min="${index}"]`
      );
      const maxInput = document.querySelector(
        `[data-health-max="${index}"]`
      );

      const minRaw = minInput.value.trim();
      const maxRaw = maxInput.value.trim();

      if (!minRaw && !maxRaw) {
        record.min = null;
        record.max = null;
        record.change = null;
        return;
      }

      const min = Number(minRaw);
      const max = Number(maxRaw);

      if (
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        min < 30 ||
        max > 240 ||
        max < min
      ) {
        showToast(
          `第${record.round}轮数据有误，请确认最低和最高心率。`
        );
        minInput.focus();
        throw new Error("INVALID_HEALTH_INPUT");
      }

      record.min = Math.round(min);
      record.max = Math.round(max);
      record.change = record.max - record.min;
      validCount += 1;
    });

    if (validCount === 0) {
      showToast("请至少填写一轮有效的心率数据。");
      return;
    }

    showResults();
  }

  function highestBy(records, key) {
    return [...records].sort((a, b) => b[key] - a[key])[0];
  }

  function showResults() {
    clearTimers();

    const validRecords = state.records.filter(
      (record) =>
        Number.isFinite(record.max) &&
        Number.isFinite(record.change)
    );

    if (validRecords.length === 0) {
      showToast("暂无可用于计算的结果。");
      return;
    }

    elements.playScreen.hidden = true;
    elements.dataEntryScreen.hidden = true;
    elements.resultScreen.hidden = false;

    const highestPeak = highestBy(validRecords, "max");
    const largestChange = highestBy(validRecords, "change");

    elements.resultSubtitle.textContent =
      `${wearerName()}完成了${validRecords.length}轮有效记录。` +
      (state.recordMode === "health"
        ? "结果按实验分钟的健康数据计算。"
        : "结果按动作前读数与实时观察峰值计算。");

    elements.highestPeakValue.textContent = `${highestPeak.max} BPM`;
    elements.highestPeakTask.textContent = highestPeak.task;

    elements.largestChangeLabel.textContent =
      state.recordMode === "health"
        ? "最大心率波动"
        : "最大心率上升";
    elements.largestChangeValue.textContent =
      `${largestChange.change >= 0 ? "+" : ""}${largestChange.change} BPM`;
    elements.largestChangeTask.textContent = largestChange.task;

    elements.resultFirstMetricHeader.textContent =
      state.recordMode === "health" ? "最低" : "动作前";
    elements.resultChangeHeader.textContent =
      state.recordMode === "health" ? "波动" : "上升";

    elements.resultTableBody.innerHTML = "";
    validRecords.forEach((record) => {
      const firstMetric =
        state.recordMode === "health" ? record.min : record.baseline;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>R${String(record.round).padStart(2, "0")}</td>
        <td>${record.task}</td>
        <td>${firstMetric} BPM</td>
        <td>${record.max} BPM</td>
        <td>${record.change >= 0 ? "+" : ""}${record.change} BPM</td>
      `;
      elements.resultTableBody.appendChild(row);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startGame() {
    clearTimers();

    state.gameplay = getSelectedValue("gameplay") || "action";
    state.actionScale = getSelectedValue("actionScale") || "mixed";
    state.recordMode = getSelectedValue("recordMode") || "health";
    state.wearer = Number(getSelectedValue("wearer") || 0);
    state.rounds = Number(getSelectedValue("rounds") || 5);
    state.completed = 0;
    state.skipped = 0;
    state.queue = buildQueue();
    state.currentTask = null;
    state.records = [];
    state.activeMinute = null;
    state.baseline = null;

    elements.setupScreen.hidden = true;
    elements.dataEntryScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.playScreen.hidden = false;

    renderRoundReady();
  }

  function returnToSetup() {
    clearTimers();
    elements.playScreen.hidden = true;
    elements.dataEntryScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.setupScreen.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll('input[name="gameplay"]').forEach((input) => {
    input.addEventListener("change", updateSetupForGameplay);
  });

  elements.startButton.addEventListener("click", startGame);
  elements.restartButton.addEventListener("click", returnToSetup);
  elements.skipButton.addEventListener("click", skipTask);
  elements.prepareRoundButton.addEventListener("click", prepareHealthRound);
  elements.cancelWaitButton.addEventListener("click", cancelHealthWait);
  elements.abortExperimentButton.addEventListener("click", abortHealthExperiment);
  elements.viewNextButton.addEventListener("click", viewNextRoundEarly);

  elements.liveSkipButton.addEventListener("click", skipTask);
  elements.startLiveButton.addEventListener("click", startLiveRound);
  elements.saveLiveResultButton.addEventListener("click", saveLiveResult);

  elements.calculateHealthButton.addEventListener("click", () => {
    try {
      calculateHealthResults();
    } catch (error) {
      if (error.message !== "INVALID_HEALTH_INPUT") {
        throw error;
      }
    }
  });

  elements.playAgainButton.addEventListener("click", returnToSetup);

  elements.openHelpButton.addEventListener("click", () => {
    if (typeof elements.helpDialog.showModal === "function") {
      elements.helpDialog.showModal();
    } else {
      showToast("每道题独占一个实验分钟，休息分钟无需关闭心率测量。");
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

  window.addEventListener("beforeunload", clearTimers);

  updateSetupForGameplay();
})();
