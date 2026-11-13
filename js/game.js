(function () {
'use strict';

const CONFIG = IMUNO_CONFIG;

/* Geometria do cenário */
const DOOR_DEFS = [
  { letter: 'A', x: -8, color: 0xf03e3e, css: '#bc2835' },
  { letter: 'B', x: -4, color: 0xffc800, css: '#865b00' },
  { letter: 'C', x: 0, color: 0x1e90ff, css: '#125eb6' },
  { letter: 'D', x: 4, color: 0x8e44ad, css: '#773797' },
  { letter: 'E', x: 8, color: 0x22a776, css: '#18724d' }
];
const DOOR_Z = -12.4;
const PAD_Z = -9.2;          // centro da área de seleção em frente à porta
const ZONE_HALF_W = 1.8;     // meia-largura da zona de seleção
const ZONE_MAX_Z = -7.2;     // a zona começa neste z e vai até a porta
const PLAYER_MIN = { x: -9.2, z: -11.2 };
const PLAYER_MAX = { x:  9.2, z: 14 };
const START_POS = { x: 0, z: 12 };

/* =====================================================================
   Verificações iniciais
   ===================================================================== */
function showFatal(msg) {
  const d = document.createElement('div');
  d.id = 'errorMsg'; d.textContent = msg;
  document.body.appendChild(d);
}
if (typeof THREE === 'undefined') {
  showFatal('Não foi possível carregar o Three.js (verifique sua conexão com a internet).');
  return;
}

const $ = id => document.getElementById(id);
const canvasEl = $('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
} catch (e) {
  showFatal('Seu navegador não conseguiu iniciar o WebGL.');
  return;
}
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 250);

/* Luzes */
scene.add(new THREE.HemisphereLight(0xffffff, 0x88aa66, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 0.75);
sun.position.set(10, 28, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -26; sun.shadow.camera.right = 26;
sun.shadow.camera.top = 26;   sun.shadow.camera.bottom = -26;
sun.shadow.camera.near = 1;   sun.shadow.camera.far = 80;
scene.add(sun);

/* =====================================================================
   Helpers de construção
   ===================================================================== */
function lambert(color, extra) {
  return new THREE.MeshLambertMaterial(Object.assign({ color: color }, extra || {}));
}
function addBox(parent, w, h, d, color, x, y, z, noShadow) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
  m.position.set(x, y, z);
  m.castShadow = !noShadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function addEdges(mesh) {
  const e = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
  );
  mesh.add(e);
}
function canvasTexture(size, drawFn) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  drawFn(c.getContext('2d'), size);
  return new THREE.CanvasTexture(c);
}
function letterTexture(letter, bg, withBg) {
  return canvasTexture(128, (g, s) => {
    if (withBg) {
      g.fillStyle = bg; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2); g.fill();
      g.lineWidth = 8; g.strokeStyle = '#1d2b53'; g.stroke();
    }
    g.font = 'bold 84px "Trebuchet MS", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = '#1d2b53'; g.strokeText(letter, s / 2, s / 2 + 5);
    g.fillStyle = '#ffffff'; g.fillText(letter, s / 2, s / 2 + 5);
  });
}
function markTexture(symbol, color) {
  return canvasTexture(128, (g, s) => {
    g.fillStyle = color; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2); g.fill();
    g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.stroke();
    g.font = 'bold 84px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffffff'; g.fillText(symbol, s / 2, s / 2 + 6);
  });
}
function checkerPlane(w, d) {
  const tex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#4cd137'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#3fbf2f'; g.fillRect(0, 0, s / 2, s / 2); g.fillRect(s / 2, s / 2, s / 2, s / 2);
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(w / 4, d / 4);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: tex }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.01; m.receiveShadow = true;
  return m;
}
function makeIsland(x, topY, z, w, d, baseH) {
  const g = new THREE.Group();
  addBox(g, w, 0.5, d, 0x3dbb3a, 0, -0.25, 0, true);
  g.add(checkerPlane(w, d));
  addBox(g, w * 0.96, baseH, d * 0.96, 0x9a5b2e, 0, -0.5 - baseH / 2, 0, true);
  g.position.set(x, topY, z);
  scene.add(g);
  return g;
}

/* =====================================================================
   Elementos decorativos (estáticos)
   ===================================================================== */

function makeVirus(r, color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), lambert(color));
  body.castShadow = true; g.add(body);
  const spikeCol = 0xffd32a;
  const ico = new THREE.IcosahedronGeometry(1, 0).attributes.position;
  const seen = new Set();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < ico.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(ico, i).normalize();
    const key = v.toArray().map(n => n.toFixed(3)).join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    const spike = new THREE.Mesh(new THREE.ConeGeometry(r * 0.22, r * 0.6, 8), lambert(color));
    spike.position.copy(v).multiplyScalar(r + r * 0.22);
    spike.quaternion.setFromUnitVectors(up, v);
    spike.castShadow = true; g.add(spike);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.13, 8, 8), lambert(spikeCol));
    tip.position.copy(v).multiplyScalar(r + r * 0.6);
    g.add(tip);
  }
  // olhinhos de desenho animado
  [-1, 1].forEach(s => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(r * 0.2, 12, 10), lambert(0xffffff));
    eye.position.set(s * r * 0.32, r * 0.2, r * 0.82); g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.09, 8, 8), lambert(0x111111));
    pupil.position.set(s * r * 0.32, r * 0.2, r * 0.82 + r * 0.16); g.add(pupil);
  });
  return g;
}

