/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

/**
 * Contient les textes utilisés dans le logiciel en langue Française
 * @type {Textes}
 * @private
 */
const textesFr = {
  step: 'pas',
  var1: 'Changement de la valeur de la variable ',
  var2: 'Entrez une valeur comprise entre ',
  et: ' et ',
  invalidEntry: 'Entrée non valide',
  // Chaînes servant suivant la langue à reconstruire les formules mathématiques
  abs: 'abs',
  intgr: 'int',
  sqrt: 'sqrt',
  rac: 'rac',
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  ln: 'ln',
  lnlat: '\\ln',
  exp: 'exp',
  arctan: 'arctan',
  arctanlat: '\\arctan',
  arccos: 'arccos',
  arccoslat: '\\arccos',
  arcsin: 'arcsin',
  arcsinlat: '\\arcsin',
  ch: 'ch',
  chlat: 'ch',
  sh: 'sh',
  shlat: 'sh',
  th: 'th',
  thlat: 'th',
  argch: 'argch',
  argsh: 'argsh',
  argth: 'argth',
  rand: 'rand',
  conj: 'conj',
  arg: 'arg',
  re: 're',
  im: 'im',
  maxi: 'max',
  mini: 'min',
  gcd: 'pgcd',
  lcm: 'ppcm',
  ncr: 'nCr',
  npr: 'nPr',
  mod: 'mod',
  si: 'si',
  integrale: 'integrale',
  primitive: 'primitive',
  fact: 'fact',
  somme: 'somme',
  produit: 'produit',
  left: 'gauche',
  right: 'droit',
  core: 'core',
  transp: 'transp',
  deter: 'deter', // ne pas modifier (ignoré, mais doit être dans cette liste)
  dotmult: 'dotmult',
  inv: 'inv',
  frac: 'frac',
  nbcol: 'nbcol', // ne pas modifier (ignoré, mais doit être dans cette liste)
  nbrow: 'nbrow', // ne pas modifier (ignoré, mais doit être dans cette liste)
  divmaxp: 'divmaxp', // Ajout version 7.0
  sortbyrow: 'sortbyrow', // Ajout version 7.2
  sortbycol: 'sortbycol', // Ajout version 7.2
  apiCodeInfo1: 'Vous disposez de toutes les méthodes de l’objet mathgraph&nbsp;:<br> voir sa <a href="https://www.mathgraph32.org/documentation/full/MtgApi.html" target="doc">documentation</a><br>Le bouton Exécuter lancera vos commandes sur la figure.',
  apiCodeInfo2: 'Exemple de code :',
  apiCodeOutput: 'Sortie de l’exécution :',
  apiCodeReset: 'Réinitialiser',
  apiCodeResetEx: 'Réinitialiser avec l’exemple 1',
  apiCodeResetInitConfirm: 'Vous êtes sûr de vouloir remplacer tout le code Python par celui de départ ?',
  apiCodeResetExConfirm: 'Vous êtes sûr de vouloir remplacer tout le code Python par l’exemple 1 ?',
  apiCodeResetConfirm: 'Etes vous sûr de vouloir effacer tout le code Python ?',
  apiCodeExec: 'Exécuter',
  apiCodeDownload: 'Télécharger la figure',
  apiCodeDisplay: 'Afficher le code de la figure',
  apiCodeCopy: 'Copier le code de la figure',
  apiCodeClipboardOk: 'Le code base64 de la figure a été copié dans le presse-papiers',
  apiCodeClipboardKo: 'La copie dans le presse-papiers a échoué',
  apiCodeImport: 'Importer',
  apiCodeInfoPaste: 'Coller ci-dessous le code base64 de la figure à afficher.',
  apiCodeInfoCopy: 'Copier le code ci dessous pour récupérer le code base64 de cette figure.',
  apiCodeResetWith: 'Réinitialiser la figure avec :',
  apiStartFig: 'Figure de départ',
  apiFigInit: 'Figure initiale',
  apiFigEmpty: 'Figure vide',
  apiRepOrt: 'Repère orthonormé',
  apiErase: 'Effacer'

}

export default textesFr
