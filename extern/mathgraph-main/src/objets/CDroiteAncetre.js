/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import PositionDroiteCercle from '../types/PositionDroiteCercle'
import PositionDroites from '../types/PositionDroites'
import PositionRelative from '../types/PositionRelative'
import Vect from '../types/Vect'
import { colineaires, zero } from '../kernel/kernel'
import CElementLigne from './CElementLigne'
import { intersection, intersectionDroiteCercle } from 'src/kernel/kernelVect'

export default CDroiteAncetre

// Modifié version mtgApp
/**
 * Classe ancêtre de toutes les objets de type segment, droite, demi-droite.
 * @constructor
 * @extends CElementGraphique
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} nomMasque  true si le nom de l'objet est masqué
 * @param {number} decX  Décalage en abscisses du nom.
 * @param {number} decY  Décalage en ordonnées du nom.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {string} nom  Le nom de l'objet. Seules les droites peuvent être nommées,
 * pas les segments ni demi-droites.
 * @param {number} tailleNom  Indice donnant la taille du nom.
 * @param {StyleTrait} style  Le style de trait utilisé
 * @returns {CDroiteAncetre}
 */
function CDroiteAncetre (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, style) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CElementLigne.call(this, listeProprietaire)
    else {
      CElementLigne.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        nomMasque, decX, decY, masque, nom, tailleNom, style)
    }
    this.vect = new Vect()
    this.pointr = { x: 0, y: 0 }
  }
}
CDroiteAncetre.prototype = new CElementLigne()
CDroiteAncetre.prototype.constructor = CDroiteAncetre
CDroiteAncetre.prototype.superClass = 'CElementLigne'
CDroiteAncetre.prototype.className = 'CDroiteAncetre'

CDroiteAncetre.prototype.setClone = function (ptel) {
  CElementLigne.prototype.setClone.call(this, ptel)
  this.xext1 = ptel.xext1
  this.yext1 = ptel.yext1
  this.xext2 = ptel.xext2
  this.yext2 = ptel.yext2
  this.point_x = ptel.point_x
  this.point_y = ptel.point_y
  ptel.vect.setCopy(this.vect)
  this.horsFenetre = ptel.horsFenetre
}

/**
 * Ajout version 5.2 (numéro de version 16). Renverra true si l'objet possède un nom qui doit être enregistré dans le flux
 * @returns {boolean}
 */
CDroiteAncetre.prototype.hasName = function () {
  return true
}

CDroiteAncetre.prototype.appartientA = function (x, y) {
  return this.existe
}
/**
 * Fonction fournissant la position relative de la droite this par rapport à elg
 * @param {CElementGraphique} elg
 * @param {Pointeur} bperpendiculaires  renvoie par getValue true si les droites
 * sont perpendiculaires.
 * @returns {PositionRelative}
 */
CDroiteAncetre.prototype.positionRelative = function (elg, bperpendiculaires) {
  bperpendiculaires.setValue(false)
  if (elg.estDeNature(NatObj.NTtPoint)) {
    const vec = new Vect(elg.x, elg.y, this.point_x, this.point_y)
    if (colineaires(this.vect, vec) && this.appartientA(elg.x, elg.y)) return PositionRelative.appartient
    else return PositionRelative.nappartient
  } else {
    if (elg.estDeNature(NatObj.NTteDroite)) {
      // On regarde d'abord si les droites sont perpendiculaires
      if (zero(this.vect.x * elg.vect.x + this.vect.y * elg.vect.y)) bperpendiculaires.setValue(true)
      const pointInt = {}
      const positionDroites = intersection(this.point_x, this.point_y, this.vect,
        elg.point_x, elg.point_y, elg.vect, pointInt)
      switch (positionDroites) {
        case PositionDroites.Confondues :
          if (this.estDeNature(NatObj.NDroite) && elg.estDeNature(NatObj.NDroite)) return PositionRelative.confondus
          else return PositionRelative.memeSupportDroite
        case PositionDroites.Secantes :
          if (this.appartientA(pointInt.x, pointInt.y) && elg.appartientA(pointInt.x, pointInt.y)) return PositionRelative.secants
          else return PositionRelative.vide
        case PositionDroites.Paralleles : return PositionRelative.paralleles
        default : return PositionRelative.vide // Pour satisfaire le compilateur
      }
    } else {
      let b1, b2
      if (elg.estDeNature(NatObj.NTtCercle)) { // Cas d'un cercle ou un arc de cercle
        const point1 = {}
        const point2 = {}
        const positionDroiteCercle = intersectionDroiteCercle(this.point_x, this.point_y,
          this.vect, elg.centreX, elg.centreY, elg.rayon, point1, point2)
        switch (positionDroiteCercle) {
          case PositionDroiteCercle.Vide :
            return PositionRelative.vide
          case PositionDroiteCercle.Secants : {
            b1 = this.appartientA(point1.x, point1.y) && elg.surArc(point1.x, point1.y)
            b2 = this.appartientA(point2.x, point2.y) && elg.surArc(point2.x, point2.y)
            if (b1 && b2) return PositionRelative.secants2Point
            if (b1 || b2) return PositionRelative.secants1Point
            return PositionRelative.vide
          }
          case PositionDroiteCercle.Tangents : {
            b1 = this.appartientA(point1.x, point1.y) && elg.surArc(point1.x, point1.y)
            if (b1) return PositionRelative.tangents; else return PositionRelative.vide
          }
          default : return PositionRelative.vide // Pour satisfaire le compilateur
        }
      } else return PositionRelative.vide // Pour satisfaire le compilateur
    }
  }
}
/**
 * Fonction recalculant la droite.
 * A la sortie :
 * this.horsFenetre est true si la droite n'est pas visible dans dimfen
 * (this.xext1,this.yext1) et (this.xext2,this.yext2) contiennent les coordonnées
 * des deux points effectifs à tracer pour avoir sur la figure la repésentation
 * graphique de la droite.
 * @param {boolean} infoRandom  Pas utilisé ici.
 * @param {Dimf} dimfen  Dimensions du svg contenant la figure.
 * @returns {void}
 */
