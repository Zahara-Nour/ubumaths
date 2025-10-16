/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import CElementGraphique from './CElementGraphique'
import StyleRemplissage from 'src/types/StyleRemplissage'
import { defaultSurfOpacity } from 'src/objets/CMathGraphDoc'
export default CSurfaceAncetre

/**
 * Classe ancêtre de toutes les surfaces.
 * @constructor
 * @extends CElementGraphique
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleRemplissage} styleRemplissage  Entier donnant le style de remplissage.
 */
function CSurfaceAncetre (listeProprietaire, impProto, estElementFinal, couleur, masque, styleRemplissage) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CElementGraphique.call(this, listeProprietaire)
  else {
    CElementGraphique.call(this, listeProprietaire, impProto, estElementFinal, couleur, true, 0, 0, masque, '', 16)
    this.styleRemplissage = styleRemplissage
  }
}
CSurfaceAncetre.prototype = new CElementGraphique()
CSurfaceAncetre.prototype.constructor = CSurfaceAncetre
CSurfaceAncetre.prototype.superClass = 'CElementGraphique'
CSurfaceAncetre.prototype.className = 'CSurfaceAncetre'

CSurfaceAncetre.prototype.getNature = function () {
  return NatObj.NSurface
}
CSurfaceAncetre.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.styleRemplissage === p.styleRemplissage)
  } else return false
}
CSurfaceAncetre.prototype.chaineDesignation = function () {
  return 'desSurface'
}
CSurfaceAncetre.prototype.peutGenererLieuObjet = function () {
  return false
}

CSurfaceAncetre.prototype.donneStyleRemplissage = function (style) {
  this.styleRemplissage = style
  if (this.pattern !== null) document.getElementById('mtg32_patterns').removeChild(this.pattern)
  if (style !== StyleRemplissage.transp && style !== StyleRemplissage.plein) { this.createPattern() } else this.pattern = null
}

// Spécifique JavaScript
CSurfaceAncetre.prototype.createPattern = function () {
  const mtg32patterns = document.getElementById('mtg32_patterns')
  // Modifié version 6.3.2 car le player ne marchait pas avec des hachures
  // var pat = document.getElementById(this.index + "mtg32pattern");
  const idPattern = this.listeProprietaire.id + this.index + 'mtg32pattern'
  const pat = document.getElementById(idPattern)
  if (pat !== null) mtg32patterns.removeChild(pat)
  const p = cens('pattern')
  this.pattern = p
  const path = cens('path')
  p.setAttribute('patternUnits', 'userSpaceOnUse')
  p.setAttribute('x', '0')
  p.setAttribute('y', '0')
  p.setAttribute('width', '6')
  p.setAttribute('height', '6')
  const style = 'fill:none; stroke:' + this.color + '; stroke-width:0.5;'
  const d = this.getPattern(false)
  path.setAttribute('d', d)
  path.setAttribute('style', style)
  p.appendChild(path)
  // p.setAttribute("id", this.index + "mtg32pattern"); // Modifié version 6.3.2
  p.setAttribute('id', idPattern)
  mtg32patterns.appendChild(p)
}

/**
 * Fonction renvoyant le pattern pour les quadrillages
 * @param bForExport Si true, on exporte la figure et on utilise alors un cadre de 8 sur 8
 * sinon on utilise un cadre de 6 sur 6
 * @param {number} coef  Le coefficient multiplicateur utilisé pour l'exportation (arrondi à l'unité)
 * @returns {string}
 */
CSurfaceAncetre.prototype.getPattern = function (bForExport, coef) {
  if (bForExport) {
    // var coefarr = (coef < 1) ? 1 : Math.round(coef); // On arrondit à l'entier le plus proche si >= 1
    const a3 = String(coef * 3)
    const a6 = String(coef * 6)
    const a5 = String(coef * 6 - 1)
    const a7 = String(coef * 6 + 1)
    switch (this.styleRemplissage) {
      case StyleRemplissage.horizontal:
        return 'M 0 ' + a3 + ' L ' + a6 + ' ' + a3
      case StyleRemplissage.vertical:
        return 'M ' + a3 + ' 0 L ' + a3 + ' ' + a6
      case StyleRemplissage.bas45:
        return 'M 0 0 l ' + a6 + ' ' + a6 + 'M -1 ' + a5 + ' l 2 2 M ' + a5 + ' -1 l 2 2'
      case StyleRemplissage.haut45:
        return 'M 0 ' + a6 + ' l ' + a6 + ' -' + a6 + ' M -1 1 l 2 -2 M ' + a5 + ' ' + a7 + ' l 2 -2'
    }
  } else {
    switch (this.styleRemplissage) {
      case StyleRemplissage.horizontal:
        return 'M 0 3 L 6 3'
      case StyleRemplissage.vertical:
        return 'M 3 0 L 3 6'
      case StyleRemplissage.bas45:
        return 'M 0 0 l 6 6 M -1 5 l 2 2  M 5 -1 l 2 2'
      case StyleRemplissage.haut45:
        return 'M 0 6 l 6 -6 M-1 1 l2 -2 M 5 7 l 2 -2'
    }
  }
}

CSurfaceAncetre.prototype.removePattern = function () {
  // Modifié version 6.3.2 car le player ne marchaitn pas avec des hachures
  // var pattern = document.getElementById(this.index + "mtg32pattern");
  const pattern = document.getElementById(this.listeProprietaire.id + this.index + 'mtg32pattern')
  if (pattern !== null) {
    document.getElementById('mtg32_patterns').removeChild(pattern)
  }
}

// Fonction ajoutée version 6.5.2 pour permettre de modifier directement des éléments de la figure
/**
 * Fonction donnant directement au svg element représentant l'élément graphique la couleur de l'élément
 */
CSurfaceAncetre.prototype.setgColor = function () {
  if (this.g) {
    const style = this.styleRemplissage
    if (style !== StyleRemplissage.transp && style !== StyleRemplissage.plein) {
      // Si le style est un style de hachures, pour changer la couleur il faut appeler donneStyleRemplissage
      this.donneStyleRemplissage(style)
    } else {
      this.g.style.fill = this.couleur.rgbWithoutOpacity()
      this.g.style.fillOpacity = this.couleur.opacity
    }
    return true
  } else return false
}

CSurfaceAncetre.prototype.read = function (inps, list) {
  CElementGraphique.prototype.read.call(this, inps, list)
  // POur les versions antérieures à la version 8.0 (numéro de version 20)
  // l'opacité était globale et donnée par le document propriétaire
  // Sinon elle est enregistrée avec la couleur elle-même
  const numeroVersion = list.numeroVersion
  if (numeroVersion < 20) {
    if (list.documentProprietaire) this.couleur.opacity = list.documentProprietaire.opacity
    else this.couleur.opacity = defaultSurfOpacity
    this.color = this.couleur.rgb()
  }
  this.styleRemplissage = inps.readInt()
}
CSurfaceAncetre.prototype.write = function (oups, list) {
  CElementGraphique.prototype.write.call(this, oups, list)
  oups.writeInt(this.styleRemplissage)
}
