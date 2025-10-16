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
import ChoixObjProchesDlg from 'src/dialogs/ChoixObjProchesDlg'

export default OutilPointageCre

/**
 * Outil servant à créer des objets en cliqnant sur des objets de la figure
 * Hérite de OutilPointage
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPointageCre (app) {
  OutilPointage.call(this, app)
  this.objetDesigne = null // Sera l'objet transmis à l'outil après d'éventuelles boîtes de dialogue de choix
}
OutilPointageCre.prototype = new OutilPointage()
OutilPointageCre.constructor = OutilPointageCre // Outil PointageClicOuPt hérite de cet outil

OutilPointageCre.prototype.reset = function (bModifiablesParMenu = false, bMemeMasque = false) {
  OutilPointage.prototype.reset.call(this)
  this.bModifiableParMenu = bModifiablesParMenu
  this.bMemeMasque = bMemeMasque
}

OutilPointageCre.prototype.mousemove = function (evt) {
  this.devicemove(evt, 'mouse', mousePosition)
}
OutilPointageCre.prototype.touchmove = function (evt) {
  this.devicemove(evt, 'touch', touchPosition)
}
OutilPointageCre.prototype.devicemove = function (evt, type, fonc) {
  const app = this.app
  const doc = app.doc
  // Si on est en mode de création automatique on fait le test ci-dessous
  // Mais si on ne l'est pas on ne le fait pas pour que, sur PC tactile
  // avec stylet on ait une information de désignation quand on est proche d'un objet
  const outilActif = app.outilActif
  if (app.pref_PointsAuto && outilActif.creationPointPossible() && (type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  const svg = app.svgFigure
  const point = fonc(svg, evt, app.zoomFactor)
  this.point = point // Ajout version 6.9.1 pour connaître cette valeur lors du deviceend
  const x = point.x
  const y = point.y
  /* Devenu inutile depuis que les événements souris sont interceptés par un rectangle
  if (x<0 || x>app.dimf.x || y<0 || y>app.dimf.y) {
    document.body.style.cursor = "default";
    return;
  }
  */
  // document.body.style.cursor = "crosshair";
  // app.outilActif.cursor = "crosshair";
  app.mousePoint.placeEn(x, y)
  const liste = this.listeUtilisee()
  const info = app.infoProx
  const listeClign = app.listeClignotante
  const outilStyle = (outilActif === app.outilPalette) || (outilActif === app.outilCopierStyle)
  // Si l'outil actif est l'outil palette ou recopier style on réclame plus de précision dans la désignation
  // même si on travaille au touch
  const typedes = outilStyle ? 'mouse' : type
  let nbObjetsProches = liste.procheDe(this.aDesigner, point, info, app.listeExclusion, true, typedes,
    this.bModifiableParMenu, this.bMemeMasque)
  // Version 7.8 : on peut pour certains outils comme le compas choisir un point déjà clignotant
  // et lors du clignotement un objet peut être masqué d'où la ligne suivante
  if ((nbObjetsProches === 0) && (listeClign !== liste) && (listeClign.longueur() > 0)) {
    nbObjetsProches = app.listeClignotante.procheDe(this.aDesigner, point, info, app.listeExclusion, true, type,
      this.bModifiableParMenu, true)
  }
  const nbTypesProches = info.nombreTypesProches
  // var designationDejaAffichee = (app.commentaireDesignation.chaineCommentaire.length != 0);
  // true si une désignation est déjà affichée près du pointeur
  if (nbObjetsProches > 0) {
    let ch = ''
    // Si lors d'un dialogue de choix d'objet proche on a déjà choisi un objet
    // et si celui-ci est proche du pointeur souris, c'est celui-là qui sera sélectionnné
    if (info.premierPointVoisin !== null) {
      ch = 'desPoint'
    } else {
      if (nbTypesProches === 1) {
        for (let i = 0; i < NatObj.nombreTypesDesignables; i++) {
          if (info.infoParType[i].nombreVoisins > 0) {
            ch = info.infoParType[i].premierVoisin.chaineDesignation()
            break
          }
        }
      } else {
        ch = 'desAPreciser'
      }
    }
    app.setDesignation(x, y, ch)
  } else app.cacheDesignation()
  app.updateObjetsVisuels()
}

