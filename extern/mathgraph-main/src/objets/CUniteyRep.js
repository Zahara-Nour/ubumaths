/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CAbscisseOrigineRep from './CAbscisseOrigineRep'
import CValDyn from './CValDyn'
export default CUniteyRep
/**
 * Calcul renvoyant comme valeur l'unité d'un repère sur l'axe des ordonnées.
 * @constructor
 * @extends CAbscisseOrigineRep
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom du calcul.
 * @param {CRepere} rep  Le repère associé.
 * @returns {CUniteyRep}
 */
function CUniteyRep (listeProprietaire, impProto, estElementFinal, nomCalcul, rep) {
  if (arguments.length === 1) CValDyn.call(this, listeProprietaire)
  else {
    CAbscisseOrigineRep.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, rep)
  }
}
CUniteyRep.prototype = new CAbscisseOrigineRep()
CUniteyRep.prototype.constructor = CUniteyRep
CUniteyRep.prototype.superClass = 'CAbscisseOrigineRep'
CUniteyRep.prototype.className = 'CUniteyRep'

CUniteyRep.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.rep)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CUniteyRep(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CRepere'))
}

CUniteyRep.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.rep.existe
  this.value = this.rep.unitey
}