function makeSyringe() {
  const g = new THREE.Group();
  const mk = (geo, color, x, y, z) => {
    const m = new THREE.Mesh(geo, lambert(color)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
  };
  mk(new THREE.CylinderGeometry(0.38, 0.38, 2.2, 16), 0xffffff, 0, 0, 0);          // corpo
  mk(new THREE.CylinderGeometry(0.3, 0.3, 1.5, 16), 0xe74c3c, 0, -0.3, 0);         // líquido
  mk(new THREE.BoxGeometry(1.3, 0.14, 0.45), 0x2e86de, 0, 1.1, 0);                 // aba
  mk(new THREE.CylinderGeometry(0.1, 0.1, 1.3, 10), 0xbdc3c7, 0, 1.7, 0);          // haste
  mk(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16), 0x2e86de, 0, 2.4, 0);       // botão
  mk(new THREE.CylinderGeometry(0.12, 0.3, 0.4, 12), 0x2e86de, 0, -1.3, 0);        // conector
  mk(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), 0xdfe6e9, 0, -2.05, 0);       // agulha
  return g;
}

function makeCross(size) {
  const g = new THREE.Group();
  addBox(g, size, size, 0.18, 0xffffff, 0, 0, 0);
  addBox(g, size * 0.72, size * 0.24, 0.22, 0xe74c3c, 0, 0, 0.02, true);
  addBox(g, size * 0.24, size * 0.72, 0.22, 0xe74c3c, 0, 0, 0.02, true);
  return g;
}

function makeBlock(size, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), lambert(color));
  m.castShadow = true; m.receiveShadow = true; addEdges(m);
  return m;
}

function buildDecor() {
  // Parede de fundo
  addBox(scene, 24, 9, 2, 0x7d5fff, 0, 4.5, -13.9);
  addBox(scene, 24, 0.8, 2.2, 0xffc800, 0, 9.2, -13.9);
  // Blocos coloridos ao longo das bordas laterais da plataforma
  const blockColors = [0xff9f1a, 0xe74c3c, 0xffd32a, 0x1e90ff, 0x2ecc71];
  [-10.3, 10.3].forEach((x, side) => {
    [11, 8, 5, 2, -1, -4].forEach((z, i) => {
      const b = makeBlock(1, blockColors[(i + side * 2) % blockColors.length]);
      b.position.set(x, 0.5, z); scene.add(b);
      if (i % 3 === 0) {
        const b2 = makeBlock(1, blockColors[(i + side * 2 + 1) % blockColors.length]);
        b2.position.set(x, 1.5, z); scene.add(b2);
      }
    });
  });

  // Ilhas flutuantes
  const iL1 = makeIsland(-16, 0, 6, 5, 5, 1.6);
  const syr1 = makeSyringe(); syr1.scale.setScalar(0.9); syr1.position.set(1, 2.2, 0.5); syr1.rotation.z = 0.35; iL1.add(syr1);
  const v1 = makeVirus(0.9, 0x8e44ad); v1.position.set(-1, 1.2, -0.5); iL1.add(v1);

  const iR1 = makeIsland(16, 0, -2, 5, 5, 1.6);
  const v2 = makeVirus(0.9, 0x27ae60); v2.position.set(0.8, 1.2, 0.5); iR1.add(v2);
  [[-1.2, 0.5, -1.2, 0xe74c3c], [-1.2, 0.5, 0, 0xffd32a], [-1.2, 1.5, -0.6, 0x1e90ff]].forEach(a => {
    const b = makeBlock(1, a[3]); b.position.set(a[0], a[1], a[2]); iR1.add(b);
  });

  const iL2 = makeIsland(-17, 2, -8, 4, 4, 1.4);
  [[-0.8, 0.5, 0.6, 0xff9f1a], [0.4, 0.5, 0.6, 0x2ecc71], [-0.2, 1.5, 0.6, 0xe74c3c]].forEach(a => {
    const b = makeBlock(1, a[3]); b.position.set(a[0], a[1], a[2]); iL2.add(b);
  });
  const c1 = makeCross(1.6); c1.position.set(0.8, 2.6, -1); iL2.add(c1);

  const iR2 = makeIsland(17, 1.5, 10, 4, 4, 1.4);
  const syr2 = makeSyringe(); syr2.scale.setScalar(0.8); syr2.position.set(-0.8, 2, 0); syr2.rotation.z = -0.4; iR2.add(syr2);
  const v3 = makeVirus(0.8, 0xe74c3c); v3.position.set(0.9, 1.1, 0.4); iR2.add(v3);


}

