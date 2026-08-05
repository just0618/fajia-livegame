const STORAGE_KEY = "fajia-livegame.monopoly.save.v1";
const LAST_CELL = BOARD_CELLS.length - 1;
const diceFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

const DEFAULT_PLAYERS = [
  { name: "法宣阁", color: "#FF8AA1", position: 0, skipTurns: 0 },
  { name: "贺嘉述", color: "#FFE25B", position: 0, skipTurns: 0 }
];

function createNewState(players = DEFAULT_PLAYERS) {
  return {
    version: 1,
    players: JSON.parse(JSON.stringify(players)).map(player => ({
      name: player.name,
      color: player.color,
      position: 0,
      skipTurns: 0
    })),
    currentPlayer: 0,
    starterConfirmed: false,
    lastDice: null,
    gameOver: false,
    disabledCells: [],
    history: ["游戏已准备完成，请先确认石头剪刀布的获胜者。"],
    updatedAt: null
  };
}

let state = createNewState();
let locked = false;
let pendingKeepTurn = false;
let lastMove = null;
let displayedEventCell = null;

const $ = selector => document.querySelector(selector);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const elements = {
  rollBtn: $("#rollBtn"),
  dice: $("#dice"),
  diceHint: $("#diceHint"),
  turnText: $("#turnText"),
  saveText: $("#saveText"),
  cellTitle: $("#cellTitle"),
  cellDescription: $("#cellDescription"),
  requirementTags: $("#requirementTags"),
  gameLog: $("#gameLog"),
  settingsModal: $("#settingsModal"),
  starterModal: $("#starterModal"),
  saveLoadModal: $("#saveLoadModal"),
  eventModal: $("#eventModal"),
  skippedModal: $("#skippedModal"),
  rulesModal: $("#rulesModal"),
  winModal: $("#winModal"),
  eventBadge: $("#eventBadge"),
  eventTitle: $("#eventTitle"),
  eventIndex: $("#eventIndex"),
  eventText: $("#eventText"),
  eventRequirements: $("#eventRequirements"),
  skipAndRerollBtn: $("#skipAndRerollBtn"),
  skippedBtn: $("#skippedBtn"),
  skippedList: $("#skippedList"),
  winnerTitle: $("#winnerTitle"),
  saveCode: $("#saveCode")
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clampPosition(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(LAST_CELL, Math.round(number)));
}

function validColor(value, fallback) {
  return /^#[0-9A-Fa-f]{6}$/.test(value || "") ? value.toUpperCase() : fallback;
}

function validateState(candidate) {
  if (!candidate || !Array.isArray(candidate.players) || candidate.players.length !== 2) return null;

  const players = candidate.players.map((player, index) => ({
    name: String(player.name || DEFAULT_PLAYERS[index].name).slice(0, 12),
    color: validColor(player.color, DEFAULT_PLAYERS[index].color),
    position: clampPosition(player.position),
    skipTurns: Math.max(0, Math.round(Number(player.skipTurns) || 0))
  }));

  const disabledCells = Array.isArray(candidate.disabledCells)
    ? [...new Set(candidate.disabledCells.map(clampPosition))]
        .filter(id => {
          const type = BOARD_CELLS[id]?.type;
          return type && type !== "start" && type !== "finish";
        })
    : [];

  return {
    version: 1,
    players,
    currentPlayer: Number(candidate.currentPlayer) === 1 ? 1 : 0,
    starterConfirmed: Boolean(candidate.starterConfirmed),
    lastDice: Number.isInteger(candidate.lastDice) && candidate.lastDice >= 1 && candidate.lastDice <= 6
      ? candidate.lastDice
      : null,
    gameOver: Boolean(candidate.gameOver),
    disabledCells,
    history: Array.isArray(candidate.history) ? candidate.history.slice(-60).map(String) : [],
    updatedAt: candidate.updatedAt || null
  };
}

