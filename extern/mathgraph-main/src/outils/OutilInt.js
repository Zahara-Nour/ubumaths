/*
 * Created by yvesb on 23/12/2016.
 */
import NatObj from '../types/NatObjAdd'
import Nat from '../types/Nat'
import CIntDroiteDroite from '../objets/CIntDroiteDroite'
import CAutrePointIntersectionCercles from '../objets/CAutrePointIntersectionCercles'
import CAutrePointIntersectionDroiteCercle from '../objets/CAutrePointIntersectionDroiteCercle'
import CIntCercleCercle from '../objets/CIntCercleCercle'
import CIntDroiteCercle from '../objets/CIntDroiteCercle'
import CPointLieBipoint from '../objets/CPointLieBipoint'
import Pointeur from '../types/Pointeur'
import Outil from '../outils/Outil'
import Vect from '../types/Vect'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilInt
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

/**
 *
 * @param {MtgApp} app
 * @constructor
 * @extends Outil
 */
function OutilInt (app) {
  Outil.call(this, app, 'Int', 32805, true)
}

OutilInt.prototype = new Outil()

OutilInt.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.elt1 = null
  this.elt2 = null
  this.app.outilPointageActif = app.outilPointageInt
  app.outilPointageInt.aDesigner = Nat.or(NatObj.NTteDroiteSaufVect, NatObj.NTtCercle)
  app.outilPointageCre.reset()
  app.indication('indInt')
}

OutilInt.prototype.traiteObjetDesigne = function (elg, point) {
  if (this.elt1 === null) {
    // frame.indication(getStr("intersection2"));
    this.elt1 = elg
    this.excluDeDesignation(elg)
    this.ajouteClignotementDe(elg)
    this.resetClignotement()
  } else {
    if (this.elt2 === null) {
      this.elt2 = elg
      this.annuleClignotement()
      this.creeObjet(point)
    }
  }
}

/**
 * Fonction appelée par OutilPointageInt quand l'utilisateur a directement cliqué à l'intersection de deux objets
 * @param elt1
 * @param elt2
 * @param point
 */
OutilInt.prototype.traiteObjetsDesignes = function (elt1, elt2, point) {
  this.elt1 = elt1
  this.elt2 = elt2
  this.creeObjet(point)
}

