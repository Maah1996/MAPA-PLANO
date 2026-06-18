

/* Imágenes demo MONTICHEF (solo se muestran como planos de ejemplo en la cuenta admin) */
var _BUILTIN_PLAN_IMGS=["__PLAN_IMG__","__PLAN_IMG__"];
const LEVELS={intolerable:{color:'#e00000',label:'Intolerable (4)'},importante:{color:'#ff8c00',label:'Importante (3)'},moderado:{color:'#f5d000',label:'Moderado (2)'},tolerable:{color:'#7dc560',label:'Tolerable (1)'}};
let currentLevel='intolerable';
const RISKS=[
  {id:'incendio',name:'Incendio',g:'<path d="M32 26c6 7 8 12 4 18 4-1 5-6 3-9 5 5 5 14-7 14s-12-9-7-14c-1 3 0 7 3 8-3-7 1-12 5-17z" fill="#111"/>'},
  {id:'explosion',name:'Explosión / gas',g:'<polygon points="32,25 36,36 47,32 40,41 50,46 39,46 41,55 32,49 23,55 25,46 14,46 24,41 17,32 28,36" fill="#111"/>'},
  {id:'calor',name:'Térmico calor',g:'<g fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round"><path d="M24 47c0-4 3-4 3-8s-3-4-3-8"/><path d="M32 47c0-4 3-4 3-8s-3-4-3-8"/><path d="M40 47c0-4 3-4 3-8s-3-4-3-8"/></g><line x1="20" y1="50" x2="44" y2="50" stroke="#111" stroke-width="2.8"/>'},
  {id:'frio',name:'Térmico frío',g:'<g stroke="#111" stroke-width="2.2" stroke-linecap="round"><line x1="32" y1="29" x2="32" y2="51"/><line x1="23" y1="34" x2="41" y2="46"/><line x1="41" y1="34" x2="23" y2="46"/><line x1="32" y1="33" x2="29" y2="30"/><line x1="32" y1="33" x2="35" y2="30"/><line x1="32" y1="47" x2="29" y2="50"/><line x1="32" y1="47" x2="35" y2="50"/></g>'},
  {id:'cortes',name:'Cortes',g:'<polygon points="20,46 40,30 44,33 26,49" fill="#111"/><rect x="40" y="29" width="9" height="5" rx="1.5" transform="rotate(-39 44 31)" fill="#111"/>'},
  {id:'atrapamiento',name:'Atrapamiento',g:'<path d="M32 28l2.4 4 4.4-1.4 0.6 4.6 4.6 0.6-1.4 4.4 4 2.4-4 2.4 1.4 4.4-4.6 0.6-0.6 4.6-4.4-1.4-2.4 4-2.4-4-4.4 1.4-0.6-4.6-4.6-0.6 1.4-4.4-4-2.4 4-2.4-1.4-4.4 4.6-0.6 0.6-4.6 4.4 1.4z" fill="#111"/><circle cx="32" cy="40" r="4.5" fill="#fff"/>'},
  {id:'caida_mismo',name:'Caída mismo nivel',g:'<circle cx="36" cy="30" r="3.4" fill="#111"/><path d="M36 33c-3 4-2 7-6 8" stroke="#111" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M34 37l5 5" stroke="#111" stroke-width="2.6" stroke-linecap="round"/><path d="M30 41l7 1" stroke="#111" stroke-width="2.6" stroke-linecap="round"/><path d="M20 49q8-4 24-0" stroke="#111" stroke-width="2.2" fill="none" stroke-linecap="round"/>'},
  {id:'caida_distinto',name:'Caída distinto nivel',g:'<circle cx="26" cy="29" r="3.2" fill="#111"/><path d="M26 32l4 6-5 4" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 35l7-2" stroke="#111" stroke-width="2.5" stroke-linecap="round"/><path d="M40 40h6v4h-6v4h-7v4" stroke="#111" stroke-width="2.3" fill="none" stroke-linejoin="round"/>'},
  {id:'electrico',name:'Eléctrico',g:'<polygon points="36,26 24,43 31,43 28,54 41,36 33,36 39,26" fill="#111"/>'},
  {id:'polvo',name:'Polvo / aerosoles',g:'<circle cx="32" cy="44" r="6.5" fill="none" stroke="#111" stroke-width="2.4"/><path d="M32 44v6" stroke="#111" stroke-width="2.4"/><g fill="#111"><circle cx="22" cy="31" r="1.7"/><circle cx="30" cy="29" r="1.7"/><circle cx="38" cy="31" r="1.7"/><circle cx="26" cy="35" r="1.5"/><circle cx="42" cy="35" r="1.5"/><circle cx="34" cy="34" r="1.5"/></g>'},
  {id:'quimicos',name:'Sust. químicas',g:'<path d="M28 28h8v3l-1 1v6l5 9c1 2-0 4-2 4H26c-2 0-3-2-2-4l5-9v-6l-1-1z" fill="none" stroke="#111" stroke-width="2.3" stroke-linejoin="round"/><path d="M27 42h10" stroke="#111" stroke-width="2.3"/>'},
  {id:'vehiculos',name:'Atropello / vehículo',g:'<path d="M16 46h22v-7h8l4 5v2h2" fill="none" stroke="#111" stroke-width="2.4" stroke-linejoin="round"/><line x1="38" y1="32" x2="38" y2="39" stroke="#111" stroke-width="2.4"/><circle cx="22" cy="48" r="3.2" fill="#111"/><circle cx="44" cy="48" r="3.2" fill="#111"/>'},
  {id:'sismo',name:'Sismo / clima',g:'<polyline points="16,40 22,40 26,30 31,50 36,34 40,44 44,40 48,40" fill="none" stroke="#111" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><line x1="16" y1="50" x2="48" y2="50" stroke="#111" stroke-width="2.4"/>'},
  {id:'otros',name:'Otros riesgos',g:'<rect x="29.5" y="29" width="5" height="13" rx="2" fill="#111"/><circle cx="32" cy="48" r="2.8" fill="#111"/>'}
];
var _EA_ITEM={id:'estoy_aqui',name:'Estoy aquí',_isSpecial:true};
function iconSVGEstoyAqui(size){size=size||46;return'<svg width="'+size+'" height="'+size+'" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="30" fill="#ff6600" stroke="#111" stroke-width="2.5"/><text x="32" y="25" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="#111" text-anchor="middle" dominant-baseline="middle">Estoy</text><text x="32" y="43" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="#111" text-anchor="middle" dominant-baseline="middle">aquí</text></svg>';}
function iconSVG(g,color,size){size=size||46;return'<svg width="'+size+'" height="'+size+'" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="34" r="30" fill="'+color+'" stroke="#1a1a1a" stroke-width="2.5"/><path d="M32 17 L53 50 Q54 52 52 52 L12 52 Q10 52 11 50 Z" fill="#FFD400" stroke="#111" stroke-width="3" stroke-linejoin="round"/>'+g+'</svg>';}

