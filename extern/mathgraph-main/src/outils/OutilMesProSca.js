/*
 * Created by yvesb on 24/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import CProduitScalaire from '../objets/CProduitScalaire'
import NatObj from '../types/NatObj'
import NomMesureDlg from '../dialogs/NomMesureDlg'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilMesProSca

/**
 * Outil servant à créer un polygone
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilMesProSca (app) {
  Outil.call(this, app, 'MesProSca', 33189, true)
}

OutilMesProSca.prototype = new Outil()

OutilMesProSca.prototype.select = function () {
  Outil.prototype.select.call(this)
  this.vect1 = null
  this.vect2 = null
  const app = this.app
  this.listeNoeuds = []
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NVecteur
  app.outilPointageCre.reset()
  app.indication('indVect', 'MesProSca')
}

OutilMesProSca.prototype.traiteObjetDesigne = function (elg) {
  if (this.vect1 === null) {
    this.vect1 = elg
    // frame.indication(getStr("produitScalaire2"));
    this.ajouteClignotementDe(elg)
    this.resetClignotement()
  } else {
    this.vect2 = elg
    this.ajouteClignotementDe(elg)
    this.creeObjet()
  }
}

OutilMesProSca.prototype.creeObjet = function () {
  const self = this
  new NomMesureDlg(this.app, this.tip, function (st) { self.callBackOK(st) }, function () { self.reselect() }, false)
}

OutilMesProSca.prototype.callBackOK = function (st) {
  const self = this
  const app = this.app
  const liste = app.listePr
  const prod = new CProduitScalaire(liste, null, false, st, this.vect1, this.vect2)
  app.ajouteElement(prod)
  if (app.verifieDernierElement(1)) { // Il faut que les extrémités des vecteurs soient nommées
    // Attention : les deux vecteurs peuvent avoir des extrémités en commun
    if (this.vect1.point1.nom === '') {
      this.vect1.point1.donneNom(liste.genereNomPourPoint(false))
      this.vect1.point1.updateName(app.svgFigure, true)
    }
    if (this.vect1.point2.nom === '') {
      this.vect1.point2.donneNom(liste.genereNomPourPoint(false))
      this.vect1.point2.updateName(app.svgFigure, true)
    }
    if (this.vect2.point1.nom === '') {
      this.vect2.point1.donneNom(liste.genereNomPourPoint(false))
      this.vect2.point1.updateName(app.svgFigure, true)
    }
    if (this.vect2.point2.nom === '') {
      this.vect2.point2.donneNom(liste.genereNomPourPoint(false))
      this.vect2.point2.updateName(app.svgFigure, true)
    }
    this.saveFig()
    this.deselect()
    this.select()
  } else {
    new AvertDlg(app, 'DejaCree', function () {
      self.app.activeOutilCapt()
    })
  }
}

OutilMesProSca.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.pointeurLongueurUnite !== null) && (list.nombreObjetsParNatureVisibles(NatObj.NVecteur) !== 0)
}
