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

function _buildLegendEl(cssWidth){
  var isR=_appMode==='riesgos';
  var d=_legendCollect();
  var planLbl=(window._currentPlanName||'').trim()||'Sin nombre';
  var el=document.createElement('div');
  el.style.cssText='position:absolute;left:-99999px;top:0;width:'+cssWidth+'px;font-family:Georgia,"Times New Roman",serif;background:#fff;border:2px solid #16314f;box-sizing:border-box;';
  var ICO=44;

  /* Inventario */
  var invRows='';
  if(isR){
    var any=false;
    Object.keys(LEVELS).forEach(function(lk){
      var lc=LEVELS[lk].color, grp=d.byColor[lc];
      if(!grp||!Object.keys(grp).length)return;
      any=true;
      invRows+='<tr class="lvlhead"><td colspan="3" style="background:'+lc+'"><span>'+LEVELS[lk].label.toUpperCase()+'</span></td></tr>';
      Object.keys(grp).forEach(function(id){
        var r=null;RISKS.forEach(function(x){if(x.id===id)r=x;});
        var nm=r?r.name:id, ico=r?iconSVG(r.g,lc,ICO):'';
        invRows+='<tr><td class="sym">'+ico+'</td><td class="nm">'+nm+'</td><td class="qty">'+grp[id]+'</td></tr>';
      });
    });
    if(d.eaCnt){any=true;invRows+='<tr><td class="sym">'+(typeof iconSVGEstoyAqui==='function'?iconSVGEstoyAqui(ICO):'')+'</td><td class="nm">Estoy aquí</td><td class="qty">'+d.eaCnt+'</td></tr>';}
    if(!any)invRows='<tr><td colspan="3" style="padding:14px;color:#8a8470;font-style:italic;">Sin íconos de riesgo en este plano.</td></tr>';
  }else{
    var any2=false;
    d.order.forEach(function(id){
      var it=null;if(typeof EVAC_ITEMS!=='undefined')EVAC_ITEMS.forEach(function(x){if(x.id===id)it=x;});
      var nm=it?it.name:id, ico=it?'<img src="'+it.img+'" style="width:'+ICO+'px;height:'+ICO+'px;object-fit:contain">':'';
      any2=true;
      invRows+='<tr><td class="sym">'+ico+'</td><td class="nm">'+nm+'</td><td class="qty">'+d.items[id]+'</td></tr>';
    });
    if(d.eaCnt){any2=true;invRows+='<tr><td class="sym">'+(typeof iconSVGEstoyAqui==='function'?iconSVGEstoyAqui(ICO):'')+'</td><td class="nm">Estoy aquí</td><td class="qty">'+d.eaCnt+'</td></tr>';}
    if(d.arrows){any2=true;var aico=typeof arrowSVGThumb==='function'?arrowSVGThumb(0):'→';invRows+='<tr><td class="sym" style="max-width:'+ICO+'px">'+aico+'</td><td class="nm">Ruta de evacuación (flechas)</td><td class="qty">'+d.arrows+'</td></tr>';}
    if(!any2)invRows='<tr><td colspan="3" style="padding:14px;color:#8a8470;font-style:italic;">Sin elementos de evacuación en este plano.</td></tr>';
  }

  /* Columna derecha */
  var rightTitle,rightBody;
  if(isR){
    rightTitle='CLASIFICACIÓN DEL NIVEL DE RIESGO';
    var scale=[
      {c:'#e00000',t:'Intolerable (4)',x:'Riesgo inaceptable. Detener la actividad hasta reducir el riesgo. Acción inmediata.'},
      {c:'#ff8c00',t:'Importante (3)',x:'Adoptar medidas de control en el corto plazo. No iniciar la tarea sin mitigación.'},
      {c:'#f5d000',t:'Moderado (2)',x:'Implementar medidas para reducir el riesgo. Verificar controles periódicamente.'},
      {c:'#7dc560',t:'Tolerable (1)',x:'Riesgo aceptable. Mantener los controles existentes y la supervisión.'}
    ];
    rightBody=scale.map(function(s){return '<div class="sc-row"><span class="sc-chip" style="background:'+s.c+'"></span><div class="sc-txt"><b>'+s.t+'</b><span>'+s.x+'</span></div></div>';}).join('')
      +'<div class="sc-note">El color del triángulo de cada símbolo indica el nivel de riesgo evaluado en ese punto del plano.</div>';
  }else{
    rightTitle='INDICACIONES DE EVACUACIÓN';
    rightBody=''
      +'<div class="sc-row"><span class="sc-chip" style="background:#007541"></span><div class="sc-txt"><b>Recorrido</b><span>Siga las flechas verdes hasta la vía de evacuación y la zona de seguridad.</span></div></div>'
      +'<div class="sc-row"><span class="sc-chip" style="background:#e20713"></span><div class="sc-txt"><b>Equipos</b><span>Ubique extintores, red húmeda y activación manual según la simbología.</span></div></div>'
      +'<div class="sc-note">Ante una emergencia, mantenga la calma, no use ascensores y diríjase a la zona de seguridad indicada.</div>';
  }

  var title=isR?'MAPA DE RIESGOS':'PLANO DE EVACUACIÓN';
  var sub=isR?'MONTICHEF · Identificación de peligros':'MONTICHEF · Plan de evacuación';
  el.innerHTML=''+
    '<div class="pl-head"><div class="pl-brand"><div class="pl-logo">LOGO</div><div><div class="pl-title">'+title+'</div><div class="pl-sub">'+sub+'</div></div></div>'+
      '<div class="pl-meta">Plano: <b>'+planLbl+'</b><br>Referencia: <b>Guía DS N°44/2024</b></div></div>'+
    '<div class="pl-body">'+
      '<div class="pl-col pl-left"><div class="pl-h2">'+(isR?'INVENTARIO DE RIESGOS':'INVENTARIO DE ELEMENTOS')+'</div>'+
        '<table class="pl-tbl"><thead><tr><th style="width:64px">Símbolo</th><th>'+(isR?'Peligro identificado':'Elemento')+'</th><th style="width:44px;text-align:center">Cant.</th></tr></thead><tbody>'+invRows+'</tbody></table></div>'+
      '<div class="pl-col pl-right"><div class="pl-h2">'+rightTitle+'</div>'+rightBody+'</div>'+
    '</div>'+
    '<div class="pl-foot"><span>Sistema MAPA-PLANO — MONTICHEF</span><span>Elaborado por: _______________   ·   Revisado por: _______________</span></div>'+
    '<style>'+
    '#___pl .pl-head,.pl-head{background:#16314f;color:#fff;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #cdbf9b;}'+
    '.pl-brand{display:flex;align-items:center;gap:16px;}'+
    '.pl-logo{width:74px;height:74px;border:1.5px dashed #8ea3bd;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#8ea3bd;font-size:10px;letter-spacing:1px;font-family:Arial,sans-serif;}'+
    '.pl-title{font-size:23px;font-weight:bold;letter-spacing:.5px;}'+
    '.pl-sub{font-size:12px;color:#cdbf9b;margin-top:3px;letter-spacing:1px;}'+
    '.pl-meta{text-align:right;font-size:11.5px;line-height:1.6;color:#dfe6ee;}.pl-meta b{color:#fff;}'+
    '.pl-body{display:flex;}'+
    '.pl-col{padding:16px 20px;}.pl-left{flex:1.15;border-right:1px solid #d9d2bf;}.pl-right{flex:1;}'+
    '.pl-h2{font-size:14px;font-weight:bold;color:#16314f;border-bottom:2px solid #16314f;padding-bottom:5px;margin-bottom:10px;}'+
    '.pl-tbl{width:100%;border-collapse:collapse;font-size:13px;}'+
    '.pl-tbl thead th{font-size:10px;letter-spacing:.5px;color:#6b6450;text-transform:uppercase;text-align:left;padding:3px 6px;font-weight:bold;}'+
    '.pl-tbl td{padding:5px 6px;border-bottom:1px solid #ece7d8;vertical-align:middle;}'+
    '.pl-tbl tr.lvlhead td{padding:0;}.pl-tbl tr.lvlhead span{display:block;color:#fff;font-size:11px;font-weight:bold;letter-spacing:.8px;padding:4px 8px;}'+
    '.pl-tbl td.sym svg,.pl-tbl td.sym img{display:block;}.pl-tbl td.nm{font-size:13px;color:#20242b;}'+
    '.pl-tbl td.qty{text-align:center;font-weight:bold;font-size:14px;color:#16314f;}'+
    '.sc-row{display:flex;gap:10px;align-items:flex-start;margin-bottom:11px;}'+
    '.sc-chip{flex:0 0 22px;height:22px;border-radius:4px;margin-top:2px;border:1px solid rgba(0,0,0,.25);}'+
    '.sc-txt{font-size:12px;line-height:1.35;color:#33393f;}.sc-txt b{display:block;color:#16314f;font-size:13px;margin-bottom:1px;}'+
    '.sc-note{margin-top:14px;padding:9px 12px;background:#f3f0e7;border-left:3px solid #cdbf9b;font-size:11px;color:#5c5641;line-height:1.4;}'+
    '.pl-foot{background:#16314f;color:#cdbf9b;padding:7px 20px;font-size:10.5px;display:flex;justify-content:space-between;font-family:Arial,sans-serif;}'+
    '</style>';
  return el;
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

