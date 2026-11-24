/* ============================================================
   RUINS — ten ancient sites.
   A ruin is first laid out and built as the living building was, then every primitive the builder is asked for passes
   through a decay filter. An envelope height field says how much fabric still stands at each point of the plot: each
   module's column gets its own survival, towers keep most of their height, a few landmarks (a corner, a column group
   with its architrave) stand to full height, and value noise breaks it all up. Walls are cut along a stepped skyline
   that follows the masonry courses; a window or door survives only while its lintel does, otherwise it opens into a
   notch. Columns break at a drum joint, domes split into broken sectors, roofs, timber, doors and glass are gone entirely.
   The calls are queued and decayed from the ground up against a support field, so nothing survives in the air: an upper
   wall, column, beam, floor or cornice stays only where something below still carries it. The cut calls are what is
   recorded, so the lower levels of detail are ruins too. Colliders are cut to what stands, and fallen masonry lies at
   the foot of walls.
   ============================================================ */

/* ---------- value noise ---------- */
function rHash(ix,iz,s){ let h=Math.imul(ix|0,374761393)+Math.imul(iz|0,668265263)+Math.imul(s|0,982451653)|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; }
function vNoise(x,z,s){ const ix=Math.floor(x), iz=Math.floor(z), fx=x-ix, fz=z-iz, u=fx*fx*(3-2*fx), v=fz*fz*(3-2*fz);
  const a=rHash(ix,iz,s), b=rHash(ix+1,iz,s), c=rHash(ix,iz+1,s), d=rHash(ix+1,iz+1,s); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm2(x,z,s){ return 0.58*vNoise(x,z,s)+0.29*vNoise(x*2.13+5.1,z*2.13+1.7,s+7)+0.13*vNoise(x*4.37+2.3,z*4.37+9.2,s+13); }
const smoothT=(a,b,t)=>{ const k=clamp((t-a)/(b-a),0,1); return k*k*(3-2*k); };

// what is alive (or water) is never cut; what rots, burns or is carried off is always gone
const RUIN_ALIVE=new Set(['leaf','leaf2','trunk','olive','blossom','maple','bamboo','grass','moss','hedge','birch','water','fruit','root','fern','vine','sand','lichen','reed','palmleaf','wool','aloe']);
const RUIN_GONE=new Set(['wood','paint','paint2','door','glass','lattice','screen','paper','fabric','lantern','glow','qamar','stained','carpet','rug','flags','thatch','roofTile','lacquer',
  'cushion','cushion2','linen','mat','tatami','ondol','void','chim','gablep','iron','metal','gold','lead','canvasP','floorb','porcelain','blueware','black']);

/* ---------- the envelope ----------
   c: {NX,NZ,H,CW,parH,cellAt(x,z,l),towerTop(x,z)->[height,half] or null, seed} */
function makeRuin(st,c){
  const R=Object.assign({base:0.6, spread:0.35, upper:0.4, collapse:0.12, tower:[0.6,0.95], spikes:2, spikeR:[1.0,2.0], noise:0.7, lam:2.6, q:0.3, seg:[0.4,1.0], jag:0.6,
    smooth:false, floor:0.45, court:0.5, drum:0, margin:0.12, keep:[], drop:[], slab:0.25, debris:1, rubble:'block', corner:0, cornerUp:0, over:0, floorLoss:0, colKeep:0}, st.ruin||{});
  const rng=RNG(c.seed+'|ruin'), sd=(rng.f()*1e6)|0, NX=c.NX, NZ=c.NZ, H=c.H, CW=c.CW;
  const tall=t=>isMass(t)||t===KIOSK;
  const hc=new Float32Array(NX*NZ), mass=new Uint8Array(NX*NZ), colTop=new Float32Array(NX*NZ), towers=[], spikes=[];
  for(let z=0;z<NZ;z++) for(let x=0;x<NX;x++){ const i=x+z*NX, t0=c.cellAt(x,z,0); let n=0; while(n<4&&tall(c.cellAt(x,z,n))) n++;
    const cx=(x-(NX-1)/2)*CW, cz=(z-(NZ-1)/2)*CW;
    if(t0===TOWER){ const tt=c.towerTop(x,z); if(tt){ towers.push({x:cx+tt[2],z:cz+tt[3],r:tt[1]+0.45,h:tt[0]*rng.range(R.tower[0],R.tower[1])}); } continue; }
    if(!n) continue;
    mass[i]=1; colTop[i]=n*H+c.parH;
    let top=H*clamp(R.base+R.spread*(rng.f()*2-1),0.1,1.0);
    if(n>1&&top>H*0.8) top+=(n-1)*H*R.upper*Math.pow(rng.f(),0.7);
    if(rng.chance(R.collapse)) top=rng.range(R.floor,1.0);
    hc[i]=top>=n*H-0.05? colTop[i]+R.over : top; }
  // open squares take the height of the masonry beside them, so an outer wall carries its own room's survival
  for(let z=0;z<NZ;z++) for(let x=0;x<NX;x++){ const i=x+z*NX; if(mass[i]) continue; let s=0, k=0;
    for(const [dx,dz] of DIRS){ const a=x+dx, b=z+dz; if(a<0||b<0||a>=NX||b>=NZ) continue; const j=a+b*NX; if(mass[j]){ s+=hc[j]; k++; } }
    hc[i]= k? s/k : R.court; }
  const fIdx=v=>v;
  const sample=(i,j)=>hc[clamp(i,0,NX-1)+clamp(j,0,NZ-1)*NX];
  // standing landmarks: corners and column runs that kept their full height
  const massCells=[]; for(let i=0;i<NX*NZ;i++) if(mass[i]) massCells.push(i);
  for(let k=0;k<R.spikes&&massCells.length;k++){ const i=massCells[rng.int(0,massCells.length-1)], x=i%NX, z=(i/NX)|0, cx=(x-(NX-1)/2)*CW, cz=(z-(NZ-1)/2)*CW;
    const corner=rng.chance(0.55), px=cx+(corner? rng.pick([-1,1])*CW/2 : rng.range(-0.4,0.4)*CW), pz=cz+(corner? rng.pick([-1,1])*CW/2 : rng.pick([-1,1])*CW/2);
    spikes.push({x:px,z:pz,r:rng.range(R.spikeR[0],R.spikeR[1]),h:colTop[i]+0.05+R.over}); }
  // upturned corners (Nan Madol): the outer corners of the enclosure rise
  if(R.cornerUp) for(let i=0;i<NX*NZ;i++) if(mass[i]){ const x=i%NX, z=(i/NX)|0, cx=(x-(NX-1)/2)*CW, cz=(z-(NZ-1)/2)*CW;
    for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){ const nx=x+sx, nz=z+sz; const outX=nx<0||nx>=NX||!mass[nx+z*NX], outZ=nz<0||nz>=NZ||!mass[x+nz*NX]; if(outX&&outZ) spikes.push({x:cx+sx*CW/2,z:cz+sz*CW/2,r:1.6,h:Math.min(colTop[i],hc[i]+R.cornerUp),soft:true}); } }
  void fIdx;
  const env=(x,z)=>{
    const fx=x/CW+(NX-1)/2, fz=z/CW+(NZ-1)/2, i0=Math.floor(fx), j0=Math.floor(fz), tx=smoothT(0.18,0.82,fx-i0), tz=smoothT(0.18,0.82,fz-j0);
    const a=sample(i0,j0), b=sample(i0+1,j0), cc=sample(i0,j0+1), d=sample(i0+1,j0+1);
    let h=(a*(1-tx)+b*tx)*(1-tz)+(cc*(1-tx)+d*tx)*tz;
    h-=R.noise*fbm2(x/R.lam,z/R.lam,sd);
    for(const s of spikes){ const dd=Math.hypot(x-s.x,z-s.z); if(dd<s.r){ const k=s.soft? 1-dd/s.r : smoothT(1,0.45,dd/s.r); h=Math.max(h,lerp(h,s.h,k)); } }
    for(const t of towers) if(Math.abs(x-t.x)<t.r&&Math.abs(z-t.z)<t.r) h=Math.max(h,t.h);
    return Math.max(h,R.floor); };
  R.env=env; R.sd=sd; R.H=H; R.CW=CW; R.NX=NX; R.NZ=NZ;
  R.keepS=new Set(R.keep); R.dropS=new Set(R.drop);
  R.walls=[]; R.runs=[]; R.wallHash=new Map(); R.debrisReq=[]; R.holes=[]; R.notches=[]; R.spikesL=spikes; R.towersL=towers;
  R.Q=[]; R.slabs=new Map(); rSupInit(R);
  if(globalThis.RUIN_DBG){ R.dbg=[]; globalThis.LAST_RUIN=R; }
  return R;
}

/* ---------- support ----------
   Nothing in a ruin hangs in the air. The building's calls are queued, then decayed from the ground up; whatever survives
   is written into a support height field (the top of standing fabric over each 25 cm square). A piece above the ground
   keeps only the parts that rest on something already standing: upper walls stop where the wall or floor under them has
   gone, columns need a drum or a floor under their base, beams need a pier at one end at least, floors need a wall to
   bear on, and small things (cornices, frames, finials) need masonry within a hand's breadth. */
const SUP_G=0.25;
function rSupInit(R){ const ext=Math.max(R.NX,R.NZ)*R.CW/2+30; R.supE=ext; R.supN=Math.ceil(2*ext/SUP_G); R.sup=new Float32Array(R.supN*R.supN); R.veg=new Float32Array(R.supN*R.supN); }
function rSupRange(R,x0,z0,x1,z1,shrink){ const N=R.supN, E=R.supE;
  if(shrink){ const sx=Math.min(shrink,(x1-x0)/2-1e-3), sz=Math.min(shrink,(z1-z0)/2-1e-3); if(sx>0){ x0+=sx; x1-=sx; } if(sz>0){ z0+=sz; z1-=sz; } }
  return [clamp(Math.floor((x0+E)/SUP_G),0,N-1),clamp(Math.floor((z0+E)/SUP_G),0,N-1),clamp(Math.floor((x1+E)/SUP_G),0,N-1),clamp(Math.floor((z1+E)/SUP_G),0,N-1)]; }
function rSupMax(R,x0,z0,x1,z1,F){   // over the squares whose centres fall inside (the nearest one if none do)
  const N=R.supN, E=R.supE, S=F||R.sup, c=v=>clamp(v,0,N-1); let i0=Math.ceil((x0+E)/SUP_G-0.5), i1=Math.floor((x1+E)/SUP_G-0.5), j0=Math.ceil((z0+E)/SUP_G-0.5), j1=Math.floor((z1+E)/SUP_G-0.5);
  if(i1<i0) i0=i1=Math.round(((x0+x1)/2+E)/SUP_G-0.5); if(j1<j0) j0=j1=Math.round(((z0+z1)/2+E)/SUP_G-0.5); i0=c(i0); i1=c(i1); j0=c(j0); j1=c(j1); let m=0;
  for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){ const v=S[i+j*N]; if(v>m) m=v; } return m; }
// while the building decays, what a piece writes only holds up pieces whose foot is at least 10 cm higher than its own:
// a stone carries the course above it, never its neighbour in the same course
function rSupPut(R,x0,z0,x1,z1,top,F){ if(R.pend){ R.pend.push([x0,z0,x1,z1,top,F,R._yb]); return; } rSupWrite(R,x0,z0,x1,z1,top,F); }
function rSupWrite(R,x0,z0,x1,z1,top,F){ if(R.dbg&&!F) R.dbg.push([x0,z0,x1,z1,top,R._tag]); const [i0,j0,i1,j1]=rSupRange(R,x0,z0,x1,z1,0.07), N=R.supN, S=F||R.sup;
  for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){ const k=i+j*N; if(S[k]<top) S[k]=top; } }
// something under (or within pad of) a box reaches its foot
const rSupOK=(R,b,pad,tol)=>b[1]<=0.3||rSupMax(R,b[0]-pad,b[2]-pad,b[3]+pad,b[5]+pad)>=b[1]-(tol==null?0.12:tol);
// a long lying piece (a beam, a moulding, a log): it needs a bearing at both ends, or under half its length; one end is enough only for a short overhang
function rSupLong(R,b,tol){ const alongX=b[3]-b[0]>=b[5]-b[2], L=alongX?b[3]-b[0]:b[5]-b[2], n=Math.max(2,Math.round(L/SUP_G)), f=[];
  for(let i=0;i<n;i++){ const s0=(alongX?b[0]:b[2])+L*i/n, s1=s0+L/n, q=alongX?[s0,b[2],s1,b[5]]:[b[0],s0,b[3],s1]; f.push(rSupMax(R,q[0],q[1],q[2],q[3])>=b[1]-tol); }
  const k=Math.max(1,Math.round(n*0.3)), a=f.slice(0,k).some(Boolean), z=f.slice(n-k).some(Boolean), cov=f.filter(Boolean).length/n;
  return cov>=0.5||(a&&z)||((a||z)&&L<=1.3); }
// a wall in a vertical frame: the stretches of its foot (u ranges) with nothing standing under them
function rSupGaps(R,uA,uB,W,yb){ const o=[]; if(yb<=0.3) return o; const n=Math.max(1,Math.round((uB-uA)/SUP_G)); let g=null;
  for(let i=0;i<n;i++){ const ua=uA+(uB-uA)*i/n, ub=uA+(uB-uA)*(i+1)/n, [x,z]=W((ua+ub)/2), ok=rSupMax(R,x-0.13,z-0.13,x+0.13,z+0.13)>=yb-0.12;
    if(!ok){ if(g) g[1]=ub; else o.push(g=[ua,ub]); } else g=null; }
  return o; }
function rSupWall(R,M,segs,vA,depth,toY){ const yb=toY(vA);
  for(const s of segs){ const top=toY((s.ha+s.hb)/2); if(top<=yb+0.03) continue; const b=rWorldBox(M,s.a,0,0,s.b,0,depth); rSupPut(R,b[0],b[2],b[3],b[5],top); } }
// trees hold up their own crowns (a field of their own) but never masonry; water, sand and small plants hold up nothing
const RUIN_TREE=new Set(['leaf','leaf2','trunk','olive','blossom','maple','bamboo','birch','palmleaf','fruit']);
const RUIN_NOSUP=new Set(['water','grass','moss','fern','vine','root','lichen','reed','sand','wool','aloe','hedge']);

// the world box of one builder call
function rCallBox(m,a){
  const I=null;
  switch(m){
    case 'box': return rWorldBox(a[7]||I,a[1],a[2],a[3],a[4],a[5],a[6]);
    case 'cyl': case 'cone': { const cone=m==='cone', M=cone?a[4]:a[5], r=cone?a[1]:Math.max(a[1],a[2]), h=cone?a[2]:a[3]; return rWorldBox(M||I,-r,0,-r,r,h,r); }
    case 'segCyl': { const p0=a[1], p1=a[2], rr=Math.max(a[3],a[4]); return [Math.min(p0.x,p1.x)-rr,Math.min(p0.y,p1.y)-rr,Math.min(p0.z,p1.z)-rr,Math.max(p0.x,p1.x)+rr,Math.max(p0.y,p1.y)+rr,Math.max(p0.z,p1.z)+rr]; }
    case 'lathe': case 'latheArc': { let r=0, y0=1e9, y1=-1e9; for(const p of a[1]){ r=Math.max(r,p[0]); y0=Math.min(y0,p[1]); y1=Math.max(y1,p[1]); } return rWorldBox(a[3]||I,-r,y0,-r,r,y1,r); }
    case 'sphere': case 'ico': { const r=a[1]; return rWorldBox(a[2]||I,-r,-r,-r,r,r,r); }
    case 'torus': { const s=a[1]+a[2]; return rWorldBox(a[4]||I,-s,-s,-s,s,s,s); }
    case 'ext': { const bb=rBB(a[1]); return rWorldBox(a[4]||I,bb[0],bb[2],0,bb[1],bb[3],a[3]); }
    case 'flat': { const P=[]; for(const p of a[1]) P.push(p[0],p[1],0); return rPtsBox(P,a[2]); }
    case 'raw': return rPtsBox(a[1],a[3]);
    case 'rawN': return rPtsBox(a[1],a[4]);
    case 'grid': { const P=[]; for(const row of a[2]) for(const v of row) P.push(v.p[0],v.p[1],v.p[2]); return rPtsBox(P,a[4]); }
  }
  return [0,0,0,0,0,0]; }

/* decay everything queued, lowest first, each piece against what already stands under it */
function ruinFlush(B,R){
  const Q=R.Q; R.Q=[];
  // lowest first; at one height the load-bearing pieces before what hangs on them; facing layers once their wall is up
  const items=Q.map((q,i)=>{ const b=rCallBox(q[0],q[1]); let pri=1, y=b[1];
    if(q[0]==='ext'){ const e=q[1][4]&&q[1][4].elements; if(e&&Math.abs(e[1])<1e-3&&Math.abs(e[9])<1e-3){ if(q[1][3]>=0.12) pri=0; else { y=b[4]; pri=2; } } }
    else if(q[0]==='flat'){ y=b[4]; pri=2; }
    else if(q[0]==='box'||q[0]==='cyl'){ const th=Math.min(b[3]-b[0],b[5]-b[2]); if(th>=0.22&&b[4]-b[1]>=0.22) pri=0; else if(q[0]==='box'&&th<0.12&&b[4]-b[1]>0.3){ y=b[4]; pri=2; } }
    return {q,i,b,key:Math.round(y*10)*4+pri}; });
  items.sort((p,q)=>p.key-q.key||p.i-q.i);
  const jit0=B.jit, walk0=B.walkOn;
  R.pend=[]; let pc=0; const commit=y=>{ const P=R.pend; while(pc<P.length&&P[pc][6]<=y){ const p=P[pc++]; rSupWrite(R,p[0],p[1],p[2],p[3],p[4],p[5]); } };
  for(const it of items){ const [m,a,jit,walk,grp]=it.q; B.grp=grp||null;
    commit((it.key>>2)/10-0.1); R._yb=it.b[1];
    R._h=0; if(R.dbg) R._tag=m+':'+a[0]+':'+it.b.map(v=>v.toFixed(2)).join(','); let r=ruinCut(R,m,a); if(r===true) r=[[m,a]];
    if(!R._h){ const o=[];
      for(const c of r){ const b=c[1]===a? it.b : rCallBox(c[0],c[1]), k=c[1][0], hgt=b[4]-b[1], wd=Math.max(b[3]-b[0],b[5]-b[2]);
        if(RUIN_TREE.has(k)){ const p=1.2; if(b[1]>0.3&&Math.max(rSupMax(R,b[0]-p,b[2]-p,b[3]+p,b[5]+p),rSupMax(R,b[0]-p,b[2]-p,b[3]+p,b[5]+p,R.veg))<b[1]-0.12) continue;
          o.push(c); rSupPut(R,b[0],b[2],b[3],b[5],b[4],R.veg); continue; }
        // tall things (columns, piers) must stand on something; long ones rest on what is under them; small ones may hang on a wall
        const pad=(hgt>1.2&&hgt>1.5*wd)? 0.04 : wd>0.8? 0.02 : 0.3;
        if(b[1]>0.3&&wd>1.2&&hgt<wd&&!rSupLong(R,b,0.12)) continue;
        if(!rSupOK(R,b,pad)) continue;
        o.push(c); if(!RUIN_NOSUP.has(k)) rSupPut(R,b[0],b[2],b[3],b[5],b[4]); }
      r=o; }
    if(!r.length) continue;
    B.jit=jit; B.walkOn=walk; B._rk=1; try{ for(const [m2,a2] of r) B[m2](...a2); } finally{ B._rk=0; } }
  commit(1e9); R.pend=null;
  B.jit=jit0; B.walkOn=walk0; B.grp=null;
}

/* ---------- small geometry helpers ---------- */
function rWorldBox(M,x0,y0,z0,x1,y1,z1){ if(!M) return [Math.min(x0,x1),Math.min(y0,y1),Math.min(z0,z1),Math.max(x0,x1),Math.max(y0,y1),Math.max(z0,z1)];
  const e=M.elements, o=[1e9,1e9,1e9,-1e9,-1e9,-1e9];
  for(const x of [x0,x1]) for(const y of [y0,y1]) for(const z of [z0,z1]){ const X=e[0]*x+e[4]*y+e[8]*z+e[12], Y=e[1]*x+e[5]*y+e[9]*z+e[13], Z=e[2]*x+e[6]*y+e[10]*z+e[14];
    if(X<o[0]) o[0]=X; if(Y<o[1]) o[1]=Y; if(Z<o[2]) o[2]=Z; if(X>o[3]) o[3]=X; if(Y>o[4]) o[4]=Y; if(Z>o[5]) o[5]=Z; }
  return o; }
function rPtsBox(pos,M){ const o=[1e9,1e9,1e9,-1e9,-1e9,-1e9], e=M&&M.elements;
  for(let i=0;i+2<pos.length;i+=3){ let x=pos[i], y=pos[i+1], z=pos[i+2]; if(e){ const X=e[0]*x+e[4]*y+e[8]*z+e[12], Y=e[1]*x+e[5]*y+e[9]*z+e[13], Z=e[2]*x+e[6]*y+e[10]*z+e[14]; x=X; y=Y; z=Z; }
    if(x<o[0]) o[0]=x; if(y<o[1]) o[1]=y; if(z<o[2]) o[2]=z; if(x>o[3]) o[3]=x; if(y>o[4]) o[4]=y; if(z>o[5]) o[5]=z; }
  return o; }
// lowest envelope over a footprint
function rEnvMin(R,b,pad){ pad=pad||0; const x0=b[0]-pad, x1=b[3]+pad, z0=b[2]-pad, z1=b[5]+pad, nx=Math.max(1,Math.min(6,Math.ceil((x1-x0)/1.2))), nz=Math.max(1,Math.min(6,Math.ceil((z1-z0)/1.2)));
  let m=1e9; for(let i=0;i<=nx;i++) for(let j=0;j<=nz;j++){ const v=R.env(x0+(x1-x0)*i/nx,z0+(z1-z0)*j/nz); if(v<m) m=v; } return m; }
const rAxis=e=>{ for(const i of [0,1,2,4,5,6,8,9,10]){ const a=Math.abs(e[i]); if(a>1e-4&&Math.abs(a-1)>1e-4) return false; } return true; };
const rYonly=e=>Math.abs(e[1])<1e-4&&Math.abs(e[9])<1e-4&&Math.abs(e[4])<1e-4&&Math.abs(e[6])<1e-4&&e[5]>0.5;
// Sutherland–Hodgman against one half-plane a*u+b*v <= c
function rClipHalf(P,a,b,c){ const o=[]; for(let i=0;i<P.length;i++){ const p=P[i], q=P[(i+1)%P.length], dp=a*p[0]+b*p[1]-c, dq=a*q[0]+b*q[1]-c;
  if(dp<=0) o.push(p); if((dp<0&&dq>0)||(dp>0&&dq<0)){ const t=dp/(dp-dq); o.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]); } } return o; }
