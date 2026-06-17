/**
 * BUILD.JS — Ensambla index.html desde los módulos
 * Uso: node build.js
 * Resultado: ../index_build.html (listo para subir como index.html a GitHub)
 *
 * MÓDULOS:
 *   01_css.css           → Estilos completos
 *   02_html_body.html    → Estructura HTML (sin imágenes base64)
 *   03_js_core.js        → RISKS, paleta, drag/drop, addMarker, zoom, showPlan, switchMode
 *   04_evac_items.js     → EVAC_ITEMS con imágenes base64 (NO EDITAR — solo imágenes)
 *   05_js_evac_arrows.js → iconSVGEvac, renderEvacPalette, flechas, float panel
 *   06_js_capture.js     → Exportar PNG / PDF
 *   07_js_save_load.js   → Firebase auth + panel guardar/cargar por modo
 *   08_js_cad.js         → Editor CAD básico (paredes, habitaciones, puertas, ventanas)
 *   plan1_base64.txt     → Imagen plano Nivel 1 (base64)
 *   plan2_base64.txt     → Imagen plano Nivel 2 (base64)
 */

const fs   = require('fs');
const path = require('path');
const dir  = __dirname + '/';

function read(file) {
  return fs.readFileSync(dir + file, 'utf8');
}

const css      = read('01_css.css');
let   htmlBody = read('02_html_body.html');
const plan1    = read('plan1_base64.txt');
const plan2    = read('plan2_base64.txt');
const jsCore   = read('03_js_core.js');
const jsEvac   = read('04_evac_items.js');
const jsArrows = read('05_js_evac_arrows.js');
const jsCapt   = read('06_js_capture.js');
const jsSave   = read('07_js_save_load.js');
const jsCad    = read('08_js_cad.js');

let html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mapa de Riesgos — MONTICHEF</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"><\/script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"><\/script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"><\/script>
<style>
${css}
</style>
</head>
<body>
${htmlBody}
<script>
${jsCore}

${jsEvac}

${jsArrows}

${jsSave}

${jsCad}

${jsCapt}
<\/script>
</body>
</html>`;

// Validar sintaxis JS antes de escribir (con placeholders, son strings válidos)
const mainScript = jsCore + '\n' + jsEvac + '\n' + jsArrows + '\n' + jsSave + '\n' + jsCad + '\n' + jsCapt;
try {
  new Function(mainScript);
  console.log('✓ Sintaxis JS OK');
} catch(e) {
  console.error('✗ ERROR DE SINTAXIS JS:', e.message);
  process.exit(1);
}

// Insertar las imágenes demo (base64) en los placeholders del JS
let imgCount = 0;
html = html.replace(/"__PLAN_IMG__"/g, () => {
  imgCount++;
  return imgCount === 1 ? `"${plan1}"` : `"${plan2}"`;
});
if (imgCount !== 2) console.warn(`⚠ Se esperaban 2 __PLAN_IMG__, se reemplazaron ${imgCount}`);

const outPath = dir + '../index_build.html';
fs.writeFileSync(outPath, html, 'utf8');
const size = fs.statSync(outPath).size;
console.log(`✓ Generado: index_build.html (${Math.round(size/1024/1024*100)/100} MB)`);
console.log('  Copiar a GitHub como index.html');
