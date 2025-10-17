/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import ObjetBase from 'ObjetBase'
import ActionCreation from '../actions/ActionCreation'
export default Image

// @FIXME apparemment ce module ne sert plus et a été remplacé par Imag, le virer

/**
 * Classe représentant une image incluse dans la figure InstrumenPoche
 * @extends ObjetBase
 * @constructor
 * @param {IepDoc} doc le document propriétaire
 * @param {string} id id de l'objet créé dans le fichier XML de la figure
 * @param {string} url l'url de la figure
 */
function Image (doc, id, url) {
  this.doc = doc
  this.id = id
  this.url = url
  this.x = 0
  this.y = 0
  this.angle = 0
  this.objet = 'image'
  this.zoomfactor = 1
}

Image.prototype = new ObjetBase()

/** @inheritDoc */
Image.prototype.initialisePosition = function () {
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
Image.prototype.prepareAction = function () {
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
Image.prototype.creeg = function () {
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

Image.prototype.setPosition = function (x, y, angle, zoomfactor) {
  this.x = x
  this.y = y
  this.angle = angle
  this.zoomfactor = zoomfactor
  this.g.setAttribute('transform', 'scale(' + zoomfactor + ') translate(' +
    String(x / zoomfactor) + ',' + String(y / zoomfactor) + ') rotate(' + angle + ')')
}
/**
 * Fonction mettant à jour l'élément graphique image dans le DOM du svg de la figure
 */
Image.prototype.positionne = function () {
  this.setPosition(this.x, this.y, this.angle, this.zoomfactor)
}
