/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import COb from './COb'
export default CElementBase

/**
 * Objet ancetre de tous les objets d'une figure, graphiques ou numériques.
 * @constructor
 * @extends COb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire
 * @param {CImplementationProto} impProto  La construction propriétaire de l'objet (peut-être nnull)
 * @param {boolean} estElementFinal  true si l'objet est un élément final de construction
 * @returns {void}
 */
function CElementBase (listeProprietaire, impProto, estElementFinal) {
  if (arguments.length === 0) return // Ajout version WebPack
  COb.call(this, listeProprietaire)
  if (arguments.length !== 1) {
    this.impProto = impProto
    this.estElementFinal = estElementFinal
  } else {
    this.impProto = null
    this.estElementFinal = false
  }
  // Eléments utilisés par certains descendants
  this.elementGeneriqueAssocie = null
  this.dependDeElementTeste = false
  this.elementTestePourDependDe = null
  this.elementTestePourDependDePourRec = null
  this.index = -1
}
// noinspection JSCheckFunctionSignatures
CElementBase.prototype = new COb()
CElementBase.prototype.constructor = CElementBase
CElementBase.prototype.superClass = 'COb'
CElementBase.prototype.className = 'CElementBase'

/**
 * Fonction renvoyant la nature graphique de l'objet du type NatObj
 * @returns {Nat}
 */
CElementBase.prototype.getNature = function () {
  return NatObj.NAucunObjet
}
/**
 * Fonction renvoyant la nature de calcul de l'objet du type NatCal
 * @returns {Nat}
 */
CElementBase.prototype.getNatureCalcul = function () {
  return NatCal.NAucunCalcul
}
/**
 * Fonction renvoyant true si la nature graphique de l'objet est d'un des
 * types spécifiés dans nat (obtenu par l'opérateur | à partir de plusieurs
 * long spécifiant une nature graphique
 * @param {Nat} nat
 * @returns {boolean}
 */
CElementBase.prototype.estDeNature = function (nat) {
  return this.getNature().isOfNature(nat)
}
/**
 * Fonction renvoyant true si la nature calcul de l'objet est d'un des
 * types spécifiés dans nat (obtenu par l'opérateur | à partir de plusieurs
 * long spécifiant une nature graphique
 * @param {Nat} nat
 * @returns {boolean}
 */
CElementBase.prototype.estDeNatureCalcul = function (nat) {
  return this.getNatureCalcul().isOfNature(nat)
}
/**
 * Ajout pour la version java. Pour une valeur numérique renverra la chaîne la
 * représentant et pour un repère la chaîne le représentant (par exemple "(O,I,J)")
 * A redéfinir pour ces objets
 * @returns {string}
 */
CElementBase.prototype.getNom = function () {
  return ''
}
/**
 * Fonction chargée de mettre à jour l'objet quand un
 * élément dont il dépend a été modifié. Devra être appelé par les lieux de
 * points et lieux d'objets pour remettre à jour les liste qu'ils utilisent de
 * façon interne. A redéfinir pour ces objets
 * @returns {void}
 */
CElementBase.prototype.metAJour = function () {
}
/**
 * Fonction ajoutant à liste les éléments qui ont généré l'objet. A redéfinir
 * pour les descendants. Par exemple pour une droite passant par deux points,
 * ajoutera à la liste un pointeur sur ces deux points.
 * @param {CListeObjets} liste
 * @param {MtgApp} [app] L'application propriétaire. Ce paramètre ne sert que pour les translations
 * @returns {void}
 */
CElementBase.prototype.ajouteAntecedents = function (liste, app) {
}

// on doit lister les arguments qui seront utilisés par les classes qui nous étendent
// noinspection JSUnusedLocalSymbols
/**
 * Fonction servant à créer un clone de tout objet dans une autre liste
 * A redéfinir pour les descendants.
 * @param {CListeObjets} listeSource  La liste propriétaire de l'objet à cloner
 * @param {CListeObjets} listeCible  La liste dans laquelle sera créé l'objet cloné
 * @returns {CElementBase}
 */
CElementBase.prototype.getClone = function (listeSource, listeCible) {
  return null
}
/**
 * Fonction servant à cloner l'état d'un objet identique au lieu de le
 * positionner. Utilisé pour les lieux d'objets. Doit appeler la méthode
 * de l'objet ancêtre au début.
 * @param {CElementBase} ptel
 * @returns {void}
 */
CElementBase.prototype.setClone = function (ptel) {
  this.existe = ptel.existe
}

// on doit lister les arguments qui seront utilisés par les classes qui nous étendent
// noinspection JSUnusedLocalSymbols
/**
 * Fonction calculant l'élément pour le positionner dans la figure.
 * Doit en général appeler la méthode de l'objet ancêtre.
 * @param {boolean} infoRandom  true si les calculs aléatoires doivent être relancés
 * @param {Dimf} dimfen  Dimensions du svg dans lequel la figure est dessinée
 * @returns {void}
 */
CElementBase.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = true
}
/**
 * Recalcule entièrement l'élément, y compris pour les dérivées et tests d'équivalences de formules et autres objets
 * @param {boolean} infoRandom
 * @param {Dimf} dimfen
 * @returns {void}
 */
CElementBase.prototype.positionneFull = function (infoRandom, dimfen) {
  this.positionne(infoRandom, dimfen)
}
/**
 * Fonction initialisant la propriété servant à déterminer la recherche de dépendance
 * @returns {void}
 */
