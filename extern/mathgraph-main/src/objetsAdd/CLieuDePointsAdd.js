/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLieuDePoints from '../objets/CLieuDePoints'
import CLieuDeBase from '../objets/CLieuDeBase'
import { getStr, MAX_VALUE, testToile } from '../kernel/kernel'
export default CLieuDePoints

CLieuDePoints.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('LieuPt') + ' ' + getStr('of') + ' ' +
    this.pointATracer.getName() + ' ' + getStr('chinfo207') + ' ' + this.pointLieGenerateur.getName()
}

CLieuDePoints.prototype.estGenereParPointLie = function (pointlie) {
  return this.pointLieGenerateur === pointlie
}

CLieuDePoints.prototype.positionneTikz = function (infoRandom, dimfen) {
  let abscisseMini, abscisseMaxi, abscisse, pas, abscisseFinale, nbValeurs
  const plg = this.pointLieGenerateur
  const pointATracer = this.pointATracer
  const infoLieu = this.infoLieu
  if (!plg.existe) {
    this.existe = false
    return
  }
  CLieuDeBase.prototype.positionneTikz.call(this, infoRandom, dimfen)
  abscisseMini = plg.abscisseMinimale()
  abscisseMaxi = plg.abscisseMaximale()
  if (abscisseMini === abscisseMaxi) {
    this.existe = false
    return
  } else {
    // On ordonne l'abscisse minimale et maximale
    if (abscisseMini > abscisseMaxi) {
      const w = abscisseMini
      abscisseMini = abscisseMaxi
      abscisseMaxi = w
    }
  }
  const abscisseInitiale = plg.abscisse
  // Modification pour la version 1.9.5
  if (plg.lieALigneFermee()) {
    nbValeurs = infoLieu.nombreDePoints
    pas = (abscisseMaxi - abscisseMini) / nbValeurs
    abscisseFinale = abscisseMaxi - pas
  } else {
    nbValeurs = infoLieu.nombreDePoints - 1
    pas = (abscisseMaxi - abscisseMini) / nbValeurs
    abscisseFinale = abscisseMaxi
  }

  abscisse = abscisseMini

  let ligneEnCours = false
  let indiceLigneEnCours = -1

  const nb = infoLieu.nombreDePoints - 1
  for (let i = 0; i < infoLieu.nombreDePoints; i++) {
    abscisse = (i === 0) ? abscisseMini : ((i < nb) ? abscisse + pas : abscisseFinale)
    plg.donneAbscisse(abscisse)
    this.listeElementsAncetres.positionne(infoRandom, dimfen)
    if (!pointATracer.existe) {
      this.xCoord[i] = MAX_VALUE
      this.yCoord[i] = MAX_VALUE
      if (ligneEnCours) {
        this.infoLignes[indiceLigneEnCours].nombrePoints = i - this.infoLignes[indiceLigneEnCours].indicePremierPoint
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

  // On  remet le point ancêtre à sa position initiale
  plg.donneAbscisse(abscisseInitiale)
  this.listeElementsAncetres.positionneTikz(infoRandom, dimfen)
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
    if (this.infoLignes[j].nombrePoints >= 2) {
      this.nombreLignesDePlusieursPoints++
      if (!auMoinsUneLigne) this.indicePremiereLigne = j
      auMoinsUneLigne = true
    }
  }
  if (!auMoinsUneLigne) {
    this.existe = false
    return
  }
  this.existe = true
}

CLieuDePoints.prototype.estDefiniParObjDs = function (listeOb) {
  return CLieuDeBase.prototype.estDefiniParObjDs.call(this, listeOb) &&
  this.pointLieGenerateur.estDefPar(listeOb)
}
