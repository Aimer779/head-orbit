import { SOUNDTRACK } from './audio.js';

const GLITCH = '#*+%:@';
const FILL = '█';
const EMPTY = '░';

const DIGITS = {
  5: [
    '██████',
    '█     ',
    '█     ',
    '█████ ',
    '     █',
    '█    █',
    ' ████ ',
  ],
  4: [
    '█    █',
    '█    █',
    '█    █',
    ' █████',
    '     █',
    '     █',
    '     █',
  ],
  3: [
    '█████ ',
    '     █',
    '     █',
    ' ████ ',
    '     █',
    '     █',
    '█████ ',
  ],
  2: [
    '█████ ',
    '     █',
    '     █',
    ' ████ ',
    '█     ',
    '█     ',
    '██████',
  ],
  1: [
    '  ██  ',
    ' ███  ',
    '  ██  ',
    '  ██  ',
    '  ██  ',
    '  ██  ',
    ' ████ ',
  ],
  GO: [
    ' ██████   ██████ ',
    '█        █      █',
    '█   ███  █      █',
    '█     █  █      █',
    '█     █  █      █',
    '█     █  █      █',
    ' █████    ██████ ',
  ],
};

function noiseChar(ch, tick, x, y, heat) {
  if (ch === ' ') return ' ';
  const n = ((tick * 17 + x * 13 + y * 29) % 97) / 97;
  if (n < heat) return GLITCH[(tick + x + y) % GLITCH.length];
  return ch;
}

function paint(key, tick, heat) {
  const rows = DIGITS[key] || DIGITS[1];
  return rows.map((row, y) => [...row].map((ch, x) => noiseChar(ch, tick, x, y, heat)).join('')).join('\n');
}

function digitAt(t) {
  const offset = SOUNDTRACK.offset;
  const remain = offset - t;
  if (remain <= 0.18) return 'GO';
  const span = Math.max(0.01, (offset - 0.18) / 5);
  return String(Math.max(1, 5 - Math.floor(t / span)));
}

export function inCountdown(player) {
  if (!player.playing) return false;
  const t = player.track?.currentTime || 0;
  return t < SOUNDTRACK.offset;
}

export function tickCountdown(player) {
  const pre = document.getElementById('ascii-count');
  const lyrics = document.getElementById('deck-lyrics');
  const title = document.getElementById('deck-title');
  if (!pre) return false;

  const counting = inCountdown(player);
  pre.hidden = !counting;
  if (lyrics) lyrics.hidden = counting;
  if (!counting) return false;

  const t = player.track.currentTime || 0;
  const offset = SOUNDTRACK.offset;
  const remain = Math.max(0, offset - t);
  const key = digitAt(t);
  const tick = Math.floor(performance.now() / 70);
  const frac = key === 'GO' ? 1 : 1 - (remain % 1);
  const heat = key === 'GO' ? 0.22 : 0.06 + frac * 0.18;
  const barN = 14;
  const filled = Math.round(Math.min(1, t / offset) * barN);

  const head = key === 'GO' ? 'world.execute(me);' : `T-${key}   PERSONA_LOAD`;
  const bar = `${FILL.repeat(filled)}${EMPTY.repeat(barN - filled)}`;
  const foot = key === 'GO' ? 'EXECUTE' : `${remain.toFixed(1)}s`;

  pre.textContent = `${head}\n\n${paint(key, tick, heat)}\n\n${bar}  ${foot}`;
  if (title) title.textContent = key === 'GO' ? 'EXECUTE' : `T-${key}`;
  return true;
}
