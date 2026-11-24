
/* ============================================================
   FURNITURE & DÉCOR — a parametric furniture library in the spirit of Furniture Forge:
   families (seating, tables, beds, storage, kitchen kit, shrine kit, lighting, wall décor, floor cover),
   each piece assembled from parts (legs, aprons, tops, panels, cushions, hardware) and dressed per tradition.
   Every generator builds in a local frame: origin at the centre of its footprint on the floor, x across its
   width W, z through its depth D with +z facing into the room, y up.
   ============================================================ */
// furnishing culture of each tradition: how people sit, sleep, cook and worship
const FURN_CAT={najdi:'me',hejazi:'me',sanaani:'me',isfahani:'me',yazdi:'me',mamluk:'me',ottoman:'me',levantine:'me',khaleeji:'me',
  siheyuan:'cn',jiangnan:'cn',kyoto:'jp',hanok:'kr',haveli:'in',newar:'in',tibetan:'tb',thai:'sea',bali:'sea',
  roman:'rom',turkish:'me',victorian:'eu',cycladic:'eu',tudor:'eu',russian:'eu',sahel:'in',maya:'sea',pueblo:'sea',palau:'sea'};
const FURN_SEAT={najdi:'majlis',hejazi:'majlis',sanaani:'majlis',khaleeji:'majlis',yazdi:'majlis',isfahani:'sedir',mamluk:'sedir',ottoman:'sedir',levantine:'sedir',turkish:'sedir'};
// textile palettes: cushion, cushion accent, rug [ground, border, motif, highlight]
const FURN_PAL={
  najdi:['#8e2b24','#d9c39a',['#7c1f1a','#20304a','#d8b878','#e9dcc0']], hejazi:['#7b2e3a','#d8c7a6',['#6b2230','#2a3a5a','#d6b06a','#efe4cc']],
  sanaani:['#9a3b26','#2a6b5c',['#8a2e20','#1f4f48','#d9a441','#ead9b8']], isfahani:['#1f4e7a','#c79a3c',['#8a1f22','#1d3a64','#e2c27a','#f0e6cf']],
  yazdi:['#8a3a2a','#cbb48c',['#7a2a1e','#2f3f5a','#cfa864','#ecdcbc']], mamluk:['#6b2a20','#c9a85c',['#5a1e18','#2c3446','#c9a85c','#e8d8b4']],
  ottoman:['#8a1f2b','#d9b45a',['#8a1f2b','#1d3554','#d9b45a','#f1e6cc']], levantine:['#2f4f3f','#c7a25e',['#7a2622','#24384f','#c7a25e','#eee2c6']],
  khaleeji:['#a3301f','#e2cfa5',['#8f2a1a','#1f3a52','#e0b866','#f1e4c8']],
  siheyuan:['#8f1e1c','#c9a33b',['#2f3e63','#8f1e1c','#c9a33b','#efe3c4']], jiangnan:['#2f4f5f','#c9b48a',['#3e4d5e','#7d2a22','#c9b48a','#ece4d2']],
  kyoto:['#2b3a55','#b9a77d',['#2b3a55','#6b3a2a','#b9a77d','#e9e1cc']], hanok:['#3c6e5a','#c94a3a',['#2f5f4f','#c94a3a','#e3c25c','#efe7d4']],
  haveli:['#f1ece0','#b8322a',['#9c2a22','#e2a33a','#24497a','#f3e3bf']], newar:['#7a2a1e','#c9a050',['#7a2a1e','#2f2f4a','#c9a050','#ead7b0']],
  tibetan:['#8f2a1f','#e2b23a',['#8f2a1f','#2b5d8a','#e2b23a','#f1e6cc']], thai:['#b03a2e','#d4a93b',['#7a2a22','#2c5f8a','#d4a93b','#efe2b8']],
  bali:['#6d4a2a','#c9a24a',['#6d4a2a','#3f5a3a','#c9a24a','#ece0c4']],
  roman:['#8f2f24','#d9b56c',['#8f2f24','#2b2622','#d9b56c','#efe6d2']], turkish:['#8a1f2b','#e2c27a',['#8a1f2b','#23406a','#e2c27a','#f1e6cc']],
  victorian:['#5a2434','#c9a45c',['#6b1f24','#1f3350','#c9a45c','#eadcc0']], cycladic:['#1f5fa8','#efe9dc',['#1f5fa8','#c2462c','#efe9dc','#e2b13c']],
  tudor:['#6b2a1e','#3d4f2f',['#6b2a1e','#2a3550','#b8923c','#e4d5b0']], russian:['#b0302a','#e9e2d0',['#b0302a','#2a5b8a','#e2b13c','#efe6d2']],
  sahel:['#3a5a8a','#d9b56c',['#8a2e1e','#1f1a16','#d9b56c','#efe2c4']], maya:['#a7432f','#e8dfc8',['#a7432f','#1f1a16','#d9a441','#efe6d2']],
  pueblo:['#2f6f8f','#c2462c',['#8a2e1e','#1f3a52','#d9a441','#efe2c4']], palau:['#8a6a3a','#c9a06a',['#8a6a3a','#1f1a16','#c9a06a','#efe6d2']]};
// woven floor rug: field, border bands, a medallion and scattered guls
function texRug(p,rng){ const W=256,H=384, c=cvs(W,H), g=c.getContext('2d'); const [a,b,m,h]=p;
  g.fillStyle=b; g.fillRect(0,0,W,H); g.fillStyle=h; g.fillRect(10,10,W-20,H-20); g.fillStyle=b; g.fillRect(16,16,W-32,H-32); g.fillStyle=a; g.fillRect(30,30,W-60,H-60);
  for(let x=20;x<W-20;x+=14){ g.fillStyle=m; g.fillRect(x,20,6,6); g.fillRect(x,H-26,6,6); } for(let y=20;y<H-20;y+=14){ g.fillStyle=m; g.fillRect(20,y,6,6); g.fillRect(W-26,y,6,6); }
  for(let y=50;y<H-40;y+=36) for(let x=50;x<W-40;x+=36){ g.fillStyle=(x+y)%72?m:h; g.beginPath(); g.moveTo(x,y-7); g.lineTo(x+7,y); g.lineTo(x,y+7); g.lineTo(x-7,y); g.fill(); }
  g.fillStyle=b; g.beginPath(); g.moveTo(W/2,H/2-90); g.lineTo(W/2+64,H/2); g.lineTo(W/2,H/2+90); g.lineTo(W/2-64,H/2); g.fill();
  g.fillStyle=m; g.beginPath(); g.moveTo(W/2,H/2-56); g.lineTo(W/2+38,H/2); g.lineTo(W/2,H/2+56); g.lineTo(W/2-38,H/2); g.fill();
  g.fillStyle=h; g.beginPath(); g.arc(W/2,H/2,12,0,Math.PI*2); g.fill(); return c; }
// two tatami (0.9 × 1.8 m each) laid side by side: rush weave and black cloth edges
function texTatami(rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle='#b9b27a'; g.fillRect(0,0,W,W);
  for(let y=0;y<W;y+=3){ g.fillStyle=`rgba(${rng.chance(.5)?'90,85,40':'230,220,160'},${rng.range(.08,.2)})`; g.fillRect(0,y,W,1.5); }
  g.fillStyle='#22201c'; g.fillRect(0,0,7,W); g.fillRect(W/2-3,0,7,W); g.fillRect(W-4,0,4,W); return c; }
// woven reed or pandanus mat
function texMat(rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle='#b89a62'; g.fillRect(0,0,W,W);
  for(let y=0;y<W;y+=16) for(let x=0;x<W;x+=16){ const o=((x+y)/16)%2; g.fillStyle=o?'rgba(120,90,45,.35)':'rgba(240,215,160,.35)'; if(o) g.fillRect(x+1,y+3,14,10); else g.fillRect(x+3,y+1,10,14); }
  g.strokeStyle='rgba(90,60,30,.5)'; g.lineWidth=6; g.strokeRect(3,3,W-6,W-6); return c; }
// oiled-paper ondol floor: warm yellow sheets with faint seams
function texOndol(rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle='#d8b56a'; g.fillRect(0,0,W,W);
  for(let i=0;i<500;i++){ g.fillStyle=`rgba(${rng.chance(.5)?'150,100,40':'250,220,150'},.06)`; g.fillRect(rng.f()*W,rng.f()*W,rng.range(4,30),rng.range(2,10)); }
  g.strokeStyle='rgba(120,80,30,.35)'; g.lineWidth=1.5; for(let k=0;k<=W;k+=W/4){ g.beginPath(); g.moveTo(k,0); g.lineTo(k,W); g.moveTo(0,k); g.lineTo(W,k); g.stroke(); } return c; }
function furnMats(M,st,std,rng){
  const p=FURN_PAL[st.id]||FURN_PAL.najdi;
  M.cushion=std({color:lc(p[0]), roughness:0.95}); M.cushion2=std({color:lc(p[1]), roughness:0.95});
  M.linen=std({color:lc('#ece6d8'), roughness:0.95}); M.porcelain=std({color:lc('#eef0f2'), roughness:0.25});
  M.blueware=std({color:lc('#2f4f8a'), roughness:0.3}); M.lacquer=std({color:lc(FURN_CAT[st.id]==='jp'?'#1d1714':'#7a1d16'), roughness:0.35});
  M.rug=std({map:mkTex(texRug(p[2],rng),1,1), roughness:1}); M.tatami=std({map:mkTex(texTatami(rng),1.8,1.8), roughness:0.9});
  M.mat=std({map:mkTex(texMat(rng),0.9,0.9), roughness:0.95}); M.ondol=std({map:mkTex(texOndol(rng),1.6,1.6), roughness:0.6});
  // wet rooms and built-ins: polished chrome, painted joinery, glazed tiles (square field tiles, or period encaustic-look squares)
  M.chrome=std({color:lc('#d4d8dc'), metalness:0.9, roughness:0.18}); M.sglass=std({color:lc('#cfe3e2'), roughness:0.05, metalness:0.1, transparent:true, opacity:0.22, depthWrite:false}); M.joinery=std({color:lc('#ebe5d8'), roughness:0.55});
  M.btile=std({map:mkTex(texBathTile(rng),0.6,0.6), roughness:0.25}); M.ftile=std({map:mkTex(texFloorTile(st,rng),1.2,1.2), roughness:0.45});
}
// glazed wall tiles: 10 cm squares, a hair of colour variation, grey grout
function texBathTile(rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle='#b9bcbd'; g.fillRect(0,0,W,W); const n=6, s=W/n;
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const v=Math.round(236+rng.range(-6,6)); g.fillStyle=`rgb(${v},${v+2},${v+3})`; g.fillRect(i*s+2,j*s+2,s-4,s-4); g.fillStyle='rgba(255,255,255,.35)'; g.fillRect(i*s+4,j*s+4,s-14,3); }
  return c; }
// wet-room floor: two-tone squares set on the diagonal, in the house's own trim and stone colours
function texFloorTile(st,rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle='#8a8a86'; g.fillRect(0,0,W,W); const n=4, s=W/n;
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){ g.fillStyle=(i+j)%2? st.trim : st.stone; g.fillRect(i*s+1.5,j*s+1.5,s-3,s-3);
    g.fillStyle=`rgba(0,0,0,${rng.range(0,.06)})`; g.fillRect(i*s+1.5,j*s+1.5,s-3,s-3); }
  return c; }

/* ---------- generators ---------- */
const FG={};
// helpers in the piece's frame
const fbx=(B,P,k,x0,y0,z0,x1,y1,z1)=>B.box(k,x0,y0,z0,x1,y1,z1,P.M);
const fcy=(B,P,k,r0,r1,h,seg,x,y,z,open)=>B.cyl(k,r0,r1,h,seg,mm(P.M,mT(x,y,z)),open);
const fat=(P,x,y,z)=>V3(x,y,z).applyMatrix4(P.M);
const legs4=(B,P,k,W,D,h,s,inset)=>{ const i=inset||0.03; for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) fbx(B,P,k,sx*(W/2-i)-s/2,0,sz*(D/2-i)-s/2,sx*(W/2-i)+s/2,h,sz*(D/2-i)+s/2); };
const woodK=P=>P.cat==='cn'||P.cat==='tb'? 'lacquer' : 'wood';

