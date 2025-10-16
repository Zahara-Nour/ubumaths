/*
 * Created by yvesb on 13/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import Nat from '../types/Nat'
import NatObj from '../types/NatObjAdd'
import CVecteur from '../objets/CVecteur'
import CTranslation from '../objets/CTranslation'
import CTransParVect from '../objets/CTransParVect'
import OutilTransfor from './OutilTransfor'
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import StyleFleche from '../types/StyleFleche'
import CPointImage from '../objets/CPointImage'
import MotifPoint from '../types/MotifPoint'

export default OutilTrans

/**
 * Outil servant à créer l'image d'un objet dans une translation
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilTrans (app) {
  OutilTransfor.call(this, app, 'Trans', 32845)
}

OutilTrans.prototype = new OutilTransfor()

OutilTrans.prototype.select = function () {
  OutilTransfor.prototype.select.call(this)
  const app = this.app
  this.pt1 = null
  this.pt2 = null
  this.vect = null // Eventuellement le vecteur utilisé
  this.trans = null // La translation
  this.vecteurClignotant = null
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = Nat.or(NatObj.NTtPoint, NatObj.NVecteur)
  app.outilPointageCre.reset()
  app.indication('indTrans1')
}

OutilTrans.prototype.deselect = function () {
  // Si aucune image n'a été créée et qu'on avait créée un translation il faut la détruire
  OutilTransfor.prototype.deselect.call(this)
  // if (this.vecteurClignotant !== null) this.app.svgFigure.removeChild(this.vecteurClignotant.g);
  if (this.vecteurClignotant !== null) this.vecteurClignotant.removegElement(this.app.svgFigure)
}

OutilTrans.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const list = app.listePr
  if ((this.vect !== null) || ((this.pt1 !== null) && (this.pt2 !== null))) {
    // Possibilité d'image multiples
    // Création d'images multiples possibles
    this.objet = elg
    this.creeObjet()
  } else {
    const ades = app.natPourImages()
    if (elg.estDeNature(NatObj.NVecteur)) {
      if (this.vect === null) {
        this.excluDeDesignation(elg)
        this.vect = elg
        this.ajouteObjetsVisuels()
        this.ajouteClignotementDe(elg)
        this.resetClignotement()
        app.outilPointageCre.aDesigner = ades
        app.indication('indImTrans')
        this.trans = new CTransParVect(list, null, false, elg)
      }
    } else {
      if (this.pt1 === null) {
        // frame.indication(getStr("translation2"));
        this.pt1 = elg
        this.ajouteClignotementDe(elg)
        app.outilPointageCre.aDesigner = NatObj.NTtPoint
        this.resetClignotement()
        app.indication('indTrans2')
      } else {
        if (this.pt2 === null) {
          // frame.indication(getStr("translation3"));
          this.pt2 = elg
          // Le vecteur servant aux clignotements
          this.vecteurClignotant = new CVecteur(list, null, false, Color.blue, false,
            new StyleTrait(list, StyleTrait.styleTraitContinu, 2),
            this.pt1, this.pt2, StyleFleche.FlecheLonguePleine)
          this.vecteurClignotant.positionne()
          this.ajouteObjetsVisuels()
          // this.ajouteClignotementDe(elg);
          this.vecteurClignotant.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
          this.ajouteClignotementDe(this.vecteurClignotant)
          app.outilPointageCre.aDesigner = ades
          app.indication('indImTrans')
          this.trans = new CTranslation(list, null, false, this.pt1, elg)
        }
      }
    }
  }
}

OutilTrans.prototype.ajouteObjetsVisuels = function () {
  let trans
  const app = this.app
  const list = app.listeObjetsVisuels
  const b = Color.black
  const stfp = new StyleTrait(list, StyleTrait.styleTraitPointille, 1)
  if (this.vect !== null) trans = new CTransParVect(list, null, false, this.vect)
  else trans = new CTranslation(list, null, false, this.pt1, this.pt2)
  app.ajouteObjetVisuel(trans)
  const ptim = new CPointImage(list, null, false, b, true, 0, 0, false, '', 0, MotifPoint.petitRond, false, app.mousePoint, trans)
  app.ajouteObjetVisuel(ptim)
  const vec = new CVecteur(list, null, false, b, false, stfp, app.mousePoint, ptim, StyleFleche.FlecheLongueSimple)
  app.ajouteObjetVisuel(vec)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilTrans.prototype.clignCentreOuAxe = function () {
  if (this.vecteurClignotant !== null) {
    this.ajouteClignotementDe(this.vecteurClignotant)
    this.resetClignotement()
  }
}

OutilTrans.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilTrans.prototype.isWorking = function () {
  return (this.pt2 !== null || this.vect !== null)
}
