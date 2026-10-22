(()=>{"use strict";const by=id=>document.getElementById(id),W=620,H=920,bounds={west:98.20,east:98.48,north:8.20,south:7.72};let areas=[],selected=null,scale=1,panX=0,panY=0,gestureMoved=false;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function applyView(animate=false){
 const world=by("world"),scene=by("scene");
 // Hard pan limits: the island centre must remain close to the viewport centre.
 // This intentionally prioritises visibility over free movement at high zoom.
 const sw=scene.clientWidth,sh=scene.clientHeight;
 // Allow travel across the enlarged island while keeping the map centred at 1x.
 // Limits grow with zoom so northern/southern and western/eastern locations remain reachable.
 const zoomExtra=Math.max(0,scale-1);
 const maxX=zoomExtra*world.offsetWidth*.30;
 const maxY=zoomExtra*world.offsetHeight*.34;
 scale=Number.isFinite(scale)?clamp(scale,1,3.5):1;
 panX=Number.isFinite(panX)?clamp(panX,-maxX,maxX):0;
 panY=Number.isFinite(panY)?clamp(panY,-maxY,maxY):0;
 by("hd-tiles")?.classList.toggle("show",scale>1.55);
 world.style.transition=animate?"transform .8s cubic-bezier(.17,.78,.12,1)":"none";
 world.style.transform="translate(calc(-50% + "+panX+"px),calc(-50% + "+panY+"px)) scale("+scale+")";
}
const escape=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));const xy=o=>({x:(o.lon-bounds.west)/(bounds.east-bounds.west)*W,y:(bounds.north-o.lat)/(bounds.north-bounds.south)*H});const projectCount=()=>areas.reduce((n,p)=>n+(p.objects||[]).length,0);function shift(p){
 // Artistic HD image is not georeferenced: do not fly to invented coordinates.
 // Open the area's real catalogue without showing a false map position.
 scale=1.6;panX=0;panY=0;applyView(true);
}
function render(){const q=by("search").value.toLowerCase();const filtered=areas.filter(p=>(!showOnlyObjects||(p.objects||[]).length>0)&&(p.name+" "+p.en+" "+(p.objects||[]).map(o=>o.name).join(" ")).toLowerCase().includes(q));by("regions").innerHTML=showOnlyObjects?
 (filtered.length?filtered.flatMap(p=>(p.objects||[]).map((o,i)=>'<button class="region property-listing" data-area="'+escape(p.id)+'"><div><span>'+escape(o.name)+'</span><small>'+escape(p.name)+(o.type?' · '+escape(o.type):'')+'</small></div><i>›</i></button>')).join(""):'<div class="placeholder">Пока нет объектов. Добавим сюда только ваши проекты из PDF-презентаций.</div>'):
 filtered.map(p=>'<button class="region '+(selected===p.id?'active':'')+'" data-area="'+escape(p.id)+'"><div><span>'+escape(p.name)+'</span><small>'+escape(p.en)+' · '+(p.objects||[]).length+' объектов</small></div><i>›</i></button>').join("");const pins=[];for(const p of filtered){const pos=xy(p);pins.push('<button class="pin '+(selected===p.id?'active':'')+'" data-area="'+escape(p.id)+'" style="left:'+(pos.x/W*100)+'%;top:'+(pos.y/H*100)+'%"><span class="dot"></span><label>'+escape(p.en)+'</label></button>');for(const o of (p.objects||[])){if(typeof o.lat!=="number"||typeof o.lon!=="number")continue;const op=xy(o);pins.push('<button class="pin project" data-area="'+escape(p.id)+'" style="left:'+(op.x/W*100)+'%;top:'+(op.y/H*100)+'%"><span class="dot"></span><label>◆ '+escape(o.name)+'</label></button>')}}by("pins").innerHTML=pins.join("");document.querySelectorAll("[data-area]").forEach(el=>el.onclick=()=>{if(!showOnlyObjects){go(el.dataset.area);return;}go(el.dataset.area)});by("numareas").textContent=areas.length;by("numprojects").textContent=projectCount()}function go(id){const p=areas.find(x=>x.id===id);if(!p)return;if(showOnlyObjects){setDrawer(false);selected=id;show(p);return;}setDrawer(false);selected=id;by("sheet").classList.remove("open");by("overlay").hidden=true;by("sheet").setAttribute("aria-hidden","true");render();shift(p)}function objectHTML(o){
 const fields=[["Адрес",o.address],["Состав комплекса",o.buildings],["Площади",o.sizes],["Парковка",o.parking],["Девелопер",o.developer],["Портфель девелопера",o.developerPortfolio],["Разрешения",o.permits],["Планируемая сдача",o.completion],["Пляж Банг Тао",o.beach],["Инфраструктура",o.amenities],["Обслуживание",o.maintenance],["Разовый взнос",o.sinking]];
 return '<article class="object property-card"><div class="project-cover"><span>PURITA</span><small>PHUKET BANGTAO</small></div><div class="project-content"><small>'+escape(o.type||"Недвижимость")+'</small><h3>'+escape(o.name)+'</h3><p>'+escape(o.description||"")+'</p><dl class="property-facts">'+fields.filter(x=>x[1]).map(x=>'<div><dt>'+escape(x[0])+'</dt><dd>'+escape(x[1])+'</dd></div>').join("")+'</dl>'+
 (o.pdf&&o.pdf.startsWith("presentations/")&&o.pdf.endsWith(".pdf")?
 '<button class="brochure-open" data-pdf="'+escape(o.pdf)+'" data-materials="'+escape(o.materialsUrl||"")+'">Посмотреть PDF-презентацию</button>':'')+
 (o.mapUrl?'<a class="brochure-link" target="_blank" rel="noopener" href="'+escape(o.mapUrl)+'">Расположение в Google Maps ↗</a>':"")+
 (o.developerUrl?'<a class="brochure-link" target="_blank" rel="noopener" href="'+escape(o.developerUrl)+'">Сайт CG Capital ↗</a>':"")+
 (o.materialsUrl?'<a class="brochure-link" target="_blank" rel="noopener" href="'+escape(o.materialsUrl)+'">Агентские материалы ↗</a>':"")+
 (o.salesPhone?'<p><a href="tel:'+escape(o.salesPhone.replace(/[^+0-9]/g,""))+'">Отдел продаж: '+escape(o.salesPhone)+'</a></p>':"")+
 (o.salesEmail?'<p><a href="mailto:'+escape(o.salesEmail)+'">'+escape(o.salesEmail)+'</a></p>':"")+
 (o.notice?'<p class="project-disclaimer">'+escape(o.notice)+'</p>':"")+'</div></article>';
}
function show(p){
 const list=p.objects||[];
 by("detail").innerHTML='<div class="hero"><div><div class="tag">PHUKET · '+escape(p.region)+'</div><h2>'+escape(p.name)+'</h2><small>'+escape(p.en)+'</small></div></div><div class="detail"><p>'+escape(p.summary)+'</p><h3>Мои объекты · '+list.length+'</h3>'+
 (list.length?list.map(objectHTML).join(""):'<div class="placeholder">В этом районе пока нет добавленных объектов.</div>')+
 '<footer>Координаты метки района: '+p.lat.toFixed(4)+' N, '+p.lon.toFixed(4)+' E. Это центр района, не адрес проекта.</footer></div>';
 by("sheet").classList.add("open");by("sheet").setAttribute("aria-hidden","false");by("overlay").hidden=false;
 by("detail").querySelectorAll("[data-pdf]").forEach(btn=>btn.onclick=()=>openBrochure(btn.dataset.pdf,btn.dataset.materials));
}function openBrochure(path,materials){
 const pane=by("pdf-viewer"),frame=by("pdf-frame"),message=by("pdf-status"),external=by("pdf-external"),backup=by("pdf-materials");
 if(!pane||!path||!/^presentations\\/[a-zA-Z0-9_.-]+\\.pdf$/.test(path))return;
 pane.hidden=false;frame.hidden=true;frame.removeAttribute("src");
 message.textContent="Проверяем наличие PDF-презентации…";
 external.hidden=true;
 backup.hidden=!materials;if(materials)backup.href=materials;
 fetch(path,{method:"HEAD",cache:"no-store"}).then(res=>{
  if(!res.ok||!(res.headers.get("content-type")||"").includes("pdf"))throw Error("not uploaded");
  frame.src=path+"#toolbar=1&view=FitH";frame.hidden=false;message.textContent="";
  external.href=path;external.hidden=false;
 }).catch(()=>{message.textContent="Оригинальная PDF-презентация пока не размещена на сайте. Можно открыть папку материалов проекта.";});
}
function closeBrochure(){
 const pane=by("pdf-viewer");if(!pane)return;
 pane.hidden=true;by("pdf-frame").removeAttribute("src");
}
by("pdf-close").onclick=closeBrochure;
by("pdf-viewer").addEventListener("click",e=>{if(e.target.id==="pdf-viewer")closeBrochure()});
function close(){selected=null;by("sheet").classList.remove("open");by("sheet").setAttribute("aria-hidden","true");by("overlay").hidden=true;scale=1;panX=0;panY=0;applyView(true);render()}const drawer=by("district-drawer"),drawerToggle=by("district-toggle");
function setDrawer(open){
 drawer.classList.toggle("drawer-open",open);
 drawerToggle.setAttribute("aria-expanded",String(open&&!showOnlyObjects));
 by("objects-toggle").setAttribute("aria-expanded",String(open&&showOnlyObjects));
 drawerToggle.setAttribute("aria-label",open?"Закрыть районы":"Открыть районы");
}
const objectsToggle=by("objects-toggle");
let showOnlyObjects=false;
function applyDrawerMode(onlyObjects){
 showOnlyObjects=onlyObjects;
 by("district-drawer").querySelector(".tag").textContent=onlyObjects?"МОИ ОБЪЕКТЫ":"РАЙОНЫ";
 by("search").placeholder=onlyObjects?"Поиск моего объекта…":"Поиск района…";
 render();
 setDrawer(true);
 objectsToggle.setAttribute("aria-expanded",String(onlyObjects));
}
drawerToggle.onclick=()=>{if(!showOnlyObjects&&drawer.classList.contains("drawer-open"))setDrawer(false);else applyDrawerMode(false)};
objectsToggle.onclick=()=>{if(showOnlyObjects&&drawer.classList.contains("drawer-open"))setDrawer(false);else applyDrawerMode(true)};
by("district-close").onclick=()=>setDrawer(false);
document.addEventListener("pointerdown",e=>{
 if(drawer.classList.contains("drawer-open")&&!drawer.contains(e.target)&&!drawerToggle.contains(e.target)&&!objectsToggle.contains(e.target))setDrawer(false);
});
by("close").onclick=by("overlay").onclick=close;
let sheetSwipeStart=null;
by("sheet").addEventListener("touchstart",e=>{
 if(e.touches.length!==1)return;
 const t=e.touches[0];sheetSwipeStart={x:t.clientX,y:t.clientY};
},{passive:true});
by("sheet").addEventListener("touchend",e=>{
 if(!sheetSwipeStart||e.changedTouches.length!==1)return;
 const t=e.changedTouches[0],dx=t.clientX-sheetSwipeStart.x,dy=t.clientY-sheetSwipeStart.y;
 sheetSwipeStart=null;
 if(dx>85&&Math.abs(dy)<65&&dx>Math.abs(dy)*1.5)close();
},{passive:true});
by("sheet").addEventListener("touchcancel",()=>sheetSwipeStart=null,{passive:true});
document.onkeydown=e=>{if(e.key==="Escape")close()};by("search").oninput=render;by("reset").onclick=close;by("zin").onclick=()=>{scale=clamp(scale*1.25,1,3.5);applyView(true)};
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
 if(geoEnabled)return;
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
 if(geoEnabled)return;
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
  if(gestureMoved&&scale>1.001){panX+=dx;panY+=dy;applyView()}
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
 if(geoEnabled)return;
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
 if(geoEnabled)return;
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
  if(touchDragged&&scale>1.001){panX+=next.x-touchPrev.x;panY+=next.y-touchPrev.y;applyView()}
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
 if(geoEnabled)return;
 if(e.cancelable)e.preventDefault();
 const next=clamp(scale*Math.exp(-e.deltaY*.001),1,3.5),rect=scene.getBoundingClientRect();
 const x=e.clientX-(rect.left+rect.width/2),y=e.clientY-(rect.top+rect.height/2),ratio=next/scale;
 panX=x-(x-panX)*ratio;panY=y-(y-panY)*ratio;scale=next;applyView()
},{passive:false});

