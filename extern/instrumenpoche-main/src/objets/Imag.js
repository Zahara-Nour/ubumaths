/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 * Attention : Ne pas appeler cet objet Imag car entre en conflit avec l'objet Imag du JS
 */
import { svgns } from '../global/constantes'
import ObjetBase from '../objets/ObjetBase'
import ActionCreation from '../actions/ActionCreation'
export default Imag
/**
 * Classe représentant une image incluse dans la figure InstrumenPoche
 * @extends ObjetBase
 * @constructor
 * @param {IepDoc} doc le document propriétaire
 * @param {string} id id de l'objet créé dans le fichier XML de la figure
 * @param {string} url l'url de la figure
 */
function Imag (doc, id, url) {
  this.doc = doc
  this.id = id
  this.url = url
  this.x = 0
  this.y = 0
  this.angle = 0
  this.objet = 'image'
  this.zoomfactor = 1
}
Imag.prototype = new ObjetBase()
/** @inheritDoc */
Imag.prototype.initialisePosition = function () {
  this.x = 0
  this.y = 0
  this.angle = 0
  this.zoomfactor = 1
  this.positionne()
}
/**
 * Fonction appelée dans iepDoc.creeActions
 * crée une image avec l'url url de façon à récupérer ses dimensions
 * Lorsque l'image est chargée, une fonction de callBack crée l'élément graphique
 * image dans le DOM du svg contenant la igure
 */
Imag.prototype.prepareAction = function () {
  const img = new Image()
  img.owner = this
  this.action = new ActionCreation(this.doc, this.id, this)
  this.action.isReady = false
  this.doc.ajouteAction(this.action)
  img.onload = function () {
    const own = this.owner
    own.width = this.width
    own.height = this.height
    own.action.isReady = true
  }
  img.src = this.url // Provoque le chargement de l'image
}
/**
 * Fonction mettant dans this.g l'élément graphique svg représentant l'objet dans
 * le DOM du svg de la figure
 */
Imag.prototype.creeg = function () {
  const image = document.createElementNS(svgns, 'image')
  image.setAttribute('width', this.width)
  image.setAttribute('height', this.height)
  image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', this.url)
  image.setAttribute('x', this.x)
  image.setAttribute('y', this.y)
  image.setAttribute('visibility', 'hidden')
  this.g = image
  // image.setAttribute("id",this.id);
  this.setPosition(this.x, this.y, this.angle, this.zoomfactor)
  this.doc.svg.appendChild(image)
}
/**
 * Fonction mettant l'image aux coordonnées (x,y) avec un angle angle et
 * un coefficient de zoom zoomfactor et modifiant la position du svg element qui
 * le représente dans le DOM du svg.
 * @param {number} x
 * @param {number} y
 * @param {number} angle
 * @param {integer} zoomfactor
 * @returns {undefined}
 */

Imag.prototype.setPosition = function (x, y, angle, zoomfactor) {
  this.x = x
  this.y = y
  this.angle = angle
  this.zoomfactor = zoomfactor
  if (this.g) {
    this.g.setAttribute('transform', 'scale(' + zoomfactor + ') translate(' +
      String(x / zoomfactor) + ',' + String(y / zoomfactor) + ') rotate(' + angle + ')')
  } else {
    console.error('Il faut appeler imag.creeg avant imag.setPosition')
  }
}
/**
 * Fonction mettant à jour l'élément graphique image dans le DOM du svg de la figure
 */
Imag.prototype.positionne = function () {
  this.setPosition(this.x, this.y, this.angle, this.zoomfactor)
}
