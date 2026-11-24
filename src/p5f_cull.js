/* ============================================================
   CULLING — from whole modules down to single objects
   A finished building is still one mesh per material (so the draw-call count stays at a few dozen), but every mesh
   keeps a table of which vertex ranges belong to which object, and every object belongs to a module: a WFC cell on
   one storey, a tile of the site round the plot, or (for things that span several) the whole plot. Each frame the
   modules are tested against the view frustum and against what the GPU last reported as hidden; inside a module that
   is only partly in view, each object is tested on its own; objects too small to cover a couple of pixels are dropped.
   The surviving ranges are written into each mesh's index buffer, so hidden objects cost nothing on the GPU.
   Shadows are drawn from a second, full copy of each mesh (sharing the same vertex buffers) that only the shadow pass
   sees, so what the camera culls still casts its shadow.
   ============================================================ */
const CULL_OBJ_DIAG=2.6, CULL_OBJ_CALLS=64;   // an object: consecutive calls of one module, up to this size
const CULL_HEAVY=400;   // objects with at least this many triangles get an occlusion query of their own

function cullFinish(B,mats,o){
  const {CW:cw,NX,NZ,H}=o, ox=-NX*cw/2, oz=-NZ*cw/2;
  const grp=new THREE.Group();
  // 1. every call's box (a call can add to several materials)
  const callBox=new Map();
  for(const [,b] of B.bk) for(let i=0;i<b.P.length;i++){ const c=b.Q[i], a=b.A[i]; let e=callBox.get(c);
    if(!e){ callBox.set(c,{a:a.slice(),g:b.G[i]}); continue; } const A=e.a; for(let j=0;j<3;j++){ if(a[j]<A[j]) A[j]=a[j]; if(a[j+3]>A[j+3]) A[j+3]=a[j+3]; } }
  // 2. the module a box belongs to
  const modOf=(a,g)=>{ if(g&&g.key) return g.key;
    const cx=(a[0]+a[3])/2, cz=(a[2]+a[5])/2, cy=(a[1]+a[4])/2;
    if(a[3]-a[0]>1.6*cw||a[5]-a[2]>1.6*cw) return 'G';   // spans several modules (a long roof, the terrain): a module of its own
    const ix=Math.floor((cx-ox)/cw), iz=Math.floor((cz-oz)/cw);
    if(ix<0||iz<0||ix>=NX||iz>=NZ) return 's'+ix+','+iz;   // a tile of the site round the plot
    return 'c'+ix+','+iz+','+clamp(Math.floor(cy/H),0,3); };
  // 3. objects: runs of consecutive calls in one module, kept small
  const cids=[...callBox.keys()].sort((p,q)=>p-q), objs=[], cid2o=new Map(); let cur=null;
  for(const c of cids){ const e=callBox.get(c), mk=modOf(e.a,e.g), a=e.a;
    if(cur&&cur.g===e.g&&cur.mk===mk&&cur.n<CULL_OBJ_CALLS&&mk!=='G'){ const U=[Math.min(cur.a[0],a[0]),Math.min(cur.a[1],a[1]),Math.min(cur.a[2],a[2]),Math.max(cur.a[3],a[3]),Math.max(cur.a[4],a[4]),Math.max(cur.a[5],a[5])];
      if(Math.hypot(U[3]-U[0],U[4]-U[1],U[5]-U[2])<=CULL_OBJ_DIAG){ cur.a=U; cur.n++; cid2o.set(c,cur.id); continue; } }
    cur={id:objs.length,a:a.slice(),g:e.g,mk:mk==='G'?'g'+objs.length:mk,n:1,m:[],tris:0}; objs.push(cur); cid2o.set(c,cur.id); }
  // 4. one mesh per material, its vertex ranges per object, and a shadow twin over the same buffers
  const cat=(arrs,len)=>{ const out=new Float32Array(len); let off=0; for(const a of arrs){ out.set(a,off); off+=a.length; } return out; };
  const meshes=[];
  for(const [k,b] of B.bk){ if(!b.n) continue;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(cat(b.P,b.n*3),3));
    g.setAttribute('normal',new THREE.BufferAttribute(cat(b.N,b.n*3),3));
    g.setAttribute('uv',new THREE.BufferAttribute(cat(b.U,b.n*2),2));
    g.setAttribute('color',new THREE.BufferAttribute(cat(b.C,b.n*3),3));
    g.computeBoundingSphere();
    const idx=new Uint32Array(b.n); for(let i=0;i<b.n;i++) idx[i]=i;
    const ia=new THREE.BufferAttribute(idx,1); ia.setUsage(THREE.DynamicDrawUsage); g.setIndex(ia);
    const mat=mats[k]||mats.wall, mesh=new THREE.Mesh(g,mat); mesh.castShadow=false; mesh.receiveShadow=true; mesh.name=k; grp.add(mesh);
    const mi=meshes.length, ranges=[]; let s=0, cnt=0;
    for(let i=0;i<b.P.length;i++){ const c=b.P[i].length/3, oi=cid2o.get(b.Q[i]), last=ranges[ranges.length-1];
      if(last&&last.o===oi&&last.s+last.c===s) last.c+=c; else ranges.push({o:oi,s,c});
      const O=objs[oi]; if(O.m[O.m.length-1]!==mi) O.m.push(mi); O.tris+=c/3; s+=c; cnt+=c; }
    if(!NOSHADOW.has(k)){ const g2=new THREE.BufferGeometry(); for(const nm of ['position','normal','uv']) g2.setAttribute(nm,g.attributes[nm]); g2.boundingSphere=g.boundingSphere.clone();
      const sm=new THREE.Mesh(g2,mat); sm.castShadow=true; sm.receiveShadow=false; sm.layers.set(1); sm.userData.shadowOnly=true; sm.name=k+'·shadow'; grp.add(sm); }
    meshes.push({mesh,idx,ia,ranges,n:cnt,w:cnt,dirty:false}); }
  // 5. modules: their boxes, their objects, and the box round a room's contents
  const mods=new Map();
  for(const O of objs){ const a=O.a; O.cx=(a[0]+a[3])/2; O.cy=(a[1]+a[4])/2; O.cz=(a[2]+a[5])/2; O.r=Math.hypot(a[3]-a[0],a[4]-a[1],a[5]-a[2])/2; O.int=!!(O.g&&O.g.interior);
    let M=mods.get(O.mk); if(!M){ M={key:O.mk,a:a.slice(),objs:[],ia:null,tris:0,hid:false,ihid:false,ns:0,ni:0,fs:2}; mods.set(O.mk,M); }
    else for(let j=0;j<3;j++){ if(a[j]<M.a[j]) M.a[j]=a[j]; if(a[j+3]>M.a[j+3]) M.a[j+3]=a[j+3]; }
    M.objs.push(O.id); M.tris+=O.tris; O.hid=false; O.ns=0; O.fin=0; O.q=null; if(O.tris>=CULL_HEAVY&&O.mk[0]!=='g') (M.heavy||(M.heavy=[])).push(O.id);
    if(O.int){ if(!M.ia) M.ia=a.slice(); else for(let j=0;j<3;j++){ if(a[j]<M.ia[j]) M.ia[j]=a[j]; if(a[j+3]>M.ia[j+3]) M.ia[j+3]=a[j+3]; } } }
  grp.userData.cull=new CullSet(meshes,objs,[...mods.values()]);
  return grp;
}

