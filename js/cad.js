/* ══════════════════════════════════════════════════════════
   08_js_cad.js — Editor CAD básico (paredes, habitaciones,
   ventanas, puertas, texto) con medidas en tiempo real
══════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── Estado global del CAD ── */
var _cadOpen=false,_cadDark=true,_cadTool='wall',_cadSnapEnabled=true;
var _cadGridPx=20,_cadScaleM=1; /* 1 cuadro = 1 metro */
var _cadStrokeColor='#1e40af',_cadLineW=3;
var _cadShapes=[],_cadUndoStack=[];
var _cadDrawing=false,_cadStart=null,_cadMouse=null;
var _cCanvas=null,_cCtx=null;
var _lastEP=null; /* último extremo al que se imantó el cursor (para la marca visual) */

/* ── Paletas de color oscuro/claro ── */
var _cadTheme={
  dark:{bg:'#111827',grid:'rgba(255,255,255,.055)',gridHi:'rgba(255,255,255,.15)',
        lbl:'#fcd34d',txt:'#e2e8f0',roomFill:'rgba(100,181,246,.09)',
        toolbarBg:'#1e293b',toolbarBrd:'#334155',btnTxt:'#cbd5e1',
        activeBg:'#f0a829',activeTxt:'#1a1000'},
  light:{bg:'#f0f4f8',grid:'rgba(0,0,0,.07)',gridHi:'rgba(0,0,0,.2)',
         lbl:'#92400e',txt:'#1e293b',roomFill:'rgba(21,101,192,.07)',
         toolbarBg:'#e2e8f0',toolbarBrd:'#cbd5e1',btnTxt:'#334155',
         activeBg:'#f0a829',activeTxt:'#1a1000'}
};
function _th(){return _cadDark?_cadTheme.dark:_cadTheme.light;}

/* ── Helpers ── */
function _snapV(v){return _cadSnapEnabled?Math.round(v/_cadGridPx)*_cadGridPx:v;}
function _pxToM(px){return Math.round(Math.abs(px)/_cadGridPx*_cadScaleM*100)/100;}
function _fmtM(m){return m+' m';}
function _distPts(x1,y1,x2,y2){return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));}

function _getPos(e){
  var r=_cCanvas.getBoundingClientRect();
  /* En 'touchend' e.touches viene vacío (el dedo ya se levantó); hay que usar
     e.changedTouches. Con mouse no existe ninguno de los dos y cae en 'e'. */
  var src=(e.touches&&e.touches.length)?e.touches[0]
         :((e.changedTouches&&e.changedTouches.length)?e.changedTouches[0]:e);
  var rx=src.clientX-r.left,ry=src.clientY-r.top;
  var x=_snapV(rx),y=_snapV(ry);
  /* Imantar al extremo de una figura ya dibujada, para empalmar/continuar
     líneas sin tener que apuntar al pixel exacto. */
  var ep=_nearestEndpoint(rx,ry);
  _lastEP=ep;
  if(ep){x=ep.x;y=ep.y;}
  return{x:x,y:y,rx:rx,ry:ry};
}

/* Extremo de figura más cercano al cursor dentro de 12 px (o null). */
function _nearestEndpoint(x,y){
  var best=null,bd=12;
  for(var i=0;i<_cadShapes.length;i++){
    var s=_cadShapes[i];if(s.type==='text')continue;
    var pts=[[s.x1,s.y1],[s.x2,s.y2]];
    for(var j=0;j<2;j++){
      var d=Math.sqrt((x-pts[j][0])*(x-pts[j][0])+(y-pts[j][1])*(y-pts[j][1]));
      if(d<bd){bd=d;best={x:pts[j][0],y:pts[j][1]};}
    }
  }
  return best;
}

/* Largo fijo (m) tecleado en la barra → px. Vacío/0 = dibujo libre. */
function _typedLenPx(){
  var el=document.getElementById('cad-len-inp');
  if(!el)return 0;
  var v=parseFloat(String(el.value||'').replace(',','.'));
  if(!v||v<=0)return 0;
  return v/_cadScaleM*_cadGridPx;
}

