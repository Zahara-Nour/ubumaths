/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Vect from '../types/Vect'
import CTransformation from './CTransformation'
import CHomothetie from './CHomothetie'
export default CInversion

/**
 * Classe représentant l'inversion (transformation).
 * Cette transformation est spéciale car ne peut être appliquée qu'à un point.
 * @constructor
 * @extends CHomothetie
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CPt} centre  Le centre de la similitude.
 * @param {CValeur} rapport  Le rapport de l'inversion
 * @returns {CInversion}
 */
function CInversion (listeProprietaire, impProto, estElementFinal, centre, rapport) {
  if (arguments.length === 1) CHomothetie.call(this, listeProprietaire)
  else {
    CHomothetie.call(this, listeProprietaire, impProto, estElementFinal, centre, rapport)
  }
}
CInversion.prototype = new CHomothetie()
CInversion.prototype.constructor = CInversion
CInversion.prototype.superClass = 'CHomothetie'
CInversion.prototype.className = 'CInversion'

/**
 * Indique la nature de la transformation
 * @returns {number}
 */
CInversion.prototype.natureTransformation = function () {
  return CTransformation.inversion
}
CInversion.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.centre)
  const ind2 = listeSource.indexOf(this.impProto)
  const rapportClone = this.rapport.getClone(listeSource, listeCible)
  return new CInversion(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CPt'), rapportClone)
}
CInversion.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  const resultat = CHomothetie.prototype.depDe.call(this, p)
  if (this.listeProprietaire.pointeurLongueurUnite === null) { return this.memDep(resultat) } else return this.memDep(resultat || (this.listeProprietaire.pointeurLongueurUnite.depDe(p)))
}
CInversion.prototype.dependDePourBoucle = function (p) {
  const resultat = CHomothetie.prototype.depDe.call(this, p)
  if (this.listeProprietaire.pointeurLongueurUnite === null) return resultat
  else return resultat || (this.listeProprietaire.pointeurLongueurUnite.dependDePourBoucle(p))
}
CInversion.prototype.positionne = function (infoRandom) {
  CHomothetie.prototype.positionne.call(this, infoRandom)
  // A noter : valeurRapport a été calculé dans Homothetie.positionne()
  const pLongUnite = this.listeProprietaire.pointeurLongueurUnite
  this.existe = this.existe && pLongUnite.existe
  if (!this.existe) return
  const longueurUnite = pLongUnite.rendLongueur()
  if (longueurUnite === 0) this.existe = false
}
// Ajout version 6.3.0
CInversion.prototype.positionneFull = function (infoRandom) {
  this.rapport.dejaPositionne = false
  this.positionne(infoRandom)
}
/**
 * Renvoie dans pointr.x et pointr.y les coordonnées du point image du point de coordonnées (x,y).
 * @param {number} x
 * @param {number} y
 * @param {Object} pointr
 * @returns {void}
 */
CInversion.prototype.transformePoint = function (x, y, pointr) {
// Le point image du point d'affixe z est le point d'affixe z'
// défini par z' - w = k(z - w)/|z - w|², mais le module de
// z - w doit être calculé relativement à la longueur unité
// (w désigant l'affixe du centre)

  const pLongUnite = this.listeProprietaire.pointeurLongueurUnite
  const longueurUnite = pLongUnite.rendLongueur()

  const u = new Vect(this.centre.x, this.centre.y, x, y)
  const longueur = u.norme() / longueurUnite
  const d = longueur * longueur
  pointr.x = this.centre.x + this.valeurRapport * u.x / d
  pointr.y = this.centre.y + this.valeurRapport * u.y / d
}
CInversion.prototype.pointAUneImage = function (point) {
  return (!point.egal(this.centre))
}
