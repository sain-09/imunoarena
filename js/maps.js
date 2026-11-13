'use strict';

const FACTORY_DIVIDERS = [
  { x: -5.8, z: 4, w: 5.3, d: 2 },
  { x: 5.8, z: 4, w: 5.3, d: 2 },
  { x: 0, z: -2, w: 5.7, d: 2.1 }
];
const VESSEL_WALLS = [
  { x: -4.4, z: 7, w: 10.5, d: 1.2 },
  { x: 4.5, z: 1, w: 10.5, d: 1.2 },
  { x: -4.4, z: -5, w: 10.5, d: 1.2 }
];
const VESSEL_GATES = [
  { x: 5.7, z: 7, w: 1.6, d: 1.35, travel: 2.3, phase: 0 },
  { x: -5.9, z: 1, w: 1.6, d: 1.35, travel: 2.3, phase: 2 },
  { x: 5.7, z: -5, w: 1.6, d: 1.35, travel: 2.3, phase: 4 }
];

function vesselGateX(gate, time) {
  return gate.x + gate.travel * Math.sin(time * 1.8 + gate.phase);
}

function hitsObstacle(x, z, obstacle, center = obstacle.x) {
  return Math.abs(x - center) < obstacle.w / 2 + .36 &&
    Math.abs(z - obstacle.z) < obstacle.d / 2 + .36;
}

