/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLieuParVariable from '../objets/CLieuParVariable'
import CLieuDeBase from '../objets/CLieuDeBase'
import { getStr, testToile } from '../kernel/kernel'
export default CLieuParVariable

CLieuParVariable.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('LieuPt') + ' ' + getStr('of') + ' ' +
    this.pointATracer.getName() + ' ' + getStr('chinfo207') + ' ' + this.variableGeneratrice.nomCalcul
}

CLieuParVariable.prototype.positionneTikz = function (infoRandom, dimfen) {
  let valeur
  const vg = this.variableGeneratrice
  if (!vg.existe) {
    this.existe = false
    return
  }
  const infoLieu = this.infoLieu
  const pointATracer = this.pointATracer
  CLieuDeBase.prototype.positionneTikz.call(this, infoRandom, dimfen)
  const valeurMinimale = vg.valeurMini
  const valeurMaximale = vg.valeurMaxi
  const valeurInitiale = vg.valeurActuelle
  const pas = (valeurMaximale - valeurMinimale) / (infoLieu.nombreDePoints - 1)
  valeur = valeurMinimale - pas
  let ligneEnCours = false
  let indiceLigneEnCours = -1
  const nb = infoLieu.nombreDePoints - 1
  for (let i = 0; i < infoLieu.nombreDePoints; i++) {
    valeur = (i === 0) ? valeurMinimale : ((i === nb) ? valeurMaximale : valeur + pas)
    vg.donneValeur(valeur)
    this.listeElementsAncetres.positionne(infoRandom, dimfen)
    if (!pointATracer.existe) {
      if (ligneEnCours) {
        this.infoLignes[indiceLigneEnCours].nombrePoints =
          i - this.infoLignes[indiceLigneEnCours].indicePremierPoint
        ligneEnCours = false
      }
    } else {
      if (!(testToile(pointATracer.x, pointATracer.y))) {
        if (ligneEnCours) {
          this.infoLignes[indiceLigneEnCours].nombrePoints = i - this.infoLignes[indiceLigneEnCours].indicePremierPoint
          ligneEnCours = false
        }
      } else {
        if (ligneEnCours) {
          if (infoLieu.gestionDiscontinuite) {
            if ((Math.abs(pointATracer.x - this.xCoord[i - 1]) > dimfen.x) ||
              (Math.abs(pointATracer.y - this.yCoord[i - 1]) > dimfen.y)) {
              this.infoLignes[indiceLigneEnCours].nombrePoints = i - this.infoLignes[indiceLigneEnCours].indicePremierPoint
              ligneEnCours = false
            } else {
              this.xCoord[i] = pointATracer.x
              this.yCoord[i] = pointATracer.y
              this.infoLignes[indiceLigneEnCours].nombrePoints++
            }
          } else {
            this.xCoord[i] = pointATracer.x
            this.yCoord[i] = pointATracer.y
            this.infoLignes[indiceLigneEnCours].nombrePoints++
          }
        } else {
          this.xCoord[i] = pointATracer.x
          this.yCoord[i] = pointATracer.y
          indiceLigneEnCours++
          ligneEnCours = true
          this.infoLignes[indiceLigneEnCours].indicePremierPoint = i
          this.infoLignes[indiceLigneEnCours].nombrePoints = 1
        }
      }
    }
  }
  // On redonne à la variable génératrice sa valeur initiale
  vg.donneValeur(valeurInitiale)
  this.listeElementsAncetres.positionne(infoRandom, dimfen)
  this.nombreLignes = indiceLigneEnCours + 1
  // Si le lieu n'est formé d'aucune ligne ou s'il est formé
  // de lignes avec un seul point, il n'existe pas
  if (this.nombreLignes === 0) {
    this.existe = false
    return
  }
  let auMoinsUneLigne = false
  this.indicePremiereLigne = -1
  this.nombreLignesDePlusieursPoints = 0
  for (let j = 0; j <= indiceLigneEnCours; j++) {
    const ligneTrouvee = this.infoLignes[j].nombrePoints >= 2
    if (ligneTrouvee) {
      this.nombreLignesDePlusieursPoints++
      if (!auMoinsUneLigne) this.indicePremiereLigne = j
      auMoinsUneLigne = true
    }
  }
  this.existe = auMoinsUneLigne
}

CLieuParVariable.prototype.estDefiniParObjDs = function (listeOb) {
  return CLieuDeBase.prototype.estDefiniParObjDs.call(this, listeOb) &&
  this.variableGeneratrice.estDefPar(listeOb)
}
