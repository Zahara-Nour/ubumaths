/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { chaineNombre, colineaires, distancePointPoint } from '../kernel/kernel'
import CDroiteAncetre from '../objets/CDroiteAncetre'
import NatObj from '../types/NatObj'
import Vect from '../types/Vect'
import { projetteOrtho } from 'src/kernel/kernelVect'

export default CDroiteAncetre

/**
 * Fonction utilisée par le protocole de la figure et renvoyant soit le nom de la droite (donnée lors de la boîte
 * de dialogue de protocole soit la chaîne de caractères décriavnt la doite ((OA) par exemple).
 * @returns {string}
 */
CDroiteAncetre.prototype.getNom = function () {
  return this.nom // Ne pas utiliser getName car dans l'historique on regarde si getNom() est vide et si ou on affecte
  // un nom à la droite
}

CDroiteAncetre.prototype.distancePointPourDemiPlan = function (xp, yp) {
  if (!this.existe) return -1
  else {
    projetteOrtho(xp, yp, this.point_x, this.point_y, this.vect, this.pointr)
    return distancePointPoint(xp, yp, this.pointr.x, this.pointr.y)
  }
}

CDroiteAncetre.prototype.distancePoint = function (xp, yp, masquage) {
  let dis
  if (!(this.existe) || (masquage && this.masque)) return -1
  else {
    projetteOrtho(xp, yp, this.point_x, this.point_y, this.vect, this.pointr)
    dis = distancePointPoint(xp, yp, this.pointr.x, this.pointr.y)
    return dis
  }
}

/**
 * Fonction  servant à savoir si un point
 * est par définition sur une droite. Renverra true par exemple
 * si la droite est définie par deux points et le point est un de ces deux points
 * ou si le point est lié à la droite
 * @param {CElementGraphique} d
 * @returns {boolean}
 */
CDroiteAncetre.prototype.contientParDefinition = function (d) {
  return false
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CDroiteAncetre.prototype.genereNom = function (ch) {
  if (arguments.length === 0) return this.listeProprietaire.genereNomPourPointOuDroite('d', true)
  CDroiteAncetre.ind++
  return ch + CDroiteAncetre.ind
}

CDroiteAncetre.prototype.coincideAvec = function (p) {
  if (p.getNature() !== NatObj.NDroite) return false
  const vec = new Vect(p.point_x, p.point_y, this.point_x, this.point_y)
  return (colineaires(this.vect, p.vect) && colineaires(vec, this.vect))
}

CDroiteAncetre.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  if (this.horsFenetre) return '' // Par exemple pour un segment aux extrémités confondues
  const list = this.listeProprietaire
  let x1 = list.tikzXcoord(this.xext1, dimf, bu)
  let y1 = list.tikzYcoord(this.yext1, dimf, bu)
  const x2 = list.tikzXcoord(this.xext2, dimf, bu)
  const y2 = list.tikzYcoord(this.yext2, dimf, bu)
  let ch = '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '(' + chaineNombre(x1, 3) + ',' + chaineNombre(y1, 3) + ')--' +
    '(' + chaineNombre(x2, 3) + ',' + chaineNombre(y2, 3) + ');'
  if (nomaff) {
    if (this.nomMasque || this.nom === '') return ch
    ch = ch + '\n'
    const style = 'below right,' + this.tikzCouleur() + ','
    x1 = list.tikzXcoord(this.xNom + this.decX - 7, dimf, bu)
    y1 = list.tikzYcoord(this.yNom + this.decY + 4, dimf, bu)
    ch += '\\node at ' + '(' + chaineNombre(x1, 3) + ', ' + chaineNombre(y1, 3) +
      ') [align=left,inner sep = 0pt, outer sep = 0pt,' + style +
      'font= \\sf ' + this.tikzFont(dimf, this.tailleNom, coefmult, bu) + '] {' + this.tikzNom() + '};'
  }
  return ch
}
