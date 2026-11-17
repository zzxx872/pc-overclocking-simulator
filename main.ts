// 超频实验室 · make.fun best-game-01 参赛入口（Node 22，标准库 only）。
// 把本仓库的 game/ 与 screenshots/ 原样拷到 /output（本地用 MAKEFUN_OUTPUT_DIR
// 代替），再用 kit 自带的 vendor/makefun-game.ts 生成 dossier.json——
// 评委读到的游戏大纲就来自这份 dossier。跑法：
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const gameDir = join(here, "game");
const shotsDir = join(here, "screenshots");

if (!existsSync(join(gameDir, "index.html"))) {
  throw new Error("game/index.html 缺失：先在 game/ 里把游戏建好再跑 main.ts");
}

function countFiles(dir: string): number {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    n += statSync(p).isDirectory() ? countFiles(p) : 1;
  }
  return n;
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, "game"), { recursive: true });
mkdirSync(join(out, "screenshots"), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(out, "screenshots"), { recursive: true });
}

// 与门禁一致的上限：dossier 文本 160 KiB；截图最多 4 张、每张 ≤256 KiB；
// game/ 最多 993 个文件、共 ≤48 MiB、单路径 ≤1000 字节。
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, "dossier.json"), dossier);

console.log(
  `dossier.json 已写：game/ ${countFiles(gameDir)} 个文件，` +
    `screenshots/ ${existsSync(shotsDir) ? readdirSync(shotsDir).length : 0} 张截图，` +
    `dossier ${dossier.length} 字节`,
);
