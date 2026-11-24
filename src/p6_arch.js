
/* ============================================================
   ARCHITECTURE — solved grid → dressed building
   ============================================================ */
const isMass=t=>t===ROOM||t===DOME||t===IWAN||t===ARC||t===STAIR||t===GATE;
const enclosedT=t=>t===ROOM||t===DOME||t===STAIR||t===GATE;
const cellC=(x,z)=>[(x-(GRID.nx-1)/2)*CW,(z-(GRID.nz-1)/2)*CW];
const FR=(k,w,d)=>({k,w,d});
const DOMEPROF={
  hemi:r=>{ const o=[]; for(let i=0;i<=12;i++){ const a=i/12*Math.PI/2; o.push([r*Math.cos(a), r*0.98*Math.sin(a)]); } return o; },
  mudlow:r=>{ const o=[]; for(let i=0;i<=10;i++){ const a=i/10*Math.PI/2; o.push([r*Math.cos(a), r*0.6*Math.sin(a)]); } return o; },
  onion:r=>[[1,0],[1.04,.15],[1.08,.34],[1.04,.56],[.9,.78],[.68,.98],[.42,1.14],[.2,1.26],[.06,1.34],[0,1.38]].map(p=>[p[0]*r,p[1]*r]),
  bell:r=>[[1,0],[1.02,0.12],[0.98,0.42],[0.82,0.78],[0.55,1.0],[0.3,1.12],[0.16,1.3],[0.12,1.7],[0.06,2.4],[0,2.9]].map(p=>[p[0]*r,p[1]*r]),
  pointed:r=>{ const off=0.35, R=1+off, am=Math.acos(off/R), o=[[r,0]]; for(let i=0;i<=12;i++){ const a=am*i/12; o.push([Math.max(0,(R*Math.cos(a)-off))*r, (0.22+R*Math.sin(a))*r]); } return o; },
  mudpoint:r=>{ const off=0.2, R=1+off, am=Math.acos(off/R), o=[]; for(let i=0;i<=10;i++){ const a=am*i/10; o.push([Math.max(0,(R*Math.cos(a)-off))*r, 0.9*R*Math.sin(a)*r]); } return o; }
};
const TOWER_HALF={mminaret:1.35, ominaret:1.25, pminaret:1.3, sqminaret:1.3, yminaret:1.35, badgir:1.75, barjeel:1.5, burj:2.5, watch:2.3,
  jpagoda:1.9, cpagoda:1.9, newartemple:2.5, stonepagoda:1.35, drumtower:2.6, chorten:2.3, prang:2.3, meru:1.9, chhatritower:1.4,
  romtower:1.4, saatkule:1.35, turret:1.45, tudorturret:1.3, belfry:1.4, tentroof:2.0, sahelmin:1.6, mayapyramid:2.85, pueblotower:1.7, lookout:1.6};
Object.assign(TOWER_HALF,RUIN_TOWER_HALF);
const TOWER_KINDS=[['jpagoda','Five-storey pagoda (Japan)'],['cpagoda','Octagonal pagoda (China)'],['drumtower','Drum tower (China)'],['stonepagoda','Stone pagoda (Korea)'],['newartemple','Tiered temple (Newar)'],['chorten','Chörten stupa (Tibet)'],['prang','Prang (Thailand)'],['meru','Meru (Bali)'],['chhatritower','Chhatri tower (Rajasthan)'],
  ['mminaret','Mamluk minaret'],['ominaret','Ottoman pencil minaret'],['pminaret','Safavid minaret'],['sqminaret','Square Syrian minaret'],['yminaret','Yemeni minaret'],['badgir','Badgir windcatcher'],['barjeel','Barjeel windcatcher'],['burj','Round watchtower'],['watch','Najdi watchtower'],
  ['romtower','Turris (Roman villa tower)'],['saatkule','Saat kulesi (Ottoman clock tower)'],['turret','Corner turret (Victorian)'],['tudorturret','Stair turret (Tudor)'],['belfry','Bell tower (Cyclades)'],['tentroof','Shatyor tent tower (Russia)'],['sahelmin','Banco minaret (Sahel)'],['mayapyramid','Temple pyramid (Maya)'],['pueblotower','Round tower (Pueblo)'],['lookout','Timber lookout (Pacific)'],
  ['tholos','Tholos (Greek round shrine)'],['pylon','Pylon tower (Egypt)'],['ziggurat','Ziggurat (Mesopotamia)'],['kaaba','Stone tower (Achaemenid)'],['prasat','Prasat (Khmer)'],['torreon','Torreón (Inca)'],['cribtower','Basalt bastion (Nan Madol)'],['conical','Conical tower (Great Zimbabwe)']];
const DOME_KINDS=[['pyramid','Pyramid roof (East Asia)'],['bell','Bell shrine (Thailand)'],['onion','Bulbous (Safavid)'],['hemi','Hemispherical'],['pointed','Stilted pointed (Mamluk)'],['mudpoint','Pointed mud (Yazd)'],['mudlow','Low mud']];
const KIOSK_KINDS=[['ting','Ting (square pavilion)'],['ting6','Hexagonal pavilion'],['azumaya','Azumaya (garden arbour)'],['jeongja','Jeongja (Korean pavilion)'],['chhatri','Chhatri (domed kiosk)'],['pati','Pati (Newar rest house)'],['gyaphib','Gyaphib (gilded shrine)'],['sala','Sala (Thai pavilion)'],['bale','Bale (thatched pavilion)'],
  ['chartaq','Chartaqi (four arches, dome)'],['domed','Domed pavilion'],['talar','Talar (wooden columns)'],['arish','Arish (palm-frond shade)'],['loggia','Loggia'],['mafraj','Mafraj (glazed room)'],['tilehip','Tiled pavilion'],['pergola','Pergola (vine arbour)'],['gazebo','Gazebo'],['palapa','Palapa (round thatch)']];

/* pitched (hip) roofs: largest rectangles of plain roofs with no taller neighbour, per storey */
function hipLayout(T,st){
  const {nx:NX,nz:NZ,nc:NC}=GRID, cells=new Set(), rects=[]; if(st.roof!=='hip'&&st.roof!=='pitched') return {cells,rects};
  const pitched=st.roof==='pitched';
  const at=(x,z,l)=> (x<0||x>=NX||z<0||z>=NZ)? -1 : (l<0||l>3)? EMPTY : T[x+z*NX+l*NC];
  for(let l=0;l<4;l++){
    const ok=new Array(NC).fill(false);
    for(let c=0;c<NC;c++){ const x=c%NX, z=(c/NX)|0, ty=at(x,z,l); if(!isMass(ty)||ty===DOME||(ty===STAIR&&!pitched)) continue; if(at(x,z,l+1)!==EMPTY) continue;
      let taller=false; for(const [dx,dz] of DIRS) if(isMass(at(x+dx,z+dz,l+1))) taller=true;
      if((ty===IWAN||ty===GATE)&&st.pish>0) continue;
      if(!taller||pitched) ok[c]=true; }
    for(;;){ let best=null, ba=0;
      for(let x0=0;x0<NX;x0++) for(let z0=0;z0<NZ;z0++) for(let x1=x0;x1<NX;x1++) for(let z1=z0;z1<NZ;z1++){
        let all=true; for(let x=x0;x<=x1&&all;x++) for(let z=z0;z<=z1;z++) if(!ok[x+z*NX]){ all=false; break; }
        const a=(x1-x0+1)*(z1-z0+1); if(pitched&&(Math.min(x1-x0,z1-z0)>0||Math.max(x1-x0,z1-z0)>2)) continue; if(all&&a>ba){ ba=a; best=[x0,z0,x1,z1]; } }
      if(!best) break;
      for(let x=best[0];x<=best[2];x++) for(let z=best[1];z<=best[3];z++){ ok[x+z*NX]=false; cells.add(x+z*NX+l*NC); }
      rects.push([...best,l]); }
  }
  return {cells,rects};
}

/* ============================================================
   OUTSIDE STAIRS — straight masonry flights climbing an outside wall.
   A flight stands in an open cell N (street, garden, courtyard or roof terrace)
   against the plain wall of room M and climbs one storey, landing either on M's
   roof (through a gap in the parapet) or at a door into the room above M.
   ============================================================ */
const OS={SW:1.15, BW:0.18, RISE:0.2, MINTREAD:0.17};
function outStairCtx(T,R,st){
  const {nx:NX,nz:NZ,nc:NC}=GRID, hips=hipLayout(T,st).cells;
  const at=(x,z,l)=> (x<0||x>=NX||z<0||z>=NZ)? -1 : (l<0||l>3)? EMPTY : T[x+z*NX+l*NC];
  const walkRoof=(x,z,l)=>{ const b=at(x,z,l); return isMass(b)&&b!==DOME&&b!==STAIR&&!(b===ARC&&st.arcDomes)&&!hips.has(x+z*NX+l*NC); };
  const standable=(x,z,l)=>{ const n=at(x,z,l); return l===0? (n===-1||n===EMPTY||n===COURT) : (n===EMPTY&&walkRoof(x,z,l-1)); };
  return {at,R,walkRoof,standable,NX,NZ,NC};
}
// does a flight fit on face d of M=(x,z) at storey l, and how? (u runs along the face to the viewer's right, seen from N)
function outStairFit(f,C,st){
  const {x,z,l,d}=f, [nx,nz]=DIRS[d], Nx=x+nx, Nz=z+nz, t=st.t, H=st.H, at=C.at, no={ok:false};
  const up=at(x,z,l+1), upR=up===IWAN? C.R[x+z*C.NX+(l+1)*C.NC] : -1;
  const arrive= (up===EMPTY&&C.walkRoof(x,z,l))? 'roof' : (up===ROOM||up===DOME||(up===IWAN&&upR!==d))? 'room' : null;
  if(!arrive) return no;
  const off={}, open={}; let blockA=0, blockB=0; const nt=at(Nx,Nz,l);
  for(const [e,sx,sz] of [['A',-nz,nx],['B',nz,-nx]]){ const Px=Nx+sx, Pz=Nz+sz, p=at(Px,Pz,l), pr=p>=0&&p<NT? C.R[Px+Pz*C.NX+l*C.NC] : 0;
    const back=DIRS.findIndex(q=>q[0]===-sx&&q[1]===-sz);       // P's face that looks at N
    if(p===STAIR||p===ARC||((p===IWAN||p===GATE)&&pr===back)) return no;
    let o=0.06;
    if(l===0&&at(Nx,Nz,0)===COURT&&p!==COURT&&!isMass(p)) o=t*0.8+0.05;          // courtyard enclosure wall
    if(l>0&&!isMass(at(Px,Pz,l-1))) o=Math.max(0.25,t*0.55)+0.05;               // roof parapet of the terrace
    off[e]=o;
    // can a visitor walk up to this end to start climbing? (open ground, the same courtyard, or a joined roof)
    open[e]= l===0? ((p===-1||p===EMPTY)? nt!==COURT : p===COURT&&nt===COURT) : C.standable(Px,Pz,l);
    const blk=(isMass(p)?1:0)+(isMass(at(Px,Pz,l+1))?0.6:0); if(e==='A') blockA=blk; else blockB=blk; }
  const LL= arrive==='room'? Math.max(1.3,t+1.31) : 1.4;
  const y0= l===0? 0 : l*H+0.04, yt=(l+1)*H+0.04, n=Math.max(4,Math.round((yt-y0)/OS.RISE));
  const run=CW-off.A-off.B-LL, tread=run/(n-1);
  if(tread<OS.MINTREAD||!(open.A||open.B)) return no;
  return {ok:true, arrive, offA:off.A, offB:off.B, LL, run, n, tread, y0, yt, blockA, blockB, openA:open.A, openB:open.B};
}
// choose flights for a solved plan. 'outside': must reach the top habitable storey; 'both': best effort beside an inside core
function planOutStairs(res,st,seed,mode){
  const T=res.types.map(BASE_T), C=outStairCtx(T,res.rots,st), {at,standable,NX,NZ,NC}=C, rng=RNG(seed+'|outstair|'+mode);
  const HAB=t=>t===ROOM||t===DOME||t===IWAN||t===ARC||t===KIOSK||t===GATE;
  let L=0; for(let i=NC;i<NC*4;i++) if(HAB(T[i])) L=Math.max(L,(i/NC)|0);
  const cands=(l,reach)=>{ const out=[];
    for(let z=0;z<NZ;z++) for(let x=0;x<NX;x++){ const t=at(x,z,l); if(t!==ROOM&&t!==IWAN&&t!==GATE) continue;
      for(let d=0;d<4;d++){ if((t===IWAN||t===GATE)&&C.R[x+z*NX+l*NC]===d) continue;
        const Nx=x+DIRS[d][0], Nz=z+DIRS[d][1]; if(!standable(Nx,Nz,l)) continue;
        if(reach&&!reach.has(Nx+Nz*NX)) continue;
        const above=at(Nx,Nz,l+1); if(above!==-1&&above!==EMPTY) continue;
        const g=outStairFit({x,z,l,d},C,st); if(!g.ok) continue;
        const nt=at(Nx,Nz,l);
        // the bottom goes at an end you can walk up to; with a choice, the landing takes the more enclosed end
        const sv= g.openA&&!g.openB? 1 : g.openB&&!g.openA? -1 : g.blockA<g.blockB? 1 : g.blockB<g.blockA? -1 : (rng.chance(0.5)?1:-1);
        out.push({x,z,l,d,arrive:g.arrive, s:sv,
          sc:(nt===COURT?2:0)+(nt===-1?0.4:0)+(g.arrive==='roof'?0.5:0)+g.tread*2+rng.f()}); } }
    return out.sort((a,b)=>b.sc-a.sc); };
  // everything a visitor can walk to on storey k from cell (x,z), following only openings the builder really makes:
  // roofs run into each other, rooms open into rooms, a room has a door onto a terrace (steered at build), arcades and
  // pavilions stand open, an iwan opens through its mouth and through the door in its back wall
  const comp=(k,x,z,shut)=>{ const terr=(a,b)=>at(a,b,k)===EMPTY&&C.walkRoof(a,b,k-1), encl=t=>t===ROOM||t===DOME, rot=(a,b)=>C.R[a+b*NX+k*NC];
    const conn=(a,b,p,r,d)=>{ const ta=at(a,b,k), tb=at(p,r,k), A=terr(a,b), Bt=terr(p,r);
      if(A&&Bt) return true;
      if(A||Bt){ const [t,o0,o1,dd]= A? [tb,p,r,(d+2)%4] : [ta,a,b,d]; if(shut&&shut.has(`${o0},${o1},${dd}`)) return false; if(encl(t)||t===ARC||t===KIOSK) return true; if(t===IWAN) return rot(o0,o1)===dd; return false; }
      if(encl(ta)&&encl(tb)) return true;
      if((ta===ARC||ta===KIOSK)&&(tb===ARC||tb===KIOSK)) return true;
      if(ta===IWAN&&(encl(tb)||tb===ARC)) return rot(a,b)===d||(rot(a,b)+2)%4===d;
      if(tb===IWAN&&(encl(ta)||ta===ARC)) return rot(p,r)===(d+2)%4||rot(p,r)===d;
      return false; };
    const seen=new Set([x+z*NX]), q=[[x,z]];
    while(q.length){ const [a,b]=q.pop(); for(let d=0;d<4;d++){ const p=a+DIRS[d][0], r=b+DIRS[d][1]; if(p<0||p>=NX||r<0||r>=NZ||seen.has(p+r*NX)) continue;
      const t=at(p,r,k); if(!(HAB(t)||terr(p,r))||!conn(a,b,p,r,d)) continue; seen.add(p+r*NX); q.push([p,r]); } }
    return seen; };
  const terr=(k,set)=>new Set([...set].filter(i=>standable(i%NX,(i/NX)|0,k)));
  // the wall a flight stands against can't also hold the door onto its terrace, so reach is re-checked without it
  const reachFrom=(l,arr,c)=>{ if(!arr) return null; return terr(l,comp(l,arr.x,arr.z,new Set([`${c.x},${c.z},${c.d}`]))); };
  let tries=0;
  const search=(l,arr,target)=>{
    if(l>=target) return [];
    const pre= arr? terr(l,comp(l,arr.x,arr.z)) : null;
    for(const c of cands(l,pre).slice(0,8)){ if(++tries>500) return null;
      if(arr&&!reachFrom(l,arr,c).has((c.x+DIRS[c.d][0])+(c.z+DIRS[c.d][1])*NX)) continue;
      const k=l+1, cmp=comp(k,c.x,c.z);
      if(k===target&&![...cmp].some(i=>HAB(at(i%NX,(i/NX)|0,k)))) continue;
      const rest=search(k,{x:c.x,z:c.z},target); if(rest) return [c,...rest]; }
    return null; };
  let flights=null;
  if(mode==='outside'){ flights= L>0? search(0,null,L) : []; if(!flights) return {ok:false,flights:[],L}; }
  else { flights=[]; for(let tg=Math.max(1,L);tg>=1&&!flights.length;tg--){ tries=0; flights=search(0,null,tg)||[]; } }
  // and a last flight up onto a roof terrace, where one fits (roofs are lived on across the region)
  { const last=flights[flights.length-1], k=last? last.l+1 : 0;
    const reach= last? terr(k,comp(k,last.x,last.z)) : null;
    if(k<3&&(!last||reach.size)){ const r=cands(k,reach).find(c=>c.arrive==='roof'&&(!last||reachFrom(k,last,c).has((c.x+DIRS[c.d][0])+(c.z+DIRS[c.d][1])*NX))); if(r) flights.push(r); } }
  return {ok:true, flights:flights.map(f=>({x:f.x,z:f.z,l:f.l,d:f.d,s:f.s,arrive:f.arrive})), L};
}

