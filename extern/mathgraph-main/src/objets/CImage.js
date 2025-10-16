/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import { base64Encode } from '../kernel/kernel'
import StyleEncadrement from '../types/StyleEncadrement'
import CAffLiePt from './CAffLiePt'
import CValeur from 'src/objets/CValeur'

export default CImage

// Version 7.9 : On ajoute une largeur pour l'image.
// Si la largeur est négative, on garde la largeur initiale de l'image
// Si la largeur est positive, deux caS possibles :
// S'il la figure n'a pas de longueur unité, la largeur donne la largeur en pixels.
// Si la figure comporte une longueur unité, la largeur de la figure est donnée en unités de longueur.
/**
 * Classe représentant une image. Elle est chargée sous forme binaire.
 * @constructor
 * @extends CAffLiePt
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur de l'objet.
 * @param xNom Abscisse d'affichage
 * @param yNom Ordonnée d'affichage
 * @param {number} decX  Décalage horizontal par rapport à xNom
 * @param {number} decY  Décalage vertical par rapport à yNom
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {CPt} pointLie  null ou le point auquel l'image est liée.
 * @param {number} taillePolice  Indice donnant la taille de la police.
 * @param {StyleEncadrement} encadrement
 * @param {boolean} effacementFond  true si on efface le fond avant d'afficher l'image.
 * @param {Color} couleurFond  La couleur de fond éventuelle.
 * @param {number} alignementHorizontal  0 pour alignement gauche, 1 pour centre, 2 pour droite.
 * @param {number} alignementVertical  0 pour alignement vers le haut, 1 pour centré, 2 pour bas.
 * @param {number} natImage  nombre correspondant à la nature de l'image : 0 pour "png",1 pour "jpg" ou 2 pour "gif"
 * @param {string} image  chaîne de caractères en Base64 contenant le code binaire de l'image.
 * @param {CValeurAngle} angText  L'angle du texte par rapport à l'horizontale
 * @param {CValeur} largeur La largeur de l'image en pixels si pas de longueur unité, si négatif la largeur sera celle de l'image initiale
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 */
function CImage (listeProprietaire, impProto, estElementFinal, couleur, xNom, yNom,
  decX, decY, masque, pointLie, taillePolice, encadrement, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, natImage, image, angText, largeur, fixed = false) {
  if (arguments.length === 1) CAffLiePt.call(this, listeProprietaire)
  else {
    CAffLiePt.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      xNom, yNom, decX, decY, masque, pointLie, taillePolice, encadrement, effacementFond,
      couleurFond, alignementHorizontal, alignementVertical, angText, fixed)
    this.natImage = natImage
    this.image = image
    this.largeur = largeur
  }
}
CImage.prototype = new CAffLiePt()
CImage.prototype.constructor = CImage
CImage.prototype.superClass = 'CAffLiePt'
CImage.prototype.className = 'CImage'

// Version 7.9 : On passe le numéro de version à 3 en ajoutant une largeur
CImage.prototype.numeroVersion = function () {
  // return 2
  return 3
}

CImage.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.pointLie)
  const ind2 = listeSource.indexOf(this.impProto)
  const angTextClone = this.angText.getClone(listeSource, listeCible)
  const largeurClone = this.largeur.getClone(listeSource, listeCible)
  const ptelb = new CImage(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY,
    this.masque, listeCible.get(ind1, 'CPt'), this.taillePolice, this.encadrement,
    this.effacementFond, this.couleurFond, this.alignementHorizontal, this.alignementVertical,
    this.natImage, this.image, angTextClone, largeurClone, this.fixed)
  ptelb.width = this.width
  ptelb.height = this.height
  return ptelb
}
// Ajout version 6.0
CImage.prototype.setReady4MathJax = function () {
}

CImage.prototype.setReady4MathJaxUpdate = function () {
}

CImage.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CAffLiePt.prototype.depDe.call(this, p) || this.largeur.depDe(p))
}

// La fonction dependDePourCapture doit être redéfinie car sinon quand on demandé une largeur
// de valeur positive et que donc on veut que la largeur de l'image soit définie par rapport à la
// longeuur unité de la figure (s'il y en a une) il faut que si on capture un des deux points
// définissant la longueur unité de la figure cette fonction renvoie true
CImage.prototype.dependDePourCapture = function (p) {
  const dep = this.depDe(p)
  const longUnit = this.listeProprietaire.pointeurLongueurUnite
  if (longUnit !== null && longUnit.depDe(p)) {
    const long = this.largeur.rendValeur()
    if (long > 0) return true
    else return dep
  } else {
    return dep
  }
}

CImage.prototype.dependDePourBoucle = function (p) {
  return CAffLiePt.prototype.dependDePourBoucle.call(this, p) || this.largeur.dependDePourBoucle(p)
}

/**
 *
 * @param {boolean} infoRandom
 * @param {Dimf} dimfen
 */
