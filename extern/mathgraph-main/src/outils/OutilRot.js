/*
 * Created by yvesb on 03/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObjAdd'
import CConstante from '../objets/CConstante'
import CValeurAngle from '../objets/CValeurAngle'
import CRotation from '../objets/CRotation'
import RotationDlg from '../dialogs/RotationDlg'
import OutilTransfor from './OutilTransfor'
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import CSegment from '../objets/CSegment'
import CPointImage from '../objets/CPointImage'
import CMarqueAngleOriente from '../objets/CMarqueAngleOriente'
import MotifPoint from '../types/MotifPoint'
import StyleMarqueAngle from '../types/StyleMarqueAngle'
import StyleFleche from '../types/StyleFleche'

export default OutilRot

/**
 * Outil servant à créer l'image d'un objet par une rotation
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilRot (app) {
  OutilTransfor.call(this, app, 'Rot', 32803)
}

OutilRot.prototype = new OutilTransfor()

OutilRot.prototype.select = function () {
  OutilTransfor.prototype.select.call(this)
  const app = this.app
  this.point = null
  this.objet = null
  this.trans = null
  this.imageDejaCree = false
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NTtPoint
  app.outilPointageCre.reset()
  app.indication('indCentRot')
}

OutilRot.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  // if (app.lastDlgId() === "rotDlg") return;
  const li = app.listePr
  if (this.point === null) {
    this.point = elg
    const ang = new CValeurAngle(li, new CConstante(li, 0))
    this.trans = new CRotation(li, null, false, elg, ang)
    this.excluDeDesignation(this.point)
    this.ajouteClignotementDe(this.point)
    this.resetClignotement() // Sous Chrome, si on fait clignoter le centre le curseur de la boîte de dialogue ne clignote plus ...
    // this.annuleClignotement();
    const self = this
    new RotationDlg(this.app, this.trans, false, function () { self.actionApresDlg() }, function () { self.reselect() })
    // Version JavaScript : Ne peut pas être ici. Est lancé par le dialogue quand on le valide
    // this.ajouteObjetsVisuels();
    // app.outilPointageCre.aDesigner = NatObj.NTtObj;
  } else {
    this.objet = elg
    this.creeObjet()
  }
}

OutilRot.prototype.actionApresDlg = function () {
  const app = this.app
  this.ajouteObjetsVisuels()
  this.app.indication('indImTrans')
  this.app.outilPointageCre.aDesigner = app.natPourImages()
  this.trans.positionne(false, this.app.dimf)
}

OutilRot.prototype.clignCentreOuAxe = function () {
  this.ajouteClignotementDe(this.point)
  this.resetClignotement()
}

OutilRot.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const b = Color.black
  const stfp = StyleTrait.stfp(list)
  const stfc = StyleTrait.stfc(list)
  const seg1 = new CSegment(list, null, false, b, false, stfp, this.point, app.mousePoint)
  app.ajouteObjetVisuel(seg1)
  const ptim = new CPointImage(list, null, false, b, true, 0, 0, false, '', 13, MotifPoint.petitRond, false, app.mousePoint, this.trans)
  app.ajouteObjetVisuel(ptim)
  const seg2 = new CSegment(list, null, false, b, false, stfp, this.point, ptim)
  app.ajouteObjetVisuel(seg2)
  const marque = new CMarqueAngleOriente(list, null, false, b, false, stfc, StyleMarqueAngle.marqueSimple, 18,
    app.mousePoint, this.point, ptim, StyleFleche.FlecheLonguePleine)
  app.ajouteObjetVisuel(marque)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilRot.prototype.isWorking = function () {
  return this.point !== null
}
