/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import StyleRemplissage from '../types/StyleRemplissage'
import CCercle from './CCercle'
import CSurfaceAncetre from './CSurfaceAncetre'
import CSurface from './CSurface'
export default CSurfaceDisque

/**
 * Surface délimité par un cercle.
 * @constructor
 * @extends CSurface
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleRemplissage} styleRemplissage  Entier donnant le style de remplissage.
 * @param {CCercle} bord  Le cercle bord de la surface.
 * @returns {CSurfaceDisque}
 */
function CSurfaceDisque (listeProprietaire, impProto, estElementFinal, couleur, masque, styleRemplissage, bord) {
  if (arguments.length === 1) CSurface.call(this, listeProprietaire)
  else {
    CSurface.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, styleRemplissage, bord)
  }
  // Il est indispensable d'instancier this.cercle car ce type de surface peut générer un lieu d'objets
  // et quand on veut désigner un tel lieu d'objets c'est ce cercle qui est utilisé pour savoir si
  // le pointeur souris est proche ou non du lieu d'objets
  this.cercle = new CCercle(null)
}
CSurfaceDisque.prototype = new CSurface()
CSurfaceDisque.prototype.constructor = CSurfaceDisque
CSurfaceDisque.prototype.superClass = 'CSurface'
CSurfaceDisque.prototype.className = 'CSurfaceDisque'

CSurfaceDisque.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.bord)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CSurfaceDisque(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.styleRemplissage, listeCible.get(ind1, 'CCercle'))
}
CSurfaceDisque.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.bord)
}
CSurfaceDisque.prototype.positionne = function (infoRandom, dimfen) {
  CSurface.prototype.positionne.call(this, infoRandom, dimfen)
  this.cercle.setClone(this.bord)
}
CSurfaceDisque.prototype.setClone = function (ptel) {
  CSurfaceAncetre.prototype.setClone.call(this, ptel)
  this.cercle.setClone(ptel.cercle)
}
CSurfaceDisque.prototype.createg = function (svg, couleurFond) {
  let opacity, style
  // color = this.couleur.rgb() Modifié vesion 4.9.9.4
  const color = this.couleur.rgbWithoutOpacity()
  const styleRemplissage = this.styleRemplissage
  const g = cens('circle', {
    cx: this.cercle.centreX,
    cy: this.cercle.centreY,
    r: this.cercle.rayon
  })
  switch (styleRemplissage) {
    case StyleRemplissage.transp:
    case StyleRemplissage.plein:
      opacity = (styleRemplissage === StyleRemplissage.transp) ? this.couleur.opacity : 1
      style = 'stroke:none;'
      style += 'fill-opacity:' + opacity + ';'
      style += 'fill:' + color + ';'
      g.setAttribute('style', style)
      break
    default :
      style = 'stroke:none;' + 'fill:url(#' + this.listeProprietaire.id + this.index + 'mtg32pattern);'
      this.createPattern()
      g.setAttribute('style', style)
  }
  // Ligne suivante modifiée version 6.5.2
  // g.setAttribute('pointer-events', 'none')
  g.setAttribute('pointer-events', this.pointerevents)
  return g
}
CSurfaceDisque.prototype.update = function () {
  const g = this.g
  // svg.replaceChild(this.createg(transparence),g)
  g.removeAttribute('cx')
  g.removeAttribute('cx')
  g.removeAttribute('r')
  g.setAttribute('cx', this.cercle.centreX)
  g.setAttribute('cy', this.cercle.centreY)
  g.setAttribute('r', this.cercle.rayon)
}
CSurfaceDisque.prototype.read = function (inps, list) {
  CSurface.prototype.read.call(this, inps, list)
  this.cercle = new CCercle(null)
}
