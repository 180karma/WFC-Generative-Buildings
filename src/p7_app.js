
/* ============================================================
   APP — scene, lighting, UI, inspector, replay
   ============================================================ */
const $=id=>document.getElementById(id);
const TKEYS=TINFO.map(t=>t.k);
const TODS={
  noon:{label:'Noon', el:66, az:160, sun:'#fff3e0', si:2.4, sky:['#4d8dcf','#d8e6ef'], hs:'#d8e6ff', hg:'#b49b78', hi:0.75, exp:0.95, fog:'#d3e0ea', glow:0, lamp:0.05, stars:0},
  after:{label:'Afternoon', el:36, az:228, sun:'#ffe4bd', si:2.35, sky:['#4884c4','#ecdcc2'], hs:'#dfe4f0', hg:'#a88d68', hi:0.7, exp:0.95, fog:'#e2d9c8', glow:0, lamp:0.05, stars:0},
  golden:{label:'Golden', el:12, az:248, sun:'#ffb066', si:2.3, sky:['#35568e','#f0b07a'], hs:'#f2c8a4', hg:'#6c5039', hi:0.62, exp:1.0, fog:'#e6b48e', glow:0.35, lamp:0.6, stars:0},
  dusk:{label:'Dusk', el:2.5, az:262, sun:'#ff7442', si:1.25, sky:['#1c2950','#d9765a'], hs:'#7d6c9b', hg:'#3a2c2a', hi:0.55, exp:1.08, fog:'#6a5160', glow:1.3, lamp:1.6, stars:0.35},
  night:{label:'Night', el:40, az:120, sun:'#9db1d8', si:0.34, sky:['#04060d','#1a2341'], hs:'#3c4b78', hg:'#131117', hi:0.34, exp:1.18, fog:'#111727', glow:2.0, lamp:2.8, stars:1}
};

const S={
  styleId:'isfahani', seed:'qasr-2075', nx:3, nz:3, cw:8, lod:'auto', cull:'on', fit:'period', finish:FIN_DEFAULT(), seedAll:true, seededFrom:null, heights:STYLE.isfahani.foot.slice(), fill:0.72, ensureStair:true, stairs:'both',
  w:Object.assign({},STYLE.isfahani.w), feats:Object.assign({},STYLE.isfahani.feats),
  pattern:'auto', theta:null, tod:'golden', weather:0.3, locks:{}, mods:{}, view:'arch', sel:{x:1,z:1,l:0}, footEdited:false,
  q:(window.matchMedia&&matchMedia('(pointer:coarse)').matches)?1:2
};
let plan=null, lastVars=null, archObj=null, lastMsg='';
setCellSize(S.cw);

/* ---------- three.js scene ---------- */
const canvas=$('view');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(36,1,0.5,900);
camera.position.set(30,20,36);
// OrbitControls r128 reads touches[1] after a finger has lifted mid-gesture and throws; swallow that TypeError in its touch handlers
const _ael=canvas.addEventListener;
canvas.addEventListener=function(t,f,o){ if(/^touch/.test(t)&&typeof f==='function') return _ael.call(this,t,function(e){ try{ return f.call(this,e); }catch(err){ if(!(err instanceof TypeError)) throw err; } },o); return _ael.call(this,t,f,o); };
const controls=new THREE.OrbitControls(camera,canvas);
canvas.addEventListener=_ael;
controls.enableDamping=true; controls.dampingFactor=0.08; controls.maxPolarAngle=Math.PI*0.495; controls.minDistance=6; controls.maxDistance=180; controls.target.set(0,5,0);
const hemi=new THREE.HemisphereLight(0xffffff,0x887766,0.7); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,3); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:200}); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.04;
scene.add(sun); scene.add(sun.target);
const lampLights=[]; for(let i=0;i<6;i++){ const p=new THREE.PointLight(0xffb56a,0,14,2); scene.add(p); lampLights.push(p); }
let groundMesh=null; const groundMats={};
function setGround(st){
  if(!groundMats[st.id]){ const t=mkTex(texGround(st.ground,RNG('g'+st.id)),7,7); groundMats[st.id]=new THREE.MeshStandardMaterial({map:t,roughness:1}); }
  if(!groundMesh){ groundMesh=new THREE.Mesh(new THREE.PlaneGeometry(260,260),groundMats[st.id]); groundMesh.rotation.x=-Math.PI/2; groundMesh.position.y=-0.06; groundMesh.receiveShadow=true;
    const uv=groundMesh.geometry.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*260,uv.getY(i)*260); scene.add(groundMesh); }
  groundMesh.material=groundMats[st.id];
}
// stars
const starGeo=new THREE.BufferGeometry(); { const p=[], r=RNG('stars'); for(let i=0;i<700;i++){ const a=r.f()*Math.PI*2, e=Math.asin(r.range(0.08,1)); p.push(Math.cos(a)*Math.cos(e)*400,Math.sin(e)*400,Math.sin(a)*Math.cos(e)*400); } starGeo.setAttribute('position',new THREE.Float32BufferAttribute(p,3)); }
const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false})); scene.add(stars);
// procedural sky dome: gradient, horizon haze and sun disc
const skyMat=new THREE.ShaderMaterial({
  uniforms:{top:{value:new THREE.Color()},hor:{value:new THREE.Color()},gnd:{value:new THREE.Color()},sunCol:{value:new THREE.Color()},sunDir:{value:new THREE.Vector3(0,1,0)},sunI:{value:1}},
  vertexShader:'varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position=p.xyww; }',
  fragmentShader:'uniform vec3 top; uniform vec3 hor; uniform vec3 gnd; uniform vec3 sunCol; uniform vec3 sunDir; uniform float sunI; varying vec3 vD;\n'+
    'void main(){ vec3 d=normalize(vD); float e=d.y; vec3 c=e>0.0? mix(hor,top,pow(smoothstep(0.0,0.75,e),0.8)) : mix(hor*0.9,gnd,smoothstep(0.0,0.2,-e));\n'+
    ' float s=max(dot(d,normalize(sunDir)),0.0); c+=sunCol*(pow(s,1400.0)*4.0+pow(s,28.0)*0.35+pow(s,5.0)*0.1)*sunI*step(-0.02,e);\n'+
    ' gl_FragColor=vec4(c,1.0); }',
  side:THREE.BackSide, depthWrite:false, depthTest:false, fog:false });
const sky=new THREE.Mesh(new THREE.SphereGeometry(400,40,20),skyMat); sky.renderOrder=-10; sky.frustumCulled=false; scene.add(sky);
const pmrem=new THREE.PMREMGenerator(renderer); let envRT=null, envKey='', glowBase=0;

/* ---------- proxies: module view, replay and picking ---------- */
const proxyGroup=new THREE.Group(); scene.add(proxyGroup); proxyGroup.visible=false;
const pBox=new THREE.BoxGeometry(1,1,1), pEdge=new THREE.EdgesGeometry(pBox), pArrow=new THREE.ConeGeometry(0.16,0.32,4);
pArrow.rotateX(Math.PI/2);
const proxies=[];
const MAXCELL=100;  // 5×5 plot × 4 storeys
for(let i=0;i<MAXCELL;i++){
  const m=new THREE.Mesh(pBox,new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:0.9,roughness:0.7}));
  const e=new THREE.LineSegments(pEdge,new THREE.LineBasicMaterial({color:0x10131a,transparent:true,opacity:0.45})); m.add(e);
  const a=new THREE.Mesh(pArrow,new THREE.MeshBasicMaterial({color:0xffffff})); a.position.set(0,0,0.5); m.add(a);
  m.userData={i,edge:e,arrow:a}; proxyGroup.add(m); proxies.push(m);
}
const selBox=new THREE.LineSegments(pEdge,new THREE.LineBasicMaterial({color:0xffd27a,transparent:true,opacity:0.95,depthTest:false})); selBox.renderOrder=10; scene.add(selBox);
const pickBoxes=[]; const pickGroup=new THREE.Group(); scene.add(pickGroup);
for(let i=0;i<MAXCELL;i++){ const m=new THREE.Mesh(pBox,new THREE.MeshBasicMaterial({visible:false})); m.userData.i=i; pickGroup.add(m); pickBoxes.push(m); }
const cxzl=i=>[i%GRID.nx,((i/GRID.nx)|0)%GRID.nz,(i/GRID.nc)|0];
const cidx=(x,z,l)=>x+z*GRID.nx+l*GRID.nc;
function cellPos(i,st){ const [x,z,l]=cxzl(i), [px,pz]=cellC(x,z); return [px, l*st.H+st.H/2, pz]; }
function layoutProxies(){
  const st=STYLE[S.styleId];
  for(let i=0;i<MAXCELL;i++){ const on=i<GRID.ncell; proxies[i].visible=on; if(!on) continue; const [px,py,pz]=cellPos(i,st); proxies[i].position.set(px,py,pz); pickBoxes[i].position.set(px,py,pz); pickBoxes[i].scale.set(CW,st.H,CW); }
}
function showDomain(dom,ev,evCell){
  const st=STYLE[S.styleId];
  for(let i=0;i<MAXCELL;i++){ if(i>=GRID.ncell){ proxies[i].visible=false; continue; }
    const p=proxies[i], m=dom[i], n=popc(m), [x,z,l]=cxzl(i), h=S.heights[x+z*GRID.nx];
    const mat=p.material; p.visible=true; p.userData.arrow.visible=false;
    if(n===1){ const v=lowbit(m), t=VARS[v].t;
      if(t===EMPTY){ p.visible= l<h; mat.color.set('#ffffff'); mat.opacity=0.05; p.scale.set(CW*0.9,st.H*0.9,CW*0.9); p.userData.edge.material.opacity=0.12; }
      else { mat.color.set(TINFO[t].color); mat.opacity=0.92; p.userData.edge.material.opacity=0.5;
        const sy= BASE_T(t)===COURT?0.12 : t===TOWER?0.92 : 0.92; const sx= t===TOWER?0.45:0.92;
        p.scale.set(CW*sx,st.H*sy,CW*sx); if(BASE_T(t)===COURT) p.position.y=l*st.H+st.H*0.06; else p.position.y=cellPos(i,st)[1];
        if(t===IWAN||t===GATE){ const r=VARS[v].r; p.userData.arrow.visible=true; p.userData.arrow.rotation.y=Math.atan2(DIRS[r][0],DIRS[r][1]); p.userData.arrow.position.set(DIRS[r][0]*0.5,0,DIRS[r][1]*0.5); } }
    } else { const f=n/NV; mat.color.set(ev==='backtrack'&&evCell===i?'#ff6a4d':'#e8eef6'); mat.opacity=0.1+0.22*f; p.position.y=cellPos(i,st)[1];
      const s=0.3+0.62*f; p.scale.set(CW*s,st.H*s,CW*s); p.userData.edge.material.opacity=0.35; }
    if(ev&&evCell===i&&n===1){ mat.color.offsetHSL(0,0,0.12); }
  }
}
function showPlanProxies(){ if(!plan) return; const d=new Uint32Array(GRID.ncell); for(let i=0;i<GRID.ncell;i++) d[i]=1<<plan.vars[i]; showDomain(d); }

