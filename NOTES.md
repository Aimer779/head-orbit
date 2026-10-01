# head orbit

二创骨架。视觉机器来自 [internet.bizar.ro](https://internet.bizar.ro/)（Luis Bizarro）：圆柱面板、CRT、目光相机、ORCA/Pilot。人物和面板改成可替换槽位。学习用，不公开部署。

`internet-bizar/` 仍是原站忠实复刻，这里不改。

## 怎么跑

```text
pnpm install
node serve.mjs
```

http://127.0.0.1:5184/ 。点画面开始。`?gui` 开参数。

## 你丢图的地方

1. 人物：`assets/character.png` 来自 `E:\Downloads\Shy_Whaletail_Maid_in_Monochrome.png`（1254²，透明底）。头心 `[629, 430]` 对在捂脸双手稍上。有透明通道会关掉黑底抠像，深色头发不会被抠穿。换图时改 `character.headPx` / `sizePx`。
2. 窗口环现在是故事窗，不是占位框。素材在 `docs/whale-story.md`。两小节切一场：开机人格 → 思考链 → 便宜货 → 饭碗 → 摸鱼下班 → 用户怒了 → DeepSleep，再循环。中间有一块活的 CoT 在滚字。

3. 仍可把图丢进 `assets/panels/` 并写进 `content.json` 的 `panels`，会和故事窗混着抽。贴纸用 `"transparent": true`。

4. 署名：角色是社区二创，非官方。女仆版按上善无形（溟月）和 ZipZipPipe 的声明，默认非商用。

5. 窗口环里的活画布：
   - 像素鲸来自 [lhh010/dsh-ui-whale](https://github.com/lhh010/dsh-ui-whale)（BSD-3-Clause），眨眼/摆尾/喷水/睡觉 Z 跟故事场面走。
   - 下潜 WebP 来自 [LeemanCheung/dsh-whale-animation](https://github.com/LeemanCheung/dsh-whale-animation)（MIT）。Dive 1.98s、Classic 10.5s，当前圈放完才切。思考/开机要 Dive，其它场面要 Classic。

左下角是开机台。格子第一行不再写 Daft Punk，改成 `#.eat.rice.little.whale.#` 这类场面注释；两小节切一场时会改写成 persona.load / cot / not.cheap / deepsleep。鼓点仍是同一套 ORCA 引擎。外壳口令：点一下开饭 / 测完告诉我就行。P 停，N 下一碗，O 收起。

窗口环以场面窗和 emoji 为主。官方 wordmark 只在「看见 logo / 便宜货」那一拍低权重出现一次，不当墙纸。来源 `assets/brand/`（deepseek-ai/DeepSeek-LLM）。商标仍归 DeepSeek。

换图后硬刷新。场面文案在 `src/story.js`。像素帧在 `vendor/dsh-ui-whale/`，WebP 在 `vendor/dsh-whale-animation/`。
