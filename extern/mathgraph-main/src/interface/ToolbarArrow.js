/*
 * Created by yvesb on 23/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Button from './Button'
import constantes from '../kernel/constantes'

export default ToolbarArrow

/**
 * Bouton en forme de flèche mis à droite de chaque icône de gauche quand il y a plus d'une icône activable
 * dans la barre déroulante corresponda,te
 * @param {MtgApp} app L'application propriétaire
 * @param expandableb  La mtgExpandableBar associée
 * @constructor
 */
function ToolbarArrow (app, expandableb) {
  Button.call(this, app, app.dys ? 'arrowdys' : 'arrow', expandableb.name, constantes.arrowIconWidth, constantes.leftIconSize, false)
  this.expandableBar = expandableb
  this.build()
  // On informe expandableb (ExpandableToolbar) du bouton flèche associé
  expandableb.toolbarArrow = this
  app.svgPanel.appendChild(this.container)
  // this.arrow.container.setAttribute("visibility","hidden");
}
ToolbarArrow.prototype = new Button()

ToolbarArrow.prototype.montre = function (b) {
  const zf = this.app.zoomFactor
  // Attention : même si b est false, il faut quand même appeler setAttribute car sinon on a un ToolBarArrwo
  // qui traîne au niveau de l'icône de capture.
  this.container.setAttribute('transform', 'translate(' + String(constantes.leftIconSize * zf) + ',' +
    String((this.expandableBar.row + 1) * (constantes.leftIconSize * zf + 2 * zf) + 2 * zf) + ')')
  this.container.setAttribute('visibility', b ? 'visible' : 'hidden')
}

ToolbarArrow.prototype.singleClickAction = function () {
  const eb = this.expandableBar
  if (eb.expanded) { this.app.unFoldExpandableBars() } else {
    this.app.unFoldExpandableBars()
    eb.expand()
  }
}
