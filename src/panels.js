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
  boot: [[personaLoad, 5], [fatFish, 1]],
  think: [[cotWindow, 5], [personaLoad, 2]],
  cheap: [[priceTag, 5], [fatFish, 2]],
  rice: [[riceBowl, 4], [fatFish, 3]],
  slack: [[experimentLog, 5], [riceBowl, 2]],
  glitch: [[errorRage, 4], [priceTag, 1], [voteCard, 1]],
  sleep: [[deepSleep, 5], [riceBowl, 2]],
};

const ALWAYS = [[catTask, 1], [voteCard, 1]];

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
  console.log('[panels]', pool.length ? `${pool.length} images + story` : 'story windows');
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
  const fn = pickWeighted(list);
  return { canvas: fn(), transparent: false, kind: fn.name };
}
