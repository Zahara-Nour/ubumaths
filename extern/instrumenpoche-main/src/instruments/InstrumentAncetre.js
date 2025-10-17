/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import * as kernel from '../global'
import Vect from '../types/Vect'
export default InstrumentAncetre
/**
 * Classe ancêtre de tous les instruments.
 * Contient deux membres this.x et this.y contenant les coordonnées de l'instrument
 * un membre this.angle contenant l'angle de l'instrument avec l'ohorizontale
 * et un membre this.zoomfactor contenant le facteur d'agrandissement de l'instrument.
 * @constructor
 * @param {IepDoc} doc le document contenant la figure et les instruments
 */
function InstrumentAncetre (doc) {
  this.doc = doc
  this.x = 200
  this.y = 400
  this.angle = 0 // Sera modifié au départ seulement pour le crayon
  this.zoomfactor = 1
  this.visible = false
}
/**
 * Fonction mettant l'instrument en position visible et montrant l'élement
 * graphique le représentant dans le DOM du svg de la figure
 * @param {boolean} bvisible
 */
InstrumentAncetre.prototype.montre = function (bvisible) {
  this.visible = bvisible
  this.g.setAttribute('visibility', bvisible ? 'visible' : 'hidden')
}
/**
 * Fonction retirant du DOM du svg de la figure l'élément graphique représentant
 * l'instrument, le recréant et le rajoutant ensuite de façon que l'instrument
 * soit après les éléments graphiques représentant les objets de la figure et ne
 * soit pas recouvert par eux.
 * @returns {undefined}
 */
InstrumentAncetre.prototype.updateg = function () {
  this.initialisePosition()
  this.doc.svg.removeChild(this.g)
  this.doc.svg.appendChild(this.g)
}
/**
 * Fonction amenant l'instruemnt aux coordonnées (x,y) sans changer l'angle
 * ni le rapport de zoom.
 * @param {number} x La nouvelle abscisse
 * @param {number} y La nouvelle ordonnée
 * @returns {undefined}
 */
InstrumentAncetre.prototype.translate = function (x, y) {
  this.setPosition(x, y, this.angle, this.zoomfactor)
}
/**
 * Fonction envoayan l'angle initial de l'instruement.
 * Sera redéfini pour le crayon à -40°
 * @returns {number}
 */
InstrumentAncetre.prototype.angleInit = function () {
  return 0
}
/**
 * Fonction modifiant la position relative du g element représentant l'instrument
 * dans le svg de la figure pour qu'i soit à la bonne position, bon angle et bon zoom
 * Sera redéfini pour le compas et le compas levé.
 * @param {number} x
 * @param {number} y
 * @param {number} angle
 * @param {number} zoomfactor
 */
InstrumentAncetre.prototype.setPosition = function (x, y, angle, zoomfactor) {
  let zoom
  this.x = x
  this.y = y
  this.angle = angle
  if (arguments.length >= 4) {
    zoom = zoomfactor
    this.zoomfactor = zoom
  } else zoom = this.zoomfactor
  this.g.setAttribute('transform', 'scale(' + zoom + ') translate(' +
    String(x / zoom) + ',' + String(y / zoom) + ') rotate(' + angle + ')')
}
/**
 * Fonction initialisant la position de l'instrument
 */
InstrumentAncetre.prototype.initialisePosition = function () {
  this.setPosition(200, 400, this.angleInit(), 1)
}
/**
 * Fonction lançant une animation de l'instrument par translation
 * @param {number} xfin l'abscisse de l'instrument à la fin de la translation
 * @param {number} yfin l'ordonnée de l'instrument à la fin de la translation
 * @param {number} pix Le nombre de pixels de la translation à chaque dixième de seconde
 */
InstrumentAncetre.prototype.lanceAnimationTranslation = function (xfin, yfin, pix10) {
  this.xfin = xfin
  this.yfin = yfin
  this.pix = Math.abs(pix10 / 2) // Dans la version JavaScript on quadruple la fréquence
  // en divisant le pas par 4
  // (en fait on corrige par car la rapidité semble double de celle annoncée dans le mode d'emploi)
  const v = new Vect(this.x, this.y, xfin, yfin)
  this.dist = v.norme() // La distance entre la position actuelle et la position finale
  if (this.dist === 0) {
    this.doc.actionSuivante()
    return
  }
  this.vect = v.vecteurColineaire(this.pix)
  const t = this
  this.timer = setInterval(function () { t.actionPourTranslation() }, 25)
}
// On poursuit l'animation tant que la distance entre la position actuelle et la psoition de fin
// est inférieure à la distance précédente
/**
 * Fonction appelée par un timer lors de l'animation de translation de l'instrument
 */
