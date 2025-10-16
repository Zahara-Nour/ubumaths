/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

/**
 * Contient les textes utilisés dans le logiciel en langue Allemande
 * @type {Textes}
 * @private
 */
const textesDe = {
  step: 'Schritt',
  var1: 'Änderung des Wertes der Variable ',
  var2: 'Geben Sie einen Wert zwischen ',
  et: ' und ',
  invalidEntry: 'Ungültige Eingabe',
  // Chaînes servant suivant la langue à reconstruire les formules mathématiques
  abs: 'abs',
  intgr: 'int',
  sqrt: 'sqrt',
  rac: 'wurzel',
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
  conj: 'konj',
  arg: 'arg',
  re: 're',
  im: 'im',
  maxi: 'max',
  mini: 'min',
  gcd: 'ggt',
  lcm: 'kgv',
  ncr: 'nCr',
  npr: 'nPr',
  mod: 'mod',
  si: 'if',
  integrale: 'integral',
  primitive: 'stammfunktion',
  fact: 'fakt',
  somme: 'summe',
  produit: 'produkt',
  left: 'links',
  right: 'rechts',
  core: 'kern',
  transp: 'transp',
  deter: 'deter', // ne pas modifier (ignoré, mais doit être dans cette liste)
  dotmult: 'dotmult',
  inv: 'inv',
  frac: 'bruch',
  nbcol: 'nbcol', // ne pas modifier (ignoré, mais doit être dans cette liste)
  nbrow: 'nbrow', // ne pas modifier (ignoré, mais doit être dans cette liste)
  divmaxp: 'divmaxp', // Ajout version 7.0
  sortbyrow: 'sortbyrow', // Ajout version 7.2
  sortbycol: 'sortbycol', // Ajout version 7.2
  apiCodeInfo1: 'Sie haben Zugriff auf alle Methoden des mathgraph-Objekts&nbsp;:<br> siehe <a href="https://www.mathgraph32.org/documentation/full/MtgApi.html" target="doc">Dokumentation</a><br>Die Schaltfläche Ausführen führt Ihre Befehle auf der Figur aus.',
  apiCodeInfo2: 'Codebeispiel:',
  apiCodeOutput: 'Ausführungsergebnis:',
  apiCodeReset: 'Zurücksetzen',
  apiCodeResetEx: 'Mit Beispiel 1 zurücksetzen',
  apiCodeResetInitConfirm: 'Sind Sie sicher, dass Sie den gesamten Python-Code durch den Startcode ersetzen möchten?',
  apiCodeResetExConfirm: 'Sind Sie sicher, dass Sie den gesamten Python-Code durch Beispiel 1 ersetzen möchten?',
  apiCodeResetConfirm: 'Sind Sie sicher, dass Sie den gesamten Python-Code löschen möchten?',
  apiCodeExec: 'Ausführen',
  apiCodeDownload: 'Figur herunterladen',
  apiCodeDisplay: 'Figurcode anzeigen',
  apiCodeCopy: 'Figurcode kopieren',
  apiCodeClipboardOk: 'Der Base64-Code der Figur wurde in die Zwischenablage kopiert',
  apiCodeClipboardKo: 'Das Kopieren in die Zwischenablage ist fehlgeschlagen',
  apiCodeImport: 'Importieren',
  apiCodeInfoPaste: 'Fügen Sie unten den Base64-Code der anzuzeigenden Figur ein.',
  apiCodeInfoCopy: 'Kopieren Sie den Code unten, um den Base64-Code dieser Figur zu erhalten.',
  apiCodeResetWith: 'Figur zurücksetzen mit:',
  apiStartFig: 'Ausgangsfigur',
  apiFigInit: 'Anfangsfigur',
  apiFigEmpty: 'Leere Figur',
  apiRepOrt: 'Orthonormales Koordinatensystem',
  apiErase: 'Löschen'
}

export default textesDe
