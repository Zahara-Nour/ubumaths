/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CCalculAncetre from './CCalculAncetre'
import CValeur from './CValeur'
export default CTestEquivalence

/**
 * Calcul testant si deux formules de calcul ou de fonctions sont équivalentes
 * au sens en tenant compte de commutativité de la multiplication et de l'addition.
 * Deux calculs comme a/b ou 1/b*a sont aussi considérés comme équivalents.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom du calcul.
 * @param {CCalcul} calcul1  Le premier calcul (ou fonction) testé.
 * @param {CCalcul} calcul2  Le deuxième calcul (ou fonction) testé.
 * @param {boolean} remplacementValeurs1  Si true, les résultats de valeurs utilisés dans le
 * calcul calcul1 sont remplacés avant de tester l'équivalence des formules.
 * @param {boolean} remplacementValeurs2  Si true, les résultats de valeurs utilisés dans le
 * calcul calcul2 sont remplacés avant de tester l'équivalence des formules.
 * @param {CValeur} test  Si différent de 1, le calcul est
 * @param {boolean} equivalenceDecimalFracIrr  true si on accepte aussi bien les nombres décimaux
 * que leur fraction irréductible équivalente (au plus 9 décimales)
 * considéré comme non existant. Permet d'éviter la comparaison quand une condition n'est pas vérifiée.
 * @param {boolean} eliminMultUn1 Si remplacementValeurs1 est true et si eliminMultUn1 est false, les
 * multiplications par 1 ne sont pas éliminées après remplacement des valeurs dans calcul1
 * @param {boolean} eliminMultUn2 Si remplacementValeurs2 est true et si eliminMultUn2 est false, les
 * multiplications par 1 ne sont pas éliminées après remplacement des valeurs dans calcul2
 * @returns {CTestEquivalence}
 */
function CTestEquivalence (listeProprietaire, impProto, estElementFinal, nomCalcul,
  calcul1, calcul2, remplacementValeurs1, remplacementValeurs2, test,
  equivalenceDecimalFracIrr, eliminMultUn1, eliminMultUn2) {
  if (arguments.length === 0) return // Ajout version WebPack
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    if (arguments.length === 3) CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal)
    else {
      CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
      this.calcul1 = calcul1
      this.calcul2 = calcul2
      this.remplacementValeurs1 = remplacementValeurs1
      this.remplacementValeurs2 = remplacementValeurs2
      this.test = test
      this.equivalenceDecimalFracIrr = equivalenceDecimalFracIrr
      this.eliminMultUn1 = eliminMultUn1
      this.eliminMultUn2 = eliminMultUn2
    }
  }
  this.existe = true
  this.dejaPositionne = false
}
CTestEquivalence.prototype = new CCalculAncetre()
CTestEquivalence.prototype.constructor = CTestEquivalence
CTestEquivalence.prototype.superClass = 'CCalculAncetre'
CTestEquivalence.prototype.className = 'CTestEquivalence'

// Version : 7.7.0 on passe le numéro de version à 4 car on rajoute deux paramètres eliminMultUn1 et eliminMultUn1
CTestEquivalence.prototype.numeroVersion = function () {
  return 4
}

