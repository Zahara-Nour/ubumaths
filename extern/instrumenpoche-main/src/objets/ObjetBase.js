/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import Vect from '../types/Vect'
import * as kernel from '../global'
export default ObjetBase
/**
 * Objet ancêtre de tous les objets graphiques
 * Le prototype de chaque descendant de cet objet devra comprendre une fonction creeg qui créera
 * le svg élément associé et l'affectera à this.g
 * @constructor
 * @param {IepDoc} doc Le document propriétaire de l'objet
 * @param {string} id Le numéro de l'objet dans le document
 */
function ObjetBase (doc, id, couleur) {
  this.doc = doc
  this.id = id
  this.couleur = couleur
  this.zoomfactor = 1 // Pour les images
  this.visible = false
  this.objet = 'trait' // Ne sera redéfini que pour les points, textes, les angles et le gabarits
}
/**
 * Cette fonction est appelée lors de la création d'objets.
 * par défaut elle ne fait rien;
 * Elle sera redéfinie pour les objets qui peuvent être translatés : points, marques de segments, textes, images
 */
ObjetBase.prototype.positionne = function () {
}
/**
 * Fonction qui réinitialisera la psoition des objets lorsqu'on retrace la figure
 * Ne sera redéfinie que pour les objets dont la position peut être modifiee par translation, rotation ou zoom
 */
ObjetBase.prototype.initialisePosition = function () {
}
/**
 * Fonction translatant l'objet aux coordonnées (ab)
 * @param {number} a
 * @param {number} b
 */
ObjetBase.prototype.translate = function (a, b) {
  this.setPosition(a, b, this.angle, this.zoomfactor)
}
/**
 * Fonction donnant au membre angle de l'objet la valeur ang
 * @param {number} ang
 */
ObjetBase.prototype.tourne = function (ang) {
  this.setPosition(this.x, this.y, ang, this.zoomfactor)
}
/**
 * Fonction donnant au membre zoom de l'objet la valeur rap
 * @param {number} zoomfactor
 */
ObjetBase.prototype.zoom = function (zoomfactor) {
  this.zoomfactor = zoomfactor
  this.setPosition(this.x, this.y, this.angle, zoomfactor)
}
/**
 * Fonction rendant l'objet visible ou invisible suivant la valeur de bvisible
 * Modifie en consequence la valeur de bvisible
 * @param {boolean} bvisible
 */
ObjetBase.prototype.montre = function (bvisible) {
  this.visible = bvisible
  if (this.g) this.g.setAttribute('visibility', bvisible ? 'visible' : 'hidden')
}

// Les fonctions suivantes ne serviront que pour les points, marques de segment et affichages de texte
// et d'images
// Ces objets doivent posséder une fonction setPosition(x,y)
/**
 * Fonction ne servant que pour les points, marques de segment, affichages de texte et images
 * Lance une aniamtion de translation de l'objet via un timer et une fonction de callBack
 * Ces objets doivent posséder une fonction setPosition(x,y)
 * @param {number} xfin abscisse de la position finale de l'objet
 * @param {number} yfin ordonnée de la position finale de l'objet
 * @param {number} pix10 Nombre de pixels pour le déplacement par dixième de seconde
 */
ObjetBase.prototype.lanceAnimationTranslation = function (xfin, yfin, pix10) {
  // this.g.setAttribute("visibility","visible");
  this.xfin = xfin
  this.yfin = yfin
  this.pix = Math.abs(pix10 / 4) // Dans la version JavaScript on quadruple la fréquence
  // en divisant le pas par 4
  // (en fait par deux car la rapidité semble double de celle annoncée dans le mode d'emploi)
  const v = new Vect(this.x, this.y, xfin, yfin)
  this.dist = v.norme() // La distance entre la position actuelle et la position finale
  // Cas où l'objet est déjà à la bonne position
  if (this.dist === 0) {
    this.translate(this.xfin, this.yfin)
    this.doc.actionSuivante()
    return
  }
  this.vect = v.vecteurColineaire(this.pix)
  const t = this
  this.timer = setInterval(function () { t.actionPourTranslation() }, 25)
}
/**
 * Fonction de callBack appelée par un timer lors de l'animation de translation
 * On poursuit l'animation tant que la distance entre la position actuelle et la psoition de fin
 * est inférieure à la distance précédente
 */
