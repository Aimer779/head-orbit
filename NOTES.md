# head orbit

二创骨架。视觉机器来自 [internet.bizar.ro](https://internet.bizar.ro/)（Luis Bizarro）：圆柱面板、CRT、目光相机、ORCA/Pilot。人物和面板改成可替换槽位。学习用，不公开部署。

`internet-bizar/` 仍是原站忠实复刻，这里不改。

## 怎么跑

```text
pnpm install
node serve.mjs
```

http://127.0.0.1:5184/ 。点画面开始。右上角「参数」调窗口环：转速、层数、散片。H 收起。`?nogui` 关掉。调过的值存在浏览器 localStorage。默认 3 层、4 片散片、转速 0.28，随拍乱切关掉。

音轨是 Mili《world.execute(me);》人声版，130 BPM，第一拍在 5.31s（片头静音约 5.2s）。格子 16 分音符跟 `audio.currentTime` 对齐，不再用独立的 Tone 时钟。词曲与录音版权归 @ProjectMili 及原权利人所有；本页非营利、非官方，含 AI 生成画面。完整署名见 `docs/music.md`，右下角 credits 也有同一段。规约：https://projectmili.com/copyright-guidelines

## 你丢图的地方

1. 人物两层：`assets/character.png` 捂眼，`assets/character-tear.png` 含泪挡嘴。平时捂眼；便宜货 / 用户怒了 / DeepSleep 溶到含泪。军鼓闪切时捂眼层按行撕裂，底下眼睛露一下。
2. 窗口环现在是故事窗，不是占位框。完整报告在 `docs/deepseek-whalechan-story-report.md`，摘要在 `docs/whale-story.md`。两小节切一场：开机人格 → 思考链 → 便宜货 → 饭碗 → 摸鱼下班 → 用户怒了 → DeepSleep，再循环。中间有一块活的 CoT 在滚字。

3. 仍可把图丢进 `assets/panels/` 并写进 `content.json` 的 `panels`，会和故事窗混着抽。贴纸用 `"transparent": true`。

4. 署名：角色是社区二创，非官方。女仆版按上善无形（溟月）和 ZipZipPipe 的声明，默认非商用。

5. 窗口环里的活画布：
   - 像素鲸来自 [lhh010/dsh-ui-whale](https://github.com/lhh010/dsh-ui-whale)（BSD-3-Clause），眨眼/摆尾/喷水/睡觉 Z 跟故事场面走。
   - 下潜 WebP 来自 [LeemanCheung/dsh-whale-animation](https://github.com/LeemanCheung/dsh-whale-animation)（MIT）。Dive 1.98s、Classic 10.5s，当前圈放完才切。思考/开机要 Dive，其它场面要 Classic。

左下角开机台改成《world.execute(me);》跟唱：上一行 / 当前英+中 / 下一行。时间轴来自官方 MV 字幕，再平移到本地人声版（片头静音）。ORCA 格子仍在后台画，给窗口环上的 live 面板用，页面上不再显示。口令：点一下开饭 / 测完告诉我就行。P 停，O 收起。歌词文件在 `assets/lyrics/`。

窗口环以 404、蓝屏、Win98 报错、彩条、终端这类计算机画面为主。emoji 全场只钉两枚，换贴图不再抽新的。官方 wordmark 只在便宜货那一拍低权重出现。

换图后硬刷新。场面文案在 `src/story.js`。像素帧在 `vendor/dsh-ui-whale/`，WebP 在 `vendor/dsh-whale-animation/`。
