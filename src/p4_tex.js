
/* ============================================================
   PROCEDURAL TEXTURES — every map tiles seamlessly
   ============================================================ */
function hx(h){ const n=parseInt(h.slice(1),16); return [n>>16&255,n>>8&255,n&255]; }
function rgba(a,al=1){ return `rgba(${a[0]|0},${a[1]|0},${a[2]|0},${al})`; }
function shade(h,k){ return rgba(hx(h).map(v=>clamp(v*k,0,255))); }
function mixc(a,b,t){ const A=hx(a),B=hx(b); return rgba(A.map((v,i)=>v+(B[i]-v)*t)); }
function cvs(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function blot(g,W,H,x,y,r,col){
  for(let ox=-1;ox<=1;ox++) for(let oy=-1;oy<=1;oy++){
    const X=x+ox*W, Y=y+oy*H; if(X+r<0||X-r>W||Y+r<0||Y-r>H) continue;
    const gr=g.createRadialGradient(X,Y,0,X,Y,r); gr.addColorStop(0,col); gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr; g.fillRect(X-r,Y-r,2*r,2*r);
  }
}
function mottle(g,W,H,rng,n,r0,r1,a){ for(let i=0;i<n;i++) blot(g,W,H,rng.f()*W,rng.f()*H,rng.range(r0,r1), rng.chance(.5)?`rgba(255,250,240,${a*rng.range(.4,1)})`:`rgba(40,25,10,${a*rng.range(.4,1)})`); }
function wrapRect(g,W,H,x,y,w,h){ for(let ox=-1;ox<=1;ox++) for(let oy=-1;oy<=1;oy++){ const X=x+ox*W, Y=y+oy*H; if(X+w<0||X>W||Y+h<0||Y>H) continue; g.fillRect(X,Y,w,h); } }
function speck(g,W,H,rng,n,cols,s0,s1){ for(let i=0;i<n;i++){ g.fillStyle=rng.pick(cols); const s=rng.range(s0,s1); g.fillRect(rng.f()*W,rng.f()*H,s,s); } }

function texMud(base,rng){
  const W=512, c=cvs(W,W), g=c.getContext('2d');
  g.fillStyle=base; g.fillRect(0,0,W,W);
  mottle(g,W,W,rng,260,20,110,0.09);
  g.lineCap='round';
  for(let i=0;i<1500;i++){ const x=rng.f()*W, y=rng.f()*W, a=rng.f()*Math.PI, l=rng.range(3,10);
    g.strokeStyle=rng.chance(.5)?'rgba(240,215,160,.32)':'rgba(70,45,20,.25)'; g.lineWidth=rng.range(.6,1.4);
    g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l); g.stroke(); }
  for(let i=0;i<40;i++){ g.strokeStyle='rgba(60,40,20,.022)'; g.lineWidth=rng.range(4,12); const x=rng.f()*W,y=rng.f()*W; g.beginPath(); g.arc(x,y,rng.range(30,90),rng.f()*6,rng.f()*6+1.2); g.stroke(); }
  return c;
}
function texCoral(base,rng,exposed){
  const W=512, c=cvs(W,W), g=c.getContext('2d');
  g.fillStyle=base; g.fillRect(0,0,W,W);
  const rows=13; let y=0;
  for(let r=0;r<rows;r++){ const h=W/rows; let x=-rng.f()*60;
    while(x<W){ const w=rng.range(40,110); g.fillStyle=`rgba(80,60,30,${exposed?0.13:0.035})`; g.fillRect(x,y,1.5,h); x+=w; }
    g.fillRect(0,y,W,1.2); y+=h; }
  for(let i=0;i<(exposed?14:6);i++){ const x=rng.f()*W, y2=rng.f()*W, r=rng.range(20,60);
    g.fillStyle=`rgba(150,130,95,${exposed?.35:.18})`; g.beginPath();
    for(let k=0;k<12;k++){ const a=k/12*6.283, rr=r*rng.range(.6,1.1); g.lineTo(x+Math.cos(a)*rr,y2+Math.sin(a)*rr); } g.fill();
    speck(g,W,W,rng,40,['rgba(90,70,40,.35)'],1,3); }
  mottle(g,W,W,rng,200,20,100,0.06);
  speck(g,W,W,rng,1500,['rgba(120,100,70,.18)','rgba(255,255,255,.3)'],1,2);
  return c;
}
function texBrick(base,mortar,rng,bw=32,bh=8,glaze){
  const W=512, c=cvs(W,W), g=c.getContext('2d');
  g.fillStyle=mortar; g.fillRect(0,0,W,W);
  const rows=W/bh, cols=W/bw;
  for(let j=0;j<rows;j++){ const off=(j%2)*bw/2;
    for(let i=0;i<=cols;i++){ const x=i*bw-off, y=j*bh; const cx=x+bw/2, cy=y+bh/2;
      const gl=glaze&&glaze((cx+W)%W,cy);
      g.fillStyle= gl ? gl : shade(base, rng.range(.86,1.1));
      wrapRect(g,W,W,x+1,y+1,bw-2,bh-2);
      if(!gl){ g.fillStyle='rgba(255,255,255,.05)'; wrapRect(g,W,W,x+1,y+1,bw-2,1.2); }
    } }
  mottle(g,W,W,rng,120,20,80,0.05);
  return c;
}
function texAshlar(base,rng,rows=10,courses){
  const W=512, c=cvs(W,W), g=c.getContext('2d');
  const rh=W/rows;
  for(let r=0;r<rows;r++){
    const col=courses? courses[r%courses.length] : base;
    const ws=[]; let s=0; while(s<W){ const w=rng.range(60,150); ws.push(w); s+=w; } const k=W/s;
    let x=rng.f()*40;
    for(const w0 of ws){ const w=w0*k; g.fillStyle=shade(col,rng.range(.93,1.06)); wrapRect(g,W,W,x,r*rh,w,rh);
      g.fillStyle='rgba(40,30,20,.32)'; wrapRect(g,W,W,x,r*rh,1.6,rh); x+=w; }
    g.fillStyle='rgba(40,30,20,.3)'; g.fillRect(0,r*rh,W,1.6);
    g.fillStyle='rgba(255,255,255,.07)'; g.fillRect(0,r*rh+1.6,W,1.4);
  }
  speck(g,W,W,rng,2600,['rgba(0,0,0,.08)','rgba(255,255,255,.1)'],1,2);
  mottle(g,W,W,rng,90,20,90,0.05);
  return c;
}
function texRubble(base,rng){
  const W=512, c=cvs(W,W), g=c.getContext('2d');
  g.fillStyle=shade(base,.7); g.fillRect(0,0,W,W);
  let y=0; while(y<W){ const h=Math.min(rng.range(28,60),W-y); let x=-rng.f()*40;
    while(x<W){ const w=rng.range(30,90); g.fillStyle=shade(base,rng.range(.85,1.15));
      g.beginPath(); const cx=x+w/2, cy=y+h/2; for(let k=0;k<9;k++){ const a=k/9*6.283; g.lineTo(cx+Math.cos(a)*w*rng.range(.4,.5), cy+Math.sin(a)*h*rng.range(.38,.5)); } g.fill();
      if(x<0){ g.save(); g.translate(W,0); g.fill(); g.restore(); }
      x+=w; } y+=h; }
  mottle(g,W,W,rng,80,20,70,0.08);
  return c;
}
function texPlaster(base,rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,W,W); mottle(g,W,W,rng,120,10,60,0.05); speck(g,W,W,rng,500,['rgba(0,0,0,.05)'],1,2); return c; }
function texWood(base,rng,vertical=true){
  const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,W,W);
  const pw=32; for(let p=0;p<W/pw;p++){ g.fillStyle=shade(base,rng.range(.85,1.12)); g.fillRect(p*pw,0,pw-1,W); g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(p*pw+pw-1,0,1,W); }
  for(let i=0;i<220;i++){ const x=rng.f()*W; g.strokeStyle=rng.chance(.5)?'rgba(0,0,0,.18)':'rgba(255,230,190,.08)'; g.lineWidth=rng.range(.5,1.5);
    g.beginPath(); for(let y=0;y<=W;y+=16) g.lineTo(x+Math.sin(y*0.05+i)*2, y); g.stroke(); }
  if(!vertical){ const d=cvs(W,W), h=d.getContext('2d'); h.translate(W/2,W/2); h.rotate(Math.PI/2); h.drawImage(c,-W/2,-W/2); return d; }
  return c;
}
function texPaint(base,wood,rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,W,W); mottle(g,W,W,rng,60,10,40,0.07);
  for(let i=0;i<70;i++){ g.fillStyle=shade(wood,rng.range(.8,1.1)); g.fillRect(rng.f()*W,rng.f()*W,rng.range(2,9),rng.range(1,4)); } return c; }

