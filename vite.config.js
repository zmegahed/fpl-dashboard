import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {dataResponse} from './server/data.js';
const apiPlugin={name:'fpl-data',configureServer(server){server.middlewares.use('/api/dashboard',async(req,res)=>{const result=await dataResponse();res.writeHead(result.status,{'Content-Type':'application/json','Cache-Control':result.headers.get('Cache-Control')});res.end(await result.text());});}};
export default defineConfig({plugins:[react(),apiPlugin],build:{outDir:'dist/client',sourcemap:false},server:{host:'0.0.0.0',port:3000}});
