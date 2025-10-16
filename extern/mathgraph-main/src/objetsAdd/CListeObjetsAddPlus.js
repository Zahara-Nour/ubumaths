/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// Il a fallu rajouter ce fichier car CListeObjetsAdd était devenu trop gros pour être géré par WebPack

import CListeObjets from '../objets/CListeObjets'
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import { distMinForMouse, distMinForTouch } from 'src/kernel/kernel'

export default CListeObjets

/**
 * Fonction renvoyant un objet formé des intitulés des macro auxquelles on peut rajouter ou supprimer des objets
 * et des pointeurs sur ces macros
 * @param bAuMoinsUnElt ! Si true seules les macro ayant plus d'un objet dans la liste associée sont ajoutées.
 * @returns {{pointeurs: Array, noms: Array}}
 */
CListeObjets.prototype.listeMacrosAvecListeModif = function (bAuMoinsUnElt) {
  const pointeurs = []
  const noms = []
  for (const el of this.col) {
    if (el.estDeNature(NatObj.NMacro) && !el.estElementIntermediaire()) {
      if (el.ajoutOuRetraitObjetsPossible() && (bAuMoinsUnElt ? el.listeAssociee.longueur() > 1 : true)) {
        pointeurs.push(el)
        noms.push(el.intitule)
      }
    }
  }
  return { pointeurs, noms }
}

/**
 * Fonction adaptant tous les objets de la liste à une autre résolution graphique
 * @param coef Le coefficient d'agrandissement-réduction
 */
CListeObjets.prototype.adaptRes = function (coef) {
  for (const el of this.col) {
    el.adaptRes(coef)
  }
}

/**
 * Fonction appelée quand on copie la figure dans le presse-papiers et qui adapte les images
 * dont la dimension est fixe (qui ne dépendent pas de la longueur unité) avec une largeur
 * dont la valeur est soit de valeur 0 soit de valeur strictement négative
 * @param coef
 */
CListeObjets.prototype.adaptDimImagesRes = function (coef) {
  for (const el of this.col) {
    if (el.getNature() === NatObj.NImage && (el.largeur.rendValeur() <= 0)) {
      el.actualWidth *= coef
      el.actualHeight *= coef
    }
  }
}

/**
 * Fonction renvoyant true sir tous les objets de this sont définis exclusivement par des obejst de listeOb
 * @param {CListeObjets} listeOb
 * @returns {boolean}
 */
CListeObjets.prototype.estDefiniParObjDs = function (listeOb) {
  for (const el of this.col) {
    if (!el.estDefiniParObjDs(listeOb)) return false
  }
  return true
}

/**
 * Fonction renvoyant un objet {pointerus, noms} pointant sur les objets numériques de la figure
 * qui peuvent être choisis comme objets finaux d'une construction
 * @param {MtgApp} app
 * @returns {{pointeurs: CListeObjets[], noms: string[]}}
 */
CListeObjets.prototype.listObjFinDisp = function (app) {
  const pointeurs = []
  const noms = []

  const listeSources = new CListeObjets()
  listeSources.ajouteElementsDe(app.listeSrcG)
  listeSources.ajouteElementsDe(app.listeSrcNG)
  // Les calculs ou fonctions constants et dont dépend au moins un objet dépendant de au moins un objet source
  // sont ajoutés à la liste des objest sources.
  // objets finaux
  // On fait de même avec les variables pour que les variables servant à
  // définir les sommes indicées soient rajoutées

  for (const [i, elb] of this.col.entries()) {
    if (elb.estDeNatureCalcul(NatCal.NVariable)) {
      // CValeurDynamique val = (CValeurDynamique) elb;
      if (!listeSources.contains(elb)) {
        for (let j = i + 1; j < this.longueur(); j++) {
          const el2 = this.get(j)
          if (el2.depDe(elb) && el2.dependDeAuMoinsUn(listeSources)) {
            listeSources.add(elb)
            break
          }
        }
      }
    } else {
      if (elb.estDeNatureCalcul(NatCal.NTtCalcouFoncRouC)) {
        // CCalcul val = (CCalcul) elb;
        if (elb.estConstant()) {
          if (!listeSources.contains(elb)) {
            for (let j = i + 1; j < this.longueur(); j++) {
              const el2 = this.get(j)
              if (el2.depDe(elb) && el2.dependDeAuMoinsUn(listeSources)) {
                listeSources.add(elb)
                break
              }
            }
          }
        }
      }
    }
  }
  // On rajoute aussi la possibilité de chosir comme objet final une variable qui
  // a été choisie dans les objets sources. Si cette variable est choisie, elle sera retirée des objets sources
  for (const elb of this.col) {
    // On accepte aussi les repères comme objets numériques
    if (elb.estDeNatureCalcul(NatCal.NTtObjNum) && !elb.estElementIntermediaire()) {
      if (elb.estDeNatureCalcul(NatCal.NVariable)) {
        if (listeSources.contains(elb)) {
          pointeurs.push(elb)
          noms.push(elb.getNom())
        }
      } else {
        if ((elb.estDefiniParObjDs(listeSources)) && !listeSources.contains(elb)) {
          pointeurs.push(elb)
          noms.push(elb.getNom())
        }
      }
    }
  }
  return { pointeurs, noms }
}

