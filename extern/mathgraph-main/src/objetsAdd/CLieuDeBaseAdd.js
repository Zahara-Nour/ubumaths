/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLieuDeBase from '../objets/CLieuDeBase'
import InfoLigneLieu from '../types/InfoLigneLieu'
import Vecteur from '../types/Vect'
import { chaineNombre, distancePointPoint, getStr } from '../kernel/kernel'
import { distancePointDroite } from '../kernel/kernelAdd'
import CElementLigne from '../objets/CElementLigne'
import LieuDlg from '../dialogs/LieuDlg'
export default CLieuDeBase

/**
 * Fonction renvoyant la nature de l'objet (par exemple point, droite, cercle)
 * @returns {string}
 */
CLieuDeBase.prototype.getTypeName = function () {
  return getStr('LieuPt')
}

CLieuDeBase.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CElementLigne.prototype.depDe4Rec.call(this, p) ||
    this.pointATracer.depDe4Rec(p))
}

CLieuDeBase.prototype.distancePoint = function (xp, yp, masquage, distmin) {
  if (!this.existe || (masquage && this.masque)) return -1
  else return this.distancePointPourSurface(xp, yp, masquage, distmin)
}

CLieuDeBase.prototype.distancePointPourSurface = function (xp, yp, masquage, distmin) {
  let j, k, x1, y1, x2, y2, x1ord, x2ord, y1ord, y2ord, d
  if (!this.existe) return -1
  const vec = new Vecteur()
  for (j = 0; j < this.nombreLignes; j++) {
    for (k = this.infoLignes[j].indicePremierPoint; k <= this.infoLignes[j].indicePremierPoint +
      this.infoLignes[j].nombrePoints - 2; k++) {
      x1 = this.absPoints[k]
      y1 = this.ordPoints[k]
      x2 = this.absPoints[k + 1]
      y2 = this.ordPoints[k + 1]
      if (x1 > x2) {
        x1ord = x2
        x2ord = x1
      } else {
        x1ord = x1
        x2ord = x2
      }
      if (y1 > y2) {
        y1ord = y2
        y2ord = y1
      } else {
        y1ord = y1
        y2ord = y2
      }
      d = distancePointPoint(xp, yp, x1, y1)
      // Distance d'abord aux points calculés
      if (d < distmin) return d
      // puis aux segments
      if ((xp >= x1ord) && (xp <= x2ord) && (yp >= y1ord) && (yp <= y2ord)) {
        vec.x = x2 - x1
        vec.y = y2 - y1
        if (!vec.nul()) {
        // if ((vec.x != 0) || (vec.y != 0)) {
          d = distancePointDroite(xp, yp, x1, y1, vec)
          if (d < distmin) return d
        }
      }
    } // for k
  } // for j
  return -1
}

/**
 * Fonction appelée lorsque le nombre de points du lieu a changé
 */
CLieuDeBase.prototype.changeCaracteristiques = function () {
  this.absPoints = new Array(this.infoLieu.nombreDePoints + 1)
  this.ordPoints = new Array(this.infoLieu.nombreDePoints + 1)
  const nb = Math.floor(this.infoLieu.nombreDePoints / 2) + 2
  this.infoLignes = new Array(nb)
  // Il faut initialiser chaque élément du tableau
  for (let i = 0; i < nb; i++) {
    this.infoLignes[i] = new InfoLigneLieu()
  }
}

CLieuDeBase.prototype.modifiableParMenu = function () {
  return true
}

CLieuDeBase.prototype.modifDlg = function (app, callBack1, callBack2) {
  new LieuDlg(app, this, true, callBack1, callBack2)
}

// Modifié par rapport à la version Java
/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CLieuDeBase.prototype.genereNom = function () {
  CLieuDeBase.ind++
  return getStr('rlieu') + CLieuDeBase.ind
}

