(() => {
  "use strict";

  const bank = window.FAJIA_HEART_RATING_BANK;
  const STORAGE_KEY = "fajia-livegame.heart-rating.completed.v2";
  const STORAGE_VERSION = 2;
  if (!bank) {
    throw new Error("题库未加载，请确认 questions.js 与 app.js 位于同一文件夹。");
  }

  const players = [
    { name: "法宣阁", image: "../../assets/players/fa.webp" },
    { name: "贺嘉述", image: "../../assets/players/he.webp" }
  ];

  const categoryLabels = {
    daily: "日常照顾",
    gesture: "心动小动作",
    live: "相处互动",
    high: "高心动情境",
    mixed: "全部题目"
  };

  const LOW_FREQUENCY_HIGH_IDS = new Set([
    "heart-rating-high-01",
    "heart-rating-high-02",
    "heart-rating-high-05",
    "heart-rating-high-09",
    "heart-rating-high-14"
  ]);

  const modeLabels = {
    camera: "同时说分",
    secret: "秘密打分"
  };

  const state = {
    category: "mixed",
    mode: "camera",
    totalRounds: 10,
    completed: 0,
    skipped: 0,
    queue: [],
    activeQuestion: null,
    records: [],
    firstRater: 0,
    secretPhase: 0,
    secretScores: [null, null],
    selectedSecretScore: null,
    cameraScores: [null, null],
    countdownTimer: null,
    rememberProgress: true,
    persistedCompleted: new Set()
  };

  const $ = (id) => document.getElementById(id);

  const elements = {
    setupScreen: $("setupScreen"),
    playScreen: $("playScreen"),
    resultScreen: $("resultScreen"),
    starterPanel: $("starterPanel"),
    startButton: $("startButton"),
    restartButton: $("restartButton"),
    modePill: $("modePill"),
    roundText: $("roundText"),
    categoryText: $("categoryText"),
    roundProgressBar: $("roundProgressBar"),
    questionCategory: $("questionCategory"),
    questionNumber: $("questionNumber"),
    questionText: $("questionText"),

    cameraStage: $("cameraStage"),
    cameraReady: $("cameraReady"),
    countdownPanel: $("countdownPanel"),
    countdownText: $("countdownText"),
    countdownHint: $("countdownHint"),
    cameraAfter: $("cameraAfter"),
    recordPanel: $("recordPanel"),
    countdownButton: $("countdownButton"),
    cameraSkipButton: $("cameraSkipButton"),
    cameraSkipAfterButton: $("cameraSkipAfterButton"),
    nextWithoutRecordButton: $("nextWithoutRecordButton"),
    openRecordButton: $("openRecordButton"),
    confirmCameraRecordButton: $("confirmCameraRecordButton"),

    secretStage: $("secretStage"),
    secretScorePanel: $("secretScorePanel"),
    currentRaterImage: $("currentRaterImage"),
    currentRaterRole: $("currentRaterRole"),
    currentRaterName: $("currentRaterName"),
    secretPrompt: $("secretPrompt"),
    secretScoreButtons: $("secretScoreButtons"),
    secretSkipButton: $("secretSkipButton"),
    lockSecretScoreButton: $("lockSecretScoreButton"),
    handoverPanel: $("handoverPanel"),
    handoverCopy: $("handoverCopy"),
    continueSecretButton: $("continueSecretButton"),

    revealPanel: $("revealPanel"),
    faRevealScore: $("faRevealScore"),
    heRevealScore: $("heRevealScore"),
    differenceScore: $("differenceScore"),
    revealCopy: $("revealCopy"),
    revealGuide: $("revealGuide"),
    revealNextButton: $("revealNextButton"),

    resultBadge: $("resultBadge"),
    resultDescription: $("resultDescription"),
    resultCompleted: $("resultCompleted"),
    resultRecorded: $("resultRecorded"),
    resultExact: $("resultExact"),
    resultAverageGap: $("resultAverageGap"),
    topBehaviorBox: $("topBehaviorBox"),
    topBehaviorText: $("topBehaviorText"),
    resultNote: $("resultNote"),
    playAgainButton: $("playAgainButton"),
    rememberProgressCheckbox: $("rememberProgressCheckbox"),
    progressTotalCount: $("progressTotalCount"),
    progressCompletedCount: $("progressCompletedCount"),
    progressRemainingCount: $("progressRemainingCount"),
    progressNote: $("progressNote"),
    clearScopeProgressButton: $("clearScopeProgressButton"),
    clearAllProgressButton: $("clearAllProgressButton"),

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
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2500);
  }

  function buildFullPool(category = state.category) {
    const entries =
      category === "mixed"
        ? Object.entries(bank)
        : [[category, bank[category]]];

    return entries.flatMap(([group, questions]) =>
      questions.map((text, index) => ({
        category: group,
        text,
        id: `heart-rating-${group}-${String(index + 1).padStart(2, "0")}`
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

  function selectedCategory() {
    return "mixed";
  }

  function updateProgressPreview() {
    const category = selectedCategory();
    const fullPool = buildFullPool(category);
    const persisted = loadPersistedCompleted();
    const remember = elements.rememberProgressCheckbox.checked;
    const completed = fullPool.filter((question) =>
      persisted.has(question.id)
    ).length;
    const remaining = remember ? fullPool.length - completed : fullPool.length;

    elements.progressTotalCount.textContent = `${fullPool.length}题`;
    elements.progressCompletedCount.textContent = remember ? `${completed}题` : "不读取";
    elements.progressRemainingCount.textContent = `${remaining}题`;
    elements.progressNote.textContent = remember
      ? "完成本题并进入下一题后才写入进度；跳过题目下次仍可能出现。"
      : "本场不读取或写入长期进度，但同一局会尽量避免立即重复。";
    elements.clearScopeProgressButton.disabled = completed === 0;
    elements.clearAllProgressButton.disabled = persisted.size === 0;
  }

  function buildPool() {
    return buildFullPool().filter((question) =>
      !state.rememberProgress || !state.persistedCompleted.has(question.id)
    );
  }

  function pickHeartRatingQuestion(candidates) {
    const lowFrequency = candidates.filter(
      (question) => LOW_FREQUENCY_HIGH_IDS.has(question.id)
    );
    const preferred = candidates.filter(
      (question) => !LOW_FREQUENCY_HIGH_IDS.has(question.id)
    );

    if (lowFrequency.length && Math.random() < 0.20) {
      return lowFrequency[Math.floor(Math.random() * lowFrequency.length)];
    }

    const source = preferred.length ? preferred : lowFrequency;
    return source[Math.floor(Math.random() * source.length)];
  }

  function recommendedPlan(count) {
    const pattern = [
      "daily", "live", "gesture", "daily", "high",
      "gesture", "live", "daily", "gesture", "high",
      "daily", "live", "gesture", "daily", "high"
    ];
    return pattern.slice(0, count);
  }

  function buildRecommendedQueue(pool, count) {
    const plan = recommendedPlan(count);
    const remaining = [...pool];
    const selected = [];

    for (let index = 0; index < count; index += 1) {
      const desired = plan[index % plan.length];
      let candidates = remaining.filter((question) => question.category === desired);
      if (!candidates.length) candidates = remaining;
      if (!candidates.length) break;

      const picked = pickHeartRatingQuestion(candidates);
      selected.push(picked);
      remaining.splice(
        remaining.findIndex((question) => question.id === picked.id),
        1
      );
    }

    return [...selected, ...shuffle(remaining)];
  }

  function prepareQueue() {
    const pool = buildPool();
    if (pool.length === 0) return false;
    state.totalRounds = Math.min(state.totalRounds, pool.length);
    state.queue = buildRecommendedQueue(pool, state.totalRounds);
    return true;
  }

  function takeQuestion() {
    if (state.queue.length === 0) {
      state.queue = shuffle(buildPool());
      showToast("当前未完成题目已轮过一遍，现已重新洗牌。");
    }
    state.activeQuestion = state.queue.shift();
  }

  function clearCountdown() {
    if (state.countdownTimer !== null) {
      clearInterval(state.countdownTimer);
      state.countdownTimer = null;
    }
  }

  function createScoreButtons(container, onSelect) {
    container.innerHTML = "";
    for (let score = 0; score <= 10; score += 1) {
      const button = document.createElement("button");
      button.className = "score-button";
      button.type = "button";
      button.textContent = String(score);
      button.dataset.score = String(score);
      button.addEventListener("click", () => {
        container.querySelectorAll(".score-button").forEach((item) => {
          item.classList.toggle("is-selected", item === button);
        });
        onSelect(score);
      });
      container.appendChild(button);
    }
  }

  function clearSelectedButtons(container) {
    container.querySelectorAll(".score-button").forEach((button) => {
      button.classList.remove("is-selected");
    });
  }

  function initializeScoreButtons() {
    document.querySelectorAll("[data-score-group]").forEach((container) => {
      const group = container.dataset.scoreGroup;
      createScoreButtons(container, (score) => {
        if (group === "camera-fa") state.cameraScores[0] = score;
        if (group === "camera-he") state.cameraScores[1] = score;
        elements.confirmCameraRecordButton.disabled =
          state.cameraScores.some((value) => value === null);
      });
    });

    createScoreButtons(elements.secretScoreButtons, (score) => {
      state.selectedSecretScore = score;
      elements.lockSecretScoreButton.disabled = false;
    });
  }

  function updateSetupMode() {
    const mode = getSelectedValue("mode") || "camera";
    elements.starterPanel.hidden = mode !== "secret";
  }

  function updateHeader() {
    elements.modePill.textContent = "同时打分";
    elements.roundText.textContent =
      `第 ${state.completed + 1} / ${state.totalRounds} 题`;
    elements.categoryText.textContent = "本轮题目";
    elements.roundProgressBar.style.width =
      `${(state.completed / state.totalRounds) * 100}%`;
  }

  function updateQuestion() {
    if (!state.activeQuestion) takeQuestion();
    elements.questionCategory.textContent =
      categoryLabels[state.activeQuestion.category];
    elements.questionNumber.textContent =
      `CARD ${String(state.completed + 1).padStart(2, "0")}`;
    elements.questionText.textContent = state.activeQuestion.text;
    updateHeader();
  }

  function hidePlayStages() {
    elements.cameraStage.hidden = true;
    elements.secretStage.hidden = true;
    elements.revealPanel.hidden = true;
  }

  function resetCameraStage() {
    clearCountdown();
    elements.cameraStage.hidden = false;
    elements.cameraReady.hidden = false;
    elements.countdownPanel.hidden = true;
    elements.cameraAfter.hidden = true;
    elements.recordPanel.hidden = true;
    elements.countdownText.textContent = "3";
    elements.countdownHint.textContent = "准备同时说出0—10分";
    state.cameraScores = [null, null];
    elements.confirmCameraRecordButton.disabled = true;
    document.querySelectorAll("[data-score-group]").forEach(clearSelectedButtons);
  }

  function currentRaterIndex() {
    return state.secretPhase === 0
      ? state.firstRater
      : (state.firstRater + 1) % 2;
  }

  function resetSecretStage() {
    elements.secretStage.hidden = false;
    elements.secretScorePanel.hidden = false;
    elements.handoverPanel.hidden = true;
    state.secretPhase = 0;
    state.secretScores = [null, null];
    state.selectedSecretScore = null;
    elements.lockSecretScoreButton.disabled = true;
    clearSelectedButtons(elements.secretScoreButtons);
    renderSecretRater();
  }

  function renderSecretRater() {
    const raterIndex = currentRaterIndex();
    const otherIndex = (raterIndex + 1) % 2;
    elements.currentRaterImage.src = players[raterIndex].image;
    elements.currentRaterImage.alt = players[raterIndex].name;
    elements.currentRaterRole.textContent =
      state.secretPhase === 0 ? "第一位评分者" : "第二位评分者";
    elements.currentRaterName.textContent = players[raterIndex].name;
    elements.secretPrompt.textContent =
      `请${players[otherIndex].name}暂时不要看屏幕`;
    state.selectedSecretScore = null;
    elements.lockSecretScoreButton.disabled = true;
    clearSelectedButtons(elements.secretScoreButtons);
  }

  function renderRound() {
    hidePlayStages();
    updateQuestion();

    if (state.mode === "camera") {
      resetCameraStage();
    } else {
      resetSecretStage();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startCountdown() {
    elements.cameraReady.hidden = true;
    elements.countdownPanel.hidden = false;

    let count = 3;
    elements.countdownText.textContent = String(count);
    elements.countdownHint.textContent = "准备同时说出0—10分";

    clearCountdown();
    state.countdownTimer = setInterval(() => {
      count -= 1;

      if (count > 0) {
        elements.countdownText.textContent = String(count);
        return;
      }

      clearCountdown();
      elements.countdownText.textContent = "说！";
      elements.countdownHint.textContent = "同时说出0—10分";

      setTimeout(() => {
        elements.countdownPanel.hidden = true;
        elements.cameraAfter.hidden = false;
      }, 650);
    }, 900);
  }

  function skipQuestion() {
    clearCountdown();
    state.skipped += 1;
    if (state.activeQuestion) {
      state.queue.push(state.activeQuestion);
    }
    state.activeQuestion = null;
    showToast("本题已跳过，不占用所选题数。");
    renderRound();
  }

  function getRevealCopy(gap) {
    if (gap === 0) return "完全同分，心动刻度刚好重合。";
    if (gap === 1) return "只差1分，心动频道高度同步。";
    if (gap === 2) return "相差2分，同一个方向、不同一点强度。";
    if (gap <= 4) return "分数有一点层次，正适合聊聊为什么。";
    return "反差分数很有节目效果，也许理由更精彩。";
  }

  function getRevealGuide(scores) {
    const [faScore, heScore] = scores;
    const gap = Math.abs(faScore - heScore);
    const bothHigh = faScore >= 9 && heScore >= 9;
    const oneHigh = faScore >= 9 || heScore >= 9;

    if (bothHigh) {
      return {
        text: "双方高心动：请各自说出这个情境里最戳自己的具体细节。",
        high: true
      };
    }
    if (gap >= 2) {
      return {
        text: "本题出现明显分差：请两个人分别解释为什么会打出这个分数。",
        high: false
      };
    }
    if (oneHigh) {
      return {
        text: "有人打出9分以上：请说出这个情境中最心动的具体细节。",
        high: true
      };
    }
    return {
      text: "分数很接近：可以说说你们想到的是不是同一个画面。",
      high: false
    };
  }

  function saveRecord(scores) {
    const [faScore, heScore] = scores;
    state.records.push({
      question: state.activeQuestion.text,
      category: state.activeQuestion.category,
      faScore,
      heScore,
      gap: Math.abs(faScore - heScore),
      average: (faScore + heScore) / 2
    });
  }

  function showReveal(scores) {
    hidePlayStages();
    const [faScore, heScore] = scores;
    const gap = Math.abs(faScore - heScore);

    elements.faRevealScore.textContent = String(faScore);
    elements.heRevealScore.textContent = String(heScore);
    elements.differenceScore.textContent = String(gap);
    elements.revealCopy.textContent = getRevealCopy(gap);
    const guide = getRevealGuide(scores);
    elements.revealGuide.textContent = guide.text;
    elements.revealGuide.classList.toggle("is-high", guide.high);
    elements.revealPanel.hidden = false;
  }

  function completeWithoutRecord() {
    finishFormalRound();
  }

  function confirmCameraRecord() {
    if (state.cameraScores.some((score) => score === null)) return;
    saveRecord(state.cameraScores);
    showReveal(state.cameraScores);
  }

  function lockSecretScore() {
    if (state.selectedSecretScore === null) return;

    const raterIndex = currentRaterIndex();
    state.secretScores[raterIndex] = state.selectedSecretScore;

    if (state.secretPhase === 0) {
      state.secretPhase = 1;
      elements.secretScorePanel.hidden = true;
      elements.handoverPanel.hidden = false;
      elements.handoverCopy.textContent =
        `请把屏幕交给${players[currentRaterIndex()].name}。`;
      return;
    }

    saveRecord(state.secretScores);
    showReveal(state.secretScores);
  }

  function continueSecret() {
    elements.handoverPanel.hidden = true;
    elements.secretScorePanel.hidden = false;
    renderSecretRater();
  }

  function finishFormalRound() {
    markQuestionCompleted(state.activeQuestion);
    state.completed += 1;
    state.activeQuestion = null;

    if (state.mode === "secret") {
      state.firstRater = (state.firstRater + 1) % 2;
    }

    if (state.completed >= state.totalRounds) {
      showResults();
    } else {
      renderRound();
    }
  }

  function resultCopy(records) {
    if (records.length === 0) {
      return {
        badge: "同声打分完成",
        description:
          "这一局专注于两个人的即时反应，没有记录分数，也不会留下任何答题数据。"
      };
    }

    const avgGap =
      records.reduce((sum, item) => sum + item.gap, 0) / records.length;

    if (avgGap === 0) {
      return {
        badge: "心动刻度完全重合",
        description: "所有已记录题目都打出了相同分数，频道精确到个位数。"
      };
    }
    if (avgGap <= 1) {
      return {
        badge: "心动频道高度同步",
        description: "大多数分数几乎重合，感受强度非常接近。"
      };
    }
    if (avgGap <= 2) {
      return {
        badge: "同一个方向，一点点差异",
        description: "对题目的整体感受相近，只是在心动程度上各有一点层次。"
      };
    }
    if (avgGap <= 3.5) {
      return {
        badge: "心动程度各有层次",
        description: "有同频，也有反差，每一道题都留下了可以继续聊的空间。"
      };
    }
    return {
      badge: "反差分数很有节目效果",
      description: "分数不一定接近，但不同理由可能正是这一局最精彩的部分。"
    };
  }

  function showResults() {
    clearCountdown();
    elements.playScreen.hidden = true;
    elements.resultScreen.hidden = false;

    const records = state.records;
    const copy = resultCopy(records);
    const exact = records.filter((item) => item.gap === 0).length;
    const avgGap = records.length
      ? records.reduce((sum, item) => sum + item.gap, 0) / records.length
      : null;
    const top = records.length
      ? [...records].sort((a, b) => b.average - a.average)[0]
      : null;

    elements.resultBadge.textContent = copy.badge;
    elements.resultDescription.textContent = copy.description;
    elements.resultCompleted.textContent = String(state.completed);
    elements.resultRecorded.textContent = String(records.length);
    elements.resultExact.textContent = String(exact);
    elements.resultAverageGap.textContent =
      avgGap === null ? "—" : `${avgGap.toFixed(1)}分`;

    elements.topBehaviorBox.hidden = !top;
    elements.topBehaviorText.textContent = top ? top.question : "—";

    if (state.mode === "camera" && records.length < state.completed) {
      elements.resultNote.textContent =
        `同时说分过程中有${state.completed - records.length}题选择了不记录分数。`;
    } else {
      elements.resultNote.textContent =
        state.skipped > 0
          ? `本局共跳过${state.skipped}次，跳过题目未占用正式题数。`
          : "本局没有跳过题目。";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startGame() {
    state.category = "mixed";
    state.mode = "camera";
    state.totalRounds = Number(getSelectedValue("rounds") || 10);
    state.rememberProgress = elements.rememberProgressCheckbox.checked;
    state.persistedCompleted = loadPersistedCompleted();
    state.completed = 0;
    state.skipped = 0;
    state.activeQuestion = null;
    state.records = [];
    state.secretPhase = 0;
    state.secretScores = [null, null];
    state.cameraScores = [null, null];

    state.firstRater = 0;

    if (!prepareQueue()) {
      showToast("题库已经全部完成，请先清除进度。");
      return;
    }

    elements.setupScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.playScreen.hidden = false;
    renderRound();
  }

  function returnToSetup() {
    clearCountdown();
    elements.playScreen.hidden = true;
    elements.resultScreen.hidden = true;
    elements.setupScreen.hidden = false;
    updateProgressPreview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearScopeProgress() {
    const fullPool = buildFullPool(selectedCategory());
    const ids = new Set(fullPool.map((question) => question.id));
    const persisted = loadPersistedCompleted();
    const removed = [...persisted].filter((id) => ids.has(id)).length;

    if (removed === 0) {
      showToast("当前题目范围没有已完成进度。");
      return;
    }

    const confirmed = window.confirm(
      `确定清除当前范围内${removed}道已完成题目的记录吗？`
    );
    if (!confirmed) return;

    ids.forEach((id) => persisted.delete(id));
    state.persistedCompleted = persisted;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: STORAGE_VERSION,
          completed: [...persisted],
          updatedAt: new Date().toISOString()
        })
      );
    } catch (error) {
      showToast("浏览器未能清除进度，请检查网站数据设置。");
      return;
    }

    updateProgressPreview();
    showToast("当前题目范围进度已清除。");
  }

  function clearAllProgress() {
    const persisted = loadPersistedCompleted();
    if (persisted.size === 0) {
      showToast("目前没有已保存的心动值进度。");
      return;
    }

    const confirmed = window.confirm(
      `确定清除全部${persisted.size}道已完成题目的记录吗？`
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
    showToast("全部心动值题库进度已清除。");
  }

  document.querySelectorAll('input[name="mode"]').forEach((input) => {
    input.addEventListener("change", updateSetupMode);
  });

  elements.startButton.addEventListener("click", startGame);
  elements.restartButton.addEventListener("click", returnToSetup);
  elements.countdownButton.addEventListener("click", startCountdown);
  elements.cameraSkipButton.addEventListener("click", skipQuestion);
  elements.cameraSkipAfterButton.addEventListener("click", skipQuestion);
  elements.nextWithoutRecordButton.addEventListener("click", completeWithoutRecord);
  elements.openRecordButton.addEventListener("click", () => {
    elements.cameraAfter.hidden = true;
    elements.recordPanel.hidden = false;
  });
  elements.confirmCameraRecordButton.addEventListener("click", confirmCameraRecord);
  elements.secretSkipButton.addEventListener("click", skipQuestion);
  elements.lockSecretScoreButton.addEventListener("click", lockSecretScore);
  elements.continueSecretButton.addEventListener("click", continueSecret);
  elements.revealNextButton.addEventListener("click", finishFormalRound);
  elements.playAgainButton.addEventListener("click", returnToSetup);

  document.querySelectorAll('input[name="category"]').forEach((input) => {
    input.addEventListener("change", updateProgressPreview);
  });
  document.querySelectorAll('input[name="rounds"]').forEach((input) => {
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

  elements.openHelpButton.addEventListener("click", () => {
    if (typeof elements.helpDialog.showModal === "function") {
      elements.helpDialog.showModal();
    } else {
      showToast("倒计时结束后同时说出0—10分，记录分数后再分别说明理由。");
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

  window.addEventListener("beforeunload", clearCountdown);

  initializeScoreButtons();
  updateSetupMode();
  updateProgressPreview();
})();
