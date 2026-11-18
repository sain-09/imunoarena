const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const stageNodes={barriers:['specimen_0','specimen_1','specimen_2','specimen_3'],inflammation:['flow_wheel','junction_lever','mediator_dial'],memory:['memory_agent','memory_seal','memory_gate',...Array.from({length:4},(_,i)=>'memory_symbol_'+i)],race:Array.from({length:5},(_,i)=>'gate_'+i)};
for(const filename of fs.readdirSync(path.join(root,'models')).filter(name=>name.endsWith('.glb'))){
 const raw=fs.readFileSync(path.join(root,'models',filename));assert.equal(raw.toString('ascii',0,4),'glTF');assert.equal(raw.readUInt32LE(8),raw.length);
 const size=raw.readUInt32LE(12),doc=JSON.parse(raw.toString('utf8',20,20+size)),start=28+size;
 const character=filename.startsWith('enfermeir');let triangles=0;
 for(const mesh of doc.meshes)for(const p of mesh.primitives){
  const a=p.attributes,pos=doc.accessors[a.POSITION];assert.equal(doc.accessors[a.NORMAL].count,pos.count);assert.equal(doc.accessors[a.TEXCOORD_0].count,pos.count);
  triangles+=doc.accessors[p.indices].count/3;
  for(const index of [a.POSITION,a.NORMAL,a.TEXCOORD_0,p.indices]){
   const accessor=doc.accessors[index],view=doc.bufferViews[accessor.bufferView],offset=start+(view.byteOffset||0)+(accessor.byteOffset||0);
   const dimensions={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[accessor.type],count=accessor.count*dimensions;
   const bytes={5126:4,5125:4,5123:2}[accessor.componentType];assert.ok(offset+count*bytes<=raw.length);
   for(let i=0;i<count;i++){
    if(accessor.componentType===5126)assert.ok(Number.isFinite(raw.readFloatLE(offset+i*4)));
    else assert.ok((accessor.componentType===5123?raw.readUInt16LE(offset+i*2):raw.readUInt32LE(offset+i*4))<pos.count);
   }
  }
 }
 assert.ok(triangles<=(character?20000:180000),filename+' excedeu o orçamento de geometria');
 assert.ok(raw.length<6*1048576,filename+' excedeu o orçamento de download');
 for(const image of doc.images){const view=doc.bufferViews[image.bufferView];assert.equal(raw.toString('ascii',start+view.byteOffset+1,start+view.byteOffset+4),'PNG');}
 const required=character?['armL','armR','legL','legR']:stageNodes[filename.replace('.glb','')]||[];
 for(const name of required)assert.ok(doc.nodes.some(node=>node.name===name),'Pivô ausente: '+name);
 if(character)assert.equal(doc.meshes.length,5,'Cada personagem deve usar cinco malhas sem perder os pivôs.');
}
const create=vm.runInNewContext(fs.readFileSync(path.join(root,'js/asset-cache.js'),'utf8')+'\ncreateArenaCache');
(async()=>{
 const models={},released=[],counts=new Map();let active='factory';
 const cache=create({models,active:()=>active,limit:2,load:async id=>{counts.set(id,(counts.get(id)||0)+1);if(id==='failure'&&counts.get(id)===1)throw new Error('simulated');return {id};},attach(){},release:model=>released.push(model.id)});
 const first=cache.get('factory');assert.equal(cache.get('factory'),first);await first;
 await cache.get('race');await cache.get('targets');assert.equal(models.factory.id,'factory');assert.ok(!models.race);assert.deepEqual(released,['race']);
 active='race';await cache.get('race');assert.equal(counts.get('race'),2);assert.ok(models.race);assert.equal(Object.keys(models).length,2);
 await assert.rejects(cache.get('failure'));await cache.get('failure');assert.equal(counts.get('failure'),2);assert.equal(Object.keys(models).length,2);assert.ok(models.race);
 const raceModels={},finish=new Map(),freed=[];let selected='memory';
 const loading=create({models:raceModels,active:()=>selected,limit:2,load:id=>new Promise(resolve=>finish.set(id,resolve)),attach(){},release:model=>freed.push(model.id)});
 const arrivals=['factory','race','memory'].map(id=>loading.get(id));await Promise.resolve();
 finish.get('memory')({id:'memory'});await arrivals[2];finish.get('race')({id:'race'});await arrivals[1];finish.get('factory')({id:'factory'});await arrivals[0];
 assert.ok(raceModels.memory);assert.equal(Object.keys(raceModels).length,2);assert.equal(freed.length,1);
 class Group {
  constructor(mesh=false){this.isMesh=mesh;this.children=[];this.position={y:0};this.scale={multiplyScalar(){}};this.geometry={};this.material={};}
  add(node){this.children.push(node);}
  traverse(fn){fn(this);this.children.forEach(child=>child.traverse(fn));}
  clone(){const g=new Group(this.isMesh);g.geometry=this.geometry;g.material=this.material;g.castShadow=this.castShadow;g.children=this.children.map(child=>child.clone());return g;}
 }
 let loads=0;
 const fakeThree={Group,Box3:class{constructor(){this.min={y:0};this.max={y:2};}setFromObject(){return this;}},GLTFLoader:class{load(url,done){loads++;const g=new Group;g.add(new Group(true));done({scene:g});}}};
 const createCharacters=vm.runInNewContext(fs.readFileSync(path.join(root,'js/characters.js'),'utf8')+'\ncreateCharacterModels');
 const characters=createCharacters(fakeThree,{male:'male.glb'}),local=await characters.load('male'),remote=await characters.load('male',{castShadow:false});
 let localMesh,remoteMesh;local.traverse(n=>{if(n.isMesh)localMesh=n;});remote.traverse(n=>{if(n.isMesh)remoteMesh=n;});
 assert.equal(loads,1);assert.equal(localMesh.geometry,remoteMesh.geometry);assert.equal(localMesh.material,remoteMesh.material);assert.equal(localMesh.castShadow,true);assert.equal(remoteMesh.castShadow,false);
 const game=fs.readFileSync(path.join(root,'js/game.js'),'utf8');
 const dispose=vm.runInNewContext(game.slice(game.indexOf('function disposeGroup('),game.indexOf('const state ='))+'\ndisposeGroup');
 let geometries=0,materials=0,textures=0,images=0;
 const geometry={dispose(){geometries++;}},image={close(){images++;}},texture={isTexture:true,image,dispose(){textures++;}},material={map:texture,normalMap:texture,dispose(){materials++;}};
 dispose({traverse(fn){fn({geometry,material:[material]});fn({geometry,material});}},true);
 assert.deepEqual([geometries,materials,textures,images],[1,1,1,1]);
 console.log('Dez GLBs, orçamentos de geometria, texturas, pivôs, cache de dois mapas, recarga e liberação de recursos verificados.');
})().catch(error=>{console.error(error);process.exitCode=1;});
