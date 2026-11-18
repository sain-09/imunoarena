'use strict';

function createArenaCache({models,load,attach,release,active,limit=2}) {
  const pending=new Map(),used=new Map();
  let serial=0;
  function touch(id){if(models[id])used.set(id,++serial);}
  function trim(){
    while(Object.keys(models).length>limit){
      const oldest=[...used.keys()].filter(id=>id!==active()).sort((a,b)=>used.get(a)-used.get(b))[0];
      if(oldest===undefined)break;
      const model=models[oldest];
      delete models[oldest];used.delete(oldest);pending.delete(oldest);release(model);
    }
  }
  function get(id){
    touch(id);
    if(!pending.has(id)){
      const request=Promise.resolve().then(()=>load(id)).then(model=>{
        models[id]=model;touch(id);attach(model,id);trim();return model;
      }).catch(error=>{pending.delete(id);throw error;});
      pending.set(id,request);
    }
    return pending.get(id);
  }
  return {get,touch,trim};
}
