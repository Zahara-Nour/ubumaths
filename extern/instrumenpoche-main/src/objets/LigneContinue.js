/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import Ligne from '../objets/Ligne'
export default LigneContinue
/**
 * Classe représentant une ligne continue de la figure
 * @extends ObjetBase
 * @constructor
 * @param {iepDoc} doc Le document propriétaire
 * @param {number} id L'id de l'objet dans le fichier XML de la figure
 * @param {string} abs Une chaîne contenant les abscisses séparées par des virgules
 * @param {string} ord Une chaîne contenant les ordonnées séparées par des virgules
 * @param{number} xdeb : abscisse de début (en fait l'abscisse actuelle du crayon)
 * @param{number} ydeb : ordonée de début (en fait l'ordonnée actuelle du crayon)
 * @param {string} couleur La couleur
 * @param {string} epaisseur L'épaisseur de trait
 * @param {string} opacite L'opacité du trait
 * @param {string} styleTrait tiret pour avoir des pointillés
 */
function LigneContinue (doc, id, xdeb, ydeb, abs, ord, couleur, epaisseur, opacite, styleTrait) {
  Ligne.call(this, doc, id, couleur, epaisseur, opacite, styleTrait)
  this.xdeb = xdeb
  this.ydeb = ydeb
  this.abs = abs.split(',')
  this.ord = ord.split(',')
  this.objet = 'trait'
}
LigneContinue.prototype = new Ligne()

/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
LigneContinue.prototype.creeg = function () {
  let points, i
  const p = document.createElementNS(svgns, 'polyline')
  points = this.xdeb + ' ' + this.ydeb
  for (i = 0; i < this.abs.length; i++) {
    points += ' ' + this.abs[i] + ' ' + this.ord[i]
  }
  p.setAttribute('points', points)
  p.setAttribute('style', this.style + 'fill:none;')
  p.setAttribute('visibility', 'hidden')
  // p.setAttribute("id",this.id);
  this.g = p
}
/** @inheritDoc */
LigneContinue.prototype.creationAnimee = function () {
  return true
}
/**
 * Fonction lançant l'animation de visualisation de la ligne continue
 * Utilise un timer et une fonction de callBack
 */
LigneContinue.prototype.lanceAnimation = function () {
  this.sauveabs = this.abs
  this.sauveord = this.ord
  this.abs = []
  this.ord = []
  this.ind = -1 // L'indice dans le tableau des coordonnées
  const t = this
  this.timer = setInterval(function () { t.actionPourAnimation() }, 25)
}
/**
 * Fonction de callBack appelée par un timer pour l'animation du tracé
 */
LigneContinue.prototype.actionPourAnimation = function () {
  this.ind++
  const cray = this.doc.crayon
  if (this.ind >= this.sauveabs.length) {
    this.abs = this.sauveabs
    this.ord = this.sauveord
    this.updateg()
    clearInterval(this.timer)
    this.finAction()
    this.doc.actionSuivante()
  } else {
    const x = this.sauveabs[this.ind]
    const y = this.sauveord[this.ind]
    this.abs.push(x)
    this.ord.push(y)
    this.updateg()
    cray.setPosition(parseFloat(x), parseFloat(y), cray.angle)
    this.updateg()
  }
}
/**
 * extends iep.objetBase.prototype.finAction
 */
LigneContinue.prototype.finAction = function () {
  const len = this.abs.length
  this.doc.crayon.translate(parseFloat(this.abs[len - 1]), parseFloat(this.ord[len - 1]))
}
