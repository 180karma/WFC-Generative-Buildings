
/* ============================================================
   WAVE FUNCTION COLLAPSE
   nx×nz plot (2–4 a side) × 4 levels. 16 variants (iwan & gate in 4 facings).
   Socket rules on the 4 horizontal faces, stacking rules vertically.
   Min-entropy collapse with full backtracking.
   ============================================================ */
const VARS=[];
for(let t=0;t<NT;t++){ if(t===IWAN||t===GATE){ for(let r=0;r<4;r++) VARS.push({t,r}); } else VARS.push({t,r:0}); }
const NV=VARS.length;
const ALLV=(1<<NV)-1;
const TYPEMASK=new Array(NT).fill(0);
VARS.forEach((v,i)=>{ TYPEMASK[v.t]|=(1<<i); });

function sock(v,d){
  const {t,r}=VARS[v];
  if(t===EMPTY) return 'air';
  if(t===COURT) return 'court';
  if(t===IWAN) return d===r?'mouth':'solid';
  if(t===GATE) return d===r?'portal':'solid';
  if(t===TOWER) return 'tower';
  if(t===KIOSK) return 'kiosk';
  if(t===PRIVY) return 'yard';
  return 'solid';
}
const OKP=new Set();
[['air','air'],['air','solid'],['air','mouth'],['air','portal'],['air','tower'],['air','kiosk'],
 ['solid','solid'],['solid','court'],['solid','tower'],['solid','kiosk'],
 ['court','court'],['court','mouth'],['court','tower'],['court','kiosk'],
 ['kiosk','mouth'],['kiosk','tower'],['kiosk','kiosk'],
 ['edge','air'],['edge','solid'],['edge','court'],['edge','mouth'],['edge','portal'],['edge','tower'],['edge','kiosk'],
 // a back yard may open onto the plot's open ground as well as onto the house, a courtyard or another yard
 ['yard','air'],['yard','solid'],['yard','court'],['yard','yard'],['yard','mouth'],['yard','tower'],['edge','yard']
].forEach(([a,b])=>OKP.add(a<b?a+'|'+b:b+'|'+a));
const compat=(a,b)=>OKP.has(a<b?a+'|'+b:b+'|'+a);

const ABOVE=[];
ABOVE[EMPTY]=[EMPTY];
ABOVE[ROOM]=[EMPTY,ROOM,DOME,IWAN,ARC,TOWER,KIOSK,BED,BATH];
ABOVE[DOME]=[EMPTY];
ABOVE[IWAN]=[EMPTY,ROOM,ARC,KIOSK,DOME,BED,BATH];
ABOVE[ARC]=[EMPTY,ROOM,ARC,KIOSK,DOME,IWAN,BED,BATH];
ABOVE[COURT]=[EMPTY];
ABOVE[STAIR]=[EMPTY,STAIR];
ABOVE[TOWER]=[EMPTY,TOWER];
ABOVE[KIOSK]=[EMPTY];
ABOVE[GATE]=[EMPTY,ROOM,ARC,DOME,KIOSK,BED,BATH];
ABOVE[BED]=ABOVE[ROOM]; ABOVE[BATH]=ABOVE[ROOM]; ABOVE[PRIVY]=[EMPTY];

// CM[v*6+d] = mask of variants allowed in neighbour d of a cell holding v. d: 0..3 horizontal (DIRS), 4 up, 5 down
const CM=new Uint32Array(NV*6);
const EDGEM=new Uint32Array(4);
for(let v=0;v<NV;v++){
  for(let d=0;d<4;d++){
    let m=0; for(let u=0;u<NV;u++) if(compat(sock(v,d),sock(u,(d+2)%4))) m|=(1<<u);
    CM[v*6+d]=m;
  }
  let up=0, dn=0;
  for(let u=0;u<NV;u++){
    if(ABOVE[VARS[v].t].includes(VARS[u].t)) up|=(1<<u);
    if(ABOVE[VARS[u].t].includes(VARS[v].t)) dn|=(1<<u);
  }
  CM[v*6+4]=up; CM[v*6+5]=dn;
}
for(let d=0;d<4;d++){ let m=0; for(let v=0;v<NV;v++) if(compat(sock(v,d),'edge')) m|=(1<<v); EDGEM[d]=m; }

