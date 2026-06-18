/* ══════════════════════════════════════════════════════════
   FIREBASE
══════════════════════════════════════════════════════════ */
var firebaseConfig = {
  apiKey: 'AIzaSyDi6CPHzqfAvRbofkB4cW4bFRWb9VcU9kQ',
  authDomain: 'mapa-plano-montichef.firebaseapp.com',
  projectId: 'mapa-plano-montichef',
  storageBucket: 'mapa-plano-montichef.firebasestorage.app',
  messagingSenderId: '18469178569',
  appId: '1:18469178569:web:92d72ee3e0e0e399619118'
};
if(!firebase.apps.length){firebase.initializeApp(firebaseConfig);}
var _db=firebase.firestore(),_auth=firebase.auth(),_currentUser=null,_userPerms=null;
var ADMIN_EMAIL='marcoaraya1973@gmail.com';

/* ── Overlays y mensajes ── */
function _showLanding(show){document.getElementById('landing-overlay').style.display=show?'':'none';}
function _showLoginOverlay(show){document.getElementById('login-overlay').style.display=show?'':'none';}
function _showStatusOverlay(show){document.getElementById('status-overlay').style.display=show?'':'none';}
function _showPlansOverlay(show){document.getElementById('plans-overlay').style.display=show?'':'none';}
function _setLoginError(msg){document.getElementById('login-error').textContent=msg||'';}
function _setLoginInfo(msg){document.getElementById('login-info').textContent=msg||'';}
function _isAdminEmail(em){return(em||'').toLowerCase()===ADMIN_EMAIL;}
function _escHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function _updateAuthBar(user){
  var info=document.getElementById('auth-user-info'),nm=document.getElementById('auth-name'),adminLink=document.getElementById('admin-link');
  if(user){info.style.display='flex';nm.textContent=user.displayName||user.email;adminLink.style.display=_isAdminEmail(user.email)?'':'none';}
  else{info.style.display='none';}
}

/* ── Traducción de errores Firebase ── */
function _firebaseAuthMsg(err){
  switch(err.code||''){
    case 'auth/invalid-email':return 'Correo inválido.';
    case 'auth/user-not-found':case 'auth/wrong-password':case 'auth/invalid-credential':case 'auth/invalid-login-credentials':return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use':return 'Ya existe una cuenta con ese correo.';
    case 'auth/weak-password':return 'La contraseña es muy débil (mín. 6 caracteres).';
    case 'auth/too-many-requests':return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
    case 'auth/network-request-failed':return 'Sin conexión a internet.';
    case 'auth/operation-not-allowed':return 'El acceso por correo/contraseña no está habilitado en Firebase.';
    default:return err.message||'Error desconocido.';
  }
}

/* ── Tabs login / registro ── */
function _showLoginTab(which){
  var isLogin=which==='login';
  document.getElementById('tab-login').classList.toggle('active',isLogin);
  document.getElementById('tab-register').classList.toggle('active',!isLogin);
  document.getElementById('form-login').style.display=isLogin?'':'none';
  document.getElementById('form-register').style.display=isLogin?'none':'';
  _setLoginError('');_setLoginInfo('');
}
document.getElementById('tab-login').addEventListener('click',function(){_showLoginTab('login');});
document.getElementById('tab-register').addEventListener('click',function(){_showLoginTab('register');});

/* ── Portada → abrir formulario ── */
function _openAuth(tab){_showLanding(false);_showLoginOverlay(true);_showLoginTab(tab);}
document.getElementById('lp-login').addEventListener('click',function(){_openAuth('login');});
document.getElementById('lp-register').addEventListener('click',function(){_openAuth('register');});
document.getElementById('lp-cta-have').addEventListener('click',function(){_openAuth('login');});
document.getElementById('lp-cta-start').addEventListener('click',function(){_openAuth('register');});
document.getElementById('login-back').addEventListener('click',function(){_showLoginOverlay(false);_setLoginError('');_setLoginInfo('');_showLanding(true);});