const rArea=P=>{ let s=0; for(let i=0;i<P.length;i++){ const p=P[i], q=P[(i+1)%P.length]; s+=p[0]*q[1]-q[0]*p[1]; } return s/2; };
const rBB=P=>{ let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9; for(const p of P){ if(p[0]<u0) u0=p[0]; if(p[0]>u1) u1=p[0]; if(p[1]<v0) v0=p[1]; if(p[1]>v1) v1=p[1]; } return [u0,u1,v0,v1]; };
const rQ=(R,y)=>R.q>0? Math.floor(y/R.q+1e-6)*R.q : y;
function rWallHashAdd(R,rec){ const k0=Math.floor(rec.b[0]), k1=Math.floor(rec.b[3]), j0=Math.floor(rec.b[2]), j1=Math.floor(rec.b[5]);
  for(let i=k0;i<=k1;i++) for(let j=j0;j<=j1;j++){ const k=i*4096+j; if(!R.wallHash.has(k)) R.wallHash.set(k,[]); R.wallHash.get(k).push(rec); } }

/* ---------- the stepped skyline a wall is cut along (local u along the wall, v up) ---------- */
function rProfile(R,uA,uB,vB,W,toV,key,eps){
  const rng=RNG(key), segs=[]; let u=uA;
  const hAt=(uu,jit)=>{ const [x,z]=W(uu); return toV(rQ(R,R.env(x,z)-R.jag*Math.pow(jit,1.6))+eps); };
  if(R.smooth){ let prev=hAt(uA,rng.f()); while(u<uB-1e-6){ const w=Math.min(uB-u,rng.range(R.seg[0],R.seg[1])), b=(uB-u-w<0.2)?uB:u+w, h=hAt(b,rng.f()); segs.push({a:u,b,ha:Math.min(prev,vB),hb:Math.min(h,vB)}); prev=h; u=b; } }
  else while(u<uB-1e-6){ const w=Math.min(uB-u,rng.range(R.seg[0],R.seg[1])), b=(uB-u-w<0.2)?uB:u+w, h=Math.min(hAt((u+b)/2,rng.f()),vB); segs.push({a:u,b,ha:h,hb:h}); u=b; }
  return segs; }
function rProfMin(segs,a,b){ let m=1e9; for(const s of segs){ if(s.b<=a||s.a>=b) continue; const ta=clamp((a-s.a)/(s.b-s.a),0,1), tb=clamp((b-s.a)/(s.b-s.a),0,1); m=Math.min(m,lerp(s.ha,s.hb,ta),lerp(s.ha,s.hb,tb)); } return m; }
function rLower(segs,a,b,c){ const o=[]; for(const s of segs){ const cuts=[s.a]; if(a>s.a&&a<s.b) cuts.push(a); if(b>s.a&&b<s.b) cuts.push(b); cuts.push(s.b);
    for(let i=0;i+1<cuts.length;i++){ const p=cuts[i], q=cuts[i+1], hp=lerp(s.ha,s.hb,(p-s.a)/(s.b-s.a)), hq=lerp(s.ha,s.hb,(q-s.a)/(s.b-s.a)), inside=p>=a-1e-6&&q<=b+1e-6;
      o.push({a:p,b:q,ha:inside?Math.min(hp,c):hp,hb:inside?Math.min(hq,c):hq}); } }
  segs.length=0; for(const s of o) segs.push(s); }

/* a vertical extrusion in a wall frame: returns the list of calls that replace it, or true to keep it as it is */
function rOutlineTop(P,u){ let t=-1e9; for(let i=0;i<P.length;i++){ const p=P[i], q=P[(i+1)%P.length]; if((p[0]-u)*(q[0]-u)>0) continue;
  const d=q[0]-p[0], v=Math.abs(d)<1e-9? Math.max(p[1],q[1]) : lerp(p[1],q[1],(u-p[0])/d); if(v>t) t=v; } return t; }
function rWallExt(R,k,outer,holes,depth,M,uvfn){
  R._h=1;   // walls do their own support test and write their own skyline into the support field
  const e=M.elements, sy=e[5], oy=e[13];
  const [uA,uB,vA,vB]=rBB(outer), wM=depth/2, W=u=>[e[0]*u+e[8]*wM+e[12], e[2]*u+e[10]*wM+e[14]], toV=y=>(y-oy)/sy, toY=v=>oy+v*sy;
  const wb=rWorldBox(M,uA,vA,0,uB,vB,depth);
  const slim=depth<0.12;   // a facing layer or thin screen: it stands or falls with the masonry behind it
  if(slim){ // kept in the stretches where standing fabric right behind it still reaches its top
    const n=Math.max(1,Math.round((uB-uA)/SUP_G)), ok=[], lu=Math.hypot(e[0],e[2])||1, ln=Math.hypot(e[8],e[10])||1;
    const hx=Math.abs(e[0]/lu)*0.06+Math.abs(e[8]/ln)*0.24, hz=Math.abs(e[2]/lu)*0.06+Math.abs(e[10]/ln)*0.24;   // just behind or in front of it, not beside it
    for(let i=0;i<n;i++){ const um=uA+(uB-uA)*(i+0.5)/n, [x,z]=W(um), need=toY(Math.min(rOutlineTop(outer,um),vB)); ok.push(rSupMax(R,x-hx,z-hz,x+hx,z+hz)>=need-0.06); }
    if(ok.every(Boolean)) return true; if(!ok.some(Boolean)) return [];
    const out=[]; let i=0;
    while(i<n){ if(!ok[i]){ i++; continue; } let j=i; while(j+1<n&&ok[j+1]) j++; const a=uA+(uB-uA)*i/n, b=uA+(uB-uA)*(j+1)/n;
      let P=rClipHalf(outer,1,0,b); P=rClipHalf(P,-1,0,-a);
      if(P.length>=3&&Math.abs(rArea(P))>2e-3){ const hs=(holes||[]).filter(h=>{ const hb=rBB(h); return hb[0]>a+0.01&&hb[1]<b-0.01; }); out.push(['ext',[k,dedupe(P),hs.length?hs:null,depth,M,uvfn]]); }
      i=j+1; }
    return out; }
  const yb=toY(vA), gaps=rSupGaps(R,uA,uB,W,yb);   // where the wall or floor under its foot has gone
  // fast path: the whole wall is under the envelope and stands on something all along
  if(!gaps.length&&toY(vB)<=rEnvMin(R,wb)-R.jag-0.02){ const s1=[{a:uA,b:uB,ha:vB,hb:vB}]; if(depth>=0.15) rRecordWall(R,M,s1,vA,depth,toY,k); rSupWall(R,M,s1,vA,depth,toY); return true; }
  // a rectangle with openings cut up from its bottom edge (doorways, arcades) and holes (windows)?
  const n=outer.length; let i0=-1; for(let i=0;i<n;i++) if(Math.abs(outer[i][0]-uA)<1e-4&&Math.abs(outer[i][1]-vA)<1e-4){ i0=i; break; }
  let rect=null;
  if(i0>=0){ let P=outer.slice(i0).concat(outer.slice(0,i0)); if(Math.abs(P[1][0]-uA)<1e-4&&Math.abs(P[1][1]-vB)<1e-4) P=[P[0]].concat(P.slice(1).reverse());
    const L=P.length, ok=L>=4&&Math.abs(P[L-1][0]-uA)<1e-4&&Math.abs(P[L-1][1]-vB)<1e-4&&Math.abs(P[L-2][0]-uB)<1e-4&&Math.abs(P[L-2][1]-vB)<1e-4&&Math.abs(P[L-3][0]-uB)<1e-4&&Math.abs(P[L-3][1]-vA)<1e-4;
    if(ok){ const chain=P.slice(0,L-2); let good=true; for(let i=1;i<chain.length-1;i++) if(chain[i][1]>vB-1e-3) good=false;
      if(good){ const notches=[]; let cur=null;
        for(let i=0;i<chain.length;i++){ const p=chain[i], low=Math.abs(p[1]-vA)<1e-4;
          if(cur){ cur.pts.push(p); if(low){ const bb=rBB(cur.pts); cur.u0=bb[0]; cur.u1=bb[1]; cur.top=bb[3]; notches.push(cur); cur=null; } }
          else if(low&&i+1<chain.length&&chain[i+1][1]>vA+1e-4) cur={pts:[p]}; }
        rect={notches}; } } }
  const key='jag|'+Math.round(e[12]*100)+','+Math.round(e[14]*100)+','+Math.round(oy*100)+','+Math.round(uA*100);
  const dI=((Math.round(Math.atan2(e[2],e[0])/(Math.PI/2))%4)+4)%4, segs=rProfile(R,uA,uB,vB,W,toV,key,0.003*(dI+1));   // walls of each direction stop a few mm apart, so corner tops never share a plane
  for(const g of gaps) rLower(segs,g[0],g[1],vA);   // nothing under it: that stretch has come down
  if(!rect){
    // any other outline (a gable, a stepped flight, an arch frame): keep, cut along the skyline, or drop
    const narrow=uB-uA<0.7;
    let m=1e9; for(const s of segs) m=Math.min(m,s.ha,s.hb);
    const whole=()=>{ rSupWall(R,M,[{a:uA,b:uB,ha:vB,hb:vB}],vA,depth,toY); return true; };
    if(m>=vB-1e-3) return whole();
    if(narrow) return !gaps.length&&toY(vB)<=rEnvMin(R,wb)? whole() : [];
    if(holes&&holes.length){ let cut=m; for(let it=0;it<3;it++) for(const h of holes){ const b=rBB(h); if(b[3]+R.margin>cut&&b[2]<cut) cut=b[2]; }
      if(cut<=vA+0.05) return [];
      const P=rClipHalf(outer,0,1,cut); if(P.length<3||Math.abs(rArea(P))<1e-3) return [];
      rSupWall(R,M,[{a:uA,b:uB,ha:cut,hb:cut}],vA,depth,toY);
      const hs=holes.filter(h=>rBB(h)[3]<=cut-0.02); return [['ext',[k,dedupe(P),hs.length?hs:null,depth,M,uvfn]]]; }
    const out=[]; let run=null;
    const flush=()=>{ if(!run) return; let P=rClipHalf(outer,1,0,run.b); P=rClipHalf(P,-1,0,-run.a); P=rClipHalf(P,0,1,run.h);
      if(P.length>=3&&Math.abs(rArea(P))>2e-3){ const pb=rBB(P); rSupWall(R,M,[{a:pb[0],b:pb[1],ha:pb[3],hb:pb[3]}],vA,depth,toY); out.push(['ext',[k,dedupe(P),null,depth,M,uvfn]]); } run=null; };
    for(const s of segs){ const h=Math.min(s.ha,s.hb); if(h<=vA+0.04){ flush(); continue; } if(run&&Math.abs(run.h-h)<1e-4) run.b=s.b; else { flush(); run={a:s.a,b:s.b,h}; } }
    flush(); return out; }
  // openings survive while their lintel does; otherwise they open into a notch down to the sill
  const H_=(holes||[]).map(h=>{ const b=rBB(h); return {pts:h,u0:b[0],u1:b[1],v0:b[2],v1:b[3],gone:false}; });
  for(let pass=0;pass<3;pass++){
    for(const h of H_){ if(h.gone) continue; if(rProfMin(segs,h.u0-0.04,h.u1+0.04)<h.v1+R.margin){ h.gone=true; rLower(segs,h.u0,h.u1,h.v0); } }
    for(const nn of rect.notches){ if(nn.gone) continue; if(rProfMin(segs,nn.u0-0.04,nn.u1+0.04)<nn.top+R.margin){ nn.gone=true; rLower(segs,nn.u0,nn.u1,vA); } } }
  let intact=true; for(const s of segs) if(s.ha<vB-1e-3||s.hb<vB-1e-3) intact=false;
  if(depth>=0.15) rRecordWall(R,M,segs,vA,depth,toY,k);
  rSupWall(R,M,segs,vA,depth,toY);
  for(const h of H_) if(!h.gone) R.holes.push({M,u0:h.u0,u1:h.u1,v0:h.v0,v1:h.v1,depth,k});
  if(intact) return true;
  // fallen masonry: proportional to what came down, kept off doorways
  const dgaps=rect.notches.map(nn=>[nn.u0,nn.u1]).concat(H_.filter(h=>h.gone&&h.v0-vA<0.7).map(h=>[h.u0,h.u1]));
  for(const s of segs){ const lost=(vB-Math.min(s.ha,s.hb))*sy; if(lost<0.3) continue; R.debrisReq.push({M,a:s.a,b:s.b,lost,depth,k,yb:toY(vA),gaps:dgaps}); }
  // pieces: runs of the skyline that still stand above the bottom edge
  const out=[]; let i=0;
  while(i<segs.length){ if(Math.max(segs[i].ha,segs[i].hb)<=vA+0.03){ i++; continue; } let j=i; while(j+1<segs.length&&Math.max(segs[j+1].ha,segs[j+1].hb)>vA+0.03) j++;
    const a=segs[i].a, b=segs[j].b, pts=[[a,vA]];
    for(const nn of rect.notches.filter(nn=>!nn.gone&&nn.u0>a-1e-4&&nn.u1<b+1e-4).sort((p,q)=>p.u0-q.u0)) for(const p of nn.pts) pts.push(p);
    pts.push([b,vA]); for(let q=j;q>=i;q--){ pts.push([segs[q].b,Math.max(segs[q].hb,vA)],[segs[q].a,Math.max(segs[q].ha,vA)]); }
    const P=dedupe(pts), hs=H_.filter(h=>!h.gone&&h.u0>a&&h.u1<b).map(h=>h.pts);
    if(P.length>=3&&Math.abs(rArea(P))>2e-3) out.push(['ext',[k,P,hs.length?hs:null,depth,M,uvfn]]);
    i=j+1; }
  return out;
}
function rRecordWall(R,M,segs,vA,depth,toY,k){
  // runs of the skyline tall enough to carry something on their face
  let run=null; const yb=toY(vA), flush=()=>{ if(run&&run.b-run.a>=1.1) R.runs.push(run); run=null; };
  for(const s of segs){ const top=toY(Math.min(s.ha,s.hb)); if(top-yb<1.4){ flush(); continue; } if(run){ run.b=s.b; run.top=Math.min(run.top,top); } else run={M,a:s.a,b:s.b,top,yb,depth}; }
  flush();
  for(const s of segs){ const top=toY(Math.min(s.ha,s.hb)), topMax=toY(Math.max(s.ha,s.hb)), yb=toY(vA); if(topMax-yb<0.05) continue;
  const b=rWorldBox(M,s.a,0,0,s.b,0,depth); b[1]=yb; b[4]=topMax; const rec={b,top,topMax,yb,M,a:s.a,bU:s.b,depth,k}; R.walls.push(rec); rWallHashAdd(R,rec); } }

/* a thin upright plate (a relief panel, a band, a pilaster face): against a wall it reaches no higher than the wall now
   does; standing on something (a thin parapet slab) it keeps its height; with nothing under or behind it, it has fallen */
function rFacing(R,k,b){
  R._h=1; const alongX=b[3]-b[0]>=b[5]-b[2], L=alongX?b[3]-b[0]:b[5]-b[2], n=Math.max(1,Math.round(L/SUP_G)), tops=[], out=[];
  for(let i=0;i<n;i++){ const s0=(alongX?b[0]:b[2])+L*i/n, s1=s0+L/n, q=alongX?[s0,b[2]-0.24,s1,b[5]+0.24]:[b[0]-0.24,s0,b[3]+0.24,s1], bk=rSupMax(R,q[0],q[1],q[2],q[3]);
    let t= bk>=b[1]+0.3? Math.min(b[4],rQ(R,bk-b[1])+b[1]) : (b[1]<=0.3||bk>=b[1]-0.12)? b[4] : b[1]; if(t-b[1]<0.08) t=b[1]; tops.push(t); }
  let i=0; while(i<n){ if(tops[i]<=b[1]){ i++; continue; } let j=i; while(j+1<n&&Math.abs(tops[j+1]-tops[i])<0.02) j++;
    const s0=(alongX?b[0]:b[2])+L*i/n, s1=(alongX?b[0]:b[2])+L*(j+1)/n;
    out.push(['box',alongX?[k,s0,b[1],b[2],s1,tops[i],b[5]]:[k,b[0],b[1],s0,b[3],tops[i],s1]]); i=j+1; }
  return out; }
/* an upper floor or terrace slab, in metre squares: it survives where the building around it still stands, and as a broken
   ledge along walls that still carry it; whatever is not joined to a wall or pier that reaches its underside, within a
   4 m span, has fallen */
function rSlab(R,k,b){
  R._h=1; const g=1.0, i0=Math.floor(b[0]/g), j0=Math.floor(b[2]/g), ni=Math.ceil(b[3]/g)-i0, nj=Math.ceil(b[5]/g)-j0, st=new Uint8Array(ni*nj), cb=[];
  for(let j=0;j<nj;j++) for(let i=0;i<ni;i++){ const xa=Math.max(b[0],(i0+i)*g), za=Math.max(b[2],(j0+j)*g), xb=Math.min(b[3],(i0+i+1)*g), zb=Math.min(b[5],(j0+j+1)*g); cb.push([xa,za,xb,zb]);
    if(xb-xa<1e-3||zb-za<1e-3) continue;
    const env=R.env((xa+xb)/2,(za+zb)/2)-R.slab>=b[4], bear=rSupMax(R,xa-0.35,za-0.35,xb+0.35,zb+0.35), anch=bear>=b[1]-0.1;
    const ledge=anch&&rEnvMin(R,[xa-0.5,0,za-0.5,xb+0.5,0,zb+0.5])>=b[4]+0.3&&rHash(i0+i,j0+j,R.sd+71)<0.8;   // the storey above still stands here
    if(env||ledge) st[i+j*ni]=anch?2:1; }
  // a square stays if it bears on something, overhangs one that does by a metre, or spans between two that do (along its row or column)
  const d=new Int16Array(ni*nj).fill(-1), at=(i,j)=>i>=0&&j>=0&&i<ni&&j<nj? st[i+j*ni] : 0;
  const reach=(i,j,di,dj)=>{ for(let x=i+di,z=j+dj;at(x,z);x+=di,z+=dj) if(at(x,z)===2) return true; return false; };
  for(let j=0;j<nj;j++) for(let i=0;i<ni;i++){ const c=i+j*ni; if(!st[c]) continue;
    if(st[c]===2||DIRS.some(([di,dj])=>at(i+di,j+dj)===2)||(reach(i,j,1,0)&&reach(i,j,-1,0))||(reach(i,j,0,1)&&reach(i,j,0,-1))) d[c]=0; }
  const out=[];
  for(let j=0;j<nj;j++){ let run=null; const flush=()=>{ if(run) out.push(['box',[k,run[0],b[1],run[1],run[2],b[4],run[3]]]); run=null; };
    for(let i=0;i<ni;i++){ const c=i+j*ni; if(d[c]<0){ flush(); continue; } const [xa,za,xb,zb]=cb[c];
      rSupPut(R,xa,za,xb,zb,b[4]); const key=(i0+i)+','+(j0+j); if(!R.slabs.has(key)) R.slabs.set(key,[]); R.slabs.get(key).push(b[4]);
      if(run) run[2]=xb; else run=[xa,za,xb,zb]; }
    flush(); }
  return out; }
// the top of a surviving upper floor near height y at a point, or null
function rSlabTop(R,x,z,y){ const L=R.slabs.get(Math.floor(x)+','+Math.floor(z)); if(!L) return null; let best=null; for(const t of L) if(Math.abs(t-y)<0.35&&(best==null||Math.abs(t-y)<Math.abs(best-y))) best=t; return best; }

