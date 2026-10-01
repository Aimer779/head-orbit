// "Supermassive Black Hole" (Muse, 2006).
// E minor, 120 bpm. Riffs transcribed from guitar tab (musewiki.org, standard tuning):
//
//   verse  A|------10-------------------10--------775----|
//          E|0--0------0--0--333--0--0------0--0--553----|
//          E E G3 . E E G G G  /  E E G3 . E E A5 A5 G5, 2 bars of 16ths, played on the bass voice
//
//   chorus D|----7-----7-7-6-----5---------------9-----8-7-5----------------|
//          A|------------------------------------------------7--------------|
//          E|5-5---5-5-------3-3---3-3-5-5-6-7-7---7-7---------0-0-2-2-3-3-4|
//          one note per 8th, 4 bars: A | G | B | E walking back up E F# G G#
//
// Loops line up with bar 0, so the 4-bar chorus has to enter on a multiple of 4.

import { seq, stab, editor } from './kit.js';

const BLOCKS = {
  title: { x: 1, y: 0, rows: ['#.deepsleep.dive.loop.#'] },
  //                      steps: 1...2...3...4...
  kick: { x: 1, y: 2, rows: seq(1, 'D.......D.D.....', 'c2f3') },
  snare: { x: 1, y: 6, rows: seq(1, '....G.......G...', 'd3d4') },
  hats: { x: 1, y: 10, rows: seq(1, '..C...C...C...C.', 'e73') },
  //                      16ths: E E  G3  E E GGG  E E  G3  E E AAG
  riff: { x: 1, y: 14, rows: seq(1, 'E.E..N..E.E.GGG.E.E..N..E.E.AAG.', '02f2') },
  //                      8ths: A.......G.......B.......E.......
  chorus: { x: 1, y: 18, rows: seq(2, 'AAOAAOOnGGNGGAAaBBPBBoONLEEffGGg', '43c3') },
  pw1: { x: 26, y: 2, rows: stab('AGBE', '13a2') },     // chorus power chords: root
  pw2: { x: 26, y: 6, rows: stab('LKmB', '23a2') },     // and fifth
  clap: { x: 26, y: 10, rows: seq(1, '....G.......G..G', 'f4b2') },
  fx: { x: 1, y: 22, rows: ['.Dw', '..;rev24;dis26;cho13'] },
  // fuzz: saw oscillators on the riff and chorus voices, short chord envelopes
  env: { x: 26, y: 22, rows: ['.Dw', '..;0osc4w;4osc4w;1env0322'] },
};

const { mute, unmute, octave, step, effect } = editor(BLOCKS);
const reverb = (wet, size) => effect('rev', wet, size);
const fuzz = (wet, amount) => effect('dis', wet, amount);
const sixteenths = (name) => [0, 4, 8, 12].map((i) => step(name, i, 'C'));

export default {
  title: 'deepsleep',
  artist: 'little whale',
  link: 'https://internet.bizar.ro/',
  file: 'deepsleep.orca',
  bpm: 120,
  blocks: BLOCKS,
  timeline: [
    [0, { type: 'title' }, { type: 'fx' }, { type: 'env' }],
    [2, { type: 'riff' }],                                                           // riff alone
    [4, { type: 'kick' }, { type: 'hats' }],
    [8, { type: 'snare' }, { type: 'clap' }],                                        // verse
    [16, ...mute('riff'), { type: 'chorus' }, { type: 'pw1' }, { type: 'pw2' }, ...fuzz('5', '9')],
    [24, ...mute('chorus', 'pw1', 'pw2'), ...unmute('riff'), ...fuzz('2', '6'), ...sixteenths('hats')],
    [32, ...mute('riff'), ...unmute('chorus', 'pw1', 'pw2'), ...fuzz('5', '9')],
    [40, ...mute('chorus', 'pw1', 'pw2', 'kick', 'snare', 'clap'), ...unmute('riff'), ...reverb('9', 'f')], // breakdown
    [42, ...unmute('kick')],
    [44, ...mute('riff'), ...unmute('chorus', 'pw1', 'pw2', 'snare', 'clap'), octave('chorus', '4'), ...reverb('2', '4')],
    [52, ...mute('chorus', 'pw1', 'pw2'), ...unmute('riff'), ...fuzz('2', '6')],     // out on the riff
    [56, { erase: 'chorus' }, { erase: 'pw1' }, { erase: 'pw2' }],
    [57, { erase: 'clap' }, { erase: 'hats' }],
    [58, { erase: 'snare' }],
    [59, { erase: 'kick' }],
    [60, { erase: 'riff' }],
  ],
  length: 62,
};