var levelsEl=document.getElementById('levels');
Object.keys(LEVELS).forEach(function(k){var d=document.createElement('div');d.className='lvl'+(k===currentLevel?' active':'');d.dataset.k=k;d.innerHTML='<span class="dot" style="background:'+LEVELS[k].color+'"></span>'+LEVELS[k].label;d.onclick=function(){currentLevel=k;document.querySelectorAll('.lvl').forEach(function(x){x.classList.toggle('active',x.dataset.k===k)});renderPalette();};levelsEl.appendChild(d);});

var iconsEl=document.getElementById('icons');
function renderPalette(){iconsEl.innerHTML='';RISKS.forEach(function(r){var it=document.createElement('div');it.className='pal-item';it.dataset.id=r.id;it.innerHTML=iconSVG(r.g,LEVELS[currentLevel].color,42)+'<span>'+r.name+'</span>';it.addEventListener('mousedown',function(e){startDragFromPalette(e,r);});iconsEl.appendChild(it);});var eaIt=document.createElement('div');eaIt.className='pal-item';eaIt.dataset.id='estoy_aqui';eaIt.innerHTML=iconSVGEstoyAqui(42)+'<span>Estoy aquí</span>';eaIt.addEventListener('mousedown',function(e){startDragFromPalette(e,_EA_ITEM);});iconsEl.appendChild(eaIt);}
renderPalette();

