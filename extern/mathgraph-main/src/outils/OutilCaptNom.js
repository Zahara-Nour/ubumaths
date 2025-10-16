/*
 * Created by yvesb on 31/01/2017.
 */

/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Outil from './Outil'
export default OutilCaptNom
/**
 * Outil servant à capturer un point, un affichage, une marque d'angle ...
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilCaptNom (app) {
  Outil.call(this, app, 'CaptNom', 33024, false, true, true)
}
OutilCaptNom.prototype = new Outil()

OutilCaptNom.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  app.outilPointageActif = app.outilPointageCaptureNom
  /// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //  Dans un exercice de construction, on ne permet pas de déplacer le nom des objets pournis pour la construction  //
  /// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  const list = app.listePr
  if (app.estExercice) {
    for (let i = 0; i < app.nbObjInit; i++) {
      const el = list.get(i)
      if (el.estDeNature(NatObj.NObjNommable)) this.excluDeDesignation(el)
    }
  }

  app.outilPointageActif.aDesigner = NatObj.NObjNommable
  app.outilPointageActif.reset()
  app.indication('indCaptNom')
}

OutilCaptNom.prototype.isWorking = function () {
  return this.app.elementCapture !== null
}