/* Punto final del segmento en curso: si hay largo fijo, se bloquea a esa
   distancia exacta en la dirección del cursor; si no, es el cursor. */
function _segEnd(p){
  if(!_cadStart||_cadTool==='room')return p;
  var L=_typedLenPx();
  if(L>0){
    var dx=p.x-_cadStart.x,dy=p.y-_cadStart.y,d=Math.sqrt(dx*dx+dy*dy)||1;
    return{x:Math.round(_cadStart.x+dx/d*L),y:Math.round(_cadStart.y+dy/d*L)};
  }
  return p;
}

/* Cortar la cadena de dibujo (Esc / clic derecho / cambiar de herramienta). */
function _endChain(){
  _cadDrawing=false;_cadStart=null;
  var di=document.getElementById('cad-dim-info');if(di)di.style.display='none';
  _cadRender();
}

/* ── Abrir editor ── */
function _cadOpenEditor(){
  _cadOpen=true;
  _cadShapes=[];_cadUndoStack=[];_cadDrawing=false;_cadStart=null;_cadMouse=null;
  document.getElementById('cad-overlay').style.display='flex';
  _showPlansOverlay(false);
  _cadApplyTheme();
  setTimeout(_cadResize,40);
}

/* ── Cerrar editor ── */
function _cadCloseEditor(){
  _cadOpen=false;
  _cadDrawing=false;
  document.getElementById('cad-overlay').style.display='none';
  _showPlansOverlay(true);
  _loadUserPlans();
}

/* ── Resize canvas ── */
function _cadResize(){
  if(!_cCanvas)return;
  var stage=document.getElementById('cad-stage');
  _cCanvas.width=stage.clientWidth||800;
  _cCanvas.height=stage.clientHeight||600;
  _cadRender();
}

/* ══════════════════════════════════════════════════════════
   RENDER
══════════════════════════════════════════════════════════ */
function _cadRender(){
  if(!_cCtx||!_cCanvas)return;
  var ctx=_cCtx,w=_cCanvas.width,h=_cCanvas.height,th=_th();

  /* fondo */
  ctx.fillStyle=th.bg;
  ctx.fillRect(0,0,w,h);

  /* grid */
  ctx.lineWidth=0.5;
  for(var gx=0;gx<=w;gx+=_cadGridPx){
    ctx.strokeStyle=(gx%(_cadGridPx*5)===0)?th.gridHi:th.grid;
    ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,h);ctx.stroke();
  }
  for(var gy=0;gy<=h;gy+=_cadGridPx){
    ctx.strokeStyle=(gy%(_cadGridPx*5)===0)?th.gridHi:th.grid;
    ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(w,gy);ctx.stroke();
  }

  /* eje de escala — pequeña regla en esquina inferior derecha */
  var ru=_cadGridPx*5; /* 5 celdas */
  var rx=w-ru-20,ry=h-20;
  ctx.strokeStyle=th.gridHi;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx+ru,ry);ctx.stroke();
  ctx.beginPath();ctx.moveTo(rx,ry-5);ctx.lineTo(rx,ry+5);ctx.stroke();
  ctx.beginPath();ctx.moveTo(rx+ru,ry-5);ctx.lineTo(rx+ru,ry+5);ctx.stroke();
  ctx.font='10px Segoe UI,sans-serif';ctx.fillStyle=th.gridHi;ctx.textAlign='center';
  ctx.fillText(_fmtM(_pxToM(ru)),rx+ru/2,ry-8);ctx.textAlign='left';

  /* figuras guardadas */
  _cadShapes.forEach(function(s){_cadDrawShape(ctx,s,false);});

  /* preview mientras se dibuja */
  if(_cadDrawing&&_cadStart&&_cadMouse){
    _cadDrawShape(ctx,_cadMakeShape(_cadStart,_segEnd(_cadMouse)),true);
  }

  /* cursor guía */
  if(_cadMouse){
    ctx.strokeStyle='rgba(240,168,41,.35)';ctx.lineWidth=0.7;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(_cadMouse.x,0);ctx.lineTo(_cadMouse.x,h);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,_cadMouse.y);ctx.lineTo(w,_cadMouse.y);ctx.stroke();
    ctx.setLineDash([]);
    /* punto de snap */
    ctx.fillStyle='#f0a829';
    ctx.beginPath();ctx.arc(_cadMouse.x,_cadMouse.y,3,0,6.28);ctx.fill();
  }

  /* marca verde cuando el cursor está imantado a un extremo existente */
  if(_lastEP){
    ctx.strokeStyle='#22c55e';ctx.lineWidth=2;
    ctx.strokeRect(_lastEP.x-5,_lastEP.y-5,10,10);
  }
}

