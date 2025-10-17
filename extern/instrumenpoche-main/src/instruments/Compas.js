/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import InstrumentAncetre from './InstrumentAncetre'
export default Compas
/**
 * @constructor
 * @extends InstrumentAncetre
 * Objet Compas contenu dans une animation InstrumenPche
 * @param {IepDoc} doc le document propriétaire
 * la variable this.leve contient true si une action ActionLeverCompas a été
 * précédemment exécutée. Dans ce as c'est un autre objet iep.compasLeve qui sera créé
 * La variable this.bretourne contient true si une action ActionRetourner a été
 * exécutée précdemment.
 * et utilisé dans la figure.
 */
function Compas (doc) {
  InstrumentAncetre.call(this, doc)
  this.ecart = 0
  this.bretourne = false
  this.leve = false
  this.lon = 185 // Longueur intérieure des deux branches des compas
  this.longpointe = 18
  const d = this.lon + this.longpointe
  this.alp = Math.asin(this.ecart / (2 * d)) / Math.PI * 180 // Le demi-angle que font les deux branches du compas
  this.decbh = 30 // Décalage vers le bas de la partie haute
  this.creeg()
  this.g.setAttribute('visibility', 'hidden')
  this.setPosition(this.x, this.y, this.angle, 1)
  // Ajout de d'élément graphique représentnant le compas dans le SVG contenant la figure
  doc.svg.appendChild(this.g)
}
Compas.prototype = new InstrumentAncetre()
/**
 * Fonction initialisant la position du compas
 */
Compas.prototype.initialisePosition = function () {
  InstrumentAncetre.prototype.initialisePosition.call(this)
  this.ecart = 0
  this.positionne()
}
/**
 * Crée l'élément graphique représentant le compas
 * @returns {SVGElement}
 */
