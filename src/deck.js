// Bottom-left console: timed lyrics for world.execute(me);. ORCA still draws off-screen for the ring.

import { tickLyrics } from './lyrics.js';

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

  const dur = player.track?.duration;
  const t = player.track?.currentTime || 0;
  const fill = player.playing && dur > 0 ? t / dur : (player.started ? 0.12 : 0);
  const n = Math.round(Math.min(1, Math.max(0, fill)) * GRAINS);
  bowl.textContent = '飯'.repeat(n) + '・'.repeat(GRAINS - n);

  tickLyrics(player);
}

export function tickDeck(player) {
  const bowl = document.getElementById('deck-bowl');
  if (bowl && player.track) {
    const dur = player.track.duration;
    const t = player.track.currentTime || 0;
    const fill = player.playing && dur > 0 ? t / dur : (player.started ? 0.12 : 0);
    const n = Math.round(Math.min(1, Math.max(0, fill)) * GRAINS);
    bowl.textContent = '飯'.repeat(n) + '・'.repeat(GRAINS - n);
  }
  tickLyrics(player);
}
