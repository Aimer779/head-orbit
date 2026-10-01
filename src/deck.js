// Bottom-left console: timed lyrics for world.execute(me);. ORCA still draws off-screen for the ring.

import { tickLyrics } from './lyrics.js';
import { inCountdown } from './countdown.js';
import { SOUNDTRACK } from './audio.js';

const GRAINS = 8;

export function mountDeck(player) {
  const deck = document.getElementById('deck');
  const grid = document.getElementById('deck-grid');
  grid.appendChild(player.canvas);
  player.canvas.id = 'orca';
  player.canvas.setAttribute('hidden', '');
  player.canvas.style.display = 'none';
  refreshDeck(player);
  return deck;
}

export function refreshDeck(player) {
  const bowl = document.getElementById('deck-bowl');
  if (!bowl) return;

  fillBowl(player, bowl);

  tickLyrics(player);
}

function fillBowl(player, bowl) {
  const dur = player.track?.duration;
  const t = player.track?.currentTime || 0;
  let fill = 0;
  if (inCountdown(player)) fill = t / SOUNDTRACK.offset;
  else if (player.playing && dur > 0) fill = t / dur;
  else if (player.started) fill = 0.12;
  const n = Math.round(Math.min(1, Math.max(0, fill)) * GRAINS);
  bowl.textContent = '飯'.repeat(n) + '・'.repeat(GRAINS - n);
}

export function tickDeck(player) {
  const bowl = document.getElementById('deck-bowl');
  if (bowl && player.track) fillBowl(player, bowl);
  tickLyrics(player);
}
