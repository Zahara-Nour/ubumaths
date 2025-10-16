/*
 * Created by yvesb on 23/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import { preventDefault } from '../kernel/kernel'
import { mousePosition, touchPosition } from '../kernel/kernelAdd'
import OutilPointage from './OutilPointage'
import ChoixTypeDlg from '../dialogs/ChoixTypeDlg'
import PositionDroites from '../types/PositionDroites'
import PositionCercleCercle from '../types/PositionCercleCercle'
import PositionDroiteCercle from '../types/PositionDroiteCercle'
import { intersection, intersectionCercleCercle, intersectionDroiteCercle } from 'src/kernel/kernelVect'
import ChoixObjProchesDlg from 'src/dialogs/ChoixObjProchesDlg'

export default OutilPointageInt

/**
 * Outil servant à créer des objets en cliqnant sur des objets de la figure
 * Hérite de OutilPointage
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPointageInt (app) {
  OutilPointage.call(this, app)
  this.objetDesigne = null // Sera l'objet transmis à l'outil après d'éventuelles boîtes de dialogue de choix
}
OutilPointageInt.prototype = new OutilPointage()

OutilPointageInt.prototype.mousemove = function (evt) {
  this.devicemove(evt, 'mouse', mousePosition)
}

OutilPointageInt.prototype.touchmove = function (evt) {
  this.devicemove(evt, 'touch', touchPosition)
}

OutilPointageInt.prototype.devicemove = function (evt, type, fonc) {
  const app = this.app
  const doc = app.doc
  const svg = app.svgFigure
  // Pour les devicemove on supprime les lignes suivantes car sur PC avec écran tactile et stylet
  // on peut avoir un mix des deux types d'événements
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if ((type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  const point = fonc(svg, evt, app.zoomFactor)
  const x = point.x
  const y = point.y
  const info = this.app.infoProx
  const nbObjetsProches = app.listePr.procheDe(this.aDesigner, point, info, app.listeExclusion, true, type)
  const nbTypesProches = info.nombreTypesProches
  // boolean designationDejaAffichee = (cadre.commentaireDesignation().chaineCommentaire.length() != 0);
  // true si une désignation est déjà affichée près du pointeur
  if (nbObjetsProches > 0) {
    let ch = ''
    const premierVoisin = info.premierVoisin()
    const dernierVoisin = info.dernierVoisin()
    // Si un premier objet n'a pas déjà été cliqué et si deux objets sont proches du pointeur souris
    // et s'ils sont sécants on peut créer l'intersection d'un seul clic
    if ((app.listeExclusion.longueur() === 0) && (nbObjetsProches === 2) &&
      this.objetsSecants(premierVoisin, dernierVoisin)) ch = 'desIntersection'
    else {
      // Si lors d'un dialogue de choix d'objet proche on a déjà choisi un objet
      // et si celui-ci est proche du pointeur souris, c'est celui-là qui sera sélectionnné
      if (info.premierPointVoisin !== null) ch = 'desPoint'
      else {
        if (nbTypesProches === 1) {
          for (let i = 0; i < NatObj.nombreTypesDesignables; i++) {
            if (info.infoParType[i].nombreVoisins > 0) {
              ch = info.infoParType[i].premierVoisin.chaineDesignation()
              break
            }
          }
        } else ch = 'desAPreciser'
      }
    }
    app.setDesignation(x, y, ch)
    // cadre.paneFigure.repaint();
  } else {
    // document.body.style.cursor = "crosshair";
    app.outilActif.cursor = 'crosshair'
    app.cacheDesignation()
  }
}

OutilPointageInt.prototype.mousedown = function (evt) {
  this.devicedown(evt, 'mouse', mousePosition)
}

OutilPointageInt.prototype.touchstart = function (evt) {
  this.devicedown(evt, 'touch', touchPosition)
}

OutilPointageInt.prototype.devicedown = function (evt, type, fonc) {
  const app = this.app
  const svg = app.svgFigure
  const doc = app.doc
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if (doc.type && (doc.type != type)) return;
  if ((type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  const point = fonc(svg, evt, app.zoomFactor)
  // Modification version 6.4.8 : On utilise un clone de l'objet global app.infoProx car,
  // par exemple quand on ouvre une boîte de dialogue de choix par type, il se peut qu'un événement devicemove
  // ait modifié entre temps cet InfoProx
  // var info = app.infoProx
  const info = app.infoProx.getClone()
  // Sur un périphérique mobile on ne peut pas savoir si avant le touch on était proche d'un objet
  app.mousePoint.placeEn(point.x, point.y)
  app.updateObjetsVisuels()
  // Modification version 6.4.8 : On utilise un clone de l'objet global app.infoProx car,
  // par exemple quand on ouvre une boîte de dialogue de choix par type, il se peut qu'un événement devicemove
  // ait modifié entre temps cet InfoProx
  const liste = this.listeUtilisee()
  liste.procheDe(this.aDesigner, point, info, app.listeExclusion, true, type, this.bModifiableParMenu)
  const nombreObjetsProches = info.nombreObjetsProches
  const self = this
  let i
  if (info.nombreObjetsProches !== 0) {
    preventDefault(evt)
    evt.stopPropagation()
    const premierVoisin = info.premierVoisin()
    const dernierVoisin = info.dernierVoisin()
    // Si un premier objet n'a pas déjà été cliqué et si deux objets sont proches du pointeur souris
    // et s'ils sont sécants on peut créer l'intersection d'un seul clic
    if ((app.listeExclusion.longueur() === 0) && (nombreObjetsProches === 2) &&
      this.objetsSecants(premierVoisin, dernierVoisin)) {
      // Si on est sur écran tactile avec stylet et que par exemple on crée une droite passant par deux points
      // si le stylet reste proche du deuxième point après création de la droite puis quitte l'écran
      // on va avoir encore le 'ce point' affiché à l'écran.
      // Pour éviter ça on efface la désignation peut-être encore présente à l'écran
      // Ne marche pas bien sans un setTimeOut.
      setTimeout(() => {
        app.cacheDesignation()
      }, 200)
      app.outilInt.traiteObjetsDesignes(info.premierVoisin(), info.dernierVoisin(), point)
    } else {
      if (info.nombreTypesProches === 1) {
        for (i = 0; i < NatObj.nombreTypesDesignables; i++) {
          if (info.infoParType[i].nombreVoisins > 0) break
        }
        // i contient l'indice du type d'objets proches
        if (info.infoParType[i].nombreVoisins >= 2) {
          // Si plusieurs objets du type choisi on lance une boîte de dialogue de choix de l'objet de ce type
          /*
          new PremierDernierDlg(app, this, 'objetDesigne', info.premierVoisin(),
            info.dernierVoisin(), function () {
              self.callBackAfterDeviceEnd(point)
            })
           */
          new ChoixObjProchesDlg(app, this, 'objetDesigne', info.typesProches, point,
            app.listeExclusion, type, false, false, function () {
              self.callBackAfterDeviceEnd(point)
            })
          // On regarde quelle a été la réponse de l'utilisateur
          // if (dlg.getPremierChoisi()) elg = info.infoParType[i].premierVoisin;
          // else elg = info.infoParType[i].dernierVoisin;
        } else {
          this.objetDesigne = info.infoParType[i].premierVoisin
          this.app.outilInt.traiteObjetDesigne(this.objetDesigne, point)
        }
      } else {
        // Il faut d'abord ouvrir un dialogue demandant le type de l'objet
        // que l'utilisateur souhaite désigner
        new ChoixTypeDlg(app, info, info.typesProches, this,
          'objetDesigne', point, type, function () {
            self.callBackAfterDeviceEnd(point)
          })
      }
      // frame.outilActif.traiteObjetDesigne(elg, mouseEvent.getPoint());
    }
  }
}

