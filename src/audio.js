// Soundtrack clock. ORCA 16ths are derived from audio.currentTime at 130 BPM so the grid
// and the Mili track share one beat. Pilot synth is silent.

import { Orca, library } from './orca-core.js';
import { GRID, SETLIST, Performer } from './song.js';
import { scene } from './story.js';

const TRACK = 'assets/audio/world-execute-me.mp3';

export const SOUNDTRACK = {
  title: 'world.execute(me);',
  artist: 'Mili',
  file: 'world-execute-me.mp3',
  bpm: 130,
  offset: 0.46,
};

const THEME = { background: '#000000', f_high: '#e8eef2', f_med: '#8aa8b0', f_low: '#3a4a52', f_inv: '#071018', b_high: '#cfe8ec', b_med: '#7ad4de', b_low: '#1c2a36', b_inv: '#e6c07a' };
const TILE = { w: 14, h: 22 };
const MARKER = 8;

export class OrcaPlayer {
  constructor() {
    this.listeners = {};
    this.playing = false;
    this.started = false;
    this.levels = { low: 0, mid: 0, high: 0, rms: 0 };

    this.orca = new Orca(library, { udp: (msg) => this.outbox.push(msg) });
    this.outbox = [];
    // ?song=numb (or any part of a title) starts the set there
    const pick = new URLSearchParams(location.search).get('song')?.toLowerCase();
    this.load(Math.max(0, pick ? SETLIST.findIndex((s) => s.title.includes(pick)) : 0));

    // what the grid looked like at the frame currently being heard
    this.view = { s: this.orca.s, locks: [], ports: [], f: 0, cursor: { x: 0, y: 0 }, msgs: 0 };

    this.canvas = document.createElement('canvas');
    this.canvas.width = GRID.w * TILE.w;
    this.canvas.height = (GRID.h + 2) * TILE.h;
    this.ctx = this.canvas.getContext('2d');
    this.track = new Audio(TRACK);
    this.track.loop = true;
    this.track.preload = 'auto';
    this.lastF = -1;
    this.draw();
  }

  on(type, fn) { (this.listeners[type] ||= []).push(fn); }
  emit(type, e) { for (const fn of this.listeners[type] || []) fn(e); }

  // must run from a user gesture (autoplay policy)
  async start() {
    if (!this.started) {
      this.started = true;
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      this.audioCtx = ctx;
      this.srcNode = ctx.createMediaElementSource(this.track);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.55;
      this.srcNode.connect(this.analyser);
      this.analyser.connect(ctx.destination);
      this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    }
    if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();
    await this.track.play();
    this.playing = true;
  }

  stop() {
    this.track.pause();
    this.playing = false;
  }

  toggle() { return this.playing ? this.stop() : this.start(); }

  // wipe the grid and start song `i` of the set from its first frame
  load(i) {
    this.index = (i + SETLIST.length) % SETLIST.length;
    this.song = SETLIST[this.index];
    this.orca.reset(GRID.w, GRID.h);
    this.performer = new Performer(this.orca, this.song);
    this.view = { s: this.orca.s, locks: [], ports: [], f: 0, cursor: { x: 0, y: 0 }, msgs: 0 };
    if (this.ctx) this.draw();
    this.emit('song', this.song);
  }

  next() { this.load(this.index + 1); }

  frameIndex(time) {
    const { bpm, offset } = SOUNDTRACK;
    return Math.floor((time - offset) * bpm / 60 * 4);
  }

  syncClock() {
    if (!this.playing) return;
    let f = this.frameIndex(this.track.currentTime);
    if (f < 0) return;
    if (f < this.lastF) {
      this.lastF = -1;
      this.load(this.index);
      f = this.frameIndex(this.track.currentTime);
      if (f < 0) return;
    }
    while (this.lastF < f) {
      this.lastF += 1;
      if (this.orca.f >= this.performer.length) this.next();
      this.performer.step(this.orca.f);
      this.outbox = [];
      this.orca.run();
      if (this.lastF !== f) continue;
      const step = this.lastF % 16;
      this.view = {
        s: this.orca.s,
        locks: this.orca.locks.slice(),
        ports: findPorts(this.orca),
        f: this.lastF,
        cursor: { ...this.performer.cursor },
        msgs: this.outbox.length,
      };
      this.draw();
      this.emit('frame', { f: this.lastF, bar: Math.floor(this.lastF / 16), step });
      if (step === 0) this.emit('note', { role: 'kick', velocity: Math.max(0.45, this.levels.low), midi: 36 });
      if (step === 8) this.emit('note', { role: 'snare', velocity: Math.max(0.35, this.levels.high), midi: 38 });
      if (step % 2 === 0) this.emit('note', { role: 'hat', velocity: 0.25 + this.levels.high * 0.4, midi: 42 });
    }
  }