var legendEl=document.getElementById('legend'),legendOn=true;

/* ── Estado global ── */
var ghost=null,draggingNew=null,movingMarker=null;
var _appMode='riesgos',_currentPlan=1,_zw=100;

/* ── Singular/plural español para leyenda ── */
function _singForm(name,n){
  if(n!==1)return name;
  return name.replace(/^(\S+)/,function(w){
    if(/[^aeiouáéíóuAEIOUÁÉÍÓÚ]es$/i.test(w))return w.slice(0,-2); /* MEDIDORES→MEDIDOR */
    if(/[aeiouáéíóuAEIOUÁÉÍÓÚ]s$/i.test(w))return w.slice(0,-1);   /* FLECHAS→FLECHA */
    if(/[^aeiouáéíóuAEIOUÁÉÍÓÚ]s$/i.test(w))return w.slice(0,-1);  /* otros en S */
    return w;
  });
}

/* ── Leyenda dinámica ── */
var _LEG_ICO=32; /* tamaño íconos en leyenda px */
function _renderLegendSummary(){
  if(!legendEl)return;
  var isR=_appMode==='riesgos';
  var allM=[].slice.call(document.querySelectorAll('.marker:not(.evac-arrow)'));
  var curr=allM.filter(function(m){return(m.dataset.mode||'riesgos')===_appMode&&String(m.dataset.plan||1)===String(_currentPlan);});
  var title=isR?'Mapa de riesgos':'Plano de evacuación';
  var html='<div class="legend-drag"><span class="drag-grip">⠿</span><span style="flex:1">'+title+'</span><button class="leg-sz" data-d="-1" title="Achicar">−</button><button class="leg-sz" data-d="1" title="Agrandar">+</button><button class="leg-sz leg-rot" data-rot="1" title="Girar leyenda">↻</button></div>';

  if(isR){
    var byLvl={},eaCnt=0;
    curr.forEach(function(m){var id=m.dataset.itemId||'',c=m.dataset.itemColor||'';if(id==='estoy_aqui'){eaCnt++;return;}if(!byLvl[c])byLvl[c]=[];var found=false;byLvl[c].forEach(function(g){if(g.id===id){g.n++;found=true;}});if(!found)byLvl[c].push({id:id,n:1});});
    var anyItems=Object.keys(byLvl).some(function(c){return byLvl[c].length>0;})||eaCnt>0;
    if(!anyItems){
      html+='<div style="opacity:0.55;font-size:0.85em;margin-top:4px">Sin íconos en este plano</div>';
    }else{
      Object.keys(LEVELS).forEach(function(lk){
        var lc=LEVELS[lk].color;
        if(!byLvl[lc]||!byLvl[lc].length)return;
        html+='<div class="lvl-head" style="color:'+lc+'">'+LEVELS[lk].label+'</div>';
        byLvl[lc].forEach(function(g){
          var nm='',ico='';
          RISKS.forEach(function(r){if(r.id===g.id){nm=r.name;ico=iconSVG(r.g,lc,_LEG_ICO);}});
          html+='<div class="row"><span class="row-icon">'+ico+'</span><span>'+_singForm(nm||g.id,g.n)+(g.n>1?' '+g.n:'')+'</span></div>';
        });
      });
      if(eaCnt)html+='<div class="row"><span class="row-icon">'+iconSVGEstoyAqui(_LEG_ICO)+'</span><span>Estoy aquí'+(eaCnt>1?' '+eaCnt:'')+'</span></div>';
    }
  }else{
    var grps=[],idSet={},eaCnt=0;
    curr.forEach(function(m){var id=m.dataset.itemId||'';if(id==='estoy_aqui'){eaCnt++;return;}if(!idSet[id]){idSet[id]=0;grps.push(id);}idSet[id]++;});
    var arrows=[].slice.call(document.querySelectorAll('.evac-arrow')).filter(function(m){return String(m.dataset.plan||1)===String(_currentPlan);});
    if(!grps.length&&!eaCnt&&!arrows.length){
      html+='<div style="opacity:0.55;font-size:0.85em;margin-top:4px">Sin elementos en este plano</div>';
    }else{
      grps.forEach(function(id){
        var nm='',ico='',n=idSet[id];
        if(typeof EVAC_ITEMS!=='undefined')EVAC_ITEMS.forEach(function(it){if(it.id===id){nm=it.name;ico='<img src="'+it.img+'" style="width:'+_LEG_ICO+'px;height:'+_LEG_ICO+'px;object-fit:contain;border-radius:3px">';}});
        html+='<div class="row"><span class="row-icon">'+ico+'</span><span>'+_singForm(nm||id,n)+(n>1?' '+n:'')+'</span></div>';
      });
      if(eaCnt)html+='<div class="row"><span class="row-icon">'+iconSVGEstoyAqui(_LEG_ICO)+'</span><span>Estoy aquí'+(eaCnt>1?' '+eaCnt:'')+'</span></div>';
      if(arrows.length){
        var arwIco=typeof arrowSVGThumb==='function'?arrowSVGThumb(0):'→';
        var arwNm=arrows.length===1?'Flecha evacuación':'Flechas evacuación';
        html+='<div class="row"><span class="row-icon" style="width:36px;flex:0 0 36px">'+arwIco+'</span><span>'+arwNm+(arrows.length>1?' '+arrows.length:'')+'</span></div>';
      }
    }
  }
  legendEl.innerHTML=html;
}

