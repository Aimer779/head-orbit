// Pilot synth, ported from https://github.com/hundredrabbits/Pilot (MIT License, (c) 2017 Hundredrabbits).
// Same 16 voices, same 16-effect chain, same message protocol as the UDP listener:
//   notes   `04Cf8`  -> channel 0, octave 4, note C, velocity f (0-f), length 8 (0-f, /15 seconds)
//   env     `1ENV0322`, osc `1OSC8isi`, effects `REV4a` (wet, value), `BPM120`, several joined with `;`.
// Differences from the desktop app: Tone 15 API, notes are scheduled at an exact audio `time`
// (ORCA runs inside the transport), every played note is reported through `onNote`, and a master
// trim + hard limiter sits after the chain (see `output`).

import * as Tone from 'tone';

const OCTAVE = ['C', 'c', 'D', 'd', 'E', 'F', 'f', 'G', 'g', 'A', 'a', 'B'];
const WAVCODES = ['si', 'tr', 'sq', 'sw', '2i', '2r', '2q', '2w', '4i', '4r', '4q', '4w', '8i', '8r', '8q', '8w'];
const WAVNAMES = ['sine', 'triangle', 'square', 'sawtooth', 'sine2', 'triangle2', 'square2', 'sawtooth2', 'sine4', 'triangle4', 'square4', 'sawtooth4', 'sine8', 'triangle8', 'square8', 'sawtooth8'];
const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';

// letter -> [note, octave offset]; letters past G wrap upward (H..Z), lowercase is sharp
const TRANSPOSE = {
  A: 'A0', a: 'a0', B: 'B0', C: 'C0', c: 'c0', D: 'D0', d: 'd0', E: 'E0', F: 'F0', f: 'f0', G: 'G0', g: 'g0',
  H: 'A0', h: 'a0', I: 'B0', J: 'C1', j: 'c1', K: 'D1', k: 'd1', L: 'E1', M: 'F1', m: 'f1', N: 'G1', n: 'g1',
  O: 'A1', o: 'a1', P: 'B1', Q: 'C2', q: 'c2', R: 'D2', r: 'd2', S: 'E2', T: 'F2', t: 'f2', U: 'G2', u: 'g2',
  V: 'A2', v: 'a2', W: 'B2', X: 'C3', x: 'c3', Y: 'D3', y: 'd3', Z: 'E3',
  e: 'F0', l: 'F1', s: 'F2', z: 'F3', b: 'C1', i: 'C1', p: 'C2', w: 'C3',
};

const int36 = (s) => B36.indexOf(`${s}`.toLowerCase());
const from16 = (s) => int36(s) / 15;
const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
const wavName = (c) => WAVNAMES[WAVCODES.indexOf(`${c}`.toLowerCase())] || 'sine';

function transpose(n, o) {
  const t = TRANSPOSE[n];
  if (!t) return null;
  return { note: t.charAt(0), octave: clamp(o + parseInt(t.charAt(1)), 0, 8) };
}

