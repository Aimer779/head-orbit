import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SavePass } from 'three/addons/postprocessing/SavePass.js';
import GUI from 'lil-gui';
import { randomPanel, loadPanelImages, liveCotSource, tickStoryVisuals, makeEmojiPanel } from './panels.js';
import { advanceStory, scene as storyScene, paintGridBanner } from './story.js';
import { loadPixelWhale, tickPixelWhale, livePixelSource, setPixelMoodFromScene } from './pixel-whale.js';
import { loadDiveWhale, tickDiveWhale, liveDiveSource, requestDiveFromScene } from './dive-whale.js';
import { CRTShader } from './post.js';
import { OrcaPlayer, SOUNDTRACK } from './audio.js';
import { GazeCamera } from './gaze.js';
import { loadContent, applyCredits, content } from './content.js';
import { drawPlaceholderCharacter } from './placeholder-character.js';
import { mountDeck, refreshDeck } from './deck.js';

// ---------------------------------------------------------------------------
// params (tweak live via the GUI, open with ?gui and press H to hide it)

const params = {
  rotationSpeed: 0.75,
  wobble: 0.08,
  bands: 6,
  floaters: 12,
  panelBrightness: 1.15,
  bloomStrength: 0.5,
  bloomRadius: 0.15,
  bloomThreshold: 0.88,
  trails: 0.6,
  distortion: 0.32,
  aberration: 0.004,
  grain: 0.09,
  scanlines: 0.06,
  glitchRate: 0.6,      // glitch events per second
  keyBlack: true,       // treat near-black pixels of character image as transparent
  reactivity: 1,        // how hard the scene follows the music (0 = ignore it)
  orcaPanels: 2,        // panels showing the live ORCA grid
  cotPanels: 1,         // live CoT window on the ring
  pixelPanels: 1,       // lhh010 pixel whale
  divePanels: 1,        // Harness dive / classic webp
  orcaOverlay: true,    // the grid itself, bottom-left (O)
  beatShuffle: true,    // re-roll the look on the beat (B)
  shuffleEvery: 4,      // beats between re-rolls
  shuffleAmount: 0.6,   // 0 = stay on the values above, 1 = anywhere in SHUFFLE ranges
  shuffleGlide: 0.12,   // seconds to ease into each new look, 0 = hard cut
  bgStatic: 0.25,       // TV snow behind the scene, drawn after the CRT warp so it fills the screen flat
  gaze: 1,              // how far the camera follows the pointer (G toggles)
};

// what beat shuffle may touch, and inside which range (kept tighter than the GUI limits)
const SHUFFLE = {
  rotationSpeed: [0.2, 2.2],
  wobble: [0, 0.3],
  panelBrightness: [0.8, 1.5],
  bloomStrength: [0.2, 1.0],
  bloomRadius: [0.05, 0.8],
  bloomThreshold: [0.75, 1.0],
  trails: [0.3, 0.92],
  distortion: [-0.2, 0.8],
  aberration: [0.001, 0.012],
  grain: [0.03, 0.22],
  scanlines: [0, 0.2],
  glitchRate: [0.2, 2],
};
// panel counts: re-rolled with the look but applied as add/remove, so each beat moves at most
// `step` away from the current count (keeps the per-beat canvas work small)
const SHUFFLE_COUNTS = {
  bands: { range: [3, 9], step: 2 },
  floaters: { range: [4, 36], step: 12 },
};

// ---------------------------------------------------------------------------
// music: ORCA patch -> Pilot synth (src/audio.js). Click / P to play, N skips to the next song,
// O toggles the grid.

const player = new OrcaPlayer();
mountDeck(player);

// credits follow the song that's playing
function showSoundtrack() {
  document.getElementById('song-title').textContent = SOUNDTRACK.title;
  const artist = document.getElementById('song-artist');
  artist.textContent = SOUNDTRACK.artist;
  artist.removeAttribute('href');
}
showSoundtrack();
player.on('song', () => {
  paintGridBanner(player.orca);
  refreshDeck(player);
});

// decaying envelopes per part, kicked by note events, read in tick()
const env = { kick: 0, snare: 0, hat: 0, bass: 0, stab: 0, lead: 0 };
const DECAY = { kick: 7, snare: 6, hat: 14, bass: 5, stab: 9, lead: 5 };
let leadPitch = 0;

// ---------------------------------------------------------------------------
// renderer / scene / camera

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);   // empty pixels keep alpha 0: that alpha is the background mask
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 50);

