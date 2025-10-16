/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import Dimf from '../types/Dimf'
import Fonte from '../types/Fonte'
import Pointeur from '../types/Pointeur'
import { distMinForMouse, distMinForTouch, uniteAngleRadian, uniteAngleDegre, version, base64Decode } from '../kernel/kernel'
import Nat from '../types/Nat'
import CalcR from '../kernel/CalcR'
import CalcC from '../kernel/CalcC'
import CCbGlob from '../kernel/CCbGlob'
import addQueue from 'src/kernel/addQueue'
import CalcMatR from 'src/kernel/CalcMatR'

export default CListeObjets

// Spécial JavaScript : une liste pourra avoir une id éventuelle qui sera celle de l'éventuel
// document qui la possède. Tous les objets graphiques ajoutés dans le DOM auront une id qui sera celle
// de la liste les possédant suivi de l'indice de l'objet dans la liste qui le possède
// mtg32.heapSizeMobile = 2 ; // le nombre maxi de move qu'on peut empiler pour périph mobile. Lus utilisé version 4.9.9.4
// mtg32.heapSizeWeb = 5; // le nombre maxi de move qu'on peut empiler pour navigateur
/**
 * Classe chargée de contenir des objets numériques ou graphiques.
 * Utilisée pour contenir la liste principale des objets de la figure.
 * Peut aussi servir dans des objets de la liste.
 * Chaque élément de la liste possède un membre index qui donne son indice dans la Liste, pour
 * éviter les lenteurs de indexOf pour les listes avevc de nombreux objets.
 * Chaque fois que l'ordre des objets de la liste est modifié, il faut donc appeler updateIndexes.
 * Spécial JavaScript : une liste pourra avoir une id éventuelle qui sera celle de l'éventuel
 * Tous les objets graphiques ajoutés dans le DOM auront une id qui sera celle
 * de la liste les possédant suivi de l'indice de l'objet dans la liste qui le possède
 * document qui la possède.
 * @constructor
 * @param {KernelUniteAngle} uniteAngle  L'unité d'angle de la figure.
 * @param {string} id  null ou l'id du svg associé pour la liste principale de la figure.
 * @param {boolean} decimalDot passer à false pour que le séparateur décimal des affichages soit la virgule
 */
function CListeObjets (uniteAngle, id = '', decimalDot = true) {
  /**
   * La liste effective des objets
   * @type {CElementBase[]}
   */
  this.col = []
  this.macroDemarrage = null
  this.numeroVersion = version // Rectifié version 4.8
  if (arguments.length === 0) {
    this.id = ''
    this.uniteAngle = uniteAngleDegre
  } else {
    if (typeof uniteAngle === 'string') {
      if (uniteAngle === 'radian') this.uniteAngle = uniteAngleRadian
      else this.uniteAngle = uniteAngleDegre
    } else {
      this.uniteAngle = uniteAngle
    } // Pourra être une chaîne de caractères en JavaScript
    this.id = id
    this.decimalDot = decimalDot
  }
  /** @type {CMathGraphDoc|null} */
  this.documentProprietaire = null
  this.pointeurLongueurUnite = null
  this.macroEnCours = null
  this.macroParDefaut = null
  // Spécial JavaScript pour gérer les traces
  // this.traces = new Array(); PLus utilisé version 4.9.9.4
  this.nbTraces = 0
  // sera mis à true par un des elts de la liste (au read) si besoin
  // Attention, on peut avoir un useLatex à false dans l'éditeur avec un des éléments d'une liste devenu isLatex ensuite
  this.useLatex = false
  // this.heapMove = [];
  // this.heapSize = mtg32.heapSizeWeb; PLus utilisé version 4.9.9.4
}

// On établit la distance considérée comme proche pour les outils de pointage suivant qu'on est sur périphérique mobile ou non
// CListeObjets.distanceMiniPourEtreProche =  /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ? 20 : 10;
CListeObjets.nbMaxiTraces = 4000 // Nombre maxi de traces. Passé à 4000 pour la version 6.9.0
// CListeObjets.prototype = Object.create(Array.prototype);
CListeObjets.prototype.constructor = CListeObjets
CListeObjets.prototype.className = 'CListeObjets'

/**
 * Ajout version mtgApp
 * Si la liste est crée pour être interne à un document, this.documentProprietaire pointe sur ce document
 * Sinon this.documentProprietaire reste null
 * @param doc
 */
CListeObjets.prototype.associeA = function (doc) {
  this.documentProprietaire = doc
}
/**
 * Ajoute l'élément elb à la liste.
 * Si svg n'est pas nul et que elb est un élément graphique elb.g n'est pas null, on retire le SVG element de g
 * pour la rajouter au svg à la fin
 * @param {CElementBase} elb
 * @param {SVGElement|null} svg
 * @returns {void}
 */
CListeObjets.prototype.add = function (elb, svg = null) {
  if (elb.listeProprietaire === this) elb.index = this.longueur() // Modifié version 4.8.0
  this.col.push(elb)
  if (svg && elb.estDeNature(NatObj.NTtObj) && elb.g !== null) {
    svg.removeChild(elb.g)
    svg.appendChild(elb.g)
  }
}
/**
 * On retire éventuellement les CComponent instanciés par les objets sur le MtgInternalFrame
 * C'est le cas pour CEditeurFormule
 */
/**
 * Retire l'élement d'indice ind de la liste.
 * On retire éventuellement les composants du DOM instanciés par les objets (CEditeurFormule)
 * @param {number} ind  L'indice de l'objet
 * @param {boolean} bDeleteComponent Si true on retire l'éventule composant associé pour les éditeurs de formules
 * et les variables bornées.
 * @returns {void}
 */
CListeObjets.prototype.remove = function (ind, bDeleteComponent = true) {
  // A été modifié version 6.8.0 pour rajouter un deuxième paramètre
  // Sert dans removeObj
  const elb = this.get(ind)
  const liste = elb.listeProprietaire
  if (liste !== null && bDeleteComponent) {
    const doc = liste.documentProprietaire
    if (doc !== null) {
      elb.deleteComponent() // Nom changé par rapport à version Java.
    }
  }
  // Pour les surfaces avec quadrillage il faut retirer le pattern associé
  if (elb.estDeNature(NatObj.NSurface)) elb.removePattern()
  if (elb === this.pointeurLongueurUnite) this.pointeurLongueurUnite = null
  this.col.splice(ind, 1)
  // this.updateIndexes(); // Supprimé version mtgApp
  // return b;
}
/**
 * Remplace l'élement de la liste d'indice index par objet
 * @param {number} index
 * @param {CElementBase} objet
 * @returns {void}
 */
CListeObjets.prototype.set = function (index, objet) {
  this.col[index] = objet
}
/**
 * Renvoie true si la liste contient l'objet ob
 * @param {CElementBase} ob
 * @returns {boolean}
 */
CListeObjets.prototype.contains = function (ob) {
  return this.col.indexOf(ob) !== -1
}
/**
 * Renvoie l'indice de l'objet ob dans la liste et -1 s'il n'y figure pas.
 * Si la liste est la liste propriétaire de ob, ob.index contient l'indice de ob.
 * @param {CElementBase} elb
 * @returns {number}
 */
CListeObjets.prototype.indexOf = function (elb) {
  if (elb === null) return -1
  if (elb.listeProprietaire === this) return elb.index
  for (let i = 0; i < this.col.length; i++) {
    if (this.col[i] === elb) return i
  }
  return -1
}
/**
 * Fonction renvoyant la longueur de la liste.
 * @returns {number}
 */
CListeObjets.prototype.longueur = function () {
  return this.col.length
}
/*
On a essayé de renseigner du type conditionnel avec
@ template C
@ param {number} indice
@ param {typeof C} [className]  Un nom de classe d'objet descendant de CElementBase
@ returns {C extends true ? C : COb}
mais ça plante jsdoc3, idem avec
@ returns {C|COb}
car c'est le typeof qui passe pas en jsdoc3, et c'est pas mieux avec
@ param {ReturnType<typeof C>} [className]
comme suggéré sur https://github.com/fastify/fastify-type-provider-typebox/issues/38#issuecomment-1464284815
(faudra tester avec jsdoc4 mais pour le moment tsd-jsdoc tourne avec jsdoc3)
 */
/**
 * Renvoie l'élément elb de la liste d'indice indice, sauf si className est spécifié et que cet élément elb est un CElementGenerique
 * (utilisé dans le simplémentations de constructions, renvoie un nouvel objet
 * de classe className avec une propriété elementGeneriqueAssocie contenant elb.
 * @param {number} indice
 * @param {string} [className]  Un nom de classe d'objet descendant de CElementBase
 * @returns {CElementBase}
 */
CListeObjets.prototype.get = function (indice, className) {
  if (indice === -1) return null
  const elb = this.col[indice]
  // Attention : certains éléménts n'ont pas de classeName comme les CImplementationProto
  if (className && elb?.className === 'CElementGenerique') {
    if (!CListeObjets.factory) throw Error('Il faut appeler la méthode statique CListeObjets.setFactory avant d\'instancier un objet CListeObjets')
    // On remplace le CElementGenerique par un nouvel objet de classe className
    const nouv = CListeObjets.factory(className, this)
    nouv.elementGeneriqueAssocie = elb
    // On leurre le prototype en lui renvoyant un pointeur sur un élément pas
    // réellement implanté;
    return nouv
  }
  return elb
}
/**
 * Fonction renvoyant l'élement de la liste dont le numéro d'identification est ind
 * ind est soit l'id html de l'élément (un nombre) soit le tag de l'élément précédé d'un caractère #
 * ou par Aide - Info sur objet graphique.
 * @param {number|string} ind
 * @returns {CElementBase}
 */
CListeObjets.prototype.getById = function (ind) {
  if ((typeof ind === 'string') && (ind.charAt(0) === '#')) return this.getByTag(ind.substring(1))
  const ch = this.id + '#' + ind
  for (const elb of this.col) {
    if (elb.id === ch) return elb
  }
  return null
}

/**
 * Fonction donnant à l'élément graphique d'id html id le tag tag
 * @param {string} id l'id html de l'élément recherché
 * @param {string} tag le tag à affecter à l'élément
 * @returns {CElementBase|null} Renvoie null s'il n'y a pas d'élément graphique d'id id
 * ou si l'élément graphique d'id id a déjà un tag.
 * Sinon renvoie un pointeur sur l'objet auquel le tag a été affecté
 */
CListeObjets.prototype.setTag = function (id, tag) {
  for (const elb of this.col) {
    if (elb.id === id && elb.estDeNature(NatObj.NTtObj) && !elb.tag) {
      elb.tag = tag
      return elb
    }
  }
  return null
}

// Fonction rajoutée version 6.6.0
/**
 * Fonction renvoyant l'élement de la liste dont le tag d'identification est chTag
 * @param {string} chTag
 * @param {boolean} [bNoCase=false] Si true, on ne tient pas compte de la casse pour rechercher le tag
 * @returns {null|CElementGraphique}
 */
CListeObjets.prototype.getByTag = function (chTag, bNoCase = false) {
  if (!chTag) return null
  for (const elb of this.col) {
    if (elb.tag && (bNoCase ? (elb.tag.toLowerCase() === chTag.toLowerCase()) : (elb.tag === chTag))) return elb
  }
  return null
}

/**
 * Fonction renvoyant un pointeur sur l'affichage LaTeX de tag chTag
 * @param {string} chTag
 * @param {number} indmax indice maximum (non compris) de la recherche dans la liste
 * @returns {CLatex|null}
 */
CListeObjets.prototype.getLaTeXByTagBefore = function (chTag, indmax) {
  if (!chTag) return null
  for (let i = 0; i < indmax; i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NLatex) && (elb.tag === chTag)) return elb
  }
  return null
}

/**
 * Fonction initialisant l'unité d'angle et pointeurLongueurUnite
 * @param {KernelUniteAngle} uniteAngle
 * @param pointeurLongueurUnite à documenter
 * @returns {void}
 */
CListeObjets.prototype.initialise = function (uniteAngle, pointeurLongueurUnite) {
  this.pointeurLongueurUnite = pointeurLongueurUnite
  this.uniteAngle = uniteAngle
}
/**
 * Fonction renvoyant true si au moins un des objets de la liste dépend de ptel
 * @param {CElementBase} ptel
 * @returns {boolean}
 */
CListeObjets.prototype.depDe = function (ptel) {
  for (const elb of this.col) {
    if (elb.depDe(ptel)) return true
  }
  return false
}
/**
 * Fonction renvoyant true si au moins un des objets de la liste dépend de ptel
 * Utilisé pour les macros de boucle.
 * @param {CElementBase} ptel
 * @returns {boolean}
 */
CListeObjets.prototype.dependDePourBoucle = function (ptel) {
  for (const elb of this.col) {
    if (elb.dependDePourBoucle(ptel)) return true
  }
  return false
}
/**
 * Fonction renvoyant true si au moins un des objets de la liste existe.
 * @returns {boolean}
 */
CListeObjets.prototype.existeAuMoinsUnElement = function () {
  for (const elb of this.col) {
    if (elb.existe) return true
  }
  return false
}
/**
 * Fonction initialisant this.nombreIterations à 0 avant un calcul de façon à ne pas faire
 * trop de boucles dans la produits et sommes indicés.
 * @returns {void}
 */
CListeObjets.prototype.initialiseNombreIterations = function () {
  this.nombreIterations = 0
}
/**
 * Fonction ajoutant à this les éléments de la liste liste.
 * @param {CListeObjets} liste
 * @returns {void}
 */
CListeObjets.prototype.ajouteElementsDe = function (liste) {
  for (let i = 0; i < liste.col.length; i++) this.add(liste.get(i))
}
/**
 * Fonction ajoutant à this les points punaisés contenus dans list
 * @param {CListeObjets} list
 * @returns {void}
 */
CListeObjets.prototype.ajoutePointsPunaises = function (list) {
  for (let i = 0; i < list.col.length; i++) {
    const elb = list.get(i)
    if (!elb.estElementIntermediaire() && elb.estDeNature(NatObj.NPointMobile)) { if (!elb.estLibre()) this.add(elb) }
  }
}
/**
 * Fonction ajoutant à this les éléments de list qui dépendent de ptel sauf exclu
 * @param {CElementBase} ptel
 * @param {CListeObjets} list
 * @param {CElementBase} exclu
 * @returns {void}
 */
CListeObjets.prototype.ajouteObjetsDependantsSauf = function (ptel, list, exclu) {
  for (let i = 0; i < list.col.length; i++) {
    const elb = list.get(i)
    if ((elb.dependDePourCapture(ptel)) && (elb !== exclu)) this.add(elb)
  }
}
/**
 * Fonction donnant le statut visible ou caché à tous les éléments graphiques de la liste.
 * @param {boolean} bvisible true pour montrer un objet, false pour le cacher
 * @returns {void}
 */
CListeObjets.prototype.montreTout = function montreTout (bvisible) {
  for (const elb of this.col) {
    if (elb.estDeNature(NatObj.NTtObj)) {
      if (bvisible) elb.montre()
      else elb.cache()
    }
  }
}