/* ---------- the filter: one primitive call in, the calls that replace it out (or true to keep it) ---------- */
function ruinCut(R,m,a){
  const k=a[0];
  if(RUIN_ALIVE.has(k)||R.keepS.has(k)) return true;
  if(RUIN_GONE.has(k)||R.dropS.has(k)) return [];
  switch(m){
    case 'box': {
      const [,x0,y0,z0,x1,y1,z1,M]=a, e=M&&M.elements, b=rWorldBox(M,x0,y0,z0,x1,y1,z1);
      { const h=b[4]-b[1], th=Math.min(b[3]-b[0],b[5]-b[2]); if(!e||rAxis(e)){ if(b[1]>0.3&&h<0.7&&h<0.5*th) return rSlab(R,k,b);   // an upper floor
          if(th<0.12&&h>0.3) return rFacing(R,k,b); } }   // a thin plate on a wall face
      if(b[4]<=rEnvMin(R,b)+0.01) return true;
      if(e&&!rAxis(e)){ if(rYonly(e)){ const lt=Math.max(y0,y1), lb=Math.min(y0,y1), cut=rQ(R,rEnvMin(R,b))-e[13]; if(lt-lb>0.5&&cut-lb>0.08) return [['box',[k,x0,lb,z0,x1,Math.min(lt,cut),z1,M]]]; } return []; }
      const hgt=b[4]-b[1], wx=b[3]-b[0], wz=b[5]-b[2], out=[];
      if(hgt<0.7&&hgt<0.5*Math.min(wx,wz)){   // a slab: kept in metre squares where the walls below still reach it
        const g=1.0, i0=Math.floor(b[0]/g), i1=Math.ceil(b[3]/g), j0=Math.floor(b[2]/g), j1=Math.ceil(b[5]/g);
        for(let j=j0;j<j1;j++){ let run=null; const flush=()=>{ if(run) out.push(['box',[k,run[0],b[1],Math.max(b[2],j*g),run[1],b[4],Math.min(b[5],(j+1)*g)]]); run=null; };
          for(let i=i0;i<i1;i++){ const xa=Math.max(b[0],i*g), xb=Math.min(b[3],(i+1)*g), za=Math.max(b[2],j*g), zb=Math.min(b[5],(j+1)*g); if(xb-xa<1e-3||zb-za<1e-3) continue;
            const mx=(xa+xb)/2, mz=(za+zb)/2, ground=b[4]<0.3;
            const ok= ground? !(R.floorLoss>0&&fbm2(mx/2.2,mz/2.2,R.sd+31)<R.floorLoss*0.75) : b[4]<=R.env(mx,mz)-R.slab; if(ok){ if(run) run[1]=xb; else run=[xa,xb]; } else flush(); }
          flush(); }
        return out; }
      const alongX=wx>=wz, L=alongX?wx:wz, n=L<=0.8?1:Math.max(1,Math.round(L/((R.seg[0]+R.seg[1])/2))), rng=RNG('bx|'+Math.round(b[0]*100)+','+Math.round(b[2]*100)+','+Math.round(b[1]*100));
      const pc=[];   // surviving pieces along the box: [s0,s1,top]
      for(let i=0;i<n;i++){ const s0=(alongX?b[0]:b[2])+L*i/n, s1=(alongX?b[0]:b[2])+L*(i+1)/n, cx=alongX?(s0+s1)/2:(b[0]+b[3])/2, cz=alongX?(b[2]+b[5])/2:(s0+s1)/2;
        const top=rQ(R,R.env(cx,cz)-R.jag*Math.pow(rng.f(),1.6));
        if(hgt<0.5){ pc.push(b[4]<=top+0.05? [s0,s1,b[4]] : null); continue; }
        const nt=Math.min(b[4],top); pc.push(nt-b[1]<0.06? null : [s0,s1,nt]); }
      if(b[1]>0.3){ // raised: a piece stays if something stands under it, or it spans between two that do, or it overhangs one by a block's length
        R._h=1; const pb=p=>alongX?[p[0],b[1],b[2],p[1],p[2],b[5]]:[b[0],b[1],p[0],b[3],p[2],p[1]];
        const anc=pc.map(p=>p&&rSupOK(R,pb(p),0.12));
        for(let i=0;i<n;i++){ if(!pc[i]||anc[i]) continue; let l=-1, r=-1;
          for(let j=i-1;j>=0&&pc[j];j--) if(anc[j]){ l=j; break; }
          for(let j=i+1;j<n&&pc[j];j++) if(anc[j]){ r=j; break; }
          const near=(l>=0&&pc[i][0]-pc[l][1]<0.6)||(r>=0&&pc[r][0]-pc[i][1]<0.6);
          if(!(l>=0&&r>=0)&&!near) pc[i]=null; }
        for(const p of pc) if(p){ const q=pb(p); rSupPut(R,q[0],q[2],q[3],q[5],q[4]); } }
      for(const p of pc) if(p) out.push(['box',alongX?[k,p[0],b[1],b[2],p[1],p[2],b[5]]:[k,b[0],b[1],p[0],b[3],p[2],p[1]]]);
      return out; }
    case 'cyl': case 'cone': {
      const cone=m==='cone'; let [,r0,r1,h,seg,M,open]=a; if(cone){ [,r0,h,seg,M]=a; r1=0; open=false; }
      const e=M&&M.elements; if(!e) return true;
      const sc=Math.hypot(e[0],e[2]), rr=Math.max(r0,r1)*sc, vert=Math.abs(e[4])<1e-4&&Math.abs(e[6])<1e-4&&e[5]>0.5;
      const b=vert? [e[12]-rr,e[13],e[14]-rr,e[12]+rr,e[13]+h*e[5],e[14]+rr] : rWorldBox(M,-Math.max(r0,r1),0,-Math.max(r0,r1),Math.max(r0,r1),h,Math.max(r0,r1));
      if(b[4]<=rEnvMin(R,b)+0.01) return true;
      if(!vert||cone||open||r1<0.3*r0) return [];
      if(R.colKeep&&rr>=0.15&&h*e[5]>=2&&rHash(Math.round(e[12]*10),Math.round(e[14]*10),R.sd+5)<R.colKeep) return true;   // a column that still stands
      const rng=RNG('cy|'+Math.round(e[12]*100)+','+Math.round(e[14]*100)+','+Math.round(e[13]*100));
      let tgt=R.env(e[12],e[14])-R.jag*0.6*Math.pow(rng.f(),1.4); if(R.drum>0){ const base=e[13]; tgt=base+Math.floor((tgt-base)/R.drum+1e-6)*R.drum; } else tgt=rQ(R,tgt);
      const h2=Math.min(h,(tgt-e[13])/e[5]); if(h2<0.1) return []; if(h2>=h-1e-4) return true;   // never taller than it was built
      return [['cyl',[k,r0,lerp(r0,r1,h2/h),h2,seg,M,open]]]; }
    case 'segCyl': { const [,p0,p1,r0,r1,seg]=a, rr=Math.max(r0,r1), b=[Math.min(p0.x,p1.x)-rr,Math.min(p0.y,p1.y),Math.min(p0.z,p1.z)-rr,Math.max(p0.x,p1.x)+rr,Math.max(p0.y,p1.y),Math.max(p0.z,p1.z)+rr];
      if(b[4]<=rEnvMin(R,b)+0.01) return true;
      const L=Math.hypot(p1.x-p0.x,p1.y-p0.y,p1.z-p0.z); if(p1.y>p0.y&&(p1.y-p0.y)/L>0.85){ const tgt=rQ(R,R.env(p0.x,p0.z)), t=Math.min(1,(tgt-p0.y)/(p1.y-p0.y)); if(t<0.08) return []; if(t>=1) return true;
        return [['segCyl',[k,p0,V3(lerp(p0.x,p1.x,t),lerp(p0.y,p1.y,t),lerp(p0.z,p1.z,t)),r0,lerp(r0,r1,t),seg]]]; }
      return []; }
    case 'lathe': {
      const [,pts,seg,M]=a, e=M&&M.elements; if(!e) return true;
      let rmax=0, ymin=1e9, ymax=-1e9; for(const p of pts){ rmax=Math.max(rmax,p[0]); ymin=Math.min(ymin,p[1]); ymax=Math.max(ymax,p[1]); }
      const vert=rYonly(e)||(Math.abs(e[4])<1e-4&&Math.abs(e[6])<1e-4&&e[5]>0.5&&Math.abs(e[1])<1e-4&&Math.abs(e[9])<1e-4), sc=Math.hypot(e[0],e[2]), sy=e[5];
      const b=vert? [e[12]-rmax*sc,e[13]+ymin*sy,e[14]-rmax*sc,e[12]+rmax*sc,e[13]+ymax*sy,e[14]+rmax*sc] : rWorldBox(M,-rmax,ymin,-rmax,rmax,ymax,rmax);
      if(b[4]<=rEnvMin(R,b)+0.01) return true;
      if(!vert) return [];
      const clipAt=(P,hv)=>{ const o=[]; for(let i=0;i<P.length;i++){ const p=P[i]; if(p[1]<=hv) o.push(p); const q=P[i+1]; if(q&&((p[1]<hv&&q[1]>hv)||(p[1]>hv&&q[1]<hv))){ const t=(hv-p[1])/(q[1]-p[1]); o.push([lerp(p[0],q[0],t),hv]); } } return o; };
      const last=pts[pts.length-1], first=pts[0], shell=last[0]<0.05*rmax&&last[1]>=ymax-1e-4&&first[0]>0.3*rmax&&rmax*sc>0.6&&(ymax-ymin)<1.7*rmax;
      if(shell){ // a dome: broken into sectors that fell at different heights
        const n=clamp(Math.round(rmax*sc*2.2),5,10), out=[], rng=RNG('dm|'+Math.round(e[12]*100)+','+Math.round(e[14]*100)+','+Math.round(e[13]*100)), yb0=e[13]+ymin*sy;
        R._h=1;
        for(let s=0;s<n;s++){ const p0=s/n*Math.PI*2+rng.range(-0.15,0.15), pl=Math.PI*2/n*rng.range(0.85,1.0), am=p0+pl/2, wx=e[12]+Math.sin(am)*rmax*sc*0.8, wz=e[14]+Math.cos(am)*rmax*sc*0.8;
          const hv=(R.env(wx,wz)-R.jag*Math.pow(rng.f(),1.2)-e[13])/sy; if(hv<=ymin+0.12*(ymax-ymin)) continue;
          const rx=e[12]+Math.sin(am)*rmax*sc*0.97, rz=e[14]+Math.cos(am)*rmax*sc*0.97;   // its springing must still sit on the drum or walls
          if(yb0>0.3&&rSupMax(R,rx-0.45,rz-0.45,rx+0.45,rz+0.45)<yb0-0.15) continue;
          const P=clipAt(pts,Math.min(hv,ymax)); if(P.length<2) continue;
          rSupPut(R,rx-0.3,rz-0.3,rx+0.3,rz+0.3,e[13]+Math.min(hv,ymax)*sy);
          out.push(['latheArc',[k,P,Math.max(3,Math.round(seg/n)+1),M,p0,pl]]); }
        return out; }
      const hv=(rQ(R,rEnvMin(R,b))-e[13])/sy; if(hv-ymin<0.12*(ymax-ymin)+0.05) return [];
      const P=clipAt(pts,hv); if(P.length<2) return []; if(P[P.length-1][0]>1e-3) P.push([0,P[P.length-1][1]]);
      return [['lathe',[k,P,seg,M]]]; }
    case 'latheArc': return true;
    case 'sphere': case 'ico': { const [,r,M]=a, e=M&&M.elements; if(!e) return true; const sy=Math.hypot(e[4],e[5],e[6]), sx=Math.max(Math.hypot(e[0],e[1],e[2]),Math.hypot(e[8],e[9],e[10]));
      const b=[e[12]-r*sx,e[13]-r*sy,e[14]-r*sx,e[12]+r*sx,e[13]+r*sy,e[14]+r*sx]; return b[4]<=rEnvMin(R,b)+0.01? true : []; }
    case 'torus': { const [,Rr,r,,M]=a, e=M&&M.elements; if(!e) return true; const s=Math.max(Math.hypot(e[0],e[1],e[2]),Math.hypot(e[4],e[5],e[6]),Math.hypot(e[8],e[9],e[10]))*(Rr+r);
      const b=[e[12]-s,e[13]-s,e[14]-s,e[12]+s,e[13]+s,e[14]+s]; return b[4]<=rEnvMin(R,b)+0.01? true : []; }
    case 'ext': {
      const [,outer,holes,depth,M,uvfn]=a; if(!outer||outer.length<3) return true;
      const e=M&&M.elements;
      if(e&&Math.abs(e[1])<1e-3&&Math.abs(e[9])<1e-3&&Math.abs(e[4])<1e-3&&Math.abs(e[6])<1e-3&&e[5]>0.5) return rWallExt(R,k,outer,holes,depth,M,uvfn);
      const bb=rBB(outer), b=rWorldBox(M,bb[0],bb[2],0,bb[1],bb[3],depth);
      if(b[4]<=rEnvMin(R,b)+0.01) return true;
      if(e&&Math.abs(e[9])>0.99&&e[9]>0&&Math.abs(e[1])<1e-3&&Math.abs(e[5])<1e-3){   // a prism standing on its outline (a fluted shaft)
        const cx=(b[0]+b[3])/2, cz=(b[2]+b[5])/2, rng=RNG('pr|'+Math.round(cx*100)+','+Math.round(cz*100)+','+Math.round(e[13]*100));
        if(R.colKeep&&depth*e[9]>=2&&rHash(Math.round(cx*10),Math.round(cz*10),R.sd+5)<R.colKeep) return true;
        let tgt=R.env(cx,cz)-R.jag*0.6*Math.pow(rng.f(),1.4); if(R.drum>0) tgt=e[13]+Math.floor((tgt-e[13])/R.drum+1e-6)*R.drum; else tgt=rQ(R,tgt);
        const d2=(tgt-e[13])/e[9]; return d2<0.1? [] : [['ext',[k,outer,holes,Math.min(depth,d2),M,uvfn]]]; }
      return []; }
    case 'flat': { const [,pts,M]=a; const P=[]; for(const p of pts) P.push(p[0],p[1],0); const b=rPtsBox(P,M); return b[4]<=rEnvMin(R,b)+0.01? true : []; }
    case 'raw': case 'rawN': { const pos=a[1], M=m==='raw'?a[3]:a[4]; const b=rPtsBox(pos,M); return b[4]<=rEnvMin(R,b)+0.01? true : []; }
    case 'grid': { const G=a[2], M=a[4], P=[]; for(const row of G) for(const v of row) P.push(v.p[0],v.p[1],v.p[2]); const b=rPtsBox(P,M); return b[4]<=rEnvMin(R,b)+0.01? true : []; }
  }
  return true;
}

/* ---------- colliders cut to the same skyline ---------- */
function ruinCols(R,COL){
  const out=[];
  const wallTop=(x0,z0,x1,z1,y0,y1)=>{ let best=null; const seen=new Set();
    for(let i=Math.floor(x0);i<=Math.floor(x1);i++) for(let j=Math.floor(z0);j<=Math.floor(z1);j++){ const a=R.wallHash.get(i*4096+j); if(!a) continue;
      for(const w of a){ if(seen.has(w)) continue; seen.add(w); const b=w.b; if(b[3]<x0-0.03||b[0]>x1+0.03||b[5]<z0-0.03||b[2]>z1+0.03||b[4]<y0||b[1]>y1) continue; best=Math.max(best==null?-1e9:best,w.topMax); } }
    return best; };
  for(const b of COL){
    const hgt=b[4]-b[1], wx=b[3]-b[0], wz=b[5]-b[2], up=b[1]>0.3, slab=hgt<0.7&&hgt<0.5*Math.min(wx,wz);
    if(!up&&b[4]<=rEnvMin(R,b)+0.02){ out.push(b); continue; }
    if(slab){ const g=1.0;   // floors: only the squares that are still there
      for(let i=Math.floor(b[0]/g);i<Math.ceil(b[3]/g);i++) for(let j=Math.floor(b[2]/g);j<Math.ceil(b[5]/g);j++){ const xa=Math.max(b[0],i*g), xb=Math.min(b[3],(i+1)*g), za=Math.max(b[2],j*g), zb=Math.min(b[5],(j+1)*g); if(xb-xa<1e-3||zb-za<1e-3) continue;
        const ok= up? rSlabTop(R,(xa+xb)/2,(za+zb)/2,b[4])!=null : b[4]<=R.env((xa+xb)/2,(za+zb)/2)-R.slab; if(ok) out.push([xa,b[1],za,xb,b[4],zb]); }
      continue; }
    // anything else is cut to the fabric actually standing there: the wall's own skyline, or the support field
    const alongX=wx>=wz, L=alongX?wx:wz, n=Math.max(1,Math.ceil(L/0.4));
    for(let i=0;i<n;i++){ const s0=(alongX?b[0]:b[2])+L*i/n, s1=(alongX?b[0]:b[2])+L*(i+1)/n, c=alongX?[s0,b[2],s1,b[5]]:[b[0],s0,b[3],s1];
      const sm=rSupMax(R,c[0]+0.02,c[1]+0.02,c[2]-0.02,c[3]-0.02); if(up&&sm<b[1]-0.12) continue;
      const wt=wallTop(c[0],c[1],c[2],c[3],b[1],b[4]); let top=wt!=null? wt : sm>0.05? sm : R.env((c[0]+c[2])/2,(c[1]+c[3])/2)-0.1;
      top=Math.min(top,b[4]); if(top-b[1]<0.05) continue; out.push([c[0],b[1],c[1],c[2],top,c[3]]); } }
  return out;
}

/* ---------- fallen masonry at the foot of the walls ---------- */
function ruinDebris(B,R,clear,cellAt,H){
  let budget=Math.round((160+60*R.NX*R.NZ*R.debris)*(R.rubble==='mound'?0.35:1));
  const rng=RNG('debris|'+R.sd), free=(x,z,r)=>!clear.some(c=>Math.hypot(x-c[0],z-c[1])<c[2]+r);
  const floorY=(x,z,yb)=>{ const ix=Math.round(x/R.CW+(R.NX-1)/2), iz=Math.round(z/R.CW+(R.NZ-1)/2), inPlot=ix>=0&&iz>=0&&ix<R.NX&&iz<R.NZ;
    if(yb>0.5&&inPlot){ const t=rSlabTop(R,x,z,yb); if(t!=null) return t+0.02; }   // onto what is left of the floor it fell from
    return inPlot&&cellAt(ix,iz,0)>0? 0.06 : 0.0; };
  for(const q of R.debrisReq){ if(budget<=0) break; const e=q.M.elements, n=Math.min(4,Math.floor(q.lost*(q.b-q.a)*0.9*R.debris+rng.f()));
    for(let i=0;i<n&&budget>0;i++){ const u=rng.range(q.a,q.b); if(q.gaps.some(g=>u>g[0]-0.7&&u<g[1]+0.7)) continue;
      const side=rng.chance(0.5)?-1:1, off=rng.range(0.25,1.3), w=side<0? -off : q.depth+off;
      const x=e[0]*u+e[8]*w+e[12], z=e[2]*u+e[10]*w+e[14];
      const fl=floorY(x,z,q.yb);
      if(!free(x,z,0.4)) continue;
      const sz=rng.range(0.7,1.25);
      if(R.rubble==='mound'){ B.ico('mudm',0.5*sz,mm(mT(x,fl,z),mRY(rng.f()*6.28),mS(1.5,0.4,1.0)),1); }
      else if(R.rubble==='log'){ const L=rng.range(1.2,2.4), ang=rng.f()*6.28; B.cyl(q.k,0.16,0.16,L,6,mm(mT(x,fl+0.16,z),mRY(ang),mRZ(Math.PI/2),mT(0,-L/2,0))); }
      else { const bw=rng.range(0.3,0.62)*sz, bh=rng.range(0.14,0.3)*sz, bd=rng.range(0.22,0.42)*sz;
        B.box(q.k,-bw/2,-bh/2,-bd/2,bw/2,bh/2,bd/2,mm(mT(x,fl+bh/2-0.02,z),mRY(rng.f()*6.28),mRX(rng.range(-0.25,0.25)),mRZ(rng.range(-0.2,0.2)))); }
      budget--; } }
}

/* ============================================================
   TEXTURES
   ============================================================ */
// ashlar with grey veins running through it
function texMarble(base,rng){ const c=texAshlar(base,rng,6), g=c.getContext('2d'), W=c.width;
  for(let i=0;i<22;i++){ g.strokeStyle=`rgba(${rng.chance(.5)?'110,105,100':'150,140,125'},${rng.range(.12,.3)})`; g.lineWidth=rng.range(0.6,1.8); g.beginPath(); let x=rng.f()*W, y=rng.f()*W; g.moveTo(x,y);
    for(let k=0;k<8;k++){ x+=rng.range(-28,40); y+=rng.range(-12,26); g.lineTo(x,y); } g.stroke(); }
  return c; }
// sandstone: big blocks, bedding lines and a warm wash
function texSandstone(base,rng){ const c=texAshlar(base,rng,5), g=c.getContext('2d'), W=c.width;
  for(let y=0;y<W;y+=rng.range(3,9)){ g.fillStyle=`rgba(${rng.chance(.5)?'120,80,40':'255,235,200'},${rng.range(.03,.09)})`; g.fillRect(0,y,W,rng.range(1,3)); }
  return c; }
// laterite: porous red-brown blocks
function texLaterite(base,rng){ const c=texAshlar(base,rng,6), g=c.getContext('2d'), W=c.width;
  for(let i=0;i<900;i++){ g.fillStyle=`rgba(40,18,8,${rng.range(.25,.6)})`; g.beginPath(); g.ellipse(rng.f()*W,rng.f()*W,rng.range(0.8,2.6),rng.range(0.6,2),rng.f()*3,0,7); g.fill(); }
  return c; }
// Inca fine masonry: pillowed polygonal blocks with hairline joints (a wrapped Voronoi)
function texPolygonal(base,rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'), pts=[], n=7;
  for(let j=0;j<n;j++) for(let i=0;i<n;i++) pts.push([(i+0.5+rng.range(-0.38,0.38))*W/n,(j+0.5+rng.range(-0.38,0.38))*W/n,rng.range(0.82,1.12)]);
  const img=g.createImageData(W,W), d=img.data, [br,bg,bb]=hx(base);
  for(let y=0;y<W;y++) for(let x=0;x<W;x++){ let d1=1e9, d2=1e9, k1=0;
    for(let k=0;k<pts.length;k++){ let dx=Math.abs(x-pts[k][0]), dy=Math.abs(y-pts[k][1]); if(dx>W/2) dx=W-dx; if(dy>W/2) dy=W-dy; const dd=dx*dx+dy*dy; if(dd<d1){ d2=d1; d1=dd; k1=k; } else if(dd<d2) d2=dd; }
    const edge=Math.sqrt(d2)-Math.sqrt(d1), j=edge<1.4? 0.32 : 1-0.28*Math.exp(-edge/7), s=pts[k1][2]*j*(0.94+0.06*rng.f()), o=(y*W+x)*4;
    d[o]=clamp(br*s,0,255); d[o+1]=clamp(bg*s,0,255); d[o+2]=clamp(bb*s,0,255); d[o+3]=255; }
  g.putImageData(img,0,0); speck(g,W,W,rng,700,['rgba(0,0,0,.12)','rgba(255,255,255,.12)'],1,2); return c; }
// Nan Madol: courses of basalt prisms laid lengthwise, then courses of their hexagonal ends, coral rubble between
function texCrib(base,rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle='#b9b2a2'; g.fillRect(0,0,W,W); speck(g,W,W,rng,1800,['rgba(90,85,75,.4)','rgba(240,235,220,.5)'],1,3);
  const rows=8, rh=W/rows;
  for(let r=0;r<rows;r++){ const y=r*rh;
    if(r%2===0){ let x=-rng.f()*60; while(x<W){ const L=rng.range(70,140), k=rng.range(.75,1.1);
        for(let f=0;f<3;f++){ g.fillStyle=shade(base,k*[0.75,1.15,0.85][f]); g.fillRect(x+1,y+2+f*(rh-4)/3,L-2,(rh-4)/3); } x+=L+rng.range(2,10); } }
    else { for(let x=rng.range(4,16);x<W;x+=rng.range(26,40)){ const R=rh*0.42, cx=x, cy=y+rh/2, k=rng.range(.7,1.05); g.fillStyle=shade(base,k); g.beginPath();
        for(let a=0;a<6;a++){ const t=a/6*Math.PI*2+0.5; g.lineTo(cx+Math.cos(t)*R,cy+Math.sin(t)*R); } g.closePath(); g.fill(); g.strokeStyle='rgba(0,0,0,.35)'; g.lineWidth=1; g.stroke(); } } }
  return c; }