/* =====================================================================
   Plataforma e portas
   ===================================================================== */
function buildPlatform() {
  const g = new THREE.Group();
  addBox(g, 22, 0.6, 30, 0x3dbb3a, 0, -0.3, 0, true);
  g.add(checkerPlane(22, 30));
  addBox(g, 21.2, 3, 29.2, 0x9a5b2e, 0, -2.1, 0, true);
  addBox(g, 21.4, 0.4, 29.4, 0xc98a4b, 0, -1.0, 0, true);
  scene.add(g);
}

const doors = [];
const factory = new THREE.Group();
const antibodies = new THREE.Group();
scene.add(factory);
function buildDoors() {
  DOOR_DEFS.forEach((def, i) => {
    const g = new THREE.Group();
    g.position.set(def.x, 0, DOOR_Z);
    factory.add(g);

    const frameMat = lambert(def.color, { emissive: def.color });
    frameMat.emissiveIntensity = 0;
    const mkFrame = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMat);
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
    };
    mkFrame(0.9, 5.2, 1.2, -1.45, 2.6, 0);
    mkFrame(0.9, 5.2, 1.2, 1.45, 2.6, 0);
    mkFrame(3.8, 1.0, 1.2, 0, 5.7, 0);
    addBox(g, 2.3, 5.2, 0.3, 0x2d1e5f, 0, 2.6, -0.4, true);

    const badge = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 32),
      new THREE.MeshBasicMaterial({ map: letterTexture(def.letter, def.css, true), transparent: true })
    );
    badge.position.set(0, 7.05, 0.35); g.add(badge);

    // Área de seleção no chão
    const padMat = lambert(def.color, { emissive: def.color });
    padMat.emissiveIntensity = 0.15;
    const pad = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 4), padMat);
    pad.position.set(def.x, 0.1, PAD_Z); pad.receiveShadow = true; factory.add(pad);

    const letter = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.9),
      new THREE.MeshBasicMaterial({ map: letterTexture(def.letter, def.css, false), transparent: true })
    );
    letter.rotation.x = -Math.PI / 2; letter.position.set(def.x, 0.22, PAD_Z); factory.add(letter);

    // Coluna de luz (aparece quando selecionada)
    const beamMat = new THREE.MeshBasicMaterial({
      color: def.color, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 6, 24, 1, true), beamMat);
    beam.position.set(def.x, 3.2, PAD_Z); beam.visible = false; factory.add(beam);

    // Marca ✓ / ✗ (revelada só no fim)
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
    mark.scale.set(2.4, 2.4, 1); mark.position.set(def.x, 9.6, DOOR_Z + 0.5); mark.visible = false; factory.add(mark);

    doors.push({ frameMat, padMat, beam, mark });
  });
}



/* =====================================================================
   Personagens
   ===================================================================== */
function buildCharacter(id) {
  const female = id === 'female';
  const skin = 0xffcc99, white = 0xffffff, blue = female ? 0xe90916 : 0x1f4fa8, dark = 0x222222;
  const hairCol = female ? 0xb5521b : 0x3b2314;
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);

  const legL = new THREE.Group(); legL.position.set(-0.27, 0.95, 0); body.add(legL);
  const legR = new THREE.Group(); legR.position.set(0.27, 0.95, 0); body.add(legR);
  [legL, legR].forEach(l => {
    addBox(l, 0.46, 0.95, 0.5, blue, 0, -0.475, 0);
    addBox(l, 0.48, 0.2, 0.62, dark, 0, -0.85, 0.06);
  });

  addBox(body, 1.2, 1.1, 0.65, white, 0, 1.5, 0);                    // jaleco
  addBox(body, 0.3, 0.1, 0.03, 0xe74c3c, -0.35, 1.8, 0.34, true);    // cruz no jaleco
  addBox(body, 0.1, 0.3, 0.03, 0xe74c3c, -0.35, 1.8, 0.34, true);

  const armL = new THREE.Group(); armL.position.set(-0.78, 1.95, 0); body.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.78, 1.95, 0); body.add(armR);
  [armL, armR].forEach(a => {
    addBox(a, 0.32, 0.95, 0.4, white, 0, -0.45, 0);
    addBox(a, 0.32, 0.22, 0.4, skin, 0, -1.0, 0);
  });

  addBox(body, 0.95, 0.9, 0.9, skin, 0, 2.5, 0);                     // cabeça
  addBox(body, 0.12, 0.2, 0.04, 0x222222, -0.22, 2.55, 0.46, true);  // olhos
  addBox(body, 0.12, 0.2, 0.04, 0x222222, 0.22, 2.55, 0.46, true);
  addBox(body, 0.3, 0.06, 0.04, 0xc0392b, 0, 2.28, 0.46, true);      // boca

  if (female) {
    addBox(body, 1.02, 0.3, 1.02, hairCol, 0, 2.99, 0);
    addBox(body, 1.06, 1.2, 0.28, hairCol, 0, 2.45, -0.5);
    addBox(body, 0.14, 0.7, 0.5, hairCol, -0.54, 2.6, -0.1);
    addBox(body, 0.14, 0.7, 0.5, hairCol, 0.54, 2.6, -0.1);
    addBox(body, 0.34, 0.3, 0.16, 0xff4f9a, 0.38, 3.18, 0.25);       // laço
  } else {
    addBox(body, 1.0, 0.26, 0.98, hairCol, 0, 2.98, 0);
    addBox(body, 1.0, 0.6, 0.2, hairCol, 0, 2.72, -0.42);
  }

  g.userData = { body: body, legL: legL, legR: legR, armL: armL, armR: armR, walk: 0 };
  return g;
}

