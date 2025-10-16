/*
 * Created by yvesb on 11/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import NatObj from '../types/NatObj'
import Outil from './Outil'
import addQueue from '../kernel/addQueue'
import toast from '../interface/toast'

export default OutilDepunaiserAff
/**
 * Outil servant à marquer un point pour la trace
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilDepunaiserAff (app) {
  Outil.call(this, app, 'DepunaiserAff', 32958, true)
}

OutilDepunaiserAff.prototype = new Outil()

OutilDepunaiserAff.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.obj = null
  app.outilPointageActif = app.outilPointageObjetClignotant
  app.outilPointageActif.aDesigner = NatObj.NAffLieAPoint
  // On fait clignoter les points mobiles libres
  // app.listeClignotante.ajouteAffichagesVisibles(app.listePr, true)
  app.listeClignotante.addVisibleObjetsFixedOrNot(app.listePr, NatObj.NAffLieAPoint, true)
  app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigner un objet clignotant
  // même lorsqu'il est phase de masquage
  this.resetClignotement()
  app.indication('indDepunAff')
}

OutilDepunaiserAff.prototype.deselect = function () {
  Outil.prototype.deselect.call(this)
  this.annuleClignotement()
  const app = this.app
  // Il faut tout réafficher pour que les objets qui clignotent soient réaffichés s'ils étaient dans la
  // phase cachés
  app.listePr.update(app.svgFigure, app.doc.couleurFond, true) // true pour que les objets masqués soient masqués
  app.updateActiveTools()
}

OutilDepunaiserAff.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  elg.fixed = false
  toast({ title: 'ObDepunaise' })
  // S'il n'y a plus rien à punaiser on active l'outil de capture
  if (app.listeClignotante.nbVisibleObjectsFixedOrNot(NatObj.NAffLieAPoint, true, true) === 0) {
    this.deselect()
    addQueue(() => {
      this.saveFig() // Appelé sur la queue ppour que les objets masqués pa le clignotement soient démasqués
      app.updateActiveTools()
    })
    app.activeOutilCapt()
  } else {
    this.annuleClignotement()
    // On utilise un addQueue pour passer après le rétablissement à visible des objets masqués par le clignotement
    addQueue(() => {
      this.saveFig() // Appelé sur la queue ppour que les objets masqués pa le clignotement soient démasqués
      app.updateActiveTools()
      this.reselect()
    })
  }
}
OutilDepunaiserAff.prototype.activationValide = function () {
  return this.app.listePr.nbVisibleObjectsFixedOrNot(NatObj.NAffLieAPoint, true) > 0
}
