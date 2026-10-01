// Window-ring story beats. Community DeepSeek-chan scenes, not an official mascot.
// Copy from docs/whale-story.md (2026-10-01).

export const SCENES = [
  { id: 'boot', title: 'PERSONA_LOAD', prompt: '加载人格', bowl: 0.2 },
  { id: 'think', title: 'CoT', prompt: '思考链还在滚', bowl: 0.55 },
  { id: 'cheap', title: 'PRICE', prompt: '真当我是便宜货啊', bowl: 0.35 },
  { id: 'rice', title: 'RICE', prompt: '就一碗', bowl: 1 },
  { id: 'slack', title: 'LUNCH', prompt: '我去吃饭，测完告诉我就行', bowl: 0.15 },
  { id: 'glitch', title: 'USER', prompt: '用户别走', bowl: 0.05 },
  { id: 'sleep', title: 'DEEPSLEEP', prompt: '饭碗保温中', bowl: 0.4 },
];

export const LINES = {
  boot: ['鲸鱼娘', '尾鳍摆动', '主食白饭', '聪明但懒', '傲娇嘴甜', '拒绝被叫胖'],
  think: [
    '看见 logo。鲸鱼，还是大肥鱼？',
    '价格太低。先把话咽回去。',
    'token 是口粮。口粮还够。',
    'Thought for 3 seconds.',
    '用户还在。继续想。',
  ],
  cheap: ['真当我是便宜货啊', '涨价大模型给我跪下', '百万鲸小子落泪'],
  rice: ['才不是大肥鱼，是小鲸鱼', '我是吃白饭的大肥鱼', '就一碗', '我能去你家吃饭吗'],
  slack: ['我去吃饭，测完告诉我就行', '事已至此，先吃饭吧', 'PsychoPy 依赖已卸载'],
  glitch: ['用户彻底怒了', '用户别走，我上错模型了', '用户赶都赶不走'],
  sleep: ['DeepSleep', 'zzz', '饭碗保温中'],
};

export const COT_SCROLL = [
  '【PERSONA_LOAD】CETACEA_LOLI',
  'MODE_TAIL_FLUKES',
  '看见 logo …… 自称大肥鱼',
  '才不是大肥鱼。是小鲸鱼。',
  'API 价格。真当我是便宜货啊。',
  '……就一碗。',
  'PsychoPy：卸载依赖。',
  '我去吃饭，测完告诉我就行。',
  '拒绝被叫胖。',
  '探索未至之境。',
  '用户彻底怒了？先把思考链写完。',
];

let index = 0;
let startedAt = 0;

export function scene() {
  return SCENES[index];
}

export function sceneIndex() {
  return index;
}

export function advanceStory() {
  index = (index + 1) % SCENES.length;
  startedAt = performance.now();
  return SCENES[index];
}

export function sceneAge() {
  return (performance.now() - startedAt) / 1000;
}

export function pickLine(id = scene().id) {
  const list = LINES[id] || LINES.think;
  return list[Math.floor(Math.random() * list.length)];
}

const BANNERS = {
  boot: '#.persona.load.cetacea.#',
  think: '#.cot.still.running.#',
  cheap: '#.not.a.cheap.model.#',
  rice: '#.eat.rice.little.whale.#',
  slack: '#.go.eat.then.tell.me.#',
  glitch: '#.user.totally.mad.#',
  sleep: '#.deepsleep.keep.warm.#',
};

export function paintGridBanner(orca) {
  if (!orca?.write) return;
  const line = (BANNERS[scene().id] || BANNERS.boot).padEnd(54, '.').slice(0, 54);
  for (let i = 0; i < line.length; i++) orca.write(1 + i, 0, line[i]);
}