function disposeGroup(g) {
  g.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
}

/* =====================================================================
   Estado do jogo
   ===================================================================== */
const state = {
  phase: 'menu', charId: 'male', stageIndex: 0, selected: -1, selectedAt: null,
  remaining: 0, deadline: 0, duration: 0, raceMs: null,
  marks: new Set()
};
const player = { group: null, x: START_POS.x, z: START_POS.z, facing: 0, faceTarget: Math.PI };
const characterModels = createCharacterModels(THREE, CONFIG.models);

function setCharacter(id) {
  state.charId = id;
  if (player.group) { scene.remove(player.group); if (player.group.userData.legL) disposeGroup(player.group); }
  player.group = buildCharacter(id);
  scene.add(player.group);
  placePlayer();
  const group = player.group;
  characterModels.load(id).then(model => {
    if (!model || player.group !== group) return;
    const fallback = group.userData.body;
    group.remove(fallback);
    disposeGroup(fallback);
    group.add(model);
    group.userData = { body: model, walk: 0 };
  });
}
function placePlayer() {
  player.group.position.set(player.x, 0, player.z);
  player.group.rotation.y = player.facing;
}

/* =====================================================================
   Entrada: teclado e joystick
   ===================================================================== */
const keys = new Set();
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right'
};
window.addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (!k) return;
  if (state.phase === 'playing') { keys.add(k); e.preventDefault(); }
});
window.addEventListener('keyup', e => {
  const k = KEYMAP[e.code];
  if (k) keys.delete(k);
});
window.addEventListener('blur', resetInput);

const joy = { x: 0, y: 0, pointer: null };
const joyEl = $('joy'), knobEl = $('knob');
function updateJoy(e) {
  const r = joyEl.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const max = (r.width - knobEl.offsetWidth) / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy;
  const len = Math.hypot(dx, dy);
  if (len > max) { dx *= max / len; dy *= max / len; }
  knobEl.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  joy.x = dx / max; joy.y = dy / max;
}
function releaseJoy(event) {
  if (event && event.pointerId !== joy.pointer) return;
  const pointer = joy.pointer;
  joy.pointer = null;
  joy.x = joy.y = 0;
  if (pointer !== null && joyEl.hasPointerCapture(pointer)) joyEl.releasePointerCapture(pointer);
  knobEl.style.transform = 'translate(0,0)';
}
joyEl.addEventListener('pointerdown', event => {
  if (joy.pointer !== null || state.phase !== 'playing' || event.button !== 0) return;
  event.preventDefault();
  joy.pointer = event.pointerId;
  try { joyEl.setPointerCapture(event.pointerId); } catch { releaseJoy(); return; }
  updateJoy(event);
});
joyEl.addEventListener('pointermove', event => {
  if (event.pointerId === joy.pointer) updateJoy(event);
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  joyEl.addEventListener(event, releaseJoy);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) resetInput();
});

function resetInput() { keys.clear(); releaseJoy(); }

/* =====================================================================
   HUD
   ===================================================================== */
const race = new THREE.Group();
const raceAvatar = new THREE.Group();
const disk = new THREE.Mesh(new THREE.TorusGeometry(.66, .33, 12, 28), lambert(0xea293d));
disk.rotation.x = Math.PI / 2;
disk.position.y = .42;
disk.scale.z = .75;
raceAvatar.add(disk);
const center = new THREE.Mesh(new THREE.SphereGeometry(.58, 16, 12), lambert(0xba1933));
center.scale.y = .29;
center.position.y = .40;
raceAvatar.add(center);
const oxygen = new THREE.Mesh(new THREE.SphereGeometry(.25, 12, 10), lambert(0x82edff));
oxygen.position.y = 1.1;
raceAvatar.add(oxygen);
scene.add(raceAvatar);
raceAvatar.visible = false;
const raceFinishZ = -10.5;
const barriers = [
  { x: -3.5, z: 6, width: 12 },
  { x: 4, z: 0, width: 11 },
  { x: -4.4, z: -6, width: 10 }
];
const cellMarkers = ['◆', '▲', '●', '■', '▲', '◆', '▲', '●', '■', '▲', '◆', '●'];
let room;
let played;
let scheduled = null;
const altEls = [];

