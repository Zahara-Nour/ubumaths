/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObjAdd'
import NatCal from '../types/NatCal'
import { getStr } from '../kernel/kernel'
import CListeObjets from '../objets/CListeObjets'
import ConfirmDlg from '../dialogs/ConfirmDlg'
export default OutilChoixFinGraphConst

/**
 * Outil servant à cliquer sur des objets pour les rajouter à al liste des objets sources choisis pour une construction
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilChoixFinGraphConst (app) {
  // Attention : Pour cet outil le troisième pramètre est "CreationConst" pour que l'icône de app.outilGestionConst soit
  // désactivée quand on désactive l'outil (cet outil n'a pas d'icône)
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'CreationConst', -1, true, false, false, false)
}

OutilChoixFinGraphConst.prototype = new Outil()

OutilChoixFinGraphConst.prototype.select = function () {
  let i; let j; let ind; let elb; let elb2
  const app = this.app
  const list = app.listePr
  Outil.prototype.select.call(this)
  this.listObj = new CListeObjets()
  app.outilPointageActif = app.outilPointageCre
  app.listeClignotante.ajouteElementsDe(app.listeFinG)
  app.outilPointageActif.aDesigner = NatObj.NTtObj

  const listo = new CListeObjets()
  listo.ajouteElementsDe(app.listeSrcG)
  listo.ajouteElementsDe(app.listeSrcNG)
  // On rajoute à listo les variables telles qu'il existe des objets dépendant
  // à la fois des objets sources et de la variable et dépendant d'au moins un objet source
  // ou les calculs réels ou complexes constants tels qu'il existe au moins
  // un objet dépendant de ce c
  i = 0
  for (ind = 0; ind < list.longueur(); ind++) {
    elb = list.get(ind)
    if (elb.estDeNatureCalcul(NatCal.NVariable)) {
      if (!listo.contains(elb)) {
        for (j = i; j < list.longueur(); j++) {
          elb2 = list.get(j)
          if (elb2.depDe(elb) && elb2.dependDeAuMoinsUn(listo)) listo.add(elb)
        }
      }
    } else {
      if (elb.estDeNatureCalcul(NatCal.NTtCalcouFoncRouC)) {
        if (!listo.contains(elb)) {
          if (elb.estConstant()) { // Modifié version 6.3.0
            for (j = i; j < list.longueur(); j++) {
              elb2 = list.get(j)
              if (elb2.depDe(elb) && elb2.dependDeAuMoinsUn(listo)) listo.add(elb)
            }
          }
        }
      }
    }
    i++
  }

  // On donne la possibilité de cliquer sur un objet source seulement
  // dans un cas : si c'est un point libre qui figure parmi les objets sources
  // Attention : il faut permettre de désigner un point libre quand il figure dans
  // les objets sources mais pas un point libre à coorodnnées entières
  // d'où ne pas utiliser pta->Nature qui renvoie NPointBase pour les deux
  // mais utilisation de GetRuntimeClass()
  for (ind = 0; ind < list.longueur(); ind++) {
    elb = list.get(ind)
    // Modification version 6.3
    if (elb.estDeNature(NatObj.NTtObj)) {
      if (elb.estDeNature(NatObj.NPointBase)) {
        if (!app.listeSrcG.contains(elb)) app.listeExclusion.add(elb)
      } else {
        if (!elb.estDefiniParObjDs(listo)) { this.excluDeDesignation(elb) }
      }
    }
  }
  app.listeClignotante.ajouteElementsDe(app.listeFinG)
  app.listeExclusion.ajouteElementsDe(app.listeFinG)
  app.indication(getStr('indFinGr'))

  app.outilPointageActif.reset()
  this.resetClignotement()
  app.showStopButton(true)
}

OutilChoixFinGraphConst.prototype.traiteObjetDesigne = function (elg) {
  if (elg.estDeNature(NatObj.NPointBase)) {
    const self = this
    new ConfirmDlg(this.app, 'ch150', function () {
      self.ajouteClignotementDe(elg)
      self.excluDeDesignation(elg)
      self.listObj.add(elg)
    })
  } else {
    this.ajouteClignotementDe(elg)
    this.excluDeDesignation(elg)
    this.listObj.add(elg)
  }
  // this.app.listeFinG.add(elg);
}

OutilChoixFinGraphConst.prototype.deselect = function () {
  this.app.showStopButton(false)
  Outil.prototype.deselect.call(this)
}

/**
 * Fonction appelée quand on appuyé sur le bouton STOP
 */
OutilChoixFinGraphConst.prototype.actionFin = function () {
  const app = this.app
  app.listeFinG.ajouteElementsDe(this.listObj)
  this.listObj.retireTout()
  this.listObj = null
  app.activeOutilCapt()
}

OutilChoixFinGraphConst.prototype.activationValide = function () {
  const app = this.app
  return app.listeSrcG.longueur() > 0 || app.listeSrcNG.longueur() > 0
}
