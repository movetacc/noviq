require('dotenv').config();
const https=require('https');
const appId=process.env.DISCORD_APPLICATION_ID;
const token=process.env.DISCORD_BOT_TOKEN;
if(!appId||!token){console.error('Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN in .env');process.exit(1)}
const body=JSON.stringify({name:'noviq',description:'Talk to NOVIQ',options:[{type:3,name:'message',description:'What do you want NOVIQ to do?',required:true} ]});
const req=https.request({hostname:'discord.com',path:`/api/v10/applications/${appId}/commands`,method:'PUT',headers:{Authorization:`Bot ${token}`,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{if(res.statusCode>=300){console.error('Discord command registration failed',res.statusCode,d);process.exit(1)}console.log('Registered /noviq successfully:',d)})});
req.on('error',e=>{console.error(e);process.exit(1)});req.write(body);req.end();
