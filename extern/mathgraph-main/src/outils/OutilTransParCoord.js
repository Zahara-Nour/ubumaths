/*
 * Created by yvesb on 10/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import NatCal from '../types/NatCal'
import CVecteur from '../objets/CVecteur'
import CTranslationParCoord from '../objets/CTranslationParCoord'
import OutilTransfor from './OutilTransfor'
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import StyleFleche from '../types/StyleFleche'
import CPointImage from '../objets/CPointImage'
import MotifPoint from '../types/MotifPoint'
import CValeur from '../objets/CValeur'
import TransParCoordDlg from '../dialogs/TransParCoordDlg'

export default OutilTransParCoord

/**
 * Outil servant à créer l'image d'un objet dans une translation
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilTransParCoord (app) {
  OutilTransfor.call(this, app, 'TransParCoord', 33035, true)
}

OutilTransParCoord.prototype = new OutilTransfor()

OutilTransParCoord.prototype.select = function () {
  const app = this.app
  const list = app.listePr
  const self = this
  OutilTransfor.prototype.select.call(this)
  this.trans = new CTranslationParCoord(list, null, false, new CValeur(list, 0, new CValeur(list, 0)))
  new TransParCoordDlg(this.app, this.trans, false, function () { self.actionApresDlg() }, function () { self.app.activeOutilCapt() })
}

OutilTransParCoord.prototype.actionApresDlg = function () {
  const app = this.app
  // app.ajouteElement(this.trans);
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = app.natPourImages()
  app.outilPointageCre.reset()
  this.ajouteObjetsVisuels()
  app.indication('indImTrans')
}

OutilTransParCoord.prototype.traiteObjetDesigne = function (elg) {
  this.objet = elg
  this.creeObjet()
}

OutilTransParCoord.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const b = Color.black
  const stfp = new StyleTrait(list, StyleTrait.styleTraitPointille, 1)
  // CTranslationParCoord transx = new CTranslationParCoord(liste, null, false, trans.rep, trans.x, new CValeurAssocieeAVariable(liste, 0));
  const transx = new CTranslationParCoord(list, null, false, this.trans.x, new CValeur(list, 0), this.trans.rep)
  // CPointImage ptimx = new CPointImage(liste, null, false, frame.couleurActive(),
  //  MotifPoint.PetitRond, 13, pane.pointSouris, transx);
  const ptimx = new CPointImage(list, null, false, b, true, 0, 0, true, '', 16, MotifPoint.petitRond,
    false, app.mousePoint, transx)
  app.ajouteObjetVisuel(transx)
  app.ajouteObjetVisuel(ptimx)
  const vecx = new CVecteur(list, null, false, Color.blue, false, stfp, app.mousePoint, ptimx, StyleFleche.FlecheCourtePleine)
  app.ajouteObjetVisuel(vecx)
  const transy = new CTranslationParCoord(list, null, false, new CValeur(list, 0), this.trans.y, this.trans.rep)
  app.ajouteObjetVisuel(transy)
  const ptimy = new CPointImage(list, null, false, b, true, 0, 0, true, '', 16, MotifPoint.petitRond,
    false, ptimx, transy)
  app.ajouteObjetVisuel(ptimy)
  app.ajouteObjetVisuel(this.trans)
  const ptim = new CPointImage(list, null, false, b, true, 0, 0, false, '', 16, MotifPoint.petitRond, false, app.mousePoint, this.trans)
  app.ajouteObjetVisuel(ptim)
  const vecy = new CVecteur(list, null, false, Color.green, false, stfp, ptimx, ptim, StyleFleche.FlecheCourtePleine)
  app.ajouteObjetVisuel(vecy)
  const vec = new CVecteur(list, null, false, b, false, stfp, app.mousePoint, ptim, StyleFleche.FlecheCourtePleine)
  app.ajouteObjetVisuel(vec)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilTransParCoord.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}
