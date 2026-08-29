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
var _WIN_H_M=2.2; /* alto estándar de ventanas/ventanales (m); el usuario regula el ancho */
var _DOOR_H_M=2.1; /* alto estándar de puertas (m) */
var _WALL_H_M=2.5; /* alto estándar de muro para la vista de frentes (m) */
var _cadSel=null;  /* figura seleccionada con la herramienta Mover */
var _cadDrag=null; /* sesión de arrastre: {mode:'move'|'p1'|'p2', sx, sy, orig} */
var _cadPlanId=null; /* id del plano que se está editando (null = plano nuevo) */
var _cadEraseHover=null; /* figura resaltada bajo el cursor con la herramienta Borrar */
var _cadDelHit=null;     /* zona del botón ✕ de la figura seleccionada: {x,y,r} */
var _cadRefImg=null;     /* dibujo de un plano de versión anterior, de fondo para calcar encima */
var _cadAutoT=null,_cadDirty=false; /* autoguardado del dibujo CAD */
var _cadRedoStack=[]; /* para Rehacer */
/* Guarda el estado actual para Deshacer (y descarta lo que hubiera para Rehacer). */
function _cadPushUndo(){_cadUndoStack.push(JSON.stringify(_cadShapes));if(_cadUndoStack.length>120)_cadUndoStack.shift();_cadRedoStack.length=0;}

/* ── Autoguardado del dibujo CAD ──
   Cada cambio (dibujar / mover / borrar / deshacer) programa un guardado.
   Si el plano ya existe, actualiza sus figuras; si es nuevo, lo crea a los
   pocos segundos del primer trazo. Así el trabajo no se pierde y el plano
   queda SIEMPRE editable la próxima vez. */
function _cadSaveMark(txt,isErr){
  var el=document.getElementById('cad-save-mark');
  if(!el)return;
  el.textContent=txt||'';
  el.style.color=isErr?'#fca5a5':'#86efac';
  clearTimeout(el._t);
  if(txt)el._t=setTimeout(function(){el.textContent='';},2600);
}
function _cadAutoSave(){
  if(!_cadPlanId||_cadPlanId==='__nuevo__'||!_cadShapes.length)return;
  _plansCol().doc(_cadPlanId).set({
    cadShapes:JSON.parse(JSON.stringify(_cadShapes)),
    cad:true,updatedAt:Date.now()
  },{merge:true}).then(function(){
    _cadDirty=false;_cadSaveMark('✓ guardado automáticamente');
  }).catch(function(e){_cadSaveMark('✗ no se pudo autoguardar',true);});
}
function _cadAutoCreate(){
  if(_cadPlanId||!_cadShapes.length)return;
  _cadPlanId='__nuevo__'; /* candado para no crear dos veces */
  var name=((document.getElementById('cad-plan-name')||{}).value||'').trim()||'Plano CAD';
  _plansCol().add({
    name:name,cad:true,builtin:false,title:name,
    cadShapes:JSON.parse(JSON.stringify(_cadShapes)),
    markers:[],zw:100,createdAt:Date.now(),updatedAt:Date.now()
  }).then(function(ref){_cadPlanId=ref.id;_cadDirty=false;_cadSaveMark('✓ guardado automáticamente');})
   .catch(function(e){_cadPlanId=null;_cadSaveMark('✗ no se pudo guardar',true);});
}
function _cadTouch(){
  _cadDirty=true;

  clearTimeout(_cadAutoT);
  _cadAutoT=setTimeout(function(){
    if(!_cadPlanId)_cadAutoCreate();
    else _cadAutoSave();
  },1400);
}
function _cadFlushSave(){
  clearTimeout(_cadAutoT);
  if(_cadDirty&&_cadShapes.length){
    if(!_cadPlanId)_cadAutoCreate();
    else _cadAutoSave();
  }
}
var _WIN_COL='#ffffff'; /* las ventanas siempre blancas */
var _DOOR_COL='#8b5a2b'; /* las puertas siempre café */

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
    if(_cadDrag&&s===_cadSel)continue; /* no imantar una figura a sí misma al editarla */
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

/* ¿Dos figuras del mismo tipo y estilo? (para poder fusionarlas) */
function _sameStyle(a,b){
  return !!a&&!!b&&a.type===b.type&&a.color===b.color&&(a.lw||3)===(b.lw||3)&&(a.dbl?1:0)===(b.dbl?1:0);
}
/* ¿El tramo (sx,sy)->(ex,ey) es la MISMA recta y sentido que 'last', y parte
   justo de su punto final? Entonces alargar 'last' en vez de crear otro tramo,
   para que una línea recta continua quede con UNA sola medida, no dos. */
function _isCollinearContinuation(last,sx,sy,ex,ey){
  if(!last)return false;
  if(Math.abs(last.x2-sx)>0.5||Math.abs(last.y2-sy)>0.5)return false;
  var v1x=last.x2-last.x1,v1y=last.y2-last.y1;
  var v2x=ex-sx,v2y=ey-sy;
  var m1=Math.sqrt(v1x*v1x+v1y*v1y),m2=Math.sqrt(v2x*v2x+v2y*v2y);
  if(m1<1||m2<1)return false;
  var cross=Math.abs(v1x*v2y-v1y*v2x)/(m1*m2);   /* ~sin(ángulo entre ambos) */
  var dot=(v1x*v2x+v1y*v2y)/(m1*m2);              /* ~cos(ángulo) */
  return cross<0.05&&dot>0;                       /* misma recta, mismo sentido */
}

