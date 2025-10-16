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

export default OutilReclassFinObjGra
/**
 * Outil servant à reclasser un objet graphique le plus possible vers le début de la liste des objets créés
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilReclassFinObjGra (app) {
  Outil.call(this, app, 'ReclassFinObjGra', 33018, false)
}

OutilReclassFinObjGra.prototype = new Outil()

OutilReclassFinObjGra.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = NatObj.NTtObj
  app.outilPointageActif.reset()
  app.indication('indRecFin')
  this.cursor = 'default'
}

OutilReclassFinObjGra.prototype.traiteObjetDesigne = function (elg) {
  const self = this
  const app = this.app
  const list = app.listePr
  // Si on reclasse vers la fin un objet graphique qui est l'image d'un autre par une transformation
  // et que c'est le seul objet image par cette transformation on reclasse la transformation vers la fin
  if (elg.estImageParTrans()) { if (list.nombreImagesParTransformation(elg.transformation) === 1) elg = elg.transformation }

  if (list.reclasseVersFinAvecDependants(elg)) {
    // elg.metAJour(); // Pour que les dépendances de commentaires et laTeX dynamiques soient remis à jour
    // list.metAJourObjetsDependantDe(elg);
    list.metAJourParNatureObjet(NatObj.NComouLatex)
    // Des commentaires ou LaTeX dynamiques peuvent avoir à être mis à jours
    list.positionneParNat(NatObj.NComouLatex, false, app.dimf)
    // Réafficher l'élément ne suffit pas car sa place dans le Dom ne chagera pas.
    // Il faut tout réafficher
    app.reCreateDisplay()
    //
    this.saveFig()
    new AvertDlg(app, 'AvertRecFin', function () { self.reselect() })
  } else new AvertDlg(app, 'AvertRecImp', function () { self.reselect() })
}
