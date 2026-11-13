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
    mark.scale.set(1.5, 1.5, 1); mark.position.set(def.x, 5.1, DOOR_Z + 1.4); mark.visible = false; factory.add(mark);

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
const organWorld = makeOrganWorld(THREE, canvasTexture);
for (const group of Object.values(organWorld.scenes)) scene.add(group);
function showMap(id) {
  for (const [key, group] of Object.entries(organWorld.scenes)) group.visible = key === id;
  const palette = organWorld.palettes[id];
  scene.background = new THREE.Color(palette.bg);
  scene.fog = new THREE.FogExp2(palette.fog, .023);
  factory.visible = id === 'factory';
  raceAvatar.visible = id === 'race';
  player.group.visible = id === 'factory';
}
let raceTime = 0;
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

function blocked(x, z, id) {
  if (id === 'factory') return FACTORY_DIVIDERS.some(obstacle => hitsObstacle(x,z,obstacle));
  return VESSEL_WALLS.some(obstacle => hitsObstacle(x,z,obstacle)) ||
    VESSEL_GATES.some(gate => hitsObstacle(x,z,gate,vesselGateX(gate,raceTime)));
}

function hideIntro() {
  $('intro').classList.add('hidden');
}

function showIntro() {
  const stage = currentStage();
  showMap(stage.id);
  player.x = START_POS.x;
  player.z = START_POS.z;
  player.facing = Math.PI;
  state.selected = -1;
  if (stage.id === 'factory') refreshSelection();
  setPhase('intro');
  $('menu').classList.add('hidden');
  for (const id of ['result','hud','challenge']) $(id).classList.add('hidden');
  $('intro').dataset.theme = stage.id;
  $('introKicker').textContent = 'Prova ' + (room.stage + 1) + ' de ' + CONFIG.stages.length;
  $('introTitle').textContent = stage.title;
  $('introQuestion').textContent = stage.text;
  $('introGoal').textContent = stage.goal;
  const choices = $('introChoices');
  choices.replaceChildren();
  stage.options.forEach((text,i) => {
    const item = document.createElement('li');
    item.textContent = DOOR_DEFS[i].letter + ' · ' + text;
    choices.append(item);
  });
  updateIntro();
  $('intro').classList.remove('hidden');
}

function updateIntro() {
  const remaining = Math.max(0, room.startAt - classroom.now());
  $('introCount').textContent = Math.ceil(remaining / 1000) || 'Vai!';
  $('introBar').style.transform = 'scaleX(' + Math.min(1, remaining / (CONFIG.introSeconds * 1000)) + ')';
}

function waitForScores() {
  hideIntro();
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
    hideIntro();
    showMap('factory');
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
  if (room.startAt > classroom.now()) showIntro();
  scheduled = setTimeout(() => {
    scheduled = null;
    if (room.phase !== 'playing' || room.id + '/' + room.stage !== key || room.submitted) return;
    played = key;
    startTurn();
  }, Math.max(0, room.startAt - classroom.now()));
}

function startTurn() {
  hideIntro();
  resetInput();
  state.selected = -1;
  state.selectedAt = null;
  state.raceMs = null;
  state.marks.clear();
  player.x = START_POS.x;
  player.z = START_POS.z;
  player.facing = player.faceTarget = Math.PI;
  const id = currentStage().id;
  raceTime = 0;
  showMap(id);
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
    $('status').textContent = 'Contorne as fileiras, atravesse as passagens móveis e entregue o O₂ ao músculo.';
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
  const puzzle = makeTargetPuzzle(room.id);
  $('challenge').classList.remove('hidden');
  $('challengeTitle').textContent = 'Reconheça as células infectadas';
  $('challengeHelp').textContent = 'Procure o fragmento ' + puzzle.marker + '. Toque apenas nas células que exibem esse marcador.';
  $('confirmTargets').classList.remove('hidden');
  const grid = $('challengeChoices');
  grid.className = 'cellGrid';
  grid.replaceChildren();
  puzzle.cells.forEach((marker, index) => {
    const cell = document.createElement('button');
    const nucleus = document.createElement('span');
    nucleus.className = 'cell-nucleus';
    const receptor = document.createElement('span');
    receptor.className = 'cell-receptor';
    receptor.textContent = marker;
    cell.append(nucleus, receptor);
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
  hideIntro();
  setPhase('result');
  $('hud').classList.add('hidden');
  $('challenge').classList.add('hidden');
  $('result').classList.remove('hidden');
  showMap(stage.id);
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
    {
      const id = currentStage().id;
      if (blocked(player.x, oldZ, id)) player.x = oldX;
      if (blocked(player.x, player.z, id)) player.z = oldZ;
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
    const compactLandscape = camera.aspect > 1.25 && window.innerHeight < 600;
    const tissue = currentStage().id === 'targets';
    camGoalPos.set(tissue ? 0 : fx, compactLandscape ? 12 : 10, tissue ? 21 : player.z + 13);
    camGoalLook.set(tissue ? 0 : fx, 1.5, tissue ? -1 : player.z - 7);
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
  if (state.phase === 'intro') updateIntro();
  if (state.phase === 'playing') {
    updateClock(nowMs);
    if (currentStage().id === 'race') raceTime = Math.max(0, state.duration - state.remaining);
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
  organWorld.update(t, raceTime);
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
setCharacter('male');
showMap('factory');
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

