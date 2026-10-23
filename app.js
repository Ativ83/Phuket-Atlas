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
const VISIBILITY_KEY="phuket_atlas_hidden_properties_v1";
let hiddenProjects=new Set();
try{const saved=JSON.parse(localStorage.getItem(VISIBILITY_KEY)||"[]");if(Array.isArray(saved))hiddenProjects=new Set(saved.filter(x=>typeof x==="string"));}catch(e){}
const projectVisible=o=>!hiddenProjects.has(o.id);
function setProjectVisibility(ids,visible){
 ids.forEach(id=>visible?hiddenProjects.delete(id):hiddenProjects.add(id));
 try{localStorage.setItem(VISIBILITY_KEY,JSON.stringify([...hiddenProjects]));}catch(e){}
 render();
 refreshGeoMarkers();
}
function render(){const q=by("search").value.toLowerCase();const filtered=areas.filter(p=>(!showOnlyObjects||(p.objects||[]).length>0)&&(p.name+" "+p.en+" "+(p.objects||[]).map(o=>o.name).join(" ")).toLowerCase().includes(q));by("regions").innerHTML=showOnlyObjects?
 (filtered.length?'<div class="property-visibility-all"><button type="button" class="visibility-action visibility-eye visibility-eye-all" id="visibility-all" title="Показать или скрыть все объекты" aria-label="Показать или скрыть все объекты">'+(areas.every(a=>(a.objects||[]).every(projectVisible))?'◉':'◎')+'</button></div>'+filtered.flatMap(p=>(p.objects||[]).map((o,i)=>'<div class="property-visibility-row"><button class="region property-listing" data-area="'+escape(p.id)+'" data-object-index="'+i+'"><div><span>'+escape(o.name)+'</span><small>'+escape(p.name)+(o.type?' · '+escape(o.type):'')+'</small></div><i>›</i></button><button type="button" class="visibility-action visibility-eye" data-visibility-id="'+escape(o.id)+'" aria-pressed="'+projectVisible(o)+'" aria-label="'+(projectVisible(o)?'Скрыть':'Показать')+' булавку '+escape(o.name)+'">'+(projectVisible(o)?'◉':'◎')+'</button></div>')).join(""):'<div class="placeholder">Пока нет объектов. Добавим сюда только ваши проекты из PDF-презентаций.</div>'):
 filtered.map(p=>'<button class="region '+(selected===p.id?'active':'')+'" data-area="'+escape(p.id)+'"><div><span>'+escape(p.name)+'</span><small>'+escape(p.en)+' · '+(p.objects||[]).length+' объектов</small></div><i>›</i></button>').join("");const gameLabelsOnRight=new Set(["rawai","chalong","phuket-town"]);const pins=[];for(const p of filtered){
 const pos=xy(p);
 pins.push('<button class="pin game-region-pin '+(gameLabelsOnRight.has(p.id)?'label-right':'label-left')+' '+(selected===p.id?'active':'')+'" data-area="'+escape(p.id)+'" style="left:'+(pos.x/W*100)+'%;top:'+(pos.y/H*100)+'%"><span class="dot"></span><label>'+escape(p.en)+'</label></button>');
 (p.objects||[]).filter(projectVisible).forEach((o,index)=>{
  const op=xy(p);op.x+=23+(index%3)*15;op.y+=15+Math.floor(index/3)*20;
  pins.push('<button class="pin project game-property-flag" type="button" aria-label="Открыть '+escape(o.name)+'" data-project-id="'+escape(o.id)+'" data-area="'+escape(p.id)+'" style="left:'+(op.x/W*100)+'%;top:'+(op.y/H*100)+'%"><span class="game-flag-icon" aria-hidden="true">📌</span></button>');
 });
 }by("pins").innerHTML=pins.join("");by("visibility-all")?.addEventListener("click",()=>{const ids=areas.flatMap(p=>(p.objects||[]).map(o=>o.id));const allVisible=ids.every(id=>!hiddenProjects.has(id));setProjectVisibility(ids,!allVisible);});
 document.querySelectorAll("[data-visibility-id]").forEach(btn=>btn.onclick=()=>setProjectVisibility([btn.dataset.visibilityId],hiddenProjects.has(btn.dataset.visibilityId)));
 document.querySelectorAll(".game-property-flag").forEach(el=>el.onclick=()=>{const p=areas.find(x=>x.id===el.dataset.area);const o=(p?.objects||[]).find(x=>x.id===el.dataset.projectId);if(p&&o){setDrawer(false);selected=p.id;show(p)}});
 document.querySelectorAll("[data-area]:not(.game-property-flag)").forEach(el=>el.onclick=()=>{const p=areas.find(x=>x.id===el.dataset.area);if(showOnlyObjects&&p){const o=(p.objects||[])[Number(el.dataset.objectIndex)];if(o){focusProperty(p,o);return;}}go(el.dataset.area)});by("numareas").textContent=areas.length;by("numprojects").textContent=projectCount()}function go(id){const p=areas.find(x=>x.id===id);if(!p)return;if(showOnlyObjects){setDrawer(false);selected=id;show(p);return;}setDrawer(false);selected=id;by("sheet").classList.remove("open");by("overlay").hidden=true;by("sheet").setAttribute("aria-hidden","true");render();shift(p)}function objectHTML(o){
 const fields=[["Адрес",o.address],["Состав комплекса",o.buildings],["Количество резиденций",o.units],["Площади",o.sizes],["Парковка",o.parking],["Девелопер",o.developer],["Портфель девелопера",o.developerPortfolio],["Разрешения",o.permits],["Планируемая сдача",o.completion],["Пляж",o.beach],["Инфраструктура",o.amenities],["Формы владения",o.ownership],["Продажи",o.sales],["Обслуживание",o.maintenance],["Разовый взнос",o.sinking]];
 const label=o.name==="PURITA Phuket Bangtao"?"PURITA":"InterContinental";
 const sub=o.name==="PURITA Phuket Bangtao"?"PHUKET BANGTAO":"THE RESIDENCES · KAMALA";
 const isProjectFlipbook=o.materialsUrl&&/^https:\/\/flipbook\.proudrealestate\.co\.th\//.test(o.materialsUrl);
 return '<article class="object property-card"><div class="project-cover"><span>'+escape(label)+'</span><small>'+escape(sub)+'</small></div><div class="project-content"><small>'+escape(o.type||"Недвижимость")+'</small><h3>'+escape(o.name)+'</h3><p>'+escape(o.description||"")+'</p><dl class="property-facts">'+fields.filter(x=>x[1]).map(x=>'<div><dt>'+escape(x[0])+'</dt><dd>'+escape(x[1])+'</dd></div>').join("")+'</dl>'+
 (o.pdf&&o.pdf.startsWith("presentations/")&&o.pdf.endsWith(".pdf")?'<button class="brochure-open" data-pdf="'+escape(o.pdf)+'" data-materials="'+escape(o.materialsUrl||"")+'">Посмотреть PDF-презентацию</button>':'')+
 (isProjectFlipbook?'<a class="brochure-link" href="'+escape(o.materialsUrl)+'" target="_blank" rel="noopener">Открыть презентацию резиденций ↗</a>':'')+
 (o.developerUrl?'<a class="brochure-link" target="_blank" rel="noopener" href="'+escape(o.developerUrl)+'">Сайт девелопера ↗</a>':"")+
 (o.materialsUrl&&!isProjectFlipbook?'<a class="brochure-link" target="_blank" rel="noopener" href="'+escape(o.materialsUrl)+'">Агентские материалы ↗</a>':"")+
 (o.salesPhone?'<p><a href="tel:'+escape(o.salesPhone.replace(/[^+0-9]/g,""))+'">'+escape(o.salesContact?"Контакт "+o.salesContact+": ":"Отдел продаж: ")+escape(o.salesPhone)+'</a></p>':"")+
 (o.salesEmail?'<p><a href="mailto:'+escape(o.salesEmail)+'">'+escape(o.salesEmail)+'</a></p>':"")+
 (o.notice?'<p class="project-disclaimer">'+escape(o.notice)+'</p>':"")+'</div></article>';
}
function show(p){
 const list=p.objects||[];
 by("detail").innerHTML='<div class="hero"><div><div class="tag">PHUKET · '+escape(p.region)+'</div><h2>'+escape(p.name)+'</h2><small>'+escape(p.en)+'</small></div>'+(list.length?'<button type="button" class="region-eye-toggle" aria-label="Показать или скрыть объекты района" aria-pressed="'+list.every(projectVisible)+'"><span class="eye-symbol" aria-hidden="true">'+(list.every(projectVisible)?'👁️':'◉')+'</span><span class="eye-label">'+(list.every(projectVisible)?'Видно':'Не видно')+'</span></button>':'')+'</div><div class="detail"><p>'+escape(p.summary)+'</p><h3>Мои объекты · '+list.length+'</h3>'+
 (list.length?list.map(objectHTML).join(""):'<div class="placeholder">В этом районе пока нет добавленных объектов.</div>')+
 '</div>';
 by("sheet").classList.add("open");by("sheet").setAttribute("aria-hidden","false");by("overlay").hidden=false;
 const regionEye=by("detail").querySelector(".region-eye-toggle");
 if(regionEye)regionEye.onclick=()=>{
  const visible=list.every(projectVisible);
  setProjectVisibility(list.map(o=>o.id),!visible);
  regionEye.setAttribute("aria-pressed",String(!visible));
  regionEye.querySelector(".eye-label").textContent=!visible?"Видно":"Не видно";
  regionEye.querySelector(".eye-symbol").textContent=!visible?"👁️":"◉";
  by("detail").querySelectorAll("[data-card-visibility-id]").forEach(btn=>{
   const shown=!hiddenProjects.has(btn.dataset.cardVisibilityId);
   btn.textContent=shown?"Скрыть с карты":"Показать на карте";
   btn.setAttribute("aria-pressed",String(shown));
  });
 };
 by("detail").querySelectorAll("[data-card-visibility-id]").forEach(btn=>btn.onclick=()=>{
  const id=btn.dataset.cardVisibilityId;
  setProjectVisibility([id],hiddenProjects.has(id));
  const visible=!hiddenProjects.has(id);
  btn.textContent=visible?"Скрыть с карты":"Показать на карте";
  btn.setAttribute("aria-pressed",String(visible));
 });
 by("detail").querySelectorAll("[data-pdf]").forEach(btn=>btn.onclick=()=>openBrochure(btn.dataset.pdf,btn.dataset.materials));
}let pdfViewerRun=0;
function loadPdfJS(){
 if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
 if(window._phuketPdfJSLoading)return window._phuketPdfJSLoading;
 window._phuketPdfJSLoading=new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  script.onload=()=>window.pdfjsLib?resolve(window.pdfjsLib):reject(Error("PDF.js unavailable"));
  script.onerror=()=>reject(Error("Не удалось загрузить модуль просмотра"));
  document.head.appendChild(script);
 });
 return window._phuketPdfJSLoading;
}
async function openBrochure(path,materials){
 const pane=by("pdf-viewer"),pages=by("pdf-pages"),message=by("pdf-status"),external=by("pdf-external"),backup=by("pdf-materials");
 if(!pane||!path||!(path.startsWith("presentations/")&&path.endsWith(".pdf")))return;
 const run=++pdfViewerRun;
 pane.hidden=false;pages.innerHTML="";pages.scrollTop=0;
 message.textContent="Загружаем PDF-презентацию…";message.hidden=false;
 external.href=path;external.hidden=false;backup.hidden=!materials;if(materials)backup.href=materials;
 try{
  const pdfjs=await loadPdfJS();
  pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf=await pdfjs.getDocument({url:path}).promise;
  if(run!==pdfViewerRun)return;
  for(let n=1;n<=pdf.numPages;n++){
   if(run!==pdfViewerRun)return;
   const page=await pdf.getPage(n),base=page.getViewport({scale:1});
   const width=Math.min(pages.clientWidth-16,850);
   const cssScale=width/base.width;
   const dpr=Math.min(window.devicePixelRatio||1,1.5);
   const viewport=page.getViewport({scale:cssScale*dpr});
   const canvas=document.createElement("canvas");
   canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   canvas.style.width=Math.round(viewport.width/dpr)+"px";
   canvas.style.height=Math.round(viewport.height/dpr)+"px";
   canvas.setAttribute("aria-label","Страница "+n+" из "+pdf.numPages);
   const wrap=document.createElement("div");wrap.className="pdf-page";wrap.appendChild(canvas);pages.appendChild(wrap);
   await page.render({canvasContext:canvas.getContext("2d",{alpha:false}),viewport}).promise;
   if(run!==pdfViewerRun)return;
   message.textContent="Страница "+n+" из "+pdf.numPages;
  }
  if(run===pdfViewerRun)message.hidden=true;
 }catch(e){
  if(run===pdfViewerRun){message.hidden=false;message.textContent="Не удалось показать PDF внутри приложения. Используйте кнопку «Открыть PDF отдельно».";}
 }
}
function closeBrochure(){
 ++pdfViewerRun;
 by("pdf-viewer").hidden=true;
 by("pdf-pages").innerHTML="";
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
// Dismiss the left sidebar with a deliberate leftward swipe.
let drawerSwipeStart=null;
drawer.addEventListener("touchstart",e=>{
 if(e.touches.length!==1||!drawer.classList.contains("drawer-open"))return;
 const t=e.touches[0];drawerSwipeStart={x:t.clientX,y:t.clientY};
},{passive:true});
drawer.addEventListener("touchend",e=>{
 if(!drawerSwipeStart||e.changedTouches.length!==1)return;
 const t=e.changedTouches[0],dx=t.clientX-drawerSwipeStart.x,dy=t.clientY-drawerSwipeStart.y;
 drawerSwipeStart=null;
 if(dx<-80&&Math.abs(dx)>Math.abs(dy)*1.35)setDrawer(false);
},{passive:true});
drawer.addEventListener("touchcancel",()=>{drawerSwipeStart=null},{passive:true});
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
const allNamedMarkers=[];
let labelsVisible=false,focusedLabel=null;
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
 geoMarkers.forEach(m=>geoMap.removeLayer(m));geoMarkers=[];districtMapMarkers.clear();allNamedMarkers.length=0;focusedLabel=null;
 for(const p of areas){
  if(!Number.isFinite(p.lat)||!Number.isFinite(p.lon))continue;
  const marker=L.marker([p.lat,p.lon],{icon:L.icon({
   iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
   iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
   shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
   iconSize:[17.5,28.7],iconAnchor:[8.75,28.7],popupAnchor:[0,-25],
   shadowSize:[28.7,28.7],shadowAnchor:[8.75,28.7],className:"atlas-district-marker"
  })}).addTo(geoMap).bindTooltip(p.name);
  marker.on("click",()=>{
   // First tap from overview flies to district; tapping the focused marker again opens details.
   const focused=readyDistrictId===p.id && geoMap.getZoom()>=12.5;
   setDrawer(false);
   if(focused){readyDistrictId=null;show(p);return;}
   readyDistrictId=null;
   selected=p.id;
   geoMap.flyTo([p.lat,p.lon],13,{duration:1.1});
   geoMap.once("moveend",()=>{if(selected===p.id&&geoEnabled){readyDistrictId=p.id;updateMapLabels("area:"+p.id)}});
   render();
  });
  districtMapMarkers.set(p.id,marker);
  allNamedMarkers.push({marker,name:p.name,id:"area:"+p.id});
  geoMarkers.push(marker);
  // Satellite: map projects to the actual GPS coordinates, never an offset district location.
  (p.objects||[]).filter(projectVisible).forEach(o=>{
   const hasGPS=Number.isFinite(o.lat)&&Number.isFinite(o.lon);
   const lat=hasGPS?o.lat:p.lat,lon=hasGPS?o.lon:p.lon;
   const m=L.marker([lat,lon],{icon:L.divIcon({
    className:"atlas-satellite-project-pin",
    html:'<span class="atlas-satellite-pushpin" aria-hidden="true">📌</span>',
    iconSize:[30,32],iconAnchor:[15,28]
   }),zIndexOffset:650}).addTo(geoMap);
   m.on("click",()=>{selected=p.id;setDrawer(false);updateMapLabels("object:"+o.id);show(p)});
   allNamedMarkers.push({marker:m,name:o.name,id:"object:"+o.id});
   geoMarkers.push(m);
  });
 }
}
function updateMapLabels(focusId=null){
 if(focusId!==null)focusedLabel=focusId;
 const shown=allNamedMarkers.filter(item=>labelsVisible||item.id===focusedLabel);
 // Sort north to south; distribute neighboring labels to opposite sides.
 // East-side locations have labels on the right; all western locations on the left.
 const rightSide=new Set(["rawai","chalong","phuket-town"]);
 const positions=new Map();
 shown.forEach(item=>{
  const id=item.id.startsWith("area:")?item.id.slice(5):"";
  const isProject=item.id.startsWith("object:");
  positions.set(item,(isProject||rightSide.has(id))?"right":"left");
 });
 for(const item of allNamedMarkers){
  item.marker.unbindTooltip();
  if(!positions.has(item))continue;
  const direction=positions.get(item);
  item.marker.bindTooltip(item.name,{
   permanent:true,direction,offset:[direction==="right"?12:-12,0],
   className:"phuket-map-label"
  });
  item.marker.openTooltip();
 }
 const button=by("labels-toggle");
 if(button){button.setAttribute("aria-pressed",String(labelsVisible));button.textContent=labelsVisible?"Инф.: вкл":"Инф.: выкл";}
}
by("labels-toggle").onclick=()=>setGameInformation(!gameInfoOn);
function focusProperty(p,o){
 setDrawer(false);selected=p.id;
 const lat=Number(o.lat),lon=Number(o.lon);
 if(geoEnabled&&Number.isFinite(lat)&&Number.isFinite(lon)){
  const mark=allNamedMarkers.find(x=>x.id==="object:"+o.id);
  geoMap.flyTo([lat,lon],16,{duration:1.1});
  geoMap.once("moveend",()=>{if(mark)updateMapLabels(mark.id)});
 }else if(geoEnabled){
  geoMap.flyTo([p.lat,p.lon],13,{duration:1.1});
  geoMap.once("moveend",()=>updateMapLabels("object:"+o.id));
 }else{show(p)}
}
// Both views have different projections. Synchronize relative zoom, not false geographic precision.
const satelliteZoomPerDoubling=2.3;
const phuketOverviewBounds=[[7.72,98.20],[8.20,98.48]];
let satelliteOverviewZoom=11;
function computeOverviewZoom(){
 if(!geoMap)return satelliteOverviewZoom;
 const b=L.latLngBounds(phuketOverviewBounds);
 return satelliteOverviewZoom=11; // phone reference: a closer view of central/southern Phuket
}
function gameZoomToSatellite(z){return clamp(satelliteOverviewZoom+Math.log2(clamp(z,1,3.5))*satelliteZoomPerDoubling,2,18)}
function satelliteZoomToGame(z){return clamp(Math.pow(2,(z-satelliteOverviewZoom)/satelliteZoomPerDoubling),1,3.5)}
function setGeoMode(on){
 if(on&&typeof L==="undefined"){
  modeButton.textContent="Карта недоступна";
  return;
 }
 // Capture the departing view's zoom BEFORE switching.
 if(!on&&geoEnabled&&geoMap){
  scale=satelliteZoomToGame(geoMap.getZoom());
  applyView(false);
 }
 geoEnabled=on;geoBox.hidden=!on;
 by("scene").style.touchAction="none";
 geoBox.style.touchAction="none";
 by("scene").classList.toggle("geo-mode",on);
 modeButton.setAttribute("aria-pressed",String(on));
 modeButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16m0 0-4-4m4 4-4 4M20 16H4m0 0 4-4m-4 4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 modeButton.setAttribute("aria-label",on?"Переключиться на игровую карту":"Переключиться на спутниковую карту");
 modeButton.title=on?"Игровая карта":"Спутниковая карта";
 satelliteButton.hidden=Boolean(satelliteToken);satelliteButton.style.display=satelliteToken?"none":"";
 if(on){
  if(!geoMap){
   geoMap=L.map(geoBox,{zoomControl:false,attributionControl:true,dragging:true,touchZoom:true,scrollWheelZoom:true,doubleClickZoom:true,boxZoom:true}).setView([7.96,98.34],10);
   geoMap.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
   applySatelliteLayer();
   refreshGeoMarkers();
   updateMapLabels();
   geoMap.on("zoomend",()=>{if(geoMap.getZoom()<12.5)readyDistrictId=null});
  }
  // Restore the zoom after the satellite container becomes visible.
  const targetZoom=gameZoomToSatellite(scale);
  requestAnimationFrame(()=>{
   geoMap.invalidateSize({pan:false});
   const overview=computeOverviewZoom();
   geoMap.stop();
   const zoom=gameZoomToSatellite(scale);
   geoMap.setView(scale<=1.01?L.latLng(7.94,98.34):geoMap.getCenter(),zoom,{animate:false});
  });
  updateMapLabels();
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
 if(districtMarker){geoMap.once("moveend",()=>{if(selected===id&&geoEnabled){readyDistrictId=id;updateMapLabels("area:"+id)}});}
 render();
};
// Artistic map can use two coordinated images: labeled and text-free.
// Until both assets are uploaded, preserve the existing approved image.
// Art layer is a clean, static render. Annotations are separate and toggleable.
let gameInfoOn=false;
function setGameInformation(on){
 gameInfoOn=on;
 labelsVisible=on;
 by("scene").classList.toggle("game-info-off",!on);
 updateMapLabels();
 const btn=by("art-info-toggle");
 btn.textContent=on?"Инф.: вкл":"Инф.: выкл";
 btn.setAttribute("aria-pressed",String(on));
}
by("art-info-toggle").onclick=()=>setGameInformation(!gameInfoOn);
setGameInformation(false);
const oldZoomIn=by("zin").onclick,oldZoomOut=by("zout").onclick,oldReset=by("reset").onclick;
by("zin").onclick=()=>geoEnabled?geoMap.zoomIn():oldZoomIn();
by("zout").onclick=()=>geoEnabled?geoMap.zoomOut():oldZoomOut();
by("reset").onclick=()=>{if(geoEnabled){readyDistrictId=null;selected=null;focusedLabel=null;updateMapLabels();(computeOverviewZoom(),geoMap.flyTo([7.94,98.34],gameZoomToSatellite(1),{duration:1.1}))}else oldReset()};
fetch("data/locations.json?v=intercontinental-gps-67").then(r=>{if(!r.ok)throw Error("Не удалось загрузить каталог");return r.json()}).then(d=>{areas=d;render();refreshGeoMarkers()}).catch(e=>by("regions").textContent=e.message)})();