/* ══════════════════════════════════════════════════════════
   MOVER / EDITAR — seleccionar una figura y arrastrarla entera
   o tirar de sus extremos para alargarla/moverla
══════════════════════════════════════════════════════════ */
/* Figura (la de más arriba) que está bajo el punto (px,py), o null. */
function _cadPickShape(px,py){
  for(var i=_cadShapes.length-1;i>=0;i--){
    if(_cadHit(_cadShapes[i],px,py))return _cadShapes[i];
  }
  return null;
}
/* Empieza una sesión de arrastre sobre la figura seleccionada. */
function _cadBeginDrag(mode,p){
  if(!_cadSel)return;
  _cadPushUndo();
  _cadDrag={mode:mode,sx:p.x,sy:p.y,orig:JSON.parse(JSON.stringify(_cadSel))};
}
/* Cota en vivo mientras se mueve/edita la figura seleccionada. */
function _cadSelDimText(){
  var s=_cadSel;if(!s)return '';
  if(s.type==='room'){
    var wm=_pxToM(Math.abs(s.x2-s.x1)),hm=_pxToM(Math.abs(s.y2-s.y1));
    return _fmtM(wm)+' × '+_fmtM(hm)+'  =  '+Math.round(wm*hm*100)/100+' m²';
  }
  if(s.type==='text')return '';
  var L=_pxToM(Math.sqrt((s.x2-s.x1)*(s.x2-s.x1)+(s.y2-s.y1)*(s.y2-s.y1)));
  if(s.type==='window')return L+' × '+_WIN_H_M+' m';
  return _fmtM(L);
}

/* ── Abrir editor ── */
function _cadOpenEditor(){
  _cadOpen=true;
  _cadShapes=[];_cadUndoStack=[];_cadRedoStack=[];_cadDrawing=false;_cadStart=null;_cadMouse=null;
  _cadSel=null;_cadDrag=null;_cadPlanId=null;
  _cadRefImg=null;_cadDark=true;
  _cadDirty=false;clearTimeout(_cadAutoT);_cadSaveMark('');
  var nm=document.getElementById('cad-plan-name');if(nm)nm.value='';
  document.getElementById('cad-overlay').style.display='flex';
  _showPlansOverlay(false);
  _cadSelectTool('wall');
  _cadApplyTheme();
  setTimeout(_cadResize,40);
}

/* Reabre en el editor CAD un plano ya dibujado, con sus figuras, para seguir
   trabajándolo. Al guardar se ACTUALIZA ese mismo plano (no crea otro). */
function _cadEditPlan(planId){
  if(!planId||typeof _plansCol!=='function'){_showToast('No se pudo abrir el plano.',true);return;}
  _plansCol().doc(planId).get().then(function(doc){
    if(!doc.exists){_showToast('El plano ya no existe.',true);return;}
    var d=doc.data();
    _cadOpen=true;
    _cadShapes=(d.cadShapes&&d.cadShapes.length)?JSON.parse(JSON.stringify(d.cadShapes)):[];
    _cadUndoStack=[];_cadRedoStack=[];_cadDrawing=false;_cadStart=null;_cadMouse=null;_cadSel=null;_cadDrag=null;
    _cadPlanId=planId;_cadDirty=false;clearTimeout(_cadAutoT);_cadSaveMark('');
    _cadRefImg=null;_cadDark=true;
    var nm=document.getElementById('cad-plan-name');if(nm)nm.value=d.name||'Plano CAD';
    document.getElementById('cad-overlay').style.display='flex';
    _showPlansOverlay(false);
    _cadElevClose();
    /* Proactivo: si el plano ya tiene figuras, arranca en MOVER (listo para
       seleccionar y borrar/arreglar); si está vacío, arranca en PARED. */
    _cadSelectTool(_cadShapes.length?'select':'wall');
    /* Plano de una versión anterior (dibujo solo como imagen): se muestra ese
       dibujo de fondo, a pantalla completa, para calcar y seguir encima.
       Se pone el editor en modo claro para que calce con la imagen. Se va
       desvaneciendo solo a medida que dibujas; y al reabrir ya no aparece
       porque el plano queda guardado con figuras editables. Sin mensajes. */
    if(!_cadShapes.length&&d.img){
      _cadDark=false;
      var im=new Image();
      im.onload=function(){_cadRefImg=im;_cadRender();};
      im.src=d.img;
    }
    _cadApplyTheme();
    setTimeout(function(){_cadResize();_cadRender();},40);
  }).catch(function(e){_showToast('Error al abrir: '+(e.message||e),true);});
}
window._editCadPlan=_cadEditPlan;