Compas.prototype.creeg = function () {
  let li, p, path, circ
  const lon = this.lon // Longueur intérieure des deux branches des compas
  const longpointe = this.longpointe // Longueur de la pointe et de la mine
  const ep = 7 // Epaisseur des branches
  const retb = 20 // Retrait du bouton de gauche sur la branche;
  const rayb = 6 // Le rayon des boutons
  const epm = 3.5 // Epaisseur de la mine
  const dlb = 3 // la demi-largeur basse de la partie fixe
  const dlm = 12 // La demi-largeur moyenne de la partie fixe
  const ylm = 24 // L'ordonnée correspondante
  const ylm2 = 35 // Ordonnée de la partie moyenne haute
  const dlh = 6 // La demi-largeur haute de la partie fixe
  const ylh = 50 // L'ordonnée correspondante
  const dltop = 3 // La demi-largeur de la partie supérieure du châpeau
  const ytop = 70 // L'ordonnée correspondante
  const g = document.createElementNS(svgns, 'g')
  this.bg = document.createElementNS(svgns, 'g') // La branche de gauche
  li = document.createElementNS(svgns, 'line')
  li.setAttribute('x1', 0)
  li.setAttribute('y1', 0)
  li.setAttribute('x2', 0)
  li.setAttribute('y2', -longpointe)
  li.setAttribute('style', 'stroke: black; stroke-width:1.5;')
  this.bg.appendChild(li)
  p = document.createElementNS(svgns, 'path')
  path = 'M0 ' + String(-longpointe) + 'L 0 ' + String(-longpointe - lon) + ' ' +
          String(-ep) + ' ' + String(-longpointe - lon) + ' ' + String(-ep) + ' ' +
          String(-longpointe) + 'Z'
  p.setAttribute('d', path)
  p.setAttribute('style', 'stroke:black;stroke-width:0.75; fill: silver; fill-opacity: 1')
  this.bg.appendChild(p)
  // On rajoute le bouton de gauche
  circ = document.createElementNS(svgns, 'circle')
  circ.setAttribute('cx', -ep / 2)
  circ.setAttribute('cy', -longpointe - retb)
  circ.setAttribute('r', rayb)
  circ.setAttribute('style', 'stroke:black;stroke-width:0.75; fill: silver; fill-opacity: 1')
  this.bg.appendChild(circ)
  circ = document.createElementNS(svgns, 'circle')
  circ.setAttribute('cx', -ep / 2)
  circ.setAttribute('cy', -longpointe - retb)
  circ.setAttribute('r', 2)
  circ.setAttribute('style', 'stroke:black;stroke-width:1; fill: silver; fill-opacity: 1')
  this.bg.appendChild(circ)
  g.appendChild(this.bg)
  // La branche de droite
  this.bd = document.createElementNS(svgns, 'g') // La branche de gauche
  // La mine
  p = document.createElementNS(svgns, 'path')
  path = 'M 0 0 L0' + ' ' + String(-longpointe) + ' ' + epm + ' ' + String(-longpointe - epm) + ' ' +
          epm + ' ' + String(-epm - 3) + 'Z'
  p.setAttribute('style', 'stroke:black;stroke-width:0.75; fill: blck; fill-opacity: 1')
  p.setAttribute('d', path)
  this.bd.appendChild(p)
  p = document.createElementNS(svgns, 'path')
  path = 'M0 ' + String(-longpointe) + 'L 0 ' + String(-longpointe - lon) + ' ' +
          ep + ' ' + String(-longpointe - lon) + ' ' + ep + ' ' +
          String(-longpointe) + 'Z'
  p.setAttribute('d', path)
  p.setAttribute('style', 'stroke:black;stroke-width:0.75; fill: silver; fill-opacity: 1')
  this.bd.appendChild(p)
  // Le petit bout de bouton à droite
  p = document.createElementNS(svgns, 'path')
  const rayx = rayb / 4 * 3
  const rayy = rayb / 2
  path = 'M' + ep + ' ' + String(-longpointe - retb + rayx) + 'A ' + rayx + ' ' + rayy + ' -90 0 0 ' +
       ep + ' ' + String(-longpointe - retb - rayx) + 'Z'
  p.setAttribute('style', 'stroke:black;stroke-width:1; fill: silver; fill-opacity: 1')
  p.setAttribute('d', path)
  this.bd.appendChild(p)
  // Ligne en biais sur la branche droite
  const styleli = 'stroke: black; stroke-width:1;'
  li = document.createElementNS(svgns, 'line')
  li.setAttribute('x1', 0)
  li.setAttribute('y1', -100)
  li.setAttribute('x2', ep)
  li.setAttribute('y2', -100 + ep)
  li.setAttribute('style', styleli)
  this.bd.appendChild(li)
  // Autres lignes branche de droite
  li = document.createElementNS(svgns, 'line')
  li.setAttribute('x1', 0)
  li.setAttribute('y1', -50)
  li.setAttribute('x2', ep)
  li.setAttribute('y2', -50)
  li.setAttribute('style', styleli)
  this.bd.appendChild(li)
  li = document.createElementNS(svgns, 'line')
  li.setAttribute('x1', ep / 2)
  li.setAttribute('y1', -50)
  li.setAttribute('x2', ep / 2)
  li.setAttribute('y2', -73)
  li.setAttribute('style', styleli)
  this.bd.appendChild(li)
  // Le bouton vu de côté
  const rect = document.createElementNS(svgns, 'rect')
  rect.setAttribute('x', ep)
  rect.setAttribute('y', -68)
  rect.setAttribute('width', 4)
  rect.setAttribute('height', 12)
  rect.setAttribute('style', 'stroke:black;stroke-width:0.75; fill: silver; fill-opacity: 1')
  this.bd.appendChild(rect)
  g.appendChild(this.bd)
  // La partie fixe du haut
  this.haut = document.createElementNS(svgns, 'g')
  p = document.createElementNS(svgns, 'path')
  path = 'M 0 0 L' + dlb + ' 0 ' + dlm + ' ' + String(-ylm) + ' ' + dlm + ' ' + String(-ylm2) +
          'A' + String(ylh - ylm2) + ' ' + String(dlm - dlh) + ' -90 0 1 ' + dlh + ' ' + String(-ylh) +
          'L' + dltop + ' ' + String(-ytop) + ' ' + String(-dltop) + ' ' + String(-ytop) +
          'L' + String(-dlh) + ' ' + String(-ylh) + 'A' + String(ylh - ylm2) + ' ' + String(dlm - dlh) +
          ' 90 0 1 ' + String(-dlm) + ' ' + String(-ylm2) + ' L ' +
          String(-dlm) + ' ' + String(-ylm) + ' ' + String(-dlb) + ' 0Z'

  p.setAttribute('d', path)
  p.setAttribute('style', 'stroke:black;stroke-width:0.75; fill: #666666; fill-opacity: 1')
  // this.haut.setAttribute("transform","translate(0,30)");
  this.haut.appendChild(p)
  li = document.createElementNS(svgns, 'line')
  li.setAttribute('x1', dlh)
  li.setAttribute('y1', -ylh)
  li.setAttribute('x2', -dlh)
  li.setAttribute('y2', -ylh)
  li.setAttribute('style', 'stroke: black; stroke-width:1;')
  this.haut.appendChild(li)
  // On ajoute le logo Sesamath
  const text = document.createElementNS(svgns, 'text')
  text.setAttribute('pointer-events', 'none')
  text.appendChild(document.createTextNode('Sésamath'))
  text.setAttribute('x', 0)
  text.setAttribute('y', 0)
  text.setAttribute('style', 'font-family: Arial;font-size: 5pt;fill: white')
  text.setAttribute('transform', 'rotate(-90) translate(4,2.5)')
  this.haut.appendChild(text)

  // On rajoute les deux petits ronds blancs (rivets) à chaque branche
  circ = document.createElementNS(svgns, 'circle')
  circ.setAttribute('cx', -ep + 1)
  circ.setAttribute('cy', -this.decbh)
  circ.setAttribute('r', 3)
  circ.setAttribute('style', 'stroke:black;stroke-width:1; fill: white; fill-opacity: 1')
  this.haut.appendChild(circ)
  circ = document.createElementNS(svgns, 'circle')
  circ.setAttribute('cx', ep - 1)
  circ.setAttribute('cy', -this.decbh)
  circ.setAttribute('r', 3)
  circ.setAttribute('style', 'stroke:black;stroke-width:1; fill: white; fill-opacity: 1')
  this.haut.appendChild(circ)

  g.appendChild(this.haut)
  this.g = g
}
/**
 * Fonction calculant les éléments graphiques du compas et modifiant le svg element
 * en conséquence.
 * @param {number} x l'abscisse de la point du compas
 * @param {number} y l'ordonnée de la pointe du compas
 * @param {number} angle l'angle en degrés que fait le compas avec l'horizontale
 * @param {number} zoomfactor le zoom initialisé au départ à 1 et qui peut être
 * modifié par une action ActionZoomInstrument
 */