function saveGame() {
  try {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderSaveTime();
  } catch (error) {
    console.error("自动保存失败：", error);
    elements.saveText.textContent = "自动保存失败";
  }
}

function loadAutoSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = validateState(JSON.parse(raw));
    if (!parsed) return false;
    state = parsed;
    addLog("已读取当前浏览器中的自动存档。", false);
    return true;
  } catch (error) {
    console.error("读取自动存档失败：", error);
    return false;
  }
}

function addLog(message, shouldSave = true) {
  const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  state.history.push(`${time}｜${message}`);
  state.history = state.history.slice(-60);
  renderLog();
  if (shouldSave) saveGame();
}

function formatCellText(cell) {
  return String(cell.text || "").replaceAll("{dice}", String(state.lastDice || "本次"));
}

function getTextColor(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 175 ? "#5A4700" : "#FFFFFF";
}

function setRequirementTags(container, requirements = []) {
  container.innerHTML = "";
  requirements.forEach(item => {
    const tag = document.createElement("span");
    tag.textContent = `需：${item}`;
    container.appendChild(tag);
  });
}

function renderSaveTime() {
  if (!state.updatedAt) {
    elements.saveText.textContent = "尚未保存";
    return;
  }
  const time = new Date(state.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  elements.saveText.textContent = `已自动保存 ${time}`;
}

function renderLog() {
  elements.gameLog.innerHTML = "";
  const records = state.history.length ? state.history : ["暂无记录。"];
  records.slice().reverse().forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    elements.gameLog.appendChild(li);
  });
}

function renderTokens() {
  const sameCell = state.players[0].position === state.players[1].position;

  state.players.forEach((player, index) => {
    const token = $(`#token${index}`);
    const cell = BOARD_CELLS[player.position];
    token.style.left = `${cell.x}%`;
    token.style.top = `${cell.y}%`;
    token.style.background = player.color;
    token.style.color = getTextColor(player.color);
    token.style.transform = sameCell
      ? `translate(calc(-50% + ${index === 0 ? -11 : 11}px), -50%)`
      : "translate(-50%, -50%)";
    token.title = `${player.name}：第${player.position}格`;
    const isDefaultName = player.name === DEFAULT_PLAYERS[index].name;
    token.querySelector("span").textContent = isDefaultName
      ? (index === 0 ? "法" : "贺")
      : player.name.slice(-1);
  });
}

function renderStarterOptions() {
  state.players.forEach((player, index) => {
    $(`#starterName${index}`).textContent = player.name;
    $(`#starterColor${index}`).style.background = player.color;
  });
}

function renderPlayers() {
  state.players.forEach((player, index) => {
    $(`#playerName${index}`).textContent = player.name;
    $(`#playerPos${index}`).textContent = player.position;
    $(`#playerDot${index}`).style.background = player.color;
    $(`#progress${index}`).style.width = `${(player.position / LAST_CELL) * 100}%`;
    $(`#progress${index}`).style.background = player.color;
    $(`#playerCard${index}`).classList.toggle(
      "active",
      state.starterConfirmed && !state.gameOver && index === state.currentPlayer
    );
  });

  if (!state.starterConfirmed) {
    elements.turnText.textContent = "等待确认先手";
    elements.turnText.style.color = "";
    elements.diceHint.textContent = "确认先手后即可掷骰子";
  } else if (state.gameOver) {
    elements.turnText.textContent = "游戏结束";
    elements.diceHint.textContent = "本局已经结束";
  } else {
    const current = state.players[state.currentPlayer];
    elements.turnText.textContent = current.name;
    elements.turnText.style.color = current.color;
    elements.diceHint.textContent = `轮到 ${current.name} 掷骰子`;
  }

  renderStarterOptions();
}