export class Pilot {
  constructor() {
    this.onNote = null; // (event) => {}, called at schedule time with the audio `time`
    this.channels = [
      // AM
      new Tone.AMSynth({ harmonicity: 1.25, oscillator: { type: 'sine8' }, modulation: { type: 'sine' } }),
      new Tone.AMSynth({ harmonicity: 1.5, oscillator: { type: 'triangle8' }, modulation: { type: 'sawtooth' } }),
      new Tone.AMSynth({ harmonicity: 1.75, oscillator: { type: 'sawtooth8' }, modulation: { type: 'triangle' } }),
      new Tone.AMSynth({ harmonicity: 2, oscillator: { type: 'square8' }, modulation: { type: 'square' } }),
      new Tone.AMSynth({ harmonicity: 1.25, oscillator: { type: 'sine4' }, modulation: { type: 'square8' } }),
      new Tone.AMSynth({ harmonicity: 1.5, oscillator: { type: 'triangle4' }, modulation: { type: 'sawtooth8' } }),
      // FM
      new Tone.FMSynth({ harmonicity: 1.75, modulationIndex: 10, oscillator: { type: 'sawtooth4' }, modulation: { type: 'triangle8' } }),
      new Tone.FMSynth({ harmonicity: 2, modulationIndex: 20, oscillator: { type: 'square4' }, modulation: { type: 'sine8' } }),
      new Tone.FMSynth({ harmonicity: 0.5, modulationIndex: 30, oscillator: { type: 'sine' }, modulation: { type: 'sawtooth4' } }),
      new Tone.FMSynth({ harmonicity: 2.5, modulationIndex: 40, oscillator: { type: 'sine' }, modulation: { type: 'triangle8' } }),
      new Tone.MonoSynth({ volume: -20, oscillator: { type: 'sawtooth4' } }),
      new Tone.MonoSynth({ volume: -20, oscillator: { type: 'sine4' } }),
      // Membrane
      new Tone.MembraneSynth({ octaves: 5, oscillator: { type: 'sine' } }),
      new Tone.MembraneSynth({ octaves: 10, oscillator: { type: 'sawtooth' } }),
      new Tone.MembraneSynth({ octaves: 15, oscillator: { type: 'triangle' } }),
      new Tone.MembraneSynth({ octaves: 20, oscillator: { type: 'square' } }),
    ];
    this.lastNote = new Array(16).fill(-1);

    const fx = this.effects = {
      // I
      bit: new Tone.BitCrusher(4),
      dis: new Tone.Distortion(0.05),
      wah: new Tone.AutoWah(100, 6, 0),
      che: new Tone.Chebyshev(50),
      // II
      fee: new Tone.FeedbackDelay(0),
      del: new Tone.PingPongDelay('4n', 0.2),
      tre: new Tone.Tremolo().start(),
      rev: new Tone.JCReverb(0),
      // III
      pha: new Tone.Phaser(0.5, 3, 350),
      vib: new Tone.Vibrato(),
      cho: new Tone.Chorus(4, 2.5, 0.5).start(),
      ste: new Tone.StereoWidener(0.5),
      // Mastering
      equ: new Tone.EQ3(5, 0, 5),
      com: new Tone.Compressor(-6, 4),
      vol: new Tone.Volume(6),
      lim: new Tone.Limiter(-2),
    };
    for (const node of Object.values(fx)) if (node.wet) node.wet.value = 0;

    for (const ch of this.channels) ch.connect(fx.bit);
    const chain = Object.values(fx);
    for (let i = 0; i < chain.length - 1; i++) chain[i].connect(chain[i + 1]);

    // Pilot's own limiter has a 30dB soft knee and lets the +6dB volume stage peak ~2.8x full scale,
    // which hard-clips in a browser. Trim and catch it with a hard-knee limiter before the speakers.
    this.output = new Tone.Gain(Tone.dbToGain(-10));   // tap this for analysis
    fx.lim.connect(this.output);
    this.output.chain(new Tone.Compressor({ threshold: -3, ratio: 20, knee: 0, attack: 0.001, release: 0.1 }), Tone.getDestination());
    this.reset();
  }

  // --- protocol -------------------------------------------------------------

  run(msg, time) {
    msg = `${msg}`;
    if (msg.includes(';')) { for (const part of msg.split(';')) this.run(part, time); return; }
    if (!msg) return;
    const code = msg.substr(0, 3).toLowerCase();
    if (this.effects[code] && msg.length > 3) { this.setEffect(code, msg.substr(3)); return; }
    if (code === 'bpm') { const bpm = parseInt(msg.substr(3)); if (bpm >= 30) Tone.getTransport().bpm.rampTo(bpm, 4); return; }
    if (msg.substr(0, 5).toLowerCase() === 'reset') { this.reset(); return; }
    const id = int36(msg.charAt(0));
    if (id < 0 || id > 15) return;
    this.operate(id, msg.substr(1), time);
  }

