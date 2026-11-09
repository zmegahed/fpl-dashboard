import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalize,canAdd,fillSquad,LIMITS} from '../src/data/model.js';
const snapshot=JSON.parse(fs.readFileSync(new URL('../src/data/snapshot.json',import.meta.url)));
const p=(id,pos,team,price=4)=>({id,position:pos,teamId:team,price,form:4,ppg:3,minutes:900,status:'a',fixtures:[{matches:[{difficulty:2}]}]});
test('prevents duplicate players, position overflow, club overflow and overspending',()=>{
 const player=p(1,'MID',1,10);
 assert.match(canAdd(player,[player]),/Already/);
 assert.match(canAdd(player,Array.from({length:5},(_,i)=>p(i+2,'MID',i+2))),/slots/);
 assert.match(canAdd(player,[p(2,'GK',1),p(3,'DEF',1),p(4,'FWD',1)]),/3 players/);
 assert.match(canAdd(player,[p(2,'GK',2,91)]),/budget/);
 assert.equal(canAdd(player,[p(2,'GK',2,90)]),'');
});
test('auto-fill produces valid 15-player squad under budget using actual snapshot',()=>{
 const {squad,error}=fillSquad(snapshot.players,[]);
 assert.equal(error,undefined);assert.equal(squad.length,15);
 assert.ok(squad.reduce((n,p)=>n+p.price,0)<=100.00001);
 for(const [pos,count] of Object.entries(LIMITS))assert.equal(squad.filter(p=>p.position===pos).length,count);
 for(const team of snapshot.teams)assert.ok(squad.filter(p=>p.teamId===team.id).length<=3);
 assert.equal(new Set(squad.map(p=>p.id)).size,15);
});
test('auto-fill preserves existing selections and reports impossible completion',()=>{
 const locked=snapshot.players.filter(p=>p.status==='a'&&p.price<7&&p.position==='MID').slice(0,1);
 const result=fillSquad(snapshot.players,locked);
 assert.ok(result.squad.some(p=>p.id===locked[0].id));
 assert.ok(fillSquad([p(1,'GK',1)],[]).error);
});
test('normalization preserves blanks and doubles and does not hard-code a season',()=>{
 const events=[{id:1,deadline_time:'2027-08-01T12:00:00Z',is_current:true,finished:false},{id:2,deadline_time:'2027-08-09T12:00:00Z',is_next:true},{id:3,deadline_time:'2027-08-16T12:00:00Z'}];
 const teams=[{id:1,name:'Alpha',short_name:'ALP'},{id:2,name:'Beta',short_name:'BET'}];
 const elements=[{id:1,first_name:'One',second_name:'Player',team:1,element_type:2,now_cost:45}];
 const fixtures=[{event:2,team_h:1,team_a:2,team_h_difficulty:2,team_a_difficulty:4},{event:2,team_h:2,team_a:1,team_h_difficulty:3,team_a_difficulty:3}];
 const data=normalize({events,teams,elements},fixtures);
 assert.equal(data.season,'2027/28');assert.equal(data.players[0].price,4.5);
 assert.equal(data.schedule[1][0].matches.length,2);assert.equal(data.schedule[1][1].matches.length,0);
 assert.equal(data.schedule[1][0].matches[1].home,false);
});
