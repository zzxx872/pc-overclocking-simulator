"use strict";
/* 界面：标题 / 主界面 / 结算三个屏幕的切换，顶部状态栏，
 * 超频台读数，以及标签页（支持键盘 1–4 快捷键）。 */

let lastFingerprint = "";
let toastTimer = null;

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
}

/* ---- 三个屏幕 ---- */
function showTitle() {
  $("screen-title").style.display = "flex";
  $("app").hidden = true;
  $("screen-results").hidden = true;
  const best = bestMultiScore();
  $("title-best").textContent = best > 0
    ? "🏆 本地最佳：R23 多核 " + best.toLocaleString() + " cb"
    : "还没有跑分记录——第一个登顶的人就是你";
}

function showApp() {
  $("screen-title").style.display = "none";
  $("app").hidden = false;
  $("screen-results").hidden = true;
  S.started = true;
  saveGame();
  renderAll();
}

function showResults(run) {
  $("res-kicker").textContent = run.isTop ? "🏆 新纪录！登顶第 1 名" : "跑分完成";
  $("res-score").textContent = run.multi.toLocaleString() + " cb";
  $("res-meta").textContent = "Cinebench R23 多核 · 单核 " + run.single.toLocaleString() +
    " cb · " + run.hw + " @ " + run.mhz.toLocaleString() + " MHz · " +
    run.temp + "°C · " + run.cooling;
  $("res-money").textContent = "💰 跑分奖金 +" + fmtMoney(run.reward) +
    (run.isTop ? "（含新登顶第 1 名奖励 ¥1,000）" : "");
  const rank = LB.multi.findIndex(function (e) { return run.multi > e.score; });
  $("res-rank").innerHTML = rank === 0
    ? "当前排名：<b>第 1 名</b> —— 提交成绩，把名字刻上榜首"
    : (rank > 0
      ? "当前排名：第 <b>" + (rank + 1) + " 名</b> —— 提交成绩，锁定这个位置"
      : "提交成绩，上榜留名");
  $("btn-submit").disabled = false;
  $("btn-submit").textContent = "提交成绩";
  $("screen-results").hidden = false;
}

function hideResults() {
  $("screen-results").hidden = true;
  pendingRun = null;
}