// rugs: one woven design stretched over the whole rug
FG.rug=(B,P)=>{ const W=P.W, D=P.D; B.ext('rug',[[-W/2,-D/2],[W/2,-D/2],[W/2,D/2],[-W/2,D/2]],null,0.016,mm(P.M,mT(0,0.022,0),mRX(Math.PI/2)),(x,y)=>[(x+W/2)/W,(y+D/2)/D]); };
// floor seating against a wall: mattress, back cushions, bolster arm rests (majlis, gaddi, Tibetan box seats)
FG.majlis=(B,P)=>{ const W=P.W, D=P.D, box=P.cat==='tb', base=box?0.24:0;
  if(box){ fbx(B,P,'paint',-W/2,0,-D/2,W/2,base,D/2); fbx(B,P,'band',-W/2+0.02,0.04,D/2-0.004,W/2-0.02,base-0.04,D/2+0.008); }
  fbx(B,P,P.cat==='in'?'linen':box?'rug':'cushion',-W/2,base,-D/2,W/2,base+0.13,D/2);
  const n=Math.max(1,Math.round(W/0.85)), bw=W/n; for(let i=0;i<n;i++){ const a=-W/2+i*bw+0.03, b=a+bw-0.06; fbx(B,P,P.cat==='in'?'cushion2':'cushion2',a,base+0.13,-D/2+0.01,b,base+0.6,-D/2+0.21); }
  if(P.cat==='in'){ const t=mm(P.M,mT(0,base+0.27,-D/2+0.33),mRZ(Math.PI/2)); B.cyl('cushion2',0.13,0.13,W-0.2,10,mm(t,mT(0,-(W-0.2)/2,0))); }
  for(const s of [-1,1]) B.cyl('cushion2',0.11,0.11,D*0.75,10,mm(P.M,mT(s*(W/2-0.13),base+0.24,-D/2+0.1),mRX(Math.PI/2))); };
// raised divan (sedir) along a wall
FG.sedir=(B,P)=>{ const W=P.W, D=P.D; fbx(B,P,'wood',-W/2,0,-D/2,W/2,0.36,D/2); fbx(B,P,'cushion2',-W/2+0.02,0.04,D/2,W/2-0.02,0.32,D/2+0.012);
  fbx(B,P,'cushion',-W/2,0.36,-D/2,W/2,0.48,D/2+0.02); const n=Math.max(1,Math.round(W/0.8)), bw=W/n; for(let i=0;i<n;i++) fbx(B,P,'cushion2',-W/2+i*bw+0.03,0.48,-D/2+0.01,-W/2+(i+1)*bw-0.03,0.95,-D/2+0.22); };
// round tray table on a folding stand, with a coffee pot and cups (sini, khantok)
FG.trayTable=(B,P)=>{ const r=P.W/2, low=P.cat==='sea', h=low?0.26:0.4;
  if(low){ fcy(B,P,'wood',r*0.7,r*0.8,h-0.03,16,0,0,0); } else for(const a of [Math.PI/4,-Math.PI/4]){ B.box('wood',-r*0.7,0,-0.02,r*0.7,h,0.02,mm(P.M,mRY(a))); }
  fcy(B,P,low?'wood':'metal',r,r,0.03,24,0,h,0); fcy(B,P,'metal',r*0.96,r,0.02,24,0,h+0.03,0,true);
  B.lathe('metal',[[0,0],[0.07,0.01],[0.08,0.08],[0.04,0.16],[0.03,0.2],[0.05,0.23],[0,0.25]],10,mm(P.M,mT(-r*0.3,h+0.03,0)));
  for(let k=0;k<4;k++){ const a=k*1.4+0.4; fcy(B,P,P.cat==='me'?'porcelain':'clay',0.03,0.025,0.05,8,Math.cos(a)*r*0.55+0.1,h+0.03,Math.sin(a)*r*0.55); } };
// low rectangular or round table (chabudai, soban, choktse, chowki)
FG.lowTable=(B,P)=>{ const W=P.W, D=P.D, h=P.h||0.32, k=P.cat==='tb'?'paint':P.cat==='kr'||P.cat==='jp'?'wood':woodK(P);
  if(P.round){ fcy(B,P,k,W/2,W/2,0.04,20,0,h-0.04,0); for(let i=0;i<4;i++){ const a=i*Math.PI/2+Math.PI/4; fbx(B,P,k,Math.cos(a)*W*0.32-0.025,0,Math.sin(a)*W*0.32-0.025,Math.cos(a)*W*0.32+0.025,h-0.04,Math.sin(a)*W*0.32+0.025); } }
  else { fbx(B,P,k,-W/2,h-0.045,-D/2,W/2,h,D/2); legs4(B,P,k,W,D,h-0.045,0.05,0.05); fbx(B,P,k,-W/2+0.05,h-0.11,-D/2+0.05,W/2-0.05,h-0.045,-D/2+0.07); fbx(B,P,k,-W/2+0.05,h-0.11,D/2-0.07,W/2-0.05,h-0.045,D/2-0.05);
    if(P.cat==='tb') fbx(B,P,'band',-W/2+0.06,0.06,D/2-0.04,W/2-0.06,h-0.12,D/2-0.025); }
  if(P.decor) fcy(B,P,'porcelain',0.05,0.04,0.07,8,W*0.15,h,0); };
// dining or hall table with apron and stretchers (Ming square table, Ottoman table)
FG.table=(B,P)=>{ const W=P.W, D=P.D, h=P.h||0.8, k=woodK(P);
  fbx(B,P,k,-W/2,h-0.05,-D/2,W/2,h,D/2); legs4(B,P,k,W,D,h-0.05,0.06,0.04);
  for(const s of [-1,1]){ fbx(B,P,k,-W/2+0.07,h-0.15,s*(D/2-0.06)-0.015,W/2-0.07,h-0.05,s*(D/2-0.06)+0.015); fbx(B,P,k,s*(W/2-0.06)-0.015,h-0.15,-D/2+0.07,s*(W/2-0.06)+0.015,h-0.05,D/2-0.07); }
  if(P.decor){ B.lathe('porcelain',[[0,0],[0.05,0.005],[0.07,0.06],[0.03,0.12],[0.035,0.16],[0,0.16]],10,mm(P.M,mT(0,h,0))); } };
// long narrow altar/side table with raised ends, incense burner, candles and vases
FG.altarTable=(B,P)=>{ const W=P.W, D=P.D, h=P.h||0.92, k=woodK(P);
  fbx(B,P,k,-W/2,h-0.05,-D/2,W/2,h,D/2); for(const s of [-1,1]) fbx(B,P,k,s*W/2-(s>0?0.12:0),h,-D/2,s*W/2+(s<0?0.12:0),h+0.06,D/2);
  legs4(B,P,k,W-0.15,D,h-0.05,0.06,0.03); fbx(B,P,k,-W/2+0.12,h-0.2,-D/2+0.04,W/2-0.12,h-0.05,-D/2+0.07); fbx(B,P,k,-W/2+0.12,h-0.2,D/2-0.07,W/2-0.12,h-0.05,D/2-0.04);
  fcy(B,P,'metal',0.1,0.12,0.12,10,0,h,0); for(const s of [-1,1]){ fcy(B,P,'metal',0.02,0.03,0.24,6,s*0.28,h,0); fcy(B,P,'glow',0.012,0.012,0.04,6,s*0.28,h+0.24,0);
    B.lathe(P.cat==='cn'?'blueware':'porcelain',[[0,0],[0.06,0.01],[0.09,0.12],[0.05,0.25],[0.04,0.32],[0.06,0.36],[0,0.36]],12,mm(P.M,mT(s*(W/2-0.3),h,0))); } };
// armchair (Ming "official's hat" when the crest rail runs past the posts), side chair without arms
FG.chair=(B,P)=>{ const W=0.56, D=0.48, s=0.45, k=woodK(P), hat=P.cat==='cn';
  legs4(B,P,k,W,D,s,0.045,0.03); fbx(B,P,k,-W/2,s,-D/2,W/2,s+0.05,D/2); fbx(B,P,'cushion',-W/2+0.04,s+0.05,-D/2+0.04,W/2-0.04,s+0.08,D/2-0.04);
  for(const sx of [-1,1]) fbx(B,P,k,sx*(W/2-0.03)-0.022,s,-D/2+0.01,sx*(W/2-0.03)+0.022,1.08,-D/2+0.055);
  fbx(B,P,k,-W/2-(hat?0.08:0),1.04,-D/2+0.0,W/2+(hat?0.08:0),1.1,-D/2+0.07); fbx(B,P,k,-0.09,s+0.05,-D/2+0.02,0.09,1.04,-D/2+0.045);
  if(P.arms) for(const sx of [-1,1]){ fbx(B,P,k,sx*(W/2-0.03)-0.02,s+0.05,D/2-0.06,sx*(W/2-0.03)+0.02,s+0.26,D/2-0.02); fbx(B,P,k,sx*(W/2-0.03)-0.025,s+0.24,-D/2+0.05,sx*(W/2-0.03)+0.025,s+0.29,D/2); }
  fbx(B,P,k,-W/2+0.04,0.1,D/2-0.05,W/2-0.04,0.13,D/2-0.02); };
// floor cushion (zabuton, boryo, Thai axe cushion)
FG.cushion=(B,P)=>{ const W=P.W||0.56, D=P.D||0.56; fbx(B,P,P.alt?'cushion2':'cushion',-W/2,0.0,-D/2,W/2,0.08,D/2);
  if(P.cat==='sea'){ B.ext('cushion2',[[-0.2,0],[0.2,0],[0,0.42]],null,0.3,mm(P.M,mT(0,0.08,-D/2),mRY(0))); } };
// beds: raised bed with headboard, Chinese canopy bed, futon on the floor, rope charpai, Balinese platform with posts
FG.bed=(B,P)=>{ const W=P.W, D=P.D, k=woodK(P), kind=P.kind||'raised';
  if(kind==='futon'){ fbx(B,P,'linen',-W/2,0,-D/2,W/2,0.09,D/2); fbx(B,P,'cushion',-W/2-0.02,0.09,-D/2+0.55,W/2+0.02,0.15,D/2+0.02); fbx(B,P,'linen',-0.3,0.09,-D/2+0.08,0.3,0.2,-D/2+0.38); return; }
  if(kind==='charpai'){ for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) fcy(B,P,'wood',0.045,0.05,0.48,8,sx*(W/2-0.05),0,sz*(D/2-0.05)); fbx(B,P,'wood',-W/2,0.36,-D/2,W/2,0.44,D/2); fbx(B,P,'mat',-W/2+0.06,0.4,-D/2+0.06,W/2-0.06,0.445,D/2-0.06); fbx(B,P,'cushion',-W/2+0.1,0.445,-D/2+0.1,W/2-0.1,0.5,-D/2+0.5); return; }
  const h= kind==='canopy'||kind==='platform'? 0.5 : 0.42;
  fbx(B,P,k,-W/2,0.08,-D/2,W/2,h,D/2); legs4(B,P,k,W,D,0.08,0.08,0.04); fbx(B,P,'linen',-W/2+0.05,h,-D/2+0.05,W/2-0.05,h+0.16,D/2-0.05);
  fbx(B,P,'cushion',-W/2+0.03,h+0.16,-D/2+0.7,W/2-0.03,h+0.2,D/2-0.03); for(const sx of (W>1.2?[-1,1]:[0])) fbx(B,P,'linen',sx*W/4-0.28,h+0.16,-D/2+0.1,sx*W/4+0.28,h+0.32,-D/2+0.45);
  if(kind==='raised'){ fbx(B,P,k,-W/2,h,-D/2,W/2,h+0.65,-D/2+0.06); return; }
  if(kind==='plain') return;
  if(kind==='fourposter'){ const post=2.2; for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) fcy(B,P,k,0.06,0.05,post,8,sx*(W/2-0.05),0,sz*(D/2-0.05));
    fbx(B,P,k,-W/2,h,-D/2,W/2,h+0.9,-D/2+0.07); fbx(B,P,k,-W/2-0.05,post,-D/2-0.05,W/2+0.05,post+0.18,D/2+0.05);
    fbx(B,P,'cushion2',-W/2-0.03,post-0.3,-D/2-0.03,W/2+0.03,post,D/2+0.03); for(const sx of [-1,1]) fbx(B,P,'cushion2',sx*(W/2-0.02)-0.03,h+0.25,D/2-0.3,sx*(W/2-0.02)+0.03,post-0.3,D/2-0.05); return; }   // a tester on turned posts, curtained
  const post=kind==='canopy'?2.2:1.9; for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) fbx(B,P,k,sx*(W/2-0.04)-0.04,h,sz*(D/2-0.04)-0.04,sx*(W/2-0.04)+0.04,post,sz*(D/2-0.04)+0.04);
  for(const sz of [-1,1]) fbx(B,P,k,-W/2,post-0.12,sz*(D/2-0.04)-0.04,W/2,post,sz*(D/2-0.04)+0.04); for(const sx of [-1,1]) fbx(B,P,k,sx*(W/2-0.04)-0.04,post-0.12,-D/2,sx*(W/2-0.04)+0.04,post,D/2);
  if(kind==='canopy'){ fbx(B,P,'lattice',-W/2+0.04,post-0.42,D/2-0.06,W/2-0.04,post-0.12,D/2-0.02); for(const sx of [-1,1]) fbx(B,P,'cushion2',sx*(W/2-0.16)-0.1,h+0.2,D/2-0.1,sx*(W/2-0.16)+0.1,post-0.42,D/2-0.04); fbx(B,P,k,-W/2,h,-D/2,W/2,post-0.12,-D/2+0.04); }
  else fbx(B,P,'thatch',-W/2-0.2,post,-D/2-0.2,W/2+0.2,post+0.25,D/2+0.2); };
