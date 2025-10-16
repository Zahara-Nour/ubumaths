/*
 * Created by yvesb on 25/06/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Nat from '../types/Nat'
import NatObj from '../types/NatObjAdd'
import CPointClone from '../objets/CPointClone'
import CDroiteClone from '../objets/CDroiteClone'
import CSegmentClone from '../objets/CSegmentClone'
import CDemiDroiteClone from '../objets/CDemiDroiteClone'
import CCercleClone from '../objets/CCercleClone'
import OutilObjetPar1Objet from './OutilObjetPar1Objet'
import AvertDlg from '../dialogs/AvertDlg'
import CArcClone from 'src/objets/CArcClone'
export default OutilObjetClone

/**
 * Outil servant à créer le dupliqué d'un objet
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilObjetClone (app) {
  OutilObjetPar1Objet.call(this, app, 'ObjetClone', 33068, true, Nat.or(NatObj.NTtPoint, NatObj.NDroite, NatObj.NSegment,
    NatObj.NDemiDroite, NatObj.NCercle, NatObj.NArc), false)
}

OutilObjetClone.prototype = new OutilObjetPar1Objet()

OutilObjetClone.prototype.indication = function () {
  return 'indClone'
}

OutilObjetClone.prototype.objet = function (ob) {
  const app = this.app
  const list = app.listePr
  const couleur = app.getCouleur()
  const taille = app.getTaillePoliceNom()
  const styleTrait = app.getStyleTrait()
  new AvertDlg(this.app, 'cloneCree') // Ajout version 6.4.2
  if (ob.estDeNature(NatObj.NTtPoint)) {
    return new
    CPointClone(list, null, false, couleur, false, 0, 3, false, '', taille, app.getStylePoint(), false, ob)
  } else {
    switch (ob.getNature()) {
      case NatObj.NTtPoint :
        return new CPointClone(list, null, false, couleur, false, 0, 3, false, '', taille, app.getStylePoint(), false, ob)
      case NatObj.NDroite :
        return new CDroiteClone(list, null, false, couleur, false, 0, 0, false, '', taille, styleTrait, 0.9, ob)
      case NatObj.NSegment :
        return new CSegmentClone(list, null, false, couleur, false, styleTrait, ob)
      case NatObj.NDemiDroite :
        return new CDemiDroiteClone(list, null, false, couleur, false, styleTrait, ob)
      case NatObj.NCercle:
        return new CCercleClone(list, null, false, couleur, false, styleTrait, ob)
      case NatObj.NArc:
        return new CArcClone(list, null, false, couleur, false, styleTrait, ob)
    }
  }
}

// Pas d'objets visuels pour cet outil
OutilObjetClone.prototype.ajouteObjetsVisuels = function () {
}

OutilObjetClone.prototype.isReadyForTouchEnd = function () {
  return false
}
