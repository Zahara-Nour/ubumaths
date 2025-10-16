import { erreurCalculException } from '../kernel/kernel'
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'
export default CTermMat

/**
 * @extends CCb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param operande1
 * @param operande2
 * @param {CMatrice | CCalcMat} mat
 * @constructor
 */
function CTermMat (listeProprietaire, operande1, operande2, mat) {
  CCb.call(this, listeProprietaire)
  if (arguments.length === 1) CCb.call(this, listeProprietaire)
  else {
    this.operande1 = operande1
    this.operande2 = operande2
    this.mat = mat
  }
}

CTermMat.prototype = new CCb()
CTermMat.prototype.constructor = CTermMat
CTermMat.prototype.superClass = 'CCb'
CTermMat.prototype.className = 'CTermMat'

CTermMat.prototype.getClone = function (listeSource, listeCible) {
  const cloneOperande1 = this.operande1.getClone(listeSource, listeCible)
  const cloneOperande2 = this.operande2.getClone(listeSource, listeCible)
  const ind1 = listeSource.indexOf(this.mat)
  return new CTermMat(listeCible, cloneOperande1, cloneOperande2, listeCible.get(ind1, 'CMatrice'))
}

CTermMat.prototype.nature = function () {
  return CCbGlob.natTermMat
}

CTermMat.prototype.existe = function () {
  return this.mat.existe && this.operande1.existe() && this.operande2.existe()
}

CTermMat.prototype.resultatBase = function (l, c) {
  let n, p, mat
  if (this.mat.estMatriceBase()) {
    n = this.mat.n
    p = this.mat.p
    mat = this.mat.mat
  } else {
    // Cas d'un calcul matriciel
    mat = this.mat.rendValeur()
    if (typeof mat === 'number') return mat
    const size = mat.size()
    n = size[0]
    p = size[1]
  }
  if (l !== Math.round(l) || c !== Math.round(c) || l <= 0 || c <= 0 || l > n || c > p) throw new Error(erreurCalculException)
  return mat.get([l - 1, c - 1])
}

CTermMat.prototype.resultat = function (infoRandom) {
  const l = this.operande1.resultat(infoRandom)
  const c = this.operande2.resultat(infoRandom)
  return this.resultatBase(l, c)
}

CTermMat.prototype.resultatFonction = function (infoRandom, valeurparametre) {
  const l = this.operande1.resultatFonction(infoRandom, valeurparametre)
  const c = this.operande2.resultatFonction(infoRandom, valeurparametre)
  return this.resultatBase(l, c)
}

CTermMat.prototype.resultatMat = function (infoRandom) {
  const l = this.operande1.resultatMat(infoRandom)
  const c = this.operande2.resultatMat(infoRandom)
  if (typeof l !== 'number' || typeof c !== 'number') throw new Error(erreurCalculException)
  return this.resultatBase(l, c)
}

CTermMat.prototype.resultatMatFonction = function (infoRandom, valeurParametre) {
  const l = this.operande1.resultatMatFonction(infoRandom, valeurParametre)
  const c = this.operande2.resultatMatFonction(infoRandom, valeurParametre)
  if (typeof l !== 'number' || typeof c !== 'number') throw new Error(erreurCalculException)
  return this.resultatBase(l, c)
}

CTermMat.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCb.prototype.depDe.call(this, p) ||
    this.mat.depDe(p) || this.operande1.depDe(p) || this.operande2.depDe(p))
}

CTermMat.prototype.dependDePourBoucle = function (p) {
  return this.mat.dependDePourBoucle(p) || this.operande1.dependDePourBoucle(p) || this.operande2.dependDePourBoucle(p)
}

CTermMat.prototype.dependDeVariable = function (ind) {
  return this.operande1.dependDeVariable(ind) || this.operande2.dependDeVariable(ind)
}

CTermMat.prototype.getCopie = function () {
  return new CTermMat(this.listeProprietaire, this.operande1.getCopie(), this.operande2.getCopie(), this.mat)
}

CTermMat.prototype.chaineCalcul = function (varFor) {
  return this.mat.nomCalcul + '(' + this.operande1.chaineCalculSansPar(varFor) + ',' + this.operande2.chaineCalculSansPar(varFor) + ')'
}

CTermMat.prototype.chaineLatex = function (varFor, fracSimple = false) {
  return this.mat.nomCalcul + '(' + this.operande1.chaineLatexSansPar(varFor, fracSimple) + ',' +
    this.operande2.chaineLatexSansPar(varFor, fracSimple) + ')'
}

CTermMat.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.mat = list.get(ind1, 'CMatrice')
  this.operande1 = inps.readObject(list)
  this.operande2 = inps.readObject(list)
}

CTermMat.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.mat)
  oups.writeInt(ind1)
  oups.writeObject(this.operande1)
  oups.writeObject(this.operande2)
}
