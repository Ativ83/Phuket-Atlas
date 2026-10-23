/* Phuket Atlas satellite tile cache: device-only, 12-hour freshness / 30-day limit. */
const TILE_CACHE="atlas-satellite-tiles-v1";
const META_CACHE="atlas-satellite-meta-v1";
const FRESH_MS=12*60*60*1000,MAX_MS=30*24*60*60*1000,MAX_TILES=240;
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=="GET"||url.hostname!=="api.mapbox.com"||!url.pathname.includes("/styles/v1/mapbox/satellite-v9/tiles/"))return;
 event.respondWith((async()=>{
  const cache=await caches.open(TILE_CACHE),meta=await caches.open(META_CACHE);
  const cached=await cache.match(event.request);
  const raw=await meta.match(event.request);
  const stamped=raw?Number(await raw.text()):0,age=Date.now()-stamped;
  if(cached&&stamped&&age>=0&&age<FRESH_MS)return cached;
  try{
   const response=await fetch(event.request);
   if(response.ok||response.type==="opaque"){
    const clone=response.clone();
    event.waitUntil((async()=>{
     await cache.put(event.request,clone);
     await meta.put(event.request,new Response(String(Date.now())));
     const keys=await cache.keys();
     if(keys.length>MAX_TILES){
      const excess=keys.length-MAX_TILES;
      for(const key of keys.slice(0,excess)){await cache.delete(key);await meta.delete(key);}
     }
    })());
   }
   return response;
  }catch(error){
   if(cached&&stamped&&age>=0&&age<MAX_MS)return cached;
   throw error;
  }
 })());
});