ObjetBase.prototype.actionPourTranslation = function () {
  const x = this.x + this.vect.x
  const y = this.y + this.vect.y
  const u = new Vect(x, y, this.xfin, this.yfin)
  const d = u.norme()
  if ((d > this.dist) || !this.doc.animationEnCours) {
    this.translate(this.xfin, this.yfin)
    clearInterval(this.timer)
    this.doc.actionSuivante()
  } else {
    this.dist = d
    this.translate(x, y)
  }
}
/**
 * Fonction ne servant que pour les points, marques de segment, affichages de texte et images
 * Lance une animation de rotation de l'objet via un timer et une fonction de callBack
 * Ces objets doivent posséder une fonction setPosition(x,y)
 * @param {number} angfin l'angle de fin de l'objet
 * @param {number} deg10 le nombre de degrés dont on tourne par dixième de seconde
 */
ObjetBase.prototype.lanceAnimationRotation = function (angfin, deg10) {
  // Il faut choisir le déplacement "le plus court"
  const ang1 = kernel.mesurePrincDeg(this.angle)
  let ang2 = kernel.mesurePrincDeg(angfin)
  if (Math.abs(ang2 - ang1) > 180) {
    if (ang2 > ang1) ang2 = ang2 - 360
    else ang2 = ang2 + 360
  }
  this.anglefin = ang2
  this.angle = ang1

  this.pasdeg = deg10 * 2 / 3 // Dans la version JavaScript on quadruple la fréquence
  // en divisant le pas par 4
  // (en fait on corrige par *2/3 car la rapidité semble double de celle annoncée dans le mode d'emploi)
  this.pasdeg *= (angfin >= this.angle) ? 1 : -1 // 1 pour le sens direct svg;
  this.distang = Math.abs(angfin - this.angle)
  const t = this
  this.timer = setInterval(function () { t.actionPourRotation() }, 25)
}
/**
 * Fonction de callBack appelée par un timer lors de l'animation de rotation
 */
ObjetBase.prototype.actionPourRotation = function () {
  const ang = parseFloat(this.angle) + parseFloat(this.pasdeg)
  const dis = Math.abs(ang - this.anglefin)
  if ((dis > this.distang) || !this.doc.animationEnCours) {
    this.tourne(this.anglefin)
    clearInterval(this.timer)
    this.doc.actionSuivante()
  } else {
    this.distang = dis
    this.tourne(ang)
  }
}
/**
 * Fonction ne servant que pour les affichages de texte et images
 * Lance une aniamtion de zoom de l'objet via un timer et une fonction de callBack
 * @param {number} zoomfin la valeur de fin du zoomfactor de l'objet
 * @param {number} vitesse pour la vitesse d'animation
 */
ObjetBase.prototype.lanceAnimationZoom = function (zoomfin, vitesse) {
  this.zoomfin = zoomfin
  this.vitesse = parseInt(vitesse)
  this.pas = this.vitesse * 0.05 * (this.zoomfin - this.zoomfactor) // On augmente
  // par défaut de 5% de vitesse tous les dixièmes de seconde
  this.senspos = (this.pas >= 0)
  const t = this
  this.timer = setInterval(function () { t.actionPourZoom() }, 100)
}
/**
 * Fonction de callBack appelée par un timer lors de l'animation de zoom
 */
ObjetBase.prototype.actionPourZoom = function () {
  const z = this.zoomfactor + this.pas
  if (this.doc.animationEnCours && ((this.senspos && (z < this.zoomfin)) || (!this.senspos && (z > this.zoomfin)))) { this.zoom(z) } else {
    this.zoom(this.zoomfin)
    clearInterval(this.timer)
    this.doc.actionSuivante()
  }
}
/**
 * Fonction qui devra être appelée pour remettre à jour le g élément représentant
 * l'objet dans le DOM du svg de la figure
 * Appelé quand on recalcule la figure ou lors des animations
 * Par défaut on reconstruit le svg élément pour mettre à jour l'objet
 * Pour certains objets (point par exemple) ce sera inutile
 * @retursn {undefined}
 */
ObjetBase.prototype.updateg = function () {
  const oldg = this.g
  this.creeg()
  this.doc.svg.replaceChild(this.g, oldg)
  this.doc.setElement(this.id, this)
  this.g.setAttribute('visibility', 'visible')
}
/**
 * Fonction qui renverra true lorsque la création de l'objet donne lieu à une animation
 * par exemple pour les segments, droites. Sera donc redéfini dans droiteAncetre
 * Dans ce cas, l'objet devra avoir deux fonctions : lanceAnimation et actionPourAnimation
 * @returns {boolean}
 */
ObjetBase.prototype.creationAnimee = function () {
  return false
}
/**
 * Fonction qui devra être redéfinie pour les objets créés avec une animation
 * appelée à la fin d'une animation ou lors de la visualisation immédiate de l'objet
 * lors du click sur une icône stepNext ou stepPrev
 */
ObjetBase.prototype.finAction = function () {
}