/* ── Construir objeto figura ── */
function _cadMakeShape(a,b){
  var s={type:_cadTool,x1:a.x,y1:a.y,x2:b.x,y2:b.y,
         color:_cadStrokeColor,lw:parseInt(_cadLineW)||3};
  if(_cadTool==='window'){var db=document.getElementById('cad-dbl');if(db&&db.checked)s.dbl=1;}
  return s;
}

/* ── Dibujar una figura en el canvas ── */
function _cadDrawShape(ctx,s,preview){
  ctx.save();
  if(preview)ctx.globalAlpha=0.6;
  var th=_th();
  ctx.strokeStyle=s.color||th.lbl;
  ctx.lineWidth=s.lw||3;
  ctx.lineCap='round';ctx.lineJoin='round';

  if(s.type==='wall'){
    ctx.beginPath();ctx.moveTo(s.x1,s.y1);ctx.lineTo(s.x2,s.y2);ctx.stroke();
    _cadLblLine(ctx,s,th);

  }else if(s.type==='room'){
    var rx2=Math.min(s.x1,s.x2),ry2=Math.min(s.y1,s.y2);
    var rw=Math.abs(s.x2-s.x1),rh2=Math.abs(s.y2-s.y1);
    ctx.fillStyle=th.roomFill;
    ctx.beginPath();ctx.rect(rx2,ry2,rw,rh2);ctx.fill();
    ctx.strokeStyle=s.color;
    ctx.beginPath();ctx.rect(rx2,ry2,rw,rh2);ctx.stroke();
    _cadLblRoom(ctx,s,th);

  }else if(s.type==='window'){
    var dx=s.x2-s.x1,dy=s.y2-s.y1,len=Math.sqrt(dx*dx+dy*dy)||1;
    var half=s.dbl?9:7;
    var nx=-dy/len*half,ny=dx/len*half;
    ctx.strokeStyle=s.color;ctx.lineWidth=s.lw||2;
    /* líneas paralelas = símbolo ventana (3 simple, 4 para ventanal doble) */
    var offs=s.dbl?[[nx,ny],[nx/3,ny/3],[-nx/3,-ny/3],[-nx,-ny]]:[[0,0],[nx,ny],[-nx,-ny]];
    offs.forEach(function(off){
      ctx.beginPath();
      ctx.moveTo(s.x1+off[0],s.y1+off[1]);
      ctx.lineTo(s.x2+off[0],s.y2+off[1]);
      ctx.stroke();
    });
    /* extremos */
    ctx.beginPath();ctx.moveTo(s.x1+nx,s.y1+ny);ctx.lineTo(s.x1-nx,s.y1-ny);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s.x2+nx,s.y2+ny);ctx.lineTo(s.x2-nx,s.y2-ny);ctx.stroke();
    /* montante central (dos hojas) para el ventanal doble */
    if(s.dbl){
      var mx=(s.x1+s.x2)/2,my=(s.y1+s.y2)/2;
      ctx.beginPath();ctx.moveTo(mx+nx,my+ny);ctx.lineTo(mx-nx,my-ny);ctx.stroke();
    }
    _cadLblLine(ctx,s,th);

  }else if(s.type==='door'){
    var ddx=s.x2-s.x1,ddy=s.y2-s.y1;
    var dlen=Math.sqrt(ddx*ddx+ddy*ddy);
    var dang=Math.atan2(ddy,ddx);
    /* hoja de puerta */
    ctx.strokeStyle=s.color;ctx.lineWidth=s.lw||2;
    ctx.beginPath();ctx.moveTo(s.x1,s.y1);ctx.lineTo(s.x2,s.y2);ctx.stroke();
    /* arco de barrido */
    ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.arc(s.x1,s.y1,dlen,dang-Math.PI/2,dang,false);ctx.stroke();
    ctx.setLineDash([]);
    _cadLblLine(ctx,s,th);

  }else if(s.type==='text'){
    ctx.fillStyle=s.color||th.txt;
    ctx.font=(s.sz||14)+'px Segoe UI,system-ui,sans-serif';
    ctx.fillText(s.txt||'Texto',s.x1,s.y1);
  }
  ctx.restore();
}

