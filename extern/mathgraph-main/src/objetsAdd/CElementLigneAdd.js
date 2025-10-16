/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CElementLigne from '../objets/CElementLigne'
import CElementGraphique from '../objets/CElementGraphique'
import StyleTrait from '../types/StyleTrait'
import { chaineNombre } from '../kernel/kernel'
export default CElementLigne

CElementLigne.prototype.tikzLineStyle = function (dimf, coefmult) {
  let ep // Epaisseur
  const style = this.style
  const tikzCoul = this.tikzCouleur()
  // Si on réduit la figure on réduit l'épaisseur de trait mais si on l'agrandit on garde la même
  const coef = (coefmult > 1) ? 1 : coefmult
  switch (style.style) {
    case StyleTrait.styleTraitContinu:
      ep = 0.4 * coef * style.strokeWidth
      return '[color=' + tikzCoul + ' , ' + 'line width = ' + chaineNombre(ep, 2) + ']'
    case StyleTrait.styleTraitPointille:
      ep = 0.4 * coef * style.strokeWidth
      return '[color=' + tikzCoul + ' , dotted, line width = ' + chaineNombre(ep, 2) + ']'
    case StyleTrait.styleTraitTrait:
      ep = 0.4 * coef * style.strokeWidth
      return '[color=' + tikzCoul + ' , dashed, line width = ' + chaineNombre(ep, 2) + ']'
    case StyleTrait.styleTraitPointPoint:
      ep = 0.4 * coef * style.strokeWidth
      return '[color=' + tikzCoul + ' , ' +
        'dash pattern=on 3pt off 1pt on 1pt off 1pt on 1pt off 1pt, line width = ' + chaineNombre(ep, 2) + ']'
    case StyleTrait.styleTraitPointPointPoint:
      ep = 0.4 * coef * style.strokeWidth
      return '[color=' + tikzCoul + ' , ' +
        'dash pattern=on 3pt off 1pt on 1pt off 1pt on 1pt off 1pt on 1pt off 1pt, line width = ' + chaineNombre(ep, 2) + ']'
    case StyleTrait.styleTraitTraitLongTrait:
      ep = 0.4 * coef * style.strokeWidth
      return '[color=' + tikzCoul + ' , ' +
        'dash pattern=on 3pt off 0.9pt on 1.5pt off 0.9pt, line width = ' + chaineNombre(ep, 2) + ']'
    default:
      return ''
  }
}

CElementLigne.prototype.tikzLineStyleContinu = function (dimf, coefmult) {
  // Si on réduit la figure on réduit l'épaisseur de trait mais si on l'agrandit on garde la même
  const coef = (coefmult > 1) ? 1 : coefmult
  const ep = 0.4 * coef * this.style.strokeWidth // Epaisseur
  return '[color=' + this.tikzCouleur() + ' , ' + 'line width = ' + chaineNombre(ep, 2) + ']'
}

CElementLigne.prototype.tikzdrawFillStyle = function (dimf, coefmult) {
  let ep // Epaisseur
  const tikzCoul = this.tikzCouleur()
  const style = this.style
  switch (this.style.style) {
    case StyleTrait.styleTraitContinu:
      ep = 0.4 * coefmult * style.strokeWidth
      return '[draw=' + tikzCoul + ' , ' + 'fill=' + tikzCoul + ',line width = ' + chaineNombre(ep, 3) + ']'
    case StyleTrait.styleTraitPointille:
      ep = 0.4 * coefmult * style.strokeWidth
      return '[draw=' + tikzCoul + ' , ' + 'fill=' + tikzCoul + ', dotted, ' + 'line width = ' + chaineNombre(ep, 3) + ']'
    case StyleTrait.styleTraitTrait:
      ep = 0.4 * coefmult * style.strokeWidth
      return '[draw=' + tikzCoul + ' , ' + 'fill=' + tikzCoul + ', dashed, ' + 'line width = ' + chaineNombre(ep, 3) + ']'
    case StyleTrait.styleTraitPointPoint:
      ep = 0.4 * coefmult * style.strokeWidth
      return '[draw=' + tikzCoul + ' , ' + 'fill=' + tikzCoul + ', dash pattern=on 3pt off 1pt on 1pt off 1pt on 1pt off 1pt, ' +
        'line width = ' + chaineNombre(ep, 3) + ']'
    case StyleTrait.styleTraitTraitLongTrait:
      ep = 0.4 * coefmult * style.strokeWidth
      return '[draw=' + tikzCoul + ' , ' + 'fill=' + tikzCoul + ', dash pattern=on 9pt off 3pt on 5pt off 3pt, ' +
        'line width = ' + chaineNombre(ep, 3) + ']'
    default:
      return ''
  }
}

CElementLigne.prototype.adaptRes = function (coef) {
  CElementGraphique.prototype.adaptRes.call(this, coef)
  this.style.strokeWidth *= coef
  this.style.stroke = this.style.getStrokeByCoef(coef)
}
