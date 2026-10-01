// Hand-drawn pixel whale from lhh010/dsh-ui-whale (BSD-3-Clause).
// Frames: vendor/dsh-ui-whale/whale-frames.json. Moods follow the window-ring story.

const PALETTE = {
  1: '#203864',
  2: '#0066ff',
  3: '#b4c7e7',
  4: '#f2f2f2',
  5: '#cc3399',
  6: '#808080',
};

const TICK_MS = 120;
const SLEEP_DELAY_TICKS = Math.ceil(10_000 / TICK_MS);
const SLEEP_HOLD = 3;
const WAG_SEQUENCE = [1, 2, 3, 4, 3, 2, 1];
const FIN_SEQUENCE = [1, 2, 1];
const SPOUT_SEQUENCE = [1, 2, 3, 4, 5, 6];
const HEART_SEQUENCE = [1, 2, 3];
const HEART_HOLD = 3;
const IDLE_THUMP_GAP = 90;
const IDLE_FLUTTER_GAP = 60;
const WAG_HOLD = { idle: 6, sleeping: 6, thinking: 8, working: 3, running: 5, spouting: 3 };
const FIN_HOLD = { idle: 5, sleeping: 5, thinking: 6, working: 2, running: 4, spouting: 2 };
const BLINK_GAP = { idle: 42, sleeping: 42, thinking: 26, working: 14, running: 20, spouting: 8 };
const SCALE = 6;

const STORY_MOOD = {
  boot: 'thinking',
  think: 'thinking',
  cheap: 'idle',
  rice: 'idle',
  slack: 'idle',
  glitch: 'spouting',
  sleep: 'sleeping',
};

let frames = {};
let w = 40;
let h = 25;
let layers = null;
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
let lastTick = 0;
let heartRequested = false;
let mood = 'idle';
let state = initialState();

function initialState() {
  return {
    mood: 'idle',
    tick: 0,
    wagStep: -1,
    wagHold: 0,
    thumpCountdown: IDLE_THUMP_GAP,
    finStep: -1,
    finHold: 0,
    flutterCountdown: IDLE_FLUTTER_GAP,
    blinkCountdown: BLINK_GAP.idle,
    blink: false,
    spoutStep: -1,
    spoutHold: 0,
    heartStep: -1,
    heartHold: 0,
    idleStreak: 0,
    sleepStep: -1,
    sleepHold: 0,
  };
}

function pixelsOf(rows) {
  const out = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const c = Number(row[x] || 0);
      if (c) out.push({ x, y, c });
    }
  });
  return out;
}

function motionRegion(names) {
  const region = new Set();
  const standard = frames.STANDARD;
  for (const name of names) {
    const rows = frames[name];
    if (!rows) continue;
    rows.forEach((row, y) => {
      const base = standard[y] || '';
      for (let x = 0; x < w; x++) {
        if ((row[x] || '0') !== (base[x] || '0')) region.add(`${x},${y}`);
      }
    });
  }
  return region;
}

function regionFrame(name, region) {
  return pixelsOf(frames[name]).filter((p) => region.has(`${p.x},${p.y}`));
}

function buildLayers() {
  const EYES = new Set(['7,14', '14,14']);
  const TAIL = motionRegion(['TAIL_1', 'TAIL_2', 'TAIL_3', 'TAIL_4']);
  const FIN = motionRegion(['FIN_1', 'FIN_2']);
  const SPOUT = motionRegion(['SPOUT_1', 'SPOUT_2', 'SPOUT_3', 'SPOUT_4', 'SPOUT_5', 'SPOUT_6']);
  const HEART = motionRegion(['HEART_1', 'HEART_2', 'HEART_3']);
  const SLEEP = motionRegion(['SLEEP_1', 'SLEEP_2', 'SLEEP_3', 'SLEEP_4', 'SLEEP_5']);
  const body = pixelsOf(frames.STANDARD).filter((p) => {
    const k = `${p.x},${p.y}`;
    return !EYES.has(k) && !TAIL.has(k) && !FIN.has(k) && !SPOUT.has(k) && !HEART.has(k) && !SLEEP.has(k);
  });
  const named = (list, region) => list.map((name) => (name ? regionFrame(name, region) : []));
  layers = {
    body,
    tail: named(['STANDARD', 'TAIL_1', 'TAIL_2', 'TAIL_3', 'TAIL_4'], TAIL),
    fin: named(['STANDARD', 'FIN_1', 'FIN_2'], FIN),
    spout: named([null, 'SPOUT_1', 'SPOUT_2', 'SPOUT_3', 'SPOUT_4', 'SPOUT_5', 'SPOUT_6'], SPOUT),
    heart: named([null, 'HEART_1', 'HEART_2', 'HEART_3'], HEART),
    sleep: named([null, 'SLEEP_1', 'SLEEP_2', 'SLEEP_3', 'SLEEP_4', 'SLEEP_5'], SLEEP),
  };
}

function advanceLimb(step, hold, countdown, sequence, holdFor, idleGap, continuous) {
  if (continuous) {
    if (step < 0) return { step: 0, hold: holdFor - 1, countdown: idleGap };
    if (hold <= 0) return { step: (step + 1) % sequence.length, hold: holdFor - 1, countdown: idleGap };
    return { step, hold: hold - 1, countdown: idleGap };
  }
  if (step >= 0) {
    if (hold <= 0) {
      if (step >= sequence.length - 1) return { step: -1, hold: 0, countdown: idleGap };
      return { step: step + 1, hold: holdFor - 1, countdown: idleGap };
    }
    return { step, hold: hold - 1, countdown: idleGap };
  }
  if (countdown <= 0) return { step: 0, hold: holdFor - 1, countdown: idleGap };
  return { step: -1, hold: 0, countdown: countdown - 1 };
}