// Modifié version 6.1.1. Ne prend plus de paramètre car quand on affectait null à el.listeProprietaire on pouvait avoir
// des clignotements pas finis et des positionnements d'objets avec des erreurs
/**
 * Fonction retirant tous les objets de la liste.
 * A ne pas utiliser pour la liste principale quand on veut détruire tous ses objets
 * car les éventuels composants créés ne sont pas détruits.
 */
CListeObjets.prototype.retireTout = function () {
  this.col.splice(0, this.col.length)
}
/*
CListeObjets.prototype.retireTout = function(bdeletePointeurListe) {
  if ((arguments.length !== 0) && bdeletePointeurListe) {
    for (var i = 0; i < this.longueur(); i++) {
      var el = this.get(i);
      el.listeProprietaire = null;
    }
  }
  this.col.splice(0, this.col.length);
};
*/

/**
 * Fonction rajoutant à listeCible des clones de tous les éléments de this
 * @param {CListeObjets} listeCible
 * @returns {void}
 */
CListeObjets.prototype.setCopy = function (listeCible) {
  listeCible.documentProprietaire = this.documentProprietaire
  listeCible.id = this.id
  listeCible.uniteAngle = this.uniteAngle // Avant le recalcul
  listeCible.decimalDot = this.decimalDot
  for (const elb of this.col) {
    // listeCible.add(this.get(i).getClone(this, listeCible)) // Modifié version 6.6.0 pour tenir compte du tag de l'élément
    const clone = elb.getClone(this, listeCible)
    listeCible.add(clone)
    if (elb.estDeNature(NatObj.NTtObj)) {
      clone.tag = elb.tag
    }
  }
  if (this.pointeurLongueurUnite !== null) {
    listeCible.pointeurLongueurUnite = listeCible.get(this.indexOf(this.pointeurLongueurUnite))
  } else {
    listeCible.pointeurLongueurUnite = null
  }
  listeCible.etablitListesInternesMacros()
}
/**
 * Cette fonction fait de la liste this dans listeProprietaireCible l'équivalent
 * de ce qu'est listeSource dans listePropretaireSource.
 * ListeProprietaireCible doit être une liste clonée.
 * @param {CListeObjets} listeSource
 * @param {CListeObjets} listeProprietaireSource
 * @param {CListeObjets} listeProprietaireCible
 * @returns {void}
 */
CListeObjets.prototype.setImage = function (listeSource, listeProprietaireSource, listeProprietaireCible) {
  for (let i = 0; i < listeSource.col.length; i++) {
    const elb = listeSource.get(i)
    const indexSource = listeProprietaireSource.indexOf(elb)
    const elbCible = listeProprietaireCible.get(indexSource, 'CElementBase')
    this.add(elbCible)
  }
  this.uniteAngle = listeSource.uniteAngle
  if (listeSource.pointeurLongueurUnite !== null) { this.pointeurLongueurUnite = this.get(listeSource.indexOf(listeSource.pointeurLongueurUnite)) }
}
/**
 * Fonction faisant de la liste en cours une copie de listeSource (en faisant
 * en sorte que leurs objets aient les mêmes caractéristiques)
 * @param {CListeObjets} listeSource
 * @returns {void}
 */
CListeObjets.prototype.setClone = function (listeSource) {
  let index = 0
  while ((index < this.col.length) && (index < listeSource.col.length)) {
    const elbSource = listeSource.get(index)
    const elb = this.get(index)
    elb.setClone(elbSource)
    index++
  }
}
/**
 * Fonction recalculant tous les éléments de la liste sauf les calculs de dérivées
 * ou test d'équivalence de calculs ou tests de factorisation.
 * @param {boolean} infoRandom  Passer true pour que tous les calculs avec rand() sont recalculés (pour fournir de nouveaux résultats aléatoires).
 * @param {Dimf} dimfen
 * @returns {void}
 */
CListeObjets.prototype.positionne = function (infoRandom, dimfen) {
  for (const elb of this.col) {
    elb.positionne(infoRandom, dimfen)
  }
}

/**
 * Fonction recalculant tous les éléments de la liste sauf les calculs de dérivées
 * ou test d'équivalence de calculs ou tests de factorisation.
 * Les affichages pouvant contenit du LaTeX appelllent positionneFull pour préparer leur affichage.
 * Utilisé par les macros d'affectation de valeur à variable ou de modification de variable.
 * @param {boolean} infoRandom  Si true tous les calculs avec rand() sont recalculés
 * pour fournir de nouveaux résultats aléatoires.
 * @param {Dimf} dimfen
 * @returns {void}
 */

CListeObjets.prototype.positionneLatexFull = function (infoRandom, dimfen) {
  for (const elb of this.col) {
    if (elb.estDeNature(NatObj.NAffLieAPointSaufImEd)) elb.positionneFull(infoRandom, dimfen)
    else elb.positionne(infoRandom, dimfen)
  }
}

/**
 * Fonction recalculant tous les éléments de la liste y compris les calculs de dérivées
 * ou test d'équivalence de calculs ou tests de factorisation.
 * @param {boolean} infoRandom  Si true tous les calculs avec rand() sont recalculés pour fournir de nouveaux résultats aléatoires.
 * @param {Dimf} dimfen
 * @returns {void}
 */
CListeObjets.prototype.positionneFull = function (infoRandom, dimfen) {
  for (const elb of this.col) {
    elb.positionneFull(infoRandom, dimfen)
  }
}
// Fonction ne recalculant que les objets non graphiques de la figure.
/**
 * Fonction ne recalculant que les objets non graphiques de la figure, y compris les calculs de dérivées
 * ou test d'équivalence de calculs ou tests de factorisation.
 * @param {boolean} infoRandom  Si true tous les calculs avec rand() sont recalculés
 * pour fournir de nouveaux résultats aléatoires.
 * @param {Dimf} dimfen
 * @returns {void}
 */
CListeObjets.prototype.positionneFullNG = function (infoRandom, dimfen) {
  for (const elb of this.col) {
    // On positionne les objets non graphiques mais aussi les affichages LaTeX qui ne sont pas liés à un point
    // car celà peut-être utile dns certaines sections j3p
    // if (el.estDeNature(NatObj.NAucunObjet)) el.positionneFull(infoRandom, dimfen);
    if (elb.estDeNature(NatObj.NAucunObjet)) elb.positionneFull(infoRandom, dimfen)
    if (elb.estDeNature(NatObj.NLatex) && (elb.pointLie === null)) {
      elb.isToBeUpdated = true
      elb.positionneFull(infoRandom, dimfen)
    }
  }
}

// Modifié version 6.4.1 avec un paramètre full à false par défaut
/**
 * Fonction ne recalculant que les éléments de la figure qui dépendent de pt
 * @param {boolean} infoRandom  Si true tous les calculs avec rand() sont recalculés
 * pour fournir de nouveaux résultats aléatoires.
 * @param {Dimf} dimfen
 * @param {CElementBase} pt
 * @param {boolean} full true si on utilise positionneFull
 * @returns {void}
 */
CListeObjets.prototype.positionneDependantsDe = function (infoRandom, dimfen, pt, full = false) {
  for (const elb of this.col) {
    if (elb.depDe(pt)) {
      full ? elb.positionneFull(infoRandom, dimfen) : elb.positionne(infoRandom, dimfen)
    }
  }
}
/**
 * Fonction recherchant les éléments graphiques de la figure qui sont proche de point
 * sauf ceux qui sont compris dans listeExclusion.
 * @param {Nat} typeCherche  Indique quels sont le ou les types d'objest cherchés.
 * @param {Point} point  Contient les coordonnées du pointeur souris.
 * @param {InfoProx} info  Mémorise les infos sur les objets proches.
 * @param {CListeObjets} listeExclusion  liste contenant les objets exclus de la recherche
 * (par exemple les points punaisés).
 * @param {boolean} prioritePoints  Si true on donne une priorité aux points dans la recherche.
 * @param {string} deviceType   "mouse" pour un appel depuis un événement souris et "touch" pour un tactile
 * @param {boolean} bmodifiableParMenu  true si on ne veut désigner que les éléments modifiables par un menu
 * @param {boolean} bMemeMasque  true si on recherche aussi parmi les éléments masqués
 * @returns {number}
 */
CListeObjets.prototype.procheDe = function (typeCherche, point, info, listeExclusion, prioritePoints,
  deviceType, bmodifiableParMenu, bMemeMasque) {
  let ind, indnat, nat, dis, b
  if (this.longueur() === 0) return 0
  const bModifParMenu = arguments.length < 7 ? false : bmodifiableParMenu
  const bmmMasque = arguments.length < 8 ? false : bMemeMasque
  info.metAZero()
  // On traite tous les éléments de la liste
  const distmin = deviceType === 'touch' ? distMinForTouch : distMinForMouse
  for (const ptel of this.col) {
    if (listeExclusion.indexOf(ptel) === -1) {
      nat = ptel.getNature()
      b = nat.isOfNature(typeCherche)
      if (bModifParMenu) b = b && ptel.modifiableParMenu()
      if (b) {
        // ptelg = (CElementGraphique) ptel;
        // if ((!ptel.masque || bmmMasque) && !ptel.estElementIntermediaire()) {
        if (!ptel.estElementIntermediaire()) {
          dis = ptel.distancePoint(point.x, point.y, !bmmMasque, distmin)
          if ((dis !== -1) && (dis < distmin)) {
            info.typesProches = Nat.or(info.typesProches, nat)
            indnat = NatObj.indiceDeNature(nat)
            info.infoParType[indnat].nombreVoisins++
            if (nat.isOfNature(NatObj.NTtPoint)) {
              info.nombrePointsVoisins++
              if (info.premierPointVoisinRencontre) {
                info.premierPointVoisin = ptel
                info.dernierPointVoisin = ptel
                info.premierPointVoisinRencontre = false
              } else {
                info.dernierPointVoisin = ptel
              }
            }
            if (info.infoParType[indnat].premierVoisinRencontre) {
              info.infoParType[indnat].premierVoisin = ptel
              info.infoParType[indnat].premierVoisinRencontre = false
            } else {
              info.infoParType[indnat].dernierVoisin = ptel
            }
          }
        }
      }
    }
  }
  if (prioritePoints && (info.nombrePointsVoisins > 0)) {
    info.metAZeroObjetsNonPoints()
    info.typesProches = Nat.and(info.typesProches, NatObj.NTtPoint)
  }
  info.nombreObjetsProches = 0
  for (ind = 0; ind < NatObj.nombreTypesDesignables; ind++) {
    info.nombreObjetsProches += info.infoParType[ind].nombreVoisins
  }
  info.nombreTypesProches = 0
  for (ind = 0; ind < NatObj.nombreTypesDesignables; ind++) {
    if (Nat.and(info.typesProches, NatObj.conversionNumeroNature[ind]).isNotZero()) info.nombreTypesProches++
  }
  return info.nombreObjetsProches
}

/**
 * Fonction recherchant les éléments graphiques de la figure qui sont proche de point
 * et qui sont capturables à la souris, sauf ceux qui sont compris dans listeExclusion.
 * @param {Nat} typeCherche  Indique quels sont le ou les types d'objest cherchés.
 * @param {Point} point  Contient les coordonnées du pointeur souris.
 * @param {InfoProx} info  Mémorise les infos sur les objets proches.
 * @param {CListeObjets} listeExclusion  iste contenant les objets exclus de la recherche
 * (par exemple les points punaisés).
 * @param {boolean} prioritePoints  Si true on donne une priorité aux points dans la recherche.
 * @param deviceType{string} : "mouse" pour un appel depuis un événement souris et "touch" pour un tactile
 * @returns {number}
 */
CListeObjets.prototype.procheDePourCapture = function (typeCherche, point, info, listeExclusion, prioritePoints, deviceType) {
  if (this.longueur() === 0) return 0
  info.metAZero()
  // On traite tous les éléments de la liste
  for (const ptel of this.col) {
    if (ptel.estCapturableSouris() && listeExclusion.indexOf(ptel) === -1) {
      const nat = ptel.getNature()
      if (nat.isOfNature(typeCherche)) {
        // Modification par rapport au C++
        // ptelg = (CElementGraphique) ptel;
        if (!ptel.masque && !ptel.estElementIntermediaire()) {
          const distmin = deviceType === 'touch' ? distMinForTouch : distMinForMouse
          const dis = ptel.distancePoint(point.x, point.y, true, distmin)
          if ((dis !== -1) && (dis < distmin)) {
            info.typesProches = Nat.or(info.typesProches, nat)
            const indnat = NatObj.indiceDeNature(nat)
            info.infoParType[indnat].nombreVoisins++
            if (nat.isOfNature(NatObj.NTtPoint)) {
              info.nombrePointsVoisins++
              if (info.premierPointVoisinRencontre) {
                info.premierPointVoisin = ptel
                info.dernierPointVoisin = ptel
                info.premierPointVoisinRencontre = false
              } else info.dernierPointVoisin = ptel
            }

            if (info.infoParType[indnat].premierVoisinRencontre) {
              info.infoParType[indnat].premierVoisin = ptel
              info.infoParType[indnat].premierVoisinRencontre = false
            } else info.infoParType[indnat].dernierVoisin = ptel
          }
        }
      }
    }
  }

  // Si prioritePoint est true, priorités aux objets points sauf si on est proche d'un repère
  if (prioritePoints && (info.nombrePointsVoisins > 0)) {
    info.metAZeroObjetsNonPoints() // Ajouté version 2.7
    info.typesProches = Nat.and(info.typesProches, NatObj.NTtPoint) // Car un repère se désigne par son origine ds la version java
  }
  info.nombreObjetsProches = 0
  for (let ind = 0; ind < NatObj.nombreTypesDesignables; ind++) {
    info.nombreObjetsProches += info.infoParType[ind].nombreVoisins
  }
  info.nombreTypesProches = 0
  for (let ind = 0; ind < NatObj.nombreTypesDesignables; ind++) {
    if (Nat.and(info.typesProches, NatObj.conversionNumeroNature[ind]).isNotZero()) info.nombreTypesProches++
  }
  return info.nombreObjetsProches
}

/**
 * Renvoie un pointeur sur le calcul ou la fonction de nom nom dont le test nat & NatCal est non nul
 * @param {Nat} nat
 * @param {string} nom
 * @param {number} [indiceMaxi]  -1 pour une recherche dans toute la liste et sinon l'indice mai de la recherche.
 * @returns {CElementBase} : Retourne null si la recherche n'a pas abouti.
 */
CListeObjets.prototype.pointeurParNatureCalcul = function (nat, nom, indiceMaxi) {
  let indmax
  if (arguments.length <= 2) indmax = this.longueur() - 1
  else indmax = indiceMaxi
  if (indmax === -1) indmax = this.longueur() - 1
  let i = 0
  let elb = null
  let trouve = false
  while ((!(trouve)) && (i <= indmax)) {
    elb = this.get(i)
    if (elb.estDeNatureCalcul(nat)) {
      if (elb.getNom() === nom) trouve = true
      else i++
    } else i++
  }
  if (trouve) return elb; else return null
}
/**
 * Fonction appelant etablitListesInternes pour toutes les macros contenues dans la liste.
 * @returns {void}
 */
