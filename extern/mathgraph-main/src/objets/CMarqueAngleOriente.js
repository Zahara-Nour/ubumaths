/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import StyleFleche from '../types/StyleFleche'
import Vect from '../types/Vect'
import { cos30, sin30, zero, zeroAngle } from '../kernel/kernel'
import CMarqueAngleGeometrique from './CMarqueAngleGeometrique'
import CValDyn from '../objets/CValDyn'
export default CMarqueAngleOriente

/**
 * Classe représentant une marque d'angle orienté.
 * @constructor
 * @extends CMarqueAngleGeometrique
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Donne le style trait utilisé.
 * @param {StyleMarqueAngle} styleMarque  Donne le style de la marque.
 * @param {number} rayon  Le rayon de l'arc.
 * @param {CPt} a  Le premier point
 * @param {CPt} o  Le point sommet de l'angle définissant l'arc.
 * @param {CPt} b  Le troisième point.
 * @param {StyleFleche} motifFleche  Le style utilisé pour la flèche finissant l'arc.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMarqueAngleOriente}
 */
function CMarqueAngleOriente (listeProprietaire, impProto, estElementFinal, couleur, masque,
  style, styleMarque, rayon, a, o, b,
  motifFleche, fixed = false) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CMarqueAngleGeometrique.call(this, listeProprietaire)
  else {
    CMarqueAngleGeometrique.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style, styleMarque, rayon, a, o, b, fixed)
    this.motifFleche = motifFleche
  }
  this.xdeb = 0 // Les coordonnées du point de début de l'arc
  this.ydeb = 0
  this.v0 = new Vect() // Vect de longueur rayon colinéaire à OB
  this.vecteurDirection = new Vect() // Vect définissant la direction inverse de l'arc
}
CMarqueAngleOriente.prototype = new CMarqueAngleGeometrique()
CMarqueAngleOriente.prototype.constructor = CMarqueAngleOriente
CMarqueAngleOriente.prototype.superClass = 'CMarqueAngleGeometrique'
CMarqueAngleOriente.prototype.className = 'CMarqueAngleOriente'

CMarqueAngleOriente.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.a)
  const ind2 = listeSource.indexOf(this.o)
  const ind3 = listeSource.indexOf(this.b)
  const ind4 = listeSource.indexOf(this.impProto)
  return new CMarqueAngleOriente(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), this.styleMarque, this.rayon,
    listeCible.get(ind1, 'CPt'), listeCible.get(ind2, 'CPt'),
    listeCible.get(ind3, 'CPt'), this.motifFleche, this.fixed)
}
CMarqueAngleOriente.prototype.setClone = function (ptel) {
  CMarqueAngleGeometrique.prototype.setClone.call(this, ptel)
  ptel.vecteurDirection.setCopy(this.vecteurDirection)
  this.xdeb = ptel.xdeb
  this.ydeb = ptel.ydeb
}
CMarqueAngleOriente.prototype.positionne = function (infoRandom, dimfen) {
  let petitAngle // Représente l'angle de correction pour la direction de la flèche
  // due à la longueur de la flèche
  CMarqueAngleGeometrique.prototype.positionne.call(this, infoRandom, dimfen)
  if (!this.existe) return
  // Optimisation pour la version 1.9.5
  const longueurFleche = StyleFleche.longeurFlechePourArc(this.motifFleche, this.listeProprietaire)
  this.v.vecteurColineaire(this.rayon, this.v0)
  const angle = this.u.mesureAngleVecteurs(this.v)
  if (zeroAngle(Math.abs(angle) - Math.PI / 2)) petitAngle = 0
  // Modifié version 5.3. Meilleur quand la marque est petite
  // else petitAngle = Math.atan(longueurFleche/this.rayon);
  else petitAngle = Math.atan(longueurFleche / this.rayon) / 2
  if (zero(angle)) {
    this.existe = false
    return
  } else {
    if (zeroAngle(Math.abs(angle) - Math.PI)) this.v0.tourne(-Math.PI / 2, this.vecteurDirection)
    else {
      if (angle <= 0) this.v0.tourne(Math.PI / 2 + petitAngle, this.vecteurDirection)
      else this.v0.tourne(-Math.PI / 2 - petitAngle, this.vecteurDirection)
    }
  }
  this.xdeb = this.o.x + this.v0.x
  this.ydeb = this.o.y + this.v0.y
}
CMarqueAngleOriente.prototype.createg = function (svg, couleurFond) {
  const g = CMarqueAngleGeometrique.prototype.createg.call(this, svg, couleurFond)
  g.appendChild(this.creeFlechePourArc())
  // Ligne suivante modifiée version 6.5.2
  // g.setAttribute('pointer-events', 'none')
  g.setAttribute('pointer-events', this.pointerevents)
  return g
}
// Procédure dessinant la flèche en bout d'une marque d'angle orienté
// Le Vect u désigne la direction opposée à celle de la flèche
// et (xa, ya) le point extrémité de la flèche
/**
 * Fonction créant le svg element représentant la flèche de l'arc.
 * Le Vect u désigne la direction opposée à celle de la flèche
 * et (xa, ya) le point extrémité de la flèche.
 * @returns {SVGElement}
 */
