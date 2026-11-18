const { randomUUID } = require('node:crypto');
const { makeTargetPuzzle } = require('../js/targets.js');
const { scoreMission } = require('../js/missions.js');
const config = require('../js/config.js');
const { rankRace, scoreTargets } = require('../js/scoring.js');

const empty = () => ({
  id: randomUUID(), host: null, phase: 'lobby', stage: 0, players: [],
  submissions: {}, startAt: null, closeAt: null
});
const secondsFor=config.stages.map(stage=>stage.id==='factory'?config.roundSeconds:
 (stage.seconds || (stage.id==='race'?config.raceSeconds:config.targetSeconds))+config.quizSeconds);
const fail = (status, message) => Object.assign(new Error(message), { status });
const presenceTimeoutMs = 15000;
const heartbeatWriteMs = 4000;
const online = player => player.online !== false;

function maintainPresence(room, now) {
  let changed=false;
  for(const player of room.players) {
    if(online(player) && (!Number.isFinite(player.lastSeen) || now-player.lastSeen>=presenceTimeoutMs)) {
      player.online=false;changed=true;
    }
  }
  const present=room.players.filter(online);
  if(!present.length && (room.players.length || room.phase!=='lobby' || room.stage!==0))return {room:empty(),changed:true};
  if(room.host && !present.some(player=>player.id===room.host)) {
    room.host=present[0]?.id??null;changed=true;
  }
  return {room,changed};
}

function launch(room, now) {
  room.phase = 'playing';
  room.submissions = {};
  room.quizStarts = {};
  room.questionAt = null;
  delete room.positions;
  room.startAt = now + config.introSeconds * 1000;
  room.closeAt = room.startAt + secondsFor[room.stage] * 1000 + 6000;
}

function startQuestions(room,now) {
  if(room.phase!=='playing'||room.questionAt||now<room.startAt)return false;
  const stage=config.stages[room.stage];if(stage.id==='factory')return false;
  const duration=stage.seconds||(stage.id==='race'?config.raceSeconds:config.targetSeconds);
  const ready=room.players.filter(online).every(p=>room.quizStarts?.[p.id]);
  if(!ready&&now<room.startAt+duration*1000)return false;
  room.questionAt=now;room.closeAt=now+config.quizSeconds*1000+6000;return true;
}

function settle(room, now) {
  if (room.phase !== 'playing' || (now < room.closeAt && room.players.some(p => online(p) && !room.submissions[p.id]))) return false;
  const results = room.players.map(player => room.submissions[player.id] || {
    answer: null, raceMs: null, place: null, practical: 0, quiz: 0,
    ...(config.stages[room.stage].id === 'targets' ? {inspection:{hits:0,errors:0,missed:makeTargetPuzzle(room.id).infected.size}} : {})
  });
  if (config.stages[room.stage].id === 'race') rankRace(results, config.racePlaces);
  room.players.forEach((player, i) => player.results.push(results[i]));
  room.phase = 'results';
  return true;
}

function register(room, id, name, now) {
  if (room.players.some(p => p.id === id && online(p)) || room.phase !== 'lobby') return false;
  if (typeof name !== 'string' || !name.trim()) throw fail(400, 'Digite seu nome.');
  if (room.players.filter(online).length >= 40) throw fail(409, 'A sala atingiu o limite de 40 jogadores.');
  room.host ||= id;
  const player={id,name:name.trim().slice(0,24),results:[],online:true,lastSeen:now,connection:randomUUID()};
  const available=room.players.findIndex(p=>!online(p));
  if(available<0)room.players.push(player);
  else room.players[available]=player;
  return true;
}

function beginQuiz(room,id,body,now) {
  if(room.phase!=='playing'||body.stage!==room.stage||now<room.startAt||now>=room.closeAt||!room.players.some(p=>p.id===id&&online(p)))return false;
  room.quizStarts||={};if(room.quizStarts[id])return false;
  const stage=config.stages[room.stage],duration=stage.seconds||(stage.id==='targets'?config.targetSeconds:0);
  const m=body.mission||{},marks=Array.isArray(body.marks)?[...new Set(body.marks.filter(n=>Number.isInteger(n)&&n>=0&&n<20))]:[];
  const complete=stage.id==='targets'?marks.length===makeTargetPuzzle(room.id).infected.size:
    stage.id==='patrol'?new Set([...(Array.isArray(m.intercepts)?m.intercepts:[]),...(Array.isArray(m.escaped)?m.escaped:[])].filter(n=>Number.isInteger(n)&&n>=0&&n<9)).size===9:
    stage.id==='barriers'?Array.isArray(m.order)&&new Set(m.order).size===4&&m.order.every(n=>Number.isInteger(n)&&n>=0&&n<4):
    stage.id==='vaccine'?Array.isArray(m.links)&&new Set(m.links).size===4&&m.links.every(n=>Number.isInteger(n)&&n>=0&&n<4):
    stage.id==='inflammation'?(m.mode==='samples'?Array.isArray(m.samples)&&[0,1,2].every(n=>m.samples.includes(n)):Array.isArray(m.confirmed)&&[0,1,2].every(n=>m.confirmed.includes(n))):
    stage.id==='memory'?Array.isArray(m.answers)&&m.answers.length===6&&m.answers.every(n=>typeof n==='boolean'):false;
  if(duration&&now<room.startAt+duration*1000&&!complete)throw fail(409,'Conclua os objetivos do mapa antes da pergunta.');
  room.quizStarts[id]={at:now,marks,mission:m};return true;
}

