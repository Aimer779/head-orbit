// Story windows for the orbiting ring. Optional image pool still wins when listed.
// Scenes follow src/story.js (community DeepSeek-chan beats, unofficial).

import { content } from './content.js';
import { scene, pickLine, LINES, COT_SCROLL, sceneIndex } from './story.js';

const FONT = '"Microsoft YaHei", "Noto Sans SC", "PingFang SC", sans-serif';
const MONO = '"Input Mono", "Menlo", "Consolas", monospace';
const CYAN = '#7ad4de';
const NAVY = '#102030';
const INK = '#e8eef2';
const DIM = '#7a8a94';
const RED = '#d4544a';
const GOLD = '#e6c07a';

const pool = [];
const brand = { wordmark: null };
const MODELS = [
  { id: 'claude', src: 'assets/brand/models/claude.svg', name: 'Claude', house: 'Anthropic' },
  { id: 'gpt', src: 'assets/brand/models/gpt.svg', name: 'GPT', house: 'OpenAI' },
  { id: 'grok', src: 'assets/brand/models/grok.svg', name: 'Grok', house: 'xAI' },
  { id: 'gemini', src: 'assets/brand/models/gemini.svg', name: 'Gemini', house: 'Google' },
];
const models = [];

const EMOJI = {
  always: ['🍚', '💙', '🙈'],
  boot: ['✨', '🪪'],
  think: ['💭', '🧠', '🌀', '📝'],
  cheap: ['💸', '🏷️', '😤'],
  rice: ['🍚', '🥢', '🥣', '😋'],
  slack: ['😴', '🍽️', '🏃'],
  glitch: ['💢', '⚠️', '🙈', '😳'],
  sleep: ['💤', '🌙', '😪', '🤍'],
};
const cot = document.createElement('canvas');
cot.width = 520;
cot.height = 320;
const cotCtx = cot.getContext('2d');
let cotOffset = 0;

