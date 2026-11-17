"use strict";
/* 音效：WebAudio 现场合成的小 blip，不加载任何音频文件。
 * 必须在用户手势之后才能初始化 AudioContext，所以第一次交互时懒创建。 */
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = AC ? new AC() : null;
    } catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function beep(freq, dur, type, gain) {
  if (!S.sound) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.04, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (e) { /* 音频失败不影响游戏 */ }
}

const sfx = {
  click: function () { beep(660, 0.06, "square", 0.03); },
  buy: function () { beep(523, 0.08, "triangle", 0.05); beep(784, 0.12, "triangle", 0.05); },
  pass: function () { beep(523, 0.1, "sine", 0.05); setTimeout(function () { beep(659, 0.1, "sine", 0.05); }, 110); setTimeout(function () { beep(784, 0.16, "sine", 0.05); }, 220); },
  score: function () { beep(880, 0.12, "triangle", 0.05); setTimeout(function () { beep(1174, 0.2, "triangle", 0.05); }, 130); },
  fail: function () { beep(110, 0.5, "sawtooth", 0.06); },
};
