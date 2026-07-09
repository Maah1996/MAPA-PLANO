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

/* ── Leyenda estilo "clave" (según foto de referencia) ──────────────────────
   Leyenda dinámica: muestra SOLO los símbolos efectivamente colocados en el
   plano actual, sin cantidades, en 3 bloques (LEYENDA RIESGOS, SIMBOLOGÍA,
   ZONA DE SEGURIDAD). El MISMO builder se usa en pantalla y en la exportación
   PNG/PDF, para que se vean iguales. */
function _mplEnsureCSS(){
  if(document.getElementById('mpl-leg-css'))return;
  var st=document.createElement('style');st.id='mpl-leg-css';
  st.textContent=
    ".mpl-leg{font-family:'Times New Roman',Georgia,serif;color:#1a1a1a;background:#fff;box-sizing:border-box}"+
    ".mpl-leg *{box-sizing:border-box}"+
    ".mpl-sec{padding:7px 11px 9px}"+
    ".mpl-sec+.mpl-sec{border-top:1px solid #d9d2bf}"+
    ".mpl-h{text-align:center;font-weight:bold;color:#16314f;font-size:13px;letter-spacing:1px;padding-bottom:5px;margin-bottom:7px;border-bottom:2px solid #16314f;text-transform:uppercase}"+
    ".mpl-row{display:flex;align-items:center;gap:10px;padding:3px 3px;border-bottom:1px solid #eee}"+
    ".mpl-row:last-child{border-bottom:none}"+
    ".mpl-ic{flex:0 0 auto;display:flex;align-items:center;justify-content:center}"+
    ".mpl-ic svg,.mpl-ic img{display:block}"+
    ".mpl-nm{font-size:13px;color:#20242b;line-height:1.25}"+
    ".mpl-find{cursor:pointer;border-radius:3px}"+
    ".mpl-find:hover{background:#f3f0e7}"+
    ".mpl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:7px}"+
    ".mpl-cell{display:flex;flex-direction:column;align-items:center;text-align:center;gap:3px;padding:4px 2px}"+
    ".mpl-cic{display:flex;align-items:center;justify-content:center}"+
    ".mpl-cic img{max-width:100%;object-fit:contain;display:block}"+
    ".mpl-cic svg{display:block}"+
    ".mpl-cl{font-size:9px;font-weight:bold;color:#33393f;letter-spacing:.3px;line-height:1.15}"+
    ".mpl-zona{padding:0}"+
    ".mpl-hz{background:#1b7a3d;color:#fff;text-align:center;font-weight:bold;font-size:11.5px;letter-spacing:.5px;padding:6px 8px;line-height:1.25}"+
    ".mpl-zrow{display:flex;align-items:center;gap:11px;padding:8px 12px;border-bottom:1px solid #eee}"+
    ".mpl-zrow:last-child{border-bottom:none}"+
    ".mpl-znm{font-size:12.5px;font-weight:bold;color:#16314f}"+
    ".mpl-empty{padding:12px;text-align:center;color:#8a8470;font-style:italic;font-size:12px}"+
    ".mpl-drag{display:flex;align-items:center;gap:5px;background:#16314f;padding:5px 8px;cursor:grab}"+
    ".mpl-drag .mpl-tt{flex:1;min-width:0;color:#fff;font-weight:bold;font-size:11px;letter-spacing:.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"+
    ".mpl-leg .leg-sz{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.55);color:#fff;border-radius:3px;width:18px;height:18px;font-size:13px;line-height:1;cursor:pointer;padding:0;flex:0 0 18px;display:flex;align-items:center;justify-content:center}"+
    ".mpl-leg .leg-sz:hover{background:rgba(255,255,255,.3)}";
  document.head.appendChild(st);
}

function _mplRiskRank(color){var order=['#e00000','#ff8c00','#f5d000','#7dc560'];var i=order.indexOf((color||'').toLowerCase());return i<0?99:i;}

/* Recolecta los símbolos DISTINTOS presentes en el plano/modo actual */
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

