/* Rail Run — game data constants and helpers */
const CITIES=[
  {n:"Ironhold",  i:"⛏️", f:"Mining town",   prod:["coal","iron","machinery"], mult:1.0},
  {n:"Oakridge",  i:"🌾", f:"Farming valley",prod:["grain","livestock","food"], mult:1.1},
  {n:"Milltown",  i:"⚙️", f:"Workshops",     prod:["tools","wood","machinery"], mult:1.2},
  {n:"Riverton",  i:"🏭", f:"Industrial hub",prod:["electronics","machinery","chemicals"], mult:1.35},
  {n:"Northport", i:"⚓", f:"Trading port",  prod:["food","chemicals","luxury"], mult:1.5},
  {n:"Silvercrest",i:"🏛️",f:"The capital",   prod:["mail","luxury","passengers"], mult:1.7},
  {n:"Coppervale",i:"🪨",f:"Copper mines",  prod:["coal","iron","machinery","electronics"], mult:1.9},
  {n:"Goldspur",  i:"💰", f:"Gold rush town",prod:["luxury","mail","passengers","chemicals"], mult:2.15},
  {n:"Apex",      i:"🏔️", f:"Mountain peak", prod:["machinery","electronics","luxury","passengers"], mult:2.4},
  {n:"Deepwell",  i:"🕳️", f:"Deep drilling", prod:["coal","iron","chemicals","machinery"], mult:2.7},
  {n:"Skyharbor", i:"🛸", f:"High port",     prod:["electronics","luxury","mail","passengers"], mult:3.0},
  {n:"Grand Central",i:"🏙️",f:"Megacity",    prod:["mail","luxury","passengers","machinery","electronics"], mult:3.4}
];
const CITYX=[40,140,350,700];
const CARGOES={
 coal:{n:"Coal",v:50,w:4,bulk:true}, iron:{n:"Iron",v:90,w:6,bulk:true},
 machinery:{n:"Machinery",v:160,w:4}, grain:{n:"Grain",v:40,w:3,bulk:true},
 livestock:{n:"Livestock",v:140,w:5}, food:{n:"Food",v:70,w:1,perp:true},
 tools:{n:"Tools",v:110,w:2}, wood:{n:"Wood",v:30,w:2.5,bulk:true},
 electronics:{n:"Electronics",v:240,w:.5}, chemicals:{n:"Chemicals",v:190,w:2,risky:true},
  luxury:{n:"Luxury",v:330,w:1,prem:true}, mail:{n:"Mail",v:150,w:.2,prem:true},
  passengers:{n:"Passengers",v:280,w:.1,prem:true}, gold:{n:"Gold",v:0,w:0,prem:true}
};
const WAGONS=[
 {id:"box",n:"Boxcar",ic:"📦",sp:0,cap:10,cost:18,w:2,price:0,up:0,lv:1,spec:"Balanced",d:"The workhorse. No surprises."},
 {id:"heavy",n:"Heavy Hauler",ic:"🪨",sp:-2,cap:20,cost:30,w:4,price:1500,up:3500,lv:2,b:"bulk",spec:"Heavy +25%",d:"Massive holds for coal, iron, grain, wood."},
 {id:"express",n:"Express Van",ic:"✈️",sp:3,cap:5,cost:35,w:1,price:2200,up:5000,lv:3,b:"deadline",spec:"Deadlines +20%",d:"Shaves hours off tight runs."},
 {id:"reefer",n:"Refrigerated",ic:"🧊",sp:-1,cap:12,cost:40,w:3,price:2000,up:4800,lv:3,b:"perp",spec:"Food +30%",d:"Keeps perishables hauling further."},
 {id:"mailcar",n:"Mail Car",ic:"📬",sp:4,cap:3,cost:55,w:.5,price:3600,up:8500,lv:4,b:"prem",spec:"Premium +30%",d:"Mail, luxury and passengers command a bonus."},
 {id:"tanker",n:"Tanker",ic:"⛽",sp:-1,cap:12,cost:45,w:3,price:3000,up:7000,lv:4,b:"risky",spec:"Chemicals +25%",d:"Spill-proof — chemicals love it."},
 {id:"armored",n:"Armored Car",ic:"🛡️",sp:-3,cap:6,cost:60,w:2,price:5000,up:12000,lv:5,b:"guard",spec:"Guarded",d:"Bandits lose their nerve; damage halved."}
];
const ENGINES=[
 {id:"std",n:"Standard Engine",sp:5,price:0,lv:1,run:15,pull:22},
 {id:"expr",n:"Express Engine",sp:8,price:3500,lv:2,run:32,pull:38},
 {id:"turb",n:"Turbine Engine",sp:12,price:9000,lv:4,run:62,pull:70},
 {id:"magl",n:"Maglev Engine",sp:16,price:20000,lv:6,run:115,pull:120}
];
const LINE=[[0,1,2],[3,4,5],[6,7,8],[9,10,11]];
const LINEUNLOCK={
 1:{k:"w",id:"express",lv:3},
 2:{k:"e",idx:2,lv:4,deliv:28},
 3:{k:"e",idx:3,lv:6,deliv:44}
};
function lineOf(i){ for(let k=0;k<LINE.length;k++) if(LINE[k].includes(i)) return k; return -1; }
function lineOpen(k){ return LINE[k].every(i=>state.discovered[i]); }
function nextLockedLine(){ for(let k=1;k<LINE.length;k++){ if(lineOpen(k-1)&&!lineOpen(k)) return k; } return -1; }
function nextLockedCity(){ for(let i=0;i<CITIES.length;i++) if(!state.discovered[i]) return i; return -1; }
function routeOpen(i,d){ const a=Math.min(i,d),b=Math.max(i,d); for(let k=a;k<=b;k++) if(!state.discovered[k]) return false; return true; }
function unlockCost(w){ return (w.price>0&&ownedCount(w.id)===0)?w.up:w.price; }