/* ── Etiqueta medida para línea ── */
function _cadLblLine(ctx,s,th){
  var dx=s.x2-s.x1,dy=s.y2-s.y1;
  var len=Math.sqrt(dx*dx+dy*dy);
  if(len<8)return;
  var m=_pxToM(len);
  var mx=(s.x1+s.x2)/2,my=(s.y1+s.y2)/2;
  var ang=Math.atan2(dy,dx);
  ctx.save();
  ctx.translate(mx,my);
  if(ang>Math.PI/2||ang<-Math.PI/2)ctx.rotate(ang+Math.PI);else ctx.rotate(ang);
  ctx.font='bold 11px Segoe UI,sans-serif';
  ctx.textAlign='center';
  ctx.fillStyle=th.lbl;
  /* sombra para legibilidad */
  ctx.shadowColor=_cadDark?'#111827':'#f0f4f8';
  ctx.shadowBlur=3;
  ctx.fillText(_fmtM(m),0,-7);
  ctx.restore();
}

/* ── Etiqueta medida para rectángulo ── */
function _cadLblRoom(ctx,s,th){
  var rw=Math.abs(s.x2-s.x1),rh=Math.abs(s.y2-s.y1);
  if(rw<12||rh<12)return;
  var wm=_pxToM(rw),hm=_pxToM(rh);
  var area=Math.round(wm*hm*100)/100;
  var cx=(s.x1+s.x2)/2,cy=(s.y1+s.y2)/2;
  ctx.save();
  ctx.font='bold 12px Segoe UI,sans-serif';
  ctx.textAlign='center';
  ctx.fillStyle=th.lbl;
  ctx.shadowColor=_cadDark?'#111827':'#f0f4f8';ctx.shadowBlur=3;
  ctx.fillText(_fmtM(wm)+' × '+_fmtM(hm),cx,cy-7);
  ctx.font='11px Segoe UI,sans-serif';
  ctx.fillText(area+' m²',cx,cy+10);
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   EVENTOS DE DIBUJO
══════════════════════════════════════════════════════════ */
function _cadOnDown(e){
  e.preventDefault();
  var p=_getPos(e);
  if(_cadTool==='erase'){_cadErase(p);return;}
  if(_cadTool==='text'){_cadInsertText(p);return;}
  if(_cadTool==='room'){_cadDrawing=true;_cadStart=p;_cadMouse=p;_cadRender();return;}
  /* Pared / Ventana / Puerta = polilínea: cada clic fija un punto y el
     siguiente segmento arranca desde ahí, así se "continúa" la línea sin
     borrar. Esc / clic derecho / cambiar de herramienta corta la cadena. */
  if(!_cadStart){_cadStart={x:p.x,y:p.y};_cadDrawing=true;_cadMouse=p;_cadRender();return;}
  var end=_segEnd(p);
  var ddx=end.x-_cadStart.x,ddy=end.y-_cadStart.y;
  if(Math.sqrt(ddx*ddx+ddy*ddy)<3){_endChain();return;} /* clic en el mismo punto = terminar */
  _cadUndoStack.push(JSON.stringify(_cadShapes));
  _cadShapes.push(_cadMakeShape(_cadStart,end));
  _cadStart={x:end.x,y:end.y};
  _cadMouse=p;
  _cadRender();
}

function _cadOnMove(e){
  e.preventDefault();
  var p=_getPos(e);
  _cadMouse=p;
  /* actualizar status bar */
  var sb=document.getElementById('cad-status');
  if(sb)sb.textContent='X: '+_fmtM(_pxToM(p.x))+'  Y: '+_fmtM(_pxToM(p.y));
  /* etiqueta de medida en tiempo real */
  var di=document.getElementById('cad-dim-info');
  if(_cadDrawing&&_cadStart&&di){
    var dx=p.x-_cadStart.x,dy=p.y-_cadStart.y;
    if(_cadTool==='room'){
      var wm=_pxToM(Math.abs(dx)),hm=_pxToM(Math.abs(dy));
      di.textContent=_fmtM(wm)+' × '+_fmtM(hm)+'  =  '+Math.round(wm*hm*100)/100+' m²';
    }else{
      var pe=_segEnd(p);
      di.textContent=_fmtM(_pxToM(Math.sqrt((pe.x-_cadStart.x)*(pe.x-_cadStart.x)+(pe.y-_cadStart.y)*(pe.y-_cadStart.y))));
    }
    di.style.display='';
  }else if(di){di.style.display='none';}
  _cadRender();
}

function _cadOnUp(e){
  e.preventDefault();
  /* Pared/Ventana/Puerta se dibujan por clics (polilínea), no por arrastre:
     el mouseup no cierra el segmento. Solo Habitación usa arrastre. */
  if(_cadTool!=='room')return;
  if(!_cadDrawing||!_cadStart)return;
  var p=_getPos(e);
  _cadDrawing=false;
  var s=_cadMakeShape(_cadStart,p);
  var dx=s.x2-s.x1,dy=s.y2-s.y1;
  if(Math.sqrt(dx*dx+dy*dy)<3){_cadStart=null;_cadRender();return;}
  _cadUndoStack.push(JSON.stringify(_cadShapes));
  _cadShapes.push(s);
  _cadStart=null;
  var di=document.getElementById('cad-dim-info');if(di)di.style.display='none';
  _cadRender();
}

/* ── Borrar figura bajo el cursor ── */
function _cadErase(p){
  for(var i=_cadShapes.length-1;i>=0;i--){
    if(_cadHit(_cadShapes[i],p.x,p.y)){
      _cadUndoStack.push(JSON.stringify(_cadShapes));
      _cadShapes.splice(i,1);
      _cadRender();return;
    }
  }
}

function _cadHit(s,x,y){
  var tol=14;
  if(s.type==='room'){
    var rx=Math.min(s.x1,s.x2),ry=Math.min(s.y1,s.y2);
    return x>=rx-tol&&x<=rx+Math.abs(s.x2-s.x1)+tol&&y>=ry-tol&&y<=ry+Math.abs(s.y2-s.y1)+tol;
  }
  if(s.type==='text')return Math.abs(x-s.x1)<50&&Math.abs(y-s.y1)<20;
  return _distSeg(x,y,s.x1,s.y1,s.x2,s.y2)<tol;
}

function _distSeg(px,py,x1,y1,x2,y2){
  var dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;
  if(l2===0)return Math.sqrt((px-x1)*(px-x1)+(py-y1)*(py-y1));
  var t=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/l2));
  return Math.sqrt((px-(x1+t*dx))*(px-(x1+t*dx))+(py-(y1+t*dy))*(py-(y1+t*dy)));
}