/* ── Cerrar editor ── */
function _cadCloseEditor(){
  _cadFlushSave();          /* guarda cualquier cambio pendiente antes de salir */
  _cadOpen=false;
  _cadDrawing=false;
  _cadPlanId=null;
  _cadRefImg=null;
  _cadDirty=false;clearTimeout(_cadAutoT);_cadSaveMark('');
  _cadElevClose();
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

  /* Dibujo de un plano de versión anterior, de fondo a pantalla completa
     para calcarlo y seguir encima. Sin textos ni bordes; desaparece solo la
     próxima vez que se abre el plano (ya guardado con figuras editables). */
  if(_cadRefImg&&_cadRefImg.width){
    var _iw=_cadRefImg.width,_ih=_cadRefImg.height;
    var _sc=Math.min(w/_iw,h/_ih);
    var _dw=_iw*_sc,_dh=_ih*_sc,_dx=(w-_dw)/2,_dy=(h-_dh)/2;
    ctx.save();ctx.globalAlpha=0.5;ctx.drawImage(_cadRefImg,_dx,_dy,_dw,_dh);ctx.restore();
  }

  /* figuras guardadas */
  _cadShapes.forEach(function(s){_cadDrawShape(ctx,s,false);});

  /* herramienta Borrar: halo rojo sobre lo que está por borrarse */
  if(_cadTool==='erase'&&_cadEraseHover){
    var eh=_cadEraseHover;
    ctx.save();
    ctx.strokeStyle='#ef4444';ctx.globalAlpha=0.5;ctx.lineCap='round';
    ctx.lineWidth=(eh.lw||3)+8;
    if(eh.type==='room'){
      var erx=Math.min(eh.x1,eh.x2),ery=Math.min(eh.y1,eh.y2);
      ctx.strokeRect(erx,ery,Math.abs(eh.x2-eh.x1),Math.abs(eh.y2-eh.y1));
    }else if(eh.type==='text'){
      ctx.globalAlpha=0.32;ctx.fillStyle='#ef4444';ctx.fillRect(eh.x1-4,eh.y1-16,130,22);
    }else{
      ctx.beginPath();ctx.moveTo(eh.x1,eh.y1);ctx.lineTo(eh.x2,eh.y2);ctx.stroke();
    }
    ctx.restore();
  }

  /* preview mientras se dibuja */
  if(_cadDrawing&&_cadStart&&_cadMouse){
    var _pv=_cadMakeShape(_cadStart,_segEnd(_cadMouse));
    var _last=_cadShapes[_cadShapes.length-1];
    if(_cadTool==='wall'&&_last&&_sameStyle(_last,_pv)&&_isCollinearContinuation(_last,_pv.x1,_pv.y1,_pv.x2,_pv.y2)){
      _pv.x1=_last.x1;_pv.y1=_last.y1;   /* previsualiza el tramo COMPLETO unido, con una sola medida */
    }
    _cadDrawShape(ctx,_pv,true);
  }

  /* figura seleccionada (herramienta Mover): contorno + manijas + botón ✕ */
  _cadDelHit=null;
  if(_cadTool==='select'&&_cadSel){
    var ss=_cadSel;
    ctx.save();
    ctx.strokeStyle='#f0a829';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
    if(ss.type==='room'){
      var srx=Math.min(ss.x1,ss.x2),sry=Math.min(ss.y1,ss.y2);
      ctx.strokeRect(srx-3,sry-3,Math.abs(ss.x2-ss.x1)+6,Math.abs(ss.y2-ss.y1)+6);
    }else if(ss.type==='text'){
      ctx.strokeRect(ss.x1-4,ss.y1-16,130,22);
    }else{
      ctx.beginPath();ctx.moveTo(ss.x1,ss.y1);ctx.lineTo(ss.x2,ss.y2);ctx.stroke();
    }
    ctx.setLineDash([]);
    if(ss.type!=='text'){
      [[ss.x1,ss.y1],[ss.x2,ss.y2]].forEach(function(pt){
        ctx.fillStyle='#fff';ctx.strokeStyle='#f0a829';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.rect(pt[0]-4,pt[1]-4,8,8);ctx.fill();ctx.stroke();
      });
    }
    /* botón rojo ✕ para borrar la figura seleccionada, sobre su centro */
    var _bx,_by;
    if(ss.type==='room'){_bx=Math.max(ss.x1,ss.x2)+4;_by=Math.min(ss.y1,ss.y2)-4;}
    else if(ss.type==='text'){_bx=ss.x1+126;_by=ss.y1-12;}
    else {_bx=(ss.x1+ss.x2)/2;_by=Math.min(ss.y1,ss.y2)-24;}
    _by=Math.max(15,_by);_bx=Math.max(15,Math.min(w-15,_bx));
    _cadDelHit={x:_bx,y:_by,r:12};
    ctx.fillStyle='#dc2626';ctx.strokeStyle='#fff';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(_bx,_by,12,0,6.283);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#fff';ctx.lineWidth=2.6;ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(_bx-4.5,_by-4.5);ctx.lineTo(_bx+4.5,_by+4.5);
    ctx.moveTo(_bx+4.5,_by-4.5);ctx.lineTo(_bx-4.5,_by+4.5);
    ctx.stroke();
    ctx.restore();
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
  /* Ventana siempre blanca, puerta siempre café; el resto usa el color elegido. */
  var col=(_cadTool==='window')?_WIN_COL:(_cadTool==='door')?_DOOR_COL:_cadStrokeColor;
  var s={type:_cadTool,x1:a.x,y1:a.y,x2:b.x,y2:b.y,
         color:col,lw:parseInt(_cadLineW)||3};
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
    /* cota: ANCHO (lo regula el usuario) × ALTO estándar.
       Va DEBAJO de la línea (voff +18) para no chocar con la cota de la
       pared sobre la que se apoya la ventana, que va arriba. */
    _cadLblLine(ctx,s,th,_pxToM(len)+' × '+_WIN_H_M+' m',18);

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
    _cadLblLine(ctx,s,th,null,18); /* cota debajo, para no chocar con la pared */

  }else if(s.type==='text'){
    ctx.fillStyle=s.color||th.txt;
    ctx.font=(s.sz||14)+'px Segoe UI,system-ui,sans-serif';
    ctx.fillText(s.txt||'Texto',s.x1,s.y1);
  }
  ctx.restore();
}