function renderCurrentCell() {
  if (!state.starterConfirmed) {
    elements.cellTitle.textContent = "等待开局";
    elements.cellDescription.textContent = "现实中完成石头剪刀布后，请在弹窗中点击获胜者。";
    setRequirementTags(elements.requirementTags, []);
    return;
  }

  const current = state.players[state.currentPlayer];
  const cell = BOARD_CELLS[current.position];
  elements.cellTitle.textContent = `第${cell.id}格 · ${cell.title}`;
  elements.cellDescription.textContent = state.gameOver ? "本局已结束，可以重新开始。" : formatCellText(cell);
  setRequirementTags(elements.requirementTags, cell.requirements);
}

function renderSkipped() {
  elements.skippedBtn.textContent = `已跳过 ${state.disabledCells.length} 格`;
  elements.skippedList.innerHTML = "";

  if (!state.disabledCells.length) {
    elements.skippedList.innerHTML = '<div class="empty-state">本局还没有跳过任何格子。</div>';
    return;
  }

  state.disabledCells
    .slice()
    .sort((a, b) => a - b)
    .forEach(id => {
      const cell = BOARD_CELLS[id];
      const item = document.createElement("div");
      item.className = "skipped-item";
      item.innerHTML = `
        <div>
          <strong>第${id}格 · ${cell.title}</strong>
          <small>${formatCellText(cell)}</small>
        </div>
        <button class="ghost-btn" data-restore-cell="${id}">恢复</button>
      `;
      elements.skippedList.appendChild(item);
    });
}

function render() {
  renderPlayers();
  renderTokens();
  renderCurrentCell();
  renderLog();
  renderSkipped();
  renderSaveTime();
  elements.rollBtn.disabled = locked || state.gameOver || !state.starterConfirmed;
  if (state.lastDice) elements.dice.textContent = diceFaces[state.lastDice - 1];
}

async function animateDice() {
  elements.dice.classList.add("rolling");
  for (let i = 0; i < 10; i++) {
    elements.dice.textContent = diceFaces[Math.floor(Math.random() * 6)];
    await sleep(70);
  }
  elements.dice.classList.remove("rolling");
}

async function movePlayerTo(playerIndex, target, delay = 235) {
  const player = state.players[playerIndex];
  const finalTarget = clampPosition(target);
  const direction = finalTarget >= player.position ? 1 : -1;

  while (player.position !== finalTarget) {
    player.position += direction;
    render();
    await sleep(delay);
  }
}

function openModal(modal) {
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
}

function showEvent(
  cell,
  badge = "任务",
  allowSkip = false,
  textOverride = null,
  requirementsOverride = null
) {
  displayedEventCell = cell;
  elements.eventBadge.textContent = badge;
  elements.eventTitle.textContent = cell.title;
  elements.eventIndex.textContent = Number.isInteger(cell.id) ? `第${cell.id}格` : "";
  elements.eventText.textContent = textOverride ?? formatCellText(cell);
  setRequirementTags(
    elements.eventRequirements,
    requirementsOverride ?? cell.requirements ?? []
  );
  elements.skipAndRerollBtn.classList.toggle("visible", allowSkip);
  openModal(elements.eventModal);
}

function closeEvent() {
  closeModal(elements.eventModal);
  elements.skipAndRerollBtn.classList.remove("visible");
  displayedEventCell = null;
}

function switchPlayer() {
  state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
}

async function resolveSkipTurnIfNeeded() {
  const player = state.players[state.currentPlayer];
  if (!state.starterConfirmed || state.gameOver || player.skipTurns <= 0) return false;

  player.skipTurns -= 1;
  addLog(`${player.name} 本回合暂停，自动跳过。`, false);
  switchPlayer();
  saveGame();
  render();
  return true;
}

async function beginTurn() {
  if (!state.starterConfirmed || state.gameOver) return;
  if (await resolveSkipTurnIfNeeded()) {
    locked = false;
    render();
  }
}

function declareWinner(playerIndex) {
  const player = state.players[playerIndex];
  player.position = LAST_CELL;
  state.gameOver = true;
  locked = false;
  addLog(`${player.name} 率先到达终点，获得万能任务卡。`, false);
  elements.winnerTitle.textContent = `恭喜 ${player.name} 获胜！`;
  openModal(elements.winModal);
  saveGame();
  render();
}