/* ---------- lighting ---------- */
function applyTOD(){
  const T=TODS[S.tod];
  scene.background=null;
  skyMat.uniforms.top.value.set(T.sky[0]); skyMat.uniforms.hor.value.set(T.sky[1]); skyMat.uniforms.gnd.value.set(T.hg); skyMat.uniforms.sunCol.value.set(T.sun); skyMat.uniforms.sunI.value=Math.min(1.1,T.si/2.2);
  const ext=CW*Math.max(GRID.nx,GRID.nz); scene.fog=new THREE.Fog(new THREE.Color(T.fog),Math.max(110,ext*3.2),Math.max(420,ext*10));
  const el=T.el*Math.PI/180, az=T.az*Math.PI/180, tgt=controls.target;
  skyMat.uniforms.sunDir.value.set(Math.cos(el)*Math.sin(az),Math.sin(el),Math.cos(el)*Math.cos(az));
  sun.position.set(tgt.x+Math.cos(el)*Math.sin(az)*80, Math.sin(el)*80+2, tgt.z+Math.cos(el)*Math.cos(az)*80);
  sun.target.position.copy(tgt); sun.color.set(T.sun); sun.intensity=T.si;
  if(envKey!==S.tod){ envKey=S.tod; const tx=new THREE.CanvasTexture(envCanvas(T)); tx.mapping=THREE.EquirectangularReflectionMapping; tx.encoding=THREE.sRGBEncoding;
    const rt=pmrem.fromEquirectangular(tx); tx.dispose(); if(envRT) envRT.dispose(); envRT=rt; scene.environment=rt.texture; }
  hemi.color.set(T.hs); hemi.groundColor.set(T.hg); hemi.intensity=T.hi*0.5;
  renderer.toneMappingExposure=T.exp;
  stars.material.opacity=T.stars;
  SHU.uWeather.value=S.weather;
  const mats=currentMats();
  if(mats){ mats.glass.emissiveIntensity=T.glow*0.6; mats.qamar.emissiveIntensity=T.glow*0.55; mats.stained.emissiveIntensity=T.glow*0.5; mats.paper.emissiveIntensity=T.glow*0.55; mats.lantern.emissiveIntensity=0.15+T.lamp*1.1; glowBase=0.25+T.lamp*1.6; mats.glow.emissiveIntensity=glowBase; mats.void.color.set(T.glow>1?'#1a120b':'#0b0c0e'); }
  const L=(archObj&&archObj.lanterns)||[];
  const pts=L.slice().sort((a,b)=>a.y-b.y);
  for(let i=0;i<lampLights.length;i++){ const p=lampLights[i]; if(i<pts.length&&T.lamp>0.3){ const q=pts[Math.floor(i*pts.length/Math.min(lampLights.length,pts.length))]||pts[i]; p.position.copy(q); p.userData.base=T.lamp*1.4; p.intensity=p.userData.base; } else { p.userData.base=0; p.intensity=0; } }
  needsRender=true;
}
function currentMats(){ const st=STYLE[S.styleId], fam=S.pattern==='auto'?st.pattern:S.pattern, th=S.theta!=null?S.theta:(PAT_THETA[fam]||st.theta), F=S.finish;
  const M=getMats(st,fam,th,S.q,{wall:F.wall.pat,floor:F.floor.pat,roof:F.roof.pat}).M; applyFinishes(M,F); return M; }

/* ---------- solve + build ---------- */
function lockMasks(){
  const L=new Array(GRID.ncell).fill(0);
  for(const k in S.locks){ const [x,z,l]=k.split(',').map(Number); if(x>=S.nx||z>=S.nz) continue; const h=S.heights[x+z*S.nx]; if(l>=h) continue; const lk=S.locks[k];
    let m=0; VARS.forEach((v,i)=>{ if(v.t===lk.t&&(lk.r<0||v.r===lk.r||(v.t!==IWAN&&v.t!==GATE))) m|=(1<<i); }); L[cidx(x,z,l)]=m; }
  return L;
}
function solve(mode){
  const st=STYLE[S.styleId];
  if(S.heights.every(h=>h===0)){ setStatus('Raise at least one square of the plot.',true); return false; }
  setGrid(S.nx,S.nz);
  const res=solveWithStairs({nx:S.nx, nz:S.nz, stairMode:S.stairs, style:st, heights:S.heights, w:TKEYS.map(k=>S.w[k]||0), fit:S.fit, fill:S.fill, seed:S.seed, ensureStair:true, towerGround:st.towerGround, locks:lockMasks(), prev:mode==='edit'&&lastVars&&lastVars.length===GRID.ncell?lastVars:null, stick:7});
  if(!res.ok){ setStatus(res.reason,true); toast(res.reason); return false; }
  plan=res; lastVars=res.vars;
  if(res.heights.some((h,i)=>h!==S.heights[i])){ S.heights=res.heights.slice(); S.footEdited=true; renderFoot(); }
  if(res.stairNote) toast(res.stairNote); else if(res.stairWarn) toast(res.stairWarn);
  return true;
}
function build(){
  if(!plan) return;
  const st=STYLE[S.styleId];
  if(archObj){ scene.remove(archObj.group); archObj.group.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); }
  const t0=performance.now();
  archObj=buildArchitecture(plan,st,S,currentMats()); archObj.uid=++buildUid;
  archObj.ms=performance.now()-t0;
  scene.add(archObj.group); setGround(st); layoutProxies(); setupDoors(); fitShadow(); scheduleLODs();
  archObj.group.visible=S.view!=='mod'; proxyGroup.visible=S.view==='mod';
  showPlanProxies(); applyTOD(); updateSel();
  setStatus(); renderInspector(); renderProgramme(); renderRecipe();
  needsRender=true;
}
/* ---------- levels of detail ----------
   Level 0 is the full build. Levels 1–3 are replayed from its record a beat later (one per tick, so the page stays responsive):
   smaller parts drop out, curves lose sides, roofs thin out, and level 3 is solid massing. The switch distances scale with
   the building, starting a little beyond the distance the view frames it from. */
let lodJob=0, shownLOD=-1;
function lodDistances(A){ const f=A.focus, box=f? new THREE.Box3(new THREE.Vector3(f[0]-6,0,f[2]-6),new THREE.Vector3(f[1]+6,f[4],f[3]+6)) : new THREE.Box3().setFromObject(A.lod.levels[0].object), s=box.getSize(new THREE.Vector3());
  const r=Math.max(s.x,s.z,s.y*1.1)*0.5+4, d0=r/Math.tan(camera.fov*Math.PI/360)*1.05; return [0,1.3*d0,2.0*d0,3.0*d0]; }
function scheduleLODs(){ const A=archObj, job=++lodJob; if(!A||!A.lod||!A.lodRec) return; const mats=currentMats();
  A.lodTris=[Math.round(A.tris)]; A.lodD=lodDistances(A); controls.maxDistance=Math.max(180,A.lodD[3]*1.35);
  let lv=1; const step=()=>{ if(job!==lodJob||archObj!==A) return;
    const B=replayLOD(A.lodRec,lv), g=B.finish(mats,A.cullOpts); A.lod.addLevel(g,A.lodD[lv]); A.lodTris[lv]=Math.round(B.tris);
    if(++lv<=3) setTimeout(step,16); else A.lodRec=null;
    applyLOD(); renderLODInfo(); needsRender=true; };
  setTimeout(step,80); shownLOD=-1; applyLOD(); renderLODInfo(); }
function applyLOD(){ if(!archObj||!archObj.lod) return; const L=archObj.lod;
  if(S.lod==='auto') L.autoUpdate=true;
  else { L.autoUpdate=false; const sel=Math.min(+S.lod,L.levels.length-1); L.levels.forEach((l,i)=>l.object.visible=i===sel); }
  needsRender=true; }
function currentLOD(){ if(!archObj||!archObj.lod) return 0; const i=archObj.lod.levels.findIndex(l=>l.object.visible); return i<0?0:i; }
function renderLODSel(){ const e=$('lodSel'); e.innerHTML='';
  for(const [v,l] of [['auto','Auto'],['0','0'],['1','1'],['2','2'],['3','3']]){ const b=document.createElement('button'); b.textContent=l; b.setAttribute('aria-pressed',String(S.lod)===v);
    b.title= v==='auto'? 'Switch levels by camera distance' : `Always show level ${v}`; b.onclick=()=>{ S.lod=v==='auto'?'auto':+v; renderLODSel(); applyLOD(); renderLODInfo(); }; e.appendChild(b); } }
function renderLODInfo(){ const A=archObj, e=$('lodInfo'); if(!A||!A.lodTris){ e.textContent=''; return; }
  const k=n=>n>=10000? (n/1000).toFixed(0)+'k' : n>=1000? (n/1000).toFixed(1)+'k' : String(n), cur=currentLOD();
  const parts=[0,1,2,3].map(i=>A.lodTris[i]!=null? `${i===cur?'▸ ':''}${i}: ${k(A.lodTris[i])}` : `${i}: …`);
  const far=A.lodD? ` Auto switches at ${A.lodD.slice(1).map(d=>Math.round(d)+' m').join(', ')}.` : '';
  e.textContent=`Triangles per level — ${parts.join(' · ')}.${S.lod==='auto'?far:''}`; }

// the sun's shadow box follows the plot, with the bias scaled to its texel so big modules don't streak
function fitShadow(){ const R=Math.max(24,CW*Math.max(GRID.nx,GRID.nz)*0.62+10), c=sun.shadow.camera; c.left=c.bottom=-R; c.right=c.top=R; c.updateProjectionMatrix(); sun.shadow.normalBias=0.025+R*2/2048*0.9; }
function regenerate(mode,frame){ if(stopReplay) stopReplay(); if(mode==='new') for(const k in doorState) delete doorState[k]; if(solve(mode)){ build(); if(walk.on) spawnWalk(); else if(frame) frameView(); } }
function frameView(){
  if(!archObj) return; const f=archObj.focus, box=f? new THREE.Box3(new THREE.Vector3(f[0],0,f[2]),new THREE.Vector3(f[1],f[4],f[3])) : new THREE.Box3().setFromObject(archObj.group); const c=box.getCenter(new THREE.Vector3()), s=box.getSize(new THREE.Vector3());
  const r=Math.max(s.x,s.z,s.y*1.1)*0.5+4; controls.target.set(c.x,Math.min(c.y,s.y*0.42),c.z);
  const dir=new THREE.Vector3(0.62,0.42,0.78).normalize(); const dist=r/Math.tan(camera.fov*Math.PI/360)*(camera.aspect<1?1.45:1.05);
  camera.position.copy(controls.target).addScaledVector(dir,dist); controls.update(); applyTOD(); needsRender=true;
}

/* ---------- status & toast ---------- */
function setStatus(err,isErr){
  const el=$('status'), t=$('statusT');
  if(isErr){ el.classList.add('err'); t.textContent=err; return; }
  el.classList.remove('err');
  if(!plan) return;
  const used=plan.types.filter(v=>v!==EMPTY).length;
  const nos=(plan.outStairs||[]).length;
  t.textContent=`${used} modules · ${plan.steps} choices · ${plan.backs} backtrack${plan.backs===1?'':'s'} · solved in ${plan.ms.toFixed(1)} ms`+(nos?` · ${nos} outside stair${nos===1?'':'s'}`:'')+(archObj?` · ${(archObj.tris/1000).toFixed(0)}k tris`:'');
}
let toastT=0; function toast(msg){ const el=$('toast'); el.textContent=msg; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>el.hidden=true,3200); }

