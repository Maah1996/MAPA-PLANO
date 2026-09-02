/* ============================================================================
 * iper.js — Paso 1
 * Sube la matriz IPER (.xlsx) y genera un listado de riesgos en 3 columnas:
 *   NOMBRE DEL RIESGO · CLASIFICACIÓN (con color) · EXPLICACIÓN
 *
 * Módulo 100% aislado: NO toca core.js / save_load.js / capture.js / cad.js.
 * Depende de SheetJS (XLSX), cargado desde cdnjs en index.html.
 * ========================================================================== */
(function () {
  'use strict';

  /* --- Niveles: mismos colores que LEVELS del mapa ------------------------ */
  var NIVELES = {
    1: {
      key: 'tolerable', color: '#7dc560', label: 'Tolerable',
      exp: 'No se necesita mejorar la acción preventiva. Se deben mantener ' +
           'comprobaciones periódicas para asegurar que las medidas de control ' +
           'siguen siendo eficaces.'
    },
    2: {
      key: 'moderado', color: '#f5d000', label: 'Moderado',
      exp: 'Se deben hacer esfuerzos para reducir el riesgo y precisar la ' +
           'inversión necesaria. Las medidas para reducirlo deben implementarse ' +
           'en un plazo determinado.'
    },
    3: {
      key: 'importante', color: '#ff8c00', label: 'Importante',
      exp: 'No debe comenzarse el trabajo hasta que se haya reducido el riesgo. ' +
           'Si el trabajo ya está en marcha, debe corregirse en un plazo menor ' +
           'que el de los riesgos moderados.'
    },
    4: {
      key: 'intolerable', color: '#e00000', label: 'Intolerable',
      exp: 'No debe comenzarse ni continuar el trabajo hasta que se reduzca el ' +
           'riesgo. Si no es posible reducirlo, incluso con recursos ilimitados, ' +
           'el trabajo debe quedar prohibido.'
    }
  };

  /* --- Utilidades ------------------------------------------------------------ */
  function norm(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // sin acentos
      .replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function nivelDeClasificacion(raw) {
    var t = norm(raw);
    var m = t.match(/(\d)/);            // "3 - Importante" -> 3
    if (m) {
      var n = parseInt(m[1], 10);
      if (n >= 1 && n <= 4) return n;
    }
    if (t.indexOf('INTOLERABLE') >= 0) return 4;
    if (t.indexOf('IMPORTANTE') >= 0) return 3;
    if (t.indexOf('MODERADO') >= 0) return 2;
    if (t.indexOf('TOLERABLE') >= 0) return 1;
    return 0;
  }

  // quita el código de familia final:  "Atrapamiento (B1)" -> "Atrapamiento"
  function sinCodigo(name) {
    return String(name).replace(/\s*\([A-Z]{1,3}\d{0,2}\)\s*$/, '').trim();
  }

  /* --- Estado ------------------------------------------------------------- */
  var _rows = [];        // riesgos procesados (para exportar / re-render)
  var _stripCodes = false;

  /* --- Lectura del .xlsx ------------------------------------------------- */
  function parseWorkbook(data) {
    if (typeof XLSX === 'undefined') {
      throw new Error('No se pudo cargar el lector de Excel (XLSX). Revisa tu conexión y recarga la página.');
    }
    var wb = XLSX.read(data, { type: 'array' });
    var ws = wb.Sheets[wb.SheetNames[0]];
    var grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

    // 1) fila de encabezado: contiene "RIESGO ESPECIFICO" (y ojalá "CLASIFICACION DEL RIESGO")
    var hdr = -1;
    for (var i = 0; i < grid.length; i++) {
      var ns = grid[i].map(norm);
      var hasRiesgo = ns.some(function (x) { return x.indexOf('RIESGO ESPECIFICO') >= 0; });
      var hasClass = ns.some(function (x) { return x.indexOf('CLASIFICACION DEL RIESGO') >= 0; });
      if (hasRiesgo && hasClass) { hdr = i; break; }
      if (hdr < 0 && hasRiesgo) hdr = i; // fallback más laxo, se sigue buscando algo mejor
    }
    if (hdr < 0) {
      throw new Error('No encontré la fila de títulos de la IPER. Debe existir una columna "RIESGO ESPECÍFICO" y otra "CLASIFICACIÓN DEL RIESGO".');
    }

    var head = grid[hdr].map(norm);
    function col() {
      var pats = Array.prototype.slice.call(arguments);
      for (var c = 0; c < head.length; c++) {
        var h = head[c];
        var ok = pats.every(function (p) { return h.indexOf(p) >= 0; });
        if (ok) return c;
      }
      return -1;
    }
    var cRiesgo = col('RIESGO ESPECIFICO');
    var cClass = col('CLASIFICACION DEL RIESGO');
    var cPeligro = col('PELIGRO', 'FACTOR DE RIESGO');
    if (cPeligro < 0) cPeligro = col('PELIGRO');
    var cLugar = col('LUGAR DE TRABAJO');
    var cTarea = col('TAREA');

    // 2) filas de datos
    var map = {};   // clave (nombre en mayúsculas) -> registro
    var order = [];
    var total = 0;

    for (var r = hdr + 1; r < grid.length; r++) {
      var row = grid[r];
      if (!row) continue;
      var rn = cRiesgo >= 0 ? row[cRiesgo] : '';
      if (rn === null || rn === undefined || String(rn).trim() === '') continue;

      total++;
      var name = String(rn).replace(/\s+/g, ' ').trim();
      var key = name.toUpperCase();
      var nivel = nivelDeClasificacion(cClass >= 0 ? row[cClass] : '');
      var lugar = cLugar >= 0 && row[cLugar] ? String(row[cLugar]).trim() : '';
      var peligro = cPeligro >= 0 && row[cPeligro] ? String(row[cPeligro]).trim() : '';
      var tarea = cTarea >= 0 && row[cTarea] ? String(row[cTarea]).trim() : '';

      if (!map[key]) {
        map[key] = {
          name: name, nivel: nivel, veces: 0,
          lugares: [], peligros: [], tareas: []
        };
        order.push(key);
      }
      var rec = map[key];
      rec.veces++;
      if (nivel > rec.nivel) rec.nivel = nivel;   // conflicto -> nos quedamos con el más alto
      if (lugar && rec.lugares.indexOf(lugar) < 0) rec.lugares.push(lugar);
      if (peligro && rec.peligros.indexOf(peligro) < 0) rec.peligros.push(peligro);
      if (tarea && rec.tareas.indexOf(tarea) < 0) rec.tareas.push(tarea);
    }

    var list = order.map(function (k) { return map[k]; });
    // orden: clasificación más alta primero, luego alfabético
    list.sort(function (a, b) {
      if (b.nivel !== a.nivel) return b.nivel - a.nivel;
      return a.name.localeCompare(b.name, 'es');
    });

    return { list: list, totalFilas: total, distintos: list.length, filaTitulos: hdr + 1 };
  }

  /* --- Render ---------------------------------------------------------------- */
  function el(id) { return document.getElementById(id); }

  function render() {
    var tb = el('iper-tbody');
    tb.innerHTML = '';
    _rows.forEach(function (rec, i) {
      var nv = NIVELES[rec.nivel] || { color: '#64748b', label: 'Sin clasificar',
        exp: 'La fila de la IPER no trae un nivel de riesgo reconocible (1 a 4). Revísala en la matriz.' };
      var nombre = _stripCodes ? sinCodigo(rec.name) : rec.name;

      var tr = document.createElement('tr');

      var tdN = document.createElement('td');
      tdN.className = 'iper-c-num';
      tdN.textContent = String(i + 1);

      var tdName = document.createElement('td');
      tdName.className = 'iper-c-name';
      var strong = document.createElement('div');
      strong.className = 'iper-name';
      strong.textContent = nombre;
      tdName.appendChild(strong);
      var meta = [];
      if (rec.veces > 1) meta.push(rec.veces + ' filas en la IPER');
      if (rec.lugares.length) meta.push('Lugar: ' + rec.lugares.join(' · '));
      if (meta.length) {
        var sub = document.createElement('div');
        sub.className = 'iper-sub';
        sub.textContent = meta.join('   |   ');
        tdName.appendChild(sub);
      }

      var tdCls = document.createElement('td');
      tdCls.className = 'iper-c-cls';
      var chip = document.createElement('span');
      chip.className = 'iper-chip';
      chip.style.background = nv.color;
      chip.style.color = (rec.nivel === 2) ? '#3a2f00' : '#fff';
      chip.textContent = rec.nivel ? (rec.nivel + ' · ' + nv.label) : nv.label;
      tdCls.appendChild(chip);

      var tdExp = document.createElement('td');
      tdExp.className = 'iper-c-exp';
      tdExp.textContent = nv.exp;

      tr.appendChild(tdN);
      tr.appendChild(tdName);
      tr.appendChild(tdCls);
      tr.appendChild(tdExp);
      tb.appendChild(tr);
    });

    // resumen por nivel
    var cnt = { 1: 0, 2: 0, 3: 0, 4: 0, 0: 0 };
    _rows.forEach(function (r) { cnt[r.nivel] = (cnt[r.nivel] || 0) + 1; });
    var parts = [];
    [4, 3, 2, 1].forEach(function (n) {
      if (cnt[n]) parts.push('<b style="color:' + NIVELES[n].color + '">' + cnt[n] + '</b> ' + NIVELES[n].label.toLowerCase());
    });
    if (cnt[0]) parts.push('<b>' + cnt[0] + '</b> sin clasificar');
    el('iper-summary').innerHTML = _rows.length
      ? (_rows.length + ' riesgos distintos&nbsp;&nbsp;·&nbsp;&nbsp;' + parts.join(' &nbsp; '))
      : '';

    el('iper-result').style.display = _rows.length ? 'flex' : 'none';
  }

  function handleFile(file) {
    if (!file) return;
    var nm = (file.name || '').toLowerCase();
    if (!/\.(xlsx|xlsm|xls)$/.test(nm)) {
      setError('El archivo debe ser una planilla Excel (.xlsx).');
      return;
    }
    setError('');
    el('iper-drop-txt').textContent = 'Leyendo "' + file.name + '"…';
    var rd = new FileReader();
    rd.onerror = function () { setError('No se pudo leer el archivo.'); };
    rd.onload = function (e) {
      try {
        var out = parseWorkbook(new Uint8Array(e.target.result));
        _rows = out.list;
        if (!_rows.length) {
          setError('Encontré la matriz (fila de títulos ' + out.filaTitulos + ') pero no hay filas con "Riesgo específico" cargado.');
          el('iper-result').style.display = 'none';
        } else {
          el('iper-drop-txt').textContent = file.name + '  —  ' + out.totalFilas +
            ' filas leídas, ' + out.distintos + ' riesgos distintos';
          render();
        }
      } catch (err) {
        setError(err && err.message ? err.message : String(err));
        el('iper-result').style.display = 'none';
      }
    };
    rd.readAsArrayBuffer(file);
  }

  function setError(msg) {
    var box = el('iper-error');
    box.textContent = msg || '';
    box.style.display = msg ? 'block' : 'none';
  }

  /* --- Copiar / exportar ------------------------------------------------- */
  function tableRows() {
    return _rows.map(function (rec, i) {
      var nv = NIVELES[rec.nivel] || { label: 'Sin clasificar', exp: '' };
      var nombre = _stripCodes ? sinCodigo(rec.name) : rec.name;
      var cls = rec.nivel ? (rec.nivel + ' - ' + nv.label) : 'Sin clasificar';
      return [String(i + 1), nombre, cls, nv.exp];
    });
  }

  function copyTable() {
    var head = ['N°', 'Nombre del riesgo', 'Clasificación del riesgo', 'Explicación'];
    var txt = [head].concat(tableRows())
      .map(function (r) { return r.join('\t'); }).join('\n');
    var done = function () { flash('iper-copy', '✓ Copiado'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt, done); });
    } else {
      fallbackCopy(txt, done);
    }
  }

  function fallbackCopy(txt, done) {
    var ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  function exportCSV() {
    var head = ['N', 'Nombre del riesgo', 'Clasificacion del riesgo', 'Explicacion'];
    var esc = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
    var lines = [head].concat(tableRows())
      .map(function (r) { return r.map(esc).join(';'); }).join('\r\n');
    var blob = new Blob(['﻿' + lines], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'listado_riesgos_iper.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 200);
    flash('iper-csv', '✓ Descargado');
  }

  function flash(id, txt) {
    var b = el(id);
    if (!b) return;
    var prev = b.textContent;
    b.textContent = txt;
    setTimeout(function () { b.textContent = prev; }, 1400);
  }

  /* --- Abrir / cerrar overlay ----------------------------------------------- */
  function open() { el('iper-overlay').style.display = 'flex'; }
  function close() { el('iper-overlay').style.display = 'none'; }

  /* --- Wiring ----------------------------------------------------------------- */
  function init() {
    var btn = el('iper-open-btn');
    if (!btn) return; // el módulo sólo vive en la página del editor
    btn.addEventListener('click', open);
    el('iper-close').addEventListener('click', close);
    el('iper-overlay').addEventListener('click', function (e) {
      if (e.target === el('iper-overlay')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el('iper-overlay').style.display === 'flex') close();
    });

    var input = el('iper-file');
    el('iper-pick').addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) handleFile(input.files[0]);
      input.value = '';
    });

    var drop = el('iper-drop');
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      var dt = e.dataTransfer;
      if (dt && dt.files && dt.files[0]) handleFile(dt.files[0]);
    });

    el('iper-strip').addEventListener('change', function (e) {
      _stripCodes = e.target.checked;
      render();
    });

    el('iper-copy').addEventListener('click', copyTable);
    el('iper-csv').addEventListener('click', exportCSV);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
