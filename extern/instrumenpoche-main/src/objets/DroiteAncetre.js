/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { zero } from '../global'
import { svgns } from '../global/constantes'
import Ligne from '../objets/Ligne'
import Vect from '../types/Vect'
export default DroiteAncetre
/**
 * La classe représentant l'ancêtre des droites, segments, demi-droites
 * @extends ObjetBase
 * @constructor
 * @param {number} x1 Abscisse du premier point
 * @param {number} y1 Ordonnée du deuième point
 * @param {number} x2 Abscisse du deuxième point
 * @param {number} y2 Ordonnée du deuxième point
 * @param {SvgColor} couleur La couleur
 * @param {number} epaisseur L'épaisseur de trait
 * @param {number} opacite L'opacité du tracé
 * @param {string} styleTrait "tiret" pour un trait pointillé
 * @param {boolean} vecteur Si true une flèche est tracée
 */
function DroiteAncetre (doc, id, x1, y1, x2, y2, couleur, epaisseur, opacite, styleTrait) {
  this.x1 = parseFloat(x1)
  this.y1 = parseFloat(y1)
  this.x2 = parseFloat(x2)
  this.y2 = parseFloat(y2)
  Ligne.call(this, doc, id, couleur, epaisseur, opacite, styleTrait)
}
DroiteAncetre.prototype = new Ligne()
/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
DroiteAncetre.prototype.creeg = function () {
  const g = document.createElementNS(svgns, 'g')
  const li = document.createElementNS(svgns, 'line')
  li.setAttribute('x1', this.x1)
  li.setAttribute('y1', this.y1)
  li.setAttribute('x2', this.x2)
  li.setAttribute('y2', this.y2)
  li.setAttribute('style', this.style)
  g.appendChild(li)
  g.setAttribute('visibility', 'hidden')
  // g.setAttribute("id",this.id);
  this.g = g
}

DroiteAncetre.prototype.creationAnimee = function () {
  return true
}
DroiteAncetre.prototype.lanceAnimation = function (vitesse) {
  this.vitesse = vitesse / 4
  const v = new Vect(this.x1, this.y1, this.x2, this.y2)
  this.dist = v.norme() // La distance entre la position actuelle et la position finale
  if (zero(this.dist)) {
    this.doc.actionSuivante()
    return
  }
  this.vect = v.vecteurColineaire(this.vitesse * 1.8) //* 1.8 car dans la réalité c'est plus rapide
  this.xfin = this.x2
  this.yfin = this.y2
  this.x2 = this.x1
  this.y2 = this.y1
  const cray = this.doc.crayon
  cray.setPosition(this.x1, this.y1, cray.angle)
  const t = this
  this.timer = setInterval(function () { t.actionPourAnimation(t) }, 25)
}
DroiteAncetre.prototype.actionPourAnimation = function () {
  this.x2 += this.vect.x
  this.y2 += this.vect.y
  const u = new Vect(this.x1, this.y1, this.x2, this.y2)
  const d = u.norme()
  const cray = this.doc.crayon
  if ((d > this.dist) || !this.doc.animationEnCours) {
    this.x2 = this.xfin
    this.y2 = this.yfin
    this.finAction()
    this.updateg()
    clearInterval(this.timer)
    this.doc.actionSuivante()
  } else {
    cray.translate(this.x2, this.y2)
    this.updateg()
  }
}
/**
 * extends iep.objetBase.prototype.finAction
 */
DroiteAncetre.prototype.finAction = function () {
  this.doc.crayon.translate(this.x2, this.y2)
}
