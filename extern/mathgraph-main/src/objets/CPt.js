/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import CElementGraphique from './CElementGraphique'
import MotifPoint from '../types/MotifPoint'
import Vect from '../types/Vect'
import { colineaires, testToile, zero } from '../kernel/kernel'
export default CPt
/**
 * Classe ancetre de tous les points.
 * @constructor
 * @extends CElementGraphique
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet
 * @param {boolean} nomMasque  true si le nom de l'objet est masqué
 * @param {number} decX  Decalage horizontal du nom
 * @param {number} decY  Decalage vertical du nom
 * @param {boolean} masque  true si l'objet est masque
 * @param {string} nom  Le nom eventuel de l'objet
 * @param {number} tailleNom  Indice de la taille du nom (voir Fonte)
 * @param {MotifPoint} motif  Le motif du point
 * @param {boolean} marquePourTrace  true si le point est marqué pour la trace
 * @returns {void}
 */
function CPt (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CElementGraphique.call(this, listeProprietaire)
  else {
    CElementGraphique.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom)
    this.motif = motif
    this.marquePourTrace = marquePourTrace
  }
}
CPt.prototype = new CElementGraphique()
CPt.prototype.constructor = CPt
CPt.prototype.superClass = 'CElementGraphique'
CPt.prototype.className = 'CPt'

CPt.prototype.setClone = function (ptel) {
  CElementGraphique.prototype.setClone.call(this, ptel)
  this.x = ptel.x
  this.y = ptel.y
  this.horsEcran = ptel.horsEcran
  this.dansFenetre = ptel.dansFenetre
  this.marquePourTrace = ptel.marquePourTrace
}

/**
 * Ajout version 5.2 (numéro de version 16). Renverra true si l'objet possède un nom qui doit être enregistré dans le flux
 * @returns {boolean}
 */
CPt.prototype.hasName = function () {
  return true
}

CPt.prototype.getNature = function () {
  return NatObj.NPoint
}
/**
 * Renvoie true si le point est un point libre
 * Redefini pour CPointAncetrePointsMobiles et ses desecndants
 * @returns {boolean}
 */
CPt.prototype.estLibre = function () {
  return false // Spécial JavaScript
}
/**
 * Renvoie true si les coordonnées du point sont comprises entre -2147483648 et 2147483647
 * @returns {boolean}
 */
CPt.prototype.testToile = function () {
  return testToile(this.x, this.y)
}

/**
 * Renvoie true si le point de coordonnées (x,y) est dans la fenêtre dimfen
 * @param {Dimf} dimfen
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
CPt.prototype.testFenetre = function (dimfen, x, y) {
  return dimfen.dansFenetre(x, y)
}
/**
 * Renvoie true si le point est contenu dans la fenêtre dimfen
 * @returns {boolean}
 */
CPt.prototype.dansFen = function () {
  return this.dansFenetre
}
/**
 * Renvoie le svg element représentant le point
 * @returns {SVGElement}
 */