/* ── Puntos animados de la portada ── */
(function _initLandingDots(){
  var box=document.getElementById('lp-dots');if(!box)return;
  var w=window.innerWidth,h=window.innerHeight,n=44;
  for(var i=0;i<n;i++){
    var d=document.createElement('span');d.className='lp-dot';
    var s=Math.random()*3+1.5;
    d.style.width=s+'px';d.style.height=s+'px';
    d.style.left=(Math.random()*w)+'px';d.style.top=(Math.random()*h)+'px';
    d.style.animationDelay=(Math.random()*4)+'s,'+(Math.random()*9)+'s';
    box.appendChild(d);
  }
})();

/* ── Iniciar sesión ── */
document.getElementById('form-login').addEventListener('submit',function(e){
  e.preventDefault();_setLoginError('');_setLoginInfo('');
  var em=document.getElementById('li-email').value.trim(),pw=document.getElementById('li-pass').value;
  _auth.signInWithEmailAndPassword(em,pw).catch(function(err){_setLoginError(_firebaseAuthMsg(err));});
});

/* ── Crear cuenta ── */
document.getElementById('form-register').addEventListener('submit',function(e){
  e.preventDefault();_setLoginError('');_setLoginInfo('');
  var name=document.getElementById('re-name').value.trim(),em=document.getElementById('re-email').value.trim();
  var pw=document.getElementById('re-pass').value,pw2=document.getElementById('re-pass2').value;
  if(name.length<2){_setLoginError('Ingresa tu nombre completo.');return;}
  if(pw.length<6){_setLoginError('La contraseña debe tener al menos 6 caracteres.');return;}
  if(pw!==pw2){_setLoginError('Las contraseñas no coinciden.');return;}
  _auth.createUserWithEmailAndPassword(em,pw).then(function(cred){
    var user=cred.user;
    return user.updateProfile({displayName:name}).then(function(){
      return _db.collection('users').doc(user.uid).set({
        name:name,email:em,mapaRiesgo:false,planoEmerg:false,expDate:null,createdAt:Date.now(),role:'user'
      });
    });
  }).then(function(){
    /* onAuthStateChanged mostrará la pantalla "pendiente" */
  }).catch(function(err){_setLoginError(_firebaseAuthMsg(err));});
});

/* ── Recuperar contraseña ── */
document.getElementById('li-forgot').addEventListener('click',function(){
  var em=document.getElementById('li-email').value.trim();
  if(!em){_setLoginError('Escribe tu correo arriba y vuelve a tocar este botón.');return;}
  _auth.sendPasswordResetEmail(em).then(function(){
    _setLoginError('');_setLoginInfo('Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja y spam.');
  }).catch(function(err){_setLoginError(_firebaseAuthMsg(err));});
});

/* ── Cerrar sesión ── */
document.getElementById('btn-logout').addEventListener('click',function(){_auth.signOut();});
document.getElementById('status-logout').addEventListener('click',function(){_auth.signOut();});

/* ── Pantallas de estado ── */
function _showPending(msg){
  _showLanding(false);_showLoginOverlay(false);_showPlansOverlay(false);
  document.getElementById('status-icon').textContent='⏳';
  document.getElementById('status-title').textContent='Cuenta pendiente de aprobación';
  document.getElementById('status-msg').textContent=msg||'Tu cuenta fue creada. El administrador debe habilitar tu acceso antes de que puedas ingresar.';
  _showStatusOverlay(true);
}
function _showExpired(){
  _showLanding(false);_showLoginOverlay(false);_showPlansOverlay(false);
  document.getElementById('status-icon').textContent='⛔';
  document.getElementById('status-title').textContent='Acceso expirado';
  document.getElementById('status-msg').textContent='Tu acceso ha caducado. Contacta al administrador para renovar tu plazo.';
  _showStatusOverlay(true);
}

/* ── Aplicar permisos a las pestañas de modo ── */
function _applyPermsToTabs(){
  var p=_userPerms||{mapaRiesgo:true,planoEmerg:true};
  var tabR=document.getElementById('modetab-riesgos'),tabE=document.getElementById('modetab-evacuacion');
  tabR.style.display=p.mapaRiesgo?'':'none';
  tabE.style.display=p.planoEmerg?'':'none';
  if(!p.mapaRiesgo&&p.planoEmerg){if(_appMode!=='evacuacion')switchMode('evacuacion');}
  else if(p.mapaRiesgo&&!p.planoEmerg){if(_appMode!=='riesgos')switchMode('riesgos');}
}

