/*
 * Created by yvesb on 22/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CPt from '../objets/CPt'
import { chaineNombre, getStr } from '../kernel/kernel'
import NatObj from '../types/NatObj'
import MotifPoint from '../types/MotifPoint'
export default CPt

/**
 * Fonction renvoyant la nature de l'objet (par exemple point, droite, cercle)
 * @returns {string}
 */
CPt.prototype.getTypeName = function () {
  return getStr('Point')
}

/**
 * Renvoie true si le point appartient à droite de par sa construction
 * droite peut pointer sur une droite, demi-droite, segment ou vecteur
 * @param {CDroiteAncetre} droite
 * @returns {boolean}
 */
CPt.prototype.appartientDroiteParDefinition = function (droite) {
  return droite.contientParDefinition(this)
}
/**
 * Renvoie true si le point appartient à cercle de par sa construction
 * cercle peut pointer sur un cercle ou un arc de cercle
 * Modifé version 6.1 : Recherche de triangles équilatéraux.
 * Pour qu'une point B (this) appartienne  un cercle de centre C et passant par A il suffit
 * qu'il existe un cercle de centre A auxquels appartiennent B et C et un cercle de centre B
 * auxquels appartiennent à la fois A et C
 * @param {CCercle} cercle
 * @returns {boolean}
 */
CPt.prototype.appartientCercleParDefinition = function (cercle) {
  const res = cercle.contientParDefinition(this)
  if (res) return true
  if (cercle.className === 'CCercleOA') {
    const c = cercle.o
    const a = cercle.a
    const list = this.listeProprietaire
    const indexCercle = cercle.index
    for (let i = 0; i < indexCercle; i++) {
      const el = list.get(i)
      if (el.estCercleParCentre() && (el.o === a) && this.appartientCercleParDefinition(el) && c.appartientCercleParDefinition(el)) {
        for (let j = 0; j < indexCercle; j++) {
          const e = list.get(j)
          if (e.estCercleParCentre() && (e.o === this) && a.appartientCercleParDefinition(e) && c.appartientCercleParDefinition(e)) return true
        }
      }
    }
    return false
  } else return false
}

