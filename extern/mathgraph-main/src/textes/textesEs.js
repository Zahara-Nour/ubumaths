/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

/**
 * Contient les textes utilisés dans le logiciel en langue espagnole.
 * @type {Textes}
 * @private
 */
const textesEs = {
  step: 'paso',
  var1: 'Nuevo valor para la variable ',
  var2: 'Entre un valor comprendido entre ',
  et: ' y ',
  invalidEntry: 'Entrada incorrecta',
  // Chaînes servant suivant la langue à reconstruire les formules mathématiques
  abs: 'abs',
  intgr: 'int',
  sqrt: 'sqrt',
  rac: 'rac',
  sin: 'sen',
  cos: 'cos',
  tan: 'tan',
  ln: 'ln',
  lnlat: '\\ln',
  exp: 'exp',
  arctan: 'arctan',
  arctanlat: '\\arctan',
  arccos: 'arccos',
  arccoslat: '\\arccos',
  arcsin: 'arcsen',
  arcsinlat: '\\arcsin',
  ch: 'cosh',
  chlat: '\\cosh',
  sh: 'senh',
  shlat: '\\sinh',
  th: 'tanh',
  thlat: '\\tanh',
  argch: 'argcosh',
  argsh: 'argsenh',
  argth: 'argtanh',
  rand: 'rand',
  conj: 'conj',
  arg: 'arg',
  re: 're',
  im: 'im',
  maxi: 'máx',
  mini: 'mín',
  gcd: 'mcd',
  lcm: 'mcm',
  ncr: 'nCr',
  npr: 'nPr',
  mod: 'mod',
  si: 'si',
  integrale: 'integral',
  primitive: 'primitiva',
  fact: 'fact',
  somme: 'suma',
  produit: 'producto',
  left: 'izquierda',
  right: 'derecha',
  core: 'core',
  transp: 'transp',
  deter: 'deter', // combio prohibido (pero se necesita aqui)
  dotmult: 'dotmult',
  inv: 'inv',
  frac: 'frac',
  nbcol: 'nbcol', // combio prohibido (pero se necesita aqui)
  nbrow: 'nbrow', // combio prohibido (pero se necesita aqui)
  divmaxp: 'divmaxp', // Ajout version 7.0
  sortbyrow: 'sortbyrow', // Ajout version 7.2
  sortbycol: 'sortbycol', // Ajout version 7.2
  apiCodeInfo1: 'Dispone de acceso global en esta consola a todos los métodos del objeto mathgraph en esta consola: mira su <a href="https://www.mathgraph32.org/documentation/full/MtgApi.html" target="doc">documentación</a><br>El botón Ejecutar lanzará nuestros comandos en la figura.',
  apiCodeInfo2: 'Ejemplo de código',
  apiCodeOutput: 'Salida de la ejecución:',
  apiCodeReset: 'Restablecer',
  apiCodeResetEx: 'Restablecer ejemplo 1',
  apiCodeResetInitConfirm: '¿Está seguro de que desea reemplazar todo el código Python con el del inicio?',
  apiCodeResetExConfirm: '¿Está seguro de que desea reemplazar todo el código Python con el ejemplo 1?',
  apiCodeResetConfirm: '¿Está seguro de que desea eliminar todo el código Python?',
  apiCodeExec: 'Ejecutar',
  apiCodeDownload: 'Descargar la figura',
  apiCodeDisplay: 'Mostrar el código de la figura',
  apiCodeCopy: 'Copiar el código de la figura',
  apiCodeClipboardOk: 'El código base64 de la figura ha sido copiado al portapapeles',
  apiCodeClipboardKo: 'Copiar el código de la figura al portapapeles ha fracasado',
  apiCodeImport: 'Importar',
  apiCodeInfoPaste: 'Pegar debajo el código base64 de la figura a visualizar.',
  apiCodeInfoCopy: 'Copiar el código siguiente para recuperar el código base64 para esta figura.',
  apiCodeResetWith: 'Reinicializar la figura con: ',
  apiStartFig: 'Figura de partida',
  apiFigInit: 'Figura inicial',
  apiFigEmpty: 'Figura vacía',
  apiRepOrt: 'Referencial ortonormal',
  apiErase: 'Borrar'
}

export default textesEs