OutilPointageCre.prototype.mousedown = function (evt) {
  this.devicedown(evt, 'mouse', mousePosition)
}

OutilPointageCre.prototype.touchstart = function (evt) {
  this.devicedown(evt, 'touch', touchPosition)
}

OutilPointageCre.prototype.devicedown = function (evt, type, fonc) {
  const app = this.app
  const svg = app.svgFigure
  const doc = app.doc
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if (doc.type && (doc.type != type)) return;
  if ((type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  const point = fonc(svg, evt, app.zoomFactor)
  this.point = point // Ajout version 6.9.1 pour connaître cette valeur lors du deviceend
  // Modification version 6.4.8 : On utilise un clone de l'objet global app.infoProx car,
  // par exemple quand on ouvre une boîte de dialogue de choix par type, il se peut qu'un événement devicemove
  // ait modifié entre temps cet InfoProx
  const info = app.infoProx.getClone()
  // Sur un périphérique mobile on ne peut pas savoir si avant le touch on était proche d'un objet
  app.mousePoint.placeEn(point.x, point.y)
  app.updateObjetsVisuels()
  // Version 6.9.3 : Il faut aussi recalculer les objets proches même pour un usage souris car sinon on peut
  // avoir des plantages lors de double clics très rapides sur le bouton OK d'une boîte de dialogue
  // comme une boîte de dialogue de choix d'objets proches.
  const liste = this.listeUtilisee()
  const listeClign = app.listeClignotante
  const outilActif = app.outilActif
  const outilStyle = (outilActif === app.outilPalette) || (outilActif === app.outilCopierStyle)
  // Si l'outil actif est l'outil palette ou recopier style on réclame plus de précision dans la désignation
  // même si on travaille au touch
  const typedes = outilStyle ? 'mouse' : type
  let nombreObjetsProches = liste.procheDe(this.aDesigner, point, info, app.listeExclusion, true, typedes,
    this.bModifiableParMenu, this.bMemeMasque)
  // Version 7.8 : on peut pour certains outils comme le compas choisir un point déjà clignotant
  // et lors du clignotement un objet peut être masqué d'où la ligne suivante
  if ((nombreObjetsProches === 0) && (listeClign !== liste) && (listeClign.longueur() > 0)) {
    nombreObjetsProches = app.listeClignotante.procheDe(this.aDesigner, point, info, app.listeExclusion, true, type,
      this.bModifiableParMenu, true)
  }
  const self = this
  if (nombreObjetsProches > 0) {
    // Les deux lignes suivantes pour que, si l'outil ouvre une boîte de dialogue, le clic éventuel à l'endroit d'un bouton
    // de cette boîte ne soit pas traité
    preventDefault(evt)
    evt.stopPropagation()
    // Au touch, avec un outil utilisant le rapporteur, on ne peut pas choisir via une boîte de
    // dialogue un objet quand plusieurs sont proches de l'endroit cliqué donc on prend le
    // premier point voisin
    if ((type === 'touch') && (nombreObjetsProches > 1) && ((outilActif === app.outilRapporteur) ||
      (outilActif === app.outilArcParRapporteur) || (outilActif === app.outilArcGrandParRapporteur))) {
      this.app.outilActif.traiteObjetDesigne(info.premierPointVoisin, point)
      this.objetDesigne = null
      app.updateObjetsVisuels()
      return
    }

    if (info.nombreTypesProches > 1) {
      new ChoixTypeDlg(app, info, info.typesProches, this,
        'objetDesigne', point, type, function () { self.callBackAfterDeviceEnd(point) }, this.bMemeMasque)
    } else {
      if (nombreObjetsProches === 1) {
        this.objetDesigne = info.premierVoisin()
        this.callBackAfterDeviceEnd(point)
      } else {
        // Si plusieurs objets du type choisi on lance une boîte de dialogue de choix de l'objet de ce type
        /*
        new PremierDernierDlg(app, this, 'objetDesigne', info.premierVoisin(),
          info.dernierVoisin(), function () {
            self.callBackAfterDeviceEnd(point)
          })
         */
        new ChoixObjProchesDlg(app, this, 'objetDesigne', info.typesProches, point,
          app.listeExclusion, type, this.bModifiableParMenu, this.bMemeMasque, function () {
            self.callBackAfterDeviceEnd(point)
          })
      }
    }
    app.updateObjetsVisuels()
  } else {
    if (app.pref_PointsAuto && app.outilActif.creationPointPossible()) {
      const pt = app.ajoutePoint(point.x, point.y)
      app.outilActif.nbPtsCrees++
      app.outilActif.traiteObjetDesigne(pt)
    }
  }
}
OutilPointageCre.prototype.mouseup = function () {
  this.app.doc.type = '' // Pour autoriser à nouveau tout événement mouse ou touch
}

// Quand sur un périphérique on relache le doigt et qu'il était proche d'un objet servant à la désiganntion,
// On fait comme si l'utilisateur avait fait un clic souris dessus
/**
 * Fonction appelée quand on relache le doigt et qu'il était proche d'un objet servant à la désignation.
 * Si la fonction isReadyForTouchEnd de l'outil renvoie true, on fait comme si l'utilisateur avait fait un clic
 * droit sur l'objet.
 */
OutilPointageCre.prototype.touchend = function () {
  // Si un dialogue est ouvert, on ne traite pas l'événement
  if (this.app.dlg.length === 0) {
    const app = this.app
    // Si on est sur écran tactile avec stylet et que par exemple on crée une droite passant par deux points
    // si le stylet reste proche du deuxième point après création de la droite puis quitte l'écran
    // on va avoir encore le 'ce point' affiché à l'écran.
    // Pour éviter ça on efface la désignation peut-être encore présente à l'écran
    // Ne marche pas bien sans un setTimeOut.
    setTimeout(() => {
      this.app.cacheDesignation()
    }, 200)

    if (app.outilActif.isReadyForTouchEnd()) {
      // Version 4.6.8 : On utilise un clone de infoProx car un événement devicemove pourrait passer par làa
      // avant la création de l'objet (suite rapport busNag)
      const info = app.infoProx.getClone()
      const nombreObjetsProches = info.nombreObjetsProches
      const self = this
      if (nombreObjetsProches > 0) {
        if (info.nombreTypesProches > 1) {
          new ChoixTypeDlg(app, info, info.typesProches, this,
            'objetDesigne', this.point, 'touch', function () {
              self.callBackAfterTouchEnd()
            }, this.bMemeMasque)
        } else {
          if (nombreObjetsProches === 1) {
            this.objetDesigne = info.premierVoisin()
            this.callBackAfterTouchEnd()
          } else {
            // Si plusieurs objets du type choisi on lance une boîte de dialogue de choix de l'objet de ce type
            /*
            new PremierDernierDlg(app, this, 'objetDesigne', info.premierVoisin(),
              info.dernierVoisin(), function () {
                self.callBackAfterTouchEnd()
              })
             */
            new ChoixObjProchesDlg(app, this, 'objetDesigne', info.typesProches, this.point,
              app.listeExclusion, 'touch', this.bModifiableParMenu, this.bMemeMasque, function () {
                self.callBackAfterTouchEnd()
              })
          }
        }
      }
    }
  }
}

OutilPointageCre.prototype.callBackAfterDeviceEnd = function (point) {
  this.app.outilActif.traiteObjetDesigne(this.objetDesigne, point)
  this.objetDesigne = null
}

OutilPointageCre.prototype.callBackAfterTouchEnd = function () {
  const app = this.app
  // Try catch rajouté suite à rapport BusNag
  try {
    if (app.outilActif.isWorking()) app.outilActif.traiteObjetDesigne(this.objetDesigne, app.mousePoint)
  } catch (error) {
    console.error(error)
  }
  this.objetDesigne = null
}