/* Devuelve el HTML de los 3 bloques (solo los que tengan contenido). opt.ico = px del ícono */
function _mplLegendHTML(opt){
  opt=opt||{};var ICO=opt.ico||32,EICO=opt.eico||(ICO+6);
  var d=_mplLegendData();var out='';
  var riskRows='';
  d.risks.slice().sort(function(a,b){return _mplRiskRank(a.color)-_mplRiskRank(b.color);}).forEach(function(r){
    var rk=null;RISKS.forEach(function(x){if(x.id===r.id)rk=x;});
    var nm=rk?rk.name:r.id,ico=rk?iconSVG(rk.g,r.color,ICO):'';
    riskRows+='<div class="mpl-row mpl-find" data-fid="'+r.id+'" data-fcolor="'+r.color+'"><span class="mpl-ic">'+ico+'</span><span class="mpl-nm">'+nm+'</span></div>';
  });
  if(d.eaCnt){riskRows+='<div class="mpl-row"><span class="mpl-ic">'+(typeof iconSVGEstoyAqui==='function'?iconSVGEstoyAqui(ICO):'')+'</span><span class="mpl-nm">Estoy aquí</span></div>';}
  if(riskRows)out+='<div class="mpl-sec"><div class="mpl-h">Leyenda riesgos</div>'+riskRows+'</div>';
  var symCells='';
  d.evac.forEach(function(id){
    var it=null;if(typeof EVAC_ITEMS!=='undefined')EVAC_ITEMS.forEach(function(x){if(x.id===id)it=x;});
    var nm=it?it.name:id,ico=it?'<img src="'+it.img+'" style="width:'+EICO+'px;height:'+EICO+'px">':'';
    symCells+='<div class="mpl-cell"><span class="mpl-cic">'+ico+'</span><span class="mpl-cl">'+nm+'</span></div>';
  });
  if(d.arrows){var aico=typeof arrowSVGThumb==='function'?arrowSVGThumb(0):'→';symCells+='<div class="mpl-cell"><span class="mpl-cic" style="height:'+EICO+'px">'+aico+'</span><span class="mpl-cl">VÍA DE EVACUACIÓN</span></div>';}
  if(symCells)out+='<div class="mpl-sec"><div class="mpl-h">Simbología</div><div class="mpl-grid">'+symCells+'</div></div>';
  if(d.zonas.length){
    var zr='';
    d.zonas.forEach(function(id){var it=null;if(typeof EVAC_ITEMS!=='undefined')EVAC_ITEMS.forEach(function(x){if(x.id===id)it=x;});var nm=it?it.name:id,ico=it?'<img src="'+it.img+'" style="width:'+(EICO+6)+'px;height:'+(EICO+6)+'px">':'';zr+='<div class="mpl-zrow"><span class="mpl-ic">'+ico+'</span><span class="mpl-znm">'+nm+'</span></div>';});
    out+='<div class="mpl-sec mpl-zona"><div class="mpl-hz">Zona de seguridad / Punto de encuentro</div>'+zr+'</div>';
  }
  if(!out)out='<div class="mpl-empty">Sin íconos en este plano</div>';
  return out;
}

/* Export: bloque de leyenda que se compone DEBAJO del plano */
function _buildLegendEl(cssWidth){
  _mplEnsureCSS();
  var el=document.createElement('div');
  el.style.cssText='position:absolute;left:-99999px;top:0;width:'+cssWidth+'px;box-sizing:border-box;';
  el.innerHTML='<div class="mpl-leg" style="border:2px solid #16314f">'+_mplLegendHTML({ico:40,eico:46})+'</div>';
  return el;
}

/* Pantalla: reemplaza la leyenda flotante anterior por la misma clave estilo foto.
   Se mantiene el arrastre/redimensión/giro del panel (core.js) vía los botones
   .leg-sz/.leg-rot/.leg-rotl del encabezado. */
function _renderLegendSummary(){
  var legendEl=document.getElementById('legend');if(!legendEl)return;
  _mplEnsureCSS();
  legendEl.style.background='#fff';legendEl.style.color='#1a1a1a';
  legendEl.style.border='1.5px solid #16314f';legendEl.style.borderRadius='6px';
  legendEl.style.padding='0';legendEl.style.overflow='hidden';
  if(!legendEl.style.width||legendEl.style.width==='230px')legendEl.style.width='250px';
  var header='<div class="mpl-drag"><span class="mpl-tt">Leyenda</span>'+
    '<button class="leg-sz" data-d="-1" title="Achicar">−</button>'+
    '<button class="leg-sz" data-d="1" title="Agrandar">+</button>'+
    '<button class="leg-sz leg-rotl" title="Girar a la izquierda">↺</button>'+
    '<button class="leg-sz leg-rot" title="Girar a la derecha">↻</button></div>';
  legendEl.innerHTML='<div class="mpl-leg">'+header+_mplLegendHTML({ico:30,eico:36})+'</div>';
  /* Clic en una fila de riesgo: ubica ese ícono en el plano (scroll + resaltado) */
  legendEl.querySelectorAll('.mpl-find').forEach(function(row){
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

