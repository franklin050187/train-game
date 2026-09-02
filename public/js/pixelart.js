/* Rail Run — pixel-art train sprites and rendering */
const CX={g:"#9fd8ff",w:"#0e1116",m:"#aab2bd",o:"#1d222b",l:"#ffe28a"};
const PA={
 box:{b:"#a23b36",r:"#5e1f1b",c:"#ead37f"},
 heavy:{b:"#6b7480",r:"#464d56",c:"#ffb23e"},
 express:{b:"#3f7ed6",r:"#2a5cad",c:"#e8e6df"},
 reefer:{b:"#e8e6df",r:"#b8b2a6",c:"#3f7ed6"},
 mail:{b:"#33405c",r:"#20283a",c:"#f5d742"},
 tanker:{b:"#b8b6ae",r:"#8f8d84",c:"#586b3e"},
 armored:{b:"#5f6440",r:"#454a2c",c:"#9aa070"}
};
const PAE={std:{b:"#4a5460",r:"#2f3640",c:"#f5d742"},
 expr:{b:"#c2453a",r:"#7e2a22",c:"#e8e6df"},
 turb:{b:"#28303c",r:"#171c24",c:"#67d17e"},
 magl:{b:"#cfd3da",r:"#9aa2ad",c:"#3f7ed6"}};