/* ── Etiqueta medida para línea ──
   txt  = texto opcional para sobreescribir la cota
   voff = desplazamiento vertical en el marco de la línea (por defecto -7 =
          arriba; +18 = debajo, para ventanas/puertas que se apoyan en una
          pared cuya cota ya va arriba). */
function _cadLblLine(ctx,s,th,txt,voff){
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
  ctx.fillText(txt||_fmtM(m),0,(voff==null?-7:voff));
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
  if(_cadTool==='select'){
    /* 0) ¿tocó el botón rojo ✕? → borrar la figura seleccionada */
    if(_cadDelHit&&_cadSel){
      var _dd=Math.sqrt((p.rx-_cadDelHit.x)*(p.rx-_cadDelHit.x)+(p.ry-_cadDelHit.y)*(p.ry-_cadDelHit.y));
      if(_dd<=_cadDelHit.r+4){_cadDeleteShape(_cadSel);return;}
    }
    /* 1) ¿tomó una manija del extremo de la figura ya seleccionada? → editar extremo */
    if(_cadSel&&_cadSel.type!=='text'){
      if(Math.sqrt((p.rx-_cadSel.x1)*(p.rx-_cadSel.x1)+(p.ry-_cadSel.y1)*(p.ry-_cadSel.y1))<10){_cadBeginDrag('p1',p);return;}
      if(Math.sqrt((p.rx-_cadSel.x2)*(p.rx-_cadSel.x2)+(p.ry-_cadSel.y2)*(p.ry-_cadSel.y2))<10){_cadBeginDrag('p2',p);return;}
    }
    /* 2) ¿tomó una figura? → seleccionar y mover entera */
    var pick=_cadPickShape(p.rx,p.ry);
    _cadSel=pick;
    if(pick)_cadBeginDrag('move',p);
    _cadRender();
    return;
  }
  if(_cadTool==='erase'){_cadErase(p);return;}
  if(_cadTool==='text'){_cadInsertText(p);return;}
  if(_cadTool==='room'){_cadDrawing=true;_cadStart=p;_cadMouse=p;_cadRender();return;}
  /* Dos clics = dos puntos de un tramo. La PARED encadena (el siguiente tramo
     sale del final del anterior); VENTANA y PUERTA se colocan de a una (la
     cadena se corta al terminar cada una). Esc / clic derecho también cortan. */
  if(!_cadStart){_cadStart={x:p.x,y:p.y};_cadDrawing=true;_cadMouse=p;_cadRender();return;}
  var end=_segEnd(p);
  var ddx=end.x-_cadStart.x,ddy=end.y-_cadStart.y;
  if(Math.sqrt(ddx*ddx+ddy*ddy)<3){_endChain();return;} /* clic en el mismo punto = terminar */
  _cadPushUndo();
  var ns=_cadMakeShape(_cadStart,end);
  var last=_cadShapes[_cadShapes.length-1];
  if(_cadTool==='wall'&&last&&_sameStyle(last,ns)&&_isCollinearContinuation(last,ns.x1,ns.y1,ns.x2,ns.y2)){
    last.x2=ns.x2;last.y2=ns.y2;_cadSel=last;   /* pared recta continua → un solo tramo, una sola medida */
  }else{
    _cadShapes.push(ns);_cadSel=ns;
  }
  if(_cadTool==='wall'){
    _cadStart={x:end.x,y:end.y};   /* la pared sigue encadenando */
    _cadMouse=p;
    _cadRender();
  }else{
    _endChain();                   /* ventana / puerta: una y listo */
  }
  _cadTouch();
}