CDroiteAncetre.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = !this.vect.nul()
  if (!(this.existe)) return
  this.horsFenetre = false
  if (this.vect.x === 0) {
    if ((this.point_x < 0) || (this.point_x > dimfen.x)) {
      this.horsFenetre = true
      return
    }
    this.xext1 = this.point_x
    this.yext1 = 0
    this.xext2 = this.point_x
    this.yext2 = dimfen.y
    this.positionneNom()
    return
  }
  if (this.vect.y === 0) {
    if ((this.point_y < 0) || (this.point_y > dimfen.y)) {
      this.horsFenetre = true
      return
    }
    this.xext1 = 0
    this.yext1 = this.point_y
    this.xext2 = dimfen.x
    this.yext2 = this.point_y
    this.positionneNom()
    return
  }
  let indicePoint = 0
  const a = this.vect.y / this.vect.x
  const xa = 0
  const ya = this.point_y + a * (xa - this.point_x)
  if ((ya >= 0) && (ya <= dimfen.y)) {
    indicePoint++
    this.xext1 = xa
    this.yext1 = ya
  }
  const xb = dimfen.x
  const yb = a * (xb - this.point_x) + this.point_y
  if ((yb >= 0) && (yb <= dimfen.y)) {
    indicePoint++
    if (indicePoint === 1) {
      this.xext1 = xb
      this.yext1 = yb
    } else {
      this.xext2 = xb
      this.yext2 = yb
      this.positionneNom()
      return
    }
  }
  const yc = 0
  const xc = (yc - this.point_y) / a + this.point_x
  if ((xc > 0) && (xc < dimfen.x)) {
    indicePoint++
    if (indicePoint === 1) {
      this.xext1 = xc
      this.yext1 = yc
    } else {
      this.xext2 = xc
      this.yext2 = yc
      this.positionneNom()
      return
    }
  }
  const yd = dimfen.y
  const xd = (yd - this.point_y) / a + this.point_x
  if ((xd > 0) && (xd <= dimfen.x)) {
    indicePoint++
    if (indicePoint === 2) {
      this.xext2 = xd
      this.yext2 = yd
      this.positionneNom()
    } else {
      this.horsFenetre = true
    }
  } else {
    // Ligne suivante corrigée version 4.1
    this.horsFenetre = true
  }
  if (this.horsFenetre) {
    this.xext1 = 0
    this.yext1 = ya
    this.xext2 = xb
    this.yext2 = yb
  }
}

CDroiteAncetre.prototype.createg = function () {
  let style = ''
  const stroke = this.style.stroke
  if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
  const strokewidth = this.style.strokeWidth
  style += 'stroke-width:' + strokewidth + ';'
  // style += 'stroke:' + this.color + ';' // Modifié version 6.9.1
  style += 'stroke:' + this.color + ';opacity:' + this.couleur.opacity + ';'
  return cens('line', {
    x1: this.xext1,
    y1: this.yext1,
    x2: this.xext2,
    y2: this.yext2,
    style,
    // Ligne suivante modifiée version 6.5.2
    // 'pointer-events': 'none'
    'pointer-events': this.pointerevents
  })
}

CDroiteAncetre.prototype.hasg = function (masquage, memeMasque = false) {
  return this.existe && !this.horsFenetre && (memeMasque || !(this.masque && masquage))
}
CDroiteAncetre.prototype.horsCadre = function () {
  return this.horsFenetre
}
CDroiteAncetre.prototype.trace = function (svg) {
  const g = this.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}

CDroiteAncetre.prototype.update = function (svg) {
  const g = this.g
  g.removeAttribute('x1')
  g.removeAttribute('y1')
  g.removeAttribute('x2')
  g.removeAttribute('y2')
  g.setAttribute('x1', this.xext1)
  g.setAttribute('y1', this.yext1)
  g.setAttribute('x2', this.xext2)
  g.setAttribute('y2', this.yext2)
}

CDroiteAncetre.prototype.abscisseMinimale = function () {
  if ((this.vect.x === 0) && (this.vect.y === 0)) return 0
  if (Math.abs(this.vect.x) >= Math.abs(this.vect.y)) { return (this.xext1 - this.point_x) / this.vect.x } else { return (this.yext1 - this.point_y) / this.vect.y }
}

CDroiteAncetre.prototype.abscisseMaximale = function () {
  if ((this.vect.x === 0) && (this.vect.y === 0)) return 0
  if (Math.abs(this.vect.x) >= Math.abs(this.vect.y)) { return (this.xext2 - this.point_x) / this.vect.x } else { return (this.yext2 - this.point_y) / this.vect.y }
}

CDroiteAncetre.prototype.dansFen = function () { // Test d'existence car on peut créer une droite qui n'existe pas
  return this.existe && !this.horsFenetre
}

CDroiteAncetre.prototype.getNature = function () {
  return NatObj.NDroite
}
