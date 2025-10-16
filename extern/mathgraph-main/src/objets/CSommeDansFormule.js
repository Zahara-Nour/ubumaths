/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Complexe from '../types/Complexe'
import { erreurCalculException, getStr, MAX_VALUE, MIN_VALUE } from '../kernel/kernel'
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'
export default CSommeDansFormule

/**
 * Classe représentant une somme indicée dans un arbre binaire de calcul.
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CCb} calculASommer  Le calcul à sommer.
 * @param {CCb} indiceDebut  L'indice de départ.
 * @param {CCb} indiceFin  L'indice de fin.
 * @param {CCb} pas  Le pas à ajouter à l'indice pour chaque somme (1 la plupart du temps)
 * @param {string} nomVariable  Le nom choisi pour la variable de sommation.
 * @returns {CSommeDansFormule}
 */
function CSommeDansFormule (listeProprietaire, calculASommer, indiceDebut, indiceFin,
  pas, nomVariable) {
  if (arguments.length === 1) CCb.call(this, listeProprietaire)
  else {
    CCb.call(this, listeProprietaire)
    this.calculASommer = calculASommer
    this.indiceDebut = indiceDebut
    this.indiceFin = indiceFin
    this.pas = pas
    this.nomVariable = nomVariable
  }
}
CSommeDansFormule.prototype = new CCb()
CSommeDansFormule.prototype.constructor = CSommeDansFormule
CSommeDansFormule.prototype.superClass = 'CCb'
CSommeDansFormule.prototype.className = 'CSommeDansFormule'

CSommeDansFormule.prototype.nature = function () {
  return CCbGlob.natSommeDansFormule
}

CSommeDansFormule.prototype.dependDeVariable = function (ind) {
  return this.calculASommer.dependDeVariable(ind) || this.indiceDebut.dependDeVariable(ind) ||
    this.indiceFin.dependDeVariable(ind) || this.pas.dependDeVariable(ind)
}

CSommeDansFormule.prototype.getClone = function (listeSource, listeCible) {
  return new CSommeDansFormule(listeCible, this.calculASommer.getClone(listeSource, listeCible),
    this.indiceDebut.getClone(listeSource, listeCible), this.indiceFin.getClone(listeSource, listeCible),
    this.pas.getClone(listeSource, listeCible), this.nomVariable)
}

CSommeDansFormule.prototype.getCopie = function () {
  return new CSommeDansFormule(this.listeProprietaire, this.calculASommer.getCopie(), this.indiceDebut.getCopie(),
    this.indiceFin.getCopie(), this.pas.getCopie(), this.nomVariable)
}

CSommeDansFormule.prototype.getCore = function () {
  return new CSommeDansFormule(this.listeProprietaire, this.calculASommer.getCore(), this.indiceDebut.getCore(),
    this.indiceFin.getCore(), this.pas.getCore(), this.nomVariable)
}

CSommeDansFormule.prototype.initialisePourDependance = function () {
  CCb.prototype.initialisePourDependance.call(this)
  this.calculASommer.initialisePourDependance()
  this.indiceDebut.initialisePourDependance()
  this.indiceFin.initialisePourDependance()
  this.pas.initialisePourDependance()
}

CSommeDansFormule.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCb.prototype.depDe.call(this, p) ||
    this.calculASommer.depDe(p) || this.indiceDebut.depDe(p) || this.indiceFin.depDe(p) || this.pas.depDe(p))
}

CSommeDansFormule.prototype.dependDePourBoucle = function (p) {
  return this.calculASommer.dependDePourBoucle(p) || this.indiceDebut.dependDePourBoucle(p) ||
  this.indiceFin.dependDePourBoucle(p) || this.pas.dependDePourBoucle(p)
}

CSommeDansFormule.prototype.existe = function () {
  return this.calculASommer.existe() && this.indiceDebut.existe() &&
    this.indiceFin.existe() && this.pas.existe()
}

CSommeDansFormule.prototype.estConstant = function () {
  return this.calculASommer.estConstant() && this.indiceDebut.estConstant() &&
    this.indiceFin.estConstant() && this.pas.estConstant()
}

/**
 * Fonction renvoyant le résultat réel de la somme indicée
 * Lors du calcul de l'expression à sommer, la valeur de l'indice de sommation est affectée au dernier
 * élément du tableau arrayparam
 * @param {number[]} arrayparam  le tableau de paramètres à passer en paramètre lors de l'appel de résultat fonction
 * @param {number} inddeb L'indice de début
 * @param {number} indfin L'indice de fin
 * @param {number} pas La valeur du pas
 * @param {boolean} infoRandom true pour un recalcul des apples de random()
 * @returns {number}
 */
CSommeDansFormule.prototype.resultatBase = function (arrayparam, inddeb, indfin, pas, infoRandom) {
  const n = arrayparam.length - 1
  this.listeProprietaire.nombreIterations += (indfin - inddeb) / pas
  if (this.listeProprietaire.nombreIterations > CCbGlob.nombreMaxiIterations) throw new Error(erreurCalculException)
  let somme = 0
  for (let i = inddeb; i <= indfin; i += pas) {
    arrayparam[n] = i
    somme += this.calculASommer.resultatFonction(infoRandom, arrayparam)
  }
  return somme
}

/**
 * Renvoie le résultat réel de la somme.
 * @param {boolean} infoRandom  true si les calculs aléatoires doivent être relancés
 * @returns {number}
 */