/* ── Drag + resize + girar leyenda ── */
var _legendScale=1,_legendRot=0;
(function(){
  var _dragging=false,_ox=0,_oy=0,_elx=0,_ely=0;

  legendEl.addEventListener('mousedown',function(e){
    /* Botón girar */
    var rotBtn=e.target.closest&&e.target.closest('.leg-rot');
    if(rotBtn){e.stopPropagation();_legendRot=(_legendRot+90)%360;legendEl.style.transform='scale('+_legendScale+') rotate('+_legendRot+'deg)';legendEl.style.transformOrigin='top left';return;}
    /* Botones tamaño */
    var btn=e.target.closest&&e.target.closest('.leg-sz');
    if(btn){e.stopPropagation();_legendScale=Math.min(2,Math.max(0.6,_legendScale+parseInt(btn.dataset.d)*0.1));legendEl.style.transform='scale('+_legendScale+') rotate('+_legendRot+'deg)';legendEl.style.transformOrigin='top left';return;}
    /* Drag solo desde el handle */
    if(!e.target.closest||!e.target.closest('.legend-drag'))return;
    _dragging=true;
    var ml=document.getElementById('markerLayer'),mr=ml.getBoundingClientRect(),lr=legendEl.getBoundingClientRect();
    _elx=lr.left-mr.left;_ely=lr.top-mr.top;_ox=e.clientX;_oy=e.clientY;
    legendEl.style.left=_elx+'px';legendEl.style.top=_ely+'px';legendEl.style.bottom='auto';legendEl.style.right='auto';
    e.preventDefault();e.stopPropagation();
    document.addEventListener('mousemove',_legMove);document.addEventListener('mouseup',_legUp);
  });
  function _legMove(e){if(!_dragging)return;legendEl.style.left=(_elx+e.clientX-_ox)+'px';legendEl.style.top=(_ely+e.clientY-_oy)+'px';}
  function _legUp(){_dragging=false;document.removeEventListener('mousemove',_legMove);document.removeEventListener('mouseup',_legUp);}
})();

/* ── Drag & Drop ── */
function startDragFromPalette(e,item){
  e.preventDefault();draggingNew=item;ghost=document.createElement('div');ghost.className='dragghost';
  var color=item._isEvac?(item.color||'#217a47'):(item._isSpecial?'#ff6600':LEVELS[currentLevel].color);
  ghost.innerHTML=item._isEvac?iconSVGEvac(item,46):(item._isSpecial?iconSVGEstoyAqui(46):iconSVG(item.g,color,46));
  ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';document.body.appendChild(ghost);
  window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);
}
function onMove(e){
  if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';}
  if(movingMarker){var pos=_toLocalPct(e.clientX,e.clientY);movingMarker.style.left=pos.x+'%';movingMarker.style.top=pos.y+'%';}
}
function onUp(e){
  if(draggingNew){
    var ml=document.getElementById('markerLayer'),r=ml.getBoundingClientRect();
    if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){
      var pos=_toLocalPct(e.clientX,e.clientY);
      if(draggingNew._isArrow)addEvacArrow(draggingNew.angle,pos.x,pos.y);
      else{var clr=draggingNew._isEvac?(draggingNew.color||'#217a47'):(draggingNew._isSpecial?'#ff6600':LEVELS[currentLevel].color);addMarker(draggingNew,clr,pos.x,pos.y);}
    }
    if(ghost)ghost.remove();ghost=null;draggingNew=null;
  }
  movingMarker=null;window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);
}

