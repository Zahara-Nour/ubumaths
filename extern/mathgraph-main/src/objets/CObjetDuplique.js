/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import CElementGraphique from './CElementGraphique'
export default CObjetDuplique

/**
 * Classe représentant un objet dupliqué d'un autre objet.
 * Sert à redessiner l'objet une nouvelle fois quand il a été recouvert par d'autres objets.
 * @constructor
 * @extends CElementGraphique
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {boolean} masque  true si l'objt dupliqué est masqué
 * @param {CElementGraphique} elementDuplique  L'objet qui est dupliqé.
 * @returns {CObjetDuplique}
 */
function CObjetDuplique (listeProprietaire, impProto, estElementFinal, masque, elementDuplique) {
  if (arguments.length === 1) CElementGraphique.call(this, listeProprietaire)
  else {
    CElementGraphique.call(this, listeProprietaire, impProto, estElementFinal, elementDuplique.couleur,
      elementDuplique.nomMasque, elementDuplique.decX, elementDuplique.decY,
      masque, elementDuplique.nom, elementDuplique.tailleNom)
    this.elementDuplique = elementDuplique
    // Ajout version 5.0.4. Sert pour les objets dupliqués de CLaTeX
    this.elementDuplique.hasDuplicate = true
  }
}
CObjetDuplique.prototype = new CElementGraphique()
CObjetDuplique.prototype.constructor = CObjetDuplique
CObjetDuplique.prototype.superClass = 'CElementGraphique'
CObjetDuplique.prototype.className = 'CObjetDuplique'

CObjetDuplique.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.elementDuplique)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CObjetDuplique(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.masque, listeCible.get(ind1, 'CElementGraphique'))
}

CObjetDuplique.prototype.getNature = function () {
  return NatObj.NObjetDuplique
}

CObjetDuplique.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.elementDuplique === p.elementDuplique)
  } else return false
}

CObjetDuplique.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.elementDuplique)
}

CObjetDuplique.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CElementGraphique.prototype.depDe.call(this, p) || this.elementDuplique.depDe(p))
}

CObjetDuplique.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.elementDuplique.dependDePourBoucle(p)
}

CObjetDuplique.prototype.positionne = function () {
  this.existe = this.elementDuplique.existe
  // this.hasgElement = this.elementDuplique.hasgElement;
}

CObjetDuplique.prototype.afficheNom = function (svg) {
  // if (!this.masque) this.elementDuplique.afficheNom(svg); {
  if (!this.elementDuplique.masque && !this.elementDuplique.nomMasque) {
    this.gname = this.elementDuplique.createName()
    svg.appendChild(this.gname)
  }
}

CObjetDuplique.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.elementDuplique === ancienPoint) this.elementDuplique = nouveauPoint
}

/*
Pour les objets dupliqués, leur implémentation graphique est formé d'un g element contenant une copie du
g element de l'objet dupliqué et éventuellement du gname de l'élément dupliqué si celui-ci est un point ou une droite
 */
CObjetDuplique.prototype.createg = function (svg, couleurFond) {
  const g = cens('g')
  // Il est inutile de mettre un traitement différent pour les affichages LaTeX car si on crée
  // le dupliqué d'un affichage Latex lat, lat.hasDuplicate est mis à true et donc, dans CLatex.setReady4MathJax
  // lat.typeSet est appelé ce qui fait qu'on a quand même accès à sa représentation en svg (via lat.html)
  // Ainis, même si un affichage LaTeX est masqué, son dupliqué pourra quand même être visible.
  g.appendChild(this.elementDuplique.createg(svg, couleurFond))
  if (this.elementDuplique.gname) g.appendChild(this.elementDuplique.gname.cloneNode(true))
  return g
}

CObjetDuplique.prototype.trace = function (svg, couleurFond) {
  // var m = this.elementDuplique.masque;
  // this.elementDuplique.masque = false;
  const g = this.createg(svg, couleurFond)
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
  // this.update();  // this.elementDuplique.masque = m;
}

CObjetDuplique.prototype.hasg = function (masquage, memeMasque) {
  // Modifié version 6.7.2
  // return this.elementDuplique.hasg(masquage, true)
  return this.elementDuplique.hasg(masquage, true) && (memeMasque || !(this.masque && masquage))
}

CObjetDuplique.prototype.update = function (svg, couleurFond) {
  const oldg = this.g
  const g = this.createg(svg, couleurFond)
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  if (this.masque) g.setAttribute('visibility', 'hidden')
  this.g = g
  if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
}

CObjetDuplique.prototype.chaineDesignation = function () {
  return 'desObjetDuplique'
}

CObjetDuplique.prototype.read = function (inps, list) {
  CElementGraphique.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.elementDuplique = list.get(ind1, 'CElementGraphique')
  // Ajout version 5.0.4. Sert pour les objets dupliqués de CLaTeX
  this.elementDuplique.hasDuplicate = true
}

CObjetDuplique.prototype.write = function (oups, list) {
  CElementGraphique.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.elementDuplique)
  oups.writeInt(ind1)
}
