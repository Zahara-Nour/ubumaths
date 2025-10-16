/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import OutilMatriceCoord from 'src/outils/OutilMatriceCoord'
import CMesureX from 'src/objets/CMesureX'
import CMesureY from 'src/objets/CMesureY'
import CValeur from 'src/objets/CValeur'
import CResultatValeur from 'src/objets/CResultatValeur'
import CMatrice from 'src/objets/CMatrice'
import CImplementationProto from 'src/objets/CImplementationProto'
import { getStr } from 'src/kernel/kernel'
import NomMesureDlg from 'src/dialogs/NomMesureDlg'
import NatObj from 'src/types/NatObj'
import NatCal from 'src/types/NatCal'

export default OutilDtReg

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilDtReg (app) {
  Outil.call(this, app, 'DtReg', 32054, true)
}

OutilDtReg.prototype = new OutilMatriceCoord()

OutilDtReg.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  const list = app.listePr
  const self = this
  this.listePoints = []
  if (app.listePr.nombreObjetsCalcul(NatCal.NRepere) === 1) {
    this.suite(list.genereNomPourCalcul('mat', false), list.premierRepVis())
  } else {
    new NomMesureDlg(this.app, 'NomMat',
      function (st, rep) {
        self.suite(st, rep)
      },
      function () {
        app.activeOutilCapt()
      }, true, 'NomMat')
  }
}

OutilDtReg.prototype.suite = function (st, rep) {
  const app = this.app
  this.nomMat = st
  this.rep = rep
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NTtPoint
  app.outilPointageCre.reset()
  this.resetClignotement()
  app.indication('ClicPts', this.preIndication())
}

OutilDtReg.prototype.creeObjet = function () {
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
  // On implèmente la macro construction
  const proto = app.docConsAv.getPrototype('DteReg')
  proto.get(0).elementAssocie = this.rep // Le repère
  proto.get(1).elementAssocie = mat // La matrice créée
  const impProto = new CImplementationProto(list, proto)
  impProto.implemente(app.dimf, proto)
  impProto.nomProto = getStr('DtReg')
  const dte = impProto.premierFinal(NatObj.NTteDroite)
  dte.donneCouleur(app.getCouleur())
  dte.donneStyle(app.getStyleTrait())
  const indImpProto = list.indexOf(impProto)
  list.positionne(false, app.dimf)
  list.afficheTout(indImpProto, app.svgFigure, true, app.doc.couleurFond)
  // On sauve la figure et on active l'outil de capture
  this.annuleClignotement()
  this.saveFig()
  app.activeOutilCapt()
  app.showStopButton(false)
}

OutilDtReg.prototype.preIndication = function () {
  return 'DtReg'
}

OutilDtReg.prototype.isLineTool = function () {
  return true
}