/* ---- 标签页 ---- */
function switchTab(name) {
  document.querySelectorAll(".tab").forEach(function (t) {
    t.setAttribute("aria-selected", t.getAttribute("data-tab") === name ? "true" : "false");
  });
  document.querySelectorAll(".panel").forEach(function (p) {
    p.classList.toggle("on", p.id === "panel-" + name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---- 顶部状态栏 ---- */
function renderStatus() {
  $("sb-money").textContent = fmtMoney(S.money);
  const b = S.build;
  function chip(label, val, q) {
    return '<span class="chip' + (val ? "" : " empty") + '">' + label + " <b>" + (val || "未装") + "</b>" +
      (q ? ' <span class="grade q-' + q + '">' + q + "档</span>" : "") + "</span>";
  }
  let h = "";
  h += chip("CPU", b.cpu ? findCpu(b.cpu.id).short : null, b.cpu ? siliconGrade(b.cpu.quality) : null);
  h += chip("主板", b.board ? findBoard(b.board).name : null);
  h += chip("内存", b.ram ? findRam(b.ram).name.replace("DDR5 ", "") + " DDR5" : null);
  h += chip("散热", b.cooler ? findCooler(b.cooler).hw : null);
  $("sb-build").innerHTML = h;
}

/* ---- 超频台 ---- */
function renderOC() {
  const hasCore = !!(S.build.cpu && S.build.board && S.build.cooler);
  const rgF = $("rg-freq"), rgV = $("rg-volt");
  rgF.disabled = !hasCore;
  rgV.disabled = !hasCore;
  $("sel-memfreq").disabled = !S.build.ram;
  $("sel-memcl").disabled = !S.build.ram;
  if (S.build.cpu) {
    const cpu = findCpu(S.build.cpu.id);
    rgF.min = cpu.base;
    rgF.max = buildComplete() ? freqCeiling() : cpu.boost * 1.2;
    rgF.step = 0.05;
    if (S.oc.freq < parseFloat(rgF.min)) S.oc.freq = parseFloat(rgF.min);
    if (S.oc.freq > parseFloat(rgF.max)) S.oc.freq = parseFloat(rgF.max);
    rgF.value = S.oc.freq;
    rgV.value = S.oc.volt;
    $("s-freq-min").textContent = cpu.base.toFixed(1) + " GHz 基频";
    $("s-freq-max").textContent = "上限 " + parseFloat(rgF.max).toFixed(2) + " GHz";
    $("s-freq-note").textContent = buildComplete()
      ? ("散热上限 " + findCooler(S.build.cooler).capFreq.toFixed(1) + "G · " + findCooler(S.build.cooler).hw)
      : "";
  }
  updateReadouts();
}

function updateReadouts() {
  const c = computeOC();
  $("v-freq").innerHTML = S.oc.freq ? S.oc.freq.toFixed(2) + " <small>GHz</small>" : "—";
  $("v-volt").innerHTML = S.oc.volt.toFixed(2) + " <small>V</small>";
  if (!c) {
    $("ro-freq").textContent = "—";
    $("ro-volt").textContent = "—";
    $("ro-power").textContent = "—";
    $("ro-temp").textContent = "—";
    $("ro-stab-num").textContent = "—";
    $("ro-stab-txt").textContent = "";
    $("ro-stab").style.width = "0%";
    $("oc-warn").innerHTML = '<span class="w">⚠ 配置还不完整：先到「装机」页配齐 CPU、主板、内存、散热。</span>';
    $("oc-cpu-info").textContent = "";
    return;
  }
  $("ro-freq").innerHTML = c.freq.toFixed(2) + " <small>GHz</small>" +
    (c.effFreq < c.freq ? ' <small style="color:var(--bad)">过热降频→' + c.effFreq.toFixed(2) + "</small>" : "");
  $("ro-volt").innerHTML = c.volt.toFixed(2) + " <small>/ 需 " + c.needed.toFixed(2) + " V</small>";
  $("ro-power").innerHTML = Math.round(c.power) + " <small>W</small>";
  $("ro-temp").innerHTML = Math.round(c.temp) + " <small>°C</small>";
  const tb = $("ro-temp-box");
  tb.className = "ro " + (c.temp > OC.THROTTLE_TEMP ? "hot" : c.temp > 85 ? "warm" : "cool");
  $("ro-stab").style.width = c.stab + "%";
  $("ro-stab").style.background = c.stab >= 75 ? "var(--acc2)" : c.stab >= 45 ? "var(--warn)" : "var(--bad)";
  $("ro-stab-num").textContent = Math.round(c.stab) + "%";
  $("ro-stab-txt").textContent = c.stab >= 85 ? "稳如老狗" : c.stab >= 65 ? "比较稳" : c.stab >= 45 ? "有点悬，看脸" : "基本必蓝屏";
  let w = "";
  if (c.volt < c.needed - 0.005) w += '<span class="b">电压不足：还差 ' + (c.needed - c.volt).toFixed(2) + "V，烤机大概率蓝屏。</span> ";
  if (c.temp > OC.THROTTLE_TEMP) w += '<span class="b">温度破 100°C：会降频，严重时测试失败。换更强散热或降压降频。</span> ';
  else if (c.temp > 85) w += '<span class="w">温度偏高（&gt;85°C），离降频不远了。</span> ';
  if (c.volt >= OC.DEGRADE_VOLT) w += "<span class=\"w\">⚠ 1.48V+ 高压区：测试失败有 25% 概率缩缸，体质永久下降！</span> ";
  if (memoryPenalty() > 8) w += '<span class="w">内存参数拉得太激进，稳定性被拖后腿。</span> ';
  if (!w) w = '<span class="g">参数健康，这个设置值得一烤。</span>';
  $("oc-warn").innerHTML = w;
  const cp = S.build.cpu;
  $("oc-cpu-info").innerHTML = "当前硅片：" + c.cpu.short + " · 体质 <b>" + cp.quality.toFixed(2) + "</b> " +
    '<span class="grade q-' + siliconGrade(cp.quality) + '">' + siliconGrade(cp.quality) + " 档</span>" +
    (cp.degraded ? ' · <span style="color:var(--bad)">已缩缸 ×' + cp.degraded + "</span>" : "") +
    "<br>硅片理论极限 ≈ " + c.cpu.ceil.toFixed(2) + " GHz（14900K 液氮世界纪录 9.21 GHz）";
}

/* 超频参数变了：跑分资格作废，得重新烤机 */
function markDirty() {
  if (ocFingerprint() !== lastFingerprint) {
    S.tested = false;
    lastFingerprint = ocFingerprint();
    saveGame();
    refreshBenchBtn();
  }
  updateReadouts();
}

function renderAll() {
  renderStatus();
  renderShop();
  renderOC();
  renderLB();
  refreshBenchBtn();
}