// neighbour table for the current grid (cached per size)
const NB_CACHE={};
function nbTable(){ const {nx,nz,nc,ncell}=GRID, key=nx+'x'+nz; if(NB_CACHE[key]) return NB_CACHE[key];
  const NB=new Int16Array(ncell*6);
  for(let i=0;i<ncell;i++){ const x=i%nx, z=((i/nx)|0)%nz, l=(i/nc)|0;
    for(let d=0;d<4;d++){ const ax=x+DIRS[d][0], az=z+DIRS[d][1]; NB[i*6+d]=(ax<0||ax>=nx||az<0||az>=nz)?-1:ax+az*nx+l*nc; }
    NB[i*6+4]=l<3?i+nc:-1; NB[i*6+5]=l>0?i-nc:-1; }
  return NB_CACHE[key]=NB; }
const cellXZL=i=>{ const {nx,nz,nc}=GRID; return [i%nx,((i/nx)|0)%nz,(i/nc)|0]; };
const useGrid=o=>{ if(o&&o.nx) setGrid(o.nx,o.nz); return GRID; };
const popc=m=>{ let c=0; while(m){ m&=m-1; c++; } return c; };
const lowbit=m=>31-Math.clz32(m&-m);

function cellWeights(o){
  const {nx,nz,nc,ncell:NCELL}=GRID;
  const WT=new Float64Array(NCELL*NV);
  for(let i=0;i<NCELL;i++){
    const [x,z,l]=cellXZL(i), h=o.heights[x+z*nx];
    const edgeCell = x===0||z===0||x===nx-1||z===nz-1;
    for(let v=0;v<NV;v++){
      const t=VARS[v].t; let w=Math.max(0,o.w[t]||0);
      switch(t){
        case EMPTY: w = l===0?0 : w*((1-o.fill)*2.2+0.04); break;
        case ARC:   w*= l===0?1.25:0.8; break;
        case TOWER: w*= l===0?o.towerGround:1; break;
        case DOME:  w*= l===h-1?1.7:0.35; break;
        case KIOSK: w*= l>=h-1?1.6:0.3; break;
        case STAIR: w*= l===0?0.45:6; break;
        case COURT: w*= edgeCell?0.7:1.5; break;
        case IWAN: case GATE: w/=4; break;
        case BED:   w*= l===0?0.6:1.4; break;   // bedrooms mostly upstairs
        case PRIVY: w*= edgeCell?1.6:0.4; if(o.fit==='modern') w=0; break;   // at the back of the plot, and only before plumbing
        case BATH:  if(o.fit!=='modern') w=0; break;
      }
      if(o.locks&&o.locks[i]&&(o.locks[i]&(1<<v))) w=Math.max(w,0.05);   // a pinned module is always allowed, whatever its weight
      if(o.prev && o.prev[i]===v) w=w*o.stick+0.02;
      WT[i*NV+v]=w;
    }
  }
  return WT;
}

