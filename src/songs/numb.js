// "Numb" (Linkin Park, 2003).
// F# minor, F#m | D | A | E, 110 bpm. Intro synth hook from the piano transcription
// (pianoletternotes.blogspot.com), one note per quarter over 8 bars:
//
//   C# E C# F# . . A . . G# . . . . . .  /  C# E C# A . . G# . . E . . . . . .
//
// Loops line up with bar 0: the 8-bar hook enters on bar 4, i.e. on its second half.

import { seq, chug, editor } from './kit.js';

const BLOCKS = {
  title: { x: 1, y: 0, rows: ['#.user.totally.mad.#'] },
  //                      steps: 1...2...3...4...
  kick: { x: 1, y: 2, rows: seq(1, 'D.....D.D.......', 'c2f3') },
  snare: { x: 1, y: 6, rows: seq(1, '....G.......G...', 'd3d4') },
  hats: { x: 1, y: 10, rows: seq(1, 'C.C.C.C.C.C.C.C.', 'e73') },
  //                      8ths: F#m.....D.......A.......E.......
  bass: { x: 1, y: 14, rows: seq(2, 'ffffffffDDDDDDDDAAAAAAAAEEEEEEEE', '02c3') },
  //                      quarters: c# e c# f#  a  g#      c# e c# a  g#  e
  lead: { x: 1, y: 18, rows: seq(4, 'jLjm..O..n......jLjO..n..L......', '44c9') },
  gtr1: { x: 26, y: 2, rows: chug('fDAE', '13c2') },    // chorus guitars on every 8th: root
  gtr2: { x: 26, y: 6, rows: chug('jALB', '23c2') },    // fifth
  gtr3: { x: 26, y: 10, rows: chug('Afjg', '33a2') },   // third
  fx: { x: 1, y: 22, rows: ['.Dw', '..;rev26;cho24;dis14'] },
  env: { x: 26, y: 22, rows: ['.Dw', '..;1env0312;2env0312;3env0312'] },
};

const { mute, unmute, octave, effect } = editor(BLOCKS);
const reverb = (wet, size) => effect('rev', wet, size);
const dist = (wet, amount) => effect('dis', wet, amount);
const GTRS = ['gtr1', 'gtr2', 'gtr3'];

export default {
  title: 'user mad',
  artist: 'little whale',
  link: 'https://internet.bizar.ro/',
  file: 'user_mad.orca',
  bpm: 110,
  blocks: BLOCKS,
  timeline: [
    [0, { type: 'title' }, { type: 'fx' }, { type: 'env' }],
    [2, { type: 'hats' }],
    [4, { type: 'lead' }],                                                           // intro hook
    [12, { type: 'kick' }, { type: 'snare' }, { type: 'bass' }],                     // verse
    [20, ...GTRS.map((type) => ({ type })), ...dist('4', '8'), ...reverb('3', '8')], // chorus
    [28, ...mute(...GTRS), ...dist('1', '4'), ...reverb('2', '6')],                  // verse 2
    [36, ...unmute(...GTRS), ...dist('4', '8'), ...reverb('3', '8')],
    [44, ...mute(...GTRS, 'kick', 'snare', 'bass', 'hats'), ...reverb('9', 'f')],   // bridge: hook alone
    [48, ...unmute(...GTRS, 'kick', 'snare', 'bass', 'hats'), octave('lead', '5'), ...reverb('3', '8')],
    [56, { erase: 'lead' }],
    [57, ...GTRS.map((erase) => ({ erase }))],
    [58, { erase: 'bass' }],
    [59, { erase: 'hats' }, { erase: 'snare' }],
    [60, { erase: 'kick' }],
  ],
  length: 62,
};
