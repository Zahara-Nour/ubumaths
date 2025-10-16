/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import NatArc from '../types/NatArc'
import PositionCercleCercle from '../types/PositionCercleCercle'
import PositionRelative from '../types/PositionRelative'
import { distancePointPoint, zero } from '../kernel/kernel'
import CElementLigne from './CElementLigne'
import { intersectionCercleCercle } from 'src/kernel/kernelVect'

export default CCercle

/**
 * Fonction renvoyant true si le point de coordonnées (x,y) est sur le cercle (ou descendant de cercle)
 * @param cercle
 * @param x
 * @param y
 * @returns {boolean}
 * @private
 */
function appartientCercle (cercle, x, y) {
  return zero(distancePointPoint(x, y, cercle.centreX, cercle.centreY) - cercle.rayon)
}

/**
 * Classe ancêtre de tous les cercles et arcs de cercle.
 * @constructor
 * @extends CElementLigne
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Le style de tracé.
 * @returns {CCercle}
 */
function CCercle (listeProprietaire, impProto, estElementFinal, couleur,
  masque, style) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CElementLigne.call(this, listeProprietaire)
  else {
    CElementLigne.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      true, 0, 0, masque, '', 16, style)
  }
}
CCercle.prototype = new CElementLigne()
CCercle.prototype.constructor = CCercle
CCercle.prototype.superClass = 'CElementLigne'
CCercle.prototype.className = 'CCercle'

CCercle.prototype.setClone = function (ptel) {
  CElementLigne.prototype.setClone.call(this, ptel)
  this.centreX = ptel.centreX
  this.centreY = ptel.centreY
  this.rayon = ptel.rayon
  /* Supprimé version 5.2. Ne sert pas
  this.xCarre1 = ptel.xCarre1;
  this.yCarre1 = ptel.yCarre1;
  this.xCarre2 = ptel.xCarre2;
  this.yCarre2 = ptel.yCarre2;
  */
  this.horsFenetre = ptel.horsFenetre
}
/**
 * Fonction renvoyant true si le point de coordonnées (xt,yt) est sur l'objet.
 * true par défaut.
 * A redéfinir pour les arcs de cercle.
 * @param {number} xt  l'abscisse du point testé.
 * @param {number} yt  L'ordonnée du point testé.
 * @returns {boolean}
 */
CCercle.prototype.surArc = function (xt, yt) {
  return true // true pour un vrai cercle
}
/**
 * Fonction fournissant la position relative du cercle par rapport à elg
 * @param {CElementGraphique} elg
 * @param {boolean} bperpendiculaires  : renvoie par getValue true si des droites
 * sont perpendiculaires. Ici false.
 * @returns {PositionRelative}
 */
CCercle.prototype.positionRelative = function (elg, bperpendiculaires) {
  if (elg.estDeNature(NatObj.NTtPoint)) {
    bperpendiculaires.setValue(false)
    if (appartientCercle(this, elg.x, elg.y) && this.surArc(elg.x, elg.y)) return PositionRelative.appartient
    else return PositionRelative.nappartient
  } else {
    let b1, b2
    if (elg.estDeNature(NatObj.NTtCercle)) {
      bperpendiculaires.setValue(false)
      // CCercle cercle = (CCercle) elg;
      const point1 = {}
      const point2 = {}
      const position = intersectionCercleCercle(this.centreX, this.centreY, this.rayon,
        elg.centreX, elg.centreY, elg.rayon, point1, point2)
      switch (position) {
        case PositionCercleCercle.Vide : return PositionRelative.vide
        case PositionCercleCercle.Confondus :
          if (this.estDeNature(NatObj.NCercle) && elg.estDeNature(NatObj.NCercle)) return PositionRelative.confondus
          else return PositionRelative.memeSupportCercle
        case PositionCercleCercle.Tangents:
          if (this.surArc(this.point1.x, this.point1.y) && elg.surArc(this.point1.x, this.point1.y)) return PositionRelative.tangents
          else return PositionRelative.vide
        case PositionCercleCercle.Secants :
          b1 = this.surArc(this.point1.x, this.point1.y) && elg.surArc(this.point1.x, this.point1.y)
          b2 = this.surArc(this.point2.x, this.point2.y) && elg.surArc(this.point2.x, this.point2.y)
          if (b1 && b2) return PositionRelative.secants2Point
          if (b1 || b2) return PositionRelative.secants1Point
          return PositionRelative.vide
        default : return PositionRelative.vide // Pour satisfairele compilateur
      }
    } else return elg.positionRelative(this, bperpendiculaires)
  }
}
CCercle.prototype.positionne = function (infoRandom, dimfen) {
  // devra être appelée par tous les descendants de cercle.positionne
  // pour vérifier que le rayon est positif
  this.existe = (this.rayon > 0)
  if (this.existe) this.horsFenetre = !dimfen.testCercleDansFen(this.centreX, this.centreY, this.rayon)
}
CCercle.prototype.createg = function () {
  let style = ''
  const stroke = this.style.stroke
  if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
  const strokewidth = this.style.strokeWidth
  style += 'stroke-width:' + strokewidth + ';'
  // style += 'stroke:' + this.color + ';' // Modifié version 6.9.1
  style += 'stroke:' + this.color + ';opacity:' + this.couleur.opacity + ';'
  style += 'fill:none'

  return cens('circle', {
    cx: this.centreX,
    cy: this.centreY,
    r: this.rayon,
    style,
    // Ligne suivante modifiée version 6.5.2
    // 'pointer-events': 'none'
    'pointer-events': this.pointerevents
  })
}
CCercle.prototype.hasg = function (masquage, memeMasque = false) {
  return this.existe && !this.horsFenetre && (memeMasque || !(this.masque && masquage))
}
CCercle.prototype.horsCadre = function () {
  return this.horsFenetre
}
CCercle.prototype.trace = function (svg) {
  const g = this.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CCercle.prototype.update = function () {
  const g = this.g
  g.removeAttribute('cx')
  g.removeAttribute('cy')
  g.removeAttribute('r')
  g.setAttribute('cx', this.centreX)
  g.setAttribute('cy', this.centreY)
  g.setAttribute('r', this.rayon)
}
CCercle.prototype.abscisseMinimale = function () {
  return 0
}
CCercle.prototype.abscisseMaximale = function () {
  return 2 * Math.PI
}
CCercle.prototype.abscisseCurviligne = function (ang) {
  return ang
}
CCercle.prototype.natureArc = function () {
  return NatArc.ArcCercle
}
CCercle.prototype.dansFen = function () { // Test d'existence car on peut créer un cercle qui n'existe pas
  return this.existe && !this.horsFenetre
}
CCercle.prototype.getNature = function () {
  return NatObj.NCercle
}
// Utilis version mtgApp
CCercle.prototype.setRayon = function (ray) {
  this.rayon = ray
}

CCercle.prototype.pointInterieur = function (x, y) {
  return (distancePointPoint(x, y, this.centreX, this.centreY) <= this.rayon)
}
CCercle.prototype.chaineDesignation = function () {
  return 'desCercle'
}