/* ── Add Marker ── */
function addMarker(risk,color,xPct,yPct){
  var ml=document.getElementById('markerLayer'),m=document.createElement('div');
  m.className='marker';m.style.left=xPct+'%';m.style.top=yPct+'%';
  m.dataset.plan=_currentPlan;m.dataset.mode=_appMode;m.dataset.itemId=risk.id||'';m.dataset.itemColor=color||'';m.dataset.itemIsEvac=risk._isEvac?'1':'0';
  m.dataset.markerScale='1';
  var svgH=risk._isEvac?iconSVGEvac(risk,40):(risk._isSpecial?iconSVGEstoyAqui(40):iconSVG(risk.g,color,40));
  m.innerHTML=svgH+'<div class="mlabel" contenteditable="true" spellcheck="false" title="Clic para escribir etiqueta"></div><div class="del" title="Eliminar">×</div>';
  m.addEventListener('mousedown',function(e){if(e.target.classList.contains('del')||e.target.classList.contains('mlabel'))return;e.preventDefault();var r2=document.getElementById('markerLayer').getBoundingClientRect();m._dragOffX=(e.clientX-r2.left)-parseFloat(m.style.left)/100*r2.width;m._dragOffY=(e.clientY-r2.top)-parseFloat(m.style.top)/100*r2.height;movingMarker=m;window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);});
  m.querySelector('.del').addEventListener('click',function(e){e.stopPropagation();m.remove();_hideMkrPanel();_renderLegendSummary();});
  m.addEventListener('click',function(e){if(e.target.classList.contains('del')||e.target.classList.contains('mlabel'))return;_showMkrPanel(m);});
  ml.appendChild(m);
  _renderLegendSummary();
}

