/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Ope from '../types/Ope'
import CCalculAncetre from './CCalculAncetre'
import CCbGlob from '../kernel/CCbGlob'
import { getRealCalc } from 'src/objets/CCb.js'
export default CTestEqNatOp

/**
 * Test d'équivalence de nature d'opérateur.
 * Renvoie true sseulement si les deux calxuls ont le même opérateur principal
 * (par exemple un test d'égalité).
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom du calcul.
 * @param {CCalcul} calcul1  Le premier calcul testé (peut être aussi une fonction).
 * @param {CCalcul} calcul2  Le deuxième calcul testé (peut être aussi une fonction).
 * @returns {CTestEqNatOp}
 */
function CTestEqNatOp (listeProprietaire, impProto, estElementFinal, nomCalcul,
  calcul1, calcul2) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    if (arguments.length === 3) CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal)
    else {
      CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
      this.calcul1 = calcul1
      this.calcul2 = calcul2
    }
  }
  this.existe = true
  this.dejaPositionne = false
}
CTestEqNatOp.prototype = new CCalculAncetre()
CTestEqNatOp.prototype.constructor = CTestEqNatOp
CTestEqNatOp.prototype.superClass = 'CCalculAncetre'
CTestEqNatOp.prototype.className = 'CTestEqNatOp'

CTestEqNatOp.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const ind2 = listeSource.indexOf(this.calcul1)
  const ind3 = listeSource.indexOf(this.calcul2)
  return new CTestEqNatOp(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind2, 'CCalcul'), listeCible.get(ind3, 'CCalcul'))
}
CTestEqNatOp.prototype.getNatureCalcul = function () {
  return NatCal.NTestNatureOperateur
}
CTestEqNatOp.prototype.rendValeur = function () {
  return this.resultat
}
CTestEqNatOp.prototype.positionne = function (infoRandom, dimfen) {
  if (!this.dejaPositionne) {
    this.metAJour()
    this.dejaPositionne = true
  }
}
CTestEqNatOp.prototype.positionneFull = function (infoRandom, dimfen) {
  this.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
CTestEqNatOp.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) || this.calcul1.depDe(p) || this.calcul2.depDe(p))
}
CTestEqNatOp.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.calcul1.dependDePourBoucle(p) || this.calcul2.dependDePourBoucle(p)
}
CTestEqNatOp.prototype.metAJour = function () {
  this.dejaPositionne = true
  if (this.verifieEquivalenceNature()) {
    this.resultat = 1
  } else this.resultat = 0
}
CTestEqNatOp.prototype.verifieEquivalenceNature = function () {
  // Les deux lignes suivantes ont été rajoutées version 7.9.3
  const calcul1 = getRealCalc(this.calcul1.calcul) // Pour éliminer les éventuels Left et Right de début de la formule
  const calcul2 = getRealCalc(this.calcul2.calcul) // idem
  if ((calcul1.className === 'CMoinsUnaire') || (calcul2.className === 'CMoinsUnaire')) {
    const cb1 = calcul1.className === 'CMoinsUnaire' ? calcul1.operande : calcul1
    const cb2 = calcul2.className === 'CMoinsUnaire' ? calcul2.operande : calcul2
    if ((cb1.nature() === CCbGlob.natOperation) && (cb2.nature() === CCbGlob.natOperation)) {
      if (((cb1.ope === Ope.Mult) && (cb2.ope === Ope.Mult)) ||
          ((cb1.ope === Ope.Divi) && (cb2.ope === Ope.Divi))) return true
    }
  }
  if (calcul1.className !== calcul2.className) return false
  // Les deux calculs sont de même classe
  if (calcul1.nature() === CCbGlob.natOperation) {
    if (calcul1.ope === Ope.Egalite) return (calcul2.ope === Ope.Egalite)
    if ((calcul1.ope === Ope.Sup) || (calcul1.ope === Ope.Inf)) { return ((calcul2.ope === Ope.Sup) || (calcul2.ope === Ope.Inf)) }
    if ((calcul1.ope === Ope.SupOuEgal) || (calcul1.ope === Ope.InfOuEgal)) { return ((calcul2.ope === Ope.SupOuEgal) || (calcul2.ope === Ope.InfOuEgal)) }
    return (calcul1.ope === calcul2.ope)
  } else return true
}
CTestEqNatOp.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.calcul1 = list.get(ind1, 'CCalcul')
  const ind2 = inps.readInt()
  this.calcul2 = list.get(ind2, 'CCalcul')
}
CTestEqNatOp.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.calcul1)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.calcul2)
  oups.writeInt(ind2)
}