CListeObjets.prototype.etablitListesInternesMacros = function () {
  for (const elb of this.col) {
    if (elb.estDeNature(NatObj.NMacro)) elb.etablitListesInternes()
  }
}
/**
 * Fonction renvoyant un pointeur sur la première macro dont l'intitulé est intitule.
 * Renvoie null si la rechercha n'a pas abouti.
 * @param {string} intitule  Intitulé de la macro recherchée.
 * @returns {CMacro}
 */
CListeObjets.prototype.pointeurMacro = function (intitule) {
  for (const elb of this.col) {
    if (elb.estDeNature(NatObj.NMacro)) {
      if (elb.intitule === intitule) return elb
    }
  }
  return null
}
/**
 * Fonction recherchant dans la liste une valeur réelle (qui n'est pas un élément
 * intermédiaire de construction) dont le nom commence par ch
 * Si elle est trouvée, renvoie la longueur du nom désignant la valeur
 * (par  exemple AOB pour une mesure d'angle ou le nom d'un calcul)
 * et pointeurValeur.getValue() renvoie un pointeur sur cette valeur.
 * @param {string} ch  La chaine recherchée
 * @param {Pointeur} pointeurValeur
 * @returns {number}
 */
CListeObjets.prototype.commenceParNomValeur = function (ch, pointeurValeur) {
  // Optimisation version 7.0 : Si la chaîne ne commence pas par une lettre elle ne peut pas
  // commencer par un nom de valeur ou une mesure
  // if (!/^[a-zA-Z]/.test(ch)) return 0 Correction version 7.2.1 : Une mesure de longueur correspondant
  // à un nom avec une lettre grecque doit être acceptée
  if (!/^[a-zA-ZαβγδεζηθκλμνξπρστφχψωΓΔΞΠΣΦΧΨΩ]/.test(ch)) return 0
  const longueurNom = { x: 0 }
  let longueurTrouvee = 0
  // Version 6.7 : On recherche aussi les noms de matrices qui peuvent être appelés via par exemple A(1,1)
  // dans un calcul
  const nat = Nat.or(NatCal.NTteValR, NatCal.NTteMatrice)
  for (const elb of this.col) {
    if (!elb.estElementIntermediaire() && elb.estDeNatureCalcul(nat)) {
      // ptv = (CValDyn) elb;
      if (elb.chaineCommenceParNom(ch, longueurNom) && (longueurNom.x > longueurTrouvee)) {
        longueurTrouvee = longueurNom.x
        pointeurValeur.setValue(elb)
      }
    }
  }
  return longueurTrouvee
}
// Ajout version 6.4.8
/**
 * Fonction recherchant dans la liste une mmesure de longueur ou d'angl non oriénté dont le nom commence par ch
 * @param {string} ch
 * @param {Pointeur} pointeurValeur
 * @returns {number}
 */
CListeObjets.prototype.commenceParNomMesureReelle = function (ch, pointeurValeur) {
  const longueurNom = { x: 0 }
  let longueurTrouvee = 0
  for (const elb of this.col) {
    if (elb.estDeNatureCalcul(NatCal.NMesureLongueur) || elb.estDeNatureCalcul(NatCal.NMesureAngleNonOriente)) {
      if (elb.chaineCommenceParNom(ch, longueurNom) && (longueurNom.x > longueurTrouvee)) {
        longueurTrouvee = longueurNom.x
        pointeurValeur.setValue(elb)
      }
    }
  }
  return longueurTrouvee
}
/**
 * Fonction recherchant dans la liste une valeur réelle complexe (qui n'est pas
 * un élément intermédiaire de construction) dont le nom commence par ch.
 * Si elle est trouvée, renvoie la longueur du nom désignant la valeur
 * (par  exemple AOB pour une mesure d'angle ou le nom d'un calcul)
 * et pointeurValeur.getValue() renvoie un pointeur sur cette valeur.
 * @param {string} ch  La chaine recherchée
 * @param {Pointeur} pointeurValeur
 * @returns {number}
 */
CListeObjets.prototype.commenceParNomValeurReelleOuComplexe = function (ch, pointeurValeur) {
  const longueurNom = { x: 0 }
  let longueurTrouvee = 0
  const nat = Nat.or(NatCal.NTteValROuC, NatCal.NTteMatrice)
  for (const elb of this.col) {
    if (!elb.estElementIntermediaire() && elb.estDeNatureCalcul(nat)) {
      if (elb.chaineCommenceParNom(ch, longueurNom) && (longueurNom.x > longueurTrouvee)) {
        longueurTrouvee = longueurNom.x
        pointeurValeur.setValue(elb)
      }
    }
  }
  return longueurTrouvee
}
/**
 * Fonction recherchant dans la liste une fonction ou une suite réelle définie
 * par l'utilisateur (qui n'est pas un élément intermédiaire de construction)
 * dont le nom commence par ch.
 * Si elle est trouvée, renvoie la longueur du nom de la fonction ou suite trouvée
 * et pointeurFonction.getValue() renvoie un pointeur sur la fonction.
 * Version 6.7 : Les appels de matrices pour utiliser un élément sont aussi considérés comme des
 * appels de fonctions à deux variables
 * @param {string} ch
 * @param {Pointeur} pointeurFonction
 * @returns {number}
 */