/* ---------- Hankin star patterns over periodic tilings ---------- */
function regPoly(cx,cy,n,R,rot){ const p=[]; for(let k=0;k<n;k++){ const a=rot+2*Math.PI*k/n; p.push([cx+R*Math.cos(a),cy+R*Math.sin(a)]); } return p; }
function tiling(fam){
  const s=1, out={polys:[]};
  const add=(cx,cy,n,R,rot,kind)=>out.polys.push({c:[cx,cy],n,R,rot,kind});
  if(fam==='444'){ out.pw=s; out.ph=s; add(.5,.5,4,s/Math.SQRT2,Math.PI/4,0); }
  else if(fam==='488'){ const p=s*(1+Math.SQRT2); out.pw=p; out.ph=p; add(0,0,8,s/(2*Math.sin(Math.PI/8)),Math.PI/8,0); add(p/2,p/2,4,s/Math.SQRT2,0,1); }
  else if(fam==='666'){ out.pw=Math.sqrt(3)*s; out.ph=3*s; add(0,0,6,s,Math.PI/6,0); add(out.pw/2,1.5*s,6,s,Math.PI/6,0); }
  else if(fam==='31212'){ const d=s*(2+Math.sqrt(3)), r3=Math.sqrt(3); out.pw=d; out.ph=d*r3;
    const R12=s/(2*Math.sin(Math.PI/12)), R3=s/r3;
    add(0,0,12,R12,Math.PI/12,0); add(d/2,d*r3/2,12,R12,Math.PI/12,0);
    add(d/2,d*r3/6,3,R3,Math.PI/6,1); add(d,d*r3/3,3,R3,Math.PI/2,1);
    add(d,d*r3/2+d*r3/6,3,R3,Math.PI/6,1); add(d*1.5,d*r3/2+d*r3/3,3,R3,Math.PI/2,1); }
  else if(fam==='3636'){ const r3=Math.sqrt(3); out.pw=2*s; out.ph=2*s*r3;
    add(0,0,6,s,0,0); add(s,s*r3,6,s,0,0);
    add(s,s*r3/3,3,s/r3,Math.PI/6,1); add(2*s,2*s*r3/3,3,s/r3,Math.PI/2,1);
    add(2*s,s*r3+s*r3/3,3,s/r3,Math.PI/6,1); add(3*s,s*r3+2*s*r3/3,3,s/r3,Math.PI/2,1); }
  return out;
}
function hankin(pts,theta){
  const n=pts.length, th=theta*Math.PI/180, ct=Math.cos(th), sn=Math.sin(th);
  const mids=[], dP=[], dM=[];
  for(let i=0;i<n;i++){ const a=pts[i], b=pts[(i+1)%n]; const ex=b[0]-a[0], ey=b[1]-a[1], L=Math.hypot(ex,ey); const e=[ex/L,ey/L], nn=[-e[1],e[0]];
    mids.push([(a[0]+b[0])/2,(a[1]+b[1])/2]); dP.push([ct*e[0]+sn*nn[0], ct*e[1]+sn*nn[1]]); dM.push([-ct*e[0]+sn*nn[0], -ct*e[1]+sn*nn[1]]); }
  const star=[], segs=[];
  for(let i=0;i<n;i++){ const j=(i+1)%n; const p=mids[i], r=dP[i], q=mids[j], s=dM[j];
    const den=r[0]*s[1]-r[1]*s[0]; let P;
    if(Math.abs(den)<1e-9) P=pts[j]; else { const t=((q[0]-p[0])*s[1]-(q[1]-p[1])*s[0])/den; P= t>0? [p[0]+r[0]*t,p[1]+r[1]*t] : pts[j]; }
    star.push(mids[i],P); segs.push([mids[i],P],[P,mids[j]]); }
  return {star,segs};
}
function drawHankin(fam,theta,pal,W=512){
  const T=tiling(fam), sc=W/T.pw, H=Math.round(T.ph*sc);
  const c=cvs(W,H), g=c.getContext('2d');
  g.fillStyle=pal.bg; g.fillRect(0,0,W,H);
  const shapes=[];
  for(let i=-1;i<=2;i++) for(let j=-1;j<=2;j++) for(const P of T.polys){
    const pts=regPoly(P.c[0]+i*T.pw, P.c[1]+j*T.ph, P.n, P.R, P.rot).map(p=>[p[0]*sc,p[1]*sc]);
    shapes.push({pts, kind:P.kind, h:hankin(pts,theta)}); }
  for(const s of shapes){ g.fillStyle= s.kind? (pal.fill2||pal.fill||pal.bg) : (pal.fill||pal.bg); g.beginPath(); s.pts.forEach(p=>g.lineTo(p[0],p[1])); g.closePath(); g.fill(); }
  for(const s of shapes){ g.fillStyle= s.kind? (pal.star2||pal.star) : pal.star; g.beginPath(); s.h.star.forEach(p=>g.lineTo(p[0],p[1])); g.closePath(); g.fill(); }
  const lw=W/40; g.lineCap='round'; g.lineJoin='round';
  for(const pass of [[pal.edge,lw*1.55],[pal.strap,lw]]){ g.strokeStyle=pass[0]; g.lineWidth=pass[1]; g.beginPath(); for(const s of shapes) for(const sg of s.h.segs){ g.moveTo(sg[0][0],sg[0][1]); g.lineTo(sg[1][0],sg[1][1]); } g.stroke(); }
  return {c, aspect:H/W};
}
function drawNajdi(pal,W=512){
  const c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=pal.bg; g.fillRect(0,0,W,W);
  const rows=8, rh=W/rows, n=8, tw=W/n, cols=[pal.a,pal.b,pal.c,pal.d];
  for(let r=0;r<rows;r++){ const y=r*rh;
    g.fillStyle=pal.d; g.fillRect(0,y,W,3);
    for(let i=0;i<n*2;i++){ const x=i*tw/2; const up=i%2===0; g.fillStyle=cols[(r+i)%4];
      g.beginPath(); if(up){ g.moveTo(x,y+rh-4); g.lineTo(x+tw/2,y+6); g.lineTo(x+tw,y+rh-4);} else { g.moveTo(x,y+6); g.lineTo(x+tw/2,y+rh-4); g.lineTo(x+tw,y+6);} g.fill(); } }
  return {c,aspect:1};
}
function drawZigzag(pal,W=512){
  const c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=pal.bg; g.fillRect(0,0,W,W);
  g.strokeStyle=pal.star; g.lineWidth=W/34; g.lineJoin='miter';
  const rows=6, rh=W/rows, n=8, tw=W/n;
  for(let r=0;r<rows;r++){ const y=r*rh+rh*0.5; g.beginPath(); for(let i=0;i<=n*2;i++) g.lineTo(i*tw/2, y+(i%2?-rh*0.28:rh*0.28)); g.stroke();
    g.fillStyle=pal.star; for(let i=0;i<n;i++){ const x=i*tw+tw/2; g.beginPath(); g.moveTo(x,y+rh*0.42); g.lineTo(x+7,y+rh*0.5); g.lineTo(x,y+rh*0.58); g.lineTo(x-7,y+rh*0.5); g.fill(); } }
  return {c,aspect:1};
}
const bannaiGlaze=(pal)=> (x,y)=>{ const u=(x/64)%1, v=(y/64)%1; const d=Math.abs(u-.5)+Math.abs(v-.5); if(d>0.3&&d<0.42) return pal.star; if(d<0.1) return pal.star2; return null; };
function drawPattern(fam,theta,pal,rng){
  { const w=drawPatternWorld(fam,pal,rng||RNG('pat')); if(w) return w; }
  if(fam==='asanoha'||fam==='seigaiha'||fam==='huiwen'||fam==='icecrack') return drawAsiaPattern(fam,pal,rng||RNG('pat'));
  if(fam==='najdi') return drawNajdi(pal);
  if(fam==='zigzag') return drawZigzag(pal);
  if(fam==='bannai') return {c:texBrick(pal.bg,'#8c7357',rng,32,8,bannaiGlaze(pal)),aspect:1};
  return drawHankin(fam,theta,pal);
}

