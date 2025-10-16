/*
 * Created by yvesb on 25/03/2017.
 */
/**
 * Outil servant à créer un point défini par son abscisse relativement à deux autres
 * Si les points ne sont pas nommés, un nom leur sera attribué
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
import OutilPar2Pts from '../outils/OutilPar2Pts'
import CValeur from '../objets/CValeurAngle'
import CPointParAbscisse from '../objets/CPointParAbscisse'
import PtParAbsDlg from '../dialogs/PtParAbsDlg'
import CConstante from '../objets/CConstante'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilPtParAbs

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilPtParAbs (app) {
  // Dernier  paramètre false pour que ce ne soit pas OutilPar2Pts qui appelle reselect() car il ne aut pas appeler
  // reselecct() avant qua la oîte de dialogue ne femrme
  OutilPar2Pts.call(this, app, 'PtParAbs', 32889, true, false)
}

OutilPtParAbs.prototype = new OutilPar2Pts()

OutilPtParAbs.prototype.indication = function (ind) {
  switch (ind) {
    case 1: return 'intPtParAbs1'
    case 2: return 'intPtParAbs2'
  }
}

OutilPtParAbs.prototype.nomsPointsIndisp = function () {
  return true
}

OutilPtParAbs.prototype.creeObjet = function () {
  const app = this.app
  const self = this
  // if (app.lastDlgId() === "angleArcDlg") return;
  const li = app.listePr
  const abs = new CValeur(li, new CConstante(li, 1))
  this.pt = new CPointParAbscisse(li, null, false, app.getCouleur(), false, 0, 3, false, '', app.getTaillePoliceNom(),
    app.getStylePoint(), false, this.point1, this.point2, abs)
  new PtParAbsDlg(this.app, this.pt, false, function () { self.actionApresDlgOK() }, function () { self.reselect() })
}

OutilPtParAbs.prototype.actionApresDlgOK = function () {
  const app = this.app
  const self = this
  app.ajouteElement(this.pt)
  if (app.verifieDernierElement(1)) {
    this.objetCree = true // Por  que les noms attribués ne disparaissent pas
    this.pt.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    this.annuleClignotement() // Pour que le centre clignotant ne soit pas enregistré comme caché
    this.saveFig()
    this.reselect()
  } else {
    new AvertDlg(app, 'DejaCree', function () {
      self.reselect()
    })
  }
}

OutilPtParAbs.prototype.preIndication = function () {
  return 'PtParAbs'
}

OutilPtParAbs.prototype.isPointTool = function () {
  return true
}
