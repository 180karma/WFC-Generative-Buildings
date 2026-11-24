
/* ============================================================
   MATERIALS
   ============================================================ */
let CW=6;                     // module (cell) size in metres; the app sets it from the Module control
function setCellSize(v){ CW=v; }
const FR_LIFT=0.003;          // faces running N–S sit 3 mm higher, so boxes meeting at a corner never share a top or bottom plane
const MATCACHE=new Map(), MATCACHE_MAX=4;
// free a material set's GPU side (a texture shared with a set still in use is simply uploaded again when next drawn)
function disposeMats(M){ const seen=new Set();
  for(const k in M){ const m=M[k]; if(!m||!m.isMaterial) continue;
    for(const t of [m.map,m.normalMap,m.emissiveMap,m.roughnessMap,m.bumpMap,m.alphaMap,m.userData&&m.userData.heightMap]) if(t&&t.isTexture&&!seen.has(t)){ seen.add(t); t.dispose(); }
    m.dispose(); } }
const HANKIN_FAM=new Set(['488','444','666','31212','3636']);
function lc(h){ return new THREE.Color(h).convertSRGBToLinear(); }
function mkTex(c,ww,wh){ const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.encoding=THREE.sRGBEncoding; t.anisotropy=8; t.repeat.set(1/ww,1/wh); return t; }
function wallCanvas(spec,rng){
  switch(spec.tex){
    case 'mud': return texMud(spec.c,rng);
    case 'coral': return texCoral(spec.c,rng,false);
    case 'coralblock': return texCoral(spec.c,rng,true);
    case 'brick': return texBrick(spec.c,spec.mortar||'#8c7357',rng,spec.bw||32,spec.bh||8);
    case 'lime': return texLime(spec.c,rng);
    case 'boards': return texBoards(spec.c,rng);
    case 'panels': return texPanels(spec.c,rng);
    case 'whitewash': return texWhitewash(spec.c,rng);
    case 'sanaa': return texBrick(spec.c,'#4d2c1c',rng,24,8);
    case 'basalt': return texRubble(spec.c,rng);
    case 'rubble': return texRubble(spec.c,rng);
    case 'logs': return wallCanvasWorld(spec,rng);
    case 'marble': case 'sandstone': case 'laterite': case 'polygonal': case 'crib': case 'drystone': case 'mudbrick': case 'opus': return wallCanvasRuin(spec,rng);
    default: return texAshlar(spec.c,rng,10);
  }
}
function patPal(st,fam){
  if(fam===st.pattern||fam==='najdi'||fam==='zigzag'||fam==='bannai') return st.tilePal;
  return st.tilePal;
}
/* ---------- finishes: a pattern, a shade and a tint for walls, floors and roofs ----------
   'auto' keeps the tradition's own surface. A chosen pattern is drawn in its own natural colour; shade and tint then
   multiply whatever the surface is, live, without rebuilding. */
const FIN_WALL=[['auto','Tradition'],['lime','Lime render'],['whitewash','Whitewash'],['mud','Mud plaster'],['ashlar','Ashlar'],['brick','Brick'],['mudbrick','Mud brick'],['rubble','Rubble stone'],
  ['sandstone','Sandstone'],['marble','Marble'],['coralblock','Coral stone'],['opus','Opus reticulatum'],['polygonal','Polygonal masonry'],['drystone','Dry stone'],['boards','Timber boards'],['panels','Timber panelling']];
const FIN_WALL_C={lime:'#e6dfcf',whitewash:'#f2efe6',mud:'#b98f62',ashlar:'#cdbb98',brick:'#a65a3c',mudbrick:'#b08a5e',rubble:'#9a8c78',sandstone:'#c9a46a',marble:'#e8e2d4',coralblock:'#ddd2bb',opus:'#b8a184',polygonal:'#9d9483',drystone:'#8f8676',boards:'#8a6a48',panels:'#9a7650'};
const FIN_FLOOR=[['auto','Tradition'],['flags','Flagstones'],['brick','Brick pavers'],['tiles','Two-tone tiles'],['marble','Marble inlay'],['boards','Timber boards'],['greybrick','Grey brick'],['pebble','Pebble mosaic'],['plaster','Polished plaster'],['gravel','Rammed gravel']];
const FIN_ROOF=[['auto','Tradition'],['pan','Terracotta pantiles'],['barrel','Barrel tiles'],['plain','Plain clay tiles'],['slate','Slate'],['shingle','Timber shingles'],['glazed','Glazed tiles'],['thatch','Thatch'],['lead','Lead sheet'],['pavers','Brick pavers'],['gravel','Gravel'],['plaster','Lime plaster']];
const FIN_ROOF_C={pan:{kind:'pan',c:'#a8552f'},barrel:{kind:'barrel',c:'#b0532f'},plain:{kind:'plain',c:'#8e4a32'},slate:{kind:'slate',c:'#4f565e'},shingle:{kind:'shingle',c:'#8a7a62'},glazed:{kind:'glazed',c:'#2f6f8a',c2:'#c9a33b'},thatch:{kind:'thatch',c:'#9a8452'}};
const FIN_TINTS=[['none','None'],['#d6a24a','Ochre'],['#c4643c','Terracotta'],['#c97b84','Rose'],['#8fa77a','Sage'],['#4f8f8c','Teal'],['#5b7397','Slate blue'],['#8c7bb0','Lavender'],['#5a5f66','Charcoal']];
const FIN_GROUPS={wall:['wall','wall2','ablaq'], floor:['floor','floor0'], roof:['roof','roof2','roofTile','dome','lead']};
const FIN_DEFAULT=()=>({wall:{pat:'auto',shade:0,tint:'none'}, floor:{pat:'auto',shade:0,tint:'none'}, roof:{pat:'auto',shade:0,tint:'none'}, vary:0.25});
// shade and tint as a colour multiplier: the tint keeps the surface's brightness and moves its hue (linear light)
function finishMul(f){ const sh=f&&f.shade||0, m= sh>=0? 1+sh*0.6 : 1+sh*0.55; let r=m, g=m, b=m;
  if(f&&f.tint&&f.tint!=='none'){ const c=lc(f.tint), L=0.2126*c.r+0.7152*c.g+0.0722*c.b||1, k=0.55; r*=1+k*(c.r/L-1); g*=1+k*(c.g/L-1); b*=1+k*(c.b/L-1); }
  return [Math.max(0.05,r),Math.max(0.05,g),Math.max(0.05,b)]; }
function applyFinishes(M,fin){ if(!fin) return; for(const g in FIN_GROUPS){ const [r,gg,b]=finishMul(fin[g]); for(const k of FIN_GROUPS[g]){ const m=M[k]; if(!m||!m.color) continue;
  if(!m.userData.base0) m.userData.base0=m.color.clone(); m.color.copy(m.userData.base0).multiply(new THREE.Color(r,gg,b)); } } }