function currentStage() { return CONFIG.stages[state.stageIndex]; }
function setPhase(phase) {
  state.phase = phase;
  document.body.dataset.phase = phase;
}
function setClock(seconds) {
  state.duration = seconds;
  state.deadline = performance.now() + seconds * 1000;
  updateClock(performance.now());
}
function updateClock(now) {
  state.remaining = Math.max(0, (state.deadline - now) / 1000);
  $('time').textContent = (Math.ceil(state.remaining * 10) / 10).toFixed(1).replace('.', ',');
  $('timerBar').style.width = (state.remaining / state.duration * 100) + '%';
  $('timerPill').classList.toggle('low', state.remaining <= 5);
}

function buildRace() {
  scene.add(race);
  race.visible = false;
  addBox(race, 20, .08, 28, 0xb83857, 0, .02, .5, true);
  addBox(race, .35, 1.4, 28, 0x9b2549, -9.85, .7, .5);
  addBox(race, .35, 1.4, 28, 0x9b2549, 9.85, .7, .5);
  const geometry = new THREE.SphereGeometry(1, 16, 12);
  const red = lambert(0xe84252);
  for (const wall of barriers) {
    addBox(race, wall.width, .65, 1.25, 0x922344, wall.x, .325, wall.z);
    for (let i = -wall.width / 2 + .7; i < wall.width / 2; i += 1.3) {
      const cell = new THREE.Mesh(geometry, red);
      cell.scale.set(.68, .36, .59);
      cell.position.set(wall.x + i, .74, wall.z);
      race.add(cell);
    }
  }
  for (let i = -9; i <= 9; i++) {
    addBox(race, 1, .1, 1.15, i % 2 ? 0xf6fcff : 0x322045, i, .08, raceFinishZ, true);
  }
  for (const [label, z, color] of [['Pulmões · O₂', 10, '#195a9a'], ['Músculo · Entrega', -12, '#75264b']]) {
    const map = canvasTexture(256, (ctx, size) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 60, size, 136);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 128, 139);
    });
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true }));
    sign.scale.set(4, 4, 1);
    sign.position.set(0, 2.6, z);
    race.add(sign);
  }
}

function raceBlocked(x, z) {
  return barriers.some(wall =>
    Math.abs(x - wall.x) < wall.width / 2 + .36 && Math.abs(z - wall.z) < 1.02);
}

function waitForScores() {
  setPhase('waiting');
  $('hud').classList.add('hidden');
  $('challenge').classList.add('hidden');
  $('result').classList.remove('hidden');
  $('resTitle').textContent = currentStage().title;
  $('resSummary').textContent = 'Aguardando resultados da turma.';
  $('standings').replaceChildren();
  $('againBtn').classList.add('hidden');
}

function handleRoom(updated) {
  room = updated;
  $('connection').classList.add('hidden');
  if (room.phase === 'lobby') {
    clearTimeout(scheduled);
    scheduled = null;
    played = null;
    resetInput();
    setPhase('menu');
    $('menu').classList.remove('hidden');
    for (const id of ['result', 'challenge', 'hud']) $(id).classList.add('hidden');
    $('playerName').disabled = room.joined;
    if (room.joined) $('playerName').value = room.players.find(player => player.me).name;
    $('roomInfo').textContent = room.joined
      ? (room.host ? 'Você abriu a sala. Comece quando a turma estiver pronta.' : 'Aguardando o início da partida.')
      : 'Digite seu nome para entrar na sala da turma.';
    $('roomPlayers').textContent = room.players.map(player => player.name).join(' · ');
    $('startBtn').textContent = room.joined ? 'Começar campeonato' : 'Entrar na sala';
    $('startBtn').disabled = room.joined && !room.host;
    race.visible = raceAvatar.visible = false;
    player.group.visible = factory.visible = true;
    player.x = START_POS.x;
    player.z = START_POS.z;
    state.selected = -1;
    refreshSelection();
    return;
  }

  $('menu').classList.add('hidden');
  state.stageIndex = room.stage;
  if (room.phase === 'results') {
    clearTimeout(scheduled);
    scheduled = null;
    resetInput();
    showStandings(currentStage());
    return;
  }

  if (!room.joined || room.submitted || classroom.now() >= room.closeAt) {
    waitForScores();
    $('resSummary').textContent = !room.joined
      ? 'Campeonato em andamento. Você pode acompanhar o placar e entrar no próximo.'
      : 'Aguardando a turma · ' + room.received + '/' + room.players.length + ' resultados recebidos.';
    return;
  }

  const key = room.id + '/' + room.stage;
  if (played === key || scheduled !== null) return;
  waitForScores();
  $('resSummary').textContent = 'Prepare-se. A prova começa para toda a turma em instantes.';
  scheduled = setTimeout(() => {
    scheduled = null;
    if (room.phase !== 'playing' || room.id + '/' + room.stage !== key || room.submitted) return;
    played = key;
    startTurn();
  }, Math.max(0, room.startAt - classroom.now()));
}

