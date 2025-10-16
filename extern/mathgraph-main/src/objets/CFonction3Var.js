/**
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Complexe from '../types/Complexe'
import { erreurCalculException, getStr } from '../kernel/kernel'
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'
export default CFonction3Var

/**
 * Classe représentant dans un arbre binaire de calcul un appel de fonction
 * prédéfinie à trois variables : la seule fonction est si
 * dont la syntaxe est si(test, valeursivari, valeursifaux)
 * Si test vaux 1, renvoie valeursivari et sinon valeur si faux.
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire La liste proprétaire
 * @param {number} opef Voir Opef3v. Caractérise la fonction.
 * @param {CCb} operande1 Le premier opérande test (vrai si 1, faux si 0)
 * @param {CCb} operande2 Le deuxième opérande valeursivrai
 * @param {CCb} operande3 Le troisième opérande valeursifaux
 * @returns {CFonction3Var}
 */
function CFonction3Var (listeProprietaire, opef, operande1, operande2, operande3) {
  CCb.call(this, listeProprietaire)
  if (arguments.length !== 1) {
    this.opef = opef
    this.operande1 = operande1
    this.operande2 = operande2
    this.operande3 = operande3
  }
  this.z1loc = new Complexe()
  this.z2loc = new Complexe()
  this.z3loc = new Complexe()
}
CFonction3Var.prototype = new CCb()
CFonction3Var.prototype.constructor = CFonction3Var
CFonction3Var.prototype.superClass = 'CCb'
CFonction3Var.prototype.className = 'CFonction3Var'

CFonction3Var.prototype.nombreVariables = function () {
  return 3
}

CFonction3Var.prototype.nature = function () {
  return CCbGlob.natFonction3Var
}

CFonction3Var.prototype.getClone = function (listeSource, listeCible) {
  const cloneOperande1 = this.operande1.getClone(listeSource, listeCible)
  const cloneOperande2 = this.operande2.getClone(listeSource, listeCible)
  const cloneOperande3 = this.operande3.getClone(listeSource, listeCible)
  return new CFonction3Var(listeCible, this.opef, cloneOperande1, cloneOperande2,
    cloneOperande3)
}

CFonction3Var.prototype.initialisePourDependance = function () {
  CCb.prototype.initialisePourDependance.call(this)
  this.operande1.initialisePourDependance()
  this.operande2.initialisePourDependance()
  this.operande3.initialisePourDependance()
}

CFonction3Var.prototype.depDe = function (p) {
  return this.memDep(CCb.prototype.depDe.call(this, p) || this.operande1.depDe(p) ||
    this.operande2.depDe(p) || this.operande3.depDe(p))
}

CFonction3Var.prototype.dependDePourBoucle = function (p) {
  return this.operande1.dependDePourBoucle(p) || this.operande2.dependDePourBoucle(p) ||
    this.operande3.dependDePourBoucle(p)
}
/**
 * Fonction renvoyant 1 si le calcul existe et 0 sinon.
 * Cette fonction et particulière pour le si :
 * Si operande1 existe et s'il renvoie la valeur 1 existe renverra true
 * si et seulement operande2 existe et s'il renvoie une autre valeur existe
 * renverra true ssi operande3 existe
 * @returns {boolean}
 */
CFonction3Var.prototype.existe = function () {
  if (!this.operande1.existe()) return false
  // Si le calcul à tester est dans un calcul de fonction, pas de traitement particulier
  if (this.operande1.dependDeVariable(-1)) {
    return this.operande1.existe() && this.operande2.existe() && this.operande3.existe()
  }
  try {
    const x1 = this.operande1.resultat(false)
    if (x1 === 1) return this.operande2.existe()
    else return this.operande3.existe()
  } catch (e) { // Juste par précaution
    return this.operande2.existe() && this.operande3.existe()
  }
}

// Pour une fonction réelle ou complexe de une ou plusieurs variables, quand on teste son existence, on appelle
// existe. Or CFonction3Var.existe, dans le cas d'une fonction si provoque un appel de calcul pour un calcul normal
// qu'il faut éviter quand une fonction utilise un si et qu'on teste son existence

CFonction3Var.prototype.existePourFonc = function () {
  return this.operande1.existePourFonc() && this.operande2.existePourFonc() && this.operande3.existePourFonc()
}

CFonction3Var.prototype.resultat = function (infoRandom) {
  const x1 = this.operande1.resultat(infoRandom)
  if (x1 === 1) return this.operande2.resultat(infoRandom)
  else return this.operande3.resultat(infoRandom)
}

CFonction3Var.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  const x1 = this.operande1.resultatFonction(infoRandom, valeurParametre)
  if (x1 === 1) return this.operande2.resultatFonction(infoRandom, valeurParametre)
  else return this.operande3.resultatFonction(infoRandom, valeurParametre)
}
CFonction3Var.prototype.resultatComplexe = function (infoRandom, zRes) {
  this.operande1.resultatComplexe(infoRandom, this.z1loc)
  if (this.z1loc.y !== 0) throw new Error(erreurCalculException)
  if (this.z1loc.x === 1) {
    this.operande2.resultatComplexe(infoRandom, this.z2loc)
    zRes.x = this.z2loc.x
    zRes.y = this.z2loc.y
  } else {
    this.operande3.resultatComplexe(infoRandom, this.z3loc)
    zRes.x = this.z3loc.x
    zRes.y = this.z3loc.y
  }
}