OutilInt.prototype.creeObjet = function (point) {
  let pointIntDejaCree, ptd, ptc, intpoint, ptpl1, ptpl2, ord
  const app = this.app
  const li = app.listePourConst
  const listePr = app.listePr
  const elt1 = this.elt1
  const elt2 = this.elt2
  let existe = false
  let pasDejaCree = true
  let nbObjetsCrees = 0
  let intersectionInutile = new Pointeur(false)
  let inter
  let pointDejaCree = null
  const indiceImpInitial = li.longueur()
  const taille = app.getTaillePoliceNom()

  const coul = app.getCouleur()
  if (elt1.estDeNature(NatObj.NTteDroiteSaufVect) && elt2.estDeNature(NatObj.NTteDroiteSaufVect)) {
    // Cas de l'intersection de deux objets de type droite
    // Technique d'intersection "intelligente"
    // On regarde d'abord s'il existe un point déjà créé qui soit sur un des deux objets
    // et très proche d'un point d'intersection.
    // Si oui on crée un objet de type AutrePointIntersectionCercles
    // A été amélioré par rapport à la version C++ qui ne rgardait pas le cas de deux droites
    pointIntDejaCree = li.pointIntersectionDejaCree(app.estExercice, elt1, elt2)
    if (pointIntDejaCree) {
      // les deux points d'intersection sont déjà créés et sur les deux objets
      new AvertDlg(app, 'ch6')
      this.reselect()
      return false
    } else {
      inter = new CIntDroiteDroite(listePr, null, false, coul, false, 0, 3, false, '', taille, app.getStylePoint(), false, elt1, elt2)
      app.ajouteElement(inter)
      if (app.verifieDernierElement(1)) {
        this.annuleClignotement()
        existe = inter.existe
        nbObjetsCrees = 1
      }
    }
  } else {
    if (elt1.estDeNature(NatObj.NTtCercle) && elt2.estDeNature(NatObj.NTtCercle)) {
      // Cas de l'intersection de deux objets de type cercle
      // Technique d'intersection "intelligente"
      // On regarde d'abord s'il existe un point déjà créé qui soit sur un des deux objets
      // et très proche d'un point d'intersection.
      // Si oui on crée un objet de type AutrePointIntersectionCercles
      pointDejaCree = li.pointIntersectionDejaCree(app.estExercice, elt1, elt2, intersectionInutile)
      if (intersectionInutile.getValue()) {
        // les deux points d'intersection sont déjà créés et sur les deux objets
        new AvertDlg(app, 'ch6')
        this.reselect()
        return false
      } else {
        if (pointDejaCree !== null) {
          // var intpoint = new CAutrePointIntersectionCercles
        // (liste, null, false, coul, false, 0, 3, false, frame.genereNomPourPoint(), frame.pref_indiceTaillePoliceNom,
          // frame.stylePointActif(), (CCercle) elt1, (CCercle) elt2, pointDejaCree, false);
          intpoint = new CAutrePointIntersectionCercles(listePr, null, false, coul, false, 0, 3, false, '', taille,
            app.getStylePoint(), false, elt1, elt2, pointDejaCree)
          app.ajouteElement(intpoint)
          pasDejaCree = app.verifieDernierElement(1)
          if (pasDejaCree) {
            nbObjetsCrees = 1
            // frame.positionne(); // Positionné dans verifieDernierElement
            existe = intpoint.existe
          }
        } else {
          inter = new CIntCercleCercle(listePr, null, false, elt1, elt2)
          app.ajouteElement(inter)
          pasDejaCree = app.verifieDernierElement(1)
          if (pasDejaCree) {
            ptpl1 = new CPointLieBipoint(listePr, null, false, coul, false, 0, 3, false, '', taille, app.getStylePoint(), false, inter, 1)
            ptpl2 = new CPointLieBipoint(listePr, null, false, coul, false, 0, 3, false, '', taille, app.getStylePoint(), false, inter, 2)
            ord = this.ordonne(ptpl1, ptpl2, point)
            ptpl1 = ord[0]
            ptpl2 = ord[1]
            app.ajouteElement(ptpl2) // Le plus lointain du point cliqué en premier
            app.ajouteElement(ptpl1)
            // if (ptpl1.existe) ptpl1.donneNom(frame.genereNomPourPoint());
            // if (ptpl2.existe) ptpl2.donneNom(frame.genereNomPourPoint());
            this.annuleClignotement()
            existe = inter.existe
            nbObjetsCrees = 3
            // frame.editeNomIntersection((CBipoint)inter); A revoir mtgApp
          }
        }
      }
    } else { // cas d'une droite et un cercle
      if (elt1.estDeNature(NatObj.NTteDteSaufVecteur)) {
        ptd = elt1
        ptc = elt2
      } else {
        ptd = elt2
        ptc = elt1
      }
      // Technique d'intersection "intelligente"
      // On regarde d'abord s'il existe un point déjà créé qui soit sur un des deux objets
      // TEchniue pas utilisée quad on a un exercice de construction.
      intersectionInutile = new Pointeur(false)
      pointDejaCree = li.pointIntersectionDejaCree(app.estExercice, ptd, ptc, intersectionInutile)
      if (intersectionInutile.getValue()) {
        // les deux points d'intersection sont déjà créés et sur les deux objets
        new AvertDlg(app, 'ch6')
        this.reselect()
        return false
      } else {
        if (pointDejaCree !== null) {
          // intpoint = new CAutrePointIntersectionDroiteCercle(ptd, ptc, intersectionInutile);
          intpoint = new CAutrePointIntersectionDroiteCercle(listePr, null, false, app.getCouleur(), false, 0, 3, false,
            '', taille, app.getStylePoint(), false, ptc, ptd, pointDejaCree)
          app.ajouteElement(intpoint)
          pasDejaCree = app.verifieDernierElement(1)
          nbObjetsCrees = 1
          existe = intpoint.existe
        } else {
          inter = new CIntDroiteCercle(listePr, null, false, ptd, ptc)
          app.ajouteElement(inter)
          pasDejaCree = app.verifieDernierElement(1)
          if (pasDejaCree) {
            ptpl1 = new CPointLieBipoint(listePr, null, false, coul, false, 0, 3, false, '', taille, app.getStylePoint(), false, inter, 1)
            ptpl2 = new CPointLieBipoint(listePr, null, false, coul, false, 0, 3, false, '', taille, app.getStylePoint(), false, inter, 2)
            ord = this.ordonne(ptpl1, ptpl2, point)
            ptpl1 = ord[0]
            ptpl2 = ord[1]
            app.ajouteElement(ptpl2) // Le plus lointain du point cliqué en premier
            app.ajouteElement(ptpl1)
            existe = inter.existe
            nbObjetsCrees = 3
            // frame.editeNomIntersection((CBipoint)inter); // A revoir version MtgApp
          }
        }
      }
    }
  }
  if (pasDejaCree) {
    if (existe) {
      li.afficheTout(indiceImpInitial, app.svgFigure, true, app.doc.couleurFond)
      this.saveFig()
      this.reselect()
      return true
    } else { // Si les objets ne sont pas sécants ou  alors le seul point à créer existe déjà
      if (pointDejaCree === null) new AvertDlg(app, 'ch109') // Objets non sécants affiché
      else new AvertDlg(app, 'ch6') // Affiché : le ou les points d'intersection existent déjà
      app.detruitDerniersElements(nbObjetsCrees)
      this.reselect() // Ajout version 6.1.0
      return false
    }
  }
}

OutilInt.prototype.ordonne = function (pt1, pt2, point) {
  const dimf = this.app.dimf
  pt1.positionne(false, dimf)
  pt2.positionne(false, dimf)
  const vect1 = new Vect(pt1.x, pt1.y, point.x, point.y)
  const vect2 = new Vect(pt2.x, pt2.y, point.x, point.y)
  const n1 = vect1.norme()
  const n2 = vect2.norme()
  if (n1 < n2) return [pt1, pt2]; else return [pt2, pt1]
}

OutilInt.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilInt.prototype.isPointTool = function () {
  return true
}