function startTurn() {
  resetInput();
  state.selected = -1;
  state.selectedAt = null;
  state.raceMs = null;
  state.marks.clear();
  player.x = START_POS.x;
  player.z = START_POS.z;
  player.facing = player.faceTarget = Math.PI;
  const id = currentStage().id;
  factory.visible = id === 'factory';
  race.visible = id === 'race';
  player.group.visible = id !== 'race';
  raceAvatar.visible = id === 'race';
  $('result').classList.add('hidden');
  $('hud').classList.remove('hidden');
  $('score').textContent = total(room.players.find(player => player.me));
  $('alts').replaceChildren();
  altEls.length = 0;
  $('qtext').textContent = currentStage().title;
  $('status').textContent = '';
  if (id === 'targets') {
    showTargets();
    return;
  }
  setPhase('playing');
  if (id === 'factory') {
    $('qtext').textContent = currentStage().text;
    currentStage().options.forEach((text, index) => {
      const item = document.createElement('li');
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.style.background = DOOR_DEFS[index].css;
      badge.textContent = DOOR_DEFS[index].letter;
      item.append(badge, document.createTextNode(text));
      $('alts').append(item);
      altEls.push(item);
    });
    refreshSelection();
    setClock(CONFIG.roundSeconds);
    state.deadline = performance.now() + room.startAt + CONFIG.roundSeconds * 1000 - classroom.now();
  } else {
    $('status').textContent = 'Leve o O₂ até o músculo. Contorne as fileiras de hemácias e cruze a faixa.';
    setClock(CONFIG.raceSeconds);
    state.deadline = performance.now() + room.startAt + CONFIG.raceSeconds * 1000 - classroom.now();
  }
}

function refreshSelection() {
  antibodies.visible = false;
  altEls.forEach((item, i) => item.classList.toggle('sel', i === state.selected));
  doors.forEach((door, i) => {
    const active = i === state.selected;
    door.frameMat.emissiveIntensity = active ? .55 : 0;
    door.padMat.emissiveIntensity = active ? .75 : .15;
    door.beam.visible = active;
    door.mark.visible = false;
  });
  $('status').textContent = state.selected < 0 ? 'Entre na área da estação da sua resposta.'
    : 'Estação ' + DOOR_DEFS[state.selected].letter + ' selecionada. Você pode trocar até o tempo acabar.';
}
function updateSelection() {
  const zone = player.z <= ZONE_MAX_Z
    ? DOOR_DEFS.findIndex(door => Math.abs(player.x - door.x) <= ZONE_HALF_W) : -1;
  if (zone === state.selected) return;
  state.selected = zone;
  state.selectedAt = zone < 0 ? null : state.remaining;
  refreshSelection();
}

function showTargets() {
  setPhase('challenge');
  $('challenge').classList.remove('hidden');
  $('challengeTitle').textContent = 'Reconheça as células infectadas';
  $('challengeHelp').textContent = 'O fragmento viral tem a forma ▲. Marque as células que exibem esse fragmento.';
  $('confirmTargets').classList.remove('hidden');
  const grid = $('challengeChoices');
  grid.className = 'cellGrid';
  grid.replaceChildren();
  cellMarkers.forEach((marker, index) => {
    const cell = document.createElement('button');
    cell.textContent = marker;
    cell.setAttribute('aria-label', 'Célula ' + (index + 1) + ', marcador ' + marker);
    cell.setAttribute('aria-pressed', 'false');
    cell.addEventListener('click', () => {
      if (state.phase !== 'challenge' || performance.now() >= state.deadline) return;
      if (state.marks.has(index)) state.marks.delete(index);
      else state.marks.add(index);
      cell.setAttribute('aria-pressed', String(state.marks.has(index)));
    });
    grid.append(cell);
  });
  setClock(CONFIG.targetSeconds);
  state.deadline = performance.now() + room.startAt + CONFIG.targetSeconds * 1000 - classroom.now();
}
function confirmTargets() {
  if (state.phase !== 'challenge') return;
  showQuiz();
}
function showQuiz() {
  resetInput();
  setPhase('quiz');
  $('challenge').classList.remove('hidden');
  $('confirmTargets').classList.add('hidden');
  $('challengeTitle').textContent = currentStage().text;
  $('challengeHelp').textContent = currentStage().id === 'race'
    ? (state.raceMs === null ? 'Tempo da corrida esgotado.' : 'Entrega concluída em ' + (state.raceMs / 1000).toFixed(2) + ' s.')
    : 'Escolha a célula responsável por eliminar os alvos infectados.';
  const choices = $('challengeChoices');
  choices.className = 'quizChoices';
  choices.replaceChildren();
  currentStage().options.forEach((text, index) => {
    const letter = DOOR_DEFS[index].letter;
    const button = document.createElement('button');
    button.textContent = letter + ' · ' + text;
    button.addEventListener('click', () => {
      if (state.phase === 'quiz') finishAttempt(performance.now() < state.deadline ? letter : null);
    });
    choices.append(button);
  });
  setClock(CONFIG.quizSeconds);
}