CFonction3Var.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
  this.operande1.resultatFonctionComplexe(infoRandom, valeurParametre, this.z1loc)
  if (this.z1loc.y !== 0) throw new Error(erreurCalculException)
  if (this.z1loc.x === 1) {
    this.operande2.resultatFonctionComplexe(infoRandom, valeurParametre, this.z2loc)
    zRes.x = this.z2loc.x
    zRes.y = this.z2loc.y
  } else {
    this.operande3.resultatFonctionComplexe(infoRandom, valeurParametre, this.z3loc)
    zRes.x = this.z3loc.x
    zRes.y = this.z3loc.y
  }
}

// Ajout version 6.7
CFonction3Var.prototype.resultatMat = function (infoRandom) {
  const op1 = this.operande1.resultatMat(infoRandom)
  const op2 = this.operande2.resultatMat(infoRandom)
  const op3 = this.operande3.resultatMat(infoRandom)
  if (typeof op1 !== 'number') throw new Error(erreurCalculException)
  if (op1 === 1) return op2
  else return op3
}

CFonction3Var.prototype.resultatMatFonction = function (infoRandom, valeurParametre) {
  const op1 = this.operande1.resultatMatFonction(infoRandom, valeurParametre)
  const op2 = this.operande2.resultatMatFonction(infoRandom, valeurParametre)
  const op3 = this.operande3.resultatMatFonction(infoRandom, valeurParametre)
  if (typeof op1 !== 'number') throw new Error(erreurCalculException)
  if (op1 === 1) return op2
  else return op3
}

CFonction3Var.prototype.dependDeVariable = function (ind) {
  return this.operande1.dependDeVariable(ind) || this.operande2.dependDeVariable(ind) || this.operande3.dependDeVariable(ind)
}

CFonction3Var.prototype.getCopie = function () {
  return new CFonction3Var(this.listeProprietaire, this.opef, this.operande1.getCopie(),
    this.operande2.getCopie(), this.operande3.getCopie())
}

CFonction3Var.prototype.getCore = function () {
  const x1 = this.operande1.resultat(false)
  if (x1 === 1) return this.operande2.getCore()
  else return this.operande3.getCore()
}

CFonction3Var.prototype.chaineCalcul = function (varFor) {
  const cha1 = this.operande1.chaineCalculSansPar(varFor)
  const cha2 = this.operande2.chaineCalculSansPar(varFor)
  const cha3 = this.operande3.chaineCalculSansPar(varFor)
  const ch = '(' + cha1 + ',' + cha2 + ',' + cha3 + ')'
  return getStr('si') + ch
}

CFonction3Var.prototype.chaineLatex = function (varFor, fracSimple = false) {
  const x1 = this.operande1.resultat(false)
  if (x1 === 1) return this.operande2.chaineLatex(varFor, fracSimple)
  else return this.operande3.chaineLatex(varFor, fracSimple)
}

CFonction3Var.prototype.chaineLatexSansPar = function (varFor, fracSimple = false) {
  const x1 = this.operande1.resultat(false)
  if (x1 === 1) return this.operande2.chaineLatexSansPar(varFor, fracSimple)
  else return this.operande3.chaineLatexSansPar(varFor, fracSimple)
}

CFonction3Var.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  this.opef = inps.readByte()
  this.operande1 = inps.readObject(list)
  this.operande2 = inps.readObject(list)
  this.operande3 = inps.readObject(list)
}

CFonction3Var.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  oups.writeByte(this.opef)
  oups.writeObject(this.operande1)
  oups.writeObject(this.operande2)
  oups.writeObject(this.operande3)
}

CFonction3Var.prototype.estConstant = function () {
  return (this.operande1.estConstant() && this.operande2.estConstant() && this.operande3.estConstant())
}

CFonction3Var.prototype.deriveePossible = function (indiceVariable) {
  return this.operande1.deriveePossible(indiceVariable) &&
  this.operande2.deriveePossible(indiceVariable) && this.operande3.deriveePossible(indiceVariable)
}

CFonction3Var.prototype.calculAvecValeursRemplacees = function (bfrac) {
  /* Modifié version 7.9.3
  return new CFonction3Var(this.listeProprietaire, this.opef, this.operande1.calculAvecValeursRemplacees(bfrac),
    this.operande2.calculAvecValeursRemplacees(bfrac), this.operande3.calculAvecValeursRemplacees(bfrac))
   */
  const x1 = this.operande1.resultat(false)
  if (x1 === 1) return this.operande2.calculAvecValeursRemplacees(bfrac)
  else return this.operande3.calculAvecValeursRemplacees(bfrac)
}
// Déplacé ici version 6.4.7
CFonction3Var.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac, eliminMult1 = true) {
  /* Modifié version 7.9.3
  const op1 = this.operande1.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  const op2 = this.operande2.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  const op3 = this.operande3.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  return new CFonction3Var(this.listeProprietaire, this.opef, op1, op2, op3)
   */
  const x1 = this.operande1.resultat(false)
  if (x1 === 1) return this.operande2.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  else return this.operande3.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
}