/* ── Mostrar/ocultar contraseña (ojo) ── */
document.querySelectorAll('.pw-toggle').forEach(function(btn){
  btn.addEventListener('click',function(){
    var inp=btn.parentNode.querySelector('input');
    if(!inp)return;
    var show=inp.type==='password';
    inp.type=show?'text':'password';
    btn.classList.toggle('on',show);
    btn.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');
  });
});

/* ── Toast ── */
function _showToast(msg,isError){var t=document.getElementById('_toast');if(!t){t=document.createElement('div');t.id='_toast';document.body.appendChild(t);}t.textContent=msg;t.style.background=isError?'#7f1d1d':'#14532d';t.style.color='#fff';t.style.opacity='1';clearTimeout(t._to);t._to=setTimeout(function(){t.style.opacity='0';},2800);}

/* ══════════════════════════════════════════════════════════
   ESTADO DE PLANOS
══════════════════════════════════════════════════════════ */
var _editCtx=null;            /* {uid,user} cuando el admin edita el plano de un usuario */
var _planOwnerUid=null;       /* dueño de los planos en uso (null = usuario actual) */
var _planMeta=null;           /* {id,name,builtin} del plano abierto */
var _planLoaded=false;        /* hay un plano abierto y listo para autoguardar */
var _planSaveTimer=null;
var _lastOpenedPlanId=null;   /* para "Volver al editor" */
function _updateResumeBtn(){var b=document.getElementById('plans-resume');if(b)b.style.display=_lastOpenedPlanId?'':'none';}
function _ownerUid(){return _planOwnerUid||(_currentUser&&_currentUser.uid);}
function _plansCol(){return _db.collection('users').doc(_ownerUid()).collection('plans');}

/* ── Comprimir imagen subida (canvas → JPEG, ajusta para caber en Firestore) ── */
function _compressImage(file,cb){
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var settings=[[1600,0.82],[1400,0.75],[1200,0.68],[1000,0.6]],out=null;
      for(var i=0;i<settings.length;i++){
        var max=settings[i][0],q=settings[i][1],w=img.width,h=img.height;
        if(w>h&&w>max){h=Math.round(h*max/w);w=max;}
        else if(h>=w&&h>max){w=Math.round(w*max/h);h=max;}
        var c=document.createElement('canvas');c.width=w;c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        out=c.toDataURL('image/jpeg',q);
        if(out.length<=900000||i===settings.length-1)break;
      }
      cb(out);
    };
    img.onerror=function(){cb(null);};
    img.src=e.target.result;
  };
  reader.onerror=function(){cb(null);};
  reader.readAsDataURL(file);
}

