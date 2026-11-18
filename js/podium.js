/* Cena de premiação independente; reutiliza os GLBs e materiais dos personagens. */
function createPodium(models){
 'use strict';
 const panel=document.getElementById('podium'),canvas=document.getElementById('podiumCanvas');
 let renderer,scene,camera,actors=[],owned=[],frame=0,version=0,key='',last=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function mesh(geometry,color,parent,x=0,y=0,z=0){const material=new THREE.MeshStandardMaterial({color,roughness:.38,metalness:color===0xffcd48?.65:.12});const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);owned.push(geometry,material);return m;}
 function trophy(hand){
  const g=new THREE.Group();hand.add(g);g.position.set(0,-.6,.3);g.scale.setScalar(.7);
  mesh(new THREE.CylinderGeometry(.3,.34,.12,24),0xffcd48,g,0,0,0);
  mesh(new THREE.CylinderGeometry(.07,.1,.38,16),0xffcd48,g,0,.23,0);
  mesh(new THREE.CylinderGeometry(.35,.12,.43,24,1,true),0xffcd48,g,0,.57,0).material.side=THREE.DoubleSide;
  mesh(new THREE.SphereGeometry(.3,20,12,0,Math.PI*2,0,Math.PI/2),0xffcd48,g,0,.78,0);
  for(const sign of [-1,1])mesh(new THREE.TorusGeometry(.22,.045,8,20),0xffcd48,g,sign*.32,.58,0);
  return g;
 }
 function hide(){version++;key='';cancelAnimationFrame(frame);frame=0;panel.classList.add('hidden');actors=[];for(const resource of owned)resource.dispose();owned=[];if(renderer){renderer.dispose();renderer=null;}scene=null;}
 async function show(players){
  const signature=JSON.stringify(players.map(p=>[p.key,p.name,p.char,p.points]));if(signature===key)return;
  hide();key=signature;const ticket=version;panel.classList.remove('hidden');
  const names=document.getElementById('podiumNames');names.replaceChildren();
  players.forEach((p,i)=>{const item=document.createElement('p');item.textContent=(i+1)+'º · '+p.name+' · '+p.points+' pontos';names.append(item);});
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});}catch(e){return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputEncoding=THREE.sRGBEncoding;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.1,60);camera.position.set(0,5.3,13);camera.lookAt(0,2,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x507b88,1.5));const light=new THREE.DirectionalLight(0xffeed0,2);light.position.set(-4,8,8);scene.add(light);
  const slots=[[0,1.6,0xffcd48],[-2.8,.95,0xbad4e6],[2.8,.55,0xd59b74]];
  for(let i=0;i<players.length;i++){
   const [x,h,color]=slots[i];mesh(new THREE.CylinderGeometry(1.35,1.48,h,48),color,scene,x,h/2,0);
   mesh(new THREE.TorusGeometry(1.28,.055,8,48),0xfff5d8,scene,x,h+.02,0).rotation.x=Math.PI/2;
   const labelCanvas=document.createElement('canvas');labelCanvas.width=labelCanvas.height=128;const g=labelCanvas.getContext('2d');g.font='bold 94px Trebuchet MS';g.textAlign='center';g.fillStyle='#263652';g.fillText(String(i+1),64,101);
   const texture=new THREE.CanvasTexture(labelCanvas),material=new THREE.MeshBasicMaterial({map:texture,transparent:true});const geometry=new THREE.PlaneGeometry(.65,.65);const label=new THREE.Mesh(geometry,material);label.position.set(x,h/2,1.4);scene.add(label);owned.push(texture,material,geometry);
  }
  const loaded=await Promise.all(players.map(p=>models.load(p.char||'male',{castShadow:false})));
  if(ticket!==version)return;
  loaded.forEach((model,i)=>{if(!model)return;const [x,h]=slots[i];const root=new THREE.Group();root.position.set(x,h,0);root.add(model);scene.add(root);const parts={};for(const n of ['armL','armR','legL','legR'])parts[n]=model.getObjectByName(n);const cup=i===0?trophy(root):null;actors.push({root,model,h,i,parts,cup});});
  last=performance.now();
  function draw(now){if(ticket!==version)return;const t=(now-last)/1000,amount=reduced.matches?.2:1;
   const w=Math.max(1,panel.clientWidth),h=Math.max(1,canvas.clientHeight);if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=camera.aspect<1?17:13;camera.updateProjectionMatrix();}
   for(const a of actors){const p=a.parts,s=Math.sin(t*5+a.i);a.root.position.y=a.h+(a.i===0?Math.abs(Math.sin(t*4))*.52*amount:.04*(1+s)*amount);a.model.rotation.z=(a.i===0?.025:.12)*s*amount;a.root.rotation.y=a.i===0?.08*s:.25*s*amount;
    if(p.armL)p.armL.rotation.z=a.i===0?-2.55:-.35+s*.45*amount;
    if(p.armR){p.armR.rotation.z=a.i===0?.5:.35+s*.45*amount;p.armR.rotation.x=a.i===0?-.35:s*.5*amount;}
    if(a.cup&&p.armL){a.root.updateMatrixWorld(true);const hand=p.armL.getWorldPosition(new THREE.Vector3());const direction=new THREE.Vector3(0,-.8,0).applyQuaternion(p.armL.getWorldQuaternion(new THREE.Quaternion()));hand.add(direction);a.cup.position.copy(a.root.worldToLocal(hand));}
    if(p.legL)p.legL.rotation.x=a.i===0?0:s*.32*amount;if(p.legR)p.legR.rotation.x=a.i===0?0:-s*.32*amount;
   }
   renderer.render(scene,camera);frame=requestAnimationFrame(draw);
  }frame=requestAnimationFrame(draw);
 }
 document.addEventListener('visibilitychange',()=>{if(renderer)renderer.setAnimationLoop(null);});
 return {show,hide};
}
