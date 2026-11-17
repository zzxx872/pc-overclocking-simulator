"use strict";
/* 硬件目录：真实型号，参数按 HWBOT 成绩游戏化简化。
 * 散热分级决定频率天花板：风冷 / 一体水冷约 6.2GHz，分体水冷约 6.5GHz，
 * 干冰约 6.9GHz，液氮约 9.2GHz（14900K 液氮世界纪录 9.21GHz）。 */
const OC = {
  START_MONEY: 8000,
  RECYCLE_RATE: 0.7,      // 换新件时旧件 7 折回收
  TOP_BONUS: 1000,        // 新登顶排行榜第 1 名的额外奖励
  STRESS_SECONDS: 10,     // 压力测试时长
  DEGRADE_VOLT: 1.48,     // 高压缩缸风险线
  DEGRADE_CHANCE: 0.25,   // 高压 + 测试失败时的缩缸概率
  THROTTLE_TEMP: 100,     // 过热降频线
  LB_SIZE: 10,
};

const CPUS = [
  { id: "14900k",  name: "Intel Core i9-14900K",  short: "Core i9 14900K",  brand: "INTEL", socket: "LGA1700", cores: "24核32线程", base: 3.2, boost: 6.0, baseV: 1.25, tdp: 253, price: 4199, score: 41000, single: 2257, ceil: 9.21 },
  { id: "14700k",  name: "Intel Core i7-14700K",  short: "Core i7 14700K",  brand: "INTEL", socket: "LGA1700", cores: "20核28线程", base: 3.4, boost: 5.6, baseV: 1.22, tdp: 219, price: 2899, score: 35000, single: 2140, ceil: 8.60 },
  { id: "14600k",  name: "Intel Core i5-14600K",  short: "Core i5 14600K",  brand: "INTEL", socket: "LGA1700", cores: "14核20线程", base: 3.5, boost: 5.3, baseV: 1.20, tdp: 181, price: 1999, score: 25000, single: 1990, ceil: 8.10 },
  { id: "9950x",   name: "AMD Ryzen 9 9950X",     short: "Ryzen 9 9950X",    brand: "AMD",   socket: "AM5",     cores: "16核32线程", base: 4.3, boost: 5.7, baseV: 1.20, tdp: 200, price: 3999, score: 42000, single: 2250, ceil: 8.70 },
  { id: "9800x3d", name: "AMD Ryzen 7 9800X3D",   short: "Ryzen 7 9800X3D",  brand: "AMD",   socket: "AM5",     cores: "8核16线程",  base: 4.7, boost: 5.2, baseV: 1.15, tdp: 120, price: 3499, score: 23000, single: 2090, ceil: 6.90, note: "X3D 超频上限低，但能效与游戏性能强" },
  { id: "9600x",   name: "AMD Ryzen 5 9600X",     short: "Ryzen 5 9600X",    brand: "AMD",   socket: "AM5",     cores: "6核12线程",  base: 3.9, boost: 5.4, baseV: 1.15, tdp: 105, price: 1599, score: 17000, single: 2190, ceil: 8.20 },
];

const BOARDS = [
  { id: "z790",  name: "Z790 旗舰主板", socket: "LGA1700", power: 5, price: 1899, desc: "豪华供电，超频幅度拉满" },
  { id: "b760m", name: "B760M 主板",    socket: "LGA1700", power: 3, price: 899,  desc: "供电一般，超频幅度受限" },
  { id: "x670e", name: "X670E 旗舰主板", socket: "AM5",    power: 5, price: 1799, desc: "豪华供电，超频幅度拉满" },
  { id: "b650m", name: "B650M 主板",    socket: "AM5",     power: 3, price: 799,  desc: "供电一般，超频幅度受限" },
];

const RAMS = [
  { id: "r5600", name: "DDR5 5600 CL36 32GB", freq: 5600, cl: 36, price: 649 },
  { id: "r6000", name: "DDR5 6000 CL30 32GB", freq: 6000, cl: 30, price: 899 },
  { id: "r6400", name: "DDR5 6400 CL32 32GB", freq: 6400, cl: 32, price: 1099 },
];

const COOLERS = [
  { id: "stock",  name: "盒装原装风冷", hw: "Air (Stock)",     cap: 130, price: 49,   capFreq: 6.2, base: 25,   rise: 60,  cold: 1.00 },
  { id: "tower",  name: "双塔风冷",     hw: "Air (Custom)",    cap: 220, price: 199,  capFreq: 6.2, base: 25,   rise: 60,  cold: 1.00 },
  { id: "aio240", name: "240 一体水冷", hw: "AIO Water",       cap: 280, price: 399,  capFreq: 6.2, base: 25,   rise: 58,  cold: 0.99 },
  { id: "aio360", name: "360 一体水冷", hw: "AIO Water",       cap: 350, price: 699,  capFreq: 6.2, base: 25,   rise: 56,  cold: 0.98 },
  { id: "custom", name: "分体水冷",     hw: "Water",           cap: 520, price: 1499, capFreq: 6.5, base: 22,   rise: 52,  cold: 0.96 },
  { id: "dice",   name: "干冰炮筒",     hw: "Dry Ice",         cap: 700, price: 1999, capFreq: 6.9, base: -55,  rise: 110, cold: 0.88 },
  { id: "ln2",    name: "液氮大炮",     hw: "Liquid Nitrogen", cap: 900, price: 2999, capFreq: 9.2, base: -165, rise: 160, cold: 0.82, desc: "终局散热 · 冲击 7GHz+ 的唯一选择" },
];

const MEM_FREQS = [4800, 5200, 5600, 6000, 6400, 6800, 7200, 7600, 8000];
const MEM_CLS = [28, 30, 32, 34, 36, 38, 40];

/* 体质档位：买入时在 0.85–1.15 之间随机，越高越能压低所需电压 */
function siliconGrade(q) {
  return q >= 1.10 ? "S" : q >= 1.03 ? "A" : q >= 0.95 ? "B" : "C";
}
