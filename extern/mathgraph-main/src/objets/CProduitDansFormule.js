/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Complexe from '../types/Complexe'
import { erreurCalculException, getStr, MAX_VALUE, MIN_VALUE } from '../kernel/kernel'
import CCbGlob from '../kernel/CCbGlob'
import CSommeDansFormule from './CSommeDansFormule'
export default CProduitDansFormule

/**
 * Classe représentant un produit indicé dans un arbre binaire de calcul.
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CCb} calculASommer  Le calcul à multiplier
 * @param {CCb} bornea  L'indice de départ.
 * @param {CCb} borneb  L'indice de fin.
 * @param {CCb} pas  Le pas à ajouter à l'indice pour chaque somme (1 la plupart du temps)
 * @param {string} nomVariable  Le nom choisi pour la variable de sommation.
 * @returns {CProduitDansFormule}
 */
function CProduitDansFormule (listeProprietaire, calculASommer, bornea, borneb, pas, nomVariable) {
  if (arguments.length === 1) CSommeDansFormule.call(this, listeProprietaire)
  else CSommeDansFormule.call(this, listeProprietaire, calculASommer, bornea, borneb, pas, nomVariable)
}
CProduitDansFormule.prototype = new CSommeDansFormule()
CProduitDansFormule.prototype.constructor = CProduitDansFormule
CProduitDansFormule.prototype.superClass = 'CSommeDansFormule'
CProduitDansFormule.prototype.className = 'CProduitDansFormule'

CProduitDansFormule.prototype.nature = function () {
  return CCbGlob.natProduitDansFormule
}

CProduitDansFormule.prototype.getClone = function (listeSource, listeCible) {
  return new CProduitDansFormule(listeCible, this.calculASommer.getClone(listeSource, listeCible),
    this.indiceDebut.getClone(listeSource, listeCible), this.indiceFin.getClone(listeSource, listeCible),
    this.pas.getClone(listeSource, listeCible), this.nomVariable)
}

CProduitDansFormule.prototype.getCopie = function () {
  return new CProduitDansFormule(this.listeProprietaire, this.calculASommer.getCopie(), this.indiceDebut.getCopie(),
    this.indiceFin.getCopie(), this.pas.getCopie(), this.nomVariable)
}

CProduitDansFormule.prototype.getCore = function () {
  return new CProduitDansFormule(this.listeProprietaire, this.calculASommer.getCore(), this.indiceDebut.getCore(),
    this.indiceFin.getCore(), this.pas.getCore(), this.nomVariable)
}
/**
 * Fonction renvoyant le résultat réel de la somme indicée
 * Lors du calcul de l'expression à sommer, la valeur de l'indice de sommation est affectée au dernier
 * élément du tableau arrayparam
 * @param {number[]} arrayparam Tableau de paramètres
 * @param {number} inddeb Indice de début de sommation
 * @param {number} indfin Indice de fin de sommation
 * @param {number} pas Valeur du pas de sommation
 * @param {boolean} infoRandom true pour un recalcul des appels à random()
 * @returns {number} La valeur du produit
 */
CProduitDansFormule.prototype.resultatBase = function (arrayparam, inddeb, indfin, pas, infoRandom) {
  const n = arrayparam.length - 1
  this.listeProprietaire.nombreIterations += (indfin - inddeb) / pas
  if (this.listeProprietaire.nombreIterations > CCbGlob.nombreMaxiIterations) throw new Error(erreurCalculException)
  let prod = 1
  for (let i = inddeb; i <= indfin; i += pas) {
    arrayparam[n] = i
    prod *= this.calculASommer.resultatFonction(infoRandom, arrayparam)
  }
  return prod
}
/**
 * Renvoie le résultat réel du produit.
 * @param {boolean} infoRandom  true si les calculs aléatoires doivent être relancés
 * @returns {number}
 */
