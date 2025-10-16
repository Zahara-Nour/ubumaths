/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Vect from '../types/Vect'
import { distancePointPoint, getStr, zero } from '../kernel/kernel'
import CSegment from '../objets/CSegment'
import CDroite from '../objets/CDroite'
import NatObj from '../types/NatObj'
import { projetteOrtho } from 'src/kernel/kernelVect'
import CTransformation from 'src/objets/CTransformation'

export default CSegment

/**
 * Fonction utilisée par le protocole de la figure et renvoyant soit le nom de la droite (donnée lors de la boîte
 * de dialogue de protocole soit la chaîne de caractères décriavnt la doite ((OA) par exemple).
 * @returns {string}
 */
CSegment.prototype.getNom = function () {
  return '[' + this.point1.getName() + this.point2.getName() + ']'
}

/**
 * Fonction renvoyant la nature de l'objet (par exemple point, droite, cercle)
 * @returns {string}
 */
CSegment.prototype.getTypeName = function () {
  return getStr('Seg')
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string} Le nom généré
 */
CSegment.prototype.genereNom = function () {
  CSegment.ind++
  return 'seg' + CSegment.ind
}

CSegment.prototype.infoHist = function () {
  return getStr('Seg') + ' ' + this.getNom()
}

CSegment.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CDroite.prototype.depDe4Rec.call(this, p) ||
    this.point1.depDe4Rec(p) || this.point2.depDe4Rec(p))
}

CSegment.prototype.distancePoint = function (xp, yp, masquage) {
  if (!(this.existe) || (masquage && this.masque)) return -1
  else {
    const vec = new Vect(this.xext1, this.yext1, this.xext2, this.yext2)
    const n = vec.norme()
    if (zero(n)) {
      return distancePointPoint(this.xext1, this.yext1, xp, yp)
    }

    projetteOrtho(xp, yp, this.xext1, this.yext1, vec, this.pointr)
    if (this.appartientA(this.pointr.x, this.pointr.y)) {
      return distancePointPoint(xp, yp, this.pointr.x, this.pointr.y)
    } else return -1
  }
}

CSegment.prototype.contientParDefinition = function (po) {
  if ((this.point1 === po) || (this.point2 === po)) return true
  // Si po est un point image et les deux extrémités du segment le sont aussi par la
  // même transformation (sauf une inversion) alors le poit appartient au segment
  if (po.estPointImage()) {
    const trans = po.transformation
    return (trans.natureTransformation() !== CTransformation.inversion) && this.point1.estPointImage() &&
      this.point2.estPointImage() && (trans === this.point1.transformation) && (trans === this.point2.transformation)
  }
  return false
}

CSegment.prototype.coincideAvec = function (p) {
  if (p.getNature() !== NatObj.NSegment) return false
  return ((this.point1.coincideAvec(p.point1) && (this.point2.coincideAvec(p.point2))) ||
    (this.point1.coincideAvec(p.point2) && (this.point2.coincideAvec(p.point1))))
}

CSegment.prototype.estDefiniParObjDs = function (listeOb) {
  return this.point1.estDefPar(listeOb) &&
  this.point2.estDefPar(listeOb)
}

/**
 *
 * @param {CElementGraphique} p
 * @returns {boolean}
 */
CSegment.prototype.isIsomTo = function (p) {
  if (p.getNature() !== NatObj.NSegment) return false
  const vect1 = new Vect(this.point1, this.point2)
  const vect2 = new Vect(p.point1, p.point2)
  return (((this.point1.nom === p.point1.nom) && (this.point2.nom === p.point2.nom)) ||
    ((this.point1.nom === p.point2.nom) && (this.point2.nom === p.point1.nom))) &&
    zero(vect1.norme() - vect2.norme())
}
