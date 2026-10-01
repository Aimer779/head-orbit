// Building blocks shared by every song patch. One ORCA frame = one 16th note, 16 frames = one bar.
//
// Channel layout is the same in every song so audio.js can map channels to roles:
//   0 bass, 1-3 chord voices, 4 lead, 6 second lead, c kick, d snare, e hats, f clap
//
// note letters: uppercase natural, lowercase sharp (f = F#, c = C#); H-Z wrap one octave up (K = D+1)

export const BAR = 16;

// Sequencer block, 3 rows:
//   .{rate}C{mod}            clock: floor(f / rate) % mod
//   D{rate}.{mod}T{values}   D bangs every `rate` frames, T picks values[clock]
//   .;{ch}{oct}.{vel}{len}   T writes the note under itself, the bang fires `;` -> Pilot
export function seq(rate, values, msg) {
  const mod = (values.length).toString(36);
  return [`.${rate}C${mod}`, `D${rate}.${mod}T${values}`, `.;${msg.slice(0, 2)}.${msg.slice(2)}`];
}

// Chord voice, one tone per bar from the bar clock (f / 16 % tones).
//   C{sub}gC{n}      sub-beat clock (f % sub) next to the bar clock
//   .F{on}.{n}T...   F bangs when the sub-beat clock reads `on`
//   ..;{ch}{oct}.{vel}{len}
// stab: offbeat 8ths ("and" of every beat). chug: every 8th, palm-muted power chord style.
function chord(sub, on, tones, msg) {
  const n = (tones.length).toString(36);
  return [`C${sub}gC${n}`, `.F${on}.${n}T${tones}`, `..;${msg.slice(0, 2)}.${msg.slice(2)}`];
}
export const stab = (tones, msg) => chord(4, 2, tones, msg);
export const chug = (tones, msg) => chord(2, 0, tones, msg);

// grid edits on a song's blocks, for the timeline
export function editor(blocks) {
  function at(name, row, find, offset = 0) {
    const b = blocks[name];
    const r = row < 0 ? b.rows.length + row : row;
    return { x: b.x + b.rows[r].indexOf(find) + offset, y: b.y + r };
  }
  const set = (cell, g) => ({ edit: { ...cell, g } });
  return {
    set,
    mute: (...names) => names.map((n) => set(at(n, -1, ';'), '.')),
    unmute: (...names) => names.map((n) => set(at(n, -1, ';'), ';')),
    octave: (name, g) => set(at(name, -1, ';', 2), g),            // `;` ch OCT note
    step: (name, i, g) => set(at(name, 1, 'T', 1 + i), g),         // T value i
    // effect on the `fx` row, e.g. effect('rev', '3', '7') -> rev37
    effect: (code, wet, value) => [set(at('fx', 1, code, 3), wet), set(at('fx', 1, code, 4), value)],
  };
}