// pointer-follow camera (src/gaze.js): drifts toward the cursor, rolls on fast swipes, slow wobble
const gaze = new GazeCamera(camera);
gaze.lookAt.set(0, -0.05, 0);
gaze.moveXY.set(0.55, 0.35);
gaze.deltaRotate = 4;
gaze.wobbleStrength = 0.2;
gaze.wobbleSpeed = 1.4;
gaze.setPosition(0, 0.05, 4.6);
scene.add(gaze.group);

// ---------------------------------------------------------------------------
// character: a camera-facing plane. Head center of the source image maps to world origin.

const CHARACTER = {
  headPx: [512, 380],
  sizePx: [1024, 1024],
  tearHeadPx: [626, 400],
  tearSizePx: [1230, 1278],
  worldWidth: 3.3,
};

const TEAR_SCENES = new Set(['cheap', 'glitch', 'sleep']);
let characterReveal = 0;

function applyCharacterSpec() {
  const spec = content.character;
  CHARACTER.headPx = spec.headPx;
  CHARACTER.sizePx = spec.sizePx;
  CHARACTER.tearHeadPx = spec.tearHeadPx || spec.headPx;
  CHARACTER.tearSizePx = spec.tearSizePx || spec.sizePx;
  CHARACTER.worldWidth = spec.worldWidth;
}

function makeCharacterMat(glitchable) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: null },
      uKeyBlack: { value: params.keyBlack ? 1 : 0 },
      uBrightness: { value: 0.82 },
      uReveal: { value: 0 },
      uGlitch: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: [
      'uniform sampler2D map;',
      'uniform float uKeyBlack, uBrightness, uReveal, uGlitch, uTime;',
      'varying vec2 vUv;',
      'float hash(float n) { return fract(sin(n) * 43758.5453); }',
      'void main() {',
      '  vec4 tex = texture2D(map, vUv);',
      '  float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));',
      '  float a = tex.a;',
      '  if (uKeyBlack > 0.5) a *= smoothstep(0.03, 0.09, lum);',
      glitchable
        ? '  float row = floor(vUv.y * 22.0); float hole = step(0.58, hash(row + floor(uTime * 28.0) + 2.7)) * uGlitch; a *= (1.0 - uReveal) * (1.0 - hole);'
        : '',
      '  if (a < 0.5) discard;',
      '  float fade = smoothstep(0.0, 0.14, vUv.y);',
      '  gl_FragColor = vec4(vec3(lum) * uBrightness, fade);',
      '#include <colorspace_fragment>',
      '}',
    ].join('\n'),
    transparent: true,
    depthWrite: false,
  });
}

const tearMat = makeCharacterMat(false);
const characterMat = makeCharacterMat(true);
const characterTear = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), tearMat);
const character = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), characterMat);
characterTear.position.z = -0.002;
characterTear.renderOrder = 0;
character.renderOrder = 1;
scene.add(characterTear);
scene.add(character);

function layoutCharacterMesh(mesh, headPx, sizePx, imgW, imgH) {
  const s = CHARACTER.worldWidth / imgW;
  const hx = (headPx[0] / sizePx[0]) * imgW;
  const hy = (headPx[1] / sizePx[1]) * imgH;
  mesh.scale.set(imgW * s, imgH * s, 1);
  mesh.position.x = -(hx - imgW / 2) * s;
  mesh.position.y = (hy - imgH / 2) * s;
}

function hasAlpha(img) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, 64, 64);
  const d = g.getImageData(0, 0, 64, 64).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  return false;
}

function prepCharacterTex(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function setCoverMap(tex, image, label) {
  characterMat.uniforms.map.value = prepCharacterTex(tex);
  params.keyBlack = !hasAlpha(image);
  syncParams();
  gui.controllersRecursive().forEach((c) => c.updateDisplay());
  layoutCharacterMesh(character, CHARACTER.headPx, CHARACTER.sizePx, image.width, image.height);
  console.log('[character]', label);
}

function setTearMap(tex, image, label) {
  tearMat.uniforms.map.value = prepCharacterTex(tex);
  layoutCharacterMesh(characterTear, CHARACTER.tearHeadPx, CHARACTER.tearSizePx, image.width, image.height);
  characterTear.position.z = -0.002;
  console.log('[character tear]', label);
}

function loadPlaceholderCharacter() {
  const canvas = drawPlaceholderCharacter();
  setCoverMap(new THREE.CanvasTexture(canvas), canvas, 'placeholder');
}

function loadUrlChain(urls, onOk, onFail) {
  const loader = new THREE.TextureLoader();
  const queue = [...urls];
  const tryLoad = () => {
    const url = queue.shift();
    if (!url) { onFail(); return; }
    loader.load(url, (tex) => onOk(tex, tex.image, url), undefined, tryLoad);
  };
  tryLoad();
}

function loadCharacter() {
  const cover = content.character.src || [];
  const tear = content.character.tearSrc || [];
  loadUrlChain(cover, setCoverMap, loadPlaceholderCharacter);
  loadUrlChain(tear, setTearMap, () => console.warn('[character tear] missing'));
}

// ---------------------------------------------------------------------------
// halo: two broken white arcs above the head

const halo = new THREE.Group();
const haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.2) });
for (const start of [0.12, Math.PI + 0.12]) {
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.022, 12, 96, Math.PI - 0.24), haloMat);
  arc.rotation.z = start;
  halo.add(arc);
}
halo.rotation.x = -Math.PI / 2 - 0.26;   // tipped toward camera so it reads as an ellipse
halo.position.set(0, 0.92, 0);
scene.add(halo);

