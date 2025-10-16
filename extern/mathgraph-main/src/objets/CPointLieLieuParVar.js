/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { distancePointPoint, MAX_VALUE } from '../kernel/kernel'
import CPointLieLieuAncetre from './CPointLieLieuAncetre'
export default CPointLieLieuParVar

/**
 * Point lié à un lieu de points généré par une variable
 * @constructor
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
function CPointLieLieuParVar (listeProprietaire, impProto, estElementFinal,
  couleur, nomMasque, decX, decY, masque, nom, tailleNom,
  motif, marquePourTrace, fixed, abscisse, lieuAssocie) {
  if (arguments.length === 1) CPointLieLieuAncetre.call(this, listeProprietaire)
  else {
    CPointLieLieuAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace, fixed, abscisse, lieuAssocie)
  }
}
CPointLieLieuParVar.prototype = new CPointLieLieuAncetre()
CPointLieLieuParVar.prototype.constructor = CPointLieLieuParVar
CPointLieLieuParVar.prototype.superClass = 'CPointLieLieuAncetre'
CPointLieLieuParVar.prototype.className = 'CPointLieLieuParVar'

CPointLieLieuParVar.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.lieuAssocie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CPointLieLieuParVar(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, this.fixed, this.abscisse,
    listeCible.get(ind1, 'CLieuParVariable'))
}

CPointLieLieuParVar.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.lieuAssocie.existe
  if (!this.existe) return
  const vari = this.lieuAssocie.variableGeneratrice
  const ptGenerateurTrace = this.lieuAssocie.pointATracer
  // On mémorise la valeur actuelle de la variable qui génère le lieu auquel le point est lié
  const ancienneAbscisse = vari.valeurActuelle
  vari.donneValeur(this.abscisse)
  this.lieuAssocie.listeElementsAncetres.positionne(infoRandom, dimfen)
  this.existe = ptGenerateurTrace.existe
  if (!this.existe) return
  CPointLieLieuAncetre.prototype.placeEn.call(this, ptGenerateurTrace.x, ptGenerateurTrace.y)
  vari.donneValeur(ancienneAbscisse)
  this.lieuAssocie.listeElementsAncetres.positionne(infoRandom, dimfen)
  CPointLieLieuAncetre.prototype.positionne.call(this, infoRandom, dimfen) // Ajout version 4.6.4
}

CPointLieLieuParVar.prototype.abscisseMaximale = function () {
  return this.lieuAssocie.variableGeneratrice.valeurMini
}

CPointLieLieuParVar.prototype.abscisseMinimale = function () {
  return this.lieuAssocie.variableGeneratrice.valeurMaxi
}

CPointLieLieuParVar.prototype.testDeplacement = function (dimfen, xtest, ytest, pointr, abscr) {
  let abscisseMini, abscisseMaxi, w, dis, indDistMini, i, d
  const vari = this.lieuAssocie.variableGeneratrice
  const info = this.lieuAssocie.infoLieu
  abscisseMini = vari.valeurMini
  abscisseMaxi = vari.valeurMaxi
  // On ordonne l'abscisse minimale et maximale
  if (abscisseMini > abscisseMaxi) {
    w = abscisseMini
    abscisseMini = abscisseMaxi
    abscisseMaxi = w
  }
  // Modification pour la version 1.9.5
  const pas = (abscisseMaxi - abscisseMini) / (info.nombreDePoints - 1)
  dis = MAX_VALUE
  indDistMini = 0
  for (i = 0; i < info.nombreDePoints; i++) {
    d = distancePointPoint(xtest, ytest, this.lieuAssocie.absPoints[i],
      this.lieuAssocie.ordPoints[i])
    if (d < dis) {
      dis = d
      indDistMini = i
    }
  }
  abscr.setValue(abscisseMini + indDistMini * pas)
  // Il est inutile ici de donner des valeurs à pointr qui n'est pas utilisé par l'outil correspondant
  return true
}
