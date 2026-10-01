import { SOUNDTRACK } from './audio.js';
import { tickCountdown } from './countdown.js';

const SRC = 'assets/lyrics/world-execute-me.json';
const OFFICIAL_KICK = 0.46;

let pack = { cues: [], officialKick: OFFICIAL_KICK };
let lastIndex = -1;

export async function loadLyrics() {
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`lyrics ${res.status}`);
  pack = await res.json();
  lastIndex = -1;
  return pack;
}

export function officialTime(localTime) {
  const kick = pack.officialKick ?? OFFICIAL_KICK;
  return localTime - (SOUNDTRACK.offset - kick);
}

export function cueIndexAt(localTime) {
  const t = officialTime(localTime);
  const cues = pack.cues || [];
  if (!cues.length) return -1;
  let lo = 0;
  let hi = cues.length - 1;
  let hit = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].t0 <= t) {
      hit = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (hit < 0) return -1;
  // stay on a cue a little after t1 until the next one starts
  return hit;
}

function isKeyword(text) {
  const s = (text || '').replace(/[-.\s]/g, '');
  return s.length >= 2 && s === s.toUpperCase() && /[A-Z]/.test(s);
}

function fillLangs(el, cue) {
  if (!el) return;
  const zh = el.querySelector('.zh');
  const ja = el.querySelector('.ja');
  const en = el.querySelector('.en');
  if (zh) zh.textContent = cue?.zh || '';
  if (ja) ja.textContent = cue?.ja || '';
  if (en) en.textContent = cue?.en || '';
}

export function tickLyrics(player) {
  if (tickCountdown(player)) return;

  const prev = document.getElementById('lyric-prev');
  const now = document.getElementById('lyric-now');
  const next = document.getElementById('lyric-next');
  const title = document.getElementById('deck-title');
  if (!now) return;

  const cues = pack.cues || [];
  const t = player.started ? player.track.currentTime : 0;
  const i = player.started ? cueIndexAt(t) : -1;

  const cur = i >= 0 ? cues[i] : null;
  const before = i > 0 ? cues[i - 1] : null;
  const after = i >= 0 && i + 1 < cues.length ? cues[i + 1] : cues[0];

  fillLangs(prev, before);
  fillLangs(next, after && after !== cur ? after : null);

  if (!player.started) {
    fillLangs(now, { zh: '点一下开饭', ja: '', en: 'world.execute(me);' });
    now.classList.remove('keyword');
  } else if (!cur) {
    fillLangs(now, {
      zh: player.playing ? '' : '测完告诉我就行',
      ja: '',
      en: 'world.execute(me);',
    });
    now.classList.remove('keyword');
  } else {
    fillLangs(now, cur);
    now.classList.toggle('keyword', isKeyword(cur.en));
  }

  if (title && cur && isKeyword(cur.en)) title.textContent = cur.en;
  else if (title && player.started && cur) title.textContent = SOUNDTRACK.title;
  else if (title && !player.started) title.textContent = SOUNDTRACK.title;

  if (i !== lastIndex) lastIndex = i;
}