function _cadOnMove(e){
  e.preventDefault();
  var p=_getPos(e);
  _cadMouse=p;
  /* actualizar status bar */
  var sb=document.getElementById('cad-status');
  if(sb)sb.textContent='X: '+_fmtM(_pxToM(p.x))+'  Y: '+_fmtM(_pxToM(p.y));

  /* Herramienta Borrar: resaltar en rojo lo que se borrará al hacer clic */
  if(_cadTool==='erase'){_cadEraseHover=_cadPickShape(p.rx,p.ry);}
  else if(_cadEraseHover){_cadEraseHover=null;}

  /* Herramienta Mover: arrastrar la figura entera o uno de sus extremos */
  if(_cadTool==='select'&&_cadDrag&&_cadSel){
    var o=_cadDrag.orig,ddx=p.x-_cadDrag.sx,ddy=p.y-_cadDrag.sy;
    if(_cadDrag.mode==='move'){
      _cadSel.x1=o.x1+ddx;_cadSel.y1=o.y1+ddy;
      if(o.x2!=null){_cadSel.x2=o.x2+ddx;_cadSel.y2=o.y2+ddy;}
    }else if(_cadDrag.mode==='p1'){_cadSel.x1=p.x;_cadSel.y1=p.y;}
    else if(_cadDrag.mode==='p2'){_cadSel.x2=p.x;_cadSel.y2=p.y;}
    var di2=document.getElementById('cad-dim-info');
    if(di2){var t=_cadSelDimText();if(t){di2.textContent=t;di2.style.display='';}else di2.style.display='none';}
    _cadRender();
    return;
  }

  /* etiqueta de medida en tiempo real */
  var di=document.getElementById('cad-dim-info');
  if(_cadDrawing&&_cadStart&&di){
    var dx=p.x-_cadStart.x,dy=p.y-_cadStart.y;
    if(_cadTool==='room'){
      var wm=_pxToM(Math.abs(dx)),hm=_pxToM(Math.abs(dy));
      di.textContent=_fmtM(wm)+' × '+_fmtM(hm)+'  =  '+Math.round(wm*hm*100)/100+' m²';
    }else{
      var pe=_segEnd(p);
      var segLen=Math.sqrt((pe.x-_cadStart.x)*(pe.x-_cadStart.x)+(pe.y-_cadStart.y)*(pe.y-_cadStart.y));
      if(_cadTool==='window'){
        di.textContent=_pxToM(segLen)+' × '+_WIN_H_M+' m';   /* ancho × alto estándar */
      }else if(_cadTool==='wall'){
        var mLast=_cadShapes[_cadShapes.length-1];
        var mNs=_cadMakeShape(_cadStart,pe);
        if(mLast&&_sameStyle(mLast,mNs)&&_isCollinearContinuation(mLast,mNs.x1,mNs.y1,mNs.x2,mNs.y2)){
          var mll=Math.sqrt((mLast.x2-mLast.x1)*(mLast.x2-mLast.x1)+(mLast.y2-mLast.y1)*(mLast.y2-mLast.y1));
          di.textContent=_fmtM(_pxToM(mll+segLen));   /* total del tramo unido */
        }else{
          di.textContent=_fmtM(_pxToM(segLen));
        }
      }else{
        di.textContent=_fmtM(_pxToM(segLen));
      }
    }
    di.style.display='';
  }else if(di){di.style.display='none';}
  _cadRender();
}

function _cadOnUp(e){
  e.preventDefault();
  if(_cadTool==='select'){
    var wasDragging=!!_cadDrag;
    _cadDrag=null;
    var dis=document.getElementById('cad-dim-info');if(dis)dis.style.display='none';
    _cadRender();
    if(wasDragging)_cadTouch();   /* se movió/estiró una figura → autoguardar */
    return;
  }
  /* Pared/Ventana/Puerta se dibujan por clics (polilínea), no por arrastre:
     el mouseup no cierra el segmento. Solo Habitación usa arrastre. */
  if(_cadTool!=='room')return;
  if(!_cadDrawing||!_cadStart)return;
  var p=_getPos(e);
  _cadDrawing=false;
  var s=_cadMakeShape(_cadStart,p);
  var dx=s.x2-s.x1,dy=s.y2-s.y1;
  if(Math.sqrt(dx*dx+dy*dy)<3){_cadStart=null;_cadRender();return;}
  _cadPushUndo();
  _cadShapes.push(s);_cadSel=s;
  _cadStart=null;
  var di=document.getElementById('cad-dim-info');if(di)di.style.display='none';
  _cadRender();_cadTouch();
}

/* ── Borrar una figura (usado por la herramienta Borrar, el botón ✕ de la
   selección, la tecla Supr y el clic derecho sobre una figura) ── */
function _cadDeleteShape(s){
  var ix=_cadShapes.indexOf(s);
  if(ix<0)return false;
  _cadPushUndo();
  _cadShapes.splice(ix,1);
  if(_cadSel===s)_cadSel=null;
  _cadDrag=null;_cadEraseHover=null;
  _cadRender();_cadTouch();
  return true;
}
/* ── Borrar la figura bajo el cursor (herramienta Borrar) ── */
function _cadErase(p){
  var s=_cadPickShape(p.rx,p.ry);
  if(s)_cadDeleteShape(s);
}