function getMats(st,fam,theta,q,fp){
  q=q==null?2:q; fp=fp||{wall:'auto',floor:'auto',roof:'auto'}; const key=st.id+'|'+fam+'|'+theta+'|'+q+'|'+fp.wall+'|'+fp.floor+'|'+fp.roof;
  if(MATCACHE.has(key)){ const o=MATCACHE.get(key); MATCACHE.delete(key); MATCACHE.set(key,o); return o; }   // most recently used last
  const rng=RNG('tex|'+st.id);
  const std=o=>new THREE.MeshStandardMaterial(Object.assign({roughness:0.92,metalness:0,side:THREE.DoubleSide,vertexColors:true},o));
  const pat=drawPattern(fam,theta,patPal(st,fam),rng);
  const pw=HANKIN_FAM.has(fam)?1.05:1.6;
  const M={};
  M.wall=std({map:mkTex(wallCanvas(fp.wall!=='auto'? {tex:fp.wall,c:FIN_WALL_C[fp.wall]||st.wall.c} : st.wall,rng),4,4)});
  M.wall2=st.groundWall&&fp.wall==='auto'? std({map:mkTex(wallCanvas(st.groundWall,rng),4,4)}) : M.wall;
  M.ablaq=std({map:mkTex(texAshlar(st.ablaq[0],RNG('tex|'+st.id+'|ablaq'),10,st.ablaq),4,4)});
  M.base=std({map:mkTex(wallCanvas(st.base,rng),3,3)});
  M.trim=std({map:mkTex(texPlaster(st.trim,rng),2,2)});
  M.stone=std({map:mkTex(texAshlar(st.stone,rng,8),3,3), roughness:0.8});
  M.stone2=std({map:mkTex(texPlaster(st.ablaq[1],rng),2,2), roughness:0.8});
  M.wood=std({map:mkTex(texWood(st.wood,rng),1.2,1.2), roughness:0.8});
  M.paint=std({map:mkTex(texPaint(st.paint,st.wood,rng),1.2,1.2), roughness:0.75});
  M.door=std({map:mkTex(drawDoor(st.doorTex,st,rng,true),1,1), roughness:0.7});
  M.glass=std({color:lc('#1b2028'), roughness:0.08, metalness:0.5, emissive:lc('#ffae55'), emissiveIntensity:0, transparent:true, opacity:0.55, depthWrite:false});
  const qt=mkTex(drawQamariya(rng),1,1);
  M.qamar=std({map:qt, emissive:new THREE.Color(1,0.85,0.7), emissiveMap:qt, emissiveIntensity:0, roughness:0.35});
  const latCol= st.lattice==='rawasheen'||(st.timber&&st.timber.post==='paint')? st.paint : st.lattice==='jali'? st.stone : st.wood;
  M.lattice=std({map:mkTex(drawLattice(st.lattice, latCol),st.lattice==='koshi'?0.5:0.55,st.lattice==='koshi'?0.5:0.55), alphaTest:0.5, roughness:0.8});
  M.screen=std({map:mkTex(drawScreen(st.screen,st.trim,rng),0.9,0.9), alphaTest:0.5});
  M.tile=std({map:mkTex(pat.c,pw,pw*pat.aspect), roughness:0.42});
  const sg=mkTex(pat.c,0.55,0.55*pat.aspect);
  M.stained=std({map:sg, emissive:new THREE.Color(1,0.8,0.6), emissiveMap:sg, emissiveIntensity:0, roughness:0.3});
  M.band=std({map:mkTex(drawBand(st.band,st.bandPal,rng,pat),2.8,0.35), roughness:0.55});
  const dm=st.domeMat;
  if(dm==='tile'){ const t=new THREE.CanvasTexture(pat.c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.encoding=THREE.sRGBEncoding; t.repeat.set(16,6*pat.aspect); M.dome=std({map:t, roughness:0.35}); }
  else if(dm==='chevron'){ const t=mkTex(texChevron(st.stone,rng),1,1); t.repeat.set(10,3); M.dome=std({map:t, roughness:0.85}); }
  else if(dm==='lead'){ const t=mkTex(texLead(rng),1,1); t.repeat.set(4,1); M.dome=std({map:t, roughness:0.5, metalness:0.45}); }
  else if(dm==='gold'){ M.dome=std({color:lc('#d4a43a'), metalness:0.85, roughness:0.32}); }
  else if(dm==='mud'){ const t=mkTex(texMud(st.wall.c,rng),1,1); t.repeat.set(5,2); M.dome=std({map:t}); }
  else { const t=mkTex(texPlaster(st.trim,rng),1,1); t.repeat.set(5,2); M.dome=std({map:t}); }
  M.lead=std({map:mkTex(texLead(rng),1.2,1.2), roughness:0.5, metalness:0.45});
  M.metal=std({color:lc(st.metal), metalness:0.85, roughness:0.35});
  M.iron=std({color:lc('#2a2a2d'), metalness:0.6, roughness:0.55});
  M.roofTile=std({map:mkTex(st.pr? texRoofTiles(st.pr.tile,rng) : texRoofTile(rng),st.pr&&st.pr.tile.kind==='thatch'?1.6:1.1,st.pr&&st.pr.tile.kind==='thatch'?1.6:1.1), roughness:st.pr&&st.pr.tile.kind==='glazed'?0.4:0.75});
  // Asia: shoji paper glows when lit from inside; gilding; lacquer black; red silk lanterns; garden greens
  M.paper=std({color:lc('#efe6d0'), emissive:lc('#ffcf8a'), emissiveIntensity:0, roughness:0.9});
  M.gold=std({color:lc('#d4a43a'), metalness:0.85, roughness:0.3});
  M.black=std({color:lc('#1b1918'), roughness:0.7});
  M.lantern=std({color:lc('#b8261c'), emissive:lc('#ff4a2a'), emissiveIntensity:0, roughness:0.6});
  M.moss=std({color:lc('#5d7a35'), roughness:1});
  M.bamboo=std({color:lc('#7d9a3e'), roughness:0.6});
  M.blossom=std({color:lc('#e7a6b8'), roughness:0.8});
  M.maple=std({color:lc('#b8422c'), roughness:0.8});
  M.flags=std({map:mkTex(texFlags(),1,1), roughness:0.9});
  M.water=new THREE.MeshStandardMaterial({color:lc('#3e7f90'), roughness:0.05, metalness:0.3, transparent:true, opacity:0.9, vertexColors:true});
  M.leaf=std({color:lc('#5a7a31'), roughness:0.8});
  M.leaf2=std({color:lc('#2f4b2b'), roughness:0.85});
  M.grass=std({color:lc('#617f37')});
  M.trunk=std({color:lc('#7a6247')});
  M.fruit=std({color:lc('#e48a25'), roughness:0.6});
  M.clay=std({color:lc(st.clay), roughness:0.85});
  M.carpet=std({map:mkTex(texCarpet(rng),1,1)});
  M.thatch=std({map:mkTex(texThatch(rng),1,1)});
  M.void=std({color:lc('#0b0c0e'), roughness:1});
  M.glow=std({color:lc('#ffdca8'), emissive:lc('#ffb35c'), emissiveIntensity:0});
  M.fabric=std({color:lc('#d8ccb0')});
  furnMats(M,st,std,rng);
  worldMats(M,st,std,rng);
  ruinMats(M,st,std,rng);
  M.court=std({map:mkTex(texPave(st.court.pave,st,rng),3,3), roughness:0.85});
  if(st.ruin){ M.court.color=lc('#a39c8e'); M.trim.color=lc('#b9b2a4'); }   // centuries of dust on the old floors and plaster
  // floors (upper: plaster as the trim; ground: as the court paving) and flat roofs (as the walls) get materials of their own
  { const fr=RNG('tex|'+st.id+'|fin'), twin=(src,map)=>{ const m=std({map:map||src.map, roughness:src.roughness, metalness:src.metalness}); m.color.copy(src.color); return m; };
    const fmap= fp.floor==='auto'? null : mkTex(fp.floor==='tiles'? texFloorTile(st,fr) : fp.floor==='plaster'? texPlaster(st.trim,fr) : texPave(fp.floor,st,fr),fp.floor==='tiles'?1.2:3,fp.floor==='tiles'?1.2:3);
    M.floor=twin(M.trim,fmap); M.floor0=twin(M.court,fmap); if(fmap){ M.floor.color.setRGB(1,1,1); M.floor0.color.setRGB(1,1,1); M.floor.roughness=M.floor0.roughness=fp.floor==='marble'||fp.floor==='tiles'||fp.floor==='plaster'?0.4:0.85; }
    const rp=fp.roof, rt=FIN_ROOF_C[rp];
    const rmap= rp==='auto'? null : rp==='lead'? mkTex(texLead(fr),1.2,1.2) : rp==='pavers'? mkTex(texPave('brick',st,fr),3,3) : rp==='gravel'? mkTex(texPave('gravel',st,fr),3,3)
      : rp==='plaster'? mkTex(texPlaster('#d8cfbd',fr),2,2) : rp==='shingle'? mkTex(texRoofTiles(rt,fr),1.1,1.1) : mkTex(texRoofTiles(rt,fr),rp==='thatch'?1.6:1.1,rp==='thatch'?1.6:1.1);
    M.roof=twin(M.wall,rmap); M.roof2=twin(M.wall2,rmap); if(rmap){ M.roof.color.setRGB(1,1,1); M.roof2.color.setRGB(1,1,1); if(rp==='lead'){ M.roof.metalness=M.roof2.metalness=0.45; M.roof.roughness=M.roof2.roughness=0.5; } }
    if(rmap&&rt){ M.roofTile=std({map:mkTex(texRoofTiles(rt,fr),rp==='thatch'?1.6:1.1,rp==='thatch'?1.6:1.1), roughness:rp==='glazed'?0.4:0.75}); }
    else if(rp==='lead'){ M.roofTile=std({map:mkTex(texLead(fr),1.2,1.2), roughness:0.5, metalness:0.45}); } }
  enhanceMats(M,st,fam,theta,q);
  const out={M, pat};
  MATCACHE.set(key,out);
  // only a few sets are kept: each holds dozens of textures, and leafing through styles and finishes would otherwise fill the GPU
  while(MATCACHE.size>MATCACHE_MAX){ const [k0,o0]=MATCACHE.entries().next().value; MATCACHE.delete(k0); disposeMats(o0.M); }
  return out;
}

/* ============================================================
   SHADERS — injected into MeshStandardMaterial via onBeforeCompile
   ============================================================ */
const SHU={uTime:{value:0}, uWeather:{value:0.3}, uDetail:{value:1}};
const GLSL_NOISE=`
float qh2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float qn2(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(qh2(i),qh2(i+vec2(1.0,0.0)),f.x),mix(qh2(i+vec2(0.0,1.0)),qh2(i+vec2(1.0,1.0)),f.x),f.y); }
float qh3(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float qn3(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(qh3(i),qh3(i+vec3(1.0,0.0,0.0)),f.x),mix(qh3(i+vec3(0.0,1.0,0.0)),qh3(i+vec3(1.0,1.0,0.0)),f.x),f.y),
             mix(mix(qh3(i+vec3(0.0,0.0,1.0)),qh3(i+vec3(1.0,0.0,1.0)),f.x),mix(qh3(i+vec3(0.0,1.0,1.0)),qh3(i+vec3(1.0,1.0,1.0)),f.x),f.y),f.z); }
float qGrime(vec3 w){
  float h=w.y; float u=w.x+w.z;
  float damp=1.0-smoothstep(0.0,1.1+0.9*qn2(vec2(u*0.6,w.y*0.3)),h);
  float streak=smoothstep(0.62,0.95,qn2(vec2(u*2.6,h*0.18)))*(0.4+0.6*qn2(vec2(u*0.7,h*1.3)));
  float bl=qn2(vec2(u,h)*0.45)*0.6+qn2(vec2(u,h)*1.3)*0.4;
  float g=0.45*damp+0.3*streak+0.3*smoothstep(0.55,0.9,bl);
  return clamp(uWeather*g*1.25,0.0,0.85);
}
`;
/* Parallax occlusion mapping. TBN rebuilt from screen-space derivatives (no tangents needed);
   fixed-iteration loop keeps control flow uniform so texture derivatives stay valid. */
const GLSL_POM=`
vec2 pUv=vUv;
{
  vec3 q0=dFdx(-vViewPosition); vec3 q1=dFdy(-vViewPosition);
  vec2 st0=dFdx(vUv); vec2 st1=dFdy(vUv);
  vec3 Np=normalize(vNormal)*(gl_FrontFacing?1.0:-1.0);
  vec3 q1p=cross(q1,Np); vec3 q0p=cross(Np,q0);
  vec3 Tp=q1p*st0.x+q0p*st1.x; vec3 Bp=q1p*st0.y+q0p*st1.y;
  float dt=max(dot(Tp,Tp),dot(Bp,Bp));
  if(dt>0.0){
    float sc=inversesqrt(dt); Tp*=sc; Bp*=sc;
    vec3 Vv=normalize(vViewPosition);
    vec3 Vt=vec3(dot(Tp,Vv),dot(Bp,Vv),dot(Np,Vv));
    float fadeP=1.0-smoothstep(10.0,40.0,length(vViewPosition));
    vec2 dUV=Vt.xy/max(Vt.z,0.3)*uPom*fadeP/16.0;
    vec2 uvP=vUv; float cur=0.0; float d=1.0-texture2D(heightMap,uvP).r;
    vec2 prv=uvP; float dPrev=d; float cPrev=0.0;
    for(int i=0;i<16;i++){
      float go=step(cur,d-0.0001);
      prv=mix(prv,uvP,go); dPrev=mix(dPrev,d,go); cPrev=mix(cPrev,cur,go);
      uvP-=dUV*go; cur+=go/16.0;
      d=mix(d,1.0-texture2D(heightMap,uvP).r,go);
    }
    float aft=d-cur; float bef=dPrev-cPrev;
    float wgt=clamp(aft/(aft-bef+0.00001),0.0,1.0);
    pUv=mix(uvP,prv,wgt);
  }
}
`;
const GLSL_WEATHER=`
{ float gk=qGrime(vWPos); diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.6,0.54,0.47),gk); }
`;
/* close-up micro bump: procedural world-space height, differentiated in screen space (bump-map style) */
const GLSL_DETAIL=`
{
  float fadeD=(1.0-smoothstep(3.0,16.0,length(vViewPosition)))*uDetail;
  vec3 pp=vWPos*9.0;
  float hN=qn3(pp)*0.6+qn3(pp*2.9)*0.3+qn3(pp*7.3)*0.1;
  vec3 dpx=dFdx(-vViewPosition); vec3 dpy=dFdy(-vViewPosition);
  float dhx=dFdx(hN); float dhy=dFdy(hN);
  vec3 R1=cross(dpy,normal); vec3 R2=cross(normal,dpx);
  float fDet=dot(dpx,R1);
  vec3 grad=sign(fDet)*(dhx*R1+dhy*R2);
  normal=normalize(mix(normal,normalize(abs(fDet)*normal-grad*0.006),fadeD));
}
`;
const GLSL_WATER=`
{
  vec2 wp=vWPos.xz; float tt=uTime;
  float c3=cos((wp.x+wp.y)*3.7-tt*2.1)*0.35; float c4=cos(wp.x*1.7-wp.y*2.9+tt*2.7);
  float gx=cos(wp.x*2.3+tt*1.6)*0.5+c3+c4*0.25;
  float gz=cos(wp.y*2.9-tt*1.3)*0.5+c3-c4*0.4;
  vec3 wn=normalize(vec3(-gx*0.12,1.0,-gz*0.12));
  normal=normalize((viewMatrix*vec4(wn,0.0)).xyz);
}
`;
function installShader(m){
  const ud=m.userData, pom=!!(ud.heightMap&&ud.pom>0), wth=!!ud.weather, det=!!ud.detail, wat=!!ud.water;
  if(!pom&&!wth&&!det&&!wat) return;
  m.onBeforeCompile=sh=>{
    sh.uniforms.uTime=SHU.uTime; sh.uniforms.uWeather=SHU.uWeather; sh.uniforms.uDetail=SHU.uDetail;
    if(pom){ sh.uniforms.heightMap={value:ud.heightMap}; sh.uniforms.uPom={value:ud.pom}; }
    sh.vertexShader='varying vec3 vWPos;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n\tvWPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
    let f='varying vec3 vWPos;\nuniform float uTime;\nuniform float uWeather;\nuniform float uDetail;\n'+(pom?'uniform sampler2D heightMap;\nuniform float uPom;\n':'')+GLSL_NOISE+sh.fragmentShader;
    if(det||wat) f=f.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+(wat?GLSL_WATER:GLSL_DETAIL));
    if(wth) f=f.replace('#include <color_fragment>','#include <color_fragment>\n'+GLSL_WEATHER);
    if(pom){
      f=f.replace('#include <map_fragment>',GLSL_POM+THREE.ShaderChunk.map_fragment.replace(/vUv/g,'pUv'));
      f=f.replace('#include <normal_fragment_maps>',THREE.ShaderChunk.normal_fragment_maps.replace(/vUv/g,'pUv'));
      f=f.replace('#include <roughnessmap_fragment>',THREE.ShaderChunk.roughnessmap_fragment.replace(/vUv/g,'pUv'));
    }
    sh.fragmentShader=f;
  };
  m.customProgramCacheKey=()=>'qf'+(pom?'p':'')+(wth?'w':'')+(det?'d':'')+(wat?'a':'');
  m.needsUpdate=true;
}
/* [normal strength, parallax depth in UV units, weathers] */
const NM_SPEC={floor:[0.9,0,1], floor0:[2.8,0.008,0], roof:[2.4,0.005,1], roof2:[2.8,0.009,1], wall:[2.4,0.005,1], wall2:[2.8,0.009,1], ablaq:[2.2,0.005,1], base:[3.0,0.009,1], trim:[0.9,0,1], stone:[2.4,0.006,1], stone2:[0.9,0,1],
  wood:[1.8,0,0], paint:[1.1,0,0], door:[2.6,0.008,0], tile:[2.6,0.006,0], band:[2.2,0,0], dome:[1.6,0,0], lead:[1.4,0,0], roofTile:[3.6,0.03,0],
  court:[2.8,0.008,0], thatch:[3.0,0,0], carpet:[0.8,0,0], lattice:[1.2,0,0], screen:[1.6,0,0], qamar:[1.0,0,0]};
