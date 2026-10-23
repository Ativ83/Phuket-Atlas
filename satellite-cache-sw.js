/* Phuket Atlas satellite imagery: persistent cache-first tiles. */
const TILE_CACHE="atlas-satellite-tiles-v2";
const MAX_TILES=650;
self.addEventListener("install",event=>event.waitUntil(self.skipWaiting()));
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("fetch",event=>{
 const u=new URL(event.request.url);
 if(event.request.method!=="GET"||u.hostname!=="api.mapbox.com"||!u.pathname.includes("/styles/v1/mapbox/satellite-v9/tiles/"))return;
 event.respondWith((async()=>{
  const cache=await caches.open(TILE_CACHE);
  const hit=await cache.match(event.request);
  if(hit)return hit;
  const response=await fetch(event.request);
  if(response.ok||response.type==="opaque"){
   const copy=response.clone();
   event.waitUntil((async()=>{
    try{
     await cache.put(event.request,copy);
     const keys=await cache.keys();
     if(keys.length>MAX_TILES){
      for(const key of keys.slice(0,keys.length-MAX_TILES))await cache.delete(key);
     }
    }catch(e){/* Browser storage may be unavailable or full. */}
   })());
  }
  return response;
 })());
});