function finishAttempt(answer) {
  resetInput();
  waitForScores();
  classroom.submit({ answer, selectedAt: state.selectedAt, raceMs: state.raceMs, marks: [...state.marks] });
}

function total(competitor) {
  return competitor.results.reduce((sum, result) => sum + result.practical + result.quiz, 0);
}
function showStandings(stage) {
  setPhase('result');
  $('hud').classList.add('hidden');
  $('challenge').classList.add('hidden');
  $('result').classList.remove('hidden');
  factory.visible = stage.id === 'factory';
  race.visible = raceAvatar.visible = stage.id === 'race';
  player.group.visible = stage.id !== 'race';
  const final = state.stageIndex === CONFIG.stages.length - 1;
  $('resTitle').textContent = final ? 'Placar final' : 'Resultado · ' + stage.title;
  $('resSummary').textContent = stage.correct + ' · ' + stage.explanation;
  if (stage.id === 'factory') {
    const correctDoor = doors[DOOR_DEFS.findIndex(door => door.letter === stage.correct)];
    for (const door of doors) door.beam.visible = door === correctDoor;
    correctDoor.mark.visible = true;
    antibodies.position.x = DOOR_DEFS.find(door => door.letter === stage.correct).x;
    antibodies.visible = true;
  }
  const board = $('standings');
  board.replaceChildren();
  const ordered = [...room.players].sort((a, b) => total(b) - total(a));
  for (const competitor of ordered) {
    const entry = competitor.results[state.stageIndex];
    const line = document.createElement('p');
    const detail = stage.id === 'race' ? (entry.place ? entry.place + 'º · ' + (entry.raceMs / 1000).toFixed(2) + ' s · ' : 'Sem chegada · ') : '';
    const score = stage.id === 'factory' ? entry.quiz + ' pela estação' : entry.practical + ' na prova + ' + entry.quiz + ' na pergunta';
    line.textContent = competitor.name + ' · ' + total(competitor) + ' pontos';
    const breakdown = document.createElement('small');
    breakdown.textContent = detail + score + ' · Resposta ' + (entry.answer || 'em branco');
    board.append(line, breakdown);
  }
  $('againBtn').textContent = final ? 'Abrir novo campeonato' : 'Próxima prova';
  $('againBtn').classList.toggle('hidden', !room.host);
}

function movePlayer(dt) {
  let ix = 0, iz = 0;
  if (keys.has('left')) ix -= 1;
  if (keys.has('right')) ix += 1;
  if (keys.has('up')) iz -= 1;
  if (keys.has('down')) iz += 1;
  ix += joy.x; iz += joy.y;
  let mag = Math.hypot(ix, iz);
  if (mag < 0.12) { ix = 0; iz = 0; mag = 0; }
  if (mag > 1) { ix /= mag; iz /= mag; mag = 1; }

  if (mag > 0) {
    const oldX = player.x, oldZ = player.z;
    player.x += ix * CONFIG.moveSpeed * dt;
    player.z += iz * CONFIG.moveSpeed * dt;
    player.x = Math.min(PLAYER_MAX.x, Math.max(PLAYER_MIN.x, player.x));
    player.z = Math.min(PLAYER_MAX.z, Math.max(PLAYER_MIN.z, player.z));
    if (currentStage().id === 'race') {
      if (raceBlocked(player.x, oldZ)) player.x = oldX;
      if (raceBlocked(player.x, player.z)) player.z = oldZ;
      if (player.x === oldX && player.z === oldZ) return 0;
    }
    player.faceTarget = Math.atan2(ix, iz);
  }
  return mag;
}

function animateCharacter(dt, moving) {
  const u = player.group.userData;
  if (!u.legL) {
    if (moving > 0) {
      u.walk += dt * 11;
      u.body.position.y = Math.abs(Math.sin(u.walk)) * 0.10;
      u.body.rotation.z = Math.sin(u.walk) * 0.035;
    } else {
      const settle = 1 - Math.min(1, dt * 10);
      u.body.position.y *= settle;
      u.body.rotation.z *= settle;
    }
    return;
  }
  if (moving > 0) {
    u.walk += dt * 11;
    const s = Math.sin(u.walk);
    u.legL.rotation.x = s * 0.7; u.legR.rotation.x = -s * 0.7;
    u.armL.rotation.x = -s * 0.6; u.armR.rotation.x = s * 0.6;
    u.body.position.y = Math.abs(s) * 0.08;
  } else {
    const k = Math.min(1, dt * 10);
    u.legL.rotation.x *= 1 - k; u.legR.rotation.x *= 1 - k;
    u.armL.rotation.x *= 1 - k; u.armR.rotation.x *= 1 - k;
    u.body.position.y *= 1 - k;
  }
}

