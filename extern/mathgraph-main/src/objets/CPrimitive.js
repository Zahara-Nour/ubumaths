/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Complexe from '../types/Complexe'
import { erreurCalculException, getStr } from '../kernel/kernel'
import CIntegraleDansFormule from './CIntegraleDansFormule'
import CCbGlob from '../kernel/CCbGlob'
export default CPrimitive

/**
 * Classe représentant, dans un arbre binaire de calcul, le calcul de la différence entre deux images
 * de deux nombres par une fonction dont la formule est passée en paramètre
 * Sert pour le calcul de primitives dans les exercices j3p
 * C'est la seule fonction intégrée de MathGraph32 à 4 variables.
 * La syntaxe est primitive(f,parametre,a,b)
 * où f est la formule à intégrer (fonction de parametre),
 * parametre est la variable d'intégration,
 * a la borne inférieure
 * b la borne supérieure.
 * Renvoie la valeur de f(b)-f(a)
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CCb} calculASommer  la formule de la fonction .
 * @param {CCb} bornea  La borne inférieure.
 * @param {CCb} borneb  La borne supérieure.
 * @param {string} nomVariable  Le nom de la variable pour la formule de f.
 * @returns {CPrimitive}
 */
function CPrimitive (listeProprietaire, calculASommer, bornea, borneb,
  nomVariable) {
  CIntegraleDansFormule.call(this, listeProprietaire, calculASommer, bornea, borneb, nomVariable)
}

CPrimitive.prototype = new CIntegraleDansFormule()
CPrimitive.prototype.constructor = CPrimitive
CPrimitive.prototype.superClass = 'CIntegraleDansFormule'
CPrimitive.prototype.className = 'CPrimitive'

CPrimitive.prototype.nature = function () {
  return CCbGlob.natIntegraleDansFormule
}

CPrimitive.prototype.getClone = function (listeSource, listeCible) {
  return new CPrimitive(listeCible, this.calculASommer.getClone(listeSource, listeCible),
    this.bornea.getClone(listeSource, listeCible), this.borneb.getClone(listeSource, listeCible),
    this.nomVariable)
}

CPrimitive.prototype.getCopie = function () {
  return new CPrimitive(this.listeProprietaire, this.calculASommer.getCopie(), this.bornea.getCopie(),
    this.borneb.getCopie(), this.nomVariable)
}

CPrimitive.prototype.getCore = function () {
  return new CPrimitive(this.listeProprietaire, this.calculASommer.getCore(), this.bornea.getCore(),
    this.borneb.getCore(), this.nomVariable)
}

CPrimitive.prototype.estConstant = function () {
  return this.calculASommer.estConstant() && this.bornea.estConstant() && this.borneb.estConstant()
}

CPrimitive.prototype.resultat = function (infoRandom) {
  const bornea = this.bornea.resultat(infoRandom)
  const borneb = this.borneb.resultat(infoRandom)
  const f = this.calculASommer
  return f.resultatFonction(infoRandom, borneb) - f.resultatFonction(infoRandom, bornea)
}

CPrimitive.prototype.resultatComplexe = function (infoRandom, zRes) {
  const cbornea = new Complexe()
  this.bornea.resultatComplexe(infoRandom, cbornea)
  if (cbornea.y !== 0) throw new Error(erreurCalculException)
  const dbornea = cbornea.x
  const cborneb = new Complexe()
  this.borneb.resultatComplexe(infoRandom, cborneb)
  if (cborneb.y !== 0) throw new Error(erreurCalculException)
  const dborneb = cborneb.x
  const f = this.calculASommer
  zRes.y = 0
  zRes.x = f.resultatFonction(infoRandom, dborneb) - f.resultatFonction(infoRandom, dbornea)
}

CPrimitive.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  let i, n, val
  this.listeProprietaire.nombreIterations += CCbGlob.nombreSubdivisionsPourSimpson
  if (this.listeProprietaire.nombreIterations > CCbGlob.nombreMaxiIterations) throw new Error(erreurCalculException)
  const dbornea = this.bornea.resultatFonction(infoRandom, valeurParametre)
  const dborneb = this.borneb.resultatFonction(infoRandom, valeurParametre)
  // Attention : La fonction à utiliser utilise un paramètre supplémentaire. Pour calculer uen image il faut passer
  // comme argument un tableau identique à valeurParamètre en rajoutant comme dernier élément la valeur à calculer.
  if (valeurParametre instanceof Array) {
    n = valeurParametre.length
    val = new Array(n + 1)
    for (i = 0; i < n; i++) val[i] = valeurParametre[i]
  } else {
    val = new Array(2)
    val[0] = valeurParametre
  }
  const f = this.calculASommer
  val[val.length - 1] = dborneb
  const imb = f.resultatFonction(infoRandom, val)
  val[val.length - 1] = dbornea
  const ima = f.resultatFonction(infoRandom, val)
  return imb - ima
}

CPrimitive.prototype.chaineCalcul = function (varFor = null) {
  let varFor2
  let n = 0
  if (varFor === null) varFor2 = new Array(1)
  else {
    n = varFor.length
    varFor2 = new Array(n + 1)
  }
  for (let i = 0; i < n; i++) varFor2[i] = varFor[i]
  varFor2[n] = this.nomVariable
  return getStr('primitive') + '(' + this.calculASommer.chaineCalculSansPar(varFor2) + ',' +
    this.nomVariable + ',' + this.bornea.chaineCalculSansPar(varFor) + ',' +
    this.borneb.chaineCalculSansPar(varFor) + ')'
}

CPrimitive.prototype.chaineLatex = function (varFor, fracSimple = false) {
  let varFor2
  let n = 0
  if (varFor === null) varFor2 = new Array(1)
  else {
    n = varFor.length
    varFor2 = new Array(n + 1)
  }
  for (let i = 0; i < n; i++) varFor2[i] = varFor[i]
  varFor2[n] = this.nomVariable
  // String ch = calculASommer.chaineLatexSansPar(varFor2) + "d" + varFor2;
  return '\\left[' + this.calculASommer.chaineLatexSansPar(varFor2, fracSimple) +
    '\\right]' + '_{' + this.bornea.chaineLatexSansPar(varFor, true) + '}' +
    '^{' + this.borneb.chaineLatexSansPar(varFor, true) + '}'
}

CPrimitive.prototype.deriveePossible = function (indiceVariable) {
  return true
}

CPrimitive.prototype.calculAvecValeursRemplacees = function (bfrac) {
  return new CPrimitive(this.listeProprietaire, this.calculASommer.calculAvecValeursRemplacees(bfrac),
    this.bornea.calculAvecValeursRemplacees(bfrac), this.borneb.calculAvecValeursRemplacees(bfrac),
    this.nomVariable)
}

// Créé version 6.4.7
CPrimitive.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac, eliminMult1 = true) {
  const calculASommer = this.calculASommer.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  const bornea = this.bornea.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  const borneb = this.borneb.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  return new CPrimitive(this.listeProprietaire, calculASommer, bornea, borneb, this.nomVariable)
}
