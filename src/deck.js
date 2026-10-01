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
  const line = document.getElementById('deck-line');
  const bowl = document.getElementById('deck-bowl');
  const hint = document.getElementById('deck-hint');
  if (!line) return;

  if (!player.started) line.textContent = '点一下开饭';
  else if (!player.playing) line.textContent = '测完告诉我就行';
  else line.textContent = '';

  const dur = player.track?.duration;
  const t = player.track?.currentTime || 0;
  const fill = player.playing && dur > 0 ? t / dur : (player.started ? 0.12 : 0);
  const n = Math.round(Math.min(1, Math.max(0, fill)) * GRAINS);
  bowl.textContent = '飯'.repeat(n) + '・'.repeat(GRAINS - n);

  hint.textContent = player.started
    ? 'P 停   O 收起'
    : '点画面或台词开饭';

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
