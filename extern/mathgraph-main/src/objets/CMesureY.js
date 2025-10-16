/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Vect from '../types/Vect'
import CMesureX from './CMesureX'
export default CMesureY

/**
 *
 * Classe représentant la mesure de l'ordonnnée d'un point dans un repère.
 * @constructor
 * @extends CValDyn
 * @param {CListeObjets} listeProprietaire  la liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom du calcul
 * @param {CRepere} repereAssocie  Le repère dans lequel on fait la mesure.
 * @param {CPt} pointMesure  Le point dont on mesure l'abscisse.
 * @returns {CMesureY}
 */
function CMesureY (listeProprietaire, impProto, estElementFinal, nomCalcul, repereAssocie, pointMesure) {
  if (arguments.length === 1) CMesureX.call(this, listeProprietaire)
  else {
    CMesureX.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, repereAssocie,
      pointMesure)
  }
}
CMesureY.prototype = new CMesureX()
CMesureY.prototype.constructor = CMesureY
CMesureY.prototype.superClass = 'CMesureX'
CMesureY.prototype.className = 'CMesureY'

// Ajout version 5.0
CMesureY.prototype.debutNom = function () {
  return 'yCoord'
}

CMesureY.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.repereAssocie)
  const ind2 = listeSource.indexOf(this.pointMesure)
  const ind3 = listeSource.indexOf(this.impProto)
  // Ajout version 5.0
  const nomCalc = (this.nomCalcul === '') ? listeCible.genereNomPourCalcul(this.debutNom()) : this.nomCalcul
  //
  return new CMesureY(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, nomCalc, listeCible.get(ind1, 'CRepere'), listeCible.get(ind2, 'CPt'))
}
CMesureY.prototype.getNatureCalcul = function () {
  return NatCal.NMesureOrdonneeRepere
}
CMesureY.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.repereAssocie?.existe && this.pointMesure?.existe
  if (!this.existe) return
  // L'orientation sur l'écran est l'inverse de celle du repère
  // choisi.Il faut donc permuter les rôles de u et v}
  const u = new Vect(this.repereAssocie.o, this.repereAssocie.i)
  const v = new Vect(this.repereAssocie.o, this.repereAssocie.j)
  // Calcul des  abscisses et ordonnées de l'origine réelle du repère dans le repère de base
  const absOrigine = this.repereAssocie.valAbscisseOrigine / this.repereAssocie.unitex
  const ordOrigine = this.repereAssocie.valOrdonneeOrigine / this.repereAssocie.unitey
  const xno = this.repereAssocie.o.x - u.x * absOrigine - v.x * ordOrigine
  const yno = this.repereAssocie.o.y - u.y * absOrigine - v.y * ordOrigine
  // Calcul de l'abscisse par résolution d'un système linéaire
  const det = u.x * v.y - v.x * u.y
  this.abscisse = (u.x * (this.pointMesure.y - yno) - u.y * (this.pointMesure.x - xno)) / det * this.repereAssocie.unitey
}