/* ---------- friezes ---------- */
function drawBand(type,pal,rng,tilePat){
  { const w=drawBandWorld(type,pal,rng)||drawBandRuin(type,pal,rng); if(w) return w; }
  if(['caihua','dancheong','penbey','kranok','paras','plain'].includes(type)) return drawBandAsia(type,pal,rng);
  const W=1024,H=128, c=cvs(W,H), g=c.getContext('2d');
  g.fillStyle=pal.bg; g.fillRect(0,0,W,H);
  const border=()=>{ g.fillStyle=pal.a; g.fillRect(0,0,W,9); g.fillRect(0,H-9,W,9); };
  if(type==='meander'){
    g.strokeStyle=pal.a; g.lineWidth=11; g.lineCap='square'; const u=64;
    g.beginPath(); for(let x=0;x<W;x+=u){ g.moveTo(x+8,H-26); g.lineTo(x+8,26); g.lineTo(x+u-14,26); g.lineTo(x+u-14,H-48); g.lineTo(x+28,H-48); g.lineTo(x+28,48); } g.stroke(); border();
  } else if(type==='zigzag'){
    g.strokeStyle=pal.a; g.lineWidth=12; g.beginPath(); for(let i=0;i<=32;i++) g.lineTo(i*32, i%2?28:H-28); g.stroke();
    g.fillStyle=pal.a; g.fillRect(0,0,W,8); g.fillRect(0,H-8,W,8);
  } else if(type==='triangles'){
    const cols=[pal.a,pal.b,pal.c,pal.d]; const n=16, tw=W/n;
    for(let i=0;i<n*2;i++){ g.fillStyle=cols[i%4]; const x=i*tw/2, up=i%2===0; g.beginPath();
      if(up){ g.moveTo(x,H-12); g.lineTo(x+tw/2,12); g.lineTo(x+tw,H-12);} else { g.moveTo(x,12); g.lineTo(x+tw/2,H-12); g.lineTo(x+tw,12);} g.fill(); }
    g.fillStyle=pal.d; g.fillRect(0,0,W,7); g.fillRect(0,H-7,W,7);
  } else if(type==='rosette'){
    for(let i=0;i<8;i++){ const x=i*128+64, y=H/2; g.fillStyle=pal.a; g.beginPath(); g.arc(x,y,40,0,7); g.fill();
      g.fillStyle=pal.bg; for(let k=0;k<8;k++){ const a=k*Math.PI/4; g.beginPath(); g.ellipse(x+Math.cos(a)*20,y+Math.sin(a)*20,15,6,a,0,7); g.fill(); }
      g.fillStyle=pal.b; g.beginPath(); g.arc(x,y,8,0,7); g.fill(); g.fillStyle=pal.a; g.fillRect(x+48,y-3,32,6); }
    border();
  } else if(type==='chevron'){
    g.strokeStyle=pal.a; g.lineWidth=9; for(let k=0;k<3;k++){ g.beginPath(); for(let i=0;i<=32;i++) g.lineTo(i*32, (i%2?30:70)+k*18); g.stroke(); }
    g.fillStyle=pal.b; g.fillRect(0,0,W,6); g.fillRect(0,H-6,W,6);
  } else if(type==='tile'||type==='bannai'){
    if(tilePat){ const tc=tilePat.c; const th=H-28, tw=th/tilePat.aspect; for(let x=0;x<W;x+=tw) g.drawImage(tc,x,14,tw,th); }
    g.fillStyle=pal.b||pal.a; g.fillRect(0,0,W,10); g.fillRect(0,H-10,W,10); g.fillStyle=pal.c||pal.a; g.fillRect(0,10,W,4); g.fillRect(0,H-14,W,4);
  }
  return c;
}

/* ---------- doors (one leaf maps 0..1 across the opening) ---------- */
function drawDoor(kind,st,rng,tilePat){
  { const w=drawDoorWorld(kind,st,rng); if(w) return w; }
  if(['chinese','tibetan','bali','shoji','korean','newar','thai'].includes(kind)) return drawDoorAsia(kind,st,rng);
  const W=256,H=512, c=cvs(W,H), g=c.getContext('2d');
  const wood=st.wood;
  if(kind==='najdi'){
    const P=st.tilePal; g.fillStyle=P.bg; g.fillRect(0,0,W,H);
    for(let p=0;p<6;p++){ g.fillStyle='rgba(60,40,20,.25)'; g.fillRect(p*W/6,0,2,H); }
    const regs=9, rh=H/regs, cols=[P.a,P.b,P.c,P.d];
    for(let r=0;r<regs;r++){ const y=r*rh; g.fillStyle=P.d; g.fillRect(0,y,W,3);
      if(r%2===0){ const n=6, tw=W/n; for(let i=0;i<n*2;i++){ g.fillStyle=cols[(i+r)%4]; const x=i*tw/2, up=i%2===0; g.beginPath(); if(up){g.moveTo(x,y+rh-6);g.lineTo(x+tw/2,y+8);g.lineTo(x+tw,y+rh-6);} else {g.moveTo(x,y+8);g.lineTo(x+tw/2,y+rh-6);g.lineTo(x+tw,y+8);} g.fill(); } }
      else { g.strokeStyle=cols[r%4]; g.lineWidth=6; g.beginPath(); for(let i=0;i<=8;i++) g.lineTo(i*W/8, y+(i%2?rh*0.25:rh*0.75)); g.stroke(); } }
    g.fillStyle=P.d; g.fillRect(W/2-2,0,4,H);
  } else if(kind==='star' && tilePat){
    g.fillStyle=shade(wood,.8); g.fillRect(0,0,W,H);
    const pat=drawHankin('488',67.5,{bg:shade(wood,.75), fill:shade(wood,.9), fill2:shade(wood,.7), star:shade(wood,1.18), star2:shade(wood,1.05), strap:st.metal, edge:shade(wood,.45)},256);
    g.save(); g.beginPath(); g.rect(18,18,W-36,H-36); g.clip(); for(let y=18;y<H;y+=W*pat.aspect*0.5) for(let x=18;x<W;x+=W*0.5) g.drawImage(pat.c,x,y,W*0.5,W*0.5*pat.aspect); g.restore();
    g.strokeStyle=st.metal; g.lineWidth=8; g.strokeRect(14,14,W-28,H-28); g.fillStyle=shade(wood,.4); g.fillRect(W/2-2,0,4,H);
  } else if(kind==='studded'){
    g.drawImage(texWood(wood,rng),0,0,W,H/2); g.drawImage(texWood(wood,rng),0,H/2,W,H/2);
    g.fillStyle=shade(wood,.65); g.fillRect(W/2-10,0,20,H);
    for(let y=30;y<H-20;y+=56) for(let x=20;x<W;x+=26){ g.fillStyle=st.metal; g.beginPath(); g.arc(x,y,5.5,0,7); g.fill(); g.fillStyle='rgba(255,255,255,.4)'; g.beginPath(); g.arc(x-1.5,y-1.5,1.8,0,7); g.fill(); }
    g.fillStyle=shade(wood,.75); g.fillRect(0,0,W,24); for(let x=16;x<W;x+=32){ g.fillStyle=shade(wood,1.2); g.beginPath(); g.arc(x,12,8,0,7); g.fill(); }
  } else {
    g.fillStyle=wood; g.fillRect(0,0,W,H);
    const fr=22, cols=2, rows=5, pw=(W-fr*3)/cols, ph=(H-fr*(rows+1))/rows;
    for(let r=0;r<rows;r++) for(let q=0;q<cols;q++){ const x=fr+q*(pw+fr), y=fr+r*(ph+fr);
      g.fillStyle=shade(wood,.78); g.fillRect(x,y,pw,ph); g.fillStyle=shade(wood,1.25); g.fillRect(x,y,pw,4); g.fillRect(x,y,4,ph);
      g.fillStyle=shade(wood,.55); g.fillRect(x,y+ph-4,pw,4); g.fillRect(x+pw-4,y,4,ph);
      g.fillStyle=shade(wood,1.1); g.beginPath(); g.arc(x+pw/2,y+ph/2,Math.min(pw,ph)*0.2,0,7); g.fill(); g.fillStyle=shade(wood,.7); g.beginPath(); g.arc(x+pw/2,y+ph/2,Math.min(pw,ph)*0.08,0,7); g.fill(); }
    g.fillStyle=shade(wood,.45); g.fillRect(W/2-1.5,0,3,H);
  }
  return c;
}