const camPos = new THREE.Vector3(0, 3.6, 20.5);
const camLook = new THREE.Vector3(0, 1.8, 12);
const camGoalPos = new THREE.Vector3();
const camGoalLook = new THREE.Vector3();
camera.position.copy(camPos);

function updateCamera(dt) {
  if (state.phase === 'menu') {
    camGoalPos.set(0, 3.8, player.z + 8.5);
    camGoalLook.set(0, 1.9, player.z);
  } else {
    const fx = player.x * 0.7;
    camGoalPos.set(fx, 10, player.z + 13);
    camGoalLook.set(fx, 1.5, player.z - 7);
  }
  const k = 1 - Math.pow(0.002, dt);
  camPos.lerp(camGoalPos, k);
  camLook.lerp(camGoalLook, k);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

let lastTs = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const nowMs = performance.now();
  const dt = Math.min(0.05, (nowMs - lastTs) / 1000);
  lastTs = nowMs;
  const t = nowMs / 1000;

  let moving = 0;
  if (state.phase === 'playing') {
    updateClock(nowMs);
    if (state.remaining > 0) {
      moving = movePlayer(dt);
      if (currentStage().id === 'factory') updateSelection();
      if (currentStage().id === 'race' && player.z <= raceFinishZ) {
        state.raceMs = Math.max(1, Math.round(nowMs - (state.deadline - state.duration * 1000)));
        showQuiz();
      }
      const diff = player.faceTarget - player.facing;
      player.facing += Math.atan2(Math.sin(diff), Math.cos(diff)) * Math.min(1, dt * 12);
    } else if (currentStage().id === 'factory') {
      finishAttempt(DOOR_DEFS[state.selected]?.letter);
    } else {
      showQuiz();
    }
  } else if (state.phase === 'challenge' || state.phase === 'quiz') {
    updateClock(nowMs);
    if (state.remaining <= 0) {
      if (state.phase === 'challenge') confirmTargets();
      else finishAttempt(null);
    }
  } else if (state.phase === 'menu') {
    player.facing = Math.sin(t * 0.9) * 0.7;
  }

  if (player.group) { placePlayer(); animateCharacter(dt, moving); }
  if (raceAvatar.visible) {
    raceAvatar.position.set(player.x, 0, player.z);
    raceAvatar.rotation.z = moving ? Math.sin(t * 12) * .1 : 0;
  }
  updateCamera(dt);
  renderer.render(scene, camera);
}

/* =====================================================================
   Resize
   ===================================================================== */
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  const aspect = w / h;
  camera.aspect = aspect;
  if (aspect >= 1) camera.fov = 55;
  else {
    const half = Math.atan(Math.tan(27.5 * Math.PI / 180) / aspect);
    camera.fov = Math.min(88, 2 * half * 180 / Math.PI);
  }
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 150));

/* =====================================================================
   Inicialização
   ===================================================================== */
buildPlatform();
buildDoors();
const correctMark = markTexture('✓', '#1b8c53');
for (const door of doors) door.mark.material.map = correctMark;
factory.add(antibodies);
for (let i = 0; i < 3; i++) {
  const antibody = new THREE.Group();
  antibody.position.set((i - 1) * .85, 3.4 + (i % 2) * .9, DOOR_Z + 1);
  addBox(antibody, .16, .54, .16, 0x4ff2de, 0, -.12, 0);
  for (const direction of [-1, 1]) {
    const arm = addBox(antibody, .16, .46, .16, 0x4ff2de, direction * .15, .22, 0);
    arm.rotation.z = -direction * .67;
  }
  antibodies.add(antibody);
}
antibodies.visible = false;
buildDecor();
buildRace();
setCharacter('male');
onResize();

document.querySelectorAll('.charBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.charBtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setCharacter(btn.dataset.char);
  });
});
const classroom = connectClassroom(handleRoom, error => {
  $('connection').textContent = error;
  $('connection').classList.remove('hidden');
});
$('startBtn').addEventListener('click', () => {
  if (!room) return;
  if (room.joined) classroom.send('start');
  else {
    const input = $('playerName');
    if (!input.value.trim()) { input.focus(); return; }
    classroom.send('join', { name: input.value.trim() });
  }
});
$('againBtn').addEventListener('click', () => {
  classroom.send(room.stage === CONFIG.stages.length - 1 ? 'reset' : 'next');
});
$('confirmTargets').addEventListener('click', confirmTargets);
requestAnimationFrame(frame);
})();