// Great Zimbabwe: thin dressed granite courses, no mortar
function texDrystone(base,rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=shade(base,.35); g.fillRect(0,0,W,W); let y=0;
  while(y<W){ const h=rng.range(9,15)|0, hh=y+h>W? W-y : h; let x=-rng.f()*40; while(x<W){ const w=rng.range(22,58), k=rng.range(.78,1.12); g.fillStyle=shade(base,k); g.fillRect(x+1,y+1,w-2,hh-2); g.fillStyle='rgba(255,255,255,.08)'; g.fillRect(x+1,y+1,w-2,2); x+=w; } y+=h; }
  speck(g,W,W,rng,2400,['rgba(60,50,45,.35)','rgba(230,215,200,.35)','rgba(140,110,100,.3)'],1,2); return c; }
// Mesopotamia: sun-dried brick, eroded and smeared
function texMudbrick(base,rng){ const c=texBrick(base,shade(base,.7),rng,24,7), g=c.getContext('2d'), W=c.width; mottle(g,W,W,rng,140,20,90,0.12);
  for(let i=0;i<30;i++){ g.strokeStyle=`rgba(70,50,30,${rng.range(.08,.2)})`; g.lineWidth=rng.range(1,3); g.beginPath(); const x=rng.f()*W; g.moveTo(x,rng.f()*W); g.lineTo(x+rng.range(-6,6),rng.f()*W); g.stroke(); }
  return c; }
function wallCanvasRuin(spec,rng){ switch(spec.tex){
  case 'marble': return texMarble(spec.c,rng); case 'sandstone': return texSandstone(spec.c,rng); case 'laterite': return texLaterite(spec.c,rng);
  case 'polygonal': return texPolygonal(spec.c,rng); case 'crib': return texCrib(spec.c,rng); case 'drystone': return texDrystone(spec.c,rng);
  case 'mudbrick': return texMudbrick(spec.c,rng); case 'opus': return texBrick(spec.c,spec.mortar||'#cbbfa8',rng,22,4); }
  return null; }
// friezes
function drawBandRuin(type,pal,rng){
  if(!['triglyph','hieroglyph','chevron','lotus','rosette'].includes(type)) return null;
  const W=1024,H=128, c=cvs(W,H), g=c.getContext('2d'); g.fillStyle=pal.bg; g.fillRect(0,0,W,H);
  if(type==='triglyph'){ for(let x=0;x<W;x+=128){ g.fillStyle=shade(pal.a,1); g.fillRect(x,12,40,H-24); g.fillStyle=shade(pal.a,.6); for(const q of [10,22]) g.fillRect(x+q,12,6,H-30); g.fillRect(x,H-18,40,6);
      g.fillStyle=shade(pal.bg,.9); g.fillRect(x+52,16,64,H-32); g.fillStyle='rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(x+84,H/2,18,30,0,0,7); g.fill(); }
    g.fillStyle=shade(pal.bg,.7); g.fillRect(0,0,W,10); g.fillRect(0,H-8,W,8); return c; }
  if(type==='hieroglyph'){ g.fillStyle=shade(pal.bg,.8); for(let x=0;x<W;x+=64) g.fillRect(x,0,2,H);
    for(let x=0;x<W;x+=64) for(let y=10;y<H-10;y+=rng.range(22,34)){ g.fillStyle=rng.chance(.3)?pal.b:pal.a; const k=rng.int(0,5), cx=x+32;
      if(k===0){ g.beginPath(); g.ellipse(cx,y+8,14,6,0,0,7); g.fill(); } else if(k===1) g.fillRect(cx-12,y,24,5); else if(k===2){ g.beginPath(); g.moveTo(cx-12,y+14); g.lineTo(cx,y); g.lineTo(cx+12,y+14); g.fill(); }
      else if(k===3){ g.fillRect(cx-3,y,6,18); g.beginPath(); g.arc(cx,y,7,0,7); g.fill(); } else if(k===4){ g.beginPath(); g.ellipse(cx-4,y+8,10,6,0,0,7); g.fill(); g.fillRect(cx+4,y+2,10,3); } else { g.beginPath(); g.arc(cx,y+8,8,0,7); g.fill(); g.fillStyle=pal.bg; g.beginPath(); g.arc(cx,y+8,3,0,7); g.fill(); } }
    return c; }
  if(type==='chevron'){ g.fillStyle=shade(pal.bg,.45); for(let x=-40;x<W+40;x+=64){ g.beginPath(); g.moveTo(x,H-20); g.lineTo(x+32,20); g.lineTo(x+64,H-20); g.lineTo(x+52,H-20); g.lineTo(x+32,44); g.lineTo(x+12,H-20); g.closePath(); g.fill(); } return c; }
  if(type==='lotus'){ for(let x=0;x<W;x+=48){ g.fillStyle=pal.a; g.beginPath(); g.moveTo(x+4,H-20); g.quadraticCurveTo(x+24,10,x+44,H-20); g.fill(); g.fillStyle=shade(pal.a,.7); g.beginPath(); g.moveTo(x+14,H-20); g.quadraticCurveTo(x+24,40,x+34,H-20); g.fill(); }
    g.fillStyle=shade(pal.bg,.7); g.fillRect(0,H-18,W,18); g.fillRect(0,0,W,8); return c; }
  if(type==='rosette'){ for(let x=48;x<W;x+=96){ const cy=H/2; for(let k=0;k<12;k++){ const a=k/12*Math.PI*2; g.fillStyle=k%2?pal.a:shade(pal.a,.75); g.beginPath(); g.ellipse(x+Math.cos(a)*22,cy+Math.sin(a)*22,13,6,a,0,7); g.fill(); }
      g.fillStyle=pal.b; g.beginPath(); g.arc(x,cy,10,0,7); g.fill(); } g.fillStyle=shade(pal.bg,.7); g.fillRect(0,0,W,8); g.fillRect(0,H-8,W,8); return c; }
  return null; }
// carved relief panels: figures and signs cut in low relief, lit from the upper left
function texRelief(kind,base,rng){ const W=512, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,W,W); mottle(g,W,W,rng,90,20,80,0.06);
  const cut=(draw)=>{ g.save(); g.translate(-2,-2); g.fillStyle=shade(base,1.18); draw(); g.restore(); g.save(); g.translate(2,2); g.fillStyle=shade(base,.55); draw(); g.restore(); g.fillStyle=shade(base,.92); draw(); };
  const fig=(x,y,s,walk)=>cut(()=>{ g.beginPath(); g.ellipse(x,y,9*s,11*s,0,0,7); g.fill(); g.fillRect(x-11*s,y+12*s,22*s,46*s); if(walk){ g.fillRect(x-10*s,y+58*s,7*s,34*s); g.fillRect(x+4*s,y+58*s,7*s,34*s); } else g.fillRect(x-14*s,y+58*s,28*s,34*s); g.fillRect(x+10*s,y+20*s,18*s,6*s); });
  switch(kind){
    case 'egypt': for(let r=0;r<2;r++){ for(let x=40;x<W;x+=90) fig(x,40+r*250,1.6,rng.chance(.5)); for(let x=12;x<W;x+=28) for(let y=200+r*250-60;y<200+r*250-10;y+=16) cut(()=>{ g.beginPath(); g.ellipse(x,y,7,4,0,0,7); g.fill(); }); } break;
    case 'persian': for(let r=0;r<2;r++){ g.fillStyle=shade(base,.8); g.fillRect(0,r*256+240,W,6); for(let x=30;x<W;x+=62) fig(x,r*256+70,1.55,true); } break;
    case 'khmer': for(let x=64;x<W;x+=128){ cut(()=>{ g.beginPath(); g.ellipse(x,90,16,20,0,0,7); g.fill(); g.beginPath(); g.moveTo(x-10,40); g.lineTo(x,8); g.lineTo(x+10,40); g.fill(); g.beginPath(); g.moveTo(x-22,112); g.quadraticCurveTo(x,100,x+22,112); g.lineTo(x+16,300); g.quadraticCurveTo(x,320,x-16,300); g.fill(); g.fillRect(x-40,140,80,10); g.beginPath(); g.moveTo(x-28,300); g.lineTo(x+28,300); g.lineTo(x+34,470); g.lineTo(x-34,470); g.fill(); });
      g.strokeStyle=shade(base,.7); g.lineWidth=3; g.strokeRect(x-58,4,116,500); } break;
    case 'maya': for(let y=8;y<W;y+=84) for(let x=8;x<W;x+=84) cut(()=>{ g.beginPath(); g.moveTo(x+14,y); g.lineTo(x+62,y); g.quadraticCurveTo(x+76,y,x+76,y+14); g.lineTo(x+76,y+62); g.quadraticCurveTo(x+76,y+76,x+62,y+76); g.lineTo(x+14,y+76); g.quadraticCurveTo(x,y+76,x,y+62); g.lineTo(x,y+14); g.quadraticCurveTo(x,y,x+14,y); g.fill(); });
      for(let y=8;y<W;y+=84) for(let x=8;x<W;x+=84){ g.fillStyle=shade(base,.62); g.beginPath(); g.arc(x+28,y+30,8,0,7); g.fill(); g.fillRect(x+44,y+20,18,6); g.fillRect(x+20,y+52,40,6); } break;
    case 'mesop': for(let y=10;y<W;y+=22) for(let x=6+((y/22)%2)*9;x<W;x+=rng.range(14,26)){ g.fillStyle=shade(base,.55); g.beginPath(); g.moveTo(x,y); g.lineTo(x+10,y+2); g.lineTo(x,y+7); g.fill(); g.fillRect(x+9,y+1,rng.range(4,10),2); } break;
    default: for(let x=50;x<W;x+=100) fig(x,150,2.0,rng.chance(.5));
  }
  return c; }
// Ishtar Gate: blue glazed brick with a yellow striding lion and a rosette border
function texGlaze(rng){ const W=512, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle='#1f4f8f'; g.fillRect(0,0,W,W);
  for(let y=0;y<W;y+=16) for(let x=(y/16%2)*24;x<W;x+=48){ g.fillStyle=shade('#2a62a8',rng.range(.75,1.15)); g.fillRect(x+1,y+1,46,14); }
  g.fillStyle='#d9a63a'; g.beginPath(); g.ellipse(250,250,150,62,0,0,7); g.fill(); g.beginPath(); g.ellipse(390,205,48,44,0,0,7); g.fill();
  for(const x of [140,190,300,350]) g.fillRect(x,290,22,110); g.fillRect(90,220,60,14);
  g.fillStyle='#e8e2cf'; for(let x=24;x<W;x+=64){ for(const y of [24,488]){ g.beginPath(); g.arc(x,y,12,0,7); g.fill(); } } return c; }
function texGranite(base,rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,W,W); mottle(g,W,W,rng,120,20,90,0.08);
  speck(g,W,W,rng,5200,['rgba(40,35,35,.45)','rgba(235,225,215,.45)','rgba(160,120,110,.4)'],1,2.5); return c; }
function texSand(rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle='#d8c08e'; g.fillRect(0,0,W,W); mottle(g,W,W,rng,140,14,70,0.08);
  for(let y=0;y<W;y+=rng.range(5,9)){ g.strokeStyle=`rgba(150,115,70,${rng.range(.12,.25)})`; g.lineWidth=1.2; g.beginPath(); g.moveTo(0,y); for(let x=0;x<=W;x+=16) g.lineTo(x,y+Math.sin(x*0.05+y)*2.5); g.stroke(); }
  speck(g,W,W,rng,1200,['rgba(120,90,60,.2)','rgba(255,250,235,.3)'],1,2); return c; }
function texCoralRuin(rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle='#d9d3c3'; g.fillRect(0,0,W,W);
  for(let i=0;i<900;i++){ g.fillStyle=`rgba(${rng.chance(.5)?'120,110,95':'250,248,240'},${rng.range(.2,.5)})`; g.beginPath(); g.arc(rng.f()*W,rng.f()*W,rng.range(1,4),0,7); g.fill(); } return c; }

/* ---------- materials a ruin needs on top of its tradition's ---------- */
function ruinMats(M,st,std,rng){ if(!st.ruin) return;
  const R=st.ruin;
  M.sand=std({map:mkTex(texSand(rng),2.2,2.2), roughness:1});
  M.root=std({color:lc('#7c6f5f'), roughness:0.95}); M.fern=std({color:lc('#4d7a2c'), roughness:0.85}); M.vine=std({color:lc('#3b5a26'), roughness:0.9});
  M.relief=std({map:mkTex(texRelief(R.relief||'greek',st.stone,rng),1.6,1.6), roughness:0.85});
  M.glaze=std({map:mkTex(texGlaze(rng),1.6,1.6), roughness:0.35});
  M.coral=std({map:mkTex(texCoralRuin(rng),1.2,1.2), roughness:1});
  M.basalt=std({map:mkTex(texAshlar('#3d3c3a',rng,6),1.5,1.5), roughness:0.75});
  M.granite=std({map:mkTex(texGranite('#9c958b',rng),1.2,1.2), roughness:0.9});
  M.marble=std({map:mkTex(texMarble('#ece6da',rng),2,2), roughness:0.5});
  M.rframe=std({map:mkTex(texAshlar(st.stone,rng,8),3,3), roughness:0.7});
  M.clayp=std({color:lc('#a3623f'), roughness:0.85}); M.mudm=std({map:mkTex(texMud(st.wall.c,rng),1.5,1.5), roughness:1}); M.shade=std({color:lc('#1d1b19'), roughness:1});
  M.palmleaf=std({color:lc('#6b8a3a'), roughness:0.8}); M.reed=std({color:lc('#b9a46a'), roughness:0.9}); M.lichen=std({color:lc('#8d9a62'), roughness:1});
  M.bird=std({color:lc('#6d7563'), roughness:0.6}); M.wool=std({color:lc('#d8ccb6'), roughness:1}); M.aloe=std({color:lc('#6f8a62'), roughness:0.8});
}

/* ============================================================
   COLUMN ORDERS  (M at the column's foot, h to the top of the capital, r the shaft radius)
   ============================================================ */
// a fluted shaft: a star outline of concave flutes stood on end
function flutedShaft(B,k,M,r,h,n){ const P=[]; n=n||20; for(let i=0;i<n;i++){ for(let s=0;s<3;s++){ const a=(i+s/3)/n*Math.PI*2, rr=r*(s===1?0.93:1); P.push([Math.cos(a)*rr,Math.sin(a)*rr]); } } B.ext(k,P,null,h,mm(M,mRX(-Math.PI/2))); }
function ruinColumn(B,order,M,h,r,cm,ca){
  switch(order){
    case 'doric': { const cap=0.5, sh=h-cap; flutedShaft(B,cm,M,r,sh,20);
      B.lathe(cm,[[r*0.95,0],[r*1.0,0.05],[r*1.38,0.24],[r*1.45,0.3],[0,0.3]],16,mm(M,mT(0,sh,0)));   // echinus
      B.box(cm,-r*1.5,sh+0.3,-r*1.5,r*1.5,h,r*1.5,M); break; }   // abacus
    case 'papyrus': { const R=r*1.25; B.cyl(cm,R*1.25,R*1.25,0.3,16,M);
      B.lathe(cm,[[R*1.02,0],[R*1.12,0.25],[R,0.7],[R*0.9,h*0.55],[R*0.86,h-1.25],[R*0.95,h-1.1],[R*1.25,h-0.85],[R*1.1,h-0.55],[R*0.7,h-0.32],[0,h-0.32]],14,mm(M,mT(0,0.3,0)));
      for(const f of [h-1.32,h-1.24,h-1.16]) B.torus(cm,R*0.88,0.04,Math.PI*2,mm(M,mT(0,0.3+f,0),mRX(Math.PI/2)),4,16);
      B.box(cm,-R*0.75,h-0.02,-R*0.75,R*0.75,h+0.28,R*0.75,M); break; }   // a closed-bud papyrus column, its bands, and the abacus
    case 'persian': { const capH=1.3, sh=h-capH;
      B.lathe(cm,[[0,0],[r*2.0,0],[r*2.0,0.1],[r*1.75,0.28],[r*1.35,0.55],[r*1.25,0.68],[r*1.45,0.78],[r*1.05,0.92],[0,0.92]],16,M);   // bell base and torus
      flutedShaft(B,cm,mm(M,mT(0,0.92,0)),r,sh-0.92,32);
      const T=mm(M,mT(0,sh,0)); B.lathe(cm,[[r*1.02,0],[r*1.32,0.12],[r*1.1,0.3],[0,0.3]],16,T); B.box(cm,-r*0.9,0.3,-r*0.75,r*0.9,0.5,r*0.75,T);
      for(const sg of [-1,1]){ const Bm=mm(T,mT(sg*r*0.95,0.5,0));   // the kneeling bull foreparts, back to back, the beam seat between their necks
        B.box(cm,-r*0.95,0,-r*0.6,r*0.95,0.6,r*0.6,Bm); B.box(cm,sg*r*0.6,0.22,-r*0.34,sg*(r*0.6+0.55),0.72,r*0.34,Bm);
        for(const sz of [-1,1]){ B.cone(cm,0.05,0.28,5,mm(Bm,mT(sg*(r*0.6+0.35),0.72,sz*r*0.25),mRZ(-sg*0.6))); B.box(cm,sg*r*0.2,-0.02,sz*r*0.3-0.09,sg*(r*0.2+0.45),0.16,sz*r*0.3+0.09,Bm); } }
      B.box(cm,-r*0.9,0.9,-r*0.5,r*0.9,capH,r*0.5,T); break; }
    default: return false;
  }
  return true; }

/* ============================================================
   TOWERS
   ============================================================ */
const RUIN_TOWERS=new Set(['tholos','pylon','ziggurat','kaaba','prasat','torreon','conical','cribtower']);
const RUIN_TOWER_H={tholos:1.25, pylon:2.0, ziggurat:2.1, kaaba:1.9, prasat:2.6, torreon:1.5, conical:2.4, cribtower:1.6};
const RUIN_FREE=new Set(['tholos','ziggurat','kaaba','prasat','torreon','conical','cribtower']);
const RUIN_TOWER_HALF={tholos:2.7, pylon:1.6, ziggurat:2.9, kaaba:1.7, prasat:2.3, torreon:2.0, conical:1.9, cribtower:2.1};
// a horizontal hexagonal basalt log from a to b (world, same height)
function basaltLog(B,ax,y,az,bx,bz,r,k){ const L=Math.hypot(bx-ax,bz-az); if(L<0.05) return; B.cyl(k||'basalt',r,r,L,6,mm(mT(ax,y,az),mRY(Math.atan2(bx-ax,bz-az)),mRX(Math.PI/2))); }
// a crib-laid run of basalt: stretcher courses along the run, header courses across it, the ends overhanging
function cribRun(B,x0,z0,x1,z1,y0,y1,th,rng,k){ const L=Math.hypot(x1-x0,z1-z0); if(L<0.3) return; const ux=(x1-x0)/L, uz=(z1-z0)/L, nx=-uz, nz=ux, r=0.17;
  for(let y=y0+r, c=0; y<y1-0.05; y+=2*r*0.95, c++){
    if(c%2===0){ for(const s of [-1,1]){ const o=s*th*0.32; let a=-0.25; while(a<L+0.2){ const len=Math.min(L+0.25-a,rng.range(1.6,3.2)); basaltLog(B,x0+ux*a+nx*o,y,z0+uz*a+nz*o,x0+ux*(a+len)+nx*o,z0+uz*(a+len)+nz*o,r*rng.range(0.85,1.1),k); a+=len+0.02; } } }
    else for(let a=0.15;a<L;a+=rng.range(0.55,0.9)){ const px=x0+ux*a, pz=z0+uz*a; basaltLog(B,px-nx*th*0.55,y,pz-nz*th*0.55,px+nx*th*0.55,pz+nz*th*0.55,r*rng.range(0.85,1.1),k); } } }