/* ---------- left panel ---------- */
const lastInRegion={};
function pickRegion(k){ const cur=STYLE[S.styleId]; if(k===cur.region) return; lastInRegion[cur.region]=cur.id; setStyle(lastInRegion[k]||STYLES.find(s=>s.region===k).id); }
function renderStyles(){
  const region=STYLE[S.styleId].region, rg=$('region'); rg.innerHTML='';
  for(const [k,l] of REGIONS){ const b=document.createElement('button'); b.textContent=l; b.setAttribute('aria-pressed',k===region); b.onclick=()=>pickRegion(k); rg.appendChild(b); }
  const wrap=$('styles'); wrap.innerHTML='';
  for(const st of STYLES.filter(s=>s.region===region)){
    const b=document.createElement('button'); b.className='sc'; b.setAttribute('aria-pressed',st.id===S.styleId);
    b.innerHTML=`<span class="sc-name">${st.name}</span><span class="sc-native" lang="${st.lang}" dir="${/[\u0590-\u08ff]/.test(st.native)?'rtl':'ltr'}">${st.native}</span><span class="sc-where">${st.where}</span><span class="sc-chips">${st.chips.map(c=>`<i style="background:${c}"></i>`).join('')}</span>`;
    b.onclick=()=>setStyle(st.id); wrap.appendChild(b);
  }
  const st=STYLE[S.styleId]; $('blurb').innerHTML=st.blurb; $('styleEra').textContent=st.era;
  renderLegend();
}
function setStyle(id){
  const st=STYLE[id], keepDoors=S.feats.doorsOpen; S.styleId=id; S.w=Object.assign({},st.w); S.feats=Object.assign({},st.feats); if(keepDoors) S.feats.doorsOpen=1; S.pattern='auto'; S.theta=null;
  if(!S.footEdited) S.heights=footFor(st,S.nx,S.nz);
  renderStyles(); renderFoot(); renderWeights(); renderFeats(); renderPattern();
  regenerate('new',true);
}
// bigger modules keep the same plan: rebuild the architecture at the new size and reframe
function setModule(v){ if(v===S.cw) return; S.cw=v; setCellSize(v); renderFoot(); layoutProxies(); for(const k in doorState) delete doorState[k]; build(); if(walk.on) spawnWalk(); else frameView(); }
function resizePlot(nx,nz){ if(nx===S.nx&&nz===S.nz) return;
  const old=S.heights, ox=S.nx, oz=S.nz, st=STYLE[S.styleId];
  S.heights= S.footEdited? Array.from({length:nx*nz},(_,i)=>old[Math.min(i%nx,ox-1)+Math.min((i/nx)|0,oz-1)*ox]) : footFor(st,nx,nz);
  S.nx=nx; S.nz=nz; setGrid(nx,nz); lastVars=null;
  S.sel={x:Math.min(S.sel.x,nx-1), z:Math.min(S.sel.z,nz-1), l:S.sel.l};
  for(const k of Object.keys(S.locks)){ const [x,z]=k.split(',').map(Number); if(x>=nx||z>=nz) delete S.locks[k]; }
  renderFoot(); layoutProxies(); regenerate('new',true); }
function renderFoot(){
  const f=$('foot'); f.innerHTML=''; f.style.gridTemplateColumns=`repeat(${S.nx},1fr)`; f.style.width=`min(100%,${S.nx*(S.nx>4?62:70)}px)`;
  const seg=(id,vals,cur,fn)=>{ const e=$(id); e.innerHTML=''; for(const [v,l] of vals){ const b=document.createElement('button'); b.textContent=l; b.setAttribute('aria-pressed',v===cur); b.onclick=()=>fn(v); e.appendChild(b); } };
  const SZ=[[2,'2'],[3,'3'],[4,'4'],[5,'5']];
  seg('plotW',SZ,S.nx,v=>resizePlot(v,S.nz));
  seg('plotD',SZ,S.nz,v=>resizePlot(S.nx,v));
  seg('stairMode',[['inside','Inside'],['outside','Outside'],['both','Both']],S.stairs,v=>{ S.stairs=v; renderFoot(); regenerate('new'); });
  seg('modSize',[8,9,10,11,12].map(v=>[v,v+' m']),S.cw,v=>setModule(v));
  for(let z=0;z<S.nz;z++) for(let x=0;x<S.nx;x++){ const c=x+z*S.nx, h=S.heights[c];
    const b=document.createElement('button'); b.className='fc'; b.dataset.h=h; b.setAttribute('aria-label',`${cellName(x,z)}: ${h} storeys`);
    b.innerHTML=`<span class="h">${h}</span><span class="id">${cellName(x,z)}</span><span class="bars">${[0,1,2,3].map(k=>`<i class="${k<h?'on':''}"></i>`).join('')}</span>`;
    b.onclick=e=>{ S.heights[c]=(h+(e.shiftKey?4:1))%5; S.footEdited=true; renderFoot(); regenerate('new'); };
    b.oncontextmenu=e=>{ e.preventDefault(); S.heights[c]=(h+4)%5; S.footEdited=true; renderFoot(); regenerate('new'); };
    f.appendChild(b); }
  $('fill').value=S.fill;
}
function renderWeights(){
  const w=$('weights'); w.innerHTML='';
  const fit=$('fitSel'); if(fit){ fit.innerHTML=''; for(const [v,l,ttl] of [['period','Period','Before plumbing: outhouse yards, washstands and hip baths'],['modern','Modern','Plumbed: bathroom modules, WCs, showers and baths']]){ const b=document.createElement('button'); b.textContent=l; b.title=ttl; b.setAttribute('aria-pressed',S.fit===v); b.onclick=()=>{ if(S.fit===v) return; S.fit=v; renderWeights(); renderInspector(); regenerate('new'); }; fit.appendChild(b); } }
  for(let t=1;t<NT;t++){ const k=TKEYS[t]; if((t===BATH&&S.fit!=='modern')||(t===PRIVY&&S.fit==='modern')) continue; const row=document.createElement('div'); row.className='sl';
    row.innerHTML=`<span><i class="sw" style="background:${TINFO[t].color}"></i>${tLabel(t)}</span><input type="range" min="0" max="8" step="0.1" value="${S.w[k]}" aria-label="${tLabel(t)} weight" id="w_${k}"><output>${(+S.w[k]).toFixed(1)}</output>`;
    const inp=row.querySelector('input'), out=row.querySelector('output');
    inp.oninput=()=>{ out.textContent=(+inp.value).toFixed(1); }; inp.onchange=()=>{ S.w[k]=+inp.value; regenerate('new'); };
    if(S.w[k]==null) S.w[k]=0; w.appendChild(row); }
  const row=document.createElement('div'); row.className='sl'; row.innerHTML=`<span><i class="sw" style="background:${TINFO[0].color}"></i>Open air</span><input type="range" min="0" max="4" step="0.1" value="${S.w.EMPTY}" id="w_EMPTY" aria-label="Open air weight"><output>${(+S.w.EMPTY).toFixed(1)}</output>`;
  const inp=row.querySelector('input'), out=row.querySelector('output'); inp.oninput=()=>out.textContent=(+inp.value).toFixed(1); inp.onchange=()=>{ S.w.EMPTY=+inp.value; regenerate('new'); }; w.appendChild(row);
}
function renderFeats(){
  const f=$('feats'); f.innerHTML='';
  for(const [g,list] of FEATS){ const d=document.createElement('div'); d.className='fgroup'; d.innerHTML=`<span class="lbl">${g}</span>`;
    const ch=document.createElement('div'); ch.className='chips';
    for(const [k,label] of list){ const b=document.createElement('button'); b.className='chip'; b.textContent=label; b.setAttribute('aria-pressed',!!S.feats[k]);
      b.onclick=()=>{ S.feats[k]=S.feats[k]?0:1; b.setAttribute('aria-pressed',!!S.feats[k]); if(k==='doorsOpen') setAllDoors(!!S.feats[k]); else build(); renderRecipe(); }; ch.appendChild(b); }
    d.appendChild(ch); f.appendChild(d); }
}
function renderPattern(){
  const sel=$('patFam'); if(!sel.options.length) for(const [k,l] of PATTERNS){ const o=document.createElement('option'); o.value=k; o.textContent=l; sel.appendChild(o); }
  sel.value=S.pattern;
  const st=STYLE[S.styleId], fam=S.pattern==='auto'?st.pattern:S.pattern, th=S.theta!=null?S.theta:(PAT_THETA[fam]||st.theta);
  const th_=$('theta'); th_.value=th; th_.disabled=!HANKIN_FAM.has(fam); $('thetaO').textContent=HANKIN_FAM.has(fam)?th.toFixed(1)+'°':'—';
  drawPatPreview(fam,th);
}
function drawPatPreview(fam,th){
  const st=STYLE[S.styleId]; const p=drawPattern(fam,th,st.tilePal,RNG('prev')); const c=$('patPrev'), g=c.getContext('2d'); g.clearRect(0,0,144,144);
  const tw=72, thh=72*p.aspect; for(let y=0;y<144;y+=thh) for(let x=0;x<144;x+=tw) g.drawImage(p.c,x,y,tw,thh);
}
function renderTod(){
  const s=$('tod'); s.innerHTML='';
  for(const k in TODS){ const b=document.createElement('button'); b.textContent=TODS[k].label; b.setAttribute('aria-pressed',k===S.tod); b.onclick=()=>{ S.tod=k; renderTod(); applyTOD(); renderRecipe(); }; s.appendChild(b); }
  $('weather').value=S.weather; $('weatherO').textContent=Math.round(S.weather*100)+'%';
  const q=$('quality'); q.innerHTML=''; ['Low','Medium','High'].forEach((lb,k)=>{ const b=document.createElement('button'); b.textContent=lb; b.setAttribute('aria-pressed',k===S.q); b.onclick=()=>{ S.q=k; renderTod(); build(); }; q.appendChild(b); });
}