/* ---------- lattices & screens (alpha-tested) ---------- */
function drawLattice(kind,col){
  { const w=drawLatticeWorld(kind,col); if(w) return w; }
  if(['koshi','chinese','korean','newar','jali'].includes(kind)) return drawLatticeAsia(kind,col);
  const W=256, c=cvs(W,W), g=c.getContext('2d'); g.clearRect(0,0,W,W);
  g.fillStyle=col; g.strokeStyle=col;
  if(kind==='mashrabiya'){
    const s=32; g.lineWidth=5;
    for(let i=0;i<=W;i+=s){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,W); g.moveTo(0,i); g.lineTo(W,i); g.stroke(); }
    for(let x=0;x<=W;x+=s) for(let y=0;y<=W;y+=s){ g.beginPath(); g.arc(x,y,9,0,7); g.fill(); g.beginPath(); g.ellipse(x+s/2,y,6,4,0,0,7); g.fill(); g.beginPath(); g.ellipse(x,y+s/2,4,6,0,0,7); g.fill(); }
  } else if(kind==='rawasheen'){
    g.lineWidth=7; const s=32; for(let k=-W;k<=2*W;k+=s){ g.beginPath(); g.moveTo(k,0); g.lineTo(k+W,W); g.moveTo(k,W); g.lineTo(k+W,0); g.stroke(); }
    g.lineWidth=6; g.strokeRect(3,3,W-6,W-6);
  } else { // kafes
    g.lineWidth=4; const s=18; for(let i=0;i<=W;i+=s){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,W); g.moveTo(0,i); g.lineTo(W,i); g.stroke(); }
  }
  return c;
}
function drawScreen(kind,col,rng){
  const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=col; g.fillRect(0,0,W,W);
  mottle(g,W,W,rng,30,10,40,0.05);
  g.globalCompositeOperation='destination-out'; g.fillStyle='#000';
  if(kind==='jali'){ g.globalCompositeOperation='source-over'; return drawLatticeAsia('jali',col); }
  if(kind==='hejazi'){
    for(let r=0;r<4;r++) for(let q=0;q<8;q++){ const x=q*32+9, y=r*64+10; g.beginPath(); g.moveTo(x,y+44); g.lineTo(x,y+12); g.arc(x+7,y+12,7,Math.PI,0); g.lineTo(x+14,y+44); g.closePath(); g.fill(); }
  } else {
    const pat=tiling('488'); const sc=W/pat.pw;
    for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) for(const P of pat.polys){ const pts=regPoly(P.c[0]+i*pat.pw,P.c[1]+j*pat.ph,P.n,P.R,P.rot).map(p=>[p[0]*sc,p[1]*sc]);
      const cx=(P.c[0]+i*pat.pw)*sc, cy=(P.c[1]+j*pat.ph)*sc, k=P.kind?0.5:0.42;
      const h=hankin(pts,67.5); g.beginPath(); h.star.forEach(p=>g.lineTo(cx+(p[0]-cx)*k, cy+(p[1]-cy)*k)); g.closePath(); g.fill(); }
  }
  g.globalCompositeOperation='source-over';
  return c;
}
function drawQamariya(rng){
  const W=512,H=256, c=cvs(W,H), g=c.getContext('2d'); g.fillStyle='#f3eee2'; g.fillRect(0,0,W,H);
  const cx=W/2, cy=H, cols=['#c8342b','#2f8f4e','#e3b02f','#2d5fa8','#e9e2cf','#c8342b','#2d5fa8'];
  const rings=[[0,70,1],[70,150,5],[150,250,9]];
  for(const [r0,r1,n] of rings) for(let k=0;k<n;k++){ const a0=Math.PI+k*Math.PI/n, a1=a0+Math.PI/n;
    g.fillStyle=cols[(k*3+r0)%cols.length]; g.beginPath(); g.arc(cx,cy,r1,a0,a1); if(r0>0) g.arc(cx,cy,r0,a1,a0,true); else g.lineTo(cx,cy); g.closePath(); g.fill(); }
  g.strokeStyle='#f3eee2'; g.lineWidth=11;
  for(const [r0,r1,n] of rings){ g.beginPath(); g.arc(cx,cy,r1,Math.PI,2*Math.PI); g.stroke(); for(let k=1;k<n;k++){ const a=Math.PI+k*Math.PI/n; g.beginPath(); g.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0); g.lineTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1); g.stroke(); } }
  return c;
}

/* ---------- ground, paving, roofs, textiles, domes ---------- */
function texGround(base,rng){ const W=512, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,W,W); mottle(g,W,W,rng,320,20,120,0.08);
  speck(g,W,W,rng,2600,['rgba(80,60,40,.25)','rgba(255,250,235,.3)','rgba(120,100,80,.3)'],1,3);
  for(let i=0;i<60;i++){ g.fillStyle=`rgba(90,75,60,${rng.range(.2,.4)})`; g.beginPath(); g.ellipse(rng.f()*W,rng.f()*W,rng.range(2,6),rng.range(2,4),rng.f()*3,0,7); g.fill(); } return c; }
function texPave(kind,st,rng){
  { const a=texPaveAsia(kind,st,rng)||texPaveWorld(kind,st,rng); if(a) return a; }
  const W=512, c=cvs(W,W), g=c.getContext('2d');
  if(kind==='brick'){ g.fillStyle='#8f7356'; g.fillRect(0,0,W,W); const u=32;
    for(let y=-u*2;y<W+u*2;y+=u) for(let x=-u*2;x<W+u*2;x+=u*2){ const o=(y/u)%2? u:0; g.fillStyle=shade('#b9906a',rng.range(.85,1.1)); wrapRect(g,W,W,x+o+1,y+1,u*2-2,u-2); }
    mottle(g,W,W,rng,60,20,80,0.06); }
  else if(kind==='flags'){ g.fillStyle=shade(st.stone,.7); g.fillRect(0,0,W,W); let y=0; while(y<W){ const h=y+128>W? W-y : [64,96,128][rng.int(0,2)]; let x=-rng.f()*60; while(x<W){ const w=rng.range(70,150); g.fillStyle=shade(st.stone,rng.range(.82,1.05)); wrapRect(g,W,W,x+2,y+2,w-4,h-4); x+=w; } y+=h; } speck(g,W,W,rng,1500,['rgba(0,0,0,.08)'],1,2); }
  else if(kind==='marble'){ const P={bg:'#ece5d6', fill:'#ece5d6', fill2:'#d9cdb2', star:st.ablaq[1]||'#333', star2:'#b98b4c', strap:'#f7f2e8', edge:'#6d6458'}; const p=drawHankin('444',67.5,P,256); for(let x=0;x<W;x+=256) for(let y=0;y<W;y+=256) g.drawImage(p.c,x,y,256,256); }
  else { g.drawImage(texGround(st.ground,rng),0,0); g.fillStyle='rgba(60,40,20,.08)'; g.fillRect(0,0,W,W); }
  return c;
}
function texRoofTile(rng,base){ base=base||'#b5502f'; const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=shade(base,0.68); g.fillRect(0,0,W,W); const cols=8, rows=8, cw=W/cols, rh=W/rows;
  for(let r=0;r<rows;r++) for(let q=0;q<cols;q++){ const x=q*cw, y=r*rh; const gr=g.createLinearGradient(x,0,x+cw,0); const b=hx(base).map(v=>v*rng.range(.85,1.1)); gr.addColorStop(0,rgba(b.map(v=>v*.6))); gr.addColorStop(.45,rgba(b.map(v=>v*1.15))); gr.addColorStop(1,rgba(b.map(v=>v*.55))); g.fillStyle=gr; g.fillRect(x+1,y,cw-2,rh-2); g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(x,y+rh-3,cw,3); } return c; }
