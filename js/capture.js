/* ── Leyenda profesional para exportación ──────────────────────────────────
   Genera un bloque de leyenda de alto estándar (cabecera con espacio de logo,
   inventario de riesgos/elementos agrupado, clasificación de niveles explicada
   y pie con firmas) a partir de los marcadores del plano actual. Se compone
   DEBAJO del plano en la misma hoja al exportar PNG/PDF. */
function _legendCollect(){
  var isR=_appMode==='riesgos';
  var curr=[].slice.call(document.querySelectorAll('.marker:not(.evac-arrow)')).filter(function(m){
    return (m.dataset.mode||'riesgos')===_appMode && String(m.dataset.plan||1)===String(_currentPlan);
  });
  if(isR){
    var byColor={},eaCnt=0;
    curr.forEach(function(m){
      var id=m.dataset.itemId||'',c=m.dataset.itemColor||'';
      if(id==='estoy_aqui'){eaCnt++;return;}
      if(!byColor[c])byColor[c]={};
      byColor[c][id]=(byColor[c][id]||0)+1;
    });
    return {isR:true,byColor:byColor,eaCnt:eaCnt};
  }else{
    var items={},order=[],eaCnt=0;
    curr.forEach(function(m){
      var id=m.dataset.itemId||'';
      if(id==='estoy_aqui'){eaCnt++;return;}
      if(items[id]===undefined){items[id]=0;order.push(id);}
      items[id]++;
    });
    var arrows=[].slice.call(document.querySelectorAll('.evac-arrow')).filter(function(m){return String(m.dataset.plan||1)===String(_currentPlan);}).length;
    return {isR:false,items:items,order:order,eaCnt:eaCnt,arrows:arrows};
  }
}

/* ── Leyenda estilo "ficha" (según foto de referencia) ──────────────────────
   Tarjeta vertical con: caja de título + metadatos (Fecha/Versión/Elaborado
   por), bloque LEYENDA RIESGOS, bloque SIMBOLOGÍA y bloque ZONA DE SEGURIDAD.
   Dinámica: muestra solo lo colocado en el plano (sin cantidades). El MISMO
   builder se usa en pantalla y en el export PNG/PDF. */

