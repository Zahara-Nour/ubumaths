/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CAbscisseOrigineRep from './CAbscisseOrigineRep'
export default COrdonneeOrigineRep
/**
 * Classe représentant l'ordonnée à l'origine d'un repère.
 * @constructor
 * @extends CAbscisseOrigineRep
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom du calcul représentatant l'objet.
 * @param {CRepere} rep  Le repère.
 * @returns {COrdonneeOrigineRep}
 */
function COrdonneeOrigineRep (listeProprietaire, impProto, estElementFinal, nomCalcul, rep) {
  if (arguments.length === 1) CAbscisseOrigineRep.call(this, listeProprietaire)
  else {
    CAbscisseOrigineRep.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, rep)
  }
}
COrdonneeOrigineRep.prototype = new CAbscisseOrigineRep()
COrdonneeOrigineRep.prototype.constructor = COrdonneeOrigineRep
COrdonneeOrigineRep.prototype.superClass = 'CAbscisseOrigineRep'
COrdonneeOrigineRep.prototype.className = 'COrdonneeOrigineRep'

COrdonneeOrigineRep.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.rep)
  const ind2 = listeSource.indexOf(this.impProto)
  return new COrdonneeOrigineRep(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CRepere'))
}

COrdonneeOrigineRep.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.rep.existe
  this.value = this.rep.valOrdonneeOrigine
}