  // per-frame audio levels, 0..1, from the Pilot master output
  update() {
    if (!this.analyser) return this.levels;
    this.analyser.getByteFrequencyData(this.bins);
    const hz = (this.analyser.context?.sampleRate || 44100) / this.analyser.fftSize;
    const band = (lo, hi) => {
      let s = 0, n = 0;
      for (let i = Math.floor(lo / hz); i <= Math.min(Math.ceil(hi / hz), this.bins.length - 1); i++) { s += this.bins[i]; n++; }
      return n ? s / n / 255 : 0;
    };
    const target = { low: band(30, 180), mid: band(180, 2000), high: band(2000, 12000) };
    for (const k in target) this.levels[k] += (target[k] - this.levels[k]) * 0.5;
    this.levels.rms = (this.levels.low + this.levels.mid + this.levels.high) / 3;
    return this.levels;
  }

  // --- grid, drawn the way the ORCA client draws it -------------------------

  draw() {
    const g = this.ctx;
    const { s, locks, ports, f, cursor } = this.view;
    g.fillStyle = THEME.background;
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    g.font = `${TILE.h * 0.78}px "Input Mono", "Menlo", "Consolas", monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';

    for (let y = 0; y < GRID.h; y++) {
      for (let x = 0; x < GRID.w; x++) {
        const i = x + y * GRID.w;
        const c = s.charAt(i);
        const marker = x % MARKER === 0 && y % MARKER === 0;
        const port = ports[i];
        const isCursor = this.playing && x === cursor.x && y === cursor.y;
        const locked = locks[i] === true;
        if (c === '.' && !marker && !isCursor && port === undefined && !locked) continue;
        const glyph = c !== '.' ? c : isCursor ? '@' : marker ? '+' : c;
        this.sprite(x, y, glyph, isCursor ? 4 : c === '*' && !locked ? 2 : port !== undefined ? port : locked ? 5 : 20);
      }
    }
    const y = GRID.h;
    this.text(`${f}f${this.playing ? '' : '~'}`, 0, y, 2);
    this.text(`${SOUNDTRACK.bpm}`, MARKER, y, 2);
    this.text('|'.repeat(this.view.msgs).padEnd(MARKER - 1, '.'), MARKER * 2, y, 2);
    const tag = scene().title.toLowerCase().padEnd(12, '.').slice(0, 12);
    this.text(tag, MARKER * 3, y, 5);

    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.font = `13px "Microsoft YaHei", "Noto Sans SC", "PingFang SC", sans-serif`;
    const beat = scene();
    let line = '点一下开饭';
    if (this.started && this.playing) line = `> ${beat.prompt}`;
    else if (this.started) line = '> 测完告诉我就行';
    g.fillStyle = this.playing ? THEME.b_med : THEME.b_inv;
    g.fillText(line, 6, (y + 1.45) * TILE.h);
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.font = `${TILE.h * 0.78}px "Input Mono", "Menlo", "Consolas", monospace`;
  }

  sprite(x, y, g, type) {
    const st = style(type);
    const ctx = this.ctx;
    if (st.bg) { ctx.fillStyle = st.bg; ctx.fillRect(x * TILE.w, y * TILE.h, TILE.w, TILE.h); }
    if (st.fg) { ctx.fillStyle = st.fg; ctx.fillText(g, (x + 0.5) * TILE.w, (y + 0.78) * TILE.h); }
  }

  text(str, x, y, type) { [...str].forEach((c, i) => this.sprite(x + i, y, c, type)); }
}

function style(type) {
  switch (type) {
    case 0: return { bg: THEME.b_med, fg: THEME.f_low };   // operator
    case 1: return { fg: THEME.b_med };                     // haste input
    case 2: return { fg: THEME.b_high };                    // input / bang
    case 3: return { bg: THEME.b_high, fg: THEME.f_low };   // output
    case 4: return { bg: THEME.b_inv, fg: THEME.f_inv };    // cursor
    case 5: return { fg: THEME.f_med };                     // locked
    default: return { fg: THEME.f_low };
  }
}

// same as Client.findPorts: index -> port type for every unlocked operator
function findPorts(orca) {
  const a = [];
  for (const op of orca.runtime) {
    if (orca.lockAt(op.x, op.y)) continue;
    for (const [x, y, type] of op.getPorts()) a[orca.indexAt(x, y)] = type;
  }
  return a;
}
