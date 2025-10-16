/*
 * Created by yvesb on 06/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import ModificationObjNumDlg from '../dialogs/ModificationObjNumDlg'
import AvertDlg from '../dialogs/AvertDlg'
import NatCal from '../types/NatCal'
export default OutilModifObjNum

/**
 * Outil servant à modifier un objet qui a été créé par un menu
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilModifObjNum (app) {
  Outil.call(this, app, 'ModifObjNum', 32023, true, true)
}

OutilModifObjNum.prototype = new Outil()

OutilModifObjNum.prototype.select = function () {
  const app = this.app
  if (app.estExercice && !this.existeObjNumModifiable()) {
    new AvertDlg(app, 'NoObjNum', function () {
      app.activeOutilCapt()
    })
    return
  }
  Outil.prototype.select.call(this)
  new ModificationObjNumDlg(app, function () {
    app.activeOutilCapt()
  })
}

OutilModifObjNum.prototype.existeObjNumModifiable = function () {
  const app = this.app
  const list = app.listePr
  for (let i = app.nbObjInit; i < list.longueur(); i++) {
    const el = list.get(i)
    if (el.estDeNatureCalcul(NatCal.NTteValROuC) && el.modifiableParMenu()) return true
  }
  return false
}