function texCarpet(rng){ const W=256,H=512, c=cvs(W,H), g=c.getContext('2d'); const pal=rng.pick([['#8e1f1f','#1f2f5a','#e9dcc0','#c98a2b'],['#1f2f5a','#8e1f1f','#e9dcc0','#3d6b4a'],['#6b2a1c','#d8b25a','#efe3c8','#22324f']]);
  g.fillStyle=pal[0]; g.fillRect(0,0,W,H); g.fillStyle=pal[1]; g.fillRect(14,14,W-28,H-28); g.fillStyle=pal[0]; g.fillRect(30,30,W-60,H-60);
  for(let y=40;y<H-40;y+=24) for(let x=40;x<W-40;x+=24){ g.fillStyle=(x+y)%48?pal[3]:pal[2]; g.fillRect(x,y,6,6); }
  g.fillStyle=pal[1]; g.beginPath(); g.moveTo(W/2,H/2-110); g.lineTo(W/2+70,H/2); g.lineTo(W/2,H/2+110); g.lineTo(W/2-70,H/2); g.fill();
  g.fillStyle=pal[2]; g.beginPath(); g.moveTo(W/2,H/2-60); g.lineTo(W/2+36,H/2); g.lineTo(W/2,H/2+60); g.lineTo(W/2-36,H/2); g.fill(); return c; }
function texThatch(rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle='#8a7246'; g.fillRect(0,0,W,W);
  for(let i=0;i<900;i++){ const x=rng.f()*W, y=rng.f()*W; g.strokeStyle=rng.chance(.5)?'rgba(220,190,120,.5)':'rgba(70,55,30,.5)'; g.lineWidth=rng.range(1,2.4); g.beginPath(); g.moveTo(x,y); g.lineTo(x+rng.range(-6,6),y+rng.range(14,30)); g.stroke(); } return c; }
function texLead(rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle='#878d94'; g.fillRect(0,0,W,W); mottle(g,W,W,rng,80,10,50,0.07);
  for(let i=0;i<16;i++){ g.fillStyle='rgba(40,45,50,.45)'; g.fillRect(i*16,0,2,W); g.fillStyle='rgba(255,255,255,.18)'; g.fillRect(i*16+2,0,1,W); }
  for(let j=0;j<8;j++){ g.fillStyle='rgba(40,45,50,.25)'; g.fillRect(0,j*32,W,1.5); } return c; }
function texChevron(base,rng){ const W=512, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,W,W); mottle(g,W,W,rng,60,20,60,0.05);
  const n=8, s=W/n; for(let k=0;k<n*2;k++){ g.strokeStyle='rgba(60,45,30,.45)'; g.lineWidth=6; g.beginPath(); for(let i=0;i<=n*2;i++) g.lineTo(i*s/2, k*s/2 + (i%2?0:s/2)); g.stroke();
    g.strokeStyle='rgba(255,250,235,.35)'; g.lineWidth=3; g.beginPath(); for(let i=0;i<=n*2;i++) g.lineTo(i*s/2, k*s/2+5 + (i%2?0:s/2)); g.stroke(); } return c; }
function texSky(top,bot){ const c=cvs(4,256), g=c.getContext('2d'); const gr=g.createLinearGradient(0,0,0,256); gr.addColorStop(0,top); gr.addColorStop(0.62,mixc(top,bot,.65)); gr.addColorStop(1,bot); g.fillStyle=gr; g.fillRect(0,0,4,256); return c; }

/* ---------- bump (height) fields → normal maps ---------- */
const HF_LUM=new WeakMap();   // one readback per source canvas, however many normal maps are cut from it
function heightField(c,blur){
  const W=c.width, H=c.height, n=W*H; let L=HF_LUM.get(c);
  if(!L||L.length!==n){ const d=c.getContext('2d').getImageData(0,0,W,H).data; L=new Float32Array(n);
    for(let i=0;i<n;i++){ L[i]= d[i*4+3]<100? 0 : (0.299*d[i*4]+0.587*d[i*4+1]+0.114*d[i*4+2])/255; } HF_LUM.set(c,L); }
  let h=L.slice();
  for(let b=0;b<(blur||0);b++){ const o=new Float32Array(n);
    for(let y=0;y<H;y++){ const ym=((y-1+H)%H)*W, y0=y*W, yp=((y+1)%H)*W;
      for(let x=0;x<W;x++){ const xm=(x-1+W)%W, xp=(x+1)%W; o[y0+x]=(h[ym+x]+h[yp+x]+h[y0+xm]+h[y0+xp]+h[y0+x]*4)/8; } }
    h=o; }
  let mn=1, mx=0; for(let i=0;i<n;i++){ if(h[i]<mn) mn=h[i]; if(h[i]>mx) mx=h[i]; }
  const k=mx-mn>1e-4? 1/(mx-mn) : 1; for(let i=0;i<n;i++) h[i]=(h[i]-mn)*k;
  return {h,W,H};
}
function normalCanvas(f,strength){
  const {h,W,H}=f, c=cvs(W,H), g=c.getContext('2d'), img=g.createImageData(W,H), o=img.data, s=strength*W/256;
  for(let y=0;y<H;y++){ const ym=((y-1+H)%H)*W, yp=((y+1)%H)*W, y0=y*W;
    for(let x=0;x<W;x++){ const xm=(x-1+W)%W, xp=(x+1)%W;
      const nx=-(h[y0+xp]-h[y0+xm])*0.5*s, ny=(h[yp+x]-h[ym+x])*0.5*s, L=1/Math.sqrt(nx*nx+ny*ny+1), i=(y0+x)*4;
      o[i]=(nx*L*0.5+0.5)*255; o[i+1]=(ny*L*0.5+0.5)*255; o[i+2]=(L*0.5+0.5)*255; o[i+3]=255; } }
  g.putImageData(img,0,0); return c;
}
function heightCanvas(f){ const {h,W,H}=f, c=cvs(W,H), g=c.getContext('2d'), img=g.createImageData(W,H), o=img.data;
  for(let i=0;i<W*H;i++){ const v=h[i]*255; o[i*4]=o[i*4+1]=o[i*4+2]=v; o[i*4+3]=255; } g.putImageData(img,0,0); return c; }
/* equirectangular sky for image-based lighting (u = atan(z,x), v = asin(y)) */
function envCanvas(T){
  const W=256, H=128, c=cvs(W,H), g=c.getContext('2d'), img=g.createImageData(W,H), o=img.data;
  const top=hx(T.sky[0]), hor=hx(T.sky[1]), gnd=hx(T.hg), sun=hx(T.sun);
  const el=T.el*Math.PI/180, az=T.az*Math.PI/180, sd=[Math.cos(el)*Math.sin(az),Math.sin(el),Math.cos(el)*Math.cos(az)], si=T.si/2.4;
  const ss=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
  for(let y=0;y<H;y++){ const e=(0.5-(y+0.5)/H)*Math.PI, ce=Math.cos(e), se=Math.sin(e);
    for(let x=0;x<W;x++){ const ph=((x+0.5)/W-0.5)*Math.PI*2, dx=ce*Math.cos(ph), dz=ce*Math.sin(ph);
      let col; if(e>0){ const t=ss(0,0.75,e); col=[0,1,2].map(i=>hor[i]+(top[i]-hor[i])*t); } else { const t=ss(0,0.25,-e); col=[0,1,2].map(i=>hor[i]*0.85+(gnd[i]-hor[i]*0.85)*t); }
      const dt=Math.max(0,dx*sd[0]+se*sd[1]+dz*sd[2]), k=(Math.pow(dt,64)*1.6+Math.pow(dt,6)*0.3)*si;
      const i=(y*W+x)*4; o[i]=clamp(col[0]+sun[0]*k,0,255); o[i+1]=clamp(col[1]+sun[1]*k,0,255); o[i+2]=clamp(col[2]+sun[2]*k,0,255); o[i+3]=255; } }
  g.putImageData(img,0,0); return c;
}

