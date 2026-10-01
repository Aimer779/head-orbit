// Dive / Classic loops from LeemanCheung/dsh-whale-animation (MIT).
// Director waits for the current loop to finish before switching. Dive 1.980s, Classic 10.506s.

const LOOPS = {
  dive: { src: 'vendor/dsh-whale-animation/whale-dive.webp', duration: 1980 },
  classic: { src: 'vendor/dsh-whale-animation/whale-classic.webp', duration: 10506 },
};

const STORY_LOOP = {
  boot: 'dive',
  think: 'dive',
  cheap: 'classic',
  rice: 'classic',
  slack: 'classic',
  glitch: 'dive',
  sleep: 'classic',
};

const canvas = document.createElement('canvas');
canvas.width = 352;
canvas.height = 352;
const ctx = canvas.getContext('2d');
const images = { dive: new Image(), classic: new Image() };
let ready = false;
let current = 'dive';
let wanted = 'dive';
let loopUntil = 0;

function paint() {
  const img = images[current];
  if (!img.naturalWidth) return;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
}

export async function loadDiveWhale() {
  const loads = Object.entries(LOOPS).map(([id, loop]) => new Promise((resolve, reject) => {
    const img = images[id];
    img.decoding = 'async';
    img.onload = resolve;
    img.onerror = () => reject(new Error(loop.src));
    img.src = loop.src;
    img.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.appendChild(img);
  }));
  await Promise.all(loads);
  ready = true;
  loopUntil = performance.now() + LOOPS.dive.duration;
  paint();
}

export function requestDiveFromScene(id) {
  wanted = STORY_LOOP[id] || 'classic';
}

export function tickDiveWhale(now) {
  if (!ready) return;
  if (now >= loopUntil) {
    if (wanted !== current) current = wanted;
    loopUntil = now + LOOPS[current].duration;
  }
  paint();
}

export function liveDiveSource() {
  return { canvas, transparent: false, live: true };
}
