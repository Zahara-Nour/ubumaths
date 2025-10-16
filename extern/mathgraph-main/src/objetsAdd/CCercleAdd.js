/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { chaineNombre, distancePointPoint, getStr, zero } from '../kernel/kernel'
import CCercle from '../objets/CCercle'
import NatObj from '../types/NatObj'

export default CCercle

/**
 * Fonction renvoyant la nature de l'objet (par exemple point, droite, cercle)
 * @returns {string}
 */
CCercle.prototype.getTypeName = function () {
  return getStr('Cerc')
}

CCercle.prototype.distancePoint = function (xp, yp, masquage) {
  if (!(this.existe) || (masquage && this.masque)) return -1
  else return this.distancePointPourSurface(xp, yp)
}

CCercle.prototype.distancePointPourSurface = function (xp, yp) {
  if (!this.existe) return -1
  else {
    const distance = distancePointPoint(this.centreX, this.centreY, xp, yp)
    return Math.abs(distance - this.rayon)
  }
}

/**
 * Fonction servant à savoir si un point est par définition sur un cercle ou un arc de cercle.
 * @param {CPt} po Le point testé
 * @returns {boolean}
 */
CCercle.prototype.contientParDefinition = function (po) {
  return false
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string} Le nom généré
 */
CCercle.prototype.genereNom = function () {
  CCercle.ind++
  return getStr('rcerc') + CCercle.ind
}

CCercle.prototype.coincideAvec = function (p) {
  if (p.getNature() !== NatObj.NCercle) return false
  return zero(this.centreX - p.centreX) && zero(this.centreY - p.centreY) &&
    zero(this.rayon - p.rayon)
}

CCercle.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  if (this.horsFenetre) return ''
  const list = this.listeProprietaire
  const x1 = list.tikzXcoord(this.centreX, dimf, bu)
  const y1 = list.tikzYcoord(this.centreY, dimf, bu)
  const ray = list.tikzLongueur(this.rayon, dimf, bu)
  return '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '(' + chaineNombre(x1, 3) + ',' + chaineNombre(y1, 3) + ') circle ' +
    '(' + chaineNombre(ray, 3) + ');'
}

/**
 * Fonction servant uniquement pour les exercices de construction
 * Pour que this soit considéré comme isométrique à un cercle, this et p doivent être de classe CCercleOA, CCercleOR ou CCercleOAB,
 * leurs centres doivent avoir le même nom et leur rayons presque égaux
 * @param {CElementBase} p
 * @returns {boolean}
 */
CCercle.prototype.isIsomTo = function (p) {
  if (!this.estCercleParCentre() || !p.estCercleParCentre()) return false
  return (this.o.nom === p.o.nom) && zero(p.rayon - this.rayon)
}
