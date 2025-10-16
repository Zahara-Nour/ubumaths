/*
 * Created by yvesb on 13/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import NatObj from '../types/NatObjAdd'
import CSymetrieCentrale from '../objets/CSymetrieCentrale'
import OutilTransfor from './OutilTransfor'
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import CMilieu from '../objets/CMilieu'
import CSegment from '../objets/CSegment'
import CPointImage from '../objets/CPointImage'
import MotifPoint from '../types/MotifPoint'
import CMarqueSegment from '../objets/CMarqueSegment'
import StyleMarqueSegment from '../types/StyleMarqueSegment'

export default OutilSymCentrale

/**
 * Outil servant à créer l'image d'un objet dans une symétrie axiale
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilSymCentrale (app) {
  OutilTransfor.call(this, app, 'SymCentrale', 32802)
}

OutilSymCentrale.prototype = new OutilTransfor()

OutilSymCentrale.prototype.select = function () {
  OutilTransfor.prototype.select.call(this)
  const app = this.app
  this.centre = null
  this.objet = null
  this.trans = null // La symétrie utilisée
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NTtPoint
  app.outilPointageCre.reset()
  app.indication('indCentSym')
}

OutilSymCentrale.prototype.traiteObjetDesigne = function (elg) {
  if (this.centre === null) {
    // frame.indication(getStr("symCentrale2"));
    this.centre = elg
    this.trans = new CSymetrieCentrale(this.app.listePr, null, false, elg)
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

OutilSymCentrale.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const b = Color.black
  const stfp = StyleTrait.stfp(list)
  const stfc2 = StyleTrait.stfc2(list)
  const sym = new CSymetrieCentrale(list, null, false, this.centre)
  app.ajouteObjetVisuel(sym)
  const ptim = new CPointImage(list, null, false, b, true, 0, 0, false, '', 0, MotifPoint.petitRond, false, app.mousePoint, sym)
  app.ajouteObjetVisuel(ptim)
  const mil = new CMilieu(list, null, false, b, true, 0, 0, true, '', 0, MotifPoint.petitRond, false, app.mousePoint, ptim)
  app.ajouteObjetVisuel(mil)
  const seg1 = new CSegment(list, null, false, b, false, stfp, app.mousePoint, mil)
  app.ajouteObjetVisuel(seg1)
  const seg2 = new CSegment(list, null, false, b, false, stfp, mil, ptim)
  app.ajouteObjetVisuel(seg2)
  const ms1 = new CMarqueSegment(list, null, false, b, false, stfc2, StyleMarqueSegment.marqueSimple, seg1)
  app.ajouteObjetVisuel(ms1)
  const ms2 = new CMarqueSegment(list, null, false, b, false, stfc2, StyleMarqueSegment.marqueSimple, seg2)
  app.ajouteObjetVisuel(ms2)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

/*
OutilSymCentrale.prototype.isReadyForTouchEnd = function() {
  return this.centre !== null;
}
*/

OutilSymCentrale.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilSymCentrale.prototype.isWorking = function () {
  return this.centre !== null
}
