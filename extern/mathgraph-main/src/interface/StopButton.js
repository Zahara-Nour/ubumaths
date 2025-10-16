/*
 * Created by yvesb on 25/01/2017.
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

export default StopButton

/**
 * Bouton servant à terminer l'action de certians outils quand on clique dessus
 * @param {MtgApp} app
 * @param fileName
 * @param y
 * @constructor
 */
function StopButton (app, fileName, y) {
  Button.call(this, app, fileName, '', constantes.buttonStopWidth, constantes.buttonStopWidth)
  const zf = app.zoomFactor
  this.y = y
  this.target = 'right'
  this.build()
  const x = (constantes.rightPanelWidth * zf - constantes.buttonStopWidth * zf) / 2
  this.container.setAttribute('transform', 'translate(' + x + ',0)')
  // app.pointStylePanel.appendChild(this.container);
  this.container.setAttribute('visibility', 'visible')
}

StopButton.prototype = new Button()

StopButton.prototype.singleClickAction = function () {
  this.app.outilActif.actionFin()
}
