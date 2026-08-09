(() => {
  "use strict";

  const DISCLOSURE_TEXT = "本站使用腾讯云前端监控统计页面访问与游戏操作情况，用于功能维护与题库优化；不记录答题内容及用户输入信息。";
  const config = window.FAJIA_RUM_CONFIG || {};
  let aegis = null;

  function initAegis() {
    if (!config.appId || typeof window.Aegis !== "function") return;

    try {
      aegis = new window.Aegis({
        id: config.appId,
        reportApiSpeed: config.reportApiSpeed === true,
        reportAssetSpeed: config.reportAssetSpeed === true,
        spa: config.spa === true,
        hostUrl: config.hostUrl || "https://rumt-zh.com"
      });
    } catch (error) {
      aegis = null;
    }
  }

  function reportEvent(name, ext1 = "", ext2 = "", ext3 = "") {
    if (!aegis || typeof aegis.reportEvent !== "function") return false;

    try {
      aegis.reportEvent({
        name: name,
        ext1: ext1,
        ext2: ext2,
        ext3: ext3
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  function ensureDisclosure() {
    if (document.querySelector("[data-rum-disclosure]")) return;

    const note = document.createElement("aside");
    note.setAttribute("data-rum-disclosure", "");
    note.setAttribute("aria-label", "访问与功能统计说明");
    note.textContent = DISCLOSURE_TEXT;

    Object.assign(note.style, {
      boxSizing: "border-box",
      width: "calc(100% - 32px)",
      maxWidth: "1080px",
      margin: "24px auto 30px",
      padding: "12px 16px",
      border: "1px solid rgba(120, 105, 110, 0.14)",
      borderRadius: "14px",
      background: "rgba(255,255,255,0.56)",
      color: "#7a7074",
      fontSize: "12px",
      lineHeight: "1.7",
      textAlign: "center"
    });

    document.body.appendChild(note);
  }

  initAegis();

  window.FAJIA_RUM = {
    reportEvent: reportEvent,
    isConfigured: Boolean(config.appId && aegis)
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureDisclosure, { once: true });
  } else {
    ensureDisclosure();
  }
})();