const NM_CACHE=new WeakMap();   // canvas → normal/height maps already derived from it
function enhanceMats(M,st,fam,theta,q){
  const hpal={bg:'#3a3a3a',fill:'#3a3a3a',fill2:'#3a3a3a',a:'#3a3a3a',star:'#707070',star2:'#707070',strap:'#ffffff',edge:'#141414'};
  const tileH= HANKIN_FAM.has(fam)? drawHankin(fam,theta,hpal).c : null;
  const ablaqH= texAshlar('#9a9a9a',RNG('tex|'+st.id+'|ablaq'),10,null);
  for(const k in NM_SPEC){
    const m=M[k]; if(!m||!m.map||m.userData.enh) continue;
    const [ns,pom,wth]=NM_SPEC[k];
    let src=m.map.image; if(k==='ablaq') src=ablaqH; if((k==='tile'||(k==='dome'&&st.domeMat==='tile'))&&tileH) src=tileH;
    if(q>=1){
      const ck=ns+'|'+pom+'|'+q+'|'+m.map.repeat.x+','+m.map.repeat.y; let cache=NM_CACHE.get(src); if(!cache){ cache=new Map(); NM_CACHE.set(src,cache); }
      let e=cache.get(ck);
      if(!e){ const f=heightField(src,(k==='trim'||k==='floor'||k==='stone2'||k==='mud')?2:1);
        const nt=new THREE.CanvasTexture(normalCanvas(f,ns)); nt.wrapS=nt.wrapT=THREE.RepeatWrapping; nt.repeat.copy(m.map.repeat); nt.anisotropy=8; e={nt};
        if(q>=2&&pom>0){ const ht=new THREE.CanvasTexture(heightCanvas(f)); ht.wrapS=ht.wrapT=THREE.RepeatWrapping; ht.repeat.copy(m.map.repeat); e.ht=ht; }
        cache.set(ck,e); }
      m.normalMap=e.nt; m.normalScale=new THREE.Vector2(1,1);
      if(e.ht){ m.userData.heightMap=e.ht; m.userData.pom=pom; }
    }
    m.userData.weather=!!wth; m.userData.detail=q>=2&&!!wth;
    installShader(m); m.userData.enh=true;
  }
  M.water.userData.water=true; installShader(M.water);
  M.tile.envMapIntensity=1.3; M.dome.envMapIntensity=st.domeMat==='tile'?1.3:0.8; M.glass.envMapIntensity=1.6; M.water.envMapIntensity=1.5; M.metal.envMapIntensity=1.4;
}

