/*
 * Created by yvesb on 20/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDemiPlan from '../objets/CDemiPlan'
import OutilParDtPt from './OutilParDtPt'
import { defaultSurfOpacity } from 'src/objets/CMathGraphDoc'
export default OutilDemiPlan
/**
 * Outil servant à créer une droite parallèle
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilDemiPlan (app) {
  OutilParDtPt.call(this, app, 'DemiPlan', 32969, true)
}

OutilDemiPlan.prototype = new OutilParDtPt()

OutilDemiPlan.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'indDemiPl1'
    case 2 : return 'indDemiPl2'
  }
}

/**
 * Spécial version mtgApp. Renvoie l'objet à créer
 * Sera redéfini pour les descendants
 * @param pt
 * @param dt
 */
OutilDemiPlan.prototype.objet = function (pt, dt) {
  const app = this.app
  const coul = app.getCouleur()
  coul.opacity = defaultSurfOpacity
  return new CDemiPlan(app.listePr, null, false, coul, false, app.getStyleRemplissage(), dt, pt)
}

OutilDemiPlan.prototype.isSurfTool = function () {
  return true
}
