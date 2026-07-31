(() => {
  "use strict";

  const toast = document.getElementById("toast");
  const randomGameButton = document.getElementById("randomGameButton");
  const randomGameDialog = document.getElementById("randomGameDialog");
  const closeRandomGameButton = document.getElementById("closeRandomGameButton");
  const rerollGameButton = document.getElementById("rerollGameButton");
  const randomGameIndex = document.getElementById("randomGameIndex");
  const randomGameTitle = document.getElementById("randomGameTitle");
  const randomGameDescription = document.getElementById("randomGameDescription");
  const randomGameLink = document.getElementById("randomGameLink");
  const randomCards = [...document.querySelectorAll("[data-random-game]")];

  let toastTimer;
  let lastRandomCard = null;

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");

    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2800);
  }

  function chooseRandomCard() {
    if (!randomCards.length) return null;
    if (randomCards.length === 1) return randomCards[0];

    let selected;
    do {
      selected = randomCards[Math.floor(Math.random() * randomCards.length)];
    } while (selected === lastRandomCard);

    lastRandomCard = selected;
    return selected;
  }

  function applyRandomCard(card) {
    if (!card) return;

    const index = card.querySelector(".game-index")?.textContent.trim() || "GAME";
    const title = card.querySelector("h3")?.textContent.trim() || "随机游戏";
    const description =
      card.querySelector(":scope > p:not(.game-index)")?.textContent.trim() || "";
    const link = card.querySelector("a.button");

    randomGameIndex.textContent = index;
    randomGameTitle.textContent = title;
    randomGameDescription.textContent = description;

    randomGameLink.href = link?.href || "#";
    if (link?.target) {
      randomGameLink.target = link.target;
      randomGameLink.rel = link.rel || "noopener noreferrer";
      randomGameLink.querySelector("span").textContent = "↗";
    } else {
      randomGameLink.removeAttribute("target");
      randomGameLink.removeAttribute("rel");
      randomGameLink.querySelector("span").textContent = "→";
    }
  }

  function randomizeGame() {
    const selected = chooseRandomCard();
    if (!selected) {
      showToast("暂时没有可以随机的游戏。");
      return;
    }
    applyRandomCard(selected);
  }

  function openRandomGame() {
    randomizeGame();

    if (typeof randomGameDialog.showModal === "function") {
      randomGameDialog.showModal();
      return;
    }

    const title = randomGameTitle.textContent;
    const shouldOpen = window.confirm(`今天随机到：${title}\n\n现在进入游戏吗？`);
    if (shouldOpen) {
      window.location.href = randomGameLink.href;
    }
  }

  function closeRandomGame() {
    if (randomGameDialog.open) {
      randomGameDialog.close();
    }
  }

  function renderExternalWorks() {
    const grid = document.getElementById("worksGrid");
    const works = Array.isArray(window.FAJIA_EXTERNAL_WORKS)
      ? window.FAJIA_EXTERNAL_WORKS
      : [];

    if (!grid) return;

    grid.innerHTML = "";

    works.forEach((work, index) => {
      const article = document.createElement("article");
      article.className = "work-card";
      article.dataset.workId = work.id;

      const top = document.createElement("div");
      top.className = "work-card-top";

      const platform = document.createElement("span");
      platform.className = `work-platform work-platform-${work.platformClass}`;
      platform.textContent = work.platform;

      const number = document.createElement("span");
      number.className = "work-index";
      number.textContent = String(index + 1).padStart(2, "0");

      top.append(platform, number);

      const title = document.createElement("h3");
      title.textContent = work.title;

      const author = document.createElement("p");
      author.className = "work-author";
      author.textContent = `创作者：${work.author}`;

      const description = document.createElement("p");
      description.className = "work-description";
      description.textContent = work.description;

      const fallback = document.createElement("p");
      fallback.className = "work-fallback";
      fallback.textContent = work.fallback;

      const link = document.createElement("a");
      link.className = "button button-primary work-link";
      link.href = work.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.innerHTML = `${work.actionLabel}<span aria-hidden="true">↗</span>`;

      const copyright = document.createElement("p");
      copyright.className = "work-copyright";
      copyright.textContent = "外部作品 · 内容与版权归原作者所有";

      article.append(
        top,
        title,
        author,
        description,
        fallback,
        link,
        copyright
      );
      grid.appendChild(article);
    });
  }

  randomGameButton.addEventListener("click", openRandomGame);
  rerollGameButton.addEventListener("click", randomizeGame);
  closeRandomGameButton.addEventListener("click", closeRandomGame);

  renderExternalWorks();

  randomGameDialog.addEventListener("click", (event) => {
    if (event.target === randomGameDialog) {
      closeRandomGame();
    }
  });

  const mapPreviewDialog = document.getElementById("mapPreviewDialog");
  const openMapPreviewButtons =
    document.querySelectorAll("[data-open-map-preview]");
  const closeMapPreviewButton =
    document.getElementById("closeMapPreviewButton");
  const closeMapPreviewAction =
    document.getElementById("closeMapPreviewAction");

  function openMapPreview() {
    if (!mapPreviewDialog) return;

    if (typeof mapPreviewDialog.showModal === "function") {
      mapPreviewDialog.showModal();
    } else {
      showToast("当前浏览器不支持弹窗预览，请点击“开始游戏”查看地图。");
    }
  }

  function closeMapPreview() {
    if (mapPreviewDialog?.open) {
      mapPreviewDialog.close();
    }
  }

  openMapPreviewButtons.forEach((button) => {
    button.addEventListener("click", openMapPreview);
  });

  closeMapPreviewButton?.addEventListener("click", closeMapPreview);
  closeMapPreviewAction?.addEventListener("click", closeMapPreview);

  mapPreviewDialog?.addEventListener("click", (event) => {
    if (event.target === mapPreviewDialog) {
      closeMapPreview();
    }
  });
})();