/* ============================================================
   BUILDER — everything is merged into one mesh per material
   ============================================================ */
const WEATHER=new Set(['wall','wall2','ablaq','base','trim','stone','stone2','floor','roof','roof2']);
const JITTER=new Set([...WEATHER,'floor0','roofTile']);   // each module's own shade (see jitter in buildArchitecture)
const NOSHADOW=new Set(['lattice','screen','water','glow','glass','sglass','qamar','stained','void']);
const _M=()=>new THREE.Matrix4();
const mT=(x,y,z)=>_M().makeTranslation(x,y,z);
const mRX=a=>_M().makeRotationX(a), mRY=a=>_M().makeRotationY(a), mRZ=a=>_M().makeRotationZ(a);
const mS=(x,y,z)=>_M().makeScale(x,y,z);
function mm(...a){ const r=_M(); for(const m of a) if(m) r.multiply(m); return r; }
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);

class Builder{
  constructor(weather){ this.bk=new Map(); this.weather=weather||0; this.jit=[1,1,1]; this.lanterns=[]; this.tris=0; this.walkOn=false; this.walkT=[]; this.cid=0; this.grp=null; }
  // cid numbers top-level calls (a piece's 'object'); grp tags a run of them (a room's furniture) for culling
  // while walkOn is set, raw surfaces (roof planes) are also kept as walkable triangles in world space
  _walk(pos,M){ if(!this.walkOn) return; const e=M&&M.elements, W=this.walkT; for(let i=0;i+2<pos.length;i+=3){ const x=pos[i],y=pos[i+1],z=pos[i+2]; if(e) W.push(e[0]*x+e[4]*y+e[8]*z+e[12], e[1]*x+e[5]*y+e[9]*z+e[13], e[2]*x+e[6]*y+e[10]*z+e[14]); else W.push(x,y,z); } }
  add(k,g,M,uvfn){
    let G=g.index? g.toNonIndexed() : g; if(G!==g) g.dispose();
    if(uvfn){ const p=G.attributes.position; const uv=new THREE.BufferAttribute(new Float32Array(p.count*2),2);
      for(let i=0;i<p.count;i++){ const r=uvfn(p.getX(i),p.getY(i),p.getZ(i)); uv.setXY(i,r[0],r[1]); } G.setAttribute('uv',uv); }
    if(M) G.applyMatrix4(M);
    if(!G.attributes.normal) G.computeVertexNormals();
    const P=G.attributes.position.array, n=P.length/3;
    if(!n){ G.dispose(); return; }
    const N=G.attributes.normal.array, U=G.attributes.uv? G.attributes.uv.array : new Float32Array(n*2);
    const C=new Float32Array(n*3); const wk=WEATHER.has(k)?this.weather:0; const j=JITTER.has(k)?this.jit:[1,1,1];
    for(let i=0;i<n;i++){ const y=P[i*3+1]; const f=1-wk*(0.45*clamp(1-y/2.6,0,1)+0.07); C[i*3]=f*j[0]; C[i*3+1]=f*j[1]; C[i*3+2]=f*j[2]; }
    let b=this.bk.get(k); if(!b){ b={P:[],N:[],U:[],C:[],Q:[],G:[],A:[],n:0}; this.bk.set(k,b); }
    let x0=1e9,y0=1e9,z0=1e9,x1=-1e9,y1=-1e9,z1=-1e9; for(let i=0;i<P.length;i+=3){ const x=P[i],y=P[i+1],z=P[i+2]; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; if(z<z0)z0=z; if(z>z1)z1=z; }
    b.P.push(P); b.N.push(N); b.U.push(U); b.C.push(C); b.Q.push(this.cid); b.G.push(this.grp); b.A.push([x0,y0,z0,x1,y1,z1]); b.n+=n; this.tris+=n/3;
    G.dispose();
  }
  box(k,x0,y0,z0,x1,y1,z1,M){
    const ax=Math.min(x0,x1), bx=Math.max(x0,x1), ay=Math.min(y0,y1), by=Math.max(y0,y1), az=Math.min(z0,z1), bz=Math.max(z0,z1);
    if(bx-ax<1e-4||by-ay<1e-4||bz-az<1e-4) return;
    const g=new THREE.BoxGeometry(bx-ax,by-ay,bz-az); g.translate((ax+bx)/2,(ay+by)/2,(az+bz)/2);
    const p=g.attributes.position, n=g.attributes.normal, uv=g.attributes.uv;
    for(let i=0;i<p.count;i++){ const X=Math.abs(n.getX(i)), Y=Math.abs(n.getY(i)), Z=Math.abs(n.getZ(i));
      if(X>=Y&&X>=Z) uv.setXY(i,p.getZ(i),p.getY(i)); else if(Y>=Z) uv.setXY(i,p.getX(i),p.getZ(i)); else uv.setXY(i,p.getX(i),p.getY(i)); }
    this.add(k,g,M);
  }
  cyl(k,r0,r1,h,seg,M,open){
    if(h<1e-4) return;
    const g=new THREE.CylinderGeometry(r1,r0,h,seg,1,!!open); g.translate(0,h/2,0);
    const p=g.attributes.position, uv=g.attributes.uv, side=(seg+1)*2, circ=Math.PI*(r0+r1);
    for(let i=0;i<p.count;i++){ if(i<side) uv.setXY(i,uv.getX(i)*circ,p.getY(i)); else uv.setXY(i,p.getX(i),p.getZ(i)); }
    this.add(k,g,M);
  }
  cone(k,r,h,seg,M){ this.cyl(k,r,0,h,seg,M); }
  segCyl(k,p0,p1,r0,r1,seg){ const d=V3().subVectors(p1,p0); const L=d.length(); if(L<1e-4) return; const q=new THREE.Quaternion().setFromUnitVectors(V3(0,1,0),d.normalize()); this.cyl(k,r0,r1,L,seg,_M().compose(p0,q,V3(1,1,1))); }
  lathe(k,pts,seg,M){ const g=new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(Math.max(p[0],0),p[1])),seg); this.add(k,g,M); }
  sphere(k,r,M,ws=10,hs=7){ this.add(k,new THREE.SphereGeometry(r,ws,hs),M); }
  ico(k,r,M,det=1){ this.add(k,new THREE.IcosahedronGeometry(r,det),M); }
  torus(k,R,r,arc,M,rs=6,ts=16){ this.add(k,new THREE.TorusGeometry(R,r,rs,ts,arc),M); }
  shapeOf(outer,holes){ const s=new THREE.Shape(outer.map(p=>new THREE.Vector2(p[0],p[1]))); if(holes) for(const h of holes) s.holes.push(new THREE.Path(h.map(p=>new THREE.Vector2(p[0],p[1])))); return s; }
  ext(k,outer,holes,depth,M,uvfn){ if(!outer||outer.length<3||depth<=0) return; const g=new THREE.ExtrudeGeometry(this.shapeOf(outer,holes),{depth,bevelEnabled:false,steps:1,curveSegments:1}); this.add(k,g,M,uvfn); }
  flat(k,pts,M,uvfn){ if(!pts||pts.length<3) return; const g=new THREE.ShapeGeometry(this.shapeOf(pts)); this.add(k,g,M,uvfn); }
  rawN(k,pos,nrm,uvs,M){ if(!pos.length) return; this._walk(pos,M); const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2)); this.add(k,g,M||null); }
  // a smooth surface sampled on a grid G[row][col] = {p,n} (roof planes): top, optional underside dropped by th, and the eave edge strip
  grid(k,ku,G,th,M,us,edgeK,L0,S0){
    const nt=G.length-1, ns=G[0].length-1, pos=[],nrm=[],uv=[],pu=[],nu=[],uu=[];
    const push=(arr,narr,uarr,j,i,flip,dy)=>{ const v=G[j][i]; arr.push(v.p[0],v.p[1]-(dy||0),v.p[2]); const n=v.n; if(flip) narr.push(-n[0],-n[1],-n[2]); else narr.push(n[0],n[1],n[2]); uarr.push(L0[i]*us,S0[j]*us); };
    for(let j=0;j<nt;j++) for(let i=0;i<ns;i++){
      push(pos,nrm,uv,j,i); push(pos,nrm,uv,j,i+1); push(pos,nrm,uv,j+1,i+1); push(pos,nrm,uv,j,i); push(pos,nrm,uv,j+1,i+1); push(pos,nrm,uv,j+1,i);
      if(ku){ push(pu,nu,uu,j,i,true,th); push(pu,nu,uu,j+1,i+1,true,th); push(pu,nu,uu,j,i+1,true,th); push(pu,nu,uu,j,i,true,th); push(pu,nu,uu,j+1,i,true,th); push(pu,nu,uu,j+1,i+1,true,th); } }
    this.rawN(k,pos,nrm,uv,M);
    if(ku){ this.rawN(ku,pu,nu,uu,M);
      if(edgeK){ const ep=[], eu=[]; for(let i=0;i<ns;i++){ const a=G[0][i].p, b=G[0][i+1].p;
          ep.push(a[0],a[1],a[2], b[0],b[1],b[2], b[0],b[1]-th,b[2], a[0],a[1],a[2], b[0],b[1]-th,b[2], a[0],a[1]-th,a[2]); eu.push(L0[i],0,L0[i+1],0,L0[i+1],th, L0[i],0,L0[i+1],th,L0[i],th); }
        this.raw(edgeK,ep,eu,M); } }
  }
  raw(k,pos,uvs,M){ if(!pos.length) return; this._walk(pos,M); const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs||new Array(pos.length/3*2).fill(0),2)); g.computeVertexNormals(); this.add(k,g,M||null); }
  finish(mats,opts){
    if(opts) return cullFinish(this,mats,opts);   // split for culling (p5f_cull.js)
    const grp=new THREE.Group();
    for(const [k,b] of this.bk){
      if(!b.n) continue;
      const cat=(arrs,len)=>{ const o=new Float32Array(len); let off=0; for(const a of arrs){ o.set(a,off); off+=a.length; } return o; };
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.BufferAttribute(cat(b.P,b.n*3),3));
      g.setAttribute('normal',new THREE.BufferAttribute(cat(b.N,b.n*3),3));
      g.setAttribute('uv',new THREE.BufferAttribute(cat(b.U,b.n*2),2));
      g.setAttribute('color',new THREE.BufferAttribute(cat(b.C,b.n*3),3));
      g.computeBoundingSphere();
      const mesh=new THREE.Mesh(g,mats[k]||mats.wall); mesh.castShadow=!NOSHADOW.has(k); mesh.receiveShadow=true; mesh.name=k;
      grp.add(mesh);
    }
    return grp;
  }
}

