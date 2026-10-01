// ORCA + Pilot running in the page. The Tone transport ticks one ORCA frame per 16th note; every `;`
// message goes to the Pilot port at that frame's exact audio time. Visual events (notes, frames) are
// re-timed with Tone.Draw so they land when the sound is heard, not when it is scheduled.

import * as Tone from 'tone';
import { Orca, library } from './orca-core.js';
import { Pilot } from './pilot.js';
import { GRID, SETLIST, Performer } from './song.js';
import { scene } from './story.js';

// Pilot channel -> role in the arrangement (see songs/kit.js)
export const ROLE = { 0: 'bass', 1: 'stab', 2: 'stab', 3: 'stab', 4: 'lead', 6: 'lead', 12: 'kick', 13: 'snare', 14: 'hat', 15: 'snare' };

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
    this.draw();
  }

  on(type, fn) { (this.listeners[type] ||= []).push(fn); }
  emit(type, e) { for (const fn of this.listeners[type] || []) fn(e); }

  // must run from a user gesture (autoplay policy)
  async start() {
    if (!this.started) {
      this.started = true;
      // Native context, not Tone's standardized-audio-context wrapper: its connect() walks every path
      // for cycles, and Pilot's 16 serial dry/wet effects double the paths per stage, so each note
      // start took seconds. Pilot itself ran on old Tone with native nodes.
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      // Firefox has no AudioParams on AudioListener, and Tone's Listener wraps each one in a Param
      // ("param must be an AudioParam"). Back the missing ones with throwaway gain params, 3D is unused.
      for (const k of ['positionX', 'positionY', 'positionZ', 'forwardX', 'forwardY', 'forwardZ', 'upX', 'upY', 'upZ']) {
        if (!ctx.listener[k]) Object.defineProperty(ctx.listener, k, { value: ctx.createGain().gain });
      }
      Tone.setContext(ctx);
      await Tone.start();
      this.pilot = new Pilot();
      this.pilot.onNote = (e) => Tone.getDraw().schedule(() => this.emit('note', { ...e, role: ROLE[e.channel] }), e.time);

      this.analyser = Tone.getContext().createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.6;
      this.pilot.output.connect(this.analyser);
      this.bins = new Uint8Array(this.analyser.frequencyBinCount);

      const transport = Tone.getTransport();
      transport.bpm.value = this.song.bpm;
      transport.scheduleRepeat((time) => this.frame(time), '16n');
    }
    Tone.getTransport().start();
    this.playing = true;
  }

  stop() {
    Tone.getTransport().pause();
    this.playing = false;
  }

  toggle() { return this.playing ? this.stop() : this.start(); }

  // wipe the grid and start song `i` of the set from its first frame
  load(i) {
    this.index = (i + SETLIST.length) % SETLIST.length;
    this.song = SETLIST[this.index];
    this.orca.reset(GRID.w, GRID.h);
    this.performer = new Performer(this.orca, this.song);
    if (this.started) {
      Tone.getTransport().bpm.value = this.song.bpm;
      this.pilot.reset();                            // oscillators / effects back to Pilot defaults
    }
    if (this.ctx) {                                  // skipped while paused: show the empty grid now
      this.view = { s: this.orca.s, locks: [], ports: [], f: 0, cursor: { x: 0, y: 0 }, msgs: 0 };
      this.draw();
    }
    this.emit('song', this.song);
  }

  next() { this.load(this.index + 1); }

  frame(time) {
    const orca = this.orca;
    if (orca.f >= this.performer.length) this.next();   // end of the song: wipe the grid, next one
    const f = orca.f;
    this.performer.step(f);
    this.outbox = [];
    orca.run();
    for (const msg of this.outbox) this.pilot.run(msg, time);

    const view = { s: orca.s, locks: orca.locks.slice(), ports: findPorts(orca), f, cursor: { ...this.performer.cursor }, msgs: this.outbox.length };
    Tone.getDraw().schedule(() => {
      this.view = view;
      this.draw();
      this.emit('frame', { f, bar: Math.floor(f / 16), step: f % 16 });
    }, time);
  }

  // per-frame audio levels, 0..1, from the Pilot master output
  update() {
    if (!this.analyser) return this.levels;
    this.analyser.getByteFrequencyData(this.bins);
    const hz = Tone.getContext().sampleRate / this.analyser.fftSize;
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
    this.text(`${this.song.bpm}`, MARKER, y, 2);
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