function advance(prev, nextMood, heart) {
  const active = nextMood === 'spouting' || nextMood === 'thinking' || nextMood === 'working' || nextMood === 'running';
  const idleStreak = active ? 0 : prev.idleStreak + 1;
  const asleep = nextMood === 'sleeping' || (!active && idleStreak >= SLEEP_DELAY_TICKS);
  const effective = asleep ? 'sleeping' : (active ? nextMood : 'idle');
  const continuous = effective !== 'idle' && effective !== 'sleeping';
  const tail = advanceLimb(prev.wagStep, prev.wagHold, prev.thumpCountdown, WAG_SEQUENCE, WAG_HOLD[effective], IDLE_THUMP_GAP, continuous);
  const fin = advanceLimb(prev.finStep, prev.finHold, prev.flutterCountdown, FIN_SEQUENCE, FIN_HOLD[effective], IDLE_FLUTTER_GAP, continuous);

  let sleepStep = prev.sleepStep;
  let sleepHold = prev.sleepHold;
  if (effective === 'sleeping') {
    if (sleepStep < 0) { sleepStep = 0; sleepHold = SLEEP_HOLD - 1; }
    else if (sleepHold <= 0) { sleepStep = sleepStep >= 5 ? 1 : sleepStep + 1; sleepHold = SLEEP_HOLD - 1; }
    else sleepHold -= 1;
  } else { sleepStep = -1; sleepHold = 0; }

  let spoutStep = -1;
  let spoutHold = 0;
  if (effective === 'spouting') {
    if (prev.spoutStep < 0) { spoutStep = 0; spoutHold = 1; }
    else if (prev.spoutHold <= 0) { spoutStep = Math.min(prev.spoutStep + 1, SPOUT_SEQUENCE.length - 1); spoutHold = 1; }
    else { spoutStep = prev.spoutStep; spoutHold = prev.spoutHold - 1; }
  }

  let blink = false;
  let blinkCountdown = prev.blinkCountdown;
  if (prev.blinkCountdown <= 0) { blink = true; blinkCountdown = BLINK_GAP[effective] - 1; }
  else blinkCountdown = prev.blinkCountdown - 1;

  let heartStep = prev.heartStep;
  let heartHold = prev.heartHold;
  if (heart) { heartStep = 0; heartHold = HEART_HOLD - 1; }
  else if (heartStep >= 0) {
    if (heartHold <= 0) {
      if (heartStep >= HEART_SEQUENCE.length - 1) heartStep = -1;
      else { heartStep += 1; heartHold = HEART_HOLD - 1; }
    } else heartHold -= 1;
  }

  return {
    mood: effective,
    tick: prev.tick + 1,
    wagStep: tail.step,
    wagHold: tail.hold,
    thumpCountdown: tail.countdown,
    finStep: fin.step,
    finHold: fin.hold,
    flutterCountdown: fin.countdown,
    blinkCountdown,
    blink,
    spoutStep,
    spoutHold,
    heartStep,
    heartHold,
    idleStreak,
    sleepStep,
    sleepHold,
  };
}

function paintPixels(list) {
  const s = SCALE;
  for (const p of list) {
    ctx.fillStyle = PALETTE[p.c] || PALETTE[2];
    ctx.fillRect(p.x * s, p.y * s, s, s);
  }
}

function draw() {
  if (!layers) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const tail = state.wagStep < 0 ? 0 : (WAG_SEQUENCE[state.wagStep] ?? 0);
  const fin = state.finStep < 0 ? 0 : (FIN_SEQUENCE[state.finStep] ?? 0);
  const spout = state.spoutStep < 0 ? 0 : (SPOUT_SEQUENCE[state.spoutStep] ?? 0);
  const heart = state.heartStep < 0 ? 0 : (HEART_SEQUENCE[state.heartStep] ?? 0);
  const sleep = state.sleepStep < 0 ? 0 : state.sleepStep;
  paintPixels(layers.body);
  paintPixels(state.blink
    ? [{ x: 7, y: 14, c: 2 }, { x: 14, y: 14, c: 2 }]
    : [{ x: 7, y: 14, c: 1 }, { x: 14, y: 14, c: 1 }]);
  paintPixels(layers.tail[tail] || []);
  paintPixels(layers.fin[fin] || []);
  paintPixels(layers.spout[spout] || []);
  paintPixels(layers.heart[heart] || []);
  paintPixels(layers.sleep[sleep] || []);
}

export async function loadPixelWhale() {
  const res = await fetch('vendor/dsh-ui-whale/whale-frames.json');
  const list = await res.json();
  frames = {};
  for (const item of list) {
    frames[item.name] = item.rows;
    w = item.w;
    h = item.h;
  }
  canvas.width = w * SCALE;
  canvas.height = h * SCALE;
  buildLayers();
  draw();
}

export function setPixelMoodFromScene(id) {
  mood = STORY_MOOD[id] || 'idle';
  if (id === 'rice' || id === 'cheap') heartRequested = true;
}

export function tickPixelWhale(now) {
  if (!layers) return;
  if (now - lastTick < TICK_MS) return;
  lastTick = now;
  const heart = heartRequested;
  heartRequested = false;
  state = advance(state, mood, heart);
  draw();
}

export function livePixelSource() {
  return { canvas, transparent: true, live: true };
}
