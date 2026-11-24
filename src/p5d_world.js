
/* ============================================================
   WORLD — Europe, Africa, the Americas and the Pacific.
   Slate, shingle and plain-tile roofs, log and timber walls, chimney stacks, bargeboards and ridge cresting,
   turrets, tent roofs, mud minarets, temple pyramids, pergolas and gazebos, impluvia, stone money and stelae.
   ============================================================ */
const WORLD_TOWERS=new Set(['romtower','saatkule','turret','tudorturret','belfry','tentroof','sahelmin','mayapyramid','pueblotower','lookout']);
const WORLD_KIOSKS=new Set(['pergola','gazebo','palapa']);
const WORLD_FEATS=new Set(['impluvium','castfount','knot','crane','dovecote','granary','stela','horno','rai']);
// how tall each tower stands, in storeys, when it rises from the ground; and which ones stand free in their square
const WORLD_TOWER_H={romtower:1.7, saatkule:2.4, turret:1.75, tudorturret:1.6, belfry:1.7, tentroof:2.5, sahelmin:2.4, mayapyramid:1.9, pueblotower:1.35, lookout:1.5};
const WORLD_FREE=new Set(['mayapyramid','tentroof','lookout','belfry']);
const hexK=(h,k)=>'#'+hx(h).map(v=>clamp(Math.round(v*k),0,255).toString(16).padStart(2,'0')).join('');

/* ---------- textures ---------- */
// roofs: v runs up the slope, so each course's exposed lower edge sits at the bottom of its row
function texRoofTilesWorld(spec,rng){
  const W=256, c=cvs(W,W), g=c.getContext('2d'), base=spec.c;
  if(spec.kind==='slate'){ g.fillStyle=shade(base,.4); g.fillRect(0,0,W,W); const rows=5, rh=W/rows, cols=4, cw=W/cols;
    for(let r=0;r<rows;r++){ const off=(r%2)*cw/2, fish=r===2, y=r*rh;
      for(let q=-1;q<=cols;q++){ const x=q*cw+off, k=rng.range(.82,1.12); const gr=g.createLinearGradient(0,y,0,y+rh); gr.addColorStop(0,shade(base,k*1.08)); gr.addColorStop(1,shade(base,k*.78)); g.fillStyle=gr;
        g.beginPath(); if(fish){ g.moveTo(x+1,y); g.lineTo(x+cw-1,y); g.lineTo(x+cw-1,y+rh*0.5); g.ellipse(x+cw/2,y+rh*0.5,cw/2-1,rh*0.48,0,0,Math.PI); g.closePath(); } else g.rect(x+1,y,cw-2,rh-2); g.fill();
        g.fillStyle='rgba(255,255,255,.05)'; g.fillRect(x+3,y+2,cw-8,3); } }
    speck(g,W,W,rng,500,['rgba(0,0,0,.12)','rgba(255,255,255,.06)'],1,2); return c; }
  if(spec.kind==='plain'){ g.fillStyle=shade(base,.5); g.fillRect(0,0,W,W); const rows=10, rh=W/rows, cols=9, cw=W/cols;
    for(let r=0;r<rows;r++){ const off=(r%2)*cw/2, y=r*rh;
      for(let q=-1;q<=cols;q++){ const x=q*cw+off, k=rng.range(.78,1.15); const gr=g.createLinearGradient(x,0,x+cw,0); gr.addColorStop(0,shade(base,.8*k)); gr.addColorStop(.5,shade(base,1.08*k)); gr.addColorStop(1,shade(base,.78*k)); g.fillStyle=gr; g.fillRect(x+1,y,cw-2,rh-2.5);
        g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(x+1,y+rh-3,cw-2,1.5); } }
    for(let i=0;i<90;i++){ g.fillStyle=`rgba(${rng.chance(.5)?'95,110,50':'60,70,40'},${rng.range(.15,.35)})`; g.beginPath(); g.ellipse(rng.f()*W,rng.f()*W,rng.range(2,7),rng.range(1,4),0,0,7); g.fill(); }   // moss and lichen
    return c; }
  if(spec.kind==='shingle'){ g.fillStyle=shade(base,.45); g.fillRect(0,0,W,W); const rows=8, rh=W/rows, cols=8, cw=W/cols;
    for(let r=0;r<rows;r++){ const off=(r%2)*cw/2, y=r*rh;
      for(let q=-1;q<=cols;q++){ const x=q*cw+off, k=rng.range(.8,1.15); g.fillStyle=shade(base,k);
        g.beginPath(); g.moveTo(x+1,y); g.lineTo(x+cw-1,y); g.lineTo(x+cw-1,y+rh*0.62); g.lineTo(x+cw/2,y+rh-1); g.lineTo(x+1,y+rh*0.62); g.closePath(); g.fill();   // spade-ended lemekh
        for(let j=0;j<3;j++){ g.strokeStyle=`rgba(40,30,20,${rng.range(.1,.22)})`; g.lineWidth=1; g.beginPath(); const xx=x+rng.range(4,cw-4); g.moveTo(xx,y); g.lineTo(xx+rng.range(-2,2),y+rh*0.7); g.stroke(); } } }
    return c; }
  return null;
}
// round pine logs laid in courses, with knots and pale chinking between them
function texLogs(base,rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=shade(base,.35); g.fillRect(0,0,W,W); const n=14, rh=W/n;
  for(let i=0;i<n;i++){ const y=i*rh, k=rng.range(.86,1.12); const gr=g.createLinearGradient(0,y,0,y+rh); gr.addColorStop(0,shade(base,.55*k)); gr.addColorStop(.3,shade(base,1.12*k)); gr.addColorStop(.62,shade(base,.98*k)); gr.addColorStop(1,shade(base,.5*k)); g.fillStyle=gr; g.fillRect(0,y+1,W,rh-2);
    for(let j=0;j<7;j++){ g.strokeStyle=`rgba(40,25,10,${rng.range(.08,.2)})`; g.lineWidth=1; g.beginPath(); const yy=y+rng.range(3,rh-3), x0=rng.f()*W; g.moveTo(x0,yy); g.lineTo(x0+rng.range(30,120),yy+rng.range(-1,1)); g.stroke(); }
    for(let j=0;j<2;j++){ g.fillStyle='rgba(50,30,15,.4)'; g.beginPath(); g.ellipse(rng.f()*W,y+rh/2,rng.range(2,4),rng.range(1.5,3),0,0,7); g.fill(); }
    g.fillStyle='rgba(200,190,165,.45)'; g.fillRect(0,y+rh-2,W,1.5); }
  return c; }
