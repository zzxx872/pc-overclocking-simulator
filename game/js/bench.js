"use strict";
/* 压力测试与跑分：10 秒烤机画温度曲线，通过后解锁跑分；
 * 跑分按 HWBOT 校准的 R23 分数换奖金，登顶第 1 名额外 +¥1,000。 */

let testing = false;
let pendingRun = null;

/* ---- 温度曲线 ---- */
function drawCurve(pts, minT, maxT) {
  const cv = $("curve"), ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = "#232c36";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(0, H * i / 4); ctx.lineTo(W, H * i / 4); ctx.stroke();
  }
  function Y(t) { return H - ((t - minT) / (maxT - minT)) * H; }
  if (maxT > OC.THROTTLE_TEMP && minT < OC.THROTTLE_TEMP) {
    ctx.strokeStyle = "rgba(255,82,82,.55)";
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(0, Y(OC.THROTTLE_TEMP)); ctx.lineTo(W, Y(OC.THROTTLE_TEMP)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,82,82,.8)";
    ctx.font = "20px monospace";
    ctx.fillText("100°C", 8, Y(OC.THROTTLE_TEMP) - 8);
  }
  if (pts.length < 2) return;
  ctx.strokeStyle = "#ffb300";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  pts.forEach(function (p, i) {
    const x = p.x / (OC.STRESS_SECONDS * 1000) * W, y = Y(p.t);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

/* ---- 蓝屏 ---- */
function showBSOD(code, extra) {
  $("bsod-code").textContent = "STOP CODE: " + code;
  $("bsod-extra").textContent = extra || "";
  $("bsod").classList.add("on");
}

/* ---- 压力测试 ---- */
function runStress() {
  const c = computeOC();
  if (!c) { toast("先配齐四件套再烤机"); return; }
  if (testing) return;
  testing = true;
  $("btn-stress").disabled = true;
  $("btn-bench").disabled = true;
  $("ts-state").textContent = "烤机中…";
  sfx.click();

  const roll = Math.random() * 100;
  const hardVolt = c.volt < c.needed - 0.12;
  const hardTemp = c.temp > 115;
  const success = !hardVolt && !hardTemp && (roll < c.stab);
  const failAt = success ? 100 : 25 + Math.random() * 55;
  const code = (hardVolt || c.volt < c.needed) ? "VOLTAGE_TOO_LOW"
    : (c.temp > OC.THROTTLE_TEMP ? "THERMAL_OVERHEAT"
    : (memoryPenalty() > 10 && Math.random() < 0.5 ? "MEMORY_UNSTABLE" : "CLOCK_WATCHDOG_TIMEOUT"));

  const pts = [];
  let ticks = 0;
  const minT = Math.min(0, c.cooler.base - 10);
  const maxT = Math.max(120, c.temp * 1.15);
  let cur = c.cooler.base < 0 ? c.cooler.base : 25;

  const iv = setInterval(function () {
    ticks++;
    const el = ticks * 100;
    const pct = Math.min(100, ticks);
    cur += (c.temp - cur) * 0.055 + (Math.random() - 0.5) * 1.6;
    pts.push({ x: el, t: cur });
    drawCurve(pts, minT, maxT);
    $("test-prog").style.width = pct + "%";
    $("ts-pct").textContent = Math.floor(pct) + "%";
    $("ts-temp").textContent = Math.round(cur) + "°C";
    $("ts-power").textContent = Math.round(c.power * (0.97 + Math.random() * 0.06)) + "W";
    if (pct >= failAt) {
      clearInterval(iv);
      testing = false;
      $("btn-stress").disabled = false;
      if (success) {
        S.tested = true;
        lastFingerprint = ocFingerprint();
        saveGame();
        $("ts-state").textContent = "✔ 通过！可以跑分了";
        sfx.pass();
        toast("✔ 压力测试通过：" + c.freq.toFixed(2) + " GHz @ " + c.volt.toFixed(2) + "V 稳住了");
      } else {
        S.tested = false;
        saveGame();
        $("ts-state").textContent = "✘ 蓝屏失败";
        sfx.fail();
        let extra = "";
        if (c.volt >= OC.DEGRADE_VOLT && Math.random() < OC.DEGRADE_CHANCE && S.build.cpu.quality > 0.80) {
          const drop = 0.04 + Math.random() * 0.03;
          S.build.cpu.quality = Math.max(0.80, Math.round((S.build.cpu.quality - drop) * 100) / 100);
          S.build.cpu.degraded++;
          saveGame();
          extra = "⚠ 缩缸了！高压把硅片电迁移打伤，体质永久降至 " +
            S.build.cpu.quality.toFixed(2) + "（" + siliconGrade(S.build.cpu.quality) + " 档）。";
        }
        showBSOD(code, extra);
        renderAll();
      }
      refreshBenchBtn();
    }
  }, 100);
}

/* ---- 跑分 ---- */
function refreshBenchBtn() {
  const b = $("btn-bench");
  if (S.tested && computeOC()) {
    b.disabled = false;
    b.textContent = "开始跑分（Cinebench R23）";
  } else {
    b.disabled = true;
    b.textContent = "跑分（需先通过压力测试）";
  }
}

function runBench() {
  const c = computeOC();
  if (!c || !S.tested) return;
  $("btn-bench").disabled = true;
  sfx.click();

  // 分数：CPU 基数 × 频率比 ^1.8 × 内存加成，带一点实测抖动
  const memAdj = 1 + (c.memCoef - 1) * 0.35;
  const effRatio = c.effFreq / c.cpu.boost;
  const multi = Math.round(c.cpu.score * Math.pow(effRatio, 1.8) * memAdj * (0.99 + Math.random() * 0.02));
  const single = Math.round(c.cpu.single * Math.pow(effRatio, 1.5) * (1 + (c.memCoef - 1) * 0.15) * (0.99 + Math.random() * 0.02));
  const mhz = Math.round(c.effFreq * 1000);
  let reward = Math.round(multi / 100);
  const prevTop = LB.multi.length ? LB.multi[0].score : 0;
  const isTop = multi > prevTop;
  if (isTop) reward += OC.TOP_BONUS;
  S.money += reward;
  saveGame();

  pendingRun = {
    multi, single, mhz,
    hw: c.cpu.short, cooling: c.cooler.hw, temp: Math.round(c.temp),
    date: new Date().toLocaleDateString("zh-CN"),
    reward, isTop,
  };
  sfx.score();
  showResults(pendingRun);
  renderStatus();
  toast("🏁 跑分完成：" + multi.toLocaleString() + " cb，奖金 " + fmtMoney(reward) + " 已到账");
}