// Geographically grounded map: source tiles from OpenStreetMap; exact area coordinates from catalogue.
let geoMap=null,geoEnabled=false,geoMarkers=[],geoBaseLayer=null;
const districtMapMarkers=new Map();
let readyDistrictId=null;
let satelliteToken=localStorage.getItem("phuket_mapbox_public_token")||"";
function applySatelliteLayer(){
 if(!geoMap)return;
 if(geoBaseLayer)geoMap.removeLayer(geoBaseLayer);
 if(satelliteToken){
  geoBaseLayer=L.tileLayer("https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}?access_token="+encodeURIComponent(satelliteToken),{
    tileSize:512,zoomOffset:-1,maxZoom:20,
    attribution:'Imagery &copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });
 }else{
  geoBaseLayer=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
   attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19
  });
 }
 geoBaseLayer.addTo(geoMap);
}
const geoBox=by("real-map"),modeButton=by("map-mode");
// Let Leaflet receive bubbled pointer/touch events and document-level drag events.
function refreshGeoMarkers(){
 if(!geoMap)return;
 geoMarkers.forEach(m=>geoMap.removeLayer(m));geoMarkers=[];districtMapMarkers.clear();
 for(const p of areas){
  if(!Number.isFinite(p.lat)||!Number.isFinite(p.lon))continue;
  const marker=L.marker([p.lat,p.lon]).addTo(geoMap).bindTooltip(p.name);
  marker.on("click",()=>{
   // First tap from overview flies to district; tapping the focused marker again opens details.
   const focused=readyDistrictId===p.id && geoMap.getZoom()>=12.5;
   setDrawer(false);
   if(focused){readyDistrictId=null;show(p);return;}
   readyDistrictId=null;
   selected=p.id;
   geoMap.flyTo([p.lat,p.lon],13,{duration:1.1});
   geoMap.once("moveend",()=>{if(selected===p.id&&geoEnabled){readyDistrictId=p.id;marker.openTooltip()}});
   render();
  });
  districtMapMarkers.set(p.id,marker);
  geoMarkers.push(marker);
  for(const o of (p.objects||[])){
   if(!Number.isFinite(o.lat)||!Number.isFinite(o.lon))continue;
   const m=L.circleMarker([o.lat,o.lon],{radius:9,color:"#f8d182",weight:3,fillColor:"#0e5364",fillOpacity:1}).addTo(geoMap).bindTooltip(o.name);
   m.on("click",()=>{selected=p.id;show(p)});
   geoMarkers.push(m);
  }
 }
}
function setGeoMode(on){
 if(on&&typeof L==="undefined"){
  modeButton.textContent="Карта недоступна";
  return;
 }
 geoEnabled=on;geoBox.hidden=!on;
 by("scene").style.touchAction="none";
 geoBox.style.touchAction="none";
 by("scene").classList.toggle("geo-mode",on);
 modeButton.setAttribute("aria-pressed",String(on));
 modeButton.textContent=on?"Игровая карта":(satelliteToken?"Спутник":"Точная карта");
 satelliteButton.hidden=Boolean(satelliteToken);satelliteButton.style.display=satelliteToken?"none":"";
 if(on){
  if(!geoMap){
   geoMap=L.map(geoBox,{zoomControl:false,attributionControl:true,dragging:true,touchZoom:true,scrollWheelZoom:true,doubleClickZoom:true,boxZoom:true}).setView([7.96,98.34],10);
   geoMap.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
   applySatelliteLayer();
   refreshGeoMarkers();
   geoMap.on("zoomend",()=>{if(geoMap.getZoom()<12.5)readyDistrictId=null});
  }
  requestAnimationFrame(()=>geoMap.invalidateSize());
 }
}
modeButton.onclick=()=>setGeoMode(!geoEnabled);
const satelliteButton=by("satellite-setup");
satelliteButton.hidden=Boolean(satelliteToken);
satelliteButton.style.display=satelliteToken?"none":"";
satelliteButton.onclick=()=>{
 const entered=window.prompt("Вставь публичный токен Mapbox (начинается с pk.). Он сохранится только в этом браузере iPhone.",satelliteToken);
 if(entered===null)return;
 const token=entered.trim();
 if(token&&!/^pk\.[A-Za-z0-9._-]+$/.test(token)){
   window.alert("Нужен публичный токен Mapbox, который начинается с pk.");return;
 }
 satelliteToken=token;
 if(token)localStorage.setItem("phuket_mapbox_public_token",token);
 else localStorage.removeItem("phuket_mapbox_public_token");
 satelliteButton.textContent=token?"Спутник ✓":"Подключить спутник";
 satelliteButton.hidden=Boolean(token);
 satelliteButton.style.display=token?"none":"";
 if(geoMap)applySatelliteLayer();
 setGeoMode(true);
};
const originalGo=go;
go=function(id){
 if(!geoEnabled)return originalGo(id);
 const p=areas.find(x=>x.id===id);
 if(!p)return;
 if(showOnlyObjects){setDrawer(false);selected=id;show(p);return;}
 setDrawer(false);selected=id;
 by("sheet").classList.remove("open");by("overlay").hidden=true;by("sheet").setAttribute("aria-hidden","true");
 readyDistrictId=null;
 geoMap.flyTo([p.lat,p.lon],13,{duration:1.1});
 const districtMarker=districtMapMarkers.get(p.id);
 if(districtMarker){geoMap.once("moveend",()=>{if(selected===id&&geoEnabled){readyDistrictId=id;districtMarker.openTooltip()}});}
 render();
};
const oldZoomIn=by("zin").onclick,oldZoomOut=by("zout").onclick,oldReset=by("reset").onclick;
by("zin").onclick=()=>geoEnabled?geoMap.zoomIn():oldZoomIn();
by("zout").onclick=()=>geoEnabled?geoMap.zoomOut():oldZoomOut();
by("reset").onclick=()=>{if(geoEnabled){readyDistrictId=null;selected=null;geoMap.flyTo([7.96,98.34],10)}else oldReset()};
fetch("data/locations.json").then(r=>{if(!r.ok)throw Error("Не удалось загрузить каталог");return r.json()}).then(d=>{areas=d;render();refreshGeoMarkers()}).catch(e=>by("regions").textContent=e.message)})();