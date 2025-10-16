/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CPartieReelle from './CPartieReelle'
export default CPartieImaginaire

/**
 * Objet calcul donnant comme résultat la partie imaginaire d'un calcul complexe.
 * @constructor
 * @extends CPartieReelle
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul
 * @param {CValDyn} complexeAssocie  Le complexe dont on calcule la partie imaginaire.
 * @returns {CPartieImaginaire}
 */
function CPartieImaginaire (listeProprietaire, impProto, estElementFinal, nomCalcul, complexeAssocie) {
  if (arguments.length === 1) CPartieReelle.call(this, listeProprietaire)
  else CPartieReelle.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, complexeAssocie)
}
CPartieImaginaire.prototype = new CPartieReelle()
CPartieImaginaire.prototype.constructor = CPartieImaginaire
CPartieImaginaire.prototype.superClass = 'CPartieReelle'
CPartieImaginaire.prototype.className = 'CPartieImaginaire'

CPartieImaginaire.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.complexeAssocie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CPartieImaginaire(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CValDyn'))
}
CPartieImaginaire.prototype.getNatureCalcul = function () {
  return NatCal.NPartieImaginaire
}
CPartieImaginaire.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.complexeAssocie.existe
  if (!this.existe) return
  this.complexeAssocie.rendValeurComplexe(this.z1)
  this.resultat = this.z1.y
}