function _cadHit(s,x,y){
  var tol=16;
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
  _cadPushUndo();
  var _ts={type:'text',x1:p.x,y1:p.y,txt:txt,color:_cadStrokeColor,sz:14};
  _cadShapes.push(_ts);_cadSel=_ts;
  _cadRender();_cadTouch();
}

/* ── Deshacer / Rehacer ── */
function _cadUndo(){
  if(!_cadUndoStack.length){_cadSaveMark('nada que deshacer',true);return;}
  _cadRedoStack.push(JSON.stringify(_cadShapes));
  _cadShapes=JSON.parse(_cadUndoStack.pop());
  _cadDrawing=false;_cadStart=null;_cadSel=null;_cadDrag=null;
  _cadRender();_cadTouch();
}
function _cadRedo(){
  if(!_cadRedoStack.length){_cadSaveMark('nada que rehacer',true);return;}
  _cadUndoStack.push(JSON.stringify(_cadShapes));
  _cadShapes=JSON.parse(_cadRedoStack.pop());
  _cadDrawing=false;_cadStart=null;_cadSel=null;_cadDrag=null;
  _cadRender();_cadTouch();
}

/* ── Limpiar todo ── */
function _cadClear(){
  if(!_cadShapes.length)return;
  if(!confirm('¿Borrar todo el plano?'))return;
  _cadPushUndo();
  _cadShapes=[];
  _cadDrawing=false;_cadStart=null;_cadSel=null;_cadDrag=null;
  _cadRender();
  /* "Limpiar todo" también se autoguarda si el plano ya existe */
  if(_cadPlanId&&_cadPlanId!=='__nuevo__'){_cadDirty=true;clearTimeout(_cadAutoT);_plansCol().doc(_cadPlanId).set({cadShapes:[],updatedAt:Date.now()},{merge:true}).then(function(){_cadDirty=false;_cadSaveMark('✓ guardado automáticamente');}).catch(function(){_cadSaveMark('✗ no se pudo autoguardar',true);});}
}

/* ── Guardar plano ── */
function _cadSavePlan(){
  if(!_cadShapes.length){_showToast('Dibuja algo primero.',true);return;}
  var nameEl=document.getElementById('cad-plan-name');
  var name=(nameEl?nameEl.value.trim():'')||'Plano CAD';
  /* Exportar siempre en modo CLARO (fondo blanco) para que sea legible como fondo de plano */
  _cadDrawing=false;_cadMouse=null;_cadStart=null;_cadSel=null;_cadRefImg=null;
  var wasDark=_cadDark;
  _cadDark=false;
  _cadRender();
  var dataUrl=_cCanvas.toDataURL('image/jpeg',0.92);
  _cadDark=wasDark;
  _cadRender();
  /* Se guardan también las figuras vectoriales (cadShapes) para poder reabrir
     el plano en este editor y seguir dibujando. */
  var base={
    name:name,img:dataUrl,builtin:false,cad:true,title:name,
    cadShapes:JSON.parse(JSON.stringify(_cadShapes)),
    updatedAt:Date.now()
  };
  clearTimeout(_cadAutoT);
  var op;
  if(_cadPlanId&&_cadPlanId!=='__nuevo__'){
    op=_plansCol().doc(_cadPlanId).set(base,{merge:true});   /* actualiza el mismo plano */
  }else{
    base.markers=[];base.zw=100;base.createdAt=Date.now();
    op=_plansCol().add(base).then(function(ref){_cadPlanId=ref.id;});
  }
  op.then(function(){
    _cadDirty=false;
    _showToast('Plano guardado: '+name);
    _cadCloseEditor();
  }).catch(function(e){
    var msg=(e&&e.message)||e||'error desconocido';
    _showToast('Error al guardar: '+msg,true);
    alert('No se pudo guardar el plano:\n'+msg+'\n\nTu dibujo NO se ha perdido, sigue aquí. Revisa tu conexión e intenta "Guardar" de nuevo.');
  });
}

/* ══════════════════════════════════════════════════════════
   VISTA DE FRENTES (ALZADOS) — la cara de cada pared vista de
   frente, con sus ventanas y puertas a su posición y altura real.
   Todo 2D, derivado de _cadShapes. No modifica el plano.
══════════════════════════════════════════════════════════ */
function _round2(n){return Math.round(n*100)/100;}
function _projT(ax,ay,bx,by,px,py){
  var dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
  if(l2===0)return 0;
  return ((px-ax)*dx+(py-ay)*dy)/l2;
}
/* Asocia cada ventana/puerta a la pared sobre la que se apoya y calcula su
   distancia desde el inicio de la pared (off) y su ancho (w), en metros. */
