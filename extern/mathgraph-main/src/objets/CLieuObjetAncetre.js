/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import { MAX_VALUE } from '../kernel/kernel'
import CElementGraphique from './CElementGraphique'
import CListeObjets from './CListeObjets'
import CValeur from './CValeur'
import CSousListeObjets from './CSousListeObjets'
export default CLieuObjetAncetre

/**
 * Classe ancêtre de tous les lieux d'objets.
 * @constructor
 * @extends CElementGraphique
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la liste propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} masque  true si l'objet est masqué
 * @param {CElementGraphique} elementAssocie  L'objet qui laisse une trace.
 * @param {CValeur} nombreTraces  Le nombre d'objets pour la trace (dynamique).
 * @returns {CLieuObjetAncetre}
 */
function CLieuObjetAncetre (listeProprietaire, impProto, estElementFinal, couleur,
  masque, elementAssocie, nombreTraces) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CElementGraphique.call(this, listeProprietaire)
    else {
      CElementGraphique.call(this, listeProprietaire, impProto, estElementFinal, couleur, true,
        0, 0, masque, '', 2, 0, 0)
      this.elementAssocie = elementAssocie
      this.nombreTraces = nombreTraces
      this.listeCopiesObjet = new CListeObjets(listeProprietaire.uniteAngle, listeProprietaire.pointeurLongueurUnite)
    }
    this.listeElementsAncetres = new CSousListeObjets()
  }
}
CLieuObjetAncetre.prototype = new CElementGraphique()
CLieuObjetAncetre.prototype.constructor = CLieuObjetAncetre
CLieuObjetAncetre.prototype.superClass = 'CElementGraphique'
CLieuObjetAncetre.prototype.className = 'CLieuObjetAncetre'

// Version 7.6.1 : On passe le nombre d'objets maxis d'un lieu d'objets à 200 000 au lieu de 100 000
CLieuObjetAncetre.nombreMaxiPourLieuObjet = 250000
CLieuObjetAncetre.prototype.setClone = function (ptel) {
  CElementGraphique.prototype.setClone.call(this, ptel)
  for (let i = 0; i < this.listeCopiesObjet.longueur(); i++) {
    const elb1 = this.listeCopiesObjet.get(i)
    const elb2 = ptel.listeCopiesObjet.get(i)
    elb1.setClone(elb2)
  }
}
CLieuObjetAncetre.prototype.positionne = function (infoRandom, dimfen) {
  CElementGraphique.prototype.positionne.call(this, infoRandom, dimfen)
  this.nombreTraces.positionne(infoRandom, dimfen)
  this.existe = this.existe && this.nombreTraces.existe
}
CLieuObjetAncetre.prototype.metAJour = function () {
  this.prepareListeCopiesObjet()
  this.donneCouleur(this.couleur)
}
CLieuObjetAncetre.prototype.nombreObjetsPourLieuObjet = function () {
  if (!this.nombreTraces.existe) return MAX_VALUE
  let d = Math.round(this.nombreTraces.rendValeur()) * Math.round(this.elementAssocie.nombreObjetsPourLieuObjet())
  if ((d < 0) || (d > MAX_VALUE)) d = MAX_VALUE
  return d
}
CLieuObjetAncetre.prototype.initialisePourDependance = function () {
  CElementGraphique.prototype.initialisePourDependance.call(this)
  this.nombreTraces.initialisePourDependance()
}
CLieuObjetAncetre.prototype.prepareListeCopiesObjet = function () {
  // Il faut créer la liste des éléments dont dépend le point à tracer
  // Pour cette liste, on fait pointer la longueur unité éventuelle sur la liste mère
  this.listeCopiesObjet.retireTout()
  const nbt = Math.round(this.nombreTraces.rendValeur())
  if ((nbt >= 2) && (nbt <= CLieuObjetAncetre.nombreMaxiPourLieuObjet)) {
    this.listeCopiesObjet.ajouteClonesDe(this.elementAssocie, nbt)
    // Ligne suivante ajoutée version 2.0
    // Nécessaire pour les lieux de lieux d'objets car ce type d'objet mainient une liste
    // qui est instanciée de façon dynamique
    this.listeCopiesObjet.metAJour()
  }
  // La ligne suivante sert à donner aux objets clonés servant à la trace la couleur du lieu
  // d'objet
  this.donneCouleur(this.couleur)
}

CLieuObjetAncetre.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CElementGraphique.prototype.depDe.call(this, p) ||
    this.elementAssocie.depDe(p) || this.nombreTraces.depDe(p))
}
CLieuObjetAncetre.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.elementAssocie.dependDePourBoucle(p) || this.nombreTraces.dependDePourBoucle(p))
}
CLieuObjetAncetre.prototype.cache = function () {
  CElementGraphique.prototype.cache.call(this)
  for (let i = 0; i < this.listeCopiesObjet.longueur(); i++) {
    this.listeCopiesObjet.get(i).cache()
  }
}
CLieuObjetAncetre.prototype.montre = function () {
  CElementGraphique.prototype.montre.call(this)
  for (let i = 0; i < this.listeCopiesObjet.longueur(); i++) {
    this.listeCopiesObjet.get(i).montre()
  }
}
CLieuObjetAncetre.prototype.createg = function (svg, couleurFond) {
  let gcree
  const g = cens('g', {
    // Ligne suivante modifiée version 6.5.2
    // 'pointer-events': 'none'
    'pointer-events': this.pointerevents
  })
  for (let i = 0; i < this.listeCopiesObjet.longueur(); i++) {
    const elg = this.listeCopiesObjet.get(i)
    if (elg.hasg(false)) {
      gcree = elg.createg(svg, couleurFond)
      elg.g = gcree
      g.appendChild(gcree) // A revoir
    }
    // g vide si l'objet n'existe pas
  }
  return g
}
/**
 * Spécial JvaScript : on mémorise le nombre d'objets tracés.
 * Au prochain update, si le nombre d'objets est le même on n'appelera pas createg
 * mais updateg pour chaque objet de la liste d'objest dupliqués.
 */
