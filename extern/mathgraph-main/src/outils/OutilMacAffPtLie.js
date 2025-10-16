/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CMacroAffectationPointLie from '../objets/CMacroAffectationPointLie'
import AvertDlg from '../dialogs/AvertDlg'
import MacAffPtLieDlg from '../dialogs/MacAffPtLieDlg'
import NatObj from '../types/NatObj'
import CAffLiePt from '../objets/CAffLiePt'

export default OutilMacAffPtLie

/**
 * Outil servant à mesurer en créer une macro déplaçant un point lié à l'endroit occupé par un autre point lié
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacAffPtLie (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacAffPtLie', 33055)
}

OutilMacAffPtLie.prototype = new OutilMac()

OutilMacAffPtLie.prototype.select = function () {
  OutilMac.prototype.select.call(this)
  this.ptLie = null
}

OutilMacAffPtLie.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const list = app.listePr
  if (this.mac === null) {
    this.addComClign(point)
    this.mac = new CMacroAffectationPointLie(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null,
      16, false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
      CAffLiePt.alignVerTop, '', '', null, null)
    new MacAffPtLieDlg(app, this.mac, false,
      function () {
        app.outilPointageActif = app.outilPointageObjetClignotant
        app.outilPointageActif.aDesigner = NatObj.NPointLie
        app.listeClignotante.ajouteObjetsParNatureNonMasques(list, NatObj.NPointLie)
        app.outilPointageActif.aDesigner = NatObj.NPointLie
        app.outilPointageActif.reset(false, true)
        app.indication('indMacAffPtLie1')
      },
      function () {
        app.activeOutilCapt()
      })
  } else {
    if (this.ptLie === null) {
      this.ptLie = elg
      // On regarde s'il y a un autre point lié au même objet que elg
      if (list.nombrePointsLiesAVisibles(elg)) {
        new AvertDlg(app, 'ErrMAfPtLie', function () {
          app.activeOutilCapt()
        })
      } else {
        this.annuleClignotement()
        this.ajouteClignotementDe(this.ptLie)
        this.excluDeDesignation(this.ptLie)
        app.indication('indMacAffPtLie2')
        this.mac.pointLieAPositionner = elg
        // On fait clignoter les points liés au même objet
        const ob = this.ptLie.lieA()
        for (let i = 0; i < list.longueur(); i++) {
          const elb = list.get(i)
          if (elb.estDeNature(NatObj.NPointLie)) {
            if (elb.existe && (elb !== this.ptLie) && (elb.lieA() === ob)) {
              app.listeClignotante.add(elb)
            }
          }
        }
        this.resetClignotement()
      }
    } else {
      this.mac.pointLieAssocie = elg
      this.annuleClignotement()
      this.creeObjet()
    }
  }
}
