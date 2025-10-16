/*
 * Created by yvesb on 23/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import CPointBase from '../objets/CPointBase'
import NatObj from '../types/NatObj'
import Nat from '../types/Nat'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilSuppressionLiaison

/**
 * Outil servant à transformer un point libre en un point lié à u  objet
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilSuppressionLiaison (app) {
  Outil.call(this, app, 'SuppressionLiaison', 32874, true)
}

OutilSuppressionLiaison.prototype = new Outil()

OutilSuppressionLiaison.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.point = null // Pointera sur le point libre qu'on veut lier à un objet
  app.outilPointageActif = app.outilPointageObjetClignotant
  const nature = Nat.or(NatObj.NPointLie, NatObj.NPointLiePoint,
    NatObj.NPointInterieurPolygone, NatObj.NPointInterieurCercle)
  app.listeClignotante.ajouteObjetsParNatureNonMasques(app.listePr, nature)
  app.outilPointageActif.aDesigner = nature
  app.outilPointageActif.reset(false, true)
  this.resetClignotement()
  app.indication('indSupLiaison')
}

OutilSuppressionLiaison.prototype.traiteObjetDesigne = function (elg, point) {
  const list = this.app.listePr
  if (this.point === null) {
    this.point = elg
    const self = this
    if (elg.estDeNature(NatObj.NPointLie) && elg.estElementFinal) {
      new AvertDlg(this.app, 'SupLiaisonImp1', function () { self.app.activeOutilCapt() })
    } else {
      if (list.contientObjetGenereParPointLie(elg)) {
        new AvertDlg(this.app, 'SupLiaisonImp2', function () { self.app.activeOutilCapt() })
      } else this.supprimeLiaison(elg, point)
    }
  }
}

OutilSuppressionLiaison.prototype.supprimeLiaison = function (el, point) {
  const app = this.app
  const list = app.listePr
  this.annuleClignotement()
  // Ligne suivante modifié version 6.4.8 car si le point dont on supprime la liaison est un point lié à un point il n'a
  // pas de membre pointLibre
  const ptBase = new CPointBase(list, null, false, this.point.couleur, this.point.nomMasque, this.point.decX,
    this.point.decY, false, this.point.nom, this.point.tailleNom, this.point.motif, this.point.marquePourTrace,
    false, point.x, point.y)
  ptBase.tag = this.point.tag // Ajout version 6.6.0
  list.remplaceObjet(this.point, ptBase)
  list.remplacePoint(this.point, ptBase)
  list.updateIndexes()
  this.point.removegElement(app.svgFigure)
  const coulFond = app.doc.couleurFond
  list.metAJour() // Ajout version 6.3.0
  ptBase.positionne(false, app.dimf)
  ptBase.creeAffichage(app.svgFigure, false, coulFond)
  list.positionne(false, app.dimf)
  list.update(app.svgFigure, coulFond, true)
  this.saveFig()
  app.activeOutilCapt()
}
