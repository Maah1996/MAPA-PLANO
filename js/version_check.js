/* Detecta si hay una version nueva publicada (compara los ?v=N de index.html
   contra el servidor, sin caché) y recarga solo, salvo que haya una edición
   en curso (guardado pendiente, arrastre activo). Así no hace falta acordarse
   de Ctrl+Shift+R. */
(function(){
  var CHECK_MS=180000;
  function _sig(html){var m=html.match(/\?v=\d+/g);return m?m.join(','):'';}
  var localSig=_sig(document.documentElement.outerHTML);
  function _editInProgress(){
    return !!(typeof _planSaveTimer!=='undefined'&&_planSaveTimer)
        || !!(typeof movingMarker!=='undefined'&&movingMarker)
        || !!(typeof draggingNew!=='undefined'&&draggingNew);
  }
  function checkForUpdate(){
    fetch(location.pathname,{cache:'no-store'}).then(function(r){return r.text();}).then(function(html){
      var remoteSig=_sig(html);
      if(remoteSig&&remoteSig!==localSig&&!_editInProgress()){
        (window.__mapaReload||function(){location.reload();})();
      }
    }).catch(function(){});
  }
  setInterval(checkForUpdate,CHECK_MS);
  window.addEventListener('focus',checkForUpdate);
})();
