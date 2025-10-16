/*
 * Created by yvesb on 07/10/2016.
 */
import { cens } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Color from '../types/Color'
import constantes from '../kernel/constantes'
import Button from './Button'

export default OneColorButton

// y est l'ordonnée réelle du coin supérieur gauche du bouton relativement à la barre d'outils de droite
function OneColorButton (app, red, green, blue, row, col, y) {
  Button.call(this, app, '', 'ChoixCouleur', constantes.colorButtonWidth, constantes.colorButtonHeight)
  const zf = app.zoomFactor
  this.red = red
  this.green = green
  this.blue = blue
  this.row = row
  this.color = new Color(red, green, blue)
  this.col = col
  this.y = y
  this.target = 'right'
  this.build()
  // On rajoute un rectangle de couleur la couleur du bouton
  const rect = cens('rect', {
    x: 2 * zf,
    y: 2 * zf,
    width: this.w - 4,
    height: this.h - 4,
    fill: this.color.rgb(),
    stroke: 'black',
    'fill-opacity': 1
  })
  this.container.appendChild(rect)
  this.container.setAttribute('transform', 'translate(' + (2 * zf + col * this.w) + ',' + row * this.h + ')')
  app.colorPanel.appendChild(this.container)
  this.container.setAttribute('visibility', 'visible')
}

OneColorButton.prototype = new Button()

OneColorButton.prototype.singleClickAction = function () {
  const app = this.app
  app.couleurActive = this.color
  app.colorChoicePanel.update()
  if (app.outilActif.isSurfTool()) app.updatePreviewSurf()
}