CSommeDansFormule.prototype.resultat = function (infoRandom) {
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

/**
 * Fonction renvoyant dans le complexe zRes le résultat de la somme complexe indicée
 * Lors du calcul de l'expression à sommer, la valeur de l'indice de sommation est affectée au dernier
 * élément du tableau arrayparam (sous forme d'un complexe)
 * @param {ParamComplexe[]} arrayparam le tableau de paramètres complexes
 * @param {number} inddeb L'indice de début
 * @param {number} indfin L'indice de fin
 * @param {number} pas La valeur du pas
 * @param {boolean} infoRandom true pour un recalcul des appels de random()
 * @param {Complexe} zRes Le complexe dans lequel est revoyé le résultat
 */
CSommeDansFormule.prototype.resultatComplexeBase = function (arrayparam, inddeb, indfin, pas, infoRandom, zRes) {
  const n = arrayparam.length - 1
  this.listeProprietaire.nombreIterations += (indfin - inddeb) / pas
  if (this.listeProprietaire.nombreIterations > CCbGlob.nombreMaxiIterations) throw new Error(erreurCalculException)
  zRes.x = 0
  zRes.y = 0
  const z = new Complexe(0, 0)
  for (let i = inddeb; i <= indfin; i += pas) {
    arrayparam[n].x = i
    arrayparam[n].y = 0
    this.calculASommer.resultatFonctionComplexe(infoRandom, arrayparam, z)
    zRes.x += z.x
    zRes.y += z.y
  }
}

CSommeDansFormule.prototype.resultatFonction = function (infoRandom, valeurParametre) {
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
 * Renvoie le résultat complexe de la somme.
 * @param {boolean} infoRandom  true si les calculs aléatoires doivent être relancés
 * @param {Complexe} zRes  Le complee contenant le résultatde la somme au retour.
 * @returns {void}
 */
CSommeDansFormule.prototype.resultatComplexe = function (infoRandom, zRes) {
  const val = new Array(1)
  val[0] = new Complexe()
  const inddeb = new Complexe()
  this.indiceDebut.resultatComplexe(infoRandom, inddeb)
  if (inddeb.y !== 0) throw new Error(erreurCalculException())
  const dinddeb = inddeb.x
  if ((dinddeb > MAX_VALUE) || (dinddeb < MIN_VALUE) || (dinddeb !== Math.floor(dinddeb))) throw new Error(erreurCalculException)
  const indfin = new Complexe()
  this.indiceFin.resultatComplexe(infoRandom, indfin)
  if (indfin.y !== 0) throw new Error(erreurCalculException)
  const dindfin = indfin.x
  if ((dindfin > MAX_VALUE) || (dindfin < MIN_VALUE) || (dindfin !== Math.floor(dindfin)) ||
    (dindfin < dinddeb)) throw Error(erreurCalculException)
  const valpas = new Complexe()
  this.pas.resultatComplexe(infoRandom, valpas)
  if (valpas.y !== 0) throw new Error(erreurCalculException)
  const dpas = valpas.x
  if ((dpas > MAX_VALUE) || (dpas < MIN_VALUE) ||
    (dpas !== Math.floor(dpas)) || (dpas <= 0)) throw new Error(erreurCalculException)
  this.resultatComplexeBase(val, dinddeb, dindfin, dpas, infoRandom, zRes)
}

CSommeDansFormule.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
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

CSommeDansFormule.prototype.chaineCalcul = function (varFor = null) {
  let varFor2, i
  let n = 0
  if (varFor === null) varFor2 = new Array(1)
  else {
    n = varFor.length
    varFor2 = new Array(n + 1)
  }
  for (i = 0; i < n; i++) varFor2[i] = varFor[i]
  varFor2[n] = this.nomVariable
  return getStr('somme') + '(' + this.calculASommer.chaineCalculSansPar(varFor2) + ',' +
    this.nomVariable + ',' + this.indiceDebut.chaineCalculSansPar(varFor) + ',' +
    this.indiceFin.chaineCalculSansPar(varFor) + ',' + this.pas.chaineCalculSansPar(varFor) + ')'
}

CSommeDansFormule.prototype.chaineLatex = function (varFor, fracSimple = false) {
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
  if (up === '') up = this.indiceFin.chaineLatexSansPar(varFor, true) + '\\text{ ' + getStr('step') + ' }' + this.pas.chaineLatex(varFor, true)
  return '\\sum\\limits_{' + this.nomVariable + '=' + this.indiceDebut.chaineLatexSansPar(varFor, true) + '}' +
    '^{' + up + '}' + '{' + this.calculASommer.chaineLatex(varFor2, fracSimple) + '}'
}
CSommeDansFormule.prototype.calculAvecValeursRemplacees = function (bfrac) {
  return new CSommeDansFormule(this.listeProprietaire, this.calculASommer.calculAvecValeursRemplacees(bfrac),
    this.indiceDebut.calculAvecValeursRemplacees(bfrac), this.indiceFin.calculAvecValeursRemplacees(bfrac),
    this.pas.calculAvecValeursRemplacees(bfrac), this.nomVariable)
}
CSommeDansFormule.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  this.nomVariable = inps.readUTF()
  this.calculASommer = inps.readObject(list)
  this.indiceDebut = inps.readObject(list)
  this.indiceFin = inps.readObject(list)
  this.pas = inps.readObject(list)
}

CSommeDansFormule.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  oups.writeUTF(this.nomVariable)
  oups.writeObject(this.calculASommer)
  oups.writeObject(this.indiceDebut)
  oups.writeObject(this.indiceFin)
  oups.writeObject(this.pas)
}