CPt.prototype.appartientParDefinition = function (el) {
  if (el.estDeNature(NatObj.NTteDroite)) return this.appartientDroiteParDefinition(el)
  else return this.appartientCercleParDefinition(el)
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CPt.prototype.genereNom = function (ch) {
  if (arguments.length === 0) return this.listeProprietaire.genereNomPourPoint(true)
  CPt.ind++
  return ch + CPt.ind
}

CPt.prototype.coincideAvec = function (p) {
  if (!p.estDeNature(NatObj.NTtPoint)) return false
  return this.presqueEgal(p)
}

CPt.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  if (this.masque || !this.dansFenetre) return ''
  let x1; let x2; let x3; let y1; let y2; let y3; let ray; let k2; let k3; let k5
  const list = this.listeProprietaire
  const x = this.x
  const y = this.y
  let ch = ''
  // Version 5.0.1 : Si on réduit la figure, on réduit la taille des poinst mais si on l'agrandit on ne la change pas
  const coef = (coefmult >= 1) ? 1 : coefmult
  //
  switch (this.motif) {
    case MotifPoint.pave:
      k2 = Math.round(coef * 2)
      x1 = list.tikzXcoord(x - k2, dimf, bu)
      y1 = list.tikzYcoord(y - k2, dimf, bu)
      x2 = list.tikzXcoord(x + k2, dimf, bu)
      y2 = list.tikzYcoord(y + k2, dimf, bu)
      ch = '\\fill[color=' + this.tikzCouleur() + '] (' +
        chaineNombre(x1, 3) + ',' + chaineNombre(y1, 3) + ') rectangle (' +
        chaineNombre(x2, 3) + ',' + chaineNombre(y2, 3) + ');'
      break
    case MotifPoint.rond:
      ray = list.tikzLongueur(3, dimf, bu)
      x1 = list.tikzXcoord(x, dimf, bu)
      y1 = list.tikzYcoord(y, dimf, bu)
      ch = '\\fill[color=' + this.tikzCouleur() + '] (' +
        chaineNombre(x1, 3) + ',' + chaineNombre(y1, 3) + ') circle (' +
        chaineNombre(ray, 3) + ');'
      break
    case MotifPoint.petitRond:
      ray = list.tikzLongueur(2, dimf, bu)
      x1 = list.tikzXcoord(x, dimf, bu)
      y1 = list.tikzYcoord(y, dimf, bu)
      ch = '\\fill[color=' + this.tikzCouleur() + '] (' +
        chaineNombre(x1, 3) + ',' + chaineNombre(y1, 3) + ') circle (' +
        chaineNombre(ray, 3) + ');'
      break
    case MotifPoint.croix:
      k3 = Math.round(coef * 3)
      ray = list.tikzLongueur(1, dimf, bu) * coefmult
      ch = ''
      x1 = list.tikzXcoord(x - k3, dimf, bu)
      y1 = list.tikzYcoord(y, dimf, bu)
      x2 = list.tikzXcoord(x + k3, dimf, bu)
      x3 = list.tikzXcoord(x, dimf, bu)
      y2 = list.tikzYcoord(y - k3, dimf, bu)
      y3 = list.tikzYcoord(y + k3, dimf, bu)

      ch = '\\draw [line width = ' + chaineNombre(ray, 3) + 'cm, color = ' + this.tikzCouleur() + '] (' + chaineNombre(x1, 3) + ',' +
        chaineNombre(y1, 3) + ')--(' + chaineNombre(x2, 3) + ',' + chaineNombre(y1, 3) + ');' + '\n'
      ch += '\\draw [line width = ' + chaineNombre(ray, 3) + 'cm, color = ' + this.tikzCouleur() + '] (' + chaineNombre(x3, 3) + ',' +
        chaineNombre(y2, 3) + ')--(' + chaineNombre(x3, 3) + ',' + chaineNombre(y3, 3) + ');'
      break
    case MotifPoint.multi:
      k3 = Math.round(coef * 3)
      ray = list.tikzLongueur(1, dimf, bu) * coefmult
      ch = ''
      x1 = list.tikzXcoord(x - k3, dimf, bu)
      y1 = list.tikzYcoord(y - k3, dimf, bu)
      x2 = list.tikzXcoord(x + k3, dimf, bu)
      y2 = list.tikzYcoord(y + k3, dimf, bu)

      ch = '\\draw [line width = ' + chaineNombre(ray, 3) + 'cm, color = ' + this.tikzCouleur() + '] (' + chaineNombre(x1, 3) + ',' +
        chaineNombre(y1, 3) + ')--(' + chaineNombre(x2, 3) + ',' + chaineNombre(y2, 3) + ');' + '\n'
      ch += '\\draw [line width = ' + chaineNombre(ray, 3) + 'cm, color = ' + this.tikzCouleur() + '] (' + chaineNombre(x1, 3) + ',' +
        chaineNombre(y2, 3) + ')--(' + chaineNombre(x2, 3) + ',' + chaineNombre(y1, 3) + ');'
      break
    case MotifPoint.losange:
      ch = ''
      k3 = Math.round(coef * 3)
      x1 = list.tikzXcoord(x - k3, dimf, bu)
      y1 = list.tikzYcoord(y - k3, dimf, bu)
      x2 = list.tikzXcoord(x + k3, dimf, bu)
      y2 = list.tikzYcoord(y + k3, dimf, bu)
      x3 = list.tikzXcoord(x, dimf, bu)
      y3 = list.tikzYcoord(y, dimf, bu)
      ch = '\\fill [color = ' + this.tikzCouleur() + '] (' + chaineNombre(x1, 3) + ',' +
        chaineNombre(y3, 3) + ')--(' + chaineNombre(x3, 3) + ',' + chaineNombre(y1, 3) +
        ')--(' + chaineNombre(x2, 3) + ',' + chaineNombre(y3, 3) +
        ')--(' + chaineNombre(x3, 3) + ',' + chaineNombre(y2, 3) + ')--cycle;'
      break
    case MotifPoint.pixel:
      ray = list.tikzLongueur(1, dimf, bu)
      x1 = list.tikzXcoord(x, dimf, bu)
      y1 = list.tikzYcoord(y, dimf, bu)
      ch = '\\fill[color=' + this.tikzCouleur() + '] (' +
        chaineNombre(x1, 3) + ',' + chaineNombre(y1, 3) + ') circle (' +
        chaineNombre(ray, 3) + ');'
      break

    // Ajout version 5.0. Deux motifs suppémentaires
    case MotifPoint.grandRond:
      ray = list.tikzLongueur(Math.round(4 * coef), dimf, bu)
      x1 = list.tikzXcoord(x, dimf, bu)
      y1 = list.tikzYcoord(y, dimf, bu)
      ch = '\\fill[color=' + this.tikzCouleur() + '] (' +
        chaineNombre(x1, 3) + ',' + chaineNombre(y1, 3) + ') circle (' +
        chaineNombre(ray, 3) + ');'
      break
    case MotifPoint.grandMult:
      ray = list.tikzLongueur(1, dimf, bu)
      ch = ''
      k5 = Math.round(coef * 5)
      x1 = list.tikzXcoord(x - k5, dimf, bu)
      y1 = list.tikzYcoord(y - k5, dimf, bu)
      x2 = list.tikzXcoord(x + k5, dimf, bu)
      y2 = list.tikzYcoord(y + k5, dimf, bu)

      ch = '\\draw [line width = ' + chaineNombre(ray, 3) + 'cm, color = ' + this.tikzCouleur() + '] (' + chaineNombre(x1, 3) + ',' +
        chaineNombre(y1, 3) + ')--(' + chaineNombre(x2, 3) + ',' + chaineNombre(y2, 3) + ');' + '\n'
      ch += '\\draw [line width = ' + chaineNombre(ray, 3) + 'cm, color = ' + this.tikzCouleur() + '] (' + chaineNombre(x1, 3) + ',' +
        chaineNombre(y2, 3) + ')--(' + chaineNombre(x2, 3) + ',' + chaineNombre(y1, 3) + ');'
      break
  } // switch
  // On affiche le nom s'il n'est pas masqué et visible et si nomaff est true
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
