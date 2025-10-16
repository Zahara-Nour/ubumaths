/*
 * Created by yvesb on 12/10/2016.
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

export default ButtonStyleButton

/**
 * @param {MtgApp} app
 * @param style
 * @param fileName
 * @param row
 * @param col
 * @param y
 * @constructor
 * @extends Button
 */
function ButtonStyleButton (app, style, fileName, row, col, y) {
  Button.call(this, app, fileName, 'ChoixStylePoint', constantes.buttonStyleWidth, constantes.buttonStyleWidth)
  this.style = style
  this.row = row
  this.col = col
  this.y = y
  this.target = 'right'
  this.build()
  this.container.setAttribute('transform', 'translate(' + col * this.w + ',' + row * this.h + ')')
  app.pointStylePanel.appendChild(this.container)
  this.container.setAttribute('visibility', 'visible')
}

ButtonStyleButton.prototype = new Button()

ButtonStyleButton.prototype.singleClickAction = function () {
  this.app.stylePoint = this.style
  this.app.selectButton(this.style, this.app.buttonStyleButtons)
}