  operate(id, msg, time) {
    const cmd = msg.substr(0, 3).toLowerCase();
    if (cmd === 'env') return this.setEnv(id, msg.substr(3));
    if (cmd === 'osc') return this.setOsc(id, msg.substr(3));
    this.playNote(id, msg, time);
  }

  playNote(id, msg, time = Tone.now()) {
    if (msg.length < 2) return;                       // rest: ORCA wrote '.' in the note cell
    const octave = clamp(parseInt(msg.charAt(0)), 0, 8);
    if (isNaN(octave)) return;
    const t = transpose(msg.charAt(1), octave);
    if (!t || OCTAVE.indexOf(t.note) < 0) return;
    if (time - this.lastNote[id] < 0.1) return;       // same 100ms guard as Pilot
    const velocity = msg.length >= 3 ? from16(msg.charAt(2)) : 0.66;
    const length = clamp(msg.length === 4 ? from16(msg.charAt(3)) : 0.1, 0.1, 0.9);
    const sharp = t.note === t.note.toUpperCase() ? '' : '#';
    const name = `${t.note.toUpperCase()}${sharp}${t.octave}`;
    this.channels[id].triggerAttackRelease(name, length, time, velocity);
    this.lastNote[id] = time;
    this.onNote?.({ channel: id, note: name, midi: Tone.Frequency(name).toMidi(), velocity, length, time });
  }

  setEnv(id, v) {
    if (id > 11) return;
    const env = this.channels[id].envelope;
    const keys = ['attack', 'decay', 'sustain', 'release'];
    for (let i = 0; i < 4 && i < v.length; i++) env[keys[i]] = clamp(int36(v.charAt(i)) / 15, 0.01, 1);
  }

  setOsc(id, v) {
    const ch = this.channels[id];
    const opts = { oscillator: { type: wavName(v.substr(0, 2)) } };
    if (v.length > 3 && v.substr(2, 2) !== '--' && 'modulation' in ch) opts.modulation = { type: wavName(v.substr(2, 2)) };
    ch.set(opts);
  }

  setEffect(code, v) {
    const node = this.effects[code];
    if (node.wet) node.wet.value = from16(v.charAt(0));
    if (v.length < 2) return;
    const value = from16(v.charAt(1));
    switch (code) {
      case 'rev': node.roomSize.value = value; break;
      case 'dis': node.distortion = value; break;
      case 'bit': node.bits.value = clamp(parseInt(value * 8), 1, 8); break;
      case 'cho': node.depth = value; break;
      case 'fee': node.delayTime.value = value; break;
      case 'tre': case 'vib': node.depth.value = value; break;
      case 'pha': node.octaves = clamp(parseInt(value * 3), 0, 8); break;
      case 'wah': node.octaves = clamp(parseInt(value * 6), 0, 8); break;
      case 'che': node.order = clamp(parseInt(value * 100), 1, 100); break;
    }
  }

  reset() {
    this.channels.forEach((ch, id) => {
      if (id > 11) return;
      Object.assign(ch.envelope, {
        attack: 0.001,
        decay: clamp((8 - (id % 8)) / 8, 0.01, 0.9),
        sustain: clamp((id % 4) / 4, 0.01, 0.9),
        release: clamp((id % 6) / 6, 0.01, 0.9),
      });
    });
    this.run('0OSC8isi;1OSC8rsw;2OSC8wtr;3OSC8qsq;4OSC4i8q;5OSC4r8w;6OSCtr8r;7OSCtr8i;8OSCtr4w;9OSCtr8r;AOSC4w--;BOSC4i--;COSCsi--;DOSCsw--;EOSCtr--;FOSCsq--');
    this.run('BIT07;DIS00;WAH0F;CHE07;FEE00;TRE07;REV00;PHA0F;VIB01;CHO07');
  }
}