// chests: Gulf mandoos with brass bands, Korean bandaji, Thai/Tibetan painted chest
FG.chest=(B,P)=>{ const W=P.W, D=P.D, h=P.h||0.62, k=P.cat==='tb'?'paint':P.cat==='cn'?'lacquer':'wood';
  legs4(B,P,k,W,D,0.08,0.07,0.035); fbx(B,P,k,-W/2,0.08,-D/2,W/2,h-0.07,D/2); fbx(B,P,k,-W/2-0.015,h-0.07,-D/2-0.015,W/2+0.015,h,D/2+0.015);
  if(P.cat==='tb') fbx(B,P,'band',-W/2+0.05,0.14,D/2,W/2-0.05,h-0.12,D/2+0.008);
  else for(const u of [-W/3,0,W/3]) fbx(B,P,'metal',u-0.02,0.1,D/2,u+0.02,h-0.02,D/2+0.008);
  fbx(B,P,'metal',-0.06,h-0.2,D/2+0.008,0.06,h-0.1,D/2+0.016); };
// tall cabinet with two doors (round-corner cabinet, Tibetan painted cabinet, tansu stepped chest)
FG.cabinet=(B,P)=>{ const W=P.W, D=P.D, h=P.h||1.8, k=P.cat==='tb'?'paint':P.cat==='jp'?'wood':woodK(P);
  if(P.cat==='jp'&&P.step){ const n=4; for(let i=0;i<n;i++){ const z0=-D/2, z1=D/2-i*D/n*0.85, y0=i*h/n; fbx(B,P,k,-W/2,y0,z0,W/2,y0+h/n,z1); fbx(B,P,'iron',-0.08,y0+h/n*0.45,z1,0.08,y0+h/n*0.55,z1+0.01); } return; }
  fbx(B,P,k,-W/2,0.05,-D/2,W/2,h,D/2); fbx(B,P,k,-W/2-0.02,h-0.05,-D/2-0.02,W/2+0.02,h+0.02,D/2+0.02);
  for(const sx of [-1,1]) fbx(B,P,P.cat==='tb'?'band':k,sx>0?0.01:-W/2+0.05,0.15,D/2,sx>0?W/2-0.05:-0.01,h-0.1,D/2+0.01);
  for(const sx of [-1,1]) fcy(B,P,'metal',0.04,0.04,0.01,8,sx*0.06,h*0.55,D/2+0.01); };
// open shelves stocked with vessels or books
FG.shelf=(B,P)=>{ const W=P.W, D=P.D, h=P.h||1.7, k=P.cat==='cn'?'lacquer':'wood', r=P.r, n=4;
  for(const sx of [-1,1]) fbx(B,P,k,sx*(W/2-0.025)-0.025,0,-D/2,sx*(W/2-0.025)+0.025,h,D/2); fbx(B,P,k,-W/2+0.05,0.05,-D/2,W/2-0.05,h,-D/2+0.02);
  for(let i=0;i<n;i++){ const y=0.08+i*(h-0.12)/(n-1); fbx(B,P,k,-W/2+0.05,y,-D/2+0.02,W/2-0.05,y+0.03,D/2);
    if(i===n-1) break; let u=-W/2+0.12; while(u<W/2-0.15){ const books=P.books||r.chance(0.35);
      if(books){ const bw=r.range(0.03,0.06), bh=r.range(0.18,0.26); fbx(B,P,r.pick(['cushion','cushion2','linen']),u,y+0.03,-D/2+0.04,u+bw,y+0.03+bh,D/2-0.04); u+=bw+0.005; }
      else { const s=r.range(0.7,1.1); B.lathe(r.pick(['clay','porcelain','metal','blueware']),[[0,0],[0.06*s,0.005],[0.08*s,0.1*s],[0.04*s,0.18*s],[0.045*s,0.22*s],[0,0.22*s]],8,mm(P.M,mT(u+0.08,y+0.03,0))); u+=0.2; } } } };
// kitchen hearths: clay tannur, brick stove with woks, kamado, Korean cauldron stove, chulha
FG.stove=(B,P)=>{ const W=P.W, D=P.D, c=P.cat;
  if(c==='eu'||c==='rom'){ if(P.st.id==='russian') FG.pech(B,P); else FG.hearth(B,P); return; }
  if(c==='me'){ B.lathe('clay',[[0,0],[0.42,0],[0.45,0.3],[0.4,0.75],[0.3,0.82],[0.27,0.82]],14,mm(P.M,mT(-W/4,0,0))); fcy(B,P,'void',0.27,0.27,0.01,12,-W/4,0.81,0);
    fbx(B,P,'trim',0.05,0,-D/2,W/2,0.45,D/2); fcy(B,P,'metal',0.18,0.14,0.16,10,W/4,0.45,0); return; }
  const k= c==='jp'?'trim': c==='in'?'clay': c==='tb'?'iron':'stone', h= c==='in'?0.35:0.75;
  fbx(B,P,k,-W/2,0,-D/2,W/2,h,D/2); fbx(B,P,c==='jp'?'black':'trim',-W/2-0.02,h,-D/2-0.02,W/2+0.02,h+0.04,D/2+0.02);
  const pots=W>1.1?[-W/4,W/4]:[0]; for(const u of pots){ fcy(B,P,'void',0.24,0.24,0.01,12,u,h+0.04,0); B.lathe(c==='jp'||c==='kr'?'black':'iron',[[0,0],[0.18,0.02],[0.27,0.12],[0.28,0.2],[0.3,0.21],[0,0.21]],12,mm(P.M,mT(u,h-0.12,0))); fcy(B,P,'wood',0.26,0.26,0.03,12,u,h+0.1,0); }
  fbx(B,P,'void',-0.18,0.1,D/2,0.18,0.35,D/2+0.01);
  if(c==='tb'){ fcy(B,P,'iron',0.07,0.07,1.6,8,-W/2+0.15,h,-D/2+0.15); } };
// European and Roman cooking hearths: a Russian pech, a brick chimney-breast hearth (with an iron range in Victorian kitchens), a Roman masonry hearth
FG.pech=(B,P)=>{ const W=P.W, D=P.D, h=Math.min(1.9,P.ceil-0.4); fbx(B,P,'trim',-W/2,0,-D/2,W/2,h,D/2); fbx(B,P,'trim',-W/2-0.04,h-0.15,-D/2-0.04,W/2+0.04,h,D/2+0.04);
  B.flat('void',openPoly({u0:-0.3,u1:0.3,v0:0.72,vs:0.95,arch:'round'}),mm(P.M,mT(0,0,D/2+0.005)));
  fbx(B,P,'trim',-W/2,0,D/2,-W/2+0.5,0.45,D/2+0.42); fbx(B,P,'wood',-W/2+0.02,0.45,D/2,-W/2+0.48,0.5,D/2+0.42);
  fbx(B,P,'cushion',-W/2+0.1,h,-D/2+0.1,W/2-0.1,h+0.1,D/2-0.1); fcy(B,P,'trim',0.16,0.16,Math.max(0.1,P.ceil-h-0.02),8,-W/4,h,-D/4); fcy(B,P,'clay',0.12,0.1,0.25,8,W/4,0,D/2+0.25); };
FG.hearth=(B,P)=>{ const W=P.W, D=P.D, id=P.st.id, k=id==='cycladic'?'trim':'chim', h=1.45, top=Math.max(h+0.3,P.ceil-0.02);
  if(P.cat==='rom'){ fbx(B,P,'trim',-W/2,0,-D/2,W/2,0.85,D/2); fbx(B,P,'void',-W/2+0.15,0.12,D/2-0.002,-W/2+0.65,0.55,D/2+0.003); fbx(B,P,'stone',-W/2-0.03,0.85,-D/2-0.03,W/2+0.03,0.9,D/2+0.03); fbx(B,P,'glow',-0.3,0.9,-0.15,0.1,0.93,0.15);
    for(const u of [-W/4,W/4]) B.lathe('metal',[[0,0],[0.14,0.02],[0.18,0.12],[0.17,0.2],[0,0.2]],10,mm(P.M,mT(u,0.93,0))); return; }
  fbx(B,P,k,-W/2,0,-D/2,-W/2+0.25,h,D/2); fbx(B,P,k,W/2-0.25,0,-D/2,W/2,h,D/2); fbx(B,P,k,-W/2+0.002,h+0.07,-D/2,W/2-0.002,top,D/2-0.002); fbx(B,P,'void',-W/2+0.25,0,-D/2,W/2-0.25,h,-D/2+0.03);
  fbx(B,P,'stone',-W/2-0.06,h,-D/2,W/2+0.06,h+0.07,D/2+0.06);
  if(id==='victorian'){ fbx(B,P,'iron',-W/2+0.27,0,-D/2+0.04,W/2-0.27,0.85,D/2-0.04); fbx(B,P,'metal',-W/2+0.32,0.15,D/2-0.04,-0.05,0.7,D/2-0.03); fbx(B,P,'glow',0.05,0.3,D/2-0.04,W/2-0.35,0.55,D/2-0.035); fcy(B,P,'metal',0.13,0.12,0.18,10,0.25,0.85,0); }
  else { fbx(B,P,'glow',-0.35,0.02,-D/2+0.1,0.35,0.12,D/2-0.1); fcy(B,P,'iron',0.012,0.012,h-0.3,4,0,0.3+0.12,0); B.lathe('iron',[[0,0],[0.15,0.02],[0.22,0.14],[0.2,0.28],[0,0.28]],10,mm(P.M,mT(0,0.25,0))); } };
// open fireplace with a mantel shelf, the fire glowing; candlesticks on the mantel
FG.fireplace=(B,P)=>{ const W=P.W, D=P.D, h=P.h||1.25, k=P.st.id==='victorian'?'stone':'chim';
  fbx(B,P,k,-W/2,0,-D/2,-W/2+0.25,h-0.28,D/2); fbx(B,P,k,W/2-0.25,0,-D/2,W/2,h-0.28,D/2); fbx(B,P,k,-W/2,h-0.28,-D/2,W/2,h,D/2-0.002); fbx(B,P,'void',-W/2+0.25,0,-D/2,W/2-0.25,h-0.28,-D/2+0.03);
  fbx(B,P,'stone',-W/2-0.08,h,-D/2,W/2+0.08,h+0.07,D/2+0.06); fbx(B,P,'stone',-W/2-0.1,0,D/2,W/2+0.1,0.04,D/2+0.4);
  fbx(B,P,'iron',-0.3,0.04,-D/2+0.12,0.3,0.2,D/2-0.12); fbx(B,P,'glow',-0.25,0.2,-D/2+0.16,0.25,0.32,D/2-0.16); for(const sx of [-1,1]) fcy(B,P,'metal',0.03,0.025,0.25,6,sx*0.45,h+0.07,0.05); };
// upholstered sofa with arms and seat cushions
FG.sofa=(B,P)=>{ const W=P.W, D=P.D; legs4(B,P,'wood',W,D,0.12,0.05,0.06); fbx(B,P,'cushion',-W/2,0.12,-D/2,W/2,0.42,D/2); fbx(B,P,'cushion',-W/2,0.42,-D/2,W/2,0.9,-D/2+0.2);
  for(const sg of [-1,1]) fbx(B,P,'cushion',sg>0?W/2-0.16:-W/2,0.42,-D/2+0.2,sg>0?W/2:-W/2+0.16,0.68,D/2);
  const n=Math.max(2,Math.round((W-0.32)/0.6)), sw=(W-0.32)/n; for(let i=0;i<n;i++) fbx(B,P,'cushion2',-W/2+0.16+i*sw+0.02,0.42,-D/2+0.2,-W/2+0.16+(i+1)*sw-0.02,0.52,D/2-0.02); };
