/* ── Leyenda estilo "ficha" (según foto de referencia) ──────────────────────
   Tarjeta vertical con: caja de título + metadatos (Fecha/Versión/Elaborado
   por), bloque LEYENDA RIESGOS, bloque SIMBOLOGÍA y bloque ZONA DE SEGURIDAD.
   Dinámica: muestra solo lo colocado en el plano (sin cantidades). El MISMO
   builder se usa en pantalla y en el export PNG/PDF. */

/* Metadatos de la cabecera (editables en pantalla, persistidos en localStorage) */
var _legMeta=(function(){try{return JSON.parse(localStorage.getItem('mpl_legmeta_v1'))||{};}catch(e){return {};}})();
function _legMetaSave(){try{localStorage.setItem('mpl_legmeta_v1',JSON.stringify(_legMeta));}catch(e){}}
/* Los datos del cuadro son INDEPENDIENTES por modo: Mapa de Riesgos ('ri_') y Plano de
   Evacuación ('ev_') pueden tener otra fecha, versión, autor, título o local. */
function _mplMK(k){return ((typeof _appMode!=='undefined'&&_appMode==='evacuacion')?'ev_':'ri_')+k;}
/* Migración única: antes los datos eran compartidos (claves sin prefijo). Se copian a
   los dos modos para no perder lo ya escrito; desde ahí cada modo evoluciona solo. */
(function(){
  if(_legMeta._mig_modos)return;
  ['local','fecha','version','elaborado'].forEach(function(k){
    if(_legMeta[k]!=null&&_legMeta[k]!==''){if(_legMeta['ri_'+k]==null)_legMeta['ri_'+k]=_legMeta[k];if(_legMeta['ev_'+k]==null)_legMeta['ev_'+k]=_legMeta[k];}
  });
  if(_legMeta.titulo_riesgos)_legMeta.ri_titulo=_legMeta.titulo_riesgos;
  if(_legMeta.titulo_evac)_legMeta.ev_titulo=_legMeta.titulo_evac;
  _legMeta._mig_modos=1;_legMetaSave();
})();
function _mplMetaVal(k,def){return (_legMeta[k]!=null&&_legMeta[k]!=='')?_legMeta[k]:(def||'');}
function _mplEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function _mplEnsureCSS(){
  var st=document.getElementById('mpl-leg-css');
  var css=
    /* line-height:normal: #markerLayer tiene line-height:0 (por la imagen del plano) y la
       leyenda lo heredaba, por lo que el texto en 2 líneas se encimaba. */
    ".mpl-leg{font-family:'Times New Roman',Georgia,serif;color:#1a1a1a;background:#fff;box-sizing:border-box;padding:8px;line-height:normal}"+
    ".mpl-leg *{box-sizing:border-box}"+
    ".mpl-block{border:1.6px solid #16314f;margin-bottom:8px;background:#fff}"+
    ".mpl-block:last-child{margin-bottom:0}"+
    ".mpl-hd-title{color:#16314f;font-weight:bold;text-align:center;font-size:15px;letter-spacing:.5px;padding:9px 10px 3px;line-height:1.15}"+
    ".mpl-hd-sub{text-align:center;font-size:11.5px;color:#555;padding:0 10px 8px;letter-spacing:.6px;text-transform:uppercase;border-bottom:1.4px solid #16314f}"+
    ".mpl-meta{width:100%;border-collapse:collapse;font-size:12px}"+
    ".mpl-meta td{border:1px solid #9fb0c3;padding:5px 9px;color:#20242b;vertical-align:middle}"+
    ".mpl-meta td.k{background:#eef1f5;font-weight:bold;width:44%;color:#16314f}"+
    /* Campos editables: ocupan TODA la celda (antes solo ~40px y había que atinarle a la raya) */
    ".mpl-ed{outline:none;display:block;width:100%;min-height:1.25em;cursor:text;-webkit-user-select:text;user-select:text;word-break:break-word}"+
    ".mpl-ed:hover{background:#fff9d6}"+
    ".mpl-ed:focus{background:#fff2a8;box-shadow:inset 0 0 0 1.5px #c8a84b}"+
    ".mpl-meta td.v{padding:0}"+
    ".mpl-meta td.v>span{display:block;padding:5px 9px;min-height:2em}"+
    ".mpl-hd-title>span{display:block}"+
    ".mpl-hd-sub>span{display:block;min-height:1.3em}"+
    ".mpl-ed:empty:before{content:'\\2014';color:#c3c3c3}"+
    ".mpl-h{text-align:center;font-weight:bold;color:#16314f;font-size:13.5px;letter-spacing:1px;padding:12px 8px 11px;border-bottom:1.6px solid #16314f;text-transform:uppercase}"+
    ".mpl-row{display:flex;align-items:center;gap:13px;padding:9px 12px;border-bottom:1px solid #e4e4e4}"+
    ".mpl-row:last-child{border-bottom:none}"+
    ".mpl-ic{flex:0 0 auto;display:flex;align-items:center;justify-content:center}"+
    ".mpl-ic svg,.mpl-ic img{display:block}"+
    ".mpl-nm{font-size:13.5px;color:#20242b;line-height:1.25}"+
    ".mpl-find{cursor:pointer}"+
    ".mpl-find:hover{background:#f3f0e7}"+
    ".mpl-hz{background:#1b7a3d;color:#fff;text-align:center;font-weight:bold;font-size:12px;letter-spacing:.6px;padding:11px 8px;text-transform:uppercase;line-height:1.3}"+
    ".mpl-znm{font-size:13px;font-weight:bold;color:#16314f}"+
    ".mpl-empty{padding:12px;text-align:center;color:#8a8470;font-style:italic;font-size:12.5px}"+
    ".mpl-drag{display:flex;align-items:center;gap:5px;background:#16314f;padding:5px 8px;cursor:grab;margin-bottom:8px}"+
    ".mpl-drag .leg-orient{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.55);border-radius:3px;font-size:10px;height:18px;padding:0 2px;cursor:pointer;font-family:inherit}"+
    ".mpl-drag .leg-orient option{color:#000;background:#fff}"+
    ".mpl-drag .mpl-tt{flex:1;min-width:0;color:#fff;font-weight:bold;font-size:11px;letter-spacing:.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"+
    ".mpl-leg .leg-sz{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.55);color:#fff;border-radius:3px;width:18px;height:18px;font-size:13px;line-height:1;cursor:pointer;padding:0;flex:0 0 18px;display:flex;align-items:center;justify-content:center}"+
    ".mpl-leg .leg-sz:hover{background:rgba(255,255,255,.3)}";
  if(!st){st=document.createElement('style');st.id='mpl-leg-css';document.head.appendChild(st);}
  st.textContent=css;
}