function _cadInsertText(p){
  var txt=prompt('Escribe el texto para el plano:','Habitación');
  if(!txt)return;
  _cadUndoStack.push(JSON.stringify(_cadShapes));
  _cadShapes.push({type:'text',x1:p.x,y1:p.y,txt:txt,color:_cadStrokeColor,sz:14});
  _cadRender();
}

/* ── Deshacer ── */
function _cadUndo(){
  if(!_cadUndoStack.length)return;
  _cadShapes=JSON.parse(_cadUndoStack.pop());
  _cadDrawing=false;_cadStart=null;
  _cadRender();
}

/* ── Limpiar todo ── */
function _cadClear(){
  if(!_cadShapes.length)return;
  if(!confirm('¿Borrar todo el plano?'))return;
  _cadUndoStack.push(JSON.stringify(_cadShapes));
  _cadShapes=[];
  _cadDrawing=false;_cadStart=null;
  _cadRender();
}

/* ── Guardar plano ── */
function _cadSavePlan(){
  if(!_cadShapes.length){_showToast('Dibuja algo primero.',true);return;}
  var nameEl=document.getElementById('cad-plan-name');
  var name=(nameEl?nameEl.value.trim():'')||'Plano CAD';
  /* Exportar siempre en modo CLARO (fondo blanco) para que sea legible como fondo de plano */
  _cadDrawing=false;_cadMouse=null;_cadStart=null;
  var wasDark=_cadDark;
  _cadDark=false;
  _cadRender();
  var dataUrl=_cCanvas.toDataURL('image/jpeg',0.92);
  _cadDark=wasDark;
  _cadRender();
  _plansCol().add({
    name:name,img:dataUrl,builtin:false,cad:true,
    markers:[],zw:100,title:name,
    createdAt:Date.now(),updatedAt:Date.now()
  }).then(function(ref){
    _showToast('Plano guardado: '+name);
    _cadCloseEditor();
  }).catch(function(e){_showToast('Error al guardar: '+e.message,true);});
}