function wallCanvasWorld(spec,rng){ if(spec.tex==='logs') return texLogs(spec.c,rng); return null; }
// friezes (1024 × 128)
function drawBandWorld(type,pal,rng){
  if(!['stepfret','story','dentil','rushnik'].includes(type)) return null;
  const W=1024,H=128, c=cvs(W,H), g=c.getContext('2d'); g.fillStyle=pal.bg; g.fillRect(0,0,W,H);
  if(type==='stepfret'){ // Puuc stepped fret: a stair of blocks rising into a square spiral
    for(let x=0;x<W;x+=128){ g.fillStyle=pal.a; for(let s=0;s<4;s++) g.fillRect(x+s*16,H-16-(s+1)*20,16,(s+1)*20);
      g.strokeStyle=pal.a; g.lineWidth=12; g.lineCap='square'; g.beginPath(); g.moveTo(x+64,30); g.lineTo(x+118,30); g.lineTo(x+118,H-22); g.lineTo(x+84,H-22); g.lineTo(x+84,62); g.lineTo(x+102,62); g.lineTo(x+102,82); g.stroke(); }
    g.fillStyle=pal.b||pal.a; g.fillRect(0,0,W,8); g.fillRect(0,H-8,W,8); return c; }
  if(type==='dentil'){ for(let x=0;x<W;x+=32){ g.fillStyle=shade(pal.bg,.62); g.fillRect(x+6,34,20,58); g.fillStyle=shade(pal.bg,1.05); g.fillRect(x+4,32,20,56); }
    g.fillStyle=pal.a; g.fillRect(0,0,W,18); g.fillStyle=shade(pal.bg,.7); g.fillRect(0,18,W,5); g.fillStyle=pal.a; g.fillRect(0,H-22,W,22); return c; }
  if(type==='rushnik'){ // cross-stitched towel embroidery: rhombs, crosses and a running border
    g.fillStyle=pal.a; for(let x=0;x<W;x+=8){ if((x/8)%2) g.fillRect(x,6,8,8), g.fillRect(x,H-14,8,8); }
    for(let x=32;x<W;x+=128){ const cy=H/2; g.strokeStyle=pal.a; g.lineWidth=7; g.beginPath(); g.moveTo(x,cy-40); g.lineTo(x+40,cy); g.lineTo(x,cy+40); g.lineTo(x-40,cy); g.closePath(); g.stroke();
      g.fillStyle=pal.b; g.beginPath(); g.moveTo(x,cy-16); g.lineTo(x+16,cy); g.lineTo(x,cy+16); g.lineTo(x-16,cy); g.fill();
      g.fillStyle=pal.a; g.fillRect(x+60,cy-22,8,44); g.fillRect(x+42,cy-4,44,8); }
    return c; }
  // storyboard: canoes, fish and figures in red ochre, black and white between zigzag borders
  const zig=(y,col)=>{ g.fillStyle=col; for(let x=0;x<W;x+=24){ g.beginPath(); g.moveTo(x,y); g.lineTo(x+12,y+12); g.lineTo(x+24,y); g.fill(); } };
  g.fillStyle=pal.b; g.fillRect(0,0,W,14); g.fillRect(0,H-14,W,14); zig(14,pal.c||'#efe6d2');
  const fig=(x,y,s)=>{ g.fillStyle=pal.b; g.beginPath(); g.arc(x,y-30*s,6*s,0,7); g.fill(); g.fillStyle=pal.a; g.beginPath(); g.moveTo(x-9*s,y-4*s); g.lineTo(x+9*s,y-4*s); g.lineTo(x,y-24*s); g.fill(); g.strokeStyle=pal.b; g.lineWidth=3*s; g.beginPath(); g.moveTo(x-5*s,y-4*s); g.lineTo(x-8*s,y+8*s); g.moveTo(x+5*s,y-4*s); g.lineTo(x+8*s,y+8*s); g.stroke(); };
  for(let x=60;x<W;x+=170){ const k=(x/170|0)%3;
    if(k===0){ g.fillStyle=pal.b; g.beginPath(); g.moveTo(x-55,H*0.62); g.quadraticCurveTo(x,H*0.92,x+55,H*0.62); g.quadraticCurveTo(x,H*0.76,x-55,H*0.62); g.fill(); for(const p of [-26,0,26]) fig(x+p,H*0.68,0.75); }
    else if(k===1){ for(const p of [-34,0,34]) fig(x+p,H*0.8,1); }
    else { g.fillStyle=pal.a; g.beginPath(); g.ellipse(x,H*0.58,34,14,0,0,7); g.fill(); g.beginPath(); g.moveTo(x+30,H*0.58); g.lineTo(x+50,H*0.44); g.lineTo(x+50,H*0.72); g.fill(); g.fillStyle=pal.c||'#efe6d2'; g.beginPath(); g.arc(x-18,H*0.55,4,0,7); g.fill(); } }
  return c;
}
// all-over patterns (tile panels, stained glass, the pattern swatch) → {c, aspect}
function drawPatternWorld(fam,pal,rng){
  const W=512, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=pal.bg; g.fillRect(0,0,W,W);
  if(fam==='encaustic'){ // Victorian geometric floor: octagons and small squares
    const u=W/4; for(let i=0;i<4;i++) for(let j=0;j<4;j++){ const x=i*u, y=j*u, e=u*0.29;
      g.fillStyle=pal.star||pal.a; g.beginPath(); g.moveTo(x+e,y+3); g.lineTo(x+u-e,y+3); g.lineTo(x+u-3,y+e); g.lineTo(x+u-3,y+u-e); g.lineTo(x+u-e,y+u-3); g.lineTo(x+e,y+u-3); g.lineTo(x+3,y+u-e); g.lineTo(x+3,y+e); g.closePath(); g.fill();
      g.fillStyle=pal.bg; g.beginPath(); g.moveTo(x+u/2,y+u*0.2); g.lineTo(x+u*0.8,y+u/2); g.lineTo(x+u/2,y+u*0.8); g.lineTo(x+u*0.2,y+u/2); g.fill();
      g.fillStyle=pal.star2||pal.b||pal.a; g.save(); g.translate(x,y); g.rotate(Math.PI/4); g.fillRect(-e*0.5,-e*0.5,e,e); g.restore(); g.beginPath(); g.arc(x+u/2,y+u/2,u*0.08,0,7); g.fill(); }
    return {c,aspect:1}; }
  if(fam==='stepfret'){ const b=drawBandWorld('stepfret',{bg:pal.bg,a:pal.a||pal.star,b:pal.star2||pal.a},rng); for(let k=0;k<4;k++) g.drawImage(b,0,0,1024,128,0,k*128,1024,128); return {c,aspect:1}; }
  if(fam==='rushnik'){ g.fillStyle=pal.a||pal.star; const s=16;
    for(let y=0;y<W;y+=s) for(let x=0;x<W;x+=s){ const u=((x/s)%8)-4, v=((y/s)%8)-4; const d=Math.abs(u+0.5)+Math.abs(v+0.5); if(d===3||d===1) g.fillRect(x+2,y+2,s-4,s-4); }
    return {c,aspect:1}; }
  return null;
}
// door leaves (256 × 512, the pair of leaves across the opening)
function drawDoorWorld(kind,st,rng){
  if(!['roman','victorian','plank','painted','russian','maya'].includes(kind)) return null;
  const W=256,H=512, c=cvs(W,H), g=c.getContext('2d'), wood=st.wood;
  const panel=(x,y,w,h,col)=>{ g.fillStyle=shade(col,.78); g.fillRect(x,y,w,h); g.fillStyle=shade(col,1.25); g.fillRect(x,y,w,4); g.fillRect(x,y,4,h); g.fillStyle=shade(col,.5); g.fillRect(x,y+h-4,w,4); g.fillRect(x+w-4,y,4,h); };
  if(kind==='roman'){ const col='#6a4a2c'; g.fillStyle=col; g.fillRect(0,0,W,H);
    for(const sx of [0,W/2]) for(let r=0;r<3;r++){ const x=sx+16, y=20+r*162, w=W/2-32, h=146; panel(x,y,w,h,col); g.fillStyle=st.metal; g.beginPath(); g.arc(x+w/2,y+h/2,10,0,7); g.fill(); }
    g.fillStyle=st.metal; for(let y=12;y<H;y+=40) for(const x of [6,W/2-6,W/2+6,W-6]){ g.beginPath(); g.arc(x,y,4,0,7); g.fill(); } g.fillStyle=shade(col,.45); g.fillRect(W/2-2,0,4,H); return c; }
  if(kind==='victorian'){ const col=st.doorC||'#2a3b33'; g.fillStyle=col; g.fillRect(0,0,W,H);
    for(const sx of [0,W/2]){ panel(sx+18,22,W/2-36,250,col); panel(sx+18,296,W/2-36,190,col); }
    g.fillStyle='#c9a24a'; g.fillRect(W/2-34,282,22,8); g.beginPath(); g.arc(W/2+24,250,9,0,7); g.fill(); g.fillStyle=shade(col,.4); g.fillRect(W/2-2,0,4,H); return c; }
  if(kind==='plank'||kind==='painted'){ const col=kind==='painted'? st.paint : wood; g.fillStyle=shade(col,.6); g.fillRect(0,0,W,H);
    const n=8, pw=W/n; for(let i=0;i<n;i++){ g.fillStyle=shade(col,rng.range(.85,1.1)); g.fillRect(i*pw+1,0,pw-2,H); for(let j=0;j<5;j++){ g.strokeStyle='rgba(0,0,0,.12)'; g.beginPath(); const xx=i*pw+rng.range(3,pw-3); g.moveTo(xx,0); g.lineTo(xx+rng.range(-2,2),H); g.stroke(); } }
    if(kind==='painted'){ g.fillStyle=shade(col,.75); g.fillRect(0,90,W,22); g.fillRect(0,H-112,W,22); }
    else { g.fillStyle='#2b2b2d'; for(const y of [70,H-90]) for(const sx of [0,W/2]){ g.fillRect(sx+6,y,W/2-30,16); g.beginPath(); g.moveTo(sx+W/2-24,y-4); g.lineTo(sx+W/2-10,y+8); g.lineTo(sx+W/2-24,y+20); g.fill(); for(let x=sx+16;x<sx+W/2-30;x+=24){ g.fillStyle='#6b6b70'; g.beginPath(); g.arc(x,y+8,3,0,7); g.fill(); g.fillStyle='#2b2b2d'; } } }
    g.fillStyle='rgba(0,0,0,.4)'; g.fillRect(W/2-2,0,4,H); return c; }
  if(kind==='russian'){ const col=st.paint2||'#3f6b4a'; g.fillStyle=col; g.fillRect(0,0,W,H);
    for(const sx of [0,W/2]){ panel(sx+16,18,W/2-32,230,col); panel(sx+16,270,W/2-32,224,col);
      for(const cy of [133,382]){ const cx=sx+W/4; g.fillStyle='#d98a2b'; for(let k=0;k<12;k++){ const a=k*Math.PI/6; g.beginPath(); g.ellipse(cx+Math.cos(a)*22,cy+Math.sin(a)*22,11,4,a,0,7); g.fill(); } g.fillStyle='#b0302a'; g.beginPath(); g.arc(cx,cy,10,0,7); g.fill(); } }
    g.fillStyle=shade(col,.45); g.fillRect(W/2-2,0,4,H); return c; }
  // maya: a woven curtain hung in the doorway
  const cols=['#a7432f','#1f1a16','#e8dfc8','#d9a441']; for(let y=0;y<H;y+=16){ g.fillStyle=cols[(y/16)%4|0]; g.fillRect(0,y,W,16); }
  g.fillStyle='#1f1a16'; for(let x=16;x<W;x+=48) for(let y=40;y<H;y+=96){ g.beginPath(); g.moveTo(x,y); g.lineTo(x+16,y+16); g.lineTo(x,y+32); g.lineTo(x-16,y+16); g.fill(); }
  return c;
}
function texPaveWorld(kind,st,rng){ const W=512, c=cvs(W,W), g=c.getContext('2d');
  if(kind==='cobble'){ g.fillStyle='#5f5a50'; g.fillRect(0,0,W,W);
    for(let y=0;y<W+20;y+=26) for(let x=(y/26%2)*14;x<W+20;x+=28){ const r=rng.range(10,13), k=rng.range(.8,1.15), px=x+rng.range(-3,3), py=y+rng.range(-3,3);
      for(const [ox,oy] of [[0,0],[-W,0],[0,-W],[-W,-W]]){ const gr=g.createRadialGradient(px+ox-3,py+oy-3,1,px+ox,py+oy,r); gr.addColorStop(0,shade('#a59c8a',k*1.15)); gr.addColorStop(1,shade('#a59c8a',k*.7)); g.fillStyle=gr; g.beginPath(); g.ellipse(px+ox,py+oy,r,r*0.86,rng.f()*3,0,7); g.fill(); } }
    return c; }
  if(kind==='plaster'){ g.fillStyle='#e4dcc8'; g.fillRect(0,0,W,W); mottle(g,W,W,rng,160,14,80,0.07);
    g.strokeStyle='rgba(120,105,80,.25)'; g.lineWidth=1.2; for(let i=0;i<26;i++){ let x=rng.f()*W, y=rng.f()*W; g.beginPath(); g.moveTo(x,y); for(let k=0;k<6;k++){ x+=rng.range(-30,30); y+=rng.range(-30,30); g.lineTo(x,y); } g.stroke(); }
    return c; }
  return null;
}
// leaded lights: diamond quarries in lead cames (alpha-tested over the glass)
function drawLatticeWorld(kind,col){ if(kind!=='leaded') return null; const W=256, c=cvs(W,W), g=c.getContext('2d'); g.clearRect(0,0,W,W); g.strokeStyle=col; g.lineWidth=4;
  const s=32; for(let k=-W;k<=2*W;k+=s){ g.beginPath(); g.moveTo(k,0); g.lineTo(k+W*0.75,W); g.moveTo(k,W); g.lineTo(k+W*0.75,0); g.stroke(); } g.lineWidth=8; g.strokeRect(4,4,W-8,W-8); return c; }