CElementBase.prototype.initialisePourDependance = function () {
  this.elementTestePourDependDe = null
}
/**
 * Fonction servant à mémoriser une dépendance d'objet
 * @param {boolean} resultat
 * @returns {boolean}
 */
CElementBase.prototype.memDep = function (resultat) {
  this.dependDeElementTeste = resultat
  return resultat
}
/**
 * Fonction renvoyant true si this dépend de p
 * @param {CElementBase} p
 * @returns {boolean}
 */
CElementBase.prototype.depDe = function (p) {
  // Ajout version 3.4.2
  this.elementTestePourDependDe = p
  let res = false
  // Modifié pour la version 2.5 pour qu'un objet final ou intermédiaire
  // d'une implémentation de prototype dépende de cette implémentation
  if (this.impProto !== null) {
    if (this.impProto === p) res = true
  }
  res = res || (p === this)
  return res
}
/**
 * Fonction renvoyant le même résultat que depDe sauf pour certains objets
 * @param {CElementBase} p
 * @returns {boolean}
 */
CElementBase.prototype.dependDePourBoucle = function (p) {
  return (p === this)
}
/**
 * Fonction renvoyant le même résultat que depDe sauf pour certains objets
 * @param {CElementBase} p
 * @returns {boolean}
 */
CElementBase.prototype.dependDePourCapture = function (p) {
  return this.depDe(p)
}
/**
 * Fonction renvoyant true si l'objet pointé par p est confondu avec this.
 * @param {CElementBase} p
 * @returns {boolean}
 */
CElementBase.prototype.confonduAvec = function (p) {
  return this === p
}
/**
 * Fonction replaçant un pointeur sur un point par un autre point.
 * Utilisée entre autres dans le reclassement d'objets.
 * A redéfinir pour chacun des descendants maintenant un pointeur sur un point.
 * @param {CPt} ancienPoint
 * @param {CPt} nouveauPoint
 * @returns {void}
 */
CElementBase.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
}
/**
 * Fonction renvoyant true si l'objet est un objet intermédiaire de construction
 * @returns {boolean}
 */
CElementBase.prototype.estElementIntermediaire = function () {
  return !this.estElementFinal && (this.impProto !== null)
}

// on doit lister les arguments qui seront utilisés par les classes qui nous étendent
// noinspection JSUnusedLocalSymbols
/**
 * Fonction qui renverra true si l'objet nécessite que el soit nommé
 * @param {CElementGraphique} el
 * @returns {boolean}
 */
CElementBase.prototype.nomIndispensable = function (el) {
  return false
}

/**
 * Renvoie true si un élément est capturable à la souris.
 * Sera redéfini pour les lieux d'objets générés par un CCommentaire ou un CLatex de façon à ce que
 * l'outil de capture permette de faire glisser un tel lieu en faisant glisser le CCommentaire ou
 * le CLatex qui l'a généré.
 * @returns {boolean}
 */
CElementBase.prototype.estCapturableSouris = function () {
  return true
}

/**
 * Fonction retirant le composant foreignElt (foreign object) instancié par l'objet
 * Redéfini pour CEditeurFormule
 * @returns {void}
 */
CElementBase.prototype.deleteComponent = function () {
}
/**
 * Lecture de l'objet dans le flux
 */
/**
 * Fonction lisant l'objet dans le flux de données binaires.
 * Devra être appelée par tous les descendants.
 * @param {DataInputStream} inps
 * @param {CListeObjets} list  La liste propriétaire de tous les objets en cours de génération
 * @returns {void}
 */
CElementBase.prototype.read = function (inps, list) {
  COb.prototype.read.call(this, inps, list)
  this.estElementFinal = inps.readBoolean()
  const ind1 = inps.readInt()
  this.impProto = list.get(ind1)
}
/**
 * Fonction enregistrant l'objet dans le flux de données binaires.
 * Devra être appelée par tous les descendants.
 * @param {DataOutputStream} oups
 * @param {CListeObjets} list
 * @returns {void}
 */
CElementBase.prototype.write = function (oups, list) {
  oups.writeBoolean(this.estElementFinal)
  let ind1
  if (this.impProto === null) ind1 = -1
  else ind1 = list.indexOf(this.impProto)
  oups.writeInt(ind1)
}
// noinspection JSUnusedLocalSymbols
/**
 * Fonction qui sera redéfinie pour CLaTeX et CLieuObjetAncetre
 * Met sur la pile MathJax.hub.Queue de MathJax une fonction de callback qui demande à
 * MathJax de préparer un affichage graphique pour ensuite récupérer son svg
 * @param {boolean} [bMemeMasque=false] passer true pour le faire même si l'affichage est caché (sert dans la boîte de dialogue de protocole)
 * @returns {void}
 */
CElementBase.prototype.setReady4MathJax = function (bMemeMasque) {
}
/**
 * Fonction qui sera redéfinie pour CLaTeX et CLieuObjetAncetre
 * Met sur la pile MathJax.hub.Queue de MathJax une fonction de callback qui demande à
 * MathJax de préparer un affichage graphique pour ensuite récupérer son svg
 * @returns {void}
 */
CElementBase.prototype.setReady4MathJaxUpdate = function () {
}

/**
 * Fonction renvoyant true si l'objet utilise un composant plaqué sur la figure et peut être déplacé ou
 * ne pas exister ce qui est le cas des Editeurs de formule pour le moment
 * @returns {boolean}
 */
CElementBase.prototype.hasComponent = function () {
  return false
}