// Roman dining couch (lectus): bronze legs, a mattress and a raised headrest
FG.couch=(B,P)=>{ const W=P.W, D=P.D; legs4(B,P,'metal',W,D,0.45,0.06,0.08); fbx(B,P,'wood',-W/2,0.45,-D/2,W/2,0.55,D/2); fbx(B,P,'cushion',-W/2+0.03,0.55,-D/2+0.03,W/2-0.03,0.7,D/2-0.03);
  fbx(B,P,'wood',-W/2,0.55,-D/2,-W/2+0.1,0.95,D/2); B.cyl('cushion2',0.12,0.12,D-0.1,10,mm(P.M,mT(-W/2+0.25,0.82,-D/2+0.05),mRX(Math.PI/2))); };
// wooden bench along a wall (lavka)
FG.bench=(B,P)=>{ const W=P.W, D=P.D||0.4, h=0.45; fbx(B,P,'wood',-W/2,h-0.05,-D/2,W/2,h,D/2); for(const sg of [-1,1]) fbx(B,P,'wood',sg*(W/2-0.12)-0.03,0,-D/2+0.04,sg*(W/2-0.12)+0.03,h-0.05,D/2-0.04); fbx(B,P,'wood',-W/2+0.12,0.15,-0.03,W/2-0.12,0.2,0.03); };
// washstand with a jug and basin
FG.washstand=(B,P)=>{ FG.table(B,Object.assign({},P,{h:0.8,decor:false})); fcy(B,P,'porcelain',0.2,0.14,0.1,12,0,0.8,0); B.lathe('porcelain',[[0,0],[0.07,0],[0.09,0.12],[0.05,0.22],[0.06,0.28],[0,0.28]],10,mm(P.M,mT(0.22,0.8,0.05))); fbx(B,P,'wood',-P.W/2,0.8,-P.D/2,P.W/2,1.1,-P.D/2+0.03); };
// a hammock slung between two posts
FG.hammock=(B,P)=>{ const W=P.W; for(const sg of [-1,1]) fcy(B,P,'wood',0.06,0.06,1.9,6,sg*W/2,0,0);
  const pts=[]; for(let i=0;i<=8;i++){ const f=i/8; pts.push([-W/2+0.1+(W-0.2)*f,1.55-Math.sin(Math.PI*f)*0.85]); }
  for(let i=1;i<pts.length;i++){ const [x0,y0]=pts[i-1], [x1,y1]=pts[i], L=Math.hypot(x1-x0,y1-y0); B.box('cushion',-L/2,-0.012,-0.42,L/2,0.012,0.42,mm(P.M,mT((x0+x1)/2,(y0+y1)/2,0),mRZ(Math.atan2(y1-y0,x1-x0)))); } };
// brazier on a tripod
FG.brazier=(B,P)=>{ for(let k=0;k<3;k++){ const a=k*2.094; B.segCyl('metal',fat(P,Math.cos(a)*0.28,0,Math.sin(a)*0.28),fat(P,Math.cos(a)*0.16,0.7,Math.sin(a)*0.16),0.02,0.02,4); } fcy(B,P,'metal',0.22,0.3,0.12,12,0,0.7,0); fcy(B,P,'glow',0.25,0.25,0.03,12,0,0.82,0); };
// lararium: the household shrine — a little temple front on a ledge with figurines, a lamp and an offering bowl
FG.lararium=(B,P)=>{ const W=P.W, D=P.D; fbx(B,P,'stone',-W/2,0,-D/2,W/2,1.0,D/2); fbx(B,P,'stone',-W/2-0.05,1.0,-D/2,W/2+0.05,1.06,D/2+0.05);
  for(const sg of [-1,1]) fcy(B,P,'stone',0.05,0.05,0.7,8,sg*(W/2-0.1),1.06,D/2-0.1); fbx(B,P,'dado',-W/2+0.1,1.06,-D/2,W/2-0.1,1.76,-D/2+0.03);
  fbx(B,P,'stone',-W/2-0.05,1.76,-D/2,W/2+0.05,1.86,D/2+0.02); B.ext('stone',[[-W/2-0.05,0],[W/2+0.05,0],[0,0.3]],null,D+0.02,mm(P.M,mT(0,1.863,-D/2)));
  for(const u of [-0.18,0,0.18]){ fcy(B,P,'metal',0.04,0.035,0.22,6,u,1.06,0); B.sphere('metal',0.04,mT(...fat(P,u,1.32,0).toArray()),6,4); }
  fcy(B,P,'clay',0.08,0.05,0.05,8,0.3,1.06,0.1); fcy(B,P,'glow',0.015,0.015,0.03,5,-0.3,1.06,0.1); };
// the icon corner (krasny ugol): a shelf high in the corner with gilded icons, a hanging lamp and an embroidered towel
FG.iconCase=(B,P)=>{ const y=1.55; fbx(B,P,'wood',-0.32,y,-0.32,0.32,y+0.05,0.32); for(const [u,w,hh] of [[-0.16,0.22,0.32],[0.12,0.18,0.26]]) fbx(B,P,'gold',u-w/2,y+0.05,-0.3,u+w/2,y+0.05+hh,-0.27);
  fbx(B,P,'linen',-0.3,y-0.6,-0.32,0.3,y,-0.3); fbx(B,P,'band',-0.3,y-0.55,-0.3,0.3,y-0.45,-0.295); fcy(B,P,'iron',0.006,0.006,0.4,3,0,y-0.4,0.05); fcy(B,P,'lantern',0.05,0.04,0.08,8,0,y-0.48,0.05); };
// work table with bowls and a cutting board
FG.workTable=(B,P)=>{ FG.table(B,Object.assign({},P,{h:P.h||0.78,decor:false})); const h=P.h||0.78; fbx(B,P,'wood',-0.25,h,-0.12,0.15,h+0.03,0.12);
  for(const u of [0.3,0.45]) B.lathe('clay',[[0,0],[0.07,0.005],[0.11,0.06],[0.12,0.08],[0,0.08]],10,mm(P.M,mT(u-0.1,h,0.05))); };
// stores: sacks, baskets, crates, barrels
FG.stores=(B,P)=>{ const r=P.r, W=P.W, D=P.D; for(let i=0;i<P.n;i++){ const x=r.range(-W/2+0.25,W/2-0.25), z=r.range(-D/2+0.25,D/2-0.25), kind=r.int(0,3);
  if(kind===0) B.sphere('fabric',0.3,mm(P.M,mT(x,0.26,z),mS(1,0.85,0.8)),9,6);
  else if(kind===1) fcy(B,P,'mat',0.26,0.22,0.38,10,x,0,z);
  else if(kind===2){ const s=r.range(0.35,0.5); B.box('wood',-s/2,0,-s/2,s/2,s*0.8,s/2,mm(P.M,mT(x,0,z),mRY(r.range(-0.3,0.3)))); }
  else jar(B,fat(P,x,0,z).x,fat(P,x,0,z).y,fat(P,x,0,z).z,r.range(0.8,1.1)); } };
// shrine kit: Buddhist altar cabinet, Tibetan altar with butter lamps, Thai tiered altar, Hindu temple niche
FG.altar=(B,P)=>{ const W=P.W, D=P.D, c=P.cat;
  if(c==='jp'){ FG.cabinet(B,Object.assign({},P,{h:1.5})); fbx(B,P,'gold',-W/2+0.08,0.6,D/2-0.02,W/2-0.08,1.3,D/2+0.005); B.lathe('gold',[[0,0],[0.08,0],[0.09,0.08],[0.05,0.16],[0.06,0.24],[0,0.3]],8,mm(P.M,mT(0,0.6,D/2+0.06))); return; }
  if(c==='sea'||c==='tb'){ const n=3; for(let i=0;i<n;i++){ const w=W*(1-i*0.22), y0=i*0.32; fbx(B,P,i%2?'gold':(c==='tb'?'paint':'lacquer'),-w/2,y0,-D/2,w/2,y0+0.32,-D/2+D*(1-i*0.28)); }
    const y=0.96; B.lathe('gold',[[0,0],[0.2,0],[0.22,0.06],[0.12,0.12],[0.14,0.35],[0.1,0.5],[0.12,0.58],[0.07,0.7],[0,0.78]],12,mm(P.M,mT(0,y,-D/2+0.2)));
    for(let k=-2;k<=2;k++) fcy(B,P,'metal',0.035,0.03,0.06,8,k*0.18,0.32,D*0.32); for(let k=-2;k<=2;k++) fcy(B,P,'glow',0.012,0.012,0.03,6,k*0.18,0.38,D*0.32); return; }
  if(c==='in'){ fbx(B,P,'stone',-W/2,0,-D/2,W/2,0.6,D/2); let y=0.6, w=W*0.7; for(let i=0;i<4;i++){ fbx(B,P,i%2?'band':'stone',-w/2,y,-D/2+0.05,w/2,y+0.25,-D/2+0.05+w); y+=0.25; w*=0.8; }
    fcy(B,P,'gold',0.06,0.03,0.15,8,0,y,-D/2+0.2); B.lathe('gold',[[0,0],[0.07,0.02],[0.09,0.1],[0.06,0.22],[0,0.26]],8,mm(P.M,mT(0,0.6,D/2-0.15))); fcy(B,P,'glow',0.03,0.03,0.03,6,0.2,0.6,D/2-0.1); return; }
  FG.altarTable(B,P); };
// lighting: floor lanterns and lamp stands
FG.floorLamp=(B,P)=>{ const c=P.cat;
  if(c==='rom'){ fcy(B,P,'metal',0.16,0.14,0.04,8,0,0,0); for(let k=0;k<3;k++){ const a=k*2.094; B.segCyl('metal',fat(P,Math.cos(a)*0.16,0,Math.sin(a)*0.16),fat(P,0,0.18,0),0.015,0.015,3); } fcy(B,P,'metal',0.018,0.014,1.2,6,0,0.18,0); fcy(B,P,'metal',0.12,0.08,0.04,8,0,1.38,0); B.sphere('glow',0.03,mT(...fat(P,0.08,1.45,0).toArray()),5,4); return; }   // candelabrum
  if(c==='eu'){ fcy(B,P,'metal',0.16,0.18,0.04,10,0,0,0); fcy(B,P,'metal',0.018,0.018,1.35,6,0,0.04,0); fcy(B,P,'glow',0.03,0.03,0.08,6,0,1.32,0); fcy(B,P,'linen',0.24,0.15,0.3,12,0,1.28,0,true); return; }   // standard lamp
  if(c==='jp'){ fbx(B,P,'wood',-0.17,0,-0.17,0.17,0.06,0.17); fbx(B,P,'paper',-0.15,0.06,-0.15,0.15,0.62,0.15); for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) fbx(B,P,'wood',sx*0.15-0.012,0.06,sz*0.15-0.012,sx*0.15+0.012,0.66,sz*0.15+0.012); return; }
  if(c==='cn'||c==='kr'){ fcy(B,P,'wood',0.14,0.16,0.04,8,0,0,0); fcy(B,P,'wood',0.02,0.02,1.25,6,0,0.04,0); fbx(B,P,'wood',-0.2,1.25,-0.02,0.2,1.29,0.02); B.lathe(c==='cn'?'lantern':'paper',[[0.06,0],[0.15,0.05],[0.17,0.18],[0.15,0.31],[0.06,0.36]],10,mm(P.M,mT(0,0.84,0))); return; }
  if(c==='in'||c==='tb'){ fcy(B,P,'metal',0.15,0.13,0.05,10,0,0,0); fcy(B,P,'metal',0.02,0.025,1.0,6,0,0.05,0); for(let k=0;k<3;k++) fcy(B,P,'metal',0.12-k*0.03,0.1-k*0.03,0.03,10,0,0.35+k*0.3,0); fcy(B,P,'glow',0.02,0.02,0.04,6,0,1.05,0); return; }
  fcy(B,P,'metal',0.13,0.15,0.06,8,0,0,0); fcy(B,P,'glow',0.11,0.11,0.32,8,0,0.06,0); for(let k=0;k<8;k++){ const a=k/8*Math.PI*2; fbx(B,P,'metal',Math.cos(a)*0.115-0.012,0.06,Math.sin(a)*0.115-0.012,Math.cos(a)*0.115+0.012,0.38,Math.sin(a)*0.115+0.012); }
  B.cone('metal',0.16,0.24,8,mm(P.M,mT(0,0.38,0))); fcy(B,P,'metal',0.015,0.015,0.12,6,0,0.62,0); };