CListeObjets.prototype.commenceParNomFonctionUtilisateur = function (ch, pointeurFonction) {
  // Optimisé version 7.0.
  // On vérifie si la chaîne commence par une ou plusieurs lettres suivies éventuellement d'un ' ou d'un "
  // et suivi éventuellement d'un ou plusieurs chiffres suivi d'une parenthèse ouvrante
  // Rectifié version 7.1.0 pour être sensible à la casse (sinon un nom utilisateur avec des majuscules
  // n'est plus accepté dans un calcul)
  const chunks = /(^[a-zA-Z]+['"]?\d*)\(/.exec(ch)
  if (!chunks) return 0
  const deb = chunks[1] // Contient ce qui a été capturé par l'expression régulière (les caractères alpha sans la parenthèse)
  const nat = Nat.or(NatCal.NTteFoncR, NatCal.NDerivee, NatCal.NTteSuiteRecR)
  pointeurFonction.setValue(null)
  for (const elb of this.col) {
    if (!elb.estElementIntermediaire() && elb.estDeNatureCalcul(nat)) {
      if (elb.nomCalcul === deb) {
        pointeurFonction.setValue(elb)
        return deb.length
      }
    }
  }
  return 0
}
/**
 * Fonction recherchant dans la liste une fonction ou une suite complexe définie
 * par l'utilisateur (qui n'est pas un élément intermédiaire de construction)
 * dont le nom commence par ch.
 * Si elle est trouvée, renvoie la longueur du nom de la fonction ou suite trouvée
 * et pointeurFonction.getValue() renvoie un pointeur sur la fonction.
 * @param {string} ch
 * @param {Pointeur} pointeurFonction
 * @returns {number}
 */
CListeObjets.prototype.commenceParNomFonctionComplexeUtilisateur = function (ch, pointeurFonction) {
  // Optimisé version 7.0.
  // On vérifie si la chaîne commence par une ou plusieurs lettres suivies éventuellement d'un ' ou d'un "
  // et suivi éventuellement d'un ou plusieurs chiffres suivi d'une parenthèse ouvrante
  // Rectifié version 7.1.0 pour être sensible à la casse (sinon un nom utilisateur avec des majuscules
  // n'est plus accepté dans un calcul)
  const chunks = /(^[a-zA-Z]+['"]?\d*)\(/.exec(ch)
  if (!chunks) return 0
  const deb = chunks[1] // Contient ce qui a été capturé par l'expression régulière (les caractères alpha sans la parenthèse)
  const nat = Nat.or(NatCal.NTteFoncRouC, NatCal.NTteSuiteRecC)
  pointeurFonction.setValue(null)
  for (const elb of this.col) {
    if (!elb.estElementIntermediaire() && elb.estDeNatureCalcul(nat)) {
      if (elb.nomCalcul === deb) {
        pointeurFonction.setValue(elb)
        return deb.length
      }
    }
  }
  return 0
}
/**
 * Fonction utilisée dans CCb  renvoyant 0 si la chaine pointée par ch ne
 * pointe pas sur une chaine représentant une valeur ou une fonction mathématique prédéfinie ou
 * une fonction définie par l'utilisateur ou un parametre.
 * Les objets intermédiaires de constructions sont sautés dans la recherche.
 * Sinon, elle renvoie  la longueur du nom le plus long trouve.
 * Si ParametreTrouve.getValue est non null, c'est qu'on a trouvé le paramètre formel
 * et parametreTrouve.getValue contient son indice dans le tableau parametresFormels,
 * sinon, si PointeurValeur est différent de NULL, c'est qu'un a trouvé un nom de valeur ou de fonction
 * définie par l'utilisateur (les suites étant considérées comme des
 * fonctions) sinon c'est qu'on a trouvé un nom de fonction prédéfinie dont
 * la nature est renvoyée dans nomFonction.
 * Les calculs intermédiaires sont exclus de la recherhce.
 * @param {string} ch  La chaîne recherchée.
 * @param {string[]|null} parametresFormels  null ou un tableau contenant les paramètres formels recherchés
 * @param {Pointeur} pointeurValeur  Si on a trouvé une valeur, pointeurValeur.getValue()
 * renvoie un pointeur sur celle-ci.
 * @param {Pointeur} nomFonction  nomFonction.getValue() renvoie la longueur du nom de la fonction trouvée
 * ou 0 si non trouvée.
 * @param {Pointeur} parametreTrouve  parametreTrouve.getValue renvoie -1 si le paramètre n'a pas été trouvé
 * ou sinon son indice dans le tableau parametresFormels
 * @param {Pointeur} nombreVariables  Renvoie par getValue() le nombre de paramètres formels de la fonction trouvée.
 * @returns {number}
 */
CListeObjets.prototype.commenceParNomFonctionOuValeurOuParametre = function (ch, parametresFormels,
  pointeurValeur, nomFonction, parametreTrouve, nombreVariables) {
  const pointeurSurValeur = new Pointeur(null)
  const pointeurSurFonction = new Pointeur(null)
  let indiceParametre = -1
  let longueurNomParametre = 0
  parametreTrouve.setValue(-1)
  if (parametresFormels !== null) {
    for (let i = 0; i < parametresFormels.length; i++) {
      if ((ch.indexOf(parametresFormels[i]) === 0) && (parametresFormels[i].length > longueurNomParametre)) {
        longueurNomParametre = parametresFormels[i].length
        indiceParametre = i
        parametreTrouve.setValue(i) // Ligne rajoutée version 4.5.2
      }
    }
  }
  const longueurNomFonctionPredefinie = CCbGlob.commenceParNomFonctionReellePredefinie(ch, nomFonction, nombreVariables)
  const longueurNomValeur = this.commenceParNomValeur(ch, pointeurSurValeur)
  const longueurNomFonctionUtilisateur = this.commenceParNomFonctionUtilisateur(ch, pointeurSurFonction)
  if ((longueurNomFonctionPredefinie === 0) && (longueurNomValeur === 0) &&
    (longueurNomFonctionUtilisateur === 0) && (longueurNomParametre === 0)) {
    return 0
  }

  if ((longueurNomParametre >= longueurNomFonctionPredefinie) &&
      (longueurNomParametre >= longueurNomValeur) &&
      (longueurNomParametre >= longueurNomFonctionUtilisateur)) {
    parametreTrouve.setValue(indiceParametre)
    return longueurNomParametre
  }

  parametreTrouve.setValue(-1)
  if ((longueurNomFonctionPredefinie > longueurNomValeur) &&
        (longueurNomFonctionPredefinie > longueurNomFonctionUtilisateur) &&
        (longueurNomFonctionPredefinie > longueurNomParametre)) {
    pointeurValeur.setValue(null)
    return longueurNomFonctionPredefinie
  }

  if ((longueurNomValeur > longueurNomFonctionPredefinie) &&
          (longueurNomValeur > longueurNomFonctionUtilisateur) &&
          (longueurNomValeur > longueurNomParametre)) {
    pointeurValeur.setValue(pointeurSurValeur.getValue())
    return longueurNomValeur
  }

  if ((longueurNomFonctionUtilisateur > longueurNomFonctionPredefinie) &&
            (longueurNomFonctionUtilisateur > longueurNomValeur) &&
            (longueurNomFonctionUtilisateur > longueurNomParametre)) {
    pointeurValeur.setValue(pointeurSurFonction.getValue())
    nombreVariables.setValue(pointeurSurFonction.getValue().nombreVariables())
    return longueurNomFonctionUtilisateur
  }

  return 0
} // commenceParNomFonctionOuValeurOuParametre

/**
 * Fonction utilisée dans CCb  renvoyant 0 si la chaine pointée par ch ne
 * pointe pas sur une chaine représentant une valeur réelle ou complexe
 * ou une fonction mathématique complexe prédéfinie ou
 * une fonction complexe définie par l'utilisateur ou un parametre.
 * Les objets intermédiaires de constructions sont sautés dans la recherche.
 * Sinon, elle renvoie  la longueur du nom le plus long trouve.
 * Si aucune fonction ou valeur ou paramètre n'est trouvé et si la chapine commence par la lettre i
 * complexiTrouve.getValue() renvoie true, sinon false.
 * Si ParametreTrouve.getValue est non null, c'est qu'on a trouvé le paramètre formel
 * et parametreTrouve.getValue contient son indice dans le tableau parametresFormels,
 * Sinon, si PointeurValeur est différent de NULL, c'est qu'un a trouvé un nom de valeur ou de fonction
 * définie par l'utilisateur (les suites étant considérées comme des
 * fonctions) sinon c'est qu'on a trouvé un nom de fonction prédéfinie dont
 * la nature est renvoyée dans nomFonction.
 * Les calculs intermédiaires sont exclus de la recherhce.
 * @param {string} ch  La chaîne dans laquelle se fait la recherche
 * @param {null|string[]} parametresFormels  null ou un tableau contenant les paramètres formels recherchés.
 * @param {Pointeur} pointeurValeur  : Si on a trouvé une valeur, pointeurValeur.getValue()
 * renvoie un pointeur sur celle-ci.
 * @param {Pointeur} nomFonction  nomFonction.getValue() renvoie la longueur du nom de la fonction trouvée
 * ou 0 si non trouvée.
 * @param {Pointeur} parametreTrouve  parametreTrouve.getValue renvoie -1 si le paramètre n'a pas été trouvé
 * ou sinon son indice dans le tableau parametresFormels
 * @param {boolean} complexeiTrouve  complexeiTrouve.ggetValue renvoie true si aucune fonction
 * ou valeur n'a été trouvée mais la chaîne commence par la lettre i.
 * @param {Pointeur} nombreVariables  Renvoie par getValue() le nombre de paramètres formels de la fonction trouvée.
 * @returns {number}
 */
CListeObjets.prototype.commenceParNomFonctionOuValeurOuParametreComplexe = function (ch, parametresFormels,
  pointeurValeur, nomFonction, parametreTrouve, complexeiTrouve, nombreVariables) {
  const pointeurSurValeur = new Pointeur()
  const pointeurSurFonction = new Pointeur()
  let indiceParametre = -1
  let longueurNomParametre = 0

  parametreTrouve.setValue(-1)
  complexeiTrouve.setValue(false)
  pointeurValeur.setValue(null)
  if (Array.isArray(parametresFormels)) {
    for (let i = 0; i < parametresFormels.length; i++) {
      if ((ch.indexOf(parametresFormels[i]) === 0) && (parametresFormels[i].length > longueurNomParametre)) {
        longueurNomParametre = parametresFormels[i].length
        indiceParametre = i
        parametreTrouve.setValue(i) // Ligne rajoutée version 4.5.2
      }
    }
  }
  const longueurNomFonctionPredefinie = CCbGlob.commenceParNomFonctionComplexePredefinie(ch, nomFonction, nombreVariables)
  const longueurNomValeur = this.commenceParNomValeurReelleOuComplexe(ch, pointeurSurValeur)
  const longueurNomFonctionUtilisateur = this.commenceParNomFonctionComplexeUtilisateur(ch, pointeurSurFonction)
  if ((longueurNomFonctionPredefinie === 0) && (longueurNomValeur === 0) && (longueurNomFonctionUtilisateur === 0) && (longueurNomParametre === 0)) {
    if (ch.indexOf('i') === 0) {
      complexeiTrouve.setValue(true)
      return 1
    }
    return 0
  }
  if ((longueurNomParametre >= longueurNomFonctionPredefinie) &&
      (longueurNomParametre >= longueurNomValeur) &&
      (longueurNomParametre >= longueurNomFonctionUtilisateur)) {
    parametreTrouve.setValue(indiceParametre)
    return longueurNomParametre
  }

  parametreTrouve.setValue(-1) // Correction bug version 46
  if ((longueurNomFonctionPredefinie > longueurNomValeur) &&
        (longueurNomFonctionPredefinie > longueurNomFonctionUtilisateur) &&
        (longueurNomFonctionPredefinie > longueurNomParametre)) {
    return longueurNomFonctionPredefinie
  }

  if ((longueurNomValeur > longueurNomFonctionPredefinie) &&
          (longueurNomValeur > longueurNomFonctionUtilisateur) &&
          (longueurNomValeur > longueurNomParametre)) {
    // On teste si on fait référence à un calcul ou une variable nommé i.
    // Si c'est le cas, on donne priorité au complexe i
    if ((longueurNomValeur === 1) && ch.indexOf('i') === 0) {
      complexeiTrouve.setValue(true)
      return 1
    }

    pointeurValeur.setValue(pointeurSurValeur.getValue())
    return longueurNomValeur
  }

  if ((longueurNomFonctionUtilisateur > longueurNomFonctionPredefinie) &&
            (longueurNomFonctionUtilisateur > longueurNomValeur) &&
            (longueurNomFonctionUtilisateur > longueurNomParametre)) {
    nombreVariables.setValue(pointeurSurFonction.getValue().nombreVariables())
    pointeurValeur.setValue(pointeurSurFonction.getValue())
    return longueurNomFonctionUtilisateur
  }

  return 0
}
/**
 * Fonction ajoutant à la liste this des clones de ptelg, au nombre de nombreCopies.
 * Utilisé dans les leiu d'objets.
 * @param {CElementGraphique} ptelg
 * @param {number} nombreCopies (entier)
 * @returns {void}
 */
CListeObjets.prototype.ajouteClonesDe = function (ptelg, nombreCopies) {
  for (let i = 0; i < nombreCopies; i++) {
    const el = ptelg.creeClone()
    el.impProto = null // Pour qu'un élément cloné d'un élément intermédiaire ne soit pas considéré comme obbjet intermémdiaire
    this.add(el)
  }
}

CListeObjets.prototype.initialiseDependances = function () {
  for (const elb of this.col) {
    elb.initialisePourDependance()
  }
}

/**
 * Fonction chargeant la liste depuis un fux de données binaires.
 * @param {DataInputStream} inps
 * @returns {void}
 */
CListeObjets.prototype.read = function (inps) {
  try {
    // On lit d'abord l'unité d'angle
    this.uniteAngle = inps.readInt()
    // On lit d'abord le nombre d'objets de la liste
    this.nombreObjets = inps.readInt()
    for (let i = 0; (i < this.nombreObjets); i++) {
      const elb = inps.readObject(this)
      elb.index = i // Rajouté version 4.8.0
      this.add(elb)
      // Spécial JavaScript : chaque élément graphique a une id qui est l'id de la liste
      // qui le possède suivi de son indice dans la liste à partir de 0
      if (this.className !== 'CPrototype') elb.id = this.id + '#' + i
    }
    const indiceLongueurUnite = inps.readInt()
    if (indiceLongueurUnite === -1) this.pointeurLongueurUnite = null
    else this.pointeurLongueurUnite = this.get(indiceLongueurUnite)
    // Inutile dans l'applet
    const indiceMacroParDefaut = inps.readInt()
    if (indiceMacroParDefaut !== -1) this.macroParDefaut = this.get(indiceMacroParDefaut)
    else this.macroParDefaut = null
    // Nouveau version 4.8
    if (this.numeroVersion < 12) this.macroDemarrage = null
    else {
      const indiceMacroDemarrage = inps.readInt()
      if (indiceMacroDemarrage === -1) this.macroDemarrage = null
      else this.macroDemarrage = this.get(indiceMacroDemarrage)
    }
    this.etablitListesInternesMacros()
  } catch (e) {
    if (!inps.chdoc) {
      // on a pas la chaîne base64 d'origine, on essaie de la reconstruire,
      // mais si ça a déjà planté le décode pourrait planter aussi, on sécurise avec try/catch
      try {
        inps.chdoc = base64Decode(inps.ba)
      } catch (error) {
        console.error('Impossible de décoder le byteArray', error)
      }
    }
    console.error('plantage base64 avec la string', inps.chdoc)
    // on décompose message & stack pour avoir la stack dans les breadcrumbs bugsnag, sinon on ne voit que le message
    console.error(e.message, e.stack)
    throw new Error('Base64Err')
  }
}
/**
 * Fonction renvoyant true seulement si nom est valide pour un nouveau nom de calcul ou de fonction
 * N'affiche pas de message en cas d'erreur
 * les paramètres formels de fonctions sont autorisés
 * @param {string} chNom
 *  @param {boolean} bAcceptNamei true si on accepte le nom comme nom de variable (accepté comme
 *  variable formelle d'une somme ou un produit indicé das un calcul réel ou un calcul matriciel)
 * @returns {boolean}
 */
CListeObjets.prototype.validationNomCalculSansMessage = function (chNom, bAcceptNamei = false) {
  if ((chNom === '') || !this.validationNomVariableOuCalcul(chNom)) return false
  if (!bAcceptNamei && chNom === 'i') return false
  if (CCbGlob.egalNomFonctionReelleOuComplexePredefinie(chNom)) return false
  return (!this.egalNomValeurOuFonctionOuMesure(chNom, this.longueur() - 1))
}
/**
 * Fonction renvoyant true si ch est un nom valide pour une variable ou un calcul
 * @param {string} ch
 * @returns {boolean}
 */
CListeObjets.prototype.validationNomVariableOuCalcul = function (ch) {
  let fini = false
  while ((ch.length !== 1) && !fini) {
    if (ch.charAt(1) !== ' ') fini = true
    else ch = ch.substring(1)
  }
  if (ch === '') return false
  const premierCar = ch.charAt(0)
  if (!Fonte.lettre(premierCar)) return false

  let carPrecedent = premierCar
  let valable = true
  for (let i = 1; (i <= ch.length - 1) && valable; i++) {
    const carEnCours = ch.charAt(i)
    // Cas d'une lettre
    if (Fonte.lettre(carEnCours)) {
      if (Fonte.chiffre(carPrecedent) || Fonte.prime(carPrecedent)) {
        valable = false
      }
    } else if (Fonte.prime(carEnCours)) {
      if (Fonte.chiffre(carPrecedent) || Fonte.prime(carPrecedent)) {
        valable = false
      }
    } else {
      if (!Fonte.chiffre(carEnCours)) {
        valable = false
      }
    }
    carPrecedent = carEnCours
  }
  return valable
}
/**
 * Fonction enregistrant la liste dans un flus de données binaires.
 * @param {DataOutputStream} oups
 * @returns {void}
 */
CListeObjets.prototype.write = function (oups) {
  oups.writeInt(this.uniteAngle)
  oups.writeInt(this.col.length)
  for (const elb of this.col) {
    oups.writeObject(elb)
  }
  let indiceLongueurUnite
  if (this.pointeurLongueurUnite === null) indiceLongueurUnite = -1
  else indiceLongueurUnite = this.indexOf(this.pointeurLongueurUnite)
  oups.writeInt(indiceLongueurUnite)
  // Inutile pour l'applet
  let indiceMacroParDefaut
  if (this.macroParDefaut === null) indiceMacroParDefaut = -1
  else indiceMacroParDefaut = this.indexOf(this.macroParDefaut)
  oups.writeInt(indiceMacroParDefaut)
  let indiceMacroDemarrage
  if (this.macroDemarrage === null) indiceMacroDemarrage = -1
  else indiceMacroDemarrage = this.indexOf(this.macroDemarrage)
  oups.writeInt(indiceMacroDemarrage)
}
// Pour le chargement des constructions
CListeObjets.prototype.readPourProtoDepuisFlux = function (inps) {
  const nombreObjets = inps.readInt()
  for (let i = 0; i < nombreObjets; i++) {
    const elb = inps.readObject(this)
    elb.index = i // Rajouté version 4.8.0
    this.add(elb)
  }
}
/**
 * Fonction utilsiée pour enregistrer un prototype (construction) dans un flux de données binaiires.
 * @param {DataOutputStream} oups
 * @returns {void}
 */
CListeObjets.prototype.writePourProtoDepuisFlux = function (oups) {
  oups.writeInt(this.col.length)
  for (const elb of this.col) oups.writeObject(elb)
}
/**
 * Fonction renvoyant true si chaine contient le nom d'une variable ou calcul
 * ou fonction réelle ou complexe définie par l'utilisateur.
 * L'élément excle est sauté dans la recherche.
 * @param {string} chaine
 * @param {number} indiceMaxiDansListe  L'indice de recherche mai dans la liste.
 * @param {CElementBase} exclu null ou l'élément exclu de la recherche.
 * @returns {boolean}
 */
CListeObjets.prototype.egalNomValeurOuFonctionOuMesure = function (chaine, indiceMaxiDansListe, exclu = null) {
  const nat = Nat.or(NatCal.NTteValROuC, NatCal.NTteFoncR,
    NatCal.NTteFoncC, NatCal.NDerivee, NatCal.NTteSuiteRecR,
    NatCal.NTteSuiteRecC, NatCal.NTteMatrice)
  for (let i = 0; i <= indiceMaxiDansListe; i++) {
    const elb = this.get(i)
    if (elb !== exclu) {
      if (elb.estDeNatureCalcul(nat) && !elb.estElementIntermediaire()) {
        if (elb.chaineEgaleANom(chaine)) return true
      }
    }
  }
  return false
}
/**
 * Renvoie true si la syntaxe de chaineCalcul est correcte pour un calcul réel.
 * Si indiceMaxi est égal à -1 ou absent la recherche se fait jusqu'à la fin de la liste.
 * @param {string} chaineCalcul  La chaîne dont on analyse la syntaxe.
 * @param {string[]} [variables]  un tableau contenant des noms de variables formelles
 * @param {Pointeur} [indiceErreur]  getValue() renvoie l'indice dans la
 * chaîne d'une éventuelle faute de syntaxe trouvée
 * @param {number} [indiceMaxi]
 * @returns {boolean}
 */
CListeObjets.prototype.verifieSyntaxe = function (chaineCalcul, variables, indiceErreur, indiceMaxi) {
  if (arguments.length <= 3) indiceMaxi = this.longueur() - 1
  if (arguments.length <= 2) indiceErreur = new Pointeur(0)
  if (arguments.length === 1) variables = null
  return CalcR.verifieSyntaxe(this, chaineCalcul, indiceErreur, indiceMaxi, variables)
}
/**
 * Renvoie true si la syntaxe de chaineCalcul est correcte pour un calcul réel.
 * Si indiceMaxi est égal à -1 ou absent la recherche se fait jusqu'à la fin de la liste.
 * @param {string} chaineCalcul  La chaîne dont on analyse la syntaxe.
 * @param {string[]} [variables]  un tableau contenant des noms de variables formelles
 * @param {Pointeur} [indiceErreur]  getValue() renvoie l'indice dans la
 * chaîne d'une éventuelle faute de syntaxe trouvée
 * @param {number} [indiceMaxi]
 * @returns {boolean}
 */
CListeObjets.prototype.verifieSyntaxeMat = function (chaineCalcul, variables, indiceErreur, indiceMaxi) {
  if (arguments.length <= 3) indiceMaxi = this.longueur() - 1
  if (arguments.length <= 2) indiceErreur = new Pointeur(0)
  if (arguments.length === 1) variables = null
  return CalcMatR.verifieSyntaxe(this, chaineCalcul, indiceErreur, indiceMaxi, variables)
}
// Ajout version 6.7.6
/**
 * Fonction vérifiant si, dans le document d'id idDoc on peut affecter au calcul (ou à la fonction)
 * nommée calcName la formule contenue dans la chaîne de caractères formula
 * @param {string} calcName
 * @param {string} formula
 * @param [bSignesMultImplicit=true] true si la formule a des signes de multiplication implicite (et donc n'utilise
 * que des variables et calculs à 1 caractère) et false sinon
 * @returns {boolean}
 */
CListeObjets.prototype.syntaxValidation = function (calcName, formula, bSignesMultImplicit = true) {
  const ch = bSignesMultImplicit ? this.addImplicitMult(formula) : formula
  const calcul = this.pointeurParNatureCalcul(NatCal.NTtCalcouFoncRouC, calcName)
  if (calcul === null) return false
  const indDernier = this.indexOf(calcul) - 1
  const varFor = calcul.variableFormelle()
  const indErr = new Pointeur(0)
  const bcomplexe = calcul.estDeNatureCalcul(
    Nat.or(NatCal.NCalculComplexe, NatCal.NFonctionComplexe, NatCal.NFoncCPlusieursVar)
  )
  return bcomplexe
    ? CalcC.verifieSyntaxeComplexe(this, ch, indErr, indDernier, varFor)
    : CalcR.verifieSyntaxe(this, ch, indErr, indDernier, varFor)
}

/**
 * Renvoie true si la syntaxe de chaineCalcul est correcte pour un calcul complexe.
 * Si indiceMaxi est égal à -1 ou absent la recherche se fait jusqu'à la fin de la liste.
 * @param {string} chaineCalcul  La chaîne dont on analyse la syntaxe.
 * @param {string[]} [variables]  un tableau contenant des noms de variables formelles
 * @param {Pointeur} [indiceErreur]  getValue() renvoie l'indice dans la
 * chaîne d'une éventuelle faute de syntaxe trouvée
 * @param {number} [indiceMaxi]
 * @returns {boolean}
 */
CListeObjets.prototype.verifieSyntaxeComplexe = function (chaineCalcul, variables, indiceErreur, indiceMaxi) {
  if (arguments.length <= 3) indiceMaxi = this.longueur() - 1
  if (arguments.length <= 2) indiceErreur = new Pointeur(0)
  if (arguments.length === 1) variables = null
  return CalcC.verifieSyntaxeComplexe(this, chaineCalcul, indiceErreur, indiceMaxi, variables)
}
/**
 * Fonction changeant la formule du calcul ou de la fonction (réelle ou complexe) de nom nomCalcul
 * La nouvelle formule est contenue dans la chaîne de caractères formule.
 * Renvoie true si la formule était valide et false sinon.
 * Créée pour être utilisé par un utilisateur externe
 * @param {string} nomCalcul
 * @param {string} formule
 * @returns {boolean}
 */
CListeObjets.prototype.giveFormula2 = function (nomCalcul, formule) {
  if (typeof formule === 'number') formule = String(formule)
  const calcul = this.pointeurParNatureCalcul(NatCal.NTtCalcouFoncRouC, nomCalcul)
  if (calcul === null) return false
  return this.giveFormula2Calc(calcul, formule)
}

/**
 * Fonction changeant la formule du calcul ou de la fonction (réelle ou complexe) calcul
 * La nouvelle formule est contenue dans la chaîne de caractères formule.
 * Renvoie true si la formule était valide et false sinon.
 * Créée pour être utilisé par un utilisateur externe
 * @param {CCalcul|CCalculComplexe|CCalculComplexe} calcul
 * @param {string} formule
 * @returns {boolean}
 */
CListeObjets.prototype.giveFormula2Calc = function (calcul, formule) {
  const indiceErreur = new Pointeur(0)
  const variables = calcul.variableFormelle()
  const reel = calcul.estDeNatureCalcul(Nat.or(NatCal.NCalculReel, NatCal.NFonction, NatCal.NFoncPlusieursVar))
  const index = calcul.index - 1 // La formule ne doit pas dépendre d'objets définis après le calcul
  const isSyntaxOk = reel
    ? this.verifieSyntaxe(formule, variables, indiceErreur, index)
    : this.verifieSyntaxeComplexe(formule, variables, indiceErreur, index)
  if (isSyntaxOk) {
    calcul.chaineCalcul = formule
    const len = formule.length - 1
    calcul.calcul = reel
      ? CalcR.ccb(formule, this, 0, len, variables)
      : CalcC.ccbComp(formule, this, 0, len, variables)
    return true
  }
  return false
}
/**
 * Fonction renvoyant true si la chaine ch commence par le nom d'une fonction
 * utilisateur (réelle ou complexe) suivi d'une parenthèse.
 * Si oui, longNom.getValue() renvoie la longueur du nom.
 * La recherche commence à l'indice indstart
 * @param {string} pChaine  La chaîne dans laquelle se fait la recherche.
 * @param {number} indstart
 * @param {Pointeur} longNom
 * @returns {boolean}
 */
CListeObjets.prototype.commenceParNomFonctionUtilisateurSuivieParOuvr = function (pChaine, indstart, longNom) {
  let i, elb, nom
  // Corrigé version 7.1.0 : Doit être sensible à la casse
  // const ch = pChaine.substring(indstart).toLowerCase()
  const ch = pChaine.substring(indstart)
  const nat = Nat.or(NatCal.NTteFoncR, NatCal.NDerivee,
    NatCal.NSuiteRecurrenteReelle, NatCal.NTteFoncC, NatCal.NSuiteRecurrenteComplexe)
  for (i = 0; i < this.longueur(); i++) {
    elb = this.get(i)
    if (!elb.estElementIntermediaire() && elb.estDeNatureCalcul(nat)) {
      nom = elb.getNom()
      if (ch.indexOf(nom + '(') === 0) {
        longNom.setValue(nom.length)
        return true
      }
    }
  }
  return false
}
/**
 * Fonction assumant que la chaîne ch n'utilise que des calculs ou fonctions utilisateurs
 * dont le nom ne comporte qu'une lettre suivie éventuellement de chiffres ou de ' ou de ".
 * Elle rajoute les signes de multiplication sous-entendus.
 * @param {string} ch  La chaine contenant la formule.
 * @returns {string}
 */
CListeObjets.prototype.addImplicitMult = function (ch) {
  if (ch === '') return ch
  let i, car
  let stb = ''
  const lon = new Pointeur(0)
  let carprecedent = '('
  for (i = 0; i < ch.length; i++) {
    car = ch.charAt(i)
    if (Fonte.chiffreOuPointDecimal(car) || (car === ')') || (car === '+') || (car === '-') ||
      (car === '*') || (car === '/') || (car === '^') || (car === '\'') || (car === '"') ||
      (car === '²') || (car === '=')) {
      carprecedent = car
      stb = stb + car
    } else {
      if (ch.indexOf('pi', i) === i) {
        if (Fonte.chiffreOuPointDecimal(carprecedent) || Fonte.lettreOuPrime(carprecedent) ||
          (carprecedent === ')')) stb = stb + ('*pi')
        else stb = stb + ('pi')
        carprecedent = ')'
        i++
      } else {
        if (CCbGlob.commenceParNomFonctionPredefinieSuivieParOuvr(ch, i, lon)) {
          if (Fonte.chiffreOuPointDecimal(carprecedent) || Fonte.lettreOuPrime(carprecedent) ||
            (carprecedent === ')')) stb = stb + '*' + ch.substring(i, i + lon.getValue() + 1)
          else stb = stb + ch.substring(i, i + lon.getValue() + 1)
          i += lon.getValue()
          carprecedent = '('
        } else {
          if (this.commenceParNomFonctionUtilisateurSuivieParOuvr(ch, i, lon)) {
            if (Fonte.chiffreOuPointDecimal(carprecedent) || Fonte.lettreOuPrime(carprecedent) ||
              (carprecedent === ')')) stb = stb + '*' + ch.substring(i, i + lon.getValue() + 1)
            else stb = stb + ch.substring(i, i + lon.getValue() + 1)
            i += lon.getValue()
            carprecedent = '('
          } else {
            const long = this.commenceParNomMesureReelle(ch.substring(i), lon)
            if (long > 0) {
              if (Fonte.chiffreOuPointDecimal(carprecedent) || Fonte.lettreOuPrime(carprecedent) ||
                (carprecedent === ')')) stb = stb + '*' + ch.substring(i, i + lon.getValue() + 1)
              else stb = stb + ch.substring(i, i + long)
              i += long - 1
              carprecedent = '('
            } else {
              // Si lettre suivie d'une autre lettre
              if (Fonte.lettreOuPrime(carprecedent) && Fonte.lettre(car)) stb = stb + '*'
              // Si chiffre suivi d'une lettre
              else if (Fonte.chiffreOuCarre(carprecedent) && Fonte.lettre(car)) stb = stb + '*'
              // Si chiffre ou lettre suivi d'une parenthèse on rajoute un signe de multiplication
              else if ((Fonte.chiffreOuCarre(carprecedent) || Fonte.lettreOuPrime(carprecedent)) &&
                (car === '(')) stb = stb + '*'
              // Si parenthèse fermante suivie d'un chiffre ou une lettre ou une parenthèse ouvrante on rajoute un signe de multiplication
              else if ((carprecedent === ')') && (Fonte.lettre(car) || Fonte.chiffre(car) ||
                (car === '('))) stb = stb + '*'
              stb = stb + car
              carprecedent = car
            }
          }
        }
      }
    }
  }
  return stb
}

// Ci-dessous pour garder compatibilité avec j3P
CListeObjets.prototype.traiteSignesMult = CListeObjets.prototype.addImplicitMult
// Spécial JavaScript : Affichage et aout dans le DOM des objets de la liste
// Attention : paramètre ideb supplémentaire par rapport à la version Java
/**
 * Spécial JavaScript : Affichage et ajout dans le DOM des svg elements qui représentent
 * les objets de la liste.
 * Attention : paramètre ideb supplémentaire par rapport à la version Java
 * Modifié version 6.4.1 en utilisant la queue de MathJax
 * @param {number} ideb  L'indice du premier élément à afficher.
 * @param {SVGElement} svg  Le svg dans lequel se fait l'affichage de la figure.
 * @param {boolean} masquage  true si les éléments masqués ne sont pas affichés
 * @param {Color} couleurFond  La couleur de fonc de la figure.
 * @param {boolean} immediat  Si true on ne passe pas par la pile de MathJax. Utilisé dans getBase64ImageData de MtgApp
 * @param {VoidCallback} [callback] Fonction de callback à mettre sur la pile après tous les affichages
 *   par exemple pour ajouter des objets via addObject
 * @returns {void}
 */
CListeObjets.prototype.afficheTout = function (ideb, svg, masquage, couleurFond, immediat = false, callback) {
  const affiche = () => {
    for (let i = ideb; i < this.longueur(); i++) {
      const elb = this.get(i)
      if (elb.estDeNature(NatObj.NTtObj) && !elb.estElementIntermediaire()) {
        elb.creeAffichage(svg, masquage, couleurFond)
      }
    }
    this.reclassForeignElts() // Pour que les éditeurs de formules et les panea associés à variables se retrouvent sur les dessus de l'affichage
  }
  if (immediat) {
    affiche()
  } else {
    addQueue(affiche)
  }
  if (callback) addQueue(callback, true).catch(error => console.error(error))
}

/**
 * Fonction appelée pour afficher la figure quand on la copie dans le presse-papiers.
 * Il faut retirer de la figure les foreign objects qui ne sont pas acceptés
 * @param {SVGElement} svg
 * @param {Color} couleurFond
 */
CListeObjets.prototype.afficheToutForCopy = function (svg, couleurFond) {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NTtObj) && !elb.estElementIntermediaire()) {
      elb.creeAffichage(svg, true, couleurFond)
      if (elb.hasComponent()) {
        // try .. catch juste par précaution
        try {
          svg.removeChild(elb.foreignElt)
        } catch (e) {}
      }
    }
  }
}

// Modifié version 6.4.8
/**
 * Spécial JavaScript : fonction mettant à jour certains éléments associés à des éléments du DOM
 * Attention : Il est important par défaut que addQueue soit appelé pour chaque élément de la liste
 * et pas pour la liste entier car, quand on appelle update après qu'un outil ait appelé annuleClignotement,
 * La liste clignotement se voit retire tous ses éléments et donc appeler update de cette liste ne ferait plus rien
 * @param {SVGElement} svg  Le svg qui contient la figure.
 * @param {Color} couleurFond
 * @param {boolean} masquage  true si les éléments masqués ne sont pas affichés
 * @param {boolean} byBlock Si true, on appelle addQueue pour toute la liste (qui sera construite dans addQueue), sinon on prend la liste telle qu'elle est maintenant (mais callBack sera quand meme appelée dans addQueue)
 * byBlock est true par défaut depuis la version 6.7.2 mais doit mis à false pour mtgApp.updtateObjetsVisuels et
 * mtgApp.supprimeObjetsVisuels
 * @returns {void}
 */
CListeObjets.prototype.update = function update (svg, couleurFond, masquage, byBlock = true) {
  this.setReady4MathJaxUpdate()
  if (byBlock) {
    // un seul appel de addQueue, la boucle aura lieu ensuite avec les éléments qu'il y aura à ce moment là
    addQueue(() => {
      for (const elb of this.col) this.callBack(elb, svg, couleurFond, masquage)
    })
  } else {
    // on prend les éléments tels qu'ils sont maintenant, on génère les fcts de cb avec bind maintenant, mais elles seront appelées dans addQueue en séquentiel
    for (const elb of this.col) addQueue(this.callBack.bind(this, elb, svg, couleurFond, masquage))
  }
}

/**
 * Spécial JavaScript : fonction mettant à jour certains éléments associés à des éléments du DOM
 * @param {CElementBase} el Ne seront mis à jour que les éléments dépendant de el
 * @param {SVGElement} svg  Le svg qui contient la figure.
 * @param {Color} couleurFond
 * @param {boolean} masquage  true si les éléments masqués ne sont pas affichés
 * @returns {void}
 */

CListeObjets.prototype.updateDependants = function (el, svg, couleurFond, masquage) {
  this.setDependantsReady4MathJaxUpdate(el)
  // On vérifie que la svg de la figure est bien toujouts présent dans le DOm
  // car il peut avoir disparu (par exemple on a quitté un exo J3P alors que la pile d'affichage est encore active)
  if (svg) {
    // on filtre nos éléments maintenant mais on appelera callBack via la pile
    // Bien que callBack teste si l'objet est de nature NatObj.NtObj on fait quand même le test
    // pour éviter d'appeler depDe pour des objets non graphiques
    for (const elb of this.col) {
      if (elb.estDeNature(NatObj.NTtObj) && elb.depDe(el)) {
        // Version 7.3.5 : On fonctionne comme update par défaut en mettant sur la pile chaque appel de callBack pour chaque élément
        // (avant c'était un seul appel de addQueue avec la boucle faite au moment de l'éxécution différée)
        addQueue(this.callBack.bind(this, elb, svg, couleurFond, masquage))
      }
      if (elb.estDeNature(NatObj.NEditeurFormule)) {
        elb.updateLatex(svg)
      }
    }
  }
}

/**
 * Appelée par certains objets après qu'ils aient été traités par MathJax (les affichages de LaTeX)
 * @param {CElementGraphique} elb  L'objet dont l'affichage doit être remis à jour s'il est graphique
 * @param {SVGElement} svg  Le svg qui contient la figure.
 * @param {Color} couleurFond  La couleur de fond de la figure.
 * (qui se règle par un curseur sous la palette de couleurs dans MathGraph32).
 * @param {boolean} masquage  true si les éléments masqués ne sont pas affichés
 * @returns {void}
 */
CListeObjets.prototype.callBack = function (elb, svg, couleurFond, masquage) {
  if (elb.estDeNature(NatObj.NTtObj) && svg) {
    // Il faut tester que la liste propiétaire de l'élément n'est pas null car
    // si des objets visuels sont actifs et qu'on choisit, avant de finir d'utiliser l'outil ,
    // de faire un annuler-refaire, elg n'a plus d'implémentation graphique dans le SVG de la figure
    if (elb.estElementIntermediaire() || elb.listeProprietaire === null) return
    elb.updategElt(svg, couleurFond, masquage)
  }
} // callBack

/**
 * Fonction utilisé dans les listes d'objets.
 * Recrée les liste d'objets dans les lieux d'objest dépendant
 * @param {CLieuObjetAncetre} lieu
 * @returns {void}
 */
CListeObjets.prototype.recreeListesCopiesLieuxObjetsDependantDe = function (lieu) {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if ((elb.estDeNature(NatObj.NLieuObjet)) && (elb !== lieu) && elb.depDe(lieu)) {
      elb.recreeListeCopieObjets()
    }
  }
}
/**
 * Fonction mettant à jour tous les éléments de la liste qui ont une fonction
 * metAJour redéfinie.
 * Utilisée pour mettre à jour par exemple les lieux de points et lieux d'objets
 * ou certaines macros.
 * @returns {void}
 */
