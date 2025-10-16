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

export default OutilPunaiserAff
/**
 * Outil servant à marquer un point pour la trace
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPunaiserAff (app) {
  Outil.call(this, app, 'PunaiserAff', 32957, true)
}

OutilPunaiserAff.prototype = new Outil()

OutilPunaiserAff.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.obj = null
  app.outilPointageActif = app.outilPointageObjetClignotant
  app.outilPointageActif.aDesigner = NatObj.NAffLieAPoint
  // On fait clignoter les points mobiles libres
  // app.listeClignotante.ajouteAffichagesVisibles(app.listePr, false)
  app.listeClignotante.addVisibleObjetsFixedOrNot(app.listePr, NatObj.NAffLieAPoint, false)
  app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigner un objet clignotant
  // même lorsqu'il est phase de masquage
  this.resetClignotement()
  app.indication('indPunAff')
}

OutilPunaiserAff.prototype.deselect = function () {
  Outil.prototype.deselect.call(this)
  this.annuleClignotement()
  const app = this.app
  // Il faut tout réafficher pour que les objets qui clignotent soient réaffichés s'ils étaient dans la
  // phase cachés
  app.listePr.update(app.svgFigure, app.doc.couleurFond, true) // true pour que les objets masqués soient masqués
  app.updateActiveTools()
}

OutilPunaiserAff.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  elg.fixed = true
  toast({ title: 'ObPunaise' })
  // S'il n'y a plus rien à punaiser on active l'outil de capture
  if (app.listeClignotante.nbVisibleObjectsFixedOrNot(NatObj.NAffLieAPoint, false, true) === 0) {
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

OutilPunaiserAff.prototype.activationValide = function () {
  return this.app.listePr.nbVisibleObjectsFixedOrNot(NatObj.NAffLieAPoint, false) > 0
}
