/*
 * Created by yvesb on 27/09/2016.
 */

/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CMarqueSegment from '../objets/CMarqueSegment'
import OutilObjetPar1Objet from './OutilObjetPar1Objet'

export default OutilMarqueSeg

/**
 * Outil servant à créer une marque de segemnt
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMarqueSeg (app) {
  OutilObjetPar1Objet.call(this, app, 'MarqueSeg', 33091, true, NatObj.NSegment)
}

OutilMarqueSeg.prototype = new OutilObjetPar1Objet()

OutilMarqueSeg.prototype.indication = function () {
  return 'indSeg'
}

OutilMarqueSeg.prototype.select = function () {
  OutilObjetPar1Objet.prototype.select.call(this)
  const app = this.app
  this.oldThickness = app.getThickness()
  app.selectThickness(2)
}

OutilMarqueSeg.prototype.deselect = function () {
  OutilObjetPar1Objet.prototype.deselect.call(this)
  if (this.oldThickness) this.app.selectThickness(this.oldThickness)
  this.oldThickness = null
}

OutilMarqueSeg.prototype.objet = function (seg) {
  const app = this.app
  return new CMarqueSegment(app.listePr, null, false, app.getCouleur(), false, app.getStyleTrait(),
    app.getStyleMarqueSegment(), seg)
}

// Pas d'objets visuels pour cet outil
OutilMarqueSeg.prototype.ajouteObjetsVisuels = function () {
}

OutilMarqueSeg.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilMarqueSeg.prototype.preIndication = function () {
  return 'MarqueSeg'
}

OutilMarqueSeg.prototype.isSegmentMarkTool = function () {
  return true
}
