// "She Drives Me Crazy" (Fine Young Cannibals, 1988).
// D major, D | G | Bm | A, ~109 bpm.
// Arrangement by ear-from-memory: bass, offbeat chord stabs, drums and a chorus-style hook on chord tones.

import { seq, stab, editor } from './kit.js';

const BLOCKS = {
  title: { x: 1, y: 0, rows: ['#.not.cheap.not.pdd.#'] },
  //                      steps: 1...2...3...4...
  kick: { x: 1, y: 2, rows: seq(1, 'D.....D.D.....D.', 'c2f3') },
  snare: { x: 1, y: 6, rows: seq(1, '....G.......G...', 'd3d4') },
  hats: { x: 1, y: 10, rows: seq(1, '..C...C...C...CC', 'e73') },
  //                      8ths: D.......G.......Bm......A.......
  bass: { x: 1, y: 14, rows: seq(2, 'D.KDD.KDG.NGG.NGB.PBB.PBA.OAA.Oc', '02c4') },
  lead: { x: 1, y: 18, rows: seq(2, 'K.K.jKA.B.B.ABG.f.f.EfD.E.E.cEA.', '44a5') },
  ch1: { x: 26, y: 2, rows: stab('DDDc', '14a2') },
  ch2: { x: 26, y: 6, rows: stab('fGfE', '24a2') },
  ch3: { x: 26, y: 10, rows: stab('ABBA', '34a2') },
  fx: { x: 1, y: 22, rows: ['.Dw', '..;rev37;cho35;dis13'] },
  env: { x: 26, y: 22, rows: ['.Dw', '..;1env0322;2env0322;3env0322'] },
};

const { mute, unmute, octave, step, effect } = editor(BLOCKS);
const reverb = (wet, size) => effect('rev', wet, size);

export default {
  title: 'not cheap',
  artist: 'little whale',
  link: 'https://internet.bizar.ro/',
  file: 'not_cheap.orca',
  bpm: 109,
  blocks: BLOCKS,
  // [bar, ...actions]. `type` blocks are timed to finish just before the bar starts.
  timeline: [
    [0, { type: 'title' }, { type: 'fx' }, { type: 'env' }],
    [1, { type: 'kick' }],
    [3, { type: 'hats' }],
    [5, { type: 'bass' }],
    [9, { type: 'snare' }, { type: 'ch1' }],
    [11, { type: 'ch2' }, { type: 'ch3' }],
    [13, { type: 'lead' }],
    [21, ...mute('lead'), ...reverb('2', 'c')],                                       // verse: hook out
    [25, step('hats', 0, 'C'), step('hats', 4, 'C'), step('hats', 8, 'C'), step('hats', 12, 'C')],
    [29, ...unmute('lead'), octave('lead', '5'), ...reverb('3', '7')],                 // chorus, up an octave
    [37, ...mute('kick', 'snare', 'bass'), ...reverb('9', 'f')],                       // breakdown
    [41, ...unmute('bass', 'kick')],
    [43, ...unmute('snare'), octave('lead', '4'), ...reverb('3', '7')],
    [53, { erase: 'lead' }],
    [54, { erase: 'ch3' }, { erase: 'ch2' }],
    [55, { erase: 'ch1' }, { erase: 'hats' }],
    [56, { erase: 'bass' }],
    [57, { erase: 'snare' }],
    [58, { erase: 'kick' }],
  ],
  length: 60,
};
