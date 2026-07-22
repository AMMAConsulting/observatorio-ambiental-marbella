"use strict";
/* ---------- Configuración de indicadores ---------- */
const CATS = {
  verde:     {label:"Verde urbano",   color:"#16a34a"},
  aire:      {label:"Depuración de aire", color:"#0891b2"},
  clima:     {label:"Clima urbano",   color:"#ea580c"},
  territorio:{label:"Territorio",     color:"#6366f1"},
};
const IND = {
  cobveg:  {name:"Cobertura vegetal", unit:"%", cat:"verde", dir:"up", dec:1, ic:"🌳",
            desc:"Porcentaje de suelo cubierto por vegetación. A más cobertura, mayor confort térmico y calidad paisajística del destino."},
  verdehab:{name:"Superficie verde por habitante", unit:"m²/hab", cat:"verde", dir:"up", dec:0, ic:"🌱",
            desc:"Metros cuadrados de cobertura verde por habitante. Referencia OMS deseable: ≥ 10–15 m²/hab."},
  calveg:  {name:"Calidad de la vegetación", unit:"índice", cat:"verde", dir:"up", dec:2, ic:"🍃",
            desc:"Índice de vigor/estado de la vegetación (0–1). Valores altos indican masa vegetal sana."},
  humveg:  {name:"Humedad de la vegetación", unit:"índice", cat:"verde", dir:"up", dec:3, ic:"💧",
            desc:"Índice de humedad de las superficies vegetales. Cae en episodios de sequía y estrés hídrico."},
  co2:     {name:"Absorción de CO₂ por vegetación", unit:"t CO₂/mes", cat:"verde", dir:"up", dec:0, ic:"🌍",
            desc:"Toneladas de CO₂ absorbidas mensualmente por la vegetación del ámbito."},
  no2:     {name:"NO₂ eliminado por vegetación", unit:"kg/mes", cat:"aire", dir:"up", dec:0, ic:"💨",
            desc:"Kilogramos de NO₂ retirados de la atmósfera por la vegetación cada mes."},
  pm25:    {name:"PM₂,₅ eliminado por vegetación", unit:"kg/mes", cat:"aire", dir:"up", dec:1, ic:"🌫️",
            desc:"Partículas finas PM₂,₅ capturadas por la vegetación. Buen proxy de servicio de limpieza del aire."},
  so2:     {name:"SO₂ eliminado por vegetación", unit:"kg/mes", cat:"aire", dir:"up", dec:0, ic:"🏭",
            desc:"Kilogramos de SO₂ retirados por la vegetación cada mes."},
  tempsup: {name:"Temperatura superficial", unit:"°C", cat:"clima", dir:"down", dec:1, ic:"🌡️",
            desc:"Temperatura de la superficie del terreno (LST). Clave para detectar sobrecalentamiento urbano."},
  isla:    {name:"Riesgo de isla de calor (UTFVI)", unit:"índice", cat:"clima", dir:"down", dec:3, ic:"🔥",
            desc:"Índice UTFVI de isla de calor urbana. Valores más bajos = menor riesgo térmico."},
  alttemp: {name:"Superficie con altas temperaturas", unit:"ha", cat:"clima", dir:"down", dec:0, ic:"♨️",
            desc:"Hectáreas afectadas por temperaturas superficiales elevadas."},
  albedo:  {name:"Albedo", unit:"índice", cat:"clima", dir:"up", dec:3, ic:"☀️",
            desc:"Reflectividad de la superficie. Un albedo mayor refleja más radiación y reduce el calentamiento."},
  sellado: {name:"Suelo sellado", unit:"%", cat:"territorio", dir:"down", dec:1, ic:"🧱",
            desc:"Porcentaje de suelo impermeabilizado (edificación, pavimento). A menos sellado, mejor drenaje y menos calor."},
  compac:  {name:"Compacidad absoluta", unit:"%", cat:"territorio", dir:"up", dec:1, ic:"🏙️",
            desc:"Compacidad del tejido urbano. Una ciudad más compacta consume menos suelo y territorio."},
  lumin:   {name:"Contaminación lumínica", unit:"radiancia", cat:"territorio", dir:"down", dec:1, ic:"🌙",
            desc:"Brillo nocturno emitido. Menos contaminación lumínica protege el cielo y la biodiversidad."},
};
const ZCOL = {"Municipio":"var(--z-mun)","Distrito 01":"var(--z-d1)","Distrito 02":"var(--z-d2)","Distrito 03":"var(--z-d3)","Distrito 04":"var(--z-d4)"};
const ZONES_MAIN = ["Municipio","Distrito 01","Distrito 02","Distrito 03","Distrito 04"];
const MONTHS=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

/* ---------- Índice de datos ---------- */
// OBS = {fechas, zonas, units, rec:[[fIdx, code, zIdx, v], ...]}
const F = OBS.fechas, Z = OBS.zonas;
// series[code][zoneName] = [{fi, v}]
const SER = {};
for(const [fi,code,zi,v] of OBS.rec){
  (SER[code] ||= {});
  (SER[code][Z[zi]] ||= []).push({fi, v});
}
for(const c in SER) for(const z in SER[c]) SER[c][z].sort((a,b)=>a.fi-b.fi);

const fmtDate = fi => { const d=F[fi].split("-"); return MONTHS[+d[1]-1]+" "+d[0]; };
const nf = (v,dec)=> v==null?"—":Number(v).toLocaleString("es-ES",{minimumFractionDigits:dec,maximumFractionDigits:dec});

/* ---------- Header chips ---------- */
document.getElementById("chPer").textContent = fmtDate(0)+" – "+fmtDate(F.length-1);
document.getElementById("chN").textContent = OBS.rec.length.toLocaleString("es-ES");

/* ---------- Tooltip helper ---------- */
const tip=document.getElementById("tip");
function showTip(html,x,y){tip.innerHTML=html;tip.style.opacity=1;
  let tx=x+14, ty=y+14; const w=tip.offsetWidth,h=tip.offsetHeight;
  if(tx+w>innerWidth-8) tx=x-w-14; if(ty+h>innerHeight-8) ty=y-h-14;
  tip.style.left=tx+"px";tip.style.top=ty+"px";}
function hideTip(){tip.style.opacity=0;}

