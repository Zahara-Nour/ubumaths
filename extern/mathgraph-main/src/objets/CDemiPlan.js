/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CSurface from './CSurface'
export default CDemiPlan

/**
 *
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @constructor
 * @extends CSurface
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleRemplissage} styleRemplissage  Entier donnant le style de remplissage.
 * @param {CLieuDeBase} bord  Le lieu de points bord de la surface.
 * @param {CPt} pointDemiPlan  Un point appartenant au demi-plan.
 * @returns {CDemiPlan}
 */
function CDemiPlan (listeProprietaire, impProto, estElementFinal, couleur,
  masque, styleRemplissage, bord, pointDemiPlan) {
  if (arguments.length === 1) CSurface.call(this, listeProprietaire)
  else {
    CSurface.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, styleRemplissage, bord)
    this.pointDemiPlan = pointDemiPlan
  }
  this.absPtsBord = new Array(5)
  this.ordPtsBord = new Array(5)
}
CDemiPlan.prototype = new CSurface()
CDemiPlan.prototype.constructor = CDemiPlan
CDemiPlan.prototype.superClass = 'CSurface'
CDemiPlan.prototype.className = 'CDemiPlan'

CDemiPlan.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.bord)
  const ind2 = listeSource.indexOf(this.pointDemiPlan)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CDemiPlan(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.styleRemplissage, listeCible.get(ind1, 'CDroiteAncetre'),
    listeCible.get(ind2, 'CPt'))
}
CDemiPlan.prototype.setClone = function (ptel) {
  CSurface.prototype.setClone.call(this, ptel)
  this.nbPtsBord = ptel.nbPtsBord
  for (let i = 0; i < this.nbPtsBord; i++) {
    this.absPtsBord[i] = ptel.absPtsBord[i]
    this.ordPtsBord[i] = ptel.ordPtsBord[i]
  }
}
CDemiPlan.prototype.confonduAvec = function (p) {
  let res = CSurface.prototype.confonduAvec.call(this, p)
  if (!res) return false
  res = res && (this.pointDemiPlan === p.pointDemiPlan)
  return res
}
CDemiPlan.prototype.dansDemiPlan = function (x, y) {
  return (this.a * x + this.b * y + this.c) * this.signePointDemiPlan >= 0
}
CDemiPlan.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CSurface.prototype.depDe.call(this, p) || this.pointDemiPlan.depDe(p))
}
CDemiPlan.prototype.dependDePourBoucle = function (p) {
  return CSurface.prototype.dependDePourBoucle.call(this, p) || this.pointDemiPlan.dependDePourBoucle(p)
}
CDemiPlan.prototype.dependDePourCapture = function (p) {
  return CSurface.prototype.dependDePourCapture.call(this, p) || this.pointDemiPlan.dependDePourCapture(p)
}
CDemiPlan.prototype.positionne = function (infoRandom, dimfen) {
  let i, j
  const xext1 = this.bord.xext1
  const xext2 = this.bord.xext2
  const yext1 = this.bord.yext1
  const yext2 = this.bord.yext2
  this.existe = (this.pointDemiPlan.existe && this.bord.existe) && (!this.pointDemiPlan.surDroite(this.bord))
  if (!this.existe) return
  // Une équation cartésienne du bord est ax+by+c = 0.
  this.b = -this.bord.vect.x
  this.a = this.bord.vect.y
  this.c = -this.a * xext1 - this.b * yext1
  const s = this.a * this.pointDemiPlan.x + this.b * this.pointDemiPlan.y + this.c
  if (s > 0) this.signePointDemiPlan = 1
  else {
    if (s < 0) this.signePointDemiPlan = -1
    else this.signePointDemiPlan = 0
  }
  // Les coordonnées des 4 coins de la fenêtre
  const x = new Array(4)
  const y = new Array(4)
  x[0] = 0
  y[0] = 0
  x[1] = dimfen.x
  y[1] = 0
  x[2] = dimfen.x
  y[2] = dimfen.y
  x[3] = 0
  y[3] = dimfen.y
  // Les résultats pour savoir s'ils sont ou non dans le demi-plan
  const dedans = new Array(4)
  j = -1
  for (i = 0; i <= 3; i++) {
    dedans[i] = this.dansDemiPlan(x[i], y[i])
    if ((j === -1) && dedans[i]) j = i
  }
  if (j === -1) {
    this.existe = false
    return // Aucun sommet dans le demi-plan
  }
  this.nbPtsBord = 0
  for (i = 0; i <= 3; i++) {
    j = (j + 1) % 4
    if (dedans[j]) {
      this.absPtsBord[this.nbPtsBord] = x[j]
      this.ordPtsBord[this.nbPtsBord] = y[j]
      this.nbPtsBord++
    } else {
      if ((j % 2) === 0) {
        if (xext1 === x[j]) {
          this.absPtsBord[this.nbPtsBord] = xext1
          this.ordPtsBord[this.nbPtsBord] = yext1
          this.nbPtsBord++
          this.absPtsBord[this.nbPtsBord] = xext2
          this.ordPtsBord[this.nbPtsBord] = yext2
          this.nbPtsBord++
        } else {
          this.absPtsBord[this.nbPtsBord] = xext2
          this.ordPtsBord[this.nbPtsBord] = yext2
          this.nbPtsBord++
          this.absPtsBord[this.nbPtsBord] = xext1
          this.ordPtsBord[this.nbPtsBord] = yext1
          this.nbPtsBord++
        }
      } else {
        if (yext1 === y[j]) {
          this.absPtsBord[this.nbPtsBord] = xext1
          this.ordPtsBord[this.nbPtsBord] = yext1
          this.nbPtsBord++
          this.absPtsBord[this.nbPtsBord] = xext2
          this.ordPtsBord[this.nbPtsBord] = yext2
          this.nbPtsBord++
        } else {
          this.absPtsBord[this.nbPtsBord] = xext2
          this.ordPtsBord[this.nbPtsBord] = yext2
          this.nbPtsBord++
          this.absPtsBord[this.nbPtsBord] = xext1
          this.ordPtsBord[this.nbPtsBord] = yext1
          this.nbPtsBord++
        }
      }
      while (i <= 3) {
        if (dedans[j]) {
          this.absPtsBord[this.nbPtsBord] = x[j]
          this.ordPtsBord[this.nbPtsBord] = y[j]
          this.nbPtsBord++
        }
        i++
        j = (j + 1) % 4
      }
    }
  }
}
/**
 * Fonction renvoyant une chaîne de caractères utilisée dans le svg élément
 * représentant la surface.
 * @returns {string}
 */
CDemiPlan.prototype.creePoints = function () {
  let i; let points = this.absPtsBord[0] + ',' + this.ordPtsBord[0] + ' '
  for (i = 1; i < this.nbPtsBord; i++) {
    points += this.absPtsBord[i] + ',' + this.ordPtsBord[i] + ' '
  }
  return points
}
CDemiPlan.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointDemiPlan === ancienPoint) this.pointDemiPlan = nouveauPoint
}
CDemiPlan.prototype.getNature = function () {
  return NatObj.NDemiPlan
}
CDemiPlan.prototype.chaineDesignation = function () {
  return 'desDemiPlan'
}
CDemiPlan.prototype.read = function (inps, list) {
  CSurface.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.pointDemiPlan = list.get(ind1, 'CPt')
}
CDemiPlan.prototype.write = function (oups, list) {
  CSurface.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.pointDemiPlan)
  oups.writeInt(ind1)
}