CLieuObjetAncetre.prototype.trace = function (svg, couleurFond) {
  const g = this.createg(svg, couleurFond)
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CLieuObjetAncetre.prototype.update = function (svg, couleurFond) {
  const oldg = this.g
  const g = this.createg(svg, couleurFond)
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  this.g = g
  if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
}
CLieuObjetAncetre.prototype.getNature = function () {
  return NatObj.NLieuObjet
}
CLieuObjetAncetre.prototype.donneCouleur = function (coul) {
  this.couleur = coul
  /*
  if (this.elementAssocie.estDeNature(NatObj.NTtObj)) {
    this.couleur.opacity = this.elementAssocie.couleur.opacity
  }
   */
  this.color = coul.rgb() //
  for (let i = 0; i < this.listeCopiesObjet.longueur(); i++) this.listeCopiesObjet.get(i).donneCouleur(coul)
}
CLieuObjetAncetre.prototype.ajusteListeCopieObjets = function () {
  const nbt = Math.round(this.nombreTraces.rendValeur())
  const ancien = this.listeCopiesObjet.longueur()
  if (nbt < ancien) { for (let i = 0; i < ancien - nbt; i++) this.listeCopiesObjet.remove(this.listeCopiesObjet.longueur() - 1) } else {
    this.listeCopiesObjet.ajouteClonesDe(this.elementAssocie, nbt - ancien)
    this.listeCopiesObjet.metAJour()
    this.donneCouleur(this.couleur)
  }
  this.listeProprietaire.recreeListesCopiesLieuxObjetsDependantDe(this)
}
CLieuObjetAncetre.prototype.recreeListeCopieObjets = function () {
  const nbt = Math.round(this.nombreTraces.rendValeur())
  this.listeCopiesObjet.retireTout()
  this.listeCopiesObjet.ajouteClonesDe(this.elementAssocie, nbt)
  this.listeCopiesObjet.metAJour()
  this.donneCouleur(this.couleur)
}
/**
 * Fonction introduite pour la version 8.0 (n° de version 20) qui renvoie l'objet graphique effectif
 * qui est à la source du lieu d'objets. En effet on peut avoir des lieux de lieux d'objets.
 * Quand on charge une figure de numéro de version < 20 et qu'elle contient un lieu d'objets généré
 * par des surfaces, this.color.opacitye est initialisé à zéro. Or il faut dans ce cas lui affecter
 * le opacity de la surface (initialisé à 0.2 par défaut). Ceci est fait dans read.
 */
CLieuObjetAncetre.prototype.getEffectiveGraphicObject = function () {
  if (this.elementAssocie.estDeNature(NatObj.NLieuObjet)) return this.elementAssocie.getEffectiveGraphicObject()
  else return this.elementAssocie
}
CLieuObjetAncetre.prototype.read = function (inps, list) {
  CElementGraphique.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.elementAssocie = list.get(ind1, 'CElementGraphique')
  // Version 8.0 (n° de version) 20 : si on charge un lieu d'objet d'objets graphiques créé avec une version antérieure
  // (on peut aussi avoir un lieu de lieu d'objets) on lui affecte une transparence
  // qui est celle de l'objet associé car lui n'en a pas de façon que l'appel de donne couleur
  // affecte la transparence de l'objet associé
  if (list.numeroVersion < 20) {
    this.couleur.opacity = this.getEffectiveGraphicObject().couleur.opacity
  }
  this.nombreTraces = new CValeur()
  this.nombreTraces.read(inps, list)
  // Il faut créer la liste des éléments dont dépend le point à tracer
  // Pour cette liste, on fait pointer la longueur unité éventuelle sur la liste mère
  // Ligne suivante revue version 3.4.2
  // listeElementsAncetres = new CListeObjets(list.uniteAngle, list.pointeurLongueurUnite);
  if (list.className !== 'CPrototype') {
    this.listeCopiesObjet = new CListeObjets(list.uniteAngle, list.pointeurLongueurUnite)
    // Comme le nombre d'objets est dynamique on ne peut pas savoir au chargement combien il y en a.
    // On laisse la liste vide et cela sera mis à jour lorsque positionne() sera appelé
    this.donneCouleur(this.couleur)
  }
}
CLieuObjetAncetre.prototype.write = function (oups, list) {
  CElementGraphique.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.elementAssocie)
  oups.writeInt(ind1)
  this.nombreTraces.write(oups, list)
}

// noinspection JSUnusedLocalSymbols
/**
 * @param {boolean} [bMemeMasque=false] passer true pour le faire même si l'affichage est caché (sert dans la boîte de dialogue de protocole)
 * @returns {void}
 */
CLieuObjetAncetre.prototype.setReady4MathJax = function setReady4MathJax (bMemeMasque) {
  /*
  for(var i = 0; i < this.listeCopiesObjet.longueur();i++){
    this.listeCopiesObjet.get(i).setReady4MathJax();
  }
  */
  this.listeCopiesObjet.setReady4MathJax()
}
/**
 * @returns {void}
 */
CLieuObjetAncetre.prototype.setReady4MathJaxUpdate = function setReady4MathJaxUpdate () {
  /*
    for(var i = 0; i < this.listeCopiesObjet.longueur();i++){
    this.listeCopiesObjet.get(i).setReady4MathJax();
  }
  */
  this.listeCopiesObjet.setReady4MathJax()
}
CLieuObjetAncetre.prototype.chaineDesignation = function () {
  return 'desLieuObjet'
}