CListeObjets.prototype.metAJour = function () {
  for (let i = 0; i < this.longueur(); i++) {
    const el = this.get(i)
    el.metAJour()
  }
}
CListeObjets.prototype.metAJourObjetsDependantDe = function (elb) {
  for (const el of this.col) {
    if (el.depDe(elb)) el.metAJour()
  }
}
/**
 * Fonction mettant le membre isToBeUpdated des CLaTeX dependant de elb à true
 * @param elb
 */
CListeObjets.prototype.setDependantLatexToBeUpdated = function (elb) {
  for (const el of this.col) {
    if (el.estDeNature(NatObj.NLatex) && el.depDe(elb)) el.isToBeUpdated = true
  }
}
/**
 * Fonction mettant à jour les objets de la figure qui nécessitent de l'être
 * et qui dépendent de elb à l'exclusion des éditeurs de formule.
 * @param {CElementBase} elb
 * @returns {void}
 */
CListeObjets.prototype.metAJourObjetsDependantDeSaufEditeursFormule = function (elb) {
  for (let i = 0; i < this.longueur(); i++) {
    const el = this.get(i)
    if ((!el.estDeNature(NatObj.NEditeurFormule)) && el.depDe(elb)) { el.metAJour() }
  }
}
/**
 * Fonction renvoyant un pointeur sur l'objet calcul de nature calcul nature
 * et dont le nom est nom. Renvoie null la recherche est infructueuse.
 * @param {string} nom  Le nom du calcul cherché
 * @param {Nat} nature  la nature de calcul recherchée
 * @param {boolean} [bNoCase] passer true pour ne pas tenir compte de la casse (majuscule ou minuscule) dans la recherche de nomCalcul
 * (false par défaut)
 * @returns {CCalculAncetre}
 */