function ruinTower(B,kind,cx,yb,cz,Ht,half,st,wk,col,n,H){
  const rng=RNG('rt|'+kind+cx+','+cz), P4=[[1,1],[1,-1],[-1,1],[-1,-1]];
  switch(kind){
    case 'tholos': { const R=half; for(let i=0;i<3;i++) B.cyl('stone',R+0.3-i*0.3,R+0.3-i*0.3,0.25,32,mT(cx,yb+i*0.25,cz)); const y0=yb+0.75, nc=12, rc=R-0.45, hc=Math.min(Ht-1.6,6.0);
      for(let i=0;i<3;i++){ const e=(R+0.3-i*0.3)*0.9; col(cx-e,yb+i*0.25,cz-e,cx+e,yb+(i+1)*0.25,cz+e); }
      for(let k=0;k<nc;k++){ const a=k/nc*Math.PI*2, x=cx+Math.cos(a)*rc, z=cz+Math.sin(a)*rc; ruinColumn(B,'doric',mT(x,y0,z),hc,0.26,'stone'); col(x-0.3,y0,z-0.3,x+0.3,y0+hc,z+0.3); }
      B.cyl(wk,R*0.55,R*0.55,hc,24,mT(cx,y0,cz)); col(cx-R*0.5,y0,cz-R*0.5,cx+R*0.5,y0+hc,cz+R*0.5);
      B.cyl('stone',rc+0.42,rc+0.42,0.55,32,mT(cx,y0+hc,cz),true); B.cyl('band',rc+0.44,rc+0.44,0.35,32,mT(cx,y0+hc+0.55,cz),true); B.cyl('stone',rc+0.6,rc+0.5,0.2,32,mT(cx,y0+hc+0.9,cz));
      B.cone('roofTile',rc+0.7,1.4,24,mT(cx,y0+hc+1.1,cz)); break; }   // a round Doric shrine on three steps
    case 'pylon': { const by=yb, top=yb+Ht, s=half, w=s*0.92;   // battered tower: a square frustum, a torus roll on its edges, a cavetto cornice
      B.cyl(wk,s*1.414,w*1.414,Ht-0.9,4,mm(mT(cx,by,cz),mRY(Math.PI/4)));
      for(const [sx,sz] of P4) B.segCyl('stone',V3(cx+sx*s,by,cz+sz*s),V3(cx+sx*w,top-0.9,cz+sz*w),0.09,0.09,6);
      B.cyl('stone',w*1.414,w*1.414,0.14,4,mm(mT(cx,top-0.9,cz),mRY(Math.PI/4))); B.cyl('stone',w*1.414,(w+0.45)*1.414,0.6,4,mm(mT(cx,top-0.76,cz),mRY(Math.PI/4))); B.cyl('stone',(w+0.45)*1.414,(w+0.45)*1.414,0.16,4,mm(mT(cx,top-0.16,cz),mRY(Math.PI/4)));
      for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0,s), a=Math.atan((s-w)/(Ht-0.9)); B.box('relief',F.mid-s*0.6,by+1.2,0,F.mid+s*0.6,by+Math.min(Ht-2,5.5),0.03,mm(atF(F,0,by+1.2,0),mRX(-a),mT(0,-by-1.2,-0.02))); }
      col(cx-s,by,cz-s,cx+s,top,cz+s); break; }
    case 'ziggurat': { const s0=half, tiers=[[s0,Ht*0.42],[s0*0.68,Ht*0.28],[s0*0.42,Ht*0.22]]; let y=yb;   // stepped mud-brick mass faced in baked brick, the great stair on the south
      for(let i=0;i<tiers.length;i++){ const [s,h]=tiers[i];
        B.box(i?wk:'base',cx-s,y,cz-s,cx+s,y+h,cz+s); col(cx-s,y,cz-s,cx+s,y+h,cz+s);
        for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0,s), nb=Math.max(2,Math.round((2*s)/1.1)); for(let k=0;k<=nb;k++){ const u=F.uA+(F.uB-F.uA)*k/nb; B.box(i?wk:'base',u-0.16,y,0,u+0.16,y+h-0.05,0.12,F.M); } }
        y+=h; }
      const st0=tiers[0], L=st0[1], run=Math.min(st0[0]+0.2,L*1.6), stepN=Math.max(6,Math.round(L/0.25)), sw=1.1;   // the central flight to the first terrace
      const prof=[[0,0]]; for(let k=0;k<stepN;k++){ prof.push([run*(k/stepN),L*(k+1)/stepN],[run*((k+1)/stepN),L*(k+1)/stepN]); } prof.push([run,0]);
      B.ext('base',dedupe(prof),null,sw,mm(mT(cx-sw/2,yb,cz+st0[0]+run),mRY(Math.PI/2)));
      for(let k=0;k<stepN;k++){ const z1=cz+st0[0]+run-run*k/stepN, z0=z1-run/stepN; col(cx-sw/2,yb,z0,cx+sw/2,yb+L*(k+1)/stepN,z1); }
      for(const sx of [-1,1]) B.box('base',cx+sx*(sw/2+0.12)-0.12,yb,cz+st0[0],cx+sx*(sw/2+0.12)+0.12,yb+L*0.9,cz+st0[0]+run*0.9);
      B.box(wk,cx-tiers[2][0]*0.6,y,cz-tiers[2][0]*0.6,cx+tiers[2][0]*0.6,y+2.2,cz+tiers[2][0]*0.6); break; }   // the high shrine
    case 'kaaba': { const s=half; for(let i=0;i<3;i++){ const e=s+0.6-i*0.2; B.box('stone',cx-e,yb+i*0.22,cz-e,cx+e,yb+(i+1)*0.22,cz+e); col(cx-e,yb+i*0.22,cz-e,cx+e,yb+(i+1)*0.22,cz+e); }
      const y0=yb+0.66, top=yb+Ht; B.box('stone',cx-s,y0,cz-s,cx+s,top-0.4,cz+s); col(cx-s,y0,cz-s,cx+s,top,cz+s);
      for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0,s); for(const v of [0.3,0.58]) for(const u of [-0.45,0.45]) B.box('shade',F.mid+u*s-0.22,y0+(top-y0)*v,0,F.mid+u*s+0.22,y0+(top-y0)*v+0.8,0.02,F.M);
        for(let u=F.uA+0.1;u<F.uB-0.1;u+=0.3) B.box('stone',u,top-0.55,0,u+0.15,top-0.4,0.12,F.M); if(d===1){ B.box('shade',F.mid-0.45,y0+(top-y0)*0.42,0,F.mid+0.45,y0+(top-y0)*0.42+1.6,0.03,F.M); } }
      B.box('stone',cx-s-0.12,top-0.4,cz-s-0.12,cx+s+0.12,top,cz+s+0.12); break; }   // a square stone tower with dark blind windows and a dentil cornice
    case 'prasat': { const s=half; let y=yb; for(let i=0;i<3;i++){ const e=s+0.6-i*0.25; B.box('base',cx-e,y,cz-e,cx+e,y+0.35,cz+e); col(cx-e,y,cz-e,cx+e,y+0.35,cz+e); y+=0.35; }
      const sb=s*0.62, hb=Math.min(Ht*0.36,4.2); B.box(wk,cx-sb,y,cz-sb,cx+sb,y+hb,cz+sb); col(cx-sb-0.4,y,cz-sb-0.4,cx+sb+0.4,y+hb,cz+sb+0.4);
      for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0,sb); B.box(wk,F.mid-0.75,y,0,F.mid+0.75,y+hb*0.85,0.4,F.M); B.box(d===1?'shade':'stone',F.mid-0.42,y+0.1,0.4,F.mid+0.42,y+hb*0.62,0.42,F.M);
        B.box('stone',F.mid-0.62,y+hb*0.62,0.38,F.mid+0.62,y+hb*0.75,0.48,F.M); B.ext('stone',[[-0.75,0],[0.75,0],[0,0.9]],null,0.12,atF(F,F.mid,y+hb*0.75,0.3));
        for(const u of [F.uA+0.18,F.uB-0.18]) B.box(wk,u-0.2,y,0,u+0.2,y+hb,0.18,F.M); }
      y+=hb; const faces=rng.chance(0.5); let sw=sb, th=Math.max(0.8,(Ht-hb-1.5-1.05)/5);
      for(let k=0;k<5;k++){ const s1=sw*0.86; B.box(wk,cx-sw,y,cz-sw,cx+sw,y+0.14,cz+sw); B.cyl(wk,sw*1.414*0.995,s1*1.414,th+0.01,4,mm(mT(cx,y+0.13,cz),mRY(Math.PI/4)));
        for(const [sx,sz] of P4) B.cone('stone',0.13,0.55,4,mT(cx+sx*sw*0.95,y+0.14,cz+sz*sw*0.95));
        for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0,sw); B.cone('stone',0.14,0.5,4,atF(F,F.mid,y+0.14,-0.05));
          if(faces&&k===0){ const Fm=atF(F,F.mid,y+0.2,-0.02); B.box('stone',-0.45,0,0,0.45,th*0.95,0.12,Fm); B.box('stone',-0.3,th*0.62,0.12,0.3,th*0.68,0.16,Fm); B.box('stone',-0.06,th*0.32,0.12,0.06,th*0.62,0.2,Fm); B.box('stone',-0.22,th*0.18,0.12,0.22,th*0.26,0.17,Fm); } }   // Bayon faces on the first tier
        y+=0.14+th; sw=s1; }
      B.lathe('stone',[[0,0],[sw*0.9,0],[sw*0.95,0.3],[sw*0.6,0.8],[sw*0.25,1.25],[0,1.45]],12,mT(cx,y,cz)); break; }   // the lotus bud
    case 'torreon': { const R=half, top=yb+Ht; for(let k=0;k<5;k++) B.ico('granite',rng.range(0.6,1.0),mm(mT(cx+rng.range(-R,R),yb+0.2,cz+rng.range(-R,R)),mS(1.3,0.6,1.1)),1);
      B.cyl(wk,R,R,Ht-0.3,24,mT(cx,yb,cz)); col(cx-R,yb,cz-R,cx+R,top,cz+R);
      for(const a of [0.4,1.9,3.5]){ const M=mm(mT(cx,yb+Ht*0.55,cz),mRY(a),mT(0,0,R-0.05)); B.ext('shade',[[-0.32,0],[0.32,0],[0.22,0.95],[-0.22,0.95]],null,0.08,M); }
      B.cyl('stone',R+0.05,R+0.05,0.3,24,mT(cx,top-0.3,cz)); break; }   // the curved tower over the sacred rock, with trapezoid windows
    case 'conical': { const R=half, rAt=f=>R*(1-0.45*Math.pow(f,1.3)), n=7;   // the solid conical tower of the Great Enclosure, in courses so the dry-stone texture keeps its scale
      for(let k=0;k<n;k++){ const f0=k/n, f1=(k+1)/n; B.cyl(wk,rAt(f0),rAt(f1),Ht/n+(k<n-1?0.01:0),24,mT(cx,yb+Ht*f0,cz)); }
      col(cx-R*0.8,yb,cz-R*0.8,cx+R*0.8,yb+Ht,cz+R*0.8); break; }
    case 'cribtower': { const s=half, top=yb+Ht, th=0.9; for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0,s), a=atW(F,F.uA-0.3,0,-th/2), b=atW(F,F.uB+0.3,0,-th/2); cribRun(B,a.x,a.z,b.x,b.z,yb,top,th,rng); }
      B.box('coral',cx-s+th,yb,cz-s+th,cx+s-th,yb+Ht*0.4,cz+s-th); col(cx-s,yb,cz-s,cx+s,top,cz+s); break; }   // a basalt bastion, crib-laid, coral-filled
  }
}

/* ============================================================
   GREEBLES — ten for each site. Each draws in P.M (its spot, turned to face P.a) and may add colliders with P.col
   (local box) so the walker cannot pass through anything waist-high.
   ============================================================ */
const wp=(M,x,y,z)=>V3(x,y,z).applyMatrix4(M);
const tilt=(M,x,y,z,rx,ry,rz)=>mm(M,mT(x,y,z),mRY(ry||0),mRX(rx||0),mRZ(rz||0));
// a drum or shaft lying on its side along local x, centred at (x, ·, z)
const lying=(M,x,z,r,yaw,roll)=>mm(M,mT(x,r,z),mRY(yaw||0),mRX(roll||0),mRZ(Math.PI/2));
function capitalPersian(B,cm,T,r){ B.lathe(cm,[[r*1.02,0],[r*1.32,0.12],[r*1.1,0.3],[0,0.3]],16,T); B.box(cm,-r*0.9,0.3,-r*0.75,r*0.9,0.5,r*0.75,T);
  for(const sg of [-1,1]){ const Bm=mm(T,mT(sg*r*0.95,0.5,0)); B.box(cm,-r*0.95,0,-r*0.6,r*0.95,0.6,r*0.6,Bm); B.box(cm,sg*r*0.6,0.22,-r*0.34,sg*(r*0.6+0.55),0.72,r*0.34,Bm);
    for(const sz of [-1,1]){ B.cone(cm,0.05,0.28,5,mm(Bm,mT(sg*(r*0.6+0.35),0.72,sz*r*0.25),mRZ(-sg*0.6))); B.box(cm,sg*r*0.2,-0.02,sz*r*0.3-0.09,sg*(r*0.2+0.45),0.16,sz*r*0.3+0.09,Bm); } } }
function frond(B,k,M,L,w,droop){ const P=[[0,0]]; const n=6; for(let i=1;i<=n;i++){ const t=i/n; P.push([t*L,-droop*t*t*L+w*Math.sin(t*Math.PI)]); } for(let i=n-1;i>=1;i--){ const t=i/n; P.push([t*L,-droop*t*t*L-w*Math.sin(t*Math.PI)*0.2]); }
  B.ext(k,dedupe(P),null,0.015,M); }