// porcelain vase on a stand, with blossom
FG.vase=(B,P)=>{ const blue=P.cat==='cn'||P.cat==='jp'||P.cat==='kr'; fcy(B,P,'wood',0.2,0.18,0.5,8,0,0,0);
  B.lathe(blue?'blueware':'clay',[[0,0],[0.1,0.01],[0.17,0.18],[0.12,0.36],[0.06,0.42],[0.08,0.48],[0,0.48]],12,mm(P.M,mT(0,0.5,0)));
  if(P.flowers) for(let k=0;k<4;k++) B.ico(P.cat==='jp'?'maple':'blossom',0.11,mT(...fat(P,Math.cos(k*1.6)*0.12,1.08+k*0.05,Math.sin(k*1.6)*0.12).toArray()),0); };
// folding screen of painted or papered panels
FG.screen=(B,P)=>{ const n=P.n||4, pw=P.W/n, h=P.h||1.7, k=woodK(P), face=P.cat==='jp'||P.cat==='kr'?'paper':'band';
  for(let i=0;i<n;i++){ const x=-P.W/2+i*pw, z=(i%2?0.12:-0.06); fbx(B,P,k,x,0.02,z-0.025,x+pw,h,z+0.025); fbx(B,P,face,x+0.05,0.12,z+0.025,x+pw-0.05,h-0.08,z+0.03); } };
// a hanging swing seat on four chains (jhoola)
FG.swing=(B,P)=>{ const W=P.W, D=P.D, top=P.ceil; fbx(B,P,'wood',-W/2,0.42,-D/2,W/2,0.5,D/2); fbx(B,P,'cushion',-W/2+0.05,0.5,-D/2+0.05,W/2-0.05,0.58,D/2-0.05);
  for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) fcy(B,P,'metal',0.012,0.012,top-0.5,4,sx*(W/2-0.06),0.5,sz*(D/2-0.06)); };
// alcove (tokonoma): low platform, hanging scroll above, ikebana
FG.tokonoma=(B,P)=>{ const W=P.W, D=P.D; fbx(B,P,'wood',-W/2,0,-D/2,W/2,0.14,D/2); fbx(B,P,'black',-W/2,0.1,D/2-0.04,W/2,0.15,D/2+0.005);
  FG.wallHang(B,Object.assign({},P,{M:mm(P.M,mT(0,1.0,-D/2+0.01)),W:0.55,Hh:1.35,kind:'scroll'})); B.lathe('blueware',[[0,0],[0.08,0.01],[0.1,0.1],[0.05,0.2],[0,0.2]],10,mm(P.M,mT(0.35,0.14,0))); B.ico('maple',0.14,mT(...fat(P,0.35,0.48,0).toArray()),0); };
// wall décor in the wall's frame (origin on the wall at the bottom-centre of the piece, +z out of the wall)
FG.wallHang=(B,P)=>{ const W=P.W, Hh=P.Hh, kind=P.kind;
  if(kind==='scroll'){ B.box('paper',-W/2,0,0.005,W/2,Hh,0.012,P.M); B.box('band',-W/2+0.06,Hh*0.2,0.0135,W/2-0.06,Hh*0.85,0.017,P.M); for(const y of [0,Hh]) B.box('wood',-W/2-0.04,y-0.02,0.0,W/2+0.04,y+0.02,0.04,P.M); return; }
  if(kind==='thangka'){ B.box('cushion',-W/2-0.08,-0.15,0.004,W/2+0.08,Hh+0.1,0.01,P.M); B.box('band',-W/2,0,0.01,W/2,Hh,0.016,P.M); B.box('wood',-W/2-0.12,Hh+0.08,0,W/2+0.12,Hh+0.12,0.04,P.M); return; }
  if(kind==='mirror'){ B.box('gold',-W/2,0,0.004,W/2,Hh,0.03,P.M); B.box('metal',-W/2+0.07,0.07,0.03,W/2-0.07,Hh-0.07,0.035,P.M); return; }
  if(kind==='plates'){ for(let i=0;i<3;i++) B.cyl(i===1?'blueware':'porcelain',0.16,0.16,0.02,16,mm(P.M,mT((i-1)*0.42,Hh/2+(i===1?0.12:0),0.01),mRX(Math.PI/2))); return; }
  if(kind==='painting'){ B.box('gold',-W/2,0,0.004,W/2,Hh,0.04,P.M); if(P.cat==='eu'||P.cat==='rom') B.ext('canvasP',[[-W/2+0.06,0.06],[W/2-0.06,0.06],[W/2-0.06,Hh-0.06],[-W/2+0.06,Hh-0.06]],null,0.005,mm(P.M,mT(0,0,0.04)),(x,y)=>[(x+W/2)/W,y/Hh]); else B.box('band',-W/2+0.06,0.06,0.04,W/2-0.06,Hh-0.06,0.045,P.M); return; }
  // woven hanging (kilim)
  B.ext('rug',[[-W/2,0],[W/2,0],[W/2,Hh],[-W/2,Hh]],null,0.012,mm(P.M,mT(0,0,0.004)),(x,y)=>[(x+W/2)/W,y/Hh]); B.box('wood',-W/2-0.05,Hh-0.02,0,W/2+0.05,Hh+0.02,0.04,P.M); };
// ceiling lamp hung from the ceiling on a rod
FG.hangLamp=(B,P)=>{ const c=P.cat, top=P.ceil, y=top-0.9; fcy(B,P,'iron',0.01,0.01,top-y-0.25,4,0,y+0.25,0);
  if(c==='eu'){ B.torus('metal',0.36,0.025,Math.PI*2,mm(P.M,mT(0,y+0.15,0),mRX(Math.PI/2)),4,20); fcy(B,P,'metal',0.03,0.03,0.12,6,0,y+0.15,0); for(let k=0;k<6;k++){ const a=k/6*Math.PI*2; fcy(B,P,'linen',0.018,0.018,0.12,5,Math.cos(a)*0.36,y+0.17,Math.sin(a)*0.36); fcy(B,P,'glow',0.008,0.008,0.03,4,Math.cos(a)*0.36,y+0.29,Math.sin(a)*0.36); } return; }   // ring chandelier
  if(c==='rom'){ for(let k=0;k<3;k++){ const a=k*2.094; B.segCyl('metal',fat(P,0,y+0.25,0),fat(P,Math.cos(a)*0.12,y,Math.sin(a)*0.12),0.005,0.005,3); } B.sphere('metal',0.11,mm(P.M,mT(0,y-0.03,0),mS(1.5,0.45,0.9)),10,6); fcy(B,P,'glow',0.015,0.015,0.03,5,0.17,y,0); return; }
  if(c==='cn') { B.sphere('lantern',0.24,mm(P.M,mT(0,y,0),mS(1,0.85,1)),10,7); fcy(B,P,'gold',0.1,0.1,0.05,8,0,y+0.18,0); return; }
  if(c==='jp'||c==='kr'||c==='sea') { B.lathe('paper',[[0.08,-0.18],[0.2,-0.1],[0.23,0.02],[0.2,0.15],[0.08,0.22]],10,mm(P.M,mT(0,y,0))); return; }
  fcy(B,P,'metal',0.16,0.06,0.12,8,0,y+0.12,0); fcy(B,P,'glow',0.13,0.13,0.28,8,0,y-0.16,0); B.cone('metal',0.16,0.12,8,mm(P.M,mT(0,y+0.12,0))); fcy(B,P,'metal',0.13,0.06,0.08,8,0,y-0.24,0); };
// desk with books, brush pot or inkwell
FG.desk=(B,P)=>{ const low=P.cat==='jp'||P.cat==='kr'||P.cat==='me'||P.cat==='in'||P.cat==='tb'||P.cat==='sea'; const h=low?0.33:0.8;
  if(low) FG.lowTable(B,Object.assign({},P,{h})); else FG.table(B,Object.assign({},P,{h,decor:false}));
  for(let i=0;i<3;i++) fbx(B,P,i%2?'cushion2':'linen',-P.W/2+0.12,h+i*0.035,-0.1,-P.W/2+0.42,h+i*0.035+0.03,0.12); fcy(B,P,P.cat==='cn'?'porcelain':'metal',0.05,0.05,0.12,8,P.W/2-0.18,h,-0.05); fbx(B,P,'black',0.0,h,0.0,0.16,h+0.02,0.1); };
// shop counter with goods
FG.counter=(B,P)=>{ const W=P.W, D=P.D; fbx(B,P,'wood',-W/2,0,-D/2,W/2,0.9,D/2); fbx(B,P,'wood',-W/2-0.03,0.9,-D/2-0.03,W/2+0.03,0.94,D/2+0.03);
  for(let u=-W/2+0.2;u<W/2-0.1;u+=0.35) B.lathe(P.r.pick(['clay','porcelain','metal']),[[0,0],[0.08,0.01],[0.1,0.1],[0.05,0.18],[0,0.18]],8,mm(P.M,mT(u,0.94,0))); };

/* ---------- what goes in each kind of room ----------
   A recipe is an ordered list (most important first). place: wall (back to a wall), corner, centre, ring (around the last
   centre piece), hang (ceiling), deco (on a free wall). solid pieces block walking and get colliders. */
/* ---------- bathroom, laundry, wardrobe and outhouse kit ---------- */
// close-coupled WC: pedestal bowl, seat, cistern and flush
FG.toilet=(B,P)=>{ const D=P.D; fcy(B,P,'porcelain',0.17,0.13,0.38,14,0,0,D/2-0.3); fcy(B,P,'porcelain',0.2,0.2,0.04,16,0,0.38,D/2-0.3); fcy(B,P,'void',0.13,0.13,0.002,14,0,0.42,D/2-0.3);
  fbx(B,P,'porcelain',-0.19,0.42,-D/2+0.02,0.19,0.8,-D/2+0.2); fbx(B,P,'porcelain',-0.17,0.36,-D/2+0.2,0.17,0.44,D/2-0.42); fcy(B,P,'chrome',0.03,0.03,0.01,10,0,0.8,-D/2+0.11); };
// vanity: a cabinet with a stone top, one or two vessel basins with mixers, a mirror over
FG.vanity=(B,P)=>{ const W=P.W, D=P.D, h=0.86, mod=P.fit==='modern';
  fbx(B,P,mod?'joinery':woodK(P),-W/2,0.12,-D/2,W/2,h-0.04,D/2-0.02); fbx(B,P,'stone',-W/2-0.01,h-0.04,-D/2,W/2+0.01,h,D/2);
  if(mod) for(const sx of [-1,1]) fbx(B,P,'chrome',sx*W/4-0.12,h-0.18,D/2-0.02,sx*W/4+0.12,h-0.165,D/2); else legs4(B,P,woodK(P),W,D,0.12,0.05,0.04);
  const n=W>=1.5?2:1; for(let k=0;k<n;k++){ const bx=n===2?(k?W/4:-W/4):0;
    B.lathe('porcelain',[[0,0],[0.12,0],[0.2,0.06],[0.22,0.14],[0.2,0.15],[0.16,0.06],[0,0.06]],16,mm(P.M,mT(bx,h,0.02)));
    fcy(B,P,'chrome',0.02,0.02,0.22,8,bx,h,-D/2+0.08); fbx(B,P,'chrome',bx-0.012,h+0.19,-D/2+0.07,bx+0.012,h+0.21,-D/2+0.2); }
  fbx(B,P,'chrome',-W/2+0.05,h+0.3,-D/2,W/2-0.05,h+1.15,-D/2+0.02); fbx(B,P,mod?'joinery':'gold',-W/2+0.03,h+0.28,-D/2-0.001,W/2-0.03,h+1.17,-D/2+0.012); };
// small wall-hung hand basin
FG.basin=(B,P)=>{ const W=P.W, D=P.D; B.lathe('porcelain',[[0,0],[0.1,0],[0.18,0.08],[0.19,0.16],[0.16,0.16],[0.12,0.08],[0,0.08]],14,mm(P.M,mT(0,0.7,D/2-0.2)));
  fbx(B,P,'porcelain',-0.12,0.45,-D/2,0.12,0.72,-D/2+0.08); fcy(B,P,'chrome',0.015,0.015,0.2,8,0,0.86,-D/2+0.05); fbx(B,P,'chrome',-W/2+0.04,1.1,-D/2,W/2-0.04,1.65,-D/2+0.015); };