async function handleDisabledLanding(playerIndex, cell) {
  const player = state.players[playerIndex];
  addLog(`${player.name} 落到本局已跳过的第${cell.id}格“${cell.title}”。`, false);
  await movePlayerTo(playerIndex, lastMove.originPosition, 130);
  pendingKeepTurn = true;
  showEvent({
    id: cell.id,
    title: "本格已在本局跳过",
    text: `第${cell.id}格“${cell.title}”已设置为本局跳过。棋子已退回第${player.position}格，请重新掷骰子。`,
    requirements: []
  }, "自动跳过", false);
}

async function resolveCell(playerIndex) {
  const player = state.players[playerIndex];
  const cell = BOARD_CELLS[player.position];
  pendingKeepTurn = false;

  if (state.disabledCells.includes(cell.id) && cell.type !== "start" && cell.type !== "finish") {
    await handleDisabledLanding(playerIndex, cell);
    saveGame();
    render();
    return;
  }

  switch (cell.type) {
    case "task":
      addLog(`${player.name} 到达第${cell.id}格“${cell.title}”。`, false);
      showEvent(cell, "任务", true);
      break;

    case "forward": {
      const target = Math.min(LAST_CELL, player.position + cell.steps);
      addLog(`${player.name} 触发前进${cell.steps}格。`, false);
      await movePlayerTo(playerIndex, target);
      if (player.position === LAST_CELL) {
        declareWinner(playerIndex);
        return;
      }
      const landed = BOARD_CELLS[player.position];
      showEvent(
        cell,
        "特殊效果",
        true,
        `已前进至第${player.position}格。\n\n落点内容：${formatCellText(landed)}\n\n本次只执行“${cell.text}”的移动效果，落点内容不会连续触发。`,
        landed.requirements
      );
      break;
    }

    case "backward": {
      const target = Math.max(0, player.position - cell.steps);
      addLog(`${player.name} 触发后退${cell.steps}格。`, false);
      await movePlayerTo(playerIndex, target);
      const landed = BOARD_CELLS[player.position];
      showEvent(
        cell,
        "特殊效果",
        true,
        `已后退至第${player.position}格。\n\n落点内容：${formatCellText(landed)}\n\n本次只执行“${cell.text}”的移动效果，落点内容不会连续触发。`,
        landed.requirements
      );
      break;
    }

    case "skip":
      player.skipTurns = 1;
      addLog(`${player.name} 下一次轮到时暂停一回合。`, false);
      showEvent(cell, "特殊效果", true);
      break;

    case "rollAgain":
      pendingKeepTurn = true;
      addLog(`${player.name} 获得再掷一次机会。`, false);
      showEvent(cell, "幸运格", true);
      break;

    case "finish":
      declareWinner(playerIndex);
      return;

    default:
      showEvent(cell, "提示", false);
  }

  saveGame();
  render();
}

async function rollDice() {
  if (locked || state.gameOver || !state.starterConfirmed) return;

  locked = true;
  elements.rollBtn.disabled = true;

  if (await resolveSkipTurnIfNeeded()) {
    locked = false;
    render();
    return;
  }

  const playerIndex = state.currentPlayer;
  const player = state.players[playerIndex];
  lastMove = {
    playerIndex,
    originPosition: player.position,
    originSkipTurns: player.skipTurns,
    originCurrentPlayer: state.currentPlayer
  };

  await animateDice();
  const value = Math.floor(Math.random() * 6) + 1;
  state.lastDice = value;
  elements.dice.textContent = diceFaces[value - 1];

  addLog(`${player.name} 掷出 ${value} 点。`, false);
  const target = Math.min(LAST_CELL, player.position + value);
  await movePlayerTo(playerIndex, target);
  addLog(`${player.name} 移动到第 ${player.position} 格。`, false);

  await resolveCell(playerIndex);
  if (state.gameOver) {
    locked = false;
    render();
  }
}

