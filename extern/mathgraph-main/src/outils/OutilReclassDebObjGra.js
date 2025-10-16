/*
 * Created by yvesb on 16/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObj'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilReclassDebObjGra
/**
 * Outil servant à reclasser un objet graphique le plus possible vers le début de la liste des objets créés
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilReclassDebObjGra (app) {
  Outil.call(this, app, 'ReclassDebObjGra', 33020, false)
}

OutilReclassDebObjGra.prototype = new Outil()

OutilReclassDebObjGra.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = NatObj.NTtObj
  app.outilPointageActif.reset()
  app.indication('indRecDeb')
  this.cursor = 'default'
}

OutilReclassDebObjGra.prototype.traiteObjetDesigne = function (elg) {
  const self = this
  const app = this.app
  const list = app.listePr
  if (list.reclasseVersDebutAvecDependants(elg)) {
    /* Modifié version 6.3.0
    elg.metAJour(); // Pour que les dépendances de commentaires et laTeX dynamiques soient remis à jour
    // Réafficher l'élément ne suffit pas car sa place dans le Dom ne chagera pas.
    // Il faut tout réafficher
    */
    list.metAJourParNatureObjet(NatObj.NComouLatex)
    // Des commentaires ou LaTeX dynamiques peuvent avoir à être mis à jours
    list.positionneParNat(NatObj.NComouLatex, false, app.dimf)

    app.reCreateDisplay()
    //
    this.saveFig()
    new AvertDlg(app, 'AvertRecDeb', function () { self.reselect() })
  } else new AvertDlg(app, 'AvertRecImp', function () { self.reselect() })
}