Compas.prototype.setPosition = function (x, y, angle, zoomfactor) {
  let zoom
  if (arguments.length >= 4) {
    zoom = zoomfactor
    this.zoomfactor = zoom
  } else {
    zoom = this.zoomfactor
  }
  this.x = x
  this.y = y
  this.angle = angle
  const d = this.lon + this.longpointe
  // Le demi-angle que font les deux branches du compas
  let nb = this.ecart / (2 * d * zoom)
  if (nb > 1) nb = 1 // Si on demande un écartement de compas irréaliste ...
  this.alp = Math.asin(nb) / Math.PI * 180
  if (isNaN(this.alp)) {
    console.error(Error('dans compas.setPosition on a alp qui est NaN'))
    if (this.doc.debug) console.log(`avec x=${x}, y=${y}, angle=${angle} et zoom=${zoom} on a d=${d} et ecart=${this.ecart} asin(${this.ecart}/${2 * d * zoom}/π*180) donne NaN`)
  } else {
    this.bg.setAttribute('transform', `rotate(${this.alp})`)
    this.bd.setAttribute('transform', `translate(${this.ecart / zoom}, 0) rotate(${-this.alp})`)
    const ang = this.alp / 180 * Math.PI
    const transX = this.ecart / 2 / zoom
    const transY = (-d) * Math.cos(ang) + this.decbh
    this.haut.setAttribute('transform', `translate(${transX},${transY})`)
    const scale = this.bretourne ? `scale(${zoom},${-zoom})` : `scale(${zoom})`
    this.g.setAttribute('transform', `${scale} translate(${x / zoom},${y / zoom}) rotate(${angle})`)
  }
}
/**
 * Fonction utilisée pour mettre le compas en position retournée par rapport
 * à la position précédente.
 */
Compas.prototype.retourne = function () {
  this.bretourne = !this.bretourne
  this.setPosition(this.x, this.y, this.angle)
}
/**
 * Fonction recalculant les éléments du Compas et mettant en conséquence à jour
 * l'élément graphique qui le représente.
 */
Compas.prototype.positionne = function () {
  InstrumentAncetre.prototype.positionne.call(this)
  if (this.leve && (this.doc.compasLeve != null)) InstrumentAncetre.prototype.positionne.call(this.doc.compasLeve)
}
/**
 * Fonction translatant le compas au point de coordonnées (x;y)
 * @param {number} x l'abscisse du point de destination
 * @param {number} y l'ordonnée du point de destination
 */
Compas.prototype.translate = function (x, y) {
  InstrumentAncetre.prototype.translate.call(this, x, y)
  if (this.leve && (this.doc.compasLeve != null)) InstrumentAncetre.prototype.translate.call(this.doc.compasLeve, x, y)
}
/**
 * Fonction lançant une animation d'écartement de compas pour une action ActionEcaterCompas
 * @param {number} ecart l la valeur de l'écartement final (en unités de longueur)
 * @param {number} ec10 le pas d'incrémentation pour l'écart à chaque dixième de seconde
 */
Compas.prototype.lanceAnimationEcartement = function (ecart, ec10) {
  this.ecartfin = parseFloat(ecart)
  // Dans la version JavaScript on pourra rajouter un paramètre donnant le pas
  // d'écartement par dixième de seconde
  this.pasecart = ec10 / 4
  this.pasecart *= (ecart >= this.ecart) ? 1 : -1 // 1 pour le sens direct svg
  this.distecart = Math.abs(ecart - this.ecart)
  const t = this
  this.timer = setInterval(function () { t.actionPourEcartement() }, 25)
}
// On poursuit l'animation tant que la distance entre la position actuelle et la psoition de fin
// est inférieure à la distance précédente
/**
 * Fonction appelée par un timer lors d'une aniamtion d'écartement de compas
 * On poursuit l'animation tant que la distance entre la position actuelle et
 * la position de fin de n réaugmente pas
 */
Compas.prototype.actionPourEcartement = function () {
  const ec = this.ecart + this.pasecart
  const dis = Math.abs(ec - this.ecartfin)
  if ((dis > this.distecart) || !this.doc.animationEnCours) {
    this.ecart = this.ecartfin
    this.setPosition(this.x, this.y, this.angle)
    clearInterval(this.timer)
    this.doc.actionSuivante()
  } else {
    this.distecart = dis
    this.ecart = ec
    this.setPosition(this.x, this.y, this.angle)
  }
}