/* ---------- Generic line chart (multi-series) ---------- */
function lineChart(el, series, opts){
  // series: [{name, color, data:[{fi,v}], width, mainKey}]
  opts=opts||{};
  const W=720, H=340, m={t:14,r:18,b:34,l:56};
  const iw=W-m.l-m.r, ih=H-m.t-m.b;
  const allFi = [...new Set(series.flatMap(s=>s.data.map(d=>d.fi)))].sort((a,b)=>a-b);
  if(!allFi.length){el.innerHTML="<p class='c-desc'>Sin datos.</p>";return;}
  const fiMin=allFi[0], fiMax=allFi[allFi.length-1];
  let vals=series.flatMap(s=>s.data.map(d=>d.v));
  let vMin=Math.min(...vals), vMax=Math.max(...vals);
  if(vMin===vMax){vMax+=1;vMin-=1;}
  const pad=(vMax-vMin)*0.08; vMin-=pad; vMax+=pad;
  if(opts.zeroBase && vMin>0) vMin=0;
  const X=fi=> m.l + (fiMax===fiMin?iw/2:(fi-fiMin)/(fiMax-fiMin)*iw);
  const Y=v=> m.t + ih - (v-vMin)/(vMax-vMin)*ih;

  // y ticks
  const nY=5; let yt="";
  for(let i=0;i<=nY;i++){const v=vMin+(vMax-vMin)*i/nY; const y=Y(v);
    yt+=`<line class="grid" x1="${m.l}" y1="${y}" x2="${W-m.r}" y2="${y}"/>`+
        `<text class="tick" x="${m.l-8}" y="${y+4}" text-anchor="end">${nf(v, opts.dec??1)}</text>`;}
  // x ticks: enero de cada año
  let xt="";
  allFi.forEach(fi=>{ if(F[fi].slice(5)==="01-01"){ const x=X(fi);
    xt+=`<line class="grid" x1="${x}" y1="${m.t}" x2="${x}" y2="${m.t+ih}"/>`+
        `<text class="tick" x="${x}" y="${H-12}" text-anchor="middle">${F[fi].slice(0,4)}</text>`;}});

  let paths="";
  series.forEach(s=>{
    const pts=s.data.map(d=>[X(d.fi),Y(d.v)]);
    const dd=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
    const cvar=s.color;
    paths+=`<path class="serie ${s.mainKey?'mun':''}" data-n="${s.name}" style="stroke:${cvar}" d="${dd}"/>`;
  });

  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="gráfica de líneas">
    <line class="axis" x1="${m.l}" y1="${m.t+ih}" x2="${W-m.r}" y2="${m.t+ih}"/>
    ${yt}${xt}${paths}
    <line class="vline" id="vln" x1="0" y1="${m.t}" x2="0" y2="${m.t+ih}" style="opacity:0"/>
    <g id="hdots"></g>
    <rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent" id="hit"/>
  </svg>`;

  const svg=el.querySelector("svg"), vln=el.querySelector("#vln"), hdots=el.querySelector("#hdots"), hit=el.querySelector("#hit");
  hit.addEventListener("mousemove",ev=>{
    const r=svg.getBoundingClientRect(); const sx=(ev.clientX-r.left)/r.width*W;
    // nearest fi
    let best=allFi[0],bd=1e9;
    allFi.forEach(fi=>{const d=Math.abs(X(fi)-sx); if(d<bd){bd=d;best=fi;}});
    const x=X(best);
    vln.setAttribute("x1",x);vln.setAttribute("x2",x);vln.style.opacity=1;
    let dots="",rows="";
    series.forEach(s=>{const p=s.data.find(d=>d.fi===best); if(!p)return;
      const y=Y(p.v);
      dots+=`<circle class="dotv" cx="${x}" cy="${y}" r="4.5" style="stroke:${s.color}"/>`;
      rows+=`<div class="row"><i style="background:${s.color}"></i>${s.name}: <b>${nf(p.v,opts.dec??1)}</b> ${opts.unit||""}</div>`;});
    hdots.innerHTML=dots;
    showTip(`<b>${fmtDate(best)}</b>${rows}`,ev.clientX,ev.clientY);
  });
  hit.addEventListener("mouseleave",()=>{vln.style.opacity=0;hdots.innerHTML="";hideTip();});
}

/* ---------- KPIs ---------- */
const KPI_LIST=["cobveg","verdehab","sellado","tempsup","isla","co2"];
function sparkline(data){
  const W=160,H=38,p=3;
  const vs=data.map(d=>d.v); let mn=Math.min(...vs),mx=Math.max(...vs); if(mn===mx){mx+=1;mn-=1;}
  const X=i=>p+i/(data.length-1)*(W-2*p), Y=v=>H-p-(v-mn)/(mx-mn)*(H-2*p);
  const dd=data.map((d,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(d.v).toFixed(1)).join(" ");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:38px">
    <path d="${dd}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${X(data.length-1)}" cy="${Y(vs[vs.length-1])}" r="2.6" fill="var(--accent)"/></svg>`;
}
/* ---------- Iconos SVG por categoría (línea, sin emojis) ---------- */
const CAT_ICON={
  verde:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>`,
  aire:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/></svg>`,
  clima:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4.5V14a4 4 0 1 1-4 0V4.5a2 2 0 0 1 4 0Z"/></svg>`,
  territorio:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4v18"/><path d="M19 21V11l-7-4"/></svg>`
};
const catIcon=cat=>CAT_ICON[cat]||CAT_ICON.verde;

function buildKPIs(){
  const box=document.getElementById("kpis"); box.innerHTML="";
  KPI_LIST.forEach(code=>{
    const cfg=IND[code], s=SER[code]["Municipio"]; if(!s||!s.length)return;
    const last=s[s.length-1];
    // interanual: mismo mes, año anterior (12 registros mensuales atrás por fecha)
    const lastDate=F[last.fi]; const py=(+lastDate.slice(0,4)-1)+lastDate.slice(4);
    const pyFi=F.indexOf(py); const prev=pyFi>=0? s.find(d=>d.fi===pyFi):null;
    let trend="",sub="serie disponible";
    if(prev){
      const diff=last.v-prev.v; const pct=prev.v!==0?diff/Math.abs(prev.v)*100:0;
      const improving = cfg.dir==="up"? diff>0 : diff<0;
      const cls = Math.abs(pct)<0.5?"flat":(improving?"up":"down");
      const arrow = diff>0?"▲":(diff<0?"▼":"■");
      trend=`<span class="trend ${cls}">${arrow} ${nf(Math.abs(pct),1)}%</span>`;
      sub=`vs ${fmtDate(pyFi)}`;
    }
    const el=document.createElement("div"); el.className="kpi";
    el.innerHTML=`<div class="k-top"><span class="k-name">${cfg.name}</span><span class="k-ic">${catIcon(cfg.cat)}</span></div>
      <div class="k-val">${nf(last.v,cfg.dec)}</div><span class="k-unit">${cfg.unit} · ${fmtDate(last.fi)}</span>
      <div class="k-foot">${trend}<span class="k-sub">${sub}</span></div>
      ${sparkline(s.slice(-24))}`;
    box.appendChild(el);
  });
}