// a painted gable (Palau): registers of legend between zigzag bands
function texStoryGable(pal,rng){ const W=512, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=pal.bg; g.fillRect(0,0,W,W);
  const band=drawBandWorld('story',pal,rng); for(let k=0;k<4;k++) g.drawImage(band,(k%2)*200,0,512,128,0,k*128,W,128); return c; }
// Roman floor mosaic: black tesserae on white, a border of bands and a field of rings
function texMosaic(rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'), s=4;
  for(let y=0;y<W;y+=s) for(let x=0;x<W;x+=s){ const u=(x+2)/W, v=(y+2)/W, e=Math.min(u,v,1-u,1-v)*W; let dark=e<10||(e>18&&e<24);
    if(e>30){ const gx=((x-32)%48+48)%48-24, gy=((y-32)%48+48)%48-24, d=Math.hypot(gx,gy); dark=d>14&&d<19; }
    g.fillStyle= dark? shade('#2b2622',rng.range(.85,1.15)) : shade('#ece4d2',rng.range(.93,1.04)); g.fillRect(x,y,s-0.6,s-0.6); }
  return c; }
function texFloorboards(base,rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=shade(base,.55); g.fillRect(0,0,W,W); const n=8, bh=W/n;
  for(let i=0;i<n;i++){ let x=-rng.f()*120; while(x<W){ const L=rng.range(90,200), k=rng.range(.85,1.12); g.fillStyle=shade(base,k); g.fillRect(x+1,i*bh+1,L-2,bh-2);
      for(let j=0;j<4;j++){ g.strokeStyle=`rgba(0,0,0,${rng.range(.05,.12)})`; g.beginPath(); const yy=i*bh+rng.range(3,bh-3); g.moveTo(x,yy); g.bezierCurveTo(x+L*0.3,yy+rng.range(-2,2),x+L*0.6,yy+rng.range(-2,2),x+L,yy); g.stroke(); } x+=L; } }
  return c; }
// an oil painting for the wall: sky, hills, a tree
function texPainting(rng){ const W=256,H=200, c=cvs(W,H), g=c.getContext('2d'); const gr=g.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#8fa7b8'); gr.addColorStop(0.55,'#e3d2a8'); gr.addColorStop(1,'#6d7a45'); g.fillStyle=gr; g.fillRect(0,0,W,H);
  g.fillStyle='#55663a'; g.beginPath(); g.moveTo(0,H*0.7); for(let x=0;x<=W;x+=16) g.lineTo(x,H*0.62+Math.sin(x*0.03+rng.f())*14); g.lineTo(W,H); g.lineTo(0,H); g.fill();
  g.fillStyle='#3d4a2a'; g.beginPath(); g.arc(W*0.7,H*0.45,26,0,7); g.fill(); g.fillRect(W*0.7-3,H*0.45,6,40); mottle(g,W,H,rng,60,4,20,0.06); return c; }
function worldMats(M,st,std,rng){
  const ch=st.chimney||{};
  M.chim=std({map:mkTex(texBrick(ch.c||'#8e4a36',ch.mortar||'#9a8b78',rng,26,8),1.4,1.4)});
  M.dado=std({map:mkTex(texPlaster(st.dado||st.paint,rng),2,2)});
  M.paint2=std({map:mkTex(texPaint(st.paint2||st.paint,st.wood,rng),1.2,1.2), roughness:0.7});
  M.gablep=std({map:mkTex(texStoryGable(st.bandPal,rng),3.2,3.2), roughness:0.85});
  M.mosaic=std({map:mkTex(texMosaic(rng),2.0,2.0), roughness:0.45});
  M.floorb=std({map:mkTex(texFloorboards(hexK(st.wood,1.45),rng),2.4,2.4), roughness:0.6});
  M.canvasP=std({map:mkTex(texPainting(rng),1,1), roughness:0.8});
  M.olive=std({color:lc('#7d8a63'), roughness:0.85}); M.birch=std({color:lc('#e6e2d8'), roughness:0.8}); M.hedge=std({color:lc('#2f4a26'), roughness:0.95});
  const dm=st.domeMat;
  if(dm==='blue') M.dome=std({map:mkTex(texPlaster('#2b62a6',rng),1.5,1.5), roughness:0.7});
  else if(dm==='green') M.dome=std({color:lc('#3f7a5c'), roughness:0.45, metalness:0.35});
  else if(dm==='shingle') M.dome=std({map:mkTex(texRoofTilesWorld({kind:'shingle',c:'#9c9a92'},rng),0.9,0.9), roughness:0.85});
}

