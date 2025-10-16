/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Ope from '../types/Ope'
import CCalculAncetre from './CCalculAncetre'
import CAppelFonction from './CAppelFonction'
import CConstante from './CConstante'
import COp from './COperation'
import CValeur from './CValeur'
import CVariableFormelle from './CVariableFormelle'
import { getLeft, getRight } from 'src/objets/CCb.js'
export default CSolutionEquation

/**
 * Classe repésentant une valeur approchée d'équation sur un intervalle.
 * L'équation doit correspondre à une fonction strictement monotone telle que f(a) et f(b)
 * soient de signes contraires, sinon l'objet n'existe pas.
 * Si le calcul nécessite plus de 1000 boucles, l'élément est considéré comme non existant.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom du calcul.
 * @param {CValeur} a  La borne inférieure de recherche.
 * @param {CValeur} b  La borne supérieure de recherche.
 * @param {CValeur} incertitude
 * @param {string} inconnue  Chaîne représentant l'inconnue dans l'équation.
 * @param {CCb} equation  L'équation à résoudre.
 * @returns {CSolutionEquation}
 */
function CSolutionEquation (listeProprietaire, impProto, estElementFinal, nomCalcul, a, b,
  incertitude, inconnue, equation) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    if (arguments.length === 3) CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal)
    else {
      CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
      this.a = a
      this.b = b
      this.incertitude = incertitude
      this.inconnue = inconnue
      this.equation = equation
      // this.fonction = new COp(listeProprietaire, equation.membreGauche(), equation.membreDroit(), Ope.Moin)
      this.fonction = new COp(listeProprietaire, getLeft(equation), getRight(equation), Ope.Moin)
    }
  }
  this.solution = 0
}
CSolutionEquation.prototype = new CCalculAncetre()
CSolutionEquation.prototype.constructor = CSolutionEquation
CSolutionEquation.prototype.superClass = 'CCalculAncetre'
CSolutionEquation.prototype.className = 'CSolutionEquation'

CSolutionEquation.prototype.numeroVersion = function () {
  return 2
}
CSolutionEquation.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const aClone = this.a.getClone(listeSource, listeCible)
  const bClone = this.b.getClone(listeSource, listeCible)
  const incertitudeClone = this.incertitude.getClone(listeSource, listeCible)
  const equationClone = this.equation.getClone(listeSource, listeCible)
  return new CSolutionEquation(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, aClone, bClone, incertitudeClone, this.inconnue, equationClone)
}
CSolutionEquation.prototype.getNatureCalcul = function () {
  return NatCal.NSolutionEquation
}
CSolutionEquation.prototype.initialisePourDependance = function () {
  CCalculAncetre.prototype.initialisePourDependance.call(this)
  this.a.initialisePourDependance()
  this.b.initialisePourDependance()
  this.incertitude.initialisePourDependance()
}
CSolutionEquation.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) || this.a.depDe(p) || this.b.depDe(p) ||
  this.incertitude.depDe(p) || this.equation.depDe(p))
}
CSolutionEquation.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.a.dependDePourBoucle(p) || this.b.dependDePourBoucle(p) ||
  this.incertitude.dependDePourBoucle(p) || this.equation.dependDePourBoucle(p)
}
CSolutionEquation.prototype.positionne = function (infoRandom, dimfen) {
  let xm, xa, xb, ya, yb, ym, temp, i
  this.a.positionne(infoRandom, dimfen)
  this.b.positionne(infoRandom, dimfen)
  this.incertitude.positionne(infoRandom, dimfen)
  this.existe = this.equation.existe() && this.a.existe && this.b.existe && this.incertitude.existe
  if (!this.existe) return
  xa = this.a.rendValeur()
  xb = this.b.rendValeur()
  const e = this.incertitude.rendValeur()
  if (xa > xb) {
    temp = xa
    xa = xb
    xb = temp
  }
  try {
    ya = this.fonction.resultatFonction(infoRandom, xa)
    yb = this.fonction.resultatFonction(infoRandom, xb)
    if ((ya * yb > 0) || (e <= 0)) {
      this.existe = false
      return
    }
  } catch (err) {
    this.existe = false
    return
  }
  const nBoucles = Math.floor(Math.log(Math.abs(xb - xa) / e) / Math.log(2)) + 1
  if (nBoucles > 1000) {
    this.existe = false
    return
  }
  xm = (xa + xb) / 2
  for (i = 1; i <= nBoucles; i++) {
    xm = (xa + xb) / 2
    try {
      ym = this.fonction.resultatFonction(infoRandom, xm)
    } catch (err) {
      this.existe = false
      return
    }
    if (ym * ya > 0) xa = xm
    else xb = xm
  }
  this.existe = true
  this.solution = xm
}
// Ajout version 6.3.0
CSolutionEquation.prototype.positionneFull = function (infoRandom, dimfen) {
  this.a.dejaPositionne = false
  this.b.dejaPositionne = false
  this.incertitude.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
CSolutionEquation.prototype.rendValeur = function () {
  return this.solution
}
CSolutionEquation.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  if (this.nVersion < 2) {
    const ind1 = inps.readInt()
    const fonc = list.get(ind1, 'CFonc')
    this.fonction = fonc.calcul
    this.inconnue = fonc.nomsVariables
    this.equation = new COp(list, new CAppelFonction(list, fonc, new CVariableFormelle(list, 0)),
      new CConstante(list, 0), Ope.Egalite)
  } else {
    this.inconnue = inps.readUTF()
    this.equation = inps.readObject(list)
    this.fonction = inps.readObject(list)
  }
  this.a = new CValeur()
  this.a.read(inps, list)
  this.b = new CValeur()
  this.b.read(inps, list)
  this.incertitude = new CValeur()
  this.incertitude.read(inps, list)
}
CSolutionEquation.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  oups.writeUTF(this.inconnue)
  oups.writeObject(this.equation)
  oups.writeObject(this.fonction)
  this.a.write(oups, list)
  this.b.write(oups, list)
  this.incertitude.write(oups, list)
}
CSolutionEquation.prototype.estConstant = function () {
  return this.a.estConstant() && this.b.estConstant() && this.incertitude.estConstant() && this.equation.estConstant()
}