/* ── Subir un plano nuevo ── */
function _uploadPlanFile(file){
  if(!file)return;
  if(!/^image\//.test(file.type)){_showToast('Selecciona una imagen (JPG o PNG).',true);return;}
  _showToast('Procesando imagen…');
  _compressImage(file,function(dataUrl){
    if(!dataUrl){_showToast('No se pudo leer la imagen.',true);return;}
    var name=(file.name||'Plano').replace(/\.[^.]+$/,'').slice(0,40)||'Plano';
    _plansCol().add({name:name,img:dataUrl,builtin:false,markers:[],zw:100,title:name,createdAt:Date.now(),updatedAt:Date.now()})
      .then(function(ref){_showToast('Plano subido');_openPlan(ref.id);})
      .catch(function(e){_showToast('Error al subir: '+e.message,true);});
  });
}

/* ── Listar y renderizar planos del usuario ── */
function _loadUserPlans(){
  var grid=document.getElementById('plans-grid');
  grid.innerHTML='<div class="plans-loading">Cargando tus planos…</div>';
  _plansCol().get().then(function(snap){
    var list=[];snap.forEach(function(d){var v=d.data();v._id=d.id;list.push(v);});
    list=list.filter(function(p){return !p.builtin && String(p._id).indexOf('montichef-')!==0;});
    list.sort(function(a,b){return(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0);});
    _renderPlansGrid(list);
  }).catch(function(e){grid.innerHTML='<div class="plans-loading" style="color:#f87171">Error al cargar: '+_escHtml(e.message)+'</div>';});
}

function _renderPlansGrid(list){
  var grid=document.getElementById('plans-grid');grid.innerHTML='';
  var isAdmin=_currentUser&&_isAdminEmail(_currentUser.email)&&!_planOwnerUid;
  if(isAdmin){
    _BUILTIN_PLAN_IMGS.forEach(function(img,i){
      grid.appendChild(_planCard({_id:'montichef-'+(i+1),name:'MONTICHEF — Nivel '+(i+1),img:img,builtin:true},true));
    });
  }
  if(!list.length){
    if(!isAdmin){grid.innerHTML='<div class="plans-empty">Aún no tienes planos.<br>Toca <b>+ Subir plano</b> para empezar.</div>';}
    return;
  }
  list.forEach(function(p){grid.appendChild(_planCard(p,false));});
}

function _planCard(p,builtin){
  var card=document.createElement('div');card.className='plan-card';
  var thumb=p.img?('<img src="'+p.img+'" alt="">'):'<div class="plan-card-noimg">Sin imagen</div>';
  card.innerHTML='<div class="plan-card-thumb">'+thumb+'</div>'
    +'<div class="plan-card-foot"><span class="plan-card-name" title="Abrir">'+_escHtml(p.name||'Plano')+'</span>'
    +'<div class="plan-card-acts">'
    +(builtin?'<span class="plan-tag">demo</span>':'<button class="pc-btn pc-ren" title="Renombrar">✎</button><button class="pc-btn pc-del" title="Eliminar">🗑</button>')
    +'</div></div>';
  card.querySelector('.plan-card-thumb').addEventListener('click',function(){_openPlan(p._id);});
  card.querySelector('.plan-card-name').addEventListener('click',function(){_openPlan(p._id);});
  if(!builtin){
    card.querySelector('.pc-ren').addEventListener('click',function(e){e.stopPropagation();_renamePlan(p._id,p.name);});
    card.querySelector('.pc-del').addEventListener('click',function(e){e.stopPropagation();_deletePlan(p._id,p.name);});
  }
  return card;
}

/* ── Abrir un plano en el editor ── */
function _openPlan(planId){
  _plansCol().doc(planId).get().then(function(doc){
    var builtinIdx=-1;
    if(String(planId).indexOf('montichef-')===0)builtinIdx=parseInt(planId.split('-')[1])-1;
    var data;
    if(doc.exists){data=doc.data();}
    else if(builtinIdx>=0){
      data={name:'MONTICHEF — Nivel '+(builtinIdx+1),builtin:true,builtinRef:builtinIdx,markers:[],zw:100,title:'MONTICHEF — Nivel '+(builtinIdx+1)};
      _plansCol().doc(planId).set(Object.assign({createdAt:Date.now(),updatedAt:Date.now()},data));
    }else{_showToast('El plano ya no existe.',true);return;}
    var isB=!!(data.builtin)||builtinIdx>=0;
    var refIdx=(data.builtinRef!=null?data.builtinRef:builtinIdx);
    var img=isB?_BUILTIN_PLAN_IMGS[refIdx]:(data.img||'');
    _planMeta={id:planId,name:data.name||'Plano',builtin:isB};
    _currentPlan=planId;
    window._currentPlanName=data.name||'Plano';
    document.getElementById('planImg').src=img;
    /* Fondo blanco para planos CAD (imagen clara), oscuro para el resto */
    var zw=document.getElementById('zoom-wrap');
    if(zw)zw.style.background=data.cad?'#f1f5f9':'';
    document.getElementById('current-plan-name').textContent=data.name||'Plano';
    if(document.getElementById('titleInput'))document.getElementById('titleInput').value=data.title||data.name||'';
    _planLoaded=false;
    _restorePlanMarkers(data.markers||[]);
    _planLoaded=true;
    _lastOpenedPlanId=planId;
    _showPlansOverlay(false);
  }).catch(function(e){_showToast('Error al abrir el plano: '+e.message,true);});
}

/* ── Reconstruir markers del plano ── */
function _restorePlanMarkers(arr){
  document.querySelectorAll('.marker').forEach(function(m){m.remove();});
  var prevMode=_appMode;
  (arr||[]).forEach(function(entry){
    _appMode=entry.mode||'riesgos';
    var xPct=parseFloat(entry.left),yPct=parseFloat(entry.top);
    try{
      if(entry.isArrow){
        var ml=document.getElementById('markerLayer'),cb=ml.querySelectorAll('.evac-arrow').length;
        addEvacArrow(parseFloat(entry.angle||0),xPct,yPct);
        var a=ml.querySelectorAll('.evac-arrow')[cb];
        if(a&&entry.wpct){a.dataset.wpct=entry.wpct;a.dataset.hpct=entry.hpct;a.style.width=entry.width||'140px';a.style.height=entry.height||'18px';_updateArrowInner(a);}
      }else{
        var risk=null,color=entry.itemColor||'#888';
        if(entry.itemId==='estoy_aqui')risk=_EA_ITEM;
        else if(entry.isEvac)EVAC_ITEMS.forEach(function(it){if(it.id===entry.itemId)risk=Object.assign({},it,{_isEvac:true});});
        else RISKS.forEach(function(it){if(it.id===entry.itemId)risk=it;});
        if(risk){addMarker(risk,color,xPct,yPct);var last=document.getElementById('markerLayer').querySelector('.marker:not(.evac-arrow):last-child');if(last){if(entry.label){var lbl=last.querySelector('.mlabel');if(lbl)lbl.innerText=entry.label;}if(entry.markerScale)last.dataset.markerScale=entry.markerScale;}}
      }
    }catch(err){console.warn('restore marker',err);}
  });
  _appMode=prevMode;
  _applyPermsToTabs();
  switchMode(_appMode);
  showPlan(_currentPlan);
  _scaleMarkers();_scaleArrows();
}

/* ── Serializar / guardar el plano abierto ── */
function _serializeMarkers(){
  var markers=[];
  document.querySelectorAll('.marker').forEach(function(m){
    markers.push({left:m.style.left,top:m.style.top,mode:m.dataset.mode||'riesgos',isArrow:m.dataset.isArrow==='1',itemId:m.dataset.itemId||'',itemColor:m.dataset.itemColor||'',isEvac:m.dataset.itemIsEvac==='1',label:(m.querySelector('.mlabel')||{}).innerText||'',angle:m.dataset.angle||'0',wpct:m.dataset.wpct||'0',hpct:m.dataset.hpct||'0',width:m.style.width,height:m.style.height,markerScale:m.dataset.markerScale||'1'});
  });
  return markers;
}
function _savePlanNow(cb){
  if(!_planLoaded||!_planMeta){if(cb)cb();return;}
  var upd={markers:_serializeMarkers(),zw:_zw,title:(document.getElementById('titleInput')||{}).value||'',updatedAt:Date.now()};
  _plansCol().doc(_planMeta.id).set(upd,{merge:true}).then(function(){if(cb)cb();}).catch(function(e){_showToast('Error al guardar: '+e.message,true);});
}
function _schedulePlanSave(){if(!_planLoaded)return;clearTimeout(_planSaveTimer);_planSaveTimer=setTimeout(function(){_savePlanNow();},1200);}

/* ── Volver a "Mis planos" ── */
function _backToPlans(){
  _savePlanNow();
  _planLoaded=false;_planMeta=null;
  document.querySelectorAll('.marker').forEach(function(m){m.remove();});
  document.getElementById('planImg').src='';
  _showPlansOverlay(true);
  _updateResumeBtn();
  _loadUserPlans();
}
function _renamePlan(id,cur){
  var nv=prompt('Nuevo nombre del plano:',cur||'');
  if(nv==null)return;nv=nv.trim().slice(0,40);if(!nv)return;
  _plansCol().doc(id).set({name:nv,title:nv,updatedAt:Date.now()},{merge:true}).then(function(){_loadUserPlans();}).catch(function(e){_showToast('Error: '+e.message,true);});
}
function _deletePlan(id,name){
  if(!confirm('¿Eliminar el plano "'+(name||'')+'" y todos sus dibujos?\nEsta acción no se puede deshacer.'))return;
  _plansCol().doc(id).delete().then(function(){_showToast('Plano eliminado');_loadUserPlans();}).catch(function(e){_showToast('Error al eliminar: '+e.message,true);});
}

/* ── Wiring botones de planos ── */
document.getElementById('plans-resume').addEventListener('click',function(){if(_lastOpenedPlanId)_openPlan(_lastOpenedPlanId);});
document.getElementById('plans-upload-btn').addEventListener('click',function(){document.getElementById('plans-file').click();});
document.getElementById('plans-file').addEventListener('change',function(){var f=this.files&&this.files[0];if(f)_uploadPlanFile(f);this.value='';});
document.getElementById('btnMisPlanos').addEventListener('click',_backToPlans);

/* ══════════════════════════════════════════════════════════
   MODO EDICIÓN ADMIN — index.html?au=<uid>&ap=<planId>
══════════════════════════════════════════════════════════ */
function _parseEditParams(){
  try{var p=new URLSearchParams(location.search);var au=p.get('au'),ap=p.get('ap');if(au&&ap)return{uid:au,planId:ap};}catch(e){}
  return null;
}
function _enterAdminEdit(ctx){
  _planOwnerUid=ctx.uid;
  _db.collection('users').doc(ctx.uid).get().then(function(userDoc){
    var uname=userDoc.exists?(userDoc.data().name||userDoc.data().email||'usuario'):'usuario';
    _editCtx={uid:ctx.uid,user:uname};
    document.getElementById('edit-banner-txt').innerHTML='✎ Editando un plano de <b>'+_escHtml(uname)+'</b> — los cambios se guardan en su cuenta.';
    document.getElementById('edit-banner').style.display='flex';
    var bp=document.getElementById('btnMisPlanos');if(bp)bp.style.display='none';
    _openPlan(ctx.planId);
  }).catch(function(e){_showToast('Error al abrir: '+e.message,true);});
}
document.getElementById('edit-save').addEventListener('click',function(){
  _savePlanNow(function(){_showToast('Cambios guardados en la cuenta de '+((_editCtx&&_editCtx.user)||'usuario'));});
});
document.getElementById('edit-exit').addEventListener('click',function(){location.href=location.pathname;});

/* ══════════════════════════════════════════════════════════
   ESTADO DE AUTENTICACIÓN
══════════════════════════════════════════════════════════ */
function _grantAccess(){
  _showStatusOverlay(false);_showLoginOverlay(false);_showLanding(false);
  _updateAuthBar(_currentUser);
  _applyPermsToTabs();
}
function _enterApp(){
  _grantAccess();
  var ec=_parseEditParams();
  if(ec&&_isAdminEmail(_currentUser.email)){setTimeout(function(){_enterAdminEdit(ec);},150);return;}
  _showPlansOverlay(true);
  _updateResumeBtn();
  _loadUserPlans();
}

_auth.onAuthStateChanged(function(user){
  _currentUser=user;
  if(!user){
    _userPerms=null;
    _showStatusOverlay(false);_showLoginOverlay(false);_showPlansOverlay(false);
    _showLanding(true);
    _updateAuthBar(null);
    return;
  }
  _showLoginOverlay(false);
  if(_isAdminEmail(user.email)){
    _userPerms={mapaRiesgo:true,planoEmerg:true,admin:true};
    _enterApp();
    return;
  }
  _db.collection('users').doc(user.uid).get().then(function(doc){
    var d=doc.exists?doc.data():null;
    if(!d){_showPending();return;}
    if(d.expDate){
      var today=new Date();today.setHours(0,0,0,0);
      var exp=new Date(d.expDate+'T23:59:59');
      if(exp<today){_showExpired();return;}
    }
    if(!d.mapaRiesgo&&!d.planoEmerg){_showPending();return;}
    _userPerms={mapaRiesgo:!!d.mapaRiesgo,planoEmerg:!!d.planoEmerg,admin:false};
    _enterApp();
  }).catch(function(e){
    _setLoginError('Error al verificar tu cuenta: '+e.message);
    _showLoginOverlay(true);
  });
});

/* ══════════════════════════════════════════════════════════
   AUTO-GUARDADO del plano abierto (observa cambios en el canvas)
══════════════════════════════════════════════════════════ */
setTimeout(function(){
  var ml=document.getElementById('markerLayer');
  if(ml&&window.MutationObserver){
    var obs=new MutationObserver(function(){_schedulePlanSave();});
    obs.observe(ml,{childList:true,subtree:true,attributes:true,attributeFilter:['style','data-angle','data-wpct','data-hpct','data-marker-scale']});
  }
},0);
window.addEventListener('beforeunload',function(){if(_planLoaded)_savePlanNow();});
