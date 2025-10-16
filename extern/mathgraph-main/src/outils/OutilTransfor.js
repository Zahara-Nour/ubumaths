/*
 * Created by yvesb on 24/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import NatObj from '../types/NatObjAdd'
import Outil from './Outil'
import Pointeur from '../types/Pointeur'
import AvertDlg from '../dialogs/AvertDlg'
import ConfirmDlg from '../dialogs/ConfirmDlg'

export default OutilTransfor

/**
 * Outil ancêtre des outils servant à créer des images d'objets par une transformation
 * Ces outils devront utiliser un membre this.trans pour désigner la transformation utilisée
 * Avant appel de create, this.obj doit contenir l'image dont on veut créer l'image.
 * Avant création, on vérifie que l'aimge demandé n'a pas déjà éré créée.
 * @param {MtgApp} app L'application propriétaire
 * @param {string} toolName Nom de l'outil
 * @param {number} toolIndex index de l'outil (entier qui doit être unique
 * @param {boolean} [hasIcon=true] true par défaut. A metre à false pour les transformations n'ayant pas d'icône (inversion)
 * @constructor
 * @extends Outil
 */
function OutilTransfor (app, toolName, toolIndex, hasIcon = true) {
  if (arguments.length === 0) return
  Outil.call(this, app, toolName, toolIndex, true, true, false, hasIcon)
}

OutilTransfor.prototype = new Outil()
OutilTransfor.constructor = OutilTransfor

OutilTransfor.prototype.select = function () {
  Outil.prototype.select.call(this)
  this.imageDejaCree = false
}

OutilTransfor.prototype.deselect = function () {
  Outil.prototype.deselect.call(this)
  const app = this.app
  const list = app.listePourConst
  // Si le dernier objet de la liste est une transformation c'est qu'on n'a créé aucune image
  if (list.get(list.longueur() - 1).estDeNature(NatObj.NTransformation)) app.detruitDernierElement()
}

OutilTransfor.prototype.creeObjet = function () {
  const app = this.app
  const list = app.listePr
  const self = this
  // Si une rotation indentique à celle choisie existe déjà on se sert de celle-là
  let nbInit = 0
  if (!this.imageDejaCree) {
    const trans = list.transformationConfondueAvec(this.trans)
    if (trans !== null) this.trans = trans
    else {
      list.add(this.trans)
      nbInit = 1
    }
    this.imageDejaCree = true
  }
  const nbEltsCrees = new Pointeur(nbInit)
  this.ajouteImageParTransformation(this.objet, this.trans, nbEltsCrees)
  let nbEl = nbEltsCrees.getValue()
  const nbImagesCrees = nbEl - nbInit
  if (app.verifieDernierElement(nbEl)) {
    // L'élément créé n'existait pas déjà et a été ajouté à la liste
    // Si on a créé qu'une seule image on vérifie qu'elle n'est pas hors-fenêtre
    // Version 6.2.3 : On vérifie aussi qu'elle existe car on peut utiliser des calculs qui n'existent pas
    const len = list.longueur()
    if (nbImagesCrees === 1) {
      const der = list.get(len - 1)
      if (!der.existe) {
        new ConfirmDlg(app, 'ErrCalculNonExist', function () {
          self.finitAction(nbEl)
        }, function () {
          self.app.detruitDernierElement()
          nbEl--
        })
      } else {
        if (der.dansFen(app.dimf)) this.finitAction(nbEl)
        else {
          new ConfirmDlg(app, 'HorsFen', function () {
            self.finitAction(nbEl)
          }, function () {
            self.app.detruitDernierElement()
            nbEl--
          })
        }
      }
    } else this.finitAction(nbEl)
    // return true; Inutile de renvoyer quelque chose pour cet outil
  } else {
    new AvertDlg(app, 'DejaCree')
    // return false; Inutile de renvoyer quelque chose pour cet outil
  }
}

OutilTransfor.prototype.finitAction = function (nbEl) {
  const app = this.app
  const list = app.listePr
  const len = list.longueur()
  for (let i = 0; i < nbEl; i++) {
    const ob = list.get(len - nbEl + i)
    if (ob.estDeNature(NatObj.NTtObj)) ob.creeAffichage(app.svgFigure, true, app.doc.couleurFond)
  }
  this.annuleClignotement() // Pour que le centre ou la droite clignotant ne soit pas enregistré comme caché
  this.saveFig()
  this.clignCentreOuAxe()
}

// A redéfinir pour les descendnts qui doivent faire clignoter un centre ou un axe de symétrie
OutilTransfor.prototype.clignCentreOuAxe = function () {
}

OutilTransfor.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilTransfor.prototype.isPointTool = function () {
  return true
}

OutilTransfor.prototype.isLineTool = function () {
  return true
}