// walk-in shower: tray, glass screens, a rain head on the back wall
FG.shower=(B,P)=>{ const W=P.W, D=P.D, h=2.05; fbx(B,P,'porcelain',-W/2,0,-D/2,W/2,0.05,D/2); fbx(B,P,'chrome',-0.05,0.051,-0.05,0.05,0.053,0.05);
  fbx(B,P,'sglass',-W/2+0.02,0.05,D/2-0.02,W/2-0.36,h,D/2-0.01); for(const sx of [-1,1]) fbx(B,P,'sglass',sx*(W/2-0.02)-0.005,0.05,-D/2+0.02,sx*(W/2-0.02)+0.005,h,D/2-0.02);
  fbx(B,P,'chrome',-W/2+0.02,h-0.03,D/2-0.04,W/2-0.02,h,D/2-0.01); fcy(B,P,'chrome',0.015,0.015,1.9,8,0,0.2,-D/2+0.05); fbx(B,P,'chrome',-0.015,2.05,-D/2+0.05,0.015,2.08,-D/2+0.3); fcy(B,P,'chrome',0.13,0.13,0.02,16,0,2.03,-D/2+0.3);
  fbx(B,P,'chrome',-0.06,1.05,-D/2+0.03,0.06,1.2,-D/2+0.08); };
// bathtub: built-in with a white apron (modern), or a freestanding roll-top on feet (period, enamelled or copper)
FG.bathtub=(B,P)=>{ const W=P.W, D=P.D, h=0.58;
  if(P.fit==='modern'&&!P.free){ fbx(B,P,'porcelain',-W/2,0,-D/2,W/2,h-0.02,D/2); const r=0.07; fbx(B,P,'porcelain',-W/2,h-0.02,-D/2,W/2,h,-D/2+r); fbx(B,P,'porcelain',-W/2,h-0.02,D/2-r,W/2,h,D/2); fbx(B,P,'porcelain',-W/2,h-0.02,-D/2+r,-W/2+r,h,D/2-r); fbx(B,P,'porcelain',W/2-r,h-0.02,-D/2+r,W/2,h,D/2-r);
    fbx(B,P,'water',-W/2+r,h-0.2,-D/2+r,W/2-r,h-0.12,D/2-r); fcy(B,P,'chrome',0.02,0.02,0.14,8,W/2-0.18,h,-D/2+0.04); fbx(B,P,'chrome',W/2-0.19,h+0.12,-D/2+0.03,W/2-0.17,h+0.14,-D/2+0.16); return; }
  const k=P.copper?'metal':'porcelain', T=mm(P.M,mT(0,0.14,0),mS(W/0.8,1,D/0.8)); B.cyl(k,0.4,0.33,0.48,22,T,true); B.cyl(k,0.375,0.31,0.46,22,mm(T,mT(0,0.02,0)),true); B.cyl(k,0.33,0.33,0.02,22,T);
  B.torus(k,0.39,0.022,Math.PI*2,mm(T,mT(0,0.48,0),mRX(Math.PI/2)),6,22); fbx(B,P,'water',-W/2+0.12,0.4,-D/2+0.1,W/2-0.12,0.42,D/2-0.1);
  for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) B.sphere(P.copper?'iron':'metal',0.05,mm(P.M,mT(sx*(W/2-0.16),0.06,sz*(D/2-0.12)))); fcy(B,P,'metal',0.018,0.018,0.42,8,W/2-0.1,0.4,0); };
// hip bath: a copper tub with a high back, for a bath by the fire in a period dressing room
FG.hipBath=(B,P)=>{ FG.bathtub(B,Object.assign({},P,{copper:true,W:Math.min(P.W,1.0),D:Math.min(P.D,0.8)})); fbx(B,P,'metal',-0.32,0.5,-P.D/2+0.02,0.32,1.0,-P.D/2+0.08); fbx(B,P,'linen',-0.3,0.45,P.D/2-0.1,0.3,0.5,P.D/2+0.02); };
// Japanese soaking tub of hinoki boards, and its little stool and bucket
FG.ofuro=(B,P)=>{ const W=P.W, D=P.D, h=0.62, th=0.05; fbx(B,P,'wood',-W/2,0,-D/2,W/2,h,-D/2+th); fbx(B,P,'wood',-W/2,0,D/2-th,W/2,h,D/2); fbx(B,P,'wood',-W/2,0,-D/2+th,-W/2+th,h,D/2-th); fbx(B,P,'wood',W/2-th,0,-D/2+th,W/2,h,D/2-th);
  fbx(B,P,'wood',-W/2+th,0,-D/2+th,W/2-th,0.08,D/2-th); fbx(B,P,'water',-W/2+th,0.45,-D/2+th,W/2-th,0.5,D/2-th); for(const yy of [0.12,0.5]) fbx(B,P,'iron',-W/2-0.006,yy,-D/2-0.006,W/2+0.006,yy+0.03,D/2+0.006); };
// close stool: a lidded box seat (the period WC in a bedroom suite)
FG.commode=(B,P)=>{ const W=P.W, D=P.D, k=woodK(P); fbx(B,P,k,-W/2,0,-D/2,W/2,0.44,D/2); fbx(B,P,k,-W/2-0.01,0.44,-D/2,W/2+0.01,0.47,D/2+0.01); fbx(B,P,k,-W/2,0.47,-D/2,W/2,0.95,-D/2+0.05); for(const sx of [-1,1]) fbx(B,P,k,sx*(W/2-0.02)-0.02,0.47,-D/2,sx*(W/2-0.02)+0.02,0.68,D/2-0.04); };
// heated towel rail
FG.towelRail=(B,P)=>{ const W=P.W; for(const sx of [-1,1]) fcy(B,P,'chrome',0.016,0.016,1.0,8,sx*W/2,0.15,-P.D/2+0.06); for(let k=0;k<5;k++) B.cyl('chrome',0.012,0.012,W,8,mm(P.M,mT(-W/2,0.3+k*0.2,-P.D/2+0.06),mRZ(-Math.PI/2)));
  fbx(B,P,'linen',-W/2+0.06,0.62,-P.D/2+0.03,W/2-0.06,1.12,-P.D/2+0.09); };
// front-loading washer or dryer, and a laundry tub
FG.washer=(B,P)=>{ const W=P.W, D=P.D, h=0.85; fbx(B,P,'porcelain',-W/2,0.02,-D/2,W/2,h,D/2); fbx(B,P,'chrome',-W/2+0.03,h-0.12,D/2,W/2-0.03,h-0.03,D/2+0.008);
  B.torus('chrome',0.19,0.025,Math.PI*2,mm(P.M,mT(0,0.42,D/2+0.01)),6,20); B.cyl(P.dryer?'void':'sglass',0.18,0.18,0.012,20,mm(P.M,mT(0,0.42,D/2),mRX(Math.PI/2))); };
FG.laundryTub=(B,P)=>{ const W=P.W, D=P.D, h=0.9; fbx(B,P,'joinery',-W/2,0.1,-D/2,W/2,h-0.25,D/2); legs4(B,P,'chrome',W,D,0.1,0.04,0.03); fbx(B,P,'chrome',-W/2,h-0.25,-D/2,W/2,h-0.22,D/2);
  for(const [x0,z0,x1,z1] of [[-W/2,-D/2,W/2,-D/2+0.03],[-W/2,D/2-0.03,W/2,D/2],[-W/2,-D/2,-W/2+0.03,D/2],[W/2-0.03,-D/2,W/2,D/2]]) fbx(B,P,'chrome',x0,h-0.22,z0,x1,h,z1);
  fcy(B,P,'chrome',0.02,0.02,0.3,8,0,h,-D/2+0.05); };
// built-in wardrobe: painted carcass, panelled doors and pulls; or an open run: hanging rail, clothes, shelf over, shoes below
FG.wardrobe=(B,P)=>{ const W=P.W, D=P.D, h=Math.min(P.h||2.3,P.ceil?P.ceil-0.05:2.3), k=P.fit==='modern'?'joinery':woodK(P);
  if(P.open){ fbx(B,P,k,-W/2,0,-D/2,-W/2+0.03,h,D/2); fbx(B,P,k,W/2-0.03,0,-D/2,W/2,h,D/2); fbx(B,P,k,-W/2,h-0.35,-D/2,W/2,h-0.32,D/2); fbx(B,P,k,-W/2,0.28,-D/2,W/2,0.31,D/2);
    B.cyl('chrome',0.014,0.014,W-0.06,8,mm(P.M,mT(-W/2+0.03,h-0.45,0),mRZ(-Math.PI/2)));
    const r=P.r, n=Math.max(2,Math.floor((W-0.1)/0.09)); for(let i=0;i<n;i++){ const x=-W/2+0.08+i*(W-0.16)/(n-1), L=r.range(0.7,1.15), cl=r.pick(['cushion','cushion2','linen','linen','black']); fbx(B,P,cl,x-0.025,h-0.48-L,-D/2+0.1,x+0.025,h-0.47,D/2-0.1); }
    for(let i=0;i<Math.floor(W/0.3);i++) fbx(B,P,r.pick(['black','cushion','wood']),-W/2+0.08+i*0.3,0.31,-0.08,-W/2+0.3+i*0.3,0.42,0.18);
    for(let i=0;i<Math.floor(W/0.45);i++) fbx(B,P,r.pick(['linen','cushion2','joinery']),-W/2+0.08+i*0.45,h-0.32,-D/2+0.05,-W/2+0.45+i*0.45,h-0.12,D/2-0.08); return; }
  fbx(B,P,k,-W/2,0,-D/2,W/2,h,D/2-0.02); const n=Math.max(2,Math.round(W/0.55)), dw=W/n;
  for(let i=0;i<n;i++){ const a=-W/2+i*dw+0.006, b=a+dw-0.012; fbx(B,P,k,a,0.06,D/2-0.02,b,h-0.04,D/2); fbx(B,P,k,a+0.06,0.2,D/2,b-0.06,h-0.2,D/2+0.008);
    const px= i%2? a+0.08 : b-0.08; fbx(B,P,P.fit==='modern'?'chrome':'metal',px-0.008,1.0,D/2,px+0.008,1.25,D/2+0.03); } };

/* the outhouse: a board-built privy with a crescent cut in the door and a lean-to roof */
function privyShed(B,x,z,a,k,roofK){ const M=mm(mT(x,0,z),mRY(a)), W=1.3, D=1.5, hf=2.2, hb=1.9, th=0.05;
  B.box(k,-W/2,0,-D/2,W/2,0.12,D/2,M);
  B.ext(k,[[-D/2,0.12],[D/2,0.12],[D/2,hf],[-D/2,hb]],null,th,mm(M,mT(-W/2,0,0),mRY(Math.PI/2),mS(-1,1,1)));
  B.ext(k,[[-D/2,0.12],[D/2,0.12],[D/2,hf],[-D/2,hb]],null,th,mm(M,mT(W/2-th,0,0),mRY(Math.PI/2),mS(-1,1,1)));
  B.box(k,-W/2,0.12,-D/2,W/2,hb,-D/2+th,M);
  // the front: two jambs, a lintel board, and a ledged door with its crescent moon
  B.box(k,-W/2,0.12,D/2-th,-0.36,hf,D/2,M); B.box(k,0.36,0.12,D/2-th,W/2,hf,D/2,M); B.box(k,-0.36,1.98,D/2-th,0.36,hf,D/2,M);
  B.box(k,-0.35,0.14,D/2-0.02,0.35,1.96,D/2+0.01,M); for(const yy of [0.4,1.6]) B.box(k,-0.33,yy,D/2+0.01,0.33,yy+0.1,D/2+0.035,M);
  // crescent = disc r1 minus a disc r2 set off by dd: the outer arc the long way round, the inner arc back
  const r1=0.1, r2=0.085, dd=0.045, ix=(dd*dd+r1*r1-r2*r2)/(2*dd), iy=Math.sqrt(r1*r1-ix*ix), p1=Math.atan2(iy,ix), p2=Math.atan2(iy,ix-dd), cr=[];
  for(let i=0;i<=12;i++){ const t=p1+(Math.PI*2-2*p1)*i/12; cr.push([Math.cos(t)*r1,1.72+Math.sin(t)*r1]); }
  for(let i=1;i<12;i++){ const t=-p2-(Math.PI*2-2*p2)*i/12; cr.push([dd+Math.cos(t)*r2,1.72+Math.sin(t)*r2]); }
  B.flat('void',cr,mm(M,mT(0,0,D/2+0.012))); B.box('iron',0.24,0.98,D/2+0.01,0.27,1.08,D/2+0.04,M);
  // lean-to roof, overhanging front and sides
  const L=Math.hypot(D+0.35,hf-hb), ang=Math.atan2(hf-hb,D+0.35); B.box(roofK,-W/2-0.12,-0.03,-L/2,W/2+0.12,0.03,L/2,mm(M,mT(0,(hf+hb)/2+0.06,0.05),mRX(-ang)));
  return [W,D]; }
