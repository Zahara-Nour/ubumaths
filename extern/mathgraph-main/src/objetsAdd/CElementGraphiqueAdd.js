/*
 * Created by yvesb on 17/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CElementGraphique from '../objets/CElementGraphique'
import Rect from '../types/Rect'
import NatObj from '../types/NatObj'
import Color from '../types/Color'
import TikzColor from '../types/TikzColor'
import { chaineNombre } from '../kernel/kernel'
import Fonte from '../types/Fonte'
import $ from 'jquery'
export default CElementGraphique

/**
 * Fonction positionnant et créant l'affichage de l'élément (en le masquant s'il est masqué)
 * @param {boolean} infoRandom  true si les calculs aléatoires doivent être relancés
 * @param {Dimf} dimfen  Dimensions du svg dans lequel la figure est dessinée
 * @param {SVGElement} svg
 * @param {Color} couleurFond
 */
CElementGraphique.prototype.positionneEtCreeAffichage = function (infoRandom, dimfen, svg, couleurFond) {
  this.positionne(infoRandom, dimfen)
  this.creeAffichage(svg, true, couleurFond)
}

/**
 *
 * @returns {string}
 */
CElementGraphique.prototype.getNom = function () {
  return this.nom
}

/**
 * Fonction utilisée quand on décrit un  objet en utilisant le nom d'un point
 * @returns {string} Renvoie '?' si le point n'a pas de nom et sinon renvoie son nom
 */
CElementGraphique.prototype.getName = function () {
  if (this.nom === '') return '?'
  else return this.nom
}

/**
 * Fonction renvoyant la nature de l'objet (par exemple point, droite, cercle)
 * @returns {string}
 */
CElementGraphique.prototype.getTypeName = function () {
  return ''
}

/**
 * Fonction décrivant l'objet pour la boîte de dialogue de protcoloe de la figure
 * @returns {string}
 */
CElementGraphique.prototype.infoHist = function () {
  return ''
}

/**
 * Fonction utilisée dans la boîte de dialogue ProtocoleDlg et montrant ou cachant le g Element
 * représentant graphiquement l'objet.
 * Doit être redéfini pour les lieux d'objets qui contient eux-aussi de g elements
 * @param bshow Si true on montre le g Element sinon on le cache
 */
CElementGraphique.prototype.showgElt = function (bshow) {
  $(this.g).attr('visibility', bshow ? 'visible' : 'hidden')
  if ((this.estDeNature(NatObj.NObjNommable) || this.estDeNature(NatObj.NObjetDuplique)) && this.gname) { $(this.gname).attr('visibility', bshow ? 'visible' : 'hidden') }
}

/**
 * Fonction utilisée seulement pour les objets images par une transformation
 */
CElementGraphique.prototype.associeATransformation = function (trans) {
  this.transformation = trans
}

/**
 * On définit ici une fonction qui complète createName car pour la version mtgApp on a besoin de pouvoir capturer un nom
 * On affiche le nom dans un svg auxilaire pour pouvoir ensuite connaître ses dimensions
 * @param text le g tetxtElement représentant le nom
 * @returns {Element}
 */
CElementGraphique.prototype.createNameAdd = function (text) {
  text.setAttribute('visibility', 'hidden')
  const svgAux = document.getElementById('mtgSvgAux')
  svgAux.appendChild(text)
  this.rectName = new Rect(0, 0, 0, 0)
  const bb = text.getBBox()
  this.rectName.x = bb.x
  this.rectName.y = bb.y
  this.rectName.width = bb.width
  this.rectName.height = bb.height
  svgAux.removeChild(text)
  text.setAttribute('visibility', 'visible')
}

CElementGraphique.prototype.updateRectName = function () {
  if (this.nom === '') {
    if (this.rectName) {
      this.rectName.width = 0
      this.rectName.height = 0
    }
  } else {
    const clone = this.gname.cloneNode(true)
    const svgAux = document.getElementById('mtgSvgAux')
    svgAux.appendChild(clone)
    this.rectName = new Rect(0, 0, 0, 0)
    const bb = clone.getBBox()
    this.rectName.x = bb.x
    this.rectName.y = bb.y
    this.rectName.width = bb.width
    this.rectName.height = bb.height
    svgAux.removeChild(clone)
  }
}

