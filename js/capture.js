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
        de ancho (se agranda), los íconos deben usar SOLO markerScale (ms),
        no _zw/100*ms — si no quedan proporcionalmente chicos. También se
        preserva la rotación individual (markerRot) para que no salgan al revés. */
  document.querySelectorAll('.marker:not(.evac-arrow)').forEach(function(m){
    m._origTr=m.style.transform;
    m._origOrg=m.style.transformOrigin;
    var ms=parseFloat(m.dataset.markerScale||1);
    var mr=parseFloat(m.dataset.markerRot||0);
    m.style.transform='translate(-50%,-50%) scale('+ms+') rotate('+mr+'deg)';
    m.style.transformOrigin='50% 50%';
  });

  /* 4. Fijar posición de leyenda en % para que no se mueva al resetear zoom.
        Convertimos px → % del markerLayer ANTES de cambiar el ancho,
        así la posición relativa se preserva exactamente donde el usuario la dejó. */
  var legEl=document.getElementById('legend');
  var _legOL=legEl.style.left,_legOT=legEl.style.top,_legOB=legEl.style.bottom,_legOR=legEl.style.right;
  if(_legOL&&_legOL!=='auto'&&_legOL!==''){
    var _mlW=ml.offsetWidth||800,_mlH=ml.offsetHeight||600;
    legEl.style.left=(parseFloat(_legOL)/_mlW*100)+'%';
    legEl.style.top=(parseFloat(_legOT||0)/_mlH*100)+'%';
    legEl.style.bottom='auto';legEl.style.right='auto';
  }

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
    legEl.style.left=_legOL;legEl.style.top=_legOT;legEl.style.bottom=_legOB;legEl.style.right=_legOR;
    document.querySelectorAll('.del,.arr-del,.arr-resize').forEach(function(d){d.style.display='';});
    document.querySelectorAll('.marker').forEach(function(m){m.style.visibility=m._origVis||'visible';});
    document.querySelectorAll('.marker:not(.evac-arrow)').forEach(function(m){
      m.style.transform=m._origTr||'';
      m.style.transformOrigin=m._origOrg||'50% 50%';
    });
    _scaleMarkers();
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

