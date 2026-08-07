(() => {
  "use strict";

  const exam = window.FAJIA_MOCK_EXAM;
  const STORAGE_KEY = "fajia-livegame.mock-exam-01.progress.v1";

  if (!exam || !Array.isArray(exam.sections)) {
    throw new Error("模拟测试卷数据未加载。");
  }

  const questions = exam.sections.flatMap((section) =>
    section.questions.map((question, sectionIndex) => ({
      ...question,
      sectionId: section.id,
      sectionTitle: section.title,
      sectionInstruction: section.instruction,
      sectionIndex,
      sectionQuestionIndex: section.questions.indexOf(question),
      sectionQuestionCount: section.questions.length
    }))
  );

  const defaultState = () => ({
    phase: "intro",
    questionIndex: 0,
    answerMode: "direct",
    completedQuestionIds: [],
    skippedQuestionIds: [],
    vlogCompletedIds: [],
    oathCompleted: false
  });

  let state = loadState();
  let toastTimer;
  let hiddenAnswerSession = null;

  const elements = {
    introScreen: document.getElementById("introScreen"),
    quizScreen: document.getElementById("quizScreen"),
    questionSummaryScreen: document.getElementById("questionSummaryScreen"),
    vlogScreen: document.getElementById("vlogScreen"),
    oathScreen: document.getElementById("oathScreen"),
    completeScreen: document.getElementById("completeScreen"),
    startButton: document.getElementById("startButton"),
    resumeNote: document.getElementById("resumeNote"),
    answerModeDirect: document.getElementById("answerModeDirect"),
    answerModeReveal: document.getElementById("answerModeReveal"),
    globalProgressText: document.getElementById("globalProgressText"),
    sectionProgressText: document.getElementById("sectionProgressText"),
    progressBar: document.getElementById("progressBar"),
    questionSection: document.getElementById("questionSection"),
    questionInstruction: document.getElementById("questionInstruction"),
    questionNumber: document.getElementById("questionNumber"),
    questionText: document.getElementById("questionText"),
    blindStageBanner: document.getElementById("blindStageBanner"),
    blindStageTitle: document.getElementById("blindStageTitle"),
    blindStageText: document.getElementById("blindStageText"),
    answerArea: document.getElementById("answerArea"),
    liveAnswerTip: document.getElementById("liveAnswerTip"),
    answerPrivacy: document.getElementById("answerPrivacy"),
    previousButton: document.getElementById("previousButton"),
    skipButton: document.getElementById("skipButton"),
    completeQuestionButton: document.getElementById("completeQuestionButton"),
    answeredCount: document.getElementById("answeredCount"),
    skippedCount: document.getElementById("skippedCount"),
    punishmentCard: document.getElementById("punishmentCard"),
    reviewSkippedButton: document.getElementById("reviewSkippedButton"),
    enterVlogButton: document.getElementById("enterVlogButton"),
    vlogSubtitle: document.getElementById("vlogSubtitle"),
    vlogProgressText: document.getElementById("vlogProgressText"),
    vlogList: document.getElementById("vlogList"),
    backToSummaryButton: document.getElementById("backToSummaryButton"),
    enterOathButton: document.getElementById("enterOathButton"),
    oathQuote: document.getElementById("oathQuote"),
    finishOathButton: document.getElementById("finishOathButton"),
    reviewVlogButton: document.getElementById("reviewVlogButton"),
    restartExamButton: document.getElementById("restartExamButton"),
    clearProgressHeaderButton: document.getElementById("clearProgressHeaderButton"),
    clearDialog: document.getElementById("clearDialog"),
    cancelClearButton: document.getElementById("cancelClearButton"),
    confirmClearButton: document.getElementById("confirmClearButton"),
    toast: document.getElementById("toast")
  };

  function normalizeState(candidate) {
    const normalized = defaultState();
    if (!candidate || typeof candidate !== "object") return normalized;

    const phases = new Set([
      "intro",
      "quiz",
      "summary",
      "vlog",
      "oath",
      "complete"
    ]);

    normalized.phase = phases.has(candidate.phase) ? candidate.phase : "intro";
    normalized.questionIndex = Number.isInteger(candidate.questionIndex)
      ? Math.min(Math.max(candidate.questionIndex, 0), questions.length - 1)
      : 0;
    normalized.answerMode =
      candidate.answerMode === "reveal" ? "reveal" : "direct";

    for (const key of [
      "completedQuestionIds",
      "skippedQuestionIds",
      "vlogCompletedIds"
    ]) {
      normalized[key] = Array.isArray(candidate[key])
        ? [...new Set(candidate[key].filter((item) => typeof item === "string"))]
        : [];
    }

    normalized.oathCompleted = Boolean(candidate.oathCompleted);
    return normalized;
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : defaultState();
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      showToast("浏览器暂时无法保存进度，本次仍可继续。");
    }
  }

  function clearHiddenAnswerSession() {
    hiddenAnswerSession = null;
  }

  function clearStoredState() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The in-memory reset below still works.
    }
    state = defaultState();
    clearHiddenAnswerSession();
    render();
    showToast("答卷进度已清除。");
  }

  function hasProgress() {
    return (
      state.phase !== "intro" ||
      state.completedQuestionIds.length > 0 ||
      state.skippedQuestionIds.length > 0 ||
      state.vlogCompletedIds.length > 0 ||
      state.oathCompleted
    );
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2500);
  }

  function showOnly(screen) {
    [
      elements.introScreen,
      elements.quizScreen,
      elements.questionSummaryScreen,
      elements.vlogScreen,
      elements.oathScreen,
      elements.completeScreen
    ].forEach((item) => {
      item.hidden = item !== screen;
    });
  }

  function setPhase(phase) {
    state.phase = phase;
    clearHiddenAnswerSession();
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function replaceId(list, id, shouldContain) {
    const set = new Set(list);
    if (shouldContain) {
      set.add(id);
    } else {
      set.delete(id);
    }
    return [...set];
  }

  function selectedAnswerMode() {
    return document.querySelector('input[name="answerMode"]:checked')?.value === "reveal"
      ? "reveal"
      : "direct";
  }

  function renderIntro() {
    showOnly(elements.introScreen);
    const resume = hasProgress();
    elements.resumeNote.hidden = !resume;
    elements.startButton.firstChild.textContent = resume
      ? "继续答卷 "
      : "开始答卷 ";

    elements.answerModeDirect.checked = state.answerMode !== "reveal";
    elements.answerModeReveal.checked = state.answerMode === "reveal";
  }

  function createOptionButton(option, singleSelect) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    button.setAttribute("aria-pressed", "false");
    button.dataset.answerValue = option;
    button.textContent = option;

    button.addEventListener("click", () => {
      if (singleSelect) {
        elements.answerArea.querySelectorAll(".option-button").forEach((item) => {
          item.setAttribute("aria-pressed", String(item === button));
        });
      } else {
        button.setAttribute(
          "aria-pressed",
          button.getAttribute("aria-pressed") === "true" ? "false" : "true"
        );
      }
    });

    return button;
  }

  function renderDirectAnswerArea(question) {
    elements.answerArea.innerHTML = "";

    if (Array.isArray(question.options)) {
      question.options.forEach((option) => {
        elements.answerArea.appendChild(createOptionButton(option, false));
      });
      return;
    }

    if (question.sectionId === "yes-no") {
      const grid = document.createElement("div");
      grid.className = "yes-no-grid";

      ["是 / 会", "否 / 不会"].forEach((label) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "yes-no-button";
        button.setAttribute("aria-pressed", "false");
        button.dataset.answerValue = label;
        button.textContent = label;
        button.addEventListener("click", () => {
          grid.querySelectorAll("button").forEach((item) => {
            item.setAttribute("aria-pressed", String(item === button));
          });
        });
        grid.appendChild(button);
      });

      elements.answerArea.appendChild(grid);
      return;
    }

    const prompt = document.createElement("div");
    prompt.className = "short-answer-prompt";
    prompt.textContent = "请两个人现场展开回答或举例。";
    elements.answerArea.appendChild(prompt);
  }

  function respondentOrder(questionIndex) {
    return questionIndex % 2 === 0
      ? ["法宣阁", "贺嘉述"]
      : ["贺嘉述", "法宣阁"];
  }

  function ensureHiddenAnswerSession(question) {
    if (
      hiddenAnswerSession &&
      hiddenAnswerSession.questionId === question.id
    ) {
      return;
    }

    hiddenAnswerSession = {
      questionId: question.id,
      respondents: respondentOrder(state.questionIndex),
      stage: 0,
      answers: {}
    };
  }

  function currentRespondent() {
    if (!hiddenAnswerSession) return "";
    return hiddenAnswerSession.respondents[Math.min(hiddenAnswerSession.stage, 1)];
  }

  function renderRevealInput(question) {
    elements.answerArea.innerHTML = "";
    const person = currentRespondent();

    if (Array.isArray(question.options)) {
      question.options.forEach((option) => {
        elements.answerArea.appendChild(createOptionButton(option, true));
      });

      if (question.options.some((option) => option.includes("其他"))) {
        const detail = document.createElement("input");
        detail.type = "text";
        detail.className = "other-answer-input";
        detail.id = "otherAnswerInput";
        detail.placeholder = `${person}如果选择“其他”，可以在这里补充`;
        detail.autocomplete = "off";
        elements.answerArea.appendChild(detail);
      }
      return;
    }

    if (question.sectionId === "yes-no") {
      const grid = document.createElement("div");
      grid.className = "yes-no-grid";

      ["是 / 会", "否 / 不会"].forEach((label) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "yes-no-button";
        button.setAttribute("aria-pressed", "false");
        button.dataset.answerValue = label;
        button.textContent = label;
        button.addEventListener("click", () => {
          grid.querySelectorAll("button").forEach((item) => {
            item.setAttribute("aria-pressed", String(item === button));
          });
        });
        grid.appendChild(button);
      });

      elements.answerArea.appendChild(grid);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.className = "blind-short-answer";
    textarea.id = "blindShortAnswer";
    textarea.rows = 5;
    textarea.placeholder = `${person}在这里输入答案；锁定后会立即隐藏。`;
    textarea.autocomplete = "off";
    elements.answerArea.appendChild(textarea);
  }

  function captureRevealAnswer(question) {
    if (Array.isArray(question.options)) {
      const selected = elements.answerArea.querySelector(
        '.option-button[aria-pressed="true"]'
      );
      if (!selected) return "";

      let value = selected.dataset.answerValue || selected.textContent.trim();
      const detail = elements.answerArea.querySelector("#otherAnswerInput");
      if (detail && detail.value.trim() && value.includes("其他")) {
        value += `：${detail.value.trim()}`;
      }
      return value;
    }

    if (question.sectionId === "yes-no") {
      const selected = elements.answerArea.querySelector(
        '.yes-no-button[aria-pressed="true"]'
      );
      return selected
        ? selected.dataset.answerValue || selected.textContent.trim()
        : "";
    }

    return elements.answerArea.querySelector("#blindShortAnswer")?.value.trim() || "";
  }

  function renderRevealResult() {
    elements.answerArea.innerHTML = "";

    const reveal = document.createElement("div");
    reveal.className = "answer-reveal-grid";

    ["法宣阁", "贺嘉述"].forEach((person) => {
      const card = document.createElement("article");
      card.className = `answer-reveal-card ${
        person === "法宣阁" ? "answer-reveal-fa" : "answer-reveal-he"
      }`;

      const label = document.createElement("span");
      label.textContent = person;

      const answer = document.createElement("strong");
      answer.textContent = hiddenAnswerSession.answers[person] || "—";

      card.append(label, answer);
      reveal.appendChild(card);
    });

    elements.answerArea.appendChild(reveal);
  }

  function renderRevealMode(question) {
    ensureHiddenAnswerSession(question);
    elements.blindStageBanner.hidden = false;
    elements.liveAnswerTip.hidden = true;
    elements.answerPrivacy.textContent =
      "本题答案只在当前页面临时保留到揭晓，不写入浏览器记录；刷新页面后会清除。";

    if (hiddenAnswerSession.stage < 2) {
      const person = currentRespondent();
      const other = hiddenAnswerSession.respondents[hiddenAnswerSession.stage === 0 ? 1 : 0];

      elements.blindStageTitle.textContent =
        hiddenAnswerSession.stage === 0
          ? `本题先答：${person}`
          : `${person}作答`;
      elements.blindStageText.textContent =
        hiddenAnswerSession.stage === 0
          ? `答完后点击“锁定并隐藏”，再交给${other}。`
          : `${hiddenAnswerSession.respondents[0]}的答案已经隐藏。答完后一起公布。`;

      renderRevealInput(question);

      elements.completeQuestionButton.firstChild.textContent =
        hiddenAnswerSession.stage === 0
          ? "锁定并隐藏 "
          : "锁定并公布答案 ";
      elements.previousButton.disabled =
        state.questionIndex === 0 || hiddenAnswerSession.stage > 0;
      return;
    }

    elements.blindStageTitle.textContent = "两个人都答完了";
    elements.blindStageText.textContent = "现在一起看答案。";
    renderRevealResult();
    elements.completeQuestionButton.firstChild.textContent = "看下一题 ";
    elements.previousButton.disabled = state.questionIndex === 0;
  }

  function renderQuiz() {
    showOnly(elements.quizScreen);
    const question = questions[state.questionIndex];

    elements.globalProgressText.textContent =
      `问答 ${state.questionIndex + 1} / ${questions.length}`;
    elements.sectionProgressText.textContent =
      `${question.sectionTitle} ${question.sectionQuestionIndex + 1} / ${question.sectionQuestionCount}`;
    elements.progressBar.style.width =
      `${((state.questionIndex + 1) / questions.length) * 100}%`;
    elements.questionSection.textContent = question.sectionTitle;
    elements.questionInstruction.textContent = question.sectionInstruction;
    elements.questionNumber.textContent =
      String(state.questionIndex + 1).padStart(2, "0");
    elements.questionText.textContent = question.text;

    if (state.answerMode === "reveal") {
      renderRevealMode(question);
    } else {
      clearHiddenAnswerSession();
      elements.blindStageBanner.hidden = true;
      elements.liveAnswerTip.hidden = false;
      elements.liveAnswerTip.textContent = "两个人直接在直播间说出答案。";
      elements.answerPrivacy.textContent =
        "本题的具体答案不会写入浏览器记录。";
      elements.previousButton.disabled = state.questionIndex === 0;
      elements.completeQuestionButton.firstChild.textContent =
        "两个人都回答完了 ";
      renderDirectAnswerArea(question);
    }

    window.requestAnimationFrame(() => {
      elements.questionText.focus({ preventScroll: true });
    });
  }

  function markCurrentQuestionCompleted() {
    const question = questions[state.questionIndex];
    state.completedQuestionIds = replaceId(
      state.completedQuestionIds,
      question.id,
      true
    );
    state.skippedQuestionIds = replaceId(
      state.skippedQuestionIds,
      question.id,
      false
    );
  }

  function advanceAfterQuestion() {
    clearHiddenAnswerSession();
    if (state.questionIndex >= questions.length - 1) {
      state.phase = "summary";
    } else {
      state.questionIndex += 1;
    }
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function completeCurrentQuestion() {
    const question = questions[state.questionIndex];

    if (state.answerMode !== "reveal") {
      markCurrentQuestionCompleted();
      advanceAfterQuestion();
      return;
    }

    ensureHiddenAnswerSession(question);

    if (hiddenAnswerSession.stage < 2) {
      const answer = captureRevealAnswer(question);
      if (!answer) {
        showToast("先完成当前答案，再继续。");
        return;
      }

      const person = currentRespondent();
      hiddenAnswerSession.answers[person] = answer;
      hiddenAnswerSession.stage += 1;
      renderQuiz();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    markCurrentQuestionCompleted();
    advanceAfterQuestion();
  }

  function skipCurrentQuestion() {
    const question = questions[state.questionIndex];
    state.skippedQuestionIds = replaceId(
      state.skippedQuestionIds,
      question.id,
      true
    );
    state.completedQuestionIds = replaceId(
      state.completedQuestionIds,
      question.id,
      false
    );
    advanceAfterQuestion();
  }

  function renderSummary() {
    showOnly(elements.questionSummaryScreen);
    elements.answeredCount.textContent =
      String(state.completedQuestionIds.length);
    elements.skippedCount.textContent =
      String(state.skippedQuestionIds.length);
    elements.punishmentCard.hidden =
      state.skippedQuestionIds.length === 0;
    elements.reviewSkippedButton.hidden =
      state.skippedQuestionIds.length === 0;
  }

  function reviewFirstSkipped() {
    const index = questions.findIndex((question) =>
      state.skippedQuestionIds.includes(question.id)
    );

    if (index < 0) {
      showToast("目前没有跳过的题目。");
      return;
    }

    state.questionIndex = index;
    state.phase = "quiz";
    clearHiddenAnswerSession();
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderVlog() {
    showOnly(elements.vlogScreen);
    elements.vlogSubtitle.textContent = exam.vlog.subtitle;
    elements.vlogList.innerHTML = "";

    exam.vlog.items.forEach((item, index) => {
      const article = document.createElement("article");
      article.className = "vlog-item";

      const heading = document.createElement("div");
      heading.className = "vlog-item-heading";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "vlog-check";
      checkbox.checked = state.vlogCompletedIds.includes(item.id);
      checkbox.setAttribute("aria-label", `标记完成：${item.title}`);
      checkbox.addEventListener("change", () => {
        state.vlogCompletedIds = replaceId(
          state.vlogCompletedIds,
          item.id,
          checkbox.checked
        );
        saveState();
        updateVlogProgress();
      });

      const title = document.createElement("h2");
      title.className = "vlog-item-title";
      title.textContent = `${index + 1}. ${item.title}`;

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "vlog-toggle";
      toggle.textContent = item.details.length ? "＋" : "·";
      toggle.disabled = item.details.length === 0;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", `展开：${item.title}`);

      heading.append(checkbox, title, toggle);
      article.appendChild(heading);

      if (item.details.length) {
        const details = document.createElement("div");
        details.className = "vlog-details";
        details.hidden = true;

        item.details.forEach((line) => {
          const paragraph = document.createElement("p");
          paragraph.textContent = line;
          details.appendChild(paragraph);
        });

        toggle.addEventListener("click", () => {
          const expanded = toggle.getAttribute("aria-expanded") === "true";
          toggle.setAttribute("aria-expanded", String(!expanded));
          toggle.textContent = expanded ? "＋" : "－";
          details.hidden = expanded;
        });

        article.appendChild(details);
      }

      elements.vlogList.appendChild(article);
    });

    updateVlogProgress();
  }

  function updateVlogProgress() {
    elements.vlogProgressText.textContent =
      `${state.vlogCompletedIds.length} / ${exam.vlog.items.length}`;
  }

  function renderOath() {
    showOnly(elements.oathScreen);
    elements.oathQuote.innerHTML = "";
    exam.oath.lines.forEach((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      elements.oathQuote.appendChild(paragraph);
    });
  }

  function finishOath() {
    state.oathCompleted = true;
    state.phase = "complete";
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderComplete() {
    showOnly(elements.completeScreen);
  }

  function render() {
    switch (state.phase) {
      case "quiz":
        renderQuiz();
        break;
      case "summary":
        renderSummary();
        break;
      case "vlog":
        renderVlog();
        break;
      case "oath":
        renderOath();
        break;
      case "complete":
        renderComplete();
        break;
      default:
        renderIntro();
    }
  }

  elements.startButton.addEventListener("click", () => {
    state.answerMode = selectedAnswerMode();

    if (!hasProgress()) {
      state.phase = "quiz";
      state.questionIndex = 0;
    } else if (state.phase === "intro") {
      state.phase = "quiz";
    }

    clearHiddenAnswerSession();
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  elements.previousButton.addEventListener("click", () => {
    if (state.questionIndex === 0) return;
    state.questionIndex -= 1;
    clearHiddenAnswerSession();
    saveState();
    renderQuiz();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  elements.completeQuestionButton.addEventListener(
    "click",
    completeCurrentQuestion
  );
  elements.skipButton.addEventListener("click", skipCurrentQuestion);
  elements.reviewSkippedButton.addEventListener("click", reviewFirstSkipped);
  elements.enterVlogButton.addEventListener("click", () => setPhase("vlog"));
  elements.backToSummaryButton.addEventListener("click", () => setPhase("summary"));
  elements.enterOathButton.addEventListener("click", () => setPhase("oath"));
  elements.finishOathButton.addEventListener("click", finishOath);
  elements.reviewVlogButton.addEventListener("click", () => setPhase("vlog"));

  elements.restartExamButton.addEventListener("click", () => {
    state = defaultState();
    clearHiddenAnswerSession();
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  elements.clearProgressHeaderButton.addEventListener("click", () => {
    if (typeof elements.clearDialog.showModal === "function") {
      elements.clearDialog.showModal();
    } else {
      clearStoredState();
    }
  });

  elements.cancelClearButton.addEventListener("click", () => {
    elements.clearDialog.close();
  });

  elements.confirmClearButton.addEventListener("click", () => {
    elements.clearDialog.close();
    clearStoredState();
  });

  elements.clearDialog.addEventListener("click", (event) => {
    if (event.target === elements.clearDialog) {
      elements.clearDialog.close();
    }
  });

  render();
})();