CListeObjets.prototype.pointeurObjetCalcul = function (nom, nature, bNoCase = false) {
  const indiceMaxi = this.longueur() - 1
  let elb = null
  for (let i = 0; i <= indiceMaxi; i++) {
    elb = this.get(i)
    if (elb.estDeNatureCalcul(nature)) {
      if (bNoCase ? (elb.nomCalcul.toLowerCase() === nom.toLowerCase()) : (elb.nomCalcul === nom)) return elb
    }
  }
  return null
}
/**
 * Fonction conçue pour être utilisée de façon externe.
 * Renvoie la valeur actuelle du calcul réel nommé nomCalcul.
 * Renvoie -1 si le calcul n'existe pas.
 * Utilisé prinipalement dans les exercices de calcul de j3p.
 * @param {string} nomCalcul  Le nom du calcul dont on demande la valeur.
 * @param {boolean} [bNoCase] passer true pour ne pas tenir compte de la casse (majuscule ou minuscule) dans la recherche de nomCalcul
 * @returns {number}
 */
CListeObjets.prototype.valueOf = function (nomCalcul, bNoCase = false) {
  const calcul = this.pointeurObjetCalcul(nomCalcul, NatCal.NTtCalcRNommeSaufConst, bNoCase)
  if (calcul === null || !calcul.existe) return -1
  return calcul.rendValeur()
}
/**
 * Fonction conçue pour être utilisée de façon externe.
 * Renvoie la formule en ligne (avec des *) du calcul ou de la fonction nommé nomCalcul
 * @param {string} nomCalcul
 * @param {boolean} [bNoCase] passer true pour ne pas tenir compte de la casse (majuscule ou minuscule) dans la recherche de nomCalcul
 * @returns {String|null}
 */
CListeObjets.prototype.getFormula = function (nomCalcul, bNoCase = false) {
  const calcul = this.pointeurObjetCalcul(nomCalcul, NatCal.NCalcouFoncParFormule, bNoCase)
  if (calcul === null) return null
  // if (!calcul.existe) return '' // Modifié version 7.3.5
  const varFor = calcul.variableFormelle()
  return calcul.calcul.chaineCalcul(varFor)
}

/**
 * Fonction pour utilisation externe par j3p
 * Renvoie true si la list contient ou pas un calcul ou une fonction nommée nomCalcul
 * @param {string} nomCalcul le nom du calcul recherché
 * @param {boolean} [bNoCase] passer true pour ne pas tenir compte de la casse (majuscule ou minuscule) dans la recherche de nomCalcul
 * @returns {boolean}
 */
CListeObjets.prototype.containsCalc = function (nomCalcul, bNoCase = false) {
  return this.pointeurObjetCalcul(nomCalcul, Nat.or(NatCal.NTtCalcNommeSaufConst, NatCal.NTteFoncRouC), bNoCase) !== null
}

/**
 * Fonction renvoyant la formule LaTeX représentant le calcul ou la fonction
 * dont le nom est nomCalcul.
 * @param {string} nomCalcul Le nom du calcul dont on veut la formule
 * @returns {string}
 */
CListeObjets.prototype.getLatexFormula = function (nomCalcul) {
  const calcul = this.pointeurObjetCalcul(nomCalcul, NatCal.NCalcouFoncParFormule)
  if (calcul === null) return ''
  else {
    const varFor = calcul.variableFormelle()
    return calcul.calcul.chaineLatexSansPar(varFor)
  }
}
/**
 * Fonction renvoyant la formule LaTeX représentant le calcul ou la fonction
 * dont le nom est nomCalcul mais avec la formule simplifiée comme elle le serait dans
 * un appel de \ForSimp{nomCalcul} dans un affichage LaTeX.
 * @param {string} nomCalcul Le nom du calcul dont on veut la formule
 * @returns {string}
 */

CListeObjets.prototype.getSimplifiedLatexFormula = function (nomCalcul) {
  const calcul = this.pointeurObjetCalcul(nomCalcul, NatCal.NCalcouFoncParFormule)
  if (calcul === null) return ''
  else {
    const varFor = calcul.variableFormelle()
    return calcul.calcul.calculAvecValeursRemplacees(false).calculNormalise(true, false, false).chaineLatexSansPar(varFor)
  }
}
// Ajout version 4.9.7
/**
 * Fonction utilisée dans j3p.
 * Renvoie le code LaTeX contenu dans l'affichage LaTeX de rang ind dans la liste
 * parmi les affichages LaTeX de la liste.
 * Modifié version 6.4.8 pour renvoyer le dernier affichageLaTeX de la figure si ind = -1
 * @param {number|string} ind Si number,  L'indice de l'affichage LaTeX parmis tous les affichages LaTeX, si string
 * carcatère # suivi du tag de l'objet du type CLatex (depuis version 6.6).
 * @returns {string}
 */
CListeObjets.prototype.getLatexCode = function (ind) {
  let i, el
  let j = 0
  if (typeof ind === 'string') {
    el = this.getById(ind)
    if (el !== null && el.estDeNature(NatObj.NLatex)) return el.chaineLatex.replace(/\\displaystyle/g, ' ').replace(/\\,/g, ' ')
    else return ''
  } else {
    if (ind === -1) {
      for (i = this.longueur() - 1; i >= 0; i--) {
        el = this.get(i)
        if (el.estDeNature(NatObj.NLatex)) return el.chaineLatex.replace(/\\displaystyle/g, ' ').replace(/\\,/g, ' ')
      }
      return ''
    } else {
      for (i = 0; i < this.longueur(); i++) {
        el = this.get(i)
        if (el.estDeNature(NatObj.NLatex)) {
          // Modifié version 6.4 pour exclure les \displaystyle qui ne sont pas gérés par mathquill
          // Version 6.4.8 : On retire aussi les \, qui ne sont pas non plus gérés par MathQuill
          // Ils sont utilisés dans les formules avec conjugués de complexes
          if (j === ind) return el.chaineLatex.replace(/\\displaystyle/g, ' ').replace(/\\,/g, ' ')
          j++
        }
      }
      return ''
    }
  }
}
/**
 * Fonction conçue pour être utilisée de façon externe.
 * Renvoie la formule LaTeX normalisée représentant le calcul ou la fonction
 * une fois que les valeurs utilisées dans la formule ont été remplacées
 * et que les simplifications de normalisation ont été effectuées :
 * Suppression des additions de 0, ddes multiplications ou divisions par 1.
 * @param {string} nomCalcul  Le calcul ou la fonction réelle ou complexe
 * dont on demande la formule;
 * @returns {string}
 */
CListeObjets.prototype.getForSimp = function (nomCalcul) {
  const calcul = this.pointeurObjetCalcul(nomCalcul, NatCal.NCalcouFoncParFormule)
  if (calcul === null) return ''
  else {
    const varFor = calcul.variableFormelle()
    return calcul.calcul.calculAvecValeursRemplacees(false).calculNormalise(true, false, false).chaineLatexSansPar(varFor)
  }
}
/**
 * Fonction exécutant la macro dont l'intitulé ets nameMacro.
 * Pour appeler cette fonction depuis l'application MtgApp le second paramètre svg
 * doit être présent, svg dans lequel est affichée la figure.
 * @param {string} nameMacro
 * @param {SVGElement} svg le svg dans lequel se trouve la figure pour le cas d'un appel depuis
 * la version (un seul paramètre pour appel depuis la version player)
 * @returns {boolean}
 */
CListeObjets.prototype.executeMacro = function (nameMacro, svg = null) {
  const macroAExecuter = this.pointeurMacro(nameMacro)
  if (macroAExecuter === null) return false
  // Ajout version 5.0
  macroAExecuter.setMacroLanceuse(null)
  //
  if (macroAExecuter.executionPossible()) {
    this.macroEnCours = macroAExecuter
    macroAExecuter.initialise()
    if (!svg) svg = document.getElementById(this.id)
    const dimf = new Dimf(svg)
    const doc = this.documentProprietaire
    macroAExecuter.execute(svg, dimf, doc.couleurFond, true)
    return true
  }
  return false
}
/**
 * Fonction demandant la validation de tous les éditeurs de formule de la figure
 * Si la formule qu'ils contiennent est incorrecte ils se trouvent encadrés de rouge.
 * Renvoie true uniquement si aucun éditeur de formule ne contient de faute de syntaxe.
 * @returns {boolean}
 */
CListeObjets.prototype.fieldsValidation = function () {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NEditeurFormule)) {
      if (!elb.validation(false)) return false
    }
  }
  return true
}
/**
 * Fonction renvoyant true si le contenu du permier éditeur de formule
 * ssocié au calcul nomCalcul est correct au point syntaxique et non vide
 * @param {string} nomCalcul
 * @returns {boolean}
 */
CListeObjets.prototype.fieldValidation = function (nomCalcul) {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NEditeurFormule) && (elb.calculAssocie.nomCalcul === nomCalcul)) {
      return elb.validation(false) && (elb.editeur.value.length !== 0)
    }
  }
  return false
}
// Fonction renvoyant le contenu du premier éditeur de formule asssocié au calcul nomCalcul
/**
 * Fonction renvoyant le contenu du premier éditeur de formule asssocié au calcul nomCalcul
 * @param {string} nomCalcul
 * @returns {string}
 */
CListeObjets.prototype.getFieldValue = function (nomCalcul) {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NEditeurFormule) && (elb.calculAssocie.nomCalcul === nomCalcul)) { return elb.editeur.value }
  }
  return 'error'
}
/**
 * Fonction donnant le focus au premier éditeur de formule qui ne contient rien.
 * @returns {void}
 */
CListeObjets.prototype.activateFirstEmptyField = function () {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NEditeurFormule)) {
      if (elb.editeur.value === '') {
        elb.editeur.focus()
        break
      }
    }
  }
}
/**
 * Fonction activant le premier éditeur de formule contenant une
 * formule qui n'est pas correcte sur le plan syntaxique.
 * @returns {void}
 */
CListeObjets.prototype.activateFirstInvalidField = function () {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NEditeurFormule)) {
      if (!elb.validation(false)) {
        elb.editeur.focus()
        break
      }
    }
  }
}
/**
 * Fonction activant le premier éditeur de formule vide ou contenant une
 * formule qui n'est pas correcte sur le plan syntaxique.
 * @returns {void}
 */

CListeObjets.prototype.activateFirstInvalidOrEmptyField = function () {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NEditeurFormule)) {
      if ((elb.editeur.value === '') || !elb.validation(false)) {
        elb.editeur.focus()
        break
      }
    }
  }
}
/**
 * Fonctiondonnant le focus au premier éditeur de formule associé au calcul
 * ou à la fonction nommé nomCalcul.
 * @param {string} nomCalcul
 * @returns {void}
 */
CListeObjets.prototype.activateField = function (nomCalcul) {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NEditeurFormule) && (elb.calculAssocie.nomCalcul === nomCalcul)) {
      elb.editeur.focus()
      break
    }
  }
}
// Fonction vidant tous les champs d'édition
/**
 * Fonction vidant tous les éditeurs de formule de la figure.
 * @returns {void}
 */
CListeObjets.prototype.setEditorsEmpty = function () {
  const svg = document.getElementById(this.id)
  const dimf = new Dimf(svg)
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NEditeurFormule)) {
      elb.editeur.value = ''
      if (elb.affichageFormule) {
        elb.latex.chaineCommentaire = elb.preCodeLaTeX
        elb.latex.positionne(false, dimf)
        elb.latex.setReady4MathJax()
        /* Modification version 6.4.1
        addQueue([elb.callBack, elb, svg])
        */
        addQueue(function () {
          elb.callBack(svg)
        })
      }
    }
  }
}
/**
 * Fonction associant au premier éditeur de formule associé à calcul ou une fonction
 * nommé nomCalcul une fonction de callBack qui sera appelée quand l'utilisateur
 * valide par OK le contenu de l'éditeur.
 * Utilisé dans j3p ou d'autres modules externes.
 * @param {string} nomCalcul
 * @param {function} f
 * @returns {void}
 */
CListeObjets.prototype.setEditorCallBackOK = function (nomCalcul, f) {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NEditeurFormule) && (elb.calculAssocie.nomCalcul === nomCalcul)) {
      elb.callBackOK = f
      break
    }
  }
}
// Ajout version 4.9.3
/**
 * Fonctionmettant dans le premier éditeur de formule associé à nomCalcul
 * la chaine st.
 * @param {string} nomCalcul
 * @param {string} st
 * @returns {void}
 */