function submit(room, id, body, now) {
  if (room.phase !== 'playing' || body.stage !== room.stage || now < room.startAt || now >= room.closeAt) return false;
  if (!room.players.some(p => p.id === id && online(p)) || room.submissions[id]) return false;
  const stage = config.stages[room.stage];
  const activitySeconds = stage.seconds || (stage.id==='targets'?config.targetSeconds:0);
  const record=room.quizStarts?.[id];
  if(record)body={...body,marks:record.marks,mission:record.mission};
  if (!record && activitySeconds && now < room.startAt + activitySeconds * 1000) {
    throw fail(409, 'Aguarde o fim da atividade prática para responder.');
  }
  const answer = ['A','B','C','D','E'].includes(body.answer) ? body.answer : null;
  if(stage.id!=='factory'&&!room.questionAt)throw fail(409,'Aguarde a turma concluir a atividade.');
  const quizAt=room.questionAt??record?.at??room.startAt+activitySeconds*1000;
  const withinQuiz = stage.id==='factory' || now < quizAt+config.quizSeconds*1000;
  const correct = withinQuiz && answer === stage.correct;
  const result = { answer:withinQuiz ? answer : null, raceMs: null, place: null, practical: 0, quiz: correct ? Math.round(config.quizPoints*(.35+.65*Math.max(0,Math.min(1,1-(now-quizAt)/(config.quizSeconds*1000))))) : 0 };
  if (stage.id === 'factory') {
    const remaining = Number.isFinite(body.selectedAt) ? Math.min(config.roundSeconds, Math.max(0, body.selectedAt)) : 0;
    result.quiz = correct ? Math.round(config.minPoints + (config.maxPoints - config.minPoints) * remaining / config.roundSeconds) : 0;
  }
  if (stage.id === 'race' && Number.isInteger(body.raceMs) && body.raceMs >= 1 && body.raceMs <= config.raceSeconds * 1000) {
    result.raceMs = body.raceMs;
  }
  if (stage.id === 'targets') {
    const marks = Array.isArray(body.marks) ? body.marks.slice(0, 20).filter(n => Number.isInteger(n) && n >= 0 && n < 20) : [];
    const marked = new Set(marks);
    const infected = makeTargetPuzzle(room.id).infected;
    if (marked.size > infected.size) throw fail(400, 'Há mais marcações que o limite de alvos da inspeção.');
    const hits = [...marked].filter(index => infected.has(index)).length;
    result.inspection = { hits, errors:marked.size-hits, missed:infected.size-hits };
    result.practical = scoreTargets(marked, infected, config.practicalPoints);
  }
  if(stage.seconds){
    const mission=scoreMission(stage.id,room.id,body.mission,config.practicalPoints);
    result.practical=mission.points;
    result.missionDetail=mission.detail;
  }
  if(stage.id!=='factory'&&record){
    const duration=stage.seconds||(stage.id==='targets'?config.targetSeconds:config.raceSeconds);
    const remaining=Math.max(0,1-(record.at-room.startAt)/(duration*1000));
    if(stage.id!=='race')result.practical=Math.round(result.practical*(.65+.35*remaining));
  }
  room.submissions[id] = result;
  return true;
}

function apply(room, id, body, now) {
  const maintenance=maintainPresence(room,now);
  room=maintenance.room;
  let changed=maintenance.changed;
  const member=room.players.find(player=>player.id===id && online(player));
  if(member && body.present===true && now-member.lastSeen>=heartbeatWriteMs) {
    member.lastSeen=now;changed=true;
  }
  if(body.action==='leave') {
    if(body.room===room.id && member){member.online=false;changed=true;}
    const after=maintainPresence(room,now);room=after.room;changed=after.changed||changed;
    changed=startQuestions(room,now)||changed;
    changed=settle(room,now)||changed;
    return {room,changed};
  }
  changed=startQuestions(room,now)||changed;
  changed=settle(room,now)||changed;
  if (body.action === 'read') return { room, changed };
  if (body.room !== room.id) throw fail(409, 'A sala mudou. Aguarde a atualização.');
  if(body.action==='quiz')changed=beginQuiz(room,id,body,now)||changed;
  else if (body.action === 'join') changed = register(room, id, body.name, now) || changed;
  else if (body.action === 'submit') changed = submit(room, id, body, now) || changed;
  else {
    if (id !== room.host) throw fail(403, 'Apenas quem abriu a sala controla as provas.');
    if (body.action === 'start' && room.phase === 'lobby') {
      launch(room, now);
      changed = true;
    } else if (body.action === 'next' && room.phase === 'results' && room.stage === body.stage && room.stage < config.stages.length - 1) {
      room.stage++;
      launch(room, now);
      changed = true;
    } else if (body.action === 'reset' && room.phase === 'results') {
      const present=room.players.filter(online);
      room = empty();
      for(const player of present.sort((a,b)=>Number(b.id===id)-Number(a.id===id)))register(room,player.id,player.name,now);
      changed = true;
    }
  }
  changed=startQuestions(room,now)||changed;
  changed = settle(room, now) || changed;
  return { room, changed };
}

function snapshot(room, id) {
  return {
    id: room.id, phase: room.phase, stage: room.stage, startAt: room.startAt, closeAt: room.closeAt,
    host: room.host === id, joined: room.players.some(p => p.id === id && online(p)),
    submitted: !!room.submissions[id], received: room.players.filter(p=>online(p)&&room.submissions[p.id]).length,
    questionAt:room.questionAt??null, practicalReady:room.players.filter(p=>online(p)&&room.quizStarts?.[p.id]).length,
    now: Date.now(),
    players: room.players.map((p,index)=>online(p)?{key:index,name:p.name,me:p.id===id,results:p.results,connection:p.connection}:null).filter(Boolean)
  };
}

module.exports = { empty, apply, snapshot, presenceTimeoutMs };