/* ---------- roof furniture ---------- */
// ridge ends: iron finial, carved horse head (okhlupen), upswept horn
function worldRidgeEnd(B,kind,at,p){
  switch(kind){
    case 'finial': B.cyl('iron',0.05,0.03,0.75,6,mT(p.x,p.y-0.05,p.z)); B.sphere('iron',0.07,mT(p.x,p.y+0.32,p.z),6,4); B.cone('iron',0.035,0.3,6,mT(p.x,p.y+0.68,p.z)); break;
    case 'horse': { const a=at(-0.1,-0.08), b=at(0.35,0.28), c=at(0.62,0.22); B.segCyl('wood',a,b,0.12,0.1,6); B.segCyl('wood',b,c,0.1,0.06,6); B.segCyl('wood',b,at(0.3,0.5),0.035,0.01,4); B.segCyl('wood',at(0.05,0.0),at(0.22,0.4),0.05,0.02,4); break; }
    case 'horn': { const a=at(0,-0.05), b=at(0.3,0.22), c=at(0.42,0.85); B.segCyl('wood',a,b,0.12,0.09,6); B.segCyl('wood',b,c,0.09,0.03,6); break; }
    case 'cross': B.box('iron',p.x-0.03,p.y-0.05,p.z-0.03,p.x+0.03,p.y+0.7,p.z+0.03); B.box('iron',p.x-0.2,p.y+0.42,p.z-0.025,p.x+0.2,p.y+0.48,p.z+0.025); break;
  }
}
// iron cresting along a ridge (in the roof's local frame: a along the ridge)
function worldCresting(B,r0,r1,y,mid,M){
  B.box('iron',r0+0.1,y+0.3,mid-0.015,r1-0.1,y+0.34,mid+0.015,M);
  for(let a=r0+0.1;a<=r1-0.1+1e-6;a+=0.22){ B.box('iron',a-0.012,y,mid-0.012,a+0.012,y+0.42,mid+0.012,M); const q=V3(a,y+0.42,mid).applyMatrix4(M); B.sphere('iron',0.03,mT(q.x,q.y,q.z),5,3); }
}
// bargeboards along a gable's two verges (Victorian scalloped, Russian with a hanging towel board, plain)
function worldBarge(B,kind,av,b0,b1,ob0,ob1,mid,H,hb,th,M,sg){
  const Mg=mm(M,mT(av+(sg>0?0.045:-0.005),0,0),mRY(-Math.PI/2)), top=H(hb);
  for(const [bs,be] of [[b0,mid],[b1,mid]]){ const n=12, up=[], lo=[];
    for(let k=0;k<=n;k++){ const b=bs+(be-bs)*k/n, e=Math.min(hb,Math.abs(b-bs)-(bs===b0?ob0:ob1)), y=H(e); up.push([b,y+0.05]);
      const drop= kind==='victorian'? 0.24+0.08*Math.abs(Math.sin(k*Math.PI/2)) : kind==='russian'? 0.3 : 0.22; lo.push([b,y-th-drop]); }
    B.ext('paint',dedupe([...up,...lo.reverse()]),null,0.04,Mg); }
  if(kind==='victorian'){ B.box('paint',mid-0.05,top-0.95,-0.02,mid+0.05,top+0.55,0.06,Mg); B.sphere('paint',0.07,mT(...V3(mid,top+0.6,0.02).applyMatrix4(Mg).toArray()),6,4); }
  if(kind==='russian'){ B.ext('paint',[[mid-0.17,top-0.2],[mid+0.17,top-0.2],[mid+0.17,top-1.05],[mid,top-1.2],[mid-0.17,top-1.05]],null,0.045,mm(Mg,mT(0,0,0.006))); }
}
// a chimney stack standing on the walls and rising through the roof (local roof frame)
function chimneyStack(B,M,a,b,y0,yt,ch,col){
  const k=ch.k||'chim', sa=ch.sa||0.6, sb=ch.sb||0.95, P=(x,y,z)=>V3(x,y,z).applyMatrix4(M);
  if(ch.cluster){ const yb=yt-1.0; B.box(k,a-sa/2,y0,b-sb/2,a+sa/2,yb,b+sb/2,M); col(M,a-sa/2,y0,b-sb/2,a+sa/2,yt+0.4,b+sb/2); B.box('stone',a-sa/2-0.05,yb,b-sb/2-0.05,a+sa/2+0.05,yb+0.12,b+sb/2+0.05,M);
    for(const db of [-0.25,0.25]){ const p=P(a,yb+0.12,b+db); B.cyl(k,0.15,0.15,1.2,8,mT(p.x,p.y,p.z)); B.cyl(k,0.2,0.155,0.16,8,mT(p.x,p.y+1.2,p.z)); B.cyl('void',0.1,0.1,0.02,8,mT(p.x,p.y+1.355,p.z)); } return; }
  B.box(k,a-sa/2,y0,b-sb/2,a+sa/2,yt,b+sb/2,M); col(M,a-sa/2,y0,b-sb/2,a+sa/2,yt,b+sb/2);
  if(ch.cap==='stone') B.box('stone',a-sa/2-0.06,yt-0.24,b-sb/2-0.06,a+sa/2+0.06,yt-0.08,b+sb/2+0.06,M);
  B.box('void',a-sa/2+0.09,yt-0.05,b-sb/2+0.09,a+sa/2-0.09,yt+0.004,b+sb/2-0.09,M);
  if(ch.pots) for(const db of (sb>0.7?[-sb/4,sb/4]:[0])){ const p=P(a,yt,b+db); B.cyl('clay',0.1,0.085,0.42,8,mT(p.x,p.y,p.z)); B.cyl('clay',0.115,0.115,0.06,8,mT(p.x,p.y+0.42,p.z)); }
  if(ch.cap==='lead'){ const p=P(a,yt,b); for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]) B.box('lead',p.x+sx*0.2-0.025,yt,p.z+sz*0.2-0.025,p.x+sx*0.2+0.025,yt+0.22,p.z+sz*0.2+0.025); B.cone('lead',0.44,0.4,4,mm(mT(p.x,yt+0.22,p.z),mRY(Math.PI/4))); }
  if(ch.cap==='iron'){ B.box('iron',a-sa/2-0.05,yt+0.26,b-sb/2-0.05,a+sa/2+0.05,yt+0.31,b+sb/2+0.05,M); for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]) B.box('iron',a+sx*(sa/2-0.04)-0.015,yt,b+sz*(sb/2-0.04)-0.015,a+sx*(sa/2-0.04)+0.015,yt+0.26,b+sz*(sb/2-0.04)+0.015,M); }
}
// finials over domes: cross, Orthodox cross, ball
function worldFinial(B,kind,x,y,z,s){ s=s||1;
  if(kind==='cross'||kind==='orthodox'){ B.cyl('metal',0.06*s,0.05*s,0.3*s,8,mT(x,y,z)); B.sphere('metal',0.09*s,mT(x,y+0.35*s,z),8,6); B.box('metal',x-0.025*s,y+0.4*s,z-0.025*s,x+0.025*s,y+1.25*s,z+0.025*s); B.box('metal',x-0.25*s,y+0.92*s,z-0.02*s,x+0.25*s,y+0.98*s,z+0.02*s);
    if(kind==='orthodox'){ B.box('metal',x-0.13*s,y+1.1*s,z-0.02*s,x+0.13*s,y+1.15*s,z+0.02*s); B.box('metal',x-0.17*s,y+0.62*s,z-0.02*s,x+0.17*s,y+0.67*s,z+0.02*s,mm(mT(x,y+0.645*s,z),mRZ(-0.35),mT(-x,-y-0.645*s,-z))); } return; }
  B.cyl('metal',0.06*s,0.05*s,0.25*s,8,mT(x,y,z)); B.sphere(kind==='pine'?'stone':'metal',0.16*s,mT(x,y+0.4*s,z),8,6);
}
// hanging lamps: gas lantern, iron lantern, Roman bronze lamp on chains. True when handled.
function worldLamp(B,x,y,z,kind){
  if(kind==='gaslamp'||kind==='lantern'){ B.cyl('iron',0.012,0.012,0.45,4,mT(x,y-0.45,z)); B.cone('iron',0.17,0.16,4,mm(mT(x,y-0.6,z),mRY(Math.PI/4))); B.box('glow',x-0.1,y-0.9,z-0.1,x+0.1,y-0.6,z+0.1);
    for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]) B.box('iron',x+sx*0.1-0.012,y-0.92,z+sz*0.1-0.012,x+sx*0.1+0.012,y-0.6,z+sz*0.1+0.012); B.box('iron',x-0.12,y-0.95,z-0.12,x+0.12,y-0.91,z+0.12); B.lanterns.push(V3(x,y-0.75,z)); return true; }
  if(kind==='roman'){ for(let k=0;k<3;k++){ const a=k*2.094; B.segCyl('metal',V3(x,y,z),V3(x+Math.cos(a)*0.14,y-0.55,z+Math.sin(a)*0.14),0.006,0.006,3); } B.sphere('metal',0.12,mm(mT(x,y-0.6,z),mS(1.5,0.45,0.9)),10,6); B.sphere('glow',0.03,mT(x+0.18,y-0.54,z),5,4); B.lanterns.push(V3(x,y-0.6,z)); return true; }
  return false;
}

