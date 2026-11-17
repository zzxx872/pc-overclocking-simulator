"use strict";
/* 本地排行榜：R23 多核主榜、R23 单核榜、CPU 频率榜，各取前 10 名。
 * 成绩存在 localStorage，分数相同时先提交者靠前。 */

let lbTab = "multi";

const LB_DEFS = {
  multi:  { title: "Cinebench R23 · 多核", proj: "Cinebench R23 Multi",  unit: " cb" },
  single: { title: "Cinebench R23 · 单核", proj: "Cinebench R23 Single", unit: " cb" },
  freq:   { title: "CPU 频率纪录",          proj: "CPU Frequency",       unit: " MHz" },
};

function submitScore() {
  if (!pendingRun) return;
  const name = $("lb-name").value.trim() || "无名超频者";
  const base = {
    name, hw: pendingRun.hw, mhz: pendingRun.mhz,
    cooling: pendingRun.cooling, temp: pendingRun.temp, date: pendingRun.date,
  };
  LB.multi.push(Object.assign({ score: pendingRun.multi }, base));
  LB.single.push(Object.assign({ score: pendingRun.single }, base));
  LB.freq.push(Object.assign({ score: pendingRun.mhz }, base));
  Object.keys(LB).forEach(function (k) {
    LB[k].sort(function (a, b) { return b.score - a.score; });
    LB[k] = LB[k].slice(0, OC.LB_SIZE);
  });
  saveBoards();
  pendingRun = null;
  $("btn-submit").disabled = true;
  $("btn-submit").textContent = "已上榜 ✔";
  sfx.buy();
  renderLB();
  toast("🏆 成绩已提交到三个榜单，去看看排名吧");
}

function renderLB() {
  const def = LB_DEFS[lbTab];
  const rows = LB[lbTab];
  let tabsHtml = '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">';
  Object.keys(LB_DEFS).forEach(function (k) {
    tabsHtml += '<button class="btn' + (k === lbTab ? "" : " ghost") + '" data-ltab="' + k +
      '" style="flex:1 1 auto">' + LB_DEFS[k].title + "</button>";
  });
  tabsHtml += "</div>";

  if (!rows.length) {
    $("lb-wrap").innerHTML = tabsHtml +
      '<div class="empty-lb">这个榜单还空着——来跑个分，把你的名字刻在第一行。</div>';
  } else {
    let h = tabsHtml +
      '<table><thead><tr><th>排名</th><th class="lb-proj">跑分项目</th><th>分数</th>' +
      '<th>硬件 @ 频率</th><th>散热</th><th>玩家</th><th class="lb-hide">温度</th>' +
      '<th class="lb-hide">日期</th></tr></thead><tbody>';
    rows.forEach(function (r, i) {
      h += '<tr class="' + (i === 0 ? "top1" : "") + '"><td class="rank">' + (i + 1) +
        '</td><td class="lb-proj">' + def.proj + "</td><td><b>" +
        r.score.toLocaleString() + def.unit + "</b></td><td>" +
        r.hw + " @ " + r.mhz.toLocaleString() + " MHz</td><td>" + r.cooling +
        '</td><td class="name">' + escHtml(r.name) + '</td><td class="lb-hide">' +
        r.temp + '°C</td><td class="lb-hide">' + r.date + "</td></tr>";
    });
    h += "</tbody></table>";
    $("lb-wrap").innerHTML = h;
  }
  document.querySelectorAll("[data-ltab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      lbTab = this.getAttribute("data-ltab");
      sfx.click();
      renderLB();
    });
  });
}

/* 排行榜上的当前最佳多核分（标题界面展示用） */
function bestMultiScore() {
  return LB.multi.length ? LB.multi[0].score : 0;
}