/* ── Marker Float Panel ── */
function _initMkrPanel(){
  if(document.getElementById('mkr-float-panel'))return;
  var p=document.createElement('div');
  p.id='mkr-float-panel';
  p.innerHTML=
    '<button class="afp-toggle" title="Editar ícono">✦ Ícono <span class="afp-chev">▾</span></button>'
    +'<div class="afp-body" style="display:none">'
    +'<div class="afp-section"><span class="afp-lbl">Tamaño</span>'
    +'<button class="afp-btn afp-pm mkp-minus">−</button>'
    +'<span class="afp-num mkp-num" style="min-width:36px;text-align:center">1.0×</span>'
    +'<button class="afp-btn afp-pm mkp-plus">+</button></div>'
    +'<div class="afp-div"></div>'
    +'<div class="afp-section" style="gap:4px">'
    +'<button class="afp-btn afp-btn-rot mkp-rot" data-d="-15">↺</button>'
    +'<span class="afp-num mkp-rot-num" style="min-width:38px;text-align:center">0°</span>'
    +'<button class="afp-btn afp-btn-rot mkp-rot" data-d="15">↻</button>'
    +'<button class="afp-btn afp-btn-rot mkp-rot180">⇄</button>'
    +'</div>'
    +'<div class="afp-div"></div>'
    +'<div class="afp-section"><button class="afp-btn mkp-reset">Reset</button></div>'
    +'<div class="afp-div"></div>'
    +'<div class="afp-section" style="gap:5px">'
    +'<button class="afp-btn mkp-copy">Copiar</button>'
    +'<button class="afp-btn mkp-paste" style="display:none">Pegar</button>'
    +'</div>'
    +'<div class="afp-div"></div>'
    +'<div class="afp-section"><button class="afp-btn afp-del mkp-del">✕ Eliminar</button></div>'
    +'</div>';
  document.body.appendChild(p);

  /* Toggle colapsar/expandir */
  var body=p.querySelector('.afp-body'),chev=p.querySelector('.afp-chev');
  p.querySelector('.afp-toggle').addEventListener('mousedown',function(e){e.stopPropagation();});
  p.querySelector('.afp-toggle').addEventListener('click',function(){
    var open=body.style.display!=='none';
    body.style.display=open?'none':'flex';
    chev.textContent=open?'▾':'▴';
    if(!open){var r2=p.getBoundingClientRect();if(r2.right>window.innerWidth-10)p.style.left=Math.max(10,window.innerWidth-r2.width-10)+'px';}
  });

  var _m=null;
  function _upd(sc){if(!_m)return;sc=Math.max(0.3,Math.min(3,sc));_m.dataset.markerScale=sc.toFixed(2);p.querySelector('.mkp-num').textContent=sc.toFixed(1)+'×';_scaleMarkers();}
  function _updRot(delta){if(!_m)return;var r=(parseFloat(_m.dataset.markerRot||0)+delta+360)%360;_m.dataset.markerRot=r;p.querySelector('.mkp-rot-num').textContent=r+'°';_scaleMarkers();}
  p._set=function(mkr){_m=mkr;if(!mkr)return;var sc=parseFloat(mkr.dataset.markerScale||1);p.querySelector('.mkp-num').textContent=sc.toFixed(1)+'×';var r=parseFloat(mkr.dataset.markerRot||0);p.querySelector('.mkp-rot-num').textContent=r+'°';};

  function _sp(el){el.addEventListener('mousedown',function(e){e.stopPropagation();});}
  _sp(p.querySelector('.mkp-minus'));
  p.querySelector('.mkp-minus').addEventListener('click',function(){if(!_m)return;_upd(parseFloat(_m.dataset.markerScale||1)-0.1);});
  _sp(p.querySelector('.mkp-plus'));
  p.querySelector('.mkp-plus').addEventListener('click',function(){if(!_m)return;_upd(parseFloat(_m.dataset.markerScale||1)+0.1);});
  /* Rotación */
  p.querySelectorAll('.mkp-rot').forEach(function(btn){
    _sp(btn);
    btn.addEventListener('click',function(){_updRot(parseInt(this.dataset.d));});
  });
  _sp(p.querySelector('.mkp-rot180'));
  p.querySelector('.mkp-rot180').addEventListener('click',function(){_updRot(180);});

  _sp(p.querySelector('.mkp-reset'));
  p.querySelector('.mkp-reset').addEventListener('click',function(){_upd(1);if(_m){_m.dataset.markerRot=0;p.querySelector('.mkp-rot-num').textContent='0°';_scaleMarkers();}});

  /* Copiar */
  _sp(p.querySelector('.mkp-copy'));
  p.querySelector('.mkp-copy').addEventListener('click',function(){
    if(!_m)return;
    window._markerClipboard={itemId:_m.dataset.itemId,itemColor:_m.dataset.itemColor,isEvac:_m.dataset.itemIsEvac==='1',markerScale:parseFloat(_m.dataset.markerScale||1),left:parseFloat(_m.style.left),top:parseFloat(_m.style.top)};
    p.querySelector('.mkp-paste').style.display='';
  });
  /* Pegar */
  _sp(p.querySelector('.mkp-paste'));
  p.querySelector('.mkp-paste').addEventListener('click',function(){
    var cb=window._markerClipboard;if(!cb)return;
    var risk=null;
    if(cb.isEvac){EVAC_ITEMS.forEach(function(it){if(it.id===cb.itemId)risk=Object.assign({},it,{_isEvac:true});});}
    else{RISKS.forEach(function(it){if(it.id===cb.itemId)risk=it;});}
    if(!risk)return;
    var xPct=Math.min(95,(cb.left||42)+3),yPct=Math.min(95,(cb.top||42)+3);
    addMarker(risk,cb.itemColor,xPct,yPct);
    var last=document.getElementById('markerLayer').querySelector('.marker:not(.evac-arrow):last-child');
    if(last){last.dataset.markerScale=cb.markerScale;_scaleMarkers();}
    window._markerClipboard.left=xPct;window._markerClipboard.top=yPct;
  });

  _sp(p.querySelector('.mkp-del'));
  p.querySelector('.mkp-del').addEventListener('click',function(){if(!_m)return;_m.remove();_hideMkrPanel();_renderLegendSummary();});
  /* Click fuera: ocultar completamente */
  document.addEventListener('mousedown',function(e){
    if(p.contains(e.target))return;
    _hideMkrPanel();
  });
}
function _showMkrPanel(m){
  _initMkrPanel();
  var p=document.getElementById('mkr-float-panel');
  p._set(m);
  /* expandir directamente */
  var body=p.querySelector('.afp-body'),chev=p.querySelector('.afp-chev');
  if(body)body.style.display='flex';
  if(chev)chev.textContent='▴';
  p.style.display='flex';
  var r=m.getBoundingClientRect(),pH=p.offsetHeight||50,pW=p.offsetWidth||260;
  var top=Math.max(10,r.top-pH-30);
  var left=Math.max(10,Math.min(r.left+(r.width/2)-(pW/2),window.innerWidth-pW-10));
  p.style.top=top+'px';p.style.left=left+'px';
}
function _hideMkrPanel(){var p=document.getElementById('mkr-float-panel');if(p){p.style.display='none';if(p._set)p._set(null);}}