function finishCurrentEvent() {
  closeEvent();

  if (!pendingKeepTurn) {
    switchPlayer();
  } else {
    addLog(`${state.players[state.currentPlayer].name} 保持当前回合，可以重新掷骰子。`, false);
  }

  pendingKeepTurn = false;
  lastMove = null;
  locked = false;
  saveGame();
  render();
  beginTurn();
}

async function skipCurrentCellAndReroll() {
  if (!displayedEventCell || !lastMove) return;

  const cell = displayedEventCell;
  if (cell.type === "start" || cell.type === "finish") return;

  const player = state.players[lastMove.playerIndex];

  if (!confirm(`确认本局跳过第${cell.id}格“${cell.title}”吗？棋子会退回本次掷骰前的位置，并由${player.name}重新掷骰。`)) {
    return;
  }

  if (!state.disabledCells.includes(cell.id)) {
    state.disabledCells.push(cell.id);
  }

  closeEvent();

  player.position = lastMove.originPosition;
  player.skipTurns = lastMove.originSkipTurns;
  state.currentPlayer = lastMove.originCurrentPlayer;
  state.lastDice = null;
  pendingKeepTurn = false;

  addLog(`${player.name} 将第${cell.id}格“${cell.title}”设置为本局跳过，已退回第${player.position}格。`, false);

  lastMove = null;
  locked = false;
  saveGame();
  render();
}

function chooseStarter(index) {
  state.currentPlayer = index;
  state.starterConfirmed = true;
  closeModal(elements.starterModal);
  addLog(`${state.players[index].name} 赢得石头剪刀布，成为先手。`, false);
  saveGame();
  render();
  beginTurn();
}

function resetGame(keepSettings = true) {
  const players = keepSettings
    ? state.players.map(player => ({
        name: player.name,
        color: player.color,
        position: 0,
        skipTurns: 0
      }))
    : DEFAULT_PLAYERS;

  state = createNewState(players);
  locked = false;
  pendingKeepTurn = false;
  lastMove = null;
  displayedEventCell = null;
  elements.dice.textContent = "⚀";
  saveGame();
  render();
  openModal(elements.starterModal);
}