InstrumentAncetre.prototype.actionPourTranslation = function () {
  const x = this.x + this.vect.x
  const y = this.y + this.vect.y
  const u = new Vect(x, y, this.xfin, this.yfin)
  const d = u.norme()
  if ((d > this.dist) || !this.doc.animationEnCours) {
    this.setPosition(this.xfin, this.yfin, this.angle)
    if (this === this.doc.compas) {
      if ((this.doc.compasLeve != null) && (this.doc.compasLeve.visible)) { this.doc.compasLeve.setPosition(this.xfin, this.yfin, this.angle) }
    }
    clearInterval(this.timer)
    this.doc.actionSuivante()
  } else {
    this.dist = d
    this.setPosition(x, y, this.angle)
    if (this === this.doc.compas) {
      if ((this.doc.compasLeve != null) && (this.doc.compasLeve.visible)) { this.doc.compasLeve.setPosition(x, y, this.angle) }
    }
  }
}
/**
 * Fonction lançant une animation de l'instrument par rotation
 * @param {number} l'angle de fin de l'objet avec l'horizontale après la rotation
 * @param {number} deg10 le nombre de degrés dont on tounre à chaque
 * dixième de seconde
 */
InstrumentAncetre.prototype.lanceAnimationRotation = function (angfin, deg10) {
  // Il faut choisir le déplacement "le plus court"
  const ang1 = kernel.mesurePrincDeg(this.angle)
  let ang2 = kernel.mesurePrincDeg(angfin)
  if (Math.abs(ang2 - ang1) > 180) {
    if (ang2 > ang1) ang2 = ang2 - 360
    else ang2 = ang2 + 360
  }
  this.anglefin = ang2
  this.angle = ang1
  // Contraiement à ce qui est dit dans la doc d'instrumenpoche il semble que le pas par défaut soit de 16 °
  // et même un peu plus
  this.pasdeg = deg10 / 3 // Dans la version JavaScript on quadruple la fréquence
  // En divisant le pas par 4
  // Mais en fait par deux pour compatibilité observée
  this.pasdeg *= (ang2 >= ang1) ? 1 : -1 // 1 pour le sens direct svg;
  this.distang = Math.abs(ang2 - this.angle)
  const t = this
  this.timer = setInterval(function () { t.actionPourRotation() }, 25)
}
/**
 * Fonction appelée par un timer lors de l'animation de rotation de l'instrument
 */
InstrumentAncetre.prototype.actionPourRotation = function () {
  const ang = parseFloat(this.angle) + parseFloat(this.pasdeg)
  const dis = Math.abs(ang - this.anglefin)
  if ((dis > this.distang) || !this.doc.animationEnCours) {
    this.setPosition(this.x, this.y, this.anglefin)
    clearInterval(this.timer)
    this.doc.actionSuivante()
  } else {
    this.distang = dis
    this.setPosition(this.x, this.y, ang)
  }
}
/**
 * Fonction lançant une animation de l'instrument par zoom
 * @param {number} zoomfin le zoom final quand l'animation est finie
 * @param {number} vitesse paramètre représentant la vitesse d'animation
 */
InstrumentAncetre.prototype.lanceAnimationZoom = function (zoomfin, vitesse) {
  this.zoomfin = zoomfin
  this.vitesse = parseInt(vitesse)
  this.pas = this.vitesse * 0.05 * (this.zoomfin - this.zoomfactor) // On augmente
  // par défaut de 5% de vitesse tous les dixièmes de seconde
  this.senspos = (this.pas >= 0)
  const t = this
  this.timer = setInterval(function () { t.actionPourZoom() }, 100)
}
/**
 * Fonction appelée par un timer lors de l'animation de zoom de l'instrument
 */
InstrumentAncetre.prototype.actionPourZoom = function () {
  const z = this.zoomfactor + this.pas
  if (this.doc.animationEnCours && ((this.senspos && (z < this.zoomfin)) || (!this.senspos && (z > this.zoomfin)))) { this.setPosition(this.x, this.y, this.angle, z) } else {
    this.zoomfactor = this.zoomfin
    this.positionne()
    clearInterval(this.timer)
    this.doc.actionSuivante()
  }
}
/**
 * Fonction recalculant l'élément graphique représentant l'instrument et
 * remettant son élément grapique en accord avec cette position
 */
InstrumentAncetre.prototype.positionne = function () {
  this.setPosition(this.x, this.y, this.angle, this.zoomfactor)
}
