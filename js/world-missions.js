'use strict';

function createWorldMission({scene,player,getModel,button,minus,plus,status,stage,roomId,duration,elapsed,symbolTexture,onVisual,onComplete}) {
  const mission=makeMission(stage.id,roomId),objects=[],points=[];
  let carrier=null,signatureSprite=null,shownSignature=-1,guideLine=null,observingAt=null;
  let closed=false,nearest=null,carrying=null,encounter=-1,lastEncounter=-1,readyAt=0;
  const xs=[-8.16,-2.72,2.72,8.16];
  const payload=stage.id==='patrol'?{intercepts:[],escaped:[]}:stage.id==='barriers'?{order:[null,null,null,null]}:stage.id==='vaccine'?{links:[]}:stage.id==='inflammation'?{mode:'samples',samples:[]}: {answers:[]};
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
    [[-4.7,-4.5],[4.7,-4.5],[4.7,4.2],[-4.7,4.2]].forEach(([x,z],i)=>add(x,z,(i+1)+'. '+mission.sources[i],'vaccine',i));
  }else if(stage.id==='inflammation'){
    [[-8,0],[-1,-.5],[6.7,-1.5]].forEach(([x,z],i)=>add(x,z,'Vazamento '+(i+1)+'\nColetar plasma','sample',i));
    add(0,7,'Bancada de análise\nEntregar a amostra','lab',0);
  }else{
    add(0,3.1,'Projetor de vírus\nObservar e reconhecer','recognize',0);
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
      if(p.index!==payload.links.length)return;
      const previous=points.find(point=>point.kind==='vaccine'&&point.index===payload.links.at(-1));
      payload.links.push(p.index);p.ring.material.color.setHex(0x59ddae);
      if(!carrier){carrier=new THREE.Group();carrier.add(new THREE.Mesh(new THREE.SphereGeometry(.28,12,8),new THREE.MeshStandardMaterial({color:0xffcc55,emissive:0x553800})));scene.add(carrier);objects.push(carrier);}
      if(previous){const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(previous.x,.22,previous.z),new THREE.Vector3(p.x,.22,p.z)]);const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x5d7391,transparent:true,opacity:.3}));scene.add(line);objects.push(line);}
      if(payload.links.length===4)carrier.visible=false;
      if(payload.links.length===4)done();
    }else if(p.kind==='sample'&&carrying===null){
      carrying=p.index;
      if(!carrier){carrier=new THREE.Group();carrier.add(new THREE.Mesh(new THREE.SphereGeometry(.24,12,8),new THREE.MeshStandardMaterial({color:0x55ccef,emissive:0x11364c})));const neck=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),new THREE.MeshStandardMaterial({color:0xb8dbe4}));neck.position.y=.27;neck.scale.set(1,1.5,1);carrier.add(neck);const cap=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshStandardMaterial({color:0x254e78}));cap.position.y=.40;cap.scale.set(1,.45,1);carrier.add(cap);scene.add(carrier);objects.push(carrier);}
      carrier.visible=true;
    }else if(p.kind==='lab'&&carrying!==null){
      payload.samples.push(carrying);carrying=null;carrier.visible=false;
      onVisual(mission.reference);
      if(payload.samples.length===3)done();
    }else if(p.kind==='recognize'&&observingAt===null){observingAt=elapsed();}
  }
  function choose(value){
    if(closed||nearest?.kind!=='recognize'||encounter<0||encounter>=6||elapsed()<readyAt||elapsed()>=duration)return;
    payload.answers[encounter]=value;onVisual([encounter,value?1:0,mission.encounters[encounter]]);encounter++;readyAt=elapsed()+1;
    if(encounter===6)done();
  }

  button.onclick=interact;minus.onclick=()=>choose(true);plus.onclick=()=>choose(false);
  function update(){
    if(closed)return;
    const time=elapsed();if(carrier)carrier.position.set(player.x,1.7,player.z+.6);nearest=null;let distance=2.4;
    for(const p of points){
      if(p.kind==='vaccine'){p.group.visible=p.index===payload.links.length;if(!p.group.visible)continue;}
      if(p.kind==='sample'){p.group.visible=carrying===null&&!payload.samples.includes(p.index);if(!p.group.visible)continue;}
      if(p.kind==='lab'){p.group.visible=carrying!==null;if(!p.group.visible)continue;}
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
    const recognizing=stage.id==='memory'&&nearest?.kind==='recognize'&&encounter>=0&&encounter<6;
    minus.classList.toggle('hidden',!recognizing);plus.classList.toggle('hidden',!recognizing);minus.disabled=plus.disabled=!recognizing||time<readyAt;
    minus.textContent='Já vi este vírus';plus.textContent='É um vírus novo';
    button.classList.toggle('hidden',stage.id==='memory'&&observingAt!==null);
    button.disabled=!nearest||(nearest.kind==='slot'&&carrying===null)||(stage.id==='memory'&&observingAt!==null);
    button.textContent=!nearest?'Aproxime-se de um objeto':nearest.kind==='enemy'?'Neutralizar invasor':nearest.kind==='card'?'Carregar acontecimento':nearest.kind==='slot'?'Colocar nesta etapa':nearest.kind==='sample'?'Coletar plasma':nearest.kind==='lab'?'Analisar amostra':nearest.kind==='vaccine'?(payload.links.length===0?'Pegar o sinal da vacina':'Entregar nesta estação'):'Observar vírus por 5 segundos';
    if(stage.id==='patrol')label('Defenda os tecidos: '+payload.intercepts.length+'/9 invasores neutralizados; '+payload.escaped.length+' atingiram o tecido. Vá até o invasor e toque em Neutralizar.');
    if(stage.id==='barriers'){
      label(carrying===null?'Pegue um acontecimento e leve até o nicho da etapa correta.':'Carregando: '+mission.cards[carrying]+'. Caminhe até uma etapa e coloque.');
      const model=getModel();if(model)model.userData.timelineTargets=xs.map((x,card)=>{
        const slot=payload.order.indexOf(card),base=mission.initial.indexOf(card);
        return {card,position:new THREE.Vector3(carrying===card?player.x-x:slot>=0?xs[slot]-x:xs[base]-x,carrying===card?1.2:slot>=0?.86:0,carrying===card?player.z-6.9:slot>=0?-7.32:0)};
      });
    }
    let target=null;
    if(stage.id==='vaccine'){
      target=points.find(p=>p.kind==='vaccine'&&p.index===payload.links.length);
      label(target?'Etapa '+(payload.links.length+1)+'/4: '+(payload.links.length?'Leve o sinal luminoso até ':'Vá buscar o sinal em ')+mission.sources[payload.links.length]+'. Siga a linha verde.':'Percurso concluído.');
    }
    if(stage.id==='inflammation'){
      target=carrying!==null?points.find(p=>p.kind==='lab'):points.filter(p=>p.kind==='sample'&&!payload.samples.includes(p.index)).sort((a,b)=>Math.hypot(player.x-a.x,player.z-a.z)-Math.hypot(player.x-b.x,player.z-b.z))[0];
      label(carrying===null?'Amostras analisadas: '+payload.samples.length+'/3. Vá até um vazamento azul e colete o plasma.':'Você está carregando plasma. Leve o frasco azul à bancada de análise, seguindo a linha verde.');
    }
    if(stage.id==='memory')target=points[0];
    if(target){
      if(!guideLine){guideLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0x50dfb9,transparent:true,opacity:.85,depthTest:false}));scene.add(guideLine);objects.push(guideLine);}
      const attribute=guideLine.geometry.attributes?.position;
      if(attribute){attribute.setXYZ(0,player.x,.18,player.z);attribute.setXYZ(1,target.x,.18,target.z);attribute.needsUpdate=true;guideLine.geometry.computeBoundingSphere();}
      target.ring.scale.set(1+Math.sin(time*4)*.1,1+Math.sin(time*4)*.1,1);
    }
    if(stage.id==='memory'){
      const memorizing=observingAt!==null&&time-observingAt<5;
      if(observingAt!==null&&!memorizing&&encounter<0)encounter=0;
      const signature=encounter<0?mission.signature:mission.encounters[Math.min(5,encounter)];
      const model=getModel();if(model){model.userData.hideMemorySymbols=true;const agent=model.getObjectByName?.('memory_agent');if(agent){agent.visible=observingAt!==null&&time>=readyAt;agent.traverse(part=>{if(part.isMesh)part.material.color.setHex([0xa45adc,0x29a9de,0x2dbe87,0xf09635][signature]);});}}
      if(signature!==shownSignature){
        shownSignature=signature;
        if(!signatureSprite){signatureSprite=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthTest:false}));signatureSprite.position.set(0,4.8,1.7);signatureSprite.scale.set(1.5,1.5,1);scene.add(signatureSprite);objects.push(signatureSprite);}
        signatureSprite.material.map?.dispose();signatureSprite.material.map=symbolTexture(['fragmento viral roxo','fragmento viral azul','fragmento viral verde','fragmento viral laranja'][signature],'#27485b');signatureSprite.material.needsUpdate=true;
      }
      if(signatureSprite)signatureSprite.visible=observingAt!==null&&time>=readyAt;
      if(observingAt===null)label('Vá ao projetor seguindo a linha verde. Toque em Observar vírus para começar.');
      else if(memorizing){onVisual([-1,null,mission.signature]);label('Observe o vírus '+['A (roxo)','B (azul)','C (verde)','D (laranja)'][mission.signature]+'. Memorize sua aparência. Os encontros começam em '+Math.ceil(5-(time-observingAt))+' segundos.');}
      else if(time<readyAt)label('Resposta registrada. Aguarde o próximo vírus no projetor.');
      else{
        if(encounter!==lastEncounter&&encounter<6&&time>=readyAt){lastEncounter=encounter;onVisual([encounter,null,mission.encounters[encounter]]);}
        label('Encontro '+Math.min(6,encounter+1)+'/6: este é o vírus '+['A (roxo)','B (azul)','C (verde)','D (laranja)'][signature]+'. Ele é igual ao primeiro? Toque em Já vi este vírus ou É um vírus novo.');
      }
    }
  }
  if(stage.id==='inflammation')onVisual([25,25,25]);
  update();
  return {update,interact,finish(){closed=true;return JSON.parse(JSON.stringify(payload));},dispose(){closed=true;button.onclick=minus.onclick=plus.onclick=null;for(const group of objects){scene.remove(group);const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});for(const g of geometries)g.dispose();for(const m of materials){m.map?.dispose();m.dispose();}}}};
}