function _mplRiskRank(color){var order=['#e00000','#ff8c00','#f5d000','#7dc560'];var i=order.indexOf((color||'').toLowerCase());return i<0?99:i;}

function _mplLegendData(){
  var curr=[].slice.call(document.querySelectorAll('.marker:not(.evac-arrow)')).filter(function(m){
    return (m.dataset.mode||'riesgos')===_appMode && String(m.dataset.plan||1)===String(_currentPlan);
  });
  var risks=[],rSeen={},evac=[],eSeen={},zonas=[],zSeen={},eaCnt=0;
  curr.forEach(function(m){
    var id=m.dataset.itemId||'',c=m.dataset.itemColor||'',isEvac=m.dataset.itemIsEvac==='1';
    if(id==='estoy_aqui'){eaCnt++;return;}
    if(isEvac){
      if(id==='zona_seguridad'||id==='zona_seguridad_sismo'){if(!zSeen[id]){zSeen[id]=1;zonas.push(id);}}
      else{if(!eSeen[id]){eSeen[id]=1;evac.push(id);}}
    }else{
      var k=id+'|'+c;if(!rSeen[k]){rSeen[k]=1;risks.push({id:id,color:c});}
    }
  });
  var arrows=[].slice.call(document.querySelectorAll('.evac-arrow')).filter(function(m){
    return (m.dataset.mode||'riesgos')===_appMode && String(m.dataset.plan||1)===String(_currentPlan);
  }).length;
  return {risks:risks,evac:evac,zonas:zonas,arrows:arrows,eaCnt:eaCnt};
}

/* Columnas de una sección en horizontal: hasta 3, con las filas llenando de izquierda a
   derecha (como una tabla). */
function _mplCols(n){return Math.min(3,Math.max(1,n));}
/* Sección = título + filas. Marca con "lastcol" la última celda de cada fila de la rejilla
   (para no dibujar su borde derecho) y deja el nº de columnas en --cols. */
