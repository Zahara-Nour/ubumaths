/*
 * Created by yvesb on 23/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import CBarycentre from '../objets/CBarycentre'
import CValeur from '../objets/CValeur'
import CNoeudPondere from '../objets/CNoeudPondere'
import CAffLiePt from '../objets/CAffLiePt'
import CCommentaire from '../objets/CCommentaire'
import NatObj from '../types/NatObj'
import AvertDlg from '../dialogs/AvertDlg'
import ConfirmDlg from '../dialogs/ConfirmDlg'
import CoefBarycentreDlg from '../dialogs/CoefBarycentreDlg'
import Color from '../types/Color'
import StyleEncadrement from '../types/StyleEncadrement'
export default OutilBarycentre

/**
 * Outil servant à créer un barycentre
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilBarycentre (app) {
  Outil.call(this, app, 'Barycentre', 32804, true)
}

OutilBarycentre.prototype = new Outil()

OutilBarycentre.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const listeNoeuds = []
  this.bar = new CBarycentre(app.listePr, null, false, app.getCouleur(), false, 3, 0, false, '',
    app.getTaillePoliceNom(), app.getStylePoint(), false, listeNoeuds)
  this.tabcom = []
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NTtPoint
  app.outilPointageCre.reset()
  app.indication('indBar1', 'Barycentre')
  this.resetClignotement()
}

OutilBarycentre.prototype.deselect = function () {
  const len = this.tabcom.length
  if (len > 0) {
    for (let i = 0; i < len; i++) {
      this.app.svgFigure.removeChild(this.tabcom[i].g)
    }
  }
  Outil.prototype.deselect.call(this)
  this.app.showStopButton(false)
}

OutilBarycentre.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const list = app.listePr
  const ln = this.bar.col
  const self = this
  const noeud = new CNoeudPondere(list, elg, new CValeur(list, 1))
  ln.push(noeud)
  this.ajouteClignotementDe(elg)
  this.excluDeDesignation(elg)
  app.nameEditor.montre(false) // Pour que si on recommence l'éditeur de nom disparaisse
  new CoefBarycentreDlg(app, this.bar, noeud, false, function () {
    self.actionApresDlgOK()
  },
  function () {
    ln.pop()
    self.enleveDeClign(elg)
    app.listeExclusion.col.pop() // Pour pouvoir à nouveau désigner le même point
  })
  if (ln.length >= 2) app.showStopButton(true)
}

OutilBarycentre.prototype.actionApresDlgOK = function () {
  const app = this.app
  const doc = app.doc
  const list = app.listePr
  const ln = this.bar.col
  const noeud = ln[ln.length - 1]
  const point = noeud.pointAssocie
  const coef = noeud.poids
  if (ln.length >= 2) app.showStopButton(true)
  const com = new CCommentaire(list, null, false, Color.blue, 0, 0, 0, 10, false, point, 16, false, StyleEncadrement.Simple,
    new Color(230, 230, 246), CAffLiePt.alignHorCent, CAffLiePt.alignVerTop,
    coef.chaineInfo())
  com.positionne(false, app.dimf)
  com.creeAffichage(app.svgFigure, false, doc.couleurFond)
  this.ajouteClignotementDe(com)
  this.tabcom.push(com)
}

OutilBarycentre.prototype.actionFin = function () {
  const app = this.app
  const self = this
  // On regarde si le barycentre existe
  let sum = 0
  for (let i = 0; i < this.bar.col.length; i++) sum += this.bar.col[i].poids.valeur
  if (sum === 0) {
    new AvertDlg(app, 'ErrBar')
    this.bar = null
  } else {
    app.ajouteElement(this.bar)
    this.annuleClignotement()
    if (app.verifieDernierElement(1)) {
      // On vérifie que le cercle n'est pas hors-fenêtre
      if (this.bar.dansFen()) this.finitAction()
      else {
        new ConfirmDlg(app, 'HorsFen', function () {
          self.finitAction()
        }, function () {
          self.app.detruitDernierElement()
          self.reselect()
        })
      }
    } else {
      new AvertDlg(app, 'DejaCree', function () {
        self.reselect()
      })
    }
  }
}

OutilBarycentre.prototype.finitAction = function () {
  const app = this.app
  this.bar.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
  this.saveFig()
  this.reselect()
}

OutilBarycentre.prototype.isPointTool = function () {
  return true
}
