/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CAffLiePt from '../objets/CAffLiePt'
import CElementGraphique from '../objets/CElementGraphique'
import Color from '../types/Color'
import TikzColor from '../types/TikzColor'
import { chaineNombre, ConvRadDeg, getStr } from '../kernel/kernel'
import { adaptStringTikz } from '../kernel/kernelAdd'
import StyleEncadrement from '../types/StyleEncadrement'
import Fonte from '../types/Fonte'

export default CAffLiePt

CAffLiePt.prototype.depDe4Rec = function (p) {
  const dep = CElementGraphique.prototype.depDe4Rec.call(this, p) || this.angText.depDe4Rec(p)
  if (this.pointLie === null) { return dep } else { return dep || this.pointLie.depDe4Rec(p) || this.angText.depDe4Rec(p) }
}

CAffLiePt.prototype.addTikzColors = function (stb, vect) {
  let st = CElementGraphique.prototype.addTikzColors.call(this, stb, vect)
  if (this.effacementFond) {
    const coulFond = this.couleurFond
    if (coulFond !== Color.black) {
      const code = TikzColor.colorString(coulFond)
      if (!TikzColor.containsColor(vect, coulFond)) {
        vect.push(code)
        st += '\\definecolor{' + code + '}{rgb}{' +
          chaineNombre(coulFond.getRed() / 255, 2) + ',' +
          chaineNombre(coulFond.getGreen() / 255, 2) + ',' +
          chaineNombre(coulFond.getBlue() / 255, 2) + '}' + '\n'
      }
    }
  }
  return st
}

CAffLiePt.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  const list = this.listeProprietaire
  const ang = String(this.angText.rendValeurRadian() * ConvRadDeg)
  let x0 = this.xNom + this.decX
  let y0 = this.yNom + this.decY
  let style = ''
  switch (this.alignementVertical) {
    case CAffLiePt.alignVerLow :
      style = 'above '
      y0 += 2
      break
    case CAffLiePt.alignVerTop :
      style = 'below '
      y0 -= 2
  }
  switch (this.alignementHorizontal) {
    case CAffLiePt.alignHorLeft :
      style += 'right '
      x0 -= 2
      break
    case CAffLiePt.alignHorRight :
      x0 += 2
      style += 'left '
  }
  const x = list.tikzXcoord(x0, dimf, bu)
  const y = list.tikzYcoord(y0, dimf, bu)

  style += ',' + this.tikzCouleur() + ','
  if (this.encadrement !== StyleEncadrement.Sans) {
    style += 'draw=' + this.tikzCouleur() + ','
    const dinsepx = list.tikzLongueur(2, dimf, bu)
    const dinsepy = list.tikzLongueur(4, dimf, bu)
    const insepx = chaineNombre(dinsepx, 2)
    const insepy = chaineNombre(dinsepy, 2)
    style += 'inner xsep =' + insepx + 'cm,inner ysep =' + insepy + 'cm,'
  }
  if (this.effacementFond) style += 'fill=' + TikzColor.colorString(this.couleurFond) + ','

  let ch = Fonte.remplaceUnicodeParLatex(this.chaineAAfficher)
  ch = ch.replace(/\n/g, '\\\\')
  ch = Fonte.traiteCodesDiese(ch)
  ch = adaptStringTikz(ch)// Pour remplacer les % par \%
  if (ang === '0') {
    return '\\node at ' + '(' + chaineNombre(x, 3) + ', ' + chaineNombre(y, 3) +
      ') [align=left,' + style + ',font= \\sf ' + this.tikzFont(dimf, this.taillePolice, coefmult, bu) + '] {' + ch + '};'
  } else {
    return '\\node at ' + '(' + chaineNombre(x, 3) + ', ' + chaineNombre(y, 3) + ') [rotate=' + ang + ',align=left,' + style + 'font= \\sf ' +
      this.tikzFont(dimf, this.taillePolice, coefmult, bu) + '] {' + ch + '};'
  }
}

CAffLiePt.prototype.adaptRes = function (coef) {
  CElementGraphique.prototype.adaptRes.call(this, coef)
  this.xNom *= coef
  this.yNom *= coef
  this.taillePolice *= coef
}

CAffLiePt.prototype.estDefiniParObjDs = function (listeOb) {
  const res = this.angText.estDefiniParObjDs(listeOb)
  if (this.pointLie == null) return res
  else return res && this.pointLie.estDefPar(listeOb)
}

CAffLiePt.prototype.infoAngle = function () {
  const chval = this.angText.chaineInfo()
  if (chval === '0') return ''
  else return '\n' + getStr('Angle') + ' : ' + chval
}

/**
 * Renvoie true si l'affichage est un objet final de construction
 * et son angle d'affichage dépend d'un des objets sources de la construction
 * @returns {boolean}
 */
CAffLiePt.prototype.estFinalEtAngleEstDynamique = function () {
  return ((this.impProto !== null) && this.angText.depDe(this.impProto))
}
