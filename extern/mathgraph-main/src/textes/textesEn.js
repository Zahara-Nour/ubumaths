/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

/**
 * Contient les textes utilisés dans le logiciel
 * @typedef Textes
 * @type {Object}
 */
/**
 * Les textes utilisés dans le logiciel en langue anglaise
 * @type {Textes}
 * @private
 */
const textesEn = {
  step: 'step',
  var1: 'New value for variable ',
  var2: 'Enter a value between ',
  et: ' and ',
  invalidEntry: 'Entry not valid',
  // Chaînes servant suivant la langue à reconstruire les formules mathématiques
  abs: 'abs',
  intgr: 'int',
  sqrt: 'sqrt',
  rac: 'sqrt',
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  ln: 'ln',
  lnlat: '\\ln',
  exp: 'exp',
  arctan: 'atan',
  arctanlat: 'atan',
  arccos: 'acos',
  arccoslat: 'acos',
  arcsin: 'asin',
  arcsinlat: 'asin',
  ch: 'cosh',
  chlat: '\\cosh',
  sh: 'sinh',
  shlat: '\\sinh',
  th: 'tanh',
  thlat: '\\tanh',
  argch: 'acosh',
  argsh: 'asinh',
  argth: 'atanh',
  rand: 'rand',
  conj: 'conj',
  arg: 'arg',
  re: 're',
  im: 'im',

  maxi: 'max',
  mini: 'min',
  gcd: 'gcd',
  lcm: 'lcm',
  ncr: 'nCr',
  npr: 'nPr',
  mod: 'mod',
  si: 'if',
  integrale: 'integral',
  primitive: 'primitive',
  fact: 'fact',
  somme: 'sum',
  produit: 'prod',
  left: 'left',
  right: 'right',
  core: 'core',
  transp: 'transp',
  deter: 'deter', // do not change (translation ignored but needed in this list)
  dotmult: 'dotmult',
  inv: 'inv',
  frac: 'frac',
  nbcol: 'nbcol', // do not change (translation ignored but needed in this list)
  nbrow: 'nbrow', // do not change (translation ignored but needed in this list)
  divmaxp: 'divmaxp', // Ajout version 7.0
  sortbyrow: 'sortbyrow', // Ajout version 7.2
  sortbycol: 'sortbycol', // Ajout version 7.2
  apiCodeInfo1: 'You can use in this console all the methods of object mathgraph: see its <a href="https://www.mathgraph32.org/documentation/full/MtgApi.html" target="doc">documentation</a><br>The Execute button will apply your commands on the figure.',
  apiCodeInfo2: 'Example of code:',
  apiCodeOutput: 'Output of execution:',
  apiCodeReset: 'Reset',
  apiCodeResetEx: 'Reset example 1',
  apiCodeResetInitConfirm: 'Are you sure you want to replace all the Python code by the initial one ?',
  apiCodeResetExConfirm: 'Are you sure you want to replace all the Python code by example 1 ?',
  apiCodeResetConfirm: 'Are you sure you want to erase all the Python code ?',
  apiCodeExec: 'Execute',
  apiCodeDownload: 'Download the figure',
  apiCodeDisplay: 'Display the figure code',
  apiCodeCopy: 'Copy the figure code',
  apiCodeClipboardOk: 'The figure code has been put in the clipboard',
  apiCodeClipboardKo: 'Copying the figure in the clipboard has failed',
  apiCodeImport: 'Import',
  apiCodeInfoPaste: 'Paste underneath the base64 code of the figure to be displayed.',
  apiCodeInfoCopy: 'Copy the code underneath to get the Base64 code of the figure.',
  apiCodeResetWith: 'Reset the figure with:',
  apiStartFig: 'Starting figure',
  apiFigInit: 'Initial figure',
  apiFigEmpty: 'Empty figure',
  apiRepOrt: 'Orthonormam system of axis',
  apiErase: 'Erase'
}

export default textesEn