/* ---------- trees ---------- */
function worldTree(B,kind,x,z,y,rng){
  switch(kind){
    case 'olive': { const a=V3(x,y,z), b=V3(x+rng.range(-.3,.3),y+0.9,z+rng.range(-.3,.3)); B.segCyl('trunk',a,b,0.24,0.16,7); for(let i=0;i<3;i++){ const ang=rng.f()*6.283, c=V3(b.x+Math.cos(ang)*0.7,y+1.8,b.z+Math.sin(ang)*0.7); B.segCyl('trunk',b,c,0.1,0.06,5); }
      for(let i=0;i<7;i++) B.ico('olive',rng.range(0.55,0.8),mm(mT(x+rng.range(-1.1,1.1),y+2.0+rng.range(-0.2,0.6),z+rng.range(-1.1,1.1)),mS(1,0.7,1)),1); return 1.2; }
    case 'oak': B.cyl('trunk',0.36,0.24,2.4,8,mT(x,y,z)); for(let i=0;i<4;i++){ const a=i*1.57+rng.f(); B.segCyl('trunk',V3(x,y+2.2,z),V3(x+Math.cos(a)*1.3,y+3.4,z+Math.sin(a)*1.3),0.14,0.08,5); }
      for(let i=0;i<8;i++) B.ico('leaf2',rng.range(1.1,1.6),mT(x+rng.range(-1.5,1.5),y+3.6+rng.range(-0.4,0.9),z+rng.range(-1.5,1.5)),1); return 1.6;
    case 'birch': for(let s=0;s<2;s++){ const bx=x+(s?0.35:0), bz=z+(s?0.2:0), h=rng.range(5,6.5); B.segCyl('birch',V3(bx,y,bz),V3(bx+rng.range(-.3,.3),y+h,bz+rng.range(-.3,.3)),0.11,0.05,7);
        for(let i=0;i<5;i++) B.ico('leaf',rng.range(0.45,0.7),mT(bx+rng.range(-0.8,0.8),y+h*0.55+i*0.45,bz+rng.range(-0.8,0.8)),0); } return 0.9;
    case 'baobab': B.lathe('trunk',[[0,0],[1.0,0],[1.05,1.2],[0.85,2.6],[0.55,3.4],[0,3.5]],12,mT(x,y,z)); for(let i=0;i<6;i++){ const a=i*1.05+rng.f()*0.4, e=V3(x+Math.cos(a)*1.4,y+4.3+rng.range(0,0.5),z+Math.sin(a)*1.4); B.segCyl('trunk',V3(x,y+3.3,z),e,0.16,0.06,5); B.ico('leaf',0.45,mT(e.x,e.y+0.2,e.z),0); } return 1.4;
    case 'ceiba': B.cyl('trunk',0.34,0.26,5.2,8,mT(x,y,z)); for(let i=0;i<5;i++){ const a=i*1.257; B.ext('trunk',[[0,0],[0.9,0],[0,1.4]],null,0.1,mm(mT(x,y,z),mRY(a),mT(0.2,0,-0.05))); }
      for(let i=0;i<5;i++){ const a=i*1.257+0.6; B.segCyl('trunk',V3(x,y+5,z),V3(x+Math.cos(a)*2,y+5.9,z+Math.sin(a)*2),0.13,0.06,5); }
      for(let i=0;i<6;i++) B.cyl('leaf2',rng.range(1.1,1.5),rng.range(1.3,1.8),0.55,10,mT(x+rng.range(-1.6,1.6),y+5.8+rng.range(-0.2,0.4),z+rng.range(-1.6,1.6))); return 1.5;
    case 'juniper': B.segCyl('trunk',V3(x,y,z),V3(x+0.2,y+1.0,z-0.1),0.16,0.1,6); for(let i=0;i<5;i++) B.ico('leaf2',rng.range(0.5,0.8),mm(mT(x+rng.range(-0.7,0.7),y+1.3+rng.range(-0.3,0.7),z+rng.range(-0.7,0.7)),mS(1,0.85,1)),1); return 1.0;
    case 'yew': B.cyl('trunk',0.1,0.08,0.4,6,mT(x,y,z)); B.lathe('hedge',[[0,0],[0.75,0.05],[0.8,0.6],[0.5,1.9],[0,2.7]],12,mT(x,y+0.3,z)); B.sphere('hedge',0.22,mT(x,y+3.15,z),8,6); return 0.9;
    case 'breadfruit': B.cyl('trunk',0.2,0.14,2.6,7,mT(x,y,z)); for(let i=0;i<7;i++) B.ico('leaf',rng.range(0.8,1.15),mT(x+rng.range(-1.2,1.2),y+3.1+rng.range(-0.3,0.8),z+rng.range(-1.2,1.2)),1);
      for(let i=0;i<5;i++) B.sphere('grass',0.13,mT(x+rng.range(-1,1),y+2.7+rng.range(0,0.6),z+rng.range(-1,1)),6,4); return 1.3;
  }
  return null;
}

/* ---------- courtyard centrepieces: returns [radius, has water] ---------- */
function worldCourtFeature(B,kind,cx,cz,ax,col,rng){
  const rot=ax==='x'?mT(cx,0,cz):mm(mT(cx,0,cz),mRY(Math.PI/2));
  switch(kind){
    case 'impluvium': { const L=3.0, W=2.1; col(cx-(ax==='x'?L:W)/2-0.2,0,cz-(ax==='x'?W:L)/2-0.2,cx+(ax==='x'?L:W)/2+0.2,0.3,cz+(ax==='x'?W:L)/2+0.2);
      for(const [a0,b0,a1,b1] of [[-L/2-0.2,-W/2-0.2,L/2+0.2,-W/2],[-L/2-0.2,W/2,L/2+0.2,W/2+0.2],[-L/2-0.2,-W/2,-L/2,W/2],[L/2,-W/2,L/2+0.2,W/2]]) B.box('stone',a0,0,b0,a1,0.22,b1,rot);
      B.box('water',-L/2,0.03,-W/2,L/2,0.14,W/2,rot); B.box('stone',-0.2,0,-0.2,0.2,0.8,0.2,rot); B.sphere('stone',0.16,mm(rot,mT(0,0.95,0)),8,6);
      B.box('stone',-0.38,0.8,-0.25,0.38,0.88,0.25,rot); return [2.2,true]; }   // the rain pool, a marble table (cartibulum) at its head
    case 'castfount': { col(cx-1.4,0,cz-1.4,cx+1.4,0.6,cz+1.4); B.cyl('stone',1.4,1.45,0.5,20,mT(cx,0,cz)); B.cyl('water',1.25,1.25,0.46,20,mT(cx,0.02,cz)); B.torus('stone',1.33,0.08,Math.PI*2,mm(mT(cx,0.5,cz),mRX(Math.PI/2)),5,28);
      B.lathe('iron',[[0.22,0],[0.14,0.3],[0.12,1.0],[0.62,1.18],[0.66,1.28],[0.14,1.32],[0.1,1.9],[0.4,2.0],[0.42,2.08],[0.08,2.12],[0.06,2.5],[0,2.62]],14,mT(cx,0.3,cz));
      B.cyl('water',0.58,0.58,0.05,14,mT(cx,1.53,cz)); B.cyl('water',0.36,0.36,0.04,12,mT(cx,2.34,cz)); return [1.9,true]; }
    case 'knot': { const s=2.0, h=0.42; col(cx-s,0,cz-s,cx+s,h,cz+s);
      for(const [a0,b0,a1,b1] of [[-s,-s,s,-s+0.28],[-s,s-0.28,s,s],[-s,-s+0.28,-s+0.28,s-0.28],[s-0.28,-s+0.28,s,s-0.28]]) B.box('hedge',cx+a0,0,cz+b0,cx+a1,h,cz+b1);
      const Md=mm(mT(cx,0,cz),mRY(Math.PI/4)), d=s*0.95; const q=d/1.41; for(const [a0,b0,a1,b1] of [[-q,-q,q,-q+0.25],[-q,q-0.25,q,q],[-q,-q+0.25,-q+0.25,q-0.25],[q-0.25,-q+0.25,q,q-0.25]]) B.box('hedge',a0,0,b0,a1,h*0.85,b1,Md);
      B.box('hedge',cx-s+0.4,0,cz-0.12,cx-0.5,h*0.8,cz+0.12); B.box('hedge',cx+0.5,0,cz-0.12,cx+s-0.4,h*0.8,cz+0.12); B.box('hedge',cx-0.12,0,cz-s+0.4,cx+0.12,h*0.8,cz-0.5); B.box('hedge',cx-0.12,0,cz+0.5,cx+0.12,h*0.8,cz+s-0.4);
      B.cyl('stone',0.2,0.24,0.95,8,mT(cx,0,cz)); B.cyl('metal',0.24,0.24,0.03,12,mT(cx,0.95,cz)); B.ext('metal',[[0,0],[0.2,0],[0,0.16]],null,0.012,mm(mT(cx,0.98,cz-0.006))); return [2.4,false]; }   // box hedges round a sundial
    case 'crane': { col(cx-0.75,0,cz-0.75,cx+0.75,0.9,cz+0.75); for(let k=0;k<5;k++){ const y=k*0.18; B.box('wood',cx-0.7,y,cz-0.7,cx+0.7,y+0.17,cz-0.55); B.box('wood',cx-0.7,y,cz+0.55,cx+0.7,y+0.17,cz+0.7); B.box('wood',cx-0.7,y+0.09,cz-0.55,cx-0.55,y+0.26,cz+0.55); B.box('wood',cx+0.55,y+0.09,cz-0.55,cx+0.7,y+0.26,cz+0.55); }
      B.box('void',cx-0.55,0.2,cz-0.55,cx+0.55,0.86,cz+0.55); const px=cx+2.0; B.cyl('wood',0.13,0.1,3.4,7,mT(px,0,cz)); col(px-0.15,0,cz-0.15,px+0.15,3.4,cz+0.15);
      const top=V3(px,3.3,cz), tip=V3(cx-0.1,4.4,cz), butt=V3(px+1.6,2.5,cz); B.segCyl('wood',butt,tip,0.09,0.05,6); B.segCyl('wood',tip,V3(cx-0.1,1.4,cz),0.025,0.025,4); B.cyl('wood',0.16,0.13,0.28,8,mT(cx-0.1,1.1,cz)); B.box('stone',butt.x-0.2,butt.y-0.3,cz-0.2,butt.x+0.2,butt.y+0.05,cz+0.2); void top; return [1.6,false]; }   // log well-head and a well-sweep (zhuravl)
    case 'dovecote': { const s=0.9, hb=2.4, ht=1.4; col(cx-s,0,cz-s,cx+s,hb+ht,cz+s); B.box('wall',cx-s,0,cz-s,cx+s,hb,cz+s); B.box('trim',cx-s-0.06,hb-0.08,cz-s-0.06,cx+s+0.06,hb+0.04,cz+s+0.06); B.box('wall',cx-s,hb,cz-s,cx+s,hb+ht,cz+s);
      for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0,s); for(let r=0;r<3;r++) for(let q=0;q<4-r%2;q++){ const u=F.uA+0.25+(r%2?0.2:0)+q*0.42, v=hb+0.2+r*0.38; B.flat('void',[[u-0.12,v],[u+0.12,v],[u,v+0.26]],atF(F,0,0,0.006)); } }
      for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]) B.cyl('wall',0.12,0.05,0.5,4,mm(mT(cx+sx*(s-0.12),hb+ht,cz+sz*(s-0.12)),mRY(Math.PI/4)));
      B.box('door',cx-0.35,0,cz+s,cx+0.35,1.7,cz+s+0.03); return [1.4,false]; }   // a Tinos dovecote with its pierced triangles
    case 'granary': { for(const [dx,dz,s] of [[-0.75,0,1],[0.85,0.35,0.82]]){ const x=cx+dx, z=cz+dz; for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]) B.cyl('stone',0.16,0.18,0.35*s,6,mT(x+sx*0.35*s,0,z+sz*0.35*s));
        B.lathe('wall',[[0,0],[0.62*s,0],[0.7*s,0.5*s],[0.66*s,1.5*s],[0.5*s,1.75*s],[0,1.8*s]].map(p=>[p[0],p[1]]),12,mT(x,0.35*s,z)); B.box('wood',x-0.18*s,0.9*s,z+0.62*s,x+0.18*s,1.35*s,z+0.7*s);
        skirtRoof(B,x,0.35*s+1.6*s,z,10,0.95*s,0,1.1*s,{curve:1,lift:0,thick:0.18,tile:{kind:'thatch'}},'thatch'); col(x-0.7*s,0,z-0.7*s,x+0.7*s,3*s,z+0.7*s); } return [1.8,false]; }   // round mud granaries on stone feet under thatch hats
    case 'stela': { col(cx-0.5,0,cz-0.25,cx+0.5,2.9,cz+0.25); B.box('stone',cx-0.5,0,cz-0.22,cx+0.5,2.9,cz+0.22); B.box('band',cx-0.42,0.2,cz+0.22,cx+0.42,2.7,cz+0.235); B.box('band',cx-0.42,0.2,cz-0.235,cx+0.42,2.7,cz-0.22);
      B.cyl('stone',0.62,0.62,0.48,14,mT(cx,0,cz+1.2)); B.torus('stone',0.6,0.05,Math.PI*2,mm(mT(cx,0.48,cz+1.2),mRX(Math.PI/2)),4,20); col(cx-0.62,0,cz+0.58,cx+0.62,0.5,cz+1.82); return [1.9,false]; }   // a carved stela and its round altar
    case 'horno': { col(cx-0.9,0,cz-0.9,cx+0.9,1.4,cz+0.9); B.cyl('wall',0.95,1.0,0.35,14,mT(cx,0,cz)); B.lathe('wall',[[0.9,0],[0.92,0.35],[0.75,0.8],[0.42,1.05],[0.12,1.12],[0,1.12]],14,mT(cx,0.35,cz));
      B.flat('void',openPoly({u0:-0.25,u1:0.25,v0:0,vs:0.2,arch:'round'}),mm(mT(cx,0.35,cz+0.9),mRX(-0.25))); B.cyl('void',0.07,0.07,0.02,8,mT(cx,1.46,cz)); B.box('wood',cx-0.4,0,cz+1.05,cx+0.4,0.06,cz+1.25); return [1.2,false]; }   // beehive horno oven
    case 'rai': { col(cx-1.2,0,cz-0.6,cx+1.2,2.0,cz+0.6); B.box('stone',cx-1.4,0,cz-0.6,cx+1.4,0.25,cz+0.6);
      for(const [dx,R,lean] of [[-0.6,0.95,0.12],[0.55,0.7,-0.08]]){ const M=mm(mT(cx+dx,0.25+R*0.95,cz),mRX(lean),mS(1,1,0.28)); B.torus('stone',R*0.6,R*0.4,Math.PI*2,M,8,20); } return [1.6,false]; }   // Yapese stone money (rai) propped on a platform
  }
  return [0,false];
}