// ---------------------------------------------------------------------------
// orbiting UI panels: curved slices of a cylinder around the head

const panelVert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const panelFrag = /* glsl */`
  uniform sampler2D map;
  uniform float uBrightness, uFlicker, uTime, uSeed, uTransparent, uGlitch;
  uniform vec2 uFit;
  varying vec2 vUv;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    // uFit > 1 shrinks the texture into the panel (letterboxed), so it keeps its own aspect
    vec2 uv = (vUv - 0.5) * uFit + 0.5;
    if (uTransparent > 0.5 && (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)) discard;
    // per-panel row jitter while glitching
    float row = floor(uv.y * 14.0);
    uv.x += (hash(row + floor(uTime * 20.0) + uSeed) - 0.5) * 0.15 * uGlitch;
    vec4 tex = texture2D(map, uv);
    if (uTransparent > 0.5 && tex.a < 0.4) discard;
    vec3 col = tex.rgb * uBrightness * uFlicker;
    // back faces read as dim, desaturated
    if (!gl_FrontFacing) col = vec3(dot(col, vec3(0.33))) * 0.35;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const panelGroup = new THREE.Group();
scene.add(panelGroup);
const panels = [];

function makeTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// transparent textures (emoji) are fitted inside the panel at their own aspect; opaque ones fill it
function fitFor(p, panelAspect) {
  const fit = new THREE.Vector2(1, 1);
  if (!p.transparent) return fit;
  const texAspect = p.canvas.width / p.canvas.height;
  if (panelAspect > texAspect) fit.x = panelAspect / texAspect;
  else fit.y = texAspect / panelAspect;
  return fit;
}

// rectangle outline lying on a cylinder surface (top arc, side, bottom arc, side)
const outlineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.2) });
function curvedOutline(r, h, start, len, segs = 24) {
  const pts = [];
  const at = (t, y) => new THREE.Vector3(Math.sin(start + t * len) * r, y, Math.cos(start + t * len) * r);
  for (let i = 0; i <= segs; i++) pts.push(at(i / segs, h / 2));
  for (let i = segs; i >= 0; i--) pts.push(at(i / segs, -h / 2));
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), outlineMat);
}

function createPanel({ y, thetaStart, radius, source }) {
  const p = source ?? randomPanel();
  const aspect = p.canvas.width / p.canvas.height;
  const height = p.live ? 0.36 : THREE.MathUtils.randFloat(0.14, 0.32) * (p.transparent ? 1.15 : 1);
  const thetaLength = Math.min((height * aspect) / radius, 1.1);
  const panelAspect = (thetaLength * radius) / height;

  const geo = new THREE.CylinderGeometry(radius, radius, height, 24, 1, true, thetaStart, thetaLength);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: makeTexture(p.canvas) },
      uBrightness: { value: params.panelBrightness * THREE.MathUtils.randFloat(0.85, 1.15) },
      uFlicker: { value: 1 },
      uTime: { value: 0 },
      uSeed: { value: Math.random() * 100 },
      uTransparent: { value: p.transparent ? 1 : 0 },
      uGlitch: { value: 0 },
      uFit: { value: fitFor(p, panelAspect) },
    },
    vertexShader: panelVert,
    fragmentShader: panelFrag,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;
  panelGroup.add(mesh);

  // some panels get a glowing white edge frame slightly outside them
  if (!p.transparent && Math.random() < 0.3) {
    mesh.add(curvedOutline(radius + 0.02, height * 1.12, thetaStart - 0.015, thetaLength + 0.03));
  }

  if (p.live) mesh.add(curvedOutline(radius + 0.02, height * 1.08, thetaStart - 0.015, thetaLength + 0.03));

  return { mesh, mat, thetaLength, panelAspect, live: !!p.live, kind: p.kind || '', baseY: y, bobSpeed: Math.random() * 0.8 + 0.2, bobAmp: Math.random() * 0.02, glitchUntil: 0 };
}

// Panels are kept as bands (rings stacked around the head), loose floaters and live ORCA grids, so a
// change of `bands` / `floaters` only adds or removes the difference instead of rebuilding ~100
// canvases. Existing bands glide to their new heights (targetY, eased in tick()).

const bandRings = [];   // arrays of panels, bottom to top
const RADII = Array.from({ length: 320 }, (_, i) => 0.9 + (i / 320) * 0.28);
let freeRadii = [];     // shuffled; overlapping panels never share a radius (no z-fighting)

function takeRadius() {
  return freeRadii.length ? freeRadii.splice(Math.floor(Math.random() * freeRadii.length), 1)[0] : THREE.MathUtils.randFloat(0.9, 1.18);
}

function disposePanel(p) {
  p.mesh.traverse((o) => { o.geometry?.dispose(); if (o.material !== outlineMat) o.material?.dispose?.(); });
  p.mat.uniforms.map.value.dispose();
  panelGroup.remove(p.mesh);
  panels.splice(panels.indexOf(p), 1);
  if (p.slot !== undefined) freeRadii.push(p.slot);
}

function addPanel(opts, slot) {
  const panel = createPanel(opts);
  panel.slot = slot;
  panel.targetY = panel.baseY;
  panels.push(panel);
  return panel;
}

const bandY = (b, n) => THREE.MathUtils.lerp(-0.58, 0.42, b / Math.max(n - 1, 1));

function addBand() {
  const ring = [];
  const start = Math.random() * Math.PI * 2;
  let theta = start;
  while (theta < start + Math.PI * 2 - 0.2) {
    const slot = takeRadius();
    const panel = addPanel({ y: 0, thetaStart: theta, radius: slot }, slot);
    panel.offsetY = THREE.MathUtils.randFloatSpread(0.12);
    ring.push(panel);
    theta += panel.thetaLength + THREE.MathUtils.randFloat(-0.12, 0.1);
  }
  // inserted at a random place in the stack; layoutBands() spreads the rest around it
  bandRings.splice(Math.floor(Math.random() * (bandRings.length + 1)), 0, ring);
  return ring;
}

function layoutBands(snap = false) {
  bandRings.forEach((ring, b) => {
    for (const p of ring) {
      p.targetY = bandY(b, bandRings.length) + p.offsetY;
      if (snap) p.baseY = p.mesh.position.y = p.targetY;
    }
  });
}

const floaters = [];
function addFloater() {
  const slot = takeRadius();
  floaters.push(addPanel({ y: THREE.MathUtils.randFloat(-0.75, 0.6), thetaStart: Math.random() * Math.PI * 2, radius: slot + 0.05 }, slot));
}

const orcaGrids = [];
function addOrcaGrid(i, n) {
  const source = { canvas: player.canvas, transparent: false, live: true };
  orcaGrids.push(addPanel({ y: THREE.MathUtils.randFloat(-0.5, 0.2), thetaStart: (i / n) * Math.PI * 2, radius: 1.24, source }));
}

const cotGrids = [];
function addCotGrid(i, n) {
  cotGrids.push(addPanel({
    y: THREE.MathUtils.randFloat(-0.2, 0.35),
    thetaStart: Math.PI + (i / Math.max(n, 1)) * Math.PI * 0.8,
    radius: 1.22,
    source: liveCotSource(),
  }));
}

const pixelGrids = [];
function addPixelGrid(i, n) {
  pixelGrids.push(addPanel({
    y: THREE.MathUtils.randFloat(0.05, 0.4),
    thetaStart: Math.PI * 0.25 + (i / Math.max(n, 1)) * 0.6,
    radius: 1.18,
    source: livePixelSource(),
  }));
}

const diveGrids = [];
function addDiveGrid(i, n) {
  diveGrids.push(addPanel({
    y: THREE.MathUtils.randFloat(-0.45, -0.05),
    thetaStart: -Math.PI * 0.4 + (i / Math.max(n, 1)) * 0.5,
    radius: 1.2,
    source: liveDiveSource(),
  }));
}

// bring the scene in line with params.bands / floaters / orcaPanels, touching only what changed
function syncLayout(snap = false) {
  const bandsBefore = bandRings.length;
  while (bandRings.length > params.bands) bandRings.splice(Math.floor(Math.random() * bandRings.length), 1)[0].forEach(disposePanel);
  const added = [];
  while (bandRings.length < params.bands) added.push(addBand());
  layoutBands(snap);
  // rings added mid-song pop in a little off their slot and ease into it
  if (!snap && bandsBefore) for (const ring of added) for (const p of ring) p.baseY = p.mesh.position.y = p.targetY + THREE.MathUtils.randFloatSpread(0.3);

  while (floaters.length > params.floaters) disposePanel(floaters.splice(Math.floor(Math.random() * floaters.length), 1)[0]);
  while (floaters.length < params.floaters) addFloater();

  if (orcaGrids.length !== params.orcaPanels) {
    orcaGrids.splice(0).forEach(disposePanel);
    for (let i = 0; i < params.orcaPanels; i++) addOrcaGrid(i, params.orcaPanels);
  }

  if (cotGrids.length !== params.cotPanels) {
    cotGrids.splice(0).forEach(disposePanel);
    for (let i = 0; i < params.cotPanels; i++) addCotGrid(i, params.cotPanels);
  }

  if (pixelGrids.length !== params.pixelPanels) {
    pixelGrids.splice(0).forEach(disposePanel);
    for (let i = 0; i < params.pixelPanels; i++) addPixelGrid(i, params.pixelPanels);
  }

  if (diveGrids.length !== params.divePanels) {
    diveGrids.splice(0).forEach(disposePanel);
    for (let i = 0; i < params.divePanels; i++) addDiveGrid(i, params.divePanels);
  }
}

const emojiStickers = [];
function addEmojiSticker() {
  const slot = takeRadius();
  emojiStickers.push(addPanel({
    y: THREE.MathUtils.randFloat(-0.35, 0.3),
    thetaStart: Math.random() * Math.PI * 2,
    radius: slot + 0.04,
    source: makeEmojiPanel(),
  }, slot));
}

function buildPanels() {
  [...panels].forEach(disposePanel);
  bandRings.length = floaters.length = orcaGrids.length = cotGrids.length = pixelGrids.length = diveGrids.length = emojiStickers.length = 0;
  freeRadii = [...RADII];
  syncLayout(true);
  addEmojiSticker();
  addEmojiSticker();
}

function swapTexture(panel) {
  if (panel.live || panel.kind === 'emoji') return;
  const p = randomPanel();
  const old = panel.mat.uniforms.map.value;
  panel.mat.uniforms.map.value = makeTexture(p.canvas);
  panel.mat.uniforms.uTransparent.value = p.transparent ? 1 : 0;
  panel.mat.uniforms.uFit.value = fitFor(p, panel.panelAspect);
  old.dispose();
}

// ---------------------------------------------------------------------------
// postprocessing: render -> save alpha mask -> trails -> bloom -> output (sRGB) -> CRT/static.
// The CRT pass warps the scene but draws the background snow flat, wherever the mask is empty.

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const maskPass = new SavePass();
composer.addPass(maskPass);
const afterimage = new AfterimagePass(params.trails);
composer.addPass(afterimage);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), params.bloomStrength, params.bloomRadius, params.bloomThreshold);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const crt = new ShaderPass(CRTShader);
crt.uniforms.tMask.value = maskPass.renderTarget.texture;
composer.addPass(crt);

function syncParams() {
  bloom.strength = params.bloomStrength;
  bloom.radius = params.bloomRadius;
  bloom.threshold = params.bloomThreshold;
  afterimage.uniforms.damp.value = params.trails;
  crt.uniforms.uDistortion.value = params.distortion;
  crt.uniforms.uAberration.value = params.aberration;
  crt.uniforms.uGrain.value = params.grain;
  crt.uniforms.uScanlines.value = params.scanlines;
  characterMat.uniforms.uKeyBlack.value = params.keyBlack ? 1 : 0;
  tearMat.uniforms.uKeyBlack.value = params.keyBlack ? 1 : 0;
  for (const p of panels) p.mat.uniforms.uBrightness.value = params.panelBrightness * (0.85 + (p.mat.uniforms.uSeed.value % 0.3));
}

// ---------------------------------------------------------------------------
// GUI

// only shown with ?gui in the URL; still built either way since the rest of the code talks to it
const showGui = new URLSearchParams(location.search).has('gui');
const gui = new GUI({ title: 'controls (H)' });
gui.close();
gui.show(showGui);
const fMotion = gui.addFolder('motion');
fMotion.add(params, 'rotationSpeed', 0, 3, 0.01);
fMotion.add(params, 'wobble', 0, 0.4, 0.01);
fMotion.add(params, 'bands', 1, 12, 1).onFinishChange(() => syncLayout());
fMotion.add(params, 'floaters', 0, 60, 1).onFinishChange(() => syncLayout());
fMotion.add(params, 'panelBrightness', 0.5, 3, 0.01).onChange(syncParams);
const fBloom = gui.addFolder('bloom');
fBloom.add(params, 'bloomStrength', 0, 4, 0.01).onChange(syncParams);
fBloom.add(params, 'bloomRadius', 0, 1.5, 0.01).onChange(syncParams);
fBloom.add(params, 'bloomThreshold', 0, 1.5, 0.01).onChange(syncParams);
fBloom.add(params, 'trails', 0, 0.98, 0.01).onChange(syncParams);
const fFx = gui.addFolder('screen');
fFx.add(params, 'distortion', -0.5, 1.2, 0.01).onChange(syncParams);
fFx.add(params, 'aberration', 0, 0.03, 0.0005).onChange(syncParams);
fFx.add(params, 'grain', 0, 0.4, 0.005).onChange(syncParams);
fFx.add(params, 'scanlines', 0, 0.4, 0.005).onChange(syncParams);
fFx.add(params, 'glitchRate', 0, 4, 0.05);
fFx.add(params, 'bgStatic', 0, 1, 0.01).name('bg static');
const fCam = gui.addFolder('camera (G)');
fCam.add(params, 'gaze', 0, 2, 0.01).name('gaze strength').onChange((v) => { gaze.strength = v; });
fCam.add(gaze.moveXY, 'x', 0, 2, 0.01).name('move x');
fCam.add(gaze.moveXY, 'y', 0, 2, 0.01).name('move y');
fCam.add(gaze, 'lerpSpeed', 0.005, 0.3, 0.005).name('follow speed');
fCam.add(gaze, 'deltaRotate', 0, 20, 0.1).name('swipe roll (deg)');
fCam.add(gaze, 'wobbleStrength', 0, 1, 0.01).name('wobble');
fCam.add(gaze, 'wobbleSpeed', 0, 5, 0.01).name('wobble speed');
const fAudio = gui.addFolder('music');
fAudio.add({ 'play / pause (P)': () => toggleDeck() }, 'play / pause (P)');
fAudio.add({ 'next song (N)': () => { player.next(); refreshDeck(player); } }, 'next song (N)');
fAudio.add(params, 'reactivity', 0, 2.5, 0.01);
fAudio.add(params, 'orcaPanels', 0, 6, 1).name('orca panels').onFinishChange(() => syncLayout());
fAudio.add(params, 'cotPanels', 0, 4, 1).name('cot panels').onFinishChange(() => syncLayout());
fAudio.add(params, 'pixelPanels', 0, 4, 1).name('pixel whale').onFinishChange(() => syncLayout());
fAudio.add(params, 'divePanels', 0, 4, 1).name('dive whale').onFinishChange(() => syncLayout());
fAudio.add(params, 'orcaOverlay').name('orca grid (O)').onChange(syncOverlay).listen();
const fShuffle = fAudio.addFolder('beat shuffle');
fShuffle.add(params, 'beatShuffle').name('on (B)').listen();
fShuffle.add(params, 'shuffleEvery', [1, 2, 4, 8, 16]).name('every n beats');
fShuffle.add(params, 'shuffleAmount', 0, 1, 0.01).name('amount');
fShuffle.add(params, 'shuffleGlide', 0, 1, 0.01).name('glide (s)');
gui.add(params, 'keyBlack').name('key black bg').onChange(syncParams);
gui.add({ reshuffle: buildPanels }, 'reshuffle');

function syncOverlay() {
  document.getElementById('deck').classList.toggle('hidden', !params.orcaOverlay);
}

addEventListener('keydown', (e) => {
  if (showGui && (e.key === 'h' || e.key === 'H')) gui.show(gui._hidden);
  if (e.key === ' ') buildPanels();
  if (e.key === 'p' || e.key === 'P') toggleDeck();
  if (e.key === 'n' || e.key === 'N') { player.next(); refreshDeck(player); }
  if (e.key === 'o' || e.key === 'O') { params.orcaOverlay = !params.orcaOverlay; syncOverlay(); }
  if (e.key === 'b' || e.key === 'B') params.beatShuffle = !params.beatShuffle;
  if (e.key === 'g' || e.key === 'G') gaze.active ? gaze.still(600) : gaze.orbit(1000);
});
// first click anywhere outside the GUI starts the set (browsers need a gesture for audio)
function toggleDeck() {
  const run = player.toggle();
  if (run && typeof run.then === 'function') run.then(() => refreshDeck(player));
  else refreshDeck(player);
}

addEventListener('pointerdown', (e) => {
  if (e.target.closest?.('.lil-gui')) return;
  if (!player.started || e.target.closest?.('#deck')) toggleDeck();
});

// ---------------------------------------------------------------------------
// glitch events: static bursts + texture swaps + panel row tearing

let staticUntil = 0;
let glitchUntil = 0;

function triggerGlitch(now, staticChance = 0.35) {
  const dur = THREE.MathUtils.randFloat(0.06, 0.25);
  glitchUntil = now + dur;
  if (Math.random() < staticChance) staticUntil = now + dur * 0.6;
  const n = 1 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const p = panels[Math.floor(Math.random() * panels.length)];
    p.glitchUntil = now + dur * 2;
    if (Math.random() < 0.5) swapTexture(p);
  }
}

// ---------------------------------------------------------------------------
// music -> visuals

player.on('note', (n) => {
  if (!n.role) return;
  env[n.role] = Math.max(env[n.role], n.velocity);
  if (n.role === 'lead') leadPitch = n.midi;
  // the snare is the glitch: tear rows, now and then a burst of static
  if (n.role === 'snare' && params.reactivity > 0) triggerGlitch(clock.elapsedTime, 0.2);
});
player.on('frame', ({ f, step }) => {
  for (const p of panels) if (p.live) p.mat.uniforms.map.value.needsUpdate = true;
  if (step % 4 === 0 && (f / 4) % params.shuffleEvery === 0) shuffleLook();
  // two bars per story beat (~4s at 121bpm): the ring walks boot → think → rice → sleep
  if (step === 0 && f % 32 === 0) {
    const next = advanceStory();
    setPixelMoodFromScene(next.id);
    requestDiveFromScene(next.id);
    paintGridBanner(player.orca);
    refreshDeck(player);
  }
  // chord change on every downbeat: a few panels flip to new content
  if (step === 0 && params.reactivity > 0) {
    for (let i = 0; i < 3; i++) swapTexture(panels[Math.floor(Math.random() * panels.length)]);
  }
});

// ---------------------------------------------------------------------------
// beat shuffle: every N beats each SHUFFLE param gets a new target, tick() eases toward it.
// `home` holds the hand-set values; moving a slider sets a new home for that param.

const home = Object.fromEntries([...Object.keys(SHUFFLE), ...Object.keys(SHUFFLE_COUNTS)].map((k) => [k, params[k]]));
const target = { ...home };

function shuffleLook() {
  if (!params.beatShuffle) return;
  for (const [k, [lo, hi]] of Object.entries(SHUFFLE)) {
    target[k] = THREE.MathUtils.lerp(home[k], THREE.MathUtils.randFloat(lo, hi), params.shuffleAmount);
  }
  for (const [k, { range: [lo, hi], step }] of Object.entries(SHUFFLE_COUNTS)) {
    const want = Math.round(THREE.MathUtils.lerp(home[k], THREE.MathUtils.randInt(lo, hi), params.shuffleAmount));
    params[k] = THREE.MathUtils.clamp(want, params[k] - step, params[k] + step);
  }
  syncLayout();
  syncParams();   // new panels pick up the current brightness
}

function easeLook(dt) {
  const active = params.beatShuffle && player.playing;
  const t = params.shuffleGlide > 0 ? 1 - Math.exp(-dt / params.shuffleGlide) : 1;
  let moved = false;
  for (const k in SHUFFLE) {
    const goal = active ? target[k] : home[k];
    if (Math.abs(goal - params[k]) < 1e-5) continue;
    params[k] += (goal - params[k]) * t;
    moved = true;
  }
  if (moved) syncParams();
  // counts snap back home once shuffle is off or the music stops
  if (!active && Object.keys(SHUFFLE_COUNTS).some((k) => params[k] !== home[k])) {
    for (const k in SHUFFLE_COUNTS) params[k] = home[k];
    syncLayout();
  }
}

gui.onChange(({ property, value }) => {
  if (property in home) home[property] = target[property] = value;
});
for (const c of gui.controllersRecursive()) {
  if (c.property in SHUFFLE) c.listen().decimals(3);
  if (c.property in SHUFFLE_COUNTS) c.listen();
}

// ---------------------------------------------------------------------------
// loop

const clock = new THREE.Clock();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = clock.elapsedTime;

  // music state: note envelopes decay, spectrum bands from the Pilot master bus
  const R = player.playing ? params.reactivity : 0;
  for (const k in env) env[k] *= Math.exp(-DECAY[k] * dt);
  const lv = player.update();
  player.syncClock();
  easeLook(dt);

  panelGroup.rotation.y += params.rotationSpeed * dt * (1 + R * (lv.low * 1.4 + env.kick * 1.2));
  panelGroup.rotation.x = Math.sin(now * 0.7) * params.wobble * (1 + R * lv.mid);
  panelGroup.rotation.z = Math.sin(now * 0.53 + 1.3) * params.wobble * 0.6;
  panelGroup.scale.setScalar(1 + R * 0.035 * env.kick);
  halo.position.y = 0.92 + Math.sin(now * 1.3) * 0.02 + R * 0.04 * env.lead;
  halo.scale.setScalar(1 + R * 0.12 * env.lead);
  halo.rotation.z += dt * R * env.lead * (2 + (leadPitch % 12) * 0.2);
  haloMat.color.setScalar(2.2 + R * 0.9 * env.lead);
  const bright = 0.82 + R * (0.1 * env.bass + 0.08 * env.kick);
  characterMat.uniforms.uBrightness.value = bright;
  tearMat.uniforms.uBrightness.value = bright;
  const tearTarget = TEAR_SCENES.has(storyScene().id) ? 1 : 0;
  characterReveal += (tearTarget - characterReveal) * (1 - Math.exp(-dt / 0.32));
  characterMat.uniforms.uReveal.value = characterReveal;
  characterMat.uniforms.uGlitch.value = now < glitchUntil ? 1 : 0;
  characterMat.uniforms.uTime.value = now;
  gaze.group.position.z = -R * 0.22 * env.kick;   // kick punch-in, outside the gaze smoothing
  gaze.update(dt);

  // random glitches stay, but sparser while the snare is doing the job
  if (Math.random() < params.glitchRate * dt * (R > 0 ? 0.3 : 1)) triggerGlitch(now);

  const stab = 1 + R * 0.18 * env.stab;
  const glide = 1 - Math.exp(-dt / 0.25);   // bands sliding to new heights
  for (const p of panels) {
    const u = p.mat.uniforms;
    u.uTime.value = now;
    p.baseY += (p.targetY - p.baseY) * glide;
    p.mesh.position.y = p.baseY + Math.sin(now * p.bobSpeed + u.uSeed.value) * p.bobAmp;
    const glitching = now < p.glitchUntil;
    u.uGlitch.value = glitching ? 1 : 0;
    u.uFlicker.value = glitching && Math.random() < 0.5 ? THREE.MathUtils.randFloat(0.2, 1.6) : stab;
  }

  bloom.strength = params.bloomStrength + R * (0.3 * env.kick + 0.12 * env.lead);
  crt.uniforms.uDistortion.value = params.distortion + R * 0.14 * env.kick;
  crt.uniforms.uAberration.value = params.aberration + R * (0.01 * env.snare + 0.004 * lv.high);
  crt.uniforms.uGrain.value = params.grain + R * 0.1 * env.hat;
  crt.uniforms.uScanlines.value = params.scanlines + R * 0.08 * lv.low;

  crt.uniforms.uBgStatic.value = params.bgStatic * (1 + R * 0.4 * env.snare);
  crt.uniforms.uTime.value = now;
  crt.uniforms.uStatic.value = now < staticUntil ? THREE.MathUtils.randFloat(0.25, 0.7) : 0;
  crt.uniforms.uGlitch.value = now < glitchUntil ? THREE.MathUtils.randFloat(0.4, 1) : 0;

  tickStoryVisuals();
  tickPixelWhale(performance.now());
  tickDiveWhale(performance.now());
  for (const p of panels) if (p.live) p.mat.uniforms.map.value.needsUpdate = true;

  composer.render(dt);
  requestAnimationFrame(tick);
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  gaze.setPosition(0, 0.05, 4.6 / Math.min(camera.aspect, 1)); // keep the head framed on portrait screens
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  const pr = renderer.getPixelRatio();
  crt.uniforms.uResolution.value = [innerWidth * pr, innerHeight * pr];
  crt.uniforms.uPixel.value = pr;   // one bg snow grain per CSS pixel
}
addEventListener('resize', resize);

await loadContent();
applyCharacterSpec();
applyCredits();
await Promise.all([loadPanelImages(), loadPixelWhale(), loadDiveWhale()]);
setPixelMoodFromScene(storyScene().id);
requestDiveFromScene(storyScene().id);
buildPanels();
resize();
syncParams();
syncOverlay();
loadCharacter();
tick();

