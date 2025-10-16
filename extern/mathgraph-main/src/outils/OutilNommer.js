/*
 * Created by yvesb on 02/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Outil from './Outil'
import EntreeNomDlg from '../dialogs/EntreeNomDlg'
export default OutilNommer
/**
 * Outil servant à créer une droite horizontale
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilNommer (app) {
  Outil.call(this, app, 'Nommer', -1, true, true, true)
}

OutilNommer.prototype = new Outil()

OutilNommer.prototype.select = function () {
  Outil.prototype.select.call(this)
  let i, el
  const app = this.app
  this.obj = null
  app.outilPointageActif = app.outilPointageCre
  /// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //      Dans un exercice de construction, on ne permet pas de nommer les objets pournis pour la construction      //
  /// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  const list = app.listePr
  if (app.estExercice) {
    for (i = 0; i < app.nbObjInit; i++) {
      el = list.get(i)
      if (el.estDeNature(NatObj.NObjNommable)) this.excluDeDesignation(el)
    }
  }
  // On ne permet pas de nommer une droite clone
  for (i = 0; i < list.longueur(); i++) {
    el = list.get(i)
    if (el.className === 'CDroiteClone') this.excluDeDesignation(el)
  }
  /// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  app.outilPointageCre.aDesigner = NatObj.NObjNommable
  app.outilPointageCre.reset()
  app.indication('indPtOuDte')
}

OutilNommer.prototype.deselect = function () {
  this.obj = null
  Outil.prototype.deselect.call(this)
}

OutilNommer.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  // if (app.lastDlgId() === "nomDlg") return;
  this.obj = elg
  this.ajouteClignotementDe(this.obj)
  this.resetClignotement()
  new EntreeNomDlg(app, this.obj)
}
