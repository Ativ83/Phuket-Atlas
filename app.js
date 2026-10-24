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
 scene.classList.toggle("plane-near",scale>=1.7);
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
const visibleProjectCount=()=>areas.reduce((n,p)=>n+(p.objects||[]).filter(projectVisible).length,0);
// Apply the game layers independently. Inline important rules override legacy
// conflicting styles that previously hid the entire pin container.
function syncGameLayers(){
 const scene=by("scene"),container=by("pins");
 if(!scene||!container)return;
 const infoOn=!scene.classList.contains("game-info-off");
 container.style.setProperty("display","block","important");
 container.style.setProperty("visibility","visible","important");
 container.style.setProperty("pointer-events","none","important");
 // The region layer and the property layer have separate visibility controls.
 // Recompute both from state after every redraw, including hide/show cycles.
 container.querySelectorAll(".game-region-pin").forEach(pin=>{
  pin.style.setProperty("display",infoOn?"flex":"none","important");
  pin.style.setProperty("pointer-events",infoOn?"auto":"none","important");
 });
 container.querySelectorAll(".game-property-flag").forEach(pin=>{
  const visible=!hiddenProjects.has(pin.dataset.projectId);
  pin.style.setProperty("display",visible?"flex":"none","important");
  pin.style.setProperty("pointer-events",visible?"auto":"none","important");
 });
}
function setProjectVisibility(ids,visible){
 ids.forEach(id=>visible?hiddenProjects.delete(id):hiddenProjects.add(id));
 try{localStorage.setItem(VISIBILITY_KEY,JSON.stringify([...hiddenProjects]));}catch(e){}
 render();
 refreshGeoMarkers();
 updateMapLabels(); // Restore district tooltips after rebuilding only the property markers.
 updateSatelliteObjectsEye();
}
function updateSatelliteObjectsEye(){
 const button=by("satellite-objects-eye");
 if(!button)return;
 const ids=areas.flatMap(p=>(p.objects||[]).map(o=>o.id));
 const visible=ids.length===0||ids.every(id=>!hiddenProjects.has(id));
 button.innerHTML=visibilityEyeIcon(visible);
 button.setAttribute("aria-pressed",String(visible));
 button.setAttribute("aria-label",visible?"Скрыть все мои объекты":"Показать все мои объекты");
}
by("satellite-objects-eye").onclick=()=>{
 const ids=areas.flatMap(p=>(p.objects||[]).map(o=>o.id));
 if(!ids.length)return;
 const allVisible=ids.every(id=>!hiddenProjects.has(id));
 setProjectVisibility(ids,!allVisible);
};
function visibilityEyeIcon(visible){
 return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>'+(visible?'':'<path d="M3 21 21 3" stroke="currentColor" stroke-width="2.4"/>')+'</svg>';
}
function render(){updateSatelliteObjectsEye();const q=by("search").value.toLowerCase();const filtered=areas.filter(p=>(!showOnlyObjects||(p.objects||[]).length>0)&&(p.name+" "+p.en+" "+(p.objects||[]).map(o=>o.name).join(" ")).toLowerCase().includes(q));by("regions").innerHTML=showOnlyObjects?
 (filtered.length?'<div class="property-visibility-all"><button type="button" class="visibility-action visibility-eye visibility-eye-all" id="visibility-all" title="Показать или скрыть все объекты" aria-label="Показать или скрыть все объекты">'+visibilityEyeIcon(areas.every(a=>(a.objects||[]).every(projectVisible)))+'</button></div>'+filtered.flatMap(p=>(p.objects||[]).map((o,i)=>'<div class="property-visibility-row"><button class="region property-listing" data-area="'+escape(p.id)+'" data-object-index="'+i+'"><div><span>'+escape(o.name)+'</span><small>'+escape(p.name)+(o.type?' · '+escape(o.type):'')+'</small></div><i>›</i></button><button type="button" class="visibility-action visibility-eye" data-visibility-id="'+escape(o.id)+'" aria-pressed="'+projectVisible(o)+'" aria-label="'+(projectVisible(o)?'Скрыть':'Показать')+' булавку '+escape(o.name)+'">'+visibilityEyeIcon(projectVisible(o))+'</button></div>')).join(""):'<div class="placeholder">Пока нет объектов. Добавим сюда только ваши проекты из PDF-презентаций.</div>'):
 filtered.map(p=>'<button class="region '+(selected===p.id?'active':'')+'" data-area="'+escape(p.id)+'"><div><span>'+escape(p.name)+'</span><small>'+escape(p.en)+' · '+(p.objects||[]).length+' объектов</small></div><i>›</i></button>').join("");const gameLabelsOnRight=new Set(["nai-thon","surin","patong","kata","rawai","chalong","phuket-town"]);const pins=[];for(const p of areas){
 const pos=xy(p);
 pins.push('<button class="pin game-region-pin '+(gameLabelsOnRight.has(p.id)?'label-right':'label-left')+' '+(selected===p.id?'active':'')+'" data-area="'+escape(p.id)+'" style="left:'+(pos.x/W*100)+'%;top:'+(pos.y/H*100)+'%"><span class="dot"></span><label>'+escape(p.en)+'</label></button>');
 (p.objects||[]).forEach((o,index)=>{
  const op=xy(p);op.x+=23+(index%3)*15;op.y+=15+Math.floor(index/3)*20;
  pins.push('<button class="pin project game-property-flag" type="button" aria-label="Открыть '+escape(o.name)+'" data-project-id="'+escape(o.id)+'" data-area="'+escape(p.id)+'" style="left:'+(op.x/W*100)+'%;top:'+(op.y/H*100)+'%"><span class="game-flag-icon" aria-hidden="true">📍</span></button>');
 });
 }by("pins").innerHTML=pins.join("");by("visibility-all")?.addEventListener("click",()=>{const ids=areas.flatMap(p=>(p.objects||[]).map(o=>o.id));const allVisible=ids.every(id=>!hiddenProjects.has(id));setProjectVisibility(ids,!allVisible);});
 document.querySelectorAll("[data-visibility-id]").forEach(btn=>btn.onclick=()=>setProjectVisibility([btn.dataset.visibilityId],hiddenProjects.has(btn.dataset.visibilityId)));
 document.querySelectorAll(".game-property-flag").forEach(el=>el.onclick=()=>{const p=areas.find(x=>x.id===el.dataset.area);const o=(p?.objects||[]).find(x=>x.id===el.dataset.projectId);if(p&&o){setDrawer(false);selected=p.id;show(p)}});
 document.querySelectorAll("[data-area]:not(.game-property-flag)").forEach(el=>el.onclick=()=>{const p=areas.find(x=>x.id===el.dataset.area);if(showOnlyObjects&&p){const o=(p.objects||[])[Number(el.dataset.objectIndex)];if(o){focusProperty(p,o);return;}}go(el.dataset.area)});by("numareas").textContent=areas.length;by("numprojects").textContent=projectCount();syncGameLayers()}const gameDistrictFacts={"mai-khao":["Пляж Май Кхао, национальный парк Сиринат, наблюдение за самолётами у аэропорта.","Очень длинный, сравнительно малолюдный берег; бывают сильные волны и опасные течения.","Для спокойного отдыха, уединённых резортов и жизни вдали от ночных развлечений."],"naithon":["Пляж Найтон, зелёные холмы, соседние бухты Най Янг и Банана-Бич.","Небольшой пляж с более камерной атмосферой; море сильно зависит от сезона.","Для размеренного отпуска и тихого проживания, особенно с собственным транспортом."],"bang-tao":["Комплекс Laguna Phuket, Boat Avenue, Porto de Phuket, пляж Банг Тао.","Протяжённый пляж и развитая курортная инфраструктура, beach clubs и рестораны.","Для семей, длительного проживания, комфортного отдыха и любителей развитых сервисов."],"surin":["Пляж Сурин, смотровые площадки на прибрежных холмах, соседняя бухта Панси.","Живописный пляж с прозрачной водой в спокойный сезон; в муссон возможен сильный прибой.","Для ценителей красивых пляжей, бутик-отелей и спокойного отдыха."],"kamala":["Пляж Камала, тематический парк Phuket FantaSea, район Millionaire’s Mile.","Бухта со сравнительно спокойной атмосферой; условия купания зависят от сезона.","Для семей, отдыха без суеты Патонга и длительного проживания."],"patong":["Улица Bangla Road, торговый центр Jungceylon, ночные рынки.","Оживлённый пляж с водными развлечениями и высокой туристической активностью.","Для любителей ночной жизни, шопинга и насыщенного краткосрочного отпуска."],"karon":["Пляж Карон, храм Wat Suwan Khirikhet и местный рынок.","Широкая песчаная береговая линия; встречаются опасные течения, особенно в сезон муссонов.","Для пляжного отпуска, пар и семей, предпочитающих умеренно активную курортную среду."],"kata":["Пляж Ката, смотровая площадка Karon Viewpoint, соседний Ката Ной.","Уютная бухта; популярна для купания в спокойный сезон и сёрфинга при волнах.","Для семей, пар, начинающих сёрферов и отдыха рядом с кафе и ресторанами."],"nai-harn":["Пляж Най Харн, озеро Най Харн, мыс Промтеп, смотровая площадка Windmill.","Песчаная бухта с зелёными холмами; в муссон необходима осторожность при купании.","Для размеренного отдыха, любителей природы и долгосрочного проживания на юге."],"rawai":["Набережная Раваи, рынок морепродуктов, пирс для лодок к соседним островам.","Берег преимущественно используется лодками; для пляжного купания обычно выбирают соседние бухты.","Для длительной жизни, любителей морских прогулок и местной гастрономии."],"chalong":["Храм Ват Чалонг, пирс Чалонг, близость Большого Будды.","Бухта преимущественно портовая, а не классический купальный пляж.","Для постоянного проживания, яхтинга, дайвинга и удобных поездок по югу острова."],"phuket-town":["Старый город с сино-португальской архитектурой, воскресный рынок Lard Yai, музеи и кафе.","Город расположен не на пляже; к морю нужно ехать.","Для городской жизни, работы, знакомства с культурой и местной кухней."]};