CMarqueAngleOriente.prototype.creeFlechePourArc = function () {
  const path = cens('path')
  let style = ''
  const stroke = this.style.stroke
  if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
  const strokewidth = this.style.strokeWidth
  const color = this.couleur.rgbWithoutOpacity()
  style += 'stroke-width:' + strokewidth + ';'
  // style += "stroke:"+this.couleur.rgb()+";"; Modifié version 4.9.9.4
  // style += 'stroke:' + this.color + ';' // Modifié version 6.9.1
  style += 'stroke:' + color + ';opacity:1'
  const u1 = new Vect()
  const u2 = new Vect()
  const longueurFleche = StyleFleche.longeurFlechePourArc(this.motifFleche, this.listeProprietaire)
  this.vecteurDirection.vecteurColineaire(longueurFleche, u1)
  // On fait tourner le Vect u1 de -pi/6 pour avoir u2
  u2.x = u1.x * cos30 - u1.y * sin30
  u2.y = u1.x * sin30 + u1.y * cos30
  const abs0 = this.xdeb + u2.x
  const ord0 = this.ydeb + u2.y
  // On fait tourner le Vect u1 de pi/6 pour avoir u2
  u2.x = u1.x * cos30 + u1.y * sin30
  u2.y = -u1.x * sin30 + u1.y * cos30
  const abs2 = this.xdeb + u2.x
  const ord2 = this.ydeb + u2.y
  switch (this.motifFleche) {
    case StyleFleche.FlecheLonguePleine:
    case StyleFleche.FlecheCourtePleine:
      // style += "fill:"+this.couleur.rgb()+";"; Modifié version 4.9.9.4
      style += ';fill:' + this.color + ';'
      path.setAttribute('d', 'M' + abs2 + ' ' + ord2 + 'L' + this.xdeb + ' ' + this.ydeb + 'L' + abs0 + ' ' + ord0 + 'Z')
      break
    case StyleFleche.FlecheLongueSimple:
    case StyleFleche.FlecheCourteSimple:
      style += ';fill:none;'
      path.setAttribute('d', 'M' + abs2 + ' ' + ord2 + 'L' + this.xdeb + ' ' + this.ydeb + 'L' + abs0 + ' ' + ord0)
  }
  path.setAttribute('style', style)
  return path
}
/**
 *
 * Renvoie true si le nom de la valeur commence par la chaîne st
 * @param st
 * @returns {boolean}
 */
CMarqueAngleOriente.prototype.nomCommencePar = function (st) {
  if (CValDyn.prototype.nomCommencePar.call(this, st)) return true
  const ch = this.point2.nom + this.point1.nom
  return ch.indexOf(st) === 0
}

CMarqueAngleOriente.prototype.read = function (inps, list) {
  CMarqueAngleGeometrique.prototype.read.call(this, inps, list)
  this.motifFleche = inps.readByte()
}
CMarqueAngleOriente.prototype.write = function (oups, list) {
  CMarqueAngleGeometrique.prototype.write.call(this, oups, list)
  oups.writeByte(this.motifFleche)
}
