import express from "express";
import cors from "cors";
import crypto from "node:crypto";

const app = express();
app.use(cors({ origin: (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean) }));
app.use(express.json({ limit: "32kb" }));

const PORT = process.env.PORT || 8080;
const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const CATEGORIES = new Set(["SAFAR", "PATHSHALA", "TRAVEL_EXPLORATION", "COMMUNITY"]);
const secret = () => process.env.INVITE_SIGNING_SECRET || "";
const b64 = value => Buffer.from(value).toString("base64url");
const safeEqual = (a,b) => {
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length===y.length && crypto.timingSafeEqual(x,y);
};

function sign(payload) {
  const body=b64(JSON.stringify(payload));
  const sig=crypto.createHmac("sha256",secret()).update(body).digest("base64url");
  return body+"."+sig;
}
function readInvite(token) {
  if(!secret() || !token) throw new Error("Invitation is missing or unavailable.");
  const [body,sig]=token.split(".");
  const expected=crypto.createHmac("sha256",secret()).update(body||"").digest("base64url");
  if(!body || !sig || !safeEqual(sig,expected)) throw new Error("Invalid invitation link.");
  const data=JSON.parse(Buffer.from(body,"base64url").toString("utf8"));
  if(!data.exp || data.exp<Date.now()) throw new Error("This invitation has expired. Contact RuMLeEx.");
  if(!CATEGORIES.has(data.category)) throw new Error("Invalid submission category.");
  return data;
}

let cachedAccessToken=null, tokenExpiresAt=0;
async function accessToken(){
  if(cachedAccessToken && Date.now()<tokenExpiresAt-60000) return cachedAccessToken;
  const form=new URLSearchParams({
    client_id:process.env.GOOGLE_CLIENT_ID,
    client_secret:process.env.GOOGLE_CLIENT_SECRET,
    refresh_token:process.env.GOOGLE_REFRESH_TOKEN,
    grant_type:"refresh_token"
  });
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form});
  const data=await r.json();
  if(!r.ok) throw new Error("Google Drive authorization failed: "+(data.error_description||data.error||r.status));
  cachedAccessToken=data.access_token; tokenExpiresAt=Date.now()+(data.expires_in||3600)*1000;
  return cachedAccessToken;
}
async function drive(path, options={}) {
  const token=await accessToken();
  const r=await fetch("https://www.googleapis.com/drive/v3"+path,{...options,headers:{Authorization:"Bearer "+token,...options.headers}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error?.message||"Google Drive request failed ("+r.status+").");
  return data;
}
const esc = s => String(s).replace(/\\/g,"\\\\").replace(/'/g,"\\'");

async function ensureFolder(name,parentId){
  const q="name = '"+esc(name)+"' and mimeType = 'application/vnd.google-apps.folder' and '"+parentId+"' in parents and trashed = false";
  const found=await drive("/files?q="+encodeURIComponent(q)+"&fields=files(id,name)&pageSize=10");
  if(found.files?.length) return found.files[0].id;
  const created=await drive("/files?fields=id,name",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,mimeType:"application/vnd.google-apps.folder",parents:[parentId]})});
  return created.id;
}

app.get("/health",(req,res)=>res.json({ok:true,service:"rumleex-media-upload"}));
app.get("/api/validate",(req,res)=>{
  try{
    const invite=readInvite(req.query.invite);
    res.json({ok:true,guest:invite.guest,category:invite.category,expiresAt:invite.exp});
  }catch(e){res.status(401).json({error:e.message});}
});

// Admin-only endpoint: create an invite URL. Keep the admin key private.
app.post("/api/admin/invite",(req,res)=>{
  if(!process.env.ADMIN_KEY || !safeEqual(req.get("x-admin-key")||"",process.env.ADMIN_KEY)) return res.status(401).json({error:"Not authorised."});
  const guest=String(req.body.guest||"").trim().slice(0,100);
  const category=String(req.body.category||"");
  const days=Math.min(Math.max(Number(req.body.days)||14,1),30);
  if(!guest || !CATEGORIES.has(category)) return res.status(400).json({error:"Guest name and valid category are required."});
  const token=sign({id:crypto.randomUUID(),guest,category,exp:Date.now()+days*86400000});
  const site=(process.env.SITE_URL||"https://rumleex.github.io/RuMLeEx-Website").replace(/\/$/,"");
  res.json({inviteUrl:site+"/media-submission/?invite="+encodeURIComponent(token),expiresInDays:days});
});

app.post("/api/upload-session",async(req,res)=>{
  try{
    const invite=readInvite(req.body.invite);
    const fileName=String(req.body.fileName||"").replace(/[\\/]/g,"_").slice(0,180);
    const mimeType=String(req.body.mimeType||"");
    const size=Number(req.body.size);
    const contributor=String(req.body.contributor||invite.guest).trim().slice(0,100);
    if(!fileName || !Number.isFinite(size) || size<1 || size>MAX_BYTES) return res.status(400).json({error:"File must be between 1 byte and 2 GB."});
    if(!mimeType.startsWith("video/")) return res.status(400).json({error:"Video files only."});
    const root=process.env.DRIVE_ROOT_FOLDER_ID;
    if(!root) throw new Error("Drive root folder is not configured.");
    const categoryFolder=await ensureFolder(invite.category,root);
    const guestFolder=await ensureFolder(invite.guest,categoryFolder);
    const metadata={name:fileName,mimeType,parents:[guestFolder],description:"RuMLeEx contributor upload. Review before use. Contributor: "+contributor+"; Invite ID: "+invite.id+"; Notes: "+String(req.body.notes||"").slice(0,800)};
    const token=await accessToken();
    const r=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,createdTime",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json; charset=UTF-8","X-Upload-Content-Type":mimeType,"X-Upload-Content-Length":String(size)},body:JSON.stringify(metadata)});
    if(!r.ok) throw new Error("Could not create Drive upload session ("+r.status+").");
    const uploadUrl=r.headers.get("location");
    if(!uploadUrl) throw new Error("Google Drive did not return an upload session.");
    res.json({uploadUrl});
  }catch(e){res.status(400).json({error:e.message});}
});

app.listen(PORT,()=>console.log("RuMLeEx upload backend listening on "+PORT));
