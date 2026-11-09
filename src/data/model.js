export const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];
export const LIMITS = {GK:2, DEF:5, MID:5, FWD:3};
export const TEAM_COLORS = {ARS:'#e74444',AVL:'#7b364f',BOU:'#c53845',BRE:'#e44343',BHA:'#337fc5',BUR:'#7e384b',CHE:'#376de0',CRY:'#386dc8',EVE:'#256ac1',FUL:'#343c41',LEE:'#d7b646',LIV:'#d84942',MCI:'#78b9d3',MUN:'#dc4842',NEW:'#3e4746',NFO:'#df5149',SUN:'#d64d4d',TOT:'#929b99',WHU:'#884b65',WOL:'#daa82d',IPS:'#357cce',SOU:'#d95656',LEI:'#4c73c0',HUL:'#dc991a',COV:'#70b6d6'};
export function normalize(bootstrap, fixtures, fetchedAt = new Date().toISOString()) {
  if (!bootstrap.elements?.length || !Array.isArray(fixtures)) throw new Error('Invalid FPL response');
  const events = bootstrap.events || [];
  const next = events.find(e=>e.is_next) || events.find(e=>!e.finished) || events.at(-1);
  const current = events.find(e=>e.is_current) || events.filter(e=>e.finished).at(-1);
  const firstYear = new Date(events[0]?.deadline_time || fetchedAt).getUTCFullYear();
  const roundIds = events.filter(e=>e.id >= next.id).slice(0,5).map(e=>e.id);
  const teams = bootstrap.teams.map(t=>({id:t.id,name:t.name,short:t.short_name,code:t.code}));
  const teamMap = Object.fromEntries(teams.map(t=>[t.id,t]));
  const schedule = Object.fromEntries(teams.map(t=>[t.id,roundIds.map(round=>({round,matches:fixtures.filter(f=>f.event===round&&(f.team_h===t.id||f.team_a===t.id)).map(f=>({opponent:teamMap[f.team_h===t.id?f.team_a:f.team_h]?.short||'TBC',home:f.team_h===t.id,difficulty:f.team_h===t.id?f.team_h_difficulty:f.team_a_difficulty,kickoff:f.kickoff_time}))}))]));
  const players = bootstrap.elements.filter(p=>!p.removed).map(p=>({id:p.id,code:p.code,name:p.web_name,fullName:`${p.first_name} ${p.second_name}`,teamId:p.team,team:teamMap[p.team]?.short||'TBC',teamName:teamMap[p.team]?.name||'Unknown',position:POSITIONS[p.element_type-1],price:p.now_cost/10,points:p.total_points,form:+p.form||0,ppg:+p.points_per_game||0,ownership:+p.selected_by_percent||0,minutes:p.minutes,goals:p.goals_scored,assists:p.assists,cleanSheets:p.clean_sheets,bonus:p.bonus,xgi:+p.expected_goal_involvements||0,status:p.status,news:p.news,chance:p.chance_of_playing_next_round,transfers:p.transfers_in_event-p.transfers_out_event,priceChange:p.cost_change_event/10,fixtures:schedule[p.team]||[]}));
  return {players,teams,schedule,roundIds,next:next?{id:next.id,deadline:next.deadline_time,finished:next.finished}:null,current:current?{id:current.id,average:current.average_entry_score,highest:current.highest_score,finished:current.finished}:null,season:`${firstYear}/${String(firstYear+1).slice(-2)}`,fetchedAt};
}
export function ease(player) { const matches=player.fixtures?.slice(0,3).flatMap(f=>f.matches)||[]; return matches.length?matches.reduce((s,f)=>s+f.difficulty,0)/matches.length:5; }
export function score(player) {return player.form*0.55+player.ppg*0.3+(6-ease(player))*0.15;}
export function canAdd(player,squad,budget=100) {
  if(squad.some(p=>p.id===player.id)) return 'Already in your squad.';
  if(squad.filter(p=>p.position===player.position).length >= LIMITS[player.position]) return `Your ${player.position} slots are full. Remove a player first.`;
  if(squad.filter(p=>p.teamId===player.teamId).length>=3) return 'You can select up to 3 players from one club.';
  if(Math.round((squad.reduce((s,p)=>s+p.price,0)+player.price)*10)>Math.round(budget*10)) return 'That player would take you over budget.';
  return '';
}
export function fillSquad(players,selected,budget=100) {
  const pool=players.filter(p=>p.status==='a'&&p.minutes>0);
  let squad=[...selected];
  const locked=new Set(selected.map(p=>p.id));
  for(const pos of POSITIONS) {
    while(squad.filter(p=>p.position===pos).length<LIMITS[pos]) {
      const candidate=pool.filter(p=>p.position===pos&&!canAdd(p,squad,budget)).sort((a,b)=>a.price-b.price||score(b)-score(a))[0];
      if(!candidate) return {error:'No complete squad fits around these picks. Remove an expensive player and try again.'};
      squad.push(candidate);
    }
  }
  // Upgrade the cheapest valid roster while preserving the manager's existing picks.
  for(let pass=0;pass<80;pass++) {
    let best=null;
    for(const old of squad.filter(p=>!locked.has(p.id))) {
      const rest=squad.filter(p=>p.id!==old.id);
      for(const candidate of pool) {
        if(candidate.position!==old.position||candidate.id===old.id||score(candidate)<=score(old)||canAdd(candidate,rest,budget)) continue;
        const utility=(score(candidate)-score(old))/(1+Math.max(0,candidate.price-old.price));
        if(!best||utility>best.utility) best={old,candidate,utility};
      }
    }
    if(!best) break;
    squad=squad.map(p=>p.id===best.old.id?best.candidate:p);
  }
  return {squad};
}
