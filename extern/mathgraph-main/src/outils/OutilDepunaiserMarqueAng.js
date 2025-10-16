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

export default OutilDepunaiserMarqueAng
/**
 * Outil servant à marquer un point pour la trace
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilDepunaiserMarqueAng (app) {
  Outil.call(this, app, 'DepunaiserMarqueAng', 32960, true)
}

OutilDepunaiserMarqueAng.prototype = new Outil()

OutilDepunaiserMarqueAng.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.obj = null
  app.outilPointageActif = app.outilPointageObjetClignotant
  app.outilPointageActif.aDesigner = NatObj.NMarqueAngle
  // On fait clignoter les points mobiles libres
  // app.listeClignotante.ajouteMarquesAngVisibles(app.listePr, true)
  app.listeClignotante.addVisibleObjetsFixedOrNot(app.listePr, NatObj.NMarqueAngle, true)
  app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigné un objet clignotant
  // même lorsqu'il est phase de masquage
  this.resetClignotement()
  app.indication('indDepunAff')
}

OutilDepunaiserMarqueAng.prototype.deselect = function () {
  Outil.prototype.deselect.call(this)
  this.annuleClignotement()
  const app = this.app
  // Il faut tout réafficher pour que les objets qui clignotent soient réaffichés s'ils étaient dans la
  // phase cachés
  app.listePr.update(app.svgFigure, app.doc.couleurFond, true) // true pour que les objets masqués soient masqués
  app.updateActiveTools()
}

OutilDepunaiserMarqueAng.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  elg.fixed = false
  toast({ title: 'ObDepunaise' })
  // S'il n'y a plus rien à punaiser on active l'outil de capture
  if (app.listeClignotante.nbVisibleObjectsFixedOrNot(NatObj.NMarqueAngle, true, true) === 0) {
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

OutilDepunaiserMarqueAng.prototype.activationValide = function () {
  return this.app.listePr.nbVisibleObjectsFixedOrNot(NatObj.NMarqueAngle, true) > 0
}