/* ---------- inspector ---------- */
function keyOf(s){ return `${s.x},${s.z},${s.l}`; }
function renderInspector(){
  const st=STYLE[S.styleId], sel=S.sel;
  const tabs=$('lvtabs'); tabs.innerHTML='';
  for(let l=0;l<4;l++){ const b=document.createElement('button'); b.textContent='L'+(l+1); b.title=l===0?'Ground storey':`Storey ${l+1}`; b.setAttribute('aria-pressed',l===sel.l); b.onclick=()=>{ S.sel.l=l; updateSel(); renderInspector(); }; tabs.appendChild(b); }
  const pick=$('pick'); pick.innerHTML='';
  pick.style.gridTemplateColumns=`repeat(${S.nx},1fr)`;
  for(let z=0;z<S.nz;z++) for(let x=0;x<S.nx;x++){ const i=cidx(x,z,sel.l), t=plan?plan.types[i]:EMPTY, inPlot=sel.l<S.heights[x+z*S.nx];
    const b=document.createElement('button'); b.className='pk'+(inPlot?'':' off'); b.setAttribute('aria-pressed',x===sel.x&&z===sel.z);
    b.style.borderColor= t!==EMPTY? TINFO[t].color : ''; const lk=S.locks[`${x},${z},${sel.l}`];
    b.innerHTML=`<b style="color:${t!==EMPTY?TINFO[t].color:'var(--muted)'}">${TINFO[t].glyph}</b><span>${cellName(x,z)}${lk?' ·pin':''}</span>`;
    b.onclick=()=>{ S.sel.x=x; S.sel.z=z; updateSel(); renderInspector(); }; pick.appendChild(b); }
  const info=$('cellInfo'); const key=keyOf(sel), i=cidx(sel.x,sel.z,sel.l), t=plan?plan.types[i]:EMPTY, r=plan?plan.rots[i]:0, h=S.heights[sel.x+sel.z*S.nx];
  $('selName').textContent=`${cellName(sel.x,sel.z)} · L${sel.l+1}`;
  const np=Object.keys(S.locks).length; const cp=$('clearPins'); cp.hidden=!np; cp.textContent=`Clear ${np} pin${np===1?'':'s'}`;
  if(sel.l>=h){
    info.innerHTML=`<div class="cellhead"><span class="badge" style="background:#8f98a3">·</span><div><h3>Outside the plot</h3><p>${cellName(sel.x,sel.z)} · storey ${sel.l+1}</p></div></div><p class="desc">This column allows ${h} storey${h===1?'':'s'}. Raise it to place a module here.</p><button class="btn sm" id="raise">Raise ${cellName(sel.x,sel.z)} to ${sel.l+1}</button>`;
    $('raise').onclick=()=>{ S.heights[sel.x+sel.z*S.nx]=sel.l+1; S.footEdited=true; renderFoot(); regenerate('edit'); };
    return; }
  const lk=S.locks[key], mod=S.mods[key]||{};
  const tname=tLabel(t)+((t===IWAN||t===GATE)?` · opens ${DIRNAME[r]}`:'');
  const trad= t===EMPTY? 'Roof terrace or open air' : roomName(st,t,sel.l,sel.x,sel.z);
  let html=`<div class="cellhead"><span class="badge" style="background:${TINFO[t].color}">${TINFO[t].glyph}</span><div><h3>${tname}</h3><p>${cellName(sel.x,sel.z)} · storey ${sel.l+1}${sel.l===0?' (ground)':''}</p></div></div>`;
  html+=`<p class="trad"><em>${trad}</em></p><p class="desc">${TINFO[t].desc}</p><div class="kv">`;
  const allowed=TINFO.map((ti,k)=>k).filter(k=>!(sel.l===0&&(k===KIOSK||k===EMPTY))&&!(sel.l>0&&(k===COURT||k===GATE||k===PRIVY))&&!(k===BATH&&S.fit!=='modern')&&!(k===PRIVY&&S.fit==='modern'));
  html+=`<label for="lkT">Module</label><select id="lkT"><option value="-1">Solver decides</option>${allowed.map(k=>`<option value="${k}" ${lk&&lk.t===k?'selected':''}>${tLabel(k)}</option>`).join('')}</select>`;
  if(t===IWAN||t===GATE||(lk&&(lk.t===IWAN||lk.t===GATE))) html+=`<label for="lkR">Facing</label><select id="lkR"><option value="-1">Solver decides</option>${[3,0,1,2].map(d=>`<option value="${d}" ${lk&&lk.r===d?'selected':''}>${DIRNAME[d]}</option>`).join('')}</select>`;
  const opt=(id,label,val,list)=>`<label for="${id}">${label}</label><select id="${id}">${list.map(([v,l])=>`<option value="${v}" ${(val||'auto')===v?'selected':''}>${l}</option>`).join('')}</select>`;
  if(BASE_T(t)===ROOM||t===DOME||t===STAIR||t===GATE||t===IWAN){ html+=opt('mWin','Windows',mod.win,[['auto','Tradition'],['none','None'],['few','Few'],['many','Many']]); html+=opt('mPanel','Pattern panel',mod.panel,[['auto','Building setting'],['on','On'],['off','Off']]); }
  if((BASE_T(t)===ROOM||t===DOME)&&sel.l>0) html+=opt('mBay','Bay window',mod.bay,[['auto','Building setting'],['on','On'],['off','Off']]);
  if(t===DOME||t===KIOSK) html+=opt('mDome','Dome',mod.dome,[['auto','Tradition'],...DOME_KINDS]);
  if(t===TOWER){ let bl=sel.l; while(bl>0&&plan.types[cidx(sel.x,sel.z,bl-1)]===TOWER) bl--; const bm=S.mods[`${sel.x},${sel.z},${bl}`]||{}; html+=opt('mTower','Tower',bm.tower,[['auto','Tradition'],...TOWER_KINDS]); }
  if(t===KIOSK) html+=opt('mKiosk','Pavilion',mod.kiosk,[['auto','Tradition'],...KIOSK_KINDS]);
  html+=`</div><div class="row wrap" style="margin-top:10px"><button class="btn sm" id="pin">${lk?'Unpin':'Pin this module'}</button><button class="btn sm" id="clr">Reset cell</button></div>`;
  info.innerHTML=html;
  $('lkT').onchange=e=>{ const v=+e.target.value; if(v<0) delete S.locks[key]; else S.locks[key]={t:v,r:(lk&&lk.t===v)?lk.r:-1}; regenerate('edit'); };
  if($('lkR')) $('lkR').onchange=e=>{ const v=+e.target.value; const base=S.locks[key]||{t,r:-1}; S.locks[key]={t:base.t,r:v}; regenerate('edit'); };
  const setMod=(k,v,target)=>{ const kk=target||key; const m=S.mods[kk]=Object.assign({},S.mods[kk]); if(v==='auto') delete m[k]; else m[k]=v; if(!Object.keys(m).length) delete S.mods[kk]; build(); };
  if($('mWin')) $('mWin').onchange=e=>setMod('win',e.target.value);
  if($('mPanel')) $('mPanel').onchange=e=>setMod('panel',e.target.value);
  if($('mBay')) $('mBay').onchange=e=>setMod('bay',e.target.value);
  if($('mDome')) $('mDome').onchange=e=>setMod('dome',e.target.value);
  if($('mKiosk')) $('mKiosk').onchange=e=>setMod('kiosk',e.target.value);
  if($('mTower')) $('mTower').onchange=e=>{ let bl=sel.l; while(bl>0&&plan.types[cidx(sel.x,sel.z,bl-1)]===TOWER) bl--; setMod('tower',e.target.value,`${sel.x},${sel.z},${bl}`); };
  $('pin').onclick=()=>{ if(lk) delete S.locks[key]; else S.locks[key]={t,r:(t===IWAN||t===GATE)?r:-1}; regenerate('edit'); };
  $('clr').onclick=()=>{ delete S.locks[key]; delete S.mods[key]; regenerate('edit'); };
}
function renderProgramme(){
  const st=STYLE[S.styleId], el=$('prog'); if(!plan){ el.innerHTML=''; return; }
  let html='', count=0;
  for(let l=3;l>=0;l--){ const items=[];
    for(let z=0;z<GRID.nz;z++) for(let x=0;x<GRID.nx;x++){ const i=cidx(x,z,l), t=plan.types[i]; if(t===EMPTY) continue; if(t===TOWER&&l>0&&plan.types[i-GRID.nc]===TOWER) continue; count++;
      items.push(`<li><button data-c="${x},${z},${l}"><span class="g" style="background:${TINFO[t].color}">${TINFO[t].glyph}</span><span class="t">${roomName(st,t,l,x,z)}<small>${cellName(x,z)} · ${tLabel(t)}${(t===IWAN||t===GATE)?' → '+DIRNAME[plan.rots[i]]:''}</small></span></button></li>`); }
    if(items.length) html+=`<h4>Storey ${l+1}${l===0?' · ground':''}</h4><ul class="prog">${items.join('')}</ul>`; }
  el.innerHTML=html; $('progCount').textContent=`${count} spaces`;
  el.querySelectorAll('button[data-c]').forEach(b=>b.onclick=()=>{ const [x,z,l]=b.dataset.c.split(',').map(Number); S.sel={x,z,l}; updateSel(); renderInspector(); });
}
function updateSel(){
  const st=STYLE[S.styleId], i=cidx(S.sel.x,S.sel.z,S.sel.l), [px,py,pz]=cellPos(i,st);
  selBox.position.set(px,py,pz); selBox.scale.set(CW*1.01,st.H*1.01,CW*1.01); needsRender=true;
}
function renderLegend(){ $('legend').innerHTML=TINFO.slice(1).map((t,i)=>`<span><i style="background:${t.color}"></i>${tLabel(i+1)}</span>`).join(''); }

/* ---------- finishes ---------- */
function readFinish(o){ const F=FIN_DEFAULT(); if(!o||typeof o!=='object') return F;
  for(const [g,list] of [['wall',FIN_WALL],['floor',FIN_FLOOR],['roof',FIN_ROOF]]){ const q=o[g]||{}; F[g].pat=list.some(p=>p[0]===q.pat)?q.pat:'auto'; F[g].shade=clamp(+q.shade||0,-1,1); F[g].tint=FIN_TINTS.some(p=>p[0]===q.tint)?q.tint:'none'; }
  F.vary=clamp(o.vary!=null?+o.vary:0.25,0,1); return F; }