function _mplBlock(titleHTML,rows,extraCls,nCols){
  var k=_mplCols(nCols!=null?nCols:rows.length);
  var body=rows.map(function(h,i){return ((i+1)%k===0)?h.replace('class="mpl-row','class="mpl-row lastcol'):h;}).join('');
  return '<div class="mpl-block'+(extraCls?' '+extraCls:'')+'" data-n="'+(nCols!=null?nCols:rows.length)+'" style="--cols:'+k+'">'+titleHTML+body+'</div>';
}

/* Caja de título + metadatos. "extra" (p.ej. la fila "Estoy aquí" de la leyenda horizontal) va
   al final del recuadro, debajo de "Elaborado por". */
function _mplHeaderHTML(extra){
  function fld(k,def){
    var kk=_mplMK(k);                                   /* clave propia de este modo */
    var v=_mplEsc(_mplMetaVal(kk,def));
    return '<span class="mpl-ed" contenteditable="true" data-k="'+kk+'">'+v+'</span>';
  }
  var _isEv=(typeof _appMode!=='undefined'&&_appMode==='evacuacion');
  var _hdTitle=_isEv?'PLANO DE EVACUACIÓN':'MAPA DE RIESGOS';
  /* El título se puede reescribir; se guarda por modo (si se borra vuelve al original). */
  return '<div class="mpl-block">'+
    '<div class="mpl-hd-title">'+fld('titulo',_hdTitle)+'</div>'+
    '<div class="mpl-hd-sub">'+fld('local','')+'</div>'+
    '<table class="mpl-meta">'+
      '<tr><td class="k">Fecha</td><td class="v">'+fld('fecha','')+'</td></tr>'+
      '<tr><td class="k">Versión</td><td class="v">'+fld('version','')+'</td></tr>'+
      '<tr><td class="k">Elaborado por</td><td class="v">'+fld('elaborado','')+'</td></tr>'+
    '</table>'+(extra||'')+'</div>';
}

/* HTML de la leyenda (cabecera + bloques con contenido).
   "Estoy aquí": en VERTICAL va dentro de "Leyenda riesgos" (como siempre); en HORIZONTAL se
   muestra dentro del recuadro de datos, bajo "Elaborado por", y la sección "Leyenda riesgos"
   desaparece si solo tenía ese ícono (así se gana el espacio del centro). Ambas versiones se
   generan y el CSS (.horiz) decide cuál se ve. */
function _mplLegendHTML(opt){
  opt=opt||{};var ICO=opt.ico||34,EICO=opt.eico||38;
  var d=_mplLegendData();
  var eaRow=function(cls){return '<div class="mpl-row '+cls+'"><span class="mpl-ic">'+(typeof iconSVGEstoyAqui==='function'?iconSVGEstoyAqui(ICO):'')+'</span><span class="mpl-nm">Estoy aquí</span></div>';};
  var out=_mplHeaderHTML(d.eaCnt?eaRow('mpl-ea-h'):'');
  /* LEYENDA RIESGOS */
  var riskRows=[];
  d.risks.slice().sort(function(a,b){return _mplRiskRank(a.color)-_mplRiskRank(b.color);}).forEach(function(r){
    var rk=null;RISKS.forEach(function(x){if(x.id===r.id)rk=x;});
    var nm=rk?rk.name:r.id,ico=rk?iconSVG(rk.g,r.color,ICO):'';
    riskRows.push('<div class="mpl-row mpl-find" data-fid="'+r.id+'" data-fcolor="'+r.color+'"><span class="mpl-ic">'+ico+'</span><span class="mpl-nm">'+nm+'</span></div>');
  });
  var nRisk=riskRows.length;
  if(d.eaCnt)riskRows.push(eaRow('mpl-ea-v'));
  if(riskRows.length)out+=_mplBlock('<div class="mpl-h">Leyenda</div>',riskRows,nRisk?'':'mpl-only-ea',nRisk||1);
  /* SIMBOLOGÍA */
  var symRows=[];
  d.evac.forEach(function(id){
    var it=null;if(typeof EVAC_ITEMS!=='undefined')EVAC_ITEMS.forEach(function(x){if(x.id===id)it=x;});
    var nm=it?it.name:id,ico=it?'<img src="'+(it._png||it.img)+'" style="width:'+EICO+'px;height:auto">':'';
    symRows.push('<div class="mpl-row"><span class="mpl-ic">'+ico+'</span><span class="mpl-nm">'+nm+'</span></div>');
  });
  if(d.arrows){var aico=typeof arrowSVGThumb==='function'?arrowSVGThumb(0):'→';symRows.push('<div class="mpl-row"><span class="mpl-ic" style="width:'+EICO+'px;justify-content:center">'+aico+'</span><span class="mpl-nm">Vía de evacuación</span></div>');}
  if(symRows.length)out+=_mplBlock('<div class="mpl-h">Simbología</div>',symRows);
  /* ZONA DE SEGURIDAD */
  if(d.zonas.length){
    var zr=[];
    d.zonas.forEach(function(id){var it=null;if(typeof EVAC_ITEMS!=='undefined')EVAC_ITEMS.forEach(function(x){if(x.id===id)it=x;});var nm=it?it.name:id,ico=it?'<img src="'+(it._png||it.img)+'" style="width:'+(EICO+6)+'px;height:auto">':'';zr.push('<div class="mpl-row"><span class="mpl-ic">'+ico+'</span><span class="mpl-znm">'+nm+'</span></div>');});
    out+=_mplBlock('<div class="mpl-hz">Zona de seguridad / Punto de encuentro</div>',zr);
  }
  return out;
}