function solveWFC(o){
  const t0=(typeof performance!=='undefined'?performance:Date).now();
  const {nx,nz,nc,ncell:NCELL}=useGrid(o), NB=nbTable();
  const WT=cellWeights(o);
  let lastFail='';
  for(let attempt=0; attempt<5; attempt++){
    const rng=RNG(o.seed+'|wfc|'+attempt);
    const dom=new Uint32Array(NCELL);
    // ---- initial domains from plot, levels, plot edge and locks
    for(let i=0;i<NCELL;i++){
      const [x,z,l]=cellXZL(i), h=o.heights[x+z*nx];
      let m=o.noStair? ALLV&~TYPEMASK[STAIR] : ALLV;
      if(h===0||l>=h) m=TYPEMASK[EMPTY];
      else{
        if(l===0) m&=~(TYPEMASK[EMPTY]|TYPEMASK[KIOSK]);
        else m&=~(TYPEMASK[COURT]|TYPEMASK[GATE]|TYPEMASK[PRIVY]);
        for(let d=0;d<4;d++) if(NB[i*6+d]<0) m&=EDGEM[d];
      }
      if(o.locks && o.locks[i]) m&=o.locks[i];
      if(!m) return {ok:false, reason:`${cellName(x,z)} on level ${l+1} has no module that fits its lock and position.`};
      dom[i]=m;
    }
    const propagate=(q)=>{
      while(q.length){
        const i=q.pop(), di=dom[i];
        for(let d=0;d<6;d++){
          const j=NB[i*6+d]; if(j<0) continue;
          let allow=0, m=di;
          while(m){ const b=m&-m; allow|=CM[(31-Math.clz32(b))*6+d]; m^=b; }
          const nj=dom[j]&allow;
          if(nj!==dom[j]){ if(!nj) return false; dom[j]=nj; q.push(j); }
        }
      }
      return true;
    };
    const all=[]; for(let i=0;i<NCELL;i++) all.push(i);
    if(!propagate(all)){ lastFail='The plot, locks and module rules contradict each other before any choice is made.'; if(o.locks&&o.locks.some(Boolean)) return {ok:false,reason:lastFail}; continue; }

    // ---- guarantee a stair core where there is more than one storey
    if(o.ensureStair){
      const cands=[];
      for(let c=0;c<nc;c++) if(o.heights[c]>=2 && (dom[c]&TYPEMASK[STAIR])) cands.push(c);
      const hasStair=[...Array(nc).keys()].some(c=>dom[c]===TYPEMASK[STAIR]);
      const inner=c=>{ const x=c%nx, z=(c/nx)|0; return x>0&&z>0&&x<nx-1&&z<nz-1; };
      if(cands.length && !hasStair){
        cands.sort((a,b)=>(inner(a)-inner(b))||(o.heights[b]-o.heights[a])||(rng.f()-0.5));
        for(const c of cands){
          const snap=dom.slice(); dom[c]=TYPEMASK[STAIR];
          if(propagate([c])) break; dom.set(snap);
        }
      }
    }

    const trace=[]; const snapT=(ev,cell)=>{ if(trace.length<1600) trace.push({d:dom.slice(),ev,cell}); };
    snapT('init',-1);
    const stack=[]; let steps=0, backs=0, failed=false;
    for(;;){
      let best=-1, bestH=Infinity;
      for(let i=0;i<NCELL;i++){
        const m=dom[i]; if((m&(m-1))===0) continue;
        let sw=0, swl=0, mm=m;
        while(mm){ const b=mm&-mm; const v=31-Math.clz32(b); const w=WT[i*NV+v]; if(w>0){ sw+=w; swl+=w*Math.log(w); } mm^=b; }
        const H=(sw>0? Math.log(sw)-swl/sw : 0)+rng.f()*1e-3;
        if(H<bestH){ bestH=H; best=i; }
      }
      if(best<0) break;
      // weighted choice
      const m=dom[best]; let sw=0, mm=m;
      while(mm){ const b=mm&-mm; sw+=WT[best*NV+(31-Math.clz32(b))]; mm^=b; }
      let pickV=-1;
      if(sw>0){ let r=rng.f()*sw; mm=m; while(mm){ const b=mm&-mm; const v=31-Math.clz32(b); r-=WT[best*NV+v]; if(r<=0){ pickV=v; break; } mm^=b; } if(pickV<0) pickV=31-Math.clz32(m); }
      else{ const n=popc(m); let k=Math.floor(rng.f()*n); mm=m; while(mm){ const b=mm&-mm; if(k--===0){ pickV=31-Math.clz32(b); break; } mm^=b; } }
      stack.push({i:best, v:pickV, snap:dom.slice()});
      dom[best]=1<<pickV; steps++;
      let ok=propagate([best]); snapT('collapse',best);
      while(!ok){
        if(!stack.length){ failed=true; break; }
        const fr=stack.pop(); dom.set(fr.snap); dom[fr.i]&=~(1<<fr.v); backs++;
        if(dom[fr.i]) ok=propagate([fr.i]);
        snapT('backtrack',fr.i);
      }
      if(failed||steps>4000){ failed=true; break; }
    }
    if(failed){ lastFail='The solver exhausted every branch. Loosen locks or raise more of the plot.'; if(o.locks&&o.locks.some(Boolean)) continue; continue; }
    const types=new Uint8Array(NCELL), rots=new Uint8Array(NCELL), vars=new Uint8Array(NCELL);
    for(let i=0;i<NCELL;i++){ const v=lowbit(dom[i]); vars[i]=v; types[i]=VARS[v].t; rots[i]=VARS[v].r; }
    const ms=(typeof performance!=='undefined'?performance:Date).now()-t0;
    return {ok:true, types, rots, vars, trace, steps, backs, attempt, ms, nx, nz};
  }
  return {ok:false, reason:lastFail||'No arrangement satisfies the rules for this plot.'};
}