/**
 * Fonction réordonnant les éléments de this en respectant l'ordre de listeSource
 * @param {CListeObjets} listeSource
 */
CListeObjets.prototype.reordonne = function (listeSource) {
  const lis = new CListeObjets()
  for (const elb of listeSource.col) {
    if (this.contains(elb)) lis.add(elb)
  }
  // lis contient maintenant les éléments dans le bon ordre
  this.retireTout()
  this.ajouteElementsDe(lis)
}

/**
 * Ajout version 6.1.0
 * Renvoie un pointeur sur le premier point de la liste non intermédiaire et non masqué ayant un nom
 * et coincidant avec pt
 * @param pt
 * @returns {CPt}
 */
CListeObjets.prototype.premierPointNommeProcheDe = function (pt) {
  for (const el of this.col) {
    if (el.estDeNature(NatObj.NTtPoint) && (el !== pt) && !el.masque && !el.estElementIntermediaire() && (el.nom !== '')) {
      if (el.coincideAvec(pt)) return el
    }
  }
  return null
}

/**
 * Fonction renvoyant un pointeur vers une mesure de longueur d'un segement délimité par les points pt1 et pt2 si
 * elle existe et null sinon.
 * @param pt1
 * @param pt2
 * @returns {CElementBase|null}
 */
CListeObjets.prototype.pointeurMesLong = function (pt1, pt2) {
  for (const el of this.col) {
    if (el.estDeNatureCalcul(NatCal.NMesureLongueur) && ((el.point1 === pt1 && el.point2 === pt2) || (el.point1 === pt2 && el.point2 === pt1))) return el
  }
  return null
}

// Ajout version 6.3.0
/**
 * Fonction mettant à jour les macros de la liste. Appelé quand on sauve la figure après une action.
 * Par exemple, si une macro incrémente une variable, si on modifie un objet dépendant de cette variable, il doit etre ajouté
 * à la liste des objets sur lesquels agit cette macro.
 */
CListeObjets.prototype.metAJourMacros = function () {
  for (const el of this.col) {
    if (el.estDeNature(NatObj.NMacro)) el.metAJour()
  }
}

/**
 * Fonction renvoyant un tableau contenant un array dont les éléments sont les éléments graphiques de la liste
 * qui sont proches du point de coordonnées point, qui de nature typeCherche, ne sont pas dans la liste listeExclusion
 * @param {Nat}typeCherche La nature des objets cherchés
 * @param {Point} point les coordonnées dont on cherche les objets proches
 * @param {CListeObjets} listeExclusion  liste contenant les objets exclus de la recherche
 * @param deviceType {string} : "mouse" pour un appel depuis un événement souris et "touch" pour un tactile
 * @param {boolean} bmodifiableParMenu  true si on ne veut désigner que les éléments modifiables par un menu
 * @param {boolean} bMemeMasque  true si on recherche aussi parmi les éléments masqués
 */
CListeObjets.prototype.getTabObjProches = function (typeCherche, point, listeExclusion,
  deviceType, bmodifiableParMenu, bMemeMasque) {
  const res = []
  const distmin = deviceType === 'touch' ? distMinForTouch : distMinForMouse
  for (const ptel of this.col) {
    if (listeExclusion.indexOf(ptel) === -1) {
      const nat = ptel.getNature()
      let b = nat.isOfNature(typeCherche)
      if (bmodifiableParMenu) b = b && ptel.modifiableParMenu()
      if (b && !ptel.estElementIntermediaire()) {
        const dis = ptel.distancePoint(point.x, point.y, !bMemeMasque, distmin)
        if ((dis !== -1) && (dis < distmin)) {
          res.push(ptel)
        }
      }
    }
  }
  return res
}

/**
 * Fonction renvoyant un tableau formé des matrices à deux colonnes de la liste
 * @returns {Array<CElementBase[]>}
 */
CListeObjets.prototype.tabMat2Col = function () {
  const res = []
  for (const el of this.col) {
    if (el.estDeNatureCalcul(NatCal.NTteMatrice)) {
      if (el.p === 2) res.push(el)
    }
  }
  return res
}

/**
 * Fonction qui renvoie l'objet matrice si nomMat est le nom d'une matrice
 * @param {string} nomMat
 * return {CMatrice|CMatriceAleat|CMatriceParForm|CCalcMat}
 */
CListeObjets.prototype.pointeurMat = function (nomMat) {
  for (const el of this.col) {
    if (el.estDeNatureCalcul(NatCal.NTteMatrice) && (el.nomCalcul === nomMat)) return el
  }
  return null
}

CListeObjets.prototype.replaceLatexTagUse = function (oldTag, newTag) {
  for (const el of this.col) {
    if (el.estDeNature(NatObj.NLatex)) el.replaceTag(oldTag, newTag)
  }
}