/* ── Aplicar tema visual ── */
function _cadApplyTheme(){
  var th=_th();
  var el=function(id){return document.getElementById(id);};
  var ov=el('cad-overlay');if(ov)ov.style.background=th.toolbarBg;
  var tb=el('cad-toolbar');if(tb){tb.style.background=th.toolbarBg;tb.style.borderBottomColor=th.toolbarBrd;}
  var side=el('cad-sidebar');if(side){side.style.background=_cadDark?'#0e1923':'#d8e2ee';side.style.borderRightColor=th.toolbarBrd;}
  var sbar=el('cad-statusbar');if(sbar){sbar.style.background=th.toolbarBg;sbar.style.color=th.btnTxt;}
  var stg=el('cad-stage');if(stg)stg.style.background=th.bg;
  var thBtn=el('cad-theme-btn');if(thBtn)thBtn.textContent=_cadDark?'☀':'🌙';
  var scaleInp=el('cad-scale-inp');if(scaleInp){scaleInp.style.background=_cadDark?'#0f172a':'#fff';scaleInp.style.color=th.txt;}
  var nameInp=el('cad-plan-name');if(nameInp){nameInp.style.background=_cadDark?'#0f172a':'#fff';nameInp.style.color=th.txt;}
  document.querySelectorAll('.cad-tb').forEach(function(b){
    b.classList.toggle('active',b.dataset.cadTool===_cadTool);
  });
  _cadRender();
}

/* ── Seleccionar herramienta ── */
function _cadSelectTool(tool){
  if(tool!==_cadTool)_endChain();
  _cadTool=tool;
  var cur={wall:'crosshair',room:'crosshair',window:'crosshair',door:'crosshair',text:'text',erase:'cell'}[tool]||'crosshair';
  if(_cCanvas)_cCanvas.style.cursor=cur;
  var lenWrap=document.getElementById('cad-len-wrap');
  if(lenWrap)lenWrap.style.display=(tool==='wall'||tool==='window'||tool==='door')?'':'none';
  var dblWrap=document.getElementById('cad-dbl-wrap');
  if(dblWrap)dblWrap.style.display=(tool==='window')?'':'none';
  _cadApplyTheme();
}

