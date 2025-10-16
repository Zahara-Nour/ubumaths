/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import StyleRemplissage from '../types/StyleRemplissage'
import CSurfaceAncetre from './CSurfaceAncetre'
export default CSurface

/**
 * Classe ancêtre des surfaces définies par un bord.
 * @constructor
 * @extends CSurfaceAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleRemplissage} styleRemplissage  Entier donnant le style de remplissage.
 * @param {CLieuDeBase|CCercle} bord  Le bord de la surface.
 * @returns {CSurface}
 */
function CSurface (listeProprietaire, impProto, estElementFinal, couleur, masque, styleRemplissage, bord) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CSurfaceAncetre.call(this, listeProprietaire)
  else {
    CSurfaceAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, styleRemplissage)
    this.bord = bord
  }
  this.pattern = null
}

CSurface.prototype = new CSurfaceAncetre()
CSurface.prototype.constructor = CSurface
CSurface.prototype.superClass = 'CSurfaceAncetre'
CSurface.prototype.className = 'CSurface'

CSurface.prototype.confonduAvec = function (p) {
  let res = CSurfaceAncetre.prototype.confonduAvec.call(this, p)
  if (!res) return false
  res = res && (this.bord === p.bord)
  return res
}
CSurface.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CSurfaceAncetre.prototype.depDe.call(this, p) || this.bord.depDe(p))
}
CSurface.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.bord.dependDePourBoucle(p)
}
CSurface.prototype.dependDePourCapture = function (p) {
  return (p === this) || this.bord.dependDePourCapture(p)
}
CSurface.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.bord.existe
}
// Spécial JavaScript : ne sera redéfini que pour CSurfaceDisque;
// Chaque surface bordée par une polyline devra définir creePoints()
CSurface.prototype.createg = function (svg, couleurFond) {
  let opacity, style
  // color = this.couleur.rgb() Modifié version 4.9.9.4
  const color = this.couleur.rgbWithoutOpacity()
  const pol = cens('polyline')
  switch (this.styleRemplissage) {
    case StyleRemplissage.transp:
    case StyleRemplissage.plein:
      opacity = (this.styleRemplissage === StyleRemplissage.transp) ? this.couleur.opacity : 1
      style = 'stroke:none;'
      style += 'fill-opacity:' + opacity + ';'
      style += 'fill:' + color + ';'
      pol.setAttribute('style', style)
      break
    default :
      // Modifié version 6.3.2 car le player n'était pas compatible avec les hachures
      // style = "stroke:none;" + "fill:url(#" + this.index + "mtg32pattern);";
      style = 'stroke:none;' + 'fill:url(#' + this.listeProprietaire.id + this.index + 'mtg32pattern);'

      this.createPattern()
      pol.setAttribute('style', style)
  }
  pol.setAttribute('points', this.creePoints())
  // if (this.listeProprietaire != null) pol.setAttribute("id",this.id);
  // Ligne suivante modifiée version 6.5.2
  // pol.setAttribute('pointer-events', 'none')
  pol.setAttribute('pointer-events', this.pointerevents)
  return pol
}
CSurface.prototype.trace = function (svg, couleurFond) {
  const g = this.createg(svg, couleurFond)
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
// Spécial JavaScript : Update se sera redéfini que pour CSurfaceDisque
CSurface.prototype.update = function (svg, couleurFond) {
  const oldg = this.g
  const g = this.createg(svg, couleurFond)
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  this.g = g
  if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
}
CSurface.prototype.read = function (inps, list) {
  CSurfaceAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.bord = list.get(ind1, 'CElementGraphique')
}
CSurface.prototype.write = function (oups, list) {
  CSurfaceAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.bord)
  oups.writeInt(ind1)
}