const RG={
  /* ---- Greece ---- */
  drums(B,P){ const r=P.rng.range(0.36,0.44), n=P.rng.int(2,4); let x=0; for(let i=0;i<n;i++){ const L=P.rng.range(0.8,1.1); flutedShaft(B,'stone',lying(P.M,x+L,P.rng.range(-0.15,0.15),r,P.rng.range(-0.12,0.12),P.rng.f()*6),r,L,20); x+=L+P.rng.range(0.02,0.25); }
    flutedShaft(B,'stone',mm(P.M,mT(-0.6,0,0)),r,P.rng.range(0.4,1.2),20); P.col(-1.1,0,-r,x,2*r,r); },
  doricCap(B,P){ const M=tilt(P.M,0,0.62,0,P.rng.range(1.25,1.75),0,P.rng.range(-0.2,0.2)); B.lathe('stone',[[0.36,0],[0.38,0.05],[0.52,0.24],[0.55,0.3],[0,0.3]],16,M); B.box('stone',-0.6,0.3,-0.6,0.6,0.55,0.6,M); B.cyl('stone',0.36,0.36,0.25,16,mm(M,mT(0,-0.25,0))); P.col(-0.65,0,-0.65,0.65,1.2,0.65); },
  architrave(B,P){ const M=tilt(P.M,0,0,0,0,0,P.rng.range(-0.08,0.08)); B.box('stone',-1.4,0,-0.35,1.4,0.75,0.35,M); B.box('band',-1.4,0.75,-0.32,1.4,1.3,0.32,M); B.box('stone',-1.45,1.3,-0.42,1.45,1.42,0.42,M); P.col(-1.45,0,-0.42,1.45,1.42,0.42); },
  pediment(B,P){ const M=tilt(P.M,0,0.3,0,-Math.PI/2+P.rng.range(0.06,0.2),0,0); B.ext('stone',[[-2,0],[2,0],[0,0.8]],null,0.45,M); B.ext('stone',[[-2.15,-0.05],[2.15,-0.05],[0,0.88],[0,0.8],[-2,0.0]],null,0.1,mm(M,mT(0,0,0.45))); },
  torso(B,P){ B.box('stone',-0.45,0,-0.4,0.45,0.75,0.4,P.M); B.box('stone',-0.5,0.75,-0.45,0.5,0.85,0.45,P.M); const M=tilt(P.M,0,0.85,0,0,0,P.rng.range(-0.06,0.06));
    B.box('marble',-0.12,0,-0.08,-0.02,0.85,0.1,M); B.box('marble',0.02,0,-0.08,0.12,0.85,0.1,M); B.lathe('marble',[[0,0],[0.2,0],[0.23,0.3],[0.2,0.6],[0.24,0.8],[0.28,1.0],[0.16,1.12],[0.06,1.2],[0,1.2]],10,mm(M,mT(0,0.8,0),mS(1,1,0.72)));
    B.segCyl('marble',wp(M,0.26,1.75,0),wp(M,0.36,1.25,0.05),0.07,0.06,6); P.col(-0.5,0,-0.45,0.5,2.1,0.45); },
  stele(B,P){ const M=tilt(P.M,0,0,0,P.rng.range(-0.08,0.04),0,P.rng.range(-0.05,0.05)); B.box('stone',-0.5,0,-0.25,0.5,0.3,0.25,M);
    B.ext('stone',[[-0.36,0],[0.36,0],[0.36,1.5],[0.2,1.62],[0.26,1.78],[0,1.92],[-0.26,1.78],[-0.2,1.62],[-0.36,1.5]],null,0.14,mm(M,mT(0,0.3,-0.07))); B.box('relief',-0.3,0.45,0.07,0.3,1.65,0.085,M); P.col(-0.5,0,-0.25,0.5,2.2,0.25); },
  altar(B,P){ const s=P.s||1, M=mm(P.M,mS(s,s,s)); B.box('stone',-1.2,0,-0.6,1.2,0.12,0.6,M); B.box('stone',-1.05,0.12,-0.5,1.05,0.9,0.5,M); B.box('stone',-1.15,0.9,-0.58,1.15,1.02,0.58,M);
    for(const sx of [-1,1]) B.cyl('stone',0.14,0.14,1.1,10,mm(M,mT(sx*1.0,1.16,-0.55),mRX(Math.PI/2))); B.box('stone',-0.6,0,0.6,0.6,0.3,1.0,M); P.col(-1.2*s,0,-0.6*s,1.2*s,1.2*s,0.6*s); },
  pithos(B,P){ const prof=[[0,0],[0.22,0],[0.5,0.45],[0.58,0.85],[0.45,1.25],[0.28,1.38],[0.3,1.48],[0.26,1.5],[0.24,1.38],[0,1.36]];
    B.lathe('clayp',prof,14,P.M); B.lathe('clayp',prof,14,mm(P.M,mT(1.4,0.55,0.3),mRY(P.rng.f()*6),mRX(Math.PI/2*0.96))); P.col(-0.6,0,-0.6,0.6,1.5,0.6); },
  marblePile(B,P){ const n=P.rng.int(4,7); for(let i=0;i<n;i++){ const w=P.rng.range(0.5,1.1), h=P.rng.range(0.35,0.6), d=P.rng.range(0.4,0.7), y=i<3?0:0.4;
      B.box('marble',-w/2,0,-d/2,w/2,h,d/2,tilt(P.M,P.rng.range(-1,1),y,P.rng.range(-0.8,0.8),P.rng.range(-0.2,0.2),P.rng.f()*3,P.rng.range(-0.2,0.2))); } P.col(-1.2,0,-1.0,1.2,0.9,1.0); },
  cypress(B,P){ const h=P.rng.range(5.5,8); B.cyl('trunk',0.14,0.1,0.8,6,P.M); B.lathe('leaf2',[[0,0],[0.5,0.2],[0.62,h*0.3],[0.48,h*0.7],[0.18,h-0.6],[0,h-0.6]],10,mm(P.M,mT(0,0.6,0))); P.col(-0.3,0,-0.3,0.3,2,0.3); },
  /* ---- Rome ---- */
  corinthCap(B,P){ const M=tilt(P.M,0,0.62,0,P.rng.range(1.3,1.7),P.rng.f()*6,0); B.lathe('marble',[[0.32,0],[0.36,0.2],[0.44,0.62],[0.5,0.78],[0,0.78]],14,M);
    for(let ring=0;ring<2;ring++) for(let k=0;k<8;k++){ const a=(k+ring*0.5)/8*Math.PI*2, Ml=mm(M,mRY(a),mT(0,0.02+ring*0.24,0.33+ring*0.04),mRX(-0.25)); B.ext('marble',[[-0.1,0],[0.1,0],[0.08,0.28],[0,0.36],[-0.08,0.28]],null,0.05,Ml); }
    B.box('marble',-0.6,0.78,-0.6,0.6,0.92,0.6,M); for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]) B.torus('marble',0.07,0.03,Math.PI*1.6,mm(M,mT(sx*0.5,0.72,sz*0.5),mRY(Math.atan2(sx,sz))),4,10); P.col(-0.7,0,-0.7,0.7,1.25,0.7); },
  shaft(B,P){ const r=P.rng.range(0.32,0.42), L1=P.rng.range(2.4,3.4), L2=P.rng.range(1.4,2.2); B.cyl('granite',r,r,L1,14,lying(P.M,L1/2,0,r,0.06)); B.cyl('granite',r,r*0.97,L2,14,lying(P.M,L1/2+L2+0.25,0.25,r,-0.12)); P.col(-L1/2,0,-r-0.3,L1/2+L2+0.35,2*r,r+0.3); },
  pilae(B,P){ const n=4, g=0.5; B.box('shade',-1.15,-0.02,-1.15,1.15,0.004,1.15,P.M); for(let i=0;i<n;i++) for(let j=0;j<n;j++){ if(P.rng.chance(0.15)) continue; const x=-0.75+i*g, z=-0.75+j*g; for(let k=0;k<7;k++) B.box('clayp',x-0.12,k*0.085,z-0.12,x+0.12,k*0.085+0.075,z+0.12,P.M); }
    B.box('stone',-0.6,0.62,-0.6,0.5,0.7,0.5,tilt(P.M,-0.3,0,-0.3,0.12,0.3,0)); P.col(-1.15,0,-1.15,1.15,0.7,1.15); },
  mosaic(B,P){ const pts=[]; const n=9; for(let i=0;i<n;i++){ const a=i/n*Math.PI*2, r=P.rng.range(0.9,1.6); pts.push([Math.cos(a)*r,Math.sin(a)*r]); } B.flat('mosaic',pts,mm(P.M,mT(0,0.012,0),mRX(-Math.PI/2)));
    for(let i=0;i<n;i++){ const p=pts[i], q=pts[(i+1)%n]; if(P.rng.chance(0.5)) B.box('marble',-0.04,0,-0.04,0.04,0.03,0.04,mm(P.M,mT((p[0]+q[0])/2,0.01,-(p[1]+q[1])/2))); } },
  sarcophagus(B,P){ B.box('marble',-1.15,0.12,-0.48,1.15,0.92,0.48,P.M); B.box('relief',-1.0,0.14,0.48,1.0,0.8,0.5,P.M); B.box('marble',-1.2,0.0,-0.52,1.2,0.12,0.52,P.M);
    const L=tilt(P.M,P.rng.range(-0.3,0.3),0.92,0.35,P.rng.range(0.15,0.4),P.rng.range(-0.3,0.3),0); B.ext('marble',[[-0.52,0],[0.52,0],[0,0.3]],null,2.3,mm(L,mRY(Math.PI/2),mT(0,0,-1.15)));
    P.col(-1.2,0,-0.6,1.2,1.3,0.6); },
  pedestal(B,P){ B.box('marble',-0.65,0,-0.65,0.65,0.25,0.65,P.M); B.box('marble',-0.52,0.25,-0.52,0.52,1.45,0.52,P.M); B.box('relief',-0.42,0.45,0.52,0.42,1.25,0.535,P.M); B.box('marble',-0.62,1.45,-0.62,0.62,1.62,0.62,P.M);
    B.box('marble',-0.2,1.62,-0.1,-0.04,1.72,0.18,P.M); B.box('marble',0.06,1.62,-0.14,0.22,1.7,0.16,P.M); P.col(-0.65,0,-0.65,0.65,1.75,0.65); },
  amphorae(B,P){ const prof=[[0,0],[0.05,0.05],[0.2,0.35],[0.26,0.62],[0.2,0.85],[0.08,0.95],[0.07,1.12],[0.09,1.15],[0,1.15]]; const n=P.rng.int(3,6);
    for(let i=0;i<n;i++){ const up=i<2, M=up? tilt(P.M,i*0.55-0.3,0,P.rng.range(-0.2,0.2),P.rng.range(-0.3,0.3),0,P.rng.range(-0.3,0.3)) : tilt(P.M,P.rng.range(-0.8,0.8),0.26,P.rng.range(0.3,0.9),Math.PI/2,P.rng.f()*6,0);
      B.lathe('clayp',prof,10,M); B.torus('clayp',0.12,0.02,Math.PI,mm(M,mT(0,0.95,0)),4,8); } P.col(-0.7,0,-0.4,0.7,1.15,1.0); },
  brickHeap(B,P){ for(let i=0;i<3;i++) B.ico('wall',P.rng.range(0.5,0.8),tilt(P.M,P.rng.range(-0.8,0.8),0.15,P.rng.range(-0.6,0.6),P.rng.f(),P.rng.f()*3,0),0);
    for(let i=0;i<10;i++) B.box('clayp',-0.2,0,-0.1,0.2,0.05,0.1,tilt(P.M,P.rng.range(-1.4,1.4),P.rng.range(0,0.3),P.rng.range(-1.1,1.1),P.rng.range(-0.4,0.4),P.rng.f()*3,P.rng.range(-0.4,0.4))); P.col(-1.0,0,-0.8,1.0,0.75,0.8); },
  labrum(B,P){ B.lathe('marble',[[0,0],[0.35,0],[0.3,0.12],[0.16,0.25],[0.13,0.7],[0.2,0.82],[0,0.82]],12,P.M); B.lathe('marble',[[0,0],[0.3,0.0],[0.85,0.16],[1.0,0.24],[0.96,0.3],[0.8,0.22],[0,0.12]],20,mm(P.M,mT(0,0.82,0))); P.col(-1,0,-1,1,1.15,1); },
  milestone(B,P){ B.box('stone',-0.4,0,-0.4,0.4,0.35,0.4,P.M); const M=tilt(P.M,0,0.35,0,P.rng.range(-0.12,0.12),0,P.rng.range(-0.12,0.12)); B.cyl('stone',0.3,0.28,1.9,14,M); B.cyl('relief',0.305,0.305,0.6,14,mm(M,mT(0,1.0,0)),true); P.col(-0.4,0,-0.4,0.4,2.3,0.4); },
  /* ---- Egypt ---- */
  obelisk(B,P){ if(P.rng.chance(0.6)){ const h=P.rng.range(7,10), r0=0.55, r1=0.36; B.box('stone',-0.85,0,-0.85,0.85,0.5,0.85,P.M); B.cyl('stone',r0*1.414,r1*1.414,h,4,mm(P.M,mT(0,0.49,0),mRY(Math.PI/4))); 
      B.cone('stone',r1*1.414,0.58,4,mm(P.M,mT(0,0.5+h,0),mRY(Math.PI/4))); P.col(-0.85,0,-0.85,0.85,h,0.85); return; }
    const L1=P.rng.range(3,4.5), L2=P.rng.range(2.5,3.5); B.cyl('stone',0.55*1.414,0.46*1.414,L1,4,mm(lying(P.M,0,0,0.5,0.1),mRY(Math.PI/4))); B.cyl('stone',0.45*1.414,0.36*1.414,L2,4,mm(lying(P.M,-L1-0.3,0.5,0.45,-0.15),mRY(Math.PI/4)));
    B.cone('stone',0.36*1.414,0.6,4,mm(lying(P.M,-L1-L2-0.4,0.62,0.36,0.2),mRY(Math.PI/4))); P.col(-L1-L2-1.0,0,-0.7,0.3,1.0,1.2); },
  sphinx(B,P){ B.box('stone',-1.7,0,-0.7,1.7,0.55,0.7,P.M); const M=mm(P.M,mT(0,0.55,0)); B.box('stone',-1.4,0.002,-0.42,0.6,0.7,0.42,M); B.sphere('stone',0.45,mm(M,mT(-1.0,0.45,0),mS(1.1,0.9,1)),10,6);
    for(const sz of [-1,1]) B.box('stone',0.4,0.004,sz*0.28-0.13,1.55,0.2,sz*0.28+0.13,M); B.box('stone',0.45,0.006,-0.32,0.95,1.1,0.32,M);
    B.box('stone',0.55,1.05,-0.24,0.93,1.5,0.24,M); B.ext('stone',[[-0.42,0],[0.42,0],[0.3,0.55],[-0.3,0.55]],null,0.42,mm(M,mT(0.6,0.95,0),mRY(Math.PI/2),mT(0,0,-0.21))); B.box('stone',0.95,1.1,-0.08,1.0,1.4,0.08,M); P.col(-1.7,0,-0.7,1.7,2.1,0.7); },
  colossus(B,P){ B.box('stone',-1.6,0,-1.1,1.6,0.75,1.1,P.M); const M=mm(P.M,mT(0,0.75,0));
    for(const sx of [-0.65,0.65]){ B.box('stone',sx-0.45,0,-0.2,sx+0.45,0.45,1.0,M); B.cyl('stone',0.42,0.42,0.35,10,mm(M,mT(sx,0,0.95),mRX(Math.PI/2),mS(1,1,0.5))); B.cyl('stone',0.42,0.36,P.rng.range(0.8,1.9),10,mm(M,mT(sx,0.3,-0.1))); }
    B.box('stone',-1.5,0,-1.05,1.5,P.rng.range(1.2,2.2),-0.45,M); P.col(-1.6,0,-1.1,1.6,2.8,1.1); },
  papyrusDrums(B,P){ const n=P.rng.int(2,3); let x=0; for(let i=0;i<n;i++){ const r=P.rng.range(0.55,0.7), L=P.rng.range(0.9,1.3), M=lying(P.M,x+L,P.rng.range(-0.2,0.2),r,P.rng.range(-0.15,0.15));
      B.cyl('stone',r,r,L,12,M); for(let k=0;k<6;k++){ const a=k/6*Math.PI*2; B.cyl('stone',0.13,0.13,L-0.02,6,mm(M,mT(Math.cos(a)*r*0.92,0.01,Math.sin(a)*r*0.92))); } x+=L+P.rng.range(0.1,0.4); } P.col(-0.2,0,-0.9,x+0.3,1.4,0.9); },
  cavettoBlock(B,P){ const M=tilt(P.M,0,0,0,0,0,P.rng.range(-0.1,0.1)); B.box('stone',-1.0,0,-0.4,1.0,0.45,0.25,M);
    B.ext('stone',[[0,0],[0.1,0],[0.13,0.1],[0.2,0.3],[0.34,0.48],[0.42,0.55],[0.42,0.66],[0,0.66]].map(p=>[p[0]+0.25,p[1]+0.45]).concat([[0.25,0.45+0.66],[-0.4,1.11],[-0.4,0.45]]).reverse(),null,2.0,mm(M,mT(-1.0,0,0),mRY(Math.PI/2),mRY(Math.PI),mT(0,0,-2.0)));
    P.col(-1.0,0,-0.45,1.0,1.15,0.7); },
  glyphBlock(B,P){ const n=P.rng.int(2,4); for(let i=0;i<n;i++){ const w=P.rng.range(0.8,1.3), h=P.rng.range(0.5,0.8), d=P.rng.range(0.5,0.8), y=i===n-1&&n>2?0.6:0;
      B.box('relief',-w/2,0,-d/2,w/2,h,d/2,tilt(P.M,(i-(n-1)/2)*1.1*(y?0.3:1),y,P.rng.range(-0.3,0.3),P.rng.range(-0.15,0.15),P.rng.range(-0.5,0.5),P.rng.range(-0.15,0.15))); } P.col(-1.8,0,-0.6,1.8,1.3,0.6); },
  offering(B,P){ B.box('stone',-0.3,0,-0.3,0.3,0.6,0.3,P.M); B.box('stone',-0.6,0.6,-0.45,0.6,0.78,0.45,P.M); B.box('stone',-0.08,0.66,0.45,0.08,0.74,0.65,P.M);
    for(const [x,z] of [[-0.3,-0.15],[0.0,-0.18],[0.3,-0.15],[-0.15,0.15],[0.15,0.15]]) B.cyl('stone',0.1,0.08,0.06,8,mm(P.M,mT(x,0.78,z))); P.col(-0.6,0,-0.45,0.6,0.85,0.65); },
  stelaR(B,P){ const M=tilt(P.M,0,0,0,P.rng.range(-0.06,0.03),0,0); const pts=[[-0.5,0],[0.5,0],[0.5,1.6]]; for(let i=1;i<10;i++){ const a=i/10*Math.PI; pts.push([Math.cos(a)*0.5,1.6+Math.sin(a)*0.5]); } pts.push([-0.5,1.6]);
    B.ext('stone',pts,null,0.24,mm(M,mT(0,0,-0.12))); B.box('relief',-0.42,0.2,0.12,0.42,1.8,0.135,M); B.box('stone',-0.6,0,-0.3,0.6,0.2,0.3,P.M); P.col(-0.6,0,-0.3,0.6,2.1,0.3); },
  datepalm(B,P){ const h=P.rng.range(6,9), lean=P.rng.range(-0.3,0.3); let p=wp(P.M,0,0,0); const n=6;
    for(let i=1;i<=n;i++){ const t=i/n, q=wp(P.M,lean*t*t*h*0.25,t*h,0); B.segCyl('trunk',p,q,0.24-0.06*t,0.22-0.06*t,7); p=q; }
    const top=mm(mT(p.x,p.y,p.z)); for(let k=0;k<14;k++) frond(B,'palmleaf',mm(top,mRY(k/14*Math.PI*2+P.rng.f()*0.2),mRZ(P.rng.range(0.0,0.5))),P.rng.range(2,2.8),0.28,0.35);
    for(let k=0;k<4;k++) B.sphere('clayp',0.16,mm(top,mT(Math.cos(k*1.6)*0.35,-0.35,Math.sin(k*1.6)*0.35),mS(1,1.5,1)),6,4); P.col(-0.3,0,-0.3,0.3,2.5,0.3); },
  dune(B,P){ const L=P.rng.range(2.5,4.5), W=P.rng.range(1.6,2.4), h=P.rng.range(0.45,0.8); B.sphere('sand',1,mm(P.M,mT(0,-h*0.25,0),mS(L/2,h,W/2)),14,6); },
  /* ---- Mesopotamia ---- */
  lamassu(B,P){ const M=P.M; B.box('base',-1.5,0,-0.55,1.5,0.3,0.55,M); B.box('stone',-1.25,1.0,-0.45,0.95,2.1,0.45,M);
    for(const [x,z] of [[-1.05,-0.28],[-1.05,0.28],[0.55,-0.28],[0.85,0.28],[0.78,-0.28]]) B.box('stone',x-0.14,0.3,z-0.13,x+0.14,1.05,z+0.13,M);
    B.ext('relief',[[-1.2,0],[0.7,0],[0.9,0.25],[0.2,0.95],[-1.25,0.7]],null,0.06,mm(M,mT(0,1.9,0.42))); B.ext('relief',[[-1.2,0],[0.7,0],[0.9,0.25],[0.2,0.95],[-1.25,0.7]],null,0.06,mm(M,mT(0,1.9,-0.48)));
    B.box('stone',0.8,1.9,-0.32,1.35,2.55,0.32,M); B.box('stone',1.2,1.75,-0.22,1.45,2.15,0.22,M); B.cyl('stone',0.3,0.34,0.5,10,mm(M,mT(1.05,2.55,0))); B.torus('stone',0.33,0.03,Math.PI*2,mm(M,mT(1.05,2.7,0),mRX(Math.PI/2)),4,12); P.col(-1.5,0,-0.55,1.5,3.1,0.55); },
  tablets(B,P){ const jar=[[0,0],[0.18,0],[0.32,0.25],[0.34,0.45],[0.25,0.62],[0.2,0.66],[0,0.66]]; B.latheArc('clayp',jar,10,tilt(P.M,0,0.3,0,Math.PI/2*0.9,P.rng.f()*6,0),0.5,4.6);
    for(let i=0;i<12;i++) B.box('relief',-0.06,0,-0.045,0.06,0.03,0.045,tilt(P.M,P.rng.range(-0.2,0.9),P.rng.range(0,0.08),P.rng.range(-0.5,0.5),P.rng.range(-0.3,0.3),P.rng.f()*6,P.rng.range(-0.3,0.3))); },
  pithosM(B,P){ const prof=[[0,0],[0.3,0],[0.55,0.4],[0.6,0.8],[0.45,1.15],[0.25,1.25],[0.28,1.32],[0,1.3]]; const n=P.rng.int(2,3);
    for(let i=0;i<n;i++){ const M=mm(P.M,mT(i*1.1-(n-1)*0.55,-0.75,P.rng.range(-0.2,0.2))); B.lathe('clayp',prof,12,M); B.torus('shade',0.47,0.03,Math.PI*2,mm(M,mT(0,1.12,0),mRX(Math.PI/2)),3,14); } P.col(-n*0.55,0,-0.6,n*0.55,0.6,0.6); },
  glazePanel(B,P){ const M=tilt(P.M,0,0,0,-P.rng.range(0.15,0.35),0,0); B.box('base',-1.2,0,-0.18,1.2,1.6,0.0,M); B.box('glaze',-1.15,0.05,0.0,1.15,1.55,0.015,M); P.col(-1.2,0,-0.4,1.2,1.6,0.3); },
  mound(B,P){ const n=P.rng.int(2,3); for(let i=0;i<n;i++) B.sphere('mudm',1,tilt(P.M,P.rng.range(-0.9,0.9),-0.1,P.rng.range(-0.7,0.7),0,P.rng.f()*3,0).multiply(mS(P.rng.range(0.9,1.5),P.rng.range(0.35,0.6),P.rng.range(0.7,1.1))),10,6); },
  reeds(B,P){ for(let i=0;i<6;i++){ const row=i<4?0:1; B.cyl('reed',0.12,0.1,2.6,7,lying(P.M,1.3,(i%4)*0.24-0.36+row*0.12,0.12+row*0.2,P.rng.range(-0.05,0.05))); }
    B.box('reed',-1.3,0,0.7,0.6,0.025,1.6,tilt(P.M,0,0,0,0,P.rng.range(-0.3,0.3),0)); },
  drain(B,P){ for(const z of [-0.3,0.3]) for(let x=-1.6;x<1.6;x+=0.4) B.box('base',x,0,z-0.12,x+0.38,0.24,z+0.12,P.M); B.box('shade',-1.6,0,-0.18,1.6,0.04,0.18,P.M);
    B.cyl('clayp',0.16,0.16,0.9,10,lying(P.M,2.5,0,0.16,0.1)); },
  kudurru(B,P){ const pts=[[-0.3,0],[0.3,0],[0.32,0.9]]; for(let i=1;i<8;i++){ const a=i/8*Math.PI; pts.push([Math.cos(a)*0.32,0.9+Math.sin(a)*0.35]); } pts.push([-0.32,0.9]);
    const M=tilt(P.M,0,0,0,P.rng.range(-0.1,0.05),0,0); B.ext('basalt',pts,null,0.4,mm(M,mT(0,0,-0.2))); B.box('relief',-0.27,0.7,0.2,0.27,1.15,0.215,M); P.col(-0.35,0,-0.25,0.35,1.3,0.25); },
  tannur(B,P){ B.lathe('clayp',[[0.55,0],[0.6,0],[0.55,0.5],[0.32,0.85],[0.2,0.9],[0.16,0.88],[0.27,0.8],[0.48,0.5],[0.5,0]],14,P.M); B.cyl('shade',0.9,0.9,0.01,12,mT(...wp(P.M,0,0,0).toArray())); P.col(-0.6,0,-0.6,0.6,0.9,0.6); },
  tamarisk(B,P){ for(let i=0;i<5;i++){ const a=i/5*Math.PI*2+P.rng.f(), e=wp(P.M,Math.cos(a)*0.8,P.rng.range(1.2,1.9),Math.sin(a)*0.8); B.segCyl('trunk',wp(P.M,0,0,0),e,0.08,0.04,5); B.ico('leaf2',P.rng.range(0.45,0.7),mm(mT(e.x,e.y+0.2,e.z),mS(1,1.3,1)),1); } },
  /* ---- Persepolis ---- */
  bullCap(B,P){ const r=0.36, T=tilt(P.M,0,0.75,0,0,P.rng.f()*6,Math.PI/2*0.95); capitalPersian(B,'stone',T,r); P.col(-1.4,0,-1.0,1.4,1.5,1.0); },
  bellBase(B,P){ const r=0.36; B.lathe('stone',[[0,0],[r*2.0,0],[r*2.0,0.1],[r*1.75,0.28],[r*1.35,0.55],[r*1.25,0.68],[r*1.45,0.78],[r*1.05,0.92],[0,0.92]],16,P.M);
    if(P.rng.chance(0.6)) flutedShaft(B,'stone',mm(P.M,mT(0,0.92,0)),r,P.rng.range(0.4,1.6),32); P.col(-0.75,0,-0.75,0.75,1.4,0.75); },
  flutedDrum(B,P){ const r=0.36, n=P.rng.int(2,3); let x=0; for(let i=0;i<n;i++){ const L=P.rng.range(0.9,1.4); flutedShaft(B,'stone',lying(P.M,x+L,P.rng.range(-0.2,0.2),r,P.rng.range(-0.2,0.2),P.rng.f()*6),r,L,32); x+=L+0.25; } P.col(-0.1,0,-0.6,x,0.8,0.6); },
  portalFrame(B,P){ const w=P.rng.range(1.3,1.7), h=P.rng.range(3.0,3.8), jw=0.55, d=0.9; for(const sx of [-1,1]){ B.box('rframe',sx*w/2,0,-d/2,sx*(w/2+jw),h,d/2,P.M); B.box('relief',sx*w/2-sx*0.005,0.4,-0.3,sx*w/2,h-0.5,0.3,P.M); P.col(Math.min(sx*w/2,sx*(w/2+jw)),0,-d/2,Math.max(sx*w/2,sx*(w/2+jw)),h,d/2); }
    if(P.rng.chance(0.7)){ B.box('rframe',-w/2-jw-0.05,h,-d/2-0.02,w/2+jw+0.05,h+0.55,d/2+0.02,P.M); B.box('rframe',-w/2-jw-0.25,h+0.55,-d/2-0.2,w/2+jw+0.25,h+0.8,d/2+0.2,P.M); }
    B.box('stone',-w/2-jw-0.1,0,-d/2-0.1,w/2+jw+0.1,0.12,d/2+0.1,P.M); },
  reliefSlab(B,P){ const M=tilt(P.M,0,0,0,P.rng.range(-0.06,0.02),0,0); B.box('stone',-1.3,0,-0.3,1.3,1.5,0.0,M); B.box('relief',-1.2,0.1,0.0,1.2,1.4,0.015,M);
    for(let u=-1.2;u<1.2;u+=0.48) B.ext('stone',[[0,0],[0.4,0],[0.4,0.12],[0.32,0.12],[0.32,0.24],[0.24,0.24],[0.2,0.36],[0.16,0.24],[0.08,0.24],[0.08,0.12],[0,0.12]],null,0.25,mm(M,mT(u,1.5,-0.28))); P.col(-1.3,0,-0.35,1.3,1.9,0.1); },
  merlon(B,P){ const shape=[[0,0],[0.6,0],[0.6,0.2],[0.48,0.2],[0.48,0.42],[0.36,0.42],[0.3,0.65],[0.24,0.42],[0.12,0.42],[0.12,0.2],[0,0.2]]; const n=P.rng.int(3,5);
    for(let i=0;i<n;i++) B.ext('stone',shape,null,0.3,tilt(P.M,P.rng.range(-1,1),0.0,P.rng.range(-0.8,0.8),i%2?-Math.PI/2:-Math.PI/2+P.rng.range(0.3,1.2),P.rng.f()*6,0)); },
  fireAltar(B,P){ const s=P.s||1, M=mm(P.M,mS(s,s,s)); B.box('stone',-0.7,0,-0.7,0.7,0.2,0.7,M); B.box('stone',-0.55,0.2,-0.55,0.55,0.4,0.55,M); B.box('stone',-0.35,0.4,-0.35,0.35,1.25,0.35,M);
    B.box('stone',-0.5,1.25,-0.5,0.5,1.4,0.5,M); B.box('stone',-0.62,1.4,-0.62,0.62,1.55,0.62,M); for(let u=-0.5;u<0.6;u+=0.25) for(const z of [-0.6,0.52]) B.box('stone',u-0.06,1.55,z,u+0.06,1.75,z+0.08,M);
    B.box('shade',-0.45,1.55,-0.45,0.45,1.57,0.45,M); P.col(-0.7*s,0,-0.7*s,0.7*s,1.75*s,0.7*s); },
  trilingual(B,P){ const M=tilt(P.M,0,0,0,-Math.PI/2+P.rng.range(0.05,0.3),0,0); B.box('stone',-0.9,0,-0.6,0.9,0.25,0.6,M);
    for(let col=0;col<3;col++) for(let r=0;r<9;r++) B.box('shade',-0.8+col*0.56,0.25,0.5-r*0.11,-0.32+col*0.56,0.255,0.47-r*0.11,M); },
  cypressRow(B,P){ for(let i=0;i<3;i++){ const h=P.rng.range(5,7); const M=mm(P.M,mT(i*1.6-1.6,0,0)); B.cyl('stone',0.55,0.55,0.25,8,M); B.cyl('trunk',0.12,0.1,0.8,6,mm(M,mT(0,0.25,0)));
      B.lathe('leaf2',[[0,0],[0.45,0.2],[0.55,h*0.3],[0.42,h*0.7],[0.15,h-0.6],[0,h-0.6]],10,mm(M,mT(0,0.8,0))); P.col(i*1.6-1.6-0.5,0,-0.5,i*1.6-1.6+0.5,2,0.5); }
    B.box('water',-2.6,0.02,0.75,2.6,0.08,0.95,P.M); B.box('stone',-2.7,0,0.65,2.7,0.1,0.75,P.M); B.box('stone',-2.7,0,0.95,2.7,0.1,1.05,P.M); return 'water'; },
  griffinCap(B,P){ const r=0.36, T=tilt(P.M,0,0.75,0,0,P.rng.f()*6,-Math.PI/2*0.95); B.box('stone',-r*0.9,0,-r*0.75,r*0.9,0.3,r*0.75,T);
    for(const sg of [-1,1]){ const Bm=mm(T,mT(sg*r*0.95,0.3,0)); B.box('stone',-r*0.95,0,-r*0.55,r*0.95,0.6,r*0.55,Bm); B.box('stone',sg*r*0.6,0.3,-r*0.28,sg*(r*0.6+0.45),0.8,r*0.28,Bm);
      B.cone('stone',0.12,0.35,6,mm(Bm,mT(sg*(r*0.6+0.45),0.5,0),mRZ(-sg*Math.PI/2))); B.box('stone',sg*r*0.6,0.8,-0.04,sg*(r*0.6+0.3),1.05,0.04,Bm); for(const sz of [-1,1]) B.box('stone',-r*0.6,0.4,sz*r*0.55,r*0.6,0.9,sz*(r*0.55+0.06),Bm); }
    P.col(-1.3,0,-0.9,1.3,1.5,0.9); },
  /* ---- Angkor ---- */
  spung(B,P){ const y=P.y, h=P.rng.range(7,11), r=P.rng.range(0.55,0.8), nx=P.nx||0, nz=P.nz||1; B.lathe('root',[[0,0],[r*1.6,0],[r*1.1,0.6],[r,1.5],[r*0.85,h*0.6],[r*0.6,h],[0,h]],12,mT(P.x,y,P.z));
    for(let k=0;k<9;k++){ const side=k%2?1:-1, along=P.rng.range(-1.6,1.6), ax=-nz*along, az=nx*along, out=side*P.rng.range(0.6,1.4);
      const p0=V3(P.x+ax*0.2,y+0.3,P.z+az*0.2), p1=V3(P.x+ax*0.6+nx*out*0.45,y-0.1,P.z+az*0.6+nz*out*0.45), p2=V3(P.x+ax+nx*out,y*0.45,P.z+az+nz*out), p3=V3(P.x+ax*1.2+nx*out*1.5,0,P.z+az*1.2+nz*out*1.5);
      const rr=P.rng.range(0.1,0.22); B.segCyl('root',p0,p1,rr*1.3,rr,6); B.segCyl('root',p1,p2,rr,rr*0.8,6); B.segCyl('root',p2,p3,rr*0.8,rr*0.6,5); }
    for(let k=0;k<5;k++){ const a=k/5*Math.PI*2, e=V3(P.x+Math.cos(a)*2.4,y+h+P.rng.range(-0.5,1.5),P.z+Math.sin(a)*2.4); B.segCyl('root',V3(P.x,y+h-0.5,P.z),e,0.22,0.1,6); B.ico('leaf',P.rng.range(1.4,2.0),mm(mT(e.x,e.y+0.6,e.z),mS(1,0.6,1)),1); } },
  roots(B,P){ const top=P.top||P.y+1.5, n=P.rng.int(3,6); for(let k=0;k<n;k++){ const u=P.rng.range(-1.2,1.2); let p=wp(P.M,u,top-P.y+0.05,0.12); const segs=4;
      for(let i=1;i<=segs;i++){ const q=wp(P.M,u+P.rng.range(-0.35,0.35),(top-P.y)*(1-i/segs)+0.05-(i===segs?P.y:0),0.1+P.rng.range(0,0.08)+(i===segs?0.4:0)); B.segCyl('root',p,q,0.11-i*0.012,0.1-i*0.012,5); p=q; } } },
  blockPile(B,P){ const n=P.rng.int(8,13); for(let i=0;i<n;i++){ const w=P.rng.range(0.45,0.8), h=P.rng.range(0.3,0.45), d=P.rng.range(0.35,0.55), lvl=i<6?0:i<10?1:2;
      B.box('stone',-w/2,0,-d/2,w/2,h,d/2,tilt(P.M,P.rng.range(-1.3,1.3)*(1-lvl*0.3),lvl*0.36,P.rng.range(-1,1)*(1-lvl*0.3),P.rng.range(-0.2,0.2),P.rng.f()*3,P.rng.range(-0.25,0.25))); } P.col(-1.3,0,-1.0,1.3,1.1,1.0); },
  naga(B,P){ for(let x=-1.4;x<=0.6;x+=1.0) B.box('stone',x-0.12,0,-0.12,x+0.12,0.55,0.12,P.M); B.cyl('stone',0.2,0.2,2.6,10,mm(P.M,mT(1.2,0.75,0),mRZ(Math.PI/2)));
    const fan=[]; for(let k=0;k<=12;k++){ const a=Math.PI*(0.1+0.8*k/12); fan.push([Math.cos(a)*0.95,Math.sin(a)*1.1]); } fan.push([0,0]);
    B.ext('stone',fan,null,0.22,mm(P.M,mT(1.35,0.55,0),mRY(Math.PI/2),mT(0,0,-0.11))); for(let k=0;k<7;k++){ const a=Math.PI*(0.12+0.76*k/6); B.sphere('stone',0.14,mm(P.M,mT(1.5,0.55+Math.sin(a)*1.0,Math.cos(a)*0.85),mS(1.3,1,1)),6,4); }
    B.box('stone',1.1,0,-0.3,1.5,0.6,0.3,P.M); P.col(-1.6,0,-0.5,1.6,1.7,0.5); },
  lionG(B,P){ B.box('stone',-0.6,0,-0.45,0.6,0.5,0.45,P.M); const M=mm(P.M,mT(0,0.5,0)); B.box('stone',-0.45,0,-0.32,0.15,0.55,0.32,M); B.box('stone',-0.05,0,-0.28,0.35,1.1,0.28,M);
    for(const sz of [-0.17,0.17]) B.box('stone',0.25,0,sz-0.08,0.45,0.7,sz+0.08,M); B.ico('stone',0.36,mm(M,mT(0.22,1.25,0),mS(0.9,1,1.1)),1); B.box('stone',0.38,1.1,-0.16,0.6,1.35,0.16,M);
    B.segCyl('stone',wp(M,-0.45,0.3,0),wp(M,-0.7,0.9,0.2),0.05,0.03,5); P.col(-0.6,0,-0.45,0.6,2.0,0.45); },
  faceBlock(B,P){ const M=tilt(P.M,0,0.55,0,-P.rng.range(0.9,1.4),P.rng.f()*6,P.rng.range(-0.2,0.2)); B.box('stone',-0.65,-0.55,-0.5,0.65,0.75,0.5,M);
    B.box('stone',-0.5,0.38,0.5,0.5,0.45,0.58,M); for(const sx of [-0.25,0.25]) B.box('stone',sx-0.14,0.22,0.5,sx+0.14,0.3,0.56,M); B.box('stone',-0.08,-0.05,0.5,0.08,0.3,0.62,M); B.box('stone',-0.24,-0.25,0.5,0.24,-0.16,0.58,M);
    P.col(-0.9,0,-0.9,0.9,1.3,0.9); },
  apsara(B,P){ const h=Math.min(1.9,(P.top||P.y+2)-P.y-0.2); if(h<0.8) return; B.box('relief',-0.45,0,0,0.45,h,0.025,P.M); B.box('stone',-0.52,-0.06,0,0.52,0.0,0.06,P.M); },
  lintel(B,P){ const M=tilt(P.M,0,0,0,0,0,P.rng.range(-0.15,0.15)); B.box('stone',-1.15,0,-0.25,1.15,0.6,0.25,M); B.box('relief',-1.1,0.05,0.25,1.1,0.55,0.265,M);
    B.box('stone',-0.22,0.12,0.26,0.22,0.5,0.4,M); for(const sx of [-0.12,0.12]) B.cone('stone',0.05,0.12,5,mm(M,mT(sx,0.18,0.4),mRX(Math.PI/2))); P.col(-1.15,0,-0.3,1.15,0.65,0.45); },
  balusters(B,P){ const h=P.hole; if(!h) return; const n=Math.max(3,Math.round((h.u1-h.u0)/0.16)), prof=[[0,0],[0.055,0],[0.055,0.05],[0.04,0.1],[0.062,0.25],[0.04,0.4],[0.055,0.5],[0.04,0.6],[0.062,0.75],[0.04,0.9],[0.055,0.95],[0.055,1],[0,1]];
    for(let i=0;i<n;i++){ const u=h.u0+(h.u1-h.u0)*(i+0.5)/n; B.lathe('stone',prof,8,mm(h.M,mT(u,h.v0,h.depth/2),mS(1,h.v1-h.v0,1))); } },
  ferns(B,P){ const n=P.rng.int(5,9); for(let k=0;k<n;k++) frond(B,'fern',mm(P.M,mRY(k/n*Math.PI*2+P.rng.f()*0.4),mRZ(-P.rng.range(0.4,0.9)),mRX(-Math.PI/2)),P.rng.range(0.5,0.9),0.12,0.1);
    B.sphere('moss',1,mm(P.M,mS(P.rng.range(0.4,0.7),0.15,P.rng.range(0.4,0.7))),8,4); },
  /* ---- Maya ---- */
  stela(B,P){ const M=tilt(P.M,0,0,0,P.rng.range(-0.08,0.04),0,P.rng.range(-0.05,0.05)); B.box('stone',-0.55,0,-0.28,0.55,3.0,0.28,M); B.box('relief',-0.5,0.15,0.28,0.5,2.9,0.295,M); B.box('relief',-0.5,0.15,-0.295,0.5,2.9,-0.28,M); P.col(-0.55,0,-0.3,0.55,3,0.3); },
  altarM(B,P){ B.cyl('stone',0.75,0.75,0.55,16,P.M); B.cyl('relief',0.76,0.76,0.35,16,mm(P.M,mT(0,0.1,0)),true); B.cyl('stone',0.7,0.7,0.04,16,mm(P.M,mT(0,0.55,0))); P.col(-0.75,0,-0.75,0.75,0.6,0.75); },
  chacmool(B,P){ B.box('stone',-1.0,0,-0.5,1.0,0.25,0.5,P.M); const M=mm(P.M,mT(0,0.25,0)); B.box('stone',-0.85,0,-0.32,0.2,0.4,0.32,tilt(M,0,0,0,0,0,0.35));
    for(const sz of [-0.18,0.18]){ B.box('stone',0.15,0,sz-0.12,0.75,0.55,sz+0.12,tilt(M,0,0,0,0,0,-0.6)); B.box('stone',0.5,0,sz-0.11,0.95,0.12,sz+0.11,M); }
    B.box('stone',-1.05,0.35,-0.2,-0.7,0.75,0.2,tilt(M,0,0,0,0,0.8,0)); B.cyl('stone',0.2,0.18,0.12,10,mm(M,mT(-0.25,0.45,0))); P.col(-1,0,-0.5,1,1.0,0.5); },
  ring(B,P){ const top=P.top||P.y+2; if(top-P.y<1.2){ B.torus('stone',0.5,0.15,Math.PI*2,mm(P.M,mT(0,0.15,0.6),mRX(Math.PI/2)),6,18); return; }
    const v=Math.min(top-P.y-0.6,2.6); B.box('stone',-0.2,v-0.2,0,0.2,v+0.2,0.25,P.M); B.torus('stone',0.5,0.13,Math.PI*2,mm(P.M,mT(0,v,0.3)),6,18); },
  combFrag(B,P){ const holes=[]; for(let u=0.3;u<2.2;u+=0.6) for(const v of [0.25,0.85]) holes.push([[u,v],[u+0.32,v],[u+0.32,v+0.38],[u,v+0.38]]);
    B.ext('stone',[[0,0],[2.6,0],[2.4,1.5],[0.2,1.5]],holes,0.3,tilt(P.M,-1.3,0.3,0,-Math.PI/2+P.rng.range(0.15,0.5),0,0)); P.col(-1.3,0,-0.2,1.3,0.9,1.6); },
  serpent(B,P){ const M=P.M; B.box('stone',-0.7,0,-0.6,0.5,1.0,0.6,M); B.box('stone',0.5,0,-0.55,1.3,0.35,0.55,M); B.box('stone',0.5,0.5,-0.55,1.25,1.0,0.55,tilt(M,0,0,0,0,0,0.12));
    for(const sz of [-0.38,-0.12,0.12,0.38]) B.cone('stone',0.06,0.25,5,mm(M,mT(1.15,0.55,sz),mRZ(Math.PI))); for(const sz of [-0.32,0.32]) B.sphere('stone',0.12,mm(M,mT(0.75,1.0,sz)),6,4);
    B.ext('stone',[[0,0],[0.5,0.3],[0.3,0.9],[0,0.6]],null,1.1,mm(M,mT(-0.6,0.9,-0.55))); P.col(-0.7,0,-0.6,1.3,1.6,0.6); },
  ceibaR(B,P){ const h=P.rng.range(8,11); B.cyl('trunk',0.75,0.55,h,10,P.M); for(let k=0;k<6;k++){ const a=k/6*Math.PI*2+0.3; B.ext('trunk',[[0,0],[1.6,0],[0,2.2]],null,0.14,mm(P.M,mRY(a),mT(0.4,0,-0.07))); }
    for(let k=0;k<6;k++){ const a=k/6*Math.PI*2; const e=wp(P.M,Math.cos(a)*3,h+0.8,Math.sin(a)*3); B.segCyl('trunk',wp(P.M,0,h-0.3,0),e,0.22,0.1,6);
      for(let j=0;j<3;j++) B.ico(j?'leaf':'leaf2',P.rng.range(1.0,1.5),mm(mT(e.x+P.rng.range(-0.9,0.9),e.y+0.3+P.rng.range(-0.2,0.5),e.z+P.rng.range(-0.9,0.9)),mS(1.2,0.6,1.2)),1); }
    P.col(-1.0,0,-1.0,1.0,3,1.0); },
  lianas(B,P){ const n=P.rng.int(3,6), top=P.y, sp=Math.min(1,P.span==null?1:P.span); for(let k=0;k<n;k++){ const u=P.rng.range(-sp,sp), side=P.rng.chance(.5)?1:-1; let p=wp(P.M,u,0,0); const L=Math.min(top-0.1,P.rng.range(1.5,3.5)), segs=5;
      for(let i=1;i<=segs;i++){ const q=wp(P.M,u+Math.sin(i*1.3+k)*0.12,-L*i/segs,side*(0.42+0.12*Math.sin(i*0.9))); B.segCyl('vine',p,q,0.03,0.025,4); if(i%2) B.ico('leaf',0.12,mT(q.x,q.y,q.z),0); p=q; } } },
  censer(B,P){ B.cyl('clayp',0.25,0.28,0.75,10,P.M); for(const sx of [-1,1]) B.box('clayp',sx*0.25,0.1,-0.05,sx*0.45,0.7,0.05,P.M); B.box('clayp',-0.18,0.35,0.24,0.18,0.7,0.3,P.M);
    B.cyl('clayp',0.32,0.3,0.08,10,mm(P.M,mT(0,0.75,0))); B.cone('clayp',0.28,0.25,10,mm(P.M,mT(0,0.83,0))); },
  glyphPanel(B,P){ const h=Math.min(1.0,(P.top||P.y+1.5)-P.y-0.15); if(h<0.6) return; B.box('relief',-0.5,0,0,0.5,h,0.03,P.M); B.box('stone',-0.56,-0.06,0,0.56,0,0.07,P.M); },
  /* ---- Inca ---- */
  intihuatana(B,P){ B.ico('granite',1.4,mm(P.M,mT(0,0.2,0),mS(1.2,0.55,1.0)),1); const M=mm(P.M,mT(0,0.85,0)); B.box('granite',-0.9,0,-0.6,0.9,0.3,0.6,M); B.box('granite',-0.6,0.3,-0.45,0.6,0.55,0.45,M);
    B.box('granite',-0.18,0.55,-0.12,0.18,1.3,0.12,tilt(M,0,0,0,0,0.3,0.06)); P.col(-1.6,0,-1.3,1.6,1.4,1.3); },
  terraces(B,P){ const c=P.site; if(!c) return; const sides=[0,1,2,3].sort(()=>P.rng.f()-0.5).slice(0,P.rng.int(1,2));
    for(const d of sides){ for(let k=0;k<3;k++){ const off=3.0+k*2.4, h=0.9*(k+1), L=(d%2? c.X1-c.X0 : c.Z1-c.Z0)+2*off;
      const b= d===0? [c.X1+off,0,-L/2,c.X1+off+2.4,h,L/2] : d===2? [c.X0-off-2.4,0,-L/2,c.X0-off,h,L/2] : d===1? [-L/2,0,c.Z1+off,L/2,h,c.Z1+off+2.4] : [-L/2,0,c.Z0-off-2.4,L/2,h,c.Z0-off];
      B.box('wall',b[0],b[1],b[2],b[3],b[4]-0.08,b[5]); B.box('grass',b[0],b[4]-0.08,b[2],b[3],b[4],b[5]); P.colW(b); } } },
  ropePegs(B,P){ const top=P.top||P.y+1; const v=top-P.y-0.35; if(v<0.8) return; const n=P.rng.int(3,6); for(let i=0;i<n;i++) B.cyl('stone',0.07,0.06,0.35,6,mm(P.M,mT((i-(n-1)/2)*0.45,v,0),mRX(Math.PI/2))); },
  batan(B,P){ B.box('granite',-0.6,0,-0.4,0.6,0.16,0.4,P.M); const pts=[]; for(let i=0;i<=8;i++){ const a=Math.PI*i/8; pts.push([Math.cos(a)*0.28,-Math.sin(a)*0.22+0.22]); }
    B.ext('granite',pts,null,0.18,tilt(P.M,P.rng.range(-0.2,0.2),0.16,-0.09,0,P.rng.range(-0.4,0.4),0)); },
  fountain(B,P){ const M=P.M; B.box('stone',-0.7,0,-0.5,0.7,0.12,0.5,M); for(const [a0,b0,a1,b1] of [[-0.7,-0.5,0.7,-0.36],[-0.7,0.36,0.7,0.5],[-0.7,-0.36,-0.56,0.36],[0.56,-0.36,0.7,0.36]]) B.box('stone',a0,0.12,b0,a1,0.4,b1,M);
    B.box('water',-0.56,0.12,-0.36,0.56,0.3,0.36,M); B.box('stone',-0.25,0,-0.75,0.25,1.4,-0.5,M); B.box('stone',-0.08,1.2,-0.5,0.08,1.28,-0.3,M); B.box('water',-0.03,0.3,-0.36,0.03,1.2,-0.32,M);
    for(let k=0;k<3;k++) B.box('stone',-0.22,0,-0.75-1.0*(k+1),0.22,0.25,-0.75-1.0*k,M); for(let k=0;k<3;k++) B.box('water',-0.06,0.2,-0.75-1.0*(k+1),0.06,0.24,-0.75-1.0*k,M); P.col(-0.7,0,-0.75,0.7,1.4,0.5); return 'water'; },
  huaca(B,P){ B.ico('granite',1.6,mm(P.M,mT(0,0.4,0),mS(1.3,0.85,1.0)),1); for(let k=0;k<4;k++) B.box('granite',-0.5,0,1.1+k*0.0-0.3*k,0.5,0.25*(k+1),1.4-0.3*k,P.M); B.box('granite',-0.8,1.0,-0.4,0.8,1.1,0.6,P.M); P.col(-2.0,0,-1.6,2.0,1.4,1.6); },
  ichu(B,P){ const n=P.rng.int(2,4); for(let j=0;j<n;j++){ const M=mm(P.M,mT(P.rng.range(-0.6,0.6),0,P.rng.range(-0.6,0.6))); for(let k=0;k<9;k++) B.cone('reed',0.035,P.rng.range(0.45,0.8),3,mm(M,mRY(k*0.7),mRX(P.rng.range(0.1,0.5)))); } },
  llama(B,P){ const M=P.M; B.sphere('wool',1,mm(M,mT(0,1.0,0),mS(0.6,0.32,0.28)),10,6); for(const [x,z] of [[0.38,0.15],[0.38,-0.15],[-0.38,0.15],[-0.38,-0.15]]) B.cyl('wool',0.055,0.045,0.85,6,mm(M,mT(x,0,z)));
    B.segCyl('wool',wp(M,0.48,1.1,0),wp(M,0.62,1.75,0),0.11,0.08,7); B.box('wool',0.55,1.72,-0.08,0.85,1.88,0.08,M); for(const sz of [-0.05,0.05]) B.cone('wool',0.025,0.16,4,mm(M,mT(0.6,1.86,sz))); B.sphere('wool',0.09,mm(M,mT(-0.6,1.05,0)),6,4); P.col(-0.65,0,-0.3,0.9,1.9,0.3); },
  polyPile(B,P){ const n=P.rng.int(4,7); for(let i=0;i<n;i++) B.ico('stone',P.rng.range(0.35,0.6),tilt(P.M,P.rng.range(-1,1),i<4?0.3:0.75,P.rng.range(-0.8,0.8),P.rng.f(),P.rng.f()*3,0).multiply(mS(P.rng.range(1,1.5),P.rng.range(0.6,0.9),P.rng.range(0.9,1.2))),0); P.col(-1.2,0,-1,1.2,1.0,1); },
  rockStair(B,P){ B.ico('granite',1.2,mm(P.M,mT(0,0.2,-0.8),mS(1.4,0.9,1.0)),1); for(let k=0;k<5;k++) B.box('stone',-0.55,0,0.4-k*0.32,0.55,0.22*(k+1),0.72-k*0.32,P.M); P.col(-1.6,0,-1.8,1.6,1.2,0.8); },
  /* ---- Nan Madol ---- */
  logs(B,P){ const n=P.rng.int(6,10); for(let i=0;i<n;i++){ const L=P.rng.range(2,3.8), a=(i%2?Math.PI/2:0)+P.rng.range(-0.3,0.3), lvl=Math.floor(i/3);
      B.cyl('basalt',0.17,0.17,L,6,lying(P.M,P.rng.range(-0.5,0.5)+L/2*Math.cos(a)*0,P.rng.range(-0.5,0.5),0.17+lvl*0.3,a,P.rng.f()*6).multiply(mT(0,-L/2,0))); } P.col(-1.8,0,-1.8,1.8,1.0,1.8); },
  crib(B,P){ const y=P.y, nx=P.nx||0, nz=P.nz||1, ax=-nz, az=nx, sp=P.span==null?1.8:P.span; for(let c=0;c<P.rng.int(2,3);c++){ const yy=y+0.17+c*0.32, L=Math.min(P.rng.range(2.6,3.6),2*sp+0.3);
      if(c%2===0) for(const s of [-0.3,0.3]) basaltLog(B,P.x-ax*L/2+nx*s,yy,P.z-az*L/2+nz*s,P.x+ax*L/2+nx*s,P.z+az*L/2+nz*s,0.17);
      else for(let k=-2;k<=2;k++) if(Math.abs(k*0.6)<=L/2) basaltLog(B,P.x+ax*k*0.6-nx*0.75,yy,P.z+az*k*0.6-nz*0.75,P.x+ax*k*0.6+nx*0.75,P.z+az*k*0.6+nz*0.75,0.17); } },
  coralMound(B,P){ B.sphere('coral',1,mm(P.M,mT(0,-0.15,0),mS(P.rng.range(1.2,2.0),P.rng.range(0.45,0.7),P.rng.range(1.0,1.6))),10,6); for(let i=0;i<6;i++) B.ico('coral',P.rng.range(0.12,0.25),mT(...wp(P.M,P.rng.range(-2,2),0.05,P.rng.range(-1.8,1.8)).toArray()),0); },
  crypt(B,P){ const s=P.s||1, w=1.9*s, d=1.4*s, rng=P.rng; for(const [ax,az,bx,bz] of [[-w,-d,w,-d],[-w,d,w,d],[-w,-d,-w,d],[w,-d,w,d]]){ const a=wp(P.M,ax,0,az), b=wp(P.M,bx,0,bz); cribRun(B,a.x,a.z,b.x,b.z,0,1.2,0.7,rng); }
    for(let x=-w+0.5;x<w-0.3;x+=0.38){ if(rng.chance(0.35)) continue; const a=wp(P.M,x,0,-d-0.2), b=wp(P.M,x+rng.range(-0.1,0.1),0,d+0.2); basaltLog(B,a.x,1.35,a.z,b.x,b.z,0.17); }
    P.col(-w-0.4,0,-d-0.4,w+0.4,1.5,d+0.4); },
  mangrove(B,P){ const h=P.rng.range(4,6); B.cyl('trunk',0.18,0.12,h,7,mm(P.M,mT(0,1.2,0))); for(let k=0;k<10;k++){ const a=k/10*Math.PI*2+P.rng.f()*0.4, r=P.rng.range(0.9,1.6);
      const p0=wp(P.M,0,P.rng.range(1.2,2.2),0), p1=wp(P.M,Math.cos(a)*r*0.6,P.rng.range(1.2,1.8),Math.sin(a)*r*0.6), p2=wp(P.M,Math.cos(a)*r,0,Math.sin(a)*r); B.segCyl('trunk',p0,p1,0.06,0.05,5); B.segCyl('trunk',p1,p2,0.05,0.04,5); }
    for(let k=0;k<6;k++) B.ico('leaf2',P.rng.range(0.9,1.3),mm(P.M,mT(P.rng.range(-1.2,1.2),1.2+h+P.rng.range(-0.4,0.5),P.rng.range(-1.2,1.2)),mS(1,0.7,1)),1); P.col(-0.4,0,-0.4,0.4,2,0.4); },
  coco(B,P){ const h=P.rng.range(6,9), bend=P.rng.range(0.8,2.0), dir=P.rng.f()*6.28; let p=wp(P.M,0,0,0); const n=6;
    for(let i=1;i<=n;i++){ const t=i/n, q=wp(P.M,Math.cos(dir)*bend*t*t,t*h,Math.sin(dir)*bend*t*t); B.segCyl('trunk',p,q,0.2-0.06*t,0.19-0.06*t,7); p=q; }
    const top=mT(p.x,p.y,p.z); for(let k=0;k<12;k++) frond(B,'palmleaf',mm(top,mRY(k/12*Math.PI*2+P.rng.f()*0.2),mRZ(P.rng.range(-0.1,0.4))),P.rng.range(2.2,3.0),0.3,0.4);
    for(let k=0;k<5;k++) B.sphere('trunk',0.13,mm(top,mT(Math.cos(k*1.3)*0.25,-0.3,Math.sin(k*1.3)*0.25)),6,4); P.col(-0.3,0,-0.3,0.3,2,0.3); },
  canal(B,P){ const c=P.site; if(!c) return; const w=3.2, o=2.4, g=1.9;
    let strips=[[c.X0-o-w,c.Z0-o-w,c.X1+o+w,c.Z0-o],[c.X0-o-w,c.Z1+o,c.X1+o+w,c.Z1+o+w],[c.X0-o-w,c.Z0-o,c.X0-o,c.Z1+o],[c.X1+o,c.Z0-o,c.X1+o+w,c.Z1+o]];
    // a causeway of packed coral where the visitor comes in
    if(c.spawn){ const sx=c.spawn.x, sz=c.spawn.z, out=[]; for(const q of strips){ const [x0,z0,x1,z1]=q, alongX=x1-x0>z1-z0;
        const hit= alongX? sx>x0-g&&sx<x1+g&&Math.abs(sz-(z0+z1)/2)<w+3 : sz>z0-g&&sz<z1+g&&Math.abs(sx-(x0+x1)/2)<w+3;
        if(!hit){ out.push(q); continue; } if(alongX){ if(sx-g>x0) out.push([x0,z0,sx-g,z1]); if(sx+g<x1) out.push([sx+g,z0,x1,z1]); B.box('coral',sx-g,-0.06,z0,sx+g,0.02,z1); }
        else { if(sz-g>z0) out.push([x0,z0,x1,sz-g]); if(sz+g<z1) out.push([x0,sz+g,x1,z1]); B.box('coral',x0,-0.06,sz-g,x1,0.02,sz+g); } }
      strips=out; }
    for(const [x0,z0,x1,z1] of strips){ B.box('water',x0,-0.04,z0,x1,-0.02,z1); B.box('shade',x0,-0.07,z0,x1,-0.05,z1); }
    for(const [x0,z0,x1,z1] of strips){ const L=Math.max(x1-x0,z1-z0), n=Math.floor(L/2.8); for(let i=0;i<n;i++){ const t=(i+0.5)/n; const x=x1-x0>z1-z0? lerp(x0,x1,t) : (x0+x1)/2+P.rng.range(-1,1), z=x1-x0>z1-z0? (z0+z1)/2+P.rng.range(-1,1) : lerp(z0,z1,t);
        if(P.rng.chance(0.4)) basaltLog(B,x-0.8,-0.04+0.1,z-0.3,x+0.8,z+0.3,0.15); } }
    return 'water'; },
  sakau(B,P){ B.box('basalt',-0.75,0,-0.5,0.75,0.28,0.5,P.M); for(let k=0;k<3;k++) B.ico('basalt',0.12,mm(P.M,mT(P.rng.range(-0.5,0.5),0.36,P.rng.range(-0.3,0.3)),mS(1,0.7,1.3)),0);
    B.sphere('trunk',0.12,mm(P.M,mT(0.55,0.32,0.3),mS(1,0.5,1)),6,4); P.col(-0.75,0,-0.5,0.75,0.4,0.5); },
  canoe(B,P){ const M=tilt(P.M,0,0.15,0,P.rng.range(-0.3,-0.15),0,0); B.sphere('trunk',1,mm(M,mT(0,0.2,0),mS(2.5,0.35,0.32)),14,6); B.box('shade',-1.8,0.38,-0.16,1.8,0.42,0.16,M);
    B.cyl('trunk',0.09,0.09,2.8,6,mm(M,mT(-1.4,0.1,1.5),mRZ(Math.PI/2))); for(const x of [-0.6,0.6]) B.cyl('trunk',0.04,0.04,1.6,5,mm(M,mT(x,0.4,0),mRX(Math.PI/2*1.05)));
    P.col(-2.5,0,-0.4,2.5,0.7,0.4); },
  clams(B,P){ const n=P.rng.int(2,4); for(let i=0;i<n;i++){ const s=P.rng.range(0.4,0.7), M=tilt(P.M,P.rng.range(-1,1),0,P.rng.range(-0.8,0.8),0,P.rng.f()*6,0);
      B.latheArc('coral',[[0,0.0],[0.5*s,0.05*s],[0.8*s,0.22*s],[0.9*s,0.35*s]],10,mm(M,mRX(Math.PI/2),mS(1,1,0.55)),0,Math.PI); } },
  /* ---- Great Zimbabwe ---- */
  birdPillar(B,P){ const h=P.rng.range(1.8,2.6); B.box('granite',-0.3,0,-0.3,0.3,0.25,0.3,P.M); B.box('granite',-0.12,0.25,-0.1,0.12,h,0.1,P.M);
    const M=mm(P.M,mT(0,h,0)); B.box('bird',-0.08,0,-0.08,0.08,0.18,0.08,M); B.sphere('bird',1,mm(M,mT(0,0.42,0),mS(0.13,0.24,0.11)),8,6); B.segCyl('bird',wp(M,0,0.6,0),wp(M,0.02,0.82,0),0.05,0.045,6);
    B.sphere('bird',0.07,mm(M,mT(0.02,0.86,0)),6,4); B.cone('bird',0.025,0.12,5,mm(M,mT(0.07,0.86,0),mRZ(-Math.PI/2))); for(const sz of [-1,1]) B.box('bird',-0.1,0.3,sz*0.11-0.02,0.12,0.58,sz*0.11+0.02,M); P.col(-0.3,0,-0.3,0.3,h+0.9,0.3); },
  monoliths(B,P){ const n=Math.min(P.rng.int(3,5),1+Math.floor(2*(P.span==null?2:P.span)/0.7)), nx=P.nx||0, nz=P.nz||1; for(let i=0;i<n;i++){ const along=(i-(n-1)/2)*0.7, h=P.rng.range(1.0,2.0), x=P.x-nz*along, z=P.z+nx*along;
      B.box('granite',-0.12,0,-0.07,0.12,h,0.07,mm(mT(x,P.y,z),mRY(Math.atan2(nx,nz)),mRZ(P.rng.range(-0.12,0.12)))); } },
  dagaHut(B,P){ const s=P.s||1, R=1.9*s, h=P.rng.range(0.5,1.0); B.cyl('clayp',R+0.3,R+0.35,0.25,20,P.M); B.latheArc('clayp',[[R-0.2,0],[R,0],[R,h],[R-0.05,h+0.06],[R-0.2,h]],22,mm(P.M,mT(0,0.25,0)),0.4,Math.PI*2-0.8);
    B.torus('stone',0.35,0.08,Math.PI*2,mm(P.M,mT(0.3,0.3,-0.2),mRX(Math.PI/2)),4,10); B.cyl('shade',0.3,0.3,0.01,10,mm(P.M,mT(0.3,0.25,-0.2))); P.col(-R-0.3,0,-R-0.3,R+0.3,0.25,R+0.3); },
  grind(B,P){ B.ico('granite',0.6,mm(P.M,mT(0,0.05,0),mS(1.2,0.4,0.8)),1); B.sphere('shade',1,mm(P.M,mT(0,0.27,0),mS(0.45,0.02,0.25)),8,4); B.sphere('granite',1,mm(P.M,mT(0.2,0.34,0.05),mS(0.18,0.08,0.12)),8,4); },
  boulders(B,P){ const n=P.rng.int(3,6); for(let i=0;i<n;i++){ const r=P.rng.range(0.9,2.0); B.ico('granite',r,tilt(P.M,P.rng.range(-1.8,1.8),i>2?r*0.9:r*0.55,P.rng.range(-1.5,1.5),P.rng.f(),P.rng.f()*3,0).multiply(mS(1.2,0.8,1)),1); } P.col(-2.2,0,-2,2.2,2.2,2); },
  baobab(B,P){ const h=P.rng.range(5,7); B.lathe('trunk',[[0,0],[1.5,0],[1.55,1.0],[1.3,h*0.55],[0.75,h*0.9],[0,h]],14,P.M); for(let k=0;k<7;k++){ const a=k/7*Math.PI*2+P.rng.f()*0.4, e=wp(P.M,Math.cos(a)*2.2,h+P.rng.range(0.6,1.3),Math.sin(a)*2.2);
      B.segCyl('trunk',wp(P.M,0,h-0.5,0),e,0.22,0.08,5); B.ico('leaf',0.55,mT(e.x,e.y+0.25,e.z),0); } P.col(-1.5,0,-1.5,1.5,3,1.5); },
  pots(B,P){ const prof=[[0,0],[0.12,0],[0.3,0.12],[0.36,0.3],[0.3,0.5],[0.16,0.6],[0.17,0.68],[0,0.66]]; const n=P.rng.int(3,5);
    for(let i=0;i<n;i++){ const M=i===n-1? tilt(P.M,P.rng.range(-0.6,0.6),0.3,0.6,Math.PI/2*0.9,P.rng.f()*6,0) : mm(P.M,mT(i*0.55-0.6,0,P.rng.range(-0.3,0.3)),mS(1,P.rng.range(0.9,1.3),1));
      if(i===n-1) B.latheArc('clayp',prof,10,M,0.3,4.6); else { B.lathe('clayp',prof,10,M); B.torus('shade',0.33,0.015,Math.PI*2,mm(M,mT(0,0.38,0),mRX(Math.PI/2)),3,14); } } },
  chevron(B,P){ const top=P.top||P.y+1; const v=top-P.y-0.55; if(v<0.6) return; for(let k=0;k<8;k++){ const u=-1.6+k*0.4; B.box('granite',-0.18,-0.04,0,0.18,0.04,0.05,mm(P.M,mT(u,v+0.12*(k%2?1:-1)*0,0),mRZ((k%2?1:-1)*0.6))); } },
  slump(B,P){ const n=P.rng.int(10,16); for(let i=0;i<n;i++){ const d=P.rng.range(0,1.8), sp=d*0.8+0.3; B.box('granite',-0.22,0,-0.1,0.22,0.13,0.1,tilt(P.M,P.rng.range(-sp,sp),Math.max(0,(1.8-d)*0.15),d,P.rng.range(-0.4,0.4),P.rng.f()*3,P.rng.range(-0.3,0.3))); } },
  aloe(B,P){ const n=P.rng.int(1,3); for(let j=0;j<n;j++){ const M=mm(P.M,mT(P.rng.range(-0.5,0.5),0,P.rng.range(-0.5,0.5))); for(let k=0;k<12;k++) B.cone('aloe',0.07,P.rng.range(0.45,0.7),4,mm(M,mRY(k*0.52),mRX(0.25+0.45*(k%3)/2),mS(1.4,1,0.5)));
      if(P.rng.chance(0.6)){ B.cyl('trunk',0.02,0.015,0.9,4,M); B.cone('clayp',0.06,0.3,6,mm(M,mT(0,0.9,0))); } } },
};
// what a site's courtyard centre holds
const RUIN_FEATS=new Set(['greataltar','natatio','lake','brickwell','firealtar','lotuspool','incafount','crypt','dagahut']);
function ruinCourtFeature(B,kind,cx,cz,ax,col,rng,st){
  const M=ax==='x'?mT(cx,0.05,cz):mm(mT(cx,0.05,cz),mRY(Math.PI/2)), P={x:cx,y:0.05,z:cz,a:0,M,rng,st,s:1.4,col:(x0,y0,z0,x1,y1,z1)=>col(...rWorldBox(M,x0,y0,z0,x1,y1,z1))};
  const pool=(L,W,steps,k)=>{ for(let i=0;i<steps;i++){ const e=0.35*(steps-i); for(const [a0,b0,a1,b1] of [[-L/2-e,-W/2-e,L/2+e,-W/2-e+0.35],[-L/2-e,W/2+e-0.35,L/2+e,W/2+e],[-L/2-e,-W/2-e+0.35,-L/2-e+0.35,W/2+e-0.35],[L/2+e-0.35,-W/2-e+0.35,L/2+e,W/2+e-0.35]]) B.box(k,a0,-0.1-i*0.2,b0,a1,0.0-i*0.2+0.04,b1,M); }
    B.box('water',-L/2,-0.12-steps*0.2,-W/2,L/2,-0.06,W/2,M); col(...rWorldBox(M,-L/2-0.35*steps,-1,-W/2-0.35*steps,L/2+0.35*steps,0.05,W/2+0.35*steps)); };
  switch(kind){
    case 'greataltar': RG.altar(B,P); return [2.2,false];
    case 'firealtar': RG.fireAltar(B,P); return [1.6,false];
    case 'incafount': P.s=1; RG.fountain(B,P); return [1.8,true];
    case 'crypt': P.s=1; RG.crypt(B,P); return [2.6,false];
    case 'dagahut': P.s=0.9; RG.dagaHut(B,P); return [2.2,false];
    case 'natatio': pool(3.6,2.2,2,'marble'); return [2.6,true];
    case 'lake': pool(4.0,2.6,3,'stone'); return [3.0,true];
    case 'lotuspool': { pool(3.0,1.2,1,'stone'); const M2=mm(M,mRY(Math.PI/2)); for(const [a0,b0,a1,b1] of [[-1.4,-0.95,-0.6,0.95],[0.6,-0.95,1.4,0.95]]) B.box('water',a0,-0.12,b0,a1,-0.06,b1,M2);
      for(let k=0;k<6;k++) B.cyl('leaf',0.18,0.18,0.01,10,mm(M,mT(rng.range(-1.3,1.3),-0.05,rng.range(-0.5,0.5)))); return [2.0,true]; }
    case 'brickwell': B.cyl('base',0.85,0.9,0.75,16,M); B.cyl('shade',0.6,0.6,0.77,16,M); B.torus('shade',0.88,0.04,Math.PI*2,mm(M,mT(0,0.45,0),mRX(Math.PI/2)),3,18); col(cx-0.9,0,cz-0.9,cx+0.9,0.8,cz+0.9); return [1.3,false];
  }
  return [0,false];
}

