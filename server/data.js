import {normalize} from '../src/data/model.js';
let cached = null;
let pending = null;
async function upstream(path) {
  const res=await fetch(`https://fantasy.premierleague.com/api/${path}/`,{headers:{'User-Agent':'Touchline/1.0 (FPL companion)','Accept':'application/json'},signal:AbortSignal.timeout(12000)});
  if(!res.ok) throw new Error(`FPL returned ${res.status}`);
  return res.json();
}
export async function getDashboard() {
  if(cached && Date.now()-Date.parse(cached.fetchedAt)<300000) return cached;
  if(pending) return pending;
  pending=Promise.all([upstream('bootstrap-static'),upstream('fixtures')]).then(([b,f])=>{cached=normalize(b,f);return cached;}).finally(()=>{pending=null;});
  return pending;
}
export async function dataResponse() {
  try {return Response.json(await getDashboard(),{headers:{'Cache-Control':'public, max-age=60'}});}
  catch {return Response.json({error:'Live FPL data is temporarily unavailable. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
