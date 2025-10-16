/*
 * Created by yvesb on 06/06/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CArcDeCercleAncetre from '../objets/CArcDeCercleAncetre'
import { chaineNombre, ConvRadDeg, getStr } from '../kernel/kernel'
import Vect from '../types/Vect'
export default CArcDeCercleAncetre

/**
 * Fonction renvoyant la nature de l'objet (par exemple point, droite, cercle)
 * @returns {string}
 */
CArcDeCercleAncetre.prototype.getTypeName = function () {
  return getStr('Arc')
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CArcDeCercleAncetre.prototype.genereNom = function () {
  CArcDeCercleAncetre.ind++
  return getStr('rarc') + CArcDeCercleAncetre.ind
}

CArcDeCercleAncetre.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  const list = this.listeProprietaire
  const x1 = list.tikzXcoord(this.a.x, dimf, bu)
  const y1 = list.tikzYcoord(this.a.y, dimf, bu)
  const ray = list.tikzLongueur(this.rayon, dimf, bu)
  const u = new Vect(this.centreX, this.centreY, this.origine_x, this.origine_y)
  let ang1 = u.angleRad()
  let ang2 = ang1 + this.valeurAngleAuCentre
  if (ang2 < 0) ang2 = ang2 + 2 * Math.PI
  if (ang2 >= 2 * Math.PI) ang2 = ang2 - 2 * Math.PI
  if (ang2 < ang1) ang2 = ang2 + 2 * Math.PI

  ang1 *= ConvRadDeg
  ang2 *= ConvRadDeg
  return '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '(' + chaineNombre(x1, 3) + ',' + chaineNombre(y1, 3) + ') arc ' +
    '(' + chaineNombre(ang1, 3) + ' : ' + chaineNombre(ang2, 3) + ' : ' + chaineNombre(ray, 3) + ');'
}
