'use strict';

function makeMission(id, roomId) {
  let seed = 2166136261;
  for (const c of roomId + id) seed = Math.imul(seed ^ c.charCodeAt(0),16777619);
  const random = max => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return Math.floor(seed/4294967296*max); };
  const shuffle = items => {
    for(let i=items.length-1;i>0;i--){const j=random(i+1);[items[i],items[j]]=[items[j],items[i]];}
    return items;
  };
  if(id === 'patrol') return { waves:Array.from({length:5},()=>shuffle([1+random(2),1+random(2),random(2)])) };
  if(id === 'barriers') return {
    cards:['Pele íntegra impede a entrada','Um corte abre passagem','Defesa inata reconhece e recruta células','Resposta adaptativa específica se desenvolve'],
    initial:shuffle([0,1,2,3])
  };
  if(id === 'vaccine') return {
    sources:['Antígeno da vacina','Reconhecimento e ativação','Expansão de células específicas','Persistência de células de memória'],
    destinations:['Reconhecimento e ativação','Expansão de células específicas','Persistência de células de memória','Resposta mais rápida no reencontro'],
    choices:shuffle([0,1,2,3])
  };
  if(id === 'inflammation') return { reference:[65+random(4)*5,60+random(5)*5,55+random(5)*5] };
  if(id === 'memory') {
    const signature=random(4);
    const encounters=shuffle([signature,signature,signature,...Array.from({length:3},()=> (signature+1+random(3))%4)]);
    return {signature,encounters};
  }
  return null;
}

function scoreMission(id, roomId, payload, maxPoints = 700) {
  const mission=makeMission(id,roomId);
  const data=payload && typeof payload==='object' ? payload : {};
  let fraction=0;
  let detail='';
  if(id==='patrol'){
    let contained=0,total=0,possible=0;
    mission.waves.forEach((wave,i)=>{
      const allocation=Array.isArray(data.waves?.[i]) ? data.waves[i] : [];
      const valid=allocation.length===3 && allocation.every(n=>Number.isInteger(n)&&n>=0&&n<=3) && allocation.reduce((a,b)=>a+b,0)<=3;
      const count=wave.reduce((a,b)=>a+b,0);
      total+=count;possible+=Math.min(3,count);
      if(valid) contained+=wave.reduce((sum,n,j)=>sum+Math.min(n,allocation[j]),0);
    });
    fraction=contained/possible; detail=contained+'/'+total+' invasores contidos';
  }else if(id==='barriers'){
    const order=Array.isArray(data.order) ? data.order : [];
    const valid=order.length===4 && new Set(order).size===4 && order.every(n=>Number.isInteger(n)&&n>=0&&n<4);
    const count=valid ? order.filter((n,i)=>n===i).length : 0;
    fraction=count/4;detail=count+'/4 acontecimentos ordenados';
  }else if(id==='vaccine'){
    const links=Array.isArray(data.links) ? data.links : [];
    const count=mission.sources.filter((_,i)=>links[i]===i).length;
    fraction=count/4;detail=count+'/4 ligações corretas';
  }else if(id==='inflammation'){
    const values=Array.isArray(data.values) ? data.values : [];
    fraction=mission.reference.reduce((sum,value,i)=>{
      const current=values[i];
      return sum+(Number.isFinite(current)&&current>=0&&current<=100 ? Math.max(0,1-Math.abs(current-value)/50) : 0);
    },0)/3;
    detail='Fidelidade ao padrão de referência: '+Math.round(fraction*100)+'%';
  }else if(id==='memory'){
    const answers=Array.isArray(data.answers)?data.answers:[];
    const count=mission.encounters.filter((value,i)=>answers[i]===(value===mission.signature)).length;
    fraction=count/6;detail=count+'/6 reencontros reconhecidos';
  }
  return {points:Math.round(Math.max(0,Math.min(1,fraction))*maxPoints),detail};
}

if(typeof module!=='undefined')module.exports={makeMission,scoreMission};
