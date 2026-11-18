'use strict';

function createWorldMission({scene,player,getModel,button,minus,plus,status,stage,roomId,duration,elapsed,symbolTexture,onVisual,onComplete}) {
  const mission=makeMission(stage.id,roomId),objects=[],points=[];
  let carrier=null,signatureSprite=null,shownSignature=-1;
  let closed=false,nearest=null,carrying=null,encounter=-1,lastEncounter=-1,readyAt=0;
  const xs=[-8.16,-2.72,2.72,8.16];
  const payload=stage.id==='patrol'?{intercepts:[],escaped:[]}:stage.id==='barriers'?{order:[null,null,null,null]}:stage.id==='vaccine'?{links:[]}:stage.id==='inflammation'?{values:[25,25,25],confirmed:[]}: {answers:[]};
  function add(x,z,label,kind,index){
    const group=new THREE.Group();group.position.set(x,0,z);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.75,.055,6,24),new THREE.MeshBasicMaterial({color:0xffd36b}));ring.rotation.x=Math.PI/2;ring.position.y=.14;group.add(ring);
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
    const texture=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.position.y=2.5;sprite.scale.set(4.8,1.5,1);group.add(sprite);scene.add(group);objects.push(group);
    const p={x,z,originZ:z,label,kind,index,group,canvas,texture,ring,sprite};points.push(p);paint(p,label);return p;
  }
  function paint(p,text){const g=p.canvas.getContext('2d');g.clearRect(0,0,512,160);g.fillStyle='#263957';g.beginPath();g.roundRect(4,4,504,152,22);g.fill();g.fillStyle='#fff0cd';g.font='bold 27px Trebuchet MS';g.textAlign='center';String(text).split('\n').flatMap(line=>line.match(/.{1,30}(?:\s|$)|.{1,30}/g)||[line]).slice(0,3).forEach((line,i)=>g.fillText(line.trim(),256,38+i*38,480));p.texture.needsUpdate=true;}
  function label(text){status.textContent=text;}
  function done(){if(closed)return;payload.completedAt=elapsed();onComplete();}
  if(stage.id==='patrol'){
    const regions=[[-8,0],[0,-9],[8,0]];
    for(let i=0;i<9;i++){
      const [x,z]=regions[i%3],p=add(x+(i%2?1:-1),z+2+(Math.floor(i/3)*1.2),'Invasor '+(i+1)+'\nAproxime-se para neutralizar','enemy',i);
      const virus=new THREE.Mesh(new THREE.SphereGeometry(.42,12,8),new THREE.MeshStandardMaterial({color:0x9955cc,roughness:.45}));virus.position.y=.65;p.group.add(virus);
      for(let j=0;j<8;j++){const a=j*Math.PI/4,spike=new THREE.Mesh(new THREE.SphereGeometry(.11,6,4),virus.material);spike.position.set(Math.cos(a)*.53,.65+Math.sin(a)*.53,0);p.group.add(spike);}
    }
  }else if(stage.id==='barriers'){
    mission.initial.forEach((card,i)=>add(xs[i],6.9,mission.cards[card],'card',card));
    xs.forEach((x,i)=>add(x,-.42,'Etapa '+(i+1)+'\nColoque o acontecimento aqui','slot',i));
  }else if(stage.id==='vaccine'){
    [[-4.7,-4.5],[4.7,-4.5],[4.7,4.2],[-4.7,4.2]].forEach(([x,z],i)=>add(x,z,mission.sources[i],'vaccine',i));
  }else if(stage.id==='inflammation'){
    [-7.3,0,7.3].forEach((x,i)=>add(x,7,['Fluxo sanguíneo','Permeabilidade','Mediadores'][i],'control',i));
  }else{
    add(-4.7,7.3,'É o mesmo agente\nSelo de reconhecimento','same',1);add(4.7,7.3,'É outro agente\nComporta de liberação','same',0);
  }
  function interact(){
    if(closed||!nearest||elapsed()>=duration)return;
    const p=nearest;
    if(p.kind==='enemy'){
      if(payload.intercepts.includes(p.index))return;payload.intercepts.push(p.index);p.group.visible=false;
      if(payload.intercepts.length===9)done();
    }else if(p.kind==='card'){
      carrying=p.index;
      payload.order=payload.order.map(card=>card===carrying?null:card);
    }else if(p.kind==='slot' && carrying!==null){
      const old=payload.order[p.index];payload.order[p.index]=carrying;carrying=old;
      if(payload.order.every(n=>n!==null)){update();done();}
    }else if(p.kind==='vaccine'){
      if(payload.links.includes(p.index))return;
      const previous=points.find(point=>point.kind==='vaccine'&&point.index===payload.links.at(-1));
      payload.links.push(p.index);p.ring.material.color.setHex(0x59ddae);
      if(!carrier){carrier=new THREE.Group();carrier.add(new THREE.Mesh(new THREE.SphereGeometry(.28,12,8),new THREE.MeshStandardMaterial({color:0xffcc55,emissive:0x553800})));scene.add(carrier);objects.push(carrier);}
      if(previous){const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(previous.x,.22,previous.z),new THREE.Vector3(p.x,.22,p.z)]);const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x6dffe0}));scene.add(line);objects.push(line);}
      if(payload.links.length===4)carrier.visible=false;
      if(payload.links.length===4)done();
    }else if(p.kind==='control'){
      if(!payload.confirmed.includes(p.index))payload.confirmed.push(p.index);
      if(payload.confirmed.length===3)done();
    }else if(p.kind==='same' && encounter>=0 && elapsed()>=readyAt){
      payload.answers[encounter]=!!p.index;onVisual([encounter,p.index,mission.encounters[encounter]]);encounter++;readyAt=elapsed()+1;
      if(encounter===6)done();
    }
  }
  function change(delta){if(closed||nearest?.kind!=='control')return;const i=nearest.index;payload.values[i]=Math.max(0,Math.min(100,payload.values[i]+delta));payload.confirmed=payload.confirmed.filter(n=>n!==i);onVisual(payload.values);}
  button.onclick=interact;minus.onclick=()=>change(-5);plus.onclick=()=>change(5);
  function update(){
    if(closed)return;
    const time=elapsed();if(carrier)carrier.position.set(player.x,1.7,player.z+.6);nearest=null;let distance=2.4;
    for(const p of points){
      if(p.kind==='enemy'){
        const captured=payload.intercepts.includes(p.index),spawn=Math.floor(p.index/3)*8;
        if(time>spawn+30&&!captured&&!payload.escaped.includes(p.index))payload.escaped.push(p.index);
        p.z=p.originZ-Math.min(1.3,Math.max(0,time-spawn)*.045);p.group.position.z=p.z;
        p.group.visible=!captured&&!payload.escaped.includes(p.index)&&time>=spawn;
        if(payload.intercepts.length+payload.escaped.length===9){done();return;}
        if(!p.group.visible)continue;
      }
      if(p.kind==='card'){
        p.group.visible=carrying!==p.index&&!payload.order.includes(p.index);if(!p.group.visible)continue;
      }
      const d=Math.hypot(player.x-p.x,player.z-p.z);p.sprite.visible=d<6.5;if(d<distance){distance=d;nearest=p;}
      p.ring.material.color.setHex(p.kind==='vaccine'&&payload.links.includes(p.index)?0x59ddae:d<2.4?0x69ffd0:0xffd36b);
    }
    minus.classList.toggle('hidden',nearest?.kind!=='control');plus.classList.toggle('hidden',nearest?.kind!=='control');
    button.disabled=!nearest||(nearest.kind==='slot'&&carrying===null)||(stage.id==='memory'&&(encounter<0||time<readyAt));
    button.textContent=!nearest?'Aproxime-se de um objeto':nearest.kind==='enemy'?'Neutralizar invasor':nearest.kind==='card'?'Carregar acontecimento':nearest.kind==='slot'?'Colocar nesta etapa':nearest.kind==='control'?'Fixar este ajuste':nearest.kind==='vaccine'?'Transportar para esta estação':'Registrar reconhecimento';
    if(stage.id==='patrol')label('Defenda os tecidos: '+payload.intercepts.length+'/9 invasores neutralizados; '+payload.escaped.length+' atingiram o tecido. Vá até o invasor e toque em Neutralizar.');
    if(stage.id==='barriers'){
      label(carrying===null?'Pegue um acontecimento e leve até o nicho da etapa correta.':'Carregando: '+mission.cards[carrying]+'. Caminhe até uma etapa e coloque.');
      const model=getModel();if(model)model.userData.timelineTargets=xs.map((x,card)=>{
        const slot=payload.order.indexOf(card),base=mission.initial.indexOf(card);
        return {card,position:new THREE.Vector3(carrying===card?player.x-x:slot>=0?xs[slot]-x:xs[base]-x,carrying===card?1.2:slot>=0?.86:0,carrying===card?player.z-6.9:slot>=0?-7.32:0)};
      });
    }
    if(stage.id==='vaccine')label('Transporte o sinal da vacina na ordem dos efeitos: '+payload.links.length+'/4 estações visitadas. Cada estação só é registrada uma vez.');
    if(stage.id==='inflammation'){
      label('Caminhe até os três mecanismos. Ajuste com −/+ e fixe cada resultado. '+payload.confirmed.length+'/3 confirmados.');
      points.forEach(p=>paint(p,p.label+'\nReferência: '+mission.reference[p.index]+' | Seu: '+payload.values[p.index]));
    }
    if(nearest&&['card','vaccine','same'].includes(nearest.kind))label(status.textContent+' Próximo: '+nearest.label.replace(/\n/g,' — '));
    if(nearest?.kind==='control')label(nearest.label+': referência '+mission.reference[nearest.index]+', seu ajuste '+payload.values[nearest.index]+'. Use Diminuir/Aumentar e depois Fixar este ajuste.');
    if(stage.id==='memory'){
      const signature=time<5?mission.signature:mission.encounters[Math.max(0,Math.min(5,encounter))];
      if(signature!==shownSignature){
        shownSignature=signature;
        if(!signatureSprite){signatureSprite=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthTest:false}));signatureSprite.position.set(0,4.8,1.7);signatureSprite.scale.set(1.5,1.5,1);scene.add(signatureSprite);objects.push(signatureSprite);}
        signatureSprite.material.map?.dispose();signatureSprite.material.map=symbolTexture(['losango cheio','triângulo cheio','círculo vazado','cruz'][signature],'#27485b');signatureSprite.material.needsUpdate=true;
      }
      if(time<5){onVisual([-1,null,mission.signature]);label('Memorize a assinatura no projetor por 5 segundos. Depois caminhe ao selo para o mesmo agente ou à comporta para outro.');}
      else{
        if(encounter<0)encounter=0;
        if(encounter!==lastEncounter&&encounter<6&&time>=readyAt){lastEncounter=encounter;onVisual([encounter,null,mission.encounters[encounter]]);}
        label('Encontro '+Math.min(6,encounter+1)+'/6. Caminhe até o selo (mesmo agente) ou a comporta (outro agente) e registre.');
      }
    }
  }
  if(stage.id==='inflammation')onVisual(payload.values);
  update();
  return {update,interact,finish(){closed=true;return JSON.parse(JSON.stringify(payload));},dispose(){closed=true;button.onclick=minus.onclick=plus.onclick=null;for(const group of objects){scene.remove(group);const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});for(const g of geometries)g.dispose();for(const m of materials){m.map?.dispose();m.dispose();}}}};
}
