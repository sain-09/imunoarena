'use strict';

function createMissionPanel({element, stage, roomId, duration, elapsed, symbolTexture, onVisual}) {
  const mission=makeMission(stage.id,roomId);
  const title=document.createElement('h2');
  title.textContent=stage.title;
  const help=document.createElement('p');
  help.textContent=stage.goal;
  const content=document.createElement('div');
  content.className='mission-content';
  const status=document.createElement('p');
  status.className='mission-status';
  status.setAttribute('role','status');
  element.replaceChildren(title,help,content,status);
  let closed=false;
  let payload={};
  let update=()=>{};
  function button(text,action,parent=content){
    const node=document.createElement('button');
    node.type='button';node.textContent=text;
    node.addEventListener('click',()=>{if(!closed && elapsed()<duration)action(node);});
    parent.append(node);return node;
  }
  function heading(text,parent=content){
    const node=document.createElement('p');node.textContent=text;node.className='mission-label';parent.append(node);return node;
  }
  function symbol(index,parent){
    const texture=symbolTexture(['losango cheio','triângulo cheio','círculo vazado','cruz'][index],'#36546a');
    const image=document.createElement('img');image.src=texture.image.toDataURL();image.alt=['Losango','Triângulo','Círculo','Cruz'][index];image.className='mission-symbol';
    texture.dispose();parent.append(image);
  }

  if(stage.id==='patrol'){
    payload={waves:[]};
    let wave=-1,allocation=[0,0,0],rows=[];
    heading('Cada leucócito contém até um invasor por onda. Você tem três patrulheiros.');
    const panel=document.createElement('div');panel.className='patrol-grid';content.append(panel);
    function repaint(){
      rows.forEach((row,i)=>{
        row.count.textContent=allocation[i]+' leucócitos';
        row.threat.textContent=mission.waves[wave][i]+' invasores previstos';
        row.plus.disabled=allocation.reduce((a,b)=>a+b,0)>=3;
        row.minus.disabled=allocation[i]===0;
      });
      status.textContent='Onda '+(wave+1)+'/5 · Disponíveis: '+(3-allocation.reduce((a,b)=>a+b,0));
      onVisual(allocation);
    }
    ['Pele','Pulmão','Intestino'].forEach((region,i)=>{
      const row=document.createElement('div');row.className='patrol-region';panel.append(row);
      heading(region,row);
      const threat=heading('',row),count=heading('',row);
      const controls=document.createElement('div');controls.className='mission-controls';row.append(controls);
      const minus=button('Retirar',()=>{if(allocation[i])allocation[i]--;repaint();},controls);
      const plus=button('Enviar',()=>{if(allocation.reduce((a,b)=>a+b,0)<3)allocation[i]++;repaint();},controls);
      rows.push({count,threat,plus,minus});
    });
    update=()=>{
      const current=Math.min(4,Math.floor(elapsed()/(duration/5)));
      if(current!==wave){
        if(wave>=0)payload.waves[wave]=allocation.slice();
        // Missed waves retain no patrol when a tab was inactive.
        wave=current;allocation=[0,0,0];repaint();
      }
    };
    update();
    payload.capture=()=>{if(wave>=0)payload.waves[wave]=allocation.slice();};
  }else if(stage.id==='barriers'){
    payload={order:mission.initial.slice()};
    let selected=-1;
    const list=document.createElement('div');list.className='sequence-list';content.append(list);
    function paint(){
      list.replaceChildren();
      payload.order.forEach((card,i)=>{
        const item=button((i+1)+'. '+mission.cards[card],()=>{
          if(selected<0)selected=i;
          else { [payload.order[selected],payload.order[i]]=[payload.order[i],payload.order[selected]];selected=-1;}
          paint();
          onVisual(payload.order);
        },list);
        item.setAttribute('aria-pressed',String(i===selected));
      });
      status.textContent=selected<0?'Toque no cartão que deseja mover.':'Toque na posição de destino.';
    }
    paint();
    heading('Sequência didática do início de cada processo. As respostas inata e adaptativa podem se sobrepor.');
  }else if(stage.id==='vaccine'){
    payload={links:[null,null,null,null]};
    const board=document.createElement('div');board.className='vaccine-links';content.append(board);
    mission.sources.forEach((text,i)=>{
      const row=document.createElement('label');row.textContent=text;board.append(row);
      const select=document.createElement('select');select.setAttribute('aria-label','Destino de '+text);
      const placeholder=new Option('Escolha o próximo efeito','');select.add(placeholder);
      mission.choices.forEach(j=>select.add(new Option(mission.destinations[j],String(j))));
      select.addEventListener('change',()=>{
        if(closed||elapsed()>=duration)return;
        payload.links[i]=select.value===''?null:Number(select.value);
        status.textContent=payload.links.filter(n=>n!==null).length+'/4 conexões definidas';
        onVisual(payload.links);
      });
      row.append(select);
    });
    status.textContent='Ligue cada etapa ao efeito seguinte.';
  }else if(stage.id==='inflammation'){
    payload={values:[25,25,25]};
    const labels=['Fluxo sanguíneo','Permeabilidade vascular','Mediadores inflamatórios'];
    const board=document.createElement('div');board.className='inflammation-board';content.append(board);
    const reference=document.createElement('div'), simulation=document.createElement('div');
    board.append(reference,simulation);
    heading('Tecido de referência',reference);heading('Seu simulador',simulation);
    function tissue(parent,values){
      const vessel=document.createElement('div');vessel.className='tissue-vessel';
      const red=document.createElement('div');red.className='tissue-flow';red.style.width=values[0]+'%';vessel.append(red);
      const swelling=document.createElement('div');swelling.className='tissue-swelling';swelling.style.height=(12+values[1]*.32)+'px';swelling.style.opacity=.3+values[1]/150;
      const mediators=document.createElement('div');mediators.className='tissue-mediators';
      for(let i=0;i<Math.round(values[2]/10);i++){const dot=document.createElement('span');mediators.append(dot);}
      parent.append(vessel,swelling,mediators);
    }
    tissue(reference,mission.reference);
    const preview=document.createElement('div');simulation.append(preview);
    function paint(){preview.replaceChildren();tissue(preview,payload.values);onVisual(payload.values);}
    labels.forEach((text,i)=>{
      const row=document.createElement('label');row.className='mission-slider';row.textContent=text;
      const input=document.createElement('input');input.type='range';input.min='0';input.max='100';input.step='5';input.value='25';input.setAttribute('aria-label',text);
      const output=document.createElement('output');output.textContent='25';
      input.addEventListener('input',()=>{
        if(closed||elapsed()>=duration)return;
        payload.values[i]=Number(input.value);output.textContent=input.value;paint();
      });
      row.append(input,output);content.append(row);
    });
    paint();status.textContent='Reproduza o padrão mostrado. A avaliação acontece no fim do tempo.';
  }else if(stage.id==='memory'){
    payload={answers:[]};
    let encounter=-2;
    update=()=>{
      const time=elapsed();
      const current=time<5?-1:Math.min(5,Math.floor((time-5)/((duration-5)/6)));
      if(current===encounter)return;
      encounter=current;content.replaceChildren();
      if(current<0){
        heading('Primeiro encontro: memorize esta assinatura.');
        symbol(mission.signature,content);
        status.textContent='As células de memória guardarão o reconhecimento desse antígeno.';
      }else{
        heading('Encontro '+(current+1)+'/6');
        symbol(mission.encounters[current],content);
        const controls=document.createElement('div');controls.className='mission-controls';content.append(controls);
        const yes=button('É o mesmo agente',()=>choose(true),controls);
        const no=button('É outro agente',()=>choose(false),controls);
        function choose(value){
          payload.answers[current]=value;
          yes.disabled=no.disabled=true;
          status.textContent='Reconhecimento registrado. Aguarde o próximo encontro.';
          onVisual([current,value]);
        }
        status.textContent='Compare com o agente do primeiro encontro.';
      }
    };
    update();
  }

  return {
    update(){if(!closed)update();},
    finish(){
      if(closed)return payload;
      if(payload.capture){payload.capture();delete payload.capture;}
      closed=true;
      element.querySelectorAll('button,input,select').forEach(node=>node.disabled=true);
      return JSON.parse(JSON.stringify(payload));
    },
    dispose(){closed=true;element.replaceChildren();}
  };
}