/* Metadatos de la cabecera (editables en pantalla, persistidos en localStorage) */
var _legMeta=(function(){try{return JSON.parse(localStorage.getItem('mpl_legmeta_v1'))||{};}catch(e){return {};}})();
function _legMetaSave(){try{localStorage.setItem('mpl_legmeta_v1',JSON.stringify(_legMeta));}catch(e){}}
function _mplMetaVal(k,def){return (_legMeta[k]!=null&&_legMeta[k]!=='')?_legMeta[k]:(def||'');}
function _mplEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function _mplEnsureCSS(){
  var st=document.getElementById('mpl-leg-css');
  var css=
    ".mpl-leg{font-family:'Times New Roman',Georgia,serif;color:#1a1a1a;background:#fff;box-sizing:border-box;padding:8px}"+
    ".mpl-leg *{box-sizing:border-box}"+
    ".mpl-block{border:1.6px solid #16314f;margin-bottom:8px;background:#fff}"+
    ".mpl-block:last-child{margin-bottom:0}"+
    ".mpl-hd-title{color:#16314f;font-weight:bold;text-align:center;font-size:15px;letter-spacing:.5px;padding:9px 10px 3px;line-height:1.15}"+
    ".mpl-hd-sub{text-align:center;font-size:11.5px;color:#555;padding:0 10px 8px;letter-spacing:.6px;text-transform:uppercase;border-bottom:1.4px solid #16314f}"+
    ".mpl-meta{width:100%;border-collapse:collapse;font-size:12px}"+
    ".mpl-meta td{border:1px solid #9fb0c3;padding:5px 9px;color:#20242b;vertical-align:middle}"+
    ".mpl-meta td.k{background:#eef1f5;font-weight:bold;width:44%;color:#16314f}"+
    ".mpl-ed{outline:none;display:inline-block;min-width:40px;min-height:1.1em}"+
    ".mpl-ed:focus{background:#fff7cc;border-radius:2px}"+
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

/* Caja de título + metadatos */
function _mplHeaderHTML(opt){
  var ed=opt&&opt.editable;
  function fld(k,def){
    var v=_mplEsc(_mplMetaVal(k,def));
    if(ed)return '<span class="mpl-ed" contenteditable="true" data-k="'+k+'">'+v+'</span>';
    return '<span>'+v+'</span>';
  }
  return '<div class="mpl-block">'+
    '<div class="mpl-hd-title">MAPA DE RIESGOS Y EVACUACIÓN</div>'+
    '<div class="mpl-hd-sub">'+fld('local','')+'</div>'+
    '<table class="mpl-meta">'+
      '<tr><td class="k">Fecha</td><td>'+fld('fecha','')+'</td></tr>'+
      '<tr><td class="k">Versión</td><td>'+fld('version','')+'</td></tr>'+
      '<tr><td class="k">Elaborado por</td><td>'+fld('elaborado','')+'</td></tr>'+
    '</table></div>';
}

/* HTML de la leyenda (cabecera + bloques con contenido) */
function _mplLegendHTML(opt){
  opt=opt||{};var ICO=opt.ico||34,EICO=opt.eico||38;
  var d=_mplLegendData();
  var out=_mplHeaderHTML(opt);
  /* LEYENDA RIESGOS */
  var riskRows='';
  d.risks.slice().sort(function(a,b){return _mplRiskRank(a.color)-_mplRiskRank(b.color);}).forEach(function(r){
    var rk=null;RISKS.forEach(function(x){if(x.id===r.id)rk=x;});
    var nm=rk?rk.name:r.id,ico=rk?iconSVG(rk.g,r.color,ICO):'';
    riskRows+='<div class="mpl-row mpl-find" data-fid="'+r.id+'" data-fcolor="'+r.color+'"><span class="mpl-ic">'+ico+'</span><span class="mpl-nm">'+nm+'</span></div>';
  });
  if(d.eaCnt){riskRows+='<div class="mpl-row"><span class="mpl-ic">'+(typeof iconSVGEstoyAqui==='function'?iconSVGEstoyAqui(ICO):'')+'</span><span class="mpl-nm">Estoy aquí</span></div>';}
  if(riskRows)out+='<div class="mpl-block"><div class="mpl-h">Leyenda riesgos</div>'+riskRows+'</div>';
  /* SIMBOLOGÍA */
  var symRows='';
  d.evac.forEach(function(id){
    var it=null;if(typeof EVAC_ITEMS!=='undefined')EVAC_ITEMS.forEach(function(x){if(x.id===id)it=x;});
    var nm=it?it.name:id,ico=it?'<img src="'+it.img+'" style="width:'+EICO+'px;height:'+EICO+'px;object-fit:contain">':'';
    symRows+='<div class="mpl-row"><span class="mpl-ic">'+ico+'</span><span class="mpl-nm">'+nm+'</span></div>';
  });
  if(d.arrows){var aico=typeof arrowSVGThumb==='function'?arrowSVGThumb(0):'→';symRows+='<div class="mpl-row"><span class="mpl-ic" style="width:'+EICO+'px;justify-content:center">'+aico+'</span><span class="mpl-nm">Vía de evacuación</span></div>';}
  if(symRows)out+='<div class="mpl-block"><div class="mpl-h">Simbología</div>'+symRows+'</div>';
  /* ZONA DE SEGURIDAD */
  if(d.zonas.length){
    var zr='';
    d.zonas.forEach(function(id){var it=null;if(typeof EVAC_ITEMS!=='undefined')EVAC_ITEMS.forEach(function(x){if(x.id===id)it=x;});var nm=it?it.name:id,ico=it?'<img src="'+it.img+'" style="width:'+(EICO+6)+'px;height:'+(EICO+6)+'px;object-fit:contain">':'';zr+='<div class="mpl-row"><span class="mpl-ic">'+ico+'</span><span class="mpl-znm">'+nm+'</span></div>';});
    out+='<div class="mpl-block"><div class="mpl-hz">Zona de seguridad / Punto de encuentro</div>'+zr+'</div>';
  }
  return out;
}

/* Export: tarjeta de ancho fijo (no se estira a todo el plano) */
function _buildLegendEl(cssWidth){
  _mplEnsureCSS();
  var W=Math.min(cssWidth||420,440);
  var el=document.createElement('div');
  el.style.cssText='position:absolute;left:-99999px;top:0;width:'+W+'px;box-sizing:border-box;';
  el.innerHTML='<div class="mpl-leg" style="border:2px solid #16314f">'+_mplLegendHTML({ico:40,eico:44,editable:false})+'</div>';
  return el;
}

/* Mantiene la leyenda escalada junto con el zoom del plano (× su propio zoom) */
window.__mplLegSync=function(){
  var lg=document.getElementById('legend');if(!lg)return;
  if(!lg.style.left||lg.style.left.indexOf('%')===-1)return;
  var ls=(typeof _legendScale!=='undefined'?_legendScale:1);
  var lr=(typeof _legendRot!=='undefined'?_legendRot:0);
  var z=(typeof _zw!=='undefined'?_zw:100);
  lg.style.transform='translate(-50%,-50%) scale('+(ls*z/100)+') rotate('+lr+'deg)';
  lg.style.transformOrigin='center center';
};

/* Pantalla: reemplaza la leyenda flotante. Mantiene arrastre/redimensión/giro
   (core.js) y clic en fila de riesgo para ubicar el ícono en el plano. */
function _renderLegendSummary(){
  var lg=document.getElementById('legend');if(!lg)return;
  _mplEnsureCSS();
  lg.style.background='#fff';lg.style.color='#1a1a1a';lg.style.border='1.5px solid #16314f';
  lg.style.borderRadius='6px';lg.style.padding='0';lg.style.overflow='hidden';
  if(!lg.style.width||['230px','250px','280px'].indexOf(lg.style.width)>=0)lg.style.width='300px';
  /* Anclar en % del markerLayer para que escale con el zoom del plano */
  if(!lg.style.left||lg.style.left.indexOf('%')===-1){lg.style.left='15%';lg.style.top='70%';lg.style.bottom='auto';lg.style.right='auto';}
  var header='<div class="mpl-drag"><span class="mpl-tt">Leyenda</span>'+
    '<button class="leg-sz" data-d="-1" title="Achicar">−</button>'+
    '<button class="leg-sz" data-d="1" title="Agrandar">+</button>'+
    '<button class="leg-sz leg-rotl" title="Girar a la izquierda">↺</button>'+
    '<button class="leg-sz leg-rot" title="Girar a la derecha">↻</button></div>';
  lg.innerHTML='<div class="mpl-leg">'+header+_mplLegendHTML({ico:32,eico:36,editable:true})+'</div>';
  /* Campos de metadatos editables */
  lg.querySelectorAll('.mpl-ed').forEach(function(sp){
    sp.addEventListener('mousedown',function(e){e.stopPropagation();});
    sp.addEventListener('input',function(){_legMeta[sp.dataset.k]=sp.textContent;_legMetaSave();});
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
  /* Aplicar el zoom actual del plano a la leyenda */
  if(window.__mplLegSync)window.__mplLegSync();
}
async function _renderLegendCanvas(finWidth,scaleFactor){
  var cssW=Math.round(finWidth/scaleFactor);
  var el=_buildLegendEl(cssW);
  document.body.appendChild(el);
  try{
    var c=await html2canvas(el,{backgroundColor:'#ffffff',scale:scaleFactor,useCORS:true,logging:false,width:el.offsetWidth,height:el.offsetHeight});
    return c;
  }finally{ el.remove(); }
}

async function _capturePlan(scaleFactor){
  scaleFactor=scaleFactor||3;
  /* Título automático según modo y piso */
  var _planLabel=(window._currentPlanName||'').toUpperCase();
  var _modeLabel=_appMode==='evacuacion'?'PLANO DE EVACUACIÓN':'MAPA DE RIESGOS';
  var title=_modeLabel+(_planLabel?(' — '+_planLabel):'');
  var ml=document.getElementById('markerLayer');

  /* 1. Ocultar controles UI */
  document.querySelectorAll('.del,.arr-del,.arr-resize,.afp-toggle,#arr-float-panel,#mkr-float-panel').forEach(function(d){d.style.display='none';});

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
        individual (markerRot) para que no salgan al revés. */
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
  var _legOverflow=legEl.style.overflow,_legResize=legEl.style.resize,_legVis=legEl.style.visibility;
  legEl.style.overflow='visible';legEl.style.resize='none';
  /* Ocultar la leyenda flotante del plano: ahora la leyenda profesional se
     compone aparte debajo del plano (no incrustada sobre él). */
  legEl.style.visibility='hidden';

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

  var planCanvas;
  try{
    planCanvas=await html2canvas(ml,{
      backgroundColor:'#ffffff',scale:scaleFactor,useCORS:true,
      scrollX:0,scrollY:0,
      width:ml.offsetWidth,height:ml.offsetHeight,
      logging:false
    });
  }finally{
    /* Restaurar estado original */
    ml.style.width=origW;ml.style.marginTop=origMT;
    ml.style.transform=origTr;ml.style.marginBottom=origMB;ml.style.marginLeft=origML;
    _activeImg().style.width='100%';
    legEl.style.overflow=_legOverflow;legEl.style.resize=_legResize;legEl.style.visibility=_legVis;
    document.querySelectorAll('.del,.arr-del,.arr-resize').forEach(function(d){d.style.display='';});
    document.querySelectorAll('.marker').forEach(function(m){m.style.visibility=m._origVis||'visible';});
    document.querySelectorAll('.marker:not(.evac-arrow)').forEach(function(m){
      m.style.transform=m._origTr||'';
      m.style.transformOrigin=m._origOrg||'50% 50%';
    });
    _scaleMarkers();_scaleArrows();
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
  blankRows=Math.max(0,blankRows-Math.round(4*scaleFactor));

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

  /* 6. Agregar franja de título */
  var pad=Math.round(6*scaleFactor),titleH=Math.round(54*scaleFactor),gap=Math.round(2*scaleFactor);
  var fin=document.createElement('canvas');
  fin.width=crop.width;fin.height=crop.height+pad+titleH+gap;
  var ctx=fin.getContext('2d');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,fin.width,fin.height);
  /* Franja de fondo oscuro para el título */
  ctx.fillStyle='#16314f';ctx.fillRect(0,0,fin.width,pad+titleH);
  ctx.font='bold '+Math.round(32*scaleFactor)+'px Georgia,serif';
  ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(title,fin.width/2,pad+titleH/2);
  ctx.strokeStyle='#cdbf9b';ctx.lineWidth=Math.round(2*scaleFactor);
  ctx.beginPath();ctx.moveTo(0,pad+titleH);ctx.lineTo(fin.width,pad+titleH);ctx.stroke();
  ctx.drawImage(crop,0,pad+titleH+gap);

  /* 7. Componer la leyenda profesional DEBAJO del plano, misma hoja */
  var legCanvas=null;
  try{ legCanvas=await _renderLegendCanvas(fin.width,scaleFactor); }catch(e){ legCanvas=null; }
  if(legCanvas){
    var legGap=Math.round(10*scaleFactor);
    var comb=document.createElement('canvas');
    comb.width=fin.width;
    comb.height=fin.height+legGap+legCanvas.height;
    var cctx=comb.getContext('2d');
    cctx.fillStyle='#ffffff';cctx.fillRect(0,0,comb.width,comb.height);
    cctx.drawImage(fin,0,0);
    /* Centrar la leyenda si por redondeo quedó 1-2px más angosta */
    var lx=Math.round((fin.width-legCanvas.width)/2);
    cctx.drawImage(legCanvas,lx,fin.height+legGap);
    return comb;
  }
  return fin;
}

document.getElementById('exportBtn').onclick=async function(){
  this.textContent='Generando...';this.disabled=true;
  try{
    var c=await _capturePlan(3);
    var a=document.createElement('a');
    a.download='Plano_MONTICHEF.png';
    a.href=c.toDataURL('image/png');a.click();
  }catch(err){alert('Error al exportar PNG: '+err);}
  this.textContent='Exportar PNG';this.disabled=false;
};

document.getElementById('pdfBtn').onclick=async function(){
  this.textContent='Generando PDF...';this.disabled=true;
  try{
    var c=await _capturePlan(4);
    var imgSrc=c.toDataURL('image/png');
    var pxPerMm=3.7795275591;
    var sf=4;
    var wMm=Math.ceil(c.width/sf/pxPerMm)+10;
    var hMm=Math.ceil(c.height/sf/pxPerMm)+10;
    var w=window.open('','_blank');
    w.document.write(
      '<!DOCTYPE html><html><head>'
      +'<meta charset="UTF-8"><title>Plano MONTICHEF</title>'
      +'<style>'
      +'*{margin:0;padding:0;box-sizing:border-box}'
      +'html,body{width:100%;background:#fff}'
      +'img{display:block;width:100%;height:auto}'
      +'@media print{'
      +'  @page{margin:5mm;size:'+wMm+'mm '+hMm+'mm}'
      +'  img{width:100%;height:auto;page-break-inside:avoid}'
      +'}'
      +'<\/style>'
      +'<\/head><body>'
      +'<img src="'+imgSrc+'">'
      +'<script>window.onload=function(){setTimeout(function(){window.print();},600);};<\/script>'
      +'<\/body><\/html>'
    );
    w.document.close();
  }catch(err){alert('Error al exportar PDF: '+err);}
  this.textContent='Exportar PDF';this.disabled=false;
};

