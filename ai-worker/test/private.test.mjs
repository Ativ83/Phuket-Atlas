// Authentication and same-origin security regression tests for the private deployment.
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const source=await readFile(new URL("../src/index.js",import.meta.url),"utf8");
const {default:worker}=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
const secret="a-very-long-unique-atlas-password-12345";
const basic="Basic "+Buffer.from("broker:"+secret).toString("base64");
const url="https://private.example.workers.dev/";
const env=()=>({
 ATLAS_GATE_PASSWORD:secret,
 ASSETS:{fetch:async()=>new Response("private asset",{status:200,headers:{"Content-Type":"text/html"}})}
});

test("fails closed when no password configured",async()=>{
 const res=await worker.fetch(new Request(url),{ASSETS:env().ASSETS});
 assert.equal(res.status,503);
 assert.ok(!(await res.text()).includes("private asset"));
});
test("rejects unauthenticated or wrong-password file requests",async()=>{
 const no=await worker.fetch(new Request(url),env());
 assert.equal(no.status,401);
 assert.ok(no.headers.get("www-authenticate")?.includes("Basic"));
 const bad=await worker.fetch(new Request(url,{headers:{Authorization:"Basic "+Buffer.from("broker:wrong").toString("base64")}}),env());
 assert.equal(bad.status,401);
});
test("authorised asset requests work without being cached",async()=>{
 const ok=await worker.fetch(new Request(url,{headers:{Authorization:basic}}),env());
 assert.equal(ok.status,200);
 assert.equal(await ok.text(),"private asset");
 assert.equal(ok.headers.get("cache-control"),"private, no-store");
});
test("AI route rejects missing OpenAI key",async()=>{
 const res=await worker.fetch(new Request(url+"api/chat",{
  method:"POST",headers:{Authorization:basic,Origin:new URL(url).origin,"Content-Type":"application/json"},
  body:JSON.stringify({message:"Найди 2BR"})
 }),env());
 assert.equal(res.status,503);
 assert.ok((await res.json()).error.includes("OpenAI"));
});
test("blocked cross-origin request to AI endpoint",async()=>{
 const res=await worker.fetch(new Request(url+"api/chat",{
  method:"POST",headers:{Authorization:basic,Origin:"https://attacker.example","Content-Type":"application/json"},
  body:JSON.stringify({message:"test"})
 }),{...env(),OPENAI_API_KEY:"fake"});
 assert.equal(res.status,403);
});