/* ── Zoom / Pan ── */
function _activeImg(){return document.getElementById('planImg');}
function _applyZoom(){
  var ml=document.getElementById('markerLayer');
  ml.style.width=_zw+'%';
  _activeImg().style.width='100%';
  document.getElementById('zoom-pct').textContent=Math.round(_zw)+'%';
  /* Solo aplicar marginTop negativo cuando no hay rotación 90/270 (evita que el plano se corte) */
  if(_planRot===0||_planRot===180){
    ml.style.marginTop=(-380*_zw/100)+'px';
  }
  _scaleMarkers();_scaleArrows();
  /* Re-aplicar rotación para recalcular marginTop con el nuevo tamaño */
  if(_planRot!==0)_applyPlanRotation();
}
function zoomIn(){_zw=Math.min(500,_zw+25);_applyZoom();}
function zoomOut(){_zw=Math.max(30,_zw-25);_applyZoom();}
function zoomReset(){_zw=100;_applyZoom();}

/* ── Rotación del plano completo ── */
var _planRot=0;
function _applyPlanRotation(){
  var ml=document.getElementById('markerLayer');
  var wrap=document.getElementById('zoom-wrap');
  ml.style.transform=_planRot===0?'':'rotate('+_planRot+'deg)';
  ml.style.transformOrigin='center center';
  if(_planRot===90||_planRot===270){
    var mlW=ml.offsetWidth,mlH=ml.offsetHeight;
    /* Empujar hacia abajo para que el borde superior visual quede visible */
    ml.style.marginTop=Math.max(0,(mlW-mlH)/2)+'px';
    /* Scroll para centrar horizontalmente el contenido rotado */
    setTimeout(function(){wrap.scrollLeft=Math.max(0,(mlW-mlH)/2);},0);
  } else {
    ml.style.marginTop=(_planRot===0?-380:0)*_zw/100+'px';
    setTimeout(function(){wrap.scrollLeft=0;},0);
  }
  document.getElementById('rot-deg').textContent=_planRot+'°';
}
document.getElementById('btnRotL').onclick=function(){_planRot=(_planRot-90+360)%360;_applyPlanRotation();};
document.getElementById('btnRotR').onclick=function(){_planRot=(_planRot+90)%360;_applyPlanRotation();};

/* ── Conversión de coordenadas de pantalla a % locales del markerLayer (considera rotación) ── */
function _toLocalPct(clientX,clientY){
  var ml=document.getElementById('markerLayer'),r=ml.getBoundingClientRect();
  if(_planRot===0){
    return{x:Math.max(0,Math.min(100,(clientX-r.left)/r.width*100)),y:Math.max(0,Math.min(100,(clientY-r.top)/r.height*100))};
  }
  var cx=r.left+r.width/2,cy=r.top+r.height/2;
  var dx=clientX-cx,dy=clientY-cy;
  var rad=-_planRot*Math.PI/180;
  var lx=dx*Math.cos(rad)-dy*Math.sin(rad);
  var ly=dx*Math.sin(rad)+dy*Math.cos(rad);
  var origW=(_planRot===90||_planRot===270)?r.height:r.width;
  var origH=(_planRot===90||_planRot===270)?r.width:r.height;
  return{x:Math.max(0,Math.min(100,(lx+origW/2)/origW*100)),y:Math.max(0,Math.min(100,(ly+origH/2)/origH*100))};
}