function _cadOpeningsByWall(walls){
  var res=walls.map(function(){return [];});res._orphans=0;
  _cadShapes.forEach(function(s){
    if(s.type!=='window'&&s.type!=='door')return;
    var best=-1,bestD=1e9;
    walls.forEach(function(w,wi){
      var d1=_distSeg(s.x1,s.y1,w.x1,w.y1,w.x2,w.y2);
      var d2=_distSeg(s.x2,s.y2,w.x1,w.y1,w.x2,w.y2);
      if(d1<22&&d2<22&&(d1+d2)<bestD){bestD=d1+d2;best=wi;}
    });
    if(best<0){res._orphans++;return;}
    var w=walls[best];
    var wlen=Math.sqrt((w.x2-w.x1)*(w.x2-w.x1)+(w.y2-w.y1)*(w.y2-w.y1));
    var t1=Math.max(0,Math.min(1,_projT(w.x1,w.y1,w.x2,w.y2,s.x1,s.y1)));
    var t2=Math.max(0,Math.min(1,_projT(w.x1,w.y1,w.x2,w.y2,s.x2,s.y2)));
    var ta=Math.min(t1,t2),tb=Math.max(t1,t2);
    res[best].push({type:s.type,dbl:s.dbl,off:_pxToM(ta*wlen),w:_pxToM((tb-ta)*wlen)});
  });
  return res;
}
function _cadElevRender(){
  var cv=document.getElementById('cad-elev-canvas');if(!cv)return;
  var ctx=cv.getContext('2d');
  var ext=!!(document.getElementById('cad-elev-ext')||{}).checked;
  var walls=_cadShapes.filter(function(s){return s.type==='wall';});
  var PXM=44,padL=54,padTop=14,rowGap=54,lblH=26;
  var wallH=_WALL_H_M*PXM,rowH=lblH+wallH+rowGap;

  if(!walls.length){
    cv.width=560;cv.height=110;
    ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);
    ctx.fillStyle='#334155';ctx.font='14px Segoe UI,sans-serif';ctx.textAlign='left';
    ctx.fillText('Dibuja al menos una pared para ver sus frentes.',22,58);
    return;
  }
  var lensM=walls.map(function(w){return _pxToM(Math.sqrt((w.x2-w.x1)*(w.x2-w.x1)+(w.y2-w.y1)*(w.y2-w.y1)));});
  var maxLen=Math.max.apply(null,lensM);
  cv.width=Math.ceil(padL+maxLen*PXM+46);
  cv.height=Math.ceil(padTop+walls.length*rowH+16);
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cv.width,cv.height);
  var ops=_cadOpeningsByWall(walls);

  walls.forEach(function(w,i){
    var lenM=lensM[i];
    var top=padTop+i*rowH+lblH,floor=top+wallH;
    /* etiqueta */
    ctx.fillStyle='#0f172a';ctx.font='bold 13px Segoe UI,sans-serif';ctx.textAlign='left';
    ctx.fillText('Pared '+(i+1)+'  —  '+lenM+' m'+(ext?'   ·   cara exterior':'   ·   cara interior'),padL,top-9);
    /* muro */
    ctx.fillStyle='#eef2f7';ctx.strokeStyle='#1e293b';ctx.lineWidth=2;
    ctx.fillRect(padL,top,lenM*PXM,wallH);ctx.strokeRect(padL,top,lenM*PXM,wallH);
    /* piso */
    ctx.strokeStyle='#0f172a';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(padL-8,floor);ctx.lineTo(padL+lenM*PXM+8,floor);ctx.stroke();
    /* cota de alto del muro */
    ctx.strokeStyle='#94a3b8';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(padL-12,top);ctx.lineTo(padL-12,floor);ctx.stroke();
    ctx.save();ctx.translate(padL-20,(top+floor)/2);ctx.rotate(-Math.PI/2);
    ctx.fillStyle='#64748b';ctx.font='11px Segoe UI,sans-serif';ctx.textAlign='center';
    ctx.fillText(_WALL_H_M+' m',0,0);ctx.restore();

    ops[i].forEach(function(o){
      var off=ext?(lenM-o.off-o.w):o.off;
      var x=padL+off*PXM,ww=o.w*PXM;
      if(o.type==='window'){
        var head=_WALL_H_M-0.15,sill=Math.max(0.05,head-_WIN_H_M);
        var ry=floor-head*PXM,rh=(head-sill)*PXM;
        ctx.fillStyle='#ffffff';ctx.strokeStyle='#1e293b';ctx.lineWidth=2;
        ctx.fillRect(x,ry,ww,rh);ctx.strokeRect(x,ry,ww,rh);
        ctx.strokeStyle='#64748b';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(x,ry+rh/2);ctx.lineTo(x+ww,ry+rh/2);ctx.stroke();
        if(o.dbl){ctx.beginPath();ctx.moveTo(x+ww/2,ry);ctx.lineTo(x+ww/2,ry+rh);ctx.stroke();}
        ctx.fillStyle='#0f172a';ctx.font='11px Segoe UI,sans-serif';ctx.textAlign='center';
        ctx.fillText(o.w+' × '+_WIN_H_M+' m',x+ww/2,floor+16);
        ctx.fillStyle='#64748b';
        ctx.fillText('antepecho '+_round2(sill)+' m',x+ww/2,floor+30);
      }else{
        var dh=Math.min(_DOOR_H_M,_WALL_H_M-0.05);
        var ry2=floor-dh*PXM,rh2=dh*PXM;
        ctx.fillStyle='#e7c9a9';ctx.strokeStyle='#6b3f1d';ctx.lineWidth=2;
        ctx.fillRect(x,ry2,ww,rh2);ctx.strokeRect(x,ry2,ww,rh2);
        ctx.strokeStyle='#6b3f1d';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(x+ww*0.14,ry2+6);ctx.lineTo(x+ww*0.14,floor-4);ctx.stroke();
        ctx.fillStyle='#0f172a';ctx.font='11px Segoe UI,sans-serif';ctx.textAlign='center';
        ctx.fillText(o.w+' × '+_DOOR_H_M+' m',x+ww/2,floor+16);
      }
    });
  });
  if(ops._orphans){
    ctx.fillStyle='#b45309';ctx.font='12px Segoe UI,sans-serif';ctx.textAlign='left';
    ctx.fillText(ops._orphans+' ventana(s)/puerta(s) no quedaron sobre ninguna pared y no se muestran aquí.',padL,cv.height-8);
  }
}
function _cadElevOpen(){
  var ov=document.getElementById('cad-elev-overlay');if(!ov)return;
  ov.style.display='flex';
  _cadElevRender();
}
function _cadElevClose(){
  var ov=document.getElementById('cad-elev-overlay');if(ov)ov.style.display='none';
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
  if(tool!==_cadTool){
    _endChain();
    _cadDrag=null;_cadEraseHover=null;
    if(_cadTool==='select')_cadSel=null; /* al salir de Mover, quitar la selección */
  }
  _cadTool=tool;
  var cur={select:'default',wall:'crosshair',room:'crosshair',window:'crosshair',door:'crosshair',text:'text',erase:'cell'}[tool]||'crosshair';
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

  /* deshacer / rehacer */
  var undoBtn=document.getElementById('cad-undo');
  if(undoBtn)undoBtn.addEventListener('click',_cadUndo);
  var redoBtn=document.getElementById('cad-redo');
  if(redoBtn)redoBtn.addEventListener('click',_cadRedo);

  /* limpiar */
  var clearBtn=document.getElementById('cad-clear');
  if(clearBtn)clearBtn.addEventListener('click',_cadClear);

  /* guardar */
  var saveBtn=document.getElementById('cad-save-plan');
  if(saveBtn)saveBtn.addEventListener('click',_cadSavePlan);

  /* ver frentes (alzados) */
  var elevBtn=document.getElementById('cad-elev-btn');
  if(elevBtn)elevBtn.addEventListener('click',_cadElevOpen);
  var elevClose=document.getElementById('cad-elev-close');
  if(elevClose)elevClose.addEventListener('click',_cadElevClose);
  var elevExt=document.getElementById('cad-elev-ext');
  if(elevExt)elevExt.addEventListener('change',_cadElevRender);

  /* canvas */
  _cCanvas=document.getElementById('cad-canvas');
  _cCtx=_cCanvas?_cCanvas.getContext('2d'):null;
  if(_cCanvas){
    _cCanvas.addEventListener('mousedown',_cadOnDown);
    _cCanvas.addEventListener('mousemove',_cadOnMove);
    _cCanvas.addEventListener('mouseup',_cadOnUp);
    _cCanvas.addEventListener('mouseleave',function(){
      _cadMouse=null;_lastEP=null;_cadEraseHover=null;
      var di=document.getElementById('cad-dim-info');if(di)di.style.display='none';
      _cadRender();
    });
    /* Clic derecho SOBRE una figura = borrarla; en zona vacía = terminar la línea */
    _cCanvas.addEventListener('contextmenu',function(ev){
      ev.preventDefault();
      var pr=_getPos(ev);
      var hit=_cadPickShape(pr.rx,pr.ry);
      if(hit){_cadDeleteShape(hit);_showToast('Elemento borrado',false);}
      else _endChain();
    });
    _cCanvas.addEventListener('touchstart',_cadOnDown,{passive:false});
    _cCanvas.addEventListener('touchmove',_cadOnMove,{passive:false});
    _cCanvas.addEventListener('touchend',_cadOnUp,{passive:false});
  }

  /* atajos de teclado */
  document.addEventListener('keydown',function(e){
    if(!_cadOpen)return;
    if(e.key==='Escape'){
      var eo=document.getElementById('cad-elev-overlay');
      if(eo&&eo.style.display!=='none'){_cadElevClose();return;}
      _endChain();if(_cadTool==='select'){_cadSel=null;_cadRender();}return;
    }
    if((e.ctrlKey||e.metaKey)&&(e.key==='z'||e.key==='Z')){
      e.preventDefault();
      if(e.shiftKey)_cadRedo();else _cadUndo();
      return;
    }
    if((e.ctrlKey||e.metaKey)&&(e.key==='y'||e.key==='Y')){e.preventDefault();_cadRedo();return;}
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
    /* Borrar la figura seleccionada con la herramienta Mover */
    if((e.key==='Delete'||e.key==='Backspace')&&_cadTool==='select'&&_cadSel){
      e.preventDefault();_cadDeleteShape(_cadSel);return;
    }
    var map={m:'select',w:'wall',r:'room',v:'window',d:'door',t:'text',e:'erase'};
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


