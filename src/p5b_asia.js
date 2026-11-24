
/* ============================================================
   ASIA — curved tiled roofs, pagodas, pavilions, lanterns, gardens.
   Roofs are smooth surfaces: each plane is a grid whose height follows a
   concave profile (flat at the eave, steep at the ridge) with the corners
   lifted, so hips and ridges stay crisp while the eaves sweep up.
   ============================================================ */
const ASIA_TOWERS=new Set(['jpagoda','cpagoda','newartemple','stonepagoda','drumtower','chorten','prang','meru','chhatritower']);
const ASIA_KIOSKS=new Set(['ting','ting6','azumaya','jeongja','pati','sala','bale','gyaphib']);
const roofProf=(u,p)=>Math.pow(Math.max(0,Math.min(1,u)),p||1);

// add a parametric surface P(s,t)->[x,y,z] as a smooth grid, top (k) and optional underside (ku, dropped by th)
function surfGrid(B,k,ku,P,ns,nt,th,M,uvScale,edgeK){
  const e=1e-3;
  const N=(s,t)=>{ const a=P(Math.min(1,s+e),t), b=P(Math.max(0,s-e),t), c=P(s,Math.min(1,t+e)), d=P(s,Math.max(0,t-e));
    const ds=[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dt=[c[0]-d[0],c[1]-d[1],c[2]-d[2]];
    let n=[ds[1]*dt[2]-ds[2]*dt[1], ds[2]*dt[0]-ds[0]*dt[2], ds[0]*dt[1]-ds[1]*dt[0]]; const L=Math.hypot(...n); if(L<1e-9) return [0,1,0]; n=n.map(v=>v/L); if(n[1]<0) n=n.map(v=>-v); return n; };
  const G=[]; for(let j=0;j<=nt;j++){ const row=[]; for(let i=0;i<=ns;i++){ const s=i/ns, t=j/nt; row.push({p:P(s,t),n:N(s,t),s,t}); } G.push(row); }
  // metric uv: along the first row, and up the slope
  const L0=[0]; for(let i=1;i<=ns;i++){ const a=G[0][i-1].p, b=G[0][i].p; L0.push(L0[i-1]+Math.hypot(a[0]-b[0],a[2]-b[2])); }
  const slope=G.map(row=>row[Math.floor(ns/2)].p), S0=[0]; for(let j=1;j<=nt;j++){ const a=slope[j-1], b=slope[j]; S0.push(S0[j-1]+Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])); }
  B.grid(k,ku,G,th,M,uvScale||1,edgeK,L0,S0);
  return G;
}

/* Rectangular pitched roof over walls a∈[A0,A1] (along the ridge), b∈[B0,B1], wall top y. M maps local (a,v,b) to world (x,y,z).
   open: {a0,a1,b0,b1} — false where the side abuts a taller block (no overhang, no lift). */
