(() => {
  "use strict";

  const items = Array.isArray(window.FAJIA_SUGAR_BRACKET_ITEMS)
    ? window.FAJIA_SUGAR_BRACKET_ITEMS
    : [];

  const STORAGE_KEY = "fajia-livegame.sugar-bracket-01.v1";

  if (items.length !== 64) {
    throw new Error("糖点极限二选一需要64个初始项目。");
  }

  const roundMeta = [
    { eyebrow: "ROUND 01", title: "第一轮 · 海选64进32", label: "第一轮", expected: 32 },
    { eyebrow: "ROUND 02", title: "第二轮 · 32进16", label: "第二轮", expected: 16 },
    { eyebrow: "ROUND 03", title: "第三轮 · 16进8", label: "第三轮", expected: 8 },
    { eyebrow: "ROUND 04", title: "第四轮 · 8进4", label: "第四轮", expected: 4 },
    { eyebrow: "ROUND 05", title: "第五轮 · 半决赛4进2", label: "第五轮", expected: 2 },
    { eyebrow: "FINAL", title: "冠军赛 · 2进1", label: "冠军", expected: 1 },
  ];

  const $ = (id) => document.getElementById(id);
  const el = {
    setup: $("setupCard"),
    game: $("gameCard"),
    champion: $("championCard"),
    name: $("playerName"),
    start: $("startButton"),
    resume: $("resumeButton"),
    roundEyebrow: $("roundEyebrow"),
    roundTitle: $("roundTitle"),
    roundProgress: $("roundProgress"),
    progressBar: $("progressBar"),
    optionA: $("optionA"),
    optionB: $("optionB"),
    optionAText: $("optionAText"),
    optionBText: $("optionBText"),
    chooseA: $("chooseA"),
    chooseB: $("chooseB"),
    skip: $("skipButton"),
    columns: $("roundColumns"),
    export: $("exportButton"),
    exportFinal: $("exportButtonFinal"),
    reset: $("resetButton"),
    resetFinal: $("resetButtonFinal"),
    championText: $("championText"),
    championSubtitle: $("championSubtitle"),
    toast: $("toast"),
  };

  let toastTimer;

  const state = {
    playerName: "",
    roundIndex: 0,
    pendingPairs: [],
    roundWinners: [],
    completedRounds: [],
    champion: null,
  };

  function showToast(text) {
    clearTimeout(toastTimer);
    el.toast.textContent = text;
    el.toast.classList.add("show");
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2200);
  }

  function pairUp(entrants) {
    const pairs = [];
    for (let i = 0; i < entrants.length; i += 2) {
      pairs.push([entrants[i], entrants[i + 1]]);
    }
    return pairs;
  }

  function safeState(raw) {
    if (!raw || typeof raw !== "object") return false;
    if (!Number.isInteger(raw.roundIndex)) return false;
    if (!Array.isArray(raw.pendingPairs)) return false;
    if (!Array.isArray(raw.roundWinners)) return false;
    if (!Array.isArray(raw.completedRounds)) return false;
    return true;
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
    updateResumeButton();
  }

  function updateResumeButton() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      el.resume.hidden = !safeState(raw);
    } catch {
      el.resume.hidden = true;
    }
  }

  function startFresh() {
    state.playerName = el.name.value.trim();
    state.roundIndex = 0;
    state.pendingPairs = pairUp(items);
    state.roundWinners = [];
    state.completedRounds = [];
    state.champion = null;

    persist();
    showGame();
    render();
  }

  function resumeSaved() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!safeState(raw)) {
        showToast("没有找到可以继续的进度。");
        return;
      }

      Object.assign(state, raw);
      el.name.value = state.playerName || "";

      if (state.champion) {
        showChampion();
      } else {
        showGame();
      }
      render();
    } catch {
      showToast("上次进度读取失败，可以重新开始。");
    }
  }

  function showGame() {
    el.setup.hidden = true;
    el.champion.hidden = true;
    el.game.hidden = false;
    window.scrollTo({ top: el.game.offsetTop - 16, behavior: "smooth" });
  }

  function showChampion() {
    el.setup.hidden = true;
    el.game.hidden = true;
    el.champion.hidden = false;

    el.championText.textContent = state.champion?.text || "—";
    const who = state.playerName ? `${state.playerName}，` : "";
    el.championSubtitle.textContent =
      `${who}从64个糖点一路选到了最后。`;

    window.scrollTo({ top: el.champion.offsetTop - 16, behavior: "smooth" });
  }

  function currentPair() {
    return state.pendingPairs[0] || null;
  }

  function selectWinner(side) {
    const pair = currentPair();
    if (!pair) return;

    const winner = pair[side];
    if (!winner) return;

    state.roundWinners.push(winner);
    state.pendingPairs.shift();

    if (!state.pendingPairs.length) {
      finishRound();
    }

    persist();
    render();
  }

  function finishRound() {
    state.completedRounds.push([...state.roundWinners]);

    if (state.roundWinners.length === 1) {
      state.champion = state.roundWinners[0];
      persist();
      showChampion();
      return;
    }

    const entrants = [...state.roundWinners];
    state.roundIndex += 1;
    state.pendingPairs = pairUp(entrants);
    state.roundWinners = [];
  }

  function postponeCurrent() {
    if (state.pendingPairs.length <= 1) {
      showToast("本轮只剩这一组啦，再纠结一下下！");
      return;
    }

    const pair = state.pendingPairs.shift();
    state.pendingPairs.push(pair);
    persist();
    renderMatch();
    showToast("这组先放到本轮最后。");
  }

  function render() {
    renderMatch();
    renderJourney();

    if (state.champion) {
      el.championText.textContent = state.champion.text;
    }
  }

  function renderMatch() {
    if (state.champion) return;

    const meta = roundMeta[state.roundIndex] || roundMeta[0];
    const totalMatches = meta.expected;
    const completed = state.roundWinners.length;
    const pair = currentPair();

    el.roundEyebrow.textContent = meta.eyebrow;
    el.roundTitle.textContent = meta.title;
    el.roundProgress.textContent = `${completed} / ${totalMatches}`;
    el.progressBar.style.width =
      `${Math.min(100, (completed / totalMatches) * 100)}%`;

    if (!pair) return;

    el.optionAText.textContent = pair[0]?.text || "—";
    el.optionBText.textContent = pair[1]?.text || "—";
  }

  function allRoundSnapshots() {
    const rounds = state.completedRounds.map((list, index) => ({
      label: roundMeta[index]?.label || `第${index + 1}轮`,
      list,
      status: "done",
    }));

    if (!state.champion) {
      rounds.push({
        label: roundMeta[state.roundIndex]?.label || "当前轮",
        list: [...state.roundWinners],
        status: "current",
      });
    }

    if (state.champion) {
      rounds.push({
        label: "冠军",
        list: [state.champion],
        status: "champion",
      });
    }

    return rounds;
  }

  function renderJourney() {
    const snapshots = allRoundSnapshots();

    el.columns.innerHTML = "";

    roundMeta.forEach((meta, index) => {
      const snap = snapshots[index];
      const div = document.createElement("article");
      div.className = "round-column";

      if (snap?.status === "current") div.classList.add("current");
      if (snap?.status === "champion") div.classList.add("champion");

      const h = document.createElement("h3");
      h.textContent = meta.label;

      const small = document.createElement("small");
      small.textContent =
        index === 5
          ? "最后留下的1项"
          : `目标留下${meta.expected}项`;

      div.append(h, small);

      if (!snap || !snap.list.length) {
        const empty = document.createElement("p");
        empty.className = "round-empty";
        empty.textContent =
          index < state.roundIndex
            ? "本轮暂无记录"
            : "还没走到这里";
        div.appendChild(empty);
      } else {
        const ul = document.createElement("ul");
        ul.className = "round-list";

        snap.list.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = item.text;
          ul.appendChild(li);
        });

        div.appendChild(ul);
      }

      el.columns.appendChild(div);
    });
  }

  function exportRanking() {
    const lines = [
      "法嘉糖点极限二选一",
      "原始表格：十九",
      "原始网站开发：厌倦猜忌__",
      "游戏屋整合与长期访问适配：哈哈哈机器",
      `填表人：${state.playerName || "未填写"}`,
      "",
    ];

    state.completedRounds.forEach((round, index) => {
      lines.push(`【${roundMeta[index]?.label || `第${index + 1}轮`}】`);
      round.forEach((item, i) => {
        lines.push(`${String(i + 1).padStart(2, "0")}. ${item.text}`);
      });
      lines.push("");
    });

    if (state.champion) {
      lines.push("【冠军】");
      lines.push(state.champion.text);
      lines.push("");
    } else {
      lines.push("【当前进度】");
      lines.push(
        `${roundMeta[state.roundIndex]?.title || "进行中"}，已完成${state.roundWinners.length}组。`
      );
      state.roundWinners.forEach((item, i) => {
        lines.push(`${String(i + 1).padStart(2, "0")}. ${item.text}`);
      });
    }

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `法嘉糖点极限二选一-${state.playerName || "我的榜单"}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast("榜单已在本地生成。");
  }

  function resetAll() {
    if (!window.confirm("确定清空这次的全部选择，重新从64项开始吗？")) {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    state.playerName = "";
    state.roundIndex = 0;
    state.pendingPairs = [];
    state.roundWinners = [];
    state.completedRounds = [];
    state.champion = null;

    el.name.value = "";
    el.game.hidden = true;
    el.champion.hidden = true;
    el.setup.hidden = false;

    renderJourney();
    updateResumeButton();
    window.scrollTo({ top: el.setup.offsetTop - 18, behavior: "smooth" });
  }

  el.start.addEventListener("click", startFresh);
  el.resume.addEventListener("click", resumeSaved);

  el.optionA.addEventListener("click", () => selectWinner(0));
  el.optionB.addEventListener("click", () => selectWinner(1));
  el.chooseA.addEventListener("click", () => selectWinner(0));
  el.chooseB.addEventListener("click", () => selectWinner(1));
  el.skip.addEventListener("click", postponeCurrent);

  el.export.addEventListener("click", exportRanking);
  el.exportFinal.addEventListener("click", exportRanking);
  el.reset.addEventListener("click", resetAll);
  el.resetFinal.addEventListener("click", resetAll);

  updateResumeButton();
  renderJourney();
})();
