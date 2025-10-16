/*
 * Created by yvesb on 10/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilPointageCre from './OutilPointageCre'
import CPointBase from '../objets/CPointBase'
import Color from '../types/Color'
import ChoixTypeDlg from '../dialogs/ChoixTypeDlg'
import { preventDefault } from '../kernel/kernel'
import ChoixObjProchesDlg from 'src/dialogs/ChoixObjProchesDlg'

export default OutilPointageClicOuPt

/**
 * Outil servant à créer des objets soit en cliquant sur un point déjà créé
 * soit en cliquant à un endroit libre de la figure auquel cas un point libre
 * est créé à l'endroit du clic et c'est ce point qui est utilisé
 * Si on crée un point lors du clic, this.bptCree est lis à true sinon false
 * Hérite de OutilPointageCre
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPointageClicOuPt (app) {
  OutilPointageCre.call(this, app)
}

OutilPointageClicOuPt.prototype = new OutilPointageCre()

OutilPointageClicOuPt.prototype.devicedown = function (evt, type, fonc) {
  const app = this.app
  const svg = app.svgFigure
  const doc = app.doc
  const liste = this.listeUtilisee()
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
  // Version 6.9.3 : Il faut aussi recalculer les objets proches même pour un usage souris car sinon on peut
  // avoir des plantages lors de double clics très rapides sur le bouton OK d'une boîte de dialogue
  // comme une boîte de dialogue de choix d'objets proches.
  liste.procheDe(this.aDesigner, point, info, app.listeExclusion, true, type,
    this.bModifiableParMenu, this.bMemeMasque)
  const nombreObjetsProches = info.nombreObjetsProches
  // Les deux lignes suivantes pour que, si l'outil ouvre une boîte de dialogue, le clic éventuel à l'endroit d'un bouton
  // de cette boîte ne soit pas traité
  preventDefault(evt)
  evt.stopPropagation()

  const self = this
  if (nombreObjetsProches > 0) {
    this.bptCree = false
    if (info.nombreTypesProches > 1) {
      new ChoixTypeDlg(app, info, info.typesProches, this,
        'objetDesigne', point, type, function () { self.callBackAfterDeviceEnd(point) })
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
        new ChoixObjProchesDlg(app, this, 'objetDesigne', info.typesProches, point, app.listeExclusion, type, this.bModifiableParMenu, this.bMemeMasque, function () {
          self.callBackAfterDeviceEnd(point)
        })
      }
    }
    app.updateObjetsVisuels()
  } else {
    this.bptCree = true
    // On crée un point libre à l'endroit où a eu lieu le clic.
    const pt = new CPointBase(liste, null, false, Color.black, false, 3, 0, false, '', app.getTaillePoliceNom(),
      app.getStylePoint(), false, false, point.x, point.y)
    app.ajouteElement(pt, false)
    pt.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    this.objetDesigne = pt
    this.callBackAfterDeviceEnd(point)
  }
}