/* Mantiene la leyenda escalada junto con el zoom del plano (× su propio zoom) */
window.__mplLegSync=function(){
  var lg=document.getElementById('legend');if(!lg)return;
  if(!lg.style.left||lg.style.left.indexOf('%')===-1)return;
  var ls=(typeof _legendScale!=='undefined'?_legendScale:1);
  var lr=(typeof _legendRot!=='undefined'?_legendRot:0);
  var z=(typeof _zw!=='undefined'?_zw:100);
  lg.style.setProperty('--rzk',Math.min(4,1/Math.max(.25,ls*z/100)));
  lg.style.transform='translate(-50%,-50%) scale('+(ls*z/100)+') rotate('+lr+'deg)';
  lg.style.transformOrigin='center center';
};

/* Pantalla: reemplaza la leyenda flotante. Mantiene arrastre/redimensión/giro
   (core.js) y clic en fila de riesgo para ubicar el ícono en el plano. */
function _renderLegendSummary(){
  var lg=document.getElementById('legend');if(!lg)return;
  _mplEnsureCSS();
  lg.style.background='#fff';lg.style.color='#1a1a1a';lg.style.border='1.5px solid #16314f';
  lg.style.borderRadius='6px';lg.style.padding='0';lg.style.overflow='visible';lg.style.height='auto';
  if(!lg.style.width||['230px','250px','280px'].indexOf(lg.style.width)>=0)lg.style.width='300px';
  /* Anclar en % del markerLayer para que escale con el zoom del plano */
  var _mlg=document.getElementById('markerLayer');
  /* Con el plano todavía sin imagen (mide unos px) no se ubica la leyenda: quedaría en un lugar absurdo y
     ya no se volvería a colocar. Se hace en el primer dibujo con el plano cargado. */
  var _sinPos=(!lg.style.left||lg.style.left.indexOf('%')===-1)&&_mlg&&_mlg.offsetWidth>=80&&_mlg.offsetHeight>=80;
  if(_sinPos){
    var _enHoja=(typeof _sheetOn!=='undefined'&&_sheetOn);
    lg.style.left=_enHoja?(100+_sheetW/2)+'%':'15%';lg.style.top=_enHoja?'12%':'70%';
    lg.style.bottom='auto';lg.style.right='auto';
  }
  var header='<div class="mpl-drag"><span class="mpl-tt">Leyenda</span>'+
    '<select class="leg-orient" title="Orientación de la leyenda"><option value="v">Vertical</option><option value="h">Horizontal</option></select>'+
    '<button class="leg-sz" data-d="-1" title="Achicar">−</button>'+
    '<button class="leg-sz" data-d="1" title="Agrandar">+</button>'+
    '<button class="leg-sz leg-rotl" title="Girar a la izquierda">↺</button>'+
    '<button class="leg-sz leg-rot" title="Girar a la derecha">↻</button></div>';
  lg.innerHTML='<div class="mpl-leg">'+header+'<div class="mpl-body">'+_mplLegendHTML({ico:32,eico:36})+'</div></div>'+['n','s','e','w','ne','nw','se','sw'].map(function(d){return '<div class="leg-resize leg-rz leg-rz-'+d+'" data-rz="'+d+'"></div>';}).join('');
  /* Desplegable Vertical / Horizontal */
  var _so=lg.querySelector('.leg-orient');
  if(_so){
    _so.value=(typeof _legOrient!=='undefined')?_legOrient:'v';
    _so.addEventListener('mousedown',function(e){e.stopPropagation();});
    _so.addEventListener('change',function(){if(typeof _setLegendOrient==='function')_setLegendOrient(_so.value);});
  }
  lg.classList.toggle('horiz',(typeof _legOrient!=='undefined')&&_legOrient==='h');
  /* Campos de metadatos editables */
  lg.querySelectorAll('.mpl-ed').forEach(function(sp){
    sp.addEventListener('mousedown',function(e){e.stopPropagation();});
    sp.addEventListener('input',function(){_legMeta[sp.dataset.k]=sp.textContent;_legMetaSave();if(typeof _fitLegendContent==='function')_fitLegendContent();if(sp.dataset.k===_mplMK('titulo')&&typeof _updateBannerText==='function')_updateBannerText();});
    sp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();sp.blur();}e.stopPropagation();});
    sp.addEventListener('paste',function(e){e.preventDefault();var tx=((e.clipboardData||window.clipboardData).getData('text')||'').replace(/\s+/g,' ');document.execCommand('insertText',false,tx);});
  });
  /* Clic en fila de riesgo: ubica ese ícono en el plano */
  lg.querySelectorAll('.mpl-find').forEach(function(row){
    row.addEventListener('mousedown',function(e){e.stopPropagation();});
    row.addEventListener('click',function(e){
      e.stopPropagation();
      var fid=row.dataset.fid,fcolor=row.dataset.fcolor,match=null;
      document.querySelectorAll('.marker:not(.evac-arrow)').forEach(function(m){
        if(match)return;
        if(m.dataset.itemId===fid&&m.dataset.itemColor===fcolor&&(m.dataset.mode||'riesgos')===_appMode&&String(m.dataset.plan||1)===String(_currentPlan))match=m;
      });
      if(!match){alert('No se encontró ese ícono en el plano actual.');return;}
      match.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});
      match.style.outline='5px solid magenta';match.style.outlineOffset='3px';
      setTimeout(function(){match.style.outline='';match.style.outlineOffset='';},4000);
    });
  });
  if(typeof _fitSheetToLegend==='function')_fitSheetToLegend();     /* la leyenda cambió de alto: la hoja se ajusta */
  if(typeof _updateBannerText==='function')_updateBannerText();      /* título según el modo actual */
  /* Si el usuario estiró la leyenda, ajustar el contenido a su caja */
  if(typeof _fitLegendContent==='function')_fitLegendContent();
  /* Aplicar el zoom actual del plano a la leyenda */
  if(window.__mplLegSync)window.__mplLegSync();
  /* Leyenda nueva (sin posición guardada) y hoja activa: centrarla arriba sobre la hoja */
  if(_sinPos&&typeof _sheetOn!=='undefined'&&_sheetOn&&typeof _placeLegendOnSheet==='function')_placeLegendOnSheet();
}
async function _capturePlan(scaleFactor){
  scaleFactor=scaleFactor||3;
  var ml=document.getElementById('markerLayer');

  /* 1. Ocultar controles UI (incluida la barra de arrastre de la leyenda) */
  document.querySelectorAll('.del,.mkr-size,.arr-del,.arr-resize,.leg-resize,.afp-toggle,#arr-float-panel,.mpl-drag').forEach(function(d){d.style.display='none';});
  /* Quitar el recuadro punteado de selección para que no salga en el PNG/PDF. */
  document.querySelectorAll('.marker.mkr-sel').forEach(function(m){m.classList.remove('mkr-sel');});

  /* 2. Filtrar visibilidad por MODO y PLAN */
  document.querySelectorAll('.marker').forEach(function(m){
    m._origVis=m.style.visibility;
    var modeOk=(m.dataset.mode||'riesgos')===_appMode;
    var planOk=String(m.dataset.plan||1)===String(_currentPlan);
    m.style.visibility=(modeOk&&planOk)?'visible':'hidden';
  });

  /* 3. Escala de íconos: como en la captura el markerLayer se resetea a 100%
        de ancho (ver paso 5), los íconos deben usar SOLO markerScale (ms),
        no _zw/100*ms — si no, quedan proporcionalmente chicos o grandes según
        el zoom que tenía la pantalla al exportar. Se preserva la rotación
        individual (markerRot); el canvas final se gira _planRot grados (paso 5),
        así el ícono queda con la misma orientación que en pantalla. */
  document.querySelectorAll('.marker:not(.evac-arrow)').forEach(function(m){
    m._origTr=m.style.transform;
    m._origOrg=m.style.transformOrigin;
    var ms=parseFloat(m.dataset.markerScale||1);
    var mr=parseFloat(m.dataset.markerRot||0);
    m.style.transform='translate(-50%,-50%) scale('+ms+') rotate('+mr+'deg)';
    m.style.transformOrigin='50% 50%';
  });

  /* 4. La leyenda ya se posiciona en % de markerLayer (ver core.js), así que
        su lugar relativo se preserva solo al resetear el ancho para capturar,
        sin necesidad de convertir nada acá.
        Pero "resize:both"+"overflow:auto" (agregado para poder agrandarla a
        mano) hace que html2canvas dibuje el fondo a tamaño completo y recorte
        el contenido real a una franja chica arriba — se ve una caja oscura
        casi vacía en el PNG. Se neutraliza SOLO durante la captura. */
  var legEl=document.getElementById('legend');
  var _legOverflow=legEl.style.overflow,_legResize=legEl.style.resize,_legVis=legEl.style.visibility,_legTr=legEl.style.transform;
  legEl.style.overflow='visible';legEl.style.resize='none';
  /* El contenido interno puede ir escalado (leyenda estirada): html2canvas recorta
     por la caja SIN escalar si el contenedor tiene overflow:hidden → sale cortada. */
  var _legCh=legEl.querySelector('.mpl-leg'),_legChOv=_legCh?_legCh.style.overflow:'';
  if(_legCh)_legCh.style.overflow='visible';
  /* La leyenda se captura EN SU LUGAR sobre el plano (igual que en pantalla).
     Como el markerLayer se resetea a 100% (paso 5), la leyenda debe quedar con
     su propio zoom (_legendScale) SIN el factor de zoom del plano (_zw). */
  var _lgS=(typeof _legendScale!=='undefined'?_legendScale:1),_lgR=(typeof _legendRot!=='undefined'?_legendRot:0);
  if(legEl.style.left&&legEl.style.left.indexOf('%')!==-1){legEl.style.transform='translate(-50%,-50%) scale('+_lgS+') rotate('+_lgR+'deg)';legEl.style.transformOrigin='center center';}

  /* 5. Resetear zoom Y rotación del markerLayer para captura limpia.
        Capturamos el plano en su orientación NATURAL (sin rotar) y luego,
        si el usuario lo tenía girado, rotamos el canvas resultante. Así
        html2canvas no se confunde con el transform:rotate del elemento. */
  var origW=ml.style.width,origMT=ml.style.marginTop;
  var origTr=ml.style.transform,origMB=ml.style.marginBottom,origML=ml.style.marginLeft;
  var capRot=(typeof _planRot!=='undefined')?_planRot:0;
  ml.style.width='100%';ml.style.marginTop='0px';
  ml.style.transform='';ml.style.marginBottom='0px';ml.style.marginLeft='0px';
  _activeImg().style.width='100%';
  _scaleArrows(); /* recalcula el ancho/alto en px de las flechas para el ancho reseteado */

  /* Tope de escala: los navegadores limitan el canvas (~16384px por lado). Si
     el plano es grande, bajamos la escala para no obtener un PNG en blanco o
     con íconos faltantes (html2canvas descarta lo que se sale del límite). */
  /* La hoja de la leyenda (si está activa) se extiende a la derecha del plano: el área
     capturada es el plano + la hoja. Mientras tanto #zoom-wrap no debe recortarla. */
  var _zwrap=document.getElementById('zoom-wrap'),_zwOv=_zwrap?_zwrap.style.overflow:'';
  /* El desplazamiento de la vista se guarda y se pone a 0 durante la captura: con scroll, el recorte
     por coordenadas (x,y) saldría corrido, porque el exportador no lo contempla. Se restaura al final. */
  var _zwSL=_zwrap?_zwrap.scrollLeft:0,_zwST=_zwrap?_zwrap.scrollTop:0;
  var _zwPT=_zwrap?_zwrap.style.paddingTop:'';
  if(_zwrap){_zwrap.scrollLeft=0;_zwrap.scrollTop=0;_zwrap.style.overflow='visible';_zwrap.style.paddingTop='0px';}
  /* El ancho del plano se fija en px: si el exportador usara una ventana más ancha, el 100%
     estiraría el plano y la hoja (que es % de ese ancho) quedaría desproporcionada. */
  var _plW=ml.offsetWidth;
  ml.style.width=_plW+'px';
  /* La hoja de la leyenda y la barra de título se pegan a lados del plano (en SUS ejes): se reserva el
     espacio de la unión de sus rectángulos. Lo que cae a la izquierda o arriba se resuelve desplazando
     el plano con márgenes para que quepa en el lienzo. */
  var _plH=ml.offsetHeight,_shEl=document.getElementById('legendSheet'),_bnEl=document.getElementById('planTitle');
  if(typeof _sizeBanner==='function')_sizeBanner();          /* el plano se re-maquetó a otro ancho: re-dimensionar la barra */
  var _els=[];
  if(_shEl&&typeof _sheetOn!=='undefined'&&_sheetOn)_els.push(_shEl);
  if(_bnEl&&typeof _titleOn!=='undefined'&&_titleOn&&_bnEl.style.display!=='none')_els.push(_bnEl);
  var _mnX=0,_mnY=0,_mxX=_plW,_mxY=_plH;
  _els.forEach(function(e){_mnX=Math.min(_mnX,e.offsetLeft);_mnY=Math.min(_mnY,e.offsetTop);_mxX=Math.max(_mxX,e.offsetLeft+e.offsetWidth);_mxY=Math.max(_mxY,e.offsetTop+e.offsetHeight);});
  var _exL=Math.max(0,Math.round(-_mnX)),_exT=Math.max(0,Math.round(-_mnY)),_exR=Math.max(0,Math.round(_mxX-_plW)),_exB=Math.max(0,Math.round(_mxY-_plH));
  ml.style.marginLeft=_exL+'px';ml.style.marginTop=_exT+'px';
  var _capW=Math.round(_plW+_exL+_exR),_capH=Math.round(_plH+_exT+_exB);
  var _maxDim=Math.max(_capW||1000,_capH||1000);
  var _capScale=Math.min(scaleFactor,Math.max(1,16000/_maxDim));

  var planCanvas;
  try{
    var _h2c={
      backgroundColor:'#ffffff',scale:_capScale,useCORS:true,allowTaint:false,imageTimeout:20000,
      scrollX:0,scrollY:0,
      width:_capW,height:_capH,
      logging:false
    };
    /* El exportador siempre parte de la esquina superior-izquierda del elemento (ignora x,y). Si la hoja
       cae a la izquierda o arriba del plano, esa zona queda FUERA del plano: se captura entonces el
       contenedor (#zoom-wrap), donde el plano está desplazado por márgenes y la hoja queda dentro. */
    var _raiz=ml,_zwBg='';
    if((_exL||_exT)&&_zwrap){_raiz=_zwrap;_zwBg=_zwrap.style.background;_zwrap.style.background='#fff';}
    planCanvas=await html2canvas(_raiz,_h2c);
  }finally{
    /* Restaurar estado original */
    if(_zwrap){_zwrap.style.overflow=_zwOv;_zwrap.style.paddingTop=_zwPT;if(_raiz===_zwrap)_zwrap.style.background=_zwBg;}
    ml.style.width=origW;ml.style.marginTop=origMT;
    if(typeof _sizeBanner==='function')setTimeout(_sizeBanner,0);
    ml.style.transform=origTr;ml.style.marginBottom=origMB;ml.style.marginLeft=origML;
    _activeImg().style.width='100%';
    if(_legCh)_legCh.style.overflow=_legChOv;
    legEl.style.overflow=_legOverflow;legEl.style.resize=_legResize;legEl.style.visibility=_legVis;legEl.style.transform=_legTr;
    if(window.__mplLegSync)window.__mplLegSync();
    document.querySelectorAll('.del,.mkr-size,.arr-del,.arr-resize,.leg-resize,.mpl-drag').forEach(function(d){d.style.display='';});
    document.querySelectorAll('.marker').forEach(function(m){m.style.visibility=m._origVis||'visible';});
    document.querySelectorAll('.marker:not(.evac-arrow)').forEach(function(m){
      m.style.transform=m._origTr||'';
      m.style.transformOrigin=m._origOrg||'50% 50%';
    });
    _scaleMarkers();_scaleArrows();
    if(_zwrap){_zwrap.scrollLeft=_zwSL;_zwrap.scrollTop=_zwST;}
  }

  /* 5. Auto-detectar área en blanco superior escaneando filas de píxeles
        Evita el problema del hardcode 380px que desplazaba los íconos */
  var scanCtx=planCanvas.getContext('2d');
  var blankRows=0;
  var maxScan=Math.floor(planCanvas.height*0.35); /* no escanear más del 35% */
  for(var row=0;row<maxScan;row++){
    var rowData=scanCtx.getImageData(0,row,planCanvas.width,1).data;
    var isBlank=true;
    for(var p=0;p<rowData.length;p+=4){
      /* Si algún pixel no es casi-blanco, terminamos */
      if(rowData[p]<245||rowData[p+1]<245||rowData[p+2]<245){isBlank=false;break;}
    }
    if(isBlank)blankRows++;
    else break;
  }
  /* Pequeño margen de seguridad: dejar 4px para no cortar el borde del plano */
  blankRows=Math.max(0,blankRows-Math.round(4*_capScale));

  var crop=document.createElement('canvas');
  crop.width=planCanvas.width;
  crop.height=Math.max(1,planCanvas.height-blankRows);
  crop.getContext('2d').drawImage(planCanvas,0,-blankRows);

  /* 5b. Si el plano estaba girado en pantalla, rotar el canvas para que el PNG
        salga en la MISMA orientación que el usuario veía. */
  if(capRot===90||capRot===180||capRot===270){
    var rot=document.createElement('canvas');
    var swap=(capRot===90||capRot===270);
    rot.width=swap?crop.height:crop.width;
    rot.height=swap?crop.width:crop.height;
    var rctx=rot.getContext('2d');
    rctx.fillStyle='#ffffff';rctx.fillRect(0,0,rot.width,rot.height);
    rctx.translate(rot.width/2,rot.height/2);
    rctx.rotate(capRot*Math.PI/180);
    rctx.drawImage(crop,-crop.width/2,-crop.height/2);
    crop=rot;
  }

  /* 6. La leyenda ya quedó incrustada sobre el plano (en su posición de
        pantalla), así que el resultado es el plano recortado tal cual se ve. */
  return crop;
}

