/* ============================================================================
 * iper.js — Paso 1
 * Sube la matriz IPER (.xlsx) y genera un listado de riesgos en 3 columnas:
 *   NOMBRE DEL RIESGO · CLASIFICACIÓN (con color) · EXPLICACIÓN
 *
 * Módulo aislado de core.js / capture.js / cad.js. Con save_load.js tiene
 * UNA sola dependencia opcional (lee _db/_ownerUid si existen, para guardar
 * las IPER en Firestore además de en este equipo) — todo detrás de "typeof",
 * así que si no están disponibles el módulo sigue andando solo con
 * localStorage, como antes.
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

  /* --- Secciones / lugares de trabajo -----------------------------------------
   * La IPER trae el "Lugar de trabajo específico" con nombres libres. Aquí se
   * normalizan a las secciones del local. Si un lugar no coincide, se muestra
   * tal cual viene en el Excel.
   * ------------------------------------------------------------------------- */
  var SECCIONES = [
    { re: /(panaderi)/i,                         label: 'Panadería' },
    { re: /(pasteleri|reposteri)/i,              label: 'Pastelería' },
    { re: /(cocina|coccion|línea de|linea de)/i, label: 'Cocina' },
    { re: /(produccion|producción|elaboracion|elaboración|planta|operacion|operación)/i, label: 'Sala de operaciones' },
    { re: /(sala de venta|local de venta|mesón|meson|mostrador|atencion|atención|publico|público|cliente)/i, label: 'Sala de ventas' },
    { re: /(bodega|almacen|almacén|despensa)/i,  label: 'Bodega' },
    { re: /(aseo|limpieza)/i,                    label: 'Aseo' },
    { re: /(bano|baño|servicio higien|sshh)/i,   label: 'Baños' },
    { re: /(vestuario|camarin|camerino|casillero)/i, label: 'Vestuario' },
    { re: /(parqueadero|estacionamiento|parking)/i, label: 'Parqueadero / Estacionamiento' },
    { re: /(oficina|administr|casa matriz|matriz)/i, label: 'Administración' },
    { re: /(via publica|vía pública|calle|ruta|reparto|delivery|despacho)/i, label: 'Vía pública / reparto' }
  ];

  function normSeccion(lugar) {
    var t = String(lugar || '').trim();
    if (!t) return '';
    for (var i = 0; i < SECCIONES.length; i++) {
      if (SECCIONES[i].re.test(t)) return SECCIONES[i].label;
    }
    return t; // desconocido: se deja el texto original de la IPER
  }

  function seccionesDe(rec) {
    var set = [];
    (rec.lugares || []).forEach(function (l) {
      var s = normSeccion(l);
      if (s && set.indexOf(s) < 0) set.push(s);
    });
    return set;
  }

  /* --- Riesgos que se esperan según el tipo de lugar --------------------------
   * Sugerencia automática (NO reemplaza el criterio del prevencionista): si la
   * matriz menciona un lugar de cierto tipo (p.ej. "Cocina") y ninguna fila de
   * la IPER cubre un riesgo típico de ese lugar (p.ej. "Incendio"), se propone
   * al final del listado. Usa los mismos ids/nombres/glifos de RISKS (core.js,
   * cargado antes que este módulo) para que el nombre y el ícono coincidan con
   * la paleta del mapa; si por algún motivo no está disponible, se omite el
   * ícono sin romper nada (módulo aislado).
   * ------------------------------------------------------------------------- */
  // por cada riesgo de la paleta: palabras/expresiones que, si aparecen en el
  // nombre o el "peligro/factor" de una fila de la IPER, cuentan como "ya cubierto"
  var RIESGO_KEYWORDS = {
    incendio:            /INCENDIO|FUEGO|CONATO/,
    explosion:            /EXPLOSION|GAS LICUADO|FUGA DE GAS|\bGLP\b/,
    calor:                /TERMICO CALOR|GOLPE DE CALOR|ALTA TEMPERATURA|ESTRES TERMICO/,
    frio:                 /TERMICO FRIO|CAMARA DE FRIO|BAJA TEMPERATURA|FRIO EXTREMO/,
    cortes:               /CORTE/,
    atrapamiento:         /ATRAPAMIENTO|ENGANCHE|ENGRANAJE/,
    caida_mismo:          /CAIDA.*MISMO NIVEL|RESBAL/,
    caida_distinto:       /CAIDA.*DISTINTO NIVEL|CAIDA DE ALTURA|TRABAJO EN ALTURA/,
    caida_objetos:        /CAIDA DE OBJETO/,
    electrico:            /ELECTRIC/,
    ruido:                /RUIDO/,
    polvo:                /POLVO|AEROSOL|MATERIAL PARTICULADO|HARINA/,
    quimicos:             /QUIMIC|CORROSIV|SUSTANCIA PELIGROSA|CAUSTIC/,
    vehiculos:            /ATROPELLO|VEHICUL|TRANSITO/,
    sismo:                /SISMO|TERREMOTO|INUNDACION/,
    psicosocial:          /PSICOSOCIAL|ESTRES LABORAL|ACOSO|CARGA MENTAL/,
    sobrecarga:           /SOBRECARGA|MANEJO MANUAL|SOBREESFUERZO|CARGA FISICA|POSTURA/,
    superficie_caliente:  /SUPERFICIE CALIENTE|QUEMADURA/
  };
  // por cada sección normalizada (misma etiqueta que SECCIONES arriba): riesgos
  // típicos que se esperaría encontrar si la IPER cubre ese tipo de lugar
  var SECCION_RIESGOS = {
    'Panadería':              ['incendio', 'calor', 'superficie_caliente', 'electrico', 'polvo'],
    'Pastelería':             ['incendio', 'calor', 'superficie_caliente', 'electrico', 'cortes'],
    'Cocina':                 ['incendio', 'calor', 'superficie_caliente', 'electrico', 'cortes'],
    'Sala de operaciones':    ['electrico', 'atrapamiento', 'ruido', 'sobrecarga'],
    'Sala de ventas':         ['caida_mismo'],
    'Bodega':                 ['caida_objetos', 'sobrecarga', 'caida_distinto'],
    'Aseo':                   ['quimicos', 'caida_mismo'],
    'Baños':                  ['caida_mismo'],
    'Vestuario':              ['caida_mismo'],
    'Parqueadero / Estacionamiento': ['vehiculos', 'sismo'],
    'Administración':         ['electrico'],
    'Vía pública / reparto':  ['vehiculos']
  };

  // ids de riesgo que YA aparecen en la IPER subida (según nombre/peligro de cada fila)
  function riesgosCubiertos(rows) {
    var set = {};
    rows.forEach(function (rec) {
      var texto = norm(rec.name) + ' ' + norm((rec.peligros || []).join(' '));
      Object.keys(RIESGO_KEYWORDS).forEach(function (id) {
        if (!set[id] && RIESGO_KEYWORDS[id].test(texto)) set[id] = true;
      });
    });
    return set;
  }

  // secciones normalizadas que aparecen en algún lugar de la IPER subida
  function seccionesEncontradas(rows) {
    var set = {};
    rows.forEach(function (rec) {
      seccionesDe(rec).forEach(function (s) { set[s] = true; });
    });
    return Object.keys(set);
  }

  // riesgos esperados por las secciones presentes que no aparecen en la IPER
  function detectarFaltantes(rows) {
    var cubiertos = riesgosCubiertos(rows);
    var secciones = seccionesEncontradas(rows);
    var faltanMap = {};
    secciones.forEach(function (sec) {
      var esperados = SECCION_RIESGOS[sec];
      if (!esperados) return;
      esperados.forEach(function (id) {
        if (cubiertos[id]) return;
        if (!faltanMap[id]) faltanMap[id] = { id: id, secciones: [] };
        if (faltanMap[id].secciones.indexOf(sec) < 0) faltanMap[id].secciones.push(sec);
      });
    });
    return Object.keys(faltanMap).map(function (id) { return faltanMap[id]; })
      .sort(function (a, b) { return b.secciones.length - a.secciones.length; });
  }

  function renderSuggest(rows) {
    var wrap = el('iper-suggest-wrap');
    var box = el('iper-suggest');
    if (!wrap || !box) return;
    var faltan = detectarFaltantes(rows);
    if (!faltan.length) { wrap.style.display = 'none'; box.innerHTML = ''; return; }
    wrap.style.display = 'block';
    box.innerHTML = '';
    faltan.forEach(function (f) {
      var meta = (typeof RISKS !== 'undefined') ? RISKS.filter(function (r) { return r.id === f.id; })[0] : null;
      var nombre = meta ? meta.name : f.id;

      var row = document.createElement('div');
      row.className = 'iper-sugg-row';

      var ico = document.createElement('div');
      ico.className = 'iper-sugg-ico';
      if (meta && typeof iconSVG === 'function') ico.innerHTML = iconSVG(meta.g, '#ff8c00', 26);
      row.appendChild(ico);

      var info = document.createElement('div');
      info.className = 'iper-sugg-info';
      var nm = document.createElement('div');
      nm.className = 'iper-sugg-name';
      nm.textContent = nombre;
      var why = document.createElement('div');
      why.className = 'iper-sugg-why';
      why.textContent = 'Tu matriz menciona ' + f.secciones.join(', ') +
        ', pero no encontré este riesgo en ninguna fila.';
      info.appendChild(nm);
      info.appendChild(why);
      row.appendChild(info);

      var addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'iper-sugg-add';
      addBtn.textContent = '＋ Agregar a la lista';
      addBtn.addEventListener('click', function () { agregarRiesgoSugerido(nombre, f.secciones); });
      row.appendChild(addBtn);

      box.appendChild(row);
    });
  }

  // agrega un riesgo sugerido a _rows como si fuera una fila mas de la IPER
  // (sin clasificacion propia -- queda "Sin clasificar" hasta que el
  // prevencionista lo evalue) y lo deja guardado junto con el resto
  function agregarRiesgoSugerido(nombre, secciones) {
    var yaExiste = _rows.some(function (r) { return norm(r.name) === norm(nombre); });
    if (yaExiste) return;
    var nuevo = {
      name: nombre,
      nivel: 0,
      veces: 1,
      lugares: (secciones || []).slice(),
      peligros: ['Agregado por el programa — falta evaluar probabilidad y consecuencia'],
      tareas: []
    };
    _rows.push(nuevo);
    _rows.sort(function (a, b) {
      if (b.nivel !== a.nivel) return b.nivel - a.nivel;
      return a.name.localeCompare(b.name, 'es');
    });
    _totalFilas = (typeof _totalFilas === 'number' ? _totalFilas : _rows.length) + 1;
    render();
    if (_fuente) guardarActual(_fuente, { totalFilas: _totalFilas, distintos: _rows.length });

    var idx = _rows.indexOf(nuevo);
    var tr = el('iper-tbody').children[idx];
    if (tr) {
      tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      tr.classList.add('iper-row-new');
      setTimeout(function () { tr.classList.remove('iper-row-new'); }, 2200);
    }
  }

  /* --- Estado ------------------------------------------------------------- */
  var _rows = [];        // riesgos procesados (para exportar / re-render)
  var _stripCodes = false;
  var _fuente = '';      // nombre de la IPER que se está mostrando
  var _totalFilas = 0;   // filas leídas del Excel + riesgos agregados manualmente después

  /* --- IPER guardadas -------------------------------------------------------
     Fuente principal: Firestore (users/{uid}/iper/{id}), para que no dependan
     de un solo navegador/equipo (localStorage se puede perder: el navegador
     puede desalojarlo solo, sin que el usuario haga nada). Se mantiene además
     una copia en localStorage de este equipo como caché/respaldo, para que la
     lista se vea al instante y la app siga sirviendo algo sin conexión.
     _iperCloudInit() lo llama save_load.js (fuera de este módulo, por eso el
     acceso a _db/_ownerUid va con "typeof" — si por algo no están disponibles,
     el módulo sigue funcionando solo con localStorage, como antes. ------------- */
  var LS_KEY = 'iper_guardadas_v1';
  var LS_MIGRADO_KEY = 'iper_migrado_v1';
  var LS_MAX = 25;
  var _cloudList = null; // null = todavía no se intentó cargar desde Firestore

  function _localLoad() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch (e) { return []; }
  }
  function _localStore(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }
  function _cloudDisponible() {
    return typeof _db !== 'undefined' && typeof _ownerUid === 'function' && !!_ownerUid();
  }
  function _iperCol() {
    return _db.collection('users').doc(_ownerUid()).collection('iper');
  }
  // Se muestra la lista de la nube en cuanto se pudo cargar; mientras tanto
  // (o si no hay nube disponible) se usa la copia de este equipo.
  function savedLoad() {
    return _cloudList !== null ? _cloudList : _localLoad();
  }
  // Llamado por save_load.js (_enterApp / _enterAdminEdit) apenas se sabe qué
  // cuenta está activa. Trae las IPER guardadas en Firestore y, si es la
  // primera vez que este equipo se conecta y tenía IPER solo locales (de
  // antes de este cambio), las sube para que dejen de depender de un solo
  // navegador.
  function _iperCloudInit() {
    if (!_cloudDisponible()) return;
    _iperCol().orderBy('fecha', 'desc').limit(LS_MAX).get().then(function (snap) {
      var list = [];
      snap.forEach(function (doc) { list.push(doc.data()); });
      if (!list.length && !localStorage.getItem(LS_MIGRADO_KEY)) {
        var local = _localLoad();
        if (local.length) {
          local.forEach(function (e) { _iperCol().doc(e.id).set(e).catch(function () {}); });
          list = local;
        }
      }
      try { localStorage.setItem(LS_MIGRADO_KEY, '1'); } catch (e) {}
      _cloudList = list;
      renderSaved();
    }).catch(function () { /* sin conexión: se sigue viendo la copia de este equipo */ });
  }
  window._iperCloudInit = _iperCloudInit;

  function fechaCorta(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('es-CL') + ' ' +
        d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return iso || ''; }
  }

  // guarda (o actualiza si ya existe una con el mismo nombre) la IPER recién leída
  function guardarActual(nombre, meta) {
    var list = savedLoad().slice();
    var nm = String(nombre || 'IPER').trim() || 'IPER';
    var i = -1;
    for (var k = 0; k < list.length; k++) {
      if ((list[k].nombre || '').toLowerCase() === nm.toLowerCase()) { i = k; break; }
    }
    var entry = {
      id: (i >= 0 ? list[i].id : 'i' + Date.now().toString(36)),
      nombre: nm,
      fecha: new Date().toISOString(),
      totalFilas: meta ? meta.totalFilas : 0,
      distintos: meta ? meta.distintos : _rows.length,
      rows: _rows
    };
    if (i >= 0) list[i] = entry; else list.unshift(entry);
    if (list.length > LS_MAX) list = list.slice(0, LS_MAX);
    if (_cloudList !== null) _cloudList = list;
    if (!_localStore(list)) {
      setError('No se pudo guardar la IPER en este equipo (almacenamiento lleno o bloqueado).');
    }
    if (_cloudDisponible()) {
      _iperCol().doc(entry.id).set(entry).catch(function () {
        setError('Se guardó en este equipo, pero no se pudo respaldar en la nube (revisa tu conexión).');
      });
    }
    renderSaved();
  }

  function verGuardada(id) {
    var e = savedLoad().filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    _rows = (e.rows || []).slice();
    _fuente = e.nombre;
    _totalFilas = e.totalFilas || _rows.length;
    setError('');
    el('iper-drop-txt').textContent = 'Consultando “' + e.nombre + '”  ·  guardada ' + fechaCorta(e.fecha);
    render();
    renderSaved();
  }

  function renombrarGuardada(id) {
    var list = savedLoad().slice();
    var e = list.filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    var nv = window.prompt('Nuevo nombre para esta IPER:', e.nombre);
    if (nv === null) return;
    nv = nv.trim();
    if (!nv) return;
    e.nombre = nv;
    if (_cloudList !== null) _cloudList = list;
    _localStore(list);
    if (_cloudDisponible()) _iperCol().doc(e.id).update({ nombre: nv }).catch(function () {});
    if (_fuente && _fuente === e.nombre) _fuente = nv;
    renderSaved();
  }

  function borrarGuardada(id) {
    var list = savedLoad();
    var e = list.filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    if (!window.confirm('¿Borrar la IPER guardada “' + e.nombre + '”? Esto no borra el archivo Excel original.')) return;
    var nueva = list.filter(function (x) { return x.id !== id; });
    if (_cloudList !== null) _cloudList = nueva;
    _localStore(nueva);
    if (_cloudDisponible()) _iperCol().doc(id).delete().catch(function () {});
    renderSaved();
  }

  function renderSaved() {
    var wrap = el('iper-saved-wrap');
    var box = el('iper-saved');
    if (!wrap || !box) return;
    var list = savedLoad();
    wrap.style.display = 'block';
    if (!list.length) {
      box.innerHTML = '<div class="iper-saved-empty">Aún no hay ninguna IPER guardada en este navegador. ' +
        'Al subir un archivo se guarda aquí para consultarla después sin volver a subirla — pero solo queda ' +
        'guardada en este equipo y este navegador, no se sincroniza con otros dispositivos.</div>';
      return;
    }
    box.innerHTML = '';
    list.forEach(function (e) {
      var row = document.createElement('div');
      row.className = 'iper-saved-row' + (_fuente && _fuente === e.nombre ? ' active' : '');

      var info = document.createElement('div');
      info.className = 'iper-saved-info';
      var nm = document.createElement('div');
      nm.className = 'iper-saved-name';
      nm.textContent = e.nombre;
      var mt = document.createElement('div');
      mt.className = 'iper-saved-meta';
      mt.textContent = (e.distintos || (e.rows ? e.rows.length : 0)) + ' riesgos  ·  guardada ' + fechaCorta(e.fecha);
      info.appendChild(nm);
      info.appendChild(mt);

      var acts = document.createElement('div');
      acts.className = 'iper-saved-acts';
      var bVer = document.createElement('button'); bVer.type = 'button'; bVer.textContent = 'Ver';
      bVer.addEventListener('click', function () { verGuardada(e.id); });
      var bRen = document.createElement('button'); bRen.type = 'button'; bRen.textContent = 'Renombrar';
      bRen.addEventListener('click', function () { renombrarGuardada(e.id); });
      var bDel = document.createElement('button'); bDel.type = 'button'; bDel.textContent = 'Borrar';
      bDel.className = 'danger';
      bDel.addEventListener('click', function () { borrarGuardada(e.id); });
      acts.appendChild(bVer); acts.appendChild(bRen); acts.appendChild(bDel);

      row.appendChild(info);
      row.appendChild(acts);
      box.appendChild(row);
    });
  }

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
      var esp = cRiesgo >= 0 && row[cRiesgo] ? String(row[cRiesgo]).replace(/\s+/g, ' ').trim() : '';
      var peligro = cPeligro >= 0 && row[cPeligro] ? String(row[cPeligro]).replace(/\s+/g, ' ').trim() : '';
      // El nombre del riesgo se arma con "Peligro / factor de riesgo" + "Riesgo específico".
      // Si sólo viene uno de los dos, se usa ese.
      var name = esp || peligro;
      if (!name) continue;

      total++;
      var key = name.toUpperCase();
      var nivel = nivelDeClasificacion(cClass >= 0 ? row[cClass] : '');
      var lugar = cLugar >= 0 && row[cLugar] ? String(row[cLugar]).trim() : '';
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
      // "Peligro / factor de riesgo" (encabezado) + "Riesgo específico" (nombre)
      var pelTxt = (rec.peligros || []).filter(function (p) {
        return p && p.toUpperCase() !== rec.name.toUpperCase();
      }).join(' · ');
      if (pelTxt) {
        var pf = document.createElement('div');
        pf.className = 'iper-peligro';
        pf.textContent = pelTxt;
        tdName.appendChild(pf);
      }
      var strong = document.createElement('div');
      strong.className = 'iper-name';
      strong.textContent = nombre;
      tdName.appendChild(strong);
      if (rec.veces > 1) {
        var sub = document.createElement('div');
        sub.className = 'iper-sub';
        sub.textContent = rec.veces + ' filas en la IPER';
        tdName.appendChild(sub);
      }

      var tdLug = document.createElement('td');
      tdLug.className = 'iper-c-lug';
      var secs = seccionesDe(rec);
      tdLug.textContent = secs.length ? secs.join(' · ') : '—';
      if (secs.length) {
        // si la sección normalizada difiere del texto original, mostrarlo como ayuda
        var raw = (rec.lugares || []).join(' · ');
        if (raw && raw.toLowerCase() !== secs.join(' · ').toLowerCase()) {
          var sl = document.createElement('div');
          sl.className = 'iper-sub';
          sl.textContent = raw;
          tdLug.appendChild(sl);
        }
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
      tr.appendChild(tdLug);
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

    try { renderSuggest(_rows); } catch (e) { /* sugerencia es un extra, no debe romper la tabla */ }
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
          _fuente = file.name;
          _totalFilas = out.totalFilas;
          el('iper-drop-txt').textContent = file.name + '  —  ' + out.totalFilas +
            ' filas leídas, ' + out.distintos + ' riesgos distintos';
          render();
          guardarActual(file.name, out);   // se guarda en este equipo para consultarla luego
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
      var lug = seccionesDe(rec).join(' · ') || '';
      var pel = (rec.peligros || []).filter(function (p) {
        return p && p.toUpperCase() !== rec.name.toUpperCase();
      }).join(' · ');
      return [String(i + 1), pel, nombre, lug, cls, nv.exp];
    });
  }

  function copyTable() {
    var head = ['N°', 'Peligro / factor de riesgo', 'Riesgo específico', 'Lugar del riesgo', 'Clasificación del riesgo', 'Explicación'];
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
    var head = ['N', 'Peligro / factor de riesgo', 'Riesgo especifico', 'Lugar del riesgo', 'Clasificacion del riesgo', 'Explicacion'];
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

    renderSaved();   // pinta las IPER ya guardadas en este equipo

    /* Cajones laterales derechos (uno a la vez): Cartilla de pictogramas / Leer los códigos.
       No tapan la lista: el panel se ensancha y el cuerpo lleva padding-right. */
    var pdfWrap = el('iper-pdf-wrap');
    var pdfFrame = el('iper-pdf-frame');
    var codesWrap = el('iper-codes-wrap');
    var iperPanel = el('iper-panel');
    var PDF_SRC = 'docs/cartilla-pictogramas.pdf';

    function closeDrawers() {
      pdfWrap.style.display = 'none';
      codesWrap.style.display = 'none';
      if (iperPanel) iperPanel.classList.remove('pdf-open', 'codes-open');
    }
    function toggleDrawer(which) {
      var openWrap = which === 'pdf' ? pdfWrap : codesWrap;
      var yaAbierto = openWrap.style.display === 'flex';
      closeDrawers();
      if (yaAbierto) return;                 // segundo clic = cerrar
      if (which === 'pdf') {
        if (!pdfFrame.getAttribute('src')) pdfFrame.setAttribute('src', PDF_SRC);
        pdfWrap.style.display = 'flex';
        if (iperPanel) iperPanel.classList.add('pdf-open');
      } else {
        codesWrap.style.display = 'flex';
        if (iperPanel) iperPanel.classList.add('codes-open');
        var b = el('iper-codes-body'); if (b) b.scrollTop = 0;
      }
    }
    el('iper-pdf-btn').addEventListener('click', function () { toggleDrawer('pdf'); });
    el('iper-codes-btn').addEventListener('click', function () { toggleDrawer('codes'); });
    el('iper-pdf-hide').addEventListener('click', closeDrawers);
    el('iper-codes-hide').addEventListener('click', closeDrawers);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
