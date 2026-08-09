(() => {
  "use strict";

  let pendingResolve = null;
  let pendingOptions = null;
  let dialog = null;
  let title = null;
  let copy = null;

  function injectStyle() {
    if (document.getElementById("fajiaSkipReadStyle")) return;
    const style = document.createElement("style");
    style.id = "fajiaSkipReadStyle";
    style.textContent = `
      .fajia-skip-read-dialog{border:0;padding:0;background:transparent;max-width:min(92vw,740px);width:100%;}
      .fajia-skip-read-dialog::backdrop{background:rgba(34,29,31,.58);backdrop-filter:blur(7px);}
      .fajia-skip-read-card{box-sizing:border-box;width:100%;padding:38px 36px 34px;border-radius:34px;background:#fff;color:#332d2f;text-align:center;box-shadow:0 28px 70px rgba(40,30,34,.25);}
      .fajia-skip-read-eyebrow{margin:0;color:#f46d8a;font-size:15px;font-weight:900;letter-spacing:.16em;}
      .fajia-skip-read-title{margin:18px auto 0;max-width:560px;font-size:clamp(30px,5vw,46px);line-height:1.18;}
      .fajia-skip-read-copy{margin:22px auto 0;max-width:560px;color:#7b7376;font-size:18px;line-height:1.75;}
      .fajia-skip-read-actions{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:30px;}
      .fajia-skip-read-actions button{min-height:62px;border-radius:999px;font:inherit;font-size:20px;font-weight:900;cursor:pointer;}
      .fajia-skip-read-yes{border:0;background:#ff829b;color:#fff;}
      .fajia-skip-read-no{border:1px solid #eadde0;background:#fff;color:#332d2f;}
      @media(max-width:560px){.fajia-skip-read-card{padding:30px 20px 26px;border-radius:28px}.fajia-skip-read-actions{grid-template-columns:1fr}.fajia-skip-read-copy{font-size:16px}}
    `;
    document.head.appendChild(style);
  }

  function ensureDialog() {
    if (dialog) return;
    injectStyle();
    dialog = document.createElement("dialog");
    dialog.className = "fajia-skip-read-dialog";
    dialog.innerHTML = `
      <div class="fajia-skip-read-card">
        <p class="fajia-skip-read-eyebrow">BEFORE SKIPPING</p>
        <h2 class="fajia-skip-read-title"></h2>
        <p class="fajia-skip-read-copy"></p>
        <div class="fajia-skip-read-actions">
          <button class="fajia-skip-read-yes" type="button">读了</button>
          <button class="fajia-skip-read-no" type="button">没读</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    title = dialog.querySelector(".fajia-skip-read-title");
    copy = dialog.querySelector(".fajia-skip-read-copy");

    dialog.querySelector(".fajia-skip-read-yes").addEventListener("click", () => settle("read"));
    dialog.querySelector(".fajia-skip-read-no").addEventListener("click", () => settle("unread"));
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); settle(""); });
    dialog.addEventListener("click", (event) => { if (event.target === dialog) settle(""); });
  }

  function speak(code) {
    if (!code || !("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") return;
    try {
      const number = Number(String(code).replace(/^K/i, ""));
      const utterance = new window.SpeechSynthesisUtterance(`K${number}`);
      utterance.lang = "zh-CN";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    } catch (error) {}
  }

  function report(options, readStatus) {
    if (!options.code || !window.FAJIA_RUM || typeof window.FAJIA_RUM.reportEvent !== "function") return;
    window.FAJIA_RUM.reportEvent(
      "skip_question",
      options.code,
      options.game || "unknown",
      `${options.itemType || "question"}_${readStatus}`
    );
  }

  function settle(readStatus) {
    if (!pendingResolve) return;
    const resolve = pendingResolve;
    const options = pendingOptions;
    pendingResolve = null;
    pendingOptions = null;
    if (dialog?.open) dialog.close();
    if (!readStatus) { resolve(false); return; }
    if (readStatus === "unread") speak(options.code);
    report(options, readStatus);
    resolve(true);
  }

  function confirmSkip(options = {}) {
    ensureDialog();
    if (pendingResolve) return Promise.resolve(false);
    pendingOptions = options;
    const noun = options.noun || "这道题";
    title.textContent = `别忘了给直播间的观众读${noun}`;
    copy.textContent = "如果已经读给观众听，直接选择“读了”；如果还没读，选择“没读”。";
    return new Promise((resolve) => {
      pendingResolve = resolve;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else {
        const hasRead = window.confirm(`${title.textContent}\n\n已经读过了吗？\n确定 = 读了；取消 = 没读`);
        settle(hasRead ? "read" : "unread");
      }
    });
  }

  window.FAJIA_SKIP = { confirm: confirmSkip };
})();