function waterButt(B,x,z){ B.lathe('wood',[[0,0],[0.28,0],[0.32,0.2],[0.33,0.45],[0.32,0.7],[0.28,0.9],[0,0.9]],14,mT(x,0,z)); for(const yy of [0.12,0.45,0.78]) B.torus('iron',0.322,0.012,Math.PI*2,mm(mT(x,yy,z),mRX(Math.PI/2)),5,18);
  B.cyl('water',0.27,0.27,0.02,14,mT(x,0.84,z)); }
function woodpile(B,x,z,a,r){ const M=mm(mT(x,0,z),mRY(a)); for(let row=0;row<4;row++){ const n=5-row; for(let i=0;i<n;i++){ const rr=r.range(0.07,0.1);
  B.cyl('trunk',rr,rr,r.range(0.5,0.6),7,mm(M,mT(-0.5+row*0.1+i*0.2+r.range(-.02,.02),0.09+row*0.17,-0.28),mRX(Math.PI/2))); } }
  B.cyl('trunk',0.2,0.22,0.42,10,mm(M,mT(0.75,0,0.1))); }
function washLine(B,x0,z0,x1,z1,r){ for(const [x,z] of [[x0,z0],[x1,z1]]){ B.cyl('wood',0.04,0.05,2.0,6,mT(x,0,z)); B.box('wood',-0.3,1.86,-0.025,0.3,1.92,0.025,mm(mT(x,0,z),mRY(Math.atan2(x1-x0,z1-z0)))); }
  const L=Math.hypot(x1-x0,z1-z0), a=Math.atan2(x1-x0,z1-z0); B.cyl('iron',0.006,0.006,L,4,mm(mT(x0,1.86,z0),mRY(a),mRX(Math.PI/2)));
  for(let i=0;i<3;i++){ const f=0.25+i*0.25, w=r.range(0.4,0.7); B.box(r.pick(['linen','cushion','cushion2']),-w/2,-r.range(0.6,0.9),-0.005,w/2,0,0.005,mm(mT(x0+(x1-x0)*f,1.85,z0+(z1-z0)*f),mRY(a+Math.PI/2))); } }

function roomFunction(name,ty){ const n=(name||'').toLowerCase();
  if(ty===IWAN) return 'hall';
  if(/kitchen|matbakh|rasoda|daidokoro|bueok|paon|chufang|thab-tsang|baiga/.test(n)) return 'kitchen';
  if(/store|makhzan|dhukuti|tsang —|jineng|granary|kotha — store|larder|pantry|buttery|cellar/.test(n)) return 'store';
  if(/prayer|pooja|shrine|altar|chapel|lhakhang|chö-khang|butsuma|ho phra|gedong|assembly hall/.test(n)) return 'shrine';
  if(/study|shufang|sarangbang|library/.test(n)) return 'study';
  if(/dining|triclinium/.test(n)) return 'dining';
  if(/shop|mise-no-ma|pasa/.test(n)) return 'shop';
  if(/bed|sleep|ghurfa|anbang|zim-chung|ruean non|zenana|xiuge|chamber|mahal|meten|loteng|numaru|nikai|mushiko|darak|chota|xiangfang|ermengfang/.test(n)) return 'bed';
  return 'reception'; }
/* the rooms of a bedroom suite or a bathroom module. FIT: 'modern' (plumbed: WC, basin, shower, bath) or 'period'
   (washstand, close stool, hip bath; a wooden ofuro in Japan) */
let FIT='period';
const SUITE_FN=new Set(['suiteBed','wir','ensuite','bathroom','wc','laundry']);
function suiteRecipe(fn,cat,st,rw,rd,r){ const L=[], add=(g,place,o)=>L.push(Object.assign({g,place,fit:FIT},o)), mod=FIT==='modern', big=Math.max(rw,rd), small=Math.min(rw,rd);
  switch(fn){
    case 'suiteBed': return furnRecipe('bed',cat,st,rw,rd,r).filter(it=>it.g!=='cabinet'&&it.g!=='washstand'&&!(it.g==='shelf'&&it.tall)).map(it=>Object.assign(it,{fit:FIT}));
    case 'wir':
      if(mod){ add('wardrobe','wall',{W:Math.min(2.4,big-0.4),D:0.6,h:2.3,solid:true,tall:true,open:true}); add('wardrobe','wall',{W:Math.min(1.8,big-0.4),D:0.6,h:2.3,solid:true,tall:true}); add('wardrobe','wall',{W:1.2,D:0.6,h:2.3,solid:true,tall:true,open:true}); }
      else { add('cabinet','wall',{W:1.2,D:0.6,h:2.1,solid:true,tall:true}); add('cabinet','wall',{W:1.1,D:0.6,h:2.0,solid:true,tall:true}); add('chest','wall',{W:1.0,D:0.55,h:0.6,solid:true}); }
      if(small>=2.4) add('bench','centre',{W:1.0,D:0.42,h:0.45,solid:true,low:true});
      add('hangLamp','hang',{}); add('wallHang','deco',{n:1,kind:'mirror'}); return L;
    case 'ensuite':
      if(mod){ add('shower','corner',{W:1.0,D:1.0,h:2.1,solid:true,tall:true}); add('vanity','wall',{W:big>=3.2?1.6:1.1,D:0.55,h:2.0,solid:true}); add('toilet','wall',{W:0.5,D:0.72,h:0.8,solid:true,low:true});
        if(big>=3.0) add('bathtub','wall',{W:1.7,D:0.78,h:0.6,solid:true,low:true,free:r.chance(.35)}); add('towelRail','wall',{W:0.6,D:0.12,h:1.15,low:true}); }
      else { add('washstand','wall',{W:0.85,D:0.5,h:1.1,solid:true}); add(cat==='jp'?'ofuro':'hipBath',cat==='jp'?'corner':'wall',{W:1.0,D:0.8,h:0.7,solid:true,low:true}); add('commode','wall',{W:0.55,D:0.5,h:0.95,solid:true});
        if(cat==='cn'||cat==='jp'||cat==='kr'||cat==='eu') add('screen','corner',{W:1.4,D:0.3,h:1.6,tall:true,n:4,solid:true}); }
      add('hangLamp','hang',{}); return L;
    case 'bathroom':
      add('bathtub','wall',{W:1.8,D:0.8,h:0.6,solid:true,low:true,free:r.chance(.5)}); add('shower','corner',{W:1.1,D:1.1,h:2.1,solid:true,tall:true}); add('vanity','wall',{W:Math.min(1.8,big-0.6),D:0.55,h:2.0,solid:true});
      add('towelRail','wall',{W:0.7,D:0.12,h:1.15,low:true}); if(r.chance(.6)) add('plant','corner',{W:0.5,D:0.5,h:0.9}); add('hangLamp','hang',{}); return L;
    case 'wc': add('toilet','wall',{W:0.5,D:0.72,h:0.8,solid:true,low:true}); add('basin','wall',{W:0.5,D:0.36,h:1.7}); add('hangLamp','hang',{}); return L;
    case 'laundry': add('washer','wall',{W:0.62,D:0.62,h:0.86,solid:true}); add('washer','wall',{W:0.62,D:0.62,h:0.86,solid:true,dryer:true});
      add('laundryTub','wall',{W:0.65,D:0.55,h:0.9,solid:true}); add('wardrobe','wall',{W:0.9,D:0.55,h:2.2,solid:true,tall:true}); add('stores','corner',{W:0.9,D:0.9,h:0.6,solid:true,n:3}); add('hangLamp','hang',{}); return L; }
  return L; }