function encodeSaveCode(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeSaveCode(code) {
  let normalized = code.trim().replaceAll("-", "+").replaceAll("_", "/");
  while (normalized.length % 4) normalized += "=";
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

$("#settingsBtn").addEventListener("click", () => {
  $("#nameInput0").value = state.players[0].name;
  $("#nameInput1").value = state.players[1].name;
  $("#colorInput0").value = state.players[0].color;
  $("#colorInput1").value = state.players[1].color;
  openModal(elements.settingsModal);
});

$("#saveSettingsBtn").addEventListener("click", () => {
  const name0 = $("#nameInput0").value.trim() || "玩家一";
  const name1 = $("#nameInput1").value.trim() || "玩家二";
  const color0 = $("#colorInput0").value.toUpperCase();
  const color1 = $("#colorInput1").value.toUpperCase();

  if (color0 === color1) {
    alert("两名玩家不能选择完全相同的颜色。");
    return;
  }

  state.players[0].name = name0;
  state.players[1].name = name1;
  state.players[0].color = color0;
  state.players[1].color = color1;

  addLog("玩家昵称和颜色已更新。", false);
  closeModal(elements.settingsModal);
  saveGame();
  render();

  if (!state.starterConfirmed) openModal(elements.starterModal);
});

$("#saveLoadBtn").addEventListener("click", () => {
  $("#loadPos0").value = state.players[0].position;
  $("#loadPos1").value = state.players[1].position;
  $("#loadTurn").value = String(state.currentPlayer);
  openModal(elements.saveLoadModal);
});

$("#confirmManualLoadBtn").addEventListener("click", () => {
  state.players[0].position = clampPosition($("#loadPos0").value);
  state.players[1].position = clampPosition($("#loadPos1").value);
  state.players[0].skipTurns = 0;
  state.players[1].skipTurns = 0;
  state.currentPlayer = $("#loadTurn").value === "1" ? 1 : 0;
  state.starterConfirmed = true;
  state.gameOver = false;
  state.lastDice = null;
  locked = false;
  pendingKeepTurn = false;
  lastMove = null;

  addLog(`手动读档：${state.players[0].name}第${state.players[0].position}格，${state.players[1].name}第${state.players[1].position}格；下一回合为${state.players[state.currentPlayer].name}。`, false);
  closeModal(elements.saveLoadModal);
  saveGame();
  render();
});

$("#generateCodeBtn").addEventListener("click", () => {
  elements.saveCode.value = encodeSaveCode(state);
});

$("#copyCodeBtn").addEventListener("click", async () => {
  if (!elements.saveCode.value.trim()) {
    elements.saveCode.value = encodeSaveCode(state);
  }

  try {
    await navigator.clipboard.writeText(elements.saveCode.value);
    alert("存档码已复制。");
  } catch {
    elements.saveCode.select();
    document.execCommand("copy");
    alert("存档码已复制。");
  }
});

$("#importCodeBtn").addEventListener("click", () => {
  try {
    const parsed = validateState(decodeSaveCode(elements.saveCode.value));
    if (!parsed) throw new Error("存档结构不正确");
    state = parsed;
    locked = false;
    pendingKeepTurn = false;
    lastMove = null;
    displayedEventCell = null;
    addLog("已通过存档码恢复游戏。", false);
    closeModal(elements.saveLoadModal);
    saveGame();
    render();
    beginTurn();
  } catch (error) {
    alert(`存档码无法读取：${error.message}`);
  }
});

$("#skippedBtn").addEventListener("click", () => {
  renderSkipped();
  openModal(elements.skippedModal);
});

elements.skippedList.addEventListener("click", event => {
  const button = event.target.closest("[data-restore-cell]");
  if (!button) return;
  const id = Number(button.dataset.restoreCell);
  state.disabledCells = state.disabledCells.filter(cellId => cellId !== id);
  addLog(`已恢复第${id}格“${BOARD_CELLS[id].title}”。`, false);
  saveGame();
  render();
});

$("#restoreAllBtn").addEventListener("click", () => {
  if (!state.disabledCells.length) return;
  if (confirm("确定恢复本局全部已跳过任务格吗？")) {
    state.disabledCells = [];
    addLog("已恢复全部跳过格子。", false);
    saveGame();
    render();
  }
});

$("#rulesBtn").addEventListener("click", () => openModal(elements.rulesModal));

$("#resetBtn").addEventListener("click", () => {
  if (confirm("确定重新开始吗？当前进度和本局跳过的格子都会清除，但昵称和颜色会保留。")) {
    resetGame(true);
  }
});

$("#clearLogBtn").addEventListener("click", () => {
  state.history = [];
  addLog("游戏记录已清空。", false);
  saveGame();
  render();
});

$("#rollBtn").addEventListener("click", rollDice);
$("#finishEventBtn").addEventListener("click", finishCurrentEvent);
$("#skipAndRerollBtn").addEventListener("click", skipCurrentCellAndReroll);
$("#chooseStarter0").addEventListener("click", () => chooseStarter(0));
$("#chooseStarter1").addEventListener("click", () => chooseStarter(1));

$("#closeWinBtn").addEventListener("click", () => closeModal(elements.winModal));
$("#playAgainBtn").addEventListener("click", () => {
  closeModal(elements.winModal);
  resetGame(true);
});

document.querySelectorAll(".modal-close").forEach(button => {
  button.addEventListener("click", () => closeModal(button.closest(".modal")));
});

window.addEventListener("resize", renderTokens);

loadAutoSave();
render();

if (!state.starterConfirmed && !state.gameOver) {
  openModal(elements.starterModal);
} else {
  beginTurn();
}
