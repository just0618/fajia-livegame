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
})();
