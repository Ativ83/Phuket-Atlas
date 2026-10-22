(()=>{"use strict";const by=id=>document.getElementById(id),W=620,H=920,bounds={west:98.20,east:98.48,north:8.20,south:7.72};let areas=[],selected=null,scale=1,panX=0,panY=0,gestureMoved=false;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function applyView(animate=false){
 const world=by("world"),scene=by("scene");
 // Hard pan limits: the island centre must remain close to the viewport centre.
 // This intentionally prioritises visibility over free movement at high zoom.
 const sw=scene.clientWidth,sh=scene.clientHeight;
 const maxX=sw*.10,maxY=sh*.10;
 scale=Number.isFinite(scale)?clamp(scale,1,3.5):1;
 panX=Number.isFinite(panX)?clamp(panX,-maxX,maxX):0;
 panY=Number.isFinite(panY)?clamp(panY,-maxY,maxY):0;
 world.style.transition=animate?"transform .8s cubic-bezier(.17,.78,.12,1)":"none";
 world.style.transform="translate(calc(-50% + "+panX+"px),calc(-50% + "+panY+"px)) scale("+scale+")";
}
const escape=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));const xy=o=>({x:(o.lon-bounds.west)/(bounds.east-bounds.west)*W,y:(bounds.north-o.lat)/(bounds.north-bounds.south)*H});const projectCount=()=>areas.reduce((n,p)=>n+(p.objects||[]).length,0);function shift(p){
 const c=xy(p),world=by("world");
 scale=1.55;
 panX=(W/2-c.x)/W*world.offsetWidth*scale;
 panY=(H/2-c.y)/H*world.offsetHeight*scale;
 applyView(true);
}
function render(){const q=by("search").value.toLowerCase();const filtered=areas.filter(p=>(p.name+" "+p.en+" "+(p.objects||[]).map(o=>o.name).join(" ")).toLowerCase().includes(q));by("regions").innerHTML=filtered.map(p=>'<button class="region '+(selected===p.id?'active':'')+'" data-area="'+escape(p.id)+'"><div><span>'+escape(p.name)+'</span><small>'+escape(p.en)+' · '+(p.objects||[]).length+' объектов</small></div><i>›</i></button>').join("");const pins=[];for(const p of filtered){const pos=xy(p);pins.push('<button class="pin '+(selected===p.id?'active':'')+'" data-area="'+escape(p.id)+'" style="left:'+(pos.x/W*100)+'%;top:'+(pos.y/H*100)+'%"><span class="dot"></span><label>'+escape(p.en)+'</label></button>');for(const o of (p.objects||[])){if(typeof o.lat!=="number"||typeof o.lon!=="number")continue;const op=xy(o);pins.push('<button class="pin project" data-area="'+escape(p.id)+'" style="left:'+(op.x/W*100)+'%;top:'+(op.y/H*100)+'%"><span class="dot"></span><label>◆ '+escape(o.name)+'</label></button>')}}by("pins").innerHTML=pins.join("");document.querySelectorAll("[data-area]").forEach(el=>el.onclick=()=>go(el.dataset.area));by("numareas").textContent=areas.length;by("numprojects").textContent=projectCount()}function go(id){const p=areas.find(x=>x.id===id);if(!p)return;selected=id;render();shift(p);setTimeout(()=>{if(selected===id)show(p)},850)}function show(p){const list=p.objects||[];by("detail").innerHTML='<div class="hero"><div><div class="tag">PHUKET · '+escape(p.region)+'</div><h2>'+escape(p.name)+'</h2><small>'+escape(p.en)+'</small></div></div><div class="detail"><p>'+escape(p.summary)+'</p><h3>Мои объекты · '+list.length+'</h3>'+(list.length?list.map(o=>'<article class="object"><small>'+escape(o.type||"Объект недвижимости")+'</small><h3>'+escape(o.name)+'</h3><p>'+escape(o.description||"")+'</p>'+(o.pdf&&/^presentations\/[a-zA-Z0-9_.-]+\.pdf$/.test(o.pdf)?'<a target="_blank" rel="noopener" href="'+o.pdf+'">Открыть презентацию PDF ↗</a>':'')+'</article>').join(""):'<div class="placeholder">Пока нет добавленных объектов.<br>Когда ты пришлёшь PDF, объект появится здесь и на карте.</div>')+'<footer>Координаты района · '+p.lat.toFixed(4)+' N, '+p.lon.toFixed(4)+' E</footer></div>';by("sheet").classList.add("open");by("sheet").setAttribute("aria-hidden","false");by("overlay").hidden=false}function close(){selected=null;by("sheet").classList.remove("open");by("sheet").setAttribute("aria-hidden","true");by("overlay").hidden=true;scale=1;panX=0;panY=0;applyView(true);render()}by("close").onclick=by("overlay").onclick=close;document.onkeydown=e=>{if(e.key==="Escape")close()};by("search").oninput=render;by("reset").onclick=close;by("zin").onclick=()=>{scale=clamp(scale*1.25,1,3.5);applyView(true)};
by("zout").onclick=()=>{scale=clamp(scale/1.25,1,3.5);applyView(true)};
const scene=by("scene"), pointers=new Map();
let previousMid=null,previousDistance=null,downAt=null,suppressClickUntil=0;
scene.style.touchAction="none";
function midAndDistance(){
 const pts=[...pointers.values()];
 if(pts.length<2)return null;
 return {x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2,
 dist:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)};
}
scene.addEventListener("pointerdown",e=>{
 if(e.pointerType==="touch")return;
 if(e.target.closest(".buttons"))return;
 if(e.pointerType==="mouse" && e.button!==0)return;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 downAt={x:e.clientX,y:e.clientY};
 if(pointers.size===2){
  const v=midAndDistance();previousMid={x:v.x,y:v.y};previousDistance=v.dist;gestureMoved=true;
 }
 if(e.target.closest(".pin"))return;
 try{scene.setPointerCapture(e.pointerId)}catch{}
});
scene.addEventListener("pointermove",e=>{
 if(e.pointerType==="touch")return;
 if(!pointers.has(e.pointerId))return;
 const prev=pointers.get(e.pointerId);
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size>=2){
  const v=midAndDistance();
  if(previousMid && previousDistance){
   const newScale=clamp(scale*v.dist/Math.max(1,previousDistance),1,3.5);
   const rect=scene.getBoundingClientRect();
   const pivotX=previousMid.x-(rect.left+rect.width/2);
   const pivotY=previousMid.y-(rect.top+rect.height/2);
   const ratio=newScale/scale;
   panX=v.x-previousMid.x+pivotX-(pivotX-panX)*ratio;
   panY=v.y-previousMid.y+pivotY-(pivotY-panY)*ratio;
   scale=newScale;applyView();
  }
  previousMid={x:v.x,y:v.y};previousDistance=v.dist;gestureMoved=true;
 }else{
  const dx=e.clientX-prev.x,dy=e.clientY-prev.y;
  if(Math.abs(e.clientX-downAt?.x)>5 || Math.abs(e.clientY-downAt?.y)>5)gestureMoved=true;
  if(gestureMoved){panX+=dx;panY+=dy;applyView()}
 }
});
function endPointer(e){
 if(e.pointerType==="touch")return;
 if(!pointers.has(e.pointerId))return;
 pointers.delete(e.pointerId);previousMid=null;previousDistance=null;
 if(gestureMoved)suppressClickUntil=Date.now()+350;
 if(!pointers.size){downAt=null;setTimeout(()=>gestureMoved=false,0)}
}
scene.addEventListener("pointerup",endPointer);
scene.addEventListener("pointercancel",endPointer);
scene.addEventListener("lostpointercapture",endPointer);
scene.addEventListener("click",e=>{
 if(Date.now()<suppressClickUntil && e.target.closest(".pin")){e.preventDefault();e.stopPropagation()}
},true);
// Safari/iOS: native Touch Events are more reliable than Pointer Events for pinch.
let touchPrev=null,touchDragged=false,touchStartedAt=null;
function touchGeometry(touches){
 const a=touches[0],b=touches[1];
 return {x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2,
  distance:Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY)};
}
scene.addEventListener("touchstart",e=>{
 if(e.target.closest(".buttons"))return;
 if(e.touches.length===1){
  touchPrev={x:e.touches[0].clientX,y:e.touches[0].clientY};
  touchStartedAt={...touchPrev};touchDragged=false;
 }else if(e.touches.length>=2){
  touchPrev=touchGeometry(e.touches);
  touchDragged=true;
  if(e.cancelable)e.preventDefault();
 }
},{passive:false});
scene.addEventListener("touchmove",e=>{
 if(e.target.closest(".buttons")||!touchPrev)return;
 if(e.cancelable)e.preventDefault();
 if(e.touches.length>=2){
  const next=touchGeometry(e.touches);
  if(touchPrev.distance){
   const newScale=clamp(scale*next.distance/Math.max(1,touchPrev.distance),1,3.5);
   const rect=scene.getBoundingClientRect();
   const pivotX=touchPrev.x-(rect.left+rect.width/2);
   const pivotY=touchPrev.y-(rect.top+rect.height/2);
   const ratio=newScale/scale;
   panX+=next.x-touchPrev.x;
   panY+=next.y-touchPrev.y;
   panX=pivotX-(pivotX-panX)*ratio;
   panY=pivotY-(pivotY-panY)*ratio;
   scale=newScale;
  }
  touchPrev=next;touchDragged=true;applyView();
 }else if(e.touches.length===1){
  const next={x:e.touches[0].clientX,y:e.touches[0].clientY};
  if(touchStartedAt&&Math.hypot(next.x-touchStartedAt.x,next.y-touchStartedAt.y)>6)touchDragged=true;
  if(touchDragged){panX+=next.x-touchPrev.x;panY+=next.y-touchPrev.y;applyView()}
  touchPrev=next;
 }
},{passive:false});
function endTouch(e){
 if(touchDragged)suppressClickUntil=Date.now()+500;
 if(e.touches.length===1){
  touchPrev={x:e.touches[0].clientX,y:e.touches[0].clientY};
  touchStartedAt={...touchPrev};
 }else{
  touchPrev=null;touchStartedAt=null;
  setTimeout(()=>{touchDragged=false},0);
 }
}
scene.addEventListener("touchend",endTouch,{passive:true});
scene.addEventListener("touchcancel",endTouch,{passive:true});
scene.addEventListener("wheel",e=>{
 if(e.cancelable)e.preventDefault();
 const next=clamp(scale*Math.exp(-e.deltaY*.001),1,3.5),rect=scene.getBoundingClientRect();
 const x=e.clientX-(rect.left+rect.width/2),y=e.clientY-(rect.top+rect.height/2),ratio=next/scale;
 panX=x-(x-panX)*ratio;panY=y-(y-panY)*ratio;scale=next;applyView()
},{passive:false});
fetch("data/locations.json").then(r=>{if(!r.ok)throw Error("Не удалось загрузить каталог");return r.json()}).then(d=>{areas=d;render()}).catch(e=>by("regions").textContent=e.message)})();