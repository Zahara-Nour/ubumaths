/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Complexe from '../types/Complexe'
import Ope from '../types/Ope'
import { erreurCalculException, getStr } from '../kernel/kernel'
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'
export default CIntegraleDansFormule

/**
 * Classe représentant, dans un arbre binaire de calcul, le calcul approché
 * d'une intégrale par la méthode de Simpson.
 * C'est la seule fonction intégrée de MathGraph32 à 4 variables.
 * La syntaxe est integrale(f,parametre,a,b)
 * où f est la formule à intégrer (fonction de parametre),
 * parametre est la variable d'intégration,
 * a la borne inférieure d'intégration,
 * b la borne supérieure d'intégration.
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CCb} calculASommer  la formule de la fonction à intégrer.
 * @param {CCb} bornea  La borne inférieure d'intégration.
 * @param {CCb} borneb  La borne supérieure d'intégration.
 * @param {string} nomVariable  Le nom de la variable d'intégration.
 * @returns {CIntegraleDansFormule}
 */
function CIntegraleDansFormule (listeProprietaire, calculASommer, bornea, borneb,
  nomVariable) {
  CCb.call(this, listeProprietaire)
  if (arguments.length !== 1) {
    this.calculASommer = calculASommer
    this.bornea = bornea
    this.borneb = borneb
    this.nomVariable = nomVariable
  }
}

CIntegraleDansFormule.prototype = new CCb()
CIntegraleDansFormule.prototype.constructor = CIntegraleDansFormule
CIntegraleDansFormule.prototype.superClass = 'CCb'
CIntegraleDansFormule.prototype.className = 'CIntegraleDansFormule'

CIntegraleDansFormule.prototype.nature = function () {
  return CCbGlob.natIntegraleDansFormule
}

CIntegraleDansFormule.prototype.dependDeVariable = function (ind) {
  return this.calculASommer.dependDeVariable(ind) || this.bornea.dependDeVariable(ind) ||
    this.borneb.dependDeVariable(ind)
}

CIntegraleDansFormule.prototype.getClone = function (listeSource, listeCible) {
  return new CIntegraleDansFormule(listeCible, this.calculASommer.getClone(listeSource, listeCible),
    this.bornea.getClone(listeSource, listeCible), this.borneb.getClone(listeSource, listeCible),
    this.nomVariable)
}

CIntegraleDansFormule.prototype.getCopie = function () {
  return new CIntegraleDansFormule(this.listeProprietaire, this.calculASommer.getCopie(), this.bornea.getCopie(),
    this.borneb.getCopie(), this.nomVariable)
}

CIntegraleDansFormule.prototype.getCore = function () {
  return new CIntegraleDansFormule(this.listeProprietaire, this.calculASommer.getCore(), this.bornea.getCore(),
    this.borneb.getCore(), this.nomVariable)
}

CIntegraleDansFormule.prototype.initialisePourDependance = function () {
  CCb.prototype.initialisePourDependance.call(this)
  this.calculASommer.initialisePourDependance()
  this.bornea.initialisePourDependance()
  this.borneb.initialisePourDependance()
}

CIntegraleDansFormule.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCb.prototype.depDe.call(this, p) ||
    this.calculASommer.depDe(p) || this.bornea.depDe(p) || this.borneb.depDe(p))
}

CIntegraleDansFormule.prototype.dependDePourBoucle = function (p) {
  return this.calculASommer.dependDePourBoucle(p) || this.bornea.dependDePourBoucle(p) ||
  this.borneb.dependDePourBoucle(p)
}

CIntegraleDansFormule.prototype.existe = function () {
  return this.calculASommer.existe() && this.bornea.existe() && this.borneb.existe()
}

CIntegraleDansFormule.prototype.estConstant = function () {
  return this.calculASommer.estConstant() && this.bornea.estConstant() && this.borneb.estConstant()
}

CIntegraleDansFormule.prototype.resultat = function (infoRandom) {
  this.listeProprietaire.nombreIterations += CCbGlob.nombreSubdivisionsPourSimpson
  if (this.listeProprietaire.nombreIterations > CCbGlob.nombreMaxiIterations) throw new Error(erreurCalculException)
  // double[] val = new double[1];
  const val = new Array(1)
  const dbornea = this.bornea.resultat(infoRandom)
  const dborneb = this.borneb.resultat(infoRandom)
  return CCbGlob.integrale(this.calculASommer, val, dbornea, dborneb, infoRandom)
}

