/*
 * Created by yvesb on 23/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObj'

export default OutilFusionImpConst

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilFusionImpConst (app) {
  // Attention : Pour cet outil le troisième paramètre est "GestionConst" pour que l'icône de app.outilGestionConst soit
  // désactivée quand on désactive l'outil (cet outil n'a pas d'icône)
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'FusionImpConst', -1, false, false, false, false)
}

OutilFusionImpConst.prototype = new Outil()

OutilFusionImpConst.prototype.select = function () {
  const app = this.app
  const list = app.listePr
  Outil.prototype.select.call(this)
  // Il faut détruire toutes les implémentations graphiques pour les recréer pour que l'ordre des objest graphiques
  // dans le SVG de la figure soit le bon
  list.fusionImpConst(app)
  app.reCreateDisplay()
  this.saveFig()
  this.app.activeOutilCapt()
}

OutilFusionImpConst.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsParNatureVisibles(NatObj.NImpProto) > 0)
}