// box against frustum planes: 0 outside, 1 straddling, 2 inside
function boxInFrustum(P,a){ let r=2;
  for(let i=0;i<6;i++){ const n=P[i].normal, d=P[i].constant;
    if(n.x*(n.x>0?a[3]:a[0])+n.y*(n.y>0?a[4]:a[1])+n.z*(n.z>0?a[5]:a[2])+d<0) return 0;
    if(n.x*(n.x>0?a[0]:a[3])+n.y*(n.y>0?a[1]:a[4])+n.z*(n.z>0?a[2]:a[5])+d<0) r=1; }
  return r; }
const boxHas=(a,p,m)=>p.x>a[0]-m&&p.x<a[3]+m&&p.y>a[1]-m&&p.y<a[4]+m&&p.z>a[2]-m&&p.z<a[5]+m;
const boxDist=(a,p)=>Math.hypot(Math.max(a[0]-p.x,0,p.x-a[3]),Math.max(a[1]-p.y,0,p.y-a[4]),Math.max(a[2]-p.z,0,p.z-a[5]));

class CullSet{
  constructor(meshes,objs,mods){ for(const M of mods) M.heavy=M.heavy||[]; this.meshes=meshes; this.objs=objs; this.mods=mods; this.vis=new Uint8Array(objs.length).fill(1); this.total=objs.reduce((s,o)=>s+o.tris,0);
    this.frustum=new THREE.Frustum(); this._m=new THREE.Matrix4(); this.on=true; this.stats=null; }
  /* decide what to draw from this camera; opts: {px: smallest object in pixels, occl: use the GPU's hidden flags} */
  update(cam,viewH,opt){
    const F=this.frustum.setFromProjectionMatrix(this._m.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse)).planes, p=cam.position;
    const K=viewH/(2*Math.tan(cam.fov*Math.PI/360)), minPx=opt.px, vis=this.vis, objs=this.objs, on=this.on&&opt.on;
    let nv=0, tv=0, mIn=0, mOcc=0, iOcc=0, oOcc=0, nSmall=0;
    const show=(O,v)=>{ if(v){ nv++; tv+=O.tris; } if(vis[O.id]!==v){ vis[O.id]=v; for(const mi of O.m) this.meshes[mi].dirty=true; } };
    for(const M of this.mods){
      // within opt.near of the camera nothing is hidden by occlusion: a doorway reveals its next room in the same frame, not one later
      const nr=opt.near||0, fs= on? boxInFrustum(F,M.a) : 2; M.fs=fs; M.camIn=boxHas(M.a,p,0.6)||(nr>0&&boxDist(M.a,p)<nr*0.5); M.camInI=!!(M.ia&&(boxHas(M.ia,p,0.6)||(nr>0&&boxDist(M.ia,p)<nr)));
      if(M.camIn||!fs){ M.hid=false; M.ns=0; } if(M.camInI||!fs){ M.ihid=false; M.ni=0; }   // standing in it, or just out of view: assume it shows (no holes when it comes back)
      const shellHid=on&&opt.occl&&M.hid&&!M.camIn, intHid=on&&opt.occl&&M.ihid&&!M.camInI;
      if(fs&&M.key[0]!=='g') mIn++; if(fs&&shellHid) mOcc++; else if(fs&&intHid&&M.ia) iOcc++;
      for(const id of M.objs){ const O=objs[id], a=O.a; O.fin=0;
        if(!fs||shellHid||(O.int&&intHid)||(fs===1&&boxInFrustum(F,a)===0)){ O.hid=false; O.ns=0; show(O,0); continue; }   // not asked about: shows as soon as it is
        O.fin=1;
        if(on&&opt.occl&&O.hid){ if(boxHas(a,p,0.6)||(nr>0&&boxDist(a,p)<nr)){ O.hid=false; O.ns=0; } else { oOcc++; show(O,0); continue; } }   // a heavy object behind something nearer
        if(on&&minPx>0){ const d=Math.hypot(O.cx-p.x,O.cy-p.y,O.cz-p.z)-O.r;
          if(d>0){ const px=2*O.r*K/d, lim=vis[O.id]? minPx : minPx*1.3;   // a little hysteresis at the threshold
            if(px<lim){ nSmall++; show(O,0); continue; } } }
        show(O,1); } }
    // rewrite the index of every material whose visible objects changed
    let up=0;
    for(const m of this.meshes){ if(!m.dirty) continue; m.dirty=false; const I=m.idx; let w=0;
      for(const r of m.ranges){ if(!vis[r.o]) continue; const s=r.s, e=s+r.c; for(let i=s;i<e;i++) I[w++]=i; }
      m.w=w; m.mesh.geometry.setDrawRange(0,w); m.mesh.visible=w>0; m.ia.updateRange.offset=0; m.ia.updateRange.count=w; m.ia.needsUpdate=true; up+=w; }
    this.stats={objs:nv, nObj:objs.length, tris:Math.round(tv), total:Math.round(this.total), mods:mIn, nMods:this.mods.filter(M=>M.key[0]!=='g').length, mOcc, iOcc, oOcc, small:nSmall, upload:up};
    return this.stats; }
  // everything back on (when culling is switched off)
  showAll(){ for(const O of this.objs) if(!this.vis[O.id]){ this.vis[O.id]=1; for(const mi of O.m) this.meshes[mi].dirty=true; } }
}