/* ---------- towers: centred at (cx, cz) from height yb, Ht tall, half-width half ---------- */
function worldTower(B,kind,cx,yb,cz,Ht,half,st,wk,col,n,H){
  const pr=st.pr||{tile:{kind:'barrel',c:'#a85a3a'}}, P4=[[1,1],[1,-1],[-1,1],[-1,-1]];
  const arched=(y,h,s,w,arch,mat,th)=>{ for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0,s), e=d%2?th:0, o={u0:F.mid-w/2,u1:F.mid+w/2,v0:y+0.25,vs:y+h-0.3-archRise(arch,w),arch}; B.ext(mat,[[F.uA+e,y],[F.uB-e,y],[F.uB-e,y+h],[F.uA+e,y+h]],[openPoly(o)],th,atF(F,0,0,-th)); } };
  const winRing=(y,r,nw,w,h,mat)=>{ for(let k=0;k<nw;k++){ const a=k/nw*Math.PI*2+0.3, M=mm(mT(cx,y,cz),mRY(a),mT(0,0,r-0.02)); B.box('glass',-w/2,0,0,w/2,h,0.03,M); B.box(mat,-w/2-0.08,-0.1,0,w/2+0.08,0,0.1,M); B.box(mat,-w/2-0.08,h,0,w/2+0.08,h+0.12,0.1,M); } };
  switch(kind){
    case 'romtower': { const s=half, y1=yb+Ht-1.7; B.box(wk,cx-s,yb,cz-s,cx+s,y1,cz+s); for(let y=yb+H;y<y1-0.2;y+=H) B.box('stone',cx-s-0.05,y-0.14,cz-s-0.05,cx+s+0.05,y,cz+s+0.05);
      arched(y1,1.7,s,1.1,'round',wk,0.3); B.box('stone',cx-s-0.12,y1+1.7,cz-s-0.12,cx+s+0.12,y1+1.86,cz+s+0.12); B.box(wk,cx-s+0.3,y1-0.2,cz-s+0.3,cx+s-0.3,y1+0.02,cz+s-0.3);
      skirtRoof(B,cx,y1+1.86,cz,4,s+0.55,0,(s+0.55)*0.42,{curve:1,lift:0,thick:0.12,tile:pr.tile},'roofTile'); break; }
    case 'saatkule': { const s=half, ys=yb+Ht-3.2; B.box('stone',cx-s,yb,cz-s,cx+s,ys,cz+s); for(let y=yb+H;y<ys-0.3;y+=H) B.box('stone',cx-s-0.06,y-0.12,cz-s-0.06,cx+s+0.06,y,cz+s+0.06);
      B.box('stone',cx-s-0.15,ys,cz-s-0.15,cx+s+0.15,ys+0.2,cz+s+0.15); B.box('trim',cx-s+0.05,ys+0.2,cz-s+0.05,cx+s-0.05,ys+1.5,cz+s-0.05);
      for(let d=0;d<4;d++){ const F=fr(cx,cz,d,0,s-0.05); B.cyl('porcelain',0.45,0.45,0.03,20,mm(atF(F,F.mid,ys+0.85,0),mRX(Math.PI/2))); B.box('black',F.mid-0.02,ys+0.85,0.03,F.mid+0.02,ys+1.2,0.04,F.M); B.box('black',F.mid,ys+0.83,0.03,F.mid+0.28,ys+0.87,0.04,F.M); B.torus('metal',0.47,0.03,Math.PI*2,atF(F,F.mid,ys+0.85,0.02),4,20); }
      const yb2=ys+1.5; B.box('wood',cx-s-0.1,yb2,cz-s-0.1,cx+s+0.1,yb2+0.12,cz+s+0.1); for(const [sx,sz] of P4) B.box('wood',cx+sx*(s-0.15)-0.07,yb2+0.12,cz+sz*(s-0.15)-0.07,cx+sx*(s-0.15)+0.07,yb2+1.3,cz+sz*(s-0.15)+0.07);
      B.box('wood',cx-s-0.1,yb2+1.3,cz-s-0.1,cx+s+0.1,yb2+1.42,cz+s+0.1); B.lathe('metal',[[0,0],[0.18,0.02],[0.3,0.3],[0.2,0.55],[0,0.6]],10,mT(cx,yb2+0.3,cz));
      B.cone('lead',(s+0.35)*1.414,1.9,4,mm(mT(cx,yb2+1.42,cz),mRY(Math.PI/4))); alem(B,cx,yb2+3.3,cz,0.6); break; }   // Ottoman clock tower: stone shaft, clock faces, a timber bell loft under a lead cap
    case 'turret': { const r=half, yt=yb+Ht; B.cyl(wk,r,r,yt-yb,20,mT(cx,yb,cz)); for(let y=yb+H;y<yt-0.3;y+=H) B.cyl('stone',r+0.05,r+0.05,0.15,20,mT(cx,y-0.15,cz),true);
      for(let k=0;k<n;k++) winRing(yb+k*H+1.0,r,3,0.55,1.4,'stone'); B.cyl('stone',r+0.14,r+0.1,0.3,20,mT(cx,yt-0.3,cz),true); B.cyl('stone',r+0.14,r+0.14,0.02,20,mT(cx,yt,cz));
      B.cone('roofTile',r+0.32,(r+0.32)*2.4,20,mT(cx,yt,cz)); worldRidgeEnd(B,'finial',null,V3(cx,yt+(r+0.32)*2.4-0.05,cz)); break; }   // candle-snuffer corner turret
    case 'tudorturret': { const r=half, yt=yb+Ht, M8=y=>mm(mT(cx,y,cz),mRY(Math.PI/8)); B.cyl('base',r,r,yt-yb,8,M8(yb));
      for(let y=yb+1.4;y<yt-0.8;y+=1.6){ const a=(y*1.7)%6.283; B.box('void',-0.06,0,0,0.06,0.65,0.03,mm(mT(cx,y,cz),mRY(a),mT(0,0,r*0.92))); }
      B.cyl('stone',r+0.2,r+0.2,0.28,8,M8(yt-0.25)); for(let k=0;k<8;k++){ const a=k/8*Math.PI*2+Math.PI/8; B.box('base',-0.22,0,-0.15,0.22,0.5,0.15,mm(mT(cx,yt+0.03,cz),mRY(a),mT(0,0,r+0.05))); }
      B.lathe('lead',[[r*0.85,0],[r*0.75,0.35],[r*0.35,0.75],[r*0.12,1.25],[0.05,1.6],[0,1.65]],8,M8(yt+0.03)); worldFinial(B,'ball',cx,yt+1.63,cz,0.6); break; }   // octagonal brick stair turret, battlements, ogee lead cap
    case 'belfry': { let y=yb, s=half; const tiers=Math.max(2,Math.min(3,n+1)), th=Ht/(tiers+0.6);
      for(let k=0;k<tiers;k++){ const last=k===tiers-1; if(k===0){ B.box(wk,cx-s,y,cz-s,cx+s,y+th,cz+s); B.box('door',cx-0.4,y,cz+s,cx+0.4,y+1.9,cz+s+0.03); }
        else { arched(y,th,s,s*1.0,'round',wk,0.25); B.box(wk,cx-s+0.25,y,cz-s+0.25,cx+s-0.25,y+0.12,cz+s-0.25); B.lathe('metal',[[0,0],[0.32,0],[0.26,0.12],[0.2,0.4],[0.12,0.5],[0,0.52]],12,mT(cx,y+th-0.95,cz)); B.cyl('iron',0.015,0.015,0.45,4,mT(cx,y+th-0.45,cz)); }
        B.box('trim',cx-s-0.08,y+th,cz-s-0.08,cx+s+0.08,y+th+0.1,cz+s+0.08); y+=th+0.1; if(!last) s*=0.82; }
      B.cyl(wk,s*0.75,s*0.75,0.35,16,mT(cx,y,cz)); B.lathe('dome',DOMEPROF.hemi(s*0.75),16,mT(cx,y+0.35,cz)); worldFinial(B,'cross',cx,y+0.35+s*0.75,cz,0.6); break; }   // whitewashed bell tower with a blue dome
    case 'tentroof': { const s=half, yo=yb+Math.min(H*0.9,Ht*0.32); B.box(wk,cx-s,yb,cz-s,cx+s,yo,cz+s); B.box('door',cx-0.5,yb,cz+s,cx+0.5,yb+2.0,cz+s+0.03);
      const r8=s*0.92, hO=Math.max(2.2,Ht*0.3); B.cyl(wk,r8/Math.cos(Math.PI/8),r8/Math.cos(Math.PI/8),hO,8,mm(mT(cx,yo,cz),mRY(Math.PI/8))); winRing(yo+0.9,r8,4,0.45,0.9,'paint');
      skirtRoof(B,cx,yo-0.1,cz,4,s+0.45,s*0.75,0.6,{curve:1,lift:0,thick:0.1,tile:pr.tile},'roofTile');
      const yt=yo+hO+0.03; B.box('paint',cx-r8-0.15,yt-0.15,cz-r8-0.15,cx+r8+0.15,yt,cz+r8+0.15);
      const tH=Math.max(2.5,Ht-(yt-yb)-1.6); skirtRoof(B,cx,yt,cz,8,r8+0.4,0.32,tH,{curve:1,lift:0,thick:0.1,tile:pr.tile},'roofTile');
      const yd=yt+tH; B.cyl('roofTile',0.32,0.32,0.45,12,mT(cx,yd,cz)); B.lathe('dome',DOMEPROF.onion(0.42),16,mT(cx,yd+0.45,cz)); worldFinial(B,'orthodox',cx,yd+0.45+0.42*1.38,cz,0.55); break; }   // log octagon under an octagonal tent roof and onion dome
    case 'sahelmin': { const s=half, yt=yb+Ht, Mq=y=>mm(mT(cx,y,cz),mRY(Math.PI/4)); B.cyl(wk,s*1.414,s*0.98,yt-yb,4,Mq(yb));
      for(let y=yb+0.9;y<yt-0.4;y+=0.85){ const f=(y-yb)/(yt-yb), r=lerp(s,s*0.69,f); for(let d=0;d<4;d++){ const M=mm(mT(cx,y,cz),mRY(d*Math.PI/2)); for(const u of [-r*0.55,0,r*0.55]) B.box('wood',u-0.04,-0.04,r-0.1,u+0.04,0.04,r+0.42,M); } }
      for(const [sx,sz] of P4){ B.cyl(wk,0.22,0.12,0.9,6,mT(cx+sx*s*0.62,yt-0.05,cz+sz*s*0.62)); } B.cyl(wk,0.5,0.32,1.1,8,mT(cx,yt-0.05,cz)); B.cone(wk,0.32,0.5,8,mT(cx,yt+1.05,cz)); B.sphere('trim',0.15,mm(mT(cx,yt+1.65,cz),mS(1,1.35,1)),8,6); break; }   // tapering banco minaret bristling with torons, an ostrich egg on top
    case 'mayapyramid': { const N=5, Hp=Math.max(3.2,Ht*0.68), th=Hp/N, top=half*0.45, sw=0.85, run=(half+0.55-top)/ (Hp/0.25);
      for(let k=0;k<N;k++){ const s=lerp(half,top+0.15,k/(N-1)), y=yb+k*th; B.cyl(wk,s*1.414,(s-0.12)*1.414,th-0.128-(k?0.004:0),4,mm(mT(cx,y+(k?0.004:0),cz),mRY(Math.PI/4))); B.box('stone',cx-s+0.05,y+th-0.12,cz-s+0.05,cx+s-0.05,y+th,cz+s-0.05); col(cx-s+0.1,y,cz-s+0.1,cx+s-0.1,y+th,cz+s-0.1); }
      const ns=Math.round(Hp/0.25), rs=Hp/ns, zf=cz+half+0.55, prof=[[0,0],[zf-cz,0]]; for(let i=0;i<ns;i++){ const z1=zf-i*run, y1=yb+(i+1)*rs; prof.push([z1-cz,y1-yb],[z1-run-cz,y1-yb]); col(cx-sw,yb,z1-run,cx+sw,y1,z1); }
      prof.push([0,Hp]); B.ext('stone',dedupe(prof),null,2*sw,mm(mT(cx+sw,yb,cz),mRY(-Math.PI/2)));
      for(const sx of [-1,1]) B.ext(wk,[[zf-cz,0],[top,Hp],[top,Hp+0.35],[zf-cz,0.35]],null,0.25,mm(mT(sx>0?cx+sw+0.254:cx-sw-0.004,yb,cz),mRY(-Math.PI/2)));   // the stair's sloping side ramps
      const yt=yb+Hp, tw=top; B.box(wk,cx-tw,yt,cz-tw*0.7,cx+tw,yt+2.3,cz+tw*0.7); col(cx-tw,yt,cz-tw*0.7,cx+tw,yt+2.3,cz+tw*0.7);
      B.flat('void',[[-0.45,0],[0.45,0],[0.45,1.3],[0.22,1.75],[-0.22,1.75],[-0.45,1.3]],mT(cx,yt,cz+tw*0.7+0.006)); B.box('band',cx-tw-0.02,yt+1.3,cz-tw*0.7-0.02,cx+tw+0.02,yt+2.2,cz+tw*0.7+0.02); B.box('stone',cx-tw-0.1,yt+2.2,cz-tw*0.7-0.1,cx+tw+0.1,yt+2.36,cz+tw*0.7+0.1);
      const cw=tw*0.8, ch=1.8, holes=[]; for(let r=0;r<2;r++) for(let q=0;q<3;q++){ const u=-cw+0.3+q*(2*cw-0.6)/3+0.12, v=0.3+r*0.8; holes.push([[u,v],[u+0.3,v],[u+0.3,v+0.5],[u,v+0.5]]); }
      B.ext(wk,[[-cw,0],[cw,0],[cw,ch],[-cw,ch]],holes,0.3,mT(cx,yt+2.36,cz-0.15)); break; }   // stepped temple pyramid: one stair up the front, a temple with a roof comb on top
    case 'pueblotower': { const r=half, yt=yb+Ht; B.cyl(wk,r,r*0.94,yt-yb,18,mT(cx,yb,cz)); for(let k=0;k<n+1;k++) for(let j=0;j<2;j++){ const a=j*Math.PI+k*1.1, y=yb+k*H+1.3; if(y>yt-0.6) continue; B.box('void',-0.22,0,0,0.22,0.4,0.04,mm(mT(cx,y,cz),mRY(a),mT(0,0,r*0.95))); }
      for(let k=0;k<10;k++){ const a=k/10*Math.PI*2; B.cyl('wood',0.08,0.08,0.45,6,mm(mT(cx+Math.cos(a)*(r-0.1),yt-0.4,cz+Math.sin(a)*(r-0.1)),mRY(-a),mRZ(-Math.PI/2))); }
      B.cyl(wk,r*0.94,r*0.94,0.45,18,mT(cx,yt,cz),true); B.cyl(wk,r*0.94-0.3,r*0.94-0.3,0.02,18,mT(cx,yt-0.02,cz)); break; }   // round adobe watchtower with viga ends
    case 'lookout': { const s=half-0.2, yt=yb+Ht-2.4; for(const [sx,sz] of P4) B.cyl('wood',0.13,0.11,yt-yb+2.0,7,mT(cx+sx*s,yb,cz+sz*s));
      for(const y of [yb+(yt-yb)*0.5,yt]){ B.box('wood',cx-s-0.2,y-0.12,cz-s-0.2,cx+s+0.2,y,cz+s+0.2); } for(const y of [yt+0.9]) for(const [a0,b0,a1,b1] of [[-s,-s,s,-s+0.06],[-s,s-0.06,s,s],[-s,-s,-s+0.06,s],[s-0.06,-s,s,s]]) B.box('wood',cx+a0,y,cz+b0,cx+a1,y+0.08,cz+b1);
      for(let i=0;i<Math.round((yt-yb)/0.35);i++){ B.box('wood',cx-0.3,yb+0.3+i*0.35,cz+s+0.25,cx+0.3,yb+0.34+i*0.35,cz+s+0.3); } for(const sx of [-0.3,0.3]) B.box('wood',cx+sx-0.03,yb,cz+s+0.22,cx+sx+0.03,yt,cz+s+0.33);
      skirtRoof(B,cx,yt+1.95,cz,4,s+0.8,0,(s+0.8)*1.2,{curve:1,lift:0,thick:0.26,tile:{kind:'thatch'}},'roofTile'); break; }   // timber lookout with a thatched cap
  }
}