function V3_WAGF(id){return V3_WAG[id]||V3_WAG.box;}
function light(h){return shade(h,1.35);}function dark(h){return shade(h,0.6);}
function shade(h,f){const n=parseInt(h.slice(1),16),r=Math.min(255,Math.round(((n>>16)&255)*f)),g=Math.min(255,Math.round(((n>>8)&255)*f)),b=Math.min(255,Math.round((n&255)*f));return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}
const V3_WAG={
 box:[
  "................",
  ".rrrrrrrrrrrrrr.",
  "rbbbbbbbbbbbbbbk",
  "bBBBBBBBBBBBBBBk",
  "bBbbbbbccbbbbbCk",
  "bBbbbbbccbbbbbCk",
  "bBBBBBBBBBBBBBBk",
  ".kkkkkkkkkkkkkk.",
  "..oo........oo..",
  ".owwo......owwo.",
  ".owwo......owwo.",
  "..www......www.."],
 heavy:[
  "................",
  "bbbbbbbbbbbbbbbb",
  "bBBBBBBBBBBBBBBk",
  "bBkkkkkkkkkkkkBk",
  "bBbbbbbbbbbbbbCk",
  "bBkkkkkkkkkkkkCk",
  "bBBBBBBBBBBBBBBk",
  ".kkkkkkkkkkkkkk.",
  "..oo........oo..",
  ".owwo......owwo.",
  ".owwo......owwo.",
  "..www......www.."],
 express:[
  "................",
  ".rrrrrrrrrrrrrr.",
  "rbbbbbbbbbbbbbbk",
  "bBBBBBBBBBBBBBBk",
  "bBccccccccccccCk",
  "bBbbbbbbbbbbbbCk",
  "bBBBBBBBBBBBBBBk",
  ".kkkkkkkkkkkkkk.",
  "..oo........oo..",
  ".owwo......owwo.",
  ".owwo......owwo.",
  "..www......www.."],
 reefer:[
  "................",
  ".rrrrrrrrrrrrrr.",
  "rbbbbbbbbbbbbbbk",
  "bBRRRRRRRRRRRRBk",
  "bBRbbbbbbbbbbRbk",
  "bBRbbbbbbbbbbRbk",
  "bBRRRRRRRRRRRRbk",
  ".kkkkkkkkkkkkkk.",
  "..oo........oo..",
  ".owwo......owwo.",
  ".owwo......owwo.",
  "..www......www.."],
 mail:[
  "................",
  ".rrrrrrrrrrrrrr.",
  "rbbbbbbbbbbbbbbk",
  "bBBBBBBBBBBBBBBk",
  "bBbbbbbbccbbbbCk",
  "bBBBBBBBBBBBBBBk",
  "bBbbbbbbbbbbbbCk",
  ".kkkkkkkkkkkkkk.",
  "..oo........oo..",
  ".owwo......owwo.",
  ".owwo......owwo.",
  "..www......www.."],
 tanker:[
  "................",
  "................",
  "......rrrr......",
  ".....rrrrrr.....",
  "....rollllllor..",
  "..rccbccccccbcc.",
  ".rbbbbbbbbbbbbb.",
  "rbbbbbbbbbbbbbbk",
  ".kkkkkkkkkkkkkk.",
  "..oo........oo..",
  ".owwo......owwo.",
  "..www......www.."],
 armored:[
  "................",
  ".rrrrrrrrrrrrrr.",
  ".bbbbbbbbbbbbbb.",
  ".bKKKKKKKKKKKKb.",
  ".bKbbbbbbbbbbKb.",
  ".bKbbbbbbbbbbKb.",
  ".bKKKKKKKKKKKKb.",
  ".kkkkkkkkkkkkkk.",
  "..oo........oo..",
  ".owwo......owwo.",
  ".owwo......owwo.",
  "..www......www.."]
};
const V3_ENG={
 std:[
  "..................",
  "gggg..............",
  "ggggbbbbbbbbbbbbll",
  "bbbBBBBBBBBBBBBBll",
  "bb.BBBBBBBBBBBBBkk",
  "bbBBbbbbbbbbbbBbbb",
  "bbBbkkkkkkkkbbBbbb",
  "bbbkkkbbbbbkkkbbbb",
  "..oo.....oo....ooo",
  ".owwo...owwo.owwo.",
  ".owwo...owwo.owwo.",
  "..www...wwwwwwww.."],
 expr:[
  "..................",
  "gggg..............",
  "gggbbbbbbbbbbbbbll",
  "bbBBBBBBBBBBBBBBll",
  "b.BBBBBBBBBBBBBBll",
  "b.BBbbbbbbbbbbBbbb",
  "b.BbkkkkkkkkbbBbbb",
  "bbbkkkbbbbbkkkbbbb",
  "..oo.....oo....ooo",
  ".owwo...owwo.owwo.",
  ".owwo...owwo.owwo.",
  "..www...wwwwwwww.."],
 turb:[
  "..................",
  "gggg..............",
  "gggbbbbbbbbbbbbbll",
  "bbBBBBBBBBBBBBBBll",
  "b.BBBBBBBBBBBBkkll",
  "b.BBbbbbbbbbBbbbkk",
  "b.BbkkkkkkkkbBbbbk",
  "bbbkkkbbbbbkkkbbbb",
  "..oo.....oo....ooo",
  ".owwo...owwo.owwo.",
  ".owwo...owwo.owwo.",
  "..www...wwwwwwww.."],
 magl:[
  "..................",
  "..................",
  "gggg..............",
  "ggggbbbbbbbbbbbllb",
  "bbBBBBBBBBBBBBBbbk",
  "b.BBBBBBBBBBBBBbbk",
  "b.BBBBbbbbbbbBbbbk",
  "bbbkkkkbbbbbkkbbbb",
  "..oo.....oo....ooo",
  ".owwo...owwo.owwo.",
  ".owwo...owwo.owwo.",
  "..www...wwwwwwww.."]
};
function pixA(id){const c=document.getElementById(id);return c&&c.getContext?c:null;}
function trainRows(){
 const W=18+state.equip.length*16,H=12;
 const g=Array.from({length:H},()=>Array(W).fill(""));
 const put=(spr,col0,pa)=>{spr.forEach((row,y)=>{[...row].forEach((ch,x)=>{if(ch===".")return;
  g[y][col0+x]=ch==="b"?pa.b:ch==="B"?light(pa.b):ch==="k"?dark(pa.b):ch==="r"?pa.r:ch==="R"?light(pa.r):ch==="c"?pa.c:ch==="C"?dark(pa.c):CX[ch];});});};
 put(V3_ENG[ENGINES[state.engineIdx].id],state.equip.length*16,PAE[ENGINES[state.engineIdx].id]);
 state.equip.forEach((id,k)=>put(V3_WAGF(id),k*16,PA[id]||PA.box));
 return {g,W,H};
}
function pixCanvas(id,scale){
 const cv=pixA(id); if(!cv)return;
 scale=scale||3;
 const {g,W,H}=trainRows();
 cv.width=W*scale;cv.height=(H+3)*scale;
 const x=cv.getContext("2d");x.imageSmoothingEnabled=false;
 for(let y=0;y<H;y++){for(let xx=0;xx<W;xx++){if(!g[y][xx])continue;x.fillStyle=g[y][xx];x.fillRect(xx*scale,y*scale,scale,scale);}}
x.fillStyle="#e3d7b6";x.fillRect(0,H*scale,W*scale,scale);
  x.fillStyle="#c9bd9e";x.fillRect(0,(H+1)*scale,W*scale,scale);
  x.fillStyle="#998a63";for(let i=0;i<W;i++){if(i%2)x.fillRect(i*scale,(H+1)*scale,scale,Math.floor(scale*0.6));}
}
function pixHTML(id){return `<canvas id="${id}" class="pixwin"></canvas>`+ 
 `<div class="muted" style="font-size:12px;text-align:center">${fmt("e_line",{e:t("eg_"+ENGINES[state.engineIdx].id),n:state.equip.length})}</div>`;}
