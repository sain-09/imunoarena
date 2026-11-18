const {createHmac}=require('node:crypto');
function iceServers(env,id,now=Date.now()) {
  const servers=[{urls:['stun:stun.l.google.com:19302','stun:stun.cloudflare.com:3478']}];
  const urls=(env.IMUNO_TURN_URLS||'').split(',').map(url=>url.trim()).filter(url=>/^turns?:[^\s]+$/i.test(url));
  if(!urls.length)return servers;
  if(env.IMUNO_TURN_SECRET) {
    const username=Math.floor(now/1000+3600)+':'+id;
    servers.push({urls,username,credential:createHmac('sha1',env.IMUNO_TURN_SECRET).update(username).digest('base64')});
  }else if(env.IMUNO_TURN_USERNAME && env.IMUNO_TURN_PASSWORD) {
    servers.push({urls,username:env.IMUNO_TURN_USERNAME,credential:env.IMUNO_TURN_PASSWORD});
  }
  return servers;
}
module.exports={iceServers};
