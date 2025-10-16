/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import NomMesureDlg from 'src/dialogs/NomMesureDlg'
import NatObj from 'src/types/NatObj'
import CMesureX from 'src/objets/CMesureX'
import CMesureY from 'src/objets/CMesureY'
import CValeur from 'src/objets/CValeur'
import CResultatValeur from 'src/objets/CResultatValeur'
import CMatrice from 'src/objets/CMatrice'
import NatCal from 'src/types/NatCal'

export default OutilMatriceCoord

/**
 * Outil servant à créer un matrice dynamique de coordonnées de points sur lesquels on clique
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMatriceCoord (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'MatriceCoord', 32052, false, false, false, false)
}

OutilMatriceCoord.prototype = new Outil()

OutilMatriceCoord.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const self = this
  this.listePoints = []
  new NomMesureDlg(this.app, 'NomMat',
    function (st, rep) {
      self.nomMat = st
      self.rep = rep
      app.outilPointageActif = app.outilPointageCre
      app.outilPointageCre.aDesigner = NatObj.NTtPoint
      app.outilPointageCre.reset()
      self.resetClignotement()
      app.indication('ClicPts', self.preIndication())
    },
    function () {
      app.activeOutilCapt()
    }, true, 'NomMat')
}

OutilMatriceCoord.prototype.deselect = function () {
  this.listePoints = null
  Outil.prototype.deselect.call(this)
  this.app.showStopButton(false)
}

OutilMatriceCoord.prototype.traiteObjetDesigne = function (elg) {
  this.listePoints.push(elg)
  this.ajouteClignotementDe(elg)
  this.excluDeDesignation(elg)
  if (this.listePoints.length > 1) this.app.showStopButton(true)
}

OutilMatriceCoord.prototype.creeObjet = function () {
  // On crée des mesures des abscisses et des ordonnées de points cliqués
  const app = this.app
  const list = app.listePr
  const listePoints = this.listePoints
  const nbPts = listePoints.length
  const tabmesabs = []
  const tabmesord = []
  for (let i = 0; i < nbPts; i++) {
    const pt = listePoints[i]
    if (pt.nom === '') {
      pt.donneNom(list.genereNomPourPointOuDroite('M', true))
      pt.nomMasque = true
    }
    const mesabs = new CMesureX(list, null, false,
      list.genereNomPourCalcul('mesx', true), this.rep, listePoints[i])
    tabmesabs.push(mesabs)
    const mesord = new CMesureY(list, null, false,
      list.genereNomPourCalcul('mesy', true), this.rep, listePoints[i])
    tabmesord.push(mesord)
    app.ajouteElement(mesabs)
    app.ajouteElement(mesord)
  }
  // On crée une matrice de deux colonnes formées des mesures d'abscisses en première colonne
  // et d'ordonnées en deuxième
  const tabVal = []
  for (let i = 0; i < nbPts; i++) {
    const lig = []
    for (let j = 0; j < 2; j++) {
      lig.push(new CValeur(list, new CResultatValeur(list, tabmesabs[i])))
      lig.push(new CValeur(list, new CResultatValeur(list, tabmesord[i])))
    }
    tabVal.push(lig)
  }
  const mat = new CMatrice(list, null, false, this.nomMat, nbPts, 2, tabVal)
  app.ajouteElement(mat)
  this.saveFig()
  app.activeOutilCapt()
  app.showStopButton(false)
}

OutilMatriceCoord.prototype.actionFin = function () {
  this.annuleClignotement()
  this.creeObjet()
}

OutilMatriceCoord.prototype.preIndication = function () {
  return 'MatriceCoord'
}

OutilMatriceCoord.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}