/* ---------- Explorer ---------- */
let activeCode=null, legendState={};
function buildCatbox(){
  const box=document.getElementById("catbox"); box.innerHTML="";
  Object.entries(CATS).forEach(([ck,cv])=>{
    const div=document.createElement("div"); div.className="cat";
    div.innerHTML=`<h3>${cv.label}</h3>`;
    Object.entries(IND).filter(([,c])=>c.cat===ck).forEach(([code,cfg])=>{
      const b=document.createElement("button"); b.className="ibtn"; b.dataset.code=code;
      b.innerHTML=`<span class="dot" style="background:${cv.color}"></span>${cfg.name}`;
      b.addEventListener("click",()=>selectIndicator(code));
      div.appendChild(b);
    });
    box.appendChild(div);
  });
}
function selectIndicator(code){
  activeCode=code; const cfg=IND[code];
  document.querySelectorAll(".ibtn").forEach(b=>b.classList.toggle("active",b.dataset.code===code));
  document.getElementById("cTitle").textContent=cfg.name+"  ("+cfg.unit+")";
  document.getElementById("cDesc").textContent=cfg.desc;
  // zonas disponibles para este indicador
  const zonesAvail=ZONES_MAIN.filter(z=>SER[code][z]&&SER[code][z].length);
  legendState[code] ||= Object.fromEntries(zonesAvail.map(z=>[z,true]));
  buildZoneButtons(code,zonesAvail);
  buildLegend(code,zonesAvail);
  drawExplorer();
}
function drawExplorer(){
  const code=activeCode,cfg=IND[code];
  const series=ZONES_MAIN.filter(z=>SER[code][z]&&SER[code][z].length && legendState[code][z])
    .map(z=>({name:z,color:ZCOL[z],data:SER[code][z],mainKey:z==="Municipio"}));
  lineChart(document.getElementById("cChart"),series,{unit:cfg.unit,dec:cfg.dec,zeroBase:["%","kg/mes","t CO₂/mes","ha","m²/hab"].includes(cfg.unit)});
  buildStats(code);
}
// Selector de zonas por botones: Todos / Municipio / cada Distrito
function zonesAvailFor(code){return ZONES_MAIN.filter(z=>SER[code][z]&&SER[code][z].length);}
function currentZonePreset(code,zonesAvail){
  const on=zonesAvail.filter(z=>legendState[code][z]);
  if(on.length===zonesAvail.length) return "__all__";
  if(on.length===1) return on[0];
  return null; // combinación libre
}
function buildZoneButtons(code,zonesAvail){
  const box=document.getElementById("cZones"); box.innerHTML="";
  const preset=currentZonePreset(code,zonesAvail);
  const opts=[["__all__","Todos"], ...zonesAvail.map(z=>[z,z])];
  opts.forEach(([val,label])=>{
    const b=document.createElement("button");
    b.className="zbtn"+(preset===val?" active":"");
    b.textContent=label;
    b.addEventListener("click",()=>{
      if(val==="__all__") zonesAvail.forEach(z=>legendState[code][z]=true);
      else zonesAvail.forEach(z=>legendState[code][z]=(z===val));
      buildZoneButtons(code,zonesAvail); buildLegend(code,zonesAvail); drawExplorer();
    });
    box.appendChild(b);
  });
}
function buildLegend(code,zones){
  const lg=document.getElementById("cLegend"); lg.innerHTML="";
  zones.forEach(z=>{
    const on=legendState[code][z];
    const s=document.createElement("span"); s.className="leg "+(on?"on":"off");
    s.innerHTML=`<span class="swatch" style="background:${ZCOL[z]}"></span>${z}`;
    s.addEventListener("click",()=>{legendState[code][z]=!legendState[code][z]; drawExplorer(); buildLegend(code,zones); buildZoneButtons(code,zones);});
    lg.appendChild(s);
  });
}
function buildStats(code){
  const cfg=IND[code];
  const on=ZONES_MAIN.filter(z=>SER[code][z]&&SER[code][z].length && legendState[code]&&legendState[code][z]);
  const zone = on.length===1 ? on[0] : "Municipio";
  const s=SER[code][zone]||[];
  const vs=s.map(d=>d.v);
  const box=document.getElementById("cStats");
  if(!vs.length){box.innerHTML="";return;}
  const avg=vs.reduce((a,b)=>a+b,0)/vs.length;
  const suf = zone==="Municipio"?"municipio":zone.toLowerCase();
  const stats=[["Último",nf(s[s.length-1].v,cfg.dec)],["Media",nf(avg,cfg.dec)],
    ["Mínimo",nf(Math.min(...vs),cfg.dec)],["Máximo",nf(Math.max(...vs),cfg.dec)]];
  box.innerHTML=stats.map(([l,v])=>`<div class="stat"><div class="s-l">${l} (${suf})</div><div class="s-v">${v}</div></div>`).join("");
}