/* ══════════════════════════════════════════════════════════
   INICIALIZACIÓN — wires up DOM elements
══════════════════════════════════════════════════════════ */
function _cadInit(){
  /* botón en pantalla de planos */
  var btnCreate=document.getElementById('plans-create-btn');
  if(btnCreate)btnCreate.addEventListener('click',_cadOpenEditor);

  /* botón cerrar/volver */
  var backBtn=document.getElementById('cad-back');
  if(backBtn)backBtn.addEventListener('click',_cadCloseEditor);

  /* tema */
  var thBtn=document.getElementById('cad-theme-btn');
  if(thBtn)thBtn.addEventListener('click',function(){_cadDark=!_cadDark;_cadApplyTheme();});

  /* herramientas */
  document.querySelectorAll('.cad-tb[data-cad-tool]').forEach(function(btn){
    btn.addEventListener('click',function(){_cadSelectTool(btn.dataset.cadTool);});
  });

  /* color */
  var colInp=document.getElementById('cad-color');
  if(colInp)colInp.addEventListener('input',function(){_cadStrokeColor=this.value;});

  /* grosor */
  var lwInp=document.getElementById('cad-lw');
  var lwVal=document.getElementById('cad-lw-val');
  if(lwInp)lwInp.addEventListener('input',function(){
    _cadLineW=parseInt(this.value)||3;
    if(lwVal)lwVal.textContent=this.value+'px';
  });

  /* snap */
  var snapChk=document.getElementById('cad-snap-chk');
  if(snapChk)snapChk.addEventListener('change',function(){_cadSnapEnabled=this.checked;});

  /* escala */
  var scaleInp=document.getElementById('cad-scale-inp');
  if(scaleInp)scaleInp.addEventListener('change',function(){
    var v=parseFloat(this.value);if(v>0)_cadScaleM=v;_cadRender();
  });

  /* deshacer */
  var undoBtn=document.getElementById('cad-undo');
  if(undoBtn)undoBtn.addEventListener('click',_cadUndo);

  /* limpiar */
  var clearBtn=document.getElementById('cad-clear');
  if(clearBtn)clearBtn.addEventListener('click',_cadClear);

  /* guardar */
  var saveBtn=document.getElementById('cad-save-plan');
  if(saveBtn)saveBtn.addEventListener('click',_cadSavePlan);

  /* canvas */
  _cCanvas=document.getElementById('cad-canvas');
  _cCtx=_cCanvas?_cCanvas.getContext('2d'):null;
  if(_cCanvas){
    _cCanvas.addEventListener('mousedown',_cadOnDown);
    _cCanvas.addEventListener('mousemove',_cadOnMove);
    _cCanvas.addEventListener('mouseup',_cadOnUp);
    _cCanvas.addEventListener('mouseleave',function(){
      _cadMouse=null;_lastEP=null;
      var di=document.getElementById('cad-dim-info');if(di)di.style.display='none';
      _cadRender();
    });
    _cCanvas.addEventListener('contextmenu',function(ev){ev.preventDefault();_endChain();});
    _cCanvas.addEventListener('touchstart',_cadOnDown,{passive:false});
    _cCanvas.addEventListener('touchmove',_cadOnMove,{passive:false});
    _cCanvas.addEventListener('touchend',_cadOnUp,{passive:false});
  }

  /* atajos de teclado */
  document.addEventListener('keydown',function(e){
    if(!_cadOpen)return;
    if(e.key==='Escape'){_endChain();return;}
    if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();_cadUndo();return;}
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
    var map={w:'wall',r:'room',v:'window',d:'door',t:'text',e:'erase'};
    if(map[e.key])_cadSelectTool(map[e.key]);
  });

  window.addEventListener('resize',function(){if(_cadOpen)_cadResize();});

  /* inicializa visibilidad de los campos que dependen de la herramienta */
  _cadSelectTool(_cadTool);
}

/* Exponer apertura globalmente */
window._openCadEditor=_cadOpenEditor;

_cadInit();

})();