/* ---------- levels of detail ----------
   While the full building is made, every top-level primitive call is recorded (with its colour jitter). A lower level replays
   the record into a fresh builder: parts too small to read at that distance are dropped (by their middle dimension, so a long
   thin rail goes before a broad panel), round things get fewer sides, roof grids are thinned, and the coarsest level closes
   window holes and drops thin facing layers (frames, bands, panels). */
// a lathe over part of the turn (a broken dome's sector)
Builder.prototype.latheArc=function(k,pts,seg,M,p0,pl){ const g=new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(Math.max(p[0],0),p[1])),seg,p0,pl); this.add(k,g,M); };
const REC_METHODS=['box','cyl','cone','segCyl','lathe','latheArc','sphere','ico','torus','ext','flat','rawN','raw','grid'];
const cloneArg=v=>(v instanceof THREE.Matrix4||v instanceof THREE.Vector3)? v.clone() : v;
// a ruin queues each top-level call for its decay filter; what comes out of it is what is built and recorded
for(const m of REC_METHODS){ const f=Builder.prototype[m];
  Builder.prototype[m]=function(...a){
    if(this.ruin&&!this._d&&!this._rk){ this.ruin.Q.push([m,a.map(cloneArg),this.jit,this.walkOn,this.grp]); return; }   // decayed later, from the ground up (ruinFlush)
    if(!this._d){ this.cid++; if(this.rec) this.rec.push([m,a.map(cloneArg),this.jit,this.grp]); } this._d=(this._d||0)+1; try{ return f.apply(this,a); } finally{ this._d--; } }; }
