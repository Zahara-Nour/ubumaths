/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import ActionAncetre from '../actions/ActionAncetre'
import Texte from '../objets/Texte'
export default ActionCreation
/**
 * Action de création de l'objet objet d'id id dans le document doc
 * @extends ActionAncetre
 * @constructor
 * @param {IepDoc} doc
 * @param {string} id
 * @param {ObjetBase} objet
 */
function ActionCreation (doc, id, objet, tempo, vitesse) {
  ActionAncetre.call(this, doc, tempo)
  /** @type {string} */
  this.id = id
  const ob = this.doc.getElement(id, objet.objet)
  this.objetRemplace = (ob === null) ? null : ob
  /** @type {ObjetBase} */
  this.objet = objet
  // Ci-dessous un parseFloat car dans certains scripts j'ai vu des sens = "-0.3"
  /** @type {number} */
  this.vitesse = (arguments.length >= 5 && vitesse != null) ? Math.abs(parseFloat(vitesse)) : 8
  if (this.objetRemplace !== null) this.doc.addElement(this.objet)
  else this.doc.pushElement(this.objet)
}
ActionCreation.prototype = new ActionAncetre()
/**
 * Fonction lançant l'animation de création de l'objet objet si la création de l'objet nécessite une animation
 * et si immediat est à false et sinon affichant immédiatement l'objet
 * @param {boolean} [immediat=false]
 */
ActionCreation.prototype.execute = function (immediat) {
  // Pour un texte on a mémorisé sa position initiale car il peut avoir été translaté.
  // et quand on relance la figure il doit remprendre sa place initiale

  if (this.objet instanceof Texte) {
    this.objet.x = this.objet.xinit
    this.objet.y = this.objet.yinit
  }
  // this.doc.svg.appendChild(this.objet.g);
  if (this.objetRemplace !== null) {
    this.objetRemplace.montre(false)
    // this.doc.svg.replaceChild(this.objet.g,this.objetRemplace.g);
  }
  if (this.objet.creationAnimee() && !immediat) {
    this.objet.lanceAnimation(this.vitesse)
  } else {
    this.objet.montre(true)
    if (immediat) this.objet.finAction()
    else this.doc.actionSuivante()
  }
}
/**
 * Crée l'élément graphique du DOM associé à une action de création d'objet
 * L'objet est calculé par positionne() et caché
 */
ActionCreation.prototype.creegElement = function () {
  const doc = this.doc
  const objet = this.objet
  objet.creeg()
  objet.positionne()
  objet.g.setAttribute('visibility', 'hidden')
  doc.svg.appendChild(objet.g)
}
/** @inheritDoc */
ActionCreation.prototype.actionVisible = function () {
  return !(this.objet instanceof Texte)
}
