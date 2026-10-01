// "Around the World" (Daft Punk, 1997).
// E minor, 121 bpm, four on the floor. Bass from tab (geekabit.nl, standard EADG):
//
//   A  D|/4-2-------------|      the descending riff, F# E D C B A G in 8ths, every bar
//      A|----5-3-2-------|
//      E|----------5-3---|
//
//   B  A . . . | C . . . | Em . . . | riff      quarters with a 16th pickup into the next bar
//
// Lead synth from a melody breakdown (melodics.com): D E up to D, down the scale to G, G A G A,
// land on B; second half jumps the octave E-E, down the pentatonic, G A G A, land on E.
// The "around the world" chant is by ear: four syllables per half bar on F#-B.
//
// Loops line up with bar 0, so the 4-bar parts enter on a multiple of 4.

import { seq, stab, editor } from './kit.js';

const BLOCKS = {
  title: { x: 1, y: 0, rows: ['#.eat.rice.little.whale.#'] },
  //                      steps: 1...2...3...4...
  kick: { x: 1, y: 2, rows: seq(1, 'D...D...D...D...', 'c2f3') },
  snare: { x: 1, y: 6, rows: seq(1, '....G.......G...', 'd3d4') },
  hats: { x: 1, y: 10, rows: seq(1, '..C...C...C...C.', 'e73') },
  //                      16ths: F# E  D  C  B  A  G
  bass: { x: 26, y: 2, rows: seq(1, 'm.L.K.J.B.A.G...', '02f3') },
  //                      8ths: A.......C.......Em......riff....
  bass2: { x: 1, y: 14, rows: seq(2, 'A.A.A.ABJ.J.J.JKL.L.L.L.mLKJBAG.', '02f4') },
  //                      8ths: D E D'C B A G A G A B         D E E'D B A G A G A E
  lead: { x: 1, y: 18, rows: seq(2, 'DEKJBAGAGAB.....DELKBAGAGAE.....', '44c3') },
  //                      a-round-the-world x2
  chant: { x: 40, y: 14, rows: seq(2, 'BBAfBBAG', '63b4') },
  ch1: { x: 26, y: 6, rows: stab('AJLL', '13a2') },     // B section chords: root
  ch2: { x: 26, y: 10, rows: stab('jLNN', '23a2') },    // and third
  fx: { x: 1, y: 22, rows: ['.Dw', '..;rev23;pha36;cho24'] },
  env: { x: 26, y: 22, rows: ['.Dw', '..;1env0322;2env0322;6env1688'] },
};

const { mute, unmute, octave, step, effect } = editor(BLOCKS);
const reverb = (wet, size) => effect('rev', wet, size);
const sixteenths = (name) => [0, 4, 8, 12].map((i) => step(name, i, 'C'));
const B = ['bass2', 'ch1', 'ch2'];

export default {
  title: 'eat rice',
  artist: 'little whale',
  link: 'https://internet.bizar.ro/',
  file: 'eat_rice.orca',
  bpm: 121,
  blocks: BLOCKS,
  timeline: [
    [0, { type: 'title' }, { type: 'fx' }, { type: 'env' }],
    [1, { type: 'kick' }],
    [3, { type: 'hats' }],
    [4, { type: 'bass' }],
    [8, { type: 'snare' }, { type: 'chant' }],
    [12, { type: 'lead' }],
    [20, ...mute('bass', 'lead'), ...B.map((type) => ({ type }))],                   // B section
    [28, ...mute(...B), ...unmute('bass', 'lead'), ...sixteenths('hats')],           // back to the riff
    [36, ...mute('kick', 'snare', 'hats'), ...reverb('9', 'f')],                     // breakdown
    [40, ...unmute('kick', 'snare', 'hats', ...B), ...mute('bass', 'lead'), ...reverb('2', '3')],
    [48, ...mute(...B), ...unmute('bass', 'lead'), octave('lead', '5')],             // last round, lead up
    [56, { erase: 'lead' }],
    [57, { erase: 'chant' }],
    [58, ...B.map((erase) => ({ erase }))],
    [59, { erase: 'hats' }, { erase: 'snare' }],
    [60, { erase: 'bass' }],
    [61, { erase: 'kick' }],
  ],
  length: 63,
};