const LODP=[null,
  {b:0.05, c:2.0, b2:0.02, seg:0.6,  grid:2, hole:0,    tol:0.015},
  {b:0.17, c:2.5, b2:0.07, seg:0.45, grid:3, hole:0.45, tol:0.05},
  {b:0.55, c:3.0, b2:0.2,  seg:0.3,  grid:6, hole:1e9,  tol:0.15, thin:0.12}];
// Douglas–Peucker on a closed outline: arches and cusps lose points they no longer need at that distance
function simplifyRing(pts,tol){ const n=pts.length; if(n<6||!tol) return pts;
  let far=0, fd=-1; for(let i=1;i<n;i++){ const d=Math.hypot(pts[i][0]-pts[0][0],pts[i][1]-pts[0][1]); if(d>fd){ fd=d; far=i; } }
  const keep=new Uint8Array(n); keep[0]=keep[far]=1;
  const go=(i0,i1)=>{ const A=pts[i0%n], B=pts[i1%n], dx=B[0]-A[0], dy=B[1]-A[1], L=Math.hypot(dx,dy)||1e-9; let md=-1, mi=-1;
    for(let i=i0+1;i<i1;i++){ const P=pts[i%n], d=Math.abs((P[0]-A[0])*dy-(P[1]-A[1])*dx)/L; if(d>md){ md=d; mi=i; } }
    if(md>tol){ keep[mi%n]=1; go(i0,mi); go(mi,i1); } };
  go(0,far); go(far,n);
  const o=pts.filter((_,i)=>keep[i]); return o.length>=3? o : pts; }
// does a closed outline cross itself? (a simplified ruin skyline can fold over a notch)
function ringSelfX(P){ const n=P.length, X=(a,b,c,d)=>{ const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]); const d1=o(c,d,a), d2=o(c,d,b), d3=o(a,b,c), d4=o(a,b,d); return ((d1>1e-9&&d2<-1e-9)||(d1<-1e-9&&d2>1e-9))&&((d3>1e-9&&d4<-1e-9)||(d3<-1e-9&&d4>1e-9)); };
  for(let i=0;i<n;i++) for(let j=i+2;j<n;j++){ if(i===0&&j===n-1) continue; if(X(P[i],P[(i+1)%n],P[j],P[(j+1)%n])) return true; } return false; }
const simplifySafe=(P,tol)=>{ const o=simplifyRing(P,tol); return o!==P&&o.length<64&&ringSelfX(o)? P : o; };
function mScale(M){ if(!M) return 1; const e=M.elements; return Math.max(Math.hypot(e[0],e[1],e[2]),Math.hypot(e[4],e[5],e[6]),Math.hypot(e[8],e[9],e[10])); }
function bb2(pts){ let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for(const p of pts){ if(p[0]<x0) x0=p[0]; if(p[0]>x1) x1=p[0]; if(p[1]<y0) y0=p[1]; if(p[1]>y1) y1=p[1]; } return [x1-x0,y1-y0]; }
function replayLOD(rec,lv){
  const P=LODP[lv], B=new Builder(rec.weather||0);
  const keep=(d,sc)=>{ d=d.map(v=>Math.abs(v)*(sc||1)).sort((a,b)=>a-b); return d[1]>=P.b||(d[2]>=P.c&&d[1]>=P.b2); };
  const sg=(n,min)=>n<=min? n : Math.max(min,Math.round(n*P.seg));
  const thin=(n,st)=>{ const o=[]; for(let i=0;i<n;i+=st) o.push(i); o.push(n); return o; };
  for(const [m,a,j,g] of rec){ B.jit=j; B.grp=g||null; const k=a[0];
    switch(m){
      case 'box': { if(keep([a[4]-a[1],a[5]-a[2],a[6]-a[3]],mScale(a[7]))) B.box(...a); break; }
      case 'cyl': { const [,r0,r1,h,seg,M,open]=a, r=2*Math.max(r0,r1); if(keep([r,r,h],mScale(M))) B.cyl(k,r0,r1,h,sg(seg,6),M,open); break; }
      case 'cone': { const [,r,h,seg,M]=a; if(keep([2*r,2*r,h],mScale(M))) B.cone(k,r,h,sg(seg,6),M); break; }
      case 'segCyl': { const [,p0,p1,r0,r1,seg]=a, r=2*Math.max(r0,r1); if(keep([r,r,Math.hypot(p0.x-p1.x,p0.y-p1.y,p0.z-p1.z)])) B.segCyl(k,p0,p1,r0,r1,sg(seg,4)); break; }
      case 'lathe': { const [,pts,seg,M]=a; let r=0,y0=1e9,y1=-1e9; for(const p of pts){ r=Math.max(r,p[0]); y0=Math.min(y0,p[1]); y1=Math.max(y1,p[1]); } if(keep([2*r,2*r,y1-y0],mScale(M))) B.lathe(k,pts,sg(seg,6),M); break; }
      case 'sphere': { const [,r,M,ws=10,hs=7]=a; if(keep([2*r,2*r,2*r],mScale(M))) B.sphere(k,r,M,sg(ws,5),sg(hs,4)); break; }
      case 'ico': { const [,r,M,det=1]=a; if(keep([2*r,2*r,2*r],mScale(M))) B.ico(k,r,M,lv>=2?0:det); break; }
      case 'torus': { const [,R,r,arc,M,rs=6,ts=16]=a; if(keep([2*(R+r),2*(R+r),2*r],mScale(M))) B.torus(k,R,r,arc,M,sg(rs,3),sg(ts,6)); break; }
      case 'ext': { const [,outer,holes,depth,M,uvfn]=a; if(!outer||outer.length<3) break; const [w,h]=bb2(outer), sc=mScale(M);
        if(!keep([w,h,depth],sc)) break; if(P.thin&&depth*sc<P.thin&&Math.min(w,h)*sc<2) break;
        const hs=holes&&holes.filter(hl=>{ const [hw,hh]=bb2(hl); return hw*hh*sc*sc>=P.hole; }).map(hl=>simplifyRing(hl,P.tol/sc));
        B.ext(k,simplifySafe(outer,P.tol/sc),hs&&hs.length?hs:null,depth,M,uvfn); break; }
      case 'flat': { const [,pts,M,uvfn]=a; if(!pts||pts.length<3) break; const [w,h]=bb2(pts), sc=mScale(M); if(keep([w,h,0],sc)) B.flat(k,simplifyRing(pts,P.tol/sc),M,uvfn); break; }
      case 'grid': { const [,ku,G,th,M,us,edgeK,L0,S0]=a, R=thin(G.length-1,P.grid), C=thin(G[0].length-1,P.grid);
        B.grid(k,ku,R.map(jj=>C.map(ii=>G[jj][ii])),th,M,us,edgeK,C.map(ii=>L0[ii]),R.map(jj=>S0[jj])); break; }
      default: B[m](...a);
    } }
  return B;
}

