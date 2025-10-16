/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CCalculAncetre from './CCalculAncetre'
import CTestEquivalence from './CTestEquivalence'
export default CTestFact

/**
 * Objet de type aalcul destiné à savoir si un calcul est factorisé par un autre calcul.
 * Renvoie 1 si la réponse est oui et 0 sinon
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom du calcul.
 * @param {CCalcul} calcul1  Calcul ou fonction dont on teste s'il est factorisé par calcul2.
 * @param {CCalcul} calcul2  Calcul ou fonction ontenant le facteur recherché.
 * @param {boolean} remplacementValeurs1  true si on veut que les résultats de calculs ou valeurs
 * de calcul1 soient remplacés dans calcul1 avant de tester la factorisation.
 * @param {boolean} remplacementValeurs2  true si on veut que les résultats de calculs ou valeurs
 * de calcul2 soient remplacés dans calcul1 avant de tester la factorisation.
 * @param {CValeur} test  Si différent de 1, le calcul est considéré comme non existant. Permet d'éviter la comparaison quand une condition n'est pas vérifiée.
 * @param {boolean} equivalenceDecimalFracIrr  true si on accepte aussi bien les nombres décimaux
 * que leur fraction irréductible équivalente (au plus 9 décimales)
 * @param {boolean} eliminMultUn1 Si remplacementValeurs1 est true et si eliminMultUn1 est false, les
 * multiplications par 1 ne sont pas éliminées après remplacement des valeurs dans calcul1
 * @param {boolean} eliminMultUn2 Si remplacementValeurs2 est true et si eliminMultUn2 est false, les
 * multiplications par 1 ne sont pas éliminées après remplacement des valeurs dans calcul2
 * @returns {CTestFact}
 */
function CTestFact (listeProprietaire, impProto, estElementFinal, nomCalcul,
  calcul1, calcul2, remplacementValeurs1, remplacementValeurs2, test,
  equivalenceDecimalFracIrr, eliminMultUn1, eliminMultUn2) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    if (arguments.length === 3) CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal)
    else {
      CTestEquivalence.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul,
        calcul1, calcul2, remplacementValeurs1, remplacementValeurs2, test, equivalenceDecimalFracIrr,
        eliminMultUn1, eliminMultUn2)
    }
  }
  this.existe = true
  this.dejaPositionne = false
}
CTestFact.prototype = new CTestEquivalence()
CTestFact.prototype.constructor = CTestFact
CTestFact.prototype.superClass = 'CTestEquivalence'
CTestFact.prototype.className = 'CTestFact'

CTestFact.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const ind2 = listeSource.indexOf(this.calcul1)
  const ind3 = listeSource.indexOf(this.calcul2)
  const testClone = this.test.getClone(listeSource, listeCible)
  return new CTestFact(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind2, 'CCalcul'),
    listeCible.get(ind3, 'CCalcul'), this.remplacementValeurs1, this.remplacementValeurs2, testClone,
    this.equivalenceDecimalFracIrr, this.eliminMultUn1, this.eliminMultUn2)
}
CTestFact.prototype.getNatureCalcul = function () {
  return NatCal.NTestFact
}
CTestFact.prototype.positionne = function (infoRandom, dimfen) {
  // Existe toujours égal à true pour cet objet
  this.test.positionne(infoRandom, dimfen)
  if (!this.test.existe) {
    this.resultat = 0
    return
  }
  if (this.test.rendValeur() !== 1) {
    this.resultat = 0
    return
  }
  if (!this.dejaPositionne) {
    if (this.remplacementValeurs1) {
      this.calculeq1 =
      this.calcul1.calcul.calculAvecValeursRemplacees(false).calculNormalise(true, true, this.equivalenceDecimalFracIrr, this.eliminMultUn1)
    } else this.calculeq1 = this.calcul1.calcul.calculNormalise(this.remplacementValeurs1, true, this.equivalenceDecimalFracIrr, this.eliminMultUn1)
    if (this.remplacementValeurs2) {
      this.calculeq2 =
      this.calcul2.calcul.calculAvecValeursRemplacees(false).calculNormalise(true, true, this.equivalenceDecimalFracIrr, this.eliminMultUn2)
    } else this.calculeq2 = this.calcul2.calcul.calculNormalise(this.remplacementValeurs2, true, this.equivalenceDecimalFracIrr, this.eliminMultUn2)
    this.dejaPositionne = true // Ajout version 4.7.2
  }
  if (!this.calcul1.existe || !this.calcul2.existe) {
    this.resultat = 0
    return
  }
  if (this.calculeq1.estFactorisePar(this.calculeq2)) this.resultat = 1; else this.resultat = 0
}
CTestFact.prototype.positionneFull = function (infoRandom, dimfen) {
  this.test.positionne(infoRandom, dimfen)
  if (!this.test.existe) {
    this.resultat = 0
    return
  }
  if (this.test.rendValeur() !== 1) {
    this.resultat = 0
    return
  }
  if (this.remplacementValeurs1) {
    this.calculeq1 =
    this.calcul1.calcul.calculAvecValeursRemplacees(false).calculNormalise(true, true, this.equivalenceDecimalFracIrr, this.eliminMultUn1)
  } else this.calculeq1 = this.calcul1.calcul.calculNormalise(this.remplacementValeurs1, true, this.equivalenceDecimalFracIrr, this.eliminMultUn1)
  if (this.remplacementValeurs2) {
    this.calculeq2 =
    this.calcul2.calcul.calculAvecValeursRemplacees(false).calculNormalise(true, true, this.equivalenceDecimalFracIrr, this.eliminMultUn2)
  } else this.calculeq2 = this.calcul2.calcul.calculNormalise(this.remplacementValeurs2, true, this.equivalenceDecimalFracIrr, this.eliminMultUn2)
  this.dejaPositionne = true
  if (!this.calcul1.existe || !this.calcul2.existe) {
    this.resultat = 0
    return
  }
  if (this.calculeq1.estFactorisePar(this.calculeq2)) this.resultat = 1; else this.resultat = 0
}
