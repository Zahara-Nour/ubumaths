/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import CPolygone from './CPolygone'
import CSurface from './CSurface'
export default CSurfacePolygone

/**
 * Classe repésentant une surface intérieure à un polygone.
 * Le polygone ne doit pas de préférence être croisé.
 * @constructor
 * @extends CSurface
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleRemplissage} styleRemplissage  Entier donnant le style de remplissage.
 * @param {CPolygone} bord  Le polygone qui borde la surface.
 * @returns {CSurfacePolygone}
 */
function CSurfacePolygone (listeProprietaire, impProto, estElementFinal, couleur, masque, styleRemplissage, bord) {
  if (arguments.length === 1) CSurface.call(this, listeProprietaire)
  else {
    CSurface.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, styleRemplissage, bord)
    // Il est indispensable d'instancier this.polygone car ce type de surface peut générer un lieu d'objets
    // et quand on veut désigner un tel lieu d'objets c'est ce polygone qui est utilisé pour savoir si
    // le pointeur souris est proche ou non du lieu d'objets
    this.polygone = new CPolygone(null, null, false, new Color(0, 0, 0), true, StyleTrait.traitFin, bord.colPoints)
  }
}
CSurfacePolygone.prototype = new CSurface()
CSurfacePolygone.prototype.constructor = CSurfacePolygone
CSurfacePolygone.prototype.superClass = 'CSurface'
CSurfacePolygone.prototype.className = 'CSurfacePolygone'

CSurfacePolygone.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.bord)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CSurfacePolygone(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.styleRemplissage, listeCible.get(ind1, 'CPolygone'))
}
CSurfacePolygone.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.bord)
}
CSurfacePolygone.prototype.positionne = function (infoRandom, dimfen) {
  CSurface.prototype.positionne.call(this, infoRandom, dimfen)
  this.polygone.setClone(this.bord)
}
CSurfacePolygone.prototype.setClone = function (ptel) {
  CSurface.prototype.setClone.call(this, ptel)
  this.polygone.setClone(ptel.polygone)
}
/**
 * Fonction renvoyant une chaîne de caractères utilisée dans le svg élément
 * représentant la surface.
 * @returns {string}
 */
CSurfacePolygone.prototype.creePoints = function () {
  let i; let points = ''
  // Pour un polygone, le dernier point est le même que le premier mais pas pour svg
  for (i = 0; i < this.polygone.nombrePoints - 1; i++) {
    points += this.polygone.absPoints[i] + ',' + this.polygone.ordPoints[i] + ' '
  }
  return points
}
CSurfacePolygone.prototype.read = function (inps, list) {
  CSurface.prototype.read.call(this, inps, list)
  this.polygone = new CPolygone(null, null, false, new Color(0, 0, 0), true,
    new StyleTrait(list, StyleTrait.styleTraitContinu, 1), this.bord.colPoints)
}
