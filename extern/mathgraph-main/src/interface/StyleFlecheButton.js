/*
 * Created by yvesb on 09/11/2016.
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

export default StyleFlecheButton

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
function StyleFlecheButton (app, style, fileName, row, col, y) {
  Button.call(this, app, fileName, 'ChoixStyleFleche', constantes.buttonMarqueWidth, constantes.buttonMarqueWidth)
  this.style = style
  this.row = row
  this.col = col
  this.y = y
  this.target = 'right'
  this.build()
  this.container.setAttribute('transform', 'translate(' + col * this.w + ',' + row * this.h + ')')
  app.styleFlechePanel.appendChild(this.container)
  this.container.setAttribute('visibility', 'visible')
}

StyleFlecheButton.prototype = new Button()

StyleFlecheButton.prototype.singleClickAction = function () {
  this.app.styleFleche = this.style
  this.app.selectButton(this.style, this.app.styleFlecheButtons)
}