function furnRecipe(fn,cat,st,rw,rd,r){ if(SUITE_FN.has(fn)) return suiteRecipe(fn,cat,st,rw,rd,r);
  const L=[], add=(g,place,o)=>L.push(Object.assign({g,place},o)), big=Math.min(rw,rd), seat=FURN_SEAT[st.id]||'majlis';
  const floorSeat=cat==='me'||cat==='in'||cat==='tb', eu=cat==='eu', rom=cat==='rom', rugOK=cat==='me'||cat==='in'||cat==='tb'||eu, fire=eu&&st.id!=='cycladic'&&st.id!=='russian';
  if(fn==='dining'&&!eu&&!rom) fn='reception';
  if(eu||rom){ const euRecipe=()=>{ switch(fn){
    case 'hall': case 'reception':
      if(rom){ add('lararium','wall',{W:1.0,D:0.45,h:2.2,solid:true,tall:true}); add('table','centre',{W:1.1,D:0.7,h:0.78,solid:true,decor:true}); add('chest','wall',{W:1.0,D:0.6,h:0.7,solid:true}); add('couch','wall',{W:2.0,D:0.9,h:0.95,solid:true,low:true}); add('brazier','corner',{W:0.6,D:0.6,h:0.9,solid:true}); add('floorLamp','corner',{W:0.4,D:0.4,h:1.5,solid:true}); add('hangLamp','hang',{}); add('wallHang','deco',{n:1}); return; }
      if(st.id==='russian'){ add('pech','corner',{W:1.6,D:1.6,h:2.0,solid:true,tall:true}); add('bench','wall',{W:Math.min(2.6,rw*0.6),D:0.42,h:0.45,solid:true,low:true}); add('table','centre',{W:1.4,D:0.8,h:0.78,solid:true,decor:true}); add('bench','wall',{W:Math.min(2.2,rw*0.5),D:0.42,h:0.45,solid:true,low:true});
        add('iconCase','corner',{W:0.5,D:0.5,h:0.4,low:true}); add('chest','wall',{W:1.0,D:0.55,h:0.62,solid:true}); add('rug','centre',{W:Math.min(3.0,rw-1.8),D:Math.min(1.0,rd-1.8),h:0.02,low:true,floor:true}); add('hangLamp','hang',{}); add('wallHang','deco',{n:1}); return; }
      if(fire){ add('fireplace','wall',{W:1.6,D:0.5,h:1.3,solid:true}); add('lowTable','front',{W:0.9,D:0.6,h:0.45,solid:true,decor:true}); add('chair','beside',{W:0.6,D:0.55,h:1.1,solid:true,arms:true}); }
      else { add('bench','wall',{W:Math.min(2.4,rw*0.6),D:0.5,h:0.45,solid:true,low:true}); add('table','centre',{W:1.1,D:0.75,h:0.76,solid:true,decor:true}); add('chair','ring',{n:2,W:0.6,D:0.55}); }
      add('rug','centre',{W:Math.min(3.6,rw-1.8),D:Math.min(2.6,rd-1.8),h:0.02,low:true,floor:true});
      add('sofa','wall',{W:Math.min(2.0,rw*0.5),D:0.85,h:0.9,solid:true}); add('cabinet','wall',{W:1.1,D:0.45,h:1.9,solid:true,tall:true}); add('shelf','wall',{W:1.1,D:0.38,h:1.9,solid:true,tall:true,books:true});
      add('floorLamp','corner',{W:0.4,D:0.4,h:1.6,solid:true}); if(r.chance(.6)) add('plant','corner',{W:0.5,D:0.5,h:0.9}); add('hangLamp','hang',{}); add('wallHang','deco',{n:2}); return;
    case 'dining':
      if(rom){ add('table','centre',{W:0.9,D:0.9,h:0.55,solid:true,decor:true}); for(let i=0;i<3;i++) add('couch','wall',{W:Math.min(2.2,rw*0.6),D:1.0,h:0.95,solid:true,low:true}); add('floorLamp','corner',{W:0.4,D:0.4,h:1.5,solid:true}); add('hangLamp','hang',{}); add('wallHang','deco',{n:2}); return; }   // the triclinium: three couches round a table
      add('table','centre',{W:Math.min(2.2,rw-2.2),D:Math.min(1.0,rd-2.2),h:0.78,solid:true,decor:true}); add('chair','ring',{n:4,W:0.56,D:0.52}); add('cabinet','wall',{W:1.6,D:0.5,h:0.95,solid:true}); if(fire) add('fireplace','wall',{W:1.5,D:0.5,h:1.25,solid:true});
      add('shelf','wall',{W:1.2,D:0.4,h:1.9,solid:true,tall:true}); add('hangLamp','hang',{}); add('wallHang','deco',{n:2}); return;
    case 'bed':
      add('bed','wall',{W:1.5,D:2.1,h:st.id==='tudor'?2.4:1.1,solid:true,tall:st.id==='tudor',kind:rom?'plain':st.id==='tudor'?'fourposter':'raised'}); add('chest','front',{W:1.1,D:0.5,h:0.55,solid:true});
      if(rom){ add('brazier','corner',{W:0.6,D:0.6,h:0.9,solid:true}); add('hangLamp','hang',{}); return; }
      add('cabinet','wall',{W:1.1,D:0.55,h:2.0,solid:true,tall:true}); add('washstand','wall',{W:0.8,D:0.5,h:1.1,solid:true}); add('chair','corner',{W:0.6,D:0.55,h:1.1,solid:true});
      add('rug','centre',{W:Math.min(2.0,rw-1.8),D:Math.min(1.2,rd-1.8),h:0.02,low:true,floor:true}); add('hangLamp','hang',{}); add('wallHang','deco',{n:1}); return;
    case 'kitchen':
      add('stove','wall',{W:st.id==='russian'?1.6:1.7,D:st.id==='russian'?1.6:0.75,h:1.6,solid:true,tall:true}); add('workTable','centre',{W:1.5,D:0.8,h:0.8,solid:true}); add('shelf','wall',{W:1.3,D:0.4,h:1.8,solid:true,tall:true});
      add('stores','corner',{W:1.2,D:1.2,h:0.7,solid:true,n:4}); if(rom) add('stores','wall',{W:1.6,D:0.8,h:0.8,solid:true,n:4}); add('hangLamp','hang',{}); return;
    case 'shrine':
      if(rom){ add('lararium','wall',{W:1.1,D:0.45,h:2.2,solid:true,tall:true}); add('brazier','front',{W:0.6,D:0.6,h:0.9,solid:true}); add('hangLamp','hang',{}); return; }
      if(st.id==='russian'){ add('iconCase','corner',{W:0.5,D:0.5,h:0.4,low:true}); add('bench','wall',{W:Math.min(2.4,rw*0.6),D:0.42,h:0.45,solid:true,low:true}); add('floorLamp','corner',{W:0.4,D:0.4,h:1.6,solid:true}); add('hangLamp','hang',{}); return; }
      add('altarTable','wall',{W:Math.min(2.0,rw*0.5),D:0.6,h:0.95,solid:true}); add('bench','centre',{W:Math.min(2.2,rw-2),D:0.4,h:0.45,solid:true,low:true}); add('floorLamp','corner',{W:0.4,D:0.4,h:1.6,solid:true}); add('hangLamp','hang',{}); add('wallHang','deco',{n:1}); return;
    case 'study':
      add('desk','wall',{W:1.3,D:0.65,h:0.8,solid:true}); add('chair','front',{W:0.6,D:0.55,h:1.1,solid:true}); add('shelf','wall',{W:1.4,D:0.4,h:1.9,solid:true,tall:true,books:true}); add('shelf','wall',{W:1.0,D:0.4,h:1.9,solid:true,tall:true,books:true});
      if(!rom) add('rug','centre',{W:Math.min(2.6,rw-1.8),D:Math.min(1.8,rd-1.8),h:0.02,low:true,floor:true}); add('floorLamp','corner',{W:0.4,D:0.4,h:1.6,solid:true}); add('hangLamp','hang',{}); add('wallHang','deco',{n:1}); return;
    case 'shop': add('counter','wall',{W:Math.min(2.6,rw*0.6),D:0.6,h:0.95,solid:true}); add('shelf','wall',{W:1.4,D:0.45,h:1.9,solid:true,tall:true}); add('stores','corner',{W:1.2,D:1.2,h:0.8,solid:true,n:4}); add('hangLamp','hang',{}); return;
    case 'store': for(let i=0;i<3;i++) add('stores','corner',{W:1.4,D:1.4,h:0.8,solid:true,n:5}); add('shelf','wall',{W:1.6,D:0.45,h:1.9,solid:true,tall:true}); add('stores','wall',{W:2.0,D:0.9,h:0.8,solid:true,n:5}); return; } };
    euRecipe(); return L; }
  const seating=(n)=>{ for(let i=0;i<n;i++){ if(cat==='me') add(seat,'wall',{W:Math.min(3.4,rw*0.8),D:seat==='sedir'?0.8:0.75,h:seat==='sedir'?0.95:0.6,low:true});
      else if(cat==='in') add('majlis','wall',{W:Math.min(3.2,rw*0.75),D:0.8,h:0.55,low:true});
      else if(cat==='tb') add('majlis','wall',{W:Math.min(3.0,rw*0.75),D:0.75,h:0.85,low:true,solid:true}); } };
  switch(fn){
    case 'hall': case 'reception':
      if(rugOK) add('rug','centre',{W:Math.min(4.2,rw-1.6),D:Math.min(3.0,rd-1.6),h:0.02,low:true,floor:true});
      if(floorSeat){ seating(fn==='hall'?3:r.int(2,3)); add(cat==='me'?'trayTable':'lowTable','centre',{W:cat==='me'?0.8:1.1,D:cat==='me'?0.8:0.6,h:0.42,solid:false,low:true,decor:true});
        if(st.id==='haveli'&&r.chance(.6)) add('swing','centre',{W:1.4,D:0.7,h:0.6,solid:true,hangs:true}); }
      else if(cat==='cn'){ add('altarTable','wall',{W:Math.min(2.4,rw*0.5),D:0.48,h:0.95,solid:true,set:'hall'}); add('table','front',{W:0.9,D:0.9,h:0.82,solid:true,decor:true}); add('chair','beside',{W:0.6,D:0.55,h:1.1,solid:true,arms:true});
        add('chair','wall',{W:0.6,D:0.55,h:1.1,solid:true,arms:true,pair:true}); add('chair','wall',{W:0.6,D:0.55,h:1.1,solid:true,arms:true,pair:true}); }
      else if(cat==='jp'){ add('tokonoma','wall',{W:Math.min(1.9,rw*0.45),D:0.6,h:2.4,low:true,tall:true}); add('lowTable','centre',{W:1.1,D:0.75,h:0.33,low:true,decor:true}); add('cushion','ring',{n:4}); }
      else if(cat==='kr'){ add('screen','wall',{W:Math.min(2.6,rw*0.55),D:0.35,h:1.6,tall:true,n:6}); add('lowTable','centre',{W:0.7,D:0.7,h:0.3,round:true,low:true,decor:true}); add('cushion','ring',{n:3,W:0.6,D:0.6}); }
      else if(cat==='sea'){ add('cushion','wall',{W:Math.min(2.4,rw*0.6),D:0.6,h:0.5,low:true,line:true}); add('trayTable','centre',{W:0.7,D:0.7,h:0.3,low:true}); }
      add('chest','wall',{W:1.0,D:0.55,h:0.62,solid:true}); if(cat==='cn'||cat==='jp'||cat==='tb') add('cabinet','wall',{W:1.0,D:0.5,h:1.8,solid:true,tall:true,step:cat==='jp'});
      add('floorLamp','corner',{W:0.4,D:0.4,h:1.2,solid:true}); add('vase','corner',{W:0.45,D:0.45,h:1.1,solid:true,flowers:true}); if(r.chance(.5)) add('plant','corner',{W:0.5,D:0.5,h:0.9});
      add('hangLamp','hang',{}); add('wallHang','deco',{n:2}); break;
    case 'bed':
      if(st.id==='maya') add('hammock','centre',{W:Math.min(3.2,rw-0.8),D:0.9,h:1.9,low:true});
      else if(st.id==='pueblo'||st.id==='palau') add('bed','wall',{W:1.0,D:2.0,h:0.2,low:true,kind:'futon'});
      else if(cat==='jp'||cat==='kr') add('bed','wall',{W:1.1,D:2.1,h:0.2,low:true,kind:'futon'});
      else if(cat==='cn') add('bed','wall',{W:1.6,D:2.2,h:2.3,solid:true,tall:true,kind:'canopy'});
      else if(cat==='in') add('bed','wall',{W:1.0,D:2.0,h:0.55,solid:true,kind:'charpai'});
      else if(st.id==='bali') add('bed','wall',{W:1.5,D:2.1,h:1.9,solid:true,tall:true,kind:'platform'});
      else if(st.id==='najdi'||st.id==='khaleeji'||st.id==='sanaani'||cat==='tb') add('majlis','wall',{W:2.0,D:1.0,h:0.6,low:true});
      else add('bed','wall',{W:1.5,D:2.1,h:1.1,solid:true,kind:'raised'});
      if(rugOK) add('rug','centre',{W:Math.min(2.4,rw-1.8),D:Math.min(1.6,rd-1.8),h:0.02,low:true,floor:true});
      add('chest','wall',{W:1.0,D:0.55,h:0.62,solid:true}); add(cat==='jp'?'cabinet':'shelf','wall',{W:1.0,D:0.4,h:1.7,solid:true,tall:true,step:cat==='jp'});
      if(cat==='cn'||cat==='kr'||cat==='jp') add('screen','corner',{W:1.6,D:0.35,h:1.6,tall:true,n:4,solid:true});
      add('floorLamp','corner',{W:0.4,D:0.4,h:1.2,solid:true}); add('hangLamp','hang',{}); add('wallHang','deco',{n:1}); break;
    case 'kitchen':
      add('stove','wall',{W:1.3,D:0.75,h:0.85,solid:true}); add('workTable','wall',{W:1.4,D:0.65,h:0.8,solid:true}); add('shelf','wall',{W:1.2,D:0.4,h:1.7,solid:true,tall:true});
      add('stores','corner',{W:1.2,D:1.2,h:0.7,solid:true,n:4}); add('stores','corner',{W:1.0,D:1.0,h:0.7,solid:true,n:3}); add('hangLamp','hang',{}); break;
    case 'store': for(let i=0;i<3;i++) add('stores','corner',{W:1.4,D:1.4,h:0.8,solid:true,n:5}); add('shelf','wall',{W:1.6,D:0.45,h:1.9,solid:true,tall:true}); add('stores','wall',{W:2.0,D:0.9,h:0.8,solid:true,n:5}); break;
    case 'shrine':
      add('altar','wall',{W:Math.min(2.0,rw*0.5),D:cat==='jp'?0.55:0.9,h:cat==='jp'?1.5:1.8,solid:true,tall:cat!=='in'});
      if(rugOK) add('rug','centre',{W:Math.min(3,rw-1.8),D:Math.min(2.2,rd-1.8),h:0.02,low:true,floor:true});
      if(cat==='tb') seating(2); else add('cushion','front',{W:0.6,D:0.6,low:true});
      add('floorLamp','corner',{W:0.4,D:0.4,h:1.2,solid:true}); add('floorLamp','corner',{W:0.4,D:0.4,h:1.2,solid:true}); add('vase','corner',{W:0.45,D:0.45,h:1.1,solid:true,flowers:true});
      add('hangLamp','hang',{}); add('wallHang','deco',{n:2,kind:cat==='tb'||cat==='in'?'thangka':null}); break;
    case 'study':
      add('desk','wall',{W:1.3,D:0.65,h:0.8,solid:true}); add('shelf','wall',{W:1.4,D:0.4,h:1.9,solid:true,tall:true,books:true}); add('shelf','wall',{W:1.0,D:0.4,h:1.9,solid:true,tall:true,books:true});
      if(rugOK) add('rug','centre',{W:Math.min(2.6,rw-1.8),D:Math.min(1.8,rd-1.8),h:0.02,low:true,floor:true});
      add('vase','corner',{W:0.45,D:0.45,h:1.1,solid:true,flowers:true}); add('hangLamp','hang',{}); add('wallHang','deco',{n:1,kind:cat==='cn'||cat==='jp'||cat==='kr'?'scroll':null}); break;
    case 'shop': add('counter','wall',{W:Math.min(2.6,rw*0.6),D:0.6,h:0.95,solid:true}); add('shelf','wall',{W:1.4,D:0.45,h:1.9,solid:true,tall:true}); add('stores','corner',{W:1.2,D:1.2,h:0.8,solid:true,n:4}); add('hangLamp','hang',{}); break;
  }
  return L; }
