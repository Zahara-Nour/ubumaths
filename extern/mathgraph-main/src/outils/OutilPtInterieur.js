/*
 * Created by yvesb on 23/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import CPointInterieurCercle from '../objets/CPointInterieurCercle'
import CPointInterieurPolygone from '../objets/CPointInterieurPolygone'
import NatObj from '../types/NatObj'
import Nat from '../types/Nat'
import Pointeur from '../types/Pointeur'
import CSurfacePolygone from '../objets/CSurfacePolygone'
import CSurfaceDisque from '../objets/CSurfaceDisque'
import Color from '../types/Color'
import StyleRemplissage from '../types/StyleRemplissage'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilPtInterieur

/**
 * Outil servant à créer un point intérieur à un disque ou à un polygone
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilPtInterieur (app) {
  Outil.call(this, app, 'PtInterieur', 33009, true)
}

OutilPtInterieur.prototype = new Outil()

OutilPtInterieur.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.obj = null // L'objet auquel le point qui sera créé sera intérieur
  app.outilPointageActif = app.outilPointageObjetClignotant
  const nature = Nat.or(NatObj.NCercle, NatObj.NPolygone)
  app.listeClignotante.ajouteObjetsParNatureNonMasques(app.listePr, nature)
  app.outilPointageActif.aDesigner = nature
  app.outilPointageActif.reset(false, true)
  this.resetClignotement()
  app.indication('indPtInt1', 'PtInterieur')
}

OutilPtInterieur.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const liste = app.listePr
  if (this.obj === null) {
    this.obj = elg
    this.annuleClignotement()
    this.ajouteClignotementDe(elg)
    app.outilPointageActif = app.outilPointageClic
    app.outilPointageActif.reset()
    // frame.indication(getStr("pointInterieur2"));
    this.ajouteObjetsVisuels()
    this.resetClignotement()
    app.indication('indPtInt2', 'PtInterieur')
  } else {
    const self = this
    const x = point.x
    const y = point.y
    let bpointInt = false
    if (this.obj.estDeNature(NatObj.NPolygone)) {
      // On regarde si le point cliqué est bien intérieur au objgone
      if (this.obj.pointInterieur(x, y)) {
        const estSurCote = new Pointeur(false)
        const indicePremierSommet = new Pointeur(0)
        const alpha = new Pointeur(0)
        const beta = new Pointeur(0)
        const gamma = new Pointeur(0)
        bpointInt = this.obj.determinePositionInterieure(x, y, indicePremierSommet, estSurCote, alpha, beta, gamma)
        if (bpointInt) {
          const pointInterieurPolygone = new CPointInterieurPolygone(liste, null, false, app.getCouleur(), false, 0, 3,
            false, '', app.getTaillePoliceNom(), app.getStylePoint(), false, false, this.obj, estSurCote.getValue(),
            indicePremierSommet.getValue(), alpha.getValue(), beta.getValue(), gamma.getValue())
          pointInterieurPolygone.positionne(false, app.dimf)
          if (pointInterieurPolygone.existe) this.creeObjet(pointInterieurPolygone)
          else bpointInt = false
        }
      }
      if (!bpointInt) new AvertDlg(app, 'PtIntDlg1', function () { self.app.activeOutilCapt() })
      app.activeOutilCapt()
    } else {
      // On regarde si le point cliqué est bien intérieur au cercle
      bpointInt = this.obj.pointInterieur(x, y)
      if (bpointInt) {
        /*
        this.pointInterieurCercle = new CPointInterieurCercle(liste, null, false, frame.couleurActive(),
          false, 0d, 0d, false, "", frame.pref_indiceTaillePoliceNom, frame.stylePointActif,
          true, cercle, 0, 0, false);
          */
        const pointInterieurCercle = new CPointInterieurCercle(liste, null, false, app.getCouleur(),
          false, 0, 3, false, '', app.getTaillePoliceNom(), app.getStylePoint(), false, false, this.obj, 0, 0)
        pointInterieurCercle.placeEn(x, y)
        pointInterieurCercle.positionne(false, app.dimf) // Détermine l'angle et le rapport
        if (pointInterieurCercle.existe) this.creeObjet(pointInterieurCercle)
        else bpointInt = false
      }
      if (!bpointInt) new AvertDlg(app, 'PtIntDlg1', function () { self.app.activeOutilCapt() })
      app.activeOutilCapt()
    }
  }
}

OutilPtInterieur.prototype.creeObjet = function (ptint) {
  const app = this.app
  this.annuleClignotement()
  app.ajouteElement(ptint)
  ptint.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
  this.saveFig()
  app.activeOutilCapt() // Après création on revient à l'outil de capture
}

OutilPtInterieur.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const liste = app.listePr
  const color = Color.yellow
  color.opacity = 0.2
  if (this.obj.estDeNature(NatObj.NPolygone)) {
    this.app.ajouteObjetVisuel(new CSurfacePolygone(liste, null, false, color, false, StyleRemplissage.transp, this.obj))
  } else {
    this.app.ajouteObjetVisuel(new CSurfaceDisque(liste, null, false, color, false, StyleRemplissage.transp, this.obj))
  }
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilPtInterieur.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsParNatureVisibles(Nat.or(NatObj.NPolygone, NatObj.NCercle)) !== 0
}

OutilPtInterieur.prototype.isPointTool = function () {
  return true
}
