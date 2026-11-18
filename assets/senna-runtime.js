/* S.E.N.N.A. · camada de acesso para rodar os módulos fora do claude.ai
   - Login com e-mail e senha pelo Firebase Authentication (a senha fica com o Google; a S.E.N.N.A. nunca grava senha).
   - Cada novo acesso nasce "pendente" e só vê dados depois que o moderador aprova.
   - Reproduz a interface window.claude.use(...) que os módulos usam: db, user, downloads e assets.
   - Modo app: barra inferior no celular/tablet, instalação na tela inicial e links abrindo na mesma janela. */
(function(){
  'use strict';
  const FB='https://www.gstatic.com/firebasejs/10.12.2/';
  const me=document.currentScript;
  const MOD=(me&&me.dataset.modulo)||'geral';
  const RAIZ=(me&&me.dataset.raiz)||'../';
  const SEM_DADOS=me&&me.dataset.semDados==='1';
  let fs=null,auth=null,authMod=null,DBF=null,PERFIL=null,UID=null;
  let pronto;const READY=new Promise(r=>pronto=r);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const MODULOS=[
    ['central','Central','M3 10l9-6 9 6v10H3z'],
    ['ajustes','Ajustes','M4 19h16M7 16V9m5 7V5m5 11v-4'],
    ['rotativo','Inventários Rotativos','M4 12a8 8 0 0 1 14-5l2-2v6h-6l2-2a5 5 0 1 0 1 6'],
    ['io','Inventário Oficial','M5 4h14v16H5zM8 8h8M8 12h8M8 16h5'],
    ['nal','NAL','M3 7h13v10H3zM16 10h3l2 3v4h-5'],
    ['nfs','NFs Pendentes','M6 3h9l4 4v14H6zM9 12h7M9 16h7'],
    ['checklists','Checklists','M9 11l3 3 8-8M20 12v7H4V5h11'],
    ['pitstop','Pit Stop','M4 20V5h10l-2 4h8v11'],
    ['cadastro','Cadastro de Itens','M4 6h16M4 12h16M4 18h10']];

  /* ---------- tela de acesso ---------- */
  const css=`#sx-ov{position:fixed;inset:0;z-index:2147483000;background:#001A72;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Arial,Helvetica,sans-serif;}
  #sx-ov[hidden]{display:none}
  #sx-bx{background:#fff;color:#1E293B;border-radius:14px;width:100%;max-width:380px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.4)}
  #sx-hd{background:#001A72;color:#fff;padding:18px 20px;border-bottom:6px solid #FE5000;display:flex;gap:12px;align-items:center}
  #sx-hd b.m{background:#FE5000;border-radius:8px;padding:8px 9px;font-size:15px}
  #sx-hd h1{margin:0;font-size:16px} #sx-hd p{margin:2px 0 0;font-size:11.5px;color:#C9D2F0}
  #sx-bd{padding:18px 20px 20px;font-size:14px;line-height:1.5}
  #sx-bd label{display:block;font-size:11.5px;font-weight:bold;color:#001A72;margin:10px 0 4px}
  #sx-bd input{width:100%;box-sizing:border-box;height:42px;border:1px solid #CBD5E1;border-radius:8px;padding:0 10px;font-size:16px}
  #sx-bd button.p{width:100%;margin-top:14px;height:44px;border:none;border-radius:8px;background:#FE5000;color:#fff;font-weight:bold;font-size:15px;cursor:pointer}
  #sx-bd button.p:disabled{opacity:.5}
  #sx-bd a{color:#001A72;font-weight:bold;cursor:pointer;text-decoration:underline}
  #sx-msg{margin-top:10px;font-size:12.5px;min-height:16px} #sx-msg.e{color:#C00000} #sx-msg.o{color:#16A34A}
  #sx-bar{position:fixed;right:10px;bottom:10px;z-index:2147482000;background:#001A72;color:#fff;border-left:4px solid #FE5000;border-radius:8px;padding:6px 10px;font:12px Arial,sans-serif;display:flex;gap:10px;align-items:center;box-shadow:0 4px 14px rgba(0,0,0,.25)}
  #sx-bar a{color:#FFD9C2;font-weight:bold;cursor:pointer;text-decoration:none}`;
  function ui(){if(document.getElementById('sx-ov'))return;const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    const ov=document.createElement('div');ov.id='sx-ov';ov.innerHTML=`<div id="sx-bx" role="dialog" aria-modal="true" aria-labelledby="sx-t"><div id="sx-hd"><b class="m">LDM</b><div><h1 id="sx-t">S.E.N.N.A.</h1><p>Prevenção de Perdas · Lugar de quem faz</p></div></div><div id="sx-bd">Carregando…</div></div>`;
    document.body.appendChild(ov);}
  const bd=()=>document.getElementById('sx-bd');
  const msg=(t,c)=>{const m=document.getElementById('sx-msg');if(m){m.textContent=t;m.className=c||'';}};
  const erroTxt=e=>({'auth/invalid-credential':'E-mail ou senha incorretos.','auth/wrong-password':'E-mail ou senha incorretos.','auth/user-not-found':'E-mail ou senha incorretos.',
    'auth/email-already-in-use':'Este e-mail já tem acesso. Use "Entrar".','auth/weak-password':'A senha precisa ter pelo menos 8 caracteres.',
    'auth/invalid-email':'E-mail inválido.','auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos.','auth/network-request-failed':'Sem conexão com a internet.'})[e&&e.code]||('Não foi possível concluir ('+((e&&e.code)||e)+').');
  function telaEntrar(){ui();document.getElementById('sx-ov').hidden=false;
    bd().innerHTML=`<b>Entrar</b><label for="sx-e">E-mail</label><input id="sx-e" type="email" autocomplete="username" inputmode="email"><label for="sx-s">Senha</label><input id="sx-s" type="password" autocomplete="current-password">
    <button class="p" id="sx-go">Entrar</button><div id="sx-msg"></div><p style="margin:12px 0 0;font-size:13px">Primeiro acesso? <a id="sx-cad">Solicitar acesso</a> · <a id="sx-esq">Esqueci a senha</a></p>`;
    const go=async()=>{const b=document.getElementById('sx-go');b.disabled=true;msg('');
      try{await authMod.signInWithEmailAndPassword(auth,document.getElementById('sx-e').value.trim(),document.getElementById('sx-s').value);}catch(e){msg(erroTxt(e),'e');b.disabled=false;}};
    document.getElementById('sx-go').onclick=go;document.getElementById('sx-s').onkeydown=e=>{if(e.key==='Enter')go();};
    document.getElementById('sx-cad').onclick=telaCadastro;
    document.getElementById('sx-esq').onclick=async()=>{const em=document.getElementById('sx-e').value.trim();if(!em){msg('Digite o e-mail acima e clique de novo.','e');return;}
      try{await authMod.sendPasswordResetEmail(auth,em);msg('Se o e-mail tiver acesso, chega um link para criar nova senha.','o');}catch(e){msg(erroTxt(e),'e');}};}
  let NOME_NOVO='';
  function telaCadastro(){bd().innerHTML=`<b>Solicitar acesso</b><label for="sx-n">Nome completo</label><input id="sx-n" autocomplete="name"><label for="sx-e">E-mail corporativo</label><input id="sx-e" type="email" autocomplete="username" inputmode="email">
    <label for="sx-s">Crie uma senha (mínimo 8 caracteres)</label><input id="sx-s" type="password" autocomplete="new-password">
    <button class="p" id="sx-go">Solicitar</button><div id="sx-msg"></div><p style="margin:12px 0 0;font-size:13px">O moderador libera o acesso e define o que você vê. <a id="sx-vol">Voltar</a></p>`;
    document.getElementById('sx-vol').onclick=telaEntrar;
    document.getElementById('sx-go').onclick=async()=>{const n=document.getElementById('sx-n').value.trim(),em=document.getElementById('sx-e').value.trim(),s=document.getElementById('sx-s').value;
      if(n.length<3){msg('Informe o nome.','e');return;}if(s.length<8){msg('A senha precisa ter pelo menos 8 caracteres.','e');return;}
      const b=document.getElementById('sx-go');b.disabled=true;NOME_NOVO=n;
      try{const c=await authMod.createUserWithEmailAndPassword(auth,em,s);try{await authMod.updateProfile(c.user,{displayName:n});}catch(e){}}catch(e){msg(erroTxt(e),'e');b.disabled=false;}};}
  function telaAguardando(st){ui();document.getElementById('sx-ov').hidden=false;
    bd().innerHTML=st==='bloqueado'?`<b>Acesso bloqueado</b><p>O moderador bloqueou este acesso. Fale com a Prevenção de Perdas.</p><a id="sx-out">Sair</a>`
      :`<b>Aguardando liberação</b><p>Seu pedido foi registrado. Assim que o moderador aprovar, esta página abre sozinha.</p><a id="sx-out">Sair</a>`;
    document.getElementById('sx-out').onclick=()=>authMod.signOut(auth);}
  const papelTxt=p=>({moderador:'Moderador',piloto:'Piloto',auditor:'Auditor',leitor:'Leitura'}[p]||p);
  /* Auditor: faz checklists e só lê os demais módulos */
  const gravaAqui=()=>PERFIL.papel==='moderador'||PERFIL.papel==='piloto'||(PERFIL.papel==='auditor'&&MOD==='checklists');
  function sair(){authMod.signOut(auth).then(()=>location.reload());}
  function barra(){if(document.getElementById('sx-bar'))return;const b=document.createElement('div');b.id='sx-bar';
    b.innerHTML=`<span>${esc(PERFIL.nome||PERFIL.email)} · ${esc(papelTxt(PERFIL.papel))}</span>${PERFIL.papel==='moderador'?`<a href="${RAIZ}moderacao/">Usuários</a><a href="${RAIZ}importar/">Importar dados</a>`:''}<a id="sx-sair">Sair</a>`;
    document.body.appendChild(b);document.getElementById('sx-sair').onclick=sair;dock();}

  /* ---------- modo app (celular e tablet) ---------- */
  let instalar=null;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();instalar=e;const b=document.getElementById('sx-inst');if(b)b.hidden=false;});
  const ico=d=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  function dock(){if(document.getElementById('sx-dock'))return;
    const atual=MODULOS.find(m=>m[0]===MOD);
    const d=document.createElement('nav');d.id='sx-dock';d.setAttribute('aria-label','Navegação do app');
    d.innerHTML=`<a href="${RAIZ}central/" class="${MOD==='central'?'on':''}">${ico(MODULOS[0][2])}<span>Início</span></a>
      <button type="button" data-sh="mods" class="${MOD!=='central'&&atual?'on':''}">${ico('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z')}<span>${esc(atual&&MOD!=='central'?atual[1]:'Módulos')}</span></button>
      <button type="button" data-sh="conta">${ico('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0')}<span>Conta</span></button>`;
    const sh=document.createElement('div');sh.id='sx-sheet';sh.hidden=true;
    document.body.append(d,sh);
    const abrir=t=>{if(!sh.hidden&&sh.dataset.t===t){sh.hidden=true;return;}sh.dataset.t=t;
      sh.innerHTML=t==='mods'?`<div class="sx-h">Módulos</div><div class="sx-grid">${MODULOS.map(m=>`<a href="${RAIZ}${m[0]}/" class="${m[0]===MOD?'on':''}">${ico(m[2])}<span>${esc(m[1])}</span></a>`).join('')}</div>`
        :`<div class="sx-h">${esc(PERFIL.nome||PERFIL.email)}</div><div class="sx-sub">${esc(PERFIL.email||'')} · ${esc(papelTxt(PERFIL.papel))}</div>
          <div class="sx-list">${PERFIL.papel==='moderador'?`<a href="${RAIZ}moderacao/">Usuários e acessos</a><a href="${RAIZ}importar/">Importar dados</a>`:''}
          <button type="button" id="sx-inst" ${instalar?'':'hidden'}>Instalar o app neste aparelho</button>
          ${/iphone|ipad|ipod/i.test(navigator.userAgent)&&!navigator.standalone?'<div class="sx-dica">Para instalar no iPhone/iPad: toque em Compartilhar e depois em <b>Adicionar à Tela de Início</b>.</div>':''}
          <button type="button" id="sx-out2" class="sx-sair">Sair</button></div>`;
      sh.hidden=false;
      const bi=document.getElementById('sx-inst');if(bi)bi.onclick=async()=>{if(!instalar)return;instalar.prompt();try{await instalar.userChoice;}catch(e){}instalar=null;bi.hidden=true;};
      const bo=document.getElementById('sx-out2');if(bo)bo.onclick=sair;};
    d.querySelectorAll('[data-sh]').forEach(b=>b.onclick=()=>abrir(b.dataset.sh));
    document.addEventListener('click',e=>{if(!sh.hidden&&!sh.contains(e.target)&&!d.contains(e.target))sh.hidden=true;});
    document.documentElement.classList.add('sx-app');}
  /* links entre módulos abrem na mesma janela (no app instalado, nova aba sairia do app) */
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a||e.defaultPrevented||e.ctrlKey||e.metaKey||e.shiftKey)return;
    let u;try{u=new URL(a.getAttribute('href'),location.href);}catch(x){return;}
    if(u.origin===location.origin&&!a.hasAttribute('download')&&!u.pathname.includes('/_blob/')&&a.target&&a.target!=='_self'){e.preventDefault();location.href=u.href;}},true);
  /* window.open para páginas do próprio site também abre na mesma janela */
  const abrirOrig=window.open.bind(window);
  window.open=function(url,alvo,opc){try{const u=new URL(url,location.href);if(u.origin===location.origin&&!u.pathname.includes('/_blob/')){location.href=u.href;return window;}}catch(e){}return abrirOrig(url,alvo,opc);};
  if('serviceWorker' in navigator&&location.protocol==='https:'){window.addEventListener('load',()=>{navigator.serviceWorker.register(RAIZ+'sw.js',{scope:RAIZ}).catch(()=>{});});}

  /* ---------- base de dados no formato que os módulos esperam ---------- */
  const caminho=p=>(SEM_DADOS?'':'modulos/'+MOD+'/')+String(p).replace(/^\/+|\/+$/g,'');
  const wDoc=s=>({id:s.id,exists:s.exists(),data:()=>s.data(),metadata:s.metadata});
  const wQ=q=>({docs:q.docs.map(wDoc),empty:q.empty,size:q.size,metadata:q.metadata});
  function Q(ref){return {
    where:(f,op,v)=>Q(fs.query(ref,fs.where(f,op,v))),orderBy:(f,d)=>Q(fs.query(ref,fs.orderBy(f,d||'asc'))),limit:n=>Q(fs.query(ref,fs.limit(n))),
    get:async()=>wQ(await fs.getDocs(ref)),
    onSnapshot:(ok,er)=>fs.onSnapshot(ref,q=>ok(wQ(q)),er||(()=>{}))};}
  function D(ref){return {id:ref.id,
    get:async()=>wDoc(await fs.getDoc(ref)),set:(d,o)=>fs.setDoc(ref,d,o||{}),update:d=>fs.updateDoc(ref,d),delete:()=>fs.deleteDoc(ref),
    onSnapshot:(ok,er)=>fs.onSnapshot(ref,s=>ok(wDoc(s)),er||(()=>{}))};}
  function COL(p){const ref=fs.collection(DBF,caminho(p));
    return Object.assign(Q(ref),{doc:id=>D(id?fs.doc(ref,id):fs.doc(ref)),add:async d=>{const r=await fs.addDoc(ref,d);return {id:r.id};}});}
  /* Pit Stop: a coleção "resumo" junta, ao vivo, o resumo que cada módulo grava em pitstop/resumo.
     Módulos que não geram resumo próprio (I.O. e Checklists) usam a cópia guardada em modulos/pitstop/resumo. */
  const RESUMO_VIVO=['ajustes','rotativo','nal','nfs'];
  function resumoPitStop(){const base={},vivo={};
    const docs=()=>{const ids=new Set([...Object.keys(base),...Object.keys(vivo)]);
      return {docs:[...ids].sort().map(id=>{const d=vivo[id]||base[id];return {id,exists:true,data:()=>d,metadata:{fromCache:false}};}),empty:!ids.size,size:ids.size,metadata:{fromCache:false}};};
    return {
      get:async()=>{const q=await fs.getDocs(fs.collection(DBF,'modulos/pitstop/resumo'));q.docs.forEach(d=>base[d.id]=d.data());
        for(const m of RESUMO_VIVO){try{const s=await fs.getDoc(fs.doc(DBF,`modulos/${m}/pitstop/resumo`));if(s.exists())vivo[m]=s.data();}catch(e){}}return docs();},
      onSnapshot:(ok,er)=>{const subs=[];
        subs.push(fs.onSnapshot(fs.collection(DBF,'modulos/pitstop/resumo'),q=>{Object.keys(base).forEach(k=>delete base[k]);q.docs.forEach(d=>base[d.id]=d.data());ok(docs());},er||(()=>{})));
        for(const m of RESUMO_VIVO)subs.push(fs.onSnapshot(fs.doc(DBF,`modulos/${m}/pitstop/resumo`),s=>{if(s.exists())vivo[m]=s.data();else delete vivo[m];ok(docs());},()=>{}));
        return ()=>subs.forEach(u=>u());}};}
  const DB={doc:p=>D(fs.doc(DBF,caminho(p))),collection:p=>(MOD==='pitstop'&&p==='resumo')?resumoPitStop():COL(p)};
  const USER={
    isOwner:async()=>PERFIL.papel==='moderador',canEdit:async()=>PERFIL.papel==='moderador'||PERFIL.papel==='piloto',
    can:async n=>n==='data.write'?gravaAqui():null,
    id:async()=>UID,me:async()=>({id:UID,name:PERFIL.nome||'',email:PERFIL.email||null}),
    profiles:async ids=>{const out={};for(const id of ids||[]){try{const s=await fs.getDoc(fs.doc(DBF,'usuarios/'+id));const d=s.exists()?s.data():{};out[id]={id,name:d.nome||'',email:d.email||null};}catch(e){out[id]={id,name:''};}}return out;},
    search:async()=>[]};
  const DOWNLOADS={save:async({filename,data})=>{const blob=data instanceof Blob?data:new Blob([data]);const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=filename||'arquivo';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);return {ok:true};}};
  /* fotos e assinaturas: guardadas no próprio Firestore (sem Firebase Storage), lidas por /_blob/<id> */
  const BLOB_MAX=900000,BLOBS=new Map();
  const blobDoc=id=>fs.doc(DBF,`modulos/${MOD}/_blobs/${id}`);
  const paraDataURL=b=>new Promise((ok,er)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>er(r.error);r.readAsDataURL(b);});
  async function reduzir(blob){if(!/^image\/(jpeg|png|webp)/.test(blob.type||''))return blob;let q=0.82,w=1600;
    for(let i=0;i<4;i++){const img=await createImageBitmap(blob);const k=Math.min(1,w/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);const nb=await new Promise(r=>c.toBlob(r,'image/jpeg',q));if(nb&&nb.size*1.37<BLOB_MAX)return nb;q-=0.15;w=Math.round(w*0.75);}
    return blob;}
  const ASSETS={
    upload:async(blob)=>{let b=blob;if(b.size*1.37>BLOB_MAX)b=await reduzir(b);const url=await paraDataURL(b);
      if(url.length>BLOB_MAX)throw Object.assign(new Error('Arquivo grande demais para guardar.'),{code:'too_large'});
      const id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()).replace(/-/g,'').slice(0,32);
      await fs.setDoc(blobDoc(id),{d:url,tipo:b.type||'',tamanho:b.size,criadoEm:new Date().toISOString(),por:UID});BLOBS.set(id,url);
      return {id,url,sizeBytes:b.size,contentType:b.type||''};},
    delete:async id=>{BLOBS.delete(id);await fs.deleteDoc(blobDoc(id));},
    list:async()=>{const q=await fs.getDocs(fs.collection(DBF,`modulos/${MOD}/_blobs`));return {assets:q.docs.map(d=>({id:d.id,url:'/_blob/'+d.id,sizeBytes:d.data().tamanho,contentType:d.data().tipo})),usage:{}};}};
  async function urlBlob(id){if(BLOBS.has(id))return BLOBS.get(id);const s=await fs.getDoc(blobDoc(id));const u=s.exists()?s.data().d:'';BLOBS.set(id,u);return u;}
  function trocarBlobs(raiz){if(!DBF)return;(raiz.querySelectorAll?raiz:document).querySelectorAll('img[src*="/_blob/"],a[href*="/_blob/"]').forEach(async el=>{
    const at=el.tagName==='IMG'?'src':'href';const v=el.getAttribute(at)||'';const m=v.match(/\/_blob\/([A-Za-z0-9_-]+)/);if(!m)return;
    el.setAttribute(at,'data:,');try{const u=await urlBlob(m[1]);if(u)el.setAttribute(at,u);}catch(e){}});}
  new MutationObserver(ms=>{if(!PERFIL||PERFIL.status!=='aprovado')return;for(const m of ms){if(m.type==='attributes')trocarBlobs(m.target.parentNode||document);else m.addedNodes.forEach(n=>{if(n.nodeType===1)trocarBlobs(n.parentNode||n);});}})
    .observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','href']});

  window.claude={use:async nome=>{await READY;
    if(nome==='db')return DB;if(nome==='user')return USER;if(nome==='downloads')return DOWNLOADS;
    if(nome==='assets')return gravaAqui()?ASSETS:null;
    return null;}};
  /* bases grandes que antes vinham embutidas no HTML: agora ficam no Firestore, protegidas pelo login */
  const T_EMB=700000;
  window.SENNA={pronto:READY,modulo:MOD,perfil:()=>PERFIL,fs:()=>fs,base:()=>DBF,
    embutido:async nome=>{await READY;const m=await fs.getDoc(fs.doc(DBF,'embutidos/'+nome));
      if(!m.exists())throw new Error('Dado "'+nome+'" não foi importado. Use Importar dados.');
      let z='';for(let i=0;i<m.data().partes;i++){const p=await fs.getDoc(fs.doc(DBF,'embutidos/'+nome+'/partes/p'+i));z+=p.data().z;}return z;},
    gravarEmbutido:async(nome,z,extra)=>{await READY;const n=Math.ceil(z.length/T_EMB)||1;let nAnt=0;
      try{const m=await fs.getDoc(fs.doc(DBF,'embutidos/'+nome));if(m.exists())nAnt=m.data().partes||0;}catch(e){}
      for(let i=0;i<n;i++)await fs.setDoc(fs.doc(DBF,`embutidos/${nome}/partes/p${i}`),{z:z.slice(i*T_EMB,(i+1)*T_EMB)});
      await fs.setDoc(fs.doc(DBF,'embutidos/'+nome),Object.assign({partes:n,atualizadoEm:new Date().toISOString(),por:UID},extra||{}));
      for(let i=n;i<nAnt;i++){try{await fs.deleteDoc(fs.doc(DBF,`embutidos/${nome}/partes/p${i}`));}catch(e){}}return n;}};

  /* ---------- início ---------- */
  async function iniciar(){
    const cfg=window.SENNA_FIREBASE_CONFIG;
    if(!cfg||!cfg.projectId||/COLE_AQUI/.test(cfg.projectId)){bd().innerHTML='<b>Configuração pendente</b><p>Preencha <code>assets/firebase-config.js</code> com os dados do projeto Firebase.</p>';return;}
    const appMod=await import(FB+'firebase-app.js');authMod=await import(FB+'firebase-auth.js');fs=await import(FB+'firebase-firestore.js');
    const app=appMod.initializeApp(cfg);auth=authMod.getAuth(app);DBF=fs.getFirestore(app);
    let parar=null;
    authMod.onAuthStateChanged(auth,async u=>{if(parar){parar();parar=null;}
      if(!u){PERFIL=null;telaEntrar();return;}
      UID=u.uid;const ref=fs.doc(DBF,'usuarios/'+u.uid);
      try{const s=await fs.getDoc(ref);
        if(!s.exists())await fs.setDoc(ref,{nome:NOME_NOVO||u.displayName||'',email:u.email,status:'pendente',papel:'leitor',criadoEm:new Date().toISOString()});
      }catch(e){bd().innerHTML='<b>Erro</b><p>'+esc(e.message||e)+'</p>';return;}
      parar=fs.onSnapshot(ref,s=>{const d=s.data();if(!d)return;const antes=PERFIL&&PERFIL.status;PERFIL=d;
        if(d.status!=='aprovado'){if(antes==='aprovado'){location.reload();return;}telaAguardando(d.status);return;}
        if(antes&&antes!=='aprovado'){location.reload();return;}
        if(antes==='aprovado')return;
        document.getElementById('sx-ov').hidden=true;barra();trocarBlobs(document);pronto();});
    });}
  const go=()=>{ui();iniciar().catch(e=>{bd().innerHTML='<b>Erro ao iniciar</b><p>'+esc(e.message||e)+'</p>';});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
})();