CLieuDeBase.prototype.setCloneTikz = function (ptel) {
  CElementLigne.prototype.setCloneTikz.call(this, ptel)
  const nbp = this.infoLieu.nombreDePoints + 1
  this.xCoord = new Array(nbp)
  this.yCoord = new Array(nbp)
  this.nombreLignes = ptel.nombreLignes
  this.infoLieu.setCopy(ptel.infoLieu) // Il faut copier toutes les coordonnées
  for (let j = 0; j < this.nombreLignes; j++) {
    this.infoLignes[j].setCopy(ptel.infoLignes[j])
    for (let k = 0; k < this.infoLignes[j].nombrePoints; k++) {
      this.xCoord[this.infoLignes[j].indicePremierPoint + k] = ptel.xCoord[this.infoLignes[j].indicePremierPoint + k]
      this.yCoord[this.infoLignes[j].indicePremierPoint + k] = ptel.yCoord[this.infoLignes[j].indicePremierPoint + k]
    }
  }
}

CLieuDeBase.prototype.tikzOnePath = function (dimf, nomaff, coefmult, bu) {
  const list = this.listeProprietaire
  let ch = ''
  const indpl = this.indicePremiereLigne
  const ideb = this.infoLignes[indpl].indicePremierPoint
  for (let j = 0; j < this.nombreLignes; j++) {
    const nombrePointsLigne = this.infoLignes[j].nombrePoints
    const indPremPoint = this.infoLignes[j].indicePremierPoint
    for (let i = 0; i < nombrePointsLigne; i++) {
      ch += '(' + chaineNombre(list.tikzXcoord(this.xCoord[indPremPoint + i], dimf, bu), 3) + ',' +
        chaineNombre(list.tikzYcoord(this.yCoord[indPremPoint + i], dimf, bu), 3) + ')'
      ch += '--'
    }
  }
  if (this.infoLieu.fermeOuNon) {
    ch += '(' + chaineNombre(list.tikzXcoord(this.xCoord[ideb], dimf, bu), 3) + ',' +
      chaineNombre(list.tikzYcoord(this.yCoord[ideb], dimf, bu), 3) + ')'
  }
  const len = ch.length
  if (ch.substring(len - 2) === '--') ch = ch.substring(0, len - 2)
  return ch
}

CLieuDeBase.prototype.positionneTikz = function (infoRandom, dimfen) {
  CElementLigne.prototype.positionneTikz.call(this, infoRandom, dimfen)
  const nbp = this.infoLieu.nombreDePoints + 1
  this.xCoord = new Array(nbp)
  this.yCoord = new Array(nbp)
}

CLieuDeBase.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  let ch = ''; let j; let nombrePoints; let indPremPoint; let x; let y; let k; let k1
  const list = this.listeProprietaire
  const infoLignes = this.infoLignes
  for (j = 0; j < this.nombreLignes; j++) {
    nombrePoints = infoLignes[j].nombrePoints
    // Optimisé version 3.9 On trace maintenant les points isolés du lieu
    indPremPoint = infoLignes[j].indicePremierPoint
    if (nombrePoints === 1) {
      x = this.xCoord[indPremPoint]
      y = this.yCoord[indPremPoint]
      if (dimf.dansFenetre(x, y)) {
        ch += '\\draw [' + this.tikzCouleur() + '](' + chaineNombre(list.tikzXcoord(x, dimf, bu), 3) +
          ',' + chaineNombre(list.tikzYcoord(y, dimf, bu), 3) + ')circle(' +
          chaineNombre(list.tikzLongueur(2, dimf, bu), 3) + ');' + '\n'
      }
    } else {
      // Il faut transférer les coordonnées de chaque ligne pour pouvoir la tracer
      ch += '\\draw ' + this.tikzLineStyle(dimf, coefmult)
      for (k = 0; k < nombrePoints; k++) {
        k1 = indPremPoint + k
        ch += '(' + chaineNombre(list.tikzXcoord(this.xCoord[k1], dimf, bu), 3) + ',' +
          chaineNombre(list.tikzYcoord(this.yCoord[k1], dimf, bu), 3) + ')'
        if (k < nombrePoints - 1) ch += '--'
        else {
          if (this.infoLieu.fermeOuNon) ch += '--cycle'
          ch += ';' + '\n'
        }
      }
    }
  }
  return ch
}

CLieuDeBase.prototype.estDefiniParObjDs = function (listeOb) {
  return this.pointATracer.estDefPar(listeOb)
}