CIntegraleDansFormule.prototype.resultatComplexe = function (infoRandom, zRes) {
  this.listeProprietaire.nombreIterations += CCbGlob.nombreSubdivisionsPourSimpson
  if (this.listeProprietaire.nombreIterations > CCbGlob.nombreMaxiIterations) throw new Error(erreurCalculException)
  const val = new Array(1)
  const cbornea = new Complexe()
  this.bornea.resultatComplexe(infoRandom, cbornea)
  if (cbornea.y !== 0) throw new Error(erreurCalculException)
  const dbornea = cbornea.x
  const cborneb = new Complexe()
  this.borneb.resultatComplexe(infoRandom, cborneb)
  if (cborneb.y !== 0) throw new Error(erreurCalculException)
  const dborneb = cborneb.x
  zRes.y = 0
  zRes.x = CCbGlob.integrale(this.calculASommer, val, dbornea, dborneb, infoRandom)
}

CIntegraleDansFormule.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  let val
  this.listeProprietaire.nombreIterations += CCbGlob.nombreSubdivisionsPourSimpson
  if (this.listeProprietaire.nombreIterations > CCbGlob.nombreMaxiIterations) throw new Error(erreurCalculException)
  const dbornea = this.bornea.resultatFonction(infoRandom, valeurParametre)
  const dborneb = this.borneb.resultatFonction(infoRandom, valeurParametre)
  if (valeurParametre instanceof Array) {
    const n = valeurParametre.length
    val = new Array(n + 1)
    for (let i = 0; i < n; i++) val[i] = valeurParametre[i]
  } else {
    val = new Array(2)
    val[0] = valeurParametre
  }
  return CCbGlob.integrale(this.calculASommer, val, dbornea, dborneb, infoRandom)
}

CIntegraleDansFormule.prototype.chaineCalcul = function (varFor = null) {
  let varFor2
  let n = 0
  if (varFor === null) varFor2 = new Array(1)
  else {
    n = varFor.length
    varFor2 = new Array(n + 1)
  }
  for (let i = 0; i < n; i++) varFor2[i] = varFor[i]
  varFor2[n] = this.nomVariable
  return getStr('integrale') + '(' + this.calculASommer.chaineCalculSansPar(varFor2) + ',' +
  this.nomVariable + ',' + this.bornea.chaineCalculSansPar(varFor) + ',' +
  this.borneb.chaineCalculSansPar(varFor) + ')'
}

CIntegraleDansFormule.prototype.chaineLatex = function (varFor, fracSimple = false) {
  let varFor2, ch
  let n = 0
  if (varFor === null) varFor2 = new Array(1)
  else {
    n = varFor.length
    varFor2 = new Array(n + 1)
  }
  for (let i = 0; i < n; i++) varFor2[i] = varFor[i]
  varFor2[n] = this.nomVariable
  const nat = this.calculASommer.nature()
  if (nat === CCbGlob.natOperation) {
    if ((this.calculASommer.ope === Ope.Plus) ||
      (this.calculASommer.ope === Ope.Moin)) ch = this.calculASommer.chaineLatex(varFor2, fracSimple)
    else ch = this.calculASommer.chaineLatexSansPar(varFor2, fracSimple)
  } else ch = this.calculASommer.chaineLatexSansPar(varFor2, fracSimple)
  // Deuxième paramètre de chaineLatexSansPar à true pour ne pas utiliser \dfrac mais \frac dans les bornes
  return '\\int_{' + this.bornea.chaineLatexSansPar(varFor, true) + '}' + '^{' +
    this.borneb.chaineLatexSansPar(varFor, true) + '}' +
    ch + 'd' + varFor2[varFor2.length - 1]
}

CIntegraleDansFormule.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  this.nomVariable = inps.readUTF()
  this.calculASommer = inps.readObject(list)
  this.bornea = inps.readObject(list)
  this.borneb = inps.readObject(list)
}

CIntegraleDansFormule.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  oups.writeUTF(this.nomVariable)
  oups.writeObject(this.calculASommer)
  oups.writeObject(this.bornea)
  oups.writeObject(this.borneb)
}

CIntegraleDansFormule.prototype.deriveePossible = function (indiceVariable) {
  return !this.calculASommer.dependDeVariable(indiceVariable) && !this.bornea.dependDeVariable(indiceVariable) &&
  !this.borneb.dependDeVariable(indiceVariable)
}

CIntegraleDansFormule.prototype.calculAvecValeursRemplacees = function (bfrac) {
  return new CIntegraleDansFormule(this.listeProprietaire, this.calculASommer.calculAvecValeursRemplacees(bfrac),
    this.bornea.calculAvecValeursRemplacees(bfrac), this.borneb.calculAvecValeursRemplacees(bfrac),
    this.nomVariable)
}

// Ajouté version 6.4.7
CIntegraleDansFormule.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac, eliminMult1 = true) {
  const calculASommer = this.calculASommer.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  const bornea = this.bornea.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  const borneb = this.borneb.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  return new CIntegraleDansFormule(this.listeProprietaire, calculASommer, bornea, borneb, this.nomVariable)
}
