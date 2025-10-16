/*
 * Created by yvesb on 05/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObjAdd'
import CSymetrieAxiale from '../objets/CSymetrieAxiale'
import OutilTransfor from './OutilTransfor'
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import CMilieu from '../objets/CMilieu'
import CSegment from '../objets/CSegment'
import CPointImage from '../objets/CPointImage'
import CMarqueAngleDroit from '../objets/CMarqueAngleDroit'
import MotifPoint from '../types/MotifPoint'
import StyleMarqueAngle from '../types/StyleMarqueAngle'
import CMarqueSegment from '../objets/CMarqueSegment'
import StyleMarqueSegment from '../types/StyleMarqueSegment'
import CDroitePerpendiculaire from '../objets/CDroitePerpendiculaire'

export default OutilSymAxiale

/**
 * Outil servant à créer l'image d'un objet dans une symétrie axiale
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilSymAxiale (app) {
  OutilTransfor.call(this, app, 'SymAxiale', 32799)
}

OutilSymAxiale.prototype = new OutilTransfor()

OutilSymAxiale.prototype.select = function () {
  OutilTransfor.prototype.select.call(this)
  const app = this.app
  this.dte = null
  this.objet = null
  this.trans = null // La symétrie utilisée
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NTteDroite
  app.outilPointageCre.reset()
  app.indication('indAxeSym')
}

/* Supprimé car inutile
OutilSymAxiale.prototype.deselect = function() {
  // Si aucune image n'a été créée et qu'on avait créée un symétrie il faut la détruire
  var liste = this.app.listePr;
  if (this.trans === liste.get(liste.longueur() - 1)) {
    this.app.detruitDernierElement();
  }
  OutilTransfor.prototype.deselect.call(this);
}
*/

OutilSymAxiale.prototype.traiteObjetDesigne = function (elg) {
  if (this.dte === null) {
    // frame.indication(getStr("symAxiale2"));
    this.dte = elg
    this.trans = new CSymetrieAxiale(this.app.listePr, null, false, this.dte)
    this.excluDeDesignation(elg)
    this.ajouteClignotementDe(elg)
    this.ajouteObjetsVisuels()
    const app = this.app
    app.outilPointageCre.aDesigner = app.natPourImages()
    this.resetClignotement()
    app.indication('indImTrans')
  } else {
    this.objet = elg
    this.creeObjet()
  }
}

OutilSymAxiale.prototype.clignCentreOuAxe = function () {
  this.ajouteClignotementDe(this.dte)
  this.resetClignotement()
}

OutilSymAxiale.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const b = Color.black
  const stfp = StyleTrait.stfp(list)
  const stfc1 = StyleTrait.stfc(list)
  const stfc2 = StyleTrait.stfc2(list)
  const trans = new CSymetrieAxiale(list, null, false, this.dte)
  app.ajouteObjetVisuel(trans)
  const ptim = new CPointImage(list, null, false, b, true, 0, 0, false, '', 0, MotifPoint.petitRond, false, app.mousePoint, trans)
  app.ajouteObjetVisuel(ptim)
  const mil = new CMilieu(list, null, false, b, true, 0, 0, false, '', 0, MotifPoint.petitRond, false, app.mousePoint, ptim)
  app.ajouteObjetVisuel(mil)
  const seg1 = new CSegment(list, null, false, b, false, stfp, app.mousePoint, mil)
  app.ajouteObjetVisuel(seg1)
  const seg2 = new CSegment(list, null, false, b, false, stfp, mil, ptim)
  app.ajouteObjetVisuel(seg2)
  const ms1 = new CMarqueSegment(list, null, false, b, false, stfc2, StyleMarqueSegment.marqueSimple, seg1)
  app.ajouteObjetVisuel(ms1)
  const ms2 = new CMarqueSegment(list, null, false, b, false, stfc2, StyleMarqueSegment.marqueSimple, seg2)
  app.ajouteObjetVisuel(ms2)
  const perp = new CDroitePerpendiculaire(list, null, false, b, true, 0, 0, true, '', 0, stfc2, 0, app.mousePoint, this.dte)
  app.ajouteObjetVisuel(perp)
  const mad = new CMarqueAngleDroit(list, null, false, b, false, stfc1, StyleMarqueAngle.marqueSimple, 12, perp)
  app.ajouteObjetVisuel(mad)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

/*
OutilSymAxiale.prototype.isReadyForTouchEnd = function() {
  return this.dte !== null;
}
*/

OutilSymAxiale.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilSymAxiale.prototype.isWorking = function () {
  return this.dte !== null
}
