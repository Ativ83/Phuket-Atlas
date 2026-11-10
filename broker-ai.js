/* Phuket Atlas — broker-only assistant UI. Does not contain API secrets. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
const view=$("broker-ai-panel"), trigger=$("broker-ai-open");
if(!view||!trigger)return;
// Public GitHub Pages cannot enforce identity. Keep controls out of normal visitor UI.
// The server independently authenticates every AI request.
const onPublicPages=location.hostname==="ativ83.github.io";
if(onPublicPages&&new URLSearchParams(location.search).get("broker")!=="1")return;
trigger.hidden=false;
const output=$("broker-ai-messages"), form=$("broker-ai-form"), input=$("broker-ai-input");
const setting=$("broker-ai-settings"), endpoint=$("broker-ai-url"), access=$("broker-ai-token"), status=$("broker-ai-status");
const chips=$("broker-ai-suggestions");
let catalog=[],busy=false,conversation=[],lastMatches=[];
const normalize=s=>String(s||"").toLocaleLowerCase("ru").replace(/ё/g,"е");
const fmtPrice=p=>p&&String(p).trim()?String(p)+" млн ฿":"цена уточняется";
const sanitize=o=>({
 id:o.id,name:o.name,district:o.district,type:o.salesSummary?.propertyType||o.type||"",
 description:(o.description||"").slice(0,650),
 handover:o.handoverLabel||o.completion||"не подтверждён",
 handoverYear:o.handoverStatus==="unverified"?null:(o.handoverYear||null),
 ownership:o.salesSummary?.ownership||"не подтверждён",
 units:(o.salesSummary?.units||[]).map(u=>({layout:u.layout,area:u.area||null,priceMillionsTHB:u.price||null})),
 audience:o.salesSummary?.audience||"не указано",
 pricingNote:o.salesSummary?.pricingNote||"",
 source:o.salesSummary?.sourceUrl||o.clientDriveUrl||null
});
async function load(){
 try{
 const res=await fetch("./data/locations.json?v=unit-facts-147",{cache:"no-store"});
 if(!res.ok)throw Error("Каталог недоступен");
 const districts=await res.json();
 catalog=districts.flatMap(d=>(d.objects||[]).map(o=>sanitize({...o,district:d.name})));
 status.textContent="Каталог: "+catalog.length+" объектов · локальный поиск готов";
 }catch(e){status.textContent="Не удалось загрузить каталог: "+e.message;}
}
const add=(text,role="assistant")=>{
 const el=document.createElement("div");el.className="broker-ai-bubble "+(role==="user"?"broker-ai-user":"broker-ai-bot");
 el.textContent=text;output.append(el);output.scrollTop=output.scrollHeight;return el;
};
const extractBudget=q=>{
 const m=q.match(/(?:до|бюджет|максимум)\s*\$?\s*(\d[\d\s.,]*)\s*(млн|million|тыс|тысяч|k|\$|бат|thb|usd)?/i);
 if(!m)return null;
 const num=Number(m[1].replace(/\s/g,"").replace(",","."));if(!Number.isFinite(num))return null;
 const unit=normalize(m[2]||"");
 // USD conversion deliberately disabled: needs live rate and explicit currency.
 if(/\$|usd/.test(q)||/тыс|k/.test(unit))return null;
 return /млн|million/.test(unit)?num:num>1000000?num/1000000:null;
};
const quickMatch=q=>{
 const t=normalize(q),year=t.match(/20(2[6-9]|3\d)/)?.[0];
 const beds=t.match(/([1-5])\s*(?:br|bed|спал|комнат)/)?.[1];
 const budget=extractBudget(t);
 const terms=t.replace(/\b(?:квартира|объект|покажи|найди|подбери|хочу|нужен|нужна|проект|срок|сдачи|семья|семьи|бюджет)\b/g,"").split(/[^a-zа-яё0-9]+/).filter(w=>w.length>=4&&!/^20\d\d$/.test(w));
 const scored=catalog.map(o=>{
  const search=normalize(o.name+" "+o.district+" "+o.description+" "+o.type+" "+o.audience);
  let score=0;
  if(terms.some(w=>normalize(o.name).includes(w)))score+=5;
  for(const w of terms)if(search.includes(w))score+=1;
  if(year&&String(o.handoverYear)!==year)return {o,score:-1};
  if(beds&&!(o.units||[]).some(u=>normalize(u.layout).includes(beds+"br")))return {o,score:-1};
  if(budget!==null){
   const prices=(o.units||[]).map(u=>Number(String(u.priceMillionsTHB||"").replace(",","."))).filter(n=>n>0);
   if(!prices.length||Math.min(...prices)>budget)return {o,score:-1};
   score+=3;
  }
  if(t.includes("сем")&&normalize(o.audience).includes("сем"))score+=2;
  return {o,score};
 });
 scored.sort((a,b)=>b.score-a.score||a.o.name.localeCompare(b.o.name,"ru"));
 return scored.filter(x=>x.score>=0).slice(0,6).map(x=>x.o);
};
function matchesText(matches,q){
 if(!matches.length)return "Среди объектов каталога нет подтверждённых совпадений. Попробуй другой год, бюджет или планировку.";
 return "Нашёл в каталоге "+catalog.length+" объектов. Возможные варианты:\n\n"+matches.map((o,i)=>(i+1)+". "+o.name+" · "+o.district+"\n"+o.type+" · сдача: "+o.handover+"\n"+(o.units.length?o.units.slice(0,3).map(u=>u.layout+" — "+(u.area?u.area+" м²":"площадь уточняется")+", "+fmtPrice(u.priceMillionsTHB)).join("; "):"Площади и цены пока уточняются")).join("\n\n")+"\n\nЭто подбор по данным Atlas, а не подтверждение наличия у застройщика.";
}
function showMatches(matches){
 lastMatches=matches;chips.replaceChildren();
 for(const o of matches.slice(0,4)){
  const b=document.createElement("button");b.type="button";b.className="broker-ai-chip";
  b.textContent="На карте: "+o.name;b.addEventListener("click",()=>{
   view.classList.remove("open");view.setAttribute("aria-hidden","true");
   if(typeof window.phuketAtlasFocusProject==="function")window.phuketAtlasFocusProject(o.id);
  });chips.append(b);
 }
}
async function send(q){
 q=String(q||"").trim().slice(0,1200);if(!q||busy)return;
 add(q,"user");input.value="";busy=true;form.querySelector("button[type=submit]").disabled=true;
 const matches=quickMatch(q);showMatches(matches);
 const base=onPublicPages?endpoint.value.trim().replace(/\/+$/,""):location.origin;
 const token=onPublicPages?access.value.trim():"";
 const previous=conversation.slice(-8);
 conversation.push({role:"user",content:q});
 const reply=add(base?"Запрашиваю AI…":"");
 if(base&&(!onPublicPages||token)){
  try{
   if(!/^https:\/\//.test(base))throw Error("Адрес API должен начинаться с https://");
   const response=await fetch(base+(onPublicPages?"/chat":"/api/chat"),{
    method:"POST",headers:onPublicPages?{"Content-Type":"application/json","Authorization":"Bearer "+token}:{"Content-Type":"application/json"},
    body:JSON.stringify({message:q,history:previous,candidates:matches.map(x=>x.id)}),signal:AbortSignal.timeout(25000)
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||"Ошибка API ("+response.status+")");
   reply.textContent=String(data.answer||"Пустой ответ от AI");
  }catch(e){reply.textContent="AI недоступен: "+e.message+"\n\n"+matchesText(matches,q);}
 }else{
  reply.textContent=matchesText(matches,q)+"\n\nДля диалога с AI потребуется подключить OpenAI API на защищённом сервере.";
 }
 conversation.push({role:"assistant",content:reply.textContent.slice(0,4000)});
 busy=false;form.querySelector("button[type=submit]").disabled=false;
 output.scrollTop=output.scrollHeight;
}
trigger.addEventListener("click",()=>{view.classList.add("open");view.setAttribute("aria-hidden","false");input.focus()});
$("broker-ai-close").addEventListener("click",()=>{view.classList.remove("open");view.setAttribute("aria-hidden","true")});
if(!onPublicPages){$("broker-ai-config").hidden=true;status.textContent="Закрытый Atlas · каталог загружается";}
$("broker-ai-config").addEventListener("click",()=>{setting.hidden=!setting.hidden});
$("broker-ai-reset").addEventListener("click",()=>{conversation=[];output.replaceChildren();chips.replaceChildren();add("Диалог очищен. Данные каталога остаются доступны.")});
form.addEventListener("submit",e=>{e.preventDefault();send(input.value)});
$("broker-ai-quick").addEventListener("click",e=>{
 const b=e.target.closest("button[data-query]");if(b)send(b.dataset.query);
});
load();
})();