CListeObjets.prototype.setEditorValue = function (nomCalcul, st) {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NEditeurFormule) && (elb.calculAssocie.nomCalcul === nomCalcul)) {
      elb.setEditorValue(st)
      break
    }
  }
}
//
// Ajoute au tableau des traces un élément graphique
/**
 * Spécial JavaScript : Ajoute au tableau des traces un élément graphique
 * @param {SVGElement} tr  le svg element qu'on ajoute
 * @returns {void}
 */
CListeObjets.prototype.addTrace = function (tr) {
  const gt = this.documentProprietaire.gTraces
  if (this.nbTraces < CListeObjets.nbMaxiTraces) {
    // this.traces.push(tr); // Supprimé version 4.9.2
    gt.appendChild(tr)
    this.nbTraces++
  } else {
    // gt.removeChild(this.traces.shift()); // Modifié version 4.9.2
    gt.removeChild(gt.childNodes[0])
    // this.traces.push(tr); // Supprimé verison 4.9.2
    gt.appendChild(tr)
  }
}
/**
 * Ajoute au tableau des traces les éléments graphiques d'une liste d'objets
 * @param {CListeObjets} list
 * @returns {void}
 */
CListeObjets.prototype.addTraces = function (list) {
  const gt = this.documentProprietaire.gTraces
  for (let i = 0; i < list.longueur(); i++) {
    const el = list.get(i)
    if (el.existe && el.hasg(false)) { // false pour que même les éléments masqués laissent une trace
      const g = el.createg()
      if (this.nbTraces < CListeObjets.nbMaxiTraces) {
        // this.traces.push(g); // Supprimé version 4.9.2
        gt.appendChild(g)
        this.nbTraces++
      } else {
        // gt.removeChild(this.traces.shift());  // Modifié version 4.9.2
        gt.removeChild(gt.childNodes[0])
        // this.traces.push(g); // Supprimé version 4.9.2
        gt.appendChild(g)
      }
    }
  }
}
/**
 * Fonction retirant toutes les traces de la figure.
 * @returns {void}
 */
CListeObjets.prototype.deleteTraces = function () {
  const gt = this.documentProprietaire.gTraces
  // Modifié version 4.9.2. Inutile de mémoriser les traces dans un tableau
  // while (this.traces.length != 0) gt.removeChild(this.traces.shift());
  while (gt.childNodes.length !== 0) gt.removeChild(gt.childNodes[0])
  this.nbTraces = 0
}
/**
 * Fonction initialisant les traces de la figure si le mode trace
 * de la figure est activé.
 * @returns {void}
 */
CListeObjets.prototype.initialiseTraces = function () {
  if (!this.documentProprietaire.modeTraceActive) this.deleteTraces()
}

/**
 * Fonction renvoyant true si la liste contient un point ou un droite
 * autre que element ayant pour nom st.
 * @param {CElementBase} element
 * @param {string} st  Le nom recherché.
 * @param {boolean} intermPermis  Si true on recherche aussi dans les objets intermédiaires de constructions
 * @returns {boolean}
 */
CListeObjets.prototype.existePointOuDroiteMemeNom = function (element, st, intermPermis = false) {
  let i, elb
  for (i = 0; i < this.longueur(); i++) {
    elb = this.get(i)
    if ((intermPermis || !elb.estElementIntermediaire()) && elb.estDeNature(NatObj.NObjNommable)) {
      if (elb !== element) {
        if (elb.nom === st) return true
      }
    }
  }
  return false
}
// Ajout version 4.8
/**
 * Fonction renvoyant true si la liste contient une fonction réelle ou complexe
 * ou un paramètre de fonction à une variable égal à chaine.
 * @param {string} chaine
 * @returns {boolean}
 */
CListeObjets.prototype.egalNomParametreFonction = function (chaine) {
  for (let i = 0; i < this.longeur; i++) {
    const elb = this.get(i)
    if (elb.getNatureCalcul() === NatCal.NFonction) {
      if (chaine.toLowerCase() === elb.nomsVariables) return true
    } else {
      if (elb.getNatureCalcul() === NatCal.NFonctionComplexe) {
        if (chaine.toLowerCase() === elb.nomsVariables) return true
      }
    }
  }
  return false
}

// Ajout version 4.8
/**
 * Fonction générant un nom de calcul commençant par la chaîne ch
 * Si bchiffreImpose est résent et true, on impose que ch soit suivie d'un chiffre à partir de 1
 * @param ch
 * @param bchiffreImpose
 * @param {string[]} tabNomsInterdits
 * @returns {string}
 */
CListeObjets.prototype.genereNomPourCalcul = function (ch, bchiffreImpose = false, tabNomsInterdits = []) {
  let i, nomGenere
  // Modifié version 4.8
  for (i = bchiffreImpose ? 1 : 0; ; i++) {
    // ce for ressemble à une boucle infinie (pas de condition d'arrêt) mais on passera forcément par le if qui return
    nomGenere = ch
    if (i !== 0) nomGenere += i
    if (
      !this.egalNomValeurOuFonctionOuMesure(nomGenere, this.longueur() - 1, null) &&
      !this.egalNomParametreFonction(nomGenere) &&
      !CCbGlob.egalNomFonctionReelleOuComplexePredefinie(nomGenere) &&
      !tabNomsInterdits.includes(nomGenere)
    ) {
      return nomGenere
    }
  }
}

/**
 * Spécial version mtgApp
 * Remplace dans les CCOmmentaire et CLatex utilisant des affichages dynamiques ancienNom par nouveauNom
 * @param ancienNom
 * @param nouveauNom
 */
CListeObjets.prototype.remplaceNomValeurDynamiqueDansCommentairesOuLatex = function (ancienNom, nouveauNom) {
  let i, elb
  for (i = 0; i < this.longueur(); i++) {
    elb = this.get(i)
    if (elb.estDeNature(NatObj.NComouLatex)) elb.remplaceNomValeurDynamique(ancienNom, nouveauNom)
  }
}
/**
 * Fonction mettant à jour tous les éléments de la liste er les positionnant
 * Cette fonction n'est appelée que par CImplementationProto.prototype.implemente
 * @param infoRandom
 * @param dimfen Dimf
 */
CListeObjets.prototype.metAJourEtPositionne = function (infoRandom, dimfen) {
  let i, el
  for (i = 0; i < this.longueur(); i++) {
    el = this.get(i)
    // Ligne suivante il ne faut pas mettre à jour les éditeurs de formule car au moment de l'apple
    // la figure n'a pas encore été affichée.
    if (!el.estDeNature(NatObj.NEditeurFormule)) el.metAJour()
    el.positionne(infoRandom, dimfen)
  }
}

// Ajout version 4.8
/**
 * Fonction reconstruisant les chaînes de calcul de tous les calculs ou
 * fonctions utilisateur.
 * @returns {void}
 */
CListeObjets.prototype.reconstruitChainesCalcul = function () {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNatureCalcul(NatCal.NCalcOuFoncNonConstante)) { elb.reconstruitChaineCalcul() }
  }
}
/**
 * Fonction renvoyant l'élément final de construction d'indice ind de la liste.
 * La recherche se fait à partir de inddeb.
 * Utilisé dans le constructions itératives.
 * @param {number} inddeb
 * @param {number} ind
 * @returns {CElementBase}
 */
CListeObjets.prototype.getFinal = function (inddeb, ind) {
  let el = null
  let i = inddeb
  let j = -1
  while (j !== ind) {
    el = this.get(i)
    if (el.estElementFinal) {
      if (el.estDeNature(NatObj.NTtObj) || !el.estDeNatureCalcul(NatCal.NAucunCalcul)) j++
    }
    i++
  }
  return el
}
/**
 * Fonction affectant à chaque élément de la liste son indice dans la liste.
 * @returns {void}
 */
CListeObjets.prototype.updateIndexes = function () {
  for (let i = 0; i < this.longueur(); i++) {
    const el = this.get(i)
    // Attention : Les surfaces utilisant un quadrillage utilsiennt un pattern qui dépend de l'index de l'élément
    el.index = i
    if (el.estDeNature(NatObj.NSurface)) {
      if (el.pattern !== null) el.createPattern()
    }
  }
}

// Ajout version 4.9.2
/**
 * Demandant à chaque objet pour lequel c'est nécessaire de se préparer
 * pour le traitement par MathJax (qui sera fait en async)
 * @param {boolean} [bMemeMasques=false] Si true appelé même quand l'objet est masqué (sert pour la boîte de dialogue de protocole)
 * @param {boolean} [bMemeIntermediaires=false] Si true appelé aussi pour les pobjets intermédiaires.
 * @returns {void}
 */
CListeObjets.prototype.setReady4MathJax = function setReady4MathJax (bMemeMasques, bMemeIntermediaires) {
  const memeMasques = arguments.length === 0 ? false : bMemeMasques
  const memeIntermediaires = arguments === 2 ? bMemeIntermediaires : false
  for (let i = 0; i < this.longueur(); i++) {
    const el = this.get(i)
    if (el.existe && (!el.estElementIntermediaire() || memeIntermediaires)) el.setReady4MathJax(memeMasques)
  }
}
/**
 * Fonction demandant à chaque objet pour lequel c'est nécéssaire de se préparer
 * pour le traitement par MathJax qui sera fait via une fonction de callback.
 * Appelée quand on met à jour l'affichage de la figure.
 * Attention, addLatex doit avoir été appelé avant, sinon ça ne fait rien
 * @returns {void}
 */
CListeObjets.prototype.setReady4MathJaxUpdate = function () {
  for (const elb of this.col) {
    if (elb.existe && !elb.estElementIntermediaire()) {
      elb.setReady4MathJaxUpdate()
    }
  }
}
/**
 * Fonction demandant à chaque objet dépendant de elb pour lequel c'est nécéssaire de se préparer
 * pour le traitement par MathJax qui sera fait via une fonction de callback.
 * Appelée quand on met à jour l'affichage de la figure.
 * @param {CElementBase} elb
 * @returns {void}
 */
CListeObjets.prototype.setDependantsReady4MathJaxUpdate = function (elb) {
  for (const el of this.col) {
    if (el.existe && !el.estElementIntermediaire() && el.depDe(elb)) {
      el.setReady4MathJaxUpdate()
    }
  }
}

/**
 * Zoom la figure sur le point de coordonnées (x, y) avec le rapport rapport.
 * @param {number} x
 * @param {number} y
 * @param {number} rapport
 * @returns {void}
 */
CListeObjets.prototype.zoom = function (x, y, rapport) {
  let origineUnite = null
  if (this.pointeurLongueurUnite !== null) {
    const pt1 = this.pointeurLongueurUnite.point1
    if (pt1.estDeNature(NatObj.NPointBase)) origineUnite = pt1
  }
  for (const elb of this.col) {
    if (elb.estDeNature(NatObj.NPointBase)) {
      if ((elb !== origineUnite) && elb.estLibre()) elb.zoom(rapport, x, y)
    } else {
      if (elb.estDeNature(NatObj.NTtObj)) elb.zoom(rapport, x, y)
    }
  }
}
/**
 * Fonction recalculant tous les éléments de type calcul de la figure
 * y compris les calculs de dérivées et lles test d'équivalence de formule
 * et les test de factorisation.
 * @param {boolean} infoRandom
 * @returns {void}
 */
CListeObjets.prototype.calculateNG = function (infoRandom) {
  const dimfen = new Dimf(600, 600)
  this.positionneFullNG(infoRandom, dimfen)
}

CListeObjets.prototype.existeCalculOuVariableOuFonctionOuParametreNomCommencantPar = function (st, indFin) {
  let i, elb
  for (i = 0; i <= indFin; i++) {
    elb = this.get(i)
    if (elb.estDeNatureCalcul(NatCal.NTteValROuC) && !elb.estElementIntermediaire()) {
      if (elb.nomCommencePar(st)) return true
    }
  }
  return false
}
/**
 * Fonction renvoyant true si la liste contient un point ou une droite dotn le nom
 * commence par st.
 * La recherche se fait jusqu'à l'indice indfin.
 * @param {string} st
 * @param {number} indFin
 * @returns {boolean}
 */
CListeObjets.prototype.existePointOuDroiteNomCommencantPar = function (st, indFin) {
  let i, elb
  for (i = 0; i < indFin; i++) {
    elb = this.get(i)
    if (!elb.estElementIntermediaire() && (elb.estDeNature(NatObj.NObjNommable))) {
      if (elb.nom.length !== 0) {
        if (elb.nom.indexOf(st) === 0) return true
      }
    }
  }
  return false
}
/**
 * Fonction générant un nom de Calcul ou fonction libre commençant par debNom.
 * La recherche de noms existants s'arrête à indfin.
 * @param {number} debNom
 * @param {number} indFin
 * @param {string[]} tabNomsInterdits Tableau de noms qu'on ne peut pas utiliser
 * @returns {string}
 */
CListeObjets.prototype.genereDebutNomPourCalcul = function (debNom, indFin, tabNomsInterdits) {
  if (!tabNomsInterdits.includes(debNom) && !this.existeCalculOuVariableOuFonctionOuParametreNomCommencantPar(debNom, indFin)) return debNom
  let ch = 'abcdefghijklmnopqrstuvwxyz'
  const len = ch.length
  let nomGenere = debNom
  let i = 0
  while (true) {
    nomGenere += ch.charAt(i)
    if (i === len - 1) {
      ch = 'abcdefghijklmnopqrstuvwxyz'
      i = 0
    } else {
      i++
      ch = ch.substring(i)
    }
    if (!tabNomsInterdits.includes(nomGenere) &&
      !this.existeCalculOuVariableOuFonctionOuParametreNomCommencantPar(nomGenere, indFin)) { return nomGenere }
  }
}
/**
 * Fonction générant un nom de point libre commençant par debNom.
 * La recherche de noms existants s'arrête à indfin.
 * @param {number} indFin (entier)
 * @returns {string}
 */
CListeObjets.prototype.genereDebutNomPourPoint = function (indFin) {
  let i, j, nomGenere
  const ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  // Modifié version 4.8
  for (i = 0; ; i++) {
    for (j = 0; j < ch.length; j++) {
      nomGenere = ch.charAt(j)
      if (i !== 0) { nomGenere += i }
      if (!this.existePointOuDroiteNomCommencantPar(nomGenere, indFin)) { return nomGenere }
    }
  }
}
/**
 * Fonction utilisée dans les implémentations récursiives de constructions.
 * @param {number} inddeb
 * @param {CPrototype} proto
 * @returns {void}
 */
