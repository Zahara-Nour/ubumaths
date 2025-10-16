/*
 * Created by yvesb on 24/06/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObjAdd'
// import NatObjAdd from '../types/NatObjAdd'
import CConstante from '../objets/CConstante'
import CValeur from '../objets/CValeur'
import CInversion from '../objets/CInversion'
import HomothetieDlg from '../dialogs/InversionDlg'
import OutilTransfor from './OutilTransfor'
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import CSegment from '../objets/CSegment'
import CPointImage from '../objets/CPointImage'
import MotifPoint from '../types/MotifPoint'

export default OutilImageInv

/**
 * Outil servant à créer l'image d'un objet par une homothétie
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilImageInv (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  OutilTransfor.call(this, app, 'ImageInv', 33028, false)
}

OutilImageInv.prototype = new OutilTransfor()

OutilImageInv.prototype.select = function () {
  OutilTransfor.prototype.select.call(this)
  const app = this.app
  this.point = null
  this.objet = null
  this.trans = null
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NTtPoint
  app.outilPointageCre.reset()
  app.indication('indCentSim')
}

OutilImageInv.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  // if (app.lastDlgId() === "homothetieDlg") return;
  const li = app.listePr
  if (this.point === null) {
    this.point = elg
    const rap = new CValeur(li, new CConstante(li, 1))
    this.trans = new CInversion(li, null, false, elg, rap)
    this.excluDeDesignation(this.point)
    this.ajouteClignotementDe(this.point)
    this.resetClignotement() // Sous Chrome, si on fait clignoter le centre le curseur de la boîte de dialogue ne clignote plus ...
    const self = this
    new HomothetieDlg(this.app, this.trans, false, function () { self.actionApresDlg() }, function () { self.reselect() })
    // Version JavaScript : Ne peut pas être ici. Est lancé par le dialogue quand on le valide
    // this.ajouteObjetsVisuels();
    // app.outilPointageCre.aDesigner = NatObj.NTtObj;
  } else {
    this.objet = elg
    this.creeObjet()
  }
}

OutilImageInv.prototype.actionApresDlg = function () {
  this.ajouteObjetsVisuels()
  this.app.indication('indImTrans')
  this.app.outilPointageCre.aDesigner = NatObj.NTtPoint
  this.trans.positionne(false)
}

OutilImageInv.prototype.clignCentreOuAxe = function () {
  this.ajouteClignotementDe(this.point)
  this.resetClignotement()
}

OutilImageInv.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const b = Color.black
  const stfp = StyleTrait.stfp(list)
  const ptim = new CPointImage(list, null, false, b, true, 0, 0, false, '', 16, MotifPoint.petitRond, false, app.mousePoint, this.trans)
  app.ajouteObjetVisuel(ptim)
  const seg1 = new CSegment(list, null, false, b, false, stfp, this.point, ptim)
  app.ajouteObjetVisuel(seg1)
  this.trans.positionne(false)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}