function pitchedRoof(B,A0,A1,B0,B1,y,cfg,open,M,opt){
  opt=opt||{}; const kind=cfg.kind||'hip', ovM=cfg.ov, th=cfg.thick||0.14, p=cfg.curve||1, L=cfg.lift||0, mat=opt.mat||'roofTile', under=cfg.tile&&cfg.tile.kind==='thatch'? 'roofTile' : 'wood';
  const hb=(B1-B0)/2, La=A1-A0, mid=(B0+B1)/2;
  const closedA=cfg.gable==='maqiang'&&kind==='gable';   // fire gables stop the roof flush with the end walls
  const ov={a0:open.a0&&!closedA?ovM:0.02, a1:open.a1&&!closedA?ovM:0.02, b0:open.b0?ovM:0.02, b1:open.b1?ovM:0.02};
  const Hr=(cfg.pitch||0.5)*(hb+ovM), U=e=>(e+ovM)/(hb+ovM), yE=y+0.18-Hr*roofProf(U(0)-0,p)+Hr*roofProf(0,p);
  const H=e=>yE+Hr*roofProf(U(e),p);
  const gi= kind==='hip'? Math.min(hb,La/2) : kind==='hipgable'? Math.min(hb*0.5,La/2) : -Math.max(ov.a0,ov.a1);
  const corners=[]; for(const [ka,kb,ca,cb] of [['a0','b0',A0-ov.a0,B0-ov.b0],['a1','b0',A1+ov.a1,B0-ov.b0],['a0','b1',A0-ov.a0,B1+ov.b1],['a1','b1',A1+ov.a1,B1+ov.b1]]) if(open[ka]&&open[kb]) corners.push([ca,cb]);
  const Rl=Math.min(hb+ovM,La/2+ovM)*0.85;
  const lift=(a,b)=>{ let s=0; for(const [ca,cb] of corners){ const d=Math.hypot(a-ca,b-cb); if(d<Rl){ const f=1-d/Rl; s=Math.max(s,L*f*f*f); } } return s; };
  const P=(a,e,b)=>[a,H(e)+lift(a,b),b];
  const ns=Math.max(6,Math.round((La+2*ovM)/0.45)), nt=Math.max(5,Math.round((hb+ovM)/0.45));
  const aMin=e=>A0+Math.max(Math.min(e,gi),-ov.a0), aMax=e=>A1-Math.max(Math.min(e,gi),-ov.a1);
  // the two long planes
  for(const side of [1,-1]){ const ob=side>0?ov.b1:ov.b0;
    surfGrid(B,mat,under,(s,t)=>{ const e=-ob+(hb+ob)*t, a=aMin(e)+(aMax(e)-aMin(e))*(side>0?s:1-s), b=side>0? B1-e : B0+e; return P(a,e,b); },ns,nt,th,M,1,under); }
  // hipped ends
  if(kind!=='gable') for(const end of [0,1]){ const oa=end?ov.a1:ov.a0, A=end?A1:A0, sg=end?-1:1;
    surfGrid(B,mat,under,(s,t)=>{ const e=-oa+(gi+oa)*t, a=A+sg*e, b0=B0+Math.max(e,-ov.b0), b1=B1-Math.max(e,-ov.b1), b=b0+(b1-b0)*(end?s:1-s); return P(a,e,b); },Math.max(4,Math.round((hb*2)/0.45)),Math.max(3,Math.round((gi+oa)/0.45)),th,M,1,under); }
  const top=H(hb);
  // gables: vertical infill (hip-and-gable above the hips; gable roofs over the end walls)
  const gableK= cfg.gable==='wall'||cfg.gable==='maqiang'? (opt.wallK||'wall') : cfg.gable==='lime'? (opt.wallK||'wall') : cfg.gable==='thatch'? mat : cfg.gable==='panels'? (opt.wallK||'wall') : cfg.gable==='painted'? 'gablep' : 'wood';
  for(const end of [0,1]){
    const ag= kind==='hipgable'? (end? A1-gi : A0+gi) : (end? A1 : A0), eb0= kind==='hipgable'? gi : 0;
    if(kind==='gable'&&cfg.gable==='maqiang'&&!(opt.join&&opt.join[end])){ const tw=opt.t||0.4, mh=maqiang(B,ag,B0,B1,y,H,hb,end?1:-1,tw,M,opt.wallK||'wall'); if(opt.col) opt.col(M,end?ag-tw:ag-0.02,y,B0-0.06,end?ag+0.02:ag+tw,mh,B1+0.06); continue; }
    if(kind==='gable'&&opt.closedEnds&&!opt.closedEnds[end]) continue;
    const pts=[], n=12; for(let i=0;i<=n;i++){ const b=B0+eb0+(B1-B0-2*eb0)*i/n, eb=Math.min(b-B0,B1-b); pts.push([b,Math.max(H(eb)-th*1.2,kind==='hipgable'?H(eb0):y)]); }
    const poly= kind==='hipgable'? [[B1-eb0,H(eb0)],[B0+eb0,H(eb0)],...pts.slice(1,-1)] : [[B1,y],[B0,y],...pts.slice(1,-1)];
    const Mg=mm(M,mT(ag+(end?-0.04:0.04),0,0),mRY(-Math.PI/2));
    if(poly.length>=3){ B.flat(gableK,dedupe(poly),Mg); if(opt.col) opt.col(M,ag-0.07,kind==='hipgable'?H(eb0)-0.05:y,B0+eb0,ag+0.07,top,B1-eb0); }
    if(cfg.barge==='thai') thaiBarge(B,end?A1+ov.a1:A0-ov.a0,B0-ov.b0,B1+ov.b1,mid,H,hb,ovM,M,end?1:-1);
    else if(cfg.barge&&kind==='gable'&&(end?open.a1:open.a0)&&!(opt.closedEnds&&!opt.closedEnds[end])) worldBarge(B,cfg.barge,end?A1+ov.a1:A0-ov.a0,B0-ov.b0,B1+ov.b1,ov.b0,ov.b1,mid,H,hb,th,M,end?1:-1); }
  // ridge cap and hip ridges
  const r0=Math.max(A0-ov.a0,aMin(hb)), r1=Math.min(A1+ov.a1,aMax(hb)), rk=cfg.tile&&cfg.tile.kind==='thatch'? mat : (cfg.ridgeMat||mat), rh=cfg.ridgeH||0.22;
  if(r1-r0>0.05) B.box(rk,r0,top-0.06,mid-0.13,r1,top+rh,mid+0.13,M);
  if(cfg.cresting&&opt.ornaments!==false&&r1-r0>0.6) worldCresting(B,r0,r1,top+rh,mid,M);
  if(kind!=='gable') for(const [ea,eb] of [[0,0],[0,1],[1,0],[1,1]]){ const pts=[]; for(let k=0;k<=6;k++){ const e=-(ea?ov.a1:ov.a0)+((ea?ov.a1:ov.a0)+gi)*k/6; const a=ea? A1-Math.max(Math.min(e,gi),-ov.a1) : A0+Math.max(Math.min(e,gi),-ov.a0), b=eb? B1-Math.max(e,-ov.b1) : B0+Math.max(e,-ov.b0); pts.push(V3(a,H(e)+lift(a,b)+0.05,b).applyMatrix4(M)); }
    for(let k=1;k<pts.length;k++) B.segCyl(rk,pts[k-1],pts[k],0.075,0.075,5); }
  // ridge-end ornaments
  if(opt.ornaments!==false) for(const [ra,sg] of [[r0,-1],[r1,1]]) ridgeEnd(B,cfg.ridge,V3(ra,top+rh,mid).applyMatrix4(M),M,sg);
  // rafters under open eaves, struts (Newar) from the wall to the eave
  for(const side of [1,-1]){ const key=side>0?'b1':'b0'; if(!open[key]) continue; const Bw=side>0?B1:B0, ob=ov[key];
    if(cfg.rafters) for(let a=A0+0.15;a<=A1-0.1;a+=0.34){ const e=-ob*0.92, hh=H(e)+lift(a,Bw+side*ob*0.92)-th; B.box('wood',a-0.045,hh-0.11,Math.min(Bw,Bw+side*ob*0.95),a+0.045,hh,Math.max(Bw,Bw+side*ob*0.95),M); }
    if(cfg.struts) for(let a=A0+0.5;a<=A1-0.4;a+=1.05){ const p0=V3(a,y-1.25,Bw+side*0.04).applyMatrix4(M), e=-ob*0.8, p1=V3(a,H(e)-th-0.04,Bw+side*ob*0.8).applyMatrix4(M); B.segCyl('wood',p0,p1,0.07,0.06,4); B.box('wood',a-0.12,y-1.35,Math.min(Bw,Bw+side*0.12),a+0.12,y-1.2,Math.max(Bw,Bw+side*0.12),M); } }
  return {top:top+rh, H, yE};
}
// stepped "horse-head" gable wall rising above the roof (Jiangnan)
function maqiang(B,ag,B0,B1,y,H,hb,sg,t,M,wk){
  const steps=3, w=(B1-B0)/2/steps, hs=[]; for(let k=0;k<steps;k++) hs.push(H(Math.min(hb,w*(k+1)))+0.55);
  const pts=[[B0-0.06,y],[B0-0.06,hs[0]]];
  for(let k=1;k<steps;k++){ pts.push([B0+w*k,hs[k-1]],[B0+w*k,hs[k]]); }
  for(let k=steps-1;k>=1;k--){ pts.push([B1-w*k,hs[k]],[B1-w*k,hs[k-1]]); }
  pts.push([B1+0.06,hs[0]],[B1+0.06,y]);
  const Mw=mm(M,mT(sg>0? ag+0.02 : ag+t,0,0),mRY(-Math.PI/2));   // shape x→b, y→height; extrudes toward −a through the end wall
  const P=dedupe(pts); B.ext(wk,P,null,t+0.02,Mw);
  const mh=Math.max(...hs)+0.16;
  for(let i=1;i<P.length-2;i++){ const a=P[i], c=P[i+1]; if(Math.abs(a[1]-c[1])<1e-3&&Math.abs(a[0]-c[0])>0.2){ B.box('roofTile',Math.min(a[0],c[0])-0.08,a[1],-0.14,Math.max(a[0],c[0])+0.08,a[1]+0.16,t+0.16,Mw); B.box('trim',Math.min(a[0],c[0])-0.06,a[1]-0.12,-0.03,Math.max(a[0],c[0])+0.06,a[1],t+0.05,Mw); } }
  return mh;
}
// Thai naga bargeboards along the gable verges, ending in upturned hooks
function thaiBarge(B,av,b0,b1,mid,H,hb,ov,M,sg){
  for(const [bs,be] of [[b0,mid],[b1,mid]]){ const pts=[]; for(let k=0;k<=8;k++){ const b=bs+(be-bs)*k/8, e=Math.abs(b-(bs<mid?b0:b1))-ov; pts.push(V3(av+sg*0.06,H(Math.min(hb,e))+0.14,b).applyMatrix4(M)); }
    for(let k=1;k<pts.length;k++) B.segCyl('gold',pts[k-1],pts[k],0.06,0.06,4);
    const tip=pts[0], hook=V3(av+sg*0.06,0,bs+(bs<mid?-0.25:0.25)).applyMatrix4(M); hook.y=tip.y+0.42; B.segCyl('gold',tip,hook,0.07,0.04,4); }
}
function ridgeEnd(B,kind,p,M,sg){
  const dir=V3(sg,0,0).transformDirection? V3(sg,0,0) : V3(sg,0,0); const e=M.elements, ax=V3(e[0]*sg,0,e[2]*sg).normalize();
  const at=(dx,dy)=>V3(p.x+ax.x*dx,p.y+dy,p.z+ax.z*dx);
  switch(kind){
    case 'scroll': B.segCyl('roofTile',at(0,-0.05),at(0.25,0.32),0.12,0.07,6); B.sphere('roofTile',0.1,mT(...at(0.3,0.34).toArray()),6,4); break;
    case 'oni': B.segCyl('roofTile',at(-0.05,-0.1),at(0.05,0.45),0.26,0.22,4); break;
    case 'korean': B.segCyl('roofTile',at(-0.1,-0.04),at(0.4,0.34),0.14,0.1,6); break;
    case 'chofa': { const a=at(0,0), b=at(0.05,0.55), c=at(0.3,0.95), d=at(0.42,0.85); B.segCyl('gold',a,b,0.06,0.05,5); B.segCyl('gold',b,c,0.05,0.035,5); B.segCyl('gold',c,d,0.035,0.02,5); break; }
    case 'bali': B.cyl('gold',0.09,0.0,0.5,6,mT(p.x,p.y-0.05,p.z)); break;
    case 'gold': B.cyl('gold',0.14,0.1,0.5,8,mT(p.x,p.y-0.05,p.z)); B.sphere('gold',0.12,mT(p.x,p.y+0.55,p.z),8,6); break;
    default: worldRidgeEnd(B,kind,at,p);
  }
}
/* Polygonal skirt or pyramid roof: n sides (4 square, 6 hex, 8 octagon); inradius r0 at the eave (height y) rising Hr to inradius r1. */
function skirtRoof(B,cx,y,cz,n,r0,r1,Hr,cfg,mat,rot){
  const p=cfg.curve||1.2, L=cfg.lift||0, th=cfg.thick||0.12, under=(cfg.tile&&cfg.tile.kind==='thatch')||mat==='roofTile'&&cfg.tile&&cfg.tile.kind==='thatch'? mat : (mat==='gold'?'gold':'wood'), c=Math.cos(Math.PI/n), ro=(rot||0)+Math.PI/n;
  const V=(k,t)=>{ const a=ro+2*Math.PI*k/n, R=(r0+(r1-r0)*t)/c; return [cx+Math.cos(a)*R, cz+Math.sin(a)*R]; };
  for(let k=0;k<n;k++) surfGrid(B,mat,under,(s,t)=>{ const A=V(k,t), Bv=V(k+1,t), x=A[0]+(Bv[0]-A[0])*s, z=A[1]+(Bv[1]-A[1])*s, cf=Math.pow(Math.abs(s-0.5)*2,3); return [x,y+Hr*roofProf(t,p)+L*cf*(1-t)*(1-t),z]; },Math.max(4,Math.round(2*r0*Math.tan(Math.PI/n)/0.45)),Math.max(3,Math.round((r0-r1)/0.4)),th,null,1,under);
  return y+Hr;
}
/* ---------- lanterns ---------- */
function hangLampAsia(B,x,y,z,kind){
  if(worldLamp(B,x,y,z,kind)) return;
  if(kind==='red'){ B.cyl('iron',0.008,0.008,0.5,4,mT(x,y-0.5,z)); B.cyl('gold',0.12,0.12,0.06,8,mT(x,y-0.56,z)); B.sphere('lantern',0.25,mm(mT(x,y-0.82,z),mS(1,0.85,1)),10,7); B.cyl('gold',0.12,0.12,0.06,8,mT(x,y-1.08,z)); B.cyl('lantern',0.015,0.04,0.3,4,mT(x,y-1.38,z)); B.lanterns.push(V3(x,y-0.82,z)); return; }
  if(kind==='chochin'||kind==='paper'){ B.cyl('iron',0.008,0.008,0.4,4,mT(x,y-0.4,z)); B.cyl('black',0.12,0.12,0.05,8,mT(x,y-0.45,z)); B.lathe('paper',[[0.12,0],[0.2,0.08],[0.23,0.25],[0.2,0.42],[0.12,0.5]],10,mT(x,y-0.97,z)); B.cyl('black',0.12,0.12,0.05,8,mT(x,y-1.02,z)); B.lanterns.push(V3(x,y-0.72,z)); return; }
  if(kind==='silk'){ B.cyl('iron',0.008,0.008,0.4,4,mT(x,y-0.4,z)); B.cyl('paint',0.17,0.17,0.25,8,mT(x,y-0.7,z)); B.cyl('lantern',0.17,0.17,0.25,8,mT(x,y-0.95,z)); B.cyl('gold',0.18,0.18,0.04,8,mT(x,y-0.72,z)); B.lanterns.push(V3(x,y-0.8,z)); return; }
  hangLamp(B,x,y,z);
}
function stoneLantern(B,x,y,z,s){ s=s||1; B.cyl('stone',0.28*s,0.32*s,0.12*s,6,mT(x,y,z)); B.cyl('stone',0.08*s,0.1*s,0.7*s,6,mT(x,y+0.12*s,z)); B.cyl('stone',0.26*s,0.18*s,0.1*s,6,mT(x,y+0.82*s,z)); B.box('stone',x-0.2*s,y+0.92*s,z-0.2*s,x+0.2*s,y+1.22*s,z+0.2*s); B.box('glow',x-0.12*s,y+0.98*s,z-0.21*s,x+0.12*s,y+1.16*s,z+0.21*s); B.cone('stone',0.42*s,0.32*s,6,mT(x,y+1.22*s,z)); B.sphere('stone',0.08*s,mT(x,y+1.6*s,z),6,4); B.lanterns.push(V3(x,y+1.07*s,z)); }
/* ---------- trees ---------- */
function asiaTree(B,kind,x,z,y,rng){
  switch(kind){
    case 'pine': { let p=V3(x,y,z); const lean=rng.f()*6.283; for(let i=1;i<=4;i++){ const q=V3(x+Math.cos(lean+i)*0.25*i,y+1.1*i,z+Math.sin(lean+i)*0.25*i); B.segCyl('trunk',p,q,0.2-0.035*i,0.17-0.035*i,6); p=q; }
      for(let i=0;i<5;i++){ const a=rng.f()*6.283, h=y+2.0+i*0.75; const cx=x+Math.cos(a)*rng.range(0.4,1.4), cz=z+Math.sin(a)*rng.range(0.4,1.4); B.cyl('leaf2',rng.range(0.7,1.2),rng.range(0.9,1.4),0.35,9,mT(cx,h,cz)); } return 1.3; }
    case 'maple': B.segCyl('trunk',V3(x,y,z),V3(x+0.2,y+1.6,z),0.12,0.08,6); for(let i=0;i<6;i++) B.ico('maple',rng.range(0.55,0.85),mT(x+rng.range(-0.9,0.9),y+2.0+rng.range(-0.2,0.7),z+rng.range(-0.9,0.9)),1); return 1.1;
    case 'bamboo': for(let i=0;i<9;i++){ const a=rng.f()*6.283, r=rng.range(0,0.7), bx=x+Math.cos(a)*r, bz=z+Math.sin(a)*r, h=rng.range(4,6.5); B.segCyl('bamboo',V3(bx,y,bz),V3(bx+rng.range(-.4,.4),y+h,bz+rng.range(-.4,.4)),0.045,0.035,5); B.ico('leaf',rng.range(0.4,0.7),mT(bx,y+h-0.4,bz),0); } return 0.9;
    case 'plum': { const a=V3(x,y,z), b=V3(x+0.3,y+1.1,z-0.2), c=V3(x-0.2,y+1.9,z+0.2); B.segCyl('trunk',a,b,0.12,0.09,6); B.segCyl('trunk',b,c,0.09,0.05,6); for(let i=0;i<7;i++) B.ico('blossom',rng.range(0.35,0.55),mT(x+rng.range(-0.8,0.8),y+1.6+rng.range(-0.2,0.8),z+rng.range(-0.8,0.8)),0); return 0.9; }
    case 'frangipani': { B.segCyl('trunk',V3(x,y,z),V3(x,y+1.2,z),0.13,0.11,6); for(let i=0;i<5;i++){ const a=i/5*6.283+rng.f(), e=V3(x+Math.cos(a)*0.9,y+2.2,z+Math.sin(a)*0.9); B.segCyl('trunk',V3(x,y+1.2,z),e,0.08,0.05,5); B.ico('leaf',0.42,mT(e.x,e.y+0.15,e.z),0); B.sphere('fabric',0.09,mT(e.x,e.y+0.4,e.z),5,4); } return 1.0; }
    case 'neem': B.cyl('trunk',0.16,0.12,1.8,7,mT(x,y,z)); for(let i=0;i<5;i++) B.ico('leaf2',rng.range(0.8,1.1),mT(x+rng.range(-0.8,0.8),y+2.5+rng.range(-0.2,0.6),z+rng.range(-0.8,0.8)),1); return 1.2;
    case 'poplar': B.cyl('trunk',0.1,0.08,0.8,6,mT(x,y,z)); B.lathe('leaf',[[0,0],[0.55,0.15],[0.7,0.45],[0.5,0.8],[0,1]].map(q=>[q[0],q[1]*5.5]),10,mT(x,y+0.6,z)); return 0.8;
    case 'none': return 0;
  }
  { const r=worldTree(B,kind,x,z,y,rng); if(r!=null) return r; }
  tree(B,kind,x,z,y,rng); return 1.2;
}
/* ---------- courtyard centrepieces; returns the radius it occupies ---------- */
function asiaCourtFeature(B,kind,cx,cz,ax,col,rng){
  switch(kind){
    case 'fishbowl': B.lathe('clay',[[0,0],[0.45,0.02],[0.62,0.35],[0.66,0.7],[0.62,0.78],[0.56,0.78]],16,mT(cx,0,cz)); B.cyl('water',0.56,0.56,0.04,16,mT(cx,0.66,cz)); B.box('stone',cx-0.75,0,cz-0.75,cx+0.75,0.08,cz+0.75); col(cx-0.7,0,cz-0.7,cx+0.7,0.8,cz+0.7); return 1.1;
    case 'pond': { const pts=[]; for(let k=0;k<14;k++){ const a=k/14*6.283, r=(ax==='x'?[2.1,1.4]:[1.4,2.1]), wob=1+0.12*Math.sin(a*3+1.3); pts.push([Math.cos(a)*r[0]*wob,Math.sin(a)*r[1]*wob]); }
      B.flat('water',pts.map(q=>[q[0],-q[1]]),mm(mT(cx,0.06,cz),mRX(-Math.PI/2)));
      for(const q of pts){ B.ico('stone',rng.range(0.22,0.38),mm(mT(cx+q[0],0.12,cz+q[1]),mS(1,0.6,1)),0); }
      for(let i=0;i<6;i++){ const a=rng.f()*6.283, r=rng.range(0.3,1.1); B.cyl('leaf',0.22,0.22,0.02,8,mT(cx+Math.cos(a)*r,0.08,cz+Math.sin(a)*r*0.7)); }
      const rx=cx+(ax==='x'?1.3:0.5), rz=cz+(ax==='x'?-0.6:1.3); B.ico('stone',0.7,mm(mT(rx,0.6,rz),mS(0.7,1.7,0.6)),1); col(cx-2.2,0,cz-1.5,cx+2.2,0.5,cz+1.5); return 2.3; }
    case 'zen': { B.box('court',cx-2.0,0.05,cz-1.4,cx+2.0,0.085,cz+1.4); for(let z=-1.3;z<=1.3;z+=0.12) B.box('trim',cx-1.95,0.085,cz+z-0.012,cx+1.95,0.1,cz+z+0.012);
      for(const [dx,dz,r] of [[-1.1,-0.4,0.42],[0.6,0.5,0.32],[1.2,-0.6,0.24]]){ B.ico('stone',r,mm(mT(cx+dx,r*0.4,cz+dz),mS(1.2,0.8,1)),1); B.cyl('moss',r*1.6,r*1.7,0.04,10,mT(cx+dx,0.085,cz+dz)); }
      stoneLantern(B,cx+1.7,0.05,cz+1.1,0.9); col(cx-2,0,cz-1.4,cx+2,0.25,cz+1.4); return 2.2; }
    case 'jars': { B.box('stone',cx-1.6,0,cz-1.0,cx+1.6,0.35,cz+1.0); col(cx-1.6,0,cz-1.0,cx+1.6,1.1,cz+1.0); for(let i=0;i<10;i++){ const jx=cx-1.25+(i%5)*0.62, jz=cz+(i<5?-0.45:0.45); jar(B,jx,0.35,jz,rng.range(0.8,1.15)); B.cyl('clay',0.17,0.17,0.04,8,mT(jx,0.35+0.8*rng.range(0.8,1.15),jz)); } return 1.8; }
    case 'tulsi': B.box('trim',cx-0.55,0,cz-0.55,cx+0.55,1.0,cz+0.55); B.box('stone',cx-0.65,0.95,cz-0.65,cx+0.65,1.08,cz+0.65); B.ico('leaf',0.38,mT(cx,1.35,cz),1); for(let d=0;d<4;d++){ const a=d*Math.PI/2; B.box('void',cx+Math.cos(a)*0.56-0.12,0.35,cz+Math.sin(a)*0.56-0.12,cx+Math.cos(a)*0.56+0.12,0.7,cz+Math.sin(a)*0.56+0.12); } col(cx-0.6,0,cz-0.6,cx+0.6,1.4,cz+0.6); return 0.9;
    case 'chaitya': case 'chorten': { const big=kind==='chorten', s=big?1.25:1, wk=big?'trim':'stone';
      for(let k=0;k<3;k++){ const w=(1.1-k*0.22)*s; B.box(wk,cx-w,k*0.32*s,cz-w,cx+w,(k+1)*0.32*s,cz+w); }
      B.lathe(wk,[[0.62*s,0],[0.7*s,0.25*s],[0.62*s,0.65*s],[0.4*s,0.86*s],[0,0.9*s]],14,mT(cx,0.96*s,cz)); B.box(big?'gold':wk,cx-0.22*s,1.82*s,cz-0.22*s,cx+0.22*s,2.1*s,cz+0.22*s);
      for(let k=0;k<7;k++) B.cyl(big?'gold':wk,0.2*s-k*0.022*s,0.2*s-(k+1)*0.022*s,0.11*s,10,mT(cx,2.1*s+k*0.11*s,cz)); B.sphere('gold',0.09*s,mT(cx,2.95*s,cz),6,4); col(cx-1.1*s,0,cz-1.1*s,cx+1.1*s,3*s,cz+1.1*s); return 1.5*s; }
    case 'lotus': B.cyl('stone',1.1,1.15,0.45,16,mT(cx,0,cz),true); B.torus('stone',1.05,0.08,Math.PI*2,mm(mT(cx,0.45,cz),mRX(Math.PI/2)),5,24); B.cyl('stone',1.0,1.0,0.06,16,mT(cx,0,cz)); B.cyl('water',1.0,1.0,0.36,16,mT(cx,0.06,cz)); for(let i=0;i<5;i++){ const a=rng.f()*6.283, r=rng.range(0.2,0.7); B.cyl('leaf',0.2,0.2,0.02,8,mT(cx+Math.cos(a)*r,0.43,cz+Math.sin(a)*r)); } B.sphere('blossom',0.12,mT(cx+0.3,0.55,cz-0.2),6,4); col(cx-1.1,0,cz-1.1,cx+1.1,0.5,cz+1.1); return 1.4;
    case 'shrine': { for(let k=0;k<4;k++){ const w=0.9-k*0.16; B.box(k%2?'band':'stone',cx-w,k*0.45,cz-w,cx+w,(k+1)*0.45,cz+w); } B.box('stone',cx-0.5,1.8,cz-0.42,cx+0.5,2.4,cz+0.42); B.box('stone',cx-0.5,1.8,cz+0.25,cx+0.5,2.9,cz+0.42); B.box('gold',cx-0.3,2.4,cz-0.1,cx+0.3,2.48,cz+0.3);
      B.box('fabric',cx-0.92,0.9,cz-0.93,cx+0.92,1.15,cz-0.9); col(cx-0.9,0,cz-0.9,cx+0.9,2.9,cz+0.9); return 1.2; }
  }
  return 0;
}
/* ---------- pagodas and temple towers ---------- */
function asiaTower(B,kind,cx,yb,cz,Ht,half,st,col,wk){
  const pr=st.pr||{curve:1.3,lift:0.15,thick:0.12,tile:{kind:'barrel'}};
  const spire=(y,h,mat,rings)=>{ B.cyl(mat,0.08,0.05,h,6,mT(cx,y,cz)); for(let k=0;k<(rings||0);k++) B.cyl(mat,0.24-k*0.012,0.24-k*0.012,0.05,10,mT(cx,y+0.25+k*h*0.07,cz)); B.sphere(mat,0.12,mT(cx,y+h,cz),8,6); };
  col(cx-half,yb,cz-half,cx+half,yb+Ht,cz+half);
  switch(kind){
    case 'jpagoda': { const n=5, bodyH=(Ht-2.4)/n; let y=yb; B.box('stone',cx-half-0.3,y-0.05,cz-half-0.3,cx+half+0.3,y+0.4,cz+half+0.3); y+=0.4;
      for(let k=0;k<n;k++){ const r=half*(1-0.07*k)-0.25, h=bodyH*(k===0?1.1:0.85); B.box('trim',cx-r,y,cz-r,cx+r,y+h-0.24,cz+r); for(const sx of[-1,1]) for(const sz of [-1,1]) B.box('paint',cx+sx*r-0.09,y,cz+sz*r-0.09,cx+sx*r+0.09,y+h,cz+sz*r+0.09);
        B.box('wood',cx-r-0.12,y+h-0.25,cz-r-0.12,cx+r+0.12,y+h,cz+r+0.12); y+=h; y=skirtRoof(B,cx,y-0.15,cz,4,r+1.25,r*0.85,0.55,{curve:1.2,lift:0.12,thick:0.16,tile:pr.tile},'roofTile')-0.05; }
      spire(y,2.3,'metal',9); break; }
    case 'cpagoda': { const n=7, bodyH=(Ht-1.8)/n; let y=yb; B.cyl('stone',half+0.4,half+0.45,0.5,8,mm(mT(cx,y,cz),mRY(Math.PI/8))); y+=0.5;
      for(let k=0;k<n;k++){ const r=half*(1-0.06*k)-0.2, h=bodyH*(k===0?1.25:0.9); B.cyl(wk,r/Math.cos(Math.PI/8),r/Math.cos(Math.PI/8)*0.98,h,8,mm(mT(cx,y,cz),mRY(Math.PI/8)));
        for(let d=0;d<4;d++){ const a=d*Math.PI/2; B.box('void',-0.22,h*0.25,0,0.22,h*0.7,0.06,mm(mT(cx,y,cz),mRY(a),mT(0,0,r-0.02))); } y+=h; y=skirtRoof(B,cx,y-0.1,cz,8,r+0.75,r*0.9,0.42,{curve:1.3,lift:0.28,thick:0.14,tile:pr.tile},'roofTile')-0.04; }
      spire(y,1.6,'metal',5); break; }
    case 'newartemple': { let y=yb; for(let k=0;k<4;k++){ const w=half-k*0.28; B.box('base',cx-w,y,cz-w,cx+w,y+0.45,cz+w); y+=0.45; }
      const r=half-1.1, h1=Math.max(2.4,(Ht-y+yb)*0.38); B.box('wall',cx-r,y,cz-r,cx+r,y+h1,cz+r); for(let d=0;d<4;d++){ const a=d*Math.PI/2; B.box('door',-0.45,0,0,0.45,1.9,0.06,mm(mT(cx,y,cz),mRY(a),mT(0,0,r))); } y+=h1;
      for(let k=0;k<3;k++){ const rr=r*(1-0.22*k), ro=rr+1.0-k*0.15; y=skirtRoof(B,cx,y-0.05,cz,4,ro,rr*0.7,0.9-k*0.1,{curve:1.05,lift:0,thick:0.14,tile:pr.tile},'roofTile');
        for(let d=0;d<4;d++){ const a=d*Math.PI/2+Math.PI/4; for(const f of [-0.45,0.45]){ const M=mm(mT(cx,0,cz),mRY(d*Math.PI/2)); B.segCyl('wood',V3(f*rr*1.6,y-0.95,rr).applyMatrix4(M),V3(f*rr*1.9,y-0.55,rr+0.7).applyMatrix4(M),0.06,0.05,4); } }
        if(k<2){ const rw=rr*0.72; B.box('wall',cx-rw,y-0.3,cz-rw,cx+rw,y+0.9,cz+rw); y+=0.9; } }
      B.cyl('gold',0.25,0.1,0.6,8,mT(cx,y-0.1,cz)); B.sphere('gold',0.18,mT(cx,y+0.6,cz),8,6); B.cone('gold',0.12,0.5,8,mT(cx,y+0.72,cz)); break; }
    case 'stonepagoda': { let y=yb; B.box('stone',cx-half,y,cz-half,cx+half,y+0.5,cz+half); B.box('stone',cx-half*0.8,y+0.5,cz-half*0.8,cx+half*0.8,y+0.9,cz+half*0.8); y+=0.9; const n=3, bh=Math.max(0.9,(Ht-2.4)/n*0.65);
      for(let k=0;k<n;k++){ const r=half*0.55*(1-0.12*k); B.box('stone',cx-r,y,cz-r,cx+r,y+bh*(k===0?1.3:1),cz+r); y+=bh*(k===0?1.3:1); for(let s=0;s<3;s++) B.box('stone',cx-r-0.08*s,y+s*0.06,cz-r-0.08*s,cx+r+0.08*s,y+s*0.06+0.06,cz+r+0.08*s); y=skirtRoof(B,cx,y+0.18,cz,4,r+0.55,r*0.6,0.28,{curve:1.6,lift:0.14,thick:0.22,tile:{kind:'stone'}},'stone'); }
      spire(y,1.2,'stone',4); break; }
    case 'drumtower': { const bh=Math.min(Ht*0.45,4.5); B.box(wk,cx-half,yb,cz-half,cx+half,yb+bh,cz+half); B.box('base',cx-half-0.05,yb+bh-0.3,cz-half-0.05,cx+half+0.05,yb+bh,cz+half+0.05);
      for(let d=0;d<4;d++){ const a=d*Math.PI/2; B.flat('void',openPoly({u0:-0.8,u1:0.8,v0:0,vs:1.8,arch:'round'}),mm(mT(cx,yb,cz),mRY(a),mT(0,0,half+0.01))); }
      const y=yb+bh, r=half-0.5, hh=Math.max(2.4,Math.min(3.2,Ht-bh-2)); for(const sx of [-1,-0.33,0.33,1]) for(const sz of [-1,1]){ B.cyl('paint',0.11,0.11,hh,8,mT(cx+sx*r,y,cz+sz*r)); B.cyl('paint',0.11,0.11,hh,8,mT(cx+sz*r,y,cz+sx*r)); }
      B.box('lattice',cx-r+0.15,y+0.6,cz-r+0.15,cx+r-0.15,y+hh-0.5,cz+r-0.15); B.box('band',cx-r-0.12,y+hh-0.45,cz-r-0.12,cx+r+0.12,y+hh,cz+r+0.12);
      const y2=skirtRoof(B,cx,y+hh-0.1,cz,4,r+1.0,r*0.75,0.6,{curve:1.3,lift:0.2,thick:0.15,tile:pr.tile},'roofTile');
      B.box('wall',cx-r*0.75,y2-0.1,cz-r*0.75,cx+r*0.75,y2+0.7,cz+r*0.75); skirtRoof(B,cx,y2+0.6,cz,4,r*0.75+0.9,0,1.5,{curve:1.3,lift:0.2,thick:0.15,tile:pr.tile},'roofTile'); break; }
    case 'chorten': { let y=yb; for(let k=0;k<4;k++){ const w=half-k*0.22; B.box('trim',cx-w,y,cz-w,cx+w,y+0.46,cz+w); B.box('band',cx-w-0.02,y+0.45,cz-w-0.02,cx+w+0.02,y+0.55,cz+w+0.02); y+=0.55; }
      const r=half*0.62; B.lathe('trim',[[r*0.9,0],[r,0.3],[r*0.98,0.9],[r*0.8,1.45],[r*0.45,1.8],[0,1.85]],20,mT(cx,y,cz)); y+=1.75; B.box('trim',cx-0.42,y,cz-0.42,cx+0.42,y+0.5,cz+0.42); B.box('band',cx-0.48,y+0.4,cz-0.48,cx+0.48,y+0.55,cz+0.48); y+=0.55;
      const sh=Math.max(1.6,Ht-(y-yb)-0.9); for(let k=0;k<13;k++) B.cyl('gold',0.36-k*0.02,0.34-k*0.02,sh/13*0.9,12,mT(cx,y+k*sh/13,cz)); y+=sh; B.cyl('gold',0.45,0.4,0.08,12,mT(cx,y,cz)); B.sphere('gold',0.14,mT(cx,y+0.3,cz),8,6); B.torus('gold',0.16,0.03,Math.PI,mm(mT(cx,y+0.55,cz),mRZ(Math.PI)),5,10); break; }
    case 'prang': { let y=yb; B.box('stone',cx-half,y,cz-half,cx+half,y+0.6,cz+half); y+=0.6; const r=half*0.7, bh=Math.max(2,(Ht-y+yb)*0.35); B.box('trim',cx-r,y,cz-r,cx+r,y+bh,cz+r); for(let d=0;d<4;d++){ const a=d*Math.PI/2; B.flat('void',openPoly({u0:-0.4,u1:0.4,v0:0.3,vs:1.6,arch:'pointed'}),mm(mT(cx,y,cz),mRY(a),mT(0,0,r+0.01))); } y+=bh;
      const tiers=6, th=(Ht-(y-yb)-1.0)/tiers; for(let k=0;k<tiers;k++){ const rr=r*(1-k/(tiers+1.5)); B.cyl('trim',rr*1.05,rr*0.9,th*0.75,12,mT(cx,y,cz)); B.cyl('stone',rr*0.95,rr*0.95,th*0.25,12,mT(cx,y+th*0.75,cz)); y+=th; }
      B.cone('gold',r*0.2,1.0,8,mT(cx,y,cz)); break; }
    case 'meru': { let y=yb; B.box('band',cx-half,y,cz-half,cx+half,y+0.8,cz+half); B.box('wall',cx-half*0.7,y+0.8,cz-half*0.7,cx+half*0.7,y+2.2,cz+half*0.7); B.box('door',cx-0.35,y+0.85,cz+half*0.7,cx+0.35,y+1.9,cz+half*0.7+0.04); y+=2.2;
      const n=Math.max(3,Math.min(11,Math.round((Ht-2.6)/0.7))|1); for(let k=0;k<n;k++){ const r=half*0.95*(1-0.06*k); const ty=skirtRoof(B,cx,y,cz,4,r,r*0.55,0.45,{curve:1,lift:0,thick:0.25,tile:{kind:'thatch'}},'roofTile'); B.box('black',cx-r*0.55,ty-0.05,cz-r*0.55,cx+r*0.55,ty+0.18,cz+r*0.55); y=ty+0.18; }
      B.cone('roofTile',0.4,0.6,4,mm(mT(cx,y,cz),mRY(Math.PI/4))); B.sphere('gold',0.1,mT(cx,y+0.65,cz),6,4); break; }
    case 'chhatritower': { const sh=Math.max(3,Ht-3.2); B.box(wk,cx-half,yb,cz-half,cx+half,yb+sh,cz+half); for(let y=yb+3;y<yb+sh-0.5;y+=3){ B.box('stone',cx-half-0.25,y,cz-half-0.25,cx+half+0.25,y+0.12,cz+half+0.25); }
      const y=yb+sh, r=half-0.15; B.box('stone',cx-half-0.3,y,cz-half-0.3,cx+half+0.3,y+0.15,cz+half+0.3); for(const sx of[-1,1]) for(const sz of[-1,1]) B.cyl('stone',0.1,0.1,1.6,8,mT(cx+sx*r,y+0.15,cz+sz*r));
      B.box('stone',cx-half-0.35,y+1.75,cz-half-0.35,cx+half+0.35,y+1.9,cz+half+0.35); B.lathe('dome',DOMEPROF.onion(half*0.8),16,mT(cx,y+1.9,cz)); alem(B,cx,y+1.9+half*0.8*1.38,cz,0.5); break; }
  }
}
/* ---------- roof pavilions ---------- */
function asiaKiosk(B,kind,cx,y,cz,hk,kh,st,col,wk){
  const pr=st.pr||{kind:'hip',pitch:0.6,ov:0.8,curve:1.3,lift:0.2,thick:0.12,tile:{kind:'barrel',c:'#555'},ridge:'plain'}, post=(st.timber&&st.timber.post)||'wood';
  const posts=(pts,h,r)=>{ for(const [px,pz] of pts){ B.cyl(post,r,r,h,8,mT(px,y+0.3,pz)); col(px-r,y,pz-r,px+r,y+h,pz+r); } };
  const deck=(w,d,h)=>{ B.box('stone',cx-w,y,cz-d,cx+w,y+h,cz+d); col(cx-w,y,cz-d,cx+w,y+h,cz+d); };
  const rail=(w,d,h0)=>{ for(const [ax,az,bx,bz] of [[-w,-d,w,-d],[-w,d,w,d],[-w,-d,-w,d],[w,-d,w,d]]){ B.box(post,cx+Math.min(ax,bx)-0.03,y+h0+0.45,cz+Math.min(az,bz)-0.03,cx+Math.max(ax,bx)+0.03,y+h0+0.52,cz+Math.max(az,bz)+0.03); } };
  switch(kind){
    case 'ting': case 'ting6': case 'azumaya': case 'jeongja': case 'gyaphib': {
      const n=kind==='ting6'?6:4, r=hk*0.72, h=Math.min(2.8,kh), lift=kind==='ting6'?0.6:kind==='jeongja'?0.45:kind==='azumaya'?0.08:0.3;
      deck(hk*0.85,hk*0.85,0.3); const pts=[]; for(let k=0;k<n;k++){ const a=Math.PI/n+2*Math.PI*k/n+(n===4?0:0); pts.push([cx+Math.cos(a)*r/Math.cos(Math.PI/n)*Math.cos(Math.PI/n),cz+Math.sin(a)*r/Math.cos(Math.PI/n)*Math.cos(Math.PI/n)]); }
      const pp=[]; for(let k=0;k<n;k++){ const a=Math.PI/n+2*Math.PI*k/n, R=r/Math.cos(Math.PI/n); pp.push([cx+Math.cos(a)*R,cz+Math.sin(a)*R]); }
      if(kind==='gyaphib'){ B.box(wk,cx-r,y+0.3,cz-r,cx+r,y+h,cz+r); B.box('door',cx-0.4,y+0.3,cz+r,cx+0.4,y+2.0,cz+r+0.04); col(cx-r,y,cz-r,cx+r,y+h,cz+r); }
      else { posts(pp,h,0.11); if(n===4) rail(r,r,0.3); if(kind==='jeongja') B.box('wood',cx-r,y+0.3,cz-r,cx+r,y+0.55,cz+r); }
      B.cyl(post==='paint'?'paint':'wood',r/Math.cos(Math.PI/n)+0.12,r/Math.cos(Math.PI/n)+0.12,0.22,n,mm(mT(cx,y+0.3+h-0.22,cz),mRY(n===4?Math.PI/4:0)));
      const mat=kind==='gyaphib'?'gold':'roofTile', top=skirtRoof(B,cx,y+0.3+h-0.1,cz,n,r+0.95,0,(r+0.95)*(kind==='azumaya'?0.7:0.85),{curve:kind==='azumaya'?1.1:1.5,lift,thick:0.12,tile:pr.tile},mat,n===4?0:0);
      if(kind==='gyaphib'){ B.cyl('gold',0.2,0.12,0.5,8,mT(cx,top-0.05,cz)); B.sphere('gold',0.16,mT(cx,top+0.55,cz),8,6); B.cone('gold',0.1,0.5,8,mT(cx,top+0.68,cz)); }
      else { B.sphere(kind==='azumaya'?'metal':'roofTile',0.16,mT(cx,top+0.1,cz),8,6); B.cone(kind==='azumaya'?'metal':'roofTile',0.08,0.4,6,mT(cx,top+0.2,cz)); }
      if(FT_LAMPS(st)) hangLampAsia(B,cx,y+0.3+h-0.2,cz,st.lamp); break; }
    case 'sala': case 'pati': case 'bale': {
      const w=hk*0.95, d=hk*0.62, h=Math.min(2.6,kh), base=kind==='bale'?0.75:kind==='pati'?0.45:0.35;
      deck(w,d,base); if(kind==='bale') B.box('band',cx-w-0.02,y+base-0.25,cz-d-0.02,cx+w+0.02,y+base-0.1,cz+d+0.02);
      const pp=[]; for(const sx of [-1,0,1]) for(const sz of[-1,1]) pp.push([cx+sx*(w-0.2),cz+sz*(d-0.2)]); for(const [px,pz] of pp){ B.cyl('wood',0.11,0.11,h,8,mT(px,y+base,pz)); col(px-0.11,y,pz-0.11,px+0.11,y+base+h,pz+0.11); }
      B.box('wood',cx-w+0.05,y+base+h-0.2,cz-d+0.05,cx+w-0.05,y+base+h,cz+d-0.05);
      const cfg=Object.assign({},pr,{kind:kind==='sala'?'gable':'hip', ov:0.7}); pitchedRoof(B,cx-w+0.1,cx+w-0.1,cz-d+0.1,cz+d-0.1,y+base+h-0.1,cfg,{a0:1,a1:1,b0:1,b1:1},_M(),{wallK:'wood'});
      if(FT_LAMPS(st)) hangLampAsia(B,cx,y+base+h-0.2,cz,st.lamp); break; }
  }
}
let FT_LAMPS=st=>true;   // set per build so kiosks honour the Lanterns switch