CPt.prototype.createg = function () {
  let line1, line2, g, k0, k2, k3, k4, k5
  let style = ''
  const coul = this.color
  // style += 'stroke:' + coul + ';' // Modifié version 6.9.1
  style += 'stroke:' + coul + ';opacity:' + this.couleur.opacity + ';'
  const lp = this.listeProprietaire
  const coefMult = lp.coefMult ? lp.coefMult : 1
  switch (this.motif) {
    case MotifPoint.pave:
      style += 'stroke-width:1;'
      style += 'fill:' + coul + ';'
      k2 = 2 * coefMult
      k4 = 4 * coefMult
      g = cens('rect', {
        x: this.x - k2,
        y: this.y - k2,
        width: k4,
        height: k4,
        style
      })
      break
    case MotifPoint.rond:
      style += 'stroke-width:1;'
      style += 'fill:' + coul + ';'
      g = cens('circle', {
        cx: this.x,
        cy: this.y,
        // r: 3, // Modifé version 5.4
        r: 2.5 * coefMult,
        style
      })
      break
    case MotifPoint.croix:
      k3 = 4 * coefMult
      style += 'stroke-width:1.5;'
      g = cens('g')
      line1 = cens('line', {
        style,
        x1: this.x - k3,
        y1: this.y,
        x2: this.x + k3,
        y2: this.y
      })
      line2 = cens('line', {
        style,
        x1: this.x,
        y1: this.y - k3,
        x2: this.x,
        y2: this.y + k3
      })
      g.appendChild(line1)
      g.appendChild(line2)
      break
    case MotifPoint.multi:
      k3 = 3 * coefMult
      style += 'stroke-width:1.5;'
      g = cens('g')
      line1 = cens('line', {
        style,
        x1: this.x - k3,
        y1: this.y - k3,
        x2: this.x + k3,
        y2: this.y + k3
      })
      line2 = cens('line', {
        style,
        x1: this.x + k3,
        y1: this.y - k3,
        x2: this.x - k3,
        y2: this.y + k3
      })
      g.appendChild(line1)
      g.appendChild(line2)
      break
    case MotifPoint.petitRond:
      style += 'stroke-width:1;'
      style += 'fill:' + coul + ';'
      g = cens('circle', {
        cx: this.x,
        cy: this.y,
        // r: 2, // Modifié version 5.4
        r: 1.5 * coefMult,
        style
      })
      break
    case MotifPoint.losange:
      k3 = 3 * coefMult
      style += 'stroke-width:1;'
      style += 'fill:' + coul + ';'
      g = cens('polygon', {
        points: this.x + ' ' + (this.y - k3).toString() + ',' + (this.x - k3).toString() + ' ' + this.y + ',' +
        this.x + ' ' + (this.y + k3).toString() + ',' + (this.x + k3).toString() + ' ' + this.y,
        style
      })
      break
    case MotifPoint.pixel:
    case MotifPoint.quadrillage:
      k0 = 0.5 * coefMult
      style += 'stroke-width:1;'
      style += 'fill:' + coul + ';'
      g = cens('circle', {
        cx: this.x,
        cy: this.y,
        r: k0,
        style
      })
      break
    case MotifPoint.grandRond:
      style += 'stroke-width:1;'
      style += 'fill:' + coul + ';'
      g = cens('circle', {
        cx: this.x,
        cy: this.y,
        // r: 4, // Modifié version 5.4
        r: 3.5 * coefMult,
        style
      })
      break
    case MotifPoint.grandMult:
      k5 = 5 * coefMult
      style += 'stroke-width:1.5;'
      g = cens('g')
      line1 = cens('line', {
        style,
        x1: this.x - k5,
        y1: this.y - k5,
        x2: this.x + k5,
        y2: this.y + k5
      })
      line2 = cens('line', {
        style,
        x1: this.x + k5,
        y1: this.y - k5,
        x2: this.x - k5,
        y2: this.y + k5
      })
      g.appendChild(line1)
      g.appendChild(line2)
  }
  // if (!this.dansFenetre) g.setAttribute("visibility", "hidden");
  // Ligne suivante modifiée version 6.5.2
  // g.setAttribute('pointer-events', 'none')
  g.setAttribute('pointer-events', this.pointerevents)
  return g
}

CPt.prototype.hasg = function (masquage, memeMasque = false) {
  return this.existe && this.dansFenetre && (memeMasque || !(this.masque && masquage))
}
/**
 * Rajoute au svg le svg Element représentant le point
 * @param {SVGElement} svg
 * @returns {void}
 */
CPt.prototype.trace = function (svg) {
  const g = this.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
  if (this.listeProprietaire.documentProprietaire.modeTraceActive && this.marquePourTrace) { this.listeProprietaire.addTrace(this.createg()) }
}
// Spécial JavaScript : Met à jour dans le DOM l'élément associé

CPt.prototype.update = function (svg) {
  const oldg = this.g
  const g = this.createg()
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  this.g = g
  if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
}

CPt.prototype.updateTrace = function (svg) {
  if (this.marquePourTrace && this.listeProprietaire.documentProprietaire.modeTraceActive) { this.listeProprietaire.addTrace(this.createg()) }
}
// Spécial JavaScript

CPt.prototype.distancePoint = function (xp, yp, masquage) {
  if (!this.existe || (masquage && this.masque)) return -1
  else {
    const u = new Vect(this.x, this.y, xp, yp)
    return u.norme()
  }
}

