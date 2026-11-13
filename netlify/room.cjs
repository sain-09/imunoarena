const { randomUUID } = require('node:crypto');
const { makeTargetPuzzle } = require('../js/targets.js');
const config = require('../js/config.js');
const { rankRace, scoreTargets } = require('../js/scoring.js');

const empty = () => ({
  id: randomUUID(), host: null, phase: 'lobby', stage: 0, players: [],
  submissions: {}, startAt: null, closeAt: null
});
const secondsFor = [config.roundSeconds, config.raceSeconds + config.quizSeconds, config.targetSeconds + config.quizSeconds];
const fail = (status, message) => Object.assign(new Error(message), { status });

function launch(room, now) {
  room.phase = 'playing';
  room.submissions = {};
  room.positions = {};
  room.startAt = now + config.introSeconds * 1000;
  room.closeAt = room.startAt + secondsFor[room.stage] * 1000 + 6000;
}

function settle(room, now) {
  if (room.phase !== 'playing' || (now < room.closeAt && room.players.some(p => !room.submissions[p.id]))) return false;
  const results = room.players.map(player => room.submissions[player.id] || {
    answer: null, raceMs: null, place: null, practical: 0, quiz: 0
  });
  if (config.stages[room.stage].id === 'race') rankRace(results, config.racePlaces);
  room.players.forEach((player, i) => player.results.push(results[i]));
  room.phase = 'results';
  return true;
}

function register(room, id, name) {
  if (room.players.some(p => p.id === id) || room.phase !== 'lobby') return false;
  if (typeof name !== 'string' || !name.trim()) throw fail(400, 'Digite seu nome.');
  if (room.players.length >= 40) throw fail(409, 'A sala atingiu o limite de 40 jogadores.');
  room.host ||= id;
  room.players.push({ id, name: name.trim().slice(0, 24), results: [] });
  return true;
}

function submit(room, id, body, now) {
  if (room.phase !== 'playing' || body.stage !== room.stage || now < room.startAt || now >= room.closeAt) return false;
  if (!room.players.some(p => p.id === id) || room.submissions[id]) return false;
  const stage = config.stages[room.stage];
  const answer = ['A','B','C','D','E'].includes(body.answer) ? body.answer : null;
  const correct = answer === stage.correct;
  const result = { answer, raceMs: null, place: null, practical: 0, quiz: correct ? config.quizPoints : 0 };
  if (stage.id === 'factory') {
    const remaining = Number.isFinite(body.selectedAt) ? Math.min(config.roundSeconds, Math.max(0, body.selectedAt)) : 0;
    result.quiz = correct ? Math.round(config.minPoints + (config.maxPoints - config.minPoints) * remaining / config.roundSeconds) : 0;
  }
  if (stage.id === 'race' && Number.isInteger(body.raceMs) && body.raceMs >= 1 && body.raceMs <= config.raceSeconds * 1000) {
    result.raceMs = body.raceMs;
  }
  if (stage.id === 'targets') {
    const marks = Array.isArray(body.marks) ? body.marks.slice(0, 20).filter(n => Number.isInteger(n) && n >= 0 && n < 20) : [];
    result.practical = scoreTargets(new Set(marks), makeTargetPuzzle(room.id).infected, config.practicalPoints);
  }
  room.submissions[id] = result;
  return true;
}

function updatePosition(room,id,body,now) {
  if (room.phase !== 'playing' || room.stage !== body.stage ||
      now < room.startAt || room.submissions[id] || !room.players.some(p => p.id === id)) return false;
  if (![body.x,body.z,body.facing].every(Number.isFinite)) return false;
  if (Math.abs(body.x)>14 || body.z< -95 || body.z>27 || Math.abs(body.facing)>100) return false;
  room.positions ??= {};
  room.positions[id] = {
    x: Math.round(body.x*100)/100, z: Math.round(body.z*100)/100,
    facing: body.facing, char: body.char === 'female' ? 'female' : 'male', seenAt: now
  };
  return true;
}

function apply(room, id, body, now) {
  let changed = settle(room, now);
  if (body.action === 'read') return { room, changed };
  if (body.room !== room.id) throw fail(409, 'A sala mudou. Aguarde a atualização.');
  if (body.action === 'join') changed = register(room, id, body.name) || changed;
  else if (body.action === 'position') changed = updatePosition(room,id,body,now) || changed;
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
    } else if (body.action === 'reset' && room.phase === 'results' && room.stage === config.stages.length - 1) {
      const host = room.players.find(p => p.id === id);
      room = empty();
      register(room, id, host.name);
      changed = true;
    }
  }
  changed = settle(room, now) || changed;
  return { room, changed };
}

function snapshot(room, id) {
  return {
    id: room.id, phase: room.phase, stage: room.stage, startAt: room.startAt, closeAt: room.closeAt,
    host: room.host === id, joined: room.players.some(p => p.id === id),
    submitted: !!room.submissions[id], received: Object.keys(room.submissions).length,
    now: Date.now(),
    positions: room.phase === 'playing' ? room.players.flatMap((p,key) => {
      const position = room.positions?.[p.id];
      if(p.id === id || room.submissions[p.id] || !position || Date.now()-position.seenAt > 9500) return [];
      return [{key,name:p.name,x:position.x,z:position.z,facing:position.facing,char:position.char}];
    }) : [],
    players: room.players.map((p, index) => ({ key: index, name: p.name, me: p.id === id, results: p.results }))
  };
}

module.exports = { empty, apply, snapshot };

