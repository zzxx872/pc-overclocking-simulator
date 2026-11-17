"use strict";
/* 超频模型：频率、电压、功耗、温度、稳定性之间的牵制关系。
 * 频率越高，所需电压越高；电压越高，功耗与温度越高；温度破线就降频。
 * 好体质的硅片（quality 高）天生省电压，冷散热（cold 系数小）也省电压。 */

/* 当前配置的频率天花板：散热上限、硅片理论极限、主板供电三者取最小 */
function freqCeiling() {
  const cpu = findCpu(S.build.cpu.id);
  const board = findBoard(S.build.board);
  const cooler = findCooler(S.build.cooler);
  let cap = Math.min(cooler.capFreq, cpu.ceil);
  if (board.power === 3) cap = Math.min(cap, Math.round(cpu.boost * 1.10 * 20) / 20);
  return Math.max(cap, cpu.base + 0.2);
}

/* 内存拉得太狠会拖稳定性：超过内存标称频率、压得过低的时序都要扣分 */
function memoryPenalty() {
  const ram = findRam(S.build.ram);
  const overFreq = Math.max(0, S.oc.memFreq - ram.freq) / 100 * 1.2;
  const tightCL = Math.max(0, ram.cl - S.oc.memCL) * 0.8;
  return overFreq + tightCL;
}

/* 内存系数：跑分加成来自内存频率与时序 */
function memoryCoef() {
  return (S.oc.memFreq / 6000) * Math.sqrt(30 / S.oc.memCL);
}

/* 核心计算：返回当前超频设置下的全部推演结果，未配齐返回 null */
function computeOC() {
  if (!buildComplete()) return null;
  const cpu = findCpu(S.build.cpu.id);
  const cooler = findCooler(S.build.cooler);
  const f = S.oc.freq, v = S.oc.volt;
  const ratio = f / cpu.boost;

  // 功耗：随频率比平方、电压比平方增长
  const power = cpu.tdp * ratio * ratio * Math.pow(v / cpu.baseV, 2);
  // 满载温度：散热底温 + 温升 ×（功耗 / 散热能力）
  const temp = cooler.base + cooler.rise * (power / cooler.cap);
  // 所需电压：频率越高越要电压；体质好、散热冷都能少要点
  let needed = cpu.baseV * (1 + (ratio - 1) * 1.35)
    * (1 - (S.build.cpu.quality - 1) * 1.1) * cooler.cold;
  needed = Math.max(0.85, needed);

  // 稳定性：电压每比所需多 0.01V 约 +2.4 分；高温与激进内存扣分
  let stab = 72 + (v - needed) * 240;
  if (temp > 90) stab -= (temp - 90) * 0.35;
  if (temp > OC.THROTTLE_TEMP) stab -= (temp - OC.THROTTLE_TEMP) * 1.2;
  stab -= memoryPenalty();
  stab = Math.max(2, Math.min(98, stab));

  // 过热降频：破 100°C 后有效频率打折
  let effFreq = f;
  if (temp > OC.THROTTLE_TEMP) {
    effFreq = f * Math.max(0.85, 1 - (temp - OC.THROTTLE_TEMP) * 0.004);
  }

  return {
    cpu, cooler, freq: f, volt: v, ratio,
    power, temp, needed, stab, effFreq,
    memCoef: memoryCoef(),
  };
}

/* 当前超频设置的唯一指纹：变了就说明要重新烤机 */
function ocFingerprint() {
  return [S.oc.freq, S.oc.volt, S.oc.memFreq, S.oc.memCL,
    S.build.cpu ? S.build.cpu.id : "", S.build.cooler || ""].join("|");
}