CPt.prototype.afficheNom = function (svg) {
  if (this.existe && !this.horsEcran) {
    CElementGraphique.prototype.afficheNom.call(this, svg)
  }
}
/**
 * Etablit la position du nom du point
 * @returns {void}
 */
CPt.prototype.positionneNom = function () {
  this.placeNom(this.x, this.y)
}

CPt.prototype.positionne = function (infoRandom, dimfen) {
  this.horsEcran = !this.testToile()
  this.dansFenetre = this.testFenetre(dimfen, this.x, this.y) // Ajouté version 4.6.4
  this.positionneNom()
}
/**
 * Doone au point le motif mot du type MotifPoint
 * @param {MotifPoint} mot
 * @returns {void}
 */
CPt.prototype.donneMotif = function (mot) {
  this.motif = mot
}
// Attention : deux PlaceEn en java imossible en JavaScipt
/**
 * Place le point aux ccordonnées (xn,yn)
 * @param {number} xn
 * @param {number} yn
 * @returns {void}
 */
CPt.prototype.placeEn = function (xn, yn) {
  this.existe = true
  this.x = xn
  this.y = yn
  this.placeNom(xn, yn)
}
// A revoir doit pouvoir être supprimé car redéfini pour les points qui peuvent être bougés
/**
 * Fonction renvoyant true si le point put être déplacé aux coordonnées (xtest,ytest)
 * et renvoie dans pointr les coordonnées de la destination finale du point
 * @param {Dimf} dimfen
 * @param {number} xtest
 * @param {number} ytest
 * @param {Object} pointr
 * @returns {boolean}
 */
CPt.prototype.testDeplacement = function (dimfen, xtest, ytest, pointr) {
  pointr.x = xtest
  pointr.y = ytest
  return this.testFenetre(dimfen, xtest, ytest)
}
/**
 * Fonction renvoyant true si le point est sur droite.
 * droite peut pointer sur une droite, une demi-droite, un segment ou un vecteur
 * @param {CDroiteAncetre} droite
 * @returns {boolean}
 */
CPt.prototype.surDroite = function (droite) {
  if (!this.existe) return false
  const vec = new Vect()
  vec.x = this.x - droite.point_x
  vec.y = this.y - droite.point_y
  return (colineaires(droite.vect, vec) && droite.appartientA(this.x, this.y))
}
/**
 * Renvoie true si les coordonnées du point sont les mêmes que celles de pt
 * @param {CPt} pt
 * @returns {boolean}
 */
CPt.prototype.egal = function (pt) {
  return (this.x === pt.x) && (this.y === pt.y)
}
/**
 * Renvoie true si les coordonnées du point sont presque confondues avec celles de a
 * @param {CPt} a
 * @returns {boolean}
 */
CPt.prototype.presqueEgal = function (a) {
  return (zero(this.x - a.x) && (zero(this.y - a.y)))
}
/**
 * Renvoie true si le point est un point image par une transformation
 * @returns {boolean}
 */
CPt.prototype.estPointImage = function () {
  return false
}

CPt.prototype.chaineDesignation = function () {
  return 'designationPoint'
}

CPt.prototype.read = function (inps, list) {
  CElementGraphique.prototype.read.call(this, inps, list)
  this.motif = inps.readByte()
  this.marquePourTrace = (this.listeProprietaire.numeroVersion < 8) ? false : inps.readBoolean()
}

CPt.prototype.write = function (oups, list) {
  CElementGraphique.prototype.write.call(this, oups, list)
  oups.writeByte(this.motif)
  oups.writeBoolean(this.marquePourTrace)
}

// Fonction ajoutée version 6.5.2 pour permettre de modifier directement des éléments de la figure
CPt.prototype.setgColor = function () {
  const g = this.g
  if (g) {
    if (g.childNodes.length === 0) {
      g.style.fill = this.color
      g.style.opacity = this.couleur.opacity // Ajouté version 6.9.1
    } else {
      for (let i = 0; i < g.childNodes.length; i++) {
        g.childNodes[i].style.stroke = this.color
        g.childNodes[i].style.opacity = this.couleur.opacity
      }
    }
    return true
  } else return false
}
