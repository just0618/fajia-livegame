(() => {
  const toast = document.getElementById("toast");
  const comingSoonButtons = document.querySelectorAll("[data-coming-soon]");
  let toastTimer;

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");

    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2600);
  }

  comingSoonButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const gameName = button.dataset.comingSoon || "这款游戏";
      showToast(`${gameName}还在准备中，做好后会在这里开放。`);
    });
  });

  const mapPreviewDialog = document.getElementById("mapPreviewDialog");
  const openMapPreviewButtons = document.querySelectorAll("[data-open-map-preview]");
  const closeMapPreviewButton = document.getElementById("closeMapPreviewButton");
  const closeMapPreviewAction = document.getElementById("closeMapPreviewAction");

  function openMapPreview() {
    if (!mapPreviewDialog) {
      return;
    }

    if (typeof mapPreviewDialog.showModal === "function") {
      mapPreviewDialog.showModal();
    } else {
      showToast("当前浏览器不支持弹窗预览，请点击“进入游戏”查看地图。");
    }
  }

  function closeMapPreview() {
    if (mapPreviewDialog && mapPreviewDialog.open) {
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