/* ============================================================
   ARCHES, OPENINGS, FRAMES
   ============================================================ */
function archRise(type,w){
  switch(type){
    case 'flat': return 0;
    case 'round': return w/2;
    case 'pointed': { const R=0.8*w; return R*Math.sin(Math.acos((w/2-R)/R)); }
    case 'fourc': return 0.52*w;
    case 'keel': return 0.6*w;
    case 'triangle': return 0.42*w;
    case 'horseshoe': return 0.62*w;
    case 'cusped': return 0.55*w;
    case 'moon': { const dl=MOON_DL; return w*(Math.tan(dl)+1/Math.cos(dl))/2; }
    case 'corbel': return 0.7*w;
    case 'trap': return 2*w;
  }
  return w/2;
}
const MOON_DL=0.78;
/* how far an arch bulges past its springing points (moon gates are wider than their sill) */
const archSpread=(type,w)=>type==='moon'? w*(1/Math.cos(MOON_DL)-1)/2 : type==='horseshoe'? w*(1/Math.cos(0.42)-1)/2 : 0;
function bez(p0,p1,p2,p3,t){ const u=1-t; return [u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0], u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]]; }
function archPts(type,u0,u1,vs,seg=12){
  const w=u1-u0, m=(u0+u1)/2;
  switch(type){
    case 'flat': return [[u0,vs],[u1,vs]];
    case 'triangle': return [[u0,vs],[m,vs+0.42*w],[u1,vs]];
    case 'corbel': return [[u0,vs],[u0+0.36*w,vs+0.7*w],[u1-0.36*w,vs+0.7*w],[u1,vs]];
    case 'trap': return [[u0,vs],[u0+0.17*w,vs+2*w],[u1-0.17*w,vs+2*w],[u1,vs]];   // Inca: jambs leaning in to a narrow lintel   // Maya corbel vault: straight-sided, capped by a flat slab
    case 'round': { const o=[]; for(let i=0;i<=seg;i++){ const a=Math.PI*(1-i/seg); o.push([m+Math.cos(a)*w/2, vs+Math.sin(a)*w/2]); } return o; }
    case 'pointed': { const R=0.8*w, aA=Math.acos((w/2-R)/R), h=seg>>1, o=[];
      for(let i=0;i<=h;i++){ const a=Math.PI-(Math.PI-aA)*i/h; o.push([u0+R+R*Math.cos(a), vs+R*Math.sin(a)]); }
      for(let i=1;i<=h;i++){ const a=(Math.PI-aA)*(1-i/h); o.push([u1-R+R*Math.cos(a), vs+R*Math.sin(a)]); }
      return o; }
    case 'horseshoe': case 'moon': { const dl=type==='moon'?MOON_DL:0.42, rr=w/(2*Math.cos(dl)), cy=vs+rr*Math.sin(dl), o=[], n=type==='moon'?Math.max(seg,28):seg;
      for(let i=0;i<=n;i++){ const a=(Math.PI+dl)-(Math.PI+2*dl)*i/n; o.push([m+rr*Math.cos(a), cy+rr*Math.sin(a)]); } return o; }
    case 'cusped': { // a multifoil arch: five lobes on a slightly stilted semicircle
      const R=w/2, n=Math.max(seg,32), o=[];
      for(let i=0;i<=n;i++){ const a=Math.PI*(1-i/n), r=R*(1-0.1*(1-Math.abs(Math.cos(4*a)))); o.push([m+Math.cos(a)*r, vs+Math.sin(a)*r*1.1]); }
      o[0]=[u0,vs]; o[n]=[u1,vs]; return o; }
    default: { // fourc, keel
      const r=archRise(type,w), h=seg>>1;
      const P0=[u0,vs], P3=[m,vs+r];
      const P1= type==='keel'? [u0,vs+0.62*r] : [u0,vs+0.55*r];
      const P2= type==='keel'? [u0+0.12*w,vs+0.86*r] : [m-0.18*w,vs+0.82*r];
      const L=[]; for(let i=0;i<=h;i++) L.push(bez(P0,P1,P2,P3,i/h));
      const R=[]; for(let i=h-1;i>=0;i--) R.push([2*m-L[i][0], L[i][1]]);
      return L.concat(R); }
  }
}
function dedupe(pts){ const o=[]; for(const p of pts){ const q=o[o.length-1]; if(!q||Math.abs(q[0]-p[0])>1e-4||Math.abs(q[1]-p[1])>1e-4) o.push(p); } while(o.length>2){ const a=o[0], b=o[o.length-1]; if(Math.abs(a[0]-b[0])<1e-4&&Math.abs(a[1]-b[1])<1e-4) o.pop(); else break; } return o; }
/* keep the part of a polygon with a ≤ x ≤ b (used to split an arched opening into two door leaves) */
function clipX(poly,a,b){
  const cut=(P,x0,keepHi)=>{ const o=[]; for(let i=0;i<P.length;i++){ const p=P[i], q=P[(i+1)%P.length];
    const pin=keepHi? p[0]>=x0-1e-6 : p[0]<=x0+1e-6, qin=keepHi? q[0]>=x0-1e-6 : q[0]<=x0+1e-6;
    if(pin) o.push(p); if(pin!==qin){ const t=(x0-p[0])/(q[0]-p[0]); o.push([x0,p[1]+(q[1]-p[1])*t]); } } return o; };
  return dedupe(cut(cut(poly,a,true),b,false));
}
const openTop=o=>o.vs+archRise(o.arch,o.u1-o.u0);
function openPoly(o){ return dedupe([[o.u0,o.v0],[o.u1,o.v0],...archPts(o.arch,o.u0,o.u1,o.vs).reverse()]); }
function ringPoly(arch,u0,u1,v0,vs,fw){
  const fl=(arch==='flat');
  const outer=[[u0-fw,v0],...archPts(arch,u0-fw,u1+fw,vs+(fl?fw:0)),[u1+fw,v0]];
  const inner=[[u1,v0],...archPts(arch,u0,u1,vs).reverse(),[u0,v0]];
  return dedupe(outer.concat(inner));
}
function resample(pts,n){
  const L=[0]; for(let i=1;i<pts.length;i++) L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const T=L[L.length-1], o=[]; let j=0;
  for(let k=0;k<=n;k++){ const s=T*k/n; while(j<L.length-2&&L[j+1]<s) j++; const t=(s-L[j])/Math.max(1e-6,L[j+1]-L[j]); o.push([lerp(pts[j][0],pts[j+1][0],t),lerp(pts[j][1],pts[j+1][1],t)]); }
  return o;
}

