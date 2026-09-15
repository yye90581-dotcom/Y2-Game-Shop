const express=require("express");
const path=require("path");
const multer=require("multer");
const fs=require("fs");
const Database=require("better-sqlite3");
const session=require("express-session");
require("dotenv").config();

const app=express();
const PORT=process.env.PORT||3000;
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"CHANGE_ME";
const TELEGRAM_BOT_TOKEN=process.env.TELEGRAM_BOT_TOKEN||"";
const TELEGRAM_CHAT_ID=process.env.TELEGRAM_CHAT_ID||"";
const DATA_DIR=process.env.DATA_DIR||path.join(__dirname,"data");
fs.mkdirSync(DATA_DIR,{recursive:true});
const UPLOAD_DIR=path.join(DATA_DIR,"uploads");
fs.mkdirSync(UPLOAD_DIR,{recursive:true});

const db=new Database(path.join(DATA_DIR,"orders.db"));
db.exec(`CREATE TABLE IF NOT EXISTS orders(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_code TEXT UNIQUE,
 game TEXT NOT NULL,
 package TEXT NOT NULL,
 price INTEGER NOT NULL,
 player_id TEXT NOT NULL,
 server_id TEXT,
 payment_method TEXT NOT NULL,
 receipt TEXT,
 contact TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'Pending',
 created_at TEXT NOT NULL
)`);

const upload=multer({dest:UPLOAD_DIR,limits:{fileSize:5*1024*1024},
 fileFilter:(req,file,cb)=>cb(null,/^image\/(png|jpe?g|webp)$/.test(file.mimetype))
});
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET||"CHANGE_ME_TOO",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax"}}));
app.use(express.static(path.join(__dirname,"public")));

const prices={
"Mobile Legends":[["86 Diamonds",5600],["172 Diamonds",11000],["257 Diamonds",16500],["343 Diamonds",21200],["429 Diamonds",27000],["515 Diamonds",31800],["706 Diamonds",42000],["878 Diamonds",53000],["963 Diamonds",58000],["Weekly Pass",6800]],
"PUBG Mobile":[["60 UC",6300],["328 UC",25000],["660 UC",42000],["1800 UC",101000],["3850 UC",200000],["Elite Lv 1–50",24000],["Elite Lv 1–100",49000]],
"MLBB 2X Diamonds":[["50 + 50",3500],["150 + 150",10600],["250 + 250",17000],["500 + 500",34000]]
};

async function telegramRequest(method, body, isForm=false){
  if(!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return null;
  const url=`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
  const response=await fetch(url,{method:"POST",headers:isForm?undefined:{"content-type":"application/json"},body:isForm?body:JSON.stringify(body)});
  const data=await response.json();
  if(!data.ok) throw new Error(data.description||"Telegram API error");
  return data;
}

async function notifyTelegram(order, receiptPath){
  if(!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const text=[
    "🛒 *New GameTopUpMM Order*",
    `🆔 Order: *${order.order_code}*`,
    `🎮 Game: ${order.game}`,
    `💎 Package: ${order.package}`,
    `💰 Amount: *${Number(order.price).toLocaleString("en-US")} MMK*`,
    `👤 Player ID: ${order.player_id}`,
    order.server_id?`🌐 Server ID: ${order.server_id}`:null,
    `💳 Payment: ${order.payment_method}`,
    `📱 Contact: ${order.contact}`,
    "📌 Status: Pending"
  ].filter(Boolean).join("\n");
  await telegramRequest("sendMessage",{chat_id:TELEGRAM_CHAT_ID,text,parse_mode:"Markdown"});
  if(receiptPath && fs.existsSync(receiptPath)){
    const bytes=fs.readFileSync(receiptPath);
    const form=new FormData();
    form.append("chat_id",TELEGRAM_CHAT_ID);
    form.append("caption",`🧾 Payment Screenshot — ${order.order_code}`);
    form.append("photo",new Blob([bytes]),path.basename(receiptPath));
    await telegramRequest("sendPhoto",form,true);
  }
}

function auth(req,res,next){if(req.session.admin)return next();res.status(401).json({error:"Unauthorized"});}
app.get("/health",(req,res)=>res.json({ok:true,service:"GameTopUpMM"}));
app.get("/api/products",(req,res)=>res.json(prices));

app.post("/api/orders",upload.single("receipt"),(req,res)=>{
 const {game,package:pkg,player_id,server_id,payment_method,contact}=req.body;
 if(!prices[game])return res.status(400).json({error:"Invalid game"});
 const item=prices[game].find(x=>x[0]===pkg);
 if(!item)return res.status(400).json({error:"Invalid package"});
 if(!player_id||!contact||!payment_method)return res.status(400).json({error:"Missing required fields"});
 const code="GT"+Date.now().toString().slice(-8);
 const receipt=req.file?req.file.filename:null;
 const createdAt=new Date().toISOString();
 db.prepare(`INSERT INTO orders(order_code,game,package,price,player_id,server_id,payment_method,receipt,contact,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
 .run(code,game,pkg,item[1],player_id,server_id||"",payment_method,receipt,contact,createdAt);
 const order={order_code:code,game,package:pkg,price:item[1],player_id,server_id:server_id||"",payment_method,receipt,contact,status:"Pending",created_at:createdAt};
 notifyTelegram(order,receipt?path.join(UPLOAD_DIR,receipt):null).catch(err=>console.error("Telegram notification failed:",err.message));
 res.json({ok:true,order_code:code,amount:item[1]});
});

app.post("/api/admin/login",(req,res)=>{
 if(req.body.password!==ADMIN_PASSWORD)return res.status(401).json({error:"Wrong password"});
 req.session.admin=true;res.json({ok:true});
});
app.post("/api/admin/logout",(req,res)=>{req.session.destroy(()=>res.json({ok:true}))});
app.get("/api/admin/orders",auth,(req,res)=>{
 const rows=db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
 res.json(rows);
});
app.patch("/api/admin/orders/:id",auth,(req,res)=>{
 const allowed=["Pending","Paid","Completed","Cancelled"];
 if(!allowed.includes(req.body.status))return res.status(400).json({error:"Invalid status"});
 db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status,req.params.id);
 res.json({ok:true});
});
app.get("/api/admin/receipt/:file",auth,(req,res)=>{
 const file=path.basename(req.params.file);
 const full=path.join(UPLOAD_DIR,file);
 if(!fs.existsSync(full))return res.sendStatus(404);
 res.sendFile(full);
});

app.listen(PORT,()=>console.log(`GameTopUpMM running on http://localhost:${PORT}`));
