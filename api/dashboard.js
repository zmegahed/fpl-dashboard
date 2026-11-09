import {dataResponse} from '../server/data.js';
export default async function handler(req,res){
 if(req.method!=='GET'){res.status(405).json({error:'Method not allowed'});return;}
 const result=await dataResponse();
 res.setHeader('Cache-Control',result.headers.get('Cache-Control')||'no-store');
 res.status(result.status).json(await result.json());
}