/* ============================================================
   ASIA — walls, roofs, lattices, doors, friezes, patterns
   ============================================================ */
function texLime(base,rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,W,W); mottle(g,W,W,rng,90,10,60,0.05);
  for(let i=0;i<26;i++){ const x=rng.f()*W, w=rng.range(2,9), h=rng.range(30,140); const gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'rgba(70,66,58,0.10)'); gr.addColorStop(1,'rgba(70,66,58,0)'); g.fillStyle=gr; g.fillRect(x,rng.f()*W*0.6,w,h); }
  speck(g,W,W,rng,500,['rgba(0,0,0,.05)','rgba(255,255,255,.18)'],1,2); return c; }
function texBoards(base,rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=shade(base,.7); g.fillRect(0,0,W,W); const n=10, pw=W/n;
  for(let i=0;i<n;i++){ const x=i*pw, k=rng.range(.85,1.12); g.fillStyle=shade(base,k); g.fillRect(x+1,0,pw-3,W);
    for(let j=0;j<7;j++){ g.strokeStyle=`rgba(0,0,0,${rng.range(.06,.16)})`; g.lineWidth=1; g.beginPath(); const xx=x+rng.range(3,pw-4); g.moveTo(xx,0); g.bezierCurveTo(xx+rng.range(-3,3),W*0.3,xx+rng.range(-3,3),W*0.7,xx,W); g.stroke(); } }
  for(const y of [W*0.33,W*0.83]){ g.fillStyle=shade(base,.55); g.fillRect(0,y,W,5); } return c; }
function texPanels(base,rng){ const W=256, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=shade(base,.85); g.fillRect(0,0,W,W); const cols=2, rows=3, fw=14, pw=(W-fw*cols)/cols, ph=(W-fw*rows)/rows;
  for(let r=0;r<rows;r++) for(let q=0;q<cols;q++){ const x=fw/2+q*(pw+fw), y=fw/2+r*(ph+fw); g.fillStyle=shade(base,rng.range(.95,1.1)); g.fillRect(x,y,pw,ph);
    for(let k=0;k<5;k++){ g.strokeStyle=`rgba(0,0,0,${rng.range(.05,.12)})`; g.beginPath(); const yy=y+rng.range(4,ph-4); g.moveTo(x,yy); g.lineTo(x+pw,yy+rng.range(-3,3)); g.stroke(); }
    g.fillStyle='rgba(255,240,210,.12)'; g.fillRect(x,y,pw,3); g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(x,y+ph-3,pw,3); }
  g.fillStyle=shade(base,.6); for(let q=0;q<=cols;q++) g.fillRect(q*(pw+fw)-fw/2,0,fw,W); return c; }
function texWhitewash(base,rng){ const W=512, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,W,W);
  for(let y=0;y<W;y+=28){ let x=-rng.f()*40; while(x<W){ const w=rng.range(30,70); g.strokeStyle='rgba(120,110,95,0.10)'; g.lineWidth=2; g.strokeRect(x,y+rng.range(-3,3),w,rng.range(22,30)); x+=w; } }
  mottle(g,W,W,rng,160,14,80,0.07); for(let i=0;i<40;i++){ g.fillStyle='rgba(150,135,110,0.08)'; g.fillRect(rng.f()*W,rng.f()*W,rng.range(2,6),rng.range(40,180)); } return c; }
