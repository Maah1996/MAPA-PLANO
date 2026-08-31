/* Detecta si hay una version nueva publicada (compara los ?v=N de index.html
   contra el servidor, sin caché) y recarga solo, salvo que haya una edición
   en curso (guardado pendiente, arrastre activo). Así no hace falta acordarse
   de Ctrl+Shift+R ni vaciar la caché a mano: la recarga se hace contra una URL
   nueva (?_v=<timestamp>) para que el navegador baje index.html y TODOS los
   js/css frescos, aunque su copia en caché todavía estuviera "vigente". */
(function(){
  var CHECK_MS=180000;
  function _sig(html){var m=html.match(/\?v=\d+/g);return m?m.join(','):'';}
  var localSig=_sig(document.documentElement.outerHTML);
  function _editInProgress(){
    return !!(typeof _planSaveTimer!=='undefined'&&_planSaveTimer)
        || !!(typeof movingMarker!=='undefined'&&movingMarker)
        || !!(typeof draggingNew!=='undefined'&&draggingNew);
  }
  function _hardReload(){
    try{
      /* navegar a una URL distinta obliga a revalidar el documento y sus assets */
      location.replace(location.pathname+'?_v='+Date.now());
    }catch(e){ location.reload(); }
  }
  function checkForUpdate(){
    fetch(location.pathname,{cache:'no-store'}).then(function(r){return r.text();}).then(function(html){
      var remoteSig=_sig(html);
      if(remoteSig&&remoteSig!==localSig&&!_editInProgress()){
        (window.__mapaReload||_hardReload)();
      }
    }).catch(function(){});
  }
  setInterval(checkForUpdate,CHECK_MS);
  window.addEventListener('focus',checkForUpdate);
})();
