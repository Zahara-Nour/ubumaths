/*
 * Created by yvesb on 25/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import NatObj from '../types/NatObjAdd'
export default OutilCreationLiaisonAff

/**
 * Outil servant à transformer un point libre en un point lié à u  objet
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilCreationLiaisonAff (app) {
  Outil.call(this, app, 'CreationLiaisonAff', 32878, true)
}

OutilCreationLiaisonAff.prototype = new Outil()

OutilCreationLiaisonAff.prototype.select = function () {
  Outil.prototype.select.call(this)
  this.aff = null
  const app = this.app
  this.aff = null // Pointera sur le point libre qu'on veut lier à un objet
  app.outilPointageActif = app.outilPointageObjetClignotant
  app.listeClignotante.ajouteAffichagesLiesAPointVisibles(app.listePr, false)
  app.outilPointageActif.aDesigner = NatObj.NAffLieAPoint
  app.outilPointageActif.reset(false, true)
  this.resetClignotement()
  app.indication('indCrLiaisonAff1')
}

OutilCreationLiaisonAff.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  if (this.aff === null) {
    this.aff = elg
    // On n'exclut pas pointPourTrace d'une désignation possible car le point lié peut être égal
    // au point générateur du lieu
    this.annuleClignotement()
    app.outilPointageActif = app.outilPointageCre
    app.outilPointageActif.aDesigner = NatObj.NTtPoint
    app.outilPointageActif.reset()
    this.ajouteClignotementDe(elg)
    this.resetClignotement()
    app.indication('indCrLiaisonAff2')
  } else this.creeLiaison(elg)
}

OutilCreationLiaisonAff.prototype.creeLiaison = function (pt) {
  const app = this.app
  const list = app.listePr
  this.annuleClignotement()
  this.aff.pointLie = pt
  const indicePoint = list.indexOf(pt)
  // Si l'objet auquel on veut lier l'affichage est un élément final de construction
  // il faut reclasser après le dernier objet final de la construction
  const indiceAff = this.aff.estElementFinal ? list.indexOf(this.aff.impProto.dernierObjetFinal()) : list.indexOf(this.aff)

  if (indiceAff < indicePoint) list.decaleDependants(indiceAff, indicePoint)
  // Il faut remettre à jour les index de chaque élément de la liste (CElementBase.index)
  list.updateIndexes()
  list.metAJour() // Ajout version 6.3.0
  list.positionne(false, app.dimf)
  list.update(app.svgFigure, app.doc.couleurFond, true)
  this.saveFig()
  app.reInitConst()
  app.activeOutilCapt()
}

OutilCreationLiaisonAff.prototype.activationValide = function () {
  return this.app.listePr.nombreAffichagesLiesAPointVisibles(false) > 0
}