CProduitDansFormule.prototype.resultat = function (infoRandom) {
  const val = new Array(1)
  const dinddeb = this.indiceDebut.resultat(infoRandom)
  if ((dinddeb > MAX_VALUE) || (dinddeb < MIN_VALUE) || (dinddeb !== Math.floor(dinddeb))) throw new Error(erreurCalculException)
  const dindfin = this.indiceFin.resultat(infoRandom)
  if ((dindfin > MAX_VALUE) || (dindfin < MIN_VALUE) || (dindfin !== Math.floor(dindfin)) ||
      (dindfin < dinddeb)) throw new Error(erreurCalculException)
  const dpas = this.pas.resultat(infoRandom)
  if ((dpas > MAX_VALUE) || (dpas < MIN_VALUE) ||
      (dpas !== Math.floor(dpas)) || (dpas <= 0)) throw new Error(erreurCalculException)
  return this.resultatBase(val, dinddeb, dindfin, dpas, infoRandom)
}
CProduitDansFormule.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  let val, i
  if (valeurParametre instanceof Array) {
    const n = valeurParametre.length
    val = new Array(n + 1)
    for (i = 0; i < n; i++) val[i] = valeurParametre[i]
  } else {
    val = new Array(2)
    val[0] = valeurParametre
  }
  const dinddeb = this.indiceDebut.resultatFonction(infoRandom, valeurParametre)
  if ((dinddeb > MAX_VALUE) || (dinddeb < MIN_VALUE) || (dinddeb !== Math.floor(dinddeb))) throw new Error(erreurCalculException)
  const dindfin = this.indiceFin.resultatFonction(infoRandom, valeurParametre)
  if ((dindfin > MAX_VALUE) || (dindfin < MIN_VALUE) || (dindfin !== Math.floor(dindfin)) ||
    (dindfin < dinddeb)) throw new Error(erreurCalculException)
  const dpas = this.pas.resultatFonction(infoRandom, valeurParametre)
  if ((dpas > MAX_VALUE) || (dpas < MIN_VALUE) ||
    (dpas !== Math.floor(dpas)) || (dpas <= 0)) throw new Error(erreurCalculException)
  return this.resultatBase(val, dinddeb, dindfin, dpas, infoRandom)
}
/**
 * @typedef ParamComplexe
 * @property {number} x
 * @property {number} y
 */
/**
 * Fonction renvoyant dans le complexe zRes le résultat du produit complexe indicé
 * Lors du calcul de l'expression à sommer, la valeur de l'indice de sommation est affectée au dernier
 * élément du tableau arrayparam (sous forme d'un complexe)
 * @param {ParamComplexe[]} arrayparam le tableau de paramètres complexes
 * @param {number} inddeb L'indice de début
 * @param {number} indfin L'indice de fin
 * @param {number} pas La valeur du pas
 * @param {boolean} infoRandom true pour un recalcul des appels de random()
 * @param {Complexe} zRes Le complexe dans lequel est revoyé le résultat
 */
CProduitDansFormule.prototype.resultatComplexeBase = function (arrayparam, inddeb, indfin, pas, infoRandom, zRes) {
  const n = arrayparam.length - 1
  this.listeProprietaire.nombreIterations += (indfin - inddeb) / pas
  if (this.listeProprietaire.nombreIterations > CCbGlob.nombreMaxiIterations) throw new Error(erreurCalculException)
  zRes.x = 1
  zRes.y = 0
  const z = new Complexe()
  for (let i = inddeb; i <= indfin; i += pas) {
    arrayparam[n].x = i
    arrayparam[n].y = 0
    this.calculASommer.resultatFonctionComplexe(infoRandom, arrayparam, z)
    zRes.produitComp(z, zRes)
  }
}
/**
 * Renvoie le résultat complexe du produit dans le complee zres.
 * @param {boolean} infoRandom  true si les calculs aléatoires doivent être relancés
 * @param {Complexe} zRes
 * @returns {void}
 */
CProduitDansFormule.prototype.resultatComplexe = function (infoRandom, zRes) {
  const val = new Array(1)
  val[0] = new Complexe()
  const inddeb = new Complexe()
  this.indiceDebut.resultatComplexe(infoRandom, inddeb)
  if (inddeb.y !== 0) throw new Error(erreurCalculException)
  const dinddeb = inddeb.x
  if ((dinddeb > MAX_VALUE) || (dinddeb < MIN_VALUE) || (dinddeb !== Math.floor(dinddeb))) throw new Error(erreurCalculException)
  const indfin = new Complexe()
  this.indiceFin.resultatComplexe(infoRandom, indfin)
  if (indfin.y !== 0) throw Error(erreurCalculException)
  const dindfin = indfin.x
  if ((dindfin > MAX_VALUE) || (dindfin < MIN_VALUE) || (dindfin !== Math.floor(dindfin)) ||
      (dindfin < dinddeb)) throw new Error(erreurCalculException)
  const valpas = new Complexe()
  this.pas.resultatComplexe(infoRandom, valpas)
  if (valpas.y !== 0) throw new Error(erreurCalculException)
  const dpas = valpas.x
  if ((dpas > MAX_VALUE) || (dpas < MIN_VALUE) ||
      (dpas !== Math.floor(dpas)) || (dpas <= 0)) throw new Error(erreurCalculException)
  this.resultatComplexeBase(val, dinddeb, dindfin, dpas, infoRandom, zRes)
}