/* ============================================================
   STAIR GUARANTEE — any building taller than one storey gets a stair core
   that climbs to its highest occupied storey (and at most one storey past it,
   for roof access). Repairs by pinning a stair column and re-solving with
   stickiness, so the rest of the design stays put.
   ============================================================ */
const HABT=t=>{ t=BASE_T(t); return t===ROOM||t===DOME||t===IWAN||t===ARC||t===KIOSK||t===GATE; };
function stairStats(types){
  const {nc,ncell:NCELL}=GRID;
  let L=0; for(let i=nc;i<NCELL;i++) if(HABT(types[i])) L=Math.max(L,(i/nc)|0);
  const stacks=[]; for(let c=0;c<nc;c++){ let n=0; while(n<4&&types[c+n*nc]===STAIR) n++; if(n) stacks.push([c,n]); }
  return {L, stacks, reach:stacks.reduce((m,s)=>Math.max(m,s[1]),0)};
}
function solveWithStairs(o){
  const {nx,nz,nc,ncell:NCELL}=useGrid(o);
  const mode=o.stairMode||'inside';
  if(mode==='outside'){ // no stair modules at all: flights climb the outside walls instead.
    // Not every arrangement leaves a roof terrace beside each upper wall, so try a short seeded series of variants.
    // Later tries thin the upper storeys a little, so the building steps back into terraces a flight can stand on.
    for(let k=0;k<24;k++){ const sd=k? o.seed+'|os'+k : o.seed, fill=k<4? o.fill : Math.max(0.3,(o.fill==null?0.72:o.fill)-0.03*(k-3));
      const ro=solveWFC(Object.assign({},o,{seed:sd,fill,heights:o.heights.slice(),ensureStair:false,noStair:true,prev:k?null:o.prev}));
      if(!ro.ok){ if(o.locks&&o.locks.some(Boolean)) break; continue; }
      const pl=planOutStairs(ro,o.style||STYLE.isfahani,o.seed,'outside');
      if(pl.ok){ ro.heights=o.heights.slice(); ro.outStairs=pl.flights; ro.stairNote=''; ro.stairWarn=''; ro.variant=k; return ro; } }
    const ri=solveWithStairs(Object.assign({},o,{stairMode:'inside'}));
    if(ri.ok) ri.stairNote='No outside wall could carry a stair to the top storey, so this building uses an inside stair core.';
    return ri; }
  const heights=o.heights.slice(), userLocks=o.locks||new Array(NCELL).fill(0), locks=userLocks.slice();
  const base=Object.assign({},o,{heights,locks});
  let res=solveWFC(base); if(!res.ok) return res;
  let note='', warn='', added=-1;
  for(let it=0;it<8;it++){
    const {L,stacks,reach}=stairStats(res.types);
    const cap=Math.max(L+1,1), over=stacks.filter(s=>s[1]>cap);
    if((L===0||reach>=L)&&!over.length) break;
    let changed=false;
    if(over.length) for(let c=0;c<nc;c++) for(let l=cap;l<4;l++){ const i=c+l*nc; if(!userLocks[i]&&locks[i]!==(ALLV&~TYPEMASK[STAIR])){ locks[i]=ALLV&~TYPEMASK[STAIR]; changed=true; } }
    if(L>0&&reach<L){
      const hab=new Set(), top=new Set();
      for(let i=nc;i<NCELL;i++) if(HABT(res.types[i])){ hab.add(i%nc); if(((i/nc)|0)===L) top.add(i%nc); }
      const lockOK=c=>{ for(let l=0;l<L;l++){ const lk=userLocks[c+l*nc]; if(lk&&!(lk&TYPEMASK[STAIR])) return false; } return true; };
      const adj=(c,set)=>{ const x=c%nx, z=(c/nx)|0; let n=0; for(const [dx,dz] of DIRS){ const ax=x+dx, az=z+dz; if(ax>=0&&ax<nx&&az>=0&&az<nz&&set.has(ax+az*nx)) n++; } return n; };
      const inner=c=>{ const x=c%nx, z=(c/nx)|0; return x>0&&z>0&&x<nx-1&&z<nz-1; };
      let best=-1, bs=-1e9;
      for(let c=0;c<nc;c++){ if(heights[c]<L||top.has(c)||!lockOK(c)) continue;
        let sc=adj(c,top)*3+adj(c,hab)+(stacks.some(s=>s[0]===c)?6:0)-(inner(c)?1.5:0)-(BASE_T(res.types[c])===COURT?3:0)+(c*0.37%1)*0.1;
        for(let l=0;l<L;l++){ const t=BASE_T(res.types[c+l*nc]); if(t!==EMPTY&&t!==COURT&&t!==TOWER) sc+=0.5; }
        if(sc>bs){ bs=sc; best=c; } }
      if(best<0){ bs=-1e9;
        for(let c=0;c<nc;c++){ if(heights[c]!==0||!lockOK(c)||!adj(c,new Set([...hab,...[...Array(nc).keys()].filter(k=>heights[k]>0)]))) continue;
          const sc=adj(c,top)*3+adj(c,hab)-(inner(c)?1:0); if(sc>bs){ bs=sc; best=c; } }
        if(best>=0){ heights[best]=L; added=best; note=`Added a stair core at ${cellName(best%nx,(best/nx)|0)} so every storey can be reached.`; } }
      if(best<0){ warn='No square of the plot can hold a stair core for these storeys. Raise a square next to the building.'; break; }
      for(let l=0;l<L;l++) locks[best+l*nc]=TYPEMASK[STAIR];
      changed=true;
    }
    if(!changed) break;
    const r2=solveWFC(Object.assign({},base,{heights,locks,prev:res.vars,stick:8,ensureStair:false}));
    if(!r2.ok){ warn='The stair core conflicts with pinned modules. Unpin a module beside it.'; break; }
    res=r2;
  }
  { // deterministic trim: freeze everything else, remove only stair storeys past the cap
    const {L,stacks}=stairStats(res.types), cap=Math.max(L+1,1);
    if(stacks.some(q=>q[1]>cap)){
      const fl=userLocks.slice();
      for(let i=0;i<NCELL;i++){ if(fl[i]) continue; const l=(i/nc)|0; fl[i]= (res.types[i]===STAIR&&l>=cap)? (ALLV&~TYPEMASK[STAIR]) : (res.types[i]===EMPTY&&l>=cap)? TYPEMASK[EMPTY] : (1<<res.vars[i]); }
      for(const [c,n] of stacks) if(n>cap) for(let l=cap;l<4;l++){ const i=c+l*nc; if(!userLocks[i]) fl[i]=TYPEMASK[EMPTY]; }
      const r3=solveWFC(Object.assign({},base,{heights,locks:fl,ensureStair:false})); if(r3.ok) res=r3; }
    const fin=stairStats(res.types);
    if(fin.L>0&&fin.reach<fin.L&&!warn) warn='Could not route a stair to every storey. Raise a square next to the building.';
    if(added>=0){ let n=0; while(n<4&&res.types[added+n*nc]!==EMPTY) n++; heights[added]=Math.max(1,n); }
  }
  res.heights=heights; res.stairNote=note; res.stairWarn=warn;
  // 'both': the inside core stays, and flights also climb the outside where a wall allows
  res.outStairs= mode==='both'? planOutStairs(res,o.style||STYLE.isfahani,o.seed,'both').flights : [];
  return res;
}
