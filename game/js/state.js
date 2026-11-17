"use strict";
/* 存档：localStorage。SAVE 存当前配置与预算，LB 存三条本地榜。 */
const SAVE_KEY = "oclab_save_v2";
const LB_KEY = "oclab_lb_v2";

function defaultState() {
  return {
    money: OC.START_MONEY,
    build: { cpu: null, board: null, ram: null, cooler: null },
    oc: { freq: 0, volt: 1.25, memFreq: 6000, memCL: 30 },
    tested: false,
    sound: true,
    started: false,   // 是否点过标题界面的开始按钮
  };
}

function defaultBoards() {
  return { multi: [], single: [], freq: [] };
}

let S = defaultState();
let LB = defaultBoards();

try {
  const sv = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (sv && sv.build) S = Object.assign(defaultState(), sv);
} catch (e) { /* 存档损坏就重新开局 */ }
try {
  const lv = JSON.parse(localStorage.getItem(LB_KEY));
  if (lv && lv.multi) LB = Object.assign(defaultBoards(), lv);
} catch (e) { /* 榜单损坏就清空 */ }

function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
}
function saveBoards() {
  try { localStorage.setItem(LB_KEY, JSON.stringify(LB)); } catch (e) {}
}

/* ---- 小工具 ---- */
function $(id) { return document.getElementById(id); }
function fmtMoney(n) { return "¥" + Math.round(n).toLocaleString("zh-CN"); }
function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function findCpu(id) { return CPUS.find(function (c) { return c.id === id; }) || null; }
function findBoard(id) { return BOARDS.find(function (b) { return b.id === id; }) || null; }
function findRam(id) { return RAMS.find(function (r) { return r.id === id; }) || null; }
function findCooler(id) { return COOLERS.find(function (c) { return c.id === id; }) || null; }
function buildComplete() {
  const b = S.build;
  return !!(b.cpu && b.board && b.ram && b.cooler);
}