/* ---------- placing a site's greebles: on floors, in courts, around the plot, against and on top of walls, in windows ---------- */
function ruinScatter(B,R,st,c){
  const G=st.ruinG||[], rng=RNG(c.seed+'|greeble'), NX=c.NX, NZ=c.NZ, CW=c.CW;
  const sc=Math.sqrt(NX*NZ/9)*clamp(CW/8,0.8,1.25);
  const placed=[]; let water=false;
  const site={X0:-NX*CW/2,X1:NX*CW/2,Z0:-NZ*CW/2,Z1:NZ*CW/2,spawn:c.spawn};
  const clearOK=(x,z,r)=>!c.clear.some(q=>Math.hypot(x-q[0],z-q[1])<q[2]+r);
  const freeOK=(x,z,r)=>!placed.some(p=>Math.hypot(x-p[0],z-p[1])<p[2]+r);
  const cellOf=(x,z)=>[Math.floor(x/CW+NX/2),Math.floor(z/CW+NZ/2)];
  const gy=(x,z)=>{ const [ix,iz]=cellOf(x,z); if(ix<0||iz<0||ix>=NX||iz>=NZ) return 0; return c.cellAt(ix,iz,0)>0? 0.06 : 0; };
  const cells=t=>{ const o=[]; for(let z=0;z<NZ;z++) for(let x=0;x<NX;x++) if(t.includes(c.cellAt(x,z,0))) o.push([x,z]); return o; };
  const rooms=cells([ROOM,DOME,IWAN,GATE]), courts=cells([COURT,EMPTY]);
  const W=R.walls.filter(w=>w.depth>=0.25&&w.bU-w.a>0.7);
  const inCell=(L,r)=>{ if(!L.length) return null; const [x,z]=L[rng.int(0,L.length-1)], [cx,cz]=c.cellC(x,z), m=Math.max(0.2,CW/2-0.9-r); return {x:cx+rng.range(-m,m),z:cz+rng.range(-m,m)}; };
  const fromWall=(w,u,wl)=>{ const e=w.M.elements; return [e[0]*u+e[8]*wl+e[12], e[2]*u+e[10]*wl+e[14]]; };
  const nrm=(w,side)=>{ const e=w.M.elements, L=Math.hypot(e[8],e[10])||1; return [side*e[8]/L,side*e[10]/L]; };
  const C={
    floor:r=>{ const p=inCell(rooms,r); if(!p) return null; return {x:p.x,z:p.z,y:0.06,a:rng.f()*6.28}; },
    court:r=>{ const p=inCell(courts,r); if(!p) return null; return {x:p.x,z:p.z,y:gy(p.x,p.z),a:rng.f()*6.28}; },
    out:r=>{ const d=rng.int(0,3), o0=(R.outMin||1.2)+r, off=rng.range(o0,o0+1.3+4*sc), sx=site.X1-site.X0, sz=site.Z1-site.Z0;
      const x= d===0? site.X1+off : d===2? site.X0-off : rng.range(site.X0-2,site.X1+2), z= d===1? site.Z1+off : d===3? site.Z0-off : rng.range(site.Z0-2,site.Z1+2); void sx; void sz;
      return {x,z,y:0,a:rng.f()*6.28}; },
    wallbase:r=>{ const L=W.filter(w=>w.yb<0.3&&w.topMax-w.yb>0.7); if(!L.length) return null; const w=L[rng.int(0,L.length-1)], u=rng.range(w.a+0.3,w.bU-0.3), side=rng.chance(0.5)?-1:1, off=0.15+Math.min(r,0.8);
      const [x,z]=fromWall(w,u,side<0?-off:w.depth+off), [nx,nz]=nrm(w,side); return {x,z,y:gy(x,z),a:Math.atan2(nx,nz),nx,nz}; },
    walltop:()=>{ const L=W.filter(w=>w.top-w.yb>0.9&&w.depth>=0.35); if(!L.length) return null; const w=L[rng.int(0,L.length-1)], u=(w.a+w.bU)/2, [x,z]=fromWall(w,u,w.depth/2), [nx,nz]=nrm(w,1);
      // how far the wall head runs on at this height either way (whatever sits up there stays on it)
      const reach=d=>{ let s=0; while(s<1.8){ const [px,pz]=fromWall(w,u+d*(s+0.2),w.depth/2); if(rSupMax(R,px-0.1,pz-0.1,px+0.1,pz+0.1)<w.top-0.05) break; s+=0.2; } return s; };
      const span=Math.min(reach(1),reach(-1)); if(span<0.2) return null;
      return {x,z,y:w.top,a:Math.atan2(nx,nz),nx,nz,top:w.top,span}; },
    face:()=>{ const L=R.runs.filter(w=>w.depth>=0.25); if(!L.length) return null; const w=L[rng.int(0,L.length-1)], side=rng.chance(0.5)?-1:1;
      const u=rng.range(w.a+0.55,w.b-0.55), wl=side<0?-0.004:w.depth+0.004, [x,z]=fromWall(w,u,wl), [nx,nz]=nrm(w,side), y=w.yb+(w.yb<0.3?0.06:0.02);
      return {x,z,y,a:Math.atan2(nx,nz),top:w.top,nx,nz}; },
    hole:()=>{ if(!R.holes.length) return null; const h=R.holes[rng.int(0,R.holes.length-1)], e=h.M.elements; return {x:e[12],z:e[14],y:0,a:0,hole:h,M:mT(0,0,0)}; },
    site:()=>({x:0,z:0,y:0,a:0,site}),
  };
  const usedHoles=new Set();
  for(const g of G){ const n=g.at==='site'? 1 : g.at==='hole'? Math.min(R.holes.length,Math.round(rng.range(g.n[0],g.n[1])*sc)) : Math.round(rng.range(g.n[0],g.n[1])*sc), r=g.r||0.8;
    for(let i=0;i<n;i++) for(let tr=0;tr<14;tr++){
      let at=Array.isArray(g.at)? rng.pick(g.at) : g.at; if(at==='ground') at=rng.pick(['floor','court','out','out']); const P=C[at](r); if(!P) continue;
      if(at==='hole'){ if(usedHoles.has(P.hole)) continue; usedHoles.add(P.hole); }
      const onWall=at==='face'||at==='walltop'||at==='hole';
      if(!onWall&&at!=='site'&&(!clearOK(P.x,P.z,r)||!freeOK(P.x,P.z,r))) continue;
      if(onWall&&at!=='hole'&&placed.some(p=>p[3]&&Math.hypot(P.x-p[0],P.z-p[1])<1.6)) continue;
      const M=P.M||mm(mT(P.x,P.y,P.z),mRY(P.a));
      const ctx=Object.assign({},P,{M,rng,st,R,s:g.s||1,col:(x0,y0,z0,x1,y1,z1)=>c.col.push(rWorldBox(M,x0,y0,z0,x1,y1,z1)),colW:b=>c.col.push(b)});
      if(RG[g.k](B,ctx)==='water') water=true;
      placed.push([P.x,P.z,onWall?0.3:r,onWall]); break; } }
  return water;
}
