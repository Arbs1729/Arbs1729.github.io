// Local development adapter for the same Worker handler. Never bind publicly.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import worker from './index.mjs';
const config=JSON.parse(await readFile(new URL('./wrangler.jsonc',import.meta.url),'utf8'));
let secret='';try{const source=await readFile(new URL('./.dev.vars',import.meta.url),'utf8');secret=source.split(/\r?\n/).find(l=>l.startsWith('GEMINI_API_KEY='))?.slice(15).trim().replace(/^['"]|['"]$/g,'')||'';}catch{}
let count=0,expires=0;
const env={...config.vars,GEMINI_API_KEY:secret,CHAT_LIMITER:{async limit(){if(Date.now()>expires){count=0;expires=Date.now()+60000;}return {success:++count<=5};}}};
createServer(async(req,res)=>{try{const request=new Request(`http://127.0.0.1:8787${req.url}`,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:req,duplex:'half'}:{})});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());}catch{res.writeHead(500);res.end('{"error":"Local service error"}');}}).listen(8787,'127.0.0.1',()=>console.log(`Co-pilot local endpoint: http://127.0.0.1:8787/chat (${secret?'key configured':'key not configured'})`));
