function iconSVGEvac(item,size){size=size||55;return'<img src="'+(item._png||item.img)+'" style="width:'+size+'px;height:auto;display:block;border-radius:3px;box-shadow:0 1px 4px #0005" draggable="false">';}
function renderEvacPalette(){var el=document.getElementById('evac-icons');if(!el)return;el.innerHTML='';EVAC_ITEMS.forEach(function(item){var it=document.createElement('div');it.className='pal-item';it.dataset.id=item.id;it.innerHTML=iconSVGEvac(item,42)+'<span>'+item.name+'</span>';it.addEventListener('mousedown',function(e){startDragFromPalette(e,Object.assign({},item,{_isEvac:true}));});el.appendChild(it);});var eaIt=document.createElement('div');eaIt.className='pal-item';eaIt.dataset.id='estoy_aqui';eaIt.innerHTML=iconSVGEstoyAqui(42)+'<span>Estoy aquí</span>';eaIt.addEventListener('mousedown',function(e){startDragFromPalette(e,_EA_ITEM);});el.appendChild(eaIt);}

function arrowSVGThumb(angle){return'<svg width="30" height="18" viewBox="0 0 30 18"><g transform="translate(15,9) rotate('+angle+')"><rect x="-12" y="-1.5" width="16" height="3" fill="'+_ARROW_COLOR+'"/><polygon points="4,-5 13,0 4,5" fill="'+_ARROW_COLOR+'"/></g></svg>';}
function renderArrowPalette(){var ep=document.getElementById('evac-palette');if(!ep)return;var ex=document.getElementById('arrow-section');if(ex)ex.remove();var sec=document.createElement('div');sec.id='arrow-section';sec.innerHTML='<h2 style="color:#7dc560;border-color:#2a5020;margin-top:10px">Flechas evacuación</h2>';var grid=document.createElement('div');grid.className='arrow-dir-grid';grid.id='arrow-dir-grid';[0,45,90,135,180,225,270,315].forEach(function(angle){var btn=document.createElement('div');btn.className='arrow-dir-btn';btn.innerHTML=arrowSVGThumb(angle)+'<span>'+angle+'°</span>';btn.addEventListener('mousedown',function(e){e.preventDefault();draggingNew={_isArrow:true,angle:angle};ghost=document.createElement('div');ghost.className='dragghost';ghost.innerHTML=arrowSVGThumb(angle);ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';document.body.appendChild(ghost);window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);});grid.appendChild(btn);});sec.appendChild(grid);ep.appendChild(sec);}

function _buildArrowSVG(w,h){
  /* hw = largo de la cabeza, SOLO proporcional al ancho (w), nunca a h */
  var hw=w*0.28,bw=w-hw,hy=h/2,bh=Math.max(2,h*0.38);
  return'<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg">'
    +'<rect x="0" y="'+(hy-bh/2)+'" width="'+bw+'" height="'+bh+'" rx="'+(bh/2)+'" fill="'+_ARROW_COLOR+'"/>'
    +'<polygon points="'+bw+',0 '+w+','+hy+' '+bw+','+h+'" fill="'+_ARROW_COLOR+'"/>'
    +'</svg>';
}

function _updateArrowInner(arr){
  var w=arr.offsetWidth||140,h=arr.offsetHeight||18,angle=parseFloat(arr.dataset.angle||0);
  arr.style.transform='rotate('+angle+'deg)';
  arr.innerHTML=_buildArrowSVG(w,h)+'<div class="arr-del" title="Eliminar">×</div>';
  arr.querySelector('.arr-del').addEventListener('click',function(e){e.stopPropagation();arr.remove();_hideFloatPanel();_renderLegendSummary();});
}

function addEvacArrow(angle,xPct,yPct,initW,initH){
  var ml=document.getElementById('markerLayer'),mlW=ml.offsetWidth||800;
  initW=initW||140;initH=initH||18;
  var arr=document.createElement('div');
  arr.className='evac-arrow marker';
  arr.dataset.plan=_currentPlan;
  arr.dataset.mode=_appMode;
  arr.dataset.isArrow='1';
  arr.dataset.angle=angle;
  arr.dataset.wpct=initW/mlW*100;
  arr.dataset.hpct=initH/mlW*100;
  arr.style.left=xPct+'%';
  arr.style.top=yPct+'%';
  arr.style.width=initW+'px';
  arr.style.height=initH+'px';
  arr.style.transform='rotate('+angle+'deg)';
  arr.innerHTML=_buildArrowSVG(initW,initH)+'<div class="arr-del" title="Eliminar">×</div>';
  arr.querySelector('.arr-del').addEventListener('click',function(e){e.stopPropagation();arr.remove();_hideFloatPanel();_renderLegendSummary();});
  arr.addEventListener('click',function(ev){if(ev.target.classList.contains('arr-del'))return;_showFloatPanel(arr);});
  arr.addEventListener('mousedown',function(ev){
    if(ev.target.classList.contains('arr-del'))return;
    ev.preventDefault();
    var pos=_toLocalPct(ev.clientX,ev.clientY);
    arr._dragOffX=pos.x-parseFloat(arr.style.left);
    arr._dragOffY=pos.y-parseFloat(arr.style.top);
    movingMarker=arr;
    window.addEventListener('mousemove',onMove);
    window.addEventListener('mouseup',onUp);
  });
  ml.appendChild(arr);
  _renderLegendSummary();
  return arr;
}

function _scaleArrows(){var ml=document.getElementById('markerLayer'),mlW=ml.offsetWidth||800;document.querySelectorAll('.evac-arrow').forEach(function(arr){if(arr.dataset.wpct)arr.style.width=(parseFloat(arr.dataset.wpct)/100*mlW)+'px';if(arr.dataset.hpct)arr.style.height=(parseFloat(arr.dataset.hpct)/100*mlW)+'px';_updateArrowInner(arr);});}
function _scaleMarkers(){var sc=_zw/100;document.querySelectorAll('.marker:not(.evac-arrow)').forEach(function(m){var ms=parseFloat(m.dataset.markerScale||1);var mr=parseFloat(m.dataset.markerRot||0);m.style.transform='translate(-50%,-50%) scale('+(sc*ms)+') rotate('+mr+'deg)';m.style.transformOrigin='50% 50%';});}

/* ── Float Panel profesional ── */
function _initArrowFloatPanel(){
  if(document.getElementById('arr-float-panel'))return;
  var p=document.createElement('div');
  p.id='arr-float-panel';
  p.style.display='none';
  p.innerHTML=
    '<button class="afp-toggle" title="Editar flecha">✦ Flecha <span class="afp-chev">▾</span></button>'
    +'<div class="afp-body" style="display:none">'
    +'<div class="afp-section">'
    +'<span class="afp-lbl">Largo</span>'
    +'<button class="afp-btn afp-pm afp-len-m">−</button>'
    +'<span class="afp-num afp-len-num" style="min-width:42px;text-align:center">140px</span>'
    +'<button class="afp-btn afp-pm afp-len-p">+</button>'
    +'</div>'
    +'<div class="afp-div"></div>'
    +'<div class="afp-section">'
    +'<span class="afp-lbl">Ancho</span>'
    +'<button class="afp-btn afp-pm afp-wid-m">−</button>'
    +'<span class="afp-num afp-wid-num" style="min-width:36px;text-align:center">14px</span>'
    +'<button class="afp-btn afp-pm afp-wid-p">+</button>'
    +'</div>'
    +'<div class="afp-div"></div>'
    +'<div class="afp-section" style="gap:4px">'
    +'<button class="afp-btn afp-btn-rot afp-rot" data-d="-15">↺</button>'
    +'<button class="afp-btn afp-btn-rot afp-rot" data-d="15">↻</button>'
    +'<button class="afp-btn afp-btn-rot afp-rot180">⇄</button>'
    +'</div>'
    +'<div class="afp-div"></div>'
    +'<div class="afp-section" style="gap:5px">'
    +'<button class="afp-btn afp-copy">Copiar</button>'
    +'<button class="afp-btn afp-paste" id="arr-paste-btn" style="display:none">Pegar</button>'
    +'</div>'
    +'<div class="afp-div"></div>'
    +'<div class="afp-section">'
    +'<button class="afp-btn afp-del">✕ Eliminar</button>'
    +'</div>'
    +'</div>';
  document.body.appendChild(p);

  /* Toggle colapsar/expandir */
  var body=p.querySelector('.afp-body'),chev=p.querySelector('.afp-chev');
  p.querySelector('.afp-toggle').addEventListener('mousedown',function(e){e.stopPropagation();});
  p.querySelector('.afp-toggle').addEventListener('click',function(){
    var open=body.style.display!=='none';
    body.style.display=open?'none':'flex';
    chev.textContent=open?'▾':'▴';
    /* reposicionar para que quepa en pantalla */
    if(!open){var r2=p.getBoundingClientRect();if(r2.right>window.innerWidth-10)p.style.left=Math.max(10,window.innerWidth-r2.width-10)+'px';}
  });

  var _s=null;
  var lenNum=p.querySelector('.afp-len-num'),widNum=p.querySelector('.afp-wid-num');

  p._setArr=function(a){
    _s=a;if(!a)return;
    lenNum.textContent=Math.round(a.offsetWidth||140)+'px';
    widNum.textContent=Math.round(a.offsetHeight||18)+'px';
  };

  function _setW(a,nw){
    nw=Math.max(40,Math.min(600,nw));
    var ml=document.getElementById('markerLayer'),mlW=ml.offsetWidth||800;
    /* compensar left para que el CENTRO quede fijo */
    var dPct=(nw-(a.offsetWidth||140))/mlW/2*100;
    a.style.left=(parseFloat(a.style.left)-dPct)+'%';
    a.style.width=nw+'px';a.dataset.wpct=nw/mlW*100;
    _updateArrowInner(a);lenNum.textContent=nw+'px';
  }
  function _setH(a,nh){
    nh=Math.max(4,Math.min(80,nh));
    var ml=document.getElementById('markerLayer'),mlW=ml.offsetWidth||800,mlH=ml.offsetHeight||600;
    /* compensar top para que el CENTRO quede fijo */
    var dPct=(nh-(a.offsetHeight||18))/mlH/2*100;
    a.style.top=(parseFloat(a.style.top)-dPct)+'%';
    a.style.height=nh+'px';a.dataset.hpct=nh/mlW*100;
    _updateArrowInner(a);widNum.textContent=nh+'px';
  }

  /* Largo − + */
  p.querySelector('.afp-len-m').addEventListener('mousedown',function(e){e.stopPropagation();});
  p.querySelector('.afp-len-m').addEventListener('click',function(){if(!_s)return;_setW(_s,(_s.offsetWidth||140)-1);});
  p.querySelector('.afp-len-p').addEventListener('mousedown',function(e){e.stopPropagation();});
  p.querySelector('.afp-len-p').addEventListener('click',function(){if(!_s)return;_setW(_s,(_s.offsetWidth||140)+1);});

  /* Ancho − + */
  p.querySelector('.afp-wid-m').addEventListener('mousedown',function(e){e.stopPropagation();});
  p.querySelector('.afp-wid-m').addEventListener('click',function(){if(!_s)return;_setH(_s,(_s.offsetHeight||18)-1);});
  p.querySelector('.afp-wid-p').addEventListener('mousedown',function(e){e.stopPropagation();});
  p.querySelector('.afp-wid-p').addEventListener('click',function(){if(!_s)return;_setH(_s,(_s.offsetHeight||18)+1);});

  /* Rotación */
  p.querySelectorAll('.afp-rot').forEach(function(btn){
    btn.addEventListener('mousedown',function(e){e.stopPropagation();});
    btn.addEventListener('click',function(){
      var a=_s;if(!a)return;
      var ang=(parseFloat(a.dataset.angle||0)+parseInt(this.dataset.d)+360)%360;
      a.dataset.angle=ang;a.style.transform='rotate('+ang+'deg)';
    });
  });
  p.querySelector('.afp-rot180').addEventListener('mousedown',function(e){e.stopPropagation();});
  p.querySelector('.afp-rot180').addEventListener('click',function(){
    var a=_s;if(!a)return;
    var ang=(parseFloat(a.dataset.angle||0)+180)%360;
    a.dataset.angle=ang;a.style.transform='rotate('+ang+'deg)';
  });

  /* Copiar / Pegar */
  p.querySelector('.afp-copy').addEventListener('mousedown',function(e){e.stopPropagation();});
  p.querySelector('.afp-copy').addEventListener('click',function(){
    var a=_s;if(!a)return;
    window._arrowClipboard={angle:parseFloat(a.dataset.angle||0),wpct:parseFloat(a.dataset.wpct||0),hpct:parseFloat(a.dataset.hpct||0),left:parseFloat(a.style.left),top:parseFloat(a.style.top)};
    document.getElementById('arr-paste-btn').style.display='';
  });
  p.querySelector('.afp-paste').addEventListener('mousedown',function(e){e.stopPropagation();});
  p.querySelector('.afp-paste').addEventListener('click',function(){
    var cb=window._arrowClipboard;if(!cb)return;
    var ml=document.getElementById('markerLayer'),mlW=ml.offsetWidth||800;
    var pL=Math.min(95,(cb.left||42)+3),pT=Math.min(95,(cb.top||42)+3);
    addEvacArrow(cb.angle,pL,pT,cb.wpct/100*mlW,cb.hpct/100*mlW);
    window._arrowClipboard.left=pL;window._arrowClipboard.top=pT;
  });

  /* Eliminar */
  p.querySelector('.afp-del').addEventListener('mousedown',function(e){e.stopPropagation();});
  p.querySelector('.afp-del').addEventListener('click',function(){var a=_s;if(!a)return;a.remove();_hideFloatPanel();_renderLegendSummary();});

  /* Click fuera: ocultar panel completamente */
  document.addEventListener('mousedown',function(e){
    if(p.contains(e.target))return;
    _hideFloatPanel();
  });
}

function _showFloatPanel(arr){
  _initArrowFloatPanel();
  var p=document.getElementById('arr-float-panel');
  p._setArr(arr);
  /* expandir directamente */
  var body=p.querySelector('.afp-body'),chev=p.querySelector('.afp-chev');
  if(body)body.style.display='flex';
  if(chev)chev.textContent='▴';
  p.style.display='flex';
  var r=arr.getBoundingClientRect(),pH=p.offsetHeight||50,pW=p.offsetWidth||480;
  var top=Math.max(10,r.top-pH-30);
  var left=Math.max(10,Math.min(r.left+(r.width/2)-(pW/2),window.innerWidth-pW-10));
  p.style.top=top+'px';p.style.left=left+'px';
}
function _hideFloatPanel(){var p=document.getElementById('arr-float-panel');if(p){p.style.display='none';if(p._setArr)p._setArr(null);}}



/* ── Elementos de evacuación disponibles también en el Mapa de Riesgos ── */
function renderRiskEvacPalette(){
  var host=document.getElementById('evac-en-riesgos');
  if(!host||typeof EVAC_ITEMS==='undefined')return;
  host.innerHTML='<h2>3 · Elementos de evacuación</h2>';
  var grid=document.createElement('div');grid.className='icons';
  EVAC_ITEMS.forEach(function(item){
    var it=document.createElement('div');it.className='pal-item';it.dataset.id=item.id;
    it.innerHTML=iconSVGEvac(item,42)+'<span>'+item.name+'</span>';
    it.addEventListener('mousedown',function(e){startDragFromPalette(e,Object.assign({},item,{_isEvac:true}));});
    grid.appendChild(it);
  });
  host.appendChild(grid);
  var h=document.createElement('h2');h.textContent='Flechas de evacuación';host.appendChild(h);
  var ag=document.createElement('div');ag.className='arrow-dir-grid';
  [0,45,90,135,180,225,270,315].forEach(function(angle){
    var btn=document.createElement('div');btn.className='arrow-dir-btn';
    btn.innerHTML=arrowSVGThumb(angle)+'<span>'+angle+'°</span>';
    btn.addEventListener('mousedown',function(e){e.preventDefault();draggingNew={_isArrow:true,angle:angle};ghost=document.createElement('div');ghost.className='dragghost';ghost.innerHTML=arrowSVGThumb(angle);ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';document.body.appendChild(ghost);window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);});
    ag.appendChild(btn);
  });
  host.appendChild(ag);
}
try{renderRiskEvacPalette();}catch(e){console.warn('renderRiskEvacPalette',e);}

/* ── Rasteriza los SVG de evacuación a PNG (html2canvas renderiza PNG de forma
   fiable; los <img> con SVG data-URI se cortan/desaparecen al exportar). Se
   guarda en item._png y lo usan iconSVGEvac() y la leyenda. ── */
function _svgAspect(dataUri){
  try{
    var parts=String(dataUri).split(',');var svg=parts[0].indexOf('base64')>=0?atob(parts[1]):decodeURIComponent(parts[1]);
    var m=svg.match(/viewBox\s*=\s*"[\d.\-]+\s+[\d.\-]+\s+([\d.]+)\s+([\d.]+)"/);
    if(m)return parseFloat(m[1])/parseFloat(m[2]);
  }catch(e){}
  return 1;
}
function _rasterizeEvacItem(item){
  return new Promise(function(res){
    if(!item||!item.img){res();return;}
    var aspect=_svgAspect(item.img)||1;
    var im=new Image();
    im.onload=function(){
      try{
        var W=280,H=Math.max(1,Math.round(W/aspect));
        var cv=document.createElement('canvas');cv.width=W;cv.height=H;
        cv.getContext('2d').drawImage(im,0,0,W,H);
        item._png=cv.toDataURL('image/png');
      }catch(e){}
      res();
    };
    im.onerror=function(){res();};
    im.src=item.img;
  });
}
(function _rasterizeAllEvac(){
  if(typeof EVAC_ITEMS==='undefined')return;
  EVAC_ITEMS.forEach(function(it){_rasterizeEvacItem(it).then(function(){
    /* re-render de la leyenda cuando terminen, para que use el PNG */
    if(typeof _renderLegendSummary==='function')try{_renderLegendSummary();}catch(e){}
  });});
})();