/* ---------- Beaches ---------- */
const beachZones = Z.filter(z=>/^Playa/i.test(z) && z!=="Playas Marbella");
function buildBeaches(){
  // estado actual: último valor por playa
  const rows = beachZones.map(z=>{
    const s=SER["playa"][z]; if(!s||!s.length)return null;
    return {z, v:s[s.length-1].v, fi:s[s.length-1].fi, s};
  }).filter(Boolean).sort((a,b)=>b.v-a.v);
  if(rows.length) document.getElementById("bDate").textContent="· "+fmtDate(Math.max(...rows.map(r=>r.fi)));
  const maxAbs=Math.max(...rows.map(r=>Math.abs(r.v)),1);
  const W=520, rowH=26, padL=150, padR=54, iw=W-padL-padR, x0=padL+iw/2;
  const H=rows.length*rowH+10;
  const X=v=>x0 + v/maxAbs*(iw/2);
  let bars="";
  rows.forEach((r,i)=>{
    const y=8+i*rowH, xv=X(r.v), pos=r.v>=0;
    const col=pos?"var(--good)":"var(--bad)";
    const name=r.z.replace(/^Playa (de |del |de la |el |los )?/i,"");
    bars+=`<g class="brow" data-z="${r.z}" style="cursor:pointer">
      <rect x="0" y="${y-9}" width="${W}" height="${rowH-4}" fill="transparent"/>
      <text class="bar-name" x="${padL-8}" y="${y+4}" text-anchor="end">${name}</text>
      <rect x="${pos?x0:xv}" y="${y-6}" width="${Math.max(1,Math.abs(xv-x0))}" height="12" rx="3" fill="${col}"/>
      <text class="bar-label" x="${pos?xv+5:xv-5}" y="${y+4}" text-anchor="${pos?'start':'end'}" fill="${col}">${nf(r.v,1)}</text>
    </g>`;
  });
  const el=document.getElementById("bBars");
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="height:${H}px">
    <line class="axis" x1="${x0}" y1="0" x2="${x0}" y2="${H}" style="stroke-dasharray:2 3"/>
    ${bars}</svg>`;
  el.querySelectorAll(".brow").forEach(g=>{
    g.addEventListener("click",()=>{const c=document.getElementById("sm-"+beachZones.indexOf(g.dataset.z)); if(c){c.scrollIntoView({behavior:"smooth",block:"center"});c.style.transition="box-shadow .3s";c.style.boxShadow="0 0 0 2px var(--accent)";setTimeout(()=>c.style.boxShadow="",1200);}});
    g.addEventListener("mouseenter",e=>{const z=g.dataset.z;const r=rows.find(x=>x.z===z);
      showTip(`<b>${z}</b><div class="row">Posición: <b>${nf(r.v,1)} m</b></div>`,e.clientX,e.clientY);});
    g.addEventListener("mousemove",e=>{const z=g.dataset.z;const r=rows.find(x=>x.z===z);
      showTip(`<b>${z}</b><div class="row">Posición: <b>${nf(r.v,1)} m</b></div>`,e.clientX,e.clientY);});
    g.addEventListener("mouseleave",hideTip);
  });
  buildBeachGrid(rows);
}
// Rejilla de mini-gráficas: una por playa con su histórico completo
function buildBeachGrid(rows){
  const grid=document.getElementById("bGrid"); grid.innerHTML="";
  rows.forEach(r=>{
    const name=r.z.replace(/^Playa (de |del |de la |el |los )?/i,"");
    const pos=r.v>=0, col=pos?"var(--good)":"var(--bad)";
    const cell=document.createElement("div"); cell.className="smcell"; cell.id="sm-"+beachZones.indexOf(r.z);
    cell.innerHTML=`<div class="sm-h"><span class="sm-n" title="${r.z}">${name}</span>`+
      `<span class="sm-v" style="color:${col}">${pos?"▲":"▼"} ${nf(r.v,1)} m</span></div><div class="sm-c"></div>`;
    grid.appendChild(cell);
    miniLine(cell.querySelector(".sm-c"), r.s, {name:r.z});
  });
}
// Mini gráfica de líneas compacta con línea de referencia 0 y hover
function miniLine(el, data, opts){
  const W=280,H=118,m={t:8,r:8,b:16,l:32};
  const iw=W-m.l-m.r, ih=H-m.t-m.b;
  if(!data.length){el.innerHTML="";return;}
  const fis=data.map(d=>d.fi), fiMin=Math.min(...fis), fiMax=Math.max(...fis);
  let vals=data.map(d=>d.v); let vMin=Math.min(...vals), vMax=Math.max(...vals);
  if(vMin===vMax){vMax+=1;vMin-=1;}
  const pad=(vMax-vMin)*0.14; vMin-=pad; vMax+=pad;
  const X=fi=> m.l + (fiMax===fiMin?iw/2:(fi-fiMin)/(fiMax-fiMin)*iw);
  const Y=v=> m.t + ih - (v-vMin)/(vMax-vMin)*ih;
  let zero="";
  if(vMin<0 && vMax>0){const y=Y(0); zero=`<line x1="${m.l}" y1="${y.toFixed(1)}" x2="${W-m.r}" y2="${y.toFixed(1)}" style="stroke:var(--muted);stroke-width:1;stroke-dasharray:3 3;opacity:.7"/>`;}
  const yt=`<text class="tick" x="${m.l-5}" y="${(Y(vMax)+7).toFixed(1)}" text-anchor="end" style="font-size:9px">${nf(vMax,0)}</text>`+
           `<text class="tick" x="${m.l-5}" y="${(Y(vMin)-2).toFixed(1)}" text-anchor="end" style="font-size:9px">${nf(vMin,0)}</text>`;
  let xt=""; data.forEach(d=>{ if(F[d.fi].slice(5)==="01-01"){ const x=X(d.fi);
    xt+=`<text class="tick" x="${x.toFixed(1)}" y="${H-4}" text-anchor="middle" style="font-size:9px">${F[d.fi].slice(2,4)}</text>`;}});
  const pts=data.map(d=>[X(d.fi),Y(d.v)]);
  const dd=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const last=pts[pts.length-1], lcol=data[data.length-1].v>=0?"var(--good)":"var(--bad)";
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="histórico ${opts.name}">
    ${zero}${yt}${xt}
    <path class="serie" style="stroke:var(--z-mun);stroke-width:1.9" d="${dd}"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3" fill="${lcol}"/>
    <line class="vline" id="v" x1="0" y1="${m.t}" x2="0" y2="${m.t+ih}" style="opacity:0"/>
    <g id="d"></g>
    <rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent" id="h"/></svg>`;
  const svg=el.querySelector("svg"), vln=el.querySelector("#v"), dot=el.querySelector("#d"), hit=el.querySelector("#h");
  hit.addEventListener("mousemove",ev=>{
    const rc=svg.getBoundingClientRect(); const sx=(ev.clientX-rc.left)/rc.width*W;
    let best=data[0],bd=1e9; data.forEach(d=>{const dx=Math.abs(X(d.fi)-sx); if(dx<bd){bd=dx;best=d;}});
    const x=X(best.fi), y=Y(best.v);
    vln.setAttribute("x1",x);vln.setAttribute("x2",x);vln.style.opacity=1;
    dot.innerHTML=`<circle class="dotv" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" style="stroke:var(--z-mun)"/>`;
    showTip(`<b>${opts.name}</b><div class="row">${fmtDate(best.fi)}: <b>${nf(best.v,1)} m</b></div>`,ev.clientX,ev.clientY);
  });
  hit.addEventListener("mouseleave",()=>{vln.style.opacity=0;dot.innerHTML="";hideTip();});
}

