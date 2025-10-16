/*
 * Created by yvesb on 10/10/2016.
 */

/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSurfaceAncetre from '../objets/CSurfaceAncetre'
import { chaineNombre } from '../kernel/kernel'
import StyleRemplissage from '../types/StyleRemplissage'

export default CSurfaceAncetre
/**
 * Fonction renvoyant true si lieu est un des bors de la surface.
 * @param {CLieuDeBase} lieu
 * Utilisé quand on change le nombre de points d'un lieu. Il faut alors recréer les tableaux
 * utilisé par les surfaces ayant lieu pour bord.
 * @returns {boolean}
 */
CSurfaceAncetre.prototype.aPourBord = function (lieu) {
  return false
}

CSurfaceAncetre.prototype.tikzFillStyle = function () {
  const tikzCoul = this.tikzCouleur()
  const op = ', opacity = ' + chaineNombre(this.couleur.opacity, 2)
  switch (this.styleRemplissage) {
    case StyleRemplissage.horizontal:
      return '[pattern = horizontal lines, pattern color=' + tikzCoul + op + ']'
    case StyleRemplissage.vertical:
      return '[pattern = vertical lines, pattern color=' + tikzCoul + op + ']'
    case StyleRemplissage.bas45:
      return '[pattern = north west lines, pattern color=' + tikzCoul + op + ']'
    case StyleRemplissage.haut45:
      return '[pattern = north east lines, pattern color=' + tikzCoul + op + ']'
    case StyleRemplissage.plein:
      return '[color = ' + tikzCoul + ', opacity = 1' + ']'
    case StyleRemplissage.transp:
      return '[color = ' + tikzCoul + op + ']'
    default:
      return ''
  }
}
