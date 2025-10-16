/*
 * Created by yvesb on 11/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// y est l'ordonnée réelle du coin supérieur gauche du bouton relativement à la barre d'outils de droite
import Button from './Button'
import Constantes from '../kernel/constantes'

export default LineStyleButton

/**
 *
 * @param {MtgApp} app
 * @param style
 * @param fileName
 * @param row
 * @param y
 * @constructor
 */
function LineStyleButton (app, style, fileName, row, y) {
  Button.call(this, app, fileName, 'ChoixStyleTrait', Constantes.lineStyleWidth, Constantes.lineStyleButtonHeight)
  this.style = style
  this.row = row
  this.y = y
  this.target = 'right'
  this.build()
  this.container.setAttribute('transform', 'translate(0,' + row * this.h + ')')
  this.container.setAttribute('visibility', 'visible')
  app.gLineStyle.appendChild(this.container)
}

LineStyleButton.prototype = new Button()

LineStyleButton.prototype.singleClickAction = function () {
  this.app.lineStyle = this.style
  this.app.selectButton(this.style, this.app.lineStyleButtons)
}