function buildArchitecture(plan,st,S,mats){
  if(plan.nx) setGrid(plan.nx,plan.nz);
  const NX=GRID.nx, NZ=GRID.nz, NC=GRID.nc;
  const B=new Builder(0); B.rec=[];   // the record lower LODs are replayed from
  const H=st.H, t=st.t, FT=S.feats;
  const TU=plan.types, T=TU.map(BASE_T), R=plan.rots;   // TU: the modules as solved (bedroom, bathroom, outhouse…); T: how each is built
  const idx=(x,z,l)=>x+z*NX+l*NC;
  const cellAt=(x,z,l)=> (x<0||x>=NX||z<0||z>=NZ)? -1 : (l<0||l>3)? EMPTY : T[idx(x,z,l)];
  const wallKey=l=> FT.ablaq? 'ablaq' : (l===0&&st.groundWall? 'wall2':'wall');
  // each module's own shade of the same material; 'variation between modules' scales it (0.25 is the old fixed amount)
  const VARY=clamp(S.finish&&S.finish.vary!=null? +S.finish.vary : 0.25,0,1)/0.25;
  const jitter=key=>{ const r=RNG('j'+key), a=VARY; const k=1+(r.range(0.95,1.04)-1)*a; return [k*(1+(r.range(.985,1.015)-1)*a),k,k*(1+(r.range(.98,1.02)-1)*a)]; };
  const modOf=(x,z,l)=>S.mods[`${x},${z},${l}`]||{};
  // the corner every suite in the house keeps for its ensuite strip ([x sign, z sign]): one for the whole house, so that of two
  // suites sharing a wall only one ever needs that wall's doorway moved, and the bathrooms stack over each other
  const SUITE_C=(()=>{ const r=RNG(S.seed+'|sc'); return [r.chance(.5)?1:-1, r.chance(.5)?1:-1]; })(), suiteCorner=()=>SUITE_C;
  const isSuite=(x,z,l)=>{ if(x<0||x>=NX||z<0||z>=NZ||l<0||l>3) return false; const u=TU[idx(x,z,l)]; return u===BED||u===BATH; };
  FIT= S.fit==='modern'? 'modern' : 'period';
  // a ruin: the envelope that says how much still stands, and the filter that cuts everything built from here on
  const RU= st.ruin? makeRuin(st,{NX,NZ,H,CW,parH:st.parH||0,seed:S.seed,cellAt,towerTop:(x,z)=>{ let n=0; while(n<4&&cellAt(x,z,n)===TOWER) n++; if(!n) return null;
      const kind=modOf(x,z,0).tower||st.tower, half=TOWER_HALF[kind]||1.3, free=ASIA_TOWERS.has(kind)||WORLD_FREE.has(kind)||RUIN_FREE.has(kind);
      const Ht= RUIN_TOWERS.has(kind)? Math.max(n*H,H*(RUIN_TOWER_H[kind]||1.6)) : WORLD_TOWERS.has(kind)? Math.max(n*H,H*(WORLD_TOWER_H[kind]||1.6)) : ASIA_TOWERS.has(kind)? Math.max(n*H,H*2.4) : n*H;
      let ox=0, oz=0; for(const [dx,dz] of DIRS) if(isMass(cellAt(x+dx,z+dz,0))){ ox+=dx; oz+=dz; } const sh=free?0:CW/2-half-0.02;
      return [Ht+1.2,half,Math.sign(ox)*sh,Math.sign(oz)*sh]; }}) : null;
  if(RU){ B.ruin=RU; B.weather=st.ruin.grime!=null?st.ruin.grime:0.5; B.rec.weather=B.weather; }   // grime and damp darken the foot of every wall
  const EPS=0.004;
  const trimF=(F,has)=>{ if(has((F.d+1)%4)) F.uA+=EPS; if(has((F.d+3)%4)) F.uB-=EPS; return F; };
  const KS=CW/6;   // scale for details laid out on the original 6 m module
  const slab=(k,x,z,l,ya,yb,inset)=>{ const [cx,cz]=cellC(x,z), h=CW/2; const ins=d=>inset(cellAt(x+DIRS[d][0],z+DIRS[d][1],l),x+DIRS[d][0],z+DIRS[d][1])?0.025:0;
    B.box(k,cx-h+ins(2),ya,cz-h+ins(3),cx+h-ins(0),yb,cz+h-ins(1)); colB(cx-h+ins(2),ya,cz-h+ins(3),cx+h-ins(0),yb,cz+h-ins(1)); };
  const exterior=nb=>!isMass(nb);
  const COL=[];
  const colB=(x0,y0,z0,x1,y1,z1)=>COL.push([Math.min(x0,x1),Math.min(y0,y1),Math.min(z0,z1),Math.max(x0,x1),Math.max(y0,y1),Math.max(z0,z1)]);
  const aabbM=(M,x0,y0,z0,x1,y1,z1)=>{ const mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9];
    for(const a of [x0,x1]) for(const b of [y0,y1]) for(const c of [z0,z1]){ const v=V3(a,b,c).applyMatrix4(M); mn[0]=Math.min(mn[0],v.x); mn[1]=Math.min(mn[1],v.y); mn[2]=Math.min(mn[2],v.z); mx[0]=Math.max(mx[0],v.x); mx[1]=Math.max(mx[1],v.y); mx[2]=Math.max(mx[2],v.z); }
    return [mn[0],mn[1],mn[2],mx[0],mx[1],mx[2]]; };
  const colM=(M,x0,y0,z0,x1,y1,z1)=>{ if(Math.abs(x1-x0)<1e-4||Math.abs(y1-y0)<1e-4||Math.abs(z1-z0)<1e-4) return; COL.push(aabbM(M,x0,y0,z0,x1,y1,z1)); };
  // doorways always leave a gap in the static collision; each closed leaf blocks it with its own switchable box
  const passable=o=>!o.nohole&&(o.fill==='door'||!o.fill);
  const DOORS=[], colSeen=new Set();
  const colWall=(F,uA,uB,vA,vB,w0,w1,ops)=>{ const gaps=(ops||[]).filter(o=>passable(o)&&o.v0<=vA+0.65).map(o=>[o.u0,o.u1,openTop(o)]).sort((a,b)=>a[0]-b[0]);
    let u=uA; for(const [g0,g1,gt] of gaps){ if(g0>u) colM(F.M,u,vA,w0,g0,vB,w1); if(gt<vB) colM(F.M,g0,gt,w0,g1,vB,w1); u=Math.max(u,g1); } if(uB>u) colM(F.M,u,vA,w0,uB,vB,w1); };
  let hasWater=false;
  const dk=(x,z,l,d)=>`${x},${z},${l},${d}`;
  const {cells:hipCells, rects:hipRects}=hipLayout(T,st), PITCH=st.roof==='pitched', ASIA=st.region==='asia';
  FT_LAMPS=()=>!!FT.lanterns;
  const hangLamp=(B_,x,y,z)=>hangLampAsia(B_,x,y,z,st.lamp);   // each tradition's own lantern
  /* pitched roofs: which way each ridge runs, so an upper room can open a door onto the eave of the roof below it */
  const roofOpenT=v=>v<=0||v===COURT;   // open air, off the plot or a courtyard: the only things an eave may overhang
  function roofAxis(x0,z0,x1,z1,l){
    if(x1-x0>z1-z0) return true; if(z1-z0>x1-x0) return false;
    const tall=d=>isMass(cellAt(x0+DIRS[d][0],z0+DIRS[d][1],l+1)); if(tall(1)||tall(3)) return true; if(tall(0)||tall(2)) return false;
    const o=d=>!isMass(cellAt(x0+DIRS[d][0],z0+DIRS[d][1],l)); return (o(1)||o(3))? true : (o(0)||o(2))? false : true; }
  const eaveOf=new Map(); if(PITCH) for(const [x0,z0,x1,z1,l] of hipRects){ const ax=roofAxis(x0,z0,x1,z1,l); for(let x=x0;x<=x1;x++) for(let z=z0;z<=z1;z++) eaveOf.set(idx(x,z,l),ax?[1,3]:[0,2]); }
  // the roof of cell (x,z,l) presents its eave (not a gable) on side dd
  const eaveTo=(x,z,l,dd)=>{ const e=eaveOf.get(idx(x,z,l)); return !!e&&e.includes(dd); };

  function faceKind(x,z,l,d){
    const ty=cellAt(x,z,l), nb=cellAt(x+DIRS[d][0],z+DIRS[d][1],l), r=R[idx(x,z,l)];
    if(ty===IWAN&&r===d) return 'mouth';
    if(ty===GATE&&r===d) return 'portal';
    if(isMass(nb)){ if(ty===IWAN) return 'inner'; if(nb===ARC&&ty!==ARC) return 'porch'; return null; }
    if(nb===COURT) return 'court';
    return 'street';
  }

  /* ---------- outside stairs: reserve their walls before any door is chosen ---------- */
  const OC=outStairCtx(T,R,st), OUT=[], outFace=new Set(), outArrive=new Map(), outGap=new Map(), outAvoid=new Map(), outBoxes=[], outCourt=new Map();
  const uOfW=(d,wx,wz)=>DIRS[d][1]*wx-DIRS[d][0]*wz;
  for(const f0 of (plan.outStairs||[])){ const g=outStairFit(f0,OC,st); if(!g.ok) continue;
    const f=Object.assign({},f0,g), [cx,cz]=cellC(f.x,f.z), F=fr(cx,cz,f.d), [nx,nz]=DIRS[f.d], D=OS.SW+OS.BW;
    f.F=F; f.D=D; f.bot= f.s>0? F.uA+f.offA : F.uB-f.offB; f.end= f.s>0? F.uB-f.offB : F.uA+f.offA;
    const land0=f.bot+f.s*f.run, land1=f.end; f.land0=land0;
    outFace.add(dk(f.x,f.z,f.l,f.d));
    if(f.arrive==='room') outArrive.set(dk(f.x,f.z,f.l+1,f.d), f.s>0? F.uB-t-0.66 : F.uA+t+0.66);
    else { const g0=Math.min(land0,land1)+0.1, g1=Math.max(land0,land1)-0.1; outGap.set(dk(f.x,f.z,f.l,f.d),[Math.max(g0,F.uA+0.35),Math.min(g1,F.uB-0.35)]); }
    // keep neighbouring doors and windows clear of both ends of the flight (and of the landing's rail)
    const Nx=f.x+nx, Nz=f.z+nz;
    for(const [sx,sz,isTop] of [[-nz,nx,f.s<0],[nz,-nx,f.s>0]]){ const Px=Nx+sx, Pz=Nz+sz, back=DIRS.findIndex(q=>q[0]===-sx&&q[1]===-sz);
      const c0x=cx+nx*CW/2+sx*CW/2, c0z=cz+nz*CW/2+sz*CW/2, c1x=c0x+nx*(D+0.4), c1z=c0z+nz*(D+0.4);
      const ua=uOfW(back,c0x,c0z), ub=uOfW(back,c1x,c1z), seg=[Math.min(ua,ub),Math.max(ua,ub)];
      for(const ll of (isTop?[f.l,f.l+1]:[f.l])){ const k=dk(Px,Pz,ll,back); if(!outAvoid.has(k)) outAvoid.set(k,[]); outAvoid.get(k).push(seg); } }
    const b=aabbM(F.M,Math.min(f.bot,f.end),f.y0,0,Math.max(f.bot,f.end),f.yt+1.0,D+0.25); outBoxes.push(b);
    outBoxes.push(aabbM(F.M,Math.min(f.bot,f.bot-f.s*1.4),f.y0,0,Math.max(f.bot,f.bot-f.s*1.4),f.y0+2.2,D+0.4));   // where you step on
    if(f.arrive==='roof'){ const gp=outGap.get(dk(f.x,f.z,f.l,f.d)); outBoxes.push(aabbM(F.M,gp[0]-0.2,f.yt,-t-1.5,gp[1]+0.2,f.yt+1,0)); }
    if(f.l===0&&cellAt(Nx,Nz,0)===COURT) outCourt.set(Nx+Nz*NX,[nx,nz]);
    OUT.push(f); }
  // terraces where flights start, and terraces joined to a flight's roof landing (upper rooms open their door toward these)
  const outStart=new Set(OUT.map(f=>`${f.x+DIRS[f.d][0]},${f.z+DIRS[f.d][1]},${f.l}`)), outArrTerr=new Set();
  for(const f of OUT){ if(f.arrive!=='roof') continue; const k=f.l+1, q=[[f.x,f.z]]; outArrTerr.add(`${f.x},${f.z},${k}`);
    while(q.length){ const [a,b]=q.pop(); for(const [dx,dz] of DIRS){ const p=a+dx, r=b+dz, key=`${p},${r},${k}`; if(outArrTerr.has(key)||!OC.standable(p,r,k)||cellAt(p,r,k)!==EMPTY) continue; outArrTerr.add(key); q.push([p,r]); } } }
  const outStartTerr=new Set();
  for(const f of OUT){ const k=f.l, q=[[f.x+DIRS[f.d][0],f.z+DIRS[f.d][1]]]; if(k<1) continue; outStartTerr.add(`${q[0][0]},${q[0][1]},${k}`);
    while(q.length){ const [a,b]=q.pop(); for(const [dx,dz] of DIRS){ const p=a+dx, r=b+dz, key=`${p},${r},${k}`; if(outStartTerr.has(key)||!OC.standable(p,r,k)||cellAt(p,r,k)!==EMPTY) continue; outStartTerr.add(key); q.push([p,r]); } } }
  const outClear=(px,pz,y,r)=>!outBoxes.some(b=>px+r>b[0]&&px-r<b[3]&&pz+r>b[2]&&pz-r<b[5]&&y>b[1]-0.5&&y<b[4]);

  /* ---------- doors ---------- */
  const doors=new Set(); const dr=RNG(S.seed+'|doors');
  const hasGate=T.some(v=>v===GATE);
  const street=[];
  for(let z=0;z<NZ;z++) for(let x=0;x<NX;x++){
    const ty=cellAt(x,z,0); if(!enclosedT(ty)) continue;
    let courtDoor=null, any=false;
    for(let d=0;d<4;d++){ if(ty===GATE&&(R[idx(x,z,0)]===d||(R[idx(x,z,0)]+d)%2===1)) continue; const k=faceKind(x,z,0,d);   // a gate's side walls are lined by its portal niche
      if(outFace.has(dk(x,z,0,d))) continue;
      if(k==='court'||k==='porch'){ if(!courtDoor) courtDoor=d; if(dr.chance(0.7)){ doors.add(dk(x,z,0,d)); any=true; } }
      else if(k==='street'&&cellAt(x+DIRS[d][0],z+DIRS[d][1],0)!==TOWER) street.push([x,z,d]); }   // never a door into a tower's flank
    if(courtDoor!=null&&!any) doors.add(dk(x,z,0,courtDoor));
  }
  let hasStreetDoor=false;
  if(street.length){
    if(!hasGate){ let best=null, bs=-1; for(const s of street){ const sc=(s[2]===1?2:0)+(s[2]===0?1:0)+dr.f()+(cellAt(s[0]+DIRS[s[2]][0],s[1]+DIRS[s[2]][1],0)===-1?4:0); if(sc>bs){ bs=sc; best=s; } } doors.add(dk(best[0],best[1],0,best[2])); hasStreetDoor=true; }
    for(const s of street) if(dr.chance(hasGate?0.05:0.1)){ doors.add(dk(s[0],s[1],0,s[2])); hasStreetDoor=true; }
  }
  // a terrace door needs a roof you can stand on: not a dome, a stair head or a domed arcade bay
  const walkRoof=(x,z,l)=>{ const b=cellAt(x,z,l); return isMass(b)&&b!==DOME&&b!==STAIR&&!(b===ARC&&st.arcDomes)&&!hipCells.has(idx(x,z,l)); };
  for(let l=1;l<4;l++) for(let z=0;z<NZ;z++) for(let x=0;x<NX;x++){
    const ty=cellAt(x,z,l); if(ty!==ROOM&&ty!==DOME) continue;
    const opts=[]; for(let d=0;d<4;d++){ const nx=x+DIRS[d][0], nz=z+DIRS[d][1]; if(faceKind(x,z,l,d)==='street'&&cellAt(nx,nz,l)===EMPTY&&(walkRoof(nx,nz,l-1)||eaveTo(nx,nz,l-1,(d+2)%4))&&!outFace.has(dk(x,z,l,d))) opts.push(d); }
    const toward=set=>opts.filter(d=>set.has(`${x+DIRS[d][0]},${z+DIRS[d][1]},${l}`));
    const lead=toward(outStart), near=toward(outStartTerr), onArr=toward(outArrTerr);
    // a door onto the terrace the next flight leaves from, or onto roofs joined to it, or to a flight's landing
    const pick=lead.length?lead:near.length?near:onArr.length?onArr:opts;
    if(pick.length) doors.add(dk(x,z,l,lead.length?lead[0]:dr.pick(pick)));
  }
  for(const k of outArrive.keys()) doors.add(k);

  /* ---------- stair stacks: a U-stair packed against the wall OPPOSITE the entrance ----------
     local a: entrance wall (a=-SH) → far wall (a=+SH); local b: the two side walls.
     clear zone a∈[-SH,AS] along the entrance; doorways allowed on the entrance wall (centre)
     and both side walls (inside the clear zone); never on the far wall. */
  const dirIdx=(dx,dz)=>DIRS.findIndex(q=>q[0]===dx&&q[1]===dz);
  const SAXES=[[[1,0],[0,1]],[[0,1],[-1,0]],[[-1,0],[0,-1]],[[0,-1],[1,0]]];
  const stairInfo={};
  const SH=CW/2-t, AS=SH-2.25, SP0=SH-1.2, FA0=SH-1.0, B0=-SH+0.85, BL=SH-0.95, AF=(-SH+AS)/2;
  const entryNeed=(x,z,l,d)=>{ const nx=x+DIRS[d][0], nz=z+DIRS[d][1], nt=cellAt(nx,nz,l);
    if(enclosedT(nt)&&nt!==STAIR) return 3;
    if(nt===IWAN&&R[idx(nx,nz,l)]===d) return 3;
    if(nt===ARC) return 1.5;
    if(doors.has(dk(x,z,l,d))) return 2;
    return 0; };
  const exteriorFace=(x,z,l,d)=>{ const k=faceKind(x,z,l,d); return k==='street'||k==='court'||k==='porch'; };
  for(let c=0;c<NC;c++){ const x=c%NX, z=(c/NX)|0; if(cellAt(x,z,0)!==STAIR) continue;
    let n=0; while(n<4&&cellAt(x,z,n)===STAIR) n++;
    let best=0, bs=-1e9;
    for(let k=0;k<4;k++){ const [ax,bz]=SAXES[k], dp=dirIdx(-ax[0],-ax[1]), da=dirIdx(ax[0],ax[1]), dn=dirIdx(-bz[0],-bz[1]), db=dirIdx(bz[0],bz[1]);
      let sc=dr.f()*0.1;
      for(let l=0;l<n;l++){ sc-=entryNeed(x,z,l,da)*2; sc+=entryNeed(x,z,l,dp)*0.6; }
      if(exteriorFace(x,z,0,dp)) sc+=1;
      for(const dd of [dp,dn,db]){ const nx=x+DIRS[dd][0], nz=z+DIRS[dd][1]; if(isMass(cellAt(nx,nz,n-1))&&!isMass(cellAt(nx,nz,n))) sc+=0.8; }
      if(sc>bs){ bs=sc; best=k; } }
    const [ax,bz]=SAXES[best], dp=dirIdx(-ax[0],-ax[1]), da=dirIdx(ax[0],ax[1]), dn=dirIdx(-bz[0],-bz[1]), db=dirIdx(bz[0],bz[1]);
    stairInfo[`${x},${z}`]={k:best,ax,bz,dp,da,dn,db,n};
    for(let l=0;l<n;l++) doors.delete(dk(x,z,l,da));
    let entry=[dp,dn,db].some(dd=>entryNeed(x,z,0,dd)>=1.5);
    if(!entry) for(const dd of [dp,dn,db]) if(exteriorFace(x,z,0,dd)){ doors.add(dk(x,z,0,dd)); entry=true; break; }
    for(let l=1;l<n;l++) for(const dd of [dp,dn,db]){ const nx=x+DIRS[dd][0], nz=z+DIRS[dd][1], k=faceKind(x,z,l,dd);
      if((k==='street'&&cellAt(nx,nz,l)===EMPTY&&(walkRoof(nx,nz,l-1)||eaveTo(nx,nz,l-1,(dd+2)%4)))||k==='porch'){ doors.add(dk(x,z,l,dd)); break; } }
  }
  const stairLocal=(si,cx,cz,la,lb)=>[cx+si.ax[0]*la+si.bz[0]*lb, cz+si.ax[1]*la+si.bz[1]*lb];
  const uOf=(d,wx,wz)=>DIRS[d][1]*wx-DIRS[d][0]*wz;
  /* where a doorway may sit on face sd of a stair cell, in frame direction Fd: null = centre, false = never */
  const stairU=(si,cx,cz,sd,Fd)=>{ if(sd===si.da) return false; if(sd===si.dp) return null; const [wx,wz]=stairLocal(si,cx,cz,AF,sd===si.dn?-SH:SH); return uOf(Fd,wx,wz); };
  function stairDoorU(sx,sz,l,sd,Fd){ const si=stairInfo[`${sx},${sz}`]; if(!si) return null; const [cx,cz]=cellC(sx,sz); return stairU(si,cx,cz,sd,Fd); }
  function stairCell(x,z,l){ const si=stairInfo[`${x},${z}`]; if(!si) return; const [cx,cz]=cellC(x,z), y0=l*H, run=BL-B0, h1=Math.min(0.42*H,H-1.98), h2=H-h1;   // in low storeys the half-landing drops so the first flight keeps head height under the floor above
    const M=mm(mT(cx,y0,cz),mRY(-si.k*Math.PI/2));
    const sb=(k,a0,ya,b0,a1,yb,b1)=>{ B.box(k,a0,ya,b0,a1,yb,b1,M); colM(M,a0,ya,b0,a1,yb,b1); };
    const nA=Math.max(6,Math.round(h1/0.19)), nB=Math.max(8,Math.round(h2/0.19));
    for(let i=0;i<nA;i++) sb('stone',FA0,0,B0+i*run/nA,SH,(i+1)*h1/nA,B0+(i+1)*run/nA);
    sb('stone',AS,0,BL,SH,h1,SH);
    sb('trim',AS,h1,BL,AS+0.12,h1+0.9,SH);
    for(let i=0;i<nB;i++){ const top=h1+(i+1)*h2/nB, b1=BL-i*run/nB, b0=BL-(i+1)*run/nB;
      sb('stone',AS,l===0?0:top-0.3,b0,SP0,top,b1);
      sb('trim',AS,top,b0,AS+0.12,top+0.9,b1); }
    sb('trim',SP0,0,B0,FA0,H-0.25,BL);
    if(FT.lanterns&&l===0){ const [lx,lz]=stairLocal(si,cx,cz,AF,0); hangLamp(B,lx,y0+H-0.3,lz); }
  }
  function stairSlab(k,x,z,ya,yb,isTop){ const si=stairInfo[`${x},${z}`]; const [cx,cz]=cellC(x,z), h=CW/2-0.025;
    const M=mm(mT(cx,0,cz),mRY(-si.k*Math.PI/2)); const sb=(a0,b0,a1,b1)=>{ B.box(k,a0,ya,b0,a1,yb,b1,M); colM(M,a0,ya,b0,a1,yb,b1); };
    sb(-h,-h,AS,h); sb(AS,-h,h,B0); sb(SP0,B0,h,BL);
    const rl=(a0,b0,a1,b1)=>{ B.box('trim',a0,yb,b0,a1,yb+0.95,b1,M); colM(M,a0,yb,b0,a1,yb+0.95,b1); };
    rl(AS-0.12,B0,AS,h);
    if(isTop){ rl(SP0,B0,SP0+0.12,BL); rl(SP0+0.12,BL-0.12,h,BL); } }
  function stairHead(x,z,l){ const si=stairInfo[`${x},${z}`]; if(!si) return; const [cx,cz]=cellC(x,z), y=(l+1)*H, hh=2.6, th=0.35, wk=wallKey(l), da=st.arch.door==='flat'?'flat':'round';
    for(let d=0;d<4;d++){ const F=trimF(fr(cx,cz,d),()=>true), nx=x+DIRS[d][0], nz=z+DIRS[d][1];
      const roofed=isMass(cellAt(nx,nz,l))&&!isMass(cellAt(nx,nz,l+1)); let ops=[];
      const u=stairU(si,cx,cz,d,d);
      if(roofed&&u!==false){ const du=u==null?F.mid:u; ops=[{u0:du-0.5,u1:du+0.5,v0:y,vs:y+2.15-archRise(da,1.0),arch:da}].filter(o=>o.u0>F.uA+t&&o.u1<F.uB-t); }
      const [outer]=wallShape(F.uA,F.uB,y,y+hh,ops); B.ext(wk,outer,null,th,atF(F,0,0,-th)); colWall(F,F.uA,F.uB,y,y+hh,-th,0,ops);
      parapetRun(F,y+hh,true); }
    B.box(wk,cx-CW/2+0.02,y+hh-0.2,cz-CW/2+0.02,cx+CW/2-0.02,y+hh+0.04,cz+CW/2-0.02); colB(cx-CW/2+0.02,y+hh-0.2,cz-CW/2+0.02,cx+CW/2-0.02,y+hh+0.04,cz+CW/2-0.02);
    if(FT.lanterns){ const [lx,lz]=stairLocal(si,cx,cz,AF,0); hangLamp(B,lx,y+hh-0.2,lz); }
  }

  /* ---------- courts: groups & feature cells ---------- */
  const featureCells=new Set(); const courtAxis={};
  { const seen=new Set();
    for(let c=0;c<NC;c++){ if(T[c]!==COURT||TU[c]===PRIVY||seen.has(c)) continue; const grp=[], q=[c]; seen.add(c);
      while(q.length){ const k=q.pop(); grp.push(k); const x=k%NX, z=(k/NX)|0; for(const [dx,dz] of DIRS){ const ax=x+dx, az=z+dz; if(ax<0||ax>=NX||az<0||az>=NZ) continue; const n=ax+az*NX; if(T[n]===COURT&&TU[n]!==PRIVY&&!seen.has(n)){ seen.add(n); q.push(n); } } }
      const mx=grp.reduce((s,k)=>s+k%NX,0)/grp.length, mz=grp.reduce((s,k)=>s+((k/NX)|0),0)/grp.length;
      let best=grp[0], bd=1e9; for(const k of grp){ const d=(k%NX-mx)**2+(((k/NX)|0)-mz)**2; if(d<bd-1e-6){ bd=d; best=k; } }
      featureCells.add(best);
      const xs=new Set(grp.map(k=>k%NX)), zs=new Set(grp.map(k=>(k/NX)|0)); courtAxis[best]= xs.size>=zs.size? 'x':'z';
    } }

  /* ---------- hip roof cells (computed up front) ---------- */

  /* ---------- opening helpers ---------- */
  function mk(c,u,w,sill,h,arch,ex){ const r=archRise(arch,w); const v0=c.y0+sill; const mj=(ex&&ex.minJamb!=null)?ex.minJamb:0.25; return Object.assign({u0:u-w/2,u1:u+w/2,v0,vs:v0+Math.max(mj,h-r),arch},ex||{}); }
  function slots(c,n,door){ const a=c.uA+c.t+0.5, b=c.uB-c.t-0.5; const k=n+(door?1:0); if(k<=0) return {door:null,wins:[],sw:b-a};
    const sw=(b-a)/k, cs=[]; for(let i=0;i<k;i++) cs.push(a+sw*(i+0.5));
    let di=-1; if(door) di= k%2? (k-1)/2 : (c.rnd.chance(.5)? k/2-1 : k/2);
    if(door&&c.avoid){ const bad=u=>c.avoid.some(a=>u+0.85>a[0]&&u-0.85<a[1]); if(bad(cs[di])){ let bi=-1, bd=1e9; for(let i=0;i<k;i++) if(!bad(cs[i])&&Math.abs(i-di)<bd){ bd=Math.abs(i-di); bi=i; } if(bi>=0) di=bi; } }
    return {door:door?cs[di]:null, wins:cs.filter((_,i)=>i!==di), sw}; }
  const mul=(n,c)=>Math.min(Math.round(3*KS),Math.round(n*c.winMul*KS));
  const overlapOp=(p,o)=>{ const sp=archSpread(p.arch,p.u1-p.u0), so=archSpread(o.arch,o.u1-o.u0); return p.u0-sp<o.u1+so+0.07&&o.u0-so<p.u1+sp+0.07&&p.v0<openTop(o)+0.07&&o.v0<openTop(p)+0.07; };
  const clash=(ops,o)=>ops.some(p=>!p.nohole&&overlapOp(p,o));
  function fitOps(ops,c){ const out=[]; const lo=c.uA+c.t+0.08, hi=c.uB-c.t-0.08;
    for(const o of ops){ if(o.nohole){ out.push(o); continue; }
      const sp=archSpread(o.arch,o.u1-o.u0);
      if(!(o.u1>o.u0+0.05)||o.u0-sp<lo||o.u1+sp>hi) continue; if(openTop(o)>c.y1-0.12) continue; if(o.v0<c.y0-1e-3) continue;
      if(c.avoid&&o.fill!=='door'&&c.avoid.some(a=>o.u0<a[1]+0.05&&o.u1>a[0]-0.05)) continue;
      if(clash(out,o)) continue; out.push(o); }
    return out; }

  /* ---------- facade recipes per tradition ---------- */
  const FAC={
    najdi(c){ const o=[], g=c.l===0, K=c.kind;
      let n= K==='street'? (g? c.rnd.int(0,1):c.rnd.int(1,2)) : c.rnd.int(1,2); n=mul(n,c);
      const s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.1,0,2.15,'flat',{fill:'door',frame:FR('trim',.13,.05),lantern:true}));
      const w=Math.min(K==='street'?(g?.55:.65):.8, s.sw-.3), h=K==='street'?(g?.55:.75):1.0, sill=K==='street'?(g?2.0:1.15):.95;
      for(const u of s.wins) o.push(mk(c,u,w,sill,h,'flat',{fill:'glass',shutters:true,frame:FR('trim',.1,.05),sill:true}));
      const vy=c.H-0.78, a=c.uA+c.t+0.55, b=c.uB-c.t-0.55, nv=6;
      for(let i=0;i<nv;i++){ const u=a+(b-a)*(i+.5)/nv; const v=mk(c,u,.26,vy,archRise('triangle',.26),'triangle',{fill:'void',minJamb:0}); if(!clash(o,v)) o.push(v); }
      return o; },
    hejazi(c){ const o=[], g=c.l===0, K=c.kind;
      if(c.bayOK&&c.rnd.chance(.88)){ const a=c.uA+c.t+0.55, b=c.uB-c.t-0.55, two=c.rnd.chance(.35); const cs=two?[a+(b-a)*.25,a+(b-a)*.75]:[(a+b)/2]; const bw=two?1.45:Math.min(2.6,b-a-0.2);
        for(const u of cs) o.push({u0:u-bw/2,u1:u+bw/2,v0:c.y0+0.6,vs:c.y0+c.H-0.5,arch:'flat',fill:'glass',bay:st.bay}); return o; }
      let n=mul(K==='street'?(g?c.rnd.int(1,2):2):2,c); const s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,Math.min(1.5,s.sw-.3),0,2.7,'flat',{fill:'door',frame:FR('wood',.16,.08),lantern:true}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(.95,s.sw-.3),g?1.0:.7,g?1.3:1.75,'flat',{fill:'lattice',frame:FR('wood',.1,.06),sill:true,hood:true}));
      return o; },
    sanaani(c){ const o=[];
      if(c.l===0){ const s=slots(c,mul(2,c),c.door);
        if(s.door!=null) o.push(mk(c,s.door,1.25,0,2.55,'round',{fill:'door',fan:true,frame:FR('trim',.16,.05),lantern:true}));
        for(const u of s.wins) o.push(mk(c,u,.22,1.6,.75,'flat',{fill:'void',frame:FR('trim',.06,.03)}));
        return o; }
      const n=Math.min(3,mul(c.rnd.int(1,2)+(c.top?1:0),c)); const s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.0,0,2.3,'round',{fill:'door',fan:true,frame:FR('trim',.16,.05)}));
      const w=Math.min(c.l===1?.6:.78,s.sw-.4), h=c.l===1?.8:1.05, sill=c.l===1?1.0:.75;
      for(const u of s.wins){ const win=mk(c,u,w,sill,h,'flat',{fill:'glass',frame:FR('trim',.17,.05),sill:true,grille:c.l===1}); o.push(win);
        const fv=win.vs+0.14, fw=w+0.06; o.push({u0:u-fw/2,u1:u+fw/2,v0:fv,vs:fv,arch:'round',fill:'qamar',frame:FR('trim',.13,.065)}); }
      return o; },
    persian(c){ const o=[], g=c.l===0, K=c.kind;
      if(K==='street'&&g){ const s=slots(c,mul(2,c),c.door);
        if(s.door!=null) o.push(mk(c,s.door,1.35,0,2.8,'fourc',{fill:'door',frame:FR('stone',.12,.06),alfiz:true,lantern:true}));
        for(const u of s.wins) o.push(mk(c,u,Math.min(1.0,s.sw-.4),.55,2.3,'fourc',{fill:FT.panels?'tile':'wall',depth:.3,alfiz:FT.panels}));
        return o; }
      if(c.bayOK&&c.rnd.chance(.4)){ const u=(c.uA+c.uB)/2; o.push(mk(c,u,1.3,0.06,2.6,'fourc',{fill:'stained',frame:FR('stone',.1,.05),alfiz:true})); o.push({nohole:true,bay:'balcony',u0:u-0.65,u1:u+0.65,v0:c.y0+0.06,vs:c.y0+2.6,arch:'flat'}); return o; }
      const n=mul(K==='street'?2:c.rnd.int(2,3),c); const s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.25,0,2.8,'fourc',{fill:'door',frame:FR('stone',.12,.06),alfiz:true}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(1.05,s.sw-.4),g?.4:.55,g?2.6:2.2,'fourc',{fill:'stained',lattice:true,frame:FR('stone',.1,.05),alfiz:true,sill:true}));
      return o; },
    yazdi(c){ const o=[], g=c.l===0, K=c.kind;
      if(K==='street'&&g){ const n=mul(c.rnd.int(1,2),c), s=slots(c,n,c.door);
        if(s.door!=null) o.push(mk(c,s.door,1.2,0,2.4,'fourc',{fill:'door',frame:FR('trim',.1,.05),benches:true,knockers:true,lantern:true}));
        s.wins.forEach((u,i)=>{ if(i%2===0) o.push(mk(c,u,Math.min(.9,s.sw-.4),.4,2.0,'fourc',{fill:'wall',depth:.32})); else o.push(mk(c,u,.45,2.4,.6,'fourc',{fill:'lattice',frame:FR('trim',.08,.04)})); });
        return o; }
      if(K==='court'||K==='porch'){ const n=mul(c.rnd.int(2,3),c), s=slots(c,n,c.door);
        if(s.door!=null) o.push(mk(c,s.door,1.1,0,2.5,'fourc',{fill:'door',frame:FR('trim',.1,.05)}));
        for(const u of s.wins) o.push(mk(c,u,Math.min(.95,s.sw-.4),.3,2.5,'fourc',{fill:'stained',lattice:true,frame:FR('trim',.1,.05)}));
        return o; }
      const n=mul(c.rnd.int(1,2),c), s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.0,0,2.3,'fourc',{fill:'door',frame:FR('trim',.1,.05)}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(.8,s.sw-.4),.8,1.4,'fourc',{fill:'lattice',frame:FR('trim',.08,.04)}));
      return o; },
    mamluk(c){ const o=[], g=c.l===0, K=c.kind;
      if(c.bayOK&&c.rnd.chance(.55)){ const u=(c.uA+c.uB)/2; o.push({u0:u-0.95,u1:u+0.95,v0:c.y0+0.75,vs:c.y0+0.75+2.1,arch:'flat',fill:'glass',bay:'mashrabiya'}); return o; }
      if(g){ const n=mul(K==='street'?2:c.rnd.int(1,2),c), s=slots(c,n,c.door);
        if(s.door!=null) o.push(mk(c,s.door,1.3,0,2.4,'flat',{fill:'door',frame:FR('stone',.14,.06),vous:true,lantern:true}));
        for(const u of s.wins) o.push(K==='street'? mk(c,u,Math.min(.85,s.sw-.4),1.25,1.25,'flat',{fill:'glass',grille:true,frame:FR('stone',.12,.05),vous:true,sill:true})
                                                : mk(c,u,Math.min(.9,s.sw-.4),.9,1.5,'flat',{fill:'lattice',frame:FR('stone',.1,.05),sill:true}));
        return o; }
      const n=mul(c.rnd.int(1,2),c), s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.1,0,2.3,'flat',{fill:'door',frame:FR('stone',.1,.05)}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(1.5,s.sw-.3),.45,c.H-1.15,'flat',{fill:'wall',depth:.28,mamlukPanel:true}));
      return o; },
    ottoman(c){ const o=[], g=c.l===0;
      if(c.bayOK&&c.rnd.chance(.6)){ const u=(c.uA+c.uB)/2; o.push({u0:u-1.3,u1:u+1.3,v0:c.y0+0.3,vs:c.y0+c.H-0.45,arch:'flat',fill:'glass',bay:'cumba'}); return o; }
      const n=mul(2,c), s=slots(c,n,c.door);
      if(g){ if(s.door!=null) o.push(mk(c,s.door,1.3,0,2.8,'pointed',{fill:'door',frame:FR('stone',.16,.07),lantern:true,vous:FT.ablaq}));
        for(const u of s.wins) o.push(mk(c,u,Math.min(.9,s.sw-.4),.9,1.5,'flat',{fill:'glass',grille:true,frame:FR('stone',.13,.06),sill:true,tymp:true}));
        return o; }
      if(s.door!=null) o.push(mk(c,s.door,1.1,0,2.5,'pointed',{fill:'door',frame:FR('stone',.12,.06)}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(.75,s.sw-.4),1.0,1.65,'pointed',{fill:'glass',frame:FR('stone',.12,.06),sill:true}));
      return o; },
    levantine(c){ const o=[], g=c.l===0, K=c.kind;
      if(g){ const n=mul(K==='street'?c.rnd.int(1,2):2,c), s=slots(c,n,c.door);
        if(s.door!=null) o.push(mk(c,s.door,1.25,0,2.6,'round',{fill:'door',frame:FR('stone',.15,.06),vous:true,lantern:true}));
        for(const u of s.wins) o.push(K==='street'? mk(c,u,Math.min(.8,s.sw-.4),1.15,1.3,'flat',{fill:'glass',grille:true,frame:FR('stone',.12,.05),sill:true})
                                                : mk(c,u,Math.min(.9,s.sw-.4),.7,1.8,'round',{fill:'glass',shutters:true,frame:FR('stone',.1,.05),sill:true}));
        return o; }
      if(K==='street'&&!c.door&&c.winMul>0&&(c.rnd.chance(.6)||c.top)){
        const mid=(c.uA+c.uB)/2, ww=.62, gap=.2, bal=c.bayOK; const sill=bal?0.08:0.55;
        [-1,0,1].forEach(k=>o.push(mk(c,mid+k*(ww+gap),ww,sill,bal?2.5:2.05,'round',{fill:'glass',frame:FR('stone',.07,.05),col:k<1})));
        if(bal) o.push({nohole:true,bay:'balcony',u0:mid-1.35,u1:mid+1.35,v0:c.y0+0.06,vs:c.y0+2.5,arch:'flat'});
        return o; }
      const n=mul(2,c), s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.1,0,2.4,'round',{fill:'door',frame:FR('stone',.12,.05)}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(.8,s.sw-.4),.65,1.8,'round',{fill:'glass',shutters:true,frame:FR('stone',.1,.05),sill:true}));
      return o; },
    khaleeji(c){ const o=[], g=c.l===0, K=c.kind;
      if(c.bayOK&&c.rnd.chance(.5)){ const u=(c.uA+c.uB)/2; o.push({u0:u-1.1,u1:u+1.1,v0:c.y0+0.6,vs:c.y0+c.H-0.55,arch:'flat',fill:'glass',bay:'rawasheen'}); return o; }
      if(g&&K==='street'){ const n=mul(c.rnd.int(1,2),c), s=slots(c,n,c.door);
        if(s.door!=null) o.push(mk(c,s.door,1.3,0,2.4,'flat',{fill:'door',frame:FR('trim',.14,.05),lantern:true}));
        for(const u of s.wins) o.push(mk(c,u,Math.min(.7,s.sw-.4),1.1,1.0,'flat',{fill:'glass',shutters:true,frame:FR('wood',.08,.05),sill:true}));
        return o; }
      const n=mul(c.rnd.int(2,3),c), s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.1,0,2.4,'flat',{fill:'door',frame:FR('wood',.08,.05)}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(1.05,s.sw-.25),.25,c.H-.75,'pointed',{fill:'wall',depth:.2,khNiche:true}));
      return o; },
    /* ---- Asia ---- */
    siheyuan(c){ const o=[], g=c.l===0, pk=st.timber.post;
      if(c.kind==='street'){ const s=slots(c,mul(g?c.rnd.int(0,2):c.rnd.int(1,2),c),c.door);
        if(s.door!=null) o.push(mk(c,s.door,1.25,0,2.3,'flat',{fill:'door',frame:FR(pk,.14,.07),lantern:true,knockers:true}));
        for(const u of s.wins) o.push(g? mk(c,u,Math.min(.75,s.sw-.4),2.0,.55,'flat',{fill:'paper',frame:FR('stone',.08,.05)})
                                       : mk(c,u,Math.min(.95,s.sw-.4),.85,1.1,'flat',{fill:'paper',frame:FR(pk,.09,.05),sill:true}));
        return o; }
      return hallFront(c,{door:1.2,dh:2.45,sill:.8,top:.55,ww:1.3,fill:'paper',frame:FR(pk,.08,.06)}); },
    jiangnan(c){ const o=[], g=c.l===0, pk=st.timber.post;
      if(c.kind==='street'){ const s=slots(c,mul(g?c.rnd.int(0,2):c.rnd.int(1,2),c),c.door);
        if(s.door!=null) o.push(mk(c,s.door,1.2,0,2.3,'flat',{fill:'door',frame:FR('stone',.16,.06),lantern:true}));
        for(const u of s.wins) o.push(g? mk(c,u,.8,1.15,archRise('moon',.8)+0.05,'moon',{fill:'lattice',frame:FR('trim',.08,.04),minJamb:0.05})
                                       : mk(c,u,Math.min(.95,s.sw-.4),.8,1.15,'flat',{fill:'paper',frame:FR(pk,.08,.05),sill:true}));
        return o; }
      return hallFront(c,{door:1.15,dh:2.4,sill:.45,top:.5,ww:1.3,fill:'paper',frame:FR(pk,.07,.05)}); },
    kyoto(c){ const o=[], g=c.l===0;
      if(c.kind==='street'){
        if(g){ const s=slots(c,mul(2,c),c.door);
          if(s.door!=null) o.push(mk(c,s.door,1.1,0,2.15,'flat',{fill:'door',frame:FR('wood',.1,.06),lantern:true}));
          for(const u of s.wins) o.push(mk(c,u,Math.min(1.35,s.sw-.25),.35,1.8,'flat',{fill:'lattice',frame:FR('wood',.08,.07)}));   // koshi
          return o; }
        const s=slots(c,mul(c.rnd.int(1,2),c),c.door);
        if(s.door!=null) o.push(mk(c,s.door,1.0,0,2.1,'flat',{fill:'door',frame:FR('wood',.08,.05)}));
        for(const u of s.wins) o.push(c.top? mk(c,u,Math.min(1.1,s.sw-.4),1.0,.6,'flat',{fill:'lattice',frame:FR('trim',.1,.06)})   // mushiko-mado
                                           : mk(c,u,Math.min(1.1,s.sw-.4),.75,1.1,'flat',{fill:'paper',frame:FR('wood',.07,.05),sill:true}));
        return o; }
      return hallFront(c,{door:1.1,dh:2.1,sill:.25,top:.5,ww:1.35,fill:'paper',frame:FR('wood',.06,.05)}); },
    hanok(c){ const o=[];
      if(c.kind==='street'){ const s=slots(c,mul(c.rnd.int(0,2),c),c.door);
        if(s.door!=null) o.push(mk(c,s.door,1.15,0,2.15,'flat',{fill:'door',frame:FR('wood',.1,.06),lantern:true}));
        for(const u of s.wins) o.push(mk(c,u,Math.min(.7,s.sw-.4),1.35,.7,'flat',{fill:'paper',frame:FR('wood',.07,.05)}));
        return o; }
      return hallFront(c,{door:1.05,dh:2.0,sill:.7,top:.75,ww:.95,fill:'paper',frame:FR('wood',.07,.05)}); },
    haveli(c){ const o=[], g=c.l===0, K=c.kind;
      if(c.bayOK&&c.rnd.chance(.7)){ const a=c.uA+c.t+0.55, b=c.uB-c.t-0.55, two=c.rnd.chance(.45), cs=two?[a+(b-a)*.2,a+(b-a)*.8]:[(a+b)/2], bw=two?1.15:1.7;
        for(const u of cs) o.push({u0:u-bw/2,u1:u+bw/2,v0:c.y0+0.55,vs:c.y0+Math.min(2.55,c.H-0.75),arch:'flat',fill:'lattice',bay:'jharokha'});
        if(two) o.push(mk(c,(a+b)/2,.5,1.1,1.25,'cusped',{fill:'lattice',frame:FR('stone',.08,.05)}));
        return o; }
      const n=mul(K==='street'&&g?c.rnd.int(1,2):c.rnd.int(2,3),c), s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,g?1.3:1.1,0,g?2.6:2.35,'cusped',{fill:'door',frame:FR('stone',.16,.07),lantern:g}));
      for(const u of s.wins) o.push(K==='street'&&g? mk(c,u,Math.min(.6,s.sw-.4),1.3,1.0,'cusped',{fill:'lattice',frame:FR('stone',.1,.06),sill:true})
                                                  : mk(c,u,Math.min(.85,s.sw-.4),.55,1.75,'cusped',{fill:'lattice',frame:FR('stone',.1,.06),sill:true}));
      return o; },
    newar(c){ const o=[], g=c.l===0, fw=FR('wood',.18,.1);
      if(c.kind==='street'&&g){ const s=slots(c,mul(c.rnd.int(1,2),c),c.door);
        if(s.door!=null) o.push(mk(c,s.door,1.05,0,1.95,'flat',{fill:'door',frame:fw,lantern:true,ears:true}));
        for(const u of s.wins) o.push(mk(c,u,Math.min(1.3,s.sw-.4),.45,1.35,'flat',{fill:'lattice',frame:FR('wood',.12,.08)}));   // pasa shop front
        return o; }
      if(c.bayOK&&c.top&&c.rnd.chance(.75)){ const m=(c.uA+c.uB)/2, bw=Math.min(3.0,c.uB-c.uA-2*c.t-1.4); o.push({u0:m-bw/2,u1:m+bw/2,v0:c.y0+0.55,vs:c.y0+Math.min(1.75,c.H-0.75),arch:'flat',fill:'lattice',bay:'newar'}); return o; }
      const s=slots(c,mul(c.kind==='street'?c.rnd.int(1,3):2,c),c.door);
      if(s.door!=null) o.push(mk(c,s.door,.95,0,1.95,'flat',{fill:'door',frame:fw,ears:true}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(.8,s.sw-.9),.6,Math.min(1.1,c.H-1.2),'flat',{fill:'lattice',frame:fw,sill:true,ears:true}));
      return o; },
    tibetan(c){ const o=[], g=c.l===0, K=c.kind;
      const s=slots(c,mul(g&&K==='street'?c.rnd.int(0,2):c.rnd.int(1,3),c),c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.15,0,1.95,'flat',{fill:'door',frame:FR('paint',.1,.06),lantern:g,tibet:true}));
      for(const u of s.wins) o.push(g&&K==='street'? mk(c,u,.4,1.45,.55,'flat',{fill:'void',frame:FR('wood',.05,.04),tibet:true})
                                                  : mk(c,u,Math.min(c.top?1.1:.9,s.sw-.7),.7,1.1,'flat',{fill:'glass',frame:FR('paint',.06,.05),tibet:true,mull:true}));
      return o; },
    thai(c){ const o=[], g=c.l===0;
      const s=slots(c,mul(c.rnd.int(1,2)+(c.kind==='court'?1:0),c),c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.0,0,2.1,'flat',{fill:'door',frame:FR('wood',.1,.06),lantern:g}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(.8,s.sw-.4),.55,1.35,'flat',{fill:'void',shutters:true,shutK:'wood',frame:FR('wood',.09,.06),sill:true,hood:true}));
      return o; },
    bali(c){ const o=[];
      const s=slots(c,mul(c.kind==='street'?c.rnd.int(0,1):c.rnd.int(1,2),c),c.door);
      if(s.door!=null) o.push(mk(c,s.door,.95,0,2.05,'flat',{fill:'door',frame:FR('stone',.18,.1),lantern:true,crown:true}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(.7,s.sw-.4),.95,.85,'flat',{fill:'lattice',frame:FR('stone',.12,.07),sill:true}));
      return o; },
    /* ---- Europe, Africa, the Americas, the Pacific ---- */
    roman(c){ const o=[], g=c.l===0, K=c.kind;
      if(K==='street'&&g){ const s=slots(c,mul(c.rnd.int(0,2),c),c.door);   // blank street walls: a pedimented door, little barred windows high up
        if(s.door!=null) o.push(mk(c,s.door,1.25,0,2.6,'flat',{fill:'door',frame:FR('stone',.16,.08),lantern:true,ped:'tri'}));
        for(const u of s.wins) o.push(mk(c,u,.5,2.05,.5,'flat',{fill:'void',grille:true,frame:FR('stone',.07,.04)}));
        return o; }
      if(c.bayOK&&c.rnd.chance(.35)){ const u=(c.uA+c.uB)/2; o.push(mk(c,u,1.0,0.06,2.3,'flat',{fill:'glass',shutters:true,shutK:'wood',frame:FR('stone',.1,.05)})); o.push({nohole:true,bay:'balcony',u0:u-1.1,u1:u+1.1,v0:c.y0+0.06,vs:c.y0+2.3,arch:'flat'}); return o; }   // a timber maenianum
      const n=mul(K==='street'?c.rnd.int(1,2):2,c), s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.15,0,2.5,'flat',{fill:'door',frame:FR('stone',.12,.06)}));
      for(const u of s.wins) o.push(K==='street'? mk(c,u,Math.min(.7,s.sw-.4),1.05,1.05,'flat',{fill:'glass',shutters:true,shutK:'wood',frame:FR('stone',.1,.05),sill:true})
                                    : mk(c,u,Math.min(.95,s.sw-.4),.55,1.75,'flat',{fill:'glass',shutters:true,shutK:'wood',frame:FR('stone',.1,.05),sill:true}));
      return o; },
    turkish(c){ const o=[], g=c.l===0, K=c.kind;
      if(g){ const s=slots(c,mul(K==='street'?c.rnd.int(0,1):c.rnd.int(1,2),c),c.door);   // the stone ground floor: a big yard door, small barred windows
        if(s.door!=null) o.push(mk(c,s.door,1.45,0,2.6,'round',{fill:'door',frame:FR('stone',.16,.06),lantern:true}));
        for(const u of s.wins) o.push(mk(c,u,.55,1.6,.65,'flat',{fill:'glass',grille:true,frame:FR('wood',.08,.05)}));
        return o; }
      if(c.bayOK&&c.rnd.chance(.6)){ const u=(c.uA+c.uB)/2, bw=Math.min(3.0,c.uB-c.uA-2*c.t-1.0); o.push({u0:u-bw/2,u1:u+bw/2,v0:c.y0+0.3,vs:c.y0+c.H-0.45,arch:'flat',fill:'glass',bay:'cumba'}); return o; }
      const n=mul(c.rnd.int(2,3),c), s=slots(c,n,c.door), kaf=c.rnd.chance(.3);
      if(s.door!=null) o.push(mk(c,s.door,1.0,0,2.2,'flat',{fill:'door',frame:FR('wood',.1,.05)}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(.7,s.sw-.35),.55,Math.min(1.55,c.H-1.3),'flat',{fill:kaf?'lattice':'glass',frame:FR('wood',.09,.05),sill:true,sash:kaf?0:1,sashK:'wood'}));
      return o; },
    victorian(c){ const o=[], g=c.l===0, K=c.kind;
      if(c.bayOK&&c.rnd.chance(.55)){ const u=(c.uA+c.uB)/2, bw=Math.min(2.5,c.uB-c.uA-2*c.t-1.2); o.push({u0:u-bw/2,u1:u+bw/2,v0:c.y0+0.25,vs:c.y0+c.H-0.4,arch:'flat',fill:'glass',bay:'canted'}); return o; }
      const n=mul(K==='street'?2:c.rnd.int(1,2),c), s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.1,0,2.6,g?'round':'flat',{fill:'door',fan:g,frame:FR('stone',.14,.06),lantern:g}));
      const ww=Math.min(.95,s.sw-.45), tall=Math.min(g?2.05:1.85,c.H-1.3);
      for(const u of s.wins) o.push(mk(c,u,ww,g?.75:.7,tall,'flat',{fill:'glass',sash:2,frame:FR('stone',.12,.06),sill:true,ped:g?'tri':'seg'}));
      return o; },
    cycladic(c){ const o=[], g=c.l===0, K=c.kind;
      const n=mul(K==='street'?c.rnd.int(0,1)+(g?0:1):c.rnd.int(1,2),c), s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.0,0,2.15,c.rnd.chance(.35)?'round':'flat',{fill:'door',frame:FR('trim',.1,.04),lantern:g}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(.65,s.sw-.4),1.0,.85,'flat',{fill:'glass',shutters:true,frame:FR('trim',.07,.03),sill:true}));
      if(K==='street'&&c.rnd.chance(.4)){ const v=mk(c,(c.uA+c.uB)/2+c.rnd.range(-1,1),.28,c.H-0.95,.34,'round',{fill:'void',minJamb:0.1}); if(!clash(o,v)) o.push(v); }
      return o; },
    tudor(c){ const o=[], g=c.l===0, K=c.kind;
      if(c.bayOK&&c.rnd.chance(.5)){ const u=(c.uA+c.uB)/2, bw=Math.min(2.6,c.uB-c.uA-2*c.t-1.2); o.push({u0:u-bw/2,u1:u+bw/2,v0:c.y0+0.4,vs:c.y0+c.H-0.4,arch:'flat',fill:'lattice',bay:'oriel'}); return o; }
      const n=mul(c.rnd.int(1,2),c), s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.05,0,2.25,g?'fourc':'flat',{fill:'door',frame:FR('wood',.14,.06),lantern:g,ped:g?'label':null}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(1.5,s.sw-.45),g?.85:.8,Math.min(1.15,c.H-1.45),'flat',{fill:'lattice',frame:FR('wood',.12,.06),sill:true,mull:true,ped:g&&K==='street'?'label':null}));
      return o; },
    russian(c){ const o=[], g=c.l===0, K=c.kind;
      const n=mul(K==='street'?(g?c.rnd.int(1,2):c.rnd.int(2,3)):2,c), s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.0,0,2.1,'flat',{fill:'door',frame:FR('paint',.14,.05),lantern:g}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(.7,s.sw-.65),.85,Math.min(1.05,c.H-1.85),'flat',{fill:'glass',frame:FR('paint',.13,.05),sill:true,shutters:c.rnd.chance(.6),shutK:'paint2',ped:'kok',pedK:'paint',sash:1,sashK:'paint'}));
      return o; },
    sahel(c){ const o=[], g=c.l===0, K=c.kind;
      const n=mul(K==='street'?c.rnd.int(0,2):c.rnd.int(1,2),c), s=slots(c,n,c.door);
      if(s.door!=null) o.push(mk(c,s.door,1.05,0,2.1,'flat',{fill:'door',frame:FR('wood',.1,.06)}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(.55,s.sw-.5),g?1.45:.95,.7,'flat',{fill:K==='street'?'lattice':'void',frame:FR('wood',.08,.05),shutters:K!=='street',shutK:'wood'}));
      return o; },
    maya(c){ const o=[], K=c.kind, span=c.uB-c.uA-2*c.t-1.0, k=Math.max(1,Math.min(Math.floor(span/1.65),mul(K==='street'||K==='court'?c.rnd.int(1,3):1,c))), s=slots(c,k-1,true);   // a row of doorways and no windows
      for(const u of [s.door,...s.wins]){ if(u==null) continue; const dw=Math.min(1.2,s.sw-.45);
        o.push(mk(c,u,dw,0,2.1,'flat',{fill:u===s.door&&c.door?'door':'void',frame:FR('stone',.16,.08)})); }
      return o; },
    pueblo(c){ const o=[], s=slots(c,mul(c.rnd.int(0,2),c),c.door);
      if(s.door!=null) o.push(mk(c,s.door,.9,0,1.85,'flat',{fill:'door',frame:FR('wood',.1,.05)}));
      for(const u of s.wins) o.push(mk(c,u,.5,1.1,.55,'flat',{fill:'glass',frame:FR('wood',.08,.05),sill:true}));
      return o; },
    palau(c){ const o=[], s=slots(c,mul(c.rnd.int(1,2),c),c.door);
      if(s.door!=null) o.push(mk(c,s.door,.95,0,1.95,'flat',{fill:'door',frame:FR('wood',.12,.06)}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(1.0,s.sw-.4),.55,.75,'flat',{fill:'void',frame:FR('wood',.1,.06),sill:true}));
      return o; },
    /* ---- the ancient sites: openings as they were built, before the filter takes them down ---- */
    greek(c){ const o=[], s=slots(c,mul(c.kind==='street'?c.rnd.int(0,1):c.rnd.int(0,2),c),c.door);   // blank cella walls, one tall doorway, the odd small window
      if(s.door!=null) o.push(mk(c,s.door,Math.min(1.6,s.sw-.3),0,Math.min(3.4,c.H-0.9),'flat',{fill:'door',frame:FR('stone',.22,.1)}));
      for(const u of s.wins) o.push(mk(c,u,.6,1.7,.95,'flat',{frame:FR('stone',.1,.06)}));
      return o; },
    thermae(c){ const o=[], s=slots(c,mul(c.rnd.int(1,2),c),c.door);   // great round-arched windows high in the brick, arched doorways
      if(s.door!=null) o.push(mk(c,s.door,Math.min(1.5,s.sw-.3),0,Math.min(3.0,c.H-0.8),'round',{fill:'door'}));
      for(const u of s.wins){ const w=Math.min(1.7,s.sw-.4); o.push(mk(c,u,w,Math.min(1.6,c.H-w/2-1.6),Math.min(2.4,c.H-1.0-Math.min(1.6,c.H-w/2-1.6)),'round',{})); }
      return o; },
    egypt(c){ const o=[], s=slots(c,mul(c.kind==='street'?0:c.rnd.int(0,1),c),c.door);   // a framed doorway under a cavetto lintel; at most a slit of a clerestory window
      if(s.door!=null) o.push(mk(c,s.door,Math.min(1.4,s.sw-.4),0,Math.min(3.0,c.H-1.0),'flat',{fill:'door',frame:FR('stone',.28,.12)}));
      for(const u of s.wins) o.push(mk(c,u,.5,c.H-1.25,.55,'flat',{frame:FR('stone',.08,.05)}));
      return o; },
    mesop(c){ const o=[], s=slots(c,mul(c.rnd.int(0,1),c),c.door);   // arched doorways in recessed frames; tiny vents high up
      if(s.door!=null) o.push(mk(c,s.door,Math.min(1.25,s.sw-.4),0,2.5,'round',{fill:'door',frame:FR('base',.2,.12)}));
      for(const u of s.wins) o.push(mk(c,u,.35,c.H-1.0,.45,'flat',{}));
      return o; },
    achaemenid(c){ const o=[], s=slots(c,mul(c.rnd.int(1,2),c),c.door);   // heavy stone frames for every door, window and niche: the frames outlived the mud-brick between them
      if(s.door!=null) o.push(mk(c,s.door,Math.min(1.3,s.sw-.5),0,Math.min(3.2,c.H-1.2),'flat',{fill:'door',frame:FR('rframe',.32,.22)}));
      for(const u of s.wins){ const nic=c.kind==='inner'||c.rnd.chance(.4); o.push(mk(c,u,Math.min(.95,s.sw-.6),nic?.15:.8,Math.min(2.4,c.H-1.6),'flat',nic?{fill:'wall',depth:.3,frame:FR('rframe',.26,.2)}:{frame:FR('rframe',.26,.2)})); }
      return o; },
    khmer(c){ const o=[], s=slots(c,mul(c.rnd.int(1,2),c),c.door);   // framed doorways and windows filled with turned stone balusters
      if(s.door!=null) o.push(mk(c,s.door,Math.min(1.1,s.sw-.4),0,2.3,'flat',{fill:'door',frame:FR('stone',.18,.1)}));
      for(const u of s.wins) o.push(mk(c,u,Math.min(.9,s.sw-.5),.75,1.15,'flat',{frame:FR('stone',.14,.08),sill:true}));
      return o; },
    inca(c){ const o=[], s=slots(c,mul(c.rnd.int(0,2),c),c.door);   // trapezoid doors and windows, jambs leaning to a narrow lintel
      if(s.door!=null) o.push(mk(c,s.door,1.05,0,2.15,'trap',{fill:'door',minJamb:0.05}));
      for(const u of s.wins) o.push(mk(c,u,.5,1.05,1.0,'trap',{minJamb:0.05}));
      return o; },
    nanmadol(c){ const o=[], s=slots(c,0,c.door);   // a gap through the basalt and nothing else
      if(s.door!=null) o.push(mk(c,s.door,1.4,0,Math.min(2.4,c.H-0.5),'flat',{fill:'door'}));
      return o; },
    zimbabwe(c){ const o=[], s=slots(c,0,c.door);   // narrow passages through dry-stone walls
      if(s.door!=null) o.push(mk(c,s.door,1.0,0,Math.min(2.3,c.H-0.5),'flat',{fill:'door'}));
      return o; }
  };
  /* a timber hall front onto the yard: bays of papered lattice between posts, the door in one of them */
  function hallFront(c,cf){ const o=[], s=slots(c,mul(2,c),c.door), top=c.y0+c.H-cf.top;
    if(s.door!=null) o.push(mk(c,s.door,Math.min(cf.door,s.sw-.3),0,Math.min(cf.dh,c.H-cf.top-0.1),'flat',{fill:'door',frame:cf.frame,lantern:c.l===0}));
    for(const u of s.wins){ const w=Math.min(cf.ww,s.sw-.35); o.push(mk(c,u,w,cf.sill,top-(c.y0+cf.sill),'flat',{fill:cf.fill,frame:cf.frame,sill:true})); }
    return o; }
  const frK=()=>ASIA? (st.id==='haveli'||st.id==='bali'?'stone':(st.timber&&st.timber.post)||'wood') : null;
  function innerOps(c){ const o=[]; const s=slots(c,mul(2,c),c.door); const da=st.arch.door, na=st.arch.niche;
    if(s.door!=null) o.push(mk(c,c.doorU!=null?c.doorU:s.door,1.2,0,2.5,da,{fill:c.openOnly?undefined:'door',hangOut:!!c.hangOut,frame:FR(frK()||(st.fac==='najdi'?'trim':'stone'),.12,.05)}));
    for(const u of s.wins) o.push(mk(c,u,Math.min(.9,s.sw-.4),.6,Math.min(2.2,c.H-1.2),na,{fill:FT.panels?'tile':'wall',depth:.25,minJamb:na==='triangle'?0.4:0.25}));
    return o; }
  function stairOps(c){ const o=[]; const si=stairInfo[`${c.x},${c.z}`];
    if(c.door&&si){ const [cx,cz]=cellC(c.x,c.z); let u=stairU(si,cx,cz,c.d,c.fd);
      if(u!==false){ if(u==null) u=(c.uA+c.uB)/2; const da=st.arch.door, dw=Math.min(1.25,(c.uB-c.uA)/2-c.t-0.4);
        o.push(mk(c,u,dw,0,Math.min(2.45,c.H-0.6),da,{fill:'door',frame:FR(frK()||(st.fac==='najdi'||st.fac==='sanaani'||st.fac==='khaleeji'?'trim':'stone'),.12,.05),lantern:c.l===0,knockers:st.id==='yazdi'})); } }
    if(c.kind==='street'||c.kind==='court'){ const a=c.uA+c.t+0.7, b=c.uB-c.t-0.7;
      [[a+(b-a)*0.25,0.7],[a+(b-a)*0.75,c.H*0.55]].forEach(([u,sill])=>{ const v=mk(c,u,.38,sill,.75,st.arch.niche==='triangle'||st.arch.niche==='moon'?'flat':st.arch.niche,{fill:ASIA?'lattice':'void',frame:FR(frK()||(st.fac==='najdi'||st.fac==='sanaani'?'trim':'stone'),.06,.04)}); if(!clash(o,v)) o.push(v); }); }
    return o; }

  /* ---------- dressing: fills, frames, extras ---------- */
  function dressOps(F,ops,c){
    const tt=c.t;
    for(const o of ops){
      if(o.bay){ bay(F,o,c); if(o.nohole) continue; }
      const top=openTop(o), w=o.u1-o.u0;
      switch(o.fill){
        case 'glass': B.flat('glass',openPoly(o),atF(F,0,0,-tt*0.55)); break;
        case 'void': B.flat('void',openPoly(o),atF(F,0,0,-tt*0.5)); break;
        case 'qamar': B.flat('qamar',openPoly(o),atF(F,0,0,-tt*0.35),(x,y)=>[(x-o.u0)/w,(y-o.v0)/(w/2)]); break;
        case 'lattice': B.flat('glass',openPoly(o),atF(F,0,0,-tt*0.6)); B.flat('lattice',openPoly(o),atF(F,0,0,-0.07)); break;
        case 'paper': B.flat('paper',openPoly(o),atF(F,0,0,-tt*0.5)); B.flat('lattice',openPoly(o),atF(F,0,0,-0.05)); break;
        case 'stained': B.flat('stained',openPoly(o),atF(F,0,0,-tt*0.5)); if(o.lattice) B.flat('lattice',openPoly(o),atF(F,0,0,-0.07)); break;
        case 'door': {
          // leaves are hinged objects built after the merge; the painted designs are two-leaf, so most doors are pairs
          const hh=(o.fan?o.vs:top)-o.v0;
          const poly= o.fan? [[0,0],[w,0],[w,hh],[0,hh]] : openPoly(o).map(p=>[p[0]-o.u0,p[1]-o.v0]);
          // leaves hang at the inner face (as in thick masonry) so they can fold back flat against the wall
          if(o.fan&&o.arch!=='flat'){ B.flat('qamar',dedupe(archPts(o.arch,o.u0,o.u1,o.vs)),atF(F,0,0,-tt+0.06),(x,y)=>[(x-o.u0)/w,(y-o.vs)/(w/2)]); B.box('wood',o.u0,o.vs-0.05,-tt,o.u1,o.vs+0.05,-tt+0.12,F.M); }
          const fa=c.uA!=null?c.uA:F.uA, fb=c.uB!=null?c.uB:F.uB, dbl=w>=0.95;
          const leaves= dbl? [{off:0,s:1,lw:w/2,poly:clipX(poly,0,w/2),us:1},{off:w,s:-1,lw:w/2,poly:clipX(poly,w/2,w),us:1}]
            : [(o.u0+o.u1)/2>(fa+fb)/2? {off:w,s:-1,lw:w,poly,us:0.5} : {off:0,s:1,lw:w,poly,us:0.5}];
          DOORS.push({F,o,w,hh,top,tt,wz:o.hangOut?0:-tt,out:!!o.hangOut,leaves,dbl});
          break; }
        case 'wall': case 'tile': {
          const d=o.depth||0.28; B.flat(o.fill==='tile'?'tile':c.wk,openPoly(o),atF(F,0,0,-d));
          if(o.mamlukPanel) mamlukPanel(F,o,d,c);
          if(o.khNiche) khNiche(F,o,d);
          break; }
      }
      if(o.frame){ const f=o.frame; B.ext(f.k==='qudad'?'trim':f.k, ringPoly(o.arch,o.u0,o.u1,o.v0,o.vs,f.w), null, f.d, F.M);
        if(o.sill) B.box(f.k,o.u0-f.w-0.06,o.v0-0.1,0,o.u1+f.w+0.06,o.v0,f.d+0.07,F.M); }
      if(o.hood) B.box('wood',o.u0-0.2,top+0.12,0,o.u1+0.2,top+0.2,0.22,F.M);
      if(o.shutters){ const hs=o.vs-o.v0, lw=w/2, sk=o.shutK||'paint'; B.box(sk,-lw,0,0,0,hs,0.045,mm(F.M,mT(o.u0,o.v0,0.02),mRY(0.45))); B.box(sk,0,0,0,lw,hs,0.045,mm(F.M,mT(o.u1,o.v0,0.02),mRY(-0.45))); }
      if(o.mull){ const n=Math.max(2,Math.round(w/0.3)); for(let i=1;i<n;i++){ const u=o.u0+w*i/n; B.box('wood',u-0.02,o.v0,-0.08,u+0.02,o.vs,-0.04,F.M); } const vm=o.v0+(o.vs-o.v0)*0.62; B.box('wood',o.u0,vm-0.02,-0.084,o.u1,vm+0.02,-0.036,F.M); }
      if(o.sash){ const vm=o.v0+(o.vs-o.v0)*0.5, um=(o.u0+o.u1)/2, k=o.sashK||'paint'; B.box(k,o.u0,vm-0.035,-0.09,o.u1,vm+0.035,-0.03,F.M); B.box(k,um-0.02,o.v0,-0.085,um+0.02,o.vs,-0.045,F.M);
        if(o.sash>1) for(const f of [0.25,0.75]){ const v=o.v0+(o.vs-o.v0)*f; B.box(k,o.u0,v-0.015,-0.088,o.u1,v+0.015,-0.042,F.M); } }
      if(o.ped){ const fw=o.frame?o.frame.w:0, a=o.u0-fw-0.08, b=o.u1+fw+0.08, v=top+fw+0.004, m=(a+b)/2, hw=(b-a)/2, k=o.pedK||'stone';
        const hgt= o.ped==='tri'? 0.1+0.32*hw : o.ped==='seg'? 0.1+0.22*hw : o.ped==='kok'? 0.75*hw+0.2 : 0.09;
        if(v+hgt<c.y1-0.06) switch(o.ped){
          case 'tri': B.box(k,a-0.04,v,0,b+0.04,v+0.1,0.13,F.M); B.ext(k,[[a-0.06,v+0.103],[b+0.06,v+0.103],[m,v+0.103+0.32*hw]],null,0.1,F.M); break;   // triangular pediment on a cornice
          case 'seg': { B.box(k,a-0.04,v,0,b+0.04,v+0.1,0.13,F.M); const sg=0.22*hw, Rr=(hw*hw+sg*sg)/(2*sg), cy=v+0.103+sg-Rr, a0=Math.asin(Math.min(1,hw/Rr)), pts=[];
            for(let i=0;i<=10;i++){ const t2=-a0+2*a0*i/10; pts.push([m+Math.sin(t2)*Rr*1.02,cy+Math.cos(t2)*Rr]); } B.ext(k,dedupe([[a-0.06,v+0.103],[b+0.06,v+0.103],...pts.reverse()]),null,0.1,F.M); break; }   // segmental head
          case 'kok': { const h=0.75*hw+0.2, L=[[a,v],[a,v+0.12*h],[a+0.15*hw,v+0.42*h],[a+0.45*hw,v+0.6*h],[a+0.78*hw,v+0.78*h],[m,v+h]], R2=L.slice(0,-1).reverse().map(p=>[2*m-p[0],p[1]]), sun=[];
            for(let i=0;i<12;i++){ const t2=i/12*Math.PI*2; sun.push([m+Math.cos(t2)*hw*0.16,v+0.4*h+Math.sin(t2)*hw*0.16]); }
            B.ext(k,dedupe([...L,...R2]),[sun],0.06,F.M);   // the kokoshnik crest of a carved nalichnik, a sun pierced through it
            if(o.v0>c.y0+0.5) B.ext(k,[[a+0.08,o.v0-fw-0.1],[b-0.08,o.v0-fw-0.1],[b-0.16,o.v0-fw-0.42],[m,o.v0-fw-0.3],[a+0.16,o.v0-fw-0.42]],null,0.05,F.M); break; }
          case 'label': B.box(k,a-0.06,v,0,b+0.06,v+0.09,0.1,F.M); for(const u0 of [a-0.06,b-0.06]) B.box(k,u0,v-0.32,0,u0+0.12,v,0.1,F.M); break; } }   // Tudor hood mould
      if(o.tibet){ const fw=(o.frame?o.frame.w:0)+0.004, e=0.16+fw, tp=top+0.06+fw, a0=o.u0-fw, a1=o.u1+fw, tf=top+fw;
        if(o.v0>c.y0+0.05){ const bt=o.v0-0.08-fw; B.ext('black',[[a0-e-0.1+fw,bt],[a1+e+0.1-fw,bt],[a1+e*0.6,tp],[a0-e*0.6,tp]],[[[a0,o.v0-0.004],[a1,o.v0-0.004],[a1,tf],[a0,tf]]],0.025,F.M); }
        else B.ext('black',[[a0-e-0.1+fw,o.v0],[a0,o.v0],[a0,tf],[a1,tf],[a1,o.v0],[a1+e+0.1-fw,o.v0],[a1+e*0.6,tp],[a0-e*0.6,tp]],null,0.025,F.M);
        const ks=['wood','paint','wood']; for(let k=0;k<3;k++){ const ex=0.22+k*0.07, v=top+0.08+k*0.1; if(v+0.1>c.y1-0.05) break; B.box(ks[k],o.u0-ex,v,0,o.u1+ex,v+0.1,0.1+k*0.06,F.M); }
        if(o.fill!=='door') B.box('tile',o.u0-0.08,top-0.17,0.06,o.u1+0.08,top+0.02,0.09,F.M); }   // the pleated shambu valance
      if(o.ears&&o.frame){ const fw=o.frame.w; B.box('wood',o.u0-fw-0.3,top+fw,0,o.u1+fw+0.3,top+fw+0.13,0.16,F.M); if(o.v0>c.y0+0.2) B.box('wood',o.u0-fw-0.3,o.v0-fw-0.13,0,o.u1+fw+0.3,o.v0-fw,0.16,F.M); }
      if(o.crown){ let v=top+(o.frame?o.frame.w:0), ex=0.35; for(let k=0;k<4;k++){ const h=k===0?0.2:0.16; if(v+h>c.y1-0.08) break; B.box(k%2?'stone':'band',o.u0-ex,v,0,o.u1+ex,v+h,0.15-k*0.02,F.M); v+=h; ex-=0.11; } }
      if(o.grille){ const n=Math.max(2,Math.round(w/0.15)); for(let i=1;i<n;i++){ const u=o.u0+w*i/n; B.box('iron',u-0.012,o.v0,-0.11,u+0.012,o.vs,-0.08,F.M); } for(const f of [0.33,0.66]){ const v=o.v0+(o.vs-o.v0)*f; B.box('iron',o.u0,v-0.012,-0.118,o.u1,v+0.012,-0.072,F.M); } }
      if(o.tymp){ const a=o.u0-0.06, b=o.u1+0.06, vt=top+0.16; const arc=archPts('pointed',a,b,vt);
        B.flat('tile',dedupe([[a,vt],[b,vt],...arc.slice().reverse()]),atF(F,0,0,0.012));
        B.ext('stone',ringPoly('pointed',a,b,vt,vt,0.12),null,0.05,F.M); B.box('stone',a-0.12,top+0.02,0,b+0.12,vt,0.06,F.M); }
      if(o.alfiz){ const ins=0.09, fw=0.28, L=o.u0-ins-fw, Rr=o.u1+ins+fw, T2=Math.min(top+ins+fw, c.y1-0.14);
        if(T2>top+ins+0.05){
          B.ext('band',[[L,o.v0],[L,T2],[Rr,T2],[Rr,o.v0],[o.u1+ins,o.v0],[o.u1+ins,top+ins],[o.u0-ins,top+ins],[o.u0-ins,o.v0]],null,0.04,F.M);
          if(o.arch!=='flat') B.flat('tile',dedupe([[o.u0-ins,o.vs],...archPts(o.arch,o.u0,o.u1,o.vs),[o.u1+ins,o.vs],[o.u1+ins,top+ins],[o.u0-ins,top+ins]]),atF(F,0,0,0.012)); } }
      if(o.vous) vous(F,o,c);
      if(o.benches){ for(const [a,b] of [[o.u0-0.85,o.u0-0.08],[o.u1+0.08,o.u1+0.85]]){ B.box(c.wk,a,o.v0,0,b,o.v0+0.45,0.5,F.M); B.box('stone',a-0.03,o.v0+0.45,0,b+0.03,o.v0+0.52,0.53,F.M); } }
      if(o.col){ const cu=o.u1+0.1; B.cyl('stone',0.07,0.07,o.vs-o.v0-0.12,8,atF(F,cu,o.v0,0.04)); B.box('stone',cu-0.13,o.vs-0.12,-0.02,cu+0.13,o.vs,0.12,F.M); }
      if(o.lantern&&FT.lanterns&&c.lanternOK!==false){ const lu=Math.min(o.u1+0.5,c.uB-c.t-0.15);
        if(ASIA){ const hv=Math.min(top+0.8,c.y1-0.15); B.box('wood',lu-0.03,hv-0.05,0,lu+0.03,hv,0.5,F.M); const p=atW(F,lu,0,0.47); hangLamp(B,p.x,hv-0.05,p.z); }
        else lantern(B,F,lu,Math.min(top+0.5,c.y1-0.35),0); }
    }
  }
  function vous(F,o,c){
    if(o.arch==='flat'){ const top=openTop(o), n=5, a=o.u0-0.16, b=o.u1+0.16; for(let i=0;i<n;i++) B.box(i%2?'stone2':'stone',a+(b-a)*i/n,top+0.02,0,a+(b-a)*(i+1)/n,top+0.38,0.072,F.M);
      if(o.fill==='door'){ const ra=o.u0-0.05, rb=o.u1+0.05, vt=top+0.4; if(vt+archRise('pointed',rb-ra)+0.3<c.y1-0.1){ B.flat('stone',dedupe([[ra,vt],[rb,vt],...archPts('pointed',ra,rb,vt).reverse()]),atF(F,0,0,0.01)); ringV(F,'pointed',ra,rb,vt,0.26); } }
      return; }
    ringV(F,o.arch,o.u0,o.u1,o.vs,0.3);
  }
  function ringV(F,arch,u0,u1,vs,wr){ const N=11; const inn=resample(archPts(arch,u0,u1,vs,24),N), out=resample(archPts(arch,u0-wr,u1+wr,vs,24),N);
    for(let i=0;i<N;i++) B.ext(i%2?'stone2':'stone',[inn[i],inn[i+1],out[i+1],out[i]],null,0.075,F.M); }
  function mamlukPanel(F,o,d,c){
    const w=o.u1-o.u0, m=(o.u0+o.u1)/2, back=-d+0.005, lw=w*0.27, lh=Math.min(1.5,(o.vs-o.v0)*0.45), lv=o.v0+0.35;
    for(const lu of [m-w*0.22,m+w*0.22]){ const L={u0:lu-lw/2,u1:lu+lw/2,v0:lv,vs:lv+Math.max(0.3,lh-archRise('pointed',lw)),arch:'pointed'};
      B.flat('glass',openPoly(L),atF(F,0,0,back)); B.ext('stone',ringPoly('pointed',L.u0,L.u1,L.v0,L.vs,0.06),null,0.04,atF(F,0,0,back)); B.box('stone',L.u0-0.1,lv-0.08,back,L.u1+0.1,lv,back+0.09,F.M); }
    const ov=lv+lh+0.42, orr=Math.min(0.26,w*0.17), circ=[]; for(let k=0;k<16;k++){ const a=k/16*Math.PI*2; circ.push([m+Math.cos(a)*orr, ov+Math.sin(a)*orr]); }
    if(ov+orr<o.vs-0.85){ B.flat('glass',circ,atF(F,0,0,back)); B.torus('stone',orr+0.03,0.04,Math.PI*2,atF(F,m,ov,back+0.02),5,18); }
    muqarnas(B,F,o.u0,o.u1,o.vs-0.8,o.vs,-d+0.004,d-0.004,3,'stone',c.wk);
  }
  function khNiche(F,o,d){
    const back=-d+0.005, w=o.u1-o.u0, m=(o.u0+o.u1)/2, ww=Math.min(0.75,w-0.3), wv0=o.v0+0.35, wh=1.25;
    B.flat('glass',[[m-ww/2,wv0],[m+ww/2,wv0],[m+ww/2,wv0+wh],[m-ww/2,wv0+wh]],atF(F,0,0,back));
    B.ext('wood',ringPoly('flat',m-ww/2,m+ww/2,wv0,wv0+wh,0.07),null,0.05,atF(F,0,0,back));
    B.box('wood',-ww/2,0,0,0,wh,0.04,mm(F.M,mT(m-ww/2,wv0,back+0.03),mRY(1.0))); B.box('wood',0,0,0,ww/2,wh,0.04,mm(F.M,mT(m+ww/2,wv0,back+0.03),mRY(-1.0)));
    const nv0=wv0+wh+0.22, nh=Math.min(0.8,o.vs-nv0-0.1);
    if(nh>0.25){ B.flat('void',[[m-ww/2,nv0],[m+ww/2,nv0],[m+ww/2,nv0+nh],[m-ww/2,nv0+nh]],atF(F,0,0,back)); B.box('screen',m-ww/2,nv0,back+0.02,m+ww/2,nv0+nh,back+0.06,F.M); }
  }

  /* ---------- projecting bays ---------- */
  function bay(F,o,c){
    const a=o.u0, b=o.u1, v0=o.v0, v1=o.vs;
    if(o.bay==='canted'||o.bay==='oriel'){   // a three-sided bay: Victorian canted bay on stone corbels, Tudor oriel on timber brackets
      const ori=o.bay==='oriel', D=Math.min(0.72,(b-a)*0.3), K=ori?'wood':'stone', P=ori?'wood':'paint', sp=ori?'wood':c.wk, top=v1;
      const poly=g=>[[a-g,0],[b+g,0],[b-D+g*0.41,D+g],[a+D-g*0.41,D+g]];
      const slab=(k,g,yb,yt)=>B.ext(k,poly(g),null,yt-yb,mm(F.M,mT(0,yt,0),mRX(Math.PI/2)));
      for(let k=0;k<3;k++) slab(K,-0.1-0.1*k,v0-0.16*(k+1),v0-0.16*k);
      if(ori) for(const u of [a+0.25,b-0.25]) B.segCyl('wood',atW(F,u,v0-1.0,0),atW(F,u,v0-0.1,D*0.7),0.06,0.06,5);
      slab(K,0.05,v0-0.02,v0+0.1);
      const L=D*Math.SQRT2, segs=[[mm(F.M,mT(a,0,0),mRY(-Math.PI/4)),L],[mm(F.M,mT(a+D,0,D)),b-a-2*D],[mm(F.M,mT(b-D,0,D),mRY(Math.PI/4)),L]], g0=v0+0.78, g1=top-0.3;
      segs.forEach(([M,len],i)=>{ B.box(sp,0.05,v0+0.1,-0.1,len-0.05,v0+0.7,0,M); B.box(K,0.03,v0+0.7,-0.12,len-0.03,g0,0.04,M);
        const pane=[[0.06,g0],[len-0.06,g0],[len-0.06,g1],[0.06,g1]]; B.flat('glass',pane,mm(M,mT(0,0,-0.06))); if(ori) B.flat('lattice',pane,mm(M,mT(0,0,-0.04)));
        else { const vm=(g0+g1)/2; B.box(P,0.05,vm-0.03,-0.075,len-0.05,vm+0.03,-0.045,M); if(i===1) B.box(P,len/2-0.02,g0,-0.07,len/2+0.02,g1,-0.045,M); }
        B.box(K,0.03,g1,-0.1,len-0.03,top,0,M); B.box(P,-0.05,v0+0.1,-0.11,0.05,top,0.006,M); if(i===2) B.box(P,len-0.05,v0+0.1,-0.11,len+0.05,top,0.006,M); });
      slab(K,0.1,top,top+0.14); slab(ori?'roofTile':'lead',-0.02,top+0.14,top+0.32);
      return; }
    if(o.bay==='rawasheen'||o.bay==='mashrabiya'){
      const raw=o.bay==='rawasheen', P=raw?'paint':'wood', D=raw?0.75:0.62, low=raw?0.75:0.45;
      for(let k=0;k<3;k++) B.box(P,a+0.06+k*0.1,v0-0.15*(k+1),0,b-0.06-k*0.1,v0-0.15*k,D-0.2*k,F.M);
      B.box(P,a-0.12,v0-0.02,0,b+0.12,v0+0.08,D+0.1,F.M);
      B.box(P,a,v0+0.08,D-0.05,b,v0+low,D,F.M); B.box(P,a-0.05,v0+0.08,0,a,v0+low,D,F.M); B.box(P,b,v0+0.08,0,b+0.05,v0+low,D,F.M);
      B.box('lattice',a,v0+low,D-0.03,b,v1-0.06,D,F.M); B.box('lattice',a-0.04,v0+low,0.02,a,v1-0.06,D-0.03,F.M); B.box('lattice',b,v0+low,0.02,b+0.04,v1-0.06,D-0.03,F.M);
      const np=Math.max(2,Math.round((b-a)/0.75)); for(let i=0;i<=np;i++){ const u=a+(b-a)*i/np; B.box(P,u-0.05,v0+0.08,D-0.08,u+0.05,v1,D+0.02,F.M); }
      B.box(P,a,v0+low-0.04,D-0.07,b,v0+low+0.05,D+0.02,F.M);
      B.box(P,a-0.15,v1-0.06,0,b+0.15,v1+0.08,D+0.15,F.M); B.box(P,a-0.25,v1+0.08,0,b+0.25,v1+0.16,D+0.25,F.M);
      if(raw) for(let u=a-0.1;u<=b+0.1;u+=0.3) B.box(P,u-0.03,v1+0.16,D+0.17,u+0.03,v1+0.36,D+0.23,F.M);
      return; }
    if(o.bay==='jharokha'){   // a corbelled stone balcony window under a curved bangla roof
      const D=0.72, A=a-0.12, Bb=b+0.12;
      for(let k=0;k<3;k++) B.box('stone',a+0.1+k*0.12,v0-0.16*(k+1),0,b-0.1-k*0.12,v0-0.16*k,D-0.18*k,F.M);
      B.box('stone',A,v0-0.02,0,Bb,v0+0.1,D+0.06,F.M);
      B.box('screen',a,v0+0.1,D-0.07,b,v0+0.72,D-0.02,F.M); B.box('screen',a,v0+0.1,0.02,a+0.05,v0+0.72,D-0.07,F.M); B.box('screen',b-0.05,v0+0.1,0.02,b,v0+0.72,D-0.07,F.M);
      B.box('stone',a-0.04,v0+0.72,0,b+0.04,v0+0.8,D,F.M);
      const np=Math.max(2,Math.round((b-a)/0.55)), cu=i=>a+0.06+(b-a-0.12)*i/np;
      for(let i=0;i<=np;i++) B.cyl('stone',0.045,0.055,v1-v0-0.8,8,atF(F,cu(i),v0+0.8,D-0.1));
      for(let i=0;i<np;i++){ const u0=cu(i)+0.05, u1=cu(i+1)-0.05, vs=v1-archRise('cusped',u1-u0)-0.03; if(vs>v0+1.1) B.ext('stone',dedupe([[u0,vs],[u0,v1],[u1,v1],[u1,vs],...archPts('cusped',u0,u1,vs,24).reverse()]),null,0.05,atF(F,0,0,D-0.13)); }
      const L=A-0.14, Rr=Bb+0.14; B.box('stone',L,v1,0,Rr,v1+0.1,D+0.22,F.M);
      const rp=[]; for(let i=0;i<=16;i++){ const t2=i/16; rp.push([L+(Rr-L)*t2, v1+0.16+0.28*Math.sin(Math.PI*t2)]); }
      B.ext('stone',dedupe([[L,v1+0.1],[Rr,v1+0.1],...rp.reverse()]),null,D+0.16,F.M);
      B.sphere('gold',0.06,mT(...atW(F,(L+Rr)/2,v1+0.5,D*0.5).toArray()),6,4);
      return; }
    if(o.bay==='newar'){   // a long carved sal-wood window projecting on struts
      const D=0.5;
      B.box('wood',a-0.18,v0-0.3,0,b+0.18,v0,D+0.06,F.M); B.box('band',a-0.1,v0-0.24,D+0.06,b+0.1,v0-0.06,D+0.09,F.M);
      for(const u of [a+0.2,(a+b)/2,b-0.2]) B.segCyl('wood',atW(F,u,v0-1.0,0),atW(F,u,v0-0.3,D-0.1),0.05,0.05,5);
      B.box('lattice',a,v0,D-0.05,b,v1,D,F.M); B.box('lattice',a-0.05,v0,0.02,a,v1,D-0.05,F.M); B.box('lattice',b,v0,0.02,b+0.05,v1,D-0.05,F.M);
      const np=Math.max(3,Math.round((b-a)/0.5)); for(let i=0;i<=np;i++){ const u=a+(b-a)*i/np; B.box('wood',u-0.05,v0,D-0.09,u+0.05,v1,D+0.03,F.M); }
      B.box('wood',a-0.1,v0,D-0.09,b+0.1,v0+0.12,D+0.04,F.M);
      B.box('wood',a-0.22,v1,0,b+0.22,v1+0.16,D+0.12,F.M); B.box('wood',a-0.3,v1+0.16,0,b+0.3,v1+0.24,D+0.2,F.M);
      return; }
    if(o.bay==='cumba'){
      const D=0.95;
      for(const u of [a+0.25,(a+b)/2,b-0.25]) B.segCyl('wood',atW(F,u,v0-1.1,0),atW(F,u,v0,D-0.15),0.06,0.06,5);
      B.box('wood',a-0.05,v0-0.14,0,b+0.05,v0,D+0.05,F.M);
      const nw=3, ww=(b-a)/nw, holes=[]; for(let i=0;i<nw;i++){ const u0=a+i*ww+0.18, u1=a+(i+1)*ww-0.18; holes.push([[u0,v0+0.65],[u1,v0+0.65],[u1,v1-0.35],[u0,v1-0.35]]); B.flat('glass',holes[i],atF(F,0,0,D-0.1)); B.box('wood',u0-0.05,v0+0.6,D,u1+0.05,v0+0.67,D+0.06,F.M); }
      B.ext('trim',[[a,v0],[b,v0],[b,v1],[a,v1]],holes,0.08,atF(F,0,0,D-0.08));
      B.box('trim',a,v0,0,a+0.08,v1,D,F.M); B.box('trim',b-0.08,v0,0,b,v1,D,F.M);
      B.box('wood',a-0.3,v1,0,b+0.3,v1+0.12,D+0.35,F.M);
      return; }
    if(o.bay==='balcony'){
      const D=1.0, A=a-0.2, Bb=b+0.2, v=v0, iron=st.balcony?st.balcony==='iron':st.id!=='isfahani'&&st.id!=='yazdi', rm=iron?'iron':'wood';
      B.box('stone',A,v-0.14,0,Bb,v+0.02,D,F.M);
      for(const u of [A+0.3,Bb-0.3]) for(let k=0;k<3;k++) B.box('stone',u-0.12,v-0.14-0.16*(k+1),0,u+0.12,v-0.14-0.16*k,D*0.7-k*0.22,F.M);
      for(let u=A+0.06;u<=Bb-0.05;u+=0.14) B.box(rm,u-0.012,v+0.02,D-0.08,u+0.012,v+0.95,D-0.05,F.M);
      for(let w2=0.1;w2<D-0.08;w2+=0.14){ B.box(rm,A+0.03,v+0.02,w2-0.012,A+0.06,v+0.95,w2+0.012,F.M); B.box(rm,Bb-0.06,v+0.02,w2-0.012,Bb-0.03,v+0.95,w2+0.012,F.M); }
      B.box(rm,A,v+0.93,D-0.1,Bb,v+0.99,D-0.03,F.M); B.box(rm,A,v+0.93,0,A+0.07,v+0.99,D-0.03,F.M); B.box(rm,Bb-0.07,v+0.93,0,Bb,v+0.99,D-0.03,F.M);
    }
  }

  /* ---------- per-face greebles ---------- */
  function freeRuns(ops,a,b,v0,v1){
    let segs=[[a,b]];
    for(const o of ops){ const fw=o.frame?o.frame.w:0;
      const ot=(o.bay&&!o.nohole? o.vs+(o.bay==='jharokha'?0.5:0.45) : openTop(o)+fw+(o.alfiz?0.4:0)+(o.tymp?1.0:0)+(o.vous?0.45:0)+(o.hood?0.25:0)+(o.mamlukPanel?0.1:0)+(o.tibet?0.4:0)+(o.ears?0.15:0)+(o.crown?0.75:0)+(o.ped?(o.ped==='kok'?0.95:0.55):0));
      const ob=o.v0-(o.sill?0.12:0)-(o.bay?0.6:0)-(o.ped==='kok'?0.45:0);
      if(o.nohole&&o.bay==='balcony'){ if(v1<o.v0-0.2||v0>o.v0+1.0) continue; }
      else if(ot<v0||ob>v1) continue;
      const pad=0.06+fw+(o.alfiz?0.4:0)+(o.benches?0.85:0)+(o.vous?0.3:0)+(o.bay?0.3:0)+(o.tibet?0.28:0)+(o.ears?0.32:0)+(o.crown?0.3:0)+(o.ped?0.16:0)+archSpread(o.arch,o.u1-o.u0);
      const u0=o.u0-pad, u1=o.u1+pad; const ns=[];
      for(const s of segs){ if(u1<=s[0]||u0>=s[1]){ ns.push(s); continue; } if(u0>s[0]) ns.push([s[0],u0]); if(u1<s[1]) ns.push([u1,s[1]]); }
      segs=ns; }
    return segs.filter(s=>s[1]-s[0]>0.15);
  }
  function faceGreebles(F,ops,c){
    const {y0,y1,kind}=c, outer=kind==='street'||kind==='court';
    if(c.l===0&&kind==='street'&&FT.plinth&&!outFace.has(dk(c.x,c.z,0,c.d))) for(const s of freeRuns(ops,F.uA,F.uB,y0,y0+0.5)) B.box('base',s[0],y0,0,s[1],y0+0.5,0.08,F.M);
    const extK=k=>k==='street'||k==='court'||k==='porch', endOut=[extK(faceKind(c.x,c.z,c.l,(c.d+1)%4)),extK(faceKind(c.x,c.z,c.l,(c.d+3)%4))];
    if(st.dado&&outer&&c.l===0) for(const s of freeRuns(ops,F.uA,F.uB,y0,y0+1.1)) B.box('dado',s[0],y0,0,s[1],y0+1.1,0.012,F.M);   // the painted dado of a Pompeian wall
    if(st.quoins&&outer) for(const end of [0,1]){ if(!endOut[end]) continue; let k=0;   // long-and-short stone quoins; the block at a face's right end wraps the corner
      for(let v=y0+(c.l===0&&kind==='street'&&FT.plinth?0.5:0)+0.006;v<y1-0.1;v+=0.3,k++){ const L=(k+end)%2?0.2:0.34, vt=Math.min(v+0.288,y1-0.01);
        if(end) B.box('stone',F.uB-L,v,0,F.uB+0.03,vt,0.03,F.M); else B.box('stone',F.uA,v,0,F.uA+L,vt,0.03,F.M); } }
    if(st.logCorners&&outer) for(const end of [0,1]){ if(!endOut[end]) continue;   // notched log ends crossing at the corners, alternate courses from each face
      for(let v=y0+0.14+(end?0:0.14);v<y1-0.1;v+=0.28) B.cyl('wood',0.13,0.13,0.44,7,mm(atF(F,end?F.uB-0.12:F.uA-0.32,v,-t/2),mRZ(-Math.PI/2))); }
    if(st.pilasters&&outer&&!outFace.has(dk(c.x,c.z,c.l,c.d))){ const up=c.top&&FT.parapet? st.parH+0.2 : 0;   // buttresses rising through the roofline into rounded pinnacles
      for(const s of freeRuns(ops,F.uA+c.t+0.12,F.uB-c.t-0.12,y0,y1)){ const L=s[1]-s[0], n=Math.floor(L/1.05); for(let i=0;i<n;i++){ const u=s[0]+L*(i+0.5)/n;
        B.box(c.wk,u-0.18,y0,0,u+0.18,y1+up,0.3,F.M); if(c.l===0) colM(F.M,u-0.18,y0,0,u+0.18,y1,0.3); if(up) B.cone(c.wk,0.2,0.55,6,atF(F,u,y1+up,0.15)); } } }
    if(st.frieze&&outer&&FT.bands){ const fv=y0+Math.max(c.H*0.52,2.4), eB=endOut[1]?0.12:0;   // Puuc: plain walls below, a fretted frieze between mouldings above
      B.box('stone',F.uA,fv,0,F.uB+eB,fv+0.12,0.12,F.M); B.box('stone',F.uA,fv+0.12,0,F.uB+(endOut[1]?0.06:0),fv+0.22,0.06,F.M);
      for(const s of freeRuns(ops,F.uA,F.uB,fv+0.22,y1-0.28)) B.box('band',s[0],fv+0.22,0,s[1],y1-0.28,0.03,F.M);
      B.box('stone',F.uA,y1-0.28,0,F.uB+eB,y1-0.06,0.12,F.M); }
    if(FT.bands&&outer&&!st.frieze) for(const s of freeRuns(ops,F.uA,F.uB,y1-0.45,y1-0.1)) B.box('band',s[0],y1-0.45,0,s[1],y1-0.1,0.035,F.M);
    if(FT.tiebands&&outer) for(let v=y0+0.95;v<y1-0.55;v+=0.95) for(const s of freeRuns(ops,F.uA,F.uB,v,v+0.1)) B.box('wood',s[0],v,0,s[1],v+0.1,0.045,F.M);
    if(FT.beams&&outer){ if(st.torons){ const r=RNG('tor'+c.x+c.z+c.l+c.d); for(const f of [0.3,0.62,0.93]){ const v=y0+(y1-y0)*f; for(const s of freeRuns(ops,F.uA+c.t,F.uB-c.t,v-0.06,v+0.06)) for(let u=s[0]+0.2+r.f()*0.4;u<s[1]-0.1;u+=r.range(0.7,1.0)) B.box('wood',u-0.04,v-0.04,0,u+0.04,v+0.04,0.48,F.M); } }   // toron stakes
      else { const v=y1-0.2; for(const s of freeRuns(ops,F.uA+c.t,F.uB-c.t,v-0.08,v+0.08)) for(let u=s[0]+0.2;u<s[1]-0.1;u+=0.55) B.box('wood',u-0.06,v-0.06,0,u+0.06,v+0.06,0.36,F.M); } }
    if(FT.frame&&st.timber&&kind!=='inner'&&(st.timber.faces==='all'||kind==='court'||kind==='porch')) timberFrame(F,ops,c);
    if(st.chhajja&&outer){ const v=y1-0.24, av=c.avoid||[];
      for(const s0 of freeRuns(ops,F.uA,F.uB,v-0.3,v+0.16)){ let segs=[s0]; for(const a of av) segs=segs.flatMap(s=>a[1]<=s[0]||a[0]>=s[1]?[s]:[[s[0],a[0]-0.3],[a[1]+0.3,s[1]]]).filter(s=>s[1]-s[0]>0.3);
        for(const s of segs){ B.box('stone',s[0],v,0,s[1],v+0.1,0.55,F.M); B.box('stone',s[0],v+0.1,0,s[1],v+0.17,0.32,F.M); for(let u=s[0]+0.25;u<s[1]-0.1;u+=0.7) B.box('stone',u-0.05,v-0.3,0,u+0.05,v,0.38,F.M); } } }
    const pm=c.mod.panel; const wantPanel=(pm==='on')||(pm!=='off'&&FT.panels);
    if(wantPanel&&outer){
      const door=ops.find(o=>o.fill==='door');
      let rect=null;
      if(door){ const top=openTop(door)+(door.frame?door.frame.w:0)+(door.vous?0.45:0)+(door.alfiz?0.4:0); const v0=top+0.3, v1=Math.min(v0+0.8,y1-0.55); if(v1-v0>0.4) rect=[door.u0-0.25,v0,door.u1+0.25,v1]; }
      else if(ops.filter(o=>!o.nohole).length<=1&&c.l>0){ const runs=freeRuns(ops,F.uA+c.t+0.4,F.uB-c.t-0.4,y0+1.1,y0+2.3); const r=runs.sort((p,q)=>(q[1]-q[0])-(p[1]-p[0]))[0]; if(r&&r[1]-r[0]>1.5){ const m=(r[0]+r[1])/2; rect=[m-0.7,y0+1.2,m+0.7,y0+2.2]; } }
      if(rect&&!ops.some(o=>!o.nohole&&o.u0<rect[2]+0.1&&rect[0]<o.u1+0.1&&o.v0<rect[3]+0.1&&rect[1]<openTop(o)+0.1)){
        B.box('tile',rect[0],rect[1],0,rect[2],rect[3],0.02,F.M);
        const fk=st.domeMat==='tile'||st.band==='tile'?'band':'stone', e=0.1;
        B.box(fk,rect[0]-e,rect[1]-e,0,rect[2]+e,rect[1],0.045,F.M); B.box(fk,rect[0]-e,rect[3],0,rect[2]+e,rect[3]+e,0.045,F.M);
        B.box(fk,rect[0]-e,rect[1],0,rect[0],rect[3],0.045,F.M); B.box(fk,rect[2],rect[1],0,rect[2]+e,rect[3],0.045,F.M); }
    }
  }

  /* exposed timber frame: corner posts, a post in every gap between openings, a head beam and a floor beam */
  function timberFrame(F,ops,c){
    const T=st.timber, pk=T.post, pw=T.w, {y0,y1}=c, dp=0.07, li=c.l===0?0:1;
    if(T.l0!=null&&c.l<T.l0) return;
    const studs=T.studs?T.studs[li]:0, braces=T.braces?T.braces[li]:0, rail=T.rail?T.rail[li]:0;
    const iv=ops.filter(o=>!(o.nohole&&o.bay==='balcony')).map(o=>{ const fw=(o.frame?o.frame.w:0)+archSpread(o.arch,o.u1-o.u0)+(o.bay?0.32:0)+(o.ears?0.33:0)+(o.crown?0.3:0)+(o.ped?0.16:0); return [o.u0-fw,o.u1+fw]; }).sort((p,q)=>p[0]-q[0]);
    const us=[]; let prev=F.uA;
    const gap=(a,b,lo,hi)=>{ if(b-a<pw+0.04) return; const p0=lo?a+pw/2:null, p1=hi?b-pw/2:null;
      if(p0==null&&p1==null){ us.push((a+b)/2); return; }
      if(p0!=null) us.push(p0+0.006); if(p1!=null) us.push(p1-0.006);
      const s0=p0!=null?p0:a, s1=p1!=null?p1:b, L=s1-s0; if(L>(studs?studs*1.4:2.6)){ const n=Math.ceil(L/(studs||1.9)); for(let i=1;i<n;i++) us.push(s0+L*i/n); } };
    for(const v of iv){ if(v[0]>prev) gap(prev,v[0],prev===F.uA,false); prev=Math.max(prev,v[1]); }
    if(F.uB>prev) gap(prev,F.uB,prev===F.uA,true);
    for(const u of us) B.box(pk,u-pw/2,y0+0.004,0,u+pw/2,y1,dp,F.M);
    for(const s of freeRuns(ops,F.uA,F.uB,y1-0.36,y1-0.08)) B.box(pk,s[0],y1-0.36,0,s[1],y1-0.08,dp+0.02,F.M);
    if(!outFace.has(dk(c.x,c.z,c.l,c.d))) for(const s of freeRuns(ops,F.uA,F.uB,y0,y0+0.16)) B.box(pk==='paint'?'wood':pk,s[0]+0.004,y0+0.002,0,s[1]-0.004,y0+0.16,dp+0.035,F.M);
    const yr=y0+(y1-y0)*0.45;
    if(rail) for(const s of freeRuns(ops,F.uA,F.uB,yr,yr+0.13)) B.box(pk,s[0]+0.004,yr,0,s[1]-0.004,yr+0.13,dp+0.012,F.M);
    if(braces){ const ps=us.slice().sort((p,q)=>p-q), free=(a,b)=>!iv.some(v=>v[0]<b&&v[1]>a);
      for(let i=0;i+1<ps.length;i++){ const a=ps[i]+pw/2, b=ps[i+1]-pw/2; if(b-a<0.55||b-a>2.4||!free(a,b)) continue;
        const ya=rail? yr+0.13 : y0+0.16, yb=y1-0.36, bw=0.13;
        B.ext(pk,i%2===0? [[a,ya],[a+bw,ya],[b,yb],[b-bw,yb]] : [[b-bw,ya],[b,ya],[a+bw,yb],[a,yb]],null,dp-0.012,F.M); } }
  }

  /* ---------- walls ---------- */
  function wallShape(uA,uB,vA,vB,ops){
    const notch=ops.filter(o=>!o.nohole&&o.v0<=vA+1e-3).sort((a,b)=>a.u0-b.u0);
    const holes=ops.filter(o=>!o.nohole&&o.v0>vA+1e-3).map(openPoly);
    const pts=[[uA,vA]];
    for(const o of notch){ pts.push([o.u0,vA]); for(const p of archPts(o.arch,o.u0,o.u1,o.vs)) pts.push(p); pts.push([o.u1,vA]); }
    pts.push([uB,vA],[uB,vB],[uA,vB]);
    return [dedupe(pts),holes];
  }
  function roomWall(x,z,l,d,kind,ty,mod,cx,cz,y0,y1){
    const F=trimF(kind==='inner'? fr(cx,cz,(d+2)%4,-CW+t) : fr(cx,cz,d), k=>faceKind(x,z,l,k)!==null);
    const rk=kind==='porch'?'court':kind;
    let door=doors.has(dk(x,z,l,d)) || (ty===IWAN&&kind==='inner'&&d===(R[idx(x,z,l)]+2)%4), doorU=null;
    let openOnly=false, hangOut=false;
    if(kind==='inner'){ const nx=x+DIRS[d][0], nz=z+DIRS[d][1]; if(cellAt(nx,nz,l)===STAIR){ const r=stairDoorU(nx,nz,l,(d+2)%4,F.d); if(r===false) door=false; else if(r!=null) doorU=r; }
      // two iwans sharing a line both build a wall there: a door in either needs a matching opening in the other,
      // and the leaves hang on the iwan side so they fold into the hall rather than into the neighbour's masonry
      if(cellAt(nx,nz,l)===IWAN&&faceKind(nx,nz,l,(d+2)%4)==='inner'){ const ni=idx(nx,nz,l), theirs=doors.has(dk(nx,nz,l,(d+2)%4))||(d+2)%4===(R[ni]+2)%4;
        if(door||theirs){ const mine=door&&(!theirs||idx(x,z,l)<ni); door=true; doorU=F.mid; openOnly=!mine; hangOut=mine; } } }
    const fk=dk(x,z,l,d), under=outFace.has(fk), arr=outArrive.get(fk);
    if(under) door=false;
    if(arr!=null){ door=true; doorU=arr; }
    const bayOK= l>=1&&kind==='street'&&!under&&!door&&(ty===ROOM||ty===DOME)&&(mod.bay==='on'||(mod.bay!=='off'&&FT.bays));   // a bay never takes the place of a door
    const c={kind:rk,l,H,t,y0,y1,uA:F.uA,uB:F.uB,door,rnd:RNG(S.seed+'|f|'+x+z+l+d),mod,ty,top:!isMass(cellAt(x,z,l+1)),bayOK,
      winMul: under||mod.win==='none'?0 : mod.win==='few'?0.5 : mod.win==='many'?1.6 : 1, wk:wallKey(l), x, z, d, fd:F.d, doorU, openOnly, hangOut, avoid:outAvoid.get(fk)};
    let ops= kind==='inner'? innerOps(c) : ty===STAIR? stairOps(c) : FAC[st.fac](c);
    if(under) ops=ops.filter(o=>o.nohole);
    if(arr!=null){ const da=st.arch.door==='triangle'?'flat':st.arch.door; ops=ops.filter(o=>o.fill!=='door'); ops.unshift(mk(c,arr,1.1,0,Math.min(2.4,H-0.6),da,{fill:'door',frame:FR('wood',.1,.05),knockers:st.id==='yazdi'})); }
    ops=fitOps(ops,c);
    const [outer,holes]=wallShape(F.uA,F.uB,y0,y1,ops);
    B.ext(c.wk,outer,holes,t,atF(F,0,0,-t)); colWall(F,F.uA,F.uB,y0,y1,-t,0,ops);
    dressOps(F,ops,c);
    faceGreebles(F,ops,Object.assign(c,{kind}));
    for(const o of ops){ if(o.nohole) continue; recOp(x,z,l,d,F,o,y0); if(kind==='inner') recOp(x+DIRS[d][0],z+DIRS[d][1],l,(d+2)%4,F,o,y0); }
  }
  /* openings seen from inside each room: along-wall span (world z for east/west walls, x for north/south), sill and head, walkable or not */
  const ROOMOPS=new Map();
  function recOp(x,z,l,d,F,o,y0){ const a=atW(F,o.u0,0,0), b=atW(F,o.u1,0,0), s0=d%2===0?Math.min(a.z,b.z):Math.min(a.x,b.x), s1=d%2===0?Math.max(a.z,b.z):Math.max(a.x,b.x), sp=archSpread(o.arch,o.u1-o.u0);
    const k=`${x},${z},${l}`; if(!ROOMOPS.has(k)) ROOMOPS.set(k,[]); ROOMOPS.get(k).push({d,s0:s0-sp-(o.frame?o.frame.w:0),s1:s1+sp+(o.frame?o.frame.w:0),v0:o.v0-y0,top:openTop(o)-y0,pass:passable(o)&&o.v0<=y0+0.65}); }

  /* ---------- iwan ---------- */
  function iwanMouth(x,z,l,d,cx,cz,y0,y1){
    if((ASIA&&st.id!=='haveli')||st.openHall) return openFront(x,z,l,d,cx,cz,y0,y1);
    const F=trimF(fr(cx,cz,d),k=>faceKind(x,z,l,k)!==null), top=!isMass(cellAt(x,z,l+1)), arch=st.arch.iwan, wk=wallKey(l);
    const a=F.uA+t, b=F.uB-t; let oa=a+0.25, ob=b-0.25;
    const frameTop= top&&st.pish>0? y1+st.parH+st.pish : y1, proj=(st.pish>0&&top)?0.3:0;
    let rise=archRise(arch,ob-oa), vs=y1-0.4-rise;
    if(vs<y0+1.3){ vs=y0+1.3; const maxR=y1-0.4-vs; if(rise>maxR){ const k=maxR/rise, m=(oa+ob)/2, hw=(ob-oa)/2*k; oa=m-hw; ob=m+hw; rise=maxR; } }
    B.ext(wk,dedupe([[F.uA,y0],[oa,y0],...archPts(arch,oa,ob,vs),[ob,y0],[F.uB,y0],[F.uB,frameTop],[F.uA,frameTop]]),null,t+proj,atF(F,0,0,-t));
    colWall(F,F.uA,F.uB,y0,frameTop,-t,proj,[{u0:oa,u1:ob,v0:y0,vs,arch}]);
    // vault
    const rv=archRise(arch,b-a); let vsv=Math.min(vs,y1-0.35-rv);
    if(vsv>y0+1.0) B.ext('trim',dedupe([...archPts(arch,a,b,vsv),[b,y1-0.22],[a,y1-0.22]]),null,CW-2*t,atF(F,0,0,-(CW-t)));
    else B.box('trim',a,y1-0.32,-(CW-t),b,y1-0.22,-t,F.M);
    if(st.pish>0||FT.panels){
      const pl=oa-0.55, prr=ob+0.55, pb=y0+0.5, pt=frameTop-0.3;
      if(pl>F.uA+0.05&&pt>vs+rise+0.2){
        B.ext('tile',dedupe([[pl,pb],[oa,pb],...archPts(arch,oa,ob,vs),[ob,pb],[prr,pb],[prr,pt],[pl,pt]]),null,0.03,atF(F,0,0,proj));
        const bk=st.band==='tile'||st.domeMat==='tile'?'band':'stone';
        B.box(bk,pl-0.2,pb,proj,pl,pt+0.2,proj+0.06,F.M); B.box(bk,prr,pb,proj,prr+0.2,pt+0.2,proj+0.06,F.M); B.box(bk,pl-0.2,pt,proj,prr+0.2,pt+0.2,proj+0.06,F.M); }
    }
    if(FT.ablaq&&arch!=='flat') ringV({M:mm(F.M,mT(0,0,proj+0.005))},arch,oa,ob,vs,0.32);
    if(vsv>y0+1.0&&(st.pish>0||st.id==='mamluk')) muqarnas(B,F,a,b,vsv,vsv+rv*0.85,-(CW-t),1.3,4,'trim',st.domeMat==='tile'?'tile':'stone');
    if(st.pish>0&&top){ B.box('band',F.uA,frameTop-0.05,-t,F.uB,frameTop+0.12,proj+0.05,F.M); }
    if(FT.lanterns){ const p=atW(F,(F.uA+F.uB)/2,0,-CW/2); hangLamp(B,p.x,Math.min(vs+rise,y1-0.3),p.z); }
  }

  /* ---------- gate portal ---------- */
  function portal(x,z,l,d,cx,cz,y0,y1){
    if(st.gate==='pylon') return pylonGate(x,z,l,d,cx,cz,y0,y1);
    if(st.gate==='gatehouse') return gateHouse(x,z,l,d,cx,cz,y0,y1);
    if(st.gate==='candi') return candiGate(x,z,l,d,cx,cz,y0,y1);
    if(st.gate==='porch') return porchGate(x,z,l,d,cx,cz,y0,y1);
    const F=trimF(fr(cx,cz,d),k=>faceKind(x,z,l,k)!==null), top=!isMass(cellAt(x,z,l+1)), wk=wallKey(l); let arch=st.arch.portal;
    const wn=Math.min(3.2,CW-2*t-1.4), m=F.mid, na=m-wn/2, nb=m+wn/2, D=1.5;
    const frameTop= top? y1+st.parH+st.pish : y1, proj=0.3;
    let rise=archRise(arch,wn), vs=Math.min(y1-0.4,frameTop-0.5)-rise;
    if(vs<y0+2.0){ arch='fourc'; rise=archRise(arch,wn); vs=Math.min(y1-0.4,frameTop-0.5)-rise; if(vs<y0+2.0){ arch='flat'; rise=0; vs=y1-0.5; } }
    const apex=vs+rise;
    B.ext(wk,dedupe([[F.uA,y0],[na,y0],...archPts(arch,na,nb,vs),[nb,y0],[F.uB,y0],[F.uB,frameTop],[F.uA,frameTop]]),null,t+proj,atF(F,0,0,-t));
    B.box(wk,na-0.3,y0,-t-D,na,apex,-t,F.M); B.box(wk,nb,y0,-t-D,nb+0.3,apex,-t,F.M);
    colWall(F,F.uA,F.uB,y0,frameTop,-t,proj,[{u0:na,u1:nb,v0:y0,vs,arch}]); colM(F.M,na-0.3,y0,-t-D,na,apex,-t); colM(F.M,nb,y0,-t-D,nb+0.3,apex,-t);
    B.box('trim',na,apex,-t-D,nb,apex+0.15,-t,F.M);
    const F2={M:mm(F.M,mT(0,0,-t-D)),uA:na,uB:nb,mid:m};
    const da=st.arch.door, dw=Math.min(1.5,wn-1.2); let dh=Math.min(2.7,vs-y0+rise*0.4-0.3);
    const door={u0:m-dw/2,u1:m+dw/2,v0:y0,vs:y0+Math.max(1.6,dh-archRise(da,dw)),arch:da,fill:'door',frame:FR('stone',.13,.05),knockers:st.id==='yazdi',gate:true};
    if(openTop(door)>apex-0.2){ door.arch='flat'; door.vs=Math.min(y0+2.4,apex-0.3); }
    const [outer]=wallShape(na,nb,y0,apex,[door]);
    B.ext(wk,outer,null,0.3,mm(F2.M,mT(0,0,-0.3))); colWall(F2,na,nb,y0,apex,-0.3,0,[door]);
    dressOps(F2,[door],{t:0.3,y0,y1:apex,wk,uB:nb,lanternOK:false});
    if(arch!=='flat') muqarnas(B,F,na,nb,vs-0.1,apex,-t-D,D,5,'trim',st.domeMat==='tile'||st.band==='tile'?'tile':'stone');
    else muqarnas(B,F,na,nb,apex-1.0,apex,-t-D,D,3,'trim','stone');
    if(st.pish>0||FT.panels){
      const pl=na-0.6, prr=nb+0.6, pb=y0+0.45, pt=frameTop-0.3;
      if(pl>F.uA+0.05&&pt>apex+0.2){
        B.ext('tile',dedupe([[pl,pb],[na,pb],...archPts(arch,na,nb,vs),[nb,pb],[prr,pb],[prr,pt],[pl,pt]]),null,0.03,atF(F,0,0,proj));
        const bk=st.band==='tile'||st.domeMat==='tile'?'band':'stone';
        B.box(bk,pl-0.2,pb,proj,pl,pt+0.2,proj+0.06,F.M); B.box(bk,prr,pb,proj,prr+0.2,pt+0.2,proj+0.06,F.M); B.box(bk,pl-0.2,pt,proj,prr+0.2,pt+0.2,proj+0.06,F.M); }
    }
    if((FT.ablaq||st.id==='mamluk'||st.id==='levantine')&&arch!=='flat') ringV({M:mm(F.M,mT(0,0,proj+0.005))},arch,na,nb,vs,0.32);
    for(const [a,b] of [[na,na+0.5],[nb-0.5,nb]]) B.box('stone',a,y0,-t-D+0.1,b,y0+0.45,-t-0.15,F.M);
    if(top&&st.pish>0) B.box('band',F.uA,frameTop-0.05,-t,F.uB,frameTop+0.12,proj+0.05,F.M);
    if(FT.lanterns){ lantern(B,F,na-0.55,y0+2.7,proj); lantern(B,F,nb+0.55,y0+2.7,proj); }
  }

  /* Europe, Africa, the Americas: the doorway in the wall and a porch before it — a pedimented prothyrum, a gabled porch on posts,
     a bracketed hood, a vaulted vestibule with an arched front, or the buttressed Tukulor portal of the Sahel */
  function porchGate(x,z,l,d,cx,cz,y0,y1){
    const F=trimF(fr(cx,cz,d),k=>faceKind(x,z,l,k)!==null), wk=wallKey(l), m=F.mid, pc=st.porch||{}, kind=pc.roof||'flat', top_=!isMass(cellAt(x,z,l+1));
    const da=st.arch.portal, dw=1.3, dh=Math.min(2.75,H-0.75);
    const door={u0:m-dw/2,u1:m+dw/2,v0:y0,vs:y0+(da==='trap'? Math.max(0.05,dh-archRise(da,dw)) : Math.max(1.85,dh-archRise(da,dw))),arch:da,fill:'door',frame:FR(pc.frame||'stone',.15,.06),gate:true,fan:!!pc.fan&&da!=='flat',lantern:kind==='hood'||kind==='tukulor'};
    const ops=[door], [outer,holes]=wallShape(F.uA,F.uB,y0,y1,ops); B.ext(wk,outer,holes,t,atF(F,0,0,-t)); colWall(F,F.uA,F.uB,y0,y1,-t,0,ops);
    const c={kind:'street',l,H,t,y0,y1,uA:F.uA,uB:F.uB,x,z,d,mod:{},wk,top:top_,lanternOK:true};
    dressOps(F,ops,c); faceGreebles(F,ops,c);
    const dt=openTop(door)+0.15, cw2=dw/2+0.5, colH=Math.min(dt+0.35,y1-0.5)-y0;
    const steps=(D,w)=>{ B.box('stone',m-w,y0,0,m+w,y0+0.15,D+0.35,F.M); B.box('stone',m-w+0.1,y0+0.15,0,m+w-0.1,y0+0.3,D,F.M); colM(F.M,m-w,y0,0,m+w,y0+0.15,D+0.35); colM(F.M,m-w+0.1,y0,0,m+w-0.1,y0+0.3,D); };
    switch(kind){
      case 'pediment': { const D=1.5, yb=y0+0.3, w=cw2+0.3, ye=y0+colH; steps(D,w);
        for(const sg of [-1,1]){ const M=atF(F,m+sg*cw2,yb,D-0.3); colM(M,-0.24,0,-0.24,0.24,ye-yb,0.24); B.box('stone',-0.24,0,-0.24,0.24,0.18,0.24,M); B.cyl('stone',0.18,0.155,ye-yb-0.34,12,mm(M,mT(0,0.18,0))); B.cyl('stone',0.155,0.22,0.1,12,mm(M,mT(0,ye-yb-0.26,0))); B.box('stone',-0.26,ye-yb-0.16,-0.26,0.26,ye-yb,0.26,M);
          B.box('stone',m+sg*cw2-0.2,yb,0,m+sg*cw2+0.2,ye,0.1,F.M); }
        B.box('stone',m-w,ye,0,m+w,ye+0.38,D+0.02,F.M); B.box('trim',m-w-0.06,ye+0.28,0,m+w+0.06,ye+0.4,D+0.08,F.M);
        const prs=Math.min(0.3*w,(top_?(PITCH?y1-0.02:y1+0.6):y1+0.5)-(ye+0.4)); if(prs>0.2) B.ext('stone',[[m-w-0.06,ye+0.403],[m+w+0.06,ye+0.403],[m,ye+0.403+prs]],null,D+0.08,F.M);
        break; }
      case 'gable': case 'hood': { const hood=kind==='hood', D=hood?1.0:1.6, w=cw2+0.15, yr=y0+colH;
        if(!hood){ steps(D,w-0.1); const post=pc.cols||'wood';
          for(const sg of [-1,1]){ const u=m+sg*(w-0.15); if(post==='stone'){ const M=atF(F,u,y0+0.3,D-0.2); B.cyl('stone',0.14,0.12,colH-0.44,10,M); B.box('stone',-0.18,colH-0.44,-0.18,0.18,colH-0.3,0.18,M); } else B.box('wood',u-0.09,y0+0.3,D-0.29,u+0.09,yr-0.2,D-0.11,F.M); colM(F.M,u-0.12,y0,D-0.32,u+0.12,yr,D-0.08); } }
        else for(const sg of [-1,1]) B.segCyl('wood',atW(F,m+sg*(w-0.2),yr-0.9,0),atW(F,m+sg*(w-0.2),yr-0.2,D-0.15),0.06,0.05,5);
        const cfg=Object.assign({},st.pr||{tile:{kind:'barrel',c:'#a85a3a'},ridge:'plain'},{kind:'gable',ov:0.22,thick:0.08,ridgeH:0.12,rafters:false,struts:false,lift:0,curve:1,gable:hood?'wood':(st.pr&&st.pr.gable==='painted'?'painted':'wall')});
        const room=(top_&&PITCH?y1+0.12:y1+0.5)-yr-0.2;   // under the main eave, or below the windows of the storey above cfg.pitch=Math.max(0.25,Math.min(cfg.pitch||0.6,room/(w+0.22)));
        B.box('wood',m-w,yr-0.2,0,m+w,yr,D,F.M);
        pitchedRoof(B,0.02,D,-(m+w),-(m-w),yr,cfg,{a0:0,a1:1,b0:1,b1:1},mm(F.M,mRY(-Math.PI/2)),{wallK:wk,ornaments:!!FT.ornaments,closedEnds:[false,true]});
        break; }
      case 'tukulor': { const bw=0.5, upT=top_&&FT.parapet? st.parH+0.9 : -0.1;
        for(const sg of [-1,1]){ const u0=m+sg*(dw/2+0.28), u1=u0+sg*bw, ua=Math.min(u0,u1), ub=Math.max(u0,u1); B.box(wk,ua,y0,0,ub,y1+upT,0.75,F.M); colM(F.M,ua,y0,0,ub,y1,0.75); if(upT>0) B.cone(wk,0.26,0.75,6,atF(F,(ua+ub)/2,y1+upT,0.38));
          for(const v of [y0+1.2,y0+2.2,y0+3.1]) if(v<y1+upT-0.3) B.box('wood',(ua+ub)/2-0.04,v-0.04,0.3,(ua+ub)/2+0.04,v+0.04,1.15,F.M); }
        const lt=Math.min(dt+0.1,y1-0.6); B.box(wk,m-dw/2-0.28,lt,0,m+dw/2+0.28,lt+0.35,0.45,F.M);
        if(y1-lt>1.3){ B.box(wk,m-0.6,lt+0.35,0,m+0.6,y1-0.15,0.35,F.M); B.box('lattice',m-0.3,lt+0.6,0.352,m+0.3,lt+1.05,0.36,F.M); }
        if(top_&&FT.parapet) for(const du of [-0.42,0.42]) B.cone(wk,0.14,0.55,6,atF(F,m+du,y1+st.parH,0.12));
        break; }
      default: { // a vaulted vestibule with an arched front between two piers, under a flat roof
        const D=1.25, w=cw2+0.35, ph=Math.min(dt+0.55,y1-0.35)-y0, ow=2*cw2-0.5; let ar=da, vs=y0+ph-0.35-archRise(ar,ow); if(vs<y0+1.9){ ar='flat'; vs=y0+ph-0.35; }
        const op={u0:m-ow/2,u1:m+ow/2,v0:y0,vs,arch:ar};
        B.ext(wk,dedupe([[m-w,y0],[op.u0,y0],...archPts(ar,op.u0,op.u1,vs),[op.u1,y0],[m+w,y0],[m+w,y0+ph],[m-w,y0+ph]]),null,0.35,atF(F,0,0,D-0.35)); colWall(F,m-w,m+w,y0,y0+ph,D-0.35,D,[op]);
        for(const sg of [-1,1]){ const a=sg<0?m-w:m+w-0.35; B.box(wk,a,y0,0,a+0.35,y0+ph,D-0.35,F.M); colM(F.M,a,y0,0,a+0.35,y0+ph,D-0.35); }
        B.box(wk,m-w,y0+ph,0,m+w,y0+ph+0.3,D,F.M); B.box(st.parapet==='mudround'?wk:'stone',m-w-0.05,y0+ph+0.3,0,m+w+0.05,y0+ph+0.38,D+0.05,F.M);
        B.box('court',m-w+0.35,y0,0,m+w-0.35,y0+0.06,D-0.35,F.M);
        if(FT.lanterns){ const p=atW(F,m,0,D*0.45); hangLamp(B,p.x,y0+ph-0.05,p.z); } }
    }
  }
  /* East and South-East Asian gatehouse: a deep square-headed recess, the double door set at its back on a raised threshold */
  function gateHouse(x,z,l,d,cx,cz,y0,y1){
    const F=trimF(fr(cx,cz,d),k=>faceKind(x,z,l,k)!==null), wk=wallKey(l), D=1.5, wn=Math.min(3.0,CW-2*t-1.4), m=F.mid, na=m-wn/2, nb=m+wn/2, top=Math.min(y1-0.35,y0+3.3);
    const post=(st.timber&&st.timber.post)||'wood';
    B.ext(wk,dedupe([[F.uA,y0],[na,y0],[na,top],[nb,top],[nb,y0],[F.uB,y0],[F.uB,y1],[F.uA,y1]]),null,t,atF(F,0,0,-t));
    colWall(F,F.uA,F.uB,y0,y1,-t,0,[{u0:na,u1:nb,v0:y0,vs:top,arch:'flat'}]);
    B.box(wk,na-0.25,y0,-t-D,na,top,-t,F.M); B.box(wk,nb,y0,-t-D,nb+0.25,top,-t,F.M); colM(F.M,na-0.25,y0,-t-D,na,top,-t); colM(F.M,nb,y0,-t-D,nb+0.25,top,-t);
    B.box(post,na,top-0.22,-t-D,nb,top,0.04,F.M); if(FT.bands) B.box('band',na,top-0.6,-0.02,nb,top-0.22,0.05,F.M);
    const F2={M:mm(F.M,mT(0,0,-t-D)),uA:na,uB:nb,mid:m};
    const dw=Math.min(1.7,wn-0.9), dh=Math.min(2.6,top-y0-0.45);
    const door={u0:m-dw/2,u1:m+dw/2,v0:y0+0.14,vs:y0+0.14+dh,arch:'flat',fill:'door',frame:FR(post,.14,.08),gate:true,knockers:st.id==='siheyuan'};
    const [outer]=wallShape(na,nb,y0,top,[door]); B.ext(post==='paint'?'paint':'wood',outer,null,0.22,mm(F2.M,mT(0,0,-0.22))); colWall(F2,na,nb,y0,top,-0.22,0,[door]);
    dressOps(F2,[door],{t:0.22,y0,y1:top,wk,uA:na,uB:nb,lanternOK:false});
    B.box('stone',m-dw/2-0.12,y0,0.0,m+dw/2+0.12,y0+0.14,0.32,F2.M);
    if(st.id==='siheyuan'||st.id==='hanok'||st.id==='jiangnan') for(const k of [-0.36,-0.12,0.12,0.36]) B.box('gold',m+k*dw-0.07,openTop(door)+0.18,0.0,m+k*dw+0.07,openTop(door)+0.34,0.16,F2.M);
    B.box('black',m-0.75,top+0.12,0.0,m+0.75,top+0.6,0.05,F.M); B.box('gold',m-0.8,top+0.07,-0.01,m+0.8,top+0.65,0.035,F.M);
    if(st.id!=='kyoto'&&st.id!=='tibetan') for(const u of [na-0.55,nb+0.55]){ B.box('stone',u-0.35,y0,0.05,u+0.35,y0+0.45,0.8,F.M); B.sphere('stone',0.32,mT(...atW(F,u,y0+0.78,0.45).toArray()),8,6); colM(F.M,u-0.35,y0,0.05,u+0.35,y0+1.1,0.8); }
    if(st.id==='tibetan'){ for(const u of [na+0.25,nb-0.25]) B.cyl('paint',0.14,0.14,top-y0,8,atF(F,u,y0,-0.25)); }
    if(FT.lanterns){ const a=atW(F,na+0.45,0,-0.35), b=atW(F,nb-0.45,0,-0.35); hangLamp(B,a.x,top-0.05,a.z); hangLamp(B,b.x,top-0.05,b.z); }
  }
  /* Egyptian pylon: two battered towers under cavetto cornices, and a lower gateway between them */
  function pylonGate(x,z,l,d,cx,cz,y0,y1){
    const F=trimF(fr(cx,cz,d),k=>faceKind(x,z,l,k)!==null), wk=wallKey(l), wn=Math.min(2.6,(F.uB-F.uA)*0.3), m=F.mid, na=m-wn/2, nb=m+wn/2, Hp=Math.max(H*1.7,6.5), dd=2.4, wc=0.2;
    for(const sg of [-1,1]){ const ua=sg<0?F.uA:nb, ub=sg<0?na:F.uB, tw=ub-ua, uc=(ua+ub)/2, hb=Hp-0.75;
      B.cyl(wk,1.414,1.414*0.9,hb,4,mm(atF(F,uc,y0,wc),mS(tw/2,1,dd/2),mRY(Math.PI/4)));
      const Mc=mm(atF(F,uc,y0+hb,wc),mS(tw/2*0.9,1,dd/2*0.9),mRY(Math.PI/4)); B.cyl('stone',1.414,1.414*1.14,0.55,4,Mc); B.cyl('stone',1.414*1.14,1.414*1.14,0.2,4,mm(Mc,mT(0,0.55,0)));
      colM(F.M,ua,y0,wc-dd/2,ub,y0+Hp,wc+dd/2);
      const ph=Math.min(hb-1.6,5.4); B.box('relief',ua+0.35,0,0,ub-0.35,ph,0.03,mm(atF(F,0,y0+1.0,wc+dd/2-0.005),mRX(-Math.atan(dd/2*0.1/hb)))); }
    const gt=y0+Math.min(Hp*0.7,H+2.2), dh=Math.min(gt-y0-1.1,4.0), door={u0:m-wn*0.36,u1:m+wn*0.36,v0:y0,vs:y0+dh,arch:'flat',fill:'door'};
    const [outer]=wallShape(na,nb,y0,gt,[door]); B.ext(wk,outer,null,dd*0.8,atF(F,0,0,wc-dd*0.4)); colWall(F,na,nb,y0,gt,wc-dd*0.4,wc+dd*0.4,[door]);
    B.box('stone',na,gt-0.55,wc+dd*0.4,nb,gt-0.12,wc+dd*0.4+0.12,F.M); B.box('stone',na,gt-0.12,wc-dd*0.4,nb,gt+0.06,wc+dd*0.4+0.3,F.M);
    recOp(x,z,l,d,F,door,y0);
  }
  /* Balinese candi bentar: a temple-mountain split in two, standing in front of the compound wall; a narrow kori door behind */
  function candiGate(x,z,l,d,cx,cz,y0,y1){
    const F=trimF(fr(cx,cz,d),k=>faceKind(x,z,l,k)!==null), wk=wallKey(l), m=F.mid, gw=1.6;
    const door={u0:m-0.55,u1:m+0.55,v0:y0+0.2,vs:y0+2.3,arch:'flat',fill:'door',frame:FR('paint',.12,.08),gate:true};
    const [outer,holes]=wallShape(F.uA,F.uB,y0,y1,[door]); B.ext(wk,outer,holes,t,atF(F,0,0,-t)); colWall(F,F.uA,F.uB,y0,y1,-t,0,[door]); dressOps(F,[door],{t,y0,y1,wk,uA:F.uA,uB:F.uB});
    B.box('stone',m-gw/2,y0,0,m+gw/2,y0+0.1,1.3,F.M); B.box('stone',m-gw/2,y0,0,m+gw/2,y0+0.2,0.6,F.M);
    for(const sg of [-1,1]){ const inner=m+sg*gw/2; let v=y0, w=1.5, dep=1.15;
      for(let k=0;k<8;k++){ const h=k<2?0.85:0.5, a=sg<0?inner-w:inner, b=sg<0?inner:inner+w; B.box(k%2?'band':wk,a,v,0.0,b,v+h,dep,F.M); if(k%2===0) B.box('stone',a-0.04,v+h-0.08,-0.01,b+0.04,v+h,dep+0.05,F.M); v+=h; w*=0.84; dep*=0.9; }
      const a=sg<0?inner-w:inner, b=sg<0?inner:inner+w; B.box('stone',a,v,0.1,b,v+0.5,0.5,F.M); colM(F.M,sg<0?inner-1.5:inner,y0,0.0,sg<0?inner:inner+1.5,v,1.15); }
  }

  /* Asian open-fronted hall (maru, sala, xuan): posts and a head beam instead of the iwan's arch */
  function openFront(x,z,l,d,cx,cz,y0,y1){
    const F=trimF(fr(cx,cz,d),k=>faceKind(x,z,l,k)!==null), post=(st.timber&&st.timber.post)||'wood', pw=(st.timber&&st.timber.w)||0.16;
    const nb=3; for(let i=0;i<=nb;i++){ const u=F.uA+pw/2+0.05+(F.uB-F.uA-pw-0.1)*i/nb; B.box(post,u-pw/2,y0+0.004,-pw*0.7,u+pw/2,y1-0.05,pw*0.3,F.M); colM(F.M,u-pw/2,y0,-pw*0.7,u+pw/2,y1,pw*0.3); B.box('stone',u-pw*0.85,y0,-pw*1.05,u+pw*0.85,y0+0.12,pw*0.65,F.M); }
    B.box(post,F.uA,y1-0.42,-0.24,F.uB,y1-0.08,0.1,F.M); colM(F.M,F.uA,y1-0.42,-0.24,F.uB,y1,0.1);
    if(FT.bands&&st.band!=='plain') B.box('band',F.uA,y1-0.7,-0.06,F.uB,y1-0.42,0.06,F.M);
    if(st.timber&&st.timber.post==='paint') for(let i=0;i<nb;i++){ const a=F.uA+0.2+(F.uB-F.uA-0.4)*i/nb+0.12, b=F.uA+0.2+(F.uB-F.uA-0.4)*(i+1)/nb-0.12; B.box('lattice',a,y1-0.95,-0.05,b,y1-0.7,0.0,F.M); }
    if(FT.lanterns&&l===0){ const p=atW(F,F.mid,0,-1.4); hangLamp(B,p.x,y1-0.35,p.z); }
  }

  /* ---------- arcade face ---------- */
  function arcadeFace(x,z,l,d,cx,cz,y0,y1){
    const F=trimF(fr(cx,cz,d),k=>faceKind(x,z,l,k)!==null), cfg=st.arc, arch=st.arch.arc, nb=Math.max(cfg.bays,Math.round(cfg.bays*KS)), wk=wallKey(l);
    const rx=DIRS[d][1], rz=-DIRS[d][0];
    const cont=s=>{ const xx=x+rx*s, zz=z+rz*s; if(cellAt(xx,zz,l)!==ARC) return false; const k=faceKind(xx,zz,l,d); return k==='street'||k==='court'; };
    const cL=cont(-1), cR=cont(1); const bays=[];
    if(cfg.posts){ const post=(st.timber&&st.timber.post)||cfg.colMat||'wood', pw=cfg.r*1.4, us=[];
      for(let i=0;i<=nb;i++) us.push(F.uA+(cL?0:pw/2+0.05)+(F.uB-F.uA-(cL?0:pw/2+0.05)-(cR?0:pw/2+0.05))*i/nb);
      for(const u of us){ B.box(post,u-pw/2,y0+0.004,-pw/2,u+pw/2,y1-0.1,pw/2,F.M); colM(F.M,u-pw/2,y0,-pw/2,u+pw/2,y1,pw/2); B.box('stone',u-pw*0.8,y0,-pw*0.8,u+pw*0.8,y0+0.12,pw*0.8,F.M); }
      B.box(post,F.uA,y1-0.4,-0.2,F.uB,y1-0.08,0.1,F.M); colM(F.M,F.uA,y1-0.4,-0.2,F.uB,y1,0.1);
      if(FT.bands&&st.band!=='plain') B.box('band',F.uA,y1-0.66,-0.05,F.uB,y1-0.4,0.05,F.M);
      if(l>0) for(let i=0;i<nb;i++){ const a=us[i]+pw/2, b=us[i+1]-pw/2; B.box(post,a,y0+0.86,-0.06,b,y0+0.94,0.06,F.M); for(let u=a+0.15;u<b-0.05;u+=0.22) B.box(post,u-0.025,y0,-0.03,u+0.025,y0+0.86,0.03,F.M); colM(F.M,a,y0,-0.08,b,y0+0.95,0.08); }
      return; }
    if(cfg.cols){
      const r=cfg.r||0.22, ca=r+0.1, c0=F.uA+(cL?0:t/2), cN=F.uB-(cR?0:t/2), cols=[];
      for(let i=0;i<=nb;i++) cols.push(c0+(cN-c0)*i/nb);
      const bw=(cN-c0)/nb-2*ca, rise=archRise(arch,bw);
      let vs= arch==='flat'? y1-0.85 : Math.min(y0+H*0.62,y1-0.45-rise); vs=Math.max(vs,y0+1.6);
      const pts=[[F.uA,vs]];
      for(let i=0;i<nb;i++){ const a=cols[i]+ca, b=cols[i+1]-ca; bays.push([a,b]); pts.push([a,vs]); for(const p of archPts(arch,a,b,vs)) pts.push(p); pts.push([b,vs]); }
      pts.push([F.uB,vs],[F.uB,y1],[F.uA,y1]);
      B.ext(wk,dedupe(pts),null,t,atF(F,0,0,-t)); colM(F.M,F.uA,vs,-t,F.uB,y1,0);
      const cm=cfg.colMat==='wall'?wk:cfg.colMat;
      for(const u of cols){ const M=atF(F,u,y0,-t/2), ck=Math.round(M.elements[12]*50)+','+Math.round(M.elements[14]*50)+','+Math.round(y0*50); if(colSeen.has(ck)) continue; colSeen.add(ck); colM(M,-ca,0,-ca,ca,vs-y0,ca);   // a corner column belongs to both faces: build it once
        if(cfg.order&&ruinColumn(B,cfg.order,M,vs-y0,r,cm,ca)) continue;
        B.box(cm,-ca,0,-ca,ca,0.22,ca,M);
        B.cyl(cm,cfg.taper?r*1.25:r,cfg.taper?r*0.85:r*0.9,vs-y0-0.42,cfg.taper?8:12,mm(M,mT(0,0.22,0)));
        if(cfg.echinus) B.cyl(cm,r*0.9,ca*0.96,0.13,12,mm(M,mT(0,vs-y0-0.33,0)));
        B.box(cm==='stone'?'stone':'wood',-ca,vs-y0-0.2,-ca,ca,vs-y0,ca,M); }
      if(FT.ablaq&&arch!=='flat') for(const [a,b] of bays) ringV({M:mm(F.M,mT(0,0,0.005))},arch,a,b,vs,0.22);
    } else {
      const p=Math.max(0.7,t+0.25), pL=cL?p/2:p, pR=cR?p/2:p, bw=(CW-pL-pR-(nb-1)*p)/nb;
      let rise=archRise(arch,bw), vs=Math.min(y0+H*0.58,y1-0.45-rise); if(vs<y0+1.2) vs=y0+1.2;
      let ar=arch; if(vs+rise>y1-0.25){ ar='fourc'; rise=archRise(ar,bw); vs=Math.min(vs,y1-0.35-rise); }
      const pts=[[F.uA,y0]]; let u=F.uA+pL;
      for(let i=0;i<nb;i++){ const a=u, b=u+bw; bays.push([a,b]); pts.push([a,y0]); for(const q of archPts(ar,a,b,vs)) pts.push(q); pts.push([b,y0]); u=b+p; }
      pts.push([F.uB,y0],[F.uB,y1],[F.uA,y1]);
      B.ext(wk,dedupe(pts),null,t,atF(F,0,0,-t));
      colWall(F,F.uA,F.uB,y0,y1,-t,0,bays.map(([a,b])=>({u0:a,u1:b,v0:y0,vs,arch:ar})));
      for(let i=0;i<=nb;i++){ const pu= i===0? F.uA+pL/2 : i===nb? F.uB-pR/2 : bays[i-1][1]+p/2; const hw= i===0?pL/2: i===nb?pR/2: p/2; B.box('trim',pu-hw-0.03,vs-0.12,0,pu+hw+0.03,vs,0.05,F.M); }
      if(FT.ablaq&&ar!=='flat') for(const [a,b] of bays) ringV({M:mm(F.M,mT(0,0,0.005))},ar,a,b,vs,0.24);
    }
    if(l>0) for(const [a,b] of bays){ colM(F.M,a,y0,-t*0.8,b,y0+1.0,-t*0.2);
      if(st.lattice==='mashrabiya'||st.id==='hejazi'||st.id==='khaleeji'){ B.box('lattice',a,y0+0.1,-t*0.55,b,y0+1.0,-t*0.45,F.M); B.box(st.id==='hejazi'||st.id==='khaleeji'?'paint':'wood',a,y0+0.98,-t*0.6,b,y0+1.06,-t*0.4,F.M); B.box('wood',a,y0,-t*0.6,b,y0+0.1,-t*0.4,F.M); }
      else { B.box(cfg.cols?'stone':wk,a,y0,-t*0.7,b,y0+0.85,-t*0.3,F.M); if(FT.panels) B.box('tile',a+0.1,y0+0.12,-t*0.3,b-0.1,y0+0.73,-t*0.3+0.015,F.M); B.box('stone',a-0.02,y0+0.85,-t*0.75,b+0.02,y0+0.93,-t*0.25,F.M); }
    }
    if(FT.bands&&l>0) B.box('band',F.uA,y1-0.4,0,F.uB,y1-0.1,0.035,F.M);
  }

  /* ---------- domes ---------- */
  function domeOn(cx,cz,yb,half,prof,o){
    o=o||{};
    if(prof==='pyramid'){ B.walkOn=true; const pr=st.pr||{curve:1.3,lift:0.25,thick:0.12,tile:{kind:'barrel'}}, mat=st.domeMat==='gold'?'gold':'roofTile', two=!o.small&&ASIA&&st.id!=='tibetan';
      let y=yb-0.02; if(two){ y=skirtRoof(B,cx,y,cz,4,half+0.9,half*0.62,0.75,{curve:pr.curve,lift:pr.lift,thick:0.13,tile:pr.tile},mat); B.box(wallKey(0),cx-half*0.62,y-0.1,cz-half*0.62,cx+half*0.62,y+0.56,cz+half*0.62); colB(cx-half*0.62,yb,cz-half*0.62,cx+half*0.62,y+0.8,cz+half*0.62); B.box('band',cx-half*0.62-0.02,y+0.55,cz-half*0.62-0.02,cx+half*0.62+0.02,y+0.8,cz+half*0.62+0.02); y+=0.75; }
      const r0=(two?half*0.62:half)+0.9, top=skirtRoof(B,cx,y,cz,4,r0,0,r0*0.95,{curve:pr.curve,lift:pr.lift,thick:0.13,tile:pr.tile},mat);
      B.walkOn=false;
      if(st.id==='tibetan'){ B.cyl('gold',0.22,0.12,0.6,8,mT(cx,top-0.1,cz)); B.sphere('gold',0.18,mT(cx,top+0.6,cz),8,6); B.cone('gold',0.1,0.6,8,mT(cx,top+0.75,cz)); }
      else { B.sphere('metal',0.2,mT(cx,top+0.1,cz),8,6); B.cone('metal',0.1,0.6,6,mT(cx,top+0.25,cz)); }
      return top+0.6; }
    const zone=o.zone!=null?o.zone:st.zone, drumH=o.drum!=null?o.drum:st.drum, small=!!o.small, zk=o.zk||'wall';
    const ap=half-0.12, R8=ap/Math.cos(Math.PI/8); let y=yb;
    if(zone>0.05){
      B.cyl(zk,R8,R8*0.97,zone,8,mm(mT(cx,y,cz),mRY(Math.PI/8)),o.open);
      if(!small&&st.id==='ottoman') for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){ const px=cx+sx*(half-0.35), pz=cz+sz*(half-0.35); B.cyl('stone',0.28,0.26,zone+0.75,8,mT(px,y,pz)); B.cone('lead',0.34,0.75,8,mT(px,y+zone+0.75,pz)); }
      else if(!small&&st.id==='mamluk') for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]) B.cyl('stone',0.95,0.12,zone,4,mm(mT(cx+sx*(half-0.6),y,cz+sz*(half-0.6)),mRY(Math.PI/4)));
      y+=zone; }
    const rd=ap*0.86;
    if(o.open) B.lathe(zk,[[R8*0.97,0],[rd,0]],24,mT(cx,y,cz));
    if(drumH>0.05){
      const dmk= st.domeMat==='tile'? 'tile' : st.domeMat==='lead'? 'stone' : zk;
      B.cyl(dmk,rd,rd,drumH,24,mT(cx,y,cz),o.open);
      const nw=small?6:(rd>2?12:8);
      for(let k=0;k<nw;k++){ const a=k/nw*Math.PI*2+Math.PI/nw; const M=mm(mT(cx,y,cz),mRY(a),mT(0,0,rd-0.04));
        B.box('void',-0.17,drumH*0.22,0,0.17,drumH*0.7,0.07,M); B.box('trim',-0.22,drumH*0.7,0,0.22,drumH*0.78,0.09,M); }
      B.cyl('trim',rd+0.08,rd+0.08,0.12,24,mT(cx,y+drumH-0.12,cz),true);
      y+=drumH; }
    const prf=DOMEPROF[prof]||DOMEPROF.hemi; const pts=prf(rd);
    B.lathe('dome',pts,32,mT(cx,y,cz));
    const topY=y+pts[pts.length-1][1];
    colB(cx-R8*0.95,yb,cz-R8*0.95,cx+R8*0.95,topY,cz+R8*0.95);
    if(prof==='mudpoint'){ B.cyl(zk,0.32,0.28,0.35,8,mT(cx,topY-0.12,cz)); }
    else if(prof!=='mudlow'){ if(st.finial) worldFinial(B,st.finial,cx,topY-0.05,cz,small?0.6:1); else alem(B,cx,topY-0.05,cz,small?0.6:1); }
    return topY;
  }

  /* ---------- towers ---------- */
  function towerStack(x,z,l){
    let n=0; while(l+n<4&&cellAt(x,z,l+n)===TOWER) n++;
    const [cx0,cz0]=cellC(x,z), yb=l*H, mod=modOf(x,z,l);
    let kind=mod.tower||st.tower; if(st.id==='khaleeji'&&!mod.tower) kind= l===0?'burj':'barjeel';
    const asiaT=ASIA_TOWERS.has(kind), worldT=WORLD_TOWERS.has(kind), ruinT=RUIN_TOWERS.has(kind), spire=/minaret/.test(kind)||(asiaT&&kind!=='stonepagoda'&&kind!=='drumtower');
    const Ht= ruinT? Math.max(n*H, H*(RUIN_TOWER_H[kind]||1.6)-(l>0?H*0.6:0)) : worldT? Math.max(n*H, H*(WORLD_TOWER_H[kind]||1.6)-(l>0?H*0.6:0)) : asiaT&&spire? Math.max(n*H, H*3.0-(l>0?H*0.8:0)) : spire? Math.max(n*H, H*2.15-(l>0?H*0.6:0)) : asiaT? Math.max(n*H,H*1.9) : n*H;
    const half=TOWER_HALF[kind]||1.3; let ox=0, oz=0;
    if(l===0) for(const [dx,dz] of DIRS) if(isMass(cellAt(x+dx,z+dz,0))){ ox+=dx; oz+=dz; }
    const sh=asiaT||WORLD_FREE.has(kind)||RUIN_FREE.has(kind)? 0 : CW/2-half-0.02, cx=cx0+Math.sign(ox)*sh, cz=cz0+Math.sign(oz)*sh;   // temples and pagodas stand free in their square
    const pyr=kind==='mayapyramid'||kind==='ziggurat'||kind==='tholos'||kind==='prasat'||kind==='kaaba'||kind==='cribtower';   // a pyramid is climbed: its tiers and steps carry their own colliders
    if(l===0&&!pyr) B.box('base',cx-half-0.15,-0.05,cz-half-0.15,cx+half+0.15,0.35,cz+half+0.15);
    if(!pyr) colB(cx-half,yb,cz-half,cx+half,yb+Ht+1.5,cz+half);
    const wk=FT.ablaq&&(kind==='mminaret'||kind==='sqminaret')?'ablaq':(l===0?wallKey(0):'wall');
    const balcony=(y,r,mat)=>{ B.cyl(mat||'stone',r,r+0.45,0.45,16,mT(cx,y-0.45,cz)); B.cyl('trim',r+0.5,r+0.5,0.14,16,mT(cx,y,cz)); B.cyl(mat||'stone',r+0.45,r+0.45,0.85,16,mT(cx,y+0.14,cz),true); B.cyl('stone',r+0.47,r+0.47,0.07,16,mT(cx,y+0.95,cz),true); };
    const voidPanel=(F,u,v,w,h,arch)=>B.flat('void',openPoly({u0:u-w/2,u1:u+w/2,v0:v,vs:v+Math.max(0.2,h-archRise(arch,w)),arch}),atF(F,0,0,0.012));
    if(ruinT){ B.walkOn=true; ruinTower(B,kind,cx,yb,cz,Ht,half,st,wk,colB,n,H); B.walkOn=false; return; }
    if(worldT){ B.walkOn=true; worldTower(B,kind,cx,yb,cz,Ht,half,st,wk,colB,n,H); B.walkOn=false; return; }
    if(asiaT){ B.walkOn=true; asiaTower(B,kind,cx,yb,cz,Ht,half,st,()=>{},wk); B.walkOn=false; if(FT.lanterns&&(kind==='jpagoda'||kind==='cpagoda'||kind==='drumtower')) hangLamp(B,cx+half+0.5,yb+H*0.9,cz); return; }
    switch(kind){
      case 'mminaret': {
        const fr_= n===1?[.55,.45,0]: n===2?[.45,.33,.22]:[.38,.32,.30];
        let y=yb; const h1=Ht*fr_[0];
        B.box(wk,cx-1.3,y,cz-1.3,cx+1.3,y+h1,cz+1.3);
        for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0,1.3); voidPanel(F,F.mid,y+h1*0.4,0.7,1.2,'keel'); }
        y+=h1; balcony(y,1.3);
        const h2=Ht*fr_[1]; B.cyl(wk,1.12,1.06,h2-0.14,8,mm(mT(cx,y+0.14,cz),mRY(Math.PI/8)));
        for(let k=0;k<8;k++){ const a=k*Math.PI/4; B.box('void',-0.16,h2*0.35,0,0.16,h2*0.35+0.9,0.05,mm(mT(cx,y,cz),mRY(a),mT(0,0,1.02))); }
        y+=h2;
        if(fr_[2]>0){ balcony(y,1.05); const h3=Ht*fr_[2]; B.cyl(wk,0.9,0.84,h3-0.14,16,mT(cx,y+0.14,cz)); y+=h3; }
        balcony(y,0.9);
        for(let k=0;k<8;k++){ const a=k/8*Math.PI*2; B.cyl('stone',0.07,0.07,1.5,6,mT(cx+Math.cos(a)*0.62,y+0.14,cz+Math.sin(a)*0.62)); }
        B.cyl('stone',0.82,0.82,0.15,16,mT(cx,y+1.64,cz)); B.lathe('stone',DOMEPROF.onion(0.62),16,mT(cx,y+1.79,cz)); alem(B,cx,y+1.79+0.62*1.38,cz,0.7);
        break; }
      case 'ominaret': {
        const ped=Math.min(H*0.9,Ht*0.3); B.box('stone',cx-1.2,yb,cz-1.2,cx+1.2,yb+ped,cz+1.2); B.cyl('stone',1.22,0.95,0.9,16,mT(cx,yb+ped,cz));
        let y=yb+ped+0.9; const sH=yb+Ht+H*0.7-y;
        B.cyl('stone',0.95,0.88,sH*0.8,16,mT(cx,y,cz)); y+=sH*0.8; balcony(y,0.88,'stone');
        B.cyl('stone',0.82,0.8,sH*0.2,16,mT(cx,y+0.14,cz)); y+=sH*0.2+0.14;
        B.cyl('stone',0.98,0.98,0.12,16,mT(cx,y,cz)); B.cone('lead',0.98,3.4,16,mT(cx,y+0.12,cz)); alem(B,cx,y+3.4,cz,0.8);
        break; }
      case 'pminaret': {
        const r0=1.25, r1=1.02; B.cyl('wall',r0,r1,Ht,16,mT(cx,yb,cz));
        for(let y=yb+1.8;y<yb+Ht-1.2;y+=2.6){ const f=(y-yb)/Ht, r=lerp(r0,r1,f)+0.03; B.cyl('tile',r,r-0.01,0.55,16,mT(cx,y,cz)); }
        const yt=yb+Ht; B.cyl('tile',r1,r1+0.45,0.7,16,mT(cx,yt-0.7,cz)); B.cyl('trim',r1+0.5,r1+0.5,0.14,16,mT(cx,yt,cz)); B.cyl('wood',r1+0.45,r1+0.45,0.7,16,mT(cx,yt+0.14,cz),true);
        for(let k=0;k<8;k++){ const a=k/8*Math.PI*2; B.cyl('wood',0.06,0.06,1.5,6,mT(cx+Math.cos(a)*0.75,yt+0.14,cz+Math.sin(a)*0.75)); }
        B.cyl('wood',0.95,0.95,0.12,16,mT(cx,yt+1.64,cz)); B.lathe('dome',DOMEPROF.onion(0.8),20,mT(cx,yt+1.76,cz)); alem(B,cx,yt+1.76+0.8*1.38,cz,0.7);
        break; }
      case 'sqminaret': {
        const s=1.2; B.box(wk,cx-s,yb,cz-s,cx+s,yb+Ht,cz+s);
        for(let k=1;k<=n;k++) B.box('trim',cx-s-0.06,yb+k*H-0.18,cz-s-0.06,cx+s+0.06,yb+k*H,cz+s+0.06);
        for(let k=0;k<n;k++) for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0,s); for(const du of [-0.32,0.32]) voidPanel(F,F.mid+du,yb+k*H+H*0.4,0.42,1.3,st.id==='hejazi'?'round':'pointed'); }
        const yt=yb+Ht; B.box('trim',cx-s-0.45,yt,cz-s-0.45,cx+s+0.45,yt+0.18,cz+s+0.45);
        const pm=st.id==='hejazi'?'screen':'stone';
        for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0,s+0.45); B.box(pm,F.uA,yt+0.18,-0.12,F.uB,yt+1.0,0,F.M); }
        B.cyl(wk,0.85,0.85,1.7,8,mm(mT(cx,yt+0.18,cz),mRY(Math.PI/8)));
        for(let k=0;k<8;k++){ const a=k*Math.PI/4; B.box('void',-0.15,0.4,0,0.15,1.3,0.05,mm(mT(cx,yt+0.18,cz),mRY(a),mT(0,0,0.77))); }
        if(st.id==='hejazi'){ B.lathe('trim',DOMEPROF.hemi(0.8),16,mT(cx,yt+1.88,cz)); alem(B,cx,yt+2.65,cz,0.6); }
        else { B.cone('lead',0.98,1.7,8,mm(mT(cx,yt+1.88,cz),mRY(Math.PI/8))); alem(B,cx,yt+3.5,cz,0.6); }
        break; }
      case 'yminaret': {
        const bh=Math.min(H,Ht*0.35); B.box('wall2',cx-1.3,yb,cz-1.3,cx+1.3,yb+bh,cz+1.3);
        B.cyl('wall',1.05,0.85,Ht-bh,8,mm(mT(cx,yb+bh,cz),mRY(Math.PI/8)));
        for(let y=yb+bh+1.2;y<yb+Ht-0.6;y+=2.0){ const f=(y-yb-bh)/(Ht-bh), r=lerp(1.05,0.85,f)+0.03; B.cyl('band',r,r-0.01,0.35,8,mm(mT(cx,y,cz),mRY(Math.PI/8))); }
        const yt=yb+Ht; B.cyl('trim',1.0,1.0,0.14,8,mm(mT(cx,yt,cz),mRY(Math.PI/8)));
        B.cyl('trim',0.78,0.78,1.4,8,mm(mT(cx,yt+0.14,cz),mRY(Math.PI/8)));
        for(let k=0;k<8;k++){ const a=k*Math.PI/4; B.box('void',-0.14,0.3,0,0.14,1.05,0.05,mm(mT(cx,yt+0.14,cz),mRY(a),mT(0,0,0.7))); }
        B.lathe('trim',DOMEPROF.hemi(0.72),16,mT(cx,yt+1.54,cz)); alem(B,cx,yt+2.25,cz,0.6);
        break; }
      case 'badgir': {
        const a=1.1, b=1.7, yt=yb+Ht+1.0, vH=Math.min(2.8,Ht*0.6), vb=yt-vH;
        B.box('wall',cx-a,yb,cz-b,cx+a,vb,cz+b); B.box('trim',cx-a-0.06,vb-0.15,cz-b-0.06,cx+a+0.06,vb,cz+b+0.06);
        B.box('void',cx-a+0.3,vb,cz-b+0.3,cx+a-0.3,yt,cz+b-0.3);
        for(let i=0;i<7;i++){ const u=-b+2*b*(i+0.5)/7; B.box('wall',cx-a,vb,cz+u-0.08,cx+a,yt,cz+u+0.08); }
        for(let i=0;i<4;i++){ const u=-a+2*a*(i+0.5)/4; B.box('wall',cx+u-0.08,vb,cz-b,cx+u+0.08,yt,cz+b); }
        for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]) B.box('wall',cx+sx*a-(sx>0?0.3:0),vb,cz+sz*b-(sz>0?0.3:0),cx+sx*a+(sx<0?0.3:0),yt,cz+sz*b+(sz<0?0.3:0));
        B.box('wall',cx-a-0.12,yt,cz-b-0.12,cx+a+0.12,yt+0.25,cz+b+0.12);
        for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0.12,d%2?b:a); for(let u=F.uA+0.15;u<F.uB-0.1;u+=0.45) B.box('wall',u,yt+0.25,-0.2,u+0.22,yt+0.55,0,F.M); }
        break; }
      case 'barjeel': {
        const s=1.35, yt=yb+Ht+0.8, oH=Math.min(3.2,Ht*0.7), ob=yt-oH;
        B.box('wall',cx-s,yb,cz-s,cx+s,ob-0.13,cz+s); B.box('trim',cx-s-0.06,ob-0.14,cz-s-0.06,cx+s+0.06,ob,cz+s+0.06);
        for(let d=0;d<4;d++){ const F=trimF(fr(cx,cz,d,0,s),()=>true); const hole={u0:F.mid-0.75,u1:F.mid+0.75,v0:ob+0.25,vs:yt-0.35-archRise('pointed',1.5),arch:'pointed'};
          B.ext('wall',[[F.uA,ob],[F.uB,ob],[F.uB,yt],[F.uA,yt]],[openPoly(hole)],0.25,atF(F,0,0,-0.25)); }
        for(const a of [Math.PI/4,-Math.PI/4]) B.box('trim',-s*1.35,ob,-0.05,s*1.35,yt-0.1,0.05,mm(mT(cx,0,cz),mRY(a)));
        B.box('wall',cx-s-0.1,yt,cz-s-0.1,cx+s+0.1,yt+0.18,cz+s+0.1);
        for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0.1,s); for(let u=F.uA+0.2;u<F.uB-0.3;u+=0.48) B.ext('wall',[[0,0],[0.36,0],[0.18,0.42]],null,0.2,atF(F,u,yt+0.18,-0.2)); }
        for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]) B.cyl('wall',0.2,0.04,0.8,4,mm(mT(cx+sx*s,yt+0.18,cz+sz*s),mRY(Math.PI/4)));
        break; }
      default: { // burj / watch
        const najd=kind==='watch', r0=najd?2.2:2.4, r1=r0-0.16*n-0.25, yt=yb+Ht+0.6;
        B.cyl(wk,r0,r1,yt-yb-0.38,22,mT(cx,yb,cz));
        for(let k=0;k<n;k++) for(let j=0;j<3;j++){ const a=j/3*Math.PI*2+k*0.9, y=yb+k*H+H*0.45, r=lerp(r0,r1,(y-yb)/(yt-yb)); B.box('void',-0.08,0,0,0.08,0.85,0.06,mm(mT(cx,y,cz),mRY(a),mT(0,0,r-0.03))); }
        if(najd) for(let j=0;j<12;j++){ const a=j/12*Math.PI*2, y=yt-1.1, r=lerp(r0,r1,(y-yb)/(yt-yb)); B.flat('void',[[-0.14,0],[0.14,0],[0,0.3]],mm(mT(cx,y,cz),mRY(a),mT(0,0,r+0.01))); }
        B.cyl(wk,r1+0.18,r1+0.18,0.4,22,mT(cx,yt-0.4,cz));
        const nm=najd?14:16; for(let j=0;j<nm;j++){ const a=j/nm*Math.PI*2; const pts=najd?[[-.22,0],[.22,0],[.22,.2],[.12,.2],[0,.55],[-.12,.2],[-.22,.2]]:[[-.2,0],[.2,0],[0,.5]];
          B.ext(wk,pts,null,0.28,mm(mT(cx,yt,cz),mRY(a),mT(0,0,r1+0.18-0.28))); }
      }
    }
  }

  /* ---------- roof pavilions ---------- */
  function kiosk(x,z,l){
    const [cx,cz]=cellC(x,z), y=l*H, mod=modOf(x,z,l), hk=2.1*Math.min(1.35,KS), kh=Math.min(3.2,H*0.8), wk=wallKey(l); let kind=mod.kiosk||st.kiosk;
    if(ASIA_KIOSKS.has(kind)){ B.walkOn=true; asiaKiosk(B,kind,cx,y,cz,hk,kh,st,colB,wk); B.walkOn=false; return; }
    if(WORLD_KIOSKS.has(kind)){ B.walkOn=true; worldKiosk(B,kind,cx,y,cz,hk,kh,st,colB,wk); B.walkOn=false; return; }
    if(kind==='chhatri') kind='domed';
    const corners=[[1,1],[1,-1],[-1,1],[-1,-1]];
    const archFace=(d,arch,ow,mat,th)=>{ const F=trimF(fr(cx,cz,d,0,hk),()=>true), rise=archRise(arch,ow); const vs=Math.max(y+1.6,y+kh-0.3-rise); const top=Math.max(y+kh,vs+rise+0.25);
      B.ext(mat,dedupe([[F.uA,y],[F.mid-ow/2,y],...archPts(arch,F.mid-ow/2,F.mid+ow/2,vs),[F.mid+ow/2,y],[F.uB,y],[F.uB,top],[F.uA,top]]),null,th,atF(F,0,0,-th)); colWall(F,F.uA,F.uB,y,top,-th,0,[{u0:F.mid-ow/2,u1:F.mid+ow/2,v0:y,vs,arch}]); return top; };
    switch(kind){
      case 'chartaq': case 'domed': case 'tilehip': {
        const cols=kind!=='chartaq'; let top=y+kh;
        if(cols){ for(const [sx,sz] of corners){ colB(cx+sx*(hk-0.2)-0.2,y,cz+sz*(hk-0.2)-0.2,cx+sx*(hk-0.2)+0.2,y+kh,cz+sz*(hk-0.2)+0.2); B.cyl('stone',0.16,0.14,kh-0.3,10,mT(cx+sx*(hk-0.2),y,cz+sz*(hk-0.2))); B.box('stone',cx+sx*(hk-0.2)-0.24,y+kh-0.3,cz+sz*(hk-0.2)-0.24,cx+sx*(hk-0.2)+0.24,y+kh,cz+sz*(hk-0.2)+0.24); }
          for(let d=0;d<4;d++){ const F=trimF(fr(cx,cz,d,0,hk),()=>true); const a=F.uA+0.45, b=F.uB-0.45, ar=st.arch.arc==='flat'?'pointed':st.arch.arc, vs=y+kh-0.25-archRise(ar,b-a); if(vs>y+1.2) B.ext(kind==='tilehip'?'stone':wk,dedupe([[F.uA,vs],...archPts(ar,a,b,vs),[F.uB,vs],[F.uB,y+kh+0.25],[F.uA,y+kh+0.25]]),null,0.3,atF(F,0,0,-0.3)); }
          top=y+kh+0.25; }
        else { for(let d=0;d<4;d++) top=Math.max(top,archFace(d,st.arch.niche==='triangle'?'pointed':st.arch.niche,2.3,wk,0.45)); }
        B.box(kind==='tilehip'?'stone':wk,cx-hk,top-0.05,cz-hk,cx+hk,top+0.2,cz+hk);
        if(kind==='tilehip') hipRoofXZ(cx-hk-0.35,cz-hk-0.35,cx+hk+0.35,cz+hk+0.35,top+0.2,0.42);
        else domeOn(cx,cz,top+0.2,hk,mod.dome||(st.dome==='mudlow'?'mudpoint':st.dome),{small:true,zone:0.3,drum:kind==='domed'?0.5:0,zk:wk});
        if(FT.lanterns) hangLamp(B,cx,top-0.1,cz);
        break; }
      case 'talar': {
        const pos=[]; for(const sx of [-1,0,1]) for(const sz of [-1,1]) pos.push([cx+sx*(hk-0.15),cz+sz*(hk-0.15)]);
        for(const [px,pz] of pos){ colB(px-0.15,y,pz-0.15,px+0.15,y+kh,pz+0.15); B.cyl('paint',0.11,0.09,kh-0.25,10,mT(px,y,pz)); B.box('wood',px-0.22,y+kh-0.25,pz-0.22,px+0.22,y+kh,pz+0.22); }
        B.box('wood',cx-hk-0.7,y+kh,cz-hk-0.7,cx+hk+0.7,y+kh+0.25,cz+hk+0.7); B.box('tile',cx-hk-0.6,y+kh-0.02,cz-hk-0.6,cx+hk+0.6,y+kh,cz+hk+0.6);
        B.box('stone',cx-hk-0.1,y,cz-hk-0.1,cx+hk+0.1,y+0.15,cz+hk+0.1);
        if(FT.lanterns) hangLamp(B,cx,y+kh,cz);
        break; }
      case 'arish': {
        for(const [sx,sz] of corners){ colB(cx+sx*(hk-0.3)-0.12,y,cz+sz*(hk-0.3)-0.12,cx+sx*(hk-0.3)+0.12,y+2.4,cz+sz*(hk-0.3)+0.12); B.cyl('trunk',0.09,0.08,2.4,6,mT(cx+sx*(hk-0.3),y,cz+sz*(hk-0.3))); }
        for(const sz of [-1,1]) B.box('wood',cx-hk,y+2.3,cz+sz*(hk-0.3)-0.07,cx+hk,y+2.42,cz+sz*(hk-0.3)+0.07);
        B.box('thatch',cx-hk-0.2,y+2.42,cz-hk-0.2,cx+hk+0.2,y+2.58,cz+hk+0.2);
        B.box('thatch',cx-hk+0.2,y+0.1,cz+hk-0.36,cx+hk-0.2,y+1.6,cz+hk-0.26);
        ropeBed(B,cx,y,cz-0.3,0.1);
        break; }
      case 'mafraj': {
        const kh2=Math.min(3.0,H*0.85);
        for(let d=0;d<4;d++){ const F=trimF(fr(cx,cz,d,0,hk),()=>true); const c={kind:'street',l:3,H:kh2,t:0.4,y0:y,y1:y+kh2,uA:F.uA,uB:F.uB,door:d===((x+z)%4),rnd:RNG(S.seed+'mf'+d),mod:{},ty:ROOM,top:true,bayOK:false,winMul:1.4,wk:'wall'};
          const ops=fitOps(FAC.sanaani(c),c); const [outer,holes]=wallShape(F.uA,F.uB,y,y+kh2,ops); B.ext('wall',outer,holes,0.4,atF(F,0,0,-0.4)); colWall(F,F.uA,F.uB,y,y+kh2,-0.4,0,ops); dressOps(F,ops,c);
          parapetRun(F,y+kh2,true); }
        B.box('wall',cx-hk,y+kh2-0.25,cz-hk,cx+hk,y+kh2+0.02,cz+hk);
        break; }
      default: { // loggia
        let fd=1; for(let d=0;d<4;d++){ const nb=cellAt(x+DIRS[d][0],z+DIRS[d][1],l); if(!isMass(nb)){ fd=d; if(d===1) break; } }
        for(let d=0;d<4;d++){ const F=trimF(fr(cx,cz,d,0,hk),()=>true);
          if(d===fd){ const bw=(F.uB-F.uA-1.5)/2, ar=st.arch.arc==='flat'?'pointed':st.arch.arc; const pts=[[F.uA,y]]; let u=F.uA+0.5; for(let i=0;i<2;i++){ const vs=Math.max(y+1.4,y+kh-0.3-archRise(ar,bw)); pts.push([u,y],...archPts(ar,u,u+bw,vs),[u+bw,y]); u+=bw+0.5; } pts.push([F.uB,y],[F.uB,y+kh],[F.uA,y+kh]); B.ext(wk,dedupe(pts),null,0.4,atF(F,0,0,-0.4)); colWall(F,F.uA,F.uB,y,y+kh,-0.4,0,[{u0:F.uA+0.5,u1:F.uA+0.5+bw,v0:y,vs:y+1.4,arch:'flat'},{u0:F.uA+1.0+bw,u1:F.uA+1.0+2*bw,v0:y,vs:y+1.4,arch:'flat'}]); }
          else { const hole={u0:F.mid-0.4,u1:F.mid+0.4,v0:y+1.0,vs:y+1.9,arch:'flat'}; B.ext(wk,[[F.uA,y],[F.uB,y],[F.uB,y+kh],[F.uA,y+kh]],[openPoly(hole)],0.4,atF(F,0,0,-0.4)); colM(F.M,F.uA,y,-0.4,F.uB,y+kh,0); B.flat('lattice',openPoly(hole),atF(F,0,0,-0.05)); B.flat('glass',openPoly(hole),atF(F,0,0,-0.3)); }
          parapetRun(F,y+kh,true); }
        B.box(wk,cx-hk,y+kh-0.25,cz-hk,cx+hk,y+kh+0.02,cz+hk);
        if(FT.lanterns) hangLamp(B,cx,y+kh-0.25,cz);
      }
    }
  }

  /* ---------- courtyard ---------- */
  /* an outhouse yard: the privy in the corner furthest from the house, door turned to the yard; a water butt by it,
     a woodpile and chopping block on another wall, a washing line across, stepping stones from the house */
  function privyYard(x,z){
    const [cx,cz]=cellC(x,z), c=x+z*NX, r=RNG(S.seed+'|privy|'+c), h=CW/2, inset=t*0.8+0.25, house=d=>isMass(cellAt(x+DIRS[d][0],z+DIRS[d][1],0));
    const corners=[[1,1],[1,-1],[-1,1],[-1,-1]].map(([sx,sz])=>({sx,sz,sc:(house(sx>0?0:2)?-2:0)+(house(sz>0?1:3)?-2:0)+r.f()})).filter(q=>outClear(cx+q.sx*(h-1.2),cz+q.sz*(h-1.2),0.5,1.2)).sort((a,b)=>b.sc-a.sc);
    const k=st.timber||PITCH? 'wood' : 'wood', rk= st.roof==='pitched'? 'roofTile' : 'wood', used=[];
    if(corners.length){ const q=corners[0], px=cx+q.sx*(h-inset-0.75), pz=cz+q.sz*(h-inset-0.85), a=Math.atan2(-q.sx,-q.sz)+(Math.abs(q.sx)>0&&r.chance(.5)?0:0);
      const fa= Math.abs(cx-px)>Math.abs(cz-pz)? Math.atan2(cx-px,0) : Math.atan2(0,cz-pz);   // door square to the yard
      privyShed(B,px,pz,fa,k,rk); colB(px-0.85,0,pz-0.85,px+0.85,2.2,pz+0.85); used.push([px,pz,1.3]); void a;
      const bx=px+Math.cos(fa)*0.95, bz=pz-Math.sin(fa)*0.95; if(outClear(bx,bz,0.5,0.4)){ waterButt(B,bx,bz); colB(bx-0.34,0,bz-0.34,bx+0.34,0.9,bz+0.34); used.push([bx,bz,0.5]); } }
    // woodpile against another outer wall
    const walls=[0,1,2,3].filter(d=>!house(d)).sort(()=>r.f()-0.5);
    for(const d of walls){ const px=cx+DIRS[d][0]*(h-inset-0.35), pz=cz+DIRS[d][1]*(h-inset-0.35); if(used.some(u=>Math.hypot(u[0]-px,u[1]-pz)<u[2]+0.9)||!outClear(px,pz,0.5,0.8)) continue;
      woodpile(B,px,pz,Math.atan2(-DIRS[d][0],-DIRS[d][1]),r); colB(px-0.7,0,pz-0.45,px+0.7,0.75,pz+0.45); used.push([px,pz,0.9]); break; }
    // washing line across the yard
    { const ax=r.chance(.5), o=h-inset-0.5, sh=r.range(-1,1); const p0=ax? [cx-o,cz+sh] : [cx+sh,cz-o], p1=ax? [cx+o,cz+sh] : [cx+sh,cz+o];
      if(!used.some(u=>Math.hypot(u[0]-p0[0],u[1]-p0[1])<u[2]+0.3||Math.hypot(u[0]-p1[0],u[1]-p1[1])<u[2]+0.3)&&outClear(p0[0],p0[1],0.5,0.3)&&outClear(p1[0],p1[1],0.5,0.3)){
        washLine(B,p0[0],p0[1],p1[0],p1[1],r); colB(p0[0]-0.06,0,p0[1]-0.06,p0[0]+0.06,2,p0[1]+0.06); colB(p1[0]-0.06,0,p1[1]-0.06,p1[0]+0.06,2,p1[1]+0.06); } }
    // stepping stones from the house wall towards the privy
    const hd=[0,1,2,3].find(house); if(hd!=null&&used.length){ const sx=cx+DIRS[hd][0]*(h-0.6), sz=cz+DIRS[hd][1]*(h-0.6), [ex,ez]=used[0];
      for(let i=1;i<6;i++){ const f=i/6, px=sx+(ex-sx)*f+r.range(-.1,.1), pz=sz+(ez-sz)*f+r.range(-.1,.1); if(Math.hypot(px-ex,pz-ez)<1.1) break; B.cyl('stone',0.24,0.26,0.04,8,mm(mT(px,0.05,pz),mRY(r.f()*3))); } }
  }
  function courtCell(x,z){
    const [cx,cz]=cellC(x,z), c=x+z*NX, r=RNG(S.seed+'|court|'+c), cs=st.court;
    slab('court',x,z,0,-0.05,0.05,nb=>nb!==COURT);
    if(TU[c]===PRIVY&&!RU){ privyYard(x,z); for(let d=0;d<4;d++){ const nb=cellAt(x+DIRS[d][0],z+DIRS[d][1],0); if(nb!==COURT&&!isMass(nb)) hoshWall(x,z,d); } return; }
    const feat=featureCells.has(c), ax=courtAxis[c]||'x';
    const osh=outCourt.get(c), fcx=cx+(osh?osh[0]*0.8:0), fcz=cz+(osh?osh[1]*0.8:0);   // a flight along one side: the centrepiece moves over
    const occ=[];
    if(feat&&FT.fountain){ const cx=fcx, cz=fcz;
      if(['fishbowl','pond','zen','jars','tulsi','chaitya','chorten','lotus','shrine'].includes(cs.feature)){ const rr=asiaCourtFeature(B,cs.feature,cx,cz,ax,colB,r); occ.push([cx,cz,rr]); if(['pond','lotus','fishbowl'].includes(cs.feature)) hasWater=true; }
      else if(WORLD_FEATS.has(cs.feature)){ const [rr,wat]=worldCourtFeature(B,cs.feature,cx,cz,ax,colB,r); occ.push([cx,cz,rr]); if(wat) hasWater=true; }
      else if(RUIN_FEATS.has(cs.feature)){ const rk=B._rk; B._rk=1; const [rr,wat]=ruinCourtFeature(B,cs.feature,cx,cz,ax,colB,r,st); B._rk=rk; occ.push([cx,cz,rr]); if(wat) hasWater=true; }
      else if(cs.feature==='well'){ colB(cx-0.85,0,cz-0.85,cx+0.85,0.9,cz+0.85); B.cyl('stone',0.78,0.82,0.75,14,mT(cx,0,cz)); B.cyl('void',0.58,0.58,0.78,14,mT(cx,0.02,cz)); B.box('wood',cx-0.95,0,cz-0.06,cx-0.83,1.95,cz+0.06); B.box('wood',cx+0.83,0,cz-0.06,cx+0.95,1.95,cz+0.06); B.box('wood',cx-1.0,1.86,cz-0.07,cx+1.0,1.98,cz+0.07); B.torus('wood',0.16,0.035,Math.PI*2,mm(mT(cx,1.66,cz),mRY(Math.PI/2)),5,12); B.cyl('wood',0.12,0.14,0.22,8,mT(cx+0.35,0.75,cz+0.2)); occ.push([cx,cz,1.2]); }
      else if(cs.feature==='howz'){ const L=4.0, W=1.8, M=ax==='x'?mT(cx,0,cz):mm(mT(cx,0,cz),mRY(Math.PI/2)); colM(M,-L/2-0.25,0,-W/2-0.25,L/2+0.25,0.7,W/2+0.25); hasWater=true;
        B.box('stone',-L/2-0.25,0,-W/2-0.25,L/2+0.25,0.3,-W/2,M); B.box('stone',-L/2-0.25,0,W/2,L/2+0.25,0.3,W/2+0.25,M); B.box('stone',-L/2-0.25,0,-W/2,-L/2,0.3,W/2,M); B.box('stone',L/2,0,-W/2,L/2+0.25,0.3,W/2,M);
        B.box('water',-L/2,0.02,-W/2,L/2,0.22,W/2,M); for(const u of [-1,1]) B.cyl('stone',0.06,0.05,0.35,6,mm(M,mT(u*L/4,0.2,0)));
        occ.push([cx,cz,2.4]);
        if(FT.garden&&cs.garden==='chaharbagh'){ const M2=ax==='x'?mm(mT(cx,0,cz),mRY(Math.PI/2)):mT(cx,0,cz); B.box('water',-CW/2+t+0.1,0.02,-0.2,-W/2-0.3,0.1,0.2,M2); B.box('water',W/2+0.3,0.02,-0.2,CW/2-t-0.1,0.1,0.2,M2); } }
      else if(cs.feature==='basin'){ colB(cx-1.3,0,cz-1.3,cx+1.3,0.7,cz+1.3); hasWater=true; B.cyl('stone',1.35,1.35,0.5,8,mm(mT(cx,0,cz),mRY(Math.PI/8))); B.cyl('water',1.15,1.15,0.44,8,mm(mT(cx,0.02,cz),mRY(Math.PI/8))); B.cyl('stone',0.16,0.22,0.95,8,mT(cx,0,cz)); B.cyl('stone',0.45,0.12,0.18,12,mT(cx,0.95,cz)); B.cyl('water',0.38,0.38,0.06,12,mT(cx,1.08,cz)); occ.push([cx,cz,1.8]); }
      else { colB(cx-1.45,0,cz-1.45,cx+1.45,0.95,cz+1.45); hasWater=true; for(let k=0;k<8;k++){ const a=k/8*Math.PI*2+Math.PI/8; colB(cx+Math.cos(a)*1.95-0.12,0,cz+Math.sin(a)*1.95-0.12,cx+Math.cos(a)*1.95+0.12,2.4,cz+Math.sin(a)*1.95+0.12); } B.cyl('stone',1.5,1.5,0.9,8,mm(mT(cx,0,cz),mRY(Math.PI/8))); B.cyl('water',1.3,1.3,0.86,8,mm(mT(cx,0.02,cz),mRY(Math.PI/8))); B.cyl('stone',0.5,0.5,1.4,8,mm(mT(cx,0,cz),mRY(Math.PI/8)));
        for(let k=0;k<8;k++){ const a=k/8*Math.PI*2+Math.PI/8; B.cyl('stone',0.1,0.1,2.4,8,mT(cx+Math.cos(a)*1.95,0,cz+Math.sin(a)*1.95)); }
        B.cyl('wood',2.35,2.35,0.18,8,mm(mT(cx,2.4,cz),mRY(Math.PI/8))); B.cone('lead',2.5,1.2,8,mm(mT(cx,2.58,cz),mRY(Math.PI/8))); alem(B,cx,3.7,cz,0.6); occ.push([cx,cz,2.6]); }
    }
    const corners=[[1,1],[1,-1],[-1,1],[-1,-1]].sort(()=>r.f()-0.5).filter(([sx,sz])=>!osh||sx*osh[0]+sz*osh[1]>0);
    if(FT.garden&&cs.garden){
      for(const [sx,sz] of (feat?corners.slice(0,2):corners.slice(0,1))){ const px=cx+sx*1.65*KS, pz=cz+sz*1.65*KS; if(occ.some(o=>Math.hypot(o[0]-px,o[1]-pz)<o[2]+0.8)||!outClear(px,pz,0.3,0.9)) continue;
        if(cs.garden==='rocks'){ for(let k=0;k<4;k++) B.ico('stone',r.range(0.3,0.6),mm(mT(px+r.range(-.5,.5),0.3,pz+r.range(-.5,.5)),mS(1,r.range(1,2.2),1)),1); colB(px-0.7,0,pz-0.7,px+0.7,1.2,pz+0.7); continue; }
        if(cs.garden==='moss'){ B.cyl('moss',0.9,1.0,0.12,12,mT(px,0,pz)); B.ico('stone',0.35,mm(mT(px+0.2,0.15,pz-0.1),mS(1.2,0.7,1)),1); continue; }
        if(cs.garden==='pots'){ for(let k=0;k<3;k++) pottedPlant(B,px+r.range(-.5,.5),0.05,pz+r.range(-.5,.5),r); continue; }
        colB(px-0.85,0,pz-0.85,px+0.85,0.36,pz+0.85); B.box('stone',px-0.85,0,pz-0.85,px+0.85,0.32,pz+0.85); B.box('grass',px-0.72,0.32,pz-0.72,px+0.72,0.36,pz+0.72); for(let k=0;k<3;k++) B.ico('leaf',r.range(0.18,0.32),mT(px+r.range(-.5,.5),0.45,pz+r.range(-.5,.5)),0); }
    }
    if(FT.trees&&cs.tree!=='none'){ const nt=feat?2:r.int(1,2); let placed=0;
      for(const [sx,sz] of corners){ if(placed>=nt) break; const px=cx+sx*1.7*KS+r.range(-.2,.2), pz=cz+sz*1.7*KS+r.range(-.2,.2); if(occ.some(o=>Math.hypot(o[0]-px,o[1]-pz)<o[2]+0.7)||!outClear(px,pz,0.3,0.7)) continue;
        const tr=cs.tree==='palm'||cs.tree==='bamboo'||cs.tree==='birch'? 0.25 : cs.tree==='baobab'? 0.8 : 0.6; colB(px-tr,0,pz-tr,px+tr,2.5,pz+tr); if(tr===0.6) B.cyl('stone',0.55,0.6,0.25,10,mT(px,0,pz)); asiaTree(B,cs.tree,px,pz,0.05,r); occ.push([px,pz,1.2]); placed++; } }
    if(FT.roofLife&&r.chance(.5)){ const px=cx+r.range(-1.8,1.8)*KS, pz=cz+r.range(-1.8,1.8)*KS; if(!occ.some(o=>Math.hypot(o[0]-px,o[1]-pz)<o[2]+0.5)&&outClear(px,pz,0.5,0.5)) jar(B,px,0.05,pz,1); }
    for(let d=0;d<4;d++){ const nb=cellAt(x+DIRS[d][0],z+DIRS[d][1],0); if(nb!==COURT&&!isMass(nb)) hoshWall(x,z,d); }
  }
  let hoshGateDone=false, moonDone=false;
  function hoshWall(x,z,d){
    const [cx,cz]=cellC(x,z), F=trimF(fr(cx,cz,d),k=>{ const nb=cellAt(x+DIRS[k][0],z+DIRS[k][1],0); return nb!==COURT&&!isMass(nb); }), hh=Math.min(3.2,H*0.78), th=t*0.8, wk=wallKey(0);
    const ops=[];
    const moonGate=st.id==='jiangnan';
    const needGate=!hasGate&&!hasStreetDoor&&!hoshGateDone;
    if(needGate||(moonGate&&!moonDone)){ if(needGate) hoshGateDone=true; if(moonGate) moonDone=true; const da=moonGate?'moon':st.arch.door, dw=1.5; ops.push({u0:F.mid-dw/2,u1:F.mid+dw/2,v0:0,vs:Math.min(2.4,hh-0.3)-archRise(da,dw)*(da==='flat'?0:1),arch:da,fill:moonGate?undefined:'door',frame:FR('stone',.14,.06),lantern:!moonGate,gate:true}); if(ops[0].vs<(moonGate?0.3:1.6)){ ops[0].arch='flat'; ops[0].vs=2.3; } }
    if(moonGate) for(const du of [-1.9,1.9]){ const u=F.mid+du, o={u0:u-0.4,u1:u+0.4,v0:1.3,vs:1.75,arch:'moon',fill:'lattice',frame:FR('trim',.08,.04)}; if(u-0.6>F.uA+th&&u+0.6<F.uB-th&&!ops.some(q=>q.u0<o.u1+0.5&&o.u0<q.u1+0.5)) ops.push(o); }
    const [outer]=wallShape(F.uA,F.uB,0,hh,ops);
    B.ext(wk,outer,null,th,atF(F,0,0,-th)); colWall(F,F.uA,F.uB,0,hh,-th,0,ops);
    dressOps(F,ops,{t:th,y0:0,y1:hh,wk,uA:F.uA,uB:F.uB});
    if(PITCH) pitchedRoof(B,F.uA,F.uB,-th,0,hh,Object.assign({},st.pr,{kind:'gable',pitch:0.6,ov:0.24,thick:0.06,ridgeH:0.12,rafters:false,struts:false,barge:null,gable:'wall',lift:(st.pr.lift||0)*0.3}),{a0:1,a1:1,b0:1,b1:1},F.M,{wallK:wk,ornaments:false});
    else parapetRun(F,hh,true);
    if(FT.plinth) for(const s of freeRuns(ops,F.uA,F.uB,0,0.5)) B.box('base',s[0],0,0,s[1],0.45,0.08,F.M);
  }

  /* ---------- roofs, parapets, roofline greebles ---------- */
  function parapetRun(F,y,small,gap){
    if(gap){ if(gap[0]-F.uA>0.05) parapetRun({M:F.M,uA:F.uA,uB:gap[0],d:F.d},y,small); if(F.uB-gap[1]>0.05) parapetRun({M:F.M,uA:gap[1],uB:F.uB,d:F.d},y,small); return; }
    const ph=small?st.parH*0.6:st.parH, pt=Math.max(0.25,t*0.55), a=F.uA, b=F.uB, wk=FT.ablaq?'ablaq':'wall', cren=FT.crenels;
    colM(F.M,a,y,-pt,b,y+Math.max(0.95,ph),0);
    if(!FT.parapet){ B.box(wk,a,y,-pt,b,y+0.22,0,F.M); return; }
    switch(st.parapet){
      case 'tri': case 'tripierced': {
        const bh=cren?ph*0.5:ph; B.box(wk,a,y,-pt,b,y+bh,0,F.M);
        if(cren){ const mw=0.5, n=Math.max(1,Math.round((b-a)/(mw+0.1))), step=(b-a)/n, mh=ph*0.8;
          const pts= st.parapet==='tri'? [[0,0],[mw,0],[mw,mh*0.3],[mw*0.82,mh*0.3],[mw*0.82,mh*0.62],[mw*0.64,mh*0.62],[mw*0.5,mh],[mw*0.36,mh*0.62],[mw*0.18,mh*0.62],[mw*0.18,mh*0.3],[0,mh*0.3]] : [[0,0],[mw,0],[mw/2,mh]];
          const holes= st.parapet==='tripierced'? [[[mw*0.37,mh*0.14],[mw*0.63,mh*0.14],[mw*0.5,mh*0.4]]] : null;
          for(let i=0;i<n;i++) B.ext(wk,pts,holes,pt,atF(F,a+step*i+(step-mw)/2,y+bh,-pt)); }
        break; }
      case 'gypsum': {
        B.box(wk,a,y,-pt,b,y+ph*0.6,0,F.M); B.box('trim',a,y+ph*0.6,-pt-0.02,b,y+ph*0.6+0.12,0.03,F.M);
        if(cren){ const mw=0.32, n=Math.max(1,Math.round((b-a)/0.46)), step=(b-a)/n; for(let i=0;i<n;i++) B.ext('trim',[[0,0],[mw,0],[mw,.12],[mw*.75,.12],[mw*.75,.26],[mw*.25,.26],[mw*.25,.12],[0,.12]],null,pt,atF(F,a+step*i+(step-mw)/2,y+ph*0.6+0.12,-pt)); }
        break; }
      case 'fleur': {
        B.box(wk,a,y,-pt,b,y+ph,0,F.M);
        if(cren){ const mw=0.42, mh=0.72, n=Math.max(1,Math.round((b-a)/0.56)), step=(b-a)/n;
          const pts=[[0,0],[mw,0],[mw,mh*.4],[mw*.82,mh*.56],[mw*.66,mh*.5],[mw*.5,mh],[mw*.34,mh*.5],[mw*.18,mh*.56],[0,mh*.4]];
          for(let i=0;i<n;i++) B.ext('stone',pts,null,pt*0.8,atF(F,a+step*i+(step-mw)/2,y+ph,-pt*0.9)); }
        break; }
      case 'lattice': {
        B.box(wk,a,y,-pt,b,y+0.3,0,F.M);
        if(cren){ B.box('screen',a+0.02,y+0.3,-pt*0.6,b-0.02,y+ph-0.12,-pt*0.4,F.M); const np=Math.max(1,Math.ceil((b-a)/1.6)); for(let i=0;i<=np;i++){ const u=a+0.12+(b-a-0.24)*i/np; B.box(wk,u-0.12,y,-pt,u+0.12,y+ph-0.12,0,F.M); } }
        else B.box(wk,a,y+0.3,-pt,b,y+ph-0.12,0,F.M);
        B.box('trim',a,y+ph-0.12,-pt-0.03,b,y+ph,0.03,F.M);
        break; }
      case 'penbey': {
        B.box('band',a,y-0.9,0,b,y-0.12,0.09,F.M); B.box('black',a,y-0.12,0,b,y-0.02,0.12,F.M); B.box('black',a,y-1.0,0,b,y-0.9,0.11,F.M);
        B.box(wk,a,y,-pt,b,y+ph-0.07,0,F.M); B.box('black',a,y+ph-0.07,-pt-0.02,b,y+ph,0.02,F.M);
        break; }
      case 'mudround': {
        B.box(wk,a,y,-pt,b,y+ph-0.12,0,F.M); B.cyl(wk,pt/2,pt/2,b-a,8,mm(atF(F,a,y+ph-0.12,-pt/2),mRZ(-Math.PI/2)));
        break; }
      case 'cornice': {
        B.box('stone',a,y-0.3,0,b,y-0.16,0.14,F.M); B.box('stone',a,y-0.16,0,b,y+0.02,0.26,F.M); B.box('stone',a,y,-pt,b,y+ph,0,F.M);
        break; }
      case 'balustrade': {
        B.box('stone',a,y,-pt,b,y+0.25,0,F.M);
        if(cren) for(let u=a+0.2;u<b-0.1;u+=0.24) B.cyl('stone',0.06,0.07,ph-0.4,6,atF(F,u,y+0.25,-pt/2)); else B.box('stone',a,y+0.25,-pt,b,y+ph-0.15,0,F.M);
        B.box('stone',a,y+ph-0.15,-pt-0.02,b,y+ph,0.02,F.M);
        break; }
      case 'comb': { B.box(wk,a,y,-pt,b,y+ph,0,F.M); B.box('stone',a-0.002,y+ph-0.08,-pt-0.03,b+0.002,y+ph+0.03,0.03,F.M);
        if(cren&&!small&&F.d===1&&b-a>3){ const ch=1.7, holes=[]; for(let u=a+0.5;u<b-0.8;u+=0.65) for(const v of [0.35,1.0]) holes.push([[u-a,v],[u-a+0.34,v],[u-a+0.34,v+0.42],[u-a,v+0.42]]);
          B.ext(wk,[[0,0],[b-a,0],[b-a-0.3,ch],[0.3,ch]],holes,0.3,atF(F,a,y,-pt-0.75)); colM(F.M,a,y,-pt-0.75,b,y+ch,-pt-0.45); }   // the pierced roof comb over the front range
        break; }
      case 'battlement': { const bh=ph*0.55; B.box(wk,a,y,-pt,b,y+bh,0,F.M); B.box('stone',a-0.002,y+bh-0.06,-pt-0.03,b+0.002,y+bh+0.03,0.03,F.M);
        if(cren){ const mw=0.55, gp=0.4, n=Math.max(1,Math.round((b-a+gp)/(mw+gp))), step=(b-a-mw)/Math.max(1,n-1); for(let i=0;i<n;i++){ const u=n===1?(a+b-mw)/2:a+i*step; B.box(wk,u+0.004,y+bh+0.03,-pt,u+mw-0.004,y+ph,0,F.M); B.box('stone',u-0.02,y+ph,-pt-0.02,u+mw+0.02,y+ph+0.06,0.02,F.M); } }
        break; }
      case 'woodrail': { B.box(wk,a,y,-pt,b,y+0.18,0,F.M); const np=Math.max(1,Math.ceil((b-a)/0.9));
        for(let i=0;i<=np;i++){ const u=a+0.06+(b-a-0.12)*i/np; B.box('wood',u-0.06,y+0.18,-pt*0.5-0.06,u+0.06,y+ph-0.1,-pt*0.5+0.06,F.M); }
        if(cren) for(let u=a+0.2;u<b-0.1;u+=0.16) B.box('paint',u-0.025,y+0.18,-pt*0.5-0.02,u+0.025,y+ph-0.1,-pt*0.5+0.02,F.M);
        B.box('wood',a,y+ph-0.1,-pt*0.5-0.08,b,y+ph,-pt*0.5+0.08,F.M); break; }
      case 'cavetto': { B.box(wk,a,y,-pt,b,y+ph*0.55,0,F.M); B.cyl('stone',0.07,0.07,b-a,6,mm(atF(F,a,y-0.06,0.06),mRZ(-Math.PI/2)));   // a torus roll under the Egyptian gorge cornice
        const prof=[[0,0],[0.1,0],[0.13,0.1],[0.2,0.3],[0.34,0.48],[0.42,0.55],[0.42,0.66],[0,0.66]]; B.ext('stone',prof.map(p=>[-p[0],p[1]]).reverse(),null,b-a,mm(atF(F,a,y,0),mRY(Math.PI/2)));
        break; }
      default: { // plain
        B.box(wk,a,y,-pt,b,y+ph,0,F.M); B.box('band',a,y+ph-0.22,0,b,y+ph,0.03,F.M); }
    }
  }
  function pinnacle(px,y,pz){
    const ph=st.parH, wk=FT.ablaq?'ablaq':'wall';
    if(st.pinnacle==='najdi') B.cyl(wk,0.44,0.14,ph+1.0,4,mm(mT(px,y,pz),mRY(Math.PI/4)));
    else if(st.pinnacle==='khaleeji'){ B.box(wk,px-0.3,y,pz-0.3,px+0.3,y+ph+0.2,pz+0.3); B.box(wk,px-0.2,y+ph+0.2,pz-0.2,px+0.2,y+ph+0.45,pz+0.2); B.cone(wk,0.16,0.45,4,mm(mT(px,y+ph+0.45,pz),mRY(Math.PI/4))); }
    else if(st.pinnacle==='sanaani') B.cyl('trim',0.2,0.03,ph+0.7,4,mm(mT(px,y,pz),mRY(Math.PI/4)));
    else if(st.pinnacle==='sahel'){ B.cyl(wk,0.34,0.16,ph+0.9,6,mT(px,y,pz)); B.sphere(wk,0.16,mT(px,y+ph+0.9,pz),6,4); }
    else if(st.pinnacle==='urn'){ B.box('stone',px-0.25,y,pz-0.25,px+0.25,y+ph+0.05,pz+0.25); B.lathe('stone',[[0,0],[0.12,0],[0.08,0.08],[0.2,0.22],[0.18,0.4],[0.08,0.46],[0.1,0.52],[0,0.55]],10,mT(px,y+ph+0.05,pz)); }
    else if(st.pinnacle==='tibetan'){ B.box(wk,px-0.28,y,pz-0.28,px+0.28,y+ph+0.06,pz+0.28); B.box('band',px-0.3,y+ph+0.05,pz-0.3,px+0.3,y+ph+0.25,pz+0.3); B.cyl('wood',0.035,0.03,2.6,5,mT(px,y+ph+0.25,pz)); B.box('flags',px-0.02,y+ph+0.9,pz-0.32,px+0.02,y+ph+2.7,pz+0.32); }
  }
  /* a curved tiled roof over a run of top modules; the ridge runs along the run (for one module, parallel to the open side) */
  function asianRoofRect(x0,z0,x1,z1,l){
    const y=(l+1)*H, X0=(x0-NX/2)*CW, X1=(x1+1-NX/2)*CW, Z0=(z0-NZ/2)*CW, Z1=(z1+1-NZ/2)*CW;
    const sideOpen=cells=>cells.every(([x,z])=>roofOpenT(cellAt(x,z,l)));
    const joined=cells=>cells.some(([x,z])=>isMass(cellAt(x,z,l))&&!isMass(cellAt(x,z,l+1)));   // another roof or a terrace at the same height
    const W=[],E=[],N=[],S=[]; for(let z=z0;z<=z1;z++){ W.push([x0-1,z]); E.push([x1+1,z]); } for(let x=x0;x<=x1;x++){ N.push([x,z0-1]); S.push([x,z1+1]); }
    const alongX=roofAxis(x0,z0,x1,z1,l), cfg=st.pr;
    const opt={wallK:wallKey(l), t, ornaments:!!FT.ornaments, col:colM, join:alongX?[joined(W),joined(E)]:[joined(N),joined(S)]};
    const ret= alongX? pitchedRoof(B,X0,X1,Z0,Z1,y,cfg,{a0:sideOpen(W),a1:sideOpen(E),b0:sideOpen(N),b1:sideOpen(S)},_M(),opt)
                     : pitchedRoof(B,Z0,Z1,-X1,-X0,y,cfg,{a0:sideOpen(N),a1:sideOpen(S),b0:sideOpen(E),b1:sideOpen(W)},mRY(-Math.PI/2),opt);
    // chimney stacks: built into an outer end wall, rising past the ridge
    if(st.chimney&&FT.chimneys){ const ch=Object.assign({},st.chimney), r=RNG(S.seed+'|ch|'+x0+','+z0+','+l), A0=alongX?X0:Z0, A1=alongX?X1:Z1, mid=alongX?(Z0+Z1)/2:(-X1-X0)/2, M=alongX?_M():mRY(-Math.PI/2);
      const openE=alongX?[sideOpen(W),sideOpen(E)]:[sideOpen(N),sideOpen(S)]; ch.sa=Math.min(ch.sa||0.6,t-0.02);
      const ends=(ch.n||1)>=2?[0,1]:[r.int(0,1)];
      for(const e of ends){ if(opt.join[e]||!openE[e]||r.chance(ch.skip||0)) continue; chimneyStack(B,M,e?A1-t/2:A0+t/2,mid,y-0.3,ret.top+0.85,ch,colM); } }
  }
  function hipRoofXZ(X0,Z0,X1,Z1,y,pitch,ov){
    ov=ov||[0.55,0.55,0.55,0.55]; const cX0=X0, cX1=X1, cZ0=Z0, cZ1=Z1; X0-=ov[0]; X1+=ov[1]; Z0-=ov[2]; Z1+=ov[3];
    const w=X1-X0, d=Z1-Z0, long=Math.max(w,d), short=Math.min(w,d), rise=short*(pitch||0.3), hx=long/2, hz=short/2, r0=hx-hz;
    const faces=[ [[-hx,0,hz],[hx,0,hz],[r0,rise,0],[-r0,rise,0]], [[hx,0,-hz],[-hx,0,-hz],[-r0,rise,0],[r0,rise,0]], [[-hx,0,-hz],[-hx,0,hz],[-r0,rise,0]], [[hx,0,hz],[hx,0,-hz],[r0,rise,0]] ];
    const pos=[], uv=[];
    for(const f of faces){ const e0=V3(...f[0]), e1=V3(...f[1]), ed=V3().subVectors(e1,e0).normalize();
      const tri=(a,b,c)=>{ for(const p of [a,b,c]){ const P=V3(...p), rel=V3().subVectors(P,e0); pos.push(...p); uv.push(rel.dot(ed), V3().crossVectors(rel,ed).length()); } };
      tri(f[0],f[1],f[2]); if(f.length===4) tri(f[0],f[2],f[3]); }
    const M=mm(mT((X0+X1)/2,y,(Z0+Z1)/2), w>=d?null:mRY(Math.PI/2));
    B.raw('roofTile',pos,uv,M);
    if(ov[2]) B.box('wood',X0,y-0.12,Z0,X1,y-0.002,Z0+0.12); if(ov[3]) B.box('wood',X0,y-0.12,Z1-0.12,X1,y-0.002,Z1); if(ov[0]) B.box('wood',X0,y-0.121,Z0+0.001,X0+0.12,y-0.001,Z1-0.001); if(ov[1]) B.box('wood',X1-0.12,y-0.121,Z0+0.001,X1,y-0.001,Z1-0.001);
    const s0=v=>v?0.1:0.02; B.box('wood',(ov[0]?X0:cX0)+s0(ov[0]),y-0.05,(ov[2]?Z0:cZ0)+s0(ov[2]),(ov[1]?X1:cX1)-s0(ov[1]),y-0.01,(ov[3]?Z1:cZ1)-s0(ov[3]));
  }
  function roofClutter(x,z,l,cx,cz,y,pFaces){
    const r=RNG(S.seed+'|roof|'+x+z+l), n=r.int(0,2);
    for(let i=0;i<n;i++){ const it=r.pick(st.clutter), px=cx+r.range(-1.5,1.5)*KS, pz=cz+r.range(-1.5,1.5)*KS; if(!outClear(px,pz,y+0.5,0.9)) continue;
      if(it==='bed') ropeBed(B,px,y,pz,r.f()*3);
      else if(it==='jars'){ jar(B,px,y,pz,r.range(.8,1.05)); jar(B,px+0.55,y,pz+0.12,.75); }
      else if(it==='plants') pottedPlant(B,px,y,pz,r);
      else if(it==='ladder'){ const ds=[0,1,2,3].filter(dd=>isMass(cellAt(x+DIRS[dd][0],z+DIRS[dd][1],l+1))); if(!ds.length) continue;   // leaning on the next terrace up
        const F=fr(cx,cz,ds[r.int(0,ds.length-1)]), u=F.mid+r.range(-1.2,1.2), hl=H*0.95+0.6;
        for(const s of [-0.25,0.25]) B.segCyl('wood',atW(F,u+s,y,-1.1),atW(F,u+s,y+hl,-0.12),0.04,0.04,5);
        for(let k=1;k<10;k++){ const f=k/10, w=-1.1+0.98*f; B.segCyl('wood',atW(F,u-0.25,y+hl*f,w),atW(F,u+0.25,y+hl*f,w),0.025,0.025,4); } }
      else if(it==='chimney'){ B.box('stone',px-0.25,y,pz-0.25,px+0.25,y+1.7,pz+0.25); B.cone('lead',0.34,0.6,4,mm(mT(px,y+1.7,pz),mRY(Math.PI/4))); }
      else if(it==='flags'){ const h=4.2; B.cyl('wood',0.06,0.05,h,6,mT(px,y,pz)); B.box('flags',px-0.03,y+1.4,pz-0.35,px+0.03,y+h-0.2,pz+0.35); B.sphere('gold',0.1,mT(px,y+h,pz),6,4); colB(px-0.08,y,pz-0.08,px+0.08,y+h,pz+0.08); }
      else if(it==='rug'&&pFaces.length&&FT.parapet){ const d=r.pick(pFaces), F=fr(cx,cz,d), u=F.mid+r.range(-1.5,0.3), ph=st.parH;
        B.ext('carpet',[[0,0],[1.2,0],[1.2,1.0],[0,1.0]],null,0.03,atF(F,u,y+ph-0.95,0.01),(px2,py2)=>[px2/1.2,py2]);
        B.box('carpet',u,y+ph,-Math.max(0.25,t*0.55)-0.02,u+1.2,y+ph+0.04,0.04,F.M); }
    }
  }

  /* ---------- main pass over the solved grid ---------- */
  const tScale=FT; void tScale;
  for(let l=0;l<4;l++) for(let z=0;z<NZ;z++) for(let x=0;x<NX;x++){
    const ty=cellAt(x,z,l); if(ty<=0) continue;
    const [cx,cz]=cellC(x,z), y0=l*H, y1=y0+H, mod=modOf(x,z,l);
    B.jit=jitter(`${x},${z},${l}`);
    if(ty===COURT){ courtCell(x,z); continue; }
    if(ty===TOWER){ if(l===0||cellAt(x,z,l-1)!==TOWER) towerStack(x,z,l); continue; }
    if(ty===KIOSK){ kiosk(x,z,l); continue; }
    if(l>0){ if(ty===STAIR&&stairInfo[`${x},${z}`]) stairSlab('trim',x,z,y0-0.24,y0+0.02); else slab('floor',x,z,l,y0-0.24,y0+0.02,exterior); }
    else slab('floor0',x,z,l,-0.05,0.06,exterior);
    if(ty===STAIR&&!(PITCH&&hipCells.has(idx(x,z,l)))) stairCell(x,z,l);
    if((ty===ARC||ty===IWAN)&&st.arc&&st.arc.deck){ const h=CW/2-0.04; B.box('wood',cx-h,y0,cz-h,cx+h,y0+0.38,cz+h); colB(cx-h,y0,cz-h,cx+h,y0+0.38,cz+h); }
    if(ty===DOME&&FT.lanterns) hangLamp(B,cx,y1-0.3,cz);
    for(let d=0;d<4;d++){
      const k=faceKind(x,z,l,d); if(!k) continue;
      if(k==='mouth'){ iwanMouth(x,z,l,d,cx,cz,y0,y1); continue; }
      if(k==='portal'){ portal(x,z,l,d,cx,cz,y0,y1); continue; }
      if(ty===ARC){ if(k==='street'||k==='court') arcadeFace(x,z,l,d,cx,cz,y0,y1); continue; }
      roomWall(x,z,l,d,k,ty,mod,cx,cz,y0,y1);
    }
    if(ty===ARC&&l===0&&FT.lanterns&&RNG(S.seed+'al'+x+z).chance(.5)) hangLamp(B,cx,y1-0.3,cz);
  }
  // interior partitions between enclosed rooms, each with a doorway
  function partition(x,z,l,d){
    const [cx,cz]=cellC(x,z), y0=l*H, y1=y0+H, tp=0.32, A=cellAt(x,z,l), xb=x+DIRS[d][0], zb=z+DIRS[d][1], Bt=cellAt(xb,zb,l);
    const F=fr(cx,cz,d); let du=F.mid, ok=!(A===STAIR&&Bt===STAIR);
    if(ok&&A===STAIR){ const r=stairDoorU(x,z,l,d,d); if(r===false) ok=false; else if(r!=null) du=r; }
    if(ok&&Bt===STAIR){ const r=stairDoorU(xb,zb,l,(d+2)%4,d); if(r===false) ok=false; else if(r!=null) du=r; }
    // into a bedroom suite or a bathroom the door keeps to one end, leaving the rest of the wall for the ensuite strip
    // (each suite keeps one corner for its strip, so doorways on the two walls meeting there slide to their far ends)
    if(ok&&du===F.mid&&(isSuite(x,z,l)||isSuite(xb,zb,l))){ let sg=0;
      if(isSuite(x,z,l)){ const [sx,sz]=suiteCorner(x,z,l); if(d===0&&sx>0) sg=sz; else if(d===1&&sz>0) sg=-sx; }
      if(!sg&&isSuite(xb,zb,l)){ const [sx,sz]=suiteCorner(xb,zb,l); if(d===0&&sx<0) sg=sz; else if(d===1&&sz<0) sg=-sx; }
      if(!sg) sg=RNG(S.seed+'|pd|'+idx(x,z,l)+d).chance(.5)?1:-1;
      du=F.mid+sg*CW*0.28; }
    const da=st.arch.door, dw=1.1, dh=Math.min(2.4,H-0.7);
    const ops= ok? [{u0:du-dw/2,u1:du+dw/2,v0:y0,vs:y0+(da==='trap'? 0.05 : Math.max(1.75,dh-archRise(da,dw))),arch:da}] : [];
    if(ok){ recOp(x,z,l,d,F,ops[0],y0); recOp(xb,zb,l,(d+2)%4,F,ops[0],y0); }
    for(const half of [0,1]){ const sx=half?xb:x, sz=half?zb:z, w0=half?0:-tp/2, w1=half?tp/2:0;
      let uA=F.uA, uB=F.uB; if(faceKind(sx,sz,l,(d+1)%4)!==null) uA+=t-0.01; if(faceKind(sx,sz,l,(d+3)%4)!==null) uB-=t-0.01;
      const hops=ops.filter(o=>o.u0>uA+0.05&&o.u1<uB-0.05);
      const [outer]=wallShape(uA,uB,y0,y1-0.24,hops); B.ext('trim',outer,null,w1-w0,atF(F,0,0,w0)); colWall(F,uA,uB,y0,y1-0.24,w0,w1,hops); }
  }
  for(let l=0;l<4;l++) for(let z=0;z<NZ;z++) for(let x=0;x<NX;x++){ const ty=cellAt(x,z,l); if(!enclosedT(ty)) continue; B.jit=jitter(`${x},${z},${l}p`);
    for(const d of [0,1]) if(enclosedT(cellAt(x+DIRS[d][0],z+DIRS[d][1],l))) partition(x,z,l,d); }

  /* ---------- bedroom suites and bathrooms ----------
     A bedroom module is split by light inner walls into the bedroom and, along one wall, a strip holding a walk-in
     wardrobe and the ensuite behind it (bedroom → wardrobe → bath). A bathroom module gives the same strip to a WC and a
     laundry, each with its own door off the bathroom. The strip starts in a corner and runs along a wall with no doorway
     (or up to the first one); its cross walls are slid clear of any window they would meet. */
  const SUITES=new Map();
  // a straight inner wall on centre line p0→p1 (world x,z), tp thick, with doors {s (from p0), w}; leaves hang on the side facing swingTo
  function innerWall(p0,p1,y0,yt,tp,doors,swingTo){
    let a=p0, b=p1, L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(L<0.05) return;
    let ux=(b[0]-a[0])/L, uz=(b[1]-a[1])/L;
    if(swingTo&&((swingTo[0]-(a[0]+b[0])/2)*-uz+(swingTo[1]-(a[1]+b[1])/2)*ux)>0){ [a,b]=[b,a]; ux=-ux; uz=-uz; doors=doors.map(q=>Object.assign({},q,{s:L-q.s})); }
    const M=_M().set(ux,0,-uz,a[0]-uz*tp/2, 0,1,0,0, uz,0,ux,a[1]+ux*tp/2, 0,0,0,1), F={M,uA:0,uB:L,d:-1};
    const dh=Math.min(2.1,H-0.75), ops=doors.map(q=>({u0:q.s-q.w/2,u1:q.s+q.w/2,v0:y0,vs:y0+dh,arch:'flat',fill:'door'}));
    const [outer]=wallShape(0,L,y0,yt,ops); B.ext('trim',outer,null,tp,atF(F,0,0,-tp)); colWall(F,0,L,y0,yt,-tp,0,ops);
    for(const o of ops){ const w=o.u1-o.u0;   // a plain timber casing round each doorway, proud of both faces
      B.box('wood',o.u0-0.07,y0,-tp-0.015,o.u0+0.01,o.vs+0.07,0.015,F.M); B.box('wood',o.u1-0.01,y0,-tp-0.015,o.u1+0.07,o.vs+0.07,0.015,F.M); B.box('wood',o.u0+0.01,o.vs-0.01,-tp-0.015,o.u1-0.01,o.vs+0.07,0.015,F.M);
      DOORS.push({F,o,w,hh:dh,top:o.vs,tt:tp,wz:-tp,out:false,leaves:[{off:0,s:1,lw:w,poly:[[0,0],[w,0],[w,dh],[0,dh]],us:0.5}],dbl:false}); } }
  function suiteLayout(x,z,l,kind){
    const [cx,cz]=cellC(x,z), y0=l*H, yt=y0+H-0.24, i=idx(x,z,l), r=RNG(S.seed+'|suite|'+i), hw=CW/2, tp=0.16;
    const side=roomSides(x,z,l,ROOM), X0=cx-hw+side[2].inset, X1=cx+hw-side[0].inset, Z0=cz-hw+side[3].inset, Z1=cz+hw-side[1].inset;
    const line=d=>d===0?X1:d===2?X0:d===1?Z1:Z0, range=d=>d%2===0?[Z0,Z1]:[X0,X1];
    const ops=ROOMOPS.get(`${x},${z},${l}`)||[]; let strict=true;
    const hits=(d,s,m)=>ops.some(o=>o.d===d&&(strict||o.pass)&&o.s1>s-m&&o.s0<s+m);   // strict: keep clear of windows too; relaxed: only of doorways
    const need= kind===BED? [1.5,2.0] : [1.3,1.7];   // [part by the bedroom (wardrobe | laundry), corner part (bath | WC)]
    const minL=need[0]+need[1]+tp, cands=[];
    for(let d=0;d<4;d++){ if(!side[d].wall) continue; const [a,b]=range(d), doorsOn=ops.filter(o=>o.d===d&&o.pass);
      for(const e of [0,1]){ let lim= e===0? b : a; for(const o of doorsOn){ if(e===0) lim=Math.min(lim,o.s0-0.3); else lim=Math.max(lim,o.s1+0.3); }
        let Ls= e===0? lim-a : b-lim; if(Ls>=b-a-0.7) Ls=b-a; if(Ls<minL) continue;
        const cs= d%2===0? [d===0?1:-1, e===0?-1:1] : [e===0?-1:1, d===1?1:-1], pc=suiteCorner(x,z,l);
        cands.push({d,e,Ls,sc:Ls*0.6-ops.filter(o=>o.d===d&&!o.pass).length*0.3+(doorsOn.length?0:1.2)+r.f()*0.6+(cs[0]===pc[0]&&cs[1]===pc[1]?2:0)}); } }
    // a doorway in a side wall within the strip's depth would open straight into the wardrobe or the bath: not that side
    cands.sort((p,q)=>q.sc-p.sc);
    // first try to meet the outer walls only between windows; failing that, a cross wall may stop against a window's jamb
    for(const pass of [0,1]) for(const c of cands){ strict=pass===0;
      const d=c.d, e=c.e, [a,b]=range(d), Ld=line(d), sg= d%2===0? -DIRS[d][0] : -DIRS[d][1], es= e===0? 1 : -1, s0=e===0? a : b;   // es: the way the strip runs from its corner
      const full0=c.Ls>=b-a-1e-6, depthAll=(d%2===0? X1-X0 : Z1-Z0);
      const sSide=sgn=> d%2===0? (sgn>0?1:3) : (sgn>0?0:2), qSide=sgn=> d%2===0? (sgn>0?0:2) : (sgn>0?1:3);
      const dc= sSide(-es), dEnd=sSide(es);   // the corner's side wall, and the side at the strip's far end
      let sd=clamp(Math.round(depthAll*(kind===BED?0.36:0.34)*10)/10, kind===BED?2.4:2.2, kind===BED?3.6:3.2), okD=false;
      for(const tr of [0,0.25,-0.25,0.5,-0.5,0.75,-0.75,1.0,-1.0]){ const q=Ld+sg*(sd+tr+tp/2); if(sd+tr<(kind===BED?1.8:1.5)||depthAll-sd-tr<3.2) continue;
        if(!hits(dc,q,tp/2+0.12)&&(!full0||!hits(dEnd,q,tp/2+0.12))){ sd+=tr; okD=true; break; } }
      if(!okD) continue;
      const qa=Math.min(Ld,Ld+sg*(sd+tp)), qb=Math.max(Ld,Ld+sg*(sd+tp)), doorIn=dd=>ops.some(o=>o.d===dd&&o.pass&&o.s1>qa-0.1&&o.s0<qb+0.1);
      if(doorIn(dc)||(full0&&doorIn(dEnd)))continue;
      let Ls=c.Ls, full=full0, sEnd=s0+es*Ls;
      if(!full){ while(Ls>=minL&&hits(d,sEnd+es*tp/2,tp/2+0.1)){ Ls-=0.2; sEnd=s0+es*Ls; } if(Ls<minL) continue; }
      let Lb=clamp(Math.round(Ls*0.55*10)/10,need[1],Ls-need[0]-tp), okB=false;
      for(const tr of [0,0.2,-0.2,0.4,-0.4,0.6]){ const L2=Lb+tr; if(L2<need[1]||Ls-L2-tp<need[0]) continue; if(!hits(d,s0+es*(L2+tp/2),tp/2+0.1)){ Lb=L2; okB=true; break; } }
      if(!okB) continue;
      // world point from (s along the side, q across it)
      const P=(sv,qv)=> d%2===0? [qv,sv] : [sv,qv];
      const qFace=Ld-sg*0.03, qStrip=Ld+sg*sd, qBed=Ld+sg*(sd+tp), qP1=Ld+sg*(sd+tp/2), sP3=s0+es*(Lb+tp/2);
      const sFar= full? (e===0? b : a) : sEnd, sP1a=s0-es*0.03, sP1b= full? sFar+es*0.03 : sEnd+es*tp;
      const partB=[s0+es*(Lb+tp), sFar], partA=[s0,s0+es*Lb];   // B by the bedroom (wardrobe | laundry), A in the corner (bath | WC)
      const mid=(u,v)=>(u+v)/2, bedPt=P(mid(a,b),Ld+sg*(sd+tp+1.5));
      const p1Doors=[]; const addDoor=(seg,w)=>{ const lo=Math.min(seg[0],seg[1]), hi=Math.max(seg[0],seg[1]), sm=clamp(mid(lo,hi),lo+w/2+0.15,hi-w/2-0.15); p1Doors.push({s:Math.abs(sm-sP1a),w,sw:sm}); return sm; };
      const dB=addDoor(partB,0.8); let dA=null; if(kind===BATH) dA=addDoor(partA,0.75);
      innerWall(P(sP1a,qP1),P(sP1b,qP1),y0,yt,tp,p1Doors.map(q=>({s:q.s,w:q.w})),bedPt);
      if(!full) innerWall(P(sEnd+es*tp/2,qFace),P(sEnd+es*tp/2,qBed),y0,yt,tp,[],null);
      const p3Door= kind===BED? {s:Math.abs(mid(qFace,qStrip)-qFace),w:0.75} : null;
      innerWall(P(sP3,qFace),P(sP3,qStrip),y0,yt,tp,p3Door?[p3Door]:[],P(mid(partB[0],partB[1]),mid(qFace,qStrip)));
      // the rooms, for furnishing: rectangles, their walls, and the openings each one sees
      const rect=(sa,sb,qa,qb)=>{ const [p,q]=[P(Math.min(sa,sb),Math.min(qa,qb)),P(Math.max(sa,sb),Math.max(qa,qb))]; return {X0:p[0],Z0:p[1],X1:q[0],Z1:q[1]}; };
      const cellLine=dd=>line(dd);
      const subOps=(R,extra)=>{ const o=[]; const rl=dd=>dd===0?R.X1:dd===2?R.X0:dd===1?R.Z1:R.Z0, rr=dd=>dd%2===0?[R.Z0,R.Z1]:[R.X0,R.X1];
        for(const op of ops){ if(Math.abs(rl(op.d)-cellLine(op.d))>0.05) continue; const [lo,hi]=rr(op.d); if(op.s1>lo&&op.s0<hi) o.push(op); } return o.concat(extra); };
      const dop=(dd,sm,w)=>({d:dd,s0:sm-w/2,s1:sm+w/2,v0:0,top:2.1,pass:true});
      const sides=(walls)=>[0,1,2,3].map(dd=>({wall:walls[dd]}));
      const subs=[];
      { const R=rect(a,b,qBed+sg*0.03,line((d+2)%4)); const w=[0,1,2,3].map(dd=>dd===d? true : side[dd].wall);
        // a strip that stops short leaves a nook between its end wall and the far wall: open to the main room, so nothing stands
        // against that stretch, and the nook is floored (and tiled) with the room it belongs to
        const ex=p1Doors.map(q=>dop(d,q.sw,q.w)), cEnd= e===0? b : a;
        if(!full&&Math.abs(cEnd-(sEnd+es*tp))>0.05){ const n0=sEnd+es*tp, w2=Math.abs(cEnd-n0); ex.push(Object.assign(dop(d,mid(n0,cEnd),w2),{nook:true}));
          const N=rect(n0,cEnd,Ld,qBed+sg*0.03), wn=[0,1,2,3].map(dd=>dd===d? side[d].wall : dd===dEnd? side[dEnd].wall : dd===(d+2)%4? false : true);
          subs.push(Object.assign(N,{key:'nook',fn:'nook',bare:true,side:sides(wn),ops:subOps(N,[]),wet:kind===BATH})); }
        subs.unshift(Object.assign(R,{key:'main',fn:kind===BED?'suiteBed':'bathroom',side:sides(w),ops:subOps(R,ex),wet:kind===BATH})); }
      const strip=(isA,fn,doorsP1,p3,wet)=>{ const sa= isA? s0 : s0+es*(Lb+tp+0.03), sb= isA? s0+es*(Lb-0.03) : full? sFar : sEnd-es*0.03, R=rect(sa,sb,Ld,qStrip-sg*0.03);
        const w=[0,1,2,3].map(dd=>dd===d? side[d].wall : isA&&dd===dc? side[dc].wall : !isA&&full&&dd===dEnd? side[dEnd].wall : true);
        const ex=doorsP1.map(sm=>dop(qSide(sg),sm,0.8)); if(p3) ex.push(dop(isA? sSide(es) : sSide(-es),mid(qFace,qStrip),0.75));
        subs.push(Object.assign(R,{key:fn,fn,side:sides(w),ops:subOps(R,ex),wet})); };
      if(kind===BED){ strip(false,'wir',[dB],true,false); strip(true,'ensuite',[],true,true); }
      else { strip(false,'laundry',[dB],false,true); strip(true,'wc',[dA],false,true); }
      return subs; }
    return null; }
  if(!RU) for(let l=0;l<4;l++) for(let z=0;z<NZ;z++) for(let x=0;x<NX;x++){ const u=TU[idx(x,z,l)]; if(u!==BED&&u!==BATH) continue; B.jit=jitter(`${x},${z},${l}s`);
    const subs=suiteLayout(x,z,l,u); if(subs) SUITES.set(`${x},${z},${l}`,subs); }
  /* ---------- furniture & décor ----------
     Each room is measured inside its walls and laid out on a 20 cm grid. Doorways keep a clear apron (deep enough for the
     leaves to swing), open sides keep a walkway, tall pieces never stand in front of a window, and after placing everything
     the grid is flooded from one doorway: if any other doorway is cut off, the last solid piece placed is taken out again. */
  const DECO=new Set(['rug','vase','plant','floorLamp','hangLamp','wallHang','screen']);
  function roomSides(x,z,l,ty){ const i=idx(x,z,l), side=[]; for(let d=0;d<4;d++){ const nb=cellAt(x+DIRS[d][0],z+DIRS[d][1],l), k=faceKind(x,z,l,d);
      if(ty===IWAN&&R[i]===d) side.push({wall:false,inset:0.05});
      else if(k==='street'||k==='court'||k==='porch'||k==='inner') side.push({wall:true,inset:t+0.03});
      else if(enclosedT(ty)&&enclosedT(nb)) side.push({wall:true,inset:0.19});
      else if(nb===IWAN) side.push({wall:true,inset:0.03});
      else side.push({wall:false,inset:0.05}); }
    return side; }
  // sub: one room of a suite (its rectangle, walls, openings and use) instead of the whole module
  function furnishRoom(x,z,l,ty,sub,fnO){
    const cat=FURN_CAT[st.id]||'me', [cx,cz]=cellC(x,z), y0=l*H, i=idx(x,z,l), hw=CW/2, r=RNG(S.seed+'|furn|'+i+(sub?'|'+sub.key:''));
    const deck=ty===IWAN&&st.arc&&st.arc.deck, fy=deck? y0+0.38 : l===0? 0.06 : y0+0.02, ceil=y0+H-0.3;
    const fn= sub? sub.fn : fnO||roomFunction(roomName(st,ty,l,x,z),ty);
    const side= sub? sub.side : roomSides(x,z,l,ty);
    const X0=sub?sub.X0:cx-hw+side[2].inset, X1=sub?sub.X1:cx+hw-side[0].inset, Z0=sub?sub.Z0:cz-hw+side[3].inset, Z1=sub?sub.Z1:cz+hw-side[1].inset, rw=X1-X0, rd=Z1-Z0;
    const bare=!!(sub&&sub.bare);   // a nook: floor and wet-room tiling only
    if(bare? (rw<0.15||rd<0.15) : (rw<(sub?1.1:2.4)||rd<(sub?1.1:2.4))) return;
    const ops= sub? sub.ops : ROOMOPS.get(`${x},${z},${l}`)||[];
    // the room's frame for side d: wall line, along-axis range, inward normal
    const line=d=>d===0?X1:d===2?X0:d===1?Z1:Z0, range=d=>d%2===0?[Z0,Z1]:[X0,X1], inw=d=>[-DIRS[d][0],-DIRS[d][1]];
    const rectOf=(d,s,W,D)=>{ const L=line(d); return d===0?[L-D,s-W/2,L,s+W/2]:d===2?[L,s-W/2,L+D,s+W/2]:d===1?[s-W/2,L-D,s+W/2,L]:[s-W/2,L,s+W/2,L+D]; };
    const ctrOf=(d,s,D)=>{ const L=line(d); return d%2===0?[L+inw(d)[0]*D/2,s]:[s,L+inw(d)[1]*D/2]; };
    const faceA=d=>Math.atan2(-DIRS[d][0],-DIRS[d][1]);
    // grid
    const g=0.2, gw=Math.max(1,Math.floor(rw/g)), gd=Math.max(1,Math.floor(rd/g)), clr=new Uint8Array(gw*gd);
    const span=(x0,z0,x1,z1)=>[Math.max(0,Math.floor((x0-X0)/g+1e-6)),Math.max(0,Math.floor((z0-Z0)/g+1e-6)),Math.min(gw-1,Math.ceil((x1-X0)/g-1e-6)-1),Math.min(gd-1,Math.ceil((z1-Z0)/g-1e-6)-1)];
    const mark=(a,R4,v)=>{ const [i0,j0,i1,j1]=span(...R4); for(let j=j0;j<=j1;j++) for(let ii=i0;ii<=i1;ii++) a[j*gw+ii]=Math.max(a[j*gw+ii],v); };
    const zones=[];
    for(const o of ops) if(o.pass){ const ext=Math.min(1.1,o.s1-o.s0)+0.1, R4=rectOf(o.d,(o.s0+o.s1)/2,o.s1-o.s0+2*ext,1.35); mark(clr,R4,1); zones.push(R4); }
    for(let d=0;d<4;d++) if(!side[d].wall){ const [a,b]=range(d), R4=rectOf(d,(a+b)/2,b-a,1.5); mark(clr,R4,1); zones.push(R4); }
    if(!zones.length&&!bare) return;
    const placed=[], occ=new Uint8Array(gw*gd);
    const rebuild=()=>{ occ.fill(0); for(const p of placed) if(!p.floor) mark(occ,p.R4,p.solid?2:1); };
    const isFree=(R4,ignoreOcc)=>{ if(R4[0]<X0-1e-6||R4[2]>X1+1e-6||R4[1]<Z0-1e-6||R4[3]>Z1+1e-6) return false; const [i0,j0,i1,j1]=span(...R4);
      for(let j=j0;j<=j1;j++) for(let ii=i0;ii<=i1;ii++){ const q=j*gw+ii; if(clr[q]||(!ignoreOcc&&occ[q])) return false; } return true; };
    const winOK=(d,s0,s1,h,low)=>!ops.some(o=>o.d===d&&!o.pass&&o.s1>s0-0.05&&o.s0<s1+0.05&&o.v0<h+0.05&&!(low&&o.v0>=0.35));
    const put=(it,cxp,czp,a,W,D,R4)=>{ const p=Object.assign({},it,{x:cxp,z:czp,a,W,D,R4,solid:!!it.solid}); placed.push(p); if(!p.floor) mark(occ,R4,p.solid?2:1); return p; };
    const wallSides=()=>{ const ds=[0,1,2,3].filter(d=>side[d].wall); for(let k=ds.length-1;k>0;k--){ const j=r.int(0,k); [ds[k],ds[j]]=[ds[j],ds[k]]; }
      return ds.sort((a,b)=>ops.filter(o=>o.d===a).length-ops.filter(o=>o.d===b).length); };
    const tryWall=(it,ds)=>{ const W=it.W, D=it.D;
      for(const d of ds){ const [a,b]=range(d); if(b-a<W) continue; const cands=[(a+b)/2]; for(let s=a+W/2;s<=b-W/2+1e-6;s+=0.2) cands.push(s);
        for(const s of cands){ const R4=rectOf(d,s,W,D); if(!isFree(R4)) continue; if(!winOK(d,s-W/2,s+W/2,it.h,it.low)) continue; const [px,pz]=ctrOf(d,s,D); return put(it,px,pz,faceA(d),W,D,Object.assign(R4,{d,s})); } }
      return null; };
    let lastWall=null, lastCentre=null, lastFront=null;
    for(const it0 of bare? [] : furnRecipe(fn,cat,st,rw,rd,r)){ const it=Object.assign({},it0);
      if(DECO.has(it.g)? !FT.decor : !FT.furniture) continue;
      if(it.place==='wall'){ let W=it.W; for(let tr=0;tr<3&&W>=Math.min(0.8,it.W);tr++){ const p=tryWall(Object.assign(it,{W}),it.set==='hall'?wallSides().reverse():wallSides()); if(p){ lastWall=p; break; } W*=0.75; } }
      else if(it.place==='corner'){ const cs=[[0,1],[1,2],[2,3],[3,0]].filter(([a,b])=>side[a].wall&&side[b].wall); for(let k=cs.length-1;k>0;k--){ const j=r.int(0,k); [cs[k],cs[j]]=[cs[j],cs[k]]; }
        for(const [a,b] of cs){ const [ra0,ra1]=range(b), sB=line(b), sA=line(a), W=it.W, D=it.D;
          const px=a===0?sA-D/2:a===2?sA+D/2:(b===0?sB-W/2:sB+W/2), pz=a===1?sA-D/2:a===3?sA+D/2:(b===1?sB-W/2:sB+W/2);
          const R4=[px-(a%2===0?D:W)/2,pz-(a%2===0?W:D)/2,px+(a%2===0?D:W)/2,pz+(a%2===0?W:D)/2];
          if(!isFree(R4)||!winOK(a,(a%2===0?pz:px)-0.5,(a%2===0?pz:px)+0.5,it.h,it.low)||!winOK(b,(b%2===0?pz:px)-0.5,(b%2===0?pz:px)+0.5,it.h,it.low)) continue;
          put(it,px,pz,faceA(a),W,D,R4); break; void ra0; void ra1; } }
      else if(it.place==='centre'){ let W=Math.min(it.W,rw-0.6), D=Math.min(it.D,rd-0.6); const alongX=rw>=rd;
        for(let tr=0;tr<6&&W>0.5&&D>0.5;tr++){ const w=alongX?W:D, dd=alongX?D:W, R4=[(X0+X1)/2-w/2,(Z0+Z1)/2-dd/2,(X0+X1)/2+w/2,(Z0+Z1)/2+dd/2];
          if(isFree(R4,it.floor)){ const p=put(it,(X0+X1)/2,(Z0+Z1)/2,alongX?0:Math.PI/2,W,D,R4); if(!it.floor) lastCentre=p; break; } W*=0.85; D*=0.85; } }
      else if(it.place==='ring'&&lastCentre){ const c=lastCentre, n=it.n||4; let k=0;
        for(const [ux,uz] of [[0,1],[0,-1],[1,0],[-1,0]]){ if(k>=n) break; const off=(ux? (c.a===0?c.W:c.D) : (c.a===0?c.D:c.W))/2+0.4, W=it.W||0.56, D=it.D||0.56, px=c.x+ux*off, pz=c.z+uz*off, R4=[px-W/2,pz-D/2,px+W/2,pz+D/2];
          if(!isFree(R4)) continue; put(it,px,pz,Math.atan2(-ux,-uz),W,D,R4); k++; } }
      else if(it.place==='front'&&lastWall){ const L=lastWall, d=L.R4.d, [a,b]=range(d), W=it.W, D=it.D, s=L.R4.s, off=L.D+0.15;
        const sh=d===0?[-off,0]:d===2?[off,0]:d===1?[0,-off]:[0,off], base=rectOf(d,s,W,D), R4=[base[0]+sh[0],base[1]+sh[1],base[2]+sh[0],base[3]+sh[1]];
        if(isFree(R4)){ lastFront=put(it,(R4[0]+R4[2])/2,(R4[1]+R4[3])/2,faceA(d),W,D,Object.assign(R4,{d,s})); } void a; void b; }
      else if(it.place==='beside'&&lastFront){ const F0=lastFront, d=F0.R4.d, W=it.W, D=it.D;
        for(const sg of [-1,1]){ const s=F0.R4.s+sg*(F0.W/2+W/2+0.08), base=rectOf(d,s,W,D), off=d===0?[-(lastWall.D+0.15),0]:d===2?[lastWall.D+0.15,0]:d===1?[0,-(lastWall.D+0.15)]:[0,lastWall.D+0.15];
          const R4=[base[0]+off[0],base[1]+off[1],base[2]+off[0],base[3]+off[1]]; if(isFree(R4)) put(it,(R4[0]+R4[2])/2,(R4[1]+R4[3])/2,faceA(d),W,D,R4); } }
      else if(it.place==='hang'&&ty!==DOME) placed.push(Object.assign({},it,{x:(X0+X1)/2,z:(Z0+Z1)/2,a:0,floor:true,R4:[0,0,0,0]}));
      else if(it.place==='deco') placed.push(Object.assign({},it,{deco:true,floor:true,R4:[0,0,0,0]}));
    }
    // keep every doorway reachable from the first
    const reach=()=>{ const seen=new Uint8Array(gw*gd), q=[]; const [i0,j0,i1,j1]=span(...zones[0]);
      for(let j=j0;j<=j1;j++) for(let ii=i0;ii<=i1;ii++){ const k=j*gw+ii; if(occ[k]!==2){ seen[k]=1; q.push(k); } }
      while(q.length){ const k=q.pop(), ii=k%gw, j=(k/gw)|0; for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){ const a=ii+di, b=j+dj; if(a<0||b<0||a>=gw||b>=gd) continue; const n=b*gw+a; if(seen[n]||occ[n]===2) continue; seen[n]=1; q.push(n); } }
      return zones.every(Z=>{ const [a0,b0,a1,b1]=span(...Z); for(let j=b0;j<=b1;j++) for(let ii=a0;ii<=a1;ii++) if(seen[j*gw+ii]) return true; return false; }); };
    if(!bare) for(let guard=0;guard<20&&!reach();guard++){ let k=-1; for(let j=placed.length-1;j>=0;j--) if(placed[j].solid){ k=j; break; } if(k<0) break; placed.splice(k,1); rebuild(); }
    // build
    const fk= sub&&sub.wet? (FIT==='modern'?'ftile':null) : sub&&fn==='wir'? null : !FT.decor||fn==='kitchen'||fn==='store'? null : cat==='jp'?'tatami':cat==='kr'?'ondol':cat==='sea'||st.id==='newar'?'mat':cat==='rom'?'mosaic':cat==='eu'&&st.id!=='cycladic'?'floorb':null;
    if(fk) B.box(fk,X0+0.005,fy+0.002,Z0+0.005,X1-0.005,fy+(fk==='ftile'?0.02:0.045),Z1-0.005);
    // a modern wet room is tiled to shoulder height, stopping at doorways and under low windows
    if(sub&&sub.wet&&FIT==='modern') for(let d=0;d<4;d++){ if(!side[d].wall) continue; const [a,b]=range(d), L=line(d), o0=0.018, o1=0.03, sg=d%2===0? DIRS[d][0] : DIRS[d][1];
      const cuts=ops.filter(o=>o.d===d&&(o.pass||o.v0<1.35)).map(o=>[o.s0,o.s1]).sort((p,q)=>p[0]-q[0]); let u=a-0.03;
      const seg=(s0,s1)=>{ if(s1-s0<0.04) return; const q0=L+sg*o0, q1=L+sg*o1; if(d%2===0) B.box('btile',Math.min(q0,q1),fy,s0,Math.max(q0,q1),fy+1.35,s1); else B.box('btile',s0,fy,Math.min(q0,q1),s1,fy+1.35,Math.max(q0,q1)); };
      for(const [c0,c1] of cuts){ if(c0>u) seg(u,c0); u=Math.max(u,c1); } seg(u,b+0.03); }
    const fy2=fy+(fk?0.045:0);
    const pal=FURN_PAL[st.id], decoKinds=cat==='eu'?['painting','mirror','painting']:cat==='rom'?['painting']:cat==='me'?['kilim','mirror','plates']:cat==='cn'?['scroll','painting']:cat==='jp'||cat==='kr'?['scroll']:cat==='tb'?['thangka']:cat==='in'?['painting','mirror','thangka']:['painting'];
    for(const p of placed){
      if(p.deco){ for(let k=0;k<(p.n||1);k++){ const ds=[0,1,2,3].filter(d=>side[d].wall); if(!ds.length) break; const d=ds[r.int(0,ds.length-1)], [a,b]=range(d), kind=p.kind||r.pick(decoKinds);
          const W=kind==='scroll'?0.6:kind==='thangka'?0.8:kind==='plates'?1.3:kind==='mirror'?0.7:1.1, Hh=Math.min(kind==='scroll'||kind==='thangka'?1.25:0.9,ceil-fy2-1.5);
          if(Hh<0.4||b-a<W+0.4) continue; let ok=null;
          for(let tr=0;tr<12&&!ok;tr++){ const s=tr===0?(a+b)/2:r.range(a+W/2+0.2,b-W/2-0.2), v0=1.35;
            if(ops.some(o=>o.d===d&&o.s1>s-W/2-0.1&&o.s0<s+W/2+0.1&&o.top>v0-0.05&&o.v0<v0+Hh+0.1)) continue;
            if(placed.some(q=>q.tall&&q.R4&&q.R4.d===d&&Math.abs(q.R4.s-s)<(q.W+W)/2)) continue;
            if(placed.some(q=>q.hung&&q.d===d&&Math.abs(q.s-s)<W)) continue; ok={s,v0}; }
          if(!ok) continue; const L=line(d)+DIRS[d][0]*0.025*(d%2===0?1:0)+DIRS[d][1]*0.025*(d%2?1:0), px=d%2===0?L:ok.s, pz=d%2===0?ok.s:L;
          placed.push({hung:true,d,s:ok.s,R4:[0,0,0,0]}); FG.wallHang(B,{M:mm(mT(px,fy2+ok.v0,pz),mRY(faceA(d))),W,Hh,kind,cat,st,r,pal}); }
        continue; }
      if(p.hung) continue;
      const P=Object.assign({},p,{M:mm(mT(p.x,p.g==='hangLamp'?0:fy2,p.z),mRY(p.a)),cat,st,r,pal,ceil:ceil-fy2});
      if(p.g==='hangLamp'){ P.ceil=ceil; FG.hangLamp(B,P); continue; }
      if(p.g==='plant'){ pottedPlant(B,p.x,fy2,p.z,r); continue; }
      FG[p.g](B,P);
      if(p.solid) colM(P.M,-p.W/2,0,-p.D/2,p.W/2,Math.min(p.h||1,ceil-fy2),p.D/2);
    }
  }

  if((FT.furniture||FT.decor)&&!RU){ B.jit=[1,1,1]; for(let l=0;l<4;l++) for(let z=0;z<NZ;z++) for(let x=0;x<NX;x++){ const ty=cellAt(x,z,l); if(ty===ROOM||ty===DOME||ty===IWAN){ B.grp={key:'c'+x+','+z+','+l,interior:true};
      const subs=SUITES.get(`${x},${z},${l}`), u=TU[idx(x,z,l)]; if(subs) for(const sb of subs) furnishRoom(x,z,l,ty,sb); else furnishRoom(x,z,l,ty,null,u===BED?'bed':u===BATH?'bathroom':null); B.grp=null; } } }   // a room's contents cull as one interior

  /* outside flights: a stepped masonry mass against the wall, a sloping parapet rail, a landing at the top
     (open to the roof, or at a door), and an arched recess under the landing where there is headroom */
  function outStair(f){
    const F=f.F, s=f.s, D=f.D, SW=OS.SW, y0=f.y0, yt=f.yt, n=f.n, nT=n-1, rs=(yt-y0)/n, tr=f.tread, wk=wallKey(f.l), cap='base';
    const u=q=>f.bot+s*q, qEnd=Math.abs(f.end-f.bot), ylin=q=>y0+q/tr*rs;
    B.jit=jitter(`os${f.x},${f.z},${f.l}`);
    // arched recess under the landing
    let hole=null; { const hw=Math.min(1.25,f.LL-0.45), vs=y0+Math.min(2.05,yt-y0-0.55-hw/2);
      if(hw>0.8&&vs>y0+1.6){ const qm=f.run+f.LL/2; hole={u0:Math.min(u(qm-hw/2),u(qm+hw/2)),u1:Math.max(u(qm-hw/2),u(qm+hw/2)),v0:y0,vs,arch:'round'}; } }
    const prof=[[u(0),y0]]; for(let i=0;i<nT;i++) prof.push([u(i*tr),y0+(i+1)*rs],[u((i+1)*tr),y0+(i+1)*rs]);
    prof.push([u(f.run),yt],[u(qEnd),yt],[u(qEnd),y0]);
    const P=dedupe(prof), outer= s>0? P : P.slice().reverse();
    B.ext(wk,outer,hole?[openPoly(hole).slice().reverse()]:null,D,atF(F,0,0,0.004));
    if(hole) B.box('trim',hole.u0+0.003,y0,0.02,hole.u1-0.003,y0+0.025,D-0.01,F.M);
    // tread caps with a nosing, and the landing
    for(let i=0;i<nT;i++){ const a=u(i*tr)-s*0.03, b=u((i+1)*tr), top=y0+(i+1)*rs; B.box(cap,Math.min(a,b),top-0.05,0.007,Math.max(a,b),top+0.012,SW+0.03,F.M);
      const lo=hole&&Math.min(a,b)>=hole.u0-1e-3&&Math.max(a,b)<=hole.u1+1e-3? hole.vs+(hole.u1-hole.u0)/2 : y0;
      colM(F.M,Math.min(u(i*tr),b),lo,0,Math.max(u(i*tr),b),top,D); }
    B.box(cap,Math.min(u(f.run),u(qEnd))-0.006,yt-0.05,0.007,Math.max(u(f.run),u(qEnd))+0.006,yt+0.012,SW+0.03,F.M);
    const La=Math.min(u(f.run),u(qEnd)), Lb=Math.max(u(f.run),u(qEnd));
    if(hole){ const top=hole.vs+(hole.u1-hole.u0)/2; colM(F.M,La,y0,0,hole.u0,yt,D); colM(F.M,hole.u1,y0,0,Lb,yt,D); colM(F.M,hole.u0,top,0,hole.u1,yt,D); }
    else colM(F.M,La,y0,0,Lb,yt,D);
    // parapet rail along the open side, from the third step up, and across the landing's end
    const qs=Math.min(Math.max(2*tr,1.0),f.run*0.35), rail=[[u(qs),ylin(qs)],[u(f.run),ylin(f.run)],[u(f.run),yt],[u(qEnd),yt],[u(qEnd),yt+0.95],[u(f.run),yt+0.95],[u(qs),ylin(qs)+rs+0.9]];
    B.ext(wk,s>0?rail:rail.slice().reverse(),null,OS.BW,atF(F,0,0,SW));
    B.box(cap,Math.min(u(f.run),u(qEnd)),yt+0.95,SW-0.02,Math.max(u(f.run),u(qEnd)),yt+1.0,D+0.02,F.M);
    for(let i=0;i<nT;i++){ if((i+1)*tr<=qs+1e-6) continue; const a=u(Math.max(i*tr,qs)), b=u((i+1)*tr), top=y0+(i+1)*rs; colM(F.M,Math.min(a,b),top,SW,Math.max(a,b),top+0.95,D); }
    colM(F.M,Math.min(u(f.run),u(qEnd)),yt,SW,Math.max(u(f.run),u(qEnd)),yt+0.95,D);
    const ec=u(qEnd), ec0=ec-s*OS.BW; B.box(wk,Math.min(ec,ec0),yt,0.004,Math.max(ec,ec0),yt+0.95,SW,F.M); colM(F.M,Math.min(ec,ec0),yt,0,Math.max(ec,ec0),yt+0.95,SW);
    B.box(cap,Math.min(ec,ec0)-0.02,yt+0.95,0.007,Math.max(ec,ec0)+0.02,yt+1.0,SW,F.M);
  }
  for(const f of OUT) outStair(f);
  // roofs
  for(let l=0;l<4;l++) for(let z=0;z<NZ;z++) for(let x=0;x<NX;x++){
    const ty=cellAt(x,z,l); if(!isMass(ty)) continue; const above=cellAt(x,z,l+1); if(isMass(above)) continue;
    const i=idx(x,z,l), [cx,cz]=cellC(x,z), y1=(l+1)*H, mod=modOf(x,z,l), hip=hipCells.has(i);
    B.jit=jitter(`${x},${z},${l}r`);
    const roofK= !FT.ablaq&&l===0&&st.groundWall? 'roof2' : 'roof';   // the flat roof: as the walls unless the roof finish says otherwise
    if(!hip){
      if(ty===STAIR&&stairInfo[`${x},${z}`]) stairSlab(roofK,x,z,y1-0.3,y1+0.04,true);
      else if(ty===DOME){ const hh=(CW/2-t*0.4-0.12)*0.68, h=CW/2-0.025; for(const [a0,b0,a1,b1] of [[-h,-h,h,-hh],[-h,hh,h,h],[-h,-hh,-hh,hh],[hh,-hh,h,hh]]){ B.box(roofK,cx+a0,y1-0.3,cz+b0,cx+a1,y1+0.04,cz+b1); colB(cx+a0,y1-0.3,cz+b0,cx+a1,y1+0.04,cz+b1); } }
      else slab(roofK,x,z,l,y1-0.3,y1+0.04,(nb,nx,nz)=>!isMass(nb)||hipCells.has(idx(nx,nz,l))); }   // a hipped neighbour has no slab: stop short of its open roof space
    const pFaces=[];
    if(!hip&&ty!==STAIR&&(ty!==DOME||st.domeParapet)){
      for(let d=0;d<4;d++){ const nb=cellAt(x+DIRS[d][0],z+DIRS[d][1],l); if(isMass(nb)) continue;
        if((ty===IWAN||ty===GATE)&&R[i]===d&&st.pish>0) continue;
        parapetRun(trimF(fr(cx,cz,d),k=>!isMass(cellAt(x+DIRS[k][0],z+DIRS[k][1],l))),y1,false,outGap.get(dk(x,z,l,d))); pFaces.push(d); }
      if(FT.pinnacles&&st.pinnacle) for(let d=0;d<4;d++){ const d2=(d+1)%4; if(pFaces.includes(d)&&pFaces.includes(d2)){ const ins=CW/2-Math.max(0.25,t*0.55)/2; pinnacle(cx+(DIRS[d][0]+DIRS[d2][0])*ins,y1,cz+(DIRS[d][1]+DIRS[d2][1])*ins); } }
      if(FT.spouts&&st.spout) for(const d of pFaces){ if(outGap.has(dk(x,z,l,d))) continue; const F=fr(cx,cz,d), r=RNG(S.seed+'sp'+i+d), u=lerp(F.uA+1.2,F.uB-1.2,r.f()); B.box(st.spout,u-0.08,y1+0.02,-0.1,u+0.08,y1+0.17,0.72,F.M); B.box('void',u-0.04,y1+0.13,0,u+0.04,y1+0.175,0.72,F.M); }
    } else if(!hip&&ty===DOME){
      for(let d=0;d<4;d++){ const nb=cellAt(x+DIRS[d][0],z+DIRS[d][1],l); if(isMass(nb)) continue; const F=fr(cx,cz,d); B.box(st.parapet==='cornice'?'stone':'trim',F.uA,y1-0.2,0,F.uB,y1+0.04,0.18,F.M); }
    }
    if(ty===DOME) domeOn(cx,cz,y1+0.04,CW/2-t*0.4,mod.dome||st.dome,{zk:roofK,open:true});
    if(ty===ARC&&st.arcDomes&&!hip){ B.cyl('stone',2.3*KS,2.3*KS,0.45,8,mm(mT(cx,y1+0.04,cz),mRY(Math.PI/8))); B.lathe('lead',DOMEPROF.hemi(2.05*KS),24,mT(cx,y1+0.49,cz)); alem(B,cx,y1+0.49+2.05*KS,cz,0.6); }
    if(ty===STAIR&&above===EMPTY&&!hip) stairHead(x,z,l);
    if(FT.roofLife&&above===EMPTY&&!hip&&ty!==DOME&&ty!==STAIR&&!(ty===ARC&&st.arcDomes)) roofClutter(x,z,l,cx,cz,y1+0.04,pFaces);
  }
  B.walkOn=true;   // roof planes from here on are walkable
  for(const [x0,z0,x1,z1,l] of hipRects){ const y=(l+1)*H; B.jit=[1,1,1];
    if(PITCH) asianRoofRect(x0,z0,x1,z1,l);
    else { const op=cells=>cells.every(([x,z])=>roofOpenT(cellAt(x,z,l)))?0.55:0, W=[],E=[],N=[],S=[];
      for(let z=z0;z<=z1;z++){ W.push([x0-1,z]); E.push([x1+1,z]); } for(let x=x0;x<=x1;x++){ N.push([x,z0-1]); S.push([x,z1+1]); }
      hipRoofXZ((x0-NX/2)*CW,(z0-NZ/2)*CW,(x1+1-NX/2)*CW,(z1+1-NZ/2)*CW,y+0.02,0.3,[op(W),op(E),op(N),op(S)]); } }
  B.walkOn=false;

  // where a visitor enters on foot
  let spawn=null; const at_=(x,z,d,dist)=>{ const [cx,cz]=cellC(x,z); return {x:cx+DIRS[d][0]*(CW/2+dist), z:cz+DIRS[d][1]*(CW/2+dist), yaw:Math.atan2(DIRS[d][0],DIRS[d][1])}; };
  for(let i=0;i<NC&&!spawn;i++) if(T[i]===GATE) spawn=at_(i%NX,(i/NX)|0,R[i],5);
  for(const outer of [true,false]) if(!spawn) for(const k of doors){ const [x,z,l,d]=k.split(',').map(Number); if(l===0&&faceKind(x,z,0,d)==='street'&&(!outer||cellAt(x+DIRS[d][0],z+DIRS[d][1],0)===-1)){ spawn=at_(x,z,d,4); break; } }
  if(!spawn) spawn={x:0, z:CW*NZ/2+6, yaw:0};
  if(RU){ // doors have rotted, lamps are out; colliders follow the skyline; then the fallen masonry and the site's own debris
    ruinFlush(B,RU);   // decay the whole building from the ground up, so every surviving piece rests on one below it
    { const nx=Math.sin(spawn.yaw), nz=Math.cos(spawn.yaw); let best=null, bd=1e9;   // stand the visitor square-on to the nearest doorway (there are no leaves to find it by)
      for(const D of DOORS){ const cb=aabbM(D.F.M,D.o.u0,D.o.v0,-(D.tt||t),D.o.u1,D.top||D.o.v0+2,0); if(cb[1]>0.1) continue; const cx=(cb[0]+cb[3])/2, cz=(cb[2]+cb[5])/2, lat=Math.abs((spawn.x-cx)*nz-(spawn.z-cz)*nx), k=(spawn.x-cx)*nx+(spawn.z-cz)*nz;
        if(k>0.5&&k<9&&lat<3&&lat+0.3*k<bd){ bd=lat+0.3*k; best=[cx,cz,k]; } }
      if(best){ spawn.x=best[0]+nx*best[2]; spawn.z=best[1]+nz*best[2]; spawn.door=[best[0],best[1]]; } }
    B.ruin=null; DOORS.length=0; B.lanterns.length=0; B.jit=[1,1,1];
    const cut=ruinCols(RU,COL); COL.length=0; for(const b of cut) COL.push(b);
    const clear=[[spawn.x,spawn.z,2.2]];
    for(const [key,ops] of ROOMOPS){ const [x,z,l]=key.split(',').map(Number); if(l!==0) continue; const [cx,cz]=cellC(x,z);
      for(const o of ops){ if(!o.pass) continue; const s=(o.s0+o.s1)/2, wl=(o.d%2===0? cx : cz)+(o.d%2===0? DIRS[o.d][0] : DIRS[o.d][1])*CW/2;
        for(const off of [-1.1,1.1]) clear.push(o.d%2===0? [wl+off,s,1.15] : [s,wl+off,1.15]); } }
    for(const f of OUT){ const a=atW(f.F,f.bot,0,OS.SW/2); clear.push([a.x,a.z,1.4]); }
    for(const k of doors){ const [x,z,l,d]=k.split(',').map(Number); if(l) continue; const [cx,cz]=cellC(x,z); clear.push([cx+DIRS[d][0]*(CW/2+1.2),cz+DIRS[d][1]*(CW/2+1.2),1.4]); }
    { const tx=spawn.door?spawn.door[0]:0, tz=spawn.door?spawn.door[1]:0, dx=tx-spawn.x, dz=tz-spawn.z, L=Math.hypot(dx,dz)||1; for(let s=0;s<Math.min(L+2,9);s+=1.0) clear.push([spawn.x+dx/L*s,spawn.z+dz/L*s,1.3]); }
    B._rk=1; ruinDebris(B,RU,clear,cellAt,H);
    if(ruinScatter(B,RU,st,{NX,NZ,H,CW,cellAt,cellC,clear,colB,col:COL,seed:S.seed,spawn})) hasWater=true;
    B._rk=0; }
  const cullOpts={CW,NX,NZ,H}, level0=B.finish(mats,cullOpts), lod=new THREE.LOD(), group=new THREE.Group(); lod.name='lod'; lod.addLevel(level0,0); group.add(lod);
  /* hinged door leaves: pivot (fixed, at the hinge) → swing (animated rotation.y) → leaf meshes.
     Hinge frame: x along the leaf from the hinge, y up, z outward (leaf occupies z 0..0.08); +rotation swings inward. */
  const doorGroup=new THREE.Group(); doorGroup.name='doors'; const doorList=[], placedLeaves=[];
  const solidHit=b=>{ const s=[b[0]+0.03,b[1]+0.3,b[2]+0.03,b[3]-0.03,b[4]-0.05,b[5]-0.03];
    const hit=c=>c[3]>s[0]&&c[0]<s[3]&&c[4]>s[1]&&c[1]<s[4]&&c[5]>s[2]&&c[2]<s[5]; return COL.some(hit)||placedLeaves.some(hit); };
  // widest swing that stays clear: folded flat against the wall, part-way, or square to it
  const SWINGS=[Math.PI-0.1,2.3,1.75,1.5,1.2];
  for(const D of DOORS){
    const {F,o,w,hh,tt,wz}=D, leaves=[], ob=[], oc=[];
    const cen=atW(F,(o.u0+o.u1)/2,o.v0,-tt/2), id=[cen.x,cen.y,cen.z].map(v=>Math.round(v*10)).join(',');
    D.leaves.forEach((L,li)=>{
      if(!L.poly||L.poly.length<3) return;
      const ly0=Math.max(...L.poly.map(p=>p[1])), kx=1-0.006/L.lw, ky=1-0.016/ly0;   // hair-line clearances so no edge is coplanar with jamb, soffit or floor
      const LB=new Builder(0), pts=L.poly.map(p=>[(p[0]-L.off)*kx+L.s*0.004,0.012+p[1]*ky]), ly=Math.max(...pts.map(p=>p[1]));
      LB.ext('door',pts,null,0.08,null,(x,y)=>[(x+L.off)/w*L.us,y/hh]);
      const fx=L.s*(L.lw-(D.dbl?0.16:0.2)), kv=Math.min(1.45,ly-0.35);
      if(o.knockers&&(li===0||!D.dbl)) LB.torus('metal',0.07,0.015,Math.PI*2,mT(fx,kv,0.1),5,12);           // ring knocker (men's)
      if(o.knockers&&(li===1||!D.dbl)){ const bx=D.dbl?fx:L.s*(L.lw-0.48); LB.box('metal',bx-0.02,kv-0.14,0.08,bx+0.02,kv+0.06,0.12); } // bar knocker (women's)
      if(!o.knockers){ const pv=Math.min(1.05,ly-0.3); LB.box('metal',fx-0.025,pv+0.03,0.08,fx+0.025,pv+0.09,0.095); LB.torus('metal',0.045,0.01,Math.PI*2,mT(fx,pv,0.1),4,10); }
      LB.box('metal',fx-0.02,1.0,-0.035,fx+0.02,1.16,0); // inner pull
      const HM=D.out? mm(atF(F,o.u0+L.off,o.v0,0),mS(1,1,-1)) : atF(F,o.u0+L.off,o.v0,wz), pivot=new THREE.Group(), swing=new THREE.Group(), leafG=LB.finish(mats);
      pivot.matrixAutoUpdate=false; pivot.matrix.copy(HM); pivot.matrixWorldNeedsUpdate=true;
      leafG.traverse(m=>{ if(m.geometry){ m.castShadow=true; m.receiveShadow=true; } });
      swing.add(leafG); pivot.add(swing); doorGroup.add(pivot); B.tris+=LB.tris;
      const leafBox=a=>aabbM(mm(HM,mRY(L.s*a)),Math.min(0,L.s*L.lw),0,0,Math.max(0,L.s*L.lw),ly,0.08);
      let a=SWINGS[SWINGS.length-1], bx=leafBox(a); for(const c of SWINGS){ const b=leafBox(c); if(!solidHit(b)){ a=c; bx=b; break; } }
      ob.push(bx); placedLeaves.push(bx); if(a<SWINGS[0]-1e-3) oc.push(bx); // a leaf folded flat stands inside the walker's radius: no collider
      leaves.push({obj:swing,s:L.s,a,lw:L.lw,pivot});
    });
    if(leaves.length) doorList.push({id, leaves, cb:aabbM(F.M,o.u0,o.v0,-tt,o.u1,D.top,0), ob, oc, gate:!!o.gate, dbl:D.dbl, t:0, target:0});
  }
  group.add(doorGroup);
  // stand the visitor square-on to the entrance they spawn at
  { const nx=Math.sin(spawn.yaw), nz=Math.cos(spawn.yaw); let best=null, bd=1e9;
    for(const d of doorList){ if(d.cb[1]>0.1) continue; const cx=(d.cb[0]+d.cb[3])/2, cz=(d.cb[2]+d.cb[5])/2, lat=Math.abs((spawn.x-cx)*nz-(spawn.z-cz)*nx), k=(spawn.x-cx)*nx+(spawn.z-cz)*nz;
      if(k>0.5&&k<9&&lat<3&&lat+0.3*k<bd){ bd=lat+0.3*k; best=[cx,cz,k]; } }
    if(best){ spawn.x=best[0]+nx*best[2]; spawn.z=best[1]+nz*best[2]; } }
  // a ruin is framed on its plot, not on the debris and trees scattered round it
  let focus=null; if(RU){ let top=2; for(const w of RU.walls) top=Math.max(top,w.topMax); for(const t of RU.towersL) top=Math.max(top,t.h); focus=[-NX*CW/2,NX*CW/2,-NZ*CW/2,NZ*CW/2,Math.min(top,4*H+2)]; }
  return {group, lod, lodRec:B.rec, focus, cullOpts, suites:SUITES.size, walkTris:new Float32Array(B.walkT), lanterns:B.lanterns, tris:Math.round(B.tris), doors, doorList, col:COL, spawn, outStairs:OUT.map(f=>({l:f.l, box:aabbM(f.F.M,Math.min(f.bot,f.end),f.y0-0.2,0,Math.max(f.bot,f.end),f.yt+1.8,f.D)})), hasWater:hasWater||B.bk.has('water'), stairs:stairInfo, stairDims:{SH,AS,SP0,FA0,B0,BL,AF}};
}
