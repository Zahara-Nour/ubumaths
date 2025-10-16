/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CElementBase from '../objets/CElementBase'
export default CElementBase

/**
 * Fonction renvoyant true si l'objet dépend des positions générées pas les
 * déplacements d'un point lié A redéfinir pour les lieux de points et lieux
 * d'objets et macros utilisant les déplacements d'un point lié
 * @param {CPointLie} pointlie
 * @returns {boolean}
 */
CElementBase.prototype.estGenereParPointLie = function (pointlie) {
  return false
}

/**
 * Fonction renvoyant true si l'objet nécessite
 * une longueur unité pour fonctionner.
 * A redéfinir pour ce type d'objet :
 * par exemple mesure de longueur, d'aire, cercle par rayon.
 * @returns {boolean}
 */
CElementBase.prototype.utiliseLongueurUnite = function () {
  return false
}

/**
 * fonction renvoyant un pointeur vers l'antécédent
 * direct de l'objet. Si l'objet est un objet qui ne nécessite pas lors de sa
 * création la création d'objets supplémentaires, renvoie this et sinon envoi
 * un pointeur sur le premier de ces objets suppélmentaires créés. Par
 * exemple, pour un point lié à un bipoint (intersection de deux cercles ou
 * d'un cercle et une droite) renverra un pointeur sur le bipoint créé avant
 * ce CPointLieBipoint. Pour une objet image, renverra un pointeur vers la
 * transformation utilisée etc ...
 * @returns {CElementBase}
 */
CElementBase.prototype.antecedentDirect = function () {
  return this
}

/**
 * Fonction renvoyant une chaîne décrivant l'élément. A redéfinir pour les descendants
 * @returns {string}
 */
CElementBase.prototype.infoHist = function () {
  return ''
}

/**
 * Fonction renvoyant une chaîne courte pour décrire l'objet dans la liste de tous les objets de la boîte de dialogue
 * de protocole de la figure.
 * @returns {string}
 */
CElementBase.prototype.info = function () {
  return this.infoHist()
}

/**
 * Fonction appelée pour certains objets une fois qu'ils ont été ajoutés à la figure
 *
 Abandonné
 *
CElementBase.prototype.metAJourPourCreation = function() {
};
*/

/**
 * Fonction renvoyant true si l'objet peut être modifié via l'outil de modification d'objet graphique
 * pour les objets créés à l'aie d'une boîte de dialogue
 * @returns {boolean}
 */
CElementBase.prototype.modifiableParMenu = function () {
  return false
}

/**
 * Fonction renvoyant true si l'objet peut être modifié via la boîte de dialogue de protocole
 * Est redéfini pour l'objet CBarycentre
 * pour les objets créés à l'aie d'une boîte de dialogue
 * @returns {boolean}
 */
CElementBase.prototype.modifiableParProtocole = function () {
  return this.modifiableParMenu() && !this.estElementIntermediaire()
}

/**
 * Fonction qui sera redéfinie pour CLaTeX et CLieuObjetAncetre
 * Met sur la pile MathJax.hub.Queue de MathJax une fonction de callback qui demande à
 * MathJax de préparer un affichage graphique pour ensuite récupérer son svg
 * Dans cette version différente de setReady4MathJax même les LaTeX masqués sonbt préparés
 * @returns {void}
 */
CElementBase.prototype.setReady4MathJaxEvenMasked = function () {
  this.setReady4MathJaxUpdate()
}

/**
 * Fonction servant à mémoriser une dépendance d'objet pour le reclassement
 * @param {boolean} resultat
 * @returns {boolean}
 */
CElementBase.prototype.memDep4Rec = function (resultat) {
  this.dependDeElementTestePourRec = resultat
  return resultat
}

// Cette fonction est redéfinie pour la version application pour pouvoir gérer le reclassement d'objets
CElementBase.prototype.initialisePourDependance = function () {
  this.elementTestePourDependDe = null
  this.elementTestePourDependDePourRec = null // Ajout version 4.8
}

CElementBase.prototype.depDe4Rec = function (p) {
  let res = false
  // Ajout version 3.4.2
  this.elementTestePourDependDePourRec = p
  // Un objet final ou intermédiaire d'une implémentation de prototype dépend des objets sources de cette implémentation
  if (this.impProto !== null) { res = this.impProto.depDe(p) }
  res = res || (p === this)
  return res
}

/**
 * Fonction renvoyant la même chose que dependDePourReclassement sauf dans le
 * cas où l'élément p est un élément final de construction auquel cas on
 * revoie l'équivalent mais pour le bloc d'éléments finaux de la construction
 * auquel appartient p. Est utilisé dans le reclassement d'un objet en fin de
 * liste des objets créés
 *
 * @param p
 * @returns {boolean}
 */