/* ---------- Embalse de La Concepción ---------- */
function embalseChart(el, rows, cap){
  const W=940,H=320,m={t:14,r:16,b:34,l:52};
  const iw=W-m.l-m.r, ih=H-m.t-m.b, n=rows.length;
  if(!n){el.innerHTML="";return;}
  const vMax=Math.max(cap, ...rows.map(r=>r[1]))*1.04, vMin=0;
  const X=i=> m.l + (n<=1?iw/2:i/(n-1)*iw);
  const Y=v=> m.t + ih - (v-vMin)/(vMax-vMin)*ih;
  const nY=5; let yt="";
  for(let i=0;i<=nY;i++){const v=vMin+(vMax-vMin)*i/nY,y=Y(v);
    yt+=`<line class="grid" x1="${m.l}" y1="${y.toFixed(1)}" x2="${W-m.r}" y2="${y.toFixed(1)}"/>`+
        `<text class="tick" x="${m.l-8}" y="${(y+4).toFixed(1)}" text-anchor="end">${nf(v,0)}</text>`;}
  let xt=""; rows.forEach((r,i)=>{ if(r[0].slice(5)==="01-01"){const x=X(i);
    xt+=`<line class="grid" x1="${x.toFixed(1)}" y1="${m.t}" x2="${x.toFixed(1)}" y2="${m.t+ih}"/>`+
        `<text class="tick" x="${x.toFixed(1)}" y="${H-12}" text-anchor="middle">${r[0].slice(0,4)}</text>`;}});
  const yc=Y(cap);
  const capln=`<line x1="${m.l}" y1="${yc.toFixed(1)}" x2="${W-m.r}" y2="${yc.toFixed(1)}" style="stroke:var(--bad);stroke-width:1.3;stroke-dasharray:6 4;opacity:.85"/>`+
    `<text x="${W-m.r-4}" y="${(yc-5).toFixed(1)}" text-anchor="end" style="fill:var(--bad);font-size:10.5px;font-weight:700">Capacidad ${nf(cap,2)} hm³</text>`;
  const pts=rows.map((r,i)=>[X(i),Y(r[1])]);
  const line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const area=`M${pts[0][0].toFixed(1)} ${Y(0).toFixed(1)} `+pts.map(p=>"L"+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ")+` L${pts[n-1][0].toFixed(1)} ${Y(0).toFixed(1)} Z`;
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="volumen embalse La Concepción">
    <defs><linearGradient id="embg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--z-mun)" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="var(--z-mun)" stop-opacity="0.02"/></linearGradient></defs>
    <line class="axis" x1="${m.l}" y1="${m.t+ih}" x2="${W-m.r}" y2="${m.t+ih}"/>
    ${yt}${xt}
    <path d="${area}" fill="url(#embg)" stroke="none"/>
    <path class="serie mun" style="stroke:var(--z-mun)" d="${line}"/>
    ${capln}
    <line class="vline" id="ev" x1="0" y1="${m.t}" x2="0" y2="${m.t+ih}" style="opacity:0"/>
    <g id="ed"></g>
    <rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent" id="eh"/></svg>`;
  const svg=el.querySelector("svg"),vln=el.querySelector("#ev"),dot=el.querySelector("#ed"),hit=el.querySelector("#eh");
  hit.addEventListener("mousemove",ev=>{
    const rc=svg.getBoundingClientRect(); const sx=(ev.clientX-rc.left)/rc.width*W;
    let i=Math.round((sx-m.l)/iw*(n-1)); i=Math.max(0,Math.min(n-1,i));
    const r=rows[i],x=X(i),y=Y(r[1]);
    vln.setAttribute("x1",x);vln.setAttribute("x2",x);vln.style.opacity=1;
    dot.innerHTML=`<circle class="dotv" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" style="stroke:var(--z-mun)"/>`;
    const d=r[0].split("-");
    showTip(`<b>${(+d[2])} ${MONTHS[+d[1]-1]} ${d[0]}</b><div class="row"><i style="background:var(--z-mun)"></i>Volumen: <b>${nf(r[1],2)} hm³</b></div><div class="row">Llenado: <b>${nf(r[2],1)} %</b></div>`,ev.clientX,ev.clientY);
  });
  hit.addEventListener("mouseleave",()=>{vln.style.opacity=0;dot.innerHTML="";hideTip();});
}
function buildEmbalse(){
  const e=OBS.embalse; if(!e){return;}
  const rows=e.rows, last=rows[rows.length-1], vs=rows.map(r=>r[1]);
  let minR=rows[0]; rows.forEach(r=>{ if(r[1]<minR[1]) minR=r; });
  const ld=last[0].split("-");
  const stats=[
    ["Último ("+ld[2]+"/"+ld[1]+"/"+ld[0]+")", nf(last[1],2)+" hm³ · "+nf(last[2],1)+"%"],
    ["Mínimo (sequía)", nf(minR[1],2)+" hm³ · "+minR[0].slice(0,7)],
    ["Máximo", nf(Math.max(...vs),2)+" hm³"],
    ["Capacidad máxima", nf(e.cap,2)+" hm³"],
  ];
  document.getElementById("embStats").innerHTML=stats.map(([l,v])=>`<div class="stat"><div class="s-l">${l}</div><div class="s-v">${v}</div></div>`).join("");
  embalseChart(document.getElementById("embChart"), rows, e.cap);
}

/* ---------- Theme ---------- */
const themeBtn=document.getElementById("themeBtn");
const ICON_MOON=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
const ICON_SUN=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
function applyTheme(t){document.documentElement.dataset.theme=t; themeBtn.innerHTML=t==="dark"?ICON_SUN:ICON_MOON;
  try{localStorage.setItem("obsTheme",t)}catch(e){}
  // redibujar para refrescar var(--color) resueltos en SVG dots
  if(activeCode) drawExplorer();
}
themeBtn.addEventListener("click",()=>applyTheme(document.documentElement.dataset.theme==="dark"?"light":"dark"));
(function(){let t="light";try{t=localStorage.getItem("obsTheme")|| (matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light")}catch(e){} applyTheme(t);})();

/* ---------- Init ---------- */
buildKPIs();
buildCatbox();
selectIndicator("cobveg");
buildEmbalse();
buildBeaches();

/* ================= DATOS EN VIVO · Open-Meteo (CORS, sin clave) ================= */
const MB_LAT=36.5101, MB_LON=-4.8824;

function aqiInfo(v){
  if(v==null) return {label:"—",color:"var(--muted)"};
  if(v<=20)  return {label:"Buena",color:"#16a34a"};
  if(v<=40)  return {label:"Razonable",color:"#84cc16"};
  if(v<=60)  return {label:"Moderada",color:"#d97706"};
  if(v<=80)  return {label:"Pobre",color:"#dc2626"};
  if(v<=100) return {label:"Muy pobre",color:"#9333ea"};
  return {label:"Extrem. pobre",color:"#7c2d12"};
}

/* Gráfica de líneas genérica por índice, con hover multi-serie */
function lineChartG(el, labels, series, opts){
  opts=opts||{};
  const W=920,H=320,m={t:14,r:18,b:34,l:54};
  const iw=W-m.l-m.r, ih=H-m.t-m.b, n=labels.length;
  let vals=series.flatMap(s=>s.values.filter(v=>v!=null));
  if(!n||!vals.length){el.innerHTML="<p class='c-desc'>Sin datos disponibles.</p>";return;}
  let vMin=Math.min(...vals), vMax=Math.max(...vals);
  if(vMin===vMax){vMax+=1;vMin-=1;}
  if(opts.zeroBase!==false && vMin>0) vMin=0;
  vMax+=(vMax-vMin)*0.08;
  const X=i=> m.l + (n<=1?iw/2:i/(n-1)*iw);
  const Y=v=> m.t + ih - (v-vMin)/(vMax-vMin)*ih;
  const nY=5; let yt="";
  for(let i=0;i<=nY;i++){const v=vMin+(vMax-vMin)*i/nY,y=Y(v);
    yt+=`<line class="grid" x1="${m.l}" y1="${y.toFixed(1)}" x2="${W-m.r}" y2="${y.toFixed(1)}"/>`+
        `<text class="tick" x="${m.l-8}" y="${(y+4).toFixed(1)}" text-anchor="end">${nf(v,opts.dec??0)}</text>`;}
  let xt=""; (opts.xticks||[]).forEach(t=>{const x=X(t.i);
    xt+=`<text class="tick" x="${x.toFixed(1)}" y="${H-12}" text-anchor="middle">${t.label}</text>`;});
  let paths="";
  series.forEach(s=>{ let d="",st=false;
    s.values.forEach((v,i)=>{ if(v==null){st=false;return;} d+=(st?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1)+" "; st=true;});
    paths+=`<path class="serie" style="stroke:${s.color};stroke-width:${s.width||2.2}" d="${d}"/>`;});
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="serie temporal">
    <line class="axis" x1="${m.l}" y1="${m.t+ih}" x2="${W-m.r}" y2="${m.t+ih}"/>
    ${yt}${xt}${paths}
    <line class="vline" id="gv" x1="0" y1="${m.t}" x2="0" y2="${m.t+ih}" style="opacity:0"/>
    <g id="gd"></g>
    <rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent" id="gh"/></svg>`;
  const svg=el.querySelector("svg"),vln=el.querySelector("#gv"),dot=el.querySelector("#gd"),hit=el.querySelector("#gh");
  hit.addEventListener("mousemove",ev=>{
    const rc=svg.getBoundingClientRect(); const sx=(ev.clientX-rc.left)/rc.width*W;
    let i=Math.round((sx-m.l)/iw*(n-1)); i=Math.max(0,Math.min(n-1,i));
    const x=X(i); vln.setAttribute("x1",x);vln.setAttribute("x2",x);vln.style.opacity=1;
    let dots="",rows="";
    series.forEach(s=>{const v=s.values[i]; if(v==null)return; const y=Y(v);
      dots+=`<circle class="dotv" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" style="stroke:${s.color}"/>`;
      rows+=`<div class="row"><i style="background:${s.color}"></i>${s.name}: <b>${nf(v,opts.dec??0)}${opts.unit?" "+opts.unit:""}</b></div>`;});
    dot.innerHTML=dots;
    showTip(`<b>${labels[i]}</b>${rows}`,ev.clientX,ev.clientY);
  });
  hit.addEventListener("mouseleave",()=>{vln.style.opacity=0;dot.innerHTML="";hideTip();});
}

/* Gráfica de barras verticales (una serie) */
function barChartG(el, bars, opts){
  opts=opts||{};
  const W=920,H=300,m={t:16,r:16,b:34,l:52};
  const iw=W-m.l-m.r, ih=H-m.t-m.b, n=bars.length;
  if(!n){el.innerHTML="<p class='c-desc'>Sin datos.</p>";return;}
  const vMax=Math.max(...bars.map(b=>b.v),1)*1.12, vMin=0;
  const X=i=> m.l + (i+0.5)/n*iw, bw=iw/n*0.62;
  const Y=v=> m.t + ih - (v-vMin)/(vMax-vMin)*ih;
  const nY=5; let yt="";
  for(let i=0;i<=nY;i++){const v=vMin+(vMax-vMin)*i/nY,y=Y(v);
    yt+=`<line class="grid" x1="${m.l}" y1="${y.toFixed(1)}" x2="${W-m.r}" y2="${y.toFixed(1)}"/>`+
        `<text class="tick" x="${m.l-8}" y="${(y+4).toFixed(1)}" text-anchor="end">${nf(v,0)}</text>`;}
  let rects="";
  bars.forEach((b,i)=>{const x=X(i),y=Y(b.v);
    rects+=`<rect x="${(x-bw/2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${(m.t+ih-y).toFixed(1)}" rx="3" fill="${opts.color||'var(--accent)'}" opacity="${b.dim?0.4:0.85}"/>`+
      `<text class="tick" x="${x.toFixed(1)}" y="${H-12}" text-anchor="middle">${b.label}</text>`;
    if(opts.showVal) rects+=`<text class="bar-label" x="${x.toFixed(1)}" y="${(y-5).toFixed(1)}" text-anchor="middle">${nf(b.v,0)}</text>`;});
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="barras anuales">
    <line class="axis" x1="${m.l}" y1="${m.t+ih}" x2="${W-m.r}" y2="${m.t+ih}"/>${yt}${rects}</svg>`;
}

/* Estacionalidad: barras (media mensual) + línea (año en curso) */
function rainSeasonChart(el, clim, cur, curYear){
  const W=920,H=300,m={t:16,r:16,b:34,l:52};
  const iw=W-m.l-m.r, ih=H-m.t-m.b, n=12;
  const vMax=Math.max(...clim, ...cur.filter(v=>v!=null),1)*1.14, vMin=0;
  const X=i=> m.l + (i+0.5)/n*iw, bw=iw/n*0.58;
  const Y=v=> m.t + ih - (v-vMin)/(vMax-vMin)*ih;
  const nY=5; let yt="";
  for(let i=0;i<=nY;i++){const v=vMin+(vMax-vMin)*i/nY,y=Y(v);
    yt+=`<line class="grid" x1="${m.l}" y1="${y.toFixed(1)}" x2="${W-m.r}" y2="${y.toFixed(1)}"/>`+
        `<text class="tick" x="${m.l-8}" y="${(y+4).toFixed(1)}" text-anchor="end">${nf(v,0)}</text>`;}
  const ML=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  let rects=""; clim.forEach((v,i)=>{const x=X(i),y=Y(v);
    rects+=`<rect x="${(x-bw/2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${(m.t+ih-y).toFixed(1)}" rx="3" fill="var(--accent)" opacity="0.26"/>`+
      `<text class="tick" x="${x.toFixed(1)}" y="${H-12}" text-anchor="middle">${ML[i]}</text>`;});
  let d="",st=false; cur.forEach((v,i)=>{ if(v==null){st=false;return;} d+=(st?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1)+" "; st=true;});
  const line=`<path class="serie" style="stroke:var(--accent2);stroke-width:2.6" d="${d}"/>`;
  const dots=cur.map((v,i)=>v==null?"":`<circle class="dotv" cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.5" style="stroke:var(--accent2)"/>`).join("");
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="estacionalidad pluviométrica">
    <line class="axis" x1="${m.l}" y1="${m.t+ih}" x2="${W-m.r}" y2="${m.t+ih}"/>${yt}${rects}${line}${dots}</svg>`;
}

/* ---- Calidad del aire (Open-Meteo Air Quality · CAMS) ---- */
async function loadAirQuality(){
  const note=document.getElementById("airNote");
  try{
    const url=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${MB_LAT}&longitude=${MB_LON}`+
      `&hourly=pm10,pm2_5,nitrogen_dioxide,ozone,european_aqi&past_days=92&forecast_days=1&timezone=Europe%2FMadrid`;
    const r=await fetch(url); if(!r.ok) throw new Error("HTTP "+r.status);
    const h=(await r.json()).hourly;
    const lastVal=arr=>{for(let k=arr.length-1;k>=0;k--) if(arr[k]!=null) return arr[k]; return null;};
    const aqi=lastVal(h.european_aqi), info=aqiInfo(aqi);
    const kdef=[
      {name:"AQI europeo", val:aqi==null?"—":nf(aqi,0), unit:info.label+" · ahora", color:info.color},
      {name:"PM2,5",       val:nf(lastVal(h.pm2_5),1),  unit:"µg/m³"},
      {name:"PM10",        val:nf(lastVal(h.pm10),1),   unit:"µg/m³"},
      {name:"NO₂",         val:nf(lastVal(h.nitrogen_dioxide),1), unit:"µg/m³"},
      {name:"O₃",          val:nf(lastVal(h.ozone),1),  unit:"µg/m³"},
    ];
    document.getElementById("airKpis").innerHTML=kdef.map(k=>
      `<div class="kpi"><div class="k-top"><span class="k-name">${k.name}</span></div>`+
      `<div class="k-val"${k.color?` style="color:${k.color}"`:""}>${k.val}</div><span class="k-unit">${k.unit}</span></div>`).join("");
    // agregación a media diaria
    const idxByDay={}; h.time.forEach((t,i)=>{const day=t.slice(0,10);(idxByDay[day]||(idxByDay[day]=[])).push(i);});
    const days=Object.keys(idxByDay).sort();
    const mean=a=>{const f=a.filter(v=>v!=null);return f.length?f.reduce((x,y)=>x+y,0)/f.length:null;};
    const dayMean=field=>days.map(day=>mean(idxByDay[day].map(i=>h[field][i])));
    const labels=days.map(day=>{const p=day.split("-");return (+p[2])+" "+MONTHS[+p[1]-1];});
    const series=[
      {name:"PM2,5",color:"#dc2626",values:dayMean("pm2_5")},
      {name:"PM10", color:"#d97706",values:dayMean("pm10")},
      {name:"NO₂",  color:"#2563eb",values:dayMean("nitrogen_dioxide")},
      {name:"O₃",   color:"#7c3aed",values:dayMean("ozone")},
    ];
    const xticks=[]; days.forEach((day,i)=>{ if(day.slice(8,10)==="01") xticks.push({i,label:MONTHS[+day.slice(5,7)-1]}); });
    document.getElementById("airLegend").innerHTML=series.map(s=>`<span class="leg on"><span class="swatch" style="background:${s.color}"></span>${s.name}</span>`).join("");
    lineChartG(document.getElementById("airChart"),labels,series,{unit:"µg/m³",dec:1,xticks});
    note.innerHTML=`Última medida: <b>${labels[labels.length-1]||"—"}</b> · Marbella (36,51°N · 4,88°O). Escala AQI europeo: 0–20 buena · 20–40 razonable · 40–60 moderada · 60–80 pobre · +80 muy pobre.`;
  }catch(e){ note.textContent="No se pudo cargar la calidad del aire: "+e.message; note.style.color="var(--bad)"; }
}

/* ---- Pluviometría (Open-Meteo Archive · ERA5) ---- */
async function loadRain(){
  try{
    const end=new Date(); end.setDate(end.getDate()-6);
    const ed=end.toISOString().slice(0,10);
    const url=`https://archive-api.open-meteo.com/v1/archive?latitude=${MB_LAT}&longitude=${MB_LON}`+
      `&start_date=2015-01-01&end_date=${ed}&daily=precipitation_sum&timezone=Europe%2FMadrid`;
    const r=await fetch(url); if(!r.ok) throw new Error("HTTP "+r.status);
    const j=await r.json(), t=j.daily.time, p=j.daily.precipitation_sum;
    const yearSum={}, monByYear={};
    t.forEach((d,i)=>{const y=d.slice(0,4), mo=+d.slice(5,7)-1, v=p[i]||0;
      yearSum[y]=(yearSum[y]||0)+v; (monByYear[y]||(monByYear[y]=Array(12).fill(0)))[mo]+=v;});
    const years=Object.keys(yearSum).sort();
    const curYear=years[years.length-1];
    const lastFull=t[t.length-1].slice(5)==="12-31";
    const completeYears=years.filter(y=>y!==curYear||lastFull);
    // KPIs
    const compVals=completeYears.map(y=>yearSum[y]);
    const avg=compVals.reduce((a,b)=>a+b,0)/(compVals.length||1);
    let wet=completeYears[0]||curYear, dry=completeYears[0]||curYear;
    completeYears.forEach(y=>{if(yearSum[y]>yearSum[wet])wet=y; if(yearSum[y]<yearSum[dry])dry=y;});
    const stats=[
      [`Este año (${curYear})`, nf(yearSum[curYear],0)+" mm"],
      ["Media anual", nf(avg,0)+" mm"],
      [`Más lluvioso (${wet})`, nf(yearSum[wet],0)+" mm"],
      [`Más seco (${dry})`, nf(yearSum[dry],0)+" mm"],
    ];
    document.getElementById("rainStats").innerHTML=stats.map(([l,v])=>`<div class="stat"><div class="s-l">${l}</div><div class="s-v">${v}</div></div>`).join("");
    // barras anuales
    const bars=years.map(y=>({label:y, v:yearSum[y], dim:(y===curYear&&!lastFull)}));
    barChartG(document.getElementById("rainYearChart"),bars,{color:"var(--z-d1)",showVal:true});
    // estacionalidad: climatología (años completos) vs año en curso
    const clim=Array.from({length:12},(_,mo)=>{const vs=completeYears.map(y=>monByYear[y][mo]); return vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:0;});
    const lastMo=+t[t.length-1].slice(5,7);
    const cur=monByYear[curYear].map((v,mo)=>(mo+1)<=lastMo?v:null);
    document.getElementById("rainLegend").innerHTML=
      `<span class="leg on"><span class="swatch" style="background:var(--accent);opacity:.5"></span>Media mensual histórica</span>`+
      `<span class="leg on"><span class="swatch" style="background:var(--accent2)"></span>Año en curso (${curYear})</span>`;
    rainSeasonChart(document.getElementById("rainMonthChart"),clim,cur,curYear);
  }catch(e){ document.getElementById("rainStats").innerHTML=`<div class="stat"><div class="s-v" style="color:var(--bad)">Error pluviometría: ${e.message}</div></div>`; }
}

loadAirQuality();
loadRain();

/* ================= MAPA DE LA COSTA · Leaflet + slider temporal ================= */
/* Coordenadas: 16 playas ancladas a OpenStreetMap (natural=beach, vía Overpass);
   las menores sin ficha propia en OSM se sitúan por interpolación sobre la costa
   real, en orden geográfico. Los DATOS de orilla son los reales del panel. */
const BEACH_GEO = {
  "Playa Guadalmina":[36.46000,-5.00200],
  "Playa de Linda Vista":[36.46950,-4.98800],
  "Playa de San Pedro de Alcantara":[36.47404,-4.98179],
  "Playa de cortijo blanco":[36.47800,-4.97600],
  "Playa El rodeito":[36.48100,-4.96700],
  "Playa del Duque":[36.48354,-4.96152],
  "Playa Puerto Banús":[36.49320,-4.94405],
  "Playa Nueva Andalucía":[36.49150,-4.94850],
  "Playa Rio Verde":[36.49750,-4.93400],
  "Playa de Nagueles":[36.50293,-4.91907],
  "Playa Puente Romano":[36.50480,-4.91300],
  "Playa Casablanca":[36.50575,-4.91127],
  "Playa de la Fontanilla":[36.50417,-4.90828],
  "Playa del Faro":[36.50662,-4.89150],
  "Playa de Venus":[36.50659,-4.88412],
  "Playa de Bajadilla":[36.50756,-4.87770],
  "Playa del Cable":[36.50741,-4.86608],
  "Playa el Pinillo":[36.50650,-4.85800],
  "Playa de Rio Real":[36.50400,-4.84800],
  "Playa los Monteros":[36.50248,-4.83838],
  "Playa del Alicate":[36.49743,-4.80990],
  "Playa del Real de Zaragoza":[36.49450,-4.79750],
  "Playa de las Chapas":[36.49250,-4.78750],
  "Playa de las Cañas":[36.49050,-4.77900],
  "Playa de Artola":[36.49001,-4.77178],
  "Playa de Cabopino":[36.48422,-4.74221],
  "Playa de Calahonda":[36.48562,-4.73575],
};
const ICON_PLAY=`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const ICON_PAUSE=`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>`;

function buildBeachMap(){
  const host=document.getElementById("beachMap");
  if(typeof L==="undefined"){ host.innerHTML="<p class='c-desc' style='padding:20px'>No se pudo cargar el mapa (Leaflet).</p>"; return; }
  const geoB = beachZones.filter(z=>BEACH_GEO[z] && SER["playa"][z] && SER["playa"][z].length);
  if(!geoB.length){ host.innerHTML="<p class='c-desc' style='padding:20px'>Sin datos de playa.</p>"; return; }
  const map=L.map(host,{scrollWheelZoom:false,zoomControl:true,preferCanvas:true}).setView([36.502,-4.86],12);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    {attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',maxZoom:19,subdomains:"abcd"}).addTo(map);
  // fi disponibles + índice fi->valor por playa
  const fiset=new Set(), byFi={};
  geoB.forEach(z=>{ byFi[z]={}; SER["playa"][z].forEach(d=>{fiset.add(d.fi); byFi[z][d.fi]=d.v;}); });
  const fis=[...fiset].sort((a,b)=>a-b);
  const colorFor=v=> v==null?"#9ca3af":(v>=0?"#16a34a":"#dc2626");
  const nameOf=z=>z.replace(/^Playa (de la |de las |de los |de |del |el |los )?/i,"");
  const markers={};
  geoB.forEach(z=>{ markers[z]=L.circleMarker(BEACH_GEO[z],{radius:7,weight:1.4,color:"#fff",fillColor:"#16a34a",fillOpacity:.9}).addTo(map); });
  map.fitBounds(geoB.map(z=>BEACH_GEO[z]),{padding:[34,34]});
  setTimeout(()=>map.invalidateSize(),200);

  const slider=document.getElementById("mapSlider"), dateLbl=document.getElementById("mapDate");
  slider.min=0; slider.max=fis.length-1; slider.value=fis.length-1;
  function render(idx){
    const fi=fis[idx]; dateLbl.textContent=fmtDate(fi);
    geoB.forEach(z=>{ const v=byFi[z][fi], mk=markers[z], col=colorFor(v);
      if(v==null){ mk.setStyle({fillColor:col,radius:5,fillOpacity:.5}); }
      else { mk.setStyle({fillColor:col,radius:Math.min(22,5+Math.sqrt(Math.abs(v))*2.3),fillOpacity:.85}); }
      const txt = v==null ? "sin dato" : `<b style="color:${col}">${nf(v,1)} m</b> · ${v>=0?"avance":"retroceso"}`;
      mk.bindTooltip(`${nameOf(z)}`,{direction:"top"});
      mk.bindPopup(`<b>${nameOf(z)}</b><br>${fmtDate(fi)}: ${txt}`);
    });
  }
  slider.addEventListener("input",()=>{ stop(); render(+slider.value); });
  render(fis.length-1);

  // Reproducir / pausar
  let timer=null; const btn=document.getElementById("mapPlay");
  function paint(){ btn.innerHTML=(timer?ICON_PAUSE:ICON_PLAY)+"<span>"+(timer?"Pausar":"Reproducir")+"</span>"; }
  function stop(){ if(timer){clearInterval(timer);timer=null;paint();} }
  btn.addEventListener("click",()=>{
    if(timer){ stop(); return; }
    timer=setInterval(()=>{ let v=+slider.value+1; if(v>+slider.max) v=0; slider.value=v; render(v); },750);
    paint();
  });
  paint();
}
buildBeachMap();
