// New Weladapola marketplace - Supabase-backed. No admin role is ever accepted from signup form.
const cfg=window.WELADAPOLA_CONFIG||{};
const supabaseReady=!!(window.supabase&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("PASTE_"));
const sb=supabaseReady?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
let products=[],cart=JSON.parse(localStorage.getItem("weladapola_cart_v2")||"[]"),category="All",session=null,profile=null;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const money=n=>"Rs. "+Number(n||0).toLocaleString("en-US");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function notify(m){const el=$("#toast");el.textContent=m;el.classList.add("show");clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.remove("show"),2800)}
function openModal(html){$("#modalBody").innerHTML=html;$("#modal").classList.add("open")}
function closeModal(){$("#modal").classList.remove("open")}
function refreshCartCount(){$("#cartCount").textContent=cart.reduce((n,i)=>n+i.qty,0)}
function persistCart(){localStorage.setItem("weladapola_cart_v2",JSON.stringify(cart));refreshCartCount()}
async function loadProducts(){
 if(!sb){products=[];renderProducts();$("#productGrid").innerHTML='<div class="empty">Supabase config.js එකේ publishable key එක set කරන්න.</div>';return}
 const {data,error}=await sb.from("products").select("id,name,price,category,image_url,description,seller_id").eq("is_active",true).order("created_at",{ascending:false});
 if(error){notify("Products load error: "+error.message);products=[]}else products=data||[];
 renderProducts()
}
function renderProducts(){
 const q=$("#searchInput").value.trim().toLowerCase();
 const found=products.filter(p=>(category==="All"||p.category===category)&&(`${p.name} ${p.description||""} ${p.category||""}`).toLowerCase().includes(q));
 $("#productGrid").innerHTML=found.map((p,i)=>`<article class="product" style="animation-delay:${Math.min(i*55,400)}ms"><div class="prodImg"><img loading="lazy" src="${esc(p.image_url||"")}" alt="${esc(p.name)}" onerror="this.src='https://placehold.co/600x420/eaf6ed/086b35?text=Weladapola'"><span class="badge">${esc(p.category||"Local")}</span></div><div class="prodBody"><div class="meta">${esc(p.category||"")}</div><h3>${esc(p.name)}</h3><div class="price">${money(p.price)}</div><div class="prodBottom"><button data-add="${esc(p.id)}">🛒 Add to Cart</button></div></div></article>`).join("");
 $("#empty").hidden=found.length>0;
 $$("#productGrid [data-add]").forEach(b=>b.onclick=()=>addCart(b.dataset.add));
}
function addCart(id){const item=cart.find(x=>x.id===id);if(item)item.qty++;else cart.push({id,qty:1});persistCart();notify("Cart එකට එකතු කළා 🛒")}
function cartModal(){
 const lines=cart.map(i=>{const p=products.find(x=>x.id===i.id);return p?`<div class="cartline"><span>${esc(p.name)} × ${i.qty}<br><b>${money(p.price*i.qty)}</b></span><button data-remove="${p.id}">ඉවත් කරන්න</button></div>`:""}).join("");
 const total=cart.reduce((sum,i)=>sum+(products.find(p=>p.id===i.id)?.price||0)*i.qty,0);
 if(!cart.length){openModal("<h2>Cart 🛒</h2><p>Cart එක හිස්.</p>");return}
 openModal(`<h2>Cart 🛒</h2>${lines}<h3>Total: ${money(total)}</h3><button class="btn dark" id="checkout">Checkout / Order</button>`);
 $$("#modalBody [data-remove]").forEach(b=>b.onclick=()=>{cart=cart.filter(i=>i.id!==b.dataset.remove);persistCart();cartModal()});
 $("#checkout").onclick=checkoutModal;
}
function checkoutModal(){
 const total=cart.reduce((sum,i)=>sum+(products.find(p=>p.id===i.id)?.price||0)*i.qty,0);
 openModal(`<h2>Order details / COD</h2><form id="checkoutForm"><label>පාරිභෝගික නම</label><input name="name" required><label>Phone number</label><input name="phone" inputmode="tel" required><label>ලිපිනය</label><textarea name="address" required></textarea><label>ගම / ප්‍රදේශය</label><input name="village" required><label>නගරය</label><input name="town" required><label>පළාත</label><select name="province" required><option value="">තෝරන්න</option>${["Western","Central","Southern","Northern","Eastern","North Western","North Central","Uva","Sabaragamuwa"].map(x=>`<option>${x}</option>`).join("")}</select><button class="btn dark" type="submit">Order place කරන්න — ${money(total)}</button></form>`);
 $("#checkoutForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),name=f.get("name"),phone=f.get("phone");const rows=[];for(const item of cart){const p=products.find(x=>x.id===item.id);if(!p)continue;rows.push({product_id:p.id,buyer_name:name,buyer_phone:phone,address:f.get("address"),village:f.get("village"),town:f.get("town"),province:f.get("province"),quantity:item.qty,payment_method:"COD",status:"Pending",product_name:p.name,unit_price:p.price,customer_name:name,phone,city:f.get("town")})}
 if(!sb){notify("Supabase connection setup කරන්න ඕන.");return}
 const {error}=await sb.from("orders").insert(rows);if(error){notify("Order error: "+error.message);return}
 cart=[];persistCart();closeModal();notify("Order සාර්ථකයි! 💚");
 };
}
function sellerAuth(mode="login"){
 openModal(`<h2>Seller ${mode==="signup"?"Register":"Login"}</h2><div class="tabs"><button id="loginTab" class="${mode==="login"?"active":""}">Login</button><button id="signupTab" class="${mode==="signup"?"active":""}">Register</button></div><form id="sellerAuthForm">${mode==="signup"?'<label>සම්පූර්ණ නම</label><input name="name" required><label>Phone</label><input name="phone" required>':''}<label>Email</label><input name="email" type="email" required><label>Password</label><input name="password" type="password" minlength="6" required><button class="btn dark">${mode==="signup"?"Register":"Login"}</button></form><p class="note">Seller accounts use Supabase Authentication.</p>`);
 $("#loginTab").onclick=()=>sellerAuth("login");$("#signupTab").onclick=()=>sellerAuth("signup");
 $("#sellerAuthForm").onsubmit=async e=>{e.preventDefault();if(!sb){notify("config.js setup කරන්න.");return}const f=new FormData(e.target),email=f.get("email"),password=f.get("password");
 let res;if(mode==="signup")res=await sb.auth.signUp({email,password,options:{data:{full_name:f.get("name"),phone:f.get("phone"),role:"seller"}}});else res=await sb.auth.signInWithPassword({email,password});
 if(res.error){notify(res.error.message);return}session=res.data.session;profile=res.data.user;notify(mode==="signup"?"Register වුණා. Email verify කරන්න.":"Login සාර්ථකයි.");sellerDashboard();
 };
}
async function sellerDashboard(){
 const user=profile||((await sb.auth.getUser()).data.user);if(!user){sellerAuth();return}
 const {data:mine,error}=await sb.from("products").select("*").eq("seller_id",user.id).order("created_at",{ascending:false});
 openModal(`<h2>Seller dashboard</h2><p class="note">${esc(user.email||"Seller")}</p><button class="btn dark" id="addProduct">＋ Add product</button><button class="btn outline" id="logout">Logout</button><h3>My products (${(mine||[]).length})</h3><div id="sellerProducts">${(mine||[]).map(p=>`<div class="adminitem"><img src="${esc(p.image_url||"")}" alt=""><div class="admininfo"><b>${esc(p.name)}</b><small>${money(p.price)} · ${esc(p.category)}</small></div></div>`).join("")}</div>${error?`<p class="note">${esc(error.message)}</p>`:""}`);
 $("#addProduct").onclick=addProductModal;$("#logout").onclick=async()=>{await sb.auth.signOut();session=null;profile=null;closeModal();notify("Logout")};
}
function addProductModal(){
 openModal(`<h2>Product publish</h2><form id="productForm"><label>Product name</label><input name="name" required><label>Price (LKR)</label><input name="price" type="number" min="1" required><label>Category</label><select name="category">${["Fashion","Electronics","Home","Beauty","Food","Other"].map(x=>`<option>${x}</option>`).join("")}</select><label>Product photo</label><input name="photo" type="file" accept="image/*" required><label>Description</label><textarea name="description"></textarea><button class="btn dark">Publish product</button></form>`);
 $("#productForm").onsubmit=async e=>{e.preventDefault();const user=profile||((await sb.auth.getUser()).data.user);if(!user){notify("Login නැවත කරන්න");return}const f=new FormData(e.target),file=f.get("photo");let photoUrl=null;
 const path=`${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
 const upload=await sb.storage.from("product-photos").upload(path,file,{upsert:false});if(upload.error){notify("Photo upload: "+upload.error.message);return}
 const pub=sb.storage.from("product-photos").getPublicUrl(path);photoUrl=pub.data.publicUrl;
 const {error}=await sb.from("products").insert({seller_id:user.id,name:f.get("name"),price:Number(f.get("price")),category:f.get("category"),image_url:photoUrl,description:f.get("description"),is_active:true});
 if(error){notify("Product save error: "+error.message);return}closeModal();await loadProducts();notify("Product publish වුණා! 🎉");
 };
}
function adminLogin(){
 openModal(`<h2>Admin sign in</h2><form id="adminLoginForm"><label>Email</label><input name="email" type="email" required><label>Password</label><input name="password" type="password" required><button class="btn dark">Login to Admin</button></form><p class="note">Admin role must be assigned securely in Supabase Auth app_metadata.</p>`);
 $("#adminLoginForm").onsubmit=async e=>{e.preventDefault();if(!sb){notify("config.js setup කරන්න.");return}const f=new FormData(e.target),res=await sb.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});if(res.error){notify(res.error.message);return}const u=res.data.user;const {data:pr,error}=await sb.from("profiles").select("role").eq("id",u.id).single();if(error||pr?.role!=="admin"){await sb.auth.signOut();notify("Admin access denied.");return}session=res.data.session;profile=u;adminDashboard("overview");
 };
}
async function adminDashboard(tab="overview"){
 if(!sb||!profile){adminLogin();return}
 const {data:pr}=await sb.from("profiles").select("role").eq("id",profile.id).single();if(pr?.role!=="admin"){notify("Admin access denied");return}
 openModal(`<div class="adminwrap"><aside class="adminside"><h3>🌿 Weladapola Admin</h3><button data-tab="overview" class="${tab==="overview"?"active":""}">📊 Overview</button><button data-tab="orders" class="${tab==="orders"?"active":""}">📦 Orders</button><button data-tab="sellers" class="${tab==="sellers"?"active":""}">👥 Sellers</button><button data-tab="products" class="${tab==="products"?"active":""}">🛍️ Products</button><button id="adminLogout">↪ Logout</button></aside><main class="adminmain" id="adminContent"><div class="loading">Loading dashboard...</div></main></div>`);
 $("#adminLogout").onclick=async()=>{await sb.auth.signOut();profile=null;session=null;closeModal();notify("Admin logout")};
 $$("#modalBody [data-tab]").forEach(b=>b.onclick=()=>adminDashboard(b.dataset.tab));
 const root=$("#adminContent");
 if(tab==="overview"){
  const [p,o,s]=await Promise.all([sb.from("products").select("id",{count:"exact",head:true}),sb.from("orders").select("id,status,unit_price,quantity",{count:"exact"}),sb.from("sellers").select("id",{count:"exact",head:true})]);
  if(p.error||o.error||s.error){root.innerHTML=`<h3>Dashboard data error</h3><p>${esc(p.error?.message||o.error?.message||s.error?.message)}</p>`;return}
  const delivered=(o.data||[]).filter(x=>x.status==="Delivered").reduce((sum,x)=>sum+Number(x.unit_price||0)*Number(x.quantity||0),0);
  root.innerHTML=`<h3>Overview</h3><div class="metrics"><div class="metric"><small>Total Products</small><strong>${p.count||0}</strong></div><div class="metric"><small>Total Orders</small><strong>${o.count||0}</strong></div><div class="metric"><small>Total Sellers</small><strong>${s.count||0}</strong></div><div class="metric"><small>Delivered value</small><strong>${money(delivered)}</strong></div></div><p class="note">Dashboard stats from Supabase records. Revenue figure counts delivered orders only.</p>`;
 }else if(tab==="products"){
  const {data,error}=await sb.from("products").select("id,name,price,category,image_url,seller_id,created_at").order("created_at",{ascending:false});
  if(error){root.innerHTML=`<h3>Products error</h3><p>${esc(error.message)}</p>`;return}
  const sellerIds=[...new Set((data||[]).map(p=>p.seller_id).filter(Boolean))];
  let sellers={};if(sellerIds.length){const r=await sb.from("sellers").select("id,seller_name,phone").in("id",sellerIds);(r.data||[]).forEach(x=>sellers[x.id]=x)}
  root.innerHTML=`<h3>Products (${(data||[]).length})</h3>${(data||[]).map(p=>{const s=sellers[p.seller_id]||{};return `<div class="adminitem"><img src="${esc(p.image_url||"")}" alt=""><div class="admininfo"><b>${esc(p.name)} · ${money(p.price)}</b><small>Seller: ${esc(s.seller_name||"Unknown")} · ${esc(s.phone||"No phone")}<br>${esc(p.category||"")}</small></div><button class="delete" data-delete="${p.id}">Delete</button></div>`}).join("")||"<p>No products found.</p>"}`;
  $$("#adminContent [data-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("Product එක marketplace එකෙන් delete කරන්නද?"))return;const {error}=await sb.from("products").delete().eq("id",b.dataset.delete);if(error){notify("Delete failed: "+error.message);return}await loadProducts();adminDashboard("products");notify("Product deleted.")});
 }else if(tab==="sellers"){
  const [sres,pres]=await Promise.all([sb.from("sellers").select("id,seller_name,phone,created_at").order("created_at",{ascending:false}),sb.from("profiles").select("id,email,phone,role")]);
  if(sres.error||pres.error){root.innerHTML=`<h3>Sellers error</h3><p>${esc(sres.error?.message||pres.error?.message)}</p>`;return}
  const profiles={}; (pres.data||[]).forEach(x=>profiles[x.id]=x);
  root.innerHTML=`<h3>Sellers (${(sres.data||[]).length})</h3>${(sres.data||[]).map(s=>{const pr=profiles[s.id]||{};return `<div class="adminitem"><div class="admininfo"><b>${esc(s.seller_name||"Seller")}</b><small>📞 ${esc(s.phone||pr.phone||"No phone")} · ✉ ${esc(pr.email||"No email")}<br>Seller ID: ${esc(s.id)}</small></div></div>`}).join("")||"<p>No sellers yet.</p>"}`;
 }else if(tab==="orders"){
  const {data,error}=await sb.from("orders").select("*").order("created_at",{ascending:false});
  if(error){root.innerHTML=`<h3>Orders error</h3><p>${esc(error.message)}</p>`;return}
  root.innerHTML=`<h3>Orders (${(data||[]).length})</h3>${(data||[]).map(o=>`<div class="ordercard"><b>${esc(o.product_name||"Order")} · ${money(Number(o.unit_price||0)*Number(o.quantity||1))}</b><p>👤 ${esc(o.buyer_name||o.customer_name||"")} · ☎ ${esc(o.buyer_phone||o.phone||"")}</p><p>📍 ${esc(o.town||o.city||"")} · ${esc(o.village||"")} · ${esc(o.province||"")}</p><p>${esc(o.address||"")} · Qty: ${esc(o.quantity||1)} · ${esc(o.payment_method||"COD")}</p><label>Status <select class="statusSelect" data-status="${o.id}">${["Pending","Processing","Shipped","Delivered","Cancelled"].map(st=>`<option ${o.status===st?"selected":""}>${st}</option>`).join("")}</select></label></div>`).join("")||"<p>No orders yet.</p>"}`;
  $$("#adminContent [data-status]").forEach(sel=>sel.onchange=async()=>{const {error}=await sb.from("orders").update({status:sel.value}).eq("id",sel.dataset.status);if(error){notify(error.message);return}notify("Order status updated")});
 }
}
function init(){
 $("#year").textContent=new Date().getFullYear();refreshCartCount();
 $("#searchInput").oninput=renderProducts;$("#clearSearch").onclick=()=>{$("#searchInput").value="";renderProducts()};
 $$(".category").forEach(btn=>btn.onclick=()=>{category=btn.dataset.cat;$$(".category").forEach(x=>x.classList.toggle("active",x===btn));renderProducts()});
 $("#sellerBtn").onclick=()=>sellerAuth("login");$("#sellerJoin").onclick=()=>sellerAuth("signup");$("#adminBtn").onclick=adminLogin;$("#cartBtn").onclick=cartModal;
 $("#closeModal").onclick=closeModal;$("#modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
 $("#menuBtn").onclick=()=>$("#navLinks").classList.toggle("open");$$('#navLinks a').forEach(a=>a.onclick=()=>$("#navLinks").classList.remove("open"));
 loadProducts();
}
init();