OutilPointageInt.prototype.callBackAfterDeviceEnd = function (point) {
  const app = this.app
  // Si on est sur écran tactile avec stylet et que par exemple on crée une droite passant par deux points
  // si le stylet reste proche du deuxième point après création de la droite puis quitte l'écran
  // on va avoir encore le 'ce point' affiché à l'écran.
  // Pour éviter ça on efface la désignation peut-être encore présente à l'écran
  // Ne marche pas bien sans un setTimeOut.
  setTimeout(() => {
    app.cacheDesignation()
  }, 200)

  app.outilInt.traiteObjetDesigne(this.objetDesigne, point)
}

OutilPointageInt.prototype.objetsSecants = function (elg1, elg2) {
  let pointInt1, pointInt2, ptd, ptc, positionRelative
  if ((elg1 === null) || (elg2 === null)) return false
  if (elg1.estDeNature(NatObj.NTteDteSaufVecteur) && elg2.estDeNature(NatObj.NTteDteSaufVecteur)) {
    pointInt1 = {}
    positionRelative = intersection(elg1.point_x, elg1.point_y, elg1.vect, elg2.point_x,
      elg2.point_y, elg2.vect, pointInt1)
    return (positionRelative === PositionDroites.Secantes)
  } else {
    if (elg1.estDeNature(NatObj.NTtCercle) && elg2.estDeNature(NatObj.NTtCercle)) {
      pointInt1 = {}
      pointInt2 = {}
      positionRelative = intersectionCercleCercle(elg1.centreX, elg1.centreY, elg1.rayon,
        elg2.centreX, elg2.centreY, elg2.rayon, pointInt1, pointInt2)
      return (positionRelative === PositionCercleCercle.Secants) || (positionRelative === PositionCercleCercle.Tangents)
    } else {
      if (elg1.estDeNature(NatObj.NTteDteSaufVecteur)) {
        ptd = elg1
        ptc = elg2
      } else {
        ptd = elg2
        ptc = elg1
      }
      pointInt1 = {}
      pointInt2 = {}
      positionRelative = intersectionDroiteCercle(ptd.point_x, ptd.point_y, ptd.vect,
        ptc.centreX, ptc.centreY, ptc.rayon, pointInt1, pointInt2)
      return (positionRelative !== PositionDroiteCercle.Vide)
    }
  }
}
