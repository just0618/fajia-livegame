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
    participantMode: "single",
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

    equipmentCopy: $("equipmentCopy"),
    actionModeTitle: $("actionModeTitle"),
    actionModeDescription: $("actionModeDescription"),
    questionModeTitle: $("questionModeTitle"),
    questionModeDescription: $("questionModeDescription"),
    actionScaleSection: $("actionScaleSection"),
    dualBankNote: $("dualBankNote"),
    recordModeSection: $("recordModeSection"),
    recordModeStep: $("recordModeStep"),
    liveRecordChoice: $("liveRecordChoice"),
    dualRecordNote: $("dualRecordNote"),
    wearerSection: $("wearerSection"),
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
    waitSupportCopy: $("waitSupportCopy"),
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

    dataEntryDescription: $("dataEntryDescription"),
    dataEntryList: $("dataEntryList"),
    calculateHealthButton: $("calculateHealthButton"),

    resultSubtitle: $("resultSubtitle"),
    resultHighlights: $("resultHighlights"),
    resultTableHead: $("resultTableHead"),
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

  function setSelectedValue(name, value) {
    const input = document.querySelector(
      `input[name="${name}"][value="${value}"]`
    );
    if (input) input.checked = true;
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
    ["waitTimer", "experimentTimer", "restTimer", "liveTimer"].forEach(
      (key) => {
        if (state[key] !== null) {
          clearInterval(state[key]);
          state[key] = null;
        }
      }
    );
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

  function isDual() {
    return state.participantMode === "dual";
  }

  function currentSetupIsDual() {
    return (getSelectedValue("participantMode") || "single") === "dual";
  }

  function updateSetupOptions() {
    const dual = currentSetupIsDual();
    const gameplay = getSelectedValue("gameplay") || "action";
    const action = gameplay === "action";

    elements.equipmentCopy.textContent = dual
      ? "两块可测量心率的手表或手环，以及各自配套的手机。"
      : "一块可测量心率的手表或手环，以及配套手机。";

    elements.actionModeTitle.textContent = dual
      ? "双人共同动作"
      : "动作心率实验";
    elements.actionModeDescription.textContent = dual
      ? "两个人共同完成同一个互动，同时记录双方心率。"
      : "另一位完成不同小动作，寻找心率最高或波动最大的动作。";

    elements.questionModeTitle.textContent = dual
      ? "双人共同问答"
      : "对视问答实验";
    elements.questionModeDescription.textContent = dual
      ? "两个人依次回答同一道问题，记录这一共同问答分钟。"
      : "佩戴者提问，对方在对视和牵手状态下回答。";

    elements.actionScaleSection.hidden = !action || dual;
    elements.dualBankNote.hidden = !dual || !action;
    elements.liveRecordChoice.hidden = dual;
    elements.dualRecordNote.hidden = !dual;
    elements.wearerSection.hidden = dual;

    if (dual) {
      setSelectedValue("recordMode", "health");
    }

    elements.recordModeStep.textContent =
      action && !dual ? "STEP 04" : "STEP 03";
    elements.wearerStep.textContent =
      action && !dual ? "STEP 05" : "STEP 04";
    elements.roundStep.textContent = dual
      ? action
        ? "STEP 04"
        : "STEP 04"
      : action
        ? "STEP 06"
        : "STEP 05";
  }

  function buildQueue() {
    if (isDual()) {
      const source =
        state.gameplay === "action" ? bank.dualActions : bank.dualQuestions;
      return shuffle(
        source.map((text) => ({
          type: state.gameplay,
          text,
          duration: state.gameplay === "action" ? 25 : 40
        }))
      );
    }

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

  function firstSpeakerIndex() {
    return state.completed % 2;
  }

  function taskTypeName() {
    if (isDual()) {
      return state.gameplay === "action"
        ? "双人共同动作"
        : "双人共同问答";
    }
    return state.gameplay === "action"
      ? "动作心率实验"
      : "对视问答实验";
  }

  function roleInstruction() {
    if (isDual()) {
      if (state.gameplay === "action") {
        return "两个人都佩戴设备，共同完成本题；本轮只记录共同互动，不区分动作方向。";
      }
      const first = players[firstSpeakerIndex()].name;
      const second = players[(firstSpeakerIndex() + 1) % 2].name;
      return `${first}先回答，${second}再回答；两个人都记录这一分钟的数据。`;
    }

    if (state.gameplay === "action") {
      return `${partnerName()}完成动作，${wearerName()}佩戴设备并自然保持戴表手腕稳定。`;
    }

    return `${wearerName()}佩戴设备并提问，${partnerName()}在对视和牵手状态下回答。`;
  }

  function updateTopProgress() {
    const participantLabel = isDual() ? "双人同步" : "单人反应";
    const recordLabel =
      state.recordMode === "health" ? "健康数据回看" : "手表实时观察";

    elements.modePill.textContent = `${participantLabel} · ${recordLabel}`;
    elements.roundCounter.textContent =
      `第 ${state.completed + 1} / ${state.rounds} 轮`;
    elements.wearerLabel.textContent = isDual()
      ? "法宣阁与贺嘉述同时佩戴"
      : `${wearerName()}佩戴设备`;
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
    if (isDual()) {
      elements.roleBox.innerHTML = `
        <div class="role-item role-item-pink">
          <span>同步记录</span>
          <strong>法宣阁</strong>
        </div>
        <div class="role-item role-item-gold">
          <span>同步记录</span>
          <strong>贺嘉述</strong>
        </div>
      `;
      return;
    }

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
      elements.readyInstruction.textContent = isDual()
        ? "两块设备都确认开始记录后，再等待下一整分钟。题目会在实验分钟开始时揭晓。"
        : "题目会在实验分钟开始时揭晓，避免提前看到题目影响心率。";
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
    elements.waitSupportCopy.textContent = isDual()
      ? "请确认两块设备都已开始记录。无需把手表一直举向镜头。"
      : "请确认心率设备已开始记录。无需把手表一直举向镜头。";

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
    if (isDual() && state.gameplay === "question") {
      const first = players[firstSpeakerIndex()].name;
      const second = players[(firstSpeakerIndex() + 1) % 2].name;

      if (elapsedSeconds < 5) {
        return {
          title: "准备开始",
          description: "确认两块设备都在记录，并自然保持戴表手腕稳定。"
        };
      }
      if (elapsedSeconds < 25) {
        return {
          title: `${first}回答`,
          description: "保持自然对视，尽量在20秒内完成回答。"
        };
      }
      if (elapsedSeconds < 45) {
        return {
          title: `${second}回答`,
          description: "交换回答顺序，继续保持自然对视。"
        };
      }
      if (elapsedSeconds < 55) {
        return {
          title: "等待心率反应",
          description: "回答可以结束，继续自然放松，让设备完成记录。"
        };
      }
      return {
        title: "本轮即将结束",
        description: "保持自然状态，等待进入休息分钟。"
      };
    }

    const taskDuration = isDual()
      ? 25
      : state.gameplay === "question"
        ? 25
        : Math.min(25, Math.max(8, state.currentTask.duration));
    const taskEnd = 5 + taskDuration;

    if (elapsedSeconds < 5) {
      return {
        title: "准备开始",
        description: isDual()
          ? "确认两块设备都在记录，并自然保持戴表手腕稳定。"
          : "确认设备正在记录，并保持戴表手腕自然稳定。"
      };
    }

    if (elapsedSeconds < taskEnd) {
      return {
        title:
          state.gameplay === "action"
            ? isDual()
              ? "完成共同动作"
              : "完成动作"
            : "对视回答",
        description:
          state.gameplay === "action"
            ? "按照题目完成互动，双方均可随时停止。"
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
    const baseRecord = {
      round: state.completed + 1,
      task: state.currentTask.text,
      minute: state.activeMinute
    };

    state.records.push(
      isDual()
        ? {
            ...baseRecord,
            fa: { min: null, max: null, change: null },
            he: { min: null, max: null, change: null },
            combinedChange: null
          }
        : {
            ...baseRecord,
            min: null,
            max: null,
            change: null
          }
    );

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
    elements.dataEntryDescription.textContent = isDual()
      ? "请两个人分别打开自己的健康 App，按网页记录的分钟找到对应数据，并填写各自的最低和最高心率。休息分钟无需填写。"
      : "打开手机健康 App，按网页记录的分钟找到对应数据，将该分钟的最低和最高心率填入下面。休息分钟无需填写。";
    renderHealthEntryCards();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function numberInputHtml(attribute, index, label) {
    return `
      <label class="data-number-label">
        ${label}
        <span>
          <input
            type="number"
            min="30"
            max="240"
            inputmode="numeric"
            ${attribute}="${index}"
          />
          <em>BPM</em>
        </span>
      </label>
    `;
  }

  function renderHealthEntryCards() {
    elements.dataEntryList.innerHTML = "";

    state.records.forEach((record, index) => {
      const card = document.createElement("article");
      card.className = "data-entry-card";

      const heading = `
        <div class="data-entry-copy">
          <span>ROUND ${String(record.round).padStart(2, "0")} · ${record.minute}</span>
          <strong>${record.task}</strong>
          <small>只填写 ${record.minute} 这一实验分钟的数据</small>
        </div>
      `;

      if (isDual()) {
        card.innerHTML = `
          ${heading}
          <div class="dual-entry-grid">
            <section class="dual-player-entry dual-player-entry-pink">
              <strong>法宣阁</strong>
              <div class="dual-number-grid">
                ${numberInputHtml("data-fa-min", index, "最低心率")}
                ${numberInputHtml("data-fa-max", index, "最高心率")}
              </div>
            </section>

            <section class="dual-player-entry dual-player-entry-gold">
              <strong>贺嘉述</strong>
              <div class="dual-number-grid">
                ${numberInputHtml("data-he-min", index, "最低心率")}
                ${numberInputHtml("data-he-max", index, "最高心率")}
              </div>
            </section>
          </div>
        `;
      } else {
        card.innerHTML = `
          ${heading}
          <div class="data-entry-single-grid">
            ${numberInputHtml("data-health-min", index, "最低心率")}
            ${numberInputHtml("data-health-max", index, "最高心率")}
          </div>
        `;
      }

      elements.dataEntryList.appendChild(card);
    });
  }

  function parsePair(minInput, maxInput, round, playerLabel) {
    const minRaw = minInput.value.trim();
    const maxRaw = maxInput.value.trim();

    if (!minRaw && !maxRaw) return null;

    const min = Number(minRaw);
    const max = Number(maxRaw);

    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min < 30 ||
      max > 240 ||
      max < min
    ) {
      showToast(`第${round}轮${playerLabel}的数据有误。`);
      minInput.focus();
      throw new Error("INVALID_HEALTH_INPUT");
    }

    return {
      min: Math.round(min),
      max: Math.round(max),
      change: Math.round(max) - Math.round(min)
    };
  }

  function calculateHealthResults() {
    let validCount = 0;

    state.records.forEach((record, index) => {
      if (isDual()) {
        const fa = parsePair(
          document.querySelector(`[data-fa-min="${index}"]`),
          document.querySelector(`[data-fa-max="${index}"]`),
          record.round,
          "法宣阁"
        );
        const he = parsePair(
          document.querySelector(`[data-he-min="${index}"]`),
          document.querySelector(`[data-he-max="${index}"]`),
          record.round,
          "贺嘉述"
        );

        if ((fa && !he) || (!fa && he)) {
          showToast(`第${record.round}轮请填写两个人的数据，或将整轮留空。`);
          throw new Error("INVALID_HEALTH_INPUT");
        }

        if (!fa && !he) {
          record.fa = { min: null, max: null, change: null };
          record.he = { min: null, max: null, change: null };
          record.combinedChange = null;
          return;
        }

        record.fa = fa;
        record.he = he;
        record.combinedChange = fa.change + he.change;
        validCount += 1;
        return;
      }

      const pair = parsePair(
        document.querySelector(`[data-health-min="${index}"]`),
        document.querySelector(`[data-health-max="${index}"]`),
        record.round,
        ""
      );

      if (!pair) {
        record.min = null;
        record.max = null;
        record.change = null;
        return;
      }

      record.min = pair.min;
      record.max = pair.max;
      record.change = pair.change;
      validCount += 1;
    });

    if (validCount === 0) {
      showToast("请至少填写一轮有效的心率数据。");
      return;
    }

    showResults();
  }

  function highestBy(records, getter) {
    return [...records].sort((a, b) => getter(b) - getter(a))[0];
  }

  function renderSingleResults(validRecords) {
    const highestPeak = highestBy(validRecords, (record) => record.max);
    const largestChange = highestBy(validRecords, (record) => record.change);

    elements.resultSubtitle.textContent =
      `${wearerName()}完成了${validRecords.length}轮有效记录。` +
      (state.recordMode === "health"
        ? "结果按实验分钟的健康数据计算。"
        : "结果按动作前读数与实时观察峰值计算。");

    elements.resultHighlights.innerHTML = `
      <article class="highlight-card highlight-card-pink">
        <span>最高心率瞬间</span>
        <strong>${highestPeak.max} BPM</strong>
        <p>${highestPeak.task}</p>
      </article>
      <article class="highlight-card highlight-card-gold">
        <span>${state.recordMode === "health" ? "最大心率波动" : "最大心率上升"}</span>
        <strong>${largestChange.change >= 0 ? "+" : ""}${largestChange.change} BPM</strong>
        <p>${largestChange.task}</p>
      </article>
    `;

    elements.resultTableHead.innerHTML = `
      <tr>
        <th>轮次</th>
        <th>题目</th>
        <th>${state.recordMode === "health" ? "最低" : "动作前"}</th>
        <th>最高</th>
        <th>${state.recordMode === "health" ? "波动" : "上升"}</th>
      </tr>
    `;

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
  }

  function renderDualResults(validRecords) {
    const faTop = highestBy(validRecords, (record) => record.fa.change);
    const heTop = highestBy(validRecords, (record) => record.he.change);
    const sharedTop = highestBy(
      validRecords,
      (record) => record.combinedChange
    );

    elements.resultSubtitle.textContent =
      `两个人完成了${validRecords.length}轮有效同步记录。共同波动为双方本轮波动值之和，仅用于娱乐性排序。`;

    elements.resultHighlights.innerHTML = `
      <article class="highlight-card highlight-card-pink">
        <span>法宣阁最高波动</span>
        <strong>${faTop.fa.change >= 0 ? "+" : ""}${faTop.fa.change} BPM</strong>
        <p>${faTop.task}</p>
      </article>
      <article class="highlight-card highlight-card-gold">
        <span>贺嘉述最高波动</span>
        <strong>${heTop.he.change >= 0 ? "+" : ""}${heTop.he.change} BPM</strong>
        <p>${heTop.task}</p>
      </article>
      <article class="highlight-card highlight-card-shared">
        <span>共同高反应瞬间</span>
        <strong>${sharedTop.combinedChange >= 0 ? "+" : ""}${sharedTop.combinedChange} BPM</strong>
        <p>${sharedTop.task}</p>
      </article>
    `;

    elements.resultTableHead.innerHTML = `
      <tr>
        <th>轮次</th>
        <th>题目</th>
        <th>法宣阁</th>
        <th>贺嘉述</th>
        <th>共同波动</th>
      </tr>
    `;

    elements.resultTableBody.innerHTML = "";
    validRecords.forEach((record) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>R${String(record.round).padStart(2, "0")}</td>
        <td>${record.task}</td>
        <td>${record.fa.min}—${record.fa.max}<br />+${record.fa.change}</td>
        <td>${record.he.min}—${record.he.max}<br />+${record.he.change}</td>
        <td>+${record.combinedChange} BPM</td>
      `;
      elements.resultTableBody.appendChild(row);
    });
  }

  function showResults() {
    clearTimers();

    const validRecords = state.records.filter((record) =>
      isDual()
        ? Number.isFinite(record.combinedChange)
        : Number.isFinite(record.max) && Number.isFinite(record.change)
    );

    if (validRecords.length === 0) {
      showToast("暂无可用于计算的结果。");
      return;
    }

    elements.playScreen.hidden = true;
    elements.dataEntryScreen.hidden = true;
    elements.resultScreen.hidden = false;

    if (isDual()) {
      renderDualResults(validRecords);
    } else {
      renderSingleResults(validRecords);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startGame() {
    clearTimers();

    state.participantMode =
      getSelectedValue("participantMode") || "single";
    state.gameplay = getSelectedValue("gameplay") || "action";
    state.actionScale = getSelectedValue("actionScale") || "mixed";
    state.recordMode = isDual()
      ? "health"
      : getSelectedValue("recordMode") || "health";
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
    updateSetupOptions();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document
    .querySelectorAll('input[name="participantMode"]')
    .forEach((input) => {
      input.addEventListener("change", updateSetupOptions);
    });

  document.querySelectorAll('input[name="gameplay"]').forEach((input) => {
    input.addEventListener("change", updateSetupOptions);
  });

  elements.startButton.addEventListener("click", startGame);
  elements.restartButton.addEventListener("click", returnToSetup);
  elements.skipButton.addEventListener("click", skipTask);
  elements.prepareRoundButton.addEventListener("click", prepareHealthRound);
  elements.cancelWaitButton.addEventListener("click", cancelHealthWait);
  elements.abortExperimentButton.addEventListener(
    "click",
    abortHealthExperiment
  );
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
      showToast(
        "支持单人反应和双人同步；休息分钟无需关闭心率测量。"
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

  window.addEventListener("beforeunload", clearTimers);

  updateSetupOptions();
})();