/* face frame: local u along the wall (viewer's right), v = world height, w = outward from the wall's outer face */
function fr(cx,cz,d,delta=0,half=CW/2){
  const nx=DIRS[d][0], nz=DIRS[d][1], rx=nz, rz=-nx;
  const off=nx*cx+nz*cz+half+delta, rc=rx*cx+rz*cz;
  const M=_M().set(rx,0,nx,nx*off, 0,1,0,(d&1)*FR_LIFT, rz,0,nz,nz*off, 0,0,0,1);
  return {M,uA:rc-half,uB:rc+half,d,off,mid:rc};
}
const atF=(F,u,v,w)=>mm(F.M,mT(u,v,w));
const atW=(F,u,v,w)=>V3(u,v,w).applyMatrix4(F.M);

/* ---------- muqarnas: corbelled tiers of small cells stepping forward as they rise ---------- */
function muqarnas(B,F,a,b,vBase,vTop,wBack,D,tiers,mA,mB){
  tiers=tiers||5; const hT=(vTop-vBase)/tiers;
  for(let j=0;j<tiers;j++){
    const m=3+j*2, cw=(b-a)/m, w0=wBack+D*j/tiers, w1=wBack+D*(j+1)/tiers, v0=vBase+j*hT;
    for(let i=0;i<m;i++){ const u=a+i*cw, k=(i+j)%2?mA:mB;
      B.box(k,u+0.015,v0,w0,u+cw-0.015,v0+hT,w1,F.M);
      B.cyl(k,cw*0.34,0.005,hT*0.6,4,mm(F.M,mT(u+cw/2,v0,w1-cw*0.3),mRX(Math.PI),mRY(Math.PI/4))); }
  }
}

/* ---------- small shared greebles ---------- */
function lantern(B,F,u,v,w){
  const M=atF(F,u,v,w);
  B.box('iron',-0.02,0,0, 0.02,0.035,0.42, M);
  B.box('iron',-0.012,-0.12,0.4, 0.012,0.0,0.43, M);
  B.cyl('metal',0.09,0.12,0.05,6,mm(M,mT(0,-0.48,0.42)));
  B.cyl('glow',0.11,0.11,0.24,6,mm(M,mT(0,-0.43,0.42)));
  B.cyl('metal',0.13,0.015,0.17,6,mm(M,mT(0,-0.19,0.42)));
  B.lanterns.push(V3(0,-0.3,0.7).applyMatrix4(M));
}
function hangLamp(B,x,y,z){
  B.cyl('iron',0.008,0.008,0.6,4,mT(x,y-0.6,z));
  B.cyl('metal',0.14,0.02,0.16,8,mT(x,y-0.75,z));
  B.cyl('glow',0.12,0.12,0.26,8,mT(x,y-1.01,z));
  B.cyl('metal',0.08,0.13,0.06,8,mT(x,y-1.07,z));
  B.lanterns.push(V3(x,y-0.9,z));
}
function alem(B,x,y,z,s=1){
  B.cyl('metal',0.03*s,0.03*s,0.7*s,6,mT(x,y,z));
  B.sphere('metal',0.13*s,mT(x,y+0.22*s,z),8,6); B.sphere('metal',0.09*s,mT(x,y+0.45*s,z),8,6);
  B.torus('metal',0.2*s,0.035*s,Math.PI*1.45,mm(mT(x,y+0.8*s,z),mRZ(Math.PI*0.775)),5,14);
}
function palm(B,x,z,y,h,rng){
  const a=rng.f()*6.283, lean=rng.range(0.15,0.7); let p=V3(x,y,z); const segs=6;
  for(let i=1;i<=segs;i++){ const t=i/segs; const q=V3(x+Math.cos(a)*lean*t*t*1.6, y+h*t, z+Math.sin(a)*lean*t*t*1.6); B.segCyl('trunk',p,q,0.24-0.06*t,0.22-0.06*t,7); p=q; }
  const top=p, pos=[], uvs=[];
  const fronds=13;
  for(let f=0;f<fronds;f++){ const fa=f/fronds*6.283+rng.f()*0.3, up=rng.range(-0.1,0.5), L=rng.range(2.2,3.0), dx=Math.cos(fa), dz=Math.sin(fa), px=-dz, pz=dx;
    let prev=null; const S=6;
    for(let s=0;s<=S;s++){ const t=s/S, dist=L*t, wdt=0.42*Math.sin(Math.PI*Math.min(t*1.15,1))+0.03, yy=top.y+up*t*1.4-t*t*1.6;
      const cxp=top.x+dx*dist, czp=top.z+dz*dist; const l=[cxp+px*wdt,yy,czp+pz*wdt], r=[cxp-px*wdt,yy-0.05,czp-pz*wdt], c=[cxp,yy+0.06,czp];
      if(prev){ pos.push(...prev.l,...l,...prev.c, ...prev.c,...l,...c, ...prev.c,...c,...prev.r, ...prev.r,...c,...r); }
      prev={l,r,c}; } }
  B.raw('leaf',pos);
  for(let i=0;i<5;i++) B.sphere('fruit',0.09,mT(top.x+rng.range(-.25,.25),top.y-0.25,top.z+rng.range(-.25,.25)),6,4);
}
function cypress(B,x,z,y,h){ B.cyl('trunk',0.12,0.1,0.6,6,mT(x,y,z)); B.lathe('leaf2',[[0,0],[0.5,0.08],[0.72,0.25],[0.66,0.55],[0.42,0.82],[0,1]].map(p=>[p[0]*h*0.16,p[1]*h]),10,mT(x,y+0.4,z)); }
function citrus(B,x,z,y,rng){ B.cyl('trunk',0.12,0.08,1.3,6,mT(x,y,z)); for(let i=0;i<4;i++) B.ico('leaf',rng.range(0.6,0.85),mT(x+rng.range(-.5,.5),y+1.7+rng.range(-.2,.4),z+rng.range(-.5,.5)),1); for(let i=0;i<9;i++) B.sphere('fruit',0.07,mT(x+rng.range(-.9,.9),y+rng.range(1.2,2.3),z+rng.range(-.9,.9)),6,4); }
function plane(B,x,z,y,rng){ B.cyl('trunk',0.32,0.22,3.4,8,mT(x,y,z)); for(let i=0;i<6;i++) B.ico('leaf',rng.range(1.3,1.9),mT(x+rng.range(-1.2,1.2),y+4+rng.range(-.3,1.3),z+rng.range(-1.2,1.2)),1); }
function tree(B,kind,x,z,y,rng){ if(kind==='palm') palm(B,x,z,y,rng.range(5.5,8),rng); else if(kind==='cypress') cypress(B,x,z,y,rng.range(5,7.5)); else if(kind==='plane') plane(B,x,z,y,rng); else citrus(B,x,z,y,rng); }
function jar(B,x,y,z,s=1){ B.lathe('clay',[[0,0],[0.17,0.02],[0.29,0.22],[0.31,0.42],[0.22,0.66],[0.12,0.74],[0.15,0.8],[0.13,0.82],[0,0.8]].map(p=>[p[0]*s,p[1]*s]),12,mT(x,y,z)); }
function ropeBed(B,x,y,z,a){ const M=mm(mT(x,y,z),mRY(a)); B.box('wood',-0.95,0.36,-0.45,0.95,0.44,0.45,M); B.box('fabric',-0.9,0.44,-0.4,0.9,0.5,0.4,M); for(const sx of[-0.9,0.86]) for(const sz of[-0.42,0.38]) B.box('wood',sx,0,sz,sx+0.05,0.36,sz+0.05,M); }
function pottedPlant(B,x,y,z,rng){ B.cyl('clay',0.16,0.22,0.36,8,mT(x,y,z)); B.ico('leaf',rng.range(0.25,0.4),mT(x,y+0.55,z),1); }
