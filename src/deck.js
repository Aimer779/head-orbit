// Bottom-left console around the live ORCA grid. Character voice, same toggle as the original overlay.

import { scene } from './story.js';

const GRAINS = 8;

export function mountDeck(player) {
  const deck = document.getElementById('deck');
  const grid = document.getElementById('deck-grid');
  grid.appendChild(player.canvas);
  player.canvas.id = 'orca';
  player.canvas.style.width = '100%';
  player.canvas.style.height = 'auto';
  refreshDeck(player);
  return deck;
}

export function refreshDeck(player) {
  const beat = scene();
  const title = document.getElementById('deck-title');
  const line = document.getElementById('deck-line');
  const bowl = document.getElementById('deck-bowl');
  const hint = document.getElementById('deck-hint');
  if (!title) return;

  title.textContent = beat.title;
  if (!player.started) {
    line.textContent = '点一下开饭';
  } else if (!player.playing) {
    line.textContent = '测完告诉我就行';
  } else {
    line.textContent = beat.prompt;
  }

  const fill = player.playing ? beat.bowl : (player.started ? 0.12 : 0);
  const n = Math.round(fill * GRAINS);
  bowl.textContent = '飯'.repeat(n) + '・'.repeat(GRAINS - n);

  hint.textContent = player.started
    ? 'P 停   N 下一碗   O 收起'
    : '点网格或画面开饭';
}
