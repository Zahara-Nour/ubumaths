/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CPartieReelle from './CPartieReelle'
export default CArgument

/**
 * Objet calcul donnant comme résultat l'argument principal d'un calcul complexe.
 * @constructor
 * @extends CPartieReelle
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul
 * @param {CValDyn} complexeAssocie  Le complexe dont on calcule l'agument.
 * @returns {CArgument}
 */
function CArgument (listeProprietaire, impProto, estElementFinal, nomCalcul, complexeAssocie) {
  if (arguments.length === 1) CPartieReelle.call(this, listeProprietaire)
  else CPartieReelle.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, complexeAssocie)
}
CArgument.prototype = new CPartieReelle()
CArgument.prototype.constructor = CArgument
CArgument.prototype.superClass = 'CPartieReelle'
CArgument.prototype.className = 'CArgument'

CArgument.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.complexeAssocie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CArgument(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CValDyn'))
}
CArgument.prototype.getNatureCalcul = function () {
  return NatCal.NArgument
}
CArgument.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.complexeAssocie.existe
  if (!this.existe) return
  this.complexeAssocie.rendValeurComplexe(this.z1)
  this.existe = (this.z1.x !== 0) || (this.z1.y !== 0)
  if (this.existe) this.resultat = this.z1.argument(this.listeProprietaire.uniteAngle)
}
