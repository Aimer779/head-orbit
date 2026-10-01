// The set: ORCA patches for Pilot, one per song (src/songs/), played back to back.
//
// Nothing plays on its own: a scripted "performer" live-codes the grid, typing blocks in, muting them
// (swapping `;` for `.`) and erasing them, the way a set in ORCA is played.

import { BAR } from './songs/kit.js';
import sheDrivesMeCrazy from './songs/she-drives-me-crazy.js';
import supermassiveBlackHole from './songs/supermassive-black-hole.js';
import numb from './songs/numb.js';
import aroundTheWorld from './songs/around-the-world.js';

export const SETLIST = [aroundTheWorld, sheDrivesMeCrazy, supermassiveBlackHole, numb];
export const GRID = { w: 56, h: 25 };

// --- performer ---------------------------------------------------------------

const CHARS_PER_FRAME = 4;

// expand a block into keystrokes, in reading order: a `;` locks the cells to its right, so message
// text typed after it can't run as operators
function keystrokes(b) {
  const keys = [];
  b.rows.forEach((row, ry) => [...row].forEach((g, rx) => {
    if (g !== '.') keys.push({ x: b.x + rx, y: b.y + ry, g });
  }));
  return keys;
}

// erasing is select + delete: the whole rect goes in one keystroke, clock outputs included
function selection(b) {
  return { x: b.x, y: b.y, rect: { w: Math.max(...b.rows.map((r) => r.length)), h: b.rows.length } };
}

export class Performer {
  constructor(orca, song) {
    this.orca = orca;
    this.song = song;
    this.cursor = { x: 0, y: 0 };
    this.queue = [];
    this.schedule = [];
    for (const [bar, ...actions] of song.timeline) {
      const keys = actions.flatMap((a) => (a.type ? keystrokes(song.blocks[a.type]) : a.erase ? [selection(song.blocks[a.erase])] : [a.edit]));
      // typed blocks land before the downbeat, edits/erases happen on it
      const lead = actions.some((a) => a.type) ? Math.ceil(keys.length / CHARS_PER_FRAME) + 1 : 0;
      this.schedule.push({ frame: Math.max(0, bar * BAR - lead), keys });
    }
    this.schedule.sort((a, b) => a.frame - b.frame);
  }

  get length() { return this.song.length * BAR; }

  // call once per ORCA frame, before orca.run()
  step(f) {
    while (this.schedule.length && this.schedule[0].frame <= f) this.queue.push(...this.schedule.shift().keys);
    for (let i = 0; i < CHARS_PER_FRAME && this.queue.length; i++) {
      const k = this.queue.shift();
      if (k.rect) this.orca.writeBlock(k.x, k.y, Array.from({ length: k.rect.h }, () => '.'.repeat(k.rect.w)).join('\n'));
      else this.orca.write(k.x, k.y, k.g);
      this.cursor = { x: k.x, y: k.y };
    }
  }
}
