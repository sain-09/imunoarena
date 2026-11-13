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
const DOOR_Z = -10.89;
const PAD_Z = -9.9;          // centro da área de seleção em frente à porta
const ZONE_HALF_W = 1.8;     // meia-largura da zona de seleção
const ZONE_MAX_Z = -8.8;     // a zona começa neste z e vai até a porta
const START_POS = { x: 0, z: ARENAS.factory.start };

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
function symbolTexture(symbol, color) {
  return canvasTexture(128, (g) => {
    g.fillStyle = color;
    g.beginPath(); g.arc(64,64,60,0,Math.PI*2); g.fill();
    g.strokeStyle = g.fillStyle = '#fff6e4';
    g.lineWidth = 8; g.lineCap = 'round'; g.lineJoin = 'round';
    const path = points => points.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y));
    g.beginPath();
    if (symbol === 'correto') path([[33,65],[54,86],[94,42]]);
    else if (symbol === 'cruz') { path([[64,38],[64,90]]); path([[38,64],[90,64]]); }
    else if (symbol === 'xis') { path([[43,43],[85,85]]); path([[85,43],[43,85]]); }
    else {
      if (symbol.startsWith('círculo')) g.arc(64,64,26,0,Math.PI*2);
      else if (symbol.startsWith('losango')) path([[64,32],[96,64],[64,96],[32,64]]);
      else if (symbol.startsWith('triângulo')) path([[64,33],[94,89],[34,89]]);
      else path([[37,34],[94,64],[37,94]]);
      g.closePath();
      if (symbol.endsWith('cheio') || symbol.endsWith('cheia')) { g.fill(); return; }
    }
    g.stroke();
  });
}
const doors = [];
const factory = new THREE.Group();
const antibodies = new THREE.Group();
scene.add(factory);
function buildDoors() {
  DOOR_DEFS.forEach((def, i) => {
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

    // Marcador revelado no fim
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
    mark.scale.set(1.5, 1.5, 1); mark.position.set(def.x, 5.1, DOOR_Z + 1.4); mark.visible = false; factory.add(mark);

    doors.push({ beam, mark });
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
  if (player.group) { scene.remove(player.group); if (!player.group.userData.sharedModel) disposeGroup(player.group); }
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
    attachMotionParts(group, model);
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
raceAvatar.userData.racer = true;
scene.add(raceAvatar);
raceAvatar.visible = false;
const arenaModels = {};
const arenaLoads = new Map();
let activeMap = 'factory';
let mapReady = false;
let markers = [];
const remoteAvatars = new Map();
const spriteGeometry = new THREE.Vector3();
const livePeers = new Map();
const peerLifetimeMs = 6000;
let activeRound = null;
function roundKey(snapshot) {
  return snapshot.id + '/' + snapshot.stage;
}

function loadArena(id) {
  if (!arenaLoads.has(id)) {
    const loader = new THREE.GLTFLoader();
    arenaLoads.set(id, loader.loadAsync('models/' + id + '.glb').then(gltf => {
      const model = gltf.scene;
      model.visible = activeMap === id;
      scene.add(model);
      arenaModels[id] = model;
      return model;
    }).catch(error => {
      arenaLoads.delete(id);
      throw error;
    }));
  }
  return arenaLoads.get(id);
}

function showMap(id) {
  activeMap = id;
  for (const [key, group] of Object.entries(arenaModels)) group.visible = key === id;
  const palette = ARENAS[id];
  scene.background = new THREE.Color(palette.tint);
  scene.fog = new THREE.FogExp2(palette.fog, .023);
  factory.visible = id === 'factory';
  raceAvatar.visible = id === 'race';
  player.group.visible = id !== 'race';
}
function updateArena() {
  const model = arenaModels.race;
  if (activeMap !== 'race' || !model) return;
  GATES.forEach((gate,i) => {
    const object = model.getObjectByName('gate_' + i);
    if (object) object.position.set(gateX(gate,raceTime),0,gate.z);
  });
}

function clearMarkers() {
  for (const marker of markers) {
    scene.remove(marker.sprite);
    marker.sprite.material.map.dispose();
    marker.sprite.material.dispose();
  }
  markers = [];
}
function updatePeers(dt) {
  const now = performance.now();
  for (const [key, peer] of livePeers) {
    if (now - peer.receivedAt > peerLifetimeMs) livePeers.delete(key);
  }
  const inPlay = activeRound && room?.phase === 'playing' && activeRound === roundKey(room) &&
    (state.phase === 'playing' || state.phase === 'quiz');
  const peers = inPlay ? livePeers.values() : [];
  const active = new Set();
  for (const peer of peers) {
    active.add(peer.key);
    let avatar = remoteAvatars.get(peer.key);
    if (avatar && avatar.arena !== activeMap) {
      removePeer(peer.key, avatar);
      avatar = null;
    }
    if (!avatar) {
      const group = activeMap === 'race' ? raceAvatar.clone(true) : buildCharacter(peer.char);
      const name = new THREE.Sprite(new THREE.SpriteMaterial({
        map: canvasTexture(256,(ctx,size) => {
          ctx.fillStyle = '#30243f'; ctx.fillRect(8,90,240,76);
          ctx.fillStyle = '#fff2d6'; ctx.textAlign = 'center'; ctx.font = 'bold 28px sans-serif';
          ctx.fillText(peer.name, size/2, 138, 216);
        }), depthTest: false
      }));
      name.position.y = activeMap === 'race' ? 1.85 : 3.3;
      name.scale.set(3,3,1);
      group.visible = true;
      group.add(name);
      group.position.set(peer.x,0,peer.z);
      scene.add(group);
      avatar = {group,name,arena:activeMap};
      remoteAvatars.set(peer.key,avatar);
      if(activeMap !== 'race') characterModels.load(peer.char).then(model => {
        if(!model || remoteAvatars.get(peer.key) !== avatar) return;
        const fallback=group.userData.body;
        group.remove(fallback); disposeGroup(fallback);
        group.add(model);
        attachMotionParts(group, model);
      });
    }
    const age = Math.min(.30, peer.age + (now-peer.receivedAt)/1000);
    const bounds = ARENAS[activeMap];
    let x = THREE.MathUtils.clamp(peer.x+peer.vx*age,-bounds.width,bounds.width);
    let z = THREE.MathUtils.clamp(peer.z+peer.vz*age,bounds.end-1,bounds.start+2);
    if (blocked(x,z,activeMap)) { x = peer.x; z = peer.z; }
    avatar.group.position.lerp(spriteGeometry.set(x,0,z),1-Math.exp(-17*dt));
    animateCharacter(avatar.group, dt, Math.hypot(peer.vx, peer.vz) / CONFIG.moveSpeed);
    const delta = peer.facing-avatar.group.rotation.y;
    avatar.group.rotation.y += Math.atan2(Math.sin(delta),Math.cos(delta))*Math.min(1,dt*8);
  }
  for (const [key,avatar] of remoteAvatars) {
    if (active.has(key)) continue;
    removePeer(key, avatar);
  }
}
function removePeer(key, avatar) {
  scene.remove(avatar.group);
  avatar.group.remove(avatar.name);
  avatar.name.material.map.dispose();
  avatar.name.material.dispose();
  if (avatar.arena !== 'race' && !avatar.group.userData.sharedModel) disposeGroup(avatar.group);
  remoteAvatars.delete(key);
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
  document.body.dataset.arena = activeMap;
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

function blocked(x,z,id) {
  return ARENAS[id].walls.some(wall => inside(x,z,wall)) ||
    (id === 'race' && GATES.some(gate => inside(x,z,[gateX(gate,raceTime),gate.z,2.7,1.5])));
}

function hideIntro() {
  $('intro').classList.add('hidden');
}

function showIntro() {
  const stage = currentStage();
  showMap(stage.id);
  player.x = START_POS.x;
  player.z = ARENAS[stage.id].start;
  player.facing = Math.PI;
  state.selected = -1;
  if (stage.id === 'factory') refreshSelection();
  if (stage.id === 'race') raceTime = 0;
  setPhase('intro');
  $('menu').classList.add('hidden');
  for (const id of ['result','hud','challenge']) $(id).classList.add('hidden');
  $('intro').dataset.theme = stage.id;
  $('introKicker').textContent = 'Prova ' + (room.stage + 1) + ' de ' + CONFIG.stages.length;
  $('introTitle').textContent = stage.title;
  $('introGoal').textContent = stage.goal;
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
  if (!room || roundKey(room) !== roundKey(updated) || updated.phase !== 'playing') {
    activeRound = null;
    livePeers.clear();
    clearTimeout(scheduled);
    scheduled = null;
  }
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
    $('startBtn').disabled = !mapReady || (room.joined && !room.host);
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

  const key = roundKey(room);
  if (played === key || scheduled !== null) return;
  if (room.startAt > classroom.now()) showIntro();
  loadArena(currentStage().id).catch(() => {});
  scheduled = setTimeout(async () => {
    if (room.phase !== 'playing' || room.id + '/' + room.stage !== key || room.submitted) return;
    try { await loadArena(currentStage().id); }
    catch { if (roundKey(room) !== key) return; scheduled = null; $('connection').textContent = 'Falha ao carregar o cenário 3D. Tentando novamente…'; $('connection').classList.remove('hidden'); return; }
    if (room.phase !== 'playing' || room.id + '/' + room.stage !== key || played === key || room.submitted) return;
    scheduled = null;
    played = key;
    startTurn();
  }, Math.max(0, room.startAt - classroom.now()));
}

function startTurn() {
  activeRound = roundKey(room);
  livePeers.clear();
  hideIntro();
  resetInput();
  state.selected = -1;
  state.selectedAt = null;
  state.raceMs = null;
  state.marks.clear();
  player.x = START_POS.x;
  player.z = ARENAS[currentStage().id].start;
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
    $('status').textContent = 'Entregue o O₂ · 0% do percurso';
    setClock(CONFIG.raceSeconds);
    state.deadline = performance.now() + room.startAt + CONFIG.raceSeconds * 1000 - classroom.now();
  }
}

function refreshSelection() {
  antibodies.visible = false;
  altEls.forEach((item, i) => item.classList.toggle('sel', i === state.selected));
  doors.forEach((door, i) => {
    const active = i === state.selected;
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
  clearMarkers();
  setPhase('playing');
  const puzzle = makeTargetPuzzle(room.id);
  $('qtext').textContent = 'Recife celular';
  state.fragment = puzzle.marker;
  $('status').textContent = 'Fragmento ' + puzzle.marker + ' · Aproxime-se de uma célula para inspecioná-la.';
  puzzle.cells.forEach((symbol,index) => {
    const [x,z] = CELL_PODS[index];
    const map = symbolTexture(symbol,'#24464e');
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent:true, depthTest:false }));
    sprite.position.set(x,2,z);
    sprite.scale.set(1.55,1.55,1);
    sprite.visible = false;
    scene.add(sprite);
    markers.push({sprite,x,z,index,symbol});
  });
  setClock(CONFIG.targetSeconds);
  state.deadline = performance.now() + room.startAt + CONFIG.targetSeconds * 1000 - classroom.now();
}
let nearestCell;
function scanCells() {
  nearestCell = null;
  let nearestDistance = 2.4;
  for(const marker of markers) {
    const distance = Math.hypot(player.x-marker.x,player.z-marker.z);
    marker.sprite.visible = distance < 6.5;
    marker.sprite.material.color.setHex(state.marks.has(marker.index) ? 0xffc66d : 0xffffff);
    if(distance < nearestDistance) { nearestDistance = distance; nearestCell = marker; }
  }
  $('status').textContent = 'Fragmento ' + state.fragment + ' · ' + state.marks.size + ' células marcadas';
  const button = $('scanCell');
  button.disabled = !nearestCell;
  button.textContent = nearestCell && state.marks.has(nearestCell.index) ? 'Desmarcar' : 'Marcar célula';
}
function toggleCell() {
  if(state.phase !== 'playing' || activeMap !== 'targets' || !nearestCell || performance.now() >= state.deadline) return;
  const index = nearestCell.index;
  if(state.marks.has(index)) state.marks.delete(index);
  else state.marks.add(index);
  scanCells();
}
function confirmTargets() {
  if(state.phase === 'playing' && activeMap === 'targets') showQuiz();
}
function showQuiz() {
  clearMarkers();
  resetInput();
  setPhase('quiz');
  $('challenge').classList.remove('hidden');
  $('challengeTitle').textContent = currentStage().text;
  $('challenge').dataset.theme = currentStage().id;
  $('challengeHelp').textContent = currentStage().id === 'race'
    ? (state.raceMs === null ? 'Tempo da corrida esgotado.' : 'Entrega concluída em ' + (state.raceMs / 1000).toFixed(2) + ' s.')
    : 'Escolha a célula responsável por eliminar os alvos infectados.';
  const choices = $('challengeChoices');
  choices.className = 'quizChoices';
  choices.replaceChildren();
  currentStage().options.forEach((text, index) => {
    const letter = DOOR_DEFS[index].letter;
    const button = document.createElement('button');
    const badge = document.createElement('span');
    badge.className = 'quiz-letter';
    badge.textContent = letter;
    button.append(badge, document.createTextNode(text));
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
  clearMarkers();
  setPhase('result');
  $('hud').classList.add('hidden');
  $('challenge').classList.add('hidden');
  $('result').classList.remove('hidden');
  showMap(stage.id);
  const final = state.stageIndex === CONFIG.stages.length - 1;
  const me = room.players.find(competitor => competitor.me);
  const entry = me?.results[state.stageIndex];
  const winner = me && total(me) > 0 && room.players.every(competitor => total(me) >= total(competitor));
  const key = roundKey(room);
  if (lastCelebration !== key && (entry?.quiz > 0 || entry?.place === 1 || (final && winner))) {
    lastCelebration = key;
    celebrationEnds = performance.now() + 2300;
  }
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
    const bounds = ARENAS[activeMap];
    player.x = Math.min(bounds.width, Math.max(-bounds.width, player.x));
    player.z = Math.min(bounds.start+2, Math.max(bounds.end-1, player.z));
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

let lastCelebration;
let celebrationEnds = 0;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function attachMotionParts(group, model) {
  group.userData = {body:model, sharedModel:true};
  for (const name of ['legL','legR','armL','armR']) {
    group.userData[name] = model.getObjectByName(name);
  }
}

function animateCharacter(group, dt, moving, celebrating = false) {
  const u = group.userData;
  const body = u.body;
  const amount = reducedMotion.matches ? .5 : 1;
  const step = Math.min(1, moving);
  u.walk = (u.walk || 0) + dt * (4 + step * 8);
  const gait = Math.sin(u.walk);
  const cheer = celebrating ? (performance.now() - celebrationEnds + 2300) / 1000 : 0;
  const jump = celebrating ? Math.abs(Math.sin(cheer*7))*.42 : 0;
  const blend = 1 - Math.exp(-15*dt);
  const ease = (value,target) => value + (target-value)*blend;

  if (u.racer) {
    for (const piece of group.children.slice(0,3)) {
      if (piece.userData.restY === undefined) piece.userData.restY = piece.position.y;
      const oxygen = piece === group.children[2];
      piece.position.y = ease(piece.position.y,piece.userData.restY + amount*(jump + gait*(oxygen ? .14 : .048)*(.35+step)));
      const roll = ease(piece.userData.roll || 0, amount * gait * (.035 + step*.09));
      piece.rotation.z += roll - (piece.userData.roll || 0);
      piece.userData.roll = roll;
    }
    return;
  }
  if (!body) return;
  body.position.y = ease(body.position.y, amount * (jump + (step ? Math.abs(gait)*step*.095 : gait*.025)));
  body.rotation.z = ease(body.rotation.z, amount * gait * (.014+step*.045));
  body.rotation.x = ease(body.rotation.x, step*.11*amount);
  if (u.legL && u.legR) {
    u.legL.rotation.x = ease(u.legL.rotation.x, gait*step*.55*amount);
    u.legR.rotation.x = ease(u.legR.rotation.x,-gait*step*.55*amount);
  }
  if (u.armL && u.armR) {
    const swing = gait*step*.42*amount;
    u.armL.rotation.x = ease(u.armL.rotation.x,-swing);
    u.armR.rotation.x = ease(u.armR.rotation.x,swing);
    const pose = celebrating ? -.61 + Math.sin(cheer*10)*.20 : .92 + gait*.045;
    if (u.sharedModel) {
      u.armL.rotation.z = ease(u.armL.rotation.z,pose);
      u.armR.rotation.z = ease(u.armR.rotation.z,-pose*.83);
    } else {
      u.armL.rotation.z = ease(u.armL.rotation.z,celebrating ? -.95 : 0);
      u.armR.rotation.z = ease(u.armR.rotation.z,celebrating ? .95 : 0);
    }
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
    camGoalPos.set(fx, compactLandscape ? 12 : 11, player.z + 13);
    camGoalLook.set(fx, 1.5, player.z - 6);
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
      if (activeMap === 'targets') scanCells();
      if (activeMap === 'race') {
        const bounds = ARENAS.race;
        const percent = Math.max(0, Math.min(100, Math.floor(100*(bounds.start-player.z)/(bounds.start-bounds.end))));
        $('status').textContent = 'Entregue o O₂ · ' + percent + '% do percurso';
      }
      if (activeMap === 'race' && player.z <= ARENAS.race.end) {
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

  const celebrating = state.phase === 'result' && nowMs < celebrationEnds;
  if (player.group?.visible) {
    placePlayer();
    animateCharacter(player.group, dt, moving, celebrating);
  }
  if (raceAvatar.visible) {
    raceAvatar.position.set(player.x, 0, player.z);
    animateCharacter(raceAvatar, dt, moving, celebrating);
  }
  updateCamera(dt);
  updateArena();
  updatePeers(dt);
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
const correctMark = symbolTexture('correto', '#1b8c53');
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
if (THREE.GLTFLoader) {
  loadArena('factory').then(() => { mapReady = true; if(room) handleRoom(room); }).catch(() => {
    $('roomInfo').textContent = 'Não foi possível carregar o linfonodo. Recarregue a página.';
  });
} else showFatal('Não foi possível iniciar o carregador dos mapas.');
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
}, (positions, serverNow, key) => {
  if (key !== activeRound) return;
  const receivedAt = performance.now();
  for (const peer of positions) {
    livePeers.set(peer.key, {...peer, receivedAt, age:Math.max(0,(serverNow-peer.at)/1000)});
  }
});
$('startBtn').addEventListener('click', () => {
  if (!room) return;
  if (room.joined) classroom.send('start');
  else {
    const input = $('playerName');
    if (!input.value.trim()) { input.focus(); return; }
    classroom.send('join', { name: input.value.trim(), char: state.charId });
  }
});
$('againBtn').addEventListener('click', () => {
  classroom.send(room.stage === CONFIG.stages.length - 1 ? 'reset' : 'next');
});
$('confirmTargets').addEventListener('click', confirmTargets);
$('scanCell').addEventListener('click', toggleCell);
window.addEventListener('keydown', event => { if(event.code === 'KeyE' && !event.repeat) toggleCell(); });
classroom.setPositionSource(() => {
  if (!activeRound || !['playing','quiz'].includes(state.phase)) return null;
  return { round:activeRound, x:player.x, z:player.z, facing:player.facing, char:state.charId };
});
requestAnimationFrame(frame);
})();

