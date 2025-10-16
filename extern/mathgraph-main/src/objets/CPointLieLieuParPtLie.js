/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { distancePointPoint, MAX_VALUE } from '../kernel/kernel'
import CPointLieLieuAncetre from './CPointLieLieuAncetre'
export default CPointLieLieuParPtLie

/**
 * Point lié à une lieu de points généré par un point lié.
 * @constructor
 * @extends CPointLieLieuAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet
 * @param {boolean} nomMasque  true si le nom de l'objet est masqué
 * @param {number} decX  Decalage horizontal du nom
 * @param {number} decY  Decalage vertical du nom
 * @param {boolean} masque  true si l'objet est masque
 * @param {string} nom  Le nom eventuel de l'objet
 * @param {number} tailleNom  Indice de la taille du nom (voir Fonte)
 * @param {MotifPoint} motif  Le motif du point
 * @param {boolean} marquePourTrace  true si le point est marqué pour la trace
 * @param {boolean} fixed  true si punaisé
 * @param {number} abscisse  L'abscisse du point sur le lieu
 * @param {CLieuDeBase} lieuAssocie  Le lieu auquel le point est lié
 * @returns {void}
 */
function CPointLieLieuParPtLie (listeProprietaire, impProto, estElementFinal,
  couleur, nomMasque, decX, decY, masque, nom, tailleNom,
  motif, marquePourTrace, fixed, abscisse, lieuAssocie) {
  if (arguments.length === 1) CPointLieLieuAncetre.call(this, listeProprietaire)
  else {
    CPointLieLieuAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace, fixed, abscisse, lieuAssocie)
  }
}
CPointLieLieuParPtLie.prototype = new CPointLieLieuAncetre()
CPointLieLieuParPtLie.prototype.constructor = CPointLieLieuParPtLie
CPointLieLieuParPtLie.prototype.superClass = 'CPointLieLieuAncetre'
CPointLieLieuParPtLie.prototype.className = 'CPointLieLieuParPtLie'

CPointLieLieuParPtLie.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.lieuAssocie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CPointLieLieuParPtLie(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, this.fixed, this.abscisse,
    listeCible.get(ind1, 'CLieuDePoints'))
}

CPointLieLieuParPtLie.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.lieuAssocie?.existe
  if (!this.existe) return
  const ptLie = this.lieuAssocie.pointLieGenerateur
  const ptGenerateurTrace = this.lieuAssocie.pointATracer
  // On mémorise l'abscisse actuelle du point lié qui génère le lieu auquel le point est lié
  const ancienneAbscisse = ptLie.abscisse
  ptLie.donneAbscisse(this.abscisse)
  this.lieuAssocie.listeElementsAncetres.positionne(infoRandom, dimfen)
  this.existe = ptGenerateurTrace.existe
  if (!this.existe) return
  CPointLieLieuAncetre.prototype.placeEn.call(this, ptGenerateurTrace.x, ptGenerateurTrace.y)
  ptLie.donneAbscisse(ancienneAbscisse)
  this.lieuAssocie.listeElementsAncetres.positionne(infoRandom, dimfen)
  CPointLieLieuAncetre.prototype.positionne.call(this, infoRandom, dimfen) // Ajout version 4.6.4
}

CPointLieLieuParPtLie.prototype.abscisseMaximale = function () {
  return this.lieuAssocie.pointLieGenerateur.abscisseMaximale()
}

CPointLieLieuParPtLie.prototype.abscisseMinimale = function () {
  return this.lieuAssocie.pointLieGenerateur.abscisseMinimale()
}

CPointLieLieuParPtLie.prototype.testDeplacement = function (dimfen, xtest, ytest, pointr, abscr) {
  let nbValeurs, dis, indDistMini, j, k, k1, d, nombrePoints, indPremPoint, x, y
  const info = this.lieuAssocie.infoLieu
  const pointLie = this.lieuAssocie.pointLieGenerateur
  let abscisseMini = pointLie.abscisseMinimale()
  let abscisseMaxi = pointLie.abscisseMaximale()
  // On ordonne l'abscisse minimale et maximale
  if (abscisseMini > abscisseMaxi) {
    const w = abscisseMini
    abscisseMini = abscisseMaxi
    abscisseMaxi = w
  }
  // Modification pour la version 1.9.5
  if (this.lieuAssocie.pointLieGenerateur.lieALigneFermee()) nbValeurs = info.nombreDePoints
  else nbValeurs = info.nombreDePoints - 1
  const pas = (abscisseMaxi - abscisseMini) / nbValeurs
  dis = MAX_VALUE
  indDistMini = 0
  for (j = 0; j < this.lieuAssocie.nombreLignes; j++) {
    nombrePoints = this.lieuAssocie.infoLignes[j].nombrePoints
    // Optimisé version 3.9 On trace maintenant les points isolés du lieu
    indPremPoint = this.lieuAssocie.infoLignes[j].indicePremierPoint
    for (k = 0; k < nombrePoints; k++) {
      k1 = indPremPoint + k
      x = this.lieuAssocie.absPoints[k1]
      y = this.lieuAssocie.ordPoints[k1]
      if (dimfen.dansFenetre(x, y)) {
        d = distancePointPoint(xtest, ytest, this.lieuAssocie.absPoints[k1],
          this.lieuAssocie.ordPoints[k1])
        if (d < dis) {
          dis = d
          indDistMini = k1
        }
      }
    }
  }
  abscr.setValue(abscisseMini + indDistMini * pas)
  // Il est inutile ici de donner des valeurs à pointr qui n'est pas utilisé par l'outil correspondant
  return true
}
