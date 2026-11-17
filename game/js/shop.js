"use strict";
/* 商店：买硬件、换硬件（旧件 7 折回收抵扣）、插槽兼容检查。 */

function ownedItem(slot) {
  if (slot === "cpu") return S.build.cpu ? findCpu(S.build.cpu.id) : null;
  if (slot === "board") return S.build.board ? findBoard(S.build.board) : null;
  if (slot === "ram") return S.build.ram ? findRam(S.build.ram) : null;
  return S.build.cooler ? findCooler(S.build.cooler) : null;
}

function slotItem(slot, id) {
  if (slot === "cpu") return findCpu(id);
  if (slot === "board") return findBoard(id);
  if (slot === "ram") return findRam(id);
  return findCooler(id);
}

/* 换新件的实付价：标价减去旧件 7 折回收 */
function netCost(slot, item) {
  const old = ownedItem(slot);
  if (!old) return item.price;
  return item.price - Math.round(old.price * OC.RECYCLE_RATE);
}

/* 插槽冲突提示：CPU 与主板必须同平台 */
function slotConflict(slot, item) {
  const b = S.build;
  if (slot === "cpu" && b.board) {
    const bd = findBoard(b.board);
    if (bd.socket !== item.socket) return "与已装主板 " + bd.name + "（" + bd.socket + "）插槽不匹配";
  }
  if (slot === "board" && b.cpu) {
    const cp = findCpu(b.cpu.id);
    if (cp.socket !== item.socket) return "与已装 CPU（" + cp.socket + "）插槽不匹配";
  }
  return null;
}

function buy(slot, id) {
  const item = slotItem(slot, id);
  const conflict = slotConflict(slot, item);
  if (conflict) { toast("⛔ " + conflict); return; }
  const cost = netCost(slot, item);
  if (S.money < cost) {
    toast("💸 预算不足：还差 " + fmtMoney(cost - S.money) + "，先跑分赚钱吧");
    return;
  }
  S.money -= cost;
  const tradedIn = cost < item.price;
  if (slot === "cpu") {
    // 每颗新 CPU 入手时抽一次体质
    const q = 0.85 + Math.random() * 0.30;
    S.build.cpu = { id: id, quality: Math.round(q * 100) / 100, degraded: 0 };
    S.oc.freq = item.boost;
    S.oc.volt = item.baseV;
    toast("🎲 新 CPU 入手：" + item.short + "，体质 " + S.build.cpu.quality.toFixed(2) +
      "（" + siliconGrade(q) + " 档）" + (tradedIn ? "，旧件已 7 折回收" : ""));
  } else {
    S.build[slot] = id;
    toast("🔧 已装上 " + item.name + (tradedIn ? "，旧件已 7 折回收" : ""));
  }
  if (slot === "ram") {
    const ram = findRam(id);
    S.oc.memFreq = ram.freq;
    S.oc.memCL = ram.cl;
  }
  S.tested = false;
  saveGame();
  sfx.buy();
  renderAll();
}

function cardHTML(slot, item, owned, specsHTML, extraTag) {
  const conflict = slotConflict(slot, item);
  const cost = netCost(slot, item);
  const afford = S.money >= cost;
  const disabled = owned || conflict || !afford;
  // 换便宜件时实付为负：等于旧件 7 折回收多出的钱退回，按钮就明说返还多少
  const btnTxt = owned ? "已装机" : conflict ? "插槽不匹配" : !afford ? "预算不足"
    : cost < 0 ? "换装 +" + fmtMoney(-cost) : "购买 " + fmtMoney(Math.max(cost, 0));
  const recycleTag = (!owned && ownedItem(slot))
    ? '<span class="recycle">含旧件回收抵扣</span>' : "";
  return '<div class="card' + (owned ? " owned" : "") + '"><h3>' + item.name +
    '<span class="brand">' + (item.brand || "") + "</span></h3>" +
    '<div class="specs">' + specsHTML + "</div>" + (extraTag || "") +
    '<div class="foot"><span class="price">' + fmtMoney(item.price) + "</span>" + recycleTag +
    '<button class="btn" data-buy="' + slot + ":" + item.id + '" ' +
    (disabled ? "disabled" : "") + ">" + btnTxt + "</button></div>" +
    (conflict ? '<span class="tag no">' + conflict + "</span>" : "") + "</div>";
}

function renderShop() {
  let h = "";
  CPUS.forEach(function (it) {
    const owned = S.build.cpu && S.build.cpu.id === it.id;
    const qTag = owned
      ? '<span class="tag ok">本颗体质 ' + S.build.cpu.quality.toFixed(2) + " · " +
        '<span class="grade q-' + siliconGrade(S.build.cpu.quality) + '">' +
        siliconGrade(S.build.cpu.quality) + " 档</span>" +
        (S.build.cpu.degraded ? " · 已缩缸 ×" + S.build.cpu.degraded : "") + "</span>"
      : '<span class="tag">体质买入时随机抽取</span>';
    h += cardHTML("cpu", it, owned,
      '<span class="tag skt">' + it.socket + "</span> " + it.cores +
      "<br>基频 <b>" + it.base.toFixed(1) + "GHz</b> · 加速 <b>" + it.boost.toFixed(1) + "GHz</b>" +
      "<br>默认电压 " + it.baseV.toFixed(2) + "V · TDP " + it.tdp + "W" +
      "<br>R23 多核基数 " + it.score.toLocaleString() + " cb" + (it.note ? "<br>" + it.note : ""),
      qTag);
  });
  $("shop-cpu").innerHTML = h;

  h = "";
  BOARDS.forEach(function (it) {
    h += cardHTML("board", it, S.build.board === it.id,
      '<span class="tag skt">' + it.socket + "</span> DDR5 · 供电 <b>" + it.power + " 级</b><br>" +
      it.desc + (it.power === 3 ? "<br>频率上限 ≈ 加速频率 ×1.10" : "<br>频率上限由散热与硅片体质决定"));
  });
  $("shop-board").innerHTML = h;

  h = "";
  RAMS.forEach(function (it) {
    h += cardHTML("ram", it, S.build.ram === it.id,
      "容量 <b>32GB</b>（2×16）<br>标称 <b>" + it.freq + " MT/s</b> · 时序 <b>CL" + it.cl +
      "</b><br>超频台可继续拉频率 / 压时序");
  });
  $("shop-ram").innerHTML = h;

  h = "";
  COOLERS.forEach(function (it) {
    h += cardHTML("cooler", it, S.build.cooler === it.id,
      "HWBOT 分级 <b>" + it.hw + "</b><br>散热能力 <b>" + it.cap + "W</b> · 频率上限 <b>" +
      it.capFreq.toFixed(1) + "GHz</b>" + (it.desc ? "<br>" + it.desc : ""));
  });
  $("shop-cooler").innerHTML = h;

  document.querySelectorAll("[data-buy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const p = this.getAttribute("data-buy").split(":");
      buy(p[0], p[1]);
    });
  });
}