/**
 * Fonction renvoyant 0 si l'objet a un nom non vide et qui contient le point de coordinnées (xp, yp)
 * Les coordonnées du rectangle contenant le nom affiché ont été calculées dans createNameAdd
 * @param xp
 * @param yp
 * @param ray sert à définir la demi-distance par rapprot au centre acceptée pour être proche (distance rectangulaire)
 * @returns {number}
 */
CElementGraphique.prototype.distanceNom = function (xp, yp, ray) {
  if (!this.existe || !this.hasgElement || !this.gname) return -1
  const rect = this.rectName
  const centrex = rect.x + rect.width / 2
  const centrey = rect.y + rect.height / 2
  if ((Math.abs(xp - centrex) <= ray) && (Math.abs(yp - centrey) <= ray)) {
    return 0
  } else return -1
}

/**
 * Fonction qui renvoie true seulement pour les objets qui sont des objets images d'un autre par une transformation
 * @returns {boolean}
 */
CElementGraphique.prototype.estImageParTrans = function () {
  return false
}

/**
 * Fonction renvoyant le code tikz de l'élément
 * @returns {string}
 */
CElementGraphique.prototype.tikz = function () {
  return ''
}

/**
 * Renvoie la chaîne de caractères tikz décrivant la couleur d'un objet
 * @returns {string}
 */
CElementGraphique.prototype.tikzCouleur = function () {
  const coul = this.couleur
  if ((coul.getRed() === 0) && (coul.getGreen() === 0) && (coul.getBlue() === 0)) return 'black'
  return TikzColor.colorString(coul)
}

/**
 * Ajout version 4.8.1
 * Renvoie la chaine LaTeX représentant le nom
 * @returns {string}
 */
CElementGraphique.prototype.tikzNom = function () {
  const nom = this.nom
  const commenceParCarGrec = Fonte.estCaractereGrec(nom.charAt(0))
  let ch = commenceParCarGrec ? '$' : '$\\text{'
  if (commenceParCarGrec) ch += Fonte.convertitLatex(nom.charAt(0))
  else ch += nom.charAt(0)
  let chiffre = false
  for (let i = 1; i < nom.length; i++) {
    const car = nom.charAt(i)
    if (Fonte.chiffre(car)) {
      if (!chiffre) {
        ch += '}_{'
        chiffre = true
      }
    }
    ch += car
  }
  if (!commenceParCarGrec) ch += '}'
  return ch + '$'
}

/*
 * Version 4.8.1
 * Renvoie la ligne LaTeX permettant de sélectionner la taille de fone correspondant à indiceTaille
 * @param dimf
 * @param indiceTaille
 * @returns {string}
 */
/**
 * Renvoie la ligne LaTeX permettant de sélectionner la taille de fone correspondant à taille
 * @param dimf
 * @param taille
 * @param coefmult
 * @param bu
 * @returns {string}
 */
CElementGraphique.prototype.tikzFont = function (dimf, taille, coefmult, bu) {
  const k = coefmult * (taille - 1)
  const d = this.listeProprietaire.tikzLongueur(k, dimf, bu)
  // Le *1.25 pour un interligne de 1,25 fois la taille de la fonte
  return '\\fontsize {' + chaineNombre(d, 3) + 'cm} {' + chaineNombre(d * 1.25, 3) + 'cm} \\selectfont'
}

/**
 * Ajout version 4.8.1
 * Ajoute à st le code Tikz permettant de définir les couleurs de l'objet si
 * vect ne contient pas déjàa le code couleur corresondant
 * @param stb
 * @param vect
 */
CElementGraphique.prototype.addTikzColors = function (stb, vect) {
  const couleur = this.couleur
  if (couleur !== Color.black) {
    const code = TikzColor.colorString(couleur)
    if (!TikzColor.containsColor(vect, couleur)) {
      vect.push(code)
      stb += '\\definecolor{' + code + '}{rgb}{' +
        chaineNombre(couleur.getRed() / 255, 2) + ',' +
      chaineNombre(couleur.getGreen() / 255, 2) + ',' +
      chaineNombre(couleur.getBlue() / 255, 2) + '}' + '\n'
    }
  }
  return stb
}

CElementGraphique.prototype.adaptRes = function (coef) {
  this.decX *= coef
  this.decY *= coef
  this.tailleNom *= coef
}

/**
 * Renvoie true si un objet est isométrique à une autre.
 * Utilisé pour les polygones et exercices de construction
 * @param p {CElementGraphique}
 * @returns {boolean}
 */
CElementGraphique.prototype.isIsomTo = function (p) {
  return false
}
