/*
 * Created by yvesb on 22/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import Button from './Button'
import constantes from '../kernel/constantes'

export default LineStyleButtonForDlg

/**
 * Classe représentant un bouton de choix de style de trait inclus dans une boîte de dialogue
 * @param {MtgApp} app ; L'application propriétaire
 * @param parentPanel du type LineStylePanel qui doit posséder un membre g du typpe gElement qiui contient le bouton physique
 * @param style Le style de trait du type StyleTrait
 * @param fileName Le nom du fichier contenant l'image
 * @param row Le n° de ligne dansle g contenant les images
 * @constructor
 */
function LineStyleButtonForDlg (app, parentPanel, style, fileName, row) {
  Button.call(this, app, fileName, '', constantes.lineStyleWidth, constantes.lineStyleButtonHeight, true, true)
  this.parentPanel = parentPanel
  this.style = style
  this.row = row
  this.build()
  this.container.setAttribute('transform', 'translate(0,' + row * this.h + ')')
  this.container.setAttribute('visibility', 'visible')
  parentPanel.g.appendChild(this.container)
}

LineStyleButtonForDlg.prototype = new Button()

LineStyleButtonForDlg.prototype.singleClickAction = function () {
  this.parentPanel.select(this.style)
}