/* Nombre de archivo genérico: modo + nombre del plano/empresa abierto (si lo
   tiene), en vez de un nombre fijo con el nombre de un cliente en particular.
   Así sirve igual para cualquier empresa que use la plataforma. */
function _exportFileName(){
  var modeLabel=_appMode==='evacuacion'?'Plano_Evacuacion':'Mapa_Riesgos';
  var planName=String(window._currentPlanName||'').trim();
  if(planName&&planName.normalize)planName=planName.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  planName=planName.replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  return planName?(modeLabel+'_'+planName):modeLabel;
}

document.getElementById('exportBtn').onclick=async function(){
  this.textContent='Generando...';this.disabled=true;
  try{
    var c=await _capturePlan(3);
    var a=document.createElement('a');
    a.download=_exportFileName()+'.png';
    a.href=c.toDataURL('image/png');a.click();
  }catch(err){alert('Error al exportar PNG: '+err);}
  this.textContent='Exportar PNG';this.disabled=false;
};

document.getElementById('pdfBtn').onclick=async function(){
  this.textContent='Generando PDF...';this.disabled=true;
  try{
    var c=await _capturePlan(4);
    var imgSrc=c.toDataURL('image/png');
    var JS=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF;
    if(JS){
      /* Página de una hoja ajustada al plano (lado largo ~297mm tipo A4). La
         resolución la aporta el PNG de alta escala incrustado. */
      var maxMm=297,wMm,hMm;
      if(c.width>=c.height){wMm=maxMm;hMm=maxMm*c.height/c.width;}
      else{hMm=maxMm;wMm=maxMm*c.width/c.height;}
      var pdf=new JS({orientation:wMm>=hMm?'landscape':'portrait',unit:'mm',format:[wMm,hMm],compress:true});
      pdf.addImage(imgSrc,'PNG',0,0,wMm,hMm,undefined,'FAST');
      pdf.save(_exportFileName()+'.pdf');
    }else{
      /* Fallback si jsPDF no cargó: descargar el PNG */
      var a=document.createElement('a');a.download=_exportFileName()+'.png';a.href=imgSrc;a.click();
      alert('No se pudo cargar el generador de PDF; se descargó el PNG en su lugar.');
    }
  }catch(err){alert('Error al exportar PDF: '+err);}
  this.textContent='Exportar PDF';this.disabled=false;
};

/* Primer dibujo de la leyenda (core.js ya no dibuja una versión propia al cargar). */
_renderLegendSummary();