CProduitDansFormule.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
  let i, val
  if (valeurParametre instanceof Array) {
    const n = valeurParametre.length
    val = new Array(n + 1)
    for (i = 0; i < n; i++) val[i] = new Complexe(valeurParametre[i])
    val[n] = new Complexe()
  } else {
    val = new Array(2)
    val[0] = valeurParametre
    val[1] = new Complexe()
  }
  const inddeb = new Complexe()
  this.indiceDebut.resultatFonctionComplexe(infoRandom, valeurParametre, inddeb)
  if (inddeb.y !== 0) throw new Error(erreurCalculException)
  const dinddeb = inddeb.x
  if ((dinddeb > MAX_VALUE) || (dinddeb < MIN_VALUE) || (dinddeb !== Math.floor(dinddeb))) throw new Error(erreurCalculException)
  const indfin = new Complexe()
  this.indiceFin.resultatFonctionComplexe(infoRandom, valeurParametre, indfin)
  if (indfin.y !== 0) throw new Error(erreurCalculException)
  const dindfin = indfin.x
  if ((dindfin > MAX_VALUE) || (dindfin < MIN_VALUE) || (dindfin !== Math.floor(dindfin)) ||
      (dindfin < dinddeb)) throw new Error(erreurCalculException)
  const valpas = new Complexe()
  this.pas.resultatFonctionComplexe(infoRandom, valeurParametre, valpas)
  if (valpas.y !== 0) throw new Error(erreurCalculException)
  const dpas = valpas.x
  if ((dpas > MAX_VALUE) || (dpas < MIN_VALUE) ||
      (dpas !== Math.floor(dpas)) || (dpas <= 0)) throw new Error(erreurCalculException)
  this.resultatComplexeBase(val, dinddeb, dindfin, dpas, infoRandom, zRes)
}

CProduitDansFormule.prototype.chaineCalcul = function (varFor = null) {
  let varFor2, i
  let n = 0
  if (varFor === null) varFor2 = new Array(1)
  else {
    n = varFor.length
    varFor2 = new Array(n + 1)
  }
  for (i = 0; i < n; i++) varFor2[i] = varFor[i]
  varFor2[n] = this.nomVariable
  return getStr('produit') + '(' + this.calculASommer.chaineCalculSansPar(varFor2) + ',' +
    this.nomVariable + ',' + this.indiceDebut.chaineCalculSansPar(varFor) + ',' +
    this.indiceFin.chaineCalculSansPar(varFor) + ',' + this.pas.chaineCalculSansPar(varFor) + ')'
}

CProduitDansFormule.prototype.chaineLatex = function (varFor, fracSimple = false) {
  let varFor2, i, up
  let n = 0
  if (varFor === null) varFor2 = new Array(1)
  else {
    n = varFor.length
    varFor2 = new Array(n + 1)
  }
  for (i = 0; i < n; i++) varFor2[i] = varFor[i]
  varFor2[n] = this.nomVariable
  // Deuxième paramètre de chaineLatexSansPar à true dans les bornes pour utilier \frac dedans et pas \dfrac
  up = ''
  if (this.pas.nature() === CCbGlob.natConstante) {
    if (this.pas.valeur === 1) up = this.indiceFin.chaineLatexSansPar(varFor, true)
  }
  if (up === '') {
    up = this.indiceFin.chaineLatexSansPar(varFor, true) + '\\text{ ' + getStr('step') + ' }' +
      this.pas.chaineLatex(varFor, true)
  }
  return '\\prod\\limits_{' + this.nomVariable + '=' + this.indiceDebut.chaineLatexSansPar(varFor, true) + '}' + '^{' + up + '}' +
    '{' + this.calculASommer.chaineLatex(varFor2, fracSimple) + '}'
}

CProduitDansFormule.prototype.calculAvecValeursRemplacees = function (bfrac) {
  return new CProduitDansFormule(this.listeProprietaire, this.calculASommer.calculAvecValeursRemplacees(bfrac),
    this.indiceDebut.calculAvecValeursRemplacees(bfrac), this.indiceFin.calculAvecValeursRemplacees(bfrac),
    this.pas.calculAvecValeursRemplacees(bfrac), this.nomVariable)
}

CProduitDansFormule.prototype.deriveePossible = function (indiceVariable) {
  return !this.calculASommer.dependDeVariable(indiceVariable) &&
    !this.indiceDebut.dependDeVariable(indiceVariable) && !this.indiceFin.dependDeVariable(indiceVariable) &&
    !this.pas.dependDeVariable(indiceVariable)
}