function texRoofTiles(spec,rng){
  { const w=texRoofTilesWorld(spec,rng); if(w) return w; }
  const W=256, c=cvs(W,W), g=c.getContext('2d'), base=spec.c;
  if(spec.kind==='thatch'){ g.fillStyle=base; g.fillRect(0,0,W,W);
    for(let i=0;i<1400;i++){ const x=rng.f()*W, y=rng.f()*W; g.strokeStyle=rng.chance(.5)?'rgba(225,200,140,.45)':'rgba(60,45,25,.45)'; g.lineWidth=rng.range(1,2.2); g.beginPath(); g.moveTo(x,y); g.lineTo(x+rng.range(-3,3),y+rng.range(14,30)); g.stroke(); }
    for(let y=0;y<W;y+=32){ g.fillStyle='rgba(40,30,15,.18)'; g.fillRect(0,y,W,3); } return c; }
  if(spec.kind==='barrel'){ const cols=8, cw=W/cols; g.fillStyle=shade(base,.55); g.fillRect(0,0,W,W);
    for(let q=0;q<cols;q++){ const x=q*cw, k=rng.range(.9,1.08);
      const gr=g.createLinearGradient(x,0,x+cw,0); gr.addColorStop(0,shade(base,.55*k)); gr.addColorStop(0.35,shade(base,1.2*k)); gr.addColorStop(0.65,shade(base,1.0*k)); gr.addColorStop(1,shade(base,.5*k));
      g.fillStyle=gr; g.fillRect(x+cw*0.18,0,cw*0.64,W);
      for(let y=0;y<W;y+=W/4){ g.fillStyle='rgba(0,0,0,.28)'; g.fillRect(x+cw*0.18,y,cw*0.64,4); g.fillStyle='rgba(255,255,255,.08)'; g.fillRect(x+cw*0.18,y+4,cw*0.64,3); } }
    mottle(g,W,W,rng,40,8,30,0.05); return c; }
  if(spec.kind==='glazed'){ const rows=8, cols=8, cw=W/cols, rh=W/rows; g.fillStyle=shade(base,.6); g.fillRect(0,0,W,W);
    for(let r=0;r<rows;r++) for(let q=0;q<cols;q++){ const edge=r===rows-1, col=edge&&spec.c2? spec.c2 : base, x=q*cw+(r%2?cw/2:0), y=r*rh;
      const gr=g.createLinearGradient(0,y,0,y+rh); gr.addColorStop(0,shade(col,1.15)); gr.addColorStop(1,shade(col,.75)); g.fillStyle=gr;
      for(const ox of [0,-W]){ g.beginPath(); g.moveTo(x+ox+1,y); g.lineTo(x+ox+cw-1,y); g.lineTo(x+ox+cw-1,y+rh*0.7); g.quadraticCurveTo(x+ox+cw/2,y+rh+2,x+ox+1,y+rh*0.7); g.closePath(); g.fill(); } }
    return c; }
  return texRoofTile(rng,base);
}
function drawLatticeAsia(kind,col){
  const W=256, c=cvs(W,W), g=c.getContext('2d'); g.clearRect(0,0,W,W); g.fillStyle=col; g.strokeStyle=col; g.lineCap='square';
  if(kind==='koshi'){ for(let x=0;x<W;x+=21){ g.fillRect(x,0,12,W); } g.fillRect(0,0,W,10); g.fillRect(0,W-10,W,10); }
  else if(kind==='chinese'){ g.lineWidth=7; const u=64; g.strokeRect(4,4,W-8,W-8);
    for(let x=0;x<W;x+=u) for(let y=0;y<W;y+=u){ g.beginPath(); g.moveTo(x+u*0.2,y+u*0.5); g.lineTo(x+u*0.2,y+u*0.2); g.lineTo(x+u*0.8,y+u*0.2); g.lineTo(x+u*0.8,y+u*0.8); g.lineTo(x+u*0.4,y+u*0.8); g.lineTo(x+u*0.4,y+u*0.45); g.lineTo(x+u*0.6,y+u*0.45); g.stroke();
      g.beginPath(); g.moveTo(x,y+u*0.5); g.lineTo(x+u*0.2,y+u*0.5); g.moveTo(x+u*0.8,y+u*0.5); g.lineTo(x+u,y+u*0.5); g.moveTo(x+u*0.5,y); g.lineTo(x+u*0.5,y+u*0.2); g.stroke(); } }
  else if(kind==='korean'){ g.lineWidth=5; for(let x=0;x<=W;x+=32){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,W); g.stroke(); } for(let y=0;y<=W;y+=32){ g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); }
    g.lineWidth=4; for(let x=16;x<W;x+=64) for(let y=16;y<W;y+=64){ g.beginPath(); g.arc(x+16,y+16,9,0,7); g.stroke(); } }
  else if(kind==='newar'){ g.lineWidth=6; const s=22; for(let k=-W;k<=2*W;k+=s){ g.beginPath(); g.moveTo(k,0); g.lineTo(k+W,W); g.moveTo(k,W); g.lineTo(k+W,0); g.stroke(); }
    for(let x=0;x<=W;x+=s) for(let y=0;y<=W;y+=s){ g.beginPath(); g.arc(x+(y/s%2?s/2:0),y,4,0,7); g.fill(); } g.lineWidth=10; g.strokeRect(5,5,W-10,W-10); }
  else if(kind==='jali'){ g.fillRect(0,0,W,W); g.globalCompositeOperation='destination-out'; g.fillStyle='#000'; const s=W/4;
    for(let r=0;r<5;r++) for(let q=0;q<5;q++){ const x=q*s+(r%2?s/2:0), y=r*s*0.866; g.beginPath(); for(let k=0;k<12;k++){ const a=k*Math.PI/6, R=k%2?s*0.2:s*0.36; g.lineTo(x+Math.cos(a)*R,y+Math.sin(a)*R); } g.closePath(); g.fill(); }
    g.globalCompositeOperation='source-over'; }
  return c;
}
function drawDoorAsia(kind,st,rng){
  const W=256,H=512, c=cvs(W,H), g=c.getContext('2d');
  const half=(fn)=>{ fn(0); g.save(); g.translate(W,0); g.scale(-1,1); fn(0); g.restore(); };
  if(kind==='chinese'||kind==='tibetan'||kind==='bali'){
    const base= kind==='bali'? st.paint : kind==='tibetan'? '#8f2a1f' : st.paint;
    g.fillStyle=shade(base,.9); g.fillRect(0,0,W,H); mottle(g,W,H,rng,50,10,40,0.05);
    g.fillStyle=shade(base,.55); g.fillRect(W/2-3,0,6,H); g.fillRect(0,0,W,8); g.fillRect(0,H-8,W,8);
    if(kind==='chinese'){ for(let r=0;r<7;r++) for(let q=0;q<3;q++) for(const sx of [0,W/2]){ const x=sx+26+q*37, y=60+r*58; g.fillStyle='#c99a3e'; g.beginPath(); g.arc(x,y,8,0,7); g.fill(); g.fillStyle='rgba(255,240,190,.6)'; g.beginPath(); g.arc(x-2,y-2,3,0,7); g.fill(); } }
    else if(kind==='tibetan'){ g.strokeStyle='#1d1a17'; g.lineWidth=12; g.strokeRect(6,6,W-12,H-12); g.fillStyle='#c99a3e'; for(const y of [120,256,392]) for(const sx of [0,W/2]){ g.fillRect(sx+10,y-6,W/2-20,12); } }
    else { g.fillStyle=st.metal; for(const sx of [0,W/2]){ g.fillRect(sx+12,16,W/2-24,H-32); g.fillStyle=shade(base,1.0); g.fillRect(sx+22,26,W/2-44,H-52); g.fillStyle=st.metal;
      for(let y=60;y<H-40;y+=70){ g.beginPath(); g.ellipse(sx+W/4,y,30,22,0,0,7); g.fill(); g.fillStyle=shade(base,1.0); g.beginPath(); g.ellipse(sx+W/4,y,18,12,0,0,7); g.fill(); g.fillStyle=st.metal; } } }
    return c; }
  if(kind==='shoji'||kind==='korean'){ g.fillStyle='#f1ebdc'; g.fillRect(0,0,W,H); g.strokeStyle=st.wood; g.fillStyle=st.wood;
    g.fillRect(0,0,W,12); g.fillRect(0,H-40,W,40); g.fillRect(0,0,12,H); g.fillRect(W-12,0,12,H); g.fillRect(W/2-6,0,12,H);
    g.lineWidth=5; const cw=kind==='shoji'?W/8:W/6, rh=kind==='shoji'?H/12:H/10;
    for(let x=0;x<W;x+=cw){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,H-40); g.stroke(); } for(let y=0;y<H-40;y+=rh){ g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); }
    return c; }
  if(kind==='newar'){ g.fillStyle=shade(st.wood,1.0); g.fillRect(0,0,W,H); g.fillStyle=shade(st.wood,.6); g.fillRect(W/2-3,0,6,H);
    for(const sx of [0,W/2]){ g.strokeStyle=shade(st.wood,1.5); g.lineWidth=6; g.strokeRect(sx+14,14,W/2-28,H-28); g.strokeRect(sx+28,60,W/2-56,180);
      g.fillStyle=shade(st.wood,1.4); for(let k=0;k<6;k++){ const a=k*Math.PI/3; g.beginPath(); g.ellipse(sx+W/4+Math.cos(a)*22,150+Math.sin(a)*22,14,6,a,0,7); g.fill(); }
      for(let y=280;y<H-30;y+=26){ g.fillStyle=shade(st.wood,1.25); g.fillRect(sx+30,y,W/2-60,8); } }
    return c; }
  if(kind==='thai'){ g.fillStyle=shade(st.wood,1.05); g.fillRect(0,0,W,H); g.fillStyle=shade(st.wood,.55); g.fillRect(W/2-3,0,6,H);
    for(const sx of [0,W/2]){ g.fillStyle=st.metal; g.fillRect(sx+16,16,W/2-32,H-32); g.fillStyle=shade(st.paint,.8); g.fillRect(sx+24,24,W/2-48,H-48); g.fillStyle=st.metal;
      for(let y=50;y<H-40;y+=36){ g.beginPath(); g.moveTo(sx+W/4,y); g.quadraticCurveTo(sx+W/4+40,y+18,sx+W/4,y+30); g.quadraticCurveTo(sx+W/4-40,y+18,sx+W/4,y); g.fill(); } }
    return c; }
  return drawDoor('plain',st,rng,null);
}
function drawBandAsia(type,pal,rng){
  const W=1024,H=128, c=cvs(W,H), g=c.getContext('2d'); g.fillStyle=pal.bg; g.fillRect(0,0,W,H);
  if(type==='caihua'||type==='dancheong'){
    for(let i=0;i<4;i++){ const x0=i*256;
      g.fillStyle=pal.a; g.fillRect(x0,0,256,H); g.fillStyle=pal.bg; g.fillRect(x0,12,256,H-24);
      g.fillStyle=pal.d||'#f1ead6'; g.beginPath(); g.ellipse(x0+128,H/2,80,38,0,0,7); g.fill(); g.fillStyle=pal.b; g.beginPath(); g.ellipse(x0+128,H/2,68,30,0,0,7); g.fill();
      g.fillStyle=pal.c; for(let k=0;k<8;k++){ const a=k*Math.PI/4; g.beginPath(); g.ellipse(x0+128+Math.cos(a)*16,H/2+Math.sin(a)*12,10,5,a,0,7); g.fill(); }
      for(const sx of [24,232]){ g.fillStyle=pal.d||'#f1ead6'; for(let k=0;k<4;k++){ g.fillRect(x0+sx-4+(sx<128?k*10:-k*10),16+k*6,6,H-32-k*12); } } }
    g.fillStyle=pal.c; g.fillRect(0,0,W,5); g.fillRect(0,H-5,W,5); }
  else if(type==='penbey'){ for(let y=0;y<H;y+=4) for(let x=0;x<W;x+=4){ g.fillStyle=shade(pal.bg,rng.range(.7,1.2)); g.fillRect(x,y,4,4); }
    for(let x=60;x<W;x+=180){ g.fillStyle=pal.b; g.beginPath(); g.arc(x,H/2,22,0,7); g.fill(); g.fillStyle=pal.bg; g.beginPath(); g.arc(x,H/2,12,0,7); g.fill(); g.fillStyle=pal.b; g.beginPath(); g.arc(x,H/2,6,0,7); g.fill(); }
    g.fillStyle=pal.c; g.fillRect(0,0,W,6); g.fillRect(0,H-6,W,6); }
  else if(type==='kranok'){ g.fillStyle=pal.a; for(let x=0;x<W;x+=64){ g.beginPath(); g.moveTo(x,H-14); g.quadraticCurveTo(x+12,H*0.3,x+32,14); g.quadraticCurveTo(x+36,H*0.45,x+60,H-14); g.closePath(); g.fill();
      g.fillStyle=pal.b; g.beginPath(); g.arc(x+32,H-30,8,0,7); g.fill(); g.fillStyle=pal.a; } g.fillRect(0,0,W,8); g.fillRect(0,H-8,W,8); }
  else if(type==='paras'){ g.fillStyle=shade(pal.bg,.85); for(let x=0;x<W;x+=96){ for(let k=0;k<5;k++){ const a=-Math.PI/2+(k-2)*0.5; g.beginPath(); g.ellipse(x+48+Math.cos(a)*24,H/2+Math.sin(a)*24+10,22,9,a,0,7); g.fill(); } g.fillStyle=pal.b; g.beginPath(); g.arc(x+48,H/2+12,9,0,7); g.fill(); g.fillStyle=shade(pal.bg,.85); }
    mottle(g,W,H,rng,60,6,24,0.08); g.fillStyle=pal.a; g.fillRect(0,0,W,8); g.fillRect(0,H-8,W,8); }
  else { g.fillStyle=pal.a; g.fillRect(0,0,W,10); g.fillRect(0,H-10,W,10); }
  return c;
}
function drawAsiaPattern(fam,pal,rng){
  const W=512, c=cvs(W,W), g=c.getContext('2d'); g.fillStyle=pal.bg; g.fillRect(0,0,W,W); g.strokeStyle=pal.a; g.fillStyle=pal.a; g.lineCap='round'; g.lineJoin='round';
  if(fam==='asanoha'){ const s=W/4, h=s*Math.sqrt(3)/2; g.lineWidth=5;
    for(let r=-1;r<=Math.ceil(W/h)+1;r++) for(let q=-1;q<=5;q++){ const x=q*s+(r%2?s/2:0), y=r*h;
      const tri=[[x,y],[x+s,y],[x+s/2,y+h]], cx=(x+x+s+x+s/2)/3, cy=(y+y+y+h)/3; g.beginPath(); for(const p of tri){ g.moveTo(cx,cy); g.lineTo(p[0],p[1]); } for(const [a,b] of [[0,1],[1,2],[2,0]]){ const m=[(tri[a][0]+tri[b][0])/2,(tri[a][1]+tri[b][1])/2]; g.moveTo(cx,cy); g.lineTo(m[0],m[1]); } g.stroke();
      const tri2=[[x+s/2,y+h],[x+s,y],[x+s*1.5,y+h]], dx=(tri2[0][0]+tri2[1][0]+tri2[2][0])/3, dy=(tri2[0][1]+tri2[1][1]+tri2[2][1])/3; g.beginPath(); for(const p of tri2){ g.moveTo(dx,dy); g.lineTo(p[0],p[1]); } g.stroke();
      g.beginPath(); g.moveTo(x,y); g.lineTo(x+s,y); g.lineTo(x+s/2,y+h); g.closePath(); g.stroke(); } return {c,aspect:1}; }
  if(fam==='seigaiha'){ const r=W/8; g.lineWidth=4; for(let row=-1;row<=W/(r*0.5)+1;row++) for(let q=-1;q<=9;q++){ const x=q*r*2+(row%2?r:0), y=row*r*0.5+r;
      for(let k=4;k>=1;k--){ g.fillStyle=k%2?pal.a:pal.bg; g.beginPath(); g.arc(x,y,r*k/4,Math.PI,0); g.fill(); } } return {c,aspect:1}; }
  if(fam==='huiwen'){ const u=W/8; g.lineWidth=u*0.16;
    for(let x=0;x<W;x+=u) for(let y=0;y<W;y+=u){ g.beginPath(); g.moveTo(x+u*0.1,y+u*0.9); g.lineTo(x+u*0.1,y+u*0.1); g.lineTo(x+u*0.9,y+u*0.1); g.lineTo(x+u*0.9,y+u*0.75); g.lineTo(x+u*0.3,y+u*0.75); g.lineTo(x+u*0.3,y+u*0.3); g.lineTo(x+u*0.7,y+u*0.3); g.lineTo(x+u*0.7,y+u*0.55); g.lineTo(x+u*0.5,y+u*0.55); g.stroke(); } return {c,aspect:1}; }
  if(fam==='icecrack'){ g.lineWidth=7; const pts=[]; for(let i=0;i<22;i++) pts.push([rng.f()*W,rng.f()*W]);
    for(const p of pts){ const near=pts.filter(q=>q!==p).sort((a,b)=>Math.hypot(a[0]-p[0],a[1]-p[1])-Math.hypot(b[0]-p[0],b[1]-p[1])).slice(0,3); for(const q of near) for(const ox of [-W,0,W]) for(const oy of [-W,0,W]){ g.beginPath(); g.moveTo(p[0]+ox,p[1]+oy); g.lineTo(q[0]+ox,q[1]+oy); g.stroke(); } }
    g.lineWidth=10; g.strokeRect(5,5,W-10,W-10); return {c,aspect:1}; }
  return drawHankin('666',60,pal);
}
function texPaveAsia(kind,st,rng){ const W=512, c=cvs(W,W), g=c.getContext('2d');
  if(kind==='greybrick'){ g.fillStyle='#6e7072'; g.fillRect(0,0,W,W); const u=64; for(let y=0;y<W;y+=u) for(let x=0;x<W;x+=u){ g.fillStyle=shade('#9a9c9c',rng.range(.88,1.08)); g.fillRect(x+2,y+2,u-4,u-4); } mottle(g,W,W,rng,40,20,70,0.05); return c; }
  if(kind==='pebble'){ g.fillStyle='#8c8a82'; g.fillRect(0,0,W,W); for(let i=0;i<2600;i++){ g.fillStyle=rng.pick(['#d9d4c7','#5d5b56','#a8a49a','#c9b79a']); g.beginPath(); g.ellipse(rng.f()*W,rng.f()*W,rng.range(3,6),rng.range(2,4),rng.f()*3,0,7); g.fill(); }
    g.strokeStyle='#4f4d48'; g.lineWidth=5; for(let x=0;x<W;x+=128) for(let y=0;y<W;y+=128){ g.beginPath(); g.arc(x+64,y+64,40,0,7); g.stroke(); } return c; }
  if(kind==='gravel'){ g.fillStyle='#c9c3b4'; g.fillRect(0,0,W,W); speck(g,W,W,rng,6000,['#e3ddcf','#a9a293','#d6d0c1','#8f897c'],1,3); return c; }
  if(kind==='boards'){ g.drawImage(texBoards(st.wood,rng),0,0,W,W); return c; }
  return null;
}
function texFlags(){ const W=256, c=cvs(W,64), g=c.getContext('2d'); const cols=['#2a62b8','#f2f0e8','#c8342b','#2f8f4e','#e8c234']; for(let i=0;i<5;i++){ g.fillStyle=cols[i]; g.fillRect(i*W/5,0,W/5,64); g.fillStyle='rgba(0,0,0,.15)'; for(let k=0;k<6;k++) g.fillRect(i*W/5+8,10+k*8,W/5-16,2); } return c; }
