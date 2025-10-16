/*
 * Created by yvesb on 22/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObjAdd'
import Color from '../types/Color'
export default OutilCopierStyle
/**
 * Outil servant à créer un cercle défini apr centre et point
 * @param {MtgApp} app L'application mtgApp propriétaire
 * @constructor
 * @extends Outil
 */
function OutilCopierStyle (app) {
  Outil.call(this, app, 'CopierStyle', 32820, true)
}

OutilCopierStyle.prototype = new Outil()

OutilCopierStyle.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = NatObj.NTtObj
  app.outilPointageActif.reset()
  app.indication('CopSty1')
}

OutilCopierStyle.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  // app.selectColor attend la couleur de base, sans opacité
  const coul = elg.couleur
  app.opacity = elg.couleur.opacity
  app.couleurActive = new Color(coul.red, coul.green, coul.blue)
  if (elg.estDeNature(NatObj.NObjLigne)) {
    app.lineStyle = elg.style.style
    app.thickness = elg.style.strokeWidth
  }
  if (elg.estDeNature(NatObj.NSurface)) {
    app.styleRemplissage = elg.styleRemplissage
  } else {
    if (elg.estDeNature(NatObj.NMarqueSegment)) {
      app.styleMarqueSegment = elg.motif
    } else {
      if (elg.estDeNature(NatObj.NMarqueAngle)) {
        app.styleMarqueAngle = elg.styleMarque
      }
    }
  }
  this.deselect()
  app.outilPalette.select()
}