const gameDistrictPhotos={"mai-khao":[["Mai Khao.jpg","Пляж Май Кхао","Протяжённый берег на севере острова.","Xatab86","CC BY-SA 4.0"],["Mai-Khao-Beach Phuket Warning-flag-01.jpg","Безопасность на пляже","Предупреждающие флаги напоминают о сильных сезонных течениях.","CEphoto, Uwe Aranas","CC BY-SA 4.0"]],"naithon":[["Nai Yang Beach, Phuket (4448497354).jpg","Пляж Най Янг рядом с Найтоном","Соседний берег национального парка Сиринат; это не пляж Найтон.","Andy Mitchell","CC BY-SA 2.0"]],"bang-tao":[["Bang Tao Beach (53667853591).jpg","Пляж Банг Тао","Длинная песчаная полоса рядом с курортной зоной Laguna.","Raita Futo","CC BY 2.0"],["Sunset at Bang Tao beach - 02.jpg","Закат на Банг Тао","Западное побережье известно красивыми вечерними видами.","Anton Zelenov","CC BY-SA 4.0"]],"surin":[["Surin Beach.JPG","Пляж Сурин","Живописная бухта с песчаным берегом.","Jpatokal","CC BY-SA 4.0"]],"kamala":[["Kamala beach.jpg","Пляж Камала","Спокойная бухта в окружении зелёных склонов.","govertvissers","CC BY-SA 3.0"],["Phuket FantaSea 2023.jpg","Phuket FantaSea","Известный развлекательный комплекс в Камале.","Kaylorensen","CC BY-SA 4.0"]],"patong":[["Long-tail boats on Patong Beach Phuket.jpg","Пляж Патонг","Лодки у оживлённого туристического побережья.","Arnaud-Victor Monteux","CC BY-SA 4.0"],["Bars at Bangla Road, Patong, Thailand.jpg","Бангла-роуд","Центр ночной жизни Патонга.","Ben Reeves","CC BY 2.0"]],"karon":[["Karon Beach,Phuket (5).jpg","Пляж Карон","Широкий пляж для прогулок и морского отдыха.","กสิณธร ราชโอรส","CC BY-SA 4.0"],["Sunset at Karon Beach, Phuket, Thailand.jpg","Закат на Кароне","Вечерний вид на западное побережье.","Pather alexiy","CC BY-SA 3.0"]],"kata":[["Kata Beach1.jpg","Пляж Ката","Песчаная бухта с курортной инфраструктурой.","Radek Kucharski","CC BY 2.0"],["Karon View Point 05.jpg","Karon Viewpoint","Смотровая площадка с видами на бухты района Ката и Карон.","ADwarf","Public domain"]],"nai-harn":[["Nai harn beach phuket (58).jpg","Пляж Най Харн","Бухта на юге острова среди зелёных холмов.","Wolfgang Holzem","CC BY-SA 4.0"],["Panorama from Windmill Viewpoint.jpg","Windmill Viewpoint","Панорама южных пляжей и побережья.","Christophe95","CC BY-SA 4.0"]],"rawai":[["Rawai Beach,Phuket (6).jpg","Набережная Раваи","Прибрежная полоса с лодками и местной жизнью.","กสิณธร ราชโอรส","CC BY-SA 4.0"],["Promthep Cape - panoramio.jpg","Мыс Промтеп","Популярная смотровая площадка на южной оконечности острова.","Mikhail Deynekin","CC BY-SA 3.0"]],"chalong":[["Chaithararam Temple - Wat Chalong (53667853776).jpg","Храм Ват Чалонг","Один из наиболее известных буддийских храмовых комплексов Пхукета.","Raita Futo","CC BY 2.0"],["Phuket Chalong Pier 01.jpg","Пирс Чалонг","Точка отправления морских экскурсий и дайвинг-поездок.","JULIANISME","CC BY-SA 4.0"]],"phuket-town":[["Phuket old town (52549766215).jpg","Старый город Пхукета","Исторические улицы с сино-португальской архитектурой.","Mussi Katz","CC0"],["Buildings on Soi Rommani.jpg","Улица Сой Роммани","Красочные здания старого города.","Christophe95","CC BY-SA 4.0"]]};
const gameDistrictPlaces={"mai-khao":[["Пляж Май Кхао","Mai Khao.jpg","Самый протяжённый пляж северного Пхукета; здесь сохраняется ощущение простора."],["Национальный парк Сиринат","Sirinat National Park.jpg","Охраняемая прибрежная территория с природными ландшафтами."],["Самолёты у аэропорта","Mai-Khao-Beach Phuket Warning-flag-01.jpg","Наблюдение за самолётами популярно возле северной части пляжа; снимок иллюстрирует пляж, а не самолёты."]],"naithon":[["Пляж Найтон",null,"Тихая бухта западного побережья, особенно привлекательная в сухой сезон."],["Банана-Бич",null,"Небольшой укромный пляж севернее Найтонa."],["Национальный парк Сиринат","Sirinat National Park.jpg","Природные побережья рядом с районом; национальный парк охватывает несколько пляжей."]],"bang-tao":[["Laguna Phuket","Angsana Laguna Phuket.jpg","Большая курортная зона с отелями, лагунами и сервисами для отдыха."],["Boat Avenue",null,"Торгово-ресторанная улица с магазинами и кафе; популярна у резидентов."],["Porto de Phuket",null,"Открытый торговый комплекс с ресторанами и магазинами."],["Пляж Банг Тао","Bang Tao Beach (53667853591).jpg","Протяжённый песчаный пляж западного побережья."]],"surin":[["Пляж Сурин","Surin Beach.JPG","Живописный песчаный пляж, подходящий для отдыха в сезон спокойного моря."],["Бухта Панси",null,"Небольшая живописная бухта возле Сурина."]],"kamala":[["Пляж Камала","Kamala beach.jpg","Просторная бухта с прогулками, кафе и курортной атмосферой."],["Phuket FantaSea","Phuket FantaSea 2023.jpg","Тематический развлекательный комплекс с вечерними представлениями."],["Millionaire’s Mile",null,"Прибрежный участок с престижными виллами и панорамными видами."]],"patong":[["Пляж Патонг","Long-tail boats on Patong Beach Phuket.jpg","Оживлённое побережье с туристической инфраструктурой."],["Bangla Road","Bars at Bangla Road, Patong, Thailand.jpg","Улица баров и ночных развлечений."],["Jungceylon",null,"Крупный торговый центр в Патонге."]],"karon":[["Пляж Карон","Karon Beach,Phuket (5).jpg","Широкая песчаная береговая линия."],["Wat Suwan Khirikhet",null,"Буддийский храм в районе Карон."],["Рынок Карона",null,"Местный рынок возле храмовой территории."]],"kata":[["Пляж Ката","Kata Beach1.jpg","Живописная бухта с ресторанами и водными видами спорта."],["Karon Viewpoint","Karon View Point 05.jpg","Популярная точка с панорамой трёх бухт."],["Пляж Ката Ной",null,"Меньшая соседняя бухта к югу от Каты."]],"nai-harn":[["Пляж Най Харн","Nai harn beach phuket (58).jpg","Зелёная бухта в южной части острова."],["Windmill Viewpoint","Panorama from Windmill Viewpoint.jpg","Смотровая площадка с видом на море."],["Мыс Промтеп","Promthep Cape - panoramio.jpg","Известная панорамная точка на юге Пхукета."],["Озеро Най Харн",null,"Озеро рядом с пляжем и прогулочными маршрутами."]],"rawai":[["Набережная Раваи","Rawai Beach,Phuket (6).jpg","Пляж с традиционными лодками и ресторанами морепродуктов."],["Рынок морепродуктов",null,"Здесь можно приобрести свежие морепродукты и заказать приготовление."],["Мыс Промтеп","Promthep Cape - panoramio.jpg","Знаменитая южная смотровая площадка."]],"chalong":[["Храм Ват Чалонг","Chaithararam Temple - Wat Chalong (53667853776).jpg","Один из наиболее посещаемых храмов острова."],["Пирс Чалонг","Phuket Chalong Pier 01.jpg","Отсюда отправляются экскурсионные и дайвинг-катера."],["Большой Будда",null,"Монумент на вершине холма неподалёку; статус доступа нужно уточнять перед посещением."]],"phuket-town":[["Старый город","Phuket old town (52549766215).jpg","Кварталы исторической сино-португальской архитектуры."],["Сой Роммани","Buildings on Soi Rommani.jpg","Улица с яркими восстановленными фасадами."],["Воскресный рынок Lard Yai",null,"Уличный рынок с местной едой и ремесленными изделиями."]]};
const verifiedExternalPhotos={
 "bang-tao":{
  "Laguna Phuket":["https://www.angsana.com/assets/2023-07/AngsanaLaguna-phuket-overview-blue-pool%20%28Large%29_0.jpg","https://www.angsana.com/thailand/laguna-phuket/gallery"],
  "Boat Avenue":["https://cdn.sanity.io/images/nxpteyfv/goguides/6bee048d0d53ffab4ed0c7d8405e18057153a293-5000x3333.jpg?auto=format&fit=max&w=1200","https://es.hoteles.com/go/thailand/boat-avenue-phuket"],
  "Porto de Phuket":["https://www.chillpainai.com/src/wewakeup/scoop/images/a229095cecde7036a8e6e4f1c720cc37217e303b.jpg","https://chillpainai.com/scoop/11181"]
 }
};
let gameDistrictReady=null;
function showGameDistrict(p){
 const facts=gameDistrictFacts[p.id]||["Достопримечательности района уточняются.","Особенности пляжа уточняются.","Подходит для знакомства с местной инфраструктурой."];
 by("detail").innerHTML='<div class="hero"><div><div class="tag">PHUKET · РАЙОН</div><h2>'+escape(p.name)+'</h2><small>'+escape(p.en)+'</small></div></div>'+
 '<div class="detail game-district-guide"><h3>Достопримечательности и интересные места</h3>'+
 '<div class="district-photo-gallery">'+(gameDistrictPlaces[p.id]||[]).map(([title,file,comment])=>{
 const verified=verifiedExternalPhotos[p.id]?.[title];
 const source=verified?.[1]||(file?"https://commons.wikimedia.org/wiki/File:"+encodeURIComponent(file):"");
 const photo=verified?.[0]||(file?"https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent(file)+"?width=900":"");
 return '<figure class="district-photo">'+(photo?'<img loading="lazy" decoding="async" src="'+escape(photo)+'" alt="'+escape(title)+'" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="district-photo-fallback" hidden>Фотография недоступна</div>':'<div class="district-photo-fallback" data-photo-search="'+escape(title)+' '+escape(p.en)+' Phuket">Ищем фотографию места…</div>')+
 '<figcaption><strong>'+escape(title)+'</strong><span>'+escape(comment)+'</span>'+(source?'<small><a href="'+escape(source)+'" target="_blank" rel="noopener">Источник фото и лицензия</a></small>':'')+'</figcaption></figure>';
 }).join("")+'</div>'+
 '<h3>Особенности пляжа</h3><p>'+escape(facts[1])+'</p><h3>Кому подходит</h3><p>'+escape(facts[2])+'</p></div>';
 by("sheet").classList.add("open");by("sheet").setAttribute("aria-hidden","false");by("overlay").hidden=false;document.body.classList.add("game-guide-open");
 // Commons image search only displays actual photograph results, never a fabricated rendering.
 by("detail").querySelectorAll("[data-photo-search]").forEach(async placeholder=>{
  const query=placeholder.dataset.photoSearch;
  try{
   const api="https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch="+encodeURIComponent('filetype:bitmap '+query)+"&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json&origin=*";
   const response=await fetch(api);
   if(!response.ok)throw Error("search failed");
   const data=await response.json();
   const pages=Object.values(data.query?.pages||{}).filter(v=>v.imageinfo?.[0]?.thumburl);
   const place=query.toLowerCase().split(" phuket")[0];
   const keywords=place.split(/\s+/).filter(w=>w.length>3);
   const match=pages.find(v=>keywords.some(k=>v.title.toLowerCase().includes(k)));
   if(!match){placeholder.textContent="Фото этого места пока не найдено";return;}
   const img=document.createElement("img");img.loading="lazy";img.alt=place;img.src=match.imageinfo[0].thumburl;
   img.onerror=()=>{img.remove();placeholder.textContent="Фотография недоступна";placeholder.hidden=false};
   placeholder.replaceWith(img);
   const small=document.createElement("small"),link=document.createElement("a");
   link.href=match.imageinfo[0].descriptionurl;link.target="_blank";link.rel="noopener";link.textContent="Источник фото и лицензия";
   small.appendChild(link);img.closest("figure").querySelector("figcaption").appendChild(small);
  }catch(e){placeholder.textContent="Фото этого места пока недоступно";}
 });

}
function go(id){const p=areas.find(x=>x.id===id);if(!p)return;
 if(!geoEnabled&&!showOnlyObjects&&(gameDistrictReady===id||selected===id)){setDrawer(false);gameDistrictReady=id;showGameDistrict(p);return;}
 if(showOnlyObjects){setDrawer(false);selected=id;show(p);return;}
 setDrawer(false);selected=id;
 if(!geoEnabled)gameDistrictReady=id;
 by("sheet").classList.remove("open");by("overlay").hidden=true;by("sheet").setAttribute("aria-hidden","true");render();shift(p)
}function objectHTML(o){
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
 by("detail").innerHTML='<div class="hero"><div><div class="tag">PHUKET · '+escape(p.region)+'</div><h2>'+escape(p.name)+'</h2><small>'+escape(p.en)+'</small></div>'+(list.length?'<button type="button" class="region-eye-toggle" aria-label="Показать или скрыть объекты района" aria-pressed="'+list.every(projectVisible)+'"><span class="eye-symbol" aria-hidden="true">'+visibilityEyeIcon(list.every(projectVisible))+'</span></button>':'')+'</div><div class="detail"><p>'+escape(p.summary)+'</p><h3>Мои объекты · '+list.length+'</h3>'+
 (list.length?list.map(objectHTML).join(""):'<div class="placeholder">В этом районе пока нет добавленных объектов.</div>')+
 '</div>';
 by("sheet").classList.add("open");by("sheet").setAttribute("aria-hidden","false");by("overlay").hidden=false;
 const regionEye=by("detail").querySelector(".region-eye-toggle");
 if(regionEye)regionEye.onclick=()=>{
  const visible=list.every(projectVisible);
  setProjectVisibility(list.map(o=>o.id),!visible);
  regionEye.setAttribute("aria-pressed",String(!visible));
  regionEye.querySelector(".eye-symbol").innerHTML=visibilityEyeIcon(!visible);
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
function close(){document.body.classList.remove("game-guide-open");gameDistrictReady=null;selected=null;by("sheet").classList.remove("open");by("sheet").setAttribute("aria-hidden","true");by("overlay").hidden=true;scale=1;panX=0;panY=0;applyView(true);render()}const drawer=by("district-drawer"),drawerToggle=by("district-toggle");
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
 const drawerTag=by("district-drawer").querySelector(".tag");
 drawerTag.hidden=true;
 by("district-drawer").querySelector("h1").textContent=onlyObjects?"Мои объекты":"Районы";
 by("district-drawer").querySelector(".drawer-description").hidden=onlyObjects;
 by("search").placeholder=onlyObjects?"Поиск моего объекта…":"Поиск района…";
 render();
 refreshGeoMarkers();
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
 if(e.target.closest(".buttons, button:not(.pin), a, input"))return;
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
 if(e.target.closest(".buttons, button:not(.pin), a, input"))return;
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
 if(e.target.closest(".buttons, button:not(.pin), a, input")||!touchPrev)return;
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
const gameGeoButton=by("game-location-toggle");
const gameGeoDot=by("game-my-location");
let gameGeoWatch=null,gameGeoEnabled=false;
function stopGameGeolocation(){
 gameGeoEnabled=false;
 if(gameGeoWatch!==null&&navigator.geolocation){navigator.geolocation.clearWatch(gameGeoWatch);gameGeoWatch=null;}
 gameGeoDot.classList.remove("is-visible");
 gameGeoButton.setAttribute("aria-pressed","false");
 gameGeoButton.setAttribute("aria-label","Показать моё местоположение на игровой карте");
}
gameGeoButton.onclick=()=>{
 if(gameGeoEnabled){stopGameGeolocation();return;}
 if(!navigator.geolocation||!window.isSecureContext)return;
 // A location marker is drawn only for coordinates inside the illustrated Phuket area.
 // Outside that area there is no map movement, pin, warning or visible effect.
 gameGeoWatch=navigator.geolocation.watchPosition(position=>{
  if(!gameGeoEnabled)return;
  const {latitude:lat,longitude:lon}=position.coords;
  if(!(lat>=bounds.south&&lat<=bounds.north&&lon>=bounds.west&&lon<=bounds.east)){
   gameGeoDot.classList.remove("is-visible");return;
  }
  const p=xy({lat,lon});
  gameGeoDot.style.left=(p.x/W*100)+"%";
  gameGeoDot.style.top=(p.y/H*100)+"%";
  gameGeoDot.classList.add("is-visible");
 },()=>{stopGameGeolocation();},{enableHighAccuracy:true,maximumAge:30000,timeout:20000});
 gameGeoEnabled=true;
 gameGeoButton.setAttribute("aria-pressed","true");
 gameGeoButton.setAttribute("aria-label","Скрыть моё местоположение на игровой карте");
};
const geoLocationButton=by("geo-location-toggle");
let myLocationWatch=null,myLocationMarker=null,myAccuracyCircle=null,myLocationEnabled=false;
function stopMyLocation(){
 myLocationEnabled=false;
 if(myLocationWatch!==null&&navigator.geolocation){navigator.geolocation.clearWatch(myLocationWatch);myLocationWatch=null;}
 if(geoMap&&myLocationMarker)geoMap.removeLayer(myLocationMarker);
 if(geoMap&&myAccuracyCircle)geoMap.removeLayer(myAccuracyCircle);
 myLocationMarker=null;myAccuracyCircle=null;
 geoLocationButton.setAttribute("aria-pressed","false");
 geoLocationButton.setAttribute("aria-label","Показать мою геопозицию");
 geoLocationButton.title="Моя геопозиция";
}
function locationErrorMessage(error){
 if(error?.code===1)return "Доступ к местоположению отклонён именно для этого сайта или встроенного браузера. Открой Phuket Atlas непосредственно в Safari, затем нажми «аА» / меню страницы → Настройки веб-сайта → Геопозиция → Разрешить. Также проверь Настройки iPhone → Конфиденциальность → Службы геолокации → Safari.";
 if(error?.code===2)return "iPhone пока не определяет координаты. Проверь службы геолокации, точную геопозицию, подключение и повтори попытку.";
 return "Определение координат заняло слишком много времени. Попробуй ещё раз под открытым небом или при лучшем сигнале.";
}
function showLocationMessage(message){
 let panel=by("atlas-location-message");
 if(!panel){
  panel=document.createElement("div");
  panel.id="atlas-location-message";
  panel.setAttribute("role","alert");
  panel.innerHTML='<button type="button" aria-label="Закрыть сообщение" class="atlas-location-message-close">×</button><p></p>';
  by("scene").appendChild(panel);
  panel.querySelector("button").onclick=()=>panel.remove();
 }
 panel.querySelector("p").textContent=message;
}
geoLocationButton.onclick=()=>{
 if(myLocationEnabled){stopMyLocation();by("atlas-location-message")?.remove();return;}
 if(!navigator.geolocation||!window.isSecureContext){showLocationMessage("Этот браузер не предоставляет доступ к GPS. Открой сайт напрямую в Safari через HTTPS.");return;}
 myLocationEnabled=true;
 geoLocationButton.setAttribute("aria-pressed","true");
 geoLocationButton.setAttribute("aria-label","Скрыть мою геопозицию");
 geoLocationButton.title="Скрыть геопозицию";
 by("atlas-location-message")?.remove();
 let first=true;
 let completed=false;
 myLocationWatch=navigator.geolocation.watchPosition(position=>{
  if(!myLocationEnabled||!geoMap)return;
  completed=true;
  by("atlas-location-message")?.remove();
  const ll=[position.coords.latitude,position.coords.longitude];
  if(!myLocationMarker){
   myLocationMarker=L.marker(ll,{icon:L.divIcon({className:"atlas-my-location",html:'<span class="atlas-my-location-dot"></span>',iconSize:[23,23],iconAnchor:[11,11]}),zIndexOffset:1200,interactive:false}).addTo(geoMap);
   myAccuracyCircle=L.circle(ll,{radius:position.coords.accuracy,color:"#3194ff",weight:1,fillColor:"#3194ff",fillOpacity:.10,interactive:false}).addTo(geoMap);
  }else{myLocationMarker.setLatLng(ll);myAccuracyCircle.setLatLng(ll).setRadius(position.coords.accuracy);}
  if(first){first=false;geoMap.flyTo(ll,Math.max(geoMap.getZoom(),14),{duration:1.1});}
 },error=>{
  if(!myLocationEnabled)return;
  stopMyLocation();
  showLocationMessage(locationErrorMessage(error));
 },{enableHighAccuracy:true,maximumAge:30000,timeout:25000});
};
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
    tileSize:512,zoomOffset:-1,maxZoom:20,keepBuffer:8,updateWhenIdle:true,
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
  if(gameInfoOn){const marker=L.marker([p.lat,p.lon],{icon:L.divIcon({
   className:"atlas-region-point",
   html:'<span class="atlas-region-point-core"></span>',
   iconSize:[17,17],iconAnchor:[8.5,8.5],popupAnchor:[0,-10]
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
  geoMarkers.push(marker);}
  // Satellite: map projects to the actual GPS coordinates, never an offset district location.
  (p.objects||[]).filter(projectVisible).forEach(o=>{
   const hasGPS=Number.isFinite(o.lat)&&Number.isFinite(o.lon);
   const lat=hasGPS?o.lat:p.lat,lon=hasGPS?o.lon:p.lon;
   const m=L.marker([lat,lon],{icon:L.divIcon({
    className:"atlas-satellite-project-pin",
    html:'<span class="atlas-satellite-pushpin" aria-hidden="true">📍</span>',
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
 const rightSide=new Set(["nai-thon","surin","patong","kata","rawai","chalong","phuket-town"]);
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
  item.marker.bindTooltip(item.id.startsWith("object:") && /intercontinental/i.test(item.name) ? "InterContinental" : item.name,{
   permanent:true,direction,offset:[direction==="right"?12:-12,0],
   className:"phuket-map-label"
  });
  item.marker.openTooltip();
 }
 const button=by("labels-toggle");
 if(button){button.setAttribute("aria-pressed",String(labelsVisible));button.textContent="ⓘ";button.setAttribute("aria-label",labelsVisible?"Скрыть информацию":"Показать информацию");}
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
 syncGameLayers();
 if(!on)focusedLabel=null;
 refreshGeoMarkers();
 updateMapLabels();
 const btn=by("art-info-toggle");
 btn.textContent="ⓘ";btn.setAttribute("aria-label",on?"Скрыть информацию":"Показать информацию");
 btn.setAttribute("aria-pressed",String(on));
}
by("art-info-toggle").onclick=()=>setGameInformation(!gameInfoOn);
setGameInformation(true);
const oldZoomIn=by("zin").onclick,oldZoomOut=by("zout").onclick,oldReset=by("reset").onclick;
by("zin").onclick=()=>geoEnabled?geoMap.zoomIn():oldZoomIn();
by("zout").onclick=()=>geoEnabled?geoMap.zoomOut():oldZoomOut();
by("reset").onclick=()=>{if(geoEnabled){readyDistrictId=null;selected=null;focusedLabel=null;updateMapLabels();(computeOverviewZoom(),geoMap.flyTo([7.94,98.34],gameZoomToSatellite(1),{duration:1.1}))}else oldReset()};
fetch("data/locations.json?v=intercontinental-gps-67").then(r=>{if(!r.ok)throw Error("Не удалось загрузить каталог");return r.json()}).then(d=>{areas=d;render();refreshGeoMarkers()}).catch(e=>by("regions").textContent=e.message)})();