/* ---------- roof pavilions ---------- */
function worldKiosk(B,kind,cx,y,cz,hk,kh,st,col,wk){
  const pr=st.pr||{tile:{kind:'barrel',c:'#a85a3a'}}, h=Math.min(2.7,kh), P4=[[1,1],[1,-1],[-1,1],[-1,-1]];
  switch(kind){
    case 'pergola': { const stoneCols=st.id==='roman', w=hk, d=hk*0.75; B.box('stone',cx-w-0.1,y,cz-d-0.1,cx+w+0.1,y+0.12,cz+d+0.1);
      for(const sx of [-1,0,1]) for(const sz of [-1,1]){ const px=cx+sx*(w-0.15), pz=cz+sz*(d-0.15); col(px-0.15,y,pz-0.15,px+0.15,y+h,pz+0.15);
        if(stoneCols){ B.cyl('stone',0.14,0.12,h-0.12,10,mT(px,y+0.12,pz)); B.box('stone',px-0.18,y+h-0.12,pz-0.18,px+0.18,y+h,pz+0.18); } else B.box(wk,px-0.16,y+0.12,pz-0.16,px+0.16,y+h,pz+0.16); }
      for(const sz of [-1,1]) B.box('wood',cx-w-0.3,y+h,cz+sz*(d-0.15)-0.08,cx+w+0.3,y+h+0.2,cz+sz*(d-0.15)+0.08);
      for(let u=-w-0.1;u<=w+0.1;u+=0.42) B.box('wood',cx+u-0.04,y+h+0.2,cz-d-0.35,cx+u+0.04,y+h+0.32,cz+d+0.35);
      const r=RNG('vine'+cx+cz); for(let i=0;i<16;i++) B.ico('leaf',r.range(0.25,0.42),mm(mT(cx+r.range(-w,w),y+h+0.42,cz+r.range(-d,d)),mS(1.3,0.45,1.3)),0);
      for(let i=0;i<5;i++) B.sphere('blossom',0.08,mT(cx+r.range(-w,w),y+h+0.08,cz+r.range(-d,d)),5,4);
      B.box('stone',cx-w*0.6,y+0.12,cz-0.25,cx+w*0.6,y+0.5,cz+0.25); col(cx-w*0.6,y,cz-0.25,cx+w*0.6,y+0.5,cz+0.25); break; }   // columns, beams and a vine
    case 'gazebo': { const n=st.id==='tudor'?4:8, r=hk*0.78, post=st.id==='tudor'?'wood':'paint'; B.cyl('stone',r+0.25,r+0.3,0.3,n,mm(mT(cx,y,cz),mRY(Math.PI/n)));
      const pp=[]; for(let k=0;k<n;k++){ const a=Math.PI/n+2*Math.PI*k/n; pp.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]); }
      for(const [px,pz] of pp){ B.box(post,px-0.06,y+0.3,pz-0.06,px+0.06,y+0.3+h,pz+0.06); col(px-0.07,y,pz-0.07,px+0.07,y+0.3+h,pz+0.07); }
      for(let k=0;k<n;k++){ const [ax,az]=pp[k], [bx,bz]=pp[(k+1)%n]; if(k===n-1) continue; B.segCyl(post,V3(ax,y+1.15,az),V3(bx,y+1.15,bz),0.035,0.035,4); B.segCyl(post,V3(ax,y+0.5,az),V3(bx,y+0.5,bz),0.03,0.03,4);
        B.segCyl(post,V3(ax,y+0.3+h-0.08,az),V3(bx,y+0.3+h-0.08,bz),0.06,0.06,4); for(let f=0.25;f<0.9;f+=0.25) B.segCyl(post,V3(ax+(bx-ax)*f,y+0.5,az+(bz-az)*f),V3(ax+(bx-ax)*f,y+1.15,az+(bz-az)*f),0.015,0.015,3); }
      const R=r+0.55, top=skirtRoof(B,cx,y+0.3+h-0.05,cz,n,R,0,R*(st.id==='russian'?1.35:0.95),{curve:1,lift:0,thick:0.1,tile:pr.tile},'roofTile');
      if(st.id==='russian'){ B.cyl('roofTile',0.18,0.18,0.3,10,mT(cx,top-0.05,cz)); B.lathe('dome',DOMEPROF.onion(0.25),12,mT(cx,top+0.25,cz)); } else worldRidgeEnd(B,'finial',null,V3(cx,top-0.05,cz));
      if(FT_LAMPS(st)) hangLampAsia(B,cx,y+0.3+h-0.15,cz,st.lamp); break; }   // painted octagonal gazebo (square banqueting house for Tudor)
    case 'palapa': { const r=hk*0.75; B.cyl('stone',r+0.2,r+0.25,0.2,12,mT(cx,y,cz)); for(let k=0;k<6;k++){ const a=k/6*Math.PI*2, px=cx+Math.cos(a)*r, pz=cz+Math.sin(a)*r; B.cyl('trunk',0.1,0.09,h,6,mT(px,y+0.2,pz)); col(px-0.1,y,pz-0.1,px+0.1,y+h,pz+0.1); }
      B.cyl('wood',r+0.05,r+0.05,0.12,12,mT(cx,y+0.2+h-0.12,cz),true); skirtRoof(B,cx,y+h,cz,12,r+0.9,0,(r+0.9)*1.05,{curve:1,lift:0,thick:0.28,tile:{kind:'thatch'}},'roofTile'); break; }   // round thatched shelter
  }
}
