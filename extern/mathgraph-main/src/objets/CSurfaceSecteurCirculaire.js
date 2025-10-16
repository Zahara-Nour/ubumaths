/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import StyleRemplissage from '../types/StyleRemplissage'
import CSurface from './CSurface'
export default CSurfaceSecteurCirculaire

/**
 * Classe représentant un surface remplissant un secteur circulaire.
 * Elle est délimitée par un arc de cercle.
 * @constructor
 * @extends CSurface
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleRemplissage} styleRemplissage  Entier donnant le style de remplissage.
 * @param {CArcDeCercleAncetre} bord  L'arc de cercle qui donne le bord.
 * @returns {CSurfaceSecteurCirculaire}
 */
function CSurfaceSecteurCirculaire (listeProprietaire, impProto, estElementFinal, couleur, masque, styleRemplissage, bord) {
  if (arguments.length === 1) CSurface.call(this, listeProprietaire)
  else {
    CSurface.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, styleRemplissage, bord)
    // Il est indispensable d'instancier this.arc car ce type de surface peut générer un lieu d'objets
    // et quand on veut désigner un tel lieu d'objets c'est cet arc qui est utilisé pour savoir si
    // le pointeur souris est proche ou non du lieu d'objets
    this.arc = bord.getClone(listeProprietaire, listeProprietaire)
  }
}
CSurfaceSecteurCirculaire.prototype = new CSurface()
CSurfaceSecteurCirculaire.prototype.constructor = CSurfaceSecteurCirculaire
CSurfaceSecteurCirculaire.prototype.superClass = 'CSurface'
CSurfaceSecteurCirculaire.prototype.className = 'CSurfaceSecteurCirculaire'

CSurfaceSecteurCirculaire.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.bord)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CSurfaceSecteurCirculaire(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.styleRemplissage, listeCible.get(ind1, 'CArcDeCercleAncetre'))
}
CSurfaceSecteurCirculaire.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.bord)
}
CSurfaceSecteurCirculaire.prototype.positionne = function (infoRandom, dimfen) {
  CSurface.prototype.positionne.call(this, infoRandom, dimfen)
  this.arc.setClone(this.bord)
  this.natureArcBord = this.bord.natureArc()
}
CSurfaceSecteurCirculaire.prototype.setClone = function (ptel) {
  CSurface.prototype.setClone.call(this, ptel)
  this.arc.setClone(ptel.arc)
  this.natureArcBord = ptel.natureArcBord
}
CSurfaceSecteurCirculaire.prototype.createg = function (svg, couleurFond) {
  let style, opacity
  // color = this.couleur.rgb() Modifié version 4.9.9.4
  const color = this.couleur.rgbWithoutOpacity()
  const styleRemplissage = this.styleRemplissage
  const path = cens('path', {
    d: this.arc.path() + 'L' + this.arc.centreX + ',' + this.arc.centreY + 'Z'
  })
  switch (styleRemplissage) {
    case StyleRemplissage.transp:
    case StyleRemplissage.plein:
      opacity = (styleRemplissage === StyleRemplissage.transp) ? this.couleur.opacity : 1
      style = 'stroke:none;'
      style += 'fill-opacity:' + opacity + ';'
      style += 'fill:' + color + ';'
      path.setAttribute('style', style)
      break
    default :
      style = 'stroke:none;' + 'fill:url(#' + this.listeProprietaire.id + this.index + 'mtg32pattern);'
      this.createPattern()
      path.setAttribute('style', style)
  }
  if (this.listeProprietaire !== null) path.setAttribute('id', this.id)
  // Ligne suivante modifiée version 6.5.2
  // path.setAttribute('pointer-events', 'none')
  path.setAttribute('pointer-events', this.pointerevents)
  return path
}
CSurfaceSecteurCirculaire.prototype.read = function (inps, list) {
  CSurface.prototype.read.call(this, inps, list)
  this.arc = this.bord.getClone(this.listeProprietaire, this.listeProprietaire)
}