function makeOrganWorld(THREE, canvasTexture) {
  const scenes = {};
  const movers = [];
  const materials = new Map();
  const ball = new THREE.SphereGeometry(1, 20, 14);
  const disc = new THREE.TorusGeometry(.70, .31, 10, 24);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const tile = new THREE.CylinderGeometry(1, 1, 1, 6);
  const tube = new THREE.CylinderGeometry(1, 1, 1, 16);
  const up = new THREE.Vector3(0, 1, 0);
  const palettes = {
    factory: { bg: 0x24183f, fog: 0x453269, base: 0x4a316e, tile: ['#533a7f','#61488f','#6d529a'], seams: '#382352', light: 0x76f8e0 },
    race: { bg: 0x410c29, fog: 0x84264e, base: 0x7c2145, tile: ['#bb476b','#a73961','#972e57'], seams: '#772344', light: 0xffa380 },
    targets: { bg: 0x112e48, fog: 0x22516b, base: 0x20526b, tile: ['#2c6782','#30758b','#38839a'], seams: '#214b69', light: 0x7eefff }
  };
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({
      color, roughness: .52, metalness: .05
    }));
    return materials.get(color);
  }
  function mesh(group, geometry, color, x, y, z, w, h, d) {
    const m = new THREE.Mesh(geometry, material(color));
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    group.add(m);
    return m;
  }
  function link(group, a, b, radius, color) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const middle = start.clone().lerp(end, .5);
    const direction = end.sub(start);
    const m = mesh(group, tube, color, ...middle.toArray(), radius, direction.length(), radius);
    m.quaternion.setFromUnitVectors(up, direction.normalize());
  }
  function sign(group, title, subtitle, x, y, z, color, width = 6) {
    const map = canvasTexture(512, (ctx, s) => {
      ctx.fillStyle = '#130f29';
      ctx.fillRect(10, 151, s - 20, 201);
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.strokeRect(14, 155, s - 28, 193);
      ctx.fillStyle = '#fff5ff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText(title, 256, 235, 440);
      ctx.fillStyle = color;
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(subtitle, 256, 293, 440);
    });
    map.encoding = THREE.sRGBEncoding;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true }));
    label.position.set(x, y, z);
    label.scale.set(width, width, 1);
    group.add(label);
  }
  function antibody(group, x, y, z, size, color) {
    const point = (a,b) => [x + a * size, y + b * size, z];
    link(group, point(0,-.7), point(0,0), size * .12, color);
    for (const direction of [-1,1]) {
      link(group, point(0,0), point(direction*.48,.55), size*.12,color);
      mesh(group, ball, 0xffffff, ...point(direction*.48,.55), size*.14,size*.14,size*.14);
    }
  }
  function cell(group, x, y, z, size, color, nucleus) {
    const body = mesh(group, ball, color, x,y,z,size,size*.83,size);
    mesh(group, ball, nucleus, x+size*.17,y+size*.25,z+size*.70,size*.48,size*.35,size*.31);
    for (let j = 0; j < 5; j++) {
      const a = j * 2.4;
      mesh(group, ball, nucleus, x + size*.61*Math.cos(a), y+size*.61*Math.sin(a),z+size*.67,size*.10,size*.10,size*.09);
    }
    return body;
  }
  function floor(group, palette) {
    const map = canvasTexture(512, (ctx, s) => {
      ctx.fillStyle = palette.seams;
      ctx.fillRect(0,0,s,s);
      for (let r=0;r<9;r++) for (let c=-1;c<9;c++) {
        const x = c*64+(r%2)*32, y = r*64;
        ctx.fillStyle = palette.tile[((r*7+c+3)%3+3)%3];
        ctx.beginPath();
        ctx.moveTo(x+9,y+4); ctx.lineTo(x+53,y+4); ctx.lineTo(x+62,y+16);
        ctx.lineTo(x+62,y+52); ctx.lineTo(x+51,y+60); ctx.lineTo(x+10,y+60);
        ctx.lineTo(x+2,y+50); ctx.lineTo(x+2,y+17); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff16'; ctx.fillRect(x+15,y+9,34,3);
      }
    });
    map.encoding = THREE.sRGBEncoding;
    const surface = new THREE.Mesh(new THREE.PlaneGeometry(21.5,30), new THREE.MeshStandardMaterial({ map, roughness: .83 }));
    surface.rotation.x = -Math.PI/2;
    surface.receiveShadow = true;
    group.add(surface);
    mesh(group,cube,palette.base,0,-.63,0,22,1.2,30.5);
    for (const side of [-1,1]) {
      mesh(group,cube,palette.base,side*10.6,.45,0,.55,.9,30);
      mesh(group,cube,palette.light,side*10.6,.94,0,.22,.10,29.7);
      for (let i=0;i<10;i++) {
        const z=13-i*3;
        mesh(group,tile,palette.light,side*10.6,.95,z,.36,.19,.36);
        const k = side*(12.1+(i%3)*.95);
        cell(group,k, .35+(i%4)*.72,z, .74+(i%3)*.38,palette.base,palette.light);
      }
    }
    for(let i=0;i<11;i++) {
      const x=(i-5)*3.5;
      const p=mesh(group,ball,palette.light,x,2+(i%3)*1.65,-18-(i%2)*2,.27,.27,.27);
      movers.push({ group, mesh:p, y:p.position.y, phase:i, drift:.32 });
    }
  }
  function buildFactory(group) {
    sign(group,'LINFONODO','ESTAÇÕES CELULARES',0,8.7,-13.5,'#78ffe0',8);
    const labels = ['HEMÁCIA','LINFÓCITO B','PLAQUETA','NEUTRÓFILO','LINFÓCITO T'];
    const colors = [0xfe646c,0xffbb62,0x71cafa,0xbb8afa,0x73e1aa];
    labels.forEach((name,i) => {
      const x = -8+i*4;
      sign(group,name,String.fromCharCode(65+i),x,6.9,-11.2,'#bafde8',3.15);
      cell(group,x,2.05,-11.9,.68,colors[i],0xf9dbea);
    });
    FACTORY_DIVIDERS.forEach(({x,z,w,d},i) => {
      mesh(group,cube,0x37234e,x,.43,z,w,.86,d);
      mesh(group,cube,0x8e62c6,x,.9,z,w,.16,d);
      mesh(group,cube,0x78f3df,x,.997,z,w-.3,.05,.12);
      for (let j=-1;j<=1;j++) {
        const p=mesh(group,ball,0xb67cf4,x+j*w/4,1.22,z,.30,.30,.30);
        movers.push({group,mesh:p,y:1.22,phase:j+i,drift:.16});
      }
    });
    for (const side of [-1,1]) for(let j=0;j<4;j++) {
      const x=side*(11.6+j%2),z=7-j*4.4;
      antibody(group,x,2.2+j%2,z,.66,0x6df5e6);
    }
  }
  function redCell(group,x,y,z,size,color) {
    const rim=mesh(group,disc,color,x,y,z,size,size,size*.72);
    rim.rotation.x=-Math.PI/2;
    mesh(group,ball,0x9f2448,x,y,z,size*.65,size*.20,size*.65);
    return rim;
  }
  function buildVessel(group) {
    sign(group,'PULMÕES','CARGA DE O₂',0,3.5,13.7,'#80edff',5);
    sign(group,'MÚSCULO','ENTREGA DE O₂',0,5.1,-13,'#ffb58c',7);
    for(const side of [-1,1]) {
      for (let j=0;j<9;j++) {
        const z=12-j*3.3;
        redCell(group,side*(11.4+j%3),.7+(j%4)*.56,z, .77+(j%3)*.21,0xe64670);
      }
      link(group,[side*11,1.3,15],[side*11,1.3,-15],.31,0xdd597e);
      link(group,[side*12.6,1.7,15],[side*12.6,4.2,-15],.23,0x9e3b6a);
    }
    for(const wall of VESSEL_WALLS) {
      mesh(group,cube,0x712446,wall.x,.38,wall.z,wall.w,.76,wall.d);
      for(let dx=-wall.w/2+.58;dx<wall.w/2;dx+=1.18) {
        redCell(group,wall.x+dx,.84,wall.z,.52,0xed6482);
      }
    }
    for(const gate of VESSEL_GATES) {
      const moving=new THREE.Group();
      mesh(moving,cube,0x873850,0,.49,0,gate.w,.98,gate.d);
      cell(moving,0,1.15,0,.68,0xfab69a,0xff6f88);
      moving.position.z=gate.z;
      group.add(moving);
      movers.push({group,mesh:moving,gate});
    }
    for(let i=-9;i<=9;i++) mesh(group,cube,i%2?0xffd1bd:0x4c224a,i,.024,-10.5,1,.045,.76);
    for(const side of [-1,1]) {
      const x=side*7.9;
      mesh(group,tile,0xff9f7e,x,1.6,-12.1,.66,3.2,.66);
      mesh(group,ball,0x83e9ff,x,3.42,-12.1,.33,.33,.33);
    }
  }
  function buildTissue(group) {
    sign(group,'TECIDO INFECTADO','OBSERVE OS MARCADORES',0,6,-10,'#a5f9ff',9);
    for(let i=0;i<16;i++) {
      const x=(i%8-3.5)*2.7,z=i<8?-8.5:8;
      const p=cell(group,x,1.0,z,.94,i%4===0?0xce66ae:0x4896ab,i%4===0?0xffa2c8:0x99ecf0);
      if(i%4===0) for(let j=0;j<4;j++) {
        const a=j*Math.PI/2+.3;
        mesh(group,tile,0xffb18c,p.position.x+Math.cos(a)*.74,1.64,z+Math.sin(a)*.74,.15,.19,.15);
      }
    }
    for(let i=0;i<4;i++) {
      const z=-5+i*3.3;
      link(group,[-10,.16,z],[10,.16,z+1.8],.16,0x459cac);
    }
  }
  const builders={factory:buildFactory,race:buildVessel,targets:buildTissue};
  for (const id of Object.keys(palettes)) {
    const group = new THREE.Group();
    floor(group,palettes[id]);
    builders[id](group);
    scenes[id]=group;
  }
  function update(ambientTime, raceTime) {
    for (const entry of movers) {
      if (!entry.group.visible) continue;
      if(entry.gate) entry.mesh.position.x=vesselGateX(entry.gate,raceTime);
      else entry.mesh.position.y=entry.y+Math.sin(ambientTime*1.5+entry.phase)*entry.drift;
    }
  }
  return { scenes, palettes, update };
}