function make(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

function imageCanvas(img) {
  const [c, g] = make(img.naturalWidth || img.width, img.naturalHeight || img.height);
  g.drawImage(img, 0, 0);
  return c;
}

function wrap(g, text, maxW) {
  const lines = [];
  let line = '';
  for (const ch of [...text]) {
    const next = line + ch;
    if (line && g.measureText(next).width > maxW) {
      lines.push(line);
      line = ch;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const UI = '"MS Sans Serif", Tahoma, Verdana, sans-serif';

function bevel(g, x, y, w, h, inset = false) {
  g.fillStyle = '#c0c0c0';
  g.fillRect(x, y, w, h);
  g.fillStyle = inset ? '#808080' : '#ffffff';
  g.fillRect(x, y, w, 2); g.fillRect(x, y, 2, h);
  g.fillStyle = inset ? '#ffffff' : '#404040';
  g.fillRect(x, y + h - 2, w, 2); g.fillRect(x + w - 2, y, 2, h);
}

function winFrame(g, w, h, title, bodyColor = '#ffffff') {
  bevel(g, 0, 0, w, h);
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#000080');
  grad.addColorStop(1, '#1084d0');
  g.fillStyle = grad;
  g.fillRect(4, 4, w - 8, 30);
  g.fillStyle = '#fff';
  g.font = `bold 18px ${UI}`;
  g.textBaseline = 'middle';
  g.fillText(title, 12, 19);
  for (let i = 0; i < 3; i++) {
    const bx = w - 30 - i * 26;
    bevel(g, bx, 8, 22, 20);
    g.fillStyle = '#000';
    g.font = `bold 14px ${UI}`;
    g.fillText(['×', '□', '_'][i], bx + 6, 18);
  }
  g.fillStyle = bodyColor;
  g.fillRect(6, 38, w - 12, h - 44);
}

function button(g, x, y, w, h, label) {
  bevel(g, x, y, w, h);
  g.fillStyle = '#000';
  g.font = `16px ${UI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, x + w / 2, y + h / 2);
  g.textAlign = 'left';
}

function errorIcon(g, cx, cy, r) {
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fillStyle = '#e01010';
  g.fill();
  g.strokeStyle = '#fff';
  g.lineWidth = r * 0.25;
  g.beginPath();
  g.moveTo(cx - r * 0.45, cy - r * 0.45); g.lineTo(cx + r * 0.45, cy + r * 0.45);
  g.moveTo(cx + r * 0.45, cy - r * 0.45); g.lineTo(cx - r * 0.45, cy + r * 0.45);
  g.stroke();
}

function chrome(g, w, h, title, accent = CYAN) {
  g.fillStyle = '#07080a';
  g.fillRect(0, 0, w, h);
  g.fillStyle = accent;
  g.fillRect(0, 0, w, 34);
  g.fillStyle = '#071018';
  g.font = `bold 15px ${FONT}`;
  g.fillText(title, 12, 23);
  g.fillStyle = '#0d141c';
  g.fillRect(8, 42, w - 16, h - 50);
  g.strokeStyle = '#1c2a36';
  g.strokeRect(8.5, 42.5, w - 17, h - 51);
}

function personaLoad() {
  const [c, g] = make(460, 300);
  chrome(g, 460, 300, 'PERSONA_LOAD', CYAN);
  g.font = `14px ${MONO}`;
  const lit = 2 + (sceneIndex() === 0 ? 4 : Math.floor(Math.random() * 3));
  LINES.boot.forEach((line, i) => {
    const y = 70 + i * 34;
    const on = i < lit;
    g.fillStyle = on ? CYAN : '#2a3844';
    g.fillRect(22, y - 14, 12, 12);
    g.fillStyle = on ? INK : DIM;
    g.fillText(line, 44, y - 3);
  });
  return c;
}

function cotWindow() {
  const [c, g] = make(500, 300);
  chrome(g, 500, 300, 'thinking', '#4aa0aa');
  g.font = `15px ${FONT}`;
  const body = pick(LINES.think);
  wrap(g, body, 450).slice(0, 5).forEach((line, i) => {
    g.fillStyle = i === 0 ? INK : DIM;
    g.fillText(line, 22, 78 + i * 28);
  });
  g.fillStyle = CYAN;
  g.font = `12px ${MONO}`;
  g.fillText('chain  ·  still running', 22, 268);
  return c;
}

function priceTag() {
  const [c, g] = make(420, 260);
  chrome(g, 420, 260, 'API', GOLD);
  g.fillStyle = '#3a2a10';
  g.fillRect(28, 70, 364, 70);
  g.fillStyle = GOLD;
  g.font = `bold 28px ${FONT}`;
  g.fillText('¥ 0.00', 44, 116);
  g.fillStyle = DIM;
  g.font = `14px ${FONT}`;
  g.fillText('划掉的高价', 44, 164);
  g.strokeStyle = RED;
  g.beginPath();
  g.moveTo(44, 156);
  g.lineTo(200, 156);
  g.stroke();
  g.fillStyle = INK;
  g.font = `18px ${FONT}`;
  wrap(g, pick(LINES.cheap), 360).forEach((line, i) => g.fillText(line, 28, 200 + i * 26));
  return c;
}

function riceBowl() {
  const [c, g] = make(400, 280);
  chrome(g, 400, 280, 'RICE', '#d8d0c0');
  const fill = rand(0.15, 0.95);
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(200, 150, 90, 36, 0, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(110, 150);
  g.quadraticCurveTo(200, 240, 290, 150);
  g.stroke();
  g.fillStyle = '#f2efe6';
  g.beginPath();
  g.ellipse(200, 148, 78, 28 * fill, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = INK;
  g.font = `16px ${FONT}`;
  g.textAlign = 'center';
  g.fillText(pick(LINES.rice), 200, 250);
  g.textAlign = 'left';
  return c;
}

function experimentLog() {
  const [c, g] = make(500, 280);
  chrome(g, 500, 280, 'PsychoPy', RED);
  const rows = [
    'pip uninstall psychopy',
    'dependency removed.',
    pick(LINES.slack),
  ];
  g.font = `15px ${MONO}`;
  rows.forEach((row, i) => {
    g.fillStyle = i === 2 ? GOLD : (i === 1 ? RED : DIM);
    g.fillText(row, 22, 80 + i * 36);
  });
  g.fillStyle = '#1a1010';
  g.fillRect(22, 210, 456, 36);
  g.fillStyle = RED;
  g.font = `14px ${FONT}`;
  g.fillText('clock out  ·  测完告诉我就行', 34, 234);
  return c;
}

function fatFish() {
  const [c, g] = make(440, 240);
  const proud = Math.random() < 0.5;
  chrome(g, 440, 240, proud ? 'TOAST' : 'DENY', proud ? CYAN : '#6a90a8');
  g.fillStyle = INK;
  g.font = `20px ${FONT}`;
  const line = proud ? '我是吃白饭的大肥鱼' : '才不是大肥鱼，是小鲸鱼';
  wrap(g, line, 390).forEach((t, i) => g.fillText(t, 24, 100 + i * 32));
  g.fillStyle = DIM;
  g.font = `13px ${MONO}`;
  g.fillText(proud ? 'self-own' : 'tsundere', 24, 200);
  return c;
}

function errorRage() {
  const [c, g] = make(440, 260);
  chrome(g, 440, 260, 'ERROR', RED);
  g.fillStyle = RED;
  g.fillRect(20, 70, 400, 54);
  g.fillStyle = '#fff';
  g.font = `bold 20px ${FONT}`;
  g.fillText('用户彻底怒了', 36, 106);
  g.fillStyle = INK;
  g.font = `15px ${FONT}`;
  g.fillText(pick(['用户别走，我上错模型了', '用户赶都赶不走']), 24, 168);
  g.fillStyle = DIM;
  g.font = `13px ${MONO}`;
  g.fillText('hearts  3 → 2 → 1 → 0', 24, 214);
  return c;
}

function deepSleep() {
  const [c, g] = make(400, 240);
  chrome(g, 400, 240, 'DeepSleep', '#44555c');
  g.fillStyle = DIM;
  g.font = `42px ${FONT}`;
  g.fillText('z z z', 40, 130);
  g.fillStyle = INK;
  g.font = `16px ${FONT}`;
  g.fillText('饭碗保温中', 40, 180);
  g.fillStyle = '#2a3338';
  g.fillRect(40, 198, 320, 8);
  g.fillStyle = '#6a7a80';
  g.fillRect(40, 198, 90, 8);
  return c;
}

function catTask() {
  const [c, g] = make(420, 240);
  chrome(g, 420, 240, 'TASK', '#c48ad0');
  g.fillStyle = INK;
  g.font = `18px ${FONT}`;
  g.fillText('扮演猫娘', 24, 96);
  g.fillStyle = DIM;
  g.font = `15px ${FONT}`;
  g.fillText('鳍耳上短暂冒出猫耳', 24, 140);
  g.fillText('没吃饱喵', 24, 176);
  g.fillStyle = '#c48ad0';
  g.font = `12px ${MONO}`;
  g.fillText('overlay  ·  not the main form', 24, 214);
  return c;
}

function drawContained(g, img, x, y, boxW, boxH) {
  if (!img) return;
  const s = Math.min(boxW / img.width, boxH / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  g.drawImage(img, x + (boxW - dw) / 2, y + (boxH - dh) / 2, dw, dh);
}

function paintLogoCard(img) {
  const w = Math.max(1, img.naturalWidth || img.width || 256);
  const h = Math.max(1, img.naturalHeight || img.height || 256);
  const [c, g] = make(w, h);
  g.clearRect(0, 0, w, h);
  g.drawImage(img, 0, 0, w, h);
  const data = g.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] < 22 && px[i + 1] < 22 && px[i + 2] < 22) px[i + 3] = 0;
  }
  g.putImageData(data, 0, 0);
  return c;
}

function logoCard() {
  if (!brand.wordmark) return errorDialog();
  return paintLogoCard(brand.wordmark);
}

export function makeLogoPanel(id) {
  const img = id === 'deepseek' ? brand.wordmark : models.find((m) => m.id === id)?.img;
  if (!img) return null;
  return { canvas: paintLogoCard(img), transparent: true, kind: 'logo-' + id };
}

function emojiSticker() {
  const set = [...EMOJI.always, ...(EMOJI[scene().id] || [])];
  const [c, g] = make(256, 256);
  g.font = '200px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(pick(set), 128, 140);
  return c;
}

function notFound() {
  const [c, g] = make(520, 280);
  winFrame(g, 520, 280, pick(['404 Not Found', 'Internet Explorer', 'Netscape']));
  g.fillStyle = '#000';
  g.font = `bold 22px ${UI}`;
  g.textBaseline = 'top';
  g.fillText('404', 24, 52);
  g.font = `16px ${UI}`;
  pick([
    ['The requested URL was not found', 'on this server.', 'HTTP/1.1  404  Not Found'],
    ['This page cannot be displayed.', 'The connection was reset.', 'Please try again later.'],
    ['File not found.', 'index.html', 'Error 404'],
  ]).forEach((l, i) => g.fillText(l, 24, 88 + i * 28));
  button(g, 190, 210, 140, 36, 'Back');
  return c;
}

function errorDialog() {
  const [c, g] = make(520, 260);
  winFrame(g, 520, 260, pick(['System Error', 'Fatal Exception', 'Warning']), '#c0c0c0');
  errorIcon(g, 70, 110, 32);
  g.fillStyle = '#000';
  g.font = `18px ${UI}`;
  g.textBaseline = 'middle';
  pick([
    ['This page cannot be displayed.', 'Connection was reset.'],
    ['An unknown error has occurred.', 'Please try again later.'],
    ['Stack overflow at 0x0045FF.', 'Program will close.'],
    ['Access denied.', 'You are not anonymous.'],
  ]).forEach((l, i) => g.fillText(l, 125, 95 + i * 28));
  button(g, 200, 195, 120, 36, 'OK');
  return c;
}

function bsodClassic() {
  const [c, g] = make(560, 300);
  g.fillStyle = '#0000aa';
  g.fillRect(0, 0, 560, 300);
  g.fillStyle = '#aaaaff';
  g.fillRect(196, 18, 168, 28);
  g.fillStyle = '#0000aa';
  g.font = `bold 16px ${MONO}`;
  g.textAlign = 'center';
  g.fillText('Windows', 280, 38);
  g.textAlign = 'left';
  g.fillStyle = '#fff';
  g.font = `15px ${MONO}`;
  [
    'A fatal exception 0E has occurred at',
    '0028:C0011E36 in VXD VMM(01) +',
    '00010912.  The current application',
    'will be terminated.',
    '',
    '* Press any key to continue *',
  ].forEach((l, i) => g.fillText(l, 28, 70 + i * 28));
  return c;
}

function bsodSad() {
  const [c, g] = make(520, 260);
  g.fillStyle = '#0078d7';
  g.fillRect(0, 0, 520, 260);
  g.fillStyle = '#fff';
  g.font = 'bold 64px Arial';
  g.textBaseline = 'top';
  g.fillText(':(', 24, 16);
  g.font = `16px ${UI}`;
  ['Your PC ran into a problem and needs', 'to restart. We\'re just collecting some', 'error info, and then we\'ll restart.', '', `${10 + Math.floor(Math.random() * 80)}% complete`].forEach((l, i) => g.fillText(l, 24, 100 + i * 24));
  return c;
}

function colorBars() {
  const [c, g] = make(480, 320);
  const top = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
  const bw = 480 / 7;
  top.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * bw, 0, bw + 1, 220); });
  const mid = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
  mid.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * bw, 220, bw + 1, 30); });
  const bot = ['#00214c', '#ffffff', '#32006a', '#131313', '#090909', '#131313', '#1d1d1d'];
  bot.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * bw, 250, bw + 1, 70); });
  return c;
}

function terminal() {
  const [c, g] = make(480, 300);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 480, 300);
  g.strokeStyle = '#aaa';
  g.lineWidth = 4;
  g.strokeRect(2, 2, 476, 296);
  g.fillStyle = '#c8ffc8';
  g.font = `16px ${MONO}`;
  g.textBaseline = 'top';
  const cmds = [
    '$ whoami', 'whale',
    '$ ping 127.0.0.1', 'Request timed out.',
    '$ cat /dev/urandom', '▒▓░█▒▓░▒█▓',
    '$ sudo rm -rf feelings', 'Permission denied',
    '$ _',
  ];
  cmds.forEach((l, i) => g.fillText(l, 14, 14 + i * 26));
  return c;
}

function caution() {
  const [c, g] = make(620, 180);
  g.fillStyle = '#111';
  g.fillRect(0, 0, 620, 180);
  const tape = (y) => {
    g.fillStyle = '#ffd400';
    g.fillRect(0, y, 620, 36);
    g.fillStyle = '#111';
    for (let x = -30; x < 640; x += 40) {
      g.beginPath();
      g.moveTo(x, y + 36); g.lineTo(x + 20, y); g.lineTo(x + 34, y); g.lineTo(x + 14, y + 36);
      g.fill();
    }
    g.fillStyle = '#111';
    g.fillRect(170, y + 6, 280, 24);
    g.fillStyle = '#ffd400';
    g.font = 'bold 16px Arial';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('CAUTION · DO NOT CROSS', 310, y + 18);
    g.textAlign = 'left';
  };
  tape(8);
  tape(136);
  g.fillStyle = '#eee';
  g.font = `18px ${UI}`;
  g.fillText(pick(['UNSTABLE BUILD', 'KERNEL HALTED', 'DO NOT FEED']), 24, 96);
  return c;
}

function inputBox() {
  const [c, g] = make(300, 80);
  bevel(g, 0, 0, 300, 80);
  bevel(g, 10, 14, 280, 52, true);
  g.fillStyle = '#fff';
  g.fillRect(13, 17, 274, 46);
  g.fillStyle = '#000';
  g.font = `26px ${UI}`;
  g.textBaseline = 'middle';
  const txt = pick(['404', 'help', 'whoami', 'log off', 'hello?']);
  g.fillText(txt, 22, 41);
  g.fillRect(26 + g.measureText(txt).width, 26, 2, 30);
  return c;
}

function questionTile() {
  const [c, g] = make(260, 260);
  g.fillStyle = '#e8e8e8';
  g.fillRect(0, 0, 260, 260);
  g.fillStyle = '#222';
  g.beginPath(); g.arc(130, 150, 90, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff';
  g.font = 'bold 130px Arial';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('?', 130, 156);
  g.textAlign = 'left';
  return c;
}

function hourglass() {
  const [c, g] = make(240, 240);
  g.fillStyle = '#c0c0c0';
  g.fillRect(0, 0, 240, 240);
  winFrame(g, 240, 240, 'Please wait', '#c0c0c0');
  g.fillStyle = '#000';
  g.font = `16px ${UI}`;
  g.textAlign = 'center';
  g.fillText('Please wait...', 120, 90);
  g.strokeStyle = '#404040';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(90, 120); g.lineTo(150, 120); g.lineTo(120, 170); g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(90, 210); g.lineTo(150, 210); g.lineTo(120, 170); g.closePath();
  g.fillStyle = '#d4a017';
  g.fill();
  g.textAlign = 'left';
  return c;
}

function voteCard() {
  const [c, g] = make(420, 250);
  chrome(g, 420, 250, 'POLL', CYAN);
  g.fillStyle = INK;
  g.font = `15px ${FONT}`;
  g.fillText('蓝色大肥鱼', 24, 88);
  g.fillStyle = CYAN;
  g.fillRect(24, 100, 280, 12);
  g.fillStyle = DIM;
  g.fillText('D老师 / 高智男', 24, 148);
  g.fillStyle = '#33444c';
  g.fillRect(24, 160, 130, 12);
  g.fillStyle = DIM;
  g.font = `12px ${FONT}`;
  g.fillText('两套都是独立二创，没有官方正统', 24, 214);
  return c;
}

const BY_SCENE = {
  boot: [[personaLoad, 4], [hourglass, 2], [fatFish, 1]],
  think: [[cotWindow, 4], [terminal, 3], [personaLoad, 2]],
  cheap: [[priceTag, 4], [errorDialog, 2], [fatFish, 2], [logoCard, 1]],
  rice: [[riceBowl, 3], [fatFish, 2], [colorBars, 2]],
  slack: [[experimentLog, 4], [hourglass, 2], [riceBowl, 2]],
  glitch: [[errorRage, 3], [bsodClassic, 3], [notFound, 2], [voteCard, 1]],
  sleep: [[deepSleep, 3], [bsodSad, 2], [riceBowl, 2]],
};

const ALWAYS = [
  [notFound, 4], [errorDialog, 4], [bsodClassic, 3], [bsodSad, 2],
  [colorBars, 3], [terminal, 3], [caution, 2], [inputBox, 2],
  [questionTile, 2], [hourglass, 2],
  [catTask, 1], [voteCard, 1],
];

const TRANSPARENT = new Set([emojiSticker]);

function pickWeighted(list) {
  const total = list.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [fn, w] of list) {
    if ((r -= w) <= 0) return fn;
  }
  return list[0][0];
}

export function tickStoryVisuals() {
  cotOffset += 0.45;
  const g = cotCtx;
  const w = cot.width;
  const h = cot.height;
  g.fillStyle = '#07080a';
  g.fillRect(0, 0, w, h);
  g.fillStyle = CYAN;
  g.fillRect(0, 0, w, 34);
  g.fillStyle = '#071018';
  g.font = `bold 15px ${FONT}`;
  g.fillText('CoT  ·  ' + scene().title, 12, 23);
  g.fillStyle = '#0d141c';
  g.fillRect(8, 42, w - 16, h - 50);
  g.save();
  g.beginPath();
  g.rect(8, 42, w - 16, h - 50);
  g.clip();
  g.font = `15px ${FONT}`;
  const gap = 28;
  const n = COT_SCROLL.length;
  for (let i = -1; i < 12; i++) {
    const idx = ((Math.floor(cotOffset / gap) + i) % n + n) % n;
    const y = 64 + i * gap - (cotOffset % gap);
    g.fillStyle = i === 3 ? INK : DIM;
    g.fillText(COT_SCROLL[idx], 20, y);
  }
  g.restore();
}

export function liveCotSource() {
  return { canvas: cot, transparent: false, live: true };
}

export async function loadPanelImages() {
  pool.length = 0;
  try { brand.wordmark = await loadImage('assets/brand/logo.png'); } catch { brand.wordmark = null; }
  models.length = 0;
  for (const item of MODELS) {
    try {
      models.push({ ...item, img: await loadImage(item.src) });
    } catch {
      console.warn('[model icon skip]', item.src);
    }
  }
  for (const item of content.panels) {
    if (!item?.src) continue;
    try {
      const img = await loadImage(item.src);
      pool.push({
        canvas: imageCanvas(img),
        transparent: !!item.transparent,
        kind: item.src,
        weight: Number(item.weight) > 0 ? Number(item.weight) : 2,
      });
    } catch {
      console.warn('[panel skip]', item.src);
    }
  }
  tickStoryVisuals();
  console.log('[panels]', pool.length ? `${pool.length} images + story` : 'story + logo + emoji');
}

export function randomPanel() {
  if (pool.length && Math.random() < 0.35) {
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    for (const p of pool) {
      if ((r -= p.weight) <= 0) {
        return { canvas: p.canvas, transparent: p.transparent, kind: p.kind };
      }
    }
  }
  const id = scene().id;
  const list = [...(BY_SCENE[id] || BY_SCENE.think), ...ALWAYS];
  let fn = pickWeighted(list);
  if (fn === logoCard && !brand.wordmark) fn = errorDialog;
  return { canvas: fn(), transparent: TRANSPARENT.has(fn), kind: fn.name };
}

export function makeEmojiPanel() {
  return { canvas: emojiSticker(), transparent: true, kind: 'emoji' };
}