CElementBase.prototype.dependDeBlocPourReclassement = function (p) {
  if (p.impProto === null) { return this.depDe4Rec(p) } else {
    const list = this.listeProprietaire
    const imp = p.impProto
    const ind = list.indexOf(imp)
    const nb = imp.nbFinaux + imp.nbIntermediaires
    for (let i = 1; i <= nb; i++) {
      const elb = list.get(ind + i)
      if (!elb.estElementIntermediaire()) { if (this.depDe4Rec(elb)) return true }
    }
    return false
  }
}

/**
 * Fonction renvoyant le même résultat que dependDeBlocPourReclassement si
 * l'objet n'est pas un objet final et sinon renvoyant true si le bloc
 * constitué par l'impélmentation de prototype dont l'objet est un objet final
 * contient au moins un élément pour lequel dependDeBlocPourReclassement
 * renvoie true; Sert dans CListeObjet.decaleDependants
 *
 * @param p
 * @returns {boolean}
 */

CElementBase.prototype.appartientABlocDependantPourReclassement = function (p) {
  if (this.impProto === null) {
    return this.dependDeBlocPourReclassement(p)
  }
  const ind = this.listeProprietaire.indexOf(this.impProto)
  const nb = this.impProto.nbFinaux + this.impProto.nbIntermediaires
  for (let i = 1; i <= nb; i++) {
    const el = this.listeProprietaire.get(ind + i)
    // Bug corrigé version 4.2.2
    // res = res || el.dependDePourReclassement(p);
    if (el.dependDeBlocPourReclassement(p)) return true
  }
  return false
}

/**
 * Fonction utilisée dans le protocole de la figure et renvoyant true si l'objet peut figurer
 * dans la boîte de dialogue de protocole de la figure.
 * Seulement redéfini pour CBipoint
 * @returns {boolean}
 */
CElementBase.prototype.estVisibleDansHist = function () {
  return true
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CElementBase.prototype.genereNom = function () {
  return ''
}

/**
 * Fonction servant dans les exercices de constructions pour savoit si un objet est presque confondu avec un autre
 * Redéfini pour les objets qui peuvent être demandés de construire lors d'une exercice de construction :
 * Point, droite, demi-droite, segement, cercle, polygone
 * @param p
 * @returns {boolean}
 */
CElementBase.prototype.coincideAvec = function (p) {
  return false
}

CElementBase.prototype.setCloneTikz = function (ptel) {
  this.setClone(ptel)
}

CElementBase.prototype.positionneTikz = function (infoRandom, dimfen) {
  this.positionne(infoRandom, dimfen)
}

/**
 * Fonction utilisée lors de l'exportation de la figure pour adapter la figure à une résolution plus élevée
 * ou plus basse.
 * @param {number} coef Le coefficient d'agrandissement-réduction
 */
CElementBase.prototype.adaptRes = function (coef) {
}

CElementBase.prototype.dependDeAuMoinsUn = function (list) {
  for (const el of list.col) {
    if (this.depDe(el)) return true
  }
  return false
}

/**
 * Fonction servant à savoir si un objet est entièrement défini par uniquement des objets figurant dans une
 * liste passée en paramètre. Sert pour créer une macro-construction
 * @param {CListeObjets} listeOb
 * @returns {boolean}
 */
CElementBase.prototype.estDefiniParObjDs = function (listeOb) {
  return false // Par exemple CBipoint ne redéfinit pas cette fonction
}

/**
 * Fonction renvoyant true si this est défini uniquement par des éléments de la liste listeOb
 * @param listeOb
 * @returns {boolean}
 */
CElementBase.prototype.estDefPar = function (listeOb) {
  return (listeOb.contains(this) || this.estDefiniParObjDs(listeOb))
}

/**
 * Version 6.1.0 : Renvoie true si le cercle est un cercle défini par centre, c'est-à-dire CCercleOA, CCErcleOR ou CCercleOAB
 * Sera donc redéfini pour ces 3 objets à true
 * @returns {boolean}
 */
CElementBase.prototype.estCercleParCentre = function () {
  return false
}

// Ajouté version 6.4.2
/**
 * Fonction renvoyant true si l'objet dépend d'un prototype incorporé dans la figure.
 * Sera redéfini pour les macros de constructions itératives et récursives
 * @param {CPrototype} proto
 * @returns {boolean}
 */
CElementBase.prototype.depDeProto = function (proto) {
  return false
}
