// Drop-in content for the remix. Engine code never hardcodes a portrait or panel set.

export const defaults = {
  title: 'eat rice',
  credits: {
    illustration: '上善无形 / ZipZipPipe',
    mashup: 'you',
  },
  character: {
    src: ['assets/character.png', 'assets/character.jpg', 'assets/character.webp'],
    headPx: [512, 380],
    sizePx: [1024, 1024],
    worldWidth: 3.3,
  },
  panels: [],
};

export let content = structuredClone(defaults);

export async function loadContent() {
  try {
    const res = await fetch('assets/content.json');
    if (!res.ok) return content;
    const data = await res.json();
    content = {
      ...defaults,
      ...data,
      credits: { ...defaults.credits, ...(data.credits || {}) },
      character: { ...defaults.character, ...(data.character || {}) },
      panels: Array.isArray(data.panels) ? data.panels : [],
    };
    if (typeof content.character.src === 'string') {
      content.character.src = [content.character.src];
    }
  } catch (err) {
    console.warn('[content]', err);
  }
  return content;
}

export function applyCredits() {
  const title = document.getElementById('page-title');
  if (title) title.textContent = content.credits.illustration;
  const mashup = document.getElementById('page-mashup');
  if (mashup) mashup.textContent = content.credits.mashup;
  document.title = content.title;
}