CImage.prototype.positionne = function (infoRandom, dimfen) {
  CAffLiePt.prototype.positionnePourIm.call(this, infoRandom, dimfen)
  if (!this.existe) return
  this.largeur.positionne(infoRandom, dimfen)
  this.existe = this.largeur.existe
  if (!this.existe) return
  /* Modifié version 6.0
  this.rectAff.x = this.xNom + this.decX;
  this.rectAff.y = this.yNom + this.decY;
   */
  // reset de la position du Rect, que l'on va affiner ci-dessous
  this.rectAff.x = 0
  this.rectAff.y = 0
  let largeur = this.largeur.rendValeur()
  // Si la largeur est strictement positive c'est que la largeur de l'image est donnée en longueurs unités
  // et donc l'image doit être définie après la longueur unité sinon elle n'existe pas
  if (largeur > 0) {
    const longInit = this.listeProprietaire.pointeurLongueurUnite
    if (longInit !== null && (this.index < longInit.index)) {
      this.existe = false
      return
    }
  }
  let hauteur
  const longunit = this.listeProprietaire.pointeurLongueurUnite
  if (largeur === 0 || ((largeur > 0) && (longunit === null))) {
    largeur = this.width
    hauteur = this.height
  } else {
    if (largeur < 0) {
      largeur = Math.abs(largeur)
      hauteur = Math.abs(largeur / this.width * this.height)
    } else {
      const disunit = longunit.rendLongueur() // Longueur en pixels de la longueur unité
      largeur = largeur * disunit
      hauteur = largeur / this.width * this.height
    }
  }
  this.actualWidth = largeur
  this.actualHeight = hauteur

  // Modification version 4.5
  switch (this.alignementHorizontal) {
    case CAffLiePt.alignHorCent :
      this.rectAff.x -= largeur / 2
      break
    case CAffLiePt.alignHorRight :
      this.rectAff.x -= largeur
  }
  switch (this.alignementVertical) {
    case CAffLiePt.alignVerCent :
      this.rectAff.y -= hauteur / 2
      break
    case CAffLiePt.alignVerLow :
      this.rectAff.y -= hauteur
  }
}
CImage.prototype.createg = function () {
  const g = cens('g')
  this.rectAff.width = this.actualWidth + 3
  this.rectAff.height = this.actualHeight + 3
  const image = cens('image', {
    x: this.rectAff.x,
    y: this.rectAff.y,
    width: this.actualWidth,
    height: this.actualHeight,
    'pointer-events': 'none'
  })
  const tab = ['png', 'gif', 'jpg']
  const ext = tab[this.natImage]
  image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'data:image/' + ext + ';base64,' + base64Encode(this.image, true))
  image.style.opacity = this.couleur.opacity
  g.appendChild(image)
  if (this.effacementFond || (this.encadrement !== StyleEncadrement.Sans)) this.creeRectangle(g)
  // Ajout version Version 6.0 //////////////////////////////////////////
  this.positionneAngText(g)
  /// //////////////////////////////////////////////////////////////////////
  // Ligne suivante ajoutée version 6.5.2
  g.setAttribute('pointer-events', this.pointerevents)
  return g
}
CImage.prototype.update = function () {
  if (this.g !== null) {
    this.rectAff.width = this.actualWidth + 3
    this.rectAff.height = this.actualHeight + 3
    const img = this.g.childNodes[this.g.childNodes.length - 1]
    // g.removeAttribute("x");
    // g.removeAttribute("y");
    img.setAttribute('x', this.rectAff.x)
    img.setAttribute('y', this.rectAff.y)
    img.setAttribute('width', this.actualWidth)
    img.setAttribute('height', this.actualHeight)
    if (this.effacementFond || (this.encadrement !== StyleEncadrement.Sans)) this.remplaceRectangle(this.g, this.couleurFond)
    this.positionneAngText(this.g)
  }
}
CImage.prototype.ajouteAntecedents = function (liste) {
  if (this.pointLie !== null) liste.add(this.pointLie)
}
CImage.prototype.getNature = function () {
  return NatObj.NImage
}
CImage.prototype.rendChaineAffichage = function () {
  return ''
}
CImage.prototype.chaineDesignation = function () {
  return 'desImage'
}

// Rajout version 6.0 pour pouvoir créer un lieu d'objet d'un image
CImage.prototype.setClone = function (ptel) {
  CAffLiePt.prototype.setClone.call(this, ptel)
  this.largeur.valeur = ptel.largeur.valeur
  this.actualWidth = ptel.actualWidth
  this.actualHeight = ptel.actualHeight
  this.rectAff.setClone(ptel.rectAff)
}

CImage.prototype.read = function (inps, list) {
  CAffLiePt.prototype.read.call(this, inps, list)
  this.natImage = inps.readByte()
  this.width = inps.readInt()
  this.height = inps.readInt()
  this.image = inps.readBufferedImage()
  if (this.nVersion > 2) {
    this.largeur = new CValeur()
    this.largeur.read(inps, list)
  } else {
    this.largeur = new CValeur(list, 0) // 0 pour garder par défaut les dimensions en pixels de l'iamage
  }
}
CImage.prototype.write = function (oups, list) {
  CAffLiePt.prototype.write.call(this, oups, list)
  oups.writeByte(this.natImage)
  oups.writeInt(this.width)
  oups.writeInt(this.height)
  oups.writeBufferedImage(this.image, this.natImage)
  this.largeur.write(oups, list)
}