CListeObjets.prototype.traiteImplementationsProtoSuccessivesRecur = function (inddeb, proto) {
  let i, j, ptgen, elb, nomp, nomc, k, elg2, oldName, newName, e, nomGen
  const lon = this.longueur()
  const type = Nat.or(NatObj.NTtPoint, NatObj.NDroite)
  // On commence par renommer les points ou droites qui sont utilisés comme sources qui sont nommés dans le prototype
  for (i = 0; i < proto.nbObjSources; i++) {
    ptgen = proto.get(i)
    elb = ptgen.elementAssocie
    if (elb.estDeNature(type)) {
      nomGen = ptgen.nom
      // On regarde si l'élément correspondant était nommé.
      if ((nomGen !== '') && (elb.nom === '')) {
        elb.donneNom(this.genereDebutNomPourPoint(inddeb - 1))
      }
    }
  }
  const nomCalcul = this.genereDebutNomPourCalcul('', inddeb - 1, [])
  const nomPoint = this.genereDebutNomPourPoint(inddeb - 1)
  nomp = 1
  // int nomc = 1; // Modifié version 4.9.9
  nomc = 0
  k = 0
  for (i = inddeb + 1; i < lon; i++) {
    elb = this.get(i)
    if (elb.estDeNature(NatObj.NImpProto)) { k = -1 } else {
      if (elb.estDeNature(type)) {
        elg2 = proto.get(proto.nbObjSources + k)
        if (elg2.nom !== '') elb.donneNom(nomPoint + nomp++)
      } else {
        if (elb.estDeNatureCalcul(NatCal.NTtCalcNomme)) {
          // CValeurDynamique vald = (CValeurDynamique) elb;
          oldName = elb.getNom()
          newName = nomCalcul + nomc++
          elb.donneNom(newName)
          // Ajout version 4.9.9. On remet à jour les CCommentaire ou CLateX qui uitiliseraient un affichage dynamique de la valeur
          for (j = i + 1; j < lon; j++) {
            e = this.get(j)
            if (e.estDeNature(NatObj.NImpProto)) break
            if (e.estDeNature(NatObj.NComouLatex)) {
              if (e.listValDynUsed.size !== 0) { if (e.remplaceNomValeurDynamique(oldName, newName)) e.determineDependances() }
              // e.setReady4MathJax();
              // Pour ne pas tout ralentir il faut rajouter un test d'existence avant d'appeler setReady4MathJax
              if (e.existe) e.setReady4MathJax()
            }
          }
        }
        // Correction version 4.9.9
        // if (elb.estDeNatureCalcul(NatureCalcul.NCalcOuFoncNonConstante)) {
        //  elb.reconstruitChaineCalcul();
        // }
      }
    }
    k++
  }
}
/**
 * Fonction utilisée dans les implémentations itératives de constructions.
 * @param {number} inddeb
 * @param {CPrototype} proto
 * @param {number} nbObjImp
 * @returns {void}
 */
CListeObjets.prototype.traiteImplementationsProtoSuccessivesIter = function (inddeb, proto, nbObjImp) {
  let i, ptgen, elb, nomGen, nbfn, k, ch, elg, j, deb, elb2, n, oldName, newName, m, e, vald2
  const lon = this.longueur()
  const type = Nat.or(NatObj.NTtPoint, NatObj.NDroite)
  // On commence par renommer les points ou droites qui sont utilisés comme sources qui sont nommés dans le prototype
  for (i = 0; i < proto.nbObjSources; i++) {
    ptgen = proto.get(i)
    elb = ptgen.elementAssocie
    if (elb.estDeNature(type)) {
      nomGen = ptgen.nom
      if ((nomGen !== '') && (elb.nom === '')) {
        elb.donneNom(this.genereDebutNomPourPoint(inddeb - 1))
      }
    }
  }
  // Ensuite on génère des noms pour tous les objets implémentés noms ou droites qui ont un nom
  // On compte le nombre d'objets finaux nommés
  nbfn = 0
  for (k = proto.nbObjSources; k < proto.longueur(); k++) {
    elb = proto.get(k)
    if (elb.estDeNature(type)) {
      if (elb.nom !== '') nbfn++
    }
  }
  ch = this.genereDebutNomPourPoint(inddeb - 1) // Le début du nom généré qui sera le même pour tous
  // les objets de même type
  k = 0
  const nomsUtilises = []
  for (i = 0; i < nbObjImp; i++) {
    elb = this.get(inddeb + 1 + i)
    if (elb.estDeNature(type)) {
      elg = proto.get(proto.nbObjSources + i)
      if (elg.nom !== '') {
        k++
        elb.donneNom(ch + k)
        j = 1
        deb = inddeb + 1 + i + j * (nbObjImp + 1)
        while (deb < lon) {
          elb2 = this.get(deb)
          n = k + j * nbfn
          elb2.donneNom(ch + n)
          j++
          deb = inddeb + 1 + i + j * (nbObjImp + 1)
        }
      }
    } else {
      if (elb.estDeNatureCalcul(NatCal.NTtCalcNomme)) {
        // Modifié version 6.7.2
        ch = this.genereDebutNomPourCalcul(Fonte.premiersCaracteresNonChiffresNonPrime(elb.getNom()), inddeb - 1, nomsUtilises)
        nomsUtilises.push(ch)
        oldName = elb.getNom()
        j = 0
        deb = inddeb + 1 + i + j * (nbObjImp + 1)
        while (deb < lon) {
          vald2 = this.get(deb)
          oldName = vald2.getNom()
          newName = ch + String(j + 1)
          vald2.donneNom(newName)
          for (m = deb + 1; m < lon; m++) {
            e = this.get(m)
            if (e.estDeNature(NatObj.NImpProto)) break
            if (e.estDeNature(NatObj.NComouLatex)) {
              if (e.listValDynUsed.size !== 0) { if (e.remplaceNomValeurDynamique(oldName, newName)) e.determineDependances() }
              e.setReady4MathJax()
            }
          }
          j++
          deb = inddeb + 1 + i + j * (nbObjImp + 1)
        }
      }
    }
  }
  // On reconstitue les formules des calculs ou fonctions
  for (i = inddeb + 1; i < lon; i++) {
    elb = this.get(i)
    if (elb.estDeNatureCalcul(NatCal.NCalcOuFoncNonConstante)) { elb.reconstruitChaineCalcul() }
  }
  // On met à jour les éléments ajoutés et on les met à jour
  for (i = inddeb + 1; i < lon; i++) {
    elb = this.get(i)
    elb.metAJour()
  }
}

// Ajout version 6.4.9
/**
 * Fonction renvoyant le nombre d'implémengtations de prototype ayant pour nom nomProto dans la figure
 * @param nomProto
 * @returns {number}
 */
CListeObjets.prototype.nombreImpProto = function (nomProto) {
  let nb = 0
  for (let i = this.longueur() - 1; i >= 0; i--) {
    const el = this.get(i)
    if (el.getNature() === NatObj.NImpProto) {
      if (el.nomProto === nomProto) nb++
    }
  }
  return nb
}

/**
 * Spécial mtgApp : Crée en bas et à droite de la figure des petits dialogues
 * associés aux variables pour lesquelles c'est requis.
 */
CListeObjets.prototype.creePaneVariables = function () {
  let nb = 0
  for (let i = this.longueur() - 1; i >= 0; i--) {
    const el = this.get(i)
    if (el.getNatureCalcul() === NatCal.NVariable && !el.estElementIntermediaire()) {
      if (el.dialogueAssocie) {
        el.creeDiv(nb)
        nb++
      }
    }
  }
}

CListeObjets.prototype.genereNomPourPoint = function (intermPermis = false) {
  const ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let nomGenere
  for (let i = 0; ; i++) {
    for (let j = 0; j < ch.length; j++) {
      nomGenere = ch.charAt(j)
      if (i !== 0) { nomGenere += String(i) }
      if (!this.existePointOuDroiteMemeNom(null, nomGenere, intermPermis)) { return nomGenere }
    }
  }
}

/**
 * Spécial version mtgApp
 * Renvoie un nom généré pour un point ou une droite qui commence par car
 * @param {string} car
 * @param {boolean} bchiffreImpose si true le nom généré doit comporter au moins un chiffre
 * @returns {string}
 */
CListeObjets.prototype.genereNomPourPointOuDroite = function (car, bchiffreImpose = false) {
  let nomGenere
  for (let i = bchiffreImpose ? 1 : 0; ; i++) {
    nomGenere = car
    if (i !== 0) nomGenere += i
    if (!this.existePointOuDroiteMemeNom(null, nomGenere)) { return nomGenere }
  }
}

/**
 * Spécial version mtgApp.
 * Renvoie true si la liste contient un objet graphique non intermédiaire de nom st
 * autre que el
 * @param el CElementGraphique
 * @param st String
 * @returns {boolean}
 */
CListeObjets.prototype.existeMemeNomNonIntermediaire = function (el, st) {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NTtObjSaufDuplique) && !elb.estElementIntermediaire() && (elb !== el)) {
      if (elb.nom === st) return true
    }
  }
  return false
}

/**
 *
 * @param valeur
 * @param st
 * @param intermPermis
 * @returns {boolean}
 */
CListeObjets.prototype.existeCalculOuVariableOuFonctionOuParametreMemeNom = function (valeur, st, intermPermis) {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNatureCalcul(NatCal.NTtCalcNomme) && (!elb.estElementIntermediaire() || intermPermis) && (elb !== valeur)) {
      // CValeurDynamique ptv = (CValeurDynamique) elb;
      if (elb.getNom() === st) return true
    }
  }
  return false
}

/**
 * Spéciail version mtgApp
 * Met à jour dans tous les commentaires les affichages dynamiques
 */
CListeObjets.prototype.determineDependancesCommentaires = function () {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    if (elb.estDeNature(NatObj.NComouLatex)) elb.determineDependances()
  }
}

/**
 * Fonction remplaçant dans tous les objets de la liste l'objet ancienPoint
 * par l'objet nouveauPoint
 */
CListeObjets.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  for (let i = 0; i < this.longueur(); i++) {
    const elb = this.get(i)
    elb.remplacePoint(ancienPoint, nouveauPoint)
  }
  // Les listes gérées de façon internes par les macros doivent être mises à jour
  this.etablitListesInternesMacros()
}

/**
 * Fonction remplaçant le nom du point ou de la droite ayant pour nom oldName
 * par newName à condition qu'aucun point ou droite déjà existant (et non intermédiaire)
 * n'ait déjà poir nom newName
 * @param oldName Le nom du point ou de la droite à renommer
 * @param newName
 * @param svg
 */
CListeObjets.prototype.rename = function (oldName, newName, svg) {
  if (oldName !== '') {
    for (let i = 0; i < this.longueur(); i++) {
      const elb = this.get(i)
      if (elb.existe && elb.estDeNature(NatObj.NObjNommable)) {
        if ((elb.nom === oldName) && !this.existePointOuDroiteMemeNom(null, newName)) {
          elb.nom = newName
          if (elb.g !== null) {
            // Si la figrue a déjà eu le temps d'être affichée
            elb.updateName(svg, true)
          }
        }
      }
    }
  }
}

/**
 * Fonction renvoyant s'il existe un pointeur sur le point ayant pour nom name
 * et qui ne soit pas un objet intermédiaire de construction
 * Renvoie null s'il n'existe pas un tel point
 * @param {string} name le nom du point cherché
 * @returns {null|CPt}
 */
CListeObjets.prototype.getPointByName = function (name) {
  if (!name) return null
  for (const elb of this.col) {
    if (!elb.estElementIntermediaire() && elb.estDeNature(NatObj.NTtPoint) && elb.nom === name) return elb
  }
  return null
}

// Ajouté version 6.5.2
/**
 * Fonction translatant tous les objets de la figure du vecteur (decx, decy)
 * @param decx
 * @param decy
 * @returns {boolean} : Renvoie true si au moins un objet a été modifié et false sinon
 */
CListeObjets.prototype.translateDe = function (decx, decy) {
  let modif = false
  const nat = Nat.or(NatObj.NAffLieAPoint, NatObj.NPointBase)
  for (let i = 0; i < this.longueur(); i++) {
    const el = this.get(i)
    if (el.estDeNature(nat) && !el.fixed) {
      el.translateDe(decx, decy)
      modif = true
    }
  }
  return modif
}

/**
 * Fonction donnant une formule adaptée au calcul de produit scalaire (pour les carrés scalaires)
 * au calcul complexe nommé nomCalcul
 * Cette fonction sert dans les exercices sur le produit scalaire et ne doit être appelée qu'une fois
 * que la liste a été positionnée.
 * @param nomCalcul
 * @param {string[]} tabNames : Tableau contenant les noms des calculs complexes considérés comme des vecteurs
 * @returns {boolean}
 */
CListeObjets.prototype.setFormula4Prosca = function (nomCalcul, tabNames) {
  const nTtCalcOuFoncComp = Nat.or(NatCal.NCalculComplexe, NatCal.NFonctionComplexe, NatCal.NFoncCPlusieursVar)
  const calc = this.pointeurParNatureCalcul(nTtCalcOuFoncComp, nomCalcul)
  if (calc === null) return false
  calc.calcul = calc.calcul.getCalc4Prosca(tabNames)
  return true
}

/**
 * Fonction renvoyant true si la figure a déjà un élément de tag tag autre que exclu
 * qui ne soit pas un élément intermédiaire de construction
 * @param {string} tag
 * @param {CElementBase} exclu
 * @returns {boolean}
 */
CListeObjets.prototype.hasElementOfTag = function (tag, exclu) {
  for (const el of this.col) {
    if (el.tag && el !== exclu && !el.estElementIntermediaire() && el.tag === tag) return true
  }
  return false
}

/**
 * Ajoute un élément à la liste et l'affiche dans le svg svg
 * @param {CElementGraphique[]} tabelt
 * @param {SVGElement} svg
 * @returns {Promise<undefined>} La promesse sera résolue quand l'élément sera affiché
 */
CListeObjets.prototype.addAndDisplayElts = function (tabelt, svg) {
  for (let i = 0; i < tabelt.length; i++) {
    const elt = tabelt[i]
    this.add(elt)
    elt.id = this.id + '#' + elt.index
    const dimf = this.getDimf()
    elt.positionne(false, dimf)
    if (!elt.masque) elt.setReady4MathJax()
    const doc = this.documentProprietaire
    if (i !== tabelt.length - 1) {
      addQueue(() => {
        elt.creeAffichage(svg, true, doc.couleurFond)
      })
    } else {
      return addQueue(() => {
        elt.creeAffichage(svg, true, doc.couleurFond)
      })
    }
  }
}

CListeObjets.prototype.getDimf = function () {
  return this.documentProprietaire.dimf
}

// méthodes statiques
/**
 * Affecte factory la propriété statique factory. Doit être appelé avant la création
 * de la première instance de CListeObjets
 * @param factory
 */
CListeObjets.setFactory = function (factory) {
  CListeObjets.factory = factory
}

/**
 * Fonction qui, pour les éléments qui implémentent un foreign object (CEditeurFormule et CVariableBornee)
 * le retirent du svg pour l'y remettre de façon à ce qu'ils soient affichés par dessus les autres objets
 */
CListeObjets.prototype.reclassForeignElts = function () {
  for (const el of this.col) {
    if (el.hasComponent()) {
      const par = el.foreignElt?.parentNode
      if (par) {
        // on le remet en dernier (le remove est probablement inutile
        // mais pas sûr que tous les navigateur reclassent quand le parent reste inchangé)
        par.removeChild(el.foreignElt)
        par.appendChild(el.foreignElt)
      }
    }
  }
}