function renderFinishes(){ const e=$('finishes'); if(!e) return; e.innerHTML='';
  for(const [g,label,list] of [['wall','Walls',FIN_WALL],['floor','Floors',FIN_FLOOR],['roof','Roofs',FIN_ROOF]]){ const f=S.finish[g], box=document.createElement('div'); box.className='fin';
    box.innerHTML=`<div class="row"><span class="lbl" style="min-width:52px">${label}</span><select aria-label="${label} pattern" style="flex:1">${list.map(([v,l])=>`<option value="${v}" ${f.pat===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="sl"><span>Shade</span><input type="range" min="-1" max="1" step="0.05" value="${f.shade}" aria-label="${label} shade"><output>${f.shade>0?'+':''}${(+f.shade).toFixed(2)}</output></div>
      <div class="tints" role="group" aria-label="${label} tint">${FIN_TINTS.map(([v,l])=>`<button type="button" title="${l}" aria-label="${l}" aria-pressed="${f.tint===v}" data-v="${v}" style="${v==='none'?'':'background:'+v}">${v==='none'?'∅':''}</button>`).join('')}</div>`;
    box.querySelector('select').onchange=ev=>{ f.pat=ev.target.value; build(); };
    const sl=box.querySelector('input'), out=box.querySelector('output');
    sl.oninput=()=>{ f.shade=+sl.value; out.textContent=(f.shade>0?'+':'')+f.shade.toFixed(2); applyFinishes(currentMats(),S.finish); needsRender=true; };
    for(const b of box.querySelectorAll('.tints button')) b.onclick=()=>{ f.tint=b.dataset.v; for(const o of box.querySelectorAll('.tints button')) o.setAttribute('aria-pressed',o===b); applyFinishes(currentMats(),S.finish); needsRender=true; };
    e.appendChild(box); }
  const v=document.createElement('div'); v.className='sl'; v.style.gridTemplateColumns='120px 1fr 34px';
  v.innerHTML=`<span>Module variation</span><input type="range" min="0" max="1" step="0.05" value="${S.finish.vary}" aria-label="Variation in shade between modules"><output>${(+S.finish.vary).toFixed(2)}</output>`;
  const vi=v.querySelector('input'), vo=v.querySelector('output'); vi.oninput=()=>{ vo.textContent=(+vi.value).toFixed(2); }; vi.onchange=()=>{ S.finish.vary=+vi.value; build(); }; e.appendChild(v); }

/* ---------- recipe ---------- */
function recipeObj(){ return {v:3, style:S.styleId, seed:S.seed, nx:S.nx, nz:S.nz, module:S.cw, stairs:S.stairs, heights:S.heights, fill:S.fill, ensureStair:S.ensureStair, weights:S.w, feats:S.feats, pattern:S.pattern, theta:S.theta, tod:S.tod, weather:S.weather, locks:S.locks, mods:S.mods, fit:S.fit, finish:S.finish}; }
function renderRecipe(){ const ta=$('recipe'); if(document.activeElement!==ta) ta.value=JSON.stringify(recipeObj()); }
function loadRecipe(txt){
  let o; try{ o=JSON.parse(txt); }catch(e){ $('rMsg').textContent='That text is not valid JSON. Paste a recipe copied from Qasr Forge.'; return; }
  const nx=clamp((o&&o.nx)|0||3,2,5), nz=clamp((o&&o.nz)|0||3,2,5);
  if(!o||!STYLE[o.style]||!Array.isArray(o.heights)||o.heights.length!==nx*nz){ $('rMsg').textContent='The recipe is missing a known style or a plot that matches its size.'; return; }
  S.nx=nx; S.nz=nz; setGrid(nx,nz); lastVars=null; S.cw=clamp(Math.round(+o.module||8),8,12); setCellSize(S.cw); S.stairs=['inside','outside','both'].includes(o.stairs)?o.stairs:'inside'; S.sel={x:0,z:0,l:0};
  S.styleId=o.style; S.seed=String(o.seed||'qasr'); S.heights=o.heights.map(h=>clamp(h|0,0,4)); S.fill=+o.fill||0.7; S.ensureStair=o.ensureStair!==false;
  S.w=Object.assign({},STYLE[o.style].w,o.weights||{}); S.feats=Object.assign({},STYLE[o.style].feats,o.feats||{}); S.pattern=o.pattern||'auto'; S.theta=o.theta!=null?+o.theta:null;
  S.tod=TODS[o.tod]?o.tod:'golden'; S.weather=o.weather!=null?+o.weather:0.3; S.locks=o.locks||{}; S.mods=o.mods||{}; S.footEdited=true;
  S.fit=o.fit==='modern'?'modern':'period'; S.finish=readFinish(o.finish);
  S.seededFrom=S.seed; $('seed').value=S.seed; renderStyles(); renderFoot(); renderWeights(); renderFeats(); renderPattern(); renderFinishes(); renderTod(); layoutProxies(); regenerate('new',true); $('rMsg').textContent='Recipe loaded.';
}

/* ---------- replay ---------- */
let replay=null, stopReplay=null;
function startReplay(){
  if(!plan||!plan.trace.length) return; if(replay){ stopReplay(); return; }
  const prevView=S.view; setView('mod',true);
  const scrub=$('scrub'); scrub.hidden=false; scrub.max=plan.trace.length-1; scrub.value=0;
  replay={i:0, acc:0, playing:true, prevView};
  $('replay').innerHTML='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/></svg>Stop';
  stopReplay=()=>{ if(!replay) return; const pv=replay.prevView; replay=null; scrub.hidden=true; $('replay').innerHTML='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>Replay WFC'; setView(pv); setStatus(); };
  stepReplay(0);
}
function stepReplay(i){
  const f=plan.trace[i]; replay.i=i; $('scrub').value=i; showDomain(f.d,f.ev,f.cell);
  const cn=f.cell>=0?`${cellName(...cxzl(f.cell).slice(0,2))} L${cxzl(f.cell)[2]+1}`:'';
  $('statusT').textContent= f.ev==='init'? `Step 0 · constraints propagated from the plot` : f.ev==='backtrack'? `Step ${i} · contradiction, backtracking at ${cn}` : `Step ${i} of ${plan.trace.length-1} · collapsed ${cn}`;
  needsRender=true;
}

/* ---------- views ---------- */
function setView(v,keepReplay){
  if(replay&&!keepReplay){ stopReplay(); }
  if(v!=='walk'&&walk.on) exitWalk();
  S.view=v; document.querySelectorAll('#viewMode button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===v));
  if(v==='walk'){ enterWalk(); return; }
  if(archObj) archObj.group.visible=v==='arch'; proxyGroup.visible=v==='mod'; $('legend').hidden=v!=='mod';
  if(v==='mod'&&!replay) showPlanProxies(); needsRender=true;
}

/* ---------- walk-through ---------- */
const walk={on:false,p:new THREE.Vector3(),vy:0,yaw:0,pitch:0,ground:true,keys:{},joy:{x:0,y:0},look:null,camY:0,saved:null,cell:'',locked:false};
const PR=0.3, PH=1.72, EYE=1.62, STEP=0.5;
const coarse=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
let colHash=null, colRef=null;
function colIndex(){ if(!archObj||colRef===archObj.col) return; colRef=archObj.col; colHash=new Map();
  for(const b of colRef) for(let i=Math.floor(b[0]);i<=Math.floor(b[3]);i++) for(let j=Math.floor(b[2]);j<=Math.floor(b[5]);j++){ const k=i*1000+j; let a=colHash.get(k); if(!a){ a=[]; colHash.set(k,a); } a.push(b); } }
function nearCol(x,z){ const out=new Set(); for(let i=Math.floor(x-PR);i<=Math.floor(x+PR);i++) for(let j=Math.floor(z-PR);j<=Math.floor(z+PR);j++){ const a=colHash.get(i*1000+j); if(a) for(const b of a) out.add(b); }
  for(const b of doorCols) if(x+PR+0.6>b[0]&&x-PR-0.6<b[3]&&z+PR+0.6>b[2]&&z-PR-0.6<b[5]) out.add(b); return out; }
const ovl=(x,z,b,r)=>x+r>b[0]&&x-r<b[3]&&z+r>b[2]&&z-r<b[5];
function groundAt(x,z,feet){ let g=0; for(const b of nearCol(x,z)) if(ovl(x,z,b,PR*0.8)&&b[4]<=feet+STEP+1e-3&&b[4]>g) g=b[4]; const r=roofAt(x,z,feet); walk.onRoof=r>g+1e-4; return Math.max(g,r); }
/* sloped roofs: the builder hands over its roof planes as triangles; the walker stands on the highest one within a step of its feet */
let triHash=null, triRef=null;
function triIndex(){ if(!archObj||triRef===archObj.walkTris) return; triRef=archObj.walkTris; triHash=new Map(); const T=triRef;
  for(let i=0;i+8<T.length;i+=9){ const ax=T[i],az=T[i+2],bx=T[i+3],bz=T[i+5],cx=T[i+6],cz=T[i+8];
    if(Math.abs((bx-ax)*(cz-az)-(cx-ax)*(bz-az))<1e-6) continue;   // edge-on strips are not floors
    const x0=Math.floor(Math.min(ax,bx,cx)), x1=Math.floor(Math.max(ax,bx,cx)), z0=Math.floor(Math.min(az,bz,cz)), z1=Math.floor(Math.max(az,bz,cz));
    for(let x=x0;x<=x1;x++) for(let z=z0;z<=z1;z++){ const k=x*1000+z; let a=triHash.get(k); if(!a){ a=[]; triHash.set(k,a); } a.push(i); } } }
function roofAt(x,z,feet){ if(!triHash) return -1e9; const a=triHash.get(Math.floor(x)*1000+Math.floor(z)); if(!a) return -1e9; const T=triRef; let g=-1e9;
  for(const i of a){ const ax=T[i],ay=T[i+1],az=T[i+2],bx=T[i+3],by=T[i+4],bz=T[i+5],cx=T[i+6],cy=T[i+7],cz=T[i+8], d=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);
    const l1=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/d, l2=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/d, l3=1-l1-l2; if(l1<-1e-4||l2<-1e-4||l3<-1e-4) continue;
    const y=l1*ay+l2*by+l3*cy; if(y<=feet+STEP+1e-3&&y>g) g=y; }
  return g; }
/* ---------- doors: hinged leaves, switchable collision, aim & toggle ---------- */
const doorState={};                       // this building's per-door choices (id → 1 open / 0 shut)
let doorCols=[], doorAnim=false, doorTarget=null;
const REACH=2.6, easeD=t=>t*t*(3-2*t);
function poseDoor(d){ const e=easeD(d.t); for(const L of d.leaves) L.obj.rotation.y=L.s*L.a*e; }
function setupDoors(){ if(!archObj) return; const def=!!S.feats.doorsOpen; setDoorTarget(null);
  for(const d of archObj.doorList){ const o= d.id in doorState? !!doorState[d.id] : def; d.t=d.target=o?1:0; poseDoor(d); }
  doorAnim=false; refreshDoorCols(); }
function setAllDoors(open){ for(const k in doorState) delete doorState[k]; if(!archObj) return;
  for(const d of archObj.doorList) d.target=open?1:0; doorAnim=true; needsRender=true; if(doorTarget) setDoorTarget(doorTarget,true); }
// a shut door blocks its doorway; an open one blocks only where a leaf could not fold flat
function refreshDoorCols(){ doorCols=[]; if(!archObj) return; for(const d of archObj.doorList){ if(d.t<0.5) doorCols.push(d.cb); else for(const b of d.oc) doorCols.push(b); } }
const inBody=b=>ovl(walk.p.x,walk.p.z,b,PR)&&b[4]>walk.p.y+0.05&&b[1]<walk.p.y+PH;
function toggleDoor(d){ if(!d) return false; const opening=d.target<0.5;
  if(!opening&&walk.on&&inBody(d.cb)){ toast('Step out of the doorway first'); return false; }
  d.target=opening?1:0; doorState[d.id]=d.target; doorAnim=true; needsRender=true; if(d===doorTarget) setDoorTarget(d,true); return true; }
function stepDoors(dt){ if(!doorAnim||!archObj) return; let any=false; const sp=Math.min(dt,0.05)/0.7;
  for(const d of archObj.doorList){ if(d.t===d.target) continue; d.t= d.target>d.t? Math.min(d.target,d.t+sp) : Math.max(d.target,d.t-sp); poseDoor(d); any=true; }
  if(!any) doorAnim=false; refreshDoorCols(); shadowDirty=true; needsRender=true; }
function rayBox(o,v,b,tmax){ let t0=0, t1=tmax;
  for(let a=0;a<3;a++){ const lo=b[a], hi=b[a+3];
    if(Math.abs(v[a])<1e-9){ if(o[a]<lo||o[a]>hi) return -1; continue; }
    let tn=(lo-o[a])/v[a], tf=(hi-o[a])/v[a]; if(tn>tf){ const q=tn; tn=tf; tf=q; } if(tn>t0) t0=tn; if(tf<t1) t1=tf; if(t0>t1) return -1; }
  return t0; }
// nearest door along a ray, unless solid masonry gets in the way first
function pickDoor(o,v,tmax,occ){ if(!archObj||!archObj.doorList.length) return null; let best=null, bt=tmax;
  for(const d of archObj.doorList){ let t=rayBox(o,v,d.cb,bt);
    if(d.t>=0.5) for(const b of d.ob){ const q=rayBox(o,v,b,bt); if(q>=0&&(t<0||q<t)) t=q; }
    if(t>=0&&t<bt){ bt=t; best=d; } }
  if(!best) return null;
  for(const b of occ){ if(o[0]>b[0]&&o[0]<b[3]&&o[1]>b[1]&&o[1]<b[4]&&o[2]>b[2]&&o[2]<b[5]) continue; const t=rayBox(o,v,b,bt); if(t>=0&&t<bt-0.03) return null; }
  return best; }
function colAlong(o,v,tmax){ const out=new Set(); if(!colHash) return out;
  for(let t=0;t<=tmax+0.5;t+=0.5){ const x=o[0]+v[0]*t, z=o[2]+v[2]*t;
    for(let i=Math.floor(x)-1;i<=Math.floor(x)+1;i++) for(let j=Math.floor(z)-1;j<=Math.floor(z)+1;j++){ const a=colHash.get(i*1000+j); if(a) for(const b of a) out.add(b); } }
  return out; }
function doorUnder(cx,cy,reach){ if(!archObj||!archObj.group.visible) return null; const r=canvas.getBoundingClientRect();
  ndc.set((cx-r.left)/r.width*2-1, -(cy-r.top)/r.height*2+1); ray.setFromCamera(ndc,camera);
  const O=ray.ray.origin, V=ray.ray.direction, o=[O.x,O.y,O.z], v=[V.x,V.y,V.z];
  if(walk.on){ colIndex(); return pickDoor(o,v,reach,colAlong(o,v,reach)); }
  return pickDoor(o,v,reach,archObj.col); }
function aimDoor(){ const cp=Math.cos(walk.pitch), o=[camera.position.x,camera.position.y,camera.position.z], v=[-Math.sin(walk.yaw)*cp,Math.sin(walk.pitch),-Math.cos(walk.yaw)*cp];
  setDoorTarget(pickDoor(o,v,REACH,colAlong(o,v,REACH))); }
function setDoorTarget(d,force){ if(d===doorTarget&&!force) return; doorTarget=d; const b=$('doorBtn');
  if(!d||!walk.on){ b.hidden=true; return; }
  $('doorBtnT').textContent=`${d.target>0.5?'Close':'Open'} ${d.gate?'gate':'door'}`; b.hidden=false; }
$('doorBtn').onclick=()=>{ if(doorTarget) toggleDoor(doorTarget); };
function spawnWalk(){ if(!archObj) return; colIndex(); triIndex(); const sp=archObj.spawn; walk.p.set(sp.x,0,sp.z); walk.yaw=sp.yaw; walk.pitch=-0.03; walk.vy=0; walk.p.y=groundAt(sp.x,sp.z,0.5); walk.camY=walk.p.y; walk.cell=''; }
function enterWalk(){
  if(!archObj) return;
  walk.on=true; walk.saved={pos:camera.position.clone(), tgt:controls.target.clone()};
  archObj.group.visible=true; proxyGroup.visible=false; selBox.visible=false; $('legend').hidden=true;
  controls.enabled=false; camera.near=0.1; camera.updateProjectionMatrix(); camera.rotation.order='YXZ';
  spawnWalk();
  $('walkHud').hidden=false; $('replay').hidden=true; $('frame').hidden=true; $('status').hidden=true; $('joy').hidden=!coarse; $('walkHelp').hidden=false;
  $('walkHelp').textContent= coarse? 'Left thumb pad walks · drag to look · tap a door to open it' : 'Click the view to look with the mouse (or drag) · W A S D walk · E opens doors · Shift runs · Space jumps · Esc leaves';
  needsRender=true;
}
function exitWalk(){
  if(!walk.on) return; walk.on=false;
  try{ if(document.pointerLockElement) document.exitPointerLock(); }catch(e){}
  controls.enabled=true; camera.near=0.5; camera.updateProjectionMatrix(); camera.rotation.order='XYZ';
  if(walk.saved){ camera.position.copy(walk.saved.pos); controls.target.copy(walk.saved.tgt); } controls.update();
  selBox.visible=true; $('walkHud').hidden=true; $('replay').hidden=false; $('frame').hidden=false; $('status').hidden=false;
  walk.keys={}; walk.joy.x=walk.joy.y=0; walk.look=null; setDoorTarget(null); needsRender=true;
}
function walkStep(dt){
  colIndex(); triIndex(); refreshDoorCols(); dt=Math.min(dt,0.05);
  const k=walk.keys, p=walk.p;
  let fx=(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0)+walk.joy.x, fz=(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0)+walk.joy.y;
  const len=Math.hypot(fx,fz); if(len>1){ fx/=len; fz/=len; }
  const sp=(k.ShiftLeft||k.ShiftRight)?6.2:3.2, sy=Math.sin(walk.yaw), cy=Math.cos(walk.yaw);
  const vx=(fx*cy-fz*sy)*sp, vz=(-fx*sy-fz*cy)*sp;
  const blocks=b=>b[4]>p.y+STEP&&b[1]<p.y+PH;
  if(vx){ let nx=p.x+vx*dt; for(const b of nearCol(nx,p.z)) if(blocks(b)&&ovl(nx,p.z,b,PR)&&!ovl(p.x,p.z,b,PR)) nx= vx>0? Math.min(nx,b[0]-PR-1e-4) : Math.max(nx,b[3]+PR+1e-4); p.x=clamp(nx,-80,80); }
  if(vz){ let nz=p.z+vz*dt; for(const b of nearCol(p.x,nz)) if(blocks(b)&&ovl(p.x,nz,b,PR)&&!ovl(p.x,p.z,b,PR)) nz= vz>0? Math.min(nz,b[2]-PR-1e-4) : Math.max(nz,b[5]+PR+1e-4); p.z=clamp(nz,-80,80); }
  walk.vy-=22*dt; let ny=p.y+walk.vy*dt; const g=groundAt(p.x,p.z,p.y);
  if(ny<=g){ ny=g; walk.vy=0; walk.ground=true; } else walk.ground=false;
  if(walk.vy>0) for(const b of nearCol(p.x,p.z)) if(ovl(p.x,p.z,b,PR*0.8)&&b[1]>=p.y+PH-0.02&&b[1]<ny+PH){ ny=b[1]-PH; walk.vy=0; }
  p.y=ny;
  walk.camY= p.y<walk.camY? p.y : walk.camY+(p.y-walk.camY)*Math.min(1,dt*12);
  camera.position.set(p.x,walk.camY+EYE,p.z); camera.rotation.set(walk.pitch,walk.yaw,0,'YXZ');
  const st=STYLE[S.styleId], gx=Math.floor(p.x/CW+GRID.nx/2), gz=Math.floor(p.z/CW+GRID.nz/2), l=clamp(Math.round(p.y/st.H),0,3); let txt='Outside';
  if(walk.onRoof&&walk.ground) txt=`On the roof · storey ${clamp(Math.floor((p.y+0.05)/st.H),1,4)}`;
  else if(plan&&gx>=0&&gx<GRID.nx&&gz>=0&&gz<GRID.nz){ const i=cidx(gx,gz,l), t=plan.types[i], under=l>0?plan.types[i-GRID.nc]:-1;
    if(t===EMPTY) txt= l>0&&isMass(under)? `Roof terrace · storey ${l+1}` : 'Outside';
    else txt=`${roomName(st,t,l,gx,gz)} · storey ${l+1}`; }
  const os=archObj&&archObj.outStairs.find(o=>p.x>o.box[0]-0.05&&p.x<o.box[3]+0.05&&p.z>o.box[2]-0.05&&p.z<o.box[5]+0.05&&p.y>o.box[1]&&p.y<o.box[4]);
  if(os) txt=`Outside stair · storey ${os.l+1} to ${os.l+2}`;
  if(txt!==walk.cell){ walk.cell=txt; $('walkRoom').textContent=txt; }
  aimDoor();
}
window.addEventListener('keydown',e=>{ if(!walk.on) return; const tg=e.target&&e.target.tagName; if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT') return;
  walk.keys[e.code]=true;
  if(e.code==='Space'){ if(walk.ground){ walk.vy=6.0; walk.ground=false; } e.preventDefault(); }
  if((e.code==='KeyE'||e.code==='KeyF')&&!e.repeat){ if(doorTarget) toggleDoor(doorTarget); e.preventDefault(); }
  if(e.code.indexOf('Arrow')===0) e.preventDefault();
  if(e.code==='Escape'&&!document.pointerLockElement) setView('arch'); });
window.addEventListener('keyup',e=>{ walk.keys[e.code]=false; });
window.addEventListener('blur',()=>{ walk.keys={}; });
document.addEventListener('pointerlockchange',()=>{ walk.locked=document.pointerLockElement===canvas; if(walk.on) $('walkHelp').hidden=walk.locked; });
document.addEventListener('mousemove',e=>{ if(walk.on&&walk.locked){ walk.yaw-=e.movementX*0.0022; walk.pitch=clamp(walk.pitch-e.movementY*0.0022,-1.45,1.45); } });
let lockFailed=false, tapAt=null;
document.addEventListener('pointerlockerror',()=>{ lockFailed=true; });
canvas.addEventListener('pointerdown',e=>{ if(!walk.on) return;
  if(e.pointerType==='touch') $('joy').hidden=false;
  if(walk.locked&&e.pointerType==='mouse'){ if(doorTarget) toggleDoor(doorTarget); return; }
  if(e.pointerType==='mouse'&&!coarse&&!lockFailed&&canvas.requestPointerLock){ try{ const r=canvas.requestPointerLock(); if(r&&r.catch) r.catch(()=>{ lockFailed=true; }); }catch(err){ lockFailed=true; } tapAt=null; }
  else tapAt={x:e.clientX,y:e.clientY,t:performance.now()};
  walk.look={id:e.pointerId,x:e.clientX,y:e.clientY}; try{ canvas.setPointerCapture(e.pointerId); }catch(err){} });
canvas.addEventListener('pointerup',e=>{ if(!walk.on||!tapAt||walk.locked) return; const t=tapAt; tapAt=null;
  if(Math.hypot(e.clientX-t.x,e.clientY-t.y)>8||performance.now()-t.t>450) return;
  const d=doorUnder(e.clientX,e.clientY,3.6); if(d) toggleDoor(d); });
canvas.addEventListener('pointermove',e=>{ if(!walk.on||walk.locked||!walk.look||walk.look.id!==e.pointerId) return; const k=e.pointerType==='touch'?0.006:0.004;
  walk.yaw-=(e.clientX-walk.look.x)*k; walk.pitch=clamp(walk.pitch-(e.clientY-walk.look.y)*k,-1.45,1.45); walk.look.x=e.clientX; walk.look.y=e.clientY; });
const endLook=e=>{ if(walk.look&&walk.look.id===e.pointerId) walk.look=null; };
canvas.addEventListener('pointerup',endLook); canvas.addEventListener('pointercancel',endLook);
{ const joy=$('joy'), knob=$('knob'); let jid=null;
  const mv=e=>{ const r=joy.getBoundingClientRect(), R=r.width/2-18; let dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2); const L=Math.hypot(dx,dy); if(L>R){ dx*=R/L; dy*=R/L; }
    knob.style.transform=`translate(${dx}px,${dy}px)`; walk.joy.x=dx/R; walk.joy.y=-dy/R; };
  joy.addEventListener('pointerdown',e=>{ jid=e.pointerId; try{ joy.setPointerCapture(e.pointerId); }catch(err){} mv(e); e.stopPropagation(); e.preventDefault(); });
  joy.addEventListener('pointermove',e=>{ if(e.pointerId===jid) mv(e); });
  const end=e=>{ if(e.pointerId===jid){ jid=null; walk.joy.x=walk.joy.y=0; knob.style.transform=''; } };
  joy.addEventListener('pointerup',end); joy.addEventListener('pointercancel',end); }
$('walkExit').onclick=()=>setView('arch');

/* ---------- picking ---------- */
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(); let downAt=null;
canvas.addEventListener('pointerdown',e=>{ if(walk.on) return; downAt=[e.clientX,e.clientY]; });
let hoverT=0; canvas.addEventListener('pointermove',e=>{ if(walk.on||S.view!=='arch'||e.pointerType!=='mouse'||e.buttons) return; const n=performance.now(); if(n-hoverT<70) return; hoverT=n;
  const d=doorUnder(e.clientX,e.clientY,1e4); canvas.style.cursor=d?'pointer':''; canvas.title=d?`Click to ${d.target>0.5?'close':'open'} this ${d.gate?'gate':'door'}`:''; });
canvas.addEventListener('pointerup',e=>{
  if(walk.on||!downAt||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>5||!plan) return; downAt=null;
  const r=canvas.getBoundingClientRect(); ndc.set((e.clientX-r.left)/r.width*2-1, -(e.clientY-r.top)/r.height*2+1); ray.setFromCamera(ndc,camera);
  if(S.view==='arch'){ const d=doorUnder(e.clientX,e.clientY,1e4); if(d){ toggleDoor(d); return; } }
  const st=STYLE[S.styleId];
  const cand=pickBoxes.filter(m=>{ const i=m.userData.i; if(i>=GRID.ncell) return false; const t=BASE_T(plan.types[i]); if(t===EMPTY) return false; m.scale.set(CW,t===COURT?0.5:st.H,CW); m.position.y=t===COURT?cxzl(i)[2]*st.H+0.25:cellPos(i,st)[1]; m.updateMatrixWorld(); return true; });
  const hit=ray.intersectObjects(cand,false)[0]; if(!hit) return;
  const i=hit.object.userData.i, [hx,hz,hl]=cxzl(i); S.sel={x:hx, z:hz, l:hl}; updateSel(); renderInspector();
  if(window.innerWidth<=760) $('insp').scrollIntoView({behavior:'smooth',block:'start'});
});

/* ---------- culling, occlusion and shadows ----------
   Before each frame the visible level's CullSet (p5f_cull.js) decides, module by module and then object by object, what
   is in the view frustum, what the GPU last reported as hidden behind something nearer, and what is too small to see.
   After the frame, each module in view sends an occlusion query (its box, drawn with no colour or depth writes against
   the frame's depth) and, for a furnished room, a second one for the box round its contents; results come back a frame
   or two later. A module is hidden after two "nothing visible" answers in a row and shown again on the first "visible"
   one. Shadows are drawn only when something that casts them changes, from full copies of the meshes the camera never
   sees, so nothing the camera culls loses its shadow. */
const OCC=(()=>{ const gl=renderer.getContext(), STUB={ok:false, issue(){ return 0; }, poll(){ return false; }, clear(){}};
  if(!(renderer.capabilities.isWebGL2&&gl.createQuery&&gl.ANY_SAMPLES_PASSED_CONSERVATIVE)) return STUB;
  let prog=null, uVP=null, uMn=null, uMx=null, vao=null, live=false;
  // GL objects are made again if the context is lost and restored (a GPU reset, or a phone reclaiming memory)
  const init=()=>{ live=false;
    const sh=(t,src)=>{ const o=gl.createShader(t); gl.shaderSource(o,src); gl.compileShader(o); return o; }; prog=gl.createProgram();
    gl.attachShader(prog,sh(gl.VERTEX_SHADER,'#version 300 es\nin vec3 p; uniform mat4 vp; uniform vec3 mn; uniform vec3 mx; void main(){ gl_Position=vp*vec4(mix(mn,mx,p),1.0); }'));
    gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,'#version 300 es\nprecision lowp float; out vec4 c; void main(){ c=vec4(1.0); }'));
    gl.bindAttribLocation(prog,0,'p'); gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) return;
    uVP=gl.getUniformLocation(prog,'vp'); uMn=gl.getUniformLocation(prog,'mn'); uMx=gl.getUniformLocation(prog,'mx');
    vao=gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,0,1,0,0,1,1,0,0,1,0,0,0,1,1,0,1,1,1,1,0,1,1]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
    const ib=gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0]),gl.STATIC_DRAW);
    gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER,null); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null); renderer.resetState(); live=true; };
  init(); if(!live) return STUB;
  const pend=[], pool=[], VP=new THREE.Matrix4(), lastP=new THREE.Vector3(), lastQ=new THREE.Quaternion(); let mT=0, mR=0, cp=null;
  // a moving camera asks about fatter boxes: what the next frame may reveal is asked about in this one
  const fat=(a,base)=>{ if(!mT&&!mR) return base; const dx=Math.max(a[0]-cp.x,0,cp.x-a[3]), dy=Math.max(a[1]-cp.y,0,cp.y-a[4]), dz=Math.max(a[2]-cp.z,0,cp.z-a[5]);
    return base+Math.min(3,1.5*mT+1.2*mR*Math.hypot(dx,dy,dz)); };
  const box=(a,m)=>{ const q=pool.pop()||gl.createQuery(); gl.beginQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE,q); gl.uniform3f(uMn,a[0]-m,a[1]-m,a[2]-m); gl.uniform3f(uMx,a[3]+m,a[4]+m,a[5]+m);
    gl.drawElements(gl.TRIANGLES,36,gl.UNSIGNED_SHORT,0); gl.endQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE); return q; };
  // queries in flight die with the context: forget them, and (with ok false) nothing stays hidden on their say-so
  const drop=()=>{ for(const e of pend){ if(e.k===0) e.M.qs=null; else if(e.k===1) e.M.qi=null; else e.M.q=null; } pend.length=0; pool.length=0; };
  renderer.domElement.addEventListener('webglcontextlost',()=>{ live=false; drop(); });
  renderer.domElement.addEventListener('webglcontextrestored',()=>{ init(); needsRender=true; });
  return { get ok(){ return live; },
    // after a frame: ask about every module in view (and the contents of every room whose shell is showing)
    issue(C,cam){ if(!C||!live) return 0; let n=0; cp=cam.position;
      mT=Math.min(cam.position.distanceTo(lastP),2); mR=Math.min(2*Math.acos(Math.min(1,Math.abs(cam.quaternion.dot(lastQ)))),0.6); lastP.copy(cam.position); lastQ.copy(cam.quaternion);
      gl.useProgram(prog); gl.bindVertexArray(vao); gl.colorMask(false,false,false,false); gl.depthMask(false); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.disable(gl.STENCIL_TEST); gl.disable(gl.SCISSOR_TEST);
      gl.uniformMatrix4fv(uVP,false,VP.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse).elements);
      const pad=walk.on?0.35:0.12;   // walking, boxes are a little fatter so what a doorway reveals is asked about a step early
      for(const M of C.mods){ if(!M.fs) continue;
        if(!M.camIn&&!M.qs){ M.qs=box(M.a,fat(M.a,pad)); pend.push({q:M.qs,M,k:0,C}); n++; }
        if(M.ia&&!M.camInI&&!M.hid&&!M.qi){ M.qi=box(M.ia,fat(M.ia,0.03)); pend.push({q:M.qi,M,k:1,C}); n++; }
        if(!M.hid||M.camIn) for(const id of M.heavy){ const O=C.objs[id]; if(!O.fin||O.q) continue; O.q=box(O.a,fat(O.a,0.04)); pend.push({q:O.q,M:O,k:2,C}); n++; } }
      gl.bindVertexArray(null); gl.colorMask(true,true,true,true); gl.depthMask(true); renderer.resetState(); return n; },
    // between frames: collect answers; true when something hidden has come back into view (draw again)
    poll(C){ let wake=false; if(!live) return false;
      for(let i=pend.length-1;i>=0;i--){ const e=pend[i]; if(!gl.getQueryParameter(e.q,gl.QUERY_RESULT_AVAILABLE)) continue;
        const seen=gl.getQueryParameter(e.q,gl.QUERY_RESULT)>0; pend.splice(i,1); pool.push(e.q); const M=e.M;
        if(e.k===0) M.qs=null; else if(e.k===1) M.qi=null; else M.q=null; if(e.C!==C) continue;
        if(e.k===2){ if(seen){ if(M.hid) wake=true; M.hid=false; M.ns=0; } else if(++M.ns>=2) M.hid=true; }
        else if(e.k===0){ if(seen){ if(M.hid) wake=true; M.hid=false; M.ns=0; } else if(++M.ns>=2) M.hid=true; }
        else { if(seen){ if(M.ihid) wake=true; M.ihid=false; M.ni=0; } else if(++M.ni>=2) M.ihid=true; } }
      return wake; },
    clear(){ if(!live){ drop(); return; } for(const e of pend){ gl.deleteQuery(e.q); if(e.k===0) e.M.qs=null; else if(e.k===1) e.M.qi=null; else e.M.q=null; } pend.length=0; } }; })();
let activeCull=null, cullStats=null, cullInfoT=0, buildUid=0;
function visibleCull(){ if(!archObj||!archObj.group.visible||!archObj.lod) return null; const L=archObj.lod;
  if(L.autoUpdate) L.update(camera); const lv=L.levels.find(l=>l.object.visible); return lv&&lv.object.userData.cull||null; }
function cullFrame(){ camera.updateMatrixWorld(); const C=visibleCull();
  if(C!==activeCull){ if(activeCull) OCC.clear(); activeCull=C; if(C){ for(const M of C.mods){ M.hid=M.ihid=false; M.ns=M.ni=0; M.qs=M.qi=null; } for(const O of C.objs){ O.hid=false; O.ns=0; O.q=null; } } }   // a fresh level starts with everything showing
  if(!C){ cullStats=null; cullLines.visible=false; return; }
  cullStats=C.update(camera,renderer.domElement.height,{on:S.cull!=='off', occl:OCC.ok&&(S.cull==='on'||S.cull==='show'), px:walk.on?1.5:2, near:walk.on?Math.max(4,CW*0.6):0});
  if(S.cull==='show') drawCullBoxes(C); else if(cullLines.visible){ cullLines.visible=false; } }
// "Show": every module's box, green when drawn, amber when its room's contents are hidden, red when hidden behind others, grey when out of view
const cullLines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0.75,depthTest:false,fog:false}));
cullLines.renderOrder=11; cullLines.frustumCulled=false; cullLines.visible=false; scene.add(cullLines);
function drawCullBoxes(C){ const P=[], Cc=[], E=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  for(const M of C.mods){ const a=M.a, v=[[a[0],a[1],a[2]],[a[3],a[1],a[2]],[a[3],a[1],a[5]],[a[0],a[1],a[5]],[a[0],a[4],a[2]],[a[3],a[4],a[2]],[a[3],a[4],a[5]],[a[0],a[4],a[5]]];
    const col=!M.fs?[0.45,0.5,0.58]:M.hid&&!M.camIn?[1,0.25,0.2]:M.ihid&&M.ia&&!M.camInI?[1,0.72,0.2]:[0.35,0.95,0.45];
    for(const [i,j] of E){ P.push(...v[i],...v[j]); Cc.push(...col,...col); } }
  const g=cullLines.geometry; g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(Cc,3)); cullLines.visible=true; }
function renderCullInfo(){ const e=$('cullInfo'); if(!e) return; const s=cullStats;
  if(!s){ e.textContent=''; return; } const k=n=>n>=1e4? (n/1000).toFixed(0)+'k' : n>=1000? (n/1000).toFixed(1)+'k' : String(n);
  if(S.cull==='off'){ e.textContent=`Drawing every object: ${k(s.total)} triangles.`; return; }
  const parts=[`Drawing ${k(s.tris)} of ${k(s.total)} triangles (${Math.round(100*s.tris/Math.max(1,s.total))}%), ${s.objs} of ${s.nObj} objects`, `${s.mods} of ${s.nMods} modules in view`];
  if(s.mOcc) parts.push(`${s.mOcc} hidden behind others`); if(s.oOcc) parts.push(`${s.oOcc} large object${s.oOcc===1?'':'s'} hidden`); if(s.iOcc) parts.push(`${s.iOcc} room${s.iOcc===1?'':'s'}' contents hidden`); if(s.small) parts.push(`${s.small} too small to see`);
  e.textContent=parts.join(' · ')+'.'+(OCC.ok||S.cull==='frustum'?'':' Occlusion needs WebGL 2.'); }
function renderCullSel(){ const e=$('cullSel'); if(!e) return; e.innerHTML='';
  for(const [v,l,t] of [['on','On','Frustum, occlusion and small-object culling'],['frustum','Frustum','Only what is outside the view is skipped'],['off','Off','Draw everything'],['show','Show','Culling on, with each module\'s box coloured by what happened to it']]){
    const b=document.createElement('button'); b.textContent=l; b.title=t; b.setAttribute('aria-pressed',S.cull===v); b.onclick=()=>{ S.cull=v; renderCullSel(); needsRender=true; }; e.appendChild(b); } }
// static shadows: redrawn only when what casts them changes
renderer.shadowMap.autoUpdate=false;
const shadowCam=new THREE.OrthographicCamera(-1,1,1,-1,0.1,1); shadowCam.position.set(0,-1e5,0); shadowCam.lookAt(0,-2e5,0); shadowCam.layers.set(1); shadowCam.updateMatrixWorld();
const shadowRT=new THREE.WebGLRenderTarget(1,1);
for(const l of [hemi,sun,...lampLights]) l.layers.enable(1);   // same lights in both passes, so materials keep their programs
let shadowSig='', shadowDirty=true;
function castLayers(root){ root.traverse(o=>{ if(o.isMesh&&o.castShadow&&!o.userData.shadowOnly) o.layers.enable(1); }); }
function shadowFrame(){ const L=archObj&&archObj.lod, lv=L? L.levels.findIndex(l=>l.object.visible) : -1;
  const sig=[archObj?archObj.uid:0, archObj&&archObj.group.visible?1:0, lv, L?L.levels.length:0, sun.position.x.toFixed(2), sun.position.y.toFixed(2), sun.position.z.toFixed(2), sun.shadow.camera.right].join('|');
  if(sig!==shadowSig){ shadowSig=sig; shadowDirty=true; } if(!shadowDirty) return;
  if(archObj) castLayers(archObj.group);
  renderer.shadowMap.needsUpdate=true; const rt=renderer.getRenderTarget(); renderer.setRenderTarget(shadowRT); renderer.render(scene,shadowCam); renderer.setRenderTarget(rt); shadowDirty=false; }

/* ---------- render loop ---------- */
let needsRender=true, lastT=performance.now(), animAcc=0;
function resize(){ const r=$('stage').getBoundingClientRect(); const w=Math.max(1,r.width|0), h=Math.max(1,r.height|0); renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); needsRender=true; }
new ResizeObserver(resize).observe($('stage'));
controls.addEventListener('change',()=>{ needsRender=true; });
function loop(now){
  requestAnimationFrame(loop);
  const dt=now-lastT; lastT=now; SHU.uTime.value=now/1000;
  stepDoors(dt/1000);
  if(walk.on){ walkStep(dt/1000); needsRender=true; }
  else if(controls.update()) needsRender=true;
  const TT=TODS[S.tod], lampsOn=TT.lamp>0.3;
  if(lampsOn||(archObj&&archObj.hasWater)){ animAcc+=dt; if(animAcc>40){ animAcc=0; needsRender=true;
    if(lampsOn){ const tt=now/1000, f=0.86+0.14*Math.sin(tt*11.0)*Math.sin(tt*6.7+1.3), m=currentMats(); m.glow.emissiveIntensity=glowBase*f; for(const l of lampLights) if(l.userData.base) l.intensity=l.userData.base*(0.9+0.1*f); } } }
  if(replay&&replay.playing){ replay.acc+=dt; const stepMs=Math.max(40,2200/plan.trace.length); if(replay.acc>stepMs){ replay.acc=0; if(replay.i<plan.trace.length-1) stepReplay(replay.i+1); else { replay.playing=false; setTimeout(()=>{ if(replay&&!replay.playing) stopReplay(); },1100); } } }
  if(activeCull&&S.cull!=='off'&&OCC.poll(activeCull)) needsRender=true;
  if(needsRender){ sky.position.copy(camera.position); cullFrame(); shadowFrame(); renderer.render(scene,camera); needsRender=false;
    if(activeCull&&S.cull!=='off'&&S.cull!=='frustum') OCC.issue(activeCull,camera);
    const c=currentLOD(); if(c!==shownLOD){ shownLOD=c; renderLODInfo(); }
    if(now-cullInfoT>300){ cullInfoT=now; renderCullInfo(); } }
}

/* ---------- wire up ---------- */
$('seed').value=S.seed;
/* a seed can set everything: tradition, plot, module, stairs, fill, weights, features, pattern, light and weathering all come
   from it, so the same seed always rebuilds the same scene. Settings changed by hand afterwards stand until the seed changes. */
function seedSettings(seed){
  const r=RNG('settings|'+seed), st=STYLES[r.int(0,STYLES.length-1)];
  S.styleId=st.id; S.nx=r.pick([2,3,3,3,4,4,5]); S.nz=r.pick([2,3,3,3,4,4,5]); S.cw=r.pick([8,9,10,10,11,12]); setCellSize(S.cw); setGrid(S.nx,S.nz); lastVars=null;
  S.stairs=r.pick(['inside','both','both','outside']); S.fill=Math.round(r.range(0.55,0.9)*20)/20;
  if(r.chance(0.5)){ S.heights=footFor(st,S.nx,S.nz).map(h=>r.chance(0.25)?clamp(h+r.pick([-1,1]),h>0?1:0,4):h); S.footEdited=!S.heights.every((h,i)=>h===footFor(st,S.nx,S.nz)[i]); }
  else { const tall=st.id==='hejazi'||st.id==='sanaani', inner=i=>{ const x=i%S.nx, z=(i/S.nx)|0; return x>0&&z>0&&x<S.nx-1&&z<S.nz-1; };
    S.heights=Array.from({length:S.nx*S.nz},(_,i)=> inner(i)&&r.chance(0.7)? r.int(1,tall?4:2) : r.chance(S.nx*S.nz>9?0.26:0.18)?0:r.int(1,tall?4:3)); S.footEdited=true; }
  if(S.heights.every(h=>!h)) S.heights[0]=1;
  S.w=Object.fromEntries(Object.entries(st.w).map(([k,v])=>[k,Math.round(v*r.range(0.7,1.35)*10)/10]));
  const keep=S.feats&&S.feats.doorsOpen; S.feats=Object.assign({},st.feats); for(const k in S.feats){ if(k==='furniture'||k==='decor'){ if(r.chance(0.08)) S.feats[k]=0; } else if(r.chance(0.15)) S.feats[k]=S.feats[k]?0:1; } if(keep) S.feats.doorsOpen=1;
  S.pattern=r.chance(0.7)?'auto':r.pick(PATTERNS.slice(1))[0]; const fam=S.pattern==='auto'?st.pattern:S.pattern; S.theta=HANKIN_FAM.has(fam)&&r.chance(0.4)? Math.round(r.range(48,76)*2)/2 : null;
  S.tod=r.pick(['noon','after','after','golden','golden','golden','dusk','night']); S.weather=Math.round(r.range(0,0.7)*20)/20;
  S.locks={}; S.mods={}; S.sel={x:0,z:0,l:0}; S.seededFrom=seed;
  // drawn last, so seeds from before these settings existed keep the rest of their draws
  S.fit=r.chance(0.4)?'modern':'period'; S.finish=FIN_DEFAULT(); S.finish.vary=Math.round(r.range(0.1,0.6)*20)/20;
  for(const [g,list] of [['wall',FIN_WALL],['floor',FIN_FLOOR],['roof',FIN_ROOF]]){ const f=S.finish[g]; if(r.chance(0.25)) f.pat=r.pick(list.slice(1))[0];
    if(r.chance(0.4)) f.shade=Math.round(r.range(-0.4,0.35)*20)/20; if(r.chance(0.2)) f.tint=r.pick(FIN_TINTS.slice(1))[0]; }
  renderStyles(); renderFoot(); renderWeights(); renderFeats(); renderPattern(); renderFinishes(); renderTod(); layoutProxies();
  toast(`${st.name} · ${S.nx}×${S.nz} plot · ${S.cw} m modules · ${TODS[S.tod].label.toLowerCase()}`); }
function newSeed(seed){ S.seed=seed; $('seed').value=seed; if(S.seedAll&&S.seededFrom!==seed) seedSettings(seed); regenerate('new',true); }
function renderSeedMode(){ const e=$('seedMode'); e.innerHTML='';
  for(const [v,l] of [[true,'Everything'],[false,'Building only']]){ const b=document.createElement('button'); b.textContent=l; b.setAttribute('aria-pressed',S.seedAll===v); b.onclick=()=>{ S.seedAll=v; renderSeedMode(); }; e.appendChild(b); }
  $('seedHint').textContent= S.seedAll? 'A new seed also picks the tradition, plot size and storeys, module, stairs, fill, weights, features, pattern, light and weathering, so the same seed always rebuilds the same scene. Changes you make afterwards stand until the seed changes.'
    : 'A new seed only re-rolls the building on the current settings.'; }
$('seed').addEventListener('keydown',e=>{ if(e.key==='Enter') newSeed($('seed').value.trim()||'qasr'); });
$('gen').onclick=()=>newSeed($('seed').value.trim()||'qasr');
$('dice').onclick=()=>newSeed('qasr-'+Math.random().toString(36).slice(2,6));
$('fill').oninput=e=>{ S.fill=+e.target.value; }; $('fill').onchange=()=>regenerate('new');
$('footRand').onclick=()=>{ const r=RNG(S.seed+'|plot|'+Math.random()); const st=STYLE[S.styleId]; const tall=st.id==='hejazi'||st.id==='sanaani';
  const inner=i=>{ const x=i%S.nx, z=(i/S.nx)|0; return x>0&&z>0&&x<S.nx-1&&z<S.nz-1; };
  S.heights=S.heights.map((_,i)=>{ if(inner(i)&&r.chance(0.7)) return r.int(1,tall?4:2); return r.chance(S.nx*S.nz>9?0.26:0.18)?0:r.int(1,tall?4:3); });
  if(S.heights.every(h=>!h)) S.heights[0]=1; S.footEdited=true; renderFoot(); regenerate('new',true); };
$('footStyle').onclick=()=>{ S.heights=footFor(STYLE[S.styleId],S.nx,S.nz); S.footEdited=false; renderFoot(); regenerate('new',true); };
$('wReset').onclick=()=>{ S.w=Object.assign({},STYLE[S.styleId].w); renderWeights(); regenerate('new'); };
$('finReset').onclick=()=>{ const pats=['wall','floor','roof'].some(g=>S.finish[g].pat!=='auto')||S.finish.vary!==0.25; S.finish=FIN_DEFAULT(); renderFinishes(); if(pats) build(); else { applyFinishes(currentMats(),S.finish); needsRender=true; } };
$('patFam').onchange=e=>{ S.pattern=e.target.value; S.theta=null; renderPattern(); build(); };
$('theta').oninput=e=>{ const st=STYLE[S.styleId], fam=S.pattern==='auto'?st.pattern:S.pattern; $('thetaO').textContent=(+e.target.value).toFixed(1)+'°'; drawPatPreview(fam,+e.target.value); };
$('theta').onchange=e=>{ S.theta=+e.target.value; build(); };
$('weather').oninput=e=>{ $('weatherO').textContent=Math.round(e.target.value*100)+'%'; S.weather=+e.target.value; SHU.uWeather.value=S.weather; needsRender=true; }; $('weather').onchange=()=>renderRecipe();
document.querySelectorAll('#viewMode button').forEach(b=>b.onclick=()=>setView(b.dataset.v));
$('replay').onclick=startReplay;
$('frame').onclick=frameView;
$('scrub').oninput=e=>{ if(replay){ replay.playing=false; stepReplay(+e.target.value); } };
$('rCopy').onclick=()=>{ const ta=$('recipe'); ta.value=JSON.stringify(recipeObj()); const done=()=>{ $('rMsg').textContent='Recipe copied.'; };
  try{ navigator.clipboard.writeText(ta.value).then(done,()=>{ ta.select(); $('rMsg').textContent='Selected. Press Ctrl+C or ⌘C to copy.'; }); }catch(err){ ta.select(); $('rMsg').textContent='Selected. Press Ctrl+C or ⌘C to copy.'; } };
$('rLoad').onclick=()=>loadRecipe($('recipe').value);
$('clearPins').onclick=()=>{ S.locks={}; regenerate('edit'); renderInspector(); };

if(S.seedAll) seedSettings(S.seed);
renderStyles(); renderFoot(); renderWeights(); renderFeats(); renderPattern(); renderFinishes(); renderTod(); renderLegend(); renderLODSel(); renderCullSel(); renderSeedMode();
resize();
regenerate('new',true);
requestAnimationFrame(loop);
