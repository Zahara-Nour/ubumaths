/*
 * Created by yvesb on 11/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// y est l'ordonnée réelle du coin supérieur gauche du bouton relativement à la barre d'outils de droite
import Button from './Button'
import constantes from '../kernel/constantes'
import { getStr } from 'src/kernel/kernel'

export default StyleRemplissageButton

/**
 *
 * @param {MtgApp} app
 * @param style
 * @param fileName
 * @param row
 * @param col
 * @param y
 * @constructor
 */
function StyleRemplissageButton (app, style, fileName, row, col, y) {
  Button.call(this, app, fileName, 'ChoixStyleRemp', constantes.buttonFillWidth, constantes.buttonFillHeight)
  this.style = style
  this.row = row
  this.col = col
  this.y = y
  this.target = 'right'
  let tip
  switch (fileName) {
    case 'styleRempPlein':
      tip = getStr('opaque')
      break
    case 'styleRempTransp':
      tip = getStr('transp')
      break
    default:
      tip = getStr('hachure')
  }
  this.tip = tip
  this.build()
  this.container.setAttribute('transform', 'translate(' + col * this.w + ',' + row * this.h + ')')
  app.styleRemplissagePanel.appendChild(this.container)
  this.container.setAttribute('visibility', 'visible')
}

StyleRemplissageButton.prototype = new Button()

StyleRemplissageButton.prototype.singleClickAction = function () {
  this.app.styleRemplissage = this.style
  this.app.selectButton(this.style, this.app.styleRemplissageButtons)
  this.app.updatePreviewSurf()
}
