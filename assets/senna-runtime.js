/* S.E.N.N.A. · camada de acesso para rodar os módulos fora do claude.ai
   - Login com e-mail e senha pelo Firebase Authentication (a senha fica com o Google; a S.E.N.N.A. nunca grava senha).
   - Cada novo acesso nasce "pendente" e só vê dados depois que o moderador aprova.
   - Reproduz a interface window.claude.use(...) que os módulos já usam: db, user e downloads.
     O chat do Beto e da Bety (sample) fica desligado: ele exige uma chave de API em servidor. */
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

  /* ---------- tela de acesso ---------- */
  const css=`#sx-ov{position:fixed;inset:0;z-index:2147483000;background:#001A72;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Arial,Helvetica,sans-serif;}
  #sx-ov[hidden]{display:none}
  #sx-bx{background:#fff;color:#1E293B;border-radius:12px;width:100%;max-width:380px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.4)}
  #sx-hd{background:#001A72;color:#fff;padding:18px 20px;border-bottom:6px solid #FE5000;display:flex;gap:12px;align-items:center}
  #sx-hd b.m{background:#FE5000;border-radius:8px;padding:8px 9px;font-size:15px}
  #sx-hd h1{margin:0;font-size:16px} #sx-hd p{margin:2px 0 0;font-size:11.5px;color:#C9D2F0}
  #sx-bd{padding:18px 20px 20px;font-size:13px;line-height:1.5}
  #sx-bd label{display:block;font-size:11px;font-weight:bold;color:#001A72;margin:10px 0 4px}
  #sx-bd input{width:100%;box-sizing:border-box;height:36px;border:1px solid #CBD5E1;border-radius:6px;padding:0 10px;font-size:13px}
  #sx-bd button.p{width:100%;margin-top:14px;height:38px;border:none;border-radius:6px;background:#FE5000;color:#fff;font-weight:bold;font-size:13px;cursor:pointer}
  #sx-bd button.p:disabled{opacity:.5}
  #sx-bd a{color:#001A72;font-weight:bold;cursor:pointer;text-decoration:underline}
  #sx-msg{margin-top:10px;font-size:12px;min-height:16px} #sx-msg.e{color:#C00000} #sx-msg.o{color:#16A34A}
  #sx-bar{position:fixed;right:10px;bottom:10px;z-index:2147482000;background:#001A72;color:#fff;border-left:4px solid #FE5000;border-radius:8px;padding:6px 10px;font:12px Arial,sans-serif;display:flex;gap:10px;align-items:center;box-shadow:0 4px 14px rgba(0,0,0,.25)}
  #sx-bar a{color:#FFD9C2;font-weight:bold;cursor:pointer;text-decoration:none}`;
  function ui(){if(document.getElementById('sx-ov'))return;const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    const ov=document.createElement('div');ov.id='sx-ov';ov.innerHTML=`<div id="sx-bx" role="dialog" aria-modal="true" aria-labelledby="sx-t"><div id="sx-hd"><b class="m">LDM</b><div><h1 id="sx-t">S.E.N.N.A.</h1><p>Prevenção de Perdas · Lugar de quem faz</p></div></div><div id="sx-bd">Carregando…</div></div>`;
    document.body.appendChild(ov);}
  const bd=()=>document.getElementById('sx-bd');
  const msg=(t,c)=>{const m=document.getElementById('sx-msg');if(m){m.textContent=t;m.className=c||'';}};
  const erroTxt=e=>({'auth/invalid-credential':'E-mail ou senha incorretos.','auth/wrong-password':'E-mail ou senha incorretos.','auth/user-not-found':'E-mail ou senha incorretos.',
    'auth/email-already-in-use':'Este e-mail já tem acesso. Use "Entrar".','auth/weak-password':'A senha precisa ter pelo menos 8 caracteres.',
    'auth/invalid-email':'E-mail inválido.','auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos.'})[e&&e.code]||('Não foi possível concluir ('+((e&&e.code)||e)+').');
  function telaEntrar(){ui();document.getElementById('sx-ov').hidden=false;
    bd().innerHTML=`<b>Entrar</b><label for="sx-e">E-mail</label><input id="sx-e" type="email" autocomplete="username"><label for="sx-s">Senha</label><input id="sx-s" type="password" autocomplete="current-password">
    <button class="p" id="sx-go">Entrar</button><div id="sx-msg"></div><p style="margin:12px 0 0;font-size:12px">Primeiro acesso? <a id="sx-cad">Solicitar acesso</a> · <a id="sx-esq">Esqueci a senha</a></p>`;
    const go=async()=>{const b=document.getElementById('sx-go');b.disabled=true;msg('');
      try{await authMod.signInWithEmailAndPassword(auth,document.getElementById('sx-e').value.trim(),document.getElementById('sx-s').value);}catch(e){msg(erroTxt(e),'e');b.disabled=false;}};
    document.getElementById('sx-go').onclick=go;document.getElementById('sx-s').onkeydown=e=>{if(e.key==='Enter')go();};
    document.getElementById('sx-cad').onclick=telaCadastro;
    document.getElementById('sx-esq').onclick=async()=>{const em=document.getElementById('sx-e').value.trim();if(!em){msg('Digite o e-mail acima e clique de novo.','e');return;}
      try{await authMod.sendPasswordResetEmail(auth,em);msg('Se o e-mail tiver acesso, chega um link para criar nova senha.','o');}catch(e){msg(erroTxt(e),'e');}};
    setTimeout(()=>{const e=document.getElementById('sx-e');if(e)e.focus();},50);}
  function telaCadastro(){bd().innerHTML=`<b>Solicitar acesso</b><label for="sx-n">Nome completo</label><input id="sx-n" autocomplete="name"><label for="sx-e">E-mail corporativo</label><input id="sx-e" type="email" autocomplete="username">
    <label for="sx-s">Crie uma senha (mínimo 8 caracteres)</label><input id="sx-s" type="password" autocomplete="new-password">
    <button class="p" id="sx-go">Solicitar</button><div id="sx-msg"></div><p style="margin:12px 0 0;font-size:12px">O moderador libera o acesso e define o que você vê. <a id="sx-vol">Voltar</a></p>`;
    document.getElementById('sx-vol').onclick=telaEntrar;
    document.getElementById('sx-go').onclick=async()=>{const n=document.getElementById('sx-n').value.trim(),em=document.getElementById('sx-e').value.trim(),s=document.getElementById('sx-s').value;
      if(n.length<3){msg('Informe o nome.','e');return;}if(s.length<8){msg('A senha precisa ter pelo menos 8 caracteres.','e');return;}
      const b=document.getElementById('sx-go');b.disabled=true;NOME_NOVO=n;
      try{const c=await authMod.createUserWithEmailAndPassword(auth,em,s);try{await authMod.updateProfile(c.user,{displayName:n});}catch(e){}}catch(e){msg(erroTxt(e),'e');b.disabled=false;}};}
  let NOME_NOVO='';
  function telaAguardando(st){ui();document.getElementById('sx-ov').hidden=false;
    bd().innerHTML=st==='bloqueado'?`<b>Acesso bloqueado</b><p>O moderador bloqueou este acesso. Fale com a Prevenção de Perdas.</p><a id="sx-out">Sair</a>`
      :`<b>Aguardando liberação</b><p>Seu pedido foi registrado. Assim que o moderador aprovar, esta página abre sozinha.</p><a id="sx-out">Sair</a>`;
    document.getElementById('sx-out').onclick=()=>authMod.signOut(auth);}
  function barra(){if(document.getElementById('sx-bar'))return;const b=document.createElement('div');b.id='sx-bar';
    const nome=PERFIL.nome||PERFIL.email;b.innerHTML=`<span>${esc(nome)} · ${esc({moderador:'Moderador',piloto:'Piloto',leitor:'Leitura'}[PERFIL.papel]||PERFIL.papel)}</span>${PERFIL.papel==='moderador'?`<a href="${RAIZ}moderacao/">Usuários</a><a href="${RAIZ}importar/">Importar dados</a>`:''}<a id="sx-sair">Sair</a>`;
    document.body.appendChild(b);document.getElementById('sx-sair').onclick=()=>authMod.signOut(auth).then(()=>location.reload());}

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
  const DB={doc:p=>D(fs.doc(DBF,caminho(p))),collection:p=>COL(p)};
  const USER={
    isOwner:async()=>PERFIL.papel==='moderador',canEdit:async()=>PERFIL.papel==='moderador'||PERFIL.papel==='piloto',
    can:async n=>n==='data.write'?(PERFIL.papel!=='leitor'):null,
    id:async()=>UID,me:async()=>({id:UID,name:PERFIL.nome||'',email:PERFIL.email||null}),
    profiles:async ids=>{const out={};for(const id of ids||[]){try{const s=await fs.getDoc(fs.doc(DBF,'usuarios/'+id));const d=s.exists()?s.data():{};out[id]={id,name:d.nome||'',email:d.email||null};}catch(e){out[id]={id,name:''};}}return out;},
    search:async()=>[]};
  const DOWNLOADS={save:async({filename,data})=>{const blob=data instanceof Blob?data:new Blob([data]);const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=filename||'arquivo';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);return {ok:true};}};

  window.claude={use:async nome=>{await READY;
    if(nome==='db')return DB;if(nome==='user')return USER;if(nome==='downloads')return DOWNLOADS;
    return null;}};
  window.SENNA={pronto:READY,modulo:MOD,perfil:()=>PERFIL,fs:()=>fs,base:()=>DBF,
    embutido:async nome=>{await READY;const m=await fs.getDoc(fs.doc(DBF,'embutidos/'+nome));
      if(!m.exists())throw new Error('Dado "'+nome+'" não foi importado. Use Importar dados.');
      let z='';for(let i=0;i<m.data().partes;i++){const p=await fs.getDoc(fs.doc(DBF,'embutidos/'+nome+'/partes/p'+i));z+=p.data().z;}return z;}};

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
        document.getElementById('sx-ov').hidden=true;barra();pronto();});
    });}
  const go=()=>{ui();iniciar().catch(e=>{bd().innerHTML='<b>Erro ao iniciar</b><p>'+esc(e.message||e)+'</p>';});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
})();
