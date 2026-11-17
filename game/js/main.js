"use strict";
/* 启动：填内存下拉框，绑所有按钮与滑杆，键盘 1–4 切标签页。
 * 有存档且已点过开始就直接进主界面，否则先停在标题界面。 */
(function init() {
  const mf = $("sel-memfreq"), mc = $("sel-memcl");
  MEM_FREQS.forEach(function (f) {
    const o = document.createElement("option");
    o.value = f;
    o.textContent = f + " MT/s";
    mf.appendChild(o);
  });
  MEM_CLS.forEach(function (cl) {
    const o = document.createElement("option");
    o.value = cl;
    o.textContent = "CL" + cl;
    mc.appendChild(o);
  });
  mf.value = S.oc.memFreq;
  mc.value = S.oc.memCL;
  $("mem-note").textContent = "内存系数 =（频率/6000）× √(30/CL)，拉太狠会拖稳定性";
  $("btn-sound").textContent = S.sound ? "🔊 音效开" : "🔇 音效关";

  $("btn-start").addEventListener("click", function () {
    ensureAudio();
    sfx.buy();
    showApp();
  });
  $("btn-sound").addEventListener("click", function () {
    S.sound = !S.sound;
    saveGame();
    this.textContent = S.sound ? "🔊 音效开" : "🔇 音效关";
    if (S.sound) sfx.click();
  });

  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      sfx.click();
      switchTab(this.getAttribute("data-tab"));
    });
  });
  document.addEventListener("keydown", function (e) {
    if ($("app").hidden || !$("screen-results").hidden) return;
    const map = { Digit1: "shop", Digit2: "oc", Digit3: "run", Digit4: "lb" };
    if (map[e.code]) switchTab(map[e.code]);
  });

  $("rg-freq").addEventListener("input", function () {
    S.oc.freq = parseFloat(this.value);
    markDirty();
  });
  $("rg-volt").addEventListener("input", function () {
    S.oc.volt = parseFloat(this.value);
    markDirty();
  });
  mf.addEventListener("change", function () {
    S.oc.memFreq = parseInt(this.value, 10);
    markDirty();
  });
  mc.addEventListener("change", function () {
    S.oc.memCL = parseInt(this.value, 10);
    markDirty();
  });

  $("btn-gotest").addEventListener("click", function () { sfx.click(); switchTab("run"); });
  $("btn-stress").addEventListener("click", runStress);
  $("btn-bench").addEventListener("click", runBench);
  $("btn-submit").addEventListener("click", submitScore);
  $("btn-again").addEventListener("click", function () {
    sfx.click();
    hideResults();
    refreshBenchBtn();
  });
  $("btn-back-shop").addEventListener("click", function () {
    sfx.click();
    hideResults();
    switchTab("shop");
  });
  $("btn-to-lb").addEventListener("click", function () {
    sfx.click();
    hideResults();
    switchTab("lb");
  });
  $("bsod-ok").addEventListener("click", function () {
    $("bsod").classList.remove("on");
    switchTab("oc");
  });
  $("btn-clear-lb").addEventListener("click", function () {
    LB = defaultBoards();
    saveBoards();
    renderLB();
    toast("排行榜已清空");
  });
  $("btn-reset").addEventListener("click", function () {
    S = defaultState();
    LB = defaultBoards();
    saveGame();
    saveBoards();
    $("sel-memfreq").value = 6000;
    $("sel-memcl").value = 30;
    lastFingerprint = ocFingerprint();
    drawCurve([], 0, 120);
    renderAll();
    showTitle();
    toast("已重置：¥8,000 重新开局");
  });

  drawCurve([], 0, 120);
  if (S.started) {
    showApp();
  } else {
    showTitle();
  }
  lastFingerprint = ocFingerprint();
  refreshBenchBtn();
})();