CTestEquivalence.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const ind2 = listeSource.indexOf(this.calcul1)
  const ind3 = listeSource.indexOf(this.calcul2)
  const testClone = this.test.getClone(listeSource, listeCible)
  return new CTestEquivalence(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind2, 'CCalcul'),
    listeCible.get(ind3, 'CCalcul'), this.remplacementValeurs1, this.remplacementValeurs2, testClone,
    this.equivalenceDecimalFracIrr, this.eliminMultUn1, this.eliminMultUn2)
}
CTestEquivalence.prototype.getNatureCalcul = function () {
  return NatCal.NTestEquivalence
}
CTestEquivalence.prototype.rendValeur = function () {
  return this.resultat
}
CTestEquivalence.prototype.positionne = function (infoRandom, dimfen) {
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
    // Version 7.9.3 : Avant la comparaison on élimine d'abord les éventuels enchainements de Left et Right
    const calcul1 = this.calcul1.calcul
    const calcul2 = this.calcul2.calcul
    if (this.remplacementValeurs1) {
      this.calculeq1 =
      calcul1.calculAvecValeursRemplacees(false).calculNormalise(true, true, this.equivalenceDecimalFracIrr, this.eliminMultUn1)
    } else this.calculeq1 = calcul1.calculNormalise(this.remplacementValeurs1, true, this.equivalenceDecimalFracIrr, this.eliminMultUn1)
    if (this.remplacementValeurs2) {
      this.calculeq2 =
      calcul2.calculAvecValeursRemplacees(false).calculNormalise(true, true, this.equivalenceDecimalFracIrr, this.eliminMultUn2)
    } else this.calculeq2 = calcul2.calculNormalise(this.remplacementValeurs2, true, this.equivalenceDecimalFracIrr, this.eliminMultUn2)
    this.dejaPositionne = true // Ajout version 4.7.2
  }
  if (!this.calcul1.existe || !this.calcul2.existe) {
    this.resultat = 0
    return
  }
  if (this.calculeq1.estEquivalentA(this.calculeq2)) this.resultat = 1; else this.resultat = 0
}
CTestEquivalence.prototype.positionneFull = function (infoRandom, dimfen) {
  this.test.positionne(infoRandom, dimfen)
  if (!this.test.existe) {
    this.resultat = 0
    return
  }
  if (this.test.rendValeur() !== 1) {
    this.resultat = 0
    return
  }
  const calcul1 = this.calcul1.calcul
  const calcul2 = this.calcul2.calcul
  if (this.remplacementValeurs1) {
    this.calculeq1 =
    calcul1.calculAvecValeursRemplacees(false).calculNormalise(true, true, this.equivalenceDecimalFracIrr, this.eliminMultUn1)
  } else this.calculeq1 = calcul1.calculNormalise(this.remplacementValeurs1, true, this.equivalenceDecimalFracIrr, this.eliminMultUn1)
  if (this.remplacementValeurs2) {
    this.calculeq2 =
    calcul2.calculAvecValeursRemplacees(false).calculNormalise(true, true, this.equivalenceDecimalFracIrr, this.eliminMultUn2)
  } else this.calculeq2 = calcul2.calculNormalise(this.remplacementValeurs2, true, this.equivalenceDecimalFracIrr, this.eliminMultUn2)
  this.dejaPositionne = true
  if (!this.calcul1.existe || !this.calcul2.existe) {
    this.resultat = 0
    return
  }
  if (this.calculeq1.estEquivalentA(this.calculeq2)) this.resultat = 1; else this.resultat = 0
}
CTestEquivalence.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) ||
    this.calcul1.depDe(p) || this.calcul2.depDe(p) || this.test.depDe(p))
}
CTestEquivalence.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.calcul1.dependDePourBoucle(p) || this.calcul2.dependDePourBoucle(p) ||
  this.test.dependDePourBoucle(p)
}
CTestEquivalence.prototype.metAJour = function () {
  this.dejaPositionne = false
}
CTestEquivalence.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.calcul1 = list.get(ind1, 'CCalcul')
  const ind2 = inps.readInt()
  this.calcul2 = list.get(ind2, 'CCalcul')
  this.remplacementValeurs1 = inps.readBoolean()
  this.remplacementValeurs2 = inps.readBoolean()
  this.test = new CValeur(this.listeProprietaire)
  if (this.nVersion < 2) this.test.donneValeur(1)
  else this.test.read(inps, list)
  if (this.nVersion < 3) this.equivalenceDecimalFracIrr = false
  else this.equivalenceDecimalFracIrr = inps.readBoolean()
  if (this.nVersion < 4) {
    this.eliminMultUn1 = true
    this.eliminMultUn2 = true
  } else {
    this.eliminMultUn1 = inps.readBoolean()
    this.eliminMultUn2 = inps.readBoolean()
  }
}
CTestEquivalence.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.calcul1)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.calcul2)
  oups.writeInt(ind2)
  oups.writeBoolean(this.remplacementValeurs1)
  oups.writeBoolean(this.remplacementValeurs2)
  this.test.write(oups, list)
  oups.writeBoolean(this.equivalenceDecimalFracIrr)
  oups.writeBoolean(this.eliminMultUn1)
  oups.writeBoolean(this.eliminMultUn2)
}