document.getElementById('zoom-wrap').addEventListener('wheel',function(e){if(e.ctrlKey){e.preventDefault();e.stopPropagation();_zw=Math.min(500,Math.max(30,_zw+(e.deltaY<0?25:-25)));_applyZoom();}else{e.preventDefault();e.stopPropagation();this.scrollTop+=e.deltaY;this.scrollLeft+=e.deltaX;}},{passive:false,capture:true});
(function(){var wrap=document.getElementById('zoom-wrap'),drag=false,sx=0,sy=0,sl=0,st=0;wrap.addEventListener('mousedown',function(e){if(e.button!==0)return;if(e.target.closest&&e.target.closest('.marker'))return;drag=true;sx=e.clientX;sy=e.clientY;sl=wrap.scrollLeft;st=wrap.scrollTop;wrap.style.cursor='grabbing';});document.addEventListener('mousemove',function(e){if(!drag)return;wrap.scrollLeft=sl-(e.clientX-sx);wrap.scrollTop=st-(e.clientY-sy);});document.addEventListener('mouseup',function(){if(drag){drag=false;wrap.style.cursor='grab';}});})();

/* ── showPlan: refresca visibilidad de markers del plano actual + zoom ── */
function showPlan(n){
  if(n!==undefined&&n!==null)_currentPlan=n;
  document.querySelectorAll('.marker').forEach(function(m){
    var modeOk=(m.dataset.mode||'riesgos')===_appMode;
    var planOk=String(m.dataset.plan)===String(_currentPlan);
    m.style.visibility=(modeOk&&planOk)?'visible':'hidden';
  });
  _zw=100;_applyZoom();
  _renderLegendSummary();
}

/* ── switchMode ── */
var _savedTitle={};
function switchMode(mode){
  _appMode=mode;var isR=mode==='riesgos';
  var ti=document.getElementById('titleInput');
  _savedTitle[isR?'evacuacion':'riesgos']=ti.value;
  ti.value=_savedTitle[mode]||(isR?'Mapa de Riesgos — MONTICHEF':'Plano de Evacuación — MONTICHEF');
  document.getElementById('modetab-riesgos').className='mode-tab '+(isR?'active':'inactive');
  document.getElementById('modetab-evacuacion').className='mode-tab '+(isR?'inactive':'active');
  document.getElementById('riesgos-palette').style.display=isR?'':'none';
  document.getElementById('evac-palette').style.display=isR?'none':'';
  legendEl.style.display=legendOn?'block':'none';
  if(!isR){renderEvacPalette();renderArrowPalette();}
  document.querySelectorAll('.marker').forEach(function(m){
    var modeOk=(m.dataset.mode||'riesgos')===mode;
    var planOk=String(m.dataset.plan)===String(_currentPlan);
    m.style.visibility=(modeOk&&planOk)?'visible':'hidden';
  });
  _renderLegendSummary();
}

/* ── Toolbar ── */
document.getElementById('clearBtn').onclick=function(){var label=_appMode==='riesgos'?'íconos de riesgos':'elementos de evacuación';if(confirm('¿Eliminar todos los '+label+' del modo actual?')){document.querySelectorAll('.marker').forEach(function(m){if((m.dataset.mode||'riesgos')===_appMode)m.remove();});_renderLegendSummary();}};
document.getElementById('toggleLegend').onclick=function(){legendOn=!legendOn;legendEl.style.display=legendOn?'block':'none';this.textContent=legendOn?'Ocultar leyenda':'Mostrar leyenda';};
_renderLegendSummary();
_applyZoom(); /* aplicar marginTop inicial para que el plano quede pegado arriba desde el inicio */